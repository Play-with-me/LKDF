import { getPendingPrompt, type GameAction } from '@lkdf/shared';
import { WebSocket } from 'ws';
import type { MatchCoordinatorConfig } from '../config.js';
import type { RoomManager, RoomViewerPayload } from './index.js';
import type { WsClientMessage } from './wsSchemas.js';

const DEFAULT_SIMULATED_NULLIFY_MIN_MS = 2000;
const DEFAULT_SIMULATED_NULLIFY_MAX_MS = 3500;
const DEFAULT_BOT_ACTION_DELAY_MS = 450;
const DEFAULT_NULLIFICATION_BOT_PASS_MIN_MS = 1500;
const DEFAULT_DISCONNECT_GRACE_MS = 0;
const DEFAULT_HOST_FAILOVER_DELAY_MS = 30_000;

interface RoomTimerHandles {
  simulatedTimer?: NodeJS.Timeout;
  botTimer?: NodeJS.Timeout;
  timeoutTimer?: NodeJS.Timeout;
}

export interface MatchCoordinator {
  bindAuthenticatedSocket(userId: string, socket: WebSocket, actionLogDeltas?: boolean): Promise<void>;
  handleDisplacedSocket(socket: WebSocket): void;
  handleSocketClosed(socket: WebSocket): void;
  handleAuthenticatedMessage(
    socket: WebSocket,
    userId: string,
    message: Exclude<WsClientMessage, { readonly type: 'AUTH' }>,
  ): Promise<void>;
  scheduleAllActiveRooms(): void;
  shutdown(): void;
}

