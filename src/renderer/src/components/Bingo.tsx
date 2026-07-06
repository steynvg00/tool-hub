import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, TextInput, TextArea, Segmented, Toggle, Note, ErrorBanner } from './toolkit'
import { MultiFileButton } from './ToolFields'
import { sendToPrintLayout } from '../lib/printHandoff'

type Mode = 'numbers' | 'words' | 'images'
type Cell =
  | { kind: 'number'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'image'; imgIdx: number }
  | { kind: 'free' }
type Card = Cell[][]

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const clampInt = (v: string, lo: number, hi: number, dflt: number): number => {
  const n = Math.floor(Number(v))
  if (Number.isNaN(n)) return dflt
  return Math.max(lo, Math.min(hi, n))
}

const isCenter = (r: number, c: number, W: number, H: number): boolean =>
  r === (H - 1) / 2 && c === (W - 1) / 2

// Classic BINGO columns: column c draws from [c*R+1 .. c*R+R]; R=15 gives the
// familiar 1–15, 16–30, … ranges for a 5-wide card.
function numbersCard(W: number, H: number, freeActive: boolean): Card {
  const R = Math.max(15, H * 2)
  const grid: Card = Array.from({ length: H }, () => Array(W) as Cell[])
  for (let c = 0; c < W; c++) {
    const range = shuffle(Array.from({ length: R }, (_, i) => c * R + 1 + i))
    for (let r = 0; r < H; r++) grid[r][c] = { kind: 'number', text: String(range[r]) }
  }
  if (freeActive) grid[(H - 1) / 2][(W - 1) / 2] = { kind: 'free' }
  return grid
}

function itemsCard(items: number[], W: number, H: number, freeActive: boolean, mode: Mode): Card {
  const picks = shuffle(items)
  const grid: Card = Array.from({ length: H }, () => Array(W) as Cell[])
  let k = 0
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (freeActive && isCenter(r, c, W, H)) {
        grid[r][c] = { kind: 'free' }
        continue
      }
      const idx = picks[k++]
      grid[r][c] =
        mode === 'images' ? { kind: 'image', imgIdx: idx } : { kind: 'text', text: WORDS_REF[idx] }
    }
  }
  return grid
}

// itemsCard reads words through this module-level ref set right before generating.
let WORDS_REF: string[] = []

function signature(card: Card): string {
  return card
    .flat()
    .map((c) => (c.kind === 'free' ? '*' : c.kind === 'image' ? `i${c.imgIdx}` : c.text))
    .join(',')
}

// ---- Canvas drawing --------------------------------------------------------
function wrapCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  lineH: number
): void {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 4)
  const startY = cy - ((shown.length - 1) * lineH) / 2
  shown.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH))
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

function drawCard(canvas: HTMLCanvasElement, card: Card, images: HTMLImageElement[]): void {
  const H = card.length
  const W = card[0].length
  const cell = 110
  canvas.width = W * cell
  canvas.height = H * cell
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const x = c * cell
      const y = r * cell
      const data = card[r][c]
      if (data.kind === 'image' && images[data.imgIdx]) {
        drawCover(ctx, images[data.imgIdx], x + 5, y + 5, cell - 10, cell - 10)
      } else if (data.kind === 'number') {
        ctx.fillStyle = '#111'
        ctx.font = `bold ${cell * 0.34}px sans-serif`
        ctx.fillText(data.text, x + cell / 2, y + cell / 2)
      } else if (data.kind === 'free') {
        ctx.fillStyle = '#c9a227'
        ctx.font = `bold ${cell * 0.16}px sans-serif`
        ctx.fillText('VRIJ', x + cell / 2, y + cell / 2)
      } else if (data.kind === 'text') {
        ctx.fillStyle = '#111'
        ctx.font = `${cell * 0.15}px sans-serif`
        wrapCentered(ctx, data.text, x + cell / 2, y + cell / 2, cell * 0.86, cell * 0.19)
      }
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, cell, cell)
    }
  }
}

