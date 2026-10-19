import Link from 'next/link'
import type { DownloadFileRow, DownloadRow } from '@/lib/analytics/queries'
import { countryName, deviceLabel, flag, fmtDateTime, fmtNumber, safeHttpUrl } from '@/lib/analytics/format'

interface Props {
  files: DownloadFileRow[]
  log: DownloadRow[]
  ipHref: (ip: string) => string
}

const fileName = (f: string) => f.split('/').pop() ?? f

export default function DownloadsCard({ files, log, ipHref }: Props) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-text-primary">Ouvertures des documents PDF</h2>
        <p className="text-xs text-text-muted">
          Journal côté serveur : compte aussi les ouvertures par lien direct, sans passer par le site.
        </p>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-text-muted/70">Aucun document ouvert sur la période.</p>
      ) : (
        <>
          <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => (
              <div key={f.file} className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
                <p className="truncate font-mono text-xs text-text-primary" title={f.file}>
                  {fileName(f.file)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  <span className="text-text-primary">{fmtNumber(f.opens)}</span> ouverture{f.opens > 1 ? 's' : ''} ·{' '}
                  {fmtNumber(f.visitors)} visiteur{f.visitors > 1 ? 's' : ''} · dernière le {fmtDateTime(f.last_ts)}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-text-muted/60">
                  <th className="pb-2 pr-3 font-normal">Date</th>
                  <th className="pb-2 pr-3 font-normal">Document</th>
                  <th className="pb-2 pr-3 font-normal">Visiteur</th>
                  <th className="pb-2 pr-3 font-normal">Réseau / organisation</th>
                  <th className="pb-2 pr-3 font-normal">Localisation</th>
                  <th className="pb-2 pr-3 font-normal">Appareil</th>
                  <th className="pb-2 font-normal">Provenance</th>
                </tr>
              </thead>
              <tbody>
                {log.map((d) => {
                  const ref = safeHttpUrl(d.referrer)
                  return (
                    <tr key={d.id} className="border-t border-border/60 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-text-muted">{fmtDateTime(d.ts)}</td>
                      <td className="max-w-[14rem] truncate py-2 pr-3 font-mono text-xs" title={d.file}>{fileName(d.file)}</td>
                      <td className="py-2 pr-3">
                        {d.ip ? (
                          <Link prefetch={false} href={ipHref(d.ip)} className="font-mono text-xs text-accent hover:underline">
                            {d.ip}
                          </Link>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {d.is_admin === 1 && <span className="rounded bg-accent/15 px-1.5 text-[10px] text-accent">Vous</span>}
                          {d.is_bot === 1 && <span className="rounded bg-amber-500/15 px-1.5 text-[10px] text-amber-400">Robot</span>}
                          <span className="rounded bg-white/5 px-1.5 text-[10px] text-text-muted">
                            {d.session_id ? 'Pendant une visite' : 'Lien direct'}
                          </span>
                          {d.campaign && <span className="rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-400">{d.campaign}</span>}
                        </div>
                      </td>
                      <td className="max-w-[14rem] py-2 pr-3 text-xs">
                        {d.as_org ?? <span className="text-text-muted">Inconnu</span>}
                        {d.asn && <div className="font-mono text-[10px] text-text-muted">AS{d.asn}</div>}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <span className="mr-1">{flag(d.country_code)}</span>
                        {d.city ? `${d.city}${d.postal_code ? ` (${d.postal_code})` : ''}` : countryName(d.country_code)}
                        {d.city && <div className="text-text-muted">{[d.region, countryName(d.country_code)].filter(Boolean).join(', ')}</div>}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {[d.browser, d.browser_version?.split('.')[0]].filter(Boolean).join(' ') || '—'}
                        <div className="text-text-muted">
                          {[d.os, d.os_version].filter(Boolean).join(' ') || 'OS inconnu'} · {deviceLabel(d.device_type)}
                          {(d.device_vendor || d.device_model) && ` · ${[d.device_vendor, d.device_model].filter(Boolean).join(' ')}`}
                        </div>
                        <details className="mt-1 text-text-muted">
                          <summary className="cursor-pointer select-none text-text-muted/70 hover:text-text-primary">Détails</summary>
                          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                            <dt>Langues</dt><dd className="break-all">{d.accept_language ?? '—'}</dd>
                            <dt>User-Agent</dt><dd className="break-all font-mono text-[10px]">{d.user_agent ?? '—'}</dd>
                          </dl>
                        </details>
                      </td>
                      <td className="max-w-[14rem] py-2 text-xs">
                        {ref ? (
                          <a href={ref} target="_blank" rel="noopener noreferrer nofollow" className="break-all hover:text-accent">
                            {d.referrer}
                          </a>
                        ) : (
                          <span className="text-text-muted">Aucune (lien ouvert directement)</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
