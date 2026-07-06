import { JSX } from 'react'
import type { ParamSpec } from '../lib/api'

interface Props {
  name: string
  spec: ParamSpec
  value: unknown
  onChange: (value: unknown) => void
}

/** Renders one input for a single step parameter, driven by its schema type. */
function ParamControl({ name, spec, value, onChange }: Props): JSX.Element {
  const label = (
    <span className="param-label" title={spec.help}>
      {name}
    </span>
  )

  switch (spec.type) {
    case 'number':
      return (
        <label className="param">
          {label}
          <input
            type="number"
            min={spec.min}
            max={spec.max}
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </label>
      )

    case 'select':
      return (
        <label className="param">
          {label}
          <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {(spec.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      )

    case 'bool':
      return (
        <label className="param param-inline">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
        </label>
      )

    case 'color':
      // null = "auto-sample corners"; a checkbox toggles between auto and a picker.
      return (
        <div className="param">
          {label}
          <div className="param-inline">
            <input
              type="checkbox"
              checked={value !== null && value !== undefined}
              onChange={(e) => onChange(e.target.checked ? '#00ff00' : null)}
            />
            <span className="param-hint">custom</span>
            {value !== null && value !== undefined && (
              <input
                type="color"
                value={String(value)}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          </div>
        </div>
      )

    // point_list and rect are niche — accept raw JSON so nothing is unsupported.
    case 'point_list':
    case 'rect':
    default:
      return (
        <label className="param">
          {label}
          <input
            type="text"
            className="param-json"
            placeholder={spec.help ?? 'JSON'}
            value={value === null || value === undefined ? '' : JSON.stringify(value)}
            onChange={(e) => {
              const raw = e.target.value.trim()
              if (raw === '') return onChange(null)
              try {
                onChange(JSON.parse(raw))
              } catch {
                /* keep last valid value until JSON parses */
              }
            }}
          />
        </label>
      )
  }
}

export default ParamControl
