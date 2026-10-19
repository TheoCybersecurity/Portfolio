'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getClientIp, isAdminIp } from '@/lib/admin'
import { getDb } from '@/lib/analytics/db'
import { newOwnerToken, OWNER_COOKIE, OWNER_COOKIE_MAX_AGE } from '@/lib/analytics/visitor'
import { campaignTargets } from './targets'

async function assertAdmin() {
  // Les actions serveur sont des POST vers /admin : le middleware filtre déjà, on revérifie ici.
  if (!isAdminIp(getClientIp(await headers()))) throw new Error('Accès refusé')
}

const text = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/g, '') || 'campagne'
  )
}

export async function createCampaign(formData: FormData) {
  await assertAdmin()
  const name = text(formData.get('name'), 80)
  const target = text(formData.get('target'), 200)
  if (!name || !campaignTargets().some((t) => t.path === target)) return

  const db = getDb()
  const base = slugify(name)
  let slug = base
  for (let i = 2; db.prepare('SELECT 1 FROM campaigns WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`
  db.prepare('INSERT INTO campaigns (slug, name, target_path, created_at) VALUES (?, ?, ?, ?)').run(
    slug,
    name,
    target,
    Date.now()
  )
  revalidatePath('/admin')
}

/** « Supprimer » une campagne active l'archive : ses résultats sont conservés (et son lien reste compté). */
export async function archiveCampaign(formData: FormData) {
  await assertAdmin()
  const slug = text(formData.get('slug'), 60)
  getDb().prepare('UPDATE campaigns SET archived_at = ? WHERE slug = ? AND archived_at IS NULL').run(Date.now(), slug)
  revalidatePath('/admin')
}

export async function restoreCampaign(formData: FormData) {
  await assertAdmin()
  const slug = text(formData.get('slug'), 60)
  getDb().prepare('UPDATE campaigns SET archived_at = NULL WHERE slug = ?').run(slug)
  revalidatePath('/admin')
}

/**
 * Suppression définitive depuis les archives : la campagne et ses statistiques disparaissent.
 * Les visites elles-mêmes restent dans les statistiques générales du site, simplement plus attribuées.
 */
export async function deleteCampaignForever(formData: FormData) {
  await assertAdmin()
  const slug = text(formData.get('slug'), 60)
  const db = getDb()
  db.transaction(() => {
    const archived = db.prepare('SELECT 1 FROM campaigns WHERE slug = ? AND archived_at IS NOT NULL').get(slug)
    if (!archived) return
    db.prepare('UPDATE pageviews SET campaign = NULL WHERE campaign = ?').run(slug)
    db.prepare('DELETE FROM campaigns WHERE slug = ?').run(slug)
  })()
  revalidatePath('/admin')
}

export async function registerDevice(formData: FormData) {
  await assertAdmin()
  const label = text(formData.get('label'), 60) || 'Appareil'
  const ua = (await headers()).get('user-agent')?.slice(0, 500) ?? null
  const { token, hash } = newOwnerToken()
  getDb()
    .prepare('INSERT INTO owner_devices (token_hash, label, user_agent, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
    .run(hash, label, ua, Date.now(), Date.now())
  ;(await cookies()).set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: OWNER_COOKIE_MAX_AGE,
  })
  revalidatePath('/admin')
}

export async function revokeDevice(formData: FormData) {
  await assertAdmin()
  const hash = text(formData.get('id'), 64)
  getDb().prepare('DELETE FROM owner_devices WHERE token_hash = ?').run(hash)
  revalidatePath('/admin')
}
