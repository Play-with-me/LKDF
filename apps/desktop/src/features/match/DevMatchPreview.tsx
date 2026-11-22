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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameAmbience } from '../../lib/useGameAmbience.js';
import { useInterfaceSounds } from '../../lib/useInterfaceSounds.js';
import { playMatchCue } from '../../lib/soundFx.js';
import { MatchSettings } from './MatchSettings.js';
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
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
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
    const isSimulatedNullify =
      prompt.kind === 'WAIT_NULLIFICATION' && prompt.isSimulatedDelay;
    const botActorSeat =
      prompt.kind === 'WAIT_NULLIFICATION' && !isSimulatedNullify
        ? prompt.actorSeats.find((s) => s !== 0)
        : prompt.actorSeats.includes(0)
          ? undefined
          : prompt.actorSeats[0];

    if (!isSimulatedNullify && botActorSeat === undefined) {
      return undefined;
    }

    const delayMs = isSimulatedNullify ? 80 : 350;
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

        if (isSimulatedNullify) {
          setMasterState((prev) =>
            applyGameAction(prev, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }),
          );
          return;
        }

        if (botActorSeat === undefined) return;
        const actorUserId = masterState.players[botActorSeat]?.userId;
        if (!actorUserId) return;
        const view = projectStateForPlayer(masterState, actorUserId);
        const action = decideBotAction(view);
        setMasterState((prev) => applyGameAction(prev, action));
      } catch {
        // Dừng nhẹ nếu hết trạng thái hợp lệ trong bản xem thử cục bộ
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPaused, masterState]);

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

  const playerView = useMemo(() => {
    const view = projectStateForPlayer(masterState, 'dev_user_0');
    return {
      ...view,
      players: view.players.map((player) => ({
        ...player,
        isBotTakeover: player.seatIndex !== view.viewerSeatIndex,
      })),
    };
  }, [masterState]);

  const lastSoundView = useRef<typeof playerView | null>(null);
  const musicActive = musicEnabled && playerView.turnPhase !== 'GAME_OVER';
  useInterfaceSounds(soundEnabled, musicActive);
  useGameAmbience(musicActive ? 0.16 : 0, 'battle');
  useEffect(() => {
    if (soundEnabled) playMatchActionCues(lastSoundView.current, playerView);
    lastSoundView.current = playerView;
  }, [playerView, soundEnabled]);

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
        setActionError(formatMatchErrorVi(err, 'Không thể chọn tướng.'));
        return prev;
      }
    });
  }, []);

  const handleSendAction = useCallback((action: GameAction) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        const next = applyGameAction(prev, action);
        setUndoHistory((hist) => [...hist.slice(-4), prev]);
        setSelection(EMPTY_MATCH_SELECTION);
        return next;
      } catch (err: unknown) {
        setActionError(formatMatchErrorVi(err, 'Thao tác chưa hợp lệ.'));
        return prev;
      }
    });
  }, []);

  const handleToggleAutoSkipNullify = useCallback(
    (enabled: boolean) => {
      setAutoSkipNullify(enabled);
      handleSendAction({
        type: 'SET_AUTO_SKIP_NULLIFICATION',
        seatIndex: 0,
        enabled,
      });
    },
    [handleSendAction],
  );

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

  const handleToggleCard = useCallback(
    (cardId: string) => {
      const isMultiCardPhase = Boolean(
        playerView.turnPhase === 'DISCARD' ||
          playerView.activeInterrupt?.kind === 'ASK_QUAN_THACH_PHU' ||
          playerView.activeInterrupt?.kind === 'WAIT_GANG_LIE_CHOICE',
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
    [playerView.activeInterrupt?.kind, playerView.turnPhase],
  );

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
  const decisionKey = prompt.actorSeat === null ? null : [
    playerView.matchId,
    playerView.roundNumber,
    playerView.currentTurnSeat,
    playerView.turnPhase,
    playerView.activeInterrupt?.id,
    prompt.actorSeat,
  ].join(':');
  const timerConfig = { ...TIMER_PRESETS.STANDARD, reactionSeconds: 20 };
  const decisionSeconds = playerView.activeInterrupt ? timerConfig.reactionSeconds :
    playerView.turnPhase === 'DISCARD' ? timerConfig.discardSeconds : timerConfig.mainTurnSeconds;
  const phaseDeadlineAt = useMemo(
    () => decisionKey === null ? null : new Date(Date.now() + decisionSeconds * 1000).toISOString(),
    [decisionKey, decisionSeconds, isPaused],
  );

  // Tự động xử lý khi hết giờ (0s) trong bản xem thử cục bộ để không bị treo
  useEffect(() => {
    if (isPaused || !phaseDeadlineAt || masterState.turnPhase === 'GAME_OVER') {
      return undefined;
    }
    const deadlineMs = Date.parse(phaseDeadlineAt);
    if (Number.isNaN(deadlineMs)) {
      return undefined;
    }
    const delayMs = Math.max(100, deadlineMs - Date.now());
    const timer = window.setTimeout(() => {
      setMasterState((prev) => {
        try {
          if (prev.turnPhase === 'GAME_OVER') return prev;
          if (prev.turnPhase === 'HERO_SELECT') {
            let next = autoSelectTimedOutHeroes(prev);
            if (next.heroDraft?.stage === 'COMPLETED') {
              next = startMatchCombat(next);
            }
            return next;
          }
          const pending = getPendingPrompt(prev);
          if (!pending) return prev;
          if (pending.kind === 'WAIT_NULLIFICATION' && pending.isSimulatedDelay) {
            return applyGameAction(prev, { type: 'RESOLVE_SIMULATED_NULLIFICATION' });
          }
          const actorSeat = pending.actorSeats[0];
          if (actorSeat === undefined) return prev;
          if (pending.kind === 'WAIT_NULLIFICATION') {
            return applyGameAction(prev, {
              type: 'RESPOND_NULLIFICATION',
              seatIndex: actorSeat,
              cardId: null,
            });
          }
          const actorUserId = prev.players[actorSeat]?.userId;
          if (!actorUserId) return prev;
          const view = projectStateForPlayer(prev, actorUserId);
          const action = decideBotAction(view);
          return applyGameAction(prev, action);
        } catch {
          return prev;
        }
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPaused, masterState.turnPhase, phaseDeadlineAt]);

  return (
    <section className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <MatchSettings
        topRightExtra={
          <button
            type="button"
            title="Tự động bỏ qua cơ hội Vô Giải Khả Kích toàn bàn"
            aria-pressed={autoSkipNullify}
            onClick={() => handleToggleAutoSkipNullify(!autoSkipNullify)}
            className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] leading-tight font-semibold whitespace-nowrap transition-colors ${
              autoSkipNullify
                ? 'border-[#D99B26] bg-[#D99B26]/20 text-[#FDE68A]'
                : 'border-[#9A7B4F]/60 bg-[#14100D]/95 text-[#D1D5DB] hover:border-[#D99B26]'
            }`}
          >
            <span className="hidden lg:inline">
              {autoSkipNullify ? '✓ Tự bỏ qua Vô Giải' : 'Tự bỏ qua Vô Giải'}
            </span>
            <span className="lg:hidden">
              {autoSkipNullify ? '✓ Bỏ Vô Giải' : 'Bỏ Vô Giải'}
            </span>
          </button>
        }
      >
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
          <input
            type="checkbox"
            checked={autoSkipNullify}
            onChange={(event) => handleToggleAutoSkipNullify(event.target.checked)}
            className="accent-[#D99B26]"
          />
          Tự bỏ qua Vô Giải
        </label>
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
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
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Hiệu ứng âm thanh"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled(enabled => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name={soundEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span className="hidden lg:inline">Hiệu ứng âm thanh</span>
          </button>
          <button
            type="button"
            aria-label="Nhạc nền"
            aria-pressed={musicEnabled}
            onClick={() => setMusicEnabled(enabled => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:px-2.5 xl:text-xs"
          >
            <GameIcon name={musicEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span>Nhạc nền</span>
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
      </MatchSettings>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MatchArenaLayout
          playerView={playerView}
          roomSeats={roomState.seats}
          timerConfig={timerConfig}
          phaseDeadlineAt={phaseDeadlineAt}
          pausedRemainingMs={isPaused ? decisionSeconds * 1000 : null}
          isTimerPaused={isPaused}
          selection={selection}
          actionErrorVi={actionError}
          connectionLost={false}
          onReconnect={() => resetPreview(playerCount, previewStage)}
          onToggleCard={handleToggleCard}
          onToggleTarget={handleToggleTarget}
          onCardLift={() => playMatchCue('CARD_LIFT', soundEnabled)}
          onTargetLock={(seatIndex) =>
            playMatchCue('TARGET_LOCK', soundEnabled, undefined, 0, {
              pan: computeSeatStereoPan(seatIndex, playerView.viewerSeatIndex, playerView.players.length),
            })
          }
          onToggleSkillMode={handleToggleSkillMode}
          onToggleConvertMode={handleToggleConvertMode}
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
