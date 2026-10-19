import type { ReactNode } from 'react'
import { fmtNumber } from '@/lib/analytics/format'

export interface BarItem {
  key: string
  label: ReactNode
  value: number
  /** Détail affiché au survol (infobulle native). */
  detail?: string
}

interface Props {
  items: BarItem[]
  valueLabel: string
  empty?: string
}

export default function BarList({ items, valueLabel, empty = 'Aucune donnée sur la période.' }: Props) {
  if (items.length === 0) return <p className="text-sm text-text-muted/70 py-2">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  const total = items.reduce((s, i) => s + i.value, 0)

  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-text-muted/60 mb-2">
        <span />
        <span>{valueLabel}</span>
      </div>
      <ul className="space-y-[2px]">
        {items.map((item) => (
          <li key={item.key} title={item.detail} className="relative flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-white/[0.03]">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-[4px] bg-[#3B82F6]/15"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
            <span className="relative min-w-0 truncate text-text-primary">{item.label}</span>
            <span className="relative shrink-0 font-mono text-xs text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtNumber(item.value)}
              <span className="ml-2 inline-block w-9 text-right text-text-muted/60">
                {total > 0 ? `${Math.round((item.value / total) * 100)}%` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
