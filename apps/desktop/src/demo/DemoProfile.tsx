import { useState } from 'react';
import type { UserProfile } from '../lib/types.js';
import zhaoYun from '../assets/art/heroes/zhao_yun.webp';
import caoCao from '../assets/art/heroes/cao_cao.webp';
import zhouYu from '../assets/art/heroes/zhou_yu.webp';
import { LobbyProfile, summarizeMonthlyResults, type LobbyRecord } from '../features/lobby/LobbyProfile.js';

interface DemoProfileProps {
  readonly profile: UserProfile;
  readonly onProfileUpdated: (profile: UserProfile) => void;
}

const monthlyDate = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
});

function currentVietnameseDate() {
  const parts = monthlyDate.formatToParts(new Date());
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: number('year'), month: number('month'), day: number('day') };
}

const SAMPLE_MATCHES = [
  { id: 1, hero: 'Triệu Vân', portrait: zhaoYun, role: 'Trung thần', won: true, date: '2026-11-21', durationSeconds: 90 },
  { id: 2, hero: 'Tào Tháo', portrait: caoCao, role: 'Chủ công', won: false, date: '2026-11-20', durationSeconds: 30 },
  { id: 3, hero: 'Chu Du', portrait: zhouYu, role: 'Phản tặc', won: true, date: '2026-10-19', durationSeconds: 1620 },
  { id: 4, hero: 'Triệu Vân', portrait: zhaoYun, role: 'Phản tặc', won: true, date: '2026-09-18', durationSeconds: 1320 },
] as const;

const RECORD_PREVIEW = new URLSearchParams(window.location.search).get('record');
const LONG_HISTORY = Array.from({ length: 20 }, (_, index) => ({
  ...SAMPLE_MATCHES[index % SAMPLE_MATCHES.length]!,
  id: index + 1,
  date: new Date(Date.UTC(2026, 10, 21 - index)).toISOString().slice(0, 10),
}));
const SCOPE_HISTORY = [42, 36, 32, 10].flatMap((count, offset) => {
  const { year, month, day } = currentVietnameseDate();
  const lastDay = offset === 0 ? day : new Date(Date.UTC(year, month - offset, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => ({
    ...SAMPLE_MATCHES[(index + offset) % SAMPLE_MATCHES.length]!,
    id: offset * 100 + index + 1,
    date: new Date(Date.UTC(year, month - 1 - offset, lastDay - Math.floor(index * lastDay / count))).toISOString().slice(0, 10),
    won: (index + offset) % (offset === 1 ? 2 : 3) !== 0,
  }));
});


export function DemoProfile({ profile, onProfileUpdated }: DemoProfileProps) {
  const [failed, setFailed] = useState(RECORD_PREVIEW === 'error');
  const matches = RECORD_PREVIEW === 'empty' ? []
    : RECORD_PREVIEW === 'scope' ? SCOPE_HISTORY
    : RECORD_PREVIEW === 'long' ? LONG_HISTORY
    : RECORD_PREVIEW === 'tie' ? [SAMPLE_MATCHES[0], SAMPLE_MATCHES[2]] : SAMPLE_MATCHES;
  const heroStats = new Map<string, LobbyRecord['topHeroes'][number]>();
  for (const match of matches) {
    const stats = heroStats.get(match.hero);
    heroStats.set(match.hero, {
      name: match.hero, portrait: match.portrait,
      wins: (stats?.wins ?? 0) + Number(match.won), played: (stats?.played ?? 0) + 1,
    });
  }
  const maxWins = Math.max(0, ...[...heroStats.values()].map(hero => hero.wins));
  const record: LobbyRecord = {
    played: matches.length, wins: matches.filter(match => match.won).length,
    topHeroes: [...heroStats.values()].filter(hero => maxWins > 0 && hero.wins === maxWins),
    monthlyResults: summarizeMonthlyResults(matches), recent: matches.slice(0, 20),
  };
  return <LobbyProfile profile={profile} record={failed ? null : record} sample status={failed ? 'error' : 'ready'}
    onRetry={() => setFailed(false)}
    onSaveName={async displayName => onProfileUpdated({ ...profile, displayName })} />;
}

