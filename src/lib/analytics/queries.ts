import { COUNTRY_CENTROIDS } from './country-centroids'
import { getDb } from './db'

export const PERIODS = [
  { key: '24h', label: '24 h', ms: 24 * 3600 * 1000 },
  { key: '7d', label: '7 jours', ms: 7 * 24 * 3600 * 1000 },
  { key: '30d', label: '30 jours', ms: 30 * 24 * 3600 * 1000 },
  { key: '90d', label: '90 jours', ms: 90 * 24 * 3600 * 1000 },
  { key: '365d', label: '12 mois', ms: 365 * 24 * 3600 * 1000 },
  { key: 'all', label: 'Tout', ms: null },
] as const

export type PeriodKey = (typeof PERIODS)[number]['key']

export interface Filters {
  from: number
  to: number
  includeAdmin: boolean
  includeBots: boolean
  ip: string | null
}

export const TZ = 'Europe/Paris'

// Toutes les clauses sont des fragments fixes : aucune donnée utilisateur n'est concaténée au SQL.
function where(f: Filters, a = ''): string {
  let w = `${a}ts >= @from AND ${a}ts < @to`
  if (!f.includeAdmin) w += ` AND ${a}is_admin = 0`
  if (!f.includeBots) w += ` AND ${a}is_bot = 0`
  if (f.ip) w += ` AND ${a}ip = @ip`
  return w
}

function params(f: Filters, extra: Record<string, unknown> = {}) {
  return f.ip ? { from: f.from, to: f.to, ip: f.ip, ...extra } : { from: f.from, to: f.to, ...extra }
}

const cte = (f: Filters) => `WITH f AS (SELECT * FROM pageviews WHERE ${where(f)})`

export function firstTimestamp(): number | null {
  const row = getDb().prepare('SELECT MIN(ts) AS t FROM pageviews').get() as { t: number | null }
  return row.t
}

export interface Summary {
  pageviews: number
  sessions: number
  visitors: number
  ips: number
  returningVisitors: number
  avgDuration: number | null
  bounceRate: number | null
  avgScroll: number | null
}

export function getSummary(f: Filters): Summary {
  const r = getDb()
    .prepare(
      `${cte(f)},
       s AS (SELECT session_id, COUNT(*) AS n, MAX(ts + COALESCE(duration_ms, 0)) - MIN(ts) AS dur
             FROM f GROUP BY session_id)
       SELECT
         (SELECT COUNT(*) FROM f)                   AS pageviews,
         (SELECT COUNT(*) FROM s)                   AS sessions,
         (SELECT COUNT(DISTINCT visitor_id) FROM f) AS visitors,
         (SELECT COUNT(DISTINCT ip) FROM f)         AS ips,
         (SELECT COUNT(*) FROM (
            SELECT visitor_id FROM f GROUP BY visitor_id
            HAVING (SELECT MIN(p.ts) FROM pageviews p WHERE p.visitor_id = f.visitor_id) < @from
         ))                                         AS returningVisitors,
         (SELECT AVG(dur) FROM s)                   AS avgDuration,
         (SELECT AVG(n = 1) FROM s)                 AS bounceRate,
         (SELECT AVG(scroll_pct) FROM f WHERE scroll_pct IS NOT NULL) AS avgScroll`
    )
    .get(params(f)) as Summary
  return r
}

export function getBotSessions(f: Filters): number {
  const bots = { ...f, includeBots: true }
  const row = getDb()
    .prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM pageviews WHERE ${where(bots)} AND is_bot = 1`)
    .get(params(bots)) as { n: number }
  return row.n
}

export function getLiveVisitors(includeAdmin: boolean): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS n FROM pageviews
       WHERE ts > ? AND is_bot = 0 ${includeAdmin ? '' : 'AND is_admin = 0'}`
    )
    .get(Date.now() - 5 * 60 * 1000) as { n: number }
  return row.n
}

// ---------------------------------------------------------------------------
// Séries temporelles et répartitions horaires (fuseau Europe/Paris)
// ---------------------------------------------------------------------------

export interface TimePoint {
  key: string
  label: string
  visitors: number
  sessions: number
  pageviews: number
}

