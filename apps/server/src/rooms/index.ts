import { randomBytes, randomUUID } from 'node:crypto';
import {
  createInitialMatchSetup,
  HERO_BY_ID,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
  TIMER_PRESETS,
  type HeroId,
  type MasterGameState,
  type PlayerViewState,
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

export interface RoomViewerPayload {
  readonly roomState: RoomState;
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly playerView: PlayerViewState | null;
}

export type RoomOperationResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code: string;
      readonly messageVi: string;
    };

interface MutableRoomRecord {
  roomState: RoomState;
  masterGameState: MasterGameState | null;
  undoHistory: MasterGameState[];
  phaseDeadlineAt: string | null;
  pausedRemainingMs: number | null;
  updatedAt: string;
}

export interface RoomManager {
  restoreFromPersistence(): Promise<number>;
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
  updateTimerPreset(
    userId: string,
    roomCode: string,
    timerPreset: TimerPreset,
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  leaveRoom(
    userId: string,
    roomCode: string,
  ): Promise<RoomOperationResult<{ readonly deleted: boolean; readonly room: RoomViewerPayload | null }>>;
  startMatch(
    userId: string,
    roomCode: string,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
  selectHero(
    userId: string,
    roomCode: string,
    heroId: HeroId,
    options?: { readonly rng?: () => number },
  ): Promise<RoomOperationResult<RoomViewerPayload>>;
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
): string | null {
  if (!masterState || isTimerPaused || masterState.turnPhase === 'GAME_OVER') {
    return null;
  }
  const config = TIMER_PRESETS[timerPreset];
  let seconds = config.mainTurnSeconds;
  if (masterState.turnPhase === 'HERO_SELECT') {
    seconds = config.heroSelectSeconds;
  } else if (masterState.interruptStack.length > 0) {
    seconds = config.reactionSeconds;
  }
  return new Date(nowMs + seconds * 1000).toISOString();
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
        messageVi: `Không thể thực hiện thao tác: ${code}.`,
      };
  }
}

export function createRoomManager(deps: {
  readonly persistence: PersistenceStore;
  readonly authService: AuthService;
  readonly nowFn?: () => number;
}): RoomManager {
  const roomsByCode = new Map<string, MutableRoomRecord>();
  const roomCodeByUserId = new Map<string, string>();
  const roomLocks = new Map<string, Promise<unknown>>();
  let globalOpQueue: Promise<unknown> = Promise.resolve();
  const getNowMs = deps.nowFn ?? (() => Date.now());

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

  return {
    async restoreFromPersistence(): Promise<number> {
      roomsByCode.clear();
      roomCodeByUserId.clear();

      const snapshots = await deps.persistence.listRecoverableRoomSnapshots();
      for (const snap of snapshots) {
        const record: MutableRoomRecord = {
          roomState: snap.roomState,
          masterGameState: snap.masterGameState,
          undoHistory: [...snap.undoHistory],
          phaseDeadlineAt: snap.phaseDeadlineAt,
          pausedRemainingMs: snap.pausedRemainingMs,
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
          phaseDeadlineAt: null,
          pausedRemainingMs: null,
          updatedAt: nowIso,
        };

        roomsByCode.set(roomCode, record);
        roomCodeByUserId.set(profile.userId, roomCode);

        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        await deps.persistence.setUserActiveRoom(profile.userId, roomCode);

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

        return { ok: true, data: buildViewerPayload(record, profile.userId) };
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
            messageVi:
              'Ván đấu đang diễn ra, không thể tự rời ghế giữa chừng.',
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
          record.roomState.actingHostUserId !== userId &&
          record.roomState.ownerUserId !== userId
        ) {
          return {
            ok: false,
            statusCode: 403,
            code: 'ONLY_HOST_CAN_START',
            messageVi: 'Chỉ Chủ phòng mới được bấm bắt đầu ván đấu.',
          };
        }

        if (record.roomState.status !== 'LOBBY') {
          return {
            ok: false,
            statusCode: 409,
            code: 'MATCH_ALREADY_STARTED',
            messageVi: 'Ván đấu này đã được bắt đầu trước đó.',
          };
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

        const matchId = `match_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const setupState = createInitialMatchSetup({
          matchId,
          seats: record.roomState.seats.map((seat) => ({
            userId: seat.userId,
            displayName: seat.displayName,
            avatarUrl: seat.avatarUrl,
          })),
          ...(options?.rng ? { rng: options.rng } : {}),
        });

        const nowMs = getNowMs();
        record.roomState = {
          ...record.roomState,
          status: 'IN_GAME',
          isTimerPaused: false,
        };
        record.masterGameState = setupState;
        record.undoHistory = [];
        record.pausedRemainingMs = null;
        record.phaseDeadlineAt = computePhaseDeadlineIso(
          setupState,
          record.roomState.timerPreset,
          false,
          nowMs,
        );
        record.updatedAt = new Date(nowMs).toISOString();

        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
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

        let nextState: MasterGameState;
        try {
          if (draft.stage === 'LORD_SELECTING') {
            nextState = selectLordHero(
              record.masterGameState,
              seat.seatIndex,
              heroId,
              options?.rng,
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
            nextState = startMatchCombat(nextState, options?.rng);
          }
        } catch (err) {
          return {
            ok: false,
            ...mapSetupOrHeroErrorVi(err),
          };
        }

        const nowMs = getNowMs();
        record.masterGameState = nextState;
        record.phaseDeadlineAt = computePhaseDeadlineIso(
          nextState,
          record.roomState.timerPreset,
          record.roomState.isTimerPaused,
          nowMs,
        );
        record.updatedAt = new Date(nowMs).toISOString();

        await deps.persistence.saveRoomSnapshot(toSnapshotRecord(record));
        return { ok: true, data: buildViewerPayload(record, userId) };
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

        const nowMs = options?.nowMs ?? getNowMs();
        if (options?.pushUndo && record.masterGameState) {
          record.undoHistory = [
            ...record.undoHistory,
            record.masterGameState,
          ].slice(-MAX_UNDO_HISTORY);
        }

        record.masterGameState = nextMasterState;
        if (nextMasterState.turnPhase === 'GAME_OVER') {
          record.roomState = { ...record.roomState, status: 'FINISHED' };
          record.phaseDeadlineAt = null;
          record.pausedRemainingMs = null;
        } else {
          record.phaseDeadlineAt = computePhaseDeadlineIso(
            nextMasterState,
            record.roomState.timerPreset,
            record.roomState.isTimerPaused,
            nowMs,
          );
        }
        record.updatedAt = new Date(nowMs).toISOString();

        const snapshot = toSnapshotRecord(record);
        await deps.persistence.saveRoomSnapshot(snapshot);
        return { ok: true, data: snapshot };
      });
    },

    getSnapshotRecord(roomCodeRaw: string): RoomSnapshotRecord | null {
      const record = roomsByCode.get(normalizeRoomCode(roomCodeRaw));
      return record ? toSnapshotRecord(record) : null;
    },
  };
}
