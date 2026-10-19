import type { JourneySession } from '@/lib/analytics/queries'
import { fmtDateTime, fmtDuration, safeHttpUrl } from '@/lib/analytics/format'

const time = (ts: number) => fmtDateTime(ts).split(' ')[1] ?? ''
const fileName = (f: string) => f.split('/').pop() ?? f
const CLICK_LABELS: Record<string, string> = { download: 'Clic sur un document', outbound: 'Lien sortant', mailto: 'E-mail', tel: 'Téléphone' }

/** Parcours complet d'une IP, toutes périodes confondues, regroupé par visite. */
export default function JourneyCard({ sessions }: { sessions: JourneySession[] }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-display text-base font-semibold text-text-primary">Parcours complet</h2>
      <p className="mb-4 text-xs text-text-muted">Toutes les visites de cette IP depuis le début, de la plus récente à la plus ancienne.</p>

      {sessions.length === 0 ? (
        <p className="text-sm text-text-muted/70">Aucune activité enregistrée.</p>
      ) : (
        <ol className="space-y-5">
          {sessions.map((s) => (
            <li key={s.session_id} className="rounded-lg border border-border/70 bg-background/30 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs text-accent">{fmtDateTime(s.start)}</p>
                <p className="text-xs text-text-muted">
                  {s.device} · {s.location}
                </p>
              </div>
              <ul className="space-y-1.5 border-l border-border pl-4">
                {s.items.map((it, i) => (
                  <li key={i} className="relative text-sm">
                    <span
                      className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full ${
                        it.kind === 'pdf' ? 'bg-amber-400' : it.kind === 'click' ? 'bg-emerald-400' : 'bg-[#3B82F6]'
                      }`}
                    />
                    <span className="mr-2 font-mono text-[11px] text-text-muted">{time(it.ts)}</span>
                    {it.kind === 'page' && (
                      <>
                        <span className="font-mono text-xs text-text-primary">{it.path}</span>
                        <span className="ml-2 text-xs text-text-muted">
                          {[
                            it.duration_ms != null ? fmtDuration(it.duration_ms) : null,
                            it.scroll_pct != null ? `lu à ${it.scroll_pct} %` : null,
                            it.campaign ? `campagne ${it.campaign}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {safeHttpUrl(it.referrer) && <span className="ml-2 text-xs text-text-muted">depuis {new URL(it.referrer!).host}</span>}
                      </>
                    )}
                    {it.kind === 'click' && (
                      <span className="text-xs">
                        <span className="text-emerald-400">{CLICK_LABELS[it.type] ?? it.type}</span>{' '}
                        <span className="text-text-muted">{it.label || it.target}</span>
                      </span>
                    )}
                    {it.kind === 'pdf' && (
                      <span className="text-xs">
                        <span className="text-amber-400">PDF ouvert</span>{' '}
                        <span className="font-mono text-text-primary">{fileName(it.file)}</span>
                        {!it.session_id && <span className="text-text-muted"> (lien direct, hors visite du site)</span>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
