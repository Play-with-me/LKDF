"""Chặng U5 art post-processing, RGBA matting, contact sheets & asset_report gate."""
import argparse
import glob
import os
import shutil
import subprocess
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERO_IDS = [
    "lam_thanh_vu",
    "trieu_thien_hanh",
    "loi_chan_son",
    "tham_tinh_ha",
    "bach_ngoc_thanh",
    "khuong_vo_ta",
    "to_mong_dao",
    "han_thiet_phong",
    "co_huyen_co",
    "nghiem_cuong",
    "truong_huy_dieu",
    "thach_pha_thien",
    "ly_tri_vi",
    "thuy_u_linh",
    "viem_liet_vuong",
    "cam_da_sat",
    "luc_tram_an",
    "hoang_bat_dich",
    "tieu_viem_lang",
    "ha_tuyet_nghi",
    "mo_dung_tuyet",
    "bach_cam_y",
    "duoc_vo_uu",
    "tham_mac_ngon",
    "da_vo_ngan",
]

CARD_KEYS = [
    "sat",
    "pha_giap_tram",
    "thiem",
    "dao",
    "vo_trung_sinh_huu",
    "thuan_thu_khien_duong",
    "qua_ha_sai_cau",
    "kinh_loi_chan",
    "quyet_dau",
    "ta_dao_sat_nhan",
    "nam_man_nhap_xam",
    "van_tien_te_phat",
    "dao_vien_ket_nghia",
    "ngu_coc_phong_dang",
    "vo_giai_kha_kich",
    "chan_khi_ho_the",
    "lac_bat_tu_thuc",
    "thiem_dien",
    "gia_cat_lien_no",
    "tu_hung_song_co_kiem",
    "thanh_cong_kiem",
    "han_bang_kiem",
    "tu_khi_hoan",
    "thanh_long_yen_nguyet_dao",
    "truong_bat_xa_mau",
    "quan_thach_phu",
    "phuong_thien_hoa_kich",
    "ky_lan_cung",
    "bat_quai_tran",
    "hoan_anh_giap",
    "tuyet_anh",
    "dich_lo",
    "trao_hoang_phi_dien",
    "xich_tho",
    "dai_uyen",
    "tu_tinh",
]

HERO_SIZE = (800, 1040)
CARD_SIZE = (640, 520)
BACKDROP_SIZE = (1920, 1080)


def fit_cover(img: Image.Image, target_size: tuple[int, int], anchor_y: float = 0.5) -> Image.Image:
    tw, th = target_size
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = int(round(max(0, nh - th) * anchor_y))
    return resized.crop((left, top, left + tw, top + th))


