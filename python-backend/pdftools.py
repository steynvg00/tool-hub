"""PDF tools for Tool Hub: merge, split/extract, rotate, compress.

Uses pypdf (pure Python, so it freezes cleanly into the PyInstaller binary
without a native qpdf/ghostscript dependency).
"""
import io

from pypdf import PdfReader, PdfWriter


def _parse_pages(spec, n):
    """'1-3,5' (1-based) -> [0,1,2,4] (0-based), clamped to the document."""
    idx = []
    for part in (spec or "").split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            idx.extend(range(int(a) - 1, int(b)))
        else:
            idx.append(int(part) - 1)
    return [i for i in idx if 0 <= i < n]


def merge_pdfs(list_of_bytes):
    """Concatenate several PDFs into one, in the order given."""
    if not list_of_bytes:
        raise ValueError("No PDFs supplied")
    writer = PdfWriter()
    for b in list_of_bytes:
        reader = PdfReader(io.BytesIO(b))
        for page in reader.pages:
            writer.add_page(page)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def extract_pages(pdf_bytes, pages_spec):
    """Return a new PDF containing only the selected pages (e.g. '1-3,5')."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    idx = _parse_pages(pages_spec, len(reader.pages))
    if not idx:
        raise ValueError("No valid pages selected")
    writer = PdfWriter()
    for i in idx:
        writer.add_page(reader.pages[i])
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def split_all(pdf_bytes):
    """Split into single-page PDFs; returns list of (filename, bytes)."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    out = []
    for i, page in enumerate(reader.pages):
        writer = PdfWriter()
        writer.add_page(page)
        buf = io.BytesIO()
        writer.write(buf)
        out.append((f"page_{i + 1}.pdf", buf.getvalue()))
    return out


def rotate_pdf(pdf_bytes, degrees, pages_spec=None):
    """Rotate all pages (or a selection) by a multiple of 90 degrees."""
    degrees = int(degrees)
    reader = PdfReader(io.BytesIO(pdf_bytes))
    targets = set(_parse_pages(pages_spec, len(reader.pages))) if pages_spec else set(range(len(reader.pages)))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i in targets:
            page.rotate(degrees)
        writer.add_page(page)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def compress_pdf(pdf_bytes, image_quality=60):
    """Best-effort shrink: recompress content streams and downscale images.

    This is not as aggressive as Ghostscript, but it's pure-Python and safe.
    Returns the compressed bytes (or the original if it couldn't be reduced).
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    for page in writer.pages:
        try:
            page.compress_content_streams()  # lossless stream compression
        except Exception:
            pass
        try:
            for img in page.images:
                img.replace(img.image, quality=int(image_quality))  # lossy re-encode
        except Exception:
            pass

    try:
        writer.compress_identical_objects()
    except Exception:
        pass

    buf = io.BytesIO()
    writer.write(buf)
    result = buf.getvalue()
    # never hand back something bigger than the original
    return result if len(result) < len(pdf_bytes) else pdf_bytes
