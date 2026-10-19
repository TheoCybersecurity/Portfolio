'use client'

import { useEffect, useState } from 'react'
import { getChips } from '@/data/about'

interface Props {
  /** Chips calculées côté serveur (au build) — servent d'état initial pour éviter
   *  tout écart d'hydratation. */
  initial: string[]
}

/**
 * Affiche les chips de la section « À propos ». L'âge étant calculé au build
 * pour le rendu statique, on le recalcule au montage côté client : ainsi il
 * reste juste même si le site n'est pas reconstruit après un anniversaire.
 */
export default function AboutChips({ initial }: Props) {
  const [chips, setChips] = useState<string[]>(initial)

  useEffect(() => {
    setChips(getChips())
  }, [])

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="px-3 py-1 rounded-full text-sm font-mono bg-surface border border-border text-text-muted hover:border-accent/40 hover:text-accent transition-colors duration-150"
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
