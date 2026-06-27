"""
mixFlow — Voices Router (SQLite-backed)
GET    /api/voices              — List all voices
POST   /api/voices              — Add a voice
DELETE /api/voices/{id}         — Delete a voice
POST   /api/voices/{id}/sample  — Upload audio sample
GET    /api/voices/{id}/sample  — Download audio sample
"""

import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.database import list_voices, add_voice, delete_voice

router = APIRouter()

SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


class VoiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    voice_id: str = Field(..., min_length=1, max_length=200)
    language: str = Field(default="Indonesia")
    gender: str = Field(default="Neutral")
    label: str = Field(default="Narasi")


class VoiceResponse(BaseModel):
    id: int
    name: str
    voice_id: str
    language: str
    gender: str
    label: str
    created_at: str
    has_sample: bool = False


def _voice_has_sample(voice_id: str) -> bool:
    """Check if this voice has an uploaded audio sample."""
    return (SAMPLES_DIR / f"{voice_id}.mp3").exists() or \
           any(SAMPLES_DIR.glob(f"{voice_id}.*"))


def _to_response(row: dict) -> VoiceResponse:
    return VoiceResponse(
        id=row["id"],
        name=row["name"],
        voice_id=row["voice_id"],
        language=row["language"],
        gender=row["gender"],
        label=row["label"],
        created_at=row["created_at"],
        has_sample=_voice_has_sample(row["voice_id"]),
    )


@router.get("", response_model=list[VoiceResponse])
async def get_voices():
    """List all saved voices."""
    return [_to_response(r) for r in list_voices()]


@router.post("", response_model=VoiceResponse, status_code=201)
async def create_voice(voice: VoiceCreate):
    """Add a new voice to the database."""
    try:
        result = add_voice(
            name=voice.name,
            voice_id=voice.voice_id,
            language=voice.language,
            gender=voice.gender,
            label=voice.label,
        )
        return _to_response(result)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Audio Sample Upload/Download (registered BEFORE /{voice_id} routes) ──

@router.post("/{voice_id}/sample", status_code=200)
async def upload_sample(voice_id: str, file: UploadFile = File(...)):
    """Upload an audio sample for a voice."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File tidak valid")

    # Determine extension
    ext = ".mp3"
    if file.filename.endswith(".wav"):
        ext = ".wav"
    elif file.filename.endswith(".ogg"):
        ext = ".ogg"
    elif file.filename.endswith(".webm"):
        ext = ".webm"

    # Remove old sample files for this voice
    for old in SAMPLES_DIR.glob(f"{voice_id}.*"):
        old.unlink()

    # Save new file
    dest = SAMPLES_DIR / f"{voice_id}{ext}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"status": "uploaded", "voice_id": voice_id, "filename": dest.name}


@router.get("/{voice_id}/sample")
async def download_sample(voice_id: str):
    """Download/stream an audio sample."""
    for f in SAMPLES_DIR.glob(f"{voice_id}.*"):
        media_type = "audio/mpeg" if f.suffix == ".mp3" else "audio/wav" if f.suffix == ".wav" else "audio/ogg" if f.suffix == ".ogg" else "audio/webm"
        return FileResponse(f, media_type=media_type)
    raise HTTPException(status_code=404, detail="Sample tidak ditemukan")


@router.delete("/{voice_id}", status_code=200)
async def remove_voice(voice_id: str):
    """Delete a voice and its audio sample."""
    ok = delete_voice(voice_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Voice tidak ditemukan")
    # Delete sample file if exists
    for f in SAMPLES_DIR.glob(f"{voice_id}.*"):
        f.unlink()
    return {"status": "deleted", "voice_id": voice_id}
