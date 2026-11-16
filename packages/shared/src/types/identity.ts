import { z } from 'zod';

/** Thân phận trong thể thức chuẩn 4–8 người. */
export const IdentityRoleSchema = z.enum(['LORD', 'LOYALIST', 'REBEL', 'SPY']);
export type IdentityRole = z.infer<typeof IdentityRoleSchema>;

/** Sĩ số bàn hợp lệ (chỉ cho phép 4 đến 8 người chơi thật). */
export const PlayerCountSchema = z.union([
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);
export type PlayerCount = z.infer<typeof PlayerCountSchema>;

export interface IdentityDistribution {
  readonly lord: number;
  readonly loyalist: number;
  readonly rebel: number;
  readonly spy: number;
}

/** Bảng phân bổ Thân Phận cố định theo REQUIREMENTS.md & DECISIONS.md (ADR-003). */
export const IDENTITY_DISTRIBUTIONS: Readonly<Record<PlayerCount, IdentityDistribution>> = {
  4: { lord: 1, loyalist: 0, rebel: 2, spy: 1 },
  5: { lord: 1, loyalist: 1, rebel: 2, spy: 1 },
  6: { lord: 1, loyalist: 1, rebel: 3, spy: 1 },
  7: { lord: 1, loyalist: 2, rebel: 3, spy: 1 },
  8: { lord: 1, loyalist: 2, rebel: 3, spy: 2 },
};

/** Phe chiến thắng khi kết thúc ván đấu hợp lệ. */
export const WinningFactionSchema = z.enum(['LORD_LOYALIST', 'REBEL', 'SPY']);
export type WinningFaction = z.infer<typeof WinningFactionSchema>;

/** 3 mức đồng hồ đếm ngược cho Chủ phòng chọn ở phòng chờ. */
export const TimerPresetSchema = z.enum(['FAST', 'STANDARD', 'RELAXED']);
export type TimerPreset = z.infer<typeof TimerPresetSchema>;

export interface TimerPresetConfig {
  readonly heroSelectSeconds: number;
  readonly mainTurnSeconds: number;
  readonly reactionSeconds: number;
}

/** Thông số đồng hồ chuẩn theo REQUIREMENTS.md mục 3.4. */
export const TIMER_PRESETS: Readonly<Record<TimerPreset, TimerPresetConfig>> = {
  FAST: { heroSelectSeconds: 20, mainTurnSeconds: 30, reactionSeconds: 10 },
  STANDARD: { heroSelectSeconds: 30, mainTurnSeconds: 45, reactionSeconds: 15 },
  RELAXED: { heroSelectSeconds: 45, mainTurnSeconds: 60, reactionSeconds: 20 },
};

export interface UserPreferences {
  readonly soundEnabled: boolean;
  readonly volume: number;
}

export interface UserProfile {
  readonly userId: string;
  readonly googleSub: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly preferences: UserPreferences;
  readonly activeRoomCode: string | null;
  readonly createdAt: string;
  readonly lastLoginAt: string;
}

export interface RoleStatEntry {
  readonly played: number;
  readonly wins: number;
}

export interface UserStats {
  readonly userId: string;
  readonly totalMatches: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly byIdentity: Record<IdentityRole, RoleStatEntry>;
  readonly byHero: Record<string, RoleStatEntry>;
}
