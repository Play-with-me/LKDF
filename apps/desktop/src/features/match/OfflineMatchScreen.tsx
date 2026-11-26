import { orderHand } from './handOrder.js';
import {
  TIMER_PRESETS,
  applyGameAction,
  createCuuChau112Deck,
  createInitialMatchSetup,
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
  RoomSeat,
  RoomState,
} from '@lkdf/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../../components/ui/LanguageToggle.js';
import { readDevicePreference, writeDevicePreference } from '../../lib/devicePreferences.js';
import { useGameAmbience } from '../../lib/useGameAmbience.js';
import { useInterfaceSounds } from '../../lib/useInterfaceSounds.js';
import { playMatchCue } from '../../lib/soundFx.js';
import {
  botDelayMs,
  finishOfflineNullification,
  getOfflineBotSeat,
  OFFLINE_NULLIFICATION_MS,
  runOfflineBotStep,
  scheduleBotStep,
} from './offlineBot.js';
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
  formatMatchErrorVi,
  getRequiredTargetSpec,
} from './matchTypes.js';
import type {
  ConvertCardMode,
  MatchSelectionState,
  PlaySkillMode,
} from './matchTypes.js';
import { RulesHotkeysDialog } from './RulesHotkeysDialog.js';

export interface OfflineMatchScreenProps {
  readonly playerCount: PlayerCount;
  readonly localPlayerName?: string;
  readonly onExitMatch: () => void;
}

function buildOfflineSeats(count: PlayerCount, localPlayerName: string): RoomSeat[] {
  return Array.from({ length: count }, (_, idx) => ({
    seatIndex: idx,
    userId: idx === 0 ? 'local_player_0' : `offline_bot_${idx}`,
    displayName: idx === 0 ? localPlayerName : `Máy ${idx}`,
    avatarUrl: '',
    connectionStatus: 'ONLINE',
    isBotTakeover: idx !== 0,
  }));
}

/**
 * Màn hình ván đấu Chơi với Máy độc lập (tách khỏi DevMatchPreview).
 */
