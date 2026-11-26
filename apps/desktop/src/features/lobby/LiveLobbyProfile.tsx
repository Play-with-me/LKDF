import { useEffect, useState } from 'react';
import { getCuuChauHeroDisplay, getCuuChauRoleDisplay, HeroIdSchema } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type {
  FilteredStatsResponse,
  LocalOfflineStats,
  UserProfile,
} from '../../lib/types.js';
import { LobbyProfile, summarizeMonthlyResults, type LobbyRecord } from './LobbyProfile.js';

const EMPTY_RECORD: LobbyRecord = {
  played: 0,
  wins: 0,
  topHeroes: [],
  monthlyResults: summarizeMonthlyResults([]),
  recent: [],
};

function toLocalLobbyRecord(
  offlineStats: LocalOfflineStats | undefined,
  locale: 'vi' | 'en',
): LobbyRecord {
  if (!offlineStats || offlineStats.played <= 0) {
    return {
      played: 0,
      wins: 0,
      topHeroes: [],
      monthlyResults: summarizeMonthlyResults([]),
      recent: [],
    };
  }

  const maxWins = Math.max(
    0,
    ...Object.values(offlineStats.byHero).map((hero) => hero.wins),
  );
  const topHeroes = Object.entries(offlineStats.byHero).flatMap(([id, stats]) => {
    if (maxWins === 0 || stats.wins !== maxWins) return [];
    const hero = HeroIdSchema.safeParse(id);
    return hero.success
      ? [
          {
            name: getCuuChauHeroDisplay(hero.data, locale)?.name ?? hero.data,
            portrait: getHeroPortraitUrl(hero.data),
            wins: stats.wins,
            played: stats.played,
          },
        ]
      : [];
  });

  const recent = offlineStats.recentMatches.slice(0, 20).map((match) => ({
    id: match.id,
    hero: getCuuChauHeroDisplay(match.heroId, locale)?.name ?? match.heroId,
    portrait: getHeroPortraitUrl(match.heroId),
    role: getCuuChauRoleDisplay(match.role, locale).name,
    won: match.won,
    date: match.finishedAt,
    durationSeconds: match.durationSeconds,
  }));

  return {
    played: offlineStats.played,
    wins: offlineStats.wins,
    monthlyResults: summarizeMonthlyResults(
      offlineStats.recentMatches.map((m) => ({ date: m.finishedAt, won: m.won })),
    ),
    topHeroes,
    recent,
  };
}

function toLobbyRecord(
  result: FilteredStatsResponse,
  userId: string,
  locale: 'vi' | 'en',
  offlineStats?: LocalOfflineStats,
): LobbyRecord {
  const { summary } = result;
  const combinedByHero: Record<string, { played: number; wins: number }> = {};
  for (const [id, entry] of Object.entries(summary.byHero)) {
    combinedByHero[id] = { played: entry.played, wins: entry.wins };
  }
  if (offlineStats && offlineStats.played > 0) {
    for (const [id, entry] of Object.entries(offlineStats.byHero)) {
      const prev = combinedByHero[id] ?? { played: 0, wins: 0 };
      combinedByHero[id] = {
        played: prev.played + entry.played,
        wins: prev.wins + entry.wins,
      };
    }
  }

  const maxWins = Math.max(
    0,
    ...Object.values(combinedByHero).map((hero) => hero.wins),
  );
  const serverRecent = (result.recentMatches ?? []).flatMap((match) => {
    const player = match.participants.find((member) => member.userId === userId);
    if (!player) return [];
    return [
      {
        id: match.matchId,
        hero:
          getCuuChauHeroDisplay(player.heroId, locale)?.name ?? player.heroId,
        portrait: getHeroPortraitUrl(player.heroId),
        role: getCuuChauRoleDisplay(player.identity, locale).name,
        won: player.isWinner,
        date: match.finishedAt,
        durationSeconds: match.durationSeconds,
      },
    ];
  });

  const seenIds = new Set(serverRecent.map((item) => String(item.id)));
  const offlineRecent = (offlineStats?.recentMatches ?? [])
    .filter((m) => !seenIds.has(m.id))
    .map((m) => ({
      id: m.id,
      hero: getCuuChauHeroDisplay(m.heroId, locale)?.name ?? m.heroId,
      portrait: getHeroPortraitUrl(m.heroId),
      role: getCuuChauRoleDisplay(m.role, locale).name,
      won: m.won,
      date: m.finishedAt,
      durationSeconds: m.durationSeconds,
    }));

  const mergedRecent = [...serverRecent, ...offlineRecent]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  let monthlyResults = result.monthlyResults ?? [];
  if (offlineStats && offlineStats.recentMatches.length > 0 && monthlyResults.length === 3) {
    const offlineMonthly = summarizeMonthlyResults(
      offlineStats.recentMatches.map((m) => ({ date: m.finishedAt, won: m.won })),
    );
    monthlyResults = monthlyResults.map((m) => {
      const extra = offlineMonthly.find((om) => om.month === m.month);
      return extra
        ? { month: m.month, wins: m.wins + extra.wins, losses: m.losses + extra.losses }
        : m;
    });
  }

  return {
    played: summary.totalAppearances + (offlineStats?.played ?? 0),
    wins: summary.totalWins + (offlineStats?.wins ?? 0),
    monthlyResults,
    topHeroes: Object.entries(combinedByHero).flatMap(([id, stats]) => {
      if (maxWins === 0 || stats.wins !== maxWins) return [];
      const hero = HeroIdSchema.safeParse(id);
      return hero.success
        ? [
            {
              name: getCuuChauHeroDisplay(hero.data, locale)?.name ?? hero.data,
              portrait: getHeroPortraitUrl(hero.data),
              wins: stats.wins,
              played: stats.played,
            },
          ]
        : [];
    }),
    recent: mergedRecent,
  };
}

