"""
mixFlow Studio — SQLite Global Database via SQLModel
Persistent storage for ALL app data:
  api_keys, settings, voices, script_history, output_history
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from sqlmodel import Field, SQLModel, Session, create_engine, select, delete

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "mixflow.db"

# SQLModel SQLite Connection Engine
sqlite_url = f"sqlite:///{DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


# ============================================
# SQLMODEL SCHEMAS (Maps to existing tables)
# ============================================

class APIKey(SQLModel, table=True):
    __tablename__ = "api_keys"
    provider: str = Field(primary_key=True)
    value: str = Field(default="")


class Setting(SQLModel, table=True):
    __tablename__ = "settings"
    key: str = Field(primary_key=True)
    value: str


class Voice(SQLModel, table=True):
    __tablename__ = "voices"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    voice_id: str = Field(unique=True, index=True)
    language: str = Field(default="Indonesia")
    gender: str = Field(default="Neutral")
    label: str = Field(default="Narasi")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))


class ScriptHistory(SQLModel, table=True):
    __tablename__ = "script_history"
    id: str = Field(primary_key=True)
    script: str
    caption: str = Field(default="")
    product_name: str = Field(default="")
    style: str = Field(default="")
    duration: str = Field(default="")
    audience: str = Field(default="")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))


class OutputHistory(SQLModel, table=True):
    __tablename__ = "output_history"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    duration: str = Field(default="")
    size: str = Field(default="")
    caption: str = Field(default="")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))


class FileRegistry(SQLModel, table=True):
    __tablename__ = "file_registry"
    file_id: str = Field(primary_key=True)
    original_name: str = Field(default="")
    original_path: str = Field(default="")
    working_path: str = Field(default="")
    was_proxied: int = Field(default=0)
    original_resolution: str = Field(default="")


class PipelineState(SQLModel, table=True):
    __tablename__ = "pipeline_state"
    key: str = Field(primary_key=True)
    value: str


class CaptionSetting(SQLModel, table=True):
    __tablename__ = "caption_settings"
    id: int = Field(default=1, primary_key=True)
    settings_json: str = Field(default="{}")


# ============================================
# LEGACY RAW SQL CONNECTION FOR OTHER MODULES
# ============================================

def get_db() -> sqlite3.Connection:
    """Get a raw sqlite3 connection (retains WAL journal mode and foreign keys)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize all database tables using SQLModel metadata (safe & preserves data)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    # create_all will only create tables that do not exist yet. Existing tables are preserved.
    SQLModel.metadata.create_all(engine)
    print(f"📦 Global DB ready via SQLModel: {DB_PATH}")


# ============================================
# API KEYS CRUD
# ============================================

def get_api_keys() -> dict:
    keys = {"elevenlabs": "", "deepseek": "", "gemini": "", "openai": ""}
    with Session(engine) as session:
        rows = session.exec(select(APIKey)).all()
        for r in rows:
            if r.provider in keys:
                keys[r.provider] = r.value
    return keys


def set_api_key(provider: str, value: str):
    with Session(engine) as session:
        db_key = session.get(APIKey, provider)
        if db_key:
            db_key.value = value
        else:
            db_key = APIKey(provider=provider, value=value)
            session.add(db_key)
        session.commit()


# ============================================
# SETTINGS CRUD
# ============================================

def get_settings() -> dict:
    with Session(engine) as session:
        rows = session.exec(select(Setting)).all()
        return {r.key: r.value for r in rows}


def set_setting(key: str, value: str):
    with Session(engine) as session:
        db_setting = session.get(Setting, key)
        if db_setting:
            db_setting.value = value
        else:
            db_setting = Setting(key=key, value=value)
            session.add(db_setting)
        session.commit()


# ============================================
# VOICES CRUD
# ============================================

def list_voices() -> list[dict]:
    with Session(engine) as session:
        rows = session.exec(select(Voice).order_by(Voice.created_at.desc())).all()
        return [r.model_dump() for r in rows]


def add_voice(name: str, voice_id: str, language: str, gender: str, label: str) -> dict:
    with Session(engine) as session:
        existing = session.exec(select(Voice).where(Voice.voice_id == voice_id)).first()
        if existing:
            raise ValueError(f"Voice ID '{voice_id}' sudah ada")
        
        voice = Voice(
            name=name,
            voice_id=voice_id,
            language=language,
            gender=gender,
            label=label
        )
        session.add(voice)
        session.commit()
        session.refresh(voice)
        return voice.model_dump()


def delete_voice(voice_id: str) -> bool:
    with Session(engine) as session:
        voice = session.exec(select(Voice).where(Voice.voice_id == voice_id)).first()
        if voice:
            session.delete(voice)
            session.commit()
            return True
        return False


# ============================================
# SCRIPT HISTORY CRUD
# ============================================

def list_scripts(limit: int = 20) -> list[dict]:
    with Session(engine) as session:
        rows = session.exec(select(ScriptHistory).order_by(ScriptHistory.created_at.desc()).limit(limit)).all()
        return [r.model_dump() for r in rows]


