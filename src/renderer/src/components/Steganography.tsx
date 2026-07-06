import { JSX, useState } from 'react'
import { ToolShell, TextArea, Segmented, Note, ErrorBanner } from './toolkit'
import { FileButton, ResultDownload } from './ToolFields'
import { useFileResult } from '../lib/useFileResult'

type Mode = 'hide' | 'reveal'

// A short magic marker so "reveal" can tell a real payload from noise.
const MAGIC = 0x53544732 // "STG2"

function Steganography(): JSX.Element {
  const [mode, setMode] = useState<Mode>('hide')
  const [cover, setCover] = useState<File | null>(null)
  const [secret, setSecret] = useState('Dit is een geheime boodschap 🤫')
  const [stego, setStego] = useState<File | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useFileResult()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const hide = async (): Promise<void> => {
    if (!cover) {
      setError('Kies eerst een dekmantel-afbeelding.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    setPreviewUrl(null)
    try {
      const imageData = await loadImageDataSafe(cover)
      const payload = new TextEncoder().encode(secret)
      // Header: MAGIC (32 bits) + length (32 bits), then the payload bytes.
      const header = new Uint8Array(8)
      const dv = new DataView(header.buffer)
      dv.setUint32(0, MAGIC)
      dv.setUint32(4, payload.length)
      const bytes = new Uint8Array(header.length + payload.length)
      bytes.set(header, 0)
      bytes.set(payload, header.length)

      const capacityBits = (imageData.data.length / 4) * 3
      if (bytes.length * 8 > capacityBits) {
        throw new Error(
          `Boodschap te groot: ${bytes.length * 8} bits nodig, maar de afbeelding biedt ${capacityBits} bits. Kies een grotere afbeelding of kortere tekst.`
        )
      }

      let bit = 0
      const data = imageData.data
      for (let i = 0; i < data.length && bit < bytes.length * 8; i += 4) {
        for (let ch = 0; ch < 3 && bit < bytes.length * 8; ch++) {
          const byte = bytes[bit >> 3]
          const b = (byte >> (7 - (bit & 7))) & 1
          data[i + ch] = (data[i + ch] & 0xfe) | b
          bit++
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = imageData.width
      canvas.height = imageData.height
      canvas.getContext('2d')!.putImageData(imageData, 0, 0)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Kon PNG niet maken.')
      const url = URL.createObjectURL(blob)
      setResult({ blob, filename: 'verborgen.png', url, size: blob.size })
      setPreviewUrl(url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reveal = async (): Promise<void> => {
    if (!stego) {
      setError('Kies eerst een afbeelding met een verborgen boodschap.')
      return
    }
    setBusy(true)
    setError(null)
    setRevealed(null)
    try {
      const imageData = await loadImageDataSafe(stego)
      const data = imageData.data
      const readBits = (count: number, startBit: number): Uint8Array => {
        const out = new Uint8Array(Math.ceil(count / 8))
        let bit = 0
        let read = 0
        for (let i = 0; i < data.length && read < count; i += 4) {
          for (let ch = 0; ch < 3 && read < count; ch++) {
            if (bit >= startBit) {
              const b = data[i + ch] & 1
              out[read >> 3] |= b << (7 - (read & 7))
              read++
            }
            bit++
          }
        }
        return out
      }
      const head = readBits(64, 0)
      const dv = new DataView(head.buffer)
      if (dv.getUint32(0) !== MAGIC) {
        throw new Error('Geen verborgen boodschap gevonden (magic marker ontbreekt).')
      }
      const len = dv.getUint32(4)
      const capacityBytes = (data.length / 4) * 3 / 8 - 8
      if (len > capacityBytes || len > 10_000_000) {
        throw new Error('Beschadigde of ongeldige boodschap-lengte.')
      }
      const payload = readBits(len * 8, 64)
      setRevealed(new TextDecoder().decode(payload))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Steganografie"
      subtitle="Verberg tekst in de minst-significante bits van een afbeelding — onzichtbaar voor het oog."
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'hide', label: 'Verbergen' },
            { value: 'reveal', label: 'Onthullen' }
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
        />
        {mode === 'hide' ? (
          <>
            <FileButton label="Dekmantel-afbeelding" accept="image/*" file={cover} onPick={setCover} />
            <TextArea label="Geheime tekst" value={secret} onChange={setSecret} rows={4} mono={false} />
            <ErrorBanner message={error} />
            <button className="btn btn-primary" onClick={hide} disabled={busy || !cover}>
              {busy ? 'Bezig…' : 'Verberg in afbeelding'}
            </button>
            {result && (
              <>
                <ResultDownload result={result} />
                {previewUrl && (
                  <div className="tk-stego-preview">
                    <img src={previewUrl} alt="Resultaat" />
                  </div>
                )}
                <Note>
                  Sla op als PNG (verliesvrij). JPEG-compressie zou de verborgen bits vernietigen.
                </Note>
              </>
            )}
          </>
        ) : (
          <>
            <FileButton label="Afbeelding met boodschap (PNG)" accept="image/*" file={stego} onPick={setStego} />
            <ErrorBanner message={error} />
            <button className="btn btn-primary" onClick={reveal} disabled={busy || !stego}>
              {busy ? 'Bezig…' : 'Onthul boodschap'}
            </button>
            {revealed !== null && <TextArea label="Verborgen boodschap" value={revealed} rows={5} readOnly mono={false} />}
          </>
        )}
        <Note>
          Werkt met de LSB-methode: elke kleurcomponent draagt één bit van de boodschap. De afbeelding
          ziet er identiek uit. Gebruik alleen PNG voor het resultaat.
        </Note>
      </div>
    </ToolShell>
  )
}

// Load a File into an ImageData via an offscreen canvas.
async function loadImageDataSafe(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Kon afbeelding niet laden.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas niet beschikbaar.')
    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default Steganography
