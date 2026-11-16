import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  autoSelectTimedOutHeroes,
  createInitialMatchSetup,
  getPendingPrompt,
  projectStateForPlayer,
  startMatchCombat,
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
    id: `t_${seq}_${cardKey}`,
    cardKey,
    nameVi,
    category,
    suit,
    rank,
    ...(attackRange !== undefined ? { attackRange } : {}),
  };
}

function makeSeats(count: number): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `u-${idx}`,
    displayName: `Ghế ${idx}`,
    avatarUrl: '',
  }));
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
    heroId: idx === 0 ? 'liu_bei' : 'guan_yu',
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
    matchId: 'combat-test',
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

describe('Bước 1.2 — Máy trạng thái lượt, 108 lá bài (gồm 4 lá EX), Cầu Đào & 2 Nội Gián', () => {
  it('vòng đời lượt hoàn chỉnh (Phán xét -> Rút -> Đánh -> Bỏ bài -> Kết lượt) và tự trộn chồng bài bỏ khi hết bài rút', () => {
    let setup = createInitialMatchSetup({
      matchId: 'lifecycle',
      seats: makeSeats(4),
      rng: () => 0.3,
    });
    setup = autoSelectTimedOutHeroes(setup, () => 0.3);
    let state = startMatchCombat(setup, () => 0.3);

    const lordSeat = state.currentTurnSeat;
    const lord = state.players.find((p) => p.seatIndex === lordSeat)!;
    // 4 lá đầu + 2 lá pha Rút bài = 6 lá
    expect(state.turnPhase).toBe('PLAY');
    expect(lord.handCards).toHaveLength(6);
    expect(state.drawPile).toHaveLength(108 - 4 * 4 - 2);

    // Kết thúc pha Đánh bài -> vào DISCARD vì cầm 6 lá > maxHp (5 máu)
    state = applyGameAction(state, { type: 'END_PLAY_PHASE', seatIndex: lordSeat });
    expect(state.turnPhase).toBe('DISCARD');

    const excessCount = lord.handCards.length - lord.hp;
    const toDiscard = lord.handCards.slice(0, excessCount).map((c) => c.id);
    state = applyGameAction(state, {
      type: 'DISCARD_CARDS',
      seatIndex: lordSeat,
      cardIds: toDiscard,
    });

    // Sang lượt ghế tiếp theo và tự rút 2 lá
    const nextSeat = (lordSeat + 1) % 4;
    expect(state.currentTurnSeat).toBe(nextSeat);
    expect(state.turnPhase).toBe('PLAY');
    expect(state.players.find((p) => p.seatIndex === nextSeat)!.handCards).toHaveLength(6);

    // Kiểm tra hết chồng bài rút -> tự động trộn chồng bài bỏ
    const lowDrawState = makeControlledState(
      4,
      {},
      [card('sat', 'Sát 1', 'BASIC', 'SPADE', 7)],
      [
        card('dao', 'Đào bỏ', 'BASIC', 'HEART', 7),
        card('thiem', 'Thiểm bỏ', 'BASIC', 'DIAMOND', 5),
      ],
    );
    const afterEnd = applyGameAction(lowDrawState, {
      type: 'END_PLAY_PHASE',
      seatIndex: 0,
    });
    expect(afterEnd.currentTurnSeat).toBe(1);
    expect(afterEnd.players[1]!.handCards).toHaveLength(2);
    expect(afterEnd.discardPile).toHaveLength(0);
  });

  it('chống lộ Vô Giải Khả Kích (nhịp giả lập ẩn cờ khỏi PlayerViewState) & Vô Giải lồng Vô Giải', () => {
    const voTrung = card('vo_trung_sinh_huu', 'Vô Trung Sinh Hữu', 'NORMAL_SCROLL', 'HEART', 7);
    const vg1 = card('vo_giai_kha_kich', 'Vô Giải Khả Kích', 'NORMAL_SCROLL', 'SPADE', 11);
    const vg2 = card('vo_giai_kha_kich', 'Vô Giải Khả Kích', 'NORMAL_SCROLL', 'DIAMOND', 12);

    // Case A: Không ai có Vô Giải -> mở nhịp giả lập, PlayerViewState không lộ isSimulatedDelay
    let s1 = makeControlledState(
      4,
      { 0: { handCards: [voTrung] } },
      [
        card('sat', 'Sát A', 'BASIC', 'SPADE', 8),
        card('dao', 'Đào B', 'BASIC', 'HEART', 6),
      ],
    );
    s1 = applyGameAction(s1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [voTrung.id],
    });
    expect(getPendingPrompt(s1)).toEqual({
      kind: 'WAIT_NULLIFICATION',
      actorSeats: [],
      isSimulatedDelay: true,
    });
    const publicView = projectStateForPlayer(s1, 'u-1');
    expect(JSON.stringify(publicView)).not.toContain('isSimulatedDelay');
    expect(publicView.activeInterrupt?.kind).toBe('WAIT_NULLIFICATION');

    s1 = applyGameAction(s1, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(s1.players[0]!.handCards).toHaveLength(2);

    // Case B: Ghế 1 dùng Vô Giải chặn Vô Trung, Ghế 2 dùng Vô Giải phản lại Vô Giải -> Vô Trung thành công!
    let s2 = makeControlledState(
      4,
      {
        0: { handCards: [voTrung] },
        1: { handCards: [vg1] },
        2: { handCards: [vg2] },
      },
      [
        card('sat', 'Sát A', 'BASIC', 'SPADE', 8),
        card('dao', 'Đào B', 'BASIC', 'HEART', 6),
      ],
    );
    s2 = applyGameAction(s2, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [voTrung.id],
    });
    expect(getPendingPrompt(s2)!.isSimulatedDelay).toBe(false);
    expect(getPendingPrompt(s2)!.actorSeats).toEqual([1, 2]);

    // Ghế 1 đánh Vô Giải 1
    s2 = applyGameAction(s2, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 1,
      cardId: vg1.id,
    });
    // Ghế 2 đánh Vô Giải 2 chặn Vô Giải 1
    s2 = applyGameAction(s2, {
      type: 'RESPOND_NULLIFICATION',
      seatIndex: 2,
      cardId: vg2.id,
    });
    // Không còn ai có Vô Giải -> tự chuyển sang nhịp giả lập cho Vô Giải 2
    expect(getPendingPrompt(s2)!.isSimulatedDelay).toBe(true);
    s2 = applyGameAction(s2, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

    // Vô Trung Sinh Hữu vẫn được giải quyết: Ghế 0 rút 2 lá!
    expect(s2.players[0]!.handCards).toHaveLength(2);
  });

  it('Hàn Băng Kiếm (EX) hủy tối đa 2 lá thay sát thương & Nhân Vương Thuẫn (EX) vs Thanh Công Kiếm', () => {
    const hanBang = card('han_bang_kiem', 'Hàn Băng Kiếm', 'WEAPON', 'SPADE', 2, 2);
    const nhanVuong = card('nhan_vuong_thuan', 'Nhân Vương Thuẫn', 'ARMOR', 'CLUB', 2);
    const thanhCong = card('thanh_cong_kiem', 'Thanh Công Kiếm', 'WEAPON', 'SPADE', 6, 2);
    const blackSat = card('sat', 'Sát Đen', 'BASIC', 'SPADE', 9);
    const blackSat2 = card('sat', 'Sát Chuồn', 'BASIC', 'CLUB', 8);
    const redSat = card('sat', 'Sát Đỏ', 'BASIC', 'HEART', 10);

    // 1. Nhân Vương Thuẫn vô hiệu hóa Sát Đen, nhưng Sát Đỏ vẫn bắt Thiểm
    let s1 = makeControlledState(4, {
      0: {
        equipments: {
          weapon: card('gia_cat_lien_no', 'Liên Nỗ', 'WEAPON', 'CLUB', 1, 1),
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
        handCards: [blackSat, redSat],
      },
      1: {
        equipments: {
          weapon: null,
          armor: nhanVuong,
          plusOneHorse: null,
          minusOneHorse: null,
        },
        handCards: [],
      },
    });
    s1 = applyGameAction(s1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [blackSat.id],
      targetSeats: [1],
    });
    expect(s1.interruptStack).toHaveLength(0);
    expect(s1.players[1]!.hp).toBe(4);

    // Sát Đỏ vẫn đánh xuyên Nhân Vương Thuẫn
    s1 = applyGameAction(s1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [redSat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(s1)?.kind).toBe('WAIT_DODGE');
    s1 = applyGameAction(s1, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(s1.players[1]!.hp).toBe(3);

    // 2. Thanh Công Kiếm bỏ qua Nhân Vương Thuẫn ngay cả với Sát Đen
    let s2 = makeControlledState(4, {
      0: {
        equipments: { weapon: thanhCong, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [blackSat2],
      },
      1: {
        equipments: { weapon: null, armor: nhanVuong, plusOneHorse: null, minusOneHorse: null },
      },
    });
    s2 = applyGameAction(s2, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [blackSat2.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(s2)?.kind).toBe('WAIT_DODGE');
    s2 = applyGameAction(s2, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(s2.players[1]!.hp).toBe(3);

    // 3. Hàn Băng Kiếm hủy 2 lá (1 trên tay + 1 giáp) thay vì mất máu
    let s3 = makeControlledState(4, {
      0: {
        equipments: { weapon: hanBang, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [redSat],
      },
      1: {
        handCards: [card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2)],
        equipments: {
          weapon: null,
          armor: card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2),
          plusOneHorse: null,
          minusOneHorse: null,
        },
      },
    });
    s3 = applyGameAction(s3, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [redSat.id],
      targetSeats: [1],
    });
    s3 = applyGameAction(s3, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(getPendingPrompt(s3)?.kind).toBe('ASK_HAN_BANG_KIEM');

    s3 = applyGameAction(s3, {
      type: 'RESPOND_HAN_BANG_KIEM',
      seatIndex: 0,
      activate: true,
      picks: [{ zone: 'HAND', handIndex: 0 }, { zone: 'ARMOR' }],
    });
    expect(s3.players[1]!.hp).toBe(4);
    expect(s3.players[1]!.handCards).toHaveLength(0);
    expect(s3.players[1]!.equipments.armor).toBeNull();
  });

  it('Phương Thiên Họa Kích (chỉ lá Sát cuối cùng được chọn tối đa 3 mục tiêu), Quán Thạch Phủ, Thanh Long & Từ Hùng', () => {
    const phuongThien = card('phuong_thien_hoa_kich', 'Phương Thiên', 'WEAPON', 'DIAMOND', 12, 4);
    const satLast = card('sat', 'Sát Cuối', 'BASIC', 'HEART', 10);
    const extraCard = card('dao', 'Đào Dư', 'BASIC', 'HEART', 7);

    // Còn 2 lá trên tay -> KHÔNG được chọn 3 mục tiêu
    const notLast = makeControlledState(4, {
      0: {
        equipments: { weapon: phuongThien, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [satLast, extraCard],
      },
    });
    expect(() =>
      applyGameAction(notLast, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [satLast.id],
        targetSeats: [1, 2, 3],
      }),
    ).toThrow('INVALID_STRIKE_TARGET_COUNT');

    // Lá cuối cùng trên tay -> đánh trúng cả 3 mục tiêu
    let onlyLast = makeControlledState(4, {
      0: {
        equipments: { weapon: phuongThien, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [satLast],
      },
    });
    onlyLast = applyGameAction(onlyLast, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satLast.id],
      targetSeats: [1, 2, 3],
    });
    for (const targetSeat of [1, 2, 3]) {
      expect(getPendingPrompt(onlyLast)?.kind).toBe('WAIT_DODGE');
      expect(getPendingPrompt(onlyLast)?.actorSeats).toEqual([targetSeat]);
      onlyLast = applyGameAction(onlyLast, {
        type: 'RESPOND_DODGE',
        seatIndex: targetSeat,
        cardId: null,
      });
    }
    expect(onlyLast.players[1]!.hp).toBe(3);
    expect(onlyLast.players[2]!.hp).toBe(3);
    expect(onlyLast.players[3]!.hp).toBe(3);

    // Quán Thạch Phủ: bị Thiểm -> bỏ 2 lá ép trúng
    const thiem = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 4);
    const d1 = card('dao', 'Đào 1', 'BASIC', 'HEART', 3);
    const d2 = card('dao', 'Đào 2', 'BASIC', 'HEART', 4);
    let qtpState = makeControlledState(4, {
      0: {
        equipments: {
          weapon: card('quan_thach_phu', 'Quán Thạch Phủ', 'WEAPON', 'DIAMOND', 5, 3),
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
        handCards: [card('sat', 'Sát', 'BASIC', 'HEART', 10), d1, d2],
      },
      1: { handCards: [thiem] },
    });
    qtpState = applyGameAction(qtpState, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [qtpState.players[0]!.handCards[0]!.id],
      targetSeats: [1],
    });
    qtpState = applyGameAction(qtpState, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: thiem.id,
    });
    expect(getPendingPrompt(qtpState)?.kind).toBe('ASK_QUAN_THACH_PHU');
    qtpState = applyGameAction(qtpState, {
      type: 'RESPOND_QUAN_THACH_PHU',
      seatIndex: 0,
      activate: true,
      discardCardIds: [d1.id, d2.id],
    });
    expect(qtpState.players[1]!.hp).toBe(3);

    // Từ Hùng Song Cổ Kiếm (nam đánh nữ -> nữ chọn cho nam rút 1 lá)
    const satMale = card('sat', 'Sát', 'BASIC', 'HEART', 11);
    let tuHungState = makeControlledState(
      4,
      {
        0: {
          heroId: 'liu_bei',
          equipments: {
            weapon: card('tu_hung_song_co_kiem', 'Từ Hùng', 'WEAPON', 'SPADE', 2, 2),
            armor: null,
            plusOneHorse: null,
            minusOneHorse: null,
          },
          handCards: [satMale],
        },
        1: { heroId: 'diao_chan', handCards: [] },
      },
      [card('dao', 'Đào rút', 'BASIC', 'HEART', 9)],
    );
    tuHungState = applyGameAction(tuHungState, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satMale.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(tuHungState)?.kind).toBe('ASK_TU_HUNG');
    tuHungState = applyGameAction(tuHungState, {
      type: 'RESPOND_TU_HUNG',
      seatIndex: 1,
      choice: 'ALLOW_DRAW',
    });
    expect(tuHungState.players[0]!.handCards).toHaveLength(1);
    expect(getPendingPrompt(tuHungState)?.kind).toBe('WAIT_DODGE');
  });

  it('Lạc Bất Tư Thục mất pha Đánh bài & Thiểm Điện (2♠–9♠ gây 3 sát thương cần 2 Đào để cứu, không trúng thì nhảy qua ghế đã có Thiểm Điện)', () => {
    // 1. Thiểm Điện trúng 5♠ lên Ghế 0 đang còn 2 máu -> xuống -1 máu -> cần 2 Đào mới sống dậy ở 1 máu
    const lightning = card('thiem_dien', 'Thiểm Điện EX', 'DELAYED_SCROLL', 'SPADE', 1);
    const peach1 = card('dao', 'Đào 1', 'BASIC', 'HEART', 3);
    const peach2 = card('dao', 'Đào 2', 'BASIC', 'HEART', 4);

    let s1 = makeControlledState(
      4,
      {
        0: { hp: 2, maxHp: 4, delayedScrolls: [lightning] },
        1: { handCards: [peach1, peach2] },
      },
      [
        card('sat', 'Phán xét 5♠?', 'BASIC', 'SPADE', 5),
        card('sat', 'Rút 1', 'BASIC', 'CLUB', 2),
        card('sat', 'Rút 2', 'BASIC', 'CLUB', 3),
      ],
    );
    s1 = { ...s1, turnPhase: 'JUDGE' };
    s1 = stepEngine(s1);
    // Nhịp chờ giả lập Vô Giải trước khi phán xét Thiểm Điện
    s1 = applyGameAction(s1, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

    // Ghế 0 bị 3 sát thương Lôi xuống -1 máu -> hỏi Cầu Đào từ Ghế 0
    expect(s1.players[0]!.hp).toBe(-1);
    expect(getPendingPrompt(s1)?.kind).toBe('WAIT_PEACH_RESCUE');
    expect(getPendingPrompt(s1)?.actorSeats).toEqual([0]);

    // Ghế 0 bỏ qua -> chuyển sang hỏi Ghế 1
    s1 = applyGameAction(s1, { type: 'RESPOND_PEACH_RESCUE', seatIndex: 0, cardId: null });
    expect(getPendingPrompt(s1)?.actorSeats).toEqual([1]);

    // Ghế 1 cứu lá Đào thứ 1 -> Ghế 0 lên 0 máu (VẪN hấp hối, hỏi tiếp Ghế 1!)
    s1 = applyGameAction(s1, { type: 'RESPOND_PEACH_RESCUE', seatIndex: 1, cardId: peach1.id });
    expect(s1.players[0]!.hp).toBe(0);
    expect(getPendingPrompt(s1)?.actorSeats).toEqual([1]);

    // Ghế 1 cứu lá Đào thứ 2 -> Ghế 0 sống lại ở mức 1 máu và sang pha Rút/Đánh bài!
    s1 = applyGameAction(s1, { type: 'RESPOND_PEACH_RESCUE', seatIndex: 1, cardId: peach2.id });
    expect(s1.players[0]!.hp).toBe(1);
    expect(s1.players[0]!.alive).toBe(true);
    expect(s1.turnPhase).toBe('PLAY');

    // 2. Thiểm Điện không trúng (♥Q) chuyển sang ghế kế tiếp, nhảy qua ghế đã có Thiểm Điện
    const lightningA = card('thiem_dien', 'Sét A', 'DELAYED_SCROLL', 'SPADE', 1);
    const lightningB = card('thiem_dien', 'Sét B', 'DELAYED_SCROLL', 'HEART', 12);
    let s2 = makeControlledState(
      4,
      {
        0: { delayedScrolls: [lightningA] },
        1: { delayedScrolls: [lightningB] }, // Ghế 1 đã có Thiểm Điện!
      },
      [
        card('dao', 'Phán xét trượt ♥Q', 'BASIC', 'HEART', 12),
        card('sat', 'Rút 1', 'BASIC', 'CLUB', 2),
        card('sat', 'Rút 2', 'BASIC', 'CLUB', 3),
      ],
    );
    s2 = { ...s2, turnPhase: 'JUDGE' };
    s2 = stepEngine(s2);
    s2 = applyGameAction(s2, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    // Sét A phải nhảy qua Ghế 1 sang Ghế 2!
    expect(s2.players[0]!.delayedScrolls).toHaveLength(0);
    expect(s2.players[1]!.delayedScrolls).toHaveLength(1);
    expect(s2.players[2]!.delayedScrolls).toHaveLength(1);
    expect(s2.players[2]!.delayedScrolls[0]!.id).toBe(lightningA.id);

    // 3. Lạc Bất Tư Thục ra chất Đen -> mất pha Đánh bài, chuyển sang Bỏ bài/Kết lượt
    const lac = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'SPADE', 6);
    let s3 = makeControlledState(
      4,
      { 0: { hp: 4, maxHp: 4, delayedScrolls: [lac] } },
      [
        card('sat', 'Phán xét ♠7 (không phải Cơ)', 'BASIC', 'SPADE', 7),
        card('sat', 'Rút 1', 'BASIC', 'CLUB', 2),
        card('sat', 'Rút 2', 'BASIC', 'CLUB', 3),
      ],
    );
    s3 = { ...s3, turnPhase: 'JUDGE' };
    s3 = stepEngine(s3);
    s3 = applyGameAction(s3, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    // Rút 2 lá <= 4 máu nên tự kết lượt chuyển sang Ghế 1
    expect(s3.currentTurnSeat).toBe(1);
  });

  it('Cẩm nang Đa mục tiêu (Nam Man, Vạn Tiễn, Đào Viên, Ngũ Cốc, Quyết Đấu, Tá Đao, Thuận Thủ, Quá Hà) & Thưởng/Phạt kết liễu', () => {
    // 1. Tá Đao Sát Nhân: Ghế 1 từ chối Sát -> giao vũ khí vào tay Ghế 0
    const taDao = card('ta_dao_sat_nhan', 'Tá Đao', 'NORMAL_SCROLL', 'CLUB', 12);
    const spear = card('thanh_long_yen_nguyet_dao', 'Thanh Long Đao', 'WEAPON', 'SPADE', 5, 3);
    let s1 = makeControlledState(4, {
      0: { handCards: [taDao] },
      1: { equipments: { weapon: spear, armor: null, plusOneHorse: null, minusOneHorse: null } },
    });
    s1 = applyGameAction(s1, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [taDao.id],
      targetSeats: [1],
      secondarySeat: 2,
    });
    s1 = applyGameAction(s1, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(getPendingPrompt(s1)?.kind).toBe('WAIT_COLLATERAL_SAT');
    s1 = applyGameAction(s1, { type: 'RESPOND_COLLATERAL_SAT', seatIndex: 1, cardIds: null });
    expect(s1.players[1]!.equipments.weapon).toBeNull();
    expect(s1.players[0]!.handCards.map((c) => c.id)).toContain(spear.id);

    // 2. Ngũ Cốc Phong Đăng: lật đúng số người sống, mỗi người chọn 1 lá
    const nguCoc = card('ngu_coc_phong_dang', 'Ngũ Cốc', 'NORMAL_SCROLL', 'HEART', 3);
    const hCards = [
      card('sat', 'H1', 'BASIC', 'SPADE', 7),
      card('thiem', 'H2', 'BASIC', 'HEART', 2),
      card('dao', 'H3', 'BASIC', 'HEART', 6),
      card('sat', 'H4', 'BASIC', 'CLUB', 8),
    ];
    let s2 = makeControlledState(4, { 0: { handCards: [nguCoc] } }, hCards);
    s2 = applyGameAction(s2, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [nguCoc.id] });
    expect(s2.harvestPool).toHaveLength(4);
    for (let seat = 0; seat < 4; seat += 1) {
      s2 = applyGameAction(s2, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
      expect(getPendingPrompt(s2)?.kind).toBe('WAIT_HARVEST_PICK');
      s2 = applyGameAction(s2, {
        type: 'RESPOND_HARVEST_PICK',
        seatIndex: seat,
        cardId: hCards[seat]!.id,
      });
    }
    expect(s2.harvestPool).toHaveLength(0);
    expect(s2.players[2]!.handCards[0]!.id).toBe(hCards[2]!.id);

    // 3. Thưởng 3 lá khi diệt Phản Tặc & Phạt hủy hết bài khi Chủ Công giết Trung Thần
    let s3 = makeControlledState(
      4,
      {
        0: {
          identity: 'LORD',
          handCards: [
            card('sat', 'Sát 1', 'BASIC', 'HEART', 10),
            card('sat', 'Sát 2', 'BASIC', 'HEART', 11),
            card('dao', 'Đào giữ', 'BASIC', 'HEART', 8),
          ],
          equipments: {
            weapon: card('gia_cat_lien_no', 'Liên Nỗ', 'WEAPON', 'CLUB', 1, 1),
            armor: card('bat_quai_tran', 'Bát Quái', 'ARMOR', 'CLUB', 2),
            plusOneHorse: null,
            minusOneHorse: card('xich_tho', 'Xích Thố', 'MINUS_ONE_HORSE', 'HEART', 5),
          },
        },
        1: { identity: 'LOYALIST', hp: 1 },
        2: { identity: 'REBEL', hp: 1 },
      },
      [
        card('sat', 'R1', 'BASIC', 'CLUB', 2),
        card('sat', 'R2', 'BASIC', 'CLUB', 3),
        card('sat', 'R3', 'BASIC', 'CLUB', 4),
      ],
    );
    // Chủ Công giết Phản Tặc (Ghế 2) -> rút 3 lá
    const killRebelSat = s3.players[0]!.handCards[0]!;
    s3 = applyGameAction(s3, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [killRebelSat.id],
      targetSeats: [2],
    });
    s3 = applyGameAction(s3, { type: 'RESPOND_DODGE', seatIndex: 2, cardId: null });
    for (const rSeat of [0, 1, 2, 3]) {
      s3 = applyGameAction(s3, { type: 'RESPOND_PEACH_RESCUE', seatIndex: rSeat, cardId: null });
    }
    expect(s3.players[2]!.alive).toBe(false);
    // Bắt đầu 3 lá - 1 Sát + 3 thưởng = 5 lá
    expect(s3.players[0]!.handCards).toHaveLength(5);

    // Chủ Công giết nhầm Trung Thần (Ghế 1) -> mất sạch bài trên tay & trang bị
    const killLoyalistSat = s3.players[0]!.handCards[0]!;
    s3 = applyGameAction(s3, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [killLoyalistSat.id],
      targetSeats: [1],
    });
    s3 = applyGameAction(s3, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    for (const rSeat of [0, 1, 3]) {
      s3 = applyGameAction(s3, { type: 'RESPOND_PEACH_RESCUE', seatIndex: rSeat, cardId: null });
    }
    expect(s3.players[1]!.alive).toBe(false);
    expect(s3.players[0]!.handCards).toHaveLength(0);
    expect(s3.players[0]!.equipments.weapon).toBeNull();
    expect(s3.players[0]!.equipments.armor).toBeNull();
    expect(s3.players[0]!.equipments.minusOneHorse).toBeNull();
  });

  it('kiểm tra đủ Nam Man, Vạn Tiễn (+ Bát Quái), Đào Viên, Quyết Đấu, Thuận Thủ, Quá Hà, Trượng Bát, Thanh Long & Kỳ Lân Cung', () => {
    const namMan = card('nam_man_nhap_xam', 'Nam Man', 'NORMAL_SCROLL', 'SPADE', 7);
    const vanTien = card('van_tien_te_phat', 'Vạn Tiễn', 'NORMAL_SCROLL', 'HEART', 1);
    const daoVien = card('dao_vien_ket_nghia', 'Đào Viên', 'NORMAL_SCROLL', 'HEART', 1);
    const quyetDau = card('quyet_dau', 'Quyết Đấu', 'NORMAL_SCROLL', 'SPADE', 1);
    const thuanThu = card('thuan_thu_khien_duong', 'Thuận Thủ', 'NORMAL_SCROLL', 'SPADE', 3);
    const quaHa = card('qua_ha_sai_cau', 'Quá Hà', 'NORMAL_SCROLL', 'HEART', 12);

    const satA = card('sat', 'Sát A', 'BASIC', 'SPADE', 8);
    const satB = card('sat', 'Sát B', 'BASIC', 'CLUB', 8);
    const thiemB = card('thiem', 'Thiểm B', 'BASIC', 'DIAMOND', 5);
    const batQuai = card('bat_quai_tran', 'Bát Quái', 'ARMOR', 'SPADE', 2);

    let s = makeControlledState(
      4,
      {
        0: {
          hp: 3,
          maxHp: 4,
          handCards: [namMan, vanTien, daoVien, quyetDau, thuanThu, quaHa, satA],
        },
        1: {
          hp: 3,
          handCards: [satB, thiemB],
          equipments: {
            weapon: null,
            armor: batQuai,
            plusOneHorse: card('dich_lo', 'Đích Lố', 'PLUS_ONE_HORSE', 'CLUB', 5),
            minusOneHorse: null,
          },
        },
        2: { hp: 3, handCards: [] },
        3: { hp: 4, handCards: [] },
      },
      [card('dao', 'Phán xét Bát Quái Đỏ ♥3', 'BASIC', 'HEART', 3)],
    );

    // 1. Nam Man Nhập Xâm: Ghế 1 đánh Sát, Ghế 2 & 3 chịu 1 sát thương
    s = applyGameAction(s, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [namMan.id] });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_SAT', seatIndex: 1, cardIds: [satB.id] });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_SAT', seatIndex: 2, cardIds: null });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_SAT', seatIndex: 3, cardIds: null });
    expect(s.players[1]!.hp).toBe(3);
    expect(s.players[2]!.hp).toBe(2);
    expect(s.players[3]!.hp).toBe(3);

    // 2. Vạn Tiễn Tề Phát: Ghế 1 phán xét Bát Quái Trận ra chất Đỏ thành công né đòn!
    s = applyGameAction(s, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [vanTien.id] });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_DODGE', seatIndex: 1, cardId: null, useBagua: true });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_DODGE', seatIndex: 2, cardId: null });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, { type: 'RESPOND_AOE_DODGE', seatIndex: 3, cardId: null });
    expect(s.players[1]!.hp).toBe(3);
    expect(s.players[2]!.hp).toBe(1);
    expect(s.players[3]!.hp).toBe(2);

    // 3. Đào Viên Kết Nghĩa: hồi 1 máu cho cả 4 ghế đang bị thương
    s = applyGameAction(s, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [daoVien.id] });
    for (let i = 0; i < 4; i += 1) {
      s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    }
    expect(s.players[0]!.hp).toBe(4);
    expect(s.players[1]!.hp).toBe(4);
    expect(s.players[2]!.hp).toBe(2);
    expect(s.players[3]!.hp).toBe(3);

    // 4. Quá Hà Sái Cầu hủy Đích Lố (+1) của Ghế 1 để Ghế 1 về khoảng cách 1 -> Thuận Thủ lấy Bát Quái Trận
    s = applyGameAction(s, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [quaHa.id],
      targetSeats: [1],
    });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 0,
      zone: 'PLUS_ONE_HORSE',
    });
    expect(s.players[1]!.equipments.plusOneHorse).toBeNull();

    s = applyGameAction(s, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [thuanThu.id],
      targetSeats: [1],
    });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    s = applyGameAction(s, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 0,
      zone: 'ARMOR',
    });
    expect(s.players[1]!.equipments.armor).toBeNull();
    expect(s.players[0]!.handCards.map((c) => c.id)).toContain(batQuai.id);

    // 5. Quyết Đấu với Ghế 2 (Ghế 2 hết Sát -> chịu 1 sát thương)
    s = applyGameAction(s, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [quyetDau.id],
      targetSeats: [2],
    });
    s = applyGameAction(s, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(getPendingPrompt(s)?.kind).toBe('WAIT_DUEL_SAT');
    s = applyGameAction(s, { type: 'RESPOND_DUEL_SAT', seatIndex: 2, cardIds: null });
    expect(s.players[2]!.hp).toBe(1);

    // 6. Trượng Bát Xà Mâu (2 lá bất kỳ thành Sát) + Thanh Long Yển Nguyệt Đao + Kỳ Lân Cung
    const truongBat = card('truong_bat_xa_mau', 'Trượng Bát', 'WEAPON', 'SPADE', 12, 3);
    const thanhLong = card('thanh_long_yen_nguyet_dao', 'Thanh Long', 'WEAPON', 'SPADE', 5, 3);
    const kyLan = card('ky_lan_cung', 'Kỳ Lân Cung', 'WEAPON', 'HEART', 5, 5);
    const extra1 = card('dao', 'D1', 'BASIC', 'HEART', 3);
    const extra2 = card('dao', 'D2', 'BASIC', 'HEART', 4);
    const followSat = card('sat', 'Sát Truy Kích', 'BASIC', 'HEART', 10);

    let w = makeControlledState(4, {
      0: {
        equipments: { weapon: truongBat, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [extra1, extra2],
      },
      1: {
        handCards: [card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 6)],
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: card('tuyet_anh', 'Tuyệt Ảnh', 'PLUS_ONE_HORSE', 'SPADE', 5),
          minusOneHorse: null,
        },
      },
    });
    w = applyGameAction(w, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [extra1.id, extra2.id],
      targetSeats: [1],
      asCardKey: 'sat',
    });
    expect(getPendingPrompt(w)?.kind).toBe('WAIT_DODGE');
    w = applyGameAction(w, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(w.players[1]!.hp).toBe(3);

    // Thanh Long Đao: bị Thiểm -> đánh tiếp Sát
    let tl = makeControlledState(4, {
      0: {
        equipments: { weapon: thanhLong, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [satA, followSat],
      },
      1: { handCards: [thiemB] },
    });
    tl = applyGameAction(tl, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satA.id],
      targetSeats: [1],
    });
    tl = applyGameAction(tl, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: thiemB.id });
    expect(getPendingPrompt(tl)?.kind).toBe('ASK_THANH_LONG');
    tl = applyGameAction(tl, {
      type: 'RESPOND_THANH_LONG',
      seatIndex: 0,
      cardIds: [followSat.id],
    });
    tl = applyGameAction(tl, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
    expect(tl.players[1]!.hp).toBe(3);

    // Kỳ Lân Cung: Sát trúng -> bỏ ngựa mục tiêu
    let kl = makeControlledState(4, {
      0: {
        equipments: { weapon: kyLan, armor: null, plusOneHorse: null, minusOneHorse: null },
        handCards: [satA],
      },
      2: {
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: card('tuyet_anh', 'Tuyệt Ảnh', 'PLUS_ONE_HORSE', 'SPADE', 5),
          minusOneHorse: null,
        },
      },
    });
    kl = applyGameAction(kl, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satA.id],
      targetSeats: [2],
    });
    kl = applyGameAction(kl, { type: 'RESPOND_DODGE', seatIndex: 2, cardId: null });
    expect(getPendingPrompt(kl)?.kind).toBe('ASK_KY_LAN_CUNG');
    kl = applyGameAction(kl, {
      type: 'RESPOND_KY_LAN_CUNG',
      seatIndex: 0,
      horseZone: 'PLUS_ONE_HORSE',
    });
    expect(kl.players[2]!.equipments.plusOneHorse).toBeNull();
  });

  it('luật thắng 2 Nội Gián ở bàn 8 người (TESTING.md Tình huống A & B)', () => {
    const base8 = (spy2Alive: boolean) =>
      makeControlledState(8, {
        0: { identity: 'LORD', hp: 1, maxHp: 5, alive: true },
        1: { identity: 'LOYALIST', hp: 0, alive: false },
        2: { identity: 'LOYALIST', hp: 0, alive: false },
        3: { identity: 'REBEL', hp: 0, alive: false },
        4: { identity: 'REBEL', hp: 0, alive: false },
        5: { identity: 'REBEL', hp: 0, alive: false },
        6: {
          identity: 'SPY',
          hp: 4,
          alive: true,
          handCards: [card('sat', 'Sát kết liễu', 'BASIC', 'HEART', 10)],
        },
        7: { identity: 'SPY', hp: spy2Alive ? 3 : 0, alive: spy2Alive },
      });

    // Tình huống A: Còn Chủ Công + 2 Nội Gián -> Nội Gián 1 giết Chủ Công khi Nội Gián 2 còn sống => Phản Tặc thắng!
    let sitA = { ...base8(true), currentTurnSeat: 6 };
    sitA = applyGameAction(sitA, {
      type: 'PLAY_CARD',
      seatIndex: 6,
      cardIds: [sitA.players[6]!.handCards[0]!.id],
      targetSeats: [0],
    });
    sitA = applyGameAction(sitA, { type: 'RESPOND_DODGE', seatIndex: 0, cardId: null });
    for (const rSeat of [6, 7, 0]) {
      sitA = applyGameAction(sitA, { type: 'RESPOND_PEACH_RESCUE', seatIndex: rSeat, cardId: null });
    }
    expect(sitA.turnPhase).toBe('GAME_OVER');
    expect(sitA.winningFaction).toBe('REBEL');

    // Tình huống B: Nội Gián 2 đã chết -> Nội Gián 1 tay đôi giết Chủ Công => Nội Gián 1 thắng!
    let sitB = { ...base8(false), currentTurnSeat: 6 };
    sitB = applyGameAction(sitB, {
      type: 'PLAY_CARD',
      seatIndex: 6,
      cardIds: [sitB.players[6]!.handCards[0]!.id],
      targetSeats: [0],
    });
    sitB = applyGameAction(sitB, { type: 'RESPOND_DODGE', seatIndex: 0, cardId: null });
    for (const rSeat of [6, 0]) {
      sitB = applyGameAction(sitB, { type: 'RESPOND_PEACH_RESCUE', seatIndex: rSeat, cardId: null });
    }
    expect(sitB.turnPhase).toBe('GAME_OVER');
    expect(sitB.winningFaction).toBe('SPY');
    expect(sitB.winnerUserIds).toEqual(['u-6']);
  });
});
