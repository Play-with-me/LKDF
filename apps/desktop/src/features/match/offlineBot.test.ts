import {
  applyGameAction,
  chooseBotHero,
  createInitialMatchSetup,
  decideBotAction,
  getPendingPrompt,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
} from '@lkdf/shared';
import type { MasterGameState } from '@lkdf/shared';
import { describe, expect, it, vi } from 'vitest';
import { botDelayMs, finishOfflineNullification, getOfflineBotSeat, runOfflineBotStep, scheduleBotStep } from './offlineBot.js';

describe('offline bot pacing', () => {
  it('varies delay by decision type and respects the remaining window', () => {
    expect(botDelayMs('turn', () => 0)).toBe(1500);
    expect(botDelayMs('turn', () => 1)).toBe(3000);
    expect(botDelayMs('action', () => 0.5)).toBe(1050);
    expect(botDelayMs('reaction', () => 1)).toBe(1200);
    expect(botDelayMs('reaction', () => 1, 200)).toBe(200);
  });

  it('runs once after the wait and cancels a pending decision', () => {
    vi.useFakeTimers();
    try {
      const step = vi.fn();
      const cancel = scheduleBotStep(step, 700);
      vi.advanceTimersByTime(699);
      expect(step).not.toHaveBeenCalled();
      cancel();
      vi.advanceTimersByTime(1);
      expect(step).not.toHaveBeenCalled();
      scheduleBotStep(step, 500);
      vi.advanceTimersByTime(1500);
      expect(step).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

function playTestSeat(state: MasterGameState, rng: () => number): MasterGameState {
  const view = projectStateForPlayer(state, 'seat-0');
  if (state.turnPhase === 'HERO_SELECT') {
    const hero = chooseBotHero(view);
    const next = state.heroDraft?.stage === 'LORD_SELECTING'
      ? selectLordHero(state, 0, hero, rng)
      : selectPlayerHero(state, 0, hero);
    return next.heroDraft?.stage === 'COMPLETED' ? startMatchCombat(next, rng) : next;
  }
  return applyGameAction(state, decideBotAction(view, rng), rng, { deferNullificationPass: true });
}

it.each([4, 8])('finishes representative %i-seat offline matches', (count) => {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const rng = () => {
      value = (Math.imul(1664525, value) + 1013904223) >>> 0;
      return value / 2 ** 32;
    };
    let state = createInitialMatchSetup({
      matchId: `offline-${count}-${seed}`,
      seats: Array.from({ length: count }, (_, seat) => ({
        userId: `seat-${seat}`,
        displayName: `Ghế ${seat + 1}`,
        avatarUrl: '',
      })),
      rng,
    });
    let nullificationWindows = 0;
    let steps = 0;
    while (state.turnPhase !== 'GAME_OVER' && steps++ < 4500) {
      const botSeat = getOfflineBotSeat(state);
      const prompt = getPendingPrompt(state);
      if (botSeat !== undefined) {
        state = runOfflineBotStep(state, botSeat, rng);
      } else if (prompt?.actorSeats.includes(0)) {
        state = playTestSeat(state, rng);
      } else {
        expect(prompt?.kind).toBe('WAIT_NULLIFICATION');
        state = finishOfflineNullification(state, rng);
        nullificationWindows++;
      }
    }
    expect(state.turnPhase, `seed ${seed}`).toBe('GAME_OVER');
    expect(state.winnerUserIds.length).toBeGreaterThan(0);
    expect(nullificationWindows).toBeGreaterThan(0);
  }
});
