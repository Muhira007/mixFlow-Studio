"""
mixFlow — SQLite Global Database
Persistent storage for ALL app data:
  api_keys, settings, voices, script_history, output_history
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "mixflow.db"


def get_db() -> sqlite3.Connection:
    """Get a database connection (auto-creates directory)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize all database tables."""
    conn = get_db()
    conn.executescript("""
        -- API Keys
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        );

        -- App Settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- TTS Voices
        CREATE TABLE IF NOT EXISTS voices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            voice_id TEXT NOT NULL UNIQUE,
            language TEXT NOT NULL DEFAULT 'Indonesia',
            gender TEXT NOT NULL DEFAULT 'Neutral',
            label TEXT NOT NULL DEFAULT 'Narasi',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Script History
        CREATE TABLE IF NOT EXISTS script_history (
            id TEXT PRIMARY KEY,
            script TEXT NOT NULL,
            caption TEXT NOT NULL DEFAULT '',
            product_name TEXT NOT NULL DEFAULT '',
            style TEXT NOT NULL DEFAULT '',
            duration TEXT NOT NULL DEFAULT '',
            audience TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );

        -- Output Video History
        CREATE TABLE IF NOT EXISTS output_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            duration TEXT NOT NULL DEFAULT '',
            size TEXT NOT NULL DEFAULT '',
            caption TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        -- File Registry (uploaded footage tracking)
        CREATE TABLE IF NOT EXISTS file_registry (
            file_id TEXT PRIMARY KEY,
            original_name TEXT NOT NULL DEFAULT '',
            original_path TEXT NOT NULL DEFAULT '',
            working_path TEXT NOT NULL DEFAULT '',
            was_proxied INTEGER DEFAULT 0,
            original_resolution TEXT DEFAULT ''
        );

        -- Pipeline State (save/resume workflow)
        CREATE TABLE IF NOT EXISTS pipeline_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Caption Settings (auto-caption config)
        CREATE TABLE IF NOT EXISTS caption_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            settings_json TEXT NOT NULL DEFAULT '{}'
        );
    """)
    conn.commit()
    conn.close()
    print(f"📦 Global DB ready: {DB_PATH}")


# ============================================
# API KEYS
# ============================================

def get_api_keys() -> dict:
    conn = get_db()
    rows = conn.execute("SELECT provider, value FROM api_keys").fetchall()
    conn.close()
    keys = {"elevenlabs": "", "deepseek": "", "gemini": "", "openai": ""}
    for r in rows:
        if r["provider"] in keys:
            keys[r["provider"]] = r["value"]
    return keys


def set_api_key(provider: str, value: str):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO api_keys (provider, value) VALUES (?, ?)",
        (provider, value),
    )
    conn.commit()
    conn.close()


# ============================================
# SETTINGS
# ============================================

def get_settings() -> dict:
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


def set_setting(key: str, value: str):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()
    conn.close()


# ============================================
# VOICES
# ============================================

def list_voices() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM voices ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_voice(name: str, voice_id: str, language: str, gender: str, label: str) -> dict:
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO voices (name, voice_id, language, gender, label) VALUES (?, ?, ?, ?, ?)",
            (name, voice_id, language, gender, label),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM voices WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(row)
    except sqlite3.IntegrityError:
        conn.close()
        raise ValueError(f"Voice ID '{voice_id}' sudah ada")
    finally:
        conn.close()


def delete_voice(voice_id: str) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM voices WHERE voice_id = ?", (voice_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


# ============================================
# SCRIPT HISTORY
# ============================================

def list_scripts(limit: int = 20) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM script_history ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_script(script: dict) -> dict:
    conn = get_db()
    conn.execute(
        """INSERT OR REPLACE INTO script_history
           (id, script, caption, product_name, style, duration, audience, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            script["id"], script["script"], script["caption"],
            script["product_name"], script["style"], script["duration"],
            script["audience"], script["created_at"],
        ),
    )
    conn.commit()
    conn.close()
    return script


def delete_script(script_id: str) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM script_history WHERE id = ?", (script_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


# ============================================
# OUTPUT HISTORY
# ============================================

def list_outputs(limit: int = 50) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM output_history ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_output(video: dict) -> dict:
    conn = get_db()
    
    size_str = video.get("size", "")
    if size_str in ("", "—"):
        from app.config import OUTPUTS_DIR
        filepath = OUTPUTS_DIR / video["name"]
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024 * 1024)
            size_str = f"{size_mb:.1f} MB"

    cur = conn.execute(
        "INSERT INTO output_history (name, duration, size, caption, created_at) VALUES (?, ?, ?, ?, ?)",
        (video["name"], video.get("duration", ""), size_str, video.get("caption", ""), video["created_at"]),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM output_history WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def delete_output(output_id: int) -> bool:
    conn = get_db()
    row = conn.execute("SELECT name FROM output_history WHERE id = ?", (output_id,)).fetchone()
    if row:
        import os
        from app.config import OUTPUTS_DIR
        filepath = OUTPUTS_DIR / row["name"]
        if filepath.exists():
            try:
                filepath.unlink()
            except Exception:
                pass
    cur = conn.execute("DELETE FROM output_history WHERE id = ?", (output_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def clear_output_history():
    conn = get_db()
    conn.execute("DELETE FROM output_history")
    conn.commit()
    conn.close()


# ============================================
# FILE REGISTRY — uploaded footage tracking
# ============================================

def add_file_record(fid: str, name: str, orig: str, work: str, proxied: bool, res: str):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO file_registry (file_id, original_name, original_path, working_path, was_proxied, original_resolution) VALUES (?,?,?,?,?,?)",
        (fid, name, orig, work, 1 if proxied else 0, res),
    )
    conn.commit()
    conn.close()


def list_file_records() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM file_registry ORDER BY file_id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def clear_file_records():
    conn = get_db()
    conn.execute("DELETE FROM file_registry")
    conn.commit()
    conn.close()


# ============================================
# PIPELINE STATE — save/resume workflow
# ============================================

def get_pipeline_state() -> dict:
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM pipeline_state").fetchall()
    conn.close()
    state = {}
    for r in rows:
        try:
            state[r["key"]] = json.loads(r["value"])
        except (json.JSONDecodeError, TypeError):
            state[r["key"]] = r["value"]
    return state


def set_pipeline_state(key: str, value):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO pipeline_state (key, value) VALUES (?, ?)",
        (key, json.dumps(value) if not isinstance(value, str) else value),
    )
    conn.commit()
    conn.close()


def clear_pipeline_state():
    conn = get_db()
    conn.execute("DELETE FROM pipeline_state")
    conn.commit()
    conn.close()


# ============================================
# FULL SYNC — dump entire state
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
