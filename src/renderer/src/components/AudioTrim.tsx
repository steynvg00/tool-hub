import { JSX, useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, StatRow, ErrorBanner, Note } from './toolkit'

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`
}

function AudioTrim(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const regionRef = useRef<Region | null>(null)

  // Manage the object URL for the picked file.
  useEffect(() => {
    if (!file) {
      setFileUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Build the waveform + selection region for the current file.
  useEffect(() => {
    if (!fileUrl || !containerRef.current) return
    setReady(false)
    setPlaying(false)
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: fileUrl,
      height: 96,
      waveColor: '#5a6b8c',
      progressColor: '#4a6cd4',
      cursorColor: '#e6b450',
      normalize: true
    })
    const regions = ws.registerPlugin(RegionsPlugin.create())
    wsRef.current = ws

    ws.on('decode', () => {
      const dur = ws.getDuration()
      setDuration(dur)
      const region = regions.addRegion({
        start: 0,
        end: dur,
        color: 'rgba(74, 108, 212, 0.18)',
        drag: true,
        resize: true
      })
      regionRef.current = region
      setStart(0)
      setEnd(dur)
      setReady(true)
    })
    regions.on('region-updated', (region) => {
      setStart(region.start)
      setEnd(region.end)
    })
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))

    return () => {
      ws.destroy()
      wsRef.current = null
      regionRef.current = null
    }
  }, [fileUrl])

  const togglePlay = (): void => {
    const ws = wsRef.current
    const region = regionRef.current
    if (!ws || !region) return
    if (playing) {
      ws.pause()
      setPlaying(false)
    } else {
      region.play(true) // stop at region end
      setPlaying(true)
    }
  }

  const editStart = (v: number): void => {
    if (Number.isNaN(v)) return
    const nv = Math.max(0, Math.min(v, end - 0.05))
    setStart(nv)
    regionRef.current?.setOptions({ start: nv })
  }
  const editEnd = (v: number): void => {
    if (Number.isNaN(v)) return
    const nv = Math.min(duration, Math.max(v, start + 0.05))
    setEnd(nv)
    regionRef.current?.setOptions({ end: nv })
  }

  const run = async (): Promise<void> => {
    if (!file) return
    if (end - start < 0.05) {
      setError('De selectie is te kort.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('start', String(start))
      form.append('end', String(end))
      setResult(await processToFile('/audio/trim', form, 'trimmed'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Audio knippen"
      subtitle="Selecteer een bereik in de golfvorm en knip dat fragment uit het bestand."
    >
      <div className="panel tool-panel">
        <FileButton
          label="Audiobestand"
          accept="audio/*"
          file={file}
          onPick={(f) => {
            setFile(f)
            setResult(null)
            setError(null)
          }}
        />
        <div className="tk-waveform" style={{ display: file ? 'block' : 'none' }}>
          <div ref={containerRef} />
          {!ready && file && <p className="tk-note">Golfvorm wordt geladen…</p>}
        </div>
        {ready && (
          <>
            <div className="tk-actions">
              <button className="btn" onClick={togglePlay} style={{ width: 'auto' }}>
                {playing ? '⏸ Pauze' : '▶ Speel selectie'}
              </button>
            </div>
            <div className="tk-row">
              <label className="tool-field">
                <span className="tool-label">Start (s)</span>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={Number(start.toFixed(2))}
                  onChange={(e) => editStart(Number(e.target.value))}
                />
              </label>
              <label className="tool-field">
                <span className="tool-label">Einde (s)</span>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={Number(end.toFixed(2))}
                  onChange={(e) => editEnd(Number(e.target.value))}
                />
              </label>
            </div>
            <StatRow
              stats={[
                { label: 'Duur', value: fmtTime(duration) },
                { label: 'Selectie', value: `${fmtTime(start)} – ${fmtTime(end)}` },
                { label: 'Lengte', value: fmtTime(Math.max(0, end - start)) }
              ]}
            />
          </>
        )}
        <ErrorBanner message={error} />
        <button className="btn btn-primary" disabled={!file || !ready || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Knippen'}
        </button>
        {result && <ResultDownload result={result} />}
        <Note>Sleep de randen van het gemarkeerde blok, of pas start/einde exact aan met de velden.</Note>
      </div>
    </ToolShell>
  )
}

export default AudioTrim
