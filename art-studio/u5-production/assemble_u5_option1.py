"""Assemble Chặng U5/U6 Gongbi Upgrade: auto-discover Gongbi hero PNGs/JPGs, split 2x2 card sheets, and fill any remaining slots from Step 5."""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import process_u5_art as p5  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ARTIFACTS_DIR = r"C:\Users\kyuu4\.gemini\antigravity\brain\e532a221-df0c-4bcb-95bf-d43cc847c2bf"
DESKTOP_HEROES = os.path.join(REPO_ROOT, "apps", "desktop", "src", "assets", "art", "heroes")
DESKTOP_CARDS = os.path.join(REPO_ROOT, "apps", "desktop", "src", "assets", "art", "cards")

HERO_FACTION = {
    "lam_thanh_vu": "thanh_van",
    "trieu_thien_hanh": "thanh_van",
    "loi_chan_son": "thanh_van",
    "tham_tinh_ha": "thanh_van",
    "bach_ngoc_thanh": "thanh_van",
    "khuong_vo_ta": "thanh_van",
    "to_mong_dao": "thanh_van",
    "han_thiet_phong": "huyen_thiet",
    "co_huyen_co": "huyen_thiet",
    "nghiem_cuong": "huyen_thiet",
    "truong_huy_dieu": "huyen_thiet",
    "thach_pha_thien": "huyen_thiet",
    "ly_tri_vi": "huyen_thiet",
    "thuy_u_linh": "huyen_thiet",
    "viem_liet_vuong": "xich_diem",
    "cam_da_sat": "xich_diem",
    "luc_tram_an": "xich_diem",
    "hoang_bat_dich": "xich_diem",
    "tieu_viem_lang": "xich_diem",
    "ha_tuyet_nghi": "xich_diem",
    "mo_dung_tuyet": "xich_diem",
    "bach_cam_y": "xich_diem",
    "duoc_vo_uu": "u_minh",
    "tham_mac_ngon": "u_minh",
    "da_vo_ngan": "u_minh",
}

CARD_SHEETS = [
    ("cardsheet_1_core", ["pha_giap_tram", "thiem", "quyet_dau", "vo_giai_kha_kich"]),
    ("cardsheet_2_scrolls_a", ["thuan_thu_khien_duong", "qua_ha_sai_cau", "kinh_loi_chan", "ta_dao_sat_nhan"]),
    ("cardsheet_3_scrolls_b", ["nam_man_nhap_xam", "van_tien_te_phat", "dao_vien_ket_nghia", "ngu_coc_phong_dang"]),
    ("cardsheet_4_scrolls_c", ["chan_khi_ho_the", "lac_bat_tu_thuc", "thiem_dien", "gia_cat_lien_no"]),
    ("cardsheet_5_weapons_a", ["tu_hung_song_co_kiem", "thanh_cong_kiem", "han_bang_kiem", "tu_khi_hoan"]),
    ("cardsheet_6_weapons_b", ["thanh_long_yen_nguyet_dao", "truong_bat_xa_mau", "quan_thach_phu", "phuong_thien_hoa_kich"]),
    ("cardsheet_7_armor_mount", ["ky_lan_cung", "bat_quai_tran", "hoan_anh_giap", "tuyet_anh"]),
    ("cardsheet_8_mounts", ["trao_hoang_phi_dien", "xich_tho", "dai_uyen", "tu_tinh"]),
]


def find_artifact_optional(prefix: str) -> str | None:
    """Return newest matching artifact (<prefix>_*.jpg) or None if not generated yet."""
    matches = sorted(glob.glob(os.path.join(ARTIFACTS_DIR, f"{prefix}_*.jpg")))
    if not matches:
        # Also allow exact <prefix>.jpg / <prefix>.png in _raw or artifacts
        for candidate in (
            os.path.join(ARTIFACTS_DIR, f"{prefix}.jpg"),
            os.path.join(ARTIFACTS_DIR, f"{prefix}.png"),
            os.path.join(HERE, "_raw", f"{prefix}.png"),
            os.path.join(HERE, "_raw", f"{prefix}.jpg"),
        ):
            if os.path.exists(candidate):
                return candidate
        return None
    return matches[-1]


def find_artifact(prefix: str) -> str:
    found = find_artifact_optional(prefix)
    if not found:
        raise FileNotFoundError(f"Missing artifact for {prefix}_*.jpg in {ARTIFACTS_DIR}")
    return found


