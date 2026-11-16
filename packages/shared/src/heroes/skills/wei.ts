import { isBlackSuit } from '../../cards/catalog.js';
import type { HeroId } from '../../types/game.js';
import type { HeroSkillHandler } from '../skillContracts.js';

/**
 * Bộ kỹ năng 7 tướng phe Ngụy (Chuẩn Bản Tiêu Chuẩn):
 * - Tào Tháo: Gian Hùng, Hộ Giá (Chủ Công)
 * - Tư Mã Ý: Phản Quỷ, Quỷ Tài
 * - Hạ Hầu Đôn: Cương Liệt
 * - Trương Liêu: Đột Tập
 * - Hứa Chử: Lỏa Y
 * - Quách Gia: Thiên Đố, Di Kế
 * - Chân Cơ: Lạc Thần, Khuynh Quốc
 */
export const WEI_HERO_SKILLS: Partial<Record<HeroId, HeroSkillHandler>> = {
  cao_cao: {
    heroId: 'cao_cao',
    onAfterDamageTaken(state, targetSeat, _sourceSeat, _amount, damageCards, _rng, rt) {
      if (damageCards.length === 0) {
        return state;
      }
      const { state: s1, id } = rt.nextFrameId(state, 'jian_xiong');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_JIAN_XIONG',
        targetSeat,
        damageCards,
      });
    },
  },

  si_ma_yi: {
    heroId: 'si_ma_yi',
    onAfterDamageTaken(state, targetSeat, sourceSeat, _amount, _damageCards, _rng, rt) {
      if (sourceSeat === null || sourceSeat === targetSeat) {
        return state;
      }
      const source = rt.getPlayerBySeat(state, sourceSeat);
      if (!source.alive || !rt.hasAnyCardInHandOrEquip(source)) {
        return state;
      }
      const { state: s1, id } = rt.nextFrameId(state, 'fan_kui');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_FAN_KUI',
        targetSeat,
        sourceSeat,
      });
    },
  },

  xia_hou_dun: {
    heroId: 'xia_hou_dun',
    onAfterDamageTaken(state, targetSeat, sourceSeat, _amount, _damageCards, _rng, rt) {
      if (sourceSeat === null) {
        return state;
      }
      const source = rt.getPlayerBySeat(state, sourceSeat);
      if (!source.alive) {
        return state;
      }
      const { state: s1, id } = rt.nextFrameId(state, 'gang_lie');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_GANG_LIE',
        targetSeat,
        sourceSeat,
      });
    },
  },

  zhang_liao: {
    heroId: 'zhang_liao',
    onDrawPhase(state, seatIndex, _rng, rt) {
      const others = rt.getClockwiseAliveSeats(state, seatIndex, false);
      const hasTargetWithHand = others.some(
        (s) => rt.getPlayerBySeat(state, s).handCards.length > 0,
      );
      if (!hasTargetWithHand) {
        return state;
      }
      const { state: s1, id } = rt.nextFrameId(state, 'tu_xi');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'WAIT_TU_XI',
        targetSeat: seatIndex,
      });
    },
  },

  xu_chu: {
    heroId: 'xu_chu',
    onDrawPhase(state, seatIndex, _rng, rt) {
      const { state: s1, id } = rt.nextFrameId(state, 'luo_yi');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_LUO_YI',
        targetSeat: seatIndex,
      });
    },
  },

  guo_jia: {
    heroId: 'guo_jia',
    onAfterDamageTaken(state, targetSeat, _sourceSeat, amount, _damageCards, rng, rt) {
      if (amount <= 0) {
        return state;
      }
      const { state: s1, drawn } = rt.drawFromPile(state, 2, rng);
      if (drawn.length === 0) {
        return s1;
      }
      let next = s1;
      if (amount > 1) {
        next = rt.pushPendingEffect(next, {
          kind: 'CONTINUE_YI_JI',
          targetSeat,
          remainingTriggers: amount - 1,
        });
      }
      const { state: s2, id } = rt.nextFrameId(next, 'yi_ji');
      return rt.pushInterrupt(s2, {
        id,
        kind: 'WAIT_YI_JI',
        targetSeat,
        cards: drawn,
      });
    },
    onAfterJudgmentEffective(state, judgeOwnerSeat, judgeCard, rt) {
      const { state: s1, id } = rt.nextFrameId(state, 'tian_du');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_TIAN_DO',
        targetSeat: judgeOwnerSeat,
        judgeCard,
      });
    },
  },

  zhen_ji: {
    heroId: 'zhen_ji',
    canConvertCardAs(_state, _player, card, asCardKey) {
      return asCardKey === 'thiem' && isBlackSuit(card.suit);
    },
    onTurnStart(state, seatIndex, _rng, rt) {
      const { state: s1, id } = rt.nextFrameId(state, 'luo_shen');
      return rt.pushInterrupt(s1, {
        id,
        kind: 'ASK_LUO_SHEN',
        targetSeat: seatIndex,
      });
    },
  },
};
