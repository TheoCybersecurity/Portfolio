'use client'

import { useState } from 'react'
import { User } from 'lucide-react'

export default function PhotoDisplay() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted/30">
        <User size={64} />
        <p className="font-mono text-xs mt-2">photo à venir</p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/photo-theo.jpg"
      alt="Théo Marescal"
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  )
}
