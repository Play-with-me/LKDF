import { afterAll, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

describe('Bước 0.2 — Khung máy chủ Fastify + ws', () => {
  let closeServer: (() => Promise<void>) | null = null;

  afterAll(async () => {
    if (closeServer) {
      await closeServer();
    }
  });

  it('trả về trạng thái sẵn sàng và hằng số @lkdf/shared tại GET /api/health', async () => {
    const { app } = await createServer();
    closeServer = async () => app.close();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      ok: boolean;
      service: string;
      heroCount: number;
      deckTotal: number;
    }>();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('lkdf-server');
    expect(body.heroCount).toBe(25);
    expect(body.deckTotal).toBe(108);
  });
});
