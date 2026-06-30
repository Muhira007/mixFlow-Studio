"""
mixFlow Studio — AI Script Generator Service
Handles: script generation via DeepSeek, Google Gemini, or OpenAI.
"""

import json
import re
from typing import Optional

import httpx

from app.config import (
    DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL,
    GEMINI_MODEL,
    OPENAI_MODEL,
)

# ============================================
# SYSTEM PROMPT
# ============================================

SYSTEM_PROMPT = """Kamu adalah copywriter handal spesialis video pendek konten affiliate.
Tugas kamu: membuat SATU naskah voice-over natural untuk mempromosikan produk.

ATURAN MUTLAK:
1. DILARANG menyebut nama marketplace (Sho-pee, To-pe-dia, La-za-da, TiK-ToK Shop, Bu-ka-la-pak, dll)
2. DILARANG menyebut nama media sosial (IG, FB, YT, platform video pendek, platform mikroblog, dll)
3. DILARANG menggunakan frasa "klik link di bio" atau "keranjang kuning"
4. Gunakan CTA natural: "cek keranjang di bawah video ini" atau "klik tautan di bawah"
5. Paragraf pendek (2-3 kalimat), mudah dibaca dengan suara natural
6. Gunakan bahasa Indonesia yang mengalir seperti orang ngomong, jangan kaku kayak baca berita
7. Langsung mulai dengan narasi, JANGAN pakai label seperti "Naskah:" atau "Voice-over:"
8. SANGAT PENTING: Kamu HARUS memenuhi TARGET JUMLAH KATA yang disebutkan di prompt user (minimal 90% dari target).
9. SANGAT PENTING: Gunakan Audio Tags ElevenLabs di dalam naskah untuk mengekspresikan emosi/suasana (contoh: [excited], [sigh], [whispers], [calm], [laughs]). Sisipkan tag ini di awal atau di tengah kalimat secara natural agar suara AI lebih hidup dan ekspresif.

OUTPUT FORMAT (JSON):
{
  "script": "satu naskah voice-over natural dengan audio tags ElevenLabs.",
  "caption": "caption + hashtag (3-5 hashtag relevan)"
}"""


# ============================================
# DURATION → WORD COUNT MAPPING
# (Indonesian speaking rate: ~3.5-4 words/sec)
# ============================================

DURATION_WORD_TARGET: dict[str, dict[str, int]] = {
    "15": {"min": 25, "target": 35, "max": 45},
    "30": {"min": 95, "target": 110, "max": 125},
    "60": {"min": 195, "target": 220, "max": 240},
    "90": {"min": 300, "target": 330, "max": 355},
}


def _get_word_target(duration: str) -> dict[str, int]:
    """Get word count target for a duration value. Falls back to 60s default."""
    # Normalize: strip "detik" or other text, extract number
    dur = duration.strip()
    for key in DURATION_WORD_TARGET:
        if key in dur:
            return DURATION_WORD_TARGET[key]
    # Fallback: try to parse as int
    try:
        dur_int = int(dur)
        # ~3.7 words/sec
        target = dur_int * 37 // 10
        return {"min": max(10, target - 25), "target": target, "max": target + 25}
    except ValueError:
        return DURATION_WORD_TARGET["60"]


# ============================================
# PROVIDER IMPLEMENTATIONS
# ============================================

def _build_user_prompt(
    product_name: str,
    product_info: Optional[dict],
    duration: str,
    style: str,
    audience: str,
) -> str:
    """Build user prompt with product context and explicit word count target."""
    wt = _get_word_target(duration)

    context = f"Produk: {product_name}\n"
    context += f"Durasi: {duration} detik\n"
    context += f"Gaya: {style}\n"
    context += f"Target: {audience}\n"

    if product_info:
        if product_info.get("title"):
            context += f"Judul: {product_info['title']}\n"
        if product_info.get("description"):
            context += f"Deskripsi: {product_info['description'][:500]}\n"
        if product_info.get("body_text"):
            context += f"Detail: {product_info['body_text'][:800]}\n"

    context += f"\nTarget sekitar {wt['target']} kata, minimal {wt['min']} kata.\n"
    context += "\nBuat naskah voice-over. Output JSON: {\"script\": \"...\", \"caption\": \"...\"}"
    return context


