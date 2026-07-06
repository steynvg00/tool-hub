import { JSX, useState } from 'react'
import { ToolShell, TextInput, CopyButton, ErrorBanner } from './toolkit'

type Rgb = { r: number; g: number; b: number }

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function hexToRgb(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16)
    }
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    }
  }
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  const hx = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${hx(r)}${hx(g)}${hx(b)}`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const hn = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hn < 60) {
    r = c
    g = x
  } else if (hn < 120) {
    r = x
    g = c
  } else if (hn < 180) {
    g = c
    b = x
  } else if (hn < 240) {
    g = x
    b = c
  } else if (hn < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function parseRgb(input: string): Rgb | null {
  const m = input.trim().match(/^(?:rgb\s*\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i)
  if (!m) return null
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  if (r > 255 || g > 255 || b > 255) return null
  return { r, g, b }
}

function parseHsl(input: string): Rgb | null {
  const m = input
    .trim()
    .match(/^(?:hsl\s*\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*%?\s*,\s*(\d{1,3})\s*%?\s*\)?$/i)
  if (!m) return null
  const h = Number(m[1])
  const s = Number(m[2])
  const l = Number(m[3])
  if (h > 360 || s > 100 || l > 100) return null
  return hslToRgb(h, s, l)
}

function ColorConvert(): JSX.Element {
  const [rgb, setRgb] = useState<Rgb>({ r: 74, g: 108, b: 212 })
  const [hexText, setHexText] = useState('#4a6cd4')
  const [rgbText, setRgbText] = useState('74, 108, 212')
  const [hslText, setHslText] = useState('223, 61%, 56%')
  const [hexErr, setHexErr] = useState<string | null>(null)
  const [rgbErr, setRgbErr] = useState<string | null>(null)
  const [hslErr, setHslErr] = useState<string | null>(null)

  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`

  const applyRgb = (next: Rgb): void => {
    setRgb(next)
    setHexText(rgbToHex(next.r, next.g, next.b))
    setRgbText(`${next.r}, ${next.g}, ${next.b}`)
    const h = rgbToHsl(next.r, next.g, next.b)
    setHslText(`${h.h}, ${h.s}%, ${h.l}%`)
    setHexErr(null)
    setRgbErr(null)
    setHslErr(null)
  }

  const onHex = (v: string): void => {
    setHexText(v)
    const parsed = hexToRgb(v)
    if (parsed) applyRgb(parsed)
    else setHexErr('Ongeldige HEX-waarde (gebruik #rgb of #rrggbb).')
  }

  const onRgb = (v: string): void => {
    setRgbText(v)
    const parsed = parseRgb(v)
    if (parsed) applyRgb(parsed)
    else setRgbErr('Ongeldige RGB-waarde (bv. "74, 108, 212", 0–255).')
  }

  const onHsl = (v: string): void => {
    setHslText(v)
    const parsed = parseHsl(v)
    if (parsed) applyRgb(parsed)
    else setHslErr('Ongeldige HSL-waarde (bv. "223, 61%, 56%").')
  }

  const onPicker = (v: string): void => {
    const parsed = hexToRgb(v)
    if (parsed) applyRgb(parsed)
  }

  return (
    <ToolShell
      title="Kleur-omzetter"
      subtitle="Bewerk een kleur als HEX, RGB of HSL — alles blijft in sync."
    >
      <div className="panel">
        <div className="tool-field">
          <label className="tool-label">Kies een kleur</label>
          <input
            type="color"
            value={hex}
            onChange={(e) => onPicker(e.target.value)}
            style={{ width: 64, height: 40, padding: 0, border: 'none', background: 'none' }}
          />
        </div>
        <div className="tk-color-preview" style={{ background: hex }} />
      </div>

      <div className="panel">
        <TextInput label="HEX" value={hexText} onChange={onHex} placeholder="#4a6cd4" mono />
        <ErrorBanner message={hexErr} />
        <TextInput label="RGB" value={rgbText} onChange={onRgb} placeholder="74, 108, 212" mono />
        <ErrorBanner message={rgbErr} />
        <TextInput label="HSL" value={hslText} onChange={onHsl} placeholder="223, 61%, 56%" mono />
        <ErrorBanner message={hslErr} />
      </div>

      <div className="panel">
        <dl className="tk-kv">
          <dt>HEX</dt>
          <dd className="tk-mono">
            {hex} <CopyButton value={hex} />
          </dd>
          <dt>RGB</dt>
          <dd className="tk-mono">
            {rgbStr} <CopyButton value={rgbStr} />
          </dd>
          <dt>HSL</dt>
          <dd className="tk-mono">
            {hslStr} <CopyButton value={hslStr} />
          </dd>
        </dl>
      </div>
    </ToolShell>
  )
}

export default ColorConvert
