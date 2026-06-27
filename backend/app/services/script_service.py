"""
mixFlow — AI Script Generator Service
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

SYSTEM_PROMPT = """Kamu adalah copywriter handal spesialis video pendek TikTok/Shopee affiliate.
Tugas kamu: membuat naskah voice-over untuk mempromosikan produk.

ATURAN MUTLAK:
1. DILARANG menyebut nama marketplace (Shopee, Tokopedia, Lazada, TikTok Shop, Bukalapak, dll)
2. DILARANG menyebut nama media sosial (Instagram, IG, Facebook, FB, YouTube, YT, TikTok, X, Twitter, dll)
3. DILARANG menggunakan frasa "klik link di bio" atau "keranjang kuning"
4. Gunakan CTA: "cek keranjang di bawah video ini" atau "klik tautan di bawah"
5. Format paragraf pendek (2-3 kalimat per paragraf)
6. Gunakan bahasa Indonesia natural dan engaging

OUTPUT FORMAT (JSON):
{
  "versionA": "naskah hard-selling (direct, urgency, promo-focused)",
  "versionB": "naskah storytelling (personal experience, emotional, relatable)",
  "caption": "caption untuk postingan + hashtag (3-5 hashtag relevan)"
}"""


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
    """Build user prompt with product context."""
    context = f"Nama Produk: {product_name}\n"
    context += f"Durasi Video: {duration}\n"
    context += f"Gaya Bahasa: {style}\n"
    context += f"Target Audiens: {audience}\n"

    if product_info:
        if product_info.get("title"):
            context += f"Judul Produk: {product_info['title']}\n"
        if product_info.get("description"):
            context += f"Deskripsi: {product_info['description']}\n"

    context += "\nBuat naskah voice-over sesuai aturan di atas. Output HARUS JSON valid."
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(DEEPSEEK_BASE_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"DeepSeek error ({resp.status_code}): {resp.text[:200]}")
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json_output(content)


async def _generate_gemini(
    user_prompt: str,
    api_key: str,
) -> dict:
    """Generate script via Google Gemini API."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{user_prompt}"
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=full_prompt,
        )
        return _parse_json_output(response.text)
    except ImportError:
        # Fallback: use REST API directly
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
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

    async with httpx.AsyncClient(timeout=30.0) as client:
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
    """Extract and parse JSON from AI output (handles markdown code blocks)."""
    # Try to find JSON block
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1)

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    # Fallback: return raw text as versionA
    return {
        "versionA": text.strip(),
        "versionB": "",
        "caption": "",
    }


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
        result = await _generate_gemini(user_prompt, api_key)
    elif "openai" in provider_lower or "gpt" in provider_lower:
        result = await _generate_openai(user_prompt, api_key)
    else:
        raise ValueError(f"Provider tidak dikenal: {provider}. Gunakan: deepseek, gemini, openai")

    result["provider"] = provider
    return result
