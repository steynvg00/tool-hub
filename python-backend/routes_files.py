"""Endpoints for the image & file tools. main.py wires this in with:

    from routes_files import router as files_router
    app.include_router(files_router)

Processing endpoints return the finished file as raw bytes with the right
Content-Type + Content-Disposition, so the frontend can offer it as a download.
"""
import io
import json
import zipfile
from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

import imaging
import pdftools

router = APIRouter()

_MIME = {
    "PNG": "image/png",
    "JPEG": "image/jpeg",
    "WEBP": "image/webp",
    "PDF": "application/pdf",
}


def _file_response(data: bytes, fmt: str, name: str):
    mime = _MIME.get(fmt.upper(), "application/octet-stream")
    return Response(
        content=data,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


def _err(msg: str):
    return JSONResponse(status_code=400, content={"error": msg})


# ---------------- image tools ----------------

@router.post("/image/resize")
async def image_resize(
    image: UploadFile = File(...),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    max_dim: Optional[int] = Form(None),
    quality: int = Form(85),
    fmt: Optional[str] = Form(None),
):
    try:
        data, out_fmt = imaging.resize_image(
            await image.read(), width=width, height=height,
            max_dim=max_dim, quality=quality, fmt=fmt,
        )
        return _file_response(data, out_fmt, f"resized.{out_fmt.lower()}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/image/convert")
async def image_convert(image: UploadFile = File(...), fmt: str = Form(...), quality: int = Form(85)):
    try:
        data, out_fmt = imaging.convert_image(await image.read(), fmt=fmt, quality=quality)
        return _file_response(data, out_fmt, f"converted.{out_fmt.lower()}")
    except Exception as exc:
        return _err(str(exc))


@router.post("/image/to-pdf")
async def image_to_pdf(images: List[UploadFile] = File(...)):
    try:
        blobs = [await f.read() for f in images]
        data = imaging.images_to_pdf(blobs)
        return _file_response(data, "PDF", "images.pdf")
    except Exception as exc:
        return _err(str(exc))


@router.post("/image/palette")
async def image_palette(image: UploadFile = File(...), count: int = Form(6)):
    try:
        colours = imaging.extract_palette(await image.read(), count=count)
        return {"colours": colours}
    except Exception as exc:
        return _err(str(exc))


# ---------------- pdf tools ----------------

@router.post("/pdf/merge")
async def pdf_merge(files: List[UploadFile] = File(...)):
    try:
        blobs = [await f.read() for f in files]
        return _file_response(pdftools.merge_pdfs(blobs), "PDF", "merged.pdf")
    except Exception as exc:
        return _err(str(exc))


@router.post("/pdf/split")
async def pdf_split(
    file: UploadFile = File(...),
    pages: Optional[str] = Form(None),
    mode: str = Form("range"),
):
    """mode='range' + pages='1-3,5' -> one PDF of those pages.
    mode='each' -> a zip with every page as its own PDF."""
    try:
        data = await file.read()
        if mode == "each":
            parts = pdftools.split_all(data)
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
                for name, blob in parts:
                    z.writestr(name, blob)
            return Response(
                content=buf.getvalue(), media_type="application/zip",
                headers={"Content-Disposition": 'attachment; filename="pages.zip"'},
            )
        if not pages:
            return _err("Specify pages (e.g. 1-3,5) or use mode=each")
        return _file_response(pdftools.extract_pages(data, pages), "PDF", "extracted.pdf")
    except Exception as exc:
        return _err(str(exc))


@router.post("/pdf/rotate")
async def pdf_rotate(
    file: UploadFile = File(...),
    degrees: int = Form(90),
    pages: Optional[str] = Form(None),
):
    try:
        data = pdftools.rotate_pdf(await file.read(), degrees=degrees, pages_spec=pages)
        return _file_response(data, "PDF", "rotated.pdf")
    except Exception as exc:
        return _err(str(exc))


@router.post("/pdf/compress")
async def pdf_compress(file: UploadFile = File(...), image_quality: int = Form(60)):
    try:
        src = await file.read()
        out = pdftools.compress_pdf(src, image_quality=image_quality)
        return _file_response(out, "PDF", "compressed.pdf")
    except Exception as exc:
        return _err(str(exc))
