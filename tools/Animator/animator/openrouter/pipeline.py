"""--prompt orchestrator for the OpenRouter backend (mirrors gemini/pipeline.py)."""
from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path
from typing import List

from ..gemini.pipeline import StoryboardOptions
from ..gemini.schemas import StoryboardScene
from ..render import Scene, render_video
from .client import OpenRouterClient
from .steps import detect_region_plan, generate_beat_narration, generate_scene_image, generate_storyboard


async def build_scene(client: OpenRouterClient, options: StoryboardOptions, asset_dir: Path,
                      index: int, scene: StoryboardScene) -> Scene:
    beats = [beat.narration for beat in scene.beats]
    image_bytes, (audio_bytes, beat_windows) = await asyncio.gather(
        asyncio.to_thread(generate_scene_image, client, scene, model=options.image_model),
        asyncio.to_thread(generate_beat_narration, client, beats,
                          model=options.tts_model, voice=options.voice),
    )
    image_path = asset_dir / f"scene_{index:02d}.png"
    image_path.write_bytes(image_bytes)
    audio_path = asset_dir / f"scene_{index:02d}.wav"
    audio_path.write_bytes(audio_bytes)

    region_plan = await asyncio.to_thread(
        detect_region_plan, client, image_path=image_path, transcript_text=scene.narration,
        idea=scene.title, model=options.region_model, beats=beats,
    )
    region_plan.beat_windows = beat_windows
    if options.save_assets:
        (asset_dir / f"scene_{index:02d}.regions.json").write_text(region_plan.model_dump_json(indent=2))
    print(f"  scene {index + 1} ready: {scene.title}", file=sys.stderr)
    return Scene(image=str(image_path), audio=str(audio_path), region_plan=region_plan)


async def render_storyboard(client: OpenRouterClient, options: StoryboardOptions,
                            asset_dir: Path) -> List[float]:
    print(f"generating storyboard for: {options.idea!r} (openrouter: {options.text_model})", file=sys.stderr)
    plan = await asyncio.to_thread(generate_storyboard, client, options.idea,
                                   model=options.text_model, num_scenes=options.num_scenes)
    print(f"storyboard: {len(plan.scenes)} scene(s)", file=sys.stderr)
    if options.save_assets:
        (asset_dir / "storyboard.json").write_text(plan.model_dump_json(indent=2))
    scenes = await asyncio.gather(
        *(build_scene(client, options, asset_dir, i, s) for i, s in enumerate(plan.scenes))
    )
    return render_video(scenes, str(options.output), quality=options.quality)


def run_storyboard(client: OpenRouterClient, options: StoryboardOptions) -> List[float]:
    try:
        if options.save_assets:
            asset_dir = options.output.parent / f"{options.output.stem}.storyboard"
            asset_dir.mkdir(parents=True, exist_ok=True)
            return asyncio.run(render_storyboard(client, options, asset_dir))
        with tempfile.TemporaryDirectory() as temp_dir:
            return asyncio.run(render_storyboard(client, options, Path(temp_dir)))
    finally:
        try:
            client.settle_costs()
        except Exception as exc:  # cost reporting must never fail the render
            print(f"openrouter: could not fetch TTS cost: {exc}", file=sys.stderr)
        if client.total_cost:
            print(f"openrouter cost: ${client.total_cost:.4f} (of it TTS ${client.tts_cost:.4f})",
                  file=sys.stderr)
