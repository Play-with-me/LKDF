import { describe, expect, it } from 'vitest';
import {
  calculateDistance,
  calculateSeatDistance,
  canReachForSnatch,
  canUseCollateralMurder,
  getAttackRange,
  getValidAttackTargets,
  getValidSnatchTargets,
  isInAttackRange,
  type CardInstance,
  type HeroId,
  type MasterGameState,
  type PlayerCombatState,
} from '../../src/index.js';

function makeEquip(
  cardKey: string,
  nameVi: string,
  category: CardInstance['category'],
  attackRange?: number,
): CardInstance {
  return {
    id: `card-${cardKey}`,
    cardKey,
    nameVi,
    category,
    suit: 'SPADE',
    rank: 5,
    attackRange,
  };
}

function makeDummyMatch(
  playerCount: number,
  overrides: Partial<Record<number, Partial<PlayerCombatState>>> = {},
): MasterGameState {
  const defaultHeroes: HeroId[] = [
    'liu_bei',
    'guan_yu',
    'zhang_fei',
    'zhao_yun',
    'cao_cao',
    'si_ma_yi',
    'sun_quan',
    'zhou_yu',
  ];

  const players: PlayerCombatState[] = Array.from({ length: playerCount }, (_, idx) => ({
    seatIndex: idx,
    userId: `u-${idx}`,
    displayName: `Ghế ${idx + 1}`,
    avatarUrl: '',
    identity: idx === 0 ? 'LORD' : 'REBEL',
    isIdentityRevealed: idx === 0,
    heroId: defaultHeroes[idx] ?? 'lu_bu',
    hp: 4,
    maxHp: 4,
    alive: true,
    handCards: [],
    equipments: {
      weapon: null,
      armor: null,
      plusOneHorse: null,
      minusOneHorse: null,
    },
    delayedScrolls: [],
    autoSkipNullification: false,
    isBotTakeover: false,
    ...overrides[idx],
  }));

  return {
    matchId: 'dist-test',
    roundNumber: 1,
    currentTurnSeat: 0,
    turnPhase: 'PLAY',
    heroDraft: null,
    drawPile: [],
    discardPile: [],
    players,
    interruptStack: [],
    actionLog: [],
    refereeAuditLog: [],
    winningFaction: null,
    winnerUserIds: [],
  };
}

