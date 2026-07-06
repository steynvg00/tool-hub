import { JSX, useState } from 'react'
import { ToolShell, TextArea, Segmented, Note, ErrorBanner } from './toolkit'
import { FileButton, ResultDownload } from './ToolFields'
import { useFileResult } from '../lib/useFileResult'
import { loadImageData } from '../lib/image'

type Mode = 'hide' | 'reveal'

// A short magic marker so "reveal" can tell a real payload from noise.
const MAGIC = 0x53544732 // "STG2"

const STEG_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Steganografie verbergt een tekstboodschap ín een afbeelding door de allerlaatste bit van elke
      kleurwaarde minimaal aan te passen. Het beeld ziet er identiek uit, maar draagt onzichtbaar je
      boodschap mee.
    </p>
    <h4>Verbergen</h4>
    <ul>
      <li>
        <b>Dekmantel-afbeelding</b> — elke afbeelding mag (JPEG, PNG of WebP). De tool leest de pixels
        en levert het resultaat <b>altijd als PNG</b>; je hoeft dus zelf niets te converteren.
      </li>
      <li>
        <b>Geheime tekst</b> — de boodschap die je verbergt. Een grotere afbeelding kan meer tekst
        bevatten.
      </li>
    </ul>
    <h4>Onthullen</h4>
    <p>
      Kies een PNG die met deze tool is gemaakt; de verborgen tekst wordt eruit gehaald.
    </p>
    <p>
      <b>Belangrijk:</b> het resultaat is altijd een PNG. Sla het nooit als JPEG op — JPEG-compressie
      herschikt de pixels en vernietigt de verborgen data.
    </p>
  </>
)

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
      const imageData = await loadImageData(cover)
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
      const imageData = await loadImageData(stego)
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
        throw new Error(
          'Geen verborgen boodschap gevonden. Óf deze afbeelding bevat er geen, óf ze is na het ' +
            'verbergen opnieuw als JPEG opgeslagen (of anderszins bewerkt) — dan is de verborgen ' +
            'data verloren. Gebruik de originele PNG die met deze tool is gemaakt.'
        )
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
      info={STEG_INFO}
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
            <FileButton
              label="Dekmantel-afbeelding (elk formaat)"
              accept="image/*"
              file={cover}
              onPick={setCover}
            />
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
                  Het resultaat is altijd een PNG — bewaar het zo. Zet het niet om naar JPEG: dat zou
                  de verborgen data vernietigen.
                </Note>
              </>
            )}
          </>
        ) : (
          <>
            <FileButton
              label="Stego-PNG met verborgen boodschap"
              accept="image/*"
              file={stego}
              onPick={setStego}
            />
            <ErrorBanner message={error} />
            <button className="btn btn-primary" onClick={reveal} disabled={busy || !stego}>
              {busy ? 'Bezig…' : 'Onthul boodschap'}
            </button>
            {revealed !== null && (
              <TextArea label="Verborgen boodschap" value={revealed} rows={5} readOnly mono={false} />
            )}
          </>
        )}
        <Note>
          Werkt met de LSB-methode: elke kleurcomponent draagt één bit van de boodschap. De afbeelding
          ziet er identiek uit. Het resultaat is altijd PNG, want alleen een verliesvrij formaat
          bewaart de verborgen bits.
        </Note>
      </div>
    </ToolShell>
  )
}

export default Steganography
