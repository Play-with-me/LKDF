import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { formatRankLabel, isRedSuit } from '@lkdf/shared';
import type {
  CardInstance,
  GameAction,
  PlayerViewState,
  PublicPlayerView,
  TargetCardZone,
  TimerPresetConfig,
} from '@lkdf/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getUiAssetUrl } from '../../lib/assetCatalog.js';
import {
  CardBack,
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { TakeHandTray } from './TakeHandTray.js';
import { PlayingCardFace } from './HandCardItem.js';
import {
  describePendingActorPrompt,
  formatCardShort,
  getPlayerSeatLabel,
} from './matchTypes.js';

type ThrowOriginLookup = (cardId: string) => { x: number; y: number } | null;

export interface MatchCenterBoardProps {
  readonly playerView: PlayerViewState;
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly isTimerPaused: boolean;
  readonly inspectedCardId?: string | null;
  readonly takeThrowOrigin?: ThrowOriginLookup;
  readonly onSendAction: (action: GameAction) => void;
  readonly onInspectCard?: (card: CardInstance, sourceLabel: string) => void;
}

function useCountdownSeconds(
  phaseDeadlineAt: string | null,
  pausedRemainingMs: number | null,
  isTimerPaused: boolean,
): number | null {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (isTimerPaused || !phaseDeadlineAt) {
      return;
    }
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(id);
  }, [phaseDeadlineAt, isTimerPaused]);

  if (isTimerPaused && pausedRemainingMs !== null) {
    return Math.max(0, Math.ceil(pausedRemainingMs / 1000));
  }
  if (!phaseDeadlineAt) {
    return null;
  }
  const deadlineMs = Date.parse(phaseDeadlineAt);
  if (Number.isNaN(deadlineMs)) {
    return null;
  }
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

