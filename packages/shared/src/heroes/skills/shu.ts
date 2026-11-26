import { isRedSuit } from '../../cards/catalog.js';
import type { HeroId, MasterGameState } from '../../types/game.js';
import type { HeroSkillHandler, SkillRuntime } from '../skillContracts.js';

function handleRenDe(
  state: MasterGameState,
  seatIndex: number,
  cardIds: readonly string[] | undefined,
  targetSeats: readonly number[] | undefined,
  rt: SkillRuntime,
): MasterGameState {
  if (state.turnPhase !== 'PLAY' || state.currentTurnSeat !== seatIndex) {
    throw new Error('Nhân Đức chỉ dùng được trong pha Đánh bài của lượt mình.');
  }
  if (!cardIds || cardIds.length === 0) {
    throw new Error('Nhân Đức cần chọn ít nhất 1 lá bài trên tay để giao.');
  }
  const targetSeat = targetSeats?.[0];
  if (targetSeat === undefined || targetSeat === seatIndex) {
    throw new Error('Nhân Đức cần chọn 1 người chơi khác còn sống làm mục tiêu.');
  }

  const player = rt.getPlayerBySeat(state, seatIndex);
  const target = rt.getPlayerBySeat(state, targetSeat);
  if (!player.alive || !target.alive) {
    throw new Error('Người chơi hoặc mục tiêu đã tử vong.');
  }

  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    throw new Error('Danh sách lá bài giao Nhân Đức không được trùng lặp.');
  }

  const { nextPlayer, removed } = rt.removeCardsFromHand(player, cardIds);
  if (removed.length !== cardIds.length) {
    throw new Error('Một số lá bài Nhân Đức không có trên tay.');
  }

  let next = rt.updatePlayer(state, seatIndex, () => nextPlayer);
  next = rt.updatePlayer(next, targetSeat, (p) => ({
    ...p,
    handCards: [...p.handCards, ...removed],
  }));

  const prevGiven = next.turnFlags?.renDeGivenThisTurn ?? 0;
  const totalGiven = prevGiven + removed.length;
  const alreadyHealed = next.turnFlags?.renDeHealedThisTurn ?? false;
  const shouldHeal = totalGiven >= 2 && !alreadyHealed;

  if (shouldHeal) {
    const currentSelf = rt.getPlayerBySeat(next, seatIndex);
    const healedHp = Math.min(currentSelf.maxHp, currentSelf.hp + 1);
    next = rt.updatePlayer(next, seatIndex, (p) => ({
      ...p,
      hp: healedHp,
    }));
  }

  next = {
    ...next,
    turnFlags: {
      satUsedThisTurn: next.turnFlags?.satUsedThisTurn ?? 0,
      skipPlayPhase: next.turnFlags?.skipPlayPhase ?? false,
      ...next.turnFlags,
      renDeGivenThisTurn: totalGiven,
      renDeHealedThisTurn: alreadyHealed || shouldHeal,
    },
    actionLog: [
      ...next.actionLog,
      `${player.displayName} dùng Nhân Đức giao ${removed.length} lá bài cho ${target.displayName}${shouldHeal ? ' và hồi 1 máu' : ''}.`,
    ],
  };

  return next;
}

function handleJiJiang(
  state: MasterGameState,
  seatIndex: number,
  targetSeats: readonly number[] | undefined,
  rt: SkillRuntime,
): MasterGameState {
  if (state.turnPhase !== 'PLAY' || state.currentTurnSeat !== seatIndex) {
    throw new Error('Kích Tướng chủ động chỉ dùng được trong pha Đánh bài của lượt mình.');
  }

  const lord = rt.getPlayerBySeat(state, seatIndex);
  if (!lord.alive || lord.identity !== 'LORD') {
    throw new Error('Kích Tướng là kỹ năng Chủ Công, chỉ kích hoạt khi đóng vai Chủ Công.');
  }
  if (state.peacefulFirstRound && state.roundNumber === 1) {
    throw new Error('FIRST_ROUND_SAT_FORBIDDEN');
  }

  const hasLienNo = lord.equipments.weapon?.cardKey === 'gia_cat_lien_no';
  const maxSatThisTurn = 1 + (state.turnFlags?.bonusSatLimitThisTurn ?? 0);
  if (!hasLienNo && (state.turnFlags?.satUsedThisTurn ?? 0) >= maxSatThisTurn) {
    throw new Error('Đã hết lượt đánh Sát trong lượt này.');
  }

  const strikeTargetSeat = targetSeats?.[0];
  if (strikeTargetSeat === undefined || strikeTargetSeat === seatIndex) {
    throw new Error('Kích Tướng cần chọn 1 mục tiêu hợp lệ trong tầm đánh.');
  }
  const target = rt.getPlayerBySeat(state, strikeTargetSeat);
  if (!target.alive || !rt.isInAttackRange(state, seatIndex, strikeTargetSeat)) {
    throw new Error('Mục tiêu Kích Tướng không hợp lệ hoặc ngoài tầm đánh.');
  }

  if (!rt.canTargetPlayerWithCard(state, target, 'sat')) {
    throw new Error('Không thể chọn Gia Cát Lượng đang Không Thành làm mục tiêu Sát.');
  }

  const shuAllies = rt
    .getClockwiseAliveSeats(state, seatIndex, false)
    .filter((seat) => rt.getHeroFaction(rt.getPlayerBySeat(state, seat).heroId) === 'SHU');

  if (shuAllies.length === 0) {
    throw new Error('Không có tướng Thục đồng minh nào còn sống để hưởng ứng Kích Tướng.');
  }

  const firstResponder = shuAllies[0]!;
  const { state: s1, id } = rt.nextFrameId(state, 'jijiang');
  let next = rt.pushInterrupt(s1, {
    id,
    kind: 'WAIT_JI_JIANG',
    targetSeat: seatIndex,
    lordSeat: seatIndex,
    responderSeat: firstResponder,
    askOrder: shuAllies,
    askCursor: 0,
    strikeTargetSeat,
    contextKind: 'PLAY',
  });

  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      `${lord.displayName} phát động Kích Tướng, kêu gọi tướng Thục đánh Sát thay vào ${target.displayName}.`,
    ],
  };

  return next;
}