def add_script(script: dict) -> dict:
    with Session(engine) as session:
        db_script = session.get(ScriptHistory, script["id"])
        if db_script:
            db_script.script = script["script"]
            db_script.caption = script.get("caption", "")
            db_script.product_name = script.get("product_name", "")
            db_script.style = script.get("style", "")
            db_script.duration = script.get("duration", "")
            db_script.audience = script.get("audience", "")
            db_script.created_at = script["created_at"]
        else:
            db_script = ScriptHistory(
                id=script["id"],
                script=script["script"],
                caption=script.get("caption", ""),
                product_name=script.get("product_name", ""),
                style=script.get("style", ""),
                duration=script.get("duration", ""),
                audience=script.get("audience", ""),
                created_at=script["created_at"]
            )
            session.add(db_script)
        session.commit()
        return script


def delete_script(script_id: str) -> bool:
    with Session(engine) as session:
        db_script = session.get(ScriptHistory, script_id)
        if db_script:
            session.delete(db_script)
            session.commit()
            return True
        return False


# ============================================
# OUTPUT HISTORY CRUD
# ============================================

def list_outputs(limit: int = 50) -> list[dict]:
    with Session(engine) as session:
        rows = session.exec(select(OutputHistory).order_by(OutputHistory.created_at.desc()).limit(limit)).all()
        return [r.model_dump() for r in rows]


def add_output(video: dict) -> dict:
    size_str = video.get("size", "")
    if size_str in ("", "—"):
        from app.config import OUTPUTS_DIR
        filepath = OUTPUTS_DIR / video["name"]
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024 * 1024)
            size_str = f"{size_mb:.1f} MB"

    with Session(engine) as session:
        db_output = OutputHistory(
            name=video["name"],
            duration=video.get("duration", ""),
            size=size_str,
            caption=video.get("caption", ""),
            created_at=video["created_at"]
        )
        session.add(db_output)
        session.commit()
        session.refresh(db_output)
        return db_output.model_dump()


def delete_output(output_id: int) -> bool:
    with Session(engine) as session:
        db_output = session.get(OutputHistory, output_id)
        if db_output:
            import os
            from app.config import OUTPUTS_DIR
            filepath = OUTPUTS_DIR / db_output.name
            if filepath.exists():
                try:
                    filepath.unlink()
                except Exception:
                    pass
            session.delete(db_output)
            session.commit()
            return True
        return False


def clear_output_history():
    with Session(engine) as session:
        session.exec(delete(OutputHistory))
        session.commit()


# ============================================
# FILE REGISTRY CRUD
# ============================================

def add_file_record(fid: str, name: str, orig: str, work: str, proxied: bool, res: str):
    with Session(engine) as session:
        record = session.get(FileRegistry, fid)
        if record:
            record.original_name = name
            record.original_path = orig
            record.working_path = work
            record.was_proxied = 1 if proxied else 0
            record.original_resolution = res
        else:
            record = FileRegistry(
                file_id=fid,
                original_name=name,
                original_path=orig,
                working_path=work,
                was_proxied=1 if proxied else 0,
                original_resolution=res
            )
            session.add(record)
        session.commit()


def get_file_record(fid: str) -> dict | None:
    with Session(engine) as session:
        record = session.get(FileRegistry, fid)
        return record.model_dump() if record else None


def list_file_records() -> list[dict]:
    with Session(engine) as session:
        rows = session.exec(select(FileRegistry).order_by(FileRegistry.file_id)).all()
        return [r.model_dump() for r in rows]


def clear_file_records():
    with Session(engine) as session:
        session.exec(delete(FileRegistry))
        session.commit()


# ============================================
# PIPELINE STATE CRUD
# ============================================

def get_pipeline_state() -> dict:
    with Session(engine) as session:
        rows = session.exec(select(PipelineState)).all()
        state = {}
        for r in rows:
            try:
                state[r.key] = json.loads(r.value)
            except (json.JSONDecodeError, TypeError):
                state[r.key] = r.value
        return state


def set_pipeline_state(key: str, value):
    val_str = json.dumps(value) if not isinstance(value, str) else value
    with Session(engine) as session:
        db_state = session.get(PipelineState, key)
        if db_state:
            db_state.value = val_str
        else:
            db_state = PipelineState(key=key, value=val_str)
            session.add(db_state)
        session.commit()


def clear_pipeline_state():
    with Session(engine) as session:
        session.exec(delete(PipelineState))
        session.commit()


# ============================================
# FULL DUMP & SYNC UTILS
# ============================================

def _voice_has_sample(voice_id: str) -> bool:
    """Check if this voice has an uploaded audio sample on disk."""
    samples_dir = DB_DIR / "samples"
    return (samples_dir / f"{voice_id}.mp3").exists() or \
           any(samples_dir.glob(f"{voice_id}.*"))


def dump_all() -> dict:
    """Return entire app state as a JSON-compatible dict."""
    voices = list_voices()
    for v in voices:
        v["has_sample"] = _voice_has_sample(v["voice_id"])
    return {
        "apiKeys": get_api_keys(),
        "settings": get_settings(),
        "ttsVoices": voices,
        "scriptHistory": list_scripts(),
        "outputHistory": list_outputs(),
        "fileRegistry": list_file_records(),
        "pipelineState": get_pipeline_state(),
    }
