import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  getPendingPrompt,
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
    id: `wei_t_${seq}_${cardKey}`,
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
    heroId: 'zhang_liao',
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
    matchId: 'wei-test-match',
    roundNumber: 1,
    currentTurnSeat: 0,
    turnPhase: 'PLAY',
    heroDraft: null,
    drawPile,
    discardPile,
    players,
    interruptStack: [],
    pendingEffects: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    nextFrameSeq: 0,
    actionLog: [],
  };
}

describe('7 Tướng Phe Ngụy (Bước 1.3)', () => {
  describe('Tào Tháo — Gian Hùng & Hộ Giá', () => {
    it('Gian Hùng: thu lấy lá Sát vừa gây sát thương cho Tào Tháo', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      let state = makeControlledState(4, {
        0: { heroId: 'guan_yu', handCards: [sat] },
        1: { heroId: 'cao_cao', hp: 4, maxHp: 4 },
      });

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });
      // Ghế 1 không né
      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 1,
        cardId: null,
      });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_JIAN_XIONG');
      state = applyGameAction(state, {
        type: 'RESPOND_JIAN_XIONG',
        seatIndex: 1,
        activate: true,
      });

      expect(state.players[1]?.hp).toBe(3);
      expect(state.players[1]?.handCards.some((c) => c.id === sat.id)).toBe(true);
    });

    it('Hộ Giá (Chủ Công): Tào Tháo Chủ Công nhờ tướng Ngụy khác đánh Thiểm thay', () => {
      const thiemWei = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
      let state = makeControlledState(4, {
        0: { heroId: 'cao_cao', identity: 'LORD', hp: 5, maxHp: 5 },
        1: { heroId: 'guan_yu', handCards: [sat] },
        2: { heroId: 'zhen_ji', handCards: [thiemWei] },
      });
      state = { ...state, currentTurnSeat: 1 };

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 1,
        cardIds: [sat.id],
        targetSeats: [0],
      });
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_DODGE');

      state = applyGameAction(state, {
        type: 'RESPOND_DODGE',
        seatIndex: 0,
        cardId: null,
        useHuJia: true,
      });
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_HU_JIA');

      state = applyGameAction(state, {
        type: 'RESPOND_HU_JIA',
        seatIndex: 2,
        cardId: thiemWei.id,
      });

      expect(state.players[0]?.hp).toBe(5);
      expect(state.players[2]?.handCards).toHaveLength(0);
    });

    it('Hộ Giá không kích hoạt nếu Tào Tháo không phải Chủ Công', () => {
      const thiemWei = card('thiem', 'Thiểm', 'BASIC', 'HEART', 2);
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
      let state = makeControlledState(4, {
        0: { heroId: 'liu_bei', identity: 'LORD', handCards: [sat] },
        1: { heroId: 'cao_cao', identity: 'LOYALIST', hp: 4, maxHp: 4 },
        2: { heroId: 'zhen_ji', handCards: [thiemWei] },
      });

      state = applyGameAction(state, {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat.id],
        targetSeats: [1],
      });

      expect(() =>
        applyGameAction(state, {
          type: 'RESPOND_DODGE',
          seatIndex: 1,
          cardId: null,
          useHuJia: true,
        }),
      ).toThrow();
    });
  });

  describe('Tư Mã Ý — Phản Quỷ & Quỷ Tài', () => {
    it('Phản Quỷ: sau khi chịu sát thương, lấy 1 lá bài từ người gây sát thương', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const loot = card('dao', 'Đào', 'BASIC', 'HEART', 3);
      let state = makeControlledState(4, {
        0: { heroId: 'guan_yu', handCards: [sat, loot] },
        1: { heroId: 'si_ma_yi', hp: 3, maxHp: 3 },
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

      expect(getPendingPrompt(state)?.kind).toBe('ASK_FAN_KUI');
      state = applyGameAction(state, {
        type: 'RESPOND_FAN_KUI',
        seatIndex: 1,
        activate: true,
      });
      expect(getPendingPrompt(state)?.kind).toBe('PICK_TARGET_CARD');
      state = applyGameAction(state, {
        type: 'RESPOND_PICK_TARGET_CARD',
        seatIndex: 1,
        zone: 'HAND',
        handIndex: 0,
      });

      expect(state.players[1]?.handCards.some((c) => c.id === loot.id)).toBe(true);
      expect(state.players[0]?.handCards).toHaveLength(0);
    });

    it('Quỷ Tài: đổi lá phán xét cho Thiểm Điện (né 5♠ thành ♥ hoặc ép trúng 5♠)', () => {
      const thiemDien = card('thiem_dien', 'Thiểm Điện', 'DELAYED_SCROLL', 'SPADE', 1);
      const judgeHeart = card('dao', 'Đào', 'BASIC', 'HEART', 6);
      const guiCaiSpade5 = card('sat', 'Sát', 'BASIC', 'SPADE', 5);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'guan_yu', hp: 4, maxHp: 4, delayedScrolls: [thiemDien] },
          1: { heroId: 'si_ma_yi', handCards: [guiCaiSpade5] },
        },
        [judgeHeart],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };
      state = stepEngine(state);
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
      state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: guiCaiSpade5.id,
      });

      expect(state.players[0]?.hp).toBe(1);
    });

    it('Quỷ Tài: đổi lá phán xét của Lạc Bất Tư Thục thành chất Cơ để cứu đồng minh', () => {
      const lacBat = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'SPADE', 6);
      const judgeSpade = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
      const guiCaiHeart = card('dao', 'Đào', 'BASIC', 'HEART', 8);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'cao_cao', delayedScrolls: [lacBat] },
          1: { heroId: 'si_ma_yi', handCards: [guiCaiHeart] },
        },
        [judgeSpade, card('sat', 'Sát', 'BASIC', 'CLUB', 2), card('sat', 'Sát', 'BASIC', 'CLUB', 3)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };
      state = stepEngine(state);
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
      state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GUI_CAI');
      state = applyGameAction(state, {
        type: 'RESPOND_GUI_CAI',
        seatIndex: 1,
        cardId: guiCaiHeart.id,
      });

      expect(state.turnFlags?.skipPlayPhase).toBe(false);
    });

    it('Quỷ Tài: đổi lá phán xét của Bát Quái Trận thành Đỏ giúp có Thiểm', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const batQuai = card('bat_quai_tran', 'Bát Quái Trận', 'ARMOR', 'SPADE', 2);
      const judgeBlack = card('sat', 'Sát', 'BASIC', 'CLUB', 4);
      const guiCaiRed = card('dao', 'Đào', 'BASIC', 'DIAMOND', 5);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'guan_yu', handCards: [sat] },
          1: { heroId: 'cao_cao', hp: 4, maxHp: 4, equipments: { weapon: null, armor: batQuai, plusOneHorse: null, minusOneHorse: null } },
          2: { heroId: 'si_ma_yi', handCards: [guiCaiRed] },
        },
        [judgeBlack],
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
        seatIndex: 2,
        cardId: guiCaiRed.id,
      });

      expect(state.players[1]?.hp).toBe(4);
    });

    it('Quỷ Tài: đổi lá phán xét của Cương Liệt, Thiết Kỵ và Lạc Thần', () => {
      // Cương Liệt: đổi chất Cơ thành Đen để ép nguồn sát thương bỏ 2 lá hoặc mất 1 máu
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const judgeHeart = card('dao', 'Đào', 'BASIC', 'HEART', 3);
      const guiCaiSpade = card('sat', 'Sát', 'BASIC', 'SPADE', 4);
      let s1 = makeControlledState(
        4,
        {
          0: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [sat] },
          1: { heroId: 'xia_hou_dun', hp: 4, maxHp: 4 },
          2: { heroId: 'si_ma_yi', handCards: [guiCaiSpade] },
        },
        [judgeHeart],
      );
      s1 = applyGameAction(s1, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [sat.id], targetSeats: [1] });
      s1 = applyGameAction(s1, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null });
      s1 = applyGameAction(s1, { type: 'RESPOND_GANG_LIE', seatIndex: 1, activate: true });
      expect(getPendingPrompt(s1)?.kind).toBe('WAIT_GUI_CAI');
      s1 = applyGameAction(s1, { type: 'RESPOND_GUI_CAI', seatIndex: 2, cardId: guiCaiSpade.id });
      expect(getPendingPrompt(s1)?.kind).toBe('WAIT_GANG_LIE_CHOICE');

      // Thiết Kỵ: đổi chất Đen thành Đỏ để khóa Thiểm
      const sat2 = card('sat', 'Sát', 'BASIC', 'SPADE', 8);
      const judgeBlack = card('sat', 'Sát', 'BASIC', 'CLUB', 6);
      const guiCaiDiamond = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 7);
      let s2 = makeControlledState(
        4,
        {
          0: { heroId: 'ma_chao', handCards: [sat2] },
          1: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [card('thiem', 'Thiểm', 'BASIC', 'HEART', 2)] },
          2: { heroId: 'si_ma_yi', handCards: [guiCaiDiamond] },
        },
        [judgeBlack],
      );
      s2 = applyGameAction(s2, { type: 'PLAY_CARD', seatIndex: 0, cardIds: [sat2.id], targetSeats: [1] });
      s2 = applyGameAction(s2, { type: 'RESPOND_TIE_QI', seatIndex: 0, activate: true });
      expect(getPendingPrompt(s2)?.kind).toBe('WAIT_GUI_CAI');
      s2 = applyGameAction(s2, { type: 'RESPOND_GUI_CAI', seatIndex: 2, cardId: guiCaiDiamond.id });
      // Không được hỏi Thiểm mà nhận sát thương luôn
      expect(s2.players[1]?.hp).toBe(3);

      // Lạc Thần: đổi Đen thành Đỏ để cắt chuỗi rút bài của Chân Cơ
      const judgeBlack2 = card('sat', 'Sát', 'BASIC', 'SPADE', 9);
      const guiCaiHeart2 = card('dao', 'Đào', 'BASIC', 'HEART', 9);
      let s3 = makeControlledState(
        4,
        {
          0: { heroId: 'zhen_ji', hp: 3, maxHp: 3 },
          1: { heroId: 'si_ma_yi', handCards: [guiCaiHeart2] },
        },
        [judgeBlack2, card('sat', 'Sát', 'BASIC', 'CLUB', 2), card('sat', 'Sát', 'BASIC', 'CLUB', 3)],
      );
      s3 = { ...s3, currentTurnSeat: 0, turnPhase: 'JUDGE' };
      s3 = stepEngine(s3);
      s3 = applyGameAction(s3, { type: 'RESPOND_LUO_SHEN', seatIndex: 0, activate: true });
      expect(getPendingPrompt(s3)?.kind).toBe('WAIT_GUI_CAI');
      s3 = applyGameAction(s3, { type: 'RESPOND_GUI_CAI', seatIndex: 1, cardId: guiCaiHeart2.id });
      // Ra chất Đỏ thì Lạc Thần dừng, Chân Cơ không thu được lá nào từ Lạc Thần
      expect(s3.players[0]?.handCards.some((c) => c.id === guiCaiHeart2.id)).toBe(false);
    });
  });

  describe('Hạ Hầu Đôn — Cương Liệt', () => {
    it('Cương Liệt: phán xét khác Cơ buộc nguồn sát thương bỏ 2 lá hoặc mất 1 máu', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const judgeBlack = card('sat', 'Sát', 'BASIC', 'CLUB', 5);
      const extra1 = card('dao', 'Đào', 'BASIC', 'HEART', 4);
      const extra2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 5);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'guan_yu', hp: 4, maxHp: 4, handCards: [sat, extra1, extra2] },
          1: { heroId: 'xia_hou_dun', hp: 4, maxHp: 4 },
        },
        [judgeBlack],
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
      state = applyGameAction(state, {
        type: 'RESPOND_GANG_LIE',
        seatIndex: 1,
        activate: true,
      });

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_GANG_LIE_CHOICE');
      state = applyGameAction(state, {
        type: 'RESPOND_GANG_LIE_CHOICE',
        seatIndex: 0,
        choice: 'DISCARD_TWO',
        discardCardIds: [extra1.id, extra2.id],
      });

      expect(state.players[0]?.handCards).toHaveLength(0);
      expect(state.players[0]?.hp).toBe(4);
    });
  });

  describe('Trương Liêu — Đột Tập', () => {
    it('Đột Tập: bỏ qua pha Rút bài để lấy 1 lá trên tay của tối đa 2 người khác', () => {
      const c1 = card('dao', 'Đào', 'BASIC', 'HEART', 3);
      const c2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 4);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhang_liao' },
          1: { heroId: 'guan_yu', handCards: [c1] },
          2: { heroId: 'zhang_fei', handCards: [c2] },
        },
        [card('sat', 'Sát', 'BASIC', 'SPADE', 2), card('sat', 'Sát', 'BASIC', 'SPADE', 3)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'DRAW' };
      state = stepEngine(state);

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_TU_XI');
      state = applyGameAction(state, {
        type: 'RESPOND_TU_XI',
        seatIndex: 0,
        targetSeats: [1, 2],
      });

      expect(state.players[0]?.handCards.map((c) => c.id)).toEqual([c1.id, c2.id]);
      expect(state.players[1]?.handCards).toHaveLength(0);
      expect(state.players[2]?.handCards).toHaveLength(0);
      expect(state.turnPhase).toBe('PLAY');
    });
  });

  describe('Hứa Chử — Lỏa Y', () => {
    it('Lỏa Y: rút ít hơn 1 lá để +1 sát thương Sát và Quyết Đấu trong lượt', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const drawCard = card('dao', 'Đào', 'BASIC', 'HEART', 9);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'xu_chu', handCards: [sat] },
          1: { heroId: 'guan_yu', hp: 4, maxHp: 4 },
        },
        [drawCard, card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 2)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'DRAW' };
      state = stepEngine(state);

      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_YI');
      state = applyGameAction(state, {
        type: 'RESPOND_LUO_YI',
        seatIndex: 0,
        activate: true,
      });

      // Chỉ rút thêm 1 lá (tổng 2 lá trên tay)
      expect(state.players[0]?.handCards).toHaveLength(2);
      expect(state.turnPhase).toBe('PLAY');

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

      // Gây 2 sát thương
      expect(state.players[1]?.hp).toBe(2);
    });
  });

  describe('Quách Gia — Thiên Đố & Di Kế', () => {
    it('Thiên Đố: thu lấy lá phán xét sau khi phán xét có hiệu lực', () => {
      const lacBat = card('lac_bat_tu_thuc', 'Lạc Bất Tư Thục', 'DELAYED_SCROLL', 'SPADE', 6);
      const judgeHeart = card('dao', 'Đào', 'BASIC', 'HEART', 7);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'guo_jia', hp: 3, maxHp: 3, delayedScrolls: [lacBat] },
        },
        [judgeHeart, card('sat', 'Sát', 'BASIC', 'CLUB', 2), card('sat', 'Sát', 'BASIC', 'CLUB', 3)],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };
      state = stepEngine(state);
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_NULLIFICATION');
      state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_TIAN_DO');
      state = applyGameAction(state, {
        type: 'RESPOND_TIAN_DO',
        seatIndex: 0,
        activate: true,
      });

      expect(state.players[0]?.handCards.some((c) => c.id === judgeHeart.id)).toBe(true);
    });

    it('Di Kế: rút 2 lá mỗi 1 điểm máu mất (mất 2 máu rút 2 lần x 2 lá) và chia được cho đồng đội', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const yiji1 = card('dao', 'Đào', 'BASIC', 'HEART', 2);
      const yiji2 = card('thiem', 'Thiểm', 'BASIC', 'DIAMOND', 3);
      const yiji3 = card('sat', 'Sát', 'BASIC', 'CLUB', 4);
      const yiji4 = card('thiem', 'Thiểm', 'BASIC', 'HEART', 5);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'xu_chu', handCards: [sat] },
          1: { heroId: 'guo_jia', hp: 3, maxHp: 3 },
          2: { heroId: 'cao_cao', hp: 4, maxHp: 4 },
        },
        [yiji1, yiji2, yiji3, yiji4],
      );
      // Bật Lỏa Y để gây 2 sát thương -> kích hoạt Di Kế 2 lần
      state = {
        ...state,
        turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false, luoYiActive: true },
      };

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

      expect(getPendingPrompt(state)?.kind).toBe('WAIT_YI_JI');
      state = applyGameAction(state, {
        type: 'RESPOND_YI_JI',
        seatIndex: 1,
        distributions: [
          { targetSeat: 1, cardIds: [yiji1.id] },
          { targetSeat: 2, cardIds: [yiji2.id] },
        ],
      });

      // Lần Di Kế thứ 2 cho điểm máu mất thứ 2
      expect(getPendingPrompt(state)?.kind).toBe('WAIT_YI_JI');
      state = applyGameAction(state, {
        type: 'RESPOND_YI_JI',
        seatIndex: 1,
        distributions: [{ targetSeat: 2, cardIds: [yiji3.id, yiji4.id] }],
      });

      expect(state.players[1]?.hp).toBe(1);
      expect(state.players[1]?.handCards.some((c) => c.id === yiji1.id)).toBe(true);
      expect(state.players[2]?.handCards.map((c) => c.id)).toEqual([
        yiji2.id,
        yiji3.id,
        yiji4.id,
      ]);
    });
  });

  describe('Chân Cơ — Lạc Thần & Khuynh Quốc', () => {
    it('Lạc Thần: phán xét liên tục thu bài chất Đen đến khi gặp chất Đỏ thì dừng', () => {
      const black1 = card('sat', 'Sát', 'BASIC', 'SPADE', 4);
      const black2 = card('sat', 'Sát', 'BASIC', 'CLUB', 8);
      const redStop = card('dao', 'Đào', 'BASIC', 'HEART', 5);
      let state = makeControlledState(
        4,
        {
          0: { heroId: 'zhen_ji', hp: 3, maxHp: 3 },
        },
        [
          black1,
          black2,
          redStop,
          card('sat', 'Sát', 'BASIC', 'SPADE', 2),
          card('sat', 'Sát', 'BASIC', 'SPADE', 3),
        ],
      );
      state = { ...state, currentTurnSeat: 0, turnPhase: 'JUDGE' };
      state = stepEngine(state);

      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_SHEN');
      state = applyGameAction(state, { type: 'RESPOND_LUO_SHEN', seatIndex: 0, activate: true });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_SHEN');
      state = applyGameAction(state, { type: 'RESPOND_LUO_SHEN', seatIndex: 0, activate: true });

      expect(getPendingPrompt(state)?.kind).toBe('ASK_LUO_SHEN');
      state = applyGameAction(state, { type: 'RESPOND_LUO_SHEN', seatIndex: 0, activate: true });

      // Đã thu 2 lá Đen từ Lạc Thần (cộng 2 lá pha DRAW sau đó)
      const handIds = state.players[0]?.handCards.map((c) => c.id) ?? [];
      expect(handIds).toContain(black1.id);
      expect(handIds).toContain(black2.id);
      expect(handIds).not.toContain(redStop.id);
    });

    it('Khuynh Quốc: dùng lá chất Đen trên tay làm Thiểm né Sát', () => {
      const sat = card('sat', 'Sát', 'BASIC', 'SPADE', 7);
      const blackHand = card('vo_trung_sinh_huu', 'Vô Trung Sinh Hữu', 'NORMAL_SCROLL', 'CLUB', 8);
      let state = makeControlledState(4, {
        0: { heroId: 'guan_yu', handCards: [sat] },
        1: { heroId: 'zhen_ji', hp: 3, maxHp: 3, handCards: [blackHand] },
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
        cardId: blackHand.id,
      });

      expect(state.players[1]?.hp).toBe(3);
      expect(state.players[1]?.handCards).toHaveLength(0);
    });
  });
});
