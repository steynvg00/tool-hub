import { JSX, useEffect, useRef, useState } from 'react'
import { formatBytes, type FileResult } from '../lib/api'

/**
 * Thumbnail preview for a picked file: a live image thumbnail for images,
 * otherwise a document icon. Always shows the name + size.
 */
export function FilePreview({ file }: { file: File | null }): JSX.Element | null {
  const isImage = !!file && file.type.startsWith('image/')
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file || !isImage) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file, isImage])
  if (!file) return null
  return (
    <div className="tk-file-preview">
      {isImage && url ? (
        <img className="tk-file-thumb" src={url} alt={file.name} />
      ) : (
        <div className="tk-file-thumb tk-file-thumb-doc">📄</div>
      )}
      <div className="tk-file-meta">
        <span className="tk-file-name" title={file.name}>
          {file.name}
        </span>
        <span className="tk-file-size">{formatBytes(file.size)}</span>
      </div>
    </div>
  )
}

export function FileButton({
  label,
  accept,
  file,
  onPick
}: {
  label: string
  accept: string
  file: File | null
  onPick: (f: File | null) => void
}): JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="tool-field">
      <label className="tool-label">{label}</label>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <button className="btn" onClick={() => ref.current?.click()}>
        {file ? 'Ander bestand kiezen' : 'Bestand kiezen'}
      </button>
      <FilePreview file={file} />
    </div>
  )
}

export function MultiFileButton({
  label,
  accept,
  files,
  onPick
}: {
  label: string
  accept: string
  files: File[]
  onPick: (f: File[]) => void
}): JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="tool-field">
      <label className="tool-label">{label}</label>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => onPick(Array.from(e.target.files ?? []))}
      />
      <button className="btn" onClick={() => ref.current?.click()}>
        {files.length ? `${files.length} bestand(en) gekozen` : 'Bestanden kiezen'}
      </button>
      {files.length > 0 && (
        <div className="tk-file-previews">
          {files.map((f, i) => (
            <FilePreview key={i} file={f} />
          ))}
        </div>
      )}
    </div>
  )
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}): JSX.Element {
  return (
    <label className="tool-field">
      <span className="tool-label">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

/** A finished file: name + size + a download link (works for zip/pdf/image). */
export function ResultDownload({ result }: { result: FileResult }): JSX.Element {
  return (
    <div className="result-file">
      <div className="result-file-info">
        <span className="result-file-name">{result.filename}</span>
        <span className="result-file-size">{formatBytes(result.size)}</span>
      </div>
      <a className="btn btn-primary" href={result.url} download={result.filename}>
        Downloaden
      </a>
    </div>
  )
}
