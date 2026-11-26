import { DEFAULT_CONTENT_REGISTRY } from '../content/registry.js';
import { getHeroDefinition } from '../heroes/catalog.js';
import {
  IDENTITY_DISTRIBUTIONS,
  PlayerCountSchema,
  type IdentityRole,
  type PlayerCount,
} from '../types/identity.js';
import { appendGameEvent } from '../types/events.js';
import type {
  HeroDraftState,
  HeroId,
  MasterGameState,
  PlayerCombatState,
} from '../types/game.js';
import { shuffleArray } from '../utils/shuffle.js';

export { shuffleArray };

export interface SetupSeatInput {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
}

export interface CreateMatchSetupOptions {
  readonly manualDraw?: boolean;
  readonly matchId: string;
  readonly seats: readonly SetupSeatInput[];
  readonly rng?: () => number;
}

/** Chia và xáo trộn danh sách Thân Phận cho 4–8 người theo đúng tỷ lệ chuẩn. */
export function assignIdentities(
  playerCount: PlayerCount,
  rng: () => number = Math.random,
): IdentityRole[] {
  const dist = IDENTITY_DISTRIBUTIONS[playerCount];
  const roles: IdentityRole[] = [
    ...Array<IdentityRole>(dist.lord).fill('LORD'),
    ...Array<IdentityRole>(dist.loyalist).fill('LOYALIST'),
    ...Array<IdentityRole>(dist.rebel).fill('REBEL'),
    ...Array<IdentityRole>(dist.spy).fill('SPY'),
  ];
  return shuffleArray(roles, rng);
}

function validateSeatInputs(seats: readonly SetupSeatInput[]): PlayerCount {
  const parsedCount = PlayerCountSchema.safeParse(seats.length);
  if (!parsedCount.success) {
    throw new Error('MIN_4_MAX_8_REAL_PLAYERS_REQUIRED');
  }
  const uniqueUsers = new Set(seats.map((seat) => seat.userId));
  if (uniqueUsers.size !== seats.length) {
    throw new Error('DUPLICATE_USER_IN_MATCH');
  }
  return parsedCount.data;
}

/**
 * Khởi tạo ván đấu ở pha HERO_SELECT:
 * - Chia Thân Phận đúng mốc 4–8 người, lật công khai Chủ Công.
 * - Phát cho Chủ Công 5 tướng (Lưu Bị, Tào Tháo, Tôn Quyền + 2 ngẫu nhiên từ 22 tướng còn lại).
 */
export function createInitialMatchSetup(
  options: CreateMatchSetupOptions,
): MasterGameState {
  const rng = options.rng ?? Math.random;
  const playerCount = validateSeatInputs(options.seats);
  const identities = assignIdentities(playerCount, rng);

  const lordSeatIndex = identities.indexOf('LORD');
  if (lordSeatIndex === -1) {
    throw new Error('INVALID_IDENTITY_DISTRIBUTION_NO_LORD');
  }

  const lordHeroIds = DEFAULT_CONTENT_REGISTRY.getLordHeroIds();
  const allHeroIds = DEFAULT_CONTENT_REGISTRY.listHeroes().map((h) => h.id);
  const nonLordPool = shuffleArray(
    allHeroIds.filter((id) => !lordHeroIds.includes(id)),
    rng,
  );
  const lordRandomTwo = nonLordPool.slice(0, 2);
  const remainingPool = nonLordPool.slice(2);
  const lordCandidates: HeroId[] = [...lordHeroIds, ...lordRandomTwo];

  const players: PlayerCombatState[] = options.seats.map((seat, index) => {
    const identity = identities[index];
    if (!identity) {
      throw new Error('MISSING_IDENTITY_FOR_SEAT');
    }
    return {
      seatIndex: index,
      userId: seat.userId,
      displayName: seat.displayName,
      avatarUrl: seat.avatarUrl,
      identity,
      isIdentityRevealed: identity === 'LORD',
      heroId: null,
      hp: 0,
      maxHp: 0,
      alive: true,
      handCards: [],
      equipments: {
        weapon: null,
        armor: null,
        plusOneHorse: null,
        minusOneHorse: null,
      },
      delayedScrolls: [],
      autoSkipNullification: false,
      isBotTakeover: false,
    };
  });

  const heroDraft: HeroDraftState = {
    stage: 'LORD_SELECTING',
    lordSeatIndex,
    remainingPool,
    candidatesBySeat: {
      [lordSeatIndex]: lordCandidates,
    },
    selectedBySeat: {},
  };

  const initialState: MasterGameState = {
    rulesetVersion: DEFAULT_CONTENT_REGISTRY.getRulesetVersion(),
    enabledPacks: DEFAULT_CONTENT_REGISTRY.getEnabledPackIds(),
    contentHash: DEFAULT_CONTENT_REGISTRY.getContentHash(),
    matchId: options.matchId,
    roundNumber: 1,
    currentTurnSeat: lordSeatIndex,
    turnPhase: 'HERO_SELECT',
    peacefulFirstRound: true,
    ...(options.manualDraw ? { manualDraw: true } : {}),
    heroDraft,
    drawPile: [],
    discardPile: [],
    players,
    interruptStack: [],
    actionLog: [
      `Ván đấu ${playerCount} người bắt đầu. Đã công khai Chủ Công ở ghế số ${lordSeatIndex + 1}.`,
    ],
    refereeAuditLog: [],
    winningFaction: null,
    winnerUserIds: [],
  };

  return appendGameEvent(
    initialState,
    'match.started',
    { playerCount, lordSeat: lordSeatIndex + 1 },
    `Ván đấu ${playerCount} người bắt đầu. Đã công khai Chủ Công ở ghế số ${lordSeatIndex + 1}.`,
  );
}

