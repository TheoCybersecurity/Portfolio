'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
      aria-label="Copier le lien"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  )
}
