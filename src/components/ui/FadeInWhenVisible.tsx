'use client'

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { ReactNode } from 'react'

interface FadeInWhenVisibleProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
}

export default function FadeInWhenVisible({
  children,
  className,
  delay = 0,
  direction = 'up',
}: FadeInWhenVisibleProps) {
  const initial =
    direction === 'up'
      ? { opacity: 0, y: 30 }
      : direction === 'left'
      ? { opacity: 0, x: -30 }
      : direction === 'right'
      ? { opacity: 0, x: 30 }
      : { opacity: 0 }

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}
