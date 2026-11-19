import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PersistenceStore } from '../persistence/index.js';
import type { AuthService } from './index.js';

const StartGoogleLoginBodySchema = z.object({
  desktopCallbackPort: z.number().int().min(1024).max(65535).optional(),
});

const GoogleCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  state: z.string().min(1),
});

const ExchangeCodeBodySchema = z.object({
  code: z.string().min(4),
});

const UpdatePreferencesBodySchema = z.object({
  soundEnabled: z.boolean().optional(),
  volume: z.number().min(0).max(1).optional(),
});

const UpdateDisplayNameBodySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Biệt danh phải có từ 2 đến 20 ký tự.')
    .max(20, 'Biệt danh tối đa 20 ký tự để hiển thị đẹp trên bàn tròn.'),
});

const SeatCheckBodySchema = z.object({
  occupiedUserIds: z.array(z.string().min(1)).max(8),
  roomCode: z.string().min(1).max(16).optional(),
});

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCallbackSuccessHtml(params: {
  readonly displayName: string;
  readonly manualLoginCode: string;
  readonly desktopCallbackUrl: string | null;
}): string {
  const safeName = escapeHtml(params.displayName);
  const safeCode = escapeHtml(params.manualLoginCode);
  const safeCallbackJson = params.desktopCallbackUrl
    ? JSON.stringify(params.desktopCallbackUrl).replaceAll('<', '\\u003c')
    : null;

  const autoRedirectBlock = safeCallbackJson
    ? `<p class="hint">Đang tự động đưa phiên đăng nhập về ứng dụng Tam Quốc Sát trên Windows...</p>
       <script>try{fetch(${safeCallbackJson},{mode:'no-cors'}).catch(function(){});}catch(e){}</script>`
    : `<p class="hint">Ứng dụng Tam Quốc Sát sẽ tự đồng bộ phiên đăng nhập trong giây lát.</p>`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đăng nhập Tam Quốc Sát thành công</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#14171A; color:#F3F4F6; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { max-width:460px; background:#1E2328; border:1px solid #30363D; border-radius:12px; padding:28px; text-align:center; }
    h1 { margin:0 0 8px; font-size:22px; color:#F3F4F6; }
    p { margin:0 0 16px; color:#C9D1D9; line-height:1.5; font-size:14px; }
    .code-box { background:#14171A; border:1px solid #D99B26; border-radius:8px; padding:14px; font-size:22px; font-weight:700; letter-spacing:2px; color:#D99B26; margin:16px 0; user-select:all; }
    .hint { color:#9CA3AF; font-size:13px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Đăng nhập thành công</h1>
    <p>Xin chào <strong>${safeName}</strong>. Tài khoản Google của bạn đã được liên kết với Tam Quốc Sát.</p>
    ${autoRedirectBlock}
    <p>Nếu ứng dụng chưa tự mở lại, hãy sao chép mã đăng nhập dự phòng bên dưới và dán vào app:</p>
    <div class="code-box">${safeCode}</div>
    <p class="hint">Mã dự phòng chỉ dùng 1 lần và có hiệu lực trong 5 phút. Bạn có thể đóng tab này.</p>
  </main>
</body>
</html>`;
}

function renderCallbackErrorHtml(messageVi: string): string {
  const safeMessage = escapeHtml(messageVi);
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đăng nhập Tam Quốc Sát không thành công</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#14171A; color:#F3F4F6; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { max-width:460px; background:#1E2328; border:1px solid #C83E37; border-radius:12px; padding:28px; text-align:center; }
    h1 { margin:0 0 12px; font-size:20px; color:#FCA5A5; }
    p { margin:0; color:#D1D5DB; line-height:1.5; font-size:14px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Đăng nhập chưa hoàn tất</h1>
    <p>${safeMessage}</p>
  </main>
</body>
</html>`;
}

/** Đăng ký toàn bộ endpoint Google OAuth 2.0, phiên đăng nhập và hồ sơ cá nhân. */
export function registerAuthRoutes(
  app: FastifyInstance,
  deps: {
    readonly authService: AuthService;
    readonly persistence: PersistenceStore;
  },
): void {
  const { authService, persistence } = deps;

  app.get('/api/auth/config', async () => {
    return {
      ok: true,
      googleConfigured: authService.isGoogleConfigured,
    };
  });

  app.post('/api/auth/google/start', async (request, reply) => {
    const parsed = StartGoogleLoginBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_REQUEST',
        messageVi: 'Thông số khởi tạo đăng nhập Google không hợp lệ.',
      });
    }

    if (!authService.isGoogleConfigured) {
      return reply.status(503).send({
        ok: false,
        code: 'GOOGLE_NOT_CONFIGURED',
        messageVi: 'Máy chủ chưa được cấu hình Google OAuth 2.0.',
      });
    }

    const started = authService.startGoogleLogin(parsed.data.desktopCallbackPort);
    return {
      ok: true,
      ...started,
    };
  });

  app.get('/api/auth/google/callback', async (request, reply) => {
    const parsed = GoogleCallbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .type('text/html; charset=utf-8')
        .send(renderCallbackErrorHtml('Thiếu mã xác thực hoặc state từ Google.'));
    }

    if (parsed.data.error || !parsed.data.code) {
      authService.cancelGoogleLoginByState(
        parsed.data.state,
        'Bạn đã hủy cấp quyền đăng nhập Google.',
      );
      return reply
        .status(400)
        .type('text/html; charset=utf-8')
        .send(renderCallbackErrorHtml('Bạn đã hủy đăng nhập Google. Hãy thử lại từ ứng dụng Tam Quốc Sát.'));
    }

    const result = await authService.completeGoogleCallback({
      code: parsed.data.code,
      state: parsed.data.state,
    });

    if (!result.ok) {
      return reply
        .status(result.statusCode)
        .type('text/html; charset=utf-8')
        .send(renderCallbackErrorHtml(result.messageVi));
    }

    return reply
      .status(200)
      .type('text/html; charset=utf-8')
      .send(
        renderCallbackSuccessHtml({
          displayName: result.profile.displayName,
          manualLoginCode: result.manualLoginCode,
          desktopCallbackUrl: result.desktopCallbackUrl,
        }),
      );
  });

  app.get('/api/auth/google/status/:authSessionId', async (request, reply) => {
    const params = request.params as { authSessionId?: string };
    const authSessionId = params.authSessionId ?? '';
    const pollSecretHeader = request.headers['x-auth-poll-secret'];
    const pollSecret =
      typeof pollSecretHeader === 'string' ? pollSecretHeader : '';

    if (!authSessionId || !pollSecret) {
      return reply.status(400).send({
        ok: false,
        code: 'MISSING_POLL_CREDENTIALS',
        messageVi: 'Thiếu mã phiên chờ hoặc khóa đối chiếu phiên.',
      });
    }

    const poll = await authService.pollAuthSession(authSessionId, pollSecret);
    if (!poll.ok) {
      return reply.status(poll.statusCode).send(poll);
    }

    return poll;
  });

  app.post('/api/auth/exchange-code', async (request, reply) => {
    const parsed = ExchangeCodeBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_CODE_FORMAT',
        messageVi: 'Vui lòng nhập mã đăng nhập dự phòng hợp lệ.',
      });
    }

    const exchanged = await authService.exchangeManualLoginCode(parsed.data.code);
    if (!exchanged.ok) {
      return reply.status(exchanged.statusCode).send(exchanged);
    }

    return exchanged;
  });

  app.get('/api/auth/me', async (request, reply) => {
    const verified = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!verified.ok) {
      return reply.status(verified.statusCode).send(verified);
    }

    return {
      ok: true,
      profile: verified.profile,
    };
  });

  app.patch('/api/profile/preferences', async (request, reply) => {
    const verified = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!verified.ok) {
      return reply.status(verified.statusCode).send(verified);
    }

    const parsed = UpdatePreferencesBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_PREFERENCES',
        messageVi: 'Cài đặt âm thanh phải có âm lượng từ 0 đến 1.',
      });
    }

    const prefsUpdate: { soundEnabled?: boolean; volume?: number } = {};
    if (parsed.data.soundEnabled !== undefined) {
      prefsUpdate.soundEnabled = parsed.data.soundEnabled;
    }
    if (parsed.data.volume !== undefined) {
      prefsUpdate.volume = parsed.data.volume;
    }

    const updated = await persistence.updateUserPreferences(
      verified.profile.userId,
      prefsUpdate,
    );

    if (!updated) {
      return reply.status(404).send({
        ok: false,
        code: 'USER_NOT_FOUND',
        messageVi: 'Không tìm thấy hồ sơ người chơi.',
      });
    }

    return {
      ok: true,
      profile: updated,
    };
  });

  app.patch('/api/profile/display-name', async (request, reply) => {
    const verified = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!verified.ok) {
      return reply.status(verified.statusCode).send(verified);
    }

    const parsed = UpdateDisplayNameBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ??
        'Biệt danh phải có từ 2 đến 20 ký tự hợp lệ.';
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_DISPLAY_NAME',
        messageVi: msg,
      });
    }

    const updated = await persistence.updateUserDisplayName(
      verified.profile.userId,
      parsed.data.displayName,
    );

    if (!updated) {
      return reply.status(404).send({
        ok: false,
        code: 'USER_NOT_FOUND',
        messageVi: 'Không tìm thấy hồ sơ người chơi.',
      });
    }

    return {
      ok: true,
      profile: updated,
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    const token = match?.[1] ?? '';
    const loggedOut = await authService.logout(token);
    if (!loggedOut) {
      return reply.status(401).send({
        ok: false,
        code: 'INVALID_SESSION',
        messageVi: 'Phiên đăng nhập không hợp lệ hoặc đã đăng xuất trước đó.',
      });
    }
    return { ok: true };
  });

  app.post('/api/auth/seat-check', async (request, reply) => {
    const verified = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!verified.ok) {
      return reply.status(verified.statusCode).send(verified);
    }

    const parsed = SeatCheckBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_SEAT_CHECK_INPUT',
        messageVi: 'Danh sách ghế kiểm tra không hợp lệ.',
      });
    }

    const seatCheck = authService.checkAccountSeatEligibility({
      profile: verified.profile,
      occupiedUserIds: parsed.data.occupiedUserIds,
      ...(parsed.data.roomCode ? { targetRoomCode: parsed.data.roomCode } : {}),
    });

    if (!seatCheck.allowed) {
      return reply.status(seatCheck.statusCode).send({
        ok: false,
        ...seatCheck,
      });
    }

    return {
      ok: true,
      allowed: true,
      userId: verified.profile.userId,
    };
  });
}
