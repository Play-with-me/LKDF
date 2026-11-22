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
      readonly isNewUser?: boolean;
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
  readonly isNewUser?: boolean;
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
  readonly includeMonthly?: boolean;
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
  readonly monthlyResults?: readonly { readonly month: string; readonly wins: number; readonly losses: number }[];
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

export interface UpdateAssetSummary {
  readonly name: string;
  readonly size: number;
  readonly sha512: string | null;
  readonly downloadPath: string;
}

export interface LatestUpdateInfoResponse {
  readonly ok: true;
  readonly configured: boolean;
  readonly hasRelease: boolean;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly updateAvailable: boolean;
  readonly tagName: string | null;
  readonly releaseName: string | null;
  readonly releaseNotes: string;
  readonly publishedAt: string | null;
  readonly ymlAvailable: boolean;
  readonly feedUrl: string;
  readonly primaryInstaller: UpdateAssetSummary | null;
  readonly assets: readonly {
    readonly name: string;
    readonly size: number;
    readonly downloadPath: string;
  }[];
  readonly messageVi?: string;
}

export type UpdateStatusPhase =
  | 'IDLE'
  | 'CHECKING'
  | 'UP_TO_DATE'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'INSTALLING'
  | 'ERROR';

export interface DesktopUpdateState {
  readonly phase: UpdateStatusPhase;
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly releaseName: string | null;
  readonly releaseNotes: string;
  readonly publishedAt: string | null;
  readonly installerName: string | null;
  readonly installerSizeBytes: number | null;
  readonly downloadPath: string | null;
  readonly percent: number | null;
  readonly transferredBytes: number | null;
  readonly totalBytes: number | null;
  readonly bytesPerSecond: number | null;
  readonly canAutoInstall: boolean;
  readonly manualDownloadSavedPath: string | null;
  readonly messageVi: string | null;
}
