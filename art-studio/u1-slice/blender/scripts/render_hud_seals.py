"""Render Assets 9, 10: The Two Octagonal Antique Bronze HUD Seals (128x128 RGBA 16-bit).

Designed for instant silhouette readability at 48x48px (layer-game-ui):
- Shared heavy cast octagonal antique bronze medallion base with deep dark patina field (#18130F)
  for high figure-ground contrast under raised polished gold-bronze reliefs.
- seal_battle_log.png: Bold cast-bronze unrolled ancient scroll / bamboo chronicle (0% text).
- seal_settings_gear.png: Bold cast-bronze ancient Mohist 8-tooth mechanical gear wheel.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import studio_common as sc


def build_octagonal_seal_base(
    mat_bronze_rim: bpy.types.Material,
    mat_dark_plate: bpy.types.Material,
) -> None:
    """Heavy octagonal antique bronze seal (flat-to-flat ~110px = 1.10m in 128px canvas)."""
    # Regular octagon rotated by 22.5 deg so top, bottom, left, right edges are flat horizontal/vertical!
    # For flat-to-flat apothem a = 0.55m, circumradius R = a / cos(22.5 deg) = 0.5953m (<= 0.64m!).
    profile = [
        (0.595, 0.000),
        (0.575, 0.105),
        (0.515, 0.145),
        (0.470, 0.140),
        (0.445, 0.045),
    ]
    bm = bmesh.new()
    rings = []
    for k in range(8):
        ang = k * (math.pi * 0.25) + math.pi / 8.0
        ca, sa = math.cos(ang), math.sin(ang)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in profile])

    for k in range(8):
        kn = (k + 1) % 8
        for p in range(len(profile) - 1):
            bm.faces.new((rings[k][p], rings[kn][p], rings[kn][p + 1], rings[k][p + 1]))

    # Solid bottom cap so alpha is 100% opaque inside the octagon
    c_bot = bm.verts.new((0.0, 0.0, 0.0))
    for k in range(8):
        kn = (k + 1) % 8
        bm.faces.new((c_bot, rings[kn][0], rings[k][0]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("OctagonSealRim")
    bm.to_mesh(mesh)
    bm.free()
    rim_obj = bpy.data.objects.new("OctagonSealRim", mesh)
    rim_obj.data.materials.append(mat_bronze_rim)
    bpy.context.scene.collection.objects.link(rim_obj)

    # Dark recessed oxidized octagonal inner field (R = 0.455) for high contrast at 48x48px
    bm_f = bmesh.new()
    f_verts = []
    for k in range(8):
        ang = k * (math.pi * 0.25) + math.pi / 8.0
        f_verts.append(bm_f.verts.new((0.455 * math.cos(ang), 0.455 * math.sin(ang), 0.045)))
    bm_f.faces.new(f_verts)
    bmesh.ops.recalc_face_normals(bm_f, faces=bm_f.faces)
    mf = bpy.data.meshes.new("OctagonSealField")
    bm_f.to_mesh(mf)
    bm_f.free()
    field_obj = bpy.data.objects.new("OctagonSealField", mf)
    field_obj.data.materials.append(mat_dark_plate)
    bpy.context.scene.collection.objects.link(field_obj)

    # 8 small corner studs on the octagonal bezel vertices
    for k in range(8):
        ang = k * (math.pi * 0.25) + math.pi / 8.0
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=24,
            ring_count=12,
            radius=0.026,
            location=(0.515 * math.cos(ang), 0.515 * math.sin(ang), 0.148),
        )
        stud = bpy.context.active_object
        stud.name = f"SealRimStud_{k}"
        stud.scale = (1.0, 1.0, 0.50)
        stud.data.materials.append(mat_bronze_rim)
        sc.finalize_smooth(stud)


def build_beveled_box(
    name: str,
    cx: float,
    cy: float,
    w: float,
    h: float,
    z_bot: float,
    z_top: float,
    bevel_xy: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bm = bmesh.new()
    hw, hh = w * 0.5, h * 0.5
    bx = min(bevel_xy, hw * 0.45)
    by = min(bevel_xy, hh * 0.45)
    vb = [
        bm.verts.new((cx - hw, cy - hh, z_bot)),
        bm.verts.new((cx + hw, cy - hh, z_bot)),
        bm.verts.new((cx + hw, cy + hh, z_bot)),
        bm.verts.new((cx - hw, cy + hh, z_bot)),
    ]
    vt = [
        bm.verts.new((cx - (hw - bx), cy - (hh - by), z_top)),
        bm.verts.new((cx + (hw - bx), cy - (hh - by), z_top)),
        bm.verts.new((cx + (hw - bx), cy + (hh - by), z_top)),
        bm.verts.new((cx - (hw - bx), cy + (hh - by), z_top)),
    ]
    bm.faces.new(vt)
    for i in range(4):
        inext = (i + 1) % 4
        bm.faces.new((vb[i], vb[inext], vt[inext], vt[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(name)
    bm.to_mesh(m)
    bm.free()
    ob = bpy.data.objects.new(name, m)
    ob.data.materials.append(material)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build_battle_log_relief(
    mat_emblem: bpy.types.Material,
    mat_dark_groove: bpy.types.Material,
) -> None:
    """High-relief cast bronze unrolled ancient scroll (solid parchment body + carved lines, 0% ladder)."""
    # Top and bottom heavy cylindrical scroll rollers (width 0.62m = 62px)
    for sy, label in ((1.0, "Top"), (-1.0, "Bottom")):
        yc = sy * 0.255
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=48,
            radius=0.068,
            depth=0.58,
            location=(0.0, yc, 0.150),
            rotation=(0.0, math.pi * 0.5, 0.0),
        )
        roller = bpy.context.active_object
        roller.name = f"LogScrollRoller_{label}"
        roller.data.materials.append(mat_emblem)
        sc.finalize_smooth(roller)

        # Flared scroll finial knobs on left & right of each roller
        for sx in (-1.0, 1.0):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=36,
                radius=0.052,
                depth=0.10,
                location=(sx * 0.325, yc, 0.150),
                rotation=(0.0, math.pi * 0.5, 0.0),
            )
            knob = bpy.context.active_object
            knob.name = f"LogScrollKnob_{label}_{'R' if sx > 0 else 'L'}"
            knob.data.materials.append(mat_emblem)
            sc.finalize_smooth(knob)

    # Solid raised bronze scroll parchment sheet connecting top and bottom rollers!
    build_beveled_box(
        "LogSolidScrollBody",
        cx=0.0,
        cy=0.0,
        w=0.50,
        h=0.46,
        z_bot=0.045,
        z_top=0.155,
        bevel_xy=0.025,
        material=mat_emblem,
    )

    # 3 Crisp recessed dark-patina horizontal chronicle grooves carved into the solid bronze scroll
    for idx, (yc, gw) in enumerate([(0.105, 0.34), (0.0, 0.34), (-0.105, 0.24)]):
        cx_off = -0.05 if idx == 2 else 0.0
        build_beveled_box(
            f"LogCarvedGroove_{idx}",
            cx=cx_off,
            cy=yc,
            w=gw,
            h=0.044,
            z_bot=0.145,
            z_top=0.162,
            bevel_xy=0.008,
            material=mat_dark_groove,
        )


def build_settings_gear_relief(mat_emblem: bpy.types.Material) -> None:
    """High-relief cast bronze ancient Mohist 8-tooth mechanical cogwheel (coplanar bright teeth & ring)."""
    # Stepped circular gear ring matching tooth height (z_top = 0.185) so all 8 teeth catch bright gold bevels!
    segments = 96
    ring_prof = [
        (0.125, 0.045),
        (0.150, 0.185),
        (0.265, 0.185),
        (0.290, 0.045),
    ]
    bm = bmesh.new()
    rings = []
    for s in range(segments):
        ang = 2.0 * math.pi * s / segments
        ca, sa = math.cos(ang), math.sin(ang)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in ring_prof])
    for s in range(segments):
        sn = (s + 1) % segments
        for p in range(len(ring_prof) - 1):
            bm.faces.new((rings[s][p], rings[sn][p], rings[sn][p + 1], rings[s][p + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m_ring = bpy.data.meshes.new("MohistGearRing")
    bm.to_mesh(m_ring)
    bm.free()
    obj_ring = bpy.data.objects.new("MohistGearRing", m_ring)
    obj_ring.data.materials.append(mat_emblem)
    bpy.context.scene.collection.objects.link(obj_ring)
    sc.finalize_smooth(obj_ring, split_miter_deg=32.0)

    # 8 Chunky Trapezoidal Bronze Gear Teeth (r = 0.255 .. 0.405, z_top = 0.185 coplanar with ring!)
    for k in range(8):
        ang = k * (math.pi * 0.25)
        bm_t = bmesh.new()
        r_root = 0.245
        r_tip = 0.405
        a_root = 0.185
        a_tip = 0.125

        def pt(rad: float, da: float, zz: float) -> tuple[float, float, float]:
            return (rad * math.cos(ang + da), rad * math.sin(ang + da), zz)

        vb = [
            bm_t.verts.new(pt(r_root, -a_root, 0.045)),
            bm_t.verts.new(pt(r_tip, -a_tip, 0.045)),
            bm_t.verts.new(pt(r_tip, +a_tip, 0.045)),
            bm_t.verts.new(pt(r_root, +a_root, 0.045)),
        ]
        vt = [
            bm_t.verts.new(pt(r_root + 0.010, -(a_root - 0.032), 0.185)),
            bm_t.verts.new(pt(r_tip - 0.026, -(a_tip - 0.026), 0.185)),
            bm_t.verts.new(pt(r_tip - 0.026, +(a_tip - 0.026), 0.185)),
            bm_t.verts.new(pt(r_root + 0.010, +(a_root - 0.032), 0.185)),
        ]
        bm_t.faces.new(vt)
        for i in range(4):
            inext = (i + 1) % 4
            bm_t.faces.new((vb[i], vb[inext], vt[inext], vt[i]))
        bmesh.ops.recalc_face_normals(bm_t, faces=bm_t.faces)
        mt = bpy.data.meshes.new(f"MohistGearTooth_{k}")
        bm_t.to_mesh(mt)
        bm_t.free()
        ot = bpy.data.objects.new(f"MohistGearTooth_{k}", mt)
        ot.data.materials.append(mat_emblem)
        bpy.context.scene.collection.objects.link(ot)

    # Inner ancient axle collar leaving a bold dark center bore (r < 0.115 = 23px dark hole -> ~9px at 48x48!)
    collar_prof = [
        (0.095, 0.045),
        (0.112, 0.150),
        (0.150, 0.150),
        (0.162, 0.090),
    ]
    bm_c = bmesh.new()
    c_rings = []
    for k in range(8):
        ang = k * (math.pi * 0.25) + math.pi / 8.0
        ca, sa = math.cos(ang), math.sin(ang)
        c_rings.append([bm_c.verts.new((r * ca, r * sa, z)) for r, z in collar_prof])
    for k in range(8):
        kn = (k + 1) % 8
        for p in range(len(collar_prof) - 1):
            bm_c.faces.new((c_rings[k][p], c_rings[kn][p], c_rings[kn][p + 1], c_rings[k][p + 1]))
    bmesh.ops.recalc_face_normals(bm_c, faces=bm_c.faces)
    mc = bpy.data.meshes.new("MohistAxleCollar")
    bm_c.to_mesh(mc)
    bm_c.free()
    oc = bpy.data.objects.new("MohistAxleCollar", mc)
    oc.data.materials.append(mat_emblem)
    bpy.context.scene.collection.objects.link(oc)


def render_single_seal(filename: str, kind: str) -> Path:
    scene = sc.init_scene(128, 128, transparent=True, samples=96)

    mat_bronze_rim = sc.create_antique_bronze_material(
        "SealOuterBronze",
        brightness=0.95,
        roughness_base=0.30,
    )
    # Brighter hand-polished bronze relief for central icon so it pops unmistakably at 48x48px
    mat_bronze_emblem = sc.create_antique_bronze_material(
        "SealPolishedEmblem",
        brightness=1.22,
        roughness_base=0.22,
        patina_strength=0.35,
    )
    mat_dark_plate = sc.create_dark_patina_recess_material("SealDarkOxidizedPlate")

    build_octagonal_seal_base(mat_bronze_rim, mat_dark_plate)
    if kind == "battle_log":
        build_battle_log_relief(mat_bronze_emblem, mat_dark_plate)
    elif kind == "settings_gear":
        build_settings_gear_relief(mat_bronze_emblem)

    return sc.render_to_file(scene, filename)


def render_all_seals() -> list[Path]:
    return [
        render_single_seal("seal_battle_log.png", "battle_log"),
        render_single_seal("seal_settings_gear.png", "settings_gear"),
    ]


if __name__ == "__main__":
    render_all_seals()
