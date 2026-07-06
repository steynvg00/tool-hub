// Color harmony helpers — pure functions, browser-safe. Basis voor de kleur-tools.
// Werkt via HSL zodat harmonieën simpele rotaties op het kleurenwiel zijn.

export type RGB = { r: number; g: number; b: number }
export type HSL = { h: number; s: number; l: number }

// ---------- conversies ----------
export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex))
export const hslToHex = (hsl: HSL): string => rgbToHex(hslToRgb(hsl))

const rot = (hex: string, deg: number): string => {
  const hsl = hexToHsl(hex)
  return hslToHex({ ...hsl, h: hsl.h + deg })
}

// ---------- "tegenovergestelde" kleuren ----------
// Complementair = de designer-tegenpool (180° op het wiel).
export const complementary = (hex: string): string => rot(hex, 180)

// Letterlijke RGB-inversie (255 - kanaal). Iets anders dan complementair.
export function invert(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex({ r: 255 - r, g: 255 - g, b: 255 - b })
}

// Beste leesbare tekstkleur (zwart of wit) op deze achtergrond, via luminantie.
export function contrastText(hex: string): '#000000' | '#ffffff' {
  const { r, g, b } = hexToRgb(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#000000' : '#ffffff'
}

// ---------- harmonieën ----------
export type HarmonyType =
  | 'complementary' | 'analogous' | 'triadic'
  | 'tetradic' | 'split-complementary' | 'monochromatic'

export function harmony(hex: string, type: HarmonyType): string[] {
  switch (type) {
    case 'complementary': return [hex, rot(hex, 180)]
    case 'analogous': return [rot(hex, -30), hex, rot(hex, 30)]
    case 'triadic': return [hex, rot(hex, 120), rot(hex, 240)]
    case 'tetradic': return [hex, rot(hex, 90), rot(hex, 180), rot(hex, 270)]
    case 'split-complementary': return [hex, rot(hex, 150), rot(hex, 210)]
    case 'monochromatic': {
      const { h, s } = hexToHsl(hex)
      return [20, 35, 50, 65, 80].map((l) => hslToHex({ h, s, l }))
    }
  }
}

// ---------- N passende kleuren op basis van één kleur ----------
export type PaletteMode = 'harmonious' | 'analogous' | 'monochromatic'

export function palette(hex: string, count: number, mode: PaletteMode = 'harmonious'): string[] {
  const n = Math.max(1, Math.min(count, 12))
  const base = hexToHsl(hex)
  if (mode === 'harmonious') {
    // gelijkmatig verdeelde tinten over het kleurenwiel vanaf de basiskleur
    return Array.from({ length: n }, (_, i) => hslToHex({ ...base, h: base.h + (360 / n) * i }))
  }
  if (mode === 'analogous') {
    // dicht bij elkaar liggende tinten (±30° totaal gespreid)
    const spread = 30
    return Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5
      return hslToHex({ ...base, h: base.h + t * spread * 2 })
    })
  }
  // monochromatic: zelfde tint, oplopende lichtheid
  return Array.from({ length: n }, (_, i) => {
    const l = n === 1 ? base.l : 20 + (65 / (n - 1)) * i
    return hslToHex({ ...base, l })
  })
}
