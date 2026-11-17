import type {
  HeroFaction,
  HeroId,
  IdentityRole,
  MatchHistoryRecord,
  PlayerViewState,
  RefereeAuditEntry,
  RoomSeat,
  RoomState,
  TimerPreset,
  TimerPresetConfig,
  UserPreferences,
  UserProfile,
  UserStats,
} from '@lkdf/shared';

export type {
  HeroFaction,
  HeroId,
  IdentityRole,
  MatchHistoryRecord,
  PlayerViewState,
  RefereeAuditEntry,
  RoomSeat,
  RoomState,
  TimerPreset,
  TimerPresetConfig,
  UserPreferences,
  UserProfile,
  UserStats,
};

export interface PersistedClientState {
  readonly serverUrl: string;
  readonly sessionToken: string | null;
}

export interface HealthCheckResponse {
  readonly ok: true;
  readonly service: string;
  readonly version: string;
  readonly heroCount: number;
  readonly deckTotal: number;
  readonly googleConfigured: boolean;
  readonly timestamp: string;
}

export interface StartGoogleLoginResponse {
  readonly ok: true;
  readonly authSessionId: string;
  readonly pollSecret: string;
  readonly authUrl: string;
  readonly expiresAt: string;
}

export type PollAuthStatusResponse =
  | {
      readonly ok: true;
      readonly status: 'PENDING';
      readonly expiresAt: string;
    }
  | {
      readonly ok: true;
      readonly status: 'COMPLETED';
      readonly sessionToken: string;
      readonly profile: UserProfile;
    }
  | {
      readonly ok: true;
      readonly status: 'CANCELLED';
      readonly messageVi: string;
    };

export interface ExchangeManualCodeResponse {
  readonly ok: true;
  readonly sessionToken: string;
  readonly profile: UserProfile;
}

export interface TimerPresetOption {
  readonly id: TimerPreset;
  readonly nameVi: string;
  readonly heroSelectSeconds: number;
  readonly mainTurnSeconds: number;
  readonly reactionSeconds: number;
}

export interface RoomViewerPayload {
  readonly roomState: RoomState;
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly playerView: PlayerViewState | null;
  readonly refereeAuditLog: readonly RefereeAuditEntry[];
}

export interface DetailedStatEntry {
  readonly played: number;
  readonly wins: number;
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

export interface FilteredStatsSummary {
  readonly totalAppearances: number;
  readonly totalDistinctMatches: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly winRatePercent: number;
  readonly byIdentity: Record<IdentityRole, DetailedStatEntry>;
  readonly byHero: Record<string, DetailedStatEntry>;
}

export interface StatsFilterInput {
  readonly userId?: string;
  readonly identity?: IdentityRole;
  readonly heroId?: HeroId;
  readonly includeMatches?: boolean;
  readonly matchLimit?: number;
}

export interface FilteredStatsResponse {
  readonly ok: true;
  readonly filter: {
    readonly userId: string | null;
    readonly identity: IdentityRole | null;
    readonly heroId: HeroId | null;
  };
  readonly summary: FilteredStatsSummary;
  readonly players: readonly PlayerFilteredStatRow[];
  readonly recentMatches?: readonly MatchHistoryRecord[];
}

export interface StatsMetaIdentityOption {
  readonly id: IdentityRole;
  readonly nameVi: string;
}

export interface StatsMetaHeroOption {
  readonly id: HeroId;
  readonly nameVi: string;
  readonly faction: HeroFaction;
  readonly factionLabelVi: string;
}

export interface PublicPlayerInfo {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
}

export interface StatsMetaResponse {
  readonly ok: true;
  readonly identities: readonly StatsMetaIdentityOption[];
  readonly heroes: readonly StatsMetaHeroOption[];
  readonly players: readonly PublicPlayerInfo[];
}

export interface UserStatsDetailResponse {
  readonly ok: true;
  readonly player: PublicPlayerInfo;
  readonly stats: UserStats;
}
