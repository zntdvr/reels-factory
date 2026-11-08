"""Render one doodle from an external timing spec (used by create-reels).

    python -m animator --spec spec.json -o out.webm [--assets DIR] [--regenerate]

The host video tool owns voice, subtitles and timing; this mode only draws.
It skips the storyboard and TTS steps, takes measured beat windows from the
spec, and writes a silent clip at the host fps that is at least `frames` long.
`.webm` output is VP9 with real alpha (white keyed out) for compositing over
any background; `.mp4` is ink on white.

Spec (JSON):
    {
      "fps": 30,                    # host frame rate
      "frames": 465,                # length the host needs, in frames
      "aspect": "16:9",             # image aspect sent to the image model
      "style": "syspartner",        # prompts/style_<style>.txt
      "title": "",                  # optional heading drawn on the board
      "layout": "where things sit",
      "max_dim": 1600,              # engine working resolution (long side)
      "beats": [                    # in drawing order; seconds from video start
        {"start": 0.4, "end": 3.9, "visual": "...", "label": "", "narration": "..."}
      ]
    }

Outputs in --assets (default: next to the MP4):
    <name>.png            generated board (reused unless --regenerate)
    <name>.regions.json   detected regions (reused unless --regenerate)
    <name>.preview.mp4    ink-on-white render (for eyeballing)
    <name>.cues.json      {"fps", "frames", "beats": [{"index", "frame", "end_frame"}], "cost_usd"}
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np
from PIL import Image
from pydantic import BaseModel, Field

from . import engine as engine_module
from .engine import Animator
from .prompts import load_prompt
from .regions import SnippetRegionPlan, build_narration_weighted_plan

PAD_FRAMES = 15  # extra hold so the host never runs past the end of the clip


class SpecBeat(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    visual: str
    label: str = ""
    narration: str = ""


class DoodleSpec(BaseModel):
    fps: int = 30
    frames: int = Field(gt=0)
    aspect: str = "16:9"
    style: str = "syspartner"
    title: str = ""
    layout: str = ""
    max_dim: int = 1600
    beats: List[SpecBeat] = Field(min_length=1)

    @property
    def duration(self) -> float:
        return self.frames / self.fps


def build_prompt(spec: DoodleSpec) -> str:
    lines = []
    for index, beat in enumerate(spec.beats, start=1):
        caption = (f'caption "{beat.label.strip().upper()}"' if beat.label.strip()
                   else "NO caption, no text, no letters next to it")
        lines.append(f"{index}. {beat.visual.strip()} — {caption}")
    wordless = not spec.title.strip() and not any(b.label.strip() for b in spec.beats)
    head = "A whiteboard doodle frame."
    if wordless:
        # Image models love to caption what they draw with the words of the prompt.
        head = ("A WORDLESS whiteboard doodle frame: the picture contains NO TEXT AT ALL — "
                "no words, no letters, no numbers, no labels, no captions, no signs, in any language.")
    elif spec.title.strip():
        head += f' Heading at the top, exactly: "{spec.title.strip().upper()}".'
    else:
        head += " No heading."
    body = f"{head}\nIt contains exactly these {len(spec.beats)} separate elements:\n" + "\n".join(lines)
    if spec.layout.strip():
        body += f"\nLayout: {spec.layout.strip()}"
    style = load_prompt(f"style_{spec.style}").replace("{aspect}", spec.aspect)
    if wordless:
        style += "\nRemember: absolutely no text or lettering anywhere in the image."
    return f"{body}\n{style}"


def generate_assets(spec: DoodleSpec, image_path: Path, regions_path: Path,
                    regenerate: bool) -> tuple[SnippetRegionPlan, float]:
    """Board image + region plan, reusing earlier paid results when present."""
    from .openrouter import openrouter_client
    from .openrouter import settings as ors
    from .openrouter.client import OpenRouterClient
    from .openrouter.steps import detect_region_plan

    client: Optional[OpenRouterClient] = None
    if regenerate or not image_path.exists():
        client = openrouter_client()
        raw = client.image(ors.DEFAULT_IMAGE_MODEL, build_prompt(spec),
                           aspect_ratio=spec.aspect, resolution=ors.IMAGE_RESOLUTION)
        import io
        with Image.open(io.BytesIO(raw)) as image:
            image.convert("RGB").save(image_path, format="PNG")
        print(f"doodle: board generated ({ors.DEFAULT_IMAGE_MODEL})", file=sys.stderr)
        regenerate = True  # a new board needs new regions
    else:
        print(f"doodle: reusing board {image_path.name}", file=sys.stderr)

    if regenerate or not regions_path.exists():
        client = client or openrouter_client()
        narrations = [b.narration or b.visual for b in spec.beats]
        plan = detect_region_plan(
            client, image_path=image_path, transcript_text=" ".join(narrations),
            model=ors.DEFAULT_REGION_MODEL, idea=spec.title or spec.layout, beats=narrations,
        )
        regions_path.write_text(plan.model_dump_json(indent=2), encoding="utf-8")
        print(f"doodle: regions detected ({len(plan.regions)})", file=sys.stderr)
    else:
        plan = SnippetRegionPlan.model_validate_json(regions_path.read_text(encoding="utf-8"))
        print(f"doodle: reusing regions {regions_path.name}", file=sys.stderr)
    return plan, (client.total_cost if client else 0.0)


def render_spec(spec_path: Path, output: Path, assets: Optional[Path], regenerate: bool) -> dict:
    spec = DoodleSpec.model_validate_json(spec_path.read_text(encoding="utf-8"))
    for i, beat in enumerate(spec.beats):
        if beat.end <= beat.start:
            raise ValueError(f"beat {i + 1}: end must be after start")
        if beat.start >= spec.duration:
            raise ValueError(f"beat {i + 1} starts after the clip ends ({spec.duration:.2f}s)")
    assets = assets or output.parent
    assets.mkdir(parents=True, exist_ok=True)
    stem = output.stem
    image_path = assets / f"{stem}.png"
    regions_path = assets / f"{stem}.regions.json"

    plan, cost = generate_assets(spec, image_path, regions_path, regenerate)
    plan.beat_windows = [[round(b.start, 3), round(min(b.end, spec.duration), 3)] for b in spec.beats]

    total = (spec.frames + PAD_FRAMES) / spec.fps
    element_plan = build_narration_weighted_plan(plan, spec.duration)
    engine_module.MAX_DIM = spec.max_dim
    with Image.open(image_path) as image:
        rgba = image.convert("RGBA")
        background = Image.new("RGBA", image.size, "white")
        img_array = np.array(Image.alpha_composite(background, rgba).convert("RGB"))
    preview = assets / f"{stem}.preview.mp4"
    Animator(fade_duration=0.06).render_to_file(
        img_array, spec.duration * 0.7, total, str(preview),
        fps=spec.fps, bitrate="5000k", preset="medium", element_plan=element_plan,
    )
    if output.suffix.lower() == ".webm":
        from .alpha_video import mp4_to_alpha_webm
        mp4_to_alpha_webm(str(preview), str(output))
    else:
        import shutil
        shutil.copyfile(preview, output)

    cues = {
        "fps": spec.fps,
        "frames": spec.frames,
        "beats": [
            {"index": i + 1, "frame": round(b.start * spec.fps), "end_frame": round(b.end * spec.fps)}
            for i, b in enumerate(spec.beats)
        ],
        "cost_usd": round(cost, 5),
    }
    (assets / f"{stem}.cues.json").write_text(json.dumps(cues, indent=2), encoding="utf-8")
    print(f"doodle: wrote {output} ({spec.frames}+{PAD_FRAMES} frames @ {spec.fps} fps), "
          f"cost ${cost:.4f}", file=sys.stderr)
    return cues
