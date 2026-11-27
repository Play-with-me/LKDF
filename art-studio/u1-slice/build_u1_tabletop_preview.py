import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"c:\Tam quốc sát\art-studio\u1-slice")
BLENDER = ROOT / "blender" / "renders"
FIGMA = ROOT / "figma" / "exports"
ILLUST = ROOT / "illustrations"
FONTS = ROOT / "fonts"
OUT_MAIN = ROOT / "u1_tabletop_preview_1080p.png"
OUT_CLOSEUP = ROOT / "u1_closeup_showcase.png"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def nine_slice(img: Image.Image, target_w: int, target_h: int, border: int) -> Image.Image:
    """True 9-slice resize preserving corner ornaments 1:1."""
    img = img.convert("RGBA")
    sw, sh = img.size
    b = min(border, sw // 3, sh // 3, target_w // 3, target_h // 3)
    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))

    mid_sw = sw - 2 * b
    mid_sh = sh - 2 * b
    mid_tw = max(1, target_w - 2 * b)
    mid_th = max(1, target_h - 2 * b)

    # 4 corners
    out.paste(img.crop((0, 0, b, b)), (0, 0))
    out.paste(img.crop((sw - b, 0, sw, b)), (target_w - b, 0))
    out.paste(img.crop((0, sh - b, b, sh)), (0, target_h - b))
    out.paste(img.crop((sw - b, sh - b, sw, sh)), (target_w - b, target_h - b))

    # 4 edges
    out.paste(img.crop((b, 0, sw - b, b)).resize((mid_tw, b), Image.Resampling.LANCZOS), (b, 0))
    out.paste(img.crop((b, sh - b, sw - b, sh)).resize((mid_tw, b), Image.Resampling.LANCZOS), (b, target_h - b))
    out.paste(img.crop((0, b, b, sh - b)).resize((b, mid_th), Image.Resampling.LANCZOS), (0, b))
    out.paste(img.crop((sw - b, b, sw, sh - b)).resize((b, mid_th), Image.Resampling.LANCZOS), (target_w - b, b))

    # center
    out.paste(img.crop((b, b, sw - b, sh - b)).resize((mid_tw, mid_th), Image.Resampling.LANCZOS), (b, b))
    return out


def draw_text_outlined(
    draw: ImageDraw.ImageDraw,
    pos: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] = (12, 9, 7, 235),
    stroke_w: int = 2,
    anchor: str = "la",
):
    x, y = pos
    # subtle drop shadow
    draw.text((x + 1, y + 2), text, font=font, fill=(0, 0, 0, 175), anchor=anchor)
    draw.text(
        (x, y),
        text,
        font=font,
        fill=fill,
        stroke_width=stroke_w,
        stroke_fill=outline,
        anchor=anchor,
    )


def add_drop_shadow(img: Image.Image, offset=(8, 12), radius=14, opacity=165) -> tuple[Image.Image, tuple[int, int]]:
    pad = radius * 2 + max(abs(offset[0]), abs(offset[1]))
    w, h = img.size
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    alpha = img.getchannel("A")
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, opacity))
    shadow.putalpha(alpha.point(lambda a: int(a * opacity / 255)))
    canvas.paste(shadow, (pad + offset[0], pad + offset[1]))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius))
    canvas.alpha_composite(img, (pad, pad))
    return canvas, (pad, pad)


