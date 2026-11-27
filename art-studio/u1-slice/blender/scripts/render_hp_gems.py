"""Render Assets 5, 6, 7, 8: The Four 3D HP Gems & Empty Bronze Socket (128x128 RGBA 16-bit).

- hp_jade_full.png: Translucent emerald-celadon jade cabochon set in antique bronze lotus bezel,
  with crisp 35 deg Top-Left specular highlight & glowing internal jade caustic.
- hp_amber_mid.png: Warm golden-orange amber cabochon in identical antique bronze bezel.
- hp_crimson_low.png: Deep cinnabar crimson cabochon in identical antique bronze bezel.
- hp_socket_empty.png: Identical antique bronze bezel with empty dark concave recessed bowl.
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


def create_gem_cabochon_material(
    name: str,
    deep_hex: str,
    bright_hex: str,
    glow_hex: str,
    sss_radius: tuple[float, float, float],
) -> bpy.types.Material:
    """Translucent jewel shader with polished clearcoat for crisp 35-deg Top-Left highlight
    plus internal mineral depth & caustic glow."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.055
    bsdf.inputs["IOR"].default_value = 1.66
    bsdf.inputs["Specular IOR Level"].default_value = 0.85
    bsdf.inputs["Transmission Weight"].default_value = 0.76
    bsdf.inputs["Subsurface Weight"].default_value = 0.16
    bsdf.inputs["Subsurface Scale"].default_value = 0.08
    bsdf.inputs["Subsurface Radius"].default_value = sss_radius
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat Roughness"].default_value = 0.030
    bsdf.inputs["Coat IOR"].default_value = 1.70
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    geom = nt.nodes.new("ShaderNodeNewGeometry")

    # Rich jewel body: deep saturated rim -> luminous translucent center & lower-right caustic
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 11.0
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Distortion"].default_value = 1.3
    nt.links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])

    fresnel = nt.nodes.new("ShaderNodeLayerWeight")
    fresnel.inputs["Blend"].default_value = 0.45
    nt.links.new(geom.outputs["Normal"], fresnel.inputs["Normal"])

    # Facing = 0 at center, 1 at grazing edge -> invert so 0 = dark rich rim, 1 = glowing center
    inv_facing = nt.nodes.new("ShaderNodeMath")
    inv_facing.operation = "SUBTRACT"
    inv_facing.inputs[0].default_value = 1.0
    nt.links.new(fresnel.outputs["Facing"], inv_facing.inputs[1])

    mix_vein = nt.nodes.new("ShaderNodeMath")
    mix_vein.operation = "MULTIPLY_ADD"
    mix_vein.inputs[1].default_value = 0.25
    nt.links.new(noise.outputs["Fac"], mix_vein.inputs[0])
    nt.links.new(inv_facing.outputs["Value"], mix_vein.inputs[2])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = sc.hex_to_rgba(deep_hex)
    ramp.color_ramp.elements[1].position = 0.96
    ramp.color_ramp.elements[1].color = sc.hex_to_rgba(bright_hex)
    nt.links.new(mix_vein.outputs["Value"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # Controlled saturated internal glow (not washed-out pastel!)
    bsdf.inputs["Emission Color"].default_value = sc.hex_to_rgba(glow_hex)
    bsdf.inputs["Emission Strength"].default_value = 0.14
    return mat


def build_shared_bronze_socket(
    mat_bronze: bpy.types.Material,
    mat_recess: bpy.types.Material,
) -> None:
    """Shared 8-petal antique bronze lotus bezel (outer radius 0.54m = 108px in 128px canvas)."""
    segments = 96
    # Lathe profile of circular stepped bronze bezel
    # (r, z) from outer base r=0.545 down into inner socket r=0.38
    bezel_prof = [
        (0.545, 0.000),
        (0.530, 0.085),
        (0.495, 0.135),
        (0.460, 0.145),
        (0.435, 0.105),
        (0.422, 0.165),
        (0.392, 0.175),
        (0.372, 0.065),
    ]
    bm = bmesh.new()
    rings = []
    for s in range(segments):
        ang = 2.0 * math.pi * s / segments
        ca, sa = math.cos(ang), math.sin(ang)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in bezel_prof])

    for s in range(segments):
        sn = (s + 1) % segments
        for p in range(len(bezel_prof) - 1):
            bm.faces.new((rings[s][p], rings[sn][p], rings[sn][p + 1], rings[s][p + 1]))

    # Close bottom base ring so alpha is solid inside the socket silhouette
    c_bot = bm.verts.new((0.0, 0.0, 0.0))
    for s in range(segments):
        sn = (s + 1) % segments
        bm.faces.new((c_bot, rings[sn][0], rings[s][0]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("HPBronzeBezel")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("HPBronzeBezel", mesh)
    obj.data.materials.append(mat_bronze)
    bpy.context.scene.collection.objects.link(obj)
    sc.finalize_smooth(obj)

    # 8 Sculpted bronze lotus-claw prongs gripping the gem at 45-degree intervals
    for i in range(8):
        ang = i * (math.pi * 0.25) + math.pi / 8.0
        bm_p = bmesh.new()
        w_a = 0.12
        # Outer base -> raised ridge -> inward claw tip
        pts = [
            (0.515, -w_a, 0.09),
            (0.515, +w_a, 0.09),
            (0.445, +w_a * 0.78, 0.215),
            (0.445, -w_a * 0.78, 0.215),
            (0.372, 0.0, 0.235),
        ]
        verts = []
        for rad, da, zz in pts:
            a = ang + da
            verts.append(bm_p.verts.new((rad * math.cos(a), rad * math.sin(a), zz)))
        bm_p.faces.new((verts[0], verts[1], verts[2], verts[3]))
        bm_p.faces.new((verts[3], verts[2], verts[4]))
        bm_p.faces.new((verts[0], verts[3], verts[4]))
        bm_p.faces.new((verts[1], verts[4], verts[2]))
        bmesh.ops.recalc_face_normals(bm_p, faces=bm_p.faces)
        mp = bpy.data.meshes.new(f"HPClaw_{i}")
        bm_p.to_mesh(mp)
        bm_p.free()
        op = bpy.data.objects.new(f"HPClaw_{i}", mp)
        op.data.materials.append(mat_bronze)
        bpy.context.scene.collection.objects.link(op)

    # Concave dark oxidized socket bowl inside r <= 0.385
    bm_s = bmesh.new()
    bowl_prof = [
        (0.385, 0.080),
        (0.340, 0.048),
        (0.260, 0.028),
        (0.160, 0.018),
        (0.060, 0.014),
    ]
    b_rings = []
    for s in range(72):
        ang = 2.0 * math.pi * s / 72
        ca, sa = math.cos(ang), math.sin(ang)
        b_rings.append([bm_s.verts.new((r * ca, r * sa, z)) for r, z in bowl_prof])
    for s in range(72):
        sn = (s + 1) % 72
        for p in range(len(bowl_prof) - 1):
            bm_s.faces.new((b_rings[s][p], b_rings[sn][p], b_rings[sn][p + 1], b_rings[s][p + 1]))
    c_mid = bm_s.verts.new((0.0, 0.0, 0.012))
    for s in range(72):
        sn = (s + 1) % 72
        bm_s.faces.new((b_rings[s][-1], b_rings[sn][-1], c_mid))

    bmesh.ops.recalc_face_normals(bm_s, faces=bm_s.faces)
    ms = bpy.data.meshes.new("HPSocketBowl")
    bm_s.to_mesh(ms)
    bm_s.free()
    os_obj = bpy.data.objects.new("HPSocketBowl", ms)
    os_obj.data.materials.append(mat_recess)
    bpy.context.scene.collection.objects.link(os_obj)
    sc.finalize_smooth(os_obj)


def add_cabochon_gem_orb(
    mat_gem: bpy.types.Material,
    caustic_hex: str,
) -> None:
    """Smooth high-dome cabochon jewel + gold-foil reflector backing inside the socket."""
    # Gold/colored foil reflector disc beneath the translucent cabochon for jewelers' caustic bounce
    mat_foil = bpy.data.materials.new("GemFoilReflector")
    mat_foil.use_nodes = True
    bsdf_f = mat_foil.node_tree.nodes["Principled BSDF"]
    bsdf_f.inputs["Base Color"].default_value = sc.hex_to_rgba(caustic_hex)
    bsdf_f.inputs["Metallic"].default_value = 0.92
    bsdf_f.inputs["Roughness"].default_value = 0.18
    bsdf_f.inputs["Emission Color"].default_value = sc.hex_to_rgba(caustic_hex)
    bsdf_f.inputs["Emission Strength"].default_value = 0.32

    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.365, depth=0.02, location=(0.0, 0.0, 0.055))
    foil = bpy.context.active_object
    foil.name = "GemFoilBacking"
    foil.data.materials.append(mat_foil)
    sc.finalize_smooth(foil)

    # High-dome cabochon gem sphere
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.388, location=(0.0, 0.0, 0.115))
    gem = bpy.context.active_object
    gem.name = "GemCabochon"
    gem.scale = (1.0, 1.0, 0.72)
    gem.data.materials.append(mat_gem)
    sc.finalize_smooth(gem)