export function OfflineMatchScreen({
  playerCount,
  localPlayerName = 'Bạn',
  onExitMatch,
}: OfflineMatchScreenProps) {
  const { t } = useTranslation();
  const [masterState, setMasterState] = useState<MasterGameState>(() =>
    createInitialMatchSetup({
      matchId: crypto.randomUUID(),
      manualDraw: true,
      seats: buildOfflineSeats(playerCount, localPlayerName),
    }),
  );
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
  const [botFault, setBotFault] = useState<boolean>(false);
  const lastBotTurn = useRef<string | null>(null);

  const handleToggleReduceMotion = useCallback((enabled: boolean) => {
    writeDevicePreference('reduceMotion', enabled);
    setReduceMotion(enabled);
  }, []);

  const restartMatch = useCallback(() => {
    setMasterState(
      createInitialMatchSetup({
        matchId: crypto.randomUUID(),
        manualDraw: true,
        seats: buildOfflineSeats(playerCount, localPlayerName),
      }),
    );
    lastBotTurn.current = null;
    setBotFault(false);
    setAutoSkipNullify(false);
    setSelection(EMPTY_MATCH_SELECTION);
    setActionError(null);
  }, [localPlayerName, playerCount]);

  useEffect(() => {
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }
    const active = masterState.turnPhase !== 'GAME_OVER';
    void bridge.setMatchCloseGuard(active, true).catch(() => undefined);
    return () => {
      void bridge.setMatchCloseGuard(false).catch(() => undefined);
    };
  }, [masterState.turnPhase]);

  const isOpening =
    masterState.turnPhase === 'HERO_SELECT' &&
    masterState.heroDraft?.stage === 'COMPLETED';
  const openingMatchId = masterState.matchId;
  const openingDeadline = useMemo(
    () => (isOpening ? Date.now() + 3000 : null),
    [isOpening, openingMatchId],
  );
  useEffect(() => {
    if (openingDeadline === null) return undefined;
    return scheduleBotStep(() => {
      setMasterState((current) => {
        if (
          current.matchId !== openingMatchId ||
          current.turnPhase !== 'HERO_SELECT' ||
          current.heroDraft?.stage !== 'COMPLETED'
        ) {
          return current;
        }
        return startMatchCombat(current, Math.random, {
          deckFactory: createCuuChau112Deck,
        });
      });
    }, Math.max(0, openingDeadline - Date.now()));
  }, [openingDeadline, openingMatchId]);

  const offlineBotSeat = !botFault ? getOfflineBotSeat(masterState) : undefined;
  const offlineFrame = masterState.interruptStack.at(-1);
  const nullificationId =
    offlineFrame?.kind === 'WAIT_NULLIFICATION' ? offlineFrame.id : null;
  const nullificationDeadline = useMemo(
    () => (nullificationId === null ? null : Date.now() + OFFLINE_NULLIFICATION_MS),
    [nullificationId],
  );

  useEffect(() => {
    if (botFault || (offlineBotSeat === undefined && nullificationDeadline === null)) {
      return undefined;
    }
    const turn = `${masterState.matchId}:${masterState.roundNumber}:${masterState.currentTurnSeat}`;
    const decision = offlineFrame
      ? 'reaction'
      : turn === lastBotTurn.current
        ? 'action'
        : 'turn';
    const remaining =
      nullificationDeadline === null ? Infinity : nullificationDeadline - Date.now();
    const delay =
      offlineBotSeat === undefined
        ? Math.max(0, remaining)
        : botDelayMs(decision, Math.random, remaining);
    return scheduleBotStep(() => {
      try {
        const expired =
          nullificationDeadline !== null && Date.now() >= nullificationDeadline;
        const next =
          expired || offlineBotSeat === undefined
            ? finishOfflineNullification(masterState)
            : runOfflineBotStep(masterState, offlineBotSeat, Math.random, true);
        if (!offlineFrame && masterState.turnPhase !== 'HERO_SELECT') {
          lastBotTurn.current = turn;
        }
        setMasterState((current) => (current === masterState ? next : current));
      } catch {
        setBotFault(true);
      }
    }, delay);
  }, [botFault, masterState, nullificationDeadline, offlineBotSeat, offlineFrame]);

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
    const view = projectStateForPlayer(masterState, 'local_player_0');
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
    if (soundEnabled) {
      playMatchActionCues(lastSoundView.current, playerView);
    }
    lastSoundView.current = playerView;
  }, [playerView, soundEnabled]);

  const roomState: RoomState = useMemo(
    () => ({
      roomCode: 'SOLO',
      status: masterState.turnPhase === 'GAME_OVER' ? 'FINISHED' : 'IN_GAME',
      ownerUserId: 'local_player_0',
      actingHostUserId: 'local_player_0',
      hostDisconnectedAt: null,
      timerPreset: 'STANDARD',
      isTimerPaused: false,
      seats: buildOfflineSeats(playerCount, localPlayerName),
    }),
    [localPlayerName, masterState.turnPhase, playerCount],
  );

  const handleSelectHero = useCallback((heroId: HeroId) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        let next =
          prev.heroDraft?.stage === 'LORD_SELECTING'
            ? selectLordHero(prev, 0, heroId)
            : selectPlayerHero(prev, 0, heroId);
        if (next.heroDraft?.stage === 'COMPLETED') {
          next = { ...next, turnPhase: 'HERO_SELECT' };
        }
        return next;
      } catch (err: unknown) {
        setActionError(formatMatchErrorVi(err, 'Không thể chọn nhân vật.'));
        return prev;
      }
    });
  }, []);

  const handleSendAction = useCallback((action: GameAction) => {
    setActionError(null);
    setMasterState((prev) => {
      try {
        const next = applyGameAction(prev, action, Math.random, {
          deferNullificationPass: true,
        });
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
        showExitDialog ||
        masterState.turnPhase === 'GAME_OVER'
      ) {
        if (event.key === 'Escape') {
          setShowLogDialog(false);
          setShowRulesDialog(false);
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
        const card = orderHand(
          playerView.matchId,
          playerView.players[0]?.handCards ?? [],
        )[Number(event.key) - 1];
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
    showExitDialog,
    showLogDialog,
    showRulesDialog,
  ]);

  const timerConfig = {
    ...TIMER_PRESETS.STANDARD,
    reactionSeconds: OFFLINE_NULLIFICATION_MS / 1000,
  };
  const phaseDeadlineAt = useMemo(() => {
    if (openingDeadline !== null) {
      return new Date(openingDeadline).toISOString();
    }
    return nullificationDeadline === null
      ? null
      : new Date(nullificationDeadline).toISOString();
  }, [nullificationDeadline, openingDeadline]);

  return (
    <section className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <MatchSettings
        topRightExtra={
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <MatchQuickHudPills
              autoSkipNullification={autoSkipNullify}
              onToggleAutoSkip={handleToggleAutoSkipNullify}
              actionLogCount={playerView.actionLog.length}
              onOpenLog={() => setShowLogDialog(true)}
              onOpenRules={() => setShowRulesDialog(true)}
            />
          </div>
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
            {t('match.autoSkipNullify')}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#EFE6D5]">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => handleToggleReduceMotion(event.target.checked)}
              className="accent-[#D99B26]"
            />
            {t('match.reduceMotion')}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label={t('match.sfx')}
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled((enabled) => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:text-xs"
          >
            <GameIcon name={soundEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span className="lg:hidden">{t('match.sfxShort')}</span>
            <span className="hidden lg:inline">{t('match.sfx')}</span>
          </button>
          <button
            type="button"
            aria-label={t('match.bgm')}
            aria-pressed={musicEnabled}
            onClick={() => setMusicEnabled((enabled) => !enabled)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#D99B26] xl:text-xs"
          >
            <GameIcon name={musicEnabled ? 'ui:volume-on' : 'ui:volume-off'} size={13} />
            <span>{t('match.bgm')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExitDialog(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#9A7B4F]/40 bg-[#14100D]/90 px-2.5 py-1 text-[11px] font-medium text-[#FCA5A5] hover:border-[#DC2626] xl:text-xs"
          >
            <GameIcon name="ui:undo" size={13} />
            <span>{t('common.backToMenu')}</span>
          </button>
        </div>
      </MatchSettings>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MatchArenaLayout
          playerView={playerView}
          roomSeats={roomState.seats}
          timerConfig={timerConfig}
          phaseDeadlineAt={phaseDeadlineAt}
          pausedRemainingMs={null}
          isTimerPaused={false}
          selection={selection}
          actionErrorVi={actionError}
          thinkingSeat={nullificationId === null ? offlineBotSeat : undefined}
          connectionLost={false}
          onReconnect={restartMatch}
          onToggleCard={handleToggleCard}
          onToggleTarget={handleToggleTarget}
          onCardLift={() => playMatchCue('CARD_LIFT', soundEnabled)}
          onTargetLock={(seatIndex) =>
            playMatchCue('TARGET_LOCK', soundEnabled, undefined, 0, {
              pan: computeSeatStereoPan(
                seatIndex,
                playerView.viewerSeatIndex,
                playerView.players.length,
              ),
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

      <GuofengModalShell
        open={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        ariaLabelledBy="offline-exit-title"
        icon="ui:door-open"
        title={t('match.exitTitle')}
        maxWidthClass="max-w-sm"
        footer={
          <>
            <button
              autoFocus
              type="button"
              onClick={() => setShowExitDialog(false)}
              className="lkdf-bronze-pill cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold"
            >
              {t('match.stayInMatch')}
            </button>
            <button
              type="button"
              onClick={onExitMatch}
              className="cursor-pointer rounded-lg border border-[#E6BE6C]/45 bg-[#9E2B25] px-3.5 py-2 text-xs font-bold text-[#FFF5EC] hover:bg-[#B8322B]"
            >
              {t('common.backToMenu')}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#E8DCC8]">
          {t('match.exitDesc')}
        </p>
      </GuofengModalShell>

      {botFault ? (
        <div
          role="alert"
          className="absolute left-1/2 top-14 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded border border-[#CA9A48] bg-[#14100D] p-3 text-sm"
        >
          {t('match.faultMessage')}
          <button
            type="button"
            onClick={restartMatch}
            className="rounded bg-[#9E2B25] px-3 py-2"
          >
            {t('match.replay')}
          </button>
          <button
            type="button"
            onClick={onExitMatch}
            className="rounded border border-[#9A7B4F] px-3 py-2"
          >
            {t('common.backToMenu')}
          </button>
        </div>
      ) : null}

      <GameOverSummaryModal
        open={masterState.turnPhase === 'GAME_OVER'}
        roomState={roomState}
        playerView={playerView}
        onReturnToLobby={restartMatch}
        onLeaveRoom={onExitMatch}
        offline
      />
    </section>
  );
}