def cover_crop(img: Image.Image, tw: int, th: int, focus_y: float = 0.25) -> Image.Image:
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x0 = max(0, (nw - tw) // 2)
    y0 = max(0, min(nh - th, int((nh - th) * focus_y)))
    return resized.crop((x0, y0, x0 + tw, y0 + th))


def render_card(
    width: int,
    height: int,
    rank: str,
    suit_key: str,
    art_img: Image.Image,
    title: str,
    subtitle: str | None,
    card_frame_src: Image.Image,
    suits: dict[str, Image.Image],
    is_red: bool,
    highlight_gold: bool = False,
) -> Image.Image:
    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    frame = nine_slice(card_frame_src, width, height, border=max(24, int(width * 0.14)))
    card.alpha_composite(frame)

    pad_x = max(12, int(width * 0.085))
    pad_top = max(12, int(height * 0.065))
    art_w = width - 2 * pad_x
    art_h = int(height * 0.60)

    # Full-bleed painterly artwork inside upper window
    art_cropped = cover_crop(art_img.convert("RGBA"), art_w, art_h, focus_y=0.35)
    # Soft vignette on top-left corner so Rank + Suit pop cleanly
    vignette = Image.new("RGBA", (art_w, art_h), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for r_i in range(int(art_w * 0.42), 0, -4):
        alpha_v = int(115 * (1 - r_i / (art_w * 0.42)))
        vd.ellipse((-r_i * 0.4, -r_i * 0.4, r_i * 1.15, r_i * 1.3), fill=(16, 12, 9, alpha_v))
    # Bottom edge gradient into ebony title band
    for yy in range(int(art_h * 0.72), art_h):
        t = (yy - int(art_h * 0.72)) / max(1, art_h - int(art_h * 0.72))
        vd.line([(0, yy), (art_w, yy)], fill=(18, 13, 10, int(195 * t)))
    art_cropped.alpha_composite(vignette)
    card.alpha_composite(art_cropped, (pad_x, pad_top))

    # Crisp dark bronze inner border around art window
    d = ImageDraw.Draw(card)
    d.rectangle(
        [pad_x, pad_top, pad_x + art_w - 1, pad_top + art_h - 1],
        outline=(200, 155, 75, 220) if highlight_gold else (96, 68, 32, 220),
        width=2,
    )

    # Title plaque band on lower warm silk
    bar_y0 = pad_top + art_h + 4
    bar_y1 = height - max(14, int(height * 0.075))
    d.rectangle([pad_x, bar_y0, width - pad_x, bar_y1], fill=(22, 16, 12, 235), outline=(196, 152, 74, 210), width=2)

    # Rank + Suit column at top-left
    rank_size = max(20, int(width * 0.165))
    f_rank = load_font("JetBrainsMono-Bold.ttf", rank_size)
    rank_col = (240, 88, 76, 255) if is_red else (246, 234, 206, 255)
    rx = pad_x + int(width * 0.115)
    ry = pad_top + int(height * 0.085)
    draw_text_outlined(d, (rx, ry), rank, f_rank, rank_col, stroke_w=3, anchor="mm")

    suit_sz = max(22, int(width * 0.175))
    suit_im = suits[suit_key].resize((suit_sz, suit_sz), Image.Resampling.LANCZOS)
    card.alpha_composite(suit_im, (rx - suit_sz // 2, ry + int(rank_size * 0.56)))

    # Card title (bold Noto Serif >= 18px)
    title_sz = max(18, int(width * 0.108))
    f_title = load_font("NotoSerif-Bold.ttf", title_sz)
    ty = (bar_y0 + bar_y1) // 2 - (int(height * 0.032) if subtitle else 0)
    draw_text_outlined(d, (width // 2, ty), title, f_title, (248, 236, 208, 255), stroke_w=2, anchor="mm")

    if subtitle:
        sub_sz = max(15, int(width * 0.062))
        f_sub = load_font("BeVietnamPro-SemiBold.ttf", sub_sz)
        draw_text_outlined(d, (width // 2, ty + int(title_sz * 1.12)), subtitle, f_sub, (216, 174, 96, 255), stroke_w=1, anchor="mm")

    if highlight_gold:
        d.rectangle([3, 3, width - 4, height - 4], outline=(246, 214, 134, 245), width=4)

    return card


def render_seat_plaque(
    w: int,
    h: int,
    hero_name: str,
    role_tag: str,
    faction_img: Image.Image,
    hp_curr: int,
    hp_max: int,
    hand_count: int,
    seat_frame_src: Image.Image,
    hp_orbs: dict[str, Image.Image],
    bg_img: Image.Image | None,
    fg_img: Image.Image | None,
    is_target: bool = False,
    equip_lines: list[str] | None = None,
) -> Image.Image:
    plaque = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    frame = nine_slice(seat_frame_src, w, h, border=44)
    plaque.alpha_composite(frame)

    inner_x, inner_y = 14, 14
    inner_w, inner_h = w - 28, h - 28

    # Right-bleed 2.5D portrait window
    if bg_img is not None:
        port = Image.new("RGBA", (inner_w, inner_h), (20, 16, 13, 255))
        bg_crop = cover_crop(bg_img.convert("RGBA"), inner_w, inner_h, focus_y=0.25)
        port.alpha_composite(bg_crop)
        if fg_img is not None:
            # Slightly scale & shift right for dramatic Gwent full-bleed portrait composition
            fg_h = int(inner_h * 1.32)
            fg_w = int(fg_img.width * (fg_h / fg_img.height))
            fg_scaled = fg_img.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
            fx = inner_w - int(fg_w * 0.88)
            fy = -int(inner_h * 0.08)
            port.alpha_composite(fg_scaled, (fx, fy))

        # 3-stop dark lacquer readability fade on left 58%
        fade = Image.new("RGBA", (inner_w, inner_h), (0, 0, 0, 0))
        fd = ImageDraw.Draw(fade)
        for xx in range(inner_w):
            ratio = xx / max(1, inner_w - 1)
            if ratio < 0.42:
                a = 215
            elif ratio < 0.78:
                a = int(215 * (1 - (ratio - 0.42) / 0.36) * 0.92)
            else:
                a = 22
            fd.line([(xx, 0), (xx, inner_h)], fill=(18, 14, 11, a))
        port.alpha_composite(fade)
        plaque.alpha_composite(port, (inner_x, inner_y))

    d = ImageDraw.Draw(plaque)

    # Faction seal top-left
    f_sz = 42 if w >= 360 else 36
    plaque.alpha_composite(faction_img.resize((f_sz, f_sz), Image.Resampling.LANCZOS), (inner_x + 8, inner_y + 8))

    # Warrior Name (Noto Serif Bold >= 19px)
    name_sz = 24 if w >= 360 else 20
    draw_text_outlined(
        d,
        (inner_x + f_sz + 16, inner_y + 12),
        hero_name,
        load_font("NotoSerif-Bold.ttf", name_sz),
        (246, 236, 214, 255),
        stroke_w=2,
        anchor="la",
    )

    # Role / Identity subtle gold tag
    role_sz = 16 if w >= 360 else 15
    draw_text_outlined(
        d,
        (inner_x + f_sz + 16, inner_y + 12 + name_sz + 6),
        role_tag,
        load_font("BeVietnamPro-SemiBold.ttf", role_sz),
        (216, 174, 96, 255),
        stroke_w=1,
        anchor="la",
    )

    # 3D Blender HP Orbs row
    orb_sz = 34 if w >= 360 else 28
    orb_y = inner_y + (76 if w >= 360 else 68)
    orb_key = "jade" if hp_curr >= 3 else ("amber" if hp_curr == 2 else "crimson")
    for idx in range(hp_max):
        ox = inner_x + 10 + idx * (orb_sz + 5)
        img_orb = hp_orbs[orb_key] if idx < hp_curr else hp_orbs["empty"]
        plaque.alpha_composite(img_orb.resize((orb_sz, orb_sz), Image.Resampling.LANCZOS), (ox, orb_y))

    # Numeric HP readout (JetBrains Mono >= 18px)
    draw_text_outlined(
        d,
        (inner_x + 14 + hp_max * (orb_sz + 5), orb_y + orb_sz // 2),
        f"{hp_curr}/{hp_max}",
        load_font("JetBrainsMono-Bold.ttf", 19 if w >= 360 else 17),
        (245, 235, 214, 255),
        stroke_w=2,
        anchor="lm",
    )

    # Equipment chips or hand count
    if equip_lines:
        eq_y = orb_y + orb_sz + 14
        eq_w = (w - 44) // 2
        f_eq = load_font("BeVietnamPro-SemiBold.ttf", 15)
        for i, label in enumerate(equip_lines[:4]):
            col = i % 2
            row = i // 2
            ex = inner_x + 8 + col * (eq_w + 8)
            ey = eq_y + row * 34
            filled = not label.startswith("Trống")
            d.rectangle(
                [ex, ey, ex + eq_w, ey + 28],
                fill=(26, 20, 15, 215) if filled else (18, 15, 12, 130),
                outline=(196, 152, 74, 200) if filled else (92, 74, 48, 120),
                width=1,
            )
            if filled:
                draw_text_outlined(d, (ex + 10, ey + 14), label, f_eq, (242, 228, 198, 255), stroke_w=1, anchor="lm")
    else:
        draw_text_outlined(
            d,
            (inner_x + 12, h - 28),
            f"Bài trên tay: {hand_count}",
            load_font("BeVietnamPro-SemiBold.ttf", 16),
            (222, 199, 156, 255),
            stroke_w=1,
            anchor="lm",
        )

    if is_target:
        d.rectangle([4, 4, w - 5, h - 5], outline=(246, 210, 118, 255), width=4)

    return plaque


def draw_bezier_silk_arrow(canvas: Image.Image, p0, p1, p2, arrowhead: Image.Image):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    pts = []
    steps = 80
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        pts.append((x, y))

    # Warm cinnabar-gold outer aura
    od.line(pts, fill=(214, 96, 46, 115), width=22, joint="curve")
    overlay_glow = overlay.filter(ImageFilter.GaussianBlur(7))
    canvas.alpha_composite(overlay_glow)

    # Crisp golden silk ribbon core
    core = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(core)
    cd.line(pts, fill=(208, 62, 52, 235), width=9, joint="curve")
    cd.line(pts, fill=(246, 218, 138, 255), width=4, joint="curve")
    canvas.alpha_composite(core)

    # Rotate & place Figma golden sword-tip arrowhead along final tangent
    dx = pts[-1][0] - pts[-4][0]
    dy = pts[-1][1] - pts[-4][1]
    angle_deg = -math.degrees(math.atan2(dy, dx)) - 90
    ah = arrowhead.resize((68, 68), Image.Resampling.LANCZOS).rotate(angle_deg, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(ah, (int(p2[0] - ah.width / 2), int(p2[1] - ah.height / 2)))


def main():
    table = Image.open(BLENDER / "table_board_25d.png").convert("RGBA").resize((1920, 1080), Image.Resampling.LANCZOS)
    card_frame = Image.open(BLENDER / "card_frame_9slice.png").convert("RGBA")
    seat_frame = Image.open(BLENDER / "seat_frame_9slice.png").convert("RGBA")
    scroll_frame = Image.open(BLENDER / "silk_scroll_tooltip_9slice.png").convert("RGBA")

    hp_orbs = {
        "jade": Image.open(BLENDER / "hp_jade_full.png").convert("RGBA"),
        "amber": Image.open(BLENDER / "hp_amber_mid.png").convert("RGBA"),
        "crimson": Image.open(BLENDER / "hp_crimson_low.png").convert("RGBA"),
        "empty": Image.open(BLENDER / "hp_socket_empty.png").convert("RGBA"),
    }
    seal_log = Image.open(BLENDER / "seal_battle_log.png").convert("RGBA")
    seal_gear = Image.open(BLENDER / "seal_settings_gear.png").convert("RGBA")

    suits = {
        "spade": Image.open(FIGMA / "suit_spade.png").convert("RGBA"),
        "club": Image.open(FIGMA / "suit_club.png").convert("RGBA"),
        "heart": Image.open(FIGMA / "suit_heart.png").convert("RGBA"),
        "diamond": Image.open(FIGMA / "suit_diamond.png").convert("RGBA"),
    }
    factions = {
        "thien_kiem": Image.open(FIGMA / "faction_thien_kiem.png").convert("RGBA"),
        "huyen_thiet": Image.open(FIGMA / "faction_huyen_thiet.png").convert("RGBA"),
        "giang_nam": Image.open(FIGMA / "faction_giang_nam.png").convert("RGBA"),
        "an_sat": Image.open(FIGMA / "faction_an_sat.png").convert("RGBA"),
    }
    reticle = Image.open(FIGMA / "target_reticle_ring.png").convert("RGBA")
    arrowhead = Image.open(FIGMA / "arrow_head_silk.png").convert("RGBA")
    cta_btn_src = Image.open(FIGMA / "action_button_primary_9slice.png").convert("RGBA")

    hero_bg = Image.open(ILLUST / "hero_trieu_thien_hanh_bg.png").convert("RGBA")
    hero_fg = Image.open(ILLUST / "hero_trieu_thien_hanh_fg.png").convert("RGBA")
    art_sat = Image.open(ILLUST / "card_sat.png").convert("RGBA")
    art_dao = Image.open(ILLUST / "card_dao.png").convert("RGBA")
    art_back = Image.open(ILLUST / "card_back_cuu_chau.png").convert("RGBA")

    canvas = table.copy()
    d = ImageDraw.Draw(canvas)

    # 1. Floating Diegetic Header (Zero web navbar box, cleanly inside safe table frame!)
    draw_text_outlined(
        d,
        (92, 48),
        "CỬU CHÂU ẨN KIẾM   ·   Vòng 3   ·   Bài rút: 54",
        load_font("NotoSerif-Bold.ttf", 22),
        (246, 224, 166, 255),
        stroke_w=2,
        anchor="lm",
    )

    # 2. Top-Right HUD: STRICTLY 2 Cast-Bronze Seals (56x56px >= 48x48px, cleanly inside frame)
    s_log_im, pad_l = add_drop_shadow(seal_log.resize((56, 56), Image.Resampling.LANCZOS), offset=(3, 5), radius=6)
    s_gear_im, pad_g = add_drop_shadow(seal_gear.resize((56, 56), Image.Resampling.LANCZOS), offset=(3, 5), radius=6)
    canvas.alpha_composite(s_log_im, (1728 - pad_l[0], 26 - pad_l[1]))
    canvas.alpha_composite(s_gear_im, (1800 - pad_g[0], 26 - pad_g[1]))

    # 3. Opponent Seats (Top Row — 3 clean warrior plaques)
    seat_l = render_seat_plaque(
        304, 152, "Mộ Dung Tuyết", "Ẩn Thân · Tầm 1", factions["giang_nam"], 3, 3, 3,
        seat_frame, hp_orbs, hero_bg, None, is_target=False,
    )
    seat_c = render_seat_plaque(
        344, 168, "Triệu Thiên Hành", "Minh Chủ · Đang nhắm", factions["thien_kiem"], 3, 4, 4,
        seat_frame, hp_orbs, hero_bg, hero_fg, is_target=True,
    )
    seat_r = render_seat_plaque(
        304, 152, "Lôi Chấn Sơn", "Ẩn Thân · Tầm 2", factions["huyen_thiet"], 1, 4, 2,
        seat_frame, hp_orbs, hero_bg, None, is_target=False,
    )

    for im, pos in [(seat_l, (340, 92)), (seat_c, (788, 82)), (seat_r, (1276, 92))]:
        sh_im, pad = add_drop_shadow(im, offset=(6, 10), radius=12)
        canvas.alpha_composite(sh_im, (pos[0] - pad[0], pos[1] - pad[1]))

    # Glowing Wuxia target reticle framed cleanly over portrait focal side (zero text obstruction)
    ret_scaled = reticle.resize((164, 164), Image.Resampling.LANCZOS)
    canvas.alpha_composite(ret_scaled, (788 + 258 - 82, 82 + 84 - 82))

    # 4. Center Table: Draw Pile + Played Card + Turn Banner
    # Draw pile stack (3 cards offset)
    back_w, back_h = 132, 182
    back_card = art_back.resize((back_w, back_h), Image.Resampling.LANCZOS)
    for k in range(3):
        sh_b, pb = add_drop_shadow(back_card, offset=(4, 6), radius=8)
        canvas.alpha_composite(sh_b, (690 - k * 4 - pb[0], 350 - k * 4 - pb[1]))
    draw_text_outlined(d, (690 + back_w // 2, 550), "Rút: 54", load_font("JetBrainsMono-Bold.ttf", 19), (242, 224, 178, 255), stroke_w=2, anchor="mm")

    # Last played card on table
    played_dao = render_card(156, 218, "Q", "heart", art_dao, "LINH ĐAN", None, card_frame, suits, is_red=True)
    played_rot = played_dao.rotate(4, resample=Image.Resampling.BICUBIC, expand=True)
    sh_p, pp = add_drop_shadow(played_rot, offset=(8, 12), radius=14)
    canvas.alpha_composite(sh_p, (892 - pp[0], 332 - pp[1]))

    # Clean diegetic phase banner below center
    draw_text_outlined(
        d,
        (960, 588),
        "LƯỢT CỦA BẠN  —  PHA XUẤT CHIÊU  (18s)",
        load_font("NotoSerif-Bold.ttf", 20),
        (246, 216, 138, 255),
        stroke_w=2,
        anchor="mm",
    )
    # Golden fuse bar
    d.rounded_rectangle([790, 608, 1130, 616], radius=4, fill=(36, 28, 20, 220), outline=(146, 110, 52, 220), width=1)
    d.rounded_rectangle([792, 610, 1038, 614], radius=2, fill=(238, 178, 72, 255))

    # 5. Bottom-Left Self Warrior Dock (412x212px)
    self_dock = render_seat_plaque(
        412, 212, "Triệu Thiên Hành", "Thiên Kiếm Các · Chủ Minh", factions["thien_kiem"], 4, 4, 5,
        seat_frame, hp_orbs, hero_bg, hero_fg, is_target=False,
        equip_lines=["Hàn Băng Kiếm · Tầm 2", "Nhân Vương Thuẫn", "Xích Thố (-1)", "Trống"],
    )
    sh_self, p_self = add_drop_shadow(self_dock, offset=(6, 10), radius=14)
    canvas.alpha_composite(sh_self, (32 - p_self[0], 838 - p_self[1]))

    # 6. Bottom-Center Curved Arc-Fan Hand (@card-game: idle cards have ZERO paragraph text!)
    idle_specs = [
        (-13, 525, 868, "Q", "heart", art_dao, "LINH ĐAN", True),
        (-6, 650, 844, "K", "diamond", art_sat, "THÂN PHÁP", True),
        (7, 1048, 848, "9", "club", art_sat, "PHÁ GIÁP", False),
        (14, 1172, 874, "4", "heart", art_dao, "LINH ĐAN", True),
    ]
    for ang, cx, cy, rk, sk, art_im, ttl, red_flag in idle_specs:
        c_im = render_card(156, 218, rk, sk, art_im, ttl, None, card_frame, suits, is_red=red_flag)
        c_rot = c_im.rotate(ang, resample=Image.Resampling.BICUBIC, expand=True)
        sh_c, pc = add_drop_shadow(c_rot, offset=(6, 10), radius=12)
        canvas.alpha_composite(sh_c, (cx - c_rot.width // 2 - pc[0], cy - c_rot.height // 2 - pc[1]))

    # 7. Curved Bezier Silk Targeting Arrow from Hovered Card to bottom edge of Seat 5
    draw_bezier_silk_arrow(canvas, (876, 666), (848, 438), (960, 266), arrowhead)

    # 8. Hovered & Zoomed 1.75x Card (Lifted cleanly above fan!)
    hovered = render_card(
        248, 348, "7", "spade", art_sat, "TRẢM (SÁT)", "Cơ Bản · Tầm 1",
        card_frame, suits, is_red=False, highlight_gold=True,
    )
    sh_hv, phv = add_drop_shadow(hovered, offset=(12, 18), radius=20, opacity=205)
    canvas.alpha_composite(sh_hv, (752 - phv[0], 668 - phv[1]))

    # 9. Paired Silk Scroll Explanation beside Hovered Card (Elevated cleanly above right idle fan!)
    scroll_w, scroll_h = 436, 232
    scroll_im = nine_slice(scroll_frame, scroll_w, scroll_h, border=46)
    sd = ImageDraw.Draw(scroll_im)
    draw_text_outlined(sd, (36, 44), "TRẢM (SÁT) · CHIÊU CÔNG KÍCH", load_font("NotoSerif-Bold.ttf", 19), (246, 218, 138, 255), stroke_w=1, anchor="la")
    draw_text_outlined(sd, (36, 76), "Mục tiêu hợp lệ: Triệu Thiên Hành (Tầm 1)", load_font("BeVietnamPro-SemiBold.ttf", 16), (206, 168, 96, 255), stroke_w=1, anchor="la")
    body_lines = [
        "Trong pha Xuất Chiêu, chọn 1 hiệp khách",
        "trong tầm vũ khí để tung đòn Trảm. Nếu đối",
        "phương không đánh Thân Pháp hóa giải,",
        "mục tiêu mất 1 điểm Sinh Lực.",
    ]
    f_body = load_font("BeVietnamPro-Regular.ttf", 16)
    for li, line in enumerate(body_lines):
        sd.text((36, 108 + li * 24), line, font=f_body, fill=(239, 230, 213, 255))
    sh_sc, psc = add_drop_shadow(scroll_im, offset=(8, 14), radius=16)
    canvas.alpha_composite(sh_sc, (1240 - psc[0], 568 - psc[1]))

    # 10. Bottom-Right Primary Command Plaque (Figma 9-slice cinnabar button, zero web pill, zero tofu arrow!)
    cta_w, cta_h = 344, 84
    cta_im = nine_slice(cta_btn_src, cta_w, cta_h, border=28)
    cd = ImageDraw.Draw(cta_im)
    draw_text_outlined(
        cd,
        (cta_w // 2, cta_h // 2),
        "Xuất Trảm · Triệu Thiên Hành",
        load_font("NotoSerif-Bold.ttf", 19),
        (255, 246, 222, 255),
        stroke_w=2,
        anchor="mm",
    )
    sh_cta, pcta = add_drop_shadow(cta_im, offset=(6, 10), radius=14)
    canvas.alpha_composite(sh_cta, (1522 - pcta[0], 952 - pcta[1]))

    # Secondary button (subtle obsidian plaque)
    sec = nine_slice(seat_frame, 248, 52, border=16)
    secd = ImageDraw.Draw(sec)
    draw_text_outlined(secd, (124, 26), "Kết Thúc Lượt [E]", load_font("BeVietnamPro-SemiBold.ttf", 17), (222, 199, 156, 255), stroke_w=1, anchor="mm")
    canvas.alpha_composite(sec, (1618, 886))

    canvas.convert("RGB").save(OUT_MAIN, optimize=True)
    print(f"Saved 1080p vertical slice preview: {OUT_MAIN} ({OUT_MAIN.stat().st_size} bytes)")

    # Also build a crisp 2x2 Close-Up Showcase (Card + Warrior Plaque + 3D Orbs/Seals + Card Back)
    close = Image.new("RGB", (1600, 900), (12, 10, 9))
    cd2 = ImageDraw.Draw(close)
    draw_text_outlined(
        cd2,
        (800, 42),
        "CHẶNG U1 — BỘ MẪU VẬT LIỆU 3D BLENDER · HUY HIỆU VECTOR · TRANH THỦY MẶC 2.5D",
        load_font("NotoSerif-Bold.ttf", 24),
        (246, 220, 150, 255),
        stroke_w=2,
        anchor="mm",
    )

    # Panel 1: Close-up Hovered Card (zero clipped labels!)
    big_sat = render_card(292, 410, "7", "spade", art_sat, "TRẢM (SÁT)", "Chiêu Cơ Bản · Tầm 1", card_frame, suits, is_red=False, highlight_gold=True)
    big_dao = render_card(228, 320, "Q", "heart", art_dao, "LINH ĐAN", "Hồi 1 Sinh Lực", card_frame, suits, is_red=True, highlight_gold=False)
    big_back = art_back.resize((210, 294), Image.Resampling.LANCZOS)

    close.paste(big_back, (44, 186), big_back)
    close.paste(big_dao, (268, 164), big_dao)
    close.paste(big_sat, (512, 108), big_sat)

    # Panel 2: Close-up 2.5D Warrior Plaque (640x320)
    big_hero = render_seat_plaque(
        640, 320, "Triệu Thiên Hành", "Thiên Kiếm Các · Chủ Minh", factions["thien_kiem"], 3, 4, 4,
        seat_frame, hp_orbs, hero_bg, hero_fg, is_target=True,
        equip_lines=["Hàn Băng Kiếm · Tầm 2", "Nhân Vương Thuẫn", "Xích Thố (-1)", "Trống"],
    )
    close.paste(big_hero, (880, 112), big_hero)

    # Panel 3: Bottom strip showing 3D HP Orbs, 2 Bronze Seals, 4 Faction Seals, 4 Suits, Primary CTA
    strip_y = 590
    draw_text_outlined(cd2, (64, strip_y - 26), "Chất liệu 3D Blender (Ánh sáng 35° Trái-Trên) & Huy hiệu Cửu Châu:", load_font("BeVietnamPro-SemiBold.ttf", 19), (222, 199, 156, 255), stroke_w=1, anchor="la")
    strip_items = [
        hp_orbs["jade"], hp_orbs["amber"], hp_orbs["crimson"], hp_orbs["empty"],
        seal_log, seal_gear,
        factions["thien_kiem"], factions["huyen_thiet"], factions["giang_nam"], factions["an_sat"],
        suits["spade"], suits["club"], suits["heart"], suits["diamond"],
    ]
    for i, item in enumerate(strip_items):
        ix = 64 + i * 106
        im_r = item.resize((88, 88), Image.Resampling.LANCZOS)
        close.paste(im_r, (ix, strip_y + 12), im_r)

    # Primary CTA
    cta_big = nine_slice(cta_btn_src, 360, 88, border=28)
    ctd = ImageDraw.Draw(cta_big)
    draw_text_outlined(ctd, (180, 44), "Xuất Trảm · Triệu Thiên Hành", load_font("NotoSerif-Bold.ttf", 20), (255, 246, 222, 255), stroke_w=2, anchor="mm")
    close.paste(cta_big, (880, 740), cta_big)

    close.save(OUT_CLOSEUP, optimize=True)
    print(f"Saved close-up showcase: {OUT_CLOSEUP} ({OUT_CLOSEUP.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
