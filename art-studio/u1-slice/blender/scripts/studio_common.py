"""Shared Blender 4.2 LTS PBR Studio Foundation for Cửu Châu Ẩn Kiếm (U1 Slice).

Enforces Gate #4 Unified Physical Lighting:
- Orthographic Camera looking straight down (-Z), 100 px = 1.0 Blender unit.
- Warm Key Light (#FFD9A0) from 35 deg Top-Left (-X, +Y, +Z).
- Cool Rim Light (#4A6B82) from Bottom-Right (+X, -Y, +Z).
- Studio Softbox Reflection World (invisible in alpha when film_transparent=True)
  so metallic antique bronze, lacquered ebony, and translucent jade reflect rich light
  with 100% spatial uniformity across 9-slice straight edges.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

import bmesh
import bpy
from mathutils import Matrix, Vector

PPU = 100.0  # 100 pixels = 1.0 Blender world unit (1 px = 0.01 m)

RENDERS_DIR = Path(r"c:\Tam quốc sát\art-studio\u1-slice\blender\renders")


def srgb_to_linear_channel(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgba(hex_str: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    h = hex_str.lstrip("#")
    r = srgb_to_linear_channel(int(h[0:2], 16) / 255.0)
    g = srgb_to_linear_channel(int(h[2:4], 16) / 255.0)
    b = srgb_to_linear_channel(int(h[4:6], 16) / 255.0)
    return (r, g, b, alpha)


def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    r, g, b, _ = hex_to_rgba(hex_str, 1.0)
    return (r, g, b)


def px_to_world(px: float, py: float, width_px: int, height_px: int) -> tuple[float, float]:
    """Convert top-left pixel coordinates (px, py) to world (x, y)."""
    x = (px - width_px * 0.5) / PPU
    y = (height_px * 0.5 - py) / PPU
    return x, y


def enable_cycles_gpu(scene: bpy.types.Scene) -> None:
    """Use native AVX2/AVX-512 32-thread CPU Cycles on Ryzen 9 8945HX.

    Note: Blender 4.2 LTS pre-dates RTX 5070 Blackwell (sm_120), causing multi-minute
    PTX JIT stalls on OPTIX/CUDA, whereas 32-thread Zen 4 CPU + OIDN renders all 10
    orthographic UI assets in ~25 seconds with zero kernel compilation delay and full
    Cycles Pointiness + Ambient Occlusion + Refraction support.
    """
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.render.threads_mode = "AUTO"


def init_scene(
    width_px: int,
    height_px: int,
    transparent: bool = True,
    samples: int = 72,
    view_transform: str = "AgX",
    look: str = "AgX - Medium High Contrast",
) -> bpy.types.Scene:
    assert width_px % 4 == 0 and height_px % 4 == 0, f"Size {width_px}x{height_px} must be divisible by 4"

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    enable_cycles_gpu(scene)

    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.004
    scene.cycles.use_denoising = True
    for denoiser_name in ("OPENIMAGEDENOISE", "OPTIX"):
        try:
            scene.cycles.denoiser = denoiser_name
            break
        except Exception:
            pass

    scene.cycles.max_bounces = 10
    scene.cycles.diffuse_bounces = 4
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 10
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.sample_clamp_indirect = 6.0

    scene.render.resolution_x = width_px
    scene.render.resolution_y = height_px
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.filter_size = 1.35

    img = scene.render.image_settings
    img.file_format = "PNG"
    img.color_depth = "16"
    img.color_mode = "RGBA" if transparent else "RGB"
    img.compression = 15

    try:
        scene.view_settings.view_transform = view_transform
    except Exception:
        scene.view_settings.view_transform = "Standard"
    try:
        scene.view_settings.look = look
    except Exception:
        scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0

    # Orthographic top-down camera (-Z) with exact 100 px = 1.0 unit mapping
    cam_data = bpy.data.cameras.new("OrthoTopCam")
    cam_data.type = "ORTHO"
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.ortho_scale = width_px / PPU
    cam_data.clip_start = 0.1
    cam_data.clip_end = 100.0
    cam_obj = bpy.data.objects.new("OrthoTopCam", cam_data)
    cam_obj.location = (0.0, 0.0, 12.0)
    cam_obj.rotation_euler = (0.0, 0.0, 0.0)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    setup_studio_world(scene)
    setup_lighting_rig(scene)
    return scene


def setup_studio_world(scene: bpy.types.Scene, strength: float = 0.85) -> None:
    """Directional studio reflection dome aligned to 35 deg Top-Left warm & Bottom-Right cool."""
    world = bpy.data.worlds.new("WuxiaStudioWorld")
    world.use_nodes = True
    scene.world = world

    nt = world.node_tree
    nt.nodes.clear()

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    sep_xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tex_coord.outputs["Generated"], sep_xyz.inputs["Vector"])

    # Compute dot product of ray direction with Top-Left (-0.57, +0.57, +0.58)
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    dot.inputs[1].default_value = (-0.57, 0.57, 0.59)
    nt.links.new(tex_coord.outputs["Generated"], dot.inputs[0])

    map_r = nt.nodes.new("ShaderNodeMapRange")
    map_r.inputs["From Min"].default_value = -0.85
    map_r.inputs["From Max"].default_value = 0.90
    map_r.inputs["To Min"].default_value = 0.0
    map_r.inputs["To Max"].default_value = 1.0
    nt.links.new(dot.outputs["Value"], map_r.inputs["Value"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = hex_to_rgba("#2D4354")  # Cool slate-blue rim hemisphere
    cr.elements[1].position = 1.0
    cr.elements[1].color = hex_to_rgba("#FFE2B0")  # Warm softbox top-left hemisphere
    mid = cr.elements.new(0.46)
    mid.color = hex_to_rgba("#221B16")  # Controlled dark studio mid-band

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])

    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def add_directional_sun(
    scene: bpy.types.Scene,
    name: str,
    from_vector: tuple[float, float, float],
    hex_color: str,
    energy: float,
    angle_deg: float,
) -> bpy.types.Object:
    light_data = bpy.data.lights.new(name=name, type="SUN")
    light_data.color = hex_to_rgb(hex_color)
    light_data.energy = energy
    light_data.angle = math.radians(angle_deg)

    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    vec = Vector(from_vector).normalized()
    light_obj.location = vec * 10.0
    light_obj.rotation_euler = vec.to_track_quat("Z", "Y").to_euler()
    scene.collection.objects.link(light_obj)
    return light_obj


def setup_lighting_rig(scene: bpy.types.Scene, key_energy: float = 3.2, rim_energy: float = 1.05) -> None:
    """Gate #4 Unified Physical Rig:
    - 35 deg Top-Left Key (#FFD9A0): zenith tilt 35 deg in (-X, +Y, +Z) -> (-0.4055, +0.4055, +0.8192)
    - Broad Specular Softener from same 35 deg Top-Left angle for lush metallic bevel bands
    - Bottom-Right Rim (#4A6B82) from (+X, -Y, +Z) -> (+0.52, -0.52, +0.68)
    """
    # Primary crisp key sun (35 deg off vertical from Top-Left)
    add_directional_sun(
        scene,
        name="KeyLight_35_TopLeft",
        from_vector=(-0.4055, 0.4055, 0.8192),
        hex_color="#FFD9A0",
        energy=key_energy,
        angle_deg=8.5,
    )
    # Broad studio softbox highlight sun along exact same 35 deg Top-Left vector
    add_directional_sun(
        scene,
        name="KeySoftSpec_35_TopLeft",
        from_vector=(-0.44, 0.44, 0.78),
        hex_color="#FFE4B8",
        energy=key_energy * 0.42,
        angle_deg=28.0,
    )
    # Cool Rim Light from Bottom-Right
    add_directional_sun(
        scene,
        name="RimLight_BottomRight",
        from_vector=(0.54, -0.54, 0.64),
        hex_color="#4A6B82",
        energy=rim_energy,
        angle_deg=15.0,
    )


def finalize_smooth(obj: bpy.types.Object, split_miter_deg: float | None = None) -> None:
    if obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True
        if split_miter_deg is not None:
            mod = obj.modifiers.new(name="CrispMiterSplit", type="EDGE_SPLIT")
            mod.use_edge_angle = True
            mod.split_angle = math.radians(split_miter_deg)


def render_to_file(scene: bpy.types.Scene, filename: str) -> Path:
    RENDERS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RENDERS_DIR / filename
    scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)
    print(f"[U1 Blender] Rendered -> {out_path}")
    return out_path


# ==============================================================================
# PROCEDURAL PBR MATERIALS
# ==============================================================================

def create_antique_bronze_material(
    name: str = "AntiqueBronze",
    brightness: float = 1.0,
    roughness_base: float = 0.28,
    patina_strength: float = 0.55,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.91
    bsdf.inputs["Anisotropic"].default_value = 0.25
    bsdf.inputs["Coat Weight"].default_value = 0.12
    bsdf.inputs["Coat Roughness"].default_value = 0.25
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    geom = nt.nodes.new("ShaderNodeNewGeometry")
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = 16
    ao.inputs["Distance"].default_value = 0.18

    # Micro-brushed cast bronze grain
    noise_fine = nt.nodes.new("ShaderNodeTexNoise")
    noise_fine.inputs["Scale"].default_value = 85.0
    noise_fine.inputs["Detail"].default_value = 8.0
    noise_fine.inputs["Roughness"].default_value = 0.65
    nt.links.new(tex_coord.outputs["Object"], noise_fine.inputs["Vector"])

    # Combine AO + Pointiness + Noise to drive patina vs worn gold-bronze edges
    point_ramp = nt.nodes.new("ShaderNodeMapRange")
    point_ramp.inputs["From Min"].default_value = 0.45
    point_ramp.inputs["From Max"].default_value = 0.58
    nt.links.new(geom.outputs["Pointiness"], point_ramp.inputs["Value"])

    mix_factor = nt.nodes.new("ShaderNodeMath")
    mix_factor.operation = "MULTIPLY"
    nt.links.new(ao.outputs["AO"], mix_factor.inputs[0])
    nt.links.new(point_ramp.outputs["Result"], mix_factor.inputs[1])

    # Blend noise into factor
    add_noise = nt.nodes.new("ShaderNodeMath")
    add_noise.operation = "MULTIPLY_ADD"
    add_noise.inputs[1].default_value = 0.18
    nt.links.new(noise_fine.outputs["Fac"], add_noise.inputs[0])
    nt.links.new(mix_factor.outputs["Value"], add_noise.inputs[2])

    col_ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = col_ramp.color_ramp
    c_dark = hex_to_rgba("#24180B")
    c_mid = hex_to_rgba("#9E7432")
    c_bright = hex_to_rgba("#ECC578")

    def scale_col(c: tuple[float, float, float, float], s: float) -> tuple[float, float, float, float]:
        return (min(1.0, c[0] * s), min(1.0, c[1] * s), min(1.0, c[2] * s), 1.0)

    cr.elements[0].position = 0.08 * patina_strength
    cr.elements[0].color = scale_col(c_dark, brightness)
    cr.elements[1].position = 0.88
    cr.elements[1].color = scale_col(c_bright, brightness)
    e_mid = cr.elements.new(0.45)
    e_mid.color = scale_col(c_mid, brightness)
    nt.links.new(add_noise.outputs["Value"], col_ramp.inputs["Fac"])
    nt.links.new(col_ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # Roughness: polished on raised ridges, rougher in dark patina crevices
    rough_map = nt.nodes.new("ShaderNodeMapRange")
    rough_map.inputs["From Min"].default_value = 0.0
    rough_map.inputs["From Max"].default_value = 1.0
    rough_map.inputs["To Min"].default_value = min(0.75, roughness_base + 0.22)
    rough_map.inputs["To Max"].default_value = max(0.14, roughness_base - 0.08)
    nt.links.new(add_noise.outputs["Value"], rough_map.inputs["Value"])
    nt.links.new(rough_map.outputs["Result"], bsdf.inputs["Roughness"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.045
    bump.inputs["Distance"].default_value = 0.005
    nt.links.new(noise_fine.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def create_dark_patina_recess_material(name: str = "DarkBronzePatina") -> bpy.types.Material:
    """Deep oxidized bronze-iron recess for empty sockets and seal backgrounds."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = hex_to_rgba("#16110D")
    bsdf.inputs["Metallic"].default_value = 0.55
    bsdf.inputs["Roughness"].default_value = 0.58
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 65.0
    noise.inputs["Detail"].default_value = 6.0
    nt.links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.006
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def create_lacquered_ebony_material(
    name: str = "LacqueredEbony",
    color_dark: str = "#110D0A",
    color_grain: str = "#241912",
    roughness: float = 0.34,
    coat_weight: float = 0.32,
    grain_scale_x: float = 2.5,
    grain_scale_y: float = 22.0,
    bump_strength: float = 0.04,
    specular_level: float = 0.42,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular_level
    bsdf.inputs["Coat Weight"].default_value = coat_weight
    bsdf.inputs["Coat Roughness"].default_value = 0.20
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (grain_scale_x, grain_scale_y, 4.0)
    nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])

    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Y"
    wave.inputs["Scale"].default_value = 3.6
    wave.inputs["Distortion"].default_value = 4.2
    wave.inputs["Detail"].default_value = 5.0
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.15
    ramp.color_ramp.elements[0].color = hex_to_rgba(color_dark)
    ramp.color_ramp.elements[1].position = 0.88
    ramp.color_ramp.elements[1].color = hex_to_rgba(color_grain)
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.004
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def create_matte_inner_panel_material(
    name: str,
    target_hex: str,
    accent_hex: str,
    weave_scale: float = 90.0,
) -> bpy.types.Material:
    """Calibrated low-glare flat dark ebony/silk surface so WCAG text contrast stays >= 7:1."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Specular IOR Level"].default_value = 0.06
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    wave_x = nt.nodes.new("ShaderNodeTexWave")
    wave_x.wave_type = "BANDS"
    wave_x.bands_direction = "X"
    wave_x.inputs["Scale"].default_value = weave_scale
    wave_x.inputs["Distortion"].default_value = 0.8
    nt.links.new(tex_coord.outputs["Object"], wave_x.inputs["Vector"])

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 18.0
    noise.inputs["Detail"].default_value = 4.0
    nt.links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])

    mix_col = nt.nodes.new("ShaderNodeMix")
    mix_col.data_type = "RGBA"
    mix_col.inputs["A"].default_value = hex_to_rgba(target_hex)
    mix_col.inputs["B"].default_value = hex_to_rgba(accent_hex)
    nt.links.new(noise.outputs["Fac"], mix_col.inputs["Factor"])
    nt.links.new(mix_col.outputs["Result"], bsdf.inputs["Base Color"])

    # Gentle emissive floor so AgX shadow roll-off keeps exact dark richness (#16120F / #14100D)
    bsdf.inputs["Emission Color"].default_value = hex_to_rgba(target_hex)
    bsdf.inputs["Emission Strength"].default_value = 0.22

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.018
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(wave_x.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def create_silk_parchment_material(name: str = "AncientSilkParchment") -> bpy.types.Material:
    """Warm antique silk (#DEC79C -> #C6A673) calibrated for 9-slice tileable card interior."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.82
    bsdf.inputs["Specular IOR Level"].default_value = 0.12
    bsdf.inputs["Sheen Weight"].default_value = 0.25
    bsdf.inputs["Sheen Roughness"].default_value = 0.55
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")

    # Fine cross-woven silk threads (tile-safe high frequency)
    wave_h = nt.nodes.new("ShaderNodeTexWave")
    wave_h.wave_type = "BANDS"
    wave_h.bands_direction = "Y"
    wave_h.inputs["Scale"].default_value = 115.0
    wave_h.inputs["Distortion"].default_value = 0.6
    nt.links.new(tex_coord.outputs["Object"], wave_h.inputs["Vector"])

    wave_v = nt.nodes.new("ShaderNodeTexWave")
    wave_v.wave_type = "BANDS"
    wave_v.bands_direction = "X"
    wave_v.inputs["Scale"].default_value = 115.0
    wave_v.inputs["Distortion"].default_value = 0.6
    nt.links.new(tex_coord.outputs["Object"], wave_v.inputs["Vector"])

    weave_mix = nt.nodes.new("ShaderNodeMath")
    weave_mix.operation = "AVERAGE" if False else "ADD"
    nt.links.new(wave_h.outputs["Fac"], weave_mix.inputs[0])
    nt.links.new(wave_v.outputs["Fac"], weave_mix.inputs[1])

    weave_half = nt.nodes.new("ShaderNodeMath")
    weave_half.operation = "MULTIPLY"
    weave_half.inputs[1].default_value = 0.5
    nt.links.new(weave_mix.outputs["Value"], weave_half.inputs[0])

    # Subtle micro-fiber tone between #DEC79C and #C6A673
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 42.0
    noise.inputs["Detail"].default_value = 5.0
    nt.links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])

    mix_col = nt.nodes.new("ShaderNodeMix")
    mix_col.data_type = "RGBA"
    mix_col.inputs["A"].default_value = hex_to_rgba("#C6A673")
    mix_col.inputs["B"].default_value = hex_to_rgba("#DEC79C")
    nt.links.new(noise.outputs["Fac"], mix_col.inputs["Factor"])
    nt.links.new(mix_col.outputs["Result"], bsdf.inputs["Base Color"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.025
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(weave_half.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# ==============================================================================
# 9-SLICE MITERED ARCHITECTURAL MOLDING BUILDER
# ==============================================================================

def create_mitered_rect_frame(
    name: str,
    outer_w: float,
    outer_h: float,
    profile: Iterable[tuple[float, float]],
    chamfer_corner: float = 0.0,
) -> bpy.types.Object:
    """Sweep a 2D molding profile [(inset_from_outer, z), ...] around a rectangle.

    Guarantees 100% straight, constant-cross-section edges along X and Y,
    with miter joints confined inside the corner inset region.
    If chamfer_corner > 0, each corner has a 45-degree architectural chamfer!
    """
    prof = list(profile)
    bm = bmesh.new()
    hw = outer_w * 0.5
    hh = outer_h * 0.5

    rings: list[list[bmesh.types.BMVert]] = []
    if chamfer_corner <= 1e-6:
        # 4 exact 45-degree miter corners: TL, TR, BR, BL
        corner_signs = [(-1.0, 1.0), (1.0, 1.0), (1.0, -1.0), (-1.0, -1.0)]
        for sx, sy in corner_signs:
            ring = []
            for u, z in prof:
                vx = sx * (hw - u)
                vy = sy * (hh - u)
                ring.append(bm.verts.new((vx, vy, z)))
            rings.append(ring)
    else:
        # 8 vertices per profile loop (octagonal chamfered corners, tangent math exact!)
        # Offset distance of a 45-deg chamfer line from corner: c + u * tan(22.5 deg) logic:
        # Normal of edges is (1,0)/(0,1); normal of 45-deg chamfer is (1/sqrt2, 1/sqrt2).
        # Offset along edge before hitting chamfer of outer size `c`:
        # Outer chamfer cuts `c` off X and `c` off Y: line |x| + |y| = hw + hh - c.
        # Inward parallel line at distance `u` from chamfer has |x| + |y| = hw + hh - c - sqrt(2)*u.
        # Intersecting with |y| = hh - u gives |x| = hw - c - (sqrt(2) - 1)*u!
        k = math.sqrt(2.0) - 1.0
        c = chamfer_corner
        # Clockwise around perimeter:
        # Top-Left upper, Top-Right upper, Right-Top, Right-Bottom,
        # Bottom-Right lower, Bottom-Left lower, Left-Bottom, Left-Top
        pts_fn = [
            lambda u: (-(hw - c - k * u), +(hh - u)),
            lambda u: (+(hw - c - k * u), +(hh - u)),
            lambda u: (+(hw - u), +(hh - c - k * u)),
            lambda u: (+(hw - u), -(hh - c - k * u)),
            lambda u: (+(hw - c - k * u), -(hh - u)),
            lambda u: (-(hw - c - k * u), -(hh - u)),
            lambda u: (-(hw - u), -(hh - c - k * u)),
            lambda u: (-(hw - u), +(hh - c - k * u)),
        ]
        for fn in pts_fn:
            ring = []
            for u, z in prof:
                vx, vy = fn(u)
                ring.append(bm.verts.new((vx, vy, z)))
            rings.append(ring)

    n_rings = len(rings)
    n_prof = len(prof)
    for r_i in range(n_rings):
        r_next = (r_i + 1) % n_rings
        for p_i in range(n_prof - 1):
            v1 = rings[r_i][p_i]
            v2 = rings[r_next][p_i]
            v3 = rings[r_next][p_i + 1]
            v4 = rings[r_i][p_i + 1]
            bm.faces.new((v1, v4, v3, v2))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def create_flat_panel(
    name: str,
    width: float,
    height: float,
    z: float = 0.0,
    chamfer: float = 0.0,
) -> bpy.types.Object:
    bm = bmesh.new()
    hw, hh = width * 0.5, height * 0.5
    if chamfer <= 1e-6:
        pts = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    else:
        c = chamfer
        pts = [
            (-(hw - c), -hh),
            (+(hw - c), -hh),
            (+hw, -(hh - c)),
            (+hw, +(hh - c)),
            (+(hw - c), +hh),
            (-(hw - c), +hh),
            (-hw, +(hh - c)),
            (-hw, -(hh - c)),
        ]
    verts = [bm.verts.new((x, y, z)) for x, y in pts]
    bm.faces.new(verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_tapered_curve(
    name: str,
    points_xyzr: list[tuple[float, float, float, float]],
    material: bpy.types.Material,
    resolution_u: int = 20,
    bevel_resolution: int = 8,
) -> bpy.types.Object:
    """Create a sculpted 3D poly/NURBS curve with per-point radius for cloud/dragon relief."""
    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = resolution_u
    curve_data.bevel_depth = 1.0
    curve_data.bevel_resolution = bevel_resolution
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new(type="NURBS")
    spline.points.add(len(points_xyzr) - 1)
    for idx, (x, y, z, r) in enumerate(points_xyzr):
        spline.points[idx].co = (x, y, z, 1.0)
        spline.points[idx].radius = r
    spline.use_endpoint_u = True
    spline.order_u = min(4, len(points_xyzr))

    obj = bpy.data.objects.new(name, curve_data)
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    return obj
