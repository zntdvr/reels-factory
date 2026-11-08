"""Thin OpenRouter HTTP client: chat (JSON schema), images, speech, retries.

Uses httpx, which honours HTTPS_PROXY / ALL_PROXY from the environment.
"""
from __future__ import annotations

import base64
import copy
import json
import logging
import os
import re
import sys
import time
from typing import Any, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .settings import BASE_URL, MAX_RETRIES, RETRY_DELAY_SEC, TIMEOUT_SEC

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class OpenRouterError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(f"OpenRouter HTTP {status}: {message}")
        self.status = status


def inline_schema(model: Type[BaseModel]) -> dict:
    """Pydantic JSON schema with every $ref inlined (some providers reject $defs)."""
    schema = model.model_json_schema()
    defs = schema.pop("$defs", {})

    def resolve(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                target = copy.deepcopy(defs[node["$ref"].split("/")[-1]])
                extra = {k: v for k, v in node.items() if k != "$ref"}
                return resolve({**target, **extra})
            return {k: resolve(v) for k, v in node.items()}
        if isinstance(node, list):
            return [resolve(v) for v in node]
        return node

    return resolve(schema)


def strip_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.S)
    return match.group(1) if match else text


class OpenRouterClient:
    def __init__(self, api_key: str, *, base_url: str = BASE_URL):
        self._http = httpx.Client(
            base_url=base_url,
            timeout=TIMEOUT_SEC,
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://syspartner.ru"),
                "X-Title": "Animator",
            },
        )
        self.total_cost = 0.0
        self.tts_cost = 0.0
        self.pending_generations: list[str] = []

    # -- transport -----------------------------------------------------------
    def _post(self, path: str, payload: dict) -> httpx.Response:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self._http.post(path, json=payload)
            except httpx.TransportError as exc:
                if attempt == MAX_RETRIES:
                    raise RuntimeError(f"OpenRouter unreachable: {exc}") from exc
                logger.warning("OpenRouter %s transport error (%s); retry %s", path, exc, attempt)
                time.sleep(RETRY_DELAY_SEC * attempt)
                continue
            if response.status_code < 400:
                return response
            retryable = response.status_code in (408, 429) or response.status_code >= 500
            message = response.text[:500]
            if not retryable or attempt == MAX_RETRIES:
                raise OpenRouterError(response.status_code, message)
            logger.warning("OpenRouter %s -> %s (%s); retry %s/%s",
                           path, response.status_code, message[:120], attempt, MAX_RETRIES)
            time.sleep(RETRY_DELAY_SEC * attempt)
        raise AssertionError("unreachable")

    def _track(self, data: dict, what: str) -> None:
        cost = (data.get("usage") or {}).get("cost")
        if isinstance(cost, (int, float)):
            self.total_cost += cost
            logger.info("%s cost $%.4f (total $%.4f)", what, cost, self.total_cost)

    # -- endpoints -----------------------------------------------------------
    def chat_json(self, model: str, content: Any, schema: Type[T], *, name: str) -> T:
        """Chat completion constrained to `schema`; validated with pydantic."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": content}],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": name, "strict": False, "schema": inline_schema(schema)},
            },
            "provider": {"require_parameters": True},
        }
        last_error: Exception | None = None
        for _ in range(2):  # one extra try if the model returns malformed JSON
            data = self._post("/chat/completions", payload).json()
            self._track(data, f"chat {model}")
            try:
                text = data["choices"][0]["message"]["content"] or ""
                return schema.model_validate_json(strip_fences(text))
            except (KeyError, IndexError, ValidationError, json.JSONDecodeError) as exc:
                last_error = exc
                logger.warning("%s returned invalid %s JSON: %s", model, name, str(exc)[:200])
        raise RuntimeError(f"{model} gave no valid {name}: {last_error}")

    def image(self, model: str, prompt: str, *, aspect_ratio: str, resolution: str = "") -> bytes:
        payload: dict = {"model": model, "prompt": prompt, "n": 1, "aspect_ratio": aspect_ratio}
        if resolution:
            payload["resolution"] = resolution
        data = self._post("/images", payload).json()
        self._track(data, f"image {model}")
        try:
            return base64.b64decode(data["data"][0]["b64_json"])
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"image generation returned no data: {str(data)[:300]}") from exc

    def speech(self, model: str, text: str, *, voice: str, instructions: str = "") -> tuple[bytes, str, int]:
        """Returns (audio, format, rate). Prefers PCM (Gemini TTS accepts only PCM);
        falls back to MP3 for providers that reject PCM."""
        payload: dict = {"model": model, "input": text, "voice": voice, "response_format": "pcm"}
        if instructions:
            payload["instructions"] = instructions
        try:
            response = self._post("/audio/speech", payload)
        except OpenRouterError as exc:
            if exc.status != 400 or "pcm" not in str(exc).lower():
                raise
            payload["response_format"] = "mp3"
            response = self._post("/audio/speech", payload)
        if not response.content:
            raise RuntimeError("speech synthesis returned no audio")
        gen_id = response.headers.get("x-generation-id")
        if gen_id:
            self.pending_generations.append(gen_id)
        ctype = response.headers.get("content-type", "")
        rate_match = re.search(r"rate=(\d+)", ctype)
        fmt = "mp3" if "mpeg" in ctype or payload["response_format"] == "mp3" else "pcm"
        return response.content, fmt, int(rate_match.group(1)) if rate_match else 24000

    def settle_costs(self, max_wait_sec: float = 75.0) -> None:
        """Add the cost of calls that report it only via /generation (TTS).
        Stats for TTS appear ~30-60 s after the call, so poll until they do."""
        if not self.pending_generations:
            return
        deadline = time.monotonic() + max_wait_sec
        print("openrouter: waiting for TTS cost stats...", file=sys.stderr)
        while self.pending_generations and time.monotonic() < deadline:
            for gen_id in list(self.pending_generations):
                response = self._http.get("/generation", params={"id": gen_id})
                if response.status_code == 200:
                    cost = (response.json().get("data") or {}).get("total_cost")
                    if isinstance(cost, (int, float)):
                        self.total_cost += cost
                        self.tts_cost += cost
                        logger.info("speech cost $%.4f (total $%.4f)", cost, self.total_cost)
                    self.pending_generations.remove(gen_id)
            if self.pending_generations:
                time.sleep(5)
        for gen_id in self.pending_generations:
            logger.warning("cost for %s not available yet (see openrouter.ai/activity)", gen_id)


def openrouter_client() -> OpenRouterClient:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise SystemExit("needs OPENROUTER_API_KEY in the environment (or .env next to Animator)")
    return OpenRouterClient(api_key)
