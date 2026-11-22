import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  canUseCollateralMurder,
  getPendingPrompt,
  projectStateForPlayer,
  STANDARD_DECK_TEMPLATES,
  type CardInstance,
  type MasterGameState,
  type PlayerCombatState,
} from '../../src/index.js';

function passNullifications(state: MasterGameState): MasterGameState {
  let cur = state;
  let guard = 0;
  while (getPendingPrompt(cur)?.kind === 'WAIT_NULLIFICATION' && guard < 32) {
    guard += 1;
    const top = cur.interruptStack[cur.interruptStack.length - 1];
    if (!top || top.kind !== 'WAIT_NULLIFICATION') break;
    if (top.isSimulatedDelay) {
      cur = applyGameAction(cur, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
      continue;
    }
    const pendingSeat = top.eligibleSeats.find((s) => !top.passedSeats.includes(s));
    if (pendingSeat === undefined) break;
    cur = applyGameAction(cur, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: pendingSeat,
      cardId: null,
    });
  }
  return cur;
}

let seq = 1;
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
    id: `audit_${cardKey}_${seq}`,
    cardKey,
    nameVi,
    category,
    suit,
    rank,
    ...(attackRange !== undefined ? { attackRange } : {}),
  };
}

function makeState(
  seatCount: number,
  overrides: Partial<Record<number, Partial<PlayerCombatState>>>,
  drawPile: CardInstance[] = [],
  phase: MasterGameState['turnPhase'] = 'PLAY',
): MasterGameState {
  const players: PlayerCombatState[] = Array.from({ length: seatCount }, (_, idx) => {
    const ov = overrides[idx] ?? {};
    return {
      seatIndex: idx,
      userId: `u_${idx}`,
      displayName: `Ghế ${idx + 1}`,
      isBot: false,
      identity: idx === 0 ? 'LORD' : idx === 1 ? 'LOYALIST' : 'REBEL',
      identityRevealed: idx === 0,
      heroId: ov.heroId ?? 'zhang_fei',
      hp: ov.hp ?? 4,
      maxHp: ov.maxHp ?? 4,
      alive: ov.alive ?? true,
      handCards: ov.handCards ?? [],
      equipments: ov.equipments ?? {
        weapon: null,
        armor: null,
        plusOneHorse: null,
        minusOneHorse: null,
      },
      delayedScrolls: ov.delayedScrolls ?? [],
      ...ov,
    };
  });

  return {
    matchId: 'audit_rules_test',
    roundNumber: 1,
    currentTurnSeat: 0,
    turnPhase: phase,
    players,
    drawPile:
      drawPile.length > 0
        ? drawPile
        : Array.from({ length: 12 }, (_, i) =>
            card('dao', `Đào dự phòng ${i}`, 'BASIC', 'HEART', (i % 13) + 1),
          ),
    discardPile: [],
    interruptStack: [],
    actionLog: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    nextFrameSeq: 0,
  };
}

