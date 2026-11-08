"""Ink-on-white MP4 -> WebM (VP9) with a real alpha channel.

White becomes transparent; colours are un-mixed from white, so the drawing
composites onto any background (paper, gradients, transitions) without a
white box. Used by --spec so host tools need no CSS blend tricks.
"""
from __future__ import annotations

import json
import subprocess

import numpy as np

NOISE_FLOOR = 10  # alpha below this (near-white compression noise) -> fully transparent


def probe_size(path: str) -> tuple[int, int, str]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of", "json", path],
        check=True, capture_output=True, text=True,
    ).stdout
    stream = json.loads(out)["streams"][0]
    return int(stream["width"]), int(stream["height"]), stream["r_frame_rate"]


def ink_to_alpha(frame: np.ndarray) -> np.ndarray:
    """RGB uint8 (h, w, 3) on white -> RGBA uint8 with white keyed out."""
    rgb = frame.astype(np.int32)  # (255 - c) * 255 overflows int16
    alpha = 255 - rgb.min(axis=2)
    alpha[alpha < NOISE_FLOOR] = 0
    safe = np.maximum(alpha, 1)[..., None]
    colour = 255 - (255 - rgb) * 255 // safe
    out = np.empty(frame.shape[:2] + (4,), dtype=np.uint8)
    out[..., :3] = np.clip(colour, 0, 255)
    out[..., 3] = alpha
    return out


def mp4_to_alpha_webm(src: str, dst: str, *, bitrate: str = "3M") -> None:
    width, height, rate = probe_size(src)
    decode = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
        stdout=subprocess.PIPE,
    )
    encode = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
         "-s", f"{width}x{height}", "-r", rate, "-i", "pipe:0",
         "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", bitrate,
         "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0",
         "-an", dst],
        stdin=subprocess.PIPE,
    )
    frame_bytes = width * height * 3
    try:
        while True:
            chunk = decode.stdout.read(frame_bytes)
            if len(chunk) < frame_bytes:
                break
            frame = np.frombuffer(chunk, dtype=np.uint8).reshape(height, width, 3)
            encode.stdin.write(ink_to_alpha(frame).tobytes())
    finally:
        encode.stdin.close()
        decode.stdout.close()
        decode.wait()
        encode.wait()
    if decode.returncode or encode.returncode:
        raise RuntimeError(f"alpha conversion failed (decode {decode.returncode}, encode {encode.returncode})")
