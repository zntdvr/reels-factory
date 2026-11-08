"""Offline end-to-end check of the OpenRouter backend against a fake server.

    .venv/bin/python tests/test_openrouter_offline.py

No key or network needed: every OpenRouter endpoint is answered by
httpx.MockTransport, so this validates request shapes, response parsing,
mp3 -> PCM decoding, beat timing and the final render.
"""
from __future__ import annotations

import base64
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import httpx
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from animator.gemini.pipeline import StoryboardOptions  # noqa: E402
from animator.openrouter.client import OpenRouterClient  # noqa: E402
from animator.openrouter.pipeline import run_storyboard  # noqa: E402

STORYBOARD = {
    "title": "Почему падает Wi-Fi",
    "scenes": [{
        "title": "Офисная сеть",
        "layout": "роутер слева, ноутбук справа, стрелка между ними",
        "beats": [
            {"label": "РОУТЕР", "visual": "router", "narration": "Всё начинается с роутера."},
            {"label": "НОУТБУК", "visual": "laptop", "narration": "Ноутбук ловит сигнал."},
        ],
    }],
}
REGIONS = {"regions": [
    {"label": "router", "role": "main_concept", "object": "router", "reveal_order": 1,
     "box": {"ymin": 300, "xmin": 100, "ymax": 700, "xmax": 400}, "reveal": "stroke", "beat": 1},
    {"label": "laptop", "role": "main_concept", "object": "laptop", "reveal_order": 2,
     "box": {"ymin": 300, "xmin": 600, "ymax": 700, "xmax": 900}, "reveal": "stroke", "beat": 2},
]}


def fake_png() -> bytes:
    image = Image.new("RGB", (1024, 576), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((110, 180, 400, 400), outline="black", width=8)
    draw.rectangle((620, 180, 920, 400), outline=(30, 90, 200), width=8)
    out = io.BytesIO()
    image.save(out, format="JPEG")  # deliberately JPEG: backend must convert
    return out.getvalue()


def fake_pcm() -> bytes:
    # tone 1.2s, silence 0.5s, tone 1.2s -> two beats; raw s16le 24 kHz like Gemini TTS
    expr = r"if(lt(t\,1.2)\,sin(2*PI*440*t)\,if(lt(t\,1.7)\,0\,sin(2*PI*660*t)))*0.5"
    return subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"aevalsrc={expr}:s=24000:d=2.9",
         "-f", "s16le", "-ac", "1", "pipe:1"], capture_output=True, check=True).stdout


def chat(content):
    return {"choices": [{"message": {"content": content}}], "usage": {"cost": 0.001}}


SEEN: list[str] = []


def handler(request: httpx.Request) -> httpx.Response:
    assert request.headers["authorization"] == "Bearer test-key"
    if request.method == "GET" and request.url.path.endswith("/generation"):
        SEEN.append(f"/generation {request.url.params['id']}")
        return httpx.Response(200, json={"data": {"total_cost": 0.002}})
    body = json.loads(request.content)
    SEEN.append(f"{request.url.path} {body.get('model')}")
    if request.url.path.endswith("/chat/completions"):
        assert body["response_format"]["type"] == "json_schema"
        assert "$ref" not in json.dumps(body["response_format"]), "schema refs must be inlined"
        name = body["response_format"]["json_schema"]["name"]
        if name == "storyboard":
            return httpx.Response(200, json=chat("```json\n" + json.dumps(STORYBOARD, ensure_ascii=False) + "\n```"))
        assert body["messages"][0]["content"][0]["image_url"]["url"].startswith("data:image/png;base64,")
        return httpx.Response(200, json=chat(json.dumps(REGIONS)))
    if request.url.path.endswith("/images"):
        assert body["aspect_ratio"] == "16:9"
        return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(fake_png()).decode()}],
                                         "usage": {"cost": 0.04}})
    if request.url.path.endswith("/audio/speech"):
        assert body["response_format"] == "pcm" and body["voice"]
        return httpx.Response(200, content=fake_pcm(), headers={
            "content-type": "audio/pcm;rate=24000;channels=1", "x-generation-id": "gen-tts-test"})
    return httpx.Response(404, json={"error": "unexpected"})


def main() -> None:
    client = OpenRouterClient("test-key")
    client._http = httpx.Client(base_url="https://openrouter.ai/api/v1",
                                headers=client._http.headers, transport=httpx.MockTransport(handler))
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "test.mp4"
        opts = StoryboardOptions(idea="тест", output=out, quality="low",
                                 text_model="anthropic/claude-sonnet-5.5",
                                 region_model="google/gemini-3.8-flash",
                                 image_model="google/gemini-3.1-flash-image",
                                 tts_model="google/gemini-3.8-flash-tts", voice="Charon",
                                 save_assets=True)
        durations = run_storyboard(client, opts)
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "stream=codec_type,width,height:format=duration", "-of", "compact", str(out)],
                               capture_output=True, text=True, check=True).stdout
        plan = json.loads((Path(tmp) / "test.storyboard" / "scene_00.regions.json").read_text())
        print("requests:", *SEEN, sep="\n  ")
        print("durations:", durations)
        print("beat_windows:", plan["beat_windows"])
        print(probe.strip())
        assert "codec_type=audio" in probe and "codec_type=video" in probe
        assert abs(client.total_cost - 0.044) < 1e-9, client.total_cost
    print("OK")


if __name__ == "__main__":
    main()
