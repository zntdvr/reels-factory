"""Сисадмин идёт по офису, 5 секунд, 9:16.

Запуск из корня проекта:
  tools/blender/blender -b assets/avatar/sysadmin/sysadmin.blend \
    --python projects/sysadmin-office-walk/office_walk.py -- [--test] [--res 720]

Кадры пишутся в projects/sysadmin-office-walk/frames/, --test рисует только кадры 1, 60, 120.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TEST = '--test' in ARGS
RES = int(ARGS[ARGS.index('--res') + 1]) if '--res' in ARGS else 720

FPS = 24
FRAMES = 120
WALK_LEN = 25          # длина цикла Man_Walk в кадрах
STEP = 0.18            # путь опорной ноги за кадр — с такой скоростью едет корень, чтобы ноги не скользили
M = 2.67               # единиц сцены в метре (рост модели 4.8 ≈ 1.8 м)

INK, MUTED, BG, BG_TOP, ACCENT, ACCENT_LIGHT = '#0B0F14', '#555C69', '#E9EAE7', '#F4F4F2', '#245CFF', '#E3EAFF'


def hexc(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)


def mat(name, col, rough=0.6, emit=0.0):
    m = bpy.data.materials.new(name)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = hexc(col)
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = hexc(col)
        p.inputs['Emission Strength'].default_value = emit
    return m


M_FLOOR = mat('Office_Floor', BG_TOP, 0.35)
M_WALL = mat('Office_Wall', BG, 0.9)
M_INK = mat('Office_Ink', INK, 0.4)
M_MUTED = mat('Office_Muted', MUTED, 0.7)
M_DESK = mat('Office_Desk', BG_TOP, 0.5)
M_SCREEN = mat('Office_Screen', ACCENT, 0.2, emit=2.5)
M_SCREEN2 = mat('Office_Screen2', ACCENT_LIGHT, 0.2, emit=1.5)
M_WINDOW = mat('Office_Window', BG_TOP, 0.1, emit=1.2)
M_LED = mat('Office_Led', ACCENT, 0.2, emit=8.0)

coll = bpy.data.collections.new('Office')
bpy.context.scene.collection.children.link(coll)


def box(name, loc, size, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.data.materials.append(material)
    if bevel:
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 2
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    return o


def cyl(name, loc, r, h, material, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    return o


# --- комната: проход вдоль X, персонаж идёт по y=0
box('Floor', (0, 0, -0.05), (80, 40, 0.1), M_FLOOR)
box('BackWall', (0, 9, 6), (80, 0.3, 12), M_WALL)
for i, x in enumerate(range(-24, 30, 9)):
    box(f'Window.{i}', (x, 8.82, 6.2), (5.2, 0.05, 4.4), M_WINDOW)
    box(f'WindowSill.{i}', (x, 8.7, 3.9), (5.6, 0.4, 0.15), M_WALL)


def desk(x, y, face):
    """Стол с монитором, клавиатурой и стулом. face=+1 — сидящий смотрит в +Y."""
    h = 0.75 * M
    box(f'DeskTop.{x}.{y}', (x, y, h), (1.6 * M, 0.8 * M, 0.08), M_DESK, 0.03)
    for dx in (-0.75 * M, 0.75 * M):
        box(f'DeskLeg.{x}.{y}.{dx}', (x + dx, y, h / 2), (0.08, 0.7 * M, h), M_INK)
    sy = y + face * 0.2 * M
    box(f'MonitorStand.{x}.{y}', (x, sy, h + 0.3), (0.12, 0.12, 0.6), M_INK)
    box(f'Monitor.{x}.{y}', (x, sy, h + 0.95), (1.5, 0.08, 0.95), M_INK, 0.03)
    screen = M_SCREEN if int(x * 7 + y) % 3 else M_SCREEN2
    box(f'Screen.{x}.{y}', (x, sy - face * 0.05, h + 0.97), (1.38, 0.02, 0.83), screen)
    box(f'Keyboard.{x}.{y}', (x, y - face * 0.12 * M, h + 0.06), (0.9, 0.3, 0.04), M_MUTED, 0.01)
    cy = y - face * 0.65 * M
    cyl(f'ChairSeat.{x}.{y}', (x, cy, 1.25), 0.55, 0.15, M_INK)
    box(f'ChairBack.{x}.{y}', (x, cy - face * 0.5, 2.1), (1.0, 0.12, 1.3), M_INK, 0.05)
    cyl(f'ChairPole.{x}.{y}', (x, cy, 0.6), 0.06, 1.1, M_MUTED)


# ряд столов за проходом (мониторы к камере) и пара на переднем плане
for x in (-16, -10, -4, 2, 8):
    desk(x, 4.6, +1)

# серверная стойка с мигающими огнями в конце прохода
rack_x = 14
box('Rack', (rack_x, 5.0, 2.7), (1.6, 1.6, 5.4), M_INK, 0.04)
for i in range(10):
    z = 1.0 + i * 0.42
    box(f'RackUnit.{i}', (rack_x, 4.18, z), (1.3, 0.04, 0.3), M_MUTED)
    led = box(f'RackLed.{i}', (rack_x + 0.45, 4.15, z), (0.08, 0.03, 0.08), M_LED)
    # мигание детерминировано от номера кадра: каждый огонёк со своим периодом
    period = 6 + (i * 5) % 11
    for f in range(1, FRAMES + 1, 1):
        on = ((f + i * 3) // period) % 2 == 0
        led.hide_render = not on
        led.keyframe_insert('hide_render', frame=f)


# --- персонаж: цикл ходьбы на NLA, корень едет вдоль +X
arm = bpy.data.objects['Sysadmin_Rig']
arm.animation_data.action = None
track = arm.animation_data.nla_tracks.new()
strip = track.strips.new('walk', 1, bpy.data.actions['Man_Walk'])
strip.action_frame_start, strip.action_frame_end = 0, WALK_LEN
strip.repeat = FRAMES / WALK_LEN + 0.2
arm.rotation_euler = (0, 0, math.pi / 2)   # лицо модели смотрит в −Y, после поворота — в +X
x0 = -10.0
for f in (1, FRAMES):
    arm.location = (x0 + STEP * (f - 1), 0, 0)
    arm.keyframe_insert('location', frame=f)


def linearize(action):
    # в Blender 5 кривые лежат в слоях/слотах
    try:
        curves = action.fcurves
    except AttributeError:
        curves = [fc for layer in action.layers for st in layer.strips for cb in st.channelbags for fc in cb.fcurves]
    for fc in curves:
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'


linearize(arm.animation_data.action)

# --- камера ведёт персонажа сбоку-спереди, чуть отставая
sc = bpy.context.scene
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 30
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 4.0
for f in range(1, FRAMES + 1, 10 if not TEST else 1):
    t = (f - 1) / (FRAMES - 1)
    hx = x0 + STEP * (f - 1)
    loc = Vector((hx + 3.0 - 1.2 * t, -8.5, 3.4))
    tgt = Vector((hx + 0.6, 0, 2.7))
    cam.location = loc
    cam.rotation_euler = (tgt - loc).to_track_quat('-Z', 'Y').to_euler()
    cam.data.dof.focus_distance = (tgt - loc).length
    cam.keyframe_insert('location', frame=f)
    cam.keyframe_insert('rotation_euler', frame=f)
    cam.data.keyframe_insert('dof.focus_distance', frame=f)

# --- свет
world = sc.world or bpy.data.worlds.new('World')
sc.world = world
bgn = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bgn.inputs['Color'].default_value = hexc(BG)
bgn.inputs['Strength'].default_value = 0.35
sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
sun.data.energy = 2.0
sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(50), 0, math.radians(200))
sc.collection.objects.link(sun)
for i, x in enumerate(range(-20, 30, 10)):
    lamp = bpy.data.objects.new(f'Ceiling.{i}', bpy.data.lights.new(f'Ceiling.{i}', 'AREA'))
    lamp.data.energy = 250
    lamp.data.size = 4
    lamp.location = (x, 0, 11)
    sc.collection.objects.link(lamp)

# --- рендер
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 12
sc.cycles.adaptive_threshold = 0.05
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 3
sc.cycles.diffuse_bounces = 2
sc.cycles.glossy_bounces = 1
sc.cycles.transparent_max_bounces = 4
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.view_settings.exposure = -0.3
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, FRAMES
sc.render.resolution_x, sc.render.resolution_y = RES, RES * 16 // 9
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = os.path.join(HERE, 'frames', 'f_####')
sc.render.use_persistent_data = True

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'office_walk.blend'), copy=True)

if TEST:
    for f in (1, 60, 120):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(HERE, f'test_{f:03d}')
        bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
