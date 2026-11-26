import { getCardColor, isBlackSuit, isRedSuit } from '../cards/catalog.js';
import { isInAttackRange } from '../distance/index.js';
import { HERO_BY_ID } from '../heroes/catalog.js';
import { getHeroSkillHandler } from '../heroes/registry.js';
import type { SkillRuntime } from '../heroes/skillContracts.js';
import type {
  CardInstance,
  InterruptFrame,
  JudgmentPurpose,
  MasterGameState,
  PendingEffect,
  PlayerCombatState,
} from '../types/game.js';
import type { PendingPrompt, VirtualCardKey } from './combatTypes.js';
import {
  appendToDiscardPile,
  dealCardsToSeat,
  drawFromPile,
  getClockwiseAliveSeats,
  getPlayerBySeat,
  hasAnyCardInHandOrEquip,
  removeAnyCardFromPlayer,
  removeCardsFromHand,
  updatePlayer,
} from './deck.js';

export function nextFrameId(state: MasterGameState, prefix: string): {
  readonly state: MasterGameState;
  readonly id: string;
} {
  const seq = (state.nextFrameSeq ?? 0) + 1;
  return {
    state: { ...state, nextFrameSeq: seq },
    id: `${prefix}_${seq}`,
  };
}

export function pushInterrupt(
  state: MasterGameState,
  frame: InterruptFrame,
): MasterGameState {
  return {
    ...state,
    interruptStack: [...state.interruptStack, frame],
  };
}

export function popInterrupt(state: MasterGameState): {
  readonly state: MasterGameState;
  readonly frame: InterruptFrame | undefined;
} {
  if (state.interruptStack.length === 0) {
    return { state, frame: undefined };
  }
  const nextStack = [...state.interruptStack];
  const frame = nextStack.pop();
  return {
    state: { ...state, interruptStack: nextStack },
    frame,
  };
}

export function replaceTopInterrupt(
  state: MasterGameState,
  frame: InterruptFrame,
): MasterGameState {
  if (state.interruptStack.length === 0) {
    return pushInterrupt(state, frame);
  }
  return {
    ...state,
    interruptStack: [...state.interruptStack.slice(0, -1), frame],
  };
}

export function pushPendingEffect(
  state: MasterGameState,
  effect: PendingEffect,
): MasterGameState {
  const current = state.pendingEffects ?? [];
  return {
    ...state,
    pendingEffects: [...current, effect],
  };
}

/** Kiểm tra ghế có thể đánh Trượng Bát Xà Mâu thay Sát không. */
export function hasTruongBat(player: PlayerCombatState): boolean {
  return player.equipments.weapon?.cardKey === 'truong_bat_xa_mau';
}

export function canUseCardAs(
  state: MasterGameState,
  player: PlayerCombatState,
  card: CardInstance,
  asCardKey: VirtualCardKey,
  inTurn: boolean,
): boolean {
  if (card.cardKey === asCardKey || (asCardKey === 'sat' && card.cardKey === 'pha_giap_tram')) {
    return true;
  }
  const handler = getHeroSkillHandler(player.heroId, state);
  return handler?.canConvertCardAs?.(state, player, card, asCardKey, inTurn) ?? false;
}

export function hasQuanThachPhuCards(player: PlayerCombatState): boolean {
  if (player.equipments.weapon?.cardKey !== 'quan_thach_phu') {
    return false;
  }
  // Chuẩn Yoka FAQ (1A): không được tự bỏ chính Quán Thạch Phủ — phải bỏ 2 lá bài khác
  const otherEquipCount =
    (player.equipments.armor ? 1 : 0) +
    (player.equipments.plusOneHorse ? 1 : 0) +
    (player.equipments.minusOneHorse ? 1 : 0);
  return player.handCards.length + otherEquipCount >= 2;
}

/** Mở nhịp chờ Vô Giải Khả Kích toàn bàn kèm cờ dừng giả lập nếu không ai có bài. */
export function openNullificationWindow(
  state: MasterGameState,
  targetSeat: number,
  sourceSeat: number,
  scrollNameVi: string,
  extra?: {
    readonly originalScrollNameVi?: string;
    readonly originalTargetSeat?: number;
    readonly nullifyDepth?: number;
  },
): MasterGameState {
  const clockwise = getClockwiseAliveSeats(state, state.currentTurnSeat, true);
  const eligibleSeats = clockwise.filter((seat) => {
    const p = getPlayerBySeat(state, seat);
    return (
      !p.autoSkipNullification &&
      p.handCards.some((card) => card.cardKey === 'vo_giai_kha_kich')
    );
  });

  const { state: s1, id } = nextFrameId(state, 'nullify');
  return pushInterrupt(s1, {
    id,
    kind: 'WAIT_NULLIFICATION',
    targetSeat,
    sourceSeat,
    scrollNameVi,
    originalScrollNameVi: extra?.originalScrollNameVi ?? scrollNameVi,
    originalTargetSeat: extra?.originalTargetSeat ?? targetSeat,
    nullifyDepth: extra?.nullifyDepth ?? 0,
    isSimulatedDelay: eligibleSeats.length === 0,
    eligibleSeats,
    passedSeats: [],
  });
}

