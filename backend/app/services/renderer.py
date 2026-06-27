"""
mixFlow — Renderer Service
Handles: final video render (video + audio overlay → output .mp4).
"""

import subprocess
import uuid
from pathlib import Path

from app.config import (
    OUTPUTS_DIR,
    RENDER_CRF_1080P,
    RENDER_PRESET_1080P,
    RENDER_CRF_720P,
    RENDER_PRESET_720P,
    AUDIO_BITRATE,
)


def render_final(
    video_path: Path,
    audio_path: Path,
    output_width: int = 1080,
    output_height: int = 1920,
) -> Path:
    """
    Render final video: overlay audio onto video, encode with appropriate settings.

    Args:
        video_path: Path to concatenated video (already at target resolution)
        audio_path: Path to audio file (.mp3 / .wav)
        output_width: Target width (1080 or 720)
        output_height: Target height (1920 or 1280)
    """
    output_path = OUTPUTS_DIR / f"mixflow_{uuid.uuid4().hex[:8]}.mp4"

    # Select encoding params based on resolution
    if output_width <= 720:
        crf = RENDER_CRF_720P
        preset = RENDER_PRESET_720P
    else:
        crf = RENDER_CRF_1080P
        preset = RENDER_PRESET_1080P

    # Get audio duration for trimming
    audio_dur = _get_duration(audio_path)
    video_dur = _get_duration(video_path)

    # Build FFmpeg command
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-c:a", "aac",
        "-b:a", AUDIO_BITRATE,
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",  # web-optimized
    ]

    # Handle duration mismatch
    if audio_dur > 0 and video_dur > 0:
        shortest = min(audio_dur, video_dur)
        cmd.extend(["-t", str(shortest)])

    cmd.append(str(output_path))

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        stderr = result.stderr[-500:] if len(result.stderr) > 500 else result.stderr
        raise RuntimeError(f"Render failed: {stderr}")

    return output_path


def _get_duration(filepath: Path) -> float:
    """Get media duration via FFprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(filepath),
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return float(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired):
        return 0.0
