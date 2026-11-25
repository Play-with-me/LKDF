import { useGameAmbience } from './lib/useGameAmbience.js';
import { useInterfaceSounds } from './lib/useInterfaceSounds.js';
import { useBackNavigation } from './lib/useBackNavigation.js';
import { prefersReducedMotion } from './lib/devicePreferences.js';
import './features/lobby/lobby-online.css';
import type { PlayerCount } from '@lkdf/shared';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FirstTimeNicknameCard } from './features/auth/FirstTimeNicknameCard.js';
import { LoginScreen } from './features/auth/LoginScreen.js';
import { GameIcon } from './components/icons/index.js';
import { ServerWakeScreen } from './features/auth/ServerWakeScreen.js';
import { LOBBY_PREVIEW_PROFILE } from './features/lobby/lobbyPreviewProfile.js';
import { HomeLobbyHub } from './features/lobby/HomeLobbyHub.js';
import { WaitingRoomScreen } from './features/lobby/WaitingRoomScreen.js';
import { OfflineMatchSetup } from './features/match/OfflineMatchSetup.js';
import { MatchScreen } from './features/match/MatchScreen.js';
import { StatsPage } from './features/stats/StatsPage.js';
import { UpdateModal } from './features/update/UpdateModal.js';
import { getUiAssetUrl } from './lib/assetCatalog.js';
import {
  ApiError,
  DEFAULT_SERVER_URL,
  createApiClient,
  loadInitialClientState,
  saveClientStatePatch,
} from './lib/api.js';
import type {
  DesktopUpdateState,
  HealthCheckResponse,
  RoomViewerPayload,
  UserProfile,
} from './lib/types.js';

const DevMatchPreviewLazy = lazy(() =>
  import('./features/match/DevMatchPreview.js').then((mod) => ({
    default: mod.DevMatchPreview,
  })),
);

function createIdleUpdateState(currentVersion: string): DesktopUpdateState {
  return {
    phase: 'IDLE',
    currentVersion,
    latestVersion: null,
    releaseName: null,
    releaseNotes: '',
    publishedAt: null,
    installerName: null,
    installerSizeBytes: null,
    downloadPath: null,
    percent: null,
    transferredBytes: null,
    totalBytes: null,
    bytesPerSecond: null,
    canAutoInstall: false,
    manualDownloadSavedPath: null,
    messageVi: null,
  };
}

function readDevPreviewSeatsFromUrl(): PlayerCount | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get('devPreviewSeats');
  const num = Number(raw);
  if (num === 4 || num === 5 || num === 6 || num === 7 || num === 8) {
    return num;
  }
  return null;
}

function readDevPreviewModeFromUrl(): 'nickname' | 'wake' | 'home' | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get('devPreview');
  if (raw === 'nickname' || raw === 'wake' || raw === 'home') {
    return raw;
  }
  return null;
}


type AppScreen =
  | 'BOOT'
  | 'WAKE'
  | 'LOGIN'
  | 'NICKNAME_SETUP'
  | 'HOME'
  | 'WAITING_ROOM'
  | 'MATCH'
  | 'DEV_PREVIEW'
  | 'STATS';

