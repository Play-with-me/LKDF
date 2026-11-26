import type { CardTemplate } from '../cards/catalog.js';
import type { HeroSkillHandler, SkillRuntime } from '../heroes/skillContracts.js';
import type {
  CardCategory,
  CardInstance,
  HeroDefinition,
  MasterGameState,
} from '../types/game.js';
import type { IdentityRole } from '../types/identity.js';

export interface LocalizedText {
  readonly vi: string;
  readonly en: string;
}

export interface FactionPalette {
  readonly primary: string;
  readonly glow: string;
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly badgeClass: string;
  readonly borderClass: string;
  readonly nameTextClass: string;
  readonly dotClass: string;
}

export interface FactionDefinition {
  readonly id: string;
  readonly emblem: string;
  readonly name: LocalizedText;
  readonly palette: FactionPalette;
}

export interface RoleDefinition {
  readonly id: IdentityRole;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
}

export interface PackManifest {
  readonly id: string;
  readonly version: string;
  readonly rulesetVersion: string;
  readonly title: LocalizedText;
  readonly isDlc: boolean;
  readonly contentHash: string;
  readonly heroIds: readonly string[];
  readonly cardKeys: readonly string[];
}

export interface CardBehaviorContext {
  readonly casterSeat: number;
  readonly targetSeat?: number;
  readonly secondarySeat?: number;
  readonly card: CardInstance;
}

export interface CardBehaviorHandler {
  readonly cardKey: string;
  readonly category: CardCategory;
  readonly attackRange?: number;
  readonly canTarget?: (
    state: MasterGameState,
    sourceSeat: number,
    targetSeat: number,
  ) => boolean;
  readonly resolveEffect?: (
    state: MasterGameState,
    context: CardBehaviorContext,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
}

export interface ContentPack {
  readonly manifest: PackManifest;
  readonly factions: readonly FactionDefinition[];
  readonly roles?: readonly RoleDefinition[];
  readonly heroes: readonly HeroDefinition[];
  readonly lordHeroIds: readonly string[];
  readonly deckTemplates: readonly CardTemplate[];
  readonly heroSkills: Readonly<Partial<Record<string, HeroSkillHandler>>>;
  readonly playPhaseSkillIds?: readonly string[];
  readonly cardBehaviors?: Readonly<Partial<Record<string, CardBehaviorHandler>>>;
}
