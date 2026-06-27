"""
mixFlow — Video Processing Service
Handles: pre-process (auto-proxy for >1080p), frame analysis, adaptive trim, concat.
"""

import subprocess
import uuid
import json
from pathlib import Path

import cv2
import numpy as np

from app.config import (
    UPLOADS_DIR,
    PROXY_DIR,
    MIN_KEEP_DURATION,
    PROXY_CRF,
    PROXY_PRESET,
)


# ============================================
# 1. PRE-PROCESS — Auto-Proxy
# ============================================

def detect_resolution(filepath: Path) -> tuple[int, int]:
    """Get video width & height via FFprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            str(filepath),
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )
    info = json.loads(result.stdout)
    stream = info["streams"][0]
    return stream["width"], stream["height"]


def needs_proxy(width: int, height: int, threshold_w: int = 1080, threshold_h: int = 1920) -> bool:
    """Check if resolution exceeds 1080p threshold."""
    return width > threshold_w or height > threshold_h


def create_proxy(
    filepath: Path,
    target_w: int = 1080,
    target_h: int = 1920,
    crf: int = PROXY_CRF,
    preset: str = PROXY_PRESET,
) -> Path:
    """
    Create a 1080p vertical proxy from any source resolution.
    Uses FFmpeg scale + pad to fit 9:16 vertical.
    """
    proxy_path = PROXY_DIR / f"proxy_{filepath.stem}_{uuid.uuid4().hex[:6]}.mp4"

    # Scale to fit within 1080x1920, then pad to exact dimensions
    vf = (
        f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
        f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2"
    )

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(filepath),
            "-vf", vf,
            "-c:v", "libx264",
            "-crf", str(crf),
            "-preset", preset,
            "-an",  # no audio in proxy
            str(proxy_path),
        ],
        capture_output=True,
        timeout=120,
    )

    return proxy_path


def preprocess_footage(filepath: Path) -> tuple[Path, bool]:
    """
    Pre-process a footage file:
    - Detect resolution
    - If >1080p, create proxy
    - Return (working_path, was_proxied)
    """
    w, h = detect_resolution(filepath)
    if needs_proxy(w, h):
        proxy = create_proxy(filepath)
        print(f"  📐 Proxy created: {w}×{h} → 1080×1920 ({filepath.name})")
        return proxy, True
    return filepath, False


# ============================================
# 2. FRAME ANALYSIS
# ============================================

def analyze_footage(filepath: Path) -> dict:
    """
    Analyze footage quality frame-by-frame.
    Returns dict with blur scores, shake scores, and good segment boundaries.
    """
    cap = cv2.VideoCapture(str(filepath))
    if not cap.isOpened():
        raise ValueError(f"Tidak bisa membuka video: {filepath}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0

    blur_scores = []
    shake_scores = []
    prev_frame = None

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Blur detection — Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_scores.append(laplacian_var)

        # Shake detection — frame-to-frame difference
        if prev_frame is not None:
            diff = cv2.absdiff(gray, prev_frame)
            shake = np.mean(diff)
            shake_scores.append(shake)
        else:
            shake_scores.append(0.0)

        prev_frame = gray
        frame_idx += 1

    cap.release()

    # Determine good segment
    blur_threshold = 50.0  # below this = blurry
    shake_threshold = 15.0  # above this = shaky
    margin_frames = int(fps * 1.0)  # 1 second margin

    # Find first and last "good" frames
    good_start = margin_frames
    good_end = total_frames - margin_frames

    for i in range(margin_frames, total_frames - margin_frames):
        if blur_scores[i] >= blur_threshold and shake_scores[i] <= shake_threshold:
            good_start = i
            break

    for i in range(total_frames - margin_frames - 1, margin_frames, -1):
        if blur_scores[i] >= blur_threshold and shake_scores[i] <= shake_threshold:
            good_end = i
            break

    # Calculate quality
    avg_blur = np.mean(blur_scores)
    avg_shake = np.mean(shake_scores)
    quality = "good" if avg_blur > 100 and avg_shake < 12 else "ok" if avg_blur > 50 else "bad"

    return {
        "file": filepath.name,
        "duration": f"{duration:.1f}s",
        "resolution": f"{width}×{height}",
        "fps": round(fps, 2),
        "total_frames": total_frames,
        "blur_avg": round(float(avg_blur), 1),
        "blur_scores": [round(float(s), 1) for s in blur_scores],
        "shake_avg": round(float(avg_shake), 2),
        "shake_scores": [round(float(s), 2) for s in shake_scores],
        "good_start_frame": good_start,
        "good_end_frame": good_end,
        "good_start_sec": round(good_start / fps, 2) if fps > 0 else 0,
        "good_end_sec": round(good_end / fps, 2) if fps > 0 else 0,
        "quality": quality,
    }


# ============================================
# 3. ADAPTIVE TRIM
# ============================================

def adaptive_trim(
    analyses: list[dict],
    target_duration: float,
    min_keep: float = MIN_KEEP_DURATION,
) -> list[dict]:
    """
    Calculate trim segments to match target_duration.
    Proportional distribution — longer footage gets trimmed more.
    Each footage keeps ≥ min_keep seconds.
    """
    # Calculate good duration per footage
    for a in analyses:
        a["good_duration"] = max(0, a["good_end_sec"] - a["good_start_sec"])
        a["total_duration"] = float(a["duration"].replace("s", ""))

    total_good = sum(a["good_duration"] for a in analyses)

    if total_good <= 0:
        # Fallback: trim 10% from start, 10% from end
        for a in analyses:
            dur = a["total_duration"]
            a["trim_start"] = round(dur * 0.1, 2)
            a["trim_end"] = round(dur * 0.9, 2)
        return analyses

    # If total good < target, just keep all good segments
    if total_good <= target_duration:
        for a in analyses:
            a["trim_start"] = a["good_start_sec"]
            a["trim_end"] = a["good_end_sec"]
        return analyses

    # Need to trim — distribute proportionally
    excess = total_good - target_duration
    segments = []

    for a in analyses:
        proportion = a["good_duration"] / total_good if total_good > 0 else 0
        trim_amount = excess * proportion
        new_duration = a["good_duration"] - trim_amount

        # Enforce min_keep
        if new_duration < min_keep:
            new_duration = min_keep

        # Recalculate start/end
        center = (a["good_start_sec"] + a["good_end_sec"]) / 2
        half = new_duration / 2
        new_start = max(0, center - half)
        new_end = min(a["total_duration"], center + half)

        # Ensure min_keep
        if new_end - new_start < min_keep:
            new_end = min(a["total_duration"], new_start + min_keep)

        a["trim_start"] = round(new_start, 2)
        a["trim_end"] = round(new_end, 2)
        segments.append(a)

    # Cascade: if still over target, trim from longest
    current_total = sum(s["trim_end"] - s["trim_start"] for s in segments)
    while current_total > target_duration * 1.05:  # 5% tolerance
        longest = max(segments, key=lambda s: s["trim_end"] - s["trim_start"])
        current_dur = longest["trim_end"] - longest["trim_start"]
        if current_dur <= min_keep:
            break
        reduction = min(0.5, current_total - target_duration)
        longest["trim_end"] = round(max(
            longest["trim_start"] + min_keep,
            longest["trim_end"] - reduction
        ), 2)
        current_total = sum(s["trim_end"] - s["trim_start"] for s in segments)

    return segments


# ============================================
# 4. CONCAT
# ============================================

def concat_clips(
    segments: list[dict],
    source_files: list[Path],
    output_path: Path,
    target_w: int = 1080,
    target_h: int = 1920,
) -> Path:
    """
    Concatenate clips with trim points, resize to target resolution.
    Uses FFmpeg concat filter for precise trimming + scaling in one pass.
    """
    # Build FFmpeg filter_complex
    filter_parts = []
    inputs = []

    for i, seg in enumerate(segments):
        src = source_files[i] if i < len(source_files) else source_files[0]
        inputs.extend(["-i", str(src)])

        start = seg["trim_start"]
        end = seg["trim_end"]
        duration = end - start

        filter_parts.append(
            f"[{i}:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,"
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
            f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2,"
            f"setsar=1[v{i}];"
        )

    # Concat all video streams
    concat_inputs = "".join(f"[v{i}]" for i in range(len(filter_parts)))
    filter_complex = "".join(filter_parts) + f"{concat_inputs}concat=n={len(filter_parts)}:v=1:a=0[outv]"

    subprocess.run(
        [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "[outv]",
            "-c:v", "libx264",
            "-crf", "23",
            "-preset", "fast",
            str(output_path),
        ],
        capture_output=True,
        timeout=300,
    )

    return output_path
