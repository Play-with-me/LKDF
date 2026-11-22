import { randomBytes, randomUUID } from 'node:crypto';
import {
  applyGameAction,
  autoSelectTimedOutHeroes,
  chooseBotHero,
  createInitialMatchSetup,
  decideBotAction,
  getPendingPrompt,
  HERO_BY_ID,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
  TIMER_PRESETS,
  type GameAction,
  type HeroId,
  type MasterGameState,
  type PlayerCount,
  type PlayerViewState,
  type RefereeActionType,
  type RefereeAuditEntry,
  type RoomSeat,
  type RoomState,
  type TimerPreset,
  type TimerPresetConfig,
  type UserProfile,
} from '@lkdf/shared';
import type { AuthService } from '../auth/index.js';
import type {
  PersistenceStore,
  RoomSnapshotRecord,
} from '../persistence/index.js';

export const ROOMS_MODULE_READY = true;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_UNDO_HISTORY = 5;
const DEFAULT_HOST_FAILOVER_DELAY_MS = 30_000;

export interface RoomViewerPayload {
  readonly roomState: RoomState;
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly playerView: PlayerViewState | null;
  readonly refereeAuditLog: readonly RefereeAuditEntry[];
}

export type RoomOperationResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code: string;
      readonly messageVi: string;
    };

export interface ApplyPlayerActionOutcome {
  readonly viewerPayload: RoomViewerPayload;
  readonly silentPass: boolean;
}

export type RoomUpdateListener = (roomCode: string, reason: string) => void;

interface MutableRoomRecord {
  roomState: RoomState;
  masterGameState: MasterGameState | null;
  undoHistory: MasterGameState[];
  lastMatchAuditLog: RefereeAuditEntry[];
  phaseDeadlineAt: string | null;
  pausedRemainingMs: number | null;
  matchStartedAtMs: number | null;
  updatedAt: string;
}

