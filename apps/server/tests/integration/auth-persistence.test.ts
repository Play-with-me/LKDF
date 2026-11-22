import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { UserProfile } from '@lkdf/shared';
import type { GoogleOAuthProvider } from '../../src/auth/googleProvider.js';
import type { GoogleIdentityInput } from '../../src/persistence/index.js';
import { createServer, type ServerInstance } from '../../src/server.js';

function createMockGoogleProvider(
  identitiesByCode: Record<string, GoogleIdentityInput>,
): GoogleOAuthProvider {
  return {
    isConfigured: true,
    buildAuthorizeUrl({ state, redirectUri }) {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('client_id', 'mock-google-client-id');
      return url.toString();
    },
    async exchangeCodeForIdentity({ code }) {
      const match = identitiesByCode[code];
      if (!match) {
        throw new Error(`Mã code giả lập không tồn tại: ${code}`);
      }
      return match;
    },
  };
}

function extractManualCodeFromHtml(html: string): string {
  const match = /<div class="code-box">((?:TQS|LKDF)-[A-Z0-9]{4}-[A-Z0-9]{4})<\/div>/.exec(html);
  if (!match || !match[1]) {
    throw new Error('Không tìm thấy mã đăng nhập dự phòng trong trang HTML callback.');
  }
  return match[1];
}

function waitForWsMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Hết thời gian chờ thông điệp WebSocket.'));
    }, 5000);
    socket.once('message', (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>);
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForWsClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve({ code: 1000, reason: '' });
      return;
    }
    socket.once('close', (code, reasonBuf) => {
      resolve({ code, reason: reasonBuf.toString('utf8') });
    });
  });
}

