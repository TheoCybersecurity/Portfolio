import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { projects } from '@/data/projects'
import ProjectPageContent from '@/components/sections/ProjectPageContent'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)
  if (!project) return {}

  return {
    title: project.title,
    description: project.shortDescription,
    alternates: { canonical: `/projets/${project.slug}` },
    openGraph: {
      title: `${project.title} — Théo Marescal`,
      description: project.shortDescription,
      url: `/projets/${project.slug}`,
      images: [{ url: project.screenshotPath, alt: project.title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} — Théo Marescal`,
      description: project.shortDescription,
      images: [project.screenshotPath],
    },
  }
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)

  if (!project) notFound()

  return <ProjectPageContent project={project} />
}
