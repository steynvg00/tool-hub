// A small, generic hand-off so any tool can send an image to the Print layout
// tool: stash the image, then navigate to Print layout, which picks it up on
// mount. Kept deliberately tool-agnostic — bingo is the first user, but QR,
// palette and others can call sendToPrintLayout() the same way.

let pending: string | null = null

/** Stash an image (data URL) and open the Print layout tool with it loaded. */
export function sendToPrintLayout(dataUrl: string, openTool: (id: string) => void): void {
  pending = dataUrl
  openTool('print')
}

/** Take the pending print image (once), or null if there is none. */
export function consumePendingPrint(): string | null {
  const p = pending
  pending = null
  return p
}