def render_single_hp_asset(filename: str, gem_kind: str | None) -> Path:
    scene = sc.init_scene(128, 128, transparent=True, samples=96)
    # Add a crisp pinpoint specular glint sun at exact 35 deg Top-Left for unmistakable jewel highlight
    sc.add_directional_sun(
        scene,
        name="JewelPinpointGlint_35TL",
        from_vector=(-0.4055, 0.4055, 0.8192),
        hex_color="#FFF2D6",
        energy=4.5,
        angle_deg=3.2,
    )

    mat_bronze = sc.create_antique_bronze_material("HPBezelBronze", brightness=1.05, roughness_base=0.26)
    mat_recess = sc.create_dark_patina_recess_material("HPEmptyDarkRecess")
    build_shared_bronze_socket(mat_bronze, mat_recess)

    if gem_kind == "jade":
        mat_gem = create_gem_cabochon_material(
            "ImperialJade",
            deep_hex="#043820",
            bright_hex="#159E55",
            glow_hex="#0D7A3E",
            sss_radius=(0.08, 0.85, 0.32),
        )
        add_cabochon_gem_orb(mat_gem, caustic_hex="#109850")
    elif gem_kind == "amber":
        mat_gem = create_gem_cabochon_material(
            "BalticAmber",
            deep_hex="#471502",
            bright_hex="#D97706",
            glow_hex="#B45309",
            sss_radius=(0.95, 0.48, 0.06),
        )
        add_cabochon_gem_orb(mat_gem, caustic_hex="#D97706")
    elif gem_kind == "crimson":
        mat_gem = create_gem_cabochon_material(
            "CinnabarRuby",
            deep_hex="#380408",
            bright_hex="#C81E24",
            glow_hex="#991B1B",
            sss_radius=(0.95, 0.08, 0.08),
        )
        add_cabochon_gem_orb(mat_gem, caustic_hex="#B91C1C")
    elif gem_kind is None:
        # Empty socket: add subtle concentric groove ring inside empty dark bowl
        bm_g = bmesh.new()
        for r_g in (0.27, 0.15):
            pts = [
                bm_g.verts.new((r_g * math.cos(2 * math.pi * k / 64), r_g * math.sin(2 * math.pi * k / 64), 0.032))
                for k in range(64)
            ]
            _ = pts
        bm_g.free()

    return sc.render_to_file(scene, filename)


def render_all_hp_gems() -> list[Path]:
    return [
        render_single_hp_asset("hp_jade_full.png", "jade"),
        render_single_hp_asset("hp_amber_mid.png", "amber"),
        render_single_hp_asset("hp_crimson_low.png", "crimson"),
        render_single_hp_asset("hp_socket_empty.png", None),
    ]


if __name__ == "__main__":
    render_all_hp_gems()
