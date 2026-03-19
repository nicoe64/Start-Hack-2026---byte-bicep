import json
import os
from app.config import ANTHROPIC_API_KEY, LLM_MODEL, PROMPTS_DIR


def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r") as f:
        return f.read()


async def call(system_prompt: str, message: str, temperature: float = 0.3) -> str:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model=LLM_MODEL,
        system=system_prompt,
        max_tokens=2000,
        messages=[{"role": "user", "content": message}],
    )
    return response.content[0].text


async def call_json(system_prompt: str, message: str, temperature: float = 0.3) -> dict:
    raw = await call(system_prompt, message, temperature)
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return json.loads(cleaned.strip())