export function notifyHandCardsLost(
  state: MasterGameState,
  seatIndex: number,
  prevHandCount: number,
  rng: () => number,
): MasterGameState {
  if (prevHandCount <= 0 || state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const player = getPlayerBySeat(state, seatIndex);
  if (!player.alive || player.handCards.length > 0) {
    return state;
  }
  const handler = getHeroSkillHandler(player.heroId, state);
  if (!handler?.onHandCardsLost) {
    return state;
  }
  return handler.onHandCardsLost(state, seatIndex, prevHandCount, rng, SKILL_RUNTIME);
}

export function notifyEquipLost(
  state: MasterGameState,
  seatIndex: number,
  lostCount: number,
  rng: () => number,
): MasterGameState {
  if (lostCount <= 0 || state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const player = getPlayerBySeat(state, seatIndex);
  if (!player.alive) {
    return state;
  }
  const handler = getHeroSkillHandler(player.heroId, state);
  if (!handler?.onEquipLost) {
    return state;
  }
  return handler.onEquipLost(state, seatIndex, lostCount, rng, SKILL_RUNTIME);
}

export function canTargetPlayerWithCard(
  state: MasterGameState,
  target: PlayerCombatState,
  cardKey: string,
): boolean {
  const handler = getHeroSkillHandler(target.heroId, state);
  if (!handler?.canBeTargetedBy) {
    return true;
  }
  return handler.canBeTargetedBy(state, target, cardKey);
}

export const SKILL_RUNTIME: SkillRuntime = {
  getPlayerBySeat,
  updatePlayer,
  getClockwiseAliveSeats,
  dealCardsToSeat,
  drawFromPile,
  appendToDiscardPile,
  removeCardsFromHand,
  removeAnyCardFromPlayer,
  hasAnyCardInHandOrEquip,
  nextFrameId,
  pushInterrupt,
  pushPendingEffect,
  applyDamage: (state, sourceSeat, targetSeat, amount, reasonVi, damageCards) =>
    applyDamage(state, sourceSeat, targetSeat, amount, reasonVi, damageCards),
  isInAttackRange,
  getHeroGender: (heroId) => (heroId ? HERO_BY_ID[heroId]?.gender ?? null : null),
  getHeroFaction: (heroId) => (heroId ? HERO_BY_ID[heroId]?.faction ?? null : null),
  discardHandCards: (state, seatIndex, cardIds, rng) => {
    const player = getPlayerBySeat(state, seatIndex);
    const prevHandCount = player.handCards.length;
    const { nextPlayer, removed } = removeCardsFromHand(player, cardIds);
    let next = updatePlayer(state, seatIndex, () => nextPlayer);
    next = appendToDiscardPile(next, removed);
    next = notifyHandCardsLost(next, seatIndex, prevHandCount, rng);
    return { state: next, removed };
  },
  discardAnyCard: (state, seatIndex, cardId, rng) => {
    const player = getPlayerBySeat(state, seatIndex);
    const prevHandCount = player.handCards.length;
    const wasInHand = player.handCards.some((c) => c.id === cardId);
    const { nextPlayer, removed } = removeAnyCardFromPlayer(player, cardId);
    let next = updatePlayer(state, seatIndex, () => nextPlayer);
    next = appendToDiscardPile(next, [removed]);
    if (wasInHand) {
      next = notifyHandCardsLost(next, seatIndex, prevHandCount, rng);
    } else {
      next = notifyEquipLost(next, seatIndex, 1, rng);
    }
    return { state: next, removed };
  },
  openNullificationWindow,
  canTargetPlayerWithCard,
};

/** Gây sát thương và mở Cầu Đào theo chiều kim đồng hồ từ ghế đang trong lượt nếu hp <= 0. */
export function applyDamage(
  state: MasterGameState,
  sourceSeat: number | null,
  targetSeat: number,
  amount: number,
  reasonVi: string,
  damageCards: readonly CardInstance[] = [],
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER' || amount <= 0) {
    return state;
  }
  const target = getPlayerBySeat(state, targetSeat);
  if (!target.alive) {
    return state;
  }

  const source = sourceSeat !== null ? getPlayerBySeat(state, sourceSeat) : null;
  const isStrikeDamage = damageCards.some(
    (c) => c.cardKey === 'sat' || c.cardKey === 'pha_giap_tram',
  );
  const ignoreArmor =
    damageCards.some((c) => c.cardKey === 'pha_giap_tram') ||
    (isStrikeDamage && source?.equipments.weapon?.cardKey === 'thanh_cong_kiem');

  let effectiveAmount = amount;
  const armorLogs: string[] = [];
  if (
    !ignoreArmor &&
    target.equipments.armor?.cardKey === 'hoan_anh_giap' &&
    effectiveAmount > 1
  ) {
    effectiveAmount = 1;
    armorLogs.push(
      `Huyễn Ảnh Giáp của ${target.displayName} giảm sát thương xuống 1!`,
    );
  }

  const nextHp = target.hp - effectiveAmount;
  let next = updatePlayer(state, targetSeat, (p) => ({
    ...p,
    hp: nextHp,
  }));

  const sourceName =
    source !== null ? source.displayName : 'Thiên tai';
  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      ...armorLogs,
      `${target.displayName} chịu ${effectiveAmount} sát thương từ ${sourceName} (${reasonVi}), còn ${nextHp}/${target.maxHp} máu.`,
    ],
  };

  const targetHandler = getHeroSkillHandler(target.heroId, next);
  if (targetHandler?.onAfterDamageTaken) {
    next = pushPendingEffect(next, {
      kind: 'FINISH_DAMAGE_REACTIONS',
      sourceSeat,
      targetSeat,
      amount: effectiveAmount,
      damageCards,
    });
  }

  if (nextHp <= 0) {
    const askOrder = getClockwiseAliveSeats(next, next.currentTurnSeat, true);
    const firstResponder = askOrder[0];
    if (firstResponder === undefined) {
      return next;
    }
    const { state: s1, id } = nextFrameId(next, 'dying');
    next = pushInterrupt(s1, {
      id,
      kind: 'WAIT_PEACH_RESCUE',
      targetSeat,
      sourceSeat,
      responderSeat: firstResponder,
      askOrder,
      askCursor: 0,
    });
    next = {
      ...next,
      actionLog: [
        ...next.actionLog,
        `${target.displayName} rơi vào trạng thái Hấp hối (${nextHp} máu), bắt đầu vòng Cầu Đào!`,
      ],
    };
  }

  return next;
}

/** Bắt đầu xử lý 1 mục tiêu của lá Sát (từ tay hoặc Tá Đao Sát Nhân). */
export function beginStrikeAgainstTarget(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  strikeCards: readonly CardInstance[],
  isCollateralStrike: boolean,
  isFangTianMultiTarget: boolean,
): MasterGameState {
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }

  // Kiểm tra Lưu Ly (Đại Kiều) khi bị chọn làm mục tiêu Sát
  const targetHandler = getHeroSkillHandler(target.heroId, state);
  if (targetHandler?.onStrikeTargeted) {
    const afterLiuLiHook = targetHandler.onStrikeTargeted(
      state,
      sourceSeat,
      targetSeat,
      strikeCards,
      isCollateralStrike,
      isFangTianMultiTarget,
      SKILL_RUNTIME,
    );
    if (afterLiuLiHook !== state) {
      return afterLiuLiHook;
    }
  }

  return resolveStrikeAfterLiuLi(
    state,
    sourceSeat,
    targetSeat,
    strikeCards,
    isCollateralStrike,
    isFangTianMultiTarget,
  );
}

export function resolveStrikeAfterLiuLi(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  strikeCards: readonly CardInstance[],
  isCollateralStrike: boolean,
  isFangTianMultiTarget: boolean,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }

  const sourceHero = source.heroId ? HERO_BY_ID[source.heroId] : undefined;
  const targetHero = target.heroId ? HERO_BY_ID[target.heroId] : undefined;

  if (
    source.equipments.weapon?.cardKey === 'tu_hung_song_co_kiem' &&
    sourceHero &&
    targetHero &&
    sourceHero.gender !== targetHero.gender
  ) {
    let next = pushPendingEffect(state, {
      kind: 'RESOLVE_STRIKE_AFTER_TU_HUNG',
      sourceSeat,
      targetSeat,
      strikeCards,
      isCollateralStrike,
      isFangTianMultiTarget,
    });
    const { state: s1, id } = nextFrameId(next, 'tuhung');
    next = pushInterrupt(s1, {
      id,
      kind: 'ASK_TU_HUNG',
      targetSeat,
      sourceSeat,
    });
    return next;
  }

  return resolveStrikeAfterTuHung(
    state,
    sourceSeat,
    targetSeat,
    strikeCards,
    isCollateralStrike,
    isFangTianMultiTarget,
  );
}

export function resolveStrikeAfterTuHung(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  strikeCards: readonly CardInstance[],
  isCollateralStrike: boolean,
  isFangTianMultiTarget: boolean,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }

  // Kiểm tra Thiết Kỵ (Mã Siêu) khi chỉ định mục tiêu — trước khi Nhân Vương Thuẫn chặn Sát Đen
  const sourceHandler = getHeroSkillHandler(source.heroId, state);
  if (sourceHandler?.onStrikeTargeting) {
    const nextWithPending = pushPendingEffect(state, {
      kind: 'RESOLVE_STRIKE_AFTER_TIE_QI',
      sourceSeat,
      targetSeat,
      strikeCards,
      isCollateralStrike,
      isFangTianMultiTarget,
      cannotDodge: false,
    });
    const afterTieQiHook = sourceHandler.onStrikeTargeting(
      nextWithPending,
      sourceSeat,
      targetSeat,
      SKILL_RUNTIME,
    );
    if (afterTieQiHook !== nextWithPending) {
      return afterTieQiHook;
    }
  }

  return resolveStrikeAfterTieQi(
    state,
    sourceSeat,
    targetSeat,
    strikeCards,
    isCollateralStrike,
    isFangTianMultiTarget,
    false,
  );
}

