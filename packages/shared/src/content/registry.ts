import { z } from 'zod';
import { STANDARD_DECK_TEMPLATES, type CardTemplate } from '../cards/catalog.js';
import { shuffleArray } from '../utils/shuffle.js';
import {
  HERO_CATALOG,
  LORD_HERO_IDS,
  setHeroRegistryLookup,
} from '../heroes/catalog.js';
import {
  HERO_SKILL_REGISTRY,
  setHeroSkillRegistryLookup,
} from '../heroes/registry.js';
import type { HeroSkillHandler } from '../heroes/skillContracts.js';
import { LEGACY_PLAY_PHASE_SKILL_IDS } from '../engine/combatTypes.js';
import type { CardInstance, HeroDefinition } from '../types/game.js';
import type {
  CardBehaviorHandler,
  ContentPack,
  FactionDefinition,
  PackManifest,
} from './types.js';

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class ContentRegistry {
  private readonly packs = new Map<string, ContentPack>();
  private readonly factions = new Map<string, FactionDefinition>();
  private readonly heroes = new Map<string, HeroDefinition>();
  private readonly heroSkills = new Map<string, HeroSkillHandler>();
  private readonly playPhaseSkillIds = new Set<string>();
  private readonly cardTemplatesByKey = new Map<string, CardTemplate>();
  private readonly cardBehaviors = new Map<string, CardBehaviorHandler>();
  private cachedContentHash = '00000000';

  registerPack(pack: ContentPack): void {
    this.packs.set(pack.manifest.id, pack);
    this.rebuildIndexes();
  }

  private rebuildIndexes(): void {
    this.factions.clear();
    this.heroes.clear();
    this.heroSkills.clear();
    this.playPhaseSkillIds.clear();
    this.cardTemplatesByKey.clear();
    this.cardBehaviors.clear();

    const sortedPacks = [...this.packs.values()].sort((a, b) =>
      a.manifest.id.localeCompare(b.manifest.id),
    );

    const hashSegments: string[] = [];
    for (const pack of sortedPacks) {
      for (const faction of pack.factions) {
        this.factions.set(faction.id, faction);
      }
      for (const hero of pack.heroes) {
        this.heroes.set(hero.id, {
          ...hero,
          packId: hero.packId ?? pack.manifest.id,
        });
      }
      for (const [heroId, handler] of Object.entries(pack.heroSkills)) {
        if (handler) {
          this.heroSkills.set(heroId, handler);
        }
      }
      for (const skillId of pack.playPhaseSkillIds ?? []) {
        this.playPhaseSkillIds.add(skillId);
      }
      for (const tpl of pack.deckTemplates) {
        if (!this.cardTemplatesByKey.has(tpl.cardKey)) {
          this.cardTemplatesByKey.set(tpl.cardKey, tpl);
        }
      }
      for (const [cardKey, behavior] of Object.entries(pack.cardBehaviors ?? {})) {
        if (behavior) {
          this.cardBehaviors.set(cardKey, behavior);
        }
      }

      const heroSig = [...pack.manifest.heroIds].sort().join(',');
      const cardSig = [...pack.manifest.cardKeys].sort().join(',');
      hashSegments.push(
        `${pack.manifest.id}@${pack.manifest.version}#${pack.manifest.rulesetVersion}:[${heroSig}]:[${cardSig}]`,
      );
    }

    this.cachedContentHash =
      hashSegments.length === 0 ? '00000000' : fnv1aHex(hashSegments.join('|'));
  }

  getPack(packId: string): ContentPack | undefined {
    return this.packs.get(packId);
  }

  listPacks(): readonly ContentPack[] {
    return [...this.packs.values()];
  }

  getEnabledPackIds(): readonly string[] {
    return [...this.packs.keys()].sort();
  }

  getRulesetVersion(): string {
    return [...this.packs.values()]
      .map((p) => p.manifest.rulesetVersion)
      .sort()
      .join('+') || '0.0.0';
  }

  getContentHash(): string {
    return this.cachedContentHash;
  }

  getFaction(factionId: string): FactionDefinition | undefined {
    return this.factions.get(factionId);
  }

  listFactions(): readonly FactionDefinition[] {
    return [...this.factions.values()];
  }

  getHero(heroId: string): HeroDefinition | undefined {
    return this.heroes.get(heroId);
  }

  listHeroes(): readonly HeroDefinition[] {
    return [...this.heroes.values()];
  }

  isValidHeroId(heroId: string): boolean {
    return this.heroes.has(heroId);
  }

  getLordHeroIds(): readonly string[] {
    const ids = new Set<string>();
    for (const pack of this.packs.values()) {
      for (const heroId of pack.lordHeroIds) {
        if (this.heroes.has(heroId)) {
          ids.add(heroId);
        }
      }
    }
    return [...ids];
  }

  getHeroSkill(heroId: string | null): HeroSkillHandler | undefined {
    if (!heroId) return undefined;
    return this.heroSkills.get(heroId);
  }

  getCardTemplate(cardKey: string): CardTemplate | undefined {
    return this.cardTemplatesByKey.get(cardKey);
  }

  getDeckTemplates(): readonly CardTemplate[] {
    const templates: CardTemplate[] = [];
    for (const pack of this.packs.values()) {
      templates.push(...pack.deckTemplates);
    }
    return templates;
  }

  getCardBehavior(cardKey: string): CardBehaviorHandler | undefined {
    return this.cardBehaviors.get(cardKey);
  }

  isValidPlaySkillId(skillId: string): boolean {
    return this.playPhaseSkillIds.has(skillId);
  }

  createDeck(rng: () => number = Math.random): CardInstance[] {
    const instances: CardInstance[] = this.getDeckTemplates().map((tpl, index) => ({
      id: `c_${String(index + 1).padStart(3, '0')}_${tpl.cardKey}`,
      cardKey: tpl.cardKey,
      nameVi: tpl.nameVi,
      category: tpl.category,
      suit: tpl.suit,
      rank: tpl.rank,
      ...(tpl.attackRange !== undefined ? { attackRange: tpl.attackRange } : {}),
    }));
    return shuffleArray(instances, rng);
  }
}

