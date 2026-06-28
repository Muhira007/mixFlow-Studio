from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_pipeline_state, set_pipeline_state

router = APIRouter()

DEFAULT_COVER_SETTINGS = {
    "template": "tpl_new_1",
    "bg_opacity": 0,
    "title_style": "Storytelling (Bercerita)",
    "title_max_words": 12,
}

class CoverSettingsResponse(BaseModel):
    settings: dict

class CoverSettingsUpdateRequest(BaseModel):
    template: Optional[str] = None
    bg_opacity: Optional[int] = None
    title_style: Optional[str] = None
    title_max_words: Optional[int] = None

def get_cover_settings() -> dict:
    state = get_pipeline_state()
    stored = state.get("cover_settings", {})
    return {**DEFAULT_COVER_SETTINGS, **stored}

def save_cover_settings(settings: dict) -> dict:
    merged = {**get_cover_settings(), **settings}
    set_pipeline_state("cover_settings", merged)
    return merged

@router.get("/settings", response_model=CoverSettingsResponse)
async def read_cover_settings():
    """Read cover configuration."""
    return CoverSettingsResponse(settings=get_cover_settings())

@router.post("/settings", response_model=CoverSettingsResponse)
async def update_cover_settings(req: CoverSettingsUpdateRequest):
    """Update cover configuration."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada field yang dikirim")
    settings = save_cover_settings(updates)
    return CoverSettingsResponse(settings=settings)
