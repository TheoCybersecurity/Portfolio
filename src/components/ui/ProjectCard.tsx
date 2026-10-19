import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Badge from './Badge'
import SkillTag from './SkillTag'
import type { Project } from '@/data/types'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projets/${project.slug}`}
      className="group flex flex-col h-full bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="relative h-48 overflow-hidden bg-background-secondary">
        <Image
          src={project.cardImagePath || project.screenshotPath}
          alt={project.title}
          fill
          className={`group-hover:scale-105 transition-transform duration-500 ${
            project.cardImageFit === 'contain' ? 'object-contain' : 'object-cover'
          }`}
          style={{ objectPosition: project.cardImagePosition || 'center' }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <Badge category={project.category} />
        </div>
        <div className="absolute top-3 right-3 font-mono text-xs text-text-muted bg-background/70 px-2 py-0.5 rounded">
          {project.year}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-display font-semibold text-text-primary group-hover:text-accent transition-colors duration-200">
            {project.title}
          </h3>
          <ArrowRight
            size={18}
            className="text-text-muted group-hover:text-accent transition-colors duration-200 flex-shrink-0 mt-0.5"
          />
        </div>

        <p className="text-sm text-text-muted font-body leading-relaxed mb-4">
          {project.shortDescription}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-auto">
          {project.stack.slice(0, 5).map((tech) => (
            <SkillTag key={tech} label={tech} />
          ))}
          {project.stack.length > 5 && (
            <span className="text-xs font-mono text-text-muted/60 self-center">
              +{project.stack.length - 5}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