def remove_solid_backdrop_flood(rgba_img: Image.Image) -> Image.Image:
    arr = np.array(rgba_img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3].astype(np.float32)

    # Sample outer 4px perimeter corners & edges to estimate backdrop color(s)
    border_samples = np.concatenate(
        [
            rgb[:6, :, :].reshape(-1, 3),
            rgb[:, :6, :].reshape(-1, 3),
            rgb[:, -6:, :].reshape(-1, 3),
        ],
        axis=0,
    )
    bg_median = np.median(border_samples, axis=0)
    bg_bright = float(np.mean(bg_median))

    # Flood-fill from top, left, right borders (and bottom corners) where pixels stay close to local bg or near-uniform paper/white
    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)

    dist_to_global = np.linalg.norm(rgb - bg_median[None, None, :], axis=2)
    # Also detect pure white / parchment-gray studio backdrop
    max_c = rgb.max(axis=2)
    min_c = rgb.min(axis=2)
    sat = (max_c - min_c) / np.maximum(max_c, 1.0)
    is_near_white = (max_c >= 218.0) & (sat <= 0.14) & (dist_to_global < 55.0)
    candidate_bg = (dist_to_global <= 36.0) | is_near_white

    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, 1, h - 1):
            if candidate_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                is_bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, 1, w - 2, w - 1):
            if candidate_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                is_bg[y, x] = True
                q.append((y, x))

    while q:
        cy, cx = q.popleft()
        cur_rgb = rgb[cy, cx]
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if candidate_bg[ny, nx]:
                    local_diff = float(np.linalg.norm(rgb[ny, nx] - cur_rgb))
                    if local_diff <= 22.0 or is_near_white[ny, nx]:
                        visited[ny, nx] = True
                        is_bg[ny, nx] = True
                        q.append((ny, nx))

    # Clean tiny interior enclosed parchment pockets near white outside torso if needed? Keep torso highlights safe!
    # Erode 1px into foreground to decontaminate halo fringe and apply soft 1.5px EDT alpha transition
    fg_mask = ~is_bg
    dist_fg = ndimage.distance_transform_edt(fg_mask)
    alpha = np.clip((dist_fg - 0.35) / 1.5, 0.0, 1.0)

    # Decontaminate edge pixels (1 <= dist_fg <= 3.0) toward nearest solid interior pixel
    solid_mask = dist_fg >= 3.0
    if np.any(solid_mask):
        _, nearest_idx = ndimage.distance_transform_edt(~solid_mask, return_indices=True)
        edge_band = (dist_fg > 0.0) & (dist_fg < 3.0)
        for c in range(3):
            channel = rgb[:, :, c]
            channel[edge_band] = channel[nearest_idx[0][edge_band], nearest_idx[1][edge_band]]

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)

    # Ensure bottom edge doesn't float artificially — subtle bottom feather in case waist/cloak cuts off at frame edge
    return Image.fromarray(out, "RGBA")


def grade_variant_bg(bg_img: Image.Image, variant_idx: int) -> Image.Image:
    base = fit_cover(bg_img.convert("RGB"), HERO_SIZE, anchor_y=0.5)
    # Subtle mirror & slight zoom crop + warm/cool mood variation per hero index
    if variant_idx % 2 == 1:
        base = base.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    zoom = 1.0 + (variant_idx % 4) * 0.04
    nw, nh = int(round(HERO_SIZE[0] * zoom)), int(round(HERO_SIZE[1] * zoom))
    zoomed = base.resize((nw, nh), Image.Resampling.LANCZOS)
    dx = (variant_idx * 19) % max(1, nw - HERO_SIZE[0] + 1)
    dy = (variant_idx * 13) % max(1, nh - HERO_SIZE[1] + 1)
    cropped = zoomed.crop((dx, dy, dx + HERO_SIZE[0], dy + HERO_SIZE[1]))
    arr = np.array(cropped, dtype=np.float32)
    warmth = ((variant_idx % 5) - 2) * 0.03
    arr[:, :, 0] *= (1.0 + warmth)
    arr[:, :, 2] *= (1.0 - warmth)
    # Darken slightly for strong foreground separation
    arr *= 0.88
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def process_hero(raw_fg_path: str, faction_bg_path: str, out_dir: str, hero_id: str, variant_idx: int) -> None:
    os.makedirs(out_dir, exist_ok=True)
    raw_fg = Image.open(raw_fg_path)
    # If already has genuine alpha coverage (>10% transparent), preserve alpha and fit; otherwise flood-matte
    has_alpha = raw_fg.mode == "RGBA" and np.mean(np.array(raw_fg)[:, :, 3] < 16) > 0.08
    if has_alpha:
        fg_fitted = fit_cover(raw_fg, HERO_SIZE, anchor_y=0.22)
    else:
        fitted_rgb = fit_cover(raw_fg.convert("RGB"), HERO_SIZE, anchor_y=0.22)
        fg_fitted = remove_solid_backdrop_flood(fitted_rgb)

    bg_src = Image.open(faction_bg_path)
    bg_out = grade_variant_bg(bg_src, variant_idx)

    # Composite full card portrait + subtle bottom obsidian gradient for nameplate contrast
    comp = bg_out.convert("RGBA")
    comp.alpha_composite(fg_fitted)
    comp_arr = np.array(comp.convert("RGB"), dtype=np.float32)
    y_norm = np.linspace(0.0, 1.0, HERO_SIZE[1], dtype=np.float32)[:, None, None]
    bottom_shade = np.clip((y_norm - 0.72) / 0.28, 0.0, 1.0) * 0.45
    comp_arr *= (1.0 - bottom_shade)
    full_img = Image.fromarray(np.clip(comp_arr, 0, 255).astype(np.uint8), "RGB")

    fg_fitted.save(os.path.join(out_dir, f"hero_{hero_id}_fg.png"), "PNG")
    bg_out.save(os.path.join(out_dir, f"hero_{hero_id}_bg.png"), "PNG")
    full_img.save(os.path.join(out_dir, f"hero_{hero_id}_full.png"), "PNG")
    print(f"[process-hero] OK: hero_{hero_id}_{{fg,bg,full}}.png -> {out_dir}")


