import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const JwtHeaderSchema = z.object({
  alg: z.literal('HS256'),
  typ: z.literal('JWT'),
});

const SessionTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  googleSub: z.string().min(1),
  jti: z.string().min(1),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});

export type SessionTokenPayload = z.infer<typeof SessionTokenPayloadSchema>;

export type VerifyJwtResult =
  | { readonly ok: true; readonly payload: SessionTokenPayload }
  | { readonly ok: false; readonly code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' };

function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeBase64UrlJson(segment: string): unknown {
  const jsonText = Buffer.from(segment, 'base64url').toString('utf8');
  return JSON.parse(jsonText) as unknown;
}

/** Ký JWT phiên đăng nhập HS256 bằng Node crypto (không cần thư viện ngoài). */
export function signSessionJwt(
  input: {
    readonly userId: string;
    readonly googleSub: string;
    readonly sessionId: string;
    readonly ttlSeconds?: number;
    readonly nowMs?: number;
  },
  secret: string,
): string {
  const iat = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const exp = iat + (input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS);
  const headerB64 = encodeBase64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payloadB64 = encodeBase64UrlJson({
    sub: input.userId,
    googleSub: input.googleSub,
    jti: input.sessionId,
    iat,
    exp,
  } satisfies SessionTokenPayload);

  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureB64 = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signatureB64}`;
}

/** Xác thực chữ ký HS256 (chống timing attack) và hạn dùng của JWT phiên. */
export function verifySessionJwt(
  token: string,
  secret: string,
  nowMs = Date.now(),
): VerifyJwtResult {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret).update(signingInput).digest();
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(signatureB64, 'base64url');
  } catch {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  try {
    const header = JwtHeaderSchema.safeParse(decodeBase64UrlJson(headerB64));
    if (!header.success) {
      return { ok: false, code: 'INVALID_TOKEN' };
    }

    const payload = SessionTokenPayloadSchema.safeParse(
      decodeBase64UrlJson(payloadB64),
    );
    if (!payload.success) {
      return { ok: false, code: 'INVALID_TOKEN' };
    }

    const nowSeconds = Math.floor(nowMs / 1000);
    if (nowSeconds >= payload.data.exp) {
      return { ok: false, code: 'TOKEN_EXPIRED' };
    }

    return { ok: true, payload: payload.data };
  } catch {
    return { ok: false, code: 'INVALID_TOKEN' };
  }
}
