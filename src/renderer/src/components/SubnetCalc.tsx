import { Fragment, JSX, useState } from 'react'
import { ToolShell, TextInput, ErrorBanner } from './toolkit'

const toStr = (n: number): string => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')

/** Parse an IPv4 string into an unsigned 32-bit int, or null when invalid. */
function parseIp(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let out = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const n = Number(p)
    if (n > 255) return null
    out = (out << 8) | n
  }
  return out >>> 0
}

/** Parse a prefix from "/24", "24" or a dotted subnet mask "255.255.255.0". */
function parsePrefix(input: string): number | null {
  const t = input.trim().replace(/^\//, '')
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t)
    return n >= 0 && n <= 32 ? n : null
  }
  const mask = parseIp(t)
  if (mask === null) return null
  // A valid mask is a run of 1-bits followed by 0-bits.
  const inv = ~mask >>> 0
  if (((inv + 1) & inv) !== 0) return null
  let prefix = 0
  let m = mask
  while (m & 0x80000000) {
    prefix++
    m = (m << 1) >>> 0
  }
  return prefix
}

const SUBNET_CALC_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Berekent uit een IPv4-adres en een subnet alle netwerkgegevens: netwerkadres, broadcast,
      subnetmasker, wildcard, het hostbereik en het aantal bruikbare hosts.
    </p>
    <h4>Invoer</h4>
    <ul>
      <li>
        <b>IP-adres</b> — een IPv4-adres van vier octetten <code>0–255</code>, bijvoorbeeld{' '}
        <code>192.168.1.10</code>.
      </li>
      <li>
        <b>CIDR of subnetmasker</b> — de grootte van het netwerk als prefix (<code>/24</code> of{' '}
        <code>24</code>) of als dotted masker (<code>255.255.255.0</code>).
      </li>
    </ul>
    <p>
      Bij <code>/31</code> en <code>/32</code> gelden speciale regels (respectievelijk 0 en 1
      bruikbare host).
    </p>
  </>
)

function SubnetCalc(): JSX.Element {
  const [ip, setIp] = useState('192.168.1.10')
  const [cidr, setCidr] = useState('/24')

  const ipNum = parseIp(ip)
  const prefix = parsePrefix(cidr)

  let error: string | null = null
  if (ip.trim() && ipNum === null) error = 'Ongeldig IPv4-adres (vier octetten 0–255).'
  else if (cidr.trim() && prefix === null) error = 'Ongeldige CIDR of subnetmasker.'

  let rows: { label: string; value: string }[] | null = null
  if (ipNum !== null && prefix !== null) {
    const netmask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    const wildcard = ~netmask >>> 0
    const network = (ipNum & netmask) >>> 0
    const broadcast = (network | wildcard) >>> 0

    let firstHost: string
    let lastHost: string
    let usable: number
    if (prefix === 32) {
      firstHost = toStr(network)
      lastHost = toStr(network)
      usable = 1
    } else if (prefix === 31) {
      firstHost = toStr(network)
      lastHost = toStr(broadcast)
      usable = 0
    } else {
      firstHost = toStr((network + 1) >>> 0)
      lastHost = toStr((broadcast - 1) >>> 0)
      usable = 2 ** (32 - prefix) - 2
    }

    rows = [
      { label: 'Netwerkadres', value: toStr(network) },
      { label: 'Broadcast', value: toStr(broadcast) },
      { label: 'Subnetmasker', value: toStr(netmask) },
      { label: 'Wildcard', value: toStr(wildcard) },
      { label: 'Eerste host', value: firstHost },
      { label: 'Laatste host', value: lastHost },
      { label: 'Aantal bruikbare hosts', value: usable.toLocaleString('nl-NL') },
      { label: 'CIDR', value: `${toStr(network)}/${prefix}` }
    ]
  }

  return (
    <ToolShell
      title="Subnet-calculator"
      subtitle="Bereken netwerk, broadcast, hostbereik en meer uit een IP-adres en subnet."
      info={SUBNET_CALC_INFO}
    >
      <div className="panel tool-panel">
        <TextInput label="IP-adres" value={ip} onChange={setIp} mono placeholder="192.168.1.10" />
        <TextInput
          label="CIDR of subnetmasker"
          value={cidr}
          onChange={setCidr}
          mono
          placeholder="/24, 24 of 255.255.255.0"
        />
        <ErrorBanner message={error} />
        {rows && (
          <dl className="tk-kv">
            {rows.map((r) => (
              <Fragment key={r.label}>
                <dt>{r.label}</dt>
                <dd className="tk-mono">{r.value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>
    </ToolShell>
  )
}

export default SubnetCalc
