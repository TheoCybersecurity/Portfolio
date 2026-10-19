import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { NextResponse, type NextRequest } from 'next/server'
import { getClientIp, isAdminIp } from '@/lib/admin'
import { getDb } from '@/lib/analytics/db'
import { resolveGeo } from '@/lib/analytics/geo'
import { ensureGeoIp } from '@/lib/analytics/geoip'
import { parseUserAgent } from '@/lib/analytics/ua'
import { isOptedOut, isOwnerDevice, OWNER_COOKIE, sessionFor, visitorIdOf } from '@/lib/analytics/visitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Les PDF publics (/reports, /certifications, CV) sont réécrits ici par le middleware :
 * chaque ouverture est journalisée côté serveur, y compris par lien direct ou sans JavaScript.
 */
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const ALLOWED = /^(?:(?:reports|certifications)\/[A-Za-z0-9._-]+|cv-theo-marescal)\.pdf$/
const DEDUPE_MS = 60_000

function resolveFile(rel: string | null): string | null {
  if (!rel || !ALLOWED.test(rel) || rel.includes('..')) return null
  const full = path.join(PUBLIC_DIR, rel)
  return full.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(full) ? full : null
}

function record(req: NextRequest, file: string) {
  const ip = getClientIp(req.headers)
  const ua = req.headers.get('user-agent')?.slice(0, 500) ?? ''
  const visitorId = visitorIdOf(ip, ua)
  if (isOptedOut(visitorId) || req.headers.get('sec-gpc') === '1') return

  const db = getDb()
  const now = Date.now()
  // Un lecteur PDF peut enchaîner une requête complète puis des requêtes partielles : une seule ligne par ouverture.
  const recent = db
    .prepare('SELECT 1 FROM downloads WHERE visitor_id = ? AND file = ? AND ts > ?')
    .get(visitorId, file, now - DEDUPE_MS)
  if (recent) return

  const parsed = parseUserAgent(ua)
  const geo = resolveGeo(req.headers, ip)
  db.prepare(
    `INSERT INTO downloads (
       ts, file, ip, visitor_id, session_id, is_admin, is_bot,
       country_code, region, city, postal_code, lat, lon, geo_source, asn, as_org,
       user_agent, browser, browser_version, os, os_version, device_type, device_vendor, device_model,
       referrer, accept_language)
     VALUES (
       @ts, @file, @ip, @visitor_id, @session_id, @is_admin, @is_bot,
       @country_code, @region, @city, @postal_code, @lat, @lon, @geo_source, @asn, @as_org,
       @user_agent, @browser, @browser_version, @os, @os_version, @device_type, @device_vendor, @device_model,
       @referrer, @accept_language)`
  ).run({
    ts: now,
    file,
    ip,
    visitor_id: visitorId,
    session_id: sessionFor(visitorId, now, false),
    is_admin: isAdminIp(ip) ? 1 : 0,
    is_bot: parsed.is_bot ? 1 : 0,
    country_code: geo.country_code,
    region: geo.region,
    city: geo.city,
    postal_code: geo.postal_code,
    lat: geo.lat,
    lon: geo.lon,
    geo_source: geo.geo_source,
    asn: geo.asn,
    as_org: geo.as_org,
    user_agent: ua || null,
    browser: parsed.browser,
    browser_version: parsed.browser_version,
    os: parsed.os,
    os_version: parsed.os_version,
    device_type: parsed.device_type,
    device_vendor: parsed.device_vendor,
    device_model: parsed.device_model,
    referrer: req.headers.get('referer')?.slice(0, 500) ?? null,
    accept_language: req.headers.get('accept-language')?.slice(0, 200) ?? null,
  })
}

async function serve(req: NextRequest, head: boolean) {
  // Après la réécriture du middleware, la route voit l'adresse d'origine (/reports/….pdf), pas le paramètre f.
  const { pathname, searchParams } = req.nextUrl
  // Pas de décodage : les noms autorisés sont en ASCII, un « % » est simplement refusé par ALLOWED.
  const rel = pathname.endsWith('.pdf') ? pathname.slice(1) : searchParams.get('f')
  const full = resolveFile(rel)
  if (!full || !rel) return new NextResponse('Not found', { status: 404 })

  const size = fs.statSync(full).size
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `inline; filename="${path.basename(full)}"`,
    // « private » : Cloudflare ne met pas le fichier en cache, chaque ouverture atteint le serveur.
    'Cache-Control': 'private, no-cache',
    'X-Content-Type-Options': 'nosniff',
  })

  let start = 0
  let end = size - 1
  let status = 200
  const range = req.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (!m || (m[1] === '' && m[2] === '')) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    if (m[1] === '') {
      start = Math.max(0, size - Number(m[2]))
    } else {
      start = Number(m[1])
      end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
    }
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    status = 206
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  }
  headers.set('Content-Length', String(end - start + 1))

  const ownerDevice = isOwnerDevice(req.cookies.get(OWNER_COOKIE)?.value)
  if (!head && start === 0 && !ownerDevice) {
    void ensureGeoIp()
    try {
      record(req, rel)
    } catch (e) {
      console.error('[analytics] download', e)
    }
  }

  if (head) return new NextResponse(null, { status, headers })
  const stream = Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream
  return new NextResponse(stream, { status, headers })
}

export const GET = (req: NextRequest) => serve(req, false)
export const HEAD = (req: NextRequest) => serve(req, true)
