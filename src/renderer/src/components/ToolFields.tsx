import { JSX, useRef } from 'react'
import { formatBytes, type FileResult } from '../lib/api'

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
        {file ? file.name : 'Bestand kiezen'}
      </button>
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
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
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