export function createContentRegistry(
  initialPacks: readonly ContentPack[] = [],
): ContentRegistry {
  const registry = new ContentRegistry();
  for (const pack of initialPacks) {
    registry.registerPack(pack);
  }
  return registry;
}

const LEGACY_FACTIONS: readonly FactionDefinition[] = [
  {
    id: 'SHU',
    emblem: '蜀',
    name: { vi: 'Thục', en: 'Shu' },
    palette: {
      primary: '#EF4444',
      glow: '#FDE68A',
      bg: '#4E1816',
      border: '#C83E37',
      text: '#FCA5A5',
      badgeClass: 'border-[#C83E37]/60 bg-[#C83E37]/15 text-[#FCA5A5]',
      borderClass: 'border-[#C83E37]/75',
      nameTextClass: 'text-[#FCA5A5]',
      dotClass: 'bg-[#C83E37]',
    },
  },
  {
    id: 'WEI',
    emblem: '魏',
    name: { vi: 'Ngụy', en: 'Wei' },
    palette: {
      primary: '#38BDF8',
      glow: '#BAE6FD',
      bg: '#132746',
      border: '#3B82F6',
      text: '#93C5FD',
      badgeClass: 'border-[#3B82F6]/60 bg-[#3B82F6]/15 text-[#93C5FD]',
      borderClass: 'border-[#3B82F6]/75',
      nameTextClass: 'text-[#93C5FD]',
      dotClass: 'bg-[#3B82F6]',
    },
  },
  {
    id: 'WU',
    emblem: '吳',
    name: { vi: 'Ngô', en: 'Wu' },
    palette: {
      primary: '#34D399',
      glow: '#A7F3D0',
      bg: '#0E3427',
      border: '#10B981',
      text: '#6EE7B7',
      badgeClass: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
      borderClass: 'border-[#10B981]/75',
      nameTextClass: 'text-[#86EFAC]',
      dotClass: 'bg-[#10B981]',
    },
  },
  {
    id: 'QUN',
    emblem: '群',
    name: { vi: 'Quần', en: 'Qun' },
    palette: {
      primary: '#FBBF24',
      glow: '#FEF08A',
      bg: '#262A30',
      border: '#9CA3AF',
      text: '#E5E7EB',
      badgeClass: 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#D1D5DB]',
      borderClass: 'border-[#9CA3AF]/70',
      nameTextClass: 'text-[#E5E7EB]',
      dotClass: 'bg-[#9CA3AF]',
    },
  },
];

const LEGACY_CARD_KEYS = [...new Set(STANDARD_DECK_TEMPLATES.map((t) => t.cardKey))];
const LEGACY_MANIFEST: PackManifest = {
  id: 'legacy_standard',
  version: '1.0.0',
  rulesetVersion: '1.0.0',
  title: { vi: 'Bộ Chuẩn Tạm (Phase 1A)', en: 'Temporary Standard Pack (Phase 1A)' },
  isDlc: false,
  contentHash: fnv1aHex(
    `legacy_standard@1.0.0:${HERO_CATALOG.map((h) => h.id).sort().join(',')}:${[...LEGACY_CARD_KEYS].sort().join(',')}`,
  ),
  heroIds: HERO_CATALOG.map((h) => h.id),
  cardKeys: LEGACY_CARD_KEYS,
};

export const LEGACY_STANDARD_PACK: ContentPack = {
  manifest: LEGACY_MANIFEST,
  factions: LEGACY_FACTIONS,
  heroes: HERO_CATALOG,
  lordHeroIds: LORD_HERO_IDS,
  deckTemplates: STANDARD_DECK_TEMPLATES,
  heroSkills: HERO_SKILL_REGISTRY,
  playPhaseSkillIds: LEGACY_PLAY_PHASE_SKILL_IDS,
};

export const DEFAULT_CONTENT_REGISTRY = createContentRegistry([LEGACY_STANDARD_PACK]);

setHeroRegistryLookup((heroId) => DEFAULT_CONTENT_REGISTRY.getHero(heroId));
setHeroSkillRegistryLookup((heroId) => DEFAULT_CONTENT_REGISTRY.getHeroSkill(heroId));

export const RegisteredHeroIdSchema = z
  .string()
  .min(1)
  .refine((id) => DEFAULT_CONTENT_REGISTRY.isValidHeroId(id), {
    message: 'UNKNOWN_HERO_ID',
  });

export const RegisteredPlaySkillIdSchema = z
  .string()
  .min(1)
  .refine((id) => DEFAULT_CONTENT_REGISTRY.isValidPlaySkillId(id), {
    message: 'UNKNOWN_PLAY_SKILL_ID',
  });
