"""
mixFlow Studio — Video Router
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
    analyze_footage as do_analyze,
    adaptive_trim,
    concat_clips,
)
from app.services.renderer import render_final
from app.database import add_file_record, list_file_records, clear_file_records, get_file_record

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

        # Save to SQLite for resume
        add_file_record(
            fid=file_id,
            name=file.filename,
            orig=str(orig_path),
            work=str(working_path),
            proxied=was_proxied,
            res=f"{w}×{h}" if w and h else "unknown",
        )

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
            info = get_file_record(fid)
            if info:
                file_registry[fid] = info
        
        if not info:
            raise HTTPException(status_code=404, detail=f"File tidak ditemukan: {fid}")

        working_path = Path(info["working_path"])
        if not working_path.exists():
            raise HTTPException(status_code=404, detail=f"File proxy hilang: {working_path}")

        try:
            analysis = do_analyze(working_path)
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
            info = get_file_record(fid)
            if info:
                file_registry[fid] = info
        
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

    # If audio is just a filename, resolve from OUTPUTS_DIR
    if not audio_path.is_absolute() or not audio_path.exists():
        resolved = OUTPUTS_DIR / audio_path.name
        if resolved.exists():
            audio_path = resolved

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail=f"Audio tidak ditemukan: {audio_path}")
        
    cover_image_path = None
    try:
        from app.routers.cover import get_cover_settings
        from app.services.cover_gen import extract_representative_frame, generate_cover_image
        from app.services.caption_rewriter import generate_cover_title
        
        cover_cfg = get_cover_settings()
        template = cover_cfg.get("template", "none")
        if template != "none":
            # Generate cover
            import tempfile
            base_frame_path = tempfile.mktemp(suffix=".jpg", dir=str(OUTPUTS_DIR))
            final_cover_path = tempfile.mktemp(suffix=".jpg", dir=str(OUTPUTS_DIR))
            
            # Read SRT for title generation
            srt_path = OUTPUTS_DIR / f"{audio_path.stem}.srt"
            srt_content = ""
            if srt_path.exists():
                with open(srt_path, "r", encoding="utf-8") as f:
                    srt_content = f.read()
                    
            title_max_words = cover_cfg.get("title_max_words", 5)
            title_style = cover_cfg.get("title_style", "casual")
            
            try:
                cover_title = generate_cover_title(
                    srt_content=srt_content,
                    max_words=title_max_words,
                    style=title_style
                )
            except Exception as e:
                print(f"Failed to generate cover title: {e}")
                cover_title = "AUTO VIDEO"
                
            extract_representative_frame(str(video_path), base_frame_path)
            generate_cover_image(
                base_image_path=base_frame_path,
                output_path=final_cover_path,
                title=cover_title if cover_title else "AUTO VIDEO",
                template=template,
                title_position="Tengah Besar",
                bg_opacity=cover_cfg.get("bg_opacity", 0)
            )
            cover_image_path = Path(final_cover_path)
    except Exception as e:
        print(f"Error generating cover: {e}")

    try:
        output = render_final(
            video_path=video_path,
            audio_path=audio_path,
            output_width=req.output_width,
            output_height=req.output_height,
            cover_image_path=cover_image_path,
        )
        return RenderResponse(
            output_path=str(output),
            output_url=f"/api/video/download/{output.name}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp cover images if any
        if cover_image_path and cover_image_path.exists():
            try:
                cover_image_path.unlink()
            except:
                pass
        try:
            if 'base_frame_path' in locals() and Path(base_frame_path).exists():
                Path(base_frame_path).unlink()
        except:
            pass


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


# ---- Pipeline State (save/resume) ----

from app.database import set_pipeline_state, get_pipeline_state, clear_pipeline_state, list_file_records

@router.get("/pipeline/state")
async def load_pipeline():
    """Load saved pipeline state (for resume after refresh)."""
    state = get_pipeline_state()
    state["files"] = list_file_records()
    return state


@router.post("/pipeline/state")
async def save_pipeline(state: dict):
    """Save pipeline state (called after each pipeline step)."""
    for key, value in state.items():
        if key != "files":
            set_pipeline_state(key, value)
    return {"status": "saved"}


@router.delete("/pipeline/state")
async def reset_pipeline():
    """Clear all pipeline state."""
    clear_pipeline_state()
    clear_file_records()
    return {"status": "cleared"}


@router.delete("/files/all")
async def clear_all_footage():
    clear_file_records()
    from app.config import PROXY_DIR
    count = 0
    if UPLOADS_DIR.exists():
        for f in UPLOADS_DIR.glob("*"):
            if f.is_file():
                f.unlink()
                count += 1
    if PROXY_DIR.exists():
        for f in PROXY_DIR.glob("*"):
            if f.is_file():
                f.unlink()
                count += 1
    return {"status": "cleared", "count": count}
