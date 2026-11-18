import type { ReactElement } from 'react';
import { HERO_BY_ID, type HeroFaction, type WinningFaction } from '@lkdf/shared';
import { GameIcon, type GameIconName } from '../../components/icons/index.js';
import type {
  HeroId,
  IdentityRole,
  MatchHistoryRecord,
} from '../../lib/types.js';

export interface MatchHistoryListProps {
  readonly matches: readonly MatchHistoryRecord[];
  readonly currentUserId?: string | null;
  readonly onSelectPlayer?: (userId: string) => void;
  readonly onSelectHero?: (heroId: HeroId) => void;
}

const FACTION_BADGE_CLASSES: Readonly<Record<HeroFaction, string>> = {
  SHU: 'border-[#C83E37]/60 bg-[#C83E37]/15 text-[#FCA5A5]',
  WEI: 'border-[#3B82F6]/60 bg-[#3B82F6]/15 text-[#93C5FD]',
  WU: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
  QUN: 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#D1D5DB]',
};

const IDENTITY_LABELS: Readonly<Record<IdentityRole, string>> = {
  LORD: 'Chủ Công',
  LOYALIST: 'Trung Thần',
  REBEL: 'Phản Tặc',
  SPY: 'Nội Gián',
};

const IDENTITY_BADGE_CLASSES: Readonly<Record<IdentityRole, string>> = {
  LORD: 'border-[#D99B26]/60 bg-[#D99B26]/15 text-[#FCD34D]',
  LOYALIST: 'border-[#3B82F6]/50 bg-[#3B82F6]/15 text-[#93C5FD]',
  REBEL: 'border-[#C83E37]/60 bg-[#C83E37]/15 text-[#FCA5A5]',
  SPY: 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#E5E7EB]',
};

const WINNING_FACTION_META: Readonly<
  Record<
    WinningFaction,
    { readonly icon: GameIconName; readonly labelVi: string; readonly className: string }
  >
> = {
  LORD_LOYALIST: {
    icon: 'crown',
    labelVi: 'Phe Chủ Công & Trung Thần thắng',
    className: 'border-[#D99B26]/60 bg-[#D99B26]/15 text-[#FCD34D]',
  },
  REBEL: {
    icon: 'crossed-swords',
    labelVi: 'Phe Phản Tặc thắng',
    className: 'border-[#C83E37]/70 bg-[#C83E37]/20 text-[#FCA5A5]',
  },
  SPY: {
    icon: 'drama-masks',
    labelVi: 'Nội Gián thắng',
    className: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
  },
};

function formatDurationVi(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatFinishedAtVi(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function MatchHistoryList({
  matches,
  currentUserId,
  onSelectPlayer,
  onSelectHero,
}: MatchHistoryListProps): ReactElement {
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-[#2D333B] bg-[#1E2328] p-6 text-center text-sm text-[#9CA3AF]">
        Không có lịch sử ván đấu nào khớp bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {matches.map((match) => {
        const winningMeta = WINNING_FACTION_META[match.winningFaction];
        return (
          <article
            key={match.matchId}
            className="rounded-lg border border-[#2D333B] bg-[#1E2328] p-4 min-w-0"
          >
            {/* Đầu thẻ ván đấu */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#2D333B] pb-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="rounded border border-[#3B424C] bg-[#14171A] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-[#F4EFE6]">
                  Phòng #{match.roomCode}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${winningMeta.className}`}
                >
                  <GameIcon name={winningMeta.icon} size={12} />
                  {winningMeta.labelVi}
                </span>
                <span className="text-xs font-medium tabular-nums text-[#9CA3AF]">
                  {match.playerCount} người
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-[#9CA3AF]">
                <span>Thời lượng: {formatDurationVi(match.durationSeconds)}</span>
                <span>{formatFinishedAtVi(match.finishedAt)}</span>
              </div>
            </div>

            {/* Danh sách 4–8 người tham gia */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
              {match.participants.map((participant) => {
                const hero = HERO_BY_ID[participant.heroId];
                const heroFaction: HeroFaction = hero?.faction ?? 'QUN';
                const isSelf =
                  Boolean(currentUserId) && participant.userId === currentUserId;

                return (
                  <div
                    key={`${match.matchId}-${participant.seatIndex}-${participant.userId}`}
                    className={`flex flex-col justify-between gap-2 rounded-md border p-2.5 min-w-0 ${
                      isSelf
                        ? 'border-[#D99B26]/70 bg-[#14171A]'
                        : 'border-[#2D333B] bg-[#14171A]/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        {onSelectPlayer ? (
                          <button
                            type="button"
                            onClick={() => onSelectPlayer(participant.userId)}
                            className="max-w-full truncate text-left text-sm font-semibold text-[#F3F4F6] hover:text-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
                            title={`Lọc theo ${participant.displayName}`}
                          >
                            {participant.displayName}
                          </button>
                        ) : (
                          <p className="truncate text-sm font-semibold text-[#F3F4F6]">
                            {participant.displayName}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${IDENTITY_BADGE_CLASSES[participant.identity]}`}
                          >
                            {IDENTITY_LABELS[participant.identity]}
                          </span>
                          {isSelf ? (
                            <span className="rounded border border-[#D99B26]/60 bg-[#D99B26]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCD34D]">
                              Bạn
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          participant.isWinner
                            ? 'bg-[#16A34A]/20 text-[#86EFAC]'
                            : 'bg-[#DC2626]/20 text-[#FCA5A5]'
                        }`}
                      >
                        {participant.isWinner ? 'Thắng' : 'Thua'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[#2D333B]/70 pt-1.5 text-xs min-w-0">
                      {onSelectHero ? (
                        <button
                          type="button"
                          onClick={() => onSelectHero(participant.heroId)}
                          className={`truncate rounded border px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-[#D99B26] ${FACTION_BADGE_CLASSES[heroFaction]}`}
                          title={`Lọc theo tướng ${hero?.nameVi ?? participant.heroId}`}
                        >
                          {hero ? `${hero.nameVi} (${hero.factionLabelVi})` : participant.heroId}
                        </button>
                      ) : (
                        <span
                          className={`truncate rounded border px-1.5 py-0.5 text-xs font-medium ${FACTION_BADGE_CLASSES[heroFaction]}`}
                        >
                          {hero ? `${hero.nameVi} (${hero.factionLabelVi})` : participant.heroId}
                        </span>
                      )}

                      <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                        {participant.survived ? 'Sống sót' : 'Tử trận'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
