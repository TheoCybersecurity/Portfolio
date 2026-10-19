'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, ExternalLink, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import TechLogo from '@/components/ui/TechLogo'
import type { Certification } from '@/data/types'

const categoryLabels: Record<Certification['category'], string> = {
  cloud: 'Cloud',
  cybersecurite: 'Cybersécurité',
  premiers_secours: 'Premiers Secours',
  concours: 'Concours',
  conformite: 'Conformité',
}

const issuerImages: Record<string, string> = {
  'ANSSI':                       '/icons/anssi.png',
  'CNIL':                        '/icons/cnil.png',
  'Croix-Rouge Française':       '/icons/crf.png',
  'Gendarmerie Nationale':       '/icons/gendarmerie-nationale.png',
  'Stormshield':                 '/icons/stormshield-grand.png',
  'Amazon Web Services (AWS)':   '/icons/aws.png',
  'Cisco Networking Academy':    '/icons/cisco.png',
}

interface CertBadgeProps {
  cert: Certification
}

function IssuerLogo({ cert }: { cert: Certification }) {
  const imgSrc = issuerImages[cert.issuer]

  if (imgSrc) {
    return (
      <div className="flex items-center justify-center w-full h-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={cert.issuer}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )
  }

  if (cert.logoSlug) {
    return (
      <div className="flex items-center justify-center w-full h-28">
        <TechLogo slug={cert.logoSlug} size={64} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-full h-28">
      <span className="text-4xl font-mono font-bold text-accent">
        {cert.issuer.charAt(0)}
      </span>
    </div>
  )
}

export default function CertBadge({ cert }: CertBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  const isObtained = cert.status === 'obtained'
  const hasMultipleObtentions = (cert.obtentions?.length ?? 0) > 1
  const singleLink = cert.attestationPath || cert.credentialUrl

  const content = (
    <div
      className={cn(
        'group flex flex-col p-5 rounded-xl border transition-all duration-200 h-full',
        'bg-surface hover:border-accent/40 hover:-translate-y-0.5',
        isObtained ? 'border-border' : 'border-accent/20'
      )}
    >
      {/* Catégorie */}
      <div className="flex justify-end mb-3">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background border border-border text-text-muted/50">
          {categoryLabels[cert.category]}
        </span>
      </div>

      {/* Logo organisme */}
      <IssuerLogo cert={cert} />

      {/* Titre + organisme */}
      <div className="text-center flex-1 mt-4 mb-4">
        <h4 className="font-display font-semibold text-text-primary text-base leading-snug mb-1.5">
          {cert.title}
        </h4>
        <p className="text-xs font-body text-text-muted leading-snug">{cert.issuer}</p>
      </div>

      {/* Bas : date(s) + statut + lien */}
      <div className="border-t border-border/30 pt-3 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          {cert.startDate ? (
            <>
              <span className="text-[10px] font-mono text-text-muted/50 leading-tight">
                Depuis {cert.startDate}
              </span>
              <span className="text-xs font-mono text-text-muted/70 leading-tight">
                Mis à jour {cert.date}
              </span>
            </>
          ) : (
            <span className="text-xs font-mono text-text-muted/60">{cert.date}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border',
              isObtained
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-accent/10 border-accent/30 text-accent'
            )}
          >
            {isObtained
              ? <CheckCircle size={10} />
              : <Clock size={10} className="animate-pulse" />}
            {isObtained ? 'Obtenu' : 'En cours'}
          </span>
          {hasMultipleObtentions ? (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="text-text-muted/40 group-hover:text-accent transition-colors" />
            </motion.div>
          ) : singleLink ? (
            <ExternalLink size={13} className="text-text-muted/40 group-hover:text-accent transition-colors" />
          ) : null}
        </div>
      </div>

      {/* Sélecteur d'obtentions (si plusieurs) */}
      <AnimatePresence>
        {hasMultipleObtentions && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 mt-3 pt-3 space-y-1.5">
              <p className="text-[10px] font-mono text-text-muted/35 uppercase tracking-widest mb-2">
                Sélectionner une attestation
              </p>
              {cert.obtentions!.map((o, i) => {
                const href = o.attestationPath || o.credentialUrl
                return href ? (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-background hover:bg-accent/5 border border-border/40 hover:border-accent/30 transition-colors duration-150"
                  >
                    <span className="font-mono text-xs text-text-primary">{o.date}</span>
                    <ExternalLink size={11} className="text-text-muted/40" />
                  </a>
                ) : (
                  <div
                    key={i}
                    className="flex items-center px-3 py-2 rounded-lg bg-background border border-border/40"
                  >
                    <span className="font-mono text-xs text-text-muted">{o.date}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Plusieurs obtentions → carte cliquable pour expand/collapse
  if (hasMultipleObtentions) {
    return (
      <div
        className="h-full cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {content}
      </div>
    )
  }

  // Lien unique → carte entière est un lien
  if (singleLink) {
    return (
      <a href={singleLink} target="_blank" rel="noopener noreferrer" className="block h-full">
        {content}
      </a>
    )
  }

  return <div className="h-full">{content}</div>
}
