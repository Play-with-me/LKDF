import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatRankLabel, getHeroDefinition } from '@lkdf/shared';
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
import {
  FactionSeal,
  GameIcon,
  HpJadeMeter,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { HandCardItem, PlayingCardFace } from './HandCardItem.js';
import { HeroCardWatermark } from './HeroCardWatermark.js';
import { HeroSelectPanel } from './HeroSelectPanel.js';
import { MatchCenterBoard } from './MatchCenterBoard.js';
import { MatchInspectorBox } from './MatchInspectorBox.js';
import { SeatCard } from './SeatCard.js';
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
  readonly autoSkipNullification: boolean;
  readonly connectionLost: boolean;
  readonly onReconnect: () => void;
  readonly onToggleCard: (cardId: string) => void;
  readonly onToggleTarget: (seatIndex: number) => void;
  readonly onToggleSkillMode: (skillId: PlaySkillMode) => void;
  readonly onToggleConvertMode: (mode: ConvertCardMode) => void;
  readonly onToggleAutoSkipNullification: (enabled: boolean) => void;
  readonly onSendAction: (action: GameAction) => void;
  readonly onSelectHero: (heroId: HeroId) => void;
  readonly onClearSelection?: () => void;
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
    { leftPct: 13.5, topPct: 68 },
    { leftPct: 19, topPct: 18 },
    { leftPct: 81, topPct: 18 },
    { leftPct: 86.5, topPct: 68 },
  ],
  5: [
    { leftPct: 13.5, topPct: 69 },
    { leftPct: 18, topPct: 18.5 },
    { leftPct: 50, topPct: 13.5 },
    { leftPct: 82, topPct: 18.5 },
    { leftPct: 86.5, topPct: 69 },
  ],
  6: [
    { leftPct: 14, topPct: 81 },
    { leftPct: 10.5, topPct: 48 },
    { leftPct: 28, topPct: 16 },
    { leftPct: 72, topPct: 16 },
    { leftPct: 89.5, topPct: 48 },
    { leftPct: 86, topPct: 81 },
  ],
  7: [
    { leftPct: 14, topPct: 81 },
    { leftPct: 10.5, topPct: 48 },
    { leftPct: 28, topPct: 16 },
    { leftPct: 50, topPct: 13 },
    { leftPct: 72, topPct: 16 },
    { leftPct: 89.5, topPct: 48 },
    { leftPct: 86, topPct: 81 },
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

export function MatchArenaLayout({
  playerView,
  roomSeats,
  timerConfig,
  phaseDeadlineAt,
  pausedRemainingMs,
  isTimerPaused,
  selection,
  autoSkipNullification,
  connectionLost,
  onReconnect,
  onToggleCard,
  onToggleTarget,
  onToggleSkillMode,
  onToggleConvertMode,
  onToggleAutoSkipNullification,
  onSendAction,
  onSelectHero,
  onClearSelection,
  renderActionSidebar,
}: MatchArenaLayoutProps) {
  const ordered = getOrderedSeatsClockwiseFromSelf(
    playerView.players,
    playerView.viewerSeatIndex,
  );
  const selfPlayer = ordered[0];
  const opponents = ordered.slice(1);
  const coords = getRoundSeatCoords(opponents.length);
  const isCompactSeats = playerView.players.length >= 7;

  const prompt = describePendingActorPrompt(playerView);
  const targetSpec = getRequiredTargetSpec(playerView, selection);
  const isPlayPhaseSelf =
    playerView.turnPhase === 'PLAY' &&
    playerView.currentTurnSeat === playerView.viewerSeatIndex &&
    playerView.activeInterrupt === null;

  const isTargetSelectionActive =
    isPlayPhaseSelf && targetSpec.maxTargets > 0 && targetSpec.eligibleSeats.length > 0;

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

  const handCards = selfPlayer?.handCards ?? [];
  const availableSkills = isPlayPhaseSelf
    ? getAvailablePlaySkills(selfPlayer, playerView.turnFlags)
    : [];
  const availableConverts =
    isPlayPhaseSelf || (playerView.activeInterrupt !== null && prompt.isMyTurn)
      ? getAvailableConvertModes(selfPlayer, isPlayPhaseSelf)
      : [];

  const isBotTakeoverSelf = Boolean(selfPlayer?.isBotTakeover);
  const showNetworkBanner = connectionLost || isBotTakeoverSelf;
  const isHeroSelectPhase = playerView.turnPhase === 'HERO_SELECT';

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

  // Đặt lại inspector và kéo thả khi chuyển ván hoặc đổi pha
  useEffect(() => {
    setInspector(null);
  }, [playerView.matchId]);

  useEffect(() => {
    dragSessionRef.current = null;
    setDragState(null);
  }, [playerView.turnPhase, playerView.activeInterrupt?.kind, playerView.currentTurnSeat]);

  const handleCardToggleFromUi = useCallback(
    (cardId: string) => {
      if (suppressClickCardIdRef.current === cardId) {
        suppressClickCardIdRef.current = null;
        return;
      }
      const cardObj = handCards.find((c) => c.id === cardId);
      const willBeSelected = !selection.selectedCardIds.includes(cardId);
      if (cardObj && willBeSelected) {
        setInspector({
          kind: 'card',
          sourceId: `hand:${cardObj.id}`,
          sourceLabel: 'Lá bài trên tay',
          card: cardObj,
        });
      } else if (
        !willBeSelected &&
        selection.selectedCardIds.length <= 1 &&
        inspector?.kind === 'card' &&
        inspector.sourceId === `hand:${cardId}`
      ) {
        setInspector(null);
      }
      onToggleCard(cardId);
    },
    [handCards, inspector, onToggleCard, selection.selectedCardIds],
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
      const intent = buildCardDragDropIntent(playerView, card, selection);
      dragSessionRef.current = {
        card,
        startX: event.clientX,
        startY: event.clientY,
        intent,
        active: false,
        hoverSeatIdx: null,
        hoverTable: false,
      };
    },
    [playerView, selection, selfPlayer?.alive],
  );

  useEffect(() => {
    const syncGhostTransform = (clientX: number, clientY: number) => {
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${clientX - 39}px, ${clientY - 56}px, 0) rotate(-4deg) scale(1.06)`;
      }
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
      }

      syncGhostTransform(e.clientX, e.clientY);
      const { nextSeatIdx, nextTable } = detectDropHover(
        e.clientX,
        e.clientY,
        session.intent,
      );

      if (
        nextSeatIdx !== session.hoverSeatIdx ||
        nextTable !== session.hoverTable
      ) {
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
      syncGhostTransform(e.clientX, e.clientY);
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
      if (intent.kind === 'blocked') {
        setDragFeedbackVi(intent.reasonVi);
        return;
      }

      if (intent.kind === 'seat' && hover.nextSeatIdx !== null) {
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
        setDragFeedbackVi('Đã chọn người cầm Vũ khí — hãy bấm chọn tiếp nạn nhân trong tầm đánh!');
        return;
      }

      if (intent.kind === 'table' && hover.nextTable) {
        onSendAction(intent.action);
        setInspector(null);
        onClearSelection?.();
        return;
      }

      if (intent.kind === 'toggle_select' && hover.nextTable) {
        onToggleCard(card.id);
        setDragFeedbackVi(intent.promptVi);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', () => finishDrag());
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', () => finishDrag());
    };
  }, [
    onClearSelection,
    onSendAction,
    onToggleCard,
    onToggleTarget,
    playerView.viewerSeatIndex,
    selection.selectedCardIds,
  ]);

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
      emptyLabel: 'Vũ khí (Tầm 1)',
      shortLabel: 'Vũ khí',
      card: selfPlayer?.equipments.weapon ?? null,
    },
    {
      slotKey: 'armor',
      iconName: 'bordered-shield',
      emptyLabel: 'Giáp · Trống',
      shortLabel: 'Giáp',
      card: selfPlayer?.equipments.armor ?? null,
    },
    {
      slotKey: 'plusOne',
      iconName: 'horse-head',
      emptyLabel: 'Ngựa +1 · Trống',
      shortLabel: 'Ngựa +1',
      card: selfPlayer?.equipments.plusOneHorse ?? null,
    },
    {
      slotKey: 'minusOne',
      iconName: 'cavalry',
      emptyLabel: 'Ngựa -1 · Trống',
      shortLabel: 'Ngựa -1',
      card: selfPlayer?.equipments.minusOneHorse ?? null,
    },
  ];

  const renderOpponentSeat = (opp: PublicPlayerView, index: number) => {
    const coord = coords[index] ?? { leftPct: 50, topPct: 14 };
    const isEligible =
      isTargetSelectionActive && targetSpec.eligibleSeats.includes(opp.seatIndex);
    const isSelected = selection.selectedTargets.includes(opp.seatIndex);
    const isActor =
      prompt.actorSeat === opp.seatIndex ||
      (playerView.activeInterrupt === null &&
        playerView.turnPhase !== 'HERO_SELECT' &&
        playerView.currentTurnSeat === opp.seatIndex);

    const dragEligible =
      Boolean(dragState) &&
      (dragState?.intent.kind === 'seat' || dragState?.intent.kind === 'seat_pair_step1') &&
      dragState.intent.eligibleSeats.includes(opp.seatIndex);
    const dragHovered = dragEligible && dragState?.hoverSeatIdx === opp.seatIndex;
    const dragHoverLabel =
      dragState?.intent.kind === 'seat'
        ? `Thả để ${dragState.intent.actionVerbVi}!`
        : dragState?.intent.kind === 'seat_pair_step1'
          ? 'Thả chọn người cầm Vũ khí!'
          : undefined;

    const isTopBand = coord.topPct <= 24;
    return (
      <div
        key={opp.seatIndex}
        style={{
          left: `${coord.leftPct}%`,
          top: isTopBand
            ? coord.topPct <= 14
              ? 'clamp(4px, 1.1cqh, 10px)'
              : 'clamp(10px, 2.2cqh, 18px)'
            : `${coord.topPct}%`,
        }}
        className={[
          'absolute z-20 -translate-x-1/2',
          isTopBand ? 'translate-y-0' : '-translate-y-1/2',
        ].join(' ')}
      >
        <SeatCard
          player={opp}
          playerView={playerView}
          isDisconnected={isDisconnectedBySeat.get(opp.seatIndex) ?? false}
          isActiveActor={isActor}
          isTargetEligible={isEligible}
          isSelectedTarget={isSelected}
          isInspectedHero={inspector?.kind === 'hero' && inspector.seatIndex === opp.seatIndex}
          inspectedCardSourceId={inspector?.kind === 'card' ? inspector.sourceId : null}
          isDragTargetEligible={dragEligible}
          isDragHovered={dragHovered}
          dragHoverLabelVi={dragHoverLabel}
          compact={isCompactSeats}
          onSelectTarget={isEligible ? onToggleTarget : undefined}
          onInspectHero={handleInspectHero}
          onInspectCard={handleInspectCard}
        />
      </div>
    );
  };

  const interrupt = playerView.activeInterrupt;
  const showCenterReaction = interrupt !== null && interrupt.kind !== 'WAIT_HARVEST_PICK';
  const showTableDropBanner =
    dragState !== null &&
    (dragState.intent.kind === 'table' || dragState.intent.kind === 'toggle_select');

  return (
    <div className="lkdf-arena-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#090807]">
      {dragState ? <DragGhostCard card={dragState.card} ghostRef={ghostRef} /> : null}

      {/* Thanh cảnh báo rớt mạng / Máy đánh hộ */}
      {showNetworkBanner ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D97706]/50 bg-[#D97706]/20 px-4 py-1 text-[12px] font-semibold text-[#FDE68A]">
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <GameIcon name="ui:wifi-off" size={14} className="shrink-0" />
            <span className="truncate">
              Mất kết nối mạng — Đang tự động kết nối lại... Ghế của bạn đang được Máy đánh hộ tạm thời
            </span>
          </span>
          <button
            type="button"
            onClick={onReconnect}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-[#D99B26] bg-[#14171A] px-2.5 py-0.5 text-[11px] font-bold text-[#FBBF24] hover:bg-[#1E2328]"
          >
            <GameIcon name="ui:refresh" size={12} />
            Kết nối lại ngay
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

          {/* Bảng trung tâm ở lòng Bàn Tròn */}
          {!isHeroSelectPhase ? (
            <div className="lkdf-battle-center absolute top-[61%] left-1/2 z-10 flex max-h-[calc(100%-108px)] w-[clamp(240px,30cqw,416px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
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
                onInspectCard={(card, sourceLabel) =>
                  handleInspectCard(card, `played:${card.id}`, sourceLabel)
                }
              />
              {showCenterReaction ? <div className="lkdf-battle-reaction">{renderActionSidebar()}</div> : null}
            </div>
          ) : (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B0E11]/60 p-3">
              <div className="h-full max-h-[440px] w-full max-w-[780px] min-h-0">
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
            </div>
          )}

          {/* Vùng Quăng Bài Trung Tâm khi kéo lá không cần mục tiêu */}
          {showTableDropBanner && dragState ? (
            <div
              data-drop-table="1"
              className={[
                'pointer-events-none absolute bottom-3 left-1/2 z-25 w-[min(440px,46cqw)] -translate-x-1/2 rounded-xl border-2 border-dashed px-4 py-2 text-center shadow-2xl transition-colors',
                dragState.hoverTable
                  ? 'lkdf-drop-pulse border-[#FBBF24] bg-[#5C2816]/94'
                  : 'border-[#D99B26]/70 bg-[#14100C]/90',
              ].join(' ')}
            >
              <span className="font-serif-title text-[12.5px] font-bold text-[#FDE68A]">
                ✨{' '}
                {dragState.intent.kind === 'table'
                  ? dragState.intent.actionLabelVi
                  : dragState.intent.kind === 'toggle_select'
                    ? dragState.intent.promptVi
                    : ''}
              </span>
            </div>
          ) : null}

          {dragState && (dragState.intent.kind === 'seat' || dragState.intent.kind === 'seat_pair_step1') ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-24 -translate-x-1/2 rounded-full border border-[#D99B26]/60 bg-[#120E0B]/92 px-3.5 py-1 text-[11px] font-bold text-[#FDE68A] shadow-lg">
              🎯{' '}
              {dragState.intent.kind === 'seat'
                ? `Kéo thả thẳng lên 1 ghế sáng viền vàng để ${dragState.intent.actionVerbVi}`
                : dragState.intent.actionLabelVi}
            </div>
          ) : null}

          {dragState && dragState.intent.kind === 'blocked' ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-24 -translate-x-1/2 rounded-full border border-[#DC2626]/55 bg-[#1B1111]/94 px-3.5 py-1 text-[11px] font-semibold text-[#FCA5A5] shadow-lg">
              🔒 {dragState.intent.reasonVi}
            </div>
          ) : !dragState && dragFeedbackVi ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-24 -translate-x-1/2 rounded-full border border-[#A68042]/50 bg-[#14110D]/92 px-3.5 py-1 text-[11px] font-semibold text-[#E6CFA3] shadow-lg">
              ℹ️ {dragFeedbackVi}
            </div>
          ) : null}
        </div>
      </div>

      {/* VÙNG 4: THANH ĐÁY RESPONSIVE (TRÁI: TƯỚNG + 4 Ô TRANG BỊ NGỬA | GIỮA: THANH LỆNH ẨN/HIỆN + QUĂNG BÀI | PHẢI: XEM KỸ NĂNG THỐNG NHẤT) */}
      <div
        className="lkdf-battle-dock flex h-[var(--dock-h,196px)] shrink-0 min-w-0 items-stretch gap-2.5 border-t border-[#94A3B8]/32 bg-[#0D1016] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        {/* Cột Trái: Khung Đôi Mẫu B (Hồ sơ Tướng tràn viền + 4 Ô Trang Bị Ngửa & Phán xét) */}
        <div className="lkdf-battle-player flex w-[var(--left-w,312px)] shrink-0 overflow-hidden rounded-[6px] border border-[#94A3B8]/38 bg-[#12161E] shadow-lg">
          {/* Nửa Trái: Hồ sơ Tướng bản thân (Bấm quay về kỹ năng tướng mình) */}
          <div
            onClick={() => setInspector(null)}
            title="Bấm xem lại kỹ năng tướng của bạn"
            className="lkdf-battle-profile relative flex w-[var(--prof-w,152px)] shrink-0 cursor-pointer flex-col justify-between overflow-hidden p-2"
          >
            <HeroCardWatermark
              portraitUrl={!selfPhotoFailed ? selfPortraitUrl : null}
              widthClass="w-[74%]"
              opacityClass="opacity-72"
            />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1">
              {selfPlayer ? (
                <>
                  <div className="flex shrink-0 items-start gap-1.5 min-w-0">
                    {!selfPortraitUrl ? (
                      <div
                        className={[
                          'relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-[#0B0E14] text-xs font-bold text-[#F3F4F6]',
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
                          className="truncate text-[clamp(10px,0.9cqw,12px)] font-bold text-[#E2E8F0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                        >
                          {selfPlayer.displayName}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 min-w-0">
                        {selfHero ? (
                          <>
                            <FactionSeal faction={selfHero.faction} size="xs" />
                            <span className="min-w-0 truncate font-serif-title text-[clamp(11px,0.96cqw,13px)] font-bold text-[#F5EBD6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.98)]">
                              {selfHero.nameVi}
                            </span>
                          </>
                        ) : (
                          <span className="truncate text-[10px] text-[#9CA3AF]">Chưa chọn</span>
                        )}
                      </div>
                      <span
                        className={[
                          'mt-1 inline-block rounded border px-1.5 py-0 text-[9px] font-bold bg-[#0B0E14]/90',
                          getIdentityBadgeClass(selfPlayer.identity),
                        ].join(' ')}
                      >
                        {getIdentityLabelVi(selfPlayer.identity)}
                      </span>
                    </div>
                  </div>

                  {/* Máu + Nút kỹ năng nhanh */}
                  <div className="flex min-h-0 flex-1 flex-col gap-1">
                    <div className="flex shrink-0 items-center justify-between gap-1">
                      <HpJadeMeter hp={selfPlayer.hp} maxHp={selfPlayer.maxHp} size="sm" />
                      {!selfPlayer.alive ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FCA5A5]">
                          <GameIcon name="death-skull" size={11} />
                          Tử trận
                        </span>
                      ) : null}
                    </div>

                    {(availableSkills.length > 0 || availableConverts.length > 0) ? (
                      <div
                        className="lkdf-scroll flex min-h-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto pr-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {availableSkills.map((skill) => {
                          const active = selection.activeSkillMode === skill.id;
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              title={skill.descriptionVi}
                              onClick={() => onToggleSkillMode(skill.id)}
                              className={[
                                'inline-flex cursor-pointer items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9.5px] leading-tight font-bold transition-colors',
                                active
                                  ? 'border-[#D99B26] bg-[#D99B26]/25 text-[#FBBF24]'
                                  : 'border-[#3A424C] bg-[#1E2328] text-[#D1D5DB] hover:border-[#D99B26]/70',
                              ].join(' ')}
                            >
                              <GameIcon name="ui:sparkles" size={10} />
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
                              title={opt.descriptionVi}
                              onClick={() => onToggleConvertMode(opt.mode)}
                              className={[
                                'inline-flex cursor-pointer items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9.5px] leading-tight font-bold transition-colors',
                                active
                                  ? 'border-[#C83E37] bg-[#C83E37]/25 text-[#FCA5A5]'
                                  : 'border-[#3A424C] bg-[#1E2328] text-[#D1D5DB] hover:border-[#C83E37]/70',
                              ].join(' ')}
                            >
                              <GameIcon name="ui:convert" size={10} />
                              {opt.labelVi}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                </>
              ) : (
                <div className="text-[11px] text-[#9CA3AF]">Đang tải thông tin ghế...</div>
              )}
            </div>
          </div>

          {/* Nửa Phải Cột Trái: 4 Ô Trang Bị Ngửa tinh gọn (Bấm xem được kỹ năng!) */}
          <div className="lkdf-battle-equip flex min-h-0 min-w-0 flex-1 flex-col gap-1 border-l border-[#94A3B8]/25 bg-[#0B0E14]/90 p-1.5">
            <div className="flex shrink-0 items-center justify-between text-[9.5px] font-bold tracking-wide text-[#B89352] uppercase">
              <span className="truncate">Trang bị</span>
              <span className="shrink-0 text-[9px] font-normal normal-case text-[#94A3B8]">4 ô</span>
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
                          : 'border-[#94A3B8]/18 bg-[#12161E]/70 text-[#8B949E]',
                      ].join(' ')}
                    >
                      <GameIcon name={iconName} size={12} className="shrink-0 opacity-75" />
                      <span className="truncate" title={emptyLabel}>{shortLabel}</span>
                    </div>
                  );
                }

                const artUrl = getCardArtUrl(card.cardKey);
                const sid = `self:${slotKey}`;
                const active = inspector?.kind === 'card' && inspector.sourceId === sid;
                const red = isCardRed(card);

                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => handleInspectCard(card, sid, 'Trang bị của bạn')}
                    title={`Bấm xem công dụng ${card.nameVi}`}
                    className={[
                      'flex min-h-0 w-full flex-1 cursor-pointer items-center gap-1.5 rounded border px-1.5 text-left transition-colors',
                      active
                        ? 'border-[#FDE68A] bg-[#E6BE6C]/22 ring-1 ring-[#FDE68A]/55'
                        : 'border-[#B89352]/55 bg-[#161B23] hover:border-[#E6BE6C]',
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
                      {card.nameVi}
                    </span>
                  </button>
                );
              })}
            </div>
            {selfPlayer ? (
              <div className="lkdf-battle-judgment text-[10px]">
                <strong>Phán xét</strong>
                <div className="lkdf-scroll flex max-h-10 flex-wrap items-center gap-1 overflow-y-auto">
                    {selfPlayer.delayedScrolls.length > 0 ? (
                      selfPlayer.delayedScrolls.map((s) => {
                        const sid = `self:delayed:${s.id}`;
                        const active = inspector?.kind === 'card' && inspector.sourceId === sid;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectCard(s, sid, 'Khu phán xét của bạn');
                            }}
                            className={[
                              'inline-flex cursor-pointer items-center gap-0.5 rounded border px-1 py-0 text-[9.5px] font-bold',
                              active
                                ? 'border-[#FDE68A] bg-[#D97706]/35 text-[#FFF3D1]'
                                : 'border-[#D97706]/50 bg-[#D97706]/20 text-[#FCD34D] hover:border-[#FBBF24]',
                            ].join(' ')}
                          >
                            <GameIcon name="ui:clock" size={10} />
                            {s.cardKey === 'lac_bat_tu_thuc' ? 'Lạc Bất Tư' : s.nameVi}
                          </button>
                        );
                      })
                    ) : (
                      <span>Trống</span>
                    )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Cột Giữa: Meta + Thanh Lệnh Ngữ Cảnh (Ẩn khi ngoài lượt) + Dải Bài Quăng Thả */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 pb-0.5 text-[clamp(9.5px,0.85cqw,11.5px)]">
            <div className="flex min-w-0 items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[#D1D5DB] select-none">
                <input
                  type="checkbox"
                  checked={autoSkipNullification}
                  onChange={(e) => onToggleAutoSkipNullification(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#D99B26]"
                />
                <span className="truncate">Tự bỏ qua Vô Giải</span>
              </label>
              <span className="hidden truncate text-[#94A3B8] lg:inline">
                Kéo lên bàn/ghế · Bấm nhẹ xem chiêu
              </span>
            </div>

            <span className="font-mono-num shrink-0 text-[#B5A792] tabular-nums">
              Trên tay: <strong className="text-[#EFE6D5]">{handCards.length}</strong> lá
            </span>
          </div>

          {/* Thanh Lệnh Ngữ Cảnh: TỰ ĐỘNG ẨN (null) khi ngoài lượt, hiện gọn khi tới lượt hoặc cần phản ứng */}
          <div className="shrink-0">{!showCenterReaction ? renderActionSidebar() : null}</div>

          {/* Dải bài neo đáy cố định (0px giật bài khi thanh lệnh bật/tắt) */}
          <div className="lkdf-battle-hand lkdf-scroll flex min-h-0 flex-1 items-end overflow-x-auto px-1 pt-1 pb-0.5">
            {handCards.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[#A68042]/30 text-[12px] text-[#9CA3AF]">
                Không còn lá bài nào trên tay
              </div>
            ) : (
              <div className="mx-auto flex items-end">
                {handCards.map((card, index) => (
                  <div
                    key={card.id}
                    className={
                      index === 0
                        ? ''
                        : handCards.length > 7
                          ? '-ml-4'
                          : 'ml-1.5'
                    }
                  >
                    <HandCardItem
                      card={card}
                      selected={selection.selectedCardIds.includes(card.id)}
                      dragging={dragState?.card.id === card.id}
                      disabled={!selfPlayer?.alive}
                      hotkeyNumber={index < 9 ? index + 1 : undefined}
                      compact={handCards.length > 7}
                      onToggle={handleCardToggleFromUi}
                      onPointerDownCard={handleStartCardPointerDown}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải (Thay thế Action Sidebar cũ): Khoang Xem Kỹ Năng Thống Nhất */}
        <MatchInspectorBox
          inspector={inspector}
          selfPlayer={selfPlayer}
          players={playerView.players}
          onResetToSelf={() => setInspector(null)}
        />
      </div>
    </div>
  );
}
