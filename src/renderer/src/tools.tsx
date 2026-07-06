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
// Kleuren, tekst-data & bestanden
import ColorConvert from './components/ColorConvert'
import CsvJson from './components/CsvJson'
import QrCode from './components/QrCode'
import ExifTool from './components/ExifTool'
import FileChecksum from './components/FileChecksum'
import OppositeColor from './components/OppositeColor'
import ColorSet from './components/ColorSet'
import ColorHarmonies from './components/ColorHarmonies'
// Spellen & random
import CategoryRandomizer from './components/CategoryRandomizer'
import NameTeamDraw from './components/NameTeamDraw'
import Dice from './components/Dice'
import CoinFlip from './components/CoinFlip'
import WheelOfFortune from './components/WheelOfFortune'
import Shuffle from './components/Shuffle'
// Timers
import Stopwatch from './components/Stopwatch'
import CountdownTimer from './components/CountdownTimer'
import Pomodoro from './components/Pomodoro'
import Metronome from './components/Metronome'
// Wiskunde
import MathExpression from './components/MathExpression'
import EquationSolver from './components/EquationSolver'
import UnitConverter from './components/UnitConverter'
import FunctionPlotter from './components/FunctionPlotter'
import PercentInterest from './components/PercentInterest'
// Rekenaars
import TipCalc from './components/TipCalc'
import VatCalc from './components/VatCalc'
import DiscountCalc from './components/DiscountCalc'
import RatioCalc from './components/RatioCalc'
// Notities
import SnippetManager from './components/SnippetManager'
// Data-alchemie
import EncodingChain from './components/EncodingChain'
// Netwerk & systeem
import WifiQr from './components/WifiQr'
import MyIp from './components/MyIp'
import SubnetCalc from './components/SubnetCalc'
import SystemInfo from './components/SystemInfo'
import PortReference from './components/PortReference'

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

