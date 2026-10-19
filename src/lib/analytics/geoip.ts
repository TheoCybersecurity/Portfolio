import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { Reader, type AsnResponse, type CityResponse } from 'maxmind'

/**
 * Géolocalisation locale à partir des bases gratuites DB-IP Lite (CC BY 4.0) :
 * ville + opérateur (AS) sans qu'aucune IP de visiteur ne quitte le serveur.
 * Les bases sont stockées dans le volume de données et rafraîchies chaque mois.
 */

const DIR = path.join(path.dirname(process.env.ANALYTICS_DB_PATH || path.join(process.cwd(), 'data', 'analytics.db')), 'geoip')
const MAX_AGE_MS = 32 * 24 * 3600 * 1000
const CHECK_EVERY_MS = 12 * 3600 * 1000

const DBS = {
  city: 'dbip-city-lite',
  asn: 'dbip-asn-lite',
} as const
type DbName = keyof typeof DBS

const readers: { city?: Reader<CityResponse>; asn?: Reader<AsnResponse> } = {}
let lastCheck = 0
let refreshing: Promise<void> | null = null

const fileOf = (db: DbName) => path.join(DIR, `${DBS[db]}.mmdb`)

function load(db: DbName) {
  try {
    const buf = fs.readFileSync(fileOf(db))
    if (db === 'city') readers.city = new Reader<CityResponse>(buf)
    else readers.asn = new Reader<AsnResponse>(buf)
  } catch {
    // Base absente ou illisible : la géolocalisation retombe sur Cloudflare.
  }
}

function months(): string[] {
  const now = new Date()
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return [fmt(now), fmt(prev)] // la base du mois peut ne pas être encore publiée
}

async function download(db: DbName): Promise<boolean> {
  fs.mkdirSync(DIR, { recursive: true })
  for (const month of months()) {
    const res = await fetch(`https://download.db-ip.com/free/${DBS[db]}-${month}.mmdb.gz`, {
      signal: AbortSignal.timeout(10 * 60 * 1000),
    }).catch(() => null)
    if (!res?.ok || !res.body) continue
    // Nom unique : plusieurs parties du serveur (routes, pages) peuvent lancer le téléchargement en même temps.
    const tmp = `${fileOf(db)}.${process.pid}-${randomUUID()}.tmp`
    try {
      await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createGunzip(), fs.createWriteStream(tmp))
      new Reader(fs.readFileSync(tmp)) // valide le fichier avant de remplacer l'ancien
      fs.renameSync(tmp, fileOf(db))
      return true
    } catch (e) {
      fs.rmSync(tmp, { force: true })
      console.error(`[geoip] ${DBS[db]}-${month}`, e)
    }
  }
  return false
}

async function refresh(): Promise<void> {
  for (const db of Object.keys(DBS) as DbName[]) {
    let age = Infinity
    try {
      age = Date.now() - fs.statSync(fileOf(db)).mtimeMs
    } catch {}
    if (age > MAX_AGE_MS && (await download(db))) load(db)
  }
}

/** À appeler régulièrement : charge les bases et lance leur mise à jour en arrière-plan si besoin. */
export function ensureGeoIp(): Promise<void> {
  if (!readers.city) load('city')
  if (!readers.asn) load('asn')
  if (!refreshing && Date.now() - lastCheck > CHECK_EVERY_MS) {
    lastCheck = Date.now()
    refreshing = refresh()
      .catch((e) => console.error('[geoip] refresh', e))
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing ?? Promise.resolve()
}

export function geoIpReady(): boolean {
  return !!readers.city
}

export interface IpLookup {
  country_code: string | null
  region: string | null
  city: string | null
  postal_code: string | null
  lat: number | null
  lon: number | null
  asn: number | null
  as_org: string | null
}

const pickName = (names?: Record<string, string>) => names?.fr ?? names?.en ?? null

export function lookupIp(ip: string | null): IpLookup | null {
  if (!ip || (!readers.city && !readers.asn)) return null
  try {
    const c = readers.city?.get(ip) ?? null
    const a = readers.asn?.get(ip) ?? null
    return {
      country_code: c?.country?.iso_code ?? null,
      region: pickName(c?.subdivisions?.[0]?.names as Record<string, string> | undefined),
      city: pickName(c?.city?.names as Record<string, string> | undefined),
      postal_code: c?.postal?.code ?? null,
      lat: c?.location?.latitude ?? null,
      lon: c?.location?.longitude ?? null,
      asn: a?.autonomous_system_number ?? null,
      as_org: a?.autonomous_system_organization ?? null,
    }
  } catch {
    return null // adresse invalide
  }
}
