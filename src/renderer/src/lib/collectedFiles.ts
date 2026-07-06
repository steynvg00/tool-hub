// Bridge between the "Bestanden" panel and tool file-inputs.

/** Custom drag type identifying a file dragged out of the Bestanden panel. */
export const FILE_DRAG_MIME = 'application/x-toolhub-file'

/** Rebuild a real File from a collected-file id so a tool can consume it. */
export async function collectedFileToFile(id: string): Promise<File | null> {
  const res = await window.api.files.read(id)
  if (!res) return null
  const ab = new ArrayBuffer(res.data.length)
  new Uint8Array(ab).set(res.data)
  return new File([ab], res.name, { type: res.type })
}

/** Whether a drag carries a collected file (from the panel) or OS files. */
export function dragHasFile(dt: DataTransfer): boolean {
  const types = Array.from(dt.types)
  return types.includes(FILE_DRAG_MIME) || types.includes('Files')
}
