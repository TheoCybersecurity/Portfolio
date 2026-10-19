import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies, headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientIp, isAdminIp } from '@/lib/admin'
import {
  PERIODS,
  firstTimestamp,
  getBotSessions,
  getBreakdowns,
  getCampaigns,
  getDownloads,
  getEvents,
  getIpNetwork,
  getIpProfile,
  getJourney,
  getOwnerDevices,
  getLiveVisitors,
  getMapPoints,
  getPages,
  getSessions,
  getSummary,
  getTimeData,
  type Filters,
  type Row,
  type Summary,
} from '@/lib/analytics/queries'
import {
  countryName,
  deviceLabel,
  flag,
  fmtDateTime,
  fmtDuration,
  fmtNumber,
  fmtPct,
  safeHttpUrl,
} from '@/lib/analytics/format'
import TrafficChart from '@/components/admin/TrafficChart'
import ColumnChart from '@/components/admin/ColumnChart'
import BarList, { type BarItem } from '@/components/admin/BarList'
import VisitorMap from '@/components/admin/VisitorMap'
import CampaignsCard from '@/components/admin/CampaignsCard'
import DownloadsCard from '@/components/admin/DownloadsCard'
import JourneyCard from '@/components/admin/JourneyCard'
import DevicesCard from '@/components/admin/DevicesCard'
import { createHash } from 'node:crypto'
import { OWNER_COOKIE } from '@/lib/analytics/visitor'
import { backfillGeo } from '@/lib/analytics/db'
import { ensureGeoIp, geoIpReady, lookupIp } from '@/lib/analytics/geoip'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Statistiques',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 25
const EVENT_LABELS: Record<string, string> = {
  download: 'Téléchargement',
  outbound: 'Lien sortant',
  mailto: 'E-mail',
  tel: 'Téléphone',
}
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    // min-w-0 : dans une grille, sans lui la carte s'élargit à la taille de son tableau au lieu de le faire défiler.
    <section className={`min-w-0 rounded-xl border border-border bg-surface p-5 ${className}`}>
      <h2 className="font-display text-base font-semibold text-text-primary mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Kpi({ label, value, delta, invert = false }: { label: string; value: string; delta?: number | null; invert?: boolean }) {
  let deltaNode: ReactNode = null
  if (delta != null && Number.isFinite(delta)) {
    const good = invert ? delta < 0 : delta > 0
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '='
    deltaNode = (
      <span className={`text-xs font-mono ${delta === 0 ? 'text-text-muted' : good ? 'text-emerald-400' : 'text-rose-400'}`}>
        {arrow} {Math.abs(Math.round(delta * 100))} %
      </span>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-text-primary">{value}</p>
      <div className="h-4">{deltaNode}</div>
    </div>
  )
}

const change = (cur: number | null, prev: number | null | undefined) =>
  cur == null || prev == null ? null : prev === 0 ? (cur === 0 ? 0 : null) : (cur - prev) / prev