function GuanXingPlanner({
  cards,
  seatIndex,
  onSendAction,
}: {
  readonly cards: readonly CardInstance[];
  readonly seatIndex: number;
  readonly onSendAction: (action: GameAction) => void;
}) {
  const [topIds, setTopIds] = useState<string[]>(() => cards.map((c) => c.id));
  const [bottomIds, setBottomIds] = useState<string[]>([]);

  useEffect(() => {
    setTopIds(cards.map((c) => c.id));
    setBottomIds([]);
  }, [cards]);

  const cardById = useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const moveCard = (cardId: string, to: 'TOP' | 'BOTTOM') => {
    if (to === 'TOP') {
      setBottomIds((prev) => prev.filter((id) => id !== cardId));
      setTopIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
    } else {
      setTopIds((prev) => prev.filter((id) => id !== cardId));
      setBottomIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
    }
  };

  return (
    <div className="rounded-lg border border-[#D99B26]/60 bg-[#14171A] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FBBF24]">
          <GameIcon name="ui:sparkles" size={13} />
          Quan Tinh — Đầu ({topIds.length}) / Đáy ({bottomIds.length})
        </span>
        <button
          type="button"
          onClick={() =>
            onSendAction({
              type: 'RESPOND_GUAN_XING',
              seatIndex,
              topCardIds: topIds,
              bottomCardIds: bottomIds,
            })
          }
          className="cursor-pointer rounded bg-[#C83E37] px-2.5 py-1 text-[11px] font-bold text-[#F3F4F6] hover:bg-[#B2342E]"
        >
          Xác nhận Quan Tinh
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded border border-[#2D333B] bg-[#1E2328] p-2">
          <div className="mb-1.5 text-[11px] font-bold text-[#86EFAC]">
            Đầu chồng bài (rút trước)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topIds.map((id, idx) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => moveCard(id, 'BOTTOM')}
                  title={`Bấm để chuyển ${formatCardShort(card)} xuống đáy`}
                  className="lkdf-card-gwent group relative flex h-[68px] w-[48px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#86EFAC]/65 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#FBBF24]"
                >
                  <PlayingCardFace card={card} showCategoryTag={false} />
                  <span className="absolute top-0.5 right-0.5 z-10 rounded bg-[#14171A]/90 px-1 text-[9px] font-bold text-[#86EFAC] ring-1 ring-[#86EFAC]/50">
                    #{idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded border border-[#2D333B] bg-[#1E2328] p-2">
          <div className="mb-1.5 text-[11px] font-bold text-[#93C5FD]">
            Đáy chồng bài
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bottomIds.map((id) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => moveCard(id, 'TOP')}
                  title={`Bấm để chuyển ${formatCardShort(card)} lên đầu`}
                  className="lkdf-card-gwent group relative flex h-[68px] w-[48px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#93C5FD]/55 opacity-85 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#FBBF24] hover:opacity-100"
                >
                  <PlayingCardFace card={card} showCategoryTag={false} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function YiJiDistributor({
  cards,
  playerView,
  onSendAction,
}: {
  readonly cards: readonly CardInstance[];
  readonly playerView: PlayerViewState;
  readonly onSendAction: (action: GameAction) => void;
}) {
  const alivePlayers = useMemo(
    () => playerView.players.filter((p) => p.alive),
    [playerView.players],
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => cards[0]?.id ?? null);
  const [assignByCardId, setAssignByCardId] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of cards) {
      init[c.id] = playerView.viewerSeatIndex;
    }
    return init;
  });

  useEffect(() => {
    const init: Record<string, number> = {};
    for (const c of cards) {
      init[c.id] = playerView.viewerSeatIndex;
    }
    setAssignByCardId(init);
    setSelectedCardId(cards[0]?.id ?? null);
  }, [cards, playerView.viewerSeatIndex]);

  const handleConfirm = () => {
    const bySeat = new Map<number, string[]>();
    for (const c of cards) {
      const targetSeat = assignByCardId[c.id] ?? playerView.viewerSeatIndex;
      const list = bySeat.get(targetSeat) ?? [];
      list.push(c.id);
      bySeat.set(targetSeat, list);
    }
    const distributions = Array.from(bySeat.entries()).map(([targetSeat, cardIds]) => ({
      targetSeat,
      cardIds,
    }));
    onSendAction({
      type: 'RESPOND_YI_JI',
      seatIndex: playerView.viewerSeatIndex,
      distributions,
    });
  };

  return (
    <div className="rounded-lg border border-[#D99B26]/60 bg-[#14171A] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FBBF24]">
          <GameIcon name="scroll-unfurled" size={13} />
          Di Kế — Chọn người nhận bài
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className="cursor-pointer rounded bg-[#C83E37] px-2.5 py-1 text-[11px] font-bold text-[#F3F4F6] hover:bg-[#B2342E]"
        >
          Chia bài Di Kế
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-wrap gap-1.5">
          {cards.map((card) => {
            const targetSeat = assignByCardId[card.id] ?? playerView.viewerSeatIndex;
            const isSelected = selectedCardId === card.id;
            const shortTarget =
              targetSeat === playerView.viewerSeatIndex
                ? 'Bản thân'
                : `Ghế #${targetSeat + 1}`;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
                title={`Chọn ${formatCardShort(card)} để gán người nhận`}
                className={[
                  'lkdf-card-gwent relative flex h-[68px] w-[48px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] text-left transition-transform duration-150',
                  isSelected
                    ? 'border-2 border-[#FBBF24] ring-2 ring-[#FBBF24]/50 -translate-y-0.5'
                    : 'border border-[#B89352]/60 hover:border-[#E6BE6C]',
                ].join(' ')}
              >
                <PlayingCardFace card={card} showCategoryTag={false} />
                <span className="absolute inset-x-0 bottom-0 z-10 truncate bg-[#14171A]/90 px-1 py-0.5 text-center text-[9px] font-bold text-[#FDE68A]">
                  {shortTarget}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {alivePlayers.map((p) => {
            const activeTarget =
              selectedCardId !== null &&
              (assignByCardId[selectedCardId] ?? playerView.viewerSeatIndex) === p.seatIndex;
            const label =
              p.seatIndex === playerView.viewerSeatIndex
                ? 'Bản thân'
                : `Ghế #${p.seatIndex + 1} · ${p.displayName}`;
            return (
              <button
                key={p.seatIndex}
                type="button"
                disabled={selectedCardId === null}
                onClick={() => {
                  if (!selectedCardId) return;
                  setAssignByCardId((prev) => ({
                    ...prev,
                    [selectedCardId]: p.seatIndex,
                  }));
                }}
                className={[
                  'cursor-pointer rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors',
                  activeTarget
                    ? 'border-[#FBBF24] bg-[#D99B26]/25 text-[#FDE68A]'
                    : 'border-[#3A424C] bg-[#1E2328] text-[#D1D5DB] hover:border-[#B89352]',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getPublicTargetZones(player: PublicPlayerView): TargetCardZone[] {
  const zones: TargetCardZone[] = [];
  if (player.handCount > 0) zones.push('HAND');
  if (player.equipments.weapon !== null) zones.push('WEAPON');
  if (player.equipments.armor !== null) zones.push('ARMOR');
  if (player.equipments.plusOneHorse !== null) zones.push('PLUS_ONE_HORSE');
  if (player.equipments.minusOneHorse !== null) zones.push('MINUS_ONE_HORSE');
  if (player.delayedScrolls.length > 0) zones.push('DELAYED');
  return zones;
}

function TablePlayedCard({
  card,
  isLatest,
  isInspected,
  takeThrowOrigin,
  onInspect,
}: {
  readonly card: CardInstance;
  readonly isLatest: boolean;
  readonly isInspected: boolean;
  readonly takeThrowOrigin?: ThrowOriginLookup;
  readonly onInspect?: (card: CardInstance, sourceLabel: string) => void;
}) {
  const rankLabel = formatRankLabel(card.rank);
  const faceRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const origin = takeThrowOrigin?.(card.id);
    if (prefersReducedMotion()) return;

    const motion = origin
      ? (() => {
          const bounds = face.getBoundingClientRect();
          const dx = origin.x - bounds.left - bounds.width / 2;
          const dy = origin.y - bounds.top - bounds.height / 2;
          return face.animate(
            [
              { translate: `${dx}px ${dy}px`, scale: 1.1 },
              { translate: `${dx * 0.9}px ${dy * 0.9 - 12}px`, scale: 1.13, offset: 0.19 },
              { translate: '0 -3px', scale: 1.03, offset: 0.86 },
              { translate: '0 0', scale: 1 },
            ],
            { duration: 240, easing: 'cubic-bezier(.22,.72,.32,1)' },
          );
        })()
      : face.animate(
          [
            { transform: 'perspective(600px) rotateY(-82deg) scale(0.95)', opacity: 0.2 },
            { transform: 'perspective(600px) rotateY(0deg) scale(1)', opacity: 1 },
          ],
          { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        );
    return () => motion.cancel();
    // Run arrival flight or 3D reveal strictly once per card arrival without stealing takeThrowOrigin during render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  return (
    <button
      ref={faceRef}
      data-recent-discard={isLatest ? 'latest' : 'older'}
      type="button"
      onClick={onInspect ? () => onInspect(card, 'Bài ngửa giữa bàn') : undefined}
      title={`Bấm xem kỹ năng ${rankLabel} ${card.nameVi}`}
      className={[
        'lkdf-card-gwent group relative flex h-[104px] w-[74px] shrink-0 flex-col overflow-hidden rounded-[6px] text-left text-[#F4EBD8] transition-transform duration-150 select-none',
        onInspect ? 'cursor-pointer hover:-translate-y-1.5 hover:z-30' : '',
        isInspected
          ? 'z-30 border-2 border-[#FDE68A] shadow-[0_12px_24px_rgba(230,190,108,0.45)] ring-2 ring-[#E6BE6C]/70'
          : isLatest
            ? 'z-20 border-[1.5px] border-[#E6BE6C] shadow-[0_10px_22px_rgba(230,190,108,0.34)] ring-1 ring-[#E6BE6C]/70'
            : 'z-10 border-[1.5px] border-[#6E7889]/80 brightness-95 shadow-md',
      ].join(' ')}
    >
      <PlayingCardFace card={card} showCategoryTag />
    </button>
  );
}

function buildTargetedSelfAlertVi(view: PlayerViewState): string | null {
  const interrupt = view.activeInterrupt;
  if (!interrupt) return null;
  const viewer = view.viewerSeatIndex;
  const getName = (seat: number | undefined | null) =>
    seat === undefined || seat === null ? 'Đối thủ' : getPlayerSeatLabel(view.players, seat);

  if (
    interrupt.kind === 'WAIT_DODGE' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} đang đánh Sát vào BẠN!`;
  }
  if (
    interrupt.kind === 'WAIT_DUEL_SAT' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} đang Quyết Đấu với BẠN!`;
  }
  if (
    interrupt.kind === 'WAIT_AOE_SAT' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} dùng Nam Man Nhập Xâm nhắm BẠN!`;
  }
  if (
    interrupt.kind === 'WAIT_AOE_DODGE' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} dùng Vạn Tiễn Tề Phát nhắm BẠN!`;
  }
  if (
    interrupt.kind === 'PICK_TARGET_CARD' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} đang ${interrupt.stealing ? 'Thuận Thủ Khiên Dương' : 'Quá Hà Sái Cầu'} bài của BẠN!`;
  }
  if (
    interrupt.kind === 'WAIT_COLLATERAL_SAT' &&
    interrupt.attackerSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return `🎯 ${getName(interrupt.sourceSeat)} dùng Tá Đao Sát Nhân lên BẠN!`;
  }
  if (interrupt.kind === 'WAIT_NULLIFICATION') {
    const nullifyInterrupt = interrupt as typeof interrupt & {
      readonly originalScrollNameVi?: string;
      readonly originalTargetSeat?: number;
      readonly nullifyDepth?: number;
    };
    const origTarget = nullifyInterrupt.originalTargetSeat ?? interrupt.targetSeat;
    const origName = nullifyInterrupt.originalScrollNameVi ?? interrupt.scrollNameVi ?? 'Cẩm nang';
    if (origTarget === viewer && (nullifyInterrupt.nullifyDepth ?? 0) % 2 === 0) {
      return `⚠️ Cẩm nang [${origName}] đang nhắm vào BẠN!`;
    }
  }
  return null;
}

export function MatchCenterBoard({
  playerView,
  phaseDeadlineAt,
  pausedRemainingMs,
  isTimerPaused,
  inspectedCardId = null,
  takeThrowOrigin,
  onSendAction,
  onInspectCard,
}: MatchCenterBoardProps) {
  const [recentDiscards, setRecentDiscards] = useState<readonly CardInstance[]>(() =>
    playerView.discardPileTop ? [playerView.discardPileTop] : [],
  );
  const prevMatchIdRef = useRef<string>(playerView.matchId);
  const prevDiscardCountRef = useRef<number>(playerView.discardPileCount);

  useEffect(() => {
    const matchChanged = prevMatchIdRef.current !== playerView.matchId;
    const discardCount = playerView.discardPileCount;
    const topCard = playerView.discardPileTop;

    if (matchChanged || discardCount === 0 || !topCard) {
      prevMatchIdRef.current = playerView.matchId;
      prevDiscardCountRef.current = discardCount;
      setRecentDiscards(topCard && discardCount > 0 ? [topCard] : []);
      return;
    }

    const wentBackwards = discardCount < prevDiscardCountRef.current;
    prevDiscardCountRef.current = discardCount;

    setRecentDiscards((prev) => {
      if (wentBackwards) {
        const idx = prev.findIndex((c) => c.id === topCard.id);
        return idx >= 0 ? prev.slice(0, idx + 1) : [topCard];
      }
      if (prev.length > 0 && prev[prev.length - 1]?.id === topCard.id) {
        return prev;
      }
      const withoutDup = prev.filter((c) => c.id !== topCard.id);
      return [...withoutDup, topCard].slice(-3);
    });
  }, [playerView.discardPileCount, playerView.discardPileTop, playerView.matchId]);

  const remainingSeconds = useCountdownSeconds(
    phaseDeadlineAt,
    pausedRemainingMs,
    isTimerPaused,
  );

  const prompt = describePendingActorPrompt(playerView);

  const interrupt = playerView.activeInterrupt;
  const isMyInteractiveZone =
    interrupt !== null && prompt.isMyTurn;

  const pickTargetPlayer =
    interrupt?.kind === 'PICK_TARGET_CARD'
      ? playerView.players.find((p) => p.seatIndex === interrupt.targetSeat)
      : undefined;

  const hasSpecialChoice =
    isMyInteractiveZone &&
    ((interrupt.kind === 'WAIT_HARVEST_PICK' && playerView.harvestPool.length > 0) ||
      (interrupt.kind === 'PICK_TARGET_CARD' && Boolean(pickTargetPlayer)) ||
      (interrupt.kind === 'WAIT_GUAN_XING' && Boolean(interrupt.guanXingCards)) ||
      (interrupt.kind === 'WAIT_YI_JI' && Boolean(interrupt.yiJiCards)));

  const topDiscard = recentDiscards[recentDiscards.length - 1] ?? null;
  const latestActionEntry =
    playerView.actionLog.length > 0
      ? playerView.actionLog[playerView.actionLog.length - 1]
      : null;
  const targetAlertVi = buildTargetedSelfAlertVi(playerView);
  const isFirstRoundPeaceful = Boolean(
    playerView.peacefulFirstRound &&
      playerView.roundNumber === 1 &&
      playerView.turnPhase !== 'HERO_SELECT' &&
      playerView.turnPhase !== 'GAME_OVER',
  );
  const spotlightText = latestActionEntry ?? prompt.detailVi;
  const cloudBorderUrl = getUiAssetUrl('tex-cloud-border');
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const plaqueStyle = cloudBorderUrl
    ? {
        backgroundImage: `linear-gradient(rgba(18,14,11,0.84), rgba(14,11,9,0.92))${inkBaseUrl ? `, url(${inkBaseUrl})` : ''}`,
        borderStyle: 'solid' as const,
        borderWidth: '5px 10px',
        borderColor: 'transparent',
        borderImage: `url(${cloudBorderUrl}) 16 26 stretch`,
      }
    : undefined;

  return (
    <div className="lkdf-battle-center-stack flex max-h-full min-h-0 min-w-0 w-full flex-col items-center gap-1.5">
      {/* Thanh trạng thái lượt + Cảnh báo nhắm vào BẠN + Nhật ký hành động mới nhất */}
      <div className="flex w-full max-w-[min(500px,100%)] flex-col items-center gap-1">
        <div
          style={plaqueStyle}
          className={
            cloudBorderUrl
              ? 'inline-flex max-w-full items-center gap-2 px-3 py-1 shadow-lg'
              : 'inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#D99B26]/35 bg-[#14171A]/85 px-3.5 py-1 shadow-md backdrop-blur-sm'
          }
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              prompt.isMyTurn ? 'bg-[#D99B26]' : 'bg-[#6B7280]'
            }`}
          />
          <span
            className={[
              'line-clamp-2 text-center text-[11.5px] font-bold leading-snug',
              prompt.isMyTurn ? 'text-[#FBBF24]' : 'text-[#F3F4F6]',
            ].join(' ')}
          >
            {prompt.headlineVi}
          </span>

          {remainingSeconds !== null ? (
            <span
              className={[
                'font-mono-num inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums',
                isTimerPaused
                  ? 'border-[#D97706]/50 bg-[#D97706]/15 text-[#FBBF24]'
                  : remainingSeconds <= 5
                    ? 'border-[#DC2626]/60 bg-[#DC2626]/20 text-[#FCA5A5]'
                    : 'border-[#3A424C] bg-[#1E2328] text-[#F3F4F6]',
              ].join(' ')}
            >
              <GameIcon name={isTimerPaused ? 'ui:pause' : 'ui:clock'} size={11} />
              {isTimerPaused ? `Dừng (${remainingSeconds}s)` : `${remainingSeconds}s`}
            </span>
          ) : null}
        </div>

        {(targetAlertVi || isFirstRoundPeaceful) ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {targetAlertVi ? (
              <div
                role="alert"
                data-targeted-alert="true"
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#F87171]/85 bg-[#451212]/94 px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#FEE2E2] shadow-[0_0_16px_rgba(220,38,38,0.45)]"
              >
                <span>{targetAlertVi}</span>
              </div>
            ) : null}
            {isFirstRoundPeaceful ? (
              <span
                data-round1-peace="true"
                className="inline-flex items-center gap-1 rounded-full border border-[#34D399]/55 bg-[#064E3B]/75 px-2.5 py-0.5 text-[10px] font-bold text-[#A7F3D0]"
              >
                🕊️ Vòng 1 Hòa Bình · Chưa đánh Sát
              </span>
            ) : null}
          </div>
        ) : null}

        {spotlightText ? (
          <div
            data-action-spotlight={playerView.actionLog.length}
            title={spotlightText}
            className="w-max max-w-full rounded-lg border border-[#B89352]/45 bg-[#12161F]/92 px-2 py-0.5 text-center text-[10.5px] font-semibold leading-snug text-[#FDE68A] shadow"
          >
            <span className="line-clamp-2">📣 {spotlightText}</span>
          </div>
        ) : null}
      </div>

      {/* Tier 2: Bàn bài trung tâm — Chồng bài rút + Các lá bài đánh ra tách rời dễ đọc */}
      {interrupt?.handPick && pickTargetPlayer ? (
        <TakeHandTray key={interrupt.id} interrupt={interrupt} owner={pickTargetPlayer}
          viewerSeat={playerView.viewerSeatIndex} onSendAction={onSendAction} />
      ) : !hasSpecialChoice ? (
        <div className="lkdf-battle-card-line flex items-end justify-center gap-3 pt-1 pb-1">
          {/* Chồng bài rút dạng xấp bài úp */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div data-motion-draw-pile className="relative flex h-[104px] w-[74px] items-center justify-center">
              <span aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-1 rounded-[6px] border border-[#D99B26]/40 bg-[#15253A]" />
              <span aria-hidden="true" className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-[6px] border border-[#D99B26]/55 bg-[#182B44]" />
              <CardBack size="md" className="relative block h-full w-full shadow-lg" />
            </div>
            <span className="font-mono-num inline-flex items-center gap-1 rounded-full border border-[#303740] bg-[#14171A]/85 px-2.5 py-0.5 text-[11px] font-semibold text-[#D1D5DB] tabular-nums">
              Rút: <strong className="text-[#F3F4F6]">{playerView.drawPileCount}</strong>
            </span>
          </div>
          {/* Các lá bài đã đánh / bỏ gần nhất (tách rời thẳng hàng, 0px đè lên nhau) */}
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <div className="flex min-h-[104px] min-w-[74px] items-center justify-center px-0.5">
              {recentDiscards.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5">
                  {recentDiscards.map((card, idx) => (
                    <TablePlayedCard
                      key={`${card.id}-${idx}`}
                      card={card}
                      isLatest={idx === recentDiscards.length - 1}
                      isInspected={inspectedCardId === card.id}
                      takeThrowOrigin={takeThrowOrigin}
                      onInspect={onInspectCard}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[98px] w-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#D99B26]/30 bg-[#14171A]/35 text-center text-[#9CA3AF]">
                  <GameIcon name="card-play" size={20} className="text-[#D99B26]/55" />
                  <span className="text-[10px] font-medium leading-tight">
                    Vùng đánh bài
                  </span>
                </div>
              )}
            </div>
            <span className="font-mono-num inline-flex items-center gap-1.5 rounded-full border border-[#303740] bg-[#14171A]/85 px-2.5 py-0.5 text-[11px] font-semibold text-[#D1D5DB] tabular-nums">
              <GameIcon name="card-discard" size={11} className="text-[#9CA3AF]" />
              {topDiscard ? (
                <span className="max-w-[160px] truncate">
                  {topDiscard.nameVi} · Bỏ: <strong className="text-[#F3F4F6]">{playerView.discardPileCount}</strong>
                </span>
              ) : (
                <span>
                  Bỏ: <strong className="text-[#F3F4F6]">{playerView.discardPileCount}</strong>
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        /* Khu tương tác đặc biệt (chỉ bật nổi giữa bàn khi tới lượt chọn bài chung/mục tiêu/Quan Tinh/Di Kế) */
        <div className="lkdf-battle-choice lkdf-scroll w-full space-y-1.5 overflow-y-auto rounded-xl border border-[#D99B26]/65 bg-[#14171A]/95 p-2.5 shadow-2xl">
          {/* Ngũ Cốc Phong Đăng */}
          {interrupt.kind === 'WAIT_HARVEST_PICK' &&
          playerView.harvestPool.length > 0 ? (
            <div>
              <div className="lkdf-battle-harvest" aria-label="Các lá Ngũ Cốc để chọn">
                {playerView.harvestPool.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      onSendAction({
                        type: 'RESPOND_HARVEST_PICK',
                        seatIndex: playerView.viewerSeatIndex,
                        cardId: card.id,
                      })
                    }
                    className={[
                      'lkdf-card-gwent lkdf-card-flip-3d relative flex flex-col overflow-hidden border border-[#B89352]/60 rounded cursor-pointer hover:border-[#E6BE6C]',
                      isRedSuit(card.suit) ? 'text-[#FCA5A5]' : 'text-[#F4EBD8]',
                    ].join(' ')}
                  >
                    <PlayingCardFace card={card} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Thuận Thủ Khiên Dương / Quá Hà Sái Cầu */}
          {interrupt.kind === 'PICK_TARGET_CARD' && pickTargetPlayer ? (
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FBBF24]">
                <GameIcon name="archery-target" size={13} />
                Chọn 1 lá từ {getPlayerSeatLabel(playerView.players, pickTargetPlayer.seatIndex)}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getPublicTargetZones(pickTargetPlayer).map((zone: TargetCardZone) => {
                  if (zone === 'HAND') {
                    if (interrupt.stealing) {
                      return <button key="HAND" type="button"
                        className="rounded border border-[#D99B26]/60 bg-[#272D35] px-3 py-1.5 text-xs font-bold"
                        onClick={() => onSendAction({
                          type: 'RESPOND_PICK_TARGET_CARD', seatIndex: playerView.viewerSeatIndex, zone: 'HAND',
                        })}>Lấy từ bài tay ({pickTargetPlayer.handCount})</button>;
                    }
                    return Array.from({ length: pickTargetPlayer.handCount }, (_, idx) => (
                      <button
                        key={`hand-${idx}`}
                        type="button"
                        onClick={() =>
                          onSendAction({
                            type: 'RESPOND_PICK_TARGET_CARD',
                            seatIndex: playerView.viewerSeatIndex,
                            zone: 'HAND',
                            handIndex: idx,
                          })
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#D99B26]/60 bg-[#272D35] px-2 py-1 text-[11px] font-bold text-[#F3F4F6] hover:bg-[#323A45]"
                      >
                        <CardBack size="xs" />
                        Tay #{idx + 1}
                      </button>
                    ));
                  }
                  if (zone === 'DELAYED') {
                    if (interrupt.allowDelayed === false) return null;
                    return pickTargetPlayer.delayedScrolls.map((scroll) => (
                      <button
                        key={scroll.id}
                        type="button"
                        onClick={() =>
                          onSendAction({
                            type: 'RESPOND_PICK_TARGET_CARD',
                            seatIndex: playerView.viewerSeatIndex,
                            zone: 'DELAYED',
                            delayedCardId: scroll.id,
                          })
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#D97706] bg-[#D97706]/20 px-2 py-1 text-[11px] font-bold text-[#FCD34D] hover:bg-[#D97706]/30"
                      >
                        <GameIcon name="ui:clock" size={11} />
                        {formatCardShort(scroll)}
                      </button>
                    ));
                  }
                  const equipCard =
                    zone === 'WEAPON'
                      ? pickTargetPlayer.equipments.weapon
                      : zone === 'ARMOR'
                        ? pickTargetPlayer.equipments.armor
                        : zone === 'PLUS_ONE_HORSE'
                          ? pickTargetPlayer.equipments.plusOneHorse
                          : pickTargetPlayer.equipments.minusOneHorse;
                  if (!equipCard) return null;
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() =>
                        onSendAction({
                          type: 'RESPOND_PICK_TARGET_CARD',
                          seatIndex: playerView.viewerSeatIndex,
                          zone,
                        })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#B89352]/60 bg-[#1B212C] px-2 py-1 text-[11px] font-bold text-[#F4EBD8] hover:border-[#E6BE6C]"
                    >
                      <GameIcon name={getCardGameIcon(equipCard.cardKey)} size={12} />
                      {formatCardShort(equipCard)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Quan Tinh */}
          {interrupt.kind === 'WAIT_GUAN_XING' && interrupt.guanXingCards ? (
            <GuanXingPlanner
              cards={interrupt.guanXingCards}
              seatIndex={playerView.viewerSeatIndex}
              onSendAction={onSendAction}
            />
          ) : null}

          {/* Di Kế */}
          {interrupt.kind === 'WAIT_YI_JI' && interrupt.yiJiCards ? (
            <YiJiDistributor
              cards={interrupt.yiJiCards}
              playerView={playerView}
              onSendAction={onSendAction}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
