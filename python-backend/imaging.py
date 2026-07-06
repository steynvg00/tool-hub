"""Image tools for Tool Hub: resize, convert, images->PDF, colour palette.

Uses Pillow for raster work and OpenCV for palette clustering (both already
bundled for the background remover, so no heavy new dependencies).
"""
import io

import cv2
import numpy as np
from PIL import Image

_ALIAS = {"JPG": "JPEG"}


def _load(img_bytes):
    im = Image.open(io.BytesIO(img_bytes))
    im.load()
    return im


def _prep_for_format(im, fmt, quality):
    """Flatten alpha for formats without transparency and set save params."""
    params = {}
    if fmt in ("JPEG", "WEBP"):
        params["quality"] = int(quality)
    if fmt == "JPEG":
        params["optimize"] = True
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[-1])
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")
    elif fmt == "PNG":
        params["optimize"] = True
    elif fmt == "WEBP" and im.mode == "P":
        im = im.convert("RGBA")
    return im, params


def _target_format(fmt, fallback):
    out = (fmt or fallback or "PNG").upper()
    return _ALIAS.get(out, out)


def resize_image(img_bytes, width=None, height=None, max_dim=None, quality=85, fmt=None):
    """Resize by exact size, single dimension (aspect-locked), or longest side."""
    im = _load(img_bytes)
    src_fmt = im.format or "PNG"
    w, h = im.size
    if max_dim:
        scale = float(max_dim) / max(w, h)
        new = (max(1, round(w * scale)), max(1, round(h * scale)))
    elif width and height:
        new = (int(width), int(height))
    elif width:
        new = (int(width), max(1, round(h * int(width) / w)))
    elif height:
        new = (max(1, round(w * int(height) / h)), int(height))
    else:
        new = (w, h)
    if new != (w, h):
        im = im.resize(new, Image.LANCZOS)
    out_fmt = _target_format(fmt, src_fmt)
    im, params = _prep_for_format(im, out_fmt, quality)
    buf = io.BytesIO()
    im.save(buf, format=out_fmt, **params)
    return buf.getvalue(), out_fmt


def convert_image(img_bytes, fmt, quality=85):
    """Convert to another raster format (PNG/JPEG/WEBP)."""
    im = _load(img_bytes)
    out_fmt = _target_format(fmt, None)
    im, params = _prep_for_format(im, out_fmt, quality)
    buf = io.BytesIO()
    im.save(buf, format=out_fmt, **params)
    return buf.getvalue(), out_fmt


def images_to_pdf(list_of_bytes):
    """Combine one or more images into a single PDF, one image per page."""
    if not list_of_bytes:
        raise ValueError("No images supplied")
    pages = []
    for b in list_of_bytes:
        im = _load(b)
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        pages.append(im)
    buf = io.BytesIO()
    pages[0].save(buf, format="PDF", save_all=True, append_images=pages[1:])
    return buf.getvalue()


def extract_palette(img_bytes, count=6):
    """Return the dominant colours via k-means, sorted by prevalence."""
    arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)  # BGR
    if img is None:
        raise ValueError("Could not decode image")
    h, w = img.shape[:2]
    if w > 200:  # downsample for speed; colour distribution is preserved
        img = cv2.resize(img, (200, max(1, round(200 * h / w))))
    samples = img.reshape(-1, 3).astype(np.float32)
    k = max(1, min(int(count), 12))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(samples, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k)
    total = int(counts.sum())
    out = []
    for i in np.argsort(-counts):
        b, g, r = centers[i].astype(int)
        out.append({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "rgb": [int(r), int(g), int(b)],
            "fraction": round(float(counts[i]) / total, 4),
        })
    return out