/**
 * Chủ Công chọn 1 trong 5 tướng (luôn nhận +1 máu tối đa).
 * 4 tướng không được chọn trả lại chồng tướng (còn 24 tướng), sau đó chia mỗi người còn lại 3 tướng.
 */
export function selectLordHero(
  state: MasterGameState,
  seatIndex: number,
  heroId: HeroId,
  rng: () => number = Math.random,
): MasterGameState {
  const draft = state.heroDraft;
  if (state.turnPhase !== 'HERO_SELECT' || !draft || draft.stage !== 'LORD_SELECTING') {
    throw new Error('INVALID_HERO_DRAFT_STAGE');
  }
  if (seatIndex !== draft.lordSeatIndex) {
    throw new Error('ONLY_LORD_CAN_SELECT_NOW');
  }

  const lordCandidates = draft.candidatesBySeat[seatIndex];
  if (!lordCandidates || !lordCandidates.includes(heroId)) {
    throw new Error('INVALID_HERO_CANDIDATE');
  }

  const heroDef = getHeroDefinition(heroId);
  const lordMaxHp = heroDef.baseMaxHp + 1;

  const returnedHeroes = lordCandidates.filter((id) => id !== heroId);
  const fullPoolAfterLord = shuffleArray(
    [...draft.remainingPool, ...returnedHeroes],
    rng,
  );

  if (fullPoolAfterLord.length !== DEFAULT_CONTENT_REGISTRY.listHeroes().length - 1) {
    throw new Error('INVALID_REMAINING_HERO_POOL_SIZE');
  }

  const nextCandidatesBySeat: Record<number, readonly HeroId[]> = {
    [seatIndex]: lordCandidates,
  };

  let cursor = 0;
  for (const player of state.players) {
    if (player.seatIndex === seatIndex) {
      continue;
    }
    const dealt = fullPoolAfterLord.slice(cursor, cursor + 3);
    if (dealt.length !== 3) {
      throw new Error('NOT_ENOUGH_HEROES_FOR_SEAT');
    }
    nextCandidatesBySeat[player.seatIndex] = dealt;
    cursor += 3;
  }

  const nextPlayers = state.players.map((player) =>
    player.seatIndex === seatIndex
      ? {
          ...player,
          heroId,
          maxHp: lordMaxHp,
          hp: lordMaxHp,
        }
      : player,
  );

  return {
    ...state,
    players: nextPlayers,
    heroDraft: {
      stage: 'OTHERS_SELECTING',
      lordSeatIndex: draft.lordSeatIndex,
      remainingPool: fullPoolAfterLord.slice(cursor),
      candidatesBySeat: nextCandidatesBySeat,
      selectedBySeat: {
        [seatIndex]: heroId,
      },
    },
    actionLog: [
      ...state.actionLog,
      `Chủ Công (${state.players.find((p) => p.seatIndex === seatIndex)?.displayName ?? `Ghế ${seatIndex + 1}`}) đã chọn tướng ${heroDef.nameVi} (${lordMaxHp} máu tối đa).`,
    ],
  };
}

