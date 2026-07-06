import { zipSync } from 'fflate'
import type { FileResult } from './api'

/** Bundle processed files into a single (stored, not recompressed) zip blob. */
export async function zipBlobs(items: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {}
  const used = new Set<string>()
  for (const it of items) {
    let name = it.name
    if (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const base = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      let n = 2
      while (used.has(`${base}-${n}${ext}`)) n++
      name = `${base}-${n}${ext}`
    }
    used.add(name)
    entries[name] = new Uint8Array(await it.blob.arrayBuffer())
  }
  // level 0 = store: images/audio are already compressed, so skip deflate.
  const zipped = zipSync(entries, { level: 0 })
  const ab = new ArrayBuffer(zipped.length)
  new Uint8Array(ab).set(zipped)
  return new Blob([ab], { type: 'application/zip' })
}

/**
 * Process one or many files with the same operation. A single file yields that
 * file's result (unchanged single-file behaviour); multiple files are processed
 * in turn and delivered as one zip. `onProgress(done, total)` drives a progress
 * readout.
 */
export async function runBulk(
  files: File[],
  processOne: (file: File, index: number) => Promise<FileResult>,
  onProgress: (done: number, total: number) => void
): Promise<FileResult> {
  if (files.length <= 1) {
    onProgress(0, files.length)
    const r = await processOne(files[0], 0)
    onProgress(files.length, files.length)
    return r
  }
  const outputs: { name: string; blob: Blob }[] = []
  for (let i = 0; i < files.length; i++) {
    onProgress(i, files.length)
    const r = await processOne(files[i], i)
    outputs.push({ name: r.filename, blob: r.blob })
    URL.revokeObjectURL(r.url) // only the blob is needed for the zip
  }
  onProgress(files.length, files.length)
  const zip = await zipBlobs(outputs)
  return {
    blob: zip,
    filename: 'resultaten.zip',
    url: URL.createObjectURL(zip),
    size: zip.size
  }
}
