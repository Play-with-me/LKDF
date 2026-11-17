import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { UserProfile } from '@lkdf/shared';
import type { PersistenceStore } from '../persistence/index.js';
import type { GoogleOAuthProvider } from './googleProvider.js';
import { signSessionJwt, verifySessionJwt } from './jwt.js';

export const AUTH_MODULE_READY = true;

const AUTH_SESSION_TTL_MS = 10 * 60 * 1000;
const MANUAL_CODE_TTL_MS = 5 * 60 * 1000;
const MANUAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface PendingAuthSession {
  readonly authSessionId: string;
  readonly state: string;
  readonly pollSecret: string;
  readonly desktopCallbackPort: number | null;
  readonly expiresAtMs: number;
  stateConsumed: boolean;
  cancelledReason?: string;
  completed?: {
    readonly profile: UserProfile;
    readonly sessionToken: string;
    readonly manualLoginCode: string;
  };
}

interface ManualCodeRecord {
  readonly userId: string;
  readonly sessionId: string;
  readonly sessionToken: string;
  readonly expiresAtMs: number;
}

export interface StartLoginResult {
  readonly authSessionId: string;
  readonly pollSecret: string;
  readonly authUrl: string;
  readonly expiresAt: string;
}

export type CompleteCallbackResult =
  | {
      readonly ok: true;
      readonly profile: UserProfile;
      readonly isNewUser: boolean;
      readonly manualLoginCode: string;
      readonly authSessionId: string;
      readonly desktopCallbackUrl: string | null;
    }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code:
        | 'INVALID_OR_EXPIRED_STATE'
        | 'GOOGLE_NOT_CONFIGURED'
        | 'GOOGLE_EXCHANGE_FAILED';
      readonly messageVi: string;
    };

export type PollAuthResult =
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
    }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code: 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED' | 'INVALID_POLL_SECRET';
      readonly messageVi: string;
    };

export type ExchangeManualCodeResult =
  | {
      readonly ok: true;
      readonly sessionToken: string;
      readonly profile: UserProfile;
    }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code:
        | 'INVALID_OR_EXPIRED_CODE'
        | 'SESSION_REPLACED'
        | 'USER_NOT_FOUND';
      readonly messageVi: string;
    };

export type VerifySessionResult =
  | {
      readonly ok: true;
      readonly profile: UserProfile;
      readonly sessionId: string;
    }
  | {
      readonly ok: false;
      readonly statusCode: 401;
      readonly code:
        | 'MISSING_TOKEN'
        | 'INVALID_TOKEN'
        | 'TOKEN_EXPIRED'
        | 'SESSION_REVOKED'
        | 'SESSION_REPLACED';
      readonly messageVi: string;
    };

export type SeatEligibilityResult =
  | { readonly allowed: true; readonly userId: string }
  | {
      readonly allowed: false;
      readonly statusCode: 409;
      readonly code: 'ACCOUNT_ALREADY_SEATED' | 'ACCOUNT_IN_ANOTHER_ROOM';
      readonly messageVi: string;
    };

export type SessionListener = (userId: string, reason: 'SESSION_REPLACED' | 'SESSION_REVOKED') => void;

function constantTimeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function generateManualLoginCode(): string {
  const bytes = randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i += 1) {
    part1 += MANUAL_CODE_ALPHABET[(bytes[i] ?? 0) % MANUAL_CODE_ALPHABET.length];
    part2 += MANUAL_CODE_ALPHABET[(bytes[i + 4] ?? 0) % MANUAL_CODE_ALPHABET.length];
  }
  return `LKDF-${part1}-${part2}`;
}

export interface AuthService {
  readonly isGoogleConfigured: boolean;
  startGoogleLogin(desktopCallbackPort?: number): StartLoginResult;
  completeGoogleCallback(params: {
    readonly code: string;
    readonly state: string;
  }): Promise<CompleteCallbackResult>;
  cancelGoogleLoginByState(state: string, reasonVi?: string): boolean;
  pollAuthSession(authSessionId: string, pollSecret: string): Promise<PollAuthResult>;
  exchangeManualLoginCode(code: string): Promise<ExchangeManualCodeResult>;
  verifySessionToken(token: string): Promise<VerifySessionResult>;
  verifyAuthorizationHeader(authHeader?: string): Promise<VerifySessionResult>;
  logout(token: string): Promise<boolean>;
  checkAccountSeatEligibility(params: {
    readonly profile: UserProfile;
    readonly occupiedUserIds: readonly string[];
    readonly targetRoomCode?: string;
  }): SeatEligibilityResult;
  onSessionInvalidated(listener: SessionListener): () => void;
}

