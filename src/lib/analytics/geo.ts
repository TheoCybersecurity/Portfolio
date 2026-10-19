import { lookupIp } from './geoip'

/**
 * Géolocalisation à partir des en-têtes ajoutés par Cloudflare : aucune IP n'est
 * transmise à un service tiers. cf-ipcountry est toujours présent ; les autres
 * n'apparaissent que si la règle « Add visitor location headers » (Rules >
 * Transform Rules > Managed Transforms) est activée sur la zone marescal.fr.
 */
export interface Geo {
  country_code: string | null
  continent: string | null
  region: string | null
  city: string | null
  postal_code: string | null
  lat: number | null
  lon: number | null
  geo_timezone: string | null
}

function header(headers: Headers, name: string, max = 100): string | null {
  const raw = headers.get(name)?.trim()
  if (!raw) return null
  let value = raw
  try {
    value = decodeURIComponent(raw)
  } catch {
    // valeur non encodée : on la garde telle quelle
  }
  return value.slice(0, max)
}

function coord(headers: Headers, name: string, limit: number): number | null {
  const n = Number(headers.get(name))
  return headers.get(name) && Number.isFinite(n) && Math.abs(n) <= limit ? n : null
}

export interface ResolvedGeo extends Geo {
  asn: number | null
  as_org: string | null
  geo_source: 'cloudflare' | 'dbip' | 'country' | null
}

/**
 * Cloudflare d'abord quand il fournit la ville, sinon la base locale DB-IP ;
 * l'opérateur (AS) vient toujours de la base locale.
 */
export function resolveGeo(headers: Headers, ip: string | null): ResolvedGeo {
  const cf = geoFromHeaders(headers)
  const local = lookupIp(ip)
  const base = { asn: local?.asn ?? null, as_org: local?.as_org?.slice(0, 120) ?? null }

  if (cf.city && cf.lat !== null) return { ...cf, ...base, geo_source: 'cloudflare' }
  if (local && (local.city || local.lat !== null)) {
    return {
      country_code: local.country_code ?? cf.country_code,
      continent: cf.continent,
      region: local.region,
      city: local.city,
      postal_code: local.postal_code,
      lat: local.lat,
      lon: local.lon,
      geo_timezone: cf.geo_timezone,
      ...base,
      geo_source: 'dbip',
    }
  }
  const cc = cf.country_code ?? local?.country_code ?? null
  return { ...cf, country_code: cc, ...base, geo_source: cc ? 'country' : null }
}

export function geoFromHeaders(headers: Headers): Geo {
  const cc = header(headers, 'cf-ipcountry', 2)?.toUpperCase() ?? null
  return {
    // XX = pays inconnu ; T1 = réseau Tor (conservé tel quel, affiché comme « Tor »)
    country_code: cc && cc !== 'XX' && /^[A-Z0-9]{2}$/.test(cc) ? cc : null,
    continent: header(headers, 'cf-ipcontinent', 2),
    region: header(headers, 'cf-region'),
    city: header(headers, 'cf-ipcity'),
    postal_code: header(headers, 'cf-postal-code', 20),
    lat: coord(headers, 'cf-iplatitude', 90),
    lon: coord(headers, 'cf-iplongitude', 180),
    geo_timezone: header(headers, 'cf-timezone', 64),
  }
}