function composeSet(cards: Card[], images: HTMLImageElement[]): string | null {
  const tiles = cards.map((card) => {
    const cv = document.createElement('canvas')
    drawCard(cv, card, images)
    return cv
  })
  if (tiles.length === 0) return null
  const cols = tiles.length === 1 ? 1 : 2
  const rows = Math.ceil(tiles.length / cols)
  const cw = tiles[0].width
  const ch = tiles[0].height
  const gap = 24
  const label = 30
  const canvas = document.createElement('canvas')
  canvas.width = cols * cw + (cols + 1) * gap
  canvas.height = rows * (ch + label) + (rows + 1) * gap
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  tiles.forEach((tile, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    const x = gap + c * (cw + gap)
    const y = gap + r * (ch + label + gap)
    ctx.fillStyle = '#111'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`Kaart ${i + 1}`, x, y)
    ctx.drawImage(tile, x, y + label)
  })
  return canvas.toDataURL('image/png')
}

function BingoCardView({
  card,
  images,
  index,
  openTool
}: {
  card: Card
  images: HTMLImageElement[]
  index: number
  openTool: (id: string) => void
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawCard(ref.current, card, images)
  }, [card, images])
  const print = (): void => {
    const url = ref.current?.toDataURL('image/png')
    if (url) sendToPrintLayout(url, openTool)
  }
  return (
    <div className="bingo-card">
      <canvas ref={ref} />
      <div className="bingo-card-foot">
        <span>Kaart {index + 1}</span>
        <button className="btn" onClick={print}>
          Print deze kaart
        </button>
      </div>
    </div>
  )
}

const BINGO_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Maakt bingokaarten: klassieke getallen-bingo of thema-bingo met je eigen woorden of
      afbeeldingen. Genereer meerdere unieke kaarten tegelijk en print ze via de Print layout-tool.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Inhoud</b> — <code>Getallen</code> (klassiek, per kolom een getallenbereik),{' '}
        <code>Woorden</code> (één per regel) of <code>Afbeeldingen</code> (geüpload).
      </li>
      <li>
        <b>Kolommen &amp; rijen</b> — het rasterformaat (2–9). 5×5 is klassiek.
      </li>
      <li>
        <b>Vrij midden</b> — laat het middenvakje vrij; alleen bij een oneven raster.
      </li>
      <li>
        <b>Aantal kaarten</b> — hoeveel kaarten worden gegenereerd, elk met een andere verdeling.
      </li>
    </ul>
    <p>Gebruik &quot;Print deze kaart&quot; of &quot;Print hele set&quot; om ze in Print layout te openen.</p>
  </>
)

