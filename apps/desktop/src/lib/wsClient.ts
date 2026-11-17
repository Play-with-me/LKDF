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

export function createRoomWsClient(options: RoomWsClientOptions): RoomWsClient {
  const wsUrl = toWebSocketUrl(options.serverUrl);
  const normalizedRoomCode = options.roomCode.trim().toUpperCase();
  let closedManually = false;

  options.onStatusChange?.('CONNECTING');
  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    if (closedManually) {
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
    if (typeof event.data !== 'string') {
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
      options.onStatusChange?.('CONNECTED');
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

    if (msgType === 'SESSION_INVALIDATED') {
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

  socket.addEventListener('close', () => {
    options.onStatusChange?.('DISCONNECTED');
  });

  socket.addEventListener('error', () => {
    options.onStatusChange?.('DISCONNECTED');
  });

  function sendPayload(payload: unknown): boolean {
    if (closedManually || socket.readyState !== WebSocket.OPEN) {
      options.onActionError?.({
        code: 'WS_NOT_CONNECTED',
        messageVi:
          'Kết nối tới máy chủ phòng đấu chưa sẵn sàng. Vui lòng chờ kết nối lại.',
      });
      return false;
    }
    try {
      socket.send(JSON.stringify(payload));
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
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    },
  };
}
