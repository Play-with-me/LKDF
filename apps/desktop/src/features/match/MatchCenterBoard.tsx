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
import { BlindHandCardFan } from './MatchActionSidebar.js';
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
    <div className="lkdf-planner-panel">
      <div className="lkdf-planner-head mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11.5px] font-bold text-[#FDE68A]">
          <GameIcon name="ui:sparkles" size={13} className="shrink-0 text-[#E6BE6C]" />
          <span className="truncate">
            Quan Tinh ({topIds.length}/{bottomIds.length})
          </span>
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
          className="shrink-0 cursor-pointer whitespace-nowrap rounded bg-[#9E2B25] px-2 py-1 text-[10.5px] font-bold text-[#FFF5EC] hover:bg-[#B2342E]"
        >
          Xác nhận Quan Tinh
        </button>
      </div>
      <div className="lkdf-planner-grid grid grid-cols-1 gap-1.5">
        <div className="lkdf-planner-col rounded border border-[#806345]/50 bg-[#1D1510] p-1.5">
          <div className="mb-1 flex items-center justify-between text-[10.5px] leading-tight font-bold text-[#86EFAC]">
            <span>Đầu chồng bài (rút trước)</span>
            <span className="text-[9.5px] font-normal text-[#C7B69B]">Bấm lá để đẩy xuống đáy</span>
          </div>
          {topIds.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {topIds.map((id, idx) => {
                const card = cardById.get(id);
                if (!card) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => moveCard(id, 'BOTTOM')}
                    title={`Bấm để chuyển ${formatCardShort(card)} xuống đáy`}
                    className="lkdf-card-gwent lkdf-planner-card group relative flex h-[64px] w-[46px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#86EFAC]/65 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#FBBF24]"
                  >
                    <PlayingCardFace card={card} showCategoryTag={false} />
                    <span className="absolute top-0.5 right-0.5 z-10 rounded bg-[#16110E]/92 px-1 text-[8.5px] leading-tight font-bold text-[#86EFAC] ring-1 ring-[#86EFAC]/50">
                      #{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-[#A89984]">Chưa có lá ở đầu chồng bài.</p>
          )}
        </div>
        <div className="lkdf-planner-col rounded border border-[#806345]/50 bg-[#1D1510] p-1.5">
          <div className="flex items-center justify-between text-[10.5px] leading-tight font-bold text-[#93C5FD]">
            <span>Đáy chồng bài</span>
            {bottomIds.length === 0 ? (
              <span className="text-[9.5px] font-normal text-[#A89984]">Trống</span>
            ) : (
              <span className="text-[9.5px] font-normal text-[#C7B69B]">Bấm lá để đưa lên đầu</span>
            )}
          </div>
          {bottomIds.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {bottomIds.map((id) => {
                const card = cardById.get(id);
                if (!card) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => moveCard(id, 'TOP')}
                    title={`Bấm để chuyển ${formatCardShort(card)} lên đầu`}
                    className="lkdf-card-gwent lkdf-planner-card group relative flex h-[64px] w-[46px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#93C5FD]/55 opacity-85 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#FBBF24] hover:opacity-100"
                  >
                    <PlayingCardFace card={card} showCategoryTag={false} />
                  </button>
                );
              })}
            </div>
          ) : null}
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
    <div className="lkdf-planner-panel">
      <div className="lkdf-planner-head mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#FDE68A]">
          <GameIcon name="scroll-unfurled" size={13} className="text-[#E6BE6C]" />
          Di Kế — Chọn người nhận bài
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className="cursor-pointer rounded bg-[#9E2B25] px-2.5 py-1 text-[11px] font-bold text-[#FFF5EC] hover:bg-[#B2342E]"
        >
          Chia bài Di Kế
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-wrap gap-1">
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
                  'lkdf-card-gwent lkdf-planner-card relative flex h-[64px] w-[46px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[5px] text-left transition-transform duration-150',
                  isSelected
                    ? 'border-2 border-[#FBBF24] ring-2 ring-[#FBBF24]/50 -translate-y-0.5'
                    : 'border border-[#B89352]/60 hover:border-[#E6BE6C]',
                ].join(' ')}
              >
                <PlayingCardFace card={card} showCategoryTag={false} />
                <span className="absolute inset-x-0 bottom-0 z-10 truncate bg-[#16110E]/92 px-1 py-0.5 text-center text-[8.5px] leading-tight font-bold text-[#FDE68A]">
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
                    : 'border-[#806345]/60 bg-[#1D1510] text-[#E8DCC8] hover:border-[#E6BE6C]',
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
  return zones;
}

