"""OpenRouter backend: same pipeline as animator.gemini, one OPENROUTER_API_KEY."""
from .client import OpenRouterClient, openrouter_client

__all__ = ["OpenRouterClient", "openrouter_client"]
