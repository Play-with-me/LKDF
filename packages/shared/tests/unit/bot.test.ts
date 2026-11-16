import { describe, expect, it } from 'vitest';
import {
  applyGameAction,
  chooseBotHero,
  createInitialMatchSetup,
  decideBotAction,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  type CardInstance,
  type MasterGameState,
  type SetupSeatInput,
} from '../../src/index.js';

let seq = 0;
function card(
  cardKey: string,
  nameVi: string,
  category: CardInstance['category'],
  suit: CardInstance['suit'],
  rank: number,
): CardInstance {
  seq += 1;
  return {
    id: `bot_u_${seq}_${cardKey}`,
    cardKey,
    nameVi,
    category,
    suit,
    rank,
  };
}

function makeSeats(count: number): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `bot-u-${idx}`,
    displayName: `Người ${idx + 1}`,
    avatarUrl: '',
  }));
}

describe('Bước 1.4 — Kiểm thử đơn vị Mô-đun Máy đánh hộ (botAi)', () => {
  it('chọn tướng hợp lệ từ PlayerViewState trong pha HERO_SELECT', () => {
    const seats = makeSeats(4);
    let state = createInitialMatchSetup({
      matchId: 'bot-draft',
      seats,
      rng: () => 0.2,
    });
    const lordSeat = state.heroDraft!.lordSeatIndex;
    const lordView = projectStateForPlayer(state, seats[lordSeat]!.userId);
    const pickedLord = chooseBotHero(lordView);
    expect(lordView.heroDraft!.myCandidates).toContain(pickedLord);

    state = selectLordHero(state, lordSeat, pickedLord, () => 0.2);
    for (let seat = 0; seat < 4; seat += 1) {
      if (seat === lordSeat) continue;
      const view = projectStateForPlayer(state, seats[seat]!.userId);
      const picked = chooseBotHero(view);
      expect(view.heroDraft!.myCandidates).toContain(picked);
      state = selectPlayerHero(state, seat, picked);
    }
    expect(state.heroDraft!.stage).toBe('COMPLETED');
  });

  it('Trung Thần dùng Đào cứu Chủ Công đang hấp hối, còn Phản Tặc không cứu Chủ Công', () => {
    const peachA = card('dao', 'Đào A', 'BASIC', 'HEART', 6);
    const peachB = card('dao', 'Đào B', 'BASIC', 'HEART', 7);

    const base: MasterGameState = {
      matchId: 'bot-rescue',
      roundNumber: 1,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
      heroDraft: null,
      drawPile: [],
      discardPile: [],
      players: [
        {
          seatIndex: 0,
          userId: 'u-0',
          displayName: 'Chủ Công',
          avatarUrl: '',
          identity: 'LORD',
          isIdentityRevealed: true,
          heroId: 'liu_bei',
          hp: 0,
          maxHp: 5,
          alive: true,
          handCards: [],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 1,
          userId: 'u-1',
          displayName: 'Phản Tặc',
          avatarUrl: '',
          identity: 'REBEL',
          isIdentityRevealed: false,
          heroId: 'zhang_fei',
          hp: 4,
          maxHp: 4,
          alive: true,
          handCards: [peachA],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 2,
          userId: 'u-2',
          displayName: 'Trung Thần',
          avatarUrl: '',
          identity: 'LOYALIST',
          isIdentityRevealed: false,
          heroId: 'guan_yu',
          hp: 4,
          maxHp: 4,
          alive: true,
          handCards: [peachB],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 3,
          userId: 'u-3',
          displayName: 'Nội Gián',
          avatarUrl: '',
          identity: 'SPY',
          isIdentityRevealed: false,
          heroId: 'diao_chan',
          hp: 3,
          maxHp: 3,
          alive: true,
          handCards: [],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
      ],
      interruptStack: [
        {
          id: 'peach-test',
          kind: 'WAIT_PEACH_RESCUE',
          targetSeat: 0,
          sourceSeat: 1,
          responderSeat: 1,
          askOrder: [1, 2, 3, 0],
          askCursor: 0,
        },
      ],
      pendingEffects: [],
      harvestPool: [],
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
      nextFrameSeq: 1,
      actionLog: [],
      refereeAuditLog: [],
      winningFaction: null,
      winnerUserIds: [],
    };

    // Phản Tặc (ghế 1) bỏ qua không cứu Chủ Công
    const rebelView = projectStateForPlayer(base, 'u-1');
    const rebelAction = decideBotAction(rebelView);
    expect(rebelAction).toEqual({
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 1,
      cardId: null,
    });

    const afterRebel = applyGameAction(base, rebelAction);
    // Trung Thần (ghế 2) dùng Đào cứu Chủ Công
    const loyalistView = projectStateForPlayer(afterRebel, 'u-2');
    const loyalistAction = decideBotAction(loyalistView);
    expect(loyalistAction).toEqual({
      type: 'RESPOND_PEACH_RESCUE',
      seatIndex: 2,
      cardId: peachB.id,
    });

    const rescued = applyGameAction(afterRebel, loyalistAction);
    expect(rescued.players[0]!.hp).toBe(1);
    expect(rescued.interruptStack).toHaveLength(0);
  });

  it('bỏ đúng số lá bài dư khi ở pha DISCARD', () => {
    const state: MasterGameState = {
      matchId: 'bot-discard',
      roundNumber: 1,
      currentTurnSeat: 0,
      turnPhase: 'DISCARD',
      heroDraft: null,
      drawPile: [],
      discardPile: [],
      players: [
        {
          seatIndex: 0,
          userId: 'u-0',
          displayName: 'Ghế 0',
          avatarUrl: '',
          identity: 'LORD',
          isIdentityRevealed: true,
          heroId: 'cao_cao',
          hp: 2,
          maxHp: 5,
          alive: true,
          handCards: [
            card('dao', 'Đào', 'BASIC', 'HEART', 3),
            card('sat', 'Sát', 'BASIC', 'SPADE', 7),
            card('thiem_dien', 'Thiểm Điện', 'DELAYED_SCROLL', 'SPADE', 1),
            card('dao_vien_ket_nghia', 'Đào Viên', 'NORMAL_SCROLL', 'HEART', 1),
          ],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 1,
          userId: 'u-1',
          displayName: 'Ghế 1',
          avatarUrl: '',
          identity: 'REBEL',
          isIdentityRevealed: false,
          heroId: 'zhang_fei',
          hp: 4,
          maxHp: 4,
          alive: true,
          handCards: [],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 2,
          userId: 'u-2',
          displayName: 'Ghế 2',
          avatarUrl: '',
          identity: 'REBEL',
          isIdentityRevealed: false,
          heroId: 'guan_yu',
          hp: 4,
          maxHp: 4,
          alive: true,
          handCards: [],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
        {
          seatIndex: 3,
          userId: 'u-3',
          displayName: 'Ghế 3',
          avatarUrl: '',
          identity: 'SPY',
          isIdentityRevealed: false,
          heroId: 'diao_chan',
          hp: 3,
          maxHp: 3,
          alive: true,
          handCards: [],
          equipments: { weapon: null, armor: null, plusOneHorse: null, minusOneHorse: null },
          delayedScrolls: [],
          autoSkipNullification: false,
          isBotTakeover: false,
        },
      ],
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

    const view = projectStateForPlayer(state, 'u-0');
    const action = decideBotAction(view);
    expect(action.type).toBe('DISCARD_CARDS');
    if (action.type === 'DISCARD_CARDS') {
      expect(action.cardIds).toHaveLength(2);
    }
    const next = applyGameAction(state, action);
    expect(next.players[0]!.handCards).toHaveLength(2);
    expect(next.currentTurnSeat).toBe(1);
  });
});
