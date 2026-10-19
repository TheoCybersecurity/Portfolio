# Portfolio — Théo Marescal

Code source de mon portfolio, en ligne sur **[theo.marescal.fr](https://theo.marescal.fr)**.

Étudiant en Mastère AICIS (Architecte Infrastructures Cloud & Industries Sécurisées), titulaire du Titre Professionnel Administrateur d'Infrastructures Sécurisées et réserviste de la Gendarmerie Nationale, je présente ici mes projets, mon parcours, mes certifications et mes rapports.

![Aperçu du portfolio](public/og-image.png)

## Fonctionnalités

**Site vitrine**
- Présentation, compétences, projets, formations et expériences, certifications, rapports et formulaire de contact.
- Une page détaillée par projet (contexte, méthodologie, réalisations, stack technique).
- Démos statiques jouables sur des données fictives (ex. [Memoria](https://theo.marescal.fr/demos/memoria/index.html)), qui reproduisent fidèlement les applications réelles, dont l'accès est restreint.
- Référencement : métadonnées Open Graph, données structurées Schema.org, sitemap et robots.txt générés.

**Mesure d'audience maison, respectueuse de la vie privée**
- Aucun cookie déposé chez les visiteurs, aucun service tiers d'analyse : tout est collecté et stocké sur le serveur du site (SQLite).
- Visites, pages lues, temps passé, défilement, provenance, appareils, ouvertures des documents PDF (y compris par lien direct).
- Géolocalisation approximative calculée localement (base DB-IP Lite) : aucune adresse IP n'est envoyée à un service externe.
- Bandeau d'information, [page de confidentialité](https://theo.marescal.fr/confidentialite), droit d'opposition avec effacement immédiat, signal Global Privacy Control respecté, purge automatique après 13 mois.
- Panel d'administration accessible uniquement depuis des adresses IP autorisées : statistiques détaillées, carte des visiteurs, liens de campagne, parcours par adresse IP, exclusion des appareils personnels.

## Stack

| Domaine | Technologies |
|---|---|
| Application | Next.js 15 (App Router), React 19, TypeScript strict |
| Interface | Tailwind CSS v4, Framer Motion, Lucide, Simple Icons |
| Statistiques | better-sqlite3, ua-parser-js, MaxMind DB reader + DB-IP Lite, Leaflet |
| Contact | Nodemailer |
| Déploiement | Docker (image multi-étapes, sortie `standalone`), auto-hébergé sur Raspberry Pi derrière un reverse proxy et un CDN |

## Structure

```
src/
├── app/                  Pages (accueil, projets, confidentialité, panel /admin) et routes d'API
│   └── api/              contact, collecte des visites (track), service des PDF suivis (dl)
├── components/
│   ├── sections/         Sections de la page d'accueil et page projet
│   ├── ui/               Composants réutilisables (cartes, timeline, logos…)
│   ├── analytics/        Mesure d'audience côté navigateur et bandeau d'information
│   └── admin/            Graphiques, carte et tableaux du panel
├── data/                 Contenu du site (projets, expériences, certifications, rapports…)
├── lib/                  Utilitaires, contrôle d'accès, mesure d'audience (base, géolocalisation, requêtes)
└── middleware.ts         Accès au panel et suivi des documents PDF
public/                   Images, démos statiques
```

Les documents PDF (rapports, CV, attestations) ne sont pas versionnés ici : ils sont téléchargeables directement sur le site.

## Lancer le projet en local

Deux méthodes au choix :

| | Méthode A — Docker | Méthode B — Node.js |
|---|---|---|
| Pour | voir le site tel qu'en production | développer, tester le panel `/admin` |
| Logiciel à installer | Docker | Node.js |
| Panel `/admin` | non accessible (voir plus bas) | accessible |
| Visites enregistrées | non | oui |

### 1. Installer les prérequis

- **Git**, pour récupérer le code : [git-scm.com/downloads](https://git-scm.com/downloads). Sur macOS, il est fourni avec les outils de développement d'Apple (`xcode-select --install`).
- **Méthode A — Docker** :
  - macOS et Windows : [Docker Desktop](https://www.docker.com/products/docker-desktop/), puis lancer l'application (l'icône de la baleine doit apparaître) ;
  - Linux : [Docker Engine](https://docs.docker.com/engine/install/) avec le plugin Compose.
- **Méthode B — Node.js** : la version **LTS** (22 ou 24) depuis [nodejs.org/fr/download](https://nodejs.org/fr/download). npm est installé avec.

Vérifier l'installation dans un terminal (Terminal sur macOS, PowerShell sur Windows) :

```bash
git --version
docker --version && docker compose version   # méthode A
node -v && npm -v                            # méthode B : node v22 ou v24
```

### 2. Récupérer le code et le configurer

```bash
git clone https://github.com/TheoCybersecurity/Portfolio.git
cd Portfolio
cp .env.example .env
```

Sous Windows (PowerShell), remplacer la dernière commande par `Copy-Item .env.example .env`.

Les valeurs par défaut de `.env` suffisent pour un essai local : `ADMIN_IPS=127.0.0.1` ouvre le panel à ta machine, et le formulaire de contact répond « non configuré » tant que les variables `SMTP_*` sont vides. Voir [`.env.example`](.env.example) pour leur rôle.

### 3A. Lancer avec Docker

```bash
docker compose -f docker-compose.local.yml up -d --build
```

La première construction prend quelques minutes. Ouvrir ensuite **http://localhost:3000**.

| Action | Commande |
|---|---|
| Suivre les journaux | `docker compose -f docker-compose.local.yml logs -f` (Ctrl+C pour quitter) |
| Arrêter | `docker compose -f docker-compose.local.yml down` |
| Reconstruire après une modification du code | relancer la commande `up -d --build` ci-dessus |
| Tout supprimer (conteneur, image, données) | `docker compose -f docker-compose.local.yml down -v --rmi local` |

Si le port 3000 est déjà pris, choisir un autre port : `PORT=3001 docker compose -f docker-compose.local.yml up -d --build` (macOS, Linux), ou sous PowerShell `$env:PORT=3001; docker compose -f docker-compose.local.yml up -d --build`, puis ouvrir http://localhost:3001.

Ce mode reproduit la production, qui s'appuie sur un reverse proxy pour connaître l'adresse IP de chaque visiteur. Sans lui, le panel `/admin` répond « page introuvable » et les visites ne sont pas enregistrées. Pour les tester, utiliser la méthode B.

`docker-compose.yml` est la configuration du serveur de production : il ne fonctionne pas tel quel sur une autre machine.

### 3B. Lancer avec Node.js

```bash
npm install
npm run dev
```

`npm install` prend une à deux minutes. Quand le terminal affiche `Ready`, ouvrir :

- **http://localhost:3000** : le site ;
- **http://localhost:3000/admin** : le panel de statistiques.

Tes propres visites sont enregistrées mais classées « Mes visites », exclues par défaut : cliquer sur **Mes visites** en haut du panel pour les afficher. Les données locales sont créées dans le dossier `data/` (supprimer ce dossier remet les statistiques à zéro). Au premier lancement, les bases de géolocalisation (environ 65 Mo) y sont téléchargées.

Le site se recharge automatiquement à chaque modification du code. **Ctrl+C** dans le terminal arrête le serveur.

Pour vérifier que le code compile comme en production : `npm run build`.

### En cas de problème

| Symptôme | Solution |
|---|---|
| `Cannot connect to the Docker daemon` | lancer Docker Desktop et attendre qu'il soit démarré |
| `Port 3000 is already in use` (méthode B) | `npm run dev -- -p 3001`, puis http://localhost:3001 |
| `npm install` échoue sur `better-sqlite3` | utiliser une version LTS de Node.js (22 ou 24) ; sinon installer les outils de compilation : `xcode-select --install` (macOS) ou `sudo apt install build-essential python3` (Debian, Ubuntu) |
| Page « introuvable » sur `/admin` (méthode B) | vérifier `ADMIN_IPS=127.0.0.1` dans `.env`, puis relancer `npm run dev` |

## Droits

© Théo Marescal — tous droits réservés. Le code est publié pour consultation ; les textes, images et documents restent ma propriété.

Géolocalisation : [IP Geolocation by DB-IP](https://db-ip.com) (CC BY 4.0). Fonds de carte © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright).
