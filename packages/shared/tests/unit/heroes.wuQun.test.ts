import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  getPendingPrompt,
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
    id: `wq_${seq}_${cardKey}`,
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
  const players: PlayerCombatState[] = Array.from(
    { length: playerCount },
    (_, idx) => ({
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
      heroId: 'guan_yu',
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
      autoSkipNullification: true,
      isBotTakeover: false,
      ...overrides[idx],
    }),
  );

  return {
    matchId: 'wu-qun-test',
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

function makeFillerCards(count: number): CardInstance[] {
  return Array.from({ length: count }, (_, idx) =>
    card('sat', 'Sát', 'BASIC', idx % 2 === 0 ? 'SPADE' : 'HEART', (idx % 13) + 1),
  );
}

describe('Bộ 11 Tướng Ngô & Quần (Bước 1.3)', () => {
  // 1. Tôn Quyền
  it('Tôn Quyền (Chế Hành): bỏ cả bài tay lẫn trang bị và rút lại đúng số lượng, tối đa 1 lần/lượt', () => {
    const handCard = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const horse = card('xich_tho', 'Xích Thố', 'MINUS_ONE_HORSE', 'HEART', 5);
    const state = makeControlledState(
      4,
      {
        0: {
          heroId: 'sun_quan',
          handCards: [handCard],
          equipments: {
            weapon: null,
            armor: null,
            plusOneHorse: null,
            minusOneHorse: horse,
          },
        },
      },
      makeFillerCards(5),
    );

    const next = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'zhi_heng',
      cardIds: [handCard.id, horse.id],
    });

    expect(next.players[0]!.handCards).toHaveLength(2);
    expect(next.players[0]!.equipments.minusOneHorse).toBeNull();
    expect(next.discardPile.map((c) => c.id)).toEqual([handCard.id, horse.id]);

    expect(() =>
      applyGameAction(next, {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex: 0,
        skillId: 'zhi_heng',
        cardIds: [next.players[0]!.handCards[0]!.id],
      }),
    ).toThrow();
  });

  it('Tôn Quyền (Cứu Viện - Chủ Công): đồng minh Ngô dùng Đào cứu Chủ Công hồi thêm +1 máu', () => {
    const peachWu = card('dao', 'Đào', 'BASIC', 'HEART', 3);
    const state = makeControlledState(4, {
      0: { heroId: 'sun_quan', identity: 'LORD', hp: 0, maxHp: 5 },
      1: { heroId: 'gan_ning', handCards: [peachWu] },
    });
    const dyingState: MasterGameState = {
      ...state,
      interruptStack: [
        {
          id: 'dying_1',
          kind: 'WAIT_PEACH_RESCUE',
          targetSeat: 0,
          sourceSeat: 2,
          responderSeat: 1,
          askOrder: [1, 2, 3, 0],
          askCursor: 0,
        },
      ],
    };

    const rescued = applyGameAction(dyingState, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 1,
      cardId: peachWu.id,
    });
    // 0 + 1 (Đào) + 1 (Cứu Viện) = 2 máu
    expect(rescued.players[0]!.hp).toBe(2);

    // Nếu không phải Chủ Công thì không kích hoạt Cứu Viện
    const nonLordDying: MasterGameState = {
      ...dyingState,
      players: dyingState.players.map((p, idx) =>
        idx === 0 ? { ...p, identity: 'LOYALIST' } : p,
      ),
    };
    const rescuedNonLord = applyGameAction(nonLordDying, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 1,
      cardId: peachWu.id,
    });
    expect(rescuedNonLord.players[0]!.hp).toBe(1);
  });

  // 2. Cam Ninh
  it('Cam Ninh (Kỳ Tập): dùng bài chất Đen (tay hoặc trang bị) làm Quá Hà Sái Cầu', () => {
    const blackEquip = card('xich_tho', 'Xích Thố', 'MINUS_ONE_HORSE', 'SPADE', 5);
    const targetHand = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
    const state = makeControlledState(4, {
      0: {
        heroId: 'gan_ning',
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: null,
          minusOneHorse: blackEquip,
        },
      },
      2: { heroId: 'guan_yu', handCards: [targetHand] },
    });

    let next = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [blackEquip.id],
      targetSeats: [2],
      asCardKey: 'qua_ha_sai_cau',
    });
    next = applyGameAction(next, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(getPendingPrompt(next)?.kind).toBe('PICK_TARGET_CARD');

    next = applyGameAction(next, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 0,
      zone: 'HAND',
      handIndex: 0,
    });
    expect(next.players[0]!.equipments.minusOneHorse).toBeNull();
    expect(next.players[2]!.handCards).toHaveLength(0);
  });

  // 3. Lữ Mông
  it('Lữ Mông (Khắc Kỷ): không dùng/đánh Sát trong lượt thì được bỏ qua pha Bỏ bài', () => {
    const cards = makeFillerCards(5);
    const state = makeControlledState(4, {
      0: { heroId: 'lu_meng', hp: 2, maxHp: 4, handCards: cards },
    });

    const beforeDiscard = applyGameAction(state, {
      type: 'END_PLAY_PHASE',
      seatIndex: 0,
    });
    expect(getPendingPrompt(beforeDiscard)?.kind).toBe('ASK_KE_JI');

    const skipped = applyGameAction(beforeDiscard, {
      type: 'RESPOND_KE_JI',
      seatIndex: 0,
      activate: true,
    });
    expect(skipped.players[0]!.handCards).toHaveLength(5);
    expect(skipped.currentTurnSeat).toBe(1);
  });

  // 4. Hoàng Cái
  it('Hoàng Cái (Khổ Nhục): tự mất 1 máu để rút 2 lá, không giới hạn số lần mỗi lượt', () => {
    const state = makeControlledState(
      4,
      { 0: { heroId: 'huang_gai', hp: 4, maxHp: 4 } },
      makeFillerCards(6),
    );

    let next = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ku_rou',
    });
    expect(next.players[0]!.hp).toBe(3);
    expect(next.players[0]!.handCards).toHaveLength(2);

    next = applyGameAction(next, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'ku_rou',
    });
    expect(next.players[0]!.hp).toBe(2);
    expect(next.players[0]!.handCards).toHaveLength(4);
  });

  // 5. Chu Du
  it('Chu Du (Anh Tư & Phản Gián): rút 3 lá ở pha Rút bài và Phản Gián đoán sai chịu 1 sát thương', () => {
    const zhouHand = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
    const state = makeControlledState(
      4,
      {
        0: { heroId: 'zhou_yu', handCards: [zhouHand], hp: 3, maxHp: 3 },
        1: { heroId: 'guan_yu', hp: 4, maxHp: 4 },
      },
      makeFillerCards(5),
    );

    // Anh Tư: đầu pha DRAW rút 3 lá thay vì 2
    const judgeDoneState: MasterGameState = {
      ...state,
      turnPhase: 'JUDGE',
      turnFlags: {
        satUsedThisTurn: 0,
        skipPlayPhase: false,
        startSkillsChecked: true,
      },
    };
    const afterDraw = stepEngine(judgeDoneState, () => 0.5);
    expect(afterDraw.turnPhase).toBe('PLAY');
    // 1 lá ban đầu + 3 lá Anh Tư = 4 lá
    expect(afterDraw.players[0]!.handCards).toHaveLength(4);

    // Phản Gián: ghế 1 đoán sai chất HEART khi Chu Du chỉ có SPADE
    let next = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'fan_jian',
      targetSeats: [1],
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_FAN_JIAN_GUESS');

    next = applyGameAction(next, {
      type: 'RESPOND_FAN_JIAN_GUESS',
      seatIndex: 1,
      suit: 'HEART',
    });
    expect(next.players[1]!.hp).toBe(3);
    expect(next.players[1]!.handCards).toHaveLength(1);
    expect(next.players[0]!.handCards).toHaveLength(0);
  });

  // 6. Đại Kiều
  it('Đại Kiều (Quốc Sắc & Lưu Ly): dùng Rô làm Lạc Bất Tư Thục và Lưu Ly chuyển Sát sang người thứ 3 trong tầm đánh', () => {
    const diamondCard = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 6);
    const satCard = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
    const discardCost = card('dao', 'Đào', 'BASIC', 'HEART', 4);
    const state = makeControlledState(4, {
      0: { heroId: 'guan_yu', handCards: [satCard] },
      1: {
        heroId: 'da_qiao',
        hp: 3,
        maxHp: 3,
        handCards: [diamondCard, discardCost],
      },
      2: { heroId: 'zhang_fei', hp: 4, maxHp: 4 },
    });

    // Lưu Ly: ghế 0 đánh Sát ghế 1 -> ghế 1 bỏ 1 lá chuyển sang ghế 2 (trong tầm 1), không chuyển ngược ghế 0
    let next = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [satCard.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(next)?.kind).toBe('ASK_LIU_LI');

    // Không thể chuyển ngược về người đánh Sát (ghế 0)
    expect(() =>
      applyGameAction(next, {
        type: 'RESPOND_LIU_LI',
        seatIndex: 1,
        activate: true,
        discardCardId: discardCost.id,
        newTargetSeat: 0,
      }),
    ).toThrow();

    // Chuyển hợp lệ sang ghế 2
    next = applyGameAction(next, {
      type: 'RESPOND_LIU_LI',
      seatIndex: 1,
      activate: true,
      discardCardId: discardCost.id,
      newTargetSeat: 2,
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_DODGE');
    expect(getPendingPrompt(next)?.actorSeats).toEqual([2]);

    // Quốc Sắc: lượt Đại Kiều dùng bài Rô đặt Lạc Bất Tư Thục lên ghế 2
    const dqTurn: MasterGameState = {
      ...state,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
    };
    const afterGuoSe = applyGameAction(dqTurn, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [diamondCard.id],
      targetSeats: [2],
      asCardKey: 'lac_bat_tu_thuc',
    });
    expect(afterGuoSe.players[2]!.delayedScrolls).toHaveLength(1);
    expect(afterGuoSe.players[2]!.delayedScrolls[0]!.cardKey).toBe(
      'lac_bat_tu_thuc',
    );
  });

  // 7. Lục Tốn
  it('Lục Tốn (Khiêm Tốn & Liên Doanh): miễn nhiễm Thuận Thủ/Lạc Bất và rút 1 lá khi mất lá cuối trên tay', () => {
    const stealCard = card(
      'thuan_thu_khien_duong',
      'Thuận Thủ Khiên Dương',
      'NORMAL_SCROLL',
      'SPADE',
      3,
    );
    const indulgeCard = card(
      'lac_bat_tu_thuc',
      'Lạc Bất Tư Thục',
      'DELAYED_SCROLL',
      'HEART',
      6,
    );
    const satLast = card('sat', 'Sát', 'BASIC', 'SPADE', 8);

    const state = makeControlledState(
      4,
      {
        0: { heroId: 'guan_yu', handCards: [stealCard, indulgeCard] },
        1: { heroId: 'lu_xun', hp: 3, maxHp: 3, handCards: [satLast] },
      },
      makeFillerCards(4),
    );

    // Khiêm Tốn: không thể chọn Lục Tốn làm mục tiêu Thuận Thủ hoặc Lạc Bất Tư Thục
    expect(() =>
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [stealCard.id],
        targetSeats: [1],
      }),
    ).toThrow();
    expect(() =>
      applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [indulgeCard.id],
        targetSeats: [1],
      }),
    ).toThrow();

    // Liên Doanh: Lục Tốn đánh lá Sát cuối cùng trên tay -> rút ngay 1 lá
    const lxTurn: MasterGameState = {
      ...state,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
    };
    const afterSat = applyGameAction(lxTurn, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [satLast.id],
      targetSeats: [2],
    });
    expect(afterSat.players[1]!.handCards).toHaveLength(1);
  });

  // 8. Tôn Thượng Hương
  it('Tôn Thượng Hương (Kết Hôn & Kiêu Cơ): Kiêu Cơ rút 2 lá cả khi thay trang bị đè lên cũ lẫn khi bị hủy trang bị', () => {
    const oldWeapon = card('thanh_cong_kiem', 'Thanh Công Kiếm', 'WEAPON', 'SPADE', 6, 2);
    const newWeapon = card('phuong_thien_hoa_kich', 'Phương Thiên Họa Kích', 'WEAPON', 'DIAMOND', 12, 4);
    const dismantle = card('qua_ha_sai_cau', 'Quá Hà Sái Cầu', 'NORMAL_SCROLL', 'SPADE', 4);
    const c1 = card('sat', 'Sát', 'BASIC', 'HEART', 10);
    const c2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2);

    const state = makeControlledState(
      4,
      {
        0: {
          heroId: 'sun_shang_xiang',
          hp: 2,
          maxHp: 3,
          handCards: [newWeapon, c1, c2],
          equipments: {
            weapon: oldWeapon,
            armor: null,
            plusOneHorse: null,
            minusOneHorse: null,
          },
        },
        1: { heroId: 'guan_yu', hp: 3, maxHp: 4, handCards: [dismantle] },
      },
      makeFillerCards(8),
    );

    // Tự thay trang bị mới đè lên trang bị cũ -> rút 2 lá
    let next = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [newWeapon.id],
    });
    expect(next.players[0]!.equipments.weapon?.id).toBe(newWeapon.id);
    expect(next.players[0]!.handCards).toHaveLength(4); // 2 lá cũ + 2 lá Kiêu Cơ

    // Kết Hôn: bỏ 2 lá hồi 1 máu cho bản thân & 1 tướng nam bị thương
    next = applyGameAction(next, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'jie_yin',
      cardIds: [c1.id, c2.id],
      targetSeats: [1],
    });
    expect(next.players[0]!.hp).toBe(3);
    expect(next.players[1]!.hp).toBe(4);
    expect(next.players[0]!.handCards).toHaveLength(2);

    // Bị Quá Hà Sái Cầu hủy trang bị -> rút thêm 2 lá nữa
    const p1Turn: MasterGameState = {
      ...next,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
    };
    let dis = applyGameAction(p1Turn, {
      type: 'PLAY_CARD',
      seatIndex: 1,
      cardIds: [dismantle.id],
      targetSeats: [0],
    });
    dis = applyGameAction(dis, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    dis = applyGameAction(dis, {
      type: 'RESPOND_PICK_TARGET_CARD',
      seatIndex: 1,
      zone: 'WEAPON',
    });
    expect(dis.players[0]!.equipments.weapon).toBeNull();
    expect(dis.players[0]!.handCards).toHaveLength(4);
  });

  // 9. Hoa Đà
  it('Hoa Đà (Thanh Nang & Cấp Cứu): Thanh Nang hồi 1 máu trong lượt; Cấp Cứu dùng bài Đỏ cứu Đào ngoài lượt', () => {
    const cost = card('sat', 'Sát', 'BASIC', 'SPADE', 5);
    const redCard = card('thiem', 'Thiểm', 'BASIC', 'HEART', 9);
    const state = makeControlledState(4, {
      0: { heroId: 'hua_tuo', hp: 3, maxHp: 3, handCards: [cost, redCard] },
      1: { heroId: 'guan_yu', hp: 2, maxHp: 4 },
    });

    // Thanh Nang trong lượt
    const afterQingNang = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'qing_nang',
      cardIds: [cost.id],
      targetSeats: [1],
    });
    expect(afterQingNang.players[1]!.hp).toBe(3);
    expect(afterQingNang.players[0]!.handCards).toHaveLength(1);

    // Cấp Cứu ngoài lượt của Hoa Đà
    const outOfTurnDying: MasterGameState = {
      ...afterQingNang,
      currentTurnSeat: 2,
      players: afterQingNang.players.map((p, idx) =>
        idx === 1 ? { ...p, hp: 0 } : p,
      ),
      interruptStack: [
        {
          id: 'dying_2',
          kind: 'WAIT_PEACH_RESCUE',
          targetSeat: 1,
          sourceSeat: 2,
          responderSeat: 0,
          askOrder: [2, 3, 0, 1],
          askCursor: 2,
        },
      ],
    };
    const afterJiJiu = applyGameAction(outOfTurnDying, {
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 0,
      cardId: redCard.id,
    });
    expect(afterJiJiu.players[1]!.hp).toBe(1);
  });

  // 10. Lữ Bố
  it('Lữ Bố (Vô Song): Sát cần 2 Thiểm để né và Quyết Đấu cần 2 Sát mỗi lần', () => {
    const luBuSat = card('sat', 'Sát', 'BASIC', 'SPADE', 10);
    const dodge1 = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
    const dodge2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 3);
    const state = makeControlledState(4, {
      0: { heroId: 'lu_bu', handCards: [luBuSat] },
      1: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [dodge1, dodge2] },
    });

    let next = applyGameAction(state, {
      type: 'PLAY_CARD',
      seatIndex: 0,
      cardIds: [luBuSat.id],
      targetSeats: [1],
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_DODGE');

    // Thiểm 1 chưa đủ né -> vẫn còn WAIT_DODGE
    next = applyGameAction(next, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: dodge1.id,
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_DODGE');

    // Thiểm 2 mới né thành công
    next = applyGameAction(next, {
      type: 'RESPOND_DODGE',
      seatIndex: 1,
      cardId: dodge2.id,
    });
    expect(next.interruptStack).toHaveLength(0);
    expect(next.players[1]!.hp).toBe(4);
  });

  // 11. Điêu Thuyền
  it('Điêu Thuyền (Ly Gián & Bế Nguyệt): Ly Gián buộc 2 nam Quyết Đấu và Bế Nguyệt rút 1 lá cuối lượt', () => {
    const cost = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
    const state = makeControlledState(
      4,
      {
        0: { heroId: 'diao_chan', hp: 3, maxHp: 3, handCards: [cost] },
        1: { heroId: 'guan_yu', hp: 4, maxHp: 4 },
        2: { heroId: 'zhang_fei', hp: 4, maxHp: 4 },
        3: { heroId: 'zhen_ji', hp: 3, maxHp: 3 },
      },
      makeFillerCards(4),
    );

    // Không thể chọn nữ cho Ly Gián
    expect(() =>
      applyGameAction(state, {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex: 0,
        skillId: 'li_jian',
        cardIds: [cost.id],
        targetSeats: [1, 3],
      }),
    ).toThrow();

    // Chọn 2 nam -> mở nhịp chờ Vô Giải Khả Kích trước khi vào Quyết Đấu
    let next = applyGameAction(state, {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex: 0,
      skillId: 'li_jian',
      cardIds: [cost.id],
      targetSeats: [1, 2],
    });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_NULLIFICATION');
    next = applyGameAction(next, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
    expect(getPendingPrompt(next)?.kind).toBe('WAIT_DUEL_SAT');

    // Ghế 2 không có Sát -> chịu 1 sát thương từ ghế 1
    next = applyGameAction(next, {
      type: 'RESPOND_DUEL_SAT',
      seatIndex: 2,
      cardIds: null,
    });
    expect(next.players[2]!.hp).toBe(3);

    // Kết lượt Điêu Thuyền (hp=3, hand=0) -> kích hoạt Bế Nguyệt rút 1 lá
    next = applyGameAction(next, {
      type: 'END_PLAY_PHASE',
      seatIndex: 0,
    });
    expect(next.players[0]!.handCards).toHaveLength(1);
    expect(next.currentTurnSeat).toBe(1);
  });
});
