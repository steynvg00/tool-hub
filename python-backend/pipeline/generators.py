"""Generators: techniques that CREATE a foreground mask from an image.

Convention: every generator receives (image_bgr, mask, params) and returns a new
mask (uint8, 0=background, 255=foreground). Generators intersect their result
with the incoming mask (bitwise_and), so chaining two generators keeps only
pixels both agree are foreground. The pipeline starts with an all-255 mask, so
the first generator simply defines its own foreground.
"""
import cv2
import numpy as np


def _sample_corner_color(image):
    """Average the four corners - a good guess for a uniform background color."""
    h, w = image.shape[:2]
    corners = [image[0, 0], image[0, w - 1], image[h - 1, 0], image[h - 1, w - 1]]
    return np.mean(corners, axis=0)


def chroma_key(image, mask, params):
    """Remove pixels close to a single background color (green screen, white studio)."""
    key = params.get("color")
    tol = float(params.get("tolerance", 40))
    if key is None:
        key = _sample_corner_color(image)
    key = np.array(key, dtype=np.float32)
    diff = np.linalg.norm(image.astype(np.float32) - key, axis=2)
    fg = (diff > tol).astype(np.uint8) * 255
    return cv2.bitwise_and(mask, fg)


def flood_fill(image, mask, params):
    """Magic-wand: flood from seed point(s) to mark connected background.

    With no seeds given it starts from all four corners, so the background gets
    caught even if the subject touches one corner. Add interior seed points to
    also clear fully-enclosed background pockets (regions the edge flood can't
    reach, e.g. gaps between crossed swords)."""
    h, w = image.shape[:2]
    seeds = params.get("seeds") or [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]
    tol = int(params.get("tolerance", 20))
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    work = image.copy()
    for (x, y) in seeds:
        x = min(max(int(x), 0), w - 1)
        y = min(max(int(y), 0), h - 1)
        cv2.floodFill(
            work, ff_mask, (x, y), 0,
            (tol, tol, tol), (tol, tol, tol),
            flags=4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY,
        )
    background = ff_mask[1:-1, 1:-1]
    fg = np.where(background > 0, 0, 255).astype(np.uint8)
    return cv2.bitwise_and(mask, fg)


def threshold(image, mask, params):
    """Separate foreground/background by brightness. Otsu picks the split automatically."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    method = params.get("method", "otsu")
    if method == "otsu":
        _, t = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        _, t = cv2.threshold(gray, int(params.get("value", 127)), 255, cv2.THRESH_BINARY)
    if params.get("invert", False):
        t = cv2.bitwise_not(t)
    return cv2.bitwise_and(mask, t)


def grabcut(image, mask, params):
    """Best general-purpose non-AI method. A rough rectangle around the subject
    is enough; the algorithm separates foreground from background iteratively."""
    h, w = image.shape[:2]
    rect = params.get("rect")
    if rect is None:
        m = int(min(h, w) * 0.05)
        rect = [m, m, w - 2 * m, h - 2 * m]
    gc_mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(
        image, gc_mask, tuple(int(v) for v in rect), bgd, fgd,
        int(params.get("iterations", 5)), cv2.GC_INIT_WITH_RECT,
    )
    fg = np.where(
        (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)
    return cv2.bitwise_and(mask, fg)


def contour(image, mask, params):
    """Find edges, keep the largest enclosed shape. Good for clearly-outlined objects."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    lo = int(params.get("low", 50))
    hi = int(params.get("high", 150))
    edges = cv2.Canny(gray, lo, hi)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    fg = np.zeros(gray.shape, np.uint8)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        cv2.drawContours(fg, [largest], -1, 255, cv2.FILLED)
    return cv2.bitwise_and(mask, fg)