describe('Kiểm chứng toàn diện chuẩn luật Yoka Standard (1A + 2A)', () => {
  it('Bộ bài 108 lá: Thiểm Điện A♠ thuộc bản gốc 104, Thiểm Điện Q♥ thuộc EX (+4)', () => {
    const lightnings = STANDARD_DECK_TEMPLATES.filter((c) => c.cardKey === 'thiem_dien');
    expect(lightnings).toHaveLength(2);
    const spadeA = lightnings.find((c) => c.suit === 'SPADE' && c.rank === 1);
    const heartQ = lightnings.find((c) => c.suit === 'HEART' && c.rank === 12);
    expect(spadeA?.isEx).toBeFalsy();
    expect(heartQ?.isEx).toBe(true);
  });

  it('Tào Tháo (Gian Hùng 2A): nhận lại Nam Man / Vạn Tiễn / Quyết Đấu / Thiểm Điện khi sống sót, KHÔNG nhân bản bài ảo', () => {
    // 1) Nam Man Nhập Xâm -> Tào Tháo lấy lại lá Nam Man thật từ chồng bài bỏ
    const namMan = card('nam_man_nhap_xam', 'Nam Man Nhập Xâm', 'NORMAL_SCROLL', 'SPADE', 7);
    let state = makeState(4, {
      0: { heroId: 'zhang_fei', handCards: [namMan] },
      1: { heroId: 'cao_cao', hp: 4, maxHp: 4, handCards: [] },
      2: { heroId: 'zhao_yun', handCards: [card('sat', 'Sát', 'BASIC', 'CLUB', 5)] },
      3: { heroId: 'sun_quan', handCards: [card('sat', 'Sát', 'BASIC', 'CLUB', 6)] },
    });
    state = passNullifications(
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [namMan.id] }),
    );
    // Ghế 1 (Tào Tháo) không có Sát -> chịu sát thương -> ASK_JIAN_XIONG
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_AOE_SAT');
    state = applyGameAction(state, { type: 'RESPOND_AOE_SAT', seatIndex: 1, cardIds: null });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_JIAN_XIONG');
    state = applyGameAction(state, { type: 'RESPOND_JIAN_XIONG', seatIndex: 1, activate: true });
    expect(state.players[1]!.handCards.some((c) => c.id === namMan.id)).toBe(true);
    expect(state.discardPile.some((c) => c.id === namMan.id)).toBe(false);

    // 2) Thiểm Điện nổ 3 sát thương vào Tào Tháo (4 máu -> còn 1 máu) -> 2A cho lấy lá Thiểm Điện
    const lightning = card('thiem_dien', 'Thiểm Điện', 'DELAYED_SCROLL', 'SPADE', 1);
    const boomJudge = card('sat', 'Phán xét 5♠', 'BASIC', 'SPADE', 5);
    let lState = makeState(
      4,
      {
        0: { heroId: 'cao_cao', hp: 4, maxHp: 4, delayedScrolls: [lightning] },
      },
      [boomJudge, card('dao', 'Đào', 'BASIC', 'HEART', 3)],
      'JUDGE',
    );
    lState = { ...lState, currentTurnSeat: 3, turnPhase: 'PLAY' };
    lState = passNullifications(
      applyGameAction(lState, { type: 'END_PLAY_PHASE', seatIndex: 3 }),
    );
    expect(getPendingPrompt(lState)?.kind).toBe('ASK_JIAN_XIONG');
    lState = applyGameAction(lState, { type: 'RESPOND_JIAN_XIONG', seatIndex: 0, activate: true });
    expect(lState.players[0]!.hp).toBe(1);
    expect(lState.players[0]!.handCards.some((c) => c.id === lightning.id)).toBe(true);
    expect(lState.discardPile.some((c) => c.id === lightning.id)).toBe(false);
  });

  it('Thiểm Điện chuyển qua ghế kế tiếp kể cả khi đã có Thiểm Điện (không lặp vô hạn trong lượt)', () => {
    const l1 = card('thiem_dien', 'Thiểm Điện 1', 'DELAYED_SCROLL', 'SPADE', 1);
    const l2 = card('thiem_dien', 'Thiểm Điện 2', 'DELAYED_SCROLL', 'HEART', 12);
    const safeJudge = card('dao', 'An toàn', 'BASIC', 'HEART', 4);
    let state = makeState(
      4,
      {
        0: { heroId: 'zhang_fei', delayedScrolls: [l1] },
        1: { heroId: 'zhao_yun', delayedScrolls: [l2] },
        2: { heroId: 'guan_yu', alive: false, hp: 0 },
        3: { heroId: 'sun_quan', alive: false, hp: 0 },
      },
      [safeJudge, card('sat', 'Rút 1', 'BASIC', 'CLUB', 2), card('sat', 'Rút 2', 'BASIC', 'CLUB', 3)],
      'PLAY',
    );
    state = { ...state, currentTurnSeat: 1 };
    // Ghế 1 kết thúc lượt -> chuyển sang ghế 0 pha JUDGE -> phán xét l1 an toàn -> chồng sang ghế 1 và sang PLAY bình thường!
    state = passNullifications(
      applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 1 }),
    );
    expect(state.currentTurnSeat).toBe(0);
    expect(state.turnPhase).toBe('PLAY');
    expect(state.players[0]!.delayedScrolls).toHaveLength(0);
    expect(state.players[1]!.delayedScrolls.map((c) => c.id)).toEqual([l2.id, l1.id]);
  });

  it('Hoàng Cái (Khổ Nhục) khi tự hạ về 0 máu và được cứu Đào vẫn rút đủ 2 lá', () => {
    const dao = card('dao', 'Đào cứu', 'BASIC', 'HEART', 6);
    const draw1 = card('sat', 'Rút 1', 'BASIC', 'SPADE', 7);
    const draw2 = card('thiem', 'Rút 2', 'BASIC', 'DIAMOND', 8);
    let state = makeState(
      4,
      {
        0: { heroId: 'huang_gai', hp: 1, maxHp: 4, handCards: [dao] },
      },
      [draw1, draw2],
    );
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ku_rou',
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_PEACH_RESCUE');
    state = applyGameAction(state, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 0,
      cardId: dao.id,
    });
    expect(state.players[0]!.hp).toBe(1);
    expect(state.players[0]!.handCards).toHaveLength(2);
  });

  it('Chu Du (Phản Gián): đoán sai chất chịu sát thương (và Hấp Hối nếu 0 máu) TRƯỚC KHI nhận lá bài', () => {
    const spadeCard = card('dao', 'Đào Bích giả lập', 'BASIC', 'SPADE', 3);
    const zhouHand = card('dao', 'Đào Cơ', 'BASIC', 'HEART', 7);
    let state = makeState(4, {
      0: { heroId: 'zhou_yu', handCards: [zhouHand] },
      1: { heroId: 'zhang_fei', hp: 1, maxHp: 4, handCards: [] },
    });
    state = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'fan_jian',
      targetSeats: [1],
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_FAN_JIAN_GUESS');
    // Đoán SPADE nhưng Chu Du cầm HEART -> sai chất -> 0 máu -> Hấp Hối TRƯỚC khi nhận Đào Cơ!
    state = applyGameAction(state, {
      type: 'RESPOND_FAN_JIAN_GUESS',
      seatIndex: 1,
      suit: 'SPADE',
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_PEACH_RESCUE');
    // Tại thời điểm Hấp Hối, Ghế 1 CHƯA được cầm lá Đào Cơ của Chu Du để tự cứu!
    expect(state.players[1]!.handCards).toHaveLength(0);
    // Đảm bảo không dùng được biến thừa
    expect(spadeCard.suit).toBe('SPADE');
  });

  it('Tư Mã Ý (Phản Quỷ): KHÔNG được chọn lấy lá trong vùng Phán Xét (DELAYED)', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
    const lac = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'HEART', 6);
    const handCard = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);
    let state = makeState(4, {
      0: { heroId: 'zhang_fei', handCards: [sat, handCard], delayedScrolls: [lac] },
      1: { heroId: 'si_ma_yi', hp: 3, maxHp: 3, handCards: [] },
    });
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    state = applyGameAction(state, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_FAN_KUI');
    state = applyGameAction(state, { type: 'RESPOND_FAN_KUI', seatIndex: 1, activate: true });
    expect(getPendingPrompt(state)?.kind).toBe('PICK_TARGET_CARD');
    expect(() =>
      applyGameAction(state, {
        type: 'RESPOND_PICK_TARGET_CARD',
        seatIndex: 1,
        zone: 'DELAYED',
        delayedCardId: lac.id,
      }),
    ).toThrow('DELAYED_ZONE_NOT_ALLOWED');
  });

  it('Đại Kiều (Quốc Sắc): lá bị Thuận Thủ / Quá Hà lấy lại về tay giữ nguyên mặt bài vật lý gốc', () => {
    const diamondSat = card('sat', 'Sát Rô', 'BASIC', 'DIAMOND', 9);
    const snatch = card('thuan_thu_khien_duong', 'Thuận Thủ Khiên Dương', 'NORMAL_SCROLL', 'SPADE', 3);
    let state = makeState(4, {
      0: { heroId: 'da_qiao', handCards: [diamondSat, snatch] },
      1: { heroId: 'zhang_fei', handCards: [] },
    });
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [diamondSat.id],
      asCardKey: 'lac_bat_tu_thuc',
      targetSeats: [1],
    });
    expect(state.players[1]!.delayedScrolls[0]!.cardKey).toBe('lac_bat_tu_thuc');
    state = passNullifications(
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [snatch.id],
        targetSeats: [1],
      }),
    );
    state = applyGameAction(state, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 0,
      zone: 'DELAYED',
      delayedCardId: diamondSat.id,
    });
    // Về tay phải là Sát Rô gốc, KHÔNG biến thành Lạc Bất Tư Thục thật!
    expect(state.players[0]!.handCards[0]!.cardKey).toBe('sat');
    expect(state.players[0]!.handCards[0]!.nameVi).toBe('Sát Rô');
  });

  it('Mã Siêu (Thiết Kỵ) + Nhân Vương Thuẫn: Thiết Kỵ ra Đỏ vẫn KHÔNG xuyên được Nhân Vương Thuẫn với Sát Đen', () => {
    const blackSat = card('sat', 'Sát Đen', 'BASIC', 'SPADE', 7);
    const shield = card('nhan_vuong_thuan', 'Nhân Vương Thuẫn', 'ARMOR', 'CLUB', 2);
    const redJudge = card('dao', 'Phán xét Đỏ', 'BASIC', 'HEART', 4);
    let state = makeState(
      4,
      {
        0: { heroId: 'ma_chao', handCards: [blackSat] },
        1: {
          heroId: 'zhang_fei',
          hp: 4,
          equipments: { weapon: null, armor: shield, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [redJudge],
    );
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [blackSat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_TIE_QI');
    state = applyGameAction(state, { type: 'RESPOND_TIE_QI', seatIndex: 0, activate: true });
    // Dù Thiết Kỵ ra Đỏ, Nhân Vương Thuẫn vẫn vô hiệu Sát Đen -> không mất máu!
    expect(state.players[1]!.hp).toBe(4);
    expect(state.interruptStack).toHaveLength(0);
  });

  it('Lưu Bị Chủ Công (Kích Tướng): có thể gọi đồng đội Thục đánh Sát trong Nam Man Nhập Xâm & Quyết Đấu', () => {
    const namMan = card('nam_man_nhap_xam', 'Nam Man Nhập Xâm', 'NORMAL_SCROLL', 'SPADE', 7);
    const guanSat = card('sat', 'Sát Quan Vũ', 'BASIC', 'HEART', 10);
    let state = makeState(4, {
      0: { heroId: 'zhang_fei', identity: 'REBEL', handCards: [namMan] },
      1: { heroId: 'liu_bei', identity: 'LORD', hp: 5, maxHp: 5, handCards: [] },
      2: { heroId: 'guan_yu', identity: 'LOYALIST', handCards: [guanSat] },
      3: { heroId: 'sun_quan', identity: 'REBEL', handCards: [card('sat', 'Sát', 'BASIC', 'CLUB', 4)] },
    });
    state = passNullifications(
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [namMan.id] }),
    );
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_AOE_SAT');
    state = applyGameAction(state, {
      type: 'RESPOND_AOE_SAT',
      seatIndex: 1,
      cardIds: null,
      useJiJiang: true,
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_JI_JIANG');
    state = applyGameAction(state, {
      type: 'RESPOND_JI_JIANG',
      seatIndex: 2,
      cardIds: [guanSat.id],
    });
    expect(state.players[1]!.hp).toBe(5);
  });

  it('Tào Tháo Chủ Công (Hộ Giá): tướng Ngụy mặc Bát Quái Trận có thể phán xét Bát Quái hộ Chủ Công', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
    const bagua = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
    const redJudge = card('dao', 'Đỏ', 'BASIC', 'HEART', 5);
    let state = makeState(
      4,
      {
        0: { heroId: 'zhang_fei', identity: 'REBEL', handCards: [sat] },
        1: { heroId: 'cao_cao', identity: 'LORD', hp: 5, maxHp: 5 },
        2: {
          heroId: 'xia_hou_dun',
          identity: 'LOYALIST',
          equipments: { weapon: null, armor: bagua, plusOneHorse: null, minusOneHorse: null },
        },
      },
      [redJudge],
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
      useHuJia: true,
    });
    expect(getPendingPrompt(state)?.kind).toBe('WAIT_HU_JIA');
    state = applyGameAction(state, {
      type: 'RESPOND_HU_JIA',
      seatIndex: 2,
      cardId: null,
      useBagua: true,
    });
    expect(state.players[1]!.hp).toBe(5);
    expect(state.interruptStack).toHaveLength(0);
  });

  it('Tá Đao Sát Nhân: KHÔNG thể chỉ định Gia Cát Lượng hết bài tay (Không Thành) làm nạn nhân', () => {
    const weapon = card('thanh_cong_kiem', 'Thanh Công Kiếm', 'WEAPON', 'SPADE', 6, 2);
    const state = makeState(4, {
      0: { heroId: 'zhang_fei' },
      1: {
        heroId: 'zhao_yun',
        equipments: { weapon, armor: null, plusOneHorse: null, minusOneHorse: null },
      },
      2: { heroId: 'zhuge_liang', handCards: [] },
    });
    expect(canUseCollateralMurder(state, 0, 1, 2)).toBe(false);
  });

  it('Hứa Chử (Lỏa Y) + Hàn Băng Kiếm: nếu từ chối kích hoạt Hàn Băng Kiếm vẫn gây đủ 2 sát thương', () => {
    const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
    const hanBang = card('han_bang_kiem', 'Hàn Băng Kiếm', 'WEAPON', 'SPADE', 2, 2);
    let state = makeState(4, {
      0: {
        heroId: 'xu_chu',
        handCards: [sat],
        equipments: { weapon: hanBang, armor: null, plusOneHorse: null, minusOneHorse: null },
      },
      1: { heroId: 'zhang_fei', hp: 4, handCards: [card('dao', 'Đào', 'BASIC', 'HEART', 3)] },
    });
    state = { ...state, turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false, luoYiActive: true } };
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [sat.id],
      targetSeats: [1],
    });
    state = applyGameAction(state, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(getPendingPrompt(state)?.kind).toBe('ASK_HAN_BANG_KIEM');
    state = applyGameAction(state, { type: 'RESPOND_HAN_BANG_KIEM', seatIndex: 0, activate: false });
    expect(state.players[1]!.hp).toBe(2);
  });

  it('Lữ Mông (Khắc Kỷ): đánh Sát trả lời Quyết Đấu trong pha PLAY của mình bị tính đã đánh Sát (không hỏi Khắc Kỷ)', () => {
    const duel = card('quyet_dau', 'Quyết Đấu', 'NORMAL_SCROLL', 'SPADE', 1);
    const lvSat = card('sat', 'Sát Lữ Mông', 'BASIC', 'CLUB', 6);
    const oppSat = card('sat', 'Sát địch', 'BASIC', 'CLUB', 7);
    let state = makeState(4, {
      0: {
        heroId: 'lv_meng',
        hp: 4,
        handCards: [
          duel,
          lvSat,
          card('dao', 'Đào 1', 'BASIC', 'HEART', 3),
          card('dao', 'Đào 2', 'BASIC', 'HEART', 4),
          card('dao', 'Đào 3', 'BASIC', 'HEART', 5),
          card('dao', 'Đào 4', 'BASIC', 'HEART', 6),
          card('dao', 'Đào 5', 'BASIC', 'HEART', 7),
        ],
      },
      1: { heroId: 'zhang_fei', handCards: [oppSat] },
    });
    state = passNullifications(
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [duel.id],
        targetSeats: [1],
      }),
    );
    // Ghế 1 đánh Sát -> đến lượt Ghế 0 (Lữ Mông) đánh Sát trả lời trong pha PLAY
    state = applyGameAction(state, { type: 'RESPOND_DUEL_SAT', seatIndex: 1, cardIds: [oppSat.id] });
    state = applyGameAction(state, { type: 'RESPOND_DUEL_SAT', seatIndex: 0, cardIds: [lvSat.id] });
    state = applyGameAction(state, { type: 'RESPOND_DUEL_SAT', seatIndex: 1, cardIds: null });
    // Kết thúc pha PLAY -> phải vào DISCARD thẳng, KHÔNG hỏi ASK_KE_JI!
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 0 });
    expect(state.turnPhase).toBe('DISCARD');
    expect(getPendingPrompt(state)?.kind).toBe('DISCARD');
  });

  it('Vô Giải Khả Kích lồng nhau (nullifyDepth 0 -> 1 -> 2): giữ nguyên originalScrollNameVi, originalTargetSeat và không rò rỉ isSimulatedDelay/eligibleSeats', () => {
    const quaHa = card('qua_ha_sai_cau', 'Quá Hà Sách Kiều', 'NORMAL_SCROLL', 'SPADE', 3);
    const vg1 = card('vo_giai_kha_kich', 'Vô Giải Khả Kích 1', 'NORMAL_SCROLL', 'SPADE', 11);
    const vg2 = card('vo_giai_kha_kich', 'Vô Giải Khả Kích 2', 'NORMAL_SCROLL', 'CLUB', 12);
    const targetCard = card('dao', 'Đào mục tiêu', 'BASIC', 'HEART', 5);

    let state: MasterGameState = {
      ...makeState(4, {
        0: { heroId: 'cao_cao', handCards: [quaHa] },
        1: { heroId: 'liu_bei', handCards: [vg1, targetCard] },
        2: { heroId: 'sun_quan', handCards: [vg2] },
      }),
      refereeAuditLog: [],
      winnerUserIds: [],
    };

    // Độ sâu 0: Ghế 0 dùng Quá Hà Sách Kiều nhắm vào Ghế 1
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [quaHa.id],
      targetSeats: [1],
    });

    const top0 = state.interruptStack[state.interruptStack.length - 1];
    expect(top0?.kind).toBe('WAIT_NULLIFICATION');
    if (top0?.kind === 'WAIT_NULLIFICATION') {
      expect(top0.scrollNameVi).toBe('Quá Hà Sách Kiều');
      expect(top0.originalScrollNameVi).toBe('Quá Hà Sách Kiều');
      expect(top0.originalTargetSeat).toBe(1);
      expect(top0.nullifyDepth).toBe(0);
    }

    const view0 = projectStateForPlayer(state, state.players[1]!.userId);
    expect(view0.activeInterrupt).toMatchObject({
      kind: 'WAIT_NULLIFICATION',
      scrollNameVi: 'Quá Hà Sách Kiều',
      originalScrollNameVi: 'Quá Hà Sách Kiều',
      originalTargetSeat: 1,
      nullifyDepth: 0,
      canRespondNullification: true,
    });
    expect('isSimulatedDelay' in (view0.activeInterrupt ?? {})).toBe(false);
    expect('eligibleSeats' in (view0.activeInterrupt ?? {})).toBe(false);

    // Độ sâu 1: Ghế 1 đánh Vô Giải Khả Kích phản bác Quá Hà Sách Kiều
    state = applyGameAction(state, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 1,
      cardId: vg1.id,
    });

    const top1 = state.interruptStack[state.interruptStack.length - 1];
    expect(top1?.kind).toBe('WAIT_NULLIFICATION');
    if (top1?.kind === 'WAIT_NULLIFICATION') {
      expect(top1.scrollNameVi).toBe('Vô Giải Khả Kích');
      expect(top1.targetSeat).toBe(1);
      expect(top1.originalScrollNameVi).toBe('Quá Hà Sách Kiều');
      expect(top1.originalTargetSeat).toBe(1);
      expect(top1.nullifyDepth).toBe(1);
    }

    const view1 = projectStateForPlayer(state, state.players[2]!.userId);
    expect(view1.activeInterrupt).toMatchObject({
      kind: 'WAIT_NULLIFICATION',
      scrollNameVi: 'Vô Giải Khả Kích',
      originalScrollNameVi: 'Quá Hà Sách Kiều',
      originalTargetSeat: 1,
      nullifyDepth: 1,
      canRespondNullification: true,
    });
    expect('isSimulatedDelay' in (view1.activeInterrupt ?? {})).toBe(false);
    expect('eligibleSeats' in (view1.activeInterrupt ?? {})).toBe(false);

    // Độ sâu 2: Ghế 2 đánh Vô Giải Khả Kích phản bác lại Vô Giải Khả Kích của Ghế 1
    state = applyGameAction(state, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 2,
      cardId: vg2.id,
    });

    const top2 = state.interruptStack[state.interruptStack.length - 1];
    expect(top2?.kind).toBe('WAIT_NULLIFICATION');
    if (top2?.kind === 'WAIT_NULLIFICATION') {
      expect(top2.scrollNameVi).toBe('Vô Giải Khả Kích');
      expect(top2.targetSeat).toBe(2);
      expect(top2.originalScrollNameVi).toBe('Quá Hà Sách Kiều');
      expect(top2.originalTargetSeat).toBe(1);
      expect(top2.nullifyDepth).toBe(2);
    }

    const view2 = projectStateForPlayer(state, state.players[0]!.userId);
    expect(view2.activeInterrupt).toMatchObject({
      kind: 'WAIT_NULLIFICATION',
      scrollNameVi: 'Vô Giải Khả Kích',
      originalScrollNameVi: 'Quá Hà Sách Kiều',
      originalTargetSeat: 1,
      nullifyDepth: 2,
      canRespondNullification: false,
    });
    expect('isSimulatedDelay' in (view2.activeInterrupt ?? {})).toBe(false);
    expect('eligibleSeats' in (view2.activeInterrupt ?? {})).toBe(false);
  });

  it('Vòng 1 Hòa Bình: cấm Sát trong toàn bộ Vòng 1 (kể cả khi Chủ Công ngồi giữa bàn), sang Vòng 2 mở khóa Sát', () => {
    const sat0 = card('sat', 'Sát 0', 'BASIC', 'SPADE', 7);
    const sat2 = card('sat', 'Sát 2', 'BASIC', 'HEART', 8);
    const sat3 = card('sat', 'Sát 3', 'BASIC', 'CLUB', 9);
    // Chủ Công ngồi Ghế 2 (không phải ghế 0) -> Vòng 1 gồm Ghế 2 -> 3 -> 0 -> 1, về lại Ghế 2 mới lên Vòng 2
    let state: MasterGameState = {
      ...makeState(4, {
        0: { identity: 'REBEL', heroId: 'zhang_fei', handCards: [sat0] },
        1: { identity: 'SPY', heroId: 'zhao_yun', handCards: [] },
        2: { identity: 'LORD', heroId: 'liu_bei', handCards: [sat2], maxHp: 5, hp: 5 },
        3: { identity: 'LOYALIST', heroId: 'guan_yu', handCards: [sat3] },
      }),
      peacefulFirstRound: true,
      roundNumber: 1,
      currentTurnSeat: 2,
    };

    expect(() =>
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 2,
        cardIds: [sat2.id],
        targetSeats: [3],
      }),
    ).toThrow('FIRST_ROUND_SAT_FORBIDDEN');

    // Ghế 2 -> 3 -> 0 -> 1 vẫn thuộc roundNumber === 1 và không rút 2 lá ở Vòng 1!
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 2 });
    expect(state.currentTurnSeat).toBe(3);
    expect(state.roundNumber).toBe(1);
    expect(state.players[3]!.handCards).toHaveLength(1);

    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 3 });
    expect(state.currentTurnSeat).toBe(0);
    expect(state.roundNumber).toBe(1);
    expect(state.players[0]!.handCards).toHaveLength(1);
    expect(() =>
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat0.id],
        targetSeats: [1],
      }),
    ).toThrow('FIRST_ROUND_SAT_FORBIDDEN');

    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 0 });
    expect(state.currentTurnSeat).toBe(1);
    expect(state.roundNumber).toBe(1);
    expect(state.players[1]!.handCards).toHaveLength(0);

    // Kết thúc lượt Ghế 1 -> quay về Chủ Công Ghế 2 => Vòng 2 rút 2 lá & mở khóa Sát!
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 1 });
    expect(state.currentTurnSeat).toBe(2);
    expect(state.roundNumber).toBe(2);
    expect(state.players[2]!.handCards).toHaveLength(3);
    const satPlayed = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 2,
      cardIds: [sat2.id],
      targetSeats: [3],
    });
    expect(satPlayed.interruptStack.at(-1)?.kind).toBe('WAIT_DODGE');
  });

  it('Chồng 2 Lạc Bất Tư Thục & 2 Thiểm Điện: Lạc đầu làm mất lượt thì Lạc thứ 2 giữ lại cho vòng sau; Sét vẫn phán xét đủ', () => {
    const lac1 = card('lac_bat_tu_thuc', 'Lạc 1', 'DELAYED_SCROLL', 'SPADE', 6);
    const lac2 = card('lac_bat_tu_thuc', 'Lạc 2', 'DELAYED_SCROLL', 'CLUB', 6);
    const set1 = card('thiem_dien', 'Sét 1', 'DELAYED_SCROLL', 'SPADE', 1);
    const set2 = card('thiem_dien', 'Sét 2', 'DELAYED_SCROLL', 'HEART', 12);

    // Có thể đặt chồng Lạc thứ 2 và Sét thứ 2 trong PLAY
    let state = makeState(4, {
      0: { heroId: 'zhang_fei', handCards: [lac2, set2], delayedScrolls: [set1] },
      1: { heroId: 'zhao_yun', handCards: [], delayedScrolls: [lac1] },
    }, [
      card('sat', 'Phán xét Lạc 2 trượt ♠8', 'BASIC', 'SPADE', 8),
      card('dao', 'Ghế 1 Rút 1', 'BASIC', 'HEART', 4),
      card('dao', 'Ghế 1 Rút 2', 'BASIC', 'HEART', 5),
      card('dao', 'Ghế 2 Rút 1', 'BASIC', 'HEART', 2),
      card('dao', 'Ghế 2 Rút 2', 'BASIC', 'HEART', 3),
      card('dao', 'Ghế 3 Rút 1', 'BASIC', 'HEART', 6),
      card('dao', 'Ghế 3 Rút 2', 'BASIC', 'HEART', 7),
      card('sat', 'Sét B trượt ♦K', 'BASIC', 'DIAMOND', 13),
      card('dao', 'Sét A trượt ♥Q', 'BASIC', 'HEART', 12),
      card('dao', 'Ghế 0 Rút 1', 'BASIC', 'HEART', 9),
      card('dao', 'Ghế 0 Rút 2', 'BASIC', 'HEART', 10),
    ]);
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [lac2.id],
      targetSeats: [1],
    });
    state = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [set2.id],
      targetSeats: [],
    });
    expect(state.players[0]!.delayedScrolls).toHaveLength(2);
    expect(state.players[1]!.delayedScrolls).toHaveLength(2);

    // Sang lượt Ghế 1 có [lac1, lac2] -> lac2 (đỉnh stack LIFO) trượt ♠8 làm mất pha Đánh -> lac1 được giữ nguyên sang vòng sau!
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 0 });
    state = passNullifications(state);
    expect(state.currentTurnSeat).toBe(2); // Ghế 1 đã mất pha Đánh & rút 2 lá nên qua Ghế 2
    expect(state.players[1]!.delayedScrolls.some((c) => c.id === lac1.id)).toBe(true);

    // Cho Ghế 2, 3 qua lượt để quay về Ghế 0: cả 2 Thiểm Điện [set1, set2] trên Ghế 0 đều phán xét và chuyển sang Ghế 1!
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 2 });
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: 3 });
    state = passNullifications(state);
    expect(state.currentTurnSeat).toBe(0);
    expect(state.players[0]!.delayedScrolls).toHaveLength(0);
    expect(state.players[1]!.delayedScrolls.some((c) => c.id === set1.id)).toBe(true);
    expect(state.players[1]!.delayedScrolls.some((c) => c.id === set2.id)).toBe(true);
  });
});
