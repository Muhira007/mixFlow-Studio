"""
mixFlow — Sync Router (Global State)
GET  /api/sync              — Dump entire state
POST /api/sync/api-key      — Save one API key
POST /api/sync/setting      — Save one setting
POST /api/sync/script       — Add script to history
DELETE /api/sync/script/{id}— Remove script
POST /api/sync/output       — Add output to history
DELETE /api/sync/output/{id}— Remove output
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.database import (
    dump_all, set_api_key, set_setting,
    add_script, delete_script,
    add_output, delete_output,
)

router = APIRouter()


# ── Full dump ──

@router.get("")
async def get_all_state():
    """Return entire app state from SQLite."""
    return dump_all()


# ── API Key ──

class ApiKeyPayload(BaseModel):
    provider: str = Field(..., pattern="^(elevenlabs|deepseek|gemini|openai)$")
    value: str


@router.post("/api-key")
async def save_api_key(payload: ApiKeyPayload):
    set_api_key(payload.provider, payload.value)
    return {"status": "saved", "provider": payload.provider}


# ── Setting ──

class SettingPayload(BaseModel):
    key: str
    value: str


@router.post("/setting")
async def save_setting(payload: SettingPayload):
    set_setting(payload.key, payload.value)
    return {"status": "saved", "key": payload.key}


# ── Script History ──

class ScriptPayload(BaseModel):
    id: str
    script: str
    caption: str = ""
    product_name: str = ""
    style: str = ""
    duration: str = ""
    audience: str = ""
    created_at: str


@router.post("/script")
async def save_script(payload: ScriptPayload):
    add_script(payload.model_dump())
    return {"status": "saved", "id": payload.id}


@router.delete("/script/{script_id}")
async def remove_script(script_id: str):
    ok = delete_script(script_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Script tidak ditemukan")
    return {"status": "deleted", "id": script_id}


# ── Output History ──

class OutputPayload(BaseModel):
    name: str
    duration: str = ""
    size: str = ""
    created_at: str


@router.post("/output")
async def save_output(payload: OutputPayload):
    result = add_output(payload.model_dump())
    return result


@router.delete("/output/{output_id}")
async def remove_output(output_id: int):
    ok = delete_output(output_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Output tidak ditemukan")
    return {"status": "deleted", "id": output_id}
