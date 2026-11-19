import {
  TIMER_PRESETS,
  applyGameAction,
  autoSelectTimedOutHeroes,
  createInitialMatchSetup,
  decideBotAction,
  getPendingPrompt,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
} from '@lkdf/shared';
import type {
  GameAction,
  HeroId,
  MasterGameState,
  PlayerCount,
  RefereeActionType,
  RefereeAuditEntry,
  RoomSeat,
  RoomState,
} from '@lkdf/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { playMatchCue } from '../../lib/soundFx.js';
import { getUiAssetUrl } from '../../lib/assetCatalog.js';
import { GameIcon } from '../../components/icons/index.js';
import { ActionLogDialog } from './ActionLogDialog.js';
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

const PREVIEW_NAMES = [
  'Bạn (Kiểm tra)',
  'Minh',
  'Hải',
  'Tuấn',
  'Linh',
  'Khánh',
  'Trang',
  'Phúc',
] as const;

export interface DevMatchPreviewProps {
  readonly initialPlayerCount?: PlayerCount;
  readonly onExitPreview: () => void;
}

function buildPreviewSeats(count: PlayerCount): RoomSeat[] {
  return Array.from({ length: count }, (_, idx) => ({
    seatIndex: idx,
    userId: `dev_user_${idx}`,
    displayName: PREVIEW_NAMES[idx] ?? `Ghế ${idx + 1}`,
    avatarUrl: '',
    connectionStatus: 'ONLINE',
    isBotTakeover: false,
  }));
}

function createPreviewMatchState(
  count: PlayerCount,
  mode: 'HERO_SELECT' | 'IN_PLAY',
): MasterGameState {
  const seats = buildPreviewSeats(count);
  let state = createInitialMatchSetup({
    matchId: `dev_preview_${count}`,
    seats,
  });

  if (mode === 'HERO_SELECT') {
    const lordSeat = state.heroDraft?.lordSeatIndex ?? 0;
    if (lordSeat !== 0) {
      const firstCand = state.heroDraft?.candidatesBySeat[lordSeat]?.[0];
      if (firstCand) {
        state = selectLordHero(state, lordSeat, firstCand);
      }
    }
    return state;
  }

  state = autoSelectTimedOutHeroes(state);
  state = startMatchCombat(state);
  return state;
}

