import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, ErrorBanner } from './toolkit'
import { FileButton, ResultDownload } from './ToolFields'
import { useFileResult } from '../lib/useFileResult'
import { loadImageData } from '../lib/image'
import { processToFile } from '../lib/api'

type Mode = 'artistic' | 'pack' | 'unpack'
type Medium = 'image' | 'sound'
type Pixel = 'gray' | 'rgb'
type SoundFmt = 'wav' | 'mp3'
type PackTarget = 'wav' | 'png'

// Artistic mode may truncate huge files; the reversible mode never does.
const MAX_PIXELS = 4_000_000
const MAX_SAMPLES = 1_500_000
const MAX_REVERSIBLE = 8_000_000

const MAGIC_STR = 'THRB'
const NOT_PACKED =
  'Dit bestand is niet met de omkeerbare modus gemaakt (geen geldige header). Kies de WAV of PNG ' +
  'die deze tool zelf heeft geproduceerd — geen willekeurig audio- of beeldbestand.'

function writeStr(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
}

// Wrap raw bytes as 8-bit unsigned mono PCM in a WAV container.
function bytesToWav(samples: Uint8Array, sampleRate: number): Blob {
  const dataLen = samples.length
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)
  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true) // byte rate
  view.setUint16(32, 1, true) // block align
  view.setUint16(34, 8, true) // bits per sample
  writeStr(view, 36, 'data')
  view.setUint32(40, dataLen, true)
  new Uint8Array(buffer, 44).set(samples)
  return new Blob([buffer], { type: 'audio/wav' })
}

// ---- Reversible container: magic + version + ext + length + payload --------
function packBytes(payload: Uint8Array, ext: string): Uint8Array {
  const extBytes = new TextEncoder().encode(ext.slice(0, 200))
  const header = new Uint8Array(4 + 1 + 1 + extBytes.length + 4)
  const dv = new DataView(header.buffer)
  for (let i = 0; i < 4; i++) dv.setUint8(i, MAGIC_STR.charCodeAt(i))
  dv.setUint8(4, 1) // version
  dv.setUint8(5, extBytes.length)
  header.set(extBytes, 6)
  dv.setUint32(6 + extBytes.length, payload.length) // big-endian
  const out = new Uint8Array(header.length + payload.length)
  out.set(header, 0)
  out.set(payload, header.length)
  return out
}

function parsePacked(bytes: Uint8Array): { ext: string; payload: Uint8Array } {
  if (bytes.length < 10) throw new Error(NOT_PACKED)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let i = 0; i < 4; i++) if (dv.getUint8(i) !== MAGIC_STR.charCodeAt(i)) throw new Error(NOT_PACKED)
  const extLen = dv.getUint8(5)
  const ext = new TextDecoder().decode(bytes.slice(6, 6 + extLen))
  const origLen = dv.getUint32(6 + extLen)
  const start = 6 + extLen + 4
  if (start + origLen > bytes.length) {
    throw new Error('Beschadigd bestand: de opgeslagen lengte past niet in de data.')
  }
  return { ext: ext || 'bin', payload: bytes.slice(start, start + origLen) }
}

// Read the raw bytes of a WAV's data chunk.
function readWavData(buf: ArrayBuffer): Uint8Array {
  const dv = new DataView(buf)
  const tag = (o: number): string =>
    String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3))
  if (dv.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new Error('Geen geldig WAV-bestand.')
  }
  let off = 12
  while (off + 8 <= dv.byteLength) {
    const id = tag(off)
    const size = dv.getUint32(off + 4, true)
    if (id === 'data') {
      const end = Math.min(off + 8 + size, dv.byteLength)
      return new Uint8Array(buf.slice(off + 8, end))
    }
    off += 8 + size + (size & 1)
  }
  throw new Error('Geen audio-data gevonden in het WAV-bestand.')
}

function extOf(name: string): string {
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'bin'
}

