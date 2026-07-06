import { JSX } from 'react'
import type { BackendStatus } from '../../preload'
import BackgroundRemover from './components/BackgroundRemover'
import PrintLayout from './components/PrintLayout'

// Everything a tool needs from the app shell to render.
export interface ToolContext {
  backendStatus: BackendStatus
}

export interface ToolDef {
  id: string
  label: string
  icon: string
  description: string
  render: (ctx: ToolContext) => JSX.Element
}

/** The background tool needs the Python sidecar; gate it on backend readiness. */
function BackgroundGate({ status }: { status: BackendStatus }): JSX.Element {
  if (status.state === 'ready') return <BackgroundRemover />

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

// Single source of truth: the sidebar nav and the homepage tiles both derive
// from this list, so adding a tool is just one more entry here.
export const TOOLS: ToolDef[] = [
  {
    id: 'background',
    label: 'Achtergrond verwijderen',
    icon: '✂️',
    description: 'Verwijder de achtergrond van een afbeelding met een pijplijn van technieken.',
    render: (ctx) => <BackgroundGate status={ctx.backendStatus} />
  },
  {
    id: 'print',
    label: 'Print layout',
    icon: '🖨️',
    description: 'Plaats een afbeelding op A4 — enkel of als raster — en print op ware grootte.',
    render: () => <PrintLayout />
  }
]
