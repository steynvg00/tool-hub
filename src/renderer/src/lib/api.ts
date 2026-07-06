// Thin client for the Python FastAPI sidecar.

const BASE_URL = 'http://127.0.0.1:8756'

// --- Shapes returned by GET /steps -----------------------------------------

export type ParamType = 'number' | 'select' | 'bool' | 'point_list' | 'color' | 'rect'

export interface ParamSpec {
  type: ParamType
  default: unknown
  min?: number
  max?: number
  options?: string[]
  help?: string
}

export interface StepDef {
  type: string
  category: 'generator' | 'modifier'
  label: string
  params: Record<string, ParamSpec>
}

// --- A configured step inside the user's pipeline --------------------------

export interface PipelineStep {
  id: string
  type: string
  params: Record<string, unknown>
}

// --- Presets (GET /presets, built-in) --------------------------------------

export interface PresetStep {
  type: string
  params: Record<string, unknown>
}

export interface Preset {
  id: string
  name: string
  description?: string
  steps: PresetStep[]
}

// --- Response of POST /background/remove -----------------------------------

export interface StepPreview {
  type: string
  preview: string // base64 PNG (no data: prefix)
}

export interface RemoveResult {
  final: string // base64 PNG
  steps: StepPreview[]
}

/** Turn a base64 PNG payload from the backend into a usable data URL. */
export function pngDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

export async function fetchSteps(): Promise<StepDef[]> {
  const res = await fetch(`${BASE_URL}/steps`)
  if (!res.ok) throw new Error(`GET /steps failed: ${res.status}`)
  const data = await res.json()
  return data.steps as StepDef[]
}

export async function fetchPresets(): Promise<Preset[]> {
  const res = await fetch(`${BASE_URL}/presets`)
  if (!res.ok) throw new Error(`GET /presets failed: ${res.status}`)
  const data = await res.json()
  return (data.presets ?? []) as Preset[]
}

export async function removeBackground(
  image: File,
  pipeline: PipelineStep[],
  intermediates = true
): Promise<RemoveResult> {
  const form = new FormData()
  form.append('image', image)
  // The backend wants a JSON string of {type, params} objects (no client id).
  form.append(
    'pipeline',
    JSON.stringify(pipeline.map(({ type, params }) => ({ type, params })))
  )
  form.append('intermediates', String(intermediates))

  const res = await fetch(`${BASE_URL}/background/remove`, {
    method: 'POST',
    body: form
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? `POST /background/remove failed: ${res.status}`)
  }
  return data as RemoveResult
}

// --- Image & file tools (raw-bytes downloads) ------------------------------

export interface FileResult {
  blob: Blob
  filename: string
  url: string // object URL for a download link; revoke when done
  size: number
}

function filenameFromDisposition(res: Response, fallback: string): string {
  const cd = res.headers.get('Content-Disposition') ?? ''
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
  return m ? decodeURIComponent(m[1]) : fallback
}

/**
 * POST a multipart form to an endpoint that returns the finished file as raw
 * bytes, and turn the response into a downloadable blob + object URL. On a
 * backend error (JSON {error}) it throws with that message.
 */
export async function processToFile(
  path: string,
  form: FormData,
  fallbackName = 'download'
): Promise<FileResult> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: form })
  if (!res.ok) {
    let msg = `POST ${path} failed: ${res.status}`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(msg)
  }
  const blob = await res.blob()
  return {
    blob,
    filename: filenameFromDisposition(res, fallbackName),
    url: URL.createObjectURL(blob),
    size: blob.size
  }
}

export interface PaletteColour {
  hex: string
  rgb: [number, number, number]
  fraction: number
}

export async function extractPalette(image: File, count: number): Promise<PaletteColour[]> {
  const form = new FormData()
  form.append('image', image)
  form.append('count', String(count))
  const res = await fetch(`${BASE_URL}/image/palette`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? `POST /image/palette failed: ${res.status}`)
  return data.colours as PaletteColour[]
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
