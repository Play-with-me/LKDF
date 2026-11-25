import type { ReactElement } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengPillSelect } from '../../components/ui/GuofengPillSelect.js';
import type {
  HeroFaction,
  HeroId,
  IdentityRole,
  StatsMetaResponse,
} from '../../lib/types.js';

export interface StatsFilterState {
  readonly userId: string | null;
  readonly identity: IdentityRole | null;
  readonly heroId: HeroId | null;
}

export interface StatsMetaFiltersProps {
  readonly meta: StatsMetaResponse | null;
  readonly filter: StatsFilterState;
  readonly currentUserId?: string | null;
  readonly isLoading: boolean;
  readonly onChangeFilter: (next: StatsFilterState) => void;
  readonly onResetFilters: () => void;
  readonly onRefresh: () => void;
  readonly onBack: () => void;
}

const FACTION_DOT_CLASSES: Readonly<Record<HeroFaction, string>> = {
  SHU: 'bg-[#C83E37]',
  WEI: 'bg-[#3B82F6]',
  WU: 'bg-[#10B981]',
  QUN: 'bg-[#9CA3AF]',
};

const IDENTITY_FALLBACK_LABELS: Readonly<Record<IdentityRole, string>> = {
  LORD: 'Chủ Công',
  LOYALIST: 'Trung Thần',
  REBEL: 'Phản Tặc',
  SPY: 'Nội Gián',
};

