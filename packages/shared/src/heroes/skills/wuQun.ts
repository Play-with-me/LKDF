import { isBlackSuit, isRedSuit } from '../../cards/catalog.js';
import type { HeroId, MasterGameState, TurnFlags } from '../../types/game.js';
import type { HeroSkillHandler, SkillRuntime } from '../skillContracts.js';

function withTurnFlag(
  state: MasterGameState,
  patch: Partial<TurnFlags>,
): MasterGameState {
  return {
    ...state,
    turnFlags: {
      satUsedThisTurn: state.turnFlags?.satUsedThisTurn ?? 0,
      skipPlayPhase: state.turnFlags?.skipPlayPhase ?? false,
      ...state.turnFlags,
      ...patch,
    },
  };
}

function appendLog(state: MasterGameState, entry: string): MasterGameState {
  return {
    ...state,
    actionLog: [...state.actionLog, entry],
  };
}

export const WU_QUN_HERO_SKILLS: Partial<Record<HeroId, HeroSkillHandler>> = {
  // =========================================================================
  // PHE NGÔ (8 TƯỚNG)
  // =========================================================================

  sun_quan: {
    heroId: 'sun_quan',
    onPeachRescueBonus(_state, dyingPlayer, rescuer, rt) {
      if (
        dyingPlayer.identity === 'LORD' &&
        rescuer.seatIndex !== dyingPlayer.seatIndex &&
        rt.getHeroFaction(rescuer.heroId) === 'WU'
      ) {
        return 1;
      }
      return 0;
    },
    executePlaySkill(state, action, rng, rt) {
      if (action.skillId !== 'zhi_heng') {
        throw new Error(`Tôn Quyền không có kỹ năng chủ động ${action.skillId}.`);
      }
      if (state.turnFlags?.zhiHengUsedThisTurn) {
        throw new Error('Chế Hành chỉ được sử dụng 1 lần mỗi lượt.');
      }
      const cardIds = action.cardIds ?? [];
      if (cardIds.length === 0) {
        throw new Error('Chế Hành cần chọn ít nhất 1 lá bài để bỏ.');
      }
      if (new Set(cardIds).size !== cardIds.length) {
        throw new Error('Danh sách bài bỏ Chế Hành bị trùng lặp.');
      }

      const player = rt.getPlayerBySeat(state, action.seatIndex);
      let next = state;
      for (const cardId of cardIds) {
        next = rt.discardAnyCard(next, action.seatIndex, cardId, rng).state;
      }
      next = rt.dealCardsToSeat(next, action.seatIndex, cardIds.length, rng).state;
      next = withTurnFlag(next, { zhiHengUsedThisTurn: true });
      return appendLog(
        next,
        `${player.displayName} kích hoạt Chế Hành, bỏ ${cardIds.length} lá và rút lại ${cardIds.length} lá.`,
      );
    },
  },

  gan_ning: {
    heroId: 'gan_ning',
    canConvertCardAs(_state, _player, card, asCardKey) {
      return asCardKey === 'qua_ha_sai_cau' && isBlackSuit(card.suit);
    },
  },

  lu_meng: {
    heroId: 'lu_meng',
    onBeforeDiscardPhase(state, seatIndex, rt) {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (
        !player.alive ||
        state.turnFlags?.satPlayedOrUsedThisTurn ||
        player.handCards.length <= Math.max(0, player.hp)
      ) {
        return state;
      }
      const { state: s1, id } = rt.nextFrameId(state, 'keji');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_KE_JI',
        targetSeat: seatIndex,
      });
    },
  },

  huang_gai: {
    heroId: 'huang_gai',
    executePlaySkill(state, action, rng, rt) {
      if (action.skillId !== 'ku_rou') {
        throw new Error(`Hoàng Cái không có kỹ năng chủ động ${action.skillId}.`);
      }
      const player = rt.getPlayerBySeat(state, action.seatIndex);
      let next = rt.applyDamage(state, null, action.seatIndex, 1, 'Khổ Nhục');
      const after = rt.getPlayerBySeat(next, action.seatIndex);
      if (after.alive && after.hp > 0) {
        next = rt.dealCardsToSeat(next, action.seatIndex, 2, rng).state;
        next = appendLog(
          next,
          `${player.displayName} kích hoạt Khổ Nhục, rút 2 lá bài.`,
        );
      }
      return next;
    },
  },

  zhou_yu: {
    heroId: 'zhou_yu',
    extraDrawCount() {
      return 1;
    },
    executePlaySkill(state, action, _rng, rt) {
      if (action.skillId !== 'fan_jian') {
        throw new Error(`Chu Du không có kỹ năng chủ động ${action.skillId}.`);
      }
      if (state.turnFlags?.fanJianUsedThisTurn) {
        throw new Error('Phản Gián chỉ được sử dụng 1 lần mỗi lượt.');
      }
      const player = rt.getPlayerBySeat(state, action.seatIndex);
      if (player.handCards.length === 0) {
        throw new Error('Phản Gián yêu cầu có ít nhất 1 lá bài trên tay.');
      }
      const targetSeat = action.targetSeats?.[0];
      if (targetSeat === undefined || targetSeat === action.seatIndex) {
        throw new Error('Phản Gián cần chọn 1 mục tiêu khác.');
      }
      const target = rt.getPlayerBySeat(state, targetSeat);
      if (!target.alive) {
        throw new Error('Mục tiêu Phản Gián đã tử vong.');
      }

      let next = withTurnFlag(state, { fanJianUsedThisTurn: true });
      const { state: s1, id } = rt.nextFrameId(next, 'fanjian');
      next = rt.pushInterrupt(s1, {
        id,
        kind: 'WAIT_FAN_JIAN_GUESS',
        targetSeat,
        sourceSeat: action.seatIndex,
      });
      return appendLog(
        next,
        `${player.displayName} phát động Phản Gián lên ${target.displayName}.`,
      );
    },
  },

  da_qiao: {
    heroId: 'da_qiao',
    canConvertCardAs(_state, _player, card, asCardKey) {
      return asCardKey === 'lac_bat_tu_thuc' && card.suit === 'DIAMOND';
    },
    onStrikeTargeted(
      state,
      sourceSeat,
      targetSeat,
      strikeCards,
      isCollateral,
      isFangTian,
      rt,
    ) {
      const target = rt.getPlayerBySeat(state, targetSeat);
      if (!target.alive || !rt.hasAnyCardInHandOrEquip(target)) {
        return state;
      }
      const hasValidRedirect = state.players.some(
        (p) =>
          p.alive &&
          p.seatIndex !== targetSeat &&
          p.seatIndex !== sourceSeat &&
          !(p.heroId === 'zhuge_liang' && p.handCards.length === 0) &&
          rt.isInAttackRange(state, targetSeat, p.seatIndex),
      );
      if (!hasValidRedirect) {
        return state;
      }

      const { state: s1, id } = rt.nextFrameId(state, 'liuli');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_LIU_LI',
        targetSeat,
        sourceSeat,
        strikeCards,
        isCollateralStrike: isCollateral,
        isFangTianMultiTarget: isFangTian,
      });
    },
  },

  lu_xun: {
    heroId: 'lu_xun',
    canBeTargetedBy(_state, _target, cardKey) {
      return cardKey !== 'thuan_thu_khien_duong' && cardKey !== 'lac_bat_tu_thuc';
    },
    onHandCardsLost(state, seatIndex, prevHandCount, rng, rt) {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (!player.alive || prevHandCount <= 0 || player.handCards.length > 0) {
        return state;
      }
      const next = rt.dealCardsToSeat(state, seatIndex, 1, rng).state;
      return appendLog(
        next,
        `${player.displayName} kích hoạt Liên Doanh, rút 1 lá bài.`,
      );
    },
  },

  sun_shang_xiang: {
    heroId: 'sun_shang_xiang',
    onEquipLost(state, seatIndex, lostCount, rng, rt) {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (!player.alive || lostCount <= 0) {
        return state;
      }
      const drawCount = lostCount * 2;
      const next = rt.dealCardsToSeat(state, seatIndex, drawCount, rng).state;
      return appendLog(
        next,
        `${player.displayName} kích hoạt Kiêu Cơ, rút ${drawCount} lá bài.`,
      );
    },
    executePlaySkill(state, action, rng, rt) {
      if (action.skillId !== 'jie_yin') {
        throw new Error(
          `Tôn Thượng Hương không có kỹ năng chủ động ${action.skillId}.`,
        );
      }
      if (state.turnFlags?.jieYinUsedThisTurn) {
        throw new Error('Kết Hôn chỉ được sử dụng 1 lần mỗi lượt.');
      }
      const cardIds = action.cardIds ?? [];
      if (cardIds.length !== 2 || cardIds[0] === cardIds[1]) {
        throw new Error('Kết Hôn cần bỏ đúng 2 lá bài khác nhau trên tay.');
      }
      const targetSeat = action.targetSeats?.[0];
      if (targetSeat === undefined || targetSeat === action.seatIndex) {
        throw new Error('Kết Hôn cần chọn 1 tướng nam khác.');
      }
      const player = rt.getPlayerBySeat(state, action.seatIndex);
      const target = rt.getPlayerBySeat(state, targetSeat);
      if (!target.alive) {
        throw new Error('Mục tiêu Kết Hôn đã tử vong.');
      }
      if (rt.getHeroGender(target.heroId) !== 'MALE') {
        throw new Error('Kết Hôn chỉ có thể chọn tướng nam.');
      }
      if (target.hp >= target.maxHp) {
        throw new Error('Kết Hôn chỉ có thể chọn tướng nam đang bị thương.');
      }

      let next = rt.discardHandCards(state, action.seatIndex, cardIds, rng).state;
      next = rt.updatePlayer(next, action.seatIndex, (p) => ({
        ...p,
        hp: Math.min(p.maxHp, p.hp + 1),
      }));
      next = rt.updatePlayer(next, targetSeat, (p) => ({
        ...p,
        hp: Math.min(p.maxHp, p.hp + 1),
      }));
      next = withTurnFlag(next, { jieYinUsedThisTurn: true });
      return appendLog(
        next,
        `${player.displayName} kích hoạt Kết Hôn cùng ${target.displayName}, cả hai hồi 1 máu.`,
      );
    },
  },

  // =========================================================================
  // PHE QUẦN (3 TƯỚNG)
  // =========================================================================

  hua_tuo: {
    heroId: 'hua_tuo',
    canConvertCardAs(_state, _player, card, asCardKey, inTurn) {
      return asCardKey === 'dao' && !inTurn && isRedSuit(card.suit);
    },
    executePlaySkill(state, action, rng, rt) {
      if (action.skillId !== 'qing_nang') {
        throw new Error(`Hoa Đà không có kỹ năng chủ động ${action.skillId}.`);
      }
      if (state.turnFlags?.qingNangUsedThisTurn) {
        throw new Error('Thanh Nang chỉ được sử dụng 1 lần mỗi lượt.');
      }
      const cardIds = action.cardIds ?? [];
      if (cardIds.length !== 1) {
        throw new Error('Thanh Nang cần bỏ đúng 1 lá bài trên tay.');
      }
      const targetSeat = action.targetSeats?.[0];
      if (targetSeat === undefined) {
        throw new Error('Thanh Nang cần chọn 1 mục tiêu.');
      }
      const player = rt.getPlayerBySeat(state, action.seatIndex);
      const target = rt.getPlayerBySeat(state, targetSeat);
      if (!target.alive) {
        throw new Error('Mục tiêu Thanh Nang đã tử vong.');
      }
      if (target.hp >= target.maxHp) {
        throw new Error('Mục tiêu Thanh Nang đang đầy máu.');
      }

      let next = rt.discardHandCards(
        state,
        action.seatIndex,
        [cardIds[0]!],
        rng,
      ).state;
      next = rt.updatePlayer(next, targetSeat, (p) => ({
        ...p,
        hp: Math.min(p.maxHp, p.hp + 1),
      }));
      next = withTurnFlag(next, { qingNangUsedThisTurn: true });
      return appendLog(
        next,
        `${player.displayName} kích hoạt Thanh Nang, giúp ${target.displayName} hồi 1 máu.`,
      );
    },
  },

  lu_bu: {
    heroId: 'lu_bu',
    strikeDodgeRequiredCount() {
      return 2;
    },
    duelSatRequiredCount() {
      return 2;
    },
  },

  diao_chan: {
    heroId: 'diao_chan',
    onTurnEnd(state, seatIndex, rng, rt) {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (!player.alive) {
        return state;
      }
      const next = rt.dealCardsToSeat(state, seatIndex, 1, rng).state;
      return appendLog(
        next,
        `${player.displayName} kích hoạt Bế Nguyệt, rút 1 lá bài.`,
      );
    },
    executePlaySkill(state, action, rng, rt) {
      if (action.skillId !== 'li_jian') {
        throw new Error(
          `Điêu Thuyền không có kỹ năng chủ động ${action.skillId}.`,
        );
      }
      if (state.turnFlags?.liJianUsedThisTurn) {
        throw new Error('Ly Gián chỉ được sử dụng 1 lần mỗi lượt.');
      }
      const cardIds = action.cardIds ?? [];
      if (cardIds.length !== 1) {
        throw new Error('Ly Gián cần bỏ đúng 1 lá bài.');
      }
      const targets = action.targetSeats ?? [];
      if (targets.length !== 2 || targets[0] === targets[1]) {
        throw new Error('Ly Gián cần chọn 2 tướng nam khác nhau.');
      }
      const [firstSeat, secondSeat] = targets as [number, number];
      const player = rt.getPlayerBySeat(state, action.seatIndex);
      const p1 = rt.getPlayerBySeat(state, firstSeat);
      const p2 = rt.getPlayerBySeat(state, secondSeat);
      if (!p1.alive || !p2.alive) {
        throw new Error('Mục tiêu Ly Gián đã tử vong.');
      }
      if (
        rt.getHeroGender(p1.heroId) !== 'MALE' ||
        rt.getHeroGender(p2.heroId) !== 'MALE'
      ) {
        throw new Error('Ly Gián chỉ có thể chọn 2 tướng nam.');
      }

      let next = rt.discardAnyCard(state, action.seatIndex, cardIds[0]!, rng).state;
      next = withTurnFlag(next, { liJianUsedThisTurn: true });
      const requiredCount = p1.heroId === 'lu_bu' ? 2 : 1;
      const { state: s1, id } = rt.nextFrameId(next, 'duel');
      next = rt.pushInterrupt(s1, {
        id,
        kind: 'WAIT_DUEL_SAT',
        targetSeat: secondSeat,
        otherSeat: firstSeat,
        casterSeat: firstSeat,
        requiredCount,
        playedSoFar: 0,
      });
      return appendLog(
        next,
        `${player.displayName} kích hoạt Ly Gián, buộc ${p1.displayName} và ${p2.displayName} Quyết Đấu!`,
      );
    },
  },
};
