import { JSX, useEffect, useRef, useState } from 'react'
import { fileFromDataTransfer } from '../lib/collectedFiles'

// px per mm at 96dpi — used only for the on-screen preview scale & drag math.
// The page itself is sized in real mm, so what you see prints 1:1.
const MM = 96 / 25.4

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(v, hi))

type Orient = 'portrait' | 'landscape'
type Mode = 'free' | 'grid'

const pageMm = (orient: Orient): { w: number; h: number } =>
  orient === 'portrait' ? { w: 210, h: 297 } : { w: 297, h: 210 }

const ALIGN: [string, string][] = [
  ['tl', '↖'],
  ['tc', '↑'],
  ['tr', '↗'],
  ['ml', '←'],
  ['mc', '●'],
  ['mr', '→'],
  ['bl', '↙'],
  ['bc', '↓'],
  ['br', '↘']
]

function PrintLayout(): JSX.Element {
  const [src, setSrc] = useState<string | null>(null)
  const [nat, setNat] = useState({ w: 1, h: 1 })
  const [orient, setOrient] = useState<Orient>('portrait')
  const [mode, setMode] = useState<Mode>('free')

  const [wMm, setWMm] = useState(80) // free placement width
  const [xMm, setXMm] = useState(20) // free placement top-left, in mm
  const [yMm, setYMm] = useState(20)

  const [cols, setCols] = useState(3)
  const [rows, setRows] = useState(5)
  const [gap, setGap] = useState(4)
  const [margin, setMargin] = useState(8)

  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [hl, setHl] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scaleRef = useRef(1)

  // Scale the preview so a full A4 fits comfortably inside the stage.
  useEffect(() => {
    const recompute = (): void => {
      const stage = stageRef.current
      if (!stage) return
      const p = pageMm(orient)
      const availW = stage.clientWidth - 60
      const availH = stage.clientHeight - 60
      const s = Math.min(availW / (p.w * MM), availH / (p.h * MM), 1)
      const clamped = s > 0 ? s : 1
      scaleRef.current = clamped
      setScale(clamped)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    if (stageRef.current) ro.observe(stageRef.current)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [orient, mode, src])

  // Keep the free image inside the page when orientation / width / image changes.
  useEffect(() => {
    const p = pageMm(orient)
    setWMm((w) => clamp(w, 10, p.w))
  }, [orient])

  useEffect(() => {
    const p = pageMm(orient)
    const hMm = wMm * (nat.h / nat.w)
    setXMm((x) => clamp(x, 0, Math.max(0, p.w - wMm)))
    setYMm((y) => clamp(y, 0, Math.max(0, p.h - hMm)))
  }, [wMm, orient, nat])

  // Set the @page size to match orientation so the sheet feeds correctly, and
  // keep it in sync so both the print button and Cmd/Ctrl+P behave the same.
  useEffect(() => {
    const id = 'pl-page-rule'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = id
      document.head.appendChild(el)
    }
    el.textContent = `@media print { @page { size: A4 ${orient}; margin: 0; } }`
  }, [orient])

  useEffect(() => () => document.getElementById('pl-page-rule')?.remove(), [])

  const loadFile = (file?: File | null): void => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        setSrc(dataUrl)
        setNat({ w: img.naturalWidth, h: img.naturalHeight })
        // sensible default width: ~1/3 of the page width
        setWMm(Math.round(pageMm(orient).w / 3))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const onFreeMouseDown = (e: React.MouseEvent): void => {
    if (!src) return
    e.preventDefault()
    const s = scaleRef.current
    const startX = e.clientX
    const startY = e.clientY
    const ox = xMm
    const oy = yMm
    const p = pageMm(orient)
    const hMm = wMm * (nat.h / nat.w)
    const maxX = Math.max(0, p.w - wMm)
    const maxY = Math.max(0, p.h - hMm)
    const move = (ev: MouseEvent): void => {
      const dxMm = (ev.clientX - startX) / (MM * s)
      const dyMm = (ev.clientY - startY) / (MM * s)
      setXMm(clamp(ox + dxMm, 0, maxX))
      setYMm(clamp(oy + dyMm, 0, maxY))
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setDragging(false)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    setDragging(true)
  }

  const align = (a: string): void => {
    const p = pageMm(orient)
    const hMm = wMm * (nat.h / nat.w)
    if (a[1] === 'l') setXMm(0)
    else if (a[1] === 'c') setXMm((p.w - wMm) / 2)
    else setXMm(p.w - wMm)
    if (a[0] === 't') setYMm(0)
    else if (a[0] === 'm') setYMm((p.h - hMm) / 2)
    else setYMm(p.h - hMm)
  }

  // Derived geometry for the current render.
  const p = pageMm(orient)
  const hMm = wMm * (nat.h / nat.w)
  const left = clamp(xMm, 0, Math.max(0, p.w - wMm))
  const top = clamp(yMm, 0, Math.max(0, p.h - hMm))

  return (
    <div className="pl-tool">
      <aside className="pl-controls">
        <h1>Print layout</h1>
        <p className="hint">
          Plaats je afbeelding, kies formaat of raster, en print op echte A4-maat.
        </p>

        <div className="pl-group">
          <div
            className={hl ? 'pl-drop hl' : 'pl-drop'}
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault()
              setHl(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setHl(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setHl(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setHl(false)
              void fileFromDataTransfer(e.dataTransfer).then((f) => loadFile(f))
            }}
          >
            {src ? 'Andere afbeelding kiezen' : 'Klik of sleep een afbeelding hierheen'}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
        </div>

        <div className="pl-group">
          <label className="pl-title">Oriëntatie</label>
          <div className="pl-seg">
            <button className={orient === 'portrait' ? 'on' : ''} onClick={() => setOrient('portrait')}>
              Staand
            </button>
            <button
              className={orient === 'landscape' ? 'on' : ''}
              onClick={() => setOrient('landscape')}
            >
              Liggend
            </button>
          </div>
        </div>

        <div className="pl-group">
          <label className="pl-title">Modus</label>
          <div className="pl-seg">
            <button className={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>
              Enkel plaatsen
            </button>
            <button className={mode === 'grid' ? 'on' : ''} onClick={() => setMode('grid')}>
              Raster
            </button>
          </div>
        </div>

        {mode === 'free' ? (
          <>
            <div className="pl-field">
              <label>Breedte: {Math.round(wMm)} mm</label>
              <input
                type="range"
                min={10}
                max={p.w}
                value={wMm}
                onChange={(e) => setWMm(+e.target.value)}
              />
            </div>
            <div className="pl-group">
              <label className="pl-title">Uitlijnen</label>
              <div className="pl-aligngrid">
                {ALIGN.map(([a, glyph]) => (
                  <button key={a} disabled={!src} onClick={() => align(a)}>
                    {glyph}
                  </button>
                ))}
              </div>
              <p className="hint">Of sleep de afbeelding vrij op de pagina.</p>
            </div>
          </>
        ) : (
          <>
            <div className="pl-row">
              <div className="pl-field">
                <label>Kolommen</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, +e.target.value || 1))}
                />
              </div>
              <div className="pl-field">
                <label>Rijen</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, +e.target.value || 1))}
                />
              </div>
            </div>
            <div className="pl-row">
              <div className="pl-field">
                <label>Tussenruimte (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={gap}
                  onChange={(e) => setGap(Math.max(0, +e.target.value || 0))}
                />
              </div>
              <div className="pl-field">
                <label>Paginamarge (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={margin}
                  onChange={(e) => setMargin(Math.max(0, +e.target.value || 0))}
                />
              </div>
            </div>
            <p className="hint">
              Dezelfde afbeelding wordt in elk vak herhaald — handig voor labels of kaartjes.
            </p>
          </>
        )}

        <div className="pl-group pl-print">
          <button className="pl-printbtn" disabled={!src} onClick={() => window.print()}>
            Printen
          </button>
          <p className="hint">
            Zet in de printdialoog de schaal op <b>100% / werkelijke grootte</b> en marges op{' '}
            <b>geen</b>. De meeste printers laten de buitenste ~3–5&nbsp;mm onbedrukt.
          </p>
        </div>
      </aside>

      <main className="pl-stage" ref={stageRef}>
        <div className="pl-stage-inner" style={{ transform: `scale(${scale})` }}>
          <div id="print-page" className={orient === 'landscape' ? 'landscape' : ''}>
            {!src && <div className="pl-empty">Nog geen afbeelding</div>}

            {src && mode === 'free' && (
              <div
                className={dragging ? 'pl-free dragging' : 'pl-free'}
                style={{ left: `${left}mm`, top: `${top}mm`, width: `${wMm}mm`, height: `${hMm}mm` }}
                onMouseDown={onFreeMouseDown}
              >
                <img src={src} alt="" draggable={false} />
              </div>
            )}

            {src && mode === 'grid' && (
              <div
                className="pl-grid"
                style={{
                  padding: `${margin}mm`,
                  gap: `${gap}mm`,
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`
                }}
              >
                {Array.from({ length: cols * rows }).map((_, i) => (
                  <div className="pl-cell" key={i}>
                    <img src={src} alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PrintLayout
