import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, ErrorBanner } from './toolkit'
import { FileButton, ResultDownload } from './ToolFields'
import { useFileResult } from '../lib/useFileResult'

type Mode = 'image' | 'sound'
type Pixel = 'gray' | 'rgb'

// Keep the canvas / clip lengths sane so a big file doesn't lock the UI.
const MAX_PIXELS = 4_000_000
const MAX_SAMPLES = 1_500_000

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

function ByteReinterpret(): JSX.Element {
  const [mode, setMode] = useState<Mode>('image')
  const [file, setFile] = useState<File | null>(null)
  const [width, setWidth] = useState('256')
  const [pixel, setPixel] = useState<Pixel>('rgb')
  const [rate, setRate] = useState('8000')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useFileResult()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  const toImage = async (): Promise<void> => {
    const w = Math.max(1, Math.floor(Number(width) || 1))
    const buf = new Uint8Array(await file!.arrayBuffer())
    const perPixel = pixel === 'gray' ? 1 : 3
    let usable = buf
    let trunc = false
    if (Math.floor(buf.length / perPixel) > MAX_PIXELS) {
      usable = buf.slice(0, MAX_PIXELS * perPixel)
      trunc = true
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
          const v = usable[p]
          out[di] = v
          out[di + 1] = v
          out[di + 2] = v
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
    setResult({ blob, filename: `${file!.name}.bytes.png`, url, size: blob.size })
    setPreviewUrl(url)
    setTruncated(trunc)
  }

  const toSound = async (): Promise<void> => {
    const sr = Math.min(48000, Math.max(1000, Math.floor(Number(rate) || 8000)))
    const buf = new Uint8Array(await file!.arrayBuffer())
    let usable = buf
    let trunc = false
    if (buf.length > MAX_SAMPLES) {
      usable = buf.slice(0, MAX_SAMPLES)
      trunc = true
    }
    const blob = bytesToWav(usable, sr)
    const url = URL.createObjectURL(blob)
    setResult({ blob, filename: `${file!.name}.bytes.wav`, url, size: blob.size })
    setAudioUrl(url)
    setTruncated(trunc)
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
      if (mode === 'image') await toImage()
      else await toSound()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Byte-herinterpretatie"
      subtitle="Lees de rauwe bytes van een bestand als een ander medium — als afbeelding of als geluid."
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'image', label: 'Bytes → afbeelding' },
            { value: 'sound', label: 'Bytes → geluid' }
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
        />
        <FileButton label="Willekeurig bestand" accept="*/*" file={file} onPick={setFile} />
        {mode === 'image' ? (
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
          <TextInput label="Samplerate (Hz)" value={rate} onChange={setRate} mono />
        )}
        <ErrorBanner message={error} />
        <button className="btn btn-primary" onClick={run} disabled={busy || !file}>
          {busy ? 'Bezig…' : mode === 'image' ? 'Maak afbeelding' : 'Maak geluid'}
        </button>
        {truncated && (
          <Note>
            Bestand ingekort om het resultaat behapbaar te houden — alleen het eerste deel is
            omgezet.
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
          Dit is geen echte conversie maar een herinterpretatie: dezelfde bytes, een ander zintuig.
          Een tekstbestand klinkt als ruis met ritme; een foto wordt een abstract kleurveld.
        </Note>
      </div>
    </ToolShell>
  )
}

export default ByteReinterpret
