import {
  siCisco, siPython, siDocker, siLinux, siProxmox, siMariadb,
  siPfsense, siGnubash, siNodered, siKalilinux, siCplusplus,
  siRaspberrypi, siWordpress, siAnsible, siGrafana, siPrometheus,
  siHtml5, siPhp, siQt, siMysql, siUbuntu, siNginx, siApache,
  siWireshark, siNodedotjs, siGit, siVirtualbox,
} from 'simple-icons'

type IconData = { title: string; hex: string; path: string }

const iconMap: Record<string, IconData> = {
  cisco: siCisco,
  python: siPython,
  docker: siDocker,
  linux: siLinux,
  proxmox: siProxmox,
  mariadb: siMariadb,
  pfsense: siPfsense,
  gnubash: siGnubash,
  nodered: siNodered,
  kalilinux: siKalilinux,
  cplusplus: siCplusplus,
  raspberrypi: siRaspberrypi,
  wordpress: siWordpress,
  ansible: siAnsible,
  grafana: siGrafana,
  prometheus: siPrometheus,
  html5: siHtml5,
  php: siPhp,
  qt: siQt,
  mysql: siMysql,
  ubuntu: siUbuntu,
  nginx: siNginx,
  apache: siApache,
  wireshark: siWireshark,
  nodedotjs: siNodedotjs,
  git: siGit,
  virtualbox: siVirtualbox,
}

function getDisplayColor(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b
  return brightness < 70 ? '#94A3B8' : `#${hex}`
}

interface TechLogoProps {
  slug: string
  size?: number
  className?: string
}

export function hasTechLogo(slug: string): boolean {
  return slug in iconMap
}

export default function TechLogo({ slug, size = 24, className }: TechLogoProps) {
  const icon = iconMap[slug.toLowerCase()]
  if (!icon) return null

  const color = getDisplayColor(icon.hex)

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={icon.title}
      className={className}
      style={{ fill: color, flexShrink: 0 }}
    >
      <path d={icon.path} />
    </svg>
  )
}
