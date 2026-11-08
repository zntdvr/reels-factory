"""Собирает аватар системного администратора из модели Quaternius.

Запуск из корня проекта:
  tools/blender/blender -b assets/avatar/sysadmin/Male_LongSleeve_Quaternius.blend \
    --python assets/avatar/sysadmin/make_sysadmin.py [-- --preview]

Результат: assets/avatar/sysadmin/sysadmin.blend (+ preview_*.png с --preview).
Аксессуары привязаны к костям Head и Torso, поэтому едут вместе со всеми анимациями.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
PREVIEW = '--preview' in sys.argv

# Цвета из style/tokens.ts
INK = '#0B0F14'
MUTED = '#555C69'
BG = '#E9EAE7'
BG_TOP = '#F4F4F2'
ACCENT = '#245CFF'
ACCENT_LIGHT = '#E3EAFF'


def hexc(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)


def recolor(mat, col, rough=0.6):
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            n.inputs['Base Color'].default_value = col
            n.inputs['Roughness'].default_value = rough
        elif n.type == 'BSDF_DIFFUSE':
            n.inputs['Color'].default_value = col
    mat.diffuse_color = col


def newmat(name, col, rough=0.5, metal=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = col
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Alpha'].default_value = alpha
    m.diffuse_color = col
    return m


arm = bpy.data.objects['HumanArmature']
arm.name = 'Sysadmin_Rig'
body = bpy.data.objects['BaseHuman']
body.name = 'Sysadmin_Body'

mats = bpy.data.materials
recolor(mats['Shirt'], hexc(INK), 0.8)
recolor(mats['Pants'], hexc(MUTED), 0.8)
recolor(mats['Shoes'], hexc(INK), 0.5)
recolor(mats['Socks'], hexc(BG), 0.8)

M_FRAME = newmat('SA_Frame', hexc(INK), 0.3, 0.2)
M_ACC = newmat('SA_Accent', hexc(ACCENT), 0.35)
M_LENS = newmat('SA_Lens', hexc(ACCENT_LIGHT), 0.0, alpha=0.12)
M_WHITE = newmat('SA_White', hexc(BG_TOP), 0.6)
M_CUSHION = newmat('SA_Cushion', hexc(MUTED), 0.9)

coll = bpy.data.collections.new('Sysadmin_Props')
bpy.context.scene.collection.children.link(coll)

# Координаты взяты из позы покоя модели: лицо смотрит в −Y,
# глаза на z≈4.47, лицо спереди y≈−0.24, уши x≈±0.27.
arm.data.pose_position = 'REST'
bpy.context.view_layer.update()

parts = []


def fin(o, mat, name, bone='Head'):
    o.name = name
    o.data.name = name
    o.data.materials.clear()
    o.data.materials.append(mat)
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    if o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = True
    parts.append((bone, o))
    return o


mesh = bpy.ops.mesh
side = {1: 'L', -1: 'R'}

# --- очки
for s in (1, -1):
    mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.011, major_segments=40, minor_segments=10,
                             location=(s * 0.105, -0.262, 4.47), rotation=(math.pi / 2, 0, 0))
    fin(bpy.context.object, M_FRAME, f'SA_GlassesRim.{side[s]}').scale = (1.12, 0.85, 1)
    mesh.primitive_cylinder_add(radius=0.075, depth=0.004, vertices=40,
                                location=(s * 0.105, -0.262, 4.47), rotation=(math.pi / 2, 0, 0))
    fin(bpy.context.object, M_LENS, f'SA_GlassesLens.{side[s]}').scale = (1.12, 0.85, 1)
    mesh.primitive_cylinder_add(radius=0.009, depth=0.42, vertices=8,
                                location=(s * 0.275, -0.06, 4.49), rotation=(math.pi / 2, 0, 0))
    fin(bpy.context.object, M_FRAME, f'SA_GlassesTemple.{side[s]}')
mesh.primitive_cylinder_add(radius=0.009, depth=0.05, vertices=8,
                            location=(0, -0.265, 4.48), rotation=(0, math.pi / 2, 0))
fin(bpy.context.object, M_FRAME, 'SA_GlassesBridge')

# --- гарнитура: дуга над головой
mesh.primitive_torus_add(major_radius=0.31, minor_radius=0.022, major_segments=48, minor_segments=10,
                         location=(0, 0.07, 4.47), rotation=(math.pi / 2, 0, 0))
band = fin(bpy.context.object, M_FRAME, 'SA_HeadsetBand')
bm = bmesh.new()
bm.from_mesh(band.data)
# после поворота локальная −Y тора смотрит вниз мира: срезаем нижнюю половину кольца
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.02], context='VERTS')
bm.to_mesh(band.data)
bm.free()
band.scale = (1, 1.25, 1)

for s in (1, -1):
    mesh.primitive_cylinder_add(radius=0.1, depth=0.06, vertices=32,
                                location=(s * 0.31, 0.07, 4.45), rotation=(0, math.pi / 2, 0))
    fin(bpy.context.object, M_FRAME, f'SA_EarCup.{side[s]}')
    mesh.primitive_cylinder_add(radius=0.065, depth=0.012, vertices=32,
                                location=(s * 0.342, 0.07, 4.45), rotation=(0, math.pi / 2, 0))
    fin(bpy.context.object, M_ACC, f'SA_EarCupAccent.{side[s]}')
    mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.02,
                             location=(s * 0.278, 0.07, 4.45), rotation=(0, math.pi / 2, 0))
    fin(bpy.context.object, M_CUSHION, f'SA_EarCushion.{side[s]}')

# микрофон: штанга от левой чашки к губам
cd = bpy.data.curves.new('SA_MicBoom', 'CURVE')
cd.dimensions = '3D'
cd.bevel_depth = 0.01
cd.bevel_resolution = 3
sp = cd.splines.new('BEZIER')
sp.bezier_points.add(1)
p0, p1 = sp.bezier_points
p0.co, p0.handle_left, p0.handle_right = (0.33, 0.0, 4.42), (0.33, 0.1, 4.44), (0.33, -0.15, 4.36)
p1.co, p1.handle_left, p1.handle_right = (0.09, -0.29, 4.30), (0.24, -0.29, 4.29), (0.0, -0.29, 4.30)
fin(bpy.data.objects.new('SA_MicBoom', cd), M_FRAME, 'SA_MicBoom')
mesh.primitive_uv_sphere_add(radius=0.03, location=(0.08, -0.29, 4.30), segments=16, ring_count=8)
fin(bpy.context.object, M_ACC, 'SA_MicTip')

# --- бейдж на шнурке
mesh.primitive_cube_add(size=1, location=(0.17, -0.245, 3.38))
badge = fin(bpy.context.object, M_WHITE, 'SA_Badge', 'Torso')
badge.scale = (0.16, 0.012, 0.22)
bev = badge.modifiers.new('Bevel', 'BEVEL')
bev.width = 0.02
bev.segments = 3
mesh.primitive_cube_add(size=1, location=(0.17, -0.253, 3.44))
fin(bpy.context.object, M_ACC, 'SA_BadgeStripe', 'Torso').scale = (0.16, 0.004, 0.06)
mesh.primitive_cube_add(size=1, location=(0.17, -0.253, 3.33))
fin(bpy.context.object, M_FRAME, 'SA_BadgeText', 'Torso').scale = (0.1, 0.004, 0.025)
cd = bpy.data.curves.new('SA_Lanyard', 'CURVE')
cd.dimensions = '3D'
cd.bevel_depth = 0.008
sp = cd.splines.new('POLY')
sp.points.add(2)
for pt, co in zip(sp.points, [(-0.2, -0.18, 3.98), (0.17, -0.25, 3.5), (0.2, -0.17, 3.98)]):
    pt.co = (*co, 1)
fin(bpy.data.objects.new('SA_Lanyard', cd), M_ACC, 'SA_Lanyard', 'Torso')

# --- привязка к костям в позе покоя
bpy.context.view_layer.update()
for bone, o in parts:
    mw = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = 'BONE'
    o.parent_bone = bone
    bpy.context.view_layer.update()
    o.matrix_world = mw
arm.data.pose_position = 'POSE'

# Анимации не должны пропасть при сохранении, даже если ни к чему не подключены
for a in bpy.data.actions:
    a.use_fake_user = True

out = os.path.join(HERE, 'sysadmin.blend')
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print('saved', out, len(parts), 'props')

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 32
    sc.render.resolution_x, sc.render.resolution_y = 540, 960
    sc.render.resolution_percentage = 100
    world = sc.world or bpy.data.worlds.new('World')
    sc.world = world
    world.use_nodes = True
    bgn = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bgn.inputs['Color'].default_value = hexc(BG)
    bgn.inputs['Strength'].default_value = 1.0
    for ld, e in (((3, -4, 6), 3.5), ((-4, -2, 5), 1.5), ((0, 4, 6), 2.5)):
        light = bpy.data.objects.new('PREV_Sun', bpy.data.lights.new('PREV_Sun', 'SUN'))
        light.data.energy = e
        sc.collection.objects.link(light)
        light.rotation_euler = (-Vector(ld)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.objects.new('PREV_Cam', bpy.data.cameras.new('PREV_Cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam

    def shot(loc, tgt, lens, name, frame=0, action=None):
        if action:
            arm.animation_data.action = bpy.data.actions[action]
        sc.frame_set(frame)
        cam.data.lens = lens
        cam.location = loc
        cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(HERE, f'preview_{name}.png')
        bpy.ops.render.render(write_still=True)

    shot((2.2, -9.0, 3.4), (0, 0, 2.5), 50, 'body', 0, 'Man_Idle')
    shot((0.9, -3.0, 4.6), (0, 0, 4.35), 85, 'head', 0, 'Man_Idle')
    shot((-2.6, -8.0, 3.4), (0, 0, 2.5), 50, 'walk', 8, 'Man_Walk')
