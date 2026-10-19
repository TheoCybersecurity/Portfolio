'use client'

import { useState } from 'react'
import { FileText, ExternalLink, Lock } from 'lucide-react'
import type { Report } from '@/data/types'

interface ReportCardProps {
  report: Report
}

export default function ReportCard({ report }: ReportCardProps) {
  const [showReason, setShowReason] = useState(false)

  if (report.unavailableReason) {
    return (
      <div
        className="flex h-full min-h-[104px] flex-col justify-center gap-2 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5"
      >
        <button
          type="button"
          onClick={() => setShowReason((v) => !v)}
          className="group flex items-center gap-4 text-left"
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock size={20} className="text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-text-primary text-base leading-snug">
              {report.title}
            </h4>
            <p className="text-xs font-body text-text-muted mt-0.5">
              {report.context}
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3">
            <span className="text-xs font-mono text-text-muted/60">{report.date}</span>
            <span className="text-xs font-mono text-amber-400/80 group-hover:text-amber-400 transition-colors">
              indisponible
            </span>
          </div>
        </button>

        {showReason && (
          <p className="text-xs font-body text-amber-200/80 leading-relaxed pl-[60px] pr-2">
            {report.unavailableReason}
          </p>
        )}
      </div>
    )
  }

  return (
    <a
      href={report.filePath}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full min-h-[104px] items-center gap-4 p-5 rounded-xl border border-border bg-surface hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
        <FileText size={20} className="text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-display font-semibold text-text-primary text-base leading-snug">
          {report.title}
        </h4>
        <p className="text-xs font-body text-text-muted mt-0.5">
          {report.context}
        </p>
      </div>

      <div className="flex-shrink-0 flex items-center gap-3">
        <span className="text-xs font-mono text-text-muted/60">{report.date}</span>
        <ExternalLink size={14} className="text-text-muted/40 group-hover:text-accent transition-colors" />
      </div>
    </a>
  )
}
