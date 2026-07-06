import { networkInterfaces } from 'os'

/** Non-internal IPv4 addresses of this machine, straight from the OS. */
export function getLocalIps(): string[] {
  const nets = networkInterfaces()
  const out: string[] = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address)
    }
  }
  return out
}

// Public-IP lookup runs in the main process (Node), so it isn't subject to the
// renderer's Content-Security-Policy that blocks external fetches. Several
// sources are tried in turn for resilience.
const SERVICES: { url: string; json: boolean }[] = [
  { url: 'https://api.ipify.org?format=json', json: true },
  { url: 'https://ipinfo.io/json', json: true },
  { url: 'https://ifconfig.co/json', json: true },
  { url: 'https://icanhazip.com', json: false }
]

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export async function getPublicIp(): Promise<string> {
  const problems: string[] = []
  for (const svc of SERVICES) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(svc.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ToolHub/1.0', Accept: svc.json ? 'application/json' : 'text/plain' }
      })
      if (!res.ok) {
        problems.push(`${hostOf(svc.url)}: HTTP ${res.status}`)
        continue
      }
      let ip = ''
      if (svc.json) {
        const data = (await res.json()) as { ip?: string }
        ip = (data.ip ?? '').trim()
      } else {
        ip = (await res.text()).trim()
      }
      if (ip) return ip
      problems.push(`${hostOf(svc.url)}: geen IP in het antwoord`)
    } catch (e) {
      const msg = (e as Error).name === 'AbortError' ? 'time-out' : (e as Error).message
      problems.push(`${hostOf(svc.url)}: ${msg}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(
    'Geen van de IP-diensten was bereikbaar. Controleer je internetverbinding of een firewall/proxy. ' +
      `Details: ${problems.join(' · ')}`
  )
}