/**
 * Người chơi còn lại chọn 1 trong 3 tướng được chia.
 * Khi tất cả đã chọn xong, đồng loạt công khai tướng và chuyển sang pha tiếp theo.
 */
export function selectPlayerHero(
  state: MasterGameState,
  seatIndex: number,
  heroId: HeroId,
): MasterGameState {
  const draft = state.heroDraft;
  if (state.turnPhase !== 'HERO_SELECT' || !draft || draft.stage !== 'OTHERS_SELECTING') {
    throw new Error('INVALID_HERO_DRAFT_STAGE');
  }
  if (seatIndex === draft.lordSeatIndex) {
    throw new Error('LORD_ALREADY_SELECTED');
  }
  if (draft.selectedBySeat[seatIndex] !== undefined) {
    throw new Error('HERO_ALREADY_SELECTED_FOR_SEAT');
  }

  const candidates = draft.candidatesBySeat[seatIndex];
  if (!candidates || !candidates.includes(heroId)) {
    throw new Error('INVALID_HERO_CANDIDATE');
  }

  const nextSelected: Record<number, HeroId> = {
    ...draft.selectedBySeat,
    [seatIndex]: heroId,
  };

  const allSelected = state.players.every(
    (player) => nextSelected[player.seatIndex] !== undefined,
  );

  if (!allSelected) {
    return {
      ...state,
      heroDraft: {
        ...draft,
        selectedBySeat: nextSelected,
      },
    };
  }

  const nextPlayers = state.players.map((player) => {
    if (player.seatIndex === draft.lordSeatIndex) {
      return player;
    }
    const pickedHeroId = nextSelected[player.seatIndex];
    if (!pickedHeroId) {
      throw new Error('MISSING_SELECTED_HERO');
    }
    const heroDef = getHeroDefinition(pickedHeroId);
    return {
      ...player,
      heroId: pickedHeroId,
      maxHp: heroDef.baseMaxHp,
      hp: heroDef.baseMaxHp,
    };
  });

  return {
    ...state,
    turnPhase: 'JUDGE',
    players: nextPlayers,
    heroDraft: {
      ...draft,
      stage: 'COMPLETED',
      selectedBySeat: nextSelected,
    },
    actionLog: [
      ...state.actionLog,
      'Tất cả người chơi đã chọn tướng xong và đồng loạt lật công khai.',
    ],
  };
}

/** Hết giờ chọn tướng: tự động chọn tướng đầu tiên bên trái cho ghế chưa chọn. */
export function autoSelectTimedOutHeroes(
  state: MasterGameState,
  rng: () => number = Math.random,
): MasterGameState {
  const draft = state.heroDraft;
  if (state.turnPhase !== 'HERO_SELECT' || !draft || draft.stage === 'COMPLETED') {
    return state;
  }

  let nextState = state;
  if (draft.stage === 'LORD_SELECTING') {
    const lordCandidates = draft.candidatesBySeat[draft.lordSeatIndex];
    const fallbackHero = lordCandidates?.[0];
    if (!fallbackHero) {
      throw new Error('NO_LORD_CANDIDATES_AVAILABLE');
    }
    nextState = selectLordHero(nextState, draft.lordSeatIndex, fallbackHero, rng);
  }

  const updatedDraft = nextState.heroDraft;
  if (!updatedDraft || updatedDraft.stage !== 'OTHERS_SELECTING') {
    return nextState;
  }

  for (const player of nextState.players) {
    if (updatedDraft.selectedBySeat[player.seatIndex] !== undefined) {
      continue;
    }
    const candidates = updatedDraft.candidatesBySeat[player.seatIndex];
    const fallbackHero = candidates?.[0];
    if (!fallbackHero) {
      throw new Error('NO_PLAYER_CANDIDATES_AVAILABLE');
    }
    nextState = selectPlayerHero(nextState, player.seatIndex, fallbackHero);
  }

  return nextState;
}
