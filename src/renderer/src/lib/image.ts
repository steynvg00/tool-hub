/**
 * Decode any browser-supported image File (PNG, JPEG, WebP, …) to ImageData.
 *
 * Uses createImageBitmap, which decodes the Blob directly instead of routing a
 * blob: URL through an <img> element — more reliable and not subject to the
 * page's img-src CSP. Throws a plain-language error the UI can show as-is.
 */
export async function loadImageData(file: File): Promise<ImageData> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      'Kon deze afbeelding niet lezen. Kies een geldig afbeeldingsbestand (PNG, JPEG of WebP).'
    )
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas niet beschikbaar in deze omgeving.')
    ctx.drawImage(bitmap, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    bitmap.close()
  }
}
