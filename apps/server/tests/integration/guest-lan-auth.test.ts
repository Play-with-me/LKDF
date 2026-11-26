import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { MatchHistoryRecord, UserProfile } from '@lkdf/shared';
import type { RoomViewerPayload } from '../../src/rooms/index.js';
import { createServer, type ServerInstance } from '../../src/server.js';

interface TestWsClient {
  readonly socket: WebSocket;
  waitFor(
    predicate: (msg: Record<string, unknown>) => boolean,
    timeoutMs?: number,
  ): Promise<Record<string, unknown>>;
  sendJson(payload: unknown): void;
  close(): Promise<void>;
}

async function openTestWs(wsUrl: string): Promise<TestWsClient> {
  const socket = new WebSocket(wsUrl);
  const buffered: Record<string, unknown>[] = [];
  const waiters: Array<{
    predicate: (msg: Record<string, unknown>) => boolean;
    resolve: (msg: Record<string, unknown>) => void;
    timer: NodeJS.Timeout;
  }> = [];

  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', (err) => reject(err));
  });

  socket.on('message', (raw) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      return;
    }
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const w = waiters[i]!;
      if (w.predicate(parsed)) {
        clearTimeout(w.timer);
        waiters.splice(i, 1);
        w.resolve(parsed);
        return;
      }
    }
    buffered.push(parsed);
  });

  return {
    socket,
    waitFor(predicate, timeoutMs = 5000) {
      const idx = buffered.findIndex(predicate);
      if (idx >= 0) {
        const [hit] = buffered.splice(idx, 1);
        return Promise.resolve(hit!);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`WS waitFor timeout (${timeoutMs}ms)`));
        }, timeoutMs);
        waiters.push({ predicate, resolve, timer });
      });
    },
    sendJson(payload: unknown) {
      socket.send(JSON.stringify(payload));
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) {
        return;
      }
      await new Promise<void>((resolve) => {
        socket.once('close', () => resolve());
        socket.close();
      });
    },
  };
}

