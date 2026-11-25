import { createStandard108Deck, isBlackSuit, isRedSuit } from '../cards/catalog.js';
import {
  canReachForSnatch,
  canUseCollateralMurder,
  isInAttackRange,
} from '../distance/index.js';
import { getHeroSkillHandler } from '../heroes/registry.js';
import type {
  CardInstance,
  InterruptFrame,
  MasterGameState,
  PlayerCombatState,
  Suit,
} from '../types/game.js';
import {
  applyDamage,
  beginStrikeAgainstTarget,
  canTargetPlayerWithCard,
  canUseCardAs,
  completeStrikeDodged,
  hasTruongBat,
  maybeOfferKyLanCung,
  notifyEquipLost,
  notifyHandCardsLost,
  openNullificationWindow,
  popInterrupt,
  pushInterrupt,
  pushPendingEffect,
  replaceTopInterrupt,
  resolveStrikeAfterLiuLi,
  resolveStrikeHit,
  SKILL_RUNTIME,
  startJudgment,
  revealPublicCard,
  completeTurnDraw,
  stepEngine,
} from './combatCore.js';
import type { GameAction } from './combatTypes.js';
import {
  appendToDiscardPile,
  showDiscardAs,
  dealCardsToSeat,
  drawFromPile,
  getClockwiseAliveSeats,
  getPlayerBySeat,
  hasAnyCardInHandOrEquip,
  removeAnyCardFromPlayer,
  removeCardFromTargetZone,
  removeCardsFromHand,
  restorePhysicalCard,
  updatePlayer,
} from './deck.js';
import { handlePlayerDeath } from './winCondition.js';

function assertNoInterrupt(state: MasterGameState): void {
  if (state.interruptStack.length > 0) {
    throw new Error('INTERRUPT_PENDING');
  }
}

function assertTopFrame<K extends InterruptFrame['kind']>(
  state: MasterGameState,
  kind: K,
): Extract<InterruptFrame, { kind: K }> {
  const top = state.interruptStack[state.interruptStack.length - 1];
  if (!top || top.kind !== kind) {
    throw new Error(`EXPECTED_INTERRUPT:${kind}`);
  }
  return top as Extract<InterruptFrame, { kind: K }>;
}

/** Khởi phát ván đấu sau khi tất cả đã chọn xong tướng: chia 4 lá mỗi người và vào lượt Chủ Công. */
export function startMatchCombat(
  state: MasterGameState,
  rng: () => number = Math.random,
): MasterGameState {
  if (!state.heroDraft || state.heroDraft.stage !== 'COMPLETED') {
    throw new Error('HERO_SELECTION_NOT_COMPLETED');
  }

  let next: MasterGameState = {
    ...state,
    drawPile: createStandard108Deck(rng),
    discardPile: [],
    turnPhase: 'JUDGE',
    roundNumber: 1,
    currentTurnSeat: state.heroDraft.lordSeatIndex,
    peacefulFirstRound: state.peacefulFirstRound ?? true,
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    nextFrameSeq: state.nextFrameSeq ?? 0,
  };

  const seatOrder = getClockwiseAliveSeats(next, state.heroDraft.lordSeatIndex, true);
  for (const seat of seatOrder) {
    const dealt = dealCardsToSeat(next, seat, 4, rng);
    next = dealt.state;
  }

  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      'Đã chia mỗi người 4 lá bài khởi đầu. Lượt 1 của Chủ Công bắt đầu!',
    ],
  };

  return stepEngine(next, rng);
}

function findCardOnPlayer(
  player: PlayerCombatState,
  cardId: string,
): { readonly card: CardInstance; readonly isHand: boolean } | null {
  const handCard = player.handCards.find((c) => c.id === cardId);
  if (handCard) {
    return { card: handCard, isHand: true };
  }
  const equips = [
    player.equipments.weapon,
    player.equipments.armor,
    player.equipments.plusOneHorse,
    player.equipments.minusOneHorse,
  ];
  const eq = equips.find((c) => c?.id === cardId);
  return eq ? { card: eq, isHand: false } : null;
}

const SUIT_LABEL_VI: Readonly<Record<Suit, string>> = {
  SPADE: '♠ Bích',
  HEART: '♥ Cơ',
  CLUB: '♣ Chuồn',
  DIAMOND: '♦ Rô',
};

function getStrikeConversionSkill(
  player: PlayerCombatState,
  card: CardInstance,
): 'Võ Thánh' | 'Long Đảm' | null {
  if (card.cardKey === 'sat') return null;
  if (player.heroId === 'guan_yu' && isRedSuit(card.suit)) return 'Võ Thánh';
  if (player.heroId === 'zhao_yun' && card.cardKey === 'thiem') return 'Long Đảm';
  return null;
}

function getDodgeConversionSkill(
  player: PlayerCombatState,
  card: CardInstance,
): 'Long Đảm' | 'Khuynh Quốc' | null {
  if (card.cardKey === 'thiem') return null;
  if (player.heroId === 'zhao_yun' && card.cardKey === 'sat') return 'Long Đảm';
  if (player.heroId === 'zhen_ji' && isBlackSuit(card.suit)) return 'Khuynh Quốc';
  return null;
}

function validateAndConsumeStrikeCards(
  state: MasterGameState,
  seatIndex: number,
  cardIds: readonly string[],
  allowTruongBat: boolean,
  rng: () => number,
): { readonly state: MasterGameState; readonly usedCards: CardInstance[] } {
  const player = getPlayerBySeat(state, seatIndex);
  const inTurn = seatIndex === state.currentTurnSeat;
  if (cardIds.length === 1) {
    const cardId = cardIds[0]!;
    const found = findCardOnPlayer(player, cardId);
    if (!found) {
      throw new Error(`CARD_NOT_OWNED:${cardId}`);
    }
    if (!canUseCardAs(state, player, found.card, 'sat', inTurn)) {
      throw new Error('NOT_A_SAT_CARD');
    }
    if (!found.isHand && player.heroId !== 'guan_yu') {
      throw new Error('CARD_NOT_IN_HAND');
    }
    const res = SKILL_RUNTIME.discardAnyCard(state, seatIndex, cardId, rng);
    let nextState = showDiscardAs(res.state, res.removed, 'sat');
    const strikeSkill = getStrikeConversionSkill(player, res.removed);
    if (strikeSkill) {
      nextState = {
        ...nextState,
        actionLog: [
          ...nextState.actionLog,
          `${player.displayName} dùng ${strikeSkill} đánh Sát.`,
        ],
      };
    }
    return { state: nextState, usedCards: [res.removed] };
  }
  if (cardIds.length === 2 && allowTruongBat && hasTruongBat(player)) {
    const res = SKILL_RUNTIME.discardHandCards(state, seatIndex, cardIds, rng);
    return { state: res.state, usedCards: res.removed };
  }
  throw new Error('INVALID_SAT_CARD_COUNT');
}

