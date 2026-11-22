import { describe, expect, it } from 'vitest';
import {
  IDENTITY_DISTRIBUTIONS,
  IdentityRoleSchema,
  PlayerCountSchema,
  STANDARD_DECK_TOTAL,
  STANDARD_EX_CARD_COUNT,
  STANDARD_HERO_COUNT,
  STANDARD_HERO_IDS,
  TIMER_PRESETS,
  TimerPresetSchema,
  type PlayerCount,
} from '../../src/index.js';

describe('Bước 0.2 — Kiểm thử nền tảng @lkdf/shared', () => {
  it('khớp bảng phân bổ Thân Phận 4–8 người theo REQUIREMENTS.md', () => {
    const counts: PlayerCount[] = [4, 5, 6, 7, 8];
    for (const count of counts) {
      const dist = IDENTITY_DISTRIBUTIONS[count];
      expect(dist.lord).toBe(1);
      expect(dist.lord + dist.loyalist + dist.rebel + dist.spy).toBe(count);
    }

    expect(IDENTITY_DISTRIBUTIONS[4]).toEqual({ lord: 1, loyalist: 0, rebel: 2, spy: 1 });
    expect(IDENTITY_DISTRIBUTIONS[8]).toEqual({ lord: 1, loyalist: 2, rebel: 3, spy: 2 });
  });

  it('đủ 25 mã tướng chuẩn không trùng lặp và đủ 108 lá bài (gồm 4 lá EX)', () => {
    expect(STANDARD_HERO_COUNT).toBe(25);
    expect(new Set(STANDARD_HERO_IDS).size).toBe(25);
    expect(STANDARD_DECK_TOTAL).toBe(108);
    expect(STANDARD_EX_CARD_COUNT).toBe(4);
  });

  it('khớp 3 mức đồng hồ đếm ngược chuẩn', () => {
    expect(TIMER_PRESETS.FAST).toEqual({
      heroSelectSeconds: 20,
      mainTurnSeconds: 90,
      discardSeconds: 30,
      reactionSeconds: 10,
    });
    expect(TIMER_PRESETS.STANDARD).toEqual({
      heroSelectSeconds: 30,
      mainTurnSeconds: 150,
      discardSeconds: 45,
      reactionSeconds: 15,
    });
    expect(TIMER_PRESETS.RELAXED).toEqual({
      heroSelectSeconds: 45,
      mainTurnSeconds: 180,
      discardSeconds: 60,
      reactionSeconds: 20,
    });
  });

  it('xác thực schema Zod cho PlayerCount, IdentityRole và TimerPreset', () => {
    expect(PlayerCountSchema.safeParse(3).success).toBe(false);
    expect(PlayerCountSchema.safeParse(4).success).toBe(true);
    expect(PlayerCountSchema.safeParse(8).success).toBe(true);
    expect(PlayerCountSchema.safeParse(9).success).toBe(false);
    expect(IdentityRoleSchema.safeParse('LORD').success).toBe(true);
    expect(TimerPresetSchema.safeParse('STANDARD').success).toBe(true);
  });
});
