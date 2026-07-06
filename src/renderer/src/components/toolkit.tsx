import { JSX, ReactNode, useEffect, useRef, useState } from 'react'

// Shared building blocks for the small "gereedschap" tools. They wrap the
// existing app CSS (.tool, .panel, .tool-field, .banner …) plus a "Utility
// tools" section in main.css, so every tool looks native to the hub.

/** Standard page scaffold: title + subtitle header, then children. */
export function ToolShell({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children: JSX.Element | JSX.Element[]
}): JSX.Element {
  return (
    <div className="tool">
      <header className="tool-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </div>
  )
}

/** Copy-to-clipboard button; briefly shows a confirmation. */
export function CopyButton({
  value,
  label = 'Kopiëren',
  disabled
}: {
  value: string
  label?: string
  disabled?: boolean
}): JSX.Element {
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1200)
    } catch {
      /* clipboard blocked — ignore */
    }
  }
  return (
    <button className="tk-copy" onClick={copy} disabled={disabled || !value}>
      {done ? '✓ Gekopieerd' : label}
    </button>
  )
}

/** Labelled multi-line input. */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  mono = true,
  readOnly = false
}: {
  label?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  rows?: number
  mono?: boolean
  readOnly?: boolean
}): JSX.Element {
  return (
    <label className="tool-field">
      {label && <span className="tool-label">{label}</span>}
      <textarea
        className={mono ? 'tk-area tk-mono' : 'tk-area'}
        rows={rows}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </label>
  )
}

/** Labelled single-line input. */
export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono = false
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
}): JSX.Element {
  return (
    <label className="tool-field">
      {label && <span className="tool-label">{label}</span>}
      <input
        type={type}
        className={mono ? 'tk-mono' : undefined}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/** Read-only output area with a copy button in its header. */
export function OutputArea({
  label,
  value,
  rows = 8,
  placeholder = 'Resultaat verschijnt hier…'
}: {
  label?: string
  value: string
  rows?: number
  placeholder?: string
}): JSX.Element {
  return (
    <div className="tool-field">
      <div className="tk-output-head">
        {label && <span className="tool-label">{label}</span>}
        <CopyButton value={value} />
      </div>
      <textarea
        className="tk-area tk-mono"
        rows={rows}
        value={value}
        readOnly
        spellCheck={false}
        placeholder={placeholder}
      />
    </div>
  )
}

/** Segmented single-choice control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="tool-seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Inline error banner; renders nothing when message is falsy. */
export function ErrorBanner({ message }: { message?: string | null }): JSX.Element | null {
  if (!message) return null
  return <div className="banner banner-error">{message}</div>
}

/** Checkbox with a label. */
export function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="tk-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/** A row of little labelled stat chips (counters, etc.). */
export function StatRow({ stats }: { stats: { label: string; value: string | number }[] }): JSX.Element {
  return (
    <div className="tk-stats">
      {stats.map((s) => (
        <div className="tk-stat" key={s.label}>
          <span className="tk-stat-value">{s.value}</span>
          <span className="tk-stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Small muted note line. */
export function Note({ children }: { children: ReactNode }): JSX.Element {
  return <p className="tk-note">{children}</p>
}
