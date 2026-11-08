"""Run an authored Blender scene and render transparent numbered PNG frames."""
import os
import runpy
import sys
from pathlib import Path

import bpy


def arguments():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    values = {}
    index = 0
    while index < len(args):
        key = args[index]
        if not key.startswith("--") or index + 1 >= len(args):
            raise ValueError(f"Expected --option value, got {key}")
        values[key[2:]] = args[index + 1]
        index += 2
    return values


opts = arguments()
scene_path = Path(opts["scene"]).resolve()
output_dir = Path(opts["output"]).resolve()
frames = int(opts["frames"])
fps = int(opts["fps"])
width = int(opts["width"])
height = int(opts["height"])
engine = opts.get("engine", "CYCLES")
samples = int(opts.get("samples", 16))
if not scene_path.is_file() or frames < 1 or fps < 1:
    raise ValueError("Scene file, positive frame count and positive fps are required")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
params = {"frames": frames, "fps": fps, "width": width, "height": height,
          "engine": engine, "samples": samples}
namespace = runpy.run_path(str(scene_path))
builder = namespace.get("build_scene")
if not callable(builder):
    raise ValueError(f"{scene_path} must define build_scene(bpy, scene, params)")
builder(bpy, scene, params)
if scene.camera is None:
    raise ValueError("build_scene must set scene.camera")

scene.frame_start = 1
scene.frame_end = frames
scene.render.fps = fps
scene.render.resolution_x = width
scene.render.resolution_y = height
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.filepath = str(output_dir / "frame_")
try:
    scene.render.engine = engine
except TypeError as error:
    raise RuntimeError(f"Render engine {engine!r} is unavailable") from error
if engine == "CYCLES":
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
scene.render.image_settings.compression = 15
scene.view_settings.view_transform = "Standard"
scene.render.use_file_extension = True

output_dir.mkdir(parents=True, exist_ok=True)
for old_frame in output_dir.glob("frame_*.png"):
    old_frame.unlink()

bpy.ops.render.render(animation=True)
expected = output_dir / "frame_0001.png"
if not expected.exists():
    raise RuntimeError(f"Blender did not create expected frame: {expected}")
print(f"Rendered {frames} RGBA frames to {output_dir}")