export function DevMatchPreview({
  initialPlayerCount = 8,
  onExitPreview,
}: DevMatchPreviewProps) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(initialPlayerCount);
  const [previewStage, setPreviewStage] = useState<'HERO_SELECT' | 'IN_PLAY'>('IN_PLAY');
  const [masterState, setMasterState] = useState<MasterGameState>(() =>
    createPreviewMatchState(initialPlayerCount, 'IN_PLAY'),
  );
  const [undoHistory, setUndoHistory] = useState<MasterGameState[]>([]);
  const [auditLog, setAuditLog] = useState<RefereeAuditEntry[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoSkipNullify, setAutoSkipNullify] = useState<boolean>(false);
  const [selection, setSelection] = useState<MatchSelectionState>(EMPTY_MATCH_SELECTION);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [showRulesDialog, setShowRulesDialog] = useState<boolean>(false);
  const [showRefereeDialog, setShowRefereeDialog] = useState<boolean>(false);

  const resetPreview = useCallback(
    (nextCount: PlayerCount, nextStage: 'HERO_SELECT' | 'IN_PLAY') => {
      setPlayerCount(nextCount);
      setPreviewStage(nextStage);
      setMasterState(createPreviewMatchState(nextCount, nextStage));
      setUndoHistory([]);
      setAuditLog([]);
      setIsPaused(false);
      setSelection(EMPTY_MATCH_SELECTION);
      setActionError(null);
    },
    [],
  );

  // Bật bảo vệ đóng cửa sổ Windows khi đang xem thử bàn đấu
  useEffect(() => {
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }
    const active = masterState.turnPhase !== 'GAME_OVER';
    void bridge.setMatchCloseGuard(active).catch(() => undefined);
    return () => {
      void bridge.setMatchCloseGuard(false).catch(() => undefined);
    };
  }, [masterState.turnPhase]);

  // Cho các ghế Bot còn lại tự đi mượt khi không phải lượt của Ghế #1 (dev_user_0)
  useEffect(() => {
    if (isPaused || masterState.turnPhase === 'GAME_OVER') {
      return undefined;
    }
    const prompt = getPendingPrompt(masterState);
    if (!prompt) {
      return undefined;
    }
    if (prompt.actorSeats.includes(0)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      try {
        if (masterState.turnPhase === 'HERO_SELECT') {
          const draft = masterState.heroDraft;
          if (!draft) return;
          if (draft.stage === 'LORD_SELECTING' && draft.lordSeatIndex !== 0) {
            const hero = draft.candidatesBySeat[draft.lordSeatIndex]?.[0];
            if (hero) {
              setMasterState((prev) => selectLordHero(prev, draft.lordSeatIndex, hero));
            }
          }
          return;
        }

        if (prompt.kind === 'WAIT_NULLIFICATION' && prompt.isSimulatedDelay) {
          setMasterState((prev) =>
            applyGameAction(prev, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }),
          );
          return;
        }

        const actorSeat = prompt.actorSeats[0];
        if (actorSeat === undefined) return;
        const actorUserId = masterState.players[actorSeat]?.userId;
        if (!actorUserId) return;
        const view = projectStateForPlayer(masterState, actorUserId);
        const action = decideBotAction(view);
        setMasterState((prev) => applyGameAction(prev, action));
      } catch {
        // Dừng nhẹ nếu hết trạng thái hợp lệ trong bản xem thử cục bộ
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPaused, masterState]);

  const isFuseDemo = new URLSearchParams(window.location.search).has('demoFuse');
  const playerView = useMemo(() => {
    const view = projectStateForPlayer(masterState, 'dev_user_0');
    if (!isFuseDemo) return view;
    return {
      ...view,
      players: view.players.map((player) => ({
        ...player,
        isBotTakeover: player.seatIndex !== view.viewerSeatIndex,
      })),
    };
  }, [isFuseDemo, masterState]);

  const roomState: RoomState = useMemo(
    () => ({
      roomCode: 'DEV42P',
      status: masterState.turnPhase === 'GAME_OVER' ? 'FINISHED' : 'IN_GAME',
      ownerUserId: 'dev_user_0',
      actingHostUserId: 'dev_user_0',
      hostDisconnectedAt: null,
      timerPreset: 'STANDARD',
      isTimerPaused: isPaused,
      seats: buildPreviewSeats(playerCount),
    }),
    [isPaused, masterState.turnPhase, playerCount],
  );

  const formatPreviewErrorVi = useCallback((err: unknown, fallback: string): string => {
    const raw = err instanceof Error ? err.message : '';
    if (!raw) return fallback;
    if (raw === 'SIMULATED_DELAY_CANNOT_BE_ANSWERED_BY_PLAYER') {
      return 'Đang giữ nhịp chờ Vô Giải (2–3.5s) để tránh lộ bài.';
    }
    return /^[A-Z0-9_]+$/.test(raw) ? fallback : raw;
  }, []);

  const handleSelectHero = useCallback((heroId: HeroId) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        let next =
          prev.heroDraft?.stage === 'LORD_SELECTING'
            ? selectLordHero(prev, 0, heroId)
            : selectPlayerHero(prev, 0, heroId);
        next = autoSelectTimedOutHeroes(next);
        if (next.heroDraft?.stage === 'COMPLETED') {
          next = startMatchCombat(next);
        }
        return next;
      } catch (err: unknown) {
        setActionError(formatPreviewErrorVi(err, 'Không thể chọn tướng.'));
        return prev;
      }
    });
  }, [formatPreviewErrorVi]);

  const handleSendAction = useCallback((action: GameAction) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        const next = applyGameAction(prev, action);
        setUndoHistory((hist) => [...hist.slice(-4), prev]);
        setSelection(EMPTY_MATCH_SELECTION);
        return next;
      } catch (err: unknown) {
        setActionError(formatPreviewErrorVi(err, 'Thao tác chưa hợp lệ.'));
        return prev;
      }
    });
  }, [formatPreviewErrorVi]);

  const handleRefereeAction = useCallback(
    (actionType: RefereeActionType) => {
      const entry: RefereeAuditEntry = {
        timestamp: new Date().toISOString(),
        actorUserId: 'dev_user_0',
        actorName: 'Bạn (Kiểm tra)',
        actionType,
      };
      setAuditLog((prev) => [...prev, entry]);

      if (actionType === 'PAUSE') {
        setIsPaused(true);
        return;
      }
      if (actionType === 'RESUME') {
        setIsPaused(false);
        return;
      }
      if (actionType === 'UNDO_ONE_STEP') {
        setUndoHistory((prev) => {
          const last = prev[prev.length - 1];
          if (!last) {
            setActionError('Chưa có bước trước đó để hoàn tác.');
            return prev;
          }
          setMasterState(last);
          return prev.slice(0, -1);
        });
        return;
      }
      if (actionType === 'ABORT_MATCH') {
        onExitPreview();
      }
    },
    [onExitPreview],
  );

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

  const handleEndPlayPhase = useCallback(() => {
    handleSendAction({
      type: 'END_PLAY_PHASE',
      seatIndex: playerView.viewerSeatIndex,
    });
  }, [handleSendAction, playerView.viewerSeatIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        showLogDialog ||
        showRulesDialog ||
        showRefereeDialog ||
        masterState.turnPhase === 'GAME_OVER'
      ) {
        if (event.key === 'Escape') {
          setShowLogDialog(false);
          setShowRulesDialog(false);
          setShowRefereeDialog(false);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelection(EMPTY_MATCH_SELECTION);
        return;
      }
      if (event.key >= '1' && event.key <= '9') {
        const card = playerView.players[0]?.handCards?.[Number(event.key) - 1];
        if (card) {
          event.preventDefault();
          handleToggleCard(card.id);
        }
        return;
      }
      if (
        (event.key === 'e' || event.key === 'E') &&
        playerView.turnPhase === 'PLAY' &&
        playerView.currentTurnSeat === 0 &&
        !playerView.activeInterrupt
      ) {
        event.preventDefault();
        handleEndPlayPhase();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[data-primary-action="true"]:not(:disabled)',
        );
        if (btn) {
          event.preventDefault();
          btn.click();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleEndPlayPhase,
    handleToggleCard,
    masterState.turnPhase,
    playerView,
    showLogDialog,
    showRefereeDialog,
    showRulesDialog,
  ]);

  const prompt = describePendingActorPrompt(playerView);
  // Ở chế độ xem thử cục bộ không ép hết giờ đỏ 0s gây hiểu nhầm khi đang quan sát
  const [phaseDeadlineAt] = useState(() =>
    new URLSearchParams(window.location.search).has('demoFuse')
      ? new Date(Date.now() + 20_000).toISOString()
      : null,
  );
  const headerBgUrl = getUiAssetUrl('tex-header-black');

  return (
    <section className="flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <header
        style={
          headerBgUrl
            ? {
                backgroundImage: `linear-gradient(rgba(12,10,8,0.28), rgba(10,8,7,0.42)), url(${headerBgUrl})`,
                backgroundSize: '100% 100%',
              }
            : undefined
        }
        className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#A68042]/40 bg-[#14110E] px-3"
      >
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="shrink-0 rounded border border-[#D99B26]/60 bg-[#9E2B25]/85 px-2 py-0.5 font-semibold text-[#FDE68A]">
            DEV · {playerCount}P
          </span>
          <div className="flex items-center gap-1">
            {([4, 5, 6, 7, 8] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => resetPreview(cnt, previewStage)}
                className={`cursor-pointer rounded px-1.5 py-0.5 font-mono-num text-[11px] font-bold ${
                  playerCount === cnt
                    ? 'bg-[#9E2B25] text-[#F4EFE6]'
                    : 'border border-[#9A7B4F]/40 bg-[#14100D]/90 text-[#D1D5DB] hover:border-[#D99B26]'
                }`}
              >
                {cnt}P
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              resetPreview(
                playerCount,
                previewStage === 'HERO_SELECT' ? 'IN_PLAY' : 'HERO_SELECT',
              )
            }
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-0.5 text-[11px] font-semibold text-[#D99B26] hover:border-[#D99B26]"
          >
            <GameIcon
              name={previewStage === 'HERO_SELECT' ? 'crown' : 'saber-slash'}
              size={12}
            />
            <span className="hidden sm:inline whitespace-nowrap shrink-0">
              <span className="lg:hidden">
                {previewStage === 'HERO_SELECT' ? 'Chọn tướng' : 'Đánh bài'}
              </span>
              <span className="hidden lg:inline">
                {previewStage === 'HERO_SELECT' ? 'Pha Chọn Tướng' : 'Pha Đánh Bài'}
              </span>
            </span>
          </button>
          <span className="font-mono-num hidden sm:inline shrink-0 whitespace-nowrap text-[#B5A792] tabular-nums">
            Rút: {playerView.drawPileCount}
          </span>
          {actionError ? (
            <span className="max-w-[240px] truncate rounded border border-[#DC2626]/50 bg-[#DC2626]/15 px-2 py-0.5 text-[11px] text-[#FCA5A5]">
              {actionError}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) {
                playMatchCue('TURN_START', true);
              }
              void window.lkdfDesktop?.flashTaskbarFrame(true).catch(() => undefined);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name={soundEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span className="hidden lg:inline">{soundEnabled ? 'Âm thanh' : 'Tắt tiếng'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLogDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name="scroll-unfurled" size={13} className="text-[#D99B26]" />
            <span>Nhật ký</span>
            <span className="font-mono-num rounded bg-[#272D35] px-1 py-0 text-[10px] font-bold text-[#FDE68A] tabular-nums">
              {playerView.actionLog.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowRulesDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name="ui:book-open" size={13} />
            <span>
              Luật <span className="hidden xl:inline">&amp; Phím tắt</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowRefereeDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#CA9A48]/50 bg-[#D99B26]/12 px-2 py-1 text-[11px] font-semibold text-[#FDE68A] hover:bg-[#D99B26]/22 xl:px-2.5 xl:text-xs"
          >
            <GameIcon name="scales" size={13} />
            Trọng tài
          </button>
          <button
            type="button"
            onClick={onExitPreview}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#FCA5A5] hover:border-[#DC2626] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name="ui:undo" size={13} />
            Thoát
          </button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MatchArenaLayout
          playerView={playerView}
          roomSeats={roomState.seats}
          timerConfig={phaseDeadlineAt ? { ...TIMER_PRESETS.STANDARD, mainTurnSeconds: 20, reactionSeconds: 20 } : TIMER_PRESETS.STANDARD}
          phaseDeadlineAt={phaseDeadlineAt}
          pausedRemainingMs={isPaused ? 20_000 : null}
          isTimerPaused={isPaused}
          selection={selection}
          autoSkipNullification={autoSkipNullify}
          connectionLost={false}
          onReconnect={() => resetPreview(playerCount, previewStage)}
          onToggleCard={handleToggleCard}
          onToggleTarget={handleToggleTarget}
          onToggleSkillMode={handleToggleSkillMode}
          onToggleConvertMode={handleToggleConvertMode}
          onToggleAutoSkipNullification={(enabled) => {
            setAutoSkipNullify(enabled);
            handleSendAction({
              type: 'SET_AUTO_SKIP_NULLIFICATION',
              seatIndex: 0,
              enabled,
            });
          }}
          onSendAction={handleSendAction}
          onSelectHero={handleSelectHero}
          onClearSelection={() => setSelection(EMPTY_MATCH_SELECTION)}
          renderActionSidebar={() => (
            <MatchActionSidebar
              view={playerView}
              selection={selection}
              layout="bar"
              onClearSelection={() => setSelection(EMPTY_MATCH_SELECTION)}
              onSendAction={handleSendAction}
              onEndPlayPhase={handleEndPlayPhase}
            />
          )}
        />
      </div>

      <ActionLogDialog
        open={showLogDialog}
        actionLog={playerView.actionLog}
        onClose={() => setShowLogDialog(false)}
      />

      <RulesHotkeysDialog
        open={showRulesDialog}
        onClose={() => setShowRulesDialog(false)}
      />

      <RefereePanelDialog
        open={showRefereeDialog}
        roomState={roomState}
        currentUserId="dev_user_0"
        refereeAuditLog={auditLog}
        onSendRefereeAction={handleRefereeAction}
        onClose={() => setShowRefereeDialog(false)}
      />

      <GameOverSummaryModal
        open={masterState.turnPhase === 'GAME_OVER'}
        roomState={roomState}
        playerView={playerView}
        onReturnToLobby={() => resetPreview(playerCount, 'IN_PLAY')}
        onLeaveRoom={onExitPreview}
      />
    </section>
  );
}
