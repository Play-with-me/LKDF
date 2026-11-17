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
}

export interface CreateServerOptions {
  readonly config?: Partial<ServerConfig>;
  readonly googleProvider?: GoogleOAuthProvider;
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
  };
}