function sendJson(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function createMatchCoordinator(deps: {
  readonly roomManager: RoomManager;
  readonly runtime?: MatchCoordinatorConfig;
  readonly nowFn?: () => number;
}): MatchCoordinator {
  const onlineSocketsByUserId = new Map<string, WebSocket>();
  const socketToUserId = new Map<WebSocket, string>();
  const roomTimersByCode = new Map<string, RoomTimerHandles>();
  const hostFailoverTimersByCode = new Map<string, NodeJS.Timeout>();
  const disconnectGraceByUserId = new Map<string, NodeJS.Timeout>();
  const logBySocket = new WeakMap<WebSocket, { matchId: string; entries: readonly string[] } | null>();
  const sentMatchEndedIds = new Set<string>();
  let isShutDown = false;

  const getNowMs = deps.nowFn ?? (() => Date.now());
  const rng = deps.runtime?.rng ?? Math.random;
  const simMinMs =
    deps.runtime?.simulatedNullificationMinMs ?? DEFAULT_SIMULATED_NULLIFY_MIN_MS;
  const simMaxMs = Math.max(
    simMinMs,
    deps.runtime?.simulatedNullificationMaxMs ?? DEFAULT_SIMULATED_NULLIFY_MAX_MS,
  );
  const botActionDelayMs =
    deps.runtime?.botActionDelayMs ?? DEFAULT_BOT_ACTION_DELAY_MS;
  const nullificationBotPassMinMs =
    deps.runtime?.nullificationBotPassMinMs ?? DEFAULT_NULLIFICATION_BOT_PASS_MIN_MS;
  const disconnectGraceMs =
    deps.runtime?.disconnectBotTakeoverGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS;
  const hostFailoverDelayMs =
    deps.runtime?.hostFailoverDelayMs ?? DEFAULT_HOST_FAILOVER_DELAY_MS;

  const clearHostFailoverTimer = (roomCode: string): void => {
    const t = hostFailoverTimersByCode.get(roomCode);
    if (t) {
      clearTimeout(t);
      hostFailoverTimersByCode.delete(roomCode);
    }
  };

  const clearRoomTimers = (roomCode: string): void => {
    const handles = roomTimersByCode.get(roomCode);
    if (!handles) {
      return;
    }
    if (handles.simulatedTimer) clearTimeout(handles.simulatedTimer);
    if (handles.botTimer) clearTimeout(handles.botTimer);
    if (handles.timeoutTimer) clearTimeout(handles.timeoutTimer);
    roomTimersByCode.delete(roomCode);
  };

  const sendRoomView = (
    socket: WebSocket,
    view: RoomViewerPayload,
    event?: string,
    forceFull = false,
  ): void => {
    const playerView = view.playerView;
    const previous = logBySocket.get(socket);
    const entries = playerView?.actionLog;
    const useDelta = !forceFull && playerView && previous?.matchId === playerView.matchId &&
      previous.entries.every((entry, index) => entry === entries?.[index]);

    sendJson(socket, {
      type: 'ROOM_STATE',
      ...(event ? { event } : {}),
      ...view,
      ...(useDelta && entries ? {
        playerView: { ...playerView, actionLog: entries.slice(previous.entries.length) },
        actionLogOffset: previous.entries.length,
      } : {}),
    });
    if (previous !== undefined) {
      logBySocket.set(socket, playerView ? { matchId: playerView.matchId, entries: playerView.actionLog } : null);
    }
  };

  const broadcastRoomState = (roomCode: string, eventReason?: string): void => {
    if (isShutDown) {
      return;
    }
    const snap = deps.roomManager.getSnapshotRecord(roomCode);
    if (!snap) {
      return;
    }

    for (const seat of snap.roomState.seats) {
      const sock = onlineSocketsByUserId.get(seat.userId);
      if (!sock || sock.readyState !== WebSocket.OPEN) {
        continue;
      }
      const viewRes = deps.roomManager.getRoomViewForUser(seat.userId, roomCode);
      if (!viewRes.ok) {
        continue;
      }
      sendRoomView(sock, viewRes.data, eventReason, eventReason === 'REFEREE_UNDO_ONE_STEP');

      const master = snap.masterGameState;
      if (
        master &&
        master.turnPhase === 'GAME_OVER' &&
        !sentMatchEndedIds.has(`${master.matchId}:${seat.userId}`)
      ) {
        sentMatchEndedIds.add(`${master.matchId}:${seat.userId}`);
        sendJson(sock, {
          type: 'MATCH_ENDED',
          roomCode,
          matchId: master.matchId,
          winningFaction: master.winningFaction,
          winnerUserIds: master.winnerUserIds,
        });
      }
    }
  };

  const scheduleRoomRuntime = (roomCode: string): void => {
    if (isShutDown) {
      return;
    }
    clearRoomTimers(roomCode);
    clearHostFailoverTimer(roomCode);

    const snap = deps.roomManager.getSnapshotRecord(roomCode);
    if (!snap || snap.roomState.status === 'FINISHED') {
      return;
    }

    if (
      snap.roomState.hostDisconnectedAt !== null &&
      snap.roomState.actingHostUserId === snap.roomState.ownerUserId
    ) {
      const remainingFailoverMs = Math.max(
        0,
        Date.parse(snap.roomState.hostDisconnectedAt) +
          hostFailoverDelayMs -
          getNowMs(),
      );
      hostFailoverTimersByCode.set(
        roomCode,
        setTimeout(() => {
          hostFailoverTimersByCode.delete(roomCode);
          if (isShutDown) return;
          void deps.roomManager.transferActingHostAfterTimeout(roomCode);
        }, remainingFailoverMs),
      );
    }

    if (
      snap.roomState.status !== 'IN_GAME' ||
      snap.roomState.isTimerPaused ||
      !snap.masterGameState ||
      snap.masterGameState.turnPhase === 'GAME_OVER'
    ) {
      return;
    }

    const master = snap.masterGameState;
    const handles: RoomTimerHandles = {};
    roomTimersByCode.set(roomCode, handles);

    const topInterrupt = master.interruptStack[master.interruptStack.length - 1];
    if (topInterrupt?.kind === 'WAIT_NULLIFICATION' && topInterrupt.isSimulatedDelay) {
      const span = Math.max(0, simMaxMs - simMinMs);
      const delayMs = simMinMs + Math.floor(rng() * (span + 1));
      const expectedFrameId = topInterrupt.id;
      handles.simulatedTimer = setTimeout(() => {
        if (isShutDown) return;
        void deps.roomManager.resolveSimulatedNullification(
          roomCode,
          expectedFrameId,
          { rng },
        );
      }, delayMs);
      return;
    }

    const prompt = getPendingPrompt(master);
    if (prompt && !prompt.isSimulatedDelay) {
      const hasBotActor = prompt.actorSeats.some((seatIdx) => {
        const p = master.players.find((pl) => pl.seatIndex === seatIdx);
        return p?.isBotTakeover === true;
      });
      if (hasBotActor) {
        const delayMs =
          topInterrupt?.kind === 'WAIT_NULLIFICATION'
            ? Math.max(botActionDelayMs, nullificationBotPassMinMs)
            : botActionDelayMs;
        handles.botTimer = setTimeout(() => {
          if (isShutDown) return;
          void deps.roomManager.executeBotActionIfEligible(roomCode, { rng });
        }, delayMs);
      }
    }

    if (snap.phaseDeadlineAt) {
      const remainingMs = Math.max(5, Date.parse(snap.phaseDeadlineAt) - getNowMs());
      handles.timeoutTimer = setTimeout(() => {
        if (isShutDown) return;
        void deps.roomManager.handlePhaseTimeout(roomCode, { rng });
      }, remainingMs);
    }
  };

  const unsubscribeRoomUpdates = deps.roomManager.onRoomUpdated(
    (roomCode, reason) => {
      if (reason === 'ROOM_DELETED') {
        clearRoomTimers(roomCode);
        clearHostFailoverTimer(roomCode);
        return;
      }
      broadcastRoomState(roomCode, reason);
      scheduleRoomRuntime(roomCode);
    },
  );

  return {
    async bindAuthenticatedSocket(userId: string, socket: WebSocket, actionLogDeltas = false): Promise<void> {
      if (actionLogDeltas) logBySocket.set(socket, null);
      else logBySocket.delete(socket);
      const pendingGrace = disconnectGraceByUserId.get(userId);
      if (pendingGrace) {
        clearTimeout(pendingGrace);
        disconnectGraceByUserId.delete(userId);
      }

      onlineSocketsByUserId.set(userId, socket);
      socketToUserId.set(socket, userId);

      const activeRoomCode = deps.roomManager.getActiveRoomCodeForUser(userId);
      if (!activeRoomCode) {
        return;
      }

      const existingSnap = deps.roomManager.getSnapshotRecord(activeRoomCode);
      const seat = existingSnap?.roomState.seats.find((s) => s.userId === userId);
      if (!existingSnap || !seat) {
        return;
      }

      const wasDisconnectedOrBot =
        seat.connectionStatus === 'DISCONNECTED' || seat.isBotTakeover;

      if (wasDisconnectedOrBot) {
        clearRoomTimers(activeRoomCode);
        await deps.roomManager.setUserConnectionAndTakeover(userId, activeRoomCode, {
          connectionStatus: 'ONLINE',
          isBotTakeover: false,
          ...(existingSnap.roomState.status === 'IN_GAME'
            ? {
                logMessageVi: `${seat.displayName} đã kết nối lại và tiếp tục tự điều khiển.`,
              }
            : {}),
        });
      }

      const viewRes = deps.roomManager.getRoomViewForUser(userId, activeRoomCode);
      if (viewRes.ok) {
        sendRoomView(socket, viewRes.data, 'SYNC_ON_CONNECT', true);
      }
      scheduleRoomRuntime(activeRoomCode);
    },

    handleDisplacedSocket(socket: WebSocket): void {
      const uid = socketToUserId.get(socket);
      socketToUserId.delete(socket);
      if (uid && onlineSocketsByUserId.get(uid) === socket) {
        onlineSocketsByUserId.delete(uid);
      }
    },

    handleSocketClosed(socket: WebSocket): void {
      const userId = socketToUserId.get(socket);
      if (!userId) {
        return;
      }
      socketToUserId.delete(socket);
      if (onlineSocketsByUserId.get(userId) !== socket) {
        // Socket này đã bị thay thế (TAKEOVER) hoặc bị vô hiệu hóa trước đó.
        return;
      }
      onlineSocketsByUserId.delete(userId);

      const activeRoomCode = deps.roomManager.getActiveRoomCodeForUser(userId);
      if (!activeRoomCode || isShutDown) {
        return;
      }

      const triggerDisconnectTakeover = async (): Promise<void> => {
        disconnectGraceByUserId.delete(userId);
        if (isShutDown || onlineSocketsByUserId.has(userId)) {
          return;
        }
        const snap = deps.roomManager.getSnapshotRecord(activeRoomCode);
        const seat = snap?.roomState.seats.find((s) => s.userId === userId);
        if (!snap || !seat) {
          return;
        }

        const isInGame = snap.roomState.status === 'IN_GAME';
        await deps.roomManager.setUserConnectionAndTakeover(userId, activeRoomCode, {
          connectionStatus: 'DISCONNECTED',
          ...(isInGame
            ? {
                isBotTakeover: true,
                logMessageVi: `${seat.displayName} mất kết nối — Máy tạm thời đánh hộ.`,
              }
            : {}),
        });
      };

      if (disconnectGraceMs <= 0) {
        void triggerDisconnectTakeover();
      } else {
        const prev = disconnectGraceByUserId.get(userId);
        if (prev) clearTimeout(prev);
        disconnectGraceByUserId.set(
          userId,
          setTimeout(() => {
            void triggerDisconnectTakeover();
          }, disconnectGraceMs),
        );
      }
    },

    async handleAuthenticatedMessage(
      socket: WebSocket,
      userId: string,
      message: Exclude<WsClientMessage, { readonly type: 'AUTH' }>,
    ): Promise<void> {
      switch (message.type) {
        case 'SUBSCRIBE_ROOM': {
          const roomCode = message.roomCode.trim().toUpperCase();
          const viewRes = deps.roomManager.getRoomViewForUser(userId, roomCode);
          if (!viewRes.ok) {
            sendJson(socket, {
              type: 'ACTION_ERROR',
              code: viewRes.code,
              messageVi: viewRes.messageVi,
            });
            return;
          }

          const seat = viewRes.data.roomState.seats.find((s) => s.userId === userId);
          if (seat && (seat.connectionStatus === 'DISCONNECTED' || seat.isBotTakeover)) {
            await deps.roomManager.setUserConnectionAndTakeover(userId, roomCode, {
              connectionStatus: 'ONLINE',
              isBotTakeover: false,
            });
          }

          const freshView = deps.roomManager.getRoomViewForUser(userId, roomCode);
          if (freshView.ok) {
            sendRoomView(socket, freshView.data, 'SUBSCRIBED', true);
          }
          scheduleRoomRuntime(roomCode);
          return;
        }

        case 'SELECT_HERO': {
          const res = await deps.roomManager.selectHero(
            userId,
            message.roomCode,
            message.heroId,
            { rng },
          );
          if (!res.ok) {
            sendJson(socket, {
              type: 'ACTION_ERROR',
              code: res.code,
              messageVi: res.messageVi,
            });
            return;
          }
          sendJson(socket, {
            type: 'ACTION_ACK',
            actionType: 'SELECT_HERO',
          });
          return;
        }

        case 'GAME_ACTION': {
          const res = await deps.roomManager.applyPlayerAction(
            userId,
            message.roomCode,
            message.action as GameAction,
            { rng },
          );
          if (!res.ok) {
            sendJson(socket, {
              type: 'ACTION_ERROR',
              code: res.code,
              messageVi: res.messageVi,
            });
            return;
          }
          sendJson(socket, {
            type: 'ACTION_ACK',
            actionType: message.action.type,
            silentPass: res.data.silentPass,
          });
          return;
        }

        case 'REFEREE_ACTION': {
          const res = await deps.roomManager.applyRefereeAction(
            userId,
            message.roomCode,
            message.actionType,
            { rng },
          );
          if (!res.ok) {
            sendJson(socket, {
              type: 'ACTION_ERROR',
              code: res.code,
              messageVi: res.messageVi,
            });
            return;
          }
          sendJson(socket, {
            type: 'ACTION_ACK',
            actionType: `REFEREE:${message.actionType}`,
          });
          return;
        }
      }
    },

    scheduleAllActiveRooms(): void {
      for (const roomCode of deps.roomManager.getAllActiveRoomCodes()) {
        scheduleRoomRuntime(roomCode);
      }
    },

    shutdown(): void {
      isShutDown = true;
      unsubscribeRoomUpdates();
      for (const timer of disconnectGraceByUserId.values()) {
        clearTimeout(timer);
      }
      disconnectGraceByUserId.clear();
      for (const roomCode of Array.from(roomTimersByCode.keys())) {
        clearRoomTimers(roomCode);
      }
      for (const roomCode of Array.from(hostFailoverTimersByCode.keys())) {
        clearHostFailoverTimer(roomCode);
      }
      sentMatchEndedIds.clear();
      onlineSocketsByUserId.clear();
      socketToUserId.clear();
    },
  };
}
