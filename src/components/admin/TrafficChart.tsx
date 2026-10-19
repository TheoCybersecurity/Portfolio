'use client'

import { useEffect, useRef, useState } from 'react'
import type { TimePoint } from '@/lib/analytics/queries'
import { fmtNumber } from '@/lib/analytics/format'

// Palette validée (validate_palette.js, mode sombre, surface #1C2333) : toutes vérifications OK.
const SERIES = [
  { key: 'visitors', label: 'Visiteurs', color: '#3B82F6' },
  { key: 'pageviews', label: 'Pages vues', color: '#d95926' },
] as const

const H = 280
const M = { t: 12, r: 12, b: 30, l: 44 }

const TICK_COUNT = 4

/** Maximum de l'axe = 4 × un pas « rond » et entier (1, 2, 5, 10, 20…), pour des graduations entières. */
function niceMax(v: number): number {
  const raw = Math.max(1, v / TICK_COUNT)
  const exp = 10 ** Math.floor(Math.log10(raw))
  const f = raw / exp
  const step = Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp)
  return step * TICK_COUNT
}

export default function TrafficChart({ data }: { data: TimePoint[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const iw = Math.max(10, width - M.l - M.r)
  const ih = H - M.t - M.b
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.visitors, d.pageviews))))
  const x = (i: number) => (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => ih - (v / max) * ih
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (i * max) / TICK_COUNT)
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 70))))

  const line = (key: 'visitors' | 'pageviews') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('')
  const area = `${line('visitors')}L${x(data.length - 1)},${ih}L${x(0)},${ih}Z`

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = data.length <= 1 ? 0 : Math.round((px / iw) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  const totals = {
    visitors: data.reduce((s, d) => s + d.visitors, 0),
    pageviews: data.reduce((s, d) => s + d.pageviews, 0),
  }
  const h = hover !== null ? data[hover] : null
  const tipLeft = hover !== null ? Math.min(Math.max(M.l + x(hover), 90), width - 90) : 0

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs font-mono text-text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="text-text-primary">{fmtNumber(totals[s.key])}</span>
          </span>
        ))}
        <span className="text-text-muted/60">(visiteurs : uniques par tranche, non cumulables)</span>
      </div>

      <div ref={wrap} className="relative w-full">
        <svg width={width} height={H} role="img" aria-label="Évolution des visiteurs et des pages vues">
          <g transform={`translate(${M.l},${M.t})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#334155' : '#1E293B'} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted" fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNumber(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <text key={d.key} x={x(i)} y={ih + 18} textAnchor="middle" className="fill-text-muted" fontSize={11}>
                  {d.label}
                </text>
              ) : null
            )}

            <path d={area} fill="#3B82F6" opacity={0.12} />
            <path d={line('pageviews')} fill="none" stroke="#d95926" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={line('visitors')} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {h && hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={ih} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3" />
                {SERIES.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r={4.5} fill={s.color} stroke="#1C2333" strokeWidth={2} />
                ))}
              </g>
            )}

            <rect
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        </svg>

        {h && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="font-mono text-text-muted mb-1">{h.label}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-text-primary">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label} : <span className="font-semibold">{fmtNumber(h[s.key])}</span>
              </p>
            ))}
            <p className="text-text-muted mt-0.5">Visites : {fmtNumber(h.sessions)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
