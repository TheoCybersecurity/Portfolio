import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * robots.txt généré par Next.js. Tout est indexable sauf les routes d'API.
 * /admin n'est volontairement pas listé : le citer révélerait son existence,
 * et il renvoie de toute façon une 404 hors de l'IP d'administration.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
