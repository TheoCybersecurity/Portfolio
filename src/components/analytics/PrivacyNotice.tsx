'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { CHOICE_EVENT, getChoice, hasGpc, setChoice } from '@/lib/analytics/consent'

/** Bandeau d'information affiché tant que le visiteur n'a pas fait de choix. */
export default function PrivacyNotice() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // GPC = refus déjà exprimé par le navigateur : rien n'est collecté, inutile de demander.
    setVisible(getChoice() === null && !hasGpc())
    const hide = () => setVisible(false)
    window.addEventListener(CHOICE_EVENT, hide)
    return () => window.removeEventListener(CHOICE_EVENT, hide)
  }, [])

  if (pathname?.startsWith('/admin')) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          role="region"
          aria-label="Information sur les statistiques de visite"
          className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md rounded-xl border border-border bg-surface/95 backdrop-blur-md p-5 shadow-2xl shadow-black/40"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-accent flex-shrink-0" />
            <h2 className="font-display font-semibold text-text-primary text-sm">Statistiques de visite</h2>
          </div>
          <p className="text-sm font-body text-text-muted leading-relaxed">
            Pour savoir comment ce portfolio est consulté, j’enregistre des statistiques de visite : adresse IP,
            localisation et réseau approximatifs, navigateur, appareil, pages vues et documents ouverts. <span className="text-text-primary">Aucun cookie, aucune
            publicité, aucun partage</span> ; les données sont conservées 13 mois.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setChoice('accepted')}
              className="rounded-lg bg-accent px-4 py-2 font-mono text-xs font-medium text-white hover:bg-accent/90 transition-colors"
            >
              D’accord
            </button>
            <button
              type="button"
              onClick={() => setChoice('refused')}
              className="rounded-lg border border-border px-4 py-2 font-mono text-xs text-text-muted hover:text-text-primary hover:border-text-muted/40 transition-colors"
            >
              Refuser
            </button>
            <Link
              href="/confidentialite"
              className="ml-auto font-mono text-xs text-text-muted underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
            >
              En savoir plus
            </Link>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