export function StatsMetaFilters({
  meta,
  filter,
  currentUserId,
  isLoading,
  onChangeFilter,
  onResetFilters,
  onRefresh,
  onBack,
}: StatsMetaFiltersProps): ReactElement {
  const hasActiveFilter =
    filter.userId !== null || filter.identity !== null || filter.heroId !== null;

  const isMyFilterActive =
    Boolean(currentUserId) && filter.userId === currentUserId;

  const selectedPlayerName =
    filter.userId !== null
      ? (meta?.players.find((p) => p.userId === filter.userId)?.displayName ??
        filter.userId)
      : null;

  const selectedIdentityName =
    filter.identity !== null
      ? (meta?.identities.find((i) => i.id === filter.identity)?.nameVi ??
        IDENTITY_FALLBACK_LABELS[filter.identity])
      : null;

  const selectedHero =
    filter.heroId !== null
      ? meta?.heroes.find((h) => h.id === filter.heroId) ?? null
      : null;

  const handleToggleMine = (): void => {
    if (!currentUserId) {
      return;
    }
    onChangeFilter({
      ...filter,
      userId: isMyFilterActive ? null : currentUserId,
    });
  };

  const playerOptions = [
    { value: '', label: 'Tất cả người chơi' },
    ...(meta?.players ?? []).map((player) => ({
      value: player.userId,
      label: `${player.displayName}${currentUserId && player.userId === currentUserId ? ' (Bạn)' : ''}`,
    })),
  ];

  const identityOptions = [
    { value: '', label: 'Tất cả thân phận' },
    ...(meta?.identities ?? []).map((identity) => ({
      value: identity.id,
      label: identity.nameVi,
    })),
  ];

  const heroOptions = [
    { value: '', label: 'Tất cả 25 tướng' },
    ...(meta?.heroes ?? []).map((hero) => ({
      value: hero.id,
      label: hero.nameVi,
      detail: hero.factionLabelVi,
    })),
  ];

  return (
    <header className="shrink-0 border-b border-[#806345]/55 bg-[#16110E]/94 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 min-w-0">
        {/* Hàng 1: Tiêu đề và nút điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:arrow-left" size={14} className="text-[#E6BE6C]" />
              <span>Quay lại</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-serif-title truncate text-lg font-bold tracking-tight text-[#F5EBD6]">
                Thống Kê &amp; Lịch Sử Ván Đấu
              </h1>
              <p className="truncate text-xs text-[#D5C3A5]">
                Số liệu thực tế từ máy chủ theo Người chơi, Thân Phận và 25 Tướng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUserId ? (
              <button
                type="button"
                onClick={handleToggleMine}
                aria-pressed={isMyFilterActive}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6BE6C] ${
                  isMyFilterActive
                    ? 'border-[#E6BE6C] bg-[#6C2521] text-[#FFF8ED]'
                    : 'border-[#806345]/80 bg-[#1F1712] text-[#F5EBD6] hover:border-[#E6BE6C]'
                }`}
              >
                <GameIcon name="ui:user" size={14} className="text-[#E6BE6C]" />
                <span>{isMyFilterActive ? 'Đang lọc: Của tôi' : 'Chỉ xem của tôi'}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[#F5EBD6] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon
                name="ui:refresh"
                size={14}
                className={isLoading ? 'animate-spin text-[#E6BE6C]' : 'text-[#E6BE6C]'}
              />
              <span>{isLoading ? 'Đang tải...' : 'Tải lại thống kê'}</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: 3 Bộ lọc Người chơi / Thân phận / Tướng */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4 min-w-0">
          <GuofengPillSelect
            label="Người chơi"
            ariaLabel="Lọc theo người chơi"
            value={filter.userId ?? ''}
            options={playerOptions}
            onChange={(value) =>
              onChangeFilter({
                ...filter,
                userId: value === '' ? null : value,
              })
            }
          />

          <GuofengPillSelect
            label="Thân phận"
            ariaLabel="Lọc theo thân phận"
            value={filter.identity ?? ''}
            options={identityOptions}
            onChange={(value) =>
              onChangeFilter({
                ...filter,
                identity: value === '' ? null : (value as IdentityRole),
              })
            }
          />

          <GuofengPillSelect
            label="Tướng (25 tướng)"
            ariaLabel="Lọc theo tướng"
            value={filter.heroId ?? ''}
            options={heroOptions}
            onChange={(value) =>
              onChangeFilter({
                ...filter,
                heroId: value === '' ? null : (value as HeroId),
              })
            }
          />

          <div className="flex items-end min-w-0">
            <button
              type="button"
              onClick={onResetFilters}
              disabled={!hasActiveFilter}
              className="lkdf-bronze-pill inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[#F5EBD6] hover:border-[#C83E37] hover:text-[#FFF8ED] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:undo" size={14} className="text-[#E6BE6C]" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        </div>

        {/* Hàng 3: Nhãn bộ lọc đang áp dụng (Trạng thái 3 - Partial Filter) */}
        {hasActiveFilter ? (
          <div
            className="flex flex-wrap items-center gap-2 pt-0.5 text-xs"
            aria-label="Bộ lọc đang áp dụng"
          >
            <span className="font-semibold text-[#E6BE6C]">Đang lọc theo:</span>
            {selectedPlayerName !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, userId: null })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C89B4B]/70 bg-[#1F1712] px-2.5 py-0.5 text-[#F5EBD6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
              >
                <span>Người chơi: {selectedPlayerName}</span>
                <span aria-hidden="true" className="text-[#D5C3A5]">
                  ×
                </span>
              </button>
            ) : null}

            {selectedIdentityName !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, identity: null })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C89B4B]/70 bg-[#1F1712] px-2.5 py-0.5 text-[#F5EBD6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
              >
                <span>Thân phận: {selectedIdentityName}</span>
                <span aria-hidden="true" className="text-[#D5C3A5]">
                  ×
                </span>
              </button>
            ) : null}

            {filter.heroId !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, heroId: null })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C89B4B]/70 bg-[#1F1712] px-2.5 py-0.5 text-[#F5EBD6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
              >
                {selectedHero ? (
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-full ${FACTION_DOT_CLASSES[selectedHero.faction]}`}
                  />
                ) : null}
                <span>
                  Tướng: {selectedHero ? selectedHero.nameVi : filter.heroId}
                </span>
                <span aria-hidden="true" className="text-[#D5C3A5]">
                  ×
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
