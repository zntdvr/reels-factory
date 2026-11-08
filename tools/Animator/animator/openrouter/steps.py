"""The four Gemini steps re-implemented on OpenRouter.

Prompt building, beat timing and region conversion are reused from
animator.gemini so both backends behave the same; only transport differs.
"""
from __future__ import annotations

import base64
import io
import logging
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple

from PIL import Image

from ..gemini.beat_timing import PCM_RATE, locate_beats, pcm_to_wav
from ..gemini.detect_regions import build_region_prompt, to_region
from ..gemini.images import build_image_prompt
from ..gemini.schemas import DetectionResponse, StoryboardPlan, StoryboardScene
from ..gemini.storyboard import build_retry_prompt, build_storyboard_prompt, unspoken_labels
from ..regions import SnippetRegionPlan
from . import settings
from .claude_code import claude_json, is_claude_code
from .client import OpenRouterClient

logger = logging.getLogger(__name__)


# STEP 1 ---------------------------------------------------------------------
def generate_storyboard(client: OpenRouterClient, idea: str, *, model: str,
                        num_scenes: Optional[int] = None) -> StoryboardPlan:
    prompt = build_storyboard_prompt(idea, num_scenes)
    best: Optional[StoryboardPlan] = None
    for _ in range(2):
        if is_claude_code(model):
            draft = claude_json(model, prompt, StoryboardPlan)
        else:
            draft = client.chat_json(model, prompt, StoryboardPlan, name="storyboard")
        if not draft.scenes or not all(scene.beats for scene in draft.scenes):
            raise RuntimeError("storyboard generation returned no scenes")
        if best is None or len(unspoken_labels(draft)) < len(unspoken_labels(best)):
            best = draft
        unspoken = unspoken_labels(best)
        if not unspoken:
            break
        logger.warning("captions never spoken in their sentence: %s", unspoken)
        prompt = build_retry_prompt(idea, num_scenes, unspoken)
    return best


# STEP 2 ---------------------------------------------------------------------
def generate_scene_image(client: OpenRouterClient, scene: StoryboardScene, *, model: str) -> bytes:
    raw = client.image(model, build_image_prompt(scene),
                       aspect_ratio=settings.IMAGE_ASPECT, resolution=settings.IMAGE_RESOLUTION)
    # Providers may return JPEG/WebP; the engine and region step expect PNG.
    with Image.open(io.BytesIO(raw)) as image:
        out = io.BytesIO()
        image.convert("RGB").save(out, format="PNG")
        return out.getvalue()


# STEP 3 ---------------------------------------------------------------------
def to_pcm(audio: bytes, fmt: str, rate: int) -> bytes:
    """Mono 16-bit PCM at the rate beat_timing expects (resampling if needed)."""
    if fmt == "pcm" and rate == PCM_RATE:
        return audio
    src = ["-f", "s16le", "-ar", str(rate), "-ac", "1"] if fmt == "pcm" else []
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", *src, "-i", "pipe:0", "-f", "s16le", "-acodec", "pcm_s16le",
         "-ac", "1", "-ar", str(PCM_RATE), "pipe:1"],
        input=audio, capture_output=True, check=True,
    )
    if not proc.stdout:
        raise RuntimeError("speech synthesis produced no decodable audio")
    return proc.stdout


def generate_beat_narration(client: OpenRouterClient, beats: List[str], *, model: str,
                            voice: str) -> Tuple[bytes, List[List[float]]]:
    text = " ".join(beat.strip() for beat in beats)
    pcm = to_pcm(*client.speech(model, text, voice=voice, instructions=settings.TTS_INSTRUCTIONS))
    return pcm_to_wav(pcm), locate_beats(pcm, beats)


# STEP 4 ---------------------------------------------------------------------
def detect_region_plan(client: OpenRouterClient, *, image_path: Path, transcript_text: str,
                       model: str, idea: str = "", beats: List[str] | None = None) -> SnippetRegionPlan:
    idea = idea or "(untitled)"
    with Image.open(image_path) as image:
        size = list(image.size)
        mime_type = Image.MIME.get(image.format, "image/png")
    data_url = f"data:{mime_type};base64,{base64.b64encode(image_path.read_bytes()).decode()}"
    content = [
        {"type": "image_url", "image_url": {"url": data_url}},
        {"type": "text", "text": build_region_prompt(transcript_text, idea, beats)},
    ]
    parsed = client.chat_json(model, content, DetectionResponse, name="regions")
    if not parsed.regions:
        raise RuntimeError("region detection returned no regions")
    return SnippetRegionPlan(
        idea=idea,
        global_style_notes="",
        regions=[to_region(detected) for detected in parsed.regions],
        image_size=size,
    )