describe('Bước 2 — Guest Auth Định Danh Thiết Bị & JSON Persistence Cho Bàn Đa Máy LAN/VPN', () => {
  const activeServers: ServerInstance[] = [];
  const openClients: TestWsClient[] = [];
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (openClients.length > 0) {
      const client = openClients.pop();
      if (client) {
        await client.close();
      }
    }
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
          rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 30 });
        } catch {
          // Ignore temp cleanup contention on Windows
        }
      }
    }
  });

  it('xác thực POST /api/auth/guest, băm SHA-256 clientDeviceId cố định userId và kiểm tra giới hạn đầu vào', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: 'json::memory:',
        jwtSessionSecret: 'lan-guest-test-secret-key-minimum-32-chars!!',
      },
    });
    activeServers.push(srv);

    const badDeviceRes = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { clientDeviceId: 'short', displayName: 'Lâm Vũ' },
    });
    expect(badDeviceRes.statusCode).toBe(400);
    expect(badDeviceRes.json<{ code: string }>().code).toBe('INVALID_DEVICE_ID');

    const badNameRes = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { clientDeviceId: 'device-uuid-12345678', displayName: 'A' },
    });
    expect(badNameRes.statusCode).toBe(400);
    expect(badNameRes.json<{ code: string }>().code).toBe('INVALID_DISPLAY_NAME');

    const deviceId = 'device-radmin-host-99887766-abcd';
    const expectedSub = `guest_${createHash('sha256').update(deviceId, 'utf8').digest('hex').slice(0, 24)}`;

    const firstLogin = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { clientDeviceId: deviceId, displayName: '  Kiếm Khách A  ' },
    });
    expect(firstLogin.statusCode).toBe(200);
    const body1 = firstLogin.json<{
      ok: boolean;
      isNewUser: boolean;
      sessionToken: string;
      profile: UserProfile;
    }>();
    expect(body1.ok).toBe(true);
    expect(body1.isNewUser).toBe(true);
    expect(body1.profile.displayName).toBe('Kiếm Khách A');
    expect(body1.profile.googleSub).toBe(expectedSub);

    const secondLogin = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { clientDeviceId: deviceId, displayName: 'Chưởng Môn Thanh Vân' },
    });
    expect(secondLogin.statusCode).toBe(200);
    const body2 = secondLogin.json<{
      ok: boolean;
      isNewUser: boolean;
      sessionToken: string;
      profile: UserProfile;
    }>();
    expect(body2.isNewUser).toBe(false);
    expect(body2.profile.userId).toBe(body1.profile.userId);
    expect(body2.profile.displayName).toBe('Chưởng Môn Thanh Vân');

    const oldMe = await srv.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${body1.sessionToken}` },
    });
    expect(oldMe.statusCode).toBe(401);

    const newMe = await srv.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${body2.sessionToken}` },
    });
    expect(newMe.statusCode).toBe(200);
    expect(newMe.json<{ profile: UserProfile }>().profile.userId).toBe(
      body1.profile.userId,
    );
  });

  it('lưu bền vững dữ liệu người chơi, phòng chờ và thống kê ván đấu qua file JSON thuần JS (json:<path>)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lkdf-json-store-'));
    tempDirs.push(dir);
    const jsonFilePath = join(dir, 'lan-host-state.json');
    const fixedSecret = 'lan-json-persistence-jwt-secret-key-2026!!';

    const srv1 = await createServer({
      config: {
        databaseUrl: `json:${jsonFilePath}`,
        jwtSessionSecret: fixedSecret,
      },
    });

    const hostRes = await srv1.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: {
        clientDeviceId: 'host-machine-uuid-0001-aaaa',
        displayName: 'Chủ Bàn Radmin',
      },
    });
    const hostAuth = hostRes.json<{ sessionToken: string; profile: UserProfile }>();

    const createRoomRes = await srv1.app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { authorization: `Bearer ${hostAuth.sessionToken}` },
      payload: { timerPreset: 'FAST' },
    });
    expect(createRoomRes.statusCode).toBe(201);
    const roomCode = createRoomRes.json<RoomViewerPayload>().roomState.roomCode;

    const sampleMatch: MatchHistoryRecord = {
      matchId: 'lan-match-001',
      roomCode,
      playerCount: 4,
      winningFaction: 'LORD_LOYALIST',
      durationSeconds: 360,
      finishedAt: new Date().toISOString(),
      participants: [
        {
          userId: hostAuth.profile.userId,
          displayName: hostAuth.profile.displayName,
          seatIndex: 0,
          identity: 'LORD',
          heroId: 'liu_bei',
          isWinner: true,
          survived: true,
        },
        {
          userId: 'guest_dummy_1',
          displayName: 'Bạn 1',
          seatIndex: 1,
          identity: 'REBEL',
          heroId: 'cao_cao',
          isWinner: false,
          survived: false,
        },
        {
          userId: 'guest_dummy_2',
          displayName: 'Bạn 2',
          seatIndex: 2,
          identity: 'REBEL',
          heroId: 'sun_quan',
          isWinner: false,
          survived: false,
        },
        {
          userId: 'guest_dummy_3',
          displayName: 'Bạn 3',
          seatIndex: 3,
          identity: 'SPY',
          heroId: 'lu_bu',
          isWinner: false,
          survived: false,
        },
      ],
    };
    const recorded = await srv1.persistence.recordMatchResult(sampleMatch);
    expect(recorded.recorded).toBe(true);

    await srv1.app.close();
    expect(existsSync(jsonFilePath)).toBe(true);
    const rawDiskJson = JSON.parse(readFileSync(jsonFilePath, 'utf8')) as {
      version: number;
      users: Record<string, unknown>;
    };
    expect(rawDiskJson.version).toBe(1);
    expect(Object.keys(rawDiskJson.users)).toContain(hostAuth.profile.userId);

    const srv2 = await createServer({
      config: {
        databaseUrl: `json:${jsonFilePath}`,
        jwtSessionSecret: fixedSecret,
      },
    });
    activeServers.push(srv2);

    const mineRes = await srv2.app.inject({
      method: 'GET',
      url: '/api/rooms/mine',
      headers: { authorization: `Bearer ${hostAuth.sessionToken}` },
    });
    expect(mineRes.statusCode).toBe(200);
    expect(
      mineRes.json<{ room: RoomViewerPayload | null }>().room?.roomState.roomCode,
    ).toBe(roomCode);

    const statsRes = await srv2.app.inject({
      method: 'GET',
      url: `/api/stats?userId=${encodeURIComponent(hostAuth.profile.userId)}&includeMonthly=true&includeMatches=true`,
    });
    expect(statsRes.statusCode).toBe(200);
    const statsJson = statsRes.json<{
      summary: { totalWins: number; totalAppearances: number };
      monthlyResults: Array<{ wins: number; losses: number }>;
    }>();
    expect(statsJson.summary.totalAppearances).toBe(1);
    expect(statsJson.summary.totalWins).toBe(1);
    expect(statsJson.monthlyResults).toHaveLength(3);
  });

  it('mở bàn 4P không cần Google OAuth, vào ván và khôi phục đúng ghế qua WebSocket khi rớt mạng dùng cùng clientDeviceId', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: 'json::memory:',
        jwtSessionSecret: 'lan-4p-reconnect-jwt-secret-key-2026!!',
      },
      runtime: {
        disconnectBotTakeoverGraceMs: 50,
      },
    });
    activeServers.push(srv);

    const address = await srv.app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = `${address.replace(/^http/, 'ws')}/ws`;

    const devices = [
      { clientDeviceId: 'pc-host-tailscale-100-01', displayName: 'Chủ Phòng A' },
      { clientDeviceId: 'pc-guest-tailscale-100-02', displayName: 'Bằng Hữu B' },
      { clientDeviceId: 'pc-guest-tailscale-100-03', displayName: 'Bằng Hữu C' },
      { clientDeviceId: 'pc-guest-tailscale-100-04', displayName: 'Bằng Hữu D' },
    ] as const;

    const logins = await Promise.all(
      devices.map(async (d) => {
        const res = await srv.app.inject({
          method: 'POST',
          url: '/api/auth/guest',
          payload: d,
        });
        expect(res.statusCode).toBe(200);
        return res.json<{ sessionToken: string; profile: UserProfile }>();
      }),
    );

    const createRes = await srv.app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { authorization: `Bearer ${logins[0]!.sessionToken}` },
      payload: { timerPreset: 'STANDARD' },
    });
    expect(createRes.statusCode).toBe(201);
    const roomCode = createRes.json<RoomViewerPayload>().roomState.roomCode;

    for (const guest of logins.slice(1)) {
      const joinRes = await srv.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${guest.sessionToken}` },
        payload: { roomCode },
      });
      expect(joinRes.statusCode).toBe(200);
    }

    const sockets: TestWsClient[] = [];
    for (const login of logins) {
      const ws = await openTestWs(wsUrl);
      openClients.push(ws);
      ws.sendJson({ type: 'AUTH', sessionToken: login.sessionToken });
      await ws.waitFor((m) => m['type'] === 'AUTH_OK');
      await ws.waitFor((m) => m['type'] === 'ROOM_STATE');
      sockets.push(ws);
    }

    for (const guest of logins.slice(1)) {
      const readyRes = await srv.app.inject({
        method: 'PATCH',
        url: `/api/rooms/${roomCode}/ready`,
        headers: { authorization: `Bearer ${guest.sessionToken}` },
        payload: { isReady: true },
      });
      expect(readyRes.statusCode).toBe(200);
    }

    const startSyncs = sockets.map((ws) =>
      ws.waitFor(
        (m) =>
          m['type'] === 'ROOM_STATE' &&
          (m['roomState'] as { status?: string } | undefined)?.status === 'IN_GAME',
      ),
    );
    const startRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${logins[0]!.sessionToken}` },
    });
    expect(startRes.statusCode).toBe(200);
    await Promise.all(startSyncs);

    // Ghế #2 (Bằng Hữu B) rớt mạng và mở lại game -> gọi lại /api/auth/guest với cùng clientDeviceId
    await sockets[1]!.close();
    const reloginGuestB = await srv.app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: devices[1],
    });
    expect(reloginGuestB.statusCode).toBe(200);
    const reloginData = reloginGuestB.json<{
      sessionToken: string;
      profile: UserProfile;
    }>();
    expect(reloginData.profile.userId).toBe(logins[1]!.profile.userId);

    const mineHttp = await srv.app.inject({
      method: 'GET',
      url: '/api/rooms/mine',
      headers: { authorization: `Bearer ${reloginData.sessionToken}` },
    });
    expect(mineHttp.statusCode).toBe(200);
    const mineRoom = mineHttp.json<{ room: RoomViewerPayload | null }>().room;
    expect(mineRoom?.roomState.roomCode).toBe(roomCode);
    expect(mineRoom?.playerView?.viewerSeatIndex).toBe(1);

    const reconnectedWs = await openTestWs(wsUrl);
    openClients.push(reconnectedWs);
    reconnectedWs.sendJson({
      type: 'AUTH',
      sessionToken: reloginData.sessionToken,
    });
    await reconnectedWs.waitFor((m) => m['type'] === 'AUTH_OK');
    const restoredRoomMsg = await reconnectedWs.waitFor(
      (m) => m['type'] === 'ROOM_STATE',
    );
    const restoredPlayerView = restoredRoomMsg['playerView'] as {
      viewerSeatIndex?: number;
    } | null;
    expect(restoredPlayerView?.viewerSeatIndex).toBe(1);
  });
});
