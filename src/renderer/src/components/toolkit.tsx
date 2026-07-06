import { JSX, ReactNode, useEffect, useRef, useState } from 'react'

// Shared building blocks for the small "gereedschap" tools. They wrap the
// existing app CSS (.tool, .panel, .tool-field, .banner …) plus a "Utility
// tools" section in main.css, so every tool looks native to the hub.

/**
 * Tool header with title, subtitle and an optional (i) info toggle that opens
 * an explanation panel. Shared by ToolShell and the older custom-header tools
 * so every tool can carry the same help affordance.
 */
export function ToolHeader({
  title,
  subtitle,
  info
}: {
  title: string
  subtitle: string
  info?: ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="tool-header">
        <div className="tool-header-row">
          <h1>{title}</h1>
          {info && (
            <button
              className="tk-info-btn"
              aria-label="Uitleg over deze tool"
              aria-expanded={open}
              title="Wat doet deze tool?"
              onClick={() => setOpen((o) => !o)}
            >
              i
            </button>
          )}
        </div>
        <p>{subtitle}</p>
      </header>
      {info && open && <div className="tk-info-panel">{info}</div>}
    </>
  )
}

/** Standard page scaffold: title + subtitle header (with optional info), then children. */
export function ToolShell({
  title,
  subtitle,
  info,
  children
}: {
  title: string
  subtitle: string
  info?: ReactNode
  children: JSX.Element | JSX.Element[]
}): JSX.Element {
  return (
    <div className="tool">
      <ToolHeader title={title} subtitle={subtitle} info={info} />
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

// Keep exactly one empty row at the end, and collapse accidental double-empties.
function withTrailingEmpty(arr: string[]): string[] {
  const out = arr.slice()
  while (out.length >= 2 && out[out.length - 1].trim() === '' && out[out.length - 2].trim() === '') {
    out.pop()
  }
  if (out.length === 0 || out[out.length - 1].trim() !== '') out.push('')
  return out
}

/**
 * An editable list of single-line entries: one input per entry, each with a ×
 * to remove it, and always one empty trailing row so typing a new entry makes
 * the next row appear. Reports the non-empty, trimmed entries via onChange.
 */
export function LineListEditor({
  initial = [],
  onChange,
  placeholder = 'toevoegen…'
}: {
  initial?: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}): JSX.Element {
  const [items, setItems] = useState<string[]>(() => withTrailingEmpty(initial))

  const emit = (next: string[]): void => {
    setItems(next)
    onChange(next.map((s) => s.trim()).filter((s) => s !== ''))
  }
  const setAt = (i: number, val: string): void => {
    const next = items.slice()
    next[i] = val
    emit(withTrailingEmpty(next))
  }
  const removeAt = (i: number): void => {
    emit(withTrailingEmpty(items.filter((_, j) => j !== i)))
  }

  return (
    <div className="tk-linelist">
      {items.map((it, i) => {
        const isLast = i === items.length - 1
        return (
          <div className="tk-linerow" key={i}>
            <input
              className="tk-lineinput"
              value={it}
              placeholder={isLast ? placeholder : ''}
              spellCheck={false}
              onChange={(e) => setAt(i, e.target.value)}
            />
            <button
              className="tk-linedel"
              aria-label="Regel verwijderen"
              title="Verwijderen"
              tabIndex={-1}
              onClick={() => removeAt(i)}
              style={{ visibility: isLast ? 'hidden' : 'visible' }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
