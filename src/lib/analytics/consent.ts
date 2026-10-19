// Côté navigateur uniquement. Le choix est le seul élément conservé chez le visiteur
// (stockage local, pas de cookie) : il est strictement nécessaire pour le respecter.

export type StatsChoice = 'accepted' | 'refused'

const KEY = 'stats-choice'
export const CHOICE_EVENT = 'stats-choice-change'

export function getChoice(): StatsChoice | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'accepted' || v === 'refused' ? v : null
  } catch {
    return null
  }
}

export function setChoice(choice: StatsChoice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // stockage indisponible (navigation privée stricte) : le choix vaut pour la page en cours
  }
  window.dispatchEvent(new CustomEvent<StatsChoice>(CHOICE_EVENT, { detail: choice }))
}

/** Signal « Global Privacy Control » envoyé par certains navigateurs : traité comme un refus. */
export function hasGpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

export function statsAllowed(): boolean {
  return !hasGpc() && getChoice() !== 'refused'
}
