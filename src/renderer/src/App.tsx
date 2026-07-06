import { JSX, useEffect, useState } from 'react'
import type { BackendStatus } from '../../preload'
import Home from './components/Home'
import { TOOLS } from './tools'

// 'home' shows the landing page; any other value is a tool id.
type View = 'home' | string

function App(): JSX.Element {
  const [view, setView] = useState<View>('home')
  const [status, setStatus] = useState<BackendStatus>({
    state: 'starting',
    baseUrl: 'http://127.0.0.1:8756'
  })

  useEffect(() => {
    window.api.backend.getStatus().then(setStatus).catch(() => {})
    return window.api.backend.onStatus(setStatus)
  }, [])

  const statusLabel =
    status.state === 'ready'
      ? 'Backend actief'
      : status.state === 'starting'
        ? 'Backend start…'
        : 'Backend offline'

  const activeTool = TOOLS.find((t) => t.id === view)

  return (
    <div className="app-shell">
      <nav className="app-sidebar">
        <div className="app-brand">Tool Hub</div>

        <button
          className={view === 'home' ? 'nav-item on' : 'nav-item'}
          onClick={() => setView('home')}
        >
          <span className="nav-icon">🏠</span>
          Home
        </button>

        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={view === t.id ? 'nav-item on' : 'nav-item'}
            onClick={() => setView(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}

        <div className="app-backend" title={status.error ?? statusLabel}>
          <span className={`status-dot ${status.state}`} />
          {statusLabel}
        </div>
      </nav>

      <main className="tool-content">
        {activeTool ? (
          activeTool.render({ backendStatus: status })
        ) : (
          <Home tools={TOOLS} onOpen={setView} />
        )}
      </main>
    </div>
  )
}

export default App
