'use client'

import FadeInWhenVisible, { staggerContainer, staggerItem } from '@/components/ui/FadeInWhenVisible'
import { motion } from 'framer-motion'
import ReportCard from '@/components/ui/ReportCard'
import { reports } from '@/data/reports'

export default function Reports() {
  return (
    <section id="rapports" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-12">
            <span className="font-mono text-accent text-sm">06.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Rapports
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
        </FadeInWhenVisible>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {reports.map((report) => (
            <motion.div key={report.id} variants={staggerItem} className="h-full">
              <ReportCard report={report} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