function getTargetEquipZones(player: PublicPlayerView): readonly {
  readonly zone: 'WEAPON' | 'ARMOR' | 'PLUS_ONE_HORSE' | 'MINUS_ONE_HORSE';
  readonly prefix: string;
  readonly card: CardInstance;
}[] {
  const zones: {
    readonly zone: 'WEAPON' | 'ARMOR' | 'PLUS_ONE_HORSE' | 'MINUS_ONE_HORSE';
    readonly prefix: string;
    readonly card: CardInstance;
  }[] = [];
  if (player.equipments.weapon) {
    zones.push({ zone: 'WEAPON', prefix: 'Vũ khí:', card: player.equipments.weapon });
  }
  if (player.equipments.armor) {
    zones.push({ zone: 'ARMOR', prefix: 'Giáp:', card: player.equipments.armor });
  }
  if (player.equipments.plusOneHorse) {
    zones.push({
      zone: 'PLUS_ONE_HORSE',
      prefix: 'Ngựa +1 (Thủ):',
      card: player.equipments.plusOneHorse,
    });
  }
  if (player.equipments.minusOneHorse) {
    zones.push({
      zone: 'MINUS_ONE_HORSE',
      prefix: 'Ngựa -1 (Công):',
      card: player.equipments.minusOneHorse,
    });
  }
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
      data-inspected-trigger={isInspected ? 'true' : undefined}
      type="button"
      onClick={onInspect ? () => onInspect(card, 'Bài ngửa') : undefined}
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

function buildTargetedSelfAlert(
  view: PlayerViewState,
): { readonly icon: 'archery-target' | 'ui:alert'; readonly text: string } | null {
  const interrupt = view.activeInterrupt;
  if (!interrupt) return null;
  const viewer = view.viewerSeatIndex;
  const getName = (seat: number | undefined | null) =>
    seat === undefined || seat === null ? 'Đối thủ' : getPlayerSeatLabel(view.players, seat);

  if (interrupt.kind === 'WAIT_FAN_JIAN_GUESS' && interrupt.targetSeat === viewer) {
    return {
      icon: 'archery-target',
      text: `${getName(interrupt.sourceSeat)} dùng Phản Gián nhắm BẠN · Chọn chất bài!`,
    };
  }
  if (
    interrupt.kind === 'WAIT_DODGE' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    const req = interrupt.requiredCount ?? 1;
    const dodged = interrupt.dodgedSoFar ?? 0;
    return {
      icon: 'archery-target',
      text:
        req >= 2
          ? `${getName(interrupt.sourceSeat)} đang đánh Sát vào BẠN · Vô Song (Lữ Bố): Cần ${req} lá Thiểm (${dodged}/${req})!`
          : `${getName(interrupt.sourceSeat)} đang đánh Sát vào BẠN!`,
    };
  }
  if (
    interrupt.kind === 'WAIT_DUEL_SAT' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    const req = interrupt.requiredCount ?? 1;
    const played = interrupt.dodgedSoFar ?? 0;
    return {
      icon: 'archery-target',
      text:
        req >= 2
          ? `${getName(interrupt.sourceSeat)} đang Quyết Đấu với BẠN · Vô Song (Lữ Bố): Cần ${req} lá Sát (${played}/${req})!`
          : `${getName(interrupt.sourceSeat)} đang Quyết Đấu với BẠN!`,
    };
  }
  if (
    interrupt.kind === 'WAIT_AOE_SAT' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return {
      icon: 'archery-target',
      text: `${getName(interrupt.sourceSeat)} dùng Nam Man Nhập Xâm nhắm BẠN!`,
    };
  }
  if (
    interrupt.kind === 'WAIT_AOE_DODGE' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return {
      icon: 'archery-target',
      text: `${getName(interrupt.sourceSeat)} dùng Vạn Tiễn Tề Phát nhắm BẠN!`,
    };
  }
  if (
    interrupt.kind === 'PICK_TARGET_CARD' &&
    interrupt.targetSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    const action = interrupt.id.startsWith('fankui_pick_')
      ? 'Phản Quỷ'
      : interrupt.id.startsWith('tu_xi_take')
        ? 'Đột Tập'
        : interrupt.stealing ? 'Thuận Thủ Khiên Dương' : 'Quá Hà Sái Cầu';
    return {
      icon: 'archery-target',
      text: `${getName(interrupt.sourceSeat)} dùng ${action} nhắm bài của BẠN!`,
    };
  }
  if (
    interrupt.kind === 'WAIT_COLLATERAL_SAT' &&
    interrupt.attackerSeat === viewer &&
    interrupt.sourceSeat !== undefined &&
    interrupt.sourceSeat !== viewer
  ) {
    return {
      icon: 'archery-target',
      text: `${getName(interrupt.sourceSeat)} dùng Tá Đao Sát Nhân lên BẠN!`,
    };
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
      return {
        icon: 'ui:alert',
        text: `Cẩm nang [${origName}] đang nhắm vào BẠN!`,
      };
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
  const [privateDraw, setPrivateDraw] = useState<readonly CardInstance[]>([]);
  const privateDrawRef = useRef<HTMLDivElement>(null);
  const previousDrawView = useRef(playerView);
  useEffect(() => {
    const before = previousDrawView.current;
    previousDrawView.current = playerView;
    if (before.matchId !== playerView.matchId) { setPrivateDraw([]); return; }
    if (!before.availableDrawCount || !playerView.actionLog.slice(before.actionLog.length)
      .some(line => /rút [1-9]\d* lá ở pha Rút bài/u.test(line))) return;
    const seat = playerView.viewerSeatIndex;
    const oldIds = new Set(before.players.find(player => player.seatIndex === seat)?.handCards?.map(card => card.id));
    const received = playerView.players.find(player => player.seatIndex === seat)?.handCards?.filter(card => !oldIds.has(card.id));
    if (received?.length) setPrivateDraw(received.slice(0, before.availableDrawCount));
  }, [playerView]);
  useEffect(() => {
    if (!privateDraw.length) return;
    const timer = window.setTimeout(() => setPrivateDraw([]), 1380);
    return () => window.clearTimeout(timer);
  }, [privateDraw]);
  useLayoutEffect(() => {
    const preview = privateDrawRef.current;
    const arena = preview?.closest('.lkdf-arena-stage');
    if (!preview || !arena) return;
    const origin = arena.querySelector('[data-motion-draw-pile]')?.getBoundingClientRect();
    const hand = arena.querySelector('.lkdf-hand-row')?.getBoundingClientRect();
    const display = preview.getBoundingClientRect();
    if (origin && hand) {
      const delta = (rect: DOMRect, axis: 'x' | 'y') => axis === 'x'
        ? rect.left + rect.width / 2 - display.left - display.width / 2
        : rect.top + rect.height / 2 - display.top - display.height / 2;
      for (const axis of ['x', 'y'] as const) {
        preview.style.setProperty(`--draw-from-${axis}`, `${delta(origin, axis)}px`);
        preview.style.setProperty(`--draw-to-${axis}`, `${delta(hand, axis)}px`);
      }
    }
    const received = new Set(privateDraw.map(card => card.id));
    const hidden = [...arena.querySelectorAll<HTMLElement>('[data-hand-card-id]')].filter(card =>
      received.has(card.dataset.handCardId ?? ''));
    hidden.forEach(card => card.setAttribute('data-draw-arriving', 'true'));
    return () => hidden.forEach(card => card.removeAttribute('data-draw-arriving'));
  }, [privateDraw]);

  const [shownReveal, setShownReveal] = useState<NonNullable<PlayerViewState['publicReveals']>[number] | null>(null);
  const [prePrepareStealId, setPrePrepareStealId] = useState<string | null>(null);
  const revealCursor = useRef(playerView.publicReveals?.at(-1)?.id ?? 0);
  const [drawNotice, setDrawNotice] = useState<string | null>(null);
  const noticeCursor = useRef({ id: playerView.matchId, count: playerView.actionLog.length });
  const [criticalNotice, setCriticalNotice] = useState<string[]>([]);
  const revealMatch = useRef(playerView.matchId);
  const pendingReveals = useRef<NonNullable<PlayerViewState['publicReveals']>>([]);
  useEffect(() => {
    setPrePrepareStealId(null);
  }, [playerView.activeInterrupt?.id]);
  useEffect(() => {
    if (revealMatch.current !== playerView.matchId) {
      revealMatch.current = playerView.matchId;
      revealCursor.current = 0;
      pendingReveals.current = [];
      setShownReveal(null);
    }
    const reveals = (playerView.publicReveals ?? []).filter(item => item.id > revealCursor.current);
    if (!reveals.length) return;
    revealCursor.current = reveals.at(-1)!.id;
    pendingReveals.current = [...pendingReveals.current, ...reveals];
    setShownReveal(current => current ?? pendingReveals.current[0] ?? null);
  }, [playerView.matchId, playerView.publicReveals]);
  useEffect(() => {
    if (!shownReveal) return;
    const timer = window.setTimeout(() => {
      pendingReveals.current = pendingReveals.current.filter(item => item.id > shownReveal.id);
      setShownReveal(pendingReveals.current[0] ?? null);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [shownReveal]);

  useEffect(() => {
    const cursor = noticeCursor.current;
    const additions = cursor.id === playerView.matchId && cursor.count <= playerView.actionLog.length
      ? playerView.actionLog.slice(cursor.count)
      : [];
    noticeCursor.current = { id: playerView.matchId, count: playerView.actionLog.length };
    if (cursor.id !== playerView.matchId || cursor.count > playerView.actionLog.length) {
      setDrawNotice(null);
      setCriticalNotice([]);
    }
    const draw = additions.find(line => /rút [1-9]\d* lá ở pha Rút bài/u.test(line));
    if (draw) setDrawNotice(draw);
    const critical = additions.filter(line => /đã tử trận|rút thưởng|dùng Đào cứu/u.test(line));
    if (critical.length) setCriticalNotice(critical);
  }, [playerView.actionLog, playerView.matchId]);
  useEffect(() => {
    if (!drawNotice || shownReveal) return;
    const timer = window.setTimeout(() => setDrawNotice(null), 950);
    return () => window.clearTimeout(timer);
  }, [drawNotice, shownReveal]);
  useEffect(() => {
    if (!criticalNotice.length) return;
    const timer = window.setTimeout(() => setCriticalNotice([]), 3200);
    return () => window.clearTimeout(timer);
  }, [criticalNotice]);

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
  const hanBangTarget =
    interrupt?.kind === 'ASK_HAN_BANG_KIEM' &&
    interrupt.sourceSeat === playerView.viewerSeatIndex
      ? playerView.players.find((p) => p.seatIndex === interrupt.targetSeat)
      : undefined;

  const hasSpecialChoice =
    isMyInteractiveZone &&
    ((interrupt.kind === 'WAIT_HARVEST_PICK' && playerView.harvestPool.length > 0) ||
      (interrupt.kind === 'PICK_TARGET_CARD' && Boolean(pickTargetPlayer)) ||
      (interrupt.kind === 'ASK_HAN_BANG_KIEM' && Boolean(hanBangTarget)) ||
      (interrupt.kind === 'WAIT_GUAN_XING' && Boolean(interrupt.guanXingCards)) ||
      (interrupt.kind === 'WAIT_YI_JI' && Boolean(interrupt.yiJiCards)));

  const topDiscard = recentDiscards[recentDiscards.length - 1] ?? null;
  const latestActionEntry =
    playerView.actionLog.length > 0
      ? playerView.actionLog[playerView.actionLog.length - 1]
      : null;
  const targetAlert = buildTargetedSelfAlert(playerView);
  const isFirstRoundPeaceful = Boolean(
    playerView.peacefulFirstRound &&
      playerView.roundNumber === 1 &&
      playerView.turnPhase !== 'HERO_SELECT' &&
      playerView.turnPhase !== 'GAME_OVER',
  );
  const distributionLines: string[] = [];
  for (let index = playerView.actionLog.length - 1; index >= 0; index--) {
    const line = playerView.actionLog[index]!;
    if (!line.includes(' dùng Di Kế giao ')) break;
    distributionLines.unshift(line);
    if (distributionLines.length === 2) break;
  }
  const activeStage =
    shownReveal || playerView.turnPhase === 'DRAW' || playerView.turnPhase === 'JUDGE'
      ? 0
      : playerView.turnPhase === 'DISCARD'
        ? 2
        : playerView.turnPhase === 'PLAY'
          ? 1
          : 0;
  const liveRescue = playerView.activeInterrupt?.kind === 'WAIT_PEACH_RESCUE';
  const isSelfTurnPlayWithOnlyDrawLog = Boolean(
    playerView.viewerSeatIndex === playerView.currentTurnSeat &&
      playerView.turnPhase === 'PLAY' &&
      latestActionEntry &&
      /rút [1-9]\d* lá ở pha Rút bài/u.test(latestActionEntry),
  );
  const spotlightText = distributionLines.length
    ? distributionLines.join(' ')
    : isSelfTurnPlayWithOnlyDrawLog
      ? prompt.detailVi
      : latestActionEntry ?? prompt.detailVi;
  const showDrawNotice = Boolean(
    drawNotice &&
      !shownReveal &&
      !isSelfTurnPlayWithOnlyDrawLog &&
      drawNotice !== spotlightText,
  );
  const isSelfDrawTurn =
    playerView.viewerSeatIndex === playerView.currentTurnSeat &&
    playerView.turnPhase === 'DRAW' &&
    !interrupt &&
    (playerView.availableDrawCount ?? 0) > 0;
  const selfPlayer = playerView.players.find(
    (p) => p.seatIndex === playerView.viewerSeatIndex,
  );
  const drawReady = Boolean(playerView.availableDrawCount && !isTimerPaused);
  const isLuoYiSecond = drawReady && playerView.turnPhase === 'PLAY';
  const isAnhTuDraw =
    drawReady &&
    selfPlayer?.heroId === 'zhou_yu' &&
    (playerView.availableDrawCount ?? 0) >= 3;
  const cloudBorderUrl = getUiAssetUrl('tex-cloud-border');
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const plaqueStyle = cloudBorderUrl
    ? {
        backgroundImage: `linear-gradient(rgba(22,16,13,0.88), rgba(14,10,8,0.94))${inkBaseUrl ? `, url(${inkBaseUrl})` : ''}`,
        borderStyle: 'solid' as const,
        borderWidth: '5px 10px',
        borderColor: 'transparent',
        borderImage: `url(${cloudBorderUrl}) 16 26 stretch`,
      }
    : undefined;

  return (
    <div className="lkdf-battle-center-stack lkdf-scroll flex max-h-full min-h-0 min-w-0 w-full flex-col items-center gap-1.5 overflow-y-auto">
      {/* Tier 1: Bảng Trạng Thái Lượt Thống Nhất + Cảnh báo & Nhịp Hành Động */}
      <div className="flex w-full max-w-[min(500px,100%)] shrink-0 flex-col items-center gap-1">
        <div
          style={plaqueStyle}
          className={[
            cloudBorderUrl
              ? 'lkdf-center-plaque inline-flex max-w-full flex-col items-center gap-1 px-3 py-1.5 shadow-lg'
              : 'lkdf-center-plaque inline-flex max-w-full flex-col items-center gap-1 rounded-2xl border border-[#C89B4B]/45 bg-[#16110E]/92 px-3.5 py-1.5 shadow-md backdrop-blur-sm',
            isSelfDrawTurn
              ? 'ring-1 ring-[#FBBF24]/75 shadow-[0_0_20px_rgba(251,191,36,0.28)]'
              : '',
          ].join(' ')}
        >
          <div className="flex max-w-full items-center justify-center gap-2">
            {isSelfDrawTurn ? (
              <GameIcon name="ui:zap" size={13} className="shrink-0 text-[#FBBF24]" />
            ) : (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  prompt.isMyTurn
                    ? 'bg-[#E6BE6C] shadow-[0_0_8px_rgba(230,190,108,0.85)]'
                    : 'bg-[#78716C]'
                }`}
              />
            )}
            <span
              className={[
                'line-clamp-2 text-center text-[11.5px] font-bold leading-snug',
                prompt.isMyTurn ? 'text-[#FDE68A]' : 'text-[#F5EBD6]',
              ].join(' ')}
            >
              {prompt.headlineVi}
            </span>

            {remainingSeconds !== null ? (
              <span
                className={[
                  'font-mono-num inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums',
                  isTimerPaused
                    ? 'border-[#D97706]/55 bg-[#2A1C0E] text-[#FBBF24]'
                    : remainingSeconds <= 5
                      ? 'border-[#DC2626]/65 bg-[#3B1312] text-[#FCA5A5]'
                      : 'border-[#806345]/65 bg-[#1B1410] text-[#F5EBD6]',
                ].join(' ')}
              >
                <GameIcon name={isTimerPaused ? 'ui:pause' : 'ui:clock'} size={11} />
                {isTimerPaused ? `Dừng (${remainingSeconds}s)` : `${remainingSeconds}s`}
              </span>
            ) : null}
          </div>

          <div className="lkdf-center-steps flex min-h-[18px] flex-wrap items-center justify-center gap-1 border-t border-[#806345]/35 pt-0.5 text-[9.5px] leading-none">
            {['Phán xét & Rút bài', 'Ra bài', 'Bỏ bài'].map((label, index) => (
              <span
                key={label}
                aria-current={activeStage === index ? 'step' : undefined}
                className={
                  activeStage === index
                    ? 'rounded border border-[#D99B26]/65 bg-[#5C3712] px-1.5 py-0.5 font-bold text-[#FFF1C6]'
                    : 'rounded px-1.5 py-0.5 text-[#C6B7A0]'
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        {shownReveal || showDrawNotice ? (
          <div role="status" className="rounded border border-[#C89B4B]/55 bg-[#1B1410] px-2.5 py-0.5 text-[10px] font-medium text-[#FDE68A] shadow">
            {shownReveal ? (shownReveal.label.startsWith('Phản Gián') ? shownReveal.label : `Phán xét · ${shownReveal.label}`) : drawNotice}
          </div>
        ) : null}
        {liveRescue ? (
          <div role="status" className="rounded border border-red-400 bg-red-950 px-2.5 py-1 text-center text-xs font-bold text-red-100">
            Hấp hối · {playerView.players.find(player => player.seatIndex === playerView.activeInterrupt?.targetSeat)?.displayName} cần Đào
          </div>
        ) : criticalNotice.length ? (
          <div role="status" className="lkdf-critical-notice max-w-full rounded border border-[#D99B26]/70 bg-[#2E1A10] px-2.5 py-0.5 text-center text-[10px] font-bold text-[#FDE68A]">
            {criticalNotice.slice(-2).join(' ')}
          </div>
        ) : null}
        {(targetAlert || isFirstRoundPeaceful) ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {targetAlert ? (
              <div
                role="alert"
                data-targeted-alert="true"
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#F87171]/85 bg-[#451212]/94 px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#FEE2E2] shadow-[0_0_16px_rgba(220,38,38,0.45)]"
              >
                <GameIcon
                  name={targetAlert.icon}
                  size={11}
                  className={targetAlert.icon === 'ui:alert' ? 'shrink-0 text-[#FBBF24]' : 'shrink-0 text-[#FCA5A5]'}
                />
                <span>{targetAlert.text}</span>
              </div>
            ) : null}
            {isFirstRoundPeaceful ? (
              <span
                data-round1-peace="true"
                className="inline-flex items-center gap-1 rounded-full border border-[#34D399]/55 bg-[#064E3B]/75 px-2.5 py-0.5 text-[10px] font-bold text-[#A7F3D0]"
              >
                <GameIcon name="ui:feather" size={11} className="shrink-0 text-[#6EE7B7]" />
                <span>Vòng 1 Hòa Bình · Không rút bài &amp; Chưa đánh Sát</span>
              </span>
            ) : null}
          </div>
        ) : null}

        {spotlightText ? (
          <div
            data-action-spotlight={playerView.actionLog.length}
            role="status"
            title={spotlightText}
            className="lkdf-center-spotlight inline-flex w-max max-w-full items-center gap-1.5 rounded-lg border border-[#C89B4B]/50 bg-[#16110E]/94 px-2.5 py-0.5 text-center text-[10.5px] font-semibold leading-snug text-[#FDE68A] shadow"
          >
            <GameIcon name="ui:bell" size={11} className="shrink-0 text-[#E6BE6C]" />
            <span className="line-clamp-2">{spotlightText}</span>
          </div>
        ) : null}
      </div>

      {privateDraw.length ? (
        <div ref={privateDrawRef} role="status" aria-label={`Bài bạn vừa rút: ${privateDraw.map(card => card.nameVi).join(', ')}`}
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 gap-2">
          {privateDraw.map(card => (
            <div key={card.id} className="lkdf-private-draw relative h-[105px] w-[74px] rounded border border-[#E6BE6C] bg-[#211509] shadow-lg">
              <PlayingCardFace card={card} />
            </div>
          ))}
        </div>
      ) : null}
      {/* Tier 2: Bàn bài trung tâm — Chồng bài rút + Các lá bài đánh ra tách rời dễ đọc */}
      {(interrupt?.handPick || prePrepareStealId === interrupt?.id) && pickTargetPlayer ? (
        <TakeHandTray
          key={`${interrupt.id}-${interrupt.handPick ?? 'pre'}`}
          interrupt={interrupt}
          owner={pickTargetPlayer}
          viewerSeat={playerView.viewerSeatIndex}
          onSendAction={onSendAction}
          onBackToZones={
            !interrupt.handPick && getTargetEquipZones(pickTargetPlayer).length > 0
              ? () => setPrePrepareStealId(null)
              : undefined
          }
        />
      ) : !hasSpecialChoice ? (
        <div className="lkdf-battle-card-line flex items-end justify-center gap-3 pt-1 pb-1">
          {/* Chồng bài rút dạng xấp bài úp */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              data-motion-draw-pile
              data-draw-ready={drawReady ? 'true' : undefined}
              className="relative flex h-[104px] w-[74px] items-center justify-center"
            >
              <span aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-1 rounded-[6px] border border-[#D99B26]/40 bg-[#15253A]" />
              <span aria-hidden="true" className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-[6px] border border-[#D99B26]/55 bg-[#182B44]" />
              {drawReady ? (
                <button
                  type="button"
                  aria-label={`Rút ${playerView.availableDrawCount} lá`}
                  disabled={privateDraw.length > 0}
                  onClick={() =>
                    onSendAction({
                      type: 'DRAW_CARDS',
                      seatIndex: playerView.viewerSeatIndex,
                      extra: playerView.turnPhase === 'PLAY',
                    })
                  }
                  className="relative h-full w-full cursor-pointer rounded-lg ring-2 ring-[#FBBF24] shadow-[0_0_18px_rgba(251,191,36,0.45)] transition-all hover:ring-4 focus-visible:outline-2 focus-visible:outline-[#FFF1C6]"
                >
                  <CardBack size="md" className="relative block h-full w-full shadow-lg" />
                  <span className="pointer-events-none absolute inset-x-0.5 bottom-1 z-10 flex flex-col items-center gap-0.5 rounded bg-[#1A120A]/92 px-1 py-0.5 text-center shadow-[0_0_12px_rgba(251,191,36,0.6)] ring-1 ring-[#FBBF24]/85">
                    <span className="text-[10px] font-extrabold leading-none text-[#FDE68A]">
                      {isLuoYiSecond ? 'Rút lá 2' : `Rút ${playerView.availableDrawCount} lá`}
                    </span>
                    {isAnhTuDraw ? (
                      <span className="text-[8.5px] font-bold leading-none text-[#FBBF24]">Anh Tư</span>
                    ) : isLuoYiSecond ? (
                      <span className="text-[8.5px] font-bold leading-none text-[#FCA5A5]">Lỏa Y</span>
                    ) : null}
                  </span>
                </button>
              ) : (
                <CardBack size="md" className="relative block h-full w-full shadow-lg" />
              )}
            </div>
            <span className="font-mono-num inline-flex items-center gap-1 rounded-full border border-[#806345]/55 bg-[#16110E]/90 px-2 py-0.5 text-[11px] font-semibold text-[#E8DCC8] tabular-nums">
              Rút: <strong className="text-[#F5EBD6]">{playerView.drawPileCount}</strong>
            </span>
          </div>
          {shownReveal ? (
            <div data-public-card-reveal key={shownReveal.id} className="flex shrink-0 flex-col items-center gap-0.5 rounded border border-[#E6BE6C] bg-[#211509] p-1 shadow-lg">
              <span className="max-w-24 text-center text-[10px] font-bold text-[#FEF08A]">{shownReveal.label}</span>
              <div className="relative h-[86px] w-[62px]">
                <PlayingCardFace card={shownReveal.card} />
              </div>
            </div>
          ) : null}
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
                <div className="flex h-[98px] w-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#C89B4B]/40 bg-[#16110E]/45 text-center text-[#B5A792]">
                  <GameIcon name="card-play" size={20} className="text-[#D99B26]/65" />
                  <span className="text-[10px] font-medium leading-tight">
                    Vùng đánh bài
                  </span>
                </div>
              )}
            </div>
            <span className="font-mono-num inline-flex items-center gap-1.5 rounded-full border border-[#806345]/55 bg-[#16110E]/90 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8DCC8] tabular-nums">
              <GameIcon name="card-discard" size={11} className="text-[#C89B4B]" />
              {topDiscard ? (
                <span className="max-w-[236px] truncate">
                  {topDiscard.nameVi} · Bỏ: <strong className="text-[#F5EBD6]">{playerView.discardPileCount}</strong>
                </span>
              ) : (
                <span>
                  Bỏ: <strong className="text-[#F5EBD6]">{playerView.discardPileCount}</strong>
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        /* Khu tương tác đặc biệt (chỉ bật nổi giữa bàn khi tới lượt chọn bài chung/mục tiêu/Quan Tinh/Di Kế) */
        <div className="lkdf-battle-choice lkdf-scroll min-h-0 w-full flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-[#C89B4B]/70 bg-[#16110E]/96 p-2.5 shadow-2xl">
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
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FDE68A]">
                <GameIcon name="archery-target" size={13} className="text-[#E6BE6C]" />
                Chọn 1 lá từ {getPlayerSeatLabel(playerView.players, pickTargetPlayer.seatIndex)}:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {pickTargetPlayer.handCount > 0 ? (
                  interrupt.stealing ? (
                    <button
                      key="HAND"
                      type="button"
                      className="cursor-pointer rounded border border-[#C89B4B]/60 bg-[#231A14] px-3 py-1.5 text-xs font-bold text-[#F5EBD6] hover:border-[#E6BE6C]"
                      onClick={() => setPrePrepareStealId(interrupt.id)}
                    >
                      Lấy từ bài tay ({pickTargetPlayer.handCount})
                    </button>
                  ) : (
                    <BlindHandCardFan
                      key="HAND-FAN"
                      count={pickTargetPlayer.handCount}
                      ariaVerb="Chọn"
                      tone="bronze"
                      onPickIndex={(idx) =>
                        onSendAction({
                          type: 'RESPOND_PICK_TARGET_CARD',
                          seatIndex: playerView.viewerSeatIndex,
                          zone: 'HAND',
                          handIndex: idx,
                        })
                      }
                    />
                  )
                ) : null}
                {getTargetEquipZones(pickTargetPlayer).map(({ zone, prefix, card }) => (
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
                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#B89352]/60 bg-[#231A14] px-2 py-1 text-[11px] font-bold text-[#F4EBD8] hover:border-[#E6BE6C] hover:bg-[#2E2219]"
                  >
                    <GameIcon name={getCardGameIcon(card.cardKey)} size={12} />
                    <span className="text-[#FDE68A]">{prefix}</span> {formatCardShort(card)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Hàn Băng Kiếm */}
          {interrupt.kind === 'ASK_HAN_BANG_KIEM' && hanBangTarget ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#93C5FD]">
                  <GameIcon name="ui:sparkles" size={14} className="text-[#60A5FA]" />
                  <span>
                    Hàn Băng Kiếm ({interrupt.remainingDiscards ?? 2}/2) — Hủy bài của{' '}
                    {getPlayerSeatLabel(playerView.players, hanBangTarget.seatIndex)} thay sát thương:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSendAction({
                      type: 'RESPOND_HAN_BANG_KIEM',
                      seatIndex: playerView.viewerSeatIndex,
                      activate: false,
                    })
                  }
                  className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#806345]/80 bg-[#231A14] px-2.5 py-1 text-[11px] font-semibold text-[#EDE3D2] hover:border-[#C89B4B] hover:bg-[#2C2017]"
                >
                  <GameIcon name="ui:skip" size={12} />
                  {(interrupt.remainingDiscards ?? 2) === 1
                    ? 'Bỏ qua Hàn Băng Kiếm (Dừng hủy)'
                    : 'Bỏ qua Hàn Băng Kiếm'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hanBangTarget.handCount > 0 ? (
                  <BlindHandCardFan
                    count={hanBangTarget.handCount}
                    ariaVerb="Hủy"
                    tone="crimson"
                    onPickIndex={(idx) =>
                      onSendAction({
                        type: 'RESPOND_HAN_BANG_KIEM',
                        seatIndex: playerView.viewerSeatIndex,
                        activate: true,
                        picks: [{ zone: 'HAND', handIndex: idx }],
                      })
                    }
                  />
                ) : null}
                {getTargetEquipZones(hanBangTarget).map(({ zone, prefix, card }) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() =>
                      onSendAction({
                        type: 'RESPOND_HAN_BANG_KIEM',
                        seatIndex: playerView.viewerSeatIndex,
                        activate: true,
                        picks: [{ zone }],
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#C83E37]/75 bg-[#2B1715] px-2.5 py-1 text-[11px] font-bold text-[#FECACA] hover:border-[#F87171] hover:bg-[#3A1B18]"
                  >
                    <GameIcon name={getCardGameIcon(card.cardKey)} size={12} />
                    <span className="text-[#FEE2E2]">{prefix}</span> {formatCardShort(card)}
                  </button>
                ))}
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
