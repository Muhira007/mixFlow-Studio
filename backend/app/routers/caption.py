"""
mixFlow — Caption Router
POST /api/caption/generate   — Transcribe TTS audio via Whisper-1 → SRT
GET  /api/caption/settings   — Read caption config
POST /api/caption/settings   — Save caption config
POST /api/caption/burn       — Burn SRT subtitle into video
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.config import OUTPUTS_DIR
from app.services.caption_service import (
    transcribe_with_openai,
    burn_subtitles_to_video,
    get_caption_settings,
    save_caption_settings,
)

router = APIRouter()


# ---- Schemas ----

class CaptionGenerateRequest(BaseModel):
    audio_filename: str = Field(..., description="Nama file audio di outputs/ (hasil TTS)")
    api_key: str = Field(..., description="OpenAI API Key untuk Whisper-1")
    capitalize: bool = Field(default=False, description="UPPERCASE semua kata subtitle")


class CaptionGenerateResponse(BaseModel):
    srt: str
    text: str
    word_count: int
    chunk_count: int
    srt_path: str  # Path ke file SRT yang disimpan


class CaptionSettingsResponse(BaseModel):
    settings: dict


class CaptionSettingsUpdateRequest(BaseModel):
    font: Optional[str] = None
    size: Optional[int] = None
    color: Optional[str] = None
    outline_color: Optional[str] = None
    outline_size: Optional[int] = None
    position: Optional[int] = None
    uppercase: Optional[bool] = None
    template: Optional[str] = None
    social_max_words: Optional[int] = None
    social_hashtags: Optional[int] = None
    social_tone: Optional[str] = None


class CaptionBurnRequest(BaseModel):
    video_path: str = Field(..., description="Path ke video yang akan di-burn subtitle")
    srt_content: str = Field(..., description="Konten SRT subtitle")
    audio_filename: Optional[str] = Field(default=None, description="Filename audio untuk mencari file .ass")
    settings: Optional[dict] = Field(default=None, description="Override caption settings")


class CaptionBurnResponse(BaseModel):
    output_path: str
    output_url: str


# ---- Endpoints ----

@router.post("/generate", response_model=CaptionGenerateResponse)
async def generate_caption(req: CaptionGenerateRequest):
    """
    Transcribe TTS audio file via OpenAI Whisper-1, generate SRT subtitle.
    SRT disimpan ke disk dan dikembalikan sebagai teks.
    """
    # Resolve audio path
    audio_path = OUTPUTS_DIR / req.audio_filename
    if not audio_path.exists():
        # Try as absolute path
        audio_path = Path(req.audio_filename)
        if not audio_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Audio file tidak ditemukan: {req.audio_filename}",
            )

    if not req.api_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key diperlukan")

    try:
        result = transcribe_with_openai(
            audio_path=str(audio_path),
            api_key=req.api_key,
            capitalize=req.capitalize,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper transcribe gagal: {str(e)}")

    # Save SRT and ASS to disk (same name as audio)
    base_name = Path(req.audio_filename).stem
    srt_path = OUTPUTS_DIR / f"{base_name}.srt"
    with srt_path.open("w", encoding="utf-8") as f:
        f.write(result["srt"])
        
    if "ass" in result and result["ass"]:
        ass_path = OUTPUTS_DIR / f"{base_name}.ass"
        with ass_path.open("w", encoding="utf-8") as f:
            f.write(result["ass"])

    return CaptionGenerateResponse(
        srt=result["srt"],
        text=result["text"],
        word_count=result["word_count"],
        chunk_count=result["chunk_count"],
        srt_path=str(srt_path),
    )


@router.get("/settings", response_model=CaptionSettingsResponse)
async def read_caption_settings():
    """Read caption configuration from database."""
    settings = get_caption_settings()
    return CaptionSettingsResponse(settings=settings)


@router.post("/settings", response_model=CaptionSettingsResponse)
async def update_caption_settings(req: CaptionSettingsUpdateRequest):
    """Update caption configuration. Only provided fields are updated."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada field yang dikirim")
    settings = save_caption_settings(updates)
    return CaptionSettingsResponse(settings=settings)


@router.post("/burn", response_model=CaptionBurnResponse)
async def burn_caption(req: CaptionBurnRequest):
    """
    Burn SRT subtitle into video using FFmpeg.
    Returns path to the new video with burned subtitles.
    """
    video_path = Path(req.video_path)

    # Resolve relative paths from OUTPUTS_DIR
    if not video_path.is_absolute() or not video_path.exists():
        resolved = OUTPUTS_DIR / video_path.name
        if resolved.exists():
            video_path = resolved

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Video tidak ditemukan: {req.video_path}",
        )

    output_video = str(OUTPUTS_DIR / f"captioned_{uuid.uuid4().hex[:8]}.mp4")

    # Check for ASS file if audio_filename is provided
    ass_path = None
    if req.audio_filename:
        base_name = Path(req.audio_filename).stem
        potential_ass = OUTPUTS_DIR / f"{base_name}.ass"
        if potential_ass.exists():
            ass_path = str(potential_ass)

    try:
        result_path = burn_subtitles_to_video(
            input_video=str(video_path),
            srt_content=req.srt_content,
            ass_path=ass_path,
            output_video=output_video,
            settings=req.settings,
        )
        output = Path(result_path)
        return CaptionBurnResponse(
            output_path=str(output),
            output_url=f"/api/video/download/{output.name}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Burn subtitle gagal: {str(e)}")
