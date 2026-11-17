import {
  formatRankLabel,
  formatSuitSymbol,
  isRedSuit,
} from '@lkdf/shared';
import type {
  CardInstance,
  GameAction,
  PlayerViewState,
  PublicPlayerView,
  TargetCardZone,
  TimerPresetConfig,
} from '@lkdf/shared';
import { useEffect, useMemo, useState } from 'react';
import { HeroSelectPanel } from './HeroSelectPanel.js';
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
  readonly onSendAction: (action: GameAction) => void;
  readonly onSelectHero: (heroId: NonNullable<PlayerViewState['players'][number]['heroId']>) => void;
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
    <div className="rounded-lg border border-[#D99B26]/60 bg-[#14171A] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#FBBF24]">
          🌟 Quan Tinh — Chia bài lên Đầu ({topIds.length}) hoặc Đáy ({bottomIds.length})
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
          className="cursor-pointer rounded bg-[#C83E37] px-3 py-1 text-[12px] font-bold text-[#F3F4F6] hover:bg-[#B2342E]"
        >
          ✨ Đặt bài theo thứ tự Quan Tinh
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded border border-[#2D333B] bg-[#1E2328] p-2">
          <div className="mb-1 text-[11px] font-bold text-[#86EFAC]">
            ⬆️ Đặt lên Đầu chồng bài (rút trước)
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
                  title="Bấm để chuyển xuống đáy"
                  className="cursor-pointer rounded border border-[#3A424C] bg-[#F4EFE6] px-2 py-1 text-[12px] font-bold text-[#18181B] hover:border-[#D99B26]"
                >
                  {idx + 1}. {formatCardShort(card)} ↓
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded border border-[#2D333B] bg-[#1E2328] p-2">
          <div className="mb-1 text-[11px] font-bold text-[#93C5FD]">
            ⬇️ Đặt xuống Đáy chồng bài
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
                  title="Bấm để chuyển lên đầu"
                  className="cursor-pointer rounded border border-[#3A424C] bg-[#F4EFE6] px-2 py-1 text-[12px] font-bold text-[#18181B] hover:border-[#D99B26]"
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
    <div className="rounded-lg border border-[#D99B26]/60 bg-[#14171A] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#FBBF24]">
          📜 Di Kế — Chọn người nhận cho từng lá bài
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className="cursor-pointer rounded bg-[#C83E37] px-3 py-1 text-[12px] font-bold text-[#F3F4F6] hover:bg-[#B2342E]"
        >
          ✨ Chia bài Di Kế
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-2 rounded border border-[#3A424C] bg-[#1E2328] p-2"
          >
            <span className="rounded bg-[#F4EFE6] px-2 py-0.5 text-[12px] font-bold text-[#18181B]">
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
              className="rounded border border-[#3A424C] bg-[#14171A] px-2 py-1 text-[12px] text-[#F3F4F6]"
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

export function MatchCenterBoard({
  playerView,
  timerConfig,
  phaseDeadlineAt,
  pausedRemainingMs,
  isTimerPaused,
  onSendAction,
  onSelectHero,
}: MatchCenterBoardProps) {
  const remainingSeconds = useCountdownSeconds(
    phaseDeadlineAt,
    pausedRemainingMs,
    isTimerPaused,
  );

  if (playerView.turnPhase === 'HERO_SELECT') {
    return (
      <HeroSelectPanel
        playerView={playerView}
        remainingSeconds={remainingSeconds}
        isTimerPaused={isTimerPaused}
        onSelectHero={onSelectHero}
      />
    );
  }

  const prompt = describePendingActorPrompt(playerView);
  const totalSeconds = playerView.activeInterrupt
    ? timerConfig.reactionSeconds
    : timerConfig.mainTurnSeconds;
  const progressPercent =
    remainingSeconds !== null && totalSeconds > 0
      ? Math.max(0, Math.min(100, Math.round((remainingSeconds / totalSeconds) * 100)))
      : 100;

  const interrupt = playerView.activeInterrupt;
  const isMyInteractiveZone =
    interrupt !== null && prompt.isMyTurn;

  const pickTargetPlayer =
    interrupt?.kind === 'PICK_TARGET_CARD'
      ? playerView.players.find((p) => p.seatIndex === interrupt.targetSeat)
      : undefined;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-[#303740] bg-[#1E2328]/90 p-3 shadow-lg">
      {/* Banner pha hiện tại & Đồng hồ */}
      <div className="shrink-0 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div
              className={[
                'truncate text-[14px] font-bold',
                prompt.isMyTurn ? 'text-[#FBBF24]' : 'text-[#F3F4F6]',
              ].join(' ')}
            >
              🔔 {prompt.headlineVi}
            </div>
            <div className="truncate text-[12px] text-[#9CA3AF]">{prompt.detailVi}</div>
          </div>

          {remainingSeconds !== null ? (
            <span
              className={[
                'font-mono-num shrink-0 rounded border px-2 py-0.5 text-[13px] font-bold',
                isTimerPaused
                  ? 'border-[#D97706]/50 bg-[#D97706]/15 text-[#FBBF24]'
                  : remainingSeconds <= 5
                    ? 'border-[#DC2626]/60 bg-[#DC2626]/20 text-[#FCA5A5]'
                    : 'border-[#3A424C] bg-[#1E2328] text-[#F3F4F6]',
              ].join(' ')}
            >
              {isTimerPaused ? `⏸️ Tạm dừng (${remainingSeconds}s)` : `Còn ${remainingSeconds} giây`}
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#272D35]">
          <div
            className={[
              'h-full transition-all duration-200',
              remainingSeconds !== null && remainingSeconds <= 5
                ? 'bg-[#DC2626]'
                : prompt.isMyTurn
                  ? 'bg-[#D99B26]'
                  : 'bg-[#3B82F6]',
            ].join(' ')}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Khu bài đánh ra / Phán xét / Tương tác đặc biệt */}
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2D333B] bg-[#14171A]/80 px-3 py-2">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="font-mono-num text-[#D1D5DB]">
              📚 Chồng rút: <strong className="text-[#F3F4F6]">{playerView.drawPileCount}</strong>
            </span>
            <span className="font-mono-num text-[#D1D5DB]">
              🗑️ Bỏ bài: <strong className="text-[#F3F4F6]">{playerView.discardPileCount}</strong>
            </span>
          </div>

          {playerView.discardPileTop ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#9CA3AF]">Lá mới đánh/bỏ:</span>
              <span
                className={[
                  'rounded border border-[#D6CFC2] bg-[#F4EFE6] px-2 py-0.5 text-[12px] font-bold',
                  isRedSuit(playerView.discardPileTop.suit)
                    ? 'text-[#C83E37]'
                    : 'text-[#18181B]',
                ].join(' ')}
              >
                {formatSuitSymbol(playerView.discardPileTop.suit)}
                {formatRankLabel(playerView.discardPileTop.rank)}{' '}
                {playerView.discardPileTop.nameVi}
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-[#9CA3AF]">Chưa có bài đánh ra</span>
          )}
        </div>

        {/* Ngũ Cốc Phong Đăng */}
        {isMyInteractiveZone &&
        interrupt.kind === 'WAIT_HARVEST_PICK' &&
        playerView.harvestPool.length > 0 ? (
          <div className="rounded-lg border border-[#D99B26]/70 bg-[#14171A] p-2.5">
            <div className="mb-1.5 text-[12px] font-bold text-[#FBBF24]">
              🌾 Ngũ Cốc Phong Đăng — Bấm chọn 1 lá bài:
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                    'cursor-pointer rounded border border-[#D99B26] bg-[#F4EFE6] px-2.5 py-1.5 text-[12px] font-bold transition-transform hover:-translate-y-0.5',
                    isRedSuit(card.suit) ? 'text-[#C83E37]' : 'text-[#18181B]',
                  ].join(' ')}
                >
                  {formatCardShort(card)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Thuận Thủ Khiên Dương / Quá Hà Sái Cầu */}
        {isMyInteractiveZone &&
        interrupt.kind === 'PICK_TARGET_CARD' &&
        pickTargetPlayer ? (
          <div className="rounded-lg border border-[#D99B26]/70 bg-[#14171A] p-2.5">
            <div className="mb-1.5 text-[12px] font-bold text-[#FBBF24]">
              🎯 Chọn 1 lá bài từ {getPlayerSeatLabel(playerView.players, pickTargetPlayer.seatIndex)}:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getPublicTargetZones(pickTargetPlayer).map((zone: TargetCardZone) => {
                if (zone === 'HAND') {
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
                      className="cursor-pointer rounded border border-[#D99B26]/60 bg-[#272D35] px-2.5 py-1 text-[12px] font-bold text-[#F3F4F6] hover:bg-[#323A45]"
                    >
                      🃏 Tay bài #{idx + 1}
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
                      className="cursor-pointer rounded border border-[#D97706] bg-[#D97706]/20 px-2.5 py-1 text-[12px] font-bold text-[#FCD34D] hover:bg-[#D97706]/30"
                    >
                      ⏳ {formatCardShort(scroll)}
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
                    className="cursor-pointer rounded border border-[#D99B26] bg-[#F4EFE6] px-2.5 py-1 text-[12px] font-bold text-[#18181B] hover:bg-[#EAE3D5]"
                  >
                    🛡️ {formatCardShort(equipCard)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Quan Tinh */}
        {isMyInteractiveZone &&
        interrupt.kind === 'WAIT_GUAN_XING' &&
        interrupt.guanXingCards ? (
          <GuanXingPlanner
            cards={interrupt.guanXingCards}
            seatIndex={playerView.viewerSeatIndex}
            onSendAction={onSendAction}
          />
        ) : null}

        {/* Di Kế */}
        {isMyInteractiveZone &&
        interrupt.kind === 'WAIT_YI_JI' &&
        interrupt.yiJiCards ? (
          <YiJiDistributor
            cards={interrupt.yiJiCards}
            playerView={playerView}
            onSendAction={onSendAction}
          />
        ) : null}
      </div>

      {/* Nhật ký bàn đấu (Cuộn nội bộ) */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[#2D333B] bg-[#14171A] p-2.5">
        <div className="mb-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
          📜 Nhật ký bàn đấu ({playerView.actionLog.length})
        </div>
        <div className="lkdf-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-[12px] leading-snug text-[#D1D5DB]">
          {playerView.actionLog.length === 0 ? (
            <p className="text-[#9CA3AF]">Chưa có diễn biến nào trong ván đấu.</p>
          ) : (
            playerView.actionLog.slice(-40).map((entry, idx) => (
              <div
                key={`${idx}-${entry.slice(0, 16)}`}
                className="border-b border-[#1E2328] pb-0.5 last:border-none"
              >
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
