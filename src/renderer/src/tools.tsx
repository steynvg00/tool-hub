import { JSX } from 'react'
import type { BackendStatus } from '../../preload'
import BackgroundRemover from './components/BackgroundRemover'
import PrintLayout from './components/PrintLayout'
import ImageResize from './components/ImageResize'
import ImageConvert from './components/ImageConvert'
import PdfTools from './components/PdfTools'
import ImagePalette from './components/ImagePalette'

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
