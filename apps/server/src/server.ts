import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import { STANDARD_DECK_TOTAL, STANDARD_HERO_COUNT } from '@lkdf/shared';

export interface ServerInstance {
  readonly app: FastifyInstance;
  readonly wss: WebSocketServer;
}

/** Khởi tạo khung máy chủ Fastify + WebSocket (ws) cho LKDF. */
export async function createServer(): Promise<ServerInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });

  app.get('/api/health', async () => {
    return {
      ok: true,
      service: 'lkdf-server',
      version: '0.1.0',
      heroCount: STANDARD_HERO_COUNT,
      deckTotal: STANDARD_DECK_TOTAL,
      timestamp: new Date().toISOString(),
    };
  });

  const wss = new WebSocketServer({
    server: app.server,
    path: '/ws',
  });

  wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
      if (raw.toString() === 'ping') {
        socket.send('pong');
      }
    });
  });

  app.addHook('onClose', async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
  });

  return { app, wss };
}
