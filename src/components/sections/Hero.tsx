'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Briefcase, ChevronDown, Download, Github, Linkedin, Instagram, Mail, MapPin } from 'lucide-react'

/* =============================================================================
   HERO — « Réseau vivant »
   Une topologie réseau animée en canvas : les nœuds dérivent, se relient entre
   eux, et réagissent au curseur qui devient lui-même un nœud du réseau.
   Des paquets circulent en continu le long des liens.
   ========================================================================== */

const NAME = 'Théo Marescal'

const SOCIALS = [
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/in/theo-marescal/' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/TheoCybersecurity' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/theo_cybersecurity' },
]

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  pulse: number
}

interface Packet {
  from: number
  to: number
  t: number
  speed: number
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = 1
    let nodes: Node[] = []
    let packets: Packet[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    const LINK_DIST = 148
    const MOUSE_DIST = 210

    function resize() {
      if (!canvas) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Densité proportionnelle à la surface, plafonnée pour rester fluide
      const count = Math.min(110, Math.round((width * height) / 13500))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: Math.random() * 1.7 + 1.1,
        pulse: Math.random() * Math.PI * 2,
      }))
      packets = []
    }

    function spawnPacket() {
      if (nodes.length < 2) return
      const from = Math.floor(Math.random() * nodes.length)
      // Cherche un voisin proche pour que le paquet suive un lien visible
      let to = -1
      let best = LINK_DIST
      for (let i = 0; i < nodes.length; i++) {
        if (i === from) continue
        const d = Math.hypot(nodes[i].x - nodes[from].x, nodes[i].y - nodes[from].y)
        if (d < best) {
          best = d
          to = i
        }
      }
      if (to === -1) return
      packets.push({ from, to, t: 0, speed: 0.006 + Math.random() * 0.01 })
    }

    let frame = 0
    let raf = 0

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      frame++

      // Déplacement
      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx
          n.y += n.vy
        }
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
        n.x = Math.max(0, Math.min(width, n.x))
        n.y = Math.max(0, Math.min(height, n.y))
        n.pulse += 0.02

        // Légère attraction vers le curseur
        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const d = Math.hypot(dx, dy)
          if (d < MOUSE_DIST && d > 1) {
            n.x += (dx / d) * 0.35
            n.y += (dy / d) * 0.35
          }
        }
      }

      // Liens entre nœuds
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.hypot(dx, dy)
          if (d > LINK_DIST) continue
          const alpha = (1 - d / LINK_DIST) * 0.42
          ctx.strokeStyle = `rgba(59,130,246,${alpha})`
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }

      // Liens vers le curseur
      if (mouse.active) {
        for (const n of nodes) {
          const d = Math.hypot(mouse.x - n.x, mouse.y - n.y)
          if (d > MOUSE_DIST) continue
          const alpha = (1 - d / MOUSE_DIST) * 0.85
          ctx.strokeStyle = `rgba(103,232,249,${alpha})`
          ctx.lineWidth = 1.1
          ctx.beginPath()
          ctx.moveTo(mouse.x, mouse.y)
          ctx.lineTo(n.x, n.y)
          ctx.stroke()
        }
        // Halo du curseur
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90)
        g.addColorStop(0, 'rgba(103,232,249,0.20)')
        g.addColorStop(1, 'rgba(103,232,249,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2)
        ctx.fill()
      }

      // Nœuds
      for (const n of nodes) {
        const near = mouse.active && Math.hypot(mouse.x - n.x, mouse.y - n.y) < MOUSE_DIST
        const glow = 0.55 + Math.sin(n.pulse) * 0.2
        ctx.fillStyle = near
          ? `rgba(103,232,249,${Math.min(1, glow + 0.35)})`
          : `rgba(148,163,184,${glow * 0.75})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, near ? n.r * 1.7 : n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Paquets circulant sur les liens
      if (!reduce && frame % 22 === 0 && packets.length < 26) spawnPacket()
      packets = packets.filter((p) => {
        p.t += p.speed
        if (p.t >= 1) return false
        const a = nodes[p.from]
        const b = nodes[p.to]
        if (!a || !b) return false
        const x = a.x + (b.x - a.x) * p.t
        const y = a.y + (b.y - a.y) * p.t
        ctx.fillStyle = 'rgba(103,232,249,0.95)'
        ctx.shadowColor = 'rgba(103,232,249,0.9)'
        ctx.shadowBlur = 9
        ctx.beginPath()
        ctx.arc(x, y, 1.9, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        return true
      })

      raf = requestAnimationFrame(draw)
    }

    function onMove(e: PointerEvent) {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    function onLeave() {
      mouse.active = false
      mouse.x = -9999
      mouse.y = -9999
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Canvas réseau */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Dégradé pour détacher le texte du réseau */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 46% 42% at 50% 50%, rgba(10,14,26,0.93) 0%, rgba(10,14,26,0.55) 55%, transparent 78%)',
        }}
      />

      <div className="relative z-10 text-center px-6 pointer-events-none">
        {/* Badges identité */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 mb-8 pointer-events-auto"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mastère AICIS
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono">
            Réserviste Gendarmerie Nationale
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-text-muted text-xs font-mono">
            <MapPin size={12} />
            Carcassonne (11)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <Briefcase size={12} />
            Recherche de stage
          </span>
        </motion.div>

        {/* Nom, lettre par lettre */}
        <h1
          className="font-display font-bold text-text-primary leading-[0.95] mb-6"
          style={{ fontSize: 'clamp(2.8rem, 10vw, 7.5rem)', letterSpacing: '-0.03em' }}
        >
          {NAME.split(' ').map((word, wi) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {word.split('').map((char, ci) => (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ opacity: 0, y: 42, filter: 'blur(14px)', rotateX: -70 }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
                  transition={{
                    delay: 0.25 + (wi * 5 + ci) * 0.045,
                    duration: 0.7,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    background:
                      wi === 1
                        ? 'linear-gradient(180deg, #67E8F9 0%, #3B82F6 100%)'
                        : undefined,
                    WebkitBackgroundClip: wi === 1 ? 'text' : undefined,
                    WebkitTextFillColor: wi === 1 ? 'transparent' : undefined,
                  }}
                >
                  {char}
                </motion.span>
              ))}
              {wi === 0 && <span className="inline-block w-[0.25em]" />}
            </span>
          ))}
        </h1>

        {/* Rôle */}
        <motion.p
          className="font-mono text-sm sm:text-lg text-accent-warm mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.6 }}
        >
          Administrateur d&apos;Infrastructures Sécurisées
        </motion.p>

        <motion.p
          className="text-text-muted font-body text-sm max-w-xl mx-auto mb-9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          Je conçois, sécurise et supervise des infrastructures — du réseau segmenté
          au bastion d&apos;administration, jusqu&apos;aux applications que j&apos;héberge moi-même.
          <span className="block mt-2 text-amber-400/90">
            Je recherche activement une entreprise pour réaliser mon stage de Mastère.
          </span>
          <Link
            href="#contact"
            className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
          >
            <Mail size={13} />
            Me contacter
          </Link>
        </motion.p>

        {/* CTA */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center mb-8 pointer-events-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.5 }}
        >
          <Link
            href="#projets"
            className="group relative px-8 py-3.5 rounded-full bg-accent text-white font-body font-medium overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
            style={{ boxShadow: '0 8px 34px rgba(59,130,246,0.42)' }}
          >
            <span className="relative z-10">Explorer mes projets</span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          </Link>
          <a
            href="/cv-theo-marescal.pdf"
            download
            className="px-8 py-3.5 rounded-full border border-border bg-background/40 backdrop-blur-sm hover:border-accent-warm text-text-primary hover:text-accent-warm font-body font-medium transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2 justify-center"
          >
            <Download size={17} />
            Mon CV
          </a>
        </motion.div>

        {/* Réseaux */}
        <motion.div
          className="flex items-center justify-center gap-3 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.45, duration: 0.5 }}
        >
          {SOCIALS.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-text-muted hover:text-accent-warm transition-colors duration-200"
            >
              <Icon size={18} />
            </a>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 1.8, duration: 0.5 },
          y: { delay: 1.8, duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <ChevronDown size={24} />
      </motion.div>
    </section>
  )
}
