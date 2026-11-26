import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { HeroId, UserProfile } from '@lkdf/shared';
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
        googleSub: `sub-${code}`,
        email: `${code}@example.com`,
        displayName: `Người chơi ${code.toUpperCase()}`,
        avatarUrl: `https://example.com/${code}.png`,
      };
    },
  };
}

async function loginMockPlayer(
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

describe('Bước 2.2 — Phòng chờ 4–8 người thật, 3 mức Đồng hồ & Khôi phục RoomSnapshot', () => {
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
          // Windows giữ khóa SQLite ngắn hạn sau khi đóng
        }
      }
    }
  });

  it('tạo phòng 6 ký tự, đổi 3 mức đồng hồ, rời phòng chuyển chủ, và chặn bắt đầu khi < 4 người thật', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'room-test-jwt-secret-key-min-32-chars!',
      },
      googleProvider: createMockGoogleProvider(),
    });
    activeServers.push(srv);

    const p1 = await loginMockPlayer(srv, 'p1');
    const p2 = await loginMockPlayer(srv, 'p2');
    const p3 = await loginMockPlayer(srv, 'p3');
    const p4 = await loginMockPlayer(srv, 'p4');

    const presetsRes = await srv.app.inject({
      method: 'GET',
      url: '/api/rooms/presets',
    });
    expect(presetsRes.statusCode).toBe(200);
    expect(presetsRes.json<{ presets: Array<{ id: string }> }>().presets.map((p) => p.id)).toEqual([
      'FAST',
      'STANDARD',
      'RELAXED',
    ]);

    const createRes = await srv.app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { authorization: `Bearer ${p1.token}` },
      payload: {},
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ ok: boolean } & RoomViewerPayload>();
    const roomCode = created.roomState.roomCode;
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(created.roomState.status).toBe('LOBBY');
    expect(created.roomState.timerPreset).toBe('STANDARD');
    expect(created.timerConfig).toEqual({
      heroSelectSeconds: 30,
      mainTurnSeconds: 150,
      discardSeconds: 45,
      reactionSeconds: 15,
    });

    const dupCreateRes = await srv.app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { authorization: `Bearer ${p1.token}` },
      payload: {},
    });
    expect(dupCreateRes.statusCode).toBe(409);

    for (const player of [p2, p3]) {
      const joinRes = await srv.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${player.token}` },
        payload: { roomCode: roomCode.toLowerCase() },
      });
      expect(joinRes.statusCode).toBe(200);
    }

    const sameAccountSecondSeat = await srv.app.inject({
      method: 'POST',
      url: '/api/rooms/join',
      headers: { authorization: `Bearer ${p2.token}` },
      payload: { roomCode },
    });
    expect(sameAccountSecondSeat.statusCode).toBe(409);
    expect(sameAccountSecondSeat.json<{ code: string }>().code).toBe(
      'ACCOUNT_ALREADY_SEATED',
    );

    const nonHostTimerRes = await srv.app.inject({
      method: 'PATCH',
      url: `/api/rooms/${roomCode}/timer`,
      headers: { authorization: `Bearer ${p2.token}` },
      payload: { timerPreset: 'FAST' },
    });
    expect(nonHostTimerRes.statusCode).toBe(403);

    const fastTimerRes = await srv.app.inject({
      method: 'PATCH',
      url: `/api/rooms/${roomCode}/timer`,
      headers: { authorization: `Bearer ${p1.token}` },
      payload: { timerPreset: 'FAST' },
    });
    expect(fastTimerRes.statusCode).toBe(200);
    expect(fastTimerRes.json<RoomViewerPayload>().timerConfig).toEqual({
      heroSelectSeconds: 20,
      mainTurnSeconds: 90,
      discardSeconds: 30,
      reactionSeconds: 15,
    });

    const startWithThreeRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${p1.token}` },
    });
    expect(startWithThreeRes.statusCode).toBe(400);
    expect(startWithThreeRes.json<{ code: string }>().code).toBe(
      'INSUFFICIENT_REAL_PLAYERS',
    );

    await srv.app.inject({
      method: 'POST',
      url: '/api/rooms/join',
      headers: { authorization: `Bearer ${p4.token}` },
      payload: { roomCode },
    });

    const nonHostStartRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${p2.token}` },
    });
    expect(nonHostStartRes.statusCode).toBe(403);

    const hostLeaveRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/leave`,
      headers: { authorization: `Bearer ${p1.token}` },
    });
    expect(hostLeaveRes.statusCode).toBe(200);
    const afterLeave = hostLeaveRes.json<{
      deleted: boolean;
      room: RoomViewerPayload;
    }>();
    expect(afterLeave.deleted).toBe(false);
    expect(afterLeave.room.roomState.ownerUserId).toBe(p2.profile.userId);
    expect(afterLeave.room.roomState.seats.map((s) => s.userId)).toEqual([
      p2.profile.userId,
      p3.profile.userId,
      p4.profile.userId,
    ]);

    const startAfterHostLeftRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${p2.token}` },
    });
    expect(startAfterHostLeftRes.statusCode).toBe(400);

    for (const player of [p2, p3, p4]) {
      await srv.app.inject({
        method: 'POST',
        url: `/api/rooms/${roomCode}/leave`,
        headers: { authorization: `Bearer ${player.token}` },
      });
    }

    const deletedRoomRes = await srv.app.inject({
      method: 'GET',
      url: `/api/rooms/${roomCode}`,
      headers: { authorization: `Bearer ${p1.token}` },
    });
    expect(deletedRoomRes.statusCode).toBe(404);
  });

  it('cho phép đủ 8 người thật vào phòng, bắt đầu đúng bàn 8 người và chặn người thứ 9', async () => {
    const srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'room-8p-jwt-secret-key-min-32-chars!!',
      },
      googleProvider: createMockGoogleProvider(),
    });
    activeServers.push(srv);

    const players = [];
    for (let i = 1; i <= 9; i += 1) {
      players.push(await loginMockPlayer(srv, `p8_${i}`));
    }

    const created = (
      await srv.app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: { authorization: `Bearer ${players[0]!.token}` },
        payload: { timerPreset: 'RELAXED' },
      })
    ).json<RoomViewerPayload>();
    const roomCode = created.roomState.roomCode;

    for (let i = 1; i < 8; i += 1) {
      const joinRes = await srv.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${players[i]!.token}` },
        payload: { roomCode },
      });
      expect(joinRes.statusCode).toBe(200);
    }

    const ninthJoinRes = await srv.app.inject({
      method: 'POST',
      url: '/api/rooms/join',
      headers: { authorization: `Bearer ${players[8]!.token}` },
      payload: { roomCode },
    });
    expect(ninthJoinRes.statusCode).toBe(409);
    expect(ninthJoinRes.json<{ code: string }>().code).toBe('ROOM_FULL');

    const prematureStart = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${players[0]!.token}` },
    });
    expect(prematureStart.statusCode).toBe(409);
    expect(prematureStart.json<{ code: string }>().code).toBe('GUESTS_NOT_READY');

    for (const guest of players.slice(1, 8)) {
      const response = await srv.app.inject({
        method: 'PATCH',
        url: `/api/rooms/${roomCode}/ready`,
        headers: { authorization: `Bearer ${guest.token}` },
        payload: { isReady: true },
      });
      expect(response.statusCode).toBe(200);
    }

    const updateGuestReady = (isReady: boolean) => srv.app.inject({
      method: 'PATCH',
      url: `/api/rooms/${roomCode}/ready`,
      headers: { authorization: `Bearer ${players[1]!.token}` },
      payload: { isReady },
    });
    expect((await updateGuestReady(false)).statusCode).toBe(200);
    const cancelledStart = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${players[0]!.token}` },
    });
    expect(cancelledStart.json<{ code: string }>().code).toBe('GUESTS_NOT_READY');
    expect((await updateGuestReady(true)).statusCode).toBe(200);

    const startRes = await srv.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${players[0]!.token}` },
    });
    expect(startRes.statusCode).toBe(200);
    expect((await updateGuestReady(false)).statusCode).toBe(409);
    const started = startRes.json<RoomViewerPayload>();
    expect(started.roomState.status).toBe('IN_GAME');
    expect(started.roomState.seats).toHaveLength(8);
    expect(started.timerConfig.heroSelectSeconds).toBe(45);
    expect(started.playerView?.players).toHaveLength(8);

    const masterSnap = srv.roomManager.getSnapshotRecord(roomCode);
    expect(masterSnap?.masterGameState?.players).toHaveLength(8);
    const counts = { LORD: 0, LOYALIST: 0, REBEL: 0, SPY: 0 };
    for (const p of masterSnap?.masterGameState?.players ?? []) {
      counts[p.identity] += 1;
    }
    expect(counts).toEqual({ LORD: 1, LOYALIST: 2, REBEL: 3, SPY: 2 });
  });

  it('tự động lưu RoomSnapshot sau mỗi bước và khôi phục nguyên vẹn sau khi khởi động lại máy chủ', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lkdf-room-snap-'));
    tempDirs.push(dir);
    const dbFileUrl = `file:${join(dir, 'rooms.db').replace(/\\/g, '/')}`;
    const fixedSecret = 'room-restart-persistent-jwt-secret-key-01';

    const srv1 = await createServer({
      config: { databaseUrl: dbFileUrl, jwtSessionSecret: fixedSecret },
      googleProvider: createMockGoogleProvider(),
    });

    const p1 = await loginMockPlayer(srv1, 'r1');
    const p2 = await loginMockPlayer(srv1, 'r2');
    const p3 = await loginMockPlayer(srv1, 'r3');
    const p4 = await loginMockPlayer(srv1, 'r4');
    const allPlayers = [p1, p2, p3, p4];

    const created = (
      await srv1.app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: { authorization: `Bearer ${p1.token}` },
        payload: { timerPreset: 'RELAXED' },
      })
    ).json<RoomViewerPayload>();
    const roomCode = created.roomState.roomCode;

    for (const joiner of [p2, p3, p4]) {
      await srv1.app.inject({
        method: 'POST',
        url: '/api/rooms/join',
        headers: { authorization: `Bearer ${joiner.token}` },
        payload: { roomCode },
      });
    }

    for (const guest of [p2, p3, p4]) {
      const response = await srv1.app.inject({
        method: 'PATCH',
        url: `/api/rooms/${roomCode}/ready`,
        headers: { authorization: `Bearer ${guest.token}` },
        payload: { isReady: true },
      });
      expect(response.statusCode).toBe(200);
    }

    const startRes = await srv1.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/start`,
      headers: { authorization: `Bearer ${p1.token}` },
    });
    expect(startRes.statusCode).toBe(200);
    const started = startRes.json<RoomViewerPayload>();
    const lordSeatIndex = started.playerView?.heroDraft?.lordSeatIndex ?? -1;
    expect(lordSeatIndex).toBeGreaterThanOrEqual(0);
    const lordPlayer = allPlayers[lordSeatIndex]!;

    const lordViewRes = await srv1.app.inject({
      method: 'GET',
      url: `/api/rooms/${roomCode}`,
      headers: { authorization: `Bearer ${lordPlayer.token}` },
    });
    const lordView = lordViewRes.json<RoomViewerPayload>();
    expect(lordView.playerView?.heroDraft?.myCandidates).toHaveLength(5);
    const chosenLordHero = lordView.playerView?.heroDraft?.myCandidates[0] as HeroId;

    const nonLordPlayer = allPlayers.find((p) => p.profile.userId !== lordPlayer.profile.userId)!;
    const nonLordEarlyPickRes = await srv1.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/select-hero`,
      headers: { authorization: `Bearer ${nonLordPlayer.token}` },
      payload: { heroId: 'guan_yu' },
    });
    expect(nonLordEarlyPickRes.statusCode).toBe(403);

    const lordPickRes = await srv1.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/select-hero`,
      headers: { authorization: `Bearer ${lordPlayer.token}` },
      payload: { heroId: chosenLordHero },
    });
    expect(lordPickRes.statusCode).toBe(200);
    const afterLordPick = lordPickRes.json<RoomViewerPayload>();
    expect(afterLordPick.playerView?.heroDraft?.stage).toBe('OTHERS_SELECTING');

    const savedSnapBeforeRestart = await srv1.persistence.getRoomSnapshot(roomCode);
    expect(savedSnapBeforeRestart?.roomState.timerPreset).toBe('RELAXED');
    expect(savedSnapBeforeRestart?.masterGameState?.heroDraft?.stage).toBe(
      'OTHERS_SELECTING',
    );
    await srv1.app.close();

    // Khởi động máy chủ mới (mô phỏng Render restart) đọc lại từ cùng file DB
    const srv2 = await createServer({
      config: { databaseUrl: dbFileUrl, jwtSessionSecret: fixedSecret },
      googleProvider: createMockGoogleProvider(),
    });

    const restoredMineRes = await srv2.app.inject({
      method: 'GET',
      url: '/api/rooms/mine',
      headers: { authorization: `Bearer ${nonLordPlayer.token}` },
    });
    expect(restoredMineRes.statusCode).toBe(200);
    const restoredMine = restoredMineRes.json<{ ok: boolean; room: RoomViewerPayload | null }>();
    expect(restoredMine.room?.roomState.roomCode).toBe(roomCode);
    expect(restoredMine.room?.roomState.status).toBe('IN_GAME');
    expect(restoredMine.room?.roomState.timerPreset).toBe('RELAXED');
    expect(restoredMine.room?.phaseDeadlineAt).toBeTruthy();
    expect(restoredMine.room?.playerView?.heroDraft?.stage).toBe('OTHERS_SELECTING');
    expect(restoredMine.room?.playerView?.heroDraft?.myCandidates).toHaveLength(3);
    expect(
      restoredMine.room?.playerView?.players[lordSeatIndex]?.heroId,
    ).toBe(chosenLordHero);

    for (const player of allPlayers) {
      if (player.profile.userId === lordPlayer.profile.userId) {
        continue;
      }
      const view = (
        await srv2.app.inject({
          method: 'GET',
          url: `/api/rooms/${roomCode}`,
          headers: { authorization: `Bearer ${player.token}` },
        })
      ).json<RoomViewerPayload>();
      const pick = view.playerView?.heroDraft?.myCandidates[0];
      expect(pick).toBeTruthy();
      const pickRes = await srv2.app.inject({
        method: 'POST',
        url: `/api/rooms/${roomCode}/select-hero`,
        headers: { authorization: `Bearer ${player.token}` },
        payload: { heroId: pick },
      });
      expect(pickRes.statusCode).toBe(200);
    }

    const openingOnSrv2 = srv2.roomManager.getSnapshotRecord(roomCode);
    expect(openingOnSrv2?.masterGameState?.heroDraft?.stage).toBe('COMPLETED');
    expect(openingOnSrv2?.masterGameState?.turnPhase).toBe('HERO_SELECT');
    expect(openingOnSrv2?.masterGameState?.players.every(player => player.handCards.length === 0)).toBe(true);
    expect(Date.parse(openingOnSrv2?.phaseDeadlineAt ?? '') - Date.now()).toBeGreaterThan(2500);
    await expect.poll(() => srv2.roomManager.getSnapshotRecord(roomCode)?.masterGameState?.turnPhase,
      { timeout: 4000 }).not.toBe('HERO_SELECT');

    const combatViewOnSrv2 = (
      await srv2.app.inject({
        method: 'GET',
        url: `/api/rooms/${roomCode}`,
        headers: { authorization: `Bearer ${p1.token}` },
      })
    ).json<RoomViewerPayload>();
    const livePhaseOnSrv2 = combatViewOnSrv2.playerView?.turnPhase;
    const liveDrawCountOnSrv2 = combatViewOnSrv2.playerView?.drawPileCount ?? -1;
    expect(livePhaseOnSrv2).toBeTruthy();
    expect(livePhaseOnSrv2).not.toBe('HERO_SELECT');
    expect(liveDrawCountOnSrv2).toBeLessThanOrEqual(112 - 16);
    const p1SelfHandIds =
      combatViewOnSrv2.playerView?.players[
        combatViewOnSrv2.playerView.viewerSeatIndex
      ]?.handCards?.map((c) => c.id) ?? [];
    expect(p1SelfHandIds.length).toBeGreaterThanOrEqual(4);

    // Kiểm tra giới hạn tối đa 5 bản undo snapshot
    const currentMaster = srv2.roomManager.getSnapshotRecord(roomCode)?.masterGameState;
    expect(currentMaster).toBeTruthy();
    if (currentMaster) {
      for (let step = 1; step <= 7; step += 1) {
        await srv2.roomManager.commitMatchStep(
          roomCode,
          {
            ...currentMaster,
            roundNumber: step,
          },
          { pushUndo: true },
        );
      }
    }
    const boundedUndoSnap = srv2.roomManager.getSnapshotRecord(roomCode);
    expect(boundedUndoSnap?.undoHistory).toHaveLength(5);

    await srv2.app.close();

    // Khởi động máy chủ lần 3 để xác nhận trạng thái combat + tay bài + undo vẫn nguyên vẹn
    const srv3 = await createServer({
      config: { databaseUrl: dbFileUrl, jwtSessionSecret: fixedSecret },
      googleProvider: createMockGoogleProvider(),
    });
    activeServers.push(srv3);

    const combatViewOnSrv3 = (
      await srv3.app.inject({
        method: 'GET',
        url: `/api/rooms/${roomCode}`,
        headers: { authorization: `Bearer ${p1.token}` },
      })
    ).json<RoomViewerPayload>();

    expect(combatViewOnSrv3.playerView?.turnPhase).toBe(livePhaseOnSrv2);
    expect(combatViewOnSrv3.playerView?.roundNumber).toBe(7);
    expect(combatViewOnSrv3.playerView?.drawPileCount).toBe(liveDrawCountOnSrv2);
    expect(
      combatViewOnSrv3.playerView?.players[
        combatViewOnSrv3.playerView.viewerSeatIndex
      ]?.handCards?.map((c) => c.id),
    ).toEqual(p1SelfHandIds);
    expect(
      combatViewOnSrv3.playerView?.players.find(
        (pl) => pl.seatIndex !== combatViewOnSrv3.playerView?.viewerSeatIndex,
      )?.handCards,
    ).toBeNull();
    expect(srv3.roomManager.getSnapshotRecord(roomCode)?.undoHistory).toEqual(
      boundedUndoSnap?.undoHistory,
    );
  });
});