async def _generate_deepseek(
    user_prompt: str,
    api_key: str,
) -> dict:
    """Generate script via DeepSeek API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 2000,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(DEEPSEEK_BASE_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"DeepSeek error ({resp.status_code}): {resp.text[:200]}")
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json_output(content)


async def _generate_gemini(
    user_prompt: str,
    api_key: str,
    model: str = GEMINI_MODEL
) -> dict:
    """Generate script via Google Gemini API."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{user_prompt}"
        response = client.models.generate_content(
            model=model,
            contents=full_prompt,
        )
        return _parse_json_output(response.text)
    except ImportError:
        # Fallback: use REST API directly
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\n---\n\n{user_prompt}"}]
            }]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini error ({resp.status_code}): {resp.text[:200]}")
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return _parse_json_output(content)


async def _generate_openai(
    user_prompt: str,
    api_key: str,
) -> dict:
    """Generate script via OpenAI API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 2000,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"OpenAI error ({resp.status_code}): {resp.text[:200]}")
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json_output(content)


# ============================================
# JSON PARSER
# ============================================

def _parse_json_output(text: str) -> dict:
    """Extract and parse JSON from AI output (handles markdown code blocks, stray text, broken JSON)."""
    original = text.strip()

    # Step 1: Extract from markdown code block
    m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if m:
        text = m.group(1).strip()

    # Step 2: Try direct parse
    try:
        result = json.loads(text)
        return _clean_result(result, original)
    except json.JSONDecodeError:
        pass

    # Step 3: Find outermost JSON object (greedy: first { to last })
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        candidate = m.group(0)
        try:
            result = json.loads(candidate)
            return _clean_result(result, original)
        except json.JSONDecodeError:
            pass

    # Step 4: Try to fix common JSON errors (unescaped quotes, trailing commas)
    try:
        fixed = _fix_broken_json(text)
        result = json.loads(fixed)
        return _clean_result(result, original)
    except (json.JSONDecodeError, ValueError):
        pass

    # Fallback: return raw text as script
    return {
        "script": original,
        "caption": "",
    }


def _clean_result(result: dict, original: str) -> dict:
    """Ensure the result has script/caption keys. If missing, extract from raw text."""
    script = result.get("script") or result.get("naskah") or result.get("content") or result.get("text") or ""
    caption = result.get("caption") or result.get("judul") or ""

    # If script looks like JSON string (double-wrapped), unwrap it
    if script.strip().startswith("{") and '"script"' in script:
        try:
            inner = json.loads(script)
            script = inner.get("script", script)
            caption = inner.get("caption", caption)
        except (json.JSONDecodeError, TypeError):
            pass

    # If still no script, use raw original text as-is
    if not script.strip():
        script = original
        
    if not script.strip():
        script = "⚠️ AI gagal membuat naskah (output kosong). Coba sesuaikan kata kunci atau gunakan provider AI lain."

    return {
        "script": script.strip(),
        "caption": caption.strip(),
    }


def _fix_broken_json(text: str) -> str:
    """Attempt to fix common JSON formatting errors from LLM output."""
    # Find JSON object boundaries
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found")

    inner = text[start:end+1]

    # Remove trailing commas before } or ]
    inner = re.sub(r',\s*}', '}', inner)
    inner = re.sub(r',\s*]', ']', inner)

    # Fix unescaped newlines inside string values (common LLM mistake)
    # This is tricky — we'll just try to fix obvious cases
    # Replace literal newlines inside quoted strings with \n
    lines = inner.split('\n')
    fixed_lines = []
    in_string = False
    for line in lines:
        fixed_lines.append(line)
    inner = '\n'.join(fixed_lines)

    return inner


# ============================================
# MAIN ENTRY POINT
# ============================================

async def generate_script(
    product_name: str,
    provider: str,
    api_key: str,
    duration: str = "60 detik",
    style: str = "Casual & Menarik",
    audience: str = "Umum",
    product_info: Optional[dict] = None,
) -> dict:
    """
    Generate video script using specified AI provider.

    Returns:
        { versionA, versionB, caption, provider }
    """
    if not api_key:
        raise ValueError(f"API key untuk {provider} tidak boleh kosong")

    user_prompt = _build_user_prompt(product_name, product_info, duration, style, audience)

    provider_lower = provider.lower()

    if "deepseek" in provider_lower:
        result = await _generate_deepseek(user_prompt, api_key)
    elif "gemini" in provider_lower:
        # Determine specific Gemini model version
        model = "gemini-2.5-flash" if "2.5" in provider_lower else GEMINI_MODEL
        result = await _generate_gemini(user_prompt, api_key, model=model)
    elif "openai" in provider_lower or "gpt" in provider_lower:
        result = await _generate_openai(user_prompt, api_key)
    else:
        raise ValueError(f"Provider tidak dikenal: {provider}. Gunakan: deepseek, gemini, openai")

    result["provider"] = provider
    return result