export function resolveStrikeAfterTieQi(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  strikeCards: readonly CardInstance[],
  isCollateralStrike: boolean,
  isFangTianMultiTarget: boolean,
  cannotDodge: boolean,
  rng: () => number = Math.random,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }

  const ignoresArmor =
    source.equipments.weapon?.cardKey === 'thanh_cong_kiem' ||
    strikeCards.some((c) => c.cardKey === 'pha_giap_tram');
  const strikeColor = getCardColor(strikeCards);

  // Nhân Vương Thuẫn vẫn vô hiệu hóa Sát Đen ngay cả khi Mã Siêu Thiết Kỵ ra Đỏ
  if (
    !ignoresArmor &&
    target.equipments.armor?.cardKey === 'nhan_vuong_thuan' &&
    strikeColor === 'BLACK'
  ) {
    return {
      ...state,
      actionLog: [
        ...state.actionLog,
        `Nhân Vương Thuẫn của ${target.displayName} vô hiệu hóa lá Sát màu Đen!`,
      ],
    };
  }

  if (cannotDodge) {
    return resolveStrikeHit(state, sourceSeat, targetSeat, strikeCards, rng);
  }

  const allowBagua =
    !ignoresArmor && target.equipments.armor?.cardKey === 'bat_quai_tran';
  const canBeForced = hasQuanThachPhuCards(source);
  const sourceHandler = getHeroSkillHandler(source.heroId, state);
  const requiredCount =
    sourceHandler?.strikeDodgeRequiredCount?.(state, source) ?? 1;

  let next = pushPendingEffect(state, {
    kind: 'RESOLVE_STRIKE_HIT',
    sourceSeat,
    targetSeat,
    strikeCards,
  });

  if (requiredCount >= 2) {
    next = {
      ...next,
      actionLog: [
        ...next.actionLog,
        `${source.displayName} phát động Vô Song, mục tiêu cần ${requiredCount} lá Thiểm để né!`,
      ],
    };
  }

  const { state: s1, id } = nextFrameId(next, 'dodge');
  next = pushInterrupt(s1, {
    id,
    kind: 'WAIT_DODGE',
    targetSeat,
    sourceSeat,
    requiredCount,
    dodgedSoFar: 0,
    allowBagua,
    baguaTriedThisStrike: false,
    canBeForcedByQuanThachPhu: canBeForced,
    strikeColor,
    isCollateralStrike,
    isFangTianMultiTarget,
  });
  return next;
}

export function completeStrikeDodged(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  isCollateralStrike: boolean,
  isFangTianMultiTarget: boolean,
  rng: () => number = Math.random,
): MasterGameState {
  const pending = [...(state.pendingEffects ?? [])];
  const hitIdx = pending.findLastIndex(
    (e) =>
      e.kind === 'RESOLVE_STRIKE_HIT' &&
      e.targetSeat === targetSeat &&
      e.sourceSeat === sourceSeat,
  );
  let strikeCards: readonly CardInstance[] = [];
  let next = state;
  if (hitIdx !== -1) {
    const hitEff = pending[hitIdx] as Extract<
      PendingEffect,
      { kind: 'RESOLVE_STRIKE_HIT' }
    >;
    strikeCards = hitEff.strikeCards;
    pending.splice(hitIdx, 1);
    next = { ...next, pendingEffects: pending };
  }

  const source = getPlayerBySeat(next, sourceSeat);
  if (!source.alive) {
    return next;
  }

  if (hasQuanThachPhuCards(source)) {
    const { state: s1, id } = nextFrameId(next, 'quanthach');
    return pushInterrupt(s1, {
      id,
      kind: 'ASK_QUAN_THACH_PHU',
      targetSeat,
      sourceSeat,
      strikeCards,
    });
  }

  const inSourceTurn = sourceSeat === next.currentTurnSeat;
  const sourceEquips = [
    source.equipments.weapon,
    source.equipments.armor,
    source.equipments.plusOneHorse,
    source.equipments.minusOneHorse,
  ].filter((eq): eq is CardInstance => eq !== null);
  const canFollowStrike =
    source.handCards.some((c) => canUseCardAs(next, source, c, 'sat', inSourceTurn)) ||
    sourceEquips.some((c) => canUseCardAs(next, source, c, 'sat', inSourceTurn)) ||
    hasTruongBat(source);

  if (
    source.alive &&
    source.equipments.weapon?.cardKey === 'tu_khi_hoan'
  ) {
    const dealt = dealCardsToSeat(next, sourceSeat, 1, rng);
    next = {
      ...dealt.state,
      actionLog: [
        ...dealt.state.actionLog,
        `${source.displayName} kích hoạt Tụ Khí Hoàn rút ${dealt.dealt.length} lá khi đòn bị né.`,
      ],
    };
  }

  const targetPlayer = getPlayerBySeat(next, targetSeat);
  if (
    !isFangTianMultiTarget &&
    source.equipments.weapon?.cardKey === 'thanh_long_yen_nguyet_dao' &&
    targetPlayer.alive &&
    canTargetPlayerWithCard(next, targetPlayer, 'sat') &&
    canFollowStrike
  ) {
    const { state: s1, id } = nextFrameId(next, 'thanhlong');
    return pushInterrupt(s1, {
      id,
      kind: 'ASK_THANH_LONG',
      targetSeat,
      sourceSeat,
    });
  }

  return next;
}

export function resolveStrikeHit(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
  strikeCards: readonly CardInstance[],
  rng: () => number = Math.random,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }

  if (
    source.equipments.weapon?.cardKey === 'han_bang_kiem' &&
    hasAnyCardInHandOrEquip(target)
  ) {
    const { state: s1, id } = nextFrameId(state, 'hanbang');
    return pushInterrupt(s1, {
      id,
      kind: 'ASK_HAN_BANG_KIEM',
      targetSeat,
      sourceSeat,
      sourceCards: strikeCards,
    });
  }

  const luoYiBonus =
    source.heroId === 'xu_chu' &&
    sourceSeat === state.currentTurnSeat &&
    state.turnFlags?.luoYiActive
      ? 1
      : 0;
  let afterDmg = applyDamage(
    state,
    sourceSeat,
    targetSeat,
    1 + luoYiBonus,
    luoYiBonus > 0 ? 'Sát (Lỏa Y +1)' : 'Sát',
    strikeCards,
  );
  if (
    strikeCards.some((c) => c.cardKey === 'pha_giap_tram') &&
    getPlayerBySeat(afterDmg, sourceSeat).alive
  ) {
    const dealt = dealCardsToSeat(afterDmg, sourceSeat, 1, rng);
    afterDmg = {
      ...dealt.state,
      actionLog: [
        ...dealt.state.actionLog,
        `${source.displayName} kích hoạt Phá Giáp Trảm rút thêm ${dealt.dealt.length} lá khi trúng đòn.`,
      ],
    };
  }
  return maybeOfferKyLanCung(afterDmg, sourceSeat, targetSeat);
}

export function maybeOfferKyLanCung(
  state: MasterGameState,
  sourceSeat: number,
  targetSeat: number,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }
  const source = getPlayerBySeat(state, sourceSeat);
  const target = getPlayerBySeat(state, targetSeat);
  if (!source.alive || !target.alive) {
    return state;
  }
  if (
    source.equipments.weapon?.cardKey === 'ky_lan_cung' &&
    (target.equipments.plusOneHorse !== null ||
      target.equipments.minusOneHorse !== null)
  ) {
    const { state: s1, id } = nextFrameId(state, 'kylan');
    return pushInterrupt(s1, {
      id,
      kind: 'ASK_KY_LAN_CUNG',
      targetSeat,
      sourceSeat,
    });
  }
  return state;
}

