import { formatRankLabel, isRedSuit } from '@lkdf/shared';
import type {
  CardInstance,
  GameAction,
  PlayerViewState,
  PublicPlayerView,
  TargetCardZone,
  TimerPresetConfig,
} from '@lkdf/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
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

export interface MatchCenterBoardProps {
  readonly playerView: PlayerViewState;
  readonly timerConfig: TimerPresetConfig;
  readonly phaseDeadlineAt: string | null;
  readonly pausedRemainingMs: number | null;
  readonly isTimerPaused: boolean;
  readonly inspectedCardId?: string | null;
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
          <div className="mb-1 text-[11px] font-bold text-[#86EFAC]">
            Đầu chồng bài (rút trước)
          </div>
          <div className="flex flex-wrap gap-1">
            {topIds.map((id, idx) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => moveCard(id, 'BOTTOM')}
                  title="Bấm để chuyển xuống đáy"
                  className={[
                    'cursor-pointer rounded border border-[#B89352]/60 bg-[#1B212C] px-2 py-0.5 text-[11px] font-bold hover:border-[#E6BE6C]',
                    isRedSuit(card.suit) ? 'text-[#FCA5A5]' : 'text-[#F4EBD8]',
                  ].join(' ')}
                >
                  {idx + 1}. {formatCardShort(card)} ↓
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded border border-[#2D333B] bg-[#1E2328] p-2">
          <div className="mb-1 text-[11px] font-bold text-[#93C5FD]">
            Đáy chồng bài
          </div>
          <div className="flex flex-wrap gap-1">
            {bottomIds.map((id) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => moveCard(id, 'TOP')}
                  title="Bấm để chuyển lên đầu"
                  className={[
                    'cursor-pointer rounded border border-[#B89352]/60 bg-[#1B212C] px-2 py-0.5 text-[11px] font-bold hover:border-[#E6BE6C]',
                    isRedSuit(card.suit) ? 'text-[#FCA5A5]' : 'text-[#F4EBD8]',
                  ].join(' ')}
                >
                  {formatCardShort(card)} ↑
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
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-2 rounded border border-[#3A424C] bg-[#1E2328] p-1.5"
          >
            <span
              className={[
                'rounded border border-[#B89352]/60 bg-[#1B212C] px-2 py-0.5 text-[11px] font-bold',
                isRedSuit(card.suit) ? 'text-[#FCA5A5]' : 'text-[#F4EBD8]',
              ].join(' ')}
            >
              {formatCardShort(card)}
            </span>
            <select
              aria-label={`Chọn người nhận ${card.nameVi}`}
              value={assignByCardId[card.id] ?? playerView.viewerSeatIndex}
              onChange={(e) =>
                setAssignByCardId((prev) => ({
                  ...prev,
                  [card.id]: Number(e.target.value),
                }))
              }
              className="rounded border border-[#3A424C] bg-[#14171A] px-2 py-0.5 text-[11px] text-[#F3F4F6]"
            >
              {alivePlayers.map((p) => (
                <option key={p.seatIndex} value={p.seatIndex}>
                  {p.seatIndex === playerView.viewerSeatIndex
                    ? `${p.displayName} (Bản thân)`
                    : getPlayerSeatLabel(playerView.players, p.seatIndex)}
                </option>
              ))}
            </select>
          </div>
        ))}
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

const TABLE_FAN_ROTATIONS_DEG = [-7, -2.5, 2, -4, 3] as const;

function TablePlayedCard({
  card,
  isLatest,
  isInspected,
  rotationDeg,
  overlapLeft,
  onInspect,
}: {
  readonly card: CardInstance;
  readonly isLatest: boolean;
  readonly isInspected: boolean;
  readonly rotationDeg: number;
  readonly overlapLeft: boolean;
  readonly onInspect?: (card: CardInstance, sourceLabel: string) => void;
}) {
  const rankLabel = formatRankLabel(card.rank);

  return (
    <button
      type="button"
      onClick={onInspect ? () => onInspect(card, 'Bài ngửa giữa bàn') : undefined}
      title={`Bấm xem kỹ năng ${rankLabel} ${card.nameVi}`}
      style={{ transform: `rotate(${rotationDeg}deg)` }}
      className={[
        'lkdf-card-gwent group relative flex h-[104px] w-[74px] shrink-0 flex-col overflow-hidden rounded-[6px] text-left text-[#F4EBD8] transition-transform duration-150 select-none',
        onInspect ? 'cursor-pointer hover:-translate-y-1.5 hover:z-30' : '',
        overlapLeft ? '-ml-6' : '',
        isInspected
          ? 'z-30 border-2 border-[#FDE68A] shadow-[0_12px_24px_rgba(230,190,108,0.45)] ring-2 ring-[#E6BE6C]/70'
          : isLatest
            ? 'z-20 border-[1.5px] border-[#E6BE6C] shadow-[0_12px_24px_rgba(0,0,0,0.72)] ring-1 ring-[#E6BE6C]/55'
            : 'z-10 border-[1.5px] border-[#6E7889]/75 brightness-[0.88] shadow-md',
      ].join(' ')}
    >
      <PlayingCardFace card={card} showCategoryTag />
    </button>
  );
}

export function MatchCenterBoard({
  playerView,
  phaseDeadlineAt,
  pausedRemainingMs,
  isTimerPaused,
  inspectedCardId = null,
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
      return [...withoutDup, topCard].slice(-5);
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
    <div className="lkdf-battle-center-stack flex max-h-full min-h-0 min-w-0 w-full flex-col items-center gap-2">
      {/* Thanh trạng thái lượt nhỏ gọn khảm viền mây cổ Doanh Trại A */}
      <div className="flex max-w-[min(460px,54cqw)] flex-col items-center gap-0.5">
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



        <p className="max-w-full truncate px-2 text-center text-[11px] text-[#9CA3AF]">
          {prompt.detailVi}
        </p>
      </div>

      {/* Bàn bài trung tâm: Chồng bài rút + Tụ bài đánh ra kiểu Tiến Lên Miền Nam */}
      {interrupt?.handPick && pickTargetPlayer ? (
        <TakeHandTray key={interrupt.id} interrupt={interrupt} owner={pickTargetPlayer}
          viewerSeat={playerView.viewerSeatIndex} onSendAction={onSendAction} />
      ) : !hasSpecialChoice ? (
        <div className="lkdf-battle-card-line flex items-end justify-center gap-7 py-1">
          {/* Chồng bài rút dạng xấp bài úp */}
          <div className="lkdf-battle-pile flex flex-col items-center gap-1.5">
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1.5 left-1.5 h-[100px] w-[72px] rounded-lg border border-[#D99B26]/30 bg-[#0F1B2B]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 left-0.5 h-[100px] w-[72px] rounded-lg border border-[#D99B26]/50 bg-[#15253A]"
              />
              <CardBack size="lg" className="relative z-10 shadow-lg" />
            </div>
            <span className="font-mono-num inline-flex items-center gap-1 rounded-full border border-[#303740] bg-[#14171A]/85 px-2.5 py-0.5 text-[11px] font-semibold text-[#D1D5DB] tabular-nums">
              Rút: <strong className="text-[#F3F4F6]">{playerView.drawPileCount}</strong>
            </span>
          </div>

          {/* Tụ bài đánh ra kiểu Tiến Lên Miền Nam (xòe ngang đè nhẹ giữa bàn) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex min-h-[104px] min-w-[96px] items-center justify-center px-2">
              {recentDiscards.length > 0 ? (
                <div className="flex items-center justify-center">
                  {recentDiscards.map((card, idx) => (
                    <TablePlayedCard
                      key={`${card.id}-${idx}`}
                      card={card}
                      isLatest={idx === recentDiscards.length - 1}
                      isInspected={inspectedCardId === card.id}
                      rotationDeg={TABLE_FAN_ROTATIONS_DEG[idx % TABLE_FAN_ROTATIONS_DEG.length] ?? 0}
                      overlapLeft={idx > 0}
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
        <div className="lkdf-battle-choice lkdf-scroll max-h-[185px] w-full space-y-1.5 overflow-y-auto rounded-xl border border-[#D99B26]/65 bg-[#14171A]/95 p-2.5 shadow-2xl">
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
                      'lkdf-card-gwent relative flex flex-col overflow-hidden border border-[#B89352]/60 rounded cursor-pointer hover:border-[#E6BE6C]',
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
