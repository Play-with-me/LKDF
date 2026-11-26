import { describe, expect, it } from 'vitest';
import {
  STANDARD_HERO_IDS,
  applyGameAction,
  chooseBotHero,
  createCuuChau112Deck,
  createInitialMatchSetup,
  decideBotAction,
  getPendingPrompt,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
  type MasterGameState,
  type PlayerCount,
  type PlayerViewState,
  type SetupSeatInput,
} from '../../src/index.js';

const NEW_CUU_CHAU_CARD_KEYS = [
  'pha_giap_tram',
  'chan_khi_ho_the',
  'kinh_loi_chan',
  'hoan_anh_giap',
  'tu_khi_hoan',
] as const;

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeSeats(count: PlayerCount): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `cc-fuzz-user-${count}-${idx}`,
    displayName: `Bot-${idx + 1}`,
    avatarUrl: '',
  }));
}

function assertViewPrivacyStrict(
  master: MasterGameState,
  view: PlayerViewState,
  viewerSeat: number,
): void {
  const isGameOver = master.turnPhase === 'GAME_OVER';
  const folding =
    view.activeInterrupt?.handPick === 'SELECT' &&
    view.activeInterrupt.targetSeat === viewerSeat;

  for (const pub of view.players) {
    if (pub.seatIndex === viewerSeat && !folding) {
      expect(pub.handCards).not.toBeNull();
    } else {
      expect(pub.handCards).toBeNull();
      const masterPlayer =
        master.players[pub.seatIndex]?.seatIndex === pub.seatIndex
          ? master.players[pub.seatIndex]!
          : master.players.find((p) => p.seatIndex === pub.seatIndex)!;
      const shouldReveal =
        pub.seatIndex === viewerSeat ||
        masterPlayer.isIdentityRevealed ||
        !masterPlayer.alive ||
        isGameOver;
      if (!shouldReveal) {
        expect(pub.identity).toBe('UNKNOWN');
      }
    }
  }

  if (view.activeInterrupt) {
    expect('isSimulatedDelay' in view.activeInterrupt).toBe(false);
    expect('eligibleSeats' in view.activeInterrupt).toBe(false);
    if (view.activeInterrupt.targetSeat !== viewerSeat) {
      expect(view.activeInterrupt.guanXingCards).toBeUndefined();
      expect(view.activeInterrupt.yiJiCards).toBeUndefined();
    }
  }
}

