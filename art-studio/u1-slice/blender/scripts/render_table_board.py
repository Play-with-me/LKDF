"""Render 1: table_board_25d.png (1920x1080, 16-bit RGB opaque).

Tactical 2.5D Wuxia War-Table:
- Deep matte obsidian slate playfield (#0D1015) & carved dark ebony outer rail (#17120E).
- Center recessed antique bronze Dragon-Cloud & Nine-Realms medallion (radius ~36% height = 388px),
  subtle & low-glare so cards played in the center pop with high contrast.
- 4 outer corner braziers casting warm amber-crimson firelight onto corner rails while keeping
  the central playfield calm and dark.
- 0% text baked in.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import studio_common as sc


def create_obsidian_table_material() -> bpy.types.Material:
    mat = bpy.data.materials.new(name="ObsidianSlateBoard")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.05
    bsdf.inputs["Roughness"].default_value = 0.56
    bsdf.inputs["Specular IOR Level"].default_value = 0.26
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")

    # Subtle slate stone mineral veins
    noise_macro = nt.nodes.new("ShaderNodeTexNoise")
    noise_macro.inputs["Scale"].default_value = 1.6
    noise_macro.inputs["Detail"].default_value = 7.0
    noise_macro.inputs["Roughness"].default_value = 0.62
    noise_macro.inputs["Distortion"].default_value = 0.55
    nt.links.new(tex_coord.outputs["Object"], noise_macro.inputs["Vector"])

    noise_micro = nt.nodes.new("ShaderNodeTexNoise")
    noise_micro.inputs["Scale"].default_value = 28.0
    noise_micro.inputs["Detail"].default_value = 6.0
    nt.links.new(tex_coord.outputs["Object"], noise_micro.inputs["Vector"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.20
    ramp.color_ramp.elements[0].color = sc.hex_to_rgba("#090C11")
    ramp.color_ramp.elements[1].position = 0.86
    ramp.color_ramp.elements[1].color = sc.hex_to_rgba("#121822")
    nt.links.new(noise_macro.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # Cool dark obsidian slate floor (#0D1015) so center stays calm & high-contrast
    bsdf.inputs["Emission Color"].default_value = sc.hex_to_rgba("#0C1016")
    bsdf.inputs["Emission Strength"].default_value = 0.20

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.045
    bump.inputs["Distance"].default_value = 0.004
    nt.links.new(noise_micro.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def build_concentric_ring(
    name: str,
    r_inner: float,
    r_outer: float,
    z_base: float,
    z_top: float,
    bevel_w: float,
    segments: int = 160,
    material: bpy.types.Material | None = None,
) -> bpy.types.Object:
    bm = bmesh.new()
    b0 = min(bevel_w, (r_outer - r_inner) * 0.35)
    profile = [
        (r_inner, z_base),
        (r_inner + b0, z_top),
        (r_outer - b0, z_top),
        (r_outer, z_base),
    ]
    rings = []
    for s in range(segments):
        ang = 2.0 * math.pi * s / segments
        ca, sa = math.cos(ang), math.sin(ang)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in profile])

    for s in range(segments):
        sn = (s + 1) % segments
        for p in range(len(profile) - 1):
            bm.faces.new((rings[s][p], rings[sn][p], rings[sn][p + 1], rings[s][p + 1]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    sc.finalize_smooth(obj)
    return obj


def build_table_medallion(mat_bronze_subtle: bpy.types.Material, mat_recess: bpy.types.Material) -> None:
    """Carved recessed Dragon-Cloud bronze medallion (outer radius ~3.88 = 36% of 10.80 height)."""
    # Sunken dark circular trench so bronze sits flush/recessed in stone
    trench = build_concentric_ring(
        "MedallionTrench",
        r_inner=2.48,
        r_outer=3.92,
        z_base=0.001,
        z_top=-0.018,
        bevel_w=0.03,
        segments=192,
        material=mat_recess,
    )
    _ = trench

    # Outer & inner concentric bronze inlay rings (radius ~388px = 3.88m = 36% of 1080p height)
    build_concentric_ring("BronzeOuterRing1", 3.79, 3.89, -0.016, 0.018, 0.022, 192, mat_bronze_subtle)
    build_concentric_ring("BronzeOuterRing2", 3.63, 3.71, -0.016, 0.014, 0.018, 192, mat_bronze_subtle)
    build_concentric_ring("BronzeInnerRing1", 2.66, 2.75, -0.016, 0.015, 0.018, 192, mat_bronze_subtle)
    build_concentric_ring("BronzeInnerRing2", 2.50, 2.57, -0.016, 0.011, 0.014, 192, mat_bronze_subtle)

    # Fine central inner compass ring (leaving r < 2.48 completely flat calm obsidian slate)
    build_concentric_ring("BronzeWhisperRing", 1.72, 1.755, -0.002, 0.007, 0.008, 160, mat_bronze_subtle)

    # 4 Coiling Dragon-Cloud Bas-Relief Motifs around the r = 2.80..3.58 band (90 deg symmetry)
    for q in range(4):
        base_ang = q * (math.pi * 0.5) + math.radians(12.0)

        # Undulating dragon body / cloud-crest spine spanning ~74 degrees per quadrant
        spine_pts = []
        n_steps = 19
        for i in range(n_steps):
            t = i / (n_steps - 1)
            ang = base_ang + t * math.radians(74.0)
            rad = 3.19 + 0.24 * math.sin(t * math.pi * 2.5)
            taper = math.sin(t * math.pi) ** 0.58
            r_thick = 0.010 + 0.044 * taper
            z = -0.004 + 0.020 * taper
            spine_pts.append((rad * math.cos(ang), rad * math.sin(ang), z, r_thick))
        sc.add_tapered_curve(f"DragonSpine_{q}", spine_pts, mat_bronze_subtle, resolution_u=26)

        # Three swirling Ruyi cloud volutes flanking each dragon body
        for c_idx, (ang_off, r_center, r_loop, dir_sign) in enumerate(
            [(14.0, 3.38, 0.20, 1.0), (38.0, 3.00, 0.19, -1.0), (60.0, 3.36, 0.18, 1.0)]
        ):
            cloud_pts = []
            c_ang = base_ang + math.radians(ang_off)
            cx = r_center * math.cos(c_ang)
            cy = r_center * math.sin(c_ang)
            for k in range(14):
                u = k / 13.0
                spiral_theta = c_ang + dir_sign * u * math.pi * 2.4
                spiral_r = r_loop * (1.0 - 0.72 * u)
                px = cx + spiral_r * math.cos(spiral_theta)
                py = cy + spiral_r * math.sin(spiral_theta)
                rad_curve = 0.008 + 0.026 * math.sin(u * math.pi)
                cloud_pts.append((px, py, 0.009, rad_curve))
            sc.add_tapered_curve(f"CloudVolute_{q}_{c_idx}", cloud_pts, mat_bronze_subtle, resolution_u=22)

    # 8 Sword-Qi Diamond Compass Points at 45-degree intervals
    for i in range(8):
        ang = i * (math.pi * 0.25)
        bm = bmesh.new()
        r_in, r_mid, r_out = 2.74, 3.19, 3.65
        w_ang = 0.022 if i % 2 == 0 else 0.014
        p_in = (r_in * math.cos(ang), r_in * math.sin(ang), -0.004)
        p_out = (r_out * math.cos(ang), r_out * math.sin(ang), -0.004)
        p_l = (r_mid * math.cos(ang + w_ang), r_mid * math.sin(ang + w_ang), 0.004)
        p_r = (r_mid * math.cos(ang - w_ang), r_mid * math.sin(ang - w_ang), 0.004)
        p_top = (r_mid * math.cos(ang), r_mid * math.sin(ang), 0.018 if i % 2 == 0 else 0.012)

        vin = bm.verts.new(p_in)
        vout = bm.verts.new(p_out)
        vl = bm.verts.new(p_l)
        vr = bm.verts.new(p_r)
        vtop = bm.verts.new(p_top)
        bm.faces.new((vin, vr, vtop))
        bm.faces.new((vtop, vr, vout))
        bm.faces.new((vout, vl, vtop))
        bm.faces.new((vtop, vl, vin))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        m = bpy.data.meshes.new(f"CompassBlade_{i}")
        bm.to_mesh(m)
        bm.free()
        ob = bpy.data.objects.new(f"CompassBlade_{i}", m)
        ob.data.materials.append(mat_bronze_subtle)
        bpy.context.scene.collection.objects.link(ob)


def build_war_table_perimeter(
    mat_ebony: bpy.types.Material,
    mat_bronze: bpy.types.Material,
) -> None:
    """2.5D Carved Ebony Perimeter Rail & 4 Corner Brazier Firelight Sources."""
    w, h = 19.20, 10.80

    # Full-bleed square-cornered ebony war-table perimeter rail (0 exposed bright corner cutouts!)
    ebony_profile = [
        (0.00, 0.24),
        (0.14, 0.26),
        (0.48, 0.24),
        (0.58, 0.14),
        (0.68, 0.04),
        (0.74, 0.00),
    ]
    border = sc.create_mitered_rect_frame("TableEbonyRail", w + 0.16, h + 0.16, ebony_profile, chamfer_corner=0.0)
    border.data.materials.append(mat_ebony)
    sc.finalize_smooth(border, split_miter_deg=28.0)

    # Thin inlaid antique bronze trim strip along inner lip of the ebony rail
    bronze_trim_profile = [
        (0.55, 0.145),
        (0.575, 0.168),
        (0.615, 0.162),
        (0.635, 0.125),
    ]
    trim = sc.create_mitered_rect_frame("TableBronzeInlay", w + 0.16, h + 0.16, bronze_trim_profile, chamfer_corner=0.0)
    trim.data.materials.append(mat_bronze)
    sc.finalize_smooth(trim, split_miter_deg=28.0)

    # 4 Off-Screen Corner Brazier Firelight Sources + Corner Bronze Brackets
    # Braziers sit just outside the 4 corners, casting rich warm firelight onto the dark ebony & stone!
    corners = [(-9.55, 5.35), (9.55, 5.35), (-9.55, -5.35), (9.55, -5.35)]
    for idx, (cx, cy) in enumerate(corners):
        # Sculpted dark bronze brazier rim arc framing the extreme corner over dark charcoal bed
        brazier = build_concentric_ring(
            f"CornerBrazier_{idx}",
            r_inner=0.58,
            r_outer=0.82,
            z_base=0.22,
            z_top=0.35,
            bevel_w=0.05,
            segments=96,
            material=mat_bronze,
        )
        brazier.location = (cx * 1.01, cy * 1.01, 0.0)

        # Dark iron-charcoal corner bowl base (no blown-out peach surface!)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=48,
            radius=0.62,
            depth=0.10,
            location=(cx * 1.01, cy * 1.01, 0.22),
        )
        coal_bed = bpy.context.active_object
        coal_bed.name = f"CornerCoalBed_{idx}"
        coal_bed.data.materials.append(mat_ebony)

        # Warm physical brazier firelight casting golden-amber grazing light across corner rails & slate
        light_data = bpy.data.lights.new(name=f"BrazierFire_{idx}", type="POINT")
        light_data.color = sc.hex_to_rgb("#FF7A24")
        light_data.energy = 115.0
        light_data.shadow_soft_size = 1.10
        light_obj = bpy.data.objects.new(name=f"BrazierFire_{idx}", object_data=light_data)
        light_obj.location = (cx * 0.96, cy * 0.94, 1.05)
        bpy.context.scene.collection.objects.link(light_obj)


def render_table_board() -> Path:
    scene = sc.init_scene(1920, 1080, transparent=False, samples=64)
    # Slightly calmer overhead key on the dark tactical board so center stays rich #0D1015
    for obj in scene.objects:
        if obj.type == "LIGHT" and "KeyLight" in obj.name:
            obj.data.energy = 1.85
        elif obj.type == "LIGHT" and "KeySoftSpec" in obj.name:
            obj.data.energy = 0.75
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.42

    mat_obsidian = create_obsidian_table_material()
    mat_ebony = sc.create_lacquered_ebony_material(
        "TableCarvedEbony",
        color_dark="#100C09",
        color_grain="#261A12",
        roughness=0.36,
        coat_weight=0.35,
    )
    mat_bronze_subtle = sc.create_antique_bronze_material(
        "TableEngravedBronze",
        brightness=0.58,
        roughness_base=0.36,
        patina_strength=0.75,
    )
    mat_bronze_corner = sc.create_antique_bronze_material(
        "TableCornerBronze",
        brightness=0.88,
        roughness_base=0.30,
    )
    mat_recess = sc.create_dark_patina_recess_material("TableTrenchDark")

    # Main obsidian slate slab
    board = sc.create_flat_panel("ObsidianPlayfield", 19.40, 11.00, z=0.0)
    board.data.materials.append(mat_obsidian)

    build_table_medallion(mat_bronze_subtle, mat_recess)
    build_war_table_perimeter(mat_ebony, mat_bronze_corner)

    return sc.render_to_file(scene, "table_board_25d.png")


if __name__ == "__main__":
    render_table_board()
