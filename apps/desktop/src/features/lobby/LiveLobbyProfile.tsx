import { useEffect, useState } from 'react';
import { HERO_BY_ID, HeroIdSchema } from '@lkdf/shared';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type { FilteredStatsResponse, IdentityRole, UserProfile } from '../../lib/types.js';
import { LobbyProfile, summarizeMonthlyResults, type LobbyRecord } from './LobbyProfile.js';

const ROLE_LABELS: Record<IdentityRole, string> = {
  LORD: 'Chủ công', LOYALIST: 'Trung thần', REBEL: 'Phản tặc', SPY: 'Nội gián',
};
const EMPTY_RECORD: LobbyRecord = { played: 0, wins: 0, topHeroes: [], monthlyResults: summarizeMonthlyResults([]), recent: [] };

function toLobbyRecord(result: FilteredStatsResponse, userId: string): LobbyRecord {
  const { summary } = result;
  const maxWins = Math.max(0, ...Object.values(summary.byHero).map(hero => hero.wins));
  return {
    played: summary.totalAppearances,
    wins: summary.totalWins,
    monthlyResults: result.monthlyResults ?? [],
    topHeroes: Object.entries(summary.byHero).flatMap(([id, stats]) => {
      if (maxWins === 0 || stats.wins !== maxWins) return [];
      const hero = HeroIdSchema.safeParse(id);
      return hero.success ? [{
        name: HERO_BY_ID[hero.data].nameVi, portrait: getHeroPortraitUrl(hero.data),
        wins: stats.wins, played: stats.played,
      }] : [];
    }),
    recent: (result.recentMatches ?? []).flatMap(match => {
      const player = match.participants.find(member => member.userId === userId);
      if (!player) return [];
      return [{
        id: match.matchId, hero: HERO_BY_ID[player.heroId].nameVi, portrait: getHeroPortraitUrl(player.heroId),
        role: ROLE_LABELS[player.identity], won: player.isWinner, date: match.finishedAt,
        durationSeconds: match.durationSeconds,
      }];
    }),
  };
}

interface LiveLobbyProfileProps {
  readonly api: LkdfApiClient;
  readonly profile: UserProfile;
  readonly hasSession: boolean;
  readonly onOpenStats?: (() => void) | undefined;
  readonly onSaveName: (displayName: string) => Promise<void>;
}

export function LiveLobbyProfile({ api, profile, hasSession, onOpenStats, onSaveName }: LiveLobbyProfileProps) {
  const [retry, setRetry] = useState(0);
  const [monthlyError, setMonthlyError] = useState(false);
  const [retryingMonthly, setRetryingMonthly] = useState(false);
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; record: LobbyRecord | null }>({
    status: 'loading', record: null,
  });
  const { userId } = profile;
  useEffect(() => {
    if (!hasSession) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
    setMonthlyError(false);
    setState(previous => previous.record ? previous : { status: 'loading', record: null });
    void api.queryStats({ userId, includeMonthly: true, includeMatches: true, matchLimit: 20 }, signal)
      .then(result => {
        if (!controller.signal.aborted) setState({ status: 'ready', record: toLobbyRecord(result, userId) });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMonthlyError(true);
        setState(previous => previous.record ? previous : { status: 'error', record: null });
      })
      .finally(() => { if (!controller.signal.aborted) setRetryingMonthly(false); });
    return () => controller.abort();
  }, [api, hasSession, retry, userId]);

  return <LobbyProfile profile={profile} onSaveName={onSaveName}
    sample={!hasSession} status={hasSession ? state.status : 'ready'} record={hasSession ? state.record : EMPTY_RECORD}
    onOpenStats={hasSession ? onOpenStats : undefined}
    retryingMonthly={retryingMonthly}
    monthlyError={monthlyError}
    onRetry={() => {
      if (state.record) setRetryingMonthly(true);
      setRetry(attempt => attempt + 1);
    }} />;
}