function Bingo({ openTool }: { openTool: (id: string) => void }): JSX.Element {
  const [mode, setMode] = useState<Mode>('numbers')
  const [colsS, setColsS] = useState('5')
  const [rowsS, setRowsS] = useState('5')
  const [freeCenter, setFreeCenter] = useState(true)
  const [countS, setCountS] = useState('2')
  const [wordsText, setWordsText] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [error, setError] = useState<string | null>(null)

  const cols = clampInt(colsS, 2, 9, 5)
  const rows = clampInt(rowsS, 2, 9, 5)
  const count = clampInt(countS, 1, 30, 1)
  const freeActive = freeCenter && cols % 2 === 1 && rows % 2 === 1
  const need = cols * rows - (freeActive ? 1 : 0)

  // Load uploaded images into <img> elements for canvas drawing.
  useEffect(() => {
    if (mode !== 'images' || imageFiles.length === 0) {
      setImages([])
      return
    }
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    let alive = true
    Promise.all(
      urls.map(
        (u) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image()
            im.onload = () => res(im)
            im.onerror = () => rej(new Error('img'))
            im.src = u
          })
      )
    )
      .then((els) => {
        if (alive) setImages(els)
      })
      .catch(() => {})
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [imageFiles, mode])

  // Clear stale cards whenever the inputs change.
  useEffect(() => {
    setCards([])
  }, [mode, cols, rows, freeActive, wordsText, imageFiles])

  const generate = (): void => {
    setError(null)
    const build = (): Card => {
      if (mode === 'numbers') return numbersCard(cols, rows, freeActive)
      const itemCount = mode === 'images' ? imageFiles.length : WORDS_REF.length
      return itemsCard(
        Array.from({ length: itemCount }, (_, i) => i),
        cols,
        rows,
        freeActive,
        mode
      )
    }

    if (mode === 'words') {
      WORDS_REF = wordsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (WORDS_REF.length < need) {
        setError(`Voeg minstens ${need} woorden toe (nu ${WORDS_REF.length}).`)
        return
      }
    }
    if (mode === 'images' && imageFiles.length < need) {
      setError(`Upload minstens ${need} afbeeldingen (nu ${imageFiles.length}).`)
      return
    }

    const out: Card[] = []
    const seen = new Set<string>()
    for (let i = 0; i < count; i++) {
      let card = build()
      // Try a few times to keep cards distinct where combinatorially possible.
      for (let tries = 0; tries < 8 && seen.has(signature(card)); tries++) card = build()
      seen.add(signature(card))
      out.push(card)
    }
    setCards(out)
  }

  const printSet = (): void => {
    const url = composeSet(cards, images)
    if (url) sendToPrintLayout(url, openTool)
  }

  return (
    <ToolShell
      title="Bingo & kaarten"
      subtitle="Genereer bingokaarten met getallen, woorden of afbeeldingen en print ze."
      info={BINGO_INFO}
    >
      <div className="panel tool-panel">
        <div className="tool-field">
          <span className="tool-label">Inhoud</span>
          <Segmented<Mode>
            options={[
              { value: 'numbers', label: 'Getallen' },
              { value: 'words', label: 'Woorden' },
              { value: 'images', label: 'Afbeeldingen' }
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        <div className="tk-row">
          <TextInput label="Kolommen" value={colsS} onChange={setColsS} type="number" mono />
          <TextInput label="Rijen" value={rowsS} onChange={setRowsS} type="number" mono />
          <TextInput label="Aantal kaarten" value={countS} onChange={setCountS} type="number" mono />
        </div>
        <Toggle label="Vrij midden (bij oneven raster)" checked={freeCenter} onChange={setFreeCenter} />

        {mode === 'words' && (
          <TextArea
            label={`Woorden (één per regel) — minstens ${need} nodig`}
            value={wordsText}
            onChange={setWordsText}
            rows={6}
            mono={false}
            placeholder={'Appel\nBanaan\nKers\n…'}
          />
        )}
        {mode === 'images' && (
          <MultiFileButton
            label={`Afbeeldingen — minstens ${need} nodig`}
            accept="image/*"
            files={imageFiles}
            onPick={setImageFiles}
          />
        )}

        <ErrorBanner message={error} />
        <div className="tk-actions">
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={generate}>
            Genereer {count > 1 ? `${count} kaarten` : 'kaart'}
          </button>
          {cards.length > 0 && (
            <button className="btn" style={{ width: 'auto' }} onClick={printSet}>
              Print hele set
            </button>
          )}
        </div>

        {cards.length > 0 && (
          <div className="bingo-grid">
            {cards.map((card, i) => (
              <BingoCardView key={i} card={card} images={images} index={i} openTool={openTool} />
            ))}
          </div>
        )}
        <Note>
          Klassieke 5×5 getallen-bingo gebruikt per kolom een getallenbereik (1–15, 16–30, …). Bij
          thema-bingo krijgt elke kaart een andere willekeurige verdeling van je woorden of
          afbeeldingen.
        </Note>
      </div>
    </ToolShell>
  )
}

export default Bingo
