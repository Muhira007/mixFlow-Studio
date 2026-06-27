"""
mixFlow — TTS Service (Eleven Labs)
Handles: text-to-speech generation + audio duration extraction via FFprobe.
"""

import subprocess
import uuid
from pathlib import Path

import httpx

from app.config import (
    ELEVENLABS_BASE_URL,
    ELEVENLABS_MAX_CHUNK,
    OUTPUTS_DIR,
)


def chunk_text(text: str, max_chars: int = ELEVENLABS_MAX_CHUNK) -> list[str]:
    """Split text into chunks at sentence boundaries, each ≤ max_chars."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    sentences = text.replace("!", ".").replace("?", ".").split(".")
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        candidate = (current + ". " + sentence).strip() if current else sentence
        if len(candidate) > max_chars and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = candidate

    if current:
        chunks.append(current.strip())

    return chunks or [text]


async def text_to_speech(
    text: str,
    api_key: str,
    voice_id: str = "21m00Tcm4TlvDq8ikWAM",
) -> tuple[Path, float]:
    """
    Convert text to speech via Eleven Labs API.

    Returns:
        (audio_file_path, duration_seconds)
    """
    if not api_key:
        raise ValueError("Eleven Labs API key tidak boleh kosong")

    chunks = chunk_text(text)
    audio_files = []
    total_duration = 0.0

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, chunk in enumerate(chunks):
            url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}"
            headers = {
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            }
            payload = {
                "text": chunk,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            }

            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 401:
                raise ValueError("Eleven Labs API key invalid")
            if response.status_code == 429:
                raise ValueError("Eleven Labs quota habis. Coba lagi nanti.")
            if response.status_code != 200:
                raise RuntimeError(
                    f"Eleven Labs error ({response.status_code}): {response.text[:200]}"
                )

            # Save chunk
            chunk_path = OUTPUTS_DIR / f"tts_chunk_{uuid.uuid4().hex[:8]}.mp3"
            chunk_path.write_bytes(response.content)
            audio_files.append(chunk_path)

            # Get duration via FFprobe
            dur = _get_audio_duration(chunk_path)
            total_duration += dur

    # If multiple chunks, concatenate them
    if len(audio_files) == 1:
        final_path = audio_files[0]
    else:
        final_path = OUTPUTS_DIR / f"tts_full_{uuid.uuid4().hex[:8]}.mp3"
        _concat_audio(audio_files, final_path)
        # Clean up chunks
        for f in audio_files:
            if f != final_path:
                f.unlink(missing_ok=True)

    return final_path, total_duration


def _get_audio_duration(filepath: Path) -> float:
    """Extract audio duration in seconds using FFprobe."""
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


def _concat_audio(files: list[Path], output: Path) -> None:
    """Concatenate multiple audio files using FFmpeg."""
    # Write file list
    list_path = output.with_suffix(".txt")
    list_path.write_text("\n".join(f"file '{f}'" for f in files))

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(list_path),
            "-c", "copy",
            str(output),
        ],
        capture_output=True,
        timeout=30,
    )
    list_path.unlink(missing_ok=True)


def get_audio_duration(filepath: Path) -> float:
    """Public wrapper — returns duration of any audio file via FFprobe."""
    return _get_audio_duration(filepath)
