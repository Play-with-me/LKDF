import { describe, expect, it } from 'vitest';
import {
  HERO_CATALOG,
  HERO_SKILL_REGISTRY,
  STANDARD_HERO_IDS,
  applyGameAction,
  getPendingPrompt,
  projectStateForPlayer,
  stepEngine,
  type CardInstance,
  type MasterGameState,
  type PlayerCombatState,
} from '../../src/index.js';

let seq = 0;
function card(
  cardKey: string,
  nameVi: string,
  category: CardInstance['category'],
  suit: CardInstance['suit'],
  rank: number,
  attackRange?: number,
): CardInstance {
  seq += 1;
  return {
    id: `inter_${seq}_${cardKey}`,
    cardKey,
    nameVi,
    category,
    suit,
    rank,
    ...(attackRange !== undefined ? { attackRange } : {}),
  };
}

function makeControlledState(
  playerCount: number,
  overrides: Partial<Record<number, Partial<PlayerCombatState>>> = {},
  drawPile: CardInstance[] = [],
  discardPile: CardInstance[] = [],
): MasterGameState {
  const players: PlayerCombatState[] = Array.from({ length: playerCount }, (_, idx) => ({
    seatIndex: idx,
    userId: `u-${idx}`,
    displayName: `Ghế ${idx}`,
    avatarUrl: '',
    identity:
      idx === 0
        ? 'LORD'
        : idx === 1
          ? 'LOYALIST'
          : idx === playerCount - 1
            ? 'SPY'
            : 'REBEL',
    isIdentityRevealed: idx === 0,
    heroId: 'zhang_fei',
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
    matchId: 'interactions-test',
    roundNumber: 1,
    currentTurnSeat: 0,
    turnPhase: 'PLAY',
    heroDraft: null,
    drawPile,
    discardPile,
    players,
    interruptStack: [],
    pendingEffects: [],
    harvestPool: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    nextFrameSeq: 0,
    actionLog: [],
    refereeAuditLog: [],
    winningFaction: null,
    winnerUserIds: [],
  };
}

describe('Bước 1.3 — Kiểm chứng Tương tác Khó & Chéo giữa 25 Tướng và 108 Lá', () => {
  it('đủ toàn bộ 25 tướng chuẩn đều có handler kỹ năng trong HERO_SKILL_REGISTRY', () => {
    expect(HERO_CATALOG).toHaveLength(25);
    for (const heroId of STANDARD_HERO_IDS) {
      expect(HERO_SKILL_REGISTRY[heroId]).toBeDefined();
      expect(HERO_SKILL_REGISTRY[heroId]?.heroId).toBe(heroId);
    }
  });

  it('Lữ Bố (Vô Song) đánh Sát vào người mặc Bát Quái Trận cần đủ 2 lần Thiểm (Bát Quái + Thiểm tay, hoặc thiếu thì mất máu)', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const bagua = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
    const thiem = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);
    const redJudge = card('dao', 'Đào', 'BASIC', 'HEART', 6);
    const blackJudge = card('sat', 'Sát', 'BASIC', 'CLUB', 4);

    // Trường hợp 1: Bát Quái ra Đỏ (tính 1 Thiểm) + đánh thêm 1 Thiểm trên tay -> né thành công
    let state1 = makeControlledState(
      4,
      {
        0: { heroId: 'lu_bu', handCards: [sat] },
        1: {
          heroId: 'zhang_fei',
          hp: 4,
          handCards: [thiem],
          equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [redJudge],
    );

    state1 = applyGameAction(state1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(state1)?.kind).toBe('WAIT_DODGE');

    state1 = applyGameAction(state1, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
      useBagua: true,
    });
    // Phán xét Bát Quái Đỏ thành công 1/2, vẫn còn WAIT_DODGE yêu cầu thêm 1 Thiểm nữa
    expect(getPendingPrompt(state1)?.kind).toBe('WAIT_DODGE');
    const dodgeFrame1 = state1.interruptStack[state1.interruptStack.length - 1]!;
    if (dodgeFrame1.kind === 'WAIT_DODGE') {
      expect(dodgeFrame1.dodgedSoFar).toBe(1);
      expect(dodgeFrame1.requiredCount).toBe(2);
    }

    state1 = applyGameAction(state1, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: thiem.id,
    });
    expect(state1.interruptStack).toHaveLength(0);
    expect(state1.players[1]!.hp).toBe(4);

    // Trường hợp 2: Bát Quái ra Đen (thất bại) và chỉ có 1 Thiểm trên tay -> không đủ 2 Thiểm, vẫn nhận 1 sát thương
    let state2 = makeControlledState(
      4,
      {
        0: { heroId: 'lu_bu', handCards: [card('sat', 'Sát', 'BASIC', 'SPADE', 8)] },
        1: {
          heroId: 'zhang_fei',
          hp: 4,
          handCards: [card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 6)],
          equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [blackJudge],
    );
    const sat2 = state2.players[0]!.handCards[0]!;
    const thiem2 = state2.players[1]!.handCards[0]!;

    state2 = applyGameAction(state2, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat2.id],
      targetSeats: [1],
    });
    state2 = applyGameAction(state2, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
      useBagua: true,
    });
    // Thất bại Bát Quái -> vẫn cần 2 Thiểm
    state2 = applyGameAction(state2, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: thiem2.id,
    });
    expect(getPendingPrompt(state2)?.kind).toBe('WAIT_DODGE');
    // Hết Thiểm -> bỏ qua -> nhận 1 sát thương
    state2 = applyGameAction(state2, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
    });
    expect(state2.players[1]!.hp).toBe(3);
  });

  describe('Tư Mã Ý (Quỷ Tài) đổi lá phán xét của cả 6 loại phán xét', () => {
    it('1) Quỷ Tài đổi phán xét Thiểm Điện thành 5♠ -> gây 3 sát thương Lôi', () => {
      const thiemDien = card('thiem_dien', 'Thiểm Điện', 'DELAYED_SCROLL', 'SPADE', 1);
      const safeJudge = card('dao', 'Đào', 'BASIC', 'HEART', 6);
      const spade5 = card('sat', 'Sát', 'BASIC', 'SPADE', 5);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhang_fei', hp: 4, delayedScrolls: [thiemDien] },
          1: { heroId: 'si_ma_yi', handCards: [spade5] },
        },
        [safeJudge, card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2), card('sat', 'Sát', 'BASIC', 'CLUB', 3)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };

      state = stepEngine(state);
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
      state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
      state = stepEngine(state);

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: spade5.id,
      });
      state = stepEngine(state);

      expect(state.players[0]!.hp).toBe(1);
      expect(state.players[0]!.delayedScrolls).toHaveLength(0);
    });

    it('2) Quỷ Tài đổi phán xét Lạc Bất Tư Thục thành lá không phải Cơ -> mục tiêu mất pha PLAY', () => {
      const lacBat = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'HEART', 6);
      const heartJudge = card('dao', 'Đào', 'BASIC', 'HEART', 4);
      const club9 = card('sat', 'Sát', 'BASIC', 'CLUB', 9);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhang_fei', hp: 4, delayedScrolls: [lacBat] },
          1: { heroId: 'si_ma_yi', handCards: [club9] },
        },
        [heartJudge, card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2), card('sat', 'Sát', 'BASIC', 'CLUB', 3)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };

      state = stepEngine(state);
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
      state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
      state = stepEngine(state);

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: club9.id,
      });
      state = stepEngine(state);

      // Lạc Bất Tư Thục khác Cơ -> skipPlayPhase -> sang thẳng DISCARD hoặc END (vì cầm 2 lá <= 4 máu nên END -> chuyển lượt ghế 1)
      expect(state.currentTurnSeat).toBe(1);
    });

    it('3) Quỷ Tài đổi phán xét Bát Quái Trận từ Đen sang Đỏ -> Thiểm thành công', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const bagua = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'CLUB', 2);
      const blackJudge = card('sat', 'Sát', 'BASIC', 'SPADE', 4);
      const redSwap = card('dao', 'Đào', 'BASIC', 'HEART', 3);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhang_fei', handCards: [sat] },
          1: {
            heroId: 'si_ma_yi',
            hp: 3,
            handCards: [redSwap],
            equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
          },
        },
        [blackJudge],
      );

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });
      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
        useBagua: true,
      });
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: redSwap.id,
      });

      expect(state.interruptStack).toHaveLength(0);
      expect(state.players[1]!.hp).toBe(3);
    });

    it('4) Quỷ Tài đổi phán xét Cương Liệt từ Cơ sang Bích -> bắt kẻ gây sát thương phải bỏ 2 lá hoặc mất 1 máu', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const heartJudge = card('dao', 'Đào', 'BASIC', 'HEART', 5);
      const spadeSwap = card('thiem', 'Thiểm', 'BASIC', 'SPADE', 9);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhang_fei', hp: 4, handCards: [sat] },
          1: { heroId: 'xia_hou_dun', hp: 4 },
          2: { heroId: 'si_ma_yi', hp: 3, handCards: [spadeSwap] },
        },
        [heartJudge],
      );

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });
      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
      });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_GANG_LIE');
      state = applyGameAction(state, {
        type: 'RESPOND_GANG_LIE',
        seatIndex: 1,
        activate: true,
      });

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 2,
        cardId: spadeSwap.id,
      });

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GANG_LIE_CHOICE');
      state = applyGameAction(state, {
        type: 'RESPOND_GANG_LIE_CHOICE',
        seatIndex: 0,
        choice: 'TAKE_DAMAGE',
      });
      expect(state.players[0]!.hp).toBe(3);
    });

    it('5) Quỷ Tài đổi phán xét Thiết Kỵ từ Đen sang Đỏ -> Sát của Mã Siêu không thể bị Thiểm', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const thiem = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 4);
      const blackJudge = card('sat', 'Sát', 'BASIC', 'CLUB', 6);
      const redSwap = card('dao', 'Đào', 'BASIC', 'DIAMOND', 10);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'ma_chao', handCards: [sat] },
          1: { heroId: 'zhang_fei', hp: 4, handCards: [thiem] },
          2: { heroId: 'si_ma_yi', hp: 3, handCards: [redSwap] },
        },
        [blackJudge],
      );

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });
      expect(getPendingPrompt(state)?.kind).toBe('ASK_TIE_QI');
      state = applyGameAction(state, {
        type: 'RESPOND_TIE_QI',
        seatIndex: 0,
        activate: true,
      });
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 2,
        cardId: redSwap.id,
      });

      // Vì phán xét đã thành Đỏ -> Thiết Kỵ khóa Thiểm, không mở WAIT_DODGE mà gây thẳng 1 sát thương
      expect(state.interruptStack).toHaveLength(0);
      expect(state.players[1]!.hp).toBe(3);
    });

    it('6) Quỷ Tài đổi phán xét Lạc Thần từ Đỏ sang Đen -> Chân Cơ lấy lá Đen và tiếp tục Lạc Thần', () => {
      const redJudge = card('dao', 'Đào', 'BASIC', 'HEART', 2);
      const blackSwap = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
      const nextRedJudge = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);

      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhen_ji', hp: 3, handCards: [] },
          1: { heroId: 'si_ma_yi', hp: 3, handCards: [blackSwap] },
        },
        [redJudge, nextRedJudge],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };

      // Kích hoạt đầu lượt cho Chân Cơ
      state = stepEngine(state);
      // Nếu engine chưa tự push ASK_LUO_SHEN ở JUDGE đang dở thì thử từ cuối lượt ghế 3 chuyển sang ghế 0
      if (getPendingPrompt(state)?.kind !== 'ASK_LUO_SHEN') {
        state = makeControlledState(
          4,
          {
            0: { heroId: 'zhen_ji', hp: 3, handCards: [] },
            1: { heroId: 'si_ma_yi', hp: 3, handCards: [blackSwap] },
            3: { heroId: 'zhang_fei', hp: 4, handCards: [] },
          },
          [redJudge, nextRedJudge, card('sat', 'Sát', 'BASIC', 'CLUB', 2), card('thiem', 'Thiểm', 'BASIC', 'HEART', 9)],
        );
        state = { ...state, currentTurnSeat: 3, turnPhase: 'PLAY' };
        state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 3 });
      }

      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_SHEN');
      state = applyGameAction(state, {
        type: 'RESPOND_LUO_SHEN',
        seatIndex: 0,
        activate: true,
      });
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: blackSwap.id,
      });

      // Chân Cơ lấy được lá blackSwap (lá Bích) và được hỏi Lạc Thần tiếp
      expect(state.players[0]!.handCards.some((c) => c.id === blackSwap.id)).toBe(true);
      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_SHEN');
    });
  });

  it('Đại Kiều (Lưu Ly) chuyển mục tiêu Sát sang người thứ 3 trong tầm đánh và cấm chuyển ngược lại cho người đánh', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const discard = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 3);

    let state = makeControlledState(4, {
      0: { heroId: 'zhang_fei', hp: 4, handCards: [sat] },
      1: { heroId: 'da_qiao', hp: 3, handCards: [discard] },
      2: { heroId: 'zhao_yun', hp: 4, handCards: [] },
      3: { heroId: 'guan_yu', hp: 4, handCards: [] },
    });

    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_LIU_LI');

    // Không được chuyển ngược về người đánh (ghế 0)
    expect(() =>
      applyGameAction(state, {
        type: 'RESPOND_LIU_LI',
        seatIndex: 1,
        activate: true,
        discardCardId: discard.id,
        newTargetSeat: 0,
      }),
    ).toThrow();

    // Không được chuyển cho người ngoài tầm đánh (ghế 3 cách ghế 1 khoảng cách 2 > tầm tay 1)
    expect(() =>
      applyGameAction(state, {
        type: 'RESPOND_LIU_LI',
        seatIndex: 1,
        activate: true,
        discardCardId: discard.id,
        newTargetSeat: 3,
      }),
    ).toThrow();

    // Chuyển hợp lệ sang ghế 2 (trong tầm đánh của Đại Kiều)
    state = applyGameAction(state, {
      type: 'RESPOND_LIU_LI',
      seatIndex: 1,
      activate: true,
      discardCardId: discard.id,
      newTargetSeat: 2,
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_DODGE');
    const dodgeFrame = state.interruptStack[state.interruptStack.length - 1]!;
    if (dodgeFrame.kind === 'WAIT_DODGE') {
      expect(dodgeFrame.targetSeat).toBe(2);
    }

    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 2,
      cardId: null,
    });
    expect(state.players[2]!.hp).toBe(3);
    expect(state.players[1]!.hp).toBe(3);
  });

  it('Tôn Thượng Hương (Kiêu Cơ) rút 2 lá khi tự thay trang bị đè lên đồ cũ VÀ khi bị Quá Hà / Hàn Băng Kiếm hủy', () => {
    const oldWeapon = card('thanh_cong_kiem', 'Thanh Công Kiếm', 'WEAPON', 'SPADE', 6, 2);
    const newWeapon = card('phuong_thien_hoa_kich', 'Phương Thiên Họa Kích', 'WEAPON', 'DIAMOND', 12, 4);
    const armor = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
    const quaHa = card('qua_ha_sai_cau', 'Quá Hà Sái Cầu', 'NORMAL_SCROLL', 'SPADE', 3);
    const hanBang = card('han_bang_kiem', 'Hàn Băng Kiếm', 'WEAPON', 'SPADE', 2, 2);
    const sat = card('sat', 'Sát', 'BASIC', 'CLUB', 8);

    const drawCards = Array.from({ length: 10 }, (_, idx) =>
      card('sat', 'Sát', 'BASIC', 'HEART', (idx % 13) + 1),
    );

    let state = makeControlledState(
      4,
      {
        0: {
          heroId: 'sun_shang_xiang',
          hp: 3,
          handCards: [newWeapon],
          equipments: { weapon: oldWeapon, armor, plusOneHorse: null, minusOneHorse: null },
        },
        1: {
          heroId: 'zhang_fei',
          hp: 4,
          handCards: [quaHa, sat],
          equipments: { weapon: hanBang, armor: null, plusOneHorse: null, minusOneHorse: null },
        },
      },
      drawCards,
    );

    // 1) Tự thay vũ khí mới đè lên vũ khí cũ -> mất oldWeapon -> Kiêu Cơ rút 2 lá
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [newWeapon.id],
    });
    expect(state.players[0]!.equipments.weapon?.id).toBe(newWeapon.id);
    expect(state.players[0]!.handCards).toHaveLength(2);

    // Kết thúc lượt 0 (cầm 2 lá <= 3 máu) -> sang lượt 1 (rút 2 lá)
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 0 });
    expect(state.currentTurnSeat).toBe(1);
    expect(state.turnPhase).toBe('PLAY');

    const handBeforeQuaHa = state.players[0]!.handCards.length;

    // 2) Ghế 1 dùng Quá Hà Sái Cầu hủy Giáp của Tôn Thượng Hương -> Kiêu Cơ rút thêm 2 lá
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [quaHa.id],
      targetSeats: [0],
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
    state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(getPendingPrompt(state)?.kind).toBe('PICK_TARGET_CARD');
    state = applyGameAction(state, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 1,
      zone: 'ARMOR',
    });
    expect(state.players[0]!.equipments.armor).toBeNull();
    expect(state.players[0]!.handCards).toHaveLength(handBeforeQuaHa + 2);

    // 3) Ghế 1 đánh Sát bằng Hàn Băng Kiếm hủy vũ khí của Tôn Thượng Hương -> Kiêu Cơ rút thêm 2 lá nữa
    const handBeforeHanBang = state.players[0]!.handCards.length;
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [sat.id],
      targetSeats: [0],
    });
    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 0,
      cardId: null,
    });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_HAN_BANG_KIEM');
    state = applyGameAction(state, {
      type: 'RESPOND_HAN_BANG_KIEM',
      seatIndex: 1,
      activate: true,
      picks: [{ zone: 'WEAPON' }],
    });
    expect(state.players[0]!.equipments.weapon).toBeNull();
    expect(state.players[0]!.handCards).toHaveLength(handBeforeHanBang + 2);
  });

  it('Gia Cát Lượng (Quan Tinh) không bị lộ bài xem trước trong projectStateForPlayer đối với người chơi khác', () => {
    const secretTop1 = card('dao', 'Đào Quan Tinh Bí Mật 1', 'BASIC', 'HEART', 1);
    const secretTop2 = card('vo_giai_kha_kich', 'Vô Giải Quan Tinh Bí Mật 2', 'NORMAL_SCROLL', 'SPADE', 11);
    const secretTop3 = card('sat', 'Sát', 'BASIC', 'CLUB', 7);
    const secretTop4 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);

    let state = makeControlledState(
      4,
      {
        0: { heroId: 'zhuge_liang', hp: 3, maxHp: 3 },
        3: { heroId: 'zhang_fei', hp: 4, maxHp: 4 },
      },
      [
        secretTop1,
        secretTop2,
        secretTop3,
        secretTop4,
        card('sat', 'Sát', 'BASIC', 'SPADE', 9),
        card('thiem', 'Thiểm', 'BASIC', 'HEART', 10),
      ],
    );
    state = { ...state, currentTurnSeat: 3, turnPhase: 'PLAY' };
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 3 });

    expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUAN_XING');

    // Chính Gia Cát Lượng (ghế 0) thấy đủ 4 lá xem trước
    const zhugeView = projectStateForPlayer(state, 'u-0');
    expect(zhugeView.activeInterrupt?.kind).toBe('WAIT_GUAN_XING');
    expect(zhugeView.activeInterrupt?.guanXingCards).toHaveLength(4);
    expect(zhugeView.activeInterrupt?.guanXingCards?.map((c) => c.id)).toContain(secretTop1.id);

    // Người chơi khác (ghế 1) tuyệt đối không thấy guanXingCards hoặc tên/ID bài bí mật
    const otherView = projectStateForPlayer(state, 'u-1');
    const serialized = JSON.stringify(otherView);
    expect(otherView.activeInterrupt?.kind).toBe('WAIT_GUAN_XING');
    expect(otherView.activeInterrupt?.guanXingCards).toBeUndefined();
    expect(serialized).not.toContain(secretTop1.id);
    expect(serialized).not.toContain('Đào Quan Tinh Bí Mật 1');
    expect(serialized).not.toContain(secretTop2.id);
    expect(serialized).not.toContain('Vô Giải Quan Tinh Bí Mật 2');
  });

  it('Hàn Băng Kiếm hủy bài thay sát thương KHÔNG kích hoạt Gian Hùng / Phản Quỷ / Cương Liệt / Di Kế', () => {
    const targets: Array<{ heroId: 'cao_cao' | 'si_ma_yi' | 'xia_hou_dun' | 'guo_jia' }> = [
      { heroId: 'cao_cao' },
      { heroId: 'si_ma_yi' },
      { heroId: 'xia_hou_dun' },
      { heroId: 'guo_jia' },
    ];

    for (const { heroId } of targets) {
      const hanBang = card('han_bang_kiem', 'Hàn Băng Kiếm', 'WEAPON', 'SPADE', 2, 2);
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const victimCard1 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);
      const victimCard2 = card('dao', 'Đào', 'BASIC', 'HEART', 4);

      let state = makeControlledState(4, {
        0: {
          heroId: 'zhang_fei',
          hp: 4,
          handCards: [sat],
          equipments: { weapon: hanBang, armor: null, plusOneHorse: null, minusOneHorse: null },
        },
        1: {
          heroId,
          hp: 4,
          handCards: [victimCard1, victimCard2],
        },
      });

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });
      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
      });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_HAN_BANG_KIEM');
      state = applyGameAction(state, {
        type: 'RESPOND_HAN_BANG_KIEM',
        seatIndex: 0,
        activate: true,
        picks: [
          { zone: 'HAND', handIndex: 0 },
          { zone: 'HAND', handIndex: 0 },
        ],
      });

      // Không mất máu, mất 2 lá bài, và KHÔNG kích hoạt bất kỳ kỹ năng phản đòn/nhận bài nào
      expect(state.players[1]!.hp).toBe(4);
      expect(state.players[1]!.handCards).toHaveLength(0);
      expect(state.interruptStack).toHaveLength(0);
    }
  });

  it('Các kỹ năng Chủ Công (Kích Tướng, Hộ Giá, Cứu Viện) CHỈ kích hoạt khi đóng vai Chủ Công (LORD)', () => {
    // 1) Lưu Bị không phải Chủ Công -> cấm Kích Tướng
    const nonLordLiuBei = makeControlledState(4, {
      0: { heroId: 'zhang_fei', identity: 'LORD' },
      1: { heroId: 'liu_bei', identity: 'LOYALIST', handCards: [] },
      2: { heroId: 'guan_yu', identity: 'REBEL', handCards: [card('sat', 'Sát', 'BASIC', 'SPADE', 7)] },
    });
    const stateLiuBeiTurn = { ...nonLordLiuBei, currentTurnSeat: 1, turnPhase: 'PLAY' as const };
    expect(() =>
      applyGameAction(stateLiuBeiTurn, {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex: 1,
        skillId: 'ji_jiang',
        targetSeats: [2],
      }),
    ).toThrow();

    // 2) Tào Tháo không phải Chủ Công -> không mở WAIT_HU_JIA khi bị đánh Sát (hoặc dùng useHuJia bị từ chối)
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const thiem = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);
    let nonLordCaoCao = makeControlledState(4, {
      0: { heroId: 'zhang_fei', identity: 'LORD', handCards: [sat] },
      1: { heroId: 'cao_cao', identity: 'LOYALIST', handCards: [] },
      2: { heroId: 'si_ma_yi', identity: 'REBEL', handCards: [thiem] },
    });
    nonLordCaoCao = applyGameAction(nonLordCaoCao, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    expect(() =>
      applyGameAction(nonLordCaoCao, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
        useHuJia: true,
      }),
    ).toThrow();

    // 3) Tôn Quyền không phải Chủ Công -> đồng minh Ngô dùng Đào cứu chỉ hồi +1 máu (không có +1 Cứu Viện)
    const dao = card('dao', 'Đào', 'BASIC', 'HEART', 6);
    let nonLordSunQuan = makeControlledState(4, {
      0: { heroId: 'liu_bei', identity: 'LORD', hp: 4, maxHp: 5 },
      1: { heroId: 'sun_quan', identity: 'LOYALIST', hp: 0, maxHp: 4 },
      2: { heroId: 'zhou_yu', identity: 'REBEL', handCards: [dao] },
    });
    nonLordSunQuan = {
      ...nonLordSunQuan,
      interruptStack: [
        {
          id: 'peach-non-lord',
          kind: 'WAIT_PEACH_RESCUE',
          targetSeat: 1,
          sourceSeat: 0,
          responderSeat: 2,
          askOrder: [0, 1, 2, 3],
          askCursor: 2,
        },
      ],
    };
    nonLordSunQuan = applyGameAction(nonLordSunQuan, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 2,
      cardId: dao.id,
    });
    expect(nonLordSunQuan.players[1]!.hp).toBe(1);

    // 4) Tôn Quyền LÀ Chủ Công -> đồng minh Ngô dùng Đào cứu hồi +2 máu (+1 Đào + 1 Cứu Viện)
    const daoLord = card('dao', 'Đào', 'BASIC', 'HEART', 7);
    let lordSunQuan = makeControlledState(4, {
      0: { heroId: 'sun_quan', identity: 'LORD', hp: 0, maxHp: 5 },
      1: { heroId: 'zhou_yu', identity: 'LOYALIST', handCards: [daoLord] },
    });
    lordSunQuan = {
      ...lordSunQuan,
      interruptStack: [
        {
          id: 'peach-lord',
          kind: 'WAIT_PEACH_RESCUE',
          targetSeat: 0,
          sourceSeat: 2,
          responderSeat: 1,
          askOrder: [1, 2, 3, 0],
          askCursor: 0,
        },
      ],
    };
    lordSunQuan = applyGameAction(lordSunQuan, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 1,
      cardId: daoLord.id,
    });
    expect(lordSunQuan.players[0]!.hp).toBe(2);
  });

  it('Chuẩn Yoka: Điêu Thuyền Ly Gián bị Vô Giải Khả Kích chặn được & tôn trọng Không Thành mục tiêu thứ 2', () => {
    const cost = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 4);
    const voGiai = card('vo_giai_kha_kich', 'Vô Giải Khả Kích', 'NORMAL_SCROLL', 'SPADE', 11);
    const state = makeControlledState(4, {
      0: { heroId: 'diao_chan', hp: 3, maxHp: 3, handCards: [cost] },
      1: { heroId: 'zhuge_liang', hp: 3, maxHp: 3, handCards: [] },
      2: { heroId: 'zhang_fei', hp: 4, maxHp: 4, handCards: [] },
      3: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [voGiai] },
    });

    // Gia Cát Lượng hết bài không thể làm mục tiêu thứ 2 (người bị Quyết Đấu)
    expect(() =>
      applyGameAction(state, {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex: 0,
        skillId: 'li_jian',
        cardIds: [cost.id],
        targetSeats: [2, 1],
      }),
    ).toThrow();

    // Nhưng Gia Cát Lượng CÓ THỂ là người thứ nhất thách đấu Trương Phi, và Ghế 3 dùng Vô Giải chặn được!
    let next = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'li_jian',
      cardIds: [cost.id],
      targetSeats: [1, 2],
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_NULLIFICATION');

    next = applyGameAction(next, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 3,
      cardId: voGiai.id,
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_NULLIFICATION');
    next = applyGameAction(next, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

    // Bị Vô Giải vô hiệu hóa nên không có Quyết Đấu nào xảy ra, cả hai giữ nguyên 4 & 3 máu
    expect(next.interruptStack).toHaveLength(0);
    expect(next.players[1]!.hp).toBe(3);
    expect(next.players[2]!.hp).toBe(4);
  });

  it('Chuẩn Yoka: Bát Quái Trận được bói tối đa 2 lần trước Vô Song (Lữ Bố) & Hộ Giá kích hoạt Quán Thạch Phủ tự bỏ mình', () => {
    const bagua = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
    const sat1 = card('sat', 'Sát', 'BASIC', 'HEART', 10);
    const red1 = card('dao', 'Đào 1', 'BASIC', 'HEART', 3);
    const red2 = card('dao', 'Đào 2', 'BASIC', 'DIAMOND', 12);

    // 1) Bát Quái Trận phán xét Đỏ 2 lần liên tiếp để né trọn Vô Song của Lữ Bố mà không tốn bài tay
    let baguaState = makeControlledState(
      4,
      {
        0: { heroId: 'lu_bu', handCards: [sat1] },
        1: {
          heroId: 'zhang_fei',
          equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [red1, red2],
    );
    baguaState = applyGameAction(baguaState, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat1.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(baguaState)?.kind).toBe('WAIT_DODGE');

    baguaState = applyGameAction(baguaState, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
      useBagua: true,
    });
    expect(getPendingPrompt(baguaState)?.kind).toBe('WAIT_DODGE');

    baguaState = applyGameAction(baguaState, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
      useBagua: true,
    });
    expect(baguaState.interruptStack).toHaveLength(0);
    expect(baguaState.players[1]!.hp).toBe(4);

    // 2) Tào Tháo Chủ Công dùng Hộ Giá né xong -> địch cầm Quán Thạch Phủ được bỏ chính Quán Thạch Phủ + 1 lá ép trúng!
    const sat2 = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
    const qtp = card('quan_thach_phu', 'Quán Thạch Phủ', 'WEAPON', 'DIAMOND', 5, 3);
    const handExtra = card('dao', 'Đào dư', 'BASIC', 'HEART', 9);
    const allyThiem = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);

    let huJiaState = makeControlledState(4, {
      0: {
        heroId: 'zhang_fei',
        identity: 'REBEL',
        handCards: [sat2, handExtra],
        equipments: { weapon: qtp, armor: null, plusOneHorse: null, minusOneHorse: null },
      },
      1: { heroId: 'cao_cao', identity: 'LORD', hp: 4, maxHp: 5 },
      2: { heroId: 'zhen_ji', identity: 'LOYALIST', handCards: [allyThiem] },
    });
    huJiaState = applyGameAction(huJiaState, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat2.id],
      targetSeats: [1],
    });
    huJiaState = applyGameAction(huJiaState, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
      useHuJia: true,
    });
    expect(getPendingPrompt(huJiaState)?.kind).toBe('WAIT_HU_JIA');

    huJiaState = applyGameAction(huJiaState, {
      type: 'RESPOND_HU_JIA',
      seatIndex: 2,
      cardId: allyThiem.id,
    });
    // Sau khi Hộ Giá né đủ -> phải hỏi ASK_QUAN_THACH_PHU và cho bỏ chính lá qtp + handExtra
    expect(getPendingPrompt(huJiaState)?.kind).toBe('ASK_QUAN_THACH_PHU');
    huJiaState = applyGameAction(huJiaState, {
      type: 'RESPOND_QUAN_THACH_PHU',
      seatIndex: 0,
      activate: true,
      discardCardIds: [qtp.id, handExtra.id],
    });
    expect(huJiaState.players[0]!.equipments.weapon).toBeNull();
    expect(huJiaState.players[1]!.hp).toBe(3);
  });

  it('Chuẩn Yoka: Hoàng Nguyệt Anh (Tập Trí) rút bài khi đánh Vô Giải & Lục Tốn (Liên Doanh) rút bài khi hết tay qua Vô Giải / Từ Hùng', () => {
    const voTrung = card('vo_trung_sinh_huu', 'Vô Trung Sinh Hữu', 'NORMAL_SCROLL', 'HEART', 7);
    const voGiaiYue = card('vo_giai_kha_kich', 'Vô Giải (Nguyệt Anh)', 'NORMAL_SCROLL', 'CLUB', 12);
    const voGiaiLu = card('vo_giai_kha_kich', 'Vô Giải (Lục Tốn)', 'NORMAL_SCROLL', 'SPADE', 11);
    const draw1 = card('sat', 'Sát rút 1', 'BASIC', 'CLUB', 5);
    const draw2 = card('dao', 'Đào rút 2', 'BASIC', 'HEART', 4);
    const draw3 = card('thiem', 'Thiểm rút 3', 'BASIC', 'DIAMOND', 6);

    let state1 = makeControlledState(
      4,
      {
        0: { heroId: 'zhang_fei', handCards: [voTrung] },
        1: { heroId: 'huang_yue_ying', hp: 3, maxHp: 3, handCards: [voGiaiYue] },
        2: { heroId: 'lu_xun', hp: 3, maxHp: 3, handCards: [voGiaiLu] },
      },
      [draw1, draw2, draw3],
    );

    state1 = applyGameAction(state1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [voTrung.id],
    });
    expect(getPendingPrompt(state1)?.kind).toBe('WAIT_NULLIFICATION');

    // Hoàng Nguyệt Anh đánh Vô Giải -> Tập Trí rút ngay 1 lá (draw1)
    state1 = applyGameAction(state1, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 1,
      cardId: voGiaiYue.id,
    });
    expect(state1.players[1]!.handCards).toHaveLength(1);
    expect(state1.players[1]!.handCards[0]!.id).toBe(draw1.id);

    // Lục Tốn đánh lá Vô Giải cuối cùng trên tay để chặn lại -> Liên Doanh rút ngay 1 lá (draw2)
    state1 = applyGameAction(state1, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 2,
      cardId: voGiaiLu.id,
    });
    expect(state1.players[2]!.handCards).toHaveLength(1);
    expect(state1.players[2]!.handCards[0]!.id).toBe(draw2.id);

    // Từ Hùng Song Cổ Kiếm ép Lục Tốn bỏ lá cuối cùng trên tay -> Liên Doanh rút 1 lá bù
    const tuHung = card('tu_hung_song_co_kiem', 'Từ Hùng Song Cổ Kiếm', 'WEAPON', 'SPADE', 2, 2);
    const satMale = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
    const lastLuCard = card('dao', 'Đào cuối', 'BASIC', 'HEART', 8);
    const luDraw = card('thiem', 'Thiểm Liên Doanh', 'BASIC', 'DIAMOND', 10);

    let state2 = makeControlledState(
      4,
      {
        0: {
          heroId: 'zhen_ji',
          handCards: [satMale],
          equipments: { weapon: tuHung, armor: null, plusOneHorse: null, minusOneHorse: null },
        },
        1: { heroId: 'lu_xun', hp: 3, maxHp: 3, handCards: [lastLuCard] },
      },
      [luDraw],
    );
    state2 = applyGameAction(state2, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satMale.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(state2)?.kind).toBe('ASK_TU_HUNG');
    state2 = applyGameAction(state2, {
      type: 'RESPOND_TU_HUNG',
      seatIndex: 1,
      choice: 'DISCARD_HAND',
      discardCardId: lastLuCard.id,
    });
    expect(state2.players[1]!.handCards).toHaveLength(1);
    expect(state2.players[1]!.handCards[0]!.id).toBe(luDraw.id);
  });
});
