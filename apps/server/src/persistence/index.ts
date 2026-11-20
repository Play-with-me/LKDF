import { createHash, randomUUID } from 'node:crypto';
import { createClient, type Client, type InStatement, type Row } from '@libsql/client';
import {
  HERO_BY_ID,
  HeroIdSchema,
  IdentityRoleSchema,
  type HeroId,
  type IdentityRole,
  type MasterGameState,
  type MatchHistoryRecord,
  type MatchParticipantSummary,
  type PlayerCount,
  type RoleStatEntry,
  type RoomState,
  type UserPreferences,
  type UserProfile,
  type UserStats,
  type WinningFaction,
} from '@lkdf/shared';
import { initializeSchema } from './schema.js';

export const PERSISTENCE_MODULE_READY = true;

export interface GoogleIdentityInput {
  readonly googleSub: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string;
}

export interface UpsertGoogleUserResult {
  readonly profile: UserProfile;
  readonly isNewUser: boolean;
}

export interface PublicPlayerInfo {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
}

export interface DetailedStatEntry extends RoleStatEntry {
  readonly losses: number;
  readonly winRatePercent: number;
}

export interface PlayerFilteredStatRow {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly played: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRatePercent: number;
  readonly byIdentity: Record<IdentityRole, DetailedStatEntry>;
  readonly byHero: Record<string, DetailedStatEntry>;
}

export interface StatsFilterQuery {
  readonly userId?: string;
  readonly identity?: IdentityRole;
  readonly heroId?: HeroId;
  readonly includeMatches?: boolean;
  readonly matchLimit?: number;
}

export interface FilteredStatsSummary {
  readonly totalAppearances: number;
  readonly totalDistinctMatches: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly winRatePercent: number;
  readonly byIdentity: Record<IdentityRole, DetailedStatEntry>;
  readonly byHero: Record<string, DetailedStatEntry>;
}

export interface FilteredStatsResult {
  readonly filter: {
    readonly userId: string | null;
    readonly identity: IdentityRole | null;
    readonly heroId: HeroId | null;
  };
  readonly summary: FilteredStatsSummary;
  readonly players: readonly PlayerFilteredStatRow[];
  readonly recentMatches?: readonly MatchHistoryRecord[];
}

export interface RecordMatchResultOutcome {
  readonly recorded: boolean;
  readonly reason?: 'ALREADY_EXISTS';
}

export interface RoomSnapshotRecord {
  readonly roomState: RoomState;
  readonly masterGameState: MasterGameState | null;
  readonly undoHistory: readonly MasterGameState[];
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly updatedAt: string;
}

export interface PersistenceStore {
  init(): Promise<void>;
  close(): Promise<void>;
  upsertGoogleUser(input: GoogleIdentityInput): Promise<UpsertGoogleUserResult>;
  getUserById(userId: string): Promise<UserProfile | null>;
  getUserByGoogleSub(googleSub: string): Promise<UserProfile | null>;
  listPublicUsers(): Promise<readonly PublicPlayerInfo[]>;
  updateUserPreferences(
    userId: string,
    prefs: Partial<UserPreferences>,
  ): Promise<UserProfile | null>;
  updateUserDisplayName(
    userId: string,
    displayName: string,
  ): Promise<UserProfile | null>;
  setUserActiveRoom(userId: string, roomCode: string | null): Promise<void>;
  setUserActiveSession(userId: string, sessionId: string | null): Promise<void>;
  getUserActiveSessionId(userId: string): Promise<string | null>;
  getUserStats(userId: string): Promise<UserStats | null>;
  recordMatchResult(record: MatchHistoryRecord): Promise<RecordMatchResultOutcome>;
  queryStats(filter: StatsFilterQuery): Promise<FilteredStatsResult>;
  saveRoomSnapshot(snapshot: RoomSnapshotRecord): Promise<void>;
  getRoomSnapshot(roomCode: string): Promise<RoomSnapshotRecord | null>;
  listRecoverableRoomSnapshots(): Promise<readonly RoomSnapshotRecord[]>;
  deleteRoomSnapshot(roomCode: string): Promise<void>;
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

function rowToString(row: Row, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

function rowToNullableString(row: Row, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : String(value);
}

function rowToNumber(row: Row, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function mapUserRow(row: Row): UserProfile {
  return {
    userId: rowToString(row, 'user_id'),
    googleSub: rowToString(row, 'google_sub'),
    email: rowToString(row, 'email'),
    displayName: rowToString(row, 'display_name'),
    avatarUrl: rowToString(row, 'avatar_url'),
    preferences: {
      soundEnabled: rowToNumber(row, 'sound_enabled', 1) === 1,
      volume: rowToNumber(row, 'volume', 0.8),
    },
    activeRoomCode: rowToNullableString(row, 'active_room_code'),
    createdAt: rowToString(row, 'created_at'),
    lastLoginAt: rowToString(row, 'last_login_at'),
  };
}

function parseIdentityStatsJson(raw: string): Record<IdentityRole, RoleStatEntry> {
  const base = createEmptyByIdentity();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const) {
      const item = parsed[role];
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        base[role] = {
          played: typeof record.played === 'number' ? record.played : 0,
          wins: typeof record.wins === 'number' ? record.wins : 0,
        };
      }
    }
  } catch {
    return base;
  }
  return base;
}

