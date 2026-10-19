import UAParser from 'ua-parser-js'

const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|scrapy|phantom|selenium|puppeteer|playwright/i

/** Client Hints haute entropie (Chromium) : seules sources fiables pour Windows 11 ou la vraie version de macOS. */
export interface UaHints {
  platform?: string
  platformVersion?: string
  model?: string
  architecture?: string
  bitness?: string
  fullVersionList?: { brand: string; version: string }[]
}

export interface ParsedUa {
  browser: string | null
  browser_version: string | null
  engine: string | null
  os: string | null
  os_version: string | null
  device_type: string
  device_vendor: string | null
  device_model: string | null
  cpu_arch: string | null
  is_bot: boolean
}

export function parseUserAgent(ua: string, hints?: UaHints, webdriver = false): ParsedUa {
  const r = new UAParser(ua).getResult()

  let osVersion = r.os.version ?? null
  if (hints?.platformVersion) {
    const major = Number(hints.platformVersion.split('.')[0])
    if (hints.platform === 'Windows' && Number.isFinite(major)) {
      osVersion = major >= 13 ? '11' : major > 0 ? '10' : osVersion
    } else if (hints.platform === 'macOS' || hints.platform === 'Android') {
      osVersion = hints.platformVersion.replace(/(\.0)+$/, '') || osVersion
    }
  }

  let browserVersion = r.browser.version ?? null
  const brand = hints?.fullVersionList?.find(
    (b) => r.browser.name && b.brand.toLowerCase().includes(r.browser.name.toLowerCase().split(' ')[0])
  )
  if (brand) browserVersion = brand.version

  const arch =
    hints?.architecture ? `${hints.architecture}${hints.bitness ? `-${hints.bitness}` : ''}` : r.cpu.architecture ?? null

  // ua-parser ne renseigne le type que pour les appareils mobiles/tablettes/TV…
  const deviceType = r.device.type ?? 'desktop'

  return {
    browser: r.browser.name ?? null,
    browser_version: browserVersion,
    engine: r.engine.name ?? null,
    os: r.os.name ?? null,
    os_version: osVersion,
    device_type: deviceType,
    device_vendor: r.device.vendor ?? null,
    device_model: hints?.model || r.device.model || null,
    cpu_arch: arch,
    is_bot: webdriver || BOT_RE.test(ua),
  }
}
