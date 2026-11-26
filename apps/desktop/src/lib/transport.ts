import {
  applyGameAction,
  createInitialMatchSetup,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  type GameAction,
  type HeroId,
  type MasterGameState,
  type PlayerCount,
  type PlayerViewState,
  type SetupSeatInput,
} from '@lkdf/shared';

export type MatchTransportMode = 'local_offline' | 'lan_ws' | 'steam_p2p';

export interface IMatchTransport {
  readonly mode: MatchTransportMode;
  getView(): PlayerViewState;
  selectHero(heroId: HeroId): PlayerViewState;
  sendAction(action: GameAction): PlayerViewState;
  subscribe(listener: (view: PlayerViewState) => void): () => void;
  dispose(): void;
}

export interface LocalOfflineTransportOptions {
  readonly matchId?: string;
  readonly seats: readonly SetupSeatInput[];
  readonly viewerUserId: string;
  readonly manualDraw?: boolean;
  readonly rng?: () => number;
}

export function createLocalOfflineTransport(
  options: LocalOfflineTransportOptions,
): IMatchTransport & { getMasterState(): MasterGameState } {
  const rng = options.rng ?? Math.random;
  let state: MasterGameState = createInitialMatchSetup({
    matchId: options.matchId ?? crypto.randomUUID(),
    manualDraw: options.manualDraw ?? true,
    seats: options.seats,
    rng,
  });

  const listeners = new Set<(view: PlayerViewState) => void>();

  const emit = () => {
    const view = projectStateForPlayer(state, options.viewerUserId);
    for (const listener of listeners) {
      listener(view);
    }
    return view;
  };

  return {
    mode: 'local_offline',
    getMasterState() {
      return state;
    },
    getView() {
      return projectStateForPlayer(state, options.viewerUserId);
    },
    selectHero(heroId: HeroId) {
      const viewerSeat = state.players.find(
        (p) => p.userId === options.viewerUserId,
      )?.seatIndex;
      if (viewerSeat === undefined) {
        throw new Error('VIEWER_NOT_IN_MATCH');
      }
      state =
        state.heroDraft?.stage === 'LORD_SELECTING'
          ? selectLordHero(state, viewerSeat, heroId, rng)
          : selectPlayerHero(state, viewerSeat, heroId);
      return emit();
    },
    sendAction(action: GameAction) {
      state = applyGameAction(state, action, rng, {
        deferNullificationPass: true,
      });
      return emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      listeners.clear();
    },
  };
}

export function buildDefaultOfflineSeats(
  count: PlayerCount,
  localPlayerName: string,
): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    seatIndex: idx,
    userId: idx === 0 ? 'local_player_0' : `offline_bot_${idx}`,
    displayName: idx === 0 ? localPlayerName : `Bot ${idx}`,
    avatarUrl: '',
  }));
}
