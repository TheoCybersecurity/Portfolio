import { projects } from '@/data/projects'

/** Pages vers lesquelles un lien de campagne peut pointer. */
export function campaignTargets(): { path: string; label: string }[] {
  return [
    { path: '/', label: 'Accueil' },
    ...projects.map((p) => ({ path: `/projets/${p.slug}`, label: `Projet — ${p.title}` })),
  ]
}
