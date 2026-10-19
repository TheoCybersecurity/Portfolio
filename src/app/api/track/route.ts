import { randomUUID } from 'node:crypto'
import { after, NextResponse, type NextRequest } from 'next/server'
import { getClientIp, isAdminIp } from '@/lib/admin'
import { backfillGeo, getDb, purgeExpired } from '@/lib/analytics/db'
import { resolveGeo } from '@/lib/analytics/geo'
import { ensureGeoIp, geoIpReady, lookupIp } from '@/lib/analytics/geoip'
import { forgetVisitor, isOwnerDevice, OWNER_COOKIE, sessionFor, visitorIdOf } from '@/lib/analytics/visitor'
import { parseUserAgent, type UaHints } from '@/lib/analytics/ua'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 8 * 1024
const RATE_LIMIT = 120 // requêtes par minute et par IP
const EVENT_KINDS = new Set(['download', 'outbound', 'mailto', 'tel'])
const SITE_HOST = new URL(SITE_URL).host

const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
  }
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 })
    return false
  }
  h.count++
  return h.count > RATE_LIMIT
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v))) : null

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).host.toLowerCase() || null
  } catch {
    return null
  }
}

function parseHints(v: unknown): UaHints | undefined {
  if (!v || typeof v !== 'object') return undefined
  const h = v as Record<string, unknown>
  const list = Array.isArray(h.fullVersionList)
    ? h.fullVersionList
        .slice(0, 10)
        .map((b) => ({ brand: str((b as { brand?: unknown }).brand, 60) ?? '', version: str((b as { version?: unknown }).version, 30) ?? '' }))
        .filter((b) => b.brand && b.version)
    : undefined
  return {
    platform: str(h.platform, 30) ?? undefined,
    platformVersion: str(h.platformVersion, 30) ?? undefined,
    model: str(h.model, 60) ?? undefined,
    architecture: str(h.architecture, 20) ?? undefined,
    bitness: str(h.bitness, 5) ?? undefined,
    fullVersionList: list,
  }
}

/** Slug de campagne (?c=…) uniquement s'il correspond à une campagne créée dans /admin. */
function campaignOf(params: URLSearchParams): string | null {
  const slug = params.get('c')
  if (!slug || !/^[a-z0-9-]{1,60}$/.test(slug)) return null
  return getDb().prepare('SELECT 1 FROM campaigns WHERE slug = ?').get(slug) ? slug : null
}

function recordPageview(req: NextRequest, body: Record<string, unknown>, ip: string | null) {
  const path = str(body.path, 300)
  if (!path || !path.startsWith('/') || path.startsWith('/admin')) return null

  const now = Date.now()
  const ua = req.headers.get('user-agent')?.slice(0, 500) ?? ''
  const parsed = parseUserAgent(ua, parseHints(body.uaData), body.webdriver === true)
  const visitorId = visitorIdOf(ip, ua)

  const query = str(body.query, 500)
  const params = new URLSearchParams(query ?? '')
  const referrer = str(body.referrer, 500)
  const referrerHost = hostOf(referrer)
  const token = randomUUID()
  const geo = resolveGeo(req.headers, ip)

  getDb()
    .prepare(
      `INSERT INTO pageviews (
         token, ts, session_id, visitor_id, is_admin, is_bot, ip,
         country_code, continent, region, city, postal_code, lat, lon, geo_timezone,
         asn, as_org, geo_source, campaign,
         path, query, referrer, referrer_host, utm_source, utm_medium, utm_campaign,
         user_agent, browser, browser_version, engine, os, os_version,
         device_type, device_vendor, device_model, cpu_arch,
         language, languages, accept_language, timezone,
         screen_w, screen_h, viewport_w, viewport_h, dpr, color_scheme, touch, connection)
       VALUES (
         @token, @ts, @session_id, @visitor_id, @is_admin, @is_bot, @ip,
         @country_code, @continent, @region, @city, @postal_code, @lat, @lon, @geo_timezone,
         @asn, @as_org, @geo_source, @campaign,
         @path, @query, @referrer, @referrer_host, @utm_source, @utm_medium, @utm_campaign,
         @user_agent, @browser, @browser_version, @engine, @os, @os_version,
         @device_type, @device_vendor, @device_model, @cpu_arch,
         @language, @languages, @accept_language, @timezone,
         @screen_w, @screen_h, @viewport_w, @viewport_h, @dpr, @color_scheme, @touch, @connection)`
    )
    .run({
      token,
      ts: now,
      session_id: sessionFor(visitorId, now, true),
      visitor_id: visitorId,
      is_admin: isAdminIp(ip) ? 1 : 0,
      is_bot: parsed.is_bot ? 1 : 0,
      ip,
      ...geo,
      campaign: campaignOf(params),
      path,
      query,
      // Les navigations internes ne sont pas des sources de trafic.
      referrer: referrerHost === SITE_HOST ? null : referrer,
      referrer_host: referrerHost === SITE_HOST ? null : referrerHost,
      utm_source: params.get('utm_source')?.slice(0, 100) || null,
      utm_medium: params.get('utm_medium')?.slice(0, 100) || null,
      utm_campaign: params.get('utm_campaign')?.slice(0, 100) || null,
      user_agent: ua || null,
      browser: parsed.browser,
      browser_version: parsed.browser_version,
      engine: parsed.engine,
      os: parsed.os,
      os_version: parsed.os_version,
      device_type: parsed.device_type,
      device_vendor: parsed.device_vendor,
      device_model: parsed.device_model,
      cpu_arch: parsed.cpu_arch,
      language: str(body.language, 35),
      languages: str(body.languages, 200),
      accept_language: req.headers.get('accept-language')?.slice(0, 200) ?? null,
      timezone: str(body.timezone, 64),
      screen_w: int(body.screenW, 0, 20000),
      screen_h: int(body.screenH, 0, 20000),
      viewport_w: int(body.viewportW, 0, 20000),
      viewport_h: int(body.viewportH, 0, 20000),
      dpr: typeof body.dpr === 'number' && body.dpr > 0 && body.dpr < 10 ? body.dpr : null,
      color_scheme: body.colorScheme === 'dark' || body.colorScheme === 'light' ? body.colorScheme : null,
      touch: typeof body.touch === 'boolean' ? (body.touch ? 1 : 0) : null,
      connection: str(body.connection, 20),
    })

  return token
}

