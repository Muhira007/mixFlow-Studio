"""
mixFlow Backend — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, UPLOADS_DIR, OUTPUTS_DIR, PROXY_DIR
from app.database import init_db
from app.routers import tts, video, script, scraper, voices, sync, db_browser


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    PROXY_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    print(f"📁 Uploads: {UPLOADS_DIR}")
    print(f"📁 Outputs: {OUTPUTS_DIR}")
    print(f"📁 Proxies: {PROXY_DIR}")
    yield


app = FastAPI(
    title="mixFlow API",
    description="Backend untuk AI Video Editor — TTS, Video Processing, Script Generator",
    version="1.0.0-beta",
    lifespan=lifespan,
)

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Routers ----
app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])
app.include_router(video.router, prefix="/api/video", tags=["Video"])
app.include_router(script.router, prefix="/api/script", tags=["Script"])
app.include_router(scraper.router, prefix="/api/scrape", tags=["Scraper"])
app.include_router(voices.router, prefix="/api/voices", tags=["Voices"])
app.include_router(sync.router, prefix="/api/sync", tags=["Sync"])
app.include_router(db_browser.router, prefix="/api/db", tags=["DB Browser"])


# ---- Health Check ----
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0-beta",
        "service": "mixFlow Backend",
    }
