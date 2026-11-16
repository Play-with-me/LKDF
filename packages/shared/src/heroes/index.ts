import { STANDARD_HERO_IDS } from '../types/game.js';

/** Tổng số Tướng Bản Tiêu Chuẩn gốc trong v1. Triển khai kỹ năng đầy đủ tại Bước 1.3. */
export const STANDARD_HERO_COUNT = STANDARD_HERO_IDS.length;

export { STANDARD_HERO_IDS };
export { HERO_CATALOG, HERO_BY_ID, LORD_HERO_IDS, getHeroDefinition } from './catalog.js';
export { HERO_SKILL_REGISTRY, getHeroSkillHandler } from './registry.js';
export type { HeroSkillHandler, SkillRuntime } from './skillContracts.js';
