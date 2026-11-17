import { z } from 'zod';
import type { GoogleIdentityInput } from '../persistence/index.js';

export interface GoogleOAuthProvider {
  readonly isConfigured: boolean;
  buildAuthorizeUrl(params: {
    readonly state: string;
    readonly redirectUri: string;
  }): string;
  exchangeCodeForIdentity(params: {
    readonly code: string;
    readonly redirectUri: string;
  }): Promise<GoogleIdentityInput>;
}

const GoogleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const GoogleUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

/** Tích hợp Google OAuth 2.0 chuẩn qua HTTPS (chạy hoàn toàn phía máy chủ, không lộ Client Secret). */
export class RealGoogleOAuthProvider implements GoogleOAuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(options: {
    readonly clientId: string;
    readonly clientSecret: string;
  }) {
    this.clientId = options.clientId.trim();
    this.clientSecret = options.clientSecret.trim();
  }

  get isConfigured(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  buildAuthorizeUrl(params: {
    readonly state: string;
    readonly redirectUri: string;
  }): string {
    if (!this.isConfigured) {
      throw new Error(
        'Máy chủ chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.',
      );
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', params.state);
    return url.toString();
  }

  async exchangeCodeForIdentity(params: {
    readonly code: string;
    readonly redirectUri: string;
  }): Promise<GoogleIdentityInput> {
    if (!this.isConfigured) {
      throw new Error(
        'Máy chủ chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.',
      );
    }

    const tokenBody = new URLSearchParams({
      code: params.code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenRes.ok) {
      throw new Error(`Google từ chối đổi mã xác thực (${tokenRes.status}).`);
    }

    const parsedToken = GoogleTokenResponseSchema.safeParse(await tokenRes.json());
    if (!parsedToken.success) {
      throw new Error('Phản hồi token từ Google không hợp lệ.');
    }

    const userInfoRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${parsedToken.data.access_token}`,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!userInfoRes.ok) {
      throw new Error(
        `Không thể lấy thông tin tài khoản Google (${userInfoRes.status}).`,
      );
    }

    const parsedInfo = GoogleUserInfoSchema.safeParse(await userInfoRes.json());
    if (!parsedInfo.success) {
      throw new Error('Dữ liệu hồ sơ Google thiếu sub hoặc email hợp lệ.');
    }

    const fallbackName = parsedInfo.data.email.split('@')[0] || 'Người chơi';
    return {
      googleSub: parsedInfo.data.sub,
      email: parsedInfo.data.email,
      displayName: (parsedInfo.data.name ?? fallbackName).trim(),
      avatarUrl: parsedInfo.data.picture ?? '',
    };
  }
}