const dayFmt = new Intl.DateTimeFormat('fr-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
// en-GB : l'heure seule se formate « 14 » (fr-FR donnerait « 14 h », non convertible en nombre).
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' })
const dayLabelFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short' })

const dayKey = (ts: number) => dayFmt.format(ts)
const hourOf = (ts: number) => Number(hourFmt.format(ts))
const hourKey = (ts: number) => `${dayKey(ts)} ${String(hourOf(ts)).padStart(2, '0')}`
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface TimeData {
  series: TimePoint[]
  byHour: number[] // visites par heure de début (0-23)
  byWeekday: number[] // visites par jour de la semaine (lundi = 0)
}

export function getTimeData(f: Filters, hourly: boolean): TimeData {
  const rows = getDb()
    .prepare(`SELECT ts, session_id, visitor_id FROM pageviews WHERE ${where(f)} ORDER BY ts`)
    .all(params(f)) as { ts: number; session_id: string; visitor_id: string }[]

  const keyOf = hourly ? hourKey : dayKey
  const buckets = new Map<string, { label: string; v: Set<string>; s: Set<string>; pv: number }>()
  const end = Math.min(f.to, Date.now())
  for (let t = f.from; t < end + 3600 * 1000; t += 3600 * 1000) {
    const ts = Math.min(t, end)
    const k = keyOf(ts)
    if (!buckets.has(k)) {
      buckets.set(k, {
        label: hourly ? `${String(hourOf(ts)).padStart(2, '0')} h` : dayLabelFmt.format(ts),
        v: new Set(),
        s: new Set(),
        pv: 0,
      })
    }
  }

  const byHour = Array<number>(24).fill(0)
  const byWeekday = Array<number>(7).fill(0)
  const seenSessions = new Set<string>()

  for (const r of rows) {
    const b = buckets.get(keyOf(r.ts))
    if (b) {
      b.v.add(r.visitor_id)
      b.s.add(r.session_id)
      b.pv++
    }
    if (!seenSessions.has(r.session_id)) {
      seenSessions.add(r.session_id)
      byHour[hourOf(r.ts)]++
      byWeekday[WEEKDAYS.indexOf(weekdayFmt.format(r.ts))]++
    }
  }

  return {
    series: [...buckets].map(([key, b]) => ({
      key,
      label: b.label,
      visitors: b.v.size,
      sessions: b.s.size,
      pageviews: b.pv,
    })),
    byHour,
    byWeekday,
  }
}

// ---------------------------------------------------------------------------
// Répartitions
// ---------------------------------------------------------------------------

export interface Row {
  label: string | null
  visitors: number
  sessions: number
  pageviews: number
}

/** `expr` est toujours une expression SQL fixe définie ci-dessous, jamais une entrée utilisateur. */
function breakdown(f: Filters, expr: string, limit = 12, firstOfSession = false): Row[] {
  const source = firstOfSession
    ? `(SELECT * FROM (SELECT f.*, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY ts) AS rn FROM f) WHERE rn = 1)`
    : 'f'
  return getDb()
    .prepare(
      `${cte(f)}
       SELECT ${expr} AS label,
              COUNT(DISTINCT visitor_id) AS visitors,
              COUNT(DISTINCT session_id) AS sessions,
              COUNT(*) AS pageviews
       FROM ${source}
       GROUP BY label
       ORDER BY visitors DESC, pageviews DESC
       LIMIT @limit`
    )
    .all(params(f, { limit })) as Row[]
}

const MAJOR = (col: string) => `substr(${col}, 1, instr(${col} || '.', '.') - 1)`

export function getBreakdowns(f: Filters) {
  return {
    entryPages: breakdown(f, 'path', 10, true),
    sources: breakdown(f, 'referrer_host', 12, true),
    referrers: breakdown(f, 'referrer', 12, true),
    campaigns: breakdown(
      f,
      `CASE WHEN utm_source IS NULL THEN NULL ELSE utm_source || COALESCE(' / ' || utm_medium, '') || COALESCE(' / ' || utm_campaign, '') END`,
      10,
      true
    ),
    countries: breakdown(f, 'country_code', 15),
    cities: breakdown(
      f,
      `CASE WHEN city IS NULL THEN NULL ELSE city || COALESCE(', ' || region, '') || COALESCE(' (' || country_code || ')', '') END`,
      15
    ),
    browsers: breakdown(f, 'browser'),
    browserVersions: breakdown(f, `browser || COALESCE(' ' || ${MAJOR('browser_version')}, '')`),
    os: breakdown(f, `os || COALESCE(' ' || os_version, '')`),
    organisations: breakdown(f, `CASE WHEN as_org IS NULL THEN NULL ELSE as_org || COALESCE(' (AS' || asn || ')', '') END`, 15),
    deviceTypes: breakdown(f, 'device_type'),
    deviceModels: breakdown(
      f,
      `NULLIF(TRIM(COALESCE(device_vendor, '') || ' ' || COALESCE(device_model, '')), '')`
    ),
    screens: breakdown(f, `CASE WHEN screen_w IS NULL THEN NULL ELSE screen_w || ' × ' || screen_h END`),
    languages: breakdown(f, 'language'),
    timezones: breakdown(f, 'timezone'),
    engines: breakdown(f, 'engine', 6),
    colorSchemes: breakdown(f, 'color_scheme', 3),
    connections: breakdown(f, 'connection', 6),
    touch: breakdown(f, `CASE touch WHEN 1 THEN 'Écran tactile' WHEN 0 THEN 'Souris / pavé' END`, 3),
  }
}

export interface PageRow {
  path: string
  visitors: number
  pageviews: number
  avgDuration: number | null
  avgScroll: number | null
}

export function getPages(f: Filters, limit = 15): PageRow[] {
  return getDb()
    .prepare(
      `${cte(f)}
       SELECT path, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS pageviews,
              AVG(duration_ms) AS avgDuration, AVG(scroll_pct) AS avgScroll
       FROM f GROUP BY path ORDER BY pageviews DESC LIMIT @limit`
    )
    .all(params(f, { limit })) as PageRow[]
}

export interface EventRow {
  kind: string
  target: string
  label: string | null
  clicks: number
  sessions: number
}

export function getEvents(f: Filters, limit = 25): EventRow[] {
  return getDb()
    .prepare(
      `SELECT e.kind, e.target, MAX(e.label) AS label, COUNT(*) AS clicks, COUNT(DISTINCT e.session_id) AS sessions
       FROM events e JOIN pageviews p ON p.id = e.pageview_id
       WHERE ${where(f, 'p.')}
       GROUP BY e.kind, e.target
       ORDER BY clicks DESC
       LIMIT @limit`
    )
    .all(params(f, { limit })) as EventRow[]
}

export interface MapPoint {
  lat: number
  lon: number
  city: string | null
  region: string | null
  country_code: string | null
  visitors: number
  pageviews: number
  /** « city » : position de la ville ; « country » : seul le pays est connu, point au centre du pays. */
  precision: 'city' | 'country'
}

export function getMapPoints(f: Filters): MapPoint[] {
  const db = getDb()
  const located = db
    .prepare(
      `${cte(f)}
       SELECT ROUND(lat, 2) AS lat, ROUND(lon, 2) AS lon, MAX(city) AS city, MAX(region) AS region,
              MAX(country_code) AS country_code,
              COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS pageviews
       FROM f WHERE lat IS NOT NULL AND lon IS NOT NULL
       GROUP BY ROUND(lat, 2), ROUND(lon, 2)
       ORDER BY visitors DESC
       LIMIT 500`
    )
    .all(params(f)) as Omit<MapPoint, 'precision'>[]
  const countryOnly = db
    .prepare(
      `${cte(f)}
       SELECT country_code, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS pageviews
       FROM f WHERE (lat IS NULL OR lon IS NULL) AND country_code IS NOT NULL
       GROUP BY country_code`
    )
    .all(params(f)) as { country_code: string; visitors: number; pageviews: number }[]

  const points: MapPoint[] = located.map((p) => ({ ...p, precision: 'city' }))
  for (const c of countryOnly) {
    const centroid = COUNTRY_CENTROIDS[c.country_code]
    if (!centroid) continue
    points.push({
      lat: centroid[0],
      lon: centroid[1],
      city: null,
      region: null,
      country_code: c.country_code,
      visitors: c.visitors,
      pageviews: c.pageviews,
      precision: 'country',
    })
  }
  return points
}

// ---------------------------------------------------------------------------
// Journal des visites
// ---------------------------------------------------------------------------

export interface SessionRow {
  session_id: string
  start: number
  end_ts: number
  pages: number
  route: string
  events: number
  first_seen: number
  ip: string | null
  is_admin: number
  is_bot: number
  country_code: string | null
  region: string | null
  city: string | null
  postal_code: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  device_type: string | null
  device_vendor: string | null
  device_model: string | null
  cpu_arch: string | null
  screen_w: number | null
  screen_h: number | null
  viewport_w: number | null
  viewport_h: number | null
  dpr: number | null
  language: string | null
  accept_language: string | null
  timezone: string | null
  connection: string | null
  referrer: string | null
  referrer_host: string | null
  utm_source: string | null
  user_agent: string | null
  asn: number | null
  as_org: string | null
  campaign: string | null
  geo_source: string | null
}

export function getSessions(f: Filters, limit: number, offset: number): SessionRow[] {
  return getDb()
    .prepare(
      `${cte(f)},
       agg AS (
         SELECT session_id, MIN(ts) AS start, MAX(ts + COALESCE(duration_ms, 0)) AS end_ts,
                COUNT(*) AS pages, group_concat(path, ' → ' ORDER BY ts) AS route
         FROM f GROUP BY session_id
         ORDER BY start DESC LIMIT @limit OFFSET @offset
       ),
       r AS (SELECT f.*, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY ts) AS rn
             FROM f WHERE session_id IN (SELECT session_id FROM agg))
       SELECT agg.*,
              (SELECT COUNT(*) FROM events e WHERE e.session_id = agg.session_id) AS events,
              (SELECT MIN(p.ts) FROM pageviews p WHERE p.visitor_id = r.visitor_id) AS first_seen,
              r.ip, r.is_admin, r.is_bot, r.country_code, r.region, r.city, r.postal_code,
              r.browser, r.browser_version, r.os, r.os_version, r.device_type, r.device_vendor,
              r.device_model, r.cpu_arch, r.screen_w, r.screen_h, r.viewport_w, r.viewport_h, r.dpr,
              r.language, r.accept_language, r.timezone, r.connection, r.referrer, r.referrer_host,
              r.utm_source, r.user_agent, r.asn, r.as_org, r.campaign, r.geo_source
       FROM agg JOIN r ON r.session_id = agg.session_id AND r.rn = 1
       ORDER BY agg.start DESC`
    )
    .all(params(f, { limit, offset })) as SessionRow[]
}

export interface IpProfile {
  first: number
  last: number
  pageviews: number
  sessions: number
  visitors: number
}

export function getIpProfile(ip: string): IpProfile | null {
  const r = getDb()
    .prepare(
      `SELECT MIN(ts) AS first, MAX(ts) AS last, COUNT(*) AS pageviews,
              COUNT(DISTINCT session_id) AS sessions, COUNT(DISTINCT visitor_id) AS visitors
       FROM pageviews WHERE ip = ?`
    )
    .get(ip) as IpProfile & { first: number | null }
  return r.first === null ? null : r
}

// ---------------------------------------------------------------------------
// Campagnes
// ---------------------------------------------------------------------------

export interface CampaignRow {
  slug: string
  name: string
  target_path: string
  created_at: number
  archived_at: number | null
  sessions: number
  visitors: number
  pageviews: number
  downloads: number
  total_sessions: number
  last_ts: number | null
}

/** Visites arrivées par chaque lien de campagne sur la période, plus le total depuis sa création. */
export function getCampaigns(f: Filters): { rows: CampaignRow[]; periodSessions: number } {
  const db = getDb()
  const rows = db
    .prepare(
      `${cte(f)},
       cs AS (SELECT DISTINCT campaign, session_id, visitor_id FROM f WHERE campaign IS NOT NULL)
       SELECT c.slug, c.name, c.target_path, c.created_at, c.archived_at,
              (SELECT COUNT(DISTINCT session_id) FROM cs WHERE cs.campaign = c.slug) AS sessions,
              (SELECT COUNT(DISTINCT visitor_id) FROM cs WHERE cs.campaign = c.slug) AS visitors,
              (SELECT COUNT(*) FROM f WHERE f.session_id IN (SELECT session_id FROM cs WHERE cs.campaign = c.slug)) AS pageviews,
              (SELECT COUNT(*) FROM downloads d WHERE d.session_id IN (SELECT session_id FROM cs WHERE cs.campaign = c.slug)) AS downloads,
              (SELECT COUNT(DISTINCT p.session_id) FROM pageviews p WHERE p.campaign = c.slug AND p.is_bot = 0 AND p.is_admin = 0) AS total_sessions,
              (SELECT MAX(p.ts) FROM pageviews p WHERE p.campaign = c.slug AND p.is_bot = 0 AND p.is_admin = 0) AS last_ts
       FROM campaigns c
       ORDER BY c.created_at DESC`
    )
    .all(params(f)) as CampaignRow[]
  const periodSessions = (
    db.prepare(`${cte(f)} SELECT COUNT(DISTINCT session_id) AS n FROM f`).get(params(f)) as { n: number }
  ).n
  return { rows, periodSessions }
}

// ---------------------------------------------------------------------------
// Téléchargements de PDF (journal serveur)
// ---------------------------------------------------------------------------

export interface DownloadRow {
  id: number
  ts: number
  file: string
  ip: string | null
  session_id: string | null
  is_admin: number
  is_bot: number
  country_code: string | null
  region: string | null
  city: string | null
  postal_code: string | null
  geo_source: string | null
  asn: number | null
  as_org: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  device_type: string | null
  device_vendor: string | null
  device_model: string | null
  referrer: string | null
  accept_language: string | null
  user_agent: string | null
  campaign: string | null
}

export interface DownloadFileRow {
  file: string
  opens: number
  visitors: number
  last_ts: number
}

function dlWhere(f: Filters) {
  let w = 'd.ts >= @from AND d.ts < @to'
  if (!f.includeAdmin) w += ' AND d.is_admin = 0'
  if (!f.includeBots) w += ' AND d.is_bot = 0'
  if (f.ip) w += ' AND d.ip = @ip'
  return w
}

export function getDownloads(f: Filters, limit = 100): { files: DownloadFileRow[]; log: DownloadRow[] } {
  const db = getDb()
  const files = db
    .prepare(
      `SELECT d.file, COUNT(*) AS opens, COUNT(DISTINCT d.visitor_id) AS visitors, MAX(d.ts) AS last_ts
       FROM downloads d WHERE ${dlWhere(f)} GROUP BY d.file ORDER BY opens DESC`
    )
    .all(params(f)) as DownloadFileRow[]
  const log = db
    .prepare(
      `SELECT d.*, (SELECT p.campaign FROM pageviews p WHERE p.session_id = d.session_id AND p.campaign IS NOT NULL LIMIT 1) AS campaign
       FROM downloads d WHERE ${dlWhere(f)} ORDER BY d.ts DESC LIMIT @limit`
    )
    .all(params(f, { limit })) as DownloadRow[]
  return { files, log }
}

// ---------------------------------------------------------------------------
// Parcours complet d'une IP (toutes périodes confondues)
// ---------------------------------------------------------------------------

export type JourneyItem =
  | { kind: 'page'; ts: number; session_id: string; path: string; duration_ms: number | null; scroll_pct: number | null; referrer: string | null; campaign: string | null }
  | { kind: 'click'; ts: number; session_id: string; type: string; target: string; label: string | null }
  | { kind: 'pdf'; ts: number; session_id: string | null; file: string; referrer: string | null }

export interface JourneySession {
  session_id: string
  start: number
  device: string
  location: string
  items: JourneyItem[]
}

export function getJourney(ip: string, limit = 1500): JourneySession[] {
  const db = getDb()
  const pages = db
    .prepare(
      `SELECT ts, session_id, path, duration_ms, scroll_pct, referrer, campaign, browser, browser_version, os, os_version,
              device_type, device_vendor, device_model, city, region, country_code
       FROM pageviews WHERE ip = ? ORDER BY ts DESC LIMIT ?`
    )
    .all(ip, limit) as (Record<string, string | number | null> & { ts: number; session_id: string; path: string })[]
  const clicks = db
    .prepare(
      `SELECT e.ts, e.session_id, e.kind AS type, e.target, e.label FROM events e
       JOIN pageviews p ON p.id = e.pageview_id WHERE p.ip = ? ORDER BY e.ts DESC LIMIT ?`
    )
    .all(ip, limit) as { ts: number; session_id: string; type: string; target: string; label: string | null }[]
  const pdfs = db
    .prepare(
      `SELECT ts, session_id, file, referrer, browser, browser_version, os, os_version, device_type, device_vendor, device_model,
              city, region, country_code
       FROM downloads WHERE ip = ? ORDER BY ts DESC LIMIT ?`
    )
    .all(ip, limit) as (Record<string, string | number | null> & { ts: number; session_id: string | null; file: string })[]

  const describe = (r: Record<string, string | number | null>) => ({
    device:
      [r.browser, typeof r.browser_version === 'string' ? r.browser_version.split('.')[0] : null].filter(Boolean).join(' ') +
      ' · ' +
      ([r.os, r.os_version].filter(Boolean).join(' ') || 'OS inconnu') +
      ([r.device_vendor, r.device_model].filter(Boolean).length ? ` · ${[r.device_vendor, r.device_model].filter(Boolean).join(' ')}` : ''),
    location: [r.city, r.region, r.country_code].filter(Boolean).join(', ') || 'Localisation inconnue',
  })

  const sessions = new Map<string, JourneySession>()
  const ensure = (id: string, ts: number, r: Record<string, string | number | null>) => {
    let s = sessions.get(id)
    if (!s) {
      s = { session_id: id, start: ts, ...describe(r), items: [] }
      sessions.set(id, s)
    }
    s.start = Math.min(s.start, ts)
    return s
  }

  for (const p of pages) {
    ensure(p.session_id, p.ts, p).items.push({
      kind: 'page', ts: p.ts, session_id: p.session_id, path: p.path,
      duration_ms: p.duration_ms as number | null, scroll_pct: p.scroll_pct as number | null,
      referrer: p.referrer as string | null, campaign: p.campaign as string | null,
    })
  }
  for (const c of clicks) {
    sessions.get(c.session_id)?.items.push({ kind: 'click', ...c })
  }
  for (const d of pdfs) {
    // Ouverture hors visite (lien direct) : regroupée dans une « visite » propre au téléchargement.
    const id = d.session_id ?? `pdf-${d.ts}`
    ensure(id, d.ts, d).items.push({ kind: 'pdf', ts: d.ts, session_id: d.session_id, file: d.file, referrer: d.referrer as string | null })
  }

  const list = [...sessions.values()]
  for (const s of list) s.items.sort((a, b) => a.ts - b.ts)
  return list.sort((a, b) => b.start - a.start)
}

export interface IpNetwork {
  asn: number | null
  as_org: string | null
  city: string | null
  region: string | null
  country_code: string | null
  geo_source: string | null
}

export function getIpNetwork(ip: string): IpNetwork | null {
  return (
    (getDb()
      .prepare(
        `SELECT asn, as_org, city, region, country_code, geo_source FROM (
           SELECT ts, asn, as_org, city, region, country_code, geo_source FROM pageviews WHERE ip = ?
           UNION ALL
           SELECT ts, asn, as_org, city, region, country_code, geo_source FROM downloads WHERE ip = ?
         ) ORDER BY ts DESC LIMIT 1`
      )
      .get(ip, ip) as IpNetwork | undefined) ?? null
  )
}

// ---------------------------------------------------------------------------
// Appareils personnels
// ---------------------------------------------------------------------------

export interface OwnerDevice {
  token_hash: string
  label: string
  user_agent: string | null
  created_at: number
  last_seen: number | null
}

export function getOwnerDevices(): OwnerDevice[] {
  return getDb()
    .prepare('SELECT token_hash, label, user_agent, created_at, last_seen FROM owner_devices ORDER BY created_at')
    .all() as OwnerDevice[]
}
