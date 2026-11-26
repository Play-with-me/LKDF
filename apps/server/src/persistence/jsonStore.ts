import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HERO_BY_ID,
  IdentityRoleSchema,
  RegisteredHeroIdSchema,
  type IdentityRole,
  type MatchHistoryRecord,
  type RoleStatEntry,
  type UserPreferences,
  type UserProfile,
  type UserStats,
} from '@lkdf/shared';
import type {
  DetailedStatEntry,
  FilteredStatsResult,
  GoogleIdentityInput,
  PersistenceStore,
  PlayerFilteredStatRow,
  PublicPlayerInfo,
  RecordMatchResultOutcome,
  RoomSnapshotRecord,
  StatsFilterQuery,
  UpsertGoogleUserResult,
} from './index.js';

interface StoredUserRecord {
  userId: string;
  googleSub: string;
  email: string;
  displayName: string;
  hasCustomName: boolean;
  avatarUrl: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  activeRoomCode: string | null;
  activeSessionId: string | null;
  createdAt: string;
  lastLoginAt: string;
}

interface JsonDatabaseFileShape {
  version: 1;
  users: Record<string, StoredUserRecord>;
  userStats: Record<string, UserStats>;
  matches: MatchHistoryRecord[];
  roomSnapshots: Record<string, RoomSnapshotRecord>;
}

function createEmptyDb(): JsonDatabaseFileShape {
  return {
    version: 1,
    users: {},
    userStats: {},
    matches: [],
    roomSnapshots: {},
  };
}

function createEmptyByIdentity(): Record<IdentityRole, RoleStatEntry> {
  return {
    LORD: { played: 0, wins: 0 },
    LOYALIST: { played: 0, wins: 0 },
    REBEL: { played: 0, wins: 0 },
    SPY: { played: 0, wins: 0 },
  };
}

function createEmptyDetailedByIdentity(): Record<IdentityRole, DetailedStatEntry> {
  return {
    LORD: { played: 0, wins: 0, losses: 0, winRatePercent: 0 },
    LOYALIST: { played: 0, wins: 0, losses: 0, winRatePercent: 0 },
    REBEL: { played: 0, wins: 0, losses: 0, winRatePercent: 0 },
    SPY: { played: 0, wins: 0, losses: 0, winRatePercent: 0 },
  };
}

function calcWinRatePercent(played: number, wins: number): number {
  if (played <= 0) {
    return 0;
  }
  return Math.round((wins / played) * 1000) / 10;
}

function toDetailedStatEntry(entry: RoleStatEntry): DetailedStatEntry {
  const losses = Math.max(0, entry.played - entry.wins);
  return {
    played: entry.played,
    wins: entry.wins,
    losses,
    winRatePercent: calcWinRatePercent(entry.played, entry.wins),
  };
}

function toUserProfile(record: StoredUserRecord): UserProfile {
  return {
    userId: record.userId,
    googleSub: record.googleSub,
    email: record.email,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    preferences: {
      soundEnabled: record.soundEnabled,
      musicEnabled: record.musicEnabled,
      volume: record.volume,
    },
    activeRoomCode: record.activeRoomCode,
    createdAt: record.createdAt,
    lastLoginAt: record.lastLoginAt,
  };
}

function resolveTargetFilePath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === ':memory:') {
    return null;
  }
  if (trimmed.startsWith('file://')) {
    return fileURLToPath(trimmed);
  }
  return path.resolve(trimmed);
}

function toVietnamMonthKey(isoTimestamp: string): string {
  const ms = Date.parse(isoTimestamp);
  if (!Number.isFinite(ms)) {
    return '';
  }
  return new Date(ms + 7 * 3600_000).toISOString().slice(0, 7);
}

interface MutablePlayerAcc {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  played: number;
  wins: number;
  readonly byIdentity: Record<IdentityRole, { played: number; wins: number }>;
  readonly byHero: Record<string, { played: number; wins: number }>;
}

