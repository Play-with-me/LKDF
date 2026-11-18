import { randomBytes } from 'node:crypto';
import type { GoogleOAuthProvider } from './auth/googleProvider.js';

export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: string;
  readonly databaseUrl: string;
  readonly databaseAuthToken: string | undefined;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly googleRedirectUri: string;
  readonly jwtSessionSecret: string;
  readonly isEphemeralJwtSecret: boolean;
  readonly githubRepo: string;
  readonly githubReleaseToken: string;
  readonly githubApiBaseUrl: string;
  readonly updateCacheTtlMs: number;
}

export interface MatchCoordinatorConfig {
  /** Khoảng dừng giả lập Vô Giải Khả Kích khi không ai có bài (mặc định 2000–3500ms). */
  readonly simulatedNullificationMinMs?: number;
  readonly simulatedNullificationMaxMs?: number;
  /** Độ trễ mỗi nước đánh khi Máy đánh hộ tạm thời (mặc định 450ms). */
  readonly botActionDelayMs?: number;
  /** Độ trễ tối thiểu khi Máy bỏ qua Vô Giải Khả Kích để chống lộ thời gian (mặc định 1500ms). */
  readonly nullificationBotPassMinMs?: number;
  /** Thời gian ân hạn trước khi chuyển isBotTakeover=true khi rớt mạng giữa ván (mặc định 0ms). */
  readonly disconnectBotTakeoverGraceMs?: number;
  /** Thời gian chờ trước khi tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng gốc mất mạng (mặc định 30000ms). */
  readonly hostFailoverDelayMs?: number;
  /** Hệ số tỷ lệ thời lượng đồng hồ pha (mặc định 1.0; dùng < 1 trong test hết giờ). */
  readonly timerScale?: number;
  /** Hàm sinh số ngẫu nhiên tùy biến cho test. */
  readonly rng?: () => number;
}

export interface CreateServerOptions {
  readonly config?: Partial<ServerConfig>;
  readonly googleProvider?: GoogleOAuthProvider;
  readonly runtime?: MatchCoordinatorConfig;
}

/** Đọc cấu hình máy chủ từ biến môi trường; không bao giờ nhúng khóa bí mật cứng vào mã nguồn. */
export function loadServerConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  const nodeEnv = overrides?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const envJwtSecret = overrides?.jwtSessionSecret ?? process.env.JWT_SESSION_SECRET ?? '';

  if (nodeEnv === 'production' && envJwtSecret.trim().length < 16) {
    throw new Error(
      'Thiếu biến môi trường JWT_SESSION_SECRET hợp lệ (tối thiểu 16 ký tự) trong môi trường production.',
    );
  }

  const isEphemeralJwtSecret = envJwtSecret.trim().length === 0;
  const jwtSessionSecret = isEphemeralJwtSecret
    ? randomBytes(32).toString('hex')
    : envJwtSecret;

  const databaseUrlRaw = overrides?.databaseUrl ?? process.env.DATABASE_URL ?? ':memory:';
  const databaseUrl = databaseUrlRaw.trim().length > 0 ? databaseUrlRaw.trim() : ':memory:';
  const databaseAuthTokenRaw =
    overrides?.databaseAuthToken ?? process.env.DATABASE_AUTH_TOKEN;
  const githubRepoRaw =
    overrides?.githubRepo ?? process.env.GITHUB_REPO ?? 'Play-with-me/LKDF';
  const githubReleaseTokenRaw =
    overrides?.githubReleaseToken ?? process.env.GITHUB_RELEASE_TOKEN ?? '';
  const githubApiBaseUrlRaw =
    overrides?.githubApiBaseUrl ??
    process.env.GITHUB_API_BASE_URL ??
    'https://api.github.com';
  const updateCacheTtlRaw =
    overrides?.updateCacheTtlMs ??
    Number(process.env.UPDATE_CACHE_TTL_MS ?? 60_000);

  return {
    port: overrides?.port ?? Number(process.env.PORT ?? 3001),
    host: overrides?.host ?? process.env.HOST ?? '0.0.0.0',
    nodeEnv,
    databaseUrl,
    databaseAuthToken:
      databaseAuthTokenRaw && databaseAuthTokenRaw.trim().length > 0
        ? databaseAuthTokenRaw.trim()
        : undefined,
    googleClientId: overrides?.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: overrides?.googleClientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '',
    googleRedirectUri:
      overrides?.googleRedirectUri ??
      process.env.GOOGLE_REDIRECT_URI ??
      'http://localhost:3001/api/auth/google/callback',
    jwtSessionSecret,
    isEphemeralJwtSecret,
    githubRepo:
      githubRepoRaw.trim().length > 0
        ? githubRepoRaw.trim()
        : 'Play-with-me/LKDF',
    githubReleaseToken: githubReleaseTokenRaw.trim(),
    githubApiBaseUrl:
      githubApiBaseUrlRaw.trim().replace(/\/+$/, '') || 'https://api.github.com',
    updateCacheTtlMs:
      Number.isFinite(updateCacheTtlRaw) && updateCacheTtlRaw >= 0
        ? updateCacheTtlRaw
        : 60_000,
  };
}
