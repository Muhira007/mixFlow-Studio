"""
mixFlow Studio Backend — Configuration
Loads from .env file, with sensible defaults for localhost development.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ---- Server ----
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # ---- Video Processing ----
    default_output_width: int = 1080
    default_output_height: int = 1920
    proxy_crf: int = 23
    proxy_preset: str = "veryfast"
    render_crf_1080p: int = 20
    render_preset_1080p: str = "medium"
    render_crf_720p: int = 22
    render_preset_720p: str = "fast"
    audio_bitrate: str = "128k"
    min_keep_duration: float = 3.0
    max_audio_duration: int = 120

    # ---- TTS (Eleven Labs) ----
    elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
    elevenlabs_max_chunk: int = 5000

    # ---- AI Providers ----
    deepseek_base_url: str = "https://api.deepseek.com/v1/chat/completions"
    deepseek_model: str = "deepseek-v4-flash"
    gemini_model: str = "gemini-3.5-flash"
    openai_model: str = "gpt-5.4-mini"

settings = Settings()

# ---- Server (Exposed as constants for backward-compatibility) ----
HOST = settings.host
PORT = settings.port
CORS_ORIGINS = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

# ---- Upload & Output ----
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
PROXY_DIR = UPLOADS_DIR / "proxy"

# ---- Video Processing ----
DEFAULT_OUTPUT_WIDTH = settings.default_output_width
DEFAULT_OUTPUT_HEIGHT = settings.default_output_height
PROXY_CRF = settings.proxy_crf
PROXY_PRESET = settings.proxy_preset
RENDER_CRF_1080P = settings.render_crf_1080p
RENDER_PRESET_1080P = settings.render_preset_1080p
RENDER_CRF_720P = settings.render_crf_720p
RENDER_PRESET_720P = settings.render_preset_720p
AUDIO_BITRATE = settings.audio_bitrate
MIN_KEEP_DURATION = settings.min_keep_duration
MAX_AUDIO_DURATION = settings.max_audio_duration

# ---- TTS (Eleven Labs) ----
ELEVENLABS_BASE_URL = settings.elevenlabs_base_url
ELEVENLABS_MAX_CHUNK = settings.elevenlabs_max_chunk

# ---- AI Providers ----
DEEPSEEK_BASE_URL = settings.deepseek_base_url
DEEPSEEK_MODEL = settings.deepseek_model
GEMINI_MODEL = settings.gemini_model
OPENAI_MODEL = settings.openai_model

# ---- Ensure directories exist ----
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
PROXY_DIR.mkdir(parents=True, exist_ok=True)

