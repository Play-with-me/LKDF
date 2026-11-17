import { calculateDistance, getHeroDefinition } from '@lkdf/shared';
import type { PlayerViewState, PublicPlayerView } from '@lkdf/shared';
import {
  getFactionStyle,
  getIdentityBadgeClass,
  getIdentityLabelVi,
} from './matchTypes.js';

export interface SeatCardProps {
  readonly player: PublicPlayerView;
  readonly playerView: PlayerViewState;
  readonly isDisconnected?: boolean;
  readonly isActiveActor: boolean;
  readonly isTargetEligible: boolean;
  readonly isSelectedTarget: boolean;
  readonly compact?: boolean;
  readonly onSelectTarget?: (seatIndex: number) => void;
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
  compact = false,
  onSelectTarget,
}: SeatCardProps) {
  const hero = player.heroId ? getHeroDefinition(player.heroId) : null;
  const factionStyle = hero ? getFactionStyle(hero.faction) : null;
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

  return (
    <div
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
        'relative flex min-w-0 flex-col rounded-lg border bg-[#1E2328] text-[#F3F4F6] transition-all duration-150',
        compact ? 'gap-1 p-1.5' : 'gap-1.5 p-2.5',
        !player.alive ? 'opacity-50 grayscale' : '',
        isSelectedTarget
          ? 'border-2 border-[#D99B26] ring-2 ring-[#D99B26]/60 bg-[#262B32]'
          : isTargetEligible
            ? 'cursor-pointer border-2 border-[#D99B26] hover:bg-[#252B33] shadow-[0_0_12px_rgba(217,155,38,0.28)]'
            : isActiveActor
              ? 'border-[#C83E37] ring-1 ring-[#C83E37]/60'
              : 'border-[#303740]',
        canClick ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B26]' : '',
      ].join(' ')}
    >
      {/* Huy hiệu khoảng cách góc trên phải */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3A424C] bg-[#14171A] text-[11px] font-bold text-[#F3F4F6]"
            title={player.displayName}
          >
            {getInitials(player.displayName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-[#F3F4F6]">
                {player.displayName}
              </span>
              <span className="font-mono-num shrink-0 text-[11px] text-[#9CA3AF]">
                #{player.seatIndex + 1}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {hero && factionStyle ? (
                <span
                  className={[
                    'inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[11px] font-bold',
                    factionStyle.badgeClass,
                  ].join(' ')}
                >
                  {hero.nameVi} · {factionStyle.labelVi}
                </span>
              ) : (
                <span className="text-[11px] text-[#9CA3AF]">Chưa chọn tướng</span>
              )}
              <span
                className={[
                  'rounded border px-1.5 py-0.2 text-[10px] font-semibold',
                  identityClass,
                ].join(' ')}
              >
                {identityLabel}
              </span>
            </div>
          </div>
        </div>

        {/* DistanceBadge */}
        {player.alive && Number.isFinite(distance) ? (
          <span className="font-mono-num shrink-0 rounded bg-[#14171A] px-1.5 py-0.5 text-[12px] font-bold text-[#D99B26] border border-[#3A424C]">
            Cách: {distance}
          </span>
        ) : !player.alive ? (
          <span className="shrink-0 rounded bg-[#DC2626]/20 px-1.5 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
            💀 Tử trận
          </span>
        ) : null}
      </div>

      {/* Hàng máu & số lá bài */}
      <div className="flex items-center justify-between gap-2 text-[13px] font-bold">
        <div className="flex items-center gap-1">
          <span className={player.hp <= 1 ? 'text-[#C83E37]' : 'text-[#F87171]'}>
            ❤️
          </span>
          <span className="font-mono-num">
            {player.hp}/{player.maxHp}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#D1D5DB]">
          <span className="font-mono-num rounded bg-[#14171A] px-1.5 py-0.5 border border-[#2D333B]">
            🃏 {player.handCount} lá
          </span>
          {player.isBotTakeover ? (
            <span className="rounded bg-[#D97706]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#FBBF24]">
              🤖 Máy đánh hộ
            </span>
          ) : null}
          {isDisconnected ? (
            <span className="rounded bg-[#DC2626]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCA5A5]">
              📡 Mất kết nối
            </span>
          ) : null}
        </div>
      </div>

      {/* Trang bị & Cẩm nang thời gian */}
      {(player.equipments.weapon ||
        player.equipments.armor ||
        player.equipments.plusOneHorse ||
        player.equipments.minusOneHorse ||
        player.delayedScrolls.length > 0) ? (
        <div className="flex flex-wrap gap-1 border-t border-[#2D333B] pt-1 text-[11px]">
          {player.equipments.weapon ? (
            <span className="rounded bg-[#14171A] px-1.5 py-0.5 text-[#FDE68A] border border-[#3A424C]">
              ⚔️ {player.equipments.weapon.nameVi} (Tầm{' '}
              {player.equipments.weapon.attackRange ?? 1})
            </span>
          ) : null}
          {player.equipments.armor ? (
            <span className="rounded bg-[#14171A] px-1.5 py-0.5 text-[#93C5FD] border border-[#3A424C]">
              🛡️ {player.equipments.armor.nameVi}
            </span>
          ) : null}
          {player.equipments.plusOneHorse ? (
            <span className="rounded bg-[#14171A] px-1.5 py-0.5 text-[#86EFAC] border border-[#3A424C]">
              🐴 +1 {player.equipments.plusOneHorse.nameVi}
            </span>
          ) : null}
          {player.equipments.minusOneHorse ? (
            <span className="rounded bg-[#14171A] px-1.5 py-0.5 text-[#FCA5A5] border border-[#3A424C]">
              🐎 -1 {player.equipments.minusOneHorse.nameVi}
            </span>
          ) : null}
          {player.delayedScrolls.map((scroll) => (
            <span
              key={scroll.id}
              className="rounded bg-[#D97706]/20 px-1.5 py-0.5 text-[#FCD34D] border border-[#D97706]/40"
            >
              ⏳ {scroll.cardKey === 'lac_bat_tu_thuc' ? 'Lạc' : scroll.nameVi}
            </span>
          ))}
        </div>
      ) : null}

      {/* Nhãn chọn mục tiêu khi hợp lệ */}
      {canClick ? (
        <div className="mt-0.5 flex items-center justify-center rounded bg-[#D99B26]/20 py-0.5 text-[11px] font-bold text-[#FBBF24]">
          {isSelectedTarget ? '✓ Đã chọn mục tiêu' : '🎯 Bấm để chọn'}
        </div>
      ) : null}
    </div>
  );
}
