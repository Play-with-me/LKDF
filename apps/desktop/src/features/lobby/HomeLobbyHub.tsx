import { Fragment, useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { GAME_BRAND, TIMER_PRESETS } from '@lkdf/shared';
import { LanguageToggle } from '../../components/ui/LanguageToggle.js';
import { CreditsLicensesModal } from '../../components/ui/CreditsLicensesModal.js';
import { GameIcon } from '../../components/icons/index.js';
import {
  ApiError,
  createApiClient,
  loadInitialClientState,
  normalizeServerUrl,
  parseSmartRoomInvite,
  saveClientStatePatch,
  type LkdfApiClient,
} from '../../lib/api.js';
import { isSteamBuildTarget } from '../../lib/buildTarget.js';
import type {
  LanHostStatus,
  LocalOfflineStats,
  RoomViewerPayload,
  TimerPreset,
  UserPreferences,
  UserProfile,
} from '../../lib/types.js';
import { useBackNavigation } from '../../lib/useBackNavigation.js';
import { LiveLobbyProfile } from './LiveLobbyProfile.js';
import { LobbySettings } from './LobbyProfile.js';
import { LobbyReference } from './LobbyReference.js';
import { MartialBackdropScene } from './MartialBackdropScene.js';
import './lobby-camp.css';

export interface ConnectedRoomTransition {
  readonly serverUrl: string;
  readonly sessionToken: string;
  readonly profile: UserProfile;
  readonly roomPayload: RoomViewerPayload;
}

export interface HomeLobbyHubProps {
  readonly ProfilePreview?: ComponentType<{
    readonly profile: UserProfile;
    readonly onProfileUpdated: (profile: UserProfile) => void;
  }>;
  readonly navigationActive?: boolean;
  readonly OnlinePreview?: ComponentType<{
    readonly control: string;
    readonly playerName: string;
  }>;
  readonly api: LkdfApiClient;
  readonly sessionToken: string | null;
  readonly profile: UserProfile;
  readonly clientDeviceId?: string;
  readonly localOfflineStats?: LocalOfflineStats;
  readonly lanHostStatus?: LanHostStatus | null;
  readonly onLanHostStatusChange?: (status: LanHostStatus) => void;
  readonly justLoggedIn: boolean;
  readonly onDismissWelcomeToast: () => void;
  readonly onProfileUpdated: (profile: UserProfile) => void;
  readonly onEnterRoom: (roomPayload: RoomViewerPayload) => void;
  readonly onEnterConnectedRoom?: (transition: ConnectedRoomTransition) => void;
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
  clientDeviceId,
  localOfflineStats,
  lanHostStatus,
  onLanHostStatusChange,
  justLoggedIn,
  onDismissWelcomeToast,
  onProfileUpdated,
  onEnterRoom,
  onEnterConnectedRoom,
  onOpenStats,
  onPlayOffline,
  onLoggedOut,
  onSessionInvalid,
}: HomeLobbyHubProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const isSamplePreview = profile.userId === 'dev_preview_user';
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>('STANDARD');
  const [inviteOrCodeInput, setInviteOrCodeInput] = useState<string>('');
  const [hostAddressInput, setHostAddressInput] = useState<string>('');
  const [isCheckingActiveRoom, setIsCheckingActiveRoom] = useState<boolean>(
    Boolean(sessionToken),
  );
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);
  const [isStoppingLan, setIsStoppingLan] = useState<boolean>(false);

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
        if (err instanceof ApiError && err.statusCode === 401 && !isSteamBuildTarget()) {
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

  async function resolveClientDeviceId(): Promise<string> {
    if (clientDeviceId && clientDeviceId.trim().length >= 8) {
      return clientDeviceId.trim();
    }
    const loaded = await loadInitialClientState();
    return loaded.clientDeviceId;
  }

  function resolveGuestDisplayName(): string {
    const clean = profile.displayName.trim().normalize('NFC');
    if (clean.length >= 2 && clean.length <= 20) {
      return clean;
    }
    return isEn ? 'Wanderer' : 'Hiệp Khách';
  }

  async function savePreferences(preferences: Partial<UserPreferences>) {
    if (!sessionToken) {
      onProfileUpdated({
        ...profile,
        preferences: { ...profile.preferences, ...preferences },
      });
      return;
    }

    const signal = AbortSignal.timeout(8000);
    try {
      if (preferencesOutcomeUncertain.current) {
        const confirmed = await api.getMe(sessionToken, signal);
        onProfileUpdated(confirmed);
        if (
          Object.entries(preferences).every(
            ([key, value]) =>
              confirmed.preferences[key as keyof UserPreferences] === value,
          )
        ) {
          preferencesOutcomeUncertain.current = false;
          return;
        }
      }

      const updated = await api.updatePreferences(sessionToken, preferences, signal);
      preferencesOutcomeUncertain.current = false;
      onProfileUpdated(updated);
    } catch (error) {
      if (isSteamBuildTarget()) {
        onProfileUpdated({
          ...profile,
          preferences: { ...profile.preferences, ...preferences },
        });
        return;
      }
      if (signal.aborted) {
        preferencesOutcomeUncertain.current = true;
        throw new Error(
          isEn
            ? 'Could not confirm saved preferences. Please retry to verify with the server.'
            : 'Chưa xác nhận được cài đặt đã lưu. Hãy thử lại để kiểm tra với máy chủ.',
        );
      }
      if (error instanceof ApiError && error.statusCode === 401) {
        onSessionInvalid(error.message);
      }
      throw error;
    }
  }

  async function saveDisplayName(displayName: string) {
    const cleanName = displayName.trim().normalize('NFC');
    await saveClientStatePatch({ localDisplayName: cleanName }).catch(() => undefined);

    if (!sessionToken) {
      onProfileUpdated({ ...profile, displayName: cleanName });
      return;
    }
    try {
      const updated = await api.updateDisplayName(sessionToken, cleanName);
      onProfileUpdated(updated);
    } catch (error) {
      if (isSteamBuildTarget()) {
        onProfileUpdated({ ...profile, displayName: cleanName });
        return;
      }
      if (error instanceof ApiError && error.statusCode === 401) {
        onSessionInvalid(error.message);
      }
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

  async function handleStopLanHost(): Promise<void> {
    const bridge = window.lkdfDesktop;
    if (!bridge?.stopLanHost || isStoppingLan) {
      return;
    }
    setIsStoppingLan(true);
    try {
      const stopped = await bridge.stopLanHost();
      onLanHostStatusChange?.(stopped);
    } catch {
      // Bỏ qua nếu máy chủ đã đóng
    } finally {
      setIsStoppingLan(false);
    }
  }

  async function handleCreateRoom(): Promise<void> {
    if (isCreatingRoom || isJoiningRoom) return;
    setCreateError(null);
    setJoinError(null);

    if (isSamplePreview) {
      setCreateError(
        isEn
          ? 'Please sign in to create a room.'
          : 'Hãy đăng nhập để tạo phòng chơi.',
      );
      return;
    }

    setIsCreatingRoom(true);
    try {
      const bridge = window.lkdfDesktop;
      if (bridge?.startLanHost) {
        const hostStatus = await bridge.startLanHost();
        onLanHostStatusChange?.(hostStatus);
        const targetServerUrl = normalizeServerUrl(
          hostStatus.localUrl ?? 'http://127.0.0.1:3001',
        );
        const targetApi = createApiClient(targetServerUrl);
        const deviceId = await resolveClientDeviceId();
        const guest = await targetApi.guestLogin({
          clientDeviceId: deviceId,
          displayName: resolveGuestDisplayName(),
        });
        await saveClientStatePatch({
          serverUrl: targetServerUrl,
          sessionToken: guest.sessionToken,
        });
        const existingRoom = await targetApi.getMyRoom(guest.sessionToken);
        const payload =
          existingRoom ??
          (await targetApi.createRoom(guest.sessionToken, selectedPreset));
        if (onEnterConnectedRoom) {
          onEnterConnectedRoom({
            serverUrl: targetServerUrl,
            sessionToken: guest.sessionToken,
            profile: guest.profile,
            roomPayload: payload,
          });
        } else {
          onEnterRoom(payload);
        }
        return;
      }

      const targetServerUrl = normalizeServerUrl(api.baseUrl);
      if (sessionToken) {
        try {
          const payload = await api.createRoom(sessionToken, selectedPreset);
          onEnterRoom(payload);
          return;
        } catch (err: unknown) {
          if (!(err instanceof ApiError && err.statusCode === 401)) {
            throw err;
          }
        }
      }

      const deviceId = await resolveClientDeviceId();
      const guest = await api.guestLogin({
        clientDeviceId: deviceId,
        displayName: resolveGuestDisplayName(),
      });
      await saveClientStatePatch({
        serverUrl: targetServerUrl,
        sessionToken: guest.sessionToken,
      });
      const existingRoom = await api.getMyRoom(guest.sessionToken);
      const payload =
        existingRoom ??
        (await api.createRoom(guest.sessionToken, selectedPreset));
      if (onEnterConnectedRoom) {
        onEnterConnectedRoom({
          serverUrl: targetServerUrl,
          sessionToken: guest.sessionToken,
          profile: guest.profile,
          roomPayload: payload,
        });
      } else {
        onEnterRoom(payload);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401 && !isSteamBuildTarget()) {
        onSessionInvalid(err.message);
        return;
      }
      setCreateError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to open LAN / VPN room.'
            : 'Không thể mở phòng đa máy (LAN / VPN).',
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleJoinRoom(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (isJoiningRoom || isCreatingRoom) return;
    setJoinError(null);
    setCreateError(null);

    if (isSamplePreview) {
      setJoinError(
        isEn ? 'Please sign in to join a room.' : 'Hãy đăng nhập để vào phòng chơi.',
      );
      return;
    }

    let parsedInvite: { readonly serverUrl: string; readonly roomCode: string } | null =
      null;
    try {
      parsedInvite = parseSmartRoomInvite(
        inviteOrCodeInput,
        hostAddressInput,
        api.baseUrl,
      );
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Invalid Host IP:Port address.'
            : 'Địa chỉ IP:Port của Chủ bàn không hợp lệ.',
      );
      return;
    }

    if (!parsedInvite) {
      setJoinError(
        isEn
          ? 'Paste a valid invite (e.g. 26.15.20.8:3001#K9M2P4) or a 6-character room code.'
          : 'Hãy dán chuỗi mời (VD: 26.15.20.8:3001#K9M2P4) hoặc nhập đúng mã phòng 6 ký tự.',
      );
      return;
    }

    setIsJoiningRoom(true);
    try {
      const { serverUrl: targetServerUrl, roomCode } = parsedInvite;
      const targetApi = createApiClient(targetServerUrl);
      const sameServer = normalizeServerUrl(api.baseUrl) === targetServerUrl;

      let activeToken = sameServer ? sessionToken : null;
      let activeProfile: UserProfile = profile;

      if (activeToken) {
        try {
          const myActive = await targetApi.getMyRoom(activeToken);
          const payload =
            myActive && myActive.roomState.roomCode === roomCode
              ? myActive
              : await targetApi.joinRoom(activeToken, roomCode);
          if (onEnterConnectedRoom) {
            onEnterConnectedRoom({
              serverUrl: targetServerUrl,
              sessionToken: activeToken,
              profile: activeProfile,
              roomPayload: payload,
            });
          } else {
            onEnterRoom(payload);
          }
          return;
        } catch (err: unknown) {
          if (!(err instanceof ApiError && err.statusCode === 401)) {
            throw err;
          }
          activeToken = null;
        }
      }

      const deviceId = await resolveClientDeviceId();
      const guest = await targetApi.guestLogin({
        clientDeviceId: deviceId,
        displayName: resolveGuestDisplayName(),
      });
      activeToken = guest.sessionToken;
      activeProfile = guest.profile;
      await saveClientStatePatch({
        serverUrl: targetServerUrl,
        sessionToken: activeToken,
      });

      const myActive = await targetApi.getMyRoom(activeToken);
      const payload =
        myActive && myActive.roomState.roomCode === roomCode
          ? myActive
          : await targetApi.joinRoom(activeToken, roomCode);
      if (onEnterConnectedRoom) {
        onEnterConnectedRoom({
          serverUrl: targetServerUrl,
          sessionToken: activeToken,
          profile: activeProfile,
          roomPayload: payload,
        });
      } else {
        onEnterRoom(payload);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401 && !isSteamBuildTarget()) {
        onSessionInvalid(err.message);
        return;
      }
      setJoinError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to connect to host room. Check Radmin/Tailscale/Wi-Fi IP and Firewall.'
            : 'Không kết nối được tới bàn của bạn bè. Hãy kiểm tra IP Radmin/Tailscale/Wi-Fi và Tường lửa.',
      );
    } finally {
      setIsJoiningRoom(false);
    }
  }

  const [lobbyScreen, setLobbyScreen] = useState<
    'menu' | 'settings' | (typeof LOBBY_SECTIONS)[number][0]
  >('menu');
  const menuRef = useRef<HTMLElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const lastMenuItem = useRef<
    'settings' | (typeof LOBBY_SECTIONS)[number][0] | null
  >(null);

  useEffect(() => {
    if (!lastMenuItem.current) return;
    if (lobbyScreen === 'menu') {
      menuRef.current
        ?.querySelector<HTMLButtonElement>(`[data-lobby-item="${lastMenuItem.current}"]`)
        ?.focus();
    } else {
      if (lobbyScreen === 'online' && !OnlinePreview) roomInputRef.current?.focus();
      else if (lobbyScreen !== 'online') backRef.current?.focus();
    }
  }, [lobbyScreen, OnlinePreview]);

  const control =
    'min-h-10 rounded border border-[#806345] bg-[#211913] px-3 text-sm text-[#F5EBD6] hover:border-[#C89B4B] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]';
  const settingsRef = useRef<{ requestBack: () => void }>(null);
  const backToMenu = () => {
    setCreateError(null);
    setJoinError(null);
    setLobbyScreen('menu');
  };
  const requestBack = () => {
    if (lobbyScreen === 'settings' && settingsRef.current) {
      settingsRef.current.requestBack();
    } else {
      backToMenu();
    }
  };
  useBackNavigation(navigationActive && lobbyScreen !== 'menu', requestBack);

  const [creditsOpen, setCreditsOpen] = useState(false);
  const hasDesktopLanHost = Boolean(window.lkdfDesktop?.startLanHost);

  return (
    <section
      data-live-session={sessionToken ? true : undefined}
      className="lkdf-lobby-camp relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
    >
      <div aria-hidden="true" className="lkdf-lobby-camp-art">
        <MartialBackdropScene />
      </div>
      {justLoggedIn ? (
        <div role="status" className="lkdf-lobby-camp-welcome">
          <span>{t('lobby.welcomeToast', { name: profile.displayName })}</span>
          <button type="button" onClick={onDismissWelcomeToast}>
            {t('lobby.dismissToast')}
          </button>
        </div>
      ) : null}
      <div
        className={`lkdf-lobby-camp-content ${lobbyScreen === 'reference' ? 'lkdf-lobby-reference-layout' : ''}`}
      >
        <div className="lkdf-lobby-camp-panel">
          <div className="w-full min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {lobbyScreen !== 'menu' ? (
                <button
                  ref={backRef}
                  type="button"
                  onClick={requestBack}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-sm text-sm text-[#DFCAA9] hover:text-[#FFF0DA] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                >
                  <span aria-hidden="true">‹</span> {t('common.backToMainMenu')}{' '}
                  <kbd className="rounded border border-[#806345] px-1 text-xs">Esc</kbd>
                </button>
              ) : (
                <span />
              )}
              <LanguageToggle />
            </div>
            {lobbyScreen === 'menu' ? (
              <>
                <span
                  className="lkdf-lobby-camp-seal font-serif-title"
                  aria-hidden="true"
                >
                  {GAME_BRAND.emblem}
                </span>
                <h1 className="lkdf-lobby-camp-title font-serif-title">
                  {t('brand.title')}
                </h1>
                <nav
                  ref={menuRef}
                  aria-label={t('lobby.mainMenuAria')}
                  className="lkdf-lobby-camp-menu"
                  onKeyDown={(event) => {
                    const direction =
                      event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowUp'
                          ? -1
                          : 0;
                    if (!direction) return;
                    const buttons = Array.from(
                      event.currentTarget.querySelectorAll('button'),
                    );
                    const index = buttons.findIndex(
                      (button) => button === event.target,
                    );
                    if (index < 0) return;
                    event.preventDefault();
                    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
                  }}
                >
                  {LOBBY_SECTIONS.map(([view, titleKey, descKey]) => {
                    const menuTitle =
                      view === 'online'
                        ? isEn
                          ? 'Play Multi-PC (LAN / VPN)'
                          : 'Chơi Đa Máy (LAN / VPN)'
                        : t(titleKey);
                    const menuDesc =
                      view === 'online'
                        ? isEn
                          ? '1-click host or paste IP:Port#Code for 4–8 friends (no Steam / Google needed)'
                          : 'Mở bàn 1 chạm hoặc dán mã mời 4–8 bạn bè qua Wi-Fi, Radmin VPN, Tailscale'
                        : t(descKey);
                    return (
                      <Fragment key={view}>
                        <button
                          type="button"
                          data-lobby-item={view}
                          onClick={() => {
                            lastMenuItem.current = view;
                            setLobbyScreen(view);
                          }}
                          data-primary={view === 'online' || undefined}
                          className="lkdf-lobby-camp-command"
                        >
                          <span className="lkdf-lobby-camp-copy min-w-0">
                            <strong>{menuTitle}</strong>
                            <small>{menuDesc}</small>
                          </span>
                        </button>
                        {view === 'online' && onPlayOffline ? (
                          <button
                            type="button"
                            data-lobby-item="offline"
                            onClick={onPlayOffline}
                            className="lkdf-lobby-camp-command"
                          >
                            <span className="lkdf-lobby-camp-copy min-w-0">
                              <strong>{t('lobby.playOfflineTitle')}</strong>
                              <small>{t('lobby.playOfflineDesc')}</small>
                            </span>
                          </button>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  <button
                    type="button"
                    data-lobby-item="settings"
                    className="lkdf-lobby-settings-entry"
                    onClick={() => {
                      lastMenuItem.current = 'settings';
                      setLobbyScreen('settings');
                    }}
                  >
                    <Settings size={20} aria-hidden="true" />
                    {t('common.settings')}
                  </button>
                </nav>
                <div className="mt-2.5 flex items-center justify-start">
                  <button
                    type="button"
                    data-testid="lobby-open-credits"
                    onClick={() => setCreditsOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-[#C7B393] transition-colors hover:text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                  >
                    <GameIcon name="scales" size={13} className="text-[#C89B4B]" />
                    <span>{t('credits.openBtn')}</span>
                  </button>
                </div>
                <CreditsLicensesModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
              </>
            ) : lobbyScreen === 'online' ? (
              OnlinePreview ? (
                <OnlinePreview control={control} playerName={profile.displayName} />
              ) : (
                <div className="lkdf-online-entry">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="!mb-0 font-serif-title">
                      {isEn
                        ? 'Multi-PC Table (LAN / Radmin / Tailscale)'
                        : 'Bàn Đa Máy (LAN / Radmin / Tailscale)'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#DFCAA9]">
                      <span className="inline-flex items-center gap-1.5 rounded border border-[#806345]/75 bg-[#1C1510]/90 px-2.5 py-1">
                        <GameIcon name="ui:user" size={12} className="text-[#E6BE6C]" />
                        <span>{isEn ? 'Name:' : 'Biệt danh:'}</span>
                        <strong className="text-[#F5EBD6]">{profile.displayName}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            lastMenuItem.current = 'profile';
                            setLobbyScreen('profile');
                          }}
                          className="ml-1 cursor-pointer text-[#E6BE6C] underline underline-offset-2 hover:text-[#FFF0DA]"
                        >
                          {isEn ? 'Rename' : 'Đổi tên'}
                        </button>
                      </span>
                      {lanHostStatus?.running && lanHostStatus.port ? (
                        <span className="inline-flex items-center gap-1.5 rounded border border-[#22C55E]/45 bg-[#0F261A]/90 px-2.5 py-1 text-[#A7E3B9]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                          <span className="font-mono-num">
                            {isEn
                              ? `LAN :${lanHostStatus.port}`
                              : `Máy chủ LAN :${lanHostStatus.port}`}
                          </span>
                          <button
                            type="button"
                            disabled={isStoppingLan}
                            onClick={() => void handleStopLanHost()}
                            className="ml-1 cursor-pointer text-[#FCA5A5] underline underline-offset-2 hover:text-[#FEE2E2]"
                          >
                            {isEn ? 'Stop' : 'Tắt'}
                          </button>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isCheckingActiveRoom ? (
                    <p
                      role="status"
                      className="mb-3 inline-flex items-center gap-2 text-sm text-[#E6BE6C]"
                    >
                      <GameIcon name="ui:loader" size={14} className="animate-spin" />
                      <span>{t('lobby.checkingRoom')}</span>
                    </p>
                  ) : null}

                  <div className="lkdf-online-grid">
                    {/* Thẻ Trái: Mở Phòng Làm Chủ Bàn (1 chạm) */}
                    <section
                      aria-label={
                        isEn
                          ? 'Host Multi-PC Room (LAN / VPN)'
                          : 'Mở Phòng Làm Chủ Bàn (LAN / VPN)'
                      }
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
                            <h3 className="font-serif-title">
                              {isEn
                                ? 'Host Multi-PC Table'
                                : 'Mở Phòng Làm Chủ Bàn'}
                            </h3>
                          </div>
                          <span className="lkdf-online-card-badge">
                            {t('lobby.playerCountBadge')}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#DFCAA9]">
                          {isEn
                            ? 'Starts a built-in LAN/VPN room in 1 click. Copy the IP:Port#Code from the waiting room for 3–7 friends.'
                            : 'Tự bật máy chủ nội bộ 1 chạm ngay trên máy bạn. Mở xong chỉ cần chép chuỗi IP:Port#Mã gửi Zalo/Discord cho 3–7 người bạn.'}
                        </p>
                        <div>
                          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E6BE6C]">
                            {t('lobby.tempoLabel')}
                          </span>
                          <div
                            className="lkdf-online-presets"
                            role="group"
                            aria-label={t('lobby.tempoLabel')}
                          >
                            {PRESET_CARDS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                aria-pressed={preset.id === selectedPreset}
                                onClick={() => setSelectedPreset(preset.id)}
                                className={`${control} flex flex-col items-center justify-center px-1.5 py-2 text-center aria-pressed:border-[#E6BE6C]`}
                              >
                                <span className="text-xs font-semibold">
                                  {t(preset.labelKey)}
                                </span>
                                <small className="font-mono-num tabular-nums">
                                  {t('lobby.secondsPerTurn', {
                                    seconds: TIMER_PRESETS[preset.id].mainTurnSeconds,
                                  })}
                                </small>
                              </button>
                            ))}
                          </div>
                        </div>
                        {hasDesktopLanHost ? (
                          <p className="text-[11px] leading-snug text-[#C9B393]">
                            {isEn
                              ? 'Tip: Click "Allow access" if Windows Firewall asks on first launch.'
                              : 'Mẹo: Lần đầu mở bàn, hãy bấm "Allow access" nếu Windows Firewall hỏi.'}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => void handleCreateRoom()}
                          disabled={isCreatingRoom || isJoiningRoom}
                          className="tqs-talisman-btn flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[#F2CF84]/75 px-4 text-sm font-bold text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <GameIcon name="castle" size={16} />
                          <span>
                            {isCreatingRoom
                              ? isEn
                                ? 'Opening LAN / VPN Room…'
                                : 'Đang mở bàn LAN / VPN…'
                              : isEn
                                ? 'Host Multi-PC Room (LAN / VPN)'
                                : 'Mở Phòng Đa Máy (LAN / VPN)'}
                          </span>
                        </button>
                        {createError ? (
                          <p role="alert" className="lkdf-online-error">
                            {createError}
                          </p>
                        ) : null}
                      </div>
                    </section>

                    {/* Thẻ Phải: Vào Bàn Bạn Bè (1 Chuỗi Mời Thông Minh) */}
                    <form
                      onSubmit={(e) => void handleJoinRoom(e)}
                      className="lkdf-online-card"
                      data-pending={isJoiningRoom}
                    >
                      <div className="space-y-2.5">
                        <div className="lkdf-online-card-header">
                          <div className="lkdf-online-card-title">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#806345]/80 bg-[#261C15] text-[#E6BE6C]"
                            >
                              <GameIcon name="ui:key" size={15} />
                            </span>
                            <h3 className="font-serif-title">
                              {isEn ? "Join Friend's Table" : 'Vào Bàn Bạn Bè'}
                            </h3>
                          </div>
                        </div>
                        <label
                          htmlFor="lobby-room-code"
                          className="block text-xs leading-relaxed text-[#DFCAA9]"
                        >
                          {isEn
                            ? 'Paste the full invite string (IP:Port#CODE) from your host, or enter Host IP + 6-char code separately.'
                            : 'Dán thẳng chuỗi mời 1 chạm từ Chủ bàn (IP:Port#MÃPHÒNG), hoặc nhập riêng IP Chủ bàn + Mã 6 ký tự.'}
                        </label>
                        <div>
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E6BE6C]">
                            {isEn
                              ? 'Smart Invite or Room Code'
                              : 'Chuỗi mời nhanh (IP:Port#Mã) hoặc Mã phòng'}
                          </span>
                          <input
                            ref={roomInputRef}
                            id="lobby-room-code"
                            maxLength={120}
                            value={inviteOrCodeInput}
                            autoComplete="off"
                            spellCheck={false}
                            readOnly={isJoiningRoom}
                            aria-invalid={Boolean(joinError)}
                            aria-describedby={joinError ? 'lobby-join-error' : undefined}
                            placeholder="26.15.20.8:3001#K9M2P4"
                            onChange={(event) => {
                              setInviteOrCodeInput(event.target.value);
                              setJoinError(null);
                            }}
                            className={`${control} font-mono-num w-full text-sm font-bold tracking-wide`}
                          />
                        </div>
                        {!inviteOrCodeInput.includes('#') ? (
                          <div>
                            <label
                              htmlFor="lobby-host-ip"
                              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#D5C3A5]"
                            >
                              {isEn
                                ? 'Host IP:Port (if entering 6-char code only)'
                                : 'Địa chỉ IP Chủ bàn (nếu chỉ nhập mã 6 ký tự)'}
                            </label>
                            <input
                              id="lobby-host-ip"
                              maxLength={80}
                              value={hostAddressInput}
                              autoComplete="off"
                              spellCheck={false}
                              readOnly={isJoiningRoom}
                              placeholder="26.15.20.8:3001 / 192.168.1.5:3001"
                              onChange={(event) => {
                                setHostAddressInput(event.target.value);
                                setJoinError(null);
                              }}
                              className={`${control} font-mono-num w-full text-xs`}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isJoiningRoom || isCreatingRoom}
                          className="lkdf-online-join flex min-h-11 w-full items-center justify-center gap-2"
                        >
                          <GameIcon name="ui:door-open" size={16} />
                          <span>
                            {isJoiningRoom
                              ? isEn
                                ? 'Connecting to Table…'
                                : 'Đang vào bàn…'
                              : isEn
                                ? 'Join Friend Table Now'
                                : 'Vào Bàn Ngay'}
                          </span>
                        </button>
                        {joinError ? (
                          <p
                            id="lobby-join-error"
                            role="alert"
                            className="lkdf-online-error"
                          >
                            {joinError}
                          </p>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </div>
              )
            ) : lobbyScreen === 'reference' ? (
              <LobbyReference control={control} />
            ) : lobbyScreen === 'settings' ? (
              <LobbySettings
                ref={settingsRef}
                profile={profile}
                onBack={backToMenu}
                onSavePreferences={savePreferences}
                onLogout={sessionToken ? handleLogout : undefined}
              />
            ) : ProfilePreview ? (
              <ProfilePreview profile={profile} onProfileUpdated={onProfileUpdated} />
            ) : (
              <LiveLobbyProfile
                key={profile.userId}
                api={api}
                profile={profile}
                hasSession={Boolean(sessionToken)}
                localOfflineStats={localOfflineStats}
                onOpenStats={onOpenStats}
                onSaveName={saveDisplayName}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
