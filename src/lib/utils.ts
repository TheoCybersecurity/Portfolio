import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ProjectCategory } from '@/data/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryStyle(category: ProjectCategory): {
  label: string
  className: string
} {
  switch (category) {
    case 'Gendarmerie':
      return {
        label: 'Gendarmerie Nationale',
        className: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      }
    case 'Personnel':
      return {
        label: 'Projet Personnel',
        className: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
      }
    case 'Scolaire':
      return {
        label: 'Scolaire',
        className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      }
  }
}

/**
 * Âge en années révolues à la date du jour, calculé depuis une date de
 * naissance au format ISO ('AAAA-MM-JJ'). Évite d'avoir à mettre à jour
 * l'âge manuellement chaque année.
 */
export function getAge(birthDate: string, now: Date = new Date()): number {
  const birth = new Date(birthDate)
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  // Anniversaire pas encore passé cette année → on retire un an.
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// UTC : une date « AAAA-MM-01 » ne doit pas basculer au mois précédent selon le fuseau du visiteur.
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** « septembre 2023 — juillet 2025 », ou « depuis novembre 2024 » sans date de fin. */
export function formatDate(dateStr: string, endDate: string | null): string {
  const start = monthYear.format(new Date(dateStr))
  if (endDate === null) return `depuis ${start}`
  return `${start} — ${monthYear.format(new Date(endDate))}`
}
