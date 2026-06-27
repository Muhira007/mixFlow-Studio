"""
mixFlow — TTS Router
POST /api/tts/generate  — Generate TTS from text
POST /api/tts/duration  — Get audio file duration (for uploaded audio)
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.tts_service import text_to_speech, get_audio_duration

router = APIRouter()


class TTSGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=15000, description="Naskah untuk TTS")
    api_key: str = Field(..., description="Eleven Labs API Key")
    voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", description="Eleven Labs Voice ID")


class TTSGenerateResponse(BaseModel):
    audio_path: str
    duration: float
    chunks: int


class AudioDurationRequest(BaseModel):
    filepath: str = Field(..., description="Path ke file audio di server")


class AudioDurationResponse(BaseModel):
    filepath: str
    duration: float


@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(req: TTSGenerateRequest):
    """
    Generate Text-to-Speech audio from text using Eleven Labs API.
    Handles chunking for long texts (>5000 characters).
    """
    try:
        audio_path, duration = await text_to_speech(
            text=req.text,
            api_key=req.api_key,
            voice_id=req.voice_id,
        )
        # Count chunks
        from app.services.tts_service import chunk_text
        chunks = len(chunk_text(req.text))

        return TTSGenerateResponse(
            audio_path=str(audio_path),
            duration=round(duration, 2),
            chunks=chunks,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/duration", response_model=AudioDurationResponse)
async def get_duration(req: AudioDurationRequest):
    """
    Get audio file duration via FFprobe.
    Used for uploaded audio files (skip TTS flow).
    """
    filepath = Path(req.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"File tidak ditemukan: {req.filepath}")

    try:
        duration = get_audio_duration(filepath)
        return AudioDurationResponse(
            filepath=str(filepath),
            duration=round(duration, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
