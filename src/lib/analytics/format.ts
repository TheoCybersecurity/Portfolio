const TZ = 'Europe/Paris'

const nf = new Intl.NumberFormat('fr-FR')
export const fmtNumber = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)))

export const fmtPct = (ratio: number | null | undefined) =>
  ratio == null ? '—' : `${Math.round(ratio * 100)} %`

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
export const fmtDateTime = (ts: number) => dateTimeFmt.format(ts)

const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' })

export function countryName(code: string | null): string {
  if (!code) return 'Inconnu'
  if (code === 'T1') return 'Réseau Tor'
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function flag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code) || code === 'T1') return '🏳️'
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Ordinateur',
  mobile: 'Mobile',
  tablet: 'Tablette',
  smarttv: 'Télévision',
  console: 'Console',
  wearable: 'Montre / objet',
  embedded: 'Embarqué',
  xr: 'Casque XR',
}
export const deviceLabel = (t: string | null) => (t ? DEVICE_LABELS[t] ?? t : 'Inconnu')

/** N'autorise un lien cliquable que pour les URL http(s) : un référent est une donnée fournie par le visiteur. */
export function safeHttpUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}
