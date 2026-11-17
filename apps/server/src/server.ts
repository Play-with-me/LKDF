import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { WebSocket, WebSocketServer } from 'ws';
import { STANDARD_DECK_TOTAL, STANDARD_HERO_COUNT } from '@lkdf/shared';
import { z } from 'zod';
import { RealGoogleOAuthProvider } from './auth/googleProvider.js';
import { createAuthService, type AuthService } from './auth/index.js';
import { registerAuthRoutes } from './auth/routes.js';
import {
  loadServerConfig,
  type CreateServerOptions,
  type ServerConfig,
} from './config.js';
import {
  createPersistenceStore,
  type PersistenceStore,
} from './persistence/index.js';
import { createRoomManager, type RoomManager } from './rooms/index.js';
import { registerRoomRoutes } from './rooms/routes.js';
import { registerStatsRoutes } from './stats/routes.js';

export interface ServerInstance {
  readonly app: FastifyInstance;
  readonly wss: WebSocketServer;
  readonly persistence: PersistenceStore;
  readonly authService: AuthService;
  readonly roomManager: RoomManager;
  readonly config: ServerConfig;
}

const WsAuthMessageSchema = z.object({
  type: z.literal('AUTH'),
  sessionToken: z.string().min(1),
  seatMode: z.enum(['CLAIM_SEAT', 'TAKEOVER']).optional(),
});

/** Khởi tạo máy chủ Fastify + WebSocket (ws) + Cloud 0đ Persistence + Google OAuth 2.0 cho LKDF. */
export async function createServer(
  options?: CreateServerOptions,
): Promise<ServerInstance> {
  const config = loadServerConfig(options?.config);
  const persistence = createPersistenceStore({
    url: config.databaseUrl,
    ...(config.databaseAuthToken
      ? { authToken: config.databaseAuthToken }
      : {}),
  });
  await persistence.init();

  const googleProvider =
    options?.googleProvider ??
    new RealGoogleOAuthProvider({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    });

  const authService = createAuthService({
    persistence,
    googleProvider,
    jwtSessionSecret: config.jwtSessionSecret,
    googleRedirectUri: config.googleRedirectUri,
  });

  const roomManager = createRoomManager({
    persistence,
    authService,
  });
  await roomManager.restoreFromPersistence();

  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.get('/api/health', async () => {
    return {
      ok: true,
      service: 'lkdf-server',
      version: '0.1.0',
      heroCount: STANDARD_HERO_COUNT,
      deckTotal: STANDARD_DECK_TOTAL,
      googleConfigured: authService.isGoogleConfigured,
      timestamp: new Date().toISOString(),
    };
  });

  registerAuthRoutes(app, { authService, persistence });
  registerStatsRoutes(app, persistence);
  registerRoomRoutes(app, { authService, roomManager });

  const wss = new WebSocketServer({
    server: app.server,
    path: '/ws',
  });

  const activeSocketsByUserId = new Map<string, WebSocket>();
  const socketToUserId = new Map<WebSocket, string>();

  const unsubscribeSession = authService.onSessionInvalidated(
    (userId, reason) => {
      const existingSocket = activeSocketsByUserId.get(userId);
      if (!existingSocket) {
        return;
      }
      activeSocketsByUserId.delete(userId);
      socketToUserId.delete(existingSocket);
      if (existingSocket.readyState === WebSocket.OPEN) {
        existingSocket.send(
          JSON.stringify({
            type: 'SESSION_INVALIDATED',
            code: reason,
            messageVi:
              reason === 'SESSION_REPLACED'
                ? 'Tài khoản Google này đã đăng nhập ở một phiên khác.'
                : 'Tài khoản đã đăng xuất.',
          }),
        );
        existingSocket.close(4001, reason);
      }
    },
  );

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      const text = raw.toString();
      if (text === 'ping') {
        socket.send('pong');
        return;
      }

      let decoded: unknown;
      try {
        decoded = JSON.parse(text);
      } catch {
        return;
      }

      const authMsg = WsAuthMessageSchema.safeParse(decoded);
      if (!authMsg.success) {
        return;
      }

      const verified = await authService.verifySessionToken(
        authMsg.data.sessionToken,
      );
      if (!verified.ok) {
        socket.send(
          JSON.stringify({
            type: 'AUTH_ERROR',
            code: verified.code,
            messageVi: verified.messageVi,
          }),
        );
        socket.close(4001, verified.code);
        return;
      }

      const userId = verified.profile.userId;
      const existingSocket = activeSocketsByUserId.get(userId);
      if (
        existingSocket &&
        existingSocket !== socket &&
        existingSocket.readyState === WebSocket.OPEN
      ) {
        if (authMsg.data.seatMode !== 'TAKEOVER') {
          socket.send(
            JSON.stringify({
              type: 'AUTH_ERROR',
              code: 'DUPLICATE_ACTIVE_SEAT',
              messageVi:
                'Tài khoản Google này đang kết nối ở một cửa sổ/ghế khác. Không thể ngồi 2 ghế cùng lúc.',
            }),
          );
          socket.close(4009, 'DUPLICATE_ACTIVE_SEAT');
          return;
        }

        existingSocket.send(
          JSON.stringify({
            type: 'SESSION_DISPLACED',
            code: 'TAKEOVER',
            messageVi: 'Phiên kết nối đã được tiếp quản ở cửa sổ khác.',
          }),
        );
        socketToUserId.delete(existingSocket);
        existingSocket.close(4001, 'TAKEOVER');
      }

      activeSocketsByUserId.set(userId, socket);
      socketToUserId.set(socket, userId);
      socket.send(
        JSON.stringify({
          type: 'AUTH_OK',
          userId,
          displayName: verified.profile.displayName,
        }),
      );
    });

    socket.on('close', () => {
      const boundUserId = socketToUserId.get(socket);
      if (!boundUserId) {
        return;
      }
      socketToUserId.delete(socket);
      if (activeSocketsByUserId.get(boundUserId) === socket) {
        activeSocketsByUserId.delete(boundUserId);
      }
    });
  });

  app.addHook('onClose', async () => {
    unsubscribeSession();
    for (const socket of wss.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
    await persistence.close();
  });

  return { app, wss, persistence, authService, roomManager, config };
}
