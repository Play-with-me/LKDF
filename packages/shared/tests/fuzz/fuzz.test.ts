import { describe, expect, it } from 'vitest';
import {
  STANDARD_HERO_IDS,
  applyGameAction,
  chooseBotHero,
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

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeSeats(count: PlayerCount): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `fuzz-user-${count}-${idx}`,
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
      if (pub.handCards === null) {
        expect(pub.handCards).not.toBeNull();
      }
    } else {
      if (pub.handCards !== null) {
        expect(pub.handCards).toBeNull();
      }
      const indexedPlayer = master.players[pub.seatIndex];
      const masterPlayer =
        indexedPlayer && indexedPlayer.seatIndex === pub.seatIndex
          ? indexedPlayer
          : master.players.find((p) => p.seatIndex === pub.seatIndex)!;
      const shouldReveal =
        pub.seatIndex === viewerSeat ||
        masterPlayer.isIdentityRevealed ||
        !masterPlayer.alive ||
        isGameOver;
      if (!shouldReveal && pub.identity !== 'UNKNOWN') {
        expect(pub.identity).toBe('UNKNOWN');
      }
    }
  }

  if (view.activeInterrupt) {
    if ('isSimulatedDelay' in view.activeInterrupt) {
      expect('isSimulatedDelay' in view.activeInterrupt).toBe(false);
    }
    if ('eligibleSeats' in view.activeInterrupt) {
      expect('eligibleSeats' in view.activeInterrupt).toBe(false);
    }
    if (view.activeInterrupt.targetSeat !== viewerSeat) {
      if (view.activeInterrupt.guanXingCards !== undefined) {
        expect(view.activeInterrupt.guanXingCards).toBeUndefined();
      }
      if (view.activeInterrupt.yiJiCards !== undefined) {
        expect(view.activeInterrupt.yiJiCards).toBeUndefined();
      }
    }
  }
}

function simulateFullMatch(
  playerCount: PlayerCount,
  gameIndex: number,
): {
  readonly state: MasterGameState;
  readonly steps: number;
  readonly elapsedMs: number;
} {
  const startMs = performance.now();
  const rng = createSeededRng(100000 * playerCount + gameIndex * 7919 + 17);
  const seats = makeSeats(playerCount);

  let state = createInitialMatchSetup({
    matchId: `fuzz-${playerCount}-${gameIndex}`,
    seats,
    rng,
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

  state = startMatchCombat(state, rng);

  const MAX_STEPS = 4500;
  let steps = 0;

  while (state.turnPhase !== 'GAME_OVER') {
    steps += 1;
    if (steps > MAX_STEPS) {
      const prompt = getPendingPrompt(state);
      throw new Error(
        `FUZZ_DEADLOCK_OR_TIMEOUT: count=${playerCount}, game=${gameIndex}, round=${state.roundNumber}, phase=${state.turnPhase}, prompt=${prompt?.kind ?? 'NONE'}, actor=${prompt?.actorSeats.join(',') ?? 'NONE'}`,
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
    state = applyGameAction(state, action, rng);
  }

  const elapsedMs = performance.now() - startMs;
  return { state, steps, elapsedMs };
}

describe('Bước 1.4 — Cổng Kiểm thử Giả lập Fuzz (>= 500 ván cho các mốc 4, 5, 6, 7, 8 người)', () => {
  const GAMES_PER_COUNT = 100;
  const seenHeroes = new Set<string>();
  const seenFactions = new Set<string>();

  for (const playerCount of [4, 5, 6, 7, 8] as const satisfies readonly PlayerCount[]) {
    it(
      `bàn ${playerCount} người: hoàn thành 100/100 ván (0 deadlock, 0 rò rỉ PlayerViewState, < 50ms/ván)`,
      () => {
        let totalMs = 0;

        for (let i = 0; i < GAMES_PER_COUNT; i += 1) {
          const result = simulateFullMatch(playerCount, i);
          totalMs += result.elapsedMs;

          expect(result.state.turnPhase).toBe('GAME_OVER');
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
      20000,
    );
  }

  it('xác nhận toàn bộ 25 tướng chuẩn và cả 3 phe thắng cuộc đều xuất hiện trong 500 ván', () => {
    expect(seenHeroes.size).toBe(STANDARD_HERO_IDS.length);
    expect(seenFactions.has('LORD_LOYALIST')).toBe(true);
    expect(seenFactions.has('REBEL')).toBe(true);
    expect(seenFactions.has('SPY')).toBe(true);
  });
});
