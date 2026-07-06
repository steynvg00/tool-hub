import { JSX, useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import { ToolShell, ErrorBanner, Note } from './toolkit'
import { FileButton } from './ToolFields'

type Tags = Record<string, unknown>

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toLocaleString('nl-NL')
  if (typeof v === 'number')
    return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, '')
  if (Array.isArray(v)) return v.map(formatValue).join(', ')
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

const EXIF_TOOL_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont de EXIF-metadata die in een foto verborgen zit — zoals cameramodel, opname-instellingen,
      datum en, als die aanwezig is, de <b>GPS-locatie</b> waar de foto is gemaakt. Handig om te zien
      wat je onbedoeld deelt.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Afbeelding</b> — kies een foto (bij voorkeur <code>jpeg</code> of <code>tiff</code>). De
        metadata wordt lokaal uitgelezen; er wordt niets geüpload. Een GPS-locatie krijgt een link
        naar de kaart.
      </li>
      <li>
        <b>Metadata verwijderen &amp; downloaden</b> — codeert de afbeelding opnieuw als{' '}
        <code>jpeg</code>, waardoor alle metadata (inclusief GPS) verdwijnt, en biedt de schone
        kopie aan om te downloaden.
      </li>
    </ul>
  </>
)

function ExifTool(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState<Tags | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleanUrl, setCleanUrl] = useState<string | null>(null)
  const [cleanName, setCleanName] = useState('schoon.jpg')
  const [busy, setBusy] = useState(false)
  const urlRef = useRef<string | null>(null)

  const setClean = (url: string | null): void => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setCleanUrl(url)
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  const pick = async (f: File | null): Promise<void> => {
    setFile(f)
    setTags(null)
    setLoaded(false)
    setError(null)
    setClean(null)
    if (!f) return
    setCleanName(`${stripExt(f.name)}-schoon.jpg`)
    try {
      const parsed = (await exifr.parse(f, { gps: true })) as Tags | undefined
      setTags(parsed ?? null)
      setLoaded(true)
    } catch (e) {
      setError(`Kon de metadata niet lezen: ${(e as Error).message}`)
    }
  }

  const strip = (): void => {
    if (!file) return
    setBusy(true)
    setError(null)
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Kon geen canvas-context maken.')
        setBusy(false)
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Kon de afbeelding niet opnieuw coderen.')
            setBusy(false)
            return
          }
          setClean(URL.createObjectURL(blob))
          setBusy(false)
        },
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objUrl)
      setError('Kon de afbeelding niet laden.')
      setBusy(false)
    }
    img.src = objUrl
  }

  const lat = tags?.latitude as number | undefined
  const lon = tags?.longitude as number | undefined
  const entries = tags ? Object.entries(tags).filter(([, v]) => v !== undefined && v !== null) : []

  return (
    <ToolShell
      title="EXIF-viewer & stripper"
      subtitle="Bekijk EXIF-metadata van een foto en download een schone kopie."
      info={EXIF_TOOL_INFO}
    >
      <>
        <div className="panel">
          <FileButton
            label="Afbeelding"
            accept="image/jpeg,image/tiff,image/*"
            file={file}
            onPick={pick}
          />
          <ErrorBanner message={error} />
        </div>

        {loaded && (
          <div className="panel">
            {typeof lat === 'number' && typeof lon === 'number' && (
              <dl className="tk-kv">
                <dt>GPS-locatie</dt>
                <dd>
                  {lat.toFixed(6)}, {lon.toFixed(6)}{' '}
                  <a href={`https://www.google.com/maps?q=${lat},${lon}`}>Bekijk op kaart</a>
                </dd>
              </dl>
            )}
            {entries.length > 0 ? (
              <div className="tk-table-wrap">
                <table className="tk-table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Waarde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{formatValue(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Note>Geen EXIF-metadata gevonden.</Note>
            )}
          </div>
        )}

        {file && (
          <div className="panel">
            <div className="tk-actions">
              <button className="btn btn-primary" disabled={busy} onClick={strip}>
                {busy ? 'Bezig…' : 'Metadata verwijderen & downloaden'}
              </button>
              {cleanUrl && (
                <a className="btn" href={cleanUrl} download={cleanName}>
                  Download {cleanName}
                </a>
              )}
            </div>
            <Note>
              Bij het verwijderen wordt de afbeelding opnieuw als JPEG gecodeerd; alle metadata
              verdwijnt.
            </Note>
          </div>
        )}
      </>
    </ToolShell>
  )
}

export default ExifTool
