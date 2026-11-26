import type { ReactElement } from 'react';
import {
  HERO_BY_ID,
  getCuuChauFactionDisplay,
  getCuuChauHeroDisplay,
  getCuuChauRoleDisplay,
  type HeroFaction,
  type WinningFaction,
} from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
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
  LORD: 'Minh Chủ',
  LOYALIST: 'Hộ Pháp',
  REBEL: 'Nghĩa Quân',
  SPY: 'Ám Ảnh',
};

const IDENTITY_BADGE_CLASSES: Readonly<Record<IdentityRole, string>> = {
  LORD: 'border-[#C89B4B]/70 bg-[#3A290F]/70 text-[#FCD34D]',
  LOYALIST: 'border-[#3B82F6]/55 bg-[#162C48]/70 text-[#93C5FD]',
  REBEL: 'border-[#C83E37]/65 bg-[#3D2022]/70 text-[#FCA5A5]',
  SPY: 'border-[#A78BFA]/55 bg-[#30213E]/70 text-[#DDD6FE]',
};

const WINNING_FACTION_META: Readonly<
  Record<
    WinningFaction,
    {
      readonly icon: GameIconName;
      readonly labelVi: string;
      readonly labelEn: string;
      readonly className: string;
    }
  >
> = {
  LORD_LOYALIST: {
    icon: 'crown',
    labelVi: 'Phe Minh Chủ & Hộ Pháp thắng',
    labelEn: 'Sovereign & Wardens Victory',
    className: 'border-[#C89B4B]/70 bg-[#3A290F]/65 text-[#FCD34D]',
  },
  REBEL: {
    icon: 'crossed-swords',
    labelVi: 'Phe Nghĩa Quân thắng',
    labelEn: 'Rebels Victory',
    className: 'border-[#C83E37]/70 bg-[#C83E37]/20 text-[#FCA5A5]',
  },
  SPY: {
    icon: 'drama-masks',
    labelVi: 'Ám Ảnh thắng',
    labelEn: 'Traitor Victory',
    className: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
  },
};

function formatDurationVi(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatFinishedAt(isoString: string, locale: 'vi' | 'en'): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
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
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const isEn = locale === 'en';
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-[#806345]/60 bg-[#16110E]/94 p-6 text-center text-sm text-[#D5C3A5]">
        {isEn ? 'No match history matches the current filter.' : 'Không có lịch sử ván đấu nào khớp bộ lọc hiện tại.'}
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
            className="rounded-lg border border-[#806345]/60 bg-[#16110E]/94 p-4 min-w-0 backdrop-blur-md"
          >
            {/* Đầu thẻ ván đấu */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#806345]/45 pb-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-mono-num rounded border border-[#806345]/75 bg-[#1F1712] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#F5EBD6]">
                  {isEn ? `Room #${match.roomCode}` : `Phòng #${match.roomCode}`}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${winningMeta.className}`}
                >
                  <GameIcon name={winningMeta.icon} size={12} />
                  {isEn ? winningMeta.labelEn : winningMeta.labelVi}
                </span>
                <span className="font-mono-num text-xs font-medium tabular-nums text-[#D5C3A5]">
                  {isEn ? `${match.playerCount} players` : `${match.playerCount} người`}
                </span>
              </div>

              <div className="font-mono-num flex flex-wrap items-center gap-3 text-xs tabular-nums text-[#D5C3A5]">
                <span>{isEn ? `Duration: ${formatDurationVi(match.durationSeconds)}` : `Thời lượng: ${formatDurationVi(match.durationSeconds)}`}</span>
                <span>{formatFinishedAt(match.finishedAt, locale)}</span>
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
                        ? 'border-[#E6BE6C]/80 bg-[#271C15]'
                        : 'border-[#806345]/55 bg-[#1F1712]/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        {onSelectPlayer ? (
                          <button
                            type="button"
                            onClick={() => onSelectPlayer(participant.userId)}
                            className="max-w-full cursor-pointer truncate text-left text-sm font-semibold text-[#F5EBD6] hover:text-[#E6BE6C] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                            title={isEn ? `Filter by ${participant.displayName}` : `Lọc theo ${participant.displayName}`}
                          >
                            {participant.displayName}
                          </button>
                        ) : (
                          <p className="truncate text-sm font-semibold text-[#F5EBD6]">
                            {participant.displayName}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${IDENTITY_BADGE_CLASSES[participant.identity]}`}
                          >
                            {getCuuChauRoleDisplay(participant.identity, locale).name}
                          </span>
                          {isSelf ? (
                            <span className="rounded border border-[#C89B4B]/70 bg-[#C89B4B]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCD34D]">
                              {isEn ? 'You' : 'Bạn'}
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
                        {participant.isWinner ? (isEn ? 'Win' : 'Thắng') : (isEn ? 'Loss' : 'Thua')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[#806345]/45 pt-1.5 text-xs min-w-0">
                      {onSelectHero ? (
                        <button
                          type="button"
                          onClick={() => onSelectHero(participant.heroId)}
                          className={`cursor-pointer truncate rounded border px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${FACTION_BADGE_CLASSES[heroFaction] ?? 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#D1D5DB]'}`}
                          title={getCuuChauHeroDisplay(participant.heroId, locale)?.name ?? participant.heroId}
                        >
                          {hero ? `${getCuuChauHeroDisplay(participant.heroId, locale)?.name ?? hero.nameVi} (${getCuuChauFactionDisplay(hero.faction, locale).shortName})` : participant.heroId}
                        </button>
                      ) : (
                        <span
                          className={`truncate rounded border px-1.5 py-0.5 text-xs font-medium ${FACTION_BADGE_CLASSES[heroFaction] ?? 'border-[#9CA3AF]/60 bg-[#9CA3AF]/15 text-[#D1D5DB]'}`}
                        >
                          {hero ? `${getCuuChauHeroDisplay(participant.heroId, locale)?.name ?? hero.nameVi} (${getCuuChauFactionDisplay(hero.faction, locale).shortName})` : participant.heroId}
                        </span>
                      )}

                      <span className="shrink-0 text-[11px] text-[#D5C3A5]">
                        {participant.survived ? (isEn ? 'Survived' : 'Sống sót') : (isEn ? 'Fallen' : 'Tử trận')}
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
