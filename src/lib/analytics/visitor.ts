import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getDb, getSalt } from './db'

const SESSION_GAP_MS = 30 * 60 * 1000

/** Cookie posé uniquement sur les appareils personnels de l'administrateur (jamais sur ceux des visiteurs). */
export const OWNER_COOKIE = '__Host-owner-device'
export const OWNER_COOKIE_MAX_AGE = 2 * 365 * 24 * 3600

export const visitorIdOf = (ip: string | null, ua: string) =>
  createHash('sha256').update(`${getSalt()}|${ip ?? ''}|${ua}`).digest('hex').slice(0, 24)

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function newOwnerToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

/** Vrai si le cookie présenté correspond à un appareil enregistré (met à jour sa dernière activité). */
export function isOwnerDevice(token: string | undefined): boolean {
  if (!token || token.length > 100) return false
  const hash = hashToken(token)
  const db = getDb()
  const row = db.prepare('SELECT last_seen FROM owner_devices WHERE token_hash = ?').get(hash) as
    | { last_seen: number | null }
    | undefined
  if (!row) return false
  if (!row.last_seen || Date.now() - row.last_seen > 60_000) {
    db.prepare('UPDATE owner_devices SET last_seen = ? WHERE token_hash = ?').run(Date.now(), hash)
  }
  return true
}

export function isOptedOut(visitorId: string): boolean {
  return !!getDb().prepare('SELECT 1 FROM optouts WHERE visitor_id = ?').get(visitorId)
}

/** Droit d'opposition : mémorise le refus et efface tout l'historique de ce visiteur. */
export function forgetVisitor(visitorId: string) {
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      'INSERT INTO optouts (visitor_id, ts) VALUES (?, ?) ON CONFLICT(visitor_id) DO UPDATE SET ts = excluded.ts'
    ).run(visitorId, Date.now())
    // Les événements liés sont supprimés en cascade (clé étrangère ON DELETE CASCADE).
    db.prepare('DELETE FROM pageviews WHERE visitor_id = ?').run(visitorId)
    db.prepare('DELETE FROM downloads WHERE visitor_id = ?').run(visitorId)
  })()
}

/** Visite en cours du visiteur (pages espacées de moins de 30 min), ou une nouvelle. */
export function sessionFor(visitorId: string, now: number, create: true): string
export function sessionFor(visitorId: string, now: number, create: false): string | null
export function sessionFor(visitorId: string, now: number, create: boolean): string | null {
  const last = getDb()
    .prepare('SELECT session_id, ts FROM pageviews WHERE visitor_id = ? ORDER BY ts DESC LIMIT 1')
    .get(visitorId) as { session_id: string; ts: number } | undefined
  if (last && now - last.ts < SESSION_GAP_MS) return last.session_id
  return create ? randomUUID() : null
}
