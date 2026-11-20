import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { WebSocket, WebSocketServer } from 'ws';
import { STANDARD_DECK_TOTAL, STANDARD_HERO_COUNT } from '@lkdf/shared';
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
import {
  createMatchCoordinator,
  type MatchCoordinator,
} from './rooms/coordinator.js';
import { createRoomManager, type RoomManager } from './rooms/index.js';
import { registerRoomRoutes } from './rooms/routes.js';
import { WsClientMessageSchema } from './rooms/wsSchemas.js';
import { registerStatsRoutes } from './stats/routes.js';
import { UpdateProxyService } from './update-proxy/index.js';
import { registerUpdateProxyRoutes } from './update-proxy/routes.js';

export interface ServerInstance {
  readonly app: FastifyInstance;
  readonly wss: WebSocketServer;
  readonly persistence: PersistenceStore;
  readonly authService: AuthService;
  readonly roomManager: RoomManager;
  readonly coordinator: MatchCoordinator;
  readonly updateProxy: UpdateProxyService;
  readonly config: ServerConfig;
}

/** Khởi tạo máy chủ Fastify + WebSocket (ws) + Cloud 0đ Persistence + Google OAuth 2.0 + MatchCoordinator cho LKDF. */
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
    ...(options?.runtime?.timerScale !== undefined
      ? { timerScale: options.runtime.timerScale }
      : {}),
    ...(options?.runtime?.hostFailoverDelayMs !== undefined
      ? { hostFailoverDelayMs: options.runtime.hostFailoverDelayMs }
      : {}),
    ...(options?.runtime?.rng ? { defaultRng: options.runtime.rng } : {}),
  });
  await roomManager.restoreFromPersistence();

  const coordinator = createMatchCoordinator({
    roomManager,
    ...(options?.runtime ? { runtime: options.runtime } : {}),
  });

  const updateProxy = new UpdateProxyService({
    githubRepo: config.githubRepo,
    githubReleaseToken: config.githubReleaseToken,
    githubApiBaseUrl: config.githubApiBaseUrl,
    cacheTtlMs: config.updateCacheTtlMs,
    downloadMode: config.updateDownloadMode,
  });

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
      updateProxyConfigured: updateProxy.isConfigured,
      timestamp: new Date().toISOString(),
    };
  });

  registerAuthRoutes(app, { authService, persistence });
  registerStatsRoutes(app, persistence);
  registerRoomRoutes(app, { authService, roomManager });
  registerUpdateProxyRoutes(app, updateProxy);

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
      coordinator.handleDisplacedSocket(existingSocket);
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
    let messageQueue: Promise<void> = Promise.resolve();

    const processMessage = async (text: string): Promise<void> => {
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

      const parsed = WsClientMessageSchema.safeParse(decoded);
      if (!parsed.success) {
        socket.send(
          JSON.stringify({
            type: 'ACTION_ERROR',
            code: 'INVALID_WS_MESSAGE',
            messageVi: 'Gói tin WebSocket không đúng định dạng.',
          }),
        );
        return;
      }

      const msg = parsed.data;
      if (msg.type === 'AUTH') {
        const verified = await authService.verifySessionToken(msg.sessionToken);
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
          if (msg.seatMode !== 'TAKEOVER') {
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
          coordinator.handleDisplacedSocket(existingSocket);
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
        await coordinator.bindAuthenticatedSocket(userId, socket, msg.actionLogDeltas);
        return;
      }

      const authedUserId = socketToUserId.get(socket);
      if (!authedUserId) {
        socket.send(
          JSON.stringify({
            type: 'AUTH_ERROR',
            code: 'NOT_AUTHENTICATED',
            messageVi: 'Vui lòng xác thực phiên Google trước khi gửi thao tác.',
          }),
        );
        return;
      }

      await coordinator.handleAuthenticatedMessage(socket, authedUserId, msg);
    };

    socket.on('message', (raw) => {
      const text = raw.toString();
      messageQueue = messageQueue.then(
        () => processMessage(text),
        () => processMessage(text),
      );
    });

    socket.on('close', () => {
      coordinator.handleSocketClosed(socket);
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

  coordinator.scheduleAllActiveRooms();

  app.addHook('onClose', async () => {
    unsubscribeSession();
    coordinator.shutdown();
    for (const socket of wss.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
    await persistence.close();
  });

  return {
    app,
    wss,
    persistence,
    authService,
    roomManager,
    coordinator,
    updateProxy,
    config,
  };
}
