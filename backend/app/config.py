"""
mixFlow Studio Backend — Configuration
Loads from .env file, with sensible defaults for localhost development.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# ---- Server ----
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ---- Upload & Output ----
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
PROXY_DIR = UPLOADS_DIR / "proxy"

# ---- Video Processing ----
DEFAULT_OUTPUT_WIDTH = 1080
DEFAULT_OUTPUT_HEIGHT = 1920
PROXY_CRF = 23
PROXY_PRESET = "veryfast"
RENDER_CRF_1080P = 20
RENDER_PRESET_1080P = "medium"
RENDER_CRF_720P = 22
RENDER_PRESET_720P = "fast"
AUDIO_BITRATE = "128k"
MIN_KEEP_DURATION = 3.0  # seconds
MAX_AUDIO_DURATION = 120  # seconds

# ---- TTS (Eleven Labs) ----
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
ELEVENLABS_MAX_CHUNK = 5000  # characters per TTS request

# ---- AI Providers ----
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"

GEMINI_MODEL = "gemini-3.5-flash"
OPENAI_MODEL = "gpt-5.4-mini"

# ---- Ensure directories exist ----
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
PROXY_DIR.mkdir(parents=True, exist_ok=True)