export function createAuthService(options: {
  readonly persistence: PersistenceStore;
  readonly googleProvider: GoogleOAuthProvider;
  readonly jwtSessionSecret: string;
  readonly googleRedirectUri: string;
}): AuthService {
  const authSessions = new Map<string, PendingAuthSession>();
  const stateToSessionId = new Map<string, string>();
  const manualCodes = new Map<string, ManualCodeRecord>();
  const listeners = new Set<SessionListener>();

  const purgeExpired = (nowMs = Date.now()): void => {
    for (const [id, session] of authSessions.entries()) {
      if (nowMs > session.expiresAtMs) {
        authSessions.delete(id);
        stateToSessionId.delete(session.state);
      }
    }
    for (const [code, record] of manualCodes.entries()) {
      if (nowMs > record.expiresAtMs) {
        manualCodes.delete(code);
      }
    }
  };

  const notifyInvalidated = (
    userId: string,
    reason: 'SESSION_REPLACED' | 'SESSION_REVOKED',
  ): void => {
    for (const listener of listeners) {
      listener(userId, reason);
    }
  };

  return {
    get isGoogleConfigured(): boolean {
      return options.googleProvider.isConfigured;
    },

    onSessionInvalidated(listener: SessionListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    startGoogleLogin(desktopCallbackPort?: number): StartLoginResult {
      purgeExpired();

      let validPort: number | null = null;
      if (desktopCallbackPort !== undefined) {
        if (
          !Number.isInteger(desktopCallbackPort) ||
          desktopCallbackPort < 1024 ||
          desktopCallbackPort > 65535
        ) {
          throw new Error('Cổng nhận callback nội bộ trên Windows không hợp lệ (1024–65535).');
        }
        validPort = desktopCallbackPort;
      }

      const authSessionId = randomUUID();
      const state = randomBytes(24).toString('base64url');
      const pollSecret = randomBytes(24).toString('base64url');
      const expiresAtMs = Date.now() + AUTH_SESSION_TTL_MS;

      const authUrl = options.googleProvider.buildAuthorizeUrl({
        state,
        redirectUri: options.googleRedirectUri,
      });

      authSessions.set(authSessionId, {
        authSessionId,
        state,
        pollSecret,
        desktopCallbackPort: validPort,
        expiresAtMs,
        stateConsumed: false,
      });
      stateToSessionId.set(state, authSessionId);

      return {
        authSessionId,
        pollSecret,
        authUrl,
        expiresAt: new Date(expiresAtMs).toISOString(),
      };
    },

    cancelGoogleLoginByState(
      state: string,
      reasonVi = 'Người dùng đã hủy đăng nhập Google.',
    ): boolean {
      const sessionIdKey = stateToSessionId.get(state);
      if (!sessionIdKey) {
        return false;
      }
      stateToSessionId.delete(state);
      const pending = authSessions.get(sessionIdKey);
      if (!pending || pending.stateConsumed) {
        return false;
      }
      pending.stateConsumed = true;
      pending.cancelledReason = reasonVi;
      return true;
    },

    async completeGoogleCallback(params: {
      readonly code: string;
      readonly state: string;
    }): Promise<CompleteCallbackResult> {
      const nowMs = Date.now();
      purgeExpired(nowMs);

      const sessionIdKey = stateToSessionId.get(params.state);
      if (!sessionIdKey) {
        return {
          ok: false,
          statusCode: 400,
          code: 'INVALID_OR_EXPIRED_STATE',
          messageVi: 'Phiên đăng nhập Google không tồn tại, đã dùng hoặc đã hết hạn.',
        };
      }

      const pending = authSessions.get(sessionIdKey);
      stateToSessionId.delete(params.state);

      if (!pending || pending.stateConsumed || nowMs > pending.expiresAtMs) {
        if (pending) {
          authSessions.delete(pending.authSessionId);
        }
        return {
          ok: false,
          statusCode: 400,
          code: 'INVALID_OR_EXPIRED_STATE',
          messageVi: 'Phiên đăng nhập Google đã hết hạn hoặc đã được xác nhận trước đó.',
        };
      }

      pending.stateConsumed = true;

      if (!options.googleProvider.isConfigured) {
        return {
          ok: false,
          statusCode: 503,
          code: 'GOOGLE_NOT_CONFIGURED',
          messageVi: 'Máy chủ chưa cấu hình thông tin xác thực Google OAuth 2.0.',
        };
      }

      let identity;
      try {
        identity = await options.googleProvider.exchangeCodeForIdentity({
          code: params.code,
          redirectUri: options.googleRedirectUri,
        });
      } catch (err) {
        authSessions.delete(pending.authSessionId);
        return {
          ok: false,
          statusCode: 502,
          code: 'GOOGLE_EXCHANGE_FAILED',
          messageVi:
            err instanceof Error
              ? err.message
              : 'Không thể xác thực tài khoản với Google.',
        };
      }

      const { profile, isNewUser } = await options.persistence.upsertGoogleUser(identity);

      const previousSessionId = await options.persistence.getUserActiveSessionId(
        profile.userId,
      );
      const newSessionId = randomUUID();
      await options.persistence.setUserActiveSession(profile.userId, newSessionId);

      if (previousSessionId) {
        notifyInvalidated(profile.userId, 'SESSION_REPLACED');
      }

      const sessionToken = signSessionJwt(
        {
          userId: profile.userId,
          googleSub: profile.googleSub,
          sessionId: newSessionId,
        },
        options.jwtSessionSecret,
      );

      let manualLoginCode = generateManualLoginCode();
      while (manualCodes.has(manualLoginCode)) {
        manualLoginCode = generateManualLoginCode();
      }

      manualCodes.set(manualLoginCode, {
        userId: profile.userId,
        sessionId: newSessionId,
        sessionToken,
        expiresAtMs: nowMs + MANUAL_CODE_TTL_MS,
      });

      pending.completed = {
        profile,
        sessionToken,
        manualLoginCode,
      };

      const desktopCallbackUrl =
        pending.desktopCallbackPort !== null
          ? `http://127.0.0.1:${pending.desktopCallbackPort}/auth/callback?code=${encodeURIComponent(manualLoginCode)}&authSessionId=${encodeURIComponent(pending.authSessionId)}`
          : null;

      return {
        ok: true,
        profile,
        isNewUser,
        manualLoginCode,
        authSessionId: pending.authSessionId,
        desktopCallbackUrl,
      };
    },

    async pollAuthSession(
      authSessionId: string,
      pollSecret: string,
    ): Promise<PollAuthResult> {
      const nowMs = Date.now();
      purgeExpired(nowMs);

      const pending = authSessions.get(authSessionId);
      if (!pending) {
        return {
          ok: false,
          statusCode: 404,
          code: 'SESSION_NOT_FOUND',
          messageVi: 'Không tìm thấy phiên đăng nhập Google đang chờ.',
        };
      }

      if (!constantTimeStringEqual(pending.pollSecret, pollSecret)) {
        return {
          ok: false,
          statusCode: 403,
          code: 'INVALID_POLL_SECRET',
          messageVi: 'Khóa đối chiếu phiên đăng nhập không hợp lệ.',
        };
      }

      if (nowMs > pending.expiresAtMs) {
        authSessions.delete(authSessionId);
        return {
          ok: false,
          statusCode: 410,
          code: 'SESSION_EXPIRED',
          messageVi: 'Phiên chờ đăng nhập Google đã hết hạn.',
        };
      }

      if (pending.cancelledReason) {
        const messageVi = pending.cancelledReason;
        authSessions.delete(authSessionId);
        return {
          ok: true,
          status: 'CANCELLED',
          messageVi,
        };
      }

      if (!pending.completed) {
        return {
          ok: true,
          status: 'PENDING',
          expiresAt: new Date(pending.expiresAtMs).toISOString(),
        };
      }

      const completed = pending.completed;
      const latestProfile =
        (await options.persistence.getUserById(completed.profile.userId)) ??
        completed.profile;

      authSessions.delete(authSessionId);

      return {
        ok: true,
        status: 'COMPLETED',
        sessionToken: completed.sessionToken,
        profile: latestProfile,
      };
    },

    async exchangeManualLoginCode(code: string): Promise<ExchangeManualCodeResult> {
      const nowMs = Date.now();
      purgeExpired(nowMs);

      const normalized = code.trim().toUpperCase();
      const record = manualCodes.get(normalized);
      if (!record || nowMs > record.expiresAtMs) {
        manualCodes.delete(normalized);
        return {
          ok: false,
          statusCode: 400,
          code: 'INVALID_OR_EXPIRED_CODE',
          messageVi: 'Mã đăng nhập dự phòng không đúng hoặc đã hết hạn (chỉ dùng 1 lần).',
        };
      }

      manualCodes.delete(normalized);

      const activeSessionId = await options.persistence.getUserActiveSessionId(
        record.userId,
      );
      if (activeSessionId !== record.sessionId) {
        return {
          ok: false,
          statusCode: 401,
          code: 'SESSION_REPLACED',
          messageVi: 'Tài khoản Google này vừa đăng nhập ở một phiên mới hơn.',
        };
      }

      const profile = await options.persistence.getUserById(record.userId);
      if (!profile) {
        return {
          ok: false,
          statusCode: 404,
          code: 'USER_NOT_FOUND',
          messageVi: 'Không tìm thấy hồ sơ người chơi.',
        };
      }

      return {
        ok: true,
        sessionToken: record.sessionToken,
        profile,
      };
    },

    async verifySessionToken(token: string): Promise<VerifySessionResult> {
      if (!token.trim()) {
        return {
          ok: false,
          statusCode: 401,
          code: 'MISSING_TOKEN',
          messageVi: 'Thiếu mã phiên đăng nhập.',
        };
      }

      const verified = verifySessionJwt(token, options.jwtSessionSecret);
      if (!verified.ok) {
        return {
          ok: false,
          statusCode: 401,
          code: verified.code,
          messageVi:
            verified.code === 'TOKEN_EXPIRED'
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Google.'
              : 'Mã phiên đăng nhập không hợp lệ.',
        };
      }

      const profile = await options.persistence.getUserById(verified.payload.sub);
      if (!profile) {
        return {
          ok: false,
          statusCode: 401,
          code: 'INVALID_TOKEN',
          messageVi: 'Hồ sơ người chơi không tồn tại.',
        };
      }

      const activeSessionId = await options.persistence.getUserActiveSessionId(
        profile.userId,
      );
      if (activeSessionId === null) {
        return {
          ok: false,
          statusCode: 401,
          code: 'SESSION_REVOKED',
          messageVi: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.',
        };
      }

      if (activeSessionId !== verified.payload.jti) {
        return {
          ok: false,
          statusCode: 401,
          code: 'SESSION_REPLACED',
          messageVi:
            'Tài khoản Google này đã đăng nhập ở thiết bị hoặc cửa sổ khác (mỗi tài khoản chỉ dùng 1 phiên).',
        };
      }

      return {
        ok: true,
        profile,
        sessionId: verified.payload.jti,
      };
    },

    async verifyAuthorizationHeader(authHeader?: string): Promise<VerifySessionResult> {
      if (!authHeader) {
        return {
          ok: false,
          statusCode: 401,
          code: 'MISSING_TOKEN',
          messageVi: 'Vui lòng đăng nhập Google để tiếp tục.',
        };
      }
      const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
      if (!match || !match[1]) {
        return {
          ok: false,
          statusCode: 401,
          code: 'MISSING_TOKEN',
          messageVi: 'Định dạng Authorization Bearer không hợp lệ.',
        };
      }
      return this.verifySessionToken(match[1]);
    },

    async logout(token: string): Promise<boolean> {
      const check = await this.verifySessionToken(token);
      if (!check.ok) {
        return false;
      }
      await options.persistence.setUserActiveSession(check.profile.userId, null);
      notifyInvalidated(check.profile.userId, 'SESSION_REVOKED');
      return true;
    },

    checkAccountSeatEligibility(params: {
      readonly profile: UserProfile;
      readonly occupiedUserIds: readonly string[];
      readonly targetRoomCode?: string;
    }): SeatEligibilityResult {
      if (params.occupiedUserIds.includes(params.profile.userId)) {
        return {
          allowed: false,
          statusCode: 409,
          code: 'ACCOUNT_ALREADY_SEATED',
          messageVi:
            'Một tài khoản Google không thể ngồi 2 ghế cùng lúc trong cùng một bàn.',
        };
      }

      if (
        params.profile.activeRoomCode &&
        params.targetRoomCode &&
        params.profile.activeRoomCode !== params.targetRoomCode
      ) {
        return {
          allowed: false,
          statusCode: 409,
          code: 'ACCOUNT_IN_ANOTHER_ROOM',
          messageVi: `Tài khoản này đang tham gia phòng ${params.profile.activeRoomCode}.`,
        };
      }

      return {
        allowed: true,
        userId: params.profile.userId,
      };
    },
  };
}
