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
    stability: float = 0.55,
    similarity_boost: float = 0.45,
) -> tuple[Path, float]:
    """
    Convert text to speech via Eleven Labs API.

    Voice settings:
    - stability (0.0-1.0): konsistensi suara. Lebih tinggi = lebih stabil/monoton.
    - similarity_boost (0.0-1.0): seberapa mirip ke sample asli.
      RENDAH (0.3-0.5)  → lebih banyak campuran model multilingual → aksen berkurang,
                           bagus untuk cloned voice dengan logat kental.
      TINGGI (0.7-0.9)  → sangat mirip sample asli → aksen kuat.

    Default 0.55/0.45 dioptimalkan untuk cloned voice Indonesia.

    Returns:
        (audio_file_path, duration_seconds)
    """
    if not api_key:
        raise ValueError("API Key ElevenLabs kosong. Isi di halaman Settings.")

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
                "model_id": "eleven_v3",
                "voice_settings": {
                    "stability": stability,
                    "similarity_boost": similarity_boost,
                },
            }

            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.ConnectError:
                raise RuntimeError("Gagal konek ke ElevenLabs. Cek koneksi internet.")
            except httpx.TimeoutException:
                raise RuntimeError("ElevenLabs timeout. Naskah terlalu panjang atau server sibuk.")

            if response.status_code == 401:
                detail = ""
                try:
                    err = response.json()
                    detail = err.get("detail", {}).get("message", "") or err.get("detail", "")
                except Exception:
                    pass
                if detail:
                    raise ValueError(f"Ditolak ElevenLabs: {detail}")
                raise ValueError("API Key ElevenLabs salah. Cek di halaman Settings.")
            if response.status_code == 429:
                raise ValueError("Kuota ElevenLabs habis. Upgrade plan atau tunggu reset bulanan.")
            if response.status_code == 400:
                detail = ""
                try:
                    err = response.json()
                    detail = err.get("detail", {}).get("message", "")
                except Exception:
                    pass
                raise ValueError(f"Request ditolak ElevenLabs. {detail}".strip())
            if response.status_code != 200:
                raise RuntimeError(
                    f"ElevenLabs error HTTP {response.status_code}. Coba lagi nanti."
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


# ============================================
# VOICE CLONING (Instant Voice Clone)
# ============================================

async def clone_voice_elevenlabs(
    api_key: str,
    name: str,
    files: list[bytes],
    filenames: list[str],
    description: str = "",
    labels: str = "",
    remove_background_noise: bool = False,
) -> dict:
    """
    Clone a voice via ElevenLabs Instant Voice Clone (IVC) API.

    POST /v1/voices/add — multipart/form-data with audio samples.

    Labels default ke {"language":"id"} supaya ElevenLabs tahu ini suara bahasa Indonesia.
    """
    if not api_key:
        raise ValueError("ElevenLabs API Key diperlukan untuk voice cloning")

    if not files:
        raise ValueError("Minimal 1 file audio sample diperlukan")

    if len(files) > 25:
        raise ValueError("Maksimal 25 file audio sample")

    url = f"{ELEVENLABS_BASE_URL}/voices/add"

    # Build multipart form data
    form_data = []
    form_data.append(("name", (None, name)))

    if description:
        form_data.append(("description", (None, description)))

    # Labels: merge user labels with default language=id
    import json as _json
    merged_labels = {"language": "id"}
    if labels:
        try:
            user_labels = _json.loads(labels) if isinstance(labels, str) else labels
            if isinstance(user_labels, dict):
                merged_labels.update(user_labels)
        except (_json.JSONDecodeError, TypeError):
            pass
    form_data.append(("labels", (None, _json.dumps(merged_labels, ensure_ascii=False))))

    if remove_background_noise:
        form_data.append(("remove_background_noise", (None, "true")))

    for i, (file_bytes, filename) in enumerate(zip(files, filenames)):
        content_type = "audio/mpeg" if filename.endswith(".mp3") else \
                       "audio/wav" if filename.endswith(".wav") else \
                       "audio/ogg" if filename.endswith(".ogg") else \
                       "audio/mp4" if filename.endswith(".m4a") else \
                       "application/octet-stream"
        form_data.append(("files", (filename, file_bytes, content_type)))

    headers = {"xi-api-key": api_key}

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, files=form_data, headers=headers)
        except httpx.ConnectError:
            raise RuntimeError("Gagal konek ke ElevenLabs. Cek koneksi internet.")
        except httpx.TimeoutException:
            raise RuntimeError("ElevenLabs timeout saat cloning. Coba kurangi sample atau kecilkan file.")

        if response.status_code == 401:
            detail = ""
            try:
                err = response.json()
                detail = err.get("detail", {}).get("message", "") or err.get("detail", "")
            except Exception:
                detail = response.text[:200]
            if "subscription" in str(detail).lower() or "tier" in str(detail).lower():
                raise ValueError("Fitur Clone Suara tidak didukung di plan Free. Silakan upgrade ke Starter/Creator di ElevenLabs.")
            if detail:
                raise ValueError(f"Ditolak ElevenLabs: {detail}")
            raise ValueError("API Key ElevenLabs salah. Cek di halaman Settings.")
        if response.status_code == 429:
            raise ValueError("Kuota ElevenLabs habis. Upgrade plan atau tunggu reset bulanan.")
        if response.status_code == 422:
            detail = ""
            try:
                detail = response.json().get("detail", "")
            except Exception:
                detail = response.text[:200]
            raise ValueError(f"ElevenLabs menolak sample: {detail}")
        if response.status_code != 200:
            raise RuntimeError(
                f"ElevenLabs error HTTP {response.status_code}: {response.text[:200]}"
            )

        result = response.json()
        return {
            "voice_id": result.get("voice_id", ""),
            "requires_verification": result.get("requires_verification", False),
        }
