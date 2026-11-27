"""Render Assets 2, 3, 4: The Three 9-Slice Resizable Wuxia Frames (RGBA 16-bit, inset=64px).

Strict 9-Slice Mathematical Guarantees (layer-game-ui):
- PPU = 100.0 (64px inset = 0.64m on all 4 sides).
- EVERY corner ornament, bracket, rivet, and scroll finial is mathematically confined inside
  [6px .. 59px] x [6px .. 59px] at all 4 corners (NEVER crossing pixel 64!).
- All 4 middle edge bands ([64 .. W-64] and [64 .. H-64]) have 100% straight, uniform cross-sections
  and directional sun lighting so Unity uGUI / CSS 9-slice stretching/tiling produces ZERO seams.
- 0% text, 0% fake checkerboard, true transparent outer margin.
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


def add_corner_cloud_filigree(
    w_px: int,
    h_px: int,
    mat_bronze: bpy.types.Material,
) -> None:
    """Sculpted antique bronze L-clasp + Ruyi cloud spirals strictly inside [6.5px..58.5px] corners."""
    hw = (w_px * 0.5) / sc.PPU
    hh = (h_px * 0.5) / sc.PPU

    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            tag = f"{'R' if sx > 0 else 'L'}{'T' if sy > 0 else 'B'}"

            # Sculpted corner L-clasp plate hugging outer molding (px 6.5 .. 56)
            # Local corner coordinates (u_x, u_y) measured inward from canvas edge in pixels:
            # All values strictly between 6.5 and 57.5 (< 64)!
            poly_px = [
                (6.5, 6.5),
                (56.0, 6.5),
                (51.0, 15.5),
                (19.0, 15.5),
                (15.5, 19.0),
                (15.5, 51.0),
                (6.5, 56.0),
            ]
            bm = bmesh.new()
            v_bot = []
            v_top = []
            for ux_px, uy_px in poly_px:
                wx = sx * (hw - ux_px / sc.PPU)
                wy = sy * (hh - uy_px / sc.PPU)
                v_bot.append(bm.verts.new((wx, wy, 0.085)))
                # Inset slightly for crisp 3D bevel top
                wx_in = sx * (hw - (ux_px + 1.2) / sc.PPU)
                wy_in = sy * (hh - (uy_px + 1.2) / sc.PPU)
                v_top.append(bm.verts.new((wx_in, wy_in, 0.145)))

            bm.faces.new(v_top if sx * sy > 0 else list(reversed(v_top)))
            n = len(poly_px)
            for i in range(n):
                inext = (i + 1) % n
                bm.faces.new((v_bot[i], v_bot[inext], v_top[inext], v_top[i]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            mesh = bpy.data.meshes.new(f"CardCornerClasp_{tag}")
            bm.to_mesh(mesh)
            bm.free()
            obj = bpy.data.objects.new(f"CardCornerClasp_{tag}", mesh)
            obj.data.materials.append(mat_bronze)
            bpy.context.scene.collection.objects.link(obj)

            # Ruyi Cloud Spiral 1 (horizontal branch inside [12..58] x [12..46] px < 64px!)
            c1_px = [
                (12.5, 12.5, 0.152, 2.2),
                (23.0, 14.5, 0.160, 2.8),
                (37.0, 17.5, 0.162, 2.7),
                (49.5, 22.5, 0.158, 2.4),
                (56.0, 30.5, 0.155, 2.0),
                (52.5, 39.0, 0.152, 1.7),
                (44.5, 38.0, 0.150, 1.5),
                (42.5, 31.0, 0.150, 1.1),
            ]
            pts1 = [
                (sx * (hw - ux / sc.PPU), sy * (hh - uy / sc.PPU), z, r / sc.PPU)
                for ux, uy, z, r in c1_px
            ]
            sc.add_tapered_curve(f"CardCloudH_{tag}", pts1, mat_bronze, resolution_u=20)

            # Ruyi Cloud Spiral 2 (vertical symmetrical branch inside [12..46] x [12..58] px < 64px!)
            pts2 = [
                (sx * (hw - uy / sc.PPU), sy * (hh - ux / sc.PPU), z, r / sc.PPU)
                for ux, uy, z, r in c1_px
            ]
            sc.add_tapered_curve(f"CardCloudV_{tag}", pts2, mat_bronze, resolution_u=20)

            # Inner Ruyi Cloud Heart Cusp at diagonal (px 21..49, strictly < 59px)
            cusp_px = [
                (21.0, 36.0, 0.145, 1.5),
                (28.0, 28.0, 0.158, 2.4),
                (39.0, 39.0, 0.164, 2.6),
                (28.0, 28.0, 0.158, 2.4),
                (36.0, 21.0, 0.145, 1.5),
            ]
            pts3 = [
                (sx * (hw - ux / sc.PPU), sy * (hh - uy / sc.PPU), z, r / sc.PPU)
                for ux, uy, z, r in cusp_px
            ]
            sc.add_tapered_curve(f"CardCloudHeart_{tag}", pts3, mat_bronze, resolution_u=16)

            # Corner apex bronze pearl stud at (13.5px, 13.5px)
            bpy.ops.mesh.primitive_uv_sphere_add(
                segments=32,
                ring_count=16,
                radius=0.032,
                location=(sx * (hw - 0.135), sy * (hh - 0.135), 0.155),
            )
            stud = bpy.context.active_object
            stud.name = f"CardCornerPearl_{tag}"
            stud.scale = (1.0, 1.0, 0.55)
            stud.data.materials.append(mat_bronze)
            sc.finalize_smooth(stud)


def render_card_frame_9slice() -> Path:
    """2. card_frame_9slice.png (512x720, RGBA, 9-slice inset 64px)."""
    w_px, h_px = 512, 720
    scene = sc.init_scene(w_px, h_px, transparent=True, samples=72)

    mat_bronze = sc.create_antique_bronze_material("CardBronze", brightness=1.02, roughness_base=0.27)
    mat_ebony = sc.create_lacquered_ebony_material(
        "CardEbonyLacquer",
        color_dark="#120D0A",
        color_grain="#2A1C13",
        roughness=0.28,
        coat_weight=0.45,
    )
    mat_silk = sc.create_silk_parchment_material("CardSilkCenter")

    # Outer canvas has 6px clean transparent margin -> outer frame is 500x708 px (5.00 x 7.08 m)
    outer_w = (w_px - 12) / sc.PPU  # 5.00
    outer_h = (h_px - 12) / sc.PPU  # 7.08

    # Inner warm antique silk parchment (#DEC79C -> #C6A673)
    silk_panel = sc.create_flat_panel("CardSilkPanel", outer_w - 0.64, outer_h - 0.64, z=0.01)
    silk_panel.data.materials.append(mat_silk)

    # Outer bronze beveled rim (u = 0.00 .. 0.085 -> px 6 .. 14.5)
    outer_rim_prof = [
        (0.000, 0.00),
        (0.022, 0.105),
        (0.065, 0.112),
        (0.088, 0.075),
    ]
    outer_rim = sc.create_mitered_rect_frame("CardOuterBronzeRim", outer_w, outer_h, outer_rim_prof, chamfer_corner=0.05)
    outer_rim.data.materials.append(mat_bronze)
    sc.finalize_smooth(outer_rim, split_miter_deg=28.0)

    # Sculpted curved dark lacquered ebony cove molding (u = 0.082 .. 0.305 -> px 14.2 .. 36.5)
    ebony_prof = [
        (0.082, 0.072),
        (0.110, 0.095),
        (0.165, 0.108),
        (0.235, 0.102),
        (0.285, 0.082),
        (0.310, 0.058),
    ]
    ebony_frame = sc.create_mitered_rect_frame("CardEbonyMolding", outer_w, outer_h, ebony_prof, chamfer_corner=0.05)
    ebony_frame.data.materials.append(mat_ebony)
    sc.finalize_smooth(ebony_frame, split_miter_deg=28.0)

    # Inner stepped antique bronze fillet (u = 0.300 .. 0.390 -> px 36 .. 45, well inside 64px!)
    inner_rim_prof = [
        (0.300, 0.058),
        (0.322, 0.092),
        (0.362, 0.086),
        (0.392, 0.010),
    ]
    inner_rim = sc.create_mitered_rect_frame("CardInnerBronzeRim", outer_w, outer_h, inner_rim_prof, chamfer_corner=0.03)
    inner_rim.data.materials.append(mat_bronze)
    sc.finalize_smooth(inner_rim, split_miter_deg=28.0)

    # 4 Corner Bronze Cloud Ornaments strictly inside 64x64px corners
    add_corner_cloud_filigree(w_px, h_px, mat_bronze)

    return sc.render_to_file(scene, "card_frame_9slice.png")


def add_seat_corner_brackets(
    w_px: int,
    h_px: int,
    mat_bronze: bpy.types.Material,
) -> None:
    """Heavy chamfered antique bronze corner armor brackets & rivets strictly inside [5.5..59] px."""
    hw = (w_px * 0.5) / sc.PPU
    hh = (h_px * 0.5) / sc.PPU

    # Chamfered L-bracket polygon in pixel inset coordinates (all <= 58.5 < 64!)
    bracket_px = [
        (5.5, 19.5),
        (19.5, 5.5),
        (58.0, 5.5),
        (58.0, 17.5),
        (46.0, 21.0),
        (23.5, 23.5),
        (21.0, 46.0),
        (17.5, 58.0),
        (5.5, 58.0),
    ]

    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            tag = f"{'R' if sx > 0 else 'L'}{'T' if sy > 0 else 'B'}"
            bm = bmesh.new()
            v_bot = []
            v_top = []
            cx_avg = sum(p[0] for p in bracket_px) / len(bracket_px)
            cy_avg = sum(p[1] for p in bracket_px) / len(bracket_px)

            for ux, uy in bracket_px:
                wx = sx * (hw - ux / sc.PPU)
                wy = sy * (hh - uy / sc.PPU)
                v_bot.append(bm.verts.new((wx, wy, 0.075)))
                # Subtle bevel pull toward bracket interior
                ux_in = ux + (cx_avg - ux) * 0.08
                uy_in = uy + (cy_avg - uy) * 0.08
                v_top.append(bm.verts.new((sx * (hw - ux_in / sc.PPU), sy * (hh - uy_in / sc.PPU), 0.145)))

            bm.faces.new(v_top if sx * sy < 0 else list(reversed(v_top)))
            n = len(bracket_px)
            for i in range(n):
                inext = (i + 1) % n
                bm.faces.new((v_bot[i], v_bot[inext], v_top[inext], v_top[i]))

            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            mesh = bpy.data.meshes.new(f"SeatCornerBracket_{tag}")
            bm.to_mesh(mesh)
            bm.free()
            obj = bpy.data.objects.new(f"SeatCornerBracket_{tag}", mesh)
            obj.data.materials.append(mat_bronze)
            bpy.context.scene.collection.objects.link(obj)

            # 3 Raised domed bronze rivets per corner bracket (all strictly <= 50px!)
            for r_idx, (rx_px, ry_px, rad_px) in enumerate(
                [(17.5, 17.5, 3.4), (47.5, 12.0, 2.7), (12.0, 47.5, 2.7)]
            ):
                bpy.ops.mesh.primitive_uv_sphere_add(
                    segments=28,
                    ring_count=14,
                    radius=rad_px / sc.PPU,
                    location=(sx * (hw - rx_px / sc.PPU), sy * (hh - ry_px / sc.PPU), 0.152),
                )
                rivet = bpy.context.active_object
                rivet.name = f"SeatRivet_{tag}_{r_idx}"
                rivet.scale = (1.0, 1.0, 0.52)
                rivet.data.materials.append(mat_bronze)
                sc.finalize_smooth(rivet)


def render_seat_frame_9slice() -> Path:
    """3. seat_frame_9slice.png (640x400, RGBA, 9-slice inset 64px, dark center #16120F >= 7:1)."""
    w_px, h_px = 640, 400
    scene = sc.init_scene(w_px, h_px, transparent=True, samples=72)

    mat_bronze = sc.create_antique_bronze_material("SeatBronze", brightness=0.98, roughness_base=0.29)
    mat_ebony_rail = sc.create_lacquered_ebony_material(
        "SeatHeavyEbony",
        color_dark="#130E0B",
        color_grain="#281B13",
        roughness=0.33,
        coat_weight=0.36,
    )
    mat_ebony_inner = sc.create_matte_inner_panel_material(
        "SeatInnerMatteEbony",
        target_hex="#16120F",
        accent_hex="#1B1612",
        weave_scale=65.0,
    )

    outer_w = (w_px - 12) / sc.PPU  # 6.28 (6px clean margin)
    outer_h = (h_px - 12) / sc.PPU  # 3.88

    # Inner dark matte ebony field (#16120F) for >= 7:1 white-jade text contrast
    inner_panel = sc.create_flat_panel("SeatInnerEbony", outer_w - 0.62, outer_h - 0.62, z=0.01, chamfer=0.08)
    inner_panel.data.materials.append(mat_ebony_inner)

    # Heavy chamfered ebony command token border (px 6 .. 42, chamfer = 14px inside 64px corner)
    ebony_prof = [
        (0.000, 0.000),
        (0.030, 0.100),
        (0.145, 0.112),
        (0.165, 0.085),
        (0.205, 0.085),
        (0.225, 0.106),
        (0.320, 0.096),
        (0.365, 0.010),
    ]
    ebony_rail = sc.create_mitered_rect_frame("SeatEbonyRail", outer_w, outer_h, ebony_prof, chamfer_corner=0.14)
    ebony_rail.data.materials.append(mat_ebony_rail)
    sc.finalize_smooth(ebony_rail, split_miter_deg=28.0)

    # Straight recessed bronze pinstripe wire along the middle of the ebony rail
    wire_prof = [
        (0.162, 0.086),
        (0.175, 0.108),
        (0.195, 0.108),
        (0.208, 0.086),
    ]
    wire = sc.create_mitered_rect_frame("SeatBronzeWire", outer_w, outer_h, wire_prof, chamfer_corner=0.14)
    wire.data.materials.append(mat_bronze)
    sc.finalize_smooth(wire, split_miter_deg=28.0)

    # 4 Antique Bronze Corner Brackets & Rivets strictly inside 64x64px corners
    add_seat_corner_brackets(w_px, h_px, mat_bronze)

    return sc.render_to_file(scene, "seat_frame_9slice.png")


def build_lathe_finial(
    name: str,
    cx: float,
    y_start: float,
    y_end: float,
    z_center: float,
    radii_profile: list[tuple[float, float]],
    material: bpy.types.Material,
    segments: int = 64,
) -> bpy.types.Object:
    """Build a lathe-turned cylindrical bronze scroll finial along the Y axis."""
    bm = bmesh.new()
    rings = []
    for t, rad in radii_profile:
        yy = y_start + t * (y_end - y_start)
        ring = []
        for s in range(segments):
            ang = 2.0 * math.pi * s / segments
            vx = cx + rad * math.cos(ang)
            vz = z_center + rad * math.sin(ang)
            ring.append(bm.verts.new((vx, yy, vz)))
        rings.append(ring)

    for i in range(len(rings) - 1):
        for s in range(segments):
            sn = (s + 1) % segments
            bm.faces.new((rings[i][s], rings[i][sn], rings[i + 1][sn], rings[i + 1][s]))

    # Cap ends
    c_start = bm.verts.new((cx, y_start, z_center))
    c_end = bm.verts.new((cx, y_end, z_center))
    for s in range(segments):
        sn = (s + 1) % segments
        bm.faces.new((c_start, rings[0][sn], rings[0][s]))
        bm.faces.new((c_end, rings[-1][s], rings[-1][sn]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    sc.finalize_smooth(obj)
    return obj


def render_silk_scroll_tooltip_9slice() -> Path:
    """4. silk_scroll_tooltip_9slice.png (640x420, RGBA, 9-slice inset 64px, dark #14100D center).

    Horizontal open lacquered black silk scroll:
    - Left & Right vertical ebony scroll rollers (x = 12..46px and 594..628px) -> uniform along Y!
    - Top & Bottom horizontal silk brocade hem rails + bronze trim cords -> uniform along X!
    - 4 Antique bronze lathe-turned scroll end-caps + corner silk clasps strictly inside 64x64px!
    """
    w_px, h_px = 640, 420
    scene = sc.init_scene(w_px, h_px, transparent=True, samples=72)

    mat_bronze = sc.create_antique_bronze_material("ScrollBronze", brightness=1.02, roughness_base=0.27)
    mat_ebony_rod = sc.create_lacquered_ebony_material(
        "ScrollEbonyRod",
        color_dark="#120C09",
        color_grain="#2C1D14",
        roughness=0.25,
        coat_weight=0.50,
    )
    mat_brocade_hem = sc.create_lacquered_ebony_material(
        "ScrollBrocadeHem",
        color_dark="#1A1410",
        color_grain="#261D17",
        roughness=0.52,
        coat_weight=0.20,
        grain_scale_x=24.0,
        grain_scale_y=4.0,
    )
    mat_silk_dark = sc.create_matte_inner_panel_material(
        "ScrollDarkSilkField",
        target_hex="#14100D",
        accent_hex="#181310",
        weave_scale=110.0,
    )

    hw = (w_px * 0.5) / sc.PPU  # 3.20
    hh = (h_px * 0.5) / sc.PPU  # 2.10

    # 1. Taut dark lacquered silk center sheet (x: 29..611px, y: 42..378px)
    silk_w = (w_px - 58) / sc.PPU
    silk_h = (h_px - 84) / sc.PPU
    silk_sheet = sc.create_flat_panel("ScrollSilkCenter", silk_w, silk_h, z=0.02)
    silk_sheet.data.materials.append(mat_silk_dark)

    # 2. Top & Bottom horizontal brocade hem bands (y: 22..44px top, 376..398px bottom) -> uniform along X!
    for sy, label in ((1.0, "Top"), (-1.0, "Bottom")):
        y_mid = sy * (hh - 0.33)  # centered at px 33 from top/bottom
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, y_mid, 0.035))
        hem = bpy.context.active_object
        hem.name = f"ScrollHem_{label}"
        hem.scale = (silk_w, 0.22, 0.035)
        hem.data.materials.append(mat_brocade_hem)

        # Outer & inner thin straight antique bronze trim cords along top/bottom hems (px 21..24.5 & px 42..45.5)
        for cord_idx, py_off in enumerate((0.225, 0.435)):
            yc = sy * (hh - py_off)
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=32,
                radius=0.020,
                depth=silk_w,
                location=(0.0, yc, 0.056),
                rotation=(0.0, math.pi * 0.5, 0.0),
            )
            cord = bpy.context.active_object
            cord.name = f"ScrollBronzeCord_{label}_{cord_idx}"
            cord.data.materials.append(mat_bronze)
            sc.finalize_smooth(cord)

    # 3. Left & Right vertical turned ebony scroll rollers (x centered at 29px and 611px -> radius 16px: px 13..45)
    # Runs straight along Y between the bronze end-caps (y from -1.56 to +1.56 -> px 54..366)
    rod_len = (h_px - 104) / sc.PPU  # spans between top & bottom corner finials
    for sx, label in ((-1.0, "Left"), (1.0, "Right")):
        xc = sx * (hw - 0.29)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=64,
            radius=0.160,
            depth=rod_len,
            location=(xc, 0.0, 0.12),
            rotation=(math.pi * 0.5, 0.0, 0.0),
        )
        rod = bpy.context.active_object
        rod.name = f"ScrollEbonyRoller_{label}"
        rod.data.materials.append(mat_ebony_rod)
        sc.finalize_smooth(rod)

    # 4. Four Corner Antique Bronze Finial End-Caps & Silk Corner Clasps (STRICTLY inside [7..59] x [6..59] px!)
    # Lathe profile from outer tip (t=0 at 6.5px from top/bottom) to collar (t=1 at 57.5px from top/bottom):
    # Max radius is 0.205m (20.5px around xc=29px -> spans x = 8.5px .. 49.5px < 64px!)
    finial_profile = [
        (0.00, 0.055),
        (0.08, 0.115),
        (0.16, 0.120),
        (0.24, 0.085),
        (0.34, 0.185),
        (0.48, 0.202),
        (0.62, 0.195),
        (0.72, 0.155),
        (0.84, 0.188),
        (0.94, 0.182),
        (1.00, 0.162),
    ]
    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            tag = f"{'R' if sx > 0 else 'L'}{'T' if sy > 0 else 'B'}"
            xc = sx * (hw - 0.29)
            y_tip = sy * (hh - 0.065)     # 6.5 px from top/bottom
            y_collar = sy * (hh - 0.575)  # 57.5 px from top/bottom (< 64 px!)
            build_lathe_finial(
                f"ScrollBronzeFinial_{tag}",
                cx=xc,
                y_start=y_tip,
                y_end=y_collar,
                z_center=0.125,
                radii_profile=finial_profile,
                material=mat_bronze,
                segments=64,
            )

            # Bronze corner silk-clamp plate bridging roller collar to hem (x: 42..58.5px, y: 20..45px)
            bm = bmesh.new()
            clamp_px = [(41.0, 20.0), (58.5, 20.0), (55.0, 33.0), (58.5, 45.5), (41.0, 45.5)]
            vb = [bm.verts.new((sx * (hw - ux / sc.PPU), sy * (hh - uy / sc.PPU), 0.045)) for ux, uy in clamp_px]
            vt = [bm.verts.new((sx * (hw - (ux + 0.8) / sc.PPU), sy * (hh - uy / sc.PPU), 0.088)) for ux, uy in clamp_px]
            bm.faces.new(vt if sx * sy < 0 else list(reversed(vt)))
            for i in range(len(clamp_px)):
                inext = (i + 1) % len(clamp_px)
                bm.faces.new((vb[i], vb[inext], vt[inext], vt[i]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            m = bpy.data.meshes.new(f"ScrollSilkClamp_{tag}")
            bm.to_mesh(m)
            bm.free()
            ob = bpy.data.objects.new(f"ScrollSilkClamp_{tag}", m)
            ob.data.materials.append(mat_bronze)
            bpy.context.scene.collection.objects.link(ob)

    return sc.render_to_file(scene, "silk_scroll_tooltip_9slice.png")


def render_all_9slice() -> list[Path]:
    return [
        render_card_frame_9slice(),
        render_seat_frame_9slice(),
        render_silk_scroll_tooltip_9slice(),
    ]


if __name__ == "__main__":
    render_all_9slice()
