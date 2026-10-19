'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Github, ExternalLink, CheckCircle, FileText, ListChecks, Info, Instagram, Lock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import SkillTag from '@/components/ui/SkillTag'
import type { Project } from '@/data/types'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const fadeRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const heroVariants = {
  hidden: { opacity: 0, scale: 1.03 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: 'easeOut' as const } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}

const sidebarStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } },
}

interface Props {
  project: Project
}

export default function ProjectPageContent({ project }: Props) {
  const [showReportReason, setShowReportReason] = useState(false)

  return (
    <main className="min-h-screen bg-background">
      {/* Hero image */}
      <motion.div
        className="relative h-72 md:h-96 bg-background-secondary overflow-hidden"
        variants={heroVariants}
        initial="hidden"
        animate="visible"
      >
        <Image
          src={project.screenshotPath}
          alt={project.title}
          fill
          className="object-cover opacity-60"
          style={{ objectPosition: project.screenshotPosition || 'center' }}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />

        {/* Logo projet — coin supérieur gauche */}
        {project.logoPath && (
          <motion.div
            className="absolute top-5 left-6 z-10"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.5, ease: 'easeOut' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.logoPath}
              alt={`Logo ${project.title}`}
              className="h-14 w-auto object-contain drop-shadow-lg"
            />
          </motion.div>
        )}

        <motion.div
          className="absolute bottom-6 left-6 right-6 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Badge category={project.category} />
            <span className="font-mono text-sm text-text-muted">{project.year}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-text-primary">
            {project.title}
          </h1>
        </motion.div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          <Link
            href="/#projets"
            className="inline-flex items-center gap-2 text-sm font-mono text-text-muted hover:text-accent transition-colors mb-10"
          >
            <ArrowLeft size={16} />
            Retour aux projets
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Colonne principale */}
          <motion.div
            className="md:col-span-2 space-y-10"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Description */}
            <motion.section variants={fadeUp}>
              <h2 className="text-xl font-display font-semibold text-text-primary mb-4">
                Description
              </h2>
              <p className="text-text-muted font-body leading-relaxed text-justify">{project.fullDescription}</p>
            </motion.section>

            {/* Contexte & Enjeux */}
            {project.context && (
              <motion.section variants={fadeUp}>
                <div className="flex items-center gap-2 mb-4">
                  <Info size={17} className="text-accent flex-shrink-0" />
                  <h2 className="text-xl font-display font-semibold text-text-primary">
                    Contexte &amp; Enjeux
                  </h2>
                </div>
                <div className="pl-4 border-l-2 border-accent/30">
                  <p className="text-text-muted font-body leading-relaxed text-justify">{project.context}</p>
                </div>
              </motion.section>
            )}

            {/* Méthodologie */}
            {project.methodology && project.methodology.length > 0 && (
              <motion.section variants={fadeUp}>
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks size={17} className="text-accent flex-shrink-0" />
                  <h2 className="text-xl font-display font-semibold text-text-primary">
                    Méthodologie
                  </h2>
                </div>
                <motion.ol
                  className="space-y-3"
                  variants={stagger}
                >
                  {project.methodology.map((step, i) => (
                    <motion.li
                      key={i}
                      className="flex items-start gap-4"
                      variants={fadeUp}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-xs flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-text-muted font-body text-sm leading-relaxed text-justify">{step}</p>
                    </motion.li>
                  ))}
                </motion.ol>
              </motion.section>
            )}

            {/* Réalisations */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={17} className="text-accent flex-shrink-0" />
                <h2 className="text-xl font-display font-semibold text-text-primary">
                  Réalisations
                </h2>
              </div>
              <ul className="space-y-2">
                {project.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-text-muted font-body text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <span className="text-justify">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          </motion.div>

          {/* Sidebar */}
          <motion.aside
            className="space-y-5"
            variants={sidebarStagger}
            initial="hidden"
            animate="visible"
          >
            {/* Liens & ressources — rapport, démo, code : toujours en tête de colonne, pour attirer l'œil en premier */}
            {(project.reportPath || project.demoUrl || project.liveUrl || project.githubUrl || project.instagramUrl) && (
              <motion.div className="space-y-2.5" variants={fadeRight}>
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 group"
                  >
                    <ExternalLink size={18} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-accent font-medium leading-tight">
                        {project.demoUrlLabel ?? 'Voir la démo'}
                      </p>
                      <p className="font-mono text-[11px] text-text-muted/50 mt-0.5">Données fictives, librement accessible</p>
                    </div>
                    <ExternalLink size={13} className="text-accent/50 group-hover:text-accent transition-colors flex-shrink-0" />
                  </a>
                )}

                {project.reportPath && project.reportUnavailableReason ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowReportReason((v) => !v)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-amber-500/5 border border-amber-500/30 hover:bg-amber-500/10 transition-all duration-150 group text-left"
                    >
                      <Lock size={18} className="text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-amber-400 font-medium leading-tight">
                          Rapport de projet
                        </p>
                        <p className="font-mono text-[11px] text-amber-400/60 mt-0.5">Temporairement indisponible</p>
                      </div>
                    </button>
                    {showReportReason && (
                      <p className="text-[11px] font-body text-amber-200/80 leading-relaxed mt-2 px-1">
                        {project.reportUnavailableReason}
                      </p>
                    )}
                  </div>
                ) : project.reportPath ? (
                  <a
                    href={project.reportPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 group"
                  >
                    <FileText size={18} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-accent font-medium leading-tight">
                        Rapport de projet
                      </p>
                      <p className="font-mono text-[11px] text-text-muted/50 mt-0.5">PDF — consulter</p>
                    </div>
                    <ExternalLink size={13} className="text-accent/50 group-hover:text-accent transition-colors flex-shrink-0" />
                  </a>
                ) : null}

                {project.liveUrl && (
                  <div>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 group"
                    >
                      <ExternalLink size={18} className="text-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-accent font-medium leading-tight">
                          {project.liveUrlLabel ?? 'Voir la démo'}
                        </p>
                        <p className="font-mono text-[11px] text-text-muted/50 mt-0.5">Site en ligne</p>
                      </div>
                      <ExternalLink size={13} className="text-accent/50 group-hover:text-accent transition-colors flex-shrink-0" />
                    </a>
                    {project.liveUrlNote && (
                      <p className="flex items-start gap-1.5 text-[11px] font-body text-text-muted/60 leading-snug mt-2 px-1">
                        <Lock size={11} className="flex-shrink-0 mt-0.5" />
                        <span>{project.liveUrlNote}</span>
                      </p>
                    )}
                  </div>
                )}

                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 group"
                  >
                    <Github size={18} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-accent font-medium leading-tight">
                        Code source
                      </p>
                      <p className="font-mono text-[11px] text-text-muted/50 mt-0.5">GitHub</p>
                    </div>
                    <ExternalLink size={13} className="text-accent/50 group-hover:text-accent transition-colors flex-shrink-0" />
                  </a>
                )}

                {project.instagramUrl && (
                  <a
                    href={project.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 group"
                  >
                    <Instagram size={18} className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-accent font-medium leading-tight">
                        Publication du projet
                      </p>
                      <p className="font-mono text-[11px] text-text-muted/50 mt-0.5">Instagram</p>
                    </div>
                    <ExternalLink size={13} className="text-accent/50 group-hover:text-accent transition-colors flex-shrink-0" />
                  </a>
                )}
              </motion.div>
            )}

            {/* Stack */}
            <motion.div
              className="bg-surface border border-border rounded-xl p-5"
              variants={fadeRight}
            >
              <h3 className="text-xs font-mono text-text-muted/60 uppercase tracking-wider mb-3">
                Stack technique
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <SkillTag key={tech} label={tech} />
                ))}
              </div>
            </motion.div>

            {/* Catégorie */}
            <motion.div
              className="bg-surface border border-border rounded-xl p-5"
              variants={fadeRight}
            >
              <h3 className="text-xs font-mono text-text-muted/60 uppercase tracking-wider mb-3">
                Catégorie
              </h3>
              <Badge category={project.category} />
            </motion.div>
          </motion.aside>
        </div>
      </div>
    </main>
  )
}
