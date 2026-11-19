import type { GameAction, HeroId, RefereeActionType } from '@lkdf/shared';
import { normalizeServerUrl } from './api.js';
import type { RoomViewerPayload } from './types.js';

export type WsConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface WsErrorInfo {
  readonly code: string;
  readonly messageVi: string;
}

export interface WsMatchEndedInfo {
  readonly roomCode: string;
  readonly matchId: string;
  readonly winningFaction: string | null;
  readonly winnerUserIds: readonly string[];
}

export interface WsActionAckInfo {
  readonly actionType: string;
  readonly silentPass?: boolean;
}

export interface RoomWsClientOptions {
  readonly serverUrl: string;
  readonly sessionToken: string;
  readonly roomCode: string;
  readonly onRoomState?: (payload: RoomViewerPayload, event?: string) => void;
  readonly onAuthError?: (error: WsErrorInfo) => void;
  readonly onSessionInvalidated?: (info: WsErrorInfo) => void;
  readonly onActionError?: (error: WsErrorInfo) => void;
  readonly onMatchEnded?: (info: WsMatchEndedInfo) => void;
  readonly onActionAck?: (info: WsActionAckInfo) => void;
  readonly onStatusChange?: (status: WsConnectionStatus) => void;
}

export interface RoomWsClient {
  sendSelectHero(heroId: HeroId): boolean;
  sendGameAction(action: GameAction): boolean;
  sendRefereeAction(actionType: RefereeActionType): boolean;
  close(): void;
}

