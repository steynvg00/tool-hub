import { JSX, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ToolShell, TextArea, ErrorBanner } from './toolkit'
import { NumberField } from './ToolFields'

function QrCode(): JSX.Element {
  const [text, setText] = useState('')
  const [size, setSize] = useState(256)
  const [error, setError] = useState<string | null>(null)
  const [drawn, setDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!text) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    let cancelled = false
    QRCode.toCanvas(canvas, text, { width: size, margin: 2 })
      .then(() => {
        if (!cancelled) {
          setDrawn(true)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDrawn(false)
          setError(`Kon geen QR-code maken: ${(e as Error).message}`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [text, size])

  const ready = Boolean(text) && drawn && !error

  const download = (): void => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr.png'
    a.click()
  }

  return (
    <ToolShell
      title="QR-code generator"
      subtitle="Maak een QR-code van tekst of een URL en download hem als PNG."
    >
      <div className="panel">
        <TextArea label="Tekst of URL" value={text} onChange={setText} rows={4} mono={false} />
        <NumberField label="Grootte (px)" value={size} min={64} max={1024} onChange={setSize} />
        <ErrorBanner message={text ? error : null} />
      </div>
      <div className="panel">
        <div className="tk-qr" style={{ display: ready ? 'inline-block' : 'none' }}>
          <canvas ref={canvasRef} />
        </div>
        {!ready && <p className="tk-note">Voer tekst of een URL in om een QR-code te maken.</p>}
        <div className="tk-actions">
          <button className="btn btn-primary" disabled={!ready} onClick={download}>
            Download als PNG
          </button>
        </div>
      </div>
    </ToolShell>
  )
}

export default QrCode
