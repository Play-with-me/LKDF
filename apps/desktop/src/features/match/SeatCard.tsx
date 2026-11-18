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
  getFactionStyle,
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
  const factionStyle = hero ? getFactionStyle(hero.faction) : null;
  const heroPortraitUrl = getHeroPortraitUrl(player.heroId);
  const displayPhotoUrl = heroPortraitUrl ?? (player.avatarUrl || null);

  const [photoFailed, setPhotoFailed] = useState<boolean>(false);
  useEffect(() => {
    setPhotoFailed(false);
  }, [displayPhotoUrl]);

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
        'relative flex w-[var(--seat-w,210px)] min-h-[var(--seat-h,100px)] shrink-0 flex-col justify-between gap-1 rounded-xl border bg-[#181B20]/95 text-[#F3F4F6] shadow-lg transition-[transform,border-color,box-shadow,background-color] duration-150',
        compact ? 'p-1.5' : 'p-2',
        !player.alive ? 'opacity-50 grayscale' : '',
        isDragHovered
          ? 'scale-[1.04] border-2 border-[#FBBF24] bg-[#4A1E12]/95 shadow-[0_0_24px_rgba(251,191,36,0.55)]'
          : isDragTargetEligible
            ? 'lkdf-drop-pulse border-2 border-[#D99B26] bg-[#252B33]'
            : isSelectedTarget
              ? 'border-2 border-[#D99B26] bg-[#262B32] ring-2 ring-[#D99B26]/65 shadow-[0_0_18px_rgba(217,155,38,0.35)]'
              : isTargetEligible
                ? 'cursor-pointer border-2 border-[#D99B26] hover:bg-[#252B33] shadow-[0_0_14px_rgba(217,155,38,0.28)]'
                : isActiveActor
                  ? 'border-[#C83E37] ring-1 ring-[#C83E37]/70 shadow-[0_0_16px_rgba(200,62,55,0.22)]'
                  : isInspectedHero
                    ? 'border-[#E9CF9B] ring-1 ring-[#D99B26]/55'
                    : 'border-[#333B45]',
        canClick
          ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B26]'
          : '',
      ].join(' ')}
    >
      {/* Nền chân dung Tướng làm mờ nghệ thuật bên phải thẻ (Cách 2) */}
      <HeroCardWatermark portraitUrl={!photoFailed ? heroPortraitUrl : null} />

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

      {/* Hàng 1: Ảnh chân dung + (Dòng trên: Tên #Ghế + Cách + ⓘ | Dòng dưới: Tên Tướng + Thân phận toàn chiều ngang) */}
      <div className="relative z-10 flex items-start gap-1.5 min-w-0">
        <div
          onClick={
            !canClick && canInspectSeatHero
              ? (e) => {
                  e.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }
              : undefined
          }
          title={
            hero && canInspectSeatHero
              ? `Bấm xem kỹ năng tướng ${hero.nameVi} (${factionStyle?.labelVi ?? ''})`
              : undefined
          }
          className={[
            'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-[1.5px] bg-[#14171A] text-[10.5px] font-bold text-[#F3F4F6]',
            compact ? 'h-7 w-7' : 'h-8 w-8',
            factionStyle ? factionStyle.borderClass : 'border-[#3A424C]',
            !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
          ].join(' ')}
        >
          {displayPhotoUrl && !photoFailed ? (
            <img
              src={displayPhotoUrl}
              alt={hero ? hero.nameVi : player.displayName}
              draggable={false}
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover object-[50%_18%]"
            />
          ) : hero ? (
            <FactionSeal faction={hero.faction} size="md" />
          ) : (
            <span>{getInitials(player.displayName)}</span>
          )}
          {hero && displayPhotoUrl && !photoFailed ? (
            <span className="absolute -right-0.5 -bottom-0.5">
              <FactionSeal faction={hero.faction} size="xs" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
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
                'flex min-w-0 flex-1 items-center gap-0.5',
                !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
              ].join(' ')}
            >
              <span className="truncate text-[clamp(10px,0.86cqw,11.5px)] font-semibold text-[#E5E7EB]">
                {player.displayName}
              </span>
              <span className="font-mono-num shrink-0 text-[8.5px] text-[#9CA3AF]">
                #{player.seatIndex + 1}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              {player.alive && Number.isFinite(distance) ? (
                <span
                  className="font-mono-num shrink-0 rounded border border-[#D99B26]/45 bg-[#14171A]/90 px-1 py-0 text-[9px] font-bold text-[#FBBF24] tabular-nums"
                  title={`Khoảng cách tới ghế này là ${distance}`}
                >
                  Cách:{distance}
                </span>
              ) : !player.alive ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#DC2626]/20 px-1 py-0 text-[9px] font-bold text-[#FCA5A5]">
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
                      ? 'border-[#FDE68A] bg-[#D99B26] text-[#14171A]'
                      : 'border-[#CA9E4E]/50 bg-[#14171A]/90 text-[#E6CFA3] hover:border-[#FBBF24]',
                  ].join(' ')}
                >
                  ⓘ
                </button>
              ) : null}
            </div>
          </div>

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
              'mt-0.5 flex items-center justify-between gap-1 min-w-0',
              !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
            ].join(' ')}
          >
            {hero && factionStyle ? (
              <span
                className={[
                  'font-serif-title min-w-0 truncate text-[clamp(10px,0.88cqw,12px)] font-bold leading-tight',
                  factionStyle.nameTextClass,
                ].join(' ')}
              >
                {hero.nameVi}
              </span>
            ) : (
              <span className="truncate text-[10px] text-[#9CA3AF]">
                Đang chọn tướng
              </span>
            )}
            <span
              className={[
                'shrink-0 rounded border px-1 py-0 text-[8.5px] font-semibold leading-tight',
                identityClass,
              ].join(' ')}
            >
              {compact && player.isIdentityRevealed && player.identity === 'LORD'
                ? 'Chủ'
                : identityLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Hàng 2: Thanh ngọc máu + Lá bài úp + Trạng thái mạng/Bot */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <HpJadeMeter hp={player.hp} maxHp={player.maxHp} size="sm" />

        <div className="flex items-center gap-1 shrink-0">
          {player.isBotTakeover ? (
            <span
              title="Máy đánh hộ tạm thời"
              className="inline-flex items-center gap-0.5 rounded bg-[#D97706]/20 px-1 py-0.5 text-[9.5px] font-semibold text-[#FBBF24]"
            >
              <GameIcon name="ui:bot" size={10} />
              Bot
            </span>
          ) : null}
          {isDisconnected ? (
            <span
              title="Mất kết nối mạng"
              className="inline-flex items-center rounded bg-[#DC2626]/20 p-0.5 text-[#FCA5A5]"
            >
              <GameIcon name="ui:wifi-off" size={10} />
            </span>
          ) : null}
          <div
            className="inline-flex items-center gap-1 rounded border border-[#D99B26]/45 bg-[#14171A]/90 px-1.5 py-0.5"
            title={`Đang cầm ${player.handCount} lá bài trên tay`}
          >
            <CardBack size="xs" />
            <span className="font-mono-num text-[clamp(10.5px,0.92cqw,12px)] font-extrabold text-[#F4EFE6] tabular-nums">
              {player.handCount}
            </span>
          </div>
        </div>
      </div>

      {/* Hàng 3: Khu Trang Bị & Cẩm Nang Ngửa (Từ 2 lá xếp gọn lưới 2 cột giúp ghế không đội chiều cao) */}
      <div
        className={[
          'relative z-10 border-t border-[#2D333B]/90 pt-1',
          openCards.length >= 2
            ? 'grid grid-cols-2 gap-1'
            : 'flex min-h-[26px] flex-col gap-1',
        ].join(' ')}
      >
        {openCards.length === 0 ? (
          <span className="truncate text-[clamp(9.5px,0.84cqw,10.5px)] text-[#8B949E]">
            Chưa gắn trang bị ngửa
          </span>
        ) : (
          openCards.map((item) => {
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
                  'inline-flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left transition-colors',
                  active
                    ? 'border-[#FDE68A] bg-[#D99B26]/28 ring-1 ring-[#FDE68A]/55'
                    : 'border-[#CA9A48]/65 bg-[#221A11]/95 hover:border-[#FBBF24]',
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
                  <GameIcon name={getCardGameIcon(item.card.cardKey)} size={13} className="shrink-0 text-[#F3D38C]" />
                )}
                <span
                  className={`font-mono-num inline-flex shrink-0 items-center gap-0.5 text-[clamp(10px,0.9cqw,11.5px)] font-extrabold leading-none ${
                    red ? 'text-[#FCA5A5]' : 'text-[#EFE6D5]'
                  }`}
                >
                  <span>{formatRankLabel(item.card.rank)}</span>
                  <SuitGlyph suit={item.card.suit} size={11} tone="darkSurface" />
                  <span className="sr-only">{formatSuitSymbol(item.card.suit)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[clamp(10px,0.92cqw,11.5px)] font-bold leading-tight text-[#F6DFA8]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