function parseHeroStatsJson(raw: string): Record<string, RoleStatEntry> {
  const result: Record<string, RoleStatEntry> = {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [heroId, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        result[heroId] = {
          played: typeof record.played === 'number' ? record.played : 0,
          wins: typeof record.wins === 'number' ? record.wins : 0,
        };
      }
    }
  } catch {
    return result;
  }
  return result;
}

interface MutablePlayerAccumulator {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  played: number;
  wins: number;
  readonly byIdentity: Record<IdentityRole, { played: number; wins: number }>;
  readonly byHero: Record<string, { played: number; wins: number }>;
}

/** Kho lưu trữ dữ liệu Cloud 0đ dựa trên @libsql/client (Turso libsql:// hoặc SQLite file/:memory:). */
export class LibsqlPersistenceStore implements PersistenceStore {
  private readonly client: Client;
  private initialized = false;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(options: { readonly url: string; readonly authToken?: string }) {
    this.client = createClient(
      options.authToken
        ? { url: options.url, authToken: options.authToken }
        : { url: options.url },
    );
  }

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await initializeSchema(this.client);
    this.initialized = true;
  }

  async close(): Promise<void> {
    this.client.close();
  }

  async upsertGoogleUser(input: GoogleIdentityInput): Promise<UpsertGoogleUserResult> {
    await this.init();
    const now = new Date().toISOString();
    const existingRes = await this.client.execute({
      sql: 'SELECT user_id, has_custom_name FROM users WHERE google_sub = ? LIMIT 1',
      args: [input.googleSub],
    });
    const existingRow = existingRes.rows[0];

    if (existingRow) {
      const existingUserId = rowToString(existingRow, 'user_id');
      const hasCustomName = rowToNumber(existingRow, 'has_custom_name', 0) === 1;
      if (hasCustomName) {
        await this.client.execute({
          sql: `UPDATE users
                SET email = ?, avatar_url = ?, last_login_at = ?
                WHERE user_id = ?`,
          args: [input.email, input.avatarUrl, now, existingUserId],
        });
      } else {
        await this.client.execute({
          sql: `UPDATE users
                SET email = ?, display_name = ?, avatar_url = ?, last_login_at = ?
                WHERE user_id = ?`,
          args: [
            input.email,
            input.displayName,
            input.avatarUrl,
            now,
            existingUserId,
          ],
        });
      }

      const updated = await this.getUserById(existingUserId);
      if (!updated) {
        throw new Error('Không thể đọc lại hồ sơ người dùng sau khi cập nhật.');
      }
      return { profile: updated, isNewUser: false };
    }

    const userId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const emptyByIdentityJson = JSON.stringify(createEmptyByIdentity());

    await this.client.batch(
      [
        {
          sql: `INSERT INTO users (
                  user_id, google_sub, email, display_name, has_custom_name, avatar_url,
                  sound_enabled, volume, active_room_code, created_at, last_login_at
                ) VALUES (?, ?, ?, ?, 0, ?, 1, 0.8, NULL, ?, ?)`,
          args: [
            userId,
            input.googleSub,
            input.email,
            input.displayName,
            input.avatarUrl,
            now,
            now,
          ],
        },
        {
          sql: `INSERT INTO user_stats (
                  user_id, total_matches, total_wins, total_losses,
                  by_identity_json, by_hero_json, updated_at
                ) VALUES (?, 0, 0, 0, ?, '{}', ?)`,
          args: [userId, emptyByIdentityJson, now],
        },
      ],
      'write',
    );

    const created = await this.getUserById(userId);
    if (!created) {
      throw new Error('Không thể đọc lại hồ sơ người dùng vừa khởi tạo.');
    }
    return { profile: created, isNewUser: true };
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    await this.init();
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE user_id = ? LIMIT 1',
      args: [userId],
    });
    const row = result.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async getUserByGoogleSub(googleSub: string): Promise<UserProfile | null> {
    await this.init();
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE google_sub = ? LIMIT 1',
      args: [googleSub],
    });
    const row = result.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async listPublicUsers(): Promise<readonly PublicPlayerInfo[]> {
    await this.init();
    const result = await this.client.execute(
      'SELECT user_id, display_name, avatar_url FROM users ORDER BY display_name ASC, user_id ASC',
    );
    return result.rows.map((row) => ({
      userId: rowToString(row, 'user_id'),
      displayName: rowToString(row, 'display_name'),
      avatarUrl: rowToString(row, 'avatar_url'),
    }));
  }

  async updateUserPreferences(
    userId: string,
    prefs: Partial<UserPreferences>,
  ): Promise<UserProfile | null> {
    await this.init();
    const existing = await this.getUserById(userId);
    if (!existing) {
      return null;
    }

    const nextSoundEnabled =
      prefs.soundEnabled ?? existing.preferences.soundEnabled;
    const rawVolume = prefs.volume ?? existing.preferences.volume;
    const nextVolume = Math.max(0, Math.min(1, rawVolume));

    await this.client.execute({
      sql: 'UPDATE users SET sound_enabled = ?, volume = ? WHERE user_id = ?',
      args: [nextSoundEnabled ? 1 : 0, nextVolume, userId],
    });

    return this.getUserById(userId);
  }

  async updateUserDisplayName(
    userId: string,
    displayName: string,
  ): Promise<UserProfile | null> {
    await this.init();
    const existing = await this.getUserById(userId);
    if (!existing) {
      return null;
    }

    const cleanName = displayName.trim();
    await this.client.execute({
      sql: 'UPDATE users SET display_name = ?, has_custom_name = 1 WHERE user_id = ?',
      args: [cleanName, userId],
    });

    return this.getUserById(userId);
  }

  async setUserActiveRoom(userId: string, roomCode: string | null): Promise<void> {
    await this.init();
    await this.client.execute({
      sql: 'UPDATE users SET active_room_code = ? WHERE user_id = ?',
      args: [roomCode, userId],
    });
  }

  async setUserActiveSession(userId: string, sessionId: string | null): Promise<void> {
    await this.init();
    await this.client.execute({
      sql: 'UPDATE users SET active_session_id = ? WHERE user_id = ?',
      args: [sessionId, userId],
    });
  }

  async getUserActiveSessionId(userId: string): Promise<string | null> {
    await this.init();
    const result = await this.client.execute({
      sql: 'SELECT active_session_id FROM users WHERE user_id = ? LIMIT 1',
      args: [userId],
    });
    const row = result.rows[0];
    return row ? rowToNullableString(row, 'active_session_id') : null;
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    await this.init();
    const result = await this.client.execute({
      sql: 'SELECT * FROM user_stats WHERE user_id = ? LIMIT 1',
      args: [userId],
    });
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      userId: rowToString(row, 'user_id'),
      totalMatches: rowToNumber(row, 'total_matches'),
      totalWins: rowToNumber(row, 'total_wins'),
      totalLosses: rowToNumber(row, 'total_losses'),
      byIdentity: parseIdentityStatsJson(rowToString(row, 'by_identity_json', '{}')),
      byHero: parseHeroStatsJson(rowToString(row, 'by_hero_json', '{}')),
    };
  }

  async recordMatchResult(record: MatchHistoryRecord): Promise<RecordMatchResultOutcome> {
    return this.enqueueWrite(async () => this.recordMatchResultInternal(record));
  }

  private async recordMatchResultInternal(
    record: MatchHistoryRecord,
  ): Promise<RecordMatchResultOutcome> {
    await this.init();

    const existingMatch = await this.client.execute({
      sql: 'SELECT match_id FROM matches WHERE match_id = ? LIMIT 1',
      args: [record.matchId],
    });
    if (existingMatch.rows.length > 0) {
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
        throw new Error(`Mã tướng không hợp lệ trong kết quả ván đấu: ${participant.heroId}`);
      }
      seenUsers.add(participant.userId);
      seenSeats.add(participant.seatIndex);
    }

    const now = new Date().toISOString();
    const statements: InStatement[] = [
      {
        sql: `INSERT INTO matches (
                match_id, room_code, player_count, winning_faction, duration_seconds, finished_at
              ) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          record.matchId,
          record.roomCode,
          record.playerCount,
          record.winningFaction,
          record.durationSeconds,
          record.finishedAt,
        ],
      },
    ];

    for (const p of record.participants) {
      statements.push({
        sql: `INSERT INTO match_participants (
                match_id, seat_index, user_id, display_name, identity, hero_id,
                is_winner, survived, finished_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          record.matchId,
          p.seatIndex,
          p.userId,
          p.displayName,
          p.identity,
          p.heroId,
          p.isWinner ? 1 : 0,
          p.survived ? 1 : 0,
          record.finishedAt,
        ],
      });

      const currentStats = await this.getUserStats(p.userId);
      const userExists = await this.getUserById(p.userId);
      if (!userExists) {
        continue;
      }

      const prevMatches = currentStats?.totalMatches ?? 0;
      const prevWins = currentStats?.totalWins ?? 0;
      const prevLosses = currentStats?.totalLosses ?? 0;
      const nextByIdentity = currentStats
        ? { ...currentStats.byIdentity }
        : createEmptyByIdentity();
      const prevIdentityEntry = nextByIdentity[p.identity];
      nextByIdentity[p.identity] = {
        played: prevIdentityEntry.played + 1,
        wins: prevIdentityEntry.wins + (p.isWinner ? 1 : 0),
      };

      const nextByHero: Record<string, RoleStatEntry> = currentStats
        ? { ...currentStats.byHero }
        : {};
      const prevHeroEntry = nextByHero[p.heroId] ?? { played: 0, wins: 0 };
      nextByHero[p.heroId] = {
        played: prevHeroEntry.played + 1,
        wins: prevHeroEntry.wins + (p.isWinner ? 1 : 0),
      };

      statements.push({
        sql: `INSERT INTO user_stats (
                user_id, total_matches, total_wins, total_losses,
                by_identity_json, by_hero_json, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                total_matches = excluded.total_matches,
                total_wins = excluded.total_wins,
                total_losses = excluded.total_losses,
                by_identity_json = excluded.by_identity_json,
                by_hero_json = excluded.by_hero_json,
                updated_at = excluded.updated_at`,
        args: [
          p.userId,
          prevMatches + 1,
          prevWins + (p.isWinner ? 1 : 0),
          prevLosses + (p.isWinner ? 0 : 1),
          JSON.stringify(nextByIdentity),
          JSON.stringify(nextByHero),
          now,
        ],
      });
    }

    await this.client.batch(statements, 'write');
    return { recorded: true };
  }

  async queryStats(filter: StatsFilterQuery): Promise<FilteredStatsResult> {
    await this.init();
    const userIdFilter = filter.userId ?? null;
    const identityFilter = filter.identity ?? null;
    const heroIdFilter = filter.heroId ?? null;
    const filterArgs = [
      userIdFilter,
      userIdFilter,
      identityFilter,
      identityFilter,
      heroIdFilter,
      heroIdFilter,
    ];

    const groupedResult = await this.client.execute({
      sql: `SELECT
              mp.user_id,
              COALESCE(u.display_name, mp.display_name) AS display_name,
              COALESCE(u.avatar_url, '') AS avatar_url,
              mp.identity,
              mp.hero_id,
              COUNT(*) AS played,
              SUM(mp.is_winner) AS wins
            FROM match_participants mp
            LEFT JOIN users u ON u.user_id = mp.user_id
            WHERE (? IS NULL OR mp.user_id = ?)
              AND (? IS NULL OR mp.identity = ?)
              AND (? IS NULL OR mp.hero_id = ?)
            GROUP BY mp.user_id, mp.identity, mp.hero_id`,
      args: filterArgs,
    });

    const distinctMatchResult = await this.client.execute({
      sql: `SELECT COUNT(DISTINCT mp.match_id) AS distinct_matches
            FROM match_participants mp
            WHERE (? IS NULL OR mp.user_id = ?)
              AND (? IS NULL OR mp.identity = ?)
              AND (? IS NULL OR mp.hero_id = ?)`,
      args: filterArgs,
    });

    const firstDistinctRow = distinctMatchResult.rows[0];
    const distinctMatches = firstDistinctRow
      ? rowToNumber(firstDistinctRow, 'distinct_matches', 0)
      : 0;

    let totalAppearances = 0;
    let totalWins = 0;
    const summaryByIdentityRaw = createEmptyByIdentity();
    const summaryByHeroRaw: Record<string, { played: number; wins: number }> = {};
    const playerMap = new Map<string, MutablePlayerAccumulator>();

    for (const row of groupedResult.rows) {
      const uid = rowToString(row, 'user_id');
      const displayName = rowToString(row, 'display_name');
      const avatarUrl = rowToString(row, 'avatar_url');
      const identityRaw = rowToString(row, 'identity');
      const heroRaw = rowToString(row, 'hero_id');
      const played = rowToNumber(row, 'played');
      const wins = rowToNumber(row, 'wins');

      const parsedIdentity = IdentityRoleSchema.safeParse(identityRaw);
      const parsedHero = HeroIdSchema.safeParse(heroRaw);
      if (!parsedIdentity.success || !parsedHero.success) {
        continue;
      }

      const identity = parsedIdentity.data;
      const heroId = parsedHero.data;

      totalAppearances += played;
      totalWins += wins;

      summaryByIdentityRaw[identity] = {
        played: summaryByIdentityRaw[identity].played + played,
        wins: summaryByIdentityRaw[identity].wins + wins,
      };

      const prevSummaryHero = summaryByHeroRaw[heroId] ?? { played: 0, wins: 0 };
      summaryByHeroRaw[heroId] = {
        played: prevSummaryHero.played + played,
        wins: prevSummaryHero.wins + wins,
      };

      let playerAcc = playerMap.get(uid);
      if (!playerAcc) {
        playerAcc = {
          userId: uid,
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
        playerMap.set(uid, playerAcc);
      }

      playerAcc.played += played;
      playerAcc.wins += wins;
      playerAcc.byIdentity[identity].played += played;
      playerAcc.byIdentity[identity].wins += wins;
      const prevPlayerHero = playerAcc.byHero[heroId] ?? { played: 0, wins: 0 };
      playerAcc.byHero[heroId] = {
        played: prevPlayerHero.played + played,
        wins: prevPlayerHero.wins + wins,
      };
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

    let recentMatches: MatchHistoryRecord[] | undefined;
    if (filter.includeMatches) {
      const limit = Math.max(1, Math.min(100, filter.matchLimit ?? 20));
      const matchIdResult = await this.client.execute({
        sql: `SELECT DISTINCT m.match_id, m.room_code, m.player_count, m.winning_faction, m.duration_seconds, m.finished_at
              FROM matches m
              INNER JOIN match_participants mp ON mp.match_id = m.match_id
              WHERE (? IS NULL OR mp.user_id = ?)
                AND (? IS NULL OR mp.identity = ?)
                AND (? IS NULL OR mp.hero_id = ?)
              ORDER BY m.finished_at DESC
              LIMIT ?`,
        args: [...filterArgs, limit],
      });

      recentMatches = await this.hydrateMatchRecords(matchIdResult.rows);
    }

    return {
      filter: {
        userId: userIdFilter,
        identity: identityFilter,
        heroId: heroIdFilter,
      },
      summary: {
        totalAppearances,
        totalDistinctMatches: distinctMatches,
        totalWins,
        totalLosses: Math.max(0, totalAppearances - totalWins),
        winRatePercent: calcWinRatePercent(totalAppearances, totalWins),
        byIdentity: summaryByIdentity,
        byHero: summaryByHero,
      },
      players,
      ...(recentMatches ? { recentMatches } : {}),
    };
  }

  private async hydrateMatchRecords(matchRows: readonly Row[]): Promise<MatchHistoryRecord[]> {
    if (matchRows.length === 0) {
      return [];
    }

    const matchIds = matchRows.map((r) => rowToString(r, 'match_id'));
    const placeholders = matchIds.map(() => '?').join(', ');
    const participantsResult = await this.client.execute({
      sql: `SELECT match_id, user_id, display_name, seat_index, identity, hero_id, is_winner, survived
            FROM match_participants
            WHERE match_id IN (${placeholders})
            ORDER BY match_id ASC, seat_index ASC`,
      args: matchIds,
    });

    const participantsByMatch = new Map<string, MatchParticipantSummary[]>();
    for (const pRow of participantsResult.rows) {
      const mId = rowToString(pRow, 'match_id');
      const identity = IdentityRoleSchema.parse(rowToString(pRow, 'identity'));
      const heroId = HeroIdSchema.parse(rowToString(pRow, 'hero_id'));
      const list = participantsByMatch.get(mId) ?? [];
      list.push({
        userId: rowToString(pRow, 'user_id'),
        displayName: rowToString(pRow, 'display_name'),
        seatIndex: rowToNumber(pRow, 'seat_index'),
        identity,
        heroId,
        isWinner: rowToNumber(pRow, 'is_winner') === 1,
        survived: rowToNumber(pRow, 'survived') === 1,
      });
      participantsByMatch.set(mId, list);
    }

    return matchRows.map((mRow) => {
      const mId = rowToString(mRow, 'match_id');
      return {
        matchId: mId,
        roomCode: rowToString(mRow, 'room_code'),
        playerCount: rowToNumber(mRow, 'player_count') as PlayerCount,
        winningFaction: rowToString(mRow, 'winning_faction') as WinningFaction,
        durationSeconds: rowToNumber(mRow, 'duration_seconds'),
        participants: participantsByMatch.get(mId) ?? [],
        finishedAt: rowToString(mRow, 'finished_at'),
      };
    });
  }

  private readonly savedUndoIdsByRoom = new Map<string, Set<string>>();

  async saveRoomSnapshot(snapshot: RoomSnapshotRecord): Promise<void> {
    return this.enqueueWrite(async () => {
      await this.init();
      const roomCode = snapshot.roomState.roomCode;
      const savedIds = this.savedUndoIdsByRoom.get(roomCode);
      const undoIds: string[] = [];
      const statesToInsert = new Map<string, string>();
      for (const state of snapshot.undoHistory.slice(-5)) {
        const json = JSON.stringify(state);
        const id = createHash('sha256').update(json).digest('hex');
        undoIds.push(id);
        if (!savedIds?.has(id)) statesToInsert.set(id, json);
      }

      const statements: InStatement[] = Array.from(statesToInsert, ([id, json]) => ({
        sql: 'INSERT OR IGNORE INTO room_undo_states (room_code, state_id, state_json) VALUES (?, ?, ?)',
        args: [roomCode, id, json],
      }));
      statements.push({
        sql: `INSERT INTO room_snapshots (
                room_code, room_state_json, master_game_state_json,
                undo_state_ids_json, phase_deadline_at, paused_remaining_ms, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(room_code) DO UPDATE SET
                room_state_json = excluded.room_state_json,
                master_game_state_json = excluded.master_game_state_json,
                undo_history_json = NULL,
                undo_state_ids_json = excluded.undo_state_ids_json,
                phase_deadline_at = excluded.phase_deadline_at,
                paused_remaining_ms = excluded.paused_remaining_ms,
                updated_at = excluded.updated_at`,
        args: [
          snapshot.roomState.roomCode,
          JSON.stringify(snapshot.roomState),
          snapshot.masterGameState ? JSON.stringify(snapshot.masterGameState) : null,
          JSON.stringify(undoIds),
          snapshot.phaseDeadlineAt,
          snapshot.pausedRemainingMs,
          snapshot.updatedAt,
        ],
      });
      statements.push({
        sql: 'DELETE FROM room_undo_states WHERE room_code = ? AND state_id NOT IN (SELECT value FROM json_each(?))',
        args: [roomCode, JSON.stringify(undoIds)],
      });
      try {
        await this.client.batch(statements, 'write');
      } catch (error) {
        // The commit may have reached the database even if the response was lost.
        this.savedUndoIdsByRoom.delete(roomCode);
        throw error;
      }
      if (undoIds.length > 0) this.savedUndoIdsByRoom.set(roomCode, new Set(undoIds));
      else this.savedUndoIdsByRoom.delete(roomCode);
    });
  }

  async getRoomSnapshot(roomCode: string): Promise<RoomSnapshotRecord | null> {
    await this.init();
    const result = await this.client.execute({
      sql: `${ROOM_SNAPSHOT_SELECT} WHERE room_code = ? LIMIT 1`,
      args: [roomCode.trim().toUpperCase()],
    });
    const row = result.rows[0];
    return row ? mapRoomSnapshotRow(row) : null;
  }

  async listRecoverableRoomSnapshots(): Promise<readonly RoomSnapshotRecord[]> {
    await this.init();
    const result = await this.client.execute(
      `${ROOM_SNAPSHOT_SELECT} ORDER BY updated_at DESC`,
    );
    const records: RoomSnapshotRecord[] = [];
    for (const row of result.rows) {
      const parsed = mapRoomSnapshotRow(row);
      if (parsed && parsed.roomState.status !== 'FINISHED') {
        records.push(parsed);
      }
    }
    return records;
  }

  async deleteRoomSnapshot(roomCode: string): Promise<void> {
    return this.enqueueWrite(async () => {
      await this.init();
      const normalized = roomCode.trim().toUpperCase();
      this.savedUndoIdsByRoom.delete(normalized);
      await this.client.batch(
        [
          {
            sql: 'DELETE FROM room_undo_states WHERE room_code = ?',
            args: [normalized],
          },
          {
            sql: 'DELETE FROM room_snapshots WHERE room_code = ?',
            args: [normalized],
          },
          {
            sql: 'UPDATE users SET active_room_code = NULL WHERE active_room_code = ?',
            args: [normalized],
          },
        ],
        'write',
      );
    });
  }
}

function rowToNullableNumber(row: Row, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const ROOM_SNAPSHOT_SELECT = `SELECT room_snapshots.*,
  CASE WHEN undo_state_ids_json IS NULL THEN undo_history_json ELSE (
    SELECT json_group_array(json(state_json)) FROM (
      SELECT states.state_json
      FROM json_each(room_snapshots.undo_state_ids_json) AS ids
      JOIN room_undo_states AS states
        ON states.room_code = room_snapshots.room_code AND states.state_id = ids.value
      ORDER BY ids.key
    )
  ) END AS resolved_undo_history_json
  FROM room_snapshots`;

function mapRoomSnapshotRow(row: Row): RoomSnapshotRecord | null {
  try {
    const roomState = JSON.parse(rowToString(row, 'room_state_json')) as RoomState;
    const masterRaw = rowToNullableString(row, 'master_game_state_json');
    const masterGameState = masterRaw
      ? (JSON.parse(masterRaw) as MasterGameState)
      : null;
    const undoRaw = rowToNullableString(row, 'resolved_undo_history_json');
    const undoHistory = undoRaw
      ? (JSON.parse(undoRaw) as MasterGameState[])
      : [];
    return {
      roomState,
      masterGameState,
      undoHistory,
      phaseDeadlineAt: rowToNullableString(row, 'phase_deadline_at'),
      pausedRemainingMs: rowToNullableNumber(row, 'paused_remaining_ms'),
      updatedAt: rowToString(row, 'updated_at'),
    };
  } catch {
    return null;
  }
}

export function createPersistenceStore(options: {
  readonly url: string;
  readonly authToken?: string;
}): PersistenceStore {
  return new LibsqlPersistenceStore(options);
}
