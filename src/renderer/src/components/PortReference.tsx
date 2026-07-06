import { JSX, useState } from 'react'
import { ToolShell, TextInput, Note } from './toolkit'

const PORTS: { port: number; proto: string; service: string; desc: string }[] = [
  { port: 20, proto: 'TCP', service: 'FTP-data', desc: 'Bestandsoverdracht (datakanaal)' },
  { port: 21, proto: 'TCP', service: 'FTP', desc: 'Bestandsoverdracht (besturing)' },
  { port: 22, proto: 'TCP', service: 'SSH', desc: 'Beveiligde shell en bestandsoverdracht' },
  { port: 23, proto: 'TCP', service: 'Telnet', desc: 'Onversleutelde terminaltoegang' },
  { port: 25, proto: 'TCP', service: 'SMTP', desc: 'E-mail verzenden tussen servers' },
  { port: 53, proto: 'TCP/UDP', service: 'DNS', desc: 'Naamresolutie van domeinen' },
  { port: 67, proto: 'UDP', service: 'DHCP', desc: 'IP-adressen toewijzen (server)' },
  { port: 68, proto: 'UDP', service: 'DHCP', desc: 'IP-adressen toewijzen (client)' },
  { port: 80, proto: 'TCP', service: 'HTTP', desc: 'Onversleuteld webverkeer' },
  { port: 110, proto: 'TCP', service: 'POP3', desc: 'E-mail ophalen van server' },
  { port: 123, proto: 'UDP', service: 'NTP', desc: 'Tijdsynchronisatie' },
  { port: 143, proto: 'TCP', service: 'IMAP', desc: 'E-mail lezen op de server' },
  { port: 161, proto: 'UDP', service: 'SNMP', desc: 'Netwerkapparaten beheren en monitoren' },
  { port: 389, proto: 'TCP/UDP', service: 'LDAP', desc: 'Adres- en gebruikersdatabase' },
  { port: 443, proto: 'TCP', service: 'HTTPS', desc: 'Versleuteld webverkeer (TLS)' },
  { port: 445, proto: 'TCP', service: 'SMB', desc: 'Windows-bestands- en printerdeling' },
  { port: 465, proto: 'TCP', service: 'SMTPS', desc: 'E-mail verzenden over TLS' },
  { port: 587, proto: 'TCP', service: 'SMTP (submission)', desc: 'E-mail indienen door clients' },
  { port: 636, proto: 'TCP', service: 'LDAPS', desc: 'LDAP over TLS' },
  { port: 993, proto: 'TCP', service: 'IMAPS', desc: 'IMAP over TLS' },
  { port: 995, proto: 'TCP', service: 'POP3S', desc: 'POP3 over TLS' },
  { port: 1080, proto: 'TCP', service: 'SOCKS', desc: 'SOCKS-proxyserver' },
  { port: 1194, proto: 'UDP', service: 'OpenVPN', desc: 'VPN-tunnelverbinding' },
  { port: 1433, proto: 'TCP', service: 'MS SQL', desc: 'Microsoft SQL Server-database' },
  { port: 1521, proto: 'TCP', service: 'Oracle', desc: 'Oracle-database' },
  { port: 3306, proto: 'TCP', service: 'MySQL', desc: 'MySQL/MariaDB-database' },
  { port: 3389, proto: 'TCP', service: 'RDP', desc: 'Windows extern bureaublad' },
  { port: 5060, proto: 'TCP/UDP', service: 'SIP', desc: 'VoIP-oproepen opzetten' },
  { port: 5432, proto: 'TCP', service: 'PostgreSQL', desc: 'PostgreSQL-database' },
  { port: 5900, proto: 'TCP', service: 'VNC', desc: 'Extern beeldscherm delen' },
  { port: 6379, proto: 'TCP', service: 'Redis', desc: 'In-memory sleutel-waarde-opslag' },
  { port: 8080, proto: 'TCP', service: 'HTTP-alt', desc: 'Alternatieve HTTP-poort en proxy' },
  { port: 8443, proto: 'TCP', service: 'HTTPS-alt', desc: 'Alternatieve HTTPS-poort' },
  { port: 9200, proto: 'TCP', service: 'Elasticsearch', desc: 'Zoek- en analyse-engine (REST)' },
  { port: 11211, proto: 'TCP/UDP', service: 'Memcached', desc: 'Gedistribueerde cache' },
  { port: 27017, proto: 'TCP', service: 'MongoDB', desc: 'MongoDB-documentdatabase' },
  { port: 25565, proto: 'TCP', service: 'Minecraft', desc: 'Minecraft-gameserver' }
]

function PortReference(): JSX.Element {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const results = q
    ? PORTS.filter(
        (p) =>
          String(p.port).includes(q) ||
          p.service.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q)
      )
    : PORTS

  return (
    <ToolShell
      title="Poort-referentie"
      subtitle="Zoek snel op welke dienst bij een bekende netwerkpoort hoort."
    >
      <div className="panel tool-panel">
        <TextInput
          label="Zoeken"
          value={query}
          onChange={setQuery}
          placeholder="Bijv. 443, SSH of database"
        />
        <Note>
          {results.length === 0
            ? 'Geen resultaten'
            : `${results.length} van ${PORTS.length} poorten`}
        </Note>
        {results.length > 0 && (
          <div className="tk-table-wrap">
            <table className="tk-table">
              <thead>
                <tr>
                  <th>Poort</th>
                  <th>Protocol</th>
                  <th>Dienst</th>
                  <th>Omschrijving</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={`${p.port}-${p.service}`}>
                    <td className="tk-mono">{p.port}</td>
                    <td>{p.proto}</td>
                    <td>{p.service}</td>
                    <td>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolShell>
  )
}

export default PortReference
