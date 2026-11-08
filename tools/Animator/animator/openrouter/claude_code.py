"""Storyboard via the local Claude Code CLI (`claude -p --json-schema`).

Select with text model `claude-code` or `claude-code:<model>` (e.g.
`claude-code:sonnet`, `claude-code:opus`). Uses whatever login the local
`claude` CLI has (subscription or API key); no OpenRouter call is made.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError

from .client import inline_schema, strip_fences

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

PREFIX = "claude-code"
TIMEOUT_SEC = float(os.getenv("CLAUDE_CODE_TIMEOUT_SEC", "600"))


def is_claude_code(model: str) -> bool:
    return model == PREFIX or model.startswith(PREFIX + ":")


def claude_json(model: str, prompt: str, schema: Type[T]) -> T:
    binary = os.getenv("CLAUDE_CODE_BIN") or shutil.which("claude")
    if not binary:
        raise RuntimeError("claude CLI not found on PATH (set CLAUDE_CODE_BIN)")
    cmd = [
        binary, "-p",
        "--output-format", "json",
        "--json-schema", json.dumps(inline_schema(schema), ensure_ascii=False),
        "--no-session-persistence",
        "--tools", "",  # pure text generation: no file/shell access
    ]
    sub_model = model.split(":", 1)[1] if ":" in model else os.getenv("CLAUDE_CODE_MODEL", "")
    if sub_model:
        cmd += ["--model", sub_model]

    last_error: Exception | None = None
    for attempt in (1, 2):
        # Neutral cwd so project CLAUDE.md / settings are not picked up.
        with tempfile.TemporaryDirectory() as cwd:
            proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                                  cwd=cwd, timeout=TIMEOUT_SEC)
        if proc.returncode != 0:
            raise RuntimeError(f"claude -p failed ({proc.returncode}): {(proc.stderr or proc.stdout)[:500]}")
        try:
            envelope = json.loads(proc.stdout)
            if envelope.get("is_error"):
                raise RuntimeError(f"claude -p error: {str(envelope.get('result'))[:500]}")
            cost = envelope.get("total_cost_usd")
            if cost is not None:
                logger.info("claude-code storyboard cost (as reported by CLI) $%.4f", cost)
            payload = envelope.get("structured_output")
            if payload is not None:
                return schema.model_validate(payload)
            return schema.model_validate_json(strip_fences(envelope.get("result") or ""))
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            logger.warning("claude -p returned invalid JSON (attempt %s): %s", attempt, str(exc)[:200])
    raise RuntimeError(f"claude -p gave no valid storyboard: {last_error}")
