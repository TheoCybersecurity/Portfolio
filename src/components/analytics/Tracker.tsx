'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { CHOICE_EVENT, statsAllowed, type StatsChoice } from '@/lib/analytics/consent'

// Aucun cookie : l'identification visiteur/session est faite côté serveur. Seul le choix
// du visiteur (accepter / refuser) est mémorisé dans son navigateur.

type HighEntropyNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<Record<string, unknown>> }
  connection?: { effectiveType?: string }
}

let hintsPromise: Promise<Record<string, unknown> | null> | null = null

function getHints(): Promise<Record<string, unknown> | null> {
  if (!hintsPromise) {
    const nav = navigator as HighEntropyNavigator
    hintsPromise = nav.userAgentData
      ? Promise.race([
          nav.userAgentData
            .getHighEntropyValues(['platform', 'platformVersion', 'model', 'architecture', 'bitness', 'fullVersionList'])
            .catch(() => null),
          new Promise<null>((r) => setTimeout(() => r(null), 400)),
        ])
      : Promise.resolve(null)
  }
  return hintsPromise
}

function send(payload: object) {
  const body = JSON.stringify(payload)
  if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'text/plain' }))) {
    fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {})
  }
}

const isPrivatePath = (p: string) => p.startsWith('/admin')

export default function Tracker() {
  const pathname = usePathname()
  const tokenRef = useRef<string | null>(null)
  const firstLoad = useRef(true)
  const allowedRef = useRef(true)

  // Refus en cours de visite : on arrête tout et on demande l'effacement des données déjà envoyées.
  useEffect(() => {
    allowedRef.current = statsAllowed()
    const onChoice = (e: Event) => {
      const choice = (e as CustomEvent<StatsChoice>).detail
      allowedRef.current = choice === 'accepted' && statsAllowed()
      if (choice === 'refused') {
        tokenRef.current = null
        send({ type: 'optout' })
      }
    }
    window.addEventListener(CHOICE_EVENT, onChoice)
    return () => window.removeEventListener(CHOICE_EVENT, onChoice)
  }, [])

  // Vue de page + temps passé et défilement maximal, envoyés en quittant la page.
  useEffect(() => {
    if (!pathname || isPrivatePath(pathname) || !statsAllowed()) return

    const start = Date.now()
    let maxScroll = 0
    let token: string | null = null
    let closed = false
    const referrer = firstLoad.current ? document.referrer : ''
    firstLoad.current = false

    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const pct = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100
      if (pct > maxScroll) maxScroll = Math.min(100, pct)
    }

    const flush = () => {
      if (token && allowedRef.current) send({ type: 'leave', t: token, duration: Date.now() - start, scroll: maxScroll })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    getHints().then((uaData) => {
      if (closed) return
      const nav = navigator as HighEntropyNavigator
      fetch('/api/track', {
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          type: 'pageview',
          path: pathname,
          query: window.location.search,
          referrer,
          language: navigator.language,
          languages: navigator.languages?.join(','),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenW: screen.width,
          screenH: screen.height,
          viewportW: window.innerWidth,
          viewportH: window.innerHeight,
          dpr: window.devicePixelRatio,
          colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          touch: navigator.maxTouchPoints > 0,
          connection: nav.connection?.effectiveType,
          webdriver: navigator.webdriver === true,
          uaData,
        }),
      })
        .finally(() => {
          // Lien de campagne (?c=…) : retiré de l'adresse une fois compté, pour qu'un repartage ne soit pas attribué.
          const url = new URL(window.location.href)
          if (url.searchParams.has('c')) {
            url.searchParams.delete('c')
            window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
          }
        })
        .then((r) => (r.ok && r.status === 200 ? r.json() : null))
        .then((d: { t?: string } | null) => {
          if (d?.t && allowedRef.current) {
            token = d.t
            tokenRef.current = d.t
          }
        })
        .catch(() => {})
    })

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)

    return () => {
      closed = true
      flush()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [pathname])

  // Téléchargements (PDF…), liens sortants, mailto/tel.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || !tokenRef.current || !allowedRef.current || isPrivatePath(window.location.pathname)) return
      const href = a.getAttribute('href')
      if (!href) return

      let kind: string | null = null
      if (href.startsWith('mailto:')) kind = 'mailto'
      else if (href.startsWith('tel:')) kind = 'tel'
      else {
        let url: URL
        try {
          url = new URL(href, window.location.href)
        } catch {
          return
        }
        if (a.hasAttribute('download') || /\.(pdf|zip|docx?|pptx?|xlsx?)$/i.test(url.pathname)) kind = 'download'
        else if (url.host !== window.location.host) kind = 'outbound'
      }
      if (!kind) return

      const label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim()
      send({ type: 'event', t: tokenRef.current, kind, target: href, label })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