def split_card_sheet(sheet_path: str, card_keys: list[str], split_dir: str) -> list[str]:
    """Split a 2x2 borderless sheet into 4 cropped quadrant PNGs, trimming center cross divider cleanly."""
    os.makedirs(split_dir, exist_ok=True)
    img = Image.open(sheet_path).convert("RGB")
    w, h = img.size
    mx = w // 2
    my = h // 2
    # Trim 2% outer margin + 3.5% half-gutter around center horizontal & vertical dividers
    ox = int(round(w * 0.015))
    oy = int(round(h * 0.015))
    gx = int(round(w * 0.032))
    gy = int(round(h * 0.035))

    boxes = [
        (ox, oy, mx - gx, my - gy),           # Top-Left
        (mx + gx, oy, w - ox, my - gy),       # Top-Right
        (ox, my + gy, mx - gx, h - oy),       # Bottom-Left
        (mx + gx, my + gy, w - ox, h - oy),   # Bottom-Right
    ]

    out_paths = []
    for ck, box in zip(card_keys, boxes):
        crop = img.crop(box)
        p = os.path.join(split_dir, f"split_{ck}.png")
        crop.save(p, "PNG")
        out_paths.append(p)
    return out_paths


def process_fallback_hero(webp_path: str, faction_bg_path: str, out_dir: str, hero_id: str, variant_idx: int) -> None:
    """Upscale Step-5 portrait + smooth cosine border alpha so it blends into 2.5D faction BG & passes --require-alpha."""
    os.makedirs(out_dir, exist_ok=True)
    src = Image.open(webp_path).convert("RGB")
    fitted = p5.fit_cover(src, p5.HERO_SIZE, anchor_y=0.18)

    w, h = p5.HERO_SIZE
    xx = np.arange(w, dtype=np.float32)[None, :]
    yy = np.arange(h, dtype=np.float32)[:, None]

    def ramp(d: np.ndarray, pad: float, feather: float) -> np.ndarray:
        t = np.clip((d - pad) / feather, 0.0, 1.0)
        return 0.5 - 0.5 * np.cos(t * np.pi)

    alpha = ramp(xx, 18.0, 56.0) * ramp((w - 1) - xx, 18.0, 56.0) * ramp(yy, 14.0, 48.0) * ramp((h - 1) - yy, 4.0, 18.0)
    fg_arr = np.zeros((h, w, 4), dtype=np.uint8)
    fg_arr[:, :, :3] = np.array(fitted, dtype=np.uint8)
    fg_arr[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    fg_img = Image.fromarray(fg_arr, "RGBA")

    bg_img = p5.grade_variant_bg(Image.open(faction_bg_path), variant_idx)
    comp = bg_img.convert("RGBA")
    comp.alpha_composite(fg_img)
    comp_arr = np.array(comp.convert("RGB"), dtype=np.float32)
    y_norm = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    comp_arr *= (1.0 - np.clip((y_norm - 0.72) / 0.28, 0.0, 1.0) * 0.45)
    full_img = Image.fromarray(np.clip(comp_arr, 0, 255).astype(np.uint8), "RGB")

    fg_img.save(os.path.join(out_dir, f"hero_{hero_id}_fg.png"), "PNG")
    bg_img.save(os.path.join(out_dir, f"hero_{hero_id}_bg.png"), "PNG")
    full_img.save(os.path.join(out_dir, f"hero_{hero_id}_full.png"), "PNG")


def main() -> int:
    p5.copy_u1_baselines(REPO_ROOT, HERE)
    faction_dir = os.path.join(HERE, "faction_bgs")
    heroes_dir = os.path.join(HERE, "heroes")
    cards_dir = os.path.join(HERE, "cards")
    backdrops_dir = os.path.join(HERE, "backdrops")
    split_dir = os.path.join(HERE, "_raw", "card_splits")

    # 1. Process 3 Gongbi faction BGs (800x1040 RGB)
    for fk in ("huyen_thiet", "xich_diem", "u_minh"):
        art = find_artifact(f"bg_{fk}")
        bg_out = p5.fit_cover(Image.open(art).convert("RGB"), p5.HERO_SIZE, anchor_y=0.5)
        bg_out.save(os.path.join(faction_dir, f"bg_{fk}.png"), "PNG")
        print(f"[faction-bg] OK: bg_{fk}.png")

    # 2. Process Lobby Hall Backdrop (1920x1080 RGB)
    p5.process_backdrop(find_artifact("lobby_hall_backdrop"), os.path.join(backdrops_dir, "lobby_hall_backdrop.png"), 1920, 1080)

    # 3. Process 24 remaining heroes (preferring newest raw_<heroId>_*.jpg Gongbi cutout; fallback Step-5 webp if absent)
    gongbi_heroes = ["trieu_thien_hanh"]
    fallback_heroes = []
    for idx, hero_id in enumerate(p5.HERO_IDS):
        if hero_id == "trieu_thien_hanh":
            continue
        faction_bg = os.path.join(faction_dir, f"bg_{HERO_FACTION[hero_id]}.png")
        raw_hero = find_artifact_optional(f"raw_{hero_id}")
        if raw_hero:
            p5.process_hero(raw_hero, faction_bg, heroes_dir, hero_id, idx)
            gongbi_heroes.append(hero_id)
        else:
            fallback_src = os.path.join(DESKTOP_HEROES, f"{hero_id}.webp")
            if not os.path.exists(fallback_src):
                raise FileNotFoundError(f"Missing fallback hero webp: {fallback_src}")
            process_fallback_hero(fallback_src, faction_bg, heroes_dir, hero_id, idx)
            fallback_heroes.append(hero_id)
            print(f"[fallback-hero] OK: hero_{hero_id}_{{fg,bg,full}}.png")

    # 4. Discover & split any completed 2x2 Gongbi card sheets first
    split_card_sources: dict[str, str] = {}
    for sheet_prefix, keys in CARD_SHEETS:
        sheet_path = find_artifact_optional(sheet_prefix)
        if sheet_path:
            cropped_paths = split_card_sheet(sheet_path, keys, split_dir)
            for ck, cp in zip(keys, cropped_paths):
                split_card_sources[ck] = cp
            print(f"[split-sheet] OK: {os.path.basename(sheet_path)} -> {keys}")

    # 5. Process all 34 remaining cards (prefer single card_<key> -> split sheet -> Step-5 fallback)
    gongbi_cards = ["sat", "dao"]
    fallback_cards = []
    for ck in p5.CARD_KEYS:
        if ck in ("sat", "dao"):
            continue
        out_path = os.path.join(cards_dir, f"card_{ck}.png")
        single_art = find_artifact_optional(f"card_{ck}")
        if single_art:
            p5.process_card(single_art, out_path)
            gongbi_cards.append(ck)
        elif ck in split_card_sources:
            p5.process_card(split_card_sources[ck], out_path)
            gongbi_cards.append(ck)
        else:
            fallback_src = os.path.join(DESKTOP_CARDS, f"{ck}.webp")
            if not os.path.exists(fallback_src):
                raise FileNotFoundError(f"Missing fallback card webp: {fallback_src}")
            p5.process_card(fallback_src, out_path)
            fallback_cards.append(ck)

    # 6. Write updated Gongbi Upgrade Manifest
    nghiem_cuong_newest = os.path.basename(find_artifact_optional("raw_nghiem_cuong") or "")
    redraw_rec = [] if "1795803" in nghiem_cuong_newest or "nghiem_cuong" not in nghiem_cuong_newest else ["nghiem_cuong"]
    manifest = {
        "mode": (
            "100% Gongbi Completed (64/64)"
            if (not fallback_heroes and not fallback_cards)
            else f"Partial Gongbi Upgrade ({len(gongbi_heroes)}/25 Heroes, {len(gongbi_cards)}/36 Cards, 3/3 Backdrops)"
        ),
        "gongbi_completed": {
            "backdrops": ["lobby_hall_backdrop", "table_board_25d", "card_back_cuu_chau"],
            "faction_bgs": ["bg_thanh_van", "bg_huyen_thiet", "bg_xich_diem", "bg_u_minh"],
            "heroes": sorted(gongbi_heroes),
            "cards": sorted(gongbi_cards),
        },
        "redraw_recommended": redraw_rec,
        "step5_temp_fallback": {
            "heroes": fallback_heroes,
            "cards": fallback_cards,
        },
    }
    with open(os.path.join(HERE, "gongbi_upgrade_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # 7. Build labeled 5x5 + 6x6 contact sheets
    rc = p5.build_contact_sheets(HERE)
    print(f"[assemble_u5_option1] Done. gongbi_heroes={len(gongbi_heroes)}/25, fallback_heroes={len(fallback_heroes)}, gongbi_cards={len(gongbi_cards)}/36, fallback_cards={len(fallback_cards)}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
