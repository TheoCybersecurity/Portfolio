'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Experience } from '@/data/types'

const CARCASSONNE_URL = 'https://www.google.com/maps/place/11000+Carcassonne/'
const GENDARMERIE_RESERVE_URL =
  'https://www.gendarmerie.interieur.gouv.fr/recrutement/recrutements-et-conditions-d-acces/reserviste-dans-la-reserve-operationnelle'
const JULES_FIL_URL = 'https://jules-fil.mon-ent-occitanie.fr/'

// Termes reconnus dans le texte libre (organisme, descriptions) et convertis en liens.
const LINK_TERMS: { re: RegExp; url: string }[] = [
  { re: /Lycée Jules Fil/g, url: JULES_FIL_URL },
  { re: /Gendarmerie Nationale/g, url: GENDARMERIE_RESERVE_URL },
  { re: /Carcassonne/g, url: CARCASSONNE_URL },
]

/** Convertit les mentions reconnues (établissement, gendarmerie, ville) d'un texte en liens. */
function linkifyText(text: string, keyPrefix: string): ReactNode {
  type Token = { text: string; url?: string }
  let tokens: Token[] = [{ text }]

  for (const { re, url } of LINK_TERMS) {
    const next: Token[] = []
    for (const token of tokens) {
      if (token.url) {
        next.push(token)
        continue
      }
      const parts = token.text.split(re)
      const matches = token.text.match(re)
      parts.forEach((part, i) => {
        if (part) next.push({ text: part })
        if (matches && i < parts.length - 1) next.push({ text: matches[i], url })
      })
    }
    tokens = next
  }

  if (tokens.length === 1 && !tokens[0].url) return text

  return tokens.map((token, i) =>
    token.url ? (
      <a
        key={`${keyPrefix}-lnk-${i}`}
        href={token.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-accent-warm transition-colors"
      >
        {token.text}
      </a>
    ) : (
      <span key={`${keyPrefix}-txt-${i}`}>{token.text}</span>
    )
  )
}

interface TimelineItemProps {
  experience: Experience
  isLast: boolean
}

export default function TimelineItem({ experience, isLast }: TimelineItemProps) {
  const period = formatDate(experience.startDate, experience.endDate)
  const dotColor = 'bg-accent border-accent'

  return (
    <motion.div
      className="relative flex gap-6"
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1.5 ${dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border mt-2 min-h-[3rem]" />}
      </div>

      <div className="pb-10 flex-1">
        <span className="text-xs font-mono text-text-muted mb-1 block">{period}</span>
        <h3 className="text-lg font-display font-semibold text-text-primary mb-0.5">
          {experience.roleUrl ? (
            <a
              href={experience.roleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              {experience.role}
              <ExternalLink size={13} className="text-text-muted/50" />
            </a>
          ) : (
            experience.role
          )}
        </h3>
        <p className="text-sm font-body text-accent mb-3">
          {linkifyText(experience.organization, `${experience.id}-org`)} ·{' '}
          {linkifyText(experience.location, `${experience.id}-loc`)}
        </p>

        <div className="space-y-2 mb-3">
          {experience.descriptions.map((desc, i) => (
            <p key={i} className="text-sm text-text-muted font-body leading-relaxed">
              {linkifyText(desc, `${experience.id}-desc-${i}`)}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {experience.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
