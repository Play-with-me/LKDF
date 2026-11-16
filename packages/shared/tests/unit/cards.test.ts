import { describe, expect, it } from 'vitest';
import {
  STANDARD_DECK_TEMPLATES,
  STANDARD_DECK_TOTAL,
  STANDARD_EX_CARD_COUNT,
  createStandard108Deck,
} from '../../src/index.js';

describe('Bước 1.2 — Kiểm tra Bộ bài Tiêu chuẩn 108 lá (gồm 4 lá EX)', () => {
  it('đủ chính xác 108 lá bài, chia đều 27 lá mỗi chất (♠ ♥ ♣ ♦)', () => {
    expect(STANDARD_DECK_TEMPLATES).toHaveLength(STANDARD_DECK_TOTAL);
    expect(STANDARD_DECK_TEMPLATES.filter((c) => c.suit === 'SPADE')).toHaveLength(27);
    expect(STANDARD_DECK_TEMPLATES.filter((c) => c.suit === 'HEART')).toHaveLength(27);
    expect(STANDARD_DECK_TEMPLATES.filter((c) => c.suit === 'CLUB')).toHaveLength(27);
    expect(STANDARD_DECK_TEMPLATES.filter((c) => c.suit === 'DIAMOND')).toHaveLength(27);
  });

  it('khớp chính xác số lượng từng lá bài Cơ bản, Cẩm nang, Trang bị và 4 lá EX', () => {
    const countKey = (key: string) =>
      STANDARD_DECK_TEMPLATES.filter((c) => c.cardKey === key).length;

    // Bài cơ bản (53 lá)
    expect(countKey('sat')).toBe(30);
    expect(countKey('thiem')).toBe(15);
    expect(countKey('dao')).toBe(8);

    // Cẩm nang thường & thời gian (36 lá)
    expect(countKey('vo_trung_sinh_huu')).toBe(4);
    expect(countKey('thuan_thu_khien_duong')).toBe(5);
    expect(countKey('qua_ha_sai_cau')).toBe(6);
    expect(countKey('quyet_dau')).toBe(3);
    expect(countKey('ta_dao_sat_nhan')).toBe(2);
    expect(countKey('nam_man_nhap_xam')).toBe(3);
    expect(countKey('van_tien_te_phat')).toBe(1);
    expect(countKey('dao_vien_ket_nghia')).toBe(1);
    expect(countKey('ngu_coc_phong_dang')).toBe(2);
    expect(countKey('vo_giai_kha_kich')).toBe(4);
    expect(countKey('lac_bat_tu_thuc')).toBe(3);
    expect(countKey('thiem_dien')).toBe(2);

    // Trang bị (19 lá)
    const equips = STANDARD_DECK_TEMPLATES.filter((c) =>
      ['WEAPON', 'ARMOR', 'PLUS_ONE_HORSE', 'MINUS_ONE_HORSE'].includes(c.category),
    );
    expect(equips).toHaveLength(19);
    expect(
      STANDARD_DECK_TEMPLATES.filter((c) => c.category === 'WEAPON'),
    ).toHaveLength(10);
    expect(
      STANDARD_DECK_TEMPLATES.filter((c) => c.category === 'ARMOR'),
    ).toHaveLength(3);
    expect(
      STANDARD_DECK_TEMPLATES.filter((c) => c.category === 'PLUS_ONE_HORSE'),
    ).toHaveLength(3);
    expect(
      STANDARD_DECK_TEMPLATES.filter((c) => c.category === 'MINUS_ONE_HORSE'),
    ).toHaveLength(3);

    // Đúng 4 lá EX chuẩn
    const exCards = STANDARD_DECK_TEMPLATES.filter((c) => c.isEx);
    expect(exCards).toHaveLength(STANDARD_EX_CARD_COUNT);
    expect(exCards.map((c) => c.cardKey).sort()).toEqual([
      'han_bang_kiem',
      'nhan_vuong_thuan',
      'thiem_dien',
      'vo_giai_kha_kich',
    ]);
  });

  it('tạo bộ bài trộn ngẫu nhiên 108 lá có ID duy nhất', () => {
    const deck = createStandard108Deck(() => 0.42);
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
  });
});
