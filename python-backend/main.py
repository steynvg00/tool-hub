"""Tool Hub - Python sidecar (FastAPI).

Electron starts this as a local process and talks to it over HTTP on 127.0.0.1.
Each Tool Hub feature becomes an endpoint here; today it hosts background removal.

Run standalone for testing:
    uvicorn main:app --host 127.0.0.1 --port 8756
"""
import json
import os
import sys

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pipeline.engine import run_pipeline
from pipeline.registry import list_steps

# When frozen by PyInstaller, bundled data files (presets.json) live under
# sys._MEIPASS; running from source they sit next to this file.
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Tool Hub Backend")

# Electron's renderer runs on a different origin in dev, so allow local calls.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/steps")
def steps():
    """List every available technique + its params so the UI can build itself."""
    return {"steps": list_steps()}


@app.get("/presets")
def presets():
    """Return the built-in chain presets. User presets live in Electron userData."""
    try:
        with open(os.path.join(BASE_DIR, "presets.json"), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"presets": []}


def _decode_image(raw: bytes):
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


@app.post("/background/remove")
async def remove_background(
    image: UploadFile = File(...),
    pipeline: str = Form(...),
    intermediates: bool = Form(False),
):
    """Apply a background-removal pipeline to an uploaded image.

    - image: the source file (png/jpg/webp)
    - pipeline: JSON string, e.g. '[{"type":"grabcut","params":{"iterations":5}}]'
    - intermediates: if true, also return a preview PNG after each step
    Returns { "final": <base64 png>, "steps": [ {type, preview}, ... ] }.
    """
    try:
        img = _decode_image(await image.read())
        steps_list = json.loads(pipeline)
        final_png, previews = run_pipeline(img, steps_list, return_intermediates=intermediates)
        return {"final": final_png, "steps": previews}
    except Exception as exc:  # surface a clean error to the UI
        return JSONResponse(status_code=400, content={"error": str(exc)})
