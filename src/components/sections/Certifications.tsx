'use client'

import { motion } from 'framer-motion'
import FadeInWhenVisible, { staggerContainer, staggerItem } from '@/components/ui/FadeInWhenVisible'
import CertBadge from '@/components/ui/CertBadge'
import { certifications } from '@/data/certifications'

export default function Certifications() {
  return (
    <section id="certifications" className="py-24 bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-12">
            <span className="font-mono text-accent text-sm">05.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Certifications
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
        </FadeInWhenVisible>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {certifications.map((cert) => (
            <motion.div key={cert.id} variants={staggerItem} className="h-full">
              <CertBadge cert={cert} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
