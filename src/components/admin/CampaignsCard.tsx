import type { ReactNode } from 'react'
import type { CampaignRow } from '@/lib/analytics/queries'
import { fmtDateTime, fmtNumber } from '@/lib/analytics/format'
import { SITE_URL } from '@/lib/site'
import { archiveCampaign, createCampaign, deleteCampaignForever, restoreCampaign } from '@/app/admin/actions'
import { campaignTargets } from '@/app/admin/targets'
import CopyButton from './CopyButton'
import ConfirmSubmit from './ConfirmSubmit'

interface Props {
  rows: CampaignRow[]
  periodSessions: number
  periodLabel: string
}

const campaignLink = (slug: string, target: string) => `${SITE_URL}${target}?c=${slug}`
const day = (ts: number) => fmtDateTime(ts).split(' ')[0]

function CampaignTable({
  rows,
  periodSessions,
  targetLabel,
  actions,
}: {
  rows: CampaignRow[]
  periodSessions: number
  targetLabel: (p: string) => string
  actions: (r: CampaignRow) => ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-text-muted/60">
            <th className="pb-2 pr-3 font-normal">Campagne</th>
            <th className="pb-2 pr-3 font-normal">Lien</th>
            <th className="pb-2 pr-3 text-right font-normal">Visites</th>
            <th className="pb-2 pr-3 font-normal">Part des visites</th>
            <th className="pb-2 pr-3 text-right font-normal">Visiteurs</th>
            <th className="pb-2 pr-3 text-right font-normal">Pages</th>
            <th className="pb-2 pr-3 text-right font-normal">PDF ouverts</th>
            <th className="pb-2 pr-3 font-normal">Dernière visite</th>
            <th className="pb-2 font-normal" />
          </tr>
        </thead>
        <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
          {rows.map((r) => {
            const link = campaignLink(r.slug, r.target_path)
            const share = periodSessions ? r.sessions / periodSessions : 0
            return (
              <tr key={r.slug} className="border-t border-border/60 align-top">
                <td className="py-2 pr-3">
                  <div className="text-text-primary">{r.name}</div>
                  <div className="text-[11px] text-text-muted">
                    {targetLabel(r.target_path)} · créée le {day(r.created_at)}
                    {r.archived_at && ` · archivée le ${day(r.archived_at)}`}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <code className="max-w-[17rem] truncate font-mono text-[11px] text-accent" title={link}>
                      {link.replace(/^https:\/\//, '')}
                    </code>
                    <CopyButton value={link} />
                  </div>
                </td>
                <td className="py-2 pr-3 text-right">
                  {fmtNumber(r.sessions)}
                  <div className="text-[10px] text-text-muted">{fmtNumber(r.total_sessions)} au total</div>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className="font-mono text-xs text-text-muted">{Math.round(share * 100)} %</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right text-text-muted">{fmtNumber(r.visitors)}</td>
                <td className="py-2 pr-3 text-right text-text-muted">{fmtNumber(r.pageviews)}</td>
                <td className="py-2 pr-3 text-right text-text-muted">{fmtNumber(r.downloads)}</td>
                <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-text-muted">
                  {r.last_ts ? fmtDateTime(r.last_ts) : '—'}
                </td>
                <td className="py-2 text-right whitespace-nowrap">{actions(r)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const actionBtn = 'font-mono text-[11px] text-text-muted/60 transition-colors'

export default function CampaignsCard({ rows, periodSessions, periodLabel }: Props) {
  const targets = campaignTargets()
  const targetLabel = (p: string) => targets.find((t) => t.path === p)?.label ?? p
  const active = rows.filter((r) => r.archived_at === null)
  const archived = rows.filter((r) => r.archived_at !== null)
  const campaignSessions = rows.reduce((s, r) => s + r.sessions, 0)

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-text-primary">Campagnes</h2>
        <p className="text-xs text-text-muted">
          Un lien par usage (CV, candidature, signature…) : chaque visite arrivée par ce lien lui est attribuée.
        </p>
      </div>

      <form action={createCampaign} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Nom de la campagne (ex. CV — candidature Thales)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-accent/60 focus:outline-none"
        />
        <select
          name="target"
          defaultValue="/"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-accent/60 focus:outline-none sm:max-w-[16rem]"
          aria-label="Page de destination"
        >
          {targets.map((t) => (
            <option key={t.path} value={t.path}>
              {t.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-mono text-xs font-medium text-white hover:bg-accent/90">
          Créer le lien
        </button>
      </form>

      {rows.length > 0 && (
        <p className="mb-2 font-mono text-[11px] text-text-muted">
          {periodLabel} : {fmtNumber(campaignSessions)} visite{campaignSessions > 1 ? 's' : ''} via une campagne sur{' '}
          {fmtNumber(periodSessions)} ({periodSessions ? Math.round((campaignSessions / periodSessions) * 100) : 0} %)
        </p>
      )}

      {active.length === 0 ? (
        <p className="text-sm text-text-muted/70">Aucune campagne active.</p>
      ) : (
        <CampaignTable
          rows={active}
          periodSessions={periodSessions}
          targetLabel={targetLabel}
          actions={(r) => (
            <form action={archiveCampaign}>
              <input type="hidden" name="slug" value={r.slug} />
              <button type="submit" className={`${actionBtn} hover:text-rose-400`} title="Déplacer dans les archives (résultats conservés)">
                Supprimer
              </button>
            </form>
          )}
        />
      )}

      {archived.length > 0 && (
        <details className="mt-5 rounded-lg border border-border/70 bg-background/30 px-4 py-3">
          <summary className="cursor-pointer select-none font-mono text-xs text-text-muted hover:text-text-primary">
            Archives ({archived.length}) — résultats conservés, le lien reste compté s’il est encore utilisé
          </summary>
          <div className="mt-3">
            <CampaignTable
              rows={archived}
              periodSessions={periodSessions}
              targetLabel={targetLabel}
              actions={(r) => (
                <div className="flex justify-end gap-3">
                  <form action={restoreCampaign}>
                    <input type="hidden" name="slug" value={r.slug} />
                    <button type="submit" className={`${actionBtn} hover:text-text-primary`}>
                      Restaurer
                    </button>
                  </form>
                  <form action={deleteCampaignForever}>
                    <input type="hidden" name="slug" value={r.slug} />
                    <ConfirmSubmit
                      message={`Supprimer définitivement « ${r.name} » et toutes ses statistiques ? Cette action est irréversible.`}
                      className={`${actionBtn} hover:text-rose-400`}
                    >
                      Supprimer définitivement
                    </ConfirmSubmit>
                  </form>
                </div>
              )}
            />
          </div>
        </details>
      )}
    </section>
  )
}
