import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import Tracker from '@/components/analytics/Tracker'
import PrivacyNotice from '@/components/analytics/PrivacyNotice'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
})

const DESCRIPTION =
  "Portfolio de Théo Marescal, Administrateur d'Infrastructures Sécurisées à Carcassonne : cybersécurité, infrastructure réseau, cloud et pentest. Étudiant en Mastère AICIS au Lycée Jules Fil et réserviste à la Gendarmerie Nationale."

export const metadata: Metadata = {
  // Indispensable : sans metadataBase, les URLs d'images Open Graph sont
  // résolues sur localhost et les aperçus de partage sont cassés.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Théo Marescal — Administrateur d'Infrastructures Sécurisées",
    template: '%s | Théo Marescal',
  },
  description: DESCRIPTION,
  applicationName: 'Théo Marescal',
  authors: [{ name: 'Théo Marescal', url: SITE_URL }],
  creator: 'Théo Marescal',
  publisher: 'Théo Marescal',
  keywords: [
    'Théo Marescal',
    'Theo Marescal',
    'portfolio',
    "Administrateur d'Infrastructures Sécurisées",
    'cybersécurité',
    'Carcassonne',
    'Mastère AICIS',
    'Titre Pro AIS',
    'BTS CIEL',
    'réserviste Gendarmerie Nationale',
    'pentest',
    'infrastructure réseau',
    'cloud',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Théo Marescal — Administrateur d'Infrastructures Sécurisées",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Théo Marescal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Théo Marescal — Portfolio',
      },
    ],
    locale: 'fr_FR',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Théo Marescal — Administrateur d'Infrastructures Sécurisées",
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

/**
 * Données structurées Schema.org (Person). C'est ce qui permet à Google de
 * relier le site à l'identité « Théo Marescal » et d'alimenter le panneau de
 * connaissance sur une recherche par nom.
 */
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Théo Marescal',
  givenName: 'Théo',
  familyName: 'Marescal',
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  jobTitle: "Administrateur d'Infrastructures Sécurisées",
  description: DESCRIPTION,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Carcassonne',
    addressRegion: 'Aude',
    postalCode: '11000',
    addressCountry: 'FR',
  },
  alumniOf: [
    { '@type': 'EducationalOrganization', name: 'Lycée Jules Fil', address: 'Carcassonne, France' },
  ],
  knowsAbout: [
    'Cybersécurité',
    'Infrastructures réseau',
    'Cloud',
    'Pentest',
    'Administration système Linux',
    'Docker',
    'Proxmox',
  ],
  sameAs: [
    'https://www.linkedin.com/in/theo-marescal/',
    'https://github.com/TheoCybersecurity',
    'https://www.instagram.com/theo_cybersecurity',
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Théo Marescal — Portfolio',
  url: SITE_URL,
  inLanguage: 'fr-FR',
  author: { '@type': 'Person', name: 'Théo Marescal' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
        <Tracker />
        <PrivacyNotice />
      </body>
    </html>
  )
}
