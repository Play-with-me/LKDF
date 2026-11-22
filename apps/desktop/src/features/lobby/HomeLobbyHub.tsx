import { useBackNavigation } from '../../lib/useBackNavigation.js';
import { Settings } from 'lucide-react';
import { LiveLobbyProfile } from './LiveLobbyProfile.js';
import { LobbySettings } from './LobbyProfile.js';
import { LobbyReference } from './LobbyReference.js';
import './lobby-camp.css';
import { RedCliffsScene } from './red-cliffs/RedCliffsScene.js';
import { TIMER_PRESETS } from '@lkdf/shared';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type {
  RoomViewerPayload,
  TimerPreset,
  UserProfile,
  UserPreferences,
} from '../../lib/types.js';

export interface HomeLobbyHubProps {
  readonly ProfilePreview?: ComponentType<{ readonly profile: UserProfile; readonly onProfileUpdated: (profile: UserProfile) => void }>;
  readonly navigationActive?: boolean;
  readonly OnlinePreview?: ComponentType<{ readonly control: string; readonly playerName: string }>;
  readonly api: LkdfApiClient;
  readonly sessionToken: string | null;
  readonly profile: UserProfile;
  readonly justLoggedIn: boolean;
  readonly onDismissWelcomeToast: () => void;
  readonly onProfileUpdated: (profile: UserProfile) => void;
  readonly onEnterRoom: (roomPayload: RoomViewerPayload) => void;
  readonly onOpenStats?: () => void;
  readonly onLoggedOut: (notice?: string) => void;
  readonly onSessionInvalid: (messageVi: string) => void;
}

const PRESET_CARDS: readonly {
  readonly id: TimerPreset;
  readonly label: string;
}[] = [
  {
    id: 'FAST',
    label: 'Nhanh',
  },
  {
    id: 'STANDARD',
    label: 'Chuẩn',
  },
  {
    id: 'RELAXED',
    label: 'Thong thả',
  },
];



const LOBBY_SECTIONS = [
  ['online', 'Chơi online', 'Phòng riêng 4–8 người'],
  ['reference', 'Tra cứu', 'Tướng, lá bài và thân phận'],
  ['profile', 'Hồ sơ', 'Biệt danh và chiến tích'],
] as const;

