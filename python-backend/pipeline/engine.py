"""The engine: apply an ordered list of steps to an image.

A "pipeline" is just a list of steps:
    [{"type": "grabcut", "params": {...}}, {"type": "feather", "params": {...}}]

The engine starts with an all-foreground mask and runs each step in order. This
single abstraction gives you both single edits (one step) and chains (many),
and - because every step reads and writes the same mask - any order works.
"""
import base64
import cv2
import numpy as np

from .registry import REGISTRY


def _composite(image, mask):
    """Combine BGR image + mask into a BGRA image (mask becomes the alpha channel)."""
    b, gg, r = cv2.split(image)
    return cv2.merge([b, gg, r, mask])


def _encode_png(bgra):
    ok, buf = cv2.imencode(".png", bgra)
    if not ok:
        raise RuntimeError("PNG encode failed")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def run_pipeline(image, steps, return_intermediates=False):
    """Run the pipeline. Returns (final_png_b64, [{"type", "preview"} ...])."""
    mask = np.full(image.shape[:2], 255, np.uint8)  # start: everything is foreground
    intermediates = []
    for step in steps:
        entry = REGISTRY.get(step.get("type"))
        if entry is None:
            raise ValueError(f"Unknown step type: {step.get('type')}")
        mask = entry["fn"](image, mask, step.get("params", {}))
        if return_intermediates:
            intermediates.append({
                "type": step["type"],
                "preview": _encode_png(_composite(image, mask)),
            })
    final_png = _encode_png(_composite(image, mask))
    return final_png, intermediates
