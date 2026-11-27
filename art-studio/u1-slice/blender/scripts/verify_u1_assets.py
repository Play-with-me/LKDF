"""Deep Technical Verifier for Blender U1 Renders (16-bit IHDR, WCAG >= 7:1, 9-Slice 64px, Clipping)."""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RENDERS = Path(r"c:\Tam quốc sát\art-studio\u1-slice\blender\renders")


def read_png_ihdr(path: Path) -> tuple[int, int, int, int]:
    data = path.read_bytes()[:32]
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name}: not a PNG"
    w, h, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    return w, h, bit_depth, color_type


def rel_lum_srgb(rgb_255: tuple[float, float, float]) -> float:
    def ch(v: float) -> float:
        c = v / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb_255
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def wcag_contrast(rgb1: tuple[float, float, float], rgb2: tuple[float, float, float]) -> float:
    l1, l2 = rel_lum_srgb(rgb1), rel_lum_srgb(rgb2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hex_rgb255(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rgb_to_hex(rgb: tuple[float, float, float]) -> str:
    return "#{:02X}{:02X}{:02X}".format(int(round(rgb[0])), int(round(rgb[1])), int(round(rgb[2])))


def main() -> int:
    specs = [
        ("table_board_25d.png", 1920, 1080, False),
        ("card_frame_9slice.png", 512, 720, True),
        ("seat_frame_9slice.png", 640, 400, True),
        ("silk_scroll_tooltip_9slice.png", 640, 420, True),
        ("hp_jade_full.png", 128, 128, True),
        ("hp_amber_mid.png", 128, 128, True),
        ("hp_crimson_low.png", 128, 128, True),
        ("hp_socket_empty.png", 128, 128, True),
        ("seal_battle_log.png", 128, 128, True),
        ("seal_settings_gear.png", 128, 128, True),
    ]

    errors: list[str] = []
    for name, exp_w, exp_h, need_alpha in specs:
        p = RENDERS / name
        if not p.is_file():
            errors.append(f"MISSING: {name}")
            continue
        w, h, bit_depth, color_type = read_png_ihdr(p)
        if (w, h) != (exp_w, exp_h):
            errors.append(f"{name}: expected {exp_w}x{exp_h}, got {w}x{h}")
        if bit_depth != 16:
            errors.append(f"{name}: expected 16-bit PNG, got {bit_depth}-bit")

        with Image.open(p) as im:
            arr = np.asarray(im.convert("RGBA"), dtype=np.float32)

        if need_alpha:
            # Outer perimeter clipping check: max alpha on outermost 1px border must be 0
            border_alpha = max(
                float(arr[0, :, 3].max()),
                float(arr[-1, :, 3].max()),
                float(arr[:, 0, 3].max()),
                float(arr[:, -1, 3].max()),
            )
            if border_alpha > 2.0:
                errors.append(f"{name}: clipped outer edge (border max alpha={border_alpha:.1f})")
            print(f"[OK] {name:30s} {w}x{h} {bit_depth}-bit ct={color_type} border_max_a={border_alpha:.1f}")
        else:
            min_a = float(arr[:, :, 3].min())
            if min_a < 255.0:
                errors.append(f"{name}: expected opaque, got min alpha={min_a}")
            center_patch = arr[h // 2 - 40 : h // 2 + 40, w // 2 - 40 : w // 2 + 40, :3].mean(axis=(0, 1))
            corner_patch = arr[20:100, 20:120, :3].mean(axis=(0, 1))
            print(
                f"[OK] {name:30s} {w}x{h} {bit_depth}-bit opaque | center={rgb_to_hex(center_patch)} "
                f"corner_brazier={rgb_to_hex(corner_patch)}"
            )

    # Check WCAG contrast & center hex on the 3 9-slice frames
    for fname, text_hex, min_ratio in [
        ("card_frame_9slice.png", "#1D150D", 7.0),
        ("seat_frame_9slice.png", "#EFE6D5", 7.0),
        ("silk_scroll_tooltip_9slice.png", "#EFE6D5", 7.0),
    ]:
        p = RENDERS / fname
        if p.is_file():
            with Image.open(p) as im:
                arr = np.asarray(im.convert("RGBA"), dtype=np.float32)
            h, w, _ = arr.shape
            center_rgb = tuple(arr[64 : h - 64, 64 : w - 64, :3].mean(axis=(0, 1)))
            ratio = wcag_contrast(center_rgb, hex_rgb255(text_hex))
            # Check 9-slice straight edge uniformity along X (rows 0..63 in x=64..W-64)
            top_band = arr[0:64, 64 : w - 64, :4]
            # Max column-to-column drift in straight middle edge band
            col_std = float(top_band.std(axis=1).mean())
            print(
                f"  -> 9-slice {fname:28s}: center={rgb_to_hex(center_rgb)} "
                f"contrast_vs_{text_hex}={ratio:.2f}:1 | top_edge_col_std={col_std:.2f}"
            )
            if ratio < min_ratio:
                errors.append(f"{fname}: WCAG contrast {ratio:.2f}:1 < {min_ratio}:1 (center={rgb_to_hex(center_rgb)})")
            if col_std > 8.0:
                errors.append(f"{fname}: 9-slice middle edge band not uniform (std={col_std:.2f})")

    if errors:
        print("\nERRORS FOUND:")
        for e in errors:
            print(" -", e)
        return 1
    print("\nALL TECHNICAL GATES PASSED 100%!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
