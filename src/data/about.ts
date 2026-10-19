import type { StatItem } from './types'
import { getAge } from '@/lib/utils'

/** Date de naissance (ISO) — sert au calcul automatique de l'âge affiché. */
export const BIRTH_DATE = '2005-11-09'

/**
 * Les chips de la section « À propos ». L'âge est calculé à la volée
 * pour ne plus avoir à le mettre à jour chaque année.
 */
export function getChips(): string[] {
  return [
    `${getAge(BIRTH_DATE)} ans`,
    'BTS CIEL',
    'Titre Professionnel AIS',
    'Mastère AICIS',
    'Réserviste Gendarmerie Nationale',
    'Carcassonne (11)',
  ]
}

export const stats: StatItem[] = [
  { value: 'Raspberry Pi', label: 'Serveur auto-hébergé', icon: 'Server' },
  { value: '8', label: 'Certifications', icon: 'Award' },
  { value: '1 an', label: 'Alternance Gendarmerie', icon: 'Briefcase' },
  { value: '+10', label: 'Projets réalisés', icon: 'FolderGit2' },
]

export const bio: string[] = [
  'Passionné d\'informatique depuis le collège, j\'ai obtenu le Titre Professionnel Administrateur d\'Infrastructures Sécurisées au Lycée Jules Fil de Carcassonne, et je poursuis aujourd\'hui mon parcours au sein du Mastère Architecte Infrastructures Cloud & Industries Sécurisées (AICIS), dans ce même établissement — ponctué de 3 stages en entreprise sur l\'année.',
  'Lors de mon alternance à la SOLC du GGD11, j\'ai conduit des projets concrets : station blanche de décontamination USB, infrastructure réseau sécurisée pour collectivités et PME, plateforme de simulation de phishing avec SSO intégré.',
  'Réserviste opérationnel à la Gendarmerie Nationale et admin de ma propre infrastructure auto-hébergée sur Raspberry Pi, je continue de développer mes compétences à travers des projets personnels variés.',
]
