import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../../components/ui/LanguageToggle.js';
import { useBackNavigation } from '../../lib/useBackNavigation.js';
import { Settings } from 'lucide-react';
import { LiveLobbyProfile } from './LiveLobbyProfile.js';
import { LobbySettings } from './LobbyProfile.js';
import { LobbyReference } from './LobbyReference.js';
import './lobby-camp.css';
import { GAME_BRAND, TIMER_PRESETS } from '@lkdf/shared';
import { MartialBackdropScene } from './MartialBackdropScene.js';
import { isSteamBuildTarget } from '../../lib/buildTarget.js';
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
  readonly onPlayOffline?: () => void;
  readonly onLoggedOut: (notice?: string) => void;
  readonly onSessionInvalid: (messageVi: string) => void;
}

const PRESET_CARDS: readonly {
  readonly id: TimerPreset;
  readonly labelKey: string;
}[] = [
  {
    id: 'FAST',
    labelKey: 'lobby.tempoFast',
  },
  {
    id: 'STANDARD',
    labelKey: 'lobby.tempoStandard',
  },
  {
    id: 'RELAXED',
    labelKey: 'lobby.tempoRelaxed',
  },
];

const LOBBY_SECTIONS = [
  ['online', 'lobby.playOnlineTitle', 'lobby.playOnlineDesc'],
  ['reference', 'lobby.referenceTitle', 'lobby.referenceDesc'],
  ['profile', 'lobby.profileTitle', 'lobby.profileDesc'],
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
  onPlayOffline,
  onLoggedOut,
  onSessionInvalid,
}: HomeLobbyHubProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
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
        throw new Error(
          isEn
            ? 'Could not confirm saved preferences. Please retry to verify with the server.'
            : 'Chưa xác nhận được cài đặt đã lưu. Hãy thử lại để kiểm tra với máy chủ.',
        );
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
        notice = isEn
          ? 'Signed out on this device. The server did not confirm session closure.'
          : 'Đã đăng xuất trên thiết bị này. Máy chủ chưa xác nhận đóng phiên.';
      }
    } finally {
      onLoggedOut(notice);
    }
  }

  async function handleCreateRoom(): Promise<void> {
    setCreateError(null);
    setJoinError(null);
    if (!sessionToken) {
      setCreateError(
        isSteamBuildTarget()
          ? t('lobby.steamLobbyHint')
          : isEn
            ? 'Please sign in to create a room.'
            : 'Hãy đăng nhập để tạo phòng chơi.',
      );
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
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to create a new room.'
            : 'Không thể tạo phòng mới.',
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
      setJoinError(
        isEn
          ? 'Room code must be exactly 6 letters or digits (e.g., K9M2P4).'
          : 'Mã phòng phải gồm đúng 6 ký tự chữ hoặc số (VD: K9M2P4).',
      );
      return;
    }
    if (!sessionToken) {
      setJoinError(isEn ? 'Please sign in to join a room.' : 'Hãy đăng nhập để vào phòng chơi.');
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
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to join this room.'
            : 'Không thể vào phòng chơi này.',
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
        <MartialBackdropScene />
      </div>
      {justLoggedIn ? (
        <div role="status" className="lkdf-lobby-camp-welcome">
          <span>{t('lobby.welcomeToast', { name: profile.displayName })}</span>
          <button type="button" onClick={onDismissWelcomeToast}>{t('lobby.dismissToast')}</button>
        </div>
      ) : null}
      <div className={`lkdf-lobby-camp-content ${lobbyScreen === 'reference' ? 'lkdf-lobby-reference-layout' : ''}`}>
        <div className="lkdf-lobby-camp-panel">
          <div className="w-full min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {lobbyScreen !== 'menu' ? (
                <button ref={backRef} type="button" onClick={requestBack}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-sm text-sm text-[#DFCAA9] hover:text-[#FFF0DA] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]">
                  <span aria-hidden="true">‹</span> {t('common.backToMainMenu')} <kbd className="rounded border border-[#806345] px-1 text-xs">Esc</kbd>
                </button>
              ) : <span />}
              <LanguageToggle />
            </div>
            {lobbyScreen === 'menu' ? (
              <>
                <span className="lkdf-lobby-camp-seal font-serif-title" aria-hidden="true">{GAME_BRAND.emblem}</span>
                <h1 className="lkdf-lobby-camp-title font-serif-title">{t('brand.title')}</h1>
                <nav ref={menuRef} aria-label={t('lobby.mainMenuAria')} className="lkdf-lobby-camp-menu"
                  onKeyDown={event => {
                    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
                    if (!direction) return;
                    const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
                    const index = buttons.findIndex(button => button === event.target);
                    if (index < 0) return;
                    event.preventDefault();
                    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
                  }}>
                  {LOBBY_SECTIONS.map(([view, titleKey, descKey]) => (
                    <Fragment key={view}>
                    <button type="button" data-lobby-item={view} onClick={() => {
                      lastMenuItem.current = view;
                      setLobbyScreen(view);
                    }}
                      data-primary={view === 'online' || undefined}
                      className="lkdf-lobby-camp-command">
                      <span className="lkdf-lobby-camp-copy min-w-0"><strong>{t(titleKey)}</strong><small>{t(descKey)}</small></span>
                    </button>
                    {view === 'online' && onPlayOffline ? (
                      <button type="button" data-lobby-item="offline" onClick={onPlayOffline} className="lkdf-lobby-camp-command">
                        <span className="lkdf-lobby-camp-copy min-w-0"><strong>{t('lobby.playOfflineTitle')}</strong><small>{t('lobby.playOfflineDesc')}</small></span>
                      </button>
                    ) : null}
                    </Fragment>
                  ))}
                  <button type="button" data-lobby-item="settings" className="lkdf-lobby-settings-entry"
                      onClick={() => {
                        lastMenuItem.current = 'settings';
                        setLobbyScreen('settings');
                      }}>
                      <Settings size={20} aria-hidden="true" />
                      {t('common.settings')}
                  </button>
                </nav>
              </>
            ) : lobbyScreen === 'online' ? OnlinePreview ? (
              <OnlinePreview control={control} playerName={profile.displayName} />
            ) : (
              <div className="lkdf-online-entry">
                <h2 className="font-serif-title">{t('lobby.playOnlineTitle')}</h2>
                {isCheckingActiveRoom ? (
                  <p role="status" className="mb-3 inline-flex items-center gap-2 text-sm text-[#E6BE6C]">
                    <GameIcon name="ui:loader" size={14} className="animate-spin" />
                    <span>{t('lobby.checkingRoom')}</span>
                  </p>
                ) : null}
                <div className="lkdf-online-grid">
                  {/* Thẻ Trái (Chính): Lập Phòng Mới */}
                  <section
                    aria-label={t('lobby.createRoomHeading')}
                    className="lkdf-online-card lkdf-online-card-primary"
                  >
                    <div className="space-y-3">
                      <div className="lkdf-online-card-header">
                        <div className="lkdf-online-card-title">
                          <span
                            aria-hidden="true"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#D4A451]/70 bg-gradient-to-b from-[#9E2B25] to-[#6E1A16] text-[#F9EED9]"
                          >
                            <GameIcon name="castle" size={16} />
                          </span>
                          <h3 className="font-serif-title">{t('lobby.createRoomHeading')}</h3>
                        </div>
                        <span className="lkdf-online-card-badge">{t('lobby.playerCountBadge')}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#DFCAA9]">
                        {t('lobby.createRoomDesc')}
                      </p>
                      <div>
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E6BE6C]">
                          {t('lobby.tempoLabel')}
                        </span>
                        <div className="lkdf-online-presets" role="group" aria-label={t('lobby.tempoLabel')}>
                          {PRESET_CARDS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={preset.id === selectedPreset}
                              onClick={() => setSelectedPreset(preset.id)}
                              className={`${control} flex flex-col items-center justify-center px-1.5 py-2 text-center aria-pressed:border-[#E6BE6C]`}
                            >
                              <span className="text-xs font-semibold">{t(preset.labelKey)}</span>
                              <small className="font-mono-num tabular-nums">
                                {t('lobby.secondsPerTurn', { seconds: TIMER_PRESETS[preset.id].mainTurnSeconds })}
                              </small>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCreateRoom}
                        disabled={isCreatingRoom || isJoiningRoom || isCheckingActiveRoom}
                        className="tqs-talisman-btn flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[#F2CF84]/75 px-4 text-sm font-bold text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <GameIcon name="castle" size={16} />
                        <span>
                          {isCreatingRoom ? t('lobby.creatingRoom') : t('lobby.createRoomCta')}
                        </span>
                      </button>
                      {createError ? (
                        <p role="alert" className="lkdf-online-error">
                          {createError}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {/* Thẻ Phải: Vào Phòng Bằng Mã Hổ Phù */}
                  <form
                    onSubmit={handleJoinRoom}
                    className="lkdf-online-card"
                    data-pending={isJoiningRoom}
                  >
                    <div className="space-y-3">
                      <div className="lkdf-online-card-header">
                        <div className="lkdf-online-card-title">
                          <span
                            aria-hidden="true"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#806345]/80 bg-[#261C15] text-[#E6BE6C]"
                          >
                            <GameIcon name="ui:key" size={15} />
                          </span>
                          <h3 className="font-serif-title">{t('lobby.joinRoomHeading')}</h3>
                        </div>
                      </div>
                      <label htmlFor="lobby-room-code" className="block text-xs leading-relaxed text-[#DFCAA9]">
                        {t('lobby.joinRoomDesc')}
                      </label>
                      <div>
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#D5C3A5]">
                          {t('lobby.roomCodeLabel')}
                        </span>
                        <input
                          ref={roomInputRef}
                          id="lobby-room-code"
                          maxLength={6}
                          value={roomCodeInput}
                          autoComplete="off"
                          readOnly={isJoiningRoom}
                          aria-invalid={Boolean(joinError && !/^[A-Z0-9]{6}$/.test(roomCodeInput))}
                          aria-describedby={joinError ? 'lobby-join-error' : undefined}
                          placeholder="K9M2P4"
                          onChange={(event) => {
                            setRoomCodeInput(event.target.value.replace(/\s+/g, '').toUpperCase());
                            setJoinError(null);
                          }}
                          className={`${control} lkdf-online-code font-mono-num w-full text-center text-base font-bold uppercase`}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isJoiningRoom || isCreatingRoom || isCheckingActiveRoom}
                        className="lkdf-online-join flex min-h-11 w-full items-center justify-center gap-2"
                      >
                        <GameIcon name="ui:door-open" size={16} />
                        <span>{isJoiningRoom ? t('lobby.joiningRoom') : t('lobby.joinRoomCta')}</span>
                      </button>
                      {joinError ? (
                        <p id="lobby-join-error" role="alert" className="lkdf-online-error">
                          {joinError}
                        </p>
                      ) : null}
                    </div>
                  </form>
                </div>
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
