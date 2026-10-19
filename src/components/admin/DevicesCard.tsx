import type { OwnerDevice } from '@/lib/analytics/queries'
import { fmtDateTime } from '@/lib/analytics/format'
import { registerDevice, revokeDevice } from '@/app/admin/actions'

interface Props {
  devices: OwnerDevice[]
  currentRegistered: boolean
  currentLabel: string | null
}

export default function DevicesCard({ devices, currentRegistered, currentLabel }: Props) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-display text-base font-semibold text-text-primary">Mes appareils</h2>
      <p className="mb-4 text-xs text-text-muted">
        Un appareil enregistré n’est plus jamais compté (visites, documents), même hors de chez toi. Enregistre-le
        depuis le navigateur que tu utilises sur cet appareil ; il faudra recommencer si tu effaces ses cookies.
      </p>

      <div className="mb-4 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
        {currentRegistered ? (
          <p className="text-emerald-400">✓ Cet appareil est enregistré{currentLabel ? ` (« ${currentLabel} »)` : ''} : tes visites ne sont pas comptées.</p>
        ) : (
          <form action={registerDevice} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-text-muted">Cet appareil n’est pas enregistré.</span>
            <input
              name="label"
              maxLength={60}
              placeholder="Nom (ex. Mac, iPhone)"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-accent/60 focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-accent px-4 py-1.5 font-mono text-xs font-medium text-white hover:bg-accent/90">
              Enregistrer cet appareil
            </button>
          </form>
        )}
      </div>

      {devices.length > 0 && (
        <ul className="divide-y divide-border/60 text-sm">
          {devices.map((d) => (
            <li key={d.token_hash} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-text-primary">{d.label}</p>
                <p className="truncate font-mono text-[10px] text-text-muted" title={d.user_agent ?? ''}>
                  Enregistré le {fmtDateTime(d.created_at)} · vu le {d.last_seen ? fmtDateTime(d.last_seen) : '—'}
                </p>
              </div>
              <form action={revokeDevice}>
                <input type="hidden" name="id" value={d.token_hash} />
                <button type="submit" className="font-mono text-[11px] text-text-muted/60 hover:text-rose-400">
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
