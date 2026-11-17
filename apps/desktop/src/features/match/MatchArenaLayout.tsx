import { getHeroDefinition } from '@lkdf/shared';
import type {
  GameAction,
  HeroId,
  PlayerViewState,
  PublicPlayerView,
  RoomSeat,
  TimerPresetConfig,
} from '@lkdf/shared';
import type { ReactNode } from 'react';
import { HandCardItem } from './HandCardItem.js';
import { MatchCenterBoard } from './MatchCenterBoard.js';
import { SeatCard } from './SeatCard.js';
import {
  describePendingActorPrompt,
  getAvailableConvertModes,
  getAvailablePlaySkills,
  getFactionStyle,
  getIdentityBadgeClass,
  getIdentityLabelVi,
  getOrderedSeatsClockwiseFromSelf,
  getRequiredTargetSpec,
} from './matchTypes.js';
import type {
  ConvertCardMode,
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
  readonly renderActionSidebar: () => ReactNode;
}

interface UShapeOpponentSlots {
  readonly left: readonly PublicPlayerView[];
  readonly top: readonly PublicPlayerView[];
  readonly right: readonly PublicPlayerView[];
}

function getUShapeOpponentSlots(
  opponents: readonly PublicPlayerView[],
): UShapeOpponentSlots {
  switch (opponents.length) {
    case 0:
      return { left: [], top: [], right: [] };
    case 1:
      return { left: [], top: [opponents[0]!], right: [] };
    case 2:
      return { left: [opponents[0]!], top: [], right: [opponents[1]!] };
    case 3:
      return {
        left: [opponents[0]!],
        top: [opponents[1]!],
        right: [opponents[2]!],
      };
    case 4:
      return {
        left: [opponents[0]!],
        top: [opponents[1]!, opponents[2]!],
        right: [opponents[3]!],
      };
    case 5:
      return {
        left: [opponents[1]!, opponents[0]!],
        top: [opponents[2]!],
        right: [opponents[3]!, opponents[4]!],
      };
    case 6:
      return {
        left: [opponents[1]!, opponents[0]!],
        top: [opponents[2]!, opponents[3]!],
        right: [opponents[4]!, opponents[5]!],
      };
    default:
      return {
        left: [opponents[1]!, opponents[0]!],
        top: [opponents[2]!, opponents[3]!, opponents[4]!],
        right: opponents.slice(5),
      };
  }
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
  renderActionSidebar,
}: MatchArenaLayoutProps) {
  const ordered = getOrderedSeatsClockwiseFromSelf(
    playerView.players,
    playerView.viewerSeatIndex,
  );
  const selfPlayer = ordered[0];
  const opponents = ordered.slice(1);
  const slots = getUShapeOpponentSlots(opponents);

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
  const handCards = selfPlayer?.handCards ?? [];
  const availableSkills = isPlayPhaseSelf
    ? getAvailablePlaySkills(selfPlayer, playerView.turnFlags)
    : [];
  const availableConverts = getAvailableConvertModes(
    selfPlayer,
    playerView.turnPhase === 'PLAY',
  );

  const isBotTakeoverSelf = Boolean(selfPlayer?.isBotTakeover);
  const showNetworkBanner = connectionLost || isBotTakeoverSelf;

  const renderOpponentCard = (opp: PublicPlayerView) => {
    const isEligible =
      isTargetSelectionActive && targetSpec.eligibleSeats.includes(opp.seatIndex);
    const isSelected = selection.selectedTargets.includes(opp.seatIndex);
    const isActor =
      prompt.actorSeat === opp.seatIndex ||
      (playerView.activeInterrupt === null &&
        playerView.turnPhase !== 'HERO_SELECT' &&
        playerView.currentTurnSeat === opp.seatIndex);

    return (
      <SeatCard
        key={opp.seatIndex}
        player={opp}
        playerView={playerView}
        isDisconnected={isDisconnectedBySeat.get(opp.seatIndex) ?? false}
        isActiveActor={isActor}
        isTargetEligible={isEligible}
        isSelectedTarget={isSelected}
        compact={playerView.players.length >= 6}
        onSelectTarget={isEligible ? onToggleTarget : undefined}
      />
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#14171A]">
      {/* Thanh cảnh báo rớt mạng / Máy đánh hộ */}
      {showNetworkBanner ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D97706]/50 bg-[#D97706]/20 px-4 py-1.5 text-[13px] font-semibold text-[#FDE68A]">
          <span>
            📡 Mất kết nối mạng — Đang tự động kết nối lại... Ghế của bạn đang được Máy đánh hộ tạm thời
          </span>
          <button
            type="button"
            onClick={onReconnect}
            className="shrink-0 cursor-pointer rounded border border-[#D99B26] bg-[#14171A] px-2.5 py-0.5 text-[12px] font-bold text-[#FBBF24] hover:bg-[#1E2328]"
          >
            🔄 Kết nối lại ngay
          </button>
        </div>
      ) : null}

      {/* VÙNG 2 & 3: Bàn đấu vòng chữ U + Trung tâm */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-2">
        {/* Hàng trên (Đối diện) */}
        {slots.top.length > 0 ? (
          <div
            className={[
              'mx-auto grid w-full max-w-[960px] shrink-0 gap-2',
              slots.top.length === 1
                ? 'max-w-[320px] grid-cols-1'
                : slots.top.length === 2
                  ? 'max-w-[650px] grid-cols-2'
                  : 'grid-cols-3',
            ].join(' ')}
          >
            {slots.top.map(renderOpponentCard)}
          </div>
        ) : null}

        {/* Hàng giữa: Trái + Trung tâm + Phải */}
        <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
          {slots.left.length > 0 ? (
            <div className="flex w-[250px] shrink-0 flex-col justify-around gap-2 overflow-hidden">
              {slots.left.map(renderOpponentCard)}
            </div>
          ) : null}

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <MatchCenterBoard
              playerView={playerView}
              timerConfig={timerConfig}
              phaseDeadlineAt={phaseDeadlineAt}
              pausedRemainingMs={pausedRemainingMs}
              isTimerPaused={isTimerPaused}
              onSendAction={onSendAction}
              onSelectHero={onSelectHero}
            />
          </div>

          {slots.right.length > 0 ? (
            <div className="flex w-[250px] shrink-0 flex-col justify-around gap-2 overflow-hidden">
              {slots.right.map(renderOpponentCard)}
            </div>
          ) : null}
        </div>
      </div>

      {/* VÙNG 4: Thanh điều khiển bản thân ghim cố định ở đáy (210px) */}
      <div className="flex h-[210px] shrink-0 min-w-0 gap-2 border-t border-[#303740] bg-[#1E2328] px-3 py-1.5">
        {/* Cột trái: Tướng, Máu, Thân phận, Kỹ năng, Trang bị */}
        <div className="lkdf-scroll flex w-[275px] shrink-0 flex-col justify-between gap-1.5 overflow-y-auto rounded-lg border border-[#303740] bg-[#14171A] p-2.5">
          {selfPlayer ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold text-[#F3F4F6]">
                      {selfPlayer.displayName}
                    </span>
                    <span
                      className={[
                        'shrink-0 rounded border px-1.5 py-0.2 text-[11px] font-bold',
                        getIdentityBadgeClass(selfPlayer.identity),
                      ].join(' ')}
                    >
                      {getIdentityLabelVi(selfPlayer.identity)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {selfHero && selfFaction ? (
                      <span
                        className={[
                          'rounded border px-1.5 py-0.2 text-[11px] font-bold',
                          selfFaction.badgeClass,
                        ].join(' ')}
                      >
                        {selfHero.nameVi} · {selfFaction.labelVi}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#9CA3AF]">Chưa chọn tướng</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-mono-num text-[14px] font-bold text-[#F87171]">
                    ❤️ {selfPlayer.hp}/{selfPlayer.maxHp}
                  </div>
                  {!selfPlayer.alive ? (
                    <span className="text-[11px] font-bold text-[#FCA5A5]">💀 Tử trận</span>
                  ) : null}
                </div>
              </div>

              {/* Kỹ năng chủ động & Chuyển đổi bài */}
              {(availableSkills.length > 0 || availableConverts.length > 0) ? (
                <div className="flex flex-wrap gap-1">
                  {availableSkills.map((skill) => {
                    const active = selection.activeSkillMode === skill.id;
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        title={skill.descriptionVi}
                        onClick={() => onToggleSkillMode(skill.id)}
                        className={[
                          'cursor-pointer rounded border px-2 py-0.5 text-[11px] font-bold transition-colors',
                          active
                            ? 'border-[#D99B26] bg-[#D99B26]/25 text-[#FBBF24]'
                            : 'border-[#3A424C] bg-[#1E2328] text-[#D1D5DB] hover:border-[#D99B26]/70',
                        ].join(' ')}
                      >
                        ✨ {skill.nameVi}
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
                          'cursor-pointer rounded border px-2 py-0.5 text-[11px] font-bold transition-colors',
                          active
                            ? 'border-[#C83E37] bg-[#C83E37]/25 text-[#FCA5A5]'
                            : 'border-[#3A424C] bg-[#1E2328] text-[#D1D5DB] hover:border-[#C83E37]/70',
                        ].join(' ')}
                      >
                        🔄 {opt.labelVi}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Trang bị & Thời gian đang gắn */}
              <div className="flex flex-wrap gap-1 border-t border-[#2D333B] pt-1 text-[11px]">
                {selfPlayer.equipments.weapon ? (
                  <span className="rounded border border-[#3A424C] bg-[#1E2328] px-1.5 py-0.5 text-[#FDE68A]">
                    ⚔️ {selfPlayer.equipments.weapon.nameVi} (Tầm{' '}
                    {selfPlayer.equipments.weapon.attackRange ?? 1})
                  </span>
                ) : (
                  <span className="text-[#6B7280]">Tay không (Tầm 1)</span>
                )}
                {selfPlayer.equipments.armor ? (
                  <span className="rounded border border-[#3A424C] bg-[#1E2328] px-1.5 py-0.5 text-[#93C5FD]">
                    🛡️ {selfPlayer.equipments.armor.nameVi}
                  </span>
                ) : null}
                {selfPlayer.equipments.plusOneHorse ? (
                  <span className="rounded border border-[#3A424C] bg-[#1E2328] px-1.5 py-0.5 text-[#86EFAC]">
                    🐴 +1 {selfPlayer.equipments.plusOneHorse.nameVi}
                  </span>
                ) : null}
                {selfPlayer.equipments.minusOneHorse ? (
                  <span className="rounded border border-[#3A424C] bg-[#1E2328] px-1.5 py-0.5 text-[#FCA5A5]">
                    🐎 -1 {selfPlayer.equipments.minusOneHorse.nameVi}
                  </span>
                ) : null}
                {selfPlayer.delayedScrolls.map((s) => (
                  <span
                    key={s.id}
                    className="rounded border border-[#D97706]/40 bg-[#D97706]/20 px-1.5 py-0.5 text-[#FCD34D]"
                  >
                    ⏳ {s.cardKey === 'lac_bat_tu_thuc' ? 'Lạc' : s.nameVi}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[12px] text-[#9CA3AF]">Đang tải thông tin ghế...</div>
          )}
        </div>

        {/* Cột giữa: Checkbox Tự bỏ qua Vô Giải + Dải bài xòe ngang */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 pb-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#D1D5DB] select-none">
              <input
                type="checkbox"
                checked={autoSkipNullification}
                onChange={(e) => onToggleAutoSkipNullification(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#D99B26]"
              />
              <span>Tự bỏ qua Vô Giải lượt này</span>
            </label>

            <span className="font-mono-num text-[12px] text-[#9CA3AF]">
              Trên tay: <strong className="text-[#F3F4F6]">{handCards.length}</strong> lá
            </span>
          </div>

          <div className="lkdf-scroll flex min-h-0 flex-1 items-end overflow-x-auto px-2 pt-4 pb-0.5">
            {handCards.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-[#303740] text-[13px] text-[#9CA3AF]">
                Không còn lá bài nào trên tay
              </div>
            ) : (
              <div className="flex items-end">
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
                      disabled={!selfPlayer?.alive}
                      hotkeyNumber={index < 9 ? index + 1 : undefined}
                      compact={handCards.length > 7}
                      onToggle={onToggleCard}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Thanh nút hành động */}
        <div className="flex w-[250px] shrink-0 min-h-0 flex-col">
          {renderActionSidebar()}
        </div>
      </div>
    </div>
  );
}
