import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, ErrorBanner } from './toolkit'
import { FileButton, ResultDownload } from './ToolFields'
import { useFileResult } from '../lib/useFileResult'

type Mode = 'encode' | 'analyse'

// ---- FFT (iterative radix-2 Cooley–Tukey, in-place) ------------------------
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k
        const b = i + k + (len >> 1)
        const vr = re[b] * cr - im[b] * ci
        const vi = re[b] * ci + im[b] * cr
        re[b] = re[a] - vr
        im[b] = im[a] - vi
        re[a] += vr
        im[a] += vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

// Turn a normalized intensity (0..1) into a viridis-like colour.
function colour(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [12, 8, 40]],
    [0.35, [58, 32, 120]],
    [0.6, [42, 110, 140]],
    [0.8, [90, 190, 110]],
    [1.0, [250, 232, 90]]
  ]
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1]
      const [t1, c1] = stops[i]
      const f = (t - t0) / (t1 - t0)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f)
      ]
    }
  }
  return stops[stops.length - 1][1]
}

// Compute an STFT spectrogram of mono samples and draw it to a canvas.
function renderSpectrogram(samples: Float32Array, fftSize = 512, hop = 128): HTMLCanvasElement {
  const bins = fftSize >> 1
  const win = new Float32Array(fftSize)
  for (let i = 0; i < fftSize; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1))
  const frames = Math.max(1, Math.floor((samples.length - fftSize) / hop) + 1)
  const cols = Math.min(frames, 1400)
  const colStep = frames / cols

  const mags = new Float32Array(cols * bins)
  let maxMag = 1e-9
  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  for (let c = 0; c < cols; c++) {
    const start = Math.floor(c * colStep) * hop
    for (let i = 0; i < fftSize; i++) {
      re[i] = (samples[start + i] ?? 0) * win[i]
      im[i] = 0
    }
    fft(re, im)
    for (let b = 0; b < bins; b++) {
      const m = Math.hypot(re[b], im[b])
      mags[c * bins + b] = m
      if (m > maxMag) maxMag = m
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = bins
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(cols, bins)
  const logMax = Math.log10(maxMag + 1e-9)
  for (let c = 0; c < cols; c++) {
    for (let b = 0; b < bins; b++) {
      const m = mags[c * bins + b]
      // dB-ish, normalized to 0..1 over ~60 dB of range.
      let t = (Math.log10(m + 1e-9) - logMax) / 3 + 1
      t = Math.max(0, Math.min(1, t))
      const [r, g, bl] = colour(t)
      // Low frequencies at the bottom of the image.
      const y = bins - 1 - b
      const di = (y * cols + c) * 4
      img.data[di] = r
      img.data[di + 1] = g
      img.data[di + 2] = bl
      img.data[di + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function writeStr(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
}

// 16-bit mono WAV from float samples in [-1, 1].
function floatToWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLen = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)
  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(view, 36, 'data')
  view.setUint32(40, dataLen, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// Render text to a small bitmap and read its brightness grid.
function textBrightness(text: string, bins: number): { bright: Float32Array; w: number; h: number } {
  const measure = document.createElement('canvas').getContext('2d')!
  const fontPx = Math.round(bins * 0.7)
  measure.font = `bold ${fontPx}px sans-serif`
  const width = Math.max(1, Math.ceil(measure.measureText(text || ' ').width) + fontPx)
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(1200, width)
  canvas.height = bins
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontPx}px sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const bright = new Float32Array(canvas.width * canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      bright[y * canvas.width + x] = data[(y * canvas.width + x) * 4] / 255
    }
  }
  return { bright, w: canvas.width, h: canvas.height }
}

function SpectrogramMessage(): JSX.Element {
  const [mode, setMode] = useState<Mode>('encode')
  const [text, setText] = useState('HALLO')
  const [audio, setAudio] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useFileResult()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const canvasToPng = async (canvas: HTMLCanvasElement, name: string): Promise<void> => {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('Kon PNG niet maken.')
    const url = URL.createObjectURL(blob)
    setResult({ blob, filename: name, url, size: blob.size })
    setImgUrl(url)
  }

  const encode = async (): Promise<void> => {
    const bins = 180
    const { bright, w, h } = textBrightness(text.trim() || ' ', bins)
    const sr = 16000
    const fMin = 500
    const fMax = 4500
    const colSamples = 320
    const total = w * colSamples
    const out = new Float32Array(total)
    const omega = new Float32Array(h)
    const phase = new Float32Array(h)
    for (let r = 0; r < h; r++) {
      const frac = (h - 1 - r) / (h - 1)
      const f = fMin + (fMax - fMin) * frac
      omega[r] = (2 * Math.PI * f) / sr
    }
    for (let i = 0; i < total; i++) {
      const c = Math.min(w - 1, Math.floor(i / colSamples))
      let s = 0
      for (let r = 0; r < h; r++) {
        phase[r] += omega[r]
        if (phase[r] > Math.PI * 2) phase[r] -= Math.PI * 2
        const b = bright[r * w + c]
        if (b > 0.2) s += b * Math.sin(phase[r])
      }
      out[i] = s
    }
    let peak = 1e-9
    for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]))
    for (let i = 0; i < total; i++) out[i] = (out[i] / peak) * 0.9

    const wav = floatToWav(out, sr)
    const url = URL.createObjectURL(wav)
    setResult({ blob: wav, filename: 'spectrogram-boodschap.wav', url, size: wav.size })
    setAudioUrl(url)
    // Confirm it worked by showing the spectrogram of what we just made.
    const spec = renderSpectrogram(out)
    const specBlob = await new Promise<Blob | null>((res) => spec.toBlob(res, 'image/png'))
    if (specBlob) setImgUrl(URL.createObjectURL(specBlob))
  }

  const analyse = async (): Promise<void> => {
    const buf = await audio!.arrayBuffer()
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    try {
      const decoded = await ctx.decodeAudioData(buf)
      const ch = decoded.getChannelData(0)
      // Cap to ~30s so a long file doesn't stall the FFT.
      const maxSamples = decoded.sampleRate * 30
      const samples = ch.length > maxSamples ? ch.slice(0, maxSamples) : ch
      const canvas = renderSpectrogram(new Float32Array(samples))
      await canvasToPng(canvas, `${audio!.name}.spectrogram.png`)
    } finally {
      ctx.close()
    }
  }

  const run = async (): Promise<void> => {
    if (mode === 'analyse' && !audio) {
      setError('Kies eerst een audiobestand.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    setImgUrl(null)
    setAudioUrl(null)
    try {
      if (mode === 'encode') await encode()
      else await analyse()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Spectrogram-boodschap"
      subtitle="Bekijk audio als spectrogram — of brand tekst in een geluid zodat het zichtbaar wordt in het frequentiebeeld."
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'encode', label: 'Tekst → geluid' },
            { value: 'analyse', label: 'Audio → spectrogram' }
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
        />
        {mode === 'encode' ? (
          <TextInput label="Tekst om in te branden" value={text} onChange={setText} placeholder="HALLO" />
        ) : (
          <FileButton label="Audiobestand" accept="audio/*" file={audio} onPick={setAudio} />
        )}
        <ErrorBanner message={error} />
        <button className="btn btn-primary" onClick={run} disabled={busy}>
          {busy ? 'Bezig…' : mode === 'encode' ? 'Maak geluid + spectrogram' : 'Teken spectrogram'}
        </button>
        {result && <ResultDownload result={result} />}
        {audioUrl && (
          <audio className="tk-audio" controls src={audioUrl}>
            Je browser ondersteunt geen audio.
          </audio>
        )}
        {imgUrl && (
          <div className="tk-stego-preview">
            <img src={imgUrl} alt="Spectrogram" />
          </div>
        )}
        <Note>
          {mode === 'encode'
            ? 'De tekst wordt met een bank sinussen in het frequentiebeeld getekend. Open de WAV in een spectrogram-viewer (of gebruik hierboven "Audio → spectrogram") en je ziet de letters verschijnen.'
            : 'Lage tonen onderaan, hoge bovenaan; helderder = meer energie. Werkt met MP3, WAV, M4A en meer.'}
        </Note>
      </div>
    </ToolShell>
  )
}

export default SpectrogramMessage