function advanceToNextTurn(state: MasterGameState): MasterGameState {
  const ordered = [...state.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const total = ordered.length;
  const curPos = ordered.findIndex((p) => p.seatIndex === state.currentTurnSeat);
  if (curPos === -1) {
    return state;
  }

  const lordSeat =
    state.players.find((p) => p.identity === 'LORD')?.seatIndex ??
    state.heroDraft?.lordSeatIndex ??
    0;
  const lordPos = ordered.findIndex((p) => p.seatIndex === lordSeat);
  const curRel = lordPos >= 0 ? (curPos - lordPos + total) % total : curPos;

  let nextSeat = state.currentTurnSeat;
  let wrapped = false;
  for (let step = 1; step <= total; step += 1) {
    const idx = (curPos + step) % total;
    if (curRel + step >= total) {
      wrapped = true;
    }
    const candidate = ordered[idx];
    if (candidate && candidate.alive) {
      nextSeat = candidate.seatIndex;
      break;
    }
  }

  return {
    ...state,
    currentTurnSeat: nextSeat,
    roundNumber: wrapped ? state.roundNumber + 1 : state.roundNumber,
    turnPhase: 'JUDGE',
    turnFlags: {
      satUsedThisTurn: 0,
      satPlayedOrUsedThisTurn: false,
      skipPlayPhase: false,
    },
  };
}

const JUDGMENT_PURPOSE_LABEL: Readonly<Record<JudgmentPurpose, string>> = {
  LAC_BAT_TU_THUC: 'Lạc Bất Tư Thục',
  THIEM_DIEN: 'Thiểm Điện',
  BAT_QUAI_TRAN: 'Bát Quái Trận',
  TIE_QI: 'Thiết Kỵ',
  GANG_LIE: 'Cương Liệt',
  LUO_SHEN: 'Lạc Thần',
};

/**
 * Khởi tạo một lần Phán xét thống nhất (dùng cho Lạc Bất Tư Thục, Thiểm Điện,
 * Bát Quái Trận, Thiết Kỵ, Cương Liệt, Lạc Thần) để Tư Mã Ý (Quỷ Tài) có thể đổi lá phán xét.
 */
export function revealPublicCard(
  state: MasterGameState, seat: number, card: CardInstance, label: string,
): MasterGameState {
  const previous = state.publicReveals ?? [];
  return {
    ...state,
    publicReveals: [...previous.slice(-11), {
      id: (previous.at(-1)?.id ?? 0) + 1, seat, card, label,
    }],
  };
}

export function startJudgment(
  state: MasterGameState,
  ownerSeat: number,
  purpose: JudgmentPurpose,
  rng: () => number,
  extra?: {
    readonly sourceSeat?: number;
    readonly targetSeat?: number;
    readonly delayedCard?: CardInstance;
    readonly savedDodgeFrame?: InterruptFrame;
  },
): MasterGameState {
  const owner = getPlayerBySeat(state, ownerSeat);
  const drawn = drawFromPile(state, 1, rng);
  let next = drawn.state;
  const judgeCard = drawn.drawn[0];
  if (!judgeCard) {
    return next;
  }

  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      `${owner.displayName} lật lá phán xét (${JUDGMENT_PURPOSE_LABEL[purpose]}): ${judgeCard.nameVi}.`,
    ],
  };

  next = revealPublicCard(next, ownerSeat, judgeCard, JUDGMENT_PURPOSE_LABEL[purpose]);
  next = pushPendingEffect(next, {
    kind: 'RESOLVE_JUDGMENT',
    ownerSeat,
    purpose,
    judgeCard,
    sourceSeat: extra?.sourceSeat,
    targetSeat: extra?.targetSeat,
    delayedCard: extra?.delayedCard,
    savedDodgeFrame: extra?.savedDodgeFrame,
  });

  // Kiểm tra Tư Mã Ý (Quỷ Tài) còn sống và có bài trên tay
  const siMaYi = next.players.find(
    (p) => p.alive && p.heroId === 'si_ma_yi' && p.handCards.length > 0,
  );
  if (siMaYi) {
    const { state: s1, id } = nextFrameId(next, 'guicai');
    next = pushInterrupt(s1, {
      id,
      kind: 'WAIT_GUI_CAI',
      targetSeat: siMaYi.seatIndex,
      judgeOwnerSeat: ownerSeat,
      judgeCard,
      judgePurpose: JUDGMENT_PURPOSE_LABEL[purpose],
    });
  }

  return next;
}

function maybeOfferTianDo(
  state: MasterGameState,
  ownerSeat: number,
  judgeCard: CardInstance,
): MasterGameState {
  const owner = getPlayerBySeat(state, ownerSeat);
  if (owner.alive && owner.heroId === 'guo_jia') {
    const { state: s1, id } = nextFrameId(state, 'tiando');
    return pushInterrupt(s1, {
      id,
      kind: 'ASK_TIAN_DO',
      targetSeat: ownerSeat,
      judgeCard,
    });
  }
  return appendToDiscardPile(state, [judgeCard]);
}

