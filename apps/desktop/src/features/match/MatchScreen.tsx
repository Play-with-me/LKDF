import type {
  GameAction,
  HeroId,
  RefereeActionType,
} from '@lkdf/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import { playMatchCue } from '../../lib/soundFx.js';
import type { RoomViewerPayload, UserProfile } from '../../lib/types.js';
import { createRoomWsClient } from '../../lib/wsClient.js';
import type { RoomWsClient, WsConnectionStatus } from '../../lib/wsClient.js';
import { GameOverSummaryModal } from './GameOverSummaryModal.js';
import { MatchActionSidebar } from './MatchActionSidebar.js';
import { MatchArenaLayout } from './MatchArenaLayout.js';
import {
  EMPTY_MATCH_SELECTION,
  describePendingActorPrompt,
  getRequiredTargetSpec,
} from './matchTypes.js';
import type {
  ConvertCardMode,
  MatchSelectionState,
  PlaySkillMode,
} from './matchTypes.js';
import { RefereePanelDialog } from './RefereePanelDialog.js';
import { RulesHotkeysDialog } from './RulesHotkeysDialog.js';

export interface MatchScreenProps {
  readonly api: LkdfApiClient;
  readonly serverUrl: string;
  readonly sessionToken: string;
  readonly currentUser: UserProfile;
  readonly initialRoom: RoomViewerPayload;
  readonly onProfileUpdated: (profile: UserProfile) => void;
  readonly onReturnToLobby: (roomPayload: RoomViewerPayload) => void;
  readonly onLeftRoom: () => void;
  readonly onSessionInvalid: (messageVi: string) => void;
}

