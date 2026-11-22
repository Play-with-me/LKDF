import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  createStandard108Deck,
  type CardInstance,
  type HeroId,
  type MasterGameState,
  type PlayerCombatState,
  type RefereeAuditEntry,
  type UserProfile,
} from '@lkdf/shared';
import type { GoogleOAuthProvider } from '../../src/auth/googleProvider.js';
import type { GoogleIdentityInput } from '../../src/persistence/index.js';
import type { RoomViewerPayload } from '../../src/rooms/index.js';
import { createServer, type ServerInstance } from '../../src/server.js';

function createMockGoogleProvider(): GoogleOAuthProvider {
  return {
    isConfigured: true,
    buildAuthorizeUrl({ state, redirectUri }) {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', redirectUri);
      return url.toString();
    },
    async exchangeCodeForIdentity({ code }): Promise<GoogleIdentityInput> {
      return {
        googleSub: `ref-sub-${code}`,
        email: `${code}@example.com`,
        displayName: `Kỳ thủ ${code.toUpperCase()}`,
        avatarUrl: `https://example.com/${code}.png`,
      };
    },
  };
}

interface WsClientHandle {
  readonly socket: WebSocket;
  waitFor(
    predicate: (msg: Record<string, unknown>) => boolean,
    timeoutMs?: number,
  ): Promise<Record<string, unknown>>;
  sendJson(payload: unknown): void;
  close(): Promise<void>;
}

