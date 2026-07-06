import { JSX } from 'react'
import type { ToolDef } from '../tools'

interface Props {
  tools: ToolDef[]
  onOpen: (id: string) => void
}

/** Landing page: a tile per tool, driven entirely by the shared TOOLS registry. */
function Home({ tools, onOpen }: Props): JSX.Element {
  return (
    <div className="home">
      <header className="home-header">
        <h1>Tool Hub</h1>
        <p>Kies een tool om te beginnen.</p>
      </header>

      <div className="home-grid">
        {tools.map((t) => (
          <button key={t.id} className="tool-tile" onClick={() => onOpen(t.id)}>
            <span className="tile-icon">{t.icon}</span>
            <span className="tile-label">{t.label}</span>
            <span className="tile-desc">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Home