/**
 * Kho lưu trữ thuần TypeScript/Node.js (`node:fs/promises`) không phụ thuộc native addon `@libsql`.
 * Đảm bảo đóng gói `app.asar` chạy trên mọi máy Windows qua LAN / Radmin VPN / Tailscale 0 crash.
 */
export function createJsonPersistenceStore(filePath: string): PersistenceStore {
  const resolvedPath = resolveTargetFilePath(filePath);
  let db: JsonDatabaseFileShape = createEmptyDb();
  let initialized = false;
  let closed = false;
  let writeChain: Promise<void> = Promise.resolve();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingFlushResolvers: Array<() => void> = [];
  let dirty = false;

  async function writeAtomicSnapshot(): Promise<void> {
    if (!resolvedPath || !dirty) {
      dirty = false;
      return;
    }
    dirty = false;
    const serialized = JSON.stringify(db, null, 2);
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, serialized, 'utf8');
    try {
      await fs.rename(tmpPath, resolvedPath);
    } catch {
      await fs.writeFile(resolvedPath, serialized, 'utf8');
      await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    }
  }

  function enqueueFlush(): Promise<void> {
    writeChain = writeChain
      .then(() => writeAtomicSnapshot())
      .catch(() => undefined);
    return writeChain;
  }

  function schedulePersist(immediate = false): Promise<void> {
    if (!resolvedPath) {
      return Promise.resolve();
    }
    dirty = true;
    if (immediate || closed) {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const waiters = pendingFlushResolvers;
      pendingFlushResolvers = [];
      return enqueueFlush().then(() => {
        for (const resolve of waiters) {
          resolve();
        }
      });
    }

    return new Promise<void>((resolve) => {
      pendingFlushResolvers.push(resolve);
      if (debounceTimer !== null) {
        return;
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        const waiters = pendingFlushResolvers;
        pendingFlushResolvers = [];
        void enqueueFlush().then(() => {
          for (const done of waiters) {
            done();
          }
        });
      }, 15);
    });
  }

  async function ensureInit(): Promise<void> {
    if (initialized) {
      return;
    }
    initialized = true;
    closed = false;
    if (!resolvedPath) {
      return;
    }
    try {
      const raw = await fs.readFile(resolvedPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<JsonDatabaseFileShape>;
      db = {
        version: 1,
        users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
        userStats:
          parsed.userStats && typeof parsed.userStats === 'object'
            ? parsed.userStats
            : {},
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        roomSnapshots:
          parsed.roomSnapshots && typeof parsed.roomSnapshots === 'object'
            ? parsed.roomSnapshots
            : {},
      };
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code !== 'ENOENT') {
        db = createEmptyDb();
      }
    }
  }

  let mutationLock: Promise<unknown> = Promise.resolve();
  function serializeMutation<T>(fn: () => Promise<T>): Promise<T> {
    const next = mutationLock.then(fn, fn);
    mutationLock = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return {
    async init(): Promise<void> {
      await ensureInit();
    },

    async close(): Promise<void> {
      closed = true;
      await mutationLock;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const waiters = pendingFlushResolvers;
      pendingFlushResolvers = [];
      await enqueueFlush();
      for (const resolve of waiters) {
        resolve();
      }
    },

    async upsertGoogleUser(input: GoogleIdentityInput): Promise<UpsertGoogleUserResult> {
      return serializeMutation(async () => {
        await ensureInit();
        const now = new Date().toISOString();
        const existing = Object.values(db.users).find(
          (u) => u.googleSub === input.googleSub,
        );
        if (existing) {
          existing.email = input.email;
          existing.avatarUrl = input.avatarUrl;
          existing.lastLoginAt = now;
          if (!existing.hasCustomName) {
            existing.displayName = input.displayName;
          }
          await schedulePersist(true);
          return { profile: toUserProfile(existing), isNewUser: false };
        }

        const userId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const created: StoredUserRecord = {
          userId,
          googleSub: input.googleSub,
          email: input.email,
          displayName: input.displayName,
          hasCustomName: false,
          avatarUrl: input.avatarUrl,
          soundEnabled: true,
          musicEnabled: true,
          volume: 0.8,
          activeRoomCode: null,
          activeSessionId: null,
          createdAt: now,
          lastLoginAt: now,
        };
        db.users[userId] = created;
        db.userStats[userId] = {
          userId,
          totalMatches: 0,
          totalWins: 0,
          totalLosses: 0,
          byIdentity: createEmptyByIdentity(),
          byHero: {},
        };
        await schedulePersist(true);
        return { profile: toUserProfile(created), isNewUser: true };
      });
    },

    async getUserById(userId: string): Promise<UserProfile | null> {
      await ensureInit();
      const record = db.users[userId];
      return record ? toUserProfile(record) : null;
    },

    async getUserByGoogleSub(googleSub: string): Promise<UserProfile | null> {
      await ensureInit();
      const record = Object.values(db.users).find((u) => u.googleSub === googleSub);
      return record ? toUserProfile(record) : null;
    },

    async listPublicUsers(): Promise<readonly PublicPlayerInfo[]> {
      await ensureInit();
      return Object.values(db.users)
        .map((u) => ({
          userId: u.userId,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        }))
        .sort((a, b) => {
          const cmp = a.displayName.localeCompare(b.displayName);
          return cmp !== 0 ? cmp : a.userId.localeCompare(b.userId);
        });
    },

    async updateUserPreferences(
      userId: string,
      prefs: Partial<UserPreferences>,
    ): Promise<UserProfile | null> {
      return serializeMutation(async () => {
        await ensureInit();
        const record = db.users[userId];
        if (!record) {
          return null;
        }
        if (prefs.soundEnabled !== undefined) {
          record.soundEnabled = Boolean(prefs.soundEnabled);
        }
        if (prefs.musicEnabled !== undefined) {
          record.musicEnabled = Boolean(prefs.musicEnabled);
        }
        if (prefs.volume !== undefined) {
          record.volume = Math.max(0, Math.min(1, prefs.volume));
        }
        await schedulePersist();
        return toUserProfile(record);
      });
    },

    async updateUserDisplayName(
      userId: string,
      displayName: string,
    ): Promise<UserProfile | null> {
      return serializeMutation(async () => {
        await ensureInit();
        const record = db.users[userId];
        if (!record) {
          return null;
        }
        record.displayName = displayName.trim();
        record.hasCustomName = true;
        await schedulePersist(true);
        return toUserProfile(record);
      });
    },

    async setUserActiveRoom(userId: string, roomCode: string | null): Promise<void> {
      return serializeMutation(async () => {
        await ensureInit();
        const record = db.users[userId];
        if (record) {
          record.activeRoomCode = roomCode;
          await schedulePersist();
        }
      });
    },

    async setUserActiveSession(userId: string, sessionId: string | null): Promise<void> {
      return serializeMutation(async () => {
        await ensureInit();
        const record = db.users[userId];
        if (record) {
          record.activeSessionId = sessionId;
          await schedulePersist(true);
        }
      });
    },

    async getUserActiveSessionId(userId: string): Promise<string | null> {
      await ensureInit();
      return db.users[userId]?.activeSessionId ?? null;
    },

    async getUserStats(userId: string): Promise<UserStats | null> {
      await ensureInit();
      const stats = db.userStats[userId];
      if (!stats) {
        return null;
      }
      return {
        userId: stats.userId,
        totalMatches: stats.totalMatches,
        totalWins: stats.totalWins,
        totalLosses: stats.totalLosses,
        byIdentity: { ...stats.byIdentity },
        byHero: { ...stats.byHero },
      };
    },

    async recordMatchResult(record: MatchHistoryRecord): Promise<RecordMatchResultOutcome> {
      return serializeMutation(async () => {
        await ensureInit();
        if (db.matches.some((m) => m.matchId === record.matchId)) {
          return { recorded: false, reason: 'ALREADY_EXISTS' };
        }

        const seenUsers = new Set<string>();
        const seenSeats = new Set<number>();
        for (const participant of record.participants) {
          if (seenUsers.has(participant.userId)) {
            throw new Error(
              `Không thể ghi nhận kết quả ván đấu: người chơi ${participant.userId} xuất hiện ở nhiều hơn 1 ghế.`,
            );
          }
          if (seenSeats.has(participant.seatIndex)) {
            throw new Error(
              `Không thể ghi nhận kết quả ván đấu: trùng vị trí ghế ${participant.seatIndex}.`,
            );
          }
          if (!HERO_BY_ID[participant.heroId]) {
            throw new Error(
              `Mã tướng không hợp lệ trong kết quả ván đấu: ${participant.heroId}`,
            );
          }
          seenUsers.add(participant.userId);
          seenSeats.add(participant.seatIndex);
        }

        db.matches.push({
          ...record,
          participants: record.participants.map((p) => ({ ...p })),
        });

        for (const p of record.participants) {
          if (!db.users[p.userId]) {
            continue;
          }
          const current = db.userStats[p.userId] ?? {
            userId: p.userId,
            totalMatches: 0,
            totalWins: 0,
            totalLosses: 0,
            byIdentity: createEmptyByIdentity(),
            byHero: {},
          };
          const nextByIdentity = { ...current.byIdentity };
          const prevIdentity = nextByIdentity[p.identity] ?? { played: 0, wins: 0 };
          nextByIdentity[p.identity] = {
            played: prevIdentity.played + 1,
            wins: prevIdentity.wins + (p.isWinner ? 1 : 0),
          };
          const nextByHero: Record<string, RoleStatEntry> = { ...current.byHero };
          const prevHero = nextByHero[p.heroId] ?? { played: 0, wins: 0 };
          nextByHero[p.heroId] = {
            played: prevHero.played + 1,
            wins: prevHero.wins + (p.isWinner ? 1 : 0),
          };
          db.userStats[p.userId] = {
            userId: p.userId,
            totalMatches: current.totalMatches + 1,
            totalWins: current.totalWins + (p.isWinner ? 1 : 0),
            totalLosses: current.totalLosses + (p.isWinner ? 0 : 1),
            byIdentity: nextByIdentity,
            byHero: nextByHero,
          };
        }

        await schedulePersist(true);
        return { recorded: true };
      });
    },

    async queryStats(filter: StatsFilterQuery): Promise<FilteredStatsResult> {
      await mutationLock;
      await ensureInit();

      const userIdFilter = filter.userId ?? null;
      const identityFilter = filter.identity ?? null;
      const heroIdFilter = filter.heroId ?? null;

      let totalAppearances = 0;
      let totalWins = 0;
      const distinctMatchIds = new Set<string>();
      const summaryByIdentityRaw = createEmptyByIdentity();
      const summaryByHeroRaw: Record<string, { played: number; wins: number }> = {};
      const playerMap = new Map<string, MutablePlayerAcc>();

      const currentInVietnam = new Date(Date.now() + 7 * 3600_000);
      const year = currentInVietnam.getUTCFullYear();
      const month = currentInVietnam.getUTCMonth();
      const monthStartIso = (offset: number) =>
        new Date(Date.UTC(year, month + offset, 1) - 7 * 3600_000).toISOString();
      const periodStart = monthStartIso(-2);
      const periodEnd = monthStartIso(1);
      const monthlyCounts = new Map<string, { wins: number; losses: number }>();

      const matchedRecords: MatchHistoryRecord[] = [];

      for (const match of db.matches) {
        let matchMatched = false;
        for (const p of match.participants) {
          if (userIdFilter !== null && p.userId !== userIdFilter) continue;
          if (identityFilter !== null && p.identity !== identityFilter) continue;
          if (heroIdFilter !== null && p.heroId !== heroIdFilter) continue;

          const parsedIdentity = IdentityRoleSchema.safeParse(p.identity);
          const parsedHero = RegisteredHeroIdSchema.safeParse(p.heroId);
          if (!parsedIdentity.success || !parsedHero.success) {
            continue;
          }

          matchMatched = true;
          distinctMatchIds.add(match.matchId);
          totalAppearances += 1;
          if (p.isWinner) {
            totalWins += 1;
          }

          const identity = parsedIdentity.data;
          const heroId = parsedHero.data;
          summaryByIdentityRaw[identity] = {
            played: summaryByIdentityRaw[identity].played + 1,
            wins: summaryByIdentityRaw[identity].wins + (p.isWinner ? 1 : 0),
          };
          const prevSummaryHero = summaryByHeroRaw[heroId] ?? { played: 0, wins: 0 };
          summaryByHeroRaw[heroId] = {
            played: prevSummaryHero.played + 1,
            wins: prevSummaryHero.wins + (p.isWinner ? 1 : 0),
          };

          const userRecord = db.users[p.userId];
          const displayName = userRecord?.displayName ?? p.displayName;
          const avatarUrl = userRecord?.avatarUrl ?? '';

          let acc = playerMap.get(p.userId);
          if (!acc) {
            acc = {
              userId: p.userId,
              displayName,
              avatarUrl,
              played: 0,
              wins: 0,
              byIdentity: {
                LORD: { played: 0, wins: 0 },
                LOYALIST: { played: 0, wins: 0 },
                REBEL: { played: 0, wins: 0 },
                SPY: { played: 0, wins: 0 },
              },
              byHero: {},
            };
            playerMap.set(p.userId, acc);
          }
          acc.played += 1;
          if (p.isWinner) acc.wins += 1;
          acc.byIdentity[identity].played += 1;
          if (p.isWinner) acc.byIdentity[identity].wins += 1;
          const prevPlayerHero = acc.byHero[heroId] ?? { played: 0, wins: 0 };
          acc.byHero[heroId] = {
            played: prevPlayerHero.played + 1,
            wins: prevPlayerHero.wins + (p.isWinner ? 1 : 0),
          };

          if (
            filter.includeMonthly &&
            match.finishedAt >= periodStart &&
            match.finishedAt < periodEnd
          ) {
            const mKey = toVietnamMonthKey(match.finishedAt);
            const cur = monthlyCounts.get(mKey) ?? { wins: 0, losses: 0 };
            if (p.isWinner) cur.wins += 1;
            else cur.losses += 1;
            monthlyCounts.set(mKey, cur);
          }
        }

        if (matchMatched && filter.includeMatches) {
          matchedRecords.push(match);
        }
      }

      const summaryByIdentity = createEmptyDetailedByIdentity();
      for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const) {
        summaryByIdentity[role] = toDetailedStatEntry(summaryByIdentityRaw[role]);
      }
      const summaryByHero: Record<string, DetailedStatEntry> = {};
      for (const [heroKey, entry] of Object.entries(summaryByHeroRaw)) {
        summaryByHero[heroKey] = toDetailedStatEntry(entry);
      }

      const players: PlayerFilteredStatRow[] = Array.from(playerMap.values())
        .map((acc) => {
          const playerByIdentity = createEmptyDetailedByIdentity();
          for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const) {
            playerByIdentity[role] = toDetailedStatEntry(acc.byIdentity[role]);
          }
          const playerByHero: Record<string, DetailedStatEntry> = {};
          for (const [heroKey, entry] of Object.entries(acc.byHero)) {
            playerByHero[heroKey] = toDetailedStatEntry(entry);
          }
          return {
            userId: acc.userId,
            displayName: acc.displayName,
            avatarUrl: acc.avatarUrl,
            played: acc.played,
            wins: acc.wins,
            losses: Math.max(0, acc.played - acc.wins),
            winRatePercent: calcWinRatePercent(acc.played, acc.wins),
            byIdentity: playerByIdentity,
            byHero: playerByHero,
          };
        })
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.winRatePercent !== a.winRatePercent) {
            return b.winRatePercent - a.winRatePercent;
          }
          if (b.played !== a.played) return b.played - a.played;
          return a.displayName.localeCompare(b.displayName, 'vi');
        });

      const monthlyResults = filter.includeMonthly
        ? [-2, -1, 0].map((offset) => {
            const monthKey = new Date(Date.UTC(year, month + offset, 1))
              .toISOString()
              .slice(0, 7);
            const entry = monthlyCounts.get(monthKey);
            return {
              month: monthKey,
              wins: entry?.wins ?? 0,
              losses: entry?.losses ?? 0,
            };
          })
        : undefined;

      let recentMatches: readonly MatchHistoryRecord[] | undefined;
      if (filter.includeMatches) {
        const limit = Math.max(1, Math.min(100, filter.matchLimit ?? 20));
        recentMatches = [...matchedRecords]
          .sort((a, b) => {
            if (b.finishedAt !== a.finishedAt) {
              return b.finishedAt.localeCompare(a.finishedAt);
            }
            return b.matchId.localeCompare(a.matchId);
          })
          .slice(0, limit)
          .map((m) => ({
            ...m,
            participants: [...m.participants].sort(
              (pa, pb) => pa.seatIndex - pb.seatIndex,
            ),
          }));
      }

      return {
        filter: {
          userId: userIdFilter,
          identity: identityFilter,
          heroId: heroIdFilter,
        },
        summary: {
          totalAppearances,
          totalDistinctMatches: distinctMatchIds.size,
          totalWins,
          totalLosses: Math.max(0, totalAppearances - totalWins),
          winRatePercent: calcWinRatePercent(totalAppearances, totalWins),
          byIdentity: summaryByIdentity,
          byHero: summaryByHero,
        },
        players,
        ...(recentMatches ? { recentMatches } : {}),
        ...(monthlyResults ? { monthlyResults } : {}),
      };
    },

    async saveRoomSnapshot(snapshot: RoomSnapshotRecord): Promise<void> {
      return serializeMutation(async () => {
        await ensureInit();
        const code = snapshot.roomState.roomCode.trim().toUpperCase();
        db.roomSnapshots[code] = {
          roomState: structuredClone(snapshot.roomState),
          masterGameState: snapshot.masterGameState
            ? structuredClone(snapshot.masterGameState)
            : null,
          undoHistory: snapshot.undoHistory
            .slice(-5)
            .map((state) => structuredClone(state)),
          phaseDeadlineAt: snapshot.phaseDeadlineAt,
          pausedRemainingMs: snapshot.pausedRemainingMs,
          updatedAt: snapshot.updatedAt,
        };
        await schedulePersist();
      });
    },

    async getRoomSnapshot(roomCode: string): Promise<RoomSnapshotRecord | null> {
      await ensureInit();
      const code = roomCode.trim().toUpperCase();
      const snap = db.roomSnapshots[code];
      return snap ? structuredClone(snap) : null;
    },

    async listRecoverableRoomSnapshots(): Promise<readonly RoomSnapshotRecord[]> {
      await ensureInit();
      return Object.values(db.roomSnapshots)
        .filter((snap) => snap.roomState.status !== 'FINISHED')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((snap) => structuredClone(snap));
    },

    async deleteRoomSnapshot(roomCode: string): Promise<void> {
      return serializeMutation(async () => {
        await ensureInit();
        const code = roomCode.trim().toUpperCase();
        delete db.roomSnapshots[code];
        for (const user of Object.values(db.users)) {
          if (user.activeRoomCode === code) {
            user.activeRoomCode = null;
          }
        }
        await schedulePersist(true);
      });
    },
  };
}
