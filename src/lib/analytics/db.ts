import Database from 'better-sqlite3'
import { isAdminIp } from '@/lib/admin'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.ANALYTICS_DB_PATH || path.join(process.cwd(), 'data', 'analytics.db')

// Durée de conservation des visites : 13 mois (recommandation CNIL pour la mesure d'audience).
export const RETENTION_MS = 395 * 24 * 3600 * 1000

const MIGRATIONS: string[] = [
  `
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE TABLE pageviews (
    id              INTEGER PRIMARY KEY,
    token           TEXT NOT NULL UNIQUE,
    ts              INTEGER NOT NULL,
    session_id      TEXT NOT NULL,
    visitor_id      TEXT NOT NULL,
    is_admin        INTEGER NOT NULL DEFAULT 0,
    is_bot          INTEGER NOT NULL DEFAULT 0,
    ip              TEXT,
    country_code    TEXT,
    continent       TEXT,
    region          TEXT,
    city            TEXT,
    postal_code     TEXT,
    lat             REAL,
    lon             REAL,
    geo_timezone    TEXT,
    path            TEXT NOT NULL,
    query           TEXT,
    referrer        TEXT,
    referrer_host   TEXT,
    utm_source      TEXT,
    utm_medium      TEXT,
    utm_campaign    TEXT,
    user_agent      TEXT,
    browser         TEXT,
    browser_version TEXT,
    engine          TEXT,
    os              TEXT,
    os_version      TEXT,
    device_type     TEXT,
    device_vendor   TEXT,
    device_model    TEXT,
    cpu_arch        TEXT,
    language        TEXT,
    languages       TEXT,
    accept_language TEXT,
    timezone        TEXT,
    screen_w        INTEGER,
    screen_h        INTEGER,
    viewport_w      INTEGER,
    viewport_h      INTEGER,
    dpr             REAL,
    color_scheme    TEXT,
    touch           INTEGER,
    connection      TEXT,
    duration_ms     INTEGER,
    scroll_pct      INTEGER
  );
  CREATE INDEX pv_ts         ON pageviews(ts);
  CREATE INDEX pv_session    ON pageviews(session_id, ts);
  CREATE INDEX pv_visitor_ts ON pageviews(visitor_id, ts);
  CREATE INDEX pv_ip         ON pageviews(ip);

  CREATE TABLE events (
    id          INTEGER PRIMARY KEY,
    ts          INTEGER NOT NULL,
    pageview_id INTEGER REFERENCES pageviews(id) ON DELETE CASCADE,
    session_id  TEXT NOT NULL,
    is_admin    INTEGER NOT NULL DEFAULT 0,
    kind        TEXT NOT NULL,
    target      TEXT NOT NULL,
    label       TEXT
  );
  CREATE INDEX ev_ts ON events(ts);
  `,
  `
  ALTER TABLE pageviews ADD COLUMN campaign   TEXT;
  ALTER TABLE pageviews ADD COLUMN asn        INTEGER;
  ALTER TABLE pageviews ADD COLUMN as_org     TEXT;
  ALTER TABLE pageviews ADD COLUMN geo_source TEXT;
  CREATE INDEX pv_campaign ON pageviews(campaign);

  -- Liens de campagne générés depuis /admin (paramètre ?c=<slug>).
  CREATE TABLE campaigns (
    slug        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    target_path TEXT NOT NULL DEFAULT '/',
    created_at  INTEGER NOT NULL
  );

  -- Chaque ouverture d'un PDF, journalisée côté serveur (même hors JavaScript, même par lien direct).
  CREATE TABLE downloads (
    id              INTEGER PRIMARY KEY,
    ts              INTEGER NOT NULL,
    file            TEXT NOT NULL,
    ip              TEXT,
    visitor_id      TEXT NOT NULL,
    session_id      TEXT,
    is_admin        INTEGER NOT NULL DEFAULT 0,
    is_bot          INTEGER NOT NULL DEFAULT 0,
    country_code    TEXT,
    region          TEXT,
    city            TEXT,
    postal_code     TEXT,
    lat             REAL,
    lon             REAL,
    geo_source      TEXT,
    asn             INTEGER,
    as_org          TEXT,
    user_agent      TEXT,
    browser         TEXT,
    browser_version TEXT,
    os              TEXT,
    os_version      TEXT,
    device_type     TEXT,
    device_vendor   TEXT,
    device_model    TEXT,
    referrer        TEXT,
    accept_language TEXT
  );
  CREATE INDEX dl_ts      ON downloads(ts);
  CREATE INDEX dl_ip      ON downloads(ip);
  CREATE INDEX dl_visitor ON downloads(visitor_id, ts);

  -- Appareils personnels de l'administrateur : jamais comptés, où qu'ils se connectent.
  CREATE TABLE owner_devices (
    token_hash TEXT PRIMARY KEY,
    label      TEXT NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL,
    last_seen  INTEGER
  );

  -- Visiteurs ayant refusé : mémorisé côté serveur pour ne pas journaliser leurs téléchargements.
  CREATE TABLE optouts (
    visitor_id TEXT PRIMARY KEY,
    ts         INTEGER NOT NULL
  );
  `,
  `
  -- Campagne « supprimée » = archivée (résultats conservés) ; la suppression définitive se fait depuis les archives.
  ALTER TABLE campaigns ADD COLUMN archived_at INTEGER;
  `,
]

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const conn = new Database(DB_PATH)
  conn.pragma('journal_mode = WAL')
  conn.pragma('busy_timeout = 5000')
  conn.pragma('foreign_keys = ON')

  const version = conn.pragma('user_version', { simple: true }) as number
  for (let v = version; v < MIGRATIONS.length; v++) {
    conn.transaction(() => {
      conn.exec(MIGRATIONS[v])
      conn.pragma(`user_version = ${v + 1}`)
    })()
  }

  syncAdminFlag(conn)
  db = conn
  return conn
}