async function openWsClient(wsUrl: string): Promise<WsClientHandle> {
  const socket = new WebSocket(wsUrl);
  const waiters: Array<{
    predicate: (msg: Record<string, unknown>) => boolean;
    resolve: (msg: Record<string, unknown>) => void;
    reject: (err: Error) => void;
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
      parsed = { raw: raw.toString() };
    }
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const waiter = waiters[i]!;
      if (waiter.predicate(parsed)) {
        clearTimeout(waiter.timer);
        waiters.splice(i, 1);
        waiter.resolve(parsed);
      }
    }
  });

  return {
    socket,
    waitFor(predicate, timeoutMs = 6000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Hết thời gian chờ WebSocket (${timeoutMs}ms).`));
        }, timeoutMs);
        waiters.push({ predicate, resolve, reject, timer });
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

async function loginPlayer(
  srv: ServerInstance,
  codeKey: string,
): Promise<{ readonly token: string; readonly profile: UserProfile }> {
  const start = await srv.app.inject({
    method: 'POST',
    url: '/api/auth/google/start',
    payload: {},
  });
  const started = start.json<{
    authSessionId: string;
    pollSecret: string;
    authUrl: string;
  }>();
  const state = new URL(started.authUrl).searchParams.get('state') ?? '';
  await srv.app.inject({
    method: 'GET',
    url: `/api/auth/google/callback?code=${encodeURIComponent(codeKey)}&state=${encodeURIComponent(state)}`,
  });
  const completed = (
    await srv.app.inject({
      method: 'GET',
      url: `/api/auth/google/status/${started.authSessionId}`,
      headers: { 'x-auth-poll-secret': started.pollSecret },
    })
  ).json<{ sessionToken: string; profile: UserProfile }>();
  return { token: completed.sessionToken, profile: completed.profile };
}

function buildDeterministicPlayState(
  baseMaster: MasterGameState,
  seatHands: Record<number, readonly CardInstance[]>,
): MasterGameState {
  const deck = createStandard108Deck(() => 0.3);
  const allThiems = deck.filter((c) => c.cardKey === 'thiem');
  const topDraw = allThiems.slice(2, 6);
  const usedIds = new Set<string>([
    ...Object.values(seatHands).flat().map((c) => c.id),
    ...topDraw.map((c) => c.id),
  ]);
  const cleanDeck = [
    ...topDraw,
    ...deck.filter((c) => !usedIds.has(c.id)),
  ];
  const heroes: readonly HeroId[] = ['liu_bei', 'lu_meng', 'zhang_fei', 'zhao_yun'];

  const players: PlayerCombatState[] = baseMaster.players.map((p, idx) => ({
    ...p,
    heroId: heroes[idx]!,
    hp: 4,
    maxHp: idx === 0 ? 5 : 4,
    alive: true,
    handCards: [...(seatHands[p.seatIndex] ?? [])],
    equipments: {
      weapon: null,
      armor: null,
      plusOneHorse: null,
      minusOneHorse: null,
    },
    delayedScrolls: [],
    isBotTakeover: false,
    autoSkipNullification: false,
  }));

  return {
    ...baseMaster,
    roundNumber: 1,
    peacefulFirstRound: false,
    currentTurnSeat: 0,
    turnPhase: 'PLAY',
    heroDraft: {
      stage: 'COMPLETED',
      lordSeatIndex: 0,
      remainingPool: [],
      candidatesBySeat: {},
      selectedBySeat: Object.fromEntries(players.map((p) => [p.seatIndex, p.heroId!])),
    },
    drawPile: cleanDeck,
    discardPile: [],
    players,
    interruptStack: [],
    pendingEffects: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
  };
}

describe('Bước 3.2 — Bảng Trọng Tài 4 Nút (Audit Log) & Chuyển Quyền 30s Chủ Phòng Mất Mạng', () => {
  const activeServers: ServerInstance[] = [];
  const openClients: WsClientHandle[] = [];

  afterEach(async () => {
    while (openClients.length > 0) {
      const c = openClients.pop();
      if (c) await c.close();
    }
    while (activeServers.length > 0) {
      const srv = activeServers.pop();
      if (srv) await srv.app.close();
    }
  });

  async function setupStartedRoom(srv: ServerInstance) {
    const address = await srv.app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = address.replace(/^http/, 'ws') + '/ws';

    const p0 = await loginPlayer(srv, 'r0');
    const p1 = await loginPlayer(srv, 'r1');
    const p2 = await loginPlayer(srv, 'r2');
    const p3 = await loginPlayer(srv, 'r3');
    const accounts = [p0, p1, p2, p3];

    const created = (
      await srv.app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: { authorization: `Bearer ${p0.token}` },
        payload: { timerPreset: 'STANDARD' },
      })
    ).json<RoomViewerPayload>();
    const roomCode = created.roomState.roomCode;

    for (const acc of [p1, p2, p3]) {
      await srv.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${acc.token}` },
        payload: { roomCode },
      });
    }

    const sockets: WsClientHandle[] = [];
    for (const acc of accounts) {
      const ws = await openWsClient(wsUrl);
      openClients.push(ws);
      const authOk = ws.waitFor((m) => m.type === 'AUTH_OK');
      const sync = ws.waitFor((m) => m.type === 'ROOM_STATE');
      ws.sendJson({ type: 'AUTH', sessionToken: acc.token });
      await authOk;
      await sync;
      sockets.push(ws);
    }

    for (const guest of [p1, p2, p3]) {
      const response = await srv.app.inject({
        method: 'PATCH',
        url: `/api/rooms/${roomCode}/ready`,
        headers: { authorization: `Bearer ${guest.token}` },
        payload: { isReady: true },
      });
      expect(response.statusCode).toBe(200);
    }

    const startBroadcasts = sockets.map((ws) =>
      ws.waitFor(
        (m) =>
          m.type === 'ROOM_STATE' &&
          (m.roomState as { status?: string })?.status === 'IN_GAME',
      ),
    );
    await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${p0.token}` },
    });
    await Promise.all(startBroadcasts);

    return { wsUrl, roomCode, accounts, sockets };
  }

  it('thực thi đủ 4 nút Trọng Tài (PAUSE/RESUME, UNDO_ONE_STEP, SKIP_PHASE, ABORT_MATCH) kèm refereeAuditLog công khai', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'referee-4buttons-jwt-secret-32chars!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 40,
        simulatedNullificationMaxMs: 50,
        botActionDelayMs: 40,
        timerScale: 0.025, // 45s play -> 1125ms, 15s reaction -> 375ms
      },
    });
    activeServers.push(srv);

    const { roomCode, accounts, sockets } = await setupStartedRoom(srv);
    const deck = createStandard108Deck(() => 0.3);
    const sat0 = deck.find((c) => c.cardKey === 'sat')!;
    const thiem1 = deck.find((c) => c.cardKey === 'thiem')!;

    const baseMaster = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    const prepared = buildDeterministicPlayState(baseMaster, {
      0: [sat0],
      1: [thiem1],
      2: [],
      3: [],
    });

    const syncPrepared = sockets.map((ws) =>
      ws.waitFor((m) => m.type === 'ROOM_STATE' && m.event === 'COMMIT_STEP'),
    );
    await srv.roomManager.commitMatchStep(roomCode, prepared);
    await Promise.all(syncPrepared);

    // 0. Chặn người không phải Trọng Tài bấm Bảng Trọng Tài (cả HTTP & WS)
    const httpDeny = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/referee`,
      headers: { authorization: `Bearer ${accounts[1]!.token}` },
      payload: { actionType: 'PAUSE' },
    });
    expect(httpDeny.statusCode).toBe(403);
    expect(httpDeny.json<{ code: string }>().code).toBe('ONLY_ACTING_HOST');

    const wsDenyPromise = sockets[1]!.waitFor((m) => m.type === 'ACTION_ERROR');
    sockets[1]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'PAUSE',
    });
    expect((await wsDenyPromise).code).toBe('ONLY_ACTING_HOST');

    // 1. Nút PAUSE: đóng băng đồng hồ (> thời hạn 360ms ban đầu cũng không bị tự hết giờ)
    const pauseBroadcast = sockets[1]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_PAUSE',
    );
    sockets[0]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'PAUSE',
    });
    const pausedPacket = await pauseBroadcast;
    expect((pausedPacket.roomState as RoomViewerPayload['roomState']).isTimerPaused).toBe(true);
    expect(pausedPacket.pausedRemainingMs).toBeGreaterThan(0);

    // Thử đánh bài lúc đang tạm dừng -> bị chặn
    const blockedWhilePaused = sockets[0]!.waitFor((m) => m.type === 'ACTION_ERROR');
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'PLAY_CARD', seatIndex: 0, cardIds: [sat0.id], targetSeats: [1] },
    });
    expect((await blockedWhilePaused).code).toBe('MATCH_PAUSED');

    // Chờ 1250ms (> 1125ms hạn gốc) để chứng minh đồng hồ đã thực sự đóng băng khi PAUSE
    await new Promise((r) => setTimeout(r, 1250));
    const checkFrozen = srv.roomManager.getSnapshotRecord(roomCode)!;
    expect(checkFrozen.roomState.isTimerPaused).toBe(true);
    expect(checkFrozen.masterGameState?.currentTurnSeat).toBe(0);
    expect(checkFrozen.masterGameState?.players[0]?.isBotTakeover).toBe(false);

    // Nút RESUME: khôi phục đồng hồ bình thường
    const resumeBroadcast = sockets[0]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_RESUME',
    );
    sockets[0]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'RESUME',
    });
    const resumedPacket = await resumeBroadcast;
    expect((resumedPacket.roomState as RoomViewerPayload['roomState']).isTimerPaused).toBe(false);
    expect(resumedPacket.phaseDeadlineAt).toBeTruthy();

    // 2. Ghế 0 đánh Sát -> WAIT_DODGE -> Trọng Tài bấm UNDO_ONE_STEP
    const waitDodge = sockets[0]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.playerView as RoomViewerPayload['playerView'])?.activeInterrupt?.kind ===
          'WAIT_DODGE',
    );
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'PLAY_CARD', seatIndex: 0, cardIds: [sat0.id], targetSeats: [1] },
    });
    await waitDodge;

    const undoBroadcast = sockets[0]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_UNDO_ONE_STEP',
    );
    sockets[0]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'UNDO_ONE_STEP',
    });
    const undonePacket = await undoBroadcast;
    const undoneView = undonePacket.playerView as NonNullable<RoomViewerPayload['playerView']>;
    expect(undoneView.activeInterrupt).toBeNull();
    expect(undoneView.turnPhase).toBe('PLAY');
    expect(undoneView.players[0]?.handCards?.some((c) => c.id === sat0.id)).toBe(true);
    // Nhật ký Trọng Tài phải giữ đủ PAUSE, RESUME, UNDO_ONE_STEP sau khi hoàn tác
    expect(undoneView.refereeAuditLog.map((e) => e.actionType)).toEqual([
      'PAUSE',
      'RESUME',
      'UNDO_ONE_STEP',
    ]);

    // 3. Nút SKIP_PHASE: đánh Sát lại -> kẹt chờ Ghế 1 -> Trọng Tài bấm Bỏ qua pha chờ -> giải tỏa pha phản ứng
    const waitDodgeAgain = sockets[0]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.playerView as RoomViewerPayload['playerView'])?.activeInterrupt?.kind ===
          'WAIT_DODGE',
    );
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'PLAY_CARD', seatIndex: 0, cardIds: [sat0.id], targetSeats: [1] },
    });
    await waitDodgeAgain;

    const skipInterruptBroadcast = sockets[0]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_SKIP_PHASE',
    );
    sockets[0]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'SKIP_PHASE',
    });
    const afterSkip = await skipInterruptBroadcast;
    const afterSkipView = afterSkip.playerView as NonNullable<RoomViewerPayload['playerView']>;
    expect(afterSkipView.activeInterrupt).toBeNull();
    expect(afterSkipView.players[1]?.handCount).toBe(0);

    // 4. Nút ABORT_MATCH: Kết thúc ván về phòng chờ, giữ nhật ký công khai, KHÔNG ghi thành tích thắng/thua giả
    const abortOnAll = sockets.map((ws) =>
      ws.waitFor(
        (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_ABORT_MATCH',
      ),
    );
    const httpAbort = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/referee`,
      headers: { authorization: `Bearer ${accounts[0]!.token}` },
      payload: { actionType: 'ABORT_MATCH' },
    });
    expect(httpAbort.statusCode).toBe(200);
    const abortBroadcasts = await Promise.all(abortOnAll);

    for (const pkt of abortBroadcasts) {
      const rs = pkt.roomState as RoomViewerPayload['roomState'];
      const audit = pkt.refereeAuditLog as RefereeAuditEntry[];
      expect(rs.status).toBe('LOBBY');
      expect(pkt.playerView).toBeNull();
      expect(audit.map((a) => a.actionType)).toEqual([
        'PAUSE',
        'RESUME',
        'UNDO_ONE_STEP',
        'SKIP_PHASE',
        'ABORT_MATCH',
      ]);
      expect(audit.every((a) => a.actorUserId === accounts[0]!.profile.userId)).toBe(true);
    }

    const statsAfterAbort = (
      await srv.app.inject({ method: 'GET', url: '/api/stats' })
    ).json<{ summary: { totalDistinctMatches: number } }>();
    expect(statsAfterAbort.summary.totalDistinctMatches).toBe(0);
  });

  it('tự chuyển quyền Trọng Tài (actingHostUserId) sau 30 giây Chủ phòng mất mạng và tự trả lại quyền khi Chủ phòng vào lại', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'host-failover-30s-jwt-secret-32chars!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 40,
        simulatedNullificationMaxMs: 50,
        botActionDelayMs: 60,
        hostFailoverDelayMs: 180, // Rút gọn 30_000ms -> 180ms cho test tự động
      },
    });
    activeServers.push(srv);

    const { wsUrl, roomCode, accounts, sockets } = await setupStartedRoom(srv);

    // Chủ phòng P0 tạm dừng ván đấu rồi đột ngột mất kết nối (chứng minh timer 30s vẫn chạy kể cả khi PAUSE!)
    const pausedSync = sockets[1]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_PAUSE',
    );
    sockets[0]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'PAUSE',
    });
    await pausedSync;

    // Gắn sẵn waiter bắt sự kiện chuyển quyền sau 180ms khi P0 rớt mạng
    const actingTransferredOnP1 = sockets[1]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.roomState as RoomViewerPayload['roomState']).actingHostUserId ===
          accounts[1]!.profile.userId,
      3000,
    );
    const actingTransferredOnP2 = sockets[2]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.roomState as RoomViewerPayload['roomState']).actingHostUserId ===
          accounts[1]!.profile.userId,
      3000,
    );

    await sockets[0]!.close();

    // Ngay lập tức sau khi ngắt (trước 180ms), P1 CHƯA được quyền Trọng Tài
    const earlyResumeAttempt = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/referee`,
      headers: { authorization: `Bearer ${accounts[1]!.token}` },
      payload: { actionType: 'RESUME' },
    });
    expect(earlyResumeAttempt.statusCode).toBe(403);

    // Sau 180ms: quyền Trọng Tài tự chuyển sang P1 (Ghế kế tiếp đang online)
    const [p1FailoverPacket] = await Promise.all([
      actingTransferredOnP1,
      actingTransferredOnP2,
    ]);
    const failoverRoom = p1FailoverPacket.roomState as RoomViewerPayload['roomState'];
    expect(failoverRoom.ownerUserId).toBe(accounts[0]!.profile.userId);
    expect(failoverRoom.actingHostUserId).toBe(accounts[1]!.profile.userId);
    expect(failoverRoom.hostDisconnectedAt).toBeTruthy();

    // P1 (Trọng Tài tạm thời) bấm Tiếp tục (RESUME) thành công
    const p1ResumeBroadcast = sockets[2]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'REFEREE_RESUME',
    );
    sockets[1]!.sendJson({
      type: 'REFEREE_ACTION',
      roomCode,
      actionType: 'RESUME',
    });
    const resumedByP1 = await p1ResumeBroadcast;
    const auditAfterP1 = (resumedByP1.refereeAuditLog as RefereeAuditEntry[]);
    expect(auditAfterP1[auditAfterP1.length - 1]).toMatchObject({
      actorUserId: accounts[1]!.profile.userId,
      actionType: 'RESUME',
    });

    // Nếu Trọng Tài tạm thời P1 cũng mất kết nối -> lập tức chuyển tiếp sang P2 đang online!
    const secondaryFailover = sockets[2]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.roomState as RoomViewerPayload['roomState']).actingHostUserId ===
          accounts[2]!.profile.userId,
      3000,
    );
    await sockets[1]!.close();
    const p2FailoverPacket = await secondaryFailover;
    expect(
      (p2FailoverPacket.roomState as RoomViewerPayload['roomState']).actingHostUserId,
    ).toBe(accounts[2]!.profile.userId);

    // Chủ phòng gốc P0 mở lại app và kết nối lại -> phải nhận lại quyền Trọng Tài ngay lập tức!
    const reclaimedOnP2 = sockets[2]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.roomState as RoomViewerPayload['roomState']).actingHostUserId ===
          accounts[0]!.profile.userId,
    );
    const reconnectedP0 = await openWsClient(wsUrl);
    openClients.push(reconnectedP0);
    const syncP0 = reconnectedP0.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'SYNC_ON_CONNECT',
    );
    reconnectedP0.sendJson({
      type: 'AUTH',
      sessionToken: accounts[0]!.token,
    });

    const [p0SyncPacket, p2NotifyPacket] = await Promise.all([syncP0, reclaimedOnP2]);
    expect(
      (p0SyncPacket.roomState as RoomViewerPayload['roomState']).actingHostUserId,
    ).toBe(accounts[0]!.profile.userId);
    expect(
      (p0SyncPacket.roomState as RoomViewerPayload['roomState']).hostDisconnectedAt,
    ).toBeNull();
    expect(
      (p2NotifyPacket.roomState as RoomViewerPayload['roomState']).actingHostUserId,
    ).toBe(accounts[0]!.profile.userId);

    // P2 không còn quyền Trọng Tài nữa, chỉ P0 mới được kết thúc ván
    const p2Denied = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/referee`,
      headers: { authorization: `Bearer ${accounts[2]!.token}` },
      payload: { actionType: 'ABORT_MATCH' },
    });
    expect(p2Denied.statusCode).toBe(403);

    const p0Abort = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/referee`,
      headers: { authorization: `Bearer ${accounts[0]!.token}` },
      payload: { actionType: 'ABORT_MATCH' },
    });
    expect(p0Abort.statusCode).toBe(200);
  });

  it('mặc định giữ ngưỡng 30 giây (không tự chuyển quyền sớm khi chưa cấu hình rút gọn)', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'default-30s-host-failover-check-key!!',
      },
      googleProvider: createMockGoogleProvider(),
    });
    activeServers.push(srv);

    const { roomCode, accounts, sockets } = await setupStartedRoom(srv);
    const disconnectNotice = sockets[1]!.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'PLAYER_DISCONNECTED',
    );
    await sockets[0]!.close();
    await disconnectNotice;

    await new Promise((r) => setTimeout(r, 200));
    const snap = srv.roomManager.getSnapshotRecord(roomCode)!;
    expect(snap.roomState.actingHostUserId).toBe(accounts[0]!.profile.userId);
    expect(snap.roomState.hostDisconnectedAt).toBeTruthy();
  });
});
