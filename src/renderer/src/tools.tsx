import { JSX } from 'react'
import type { BackendStatus } from '../../preload'
import BackgroundRemover from './components/BackgroundRemover'
import PrintLayout from './components/PrintLayout'
import ImageResize from './components/ImageResize'
import ImageConvert from './components/ImageConvert'
import PdfTools from './components/PdfTools'
import ImagePalette from './components/ImagePalette'
// Tekst
import TextCleanup from './components/TextCleanup'
import JsonTool from './components/JsonTool'
import Base64Url from './components/Base64Url'
import HashText from './components/HashText'
import UuidGen from './components/UuidGen'
import LoremIpsum from './components/LoremIpsum'
import TextDiff from './components/TextDiff'
import RegexTester from './components/RegexTester'
import PasswordGen from './components/PasswordGen'
// Datum & tijd
import LeapYear from './components/LeapYear'
import Seasons from './components/Seasons'
import DateDiff from './components/DateDiff'
import DateMath from './components/DateMath'
import AgeCalc from './components/AgeCalc'
import Countdown from './components/Countdown'
import UnixTime from './components/UnixTime'
import TimezoneConvert from './components/TimezoneConvert'
// Omzetters & data
import ColorConvert from './components/ColorConvert'
import CsvJson from './components/CsvJson'
import QrCode from './components/QrCode'
import ExifTool from './components/ExifTool'
import FileChecksum from './components/FileChecksum'

// Everything a tool needs from the app shell to render.
export interface ToolContext {
  backendStatus: BackendStatus
}

export interface ToolDef {
  id: string
  label: string
  icon: string
  category: string
  description: string
  render: (ctx: ToolContext) => JSX.Element
}

const CAT_IMAGES = 'Beeld & bestanden'
const CAT_PRINT = 'Printen'
const CAT_TEXT = 'Tekst'
const CAT_DATETIME = 'Datum & tijd'
const CAT_CONVERT = 'Omzetters & data'

/** Tools that call the Python sidecar are gated on backend readiness. */
function BackendGate({
  status,
  children
}: {
  status: BackendStatus
  children: JSX.Element
}): JSX.Element {
  if (status.state === 'ready') return children

  return (
    <div className="gate">
      {status.state === 'starting' ? (
        <>
          <div className="spinner" />
          <p>Python-server wordt gestart…</p>
        </>
      ) : (
        <>
          <h2>Backend kon niet starten</h2>
          <pre className="gate-error">{status.error}</pre>
          <p className="hint">
            Controleer de virtuele omgeving in <code>python-backend/.venv</code>.
          </p>
        </>
      )}
    </div>
  )
}

const gated =
  (node: JSX.Element) =>
  (ctx: ToolContext): JSX.Element =>
    <BackendGate status={ctx.backendStatus}>{node}</BackendGate>

