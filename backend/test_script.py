import asyncio
from app.services.script_service import _get_word_target, _build_user_prompt

print(_get_word_target("15"))
print(_build_user_prompt("Test Product", None, "15", "Santai", "Umum"))
