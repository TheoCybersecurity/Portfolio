import type { ElementType } from 'react'
import { Shield } from 'lucide-react'
import FadeInWhenVisible from '@/components/ui/FadeInWhenVisible'
import PhotoDisplay from '@/components/ui/PhotoDisplay'
import AboutChips from '@/components/ui/AboutChips'
import { getChips, stats, bio } from '@/data/about'
import { Server, Award, Briefcase, FolderGit2 } from 'lucide-react'

const iconMap: Record<string, ElementType> = {
  Server,
  Award,
  Briefcase,
  FolderGit2,
}

export default function About() {
  return (
    <section id="a-propos" className="py-24 bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-12">
            <span className="font-mono text-accent text-sm">01.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              À propos
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
        </FadeInWhenVisible>

        <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 items-start">

          {/* Gauche : photo + chips */}
          <FadeInWhenVisible direction="left">
            <div className="space-y-6">
              <div className="relative w-full max-w-sm mx-auto md:mx-0">
                <div className="relative aspect-square rounded-2xl bg-surface border border-border overflow-hidden">
                  <PhotoDisplay />
                </div>
                <div className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl border border-accent/20 -z-10" />
              </div>

              <AboutChips initial={getChips()} />
            </div>
          </FadeInWhenVisible>

          {/* Droite : highlight + bio + stats */}
          <FadeInWhenVisible direction="right">
            <div className="space-y-5">

              {/* Carte mise en avant : formation en cours */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/8 border border-accent/25">
                <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
                  <Shield size={22} className="text-accent" />
                </div>
                <div>
                  <p className="font-display font-semibold text-text-primary leading-tight">
                    Mastère AICIS — Lycée Jules Fil Carcassonne
                  </p>
                  <p className="font-body text-sm text-text-muted mt-0.5">
                    Architecte Infrastructures Cloud & Industries Sécurisées
                  </p>
                </div>
              </div>

              {/* Bio — 3 paragraphes courts */}
              <div className="space-y-3">
                {bio.map((paragraph, i) => (
                  <p key={i} className="text-text-muted font-body leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Stats 2×2 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {stats.map((stat) => {
                  const Icon = iconMap[stat.icon]
                  return (
                    <div
                      key={stat.label}
                      className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/30 transition-colors duration-150"
                    >
                      {Icon && <Icon size={20} className="text-accent flex-shrink-0" />}
                      <div>
                        <p className="text-xl font-display font-bold text-text-primary leading-tight">
                          {stat.value}
                        </p>
                        <p className="text-xs font-body text-text-muted leading-tight mt-0.5">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </FadeInWhenVisible>
        </div>
      </div>
    </section>
  )
}
