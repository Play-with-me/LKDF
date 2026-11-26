import {
  CUU_CHAU_DECK_TEMPLATES,
  CUU_CHAU_HEROES,
  getCuuChauCardDisplay,
  getCuuChauFactionDisplay,
  getCuuChauHeroDisplay,
  getCuuChauRoleDisplay,
} from '@lkdf/shared';
import { describe, expect, it } from 'vitest';
import { formatCuuChauDisplayText } from '../features/match/matchTypes.js';
import en from './locales/en.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };

const VI_DIACRITIC_RE =
  /[\u0102\u0103\u00C2\u00E2\u0110\u0111\u00CA\u00EA\u00D4\u00F4\u01A0\u01A1\u01AF\u01B0\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u1EA0-\u1EF9]/;

function collectLeafEntries(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        collectLeafEntries(value as Record<string, unknown>, path),
      );
    }
  }
  return result;
}

describe('i18n VI/EN parity and Cửu Châu localization', () => {
  it('has 100% recursive key parity between vi.json and en.json with zero Vietnamese in en.json', () => {
    const viLeaves = collectLeafEntries(vi);
    const enLeaves = collectLeafEntries(en);

    expect(Object.keys(viLeaves).sort()).toEqual(Object.keys(enLeaves).sort());

    for (const [key, enValue] of Object.entries(enLeaves)) {
      expect(enValue.trim().length, `empty en key: ${key}`).toBeGreaterThan(0);
      expect(
        VI_DIACRITIC_RE.test(enValue),
        `Vietnamese diacritic leaked into en.json at ${key}: ${enValue}`,
      ).toBe(false);
    }
  });

  it('provides clean VI/EN metadata for all 25 generals and all 112 deck card keys', () => {
    expect(CUU_CHAU_HEROES).toHaveLength(25);
    expect(CUU_CHAU_DECK_TEMPLATES).toHaveLength(112);

    for (const hero of CUU_CHAU_HEROES) {
      const viHero = getCuuChauHeroDisplay(hero.id, 'vi');
      const enHero = getCuuChauHeroDisplay(hero.id, 'en');
      expect(viHero?.name).toBeTruthy();
      expect(enHero?.name).toBeTruthy();
      expect(VI_DIACRITIC_RE.test(enHero?.name ?? '')).toBe(false);
      expect(enHero?.skills.length).toBeGreaterThan(0);
      for (const skill of enHero?.skills ?? []) {
        expect(VI_DIACRITIC_RE.test(skill.name)).toBe(false);
        expect(VI_DIACRITIC_RE.test(skill.description)).toBe(false);
      }
    }

    const cardKeys = new Set(CUU_CHAU_DECK_TEMPLATES.map((tpl) => tpl.cardKey));
    for (const requiredNewCard of [
      'pha_giap_tram',
      'chan_khi_ho_the',
      'kinh_loi_chan',
      'hoan_anh_giap',
      'tu_khi_hoan',
    ] as const) {
      expect(cardKeys.has(requiredNewCard)).toBe(true);
    }

    for (const cardKey of cardKeys) {
      const viCard = getCuuChauCardDisplay(cardKey, 'vi');
      const enCard = getCuuChauCardDisplay(cardKey, 'en');
      expect(viCard.name.length).toBeGreaterThan(0);
      expect(enCard.name.length).toBeGreaterThan(0);
      expect(
        VI_DIACRITIC_RE.test(enCard.name),
        `Vietnamese leaked in EN card name ${cardKey}: ${enCard.name}`,
      ).toBe(false);
      expect(
        VI_DIACRITIC_RE.test(enCard.description),
        `Vietnamese leaked in EN card desc ${cardKey}: ${enCard.description}`,
      ).toBe(false);
    }

    for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY', 'UNKNOWN'] as const) {
      const enRole = getCuuChauRoleDisplay(role, 'en');
      expect(VI_DIACRITIC_RE.test(enRole.name)).toBe(false);
      expect(VI_DIACRITIC_RE.test(enRole.description)).toBe(false);
    }

    for (const faction of ['SHU', 'WEI', 'WU', 'QUN'] as const) {
      const enFaction = getCuuChauFactionDisplay(faction, 'en');
      expect(VI_DIACRITIC_RE.test(enFaction.shortName)).toBe(false);
      expect(VI_DIACRITIC_RE.test(enFaction.name)).toBe(false);
    }
  });

  it('translates representative raw match log lines into clean English', () => {
    const sampleLogs = [
      'Vòng 1 — Lượt của Ghế 1 (Tào Tháo)',
      'Ghế 1 rút 2 lá bài.',
      'Ghế 1 đánh Sát vào Ghế 2.',
      'Ghế 2 đánh Thiểm né thành công.',
      'Ghế 1 kích hoạt Khổ Nhục, tự mất 1 máu và rút 2 lá.',
      'Ghế 3 đánh Phá Giáp Trảm vào Ghế 4 (bỏ qua giáp, rút 1 lá nếu trúng).',
      'Ghế 4 kích hoạt Chân Khí Hộ Thể.',
      'Ghế 2 dùng Kinh Lôi Chấn (Phản Đòn Lôi).',
      'Ghế 3 trang bị Hoan Ảnh Giáp (+1 khoảng cách, miễn Sát cơ bản màu Đen).',
      'Ghế 1 trang bị Tụ Khí Hoàn (tầm 2, bỏ 2 lá để đánh như Sát).',
      'Ghế 5 lâm vào hấp hối (0 máu)!',
      'Ghế 5 tử trận!',
    ];

    for (const line of sampleLogs) {
      const translated = formatCuuChauDisplayText(line, 'en');
      expect(translated.length).toBeGreaterThan(0);
      expect(
        VI_DIACRITIC_RE.test(translated),
        `Vietnamese leaked in translated EN log "${line}" -> "${translated}"`,
      ).toBe(false);
    }
  });
});