export function HomeLobbyHub({
  OnlinePreview,
  navigationActive = true,
  ProfilePreview,
  api,
  sessionToken,
  profile,
  justLoggedIn,
  onDismissWelcomeToast,
  onProfileUpdated,
  onEnterRoom,
  onOpenStats,
  onLoggedOut,
  onSessionInvalid,
}: HomeLobbyHubProps) {
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>('STANDARD');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [isCheckingActiveRoom, setIsCheckingActiveRoom] = useState<boolean>(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);



  useEffect(() => {
    if (!justLoggedIn) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onDismissWelcomeToast();
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [justLoggedIn, onDismissWelcomeToast]);

  useEffect(() => {
    if (!sessionToken) {
      setIsCheckingActiveRoom(false);
      return;
    }
    let active = true;
    setIsCheckingActiveRoom(true);

    void (async () => {
      try {
        const myRoom = await api.getMyRoom(sessionToken);
        if (!active) {
          return;
        }
        if (myRoom) {
          onEnterRoom(myRoom);
          return;
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError && err.statusCode === 401) {
          onSessionInvalid(err.message);
          return;
        }
      } finally {
        if (active) {
          setIsCheckingActiveRoom(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [api, onEnterRoom, onSessionInvalid, sessionToken]);

  const preferencesOutcomeUncertain = useRef(false);

  async function savePreferences(preferences: Partial<UserPreferences>) {
    if (!sessionToken) {
      onProfileUpdated({ ...profile, preferences: { ...profile.preferences, ...preferences } });
      return;
    }

    const signal = AbortSignal.timeout(8000);
    try {
      if (preferencesOutcomeUncertain.current) {
        const confirmed = await api.getMe(sessionToken, signal);
        onProfileUpdated(confirmed);
        if (Object.entries(preferences).every(([key, value]) =>
          confirmed.preferences[key as keyof UserPreferences] === value)) {
          preferencesOutcomeUncertain.current = false;
          return;
        }
      }

      const updated = await api.updatePreferences(sessionToken, preferences, signal);
      preferencesOutcomeUncertain.current = false;
      onProfileUpdated(updated);
    } catch (error) {
      if (signal.aborted) {
        preferencesOutcomeUncertain.current = true;
        throw new Error('Chưa xác nhận được cài đặt đã lưu. Hãy thử lại để kiểm tra với máy chủ.');
      }
      if (error instanceof ApiError && error.statusCode === 401) onSessionInvalid(error.message);
      throw error;
    }
  }

  async function saveDisplayName(displayName: string) {
    if (!sessionToken) {
      onProfileUpdated({ ...profile, displayName });
      return;
    }
    try {
      onProfileUpdated(await api.updateDisplayName(sessionToken, displayName));
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) onSessionInvalid(error.message);
      throw error;
    }
  }

  async function handleLogout(): Promise<void> {
    if (!sessionToken) {
      window.location.assign(window.location.pathname);
      return;
    }
    let notice: string | undefined;
    try {
      await api.logout(sessionToken, AbortSignal.timeout(8000));
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'INVALID_SESSION')) {
        notice = 'Đã đăng xuất trên thiết bị này. Máy chủ chưa xác nhận đóng phiên.';
      }
    } finally {
      onLoggedOut(notice);
    }
  }

  async function handleCreateRoom(): Promise<void> {
    setCreateError(null);
    setJoinError(null);
    if (!sessionToken) {
      setCreateError('Hãy đăng nhập để tạo phòng chơi.');
      return;
    }
    setIsCreatingRoom(true);
    try {
      const payload = await api.createRoom(sessionToken, selectedPreset);
      onEnterRoom(payload);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setCreateError(
        err instanceof Error ? err.message : 'Không thể tạo phòng mới.',
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleJoinRoom(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (isJoiningRoom || isCreatingRoom || isCheckingActiveRoom) return;
    setJoinError(null);
    setCreateError(null);
    const normalized = roomCodeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setJoinError('Mã phòng phải gồm đúng 6 ký tự chữ hoặc số (VD: K9M2P4).');
      return;
    }
    if (!sessionToken) {
      setJoinError('Hãy đăng nhập để vào phòng chơi.');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const payload = await api.joinRoom(sessionToken, normalized);
      onEnterRoom(payload);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setJoinError(
        err instanceof Error ? err.message : 'Không thể vào phòng chơi này.',
      );
    } finally {
      setIsJoiningRoom(false);
    }
  }

  const [lobbyScreen, setLobbyScreen] = useState<'menu' | 'settings' | typeof LOBBY_SECTIONS[number][0]>('menu');
  const menuRef = useRef<HTMLElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const lastMenuItem = useRef<'settings' | typeof LOBBY_SECTIONS[number][0] | null>(null);

  useEffect(() => {
    if (!lastMenuItem.current) return;
    if (lobbyScreen === 'menu') {
      menuRef.current?.querySelector<HTMLButtonElement>(`[data-lobby-item="${lastMenuItem.current}"]`)?.focus();
    } else {
      if (lobbyScreen === 'online' && !OnlinePreview) roomInputRef.current?.focus();
      else if (lobbyScreen !== 'online') backRef.current?.focus();
    }
  }, [lobbyScreen, OnlinePreview]);

  const control = 'min-h-10 rounded border border-[#806345] bg-[#211913] px-3 text-sm text-[#F5EBD6] hover:border-[#C89B4B] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]';
  const settingsRef = useRef<{ requestBack: () => void }>(null);
  const backToMenu = () => {
    setCreateError(null);
    setJoinError(null);
    setLobbyScreen('menu');
  };
  const requestBack = () => {
    if (lobbyScreen === 'settings' && settingsRef.current) settingsRef.current.requestBack();
    else backToMenu();
  };
  useBackNavigation(navigationActive && lobbyScreen !== 'menu', requestBack);

  return (
    <section data-live-session={sessionToken ? true : undefined}
      className="lkdf-lobby-camp relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <div aria-hidden="true" className="lkdf-lobby-camp-art">
        <RedCliffsScene />
      </div>
      {justLoggedIn ? (
        <div role="status" className="lkdf-lobby-camp-welcome">
          <span>Đã đăng nhập với biệt danh {profile.displayName}</span>
          <button type="button" onClick={onDismissWelcomeToast}>Ẩn thông báo</button>
        </div>
      ) : null}
      <div className={`lkdf-lobby-camp-content ${lobbyScreen === 'reference' ? 'lkdf-lobby-reference-layout' : ''}`}>
        <div className="lkdf-lobby-camp-panel">
          <div className="w-full">
            {lobbyScreen !== 'menu' ? (
              <button ref={backRef} type="button" onClick={requestBack}
                className="mb-4 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-sm text-sm text-[#DFCAA9] hover:text-[#FFF0DA] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]">
                <span aria-hidden="true">‹</span> Về menu chính <kbd className="rounded border border-[#806345] px-1 text-xs">Esc</kbd>
              </button>
            ) : null}
            {lobbyScreen === 'menu' ? (
              <>
                <span className="lkdf-lobby-camp-seal font-serif-title" aria-hidden="true">殺</span>
                <h1 className="lkdf-lobby-camp-title font-serif-title">Tam Quốc Sát</h1>
                <nav ref={menuRef} aria-label="Menu chính" className="lkdf-lobby-camp-menu"
                  onKeyDown={event => {
                    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
                    if (!direction) return;
                    const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
                    const index = buttons.findIndex(button => button === event.target);
                    if (index < 0) return;
                    event.preventDefault();
                    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
                  }}>
                  {LOBBY_SECTIONS.map(([view, label, detail]) => (
                    <button key={view} type="button" data-lobby-item={view} onClick={() => {
                      lastMenuItem.current = view;
                      setLobbyScreen(view);
                    }}
                      data-primary={view === 'online' || undefined}
                      className="lkdf-lobby-camp-command">
                      <span className="lkdf-lobby-camp-copy"><strong>{label}</strong><small>{detail}</small></span>
                    </button>
                  ))}
                  <button type="button" data-lobby-item="settings" className="lkdf-lobby-settings-entry"
                      onClick={() => {
                        lastMenuItem.current = 'settings';
                        setLobbyScreen('settings');
                      }}>
                      <Settings size={20} aria-hidden="true" />
                      Cài đặt
                  </button>
                </nav>
              </>
            ) : lobbyScreen === 'online' ? OnlinePreview ? (
              <OnlinePreview control={control} playerName={profile.displayName} />
            ) : (
              <div className="lkdf-online-entry">
                <h2 className="font-serif-title text-[clamp(24px,3vw,42px)] font-bold leading-tight text-[#F5EBD6]">Chơi online</h2>
                {isCheckingActiveRoom ? <p role="status" className="mt-2 text-sm">Đang kiểm tra phòng đang chơi…</p> : null}
                <form onSubmit={handleJoinRoom} className="lkdf-online-panel" data-pending={isJoiningRoom}>
                  <h3 className="font-serif-title">Vào phòng bằng mã</h3>
                  <label htmlFor="lobby-room-code" className="lkdf-online-hint">Dán mã 6 ký tự bạn nhận được.</label>
                  <div className="lkdf-online-code-row">
                    <input ref={roomInputRef} id="lobby-room-code" value={roomCodeInput} autoComplete="off" readOnly={isJoiningRoom} aria-invalid={Boolean(joinError && !/^[A-Z0-9]{6}$/.test(roomCodeInput))} aria-describedby={joinError ? 'lobby-join-error' : undefined}
                      placeholder="K9M2P4" onChange={event => {
                        setRoomCodeInput(event.target.value.replace(/\s+/g, '').toUpperCase());
                        setJoinError(null);
                      }} className={`${control} lkdf-online-code font-mono-num`} />
                    <button disabled={isJoiningRoom || isCreatingRoom || isCheckingActiveRoom} className="lkdf-online-join">{isJoiningRoom ? 'Đang vào…' : 'Vào phòng'}</button>
                  </div>
                  {joinError ? <p id="lobby-join-error" role="alert" className="lkdf-online-error">{joinError}</p> : null}
                </form>
                <details className="lkdf-online-create">
                  <summary className="cursor-pointer rounded-sm text-sm text-[#DFCAA9] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]">
                    Tạo phòng
                  </summary>
                  <div className="lkdf-online-presets">
                    {PRESET_CARDS.map(preset => (
                      <button key={preset.id} type="button" aria-pressed={preset.id === selectedPreset}
                        onClick={() => setSelectedPreset(preset.id)} className={`${control} px-1.5 aria-pressed:border-[#E6BE6C]`}>
                        {preset.label}<small>{TIMER_PRESETS[preset.id].mainTurnSeconds} giây/lượt</small>
                      </button>
                    ))}
                  </div>
                <button type="button" onClick={handleCreateRoom} disabled={isCreatingRoom || isJoiningRoom || isCheckingActiveRoom}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded border border-[#BE9360] bg-[#9E2B25] px-4 text-sm font-bold text-[#FFF0DA] hover:bg-[#B7372E] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]">
                  <GameIcon name="castle" size={16} /> {isCreatingRoom ? 'Đang mở phòng…' : 'Tạo phòng 4–8 người'}
                </button>
                {createError ? <p role="alert" className="mt-2 text-sm text-[#FFB4A8]">{createError}</p> : null}
                </details>
              </div>
            ) : lobbyScreen === 'reference' ? (
              <LobbyReference control={control} />
            ) : lobbyScreen === 'settings' ? (
              <LobbySettings ref={settingsRef} profile={profile} onBack={backToMenu} onSavePreferences={savePreferences}
                onLogout={sessionToken ? handleLogout : undefined} />
            ) : ProfilePreview ? (
              <ProfilePreview profile={profile} onProfileUpdated={onProfileUpdated} />
            ) : (
              <LiveLobbyProfile key={profile.userId} api={api} profile={profile} hasSession={Boolean(sessionToken)} onOpenStats={onOpenStats} onSaveName={saveDisplayName} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
