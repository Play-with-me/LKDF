import { describe, expect, it } from 'vitest';
import {
  HERO_BY_ID,
  HERO_CATALOG,
  IDENTITY_DISTRIBUTIONS,
  LORD_HERO_IDS,
  autoSelectTimedOutHeroes,
  createInitialMatchSetup,
  selectLordHero,
  selectPlayerHero,
  type PlayerCount,
  type SetupSeatInput,
} from '../../src/index.js';

function makeSeats(count: number): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `user-${idx + 1}`,
    displayName: `Người chơi ${idx + 1}`,
    avatarUrl: `https://example.com/avatar-${idx + 1}.png`,
  }));
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('Bước 1.1 — Chia Thân Phận 4–8 người, Máu Chủ Công & Chia 25 Tướng', () => {
  it('từ chối phòng dưới 4 người, quá 8 người hoặc trùng tài khoản Google', () => {
    expect(() =>
      createInitialMatchSetup({ matchId: 'm-3', seats: makeSeats(3) }),
    ).toThrow('MIN_4_MAX_8_REAL_PLAYERS_REQUIRED');

    expect(() =>
      createInitialMatchSetup({ matchId: 'm-9', seats: makeSeats(9) }),
    ).toThrow('MIN_4_MAX_8_REAL_PLAYERS_REQUIRED');

    expect(() =>
      createInitialMatchSetup({
        matchId: 'm-dup',
        seats: [
          { userId: 'same-google', displayName: 'A', avatarUrl: '' },
          { userId: 'u2', displayName: 'B', avatarUrl: '' },
          { userId: 'u3', displayName: 'C', avatarUrl: '' },
          { userId: 'same-google', displayName: 'D', avatarUrl: '' },
        ],
      }),
    ).toThrow('DUPLICATE_USER_IN_MATCH');
  });

  it('danh mục 25 tướng có đầy đủ thế lực (7 Thục, 7 Ngụy, 8 Ngô, 3 Quần)', () => {
    expect(HERO_CATALOG).toHaveLength(25);
    expect(HERO_CATALOG.filter((h) => h.faction === 'SHU')).toHaveLength(7);
    expect(HERO_CATALOG.filter((h) => h.faction === 'WEI')).toHaveLength(7);
    expect(HERO_CATALOG.filter((h) => h.faction === 'WU')).toHaveLength(8);
    expect(HERO_CATALOG.filter((h) => h.faction === 'QUN')).toHaveLength(3);
  });

  it.each<PlayerCount>([4, 5, 6, 7, 8])(
    'chia đúng Thân Phận, +1 máu Chủ Công và chia 25 tướng không trùng ở bàn %i người',
    (playerCount) => {
      const rng = createSeededRng(100 + playerCount);
      let state = createInitialMatchSetup({
        matchId: `match-${playerCount}`,
        seats: makeSeats(playerCount),
        rng,
      });

      // Kiểm tra tỷ lệ Thân Phận chuẩn
      const expected = IDENTITY_DISTRIBUTIONS[playerCount];
      const countOf = (role: string) =>
        state.players.filter((p) => p.identity === role).length;
      expect(countOf('LORD')).toBe(expected.lord);
      expect(countOf('LOYALIST')).toBe(expected.loyalist);
      expect(countOf('REBEL')).toBe(expected.rebel);
      expect(countOf('SPY')).toBe(expected.spy);

      // Chỉ Chủ Công được lật Thân Phận ban đầu
      const lordSeat = state.heroDraft!.lordSeatIndex;
      for (const player of state.players) {
        expect(player.isIdentityRevealed).toBe(player.seatIndex === lordSeat);
      }

      // Chủ Công luôn nhận 5 tướng: đủ Lưu Bị, Tào Tháo, Tôn Quyền + 2 ngẫu nhiên
      const lordCandidates = state.heroDraft!.candidatesBySeat[lordSeat]!;
      expect(lordCandidates).toHaveLength(5);
      expect(new Set(lordCandidates).size).toBe(5);
      for (const requiredLordHero of LORD_HERO_IDS) {
        expect(lordCandidates).toContain(requiredLordHero);
      }

      // Thử cho Chủ Công chọn tướng thứ 4 (1 trong 2 tướng ngẫu nhiên, ví dụ 3 máu hoặc 4 máu)
      const pickedLordHero = lordCandidates[3]!;
      state = selectLordHero(state, lordSeat, pickedLordHero, rng);

      const lordPlayer = state.players.find((p) => p.seatIndex === lordSeat)!;
      const expectedLordHp = HERO_BY_ID[pickedLordHero]!.baseMaxHp + 1;
      expect(lordPlayer.heroId).toBe(pickedLordHero);
      expect(lordPlayer.maxHp).toBe(expectedLordHp);
      expect(lordPlayer.hp).toBe(expectedLordHp);

      // 4 tướng dư đã trả về bộ (24 tướng tổng) và chia mỗi người còn lại 3 tướng không trùng nhau
      const dealtNonLordHeroes: string[] = [];
      for (const player of state.players) {
        if (player.seatIndex === lordSeat) continue;
        const cands = state.heroDraft!.candidatesBySeat[player.seatIndex]!;
        expect(cands).toHaveLength(3);
        expect(cands).not.toContain(pickedLordHero);
        dealtNonLordHeroes.push(...cands);
      }
      expect(dealtNonLordHeroes).toHaveLength((playerCount - 1) * 3);
      expect(new Set(dealtNonLordHeroes).size).toBe((playerCount - 1) * 3);

      // Mỗi người chơi còn lại chọn tướng đầu tiên trong 3 tướng của mình
      for (const player of state.players) {
        if (player.seatIndex === lordSeat) continue;
        const choice = state.heroDraft!.candidatesBySeat[player.seatIndex]![0]!;
        state = selectPlayerHero(state, player.seatIndex, choice);
      }

      expect(state.heroDraft!.stage).toBe('COMPLETED');
      expect(state.turnPhase).toBe('JUDGE');

      // Kiểm tra mọi ghế đều có tướng, máu chuẩn (Chủ Công +1, ghế khác giữ nguyên máu gốc)
      const allChosenHeroes = state.players.map((p) => p.heroId);
      expect(new Set(allChosenHeroes).size).toBe(playerCount);
      for (const player of state.players) {
        expect(player.heroId).not.toBeNull();
        const baseHp = HERO_BY_ID[player.heroId!]!.baseMaxHp;
        expect(player.maxHp).toBe(
          player.seatIndex === lordSeat ? baseHp + 1 : baseHp,
        );
        expect(player.hp).toBe(player.maxHp);
      }
    },
  );

  it('Chủ Công chọn Lưu Bị / Tào Tháo / Tôn Quyền đều nhận 5 máu tối đa ở cả bàn 4 và 8 người', () => {
    for (const playerCount of [4, 8] as const) {
      for (const lordHero of LORD_HERO_IDS) {
        const rng = createSeededRng(42);
        let state = createInitialMatchSetup({
          matchId: `lord-${playerCount}-${lordHero}`,
          seats: makeSeats(playerCount),
          rng,
        });
        const lordSeat = state.heroDraft!.lordSeatIndex;
        state = selectLordHero(state, lordSeat, lordHero, rng);
        const lord = state.players.find((p) => p.seatIndex === lordSeat)!;
        expect(lord.maxHp).toBe(5);
        expect(lord.hp).toBe(5);
      }
    }
  });

  it('hết giờ chọn tướng tự động chọn tướng đầu tiên bên trái và hoàn tất bàn đấu', () => {
    const rng = createSeededRng(777);
    const initial = createInitialMatchSetup({
      matchId: 'timeout-test',
      seats: makeSeats(6),
      rng,
    });
    const lordSeat = initial.heroDraft!.lordSeatIndex;
    const expectedLordHero = initial.heroDraft!.candidatesBySeat[lordSeat]![0]!;

    const completed = autoSelectTimedOutHeroes(initial, rng);
    expect(completed.heroDraft!.stage).toBe('COMPLETED');
    expect(completed.turnPhase).toBe('JUDGE');
    expect(completed.players.find((p) => p.seatIndex === lordSeat)!.heroId).toBe(
      expectedLordHero,
    );
  });
});