export function App() {
  const initialDevSeats = readDevPreviewSeatsFromUrl();
  const initialDevPreviewMode = readDevPreviewModeFromUrl();
  const isLobbyPreview = initialDevPreviewMode === 'home';
  const [appVersion, setAppVersion] = useState<string>('0.1.0');
  const [screen, setScreen] = useState<AppScreen>(
    initialDevSeats !== null
      ? 'DEV_PREVIEW'
      : initialDevPreviewMode === 'nickname'
        ? 'NICKNAME_SETUP'
        : initialDevPreviewMode === 'wake'
          ? 'WAKE'
          : isLobbyPreview ? 'HOME' : 'BOOT',
  );
  const [devPreviewSeats, setDevPreviewSeats] = useState<PlayerCount>(
    initialDevSeats ?? 8,
  );
  const lobbyRef = useRef<HTMLDivElement>(null);
  const restoreProfileFocus = useRef(false);
  const [statsReturnScreen, setStatsReturnScreen] = useState<'LOGIN' | 'HOME'>('LOGIN');

  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(
    initialDevPreviewMode === 'nickname' || isLobbyPreview ? LOBBY_PREVIEW_PROFILE : null,
  );
  const [offlineMode, setOfflineMode] = useState<PlayerCount | 'setup' | null>(null);
  const openOfflineSetup = useCallback(() => setOfflineMode('setup'), []);
  const closeOffline = useCallback(() => setOfflineMode(null), []);
  const restoreAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      restoreAbortRef.current?.abort();
    };
  }, []);
  const [showMatchCrossing, setShowMatchCrossing] = useState(false);
  const effectsEnabled = profile?.preferences.soundEnabled ?? false;
  const musicEnabled = profile?.preferences.musicEnabled ?? effectsEnabled;
  const lobbyMusicActive = offlineMode === null && musicEnabled &&
    (screen === 'HOME' || screen === 'WAITING_ROOM');
  useInterfaceSounds(
    effectsEnabled && offlineMode === null && screen !== 'DEV_PREVIEW',
    lobbyMusicActive || (musicEnabled && screen === 'MATCH'),
  );
  useGameAmbience(lobbyMusicActive ? 0.23 : 0);
  const [activeRoom, setActiveRoom] = useState<RoomViewerPayload | null>(null);
  const [justLoggedIn, setJustLoggedIn] = useState<boolean>(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<DesktopUpdateState>(() =>
    createIdleUpdateState('0.1.0'),
  );
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const checkedUpdateServerRef = useRef<string | null>(null);

  const api = useMemo(() => createApiClient(serverUrl), [serverUrl]);

  useEffect(() => {
    let active = true;
    const bridge = window.lkdfDesktop;

    if (bridge) {
      void bridge
        .getAppVersion()
        .then((version) => {
          if (active) {
            setAppVersion(version);
          }
        })
        .catch(() => {
          // Giữ phiên bản mặc định nếu cầu IPC chưa phản hồi
        });
    }

    void loadInitialClientState()
      .then((initialState) => {
        if (!active) {
          return;
        }
        setServerUrl(initialState.serverUrl);
        setSessionToken(initialState.sessionToken);
        if (initialDevSeats === null && initialDevPreviewMode === null) {
          setScreen('WAKE');
        }
      })
      .catch(() => {
        if (active && initialDevSeats === null && initialDevPreviewMode === null) {
          setScreen('WAKE');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }
    return bridge.onUpdateStatus((next) => {
      setUpdateState(next);
      if (
        next.phase === 'AVAILABLE' ||
        next.phase === 'DOWNLOADING' ||
        next.phase === 'INSTALLING'
      ) {
        setIsUpdateModalOpen(true);
      }
    });
  }, []);

  const runUpdateCheck = useCallback(
    async (options: {
      readonly silentIfUpToDate: boolean;
      readonly forceRefresh?: boolean;
    }): Promise<void> => {
      const bridge = window.lkdfDesktop;
      if (!options.silentIfUpToDate) {
        setUpdateState((prev) => ({
          ...prev,
          currentVersion: appVersion,
          phase: 'CHECKING',
          messageVi: null,
        }));
        setIsUpdateModalOpen(true);
      }

      if (bridge) {
        try {
          const next = await bridge.checkForUpdates(
            serverUrl,
            Boolean(options.forceRefresh),
          );
          setUpdateState(next);
          if (next.phase === 'AVAILABLE') {
            setIsUpdateModalOpen(true);
          } else if (!options.silentIfUpToDate) {
            setIsUpdateModalOpen(true);
          }
        } catch (err: unknown) {
          if (!options.silentIfUpToDate) {
            setUpdateState((prev) => ({
              ...prev,
              phase: 'ERROR',
              messageVi:
                err instanceof Error
                  ? err.message
                  : 'Không thể kiểm tra cập nhật mới.',
            }));
            setIsUpdateModalOpen(true);
          }
        }
        return;
      }

      try {
        const res = await api.getLatestUpdate(appVersion, options.forceRefresh);
        if (res.configured && res.hasRelease && res.updateAvailable) {
          setUpdateState({
            ...createIdleUpdateState(appVersion),
            phase: 'AVAILABLE',
            latestVersion: res.latestVersion,
            releaseName: res.releaseName,
            releaseNotes: res.releaseNotes,
            publishedAt: res.publishedAt,
            installerName: res.primaryInstaller?.name ?? null,
            installerSizeBytes: res.primaryInstaller?.size ?? null,
            downloadPath: res.primaryInstaller?.downloadPath ?? null,
            canAutoInstall: false,
          });
          setIsUpdateModalOpen(true);
          return;
        }

        const msg =
          res.messageVi ??
          `Bạn đang dùng phiên bản mới nhất (v${appVersion}).`;
        setUpdateState({
          ...createIdleUpdateState(appVersion),
          phase: 'UP_TO_DATE',
          latestVersion: res.latestVersion,
          releaseName: res.releaseName,
          releaseNotes: res.releaseNotes,
          publishedAt: res.publishedAt,
          messageVi: msg,
        });
        if (!options.silentIfUpToDate) {
          setIsUpdateModalOpen(true);
        }
      } catch (err: unknown) {
        if (!options.silentIfUpToDate) {
          setUpdateState({
            ...createIdleUpdateState(appVersion),
            phase: 'ERROR',
            messageVi:
              err instanceof Error
                ? err.message
                : 'Không thể kiểm tra bản cập nhật mới từ máy chủ.',
          });
          setIsUpdateModalOpen(true);
        }
      }
    },
    [api, appVersion, serverUrl],
  );

  useEffect(() => {
    if (!health || screen === 'DEV_PREVIEW') {
      return;
    }
    if (checkedUpdateServerRef.current === serverUrl) {
      return;
    }
    checkedUpdateServerRef.current = serverUrl;
    void runUpdateCheck({ silentIfUpToDate: true });
  }, [health, runUpdateCheck, screen, serverUrl]);

  const handleStartOneClickUpdate = useCallback(() => {
    const bridge = window.lkdfDesktop;
    if (bridge) {
      void bridge.startOneClickUpdate(serverUrl);
      return;
    }
    if (updateState.downloadPath) {
      const targetUrl = `${api.baseUrl}${updateState.downloadPath.startsWith('/') ? '' : '/'}${updateState.downloadPath}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setUpdateState((prev) => ({
        ...prev,
        phase: 'DOWNLOADED',
        percent: 100,
        messageVi:
          'Đã mở liên kết tải bộ cài trực tiếp từ máy chủ cập nhật. Hãy chạy tệp vừa tải về để cài đặt.',
      }));
    }
  }, [api.baseUrl, serverUrl, updateState.downloadPath]);

  const handleInstallUpdateNow = useCallback(() => {
    const bridge = window.lkdfDesktop;
    if (bridge) {
      void bridge.quitAndInstallUpdate();
    }
  }, []);

  const handleServerUrlChange = useCallback(async (nextUrl: string) => {
    checkedUpdateServerRef.current = null;
    const saved = await saveClientStatePatch({ serverUrl: nextUrl });
    setServerUrl(saved.serverUrl);
    setHealth(null);
  }, []);

  const handleServerReady = useCallback(
    (nextHealth: HealthCheckResponse) => {
      setHealth(nextHealth);
      if (!sessionToken) {
        setScreen('LOGIN');
        return;
      }

      restoreAbortRef.current?.abort();
      const controller = new AbortController();
      restoreAbortRef.current = controller;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 8000);

      setIsRestoringSession(true);
      void api
        .getMe(sessionToken, controller.signal)
        .then((userProfile) => {
          if (restoreAbortRef.current !== controller) {
            return;
          }
          setProfile(userProfile);
          setJustLoggedIn(false);
          setLoginNotice(null);
          setScreen('HOME');
        })
        .catch((err: unknown) => {
          if (restoreAbortRef.current !== controller) {
            return;
          }
          if (err instanceof ApiError && err.statusCode === 401) {
            void saveClientStatePatch({ sessionToken: null }).catch(() => undefined);
            setSessionToken(null);
            setProfile(null);
            setLoginNotice(
              'Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại bằng Google.',
            );
            setScreen('LOGIN');
            return;
          }
          setLoginNotice(
            timedOut
              ? 'Máy chủ phản hồi chậm khi khôi phục phiên. Vui lòng đăng nhập lại hoặc Chơi với Máy.'
              : err instanceof Error
                ? err.message
                : 'Không thể khôi phục phiên đăng nhập. Vui lòng đăng nhập lại hoặc Chơi với Máy.',
          );
          setScreen('LOGIN');
        })
        .finally(() => {
          window.clearTimeout(timeoutId);
          if (restoreAbortRef.current === controller) {
            restoreAbortRef.current = null;
            setIsRestoringSession(false);
          }
        });
    },
    [api, sessionToken],
  );

  const handleLoggedIn = useCallback(
    (token: string, userProfile: UserProfile, isNewUser?: boolean) => {
      setSessionToken(token);
      setProfile(userProfile);
      setJustLoggedIn(true);
      setLoginNotice(null);
      setScreen(isNewUser ? 'NICKNAME_SETUP' : 'HOME');
    },
    [],
  );

  const handleCompleteNicknameSetup = useCallback(
    (updatedProfile: UserProfile) => {
      setProfile(updatedProfile);
      setJustLoggedIn(true);
      if (import.meta.env.DEV && initialDevPreviewMode === 'nickname' && !sessionToken) {
        setProfile(null);
        setScreen('WAKE');
        return;
      }
      setScreen('HOME');
    },
    [initialDevPreviewMode, sessionToken],
  );

  const handleSessionInvalid = useCallback((messageVi: string) => {
    void saveClientStatePatch({ sessionToken: null }).catch(() => undefined);
    setSessionToken(null);
    setProfile(null);
    setActiveRoom(null);
    setJustLoggedIn(false);
    setLoginNotice(messageVi);
    setScreen('LOGIN');
  }, []);

  const handleLoggedOut = useCallback((notice?: string) => {
    void saveClientStatePatch({ sessionToken: null }).catch(() => undefined);
    setSessionToken(null);
    setProfile(null);
    setActiveRoom(null);
    setJustLoggedIn(false);
    setLoginNotice(notice ?? null);
    setScreen('LOGIN');
  }, []);

  const handleRecheckServer = useCallback(() => {
    setHealth(null);
    setScreen('WAKE');
  }, []);

  const handleOpenStatsFrom = useCallback((from: 'LOGIN' | 'HOME') => {
    setStatsReturnScreen(from);
    setScreen('STATS');
  }, []);

  const handleEnterRoom = useCallback((roomPayload: RoomViewerPayload) => {
    setActiveRoom(roomPayload);
    setScreen(
      roomPayload.roomState.status === 'IN_GAME' ? 'MATCH' : 'WAITING_ROOM',
    );
  }, []);

  const handleMatchStarted = useCallback((roomPayload: RoomViewerPayload) => {
    setShowMatchCrossing(!prefersReducedMotion());
    setActiveRoom(roomPayload);
    setScreen('MATCH');
  }, []);

  const handleReturnToLobby = useCallback((roomPayload: RoomViewerPayload) => {
    setActiveRoom(roomPayload);
    setScreen('WAITING_ROOM');
  }, []);

  const handleLeftRoom = useCallback(() => {
    setActiveRoom(null);
    setScreen('HOME');
  }, []);

  const lobbyBannerUrl = getUiAssetUrl('lobby-banner');
  const campBackdropUrl = getUiAssetUrl('camp-zhanhuo');
  const headerBgUrl = getUiAssetUrl('tex-header-black');
  const isHomeLobby = screen === 'HOME';
  const backFromStats = useCallback(() => {
    restoreProfileFocus.current = statsReturnScreen === 'HOME';
    setScreen(statsReturnScreen);
  }, [statsReturnScreen]);
  useBackNavigation(offlineMode === null && screen === 'STATS' && !isUpdateModalOpen, backFromStats);
  useEffect(() => {
    if (!isHomeLobby || !restoreProfileFocus.current) return;
    restoreProfileFocus.current = false;
    lobbyRef.current?.querySelector<HTMLButtonElement>('[data-profile-stats-trigger]')?.focus();
  }, [isHomeLobby]);
  const isLobbySurface = screen !== 'MATCH' && screen !== 'DEV_PREVIEW';
  const isAuthPortalScreen =
    !isRestoringSession &&
    ((screen === 'LOGIN' && Boolean(health)) ||
      (screen === 'NICKNAME_SETUP' && Boolean(profile)));

  if (offlineMode !== null) {
    return (
      <main className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]"
        style={offlineMode === 'setup' ? { backgroundImage: `linear-gradient(#09080799, #090807df), url("${lobbyBannerUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {offlineMode === 'setup' ? <OfflineMatchSetup onStart={setOfflineMode} onBack={closeOffline} /> : (
          <Suspense fallback={<div role="status" className="m-auto">Đang chuẩn bị ván tập…</div>}>
            <DevMatchPreviewLazy offline initialPlayerCount={offlineMode} onExitPreview={closeOffline} />
          </Suspense>
        )}
      </main>
    );
  }

  return (
    <main className="relative flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      {isLobbySurface && !isAuthPortalScreen && !isHomeLobby ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {lobbyBannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url(${lobbyBannerUrl})` }}
            />
          ) : null}
          {campBackdropUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-22 mix-blend-screen"
              style={{ backgroundImage: `url(${campBackdropUrl})` }}
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 75% 75% at 50% 45%, rgba(16,13,10,0.45) 0%, rgba(9,8,7,0.88) 76%, #070605 100%)',
            }}
          />
        </div>
      ) : null}

      {isLobbySurface && !isAuthPortalScreen && !(isHomeLobby && isLobbyPreview) ? (
        <header
          style={
            headerBgUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(14,17,24,0.68), rgba(10,13,19,0.85)), url(${headerBgUrl})`,
                  backgroundSize: '100% 100%',
                }
              : undefined
          }
          className="relative z-10 flex h-11 shrink-0 items-center justify-between border-b border-[#94A3B8]/28 bg-[#10141B] px-5"
        >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-[#D4A451]/75 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] font-serif-title text-[13px] font-bold text-[#F8EFDF] shadow-inner">
            殺
          </span>
          {isHomeLobby ? (
            <span className="truncate font-serif-title text-base font-semibold tracking-wide text-[#F4EBD8]">
              Tam Quốc Sát
            </span>
          ) : (
            <h1 className="truncate font-serif-title text-base font-semibold tracking-wide text-[#F4EBD8]">
              Tam Quốc Sát
            </h1>
          )}
          {activeRoom && screen === 'WAITING_ROOM' ? (
            <span className="hidden rounded border border-[#B89352]/45 bg-[#12161E] px-2 py-0.5 font-mono-num text-xs text-[#E6BE6C] sm:inline-block">
              Phòng #{activeRoom.roomState.roomCode}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {profile ? (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-[#E2E8F0] md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              {profile.displayName}
            </span>
          ) : null}

          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
              health ? 'text-[#A7E3B9]' : 'text-[#FDE68A]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                health ? 'bg-[#22C55E]' : 'bg-[#D97706]'
              }`}
            />
            {health ? 'Máy chủ sẵn sàng' : 'Đang kết nối'}
          </span>

          {updateState.phase === 'AVAILABLE' && updateState.latestVersion ? (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-[#E6BE6C] bg-[#B8332C] px-3 py-1 font-mono-num text-[11px] font-semibold tabular-nums text-[#F4EFE6] shadow transition-colors hover:bg-[#C83E37]"
            >
              <GameIcon name="ui:download" size={12} />
              Có bản v{updateState.latestVersion}
            </button>
          ) : (
            <button
              type="button"
              disabled={!health}
              title={
                health
                  ? 'Kiểm tra phiên bản cập nhật mới'
                  : 'Chờ kết nối máy chủ để kiểm tra cập nhật'
              }
              onClick={() => {
                void runUpdateCheck({
                  silentIfUpToDate: false,
                  forceRefresh: true,
                });
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-[#94A3B8]/32 bg-[#12161E]/90 px-2.5 py-0.5 font-mono-num text-xs tabular-nums text-[#D8DEE9] transition-colors hover:border-[#E6BE6C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GameIcon name="ui:refresh" size={11} />
              v{appVersion}
            </button>
          )}
        </div>
      </header>
      ) : null}

      <div className="relative z-10 flex flex-1 min-h-0 min-w-0 flex-col">
      {screen === 'BOOT' || isRestoringSession ? (
        <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[#C89B4B]/60 bg-[#16110E]/95 px-6 py-5 text-sm text-[#F5EBD6] shadow-2xl">
            <div className="inline-flex items-center gap-2">
              <GameIcon name="ui:loader" size={16} className="animate-spin text-[#E6BE6C]" />
              <span>
                {isRestoringSession
                  ? 'Đang khôi phục phiên đăng nhập Google...'
                  : 'Đang khởi động ứng dụng Tam Quốc Sát...'}
              </span>
            </div>
            <button
              type="button"
              onClick={openOfflineSetup}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#C89B4B]/70 bg-[#241813] px-4 py-2 text-sm font-semibold text-[#F5EBD6] transition-colors hover:border-[#E6BE6C] hover:bg-[#6C2521] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:bot" size={15} />
              Chơi với Máy
            </button>
          </div>
        </section>
      ) : null}

      {screen === 'WAKE' && !isRestoringSession ? (
        <ServerWakeScreen
          serverUrl={serverUrl}
          onServerUrlChange={handleServerUrlChange}
          onServerReady={handleServerReady}
          onPlayOffline={openOfflineSetup}
        />
      ) : null}

      {screen === 'LOGIN' && health ? (
        <LoginScreen
          api={api}
          health={health}
          appVersion={appVersion}
          updateState={updateState}
          initialNotice={loginNotice}
          onLoggedIn={handleLoggedIn}
          onOpenStats={() => handleOpenStatsFrom('LOGIN')}
          onRecheckServer={handleRecheckServer}
          onPlayOffline={openOfflineSetup}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onCheckUpdate={() => {
            void runUpdateCheck({
              silentIfUpToDate: false,
              forceRefresh: true,
            });
          }}
          onOpenDevPreview={
            import.meta.env.DEV
              ? () => {
                  setDevPreviewSeats(8);
                  setScreen('DEV_PREVIEW');
                }
              : undefined
          }
        />
      ) : null}

      {screen === 'NICKNAME_SETUP' && profile ? (
        <FirstTimeNicknameCard
          api={api}
          sessionToken={sessionToken}
          profile={profile}
          serverConnected={Boolean(health)}
          appVersion={appVersion}
          updateState={updateState}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onCheckUpdate={() => {
            void runUpdateCheck({
              silentIfUpToDate: false,
              forceRefresh: true,
            });
          }}
          onPlayOffline={openOfflineSetup}
          isPreviewMode={import.meta.env.DEV && !sessionToken}
          onComplete={handleCompleteNicknameSetup}
        />
      ) : null}

      {(isHomeLobby || (screen === 'STATS' && statsReturnScreen === 'HOME')) && (sessionToken || isLobbyPreview) && profile ? (
        <div ref={lobbyRef} className={isHomeLobby ? "flex min-h-0 min-w-0 flex-1" : "hidden"}>
          <HomeLobbyHub
            navigationActive={isHomeLobby && !isUpdateModalOpen}
            api={api}
            sessionToken={isLobbyPreview ? null : sessionToken}
            profile={profile}
            justLoggedIn={justLoggedIn}
            onDismissWelcomeToast={() => setJustLoggedIn(false)}
            onProfileUpdated={setProfile}
            onEnterRoom={handleEnterRoom}
            onOpenStats={() => handleOpenStatsFrom('HOME')}
            onPlayOffline={openOfflineSetup}
            onLoggedOut={handleLoggedOut}
            onSessionInvalid={handleSessionInvalid}
          />
        </div>
      ) : null}

      {screen === 'WAITING_ROOM' && sessionToken && profile && activeRoom ? (
        <WaitingRoomScreen
          api={api}
          serverUrl={serverUrl}
          sessionToken={sessionToken}
          currentUser={profile}
          initialRoom={activeRoom}
          onMatchStarted={handleMatchStarted}
          onLeftRoom={handleLeftRoom}
          onSessionInvalid={handleSessionInvalid}
        />
      ) : null}

      {screen === 'MATCH' && sessionToken && profile && activeRoom ? (
        <MatchScreen
          api={api}
          serverUrl={serverUrl}
          sessionToken={sessionToken}
          currentUser={profile}
          initialRoom={activeRoom}
          onProfileUpdated={setProfile}
          onReturnToLobby={handleReturnToLobby}
          onLeftRoom={handleLeftRoom}
          onSessionInvalid={handleSessionInvalid}
        />
      ) : null}

      {screen === 'MATCH' && showMatchCrossing ? (
        <div className="lkdf-online-fog" aria-hidden="true" onAnimationEnd={() => setShowMatchCrossing(false)} />
      ) : null}

      {import.meta.env.DEV && screen === 'DEV_PREVIEW' ? (
        <Suspense
          fallback={
            <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#2D343C] bg-[#1E2328] px-6 py-4 text-sm text-[#D1D5DB]">
                <GameIcon name="ui:loader" size={16} className="animate-spin text-[#D99B26]" />
                Đang mở bản xem thử Bàn đấu...
              </div>
            </section>
          }
        >
          <DevMatchPreviewLazy
            initialPlayerCount={devPreviewSeats}
            onExitPreview={() => setScreen(health ? 'LOGIN' : 'WAKE')}
          />
        </Suspense>
      ) : null}

      {screen === 'STATS' ? (
        <StatsPage
          api={api}
          currentUserId={profile?.userId ?? null}
          startWithCurrentUser={statsReturnScreen === 'HOME'}
          onBack={backFromStats}
        />
      ) : null}

      <UpdateModal
        open={isUpdateModalOpen}
        updateState={updateState}
        onStartUpdate={handleStartOneClickUpdate}
        onRecheck={() => {
          void runUpdateCheck({
            silentIfUpToDate: false,
            forceRefresh: true,
          });
        }}
        onInstallNow={handleInstallUpdateNow}
        onClose={() => setIsUpdateModalOpen(false)}
      />
      </div>
    </main>
  );
}