function resolveJudgmentEffect(
  state: MasterGameState,
  effect: Extract<PendingEffect, { kind: 'RESOLVE_JUDGMENT' }>,
  rng: () => number = Math.random,
): MasterGameState {
  const { ownerSeat, purpose, judgeCard } = effect;
  const owner = getPlayerBySeat(state, ownerSeat);
  let next = state;

  switch (purpose) {
    case 'LAC_BAT_TU_THUC': {
      const isHeart = judgeCard.suit === 'HEART';
      if (!isHeart) {
        next = {
          ...next,
          turnFlags: {
            ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
            skipPlayPhase: true,
          },
          actionLog: [
            ...next.actionLog,
            `Phán xét Lạc Bất Tư Thục của ${owner.displayName} ra ${judgeCard.nameVi} (không phải Cơ) — mất pha Đánh bài!`,
          ],
        };
      } else {
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `Phán xét Lạc Bất Tư Thục của ${owner.displayName} ra chất Cơ — thoát nạn!`,
          ],
        };
      }
      return maybeOfferTianDo(next, ownerSeat, judgeCard);
    }

    case 'THIEM_DIEN': {
      const delayedCard = effect.delayedCard!;
      if (
        judgeCard.suit === 'SPADE' &&
        judgeCard.rank >= 2 &&
        judgeCard.rank <= 9
      ) {
        next = appendToDiscardPile(next, [delayedCard]);
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `Thiểm Điện phán xét trúng ${judgeCard.rank}♠ trên ${owner.displayName}!`,
          ],
        };
        // Chuẩn Yoka: Thiên Đố (Quách Gia) lấy lá phán xét TRƯỚC khi trừ 3 máu Thiểm Điện
        next = pushPendingEffect(next, {
          kind: 'APPLY_LIGHTNING_STRIKE',
          targetSeat: ownerSeat,
          delayedCard,
        });
        return maybeOfferTianDo(next, ownerSeat, judgeCard);
      }

      const nextSeat = findNextLightningSeat(next, ownerSeat);
      next = updatePlayer(next, nextSeat, (p) => ({
        ...p,
        delayedScrolls: [...p.delayedScrolls, delayedCard],
      }));
      const prevJudged = next.turnFlags?.judgedLightningIds ?? [];
      next = {
        ...next,
        turnFlags: {
          ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
          judgedLightningIds: [...prevJudged, delayedCard.id],
        },
      };
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Thiểm Điện không trúng trên ${owner.displayName}, chuyển sang ${getPlayerBySeat(next, nextSeat).displayName}.`,
        ],
      };
      return maybeOfferTianDo(next, ownerSeat, judgeCard);
    }

    case 'BAT_QUAI_TRAN': {
      const success = isRedSuit(judgeCard.suit);
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `${owner.displayName} phán xét Bát Quái Trận ra ${judgeCard.nameVi} (${success ? 'chất Đỏ — tính là Thiểm' : 'chất Đen — thất bại'}).`,
        ],
      };
      const saved = effect.savedDodgeFrame;
      if (saved && saved.kind === 'WAIT_DODGE') {
        if (success) {
          const nextDodged = saved.dodgedSoFar + 1;
          if (nextDodged < saved.requiredCount) {
            next = pushInterrupt(next, {
              ...saved,
              dodgedSoFar: nextDodged,
              baguaTriedThisStrike: false,
              huJiaTriedThisStrike: false,
            });
          } else {
            next = completeStrikeDodged(
              next,
              saved.sourceSeat,
              saved.targetSeat,
              saved.isCollateralStrike,
              saved.isFangTianMultiTarget,
              rng,
            );
          }
        } else {
          next = pushInterrupt(next, {
            ...saved,
            baguaTriedThisStrike: true,
          });
        }
      } else if (saved && saved.kind === 'WAIT_AOE_DODGE') {
        if (!success) {
          next = pushInterrupt(next, {
            ...saved,
            baguaTriedThisFrame: true,
          });
        }
      } else if (saved && saved.kind === 'WAIT_HU_JIA') {
        const parentFrame = saved.savedParentDodgeFrame;
        if (success) {
          // Tướng Ngụy phán xét Bát Quái Trận thành công khi hưởng ứng Hộ Giá!
          const lord = getPlayerBySeat(next, saved.lordSeat);
          next = {
            ...next,
            actionLog: [
              ...next.actionLog,
              `${owner.displayName} hưởng ứng Hộ Giá bằng Bát Quái Trận giúp ${lord.displayName} né đòn!`,
            ],
          };
          if (saved.contextKind === 'DODGE' && parentFrame?.kind === 'WAIT_DODGE') {
            const nextDodged = parentFrame.dodgedSoFar + 1;
            if (nextDodged < parentFrame.requiredCount) {
              next = pushInterrupt(next, {
                ...parentFrame,
                dodgedSoFar: nextDodged,
                baguaTriedThisStrike: false,
                huJiaTriedThisStrike: false,
              });
            } else {
              next = completeStrikeDodged(
                next,
                parentFrame.sourceSeat,
                parentFrame.targetSeat,
                parentFrame.isCollateralStrike,
                parentFrame.isFangTianMultiTarget,
                rng,
              );
            }
          }
          // Với AOE_DODGE: parentFrame đã được pop trước khi phán xét nên coi như né xong!
        } else {
          if (parentFrame) {
            next = pushInterrupt(next, parentFrame);
          }
          const { savedParentDodgeFrame: _removed, ...restSaved } = saved;
          next = pushInterrupt(next, {
            ...restSaved,
            baguaTriedThisSeat: true,
          });
        }
      }
      return maybeOfferTianDo(next, ownerSeat, judgeCard);
    }

    case 'TIE_QI': {
      const success = isRedSuit(judgeCard.suit);
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Thiết Kỵ phán xét ra ${judgeCard.nameVi} (${success ? 'chất Đỏ — mục tiêu không thể né!' : 'chất Đen — thất bại'}).`,
        ],
      };
      if (success && next.pendingEffects && next.pendingEffects.length > 0) {
        const effects = [...next.pendingEffects];
        const idx = effects.findLastIndex(
          (e) => e.kind === 'RESOLVE_STRIKE_AFTER_TIE_QI',
        );
        if (idx !== -1) {
          const eff = effects[idx] as Extract<
            PendingEffect,
            { kind: 'RESOLVE_STRIKE_AFTER_TIE_QI' }
          >;
          effects[idx] = { ...eff, cannotDodge: true };
          next = { ...next, pendingEffects: effects };
        }
      }
      return maybeOfferTianDo(next, ownerSeat, judgeCard);
    }

    case 'GANG_LIE': {
      const isHeart = judgeCard.suit === 'HEART';
      next = {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Cương Liệt phán xét ra ${judgeCard.nameVi} (${isHeart ? 'chất Cơ — vô hiệu' : 'khác Cơ — ép nguồn sát thương chọn!'}).`,
        ],
      };
      if (!isHeart && effect.targetSeat !== undefined) {
        const dmgSource = getPlayerBySeat(next, effect.targetSeat);
        if (dmgSource.alive) {
          const { state: s1, id } = nextFrameId(next, 'ganglie_choice');
          next = pushInterrupt(s1, {
            id,
            kind: 'WAIT_GANG_LIE_CHOICE',
            targetSeat: effect.targetSeat,
            sourceSeat: ownerSeat,
          });
        }
      }
      return maybeOfferTianDo(next, ownerSeat, judgeCard);
    }

    case 'LUO_SHEN': {
      if (isBlackSuit(judgeCard.suit)) {
        next = updatePlayer(next, ownerSeat, (p) => ({
          ...p,
          handCards: [...p.handCards, judgeCard],
        }));
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `Lạc Thần ra ${judgeCard.nameVi} (chất Đen) — ${owner.displayName} thu về tay!`,
          ],
        };
        const { state: s1, id } = nextFrameId(next, 'luoshen');
        return pushInterrupt(s1, {
          id,
          kind: 'ASK_LUO_SHEN',
          targetSeat: ownerSeat,
        });
      }
      next = appendToDiscardPile(next, [judgeCard]);
      return {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Lạc Thần ra ${judgeCard.nameVi} (chất Đỏ) — kết thúc Lạc Thần.`,
        ],
      };
    }
  }
}

function findNextLightningSeat(
  state: MasterGameState,
  fromSeat: number,
): number {
  const clockwise = getClockwiseAliveSeats(state, fromSeat, false);
  return clockwise[0] ?? fromSeat;
}

