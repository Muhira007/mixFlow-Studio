"""
mixFlow — TTS Router
POST /api/tts/generate     — Generate TTS from text
POST /api/tts/duration     — Get audio file duration
GET  /api/tts/audio/{file} — Serve generated audio file
"""

import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.services.tts_service import text_to_speech, get_audio_duration
from app.config import OUTPUTS_DIR

router = APIRouter()


class TTSGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=15000, description="Naskah untuk TTS")
    api_key: str = Field(..., description="Eleven Labs API Key")
    voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", description="Eleven Labs Voice ID")


class TTSGenerateResponse(BaseModel):
    audio_url: str
    filename: str
    duration: float
    chunks: int


class AudioDurationRequest(BaseModel):
    filepath: str = Field(..., description="Path ke file audio di server")


class AudioDurationResponse(BaseModel):
    filepath: str
    duration: float


@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(req: TTSGenerateRequest):
    """Generate Text-to-Speech audio from text using Eleven Labs API."""
    try:
        audio_path, duration = await text_to_speech(
            text=req.text, api_key=req.api_key, voice_id=req.voice_id,
        )
        from app.services.tts_service import chunk_text
        chunks = len(chunk_text(req.text))
        filename = audio_path.name
        return TTSGenerateResponse(
            audio_url=f"/api/tts/audio/{filename}",
            filename=filename,
            duration=round(duration, 2),
            chunks=chunks,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """Upload an external audio file to outputs/."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File tidak valid")

    ext = ".mp3"
    if file.filename.endswith(".wav"):
        ext = ".wav"
    elif file.filename.endswith(".ogg"):
        ext = ".ogg"

    safe_name = f"upload_{uuid.uuid4().hex[:8]}{ext}"
    dest = OUTPUTS_DIR / safe_name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": safe_name, "audio_url": f"/api/tts/audio/{safe_name}"}


@router.get("/list")
async def list_audio_files():
    """List 5 most recent generated TTS audio files."""
    files = []
    if OUTPUTS_DIR.exists():
        for f in sorted(OUTPUTS_DIR.glob("*.mp3"), key=lambda x: x.stat().st_mtime, reverse=True)[:5]:
            stat = f.stat()
            files.append({
                "filename": f.name,
                "size": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created": stat.st_mtime,
            })
    return {"files": files}


@router.delete("/all")
async def delete_all_audio():
    """Delete all generated TTS audio files."""
    deleted = 0
    if OUTPUTS_DIR.exists():
        for f in OUTPUTS_DIR.glob("*.mp3"):
            f.unlink()
            deleted += 1
    return {"status": "deleted", "count": deleted}


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated TTS audio file."""
    filepath = OUTPUTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio tidak ditemukan")
    return FileResponse(filepath, media_type="audio/mpeg")


@router.post("/duration", response_model=AudioDurationResponse)
async def get_duration(req: AudioDurationRequest):
    """Get audio file duration via FFprobe."""
    filepath = Path(req.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"File tidak ditemukan: {req.filepath}")
    try:
        duration = get_audio_duration(filepath)
        return AudioDurationResponse(filepath=str(filepath), duration=round(duration, 2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
