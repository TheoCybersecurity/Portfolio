'use client'

import { useState } from 'react'
import { fmtNumber } from '@/lib/analytics/format'

interface Props {
  values: number[]
  labels: string[]
  /** Libellé d'axe affiché une barre sur `labelEvery`. */
  labelEvery?: number
  unit: string
}

export default function ColumnChart({ values, labels, labelEvery = 1, unit }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...values)

  return (
    <div className="relative">
      <div className="flex h-36 items-end gap-[2px] border-b border-slate-700" role="img" aria-label={`Répartition des ${unit}`}>
        {values.map((v, i) => (
          <div
            key={i}
            className="relative flex h-full flex-1 items-end"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <div
              className="w-full rounded-t-[4px] transition-opacity"
              style={{
                height: `${(v / max) * 100}%`,
                minHeight: v > 0 ? 2 : 0,
                background: '#3B82F6',
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background/95 px-2 py-1 text-xs text-text-primary shadow-lg">
                {labels[i]} · <span className="font-semibold">{fmtNumber(v)}</span> {unit}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 whitespace-nowrap text-center font-mono text-[10px] text-text-muted">
            {i % labelEvery === 0 ? l : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
