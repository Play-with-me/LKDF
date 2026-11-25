import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  createStandard108Deck,
  type CardInstance,
  type HeroId,
  type MasterGameState,
  type PlayerCombatState,
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
        googleSub: `ws-sub-${code}`,
        email: `${code}@example.com`,
        displayName: `Kỳ thủ ${code.toUpperCase()}`,
        avatarUrl: `https://example.com/${code}.png`,
      };
    },
  };
}

interface WsClientHandle {
  readonly socket: WebSocket;
  readonly messages: Record<string, unknown>[];
  waitFor(
    predicate: (msg: Record<string, unknown>) => boolean,
    timeoutMs?: number,
  ): Promise<Record<string, unknown>>;
  sendJson(payload: unknown): void;
  close(): Promise<void>;
}

async function openWsClient(wsUrl: string): Promise<WsClientHandle> {
  const socket = new WebSocket(wsUrl);
  const messages: Record<string, unknown>[] = [];
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
    const text = raw.toString();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { raw: text };
    }
    messages.push(parsed);

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
    messages,
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
  overrides: {
    readonly seatHands: Record<number, readonly CardInstance[]>;
    readonly currentTurnSeat?: number;
    readonly seatHeroes?: Readonly<Record<number, HeroId>>;
    readonly topDrawCards?: readonly CardInstance[];
  },
): MasterGameState {
  const topCards = overrides.topDrawCards ?? [];
  const usedIds = new Set<string>([
    ...Object.values(overrides.seatHands).flat().map((c) => c.id),
    ...topCards.map((c) => c.id),
  ]);
  const deck = [
    ...topCards,
    ...createStandard108Deck(() => 0.5).filter((c) => !usedIds.has(c.id)),
  ];

  const players: PlayerCombatState[] = baseMaster.players.map((p, idx) => ({
    ...p,
    heroId:
      overrides.seatHeroes?.[p.seatIndex] ??
      p.heroId ??
      (['liu_bei', 'guan_yu', 'zhang_fei', 'zhao_yun'][idx] as HeroId),
    hp: 4,
    maxHp: idx === 0 ? 5 : 4,
    alive: true,
    handCards: [...(overrides.seatHands[p.seatIndex] ?? [])],
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
    currentTurnSeat: overrides.currentTurnSeat ?? 0,
    turnPhase: 'PLAY',
    heroDraft: {
      stage: 'COMPLETED',
      lordSeatIndex: 0,
      remainingPool: [],
      candidatesBySeat: {},
      selectedBySeat: Object.fromEntries(
        players.map((p) => [p.seatIndex, p.heroId!]),
      ),
    },
    drawPile: deck,
    discardPile: [],
    players,
    interruptStack: [],
    pendingEffects: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
  };
}

describe('Bước 3.1 — Điều phối WebSocket, Nhịp Vô Giải giả lập, Rớt mạng Máy đánh hộ & Tự kết nối lại', () => {
  const activeServers: ServerInstance[] = [];
  const openClients: WsClientHandle[] = [];

  afterEach(async () => {
    while (openClients.length > 0) {
      const c = openClients.pop();
      if (c) {
        await c.close();
      }
    }
    while (activeServers.length > 0) {
      const srv = activeServers.pop();
      if (srv) {
        await srv.app.close();
      }
    }
  });

  async function setupFourPlayerRoomAndSockets(srv: ServerInstance) {
    const address = await srv.app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = address.replace(/^http/, 'ws') + '/ws';

    const p0 = await loginPlayer(srv, 'w0');
    const p1 = await loginPlayer(srv, 'w1');
    const p2 = await loginPlayer(srv, 'w2');
    const p3 = await loginPlayer(srv, 'w3');
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
      const authOkPromise = ws.waitFor((m) => m.type === 'AUTH_OK');
      const syncPromise = ws.waitFor((m) => m.type === 'ROOM_STATE');
      ws.sendJson({ type: 'AUTH', sessionToken: acc.token });
      await authOkPromise;
      await syncPromise;
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

    const startSyncPromises = sockets.map((ws) =>
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
    const startViews = await Promise.all(startSyncPromises);

    return { wsUrl, roomCode, accounts, sockets, startViews };
  }

  it('cấp PlayerViewState riêng qua WebSocket (không rò rỉ bài úp/thân phận) và giữ nhịp Vô Giải giả lập 2.0s–3.5s', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'ws-nullify-real-delay-secret-32chars!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 2050,
        simulatedNullificationMaxMs: 2150,
        botActionDelayMs: 40,
      },
    });
    activeServers.push(srv);

    const { roomCode, accounts, sockets } = await setupFourPlayerRoomAndSockets(srv);

    const baseMaster = srv.roomManager.getSnapshotRecord(roomCode)?.masterGameState;
    expect(baseMaster).toBeTruthy();

    const deck = createStandard108Deck(() => 0.1);
    const voTrungCard = deck.find((c) => c.cardKey === 'vo_trung_sinh_huu')!;
    const satCard = deck.find((c) => c.cardKey === 'sat')!;
    const daoCard = deck.find((c) => c.cardKey === 'dao')!;
    const thiemCard = deck.find((c) => c.cardKey === 'thiem')!;

    // Thiết lập tay bài: Không ai cầm Vô Giải Khả Kích -> kích hoạt dừng giả lập >= 2050ms
    const prepared = buildDeterministicPlayState(baseMaster!, {
      seatHands: {
        0: [voTrungCard],
        1: [thiemCard],
        2: [satCard],
        3: [daoCard],
      },
      currentTurnSeat: 0,
    });

    const syncAfterCommitPromises = sockets.map((ws) =>
      ws.waitFor((m) => m.type === 'ROOM_STATE' && m.event === 'COMMIT_STEP'),
    );
    await srv.roomManager.commitMatchStep(roomCode, prepared);
    const viewPackets = await Promise.all(syncAfterCommitPromises);

    // Kiểm tra bảo mật tuyệt đối từng góc nhìn qua WebSocket
    viewPackets.forEach((packet, idx) => {
      const pv = packet.playerView as RoomViewerPayload['playerView'];
      expect(pv?.viewerSeatIndex).toBe(idx);
      expect(pv?.players[idx]?.handCards).toHaveLength(1);
      for (let other = 0; other < 4; other += 1) {
        if (other !== idx) {
          expect(pv?.players[other]?.handCards).toBeNull();
        }
      }
    });

    // Từ chối nếu máy khách gửi hành động giả mạo ghế khác hoặc tự đóng giả lập
    const cheatErrPromise = sockets[1]!.waitFor((m) => m.type === 'ACTION_ERROR');
    sockets[1]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'PLAY_CARD', seatIndex: 0, cardIds: [voTrungCard.id] },
    });
    const cheatErr = await cheatErrPromise;
    expect(cheatErr.code).toBe('UNAUTHORIZED_SEAT');

    const forgedSimPromise = sockets[0]!.waitFor((m) => m.type === 'ACTION_ERROR');
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'RESOLVE_SIMULATED_NULLIFICATION' },
    });
    const forgedErr = await forgedSimPromise;
    expect(forgedErr.code).toBe('INVALID_WS_MESSAGE');

    // Ghế 0 đánh Vô Trung Sinh Hữu -> mở nhịp chờ Vô Giải (không lộ isSimulatedDelay hay eligibleSeats)
    const nullifyWindowPromises = sockets.map((ws) =>
      ws.waitFor(
        (m) =>
          m.type === 'ROOM_STATE' &&
          (m.playerView as RoomViewerPayload['playerView'])?.activeInterrupt?.kind ===
            'WAIT_NULLIFICATION',
      ),
    );
    const playStartedAt = Date.now();
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [voTrungCard.id],
      },
    });
    const nullifyPackets = await Promise.all(nullifyWindowPromises);

    for (const pkt of nullifyPackets) {
      const jsonText = JSON.stringify(pkt);
      expect(jsonText).not.toContain('isSimulatedDelay');
      expect(jsonText).not.toContain('eligibleSeats');
      expect(jsonText).not.toContain('passedSeats');
    }

    // Ghế 1 (không có Vô Giải) bấm Bỏ qua -> KHÔNG được làm kết thúc sớm hay báo lỗi
    const silentAckPromise = sockets[1]!.waitFor(
      (m) => m.type === 'ACTION_ACK' && m.actionType === 'RESPOND_NULLIFICATION',
    );
    sockets[1]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'RESPOND_NULLIFICATION',
        seatIndex: 1,
        cardId: null,
      },
    });
    const silentAck = await silentAckPromise;
    expect(silentAck.silentPass).toBe(true);

    // Chờ máy chủ tự giải phóng nhịp giả lập sau >= 2000ms -> Ghế 0 rút 2 lá!
    const resolvedPromise = sockets[0]!.waitFor(
      (m) => {
        const pv = m.playerView as RoomViewerPayload['playerView'];
        return (
          m.type === 'ROOM_STATE' &&
          pv?.activeInterrupt === null &&
          (pv?.players[0]?.handCards?.length ?? 0) === 2
        );
      },
      5000,
    );
    await resolvedPromise;
    const elapsedMs = Date.now() - playStartedAt;
    expect(elapsedMs).toBeGreaterThanOrEqual(1950);
    expect(accounts[0]!.profile.userId).toBeTruthy();
  });

  it('mô phỏng rớt mạng giữa pha phản ứng (WAIT_DODGE) -> tự chuyển Máy đánh hộ -> Kết nối lại lấy đúng ghế và tay bài', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'ws-disconnect-reclaim-secret-32chars!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 50,
        simulatedNullificationMaxMs: 60,
        botActionDelayMs: 60,
        disconnectBotTakeoverGraceMs: 0,
      },
    });
    activeServers.push(srv);

    const { wsUrl, roomCode, accounts, sockets } =
      await setupFourPlayerRoomAndSockets(srv);

    const baseMaster = srv.roomManager.getSnapshotRecord(roomCode)?.masterGameState;
    const deck = createStandard108Deck(() => 0.2);
    const allThiems = deck.filter((c) => c.cardKey === 'thiem');
    const sat0 = deck.find((c) => c.cardKey === 'sat')!;
    const thiem1 = allThiems[0]!;
    const thiemDrawA = allThiems[1]!;
    const thiemDrawB = allThiems[2]!;
    const thiemDrawC = allThiems[3]!;
    const thiemDrawD = allThiems[4]!;
    const dao1 = deck.find((c) => c.cardKey === 'dao')!;
    const dao2 = deck.filter((c) => c.cardKey === 'dao')[1]!;

    const prepared = buildDeterministicPlayState(baseMaster!, {
      seatHands: {
        0: [sat0],
        1: [thiem1, dao1],
        2: [dao2],
        3: [],
      },
      seatHeroes: {
        0: 'liu_bei',
        1: 'lu_meng',
        2: 'zhang_fei',
        3: 'zhao_yun',
      },
      topDrawCards: [thiemDrawA, thiemDrawB, thiemDrawC, thiemDrawD],
      currentTurnSeat: 0,
    });

    const syncPreparedPromises = sockets.map((ws) =>
      ws.waitFor((m) => m.type === 'ROOM_STATE' && m.event === 'COMMIT_STEP'),
    );
    await srv.roomManager.commitMatchStep(roomCode, prepared);
    await Promise.all(syncPreparedPromises);

    // Ghế 0 đánh Sát vào Ghế 1 -> Ghế 1 rơi vào pha phản ứng WAIT_DODGE
    const dodgePromptOnSeat0 = sockets[0]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.playerView as RoomViewerPayload['playerView'])?.activeInterrupt?.kind ===
          'WAIT_DODGE',
    );
    const dodgePromptOnSeat1 = sockets[1]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.playerView as RoomViewerPayload['playerView'])?.activeInterrupt?.kind ===
          'WAIT_DODGE',
    );
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [sat0.id],
        targetSeats: [1],
      },
    });
    await Promise.all([dodgePromptOnSeat0, dodgePromptOnSeat1]);

    // Ghế 1 ĐỘT NGỘT RỚT MẠNG giữa pha WAIT_DODGE!
    const takeoverBroadcastOnSeat0 = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      const rs = m.roomState as RoomViewerPayload['roomState'];
      return (
        rs.seats[1]?.connectionStatus === 'DISCONNECTED' &&
        rs.seats[1]?.isBotTakeover === true &&
        pv?.players[1]?.isBotTakeover === true
      );
    });
    const botResolvedDodgeOnSeat0 = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return (
        m.event === 'BOT_ACTION' &&
        pv?.activeInterrupt === null &&
        pv?.players[1]?.hp === 4 &&
        pv?.players[1]?.handCount === 1
      );
    });

    await sockets[1]!.close();
    await takeoverBroadcastOnSeat0;
    await botResolvedDodgeOnSeat0;

    // Ghế 0 kết thúc lượt -> chuyển sang lượt của Ghế 1 (vẫn đang mất mạng, Máy tự rút & tự đánh/bỏ bài hết lượt sang Ghế 2)
    const seat2TurnStartedPromise = sockets[2]!.waitFor(
      (m) =>
        m.type === 'ROOM_STATE' &&
        (m.playerView as RoomViewerPayload['playerView'])?.currentTurnSeat === 2 &&
        (m.playerView as RoomViewerPayload['playerView'])?.turnPhase === 'DRAW',
      6000,
    );
    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: { type: 'END_PLAY_PHASE', seatIndex: 0 },
    });
    await seat2TurnStartedPromise;
    const seat2CanPlay = sockets[2]!.waitFor((m) =>
      m.type === 'ROOM_STATE' &&
      (m.playerView as RoomViewerPayload['playerView'])?.currentTurnSeat === 2 &&
      (m.playerView as RoomViewerPayload['playerView'])?.turnPhase === 'PLAY',
    );
    sockets[2]!.sendJson({
      type: 'GAME_ACTION', roomCode, action: { type: 'DRAW_CARDS', seatIndex: 2 },
    });
    await seat2CanPlay;

    // Ghế 1 MỞ LẠI APP & KẾT NỐI LẠI -> phải tự nhận lại đúng ghế 1, hết trạng thái Bot takeover, lấy đúng tay bài còn lại!
    const reconnectedWs1 = await openWsClient(wsUrl);
    openClients.push(reconnectedWs1);

    const reclaimNoticeOnSeat0 = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const rs = m.roomState as RoomViewerPayload['playerView'] extends never
        ? never
        : RoomViewerPayload['roomState'];
      return (
        rs.seats[1]?.connectionStatus === 'ONLINE' &&
        rs.seats[1]?.isBotTakeover === false
      );
    });
    const syncOnReconnect = reconnectedWs1.waitFor(
      (m) => m.type === 'ROOM_STATE' && m.event === 'SYNC_ON_CONNECT',
    );
    reconnectedWs1.sendJson({
      type: 'AUTH',
      sessionToken: accounts[1]!.token,
    });

    const reconnectPacket = await syncOnReconnect;
    await reclaimNoticeOnSeat0;

    const restoredView = reconnectPacket.playerView as NonNullable<
      RoomViewerPayload['playerView']
    >;
    const restoredRoom = reconnectPacket.roomState as RoomViewerPayload['roomState'];

    expect(restoredView.viewerSeatIndex).toBe(1);
    expect(restoredRoom.seats[1]?.userId).toBe(accounts[1]!.profile.userId);
    expect(restoredRoom.seats[1]?.connectionStatus).toBe('ONLINE');
    expect(restoredRoom.seats[1]?.isBotTakeover).toBe(false);
    expect(restoredView.players[1]?.isBotTakeover).toBe(false);
    expect(restoredView.players[1]?.handCards).not.toBeNull();
    expect(restoredView.players[1]?.handCards?.some((c) => c.id === dao1.id)).toBe(
      true,
    );
    expect(restoredView.players[0]?.handCards).toBeNull();

    // Kiểm tra Ghế 1 có thể gửi lệnh trở lại bình thường ngay sau khi nhận lại ghế
    const toggleAck = reconnectedWs1.waitFor(
      (m) =>
        m.type === 'ACTION_ACK' &&
        m.actionType === 'SET_AUTO_SKIP_NULLIFICATION',
    );
    reconnectedWs1.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'SET_AUTO_SKIP_NULLIFICATION',
        seatIndex: 1,
        enabled: true,
      },
    });
    await toggleAck;
  });

  it('khi hết giờ đồng hồ pha -> tự chuyển Máy đánh hộ (isBotTakeover = true) và đi tiếp lượt không bị treo', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'ws-timeout-takeover-secret-32chars!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 30,
        simulatedNullificationMaxMs: 40,
        botActionDelayMs: 30,
        timerScale: 0.004,
      },
    });
    activeServers.push(srv);

    const { roomCode, sockets } = await setupFourPlayerRoomAndSockets(srv);
    const baseMaster = srv.roomManager.getSnapshotRecord(roomCode)?.masterGameState;
    const prepared = buildDeterministicPlayState(baseMaster!, {
      seatHands: { 0: [], 1: [], 2: [], 3: [] },
      currentTurnSeat: 0,
    });

    const timeoutAdvancePromise = sockets[1]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return (
        pv?.players[0]?.isBotTakeover === true &&
        pv?.currentTurnSeat === 1
      );
    }, 5000);

    // Đẩy vào pha PLAY của Ghế 0 và cố tình đứng yên không gửi nước đi -> đồng hồ hết hạn sau ~180ms!
    await srv.roomManager.commitMatchStep(roomCode, prepared);
    const nextStatePacket = await timeoutAdvancePromise;

    const pv = nextStatePacket.playerView as NonNullable<RoomViewerPayload['playerView']>;
    expect(pv.players[0]?.isBotTakeover).toBe(true);
    expect(pv.currentTurnSeat).toBe(1);
    expect(pv.actionLog.some((log) => log.includes('hết giờ'))).toBe(true);
  });
});
