import FadeInWhenVisible from '@/components/ui/FadeInWhenVisible'
import TimelineItem from '@/components/ui/TimelineItem'
import { experiences } from '@/data/experience'

export default function Experience() {
  return (
    <section id="experiences" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-12">
            <span className="font-mono text-accent text-sm">04.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Formations & Expériences
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
        </FadeInWhenVisible>

        <div className="max-w-2xl">
          {experiences.map((exp, index) => (
            <TimelineItem
              key={exp.id}
              experience={exp}
              isLast={index === experiences.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
