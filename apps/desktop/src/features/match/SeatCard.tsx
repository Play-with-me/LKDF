import { useEffect, useState } from 'react';
import {
  calculateDistance,
  formatRankLabel,
  formatSuitSymbol,
  getHeroDefinition,
} from '@lkdf/shared';
import type { CardInstance, PlayerViewState, PublicPlayerView } from '@lkdf/shared';
import { getCardArtUrl, getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import {
  CardBack,
  FactionSeal,
  GameIcon,
  HpJadeMeter,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { HeroCardWatermark } from './HeroCardWatermark.js';
import {
  getIdentityBadgeClass,
  getIdentityLabelVi,
  isCardRed,
} from './matchTypes.js';

export interface SeatCardProps {
  readonly player: PublicPlayerView;
  readonly playerView: PlayerViewState;
  readonly isDisconnected?: boolean;
  readonly isActiveActor: boolean;
  readonly isTargetEligible: boolean;
  readonly isSelectedTarget: boolean;
  readonly isInspectedHero?: boolean;
  readonly inspectedCardSourceId?: string | null;
  readonly isDragTargetEligible?: boolean;
  readonly isDragHovered?: boolean;
  readonly dragHoverLabelVi?: string;
  readonly compact?: boolean;
  readonly onSelectTarget?: (seatIndex: number) => void;
  readonly onInspectHero?: (seatIndex: number) => void;
  readonly onInspectCard?: (
    card: CardInstance,
    sourceId: string,
    sourceLabel: string,
  ) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return 'LK';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function SeatCard({
  player,
  playerView,
  isDisconnected = false,
  isActiveActor,
  isTargetEligible,
  isSelectedTarget,
  isInspectedHero = false,
  inspectedCardSourceId = null,
  isDragTargetEligible = false,
  isDragHovered = false,
  dragHoverLabelVi,
  compact = false,
  onSelectTarget,
  onInspectHero,
  onInspectCard,
}: SeatCardProps) {
  const hero = player.heroId ? getHeroDefinition(player.heroId) : null;
  const heroPortraitUrl = getHeroPortraitUrl(player.heroId);

  const [photoFailed, setPhotoFailed] = useState<boolean>(false);
  useEffect(() => {
    setPhotoFailed(false);
  }, [heroPortraitUrl, player.avatarUrl]);

  const distance = player.alive
    ? calculateDistance(playerView, playerView.viewerSeatIndex, player.seatIndex)
    : Number.POSITIVE_INFINITY;
  const identityLabel = player.isIdentityRevealed
    ? getIdentityLabelVi(player.identity)
    : 'Ẩn';
  const identityClass = player.isIdentityRevealed
    ? getIdentityBadgeClass(player.identity)
    : getIdentityBadgeClass('UNKNOWN');

  const canClick = isTargetEligible && player.alive && Boolean(onSelectTarget);
  const canInspectSeatHero = Boolean(player.heroId && onInspectHero);

  const openCards: Array<{
    readonly sourceId: string;
    readonly sourceLabel: string;
    readonly card: CardInstance;
    readonly shortLabel: string;
  }> = [];
  if (player.equipments.weapon) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:weapon`,
      sourceLabel: `Vũ khí · ${player.displayName}`,
      card: player.equipments.weapon,
      shortLabel: player.equipments.weapon.nameVi,
    });
  }
  if (player.equipments.armor) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:armor`,
      sourceLabel: `Giáp · ${player.displayName}`,
      card: player.equipments.armor,
      shortLabel: player.equipments.armor.nameVi,
    });
  }
  if (player.equipments.plusOneHorse) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:plusOne`,
      sourceLabel: `Ngựa +1 · ${player.displayName}`,
      card: player.equipments.plusOneHorse,
      shortLabel: `+1 ${player.equipments.plusOneHorse.nameVi}`,
    });
  }
  if (player.equipments.minusOneHorse) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:minusOne`,
      sourceLabel: `Ngựa -1 · ${player.displayName}`,
      card: player.equipments.minusOneHorse,
      shortLabel: `-1 ${player.equipments.minusOneHorse.nameVi}`,
    });
  }
  for (const scroll of player.delayedScrolls) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:delayed:${scroll.id}`,
      sourceLabel: `Phán xét · ${player.displayName}`,
      card: scroll,
      shortLabel: scroll.cardKey === 'lac_bat_tu_thuc' ? 'Lạc Bất Tư' : scroll.nameVi,
    });
  }

  return (
    <div
      data-drop-seat={player.seatIndex}
      data-lkdf-battle-rest={!isDragHovered && !isDragTargetEligible && !isSelectedTarget && !isTargetEligible && !isActiveActor && !isInspectedHero}
      role={canClick ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
      onClick={canClick ? () => onSelectTarget?.(player.seatIndex) : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTarget?.(player.seatIndex);
              }
            }
          : undefined
      }
      className={[
        'lkdf-battle-seat relative flex w-[var(--seat-w,210px)] min-h-[var(--seat-h,86px)] shrink-0 flex-col justify-between gap-1 rounded-[6px] border bg-[#12161E]/96 text-[#F3F4F6] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.68)] transition-[transform,border-color,box-shadow,background-color] duration-150',
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
        !player.alive ? 'opacity-50 grayscale' : '',
        isDragHovered
          ? 'scale-[1.04] border-2 border-[#FBBF24] bg-[#3B1812]/95 shadow-[0_0_24px_rgba(251,191,36,0.55)]'
          : isDragTargetEligible
            ? 'lkdf-drop-pulse border-2 border-[#E6BE6C] bg-[#1A212E]'
            : isSelectedTarget
              ? 'border-2 border-[#E6BE6C] bg-[#1A212E] ring-2 ring-[#E6BE6C]/65 shadow-[0_0_18px_rgba(230,190,108,0.35)]'
              : isTargetEligible
                ? 'cursor-pointer border-2 border-[#E6BE6C] hover:bg-[#1A212E] shadow-[0_0_14px_rgba(230,190,108,0.28)]'
                : isActiveActor
                  ? 'border-[#C83E37] ring-1 ring-[#C83E37]/75 shadow-[0_0_18px_rgba(200,62,55,0.28)]'
                  : isInspectedHero
                    ? 'border-[#E6BE6C] ring-1 ring-[#E6BE6C]/55'
                    : 'border-[#94A3B8]/38',
        canClick
          ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BE6C]'
          : '',
      ].join(' ')}
    >
      {/* Nền chân dung Tướng tràn viền kiểu Gwent (Mẫu B) */}
      <HeroCardWatermark
        portraitUrl={!photoFailed ? heroPortraitUrl : null}
        widthClass="w-[68%]"
        opacityClass="opacity-75"
      />

      {/* Nhãn chọn mục tiêu hoặc vùng thả khi kéo bài */}
      {isDragHovered ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-25 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#FDE68A] bg-[#9E2B25] px-2.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[#FFF8EB] shadow-lg">
          <GameIcon name="saber-slash" size={11} />
          {dragHoverLabelVi || 'Thả để đánh vào đây'}
        </span>
      ) : isDragTargetEligible ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#FBBF24] bg-[#D99B26] px-2 py-0.5 text-[9.5px] font-extrabold whitespace-nowrap text-[#14171A] shadow">
          <GameIcon name="archery-target" size={11} />
          Thả vào mục tiêu
        </span>
      ) : canClick ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#D99B26] bg-[#14171A] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#FBBF24] shadow">
          <GameIcon
            name={isSelectedTarget ? 'ui:check' : 'archery-target'}
            size={11}
          />
          {isSelectedTarget ? 'Đã chọn' : 'Chọn mục tiêu'}
        </span>
      ) : null}

      {/* Hàng 1: Tên người chơi + Khoảng cách + Nút soi tướng ⓘ (không hộp rác) */}
      <div className="relative z-10 min-w-0">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div
            onClick={
              !canClick && canInspectSeatHero
                ? (e) => {
                    e.stopPropagation();
                    onInspectHero?.(player.seatIndex);
                  }
                : undefined
            }
            className={[
              'flex min-w-0 flex-1 items-center gap-1',
              !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
            ].join(' ')}
          >
            {!heroPortraitUrl && player.avatarUrl && !photoFailed ? (
              <img
                src={player.avatarUrl}
                alt={player.displayName}
                draggable={false}
                onError={() => setPhotoFailed(true)}
                className="h-5 w-5 shrink-0 rounded border border-[#94A3B8]/40 object-cover"
              />
            ) : !heroPortraitUrl && !hero ? (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#94A3B8]/35 bg-[#0D1016] text-[9px] font-bold text-[#D1D5DB]">
                {getInitials(player.displayName)}
              </span>
            ) : null}
            <span className="truncate text-[clamp(10px,0.86cqw,11.5px)] font-semibold text-[#D8DEE9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {player.displayName}
            </span>
            <span className="font-mono-num shrink-0 text-[9px] text-[#94A3B8]">
              #{player.seatIndex + 1}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {player.alive && Number.isFinite(distance) ? (
              <span
                className="font-mono-num shrink-0 rounded bg-[#0B0E14]/85 px-1.5 py-0 text-[9px] font-bold text-[#E6BE6C] tabular-nums drop-shadow-sm"
                title={`Khoảng cách tới ghế này là ${distance}`}
              >
                Cách {distance}
              </span>
            ) : !player.alive ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#DC2626]/25 px-1.5 py-0 text-[9px] font-bold text-[#FCA5A5]">
                <GameIcon name="death-skull" size={10} />
                Tử trận
              </span>
            ) : null}

            {canInspectSeatHero ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }}
                title={`Xem kỹ năng tướng ${hero?.nameVi ?? ''}`}
                aria-label={`Xem kỹ năng tướng ${hero?.nameVi ?? ''}`}
                className={[
                  'inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded border text-[9px] font-extrabold transition-colors',
                  isInspectedHero
                    ? 'border-[#FDE68A] bg-[#E6BE6C] text-[#11151D]'
                    : 'border-[#94A3B8]/40 bg-[#0D1016]/85 text-[#E5E7EB] hover:border-[#E6BE6C]',
                ].join(' ')}
              >
                ⓘ
              </button>
            ) : null}
          </div>
        </div>

        {/* Hàng 2: Huy hiệu thế lực + Tên Tướng trọn vẹn */}
        <div
          onClick={
            !canClick && canInspectSeatHero
              ? (e) => {
                  e.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }
              : undefined
          }
          className={[
            'mt-1 flex items-center gap-1.5 min-w-0',
            !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
          ].join(' ')}
        >
          {hero ? (
            <>
              <FactionSeal faction={hero.faction} size="xs" />
              <span className="font-serif-title min-w-0 truncate text-[clamp(11px,0.96cqw,13.5px)] font-bold leading-tight text-[#F5EBD6] drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]">
                {hero.nameVi}
              </span>
            </>
          ) : (
            <span className="truncate text-[10.5px] font-medium text-[#9CA3AF]">
              Đang chọn tướng
            </span>
          )}
        </div>
      </div>

      {/* Hàng 3: Ngọc sinh lực + Bài úp + Thân Phận gọn góc dưới-phải */}
      <div className="lkdf-battle-seat-summary relative z-10 mt-1 flex items-center justify-between gap-1.5">
        <HpJadeMeter hp={player.hp} maxHp={player.maxHp} size="sm" />

        <div className="flex items-center gap-1 shrink-0">
          {player.isBotTakeover ? (
            <span
              title="Máy đánh hộ tạm thời"
              className="inline-flex items-center gap-0.5 rounded bg-[#D97706]/25 px-1 py-0.5 text-[9px] font-semibold text-[#FBBF24]"
            >
              <GameIcon name="ui:bot" size={10} />
              Bot
            </span>
          ) : null}
          {isDisconnected ? (
            <span
              title="Mất kết nối mạng"
              className="inline-flex items-center rounded bg-[#DC2626]/25 p-0.5 text-[#FCA5A5]"
            >
              <GameIcon name="ui:wifi-off" size={10} />
            </span>
          ) : null}
          <div
            className="inline-flex items-center gap-1 rounded border border-[#94A3B8]/35 bg-[#0B0E14]/90 px-1.5 py-0.5"
            title={`Đang cầm ${player.handCount} lá bài trên tay`}
          >
            <CardBack size="xs" />
            <span className="font-mono-num text-[clamp(10px,0.9cqw,11.5px)] font-extrabold text-[#F4EFE6] tabular-nums">
              {player.handCount}
            </span>
          </div>
          <span className="inline-flex shrink-0 rounded bg-[#0B0E14]/95">
            <span
              className={[
                'rounded border px-1 py-0.5 text-[8.5px] font-bold leading-none',
                identityClass,
              ].join(' ')}
            >
              {compact && player.isIdentityRevealed && player.identity === 'LORD'
                ? 'Chủ'
                : identityLabel}
            </span>
          </span>
        </div>
      </div>

      {/* Hàng 4: Trang bị & Cẩm nang ngửa (CHỈ hiển thị khi thực sự có trang bị — Bỏ dòng lặp vô ích) */}
      {openCards.length > 0 ? (
        <div
          className={[
            'lkdf-battle-seat-equipment relative z-10 mt-1 border-t border-[#94A3B8]/25 pt-1',
            openCards.length >= 2
              ? 'grid grid-cols-2 gap-1'
              : 'flex flex-col gap-1',
          ].join(' ')}
        >
          {openCards.map((item) => {
            const artUrl = getCardArtUrl(item.card.cardKey);
            const active = inspectedCardSourceId === item.sourceId;
            const red = isCardRed(item.card);
            return (
              <button
                key={item.sourceId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectCard?.(item.card, item.sourceId, item.sourceLabel);
                }}
                title={`Bấm xem chiêu ${item.card.nameVi}`}
                className={[
                  'inline-flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded border px-1.5 py-0.5 text-left transition-colors',
                  active
                    ? 'border-[#FDE68A] bg-[#E6BE6C]/22 ring-1 ring-[#FDE68A]/55'
                    : 'border-[#B89352]/45 bg-[#0B0E14]/92 hover:border-[#E6BE6C]',
                ].join(' ')}
              >
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt=""
                    draggable={false}
                    className="h-[clamp(16px,2.5cqh,20px)] w-[clamp(13px,1.35cqw,16px)] shrink-0 rounded-[2px] border border-[#94A3B8]/40 object-cover"
                  />
                ) : (
                  <GameIcon name={getCardGameIcon(item.card.cardKey)} size={12} className="shrink-0 text-[#E6BE6C]" />
                )}
                <span
                  className={`font-mono-num inline-flex shrink-0 items-center gap-0.5 text-[clamp(9.5px,0.85cqw,11px)] font-extrabold leading-none ${
                    red ? 'text-[#FCA5A5]' : 'text-[#F1F5F9]'
                  }`}
                >
                  <span>{formatRankLabel(item.card.rank)}</span>
                  <SuitGlyph suit={item.card.suit} size={10} tone="darkSurface" />
                  <span className="sr-only">{formatSuitSymbol(item.card.suit)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[clamp(9.5px,0.88cqw,11px)] font-bold leading-tight text-[#F3D38C]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
