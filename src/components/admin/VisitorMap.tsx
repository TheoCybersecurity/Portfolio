'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '@/lib/analytics/queries'
import { countryName } from '@/lib/analytics/format'

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export default function VisitorMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: import('leaflet').Map | null = null
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !el.current) return
      map = L.map(el.current, { worldCopyJump: true, scrollWheelZoom: false }).setView([46.6, 2.5], 5)
      // Tuiles OpenStreetMap standard (sans clé d'API), assombries par CSS via `className`.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        className: 'map-tiles-dark',
      }).addTo(map)

      const max = Math.max(1, ...points.map((p) => p.visitors))
      const bounds: [number, number][] = []
      for (const p of points) {
        const place = [p.city, p.region, countryName(p.country_code)].filter(Boolean).join(', ')
        const country = p.precision === 'country'
        // Pays seul : anneau en pointillés, sans remplissage, pour ne pas le confondre avec une ville.
        L.circleMarker([p.lat, p.lon], {
          radius: 5 + 13 * Math.sqrt(p.visitors / max),
          color: country ? '#3B82F6' : '#1C2333',
          weight: 2,
          dashArray: country ? '4 3' : undefined,
          fillColor: '#3B82F6',
          fillOpacity: country ? 0.12 : 0.75,
        })
          .bindTooltip(
            `<strong>${escapeHtml(place)}</strong>${country ? ' <em>(ville inconnue)</em>' : ''}<br>${p.visitors} visiteur${p.visitors > 1 ? 's' : ''} · ${p.pageviews} page${p.pageviews > 1 ? 's' : ''} vue${p.pageviews > 1 ? 's' : ''}`
          )
          .addTo(map)
        bounds.push([p.lat, p.lon])
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 })
      else if (bounds.length === 1) map.setView(bounds[0], 7)
    })

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [points])

  // `isolate` confine les z-index internes de Leaflet (jusqu'à 1000) sous l'en-tête collant.
  return (
    <div>
      <div ref={el} className="isolate h-80 w-full rounded-lg overflow-hidden bg-background" />
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /> Ville connue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-[#3B82F6]" /> Pays seulement (centre du pays)
        </span>
        <span>Taille = nombre de visiteurs</span>
      </div>
    </div>
  )
}
