"""
mixFlow Studio — Script Generator Router
POST /api/script/generate  — Generate video script via AI
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.script_service import generate_script

router = APIRouter()


class ScriptGenerateRequest(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=200)
    provider: str = Field(..., description="deepseek | gemini | openai")
    api_key: str = Field(..., description="API key untuk provider terpilih")
    duration: str = Field(default="60 detik (~220 kata)")
    style: str = Field(default="💬 Casual & Menarik")
    audience: str = Field(default="🌍 Umum")
    product_info: Optional[dict] = Field(default=None, description="Hasil scraping opsional")


class ScriptGenerateResponse(BaseModel):
    script: str
    caption: str
    provider: str


@router.post("/generate", response_model=ScriptGenerateResponse)
async def generate_video_script(req: ScriptGenerateRequest):
    """
    Generate video voice-over script using AI.
    Supports DeepSeek, Google Gemini, and OpenAI.
    """
    try:
        result = await generate_script(
            product_name=req.product_name,
            provider=req.provider,
            api_key=req.api_key,
            duration=req.duration,
            style=req.style,
            audience=req.audience,
            product_info=req.product_info,
        )
        return ScriptGenerateResponse(
            script=result.get("script", ""),
            caption=result.get("caption", ""),
            provider=result.get("provider", req.provider),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
