import type { MetadataRoute } from 'next'
import { projects } from '@/data/projects'
import { SITE_URL } from '@/lib/site'

/**
 * Sitemap généré automatiquement : la page d'accueil + une entrée par projet.
 * Accessible sur /sitemap.xml et déclaré dans robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}/projets/${project.slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