function toItems(rows: Row[], render: (label: string | null) => ReactNode = (l) => l ?? 'Inconnu'): BarItem[] {
  return rows.map((r, i) => ({
    key: `${r.label ?? '∅'}-${i}`,
    label: render(r.label),
    value: r.visitors,
    detail: `${r.visitors} visiteur(s) · ${r.sessions} visite(s) · ${r.pageviews} page(s) vue(s)`,
  }))
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  // Double contrôle : le middleware filtre déjà, mais la page ne doit jamais dépendre de lui seul.
  if (!isAdminIp(getClientIp(await headers()))) notFound()

  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)

  const period = PERIODS.find((p) => p.key === one('p')) ?? PERIODS[2]
  const includeAdmin = one('self') === '1'
  const includeBots = one('bots') === '1'
  const ipParam = one('ip')
  const ip = ipParam && /^[0-9a-fA-F:.]{3,45}$/.test(ipParam) ? ipParam : null
  const page = Math.min(100000, Math.max(1, Math.floor(Number(one('page')) || 1)))

  const now = Date.now()
  const from = period.ms ? now - period.ms : firstTimestamp() ?? now - 30 * 24 * 3600 * 1000
  const f: Filters = { from, to: now + 1, includeAdmin, includeBots, ip }
  const prev: Filters | null = period.ms ? { ...f, from: from - period.ms, to: from } : null

  // Complète ville et opérateur des visites antérieures à la base locale (une fois par démarrage).
  void ensureGeoIp()
  if (geoIpReady()) backfillGeo(lookupIp)

  const summary = getSummary(f)
  const prevSummary: Summary | null = prev ? getSummary(prev) : null
  const time = getTimeData(f, period.key === '24h')
  const b = getBreakdowns(f)
  const pages = getPages(f)
  const events = getEvents(f)
  const points = getMapPoints(f)
  const sessions = getSessions(f, PAGE_SIZE, (page - 1) * PAGE_SIZE)
  const bots = getBotSessions(f)
  const live = getLiveVisitors(includeAdmin)
  const ipProfile = ip ? getIpProfile(ip) : null
  const ipNetwork = ip ? getIpNetwork(ip) : null
  const journey = ip ? getJourney(ip) : []
  const campaigns = getCampaigns(f)
  const downloads = getDownloads(f)
  const devices = getOwnerDevices()
  const ownerToken = (await cookies()).get(OWNER_COOKIE)?.value
  const ownerHash = ownerToken ? createHash('sha256').update(ownerToken).digest('hex') : null
  const currentDevice = devices.find((d) => d.token_hash === ownerHash) ?? null
  const pageCount = Math.max(1, Math.ceil(summary.sessions / PAGE_SIZE))

  const current: Record<string, string | undefined> = {
    p: period.key === '30d' ? undefined : period.key,
    self: includeAdmin ? '1' : undefined,
    bots: includeBots ? '1' : undefined,
    ip: ip ?? undefined,
    page: page > 1 ? String(page) : undefined,
  }
  const href = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, page: undefined, ...over })) if (v) q.set(k, v)
    const s = q.toString()
    return s ? `/admin?${s}` : '/admin'
  }

  const hasCities = b.cities.some((r) => r.label)
  const hasAnyData = firstTimestamp() !== null

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="mr-auto">
            <p className="font-mono text-xs text-accent">theo.marescal.fr / admin</p>
            <h1 className="font-display text-lg font-semibold">Statistiques de visite</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {live} en ligne (5 min)
          </span>
          <nav className="flex flex-wrap gap-1" aria-label="Période">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                prefetch={false}
                href={href({ p: p.key === '30d' ? undefined : p.key })}
                className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                  p.key === period.key ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <form action="/admin" method="get" className="flex gap-1.5" role="search">
            {period.key !== '30d' && <input type="hidden" name="p" value={period.key} />}
            {includeAdmin && <input type="hidden" name="self" value="1" />}
            {includeBots && <input type="hidden" name="bots" value="1" />}
            <input
              name="ip"
              defaultValue={ip ?? ''}
              placeholder="Retracer une IP…"
              aria-label="Adresse IP à retracer"
              className="w-40 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-text-primary placeholder:text-text-muted/50 focus:border-accent/60 focus:outline-none"
            />
            <button type="submit" className="rounded-md border border-border px-2.5 py-1 font-mono text-xs text-text-muted hover:text-text-primary">
              Go
            </button>
          </form>
          <div className="flex gap-2 font-mono text-xs">
            <Link
              prefetch={false}
              href={href({ self: includeAdmin ? undefined : '1' })}
              className={`rounded-md border px-2.5 py-1 ${includeAdmin ? 'border-accent/40 text-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
            >
              {includeAdmin ? '☑' : '☐'} Mes visites
            </Link>
            <Link
              prefetch={false}
              href={href({ bots: includeBots ? undefined : '1' })}
              className={`rounded-md border px-2.5 py-1 ${includeBots ? 'border-accent/40 text-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
            >
              {includeBots ? '☑' : '☐'} Robots
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {!hasAnyData && (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-text-muted">
            Aucune visite enregistrée pour l’instant. Les statistiques apparaîtront dès les premières visites du site.
          </p>
        )}

        {ip && (
          <section className="rounded-xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">
                Fiche IP <span className="font-mono text-accent">{ip}</span>
              </h2>
              <Link prefetch={false} href={href({ ip: undefined })} className="font-mono text-xs text-text-muted hover:text-text-primary">
                ✕ Retirer le filtre
              </Link>
            </div>
            {ipProfile ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                <div><dt className="text-text-muted text-xs">Première visite</dt><dd>{fmtDateTime(ipProfile.first)}</dd></div>
                <div><dt className="text-text-muted text-xs">Dernière visite</dt><dd>{fmtDateTime(ipProfile.last)}</dd></div>
                <div><dt className="text-text-muted text-xs">Visites (total)</dt><dd>{fmtNumber(ipProfile.sessions)}</dd></div>
                <div><dt className="text-text-muted text-xs">Pages vues (total)</dt><dd>{fmtNumber(ipProfile.pageviews)}</dd></div>
                <div><dt className="text-text-muted text-xs">Navigateurs distincts</dt><dd>{fmtNumber(ipProfile.visitors)}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-text-muted">Aucune visite enregistrée pour cette IP.</p>
            )}
            {ipNetwork && (
              <p className="mt-3 text-sm text-text-muted">
                Réseau : <span className="text-text-primary">{ipNetwork.as_org ?? 'inconnu'}</span>
                {ipNetwork.asn && <span className="font-mono text-xs"> (AS{ipNetwork.asn})</span>} · Localisation :{' '}
                <span className="text-text-primary">
                  {flag(ipNetwork.country_code)} {[ipNetwork.city, ipNetwork.region, countryName(ipNetwork.country_code)].filter(Boolean).join(', ')}
                </span>
                {ipNetwork.geo_source === 'country' && ' (pays seulement)'}
              </p>
            )}
          </section>
        )}

        {ip && <JourneyCard sessions={journey} />}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Visiteurs uniques" value={fmtNumber(summary.visitors)} delta={change(summary.visitors, prevSummary?.visitors)} />
          <Kpi label="Visites" value={fmtNumber(summary.sessions)} delta={change(summary.sessions, prevSummary?.sessions)} />
          <Kpi label="Pages vues" value={fmtNumber(summary.pageviews)} delta={change(summary.pageviews, prevSummary?.pageviews)} />
          <Kpi label="Durée moyenne" value={fmtDuration(summary.avgDuration)} delta={change(summary.avgDuration, prevSummary?.avgDuration)} />
          <Kpi label="Pages / visite" value={summary.sessions ? (summary.pageviews / summary.sessions).toFixed(1).replace('.', ',') : '—'} />
          <Kpi label="Taux de rebond" value={fmtPct(summary.bounceRate)} delta={change(summary.bounceRate, prevSummary?.bounceRate)} invert />
          <Kpi label="Visiteurs récurrents" value={summary.visitors ? fmtPct(summary.returningVisitors / summary.visitors) : '—'} />
          <Kpi label="Adresses IP" value={fmtNumber(summary.ips)} />
        </div>

        <Card title={`Trafic — ${period.key === '24h' ? 'par heure' : 'par jour'}`}>
          <TrafficChart data={time.series} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Heure d’arrivée (heure de Paris)">
            <ColumnChart
              values={time.byHour}
              labels={time.byHour.map((_, h) => `${h} h`)}
              labelEvery={3}
              unit="visites"
            />
          </Card>
          <Card title="Jour de la semaine">
            <ColumnChart values={time.byWeekday} labels={WEEKDAY_LABELS} unit="visites" />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Pages les plus vues">
            {pages.length === 0 ? (
              <p className="text-sm text-text-muted/70">Aucune donnée sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-text-muted/60">
                      <th className="pb-2 font-normal">Page</th>
                      <th className="pb-2 text-right font-normal">Vues</th>
                      <th className="pb-2 text-right font-normal">Visiteurs</th>
                      <th className="pb-2 text-right font-normal">Temps moyen</th>
                      <th className="pb-2 text-right font-normal">Défilement</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pages.map((p) => (
                      <tr key={p.path} className="border-t border-border/60">
                        <td className="max-w-[16rem] truncate py-1.5 pr-3 font-mono text-xs" title={p.path}>{p.path}</td>
                        <td className="py-1.5 text-right">{fmtNumber(p.pageviews)}</td>
                        <td className="py-1.5 text-right text-text-muted">{fmtNumber(p.visitors)}</td>
                        <td className="py-1.5 text-right text-text-muted">{fmtDuration(p.avgDuration)}</td>
                        <td className="py-1.5 text-right text-text-muted">{p.avgScroll == null ? '—' : `${Math.round(p.avgScroll)} %`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Pages d’entrée">
            <BarList items={toItems(b.entryPages, (l) => <span className="font-mono text-xs">{l}</span>)} valueLabel="Visiteurs" />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Sources de trafic">
            <BarList items={toItems(b.sources, (l) => l ?? 'Accès direct / inconnu')} valueLabel="Visiteurs" />
          </Card>
          <Card title="Référents détaillés">
            <BarList
              items={toItems(
                b.referrers.filter((r) => r.label),
                (l) => {
                  const url = safeHttpUrl(l)
                  return url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-accent">{l}</a>
                  ) : (
                    l
                  )
                }
              )}
              valueLabel="Visiteurs"
              empty="Aucun site référent sur la période."
            />
          </Card>
          <Card title="Campagnes (UTM)">
            <BarList items={toItems(b.campaigns.filter((r) => r.label))} valueLabel="Visiteurs" empty="Aucun lien tagué utm_… sur la période." />
          </Card>
        </div>

        <CampaignsCard rows={campaigns.rows} periodSessions={campaigns.periodSessions} periodLabel={`Sur ${period.label.toLowerCase()}`} />

        <Card title="Localisation des visiteurs">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {points.length > 0 ? (
                <VisitorMap points={points} />
              ) : (
                <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                  {summary.visitors > 0
                    ? 'Pas de coordonnées reçues : activez « Add visitor location headers » dans Cloudflare (Rules › Transform Rules › Managed Transforms) pour obtenir ville, région et position.'
                    : 'Aucune visite sur la période.'}
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-text-muted">Pays</h3>
                <BarList items={toItems(b.countries, (l) => `${flag(l)} ${countryName(l)}`)} valueLabel="Visiteurs" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-text-muted">Villes</h3>
                <BarList
                  items={toItems(b.cities.filter((r) => r.label))}
                  valueLabel="Visiteurs"
                  empty={hasCities || summary.visitors === 0 ? 'Aucune donnée sur la période.' : 'Villes indisponibles pour ces visites.'}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Réseaux et organisations (fournisseur d’accès ou entreprise propriétaire de l’IP)">
          <BarList
            items={toItems(b.organisations.filter((r) => r.label))}
            valueLabel="Visiteurs"
            empty="Aucune organisation identifiée sur la période."
          />
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Navigateurs">
            <BarList items={toItems(b.browsers)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Versions de navigateur">
            <BarList items={toItems(b.browserVersions)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Systèmes d’exploitation">
            <BarList items={toItems(b.os)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Types d’appareil">
            <BarList items={toItems(b.deviceTypes, deviceLabel)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Modèles d’appareil">
            <BarList items={toItems(b.deviceModels.filter((r) => r.label))} valueLabel="Visiteurs" empty="Aucun modèle identifié (ordinateurs non concernés)." />
          </Card>
          <Card title="Résolutions d’écran">
            <BarList items={toItems(b.screens)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Langues du navigateur">
            <BarList items={toItems(b.languages)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Fuseaux horaires">
            <BarList items={toItems(b.timezones)} valueLabel="Visiteurs" />
          </Card>
          <Card title="Moteur, thème, saisie, réseau">
            <div className="space-y-4">
              <BarList items={toItems(b.engines)} valueLabel="Moteur de rendu" />
              <BarList items={toItems(b.colorSchemes, (l) => (l === 'dark' ? 'Thème sombre' : l === 'light' ? 'Thème clair' : 'Inconnu'))} valueLabel="Thème système" />
              <BarList items={toItems(b.touch)} valueLabel="Saisie" />
              <BarList items={toItems(b.connections, (l) => (l ? `Réseau ${l}` : 'Inconnu (hors Chromium)'))} valueLabel="Débit estimé" />
            </div>
          </Card>
        </div>

        <Card title="Clics suivis sur le site (documents, liens externes, e-mail)">
          {events.length === 0 ? (
            <p className="text-sm text-text-muted/70">Aucun clic suivi sur la période (rapports PDF, CV, liens externes, e-mail).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-text-muted/60">
                    <th className="pb-2 font-normal">Type</th>
                    <th className="pb-2 font-normal">Libellé</th>
                    <th className="pb-2 font-normal">Cible</th>
                    <th className="pb-2 text-right font-normal">Clics</th>
                    <th className="pb-2 text-right font-normal">Visites</th>
                  </tr>
                </thead>
                <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {events.map((e) => (
                    <tr key={`${e.kind}-${e.target}`} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-text-muted">{EVENT_LABELS[e.kind] ?? e.kind}</td>
                      <td className="max-w-[14rem] truncate py-1.5 pr-3" title={e.label ?? ''}>{e.label || '—'}</td>
                      <td className="max-w-[20rem] truncate py-1.5 pr-3 font-mono text-xs text-text-muted" title={e.target}>{e.target}</td>
                      <td className="py-1.5 text-right">{fmtNumber(e.clicks)}</td>
                      <td className="py-1.5 text-right text-text-muted">{fmtNumber(e.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <DownloadsCard files={downloads.files} log={downloads.log} ipHref={(v) => href({ ip: v })} />

        <Card title={`Journal des visites (${fmtNumber(summary.sessions)})`}>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-muted/70">Aucune visite sur la période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-text-muted/60">
                    <th className="pb-2 pr-3 font-normal">Début</th>
                    <th className="pb-2 pr-3 font-normal">Visiteur</th>
                    <th className="pb-2 pr-3 font-normal">Localisation</th>
                    <th className="pb-2 pr-3 font-normal">Appareil</th>
                    <th className="pb-2 pr-3 font-normal">Source</th>
                    <th className="pb-2 pr-3 font-normal">Parcours</th>
                    <th className="pb-2 text-right font-normal">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const returning = s.first_seen < s.start
                    const refUrl = safeHttpUrl(s.referrer)
                    return (
                      <tr key={s.session_id} className="border-t border-border/60 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-text-muted">{fmtDateTime(s.start)}</td>
                        <td className="py-2 pr-3">
                          {s.ip ? (
                            <Link prefetch={false} href={href({ ip: s.ip })} className="font-mono text-xs text-accent hover:underline">{s.ip}</Link>
                          ) : (
                            <span className="text-text-muted">IP inconnue</span>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.is_admin === 1 && <span className="rounded bg-accent/15 px-1.5 text-[10px] text-accent">Vous</span>}
                            {s.is_bot === 1 && <span className="rounded bg-amber-500/15 px-1.5 text-[10px] text-amber-400">Robot</span>}
                            <span className="rounded bg-white/5 px-1.5 text-[10px] text-text-muted">{returning ? 'Récurrent' : 'Nouveau'}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="mr-1">{flag(s.country_code)}</span>
                          {s.city ? `${s.city}${s.postal_code ? ` (${s.postal_code})` : ''}` : countryName(s.country_code)}
                          {s.city && <div className="text-xs text-text-muted">{[s.region, countryName(s.country_code)].filter(Boolean).join(', ')}</div>}
                          {s.as_org && <div className="max-w-[12rem] truncate text-[11px] text-text-muted" title={`${s.as_org}${s.asn ? ` (AS${s.asn})` : ''}`}>{s.as_org}</div>}
                        </td>
                        <td className="py-2 pr-3">
                          <div>{[s.browser, s.browser_version?.split('.')[0]].filter(Boolean).join(' ') || '—'}</div>
                          <div className="text-xs text-text-muted">
                            {[s.os, s.os_version].filter(Boolean).join(' ') || 'OS inconnu'} · {deviceLabel(s.device_type)}
                            {(s.device_vendor || s.device_model) && ` · ${[s.device_vendor, s.device_model].filter(Boolean).join(' ')}`}
                          </div>
                          <details className="mt-1 text-xs text-text-muted">
                            <summary className="cursor-pointer select-none text-text-muted/70 hover:text-text-primary">Détails</summary>
                            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                              <dt>Écran</dt><dd>{s.screen_w ? `${s.screen_w} × ${s.screen_h}${s.dpr ? ` @${s.dpr}x` : ''}` : '—'}</dd>
                              <dt>Fenêtre</dt><dd>{s.viewport_w ? `${s.viewport_w} × ${s.viewport_h}` : '—'}</dd>
                              <dt>Langue</dt><dd>{s.language ?? '—'}</dd>
                              <dt>Accept-Lang.</dt><dd className="break-all">{s.accept_language ?? '—'}</dd>
                              <dt>Fuseau</dt><dd>{s.timezone ?? '—'}</dd>
                              <dt>Archi.</dt><dd>{s.cpu_arch ?? '—'}</dd>
                              <dt>Réseau</dt><dd>{s.connection ?? '—'}</dd>
                              <dt>User-Agent</dt><dd className="break-all font-mono text-[10px]">{s.user_agent ?? '—'}</dd>
                            </dl>
                          </details>
                        </td>
                        <td className="max-w-[12rem] py-2 pr-3">
                          {refUrl ? (
                            <a href={refUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-xs hover:text-accent" title={s.referrer ?? ''}>
                              {s.referrer_host}
                            </a>
                          ) : (
                            <span className="text-xs text-text-muted">Direct</span>
                          )}
                          {s.utm_source && <div className="text-[10px] text-text-muted">utm : {s.utm_source}</div>}
                          {s.campaign && <span className="mt-1 inline-block rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-400">{s.campaign}</span>}
                        </td>
                        <td className="max-w-[18rem] py-2 pr-3">
                          <div className="text-xs text-text-muted">
                            {s.pages} page{s.pages > 1 ? 's' : ''}
                            {s.events > 0 && ` · ${s.events} clic${s.events > 1 ? 's' : ''}`}
                          </div>
                          <div className="break-words font-mono text-[11px]" title={s.route}>{s.route}</div>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{fmtDuration(s.end_ts - s.start)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="mt-4 flex items-center justify-between font-mono text-xs text-text-muted" aria-label="Pagination">
              {page > 1 ? (
                <Link prefetch={false} href={href({ page: page > 2 ? String(page - 1) : undefined })} className="hover:text-text-primary">← Plus récentes</Link>
              ) : <span />}
              <span>Page {page} / {pageCount}</span>
              {page < pageCount ? (
                <Link prefetch={false} href={href({ page: String(page + 1) })} className="hover:text-text-primary">Plus anciennes →</Link>
              ) : <span />}
            </nav>
          )}
        </Card>

        <DevicesCard devices={devices} currentRegistered={!!currentDevice} currentLabel={currentDevice?.label ?? null} />

        <p className="pb-6 text-center font-mono text-[11px] text-text-muted/60">
          {includeBots ? 'Robots inclus' : `${fmtNumber(bots)} visite(s) de robots exclue(s)`} ·{' '}
          {includeAdmin ? 'vos visites incluses' : 'vos visites exclues'} · données conservées 13 mois · géolocalisation :
          Cloudflare et{' '}
          <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-text-primary">
            IP Geolocation by DB-IP
          </a>
        </p>
      </div>
    </main>
  )
}
