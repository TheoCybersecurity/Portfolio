import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import StatsChoiceControl from '@/components/analytics/StatsChoiceControl'

export const metadata: Metadata = {
  title: 'Confidentialité',
  description:
    'Données collectées sur theo.marescal.fr, finalités, durée de conservation et exercice de vos droits (RGPD).',
  alternates: { canonical: '/confidentialite' },
}

const UPDATED = '15 octobre 2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 font-body text-text-muted leading-relaxed">{children}</div>
    </section>
  )
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

const Strong = ({ children }: { children: ReactNode }) => <span className="text-text-primary">{children}</span>

const ExtLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-warm">
    {children}
  </a>
)

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 font-mono text-sm text-text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft size={16} />
            Retour au site
          </Link>

          <p className="font-mono text-sm text-accent">Politique de confidentialité</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary sm:text-4xl">
            Vos données sur ce site
          </h1>
          <p className="mt-4 font-body text-text-muted leading-relaxed">
            Ce portfolio est un site personnel. Il ne dépose <Strong>aucun cookie</Strong>, n’affiche aucune
            publicité et ne revend ni ne partage aucune donnée. Cette page détaille ce qui est collecté, pourquoi,
            et comment vous y opposer.
          </p>
          <p className="mt-2 font-mono text-xs text-text-muted/60">Dernière mise à jour : {UPDATED}</p>

          <div className="mt-12 space-y-12">
            <Section title="Votre choix">
              <StatsChoiceControl />
            </Section>

            <Section title="Responsable du traitement">
              <p>
                Théo Marescal, éditeur de ce site — <a href="mailto:theo@marescal.fr" className="text-accent hover:text-accent-warm">theo@marescal.fr</a>.
              </p>
            </Section>

            <Section title="Statistiques de visite">
              <p>
                Lors de votre visite, les informations suivantes sont enregistrées pour mesurer l’audience du site :
              </p>
              <List
                items={[
                  <>votre <Strong>adresse IP</Strong>, la <Strong>ville, la région et le pays approximatifs</Strong> qui lui sont associés, ainsi que le <Strong>réseau</Strong> auquel elle appartient (fournisseur d’accès ou organisation, avec son numéro de système autonome) ;</>,
                  <>votre <Strong>navigateur</Strong> et sa version, votre <Strong>système d’exploitation</Strong>, le type et le modèle de votre appareil ;</>,
                  <>la langue et le fuseau horaire de votre navigateur, la taille de votre écran et de la fenêtre, le thème clair ou sombre, la présence d’un écran tactile et le type de connexion estimé ;</>,
                  <>les <Strong>pages consultées</Strong>, la date et l’heure, le temps passé et la proportion de page parcourue ;</>,
                  <>le site d’où vous venez (référent) et, s’ils figurent dans le lien, les paramètres de campagne (paramètre « c » ou utm_…), qui indiquent par quel lien partagé vous êtes arrivé ;</>,
                  <>les clics sur les documents téléchargeables (rapports, CV) et sur les liens vers d’autres sites.</>,
                ]}
              />
              <p>
                La position est déduite de l’adresse IP grâce à une base de données hébergée sur le serveur du site
                (DB-IP) et aux informations de Cloudflare : votre adresse n’est transmise à aucun service de
                géolocalisation.
              </p>
              <p>
                Un identifiant pseudonyme est calculé à partir de votre adresse IP et de votre navigateur, afin de
                compter les visiteurs uniques sans rien stocker sur votre appareil. Le signal{' '}
                <Strong>Global Privacy Control</Strong> de votre navigateur, s’il est activé, est respecté comme un
                refus.
              </p>
            </Section>

            <Section title="Ouverture des documents PDF">
              <p>
                Chaque ouverture d’un document PDF du site (rapports, CV, attestations) est enregistrée par le serveur,
                y compris lorsque le document est ouvert directement depuis un lien partagé : date et heure, document,
                adresse IP, localisation et réseau approximatifs, navigateur, système et appareil, langues du navigateur
                et page d’origine. Si l’ouverture a lieu pendant une visite du site, elle est rattachée à cette visite.
              </p>
            </Section>

            <Section title="Finalité et base légale">
              <p>
                Ces données servent uniquement à savoir comment le site et ses documents sont consultés (fréquentation,
                pages lues, documents ouverts, provenance des visiteurs) afin de l’améliorer et de suivre l’intérêt
                suscité par mes candidatures, et à détecter d’éventuels abus. Le traitement repose
                sur l’<Strong>intérêt légitime</Strong> de l’éditeur (article 6.1.f du RGPD) : vous pouvez vous y
                opposer à tout moment, sans justification.
              </p>
            </Section>

            <Section title="Ce qui est stocké sur votre appareil">
              <p>
                Aucun cookie. Seul votre choix (accepter ou refuser les statistiques) est mémorisé dans le stockage
                local de votre navigateur, pour ne pas vous le redemander : il est strictement nécessaire au respect
                de ce choix. En cas de refus, l’identifiant pseudonyme décrit ci-dessus est aussi conservé sur le
                serveur pendant 13 mois, afin de ne pas enregistrer vos ouvertures de documents PDF, qui ne passent
                pas par la mesure faite dans votre navigateur.
              </p>
            </Section>

            <Section title="Destinataires et hébergement">
              <p>
                Les statistiques ne sont consultables que par l’éditeur. Elles sont stockées sur un serveur personnel
                situé en France et ne sont ni vendues, ni cédées, ni utilisées à des fins publicitaires.
              </p>
              <p>
                Le trafic transite par <Strong>Cloudflare</Strong> (réseau de diffusion et protection du site), qui
                traite votre adresse IP pour acheminer les pages et indique le pays de provenance. Aucune adresse IP
                n’est transmise à un autre service.
              </p>
              <p>
                La <Strong>démo de Memoria</Strong> (données fictives) charge des polices et des bibliothèques depuis
                Google Fonts, unpkg et jsDelivr, ainsi que des fonds de carte OpenStreetMap : ces services reçoivent
                votre adresse IP lorsque vous l’ouvrez. Les liens vers LinkedIn, GitHub ou Instagram mènent à des
                sites soumis à leur propre politique de confidentialité.
              </p>
            </Section>

            <Section title="Formulaire de contact">
              <p>
                Le nom, l’adresse e-mail et le message saisis dans le formulaire de contact sont envoyés par e-mail à
                l’éditeur pour vous répondre. Ils ne sont pas enregistrés sur le site.
              </p>
            </Section>

            <Section title="Durée de conservation">
              <p>
                Les statistiques de visite et le journal des ouvertures de documents sont conservés <Strong>13 mois</Strong>,
                puis supprimés automatiquement.
              </p>
            </Section>

            <Section title="Vos droits">
              <p>
                Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et
                d’opposition sur vos données. Le bouton « Refuser et effacer mes données » ci-dessus supprime
                immédiatement l’historique (visites et ouvertures de documents) associé à votre navigateur et à votre
                adresse IP actuels. Pour toute autre
                demande, écrivez à <a href="mailto:theo@marescal.fr" className="text-accent hover:text-accent-warm">theo@marescal.fr</a>.
              </p>
              <p>
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la{' '}
                <ExtLink href="https://www.cnil.fr/fr/plaintes">CNIL</ExtLink>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
