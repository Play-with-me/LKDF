import { clearHandOrder, orderHand, rememberHandOrder } from './handOrder.js';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatRankLabel, getCuuChauCardDisplay, getCuuChauHeroDisplay, getCuuChauRoleDisplay, getHeroDefinition, getPlayerMaxHandLimit } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import type {
  CardInstance,
  GameAction,
  HeroId,
  PlayerViewState,
  PublicPlayerView,
  RoomSeat,
  TimerPresetConfig,
} from '@lkdf/shared';
import { getCardArtUrl, getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import { prefersReducedMotion, readDevicePreference, writeDevicePreference } from '../../lib/devicePreferences.js';
import { isMatchSoundEnabled, playMatchCue } from '../../lib/soundFx.js';
import {
  CardBack,
  FactionSeal,
  GameIcon,
  HpJadeMeter,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { HandCardItem, PlayingCardFace } from './HandCardItem.js';
import { HeroCardWatermark } from './HeroCardWatermark.js';
import { HeroSelectPanel } from './HeroSelectPanel.js';
import { MatchActionArc } from './MatchActionArc.js';
import { MatchVfxCanvas } from './MatchVfxCanvas.js';
import { MatchCenterBoard } from './MatchCenterBoard.js';
import { cardHover, MatchHoverTooltip } from './MatchHoverTooltip.js';
import { MatchInspectorBox } from './MatchInspectorBox.js';
import { isPassiveSkillId, SeatCard } from './SeatCard.js';
import { useMatchMotion } from './useMatchMotion.js';
import {
  buildCardDragDropIntent,
  describePendingActorPrompt,
  getAvailableConvertModes,
  getAvailablePlaySkills,
  getFactionStyle,
  getIdentityBadgeClass,
  getIdentityLabelVi,
  getOrderedSeatsClockwiseFromSelf,
  getRequiredTargetSpec,
  isCardRed,
  isCardValidForConvertMode,
} from './matchTypes.js';
import type {
  ConvertCardMode,
  DragDropIntent,
  EquipmentSlotKey,
  MatchInspectorTarget,
  MatchSelectionState,
  PlaySkillMode,
} from './matchTypes.js';

export interface MatchArenaLayoutProps {
  readonly playerView: PlayerViewState;
  readonly roomSeats: readonly RoomSeat[];
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly isTimerPaused: boolean;
  readonly selection: MatchSelectionState;
  readonly connectionLost: boolean;
  readonly actionErrorVi?: string | null;
  readonly thinkingSeat?: number;
  readonly onReconnect: () => void;
  readonly onToggleCard: (cardId: string) => void;
  readonly onToggleTarget: (seatIndex: number) => void;
  readonly onToggleSkillMode: (skillId: PlaySkillMode) => void;
  readonly onToggleConvertMode: (mode: ConvertCardMode) => void;
  readonly onSendAction: (action: GameAction) => void;
  readonly onSelectHero: (heroId: HeroId) => void;
  readonly onClearSelection?: () => void;
  readonly onCardLift?: () => void;
  readonly onTargetLock?: (seatIndex: number) => void;
  readonly renderActionSidebar: () => ReactNode;
}

interface RoundSeatCoord {
  readonly leftPct: number;
  readonly topPct: number;
}

interface ActiveDragState {
  readonly card: CardInstance;
  readonly intent: DragDropIntent;
  readonly hoverSeatIdx: number | null;
  readonly hoverTable: boolean;
}

interface PendingPointerSession {
  readonly card: CardInstance;
  readonly startX: number;
  readonly startY: number;
  readonly intent: DragDropIntent;
  active: boolean;
  hoverSeatIdx: number | null;
  hoverTable: boolean;
  lastX: number;
  lastTs: number;
  tiltDeg: number;
  snapCenter: { x: number; y: number } | null;
}

/**
 * Tọa độ hình học bàn tròn theo chiều kim đồng hồ bắt đầu từ ghế ngay bên trái bạn.
 * Co giãn an toàn ở 960×600 -> 1280×720 -> 1920×1080 nhờ biến CSS --seat-w / --seat-h.
 */
const ROUND_TABLE_COORDS_BY_OPPONENTS: Readonly<Record<number, readonly RoundSeatCoord[]>> = {
  1: [{ leftPct: 50, topPct: 14 }],
  2: [
    { leftPct: 16, topPct: 50 },
    { leftPct: 84, topPct: 50 },
  ],
  3: [
    { leftPct: 14, topPct: 50 },
    { leftPct: 50, topPct: 14 },
    { leftPct: 86, topPct: 50 },
  ],
  4: [
    { leftPct: 13, topPct: 66 },
    { leftPct: 19, topPct: 17 },
    { leftPct: 81, topPct: 17 },
    { leftPct: 87, topPct: 66 },
  ],
  5: [
    { leftPct: 13, topPct: 67 },
    { leftPct: 18, topPct: 17.5 },
    { leftPct: 50, topPct: 13.5 },
    { leftPct: 82, topPct: 17.5 },
    { leftPct: 87, topPct: 67 },
  ],
  6: [
    { leftPct: 12, topPct: 81 },
    { leftPct: 9.5, topPct: 50 },
    { leftPct: 22.5, topPct: 16 },
    { leftPct: 77.5, topPct: 16 },
    { leftPct: 90.5, topPct: 50 },
    { leftPct: 88, topPct: 81 },
  ],
  7: [
    { leftPct: 11.5, topPct: 81.5 },
    { leftPct: 9.5, topPct: 50.5 },
    { leftPct: 22.5, topPct: 16 },
    { leftPct: 50, topPct: 13 },
    { leftPct: 77.5, topPct: 16 },
    { leftPct: 90.5, topPct: 50.5 },
    { leftPct: 88.5, topPct: 81.5 },
  ],
};

function getRoundSeatCoords(opponentCount: number): readonly RoundSeatCoord[] {
  const preset = ROUND_TABLE_COORDS_BY_OPPONENTS[opponentCount];
  if (preset) {
    return preset;
  }
  return Array.from({ length: opponentCount }, (_, index) => {
    const ratio = opponentCount <= 1 ? 0.5 : index / (opponentCount - 1);
    const angleDeg = 148 + ratio * 244;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      leftPct: 50 + Math.cos(rad) * 39,
      topPct: 49 + Math.sin(rad) * 36,
    };
  });
}

function DragGhostCard({
  card,
  ghostRef,
}: {
  readonly card: CardInstance;
  readonly ghostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return createPortal(
    <div
      ref={ghostRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
      className="lkdf-card-gwent flex h-[118px] w-[84px] flex-col overflow-hidden rounded-[6px] border-2 border-[#E6BE6C] text-left text-[#F4EBD8] shadow-[0_20px_42px_rgba(0,0,0,0.85)]"
    >
      <PlayingCardFace card={card} showCategoryTag />
    </div>,
    document.body,
  );
}

function FuseTimer({ deadline, paused, pausedRemainingMs, totalSeconds }: {
  deadline: string | null;
  paused: boolean;
  pausedRemainingMs: number | null;
  totalSeconds: number;
}) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const remaining = paused ? pausedRemainingMs : deadline ? Date.parse(deadline) - Date.now() : null;
  if (remaining === null || !Number.isFinite(remaining) || totalSeconds <= 0) return null;
  const total = totalSeconds * 1000;
  const progress = Math.min(100, Math.max(0, remaining / total * 100));
  return (
    <div
      className="lkdf-timer-fuse"
      role="img"
      aria-label={paused ? (isEn ? 'Timer paused' : 'Đồng hồ đang dừng') : (isEn ? 'Time remaining' : 'Thời gian còn lại')}
    >
      <div className="lkdf-timer-fuel" data-burning={!paused && progress > 0}
        style={{ width: progress + '%', animationDuration: Math.max(0, remaining) + 'ms' }}>
        <span className="lkdf-timer-spark" />
      </div>
    </div>
  );
}

const EMPTY_AIMING_SEATS: readonly number[] = [];

type OpeningCeremonyStage = 'IDENTITY_GACHA' | 'HERO_GACHA';

function getIdentityMissionVi(identity: PublicPlayerView['identity'], locale: 'vi' | 'en' = 'vi'): string {
  const roleName = getCuuChauRoleDisplay(identity, locale).name;
  const desc = getCuuChauRoleDisplay(identity, locale).description;
  return desc ? `${roleName} — ${desc}` : roleName;
}

export function MatchArenaLayout({
  playerView,
  roomSeats,
  timerConfig,
  phaseDeadlineAt,
  pausedRemainingMs,
  isTimerPaused,
  selection,
  connectionLost,
  actionErrorVi = null,
  thinkingSeat,
  onReconnect,
  onToggleCard,
  onToggleTarget,
  onToggleSkillMode,
  onToggleConvertMode,
  onSendAction,
  onSelectHero,
  onClearSelection,
  onCardLift,
  onTargetLock,
  renderActionSidebar,
}: MatchArenaLayoutProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const arenaRef = useRef<HTMLDivElement>(null);
  const motionLayerRef = useRef<HTMLDivElement>(null);
  const pendingThrowRef = useRef<{ cardId: string; x: number; y: number; sentAt: number } | null>(null);

  useEffect(() => {
    pendingThrowRef.current = null;
  }, [connectionLost, playerView.matchId]);

  const takeThrowOrigin = useCallback((cardId: string) => {
    const pending = pendingThrowRef.current;
    if (connectionLost || !pending || pending.cardId !== cardId) return null;
    pendingThrowRef.current = null;
    return performance.now() - pending.sentAt <= 4000 ? pending : null;
  }, [connectionLost]);
  const {
    activeArcs,
    hpImpacts,
    vfxEvents,
    duelSeats,
    recoilVectorBySeat,
    skillStampBySeat,
  } = useMatchMotion(
    arenaRef,
    motionLayerRef,
    playerView,
    connectionLost || playerView.turnPhase === 'HERO_SELECT',
  );
  const [showOnboardingHint, setShowOnboardingHint] = useState(() =>
    readDevicePreference('onboardingHints'),
  );
  const ordered = getOrderedSeatsClockwiseFromSelf(
    playerView.players,
    playerView.viewerSeatIndex,
  );
  const selfPlayer = ordered[0];
  const opponents = ordered.slice(1);
  const coords = getRoundSeatCoords(opponents.length);
  const isCompactSeats = playerView.players.length >= 7;

  const isHeroSelectPhaseNow = playerView.turnPhase === 'HERO_SELECT';
  const selfHeroAlreadySelected = Boolean(selfPlayer?.heroId);
  const completedCeremonyMatchIdRef = useRef<string | null>(null);
  const ceremonyTimersRef = useRef<number[]>([]);
  const [ceremonyState, setCeremonyState] = useState<{
    readonly matchId: string;
    readonly stage: OpeningCeremonyStage;
    readonly identityRevealed: boolean;
  }>(() => ({
    matchId: playerView.matchId,
    stage:
      isHeroSelectPhaseNow && !selfHeroAlreadySelected && !prefersReducedMotion()
        ? 'IDENTITY_GACHA'
        : 'HERO_GACHA',
    identityRevealed: false,
  }));

  const handleSkipOpeningCeremony = useCallback(() => {
    ceremonyTimersRef.current.forEach((id) => window.clearTimeout(id));
    ceremonyTimersRef.current = [];
    completedCeremonyMatchIdRef.current = playerView.matchId;
    setCeremonyState({
      matchId: playerView.matchId,
      stage: 'HERO_GACHA',
      identityRevealed: true,
    });
  }, [playerView.matchId]);

  useEffect(() => {
    if (!isHeroSelectPhaseNow || selfHeroAlreadySelected) {
      ceremonyTimersRef.current.forEach((id) => window.clearTimeout(id));
      ceremonyTimersRef.current = [];
      completedCeremonyMatchIdRef.current = playerView.matchId;
      setCeremonyState({
        matchId: playerView.matchId,
        stage: 'HERO_GACHA',
          identityRevealed: true,
      });
      return;
    }

    if (completedCeremonyMatchIdRef.current === playerView.matchId) {
      return;
    }
    ceremonyTimersRef.current.forEach((id) => window.clearTimeout(id));
    ceremonyTimersRef.current = [];

    if (prefersReducedMotion()) {
      completedCeremonyMatchIdRef.current = playerView.matchId;
      setCeremonyState({
        matchId: playerView.matchId,
        stage: 'HERO_GACHA',
          identityRevealed: true,
      });
      return;
    }

    setCeremonyState({ matchId: playerView.matchId, stage: 'IDENTITY_GACHA', identityRevealed: false });
    const reveal = window.setTimeout(() => {
      setCeremonyState(prev => ({ ...prev, identityRevealed: true }));
      playMatchCue('PANEL_OPEN', isMatchSoundEnabled());
    }, 160);
    const choose = window.setTimeout(() => {
      completedCeremonyMatchIdRef.current = playerView.matchId;
      setCeremonyState(prev => ({ ...prev, stage: 'HERO_GACHA' }));
      playMatchCue('DEAL_OPENING', isMatchSoundEnabled());
    }, 1270);
    ceremonyTimersRef.current = [reveal, choose];
    return () => {
      ceremonyTimersRef.current.forEach((id) => window.clearTimeout(id));
      ceremonyTimersRef.current = [];
    };
  }, [isHeroSelectPhaseNow, playerView.matchId, selfHeroAlreadySelected]);

  const opening = playerView.turnPhase === 'HERO_SELECT' && playerView.heroDraft?.stage === 'COMPLETED';
  const [openingSeconds, setOpeningSeconds] = useState(3);
  const openingFallbackDeadlineRef = useRef<number | null>(null);
  useEffect(() => {
    if (!opening) {
      openingFallbackDeadlineRef.current = null;
      setOpeningSeconds(3);
      return undefined;
    }
    const parsedDeadline = phaseDeadlineAt ? Date.parse(phaseDeadlineAt) : Number.NaN;
    const targetDeadlineMs = Number.isFinite(parsedDeadline)
      ? parsedDeadline
      : (openingFallbackDeadlineRef.current ??= Date.now() + 3000);
    const update = () =>
      setOpeningSeconds(
        Math.max(0, Math.min(3, Math.ceil((targetDeadlineMs - Date.now()) / 1000))),
      );
    update();
    const timer = window.setInterval(update, 75);
    return () => window.clearInterval(timer);
  }, [opening, phaseDeadlineAt]);
  const openingCue = useRef<number | null>(null);
  useEffect(() => {
    if (!opening) { openingCue.current = null; return; }
    if (openingSeconds > 0 && openingSeconds !== openingCue.current) {
      playMatchCue(openingCue.current === null ? 'COUNTDOWN_START' : 'TIMER_TICK', isMatchSoundEnabled());
      openingCue.current = openingSeconds;
    }
  }, [opening, openingSeconds]);

  const lastReveal = playerView.publicReveals?.at(-1);
  const luoShenPrompt = playerView.activeInterrupt;
  const autoLuoShen = luoShenPrompt?.kind === 'ASK_LUO_SHEN' &&
    luoShenPrompt.targetSeat === playerView.viewerSeatIndex && lastReveal?.label.endsWith('Lạc Thần') &&
    playerView.actionLog.at(-1)?.includes('thu về tay!');
  useEffect(() => {
    if (!autoLuoShen || isTimerPaused || connectionLost || selfPlayer?.isBotTakeover) return;
    const timer = window.setTimeout(() => {
      onSendAction({ type: 'RESPOND_LUO_SHEN', seatIndex: playerView.viewerSeatIndex, activate: true });
    }, 1450);
    return () => window.clearTimeout(timer);
  }, [autoLuoShen, connectionLost, isTimerPaused, luoShenPrompt?.id, onSendAction,
    playerView.viewerSeatIndex, selfPlayer?.isBotTakeover]);

  const prompt = describePendingActorPrompt(playerView);
  const targetSpec = getRequiredTargetSpec(playerView, selection);
  const isPlayPhaseSelf =
    playerView.turnPhase === 'PLAY' &&
    playerView.currentTurnSeat === playerView.viewerSeatIndex &&
    playerView.activeInterrupt === null;
  const isDrawPhaseSelf =
    playerView.turnPhase === 'DRAW' &&
    playerView.currentTurnSeat === playerView.viewerSeatIndex &&
    playerView.activeInterrupt === null &&
    (playerView.availableDrawCount ?? 0) > 0;

  const isInterruptTargetSelection =
    playerView.activeInterrupt !== null &&
    prompt.isMyTurn &&
    (playerView.activeInterrupt.kind === 'WAIT_TU_XI' ||
      playerView.activeInterrupt.kind === 'ASK_LIU_LI');

  const isTargetSelectionActive =
    (isPlayPhaseSelf || isInterruptTargetSelection) &&
    targetSpec.maxTargets > 0 &&
    targetSpec.eligibleSeats.length > 0;

  const isDisconnectedBySeat = new Map(
    roomSeats.map((s) => [s.seatIndex, s.connectionStatus === 'DISCONNECTED']),
  );

  const selfHero = selfPlayer?.heroId ? getHeroDefinition(selfPlayer.heroId) : null;
  const selfFaction = selfHero ? getFactionStyle(selfHero.faction) : null;
  const selfPortraitUrl = getHeroPortraitUrl(selfPlayer?.heroId);
  const selfDisplayPhoto = selfPortraitUrl ?? (selfPlayer?.avatarUrl || null);
  const [selfPhotoFailed, setSelfPhotoFailed] = useState<boolean>(false);
  useEffect(() => {
    setSelfPhotoFailed(false);
  }, [selfDisplayPhoto]);

  const [stagedDiscardIds, setStagedDiscardIds] = useState<readonly string[]>([]);
  const [reorderingHand, setReorderingHand] = useState(false);
  const [reorderDraggingId, setReorderDraggingId] = useState<string | null>(null);
  const [reorderOverId, setReorderOverId] = useState<string | null>(null);
  const [, refreshHand] = useState(0);
  const draggedHandCard = useRef<string | null>(null);
  useEffect(() => {
    setReorderingHand(false);
    setReorderDraggingId(null);
    setReorderOverId(null);
    return () => clearHandOrder(playerView.matchId);
  }, [playerView.matchId]);
  const fullHand = orderHand(playerView.matchId, selfPlayer?.handCards ?? []);
  const handIsFaceDown = playerView.activeInterrupt?.handPick === 'SELECT' &&
    playerView.activeInterrupt.targetSeat === playerView.viewerSeatIndex;
  useEffect(() => {
    if (!reorderingHand) {
      setReorderDraggingId(null);
      setReorderOverId(null);
      return;
    }
    if (!selfPlayer?.alive || fullHand.length <= 1 || handIsFaceDown) {
      setReorderingHand(false);
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReorderingHand(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [reorderingHand, selfPlayer?.alive, fullHand.length, handIsFaceDown]);
  const moveHandCard = (from: string, to: string) => {
    const ids = fullHand.map(card => card.id);
    const sourceIndex = ids.indexOf(from);
    const destination = ids.indexOf(to);
    if (sourceIndex < 0 || destination < 0 || sourceIndex === destination) return;
    ids.splice(sourceIndex, 1);
    ids.splice(destination, 0, from);
    rememberHandOrder(playerView.matchId, ids);
    refreshHand(value => value + 1);
  };
  const discardLimit = selfPlayer ? getPlayerMaxHandLimit(playerView, selfPlayer) : 0;
  const discardRequired = !connectionLost && selfPlayer?.alive && !selfPlayer.isBotTakeover &&
    playerView.turnPhase === 'DISCARD' && playerView.activeInterrupt === null &&
    playerView.currentTurnSeat === playerView.viewerSeatIndex
    ? Math.max(0, (fullHand?.length ?? 0) - discardLimit)
    : 0;
  const discardHandKey = discardRequired > 0 ? selfPlayer?.handCards?.map(card => card.id).join('|') : '';
  useEffect(() => {
    setStagedDiscardIds([]);
  }, [discardRequired, discardHandKey, playerView.matchId, playerView.roundNumber]);

  const handCards = discardRequired > 0 && stagedDiscardIds.length > 0
    ? fullHand?.filter((card) => !stagedDiscardIds.includes(card.id)) ?? []
    : fullHand ?? [];
  const discardRemaining = discardRequired > 0 ? handCards.length - discardLimit : 0;
  const selectedToDiscard = handCards.filter((card) => selection.selectedCardIds.includes(card.id));
  const submitDiscard = (cardIds: readonly string[]) => {
    setStagedDiscardIds([]);
    onSendAction({ type: 'DISCARD_CARDS', seatIndex: playerView.viewerSeatIndex, cardIds });
    onClearSelection?.();
  };
  const onDropDiscardCard = discardRemaining > 0 ? (cardId: string) => {
    if (!handCards.some((card) => card.id === cardId)) return;
    const cardIds = [...stagedDiscardIds, cardId];
    if (discardRemaining === 1) {
      const remainingSelected = selectedToDiscard
        .filter((card) => card.id !== cardId)
        .map((card) => card.id);
      if (remainingSelected.length === 0) {
        submitDiscard(cardIds);
        return;
      }
      submitDiscard([...stagedDiscardIds, ...remainingSelected.slice(0, discardRemaining - 1), cardId]);
    } else {
      setStagedDiscardIds(cardIds);
      if (selection.selectedCardIds.includes(cardId)) {
        onToggleCard(cardId);
      }
    }
  } : undefined;
  const isFirstRoundPeaceful = Boolean(
    playerView.peacefulFirstRound && playerView.roundNumber === 1,
  );
  const availableSkills = isPlayPhaseSelf
    ? getAvailablePlaySkills(
        selfPlayer,
        playerView.turnFlags,
        playerView.players,
        isFirstRoundPeaceful,
      )
    : [];
  const availableConverts =
    isPlayPhaseSelf || (playerView.activeInterrupt !== null && prompt.isMyTurn)
      ? getAvailableConvertModes(selfPlayer, isPlayPhaseSelf, isFirstRoundPeaceful)
      : [];

  const isBotTakeoverSelf = Boolean(selfPlayer?.isBotTakeover);
  const showNetworkBanner = connectionLost || isBotTakeoverSelf;
  const isHeroSelectPhase = playerView.turnPhase === 'HERO_SELECT';
  const isSelfLuoYiActive = Boolean(
    selfPlayer &&
      !isHeroSelectPhase &&
      playerView.turnPhase !== 'GAME_OVER' &&
      playerView.currentTurnSeat === selfPlayer.seatIndex &&
      playerView.turnFlags?.luoYiActive,
  );
  const isSelfKongChengActive = Boolean(
    selfPlayer &&
      !isHeroSelectPhase &&
      playerView.turnPhase !== 'GAME_OVER' &&
      selfPlayer.alive &&
      selfPlayer.heroId === 'zhuge_liang' &&
      selfPlayer.handCount === 0,
  );
  const isSelfQianXunActive = Boolean(
    selfPlayer &&
      !isHeroSelectPhase &&
      playerView.turnPhase !== 'GAME_OVER' &&
      selfPlayer.alive &&
      selfPlayer.heroId === 'lu_xun',
  );

  // Tài nguyên Doanh Trại A (100% ảnh thật)
  const campBackdropUrl = getUiAssetUrl('camp-zhanhuo') ?? getUiAssetUrl('table-bg');
  const tableDragonArtUrl = getUiAssetUrl('table-ol-dragon');

  // Khoang Xem Kỹ Năng Thống Nhất (bên phải)
  const [inspector, setInspector] = useState<MatchInspectorTarget | null>(null);
  const [dragFeedbackVi, setDragFeedbackVi] = useState<string | null>(null);
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);

  const dragSessionRef = useRef<PendingPointerSession | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const suppressClickCardIdRef = useRef<string | null>(null);

  // Tự đặt lại thông báo phản hồi nhẹ nhàng sau 2.4 giây
  useEffect(() => {
    if (!dragFeedbackVi) return;
    const id = window.setTimeout(() => setDragFeedbackVi(null), 2400);
    return () => window.clearTimeout(id);
  }, [dragFeedbackVi]);

  // Đặt lại inspector khi chuyển ván hoặc vào pha chọn tướng
  useEffect(() => {
    setInspector(null);
  }, [playerView.matchId]);

  useEffect(() => {
    if (isHeroSelectPhase) {
      setInspector(null);
    }
  }, [isHeroSelectPhase]);

  useEffect(() => {
    if (!inspector) return undefined;
    const onCaptureEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInspector(null);
    };
    window.addEventListener('keydown', onCaptureEscape, { capture: true });
    return () => window.removeEventListener('keydown', onCaptureEscape, { capture: true });
  }, [inspector]);

  useEffect(() => {
    dragSessionRef.current = null;
    setDragState(null);
  }, [playerView.turnPhase, playerView.activeInterrupt?.kind, playerView.currentTurnSeat]);

  const drawShortcutKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !isDrawPhaseSelf ||
      connectionLost ||
      isBotTakeoverSelf ||
      isTimerPaused ||
      !selfPlayer?.alive
    ) {
      drawShortcutKeyRef.current = null;
      return undefined;
    }
    const turnKey = `${playerView.matchId}:${playerView.roundNumber}:${playerView.currentTurnSeat}:${playerView.drawPileCount}`;
    const onDrawKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
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
      if (document.querySelector('dialog[open]') || reorderingHand) return;
      const focusedButton = target?.closest('button, a, [role="button"]') as HTMLElement | null;
      if (
        focusedButton &&
        !focusedButton.dataset.primaryAction &&
        !focusedButton.closest('[data-hand-card-id]')
      ) {
        return;
      }
      if (drawShortcutKeyRef.current === turnKey) return;
      drawShortcutKeyRef.current = turnKey;
      event.preventDefault();
      onSendAction({
        type: 'DRAW_CARDS',
        seatIndex: playerView.viewerSeatIndex,
      });
    };
    window.addEventListener('keydown', onDrawKeyDown);
    return () => window.removeEventListener('keydown', onDrawKeyDown);
  }, [
    connectionLost,
    isBotTakeoverSelf,
    isDrawPhaseSelf,
    isTimerPaused,
    onSendAction,
    playerView.currentTurnSeat,
    playerView.drawPileCount,
    playerView.matchId,
    playerView.roundNumber,
    playerView.viewerSeatIndex,
    reorderingHand,
    selfPlayer?.alive,
  ]);

  const handleCardToggleFromUi = useCallback(
    (cardId: string) => {
      if (suppressClickCardIdRef.current === cardId) {
        suppressClickCardIdRef.current = null;
        return;
      }
      onToggleCard(cardId);
    },
    [onToggleCard],
  );

  const handleInspectHero = useCallback((seatIndex: number) => {
    setInspector((prev) =>
      prev?.kind === 'hero' && prev.seatIndex === seatIndex
        ? null
        : { kind: 'hero', seatIndex },
    );
  }, []);

  const handleInspectCard = useCallback(
    (card: CardInstance, sourceId: string, sourceLabel: string) => {
      setInspector((prev) =>
        prev?.kind === 'card' && prev.sourceId === sourceId
          ? null
          : { kind: 'card', sourceId, sourceLabel, card },
      );
    },
    [],
  );

  const handleStartCardPointerDown = useCallback(
    (card: CardInstance, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !selfPlayer?.alive) {
        return;
      }
      const intent: DragDropIntent = onDropDiscardCard
        ? {
            kind: 'toggle_select',
            promptVi: locale === 'en' ? 'Drop card to discard' : 'Thả bài xuống bàn để bỏ',
          }
        : buildCardDragDropIntent(playerView, card, selection);
      if (intent.kind === 'blocked' && !intent.reasonVi) return;
      dragSessionRef.current = {
        card,
        startX: event.clientX,
        startY: event.clientY,
        intent,
        active: false,
        hoverSeatIdx: null,
        hoverTable: false,
        lastX: event.clientX,
        lastTs: performance.now(),
        tiltDeg: 0,
        snapCenter: null,
      };
    },
    [onDropDiscardCard, playerView, selection, selfPlayer?.alive],
  );

  const handleDoubleClickCard = useCallback(
    (card: CardInstance, element: HTMLButtonElement) => {
      if (!selfPlayer?.alive) return;
      const intent = buildCardDragDropIntent(playerView, card, selection);
      if (intent.kind !== 'table') {
        if (intent.kind === 'blocked' && intent.reasonVi) {
          setDragFeedbackVi(intent.reasonVi);
        }
        return;
      }
      const rect = element.getBoundingClientRect();
      pendingThrowRef.current = {
        cardId: card.id,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        sentAt: performance.now(),
      };
      onSendAction(intent.action);
      setInspector(null);
      onClearSelection?.();
    },
    [onClearSelection, onSendAction, playerView, selection, selfPlayer?.alive],
  );

  useEffect(() => {
    const syncGhostTransform = (
      clientX: number,
      clientY: number,
      session: PendingPointerSession,
    ) => {
      if (!ghostRef.current) return;
      const x = session.snapCenter
        ? clientX + (session.snapCenter.x - clientX) * 0.3
        : clientX;
      const y = session.snapCenter
        ? clientY + (session.snapCenter.y - clientY) * 0.3
        : clientY;
      const scale = session.snapCenter ? 1.08 : 1.06;
      ghostRef.current.style.transform = `translate3d(${x - 39}px, ${y - 56}px, 0) rotate(${session.tiltDeg.toFixed(2)}deg) scale(${scale})`;
    };

    const detectDropHover = (clientX: number, clientY: number, intent: DragDropIntent) => {
      let nextSeatIdx: number | null = null;
      let nextTable = false;
      const elements = document.elementsFromPoint(clientX, clientY);
      if (intent.kind === 'seat' || intent.kind === 'seat_pair_step1') {
        for (const el of elements) {
          const seatAttr = (el as HTMLElement).dataset?.dropSeat;
          if (seatAttr !== undefined) {
            const seatIdx = Number(seatAttr);
            if (intent.eligibleSeats.includes(seatIdx)) {
              nextSeatIdx = seatIdx;
            }
            break;
          }
        }
      } else if (intent.kind === 'table' || intent.kind === 'toggle_select') {
        for (const el of elements) {
          const ds = (el as HTMLElement).dataset;
          if (ds?.dropTable !== undefined || ds?.arenaSurface !== undefined) {
            nextTable = true;
            break;
          }
        }
      }
      return { nextSeatIdx, nextTable };
    };

    const onPointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;

      if (!session.active) {
        const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
        if (dist < 8) return;
        session.active = true;
        suppressClickCardIdRef.current = session.card.id;
        onCardLift?.();
      }

      const ts = performance.now();
      const dtMs = Math.max(8, ts - session.lastTs);
      const vx = (e.clientX - session.lastX) / dtMs;
      const reducedMotion = prefersReducedMotion();
      const targetTilt = reducedMotion ? 0 : Math.max(-15, Math.min(15, vx * 12));
      session.tiltDeg = session.tiltDeg * 0.55 + targetTilt * 0.45;
      session.lastX = e.clientX;
      session.lastTs = ts;

      syncGhostTransform(e.clientX, e.clientY, session);
      const { nextSeatIdx, nextTable } = detectDropHover(
        e.clientX,
        e.clientY,
        session.intent,
      );

      if (
        nextSeatIdx !== session.hoverSeatIdx ||
        nextTable !== session.hoverTable
      ) {
        if (nextSeatIdx !== session.hoverSeatIdx) {
          if (nextSeatIdx !== null) {
            onTargetLock?.(nextSeatIdx);
            const rect = arenaRef.current
              ?.querySelector(`[data-drop-seat="${nextSeatIdx}"]`)
              ?.getBoundingClientRect();
            session.snapCenter = rect
              ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
              : null;
          } else {
            session.snapCenter = null;
          }
        }
        session.hoverSeatIdx = nextSeatIdx;
        session.hoverTable = nextTable;
        setDragState({
          card: session.card,
          intent: session.intent,
          hoverSeatIdx: nextSeatIdx,
          hoverTable: nextTable,
        });
      } else {
        setDragState((prev) =>
          prev
            ? prev
            : {
                card: session.card,
                intent: session.intent,
                hoverSeatIdx: nextSeatIdx,
                hoverTable: nextTable,
              },
        );
      }
      syncGhostTransform(e.clientX, e.clientY, session);
    };

    const finishDrag = (e?: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;
      dragSessionRef.current = null;

      if (!session.active) {
        return;
      }

      const hover = e
        ? detectDropHover(e.clientX, e.clientY, session.intent)
        : { nextSeatIdx: session.hoverSeatIdx, nextTable: session.hoverTable };

      setDragState(null);

      const { intent, card } = session;
      const rememberThrow = () => {
        if (!e) return;
        const ghost = ghostRef.current?.getBoundingClientRect();
        pendingThrowRef.current = {
          cardId: card.id,
          x: ghost ? ghost.left + ghost.width / 2 : e.clientX,
          y: ghost ? ghost.top + ghost.height / 2 : e.clientY,
          sentAt: performance.now(),
        };
      };
      if (intent.kind === 'blocked') {
        setDragFeedbackVi(intent.reasonVi);
        return;
      }

      if (intent.kind === 'seat' && hover.nextSeatIdx !== null) {
        rememberThrow();
        onSendAction({
          type: 'PLAY_CARD',
          seatIndex: playerView.viewerSeatIndex,
          cardIds: [card.id],
          targetSeats: [hover.nextSeatIdx],
          ...(intent.asCardKey ? { asCardKey: intent.asCardKey } : {}),
        });
        setInspector(null);
        onClearSelection?.();
        return;
      }

      if (intent.kind === 'seat_pair_step1' && hover.nextSeatIdx !== null) {
        if (!selection.selectedCardIds.includes(card.id)) {
          onToggleCard(card.id);
        }
        onToggleTarget(hover.nextSeatIdx);
        setDragFeedbackVi(
          locale === 'en'
            ? 'Weapon holder selected — now click a victim within their range!'
            : 'Đã chọn người cầm Vũ khí — hãy bấm chọn tiếp nạn nhân trong tầm đánh!',
        );
        return;
      }

      if (intent.kind === 'table' && hover.nextTable) {
        rememberThrow();
        onSendAction(intent.action);
        setInspector(null);
        onClearSelection?.();
        return;
      }

      if (intent.kind === 'toggle_select' && hover.nextTable) {
        if (onDropDiscardCard) {
          rememberThrow();
          onDropDiscardCard(card.id);
          return;
        }
        onToggleCard(card.id);
        setDragFeedbackVi(intent.promptVi);
      }
    };

    const cancelDrag = () => {
      dragSessionRef.current = null;
      setDragState(null);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
  }, [
    onClearSelection,
    onDropDiscardCard,
    onSendAction,
    onToggleCard,
    onToggleTarget,
    playerView.viewerSeatIndex,
    selection.selectedCardIds,
  ]);

  const isEn = locale === 'en';
  const selfSlots: ReadonlyArray<{
    readonly slotKey: EquipmentSlotKey;
    readonly iconName: Parameters<typeof GameIcon>[0]['name'];
    readonly emptyLabel: string;
    readonly shortLabel: string;
    readonly card: CardInstance | null;
  }> = [
    {
      slotKey: 'weapon',
      iconName: 'broadsword',
      emptyLabel: isEn ? 'Weapon (Range 1)' : 'Vũ khí (Tầm 1)',
      shortLabel: isEn ? 'Weapon' : 'Vũ khí',
      card: selfPlayer?.equipments.weapon ?? null,
    },
    {
      slotKey: 'armor',
      iconName: 'bordered-shield',
      emptyLabel: isEn ? 'Armor · Empty' : 'Giáp · Trống',
      shortLabel: isEn ? 'Armor' : 'Giáp',
      card: selfPlayer?.equipments.armor ?? null,
    },
    {
      slotKey: 'plusOne',
      iconName: 'horse-head',
      emptyLabel: isEn ? 'Footwork +1 · Empty' : 'Ngựa +1 · Trống',
      shortLabel: isEn ? 'Steed +1' : 'Ngựa +1',
      card: selfPlayer?.equipments.plusOneHorse ?? null,
    },
    {
      slotKey: 'minusOne',
      iconName: 'cavalry',
      emptyLabel: isEn ? 'Steed -1 · Empty' : 'Ngựa -1 · Trống',
      shortLabel: isEn ? 'Steed -1' : 'Ngựa -1',
      card: selfPlayer?.equipments.minusOneHorse ?? null,
    },
  ];

  const renderOpponentSeat = (opp: PublicPlayerView, index: number) => {
    const coord = coords[index] ?? { leftPct: 50, topPct: 14 };
    const isEligible =
      isTargetSelectionActive && targetSpec.eligibleSeats.includes(opp.seatIndex);
    const isSelected = selection.selectedTargets.includes(opp.seatIndex);
    const isCurrentTurnOwner =
      playerView.turnPhase !== 'HERO_SELECT' &&
      playerView.turnPhase !== 'GAME_OVER' &&
      playerView.currentTurnSeat === opp.seatIndex;
    const isActor =
      prompt.actorSeat === opp.seatIndex ||
      (playerView.activeInterrupt === null && isCurrentTurnOwner);

    const dragEligible =
      Boolean(dragState) &&
      (dragState?.intent.kind === 'seat' || dragState?.intent.kind === 'seat_pair_step1') &&
      dragState.intent.eligibleSeats.includes(opp.seatIndex);
    const dragHovered = dragEligible && dragState?.hoverSeatIdx === opp.seatIndex;
    const dragHoverLabel =
      dragState?.intent.kind === 'seat'
        ? isEn
          ? `Drop to ${dragState.intent.actionVerbVi}!`
          : `Thả để ${dragState.intent.actionVerbVi}!`
        : dragState?.intent.kind === 'seat_pair_step1'
          ? isEn
            ? 'Drop to pick Weapon holder!'
            : 'Thả chọn người cầm Vũ khí!'
          : undefined;

    const isTopBand = coord.topPct <= 24;
    const isTopCornerBand = isTopBand && (coord.leftPct <= 35 || coord.leftPct >= 65);
    const isReactingTurn =
      playerView.turnPhase !== 'HERO_SELECT' &&
      playerView.turnPhase !== 'GAME_OVER' &&
      isActor &&
      !isCurrentTurnOwner;
    const isActiveBot = (isActor || isCurrentTurnOwner) && opp.isBotTakeover;
    return (
      <div
        key={opp.seatIndex}
        data-main-turn={isCurrentTurnOwner ? 'true' : undefined}
        data-reacting-turn={isReactingTurn ? 'true' : undefined}
        data-seat-band={isTopBand ? 'top' : undefined}
        style={{
          left: `${coord.leftPct}%`,
          top: isTopCornerBand
            ? 'clamp(38px, 6cqh, 44px)'
            : isTopBand
              ? coord.topPct <= 14
                ? 'clamp(3px, 0.8cqh, 8px)'
                : 'clamp(6px, 1.3cqh, 12px)'
              : `${coord.topPct}%`,
        }}
        className={[
          'absolute z-20 -translate-x-1/2',
          isTopBand ? 'translate-y-0' : '-translate-y-1/2',
          isActiveBot ? 'lkdf-bot-active-seat' : '',
        ].join(' ')}
      >
        <SeatCard
          player={opp}
          playerView={playerView}
          isDisconnected={isDisconnectedBySeat.get(opp.seatIndex) ?? false}
          isActiveActor={isActor}
          isCurrentTurnOwner={isCurrentTurnOwner}
          isTargetEligible={isEligible}
          isSelectedTarget={isSelected}
          isInspectedHero={inspector?.kind === 'hero' && inspector.seatIndex === opp.seatIndex}
          inspectedCardSourceId={inspector?.kind === 'card' ? inspector.sourceId : null}
          isDragTargetEligible={dragEligible}
          isDragHovered={dragHovered}
          dragHoverLabelVi={dragHoverLabel}
          compact={isCompactSeats}
          hpImpact={hpImpacts[opp.seatIndex] ?? null}
          recoilVector={recoilVectorBySeat[opp.seatIndex] ?? null}
          skillStamp={skillStampBySeat[opp.seatIndex] ?? null}
          onSelectTarget={isEligible ? onToggleTarget : undefined}
          onInspectHero={handleInspectHero}
          onInspectCard={handleInspectCard}
        />
        {thinkingSeat === opp.seatIndex ? (
          <span role="status" className="pointer-events-none absolute right-1 top-full z-10 mt-0.5 whitespace-nowrap rounded border border-[#C89B4B]/70 bg-[#14100D] px-1.5 text-[10px] font-semibold leading-4 text-[#F5EBD6]">
            {isEn ? 'Thinking…' : 'Đang suy nghĩ…'}
          </span>
        ) : null}
        {(prompt.actorSeat === opp.seatIndex || (playerView.activeInterrupt === null && isCurrentTurnOwner)) &&
        (phaseDeadlineAt !== null || pausedRemainingMs !== null) ? (
          <div className="lkdf-bot-seat-clock">
            <FuseTimer key={phaseDeadlineAt ?? 'paused'} deadline={phaseDeadlineAt}
              paused={isTimerPaused} pausedRemainingMs={pausedRemainingMs}
              totalSeconds={actionSeconds} />
          </div>
        ) : null}
      </div>
    );
  };

  const interrupt = playerView.activeInterrupt;
  const hasCenterInterruptChoice = Boolean(
    prompt.isMyTurn &&
      interrupt !== null &&
      (interrupt.kind === 'WAIT_HARVEST_PICK' ||
        interrupt.kind === 'PICK_TARGET_CARD' ||
        interrupt.kind === 'ASK_HAN_BANG_KIEM' ||
        interrupt.kind === 'WAIT_GUAN_XING' ||
        interrupt.kind === 'WAIT_YI_JI'),
  );
  const hasReaction = interrupt !== null && interrupt.kind !== 'WAIT_HARVEST_PICK';
  const actionSeconds = playerView.activeInterrupt ? timerConfig.reactionSeconds :
    playerView.turnPhase === 'DISCARD' ? timerConfig.discardSeconds ?? timerConfig.mainTurnSeconds : timerConfig.mainTurnSeconds;
  const showLocalReaction =
    hasReaction && !hasCenterInterruptChoice && prompt.actorSeat === playerView.viewerSeatIndex;
  const responseScroll = interrupt?.originalScrollNameVi ?? interrupt?.scrollNameVi;
  const directReaction = interrupt?.kind === 'WAIT_AOE_SAT' || interrupt?.kind === 'WAIT_AOE_DODGE' ||
    interrupt?.kind === 'WAIT_NULLIFICATION' &&
      (responseScroll === 'Nam Man Nhập Xâm' || responseScroll === 'Vạn Tiễn Tề Phát');
  const handleHandClick = (cardId: string) => {
    const card = handCards.find(item => item.id === cardId);
    if (directReaction && card && selection.activeConvertMode !== 'truong_bat') {
      const intent = buildCardDragDropIntent(playerView, card, selection);
      if (intent.kind === 'table') {
        onSendAction(intent.action);
        onClearSelection?.();
        return;
      }
    }
    handleCardToggleFromUi(cardId);
  };
  const showNullification = !connectionLost && !isBotTakeoverSelf &&
    interrupt?.kind === 'WAIT_NULLIFICATION' && interrupt.canRespondNullification;
  const showTableDropBanner =
    dragState !== null &&
    !(dragState.intent.kind === 'table' && dragState.intent.action.type === 'RESPOND_NULLIFICATION') &&
    (dragState.intent.kind === 'table' || dragState.intent.kind === 'toggle_select');

  const skillControls = (
    <>
    {availableSkills.map((skill) => {
      const active = selection.activeSkillMode === skill.id;
      return (
        <button
          key={skill.id}
          type="button"
          aria-pressed={active}
          title={skill.descriptionVi}
          onClick={() => onToggleSkillMode(skill.id)}
          className={[
            'inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded border px-2.5 py-0.5 text-[11px] leading-tight font-bold transition-colors',
            active
              ? 'border-[#D99B26] bg-[#D99B26]/25 text-[#FBBF24]'
              : 'border-[#806345]/75 bg-[#231A14] text-[#EDE3D2] hover:border-[#D99B26]/80 hover:bg-[#2C2017]',
          ].join(' ')}
        >
          {skill.nameVi}
        </button>
      );
    })}
    {availableConverts.map((opt) => {
      const active = selection.activeConvertMode === opt.mode;
      return (
        <button
          key={opt.mode}
          type="button"
          aria-pressed={active}
          title={opt.descriptionVi}
          onClick={() => onToggleConvertMode(opt.mode)}
          className={[
            'inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded border px-2.5 py-0.5 text-[11px] leading-tight font-bold transition-colors',
            active
              ? 'border-[#C83E37] bg-[#C83E37]/25 text-[#FCA5A5]'
              : 'border-[#806345]/75 bg-[#231A14] text-[#EDE3D2] hover:border-[#C83E37]/80 hover:bg-[#2B1715]',
          ].join(' ')}
        >
          {opt.labelVi}
        </button>
      );
    })}

    </>
  );

  const aimingTargetSeats =
    dragState &&
    (dragState.intent.kind === 'seat' || dragState.intent.kind === 'seat_pair_step1') &&
    dragState.hoverSeatIdx !== null &&
    dragState.intent.eligibleSeats.includes(dragState.hoverSeatIdx)
      ? [dragState.hoverSeatIdx]
      : isTargetSelectionActive && selection.selectedTargets.length > 0
        ? selection.selectedTargets
        : EMPTY_AIMING_SEATS;

  const stagedDiscardCards = stagedDiscardIds
    .map((id) => fullHand.find((card) => card.id === id))
    .filter((card): card is CardInstance => Boolean(card));

  const transientPill = actionErrorVi ? (
    <div
      role="alert"
      className="pointer-events-auto w-max max-w-full rounded-full border border-[#DC2626]/70 bg-[#2A1211]/96 px-3.5 py-1 text-center text-[11.5px] font-bold text-[#FCA5A5] shadow-lg"
    >
      {actionErrorVi}
    </div>
  ) : showTableDropBanner && dragState ? (
    <div
      data-drop-table="1"
      className={[
        'pointer-events-none w-[min(440px,100%)] rounded-xl border-2 border-dashed px-4 py-1.5 text-center shadow-2xl transition-colors',
        dragState.hoverTable
          ? 'lkdf-drop-pulse border-[#FBBF24] bg-[#5C2816]/94'
          : 'border-[#D99B26]/70 bg-[#14100C]/90',
      ].join(' ')}
    >
      <span className="font-serif-title inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#FDE68A]">
        <GameIcon name="ui:sparkles" size={13} className="shrink-0 text-[#FBBF24]" />
        <span>
          {dragState.intent.kind === 'table'
            ? dragState.intent.actionLabelVi
            : dragState.intent.kind === 'toggle_select'
              ? dragState.intent.promptVi
              : ''}
        </span>
      </span>
    </div>
  ) : dragState && (dragState.intent.kind === 'seat' || dragState.intent.kind === 'seat_pair_step1') ? (
    <div className="pointer-events-none inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#D99B26]/60 bg-[#120E0B]/92 px-3.5 py-1 text-[11px] font-bold text-[#FDE68A] shadow-lg">
      <GameIcon name="archery-target" size={12} className="shrink-0 text-[#FBBF24]" />
      <span>
        {dragState.intent.kind === 'seat'
          ? isEn
            ? `Drag onto a gold-highlighted seat to ${dragState.intent.actionVerbVi}`
            : `Kéo thả thẳng lên 1 ghế sáng viền vàng để ${dragState.intent.actionVerbVi}`
          : dragState.intent.actionLabelVi}
      </span>
    </div>
  ) : dragState && dragState.intent.kind === 'blocked' ? (
    <div className="pointer-events-none inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#DC2626]/55 bg-[#1B1111]/94 px-3.5 py-1 text-[11px] font-semibold text-[#FCA5A5] shadow-lg">
      <GameIcon name="ui:lock" size={12} className="shrink-0 text-[#F87171]" />
      <span>{dragState.intent.reasonVi}</span>
    </div>
  ) : !dragState && dragFeedbackVi ? (
    <div className="pointer-events-none inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#A68042]/50 bg-[#14110D]/92 px-3.5 py-1 text-[11px] font-semibold text-[#E6CFA3] shadow-lg">
      <GameIcon name="ui:info" size={12} className="shrink-0 text-[#E6BE6C]" />
      <span>{dragFeedbackVi}</span>
    </div>
  ) : showOnboardingHint && isPlayPhaseSelf && !hasReaction && discardRemaining === 0 ? (
    <div
      role="status"
      data-onboarding-hint="true"
      className="pointer-events-auto flex w-max max-w-full items-center gap-2 rounded-full border border-[#B89352]/65 bg-[#120E0B]/92 px-3 py-1 text-[10.5px] font-medium text-[#F4EBD8] shadow-[0_8px_20px_rgba(0,0,0,0.68)]"
    >
      <span className="truncate">
        {isEn
          ? 'Tip: Click a card (keys 1–9) then pick a gold-highlighted seat · Press E to end turn'
          : 'Mẹo nhanh: Bấm lá bài (phím 1–9) rồi chọn tướng sáng viền vàng · Nhấn E để kết thúc lượt'}
      </span>
      <button
        type="button"
        onClick={() => {
          writeDevicePreference('onboardingHints', false);
          setShowOnboardingHint(false);
        }}
        className="shrink-0 cursor-pointer rounded-full border border-[#E6BE6C]/70 bg-[#2C2115] px-2 py-0.5 text-[10px] font-bold text-[#FDE68A] transition-colors hover:bg-[#3F2F1E]"
      >
        {isEn ? 'Got it' : 'Đã hiểu'}
      </button>
    </div>
  ) : null;

  const isDiscardReady = discardRemaining > 0 && selectedToDiscard.length === discardRemaining;
  const floatingBar = showNullification ? (
    <div className="lkdf-dock-floating-bar lkdf-nullification-actions pointer-events-auto">
      {renderActionSidebar()}
    </div>
  ) : showLocalReaction ? (
    <div className="lkdf-dock-floating-bar lkdf-battle-reaction lkdf-scroll pointer-events-auto max-h-[min(140px,28dvh)] overflow-y-auto">
      {!isPlayPhaseSelf && availableConverts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label={isEn ? 'Reaction skills' : 'Kỹ năng phản ứng'}>
          {skillControls}
        </div>
      ) : null}
      {renderActionSidebar()}
    </div>
  ) : discardRemaining > 0 ? (
    <div className="lkdf-dock-floating-bar lkdf-command-bar pointer-events-auto">
      <button
        type="button"
        data-primary-action={isDiscardReady ? 'true' : undefined}
        disabled={!isDiscardReady}
        onClick={() => submitDiscard([...stagedDiscardIds, ...selectedToDiscard.map((card) => card.id)])}
        className="inline-flex min-h-[38px] w-max max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#C83E37] bg-[#9E2B25] px-3.5 py-1.5 text-xs font-bold text-[#FFF1EC] shadow-lg hover:bg-[#B8322B] disabled:cursor-not-allowed disabled:bg-[#641C1B] disabled:opacity-65"
      >
        <GameIcon name="card-discard" size={14} />
        <span>
          {isDiscardReady
            ? isEn
              ? `Discard ${discardRemaining} selected (${selectedToDiscard.length}/${discardRemaining})`
              : `Bỏ ${discardRemaining} lá đã chọn (${selectedToDiscard.length}/${discardRemaining})`
            : isEn
              ? `Select ${discardRemaining} to discard (${selectedToDiscard.length}/${discardRemaining})`
              : `Chọn ${discardRemaining} lá bài để bỏ (${selectedToDiscard.length}/${discardRemaining})`}
        </span>
        {isDiscardReady ? <kbd className="font-mono-num text-[10px] opacity-80">[Enter]</kbd> : null}
      </button>
      {selectedToDiscard.length > 0 ? (
        <button
          type="button"
          onClick={() => onClearSelection?.()}
          className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#806345]/75 bg-[#231A14] px-3 py-1.5 text-xs font-semibold text-[#EDE3D2] hover:border-[#D99B26] hover:bg-[#2C2017]"
        >
          <GameIcon name="ui:undo" size={13} />
          <span>{isEn ? 'Clear' : 'Hủy chọn'}</span>
          <kbd className="font-mono-num text-[10px] opacity-75">[Esc]</kbd>
        </button>
      ) : null}
      {stagedDiscardCards.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-1" role="group" aria-label={isEn ? 'Staged discard cards' : 'Bài đã kéo chờ bỏ'}>
                      {stagedDiscardCards.map((card) => {
                        const cardName = getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name;
                        return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setStagedDiscardIds((prev) => prev.filter((id) => id !== card.id))}
                          title={cardName}
                          className="inline-flex min-h-[30px] cursor-pointer items-center gap-1 rounded border border-[#D99B26]/70 bg-[#2C1F13]/95 px-2 py-0.5 text-[11px] font-semibold text-[#FDE68A] hover:border-[#FBBF24]"
                        >
                          <GameIcon name="ui:undo" size={11} className="shrink-0" />
                          <span>{cardName}</span>
                        </button>
                        );
                      })}
          {stagedDiscardCards.length > 1 ? (
            <button
              type="button"
              onClick={() => setStagedDiscardIds([])}
              className="inline-flex min-h-[30px] cursor-pointer items-center rounded border border-[#6E7889]/70 bg-[#1B2028] px-2 py-0.5 text-[11px] font-semibold text-[#E2E8F0] hover:border-[#E6BE6C]"
            >
              {isEn ? 'Undo All' : 'Hoàn tác hết'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : isPlayPhaseSelf && !hasReaction ? (
    <div className="lkdf-dock-floating-bar lkdf-command-bar pointer-events-auto">
      {(availableSkills.length > 0 || availableConverts.length > 0) ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Kỹ năng chủ động">
          {skillControls}
        </div>
      ) : null}
      {renderActionSidebar()}
    </div>
  ) : isDrawPhaseSelf ? (
    <div className="lkdf-dock-floating-bar lkdf-command-bar pointer-events-auto">
      {renderActionSidebar()}
    </div>
  ) : null;

  const topCenterIndex = coords.findIndex(
    (coord) => coord.topPct <= 24 && coord.leftPct >= 34 && coord.leftPct <= 66,
  );
  const topCenterOpponent = topCenterIndex >= 0 ? opponents[topCenterIndex] : undefined;
  const topCenterEquipCount = topCenterOpponent
    ? [
        topCenterOpponent.equipments.weapon,
        topCenterOpponent.equipments.armor,
        topCenterOpponent.equipments.plusOneHorse,
        topCenterOpponent.equipments.minusOneHorse,
      ].filter(Boolean).length
    : 0;
  const topCenterEquipRows =
    topCenterEquipCount === 0
      ? 0
      : isCompactSeats
        ? topCenterEquipCount >= 3
          ? 2
          : 1
        : topCenterEquipCount >= 2
          ? 2
          : 1;
  const topCenterExtraRows =
    topCenterEquipRows + (topCenterOpponent && topCenterOpponent.delayedScrolls.length > 0 ? 1 : 0);
  const centerTopReserve = !topCenterOpponent
    ? 'clamp(10px, 2.2cqh, 24px)'
    : topCenterExtraRows === 0
      ? 'clamp(100px, 16.8cqh, 120px)'
      : topCenterExtraRows === 1
        ? 'clamp(124px, 21cqh, 148px)'
        : 'clamp(154px, 25.5cqh, 174px)';
  const hasReactionConverts = !isPlayPhaseSelf && availableConverts.length > 0;
  const centerBottomReserve = hasCenterInterruptChoice
    ? transientPill
      ? '44px'
      : '12px'
    : showLocalReaction
      ? transientPill
        ? hasReactionConverts
          ? 'clamp(96px, 18cqh, 132px)'
          : 'clamp(76px, 15cqh, 118px)'
        : hasReactionConverts
          ? 'clamp(76px, 15cqh, 106px)'
          : 'clamp(68px, 13.5cqh, 96px)'
      : floatingBar
        ? transientPill
          ? 'clamp(74px, 13.5cqh, 98px)'
          : 'clamp(48px, 9.5cqh, 70px)'
        : transientPill
          ? '44px'
          : '12px';

  return (
    <div
      ref={arenaRef}
      data-reordering-hand={reorderingHand ? 'true' : undefined}
      className="lkdf-arena-stage relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#090807]"
    >
      <div ref={motionLayerRef} className="lkdf-motion-layer" aria-hidden="true" />
      {!isHeroSelectPhase ? (
        <>
          <MatchActionArc
            stageRef={arenaRef}
            activeArcs={activeArcs}
            selfSeatIndex={playerView.viewerSeatIndex}
            aimingTargetSeats={aimingTargetSeats}
          />
          <MatchVfxCanvas
            stageRef={arenaRef}
            events={vfxEvents}
            duelSeats={duelSeats}
          />
        </>
      ) : null}
      {dragState ? <DragGhostCard card={dragState.card} ghostRef={ghostRef} /> : null}

      {/* Thanh cảnh báo rớt mạng / Máy đánh hộ (chừa lề phải cho cụm HUD nhanh + Cài đặt) */}
      {showNetworkBanner ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D97706]/50 bg-[#D97706]/20 py-1 pl-4 pr-3 pt-10 text-[12px] font-semibold text-[#FDE68A] min-[960px]:pt-1 min-[960px]:pr-[390px] lg:pr-[446px]">
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <GameIcon name={connectionLost ? 'ui:wifi-off' : 'ui:bot'} size={14} className="shrink-0" />
            <span className="truncate">
              {connectionLost
                ? isEn
                  ? 'Connection lost — Reconnecting automatically... Bot is temporarily playing your seat'
                  : 'Mất kết nối mạng — Đang tự động kết nối lại... Ghế của bạn đang được Máy đánh hộ tạm thời'
                : isEn
                  ? 'Turn timed out — Bot is temporarily playing your seat'
                  : 'Bạn vừa quá giờ thao tác — Ghế của bạn đang được Máy đánh hộ tạm thời'}
            </span>
          </span>
          <button
            type="button"
            onClick={onReconnect}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-[#D99B26] bg-[#18120E] px-2.5 py-0.5 text-[11px] font-bold text-[#FBBF24] hover:bg-[#281E17]"
          >
            <GameIcon name="ui:refresh" size={12} />
            {connectionLost
              ? isEn
                ? 'Reconnect Now'
                : 'Kết nối lại ngay'
              : isEn
                ? 'Resume Control'
                : 'Lấy lại điều khiển'}
          </button>
        </div>
      ) : null}

      {/* VÙNG 2 & 3: BÀN TRÒN DOANH TRẠI + ĐĨA RỒNG CHẠM KHẮC OL */}
      <div
        data-arena-surface="1"
        className="lkdf-arena-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        {campBackdropUrl ? (
          <img
            src={campBackdropUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_76%_at_50%_50%,rgba(16,12,10,0.48)_0%,rgba(10,8,7,0.86)_74%,#080605_100%)]"
        />

        <div className="relative mx-auto h-full w-full max-w-[1680px] min-h-0 min-w-0">
          {/* Vành Bàn Tròn / Bầu Dục Trung Tâm với Đĩa Rồng Chạm Khắc OL */}
          <div
            aria-hidden="true"
            className="lkdf-round-table-rim pointer-events-none absolute top-[10%] right-[9%] bottom-[6%] left-[9%] overflow-hidden rounded-[999px] border border-[#B08A4C]/38"
          >
            {tableDragonArtUrl ? (
              <img
                src={tableDragonArtUrl}
                alt=""
                draggable={false}
                className="h-full w-full object-cover object-center opacity-35 brightness-[0.68] contrast-[1.18] sepia-[0.28]"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_68%_72%_at_50%_50%,rgba(16,13,10,0.22)_0%,rgba(12,9,7,0.72)_72%,rgba(9,7,5,0.94)_100%)]" />
            <div className="pointer-events-none absolute inset-2.5 rounded-[999px] border border-[#C69C56]/22" />
          </div>

          {/* 3–7 ghế đối thủ phân bố đều & co giãn theo bàn */}
          {opponents.map(renderOpponentSeat)}

          {/* Bảng trung tâm ở lòng Bàn Tròn (neo trong hành lang an toàn giữa ghế trên và thanh lệnh đáy) */}
          {!isHeroSelectPhase ? (
            <div
              style={{ top: centerTopReserve, bottom: centerBottomReserve }}
              className="lkdf-battle-center absolute left-1/2 z-10 flex w-[clamp(324px,38.5cqw,464px)] -translate-x-1/2 flex-col items-center justify-center"
            >
              <MatchCenterBoard
                playerView={playerView}
                timerConfig={timerConfig}
                phaseDeadlineAt={phaseDeadlineAt}
                pausedRemainingMs={pausedRemainingMs}
                isTimerPaused={isTimerPaused}
                inspectedCardId={
                  inspector?.kind === 'card' && inspector.sourceId.startsWith('played:')
                    ? inspector.card.id
                    : null
                }
                onSendAction={onSendAction}
                takeThrowOrigin={takeThrowOrigin}
                onInspectCard={(card, sourceLabel) =>
                  handleInspectCard(card, `played:${card.id}`, sourceLabel)
                }
              />
            </div>
          ) : playerView.heroDraft?.stage === 'COMPLETED' ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-3">
              <section
                data-opening-ceremony="COUNTDOWN"
                className="flex w-full max-w-[min(430px,calc(100%-2rem))] flex-col items-center gap-2 rounded-2xl border border-[#CA9A48]/75 bg-[#16110E]/95 px-5 py-4 text-center shadow-[0_20px_56px_rgba(0,0,0,0.85)]"
              >
                <h2 className="font-serif-title text-[18px] font-bold text-[#FDE68A] sm:text-xl">
                  {isEn ? 'All Generals Locked In' : 'Tất cả đã chốt tướng'}
                </h2>
                <span
                  key={openingSeconds}
                  className="lkdf-countdown-num font-serif-title tabular-nums text-5xl font-black text-[#FEF08A] sm:text-6xl"
                >
                  {openingSeconds > 0 ? openingSeconds : isEn ? 'Begin!' : 'Khai trận'}
                </span>
                <p className="text-[12px] font-medium text-[#CBD5E1]">
                  {openingSeconds > 0
                    ? isEn
                      ? 'Preparing to deal 4 opening cards…'
                      : 'Chuẩn bị chia 4 lá bài mở màn…'
                    : isEn
                      ? 'Dealing cards into the arena…'
                      : 'Đang chia bài vào trận…'}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                  {playerView.players.map((p) => {
                    const heroDef = p.heroId ? getHeroDefinition(p.heroId) : null;
                    return (
                      <span
                        key={p.seatIndex}
                        className="inline-flex items-center gap-1 rounded border border-[#CA9A48]/40 bg-[#120D0A]/90 px-2 py-0.5 text-[10.5px] font-semibold text-[#F4EFE6]"
                      >
                        <span className="text-[#94A3B8]">{p.displayName}:</span>
                        <span className="text-[#FDE68A]">
                          {p.heroId ? (getCuuChauHeroDisplay(p.heroId, locale)?.name ?? heroDef?.nameVi ?? '…') : '…'}
                        </span>
                        {p.maxHp > 0 ? (
                          <span className="font-mono-num inline-flex items-center gap-0.5 text-[#FCA5A5]">
                            ({p.maxHp}
                            <GameIcon name="heart-plus" size={10} className="text-[#F87171]" />)
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="lkdf-hero-select-shell absolute inset-0 z-30 flex items-center justify-center bg-[#090706]/72 p-3 backdrop-blur-[2px]">
              <div className="lkdf-hero-select-frame h-full max-h-[540px] w-full max-w-[min(1040px,calc(100%-1rem))] min-h-0">
                {ceremonyState.stage !== 'HERO_GACHA' ? (
                  <section
                    data-opening-ceremony={ceremonyState.stage}
                    className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#CA9A48]/70 bg-[radial-gradient(ellipse_at_top,#2B1C14_0%,#16110E_62%,#0B0806_100%)] p-5 text-[#F4EBD8] shadow-[0_24px_64px_rgba(0,0,0,0.86)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#CA9A48]/55 bg-[#1B130E]/90 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase">
                        <GameIcon name="drama-masks" size={13} className="text-[#E6BE6C]" />
                        <span>{isEn ? 'Draw Allegiance' : 'Rút Thân Phận'}</span>
                      </div>
                      <button
                        type="button"
                        data-skip-ceremony="true"
                        onClick={handleSkipOpeningCeremony}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#CA9A48]/65 bg-[#1F1712]/95 px-3 py-1.5 text-xs font-bold text-[#FDE68A] transition-colors hover:border-[#FDE68A] hover:bg-[#2A2018]"
                      >
                        <span>{isEn ? 'Skip Animation' : 'Bỏ qua hiệu ứng'}</span>
                        <GameIcon name="ui:skip" size={13} />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
                      {!ceremonyState.identityRevealed ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-44 w-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#CA9A48]/80 bg-[radial-gradient(circle_at_top,#2B1E14_0%,#140F0C_85%)] p-4 shadow-[0_0_32px_rgba(202,154,72,0.28)]">
                            <span className="font-serif-title text-4xl font-black text-[#E6BE6C]">令</span>
                            <span className="text-xs font-bold tracking-widest text-[#E6BE6C] uppercase">
                              {isEn ? 'Allegiance' : 'Thân Phận'}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#FDE68A]">
                            {isEn ? 'Revealing your Allegiance seal...' : 'Đang mở ấn lệnh Thân Phận của bạn...'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className={[
                              'lkdf-card-flip-3d flex w-[min(380px,100%)] flex-col items-center gap-2 rounded-xl border-2 px-6 py-5 shadow-[0_18px_46px_rgba(0,0,0,0.75)]',
                              getIdentityBadgeClass(selfPlayer?.identity ?? 'UNKNOWN'),
                            ].join(' ')}
                          >
                            <span className="text-[11px] font-bold tracking-[0.18em] text-[#E2E8F0] uppercase">
                              {isEn ? 'Your Allegiance' : 'Thân Phận Của Bạn'}
                            </span>
                            <strong className="font-serif-title text-2xl font-black tracking-wide text-[#FEF08A]">
                              {getIdentityLabelVi(selfPlayer?.identity ?? 'UNKNOWN', locale)}
                            </strong>
                            <p className="text-xs leading-relaxed text-[#F3F4F6]">
                              {getIdentityMissionVi(selfPlayer?.identity ?? 'UNKNOWN', locale)}
                            </p>
                          </div>
                          <p className="text-xs text-[#CBD5E1]">
                            {isEn ? 'Opening General recruitment roster...' : 'Đang mở danh sách Tướng chiêu mộ...'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[11px] text-[#94A3B8]">
                      {isEn ? 'Reveal Allegiance → Draft General → Begin Battle' : 'Mở thân phận → Chọn tướng → Khai trận'}
                    </div>
                  </section>
                ) : (
                  <div className="lkdf-hero-gacha-stage h-full w-full">
                    <HeroSelectPanel
                      playerView={playerView}
                      remainingSeconds={
                        phaseDeadlineAt && !isTimerPaused
                          ? Math.max(0, Math.ceil((Date.parse(phaseDeadlineAt) - Date.now()) / 1000))
                          : pausedRemainingMs !== null
                            ? Math.max(0, Math.ceil(pausedRemainingMs / 1000))
                            : null
                      }
                      isTimerPaused={isTimerPaused}
                      onSelectHero={onSelectHero}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VÙNG 4: THANH ĐÁY RESPONSIVE (TRÁI: TƯỚNG + 4 Ô TRANG BỊ NGỬA | GIỮA: THANH LỆNH THỐNG NHẤT + BÀI TAY CĂN GIỮA) */}
      <div
        className="lkdf-battle-dock flex h-[var(--dock-h,196px)] shrink-0 min-w-0 items-stretch gap-2.5 border-t border-[#806345]/45 bg-[#16110F] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(230,190,108,0.08)]"
      >
        {/* Ngăn xếp nổi thống nhất phía trên Dock: tối đa 1 thông báo thoáng + 1 thanh lệnh/phản ứng (0px đè lên nhau) */}
        {(transientPill || floatingBar) ? (
          <div className="lkdf-dock-floating-stack">
            {transientPill}
            {floatingBar}
          </div>
        ) : null}

        {/* Cột Trái: Khung Đôi Mẫu B (Hồ sơ Tướng + Huy hiệu kỹ năng | 4 Ô Trang Bị Ngửa 4 hàng rõ chữ) */}
        <div
          data-faction={selfHero?.faction}
          data-dying={!isHeroSelectPhase && selfPlayer?.alive && selfPlayer.hp <= 0 ? 'true' : undefined}
          data-luoyi-active={isSelfLuoYiActive ? 'true' : undefined}
          data-main-turn={
            selfPlayer?.seatIndex === playerView.currentTurnSeat &&
            !isHeroSelectPhase &&
            playerView.turnPhase !== 'GAME_OVER'
              ? 'true'
              : undefined
          }
          data-reacting-seat={
            selfPlayer?.seatIndex !== playerView.currentTurnSeat &&
            prompt.isMyTurn &&
            !isHeroSelectPhase &&
            playerView.turnPhase !== 'GAME_OVER'
              ? 'true'
              : undefined
          }
          className="lkdf-battle-player flex w-[var(--left-w,340px)] shrink-0 rounded-[6px] border border-[#806345]/50 bg-[#211814] shadow-lg"
        >
          {/* Nửa Trái: Hồ sơ Tướng bản thân (kèm huy hiệu kỹ năng bấm/rê chuột để xem chi tiết) */}
          {(() => {
            const selfHpImpact = selfPlayer ? hpImpacts[selfPlayer.seatIndex] ?? null : null;
            const selfSkillStamp = selfPlayer ? skillStampBySeat[selfPlayer.seatIndex] : undefined;
            return (
              <div
                onClick={() => {
                  if (selfPlayer?.heroId) {
                    handleInspectHero(selfPlayer.seatIndex);
                  }
                }}
                data-motion-self={selfPlayer?.seatIndex}
                data-inspected-trigger={
                  inspector?.kind === 'hero' && inspector.seatIndex === selfPlayer?.seatIndex
                    ? 'true'
                    : undefined
                }
                data-hp-impact={selfHpImpact ? (selfHpImpact.delta < 0 ? 'damage' : 'heal') : undefined}
                title="Bấm để mở hồ sơ kỹ năng tướng của bạn"
                className="lkdf-battle-profile relative flex min-h-0 w-[var(--prof-w,136px)] shrink-0 cursor-pointer flex-col justify-between p-2"
              >
                <HeroCardWatermark
                  portraitUrl={!selfPhotoFailed ? selfPortraitUrl : null}
                  widthClass="w-[94%]"
                  opacityClass="opacity-90"
                />
                {selfSkillStamp ? (
                  <span key={selfSkillStamp.id} className="lkdf-skill-stamp pointer-events-none absolute bottom-1 right-1.5 z-35 rounded border border-[#E6BE6C]/80 bg-[#18120E]/95 px-1.5 py-0.5 text-[10px] font-bold text-[#FDE68A] shadow-md">
                    {selfSkillStamp.label}
                  </span>
                ) : null}
                {selfHpImpact ? (
                  <span key={`self-impact-${selfHpImpact.id}`} aria-hidden="true" className="pointer-events-none contents">
                    <span
                      className={
                        selfHpImpact.delta < 0
                          ? 'lkdf-hp-flash-damage pointer-events-none absolute inset-0 z-30 rounded-[inherit]'
                          : 'lkdf-hp-flash-heal pointer-events-none absolute inset-0 z-30 rounded-[inherit]'
                      }
                    />
                    <span
                      data-kind={selfHpImpact.delta < 0 ? 'damage' : 'heal'}
                      className="lkdf-hp-pop pointer-events-none absolute top-[46%] left-1/2 z-40"
                    >
                      {selfHpImpact.delta > 0 ? `+${selfHpImpact.delta}` : `−${Math.abs(selfHpImpact.delta)}`}
                    </span>
                  </span>
                ) : null}
            <div className="lkdf-battle-profile-body relative z-10 flex min-h-0 flex-1 flex-col gap-0.5">
              {selfPlayer ? (
                <>
                  <div className="flex shrink-0 items-start gap-1.5 min-w-0">
                    {!selfPortraitUrl ? (
                      <div
                        className={[
                          'relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-[#140F0C] text-xs font-bold text-[#F5EBD6]',
                          selfFaction ? selfFaction.borderClass : 'border-[#B89352]/55',
                        ].join(' ')}
                      >
                        {selfDisplayPhoto && !selfPhotoFailed ? (
                          <img
                            src={selfDisplayPhoto}
                            alt={selfPlayer.displayName}
                            draggable={false}
                            onError={() => setSelfPhotoFailed(true)}
                            className="h-full w-full object-cover object-[50%_18%]"
                          />
                        ) : selfHero ? (
                          <FactionSeal faction={selfHero.faction} size="sm" />
                        ) : (
                          <GameIcon name="ui:user" size={14} className="text-[#9CA3AF]" />
                        )}
                      </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          title={selfPlayer.displayName}
                          className="min-w-0 truncate text-[clamp(10px,0.9cqw,12px)] leading-tight font-bold text-[#E2E8F0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                        >
                          {selfPlayer.displayName}
                        </span>
                        <span
                          title={
                            isEn
                              ? `Clockwise turn order: Seat #${selfPlayer.seatIndex + 1}`
                              : `Thứ tự lượt theo chiều kim đồng hồ: Ghế #${selfPlayer.seatIndex + 1}`
                          }
                          className="font-mono-num shrink-0 rounded border border-[#806345]/60 bg-[#140F0C]/85 px-1 text-[8.5px] font-bold text-[#EDE3D2]"
                        >
                          #{selfPlayer.seatIndex + 1}
                        </span>
                      </div>
                      <div className="mt-1 flex items-start gap-1 min-w-0">
                        {selfHero ? (
                          <>
                            <FactionSeal faction={selfHero.faction} size="xs" />
                            <span className="min-w-0 [overflow-wrap:anywhere] font-serif-title text-[clamp(11px,0.96cqw,13px)] leading-tight font-bold text-[#F5EBD6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.98)]">
                              {getCuuChauHeroDisplay(selfHero.id, locale)?.name ?? selfHero.nameVi}
                            </span>
                          </>
                        ) : (
                          <span className="truncate text-[10px] text-[#9CA3AF]">{locale === 'en' ? 'Selecting…' : 'Đang chọn…'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isHeroSelectPhase &&
                  ceremonyState.stage === 'IDENTITY_GACHA' &&
                  !ceremonyState.identityRevealed ? (
                    <div
                      data-match-identity="UNKNOWN"
                      className={`lkdf-match-identity lkdf-match-identity-self ${getIdentityBadgeClass('UNKNOWN')}`}
                    >
                      <span className="lkdf-match-identity-kicker">{isEn ? 'Role' : 'Thân phận'}</span>
                      <strong>{isEn ? 'Revealing…' : 'Đang mở…'}</strong>
                    </div>
                  ) : (
                    <div
                      data-match-identity={selfPlayer.identity}
                      className={`lkdf-match-identity lkdf-match-identity-self ${getIdentityBadgeClass(selfPlayer.identity)}`}
                    >
                      <span className="lkdf-match-identity-kicker">{isEn ? 'Role' : 'Thân phận'}</span>
                      <strong>{getIdentityLabelVi(selfPlayer.identity, locale)}</strong>
                    </div>
                  )}

                  {!isHeroSelectPhase && playerView.turnPhase !== 'GAME_OVER' && (playerView.currentTurnSeat === selfPlayer.seatIndex || prompt.isMyTurn || isFirstRoundPeaceful || isSelfLuoYiActive || isSelfKongChengActive || isSelfQianXunActive) ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {playerView.currentTurnSeat === selfPlayer.seatIndex ? (
                        <span
                          data-self-turn-badge="turn"
                          className="inline-flex items-center gap-0.5 rounded border border-[#FBBF24]/80 bg-[#D99B26]/25 px-1.5 py-0 text-[8.5px] leading-[13px] font-extrabold text-[#FEF08A]"
                        >
                          <GameIcon name="ui:flag" size={9} />
                          <span>{isEn ? 'Your Turn' : 'Lượt chính'}</span>
                        </span>
                      ) : prompt.isMyTurn ? (
                        <span
                          data-self-turn-badge="reacting"
                          className="inline-flex items-center gap-0.5 rounded border border-[#38BDF8]/85 bg-[#0C4A6E]/85 px-1.5 py-0 text-[8.5px] leading-[13px] font-extrabold text-[#E0F2FE]"
                        >
                          <GameIcon name="ui:zap" size={9} />
                          <span>{isEn ? 'Responding' : 'Phản ứng'}</span>
                        </span>
                      ) : null}
                      {isSelfLuoYiActive ? (
                        <span
                          data-luoyi-active="true"
                          className="inline-flex items-center gap-0.5 rounded border border-[#F59E0B]/85 bg-[#78350F]/85 px-1.5 py-0 text-[8.5px] leading-[13px] font-extrabold text-[#FEF3C7]"
                        >
                          <GameIcon name="broadsword" size={9} />
                          <span>{locale === 'en' ? 'Armor Break +1 DMG' : 'Phá Giáp +1 ST'}</span>
                        </span>
                      ) : null}
                      {isSelfKongChengActive ? (
                        <span
                          data-kong-cheng="true"
                          className="inline-flex items-center gap-0.5 rounded border border-[#38BDF8]/80 bg-[#0C4A6E]/80 px-1.5 py-0 text-[8.5px] leading-[13px] font-extrabold text-[#E0F2FE]"
                        >
                          <GameIcon name="bordered-shield" size={9} />
                          <span>{locale === 'en' ? 'Empty Ward' : 'Tĩnh Tâm Trận'}</span>
                        </span>
                      ) : null}
                      {isSelfQianXunActive ? (
                        <span
                          data-qian-xun="true"
                          className="inline-flex items-center gap-0.5 rounded border border-[#34D399]/75 bg-[#064E3B]/80 px-1.5 py-0 text-[8.5px] leading-[13px] font-extrabold text-[#D1FAE5]"
                        >
                          <GameIcon name="shield" size={9} />
                          <span>{locale === 'en' ? 'Veiled' : 'Tàng Hình'}</span>
                        </span>
                      ) : null}
                      {isFirstRoundPeaceful ? (
                        <span
                          data-self-peace-badge="true"
                          className="inline-flex items-center gap-0.5 rounded border border-[#34D399]/55 bg-[#064E3B]/75 px-1.5 py-0 text-[8.5px] leading-[13px] font-bold text-[#A7F3D0]"
                        >
                          <GameIcon name="ui:feather" size={9} />
                          <span>{isEn ? 'R1 Peace' : 'V1 Hòa Bình'}</span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {isHeroSelectPhase && selfPlayer.maxHp <= 0 ? (
                      <span className="inline-flex items-center gap-1 rounded border border-[#806345]/45 bg-[#140F0C]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#E8DCC8]">
                        {selfHero || playerView.heroDraft?.mySelectedHero
                          ? isEn
                            ? 'General locked'
                            : 'Đã chốt tướng'
                          : isEn
                            ? 'Selecting general…'
                            : 'Đang chọn tướng…'}
                      </span>
                    ) : (
                      <HpJadeMeter hp={selfPlayer.hp} maxHp={selfPlayer.maxHp} size="md" />
                    )}
                    {!selfPlayer.alive ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FCA5A5]">
                        <GameIcon name="death-skull" size={11} />
                        {isEn ? 'Fallen' : 'Tử trận'}
                        </span>
                      ) : null}
                  </div>
                  {selfHero && selfHero.skills.length > 0 ? (
                    <div
                      className="mt-0.5 flex flex-wrap gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selfHero.skills.map((skill, sIdx) => {
                        const sd = getCuuChauHeroDisplay(selfHero.id, locale)?.skills[sIdx];
                        const skillName = sd?.name ?? skill.nameVi;
                        const skillDesc = sd?.description ?? skill.descriptionVi;
                        return (
                        <button
                          key={skill.id}
                          type="button"
                          data-inspected-trigger={
                            inspector?.kind === 'hero' && inspector.seatIndex === selfPlayer.seatIndex
                              ? 'true'
                              : undefined
                          }
                          data-hover-name={skillName}
                          data-hover-description={skillDesc}
                          data-passive-skill={isPassiveSkillId(skill.id) || undefined}
                          onClick={() => handleInspectHero(selfPlayer.seatIndex)}
                          className="lkdf-hero-skill-label cursor-pointer transition-colors hover:border-[#E6BE6C]"
                        >
                          {skillName}
                        </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {prompt.isMyTurn ? (
                    <div className="mt-auto shrink-0 pt-0.5">
                      <FuseTimer key={phaseDeadlineAt ?? 'paused'} deadline={phaseDeadlineAt}
                        paused={isTimerPaused} pausedRemainingMs={pausedRemainingMs}
                        totalSeconds={actionSeconds} />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-[11px] text-[#9CA3AF]">
                  {isEn ? 'Loading seat details...' : 'Đang tải thông tin ghế...'}
                </div>
              )}
            </div>
          </div>
            );
          })()}

          {/* Nửa Phải Cột Trái: 4 Ô Trang Bị Ngửa xếp 4 hàng rộng rãi (đủ tên đầy đủ) */}
          <div className="lkdf-battle-equip flex min-h-0 min-w-0 flex-1 flex-col gap-1 border-l border-[#806345]/40 bg-[#1B1512] p-1.5">
            <div className="flex shrink-0 items-center justify-between text-[9.5px] font-bold tracking-wide text-[#B89352] uppercase">
              <span className="truncate">{isEn ? 'Equipment' : 'Trang bị'}</span>
              <span className="shrink-0 text-[9px] font-normal normal-case text-[#B8A48C]">
                {isEn ? '4 slots' : '4 ô'}
              </span>
            </div>

            <div className="lkdf-battle-grid min-w-0">
              {selfSlots.map(({ slotKey, iconName, emptyLabel, shortLabel, card }) => {
                if (!card) {
                  const isDropTargetSlot =
                    dragState?.intent.kind === 'table' && dragState.intent.highlightSlot === slotKey;
                  return (
                    <div
                      key={slotKey}
                      data-drop-highlight={isDropTargetSlot}
                      className={[
                        'flex min-h-0 flex-1 items-center gap-1.5 rounded border px-1.5 text-[clamp(10px,0.88cqw,11px)] font-medium transition-colors',
                        isDropTargetSlot
                          ? 'border-[#E6BE6C] bg-[#E6BE6C]/16 text-[#FDE68A]'
                          : 'border-[#806345]/30 bg-[#231A14]/70 text-[#A89984]',
                      ].join(' ')}
                    >
                      <GameIcon name={iconName} size={12} className="shrink-0 opacity-75" />
                      <span className="truncate" title={emptyLabel}>{shortLabel}</span>
                    </div>
                  );
                }

                const artUrl = getCardArtUrl(card.cardKey);
                const sid = `self:${slotKey}`;
                const isSelectedEquip = selection.selectedCardIds.includes(card.id);
                const red = isCardRed(card);
                const isRedEquipReaction = Boolean(
                  prompt.isMyTurn &&
                    interrupt &&
                    red &&
                    ((selfPlayer?.heroId === 'guan_yu' &&
                      (interrupt.kind === 'WAIT_DUEL_SAT' ||
                        interrupt.kind === 'WAIT_AOE_SAT' ||
                        interrupt.kind === 'WAIT_COLLATERAL_SAT' ||
                        interrupt.kind === 'WAIT_JI_JIANG' ||
                        interrupt.kind === 'ASK_THANH_LONG')) ||
                      (selfPlayer?.heroId === 'hua_tuo' &&
                        !isPlayPhaseSelf &&
                        interrupt.kind === 'WAIT_PEACH_RESCUE')),
                );
                const isConvertModeOnEquip =
                  selection.activeConvertMode === 'wu_sheng' ||
                  selection.activeConvertMode === 'ky_tap' ||
                  selection.activeConvertMode === 'quoc_sac' ||
                  selection.activeConvertMode === 'cuu_vien';
                const isEquipValidForActiveConvert = selection.activeConvertMode
                  ? isConvertModeOnEquip && isCardValidForConvertMode(card, selection.activeConvertMode)
                  : true;
                const isEquipDimmed = Boolean(selection.activeConvertMode && !isEquipValidForActiveConvert);
                const canToggleEquip = Boolean(
                  selfPlayer?.alive &&
                    (selection.activeConvertMode
                      ? isEquipValidForActiveConvert
                      : isRedEquipReaction ||
                        (isPlayPhaseSelf &&
                          (selection.activeSkillMode === 'zhi_heng' ||
                            selection.activeSkillMode === 'li_jian')) ||
                        (prompt.isMyTurn &&
                          interrupt &&
                          (interrupt.kind === 'ASK_LIU_LI' ||
                            (interrupt.kind === 'ASK_QUAN_THACH_PHU' && slotKey !== 'weapon')))),
                );
                const active =
                  isSelectedEquip || (inspector?.kind === 'card' && inspector.sourceId === sid);

                return (
                  <button
                    key={slotKey}
                    type="button"
                    data-inspected-trigger={
                      inspector?.kind === 'card' && inspector.sourceId === sid ? 'true' : undefined
                    }
                    aria-pressed={canToggleEquip ? isSelectedEquip : undefined}
                    onClick={() =>
                      canToggleEquip
                        ? onToggleCard(card.id)
                        : handleInspectCard(card, sid, isEn ? 'Your Equipment' : 'Trang bị của bạn')
                    }
                    {...cardHover(card)}
                    className={[
                      'flex min-h-0 w-full flex-1 cursor-pointer items-center gap-1.5 rounded border px-1.5 text-left transition-[colors,opacity]',
                      isEquipDimmed ? 'opacity-35 saturate-50' : '',
                      active
                        ? 'border-[#FDE68A] bg-[#E6BE6C]/22 ring-1 ring-[#FDE68A]/55'
                        : canToggleEquip
                          ? 'border-[#E6BE6C]/70 bg-[#2A1F17] hover:border-[#FDE68A]'
                          : 'border-[#B89352]/55 bg-[#231A14] hover:border-[#E6BE6C]',
                    ].join(' ')}
                  >
                    {artUrl ? (
                      <img
                        src={artUrl}
                        alt=""
                        draggable={false}
                        className="h-[clamp(18px,2.8cqh,22px)] w-[clamp(14px,1.45cqw,18px)] shrink-0 rounded-[2px] border border-[#7C5828]/80 object-cover"
                      />
                    ) : (
                      <GameIcon name={iconName} size={13} className="shrink-0 text-[#F3D38C]" />
                    )}
                    <span
                      className={`font-mono-num inline-flex shrink-0 items-center gap-0.5 text-[clamp(10px,0.9cqw,11.5px)] font-extrabold leading-none ${
                        red ? 'text-[#FCA5A5]' : 'text-[#EFE6D5]'
                      }`}
                    >
                      <span>{formatRankLabel(card.rank)}</span>
                      <SuitGlyph suit={card.suit} size={11} tone="darkSurface" />
                    </span>
                    <span className="font-serif-title min-w-0 flex-1 truncate text-[clamp(10.5px,0.94cqw,12px)] font-bold text-[#F6DFA8]">
                      {getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name}
                    </span>
                  </button>
                );
              })}
            </div>
            {selfPlayer ? (
              <div className="lkdf-battle-judgment text-[10px]">
                <strong>{isEn ? 'Judgment' : 'Phán xét'}</strong>
                <div className="lkdf-scroll flex max-h-10 flex-wrap items-center gap-1 overflow-y-auto">
                    {selfPlayer.delayedScrolls.length > 0 ? (
                      selfPlayer.delayedScrolls.map((s) => {
                        const sid = `self:delayed:${s.id}`;
                        const active = inspector?.kind === 'card' && inspector.sourceId === sid;
                        return (
                          <button
                            key={s.id}
                            data-inspected-trigger={active ? 'true' : undefined}
                            {...cardHover(s)}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectCard(s, sid, isEn ? 'Your Judgment Zone' : 'Khu phán xét của bạn');
                            }}
                            className={[
                              'inline-flex cursor-pointer items-center gap-0.5 rounded border px-1 py-0 text-[9.5px] font-bold',
                              active
                                ? 'border-[#FDE68A] bg-[#D97706]/35 text-[#FFF3D1]'
                                : 'border-[#D97706]/50 bg-[#D97706]/20 text-[#FCD34D] hover:border-[#FBBF24]',
                            ].join(' ')}
                          >
                            <GameIcon name="ui:clock" size={10} />
                            {getCuuChauCardDisplay(s.cardKey, locale, s.nameVi).name}
                          </button>
                        );
                      })
                    ) : (
                      <span>{isEn ? 'Empty' : 'Trống'}</span>
                    )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Hàng bài giữ nguyên chiều cao và căn giữa trên toàn bộ phần còn lại của thanh đáy. */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col justify-center">
          {selfPlayer?.alive && fullHand.length > 1 && !handIsFaceDown ? (
            <button
              type="button"
              aria-pressed={reorderingHand}
              onClick={() => setReorderingHand((value) => !value)}
              className={[
                'absolute top-0 right-1 z-25 inline-flex h-[20px] cursor-pointer items-center gap-1 rounded border px-2 py-0 text-[10px] leading-none font-semibold shadow-sm transition-colors',
                reorderingHand
                  ? 'border-[#FBBF24] bg-[#4D3012] text-[#FEF08A]'
                  : 'border-[#B89352]/60 bg-[#17130E]/95 text-[#FDE68A] hover:border-[#E6BE6C]',
              ].join(' ')}
            >
              {reorderingHand ? (
                <>
                  <GameIcon name="ui:check" size={11} />
                  <span>{isEn ? 'Done · drag or ← → swap [Esc]' : 'Xong · kéo hoặc ← → đổi chỗ [Esc]'}</span>
                </>
              ) : (
                <>
                  <GameIcon name="ui:layers" size={11} />
                  <span>{isEn ? 'Sort Hand' : 'Sắp xếp bài tay'}</span>
                </>
              )}
            </button>
          ) : null}
          {/* Dải bài neo đáy cố định (0px giật bài khi thanh lệnh bật/tắt; chừa 22px đỉnh cho nhô bài khi rê/chọn) */}
          <div className="lkdf-battle-hand lkdf-scroll flex h-full min-h-0 flex-1 items-end justify-center overflow-x-auto overflow-y-hidden px-1 pt-[22px] pb-1">
            {handIsFaceDown ? (
              <div className="mx-auto flex items-end gap-1" aria-label={isEn ? 'Hand cards face-down' : 'Bài tay đang úp'}>
                {Array.from({ length: selfPlayer?.handCount ?? 0 }, (_, index) => <CardBack key={index} size="md" />)}
              </div>
            ) : handCards.length === 0 ? (
              isHeroSelectPhase ? (
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[#A68042]/40 bg-[#1B1410]/55 px-4 text-center text-[12px] font-medium text-[#E8DCC8]">
                  {playerView.heroDraft?.stage === 'COMPLETED'
                    ? isEn
                      ? 'All generals locked — Dealing opening cards…'
                      : 'Tất cả đã chốt tướng — Chờ chia bài…'
                    : selfHero || playerView.heroDraft?.mySelectedHero
                      ? isEn
                        ? 'General locked — Waiting for other players…'
                        : 'Đã chốt tướng — Chờ người chơi khác để chia bài…'
                      : isEn
                        ? 'Selecting general — Waiting to deal 4 opening cards…'
                        : 'Đang chọn tướng — Chờ chia 4 lá mở màn…'}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[#A68042]/30 text-[12px] text-[#9CA3AF]">
                  {isEn ? 'No cards left in hand' : 'Không còn lá bài nào trên tay'}
                </div>
              )
            ) : (
              <div
                data-reordering={reorderingHand ? 'true' : undefined}
                className={[
                  'lkdf-hand-row mx-auto flex h-full items-end rounded-lg transition-colors',
                  reorderingHand ? 'ring-1 ring-[#FBBF24]/55 bg-[#2A1D10]/35 px-1.5' : '',
                ].join(' ')}
              >
                {handCards.map((card, index) => {
                  const isCardSelected = selection.selectedCardIds.includes(card.id);
                  const isBeingDragged = reorderingHand && reorderDraggingId === card.id;
                  const isDropTarget =
                    reorderingHand &&
                    reorderOverId === card.id &&
                    reorderDraggingId !== null &&
                    reorderDraggingId !== card.id;
                  const overlapClass =
                    index === 0
                      ? ''
                      : handCards.length >= 13
                        ? '-ml-7'
                        : handCards.length >= 10
                          ? '-ml-5'
                          : handCards.length >= 8
                            ? '-ml-4'
                            : handCards.length >= 6
                              ? '-ml-1.5'
                              : 'ml-1.5';
                  return (
                  <div
                    key={card.id}
                    data-hand-card-id={card.id}
                    draggable={reorderingHand}
                    aria-label={
                      reorderingHand
                        ? isEn
                          ? `Move ${getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name} (← →)`
                          : `Đổi vị trí ${getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name} (← →)`
                        : undefined
                    }
                    onDragStart={(event) => {
                      if (!reorderingHand) return;
                      draggedHandCard.current = card.id;
                      setReorderDraggingId(card.id);
                      setReorderOverId(null);
                      event.dataTransfer.setData('text/plain', card.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      draggedHandCard.current = null;
                      setReorderDraggingId(null);
                      setReorderOverId(null);
                    }}
                    onDragOver={(event) => {
                      if (!reorderingHand) return;
                      event.preventDefault();
                      if (reorderOverId !== card.id) {
                        setReorderOverId(card.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (reorderOverId === card.id) {
                        setReorderOverId(null);
                      }
                    }}
                    onDrop={(event) => {
                      if (!reorderingHand || !draggedHandCard.current) return;
                      event.preventDefault();
                      moveHandCard(draggedHandCard.current, card.id);
                      draggedHandCard.current = null;
                      setReorderDraggingId(null);
                      setReorderOverId(null);
                    }}
                    onKeyDown={(event) => {
                      if (!reorderingHand) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                      event.preventDefault();
                      event.stopPropagation();
                      const neighbor = handCards[index + (event.key === 'ArrowLeft' ? -1 : 1)];
                      if (neighbor) {
                        moveHandCard(card.id, neighbor.id);
                        const movedId = card.id;
                        requestAnimationFrame(() => {
                          arenaRef.current
                            ?.querySelector<HTMLElement>(`[data-hand-card-id="${movedId}"] button`)
                            ?.focus();
                        });
                      }
                    }}
                    data-selected-card={isCardSelected ? 'true' : undefined}
                    data-reorder-target={isDropTarget ? 'true' : undefined}
                    className={[
                      'relative transition-[opacity,transform] duration-150',
                      overlapClass,
                      selection.activeConvertMode &&
                      !isCardValidForConvertMode(card, selection.activeConvertMode)
                        ? 'opacity-35 saturate-50'
                        : '',
                      isBeingDragged ? 'opacity-45 scale-95' : '',
                      isDropTarget ? 'rounded-[6px] ring-2 ring-[#FBBF24]' : '',
                    ].join(' ')}
                  >
                    <HandCardItem
                      card={card}
                      selected={isCardSelected}
                      dragging={dragState?.card.id === card.id}
                      disabled={!selfPlayer?.alive}
                      hotkeyNumber={index < 9 ? index + 1 : undefined}
                      compact={handCards.length > 7}
                      fanIndex={index}
                      fanCount={handCards.length}
                      onToggle={reorderingHand ? () => undefined : handleHandClick}
                      onDoubleClickCard={reorderingHand || directReaction ? undefined : handleDoubleClickCard}
                      onPointerDownCard={reorderingHand ? undefined : handleStartCardPointerDown}
                    />
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


      </div>
      {inspector ? (
        <div className="pointer-events-auto absolute right-2.5 bottom-[calc(var(--dock-h,196px)+8px)] z-40 flex max-h-[min(310px,50cqh)] w-[clamp(268px,26cqw,308px)] flex-col">
          <MatchInspectorBox
            inspector={inspector}
            selfPlayer={selfPlayer}
            players={playerView.players}
            onClose={() => setInspector(null)}
            onResetToSelf={
              selfPlayer?.heroId &&
              !(inspector.kind === 'hero' && inspector.seatIndex === selfPlayer.seatIndex)
                ? () => setInspector({ kind: 'hero', seatIndex: selfPlayer.seatIndex })
                : undefined
            }
          />
        </div>
      ) : null}
      <MatchHoverTooltip />
    </div>
  );
}
