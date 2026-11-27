import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { RoomViewerPayload } from '../../src/rooms/index.js';
import { createServer, type ServerInstance } from '../../src/server.js';

interface TestWsClient {
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
    waitFor(predicate, timeoutMs = 6000) {
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
      if (socket.readyState === WebSocket.CLOSED) return;
      await new Promise<void>((resolve) => {
        socket.once('close', () => resolve());
        socket.close();
      });
    },
  };
}

describe('POST /api/rooms/:roomCode/fill-bots (Unified Unity Sidecar Offline/LAN flow)', () => {
  const activeServers: ServerInstance[] = [];

  afterEach(async () => {
    while (activeServers.length > 0) {
      const srv = activeServers.pop()!;
      srv.coordinator.shutdown();
      for (const client of srv.wss.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => srv.wss.close(() => resolve()));
      await srv.app.close();
      srv.persistence.close();
    }
  });

  async function bootLocalSidecarServer(): Promise<{
    server: ServerInstance;
    baseUrl: string;
    wsUrl: string;
  }> {
    const server = await createServer({
      config: {
        port: 0,
        host: '127.0.0.1',
        databaseUrl: 'json::memory:',
        jwtSessionSecret: 'unity-sidecar-test-secret-0123456789',
      },
      runtime: {
        botActionDelayMs: 20,
        nullificationBotPassMinMs: 25,
        simulatedNullificationMinMs: 20,
        simulatedNullificationMaxMs: 30,
      },
    });
    activeServers.push(server);
    const addr = await server.app.listen({ host: '127.0.0.1', port: 0 });
    return {
      server,
      baseUrl: addr,
      wsUrl: addr.replace('http://', 'ws://') + '/ws',
    };
  }

  async function guestLogin(baseUrl: string, deviceId: string, name: string) {
    const res = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientDeviceId: deviceId, displayName: name }),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as { ok: true; sessionToken: string; profile: { userId: string } };
  }

  it('fills a 1-human room up to 4 seats with ready bots, starts 112-card match, auto-drafts bot heroes, and hides opponent cards over WS', async () => {
    const { baseUrl, wsUrl } = await bootLocalSidecarServer();
    const host = await guestLogin(baseUrl, 'unity-host-device-01', 'Chủ Bàn Unity');
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${host.sessionToken}`,
    };

    const createRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ timerPreset: 'FAST' }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { ok: true } & RoomViewerPayload;
    const roomCode = created.roomState.roomCode;
    expect(created.roomState.seats).toHaveLength(1);

    // Reject out-of-range targetPlayerCount
    const badRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/fill-bots`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ targetPlayerCount: 3 }),
    });
    expect(badRes.status).toBe(400);

    // Fill room to 4 seats with ready bots
    const fillRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/fill-bots`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ targetPlayerCount: 4 }),
    });
    expect(fillRes.status).toBe(200);
    const filled = (await fillRes.json()) as { ok: true } & RoomViewerPayload;
    expect(filled.roomState.seats).toHaveLength(4);
    expect(filled.roomState.seats.slice(1).every((s) => s.isBotTakeover && s.isReady)).toBe(true);

    // Connect human via WebSocket
    const ws = await openTestWs(wsUrl);
    try {
      ws.sendJson({ type: 'AUTH', sessionToken: host.sessionToken, actionLogDeltas: true });
      await ws.waitFor((m) => m.type === 'AUTH_OK');
      ws.sendJson({ type: 'SUBSCRIBE_ROOM', roomCode });
      const subMsg = await ws.waitFor((m) => m.type === 'ROOM_STATE');

      // Start 112-card match
      const startRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      expect(startRes.status).toBe(200);
      const started = (await startRes.json()) as { ok: true } & RoomViewerPayload;
      expect(started.playerView?.enabledPacks).toContain('cuu_chau_core');
      expect(started.playerView?.players.filter((p) => p.isBotTakeover)).toHaveLength(3);

      // Check initial start snapshot OR wait until human hero candidates become available
      const hasHumanDraftReady = (pv: RoomViewerPayload['playerView'] | undefined | null): boolean => {
        if (!pv?.heroDraft) return false;
        const me = pv.players[pv.viewerSeatIndex];
        return Boolean(pv.heroDraft.myCandidates.length > 0 && !pv.heroDraft.mySelectedHero && !me?.heroId);
      };

      let myHeroId = hasHumanDraftReady(started.playerView)
        ? started.playerView!.heroDraft!.myCandidates[0]!
        : null;

      if (!myHeroId) {
        void subMsg;
        const draftMsg = await ws.waitFor((m) => {
          if (m.type !== 'ROOM_STATE') return false;
          const pv = m.playerView as RoomViewerPayload['playerView'];
          return hasHumanDraftReady(pv);
        }, 6000);
        const draftView = draftMsg.playerView as NonNullable<RoomViewerPayload['playerView']>;
        myHeroId = draftView.heroDraft!.myCandidates[0]!;
      }

      ws.sendJson({ type: 'SELECT_HERO', roomCode, heroId: myHeroId });

      // Wait until all 3 bots also finish hero selection and match enters live combat (112-card deck)
      const combatMsg = await ws.waitFor((m) => {
        if (m.type !== 'ROOM_STATE') return false;
        const pv = m.playerView as RoomViewerPayload['playerView'];
        return Boolean(pv && pv.turnPhase !== 'HERO_SELECT' && pv.drawPileCount > 0);
      }, 8000);
      const combatView = combatMsg.playerView as NonNullable<RoomViewerPayload['playerView']>;
      expect(combatView.players.every((p) => p.heroId !== null)).toBe(true);
      // Verify server security projection exposes our handCards while nulling opponents' handCards
      const mySeat = combatView.players[combatView.viewerSeatIndex]!;
      expect(mySeat.handCards?.length).toBeGreaterThanOrEqual(4);
      for (const p of combatView.players) {
        if (p.seatIndex !== combatView.viewerSeatIndex) {
          expect(p.handCards).toBeNull();
        }
      }
    } finally {
      await ws.close();
    }
  });

  it('rejects non-host fill-bots and deletes bot-only room cleanly when host leaves lobby', async () => {
    const { baseUrl } = await bootLocalSidecarServer();
    const host = await guestLogin(baseUrl, 'unity-host-device-02', 'Chủ Bàn');
    const guest = await guestLogin(baseUrl, 'unity-guest-device-02', 'Khách');

    const createRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${host.sessionToken}` },
      body: JSON.stringify({}),
    });
    const created = (await createRes.json()) as RoomViewerPayload;
    const roomCode = created.roomState.roomCode;

    await fetch(`${baseUrl}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.sessionToken}` },
      body: JSON.stringify({ roomCode }),
    });

    const denied = await fetch(`${baseUrl}/api/rooms/${roomCode}/fill-bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.sessionToken}` },
      body: JSON.stringify({ targetPlayerCount: 4 }),
    });
    expect(denied.status).toBe(403);

    await fetch(`${baseUrl}/api/rooms/${roomCode}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.sessionToken}` },
      body: JSON.stringify({}),
    });

    const fillOk = await fetch(`${baseUrl}/api/rooms/${roomCode}/fill-bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${host.sessionToken}` },
      body: JSON.stringify({ targetPlayerCount: 5 }),
    });
    expect(fillOk.status).toBe(200);

    const leaveHost = await fetch(`${baseUrl}/api/rooms/${roomCode}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${host.sessionToken}` },
      body: JSON.stringify({}),
    });
    const leftData = (await leaveHost.json()) as { ok: true; deleted: boolean };
    expect(leftData.deleted).toBe(true);
  });
});
