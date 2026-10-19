export type ProjectCategory = 'Gendarmerie' | 'Personnel' | 'Scolaire'

export interface Project {
  slug: string
  title: string
  shortDescription: string
  fullDescription: string
  context?: string        // contexte / enjeux (affiché en section dédiée)
  methodology?: string[]  // étapes / méthodologie (liste)
  category: ProjectCategory
  year: string
  stack: string[]
  screenshotPath: string       // bandeau (hero) de la page détail — peut être recadré
  screenshotPosition?: string  // object-position CSS du bandeau (ex: 'center 25%') — défaut 'center'
  cardImagePath?: string       // image de la carte sur la page listing — par défaut screenshotPath
  cardImageFit?: 'cover' | 'contain' // 'contain' pour montrer l'image entière sans recadrage
  cardImagePosition?: string   // object-position CSS de l'image de carte (ex: 'top') — défaut 'center'
  logoPath?: string
  demoUrl?: string        // simulation statique jouable publiquement (données fictives)
  demoUrlLabel?: string   // libellé du bouton (défaut : « Voir la démo »)
  liveUrl?: string
  liveUrlLabel?: string   // libellé du bouton (défaut : « Voir la démo »)
  liveUrlNote?: string    // précision affichée sous le bouton (ex : accès restreint)
  githubUrl?: string
  instagramUrl?: string   // publication de présentation du projet (réseaux sociaux)
  reportPath?: string     // chemin vers le rapport PDF dans public/
  reportUnavailableReason?: string   // si défini, le rapport est temporairement indisponible (raison affichée au clic)
  features: string[]
}

export interface Skill {
  name: string
  slug?: string       // identifiant simple-icons (28 logos disponibles)
  imagePath?: string  // image personnalisée dans public/icons/ (ex: '/icons/wazuh.svg')
}

export interface SkillCategory {
  id: string
  label: string
  icon: string
  skills: Skill[]
}

export interface Experience {
  id: string
  role: string
  roleUrl?: string   // lien vers la page officielle de la formation, si disponible
  organization: string
  location: string
  startDate: string
  endDate: string | null
  descriptions: string[]
  tags: string[]
  type: 'alternance' | 'reserve' | 'etudes'
}

export interface CertObtention {
  date: string
  attestationPath?: string
  credentialUrl?: string
}

export interface Certification {
  id: string
  title: string
  issuer: string
  date: string           // date de dernière obtention (affichage)
  startDate?: string     // date de première obtention (si certification renouvelée)
  status: 'obtained' | 'in_progress'
  logoSlug?: string
  attestationPath?: string
  credentialUrl?: string
  category: 'cloud' | 'cybersecurite' | 'premiers_secours' | 'concours' | 'conformite'
  obtentions?: CertObtention[]  // toutes les obtentions si plusieurs, plus récente en premier
}

export interface StatItem {
  value: string
  label: string
  icon: string
}

export interface Report {
  id: string
  title: string
  context: string   // formation / cadre du rapport (ex: "BTS CIEL — Stage")
  date: string       // année ou date de rédaction
  filePath: string   // chemin vers le PDF dans public/reports/
  unavailableReason?: string   // si défini, le rapport est temporairement indisponible (raison affichée au clic)
}
