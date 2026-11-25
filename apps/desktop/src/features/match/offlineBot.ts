import {
  applyGameAction,
  chooseBotHero,
  decideBotAction,
  getPendingPrompt,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
} from '@lkdf/shared';
import type { MasterGameState } from '@lkdf/shared';

type BotDecision = 'turn' | 'action' | 'reaction';
const delayRanges = {
  turn: [1500, 3000],
  action: [700, 1400],
  reaction: [500, 1200],
} as const;

export function botDelayMs(
  decision: BotDecision,
  rng = Math.random,
  remainingMs = Infinity,
): number {
  const [min, max] = delayRanges[decision];
  return Math.max(0, Math.min(remainingMs, Math.round(min + rng() * (max - min))));
}

export function scheduleBotStep(step: () => void, delayMs: number): () => void {
  const timer = setTimeout(step, delayMs);
  return () => clearTimeout(timer);
}

export const OFFLINE_NULLIFICATION_MS = 8000;

export function finishOfflineNullification(state: MasterGameState, rng = Math.random): MasterGameState {
  const frame = state.interruptStack.at(-1);
  if (frame?.kind !== 'WAIT_NULLIFICATION') return state;
  if (frame.isSimulatedDelay) {
    return applyGameAction(state, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }, rng);
  }
  const remaining = frame.eligibleSeats.filter((seat) => !frame.passedSeats.includes(seat));
  // A deferred all-pass window still needs one pass to close at the deadline.
  return (remaining.length ? remaining : frame.eligibleSeats.slice(0, 1)).reduce(
    (next, seatIndex) =>
      applyGameAction(next, { type: 'RESPOND_NULLIFICATION', seatIndex, cardId: null }, rng),
    state,
  );
}

export function getOfflineBotSeat(state: MasterGameState): number | undefined {
  return getPendingPrompt(state)?.actorSeats.find((seat) => seat !== 0);
}

export function runOfflineBotStep(state: MasterGameState, seat: number, rng = Math.random, deferOpening = false): MasterGameState {
  const player = state.players[seat];
  if (!player || seat === 0) return state;
  if (state.turnPhase === 'HERO_SELECT') {
    const draft = state.heroDraft;
    if (draft?.stage === 'LORD_SELECTING') {
      const view = projectStateForPlayer(state, player.userId);
      return selectLordHero(state, seat, chooseBotHero(view), rng);
    }
    let next = state;
    // The non-Lord players pick simultaneously, including the human seat.
    for (const candidate of state.players) {
      if (candidate.seatIndex === 0 || draft?.selectedBySeat[candidate.seatIndex]) continue;
      const view = projectStateForPlayer(next, candidate.userId);
      next = selectPlayerHero(next, candidate.seatIndex, chooseBotHero(view));
    }
    if (next.heroDraft?.stage !== 'COMPLETED') return next;
    return deferOpening ? { ...next, turnPhase: 'HERO_SELECT' } : startMatchCombat(next, rng);
  }

  const view = projectStateForPlayer(state, player.userId);
  return applyGameAction(state, decideBotAction(view, rng), rng, {
    deferNullificationPass: true,
  });
}