function toWebSocketUrl(serverUrl: string): string {
  const normalized = normalizeServerUrl(serverUrl);
  const parsed = new URL(normalized);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/ws`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

const WS_HEARTBEAT_INTERVAL_MS = 25_000;
const WS_RECONNECT_BASE_DELAY_MS = 2_000;
const WS_RECONNECT_MAX_DELAY_MS = 10_000;

export function createRoomWsClient(options: RoomWsClientOptions): RoomWsClient {
  const wsUrl = toWebSocketUrl(options.serverUrl);
  const normalizedRoomCode = options.roomCode.trim().toUpperCase();
  let closedManually = false;
  let authRejected = false;
  let reconnectAttempt = 0;
  let activeSocket: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearHeartbeat(): void {
    if (heartbeatTimer !== null) {
      globalThis.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      globalThis.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function startHeartbeat(socket: WebSocket): void {
    clearHeartbeat();
    heartbeatTimer = globalThis.setInterval(() => {
      if (
        closedManually ||
        activeSocket !== socket ||
        socket.readyState !== WebSocket.OPEN
      ) {
        clearHeartbeat();
        return;
      }
      try {
        socket.send('ping');
      } catch {
        // Sự kiện error/close sẽ xử lý trạng thái mất kết nối và kết nối lại
      }
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  function scheduleReconnect(): void {
    if (closedManually || authRejected || reconnectTimer !== null) {
      return;
    }
    const delayMs = Math.min(
      WS_RECONNECT_MAX_DELAY_MS,
      Math.round(WS_RECONNECT_BASE_DELAY_MS * Math.pow(1.5, reconnectAttempt)),
    );
    reconnectAttempt += 1;
    reconnectTimer = globalThis.setTimeout(() => {
      reconnectTimer = null;
      if (!closedManually && !authRejected) {
        connect();
      }
    }, delayMs);
  }

  function connect(): void {
    if (closedManually || authRejected) {
      return;
    }
    clearHeartbeat();
    clearReconnectTimer();
    options.onStatusChange?.('CONNECTING');

    const socket = new WebSocket(wsUrl);
    activeSocket = socket;

    socket.addEventListener('open', () => {
      if (closedManually || activeSocket !== socket) {
        socket.close();
        return;
      }
      socket.send(
        JSON.stringify({
          type: 'AUTH',
          sessionToken: options.sessionToken,
          seatMode: 'TAKEOVER',
        }),
      );
    });

    socket.addEventListener('message', (event) => {
      if (activeSocket !== socket || typeof event.data !== 'string') {
        return;
      }
      if (event.data === 'pong') {
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(event.data) as Record<string, unknown>;
      } catch {
        return;
      }

      const msgType = parsed['type'];
      if (msgType === 'AUTH_OK') {
        reconnectAttempt = 0;
        options.onStatusChange?.('CONNECTED');
        startHeartbeat(socket);
        socket.send(
          JSON.stringify({
            type: 'SUBSCRIBE_ROOM',
            roomCode: normalizedRoomCode,
          }),
        );
        return;
      }

      if (msgType === 'ROOM_STATE') {
        const eventReason =
          typeof parsed['event'] === 'string' ? parsed['event'] : undefined;
        const payload: RoomViewerPayload = {
          roomState: parsed['roomState'] as RoomViewerPayload['roomState'],
          timerConfig: parsed['timerConfig'] as RoomViewerPayload['timerConfig'],
          phaseDeadlineAt:
            (parsed['phaseDeadlineAt'] as string | null | undefined) ?? null,
          pausedRemainingMs:
            (parsed['pausedRemainingMs'] as number | null | undefined) ?? null,
          playerView:
            (parsed['playerView'] as RoomViewerPayload['playerView'] | undefined) ??
            null,
          refereeAuditLog:
            (parsed['refereeAuditLog'] as
              | RoomViewerPayload['refereeAuditLog']
              | undefined) ?? [],
        };
        options.onRoomState?.(payload, eventReason);
        return;
      }

      if (msgType === 'AUTH_ERROR') {
        authRejected = true;
        clearHeartbeat();
        clearReconnectTimer();
        options.onAuthError?.({
          code:
            typeof parsed['code'] === 'string' ? parsed['code'] : 'AUTH_ERROR',
          messageVi:
            typeof parsed['messageVi'] === 'string'
              ? parsed['messageVi']
              : 'Phiên đăng nhập không hợp lệ.',
        });
        return;
      }

      if (msgType === 'SESSION_INVALIDATED' || msgType === 'SESSION_DISPLACED') {
        authRejected = true;
        clearHeartbeat();
        clearReconnectTimer();
        options.onSessionInvalidated?.({
          code:
            typeof parsed['code'] === 'string'
              ? parsed['code']
              : 'SESSION_INVALIDATED',
          messageVi:
            typeof parsed['messageVi'] === 'string'
              ? parsed['messageVi']
              : 'Phiên đăng nhập đã kết thúc hoặc được mở ở thiết bị khác.',
        });
        return;
      }

      if (msgType === 'ACTION_ERROR') {
        options.onActionError?.({
          code:
            typeof parsed['code'] === 'string' ? parsed['code'] : 'ACTION_ERROR',
          messageVi:
            typeof parsed['messageVi'] === 'string'
              ? parsed['messageVi']
              : 'Thao tác không hợp lệ.',
        });
        return;
      }

      if (msgType === 'MATCH_ENDED') {
        options.onMatchEnded?.({
          roomCode:
            typeof parsed['roomCode'] === 'string'
              ? parsed['roomCode']
              : normalizedRoomCode,
          matchId:
            typeof parsed['matchId'] === 'string' ? parsed['matchId'] : '',
          winningFaction:
            typeof parsed['winningFaction'] === 'string'
              ? parsed['winningFaction']
              : null,
          winnerUserIds: Array.isArray(parsed['winnerUserIds'])
            ? parsed['winnerUserIds'].filter(
                (id): id is string => typeof id === 'string',
              )
            : [],
        });
        return;
      }

      if (msgType === 'ACTION_ACK') {
        options.onActionAck?.({
          actionType:
            typeof parsed['actionType'] === 'string' ? parsed['actionType'] : '',
          silentPass:
            typeof parsed['silentPass'] === 'boolean'
              ? parsed['silentPass']
              : undefined,
        });
      }
    });

    socket.addEventListener('close', (event) => {
      if (activeSocket !== socket) {
        return;
      }
      clearHeartbeat();
      options.onStatusChange?.('DISCONNECTED');
      if (
        !closedManually &&
        !authRejected &&
        event.code !== 4001 &&
        event.code !== 4009
      ) {
        scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      if (activeSocket !== socket) {
        return;
      }
      options.onStatusChange?.('DISCONNECTED');
    });
  }

  connect();

  function sendPayload(payload: unknown): boolean {
    if (
      closedManually ||
      !activeSocket ||
      activeSocket.readyState !== WebSocket.OPEN
    ) {
      options.onActionError?.({
        code: 'WS_NOT_CONNECTED',
        messageVi:
          'Kết nối tới máy chủ phòng đấu chưa sẵn sàng. Vui lòng chờ kết nối lại.',
      });
      return false;
    }
    try {
      activeSocket.send(JSON.stringify(payload));
      return true;
    } catch {
      options.onActionError?.({
        code: 'WS_SEND_FAILED',
        messageVi: 'Không thể gửi thao tác tới máy chủ. Vui lòng thử lại.',
      });
      return false;
    }
  }

  return {
    sendSelectHero(heroId: HeroId): boolean {
      return sendPayload({
        type: 'SELECT_HERO',
        roomCode: normalizedRoomCode,
        heroId,
      });
    },
    sendGameAction(action: GameAction): boolean {
      return sendPayload({
        type: 'GAME_ACTION',
        roomCode: normalizedRoomCode,
        action,
      });
    },
    sendRefereeAction(actionType: RefereeActionType): boolean {
      return sendPayload({
        type: 'REFEREE_ACTION',
        roomCode: normalizedRoomCode,
        actionType,
      });
    },
    close(): void {
      closedManually = true;
      clearHeartbeat();
      clearReconnectTimer();
      const socket = activeSocket;
      activeSocket = null;
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close();
      }
    },
  };
}
