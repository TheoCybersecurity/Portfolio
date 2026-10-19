import { NextResponse, type NextRequest } from 'next/server'
import { getClientIp, isAdminIp } from '@/lib/admin'

/**
 * - /admin : réservé aux IP de ADMIN_IPS ; pour les autres, la page 404 standard
 *   afin qu'il soit indiscernable d'une URL inexistante.
 * - PDF publics : réécrits vers /api/dl, qui journalise chaque ouverture puis sert le fichier.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (isAdminIp(getClientIp(req.headers))) return NextResponse.next()
    return NextResponse.rewrite(new URL('/__introuvable', req.url))
  }

  if (pathname.endsWith('.pdf')) {
    const url = new URL('/api/dl', req.url)
    url.searchParams.set('f', pathname.slice(1))
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/reports/:path*', '/certifications/:path*', '/cv-theo-marescal.pdf'],
}
