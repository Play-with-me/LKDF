import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MatchHistoryRecord, UserStats } from '@lkdf/shared';
import type {
  FilteredStatsResult,
  PersistenceStore,
} from '../../src/persistence/index.js';
import { createServer, type ServerInstance } from '../../src/server.js';

describe('Bước 2.1 — Bộ lọc Thống kê theo Người chơi, Thân Phận và 25 Tướng', () => {
  let srv: ServerInstance;
  let userIds: {
    minh: string;
    lan: string;
    huy: string;
    tu: string;
    bao: string;
    chau: string;
    dung: string;
    khanh: string;
  };

  async function seedUser(
    persistence: PersistenceStore,
    googleSub: string,
    displayName: string,
  ): Promise<string> {
    const res = await persistence.upsertGoogleUser({
      googleSub,
      email: `${googleSub}@example.com`,
      displayName,
      avatarUrl: `https://example.com/avatar-${encodeURIComponent(displayName)}.png`,
    });
    return res.profile.userId;
  }

  beforeAll(async () => {
    srv = await createServer({
      config: {
        databaseUrl: ':memory:',
        jwtSessionSecret: 'stats-test-jwt-secret-key-32-chars!!',
      },
    });

    userIds = {
      minh: await seedUser(srv.persistence, 'sub-minh', 'Minh'),
      lan: await seedUser(srv.persistence, 'sub-lan', 'Lan'),
      huy: await seedUser(srv.persistence, 'sub-huy', 'Huy'),
      tu: await seedUser(srv.persistence, 'sub-tu', 'Tú'),
      bao: await seedUser(srv.persistence, 'sub-bao', 'Bảo'),
      chau: await seedUser(srv.persistence, 'sub-chau', 'Châu'),
      dung: await seedUser(srv.persistence, 'sub-dung', 'Dũng'),
      khanh: await seedUser(srv.persistence, 'sub-khanh', 'Khánh'),
    };

    const match1: MatchHistoryRecord = {
      matchId: 'match-4p-01',
      roomCode: 'RM0001',
      playerCount: 4,
      winningFaction: 'LORD_LOYALIST',
      durationSeconds: 420,
      finishedAt: '2026-11-16T10:00:00.000Z',
      participants: [
        {
          userId: userIds.minh,
          displayName: 'Minh',
          seatIndex: 0,
          identity: 'LORD',
          heroId: 'liu_bei',
          isWinner: true,
          survived: true,
        },
        {
          userId: userIds.lan,
          displayName: 'Lan',
          seatIndex: 1,
          identity: 'REBEL',
          heroId: 'guan_yu',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.huy,
          displayName: 'Huy',
          seatIndex: 2,
          identity: 'SPY',
          heroId: 'si_ma_yi',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.tu,
          displayName: 'Tú',
          seatIndex: 3,
          identity: 'REBEL',
          heroId: 'zhuge_liang',
          isWinner: false,
          survived: false,
        },
      ],
    };

    const match2: MatchHistoryRecord = {
      matchId: 'match-5p-02',
      roomCode: 'RM0002',
      playerCount: 5,
      winningFaction: 'REBEL',
      durationSeconds: 510,
      finishedAt: '2026-11-16T11:00:00.000Z',
      participants: [
        {
          userId: userIds.lan,
          displayName: 'Lan',
          seatIndex: 0,
          identity: 'LORD',
          heroId: 'cao_cao',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.huy,
          displayName: 'Huy',
          seatIndex: 1,
          identity: 'LOYALIST',
          heroId: 'guo_jia',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.minh,
          displayName: 'Minh',
          seatIndex: 2,
          identity: 'REBEL',
          heroId: 'zhuge_liang',
          isWinner: true,
          survived: true,
        },
        {
          userId: userIds.tu,
          displayName: 'Tú',
          seatIndex: 3,
          identity: 'REBEL',
          heroId: 'lu_bu',
          isWinner: true,
          survived: false,
        },
        {
          userId: userIds.bao,
          displayName: 'Bảo',
          seatIndex: 4,
          identity: 'SPY',
          heroId: 'diao_chan',
          isWinner: false,
          survived: false,
        },
      ],
    };

    const match3EightPlayersTwoSpies: MatchHistoryRecord = {
      matchId: 'match-8p-03',
      roomCode: 'RM0008',
      playerCount: 8,
      winningFaction: 'SPY',
      durationSeconds: 890,
      finishedAt: '2026-11-16T12:00:00.000Z',
      participants: [
        {
          userId: userIds.bao,
          displayName: 'Bảo',
          seatIndex: 0,
          identity: 'LORD',
          heroId: 'sun_quan',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.chau,
          displayName: 'Châu',
          seatIndex: 1,
          identity: 'LOYALIST',
          heroId: 'zhou_yu',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.dung,
          displayName: 'Dũng',
          seatIndex: 2,
          identity: 'LOYALIST',
          heroId: 'lu_xun',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.khanh,
          displayName: 'Khánh',
          seatIndex: 3,
          identity: 'REBEL',
          heroId: 'gan_ning',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.tu,
          displayName: 'Tú',
          seatIndex: 4,
          identity: 'REBEL',
          heroId: 'hua_tuo',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.huy,
          displayName: 'Huy',
          seatIndex: 5,
          identity: 'REBEL',
          heroId: 'zhuge_liang',
          isWinner: false,
          survived: false,
        },
        {
          userId: userIds.minh,
          displayName: 'Minh',
          seatIndex: 6,
          identity: 'SPY',
          heroId: 'si_ma_yi',
          isWinner: true,
          survived: true,
        },
        {
          userId: userIds.lan,
          displayName: 'Lan',
          seatIndex: 7,
          identity: 'SPY',
          heroId: 'zhen_ji',
          isWinner: false,
          survived: false,
        },
      ],
    };

    const r1 = await srv.persistence.recordMatchResult(match1);
    const r2 = await srv.persistence.recordMatchResult(match2);
    const r3 = await srv.persistence.recordMatchResult(match3EightPlayersTwoSpies);
    const r3Duplicate = await srv.persistence.recordMatchResult(match3EightPlayersTwoSpies);

    expect(r1.recorded).toBe(true);
    expect(r2.recorded).toBe(true);
    expect(r3.recorded).toBe(true);
    expect(r3Duplicate).toEqual({ recorded: false, reason: 'ALREADY_EXISTS' });
  });

  afterAll(async () => {
    await srv.app.close();
  });

  it('trả về danh mục tham chiếu đầy đủ 4 Thân Phận, 25 Tướng chuẩn và danh sách người chơi', async () => {
    const res = await srv.app.inject({ method: 'GET', url: '/api/stats/meta' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      ok: boolean;
      identities: Array<{ id: string; nameVi: string }>;
      heroes: Array<{ id: string; nameVi: string }>;
      players: Array<{ userId: string; displayName: string }>;
    }>();

    expect(body.ok).toBe(true);
    expect(body.identities).toHaveLength(4);
    expect(body.heroes).toHaveLength(25);
    expect(body.players).toHaveLength(8);
  });

  it('lọc chính xác tổng hợp toàn server khi không chọn bộ lọc', async () => {
    const res = await srv.app.inject({ method: 'GET', url: '/api/stats' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ ok: boolean } & FilteredStatsResult>();

    expect(body.summary.totalDistinctMatches).toBe(3);
    expect(body.summary.totalAppearances).toBe(17);
    expect(body.summary.totalWins).toBe(4);
    expect(body.summary.totalLosses).toBe(13);
    expect(body.players[0]?.displayName).toBe('Minh');
    expect(body.players[0]?.played).toBe(3);
    expect(body.players[0]?.wins).toBe(3);
    expect(body.players[0]?.winRatePercent).toBe(100);
  });

  it('lọc theo Người chơi cụ thể (?userId=...) với đủ chi tiết 4 Thân Phận và từng Tướng', async () => {
    const res = await srv.app.inject({
      method: 'GET',
      url: `/api/stats?userId=${encodeURIComponent(userIds.minh)}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ ok: boolean } & FilteredStatsResult>();

    expect(body.summary.totalDistinctMatches).toBe(3);
    expect(body.summary.totalWins).toBe(3);
    expect(body.summary.byIdentity.LORD).toEqual({
      played: 1,
      wins: 1,
      losses: 0,
      winRatePercent: 100,
    });
    expect(body.summary.byIdentity.REBEL.wins).toBe(1);
    expect(body.summary.byIdentity.SPY.wins).toBe(1);
    expect(body.summary.byHero.si_ma_yi.wins).toBe(1);
    expect(body.players).toHaveLength(1);
  });

  it('lọc theo Thân Phận (?identity=SPY), gồm đúng luật 2 Nội Gián ở bàn 8 người', async () => {
    const res = await srv.app.inject({
      method: 'GET',
      url: '/api/stats?identity=SPY',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ ok: boolean } & FilteredStatsResult>();

    expect(body.summary.totalDistinctMatches).toBe(3);
    expect(body.summary.totalAppearances).toBe(4);
    expect(body.summary.totalWins).toBe(1);
    expect(body.summary.totalLosses).toBe(3);
    expect(body.summary.winRatePercent).toBe(25);
    expect(body.players.find((p) => p.userId === userIds.minh)?.wins).toBe(1);
    expect(body.players.find((p) => p.userId === userIds.lan)?.wins).toBe(0);
    expect(body.players.find((p) => p.userId === userIds.lan)?.played).toBe(1);
  });

  it('lọc theo Tướng (?heroId=zhuge_liang) và lọc kết hợp nhiều chiều kèm lịch sử trận đấu', async () => {
    const heroOnlyRes = await srv.app.inject({
      method: 'GET',
      url: '/api/stats?heroId=zhuge_liang',
    });
    expect(heroOnlyRes.statusCode).toBe(200);
    const heroOnly = heroOnlyRes.json<{ ok: boolean } & FilteredStatsResult>();
    expect(heroOnly.summary.totalDistinctMatches).toBe(3);
    expect(heroOnly.summary.totalWins).toBe(1);
    expect(heroOnly.summary.totalLosses).toBe(2);
    expect(heroOnly.players.map((p) => p.displayName)).toEqual(['Minh', 'Huy', 'Tú']);

    const comboRes = await srv.app.inject({
      method: 'GET',
      url: `/api/stats?userId=${userIds.minh}&identity=REBEL&heroId=zhuge_liang&includeMatches=true`,
    });
    expect(comboRes.statusCode).toBe(200);
    const combo = comboRes.json<{ ok: boolean } & FilteredStatsResult>();
    expect(combo.summary.totalDistinctMatches).toBe(1);
    expect(combo.summary.totalWins).toBe(1);
    expect(combo.recentMatches).toHaveLength(1);
    expect(combo.recentMatches?.[0]?.matchId).toBe('match-5p-02');
    expect(combo.recentMatches?.[0]?.participants).toHaveLength(5);
  });

  it('từ chối mã tướng/thân phận không thuộc 25 tướng chuẩn và trả về chi tiết UserStats an toàn', async () => {
    const invalidHeroRes = await srv.app.inject({
      method: 'GET',
      url: '/api/stats?heroId=not_a_standard_hero',
    });
    expect(invalidHeroRes.statusCode).toBe(400);

    const userStatsRes = await srv.app.inject({
      method: 'GET',
      url: `/api/users/${userIds.tu}/stats`,
    });
    expect(userStatsRes.statusCode).toBe(200);
    const userStatsBody = userStatsRes.json<{
      ok: boolean;
      player: { userId: string; displayName: string };
      stats: UserStats;
    }>();
    expect(userStatsBody.stats).toMatchObject({
      userId: userIds.tu,
      totalMatches: 3,
      totalWins: 1,
      totalLosses: 2,
    });
    expect(userStatsBody.player).not.toHaveProperty('googleSub');
    expect(userStatsBody.player).not.toHaveProperty('email');
    expect(userStatsRes.body).not.toContain('sub-tu');
    expect(userStatsRes.body).not.toContain('@example.com');
  });

  it('counts 110 of 120 player matches in the Vietnam period while returning only 20 recent matches', async () => {
    const testUser = await seedUser(srv.persistence, 'sub-monthly', 'Monthly');
    const source = await srv.persistence.queryStats({ userId: userIds.minh, includeMatches: true, matchLimit: 1 });
    const template = source.recentMatches![0]!;
    for (let index = 0; index < 120; index++) {
      const finishedAt = index < 109 ? '2026-11-20T10:00:00.000Z'
        : index === 109 ? '2026-08-31T17:00:00.000Z' : '2026-08-31T16:59:59.999Z';
      await srv.persistence.recordMatchResult({
        ...template, matchId: `month-test-${index}`, finishedAt,
        participants: template.participants.map(player =>
          player.userId === userIds.minh ? { ...player, userId: testUser, isWinner: index % 2 === 0 } : player),
      });
    }

    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-21T10:00:00.000Z'));
    try {
      const response = await srv.app.inject({
        method: 'GET',
        url: `/api/stats?userId=${testUser}&includeMonthly=true&includeMatches=true&matchLimit=20`,
      });
      expect(response.statusCode).toBe(200);
      const result = response.json<FilteredStatsResult>();
      expect(result.summary).toMatchObject({ totalAppearances: 120, totalWins: 60, totalLosses: 60 });
      expect(result.monthlyResults).toEqual([
        { month: '2026-09', wins: 0, losses: 1 },
        { month: '2026-10', wins: 0, losses: 0 },
        { month: '2026-11', wins: 55, losses: 54 },
      ]);
      expect(result.recentMatches).toHaveLength(20);
    } finally {
      clock.mockRestore();
    }
  });


  it('keeps profile totals, monthly counts and recent matches consistent during a match write', async () => {
    const testUser = await seedUser(srv.persistence, 'sub-stats-race', 'Snapshot');
    const source = await srv.persistence.queryStats({ userId: userIds.minh, includeMatches: true, matchLimit: 1 });
    const template = source.recentMatches![0]!;
    const filter = { userId: testUser, includeMonthly: true, includeMatches: true, matchLimit: 20 };
    const write = srv.persistence.recordMatchResult({
      ...template, matchId: 'stats-concurrent-match', finishedAt: new Date().toISOString(),
      participants: template.participants.map(player =>
        player.userId === userIds.minh ? { ...player, userId: testUser, isWinner: true } : player),
    });
    const [beforeOrAfter] = await Promise.all([srv.persistence.queryStats(filter), write]);
    const after = await srv.persistence.queryStats(filter);
    for (const response of [beforeOrAfter, after]) {
      expect(response.recentMatches).toHaveLength(response.summary.totalAppearances);
      expect(response.monthlyResults?.reduce((sum, month) => sum + month.wins, 0)).toBe(response.summary.totalWins);
    }
    expect(after.summary.totalWins).toBe(1);
  });

});
