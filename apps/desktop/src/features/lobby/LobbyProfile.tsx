import { GuofengPillSelect } from '../../components/ui/GuofengPillSelect.js';
import { readDevicePreference, writeDevicePreference, type DevicePreferenceKey } from '../../lib/devicePreferences.js';
import { useEffect, useImperativeHandle, useRef, useState, type Ref, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserPreferences, UserProfile } from '../../lib/types.js';
import './lobby-profile.css';

export interface LobbyRecord {
  readonly played: number;
  readonly wins: number;
  readonly topHeroes: readonly { readonly name: string; readonly portrait?: string | null; readonly wins: number; readonly played: number }[];
  readonly monthlyResults: readonly { readonly month: string; readonly wins: number; readonly losses: number }[];
  readonly recent: readonly {
    readonly id: string | number; readonly hero: string; readonly portrait?: string | null;
    readonly role: string; readonly won: boolean; readonly date: string; readonly durationSeconds: number;
  }[];
}

function formatDuration(seconds: number, isEn: boolean): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return isEn ? `${remainder}s` : `${remainder} giây`;
  if (isEn) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  return remainder ? `${minutes} phút ${remainder} giây` : `${minutes} phút`;
}

interface LobbyProfileProps {
  readonly record: LobbyRecord | null;
  readonly status: 'loading' | 'error' | 'ready';
  readonly sample?: boolean;
  readonly onRetry: () => void;
  readonly retryingMonthly?: boolean;
  readonly monthlyError?: boolean;
  readonly onOpenStats?: (() => void) | undefined;
  readonly onSaveName: (displayName: string) => Promise<void>;
  readonly profile: UserProfile;
}

interface LobbySettingsProps {
  readonly profile: UserProfile;
  readonly onSavePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  readonly onLogout?: (() => Promise<void>) | undefined;
  readonly onBack: () => void;
  readonly ref: Ref<{ requestBack: () => void }>;
}