async function bytesToPngBlob(bytes: Uint8Array, width: number): Promise<Blob> {
  const w = Math.max(1, width)
  const nPixels = Math.max(1, Math.ceil(bytes.length / 3))
  const h = Math.ceil(nPixels / w)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.createImageData(w, h)
  const out = imgData.data
  for (let p = 0; p < w * h; p++) {
    const di = p * 4
    out[di] = bytes[p * 3] ?? 0
    out[di + 1] = bytes[p * 3 + 1] ?? 0
    out[di + 2] = bytes[p * 3 + 2] ?? 0
    out[di + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Kon PNG niet maken.')
  return blob
}

// Extract the R,G,B bytes (in pixel order) from an image.
function pngToBytes(imgData: ImageData): Uint8Array {
  const d = imgData.data
  const rgb = new Uint8Array((d.length / 4) * 3)
  let j = 0
  for (let i = 0; i < d.length; i += 4) {
    rgb[j++] = d[i]
    rgb[j++] = d[i + 1]
    rgb[j++] = d[i + 2]
  }
  return rgb
}

const BYTE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Een bestand is niets meer dan een rij bytes. Deze tool leest die rauwe bytes en toont ze als een
      ander medium — een afbeelding of een geluid. Er zijn twee smaken:
    </p>
    <ul>
      <li>
        <b>Artistiek (niet omkeerbaar)</b> — de bytes worden direct beeld of geluid. Een tekstbestand
        klinkt als ritmische ruis, een foto wordt een abstract kleurveld. Puur om te zien/horen; je
        krijgt het originele bestand hier <b>niet</b> mee terug.
      </li>
      <li>
        <b>Omkeerbaar</b> — de tool schrijft een kleine kop (herkenning, originele lengte en extensie)
        vóór de bytes en zet alles verliesvrij in een <b>WAV</b> of <b>PNG</b>. Met “uitpakken” haal je
        exact hetzelfde bestand er weer uit.
      </li>
    </ul>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Breedte</b> — bij beeld: hoeveel pixels per rij. Verandert alleen de vorm, niet de data.
      </li>
      <li>
        <b>Interpretatie</b> — 1 byte per grijswaarde, of 3 bytes per RGB-pixel (artistiek).
      </li>
      <li>
        <b>Samplerate / formaat</b> — bij geluid. <code>WAV</code> is verliesvrij; <code>MP3</code>{' '}
        (alleen artistiek) is kleiner maar alleen om te luisteren.
      </li>
    </ul>
    <p>
      <b>Let op:</b> voor de omkeerbare modus kun je alleen WAV of PNG gebruiken. MP3 en JPEG gooien
      data weg (lossy) en maken exacte reconstructie onmogelijk.
    </p>
  </>
)

function ByteReinterpret(): JSX.Element {
  const [mode, setMode] = useState<Mode>('artistic')
  const [medium, setMedium] = useState<Medium>('image')
  const [packTarget, setPackTarget] = useState<PackTarget>('png')
  const [file, setFile] = useState<File | null>(null)
  const [width, setWidth] = useState('256')
  const [pixel, setPixel] = useState<Pixel>('rgb')
  const [rate, setRate] = useState('8000')
  const [soundFmt, setSoundFmt] = useState<SoundFmt>('wav')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useFileResult()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  // ---- Artistic: bytes → image ----
  const artisticImage = async (): Promise<void> => {
    const w = Math.max(1, Math.floor(Number(width) || 1))
    const buf = new Uint8Array(await file!.arrayBuffer())
    const perPixel = pixel === 'gray' ? 1 : 3
    let usable = buf
    if (Math.floor(buf.length / perPixel) > MAX_PIXELS) {
      usable = buf.slice(0, MAX_PIXELS * perPixel)
      setTruncated(true)
    }
    const nPixels = Math.max(1, Math.floor(usable.length / perPixel))
    const h = Math.ceil(nPixels / w)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const imgData = ctx.createImageData(w, h)
    const out = imgData.data
    for (let p = 0; p < w * h; p++) {
      const di = p * 4
      if (p < nPixels) {
        if (pixel === 'gray') {
          out[di] = out[di + 1] = out[di + 2] = usable[p]
        } else {
          out[di] = usable[p * 3]
          out[di + 1] = usable[p * 3 + 1]
          out[di + 2] = usable[p * 3 + 2]
        }
      }
      out[di + 3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('Kon PNG niet maken.')
    const url = URL.createObjectURL(blob)
    setResult({ blob, filename: `${file!.name}.art.png`, url, size: blob.size })
    setPreviewUrl(url)
  }

  // ---- Artistic: bytes → sound ----
  const artisticSound = async (): Promise<void> => {
    const sr = Math.min(48000, Math.max(1000, Math.floor(Number(rate) || 8000)))
    const buf = new Uint8Array(await file!.arrayBuffer())
    let usable = buf
    if (buf.length > MAX_SAMPLES) {
      usable = buf.slice(0, MAX_SAMPLES)
      setTruncated(true)
    }
    const wavBlob = bytesToWav(usable, sr)
    if (soundFmt === 'mp3') {
      const wavFile = new File([wavBlob], 'artistiek.wav', { type: 'audio/wav' })
      const form = new FormData()
      form.append('file', wavFile)
      form.append('format', 'mp3')
      form.append('bitrate', '128')
      const res = await processToFile('/audio/convert', form, `${file!.name}.art.mp3`)
      setResult(res)
      setAudioUrl(res.url)
    } else {
      const url = URL.createObjectURL(wavBlob)
      setResult({ blob: wavBlob, filename: `${file!.name}.art.wav`, url, size: wavBlob.size })
      setAudioUrl(url)
    }
  }

  // ---- Reversible: file → WAV/PNG ----
  const pack = async (): Promise<void> => {
    const buf = new Uint8Array(await file!.arrayBuffer())
    if (buf.length > MAX_REVERSIBLE) {
      throw new Error(
        `Bestand te groot voor de omkeerbare modus (${(buf.length / 1e6).toFixed(1)} MB; max ~8 MB). ` +
          'Kies een kleiner bestand.'
      )
    }
    const packed = packBytes(buf, extOf(file!.name))
    if (packTarget === 'wav') {
      const blob = bytesToWav(packed, 44100)
      const url = URL.createObjectURL(blob)
      setResult({ blob, filename: `${file!.name}.reversible.wav`, url, size: blob.size })
      setAudioUrl(url)
    } else {
      const w = Math.max(1, Math.floor(Number(width) || 256))
      const blob = await bytesToPngBlob(packed, w)
      const url = URL.createObjectURL(blob)
      setResult({ blob, filename: `${file!.name}.reversible.png`, url, size: blob.size })
      setPreviewUrl(url)
    }
  }

  // ---- Reversible: WAV/PNG → original file ----
  const unpack = async (): Promise<void> => {
    const name = file!.name.toLowerCase()
    let bytes: Uint8Array
    if (name.endsWith('.wav') || file!.type === 'audio/wav' || file!.type === 'audio/x-wav') {
      bytes = readWavData(await file!.arrayBuffer())
    } else {
      // Treat anything else as an image (PNG produced by the pack step).
      bytes = pngToBytes(await loadImageData(file!))
    }
    const { ext, payload } = parsePacked(bytes)
    const ab = new ArrayBuffer(payload.length)
    new Uint8Array(ab).set(payload)
    const blob = new Blob([ab])
    const url = URL.createObjectURL(blob)
    setResult({ blob, filename: `gereconstrueerd.${ext}`, url, size: blob.size })
  }

  const run = async (): Promise<void> => {
    if (!file) {
      setError('Kies eerst een bestand.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    setPreviewUrl(null)
    setAudioUrl(null)
    setTruncated(false)
    try {
      if (mode === 'artistic') {
        if (medium === 'image') await artisticImage()
        else await artisticSound()
      } else if (mode === 'pack') {
        await pack()
      } else {
        await unpack()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const actionLabel =
    mode === 'unpack'
      ? 'Bestand terughalen'
      : mode === 'pack'
        ? `Inpakken in ${packTarget.toUpperCase()}`
        : medium === 'image'
          ? 'Maak afbeelding'
          : 'Maak geluid'

  return (
    <ToolShell
      title="Byte-herinterpretatie"
      subtitle="Lees de rauwe bytes van een bestand als een ander medium — artistiek, of exact omkeerbaar."
      info={BYTE_INFO}
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'artistic', label: 'Artistiek (niet omkeerbaar)' },
            { value: 'pack', label: 'Omkeerbaar: inpakken' },
            { value: 'unpack', label: 'Omkeerbaar: uitpakken' }
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
        />

        <FileButton
          label={mode === 'unpack' ? 'Ingepakte WAV of PNG' : 'Willekeurig bestand'}
          accept={mode === 'unpack' ? '.wav,.png,audio/wav,image/png' : '*/*'}
          file={file}
          onPick={setFile}
        />

        {mode === 'artistic' && (
          <>
            <div className="tool-field">
              <span className="tool-label">Medium</span>
              <Segmented<Medium>
                options={[
                  { value: 'image', label: 'Bytes → afbeelding' },
                  { value: 'sound', label: 'Bytes → geluid' }
                ]}
                value={medium}
                onChange={setMedium}
              />
            </div>
            {medium === 'image' ? (
              <div className="tk-row">
                <TextInput label="Breedte (px)" value={width} onChange={setWidth} mono />
                <div className="tool-field">
                  <span className="tool-label">Interpretatie</span>
                  <Segmented<Pixel>
                    options={[
                      { value: 'gray', label: '1 byte = grijswaarde' },
                      { value: 'rgb', label: '3 bytes = RGB-pixel' }
                    ]}
                    value={pixel}
                    onChange={setPixel}
                  />
                </div>
              </div>
            ) : (
              <div className="tk-row">
                <TextInput label="Samplerate (Hz)" value={rate} onChange={setRate} mono />
                <div className="tool-field">
                  <span className="tool-label">Formaat</span>
                  <Segmented<SoundFmt>
                    options={[
                      { value: 'wav', label: 'WAV' },
                      { value: 'mp3', label: 'MP3 (kleiner, luisteren)' }
                    ]}
                    value={soundFmt}
                    onChange={setSoundFmt}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'pack' && (
          <div className="tk-row">
            <div className="tool-field">
              <span className="tool-label">Verliesvrij formaat</span>
              <Segmented<PackTarget>
                options={[
                  { value: 'png', label: 'PNG (beeld)' },
                  { value: 'wav', label: 'WAV (geluid)' }
                ]}
                value={packTarget}
                onChange={setPackTarget}
              />
            </div>
            {packTarget === 'png' && (
              <TextInput label="Breedte (px)" value={width} onChange={setWidth} mono />
            )}
          </div>
        )}

        <ErrorBanner message={error} />
        <button className="btn btn-primary" onClick={run} disabled={busy || !file}>
          {busy ? 'Bezig…' : actionLabel}
        </button>

        {truncated && (
          <Note>
            Bestand ingekort om het resultaat behapbaar te houden — alleen het eerste deel is omgezet.
            (Dit gebeurt niet in de omkeerbare modus.)
          </Note>
        )}
        {result && <ResultDownload result={result} />}
        {previewUrl && (
          <div className="tk-stego-preview">
            <img src={previewUrl} alt="Bytes als afbeelding" />
          </div>
        )}
        {audioUrl && (
          <audio className="tk-audio" controls src={audioUrl}>
            Je browser ondersteunt geen audio.
          </audio>
        )}

        <Note>
          {mode === 'unpack'
            ? 'Kies de WAV of PNG die met “inpakken” is gemaakt; het originele bestand komt er byte-voor-byte weer uit.'
            : mode === 'pack'
              ? 'Alleen verliesvrije dragers (WAV/PNG) — zo blijft elke byte exact behouden voor het terughalen.'
              : 'Artistieke modus: dezelfde bytes, een ander zintuig. Niet bedoeld om terug te lezen.'}
        </Note>
      </div>
    </ToolShell>
  )
}

export default ByteReinterpret