// Single source of truth: the sidebar nav and the homepage tiles both derive
// from this list, so adding a tool is just one more entry (with its category).
export const TOOLS: ToolDef[] = [
  {
    id: 'background',
    label: 'Achtergrond verwijderen',
    icon: '✂️',
    category: CAT_IMAGES,
    description: 'Verwijder de achtergrond van een afbeelding met een pijplijn van technieken.',
    render: gated(<BackgroundRemover />)
  },
  {
    id: 'resize',
    label: 'Afbeelding verkleinen',
    icon: '📐',
    category: CAT_IMAGES,
    description: 'Schaal een afbeelding naar een kleinere maat of exacte afmetingen.',
    render: gated(<ImageResize />)
  },
  {
    id: 'convert',
    label: 'Formaat omzetten',
    icon: '🔄',
    category: CAT_IMAGES,
    description: 'Zet afbeeldingen om naar PNG/JPEG/WEBP of bundel ze tot één PDF.',
    render: gated(<ImageConvert />)
  },
  {
    id: 'palette',
    label: 'Kleuren uit afbeelding',
    icon: '🎨',
    category: CAT_IMAGES,
    description: 'Haal de dominante kleuren op als klikbare staaltjes met hex-code.',
    render: gated(<ImagePalette />)
  },
  {
    id: 'pdf',
    label: 'PDF-gereedschap',
    icon: '📄',
    category: CAT_IMAGES,
    description: 'Voeg samen, splits, draai of comprimeer PDF-bestanden.',
    render: gated(<PdfTools />)
  },
  {
    id: 'print',
    label: 'Print layout',
    icon: '🖨️',
    category: CAT_PRINT,
    description: 'Plaats een afbeelding op A4 — enkel of als raster — en print op ware grootte.',
    render: () => <PrintLayout />
  },

  // ---- Tekst ----
  {
    id: 'text-cleanup',
    label: 'Tekst opschonen & tellen',
    icon: '🧹',
    category: CAT_TEXT,
    description: 'Trim, ontdubbel en sorteer regels, wissel hoofdletters en tel tekens/woorden/regels.',
    render: () => <TextCleanup />
  },
  {
    id: 'json',
    label: 'JSON-gereedschap',
    icon: '🧾',
    category: CAT_TEXT,
    description: 'Opmaken, minifyen en valideren met een duidelijke foutmelding en regelnummer.',
    render: () => <JsonTool />
  },
  {
    id: 'base64-url',
    label: 'Base64 & URL',
    icon: '🔤',
    category: CAT_TEXT,
    description: 'Coderen en decoderen van Base64 en URL-tekst, met een schakelaar.',
    render: () => <Base64Url />
  },
  {
    id: 'hash',
    label: 'Hash-generator',
    icon: '🔐',
    category: CAT_TEXT,
    description: 'Bereken SHA-1, SHA-256 en SHA-512 van tekst via de Web Crypto API.',
    render: () => <HashText />
  },
  {
    id: 'uuid',
    label: 'UUID-generator',
    icon: '🆔',
    category: CAT_TEXT,
    description: 'Genereer één of meer willekeurige versie-4 UUID’s.',
    render: () => <UuidGen />
  },
  {
    id: 'lorem',
    label: 'Lorem ipsum',
    icon: '📝',
    category: CAT_TEXT,
    description: 'Genereer opvultekst: instelbaar aantal alinea’s, zinnen of woorden.',
    render: () => <LoremIpsum />
  },
  {
    id: 'diff',
    label: 'Tekst-diff',
    icon: '🔃',
    category: CAT_TEXT,
    description: 'Vergelijk twee teksten en markeer de verschillen op regelniveau.',
    render: () => <TextDiff />
  },
  {
    id: 'regex',
    label: 'Regex-tester',
    icon: '🔍',
    category: CAT_TEXT,
    description: 'Test een patroon met vlaggen tegen tekst; live matches en capture-groups.',
    render: () => <RegexTester />
  },
  {
    id: 'password',
    label: 'Wachtwoord-generator',
    icon: '🔑',
    category: CAT_TEXT,
    description: 'Genereer sterke wachtwoorden met instelbare lengte, tekensets en sterkte-indicatie.',
    render: () => <PasswordGen />
  },

  // ---- Datum & tijd ----
  {
    id: 'leap-year',
    label: 'Schrikkeljaar-checker',
    icon: '📅',
    category: CAT_DATETIME,
    description: 'Controleer of een jaar een schrikkeljaar is en lijst schrikkeljaren in een bereik.',
    render: () => <LeapYear />
  },
  {
    id: 'seasons',
    label: 'Astronomische seizoenen',
    icon: '🌗',
    category: CAT_DATETIME,
    description: 'De equinoxen en zonnewenden van een jaar, omgezet naar je lokale tijdzone.',
    render: () => <Seasons />
  },
  {
    id: 'date-diff',
    label: 'Datumverschil',
    icon: '📆',
    category: CAT_DATETIME,
    description: 'Dagen, weken, maanden en jaren tussen twee data, plus het aantal werkdagen.',
    render: () => <DateDiff />
  },
  {
    id: 'date-math',
    label: 'Datum-rekenen',
    icon: '➕',
    category: CAT_DATETIME,
    description: 'Tel dagen/weken/maanden/jaren bij een datum op of eraf; toon weekdag en ISO-week.',
    render: () => <DateMath />
  },
  {
    id: 'age',
    label: 'Leeftijd-calculator',
    icon: '🎂',
    category: CAT_DATETIME,
    description: 'Bereken de exacte leeftijd in jaren, maanden en dagen vanaf een geboortedatum.',
    render: () => <AgeCalc />
  },
  {
    id: 'countdown',
    label: 'Aftellen',
    icon: '⏳',
    category: CAT_DATETIME,
    description: 'Live aftellen naar een gekozen datum en tijd.',
    render: () => <Countdown />
  },
  {
    id: 'unix',
    label: 'Unix-timestamp ↔ datum',
    icon: '⏱️',
    category: CAT_DATETIME,
    description: 'Zet timestamps om naar datums en terug, in seconden en milliseconden.',
    render: () => <UnixTime />
  },
  {
    id: 'timezone',
    label: 'Tijdzone-omzetter',
    icon: '🌐',
    category: CAT_DATETIME,
    description: 'Zet een tijd om tussen twee tijdzones.',
    render: () => <TimezoneConvert />
  },

  // ---- Omzetters & data ----
  {
    id: 'color',
    label: 'Kleur-omzetter',
    icon: '🌈',
    category: CAT_CONVERT,
    description: 'Zet kleuren om tussen hex, rgb en hsl, met een live kleurstaal.',
    render: () => <ColorConvert />
  },
  {
    id: 'csv-json',
    label: 'CSV ↔ JSON',
    icon: '🔀',
    category: CAT_CONVERT,
    description: 'Zet CSV om naar JSON en terug, met detectie van de kop-rij.',
    render: () => <CsvJson />
  },
  {
    id: 'qr',
    label: 'QR-code generator',
    icon: '🔳',
    category: CAT_CONVERT,
    description: 'Maak een QR-code van tekst of een URL en download hem als PNG.',
    render: () => <QrCode />
  },
  {
    id: 'exif',
    label: 'EXIF-viewer & stripper',
    icon: '📷',
    category: CAT_CONVERT,
    description: 'Bekijk EXIF-data (incl. GPS) en download een kopie zonder metadata.',
    render: () => <ExifTool />
  },
  {
    id: 'checksum',
    label: 'Bestand-checksum',
    icon: '#️⃣',
    category: CAT_CONVERT,
    description: 'Bereken de SHA-256 van een bestand en vergelijk met een verwachte hash.',
    render: () => <FileChecksum />
  }
]

export interface ToolGroup {
  category: string
  tools: ToolDef[]
}

/** Group tools by category, preserving first-seen category and tool order. */
export function groupByCategory(tools: ToolDef[]): ToolGroup[] {
  const groups: ToolGroup[] = []
  for (const t of tools) {
    let g = groups.find((x) => x.category === t.category)
    if (!g) {
      g = { category: t.category, tools: [] }
      groups.push(g)
    }
    g.tools.push(t)
  }
  return groups
}
