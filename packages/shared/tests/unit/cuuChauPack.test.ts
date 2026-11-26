import { describe, expect, it } from 'vitest';
import {
  CUU_CHAU_CORE_PACK,
  CUU_CHAU_DECK_TEMPLATES,
  CUU_CHAU_FACTIONS,
  CUU_CHAU_HEROES,
  CUU_CHAU_HERO_SKILLS,
  CUU_CHAU_REMIXED_HERO_IDS,
  CUU_CHAU_ROLES,
  applyGameAction,
  autoSelectTimedOutHeroes,
  createCuuChau112Deck,
  createInitialMatchSetup,
  decideBotAction,
  getCuuChauCardDisplay,
  getCuuChauHeroDisplay,
  getPendingPrompt,
  projectStateForPlayer,
  startMatchCombat,
  type PlayerCount,
  type SetupSeatInput,
} from '../../src/index.js';

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeSeats(count: PlayerCount): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `cc-user-${count}-${idx}`,
    displayName: `Bot-${idx + 1}`,
    avatarUrl: '',
  }));
}

const BANNED_IP_PATTERN =
  /Tam Quốc|Tam Quoc|Lưu Bị|Quan Vũ|Trương Phi|Gia Cát|Triệu Vân|Mã Siêu|Hoàng Nguyệt Anh|Tào Tháo|Tư Mã Ý|Hạ Hầu Đôn|Trương Liêu|Hứa Chử|Quách Gia|Chân Cơ|Tôn Quyền|Cam Ninh|Lữ Mông|Hoàng Cái|Chu Du|Đại Kiều|Lục Tốn|Tôn Thượng Hương|Hoa Đà|Lữ Bố|Điêu Thuyền|Xích Thố|Đào Viên|Nam Man|Thanh Long Yển Nguyệt|Phương Thiên Họa Kích|Từ Hùng|Lạc Bất Tư Thục|Yoka|蜀|魏|吳|群/i;

describe('Cửu Châu Ẩn Kiếm Original IP Core Pack', () => {
  it('defines 4 original sects with clean emblems and 4 original hidden roles', () => {
    expect(CUU_CHAU_FACTIONS).toHaveLength(4);
    expect(CUU_CHAU_FACTIONS.map((f) => f.emblem)).toEqual(['雲', '鐵', '炎', '影']);
    expect(CUU_CHAU_ROLES).toHaveLength(4);
    for (const f of CUU_CHAU_FACTIONS) {
      expect(f.name.vi.length).toBeGreaterThan(2);
      expect(f.name.en.length).toBeGreaterThan(2);
      expect(BANNED_IP_PATTERN.test(`${f.emblem} ${f.name.vi} ${f.name.en}`)).toBe(false);
    }
    for (const r of CUU_CHAU_ROLES) {
      expect(BANNED_IP_PATTERN.test(`${r.name.vi} ${r.name.en} ${r.description.vi} ${r.description.en}`)).toBe(false);
    }
  });

  it('defines 25 original bilingual heroes with 0 Three Kingdoms IP names and 10 remixed skill kits', () => {
    expect(CUU_CHAU_HEROES).toHaveLength(25);
    expect(new Set(CUU_CHAU_HEROES.map((h) => h.id)).size).toBe(25);
    expect(CUU_CHAU_REMIXED_HERO_IDS).toHaveLength(10);

    for (const hero of CUU_CHAU_HEROES) {
      expect(hero.nameVi.length).toBeGreaterThan(2);
      expect(hero.nameEn && hero.nameEn.length > 2).toBe(true);
      expect(hero.skills.length).toBeGreaterThan(0);

      const viDisp = getCuuChauHeroDisplay(hero.id, 'vi');
      const enDisp = getCuuChauHeroDisplay(hero.id, 'en');
      expect(viDisp?.name).toBe(hero.nameVi);
      expect(enDisp?.name).toBe(hero.nameEn);

      const blob = [
        hero.nameVi,
        hero.nameEn ?? '',
        hero.factionLabelVi,
        hero.factionLabelEn ?? '',
        ...hero.skills.flatMap((s) => [s.nameVi, s.nameEn ?? '', s.descriptionVi, s.descriptionEn ?? '']),
      ].join(' | ');
      expect(BANNED_IP_PATTERN.test(blob)).toBe(false);
    }

    for (const remixId of CUU_CHAU_REMIXED_HERO_IDS) {
      expect(CUU_CHAU_HERO_SKILLS[remixId]).toBeDefined();
    }
    expect(CUU_CHAU_CORE_PACK.manifest.id).toBe('cuu_chau_core');
    expect(CUU_CHAU_CORE_PACK.heroes).toHaveLength(25);
  });

  it('breaks the 108-card Yoka matrix into an original 112-card (28/28/28/28) bilingual deck', () => {
    expect(CUU_CHAU_DECK_TEMPLATES).toHaveLength(112);

    const suitCounts = { SPADE: 0, HEART: 0, CLUB: 0, DIAMOND: 0 };
    for (const tpl of CUU_CHAU_DECK_TEMPLATES) {
      suitCounts[tpl.suit] += 1;
      const vi = getCuuChauCardDisplay(tpl.cardKey, 'vi');
      const en = getCuuChauCardDisplay(tpl.cardKey, 'en');
      expect(vi.name.length).toBeGreaterThan(1);
      expect(en.name.length).toBeGreaterThan(1);
      expect(BANNED_IP_PATTERN.test(`${vi.name} ${en.name} ${vi.description} ${en.description}`)).toBe(false);
    }
    expect(suitCounts).toEqual({ SPADE: 28, HEART: 28, CLUB: 28, DIAMOND: 28 });

    const deck = createCuuChau112Deck(createSeededRng(7));
    expect(deck).toHaveLength(112);
    expect(deck[0]?.nameEn?.length).toBeGreaterThan(0);
  });

  it('completes 50 headless simulated matches cleanly with the 112-card Cửu Châu deck', () => {
    for (let i = 0; i < 50; i += 1) {
      const playerCount = ([4, 5, 6, 7, 8] as const)[i % 5]!;
      const rng = createSeededRng(9000 + i);
      const seats = makeSeats(playerCount);
      let state = createInitialMatchSetup({
        matchId: `cc-fuzz-${i}`,
        seats,
        rng,
      });
      state = autoSelectTimedOutHeroes(state, rng);
      state = startMatchCombat(state, rng, { deckFactory: createCuuChau112Deck });

      let steps = 0;
      const MAX_STEPS = 4500;
      while (state.turnPhase !== 'GAME_OVER') {
        steps += 1;
        if (steps > MAX_STEPS) {
          const prompt = getPendingPrompt(state);
          throw new Error(
            `CUU_CHAU_FUZZ_TIMEOUT: count=${playerCount}, game=${i}, phase=${state.turnPhase}, prompt=${prompt?.kind ?? 'NONE'}`,
          );
        }
        const prompt = getPendingPrompt(state);
        if (!prompt) {
          throw new Error(`NO_PENDING_PROMPT: count=${playerCount}, game=${i}, phase=${state.turnPhase}`);
        }
        if (prompt.isSimulatedDelay) {
          state = applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }, rng);
          continue;
        }
        const actorSeat = prompt.actorSeats[0]!;
        const actorView = projectStateForPlayer(state, seats[actorSeat]!.userId);
        const nextAction = decideBotAction(actorView, rng);
        state = applyGameAction(state, nextAction, rng);
      }

      expect(state.turnPhase).toBe('GAME_OVER');
      expect(state.winningFaction).not.toBeNull();
    }
  });
});
