import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  calculateDistance,
  getPendingPrompt,
  projectStateForPlayer,
  stepEngine,
  type CardInstance,
  type MasterGameState,
  type PlayerCombatState,
  type SetupSeatInput,
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
    id: `shu_${seq}_${cardKey}`,
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
    heroId: 'liu_bei',
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
    matchId: 'shu-heroes-test',
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

describe('Bước 1.3 — 7 Tướng phe Thục (Lưu Bị, Quan Vũ, Trương Phi, Gia Cát Lượng, Triệu Vân, Mã Siêu, Hoàng Nguyệt Anh)', () => {
  it('Lưu Bị (Nhân Đức): giao bài cho người khác, đạt 2 lá hồi 1 máu (tối đa 1 lần/lượt)', () => {
    const c1 = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const c2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);
    const c3 = card('sat', 'Sát', 'BASIC', 'CLUB', 8);
    const c4 = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);

    let state = makeControlledState(4, {
      0: { heroId: 'liu_bei', hp: 2, maxHp: 5, handCards: [c1, c2, c3, c4] },
      1: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [] },
    });

    // Giao 1 lá -> chưa hồi máu
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ren_de',
      cardIds: [c1.id],
      targetSeats: [1],
    });
    expect(state.players[0]!.hp).toBe(2);
    expect(state.players[1]!.handCards).toHaveLength(1);

    // Giao thêm 1 lá (tổng 2 lá trong lượt) -> hồi 1 máu (2 -> 3)
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ren_de',
      cardIds: [c2.id],
      targetSeats: [1],
    });
    expect(state.players[0]!.hp).toBe(3);
    expect(state.players[1]!.handCards).toHaveLength(2);

    // Giao thêm 2 lá nữa trong cùng lượt -> KHÔNG hồi thêm máu
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ren_de',
      cardIds: [c3.id, c4.id],
      targetSeats: [1],
    });
    expect(state.players[0]!.hp).toBe(3);
    expect(state.players[1]!.handCards).toHaveLength(4);
  });

  it('Lưu Bị (Kích Tướng): chỉ kích hoạt khi đóng vai Chủ Công và đồng minh Thục đánh Sát thay', () => {
    const allySat = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
    let state = makeControlledState(4, {
      0: { heroId: 'liu_bei', identity: 'LORD', hp: 5, maxHp: 5, handCards: [] },
      1: { heroId: 'cao_cao', identity: 'LOYALIST', handCards: [] },
      2: { heroId: 'zhang_fei', identity: 'REBEL', handCards: [allySat] },
      3: { heroId: 'sun_quan', identity: 'SPY', hp: 4, maxHp: 4, handCards: [] },
    });

    // Phát động Kích Tướng vào ghế 3 (khoảng cách 1)
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ji_jiang',
      targetSeats: [3],
    });

    // Chỉ hỏi đồng minh phe Thục (ghế 2 - Trương Phi), bỏ qua ghế 1 (Tào Tháo - Ngụy)
    const prompt = getPendingPrompt(state);
    expect(prompt?.kind).toBe('WAIT_JI_JIANG');
    expect(prompt?.actorSeats).toEqual([2]);

    // Trương Phi đánh Sát thay Lưu Bị
    state = applyGameAction(state, {
      type: 'RESPOND_JI_JIANG',
      seatIndex: 2,
      cardIds: [allySat.id],
    });

    // Ghế 3 phải né Sát
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_DODGE');
    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 3,
      cardId: null,
    });
    expect(state.players[3]!.hp).toBe(3);
    expect(state.players[2]!.handCards).toHaveLength(0);

    // Nếu Lưu Bị không phải Chủ Công -> bị từ chối Kích Tướng
    const nonLordState = makeControlledState(4, {
      0: { heroId: 'liu_bei', identity: 'REBEL', hp: 4, maxHp: 4, handCards: [] },
      1: { heroId: 'guan_yu', identity: 'LOYALIST', handCards: [allySat] },
    });
    expect(() =>
      applyGameAction(nonLordState, {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex: 0,
        skillId: 'ji_jiang',
        targetSeats: [1],
      }),
    ).toThrow();
  });

  it('Quan Vũ (Võ Thánh): dùng bất kỳ lá Đỏ (Cơ/Rô) như Sát, không dùng được lá Đen', () => {
    const redPeach = card('dao', 'Đào', 'BASIC', 'HEART', 3);
    const blackDodge = card('thiem', 'Thiểm', 'BASIC', 'SPADE', 2);

    let state = makeControlledState(4, {
      0: { heroId: 'guan_yu', handCards: [redPeach, blackDodge] },
      1: { heroId: 'zhang_fei', hp: 4, maxHp: 4, handCards: [] },
    });

    // Dùng lá Đen làm Sát -> lỗi
    expect(() =>
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [blackDodge.id],
        targetSeats: [1],
        asCardKey: 'sat',
      }),
    ).toThrow();

    // Dùng lá Đỏ làm Sát -> hợp lệ
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [redPeach.id],
      targetSeats: [1],
      asCardKey: 'sat',
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_DODGE');
    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
    });
    expect(state.players[1]!.hp).toBe(3);
  });

  it('Trương Phi (Phao Hống): đánh Sát không giới hạn số lần trong pha PLAY', () => {
    const s1 = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const s2 = card('sat', 'Sát', 'BASIC', 'CLUB', 8);
    const s3 = card('sat', 'Sát', 'BASIC', 'HEART', 10);

    let state = makeControlledState(4, {
      0: { heroId: 'zhang_fei', handCards: [s1, s2, s3] },
      1: { heroId: 'sun_quan', hp: 4, maxHp: 4, handCards: [] },
    });

    for (const strike of [s1, s2, s3]) {
      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [strike.id],
        targetSeats: [1],
      });
      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
      });
    }

    expect(state.players[1]!.hp).toBe(1);
    expect(state.turnFlags?.satUsedThisTurn).toBe(3);
  });

  it('Gia Cát Lượng (Quan Tinh): đầu lượt xem tối đa 5 lá, ẩn với người khác trong projection, xếp đầu/đáy đúng', () => {
    const d1 = card('sat', 'Sát', 'BASIC', 'SPADE', 2);
    const d2 = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
    const d3 = card('dao', 'Đào', 'BASIC', 'HEART', 3);
    const d4 = card('vo_trung_sinh_huu', 'Vô Trung Sinh Hữu', 'NORMAL_SCROLL', 'HEART', 7);
    const d5 = card('quyet_dau', 'Quyết Đấu', 'NORMAL_SCROLL', 'SPADE', 1);
    const d6 = card('sat', 'Sát', 'BASIC', 'CLUB', 9);

    let state = makeControlledState(
      6,
      {
        0: { heroId: 'zhuge_liang', hp: 3, maxHp: 3 },
      },
      [d1, d2, d3, d4, d5, d6],
    );
    state = {
      ...state,
      turnPhase: 'JUDGE',
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false, startSkillsChecked: false },
    };

    state = stepEngine(state);
    expect(state.interruptStack[0]?.kind).toBe('WAIT_GUAN_XING');

    // Kiểm tra projectStateForPlayer: Gia Cát Lượng thấy 5 lá đầu, người khác KHÔNG thấy
    const selfView = projectStateForPlayer(state, 'u-0');
    const otherView = projectStateForPlayer(state, 'u-1');
    expect(selfView.activeInterrupt?.guanXingCards).toHaveLength(5);
    expect(otherView.activeInterrupt?.guanXingCards).toBeUndefined();

    // Xếp d5, d4 lên đầu; d1, d2, d3 xuống đáy
    state = applyGameAction(state, {
      type: 'RESPOND_GUAN_XING',
      seatIndex: 0,
      topCardIds: [d5.id, d4.id],
      bottomCardIds: [d1.id, d2.id, d3.id],
    });

    // Bước tiếp vào pha DRAW (rút 2 lá đầu -> d5, d4) và vào PLAY
    state = stepEngine(state);
    expect(state.turnPhase).toBe('PLAY');
    expect(state.players[0]!.handCards.map((c) => c.id)).toEqual([d5.id, d4.id]);
    expect(state.drawPile.map((c) => c.id)).toEqual([d6.id, d1.id, d2.id, d3.id]);
  });

  it('Gia Cát Lượng (Không Thành): khi 0 bài tay miễn nhiễm Sát và Quyết Đấu; có bài tay thì bị đánh bình thường', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const duel = card('quyet_dau', 'Quyết Đấu', 'NORMAL_SCROLL', 'SPADE', 1);

    const emptyHandState = makeControlledState(4, {
      0: { heroId: 'zhang_fei', handCards: [sat, duel] },
      1: { heroId: 'zhuge_liang', hp: 3, maxHp: 3, handCards: [] },
    });

    expect(() =>
      applyGameAction(emptyHandState, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      }),
    ).toThrow();

    expect(() =>
      applyGameAction(emptyHandState, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [duel.id],
        targetSeats: [1],
      }),
    ).toThrow();

    // Có 1 lá trên tay -> bị đánh Sát bình thường
    const oneCard = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);
    const withHandState = makeControlledState(4, {
      0: { heroId: 'zhang_fei', handCards: [sat] },
      1: { heroId: 'zhuge_liang', hp: 3, maxHp: 3, handCards: [oneCard] },
    });
    const next = applyGameAction(withHandState, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_DODGE');
  });

  it('Triệu Vân (Long Đảm): dùng Thiểm như Sát và dùng Sát như Thiểm', () => {
    const dodgeAsSat = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);
    const satAsDodge = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
    const enemySat = card('sat', 'Sát', 'BASIC', 'CLUB', 7);

    let state = makeControlledState(4, {
      0: { heroId: 'zhao_yun', handCards: [dodgeAsSat, satAsDodge] },
      1: { heroId: 'sun_quan', hp: 4, maxHp: 4, handCards: [enemySat] },
    });

    // Triệu Vân dùng Thiểm như Sát
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [dodgeAsSat.id],
      targetSeats: [1],
      asCardKey: 'sat',
    });
    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: null,
    });
    expect(projectStateForPlayer(state, 'u-1').discardPileTop).toMatchObject({
      id: dodgeAsSat.id, cardKey: 'sat', suit: 'DIAMOND', rank: 2,
    });
    expect(state.discardPile.at(-1)?.cardKey).toBe('thiem');
    expect(state.players[1]!.hp).toBe(3);

    // Kết thúc lượt 0, chuyển sang ghế 1 đánh Sát vào Triệu Vân
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 0 });
    state = {
      ...state,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    };

    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [enemySat.id],
      targetSeats: [0],
    });

    // Triệu Vân dùng Sát trên tay như Thiểm để né
    state = applyGameAction(state, {
      type: 'RESPOND_DODGE',
      seatIndex: 0,
      cardId: satAsDodge.id,
    });
    expect(projectStateForPlayer(state, 'u-1').discardPileTop).toMatchObject({
      id: satAsDodge.id, cardKey: 'thiem', suit: 'SPADE', rank: 8,
    });
    expect(state.discardPile.at(-1)?.cardKey).toBe('sat');
    expect(state.players[0]!.hp).toBe(4);
    expect(state.players[0]!.handCards).toHaveLength(0);
  });

  it('Mã Siêu (Mã Thuật & Thiết Kỵ): giảm 1 khoảng cách và chặn Thiểm + Bát Quái Trận khi phán xét ra Đỏ', () => {
    const strike = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const redJudge = card('dao', 'Đào', 'BASIC', 'HEART', 6);
    const bagua = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
    const dodge = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);

    let state = makeControlledState(
      4,
      {
        0: { heroId: 'ma_chao', handCards: [strike] },
        1: { heroId: 'cao_cao', hp: 4, maxHp: 4 },
        2: {
          heroId: 'sun_quan',
          hp: 4,
          maxHp: 4,
          handCards: [dodge],
          equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [redJudge],
    );

    // Mã Thuật: ghế 0 -> ghế 2 vốn khoảng cách 2, giảm 1 còn 1 (đánh Sát được không cần vũ khí)
    expect(calculateDistance(state, 0, 2)).toBe(1);

    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [strike.id],
      targetSeats: [2],
    });

    // Kích hoạt Thiết Kỵ
    expect(getPendingPrompt(state)?.kind).toBe('ASK_TIE_QI');
    state = applyGameAction(state, {
      type: 'RESPOND_TIE_QI',
      seatIndex: 0,
      activate: true,
    });

    // Ra chất Đỏ -> không thể dùng Thiểm hay Bát Quái Trận, trúng thẳng 1 sát thương
    expect(state.players[2]!.hp).toBe(3);
    expect(state.players[2]!.handCards).toHaveLength(1);
    expect(state.interruptStack).toHaveLength(0);
  });

  it('Hoàng Nguyệt Anh (Tập Trí & Kỳ Tài): rút 1 lá khi dùng Cẩm nang thường và bỏ qua khoảng cách Cẩm nang', () => {
    const snatch = card('thuan_thu_khien_duong', 'Thuận Thủ Khiên Dương', 'NORMAL_SCROLL', 'SPADE', 3);
    const delayed = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'HEART', 6);
    const targetCard = card('sat', 'Sát', 'BASIC', 'CLUB', 5);
    const draw1 = card('dao', 'Đào', 'BASIC', 'HEART', 4);
    const draw2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 6);

    let state = makeControlledState(
      4,
      {
        0: { heroId: 'huang_yue_ying', handCards: [snatch, delayed] },
        2: { heroId: 'cao_cao', handCards: [targetCard] },
      },
      [draw1, draw2],
    );

    // Kỳ Tài: ghế 0 -> ghế 2 khoảng cách 2 vẫn dùng được Thuận Thủ Khiên Dương
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [snatch.id],
      targetSeats: [2],
    });

    // Tập Trí: dùng Cẩm nang thường -> rút ngay 1 lá (draw1)
    expect(state.players[0]!.handCards.map((c) => c.id)).toContain(draw1.id);

    // Giải quyết Vô Giải Khả Kích (giả lập) và lấy bài ghế 2
    state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    state = applyGameAction(state, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 0,
      zone: 'HAND',
      handIndex: 0,
    });
    expect(state.players[0]!.handCards.map((c) => c.id)).toContain(targetCard.id);

    // Dùng Cẩm nang thời gian (Lạc Bất Tư Thục) -> KHÔNG kích hoạt Tập Trí (không rút draw2)
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [delayed.id],
      targetSeats: [2],
    });
    expect(state.players[0]!.handCards.map((c) => c.id)).not.toContain(draw2.id);
    expect(state.drawPile).toHaveLength(1);
  });
});