describe('Bước 1.1 — Tính khoảng cách, Ngựa +1/-1, Vũ khí & Kỹ năng Mã Thuật / Kỳ Tài', () => {
  it('tính khoảng cách vòng tròn ngắn nhất ở bàn 8 người và bỏ qua người đã chết', () => {
    const aliveState = makeDummyMatch(8);
    expect(calculateSeatDistance(aliveState, 0, 0)).toBe(0);
    expect(calculateSeatDistance(aliveState, 0, 1)).toBe(1);
    expect(calculateSeatDistance(aliveState, 0, 7)).toBe(1);
    expect(calculateSeatDistance(aliveState, 0, 4)).toBe(4);
    expect(calculateDistance(aliveState, 0, 5)).toBe(3);

    // Nếu ghế 1 và 2 chết, ghế 0 tới ghế 3 chỉ còn cách 1
    const withDead = makeDummyMatch(8, {
      1: { alive: false, hp: 0 },
      2: { alive: false, hp: 0 },
    });
    expect(calculateDistance(withDead, 0, 3)).toBe(1);
    expect(calculateDistance(withDead, 0, 1)).toBe(Number.POSITIVE_INFINITY);
    expect(calculateDistance(withDead, 1, 1)).toBe(Number.POSITIVE_INFINITY);
  });

  it('cộng ngựa +1 phòng thủ của mục tiêu và trừ ngựa -1 tấn công của người đánh', () => {
    const state = makeDummyMatch(6, {
      0: {
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: null,
          minusOneHorse: makeEquip('xich_tho', 'Xích Thố', 'MINUS_ONE_HORSE'),
        },
      },
      1: {
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: makeEquip('dich_lo', 'Đích Lố', 'PLUS_ONE_HORSE'),
          minusOneHorse: null,
        },
      },
    });

    // Ghế 0 (-1 ngựa) -> Ghế 1 (+1 ngựa): base 1 - 1 + 1 = 1
    expect(calculateDistance(state, 0, 1)).toBe(1);
    // Ghế 0 (-1 ngựa) -> Ghế 2 (không ngựa): base 2 - 1 = 1 (trong tầm mặc định 1!)
    expect(calculateDistance(state, 0, 2)).toBe(1);
    expect(isInAttackRange(state, 0, 2)).toBe(true);

    // Ghế 2 (không ngựa) -> Ghế 1 (+1 ngựa): base 1 + 1 = 2 (ngoài tầm mặc định 1!)
    expect(calculateDistance(state, 2, 1)).toBe(2);
    expect(isInAttackRange(state, 2, 1)).toBe(false);
  });

  it('Mã Siêu (Mã Thuật) giảm 1 khoảng cách, cộng dồn với ngựa -1 nhưng tối thiểu luôn là 1', () => {
    const state = makeDummyMatch(8, {
      0: {
        heroId: 'ma_chao',
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: null,
          minusOneHorse: makeEquip('dai_uyen', 'Đại Uyên', 'MINUS_ONE_HORSE'),
        },
      },
      3: {
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: makeEquip('tuyet_anh', 'Tuyệt Ảnh', 'PLUS_ONE_HORSE'),
          minusOneHorse: null,
        },
      },
    });

    // Base 1 - 1 (Mã Thuật) - 1 (Đại Uyên) = -1 -> sàn tối thiểu là 1
    expect(calculateDistance(state, 0, 1)).toBe(1);
    // Base 3 - 1 (Mã Thuật) - 1 (Đại Uyên) + 1 (Tuyệt Ảnh) = 2
    expect(calculateDistance(state, 0, 3)).toBe(2);
    // Base 3 - 1 (Mã Thuật) - 1 (Đại Uyên) = 1 tới ghế 5 (đối diện ngược chiều 3 bước)
    expect(calculateDistance(state, 0, 5)).toBe(1);
  });

  it('kiểm tra tầm vũ khí 1..4 và Thuận Thủ Khiên Dương (cách 1) vs Hoàng Nguyệt Anh (Kỳ Tài)', () => {
    const state = makeDummyMatch(6, {
      0: {
        heroId: 'liu_bei',
        equipments: {
          weapon: makeEquip('thanh_long', 'Thanh Long Yển Nguyệt Đao', 'WEAPON', 3),
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
      },
      2: {
        heroId: 'huang_yue_ying',
        equipments: {
          weapon: makeEquip('lien_no', 'Gia Cát Liên Nỗ', 'WEAPON', 1),
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
      },
      3: {
        equipments: {
          weapon: makeEquip('phuong_thien', 'Phương Thiên Họa Kích', 'WEAPON', 4),
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
      },
    });

    expect(getAttackRange(state.players[0]!)).toBe(3);
    expect(getAttackRange(state.players[2]!)).toBe(1);
    expect(getAttackRange(state.players[3]!)).toBe(4);

    // Ghế 0 cầm vũ khí tầm 3 đánh được cả 5 ghế còn lại trên bàn 6 người
    expect(getValidAttackTargets(state, 0)).toEqual([1, 2, 3, 4, 5]);
    // Ghế 0 dùng Thuận Thủ Khiên Dương chỉ với tới ghế cách 1 (ghế 1 và ghế 5)
    expect(getValidSnatchTargets(state, 0)).toEqual([1, 5]);

    // Hoàng Nguyệt Anh (Kỳ Tài) ở ghế 2 vẫn chỉ Sát được người cách 1 (vũ khí tầm 1),
    // nhưng Thuận Thủ Khiên Dương chạm tới toàn bàn
    expect(getValidAttackTargets(state, 2)).toEqual([1, 3]);
    expect(canReachForSnatch(state, 2, 5)).toBe(true);
    expect(getValidSnatchTargets(state, 2)).toEqual([0, 1, 3, 4, 5]);

    // Tá Đao Sát Nhân: Ghế 2 (hoặc 1) mượn đao Ghế 3 (Phương Thiên tầm 4) chém Ghế 0 (cách 3 <= 4)
    expect(canUseCollateralMurder(state, 2, 3, 0)).toBe(true);
    // Ghế 1 không cầm vũ khí nên không thể làm người bị mượn đao
    expect(canUseCollateralMurder(state, 2, 1, 0)).toBe(false);
  });
});
