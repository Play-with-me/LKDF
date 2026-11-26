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
