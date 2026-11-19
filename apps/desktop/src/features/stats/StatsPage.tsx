import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { HERO_BY_ID, HERO_CATALOG, type HeroFaction } from '@lkdf/shared';
import { GameIcon } from '../../components/icons/index.js';
import { ApiError, type LkdfApiClient } from '../../lib/api.js';
import type {
  DetailedStatEntry,
  FilteredStatsResponse,
  HeroId,
  IdentityRole,
  PlayerFilteredStatRow,
  StatsMetaResponse,
} from '../../lib/types.js';
import { MatchHistoryList } from './MatchHistoryList.js';
import { StatsMetaFilters, type StatsFilterState } from './StatsMetaFilters.js';

export interface StatsPageProps {
  readonly api: LkdfApiClient;
  readonly currentUserId?: string | null;
  readonly onBack: () => void;
}

type StatsSectionTab = 'ALL' | 'PLAYERS_HEROES' | 'HISTORY';

const EMPTY_FILTER: StatsFilterState = {
  userId: null,
  identity: null,
  heroId: null,
};

const IDENTITY_ORDER: readonly {
  readonly id: IdentityRole;
  readonly nameVi: string;
  readonly accentClass: string;
}[] = [
  { id: 'LORD', nameVi: 'Chủ Công', accentClass: 'border-[#D99B26]/60 text-[#FCD34D]' },
  { id: 'LOYALIST', nameVi: 'Trung Thần', accentClass: 'border-[#3B82F6]/60 text-[#93C5FD]' },
  { id: 'REBEL', nameVi: 'Phản Tặc', accentClass: 'border-[#C83E37]/70 text-[#FCA5A5]' },
  { id: 'SPY', nameVi: 'Nội Gián', accentClass: 'border-[#9CA3AF]/60 text-[#E5E7EB]' },
];

const FACTION_STYLE: Readonly<
  Record<
    HeroFaction,
    { readonly dot: string; readonly badge: string; readonly labelVi: string }
  >
> = {
  SHU: {
    dot: 'bg-[#C83E37]',
    badge: 'border-[#C83E37]/60 bg-[#C83E37]/15 text-[#FCA5A5]',
    labelVi: 'Thục',
  },
  WEI: {
    dot: 'bg-[#3B82F6]',
    badge: 'border-[#3B82F6]/60 bg-[#3B82F6]/15 text-[#93C5FD]',
    labelVi: 'Ngụy',
  },
  WU: {
    dot: 'bg-[#10B981]',
    badge: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
    labelVi: 'Ngô',
  },
  QUN: {
    dot: 'bg-[#9CA3AF]',
    badge: 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#D1D5DB]',
    labelVi: 'Quần',
  },
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1] ?? '';
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function formatErrorMessageVi(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  return 'Không thể tải dữ liệu thống kê từ máy chủ. Vui lòng thử lại.';
}