function connectWs(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

describe('Bước 2.1 — Google OAuth 2.0, Lưu Hồ sơ & Chặn 1 Tài khoản ngồi 2 Ghế', () => {
  const activeServers: ServerInstance[] = [];
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (activeServers.length > 0) {
      const srv = activeServers.pop();
      if (srv) {
        await srv.app.close();
      }
    }
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        try {
          rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
        } catch {
          // Windows có thể giữ khóa file SQLite thêm vài ms sau khi đóng socket libSQL.
        }
      }
    }
  });

  it('bảo mật: không lộ Google Client Secret hay JWT Secret qua bất kỳ API nào', async () => {
    const secretMarker = 'super-secret-google-client-xyz';
    const jwtMarker = 'super-secret-jwt-signing-abc-12345';
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        googleClientId: 'public-client-id',
        googleClientSecret: secretMarker,
        jwtSessionSecret: jwtMarker,
      },
      googleProvider: createMockGoogleProvider({}),
    });
    activeServers.push(srv);

    const healthRes = await srv.app.inject({ method: 'GET', url: '/api/health' });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body).not.toContain(secretMarker);
    expect(healthRes.body).not.toContain(jwtMarker);

    const authConfigRes = await srv.app.inject({ method: 'GET', url: '/api/auth/config' });
    expect(authConfigRes.statusCode).toBe(200);
    expect(authConfigRes.json()).toEqual({ ok: true, googleConfigured: true });
    expect(authConfigRes.body).not.toContain(secretMarker);
    expect(authConfigRes.body).not.toContain(jwtMarker);
  });

  it('thực hiện Google OAuth 2.0 (tự đồng bộ + mã dán dự phòng) và tạo/cập nhật đúng hồ sơ theo googleSub', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'test-jwt-secret-key-minimum-32-chars!!',
      },
      googleProvider: createMockGoogleProvider({
        'code-first': {
          googleSub: 'google-sub-001',
          email: 'minh@example.com',
          displayName: 'Minh Tướng Quân',
          avatarUrl: 'https://example.com/a1.png',
        },
        'code-second': {
          googleSub: 'google-sub-001',
          email: 'minh.new@example.com',
          displayName: 'Minh Đô Đốc',
          avatarUrl: 'https://example.com/a2.png',
        },
      }),
    });
    activeServers.push(srv);

    const startRes = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/google/start',
      payload: { desktopCallbackPort: 45123 },
    });
    expect(startRes.statusCode).toBe(200);
    const startBody = startRes.json<{
      ok: boolean;
      authSessionId: string;
      pollSecret: string;
      authUrl: string;
    }>();
    expect(startBody.ok).toBe(true);
    const authUrl = new URL(startBody.authUrl);
    const state = authUrl.searchParams.get('state') ?? '';
    expect(state.length).toBeGreaterThan(10);

    const wrongPollRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${startBody.authSessionId}`,
      headers: { 'x-auth-poll-secret': 'wrong-secret' },
    });
    expect(wrongPollRes.statusCode).toBe(403);

    const pendingPollRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${startBody.authSessionId}`,
      headers: { 'x-auth-poll-secret': startBody.pollSecret },
    });
    expect(pendingPollRes.statusCode).toBe(200);
    expect(pendingPollRes.json<{ status: string }>().status).toBe('PENDING');

    const callbackRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=code-first&state=${encodeURIComponent(state)}`,
    });
    expect(callbackRes.statusCode).toBe(200);
    expect(callbackRes.headers['content-type']).toContain('text/html');
    expect(callbackRes.body).toContain('Minh Tướng Quân');
    expect(callbackRes.body).toContain('http://127.0.0.1:45123/auth/callback');
    const manualCode1 = extractManualCodeFromHtml(callbackRes.body);

    const replayCallbackRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=code-first&state=${encodeURIComponent(state)}`,
    });
    expect(replayCallbackRes.statusCode).toBe(400);

    const completedPollRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${startBody.authSessionId}`,
      headers: { 'x-auth-poll-secret': startBody.pollSecret },
    });
    expect(completedPollRes.statusCode).toBe(200);
    const completedBody = completedPollRes.json<{
      ok: boolean;
      status: string;
      sessionToken: string;
      profile: UserProfile;
    }>();
    expect(completedBody.status).toBe('COMPLETED');
    const firstUserId = completedBody.profile.userId;
    const firstCreatedAt = completedBody.profile.createdAt;
    const token1 = completedBody.sessionToken;

    const patchPrefRes = await srv.app.inject({
      method: 'PATCH',
      url: '/api/profile/preferences',
      headers: { authorization: `Bearer ${token1}` },
      payload: { soundEnabled: false, volume: 0.35 },
    });
    expect(patchPrefRes.statusCode).toBe(200);
    expect(patchPrefRes.json<{ profile: UserProfile }>().profile.preferences).toEqual({
      soundEnabled: false,
      musicEnabled: true,
      volume: 0.35,
    });

    const exchange1 = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/exchange-code',
      payload: { code: manualCode1 },
    });
    expect(exchange1.statusCode).toBe(200);

    const exchangeReuse = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/exchange-code',
      payload: { code: manualCode1 },
    });
    expect(exchangeReuse.statusCode).toBe(400);

    const start2 = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/google/start',
      payload: {},
    });
    const state2 =
      new URL(start2.json<{ authUrl: string }>().authUrl).searchParams.get('state') ?? '';
    const cb2 = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=code-second&state=${encodeURIComponent(state2)}`,
    });
    expect(cb2.statusCode).toBe(200);
    const manualCode2 = extractManualCodeFromHtml(cb2.body);

    const exchange2 = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/exchange-code',
      payload: { code: manualCode2 },
    });
    expect(exchange2.statusCode).toBe(200);
    const secondLoginBody = exchange2.json<{
      sessionToken: string;
      profile: UserProfile;
    }>();

    expect(secondLoginBody.profile.userId).toBe(firstUserId);
    expect(secondLoginBody.profile.createdAt).toBe(firstCreatedAt);
    expect(secondLoginBody.profile.email).toBe('minh.new@example.com');
    expect(secondLoginBody.profile.displayName).toBe('Minh Đô Đốc');
    expect(secondLoginBody.profile.avatarUrl).toBe('https://example.com/a2.png');
    expect(secondLoginBody.profile.preferences).toEqual({
      soundEnabled: false,
      musicEnabled: true,
      volume: 0.35,
    });

    const staleTokenCheck = await srv.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(staleTokenCheck.statusCode).toBe(401);
    expect(staleTokenCheck.json<{ code: string }>().code).toBe('SESSION_REPLACED');
  });

  it('xử lý hủy cấp quyền Google (?error=access_denied) và thông báo trạng thái CANCELLED', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'test-jwt-secret-key-minimum-32-chars!!',
      },
      googleProvider: createMockGoogleProvider({}),
    });
    activeServers.push(srv);

    const startRes = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/google/start',
      payload: {},
    });
    const { authSessionId, pollSecret, authUrl } = startRes.json<{
      authSessionId: string;
      pollSecret: string;
      authUrl: string;
    }>();
    const state = new URL(authUrl).searchParams.get('state') ?? '';

    const cancelRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?error=access_denied&state=${encodeURIComponent(state)}`,
    });
    expect(cancelRes.statusCode).toBe(400);

    const pollRes = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${authSessionId}`,
      headers: { 'x-auth-poll-secret': pollSecret },
    });
    expect(pollRes.statusCode).toBe(200);
    expect(pollRes.json<{ status: string }>().status).toBe('CANCELLED');
  });

  it('chặn 1 tài khoản Google ngồi 2 ghế qua HTTP seat-check và kết nối WebSocket /ws thực tế', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'test-jwt-secret-key-minimum-32-chars!!',
      },
      googleProvider: createMockGoogleProvider({
        'user-a-1': {
          googleSub: 'sub-seat-guard',
          email: 'lan@example.com',
          displayName: 'Lan',
          avatarUrl: 'https://example.com/lan.png',
        },
        'user-a-2': {
          googleSub: 'sub-seat-guard',
          email: 'lan@example.com',
          displayName: 'Lan',
          avatarUrl: 'https://example.com/lan.png',
        },
      }),
    });
    activeServers.push(srv);

    const start1 = await srv.app.inject({ method: 'POST', url: '/api/auth/google/start' });
    const s1 = start1.json<{ authSessionId: string; pollSecret: string; authUrl: string }>();
    const st1 = new URL(s1.authUrl).searchParams.get('state') ?? '';
    await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=user-a-1&state=${encodeURIComponent(st1)}`,
    });
    const login1 = (
      await srv.app.inject({
        method: 'GET',
        url: `/api/auth/google/status/${s1.authSessionId}`,
        headers: { 'x-auth-poll-secret': s1.pollSecret },
      })
    ).json<{ sessionToken: string; profile: UserProfile }>();

    const allowedSeatCheck = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/seat-check',
      headers: { authorization: `Bearer ${login1.sessionToken}` },
      payload: { occupiedUserIds: ['other_u1', 'other_u2'], roomCode: 'ROOM01' },
    });
    expect(allowedSeatCheck.statusCode).toBe(200);

    const duplicateSeatCheck = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/seat-check',
      headers: { authorization: `Bearer ${login1.sessionToken}` },
      payload: { occupiedUserIds: ['other_u1', login1.profile.userId], roomCode: 'ROOM01' },
    });
    expect(duplicateSeatCheck.statusCode).toBe(409);
    expect(duplicateSeatCheck.json<{ code: string }>().code).toBe(
      'ACCOUNT_ALREADY_SEATED',
    );

    await srv.persistence.setUserActiveRoom(login1.profile.userId, 'ROOM01');
    const crossRoomCheck = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/seat-check',
      headers: { authorization: `Bearer ${login1.sessionToken}` },
      payload: { occupiedUserIds: [], roomCode: 'ROOM99' },
    });
    expect(crossRoomCheck.statusCode).toBe(409);
    expect(crossRoomCheck.json<{ code: string }>().code).toBe(
      'ACCOUNT_IN_ANOTHER_ROOM',
    );

    const address = await srv.app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = address.replace(/^http/, 'ws') + '/ws';

    const ws1 = await connectWs(wsUrl);
    const ws1AuthPromise = waitForWsMessage(ws1);
    ws1.send(JSON.stringify({ type: 'AUTH', sessionToken: login1.sessionToken }));
    const ws1Auth = await ws1AuthPromise;
    expect(ws1Auth.type).toBe('AUTH_OK');

    const ws2 = await connectWs(wsUrl);
    const ws2MsgPromise = waitForWsMessage(ws2);
    const ws2ClosePromise = waitForWsClose(ws2);
    ws2.send(
      JSON.stringify({
        type: 'AUTH',
        sessionToken: login1.sessionToken,
        seatMode: 'CLAIM_SEAT',
      }),
    );
    const ws2Msg = await ws2MsgPromise;
    const ws2Close = await ws2ClosePromise;
    expect(ws2Msg.type).toBe('AUTH_ERROR');
    expect(ws2Msg.code).toBe('DUPLICATE_ACTIVE_SEAT');
    expect(ws2Close.code).toBe(4009);

    const ws1InvalidatedPromise = waitForWsMessage(ws1);
    const ws1ClosePromise = waitForWsClose(ws1);
    const start2 = await srv.app.inject({ method: 'POST', url: '/api/auth/google/start' });
    const s2 = start2.json<{ authSessionId: string; pollSecret: string; authUrl: string }>();
    const st2 = new URL(s2.authUrl).searchParams.get('state') ?? '';
    await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=user-a-2&state=${encodeURIComponent(st2)}`,
    });

    const ws1Invalidated = await ws1InvalidatedPromise;
    const ws1Close = await ws1ClosePromise;
    expect(ws1Invalidated.type).toBe('SESSION_INVALIDATED');
    expect(ws1Invalidated.code).toBe('SESSION_REPLACED');
    expect(ws1Close.code).toBe(4001);
  });

  it('bền vững qua khởi động lại máy chủ với cơ sở dữ liệu file SQLite/libSQL', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lkdf-persist-'));
    tempDirs.push(dir);
    const dbFileUrl = `file:${join(dir, 'lkdf.db').replace(/\\/g, '/')}`;
    const fixedSecret = 'persistent-server-jwt-secret-key-9999';

    const srv1 = await createServer({
      config: { databaseUrl: dbFileUrl, jwtSessionSecret: fixedSecret },
      googleProvider: createMockGoogleProvider({
        'persist-code': {
          googleSub: 'google-sub-persist',
          email: 'huy@example.com',
          displayName: 'Huy Quân Sư',
          avatarUrl: 'https://example.com/huy.png',
        },
      }),
    });

    const start1 = await srv1.app.inject({ method: 'POST', url: '/api/auth/google/start' });
    const { authSessionId, pollSecret, authUrl } = start1.json<{
      authSessionId: string;
      pollSecret: string;
      authUrl: string;
    }>();
    const state = new URL(authUrl).searchParams.get('state') ?? '';
    await srv1.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=persist-code&state=${encodeURIComponent(state)}`,
    });
    const login = (
      await srv1.app.inject({
        method: 'GET',
        url: `/api/auth/google/status/${authSessionId}`,
        headers: { 'x-auth-poll-secret': pollSecret },
      })
    ).json<{ sessionToken: string; profile: UserProfile }>();
    await srv1.app.inject({
      method: 'PATCH',
      url: '/api/profile/preferences',
      headers: { authorization: `Bearer ${login.sessionToken}` },
      payload: { soundEnabled: false, volume: 0.5 },
    });
    const music = await srv1.app.inject({
      method: 'PATCH',
      url: '/api/profile/preferences',
      headers: { authorization: `Bearer ${login.sessionToken}` },
      payload: { musicEnabled: false },
    });
    expect(music.statusCode).toBe(200);
    expect(music.json<{ profile: UserProfile }>().profile.preferences).toMatchObject({
      musicEnabled: false, soundEnabled: false, volume: 0.5,
    });
    await srv1.app.close();

    const srv2 = await createServer({
      config: { databaseUrl: dbFileUrl, jwtSessionSecret: fixedSecret },
      googleProvider: createMockGoogleProvider({}),
    });
    activeServers.push(srv2);

    const meAfterRestart = await srv2.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${login.sessionToken}` },
    });
    expect(meAfterRestart.statusCode).toBe(200);
    expect(meAfterRestart.json<{ profile: UserProfile }>().profile).toMatchObject({
      userId: login.profile.userId,
      googleSub: 'google-sub-persist',
      displayName: 'Huy Quân Sư',
      preferences: { soundEnabled: false, musicEnabled: false, volume: 0.5 },
    });

    const logoutRes = await srv2.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${login.sessionToken}` },
    });
    expect(logoutRes.statusCode).toBe(200);

    const meAfterLogout = await srv2.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${login.sessionToken}` },
    });
    expect(meAfterLogout.statusCode).toBe(401);
    expect(meAfterLogout.json<{ code: string }>().code).toBe('SESSION_REVOKED');
  });

  it('trả về isNewUser ở lần đầu, cho phép đặt Biệt danh và không bị Google ghi đè khi đăng nhập lại', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'test-jwt-secret-key-minimum-32-chars!!',
      },
      googleProvider: createMockGoogleProvider({
        'nick-first': {
          googleSub: 'google-sub-nickname-01',
          email: 'nam@example.com',
          displayName: 'Nguyễn Văn Nam (Gmail)',
          avatarUrl: 'https://example.com/nam1.png',
        },
        'nick-second': {
          googleSub: 'google-sub-nickname-01',
          email: 'nam@example.com',
          displayName: 'Nguyễn Văn Nam Đổi Ở Google',
          avatarUrl: 'https://example.com/nam2.png',
        },
      }),
    });
    activeServers.push(srv);

    const s1 = await srv.app.inject({ method: 'POST', url: '/api/auth/google/start', payload: {} });
    const start1 = s1.json<{ authSessionId: string; pollSecret: string; authUrl: string }>();
    const state1 = new URL(start1.authUrl).searchParams.get('state') ?? '';
    await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=nick-first&state=${encodeURIComponent(state1)}`,
    });
    const poll1 = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${start1.authSessionId}`,
      headers: { 'x-auth-poll-secret': start1.pollSecret },
    });
    const body1 = poll1.json<{
      status: string;
      sessionToken: string;
      isNewUser: boolean;
      profile: UserProfile;
    }>();
    expect(body1.status).toBe('COMPLETED');
    expect(body1.isNewUser).toBe(true);

    const invalidNick = await srv.app.inject({
      method: 'PATCH',
      url: '/api/profile/display-name',
      headers: { authorization: `Bearer ${body1.sessionToken}` },
      payload: { displayName: 'A' },
    });
    expect(invalidNick.statusCode).toBe(400);

    const validNick = await srv.app.inject({
      method: 'PATCH',
      url: '/api/profile/display-name',
      headers: { authorization: `Bearer ${body1.sessionToken}` },
      payload: { displayName: '  Khổng Minh  ' },
    });
    expect(validNick.statusCode).toBe(200);
    expect(validNick.json<{ profile: UserProfile }>().profile.displayName).toBe(
      'Khổng Minh',
    );

    const s2 = await srv.app.inject({ method: 'POST', url: '/api/auth/google/start', payload: {} });
    const start2 = s2.json<{ authSessionId: string; pollSecret: string; authUrl: string }>();
    const state2 = new URL(start2.authUrl).searchParams.get('state') ?? '';
    await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/callback?code=nick-second&state=${encodeURIComponent(state2)}`,
    });
    const poll2 = await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${start2.authSessionId}`,
      headers: { 'x-auth-poll-secret': start2.pollSecret },
    });
    const body2 = poll2.json<{
      status: string;
      isNewUser: boolean;
      profile: UserProfile;
    }>();
    expect(body2.isNewUser).toBe(false);
    expect(body2.profile.displayName).toBe('Khổng Minh');
    expect(body2.profile.avatarUrl).toBe('https://example.com/nam2.png');
  });
});
