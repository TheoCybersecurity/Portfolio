'use client'

import type { ElementType } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, ClipboardList, Server, Cloud, Network,
  Database, Code2, Globe, Cpu, Headphones, Lock,
} from 'lucide-react'
import FadeInWhenVisible, { staggerContainer, staggerItem } from '@/components/ui/FadeInWhenVisible'
import TechLogo, { hasTechLogo } from '@/components/ui/TechLogo'
import { skillCategories } from '@/data/skills'
import type { Skill } from '@/data/types'

const iconMap: Record<string, ElementType> = {
  Shield, ClipboardList, Server, Cloud, Network,
  Database, Code2, Globe, Cpu, Headphones, Lock,
}

function isTool(skill: Skill): boolean {
  return !!skill.imagePath || (!!skill.slug && hasTechLogo(skill.slug))
}

function ToolChip({ skill }: { skill: Skill }) {
  const hasImage = !!skill.imagePath

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all duration-150 cursor-default"
      title={skill.name}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px]">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={skill.imagePath} alt={skill.name} width={18} height={18} className="object-contain" />
        ) : (
          <TechLogo slug={skill.slug!} size={18} />
        )}
      </div>
      <span className="font-mono text-xs text-text-primary whitespace-nowrap">{skill.name}</span>
    </div>
  )
}

function ConceptTag({ skill }: { skill: Skill }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-mono text-text-primary bg-surface border border-border hover:border-accent/30 hover:text-accent cursor-default transition-colors duration-150">
      {skill.name}
    </span>
  )
}

export default function Skills() {
  return (
    <section id="competences" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-12">
            <span className="font-mono text-accent text-sm">02.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Compétences
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
        </FadeInWhenVisible>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {skillCategories.map((category) => {
            const Icon = iconMap[category.icon]
            const tools = category.skills.filter(isTool)
            const concepts = category.skills.filter((s) => !isTool(s))

            return (
              <motion.div
                key={category.id}
                variants={staggerItem}
                className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors duration-200"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  {Icon && <Icon size={18} className="text-accent flex-shrink-0" />}
                  <h3 className="text-sm font-display font-semibold text-text-primary">
                    {category.label}
                  </h3>
                </div>

                <div className="space-y-3">
                  {tools.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tools.map((skill) => (
                        <ToolChip key={skill.name} skill={skill} />
                      ))}
                    </div>
                  )}

                  {concepts.length > 0 && (
                    <div className="space-y-2">
                      {tools.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[10px] font-mono text-text-muted/40 uppercase tracking-widest">
                            Notions
                          </span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {concepts.map((skill) => (
                          <ConceptTag key={skill.name} skill={skill} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
