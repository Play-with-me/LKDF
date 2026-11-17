import type { ReactElement } from 'react';
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

  return (
    <header className="shrink-0 border-b border-[#2D333B] bg-[#1E2328] px-4 py-3">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 min-w-0">
        {/* Hàng 1: Tiêu đề và nút điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3B424C] bg-[#14171A] px-3 py-1.5 text-sm font-medium text-[#F3F4F6] transition-colors duration-150 hover:border-[#D99B26] hover:text-[#F4EFE6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              <span aria-hidden="true">←</span>
              <span>Quay lại</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-[#F3F4F6]">
                Thống Kê &amp; Lịch Sử Ván Đấu
              </h1>
              <p className="truncate text-xs text-[#9CA3AF]">
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
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] ${
                  isMyFilterActive
                    ? 'border-[#D99B26] bg-[#C83E37]/20 text-[#F4EFE6]'
                    : 'border-[#3B424C] bg-[#14171A] text-[#F3F4F6] hover:border-[#D99B26]'
                }`}
              >
                <span aria-hidden="true">👤</span>
                <span>{isMyFilterActive ? 'Đang lọc: Của tôi' : 'Chỉ xem của tôi'}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3B424C] bg-[#14171A] px-3 py-1.5 text-sm font-medium text-[#F3F4F6] transition-colors duration-150 hover:border-[#D99B26] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              <span aria-hidden="true">🔄</span>
              <span>{isLoading ? 'Đang tải...' : 'Tải lại thống kê'}</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: 3 Bộ lọc Người chơi / Thân phận / Tướng */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4 min-w-0">
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium text-[#9CA3AF]">Người chơi</span>
            <select
              aria-label="Lọc theo người chơi"
              value={filter.userId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                onChangeFilter({
                  ...filter,
                  userId: value === '' ? null : value,
                });
              }}
              className="w-full rounded-md border border-[#3B424C] bg-[#14171A] px-2.5 py-1.5 text-sm text-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              <option value="">Tất cả người chơi</option>
              {(meta?.players ?? []).map((player) => (
                <option key={player.userId} value={player.userId}>
                  {player.displayName}
                  {currentUserId && player.userId === currentUserId ? ' (Bạn)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium text-[#9CA3AF]">Thân phận</span>
            <select
              aria-label="Lọc theo thân phận"
              value={filter.identity ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                onChangeFilter({
                  ...filter,
                  identity: value === '' ? null : (value as IdentityRole),
                });
              }}
              className="w-full rounded-md border border-[#3B424C] bg-[#14171A] px-2.5 py-1.5 text-sm text-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              <option value="">Tất cả thân phận</option>
              {(meta?.identities ?? []).map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.nameVi}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium text-[#9CA3AF]">Tướng (25 tướng)</span>
            <select
              aria-label="Lọc theo tướng"
              value={filter.heroId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                onChangeFilter({
                  ...filter,
                  heroId: value === '' ? null : (value as HeroId),
                });
              }}
              className="w-full rounded-md border border-[#3B424C] bg-[#14171A] px-2.5 py-1.5 text-sm text-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              <option value="">Tất cả 25 tướng</option>
              {(meta?.heroes ?? []).map((hero) => (
                <option key={hero.id} value={hero.id}>
                  [{hero.factionLabelVi}] {hero.nameVi}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end min-w-0">
            <button
              type="button"
              onClick={onResetFilters}
              disabled={!hasActiveFilter}
              className="w-full rounded-md border border-[#3B424C] bg-[#14171A] px-3 py-1.5 text-sm font-medium text-[#F3F4F6] transition-colors duration-150 hover:border-[#C83E37] hover:text-[#F4EFE6] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26]"
            >
              ↩️ Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Hàng 3: Nhãn bộ lọc đang áp dụng (Trạng thái 3 - Partial Filter) */}
        {hasActiveFilter ? (
          <div
            className="flex flex-wrap items-center gap-2 pt-0.5 text-xs"
            aria-label="Bộ lọc đang áp dụng"
          >
            <span className="font-medium text-[#D99B26]">Đang lọc theo:</span>
            {selectedPlayerName !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, userId: null })}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D99B26]/60 bg-[#14171A] px-2.5 py-0.5 text-[#F3F4F6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
              >
                <span>Người chơi: {selectedPlayerName}</span>
                <span aria-hidden="true" className="text-[#9CA3AF]">
                  ×
                </span>
              </button>
            ) : null}

            {selectedIdentityName !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, identity: null })}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D99B26]/60 bg-[#14171A] px-2.5 py-0.5 text-[#F3F4F6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
              >
                <span>Thân phận: {selectedIdentityName}</span>
                <span aria-hidden="true" className="text-[#9CA3AF]">
                  ×
                </span>
              </button>
            ) : null}

            {filter.heroId !== null ? (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, heroId: null })}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D99B26]/60 bg-[#14171A] px-2.5 py-0.5 text-[#F3F4F6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
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
                <span aria-hidden="true" className="text-[#9CA3AF]">
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