function handlePlayCard(
  state: MasterGameState,
  action: Extract<GameAction, { type: 'PLAY_CARD' }>,
  rng: () => number,
): MasterGameState {
  assertNoInterrupt(state);
  if (state.turnPhase !== 'PLAY' || action.seatIndex !== state.currentTurnSeat) {
    throw new Error('NOT_IN_PLAY_PHASE');
  }

  const actor = getPlayerBySeat(state, action.seatIndex);
  if (!actor.alive) {
    throw new Error('DEAD_PLAYER_CANNOT_ACT');
  }

  const actorHandler = getHeroSkillHandler(actor.heroId);
  const hasUnlimitedSat =
    Boolean(actorHandler?.unlimitedSat) ||
    actor.equipments.weapon?.cardKey === 'gia_cat_lien_no';

  // Trường hợp dùng Trượng Bát Xà Mâu (2 lá bất kỳ trên tay -> Sát)
  if (action.cardIds.length === 2) {
    if (!hasTruongBat(actor) || action.asCardKey !== 'sat') {
      throw new Error('INVALID_TWO_CARD_COMBO');
    }
    if (state.peacefulFirstRound && state.roundNumber === 1) {
      throw new Error('FIRST_ROUND_SAT_FORBIDDEN');
    }
    const satUsed = state.turnFlags?.satUsedThisTurn ?? 0;
    if (!hasUnlimitedSat && satUsed >= 1) {
      throw new Error('SAT_LIMIT_REACHED');
    }
    const targets = action.targetSeats ?? [];
    if (targets.length !== 1) {
      throw new Error('INVALID_STRIKE_TARGET_COUNT');
    }
    const targetSeat = targets[0]!;
    const targetPlayer = getPlayerBySeat(state, targetSeat);
    if (!canTargetPlayerWithCard(state, targetPlayer, 'sat')) {
      throw new Error('TARGET_IMMUNE_TO_CARD');
    }
    if (!isInAttackRange(state, action.seatIndex, targetSeat)) {
      throw new Error('TARGET_OUT_OF_RANGE');
    }

    const res = SKILL_RUNTIME.discardHandCards(
      state,
      action.seatIndex,
      action.cardIds,
      rng,
    );
    let next = res.state;
    const usedCards = res.removed;
    next = {
      ...next,
      turnFlags: {
        ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
        satUsedThisTurn: satUsed + 1,
        satPlayedOrUsedThisTurn: true,
      },
      actionLog: [
        ...next.actionLog,
        `${actor.displayName} dùng Trượng Bát Xà Mâu đánh Sát vào ${targetPlayer.displayName}.`,
      ],
    };

    next = beginStrikeAgainstTarget(
      next,
      action.seatIndex,
      targetSeat,
      usedCards,
      false,
      false,
    );
    return stepEngine(next, rng);
  }

  if (action.cardIds.length !== 1) {
    throw new Error('MUST_SELECT_ONE_CARD');
  }

  const cardId = action.cardIds[0]!;
  const found = findCardOnPlayer(actor, cardId);
  if (!found) {
    throw new Error(`CARD_NOT_OWNED:${cardId}`);
  }
  const card = found.card;
  const effectiveKey = action.asCardKey ?? card.cardKey;

  if (action.asCardKey) {
    if (!canUseCardAs(state, actor, card, action.asCardKey, true)) {
      throw new Error(`CANNOT_CONVERT_CARD_AS:${action.asCardKey}`);
    }
  } else if (!found.isHand) {
    throw new Error('CARD_NOT_IN_HAND');
  }

  // 1. TRANG BỊ (chỉ khi đánh nguyên gốc, không phải chuyển đổi bài)
  if (
    !action.asCardKey &&
    (card.category === 'WEAPON' ||
      card.category === 'ARMOR' ||
      card.category === 'PLUS_ONE_HORSE' ||
      card.category === 'MINUS_ONE_HORSE')
  ) {
    const prevHandCount = actor.handCards.length;
    const { nextPlayer, removed } = removeCardsFromHand(actor, [cardId]);
    const equippedCard = removed[0]!;
    let next = updatePlayer(state, action.seatIndex, () => nextPlayer);
    const equipCategory: 'WEAPON' | 'ARMOR' | 'PLUS_ONE_HORSE' | 'MINUS_ONE_HORSE' =
      card.category;
    let replaced: CardInstance | null = null;
    next = updatePlayer(next, action.seatIndex, (p) => {
      switch (equipCategory) {
        case 'WEAPON':
          replaced = p.equipments.weapon;
          return { ...p, equipments: { ...p.equipments, weapon: equippedCard } };
        case 'ARMOR':
          replaced = p.equipments.armor;
          return { ...p, equipments: { ...p.equipments, armor: equippedCard } };
        case 'PLUS_ONE_HORSE':
          replaced = p.equipments.plusOneHorse;
          return {
            ...p,
            equipments: { ...p.equipments, plusOneHorse: equippedCard },
          };
        case 'MINUS_ONE_HORSE':
          replaced = p.equipments.minusOneHorse;
          return {
            ...p,
            equipments: { ...p.equipments, minusOneHorse: equippedCard },
          };
      }
    });
    if (replaced) {
      next = appendToDiscardPile(next, [replaced]);
      next = notifyEquipLost(next, action.seatIndex, 1, rng);
    }
    next = notifyHandCardsLost(next, action.seatIndex, prevHandCount, rng);
    return {
      ...next,
      actionLog: [
        ...next.actionLog,
        `${actor.displayName} trang bị ${equippedCard.nameVi}.`,
      ],
    };
  }

  // 2. ĐÀO (hồi 1 máu trong lượt)
  if (effectiveKey === 'dao') {
    if (actor.hp >= actor.maxHp) {
      throw new Error('HP_ALREADY_FULL');
    }
    const res = SKILL_RUNTIME.discardAnyCard(state, action.seatIndex, cardId, rng);
    let next = updatePlayer(showDiscardAs(res.state, res.removed, 'dao'), action.seatIndex, (p) => ({
      ...p,
      hp: Math.min(p.maxHp, p.hp + 1),
    }));
    return {
      ...next,
      actionLog: [
        ...next.actionLog,
        `${actor.displayName} dùng Đào hồi 1 máu.`,
      ],
    };
  }

  // 3. SÁT
  if (effectiveKey === 'sat') {
    if (state.peacefulFirstRound && state.roundNumber === 1) {
      throw new Error('FIRST_ROUND_SAT_FORBIDDEN');
    }
    // Nếu Võ Thánh chuyển lá trang bị Đỏ thành Sát, kiểm tra giới hạn Sát và tầm đánh
    // trên trạng thái SAU KHI gỡ trang bị đó (tránh dùng tầm/Liên Nỗ của chính lá bị bỏ).
    const stateForStrikeCheck = !found.isHand
      ? updatePlayer(state, action.seatIndex, (p) => ({
          ...p,
          equipments: {
            weapon: p.equipments.weapon?.id === cardId ? null : p.equipments.weapon,
            armor: p.equipments.armor?.id === cardId ? null : p.equipments.armor,
            plusOneHorse:
              p.equipments.plusOneHorse?.id === cardId ? null : p.equipments.plusOneHorse,
            minusOneHorse:
              p.equipments.minusOneHorse?.id === cardId ? null : p.equipments.minusOneHorse,
          },
        }))
      : state;
    const actorForStrikeCheck = getPlayerBySeat(stateForStrikeCheck, action.seatIndex);
    const hasUnlimitedSatEffective =
      Boolean(actorHandler?.unlimitedSat) ||
      actorForStrikeCheck.equipments.weapon?.cardKey === 'gia_cat_lien_no';

    const satUsed = state.turnFlags?.satUsedThisTurn ?? 0;
    if (!hasUnlimitedSatEffective && satUsed >= 1) {
      throw new Error('SAT_LIMIT_REACHED');
    }

    const targets = action.targetSeats ?? [];
    const remainingHandAfter = found.isHand
      ? actor.handCards.length - 1
      : actor.handCards.length;
    const isFangTianLastCard =
      actorForStrikeCheck.equipments.weapon?.cardKey === 'phuong_thien_hoa_kich' &&
      found.isHand &&
      remainingHandAfter === 0;
    const maxTargets = isFangTianLastCard ? 3 : 1;

    if (
      targets.length === 0 ||
      targets.length > maxTargets ||
      new Set(targets).size !== targets.length
    ) {
      throw new Error('INVALID_STRIKE_TARGET_COUNT');
    }
    for (const targetSeat of targets) {
      const targetPlayer = getPlayerBySeat(stateForStrikeCheck, targetSeat);
      if (!canTargetPlayerWithCard(stateForStrikeCheck, targetPlayer, 'sat')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      if (!isInAttackRange(stateForStrikeCheck, action.seatIndex, targetSeat)) {
        throw new Error('TARGET_OUT_OF_RANGE');
      }
    }

    const res = SKILL_RUNTIME.discardAnyCard(state, action.seatIndex, cardId, rng);
    let next = showDiscardAs(res.state, res.removed, 'sat');
    const targetNames = targets.map((s) => getPlayerBySeat(next, s).displayName).join(', ');
    const strikeSkill = getStrikeConversionSkill(actor, res.removed);
    const paoXiaoLogs =
      !strikeSkill && actor.heroId === 'zhang_fei' && satUsed >= 1
        ? [`${actor.displayName} kích hoạt Phao Hống!`]
        : [];
    const strikeLog = strikeSkill
      ? `${actor.displayName} dùng ${strikeSkill} đánh Sát vào ${targetNames}.`
      : `${actor.displayName} đánh Sát vào ${targetNames}.`;
    next = {
      ...next,
      turnFlags: {
        ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
        satUsedThisTurn: satUsed + 1,
        satPlayedOrUsedThisTurn: true,
      },
      actionLog: [
        ...next.actionLog,
        ...paoXiaoLogs,
        strikeLog,
      ],
    };

    const clockwise = getClockwiseAliveSeats(next, action.seatIndex, false);
    const orderedTargets = clockwise.filter((seat) => targets.includes(seat));
    const isMulti = orderedTargets.length > 1;
    next = pushPendingEffect(next, {
      kind: 'QUEUE_STRIKE_TARGETS',
      sourceSeat: action.seatIndex,
      remainingTargets: orderedTargets,
      strikeCards: [res.removed],
      isFangTianMultiTarget: isMulti,
    });
    return stepEngine(next, rng);
  }

  const triggerScrollHook = (s: MasterGameState): MasterGameState => {
    const p = getPlayerBySeat(s, action.seatIndex);
    return getHeroSkillHandler(p.heroId)?.onNormalScrollPlayed?.(s, action.seatIndex, rng, SKILL_RUNTIME) ?? s;
  };

  // 4. CẨM NANG THỜI GIAN
  if (effectiveKey === 'lac_bat_tu_thuc') {
    const targetSeat = action.targetSeats?.[0];
    if (targetSeat === undefined || targetSeat === action.seatIndex) {
      throw new Error('INVALID_DELAYED_TARGET');
    }
    const target = getPlayerBySeat(state, targetSeat);
    if (!target.alive) {
      throw new Error('TARGET_NOT_ALIVE');
    }
    if (!canTargetPlayerWithCard(state, target, 'lac_bat_tu_thuc')) {
      throw new Error('TARGET_IMMUNE_TO_CARD');
    }
    const prevHandCount = actor.handCards.length;
    const removedRes = removeAnyCardFromPlayer(actor, cardId);
    let next = updatePlayer(state, action.seatIndex, () => removedRes.nextPlayer);
    const virtualCard: CardInstance =
      effectiveKey === card.cardKey
        ? removedRes.removed
        : {
            ...removedRes.removed,
            cardKey: 'lac_bat_tu_thuc',
            nameVi: 'Lạc Bất Tư Thục',
            category: 'DELAYED_SCROLL',
            physicalCard: removedRes.removed,
          };
    next = updatePlayer(next, targetSeat, (p) => ({
      ...p,
      delayedScrolls: [...p.delayedScrolls, virtualCard],
    }));
    const isGuoSe = card.cardKey !== 'lac_bat_tu_thuc';
    next = {
      ...next,
      actionLog: [
        ...next.actionLog,
        isGuoSe
          ? `${actor.displayName} dùng Quốc Sắc đặt Lạc Bất Tư Thục lên ${target.displayName}.`
          : `${actor.displayName} đặt Lạc Bất Tư Thục lên ${target.displayName}.`,
      ],
    };
    if (found.isHand) {
      next = notifyHandCardsLost(next, action.seatIndex, prevHandCount, rng);
    } else {
      next = notifyEquipLost(next, action.seatIndex, 1, rng);
    }
    return triggerScrollHook(next);
  }

  if (effectiveKey === 'thiem_dien') {
    const selfPlayer = getPlayerBySeat(state, action.seatIndex);
    const prevHandCount = selfPlayer.handCards.length;
    const { nextPlayer, removed } = removeCardsFromHand(selfPlayer, [cardId]);
    let next = updatePlayer(state, action.seatIndex, () => nextPlayer);
    next = updatePlayer(next, action.seatIndex, (p) => ({
      ...p,
      delayedScrolls: [...p.delayedScrolls, removed[0]!],
    }));
    next = {
      ...next,
      actionLog: [
        ...next.actionLog,
        `${selfPlayer.displayName} đặt Thiểm Điện lên khu phán xét.`,
      ],
    };
    return triggerScrollHook(notifyHandCardsLost(next, action.seatIndex, prevHandCount, rng));
  }

  // 5. CẨM NANG THƯỜNG (kể cả Kỳ Tập -> Quá Hà Sái Cầu)

  if (effectiveKey === 'qua_ha_sai_cau') {
    const targetSeat = action.targetSeats?.[0];
    if (targetSeat === undefined || targetSeat === action.seatIndex) {
      throw new Error('INVALID_DISMANTLE_TARGET');
    }
    const target = getPlayerBySeat(state, targetSeat);
    if (!target.alive || !hasAnyCardInHandOrEquip(target)) {
      throw new Error('TARGET_HAS_NO_CARDS');
    }
    const res = SKILL_RUNTIME.discardAnyCard(state, action.seatIndex, cardId, rng);
    const isQiXi = card.cardKey !== 'qua_ha_sai_cau';
    const withDiscardFace = showDiscardAs(res.state, res.removed, effectiveKey);
    let next = triggerScrollHook({
      ...withDiscardFace,
      actionLog: [
        ...withDiscardFace.actionLog,
        isQiXi
          ? `${actor.displayName} dùng Kỳ Tập đánh Quá Hà Sái Cầu vào ${target.displayName}.`
          : `${actor.displayName} dùng Quá Hà Sái Cầu vào ${target.displayName}.`,
      ],
    });
    const scrollCard: CardInstance =
      effectiveKey === card.cardKey
        ? res.removed
        : {
            ...res.removed,
            cardKey: 'qua_ha_sai_cau',
            nameVi: 'Quá Hà Sái Cầu',
            category: 'NORMAL_SCROLL',
          };
    next = pushPendingEffect(next, {
      kind: 'RESOLVE_SCROLL',
      cancelled: false,
      casterSeat: action.seatIndex,
      targetSeat,
      scrollKey: 'qua_ha_sai_cau',
      scrollCard,
    });
    next = openNullificationWindow(
      next,
      targetSeat,
      action.seatIndex,
      scrollCard.nameVi,
    );
    return stepEngine(next, rng);
  }

  // Các Cẩm nang thường còn lại (chỉ từ tay)
  const res = SKILL_RUNTIME.discardHandCards(state, action.seatIndex, [cardId], rng);
  let next = triggerScrollHook(res.state);
  const usedCard = res.removed[0]!;

  switch (usedCard.cardKey) {
    case 'vo_trung_sinh_huu': {
      next = pushPendingEffect(next, {
        kind: 'RESOLVE_SCROLL',
        cancelled: false,
        casterSeat: action.seatIndex,
        targetSeat: action.seatIndex,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
      });
      next = openNullificationWindow(
        next,
        action.seatIndex,
        action.seatIndex,
        usedCard.nameVi,
      );
      return stepEngine(next, rng);
    }

    case 'thuan_thu_khien_duong': {
      const targetSeat = action.targetSeats?.[0];
      if (
        targetSeat === undefined ||
        !canReachForSnatch(next, action.seatIndex, targetSeat)
      ) {
        throw new Error('SNATCH_TARGET_OUT_OF_RANGE');
      }
      const target = getPlayerBySeat(next, targetSeat);
      if (!canTargetPlayerWithCard(next, target, 'thuan_thu_khien_duong')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      if (!hasAnyCardInHandOrEquip(target)) {
        throw new Error('TARGET_HAS_NO_CARDS');
      }
      next = pushPendingEffect(next, {
        kind: 'RESOLVE_SCROLL',
        cancelled: false,
        casterSeat: action.seatIndex,
        targetSeat,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
      });
      next = openNullificationWindow(
        next,
        targetSeat,
        action.seatIndex,
        usedCard.nameVi,
      );
      return stepEngine(next, rng);
    }

    case 'quyet_dau': {
      const targetSeat = action.targetSeats?.[0];
      if (targetSeat === undefined || targetSeat === action.seatIndex) {
        throw new Error('INVALID_DUEL_TARGET');
      }
      const target = getPlayerBySeat(next, targetSeat);
      if (!target.alive) {
        throw new Error('TARGET_NOT_ALIVE');
      }
      if (!canTargetPlayerWithCard(next, target, 'quyet_dau')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      next = pushPendingEffect(next, {
        kind: 'RESOLVE_SCROLL',
        cancelled: false,
        casterSeat: action.seatIndex,
        targetSeat,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
      });
      next = openNullificationWindow(
        next,
        targetSeat,
        action.seatIndex,
        usedCard.nameVi,
      );
      return stepEngine(next, rng);
    }

    case 'ta_dao_sat_nhan': {
      const attackerSeat = action.targetSeats?.[0];
      const victimSeat = action.secondarySeat;
      if (
        attackerSeat === undefined ||
        victimSeat === undefined ||
        !canUseCollateralMurder(next, action.seatIndex, attackerSeat, victimSeat)
      ) {
        throw new Error('INVALID_COLLATERAL_TARGETS');
      }
      next = pushPendingEffect(next, {
        kind: 'RESOLVE_SCROLL',
        cancelled: false,
        casterSeat: action.seatIndex,
        targetSeat: attackerSeat,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
        secondarySeat: victimSeat,
      });
      next = openNullificationWindow(
        next,
        attackerSeat,
        action.seatIndex,
        usedCard.nameVi,
      );
      return stepEngine(next, rng);
    }

    case 'nam_man_nhap_xam':
    case 'van_tien_te_phat': {
      const targets = getClockwiseAliveSeats(next, action.seatIndex, false);
      next = pushPendingEffect(next, {
        kind: 'QUEUE_AOE_TARGETS',
        casterSeat: action.seatIndex,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
        remainingTargets: targets,
      });
      return stepEngine(next, rng);
    }

    case 'dao_vien_ket_nghia': {
      const targets = getClockwiseAliveSeats(next, action.seatIndex, true);
      next = pushPendingEffect(next, {
        kind: 'QUEUE_AOE_TARGETS',
        casterSeat: action.seatIndex,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
        remainingTargets: targets,
      });
      return stepEngine(next, rng);
    }

    case 'ngu_coc_phong_dang': {
      const targets = getClockwiseAliveSeats(next, action.seatIndex, true);
      const drawn = drawFromPile(next, targets.length, rng);
      next = {
        ...drawn.state,
        harvestPool: drawn.drawn,
      };
      next = pushPendingEffect(next, {
        kind: 'QUEUE_AOE_TARGETS',
        casterSeat: action.seatIndex,
        scrollKey: usedCard.cardKey,
        scrollCard: usedCard,
        remainingTargets: targets,
      });
      return stepEngine(next, rng);
    }

    default:
      throw new Error(`CARD_CANNOT_BE_PLAYED_DIRECTLY:${usedCard.cardKey}`);
  }
}

/** Thực thi một hành động hợp lệ lên trạng thái ván đấu (thuần bất biến). */
export function applyGameAction(
  state: MasterGameState,
  action: GameAction,
  rng: () => number = Math.random,
  options?: { readonly deferNullificationPass?: boolean },
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    throw new Error('MATCH_ALREADY_FINISHED');
  }

  if ((action.type === 'PLAY_CARD' || action.type === 'ACTIVATE_HERO_SKILL' || action.type === 'END_PLAY_PHASE') &&
    state.turnFlags?.drawSecondAvailable && state.turnPhase === 'PLAY' &&
    state.currentTurnSeat === action.seatIndex) {
    state = {
      ...state,
      turnFlags: { ...state.turnFlags, drawSecondAvailable: false, luoYiActive: true },
      actionLog: [...state.actionLog,
        `${getPlayerBySeat(state, action.seatIndex).displayName} kích hoạt Lỏa Y, bắt đầu ra bài với 1 lá đã rút (+1 sát thương Sát/Quyết Đấu).`],
    };
  }

  switch (action.type) {
    case 'SET_AUTO_SKIP_NULLIFICATION': {
      return updatePlayer(state, action.seatIndex, (p) => ({
        ...p,
        autoSkipNullification: action.enabled,
      }));
    }

    case 'PLAY_CARD':
      return handlePlayCard(state, action, rng);

    case 'DRAW_CARDS': {
      const extra = state.turnPhase === 'PLAY' && state.turnFlags?.drawSecondAvailable === true;
      if (!state.manualDraw || (state.turnPhase !== 'DRAW' && !extra) ||
        Boolean(action.extra) !== extra || state.currentTurnSeat !== action.seatIndex ||
        state.interruptStack.length > 0) {
        throw new Error('CANNOT_DRAW_NOW');
      }
      let next = completeTurnDraw(state, rng);
      if (getPlayerBySeat(state, action.seatIndex).heroId === 'xu_chu') {
        next = { ...next, turnFlags: {
          ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
          drawSecondAvailable: !extra && next.turnPhase === 'PLAY' && (next.drawPile.length > 0 || next.discardPile.length > 0),
        } };
      }
      return stepEngine(next, rng);
    }

    case 'END_PLAY_PHASE': {
      assertNoInterrupt(state);
      if (state.turnPhase !== 'PLAY' || action.seatIndex !== state.currentTurnSeat) {
        throw new Error('NOT_IN_PLAY_PHASE');
      }
      return stepEngine({ ...state, turnPhase: 'DISCARD' }, rng);
    }

    case 'DISCARD_CARDS': {
      assertNoInterrupt(state);
      if (
        state.turnPhase !== 'DISCARD' ||
        action.seatIndex !== state.currentTurnSeat
      ) {
        throw new Error('NOT_IN_DISCARD_PHASE');
      }
      const actor = getPlayerBySeat(state, action.seatIndex);
      const limit = Math.max(0, actor.hp);
      const excess = actor.handCards.length - limit;
      if (excess <= 0) {
        return stepEngine({ ...state, turnPhase: 'END' }, rng);
      }
      if (action.cardIds.length !== excess) {
        throw new Error(`MUST_DISCARD_EXACTLY:${excess}`);
      }
      const res = SKILL_RUNTIME.discardHandCards(
        state,
        action.seatIndex,
        action.cardIds,
        rng,
      );
      let next = res.state;
      next = {
        ...next,
        turnPhase: 'END',
        actionLog: [
          ...next.actionLog,
          `${actor.displayName} bỏ ${res.removed.length} lá ở pha Bỏ bài.`,
        ],
      };
      return stepEngine(next, rng);
    }

    case 'RESOLVE_SIMULATED_NULLIFICATION': {
      const top = assertTopFrame(state, 'WAIT_NULLIFICATION');
      if (!top.isSimulatedDelay) {
        throw new Error('NOT_A_SIMULATED_NULLIFICATION_DELAY');
      }
      const popped = popInterrupt(state);
      return stepEngine(popped.state, rng);
    }

    case 'RESPOND_NULLIFICATION': {
      const top = assertTopFrame(state, 'WAIT_NULLIFICATION');
      if (top.isSimulatedDelay) {
        throw new Error('SIMULATED_DELAY_CANNOT_BE_ANSWERED_BY_PLAYER');
      }
      if (!top.eligibleSeats.includes(action.seatIndex)) {
        throw new Error('NOT_ELIGIBLE_FOR_NULLIFICATION');
      }

      if (action.cardId !== null) {
        if (top.passedSeats.includes(action.seatIndex)) {
          throw new Error('NULLIFICATION_ALREADY_PASSED');
        }
        const actor = getPlayerBySeat(state, action.seatIndex);
        const card = actor.handCards.find((c) => c.id === action.cardId);
        if (!card) {
          throw new Error(`CARD_NOT_IN_HAND:${action.cardId}`);
        }
        if (card.cardKey !== 'vo_giai_kha_kich') {
          throw new Error('NOT_A_NULLIFICATION_CARD');
        }
        let next = SKILL_RUNTIME.discardHandCards(
          state,
          action.seatIndex,
          [action.cardId],
          rng,
        ).state;
        const actorAfterDiscard = getPlayerBySeat(next, action.seatIndex);
        const actorHandler = getHeroSkillHandler(actorAfterDiscard.heroId);
        if (actorHandler?.onNormalScrollPlayed) {
          next = actorHandler.onNormalScrollPlayed(
            next,
            action.seatIndex,
            rng,
            SKILL_RUNTIME,
          );
        }
        next = popInterrupt(next).state;
        next = pushPendingEffect(next, {
          kind: 'RESOLVE_NULLIFICATION_COUNTER',
          cancelled: false,
          casterSeat: action.seatIndex,
        });
        next = openNullificationWindow(
          next,
          action.seatIndex,
          action.seatIndex,
          'Vô Giải Khả Kích',
          {
            originalScrollNameVi: top.originalScrollNameVi ?? top.scrollNameVi,
            originalTargetSeat: top.originalTargetSeat ?? top.targetSeat,
            nullifyDepth: (top.nullifyDepth ?? 0) + 1,
          },
        );
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${actor.displayName} đánh Vô Giải Khả Kích!`,
          ],
        };
        return stepEngine(next, rng);
      }

      const nextPassed = top.passedSeats.includes(action.seatIndex)
        ? top.passedSeats
        : [...top.passedSeats, action.seatIndex];
      const allPassed = top.eligibleSeats.every((seat) =>
        nextPassed.includes(seat),
      );
      if (allPassed && !options?.deferNullificationPass) {
        return stepEngine(popInterrupt(state).state, rng);
      }
      return replaceTopInterrupt(state, { ...top, passedSeats: nextPassed });
    }

    case 'RESPOND_TU_HUNG': {
      const top = assertTopFrame(state, 'ASK_TU_HUNG');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_TU_HUNG');
      }
      let next = popInterrupt(state).state;
      const target = getPlayerBySeat(next, top.targetSeat);
      const source = getPlayerBySeat(next, top.sourceSeat);

      if (action.choice === 'DISCARD_HAND' && target.handCards.length > 0) {
        const cardId = action.discardCardId ?? target.handCards[0]!.id;
        next = SKILL_RUNTIME.discardHandCards(
          next,
          top.targetSeat,
          [cardId],
          rng,
        ).state;
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${target.displayName} bỏ 1 lá trên tay trước Từ Hùng Song Cổ Kiếm.`,
          ],
        };
      } else {
        const dealt = dealCardsToSeat(next, top.sourceSeat, 1, rng);
        next = {
          ...dealt.state,
          actionLog: [
            ...dealt.state.actionLog,
            `${source.displayName} rút 1 lá nhờ Từ Hùng Song Cổ Kiếm.`,
          ],
        };
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_DODGE': {
      const top = assertTopFrame(state, 'WAIT_DODGE');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_DODGE');
      }
      const target = getPlayerBySeat(state, top.targetSeat);

      let next = state;
      let dodgedIncrement = 0;

      if (action.useHuJia) {
        if (
          target.heroId !== 'cao_cao' ||
          target.identity !== 'LORD' ||
          top.huJiaTriedThisStrike
        ) {
          throw new Error('HU_JIA_NOT_AVAILABLE');
        }
        const weiAllies = getClockwiseAliveSeats(next, top.targetSeat, false).filter(
          (seat) => {
            const p = getPlayerBySeat(next, seat);
            return p.heroId !== null && SKILL_RUNTIME.getHeroFaction(p.heroId) === 'WEI';
          },
        );
        if (weiAllies.length === 0) {
          throw new Error('NO_WEI_ALLIES_FOR_HU_JIA');
        }
        const frameSeq = {
          ...next,
          nextFrameSeq: (next.nextFrameSeq ?? 0) + 1,
          actionLog: [...next.actionLog, `${target.displayName} phát động Hộ Giá!`],
        };
        return pushInterrupt(frameSeq, {
          id: `hujia_${frameSeq.nextFrameSeq}`,
          kind: 'WAIT_HU_JIA',
          targetSeat: top.targetSeat,
          lordSeat: top.targetSeat,
          responderSeat: weiAllies[0]!,
          askOrder: weiAllies,
          askCursor: 0,
          contextKind: 'DODGE',
        });
      }

      if (action.useBagua) {
        if (!top.allowBagua || top.baguaTriedThisStrike) {
          throw new Error('BAGUA_NOT_AVAILABLE');
        }
        next = popInterrupt(next).state;
        next = startJudgment(next, top.targetSeat, 'BAT_QUAI_TRAN', rng, {
          savedDodgeFrame: top,
        });
        return stepEngine(next, rng);
      } else if (action.cardId !== null) {
        const card = target.handCards.find((c) => c.id === action.cardId);
        if (!card) {
          throw new Error(`CARD_NOT_IN_HAND:${action.cardId}`);
        }
        if (!canUseCardAs(next, target, card, 'thiem', false)) {
          throw new Error('NOT_A_THIEM_CARD');
        }
        const res = SKILL_RUNTIME.discardHandCards(
          next,
          top.targetSeat,
          [action.cardId],
          rng,
        );
        const dodgeSkill = getDodgeConversionSkill(target, card);
        next = showDiscardAs(res.state, card, 'thiem');
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            dodgeSkill
              ? `${target.displayName} dùng ${dodgeSkill} đánh Thiểm.`
              : `${target.displayName} đánh Thiểm.`,
          ],
        };
        dodgedIncrement = 1;
      } else {
        // Không né -> Sát trúng mục tiêu!
        next = popInterrupt(next).state;
        return stepEngine(next, rng);
      }

      const nextDodged = top.dodgedSoFar + dodgedIncrement;
      if (nextDodged < top.requiredCount) {
        if (top.requiredCount >= 2) {
          const source = getPlayerBySeat(next, top.sourceSeat);
          next = {
            ...next,
            actionLog: [
              ...next.actionLog,
              `${source.displayName} phát động Vô Song, mục tiêu cần thêm ${top.requiredCount - nextDodged} lá Thiểm nữa!`,
            ],
          };
        }
        return replaceTopInterrupt(next, {
          ...top,
          dodgedSoFar: nextDodged,
          baguaTriedThisStrike: false,
          huJiaTriedThisStrike: false,
        });
      }

      // Đã né đủ -> hoàn tất né Sát và kiểm tra Quán Thạch Phủ / Thanh Long Đao
      next = popInterrupt(next).state;
      return stepEngine(
        completeStrikeDodged(
          next,
          top.sourceSeat,
          top.targetSeat,
          top.isCollateralStrike,
          top.isFangTianMultiTarget,
        ),
        rng,
      );
    }

    case 'RESPOND_QUAN_THACH_PHU': {
      const top = assertTopFrame(state, 'ASK_QUAN_THACH_PHU');
      if (action.seatIndex !== top.sourceSeat) {
        throw new Error('WRONG_ACTOR_FOR_QUAN_THACH_PHU');
      }
      let next = popInterrupt(state).state;
      if (!action.activate) {
        return stepEngine(next, rng);
      }
      if (
        !action.discardCardIds ||
        action.discardCardIds.length !== 2 ||
        action.discardCardIds[0] === action.discardCardIds[1]
      ) {
        throw new Error('QUAN_THACH_PHU_REQUIRES_2_CARDS');
      }
      const source = getPlayerBySeat(next, top.sourceSeat);
      const weaponId = source.equipments.weapon?.id;
      if (
        weaponId &&
        (action.discardCardIds[0] === weaponId ||
          action.discardCardIds[1] === weaponId)
      ) {
        throw new Error('CANNOT_DISCARD_QUAN_THACH_PHU_SELF');
      }
      next = SKILL_RUNTIME.discardAnyCard(
        next,
        top.sourceSeat,
        action.discardCardIds[0],
        rng,
      ).state;
      next = SKILL_RUNTIME.discardAnyCard(
        next,
        top.sourceSeat,
        action.discardCardIds[1],
        rng,
      ).state;
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${source.displayName} bỏ 2 lá kích hoạt Quán Thạch Phủ ép Sát trúng đích!`,
        ],
      };
      next = resolveStrikeHit(next, top.sourceSeat, top.targetSeat, top.strikeCards);
      return stepEngine(next, rng);
    }

    case 'RESPOND_THANH_LONG': {
      const top = assertTopFrame(state, 'ASK_THANH_LONG');
      if (action.seatIndex !== top.sourceSeat) {
        throw new Error('WRONG_ACTOR_FOR_THANH_LONG');
      }
      let next = popInterrupt(state).state;
      if (!action.cardIds || action.cardIds.length === 0) {
        return stepEngine(next, rng);
      }
      const source = getPlayerBySeat(next, top.sourceSeat);
      const target = getPlayerBySeat(next, top.targetSeat);
      if (!target.alive || !canTargetPlayerWithCard(next, target, 'sat')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      const consumed = validateAndConsumeStrikeCards(
        next,
        top.sourceSeat,
        action.cardIds,
        false,
        rng,
      );
      next = consumed.state;
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${source.displayName} kích hoạt Thanh Long Yển Nguyệt Đao truy kích Sát!`,
        ],
      };
      next = beginStrikeAgainstTarget(
        next,
        top.sourceSeat,
        top.targetSeat,
        consumed.usedCards,
        false,
        false,
      );
      return stepEngine(next, rng);
    }

    case 'RESPOND_HAN_BANG_KIEM': {
      const top = assertTopFrame(state, 'ASK_HAN_BANG_KIEM');
      if (action.seatIndex !== top.sourceSeat) {
        throw new Error('WRONG_ACTOR_FOR_HAN_BANG_KIEM');
      }
      let next = popInterrupt(state).state;
      const remainingDiscards = top.remainingDiscards ?? 2;
      if (!action.activate) {
        if (remainingDiscards < 2) {
          // Đã chọn hủy lá thứ 1 xong và dừng lại
          return stepEngine(next, rng);
        }
        const source = getPlayerBySeat(next, top.sourceSeat);
        const luoYiBonus =
          source.heroId === 'xu_chu' &&
          top.sourceSeat === next.currentTurnSeat &&
          next.turnFlags?.luoYiActive
            ? 1
            : 0;
        next = applyDamage(
          next,
          top.sourceSeat,
          top.targetSeat,
          1 + luoYiBonus,
          luoYiBonus > 0 ? 'Sát (Lỏa Y +1)' : 'Sát',
          top.sourceCards,
        );
        next = maybeOfferKyLanCung(next, top.sourceSeat, top.targetSeat);
        return stepEngine(next, rng);
      }

      const picks = action.picks ?? [];
      if (picks.length === 0 || picks.length > remainingDiscards) {
        throw new Error('HAN_BANG_KIEM_MUST_PICK_1_OR_2_CARDS');
      }
      if (picks.some((p) => (p.zone as string) === 'DELAYED')) {
        throw new Error('DELAYED_ZONE_NOT_ALLOWED');
      }

      let discardedCount = 0;
      for (const pick of picks) {
        const targetNow = getPlayerBySeat(next, top.targetSeat);
        const prevHandCount = targetNow.handCards.length;
        const res = removeCardFromTargetZone(targetNow, pick.zone, rng, pick.handIndex);
        next = updatePlayer(next, top.targetSeat, () => res.nextPlayer);
        next = appendToDiscardPile(next, [res.removed]);
        discardedCount += 1;
        if (pick.zone === 'HAND') {
          next = notifyHandCardsLost(next, top.targetSeat, prevHandCount, rng);
        } else {
          next = notifyEquipLost(next, top.targetSeat, 1, rng);
        }
      }
      const targetAfter = getPlayerBySeat(next, top.targetSeat);
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${getPlayerBySeat(next, top.sourceSeat).displayName} dùng Hàn Băng Kiếm hủy ${discardedCount} lá của ${targetAfter.displayName} thay cho sát thương.`,
        ],
      };
      const leftToDiscard = remainingDiscards - discardedCount;
      if (leftToDiscard > 0 && targetAfter.alive && hasAnyCardInHandOrEquip(targetAfter)) {
        const frameSeq = { ...next, nextFrameSeq: (next.nextFrameSeq ?? 0) + 1 };
        next = pushInterrupt(frameSeq, {
          ...top,
          id: `hanbang_${frameSeq.nextFrameSeq}`,
          remainingDiscards: leftToDiscard,
        });
        return next;
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_KY_LAN_CUNG': {
      const top = assertTopFrame(state, 'ASK_KY_LAN_CUNG');
      if (action.seatIndex !== top.sourceSeat) {
        throw new Error('WRONG_ACTOR_FOR_KY_LAN_CUNG');
      }
      let next = popInterrupt(state).state;
      if (action.horseZone !== null) {
        const target = getPlayerBySeat(next, top.targetSeat);
        const res = removeCardFromTargetZone(target, action.horseZone, rng);
        next = updatePlayer(next, top.targetSeat, () => res.nextPlayer);
        next = appendToDiscardPile(next, [res.removed]);
        next = notifyEquipLost(next, top.targetSeat, 1, rng);
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_DUEL_SAT': {
      const top = assertTopFrame(state, 'WAIT_DUEL_SAT');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_DUEL');
      }
      if (action.useJiJiang) {
        const actor = getPlayerBySeat(state, top.targetSeat);
        if (
          actor.heroId !== 'liu_bei' ||
          actor.identity !== 'LORD' ||
          top.jiJiangTriedThisFrame
        ) {
          throw new Error('JI_JIANG_NOT_AVAILABLE');
        }
        const shuAllies = getClockwiseAliveSeats(state, top.targetSeat, false).filter(
          (seat) => {
            const p = getPlayerBySeat(state, seat);
            return p.heroId !== null && SKILL_RUNTIME.getHeroFaction(p.heroId) === 'SHU';
          },
        );
        if (shuAllies.length === 0) {
          throw new Error('NO_SHU_ALLIES_FOR_JI_JIANG');
        }
        const frameSeq = {
          ...state,
          nextFrameSeq: (state.nextFrameSeq ?? 0) + 1,
          actionLog: [...state.actionLog, `${actor.displayName} phát động Kích Tướng!`],
        };
        return pushInterrupt(frameSeq, {
          id: `jijiang_${frameSeq.nextFrameSeq}`,
          kind: 'WAIT_JI_JIANG',
          targetSeat: top.targetSeat,
          lordSeat: top.targetSeat,
          responderSeat: shuAllies[0]!,
          askOrder: shuAllies,
          askCursor: 0,
          contextKind: 'DUEL',
        });
      }
      if (action.cardIds === null || action.cardIds.length === 0) {
        const next = popInterrupt(state).state;
        const winner = getPlayerBySeat(next, top.otherSeat);
        const luoYiBonus =
          winner.heroId === 'xu_chu' &&
          top.otherSeat === next.currentTurnSeat &&
          next.turnFlags?.luoYiActive
            ? 1
            : 0;
        return stepEngine(
          applyDamage(
            next,
            top.otherSeat,
            top.targetSeat,
            1 + luoYiBonus,
            luoYiBonus > 0 ? 'Quyết Đấu (Lỏa Y +1)' : 'Quyết Đấu',
            top.scrollCard ? [top.scrollCard] : [],
          ),
          rng,
        );
      }

      const consumed = validateAndConsumeStrikeCards(
        state,
        action.seatIndex,
        action.cardIds,
        true,
        rng,
      );
      let next = consumed.state;
      if (action.seatIndex === next.currentTurnSeat && next.turnPhase === 'PLAY') {
        const prevFlags = next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false };
        next = {
          ...next,
          turnFlags: { ...prevFlags, satPlayedOrUsedThisTurn: true },
        };
      }
      const nextPlayed = top.playedSoFar + 1;
      if (nextPlayed < top.requiredCount) {
        if (top.requiredCount >= 2) {
          const challenger = getPlayerBySeat(next, top.otherSeat);
          next = {
            ...next,
            actionLog: [
              ...next.actionLog,
              `${challenger.displayName} phát động Vô Song, cần thêm ${top.requiredCount - nextPlayed} lá Sát nữa!`,
            ],
          };
        }
        return replaceTopInterrupt(next, {
          ...top,
          playedSoFar: nextPlayed,
          jiJiangTriedThisFrame: false,
        });
      }
      const actor = getPlayerBySeat(next, action.seatIndex);
      const actorHandler = getHeroSkillHandler(actor.heroId);
      const nextRequired =
        actorHandler?.duelSatRequiredCount?.(next, actor) ?? 1;
      if (nextRequired >= 2) {
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${actor.displayName} phát động Vô Song trong Quyết Đấu (cần ${nextRequired} lá Sát để đáp trả)!`,
          ],
        };
      }
      return replaceTopInterrupt(next, {
        ...top,
        targetSeat: top.otherSeat,
        otherSeat: top.targetSeat,
        requiredCount: nextRequired,
        playedSoFar: 0,
        jiJiangTriedThisFrame: false,
      });
    }

    case 'RESPOND_COLLATERAL_SAT': {
      const top = assertTopFrame(state, 'WAIT_COLLATERAL_SAT');
      if (action.seatIndex !== top.attackerSeat) {
        throw new Error('WRONG_ACTOR_FOR_COLLATERAL');
      }
      if (action.useJiJiang) {
        const attacker = getPlayerBySeat(state, top.attackerSeat);
        if (
          attacker.heroId !== 'liu_bei' ||
          attacker.identity !== 'LORD' ||
          top.jiJiangTriedThisFrame
        ) {
          throw new Error('JI_JIANG_NOT_AVAILABLE');
        }
        const victim = getPlayerBySeat(state, top.targetSeat);
        if (!victim.alive || !canTargetPlayerWithCard(state, victim, 'sat')) {
          throw new Error('TARGET_IMMUNE_TO_CARD');
        }
        const shuAllies = getClockwiseAliveSeats(state, top.attackerSeat, false).filter(
          (seat) => {
            const p = getPlayerBySeat(state, seat);
            return p.heroId !== null && SKILL_RUNTIME.getHeroFaction(p.heroId) === 'SHU';
          },
        );
        if (shuAllies.length === 0) {
          throw new Error('NO_SHU_ALLIES_FOR_JI_JIANG');
        }
        const frameSeq = {
          ...state,
          nextFrameSeq: (state.nextFrameSeq ?? 0) + 1,
          actionLog: [...state.actionLog, `${attacker.displayName} phát động Kích Tướng!`],
        };
        return pushInterrupt(frameSeq, {
          id: `jijiang_${frameSeq.nextFrameSeq}`,
          kind: 'WAIT_JI_JIANG',
          targetSeat: top.attackerSeat,
          lordSeat: top.attackerSeat,
          responderSeat: shuAllies[0]!,
          askOrder: shuAllies,
          askCursor: 0,
          contextKind: 'COLLATERAL',
          strikeTargetSeat: top.targetSeat,
        });
      }
      let next = popInterrupt(state).state;
      const attacker = getPlayerBySeat(next, top.attackerSeat);

      if (action.cardIds === null || action.cardIds.length === 0) {
        const weapon = attacker.equipments.weapon;
        if (weapon) {
          next = updatePlayer(next, top.attackerSeat, (p) => ({
            ...p,
            equipments: { ...p.equipments, weapon: null },
          }));
          next = notifyEquipLost(next, top.attackerSeat, 1, rng);
          const caster = getPlayerBySeat(next, top.casterSeat);
          if (caster.alive) {
            next = updatePlayer(next, top.casterSeat, (p) => ({
              ...p,
              handCards: [...p.handCards, weapon],
            }));
          } else {
            next = appendToDiscardPile(next, [weapon]);
          }
        }
        return stepEngine(next, rng);
      }

      const victim = getPlayerBySeat(next, top.targetSeat);
      if (!victim.alive || !canTargetPlayerWithCard(next, victim, 'sat')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      const consumed = validateAndConsumeStrikeCards(
        next,
        top.attackerSeat,
        action.cardIds,
        true,
        rng,
      );
      next = consumed.state;
      next = beginStrikeAgainstTarget(
        next,
        top.attackerSeat,
        top.targetSeat,
        consumed.usedCards,
        true,
        false,
      );
      return stepEngine(next, rng);
    }

    case 'RESPOND_AOE_SAT': {
      const top = assertTopFrame(state, 'WAIT_AOE_SAT');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_AOE_SAT');
      }
      if (action.useJiJiang) {
        const actor = getPlayerBySeat(state, top.targetSeat);
        if (
          actor.heroId !== 'liu_bei' ||
          actor.identity !== 'LORD' ||
          top.jiJiangTriedThisFrame
        ) {
          throw new Error('JI_JIANG_NOT_AVAILABLE');
        }
        const shuAllies = getClockwiseAliveSeats(state, top.targetSeat, false).filter(
          (seat) => {
            const p = getPlayerBySeat(state, seat);
            return p.heroId !== null && SKILL_RUNTIME.getHeroFaction(p.heroId) === 'SHU';
          },
        );
        if (shuAllies.length === 0) {
          throw new Error('NO_SHU_ALLIES_FOR_JI_JIANG');
        }
        const frameSeq = {
          ...state,
          nextFrameSeq: (state.nextFrameSeq ?? 0) + 1,
          actionLog: [...state.actionLog, `${actor.displayName} phát động Kích Tướng!`],
        };
        return pushInterrupt(frameSeq, {
          id: `jijiang_${frameSeq.nextFrameSeq}`,
          kind: 'WAIT_JI_JIANG',
          targetSeat: top.targetSeat,
          lordSeat: top.targetSeat,
          responderSeat: shuAllies[0]!,
          askOrder: shuAllies,
          askCursor: 0,
          contextKind: 'AOE_SAT',
        });
      }
      if (action.cardIds === null || action.cardIds.length === 0) {
        const next = popInterrupt(state).state;
        return stepEngine(
          applyDamage(
            next,
            top.sourceSeat,
            top.targetSeat,
            1,
            'Nam Man Nhập Xâm',
            top.scrollCard ? [top.scrollCard] : [],
          ),
          rng,
        );
      }
      const consumed = validateAndConsumeStrikeCards(
        state,
        action.seatIndex,
        action.cardIds,
        true,
        rng,
      );
      const next = popInterrupt(consumed.state).state;
      return stepEngine(next, rng);
    }

    case 'RESPOND_AOE_DODGE': {
      const top = assertTopFrame(state, 'WAIT_AOE_DODGE');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_AOE_DODGE');
      }
      const target = getPlayerBySeat(state, top.targetSeat);
      let next = state;

      if (action.useHuJia) {
        if (
          target.heroId !== 'cao_cao' ||
          target.identity !== 'LORD' ||
          top.huJiaTriedThisFrame
        ) {
          throw new Error('HU_JIA_NOT_AVAILABLE');
        }
        const weiAllies = getClockwiseAliveSeats(next, top.targetSeat, false).filter(
          (seat) => {
            const p = getPlayerBySeat(next, seat);
            return p.heroId !== null && SKILL_RUNTIME.getHeroFaction(p.heroId) === 'WEI';
          },
        );
        if (weiAllies.length === 0) {
          throw new Error('NO_WEI_ALLIES_FOR_HU_JIA');
        }
        const frameSeq = {
          ...next,
          nextFrameSeq: (next.nextFrameSeq ?? 0) + 1,
          actionLog: [...next.actionLog, `${target.displayName} phát động Hộ Giá!`],
        };
        return pushInterrupt(frameSeq, {
          id: `hujia_${frameSeq.nextFrameSeq}`,
          kind: 'WAIT_HU_JIA',
          targetSeat: top.targetSeat,
          lordSeat: top.targetSeat,
          responderSeat: weiAllies[0]!,
          askOrder: weiAllies,
          askCursor: 0,
          contextKind: 'AOE_DODGE',
        });
      }

      if (action.useBagua) {
        if (!top.allowBagua || top.baguaTriedThisFrame) {
          throw new Error('BAGUA_NOT_AVAILABLE');
        }
        next = popInterrupt(next).state;
        next = startJudgment(next, top.targetSeat, 'BAT_QUAI_TRAN', rng, {
          savedDodgeFrame: top,
        });
        return stepEngine(next, rng);
      }

      if (action.cardId !== null) {
        const card = target.handCards.find((c) => c.id === action.cardId);
        if (!card) {
          throw new Error(`CARD_NOT_IN_HAND:${action.cardId}`);
        }
        if (!canUseCardAs(next, target, card, 'thiem', false)) {
          throw new Error('NOT_A_THIEM_CARD');
        }
        const res = SKILL_RUNTIME.discardHandCards(
          next,
          top.targetSeat,
          [action.cardId],
          rng,
        );
        const dodgeSkill = getDodgeConversionSkill(target, card);
        next = showDiscardAs(res.state, card, 'thiem');
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            dodgeSkill
              ? `${target.displayName} dùng ${dodgeSkill} đánh Thiểm.`
              : `${target.displayName} đánh Thiểm.`,
          ],
        };
        next = popInterrupt(next).state;
        return stepEngine(next, rng);
      }

      next = popInterrupt(next).state;
      return stepEngine(
        applyDamage(
          next,
          top.sourceSeat,
          top.targetSeat,
          1,
          'Vạn Tiễn Tề Phát',
          top.scrollCard ? [top.scrollCard] : [],
        ),
        rng,
      );
    }

    case 'RESPOND_HARVEST_PICK': {
      const top = assertTopFrame(state, 'WAIT_HARVEST_PICK');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_HARVEST');
      }
      const pool = [...(state.harvestPool ?? [])];
      const idx = pool.findIndex((c) => c.id === action.cardId);
      if (idx === -1) {
        throw new Error('HARVEST_CARD_NOT_FOUND');
      }
      const [picked] = pool.splice(idx, 1);
      if (!picked) {
        throw new Error('HARVEST_CARD_NOT_FOUND');
      }
      let next = updatePlayer(state, action.seatIndex, (p) => ({
        ...p,
        handCards: [...p.handCards, picked],
      }));
      next = { ...next, harvestPool: pool };
      next = popInterrupt(next).state;
      return stepEngine(next, rng);
    }

    case 'CONFIRM_STEAL_HAND': {
      const top = assertTopFrame(state, 'PICK_TARGET_CARD');
      if (top.handPick !== 'PREPARE' || action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_STEAL_PREPARE');
      }
      const ids = getPlayerBySeat(state, top.targetSeat).handCards.map(card => card.id);
      const order = action.orderedCardIds ?? ids;
      const owned = new Set(ids);
      if (order.length !== ids.length || new Set(order).size !== ids.length ||
          order.some(id => !owned.has(id))) {
        throw new Error('INVALID_STEAL_HAND_ORDER');
      }
      return pushInterrupt(popInterrupt(state).state, {
        ...top, id: `${top.id}_select`, handPick: 'SELECT', handOrder: [...order],
      });
    }

    case 'RESPOND_PICK_TARGET_CARD': {
      const top = assertTopFrame(state, 'PICK_TARGET_CARD');
      if (action.seatIndex !== top.sourceSeat || top.handPick === 'PREPARE') {
        throw new Error('WRONG_ACTOR_FOR_PICK_TARGET');
      }
      if (action.zone === 'DELAYED') {
        throw new Error('DELAYED_ZONE_NOT_ALLOWED');
      }
      const target = getPlayerBySeat(state, top.targetSeat);
      const prevHandCount = target.handCards.length;
      if (!top.handPick && top.mode === 'STEAL' && action.zone === 'HAND' && prevHandCount > 0) {
        return pushInterrupt(popInterrupt(state).state, {
          ...top, id: `${top.id}_prepare`, handPick: 'PREPARE',
        });
      }
      let handIndex = action.handIndex;
      if (top.handPick === 'SELECT') {
        const cardId = top.handOrder?.[handIndex ?? -1];
        handIndex = target.handCards.findIndex(card => card.id === cardId);
        if (action.zone !== 'HAND' || handIndex < 0) throw new Error('INVALID_STEAL_HAND_SLOT');
      }
      const res = removeCardFromTargetZone(
        target,
        action.zone,
        rng,
        handIndex,
        action.delayedCardId,
      );
      let next = updatePlayer(state, top.targetSeat, () => res.nextPlayer);
      if (top.mode === 'STEAL') {
        const restored = restorePhysicalCard(res.removed);
        next = updatePlayer(next, top.sourceSeat, (p) => ({
          ...p,
          handCards: [...p.handCards, restored],
        }));
        const taker = getPlayerBySeat(next, top.sourceSeat);
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            top.handPick === 'SELECT'
              ? `${taker.displayName} nhận 1 lá úp từ ${target.displayName}.`
              : `${taker.displayName} lấy trang bị ${restored.nameVi} từ ${target.displayName}.`,
          ],
        };
      } else {
        next = appendToDiscardPile(next, [res.removed]);
        const caster = getPlayerBySeat(next, top.sourceSeat);
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            action.zone === 'HAND'
              ? `${caster.displayName} hủy 1 lá bài trên tay của ${target.displayName} (${res.removed.nameVi}).`
              : `${caster.displayName} hủy trang bị ${res.removed.nameVi} của ${target.displayName}.`,
          ],
        };
      }
      next = popInterrupt(next).state;
      if (action.zone === 'HAND') {
        next = notifyHandCardsLost(next, top.targetSeat, prevHandCount, rng);
      } else {
        next = notifyEquipLost(next, top.targetSeat, 1, rng);
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_PEACH_RESCUE': {
      const top = assertTopFrame(state, 'WAIT_PEACH_RESCUE');
      if (action.seatIndex !== top.responderSeat) {
        throw new Error('WRONG_RESPONDER_FOR_PEACH');
      }
      const target = getPlayerBySeat(state, top.targetSeat);
      let next = state;

      if (action.cardId !== null) {
        const responder = getPlayerBySeat(next, action.seatIndex);
        const found = findCardOnPlayer(responder, action.cardId);
        if (!found) {
          throw new Error(`CARD_NOT_OWNED:${action.cardId}`);
        }
        const inTurn = action.seatIndex === next.currentTurnSeat;
        if (!canUseCardAs(next, responder, found.card, 'dao', inTurn)) {
          throw new Error('NOT_A_DAO_CARD');
        }
        if (!found.isHand && responder.heroId !== 'hua_tuo') {
          throw new Error('CARD_NOT_IN_HAND');
        }
        next = SKILL_RUNTIME.discardAnyCard(
          next,
          action.seatIndex,
          action.cardId,
          rng,
        ).state;

        next = showDiscardAs(next, found.card, 'dao');

        const targetHandler = getHeroSkillHandler(target.heroId);
        const rescueBonus =
          targetHandler?.onPeachRescueBonus?.(
            next,
            target,
            responder,
            SKILL_RUNTIME,
          ) ?? 0;
        const healedHp = Math.min(target.maxHp, target.hp + 1 + rescueBonus);
        next = updatePlayer(next, top.targetSeat, (p) => ({
          ...p,
          hp: healedHp,
        }));
        const isCapCuu =
          found.card.cardKey !== 'dao' &&
          responder.heroId === 'hua_tuo' &&
          !inTurn;
        const rescueLogs: string[] = [];
        if (rescueBonus > 0) {
          rescueLogs.push(
            `${target.displayName} kích hoạt Cứu Viện, hồi thêm ${rescueBonus} máu.`,
          );
        }
        rescueLogs.push(
          isCapCuu
            ? `${responder.displayName} dùng Cấp Cứu hóa Đào cứu ${target.displayName}${rescueBonus > 0 ? ' (Cứu Viện +1)' : ''} (hiện còn ${healedHp} máu).`
            : `${responder.displayName} dùng Đào cứu ${target.displayName}${rescueBonus > 0 ? ' (Cứu Viện +1)' : ''} (hiện còn ${healedHp} máu).`,
        );
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            ...rescueLogs,
          ],
        };

        if (healedHp >= 1) {
          next = popInterrupt(next).state;
          return stepEngine(next, rng);
        }
        return next;
      }

      const nextCursor = top.askCursor + 1;
      if (nextCursor >= top.askOrder.length) {
        next = popInterrupt(next).state;
        next = handlePlayerDeath(next, top.targetSeat, top.sourceSeat, rng);
        return stepEngine(next, rng);
      }

      const nextResponder = top.askOrder[nextCursor];
      if (nextResponder === undefined) {
        next = popInterrupt(next).state;
        next = handlePlayerDeath(next, top.targetSeat, top.sourceSeat, rng);
        return stepEngine(next, rng);
      }

      return replaceTopInterrupt(next, {
        ...top,
        askCursor: nextCursor,
        responderSeat: nextResponder,
      });
    }

    case 'ACTIVATE_HERO_SKILL': {
      assertNoInterrupt(state);
      if (state.turnPhase !== 'PLAY' || action.seatIndex !== state.currentTurnSeat) {
        throw new Error('NOT_IN_PLAY_PHASE');
      }
      const actor = getPlayerBySeat(state, action.seatIndex);
      if (!actor.alive) {
        throw new Error('DEAD_PLAYER_CANNOT_ACT');
      }
      const handler = getHeroSkillHandler(actor.heroId);
      if (!handler?.executePlaySkill) {
        throw new Error(`HERO_HAS_NO_PLAY_SKILL:${actor.heroId ?? 'NONE'}`);
      }
      return stepEngine(
        handler.executePlaySkill(state, action, rng, SKILL_RUNTIME),
        rng,
      );
    }

    case 'RESPOND_GUAN_XING': {
      const top = assertTopFrame(state, 'WAIT_GUAN_XING');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_GUAN_XING');
      }
      const expectedIds = new Set(top.cards.map((c) => c.id));
      const combinedIds = [...action.topCardIds, ...action.bottomCardIds];
      if (
        combinedIds.length !== top.cards.length ||
        new Set(combinedIds).size !== top.cards.length ||
        combinedIds.some((id) => !expectedIds.has(id))
      ) {
        throw new Error('INVALID_GUAN_XING_CARD_IDS');
      }
      const byId = new Map(top.cards.map((c) => [c.id, c]));
      const topCards = action.topCardIds.map((id) => byId.get(id)!);
      const bottomCards = action.bottomCardIds.map((id) => byId.get(id)!);
      let next = popInterrupt(state).state;
      next = {
        ...next,
        drawPile: [...topCards, ...next.drawPile, ...bottomCards],
        actionLog: [
          ...next.actionLog,
          `${getPlayerBySeat(next, top.targetSeat).displayName} hoàn tất Quan Tinh (${topCards.length} trên đầu, ${bottomCards.length} xuống đáy).`,
        ],
      };
      return stepEngine(next, rng);
    }

    case 'RESPOND_LUO_SHEN': {
      const top = assertTopFrame(state, 'ASK_LUO_SHEN');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_LUO_SHEN');
      }
      let next = popInterrupt(state).state;
      if (!action.activate) {
        return stepEngine(next, rng);
      }
      const owner = getPlayerBySeat(next, top.targetSeat);
      next = {
        ...next,
        actionLog: [...next.actionLog, `${owner.displayName} phát động Lạc Thần!`],
      };
      next = startJudgment(next, top.targetSeat, 'LUO_SHEN', rng);
      return stepEngine(next, rng);
    }

    case 'RESPOND_TU_XI': {
      const top = assertTopFrame(state, 'WAIT_TU_XI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_TU_XI');
      }
      const targets = action.targetSeats;
      if (
        targets.length > 2 ||
        new Set(targets).size !== targets.length ||
        targets.some((s) => s === top.targetSeat)
      ) {
        throw new Error('INVALID_TU_XI_TARGETS');
      }
      let next = popInterrupt(state).state;
      if (targets.length === 0) {
        if (next.manualDraw) return stepEngine(next, rng);
        const curPlayer = getPlayerBySeat(next, top.targetSeat);
        const dealt = dealCardsToSeat(next, top.targetSeat, 2, rng);
        const skipPlay = dealt.state.turnFlags?.skipPlayPhase ?? false;
        return stepEngine(
          {
            ...dealt.state,
            turnPhase: skipPlay ? 'DISCARD' : 'PLAY',
            actionLog: [
              ...dealt.state.actionLog,
              `${curPlayer.displayName} bỏ qua Đột Tập, rút ${dealt.dealt.length} lá.`,
            ],
          },
          rng,
        );
      }

      for (const tSeat of targets) {
        const target = getPlayerBySeat(next, tSeat);
        if (!target.alive || target.handCards.length === 0) {
          throw new Error(`TU_XI_TARGET_HAS_NO_HAND:${tSeat}`);
        }
      }
      const actor = getPlayerBySeat(next, top.targetSeat);
      const targetNames = targets
        .map((s) => getPlayerBySeat(next, s).displayName)
        .join(', ');
      next = {
        ...next,
        turnPhase: next.turnFlags?.skipPlayPhase ? 'DISCARD' : 'PLAY',
        actionLog: [
          ...next.actionLog,
          `${actor.displayName} phát động Đột Tập lên ${targetNames}.`,
        ],
      };
      for (const targetSeat of [...targets].reverse()) {
        const { state: queued, id } = SKILL_RUNTIME.nextFrameId(next, 'tu_xi_take');
        next = pushInterrupt(queued, {
          id, kind: 'PICK_TARGET_CARD', mode: 'STEAL', handPick: 'PREPARE',
          targetSeat, sourceSeat: top.targetSeat, allowDelayed: false,
        });
      }
      return next;
    }

    case 'RESPOND_LUO_YI': {
      const top = assertTopFrame(state, 'ASK_LUO_YI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_LUO_YI');
      }
      let next = popInterrupt(state).state;
      const drawCount = action.activate ? 1 : 2;
      const dealt = dealCardsToSeat(next, top.targetSeat, drawCount, rng);
      const skipPlay = dealt.state.turnFlags?.skipPlayPhase ?? false;
      next = {
        ...dealt.state,
        turnPhase: skipPlay ? 'DISCARD' : 'PLAY',
        turnFlags: {
          ...(dealt.state.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
          luoYiActive: action.activate,
        },
        actionLog: [
          ...dealt.state.actionLog,
          action.activate
            ? `${getPlayerBySeat(dealt.state, top.targetSeat).displayName} kích hoạt Lỏa Y, rút 1 lá (+1 sát thương Sát/Quyết Đấu).`
            : `${getPlayerBySeat(dealt.state, top.targetSeat).displayName} rút ${dealt.dealt.length} lá.`,
        ],
      };
      return stepEngine(next, rng);
    }

    case 'RESPOND_KE_JI': {
      const top = assertTopFrame(state, 'ASK_KE_JI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_KE_JI');
      }
      let next = popInterrupt(state).state;
      if (action.activate) {
        next = {
          ...next,
          turnPhase: 'END',
          actionLog: [
            ...next.actionLog,
            `${getPlayerBySeat(next, top.targetSeat).displayName} kích hoạt Khắc Kỷ, bỏ qua pha Bỏ bài.`,
          ],
        };
        return stepEngine(next, rng);
      }
      return next;
    }

    case 'RESPOND_TIE_QI': {
      const top = assertTopFrame(state, 'ASK_TIE_QI');
      if (action.seatIndex !== top.sourceSeat) {
        throw new Error('WRONG_ACTOR_FOR_TIE_QI');
      }
      let next = popInterrupt(state).state;
      if (!action.activate) {
        return stepEngine(next, rng);
      }
      const source = getPlayerBySeat(next, top.sourceSeat);
      next = {
        ...next,
        actionLog: [...next.actionLog, `${source.displayName} phát động Thiết Kỵ!`],
      };
      next = startJudgment(next, top.sourceSeat, 'TIE_QI', rng, {
        sourceSeat: top.sourceSeat,
        targetSeat: top.targetSeat,
      });
      return stepEngine(next, rng);
    }

    case 'RESPOND_LIU_LI': {
      const top = assertTopFrame(state, 'ASK_LIU_LI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_LIU_LI');
      }
      let next = popInterrupt(state).state;
      if (!action.activate) {
        next = resolveStrikeAfterLiuLi(
          next,
          top.sourceSeat,
          top.targetSeat,
          top.strikeCards,
          top.isCollateralStrike,
          top.isFangTianMultiTarget,
        );
        return stepEngine(next, rng);
      }
      if (!action.discardCardId || action.newTargetSeat === undefined) {
        throw new Error('LIU_LI_REQUIRES_CARD_AND_TARGET');
      }
      if (
        action.newTargetSeat === top.targetSeat ||
        action.newTargetSeat === top.sourceSeat ||
        !isInAttackRange(next, top.targetSeat, action.newTargetSeat)
      ) {
        throw new Error('INVALID_LIU_LI_TARGET');
      }
      const alreadyQueuedStrikeTargets = new Set<number>();
      for (const eff of next.pendingEffects ?? []) {
        if (eff.kind === 'QUEUE_STRIKE_TARGETS' && eff.sourceSeat === top.sourceSeat) {
          for (const seat of eff.remainingTargets) {
            alreadyQueuedStrikeTargets.add(seat);
          }
        }
      }
      if (alreadyQueuedStrikeTargets.has(action.newTargetSeat)) {
        throw new Error('INVALID_LIU_LI_TARGET');
      }
      const newTarget = getPlayerBySeat(next, action.newTargetSeat);
      if (!canTargetPlayerWithCard(next, newTarget, 'sat')) {
        throw new Error('TARGET_IMMUNE_TO_CARD');
      }
      next = SKILL_RUNTIME.discardAnyCard(
        next,
        top.targetSeat,
        action.discardCardId,
        rng,
      ).state;
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${getPlayerBySeat(next, top.targetSeat).displayName} dùng Lưu Ly chuyển mục tiêu Sát sang ${newTarget.displayName}.`,
        ],
      };
      next = beginStrikeAgainstTarget(
        next,
        top.sourceSeat,
        action.newTargetSeat,
        top.strikeCards,
        top.isCollateralStrike,
        top.isFangTianMultiTarget,
      );
      return stepEngine(next, rng);
    }

    case 'RESPOND_GUI_CAI': {
      const top = assertTopFrame(state, 'WAIT_GUI_CAI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_GUI_CAI');
      }
      let next = popInterrupt(state).state;
      if (action.cardId !== null) {
        const siMaYi = getPlayerBySeat(next, top.targetSeat);
        const prevHandCount = siMaYi.handCards.length;
        const { nextPlayer, removed } = removeCardsFromHand(siMaYi, [
          action.cardId,
        ]);
        const newJudgeCard = removed[0]!;
        next = revealPublicCard(next, top.judgeOwnerSeat, newJudgeCard, `Quỷ Tài · ${top.judgePurpose}`);
        next = updatePlayer(next, top.targetSeat, () => nextPlayer);
        next = appendToDiscardPile(next, [top.judgeCard]);
        next = notifyHandCardsLost(next, top.targetSeat, prevHandCount, rng);

        const effects = [...(next.pendingEffects ?? [])];
        const idx = effects.findLastIndex((e) => e.kind === 'RESOLVE_JUDGMENT');
        if (idx !== -1) {
          const eff = effects[idx] as Extract<
            import('../types/game.js').PendingEffect,
            { kind: 'RESOLVE_JUDGMENT' }
          >;
          effects[idx] = { ...eff, judgeCard: newJudgeCard };
          next = { ...next, pendingEffects: effects };
        }
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${siMaYi.displayName} dùng Quỷ Tài đổi lá phán xét thành ${newJudgeCard.nameVi}!`,
          ],
        };
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_TIAN_DO': {
      const top = assertTopFrame(state, 'ASK_TIAN_DO');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_TIAN_DO');
      }
      let next = popInterrupt(state).state;
      if (action.activate) {
        next = updatePlayer(next, top.targetSeat, (p) => ({
          ...p,
          handCards: [...p.handCards, top.judgeCard],
        }));
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${getPlayerBySeat(next, top.targetSeat).displayName} dùng Thiên Đố thu lấy ${top.judgeCard.nameVi}.`,
          ],
        };
      } else {
        next = appendToDiscardPile(next, [top.judgeCard]);
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_JIAN_XIONG': {
      const top = assertTopFrame(state, 'ASK_JIAN_XIONG');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_JIAN_XIONG');
      }
      let next = popInterrupt(state).state;
      if (action.activate && top.damageCards.length > 0) {
        const cardIds = new Set(top.damageCards.map((c) => c.id));
        const taken: CardInstance[] = [];
        const remainingDiscard: CardInstance[] = [];
        for (const c of next.discardPile) {
          if (cardIds.has(c.id)) {
            taken.push(restorePhysicalCard(c));
          } else {
            remainingDiscard.push(c);
          }
        }
        if (taken.length > 0) {
          next = {
            ...next,
            discardPile: remainingDiscard,
            actionLog: [
              ...next.actionLog,
              `${getPlayerBySeat(next, top.targetSeat).displayName} dùng Gian Hùng thu lấy ${taken.map((c) => c.nameVi).join(', ')}.`,
            ],
          };
          next = updatePlayer(next, top.targetSeat, (p) => ({
            ...p,
            handCards: [...p.handCards, ...taken],
          }));
        }
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_FAN_KUI': {
      const top = assertTopFrame(state, 'ASK_FAN_KUI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_FAN_KUI');
      }
      let next = popInterrupt(state).state;
      if (action.activate) {
        const source = getPlayerBySeat(next, top.sourceSeat);
        if (source.alive && hasAnyCardInHandOrEquip(source)) {
          const actor = getPlayerBySeat(next, top.targetSeat);
          const frameSeq = {
            ...next,
            nextFrameSeq: (next.nextFrameSeq ?? 0) + 1,
            actionLog: [
              ...next.actionLog,
              `${actor.displayName} phát động Phản Quỷ lên ${source.displayName}.`,
            ],
          };
          next = pushInterrupt(frameSeq, {
            id: `fankui_pick_${frameSeq.nextFrameSeq}`,
            kind: 'PICK_TARGET_CARD',
            targetSeat: top.sourceSeat,
            sourceSeat: top.targetSeat,
            mode: 'STEAL',
            allowDelayed: false,
          });
          return next;
        }
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_GANG_LIE': {
      const top = assertTopFrame(state, 'ASK_GANG_LIE');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_GANG_LIE');
      }
      let next = popInterrupt(state).state;
      if (!action.activate) {
        return stepEngine(next, rng);
      }
      const actor = getPlayerBySeat(next, top.targetSeat);
      const source = getPlayerBySeat(next, top.sourceSeat);
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${actor.displayName} phát động Cương Liệt lên ${source.displayName}.`,
        ],
      };
      next = startJudgment(next, top.targetSeat, 'GANG_LIE', rng, {
        targetSeat: top.sourceSeat,
      });
      return stepEngine(next, rng);
    }

    case 'RESPOND_GANG_LIE_CHOICE': {
      const top = assertTopFrame(state, 'WAIT_GANG_LIE_CHOICE');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_GANG_LIE_CHOICE');
      }
      let next = popInterrupt(state).state;
      const victim = getPlayerBySeat(next, top.targetSeat);
      if (
        action.choice === 'DISCARD_TWO' &&
        victim.handCards.length >= 2 &&
        action.discardCardIds &&
        action.discardCardIds.length === 2 &&
        action.discardCardIds[0] !== action.discardCardIds[1]
      ) {
        next = SKILL_RUNTIME.discardHandCards(
          next,
          top.targetSeat,
          action.discardCardIds,
          rng,
        ).state;
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${victim.displayName} bỏ 2 lá trên tay trước Cương Liệt.`,
          ],
        };
        return stepEngine(next, rng);
      }
      next = applyDamage(
        next,
        top.sourceSeat,
        top.targetSeat,
        1,
        'Cương Liệt',
      );
      return stepEngine(next, rng);
    }

    case 'RESPOND_YI_JI': {
      const top = assertTopFrame(state, 'WAIT_YI_JI');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_YI_JI');
      }
      const expectedIds = new Set(top.cards.map((c) => c.id));
      const givenIds: string[] = [];
      for (const dist of action.distributions) {
        const receiver = getPlayerBySeat(state, dist.targetSeat);
        if (!receiver.alive) {
          throw new Error(`YI_JI_RECEIVER_NOT_ALIVE:${dist.targetSeat}`);
        }
        givenIds.push(...dist.cardIds);
      }
      if (
        givenIds.length !== top.cards.length ||
        new Set(givenIds).size !== top.cards.length ||
        givenIds.some((id) => !expectedIds.has(id))
      ) {
        throw new Error('INVALID_YI_JI_DISTRIBUTION');
      }
      const byId = new Map(top.cards.map((c) => [c.id, c]));
      let next = popInterrupt(state).state;
      const giver = getPlayerBySeat(state, top.targetSeat);
      const distributionLog: string[] = [];
      for (const dist of action.distributions) {
        if (dist.cardIds.length === 0) continue;
        const cardsToAdd = dist.cardIds.map((id) => byId.get(id)!);
        next = updatePlayer(next, dist.targetSeat, (p) => ({
          ...p,
          handCards: [...p.handCards, ...cardsToAdd],
        }));
        const receiver = getPlayerBySeat(next, dist.targetSeat);
        distributionLog.push(
          `${giver.displayName} dùng Di Kế giao ${cardsToAdd.length} lá bài cho ${receiver.displayName}.`,
        );
      }
      next = stepEngine(next, rng);
      return { ...next, actionLog: [...next.actionLog, ...distributionLog] };
    }

    case 'RESPOND_FAN_JIAN_GUESS': {
      const top = assertTopFrame(state, 'WAIT_FAN_JIAN_GUESS');
      if (action.seatIndex !== top.targetSeat) {
        throw new Error('WRONG_ACTOR_FOR_FAN_JIAN_GUESS');
      }
      let next = popInterrupt(state).state;
      const zhouYu = getPlayerBySeat(next, top.sourceSeat);
      if (!zhouYu.alive || zhouYu.handCards.length === 0) {
        return stepEngine(next, rng);
      }
      const prevHandCount = zhouYu.handCards.length;
      const res = removeCardFromTargetZone(zhouYu, 'HAND', rng);
      const pickedCard = res.removed;
      next = updatePlayer(next, top.sourceSeat, () => res.nextPlayer);
      next = notifyHandCardsLost(next, top.sourceSeat, prevHandCount, rng);

      const target = getPlayerBySeat(next, top.targetSeat);
      next = revealPublicCard(next, top.targetSeat, pickedCard,
        pickedCard.suit === action.suit ? 'Phản Gián · Đoán đúng' : 'Phản Gián · Đoán sai');
      const guessedSuitLabel = SUIT_LABEL_VI[action.suit];
      const actualSuitLabel = SUIT_LABEL_VI[pickedCard.suit];
      if (pickedCard.suit !== action.suit) {
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${target.displayName} đoán sai chất (đoán ${guessedSuitLabel}, mở ra ${actualSuitLabel}) trước Phản Gián, chịu 1 sát thương!`,
          ],
        };
        // Luật chuẩn Phản Gián: nếu đoán sai chất, chịu 1 sát thương (và xử lý Hấp Hối nếu 0 máu)
        // TRƯỚC KHI nhận lá bài đã rút về tay (nếu sống sót).
        next = pushPendingEffect(next, {
          kind: 'FAN_JIAN_RECEIVE',
          targetSeat: top.targetSeat,
          card: pickedCard,
        });
        next = applyDamage(next, top.sourceSeat, top.targetSeat, 1, 'Phản Gián');
      } else {
        next = updatePlayer(next, top.targetSeat, (p) => ({
          ...p,
          handCards: [...p.handCards, pickedCard],
        }));
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${target.displayName} đoán đúng chất ${guessedSuitLabel} trước Phản Gián!`,
            `${target.displayName} nhận lá ${pickedCard.nameVi} từ Phản Gián.`,
          ],
        };
      }
      return stepEngine(next, rng);
    }

    case 'RESPOND_JI_JIANG': {
      const top = assertTopFrame(state, 'WAIT_JI_JIANG');
      if (action.seatIndex !== top.responderSeat) {
        throw new Error('WRONG_RESPONDER_FOR_JI_JIANG');
      }
      let next = popInterrupt(state).state;
      if (action.cardIds && action.cardIds.length > 0) {
        const consumed = validateAndConsumeStrikeCards(
          next,
          action.seatIndex,
          action.cardIds,
          true,
          rng,
        );
        next = consumed.state;
        const lord = getPlayerBySeat(next, top.lordSeat);
        const ally = getPlayerBySeat(next, action.seatIndex);
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${ally.displayName} hưởng ứng Kích Tướng đánh Sát thay cho ${lord.displayName}!`,
          ],
        };
        if (top.contextKind === 'PLAY' && top.strikeTargetSeat !== undefined) {
          const prevFlags = next.turnFlags ?? {
            satUsedThisTurn: 0,
            skipPlayPhase: false,
          };
          next = {
            ...next,
            turnFlags: {
              ...prevFlags,
              satUsedThisTurn: prevFlags.satUsedThisTurn + 1,
              satPlayedOrUsedThisTurn: true,
            },
          };
          next = beginStrikeAgainstTarget(
            next,
            top.lordSeat,
            top.strikeTargetSeat,
            consumed.usedCards,
            false,
            false,
          );
        } else if (top.contextKind === 'DUEL') {
          const duelTop = next.interruptStack[next.interruptStack.length - 1];
          if (duelTop?.kind === 'WAIT_DUEL_SAT') {
            if (top.lordSeat === next.currentTurnSeat && next.turnPhase === 'PLAY') {
              const prevFlags = next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false };
              next = {
                ...next,
                turnFlags: { ...prevFlags, satPlayedOrUsedThisTurn: true },
              };
            }
            const nextPlayed = duelTop.playedSoFar + 1;
            if (nextPlayed < duelTop.requiredCount) {
              next = replaceTopInterrupt(next, {
                ...duelTop,
                playedSoFar: nextPlayed,
                jiJiangTriedThisFrame: false,
              });
            } else {
              const lordHandler = getHeroSkillHandler(lord.heroId);
              const nextRequired = lordHandler?.duelSatRequiredCount?.(next, lord) ?? 1;
              next = replaceTopInterrupt(next, {
                ...duelTop,
                targetSeat: duelTop.otherSeat,
                otherSeat: duelTop.targetSeat,
                requiredCount: nextRequired,
                playedSoFar: 0,
                jiJiangTriedThisFrame: false,
              });
            }
          }
        } else if (top.contextKind === 'AOE_SAT') {
          const aoeTop = next.interruptStack[next.interruptStack.length - 1];
          if (aoeTop?.kind === 'WAIT_AOE_SAT') {
            next = popInterrupt(next).state;
          }
        } else if (top.contextKind === 'COLLATERAL') {
          const colTop = next.interruptStack[next.interruptStack.length - 1];
          if (colTop?.kind === 'WAIT_COLLATERAL_SAT') {
            next = popInterrupt(next).state;
            next = beginStrikeAgainstTarget(
              next,
              colTop.attackerSeat,
              colTop.targetSeat,
              consumed.usedCards,
              true,
              false,
            );
          }
        }
        return stepEngine(next, rng);
      }

      const nextCursor = top.askCursor + 1;
      if (nextCursor >= top.askOrder.length) {
        if (top.contextKind === 'PLAY') {
          const prevFlags = next.turnFlags ?? {
            satUsedThisTurn: 0,
            skipPlayPhase: false,
          };
          next = {
            ...next,
            turnFlags: {
              ...prevFlags,
              jiJiangDeclinedThisTurn: true,
            },
          };
        } else {
          const parentTop = next.interruptStack[next.interruptStack.length - 1];
          if (
            parentTop?.kind === 'WAIT_DUEL_SAT' ||
            parentTop?.kind === 'WAIT_AOE_SAT' ||
            parentTop?.kind === 'WAIT_COLLATERAL_SAT'
          ) {
            next = replaceTopInterrupt(next, {
              ...parentTop,
              jiJiangTriedThisFrame: true,
            });
          }
        }
        return stepEngine(next, rng);
      }
      const nextResponder = top.askOrder[nextCursor]!;
      return pushInterrupt(next, {
        ...top,
        askCursor: nextCursor,
        responderSeat: nextResponder,
      });
    }

    case 'RESPOND_HU_JIA': {
      const top = assertTopFrame(state, 'WAIT_HU_JIA');
      if (action.seatIndex !== top.responderSeat) {
        throw new Error('WRONG_RESPONDER_FOR_HU_JIA');
      }
      let next = popInterrupt(state).state;
      if (action.useBagua) {
        const ally = getPlayerBySeat(next, action.seatIndex);
        if (
          ally.equipments.armor?.cardKey !== 'bat_quai_tran' ||
          top.baguaTriedThisSeat
        ) {
          throw new Error('BAGUA_NOT_AVAILABLE');
        }
        const parentTop = next.interruptStack[next.interruptStack.length - 1];
        let savedParentDodgeFrame:
          | Extract<InterruptFrame, { readonly kind: 'WAIT_DODGE' | 'WAIT_AOE_DODGE' }>
          | undefined;
        if (
          parentTop?.kind === 'WAIT_DODGE' ||
          parentTop?.kind === 'WAIT_AOE_DODGE'
        ) {
          savedParentDodgeFrame = parentTop;
          next = popInterrupt(next).state;
        }
        next = startJudgment(next, action.seatIndex, 'BAT_QUAI_TRAN', rng, {
          savedDodgeFrame: {
            ...top,
            ...(savedParentDodgeFrame ? { savedParentDodgeFrame } : {}),
          },
        });
        return stepEngine(next, rng);
      }
      if (action.cardId !== null) {
        const ally = getPlayerBySeat(next, action.seatIndex);
        const card = ally.handCards.find((c) => c.id === action.cardId);
        if (!card || !canUseCardAs(next, ally, card, 'thiem', false)) {
          throw new Error('NOT_A_THIEM_CARD');
        }
        next = SKILL_RUNTIME.discardHandCards(
          next,
          action.seatIndex,
          [action.cardId],
          rng,
        ).state;
        next = showDiscardAs(next, card, 'thiem');
        const dodgeSkill = getDodgeConversionSkill(ally, card);
        const lordName = getPlayerBySeat(next, top.lordSeat).displayName;
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            ...(dodgeSkill ? [`${ally.displayName} dùng ${dodgeSkill} đánh Thiểm.`] : []),
            `${ally.displayName} hưởng ứng Hộ Giá đánh Thiểm thay cho ${lordName}!`,
          ],
        };
        const dodgeTop = next.interruptStack[next.interruptStack.length - 1];
        if (dodgeTop?.kind === 'WAIT_AOE_DODGE') {
          next = popInterrupt(next).state;
        } else if (dodgeTop?.kind === 'WAIT_DODGE') {
          const nextDodged = dodgeTop.dodgedSoFar + 1;
          if (nextDodged < dodgeTop.requiredCount) {
            next = replaceTopInterrupt(next, {
              ...dodgeTop,
              dodgedSoFar: nextDodged,
              baguaTriedThisStrike: false,
              huJiaTriedThisStrike: false,
            });
          } else {
            next = popInterrupt(next).state;
            next = completeStrikeDodged(
              next,
              dodgeTop.sourceSeat,
              dodgeTop.targetSeat,
              dodgeTop.isCollateralStrike,
              dodgeTop.isFangTianMultiTarget,
            );
          }
        }
        return stepEngine(next, rng);
      }

      const nextCursor = top.askCursor + 1;
      if (nextCursor >= top.askOrder.length) {
        const dodgeTop = next.interruptStack[next.interruptStack.length - 1];
        if (dodgeTop?.kind === 'WAIT_DODGE') {
          next = replaceTopInterrupt(next, {
            ...dodgeTop,
            huJiaTriedThisStrike: true,
          });
        } else if (dodgeTop?.kind === 'WAIT_AOE_DODGE') {
          next = replaceTopInterrupt(next, {
            ...dodgeTop,
            huJiaTriedThisFrame: true,
          });
        }
        return next;
      }
      const nextResponder = top.askOrder[nextCursor]!;
      return pushInterrupt(next, {
        ...top,
        askCursor: nextCursor,
        responderSeat: nextResponder,
        baguaTriedThisSeat: false,
      });
    }
  }
}
