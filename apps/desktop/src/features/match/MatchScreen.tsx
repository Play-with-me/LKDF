import { orderHand } from './handOrder.js';
import { readDevicePreference, writeDevicePreference } from '../../lib/devicePreferences.js';
import type {
  GameAction,
  HeroId,
  RefereeActionType,
} from '@lkdf/shared';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import { playMatchCue, setMatchSoundEnabled } from '../../lib/soundFx.js';
import { useGameAmbience } from '../../lib/useGameAmbience.js';
import type { RoomViewerPayload, UserProfile } from '../../lib/types.js';
import { createRoomWsClient } from '../../lib/wsClient.js';
import type { RoomWsClient, WsConnectionStatus } from '../../lib/wsClient.js';
import { MatchQuickHudPills, MatchSettings } from './MatchSettings.js';
import { GameIcon } from '../../components/icons/index.js';
import { ActionLogDialog } from './ActionLogDialog.js';
import { GameOverSummaryModal } from './GameOverSummaryModal.js';
import { MatchActionSidebar } from './MatchActionSidebar.js';
import { MatchArenaLayout } from './MatchArenaLayout.js';
import { computeSeatStereoPan, playMatchActionCues } from './matchSounds.js';
import {
  EMPTY_MATCH_SELECTION,
  describePendingActorPrompt,
  formatMatchErrorVi,
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
  const [reduceMotion, setReduceMotion] = useState<boolean>(() =>
    readDevicePreference('reduceMotion'),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTogglingSound, setIsTogglingSound] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [showRulesDialog, setShowRulesDialog] = useState<boolean>(false);
  const [showRefereeDialog, setShowRefereeDialog] = useState<boolean>(false);

  const wsClientRef = useRef<RoomWsClient | null>(null);
  const lastSoundView = useRef<RoomViewerPayload['playerView']>(null);
  const impactSoundEndsAt = useRef(0);
  const prevAttentionRef = useRef<boolean>(false);
  const prevGameOverRef = useRef<boolean>(false);

  const roomCode = roomPayload.roomState.roomCode;
  const playerView = roomPayload.playerView;
  const isGameOver =
    playerView?.turnPhase === 'GAME_OVER' ||
    roomPayload.roomState.status === 'FINISHED';
  const isMatchActive =
    roomPayload.roomState.status === 'IN_GAME' && !isGameOver;
  const musicEnabled = currentUser.preferences.musicEnabled ?? currentUser.preferences.soundEnabled;
  const aliveCount = playerView ? playerView.players.filter((p) => p.alive).length : 0;
  const selfPlayer = playerView?.players.find((p) => p.seatIndex === playerView.viewerSeatIndex) ?? null;
  const isClimax = Boolean(
    isMatchActive &&
    playerView &&
    playerView.turnPhase !== 'HERO_SELECT' &&
    (aliveCount <= 3 || (selfPlayer?.alive && selfPlayer.hp <= 1)),
  );
  useGameAmbience(isMatchActive && musicEnabled ? 0.16 : 0, isClimax ? 'climax' : 'battle');

  useEffect(() => {
    setMatchSoundEnabled(currentUser.preferences.soundEnabled);
  }, [currentUser.preferences.soundEnabled]);

  const playRoomUpdateCues = useEffectEvent((view: RoomViewerPayload['playerView'], reason?: string) => {
    const previous = lastSoundView.current;
    lastSoundView.current = view;
    if (currentUser.preferences.soundEnabled &&
      reason !== 'SYNC_ON_CONNECT' && reason !== 'SUBSCRIBED' && reason !== 'REFEREE_UNDO_ONE_STEP') {
      const cues = playMatchActionCues(previous, view);
      if (cues.has('ELIMINATION')) impactSoundEndsAt.current = performance.now() + 520;
      else if (cues.has('DAMAGE')) impactSoundEndsAt.current = performance.now() + 210;
    }
  });

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
        if (nextStatus !== 'CONNECTED') lastSoundView.current = null;
        setWsStatus(nextStatus);
      },
      onRoomState: (payload, reason) => {
        playRoomUpdateCues(payload.playerView, reason);
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
        setActionError(formatMatchErrorVi(err.messageVi));
      },
    });
    wsClientRef.current = client;

    return () => {
      wsClientRef.current = null;
      client.close();
    };
  }, [onReturnToLobby, onSessionInvalid, roomCode, serverUrl, sessionToken, wsReconnectKey]);

  useEffect(() => {
    if (!actionError) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setActionError(null);
    }, 2800);
    return () => {
      window.clearTimeout(timer);
    };
  }, [actionError]);

  // Nháy Taskbar & âm thanh nhắc khi tới lượt hoặc cần phản ứng
  useEffect(() => {
    if (!playerView) {
      return;
    }
    const prompt = describePendingActorPrompt(playerView);
    const needsMyAttention = prompt.isMyTurn && !isGameOver;
    const cueDelay = Math.max(0, impactSoundEndsAt.current - performance.now()) / 1000;

    if (needsMyAttention && !prevAttentionRef.current) {
      const cueType = playerView.activeInterrupt ? 'ACTION_PROMPT' : 'TURN_START';
      playMatchCue(cueType, currentUser.preferences.soundEnabled, undefined, cueDelay);
      if (readDevicePreference('taskbarFlash')) {
        void window.lkdfDesktop?.flashTaskbarFrame(true).catch(() => undefined);
      }
    } else if (!needsMyAttention && prevAttentionRef.current) {
      void window.lkdfDesktop?.flashTaskbarFrame(false).catch(() => undefined);
    }
    prevAttentionRef.current = needsMyAttention;

    if (isGameOver && !prevGameOverRef.current) {
      const isWinner = playerView.winnerUserIds.includes(currentUser.userId);
      playMatchCue(
        isWinner ? 'VICTORY' : 'DEFEAT',
        currentUser.preferences.soundEnabled,
        undefined,
        cueDelay,
      );
    }
    prevGameOverRef.current = isGameOver;
  }, [currentUser.preferences.soundEnabled, currentUser.userId, isGameOver, playerView]);

  // Tiếng gõ mõ cảnh báo mỗi giây trong 5 giây cuối của lượt/phản ứng bản thân
  const lastTickedSecondRef = useRef<number | null>(null);
  const myTimedPromptActive = Boolean(
    isMatchActive &&
    playerView &&
    describePendingActorPrompt(playerView).isMyTurn &&
    !roomPayload.roomState.isTimerPaused &&
    roomPayload.phaseDeadlineAt &&
    currentUser.preferences.soundEnabled,
  );
  const phaseDeadlineAt = roomPayload.phaseDeadlineAt;

  useEffect(() => {
    lastTickedSecondRef.current = null;
    if (!myTimedPromptActive || !phaseDeadlineAt) {
      return undefined;
    }
    const deadlineMs = Date.parse(phaseDeadlineAt);
    if (Number.isNaN(deadlineMs)) {
      return undefined;
    }

    const checkTick = () => {
      const remaining = Math.ceil((deadlineMs - Date.now()) / 1000);
      if (remaining >= 1 && remaining <= 5 && lastTickedSecondRef.current !== remaining) {
        lastTickedSecondRef.current = remaining;
        playMatchCue('TIMER_TICK', true);
      }
    };

    checkTick();
    const interval = window.setInterval(checkTick, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [myTimedPromptActive, phaseDeadlineAt]);

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
        formatMatchErrorVi(err, 'Không thể đồng bộ trạng thái bàn đấu.'),
      );
    } finally {
      setIsSyncing(false);
    }
  }, [api, onReturnToLobby, onSessionInvalid, roomCode, sessionToken]);

  const handleReconnect = useCallback(() => {
    setWsReconnectKey((prev) => prev + 1);
    void handleManualSync();
  }, [handleManualSync]);

  const returningToLobbyRef = useRef(false);
  const handleReturnToLobbyClick = useCallback(async () => {
    if (returningToLobbyRef.current) return;
    returningToLobbyRef.current = true;
    setActionError(null);
    try {
      const resetPayload = await api.returnRoomToLobby(sessionToken, roomCode);
      onReturnToLobby(resetPayload);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      try {
        const latest = await api.getRoom(sessionToken, roomCode);
        if (latest.roomState.status === 'LOBBY') {
          onReturnToLobby(latest);
          return;
        }
        setActionError(
          formatMatchErrorVi(err, 'Không thể đưa phòng về sảnh chờ. Vui lòng thử lại.'),
        );
      } catch {
        setActionError(
          formatMatchErrorVi(err, 'Không thể đưa phòng về sảnh chờ. Vui lòng thử lại.'),
        );
      }
    } finally {
      returningToLobbyRef.current = false;
    }
  }, [api, onReturnToLobby, onSessionInvalid, roomCode, sessionToken]);

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
        formatMatchErrorVi(err, 'Không thể cập nhật cài đặt âm thanh.'),
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
        formatMatchErrorVi(err, 'Không thể rời bàn đấu.'),
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

  const handleToggleCard = useCallback(
    (cardId: string) => {
      const isMultiCardPhase = Boolean(
        playerView?.turnPhase === 'DISCARD' ||
          playerView?.activeInterrupt?.kind === 'ASK_QUAN_THACH_PHU' ||
          playerView?.activeInterrupt?.kind === 'WAIT_GANG_LIE_CHOICE',
      );
      setSelection((prev) => {
        const allowMulti =
          isMultiCardPhase ||
          prev.activeSkillMode === 'ren_de' ||
          prev.activeSkillMode === 'zhi_heng' ||
          prev.activeSkillMode === 'jie_yin' ||
          prev.activeConvertMode === 'truong_bat';
        const exists = prev.selectedCardIds.includes(cardId);
        if (exists) {
          const nextCards = prev.selectedCardIds.filter((id) => id !== cardId);
          return {
            ...prev,
            selectedCardIds: nextCards,
            selectedTargets: nextCards.length === 0 ? [] : prev.selectedTargets,
          };
        }
        return {
          ...prev,
          selectedCardIds: allowMulti ? [...prev.selectedCardIds, cardId] : [cardId],
          selectedTargets: allowMulti ? prev.selectedTargets : [],
        };
      });
    },
    [playerView?.activeInterrupt?.kind, playerView?.turnPhase],
  );

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

  const handleToggleReduceMotion = useCallback((enabled: boolean) => {
    writeDevicePreference('reduceMotion', enabled);
    setReduceMotion(enabled);
  }, []);

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

      if (showLogDialog || showRulesDialog || showRefereeDialog || isGameOver) {
        if (event.key === 'Escape') {
          if (showLogDialog) {
            setShowLogDialog(false);
          } else if (showRulesDialog) {
            setShowRulesDialog(false);
          } else if (showRefereeDialog) {
            setShowRefereeDialog(false);
          }
        }
        return;
      }

      if (!playerView || playerView.turnPhase === 'HERO_SELECT') {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearSelection();
        return;
      }

      if (document.querySelector('[data-reordering-hand="true"]')) {
        if (
          (event.key >= '1' && event.key <= '9') ||
          event.key === 'e' ||
          event.key === 'E'
        ) {
          event.preventDefault();
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          if (target?.closest('button.lkdf-hand-card, [data-hand-card-id]')) {
            event.preventDefault();
          }
          return;
        }
      }

      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1;
        const selfPlayer = playerView.players.find(
          (p) => p.seatIndex === playerView.viewerSeatIndex,
        );
        const card = orderHand(playerView.matchId, selfPlayer?.handCards ?? [])[index];
        if (card) {
          event.preventDefault();
          handleToggleCard(card.id);
        }
        return;
      }

      if (
        (event.key === 'e' || event.key === 'E') &&
        playerView.turnPhase === 'PLAY' &&
        playerView.currentTurnSeat === playerView.viewerSeatIndex &&
        !playerView.activeInterrupt
      ) {
        event.preventDefault();
        handleEndPlayPhase();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (event.defaultPrevented) {
          return;
        }
        const primaryButton = document.querySelector<HTMLButtonElement>(
          'button[data-primary-action="true"]:not(:disabled)',
        );
        if (primaryButton) {
          event.preventDefault();
          primaryButton.click();
          return;
        }
        if (
          event.key === 'Enter' &&
          target?.closest('button.lkdf-hand-card, [data-hand-card-id] button')
        ) {
          event.preventDefault();
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
    showLogDialog,
    showRefereeDialog,
    showRulesDialog,
  ]);

  const seatCount = roomPayload.roomState.seats.length;
  const roundNumber = playerView?.roundNumber ?? 1;
  const drawPileCount = playerView?.drawPileCount ?? 0;

  return (
    <section className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <MatchSettings
        topRightExtra={
          <MatchQuickHudPills
            autoSkipNullification={autoSkipNullification}
            onToggleAutoSkip={handleToggleAutoSkipNullification}
            actionLogCount={playerView?.actionLog.length ?? 0}
            onOpenLog={() => setShowLogDialog(true)}
            onOpenRules={() => setShowRulesDialog(true)}
            onOpenReferee={() => setShowRefereeDialog(true)}
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
            <input type="checkbox" checked={autoSkipNullification} onChange={(event) => handleToggleAutoSkipNullification(event.target.checked)} className="accent-[#D99B26]" />
            Tự bỏ qua Vô Giải
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
            <input type="checkbox" checked={reduceMotion} onChange={(event) => handleToggleReduceMotion(event.target.checked)} className="accent-[#D99B26]" />
            Giảm chuyển động
          </label>
        </div>
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#CA9A48]/60 bg-[#9E2B25] font-serif-title text-[12px] font-bold text-[#F5EBDC] shadow-inner">
            殺
          </span>
          <span className="font-mono-num shrink-0 font-bold text-[#D4A451]">
            Phòng #{roomCode} <span className="hidden lg:inline">({seatCount} người)</span>
          </span>
          <span className="text-[#4B5563]">·</span>
          <span className="font-mono-num shrink-0 font-semibold text-[#EFE6D5] tabular-nums">
            Vòng {roundNumber}
          </span>
          <span className="text-[#4B5563]">·</span>
          <span className="font-mono-num shrink-0 text-[#B5A792] tabular-nums">
            Rút: {drawPileCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Hiệu ứng âm thanh"
            aria-pressed={currentUser.preferences.soundEnabled}
            disabled={isTogglingSound}
            onClick={() => {
              void handleToggleSound();
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] disabled:opacity-50 xl:text-xs"
          >
            <GameIcon
              name={currentUser.preferences.soundEnabled ? 'ui:volume-on' : 'ui:volume-off'}
              size={13}
            />
            <span className="lg:hidden">Âm thanh</span>
            <span className="hidden lg:inline">Hiệu ứng âm thanh</span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              void handleManualSync();
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#D1D5DB] hover:border-[#D99B26] disabled:opacity-50 xl:text-xs"
          >
            <GameIcon
              name={isSyncing ? 'ui:loader' : 'ui:refresh'}
              size={13}
              className={isSyncing ? 'animate-spin' : ''}
            />
            <span>{isSyncing ? 'Đồng bộ...' : 'Đồng bộ'}</span>
          </button>

          <button
            type="button"
            disabled={isLeavingRoom}
            onClick={() => {
              void handleLeaveRoom();
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#FCA5A5] hover:border-[#DC2626] disabled:opacity-50 xl:text-xs"
          >
            <GameIcon name="ui:door-open" size={13} />
            <span>{isLeavingRoom ? 'Đang rời...' : 'Rời bàn'}</span>
          </button>
        </div>
      </MatchSettings>

      {/* VÙNG 2, 3, 4: BÀN ĐẤU VÒNG CHỮ U + THANH LỆNH NGỮ CẢNH + TRANG BỊ NGỬA + KHOANG KỸ NĂNG */}
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
            actionErrorVi={actionError}
            connectionLost={wsStatus === 'DISCONNECTED'}
            onReconnect={handleReconnect}
            onToggleCard={handleToggleCard}
            onToggleTarget={handleToggleTarget}
            onCardLift={() => playMatchCue('CARD_LIFT', currentUser.preferences.soundEnabled)}
            onTargetLock={(seatIndex) =>
              playMatchCue('TARGET_LOCK', currentUser.preferences.soundEnabled, undefined, 0, {
                pan: computeSeatStereoPan(seatIndex, playerView.viewerSeatIndex, playerView.players.length),
              })
            }
            onToggleSkillMode={handleToggleSkillMode}
            onToggleConvertMode={handleToggleConvertMode}
            onSendAction={handleSendAction}
            onSelectHero={handleSelectHero}
            onClearSelection={handleClearSelection}
            renderActionSidebar={() => (
              <MatchActionSidebar
                view={playerView}
                selection={selection}
                layout="bar"
                onClearSelection={handleClearSelection}
                onSendAction={handleSendAction}
                onEndPlayPhase={handleEndPlayPhase}
              />
            )}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#806345]/60 bg-[#18120E] px-6 py-4 text-sm text-[#EDE3D2]">
            <GameIcon name="ui:loader" size={16} className="animate-spin text-[#D99B26]" />
            Đang tải trạng thái bàn đấu...
          </div>
        </div>
      )}

      {/* CÁC HỘP THOẠI PHỤ (<dialog>) */}
      <ActionLogDialog
        open={showLogDialog}
        actionLog={playerView?.actionLog ?? []}
        onClose={() => setShowLogDialog(false)}
      />

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
            void handleReturnToLobbyClick();
          }}
          onLeaveRoom={() => {
            void handleLeaveRoom();
          }}
        />
      ) : null}
    </section>
  );
}
