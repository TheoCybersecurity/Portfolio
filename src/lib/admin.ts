// Partagé par le middleware (runtime Edge) et les pages serveur : aucun import Node ici.

/**
 * IP réelle du visiteur. Nginx Proxy Manager reconstitue l'IP client depuis
 * CF-Connecting-IP (module real_ip, restreint aux plages Cloudflare) et la pose
 * dans X-Real-IP en écrasant toute valeur envoyée par le client. On n'utilise
 * surtout pas le premier élément de X-Forwarded-For, que le client contrôle.
 */
export function getClientIp(headers: Headers): string | null {
  const ip = headers.get('x-real-ip')?.trim()
  if (ip) return ip
  // `npm run dev` n'a pas de reverse proxy : la requête vient forcément de la machine locale.
  // Jamais en production, où l'absence d'en-tête doit rester « IP inconnue ».
  return process.env.NODE_ENV === 'development' ? '127.0.0.1' : null
}

/** Adresse → suite de bits sous forme de BigInt, avec sa taille (32 ou 128). */
function toBits(ip: string): { value: bigint; size: number } | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.').map(Number)
    if (parts.some((p) => p > 255)) return null
    return { value: parts.reduce((acc, p) => (acc << BigInt(8)) | BigInt(p), BigInt(0)), size: 32 }
  }
  if (!ip.includes(':') || !/^[0-9a-f:]+$/i.test(ip)) return null
  const [head, tail, extra] = ip.split('::')
  if (extra !== undefined) return null
  const h = head ? head.split(':') : []
  const t = tail !== undefined && tail ? tail.split(':') : []
  const missing = 8 - h.length - t.length
  if (tail === undefined ? h.length !== 8 : missing < 1) return null
  const groups = [...h, ...Array<string>(tail === undefined ? 0 : missing).fill('0'), ...t]
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null
  return { value: groups.reduce((acc, g) => (acc << BigInt(16)) | BigInt(parseInt(g, 16)), BigInt(0)), size: 128 }
}

/** `rule` : adresse exacte (« 203.0.113.10 ») ou plage CIDR (« 2001:db8:1234:5678::/64 »). */
function matches(ip: string, rule: string): boolean {
  const [base, bitsRaw] = rule.split('/')
  const a = toBits(ip)
  const b = toBits(base)
  if (!a || !b || a.size !== b.size) return false
  const bits = bitsRaw === undefined ? a.size : Number(bitsRaw)
  if (!Number.isInteger(bits) || bits < 0 || bits > a.size) return false
  const shift = BigInt(a.size - bits)
  return a.value >> shift === b.value >> shift
}

export function getAdminIps(): string[] {
  return (process.env.ADMIN_IPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdminIp(ip: string | null): boolean {
  return ip !== null && getAdminIps().some((rule) => matches(ip, rule))
}
