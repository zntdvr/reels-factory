#!/usr/bin/env python3
"""Build a self-contained, editable GLB character with three animation clips.

Only Python's standard library is required. Run: python3 build.py
"""
import json
import math
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
doc = {"asset": {"version": "2.0", "generator": "Reelfactory sysadmin avatar"},
       "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [],
       "materials": [], "buffers": [], "bufferViews": [], "accessors": [], "animations": []}
blob = bytearray()


def accessor(values, components, kind="float", target=None):
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    if kind == "float":
        fmt, comp = "f", 5126
    else:
        fmt, comp = "H", 5123
    flat = [v for row in values for v in (row if isinstance(row, (list, tuple)) else [row])]
    blob.extend(struct.pack("<" + fmt * len(flat), *flat))
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(blob) - offset}
    if target:
        view["target"] = target
    vi = len(doc["bufferViews"])
    doc["bufferViews"].append(view)
    a = {"bufferView": vi, "componentType": comp, "count": len(values),
         "type": {1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4"}[components]}
    if values and kind == "float" and components in (1, 3):
        a["min"] = ([min(values)] if components == 1 else
                    [min(v[i] for v in values) for i in range(3)])
        a["max"] = ([max(values)] if components == 1 else
                    [max(v[i] for v in values) for i in range(3)])
    ai = len(doc["accessors"])
    doc["accessors"].append(a)
    return ai


def material(name, color, metallic=0, roughness=.78):
    rgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    i = len(doc["materials"])
    doc["materials"].append({"name": name, "pbrMetallicRoughness": {
        "baseColorFactor": rgb + [1], "metallicFactor": metallic,
        "roughnessFactor": roughness}, "doubleSided": True})
    return i


navy = material("01 charcoal jacket", "#202734")
navy_dark = material("02 jacket shadow", "#111827")
blue = material("03 signal blue", "#245CFF", .08, .43)
shirt = material("04 warm white shirt", "#F2F0EA")
skin = material("05 warm skin", "#C98F70")
skin_shadow = material("06 nose and ear", "#AA6D53")
hair = material("07 dark hair", "#252127")
frame = material("08 glasses and headset", "#171B24", .12, .32)
lens = material("09 glasses lens", "#BAC7D1", .02, .24)
eye = material("10 eyes", "#1B1B20")
silver = material("11 brushed metal", "#8F9AA8", .62, .31)
sole = material("12 shoes", "#151A22")


def make_mesh(name, vertices, normals, indices, mat):
    pos = accessor(vertices, 3, target=34962)
    nor = accessor(normals, 3, target=34962)
    ind = accessor(indices, 1, "ushort", target=34963)
    i = len(doc["meshes"])
    doc["meshes"].append({"name": name, "primitives": [{"attributes":
        {"POSITION": pos, "NORMAL": nor}, "indices": ind, "material": mat}]})
    return i


def cube(mat):
    v, n, ix = [], [], []
    faces = [((0, 0, 1), [(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),
             ((0, 0,-1), [(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)]),
             ((1, 0, 0), [(1,-1,1),(1,-1,-1),(1,1,-1),(1,1,1)]),
             ((-1,0, 0), [(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1)]),
             ((0, 1, 0), [(-1,1,1),(1,1,1),(1,1,-1),(-1,1,-1)]),
             ((0,-1, 0), [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)])]
    for normal, points in faces:
        base = len(v)
        v += [tuple(q/2 for q in p) for p in points]
        n += [normal]*4
        ix += [base,base+1,base+2,base,base+2,base+3]
    return make_mesh("Box", v, n, ix, mat)


def sphere(mat, rings=10, sides=16):
    v, n, ix = [], [], []
    for j in range(rings+1):
        phi = math.pi*j/rings
        for k in range(sides+1):
            theta = 2*math.pi*k/sides
            p = (math.sin(phi)*math.cos(theta), math.cos(phi),
                 math.sin(phi)*math.sin(theta))
            v.append(tuple(.5*x for x in p)); n.append(p)
    for j in range(rings):
        for k in range(sides):
            a = j*(sides+1)+k; b = a+sides+1
            ix += [a,a+1,b,b,a+1,b+1]
    return make_mesh("Round", v, n, ix, mat)


def cylinder(mat, sides=16):
    v, n, ix = [], [], []
    for j, y in enumerate((-.5,.5)):
        for k in range(sides):
            a = 2*math.pi*k/sides
            v.append((.5*math.cos(a),y,.5*math.sin(a)))
            n.append((math.cos(a),0,math.sin(a)))
    for k in range(sides):
        q=(k+1)%sides; ix += [k,sides+k,q,q,sides+k,sides+q]
    for y, ny in ((-.5,-1),(.5,1)):
        base=len(v); v.append((0,y,0)); n.append((0,ny,0))
        for k in range(sides):
            a=2*math.pi*k/sides
            v.append((.5*math.cos(a),y,.5*math.sin(a))); n.append((0,ny,0))
        for k in range(sides):
            q=(k+1)%sides
            ix += ([base,base+1+k,base+1+q] if ny < 0 else
                   [base,base+1+q,base+1+k])
    return make_mesh("Cylinder",v,n,ix,mat)


mesh = {}
for m in range(len(doc["materials"])):
    mesh[m] = {"box":cube(m), "round":sphere(m), "cylinder":cylinder(m)}


def node(name, parent=None, pos=(0,0,0), scale=None, shape=None, mat=None, rot=None):
    i=len(doc["nodes"])
    item={"name":name,"translation":list(pos)}
    if scale: item["scale"]=list(scale)
    if shape: item["mesh"]=mesh[mat][shape]
    if rot: item["rotation"]=list(rot)
    doc["nodes"].append(item)
    if parent is None: doc["scenes"][0]["nodes"].append(i)
    else: doc["nodes"][parent].setdefault("children",[]).append(i)
    return i


def part(name,parent,shape,mat,pos,scale,rot=None):
    return node(name,parent,pos,scale,shape,mat,rot)


def qaxis(axis, angle):
    s=math.sin(angle/2)
    return [axis[0]*s,axis[1]*s,axis[2]*s,math.cos(angle/2)]


def rod(name,parent,mat,start,end,diameter):
    d=[end[i]-start[i] for i in range(3)]
    length=math.sqrt(sum(x*x for x in d))
    u=[x/length for x in d]
    # Quaternion rotating local +Y onto the segment direction.
    cross=[u[2],0,-u[0]]
    w=1+u[1]
    norm=math.sqrt(sum(x*x for x in cross)+w*w)
    quat=[x/norm for x in cross]+[w/norm] if norm>1e-7 else qaxis((1,0,0),math.pi)
    mid=tuple((start[i]+end[i])/2 for i in range(3))
    return part(name,parent,"cylinder",mat,mid,(diameter,length,diameter),quat)


root=node("ROOT | move whole avatar")
hips=node("Hips | sway",root,(0,1.05,0))
part("Trousers",hips,"round",navy_dark,(0,-.09,0),(.69,.42,.40))
torso=node("Torso | lean",hips,(0,.11,0))
part("Jacket body",torso,"round",navy,(0,.31,0),(.88,1.03,.50))
part("Shirt panel",torso,"round",shirt,(0,.36,.247),(.48,.81,.065))
rod("Blue zipper",torso,blue,(0,.04,.286),(0,.72,.286),.022)
part("Jacket hem",torso,"box",navy_dark,(0,-.11,.01),(.72,.10,.49))
part("Collar left",torso,"round",navy_dark,(-.17,.73,.13),(.28,.21,.23))
part("Collar right",torso,"round",navy_dark,(.17,.73,.13),(.28,.21,.23))
part("ID card",torso,"box",shirt,(.30,.38,.286),(.16,.22,.028))
part("ID blue strip",torso,"box",blue,(.30,.45,.306),(.16,.045,.01))
part("ID portrait",torso,"box",silver,(.27,.36,.307),(.045,.06,.012))
head=node("Head | nod",torso,(0,.86,0))
part("Neck",head,"cylinder",skin,(0,.035,0),(.22,.22,.20))
part("Face",head,"round",skin,(0,.31,0),(.55,.68,.49))
part("Ear L",head,"round",skin_shadow,(-.285,.29,0),(.12,.19,.14))
part("Ear R",head,"round",skin_shadow,(.285,.29,0),(.12,.19,.14))
part("Hair cap",head,"round",hair,(0,.60,-.02),(.58,.31,.49))
part("Hair sweep",head,"round",hair,(-.09,.60,.20),(.39,.17,.25))
part("Nose",head,"round",skin_shadow,(0,.27,.255),(.09,.13,.11))
rod("Smile",head,skin_shadow,(-.09,.105,.238),(.09,.105,.238),.012)
for side,label in ((-1,"L"),(1,"R")):
    x=side*.13
    part("Eye "+label,head,"round",eye,(x,.35,.251),(.038,.047,.024))
    part("Glasses rim "+label,head,"round",frame,(x,.36,.247),(.215,.175,.035))
    part("Lens "+label,head,"round",lens,(x,.36,.268),(.174,.132,.014))
    part("Pupil "+label,head,"round",eye,(x,.35,.278),(.028,.035,.012))
    rod("Glasses temple "+label,head,frame,(side*.22,.38,.23),(side*.29,.38,.04),.019)
rod("Glasses bridge",head,frame,(-.027,.38,.27),(.027,.38,.27),.020)
# Headset, boom microphone, and one blue status light.
rod("Headset arch L",head,frame,(-.30,.30,-.01),(-.25,.68,-.01),.045)
rod("Headset arch top",head,frame,(-.25,.68,-.01),(.25,.68,-.01),.045)
rod("Headset arch R",head,frame,(.25,.68,-.01),(.30,.30,-.01),.045)
part("Ear cup",head,"round",frame,(.31,.29,.005),(.10,.23,.19))
part("Ear cup blue button",head,"round",blue,(.367,.29,.005),(.016,.062,.062))
rod("Microphone arm",head,silver,(.31,.24,.04),(.19,.11,.31),.019)
part("Microphone capsule",head,"round",frame,(.19,.11,.31),(.075,.045,.045))

arms={}
for side,label in ((-1,"L"),(1,"R")):
    upper=node("Upper arm "+label+" | rotate",torso,(side*.46,.61,0))
    part("Sleeve "+label,upper,"round",navy,(side*.035,-.25,0),(.29,.56,.29))
    part("Elbow seam "+label,upper,"round",navy_dark,(0,-.51,0),(.23,.10,.23))
    fore=node("Forearm "+label+" | rotate",upper,(0,-.52,0))
    part("Forearm sleeve "+label,fore,"round",navy,(0,-.20,0),(.23,.42,.24))
    part("Hand "+label,fore,"round",skin,(0,-.45,0),(.16,.20,.13))
    arms[label]=(upper,fore)

legs={}
for side,label in ((-1,"L"),(1,"R")):
    leg=node("Leg "+label+" | rotate",hips,(side*.19,-.16,0))
    part("Trouser leg "+label,leg,"round",navy_dark,(0,-.37,0),(.29,.83,.31))
    shoe=node("Foot "+label+" | rotate",leg,(0,-.78,0))
    part("Shoe "+label,shoe,"round",sole,(0,-.10,.12),(.30,.18,.49))
    part("Sole line "+label,shoe,"box",silver,(0,-.185,.12),(.29,.025,.47))
    legs[label]=(leg,shoe)


def clip(name, tracks):
    anim={"name":name,"samplers":[],"channels":[]}
    for target,path,keys in tracks:
        times=[t for t,_ in keys]; values=[v for _,v in keys]
        ti=accessor(times,1); vi=accessor(values,len(values[0]))
        si=len(anim["samplers"])
        anim["samplers"].append({"input":ti,"output":vi,"interpolation":"LINEAR"})
        anim["channels"].append({"sampler":si,"target":{"node":target,"path":path}})
    doc["animations"].append(anim)


def rotations(node_id,axis,angles):
    return (node_id,"rotation",[(t,qaxis(axis,a)) for t,a in angles])


clip("01 Idle | 4s loop", [
    (root,"translation",[(0,[0,0,0]),(1,[0,.016,0]),(2,[0,0,0]),(3,[0,.013,0]),(4,[0,0,0])]),
    rotations(head,(0,0,1),[(0,0),(1,.045),(2,0),(3,-.035),(4,0)]),
    rotations(torso,(0,0,1),[(0,0),(2,.022),(4,0)]),
    rotations(arms["L"][0],(0,0,1),[(0,-.08),(2,-.13),(4,-.08)]),
    rotations(arms["R"][0],(0,0,1),[(0,.08),(2,.13),(4,.08)]),
])
clip("02 Wave | 2.4s", [
    rotations(arms["R"][0],(0,0,1),[(0,.08),(.4,2.25),(.8,2.25),(1.2,2.40),(1.6,2.25),(2,2.40),(2.4,.08)]),
    rotations(arms["R"][1],(0,0,1),[(0,0),(.4,.3),(.8,.3),(1.2,-.22),(1.6,.3),(2,-.22),(2.4,0)]),
    rotations(head,(0,0,1),[(0,0),(.7,-.07),(1.7,-.07),(2.4,0)]),
])
clip("03 Typing | 2s loop", [
    rotations(arms["L"][0],(1,0,0),[(0,-.7),(2,-.7)]),
    rotations(arms["R"][0],(1,0,0),[(0,-.7),(2,-.7)]),
    rotations(arms["L"][1],(1,0,0),[(0,-.55),(.5,-.42),(1,-.60),(1.5,-.42),(2,-.55)]),
    rotations(arms["R"][1],(1,0,0),[(0,-.42),(.5,-.60),(1,-.42),(1.5,-.60),(2,-.42)]),
    rotations(head,(1,0,0),[(0,.13),(1,.16),(2,.13)]),
])

while len(blob)%4: blob.append(0)
doc["buffers"].append({"byteLength":len(blob)})
json_data=json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode("utf-8")
json_data+=b" "*((-len(json_data))%4)
length=12+8+len(json_data)+8+len(blob)
target=HERE/"sysadmin_avatar.glb"
with target.open("wb") as f:
    f.write(struct.pack("<4sII",b"glTF",2,length))
    f.write(struct.pack("<I4s",len(json_data),b"JSON")); f.write(json_data)
    f.write(struct.pack("<I4s",len(blob),b"BIN\0")); f.write(blob)
print(f"{target} ({len(doc['nodes'])} nodes, {len(doc['animations'])} animations, {length:,} bytes)")
