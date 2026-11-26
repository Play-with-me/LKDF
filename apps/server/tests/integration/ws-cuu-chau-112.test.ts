import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  createCuuChau112Deck,
  isCuuChauRuleset,
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
        googleSub: `cc112-sub-${code}`,
        email: `${code}@example.com`,
        displayName: `Hiệp khách ${code.toUpperCase()}`,
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

function countAllCardsInState(state: MasterGameState): number {
  let total = state.drawPile.length + state.discardPile.length + (state.harvestPool?.length ?? 0);
  for (const p of state.players) {
    total += p.handCards.length + p.delayedScrolls.length;
    if (p.equipments.weapon) total += 1;
    if (p.equipments.armor) total += 1;
    if (p.equipments.plusOneHorse) total += 1;
    if (p.equipments.minusOneHorse) total += 1;
  }
  return total;
}

describe('Bước 1 — Đồng bộ Cửu Châu 112 Lá trên Phòng Online & Vá Bot Hóa Giải đồng minh', () => {
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

  async function setupOnlineFourPlayers(srv: ServerInstance) {
    const address = await srv.app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = address.replace(/^http/, 'ws') + '/ws';

    const accounts = await Promise.all([
      loginPlayer(srv, 'c0'),
      loginPlayer(srv, 'c1'),
      loginPlayer(srv, 'c2'),
      loginPlayer(srv, 'c3'),
    ]);

    const created = (
      await srv.app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: { authorization: `Bearer ${accounts[0]!.token}` },
        payload: { timerPreset: 'STANDARD' },
      })
    ).json<RoomViewerPayload>();
    const roomCode = created.roomState.roomCode;

    for (const acc of accounts.slice(1)) {
      const joinRes = await srv.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${acc.token}` },
        payload: { roomCode },
      });
      expect(joinRes.statusCode).toBe(200);
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

    for (const guest of accounts.slice(1)) {
      const readyRes = await srv.app.inject({
        method: 'PATCH',
        url: `/api/rooms/${roomCode}/ready`,
        headers: { authorization: `Bearer ${guest.token}` },
        payload: { isReady: true },
      });
      expect(readyRes.statusCode).toBe(200);
    }

    const startSync = sockets.map((ws) =>
      ws.waitFor(
        (m) =>
          m.type === 'ROOM_STATE' &&
          (m.roomState as { status?: string })?.status === 'IN_GAME',
      ),
    );
    const startRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${accounts[0]!.token}` },
    });
    expect(startRes.statusCode).toBe(200);
    const startPackets = await Promise.all(startSync);

    return { roomCode, accounts, sockets, startPackets };
  }

  it('mở phòng Online 4P -> startMatch tự bật cuu_chau_core và chia đúng bộ 112 lá Cửu Châu', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'ws-cuu-chau-112-default-room-secret!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        timerScale: 0.01,
        simulatedNullificationMinMs: 40,
        simulatedNullificationMaxMs: 50,
        botActionDelayMs: 40,
      },
    });
    activeServers.push(srv);

    const { roomCode, accounts, sockets, startPackets } =
      await setupOnlineFourPlayers(srv);

    for (const pkt of startPackets) {
      const pv = pkt.playerView as NonNullable<RoomViewerPayload['playerView']>;
      expect(pv.enabledPacks).toContain('cuu_chau_core');
      expect(pv.rulesetVersion).toBe('2.0.0');
    }

    const snapAtDraft = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    expect(isCuuChauRuleset(snapAtDraft)).toBe(true);
    const lordSeat = snapAtDraft.heroDraft!.lordSeatIndex;
    const lordPick = snapAtDraft.heroDraft!.candidatesBySeat[lordSeat]![0]!;

    const lordHeroRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/select-hero`,
      headers: { authorization: `Bearer ${accounts[lordSeat]!.token}` },
      payload: { heroId: lordPick },
    });
    expect(lordHeroRes.statusCode).toBe(200);

    const combatStartedOnSeat0 = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return Boolean(pv && pv.turnPhase !== 'HERO_SELECT');
    }, 5000);

    const afterLordSnap = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    for (let seat = 0; seat < 4; seat += 1) {
      if (seat === lordSeat) continue;
      const pick = afterLordSnap.heroDraft!.candidatesBySeat[seat]![0]!;
      const res = await srv.app.inject({
        method: 'POST',
        url: `/api/rooms/${roomCode}/select-hero`,
        headers: { authorization: `Bearer ${accounts[seat]!.token}` },
        payload: { heroId: pick },
      });
      expect(res.statusCode).toBe(200);
    }

    await combatStartedOnSeat0;

    const combatMaster = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    expect(combatMaster.enabledPacks).toContain('cuu_chau_core');
    expect(countAllCardsInState(combatMaster)).toBe(112);

    const allCards: CardInstance[] = [
      ...combatMaster.drawPile,
      ...combatMaster.discardPile,
      ...combatMaster.players.flatMap((p) => p.handCards),
    ];
    expect(allCards).toHaveLength(112);
    expect(allCards.every((c) => c.id.startsWith('cc_'))).toBe(true);
    for (const newKey of [
      'pha_giap_tram',
      'chan_khi_ho_the',
      'kinh_loi_chan',
      'hoan_anh_giap',
      'tu_khi_hoan',
    ]) {
      expect(allCards.some((c) => c.cardKey === newKey)).toBe(true);
    }
  });

  it('Bot đánh hộ đồng minh KHÔNG tự Hóa Giải Tụ Khí Quyết của Minh Chủ nhưng VẪN Hóa Giải Phá Trận Chưởng từ kẻ địch', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'ws-cuu-chau-bot-nullify-ally-secret!',
      },
      googleProvider: createMockGoogleProvider(),
      runtime: {
        simulatedNullificationMinMs: 90,
        simulatedNullificationMaxMs: 110,
        nullificationBotPassMinMs: 25,
        botActionDelayMs: 25,
        disconnectBotTakeoverGraceMs: 0,
      },
    });
    activeServers.push(srv);

    const { roomCode, sockets } = await setupOnlineFourPlayers(srv);
    const baseMaster = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;

    const deck = createCuuChau112Deck(() => 0.25);
    const tuKhiQuyet = deck.find((c) => c.cardKey === 'vo_trung_sinh_huu')!;
    const hoaGiai = deck.find((c) => c.cardKey === 'vo_giai_kha_kich')!;
    const phaTran = deck.find((c) => c.cardKey === 'qua_ha_sai_cau')!;
    expect(tuKhiQuyet.nameVi).toBe('Tụ Khí Quyết');
    expect(hoaGiai.nameVi).toBe('Hóa Giải Chân Khí');

    const usedIds = new Set([tuKhiQuyet.id, hoaGiai.id, phaTran.id]);
    const cleanDeck = deck.filter((c) => !usedIds.has(c.id));

    const identities = ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const;
    const heroes: readonly HeroId[] = ['liu_bei', 'guan_yu', 'zhang_liao', 'lu_xun'];

    const players: PlayerCombatState[] = baseMaster.players.map((p, idx) => ({
      ...p,
      identity: identities[idx]!,
      isIdentityRevealed: idx === 0,
      heroId: heroes[idx]!,
      hp: idx === 0 ? 5 : 4,
      maxHp: idx === 0 ? 5 : 4,
      alive: true,
      handCards:
        idx === 0
          ? [tuKhiQuyet]
          : idx === 1
            ? [hoaGiai]
            : idx === 2
              ? [phaTran]
              : [],
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

    const prepared: MasterGameState = {
      ...baseMaster,
      enabledPacks: ['cuu_chau_core'],
      rulesetVersion: '2.0.0',
      roundNumber: 2,
      peacefulFirstRound: false,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      heroDraft: {
        stage: 'COMPLETED',
        lordSeatIndex: 0,
        remainingPool: [],
        candidatesBySeat: {},
        selectedBySeat: { 0: 'liu_bei', 1: 'guan_yu', 2: 'zhang_liao', 3: 'lu_xun' },
      },
      drawPile: cleanDeck,
      discardPile: [],
      players,
      interruptStack: [],
      pendingEffects: [],
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    };

    const syncPrepared = sockets.map((ws) =>
      ws.waitFor((m) => m.type === 'ROOM_STATE' && m.event === 'COMMIT_STEP'),
    );
    await srv.roomManager.commitMatchStep(roomCode, prepared);
    await Promise.all(syncPrepared);

    // Ngắt kết nối Ghế 1 (Hộ Pháp cầm Hóa Giải Chân Khí) -> chuyển sang Bot đánh hộ
    const seat1Takeover = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return pv?.players[1]?.isBotTakeover === true;
    });
    await sockets[1]!.close();
    await seat1Takeover;

    // Minh Chủ (Ghế 0) đánh Tụ Khí Quyết -> Bot Hộ Pháp (Ghế 1) KHÔNG ĐƯỢC tự ném Hóa Giải hủy bài rút của Minh Chủ!
    const lordDrewTwoPromise = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return (
        pv?.activeInterrupt === null &&
        (pv?.players[0]?.handCards?.length ?? 0) === 2
      );
    }, 4000);

    sockets[0]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'PLAY_CARD',
        seatIndex: 0,
        cardIds: [tuKhiQuyet.id],
      },
    });
    await lordDrewTwoPromise;

    const afterTuKhi = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    expect(afterTuKhi.players[0]!.handCards).toHaveLength(2);
    // Hộ Pháp (Ghế 1) vẫn giữ nguyên lá Hóa Giải Chân Khí trên tay để dành bảo vệ Minh Chủ
    expect(afterTuKhi.players[1]!.handCards.map((c) => c.id)).toEqual([hoaGiai.id]);

    // Ngược lại, khi Nghĩa Quân (Ghế 2) đánh Phá Trận Chưởng vào Minh Chủ -> Bot Hộ Pháp (Ghế 1) LẬP TỨC tung Hóa Giải bảo vệ!
    const rebelTurnState: MasterGameState = {
      ...afterTuKhi,
      currentTurnSeat: 2,
      turnPhase: 'PLAY',
      interruptStack: [],
      pendingEffects: [],
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    };
    const syncRebelTurn = [sockets[0]!, sockets[2]!, sockets[3]!].map((ws) =>
      ws.waitFor((m) => m.type === 'ROOM_STATE' && m.event === 'COMMIT_STEP'),
    );
    await srv.roomManager.commitMatchStep(roomCode, rebelTurnState);
    await Promise.all(syncRebelTurn);

    const botProtectedLordPromise = sockets[0]!.waitFor((m) => {
      if (m.type !== 'ROOM_STATE') return false;
      const pv = m.playerView as RoomViewerPayload['playerView'];
      return (
        pv?.activeInterrupt === null &&
        pv?.players[1]?.handCount === 0 &&
        (pv?.players[0]?.handCards?.length ?? 0) === 2
      );
    }, 4000);

    sockets[2]!.sendJson({
      type: 'GAME_ACTION',
      roomCode,
      action: {
        type: 'PLAY_CARD',
        seatIndex: 2,
        cardIds: [phaTran.id],
        targetSeats: [0],
      },
    });
    await botProtectedLordPromise;

    const afterDefense = srv.roomManager.getSnapshotRecord(roomCode)!.masterGameState!;
    expect(afterDefense.players[0]!.handCards).toHaveLength(2);
    expect(afterDefense.players[1]!.handCards).toHaveLength(0);
  });
});
