'use client'

import { useState, type FormEvent } from 'react'
import { Send, Mail, Linkedin, Github, Instagram, CheckCircle, AlertCircle, Info } from 'lucide-react'
import FadeInWhenVisible from '@/components/ui/FadeInWhenVisible'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'unavailable'

const socials = [
  { icon: Mail, label: 'theo@marescal.fr', href: 'mailto:theo@marescal.fr' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/in/theo-marescal/' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/TheoCybersecurity' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/theo_cybersecurity' },
]

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const formData = new FormData(e.currentTarget)
    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 503) {
        setStatus('unavailable')
      } else {
        setStatus(res.ok ? 'success' : 'error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <FadeInWhenVisible>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-accent text-sm">07.</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Contact
            </h2>
            <div className="flex-1 h-px bg-border ml-4 hidden md:block" />
          </div>
          <p className="text-text-muted font-body mb-12 max-w-xl">
            Recruteur, projet, stage ou simple échange — je réponds à tous les messages.
          </p>
        </FadeInWhenVisible>

        <div className="grid md:grid-cols-2 gap-12">
          <FadeInWhenVisible direction="left">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1.5" htmlFor="name">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary font-body text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted/40"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-text-muted mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary font-body text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted/40"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-text-muted mb-1.5" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary font-body text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted/40 resize-none"
                  placeholder="Votre message..."
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="w-full px-6 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-body font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:translate-y-0"
              >
                {status === 'loading' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {status === 'loading' ? 'Envoi...' : 'Envoyer'}
              </button>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-body">
                  <CheckCircle size={16} />
                  Message envoyé avec succès !
                </div>
              )}
              {status === 'unavailable' && (
                <div className="flex items-start gap-2 text-amber-400 text-sm font-body">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Formulaire temporairement indisponible.{' '}
                    <a href="mailto:theo@marescal.fr" className="underline hover:text-amber-300">
                      Contactez-moi directement par email.
                    </a>
                  </span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-body">
                  <AlertCircle size={16} />
                  Une erreur est survenue. Réessayez ou contactez-moi par email.
                </div>
              )}
            </form>
          </FadeInWhenVisible>

          <FadeInWhenVisible direction="right">
            <div className="space-y-6">
              <div>
                <p className="text-text-muted font-body leading-relaxed mb-6">
                  Vous pouvez aussi me contacter directement sur ces plateformes :
                </p>
                <div className="space-y-3">
                  {socials.map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith('mailto') ? undefined : '_blank'}
                      rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:border-accent/40 hover:text-accent transition-all duration-200 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-accent" />
                      </div>
                      <span className="font-mono text-sm text-text-muted group-hover:text-accent transition-colors">
                        {label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </FadeInWhenVisible>
        </div>
      </div>
    </section>
  )
}