interface LiveLobbyProfileProps {
  readonly api: LkdfApiClient;
  readonly profile: UserProfile;
  readonly hasSession: boolean;
  readonly localOfflineStats?: LocalOfflineStats | undefined;
  readonly onOpenStats?: (() => void) | undefined;
  readonly onSaveName: (displayName: string) => Promise<void>;
}

export function LiveLobbyProfile({
  api,
  profile,
  hasSession,
  localOfflineStats,
  onOpenStats,
  onSaveName,
}: LiveLobbyProfileProps) {
  const { i18n } = useTranslation();
  const locale: 'vi' | 'en' = i18n.language === 'en' ? 'en' : 'vi';
  const isSamplePreview = profile.userId === 'dev_preview_user';
  const [retry, setRetry] = useState(0);
  const [monthlyError, setMonthlyError] = useState(false);
  const [retryingMonthly, setRetryingMonthly] = useState(false);
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    rawResult: FilteredStatsResponse | null;
  }>({
    status: 'loading',
    rawResult: null,
  });
  const { userId } = profile;

  useEffect(() => {
    if (!hasSession) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
    setMonthlyError(false);
    setState((previous) =>
      previous.rawResult ? previous : { status: 'loading', rawResult: null },
    );
    void api
      .queryStats(
        { userId, includeMonthly: true, includeMatches: true, matchLimit: 20 },
        signal,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', rawResult: result });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMonthlyError(true);
        setState((previous) =>
          previous.rawResult ? previous : { status: 'error', rawResult: null },
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRetryingMonthly(false);
      });
    return () => controller.abort();
  }, [api, hasSession, retry, userId]);

  const computedRecord = isSamplePreview
    ? EMPTY_RECORD
    : hasSession
      ? state.rawResult
        ? toLobbyRecord(state.rawResult, userId, locale, localOfflineStats)
        : null
      : toLocalLobbyRecord(localOfflineStats, locale);

  return (
    <LobbyProfile
      profile={profile}
      onSaveName={onSaveName}
      sample={isSamplePreview}
      status={hasSession && !isSamplePreview ? state.status : 'ready'}
      record={computedRecord}
      onOpenStats={hasSession ? onOpenStats : undefined}
      retryingMonthly={retryingMonthly}
      monthlyError={monthlyError}
      onRetry={() => {
        if (state.rawResult) setRetryingMonthly(true);
        setRetry((attempt) => attempt + 1);
      }}
    />
  );
}