export function LobbyProfile({ profile, record, status, sample, onRetry, retryingMonthly, monthlyError, onOpenStats, onSaveName }: LobbyProfileProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [savingName, setSavingName] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [nameError, setNameError] = useState('');
  const [saved, setSaved] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const restoreEditFocus = useRef(false);
  const initials = profile.displayName.trim().split(/\s+/).slice(-2)
    .map(word => Array.from(word)[0]).join('').toLocaleUpperCase('vi');
  useEffect(() => {
    if (editing) {
      nameInput.current?.select();
    } else if (restoreEditFocus.current) {
      restoreEditFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  function closeEditor() {
    restoreEditFocus.current = true;
    setEditing(false);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingName) return;
    const displayName = name.trim().normalize('NFC');
    if (displayName.length < 2 || displayName.length > 20) {
      setNameError(isEn ? 'Nickname must be 2 to 20 characters.' : 'Biệt danh cần từ 2 đến 20 ký tự.');
      nameInput.current?.focus();
      return;
    }
    setSavingName(true);
    try {
      await onSaveName(displayName);
      setSaved(true);
      closeEditor();
    } catch (error) {
      setNameError(
        error instanceof Error
          ? error.message
          : isEn
            ? 'Unable to save nickname. Please try again.'
            : 'Không thể lưu biệt danh. Hãy thử lại.',
      );
      nameInput.current?.focus();
    } finally {
      setSavingName(false);
    }
  }

  return (
    <section className="lkdf-lobby-profile" aria-labelledby="lobby-profile-title"
      onKeyDown={event => {
        if (event.key !== 'Escape' || !editing) return;
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (savingName) { event.preventDefault(); return; }
        event.preventDefault();
        closeEditor();
      }}>
      <h2 id="lobby-profile-title" className="font-serif-title">{isEn ? 'Profile' : 'Hồ sơ'}</h2>
      <div className="lkdf-lobby-profile-card">
        <header className="lkdf-lobby-profile-identity">
          <div className="lkdf-lobby-profile-avatar" data-monogram={!profile.avatarUrl || avatarFailed} aria-hidden="true">
            {profile.avatarUrl && !avatarFailed
              ? <img src={profile.avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
              : <span>{initials}</span>}
          </div>
          <div className="lkdf-lobby-profile-name">
            <strong data-saved={saved} className="font-serif-title">{profile.displayName}</strong>
            <div className="lkdf-lobby-profile-name-actions">
              <button ref={editButton} type="button" className="lkdf-lobby-profile-edit" disabled={editing} aria-expanded={editing}
                onClick={() => {
                  setName(profile.displayName);
                  setNameError('');
                  setSaved(false);
                  setEditing(true);
                }}>
                {isEn ? 'Rename' : 'Đổi biệt danh'}
              </button>
              <p className="lkdf-lobby-profile-feedback" role="status">
                {saved ? (isEn ? 'Nickname saved.' : 'Đã lưu biệt danh.') : null}
              </p>
            </div>
          </div>
        </header>
        {editing ? <form className="lkdf-lobby-profile-section lkdf-lobby-profile-editor" onSubmit={saveName}>
          <label htmlFor="lobby-profile-name">{isEn ? 'Change nickname' : 'Đổi biệt danh'}</label>
          <div className="lkdf-lobby-profile-row">
            <input ref={nameInput} id="lobby-profile-name" value={name} maxLength={20} readOnly={savingName}
              aria-describedby="lobby-profile-name-hint"
              aria-invalid={Boolean(nameError)}
              onChange={event => {
                setName(event.target.value);
                setNameError('');
              }} />
            <button type="submit" data-primary disabled={savingName || name.trim().normalize('NFC') === profile.displayName.normalize('NFC')}>
              {savingName ? (isEn ? 'Saving…' : 'Đang lưu…') : (isEn ? 'Save Name' : 'Lưu biệt danh')}
            </button>
            <button type="button" onClick={closeEditor} disabled={savingName}>{isEn ? 'Cancel' : 'Hủy'}</button>
          </div>
          <p id="lobby-profile-name-hint" role="status" data-error={Boolean(nameError)}>
            {nameError || (isEn ? '2 to 20 characters.' : 'Từ 2 đến 20 ký tự.')}
          </p>
        </form> : null}
        <LobbyBattleRecord record={record} status={status} sample={sample ?? false} onRetry={onRetry} retryingMonthly={retryingMonthly ?? false} monthlyError={monthlyError ?? false} />
        {onOpenStats && (
          <div className="lkdf-lobby-profile-section">
            <button type="button" data-profile-stats-trigger onClick={onOpenStats}>
              {isEn ? 'View Detailed Match Stats' : 'Xem thống kê chi tiết'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const RECORD_FILTERS = [
  { value: 'all', labelVi: 'Tất cả', labelEn: 'All' },
  { value: 'wins', labelVi: 'Thắng', labelEn: 'Wins' },
  { value: 'losses', labelVi: 'Thua', labelEn: 'Losses' },
] as const;

const historyDateVi = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
});

const historyDateEn = new Intl.DateTimeFormat('en-US', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
});

const monthlyDate = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
});

function currentVietnameseDate() {
  const parts = monthlyDate.formatToParts(new Date());
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: number('year'), month: number('month'), day: number('day') };
}

export function summarizeMonthlyResults(matches: readonly { readonly date: string; readonly won: boolean }[]) {
  const { year, month } = currentVietnameseDate();
  return [-2, -1, 0].map(offset => {
    const key = new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
    const played = matches.filter(match => match.date.startsWith(key));
    const wins = played.filter(match => match.won).length;
    return { month: key, wins, losses: played.length - wins };
  });
}

function LobbyMonthlyResults({ results }: { readonly results: LobbyRecord['monthlyResults'] }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const activeIndex = previewIndex ?? selectedIndex;
  const months = results.map(result => {
    const [year, month] = result.month.split('-');
    return { ...result, key: result.month, label: `${Number(month)}/${year}` };
  });
  if (months.length !== 3) return null;
  const activeMonth = months[activeIndex]!;
  const firstMonth = months[0]!;
  const lastMonth = months[2]!;
  const period = firstMonth.key.slice(0, 4) === lastMonth.key.slice(0, 4)
    ? `${firstMonth.label.split('/')[0]}–${lastMonth.label}`
    : `${firstMonth.label} – ${lastMonth.label}`;
  const periodCount = months.reduce((total, month) => total + month.wins + month.losses, 0);
  const peak = Math.max(3, ...months.flatMap(month => [month.wins, month.losses]));
  const step = Math.ceil(peak / 3);
  const ticks = [0, step, step * 2, step * 3];
  const x = (index: number) => 78 + index * 182;
  const y = (value: number) => 94 - value / (step * 3) * 78;
  const points = (result: 'wins' | 'losses') =>
    months.map((month, index) => `${x(index)},${y(month[result])}`).join(' ');

  return (
    <section className="lkdf-lobby-profile-monthly" aria-labelledby="lobby-profile-monthly-title">
      <div className="lkdf-lobby-profile-record-heading">
        <div className="lkdf-lobby-monthly-heading">
          <h4 id="lobby-profile-monthly-title" className="font-serif-title">{isEn ? 'Monthly Results' : 'Kết quả theo tháng'}</h4>
          <small className="font-mono-num tabular-nums">{period} · {periodCount} {isEn ? 'matches' : 'ván'}</small>
        </div>
          <p className="lkdf-lobby-monthly-summary font-mono-num tabular-nums" role="status">
            <span>{isEn ? activeMonth.label : `Tháng ${activeMonth.label}`}</span>
            <span data-series="win">{activeMonth.wins} {isEn ? 'wins' : 'thắng'}</span>
            <span data-series="loss">{activeMonth.losses} {isEn ? 'losses' : 'thua'}</span>
            {activeMonth.wins + activeMonth.losses === 0 && <span>{isEn ? 'No matches yet' : 'Chưa có ván'}</span>}
          </p>
      </div>
      <svg className="lkdf-lobby-monthly-chart" viewBox="0 0 520 122" role="group" aria-label={isEn ? 'Select month on match chart' : 'Chọn tháng trên đồ thị số ván'}>
        <defs>
          <pattern id="lobby-monthly-square-grid" x="52" y="16" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" className="lkdf-lobby-monthly-grid-line" />
          </pattern>
          <linearGradient id="lobby-monthly-plot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop className="lkdf-lobby-monthly-plot-top" />
            <stop offset="1" className="lkdf-lobby-monthly-plot-bottom" />
          </linearGradient>
        </defs>
        <rect x="52" y="16" width="416" height="78" fill="url(#lobby-monthly-plot)" />
        <rect x="52" y="16" width="416" height="78" fill="url(#lobby-monthly-square-grid)" className="lkdf-lobby-monthly-grid-frame" />
        <path className="lkdf-lobby-monthly-engraving" d="M49 26V13h13 M458 13h13v13 M49 84v13h13 M458 97h13V84" />
        <line key={activeIndex} x1={x(activeIndex)} x2={x(activeIndex)} y1="16" y2="94" className="lkdf-lobby-monthly-guide" />
        {ticks.map(tick => (
          <text key={tick} x="43" y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick}</text>
        ))}
        <text x="8" y="14">{isEn ? 'Games' : 'Ván'}</text>
        <g className="lkdf-lobby-monthly-series">
          <polyline points={points('wins')} className="lkdf-lobby-monthly-win" />
          <polyline points={points('losses')} className="lkdf-lobby-monthly-loss" />
          {months.map((month, index) => (
            <g key={month.key} className="lkdf-lobby-monthly-points" data-active={index === activeIndex}>
              <circle cx={x(index)} cy={y(month.wins)} r="5" className="lkdf-lobby-monthly-win-dot" />
              <rect x={x(index) - 2.5} y={y(month.losses) - 2.5} width="5" height="5" rx="1" className="lkdf-lobby-monthly-loss-dot" />
            </g>
          ))}
        </g>
        {months.map((month, index) => (
          <g key={month.key} className="lkdf-lobby-monthly-target" role="button" tabIndex={0}
            aria-label={isEn ? `${month.label}, ${month.wins} wins, ${month.losses} losses` : `Tháng ${month.label}, ${month.wins} thắng, ${month.losses} thua`}
            aria-pressed={index === selectedIndex}
            onPointerEnter={event => {
              if (event.pointerType === 'mouse' && !event.currentTarget.matches(':focus-visible')) setPreviewIndex(index);
            }}
            onPointerLeave={() => setPreviewIndex(null)}
            onClick={() => {
              setSelectedIndex(index);
              setPreviewIndex(null);
            }}
            onFocus={() => setPreviewIndex(null)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedIndex(index);
                setPreviewIndex(null);
              }
            }}>
            <rect className="lkdf-lobby-monthly-hit" x={x(index) - 48} y="13" width="96" height="108" />
            <rect className="lkdf-lobby-monthly-focus" x={x(index) - 46} y="98" width="92" height="23" rx="3" />
            <text x={x(index)} y="115" textAnchor="middle">{month.label}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function LobbyBattleRecord({ record, status, sample, onRetry, retryingMonthly, monthlyError }: {
  readonly record: LobbyRecord | null;
  readonly status: LobbyProfileProps['status'];
  readonly sample: boolean;
  readonly retryingMonthly: boolean;
  readonly monthlyError: boolean;
  readonly onRetry: () => void;
}) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [filter, setFilter] = useState<(typeof RECORD_FILTERS)[number]['value']>('all');
  const [scrollable, setScrollable] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const retried = useRef(false);
  const monthlyRetried = useRef(false);
  const monthlyRegion = useRef<HTMLDivElement>(null);
  const played = record?.played ?? 0;
  const wins = record?.wins ?? 0;
  const losses = played - wins;
  const recent = record?.recent ?? [];
  const topHeroes = record?.topHeroes ?? [];
  const winRate = played ? `${Math.round(wins / played * 100)}%` : '—';
  const visible = filter === 'all' ? recent : recent.filter(match => match.won === (filter === 'wins'));
  const visibleCount = visible.length;

  useEffect(() => {
    const region = history.current;
    const table = region?.firstElementChild;
    if (!region || !table) return;
    const measure = () => setScrollable(region.scrollHeight > region.clientHeight);
    region.scrollTop = 0;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    observer.observe(table);
    return () => observer.disconnect();
  }, [filter, visibleCount]);

  useEffect(() => {
    if (status === 'ready' && retried.current) {
      retried.current = false;
      historyHeading.current?.focus();
    }
  }, [status]);
  useEffect(() => {
    if (!monthlyRetried.current || retryingMonthly) return;
    monthlyRetried.current = false;
    if (record?.monthlyResults.length === 3) monthlyRegion.current?.focus();
  }, [record, retryingMonthly]);


  return (
    <section className="lkdf-lobby-profile-record" aria-labelledby="lobby-battle-record-title">
      <div className="lkdf-lobby-profile-record-heading">
        <h3 id="lobby-battle-record-title" className="font-serif-title">{isEn ? 'All-Time Career' : 'Tổng quan mọi thời điểm'}</h3>
        {sample && <small>{isEn ? 'Sample Data' : 'Dữ liệu mẫu'}</small>}
      </div>
      {status === 'loading' ? <p role="status">{isEn ? 'Loading stats…' : 'Đang tải thống kê…'}</p> : status === 'error' ? (
        <div className="lkdf-lobby-profile-history-message">
          <p role="alert">{isEn ? 'Unable to load stats and match history.' : 'Chưa tải được thống kê và lịch sử đấu.'}</p>
          <button type="button" onClick={() => { retried.current = true; onRetry(); }}>{isEn ? 'Retry' : 'Thử lại'}</button>
        </div>
      ) : <>
        <dl className="lkdf-lobby-profile-totals">
          <div><dt>{isEn ? 'Win Rate' : 'Tỷ lệ thắng'}</dt><dd className="font-mono-num tabular-nums">{winRate}</dd></div>
          <div><dt>{isEn ? 'Wins / Played' : 'Thắng / Ván đã đấu'}</dt><dd className="font-mono-num tabular-nums">{wins} / {played}</dd></div>
          <div><dt>{isEn ? 'Losses' : 'Thua'}</dt><dd className="font-mono-num tabular-nums">{losses}</dd></div>
        </dl>
        <div className="lkdf-lobby-profile-highlight">
          {topHeroes[0]?.portrait && <img src={topHeroes[0].portrait} alt="" />}
          <div>
            <span>
              {isEn ? 'Most Winning General' : 'Tướng thắng nhiều nhất'}
              {topHeroes.length > 1 ? (isEn ? ' · Tied' : ' · Đồng hạng') : ''}
            </span>
            {topHeroes.length ? topHeroes.map(stats => (
              <strong key={stats.name}>
                <span className="font-serif-title">{stats.name}</span>
                <span className="font-mono-num tabular-nums">
                  {isEn ? ` · ${stats.wins} wins / ${stats.played} games` : ` · ${stats.wins} thắng / ${stats.played} ván`}
                </span>
              </strong>
            )) : <strong>{isEn ? 'No data yet' : 'Chưa có dữ liệu'}</strong>}
          </div>
        </div>
        {record && (record.monthlyResults.length === 3
          ? <div ref={monthlyRegion} tabIndex={-1}><LobbyMonthlyResults results={record.monthlyResults} /></div>
          : <div className="lkdf-lobby-profile-history-message">
            <p role="status">
              {retryingMonthly
                ? isEn ? 'Loading monthly results…' : 'Đang tải kết quả theo tháng…'
                : monthlyError
                  ? isEn ? 'Connection failed while loading chart. Please retry.' : 'Không kết nối được để tải đồ thị. Hãy thử lại.'
                  : isEn ? 'Monthly results are not available from the server yet.' : 'Máy chủ chưa cung cấp kết quả theo tháng.'}
            </p>
            <button type="button" aria-disabled={retryingMonthly} onClick={() => {
              if (!retryingMonthly) {
                monthlyRetried.current = true;
                onRetry();
              }
            }}>{isEn ? 'Retry Chart' : 'Thử lại đồ thị'}</button>
          </div>)}
        <div className="lkdf-lobby-profile-record-heading">
          <h4 id="lobby-profile-history-title" ref={historyHeading} tabIndex={-1} className="font-serif-title">
            {isEn ? 'Recent Matches' : 'Ván gần đây'}
          </h4>
          {recent.length > 0 && (
            <div className="lkdf-lobby-profile-filters" role="group" aria-label={isEn ? 'Filter history by outcome' : 'Lọc lịch sử theo kết quả'}>
              {RECORD_FILTERS.map(option => (
                <button key={option.value} type="button" aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}>{isEn ? option.labelEn : option.labelVi}</button>
              ))}
            </div>
          )}
        </div>
        {recent.length > 0 && (
          <p className="lkdf-lobby-profile-history-count font-mono-num tabular-nums" role="status">
            {isEn ? `Showing ${visibleCount} / ${recent.length} recent matches` : `Hiện ${visibleCount} / ${recent.length} ván gần nhất`}
          </p>
        )}
        {visibleCount ? (
          <div ref={history} className="lkdf-lobby-profile-history lkdf-scroll" role="region" aria-labelledby="lobby-profile-history-title"
            tabIndex={scrollable ? 0 : undefined}>
            <table className="lkdf-lobby-profile-matches" aria-label={isEn ? 'Recent matches' : 'Các ván gần nhất'}>
              <thead>
                <tr>
                  <th scope="col">{isEn ? 'General' : 'Tướng'}</th>
                  <th scope="col">{isEn ? 'Role' : 'Thân phận'}</th>
                  <th scope="col">{isEn ? 'Date' : 'Thời điểm'}</th>
                  <th scope="col">{isEn ? 'Outcome' : 'Kết quả'}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(match => (
                  <tr key={match.id}>
                    <td><span className="lkdf-lobby-profile-match-hero">{match.portrait && <img src={match.portrait} alt="" loading="lazy" />}<strong className="font-serif-title">{match.hero}</strong></span></td>
                    <td>{match.role}</td>
                    <td className="font-mono-num tabular-nums">
                      <time dateTime={match.date}>{(isEn ? historyDateEn : historyDateVi).format(new Date(match.date))}</time>
                      <small>{formatDuration(match.durationSeconds, isEn)}</small>
                    </td>
                    <td><span data-won={match.won}>{match.won ? (isEn ? 'Victory' : 'Thắng') : (isEn ? 'Defeat' : 'Thua')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="lkdf-lobby-profile-history-message">
            {recent.length
              ? isEn ? 'No matches match this filter.' : 'Không có ván nào khớp bộ lọc.'
              : isEn ? 'This profile has no recorded matches yet.' : 'Hồ sơ này chưa có ván đấu được ghi nhận.'}
          </p>
        )}
      </>}
    </section>
  );
}

export function LobbySettings({ profile, onSavePreferences, onLogout, onBack, ref }: LobbySettingsProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [systemReduced, setSystemReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const windowsApp = Boolean(window.lkdfDesktop);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const [reduceMotion, setReduceMotion] = useState(() => readDevicePreference('reduceMotion'));
  const [taskbarFlash, setTaskbarFlash] = useState(() => readDevicePreference('taskbarFlash'));
  const [onboardingHints, setOnboardingHints] = useState(() => readDevicePreference('onboardingHints'));
  const [deviceError, setDeviceError] = useState<DevicePreferenceKey | null>(null);

  function changeDevicePreference(key: DevicePreferenceKey, enabled: boolean) {
    if (!writeDevicePreference(key, enabled)) {
      setDeviceError(key);
      return;
    }
    setDeviceError(null);
    if (key === 'reduceMotion') setReduceMotion(enabled);
    else if (key === 'taskbarFlash') setTaskbarFlash(enabled);
    else setOnboardingHints(enabled);
  }

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { soundEnabled } = profile.preferences;
  const musicEnabled = profile.preferences.musicEnabled ?? soundEnabled;

  useImperativeHandle(ref, () => ({
    requestBack() {
      if (!saving && !loggingOut) onBack();
    },
  }), [loggingOut, onBack, saving]);

  async function toggleSound(key: 'soundEnabled' | 'musicEnabled', current: boolean) {
    setSaving(true);
    setSaveError('');
    try {
      await onSavePreferences({ [key]: !current });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : isEn
            ? 'Unable to save audio settings.'
            : 'Không thể lưu cài đặt âm thanh.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="lkdf-lobby-profile lkdf-lobby-settings" aria-labelledby="lobby-settings-title">
      <h2 id="lobby-settings-title" className="font-serif-title">{isEn ? 'Game Settings' : 'Cài đặt game'}</h2>
      <div className="lkdf-lobby-profile-card lkdf-lobby-settings-card">
        <div className="lkdf-lobby-profile-section lkdf-lobby-settings-compact-row">
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <h3 id="lobby-profile-sound">{isEn ? 'Sound Effects' : 'Hiệu ứng âm thanh'}</h3>
            <button type="button" role="switch" aria-checked={soundEnabled} aria-labelledby="lobby-profile-sound"
              aria-disabled={saving || loggingOut}
              onClick={() => { if (!saving && !loggingOut) void toggleSound('soundEnabled', soundEnabled); }}>
              {soundEnabled ? (isEn ? 'On' : 'Đang bật') : (isEn ? 'Off' : 'Đang tắt')}
            </button>
          </div>
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <h3 id="lobby-profile-music">{isEn ? 'Background Music' : 'Nhạc nền'}</h3>
            <button type="button" role="switch" aria-checked={musicEnabled} aria-labelledby="lobby-profile-music"
              aria-disabled={saving || loggingOut}
              onClick={() => { if (!saving && !loggingOut) void toggleSound('musicEnabled', musicEnabled); }}>
              {musicEnabled ? (isEn ? 'On' : 'Đang bật') : (isEn ? 'Off' : 'Đang tắt')}
            </button>
          </div>
          <p>{isEn ? 'Master volume is controlled in Windows.' : 'Âm lượng chỉnh trong Windows.'}</p>
          <p className="lkdf-lobby-profile-audio-status" role="status" data-error={Boolean(saveError)}>
            {saveError || (saving ? (isEn ? 'Saving settings…' : 'Đang lưu cài đặt…') : '')}
          </p>
        </div>
        <div className="lkdf-lobby-profile-section lkdf-lobby-settings-compact-row">
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <label htmlFor="lobby-motion-mode">{isEn ? 'Motion' : 'Chuyển động'}</label>
            <GuofengPillSelect
              id="lobby-motion-mode"
              ariaLabel={isEn ? 'Motion' : 'Chuyển động'}
              value={reduceMotion ? 'reduce' : 'system'}
              className="min-w-[175px]"
              options={[
                { value: 'system', label: isEn ? 'Follow System' : 'Theo hệ thống' },
                { value: 'reduce', label: isEn ? 'Reduce Motion' : 'Giảm chuyển động' },
              ]}
              onChange={(nextValue) =>
                changeDevicePreference('reduceMotion', nextValue === 'reduce')
              }
            />
          </div>
          {!reduceMotion && (
            <p>
              {isEn
                ? `System preference is currently ${systemReduced ? 'reduced motion' : 'standard motion'}.`
                : `Hệ thống đang ${systemReduced ? 'giảm chuyển động' : 'cho phép chuyển động'}.`}
            </p>
          )}
          {deviceError === 'reduceMotion' && (
            <p role="alert" data-error="true">
              {isEn ? 'Could not save motion preference on this device.' : 'Không lưu được tùy chọn chuyển động trên thiết bị này.'}
            </p>
          )}
          <p>{isEn ? 'Lobby backdrop, transitions & card animations · Saved on device' : 'Nền sảnh, chuyển cảnh và lá bài · Lưu trên thiết bị'}</p>
        </div>
        <div className="lkdf-lobby-profile-section lkdf-lobby-settings-compact-row">
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <label id="lobby-taskbar-label" htmlFor="lobby-taskbar-switch">{isEn ? 'Taskbar Flash' : 'Nháy thanh tác vụ'}</label>
            <button id="lobby-taskbar-switch" type="button" role="switch" aria-checked={taskbarFlash}
              aria-labelledby="lobby-taskbar-label"
              onClick={() => changeDevicePreference('taskbarFlash', !taskbarFlash)}>
              {taskbarFlash ? (isEn ? 'On' : 'Đang bật') : (isEn ? 'Off' : 'Đang tắt')}
            </button>
          </div>
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <label id="lobby-onboarding-label" htmlFor="lobby-onboarding-switch">{isEn ? 'Beginner Tips' : 'Gợi ý tân thủ'}</label>
            <button id="lobby-onboarding-switch" type="button" role="switch" aria-checked={onboardingHints}
              aria-labelledby="lobby-onboarding-label"
              onClick={() => changeDevicePreference('onboardingHints', !onboardingHints)}>
              {onboardingHints ? (isEn ? 'On' : 'Đang bật') : (isEn ? 'Off' : 'Đang tắt')}
            </button>
          </div>
          <p>
            {windowsApp
              ? isEn
                ? 'Turn alerts and in-match tips · Saved on device'
                : 'Nhắc lượt và gợi ý trong trận · Lưu trên thiết bị'
              : isEn
                ? 'Turn alerts and in-match tips · Flashing runs on Windows app only'
                : 'Nhắc lượt và gợi ý trong trận · Nháy chỉ chạy trên Windows'}
          </p>
          {deviceError === 'taskbarFlash' && (
            <p role="alert" data-error="true">
              {isEn ? 'Could not save taskbar flash preference on this device.' : 'Không lưu được tùy chọn nháy thanh tác vụ trên thiết bị này.'}
            </p>
          )}
          {deviceError === 'onboardingHints' && (
            <p role="alert" data-error="true">
              {isEn ? 'Could not save beginner tips preference on this device.' : 'Không lưu được tùy chọn gợi ý tân thủ trên thiết bị này.'}
            </p>
          )}
        </div>
        <div className="lkdf-lobby-profile-section lkdf-lobby-settings-compact-row">
          <div className="lkdf-lobby-profile-row lkdf-lobby-profile-sound">
            <div className="lkdf-lobby-settings-account">
              <strong>{profile.displayName}</strong>
              {onLogout && profile.email && <p>{profile.email}</p>}
            </div>
            <button type="button" disabled={!onLogout || loggingOut || saving} onClick={async () => {
              if (!onLogout) return;
              setLoggingOut(true);
              try { await onLogout(); } finally { setLoggingOut(false); }
            }}>{loggingOut ? (isEn ? 'Signing out…' : 'Đang đăng xuất…') : (isEn ? 'Sign Out' : 'Đăng xuất')}</button>
          </div>
          {!onLogout && <p>{isEn ? 'Sample account · Sign in to enable Sign Out.' : 'Tài khoản mẫu · Đăng nhập để dùng Đăng xuất.'}</p>}
        </div>
      </div>
    </section>
  );
}
