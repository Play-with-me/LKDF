import type { FastifyInstance } from 'fastify';
import {
  HERO_CATALOG,
  HeroIdSchema,
  IdentityRoleSchema,
  type IdentityRole,
} from '@lkdf/shared';
import { z } from 'zod';
import type { PersistenceStore, StatsFilterQuery } from '../persistence/index.js';

const IDENTITY_META: readonly {
  readonly id: IdentityRole;
  readonly nameVi: string;
}[] = [
  { id: 'LORD', nameVi: 'Chủ Công' },
  { id: 'LOYALIST', nameVi: 'Trung Thần' },
  { id: 'REBEL', nameVi: 'Phản Tặc' },
  { id: 'SPY', nameVi: 'Nội Gián' },
];

const StatsQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  identity: IdentityRoleSchema.optional(),
  heroId: HeroIdSchema.optional(),
  includeMatches: z.enum(['true', 'false']).optional(),
  includeMonthly: z.enum(['true', 'false']).optional(),
  matchLimit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Đăng ký API thống kê thắng/thua và bộ lọc theo Người chơi, Thân Phận và 25 Tướng. */
export function registerStatsRoutes(
  app: FastifyInstance,
  persistence: PersistenceStore,
): void {
  app.get('/api/stats/meta', async () => {
    const players = await persistence.listPublicUsers();
    return {
      ok: true,
      identities: IDENTITY_META,
      heroes: HERO_CATALOG.map((hero) => ({
        id: hero.id,
        nameVi: hero.nameVi,
        faction: hero.faction,
        factionLabelVi: hero.factionLabelVi,
      })),
      players,
    };
  });

  app.get('/api/stats', async (request, reply) => {
    const rawQuery = request.query as Record<string, unknown>;
    const normalizedInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawQuery)) {
      if (typeof value === 'string' && value.trim() === '') {
        continue;
      }
      normalizedInput[key] = value;
    }

    const parsed = StatsQuerySchema.safeParse(normalizedInput);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_STATS_FILTER',
        messageVi:
          'Bộ lọc thống kê không hợp lệ (kiểm tra lại userId, Thân Phận hoặc mã Tướng).',
      });
    }

    const filterQuery: StatsFilterQuery = {
      ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
      ...(parsed.data.identity ? { identity: parsed.data.identity } : {}),
      ...(parsed.data.heroId ? { heroId: parsed.data.heroId } : {}),
      includeMatches: parsed.data.includeMatches === 'true',
      includeMonthly: parsed.data.includeMonthly === 'true',
      ...(parsed.data.matchLimit !== undefined
        ? { matchLimit: parsed.data.matchLimit }
        : {}),
    };

    const result = await persistence.queryStats(filterQuery);
    return {
      ok: true,
      ...result,
    };
  });

  app.get('/api/users/:userId/stats', async (request, reply) => {
    const params = request.params as { userId?: string };
    const userId = params.userId?.trim() ?? '';
    if (!userId) {
      return reply.status(400).send({
        ok: false,
        code: 'MISSING_USER_ID',
        messageVi: 'Thiếu mã người chơi.',
      });
    }

    const [profile, stats] = await Promise.all([
      persistence.getUserById(userId),
      persistence.getUserStats(userId),
    ]);

    if (!profile || !stats) {
      return reply.status(404).send({
        ok: false,
        code: 'USER_NOT_FOUND',
        messageVi: 'Không tìm thấy thống kê của người chơi này.',
      });
    }

    return {
      ok: true,
      player: {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
      stats,
    };
  });
}
