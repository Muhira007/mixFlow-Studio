"""
mixFlow Studio — Auto Caption Service
Handles: Whisper-1 STT transcription → SRT generation → burn subtitle to video.

Style: Plain (teks putih, 5 kata per chunk, timing sesuai word timestamps).
"""

import math
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from openai import OpenAI

from app.config import OUTPUTS_DIR
from app.database import get_db


# ============================================
# TIMESTAMP FORMATTERS
# ============================================

def format_srt_timestamp(seconds: float) -> str:
    """Convert float seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    hours = math.floor(seconds / 3600)
    seconds %= 3600
    minutes = math.floor(seconds / 60)
    seconds %= 60
    milliseconds = round((seconds - math.floor(seconds)) * 1000)
    if milliseconds == 1000:
        seconds += 1
        milliseconds = 0
    seconds = math.floor(seconds)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


# ============================================
# WHISPER-1 TRANSCRIPTION → SRT
# ============================================

def transcribe_with_openai(
    audio_path: str,
    api_key: str,
    capitalize: bool = False,
    max_words_per_chunk: int = 5,
) -> dict:
    """
    Transcribe audio using OpenAI Whisper-1 API with word-level timestamps.
    Groups words into chunks of max_words_per_chunk (default 5), splitting
    earlier on pauses >1 second.

    Returns:
        {
            "srt": str,           # Full SRT subtitle content
            "text": str,          # Plain text transcript
            "word_count": int,    # Total words transcribed
            "chunk_count": int,   # Number of SRT chunks
        }
    """
    if not api_key:
        raise ValueError("OpenAI API Key diperlukan untuk Whisper transcribe")

    client = OpenAI(api_key=api_key)

    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )

    # Extract words from response
    words = []
    if hasattr(transcription, 'words') and transcription.words:
        for w_obj in transcription.words:
            word = w_obj.word if hasattr(w_obj, 'word') else w_obj.get('word', '')
            start = w_obj.start if hasattr(w_obj, 'start') else w_obj.get('start', 0.0)
            end = w_obj.end if hasattr(w_obj, 'end') else w_obj.get('end', 0.0)
            words.append({'word': word.strip(), 'start': start, 'end': end})

    full_text = transcription.text if hasattr(transcription, 'text') else transcription.get('text', '')

    if not words:
        # Fallback: no word-level timestamps available
        fallback_srt = f"1\n00:00:00,000 --> 00:00:05,000\n{full_text}\n"
        return {
            "srt": fallback_srt,
            "text": full_text,
            "word_count": len(full_text.split()),
            "chunk_count": 1,
        }

    # Convert to ASS Format Timestamp
    def format_ass_timestamp(seconds: float) -> str:
        hours = math.floor(seconds / 3600)
        seconds %= 3600
        minutes = math.floor(seconds / 60)
        seconds %= 60
        centiseconds = round((seconds - math.floor(seconds)) * 100)
        if centiseconds >= 100:
            seconds += 1
            centiseconds -= 100
        seconds = math.floor(seconds)
        return f"{hours}:{minutes:02d}:{seconds:02d}.{centiseconds:02d}"

    srt_lines = []
    ass_events = []
    chunk = []
    chunk_start = 0.0
    chunk_end = 0.0
    counter = 1

    for i, w_data in enumerate(words):
        if not chunk:
            chunk_start = w_data['start']

        word_clean = w_data['word'].upper() if capitalize else w_data['word']
        chunk.append({'word': word_clean, 'start': w_data['start'], 'end': w_data['end']})
        chunk_end = w_data['end']

        # Split condition: max words reached, long pause, or last word
        next_is_pause = False
        if i < len(words) - 1:
            next_start = words[i + 1]['start']
            if next_start - w_data['end'] > 1.0:
                next_is_pause = True

        if len(chunk) >= max_words_per_chunk or i == len(words) - 1 or next_is_pause:
            start_str = format_srt_timestamp(chunk_start)
            end_str = format_srt_timestamp(chunk_end)
            text_str = " ".join([cw['word'] for cw in chunk])

            srt_lines.append(str(counter))
            srt_lines.append(f"{start_str} --> {end_str}")
            srt_lines.append(text_str)
            srt_lines.append("")  # blank line between entries

            # --- ASS Word-level Karaoke Events ---
            YELLOW = "&H00D7FF&"   # Default Karaoke Highlight (BGR)
            WHITE  = "&H00FFFFFF&" # Default Non-Highlight
            
            for wi, cw in enumerate(chunk):
                w_start = cw['start']
                if wi < len(chunk) - 1:
                    w_end = chunk[wi + 1]['start']
                else:
                    w_end = chunk_end

                parts = []
                for pj, pw in enumerate(chunk):
                    if pj == wi:
                        parts.append(f"{{\\c{YELLOW}}}{pw['word']}{{\\c{WHITE}}}")
                    else:
                        parts.append(pw['word'])

                dialogue_text = " ".join(parts)
                dialogue_text = f"{{\\c{WHITE}}}{dialogue_text}"
                
                ass_w_start = format_ass_timestamp(w_start)
                ass_w_end = format_ass_timestamp(w_end)
                ass_events.append(
                    f"Dialogue: 0,{ass_w_start},{ass_w_end},Default,,0,0,0,,{dialogue_text}"
                )

            counter += 1
            chunk = []

    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,15,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ass_full = ass_header + "\n".join(ass_events)

    return {
        "srt": "\n".join(srt_lines),
        "ass": ass_full,
        "text": full_text,
        "word_count": len(words),
        "chunk_count": counter - 1,
    }


# ============================================
# CAPTION SETTINGS
# ============================================

DEFAULT_CAPTION_SETTINGS = {
    "font": "Arial",
    "size": 20,
    "color": "#FFFFFF",       # White
    "outline_color": "#000000",  # Black outline
    "outline_size": 2,
    "position": 85,           # 0=top, 100=bottom (persen dari atas)
    "uppercase": False,
    "template": "plain",      # "plain", "karaoke_yellow", etc.
    "social_max_words": 40,
    "social_hashtags": 5,
    "social_tone": "Storytelling (Bercerita)",
}


def get_caption_settings() -> dict:
    """Load caption settings from SQLite, falling back to defaults."""
    db = get_db()
    try:
        row = db.execute(
            "SELECT settings_json FROM caption_settings WHERE id = 1"
        ).fetchone()
        if row and row["settings_json"]:
            import json
            stored = json.loads(row["settings_json"])
            # Merge with defaults for any missing keys
            merged = {**DEFAULT_CAPTION_SETTINGS, **stored}
            return merged
    except Exception:
        pass
    return dict(DEFAULT_CAPTION_SETTINGS)


def save_caption_settings(settings: dict) -> dict:
    """Save caption settings to SQLite. Returns the saved settings."""
    import json
    db = get_db()
    merged = {**DEFAULT_CAPTION_SETTINGS, **settings}
    json_str = json.dumps(merged, ensure_ascii=False)
    db.execute(
        "INSERT OR REPLACE INTO caption_settings (id, settings_json) VALUES (1, ?)",
        (json_str,),
    )
    db.commit()
    return merged


# ============================================
# BURN SUBTITLE TO VIDEO (FFmpeg)
# ============================================

def burn_subtitles_to_video(
    input_video: str,
    srt_content: str,
    output_video: Optional[str] = None,
    settings: Optional[dict] = None,
    ass_path: Optional[str] = None,
) -> str:
    """
    Burn SRT subtitle into a video using FFmpeg's subtitles filter.

    Args:
        input_video: Path to input video file.
        srt_content: SRT subtitle text (not file path — we write to temp file).
        output_video: Path for output video. Auto-generated if None.
        settings: Caption settings dict. Uses DB defaults if None.

    Returns:
        Path to the output video with burned subtitles.
    """
    if output_video is None:
        import uuid
        output_video = str(OUTPUTS_DIR / f"captioned_{uuid.uuid4().hex[:8]}.mp4")

    cfg = settings or get_caption_settings()
    template = cfg.get("template", "classic")

    # If karaoke and we have ASS, use it instead of SRT
    use_ass = False
    if template != "classic" and ass_path and Path(ass_path).exists():
        use_ass = True

    # Setup subtitle file path
    tmp_path = None
    if use_ass:
        sub_file_path = ass_path
    else:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".srt", delete=False, encoding="utf-8") as tmp:
            tmp.write(srt_content)
            sub_file_path = tmp.name
            tmp_path = tmp.name

    try:
        font_name = cfg.get("font", "Arial")
        font_size = cfg.get("size", 20)
        font_color_hex = cfg.get("color", "#FFFFFF")
        outline_color_hex = cfg.get("outline_color", "#000000")
        outline_size = cfg.get("outline_size", 2)
        position = cfg.get("position", 85)

        # Convert hex colors to ASS format (BGR: &HBBGGRR)
        def hex_to_ass_bgr(hex_code: str) -> str:
            h = hex_code.lstrip('#')
            if len(h) == 6:
                return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"
            return "&H00FFFFFF"

        primary_color = hex_to_ass_bgr(font_color_hex)
        secondary_color = "&H00FFFFFF"
        outline_color_ass = hex_to_ass_bgr(outline_color_hex)
        
        if template == "karaoke_yellow":
            primary_color = "&H0000D7FF" # Yellow (BGR)
            secondary_color = "&H00FFFFFF"
        elif template == "karaoke_green":
            primary_color = "&H0000FF00" # Green
            secondary_color = "&H00FFFFFF"
        elif template == "karaoke_red":
            primary_color = "&H000000FF" # Red
            secondary_color = "&H00FFFFFF"
        else:
            secondary_color = primary_color

        virtual_height = 288
        margin_v = int((position / 100.0) * virtual_height)
        margin_v = max(5, min(margin_v, virtual_height - int(font_size * 1.5)))

        force_style = (
            f"Fontname={font_name},"
            f"Fontsize={font_size},"
            f"PrimaryColour={primary_color},"
            f"SecondaryColour={secondary_color},"
            f"OutlineColour={outline_color_ass},"
            f"Outline={outline_size},"
            f"Alignment=2,"
            f"MarginV={margin_v}"
        )

        # If it's classic, we strip inline \c tags if using ASS file
        # But we use SRT for classic so it doesn't matter.


        # Build FFmpeg command
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_video),
            "-vf", f"subtitles={sub_file_path}:force_style='{force_style}'",
            "-c:v", "libx264",
            "-crf", "20",
            "-preset", "medium",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(output_video),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode != 0:
            stderr = result.stderr[-500:] if len(result.stderr) > 500 else result.stderr
            raise RuntimeError(f"Burn subtitle gagal: {stderr}")

        return output_video

    finally:
        # Clean up temp SRT file
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
