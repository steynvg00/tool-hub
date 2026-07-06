// Bridge between the "Bestanden" file browser and tool file-inputs.

/** Custom drag type carrying the absolute path of a file dragged from the browser. */
export const FILE_DRAG_MIME = 'application/x-toolhub-file'

/**
 * Read a dragged file's bytes (on demand, at drop time) and wrap them in a real
 * File so a tool can consume it. The path comes from the drag payload.
 */
export async function readDraggedFile(path: string): Promise<File | null> {
  const res = await window.api.browser.read(path)
  if (!res) return null
  const ab = new ArrayBuffer(res.data.length)
  new Uint8Array(ab).set(res.data)
  return new File([ab], res.name, { type: res.type })
}

/** Whether a drag carries a browser file (from the panel) or OS files. */
export function dragHasFile(dt: DataTransfer): boolean {
  const types = Array.from(dt.types)
  return types.includes(FILE_DRAG_MIME) || types.includes('Files')
}