def process_card(raw_card_path: str, out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    raw = Image.open(raw_card_path).convert("RGB")
    fitted = fit_cover(raw, CARD_SIZE, anchor_y=0.5)

    # Gentle top-left ink corner vignette so Rank+Suit badge always passes WCAG AAA
    arr = np.array(fitted, dtype=np.float32)
    yy, xx = np.mgrid[0:CARD_SIZE[1], 0:CARD_SIZE[0]].astype(np.float32)
    dist = np.sqrt((xx / 170.0) ** 2 + (yy / 210.0) ** 2)
    corner_mask = np.clip(1.0 - dist, 0.0, 1.0) ** 1.8
    arr *= (1.0 - corner_mask[:, :, None] * 0.58)
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    out.save(out_path, "PNG")
    print(f"[process-card] OK: {out_path} ({CARD_SIZE[0]}x{CARD_SIZE[1]})")


def process_backdrop(raw_path: str, out_path: str, width: int, height: int) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    raw = Image.open(raw_path).convert("RGB")
    fitted = fit_cover(raw, (width, height), anchor_y=0.5)
    fitted.save(out_path, "PNG")
    print(f"[process-backdrop] OK: {out_path} ({width}x{height})")


def copy_u1_baselines(repo_root: str, u5_root: str) -> None:
    u1_dir = os.path.join(repo_root, "art-studio", "u1-slice", "illustrations")
    heroes_dir = os.path.join(u5_root, "heroes")
    cards_dir = os.path.join(u5_root, "cards")
    backdrops_dir = os.path.join(u5_root, "backdrops")
    faction_bgs = os.path.join(u5_root, "faction_bgs")
    for d in (heroes_dir, cards_dir, backdrops_dir, faction_bgs):
        os.makedirs(d, exist_ok=True)

    for suffix in ("bg", "fg", "full"):
        shutil.copy2(
            os.path.join(u1_dir, f"hero_trieu_thien_hanh_{suffix}.png"),
            os.path.join(heroes_dir, f"hero_trieu_thien_hanh_{suffix}.png"),
        )
    shutil.copy2(
        os.path.join(u1_dir, "hero_trieu_thien_hanh_bg.png"),
        os.path.join(faction_bgs, "bg_thanh_van.png"),
    )
    for card in ("card_sat.png", "card_dao.png"):
        shutil.copy2(os.path.join(u1_dir, card), os.path.join(cards_dir, card))
    shutil.copy2(os.path.join(u1_dir, "card_back_cuu_chau.png"), os.path.join(backdrops_dir, "card_back_cuu_chau.png"))
    table_src = os.path.join(repo_root, "art-studio", "u1-slice", "blender", "renders", "table_board_25d.png")
    if os.path.exists(table_src):
        shutil.copy2(table_src, os.path.join(backdrops_dir, "table_board_25d.png"))
    print("[copy-u1] Copied U1 baseline heroes, cards & backdrops into u5-production.")


def build_contact_sheets(u5_root: str) -> int:
    font_path = os.path.join(os.path.dirname(u5_root), "u1-slice", "fonts", "BeVietnamPro-Bold.ttf")
    font = ImageFont.truetype(font_path, 16) if os.path.exists(font_path) else ImageFont.load_default()

    # 1. 25 Heroes (5x5 sheet)
    tw, th = 220, 286
    pad = 12
    sheet_h = Image.new("RGB", (5 * tw + 6 * pad, 5 * (th + 24) + 6 * pad), (18, 15, 13))
    draw_h = ImageDraw.Draw(sheet_h)
    missing_h = []
    for idx, hid in enumerate(HERO_IDS):
        r, c = divmod(idx, 5)
        x = pad + c * (tw + pad)
        y = pad + r * (th + 24 + pad)
        p = os.path.join(u5_root, "heroes", f"hero_{hid}_full.png")
        if os.path.exists(p):
            tile = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            sheet_h.paste(tile, (x, y))
        else:
            missing_h.append(hid)
            draw_h.rectangle((x, y, x + tw, y + th), outline=(220, 70, 60), width=3)
        draw_h.text((x + 4, y + th + 4), hid, fill=(240, 224, 175), font=font)
    sheet_h.save(os.path.join(u5_root, "u5_heroes_25_sheet.png"), "PNG")

    # 2. 36 Cards (6x6 sheet)
    cw, ch = 224, 182
    sheet_c = Image.new("RGB", (6 * cw + 7 * pad, 6 * (ch + 24) + 7 * pad), (18, 15, 13))
    draw_c = ImageDraw.Draw(sheet_c)
    missing_c = []
    for idx, ck in enumerate(CARD_KEYS):
        r, c = divmod(idx, 6)
        x = pad + c * (cw + pad)
        y = pad + r * (ch + 24 + pad)
        p = os.path.join(u5_root, "cards", f"card_{ck}.png")
        if os.path.exists(p):
            tile = Image.open(p).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            sheet_c.paste(tile, (x, y))
        else:
            missing_c.append(ck)
            draw_c.rectangle((x, y, x + cw, y + ch), outline=(220, 70, 60), width=3)
        draw_c.text((x + 4, y + ch + 4), ck, fill=(240, 224, 175), font=font)
    sheet_c.save(os.path.join(u5_root, "u5_cards_36_sheet.png"), "PNG")

    print(f"[build-sheets] Heroes missing={len(missing_h)} {missing_h}; Cards missing={len(missing_c)} {missing_c}")
    return 0 if (not missing_h and not missing_c) else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_u1 = sub.add_parser("copy-u1")
    p_u1.add_argument("--repo-root", required=True)
    p_u1.add_argument("--u5-root", required=True)

    p_h = sub.add_parser("process-hero")
    p_h.add_argument("--raw-fg", required=True)
    p_h.add_argument("--faction-bg", required=True)
    p_h.add_argument("--out-dir", required=True)
    p_h.add_argument("--hero-id", required=True)
    p_h.add_argument("--variant-idx", type=int, default=0)

    p_c = sub.add_parser("process-card")
    p_c.add_argument("--raw", required=True)
    p_c.add_argument("--out", required=True)

    p_b = sub.add_parser("process-backdrop")
    p_b.add_argument("--raw", required=True)
    p_b.add_argument("--out", required=True)
    p_b.add_argument("--width", type=int, default=1920)
    p_b.add_argument("--height", type=int, default=1080)

    p_s = sub.add_parser("build-sheets")
    p_s.add_argument("--u5-root", required=True)

    args = parser.parse_args()
    if args.cmd == "copy-u1":
        copy_u1_baselines(args.repo_root, args.u5_root)
        return 0
    if args.cmd == "process-hero":
        process_hero(args.raw_fg, args.faction_bg, args.out_dir, args.hero_id, args.variant_idx)
        return 0
    if args.cmd == "process-card":
        process_card(args.raw, args.out)
        return 0
    if args.cmd == "process-backdrop":
        process_backdrop(args.raw, args.out, args.width, args.height)
        return 0
    if args.cmd == "build-sheets":
        return build_contact_sheets(args.u5_root)
    return 1


if __name__ == "__main__":
    sys.exit(main())