function executeScrollEffect(
  state: MasterGameState,
  effect: Extract<PendingEffect, { kind: 'RESOLVE_SCROLL' }>,
  rng: () => number,
): MasterGameState {
  if (state.turnPhase === 'GAME_OVER') {
    return state;
  }

  if (effect.scrollKey === 'lac_bat_tu_thuc') {
    const target = getPlayerBySeat(state, effect.targetSeat);
    let next = updatePlayer(state, effect.targetSeat, (p) => ({
      ...p,
      delayedScrolls: p.delayedScrolls.filter(
        (c) => c.id !== effect.scrollCard.id,
      ),
    }));
    next = appendToDiscardPile(next, [effect.scrollCard]);

    if (effect.cancelled) {
      return {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Lạc Bất Tư Thục trên ${target.displayName} bị Vô Giải Khả Kích vô hiệu hóa!`,
        ],
      };
    }

    return startJudgment(next, effect.targetSeat, 'LAC_BAT_TU_THUC', rng, {
      delayedCard: effect.scrollCard,
    });
  }

  if (effect.scrollKey === 'thiem_dien') {
    const target = getPlayerBySeat(state, effect.targetSeat);
    let next = updatePlayer(state, effect.targetSeat, (p) => ({
      ...p,
      delayedScrolls: p.delayedScrolls.filter(
        (c) => c.id !== effect.scrollCard.id,
      ),
    }));

    if (effect.cancelled) {
      const nextSeat = findNextLightningSeat(next, effect.targetSeat);
      next = updatePlayer(next, nextSeat, (p) => ({
        ...p,
        delayedScrolls: [...p.delayedScrolls, effect.scrollCard],
      }));
      const prevJudged = next.turnFlags?.judgedLightningIds ?? [];
      next = {
        ...next,
        turnFlags: {
          ...(next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
          judgedLightningIds: [...prevJudged, effect.scrollCard.id],
        },
      };
      return {
        ...next,
        actionLog: [
          ...next.actionLog,
          `Thiểm Điện bị Vô Giải Khả Kích hóa giải, chuyển sang khu phán xét của ${getPlayerBySeat(next, nextSeat).displayName}.`,
        ],
      };
    }

    return startJudgment(next, effect.targetSeat, 'THIEM_DIEN', rng, {
      delayedCard: effect.scrollCard,
    });
  }

  if (effect.cancelled) {
    return {
      ...state,
      actionLog: [
        ...state.actionLog,
        `${effect.scrollCard.nameVi} bị Vô Giải Khả Kích vô hiệu hóa!`,
      ],
    };
  }

  switch (effect.scrollKey) {
    case 'vo_trung_sinh_huu': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      if (!caster.alive) return state;
      const dealt = dealCardsToSeat(state, effect.casterSeat, 2, rng);
      return {
        ...dealt.state,
        actionLog: [
          ...dealt.state.actionLog,
          `${caster.displayName} dùng Vô Trung Sinh Hữu rút ${dealt.dealt.length} lá.`,
        ],
      };
    }
    case 'chan_khi_ho_the': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      if (!caster.alive) return state;
      if (caster.hp < caster.maxHp) {
        let next = updatePlayer(state, effect.casterSeat, (p) => ({
          ...p,
          hp: Math.min(p.maxHp, p.hp + 1),
        }));
        const dealt = dealCardsToSeat(next, effect.casterSeat, 1, rng);
        return {
          ...dealt.state,
          actionLog: [
            ...dealt.state.actionLog,
            `${caster.displayName} dùng Chân Khí Hộ Thể hồi 1 Sinh Lực và rút ${dealt.dealt.length} lá.`,
          ],
        };
      }
      const dealt = dealCardsToSeat(state, effect.casterSeat, 2, rng);
      return {
        ...dealt.state,
        actionLog: [
          ...dealt.state.actionLog,
          `${caster.displayName} dùng Chân Khí Hộ Thể rút ${dealt.dealt.length} lá.`,
        ],
      };
    }
    case 'kinh_loi_chan': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!caster.alive || !target.alive) return state;
      if (target.handCards.length <= 1) {
        return applyDamage(
          state,
          effect.casterSeat,
          effect.targetSeat,
          1,
          'Kinh Lôi Chấn',
          [effect.scrollCard],
        );
      }
      const { state: s1, id } = nextFrameId(state, 'kinhloidismantle');
      return pushInterrupt(s1, {
        id,
        kind: 'PICK_TARGET_CARD',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
        mode: 'DISMANTLE',
        allowDelayed: false,
      });
    }
    case 'thuan_thu_khien_duong': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!caster.alive || !target.alive || !hasAnyCardInHandOrEquip(target)) {
        return state;
      }
      const { state: s1, id } = nextFrameId(state, 'steal');
      return pushInterrupt(s1, {
        id,
        kind: 'PICK_TARGET_CARD',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
        mode: 'STEAL',
        allowDelayed: false,
      });
    }
    case 'qua_ha_sai_cau': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!caster.alive || !target.alive || !hasAnyCardInHandOrEquip(target)) {
        return state;
      }
      const { state: s1, id } = nextFrameId(state, 'dismantle');
      return pushInterrupt(s1, {
        id,
        kind: 'PICK_TARGET_CARD',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
        mode: 'DISMANTLE',
        allowDelayed: false,
      });
    }
    case 'quyet_dau': {
      const caster = getPlayerBySeat(state, effect.casterSeat);
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!caster.alive || !target.alive) {
        return state;
      }
      const casterHandler = getHeroSkillHandler(caster.heroId, state);
      const requiredCount =
        casterHandler?.duelSatRequiredCount?.(state, caster) ?? 1;
      const isVirtualLiJian = effect.scrollCard.id.startsWith('li_jian_');
      let next = state;
      if (requiredCount >= 2) {
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `${caster.displayName} phát động Vô Song trong Quyết Đấu (cần ${requiredCount} lá Sát mỗi lần)!`,
          ],
        };
      }
      const { state: s1, id } = nextFrameId(next, 'duel');
      return pushInterrupt(s1, {
        id,
        kind: 'WAIT_DUEL_SAT',
        targetSeat: effect.targetSeat,
        otherSeat: effect.casterSeat,
        casterSeat: effect.casterSeat,
        requiredCount,
        playedSoFar: 0,
        ...(isVirtualLiJian ? {} : { scrollCard: effect.scrollCard }),
      });
    }
    case 'ta_dao_sat_nhan': {
      const attacker = getPlayerBySeat(state, effect.targetSeat);
      const victimSeat = effect.secondarySeat;
      if (
        !attacker.alive ||
        attacker.equipments.weapon === null ||
        victimSeat === undefined
      ) {
        return state;
      }
      const { state: s1, id } = nextFrameId(state, 'collateral');
      return pushInterrupt(s1, {
        id,
        kind: 'WAIT_COLLATERAL_SAT',
        targetSeat: victimSeat,
        attackerSeat: effect.targetSeat,
        casterSeat: effect.casterSeat,
      });
    }
    case 'nam_man_nhap_xam': {
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!target.alive) return state;
      const { state: s1, id } = nextFrameId(state, 'aoe_sat');
      return pushInterrupt(s1, {
        id,
        kind: 'WAIT_AOE_SAT',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
        scrollCard: effect.scrollCard,
      });
    }
    case 'van_tien_te_phat': {
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!target.alive) return state;
      const allowBagua = target.equipments.armor?.cardKey === 'bat_quai_tran';
      const { state: s1, id } = nextFrameId(state, 'aoe_dodge');
      return pushInterrupt(s1, {
        id,
        kind: 'WAIT_AOE_DODGE',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
        allowBagua,
        baguaTriedThisFrame: false,
        scrollCard: effect.scrollCard,
      });
    }
    case 'dao_vien_ket_nghia': {
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!target.alive || target.hp >= target.maxHp) return state;
      return updatePlayer(state, effect.targetSeat, (p) => ({
        ...p,
        hp: Math.min(p.maxHp, p.hp + 1),
      }));
    }
    case 'ngu_coc_phong_dang': {
      const target = getPlayerBySeat(state, effect.targetSeat);
      if (!target.alive || (state.harvestPool?.length ?? 0) === 0) return state;
      const { state: s1, id } = nextFrameId(state, 'harvest');
      return pushInterrupt(s1, {
        id,
        kind: 'WAIT_HARVEST_PICK',
        targetSeat: effect.targetSeat,
        sourceSeat: effect.casterSeat,
      });
    }
    default:
      return state;
  }
}

/**
 * Tự động chạy qua các bước chuyển tiếp không cần chờ người chơi
 * cho tới khi gặp pha cần tương tác (interruptStack hoặc PLAY/DISCARD) hoặc GAME_OVER.
 */
export function stepEngine(
  initialState: MasterGameState,
  rng: () => number = Math.random,
): MasterGameState {
  let state = initialState;

  for (let guard = 0; guard < 256; guard += 1) {
    if (state.turnPhase === 'GAME_OVER' || state.turnPhase === 'HERO_SELECT') {
      return state;
    }

    if (state.interruptStack.length > 0) {
      return state;
    }

    const effects = state.pendingEffects ?? [];
    if (effects.length > 0) {
      const nextEffects = [...effects];
      const topEffect = nextEffects.pop()!;
      state = { ...state, pendingEffects: nextEffects };

      switch (topEffect.kind) {
        case 'RESOLVE_NULLIFICATION_COUNTER': {
          if (!topEffect.cancelled && nextEffects.length > 0) {
            const parent = nextEffects[nextEffects.length - 1]!;
            if (
              parent.kind === 'RESOLVE_NULLIFICATION_COUNTER' ||
              parent.kind === 'RESOLVE_SCROLL'
            ) {
              nextEffects[nextEffects.length - 1] = {
                ...parent,
                cancelled: !parent.cancelled,
              };
              state = { ...state, pendingEffects: nextEffects };
            }
          }
          break;
        }
        case 'RESOLVE_SCROLL': {
          state = executeScrollEffect(state, topEffect, rng);
          break;
        }
        case 'RESOLVE_STRIKE_AFTER_LIU_LI': {
          state = resolveStrikeAfterLiuLi(
            state,
            topEffect.sourceSeat,
            topEffect.targetSeat,
            topEffect.strikeCards,
            topEffect.isCollateralStrike,
            topEffect.isFangTianMultiTarget,
          );
          break;
        }
        case 'RESOLVE_STRIKE_AFTER_TU_HUNG': {
          state = resolveStrikeAfterTuHung(
            state,
            topEffect.sourceSeat,
            topEffect.targetSeat,
            topEffect.strikeCards,
            topEffect.isCollateralStrike,
            topEffect.isFangTianMultiTarget,
          );
          break;
        }
        case 'RESOLVE_STRIKE_AFTER_TIE_QI': {
          state = resolveStrikeAfterTieQi(
            state,
            topEffect.sourceSeat,
            topEffect.targetSeat,
            topEffect.strikeCards,
            topEffect.isCollateralStrike,
            topEffect.isFangTianMultiTarget,
            topEffect.cannotDodge,
            rng,
          );
          break;
        }
        case 'RESOLVE_JUDGMENT': {
          state = resolveJudgmentEffect(state, topEffect, rng);
          break;
        }
        case 'CONTINUE_LUO_SHEN': {
          const owner = getPlayerBySeat(state, topEffect.targetSeat);
          if (owner.alive && owner.heroId === 'zhen_ji') {
            state = startJudgment(state, topEffect.targetSeat, 'LUO_SHEN', rng);
          }
          break;
        }
        case 'CONTINUE_YI_JI': {
          const owner = getPlayerBySeat(state, topEffect.targetSeat);
          if (owner.alive && topEffect.remainingTriggers > 0) {
            if (topEffect.remainingTriggers > 1) {
              state = pushPendingEffect(state, {
                kind: 'CONTINUE_YI_JI',
                targetSeat: topEffect.targetSeat,
                remainingTriggers: topEffect.remainingTriggers - 1,
              });
            }
            const drawn = drawFromPile(state, 2, rng);
            state = drawn.state;
            if (drawn.drawn.length > 0) {
              const { state: s1, id } = nextFrameId(state, 'yiji');
              state = pushInterrupt(s1, {
                id,
                kind: 'WAIT_YI_JI',
                targetSeat: topEffect.targetSeat,
                cards: drawn.drawn,
              });
            }
          }
          break;
        }
        case 'FINISH_DAMAGE_REACTIONS': {
          const target = getPlayerBySeat(state, topEffect.targetSeat);
          if (target.alive) {
            const handler = getHeroSkillHandler(target.heroId, state);
            if (handler?.onAfterDamageTaken) {
              state = handler.onAfterDamageTaken(
                state,
                topEffect.targetSeat,
                topEffect.sourceSeat,
                topEffect.amount,
                topEffect.damageCards,
                rng,
                SKILL_RUNTIME,
              );
            }
          }
          break;
        }
        case 'RESOLVE_STRIKE_HIT': {
          state = resolveStrikeHit(
            state,
            topEffect.sourceSeat,
            topEffect.targetSeat,
            topEffect.strikeCards,
            rng,
          );
          break;
        }
        case 'QUEUE_STRIKE_TARGETS': {
          const [nextTarget, ...rest] = topEffect.remainingTargets;
          if (nextTarget !== undefined) {
            if (rest.length > 0) {
              state = pushPendingEffect(state, {
                ...topEffect,
                remainingTargets: rest,
              });
            }
            state = beginStrikeAgainstTarget(
              state,
              topEffect.sourceSeat,
              nextTarget,
              topEffect.strikeCards,
              false,
              topEffect.isFangTianMultiTarget,
            );
          }
          break;
        }
        case 'QUEUE_AOE_TARGETS': {
          const [nextTarget, ...rest] = topEffect.remainingTargets;
          if (nextTarget === undefined) {
            if (
              topEffect.scrollKey === 'ngu_coc_phong_dang' &&
              (state.harvestPool?.length ?? 0) > 0
            ) {
              state = appendToDiscardPile(state, state.harvestPool ?? []);
              state = { ...state, harvestPool: [] };
            }
            break;
          }
          const targetPlayer = getPlayerBySeat(state, nextTarget);
          const needsTrigger =
            targetPlayer.alive &&
            (topEffect.scrollKey !== 'dao_vien_ket_nghia' ||
              targetPlayer.hp < targetPlayer.maxHp);

          state = pushPendingEffect(state, {
            ...topEffect,
            remainingTargets: rest,
          });
          if (needsTrigger) {
            state = pushPendingEffect(state, {
              kind: 'RESOLVE_SCROLL',
              cancelled: false,
              casterSeat: topEffect.casterSeat,
              targetSeat: nextTarget,
              scrollKey: topEffect.scrollKey,
              scrollCard: topEffect.scrollCard,
            });
            state = openNullificationWindow(
              state,
              nextTarget,
              topEffect.casterSeat,
              topEffect.scrollCard.nameVi,
            );
          }
          break;
        }
        case 'KU_ROU_DRAW': {
          const p = getPlayerBySeat(state, topEffect.seatIndex);
          if (p.alive) {
            const dealt = dealCardsToSeat(state, topEffect.seatIndex, 2, rng);
            state = {
              ...dealt.state,
              actionLog: [
                ...dealt.state.actionLog,
                `${p.displayName} kích hoạt Khổ Nhục, rút ${dealt.dealt.length} lá bài.`,
              ],
            };
          }
          break;
        }
        case 'FAN_JIAN_RECEIVE': {
          const receiver = getPlayerBySeat(state, topEffect.targetSeat);
          if (receiver.alive) {
            state = updatePlayer(state, topEffect.targetSeat, (p) => ({
              ...p,
              handCards: [...p.handCards, topEffect.card],
            }));
            state = { ...state, actionLog: [
              ...state.actionLog, `${receiver.displayName} nhận lá ${topEffect.card.nameVi} từ Phản Gián.`,
            ] };
          } else {
            state = appendToDiscardPile(state, [topEffect.card]);
          }
          break;
        }
        case 'APPLY_LIGHTNING_STRIKE': {
          const target = getPlayerBySeat(state, topEffect.targetSeat);
          if (target.alive) {
            // Chuẩn Yoka (2A): Thiểm Điện truyền [delayedCard] để Tào Tháo sống sót được nhặt qua Gian Hùng
            state = applyDamage(
              state,
              null,
              topEffect.targetSeat,
              3,
              'Thiểm Điện',
              [topEffect.delayedCard],
            );
          }
          break;
        }
        case 'CONTINUE_DELAYED_JUDGES': {
          const curPlayer = getPlayerBySeat(state, state.currentTurnSeat);
          if (!curPlayer.alive) {
            state = advanceToNextTurn(state);
            break;
          }
          const alreadyJudged = new Set(state.turnFlags?.judgedLightningIds ?? []);
          const skipPlayAlready = state.turnFlags?.skipPlayPhase ?? false;
          const remainingScrolls = curPlayer.delayedScrolls.filter(
            (c) =>
              !alreadyJudged.has(c.id) &&
              !(skipPlayAlready && c.cardKey === 'lac_bat_tu_thuc'),
          );
          if (remainingScrolls.length > 0) {
            const scrollToJudge = remainingScrolls[remainingScrolls.length - 1]!;
            state = pushPendingEffect(state, { kind: 'CONTINUE_DELAYED_JUDGES' });
            state = pushPendingEffect(state, {
              kind: 'RESOLVE_SCROLL',
              cancelled: false,
              casterSeat: state.currentTurnSeat,
              targetSeat: state.currentTurnSeat,
              scrollKey: scrollToJudge.cardKey,
              scrollCard: scrollToJudge,
            });
            state = openNullificationWindow(
              state,
              state.currentTurnSeat,
              state.currentTurnSeat,
              scrollToJudge.nameVi,
            );
          } else {
            state = { ...state, turnPhase: 'DRAW' };
          }
          break;
        }
      }
      continue;
    }

    const curPlayer = getPlayerBySeat(state, state.currentTurnSeat);
    if (!curPlayer.alive) {
      state = advanceToNextTurn(state);
      continue;
    }

    switch (state.turnPhase) {
      case 'JUDGE': {
        if (!state.turnFlags?.startSkillsChecked) {
          state = {
            ...state,
            turnFlags: {
              ...(state.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
              startSkillsChecked: true,
            },
          };
          const startHandler = getHeroSkillHandler(curPlayer.heroId, state);
          if (startHandler?.onTurnStart) {
            state = startHandler.onTurnStart(
              state,
              state.currentTurnSeat,
              rng,
              SKILL_RUNTIME,
            );
            if (state.interruptStack.length > 0 || (state.pendingEffects?.length ?? 0) > 0) {
              continue;
            }
          }
        }
        if (curPlayer.delayedScrolls.length > 0) {
          state = pushPendingEffect(state, { kind: 'CONTINUE_DELAYED_JUDGES' });
          const scrollToJudge =
            curPlayer.delayedScrolls[curPlayer.delayedScrolls.length - 1]!;
          state = pushPendingEffect(state, {
            kind: 'RESOLVE_SCROLL',
            cancelled: false,
            casterSeat: state.currentTurnSeat,
            targetSeat: state.currentTurnSeat,
            scrollKey: scrollToJudge.cardKey,
            scrollCard: scrollToJudge,
          });
          state = openNullificationWindow(
            state,
            state.currentTurnSeat,
            state.currentTurnSeat,
            scrollToJudge.nameVi,
          );
        } else {
          state = { ...state, turnPhase: 'DRAW' };
        }
        break;
      }
      case 'DRAW': {
        if (state.peacefulFirstRound && state.roundNumber === 1) {
          const skipPlay = state.turnFlags?.skipPlayPhase ?? false;
          state = {
            ...state,
            turnPhase: skipPlay ? 'DISCARD' : 'PLAY',
          };
          break;
        }
        if (!state.turnFlags?.drawSkillChecked) {
          state = {
            ...state,
            turnFlags: {
              ...(state.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
              drawSkillChecked: true,
            },
          };
          const drawHandler = getHeroSkillHandler(curPlayer.heroId, state);
          if (drawHandler?.onDrawPhase) {
            state = drawHandler.onDrawPhase(
              state,
              state.currentTurnSeat,
              rng,
              SKILL_RUNTIME,
            );
            if (state.interruptStack.length > 0) {
              continue;
            }
          }
        }
        if (state.manualDraw && (state.drawPile.length || state.discardPile.length)) return state;
        state = completeTurnDraw(state, rng);
        break;
      }
      case 'PLAY': {
        return state;
      }
      case 'DISCARD': {
        const limit = Math.max(0, curPlayer.hp);
        if (curPlayer.handCards.length <= limit) {
          state = { ...state, turnPhase: 'END' };
        } else {
          const discardHandler = getHeroSkillHandler(curPlayer.heroId, state);
          if (discardHandler?.onBeforeDiscardPhase && !state.turnFlags?.keJiChecked) {
            const flagged = {
              ...state,
              turnFlags: {
                ...(state.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
                keJiChecked: true,
              },
            };
            const afterKeJi = discardHandler.onBeforeDiscardPhase(
              flagged,
              state.currentTurnSeat,
              SKILL_RUNTIME,
            );
            if (afterKeJi !== flagged) {
              state = afterKeJi;
              continue;
            }
            state = flagged;
          }
          return state;
        }
        break;
      }
      case 'END': {
        if (!state.turnFlags?.endSkillChecked) {
          state = {
            ...state,
            turnFlags: {
              ...(state.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false }),
              endSkillChecked: true,
            },
          };
          const endHandler = getHeroSkillHandler(curPlayer.heroId, state);
          if (endHandler?.onTurnEnd) {
            state = endHandler.onTurnEnd(
              state,
              state.currentTurnSeat,
              rng,
              SKILL_RUNTIME,
            );
          }
        }
        state = advanceToNextTurn(state);
        break;
      }
    }
  }

  throw new Error('ENGINE_STEP_LIMIT_EXCEEDED');
}

export function turnDrawCount(state: MasterGameState): number {
  if (state.manualDraw && !state.turnFlags?.skipPlayPhase &&
    (state.turnFlags?.drawSecondAvailable ||
      getPlayerBySeat(state, state.currentTurnSeat).heroId === 'xu_chu')) return 1;
  const player = getPlayerBySeat(state, state.currentTurnSeat);
  return 2 + (getHeroSkillHandler(player.heroId, state)?.extraDrawCount?.(state, player) ?? 0);
}

export function completeTurnDraw(state: MasterGameState, rng: () => number): MasterGameState {
  const player = getPlayerBySeat(state, state.currentTurnSeat);
  const { state: drawn, dealt } = dealCardsToSeat(state, player.seatIndex, turnDrawCount(state), rng);
  const isYingZiDraw =
    player.heroId === 'zhou_yu' &&
    (getHeroSkillHandler(player.heroId, state)?.extraDrawCount?.(state, player) ?? 0) > 0 &&
    !drawn.turnFlags?.drawSecondAvailable;
  const drawLog = isYingZiDraw
    ? `${player.displayName} phát động Anh Tư, rút ${dealt.length} lá ở pha Rút bài.`
    : `${player.displayName} rút ${dealt.length} lá ở pha Rút bài.`;
  return {
    ...drawn,
    turnPhase: drawn.turnFlags?.skipPlayPhase ? 'DISCARD' : 'PLAY',
    actionLog: [...drawn.actionLog, drawLog],
  };
}

export function getPendingPrompt(state: MasterGameState): PendingPrompt | null {
  if (state.turnPhase === 'GAME_OVER') {
    return null;
  }

  if (state.turnPhase === 'HERO_SELECT' && state.heroDraft) {
    if (state.heroDraft.stage === 'LORD_SELECTING') {
      return {
        kind: 'HERO_SELECT_LORD',
        actorSeats: [state.heroDraft.lordSeatIndex],
        isSimulatedDelay: false,
      };
    }
    const missing = state.players
      .map((p) => p.seatIndex)
      .filter((seat) => state.heroDraft?.selectedBySeat[seat] === undefined);
    return {
      kind: 'HERO_SELECT_OTHERS',
      actorSeats: missing,
      isSimulatedDelay: false,
    };
  }

  const top = state.interruptStack[state.interruptStack.length - 1];
  if (top) {
    switch (top.kind) {
      case 'WAIT_NULLIFICATION':
        return {
          kind: top.kind,
          actorSeats: top.isSimulatedDelay
            ? []
            : top.eligibleSeats.filter((s) => !top.passedSeats.includes(s)),
          isSimulatedDelay: top.isSimulatedDelay,
        };
      case 'ASK_QUAN_THACH_PHU':
      case 'ASK_THANH_LONG':
      case 'ASK_HAN_BANG_KIEM':
      case 'ASK_KY_LAN_CUNG':
      case 'ASK_TIE_QI':
        return {
          kind: top.kind,
          actorSeats: [top.sourceSeat],
          isSimulatedDelay: false,
        };
      case 'PICK_TARGET_CARD':
        return {
          kind: top.kind,
          actorSeats: [top.handPick === 'PREPARE' ? top.targetSeat : top.sourceSeat],
          isSimulatedDelay: false,
        };
      case 'WAIT_COLLATERAL_SAT':
        return {
          kind: top.kind,
          actorSeats: [top.attackerSeat],
          isSimulatedDelay: false,
        };
      case 'WAIT_PEACH_RESCUE':
      case 'WAIT_JI_JIANG':
      case 'WAIT_HU_JIA':
        return {
          kind: top.kind,
          actorSeats: [top.responderSeat],
          isSimulatedDelay: false,
        };
      default:
        return {
          kind: top.kind,
          actorSeats: [top.targetSeat],
          isSimulatedDelay: false,
        };
    }
  }

  if (state.turnPhase === 'PLAY' || state.turnPhase === 'DISCARD' || state.turnPhase === 'DRAW' && state.manualDraw) {
    return {
      kind: state.turnPhase,
      actorSeats: [state.currentTurnSeat],
      isSimulatedDelay: false,
    };
  }

  return null;
}

export function performBaguaJudgment(
  state: MasterGameState,
  seatIndex: number,
  rng: () => number,
): { readonly state: MasterGameState; readonly success: boolean } {
  const player = getPlayerBySeat(state, seatIndex);
  const drawn = drawFromPile(state, 1, rng);
  let next = drawn.state;
  const judged = drawn.drawn[0];
  if (!judged) {
    return { state: next, success: false };
  }
  next = appendToDiscardPile(next, [judged]);
  const success = isRedSuit(judged.suit);
  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      `${player.displayName} phán xét Bát Quái Trận ra ${judged.nameVi} (${success ? 'chất Đỏ — tính là Thiểm' : 'chất Đen — thất bại'}).`,
    ],
  };
  return { state: next, success };
}
