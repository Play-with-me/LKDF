import {
  CUU_CHAU_HEROES,
  CUU_CHAU_HERO_SKILLS,
  isCuuChauRuleset,
} from '../content/cuuChauPack.js';
import type { HeroId } from '../types/game.js';
import type { HeroSkillHandler } from './skillContracts.js';
import { SHU_HERO_SKILLS } from './skills/shu.js';
import { WEI_HERO_SKILLS } from './skills/wei.js';
import { WU_QUN_HERO_SKILLS } from './skills/wuQun.js';

export const HERO_SKILL_REGISTRY: Partial<Record<HeroId, HeroSkillHandler>> = {
  ...SHU_HERO_SKILLS,
  ...WEI_HERO_SKILLS,
  ...WU_QUN_HERO_SKILLS,
};

const CUU_CHAU_HANDLER_BY_ID: Readonly<Record<string, HeroSkillHandler>> = (() => {
  const map: Record<string, HeroSkillHandler> = {};
  for (const h of CUU_CHAU_HEROES) {
    const base = HERO_SKILL_REGISTRY[h.legacySlotId];
    const override = CUU_CHAU_HERO_SKILLS[h.id];
    if (!base && !override) continue;

    let composed: HeroSkillHandler = {
      ...(base ?? { heroId: h.id }),
      ...(override ?? {}),
      heroId: h.legacySlotId,
    };

    // Viêm Liệt Vương (sun_quan): zhi_heng rút thêm +1 lá nếu tay còn <= 1 lá sau khi bỏ
    if (h.id === 'viem_liet_vuong' && base?.executePlaySkill) {
      const baseExecute = base.executePlaySkill;
      composed = {
        ...composed,
        executePlaySkill(state, action, rng, rt) {
          const beforePlayer = rt.getPlayerBySeat(state, action.seatIndex);
          const discardSet = new Set(action.cardIds ?? []);
          const remainingHandCount = beforePlayer.handCards.filter(
            (c) => !discardSet.has(c.id),
          ).length;
          let next = baseExecute(state, action, rng, rt);
          if (action.skillId === 'zhi_heng' && remainingHandCount <= 1) {
            next = rt.dealCardsToSeat(next, action.seatIndex, 1, rng).state;
          }
          return next;
        },
      };
    }

    // Hoàng Bất Dịch (huang_gai): lần đầu Phần Tâm Quyết trong lượt cấp thêm +1 lượt Kiếm Trảm
    if (h.id === 'hoang_bat_dich' && base?.executePlaySkill) {
      const baseExecute = base.executePlaySkill;
      composed = {
        ...composed,
        executePlaySkill(state, action, rng, rt) {
          const hadBonus = Boolean(state.turnFlags?.kuRouBonusGrantedThisTurn);
          let next = baseExecute(state, action, rng, rt);
          if (action.skillId === 'ku_rou' && !hadBonus) {
            const prevFlags = next.turnFlags ?? { satUsedThisTurn: 0, skipPlayPhase: false };
            next = {
              ...next,
              turnFlags: {
                ...prevFlags,
                kuRouBonusGrantedThisTurn: true,
                bonusSatLimitThisTurn: (prevFlags.bonusSatLimitThisTurn ?? 0) + 1,
              },
            };
          }
          return next;
        },
      };
    }

    // Dược Vô Ưu (hua_tuo): Thanh Tâm Đan chữa cho đồng đội khác bản thân giúp rút thêm 1 lá
    if (h.id === 'duoc_vo_uu' && base?.executePlaySkill) {
      const baseExecute = base.executePlaySkill;
      composed = {
        ...composed,
        executePlaySkill(state, action, rng, rt) {
          let next = baseExecute(state, action, rng, rt);
          const targetSeat = action.targetSeats?.[0];
          if (
            action.skillId === 'qing_nang' &&
            targetSeat !== undefined &&
            targetSeat !== action.seatIndex
          ) {
            const actor = rt.getPlayerBySeat(next, action.seatIndex);
            if (actor.alive) {
              const dealt = rt.dealCardsToSeat(next, action.seatIndex, 1, rng);
              next = {
                ...dealt.state,
                actionLog: [
                  ...dealt.state.actionLog,
                  `${actor.displayName} kích hoạt Thanh Tâm Đan, rút thêm ${dealt.dealt.length} lá bài.`,
                ],
              };
            }
          }
          return next;
        },
      };
    }

    map[h.id] = composed;
    map[h.legacySlotId] = composed;
  }
  return map;
})();

let skillLookupHook: ((heroId: HeroId | null) => HeroSkillHandler | undefined) | null = null;

export function setHeroSkillRegistryLookup(
  fn: (heroId: HeroId | null) => HeroSkillHandler | undefined,
): void {
  skillLookupHook = fn;
}

export function getHeroSkillHandler(
  heroId: HeroId | null,
  stateOrView?: { readonly enabledPacks?: readonly string[] } | null,
): HeroSkillHandler | undefined {
  if (!heroId) {
    return undefined;
  }
  if (isCuuChauRuleset(stateOrView)) {
    return CUU_CHAU_HANDLER_BY_ID[heroId] ?? skillLookupHook?.(heroId) ?? HERO_SKILL_REGISTRY[heroId];
  }
  return skillLookupHook?.(heroId) ?? HERO_SKILL_REGISTRY[heroId];
}