export function StatsPage({
  api,
  currentUserId,
  onBack,
}: StatsPageProps): ReactElement {
  const [meta, setMeta] = useState<StatsMetaResponse | null>(null);
  const [stats, setStats] = useState<FilteredStatsResponse | null>(null);
  const [filter, setFilter] = useState<StatsFilterState>(EMPTY_FILTER);
  const [activeTab, setActiveTab] = useState<StatsSectionTab>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const userCancelledRef = useRef<boolean>(false);

  const hasActiveFilter =
    filter.userId !== null || filter.identity !== null || filter.heroId !== null;

  useEffect(() => {
    let active = true;
    api
      .getStatsMeta()
      .then((metaResponse) => {
        if (active) {
          setMeta(metaResponse);
        }
      })
      .catch(() => {
        // Meta failure is surfaced if queryStats also fails; fallback catalogs remain usable.
      });
    return () => {
      active = false;
    };
  }, [api, reloadNonce]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    userCancelledRef.current = false;

    setIsLoading(true);
    setIsCancelled(false);
    setErrorMessage(null);

    api
      .queryStats(
        {
          ...(filter.userId ? { userId: filter.userId } : {}),
          ...(filter.identity ? { identity: filter.identity } : {}),
          ...(filter.heroId ? { heroId: filter.heroId } : {}),
          includeMatches: true,
          matchLimit: 20,
        },
        controller.signal,
      )
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        setStats(response);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          if (userCancelledRef.current) {
            setIsLoading(false);
            setIsCancelled(true);
          }
          return;
        }
        setErrorMessage(formatErrorMessageVi(err));
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [api, filter, reloadNonce]);

  const handleCancelLoading = useCallback((): void => {
    userCancelledRef.current = true;
    abortRef.current?.abort();
    setIsLoading(false);
    setIsCancelled(true);
  }, []);

  const handleRefresh = useCallback((): void => {
    setReloadNonce((prev) => prev + 1);
  }, []);

  const handleResetFilters = useCallback((): void => {
    setFilter(EMPTY_FILTER);
  }, []);

  const heroEntries = useMemo(() => {
    const byHero = stats?.summary.byHero ?? {};
    return HERO_CATALOG.map((hero) => {
      const entry: DetailedStatEntry = byHero[hero.id] ?? {
        played: 0,
        wins: 0,
        losses: 0,
        winRatePercent: 0,
      };
      return {
        hero,
        entry,
      };
    }).sort((a, b) => {
      if (b.entry.played !== a.entry.played) {
        return b.entry.played - a.entry.played;
      }
      return b.entry.wins - a.entry.wins;
    });
  }, [stats]);

  const sortedPlayers: readonly PlayerFilteredStatRow[] = useMemo(() => {
    if (!stats) {
      return [];
    }
    return [...stats.players].sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      if (b.winRatePercent !== a.winRatePercent) {
        return b.winRatePercent - a.winRatePercent;
      }
      return b.played - a.played;
    });
  }, [stats]);

  const recentMatches = stats?.recentMatches ?? [];

  return (
    <section
      aria-label="Trang thống kê và lịch sử ván đấu"
      className="flex h-full w-full min-h-0 min-w-0 flex-col bg-transparent text-[#F3F4F6]"
    >
      <StatsMetaFilters
        meta={meta}
        filter={filter}
        currentUserId={currentUserId}
        isLoading={isLoading}
        onChangeFilter={setFilter}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
        onBack={onBack}
      />

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 min-w-0">
          {/* Trạng thái 1: Đang tải */}
          {isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-4 rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-6 backdrop-blur-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#D99B26] border-t-transparent"
                  />
                  <span className="text-sm font-medium text-[#F4EFE6]">
                    Đang tải dữ liệu thống kê từ máy chủ...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelLoading}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#3B424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#F3F4F6] hover:border-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                  >
                    <GameIcon name="ui:x" size={13} />
                    Hủy tải
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-md border border-[#3B424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                  >
                    ← Quay lại
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="h-20 animate-pulse rounded-md border border-[#2D333B] bg-[#14171A]"
                  />
                ))}
              </div>
            </div>
          ) : isCancelled && !stats ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-[#D97706]/50 bg-[#11151D]/92 p-8 text-center backdrop-blur-md">
              <p className="text-sm font-medium text-[#F4EFE6]">
                Đã hủy tải dữ liệu thống kê.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#C83E37] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#B2342E] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                >
                  <GameIcon name="ui:refresh" size={14} />
                  Tải lại thống kê
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-md border border-[#3B424C] bg-[#14171A] px-4 py-2 text-sm font-medium text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                >
                  ← Quay lại
                </button>
              </div>
            </div>
          ) : errorMessage !== null ? (
            /* Trạng thái 5: Gặp lỗi */
            <div
              role="alert"
              className="flex flex-col items-start justify-between gap-4 rounded-lg border border-[#DC2626]/70 bg-[#DC2626]/10 p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#FCA5A5]">
                  Không tải được thống kê từ máy chủ
                </h2>
                <p className="mt-1 text-sm text-[#F3F4F6]">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-[#C83E37] px-4 py-2 text-sm font-semibold text-[#F4EFE6] transition-colors duration-150 hover:bg-[#B2342E] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
              >
                <GameIcon name="ui:refresh" size={14} />
                Tải lại thống kê
              </button>
            </div>
          ) : stats && stats.summary.totalDistinctMatches === 0 ? (
            /* Trạng thái 2: Chưa có dữ liệu (phân biệt chưa có ván nào vs lọc ra 0) */
            <div className="flex flex-col items-center justify-center gap-4 rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-10 text-center backdrop-blur-md">
              <div className="rounded-full border border-[#30363D] bg-[#14171A] p-3 text-[#D99B26]" aria-hidden="true">
                <GameIcon name={hasActiveFilter ? 'ui:layers' : 'scroll-unfurled'} size={28} />
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-[#F3F4F6]">
                {hasActiveFilter
                  ? 'Không có ván đấu nào khớp bộ lọc đang chọn.'
                  : 'Chưa có ván đấu nào được ghi nhận. Hãy hoàn thành ván đầu tiên để xem thống kê theo Thân Phận và Tướng!'}
              </p>
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#C83E37] px-4 py-2 text-sm font-semibold text-[#F4EFE6] transition-colors duration-150 hover:bg-[#B2342E] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                >
                  <GameIcon name="ui:undo" size={14} />
                  Xóa bộ lọc
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-md border border-[#3B424C] bg-[#14171A] px-4 py-2 text-sm font-medium text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                >
                  ← Quay lại sảnh chờ
                </button>
              )}
            </div>
          ) : stats ? (
            /* Trạng thái 4: Thành công */
            <>
              {/* 4 Thẻ chỉ số tổng quan (KPI) */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-w-0">
                <div className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 min-w-0 backdrop-blur-md">
                  <p className="text-xs font-medium text-[#94A3B8]">Tổng trận</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#F4EFE6]">
                    {stats.summary.totalDistinctMatches}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-[#94A3B8]">
                    {stats.summary.totalAppearances} lượt tham gia
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 min-w-0 backdrop-blur-md">
                  <p className="text-xs font-medium text-[#94A3B8]">Số thắng</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#86EFAC]">
                    {stats.summary.totalWins}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                    Theo bộ lọc hiện tại
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 min-w-0 backdrop-blur-md">
                  <p className="text-xs font-medium text-[#94A3B8]">Số thua</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#FCA5A5]">
                    {stats.summary.totalLosses}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                    Theo bộ lọc hiện tại
                  </p>
                </div>

                <div className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 min-w-0 backdrop-blur-md">
                  <p className="text-xs font-medium text-[#94A3B8]">Tỷ lệ thắng</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#E6BE6C]">
                    {stats.summary.winRatePercent.toFixed(1)}%
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                    Trên tổng lượt tham gia
                  </p>
                </div>
              </div>

              {/* Phân tích theo 4 Thân Phận */}
              <section
                aria-label="Thống kê theo Thân Phận"
                className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 min-w-0 backdrop-blur-md"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#F4EFE6]">
                    Thống kê theo 4 Thân Phận
                  </h2>
                  <span className="text-xs text-[#9CA3AF]">
                    Bấm vào thẻ Thân Phận để lọc nhanh
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
                  {IDENTITY_ORDER.map((item) => {
                    const entry = stats.summary.byIdentity[item.id];
                    const isSelected = filter.identity === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          setFilter((prev) => ({
                            ...prev,
                            identity: prev.identity === item.id ? null : item.id,
                          }))
                        }
                        className={`flex flex-col gap-2 rounded-md border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${
                          isSelected
                            ? 'border-[#D99B26] bg-[#14171A]'
                            : 'border-[#2D333B] bg-[#14171A]/75 hover:border-[#D99B26]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded border px-2 py-0.5 text-xs font-semibold ${item.accentClass}`}
                          >
                            {item.nameVi}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-[#F4EFE6]">
                            {entry.winRatePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2D333B]">
                          <div
                            className="h-full rounded-full bg-[#D99B26] transition-all duration-200"
                            style={{
                              width: `${Math.min(100, Math.max(0, entry.winRatePercent))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs tabular-nums text-[#9CA3AF]">
                          <span>{entry.played} lượt</span>
                          <span>
                            {entry.wins} thắng · {entry.losses} thua
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Thanh chuyển vùng hiển thị */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#2D333B] pb-2">
                <button
                  type="button"
                  aria-pressed={activeTab === 'ALL'}
                  onClick={() => setActiveTab('ALL')}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${
                    activeTab === 'ALL'
                      ? 'bg-[#C83E37] text-[#F4EFE6]'
                      : 'border border-[#2D333B] bg-[#1E2328] text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  <GameIcon name="ui:layers" size={13} />
                  Xem tất cả
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === 'PLAYERS_HEROES'}
                  onClick={() => setActiveTab('PLAYERS_HEROES')}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${
                    activeTab === 'PLAYERS_HEROES'
                      ? 'bg-[#C83E37] text-[#F4EFE6]'
                      : 'border border-[#2D333B] bg-[#1E2328] text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  <GameIcon name="ui:users" size={13} />
                  Bảng xếp hạng &amp; 25 Tướng ({sortedPlayers.length})
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === 'HISTORY'}
                  onClick={() => setActiveTab('HISTORY')}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${
                    activeTab === 'HISTORY'
                      ? 'bg-[#C83E37] text-[#F4EFE6]'
                      : 'border border-[#2D333B] bg-[#1E2328] text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  <GameIcon name="scroll-unfurled" size={13} />
                  Lịch sử các ván đấu gần đây ({recentMatches.length})
                </button>
              </div>

              {activeTab === 'ALL' || activeTab === 'PLAYERS_HEROES' ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-w-0">
                  {/* Bảng xếp hạng người chơi */}
                  <section
                    aria-label="Bảng xếp hạng người chơi"
                    className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 lg:col-span-6 min-w-0 backdrop-blur-md"
                  >
                    <h2 className="mb-3 text-sm font-bold text-[#F4EFE6]">
                      Bảng xếp hạng người chơi
                    </h2>
                    {sortedPlayers.length === 0 ? (
                      <p className="text-sm text-[#9CA3AF]">
                        Chưa có dữ liệu người chơi cho bộ lọc này.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#2D333B] text-xs text-[#9CA3AF]">
                              <th className="py-2 pr-2 font-medium">#</th>
                              <th className="py-2 pr-2 font-medium">Người chơi</th>
                              <th className="py-2 px-2 text-right font-medium">Trận</th>
                              <th className="py-2 px-2 text-right font-medium">Thắng</th>
                              <th className="py-2 px-2 text-right font-medium">Thua</th>
                              <th className="py-2 pl-2 text-right font-medium">Tỷ lệ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPlayers.map((player, index) => {
                              const isSelf =
                                Boolean(currentUserId) && player.userId === currentUserId;
                              const isFiltered = filter.userId === player.userId;
                              return (
                                <tr
                                  key={player.userId}
                                  className={`border-b border-[#2D333B]/60 last:border-b-0 ${
                                    isFiltered ? 'bg-[#D99B26]/10' : ''
                                  }`}
                                >
                                  <td className="py-2 pr-2 font-mono text-xs tabular-nums text-[#9CA3AF]">
                                    {index + 1}
                                  </td>
                                  <td className="py-2 pr-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFilter((prev) => ({
                                          ...prev,
                                          userId:
                                            prev.userId === player.userId
                                              ? null
                                              : player.userId,
                                        }))
                                      }
                                      className="flex items-center gap-2 text-left hover:text-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                                      title={`Lọc theo ${player.displayName}`}
                                    >
                                      {player.avatarUrl ? (
                                        <img
                                          src={player.avatarUrl}
                                          alt=""
                                          className="h-6 w-6 shrink-0 rounded-full border border-[#3B424C] object-cover"
                                        />
                                      ) : (
                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#3B424C] bg-[#14171A] text-[10px] font-bold text-[#F4EFE6]">
                                          {getInitials(player.displayName)}
                                        </span>
                                      )}
                                      <span className="truncate font-medium text-[#F3F4F6]">
                                        {player.displayName}
                                      </span>
                                      {isSelf ? (
                                        <span className="shrink-0 rounded border border-[#D99B26]/60 bg-[#D99B26]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#FCD34D]">
                                          Bạn
                                        </span>
                                      ) : null}
                                    </button>
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums text-[#F3F4F6]">
                                    {player.played}
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums text-[#86EFAC]">
                                    {player.wins}
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums text-[#FCA5A5]">
                                    {player.losses}
                                  </td>
                                  <td className="py-2 pl-2 text-right font-semibold tabular-nums text-[#D99B26]">
                                    {player.winRatePercent.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* Lưới thống kê 25 Tướng theo Thế lực */}
                  <section
                    aria-label="Thống kê theo 25 Tướng"
                    className="rounded-[8px] border border-[#94A3B8]/28 bg-[#11151D]/92 p-4 lg:col-span-6 min-w-0 backdrop-blur-md"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-bold text-[#F4EFE6]">
                        Thống kê theo Tướng (4 Thế lực)
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#C83E37]" /> Thục
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> Ngụy
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Ngô
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" /> Quần
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 min-w-0">
                      {heroEntries.map(({ hero, entry }) => {
                        const style = FACTION_STYLE[hero.faction];
                        const isSelected = filter.heroId === hero.id;
                        const catalogHero = HERO_BY_ID[hero.id];
                        return (
                          <button
                            key={hero.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              setFilter((prev) => ({
                                ...prev,
                                heroId: prev.heroId === hero.id ? null : hero.id,
                              }))
                            }
                            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${
                              isSelected
                                ? 'border-[#D99B26] bg-[#14171A]'
                                : entry.played > 0
                                  ? 'border-[#2D333B] bg-[#14171A]/80 hover:border-[#D99B26]/60'
                                  : 'border-[#2D333B]/60 bg-[#14171A]/40 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                aria-hidden="true"
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#F3F4F6]">
                                  {catalogHero?.nameVi ?? hero.nameVi}
                                </p>
                                <span
                                  className={`inline-block rounded border px-1.5 py-0 text-[10px] font-medium ${style.badge}`}
                                >
                                  {style.labelVi}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right tabular-nums">
                              <p className="text-xs font-bold text-[#F4EFE6]">
                                {entry.played > 0
                                  ? `${entry.winRatePercent.toFixed(1)}%`
                                  : '—'}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF]">
                                {entry.wins}/{entry.played} thắng
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === 'ALL' || activeTab === 'HISTORY' ? (
                <section aria-label="Lịch sử các ván đấu gần đây" className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-[#F4EFE6]">
                      Lịch sử các ván đấu gần đây ({recentMatches.length})
                    </h2>
                    <span className="text-xs text-[#9CA3AF]">
                      Bấm vào tên người chơi hoặc tướng để lọc nhanh
                    </span>
                  </div>
                  <MatchHistoryList
                    matches={recentMatches}
                    currentUserId={currentUserId}
                    onSelectPlayer={(userId) =>
                      setFilter((prev) => ({
                        ...prev,
                        userId: prev.userId === userId ? null : userId,
                      }))
                    }
                    onSelectHero={(heroId) =>
                      setFilter((prev) => ({
                        ...prev,
                        heroId: prev.heroId === heroId ? null : heroId,
                      }))
                    }
                  />
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