const CAT_IMAGES = 'Afbeelding'
const CAT_FILES = 'Bestanden'
const CAT_PRINT = 'Printen'
const CAT_COLORS = 'Kleuren'
const CAT_TEXT = 'Tekst'
const CAT_DATETIME = 'Datum & tijd'
const CAT_NETWORK = 'Netwerk & systeem'
const CAT_GAMES = 'Spellen & random'
const CAT_TIMERS = 'Timers'
const CAT_MATH = 'Wiskunde'
const CAT_CALC = 'Rekenaars'
const CAT_NOTES = 'Notities'
const CAT_ALCHEMY = 'Data-alchemie'

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
  // ---- Afbeelding ----
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
    label: 'Afbeelding schalen',
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
    label: 'Color pick',
    icon: '🎨',
    category: CAT_IMAGES,
    description: 'Haal de dominante kleuren op als klikbare staaltjes met hex-code.',
    render: gated(<ImagePalette />)
  },
  {
    id: 'exif',
    label: 'EXIF-viewer & stripper',
    icon: '📷',
    category: CAT_IMAGES,
    description: 'Bekijk EXIF-data (incl. GPS) en download een kopie zonder metadata.',
    render: () => <ExifTool />
  },

  // ---- Bestanden ----
  {
    id: 'pdf',
    label: 'PDF-gereedschap',
    icon: '📄',
    category: CAT_FILES,
    description: 'Voeg samen, splits, draai of comprimeer PDF-bestanden.',
    render: gated(<PdfTools />)
  },
  {
    id: 'checksum',
    label: 'Bestand-checksum',
    icon: '#️⃣',
    category: CAT_FILES,
    description: 'Bereken de SHA-256 van een bestand en vergelijk met een verwachte hash.',
    render: () => <FileChecksum />
  },

  // ---- Printen ----
  {
    id: 'print',
    label: 'Print layout',
    icon: '🖨️',
    category: CAT_PRINT,
    description: 'Plaats een afbeelding op A4 — enkel of als raster — en print op ware grootte.',
    render: () => <PrintLayout />
  },

  // ---- Kleuren ----
  {
    id: 'color',
    label: 'Kleur-omzetter',
    icon: '🌈',
    category: CAT_COLORS,
    description: 'Zet kleuren om tussen hex, rgb en hsl, met een live kleurstaal.',
    render: () => <ColorConvert />
  },
  {
    id: 'opposite-color',
    label: 'Tegenovergestelde kleur',
    icon: '🎭',
    category: CAT_COLORS,
    description: 'Complementaire kleur, RGB-inversie en de beste leesbare tekstkleur.',
    render: () => <OppositeColor />
  },
  {
    id: 'color-set',
    label: 'Kleurenset-generator',
    icon: '🖌️',
    category: CAT_COLORS,
    description: 'Maak N passende kleuren uit een basiskleur (harmonisch, analoog of monochroom).',
    render: () => <ColorSet />
  },
  {
    id: 'color-harmony',
    label: 'Kleurharmonieën',
    icon: '🖍️',
    category: CAT_COLORS,
    description: 'Complementair, analoog, triadisch, tetradisch, split-complementair en monochroom.',
    render: () => <ColorHarmonies />
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
    id: 'csv-json',
    label: 'CSV ↔ JSON',
    icon: '🔀',
    category: CAT_TEXT,
    description: 'Zet CSV om naar JSON en terug, met detectie van de kop-rij.',
    render: () => <CsvJson />
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
    id: 'qr',
    label: 'QR-code generator',
    icon: '🔳',
    category: CAT_TEXT,
    description: 'Maak een QR-code van tekst of een URL en download hem als PNG.',
    render: () => <QrCode />
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
    id: 'password',
    label: 'Wachtwoord-generator',
    icon: '🔑',
    category: CAT_TEXT,
    description: 'Genereer sterke wachtwoorden met instelbare lengte, tekensets en sterkte-indicatie.',
    render: () => <PasswordGen />
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
    label: 'Aftellen naar datum',
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

  // ---- Netwerk & systeem ----
  {
    id: 'wifi-qr',
    label: 'Wifi-QR',
    icon: '📶',
    category: CAT_NETWORK,
    description: 'Maak een scanbare QR-code waarmee je telefoon direct met je wifi verbindt.',
    render: () => <WifiQr />
  },
  {
    id: 'my-ip',
    label: 'Mijn IP',
    icon: '📡',
    category: CAT_NETWORK,
    description: 'Toont je publieke en lokale IP-adres.',
    render: () => <MyIp />
  },
  {
    id: 'subnet',
    label: 'Subnet-calculator',
    icon: '🧮',
    category: CAT_NETWORK,
    description: 'Bereken netwerkadres, broadcast, hostbereik en aantal hosts uit IP + subnet/CIDR.',
    render: () => <SubnetCalc />
  },
  {
    id: 'useragent',
    label: 'User-agent & systeeminfo',
    icon: '🖥️',
    category: CAT_NETWORK,
    description: 'Browser- en OS-info, schermresolutie, tijdzone en taal van je apparaat.',
    render: () => <SystemInfo />
  },
  {
    id: 'ports',
    label: 'Poort-referentie',
    icon: '🔌',
    category: CAT_NETWORK,
    description: 'Doorzoekbare lijst van veelgebruikte netwerkpoorten en wat erop draait.',
    render: () => <PortReference />
  },

  // ---- Spellen & random ----
  {
    id: 'randomizer',
    label: 'Categorie-randomizer',
    icon: '🗂️',
    category: CAT_GAMES,
    description: 'Kies een categorie en trek een willekeurig item — met je eigen bewerkbare lijsten.',
    render: () => <CategoryRandomizer />
  },
  {
    id: 'name-draw',
    label: 'Naam- & teamtrekker',
    icon: '🎯',
    category: CAT_GAMES,
    description: 'Trek een willekeurige winnaar of verdeel namen eerlijk over teams.',
    render: () => <NameTeamDraw />
  },
  {
    id: 'dice',
    label: 'Dobbelsteen',
    icon: '🎲',
    category: CAT_GAMES,
    description: 'Gooi met een instelbaar aantal dobbelstenen en zijden; toont worpen en som.',
    render: () => <Dice />
  },
  {
    id: 'coin',
    label: 'Munt opgooien',
    icon: '🪙',
    category: CAT_GAMES,
    description: 'Kop of munt, met een korte animatie en een teller.',
    render: () => <CoinFlip />
  },
  {
    id: 'wheel',
    label: 'Rad van fortuin',
    icon: '🎡',
    category: CAT_GAMES,
    description: 'Voer eigen opties in en laat een draaiend rad een winnaar aanwijzen.',
    render: () => <WheelOfFortune />
  },
  {
    id: 'shuffle',
    label: 'Volgorde / shuffle',
    icon: '🔁',
    category: CAT_GAMES,
    description: 'Zet een lijst in willekeurige volgorde — handig voor wie er aan de beurt is.',
    render: () => <Shuffle />
  },

  // ---- Timers ----
  {
    id: 'stopwatch',
    label: 'Stopwatch',
    icon: '⏱️',
    category: CAT_TIMERS,
    description: 'Start, stop en reset met ronde-tijden (laps).',
    render: () => <Stopwatch />
  },
  {
    id: 'timer',
    label: 'Afteltimer',
    icon: '⏲️',
    category: CAT_TIMERS,
    description: 'Meerdere afteltimers met labels tegelijk, met geluidssignaal bij afloop.',
    render: () => <CountdownTimer />
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: '🍅',
    category: CAT_TIMERS,
    description: 'Werk- en pauzecycli met een teller van voltooide sessies.',
    render: () => <Pomodoro />
  },
  {
    id: 'metronome',
    label: 'Metronoom',
    icon: '🎵',
    category: CAT_TIMERS,
    description: 'Instelbare BPM en maatsoort met een klik via de Web Audio API.',
    render: () => <Metronome />
  },

  // ---- Wiskunde ----
  {
    id: 'math-expression',
    label: 'Expressie-rekenmachine',
    icon: '🧮',
    category: CAT_MATH,
    description: 'Wetenschappelijke expressies met variabelen en eigen functies, regel voor regel.',
    render: () => <MathExpression />
  },
  {
    id: 'equation-solver',
    label: 'Vergelijking oplossen',
    icon: '📐',
    category: CAT_MATH,
    description: 'Los lineaire en kwadratische vergelijkingen op, met tussenstappen en discriminant.',
    render: () => <EquationSolver />
  },
  {
    id: 'unit-converter',
    label: 'Eenheden-omrekenaar',
    icon: '📏',
    category: CAT_MATH,
    description: 'Reken om tussen lengte, gewicht, temperatuur, oppervlak, volume, snelheid en data.',
    render: () => <UnitConverter />
  },
  {
    id: 'function-plotter',
    label: 'Functie-plotter',
    icon: '📈',
    category: CAT_MATH,
    description: 'Teken de grafiek van f(x) met een instelbaar bereik en automatische y-schaal.',
    render: () => <FunctionPlotter />
  },
  {
    id: 'percent-interest',
    label: 'Percentage & rente',
    icon: '📊',
    category: CAT_MATH,
    description: 'Procent van een waarde, procentuele verandering en samengestelde rente met inleg.',
    render: () => <PercentInterest />
  },

  // ---- Rekenaars ----
  {
    id: 'tip-calc',
    label: 'Fooi-calculator',
    icon: '🧾',
    category: CAT_CALC,
    description: 'Bereken de fooi en verdeel het totaal eerlijk over meerdere personen.',
    render: () => <TipCalc />
  },
  {
    id: 'vat-calc',
    label: 'BTW-rekenaar',
    icon: '🧮',
    category: CAT_CALC,
    description: 'Reken tussen bedragen in- en exclusief btw, met instelbaar tarief.',
    render: () => <VatCalc />
  },
  {
    id: 'discount-calc',
    label: 'Korting-rekenaar',
    icon: '🏷️',
    category: CAT_CALC,
    description: 'Van originele prijs en korting naar eindprijs en besparing, met stapelkorting.',
    render: () => <DiscountCalc />
  },
  {
    id: 'ratio-calc',
    label: 'Verhouding & schaal',
    icon: '⚖️',
    category: CAT_CALC,
    description: 'Los een verhouding a : b = c : d op en vereenvoudig — laat één veld leeg.',
    render: () => <RatioCalc />
  },

  // ---- Notities ----
  {
    id: 'snippets',
    label: 'Snippet-manager',
    icon: '📌',
    category: CAT_NOTES,
    description: 'Bewaar korte teksten met een label, doorzoekbaar, met kopieerknop per snippet.',
    render: () => <SnippetManager />
  },

  // ---- Data-alchemie ----
  {
    id: 'encoding-chain',
    label: 'Encoding-keten',
    icon: '⛓️',
    category: CAT_ALCHEMY,
    description: 'Jaag tekst door lagen Base64/hex/binair/morse heen en terug, met elke tussenstap zichtbaar.',
    render: () => <EncodingChain />
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
