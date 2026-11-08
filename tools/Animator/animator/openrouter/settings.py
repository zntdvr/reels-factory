"""Model defaults for the OpenRouter backend. Override any of them in .env."""
import os

BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# STEP 1 storyboard: local Claude Code CLI (`claude-code` or `claude-code:<model>`),
# or any OpenRouter chat model id, e.g. anthropic/claude-sonnet-5.5.
DEFAULT_TEXT_MODEL = os.getenv("OPENROUTER_TEXT_MODEL", "claude-code:sonnet")
# STEP 4 regions: Gemini is trained on 0-1000 [ymin, xmin, ymax, xmax] boxes,
# the convention the engine and region prompt use.
DEFAULT_REGION_MODEL = os.getenv("OPENROUTER_REGION_MODEL", "google/gemini-3.8-flash")
# STEP 2 images. Recraft V4.1 Flash: $0.007/image flat, 16:9 and 9:16.
# Pricier fallback the upstream style prompts were tuned on: google/gemini-3.1-flash-image.
DEFAULT_IMAGE_MODEL = os.getenv("OPENROUTER_IMAGE_MODEL", "recraft/recraft-v4.1-flash")
# STEP 3 narration.
DEFAULT_TTS_MODEL = os.getenv("OPENROUTER_TTS_MODEL", "google/gemini-3.8-flash-tts")
DEFAULT_VOICE = os.getenv("OPENROUTER_VOICE", "Charon")
# Optional delivery direction (Gemini / OpenAI TTS only; ignored by others).
TTS_INSTRUCTIONS = os.getenv("OPENROUTER_TTS_INSTRUCTIONS", "")

IMAGE_ASPECT = os.getenv("OPENROUTER_IMAGE_ASPECT", "16:9")
IMAGE_RESOLUTION = os.getenv("OPENROUTER_IMAGE_RESOLUTION", "")  # e.g. 1K, 2K; empty = provider default

MAX_RETRIES = int(os.getenv("OPENROUTER_MAX_RETRIES", "5"))
RETRY_DELAY_SEC = float(os.getenv("OPENROUTER_RETRY_DELAY_SEC", "8"))
TIMEOUT_SEC = float(os.getenv("OPENROUTER_TIMEOUT_SEC", "300"))
