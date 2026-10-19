import Link from 'next/link'
import { Github, Linkedin, Mail, Terminal } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE

  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-sm text-text-muted">
            <Terminal size={14} className="text-accent" />
            <span>Théo Marescal · {year}</span>
          </div>
          {buildDate && (
            <p className="font-mono text-xs text-text-muted/40 pl-5">
              Mis à jour le {buildDate}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="mailto:theo@marescal.fr"
            className="text-text-muted hover:text-accent transition-colors"
            aria-label="Email"
          >
            <Mail size={18} />
          </a>
          <a
            href="https://www.linkedin.com/in/theo-marescal/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin size={18} />
          </a>
          <a
            href="https://github.com/TheoCybersecurity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
        </div>

        <div className="flex flex-col items-center gap-1 md:items-end">
          <p className="font-mono text-xs text-text-muted/50 text-center">
            Built with Next.js · Self-hosted · Raspberry Pi
          </p>
          <Link
            href="/confidentialite"
            className="font-mono text-xs text-text-muted/60 underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  )
}
