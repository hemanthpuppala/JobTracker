"""Provider-agnostic AI interface.

Configurable via env vars:
  AI_PROVIDER=claude_cli|anthropic_api|openai_api
  ANTHROPIC_API_KEY=sk-...  (for API mode)
  AI_MODEL=claude-sonnet-4-6  (for API mode)
"""

import asyncio
import json
from abc import ABC, abstractmethod

from ..config import AI_PROVIDER, ANTHROPIC_API_KEY, AI_MODEL


class AIProvider(ABC):
    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        ...


class ClaudeCLIProvider(AIProvider):
    """Calls `claude -p` subprocess — uses Max plan, no API key needed."""

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        combined = f"{system_prompt}\n\n{user_prompt}"
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", combined,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"claude CLI failed: {stderr.decode().strip()}")
        return stdout.decode().strip()


class AnthropicAPIProvider(AIProvider):
    """Uses anthropic Python SDK."""

    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY env var required for anthropic_api provider")

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        message = await client.messages.create(
            model=AI_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text


class OpenAICompatibleProvider(AIProvider):
    """For future OpenAI/Ollama/etc."""

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError("OpenAI provider not yet implemented")


_provider_cache: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    """Factory based on AI_PROVIDER env var."""
    global _provider_cache
    if _provider_cache is not None:
        return _provider_cache

    providers = {
        "claude_cli": ClaudeCLIProvider,
        "anthropic_api": AnthropicAPIProvider,
        "openai_api": OpenAICompatibleProvider,
    }
    cls = providers.get(AI_PROVIDER)
    if cls is None:
        raise ValueError(f"Unknown AI_PROVIDER: {AI_PROVIDER}. Options: {list(providers.keys())}")
    _provider_cache = cls()
    return _provider_cache