function recordLeave(body: Record<string, unknown>) {
  const token = str(body.t, 36)
  if (!token) return
  getDb()
    .prepare(
      `UPDATE pageviews
       SET duration_ms = MAX(COALESCE(duration_ms, 0), @duration),
           scroll_pct  = MAX(COALESCE(scroll_pct, 0), @scroll)
       WHERE token = @token AND ts > @since`
    )
    .run({
      token,
      duration: int(body.duration, 0, 6 * 3600 * 1000) ?? 0,
      scroll: int(body.scroll, 0, 100) ?? 0,
      since: Date.now() - 24 * 3600 * 1000,
    })
}

function recordEvent(body: Record<string, unknown>) {
  const token = str(body.t, 36)
  const kind = str(body.kind, 20)
  const target = str(body.target, 500)
  if (!token || !kind || !EVENT_KINDS.has(kind) || !target) return
  const db = getDb()
  const pv = db
    .prepare('SELECT id, session_id, is_admin FROM pageviews WHERE token = ? AND ts > ?')
    .get(token, Date.now() - 24 * 3600 * 1000) as { id: number; session_id: string; is_admin: number } | undefined
  if (!pv) return
  db.prepare(
    'INSERT INTO events (ts, pageview_id, session_id, is_admin, kind, target, label) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(Date.now(), pv.id, pv.session_id, pv.is_admin, kind, target, str(body.label, 200))
}

export async function POST(req: NextRequest) {
  // Refuse les envois depuis un autre site (le navigateur pose toujours Origin sur ces requêtes).
  const origin = req.headers.get('origin')
  if (origin && hostOf(origin) !== SITE_HOST && process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 403 })
  }

  const ip = getClientIp(req.headers)
  if (rateLimited(ip ?? 'unknown')) return new NextResponse(null, { status: 429 })

  // Appareils personnels de l'administrateur : rien n'est enregistré, où qu'ils se connectent.
  if (isOwnerDevice(req.cookies.get(OWNER_COOKIE)?.value)) return new NextResponse(null, { status: 204 })
  void ensureGeoIp()

  const text = await req.text()
  if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 })

  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  try {
    switch (body.type) {
      case 'pageview': {
        const token = recordPageview(req, body, ip)
        after(async () => {
          try {
            purgeExpired()
            await ensureGeoIp()
            if (geoIpReady()) backfillGeo(lookupIp)
          } catch (e) {
            console.error('[analytics] maintenance', e)
          }
        })
        return token ? NextResponse.json({ t: token }) : new NextResponse(null, { status: 204 })
      }
      case 'leave':
        recordLeave(body)
        break
      case 'event':
        recordEvent(body)
        break
      case 'optout':
        forgetVisitor(visitorIdOf(ip, req.headers.get('user-agent')?.slice(0, 500) ?? ''))
        break
      default:
        return new NextResponse(null, { status: 400 })
    }
  } catch (e) {
    console.error('[analytics] track', e)
    return new NextResponse(null, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
