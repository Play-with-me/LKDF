import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT_REGISTRY,
  LEGACY_STANDARD_PACK,
  RegisteredHeroIdSchema,
  RegisteredPlaySkillIdSchema,
  createContentRegistry,
  type ContentPack,
} from '../../src/index.js';

describe('ContentRegistry & DLC PackManifest', () => {
  it('loads legacy_standard pack with 25 heroes, 108 cards, 4 factions, and deterministic hash', () => {
    expect(DEFAULT_CONTENT_REGISTRY.getEnabledPackIds()).toEqual(['legacy_standard']);
    expect(DEFAULT_CONTENT_REGISTRY.listHeroes()).toHaveLength(25);
    expect(DEFAULT_CONTENT_REGISTRY.getDeckTemplates()).toHaveLength(108);
    expect(DEFAULT_CONTENT_REGISTRY.listFactions()).toHaveLength(4);
    expect(DEFAULT_CONTENT_REGISTRY.getLordHeroIds()).toHaveLength(3);
    expect(DEFAULT_CONTENT_REGISTRY.getRulesetVersion()).toBe('1.0.0');
    expect(DEFAULT_CONTENT_REGISTRY.getContentHash()).toMatch(/^[0-9a-f]{8}$/);
    expect(RegisteredHeroIdSchema.safeParse('liu_bei').success).toBe(true);
    expect(RegisteredHeroIdSchema.safeParse('unknown_dlc_hero').success).toBe(false);
    expect(RegisteredPlaySkillIdSchema.safeParse('ren_de').success).toBe(true);
    expect(RegisteredPlaySkillIdSchema.safeParse('not_a_skill').success).toBe(false);
  });

  it('registers a mock DLC pack dynamically on an isolated registry without mutating base state', () => {
    const isolated = createContentRegistry([LEGACY_STANDARD_PACK]);
    const baseHash = isolated.getContentHash();

    const mockDlc: ContentPack = {
      manifest: {
        id: 'dlc_mock_01',
        version: '0.1.0',
        rulesetVersion: '1.1.0',
        title: { vi: 'Gói Thử Nghiệm 01', en: 'Mock DLC 01' },
        isDlc: true,
        contentHash: 'mock0001',
        heroIds: ['han_phi_test'],
        cardKeys: ['phi_kiem_test'],
      },
      factions: [
        {
          id: 'LINH_SO',
          emblem: '霄',
          name: { vi: 'Linh Tiêu', en: 'Spirit Crest' },
          palette: {
            primary: '#A855F7',
            glow: '#E9D5FF',
            bg: '#2A1842',
            border: '#A855F7',
            text: '#E9D5FF',
            badgeClass: 'border-[#A855F7]/60 bg-[#A855F7]/15 text-[#E9D5FF]',
            borderClass: 'border-[#A855F7]/75',
            nameTextClass: 'text-[#E9D5FF]',
            dotClass: 'bg-[#A855F7]',
          },
        },
      ],
      heroes: [
        {
          id: 'han_phi_test',
          nameVi: 'Hàn Phi Tử (Thử)',
          nameEn: 'Han Fei (Mock)',
          faction: 'LINH_SO',
          factionLabelVi: 'Linh Tiêu',
          factionLabelEn: 'Spirit Crest',
          baseMaxHp: 4,
          gender: 'MALE',
          isLordCandidate: false,
          skills: [
            {
              id: 'mock_skill_alpha',
              nameVi: 'Lục Ấn',
              nameEn: 'Six Seals',
              descriptionVi: 'Kỹ năng thử nghiệm DLC.',
              descriptionEn: 'Mock DLC skill.',
            },
          ],
        },
      ],
      lordHeroIds: [],
      deckTemplates: [
        {
          cardKey: 'phi_kiem_test',
          nameVi: 'Phi Kiếm (Thử)',
          category: 'WEAPON',
          suit: 'SPADE',
          rank: 9,
          attackRange: 3,
          descriptionVi: 'Vũ khí thử nghiệm DLC.',
        },
      ],
      heroSkills: {
        han_phi_test: {
          heroId: 'han_phi_test',
          unlimitedSat: true,
        },
      },
      playPhaseSkillIds: ['mock_skill_alpha'],
    };

    isolated.registerPack(mockDlc);

    expect(isolated.getEnabledPackIds()).toEqual(['dlc_mock_01', 'legacy_standard']);
    expect(isolated.listHeroes()).toHaveLength(26);
    expect(isolated.getDeckTemplates()).toHaveLength(109);
    expect(isolated.isValidHeroId('han_phi_test')).toBe(true);
    expect(isolated.getHero('han_phi_test')?.packId).toBe('dlc_mock_01');
    expect(isolated.getFaction('LINH_SO')?.emblem).toBe('霄');
    expect(isolated.getHeroSkill('han_phi_test')?.unlimitedSat).toBe(true);
    expect(isolated.isValidPlaySkillId('mock_skill_alpha')).toBe(true);
    expect(isolated.getContentHash()).not.toBe(baseHash);

    // Ensure DEFAULT_CONTENT_REGISTRY was not mutated
    expect(DEFAULT_CONTENT_REGISTRY.listHeroes()).toHaveLength(25);
    expect(DEFAULT_CONTENT_REGISTRY.isValidHeroId('han_phi_test')).toBe(false);
  });
});
