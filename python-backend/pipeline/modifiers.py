"""Modifiers: techniques that REFINE an existing mask. These are your chain steps.

Convention: every modifier receives (image_bgr, mask, params) and returns a new
mask (uint8). Unlike generators they don't look for the subject - they clean up
or reshape whatever mask the previous step produced.
"""
import cv2
import numpy as np

_MORPH_OPS = {
    "open": cv2.MORPH_OPEN,      # remove small specks
    "close": cv2.MORPH_CLOSE,    # fill small holes
    "erode": cv2.MORPH_ERODE,    # shrink the mask
    "dilate": cv2.MORPH_DILATE,  # grow the mask
}


def morphology(image, mask, params):
    """Clean up: fill holes, remove speckles, tighten or loosen the edge."""
    k = int(params.get("kernel", 5))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    op = _MORPH_OPS.get(params.get("op", "close"), cv2.MORPH_CLOSE)
    return cv2.morphologyEx(mask, op, kernel, iterations=int(params.get("iterations", 1)))


def feather(image, mask, params):
    """Soften the mask edge so the cutout blends naturally instead of a hard line."""
    r = int(params.get("radius", 3))
    k = max(1, r) * 2 + 1
    return cv2.GaussianBlur(mask, (k, k), 0)


def keep_largest(image, mask, params):
    """Keep only the biggest connected blob - drops stray leftover regions."""
    binary = (mask > 127).astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if num <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(labels == largest, 255, 0).astype(np.uint8)


def invert(image, mask, params):
    """Swap foreground and background - handy if a generator picked the wrong side."""
    return cv2.bitwise_not(mask)
