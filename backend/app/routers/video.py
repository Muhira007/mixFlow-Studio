"""
mixFlow — Video Router
POST /api/video/upload    — Upload footage + auto pre-process (proxy if >1080p)
POST /api/video/analyze   — Analyze footage quality (blur, shake)
POST /api/video/trim      — Calculate adaptive trim segments
POST /api/video/concat    — Concat clips with trim points
POST /api/video/render    — Full pipeline: concat + overlay audio → final output
"""

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, Field
from typing import Optional

from app.config import UPLOADS_DIR, OUTPUTS_DIR
from app.services.video_service import (
    preprocess_footage,
    analyze_footage,
    adaptive_trim,
    concat_clips,
)
from app.services.renderer import render_final

router = APIRouter()


# ---- Schemas ----

class UploadResponse(BaseModel):
    file_id: str
    original_name: str
    working_path: str
    was_proxied: bool
    original_resolution: str


class AnalyzeResponse(BaseModel):
    file: str
    duration: str
    resolution: str
    fps: float
    blur_avg: float
    shake_avg: float
    good_start_sec: float
    good_end_sec: float
    quality: str


class TrimSegment(BaseModel):
    file: str
    trim_start: float
    trim_end: float
    good_duration: float


class TrimRequest(BaseModel):
    analyses: list[dict]
    target_duration: float = Field(..., gt=0)
    min_keep: float = Field(default=3.0)


class TrimResponse(BaseModel):
    segments: list[dict]
    total_duration: float
    target_duration: float


class ConcatRequest(BaseModel):
    segments: list[dict]
    file_ids: list[str]
    output_width: int = Field(default=1080)
    output_height: int = Field(default=1920)


class ConcatResponse(BaseModel):
    output_path: str
    duration: float


class RenderRequest(BaseModel):
    video_path: str = Field(..., description="Path ke video hasil concat")
    audio_path: str = Field(..., description="Path ke file audio (TTS atau upload)")
    output_width: int = Field(default=1080)
    output_height: int = Field(default=1920)


class RenderResponse(BaseModel):
    output_path: str
    output_url: str


# ---- In-memory file registry ----
# file_id → { original_name, working_path, was_proxied, original_resolution }
file_registry: dict[str, dict] = {}


# ---- Endpoints ----

@router.post("/upload", response_model=UploadResponse)
async def upload_footage(file: UploadFile = File(...)):
    """
    Upload footage + auto pre-process if resolution >1080p.
    Saves original, creates proxy if needed, returns working path.
    """
    # Validate file type
    valid_ext = {".mp4", ".mov", ".avi", ".webm"}
    ext = Path(file.filename).suffix.lower()
    if ext not in valid_ext:
        raise HTTPException(status_code=400, detail=f"Format tidak didukung: {ext}")

    # Save original
    file_id = uuid.uuid4().hex[:10]
    orig_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
    with orig_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Pre-process (auto-proxy if >1080p)
        working_path, was_proxied = preprocess_footage(orig_path)
        w, h = 0, 0
        try:
            from app.services.video_service import detect_resolution
            w, h = detect_resolution(orig_path)
        except Exception:
            pass

        file_registry[file_id] = {
            "original_name": file.filename,
            "original_path": str(orig_path),
            "working_path": str(working_path),
            "was_proxied": was_proxied,
            "original_resolution": f"{w}×{h}" if w and h else "unknown",
        }

        return UploadResponse(
            file_id=file_id,
            original_name=file.filename,
            working_path=str(working_path),
            was_proxied=was_proxied,
            original_resolution=f"{w}×{h}" if w and h else "unknown",
        )
    except Exception as e:
        # Clean up on error
        orig_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=list[AnalyzeResponse])
async def analyze_footage(file_ids: list[str] = Form(...)):
    """
    Analyze uploaded footage quality: blur, shake, good segment detection.
    Accepts list of file_ids from /upload endpoint.
    """
    results = []
    for fid in file_ids:
        info = file_registry.get(fid)
        if not info:
            raise HTTPException(status_code=404, detail=f"File tidak ditemukan: {fid}")

        working_path = Path(info["working_path"])
        if not working_path.exists():
            raise HTTPException(status_code=404, detail=f"File proxy hilang: {working_path}")

        try:
            analysis = analyze_footage(working_path)
            analysis["file_id"] = fid
            results.append(analysis)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analyze error {fid}: {str(e)}")

    return results


@router.post("/trim", response_model=TrimResponse)
async def trim_footage(req: TrimRequest):
    """
    Calculate adaptive trim segments to match target audio duration.
    """
    try:
        segments = adaptive_trim(req.analyses, req.target_duration, req.min_keep)
        total_duration = sum(s["trim_end"] - s["trim_start"] for s in segments)
        return TrimResponse(
            segments=segments,
            total_duration=round(total_duration, 2),
            target_duration=req.target_duration,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/concat", response_model=ConcatResponse)
async def concat_footage(req: ConcatRequest):
    """
    Concatenate footage clips with trim points, resize to target resolution.
    """
    # Get source files
    source_files = []
    for fid in req.file_ids:
        info = file_registry.get(fid)
        if not info:
            raise HTTPException(status_code=404, detail=f"File tidak ditemukan: {fid}")
        source_files.append(Path(info["working_path"]))

    output_path = OUTPUTS_DIR / f"concat_{uuid.uuid4().hex[:8]}.mp4"

    try:
        result = concat_clips(
            segments=req.segments,
            source_files=source_files,
            output_path=output_path,
            target_w=req.output_width,
            target_h=req.output_height,
        )
        from app.services.tts_service import get_audio_duration
        duration = get_audio_duration(result)

        return ConcatResponse(
            output_path=str(result),
            duration=round(duration, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render", response_model=RenderResponse)
async def render_video(req: RenderRequest):
    """
    Final render: overlay audio onto concatenated video, encode for web.
    """
    video_path = Path(req.video_path)
    audio_path = Path(req.audio_path)

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio tidak ditemukan")

    try:
        output = render_final(
            video_path=video_path,
            audio_path=audio_path,
            output_width=req.output_width,
            output_height=req.output_height,
        )
        return RenderResponse(
            output_path=str(output),
            output_url=f"/api/video/download/{output.name}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{filename}")
async def download_video(filename: str):
    """Download rendered video file."""
    from fastapi.responses import FileResponse

    filepath = OUTPUTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File tidak ditemukan")

    return FileResponse(
        path=str(filepath),
        media_type="video/mp4",
        filename=filename,
    )