export const SHU_HERO_SKILLS: Partial<Record<HeroId, HeroSkillHandler>> = {
  liu_bei: {
    heroId: 'liu_bei',
    executePlaySkill(state, action, _rng, rt) {
      if (action.skillId === 'ren_de') {
        return handleRenDe(state, action.seatIndex, action.cardIds, action.targetSeats, rt);
      }
      if (action.skillId === 'ji_jiang') {
        return handleJiJiang(state, action.seatIndex, action.targetSeats, rt);
      }
      throw new Error(`Lưu Bị không có kỹ năng chủ động ${action.skillId}.`);
    },
  },

  guan_yu: {
    heroId: 'guan_yu',
    canConvertCardAs(_state, _player, card, asCardKey) {
      return asCardKey === 'sat' && isRedSuit(card.suit);
    },
  },

  zhang_fei: {
    heroId: 'zhang_fei',
    unlimitedSat: true,
  },

  zhuge_liang: {
    heroId: 'zhuge_liang',
    canBeTargetedBy(_state, target, cardKey) {
      if (target.handCards.length === 0 && (cardKey === 'sat' || cardKey === 'quyet_dau')) {
        return false;
      }
      return true;
    },
    onTurnStart(state, seatIndex, rng, rt) {
      const aliveCount = rt.getClockwiseAliveSeats(state, seatIndex, true).length;
      const peekCount = Math.min(5, aliveCount);
      if (peekCount <= 0) {
        return state;
      }
      const { state: s1, drawn } = rt.drawFromPile(state, peekCount, rng);
      if (drawn.length === 0) {
        return s1;
      }
      const player = rt.getPlayerBySeat(s1, seatIndex);
      const { state: s2, id } = rt.nextFrameId(s1, 'guanxing');
      let next = rt.pushInterrupt(s2, {
        id,
        kind: 'WAIT_GUAN_XING',
        targetSeat: seatIndex,
        cards: drawn,
      });
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${player.displayName} kích hoạt Quan Tinh, xem ${drawn.length} lá đầu chồng bài rút.`,
        ],
      };
      return next;
    },
  },

  zhao_yun: {
    heroId: 'zhao_yun',
    canConvertCardAs(_state, _player, card, asCardKey) {
      if (card.cardKey === 'sat' && asCardKey === 'thiem') {
        return true;
      }
      if (card.cardKey === 'thiem' && asCardKey === 'sat') {
        return true;
      }
      return false;
    },
  },

  ma_chao: {
    heroId: 'ma_chao',
    distanceModifier() {
      return -1;
    },
    onStrikeTargeting(state, sourceSeat, targetSeat, rt) {
      const { state: s1, id } = rt.nextFrameId(state, 'tieqi');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_TIE_QI',
        targetSeat,
        sourceSeat,
      });
    },
  },

  huang_yue_ying: {
    heroId: 'huang_yue_ying',
    ignoreScrollDistance: true,
    onNormalScrollPlayed(state, seatIndex, rng, rt) {
      const { state: next, dealt } = rt.dealCardsToSeat(state, seatIndex, 1, rng);
      if (dealt.length === 0) {
        return next;
      }
      const player = rt.getPlayerBySeat(next, seatIndex);
      return {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${player.displayName} kích hoạt Tập Trí, rút ${dealt.length} lá bài.`,
        ],
      };
    },
  },
};
