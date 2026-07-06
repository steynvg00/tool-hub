# Tool Hub — Python backend (sidecar)

The image-processing engine for Tool Hub. Electron starts this as a local process
and talks to it over HTTP on `127.0.0.1`. Every Tool Hub feature becomes an
endpoint here; today it hosts **background removal**.

## Setup (one time)

From inside this folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8756
```

Then open http://127.0.0.1:8756/steps in a browser to see the available techniques.

## How it works — the mask pipeline

Background removal without AI = building an **alpha mask** (white = keep,
black = remove) and applying it as transparency. Every technique is one of two
kinds:

- **generators** (`pipeline/generators.py`) — create a mask from the image
  (chroma key, flood fill, threshold, GrabCut, edge contour)
- **modifiers** (`pipeline/modifiers.py`) — refine an existing mask
  (morphology, feather, keep-largest, invert)

A **pipeline** is just an ordered list of steps:

```json
[
  {"type": "grabcut",    "params": {"iterations": 5}},
  {"type": "morphology", "params": {"op": "close", "kernel": 5}},
  {"type": "feather",    "params": {"radius": 3}}
]
```

One step = a single edit. Several steps = a chain. Any order works, because every
step reads and writes the same mask.

## Endpoints

| Method | Path                  | Purpose                                        |
|--------|-----------------------|------------------------------------------------|
| GET    | `/health`             | liveness check (Electron waits for this)       |
| GET    | `/steps`              | list techniques + params (UI builds itself)    |
| POST   | `/background/remove`  | apply a pipeline; returns final PNG + previews  |

`/background/remove` takes multipart form fields: `image` (file),
`pipeline` (JSON string), `intermediates` (bool — return a preview per step).
Response: `{ "final": <base64 png>, "steps": [ {type, preview}, ... ] }`.

## Adding a new technique

Add a function to `generators.py` or `modifiers.py`, then register it in
`pipeline/registry.py` with a param schema. It appears in the UI automatically —
no frontend changes needed.

## Adding a whole new tool later

Add a new endpoint in `main.py` (e.g. `/convert/image`) and a new module beside
`pipeline/`. The Electron side already knows how to start and reach this server.