function simulateCuuChauMatch(
  playerCount: PlayerCount,
  gameIndex: number,
  playedOrEquippedKeys: Set<string>,
): {
  readonly state: MasterGameState;
  readonly steps: number;
  readonly elapsedMs: number;
} {
  const startMs = performance.now();
  const rng = createSeededRng(200000 * playerCount + gameIndex * 7919 + 31);
  const seats = makeSeats(playerCount);

  let state = createInitialMatchSetup({
    matchId: `cc-fuzz-${playerCount}-${gameIndex}`,
    seats,
    rng,
    enabledPacks: ['cuu_chau_core'],
  });

  const lordSeat = state.heroDraft!.lordSeatIndex;
  const lordView = projectStateForPlayer(state, seats[lordSeat]!.userId);
  assertViewPrivacyStrict(state, lordView, lordSeat);
  const lordCandidates = lordView.heroDraft!.myCandidates;
  const pickedLordHero =
    lordCandidates[gameIndex % lordCandidates.length] ?? chooseBotHero(lordView);
  state = selectLordHero(state, lordSeat, pickedLordHero, rng);

  for (let seat = 0; seat < playerCount; seat += 1) {
    if (seat === lordSeat) continue;
    const view = projectStateForPlayer(state, seats[seat]!.userId);
    assertViewPrivacyStrict(state, view, seat);
    const cands = view.heroDraft!.myCandidates;
    const picked = cands[(gameIndex + seat) % cands.length] ?? chooseBotHero(view);
    state = selectPlayerHero(state, seat, picked);
  }

  state = startMatchCombat(state, rng, { deckFactory: createCuuChau112Deck });

  const MAX_STEPS = 4500;
  let steps = 0;

  while (state.turnPhase !== 'GAME_OVER') {
    steps += 1;
    if (steps > MAX_STEPS) {
      const prompt = getPendingPrompt(state);
      throw new Error(
        `CUU_CHAU_FUZZ_TIMEOUT: count=${playerCount}, game=${gameIndex}, round=${state.roundNumber}, phase=${state.turnPhase}, prompt=${prompt?.kind ?? 'NONE'}, actor=${prompt?.actorSeats.join(',') ?? 'NONE'}`,
      );
    }

    const prompt = getPendingPrompt(state);
    if (!prompt) {
      throw new Error(
        `NO_PENDING_PROMPT_BEFORE_GAME_OVER: count=${playerCount}, game=${gameIndex}, phase=${state.turnPhase}`,
      );
    }

    if (prompt.isSimulatedDelay) {
      const observerSeat = (state.currentTurnSeat + 1) % playerCount;
      const sampleView = projectStateForPlayer(state, seats[observerSeat]!.userId);
      assertViewPrivacyStrict(state, sampleView, observerSeat);
      state = applyGameAction(
        state,
        { type: 'RESOLVE_SIMULATED_NULLIFICATION' },
        rng,
      );
      continue;
    }

    const actorSeat = prompt.actorSeats[0];
    if (actorSeat === undefined) {
      throw new Error(
        `EMPTY_ACTOR_SEATS: count=${playerCount}, game=${gameIndex}, prompt=${prompt.kind}`,
      );
    }

    const actorView = projectStateForPlayer(state, seats[actorSeat]!.userId);
    assertViewPrivacyStrict(state, actorView, actorSeat);

    const observerSeat = (actorSeat + 1) % playerCount;
    const observerView = projectStateForPlayer(state, seats[observerSeat]!.userId);
    assertViewPrivacyStrict(state, observerView, observerSeat);

    const action = decideBotAction(actorView, rng);
    if (action.type === 'PLAY_CARD') {
      const actorHand = state.players[actorSeat]?.handCards ?? [];
      for (const cid of action.cardIds) {
        const played = actorHand.find((c) => c.id === cid);
        if (played) {
          playedOrEquippedKeys.add(played.cardKey);
        }
      }
    }
    state = applyGameAction(state, action, rng);
  }

  for (const card of state.discardPile) {
    playedOrEquippedKeys.add(card.cardKey);
  }
  for (const player of state.players) {
    if (player.equipments.weapon) playedOrEquippedKeys.add(player.equipments.weapon.cardKey);
    if (player.equipments.armor) playedOrEquippedKeys.add(player.equipments.armor.cardKey);
  }

  const elapsedMs = performance.now() - startMs;
  return { state, steps, elapsedMs };
}

describe('Phase 2A — 500-Match Cửu Châu 112-Card Fuzz Test Gate (4, 5, 6, 7, 8P)', () => {
  const GAMES_PER_COUNT = 100;
  const seenHeroes = new Set<string>();
  const seenFactions = new Set<string>();
  const seenNewCardKeys = new Set<string>();

  for (const playerCount of [4, 5, 6, 7, 8] as const satisfies readonly PlayerCount[]) {
    it(
      `Cửu Châu ${playerCount}P: completes 100/100 matches (0 deadlock, 0 privacy leak, < 50ms/match)`,
      () => {
        let totalMs = 0;

        for (let i = 0; i < GAMES_PER_COUNT; i += 1) {
          const result = simulateCuuChauMatch(playerCount, i, seenNewCardKeys);
          totalMs += result.elapsedMs;

          expect(result.state.turnPhase).toBe('GAME_OVER');
          expect(result.state.enabledPacks).toContain('cuu_chau_core');
          expect(['LORD_LOYALIST', 'REBEL', 'SPY']).toContain(
            result.state.winningFaction,
          );
          expect(result.state.winnerUserIds.length).toBeGreaterThan(0);

          if (result.state.winningFaction) {
            seenFactions.add(result.state.winningFaction);
          }
          for (const p of result.state.players) {
            if (p.heroId) {
              seenHeroes.add(p.heroId);
            }
          }
        }

        const avgMs = totalMs / GAMES_PER_COUNT;
        expect(avgMs).toBeLessThan(50);
      },
      25000,
    );
  }

  it('confirms all 25 heroes, all 3 factions, and all 5 original Cửu Châu cards appear across 500 matches', () => {
    expect(seenHeroes.size).toBe(STANDARD_HERO_IDS.length);
    expect(seenFactions.has('LORD_LOYALIST')).toBe(true);
    expect(seenFactions.has('REBEL')).toBe(true);
    expect(seenFactions.has('SPY')).toBe(true);
    for (const cardKey of NEW_CUU_CHAU_CARD_KEYS) {
      expect(seenNewCardKeys.has(cardKey)).toBe(true);
    }
  });
});
