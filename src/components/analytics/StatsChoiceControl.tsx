'use client'

import { useEffect, useState } from 'react'
import { CHOICE_EVENT, getChoice, hasGpc, setChoice, type StatsChoice } from '@/lib/analytics/consent'

export default function StatsChoiceControl() {
  const [choice, setLocal] = useState<StatsChoice | null>(null)
  const [gpc, setGpc] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLocal(getChoice())
    setGpc(hasGpc())
    setReady(true)
    const onChange = (e: Event) => setLocal((e as CustomEvent<StatsChoice>).detail)
    window.addEventListener(CHOICE_EVENT, onChange)
    return () => window.removeEventListener(CHOICE_EVENT, onChange)
  }, [])

  if (!ready) return <div className="h-24" />

  const status = gpc
    ? 'Votre navigateur envoie le signal Global Privacy Control : aucune statistique n’est collectée.'
    : choice === 'refused'
      ? 'Vous avez refusé : aucune statistique n’est collectée lors de vos visites.'
      : choice === 'accepted'
        ? 'Vous avez accepté la collecte de statistiques de visite.'
        : 'Vous n’avez pas encore fait de choix : les statistiques sont collectées tant que vous ne vous y opposez pas.'

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm font-body text-text-primary" role="status">{status}</p>
      {!gpc && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setChoice('accepted')}
            disabled={choice === 'accepted'}
            className="rounded-lg bg-accent px-4 py-2 font-mono text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-default transition"
          >
            Accepter les statistiques
          </button>
          <button
            type="button"
            onClick={() => setChoice('refused')}
            disabled={choice === 'refused'}
            className="rounded-lg border border-border px-4 py-2 font-mono text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-default transition"
          >
            Refuser et effacer mes données
          </button>
        </div>
      )}
    </div>
  )
}
