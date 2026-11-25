import { orderHand } from './handOrder.js';
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
import { readDevicePreference, writeDevicePreference } from '../../lib/devicePreferences.js';
import { useGameAmbience } from '../../lib/useGameAmbience.js';
import { useInterfaceSounds } from '../../lib/useInterfaceSounds.js';
import { playMatchCue } from '../../lib/soundFx.js';
import { botDelayMs, finishOfflineNullification, getOfflineBotSeat, OFFLINE_NULLIFICATION_MS, runOfflineBotStep, scheduleBotStep } from './offlineBot.js';
import { MatchQuickHudPills, MatchSettings } from './MatchSettings.js';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';
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
  readonly offline?: boolean;
  readonly onExitPreview: () => void;
}

function buildPreviewSeats(count: PlayerCount, offline = false): RoomSeat[] {
  return Array.from({ length: count }, (_, idx) => ({
    seatIndex: idx,
    userId: `dev_user_${idx}`,
    displayName: offline ? (idx === 0 ? 'Bạn' : `Máy ${idx}`) : PREVIEW_NAMES[idx] ?? `Ghế ${idx + 1}`,
    avatarUrl: '',
    connectionStatus: 'ONLINE',
    isBotTakeover: false,
  }));
}

type PreviewStage = 'HERO_SELECT' | 'IN_PLAY' | 'GUAN_XING' | 'YI_JI' | 'GAME_OVER';

function createPreviewMatchState(
  count: PlayerCount,
  mode: PreviewStage,
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

  if (mode === 'GUAN_XING') {
    const gxCount = Math.min(5, count);
    const gxCards = state.drawPile.slice(0, gxCount);
    return {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'JUDGE',
      drawPile: state.drawPile.slice(gxCount),
      players: state.players.map((p, i) => (i === 0 ? { ...p, heroId: 'zhuge_liang' } : p)),
      interruptStack: [
        {
          id: 'dev_gx_1',
          kind: 'WAIT_GUAN_XING',
          targetSeat: 0,
          cards: gxCards,
        },
      ],
    };
  }

  if (mode === 'YI_JI') {
    const yjCards = state.drawPile.slice(0, 2);
    return {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      drawPile: state.drawPile.slice(2),
      players: state.players.map((p, i) => (i === 0 ? { ...p, heroId: 'guo_jia' } : p)),
      interruptStack: [
        {
          id: 'dev_yj_1',
          kind: 'WAIT_YI_JI',
          targetSeat: 0,
          cards: yjCards,
        },
      ],
    };
  }

  if (mode === 'GAME_OVER') {
    const winners = state.players
      .filter((p) => p.identity === 'LORD' || p.identity === 'LOYALIST')
      .map((p) => p.userId);
    return {
      ...state,
      turnPhase: 'GAME_OVER',
      winningFaction: 'LORD_LOYALIST',
      winnerUserIds: winners,
      players: state.players.map((p) =>
        p.identity === 'REBEL'
          ? { ...p, hp: 0, alive: false, isIdentityRevealed: true }
          : { ...p, isIdentityRevealed: true },
      ),
    };
  }

  return state;
}

