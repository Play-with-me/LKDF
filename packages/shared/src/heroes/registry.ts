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

export function getHeroSkillHandler(
  heroId: HeroId | null,
): HeroSkillHandler | undefined {
  if (!heroId) {
    return undefined;
  }
  return HERO_SKILL_REGISTRY[heroId];
}
