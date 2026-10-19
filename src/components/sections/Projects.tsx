'use client'

import { motion } from 'framer-motion'
import FadeInWhenVisible, { staggerContainer, staggerItem } from '@/components/ui/FadeInWhenVisible'
import ProjectCard from '@/components/ui/ProjectCard'
import { projects } from '@/data/projects'

export default function Projects() {
  return (
    <section id="projets" className="py-24 bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-accent text-sm">03.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Projets
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
          <p className="text-text-muted font-body mb-12 max-w-xl">
            Des projets concrets réalisés en environnement professionnel, personnel et scolaire.
          </p>
        </FadeInWhenVisible>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {projects.map((project) => (
            <motion.div key={project.slug} variants={staggerItem} className="h-full">
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