export interface RoomManager {
  restoreFromPersistence(): Promise<number>;
  getAllActiveRoomCodes(): readonly string[];
  onRoomUpdated(listener: RoomUpdateListener): () => void;
  getActiveRoomCodeForUser(userId: string): string | null;
  getRoomViewForUser(
    userId: string,
    roomCode: string,
  ): RoomOperationResult<RoomViewerPayload>;
  createRoom(
    profile: UserProfile,
    timerPreset?: TimerPreset,
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  joinRoom(
    profile: UserProfile,
    roomCode: string,
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  setReady(userId: string, roomCode: string, isReady: boolean): Promise<RoomOperationResult<RoomViewerPayload>>;
  updateTimerPreset(
    userId: string,
    roomCode: string,
    timerPreset: TimerPreset,
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  leaveRoom(
    userId: string,
    roomCode: string,
  ): Promise<
    RoomOperationResult<{ readonly deleted: boolean; readonly room: RoomViewerPayload | null }>
  >;
  startMatch(
    userId: string,
    roomCode: string,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  resetRoomToLobby(
    userId: string,
    roomCode: string,
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  selectHero(
    userId: string,
    roomCode: string,
    heroId: HeroId,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  applyPlayerAction(
    userId: string,
    roomCode: string,
    action: GameAction,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<ApplyPlayerActionOutcome>>;
  resolveSimulatedNullification(
    roomCode: string,
    expectedFrameId: string,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomSnapshotRecord>>;
  setUserConnectionAndTakeover(
    userId: string,
    roomCode: string,
    params: {
      readonly connectionStatus: 'ONLINE' | 'DISCONNECTED';
      readonly isBotTakeover?: boolean;
      readonly logMessageVi?: string;
    },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  executeBotActionIfEligible(
    roomCode: string,
    options?: { readonly rng?: () => number },
  ): Promise<{ readonly acted: boolean; readonly roomCode: string }>;
  handlePhaseTimeout(
    roomCode: string,
    options?: { readonly rng?: () => number },
  ): Promise<{ readonly handled: boolean; readonly roomCode: string }>;
  applyRefereeAction(
    actorUserId: string,
    roomCode: string,
    actionType: RefereeActionType,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  transferActingHostAfterTimeout(
    roomCode: string,
  ): Promise<{ readonly transferred: boolean; readonly roomCode: string }>;
  commitMatchStep(
    roomCode: string,
    nextMasterState: MasterGameState,
    options?: { readonly pushUndo?: boolean; readonly nowMs?: number },
  ): Promise<RoomOperationResult<RoomSnapshotRecord>>;
  getSnapshotRecord(roomCode: string): RoomSnapshotRecord | null;
}

function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function generateCandidateRoomCode(): string {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[(bytes[i] ?? 0) % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

function computePhaseDeadlineIso(
  masterState: MasterGameState | null,
  timerPreset: TimerPreset,
  isTimerPaused: boolean,
  nowMs: number,
  timerScale: number,
  nullificationWindowMs: number,
): string | null {
  if (!masterState || isTimerPaused || masterState.turnPhase === 'GAME_OVER') {
    return null;
  }
  if (masterState.interruptStack.at(-1)?.kind === 'WAIT_NULLIFICATION') {
    return new Date(nowMs + nullificationWindowMs).toISOString();
  }
  const config = TIMER_PRESETS[timerPreset];
  let seconds = config.mainTurnSeconds;
  if (masterState.turnPhase === 'HERO_SELECT') {
    seconds = config.heroSelectSeconds;
  } else if (masterState.interruptStack.length > 0) {
    seconds = config.reactionSeconds;
  } else if (masterState.turnPhase === 'DISCARD') {
    seconds = config.discardSeconds;
  }
  const durationMs = Math.max(20, Math.round(seconds * 1000 * timerScale));
  return new Date(nowMs + durationMs).toISOString();
}

function buildViewerPayload(
  record: MutableRoomRecord,
  userId: string,
): RoomViewerPayload {
  return {
    roomState: record.roomState,
    timerConfig: TIMER_PRESETS[record.roomState.timerPreset],
    phaseDeadlineAt: record.phaseDeadlineAt,
    pausedRemainingMs: record.pausedRemainingMs,
    playerView: record.masterGameState
      ? projectStateForPlayer(record.masterGameState, userId)
      : null,
    refereeAuditLog:
      record.masterGameState?.refereeAuditLog ?? record.lastMatchAuditLog,
  };
}

function toSnapshotRecord(record: MutableRoomRecord): RoomSnapshotRecord {
  return {
    roomState: record.roomState,
    masterGameState: record.masterGameState,
    undoHistory: [...record.undoHistory],
    phaseDeadlineAt: record.phaseDeadlineAt,
    pausedRemainingMs: record.pausedRemainingMs,
    updatedAt: record.updatedAt,
  };
}

function syncTakeoverOnState(
  record: MutableRoomRecord,
  userId: string,
  params: {
    readonly connectionStatus?: 'ONLINE' | 'DISCONNECTED';
    readonly isBotTakeover?: boolean;
    readonly logMessageVi?: string;
  },
): boolean {
  let changed = false;

  const updatedSeats = record.roomState.seats.map((seat) => {
    if (seat.userId !== userId) {
      return seat;
    }
    const nextConn = params.connectionStatus ?? seat.connectionStatus;
    const nextTakeover = params.isBotTakeover ?? seat.isBotTakeover;
    if (seat.connectionStatus !== nextConn || seat.isBotTakeover !== nextTakeover) {
      changed = true;
    }
    return {
      ...seat,
      connectionStatus: nextConn,
      ...(nextConn === 'DISCONNECTED' && record.roomState.status === 'LOBBY' ? { isReady: false } : {}),
      isBotTakeover: nextTakeover,
    };
  });

  if (changed) {
    record.roomState = {
      ...record.roomState,
      seats: updatedSeats,
    };
  }

  if (record.masterGameState && record.masterGameState.turnPhase !== 'GAME_OVER') {
    let playerChanged = false;
    const updatedPlayers = record.masterGameState.players.map((p) => {
      if (p.userId !== userId) {
        return p;
      }
      const nextTakeover = params.isBotTakeover ?? p.isBotTakeover;
      if (p.isBotTakeover !== nextTakeover) {
        playerChanged = true;
        changed = true;
      }
      return nextTakeover === p.isBotTakeover ? p : { ...p, isBotTakeover: nextTakeover };
    });

    if (playerChanged || params.logMessageVi) {
      record.masterGameState = {
        ...record.masterGameState,
        players: updatedPlayers,
        ...(params.logMessageVi
          ? {
              actionLog: [...record.masterGameState.actionLog, params.logMessageVi],
            }
          : {}),
      };
      changed = true;
    }
  }

  return changed;
}

function pickClockwiseOnlineSeat(
  seats: readonly RoomSeat[],
  afterUserId: string,
  excludeUserId?: string,
): RoomSeat | null {
  const ordered = [...seats].sort((a, b) => a.seatIndex - b.seatIndex);
  if (ordered.length === 0) {
    return null;
  }
  const startIdx = ordered.findIndex((s) => s.userId === afterUserId);
  const anchor = startIdx === -1 ? 0 : startIdx;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const candidate = ordered[(anchor + offset) % ordered.length];
    if (
      candidate &&
      candidate.userId !== afterUserId &&
      candidate.userId !== excludeUserId &&
      candidate.connectionStatus === 'ONLINE'
    ) {
      return candidate;
    }
  }
  return null;
}

function advanceSkippedPhaseState(
  master: MasterGameState,
  rng: () => number,
): MasterGameState {
  if (master.turnPhase === 'HERO_SELECT') {
    let nextState = autoSelectTimedOutHeroes(master, rng);
    if (nextState.heroDraft?.stage === 'COMPLETED') {
      nextState = startMatchCombat(nextState, rng);
    }
    return nextState;
  }

  const top = master.interruptStack[master.interruptStack.length - 1];
  if (top?.kind === 'WAIT_NULLIFICATION') {
    if (top.isSimulatedDelay) {
      return applyGameAction(
        master,
        { type: 'RESOLVE_SIMULATED_NULLIFICATION' },
        rng,
      );
    }
    let nextState = master;
    const remainingEligible = top.eligibleSeats.filter(
      (s) => !top.passedSeats.includes(s),
    );
    for (const seatIndex of remainingEligible.length ? remainingEligible : top.eligibleSeats.slice(0, 1)) {
      const currentTop =
        nextState.interruptStack[nextState.interruptStack.length - 1];
      if (!currentTop || currentTop.id !== top.id) {
        break;
      }
      nextState = applyGameAction(
        nextState,
        { type: 'RESPOND_NULLIFICATION', seatIndex, cardId: null },
        rng,
      );
    }
    return nextState;
  }

  if (master.interruptStack.length === 0 && master.turnPhase === 'PLAY') {
    return applyGameAction(
      master,
      { type: 'END_PLAY_PHASE', seatIndex: master.currentTurnSeat },
      rng,
    );
  }

  const prompt = getPendingPrompt(master);
  const actorSeat = prompt?.actorSeats[0];
  if (actorSeat === undefined) {
    return master;
  }
  const actor = master.players.find((p) => p.seatIndex === actorSeat);
  if (!actor) {
    return master;
  }
  const actorView = projectStateForPlayer(master, actor.userId);
  const fallbackAction = decideBotAction(actorView, rng);
  return applyGameAction(master, fallbackAction, rng);
}

function mapSetupOrHeroErrorVi(err: unknown): {
  readonly statusCode: number;
  readonly code: string;
  readonly messageVi: string;
} {
  const code = err instanceof Error ? err.message : 'ROOM_OPERATION_ERROR';
  switch (code) {
    case 'ONLY_LORD_CAN_SELECT_NOW':
      return {
        statusCode: 403,
        code,
        messageVi: 'Chủ Công cần chọn tướng trước khi các người chơi khác chọn.',
      };
    case 'LORD_ALREADY_SELECTED':
    case 'HERO_ALREADY_SELECTED_FOR_SEAT':
      return {
        statusCode: 409,
        code,
        messageVi: 'Ghế này đã hoàn tất chọn tướng rồi.',
      };
    case 'INVALID_HERO_CANDIDATE':
      return {
        statusCode: 400,
        code,
        messageVi: 'Tướng vừa chọn không nằm trong danh sách tướng được chia cho bạn.',
      };
    case 'INVALID_HERO_DRAFT_STAGE':
      return {
        statusCode: 409,
        code,
        messageVi: 'Chưa tới lượt hoặc không ở pha chọn tướng.',
      };
    default:
      return {
        statusCode: 400,
        code,
        messageVi: `Hành động không hợp lệ: ${code}.`,
      };
  }
}

export function createRoomManager(deps: {
  readonly persistence: PersistenceStore;
  readonly authService: AuthService;
  readonly nowFn?: () => number;
  readonly timerScale?: number;
  readonly nullificationWindowMs?: number;
  readonly hostFailoverDelayMs?: number;
  readonly defaultRng?: () => number;
}): RoomManager {
  const roomsByCode = new Map<string, MutableRoomRecord>();
  const roomCodeByUserId = new Map<string, string>();
  const roomLocks = new Map<string, Promise<unknown>>();
  const updateListeners = new Set<RoomUpdateListener>();
  let globalOpQueue: Promise<unknown> = Promise.resolve();
  const getNowMs = deps.nowFn ?? (() => Date.now());
  const timerScale = deps.timerScale ?? 1;
  const nullificationWindowMs = deps.nullificationWindowMs ?? 3500;
  const hostFailoverDelayMs =
    deps.hostFailoverDelayMs ?? DEFAULT_HOST_FAILOVER_DELAY_MS;
  const fallbackRng = deps.defaultRng ?? Math.random;

  const emitRoomUpdated = (roomCode: string, reason: string): void => {
    for (const listener of updateListeners) {
      listener(roomCode, reason);
    }
  };

  const runWithGlobalLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = globalOpQueue.then(fn, fn);
    globalOpQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const runWithRoomLock = <T>(roomCode: string, fn: () => Promise<T>): Promise<T> => {
    const prev = roomLocks.get(roomCode) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    const sentinel = next.then(
      () => undefined,
      () => undefined,
    );
    roomLocks.set(roomCode, sentinel);
    void sentinel.then(() => {
      if (roomLocks.get(roomCode) === sentinel) {
        roomLocks.delete(roomCode);
      }
    });
    return next;
  };

  const archiveFinishedMatch = async (
    record: MutableRoomRecord,
    masterState: MasterGameState,
    nowMs: number,
  ): Promise<void> => {
    if (!masterState.winningFaction) {
      return;
    }
    const allHaveHero = masterState.players.every((p) => p.heroId !== null);
    if (!allHaveHero) {
      return;
    }
    const durationSeconds = record.matchStartedAtMs
      ? Math.max(1, Math.round((nowMs - record.matchStartedAtMs) / 1000))
      : 1;
    await deps.persistence.recordMatchResult({
      matchId: masterState.matchId,
      roomCode: record.roomState.roomCode,
      playerCount: masterState.players.length as PlayerCount,
      winningFaction: masterState.winningFaction,
      durationSeconds,
      participants: masterState.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        seatIndex: p.seatIndex,
        identity: p.identity,
        heroId: p.heroId!,
        isWinner: masterState.winnerUserIds.includes(p.userId),
        survived: p.alive,
      })),
      finishedAt: new Date(nowMs).toISOString(),
    });
  };

  const persistAfterMasterTransition = async (
    record: MutableRoomRecord,
    nextMasterState: MasterGameState,
    nowMs: number,
    options?: { readonly pushUndo?: boolean; readonly event?: string },
  ): Promise<void> => {
    if (options?.pushUndo && record.masterGameState) {
      record.undoHistory = [
        ...record.undoHistory,
        record.masterGameState,
      ].slice(-MAX_UNDO_HISTORY);
    }

    const oldPrompt = record.masterGameState?.interruptStack.at(-1);
    const keepNullificationDeadline = oldPrompt?.kind === 'WAIT_NULLIFICATION' &&
      oldPrompt.id === nextMasterState.interruptStack.at(-1)?.id;
    record.masterGameState = nextMasterState;
    if (nextMasterState.turnPhase === 'GAME_OVER') {
      record.roomState = { ...record.roomState, status: 'FINISHED' };
      record.undoHistory = [];
      record.phaseDeadlineAt = null;
      record.pausedRemainingMs = null;
      record.updatedAt = new Date(nowMs).toISOString();
      await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
      await archiveFinishedMatch(record, nextMasterState, nowMs);
    } else {
      record.phaseDeadlineAt = (keepNullificationDeadline ? record.phaseDeadlineAt : null) ?? computePhaseDeadlineIso(
        nextMasterState,
        record.roomState.timerPreset,
        record.roomState.isTimerPaused,
        nowMs,
        timerScale,
        nullificationWindowMs,
      );
      record.updatedAt = new Date(nowMs).toISOString();
      await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
    }
    emitRoomUpdated(record.roomState.roomCode, options?.event ?? 'STATE_UPDATED');
  };

  return {
    onRoomUpdated(listener: RoomUpdateListener): () => void {
      updateListeners.add(listener);
      return () => {
        updateListeners.delete(listener);
      };
    },

    getAllActiveRoomCodes(): readonly string[] {
      return Array.from(roomsByCode.keys());
    },

    async restoreFromPersistence(): Promise<number> {
      roomsByCode.clear();
      roomCodeByUserId.clear();

      const nowMs = getNowMs();
      const snapshots = await deps.persistence.listRecoverableRoomSnapshots();
      for (const snap of snapshots) {
        let phaseDeadlineAt = snap.phaseDeadlineAt;
        if (
          snap.roomState.status === 'IN_GAME' &&
          !snap.roomState.isTimerPaused &&
          snap.masterGameState &&
          (!phaseDeadlineAt || Date.parse(phaseDeadlineAt) <= nowMs)
        ) {
          phaseDeadlineAt = computePhaseDeadlineIso(
            snap.masterGameState,
            snap.roomState.timerPreset,
            false,
            nowMs,
            timerScale,
            nullificationWindowMs,
          );
        }

        const record: MutableRoomRecord = {
          roomState: snap.roomState,
          masterGameState: snap.masterGameState,
          undoHistory: [...snap.undoHistory],
          lastMatchAuditLog: [],
          phaseDeadlineAt,
          pausedRemainingMs: snap.pausedRemainingMs,
          matchStartedAtMs: snap.roomState.status === 'IN_GAME' ? nowMs : null,
          updatedAt: snap.updatedAt,
        };
        roomsByCode.set(snap.roomState.roomCode, record);
        for (const seat of snap.roomState.seats) {
          roomCodeByUserId.set(seat.userId, snap.roomState.roomCode);
        }
      }
      return snapshots.length;
    },

    getActiveRoomCodeForUser(userId: string): string | null {
      return roomCodeByUserId.get(userId) ?? null;
    },

    getRoomViewForUser(
      userId: string,
      roomCodeRaw: string,
    ): RoomOperationResult<RoomViewerPayload> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      const record = roomsByCode.get(roomCode);
      if (!record) {
        return {
          ok: false,
          statusCode: 404,
          code: 'ROOM_NOT_FOUND',
          messageVi: 'Không tìm thấy phòng chơi này.',
        };
      }

      const isMember = record.roomState.seats.some((s) => s.userId === userId);
      if (!isMember) {
        return {
          ok: false,
          statusCode: 403,
          code: 'NOT_ROOM_MEMBER',
          messageVi: 'Bạn không thuộc danh sách ghế của phòng này.',
        };
      }

      return { ok: true, data: buildViewerPayload(record, userId) };
    },

    async createRoom(
      profile: UserProfile,
      timerPreset: TimerPreset = 'STANDARD',
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      return runWithGlobalLock(async () => {
        const existingRoomCode =
          roomCodeByUserId.get(profile.userId) ?? profile.activeRoomCode;
        if (existingRoomCode) {
          return {
            ok: false,
            statusCode: 409,
            code: 'ACCOUNT_IN_ANOTHER_ROOM',
            messageVi: `Tài khoản đang ở phòng ${existingRoomCode}. Vui lòng rời phòng cũ trước khi tạo phòng mới.`,
          };
        }

        let roomCode = generateCandidateRoomCode();
        while (
          roomsByCode.has(roomCode) ||
          (await deps.persistence.getRoomSnapshot(roomCode)) !== null
        ) {
          roomCode = generateCandidateRoomCode();
        }

        const nowIso = new Date(getNowMs()).toISOString();
        const initialSeat: RoomSeat = {
          seatIndex: 0,
          userId: profile.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          connectionStatus: 'ONLINE',
          isBotTakeover: false,
        };

        const roomState: RoomState = {
          roomCode,
          status: 'LOBBY',
          ownerUserId: profile.userId,
          actingHostUserId: profile.userId,
          hostDisconnectedAt: null,
          timerPreset,
          isTimerPaused: false,
          seats: [initialSeat],
        };

        const record: MutableRoomRecord = {
          roomState,
          masterGameState: null,
          undoHistory: [],
          lastMatchAuditLog: [],
          phaseDeadlineAt: null,
          pausedRemainingMs: null,
          matchStartedAtMs: null,
          updatedAt: nowIso,
        };

        roomsByCode.set(roomCode, record);
        roomCodeByUserId.set(profile.userId, roomCode);

        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        await deps.persistence.setUserActiveRoom(profile.userId, roomCode);
        emitRoomUpdated(roomCode, 'ROOM_CREATED');

        return { ok: true, data: buildViewerPayload(record, profile.userId) };
      });
    },

    async joinRoom(
      profile: UserProfile,
      roomCodeRaw: string,
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: `Không tìm thấy phòng chơi mã ${roomCode}.`,
          };
        }

        const occupiedUserIds = record.roomState.seats.map((s) => s.userId);
        const memoryActiveRoom = roomCodeByUserId.get(profile.userId) ?? null;
        const effectiveProfile: UserProfile = {
          ...profile,
          activeRoomCode: memoryActiveRoom ?? profile.activeRoomCode,
        };

        const eligibility = deps.authService.checkAccountSeatEligibility({
          profile: effectiveProfile,
          occupiedUserIds,
          targetRoomCode: roomCode,
        });
        if (!eligibility.allowed) {
          return {
            ok: false,
            statusCode: eligibility.statusCode,
            code: eligibility.code,
            messageVi: eligibility.messageVi,
          };
        }

        if (record.roomState.status !== 'LOBBY') {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_ALREADY_STARTED',
            messageVi: 'Ván đấu đã bắt đầu, không thể vào thêm ghế mới.',
          };
        }

        if (record.roomState.seats.length >= 8) {
          return {
            ok: false,
            statusCode: 409,
            code: 'ROOM_FULL',
            messageVi: 'Phòng chơi đã đủ tối đa 8 người thật.',
          };
        }

        const nextSeat: RoomSeat = {
          seatIndex: record.roomState.seats.length,
          userId: profile.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          connectionStatus: 'ONLINE',
          isBotTakeover: false,
        };

        record.roomState = {
          ...record.roomState,
          seats: [...record.roomState.seats, nextSeat],
        };
        record.updatedAt = new Date(getNowMs()).toISOString();

        roomCodeByUserId.set(profile.userId, roomCode);
        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        await deps.persistence.setUserActiveRoom(profile.userId, roomCode);
        emitRoomUpdated(roomCode, 'PLAYER_JOINED');

        return { ok: true, data: buildViewerPayload(record, profile.userId) };
      });
    },

    async setReady(userId, roomCodeRaw, isReady) {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        const seat = record?.roomState.seats.find(member => member.userId === userId);
        if (!record || !seat) {
          return { ok: false, statusCode: 404, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng của bạn.' };
        }
        if (record.roomState.status !== 'LOBBY' || seat.connectionStatus !== 'ONLINE' ||
          record.roomState.actingHostUserId === userId) {
          return { ok: false, statusCode: 409, code: 'READY_UNAVAILABLE', messageVi: 'Hiện không thể đổi trạng thái sẵn sàng.' };
        }
        if (Boolean(seat.isReady) !== isReady) {
          const roomState = {
            ...record.roomState,
            seats: record.roomState.seats.map(member => member === seat ? { ...seat, isReady } : member),
          };
          const updatedAt = new Date(getNowMs()).toISOString();
          await deps.persistence.saveRoomSnapshot(toSnapshotRecord({ ...record, roomState, updatedAt }));
          record.roomState = roomState;
          record.updatedAt = updatedAt;
          emitRoomUpdated(roomCode, 'READY_UPDATED');
        }
        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    async updateTimerPreset(
      userId: string,
      roomCodeRaw: string,
      timerPreset: TimerPreset,
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        if (
          record.roomState.actingHostUserId !== userId &&
          record.roomState.ownerUserId !== userId
        ) {
          return {
            ok: false,
            statusCode: 403,
            code: 'HOST_ONLY',
            messageVi: 'Chỉ Chủ phòng mới được đổi mức đồng hồ đếm ngược.',
          };
        }

        if (record.roomState.status !== 'LOBBY') {
          return {
            ok: false,
            statusCode: 409,
            code: 'CANNOT_CHANGE_TIMER_IN_GAME',
            messageVi: 'Chỉ có thể đổi tốc độ đồng hồ khi đang ở phòng chờ.',
          };
        }

        record.roomState = {
          ...record.roomState,
          timerPreset,
        };
        record.updatedAt = new Date(getNowMs()).toISOString();
        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        emitRoomUpdated(roomCode, 'TIMER_UPDATED');

        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    async leaveRoom(
      userId: string,
      roomCodeRaw: string,
    ): Promise<
      RoomOperationResult<{ readonly deleted: boolean; readonly room: RoomViewerPayload | null }>
    > {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        const existsInSeats = record.roomState.seats.some((s) => s.userId === userId);
        if (!existsInSeats) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không ngồi trong phòng này.',
          };
        }

        if (record.roomState.status === 'IN_GAME') {
          return {
            ok: false,
            statusCode: 409,
            code: 'CANNOT_LEAVE_IN_GAME',
            messageVi: 'Ván đấu đang diễn ra, không thể tự rời ghế giữa chừng.',
          };
        }

        const remainingSeats: RoomSeat[] = record.roomState.seats
          .filter((s) => s.userId !== userId)
          .map((seat, idx) => ({ ...seat, seatIndex: idx }));

        roomCodeByUserId.delete(userId);
        await deps.persistence.setUserActiveRoom(userId, null);

        if (remainingSeats.length === 0) {
          roomsByCode.delete(roomCode);
          await deps.persistence.deleteRoomSnapshot(roomCode);
          emitRoomUpdated(roomCode, 'ROOM_DELETED');
          return { ok: true, data: { deleted: true, room: null } };
        }

        const nextOwnerId =
          record.roomState.ownerUserId === userId
            ? remainingSeats[0]!.userId
            : record.roomState.ownerUserId;
        const nextActingHostId =
          record.roomState.actingHostUserId === userId
            ? nextOwnerId
            : record.roomState.actingHostUserId;

        record.roomState = {
          ...record.roomState,
          ownerUserId: nextOwnerId,
          actingHostUserId: nextActingHostId,
          seats: remainingSeats,
        };
        record.updatedAt = new Date(getNowMs()).toISOString();
        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        emitRoomUpdated(roomCode, 'PLAYER_LEFT');

        return {
          ok: true,
          data: {
            deleted: false,
            room: buildViewerPayload(record, remainingSeats[0]!.userId),
          },
        };
      });
    },

    async startMatch(
      userId: string,
      roomCodeRaw: string,
      options?: { readonly rng?: () => number },
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        if (
          record.roomState.actingHostUserId !== userId
        ) {
          return {
            ok: false,
            statusCode: 403,
            code: 'ONLY_HOST_CAN_START',
            messageVi: 'Chỉ Chủ phòng mới được bấm bắt đầu ván đấu.',
          };
        }

        if (record.roomState.status === 'IN_GAME') {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_ALREADY_STARTED',
            messageVi: 'Ván đấu này đang diễn ra.',
          };
        }
        if (record.roomState.status === 'FINISHED') {
          record.roomState = {
            ...record.roomState,
            status: 'LOBBY',
            isTimerPaused: false,
            seats: record.roomState.seats.map((seat) => ({
              ...seat,
              isBotTakeover: false,
              ...(seat.userId !== record.roomState.actingHostUserId
                ? { isReady: seat.connectionStatus === 'ONLINE' }
                : {}),
            })),
          };
          record.masterGameState = null;
          record.undoHistory = [];
          record.lastMatchAuditLog = [];
          record.phaseDeadlineAt = null;
          record.pausedRemainingMs = null;
        }

        const seatCount = record.roomState.seats.length;
        if (seatCount < 4) {
          return {
            ok: false,
            statusCode: 400,
            code: 'INSUFFICIENT_REAL_PLAYERS',
            messageVi: `Cần tối thiểu 4 người chơi thật để bắt đầu (hiện có ${seatCount}/4). Không thêm Máy vào ghế trống ở phòng chờ.`,
          };
        }

        if (seatCount > 8) {
          return {
            ok: false,
            statusCode: 400,
            code: 'TOO_MANY_PLAYERS',
            messageVi: 'Mỗi bàn tối đa chỉ hỗ trợ 8 người chơi thật.',
          };
        }

        const pending = record.roomState.seats.filter(seat => seat.userId !== userId &&
          (!seat.isReady || seat.connectionStatus !== 'ONLINE'));
        if (pending.length) {
          return { ok: false, statusCode: 409, code: 'GUESTS_NOT_READY',
            messageVi: `Chờ ${pending.length} khách sẵn sàng.` };
        }

        const matchId = `match_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const rng = options?.rng ?? fallbackRng;
        const setupState = createInitialMatchSetup({
          matchId,
          seats: record.roomState.seats.map((seat) => ({
            userId: seat.userId,
            displayName: seat.displayName,
            avatarUrl: seat.avatarUrl,
          })),
          rng,
        });

        const nowMs = getNowMs();
        record.roomState = {
          ...record.roomState,
          status: 'IN_GAME',
          isTimerPaused: false,
        };
        record.undoHistory = [];
        record.lastMatchAuditLog = [];
        record.pausedRemainingMs = null;
        record.matchStartedAtMs = nowMs;

        await persistAfterMasterTransition(record, setupState, nowMs, {
          event: 'MATCH_STARTED',
        });
        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    async selectHero(
      userId: string,
      roomCodeRaw: string,
      heroId: HeroId,
      options?: { readonly rng?: () => number },
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        if (record.roomState.status !== 'IN_GAME' || !record.masterGameState) {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_NOT_ACTIVE',
            messageVi: 'Phòng chơi chưa bước vào ván đấu.',
          };
        }

        if (!HERO_BY_ID[heroId]) {
          return {
            ok: false,
            statusCode: 400,
            code: 'INVALID_HERO_ID',
            messageVi: 'Mã tướng không thuộc 25 Tướng Bản Tiêu Chuẩn.',
          };
        }

        const seat = record.masterGameState.players.find(
          (p) => p.userId === userId,
        );
        if (!seat) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không thuộc ván đấu này.',
          };
        }

        const draft = record.masterGameState.heroDraft;
        if (!draft || record.masterGameState.turnPhase !== 'HERO_SELECT') {
          return {
            ok: false,
            statusCode: 409,
            code: 'INVALID_HERO_DRAFT_STAGE',
            messageVi: 'Giai đoạn chọn tướng đã kết thúc.',
          };
        }

        const rng = options?.rng ?? fallbackRng;
        let nextState: MasterGameState;
        try {
          if (draft.stage === 'LORD_SELECTING') {
            nextState = selectLordHero(
              record.masterGameState,
              seat.seatIndex,
              heroId,
              rng,
            );
          } else if (draft.stage === 'OTHERS_SELECTING') {
            nextState = selectPlayerHero(
              record.masterGameState,
              seat.seatIndex,
              heroId,
            );
          } else {
            return {
              ok: false,
              statusCode: 409,
              code: 'INVALID_HERO_DRAFT_STAGE',
              messageVi: 'Tất cả người chơi đã chọn tướng xong.',
            };
          }

          if (nextState.heroDraft?.stage === 'COMPLETED') {
            nextState = startMatchCombat(nextState, rng);
          }
        } catch (err) {
          return {
            ok: false,
            ...mapSetupOrHeroErrorVi(err),
          };
        }

        syncTakeoverOnState(record, userId, {
          connectionStatus: 'ONLINE',
          isBotTakeover: false,
        });
        await persistAfterMasterTransition(record, nextState, getNowMs(), {
          event: 'HERO_SELECTED',
        });
        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    async applyPlayerAction(
      userId: string,
      roomCodeRaw: string,
      action: GameAction,
      options?: { readonly rng?: () => number },
    ): Promise<RoomOperationResult<ApplyPlayerActionOutcome>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        if (record.roomState.status !== 'IN_GAME' || !record.masterGameState) {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_NOT_ACTIVE',
            messageVi: 'Phòng hiện không ở trong ván đấu.',
          };
        }

        if (record.roomState.isTimerPaused) {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_PAUSED',
            messageVi: 'Ván đấu đang được Trọng Tài tạm dừng.',
          };
        }

        if (action.type === 'RESOLVE_SIMULATED_NULLIFICATION') {
          return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN_ACTION',
            messageVi: 'Máy khách không được tự kết thúc nhịp chờ Vô Giải giả lập.',
          };
        }

        const seatPlayer = record.masterGameState.players.find(
          (p) => p.userId === userId,
        );
        if (!seatPlayer) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không thuộc bàn đấu này.',
          };
        }

        if (action.seatIndex !== seatPlayer.seatIndex) {
          return {
            ok: false,
            statusCode: 403,
            code: 'UNAUTHORIZED_SEAT',
            messageVi: 'Bạn chỉ được thao tác trên đúng ghế của mình.',
          };
        }

        // Khôi phục quyền điều khiển tay nếu người chơi bấm thao tác trực tiếp
        syncTakeoverOnState(record, userId, {
          connectionStatus: 'ONLINE',
          isBotTakeover: false,
        });

        const topInterrupt =
          record.masterGameState.interruptStack[
            record.masterGameState.interruptStack.length - 1
          ];

        if (action.type === 'RESPOND_NULLIFICATION' && action.cardId !== null &&
            topInterrupt?.kind === 'WAIT_NULLIFICATION' && record.phaseDeadlineAt &&
            getNowMs() >= Date.parse(record.phaseDeadlineAt)) {
          return {
            ok: false,
            statusCode: 409,
            code: 'NULLIFICATION_WINDOW_CLOSED',
            messageVi: 'Đã hết thời gian dùng Vô Giải Khả Kích.',
          };
        }

        if (
          action.type === 'RESPOND_NULLIFICATION' &&
          action.cardId === null &&
          topInterrupt?.kind === 'WAIT_NULLIFICATION'
        ) {
          if (
            topInterrupt.isSimulatedDelay ||
            !topInterrupt.eligibleSeats.includes(seatPlayer.seatIndex)
          ) {
            // Chống lộ thông tin: người chơi không cầm Vô Giải bấm Bỏ qua được xác nhận im lặng
            return {
              ok: true,
              data: {
                viewerPayload: buildViewerPayload(record, userId),
                silentPass: true,
              },
            };
          }
        }

        const rng = options?.rng ?? fallbackRng;
        let nextState: MasterGameState;
        try {
          nextState = applyGameAction(record.masterGameState, action, rng, { deferNullificationPass: true });

          if (
            action.type === 'SET_AUTO_SKIP_NULLIFICATION' &&
            action.enabled &&
            topInterrupt?.kind === 'WAIT_NULLIFICATION' &&
            !topInterrupt.isSimulatedDelay &&
            topInterrupt.eligibleSeats.includes(seatPlayer.seatIndex) &&
            !topInterrupt.passedSeats.includes(seatPlayer.seatIndex)
          ) {
            nextState = applyGameAction(
              nextState,
              {
                type: 'RESPOND_NULLIFICATION',
                seatIndex: seatPlayer.seatIndex,
                cardId: null,
              },
              rng,
              { deferNullificationPass: true },
            );
          }
        } catch (err) {
          return {
            ok: false,
            ...mapSetupOrHeroErrorVi(err),
          };
        }

        const shouldPushUndo = action.type !== 'SET_AUTO_SKIP_NULLIFICATION' &&
          !(action.type === 'RESPOND_NULLIFICATION' && action.cardId === null);
        await persistAfterMasterTransition(record, nextState, getNowMs(), {
          pushUndo: shouldPushUndo,
          event: topInterrupt?.kind === 'WAIT_NULLIFICATION' &&
            topInterrupt.id === nextState.interruptStack.at(-1)?.id &&
            (action.type === 'RESPOND_NULLIFICATION' || action.type === 'SET_AUTO_SKIP_NULLIFICATION')
            ? `NULLIFICATION_PRIVATE:${userId}` : `ACTION:${action.type}`,
        });

        return {
          ok: true,
          data: {
            viewerPayload: buildViewerPayload(record, userId),
            silentPass: false,
          },
        };
      });
    },

    async resolveSimulatedNullification(
      roomCodeRaw: string,
      expectedFrameId: string,
      options?: { readonly rng?: () => number },
    ): Promise<RoomOperationResult<RoomSnapshotRecord>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record || record.roomState.status !== 'IN_GAME' || !record.masterGameState) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_OR_MATCH_NOT_ACTIVE',
            messageVi: 'Phòng không còn trong ván đấu.',
          };
        }

        if (record.roomState.isTimerPaused) {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_PAUSED',
            messageVi: 'Ván đấu đang tạm dừng.',
          };
        }

        const top =
          record.masterGameState.interruptStack[
            record.masterGameState.interruptStack.length - 1
          ];
        if (
          !top ||
          top.kind !== 'WAIT_NULLIFICATION' ||
          top.id !== expectedFrameId ||
          !top.isSimulatedDelay
        ) {
          return {
            ok: false,
            statusCode: 409,
            code: 'SIMULATED_FRAME_MISMATCH',
            messageVi: 'Nhịp Vô Giải giả lập đã kết thúc trước đó.',
          };
        }

        const nextState = applyGameAction(
          record.masterGameState,
          { type: 'RESOLVE_SIMULATED_NULLIFICATION' },
          options?.rng ?? fallbackRng,
        );

        await persistAfterMasterTransition(record, nextState, getNowMs(), {
          pushUndo: false,
          event: 'SIMULATED_NULLIFICATION_RESOLVED',
        });

        return { ok: true, data: toSnapshotRecord(record) };
      });
    },

    async setUserConnectionAndTakeover(
      userId: string,
      roomCodeRaw: string,
      params: {
        readonly connectionStatus: 'ONLINE' | 'DISCONNECTED';
        readonly isBotTakeover?: boolean;
        readonly logMessageVi?: string;
      },
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        const isMember = record.roomState.seats.some((s) => s.userId === userId);
        if (!isMember) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không thuộc phòng này.',
          };
        }

        const nowMs = getNowMs();
        let changed = syncTakeoverOnState(record, userId, params);

        const ownerId = record.roomState.ownerUserId;
        const actingId = record.roomState.actingHostUserId;
        const targetSeat = record.roomState.seats.find((s) => s.userId === userId);
        const actorName = targetSeat?.displayName ?? userId;

        if (userId === ownerId && params.connectionStatus === 'DISCONNECTED') {
          if (!record.roomState.hostDisconnectedAt) {
            record.roomState = {
              ...record.roomState,
              hostDisconnectedAt: new Date(nowMs).toISOString(),
            };
            changed = true;
          }
        } else if (userId === ownerId && params.connectionStatus === 'ONLINE') {
          if (record.roomState.hostDisconnectedAt !== null || actingId !== ownerId) {
            const hadDelegatedHost = actingId !== ownerId;
            record.roomState = {
              ...record.roomState,
              hostDisconnectedAt: null,
              actingHostUserId: ownerId,
            };
            if (hadDelegatedHost && record.masterGameState) {
              record.masterGameState = {
                ...record.masterGameState,
                actionLog: [
                  ...record.masterGameState.actionLog,
                  `Chủ phòng gốc ${actorName} đã kết nối lại và nhận lại quyền Trọng Tài.`,
                ],
              };
            }
            changed = true;
          }
        } else if (userId !== ownerId && params.connectionStatus === 'DISCONNECTED' && actingId === userId) {
          const nextOnline = pickClockwiseOnlineSeat(
            record.roomState.seats,
            userId,
            ownerId,
          );
          const nextHostId = nextOnline ? nextOnline.userId : ownerId;
          record.roomState = {
            ...record.roomState,
            actingHostUserId: nextHostId,
          };
          if (nextOnline && record.masterGameState) {
            record.masterGameState = {
              ...record.masterGameState,
              actionLog: [
                ...record.masterGameState.actionLog,
                `Trọng Tài tạm thời ${actorName} mất kết nối — quyền Trọng Tài chuyển sang ${nextOnline.displayName}.`,
              ],
            };
          }
          changed = true;
        } else if (
          userId !== ownerId &&
          params.connectionStatus === 'ONLINE' &&
          record.roomState.hostDisconnectedAt !== null &&
          actingId === ownerId &&
          nowMs >= Date.parse(record.roomState.hostDisconnectedAt) + hostFailoverDelayMs
        ) {
          record.roomState = {
            ...record.roomState,
            actingHostUserId: userId,
          };
          if (record.masterGameState) {
            record.masterGameState = {
              ...record.masterGameState,
              actionLog: [
                ...record.masterGameState.actionLog,
                `Chủ phòng gốc đang mất kết nối quá 30 giây — quyền Trọng Tài tạm thời giao cho ${actorName}.`,
              ],
            };
          }
          changed = true;
        }

        if (
          params.connectionStatus === 'ONLINE' &&
          params.isBotTakeover === false &&
          record.roomState.status === 'IN_GAME' &&
          !record.roomState.isTimerPaused &&
          record.masterGameState
        ) {
          if (
            !record.phaseDeadlineAt ||
            (record.masterGameState.interruptStack.at(-1)?.kind !== 'WAIT_NULLIFICATION' &&
              Date.parse(record.phaseDeadlineAt) <= nowMs + 1000)
          ) {
            record.phaseDeadlineAt = computePhaseDeadlineIso(
              record.masterGameState,
              record.roomState.timerPreset,
              false,
              nowMs,
              timerScale,
              nullificationWindowMs,
            );
          }
        }

        if (changed) {
          record.updatedAt = new Date(nowMs).toISOString();
          await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
          emitRoomUpdated(
            roomCode,
            params.connectionStatus === 'ONLINE'
              ? 'PLAYER_RECLAIMED'
              : 'PLAYER_DISCONNECTED',
          );
        }

        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    async executeBotActionIfEligible(
      roomCodeRaw: string,
      options?: { readonly rng?: () => number },
    ): Promise<{ readonly acted: boolean; readonly roomCode: string }> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (
          !record ||
          record.roomState.status !== 'IN_GAME' ||
          record.roomState.isTimerPaused ||
          !record.masterGameState
        ) {
          return { acted: false, roomCode };
        }

        const master = record.masterGameState;
        const prompt = getPendingPrompt(master);
        if (!prompt || prompt.isSimulatedDelay) {
          return { acted: false, roomCode };
        }

        const botActorSeat = prompt.actorSeats.find((seatIndex) => {
          const p = master.players.find((pl) => pl.seatIndex === seatIndex);
          return p?.isBotTakeover === true;
        });

        if (botActorSeat === undefined) {
          return { acted: false, roomCode };
        }

        const actor = master.players.find((p) => p.seatIndex === botActorSeat);
        if (!actor) {
          return { acted: false, roomCode };
        }

        const rng = options?.rng ?? fallbackRng;
        const botView = projectStateForPlayer(master, actor.userId);
        let nextState: MasterGameState;

        if (master.turnPhase === 'HERO_SELECT') {
          const heroPick = chooseBotHero(botView);
          nextState =
            master.heroDraft?.stage === 'LORD_SELECTING'
              ? selectLordHero(master, botActorSeat, heroPick, rng)
              : selectPlayerHero(master, botActorSeat, heroPick);
          if (nextState.heroDraft?.stage === 'COMPLETED') {
            nextState = startMatchCombat(nextState, rng);
          }
        } else {
          const botAction = decideBotAction(botView, rng);
          nextState = applyGameAction(master, botAction, rng, { deferNullificationPass: true });
        }

        await persistAfterMasterTransition(record, nextState, getNowMs(), {
          pushUndo: true,
          event: master.interruptStack.at(-1)?.kind === 'WAIT_NULLIFICATION' &&
            master.interruptStack.at(-1)?.id === nextState.interruptStack.at(-1)?.id
            ? `NULLIFICATION_PRIVATE:${actor.userId}` : 'BOT_ACTION',
        });
        return { acted: true, roomCode };
      });
    },

    async handlePhaseTimeout(
      roomCodeRaw: string,
      options?: { readonly rng?: () => number },
    ): Promise<{ readonly handled: boolean; readonly roomCode: string }> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (
          !record ||
          record.roomState.status !== 'IN_GAME' ||
          record.roomState.isTimerPaused ||
          !record.masterGameState ||
          !record.phaseDeadlineAt
        ) {
          return { handled: false, roomCode };
        }

        const nowMs = getNowMs();
        if (nowMs < Date.parse(record.phaseDeadlineAt)) {
          return { handled: false, roomCode };
        }

        const master = record.masterGameState;
        const prompt = getPendingPrompt(master);
        if (!prompt) {
          return { handled: false, roomCode };
        }

        const rng = options?.rng ?? fallbackRng;

        if (master.turnPhase === 'HERO_SELECT') {
          let nextState = autoSelectTimedOutHeroes(master, rng);
          if (nextState.heroDraft?.stage === 'COMPLETED') {
            nextState = startMatchCombat(nextState, rng);
          }
          nextState = {
            ...nextState,
            actionLog: [
              ...nextState.actionLog,
              'Hết giờ chọn tướng — hệ thống tự chọn tướng đầu tiên cho người chưa chọn.',
            ],
          };
          await persistAfterMasterTransition(record, nextState, nowMs, {
            event: 'HERO_SELECT_TIMEOUT',
          });
          return { handled: true, roomCode };
        }

        if (master.interruptStack.at(-1)?.kind === 'WAIT_NULLIFICATION') {
          const nextState = advanceSkippedPhaseState(master, rng);
          await persistAfterMasterTransition(record, nextState, nowMs, {
            pushUndo: true,
            event: 'NULLIFICATION_WINDOW_CLOSED',
          });
          return { handled: true, roomCode };
        }
        const timedOutSeat = prompt.actorSeats[0];
        if (timedOutSeat === undefined) {
          return { handled: false, roomCode };
        }

        const actor = master.players.find((p) => p.seatIndex === timedOutSeat);
        if (!actor) {
          return { handled: false, roomCode };
        }

        syncTakeoverOnState(record, actor.userId, {
          isBotTakeover: true,
          logMessageVi: `${actor.displayName} hết giờ — Máy tạm thời đánh hộ.`,
        });
        const stateWithTakeover = record.masterGameState!;
        const botView = projectStateForPlayer(stateWithTakeover, actor.userId);
        const botAction = decideBotAction(botView, rng);
        const nextState = applyGameAction(stateWithTakeover, botAction, rng);

        await persistAfterMasterTransition(record, nextState, nowMs, {
          pushUndo: true,
          event: 'TURN_OR_REACTION_TIMEOUT',
        });
        return { handled: true, roomCode };
      });
    },

    async applyRefereeAction(
      actorUserId: string,
      roomCodeRaw: string,
      actionType: RefereeActionType,
      options?: { readonly rng?: () => number },
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        const actorSeat = record.roomState.seats.find(
          (s) => s.userId === actorUserId,
        );
        if (!actorSeat) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không thuộc phòng này.',
          };
        }

        if (record.roomState.actingHostUserId !== actorUserId) {
          return {
            ok: false,
            statusCode: 403,
            code: 'ONLY_ACTING_HOST',
            messageVi:
              'Chỉ Chủ phòng / Trọng Tài hiện tại mới được dùng Bảng Trọng Tài.',
          };
        }

        const nowMs = getNowMs();
        const auditEntry: RefereeAuditEntry = {
          timestamp: new Date(nowMs).toISOString(),
          actorUserId,
          actorName: actorSeat.displayName,
          actionType,
        };

        if (actionType === 'ABORT_MATCH') {
          if (
            record.roomState.status !== 'IN_GAME' &&
            record.roomState.status !== 'FINISHED'
          ) {
            return {
              ok: false,
              statusCode: 409,
              code: 'MATCH_NOT_ACTIVE',
              messageVi: 'Hiện không có ván đấu nào để kết thúc.',
            };
          }

          const existingLogs =
            record.masterGameState?.refereeAuditLog ?? record.lastMatchAuditLog;
          record.lastMatchAuditLog = [...existingLogs, auditEntry];
          record.roomState = {
            ...record.roomState,
            status: 'LOBBY',
            isTimerPaused: false,
            seats: record.roomState.seats.map((s) => ({
              ...s,
              isReady: false,
              isBotTakeover: false,
            })),
          };
          record.masterGameState = null;
          record.undoHistory = [];
          record.phaseDeadlineAt = null;
          record.pausedRemainingMs = null;
          record.matchStartedAtMs = null;
          record.updatedAt = new Date(nowMs).toISOString();

          await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
          emitRoomUpdated(roomCode, 'REFEREE_ABORT_MATCH');
          return { ok: true, data: buildViewerPayload(record, actorUserId) };
        }

        if (record.roomState.status !== 'IN_GAME' || !record.masterGameState) {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_NOT_ACTIVE',
            messageVi: 'Lệnh Trọng Tài này chỉ dùng được khi ván đấu đang diễn ra.',
          };
        }

        const master = record.masterGameState;
        const rng = options?.rng ?? fallbackRng;

        switch (actionType) {
          case 'PAUSE': {
            if (record.roomState.isTimerPaused) {
              return {
                ok: false,
                statusCode: 409,
                code: 'ALREADY_PAUSED',
                messageVi: 'Ván đấu đang được tạm dừng sẵn.',
              };
            }
            const fallbackMs = Math.max(
              500,
              Math.round(
                TIMER_PRESETS[record.roomState.timerPreset].mainTurnSeconds *
                  1000 *
                  timerScale,
              ),
            );
            const remainingMs = record.phaseDeadlineAt
              ? Math.max(200, Date.parse(record.phaseDeadlineAt) - nowMs)
              : fallbackMs;

            record.roomState = { ...record.roomState, isTimerPaused: true };
            record.pausedRemainingMs = remainingMs;
            record.phaseDeadlineAt = null;
            record.masterGameState = {
              ...master,
              refereeAuditLog: [...master.refereeAuditLog, auditEntry],
              actionLog: [
                ...master.actionLog,
                `Trọng Tài ${actorSeat.displayName} đã Tạm dừng ván đấu.`,
              ],
            };
            record.updatedAt = new Date(nowMs).toISOString();
            await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
            emitRoomUpdated(roomCode, 'REFEREE_PAUSE');
            return { ok: true, data: buildViewerPayload(record, actorUserId) };
          }

          case 'RESUME': {
            if (!record.roomState.isTimerPaused) {
              return {
                ok: false,
                statusCode: 409,
                code: 'NOT_PAUSED',
                messageVi: 'Ván đấu không ở trạng thái tạm dừng.',
              };
            }
            const fallbackMs = Math.max(
              500,
              Math.round(
                TIMER_PRESETS[record.roomState.timerPreset].mainTurnSeconds *
                  1000 *
                  timerScale,
              ),
            );
            const remainingMs = Math.max(
              200,
              record.pausedRemainingMs ?? fallbackMs,
            );
            record.roomState = { ...record.roomState, isTimerPaused: false };
            record.pausedRemainingMs = null;
            record.phaseDeadlineAt = new Date(nowMs + remainingMs).toISOString();
            record.masterGameState = {
              ...master,
              refereeAuditLog: [...master.refereeAuditLog, auditEntry],
              actionLog: [
                ...master.actionLog,
                `Trọng Tài ${actorSeat.displayName} đã cho Tiếp tục ván đấu.`,
              ],
            };
            record.updatedAt = new Date(nowMs).toISOString();
            await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
            emitRoomUpdated(roomCode, 'REFEREE_RESUME');
            return { ok: true, data: buildViewerPayload(record, actorUserId) };
          }

          case 'UNDO_ONE_STEP': {
            const restored = record.undoHistory[record.undoHistory.length - 1];
            if (!restored) {
              return {
                ok: false,
                statusCode: 409,
                code: 'NO_UNDO_HISTORY',
                messageVi: 'Không còn bước trước đó để hoàn tác (tối đa 5 bước gần nhất).',
              };
            }
            record.undoHistory = record.undoHistory.slice(0, -1);

            const seatTakeoverMap = new Map(
              record.roomState.seats.map((s) => [s.userId, s.isBotTakeover]),
            );
            const syncedPlayers = restored.players.map((p) => {
              const currentTakeover = seatTakeoverMap.get(p.userId);
              return currentTakeover !== undefined &&
                currentTakeover !== p.isBotTakeover
                ? { ...p, isBotTakeover: currentTakeover }
                : p;
            });

            const nextMaster: MasterGameState = {
              ...restored,
              players: syncedPlayers,
              refereeAuditLog: [...master.refereeAuditLog, auditEntry],
              actionLog: [
                ...restored.actionLog,
                `Trọng Tài ${actorSeat.displayName} đã Hoàn tác 1 bước.`,
              ],
            };

            record.masterGameState = nextMaster;
            record.phaseDeadlineAt = record.roomState.isTimerPaused
              ? null
              : computePhaseDeadlineIso(
                  nextMaster,
                  record.roomState.timerPreset,
                  false,
                  nowMs,
                  timerScale,
                  nullificationWindowMs,
                );
            record.updatedAt = new Date(nowMs).toISOString();
            await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
            emitRoomUpdated(roomCode, 'REFEREE_UNDO_ONE_STEP');
            return { ok: true, data: buildViewerPayload(record, actorUserId) };
          }

          case 'SKIP_PHASE': {
            if (master.turnPhase === 'GAME_OVER') {
              return {
                ok: false,
                statusCode: 409,
                code: 'MATCH_ALREADY_FINISHED',
                messageVi: 'Ván đấu đã kết thúc.',
              };
            }

            const skippedState = advanceSkippedPhaseState(master, rng);
            const nextMaster: MasterGameState = {
              ...skippedState,
              refereeAuditLog: [...skippedState.refereeAuditLog, auditEntry],
              actionLog: [
                ...skippedState.actionLog,
                `Trọng Tài ${actorSeat.displayName} đã Bỏ qua pha chờ.`,
              ],
            };

            if (record.roomState.isTimerPaused) {
              record.undoHistory = [...record.undoHistory, master].slice(
                -MAX_UNDO_HISTORY,
              );
              record.masterGameState = nextMaster;
              if (nextMaster.turnPhase === 'GAME_OVER') {
                record.roomState = {
                  ...record.roomState,
                  status: 'FINISHED',
                  isTimerPaused: false,
                };
                record.undoHistory = [];
                record.pausedRemainingMs = null;
                record.phaseDeadlineAt = null;
                record.updatedAt = new Date(nowMs).toISOString();
                await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
                await archiveFinishedMatch(record, nextMaster, nowMs);
              } else {
                record.phaseDeadlineAt = null;
                record.updatedAt = new Date(nowMs).toISOString();
                await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
              }
              emitRoomUpdated(roomCode, 'REFEREE_SKIP_PHASE');
            } else {
              await persistAfterMasterTransition(record, nextMaster, nowMs, {
                pushUndo: true,
                event: 'REFEREE_SKIP_PHASE',
              });
            }

            return { ok: true, data: buildViewerPayload(record, actorUserId) };
          }
        }
      });
    },

    async transferActingHostAfterTimeout(
      roomCodeRaw: string,
    ): Promise<{ readonly transferred: boolean; readonly roomCode: string }> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (
          !record ||
          record.roomState.status === 'FINISHED' ||
          record.roomState.hostDisconnectedAt === null ||
          record.roomState.actingHostUserId !== record.roomState.ownerUserId
        ) {
          return { transferred: false, roomCode };
        }

        const nowMs = getNowMs();
        if (
          nowMs <
          Date.parse(record.roomState.hostDisconnectedAt) + hostFailoverDelayMs
        ) {
          return { transferred: false, roomCode };
        }

        const ownerId = record.roomState.ownerUserId;
        const ownerSeat = record.roomState.seats.find(
          (s) => s.userId === ownerId,
        );
        if (!ownerSeat || ownerSeat.connectionStatus !== 'DISCONNECTED') {
          return { transferred: false, roomCode };
        }

        const nextOnline = pickClockwiseOnlineSeat(
          record.roomState.seats,
          ownerId,
          ownerId,
        );
        if (!nextOnline) {
          return { transferred: false, roomCode };
        }

        record.roomState = {
          ...record.roomState,
          actingHostUserId: nextOnline.userId,
        };
        if (record.masterGameState) {
          record.masterGameState = {
            ...record.masterGameState,
            actionLog: [
              ...record.masterGameState.actionLog,
              `Chủ phòng ${ownerSeat.displayName} mất kết nối quá 30 giây — quyền Trọng Tài tạm thời chuyển cho ${nextOnline.displayName}.`,
            ],
          };
        }
        record.updatedAt = new Date(nowMs).toISOString();
        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        emitRoomUpdated(roomCode, 'ACTING_HOST_TRANSFERRED');
        return { transferred: true, roomCode };
      });
    },

    async commitMatchStep(
      roomCodeRaw: string,
      nextMasterState: MasterGameState,
      options?: { readonly pushUndo?: boolean; readonly nowMs?: number },
    ): Promise<RoomOperationResult<RoomSnapshotRecord>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }

        await persistAfterMasterTransition(
          record,
          nextMasterState,
          options?.nowMs ?? getNowMs(),
          {
            pushUndo: options?.pushUndo ?? false,
            event: 'COMMIT_STEP',
          },
        );
        return { ok: true, data: toSnapshotRecord(record) };
      });
    },

    async resetRoomToLobby(
      userId: string,
      roomCodeRaw: string,
    ): Promise<RoomOperationResult<RoomViewerPayload>> {
      const roomCode = normalizeRoomCode(roomCodeRaw);
      return runWithRoomLock(roomCode, async () => {
        const record = roomsByCode.get(roomCode);
        if (!record) {
          return {
            ok: false,
            statusCode: 404,
            code: 'ROOM_NOT_FOUND',
            messageVi: 'Không tìm thấy phòng chơi này.',
          };
        }
        const isMember = record.roomState.seats.some((s) => s.userId === userId);
        if (!isMember) {
          return {
            ok: false,
            statusCode: 403,
            code: 'NOT_ROOM_MEMBER',
            messageVi: 'Bạn không thuộc danh sách ghế của phòng này.',
          };
        }
        if (record.roomState.status === 'IN_GAME') {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_STILL_ACTIVE',
            messageVi: 'Ván đấu vẫn đang diễn ra.',
          };
        }
        if (record.roomState.status === 'FINISHED') {
          const nowIso = new Date(getNowMs()).toISOString();
          record.roomState = {
            ...record.roomState,
            status: 'LOBBY',
            isTimerPaused: false,
            seats: record.roomState.seats.map((seat) => ({
              ...seat,
              isBotTakeover: false,
              ...(seat.userId !== record.roomState.actingHostUserId
                ? { isReady: seat.connectionStatus === 'ONLINE' }
                : {}),
            })),
          };
          record.masterGameState = null;
          record.undoHistory = [];
          record.lastMatchAuditLog = [];
          record.phaseDeadlineAt = null;
          record.pausedRemainingMs = null;
          record.matchStartedAtMs = null;
          record.updatedAt = nowIso;
          await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
          emitRoomUpdated(roomCode, 'RETURNED_TO_LOBBY');
        }
        return { ok: true, data: buildViewerPayload(record, userId) };
      });
    },

    getSnapshotRecord(roomCodeRaw: string): RoomSnapshotRecord | null {
      const record = roomsByCode.get(normalizeRoomCode(roomCodeRaw));
      return record ? toSnapshotRecord(record) : null;
    },
  };
}
