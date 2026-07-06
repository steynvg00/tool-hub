"""Audio endpoints. main.py wires this in with:

    from routes_audio import router as audio_router
    app.include_router(audio_router)

Each endpoint returns the processed file as raw bytes with the right
Content-Type + Content-Disposition, matching the file-tools pattern.
"""
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

import audio

router = APIRouter()

_MIME = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac",
    "m4a": "audio/mp4", "aac": "audio/aac", "ogg": "audio/ogg",
}


def _resp(data: bytes, fmt: str, name: str):
    return Response(
        content=data,
        media_type=_MIME.get(fmt, "application/octet-stream"),
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


def _err(msg: str):
    return JSONResponse(status_code=400, content={"error": msg})


def _ext(filename: str, fallback: str) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return fallback


@router.post("/audio/convert")
async def audio_convert(
    file: UploadFile = File(...),
    format: str = Form(...),
    bitrate: Optional[int] = Form(None),
):
    try:
        data, fmt = audio.convert(await file.read(), _ext(file.filename, "mp3"), format, bitrate)
        return _resp(data, fmt, f"converted.{fmt}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/audio/trim")
async def audio_trim(file: UploadFile = File(...), start: float = Form(...), end: float = Form(...)):
    try:
        ext = _ext(file.filename, "mp3")
        data, fmt = audio.trim(await file.read(), ext, start, end)
        return _resp(data, fmt, f"trimmed.{fmt}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/audio/volume")
async def audio_volume(file: UploadFile = File(...), db: float = Form(...)):
    try:
        ext = _ext(file.filename, "mp3")
        data, fmt = audio.adjust_volume(await file.read(), ext, db)
        return _resp(data, fmt, f"volume.{fmt}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/audio/normalize")
async def audio_normalize(file: UploadFile = File(...)):
    try:
        ext = _ext(file.filename, "mp3")
        data, fmt = audio.normalize(await file.read(), ext)
        return _resp(data, fmt, f"normalized.{fmt}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/audio/fade")
async def audio_fade(
    file: UploadFile = File(...),
    fade_in: float = Form(0.0),
    fade_out: float = Form(0.0),
):
    try:
        ext = _ext(file.filename, "mp3")
        data, fmt = audio.fade(await file.read(), ext, fade_in, fade_out)
        return _resp(data, fmt, f"faded.{fmt}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/audio/extract")
async def audio_extract(
    file: UploadFile = File(...),
    format: str = Form("mp3"),
    bitrate: int = Form(192),
):
    try:
        ext = _ext(file.filename, "mp4")
        data, fmt = audio.extract_audio(await file.read(), ext, format, bitrate)
        return _resp(data, fmt, f"audio.{fmt}")
    except Exception as exc:
        return _err(str(exc))