export function MatchScreen({
  api,
  serverUrl,
  sessionToken,
  currentUser,
  initialRoom,
  onProfileUpdated,
  onReturnToLobby,
  onLeftRoom,
  onSessionInvalid,
}: MatchScreenProps) {
  const [roomPayload, setRoomPayload] = useState<RoomViewerPayload>(initialRoom);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CONNECTING');
  const [wsReconnectKey, setWsReconnectKey] = useState<number>(0);
  const [selection, setSelection] = useState<MatchSelectionState>(EMPTY_MATCH_SELECTION);
  const [autoSkipNullification, setAutoSkipNullification] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTogglingSound, setIsTogglingSound] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [showRulesDialog, setShowRulesDialog] = useState<boolean>(false);
  const [showRefereeDialog, setShowRefereeDialog] = useState<boolean>(false);

  const wsClientRef = useRef<RoomWsClient | null>(null);
  const prevAttentionRef = useRef<boolean>(false);
  const prevGameOverRef = useRef<boolean>(false);

  const roomCode = roomPayload.roomState.roomCode;
  const playerView = roomPayload.playerView;
  const isGameOver =
    playerView?.turnPhase === 'GAME_OVER' ||
    roomPayload.roomState.status === 'FINISHED';
  const isMatchActive =
    roomPayload.roomState.status === 'IN_GAME' && !isGameOver;

  useEffect(() => {
    setRoomPayload(initialRoom);
  }, [initialRoom]);

  // Chống đóng nhầm cửa sổ Windows khi đang trong ván đấu
  useEffect(() => {
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }
    void bridge.setMatchCloseGuard(isMatchActive).catch(() => undefined);
    return () => {
      void bridge.setMatchCloseGuard(false).catch(() => undefined);
    };
  }, [isMatchActive]);

  // Kết nối WebSocket phòng đấu
  useEffect(() => {
    const client = createRoomWsClient({
      serverUrl,
      sessionToken,
      roomCode,
      onStatusChange: (nextStatus) => {
        setWsStatus(nextStatus);
      },
      onRoomState: (payload) => {
        setRoomPayload(payload);
        setActionError(null);
        if (payload.roomState.status === 'LOBBY') {
          onReturnToLobby(payload);
        }
      },
      onAuthError: (err) => {
        onSessionInvalid(err.messageVi);
      },
      onSessionInvalidated: (info) => {
        onSessionInvalid(info.messageVi);
      },
      onActionError: (err) => {
        setActionError(err.messageVi);
      },
    });
    wsClientRef.current = client;

    return () => {
      wsClientRef.current = null;
      client.close();
    };
  }, [onReturnToLobby, onSessionInvalid, roomCode, serverUrl, sessionToken, wsReconnectKey]);

  // Nháy Taskbar & âm thanh nhắc khi tới lượt hoặc cần phản ứng
  useEffect(() => {
    if (!playerView) {
      return;
    }
    const prompt = describePendingActorPrompt(playerView);
    const needsMyAttention = prompt.isMyTurn && !isGameOver;

    if (needsMyAttention && !prevAttentionRef.current) {
      const cueType = playerView.activeInterrupt ? 'ACTION_PROMPT' : 'TURN_START';
      playMatchCue(cueType, currentUser.preferences.soundEnabled);
      void window.lkdfDesktop?.flashTaskbarFrame(true).catch(() => undefined);
    } else if (!needsMyAttention && prevAttentionRef.current) {
      void window.lkdfDesktop?.flashTaskbarFrame(false).catch(() => undefined);
    }
    prevAttentionRef.current = needsMyAttention;

    if (isGameOver && !prevGameOverRef.current) {
      playMatchCue('VICTORY', currentUser.preferences.soundEnabled);
    }
    prevGameOverRef.current = isGameOver;
  }, [currentUser.preferences.soundEnabled, isGameOver, playerView]);

  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    setActionError(null);
    try {
      const latest = await api.getRoom(sessionToken, roomCode);
      setRoomPayload(latest);
      if (latest.roomState.status === 'LOBBY') {
        onReturnToLobby(latest);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể đồng bộ trạng thái bàn đấu.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [api, onReturnToLobby, onSessionInvalid, roomCode, sessionToken]);

  const handleReconnect = useCallback(() => {
    setWsReconnectKey((prev) => prev + 1);
    void handleManualSync();
  }, [handleManualSync]);

  const handleToggleSound = useCallback(async () => {
    setIsTogglingSound(true);
    setActionError(null);
    try {
      const updatedProfile = await api.updatePreferences(sessionToken, {
        soundEnabled: !currentUser.preferences.soundEnabled,
      });
      onProfileUpdated(updatedProfile);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể cập nhật cài đặt âm thanh.',
      );
    } finally {
      setIsTogglingSound(false);
    }
  }, [api, currentUser.preferences.soundEnabled, onProfileUpdated, onSessionInvalid, sessionToken]);

  const handleLeaveRoom = useCallback(async () => {
    setIsLeavingRoom(true);
    setActionError(null);
    try {
      await api.leaveRoom(sessionToken, roomCode);
      onLeftRoom();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể rời bàn đấu.',
      );
    } finally {
      setIsLeavingRoom(false);
    }
  }, [api, onLeftRoom, onSessionInvalid, roomCode, sessionToken]);

  const handleSendAction = useCallback((action: GameAction) => {
    setActionError(null);
    wsClientRef.current?.sendGameAction(action);
  }, []);

  const handleSelectHero = useCallback((heroId: HeroId) => {
    setActionError(null);
    wsClientRef.current?.sendSelectHero(heroId);
  }, []);

  const handleSendRefereeAction = useCallback((actionType: RefereeActionType) => {
    setActionError(null);
    wsClientRef.current?.sendRefereeAction(actionType);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelection(EMPTY_MATCH_SELECTION);
  }, []);

  const handleToggleCard = useCallback((cardId: string) => {
    setSelection((prev) => {
      const exists = prev.selectedCardIds.includes(cardId);
      const nextCards = exists
        ? prev.selectedCardIds.filter((id) => id !== cardId)
        : [...prev.selectedCardIds, cardId];
      return {
        ...prev,
        selectedCardIds: nextCards,
        selectedTargets: exists ? [] : prev.selectedTargets,
      };
    });
  }, []);

  const handleToggleTarget = useCallback(
    (seatIndex: number) => {
      if (!playerView) {
        return;
      }
      setSelection((prev) => {
        const exists = prev.selectedTargets.includes(seatIndex);
        if (exists) {
          return {
            ...prev,
            selectedTargets: prev.selectedTargets.filter((s) => s !== seatIndex),
          };
        }
        const spec = getRequiredTargetSpec(playerView, prev);
        const maxTargets = Math.max(1, spec.maxTargets || 1);
        const nextTargets =
          prev.selectedTargets.length >= maxTargets
            ? [...prev.selectedTargets.slice(1), seatIndex]
            : [...prev.selectedTargets, seatIndex];
        return {
          ...prev,
          selectedTargets: nextTargets,
        };
      });
    },
    [playerView],
  );

  const handleToggleSkillMode = useCallback((skillId: PlaySkillMode) => {
    setSelection((prev) =>
      prev.activeSkillMode === skillId
        ? EMPTY_MATCH_SELECTION
        : {
            selectedCardIds: [],
            selectedTargets: [],
            activeSkillMode: skillId,
            activeConvertMode: null,
          },
    );
  }, []);

  const handleToggleConvertMode = useCallback((mode: ConvertCardMode) => {
    setSelection((prev) =>
      prev.activeConvertMode === mode
        ? EMPTY_MATCH_SELECTION
        : {
            selectedCardIds: [],
            selectedTargets: [],
            activeSkillMode: null,
            activeConvertMode: mode,
          },
    );
  }, []);

  const handleToggleAutoSkipNullification = useCallback(
    (enabled: boolean) => {
      setAutoSkipNullification(enabled);
      if (playerView) {
        handleSendAction({
          type: 'SET_AUTO_SKIP_NULLIFICATION',
          seatIndex: playerView.viewerSeatIndex,
          enabled,
        });
      }
    },
    [handleSendAction, playerView],
  );

  const handleEndPlayPhase = useCallback(() => {
    if (!playerView) {
      return;
    }
    handleSendAction({
      type: 'END_PLAY_PHASE',
      seatIndex: playerView.viewerSeatIndex,
    });
    setSelection(EMPTY_MATCH_SELECTION);
  }, [handleSendAction, playerView]);

  // Phím tắt toàn bàn: 1-9, Enter/Space, Esc, E
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (showRulesDialog || showRefereeDialog || isGameOver) {
        if (event.key === 'Escape') {
          if (showRulesDialog) {
            setShowRulesDialog(false);
          } else if (showRefereeDialog) {
            setShowRefereeDialog(false);
          }
        }
        return;
      }

      if (!playerView) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearSelection();
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1;
        const selfPlayer = playerView.players.find(
          (p) => p.seatIndex === playerView.viewerSeatIndex,
        );
        const card = selfPlayer?.handCards?.[index];
        if (card) {
          event.preventDefault();
          handleToggleCard(card.id);
        }
        return;
      }

      if (event.key === 'e' || event.key === 'E') {
        if (
          playerView.turnPhase === 'PLAY' &&
          playerView.currentTurnSeat === playerView.viewerSeatIndex &&
          !playerView.activeInterrupt
        ) {
          event.preventDefault();
          handleEndPlayPhase();
        }
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const primaryButton = document.querySelector<HTMLButtonElement>(
          'button[data-primary-action="true"]:not(:disabled)',
        );
        if (primaryButton) {
          event.preventDefault();
          primaryButton.click();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    handleClearSelection,
    handleEndPlayPhase,
    handleToggleCard,
    isGameOver,
    playerView,
    showRefereeDialog,
    showRulesDialog,
  ]);

  const seatCount = roomPayload.roomState.seats.length;
  const roundNumber = playerView?.roundNumber ?? 1;
  const drawPileCount = playerView?.drawPileCount ?? 0;

  return (
    <section className="flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#14171A] text-[#F3F4F6]">
      {/* VÙNG 1: THANH ĐẦU TRANG CỐ ĐỊNH CAO 48px */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#2D343C] bg-[#1E2328] px-4">
        <div className="flex min-w-0 items-center gap-3 text-xs">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#D99B26]/60 bg-[#C83E37] font-serif-title text-[11px] font-bold text-[#F4EFE6]">
            Sát
          </span>
          <span className="font-mono-num font-bold text-[#D99B26]">
            Phòng #{roomCode} ({seatCount} người)
          </span>
          <span className="text-[#4B5563]">·</span>
          <span className="font-mono-num font-semibold text-[#F3F4F6] tabular-nums">
            Vòng {roundNumber}
          </span>
          <span className="text-[#4B5563]">·</span>
          <span className="font-mono-num text-[#D1D5DB] tabular-nums">
            Bài rút: {drawPileCount}
          </span>
          {actionError ? (
            <span className="truncate rounded border border-[#DC2626]/50 bg-[#DC2626]/15 px-2 py-0.5 text-[11px] text-[#FCA5A5]">
              {actionError}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={isTogglingSound}
            onClick={() => {
              void handleToggleSound();
            }}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-2.5 py-1 text-xs font-medium text-[#F3F4F6] hover:border-[#D99B26] disabled:opacity-50"
          >
            {currentUser.preferences.soundEnabled ? '🔊 Âm thanh' : '🔇 Tắt tiếng'}
          </button>

          <button
            type="button"
            onClick={() => setShowRulesDialog(true)}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-2.5 py-1 text-xs font-medium text-[#F3F4F6] hover:border-[#D99B26]"
          >
            📖 Luật & Phím tắt
          </button>

          <button
            type="button"
            onClick={() => setShowRefereeDialog(true)}
            className="rounded-lg border border-[#D99B26]/50 bg-[#D99B26]/10 px-2.5 py-1 text-xs font-semibold text-[#FDE68A] hover:bg-[#D99B26]/20"
          >
            ⚖️ Trọng tài
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              void handleManualSync();
            }}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-2.5 py-1 text-xs font-medium text-[#D1D5DB] hover:border-[#D99B26] disabled:opacity-50"
          >
            {isSyncing ? '⏳ Đồng bộ...' : '🔄 Đồng bộ'}
          </button>

          <button
            type="button"
            disabled={isLeavingRoom}
            onClick={() => {
              void handleLeaveRoom();
            }}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-2.5 py-1 text-xs font-medium text-[#FCA5A5] hover:border-[#DC2626] disabled:opacity-50"
          >
            {isLeavingRoom ? 'Đang rời...' : '🚪 Rời bàn'}
          </button>
        </div>
      </header>

      {/* VÙNG 2, 3, 4: BÀN ĐẤU VÒNG CHỮ U + THANH TAY BÀI & CỘT HÀNH ĐỘNG */}
      {playerView ? (
        <div className="flex flex-1 min-h-0 min-w-0 flex-col">
          <MatchArenaLayout
            playerView={playerView}
            roomSeats={roomPayload.roomState.seats}
            timerConfig={roomPayload.timerConfig}
            phaseDeadlineAt={roomPayload.phaseDeadlineAt}
            pausedRemainingMs={roomPayload.pausedRemainingMs}
            isTimerPaused={roomPayload.roomState.isTimerPaused}
            selection={selection}
            autoSkipNullification={autoSkipNullification}
            connectionLost={wsStatus === 'DISCONNECTED'}
            onReconnect={handleReconnect}
            onToggleCard={handleToggleCard}
            onToggleTarget={handleToggleTarget}
            onToggleSkillMode={handleToggleSkillMode}
            onToggleConvertMode={handleToggleConvertMode}
            onToggleAutoSkipNullification={handleToggleAutoSkipNullification}
            onSendAction={handleSendAction}
            onSelectHero={handleSelectHero}
            renderActionSidebar={() => (
              <MatchActionSidebar
                view={playerView}
                selection={selection}
                onClearSelection={handleClearSelection}
                onSendAction={handleSendAction}
                onEndPlayPhase={handleEndPlayPhase}
              />
            )}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
          <div className="rounded-xl border border-[#2D343C] bg-[#1E2328] px-6 py-4 text-sm text-[#D1D5DB]">
            ⏳ Đang tải trạng thái bàn đấu...
          </div>
        </div>
      )}

      {/* CÁC HỘP THOẠI PHỤ (<dialog>) */}
      <RulesHotkeysDialog
        open={showRulesDialog}
        onClose={() => setShowRulesDialog(false)}
      />

      <RefereePanelDialog
        open={showRefereeDialog}
        roomState={roomPayload.roomState}
        currentUserId={currentUser.userId}
        refereeAuditLog={roomPayload.refereeAuditLog}
        onSendRefereeAction={handleSendRefereeAction}
        onClose={() => setShowRefereeDialog(false)}
      />

      {playerView ? (
        <GameOverSummaryModal
          open={isGameOver}
          roomState={roomPayload.roomState}
          playerView={playerView}
          onReturnToLobby={() => {
            onReturnToLobby(roomPayload);
          }}
          onLeaveRoom={() => {
            void handleLeaveRoom();
          }}
        />
      ) : null}
    </section>
  );
}