export function DevMatchPreview({
  initialPlayerCount = 8,
  offline = false,
  onExitPreview,
}: DevMatchPreviewProps) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(initialPlayerCount);
  const [previewStage, setPreviewStage] = useState<PreviewStage>('IN_PLAY');
  const [masterState, setMasterState] = useState<MasterGameState>(() =>
    offline
      ? createInitialMatchSetup({ matchId: crypto.randomUUID(), manualDraw: true, seats: buildPreviewSeats(initialPlayerCount, true) })
      : createPreviewMatchState(initialPlayerCount, 'IN_PLAY'),
  );
  const [undoHistory, setUndoHistory] = useState<MasterGameState[]>([]);
  const [auditLog, setAuditLog] = useState<RefereeAuditEntry[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [autoSkipNullify, setAutoSkipNullify] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(() =>
    readDevicePreference('reduceMotion'),
  );
  const [selection, setSelection] = useState<MatchSelectionState>(EMPTY_MATCH_SELECTION);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [showRulesDialog, setShowRulesDialog] = useState<boolean>(false);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const lastBotTurn = useRef<string | null>(null);
  const [botFault, setBotFault] = useState(false);
  const [showRefereeDialog, setShowRefereeDialog] = useState<boolean>(false);

  const handleToggleReduceMotion = useCallback((enabled: boolean) => {
    writeDevicePreference('reduceMotion', enabled);
    setReduceMotion(enabled);
  }, []);

  const resetPreview = useCallback(
    (nextCount: PlayerCount, nextStage: PreviewStage) => {
      setPlayerCount(nextCount);
      setPreviewStage(nextStage);
      setMasterState(offline
        ? createInitialMatchSetup({ matchId: crypto.randomUUID(), manualDraw: true, seats: buildPreviewSeats(nextCount, true) })
        : createPreviewMatchState(nextCount, nextStage));
      lastBotTurn.current = null;
      setBotFault(false);
      setAutoSkipNullify(false);
      setUndoHistory([]);
      setAuditLog([]);
      setIsPaused(false);
      setSelection(EMPTY_MATCH_SELECTION);
      setActionError(null);
    },
    [offline],
  );

  // Bật bảo vệ đóng cửa sổ Windows khi đang xem thử bàn đấu
  useEffect(() => {
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }
    const active = masterState.turnPhase !== 'GAME_OVER';
    void bridge.setMatchCloseGuard(active, offline).catch(() => undefined);
    return () => {
      void bridge.setMatchCloseGuard(false).catch(() => undefined);
    };
  }, [masterState.turnPhase, offline]);

  // Cho các ghế Bot còn lại tự đi mượt khi không phải lượt của Ghế #1 (dev_user_0)
  useEffect(() => {
    if (offline || isPaused || masterState.turnPhase === 'GAME_OVER') {
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
  }, [isPaused, masterState, offline]);

  const isOpening =
    masterState.turnPhase === 'HERO_SELECT' &&
    masterState.heroDraft?.stage === 'COMPLETED';
  const openingMatchId = masterState.matchId;
  const openingDeadline = useMemo(
    () => (isOpening ? Date.now() + 3000 : null),
    [isOpening, openingMatchId],
  );
  useEffect(() => {
    if (openingDeadline === null) return;
    return scheduleBotStep(() => {
      setMasterState((current) => {
        if (
          current.matchId !== openingMatchId ||
          current.turnPhase !== 'HERO_SELECT' ||
          current.heroDraft?.stage !== 'COMPLETED'
        ) {
          return current;
        }
        return startMatchCombat(current);
      });
    }, Math.max(0, openingDeadline - Date.now()));
  }, [openingDeadline, openingMatchId]);

  const offlineBotSeat = offline && !botFault ? getOfflineBotSeat(masterState) : undefined;
  const offlineFrame = offline ? masterState.interruptStack.at(-1) : undefined;
  const nullificationId = offlineFrame?.kind === 'WAIT_NULLIFICATION' ? offlineFrame.id : null;
  const nullificationDeadline = useMemo(
    () => nullificationId === null ? null : Date.now() + OFFLINE_NULLIFICATION_MS,
    [nullificationId],
  );

  useEffect(() => {
    if (!offline || botFault || (offlineBotSeat === undefined && nullificationDeadline === null)) return;
    const turn = `${masterState.matchId}:${masterState.roundNumber}:${masterState.currentTurnSeat}`;
    const decision = offlineFrame
      ? 'reaction'
      : turn === lastBotTurn.current ? 'action' : 'turn';
    const remaining = nullificationDeadline === null ? Infinity : nullificationDeadline - Date.now();
    const delay = offlineBotSeat === undefined
      ? Math.max(0, remaining)
      : botDelayMs(decision, Math.random, remaining);
    return scheduleBotStep(() => {
      try {
        const expired = nullificationDeadline !== null && Date.now() >= nullificationDeadline;
        const next = expired || offlineBotSeat === undefined
          ? finishOfflineNullification(masterState)
          : runOfflineBotStep(masterState, offlineBotSeat, Math.random, true);
        if (!offlineFrame && masterState.turnPhase !== 'HERO_SELECT') lastBotTurn.current = turn;
        setMasterState(current => current === masterState ? next : current);
      } catch {
        setBotFault(true);
      }
    }, delay);
  }, [botFault, masterState, nullificationDeadline, offline, offlineBotSeat, offlineFrame]);

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
      roomCode: offline ? 'MÁY' : 'DEV42P',
      status: masterState.turnPhase === 'GAME_OVER' ? 'FINISHED' : 'IN_GAME',
      ownerUserId: 'dev_user_0',
      actingHostUserId: 'dev_user_0',
      hostDisconnectedAt: null,
      timerPreset: 'STANDARD',
      isTimerPaused: isPaused,
      seats: buildPreviewSeats(playerCount, offline),
    }),
    [isPaused, masterState.turnPhase, offline, playerCount],
  );

  const handleSelectHero = useCallback((heroId: HeroId) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        let next =
          prev.heroDraft?.stage === 'LORD_SELECTING'
            ? selectLordHero(prev, 0, heroId)
            : selectPlayerHero(prev, 0, heroId);
        if (!offline) next = autoSelectTimedOutHeroes(next);
        if (next.heroDraft?.stage === 'COMPLETED') {
          next = { ...next, turnPhase: 'HERO_SELECT' };
        }
        return next;
      } catch (err: unknown) {
        setActionError(formatMatchErrorVi(err, 'Không thể chọn tướng.'));
        return prev;
      }
    });
  }, [offline]);

  const handleSendAction = useCallback((action: GameAction) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        const next = applyGameAction(prev, action, Math.random, { deferNullificationPass: offline });
        if (!offline) setUndoHistory((hist) => [...hist.slice(-4), prev]);
        setSelection(EMPTY_MATCH_SELECTION);
        return next;
      } catch (err: unknown) {
        setActionError(formatMatchErrorVi(err, 'Thao tác chưa hợp lệ.'));
        return prev;
      }
    });
  }, [offline]);

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
      if (
        showLogDialog ||
        showRulesDialog ||
        showRefereeDialog ||
        showExitDialog ||
        masterState.turnPhase === 'GAME_OVER'
      ) {
        if (event.key === 'Escape') {
          setShowLogDialog(false);
          setShowRulesDialog(false);
          setShowRefereeDialog(false);
          setShowExitDialog(false);
        }
        return;
      }
      if (playerView.turnPhase === 'HERO_SELECT') {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelection(EMPTY_MATCH_SELECTION);
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
        const card = orderHand(playerView.matchId, playerView.players[0]?.handCards ?? [])[Number(event.key) - 1];
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
        if (event.defaultPrevented) {
          return;
        }
        const btn = document.querySelector<HTMLButtonElement>(
          'button[data-primary-action="true"]:not(:disabled)',
        );
        if (btn) {
          event.preventDefault();
          btn.click();
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
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleEndPlayPhase,
    handleToggleCard,
    masterState.turnPhase,
    playerView,
    showLogDialog,
    showRefereeDialog,
    showRulesDialog,
    showExitDialog,
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
  const timerConfig = {
    ...TIMER_PRESETS.STANDARD,
    reactionSeconds: offline ? OFFLINE_NULLIFICATION_MS / 1000 : 20,
  };
  const decisionSeconds = playerView.activeInterrupt ? timerConfig.reactionSeconds :
    playerView.turnPhase === 'DISCARD' ? timerConfig.discardSeconds : timerConfig.mainTurnSeconds;
  const phaseDeadlineAt = useMemo(
    () => {
      if (openingDeadline !== null) {
        return new Date(openingDeadline).toISOString();
      }
      if (offline) {
        return nullificationDeadline === null
          ? null
          : new Date(nullificationDeadline).toISOString();
      }
      return decisionKey === null
        ? null
        : new Date(Date.now() + decisionSeconds * 1000).toISOString();
    },
    [decisionKey, decisionSeconds, isPaused, nullificationDeadline, openingDeadline, offline],
  );

  // Tự động xử lý khi hết giờ (0s) trong bản xem thử cục bộ để không bị treo
  useEffect(() => {
    if (offline || isOpening || isPaused || !phaseDeadlineAt || masterState.turnPhase === 'GAME_OVER') {
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
              next = { ...next, turnPhase: 'HERO_SELECT' };
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
  }, [isOpening, isPaused, masterState.turnPhase, offline, phaseDeadlineAt]);

  return (
    <section className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <MatchSettings
        topRightExtra={
          <MatchQuickHudPills
            autoSkipNullification={autoSkipNullify}
            onToggleAutoSkip={handleToggleAutoSkipNullify}
            actionLogCount={playerView.actionLog.length}
            onOpenLog={() => setShowLogDialog(true)}
            onOpenRules={() => setShowRulesDialog(true)}
            onOpenReferee={!offline ? () => setShowRefereeDialog(true) : undefined}
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
            <input
              type="checkbox"
              checked={autoSkipNullify}
              onChange={(event) => handleToggleAutoSkipNullify(event.target.checked)}
              className="accent-[#D99B26]"
            />
            Tự bỏ qua Vô Giải
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => handleToggleReduceMotion(event.target.checked)}
              className="accent-[#D99B26]"
            />
            Giảm chuyển động
          </label>
        </div>
        {!offline ? <>
        <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
          <span className="shrink-0 text-[#B5A792]">Cảnh thử:</span>
          {(
            [
              ['HERO_SELECT', 'Chọn tướng'],
              ['IN_PLAY', 'Đánh bài'],
              ['GUAN_XING', 'Quan Tinh'],
              ['YI_JI', 'Di Kế'],
              ['GAME_OVER', 'Kết ván'],
            ] as const
          ).map(([stageKey, label]) => (
            <button
              key={stageKey}
              type="button"
              onClick={() => resetPreview(playerCount, stageKey)}
              className={`cursor-pointer rounded px-2 py-0.5 font-semibold ${
                previewStage === stageKey
                  ? 'bg-[#D99B26] text-[#14100D]'
                  : 'border border-[#9A7B4F]/40 bg-[#14100D]/90 text-[#D1D5DB] hover:border-[#D99B26]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
            <span className="whitespace-nowrap shrink-0">
              <span className="lg:hidden">
                {previewStage === 'HERO_SELECT' ? 'Chọn tướng' : 'Đánh bài'}
              </span>
              <span className="hidden lg:inline">
                {previewStage === 'HERO_SELECT' ? 'Pha Chọn Tướng' : 'Pha Đánh Bài'}
              </span>
            </span>
          </button>
          <span className="font-mono-num shrink-0 whitespace-nowrap text-[#B5A792] tabular-nums">
            Rút: {playerView.drawPileCount}
          </span>
        </div>

        </> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="Hiệu ứng âm thanh"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled(enabled => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:text-xs"
          >
            <GameIcon name={soundEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span className="lg:hidden">Âm thanh</span>
            <span className="hidden lg:inline">Hiệu ứng âm thanh</span>
          </button>
          <button
            type="button"
            aria-label="Nhạc nền"
            aria-pressed={musicEnabled}
            onClick={() => setMusicEnabled(enabled => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:text-xs"
          >
            <GameIcon name={musicEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span>Nhạc nền</span>
          </button>
          <button
            type="button"
            onClick={() => (offline ? setShowExitDialog(true) : onExitPreview())}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#FCA5A5] hover:border-[#DC2626] xl:text-xs"
          >
            <GameIcon name="ui:undo" size={13} />
            <span>{offline ? 'Về menu' : 'Thoát'}</span>
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
          thinkingSeat={nullificationId === null ? offlineBotSeat : undefined}
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

      {!offline ? <RefereePanelDialog
        open={showRefereeDialog}
        roomState={roomState}
        currentUserId="dev_user_0"
        refereeAuditLog={auditLog}
        onSendRefereeAction={handleRefereeAction}
        onClose={() => setShowRefereeDialog(false)}
      /> : null}

      {offline ? (
        <GuofengModalShell
          open={showExitDialog}
          onClose={() => setShowExitDialog(false)}
          ariaLabelledBy="offline-exit-title"
          icon="ui:door-open"
          title="Rời ván tập?"
          maxWidthClass="max-w-sm"
          footer={
            <>
              <button
                autoFocus
                type="button"
                onClick={() => setShowExitDialog(false)}
                className="lkdf-bronze-pill cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold"
              >
                Ở lại ván
              </button>
              <button
                type="button"
                onClick={onExitPreview}
                className="cursor-pointer rounded-lg border border-[#E6BE6C]/45 bg-[#9E2B25] px-3.5 py-2 text-xs font-bold text-[#FFF5EC] hover:bg-[#B8322B]"
              >
                Về menu
              </button>
            </>
          }
        >
          <p className="text-sm text-[#E8DCC8]">Tiến độ ván này sẽ mất khi bạn về menu.</p>
        </GuofengModalShell>
      ) : null}

      {botFault ? (
        <div role="alert" className="absolute left-1/2 top-14 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded border border-[#CA9A48] bg-[#14100D] p-3 text-sm">
          Không thể tiếp tục ván này.
          <button type="button" onClick={() => resetPreview(playerCount, 'HERO_SELECT')} className="rounded bg-[#9E2B25] px-3 py-2">Chơi lại</button>
          <button type="button" onClick={onExitPreview} className="rounded border border-[#9A7B4F] px-3 py-2">Về menu</button>
        </div>
      ) : null}

      <GameOverSummaryModal
        open={masterState.turnPhase === 'GAME_OVER'}
        roomState={roomState}
        playerView={playerView}
        onReturnToLobby={() => resetPreview(playerCount, 'IN_PLAY')}
        onLeaveRoom={onExitPreview}
        offline={offline}
      />
    </section>
  );
}