/** Complète ville, position et opérateur des visites enregistrées avant la base locale (une fois par démarrage). */
let backfilled = false
export function backfillGeo(lookup: (ip: string) => {
  country_code: string | null; region: string | null; city: string | null; postal_code: string | null
  lat: number | null; lon: number | null; asn: number | null; as_org: string | null
} | null) {
  if (backfilled) return
  backfilled = true
  const conn = getDb()
  const ips = conn
    .prepare("SELECT DISTINCT ip FROM pageviews WHERE ip IS NOT NULL AND (asn IS NULL OR (city IS NULL AND COALESCE(geo_source, '') <> 'cloudflare'))")
    .pluck()
    .all() as string[]
  const update = conn.prepare(
    `UPDATE pageviews SET
       asn = COALESCE(asn, @asn), as_org = COALESCE(as_org, @as_org),
       country_code = COALESCE(country_code, @country_code),
       region      = CASE WHEN city IS NULL AND @city IS NOT NULL THEN @region ELSE region END,
       postal_code = CASE WHEN city IS NULL AND @city IS NOT NULL THEN @postal_code ELSE postal_code END,
       lat         = CASE WHEN lat IS NULL THEN @lat ELSE lat END,
       lon         = CASE WHEN lon IS NULL THEN @lon ELSE lon END,
       geo_source  = CASE WHEN city IS NULL AND @city IS NOT NULL THEN 'dbip'
                          WHEN geo_source IS NULL AND COALESCE(country_code, @country_code) IS NOT NULL THEN 'country'
                          ELSE geo_source END,
       city        = COALESCE(city, @city)
     WHERE ip = @ip`
  )
  conn.transaction(() => {
    for (const ip of ips) {
      const g = lookup(ip)
      if (g) update.run({ ip, ...g, as_org: g.as_org?.slice(0, 120) ?? null })
    }
  })()
}

/** Recalcule is_admin d'après ADMIN_IPS, pour que toute modification de la liste s'applique aussi à l'historique. */
function syncAdminFlag(conn: Database.Database) {
  const ips = conn.prepare('SELECT DISTINCT ip FROM pageviews WHERE ip IS NOT NULL').pluck().all() as string[]
  const setPv = conn.prepare('UPDATE pageviews SET is_admin = ? WHERE ip = ? AND is_admin <> ?')
  const setEv = conn.prepare(
    'UPDATE events SET is_admin = ? WHERE is_admin <> ? AND session_id IN (SELECT session_id FROM pageviews WHERE ip = ?)'
  )
  const dlIps = conn.prepare('SELECT DISTINCT ip FROM downloads WHERE ip IS NOT NULL').pluck().all() as string[]
  const setDl = conn.prepare('UPDATE downloads SET is_admin = ? WHERE ip = ? AND is_admin <> ?')
  conn.transaction(() => {
    for (const ip of ips) {
      const flag = isAdminIp(ip) ? 1 : 0
      setPv.run(flag, ip, flag)
      setEv.run(flag, flag, ip)
    }
    for (const ip of dlIps) {
      const flag = isAdminIp(ip) ? 1 : 0
      setDl.run(flag, ip, flag)
    }
  })()
}

function getMeta(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value
}

function setMeta(key: string, value: string) {
  getDb()
    .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

/** Sel propre à cette instance, utilisé pour pseudonymiser l'identifiant visiteur. */
export function getSalt(): string {
  let salt = getMeta('salt')
  if (!salt) {
    salt = randomBytes(32).toString('hex')
    setMeta('salt', salt)
  }
  return salt
}

/** Supprime les données plus anciennes que la durée de conservation (au plus une fois par jour). */
export function purgeExpired() {
  const now = Date.now()
  const last = Number(getMeta('last_purge') ?? 0)
  if (now - last < 24 * 3600 * 1000) return
  const cutoff = now - RETENTION_MS
  const conn = getDb()
  conn.transaction(() => {
    conn.prepare('DELETE FROM events WHERE ts < ?').run(cutoff)
    conn.prepare('DELETE FROM pageviews WHERE ts < ?').run(cutoff)
    conn.prepare('DELETE FROM downloads WHERE ts < ?').run(cutoff)
    conn.prepare('DELETE FROM optouts WHERE ts < ?').run(cutoff)
  })()
  setMeta('last_purge', String(now))
}
