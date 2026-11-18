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
import { LoginScreen } from './features/auth/LoginScreen.js';
import { ServerWakeScreen } from './features/auth/ServerWakeScreen.js';
import { HomeLobbyHub } from './features/lobby/HomeLobbyHub.js';
import { WaitingRoomScreen } from './features/lobby/WaitingRoomScreen.js';
import { MatchScreen } from './features/match/MatchScreen.js';
import { StatsPage } from './features/stats/StatsPage.js';
import { UpdateModal } from './features/update/UpdateModal.js';
import {
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

type AppScreen =
  | 'BOOT'
  | 'WAKE'
  | 'LOGIN'
  | 'HOME'
  | 'WAITING_ROOM'
  | 'MATCH'
  | 'DEV_PREVIEW'
  | 'STATS';

export function App() {
  const initialDevSeats = readDevPreviewSeatsFromUrl();
  const [appVersion, setAppVersion] = useState<string>('0.1.0');
  const [screen, setScreen] = useState<AppScreen>(
    initialDevSeats !== null ? 'DEV_PREVIEW' : 'BOOT',
  );
  const [devPreviewSeats, setDevPreviewSeats] = useState<PlayerCount>(
    initialDevSeats ?? 8,
  );
  const [statsReturnScreen, setStatsReturnScreen] = useState<'LOGIN' | 'HOME'>('LOGIN');

  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
        if (initialDevSeats === null) {
          setScreen('WAKE');
        }
      })
      .catch(() => {
        if (active && initialDevSeats === null) {
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

      setIsRestoringSession(true);
      void api
        .getMe(sessionToken)
        .then((userProfile) => {
          setProfile(userProfile);
          setJustLoggedIn(false);
          setLoginNotice(null);
          setScreen('HOME');
        })
        .catch(() => {
          void saveClientStatePatch({ sessionToken: null }).catch(() => undefined);
          setSessionToken(null);
          setProfile(null);
          setLoginNotice(
            'Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại bằng Google.',
          );
          setScreen('LOGIN');
        })
        .finally(() => {
          setIsRestoringSession(false);
        });
    },
    [api, sessionToken],
  );

  const handleLoggedIn = useCallback(
    (token: string, userProfile: UserProfile) => {
      setSessionToken(token);
      setProfile(userProfile);
      setJustLoggedIn(true);
      setLoginNotice(null);
      setScreen('HOME');
    },
    [],
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

  const handleLoggedOut = useCallback(() => {
    void saveClientStatePatch({ sessionToken: null }).catch(() => undefined);
    setSessionToken(null);
    setProfile(null);
    setActiveRoom(null);
    setJustLoggedIn(false);
    setLoginNotice(null);
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

  return (
    <main className="flex h-screen w-screen min-h-0 min-w-0 flex-col overflow-hidden bg-[#14171A] text-[#F3F4F6]">
      {screen !== 'MATCH' && screen !== 'DEV_PREVIEW' ? (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2D343C] bg-[#1E2328] px-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#D99B26]/60 bg-[#C83E37] font-serif-title text-xs font-bold text-[#F4EFE6]">
            Sát
          </span>
          <h1 className="truncate font-serif-title text-base font-semibold tracking-wide text-[#F3F4F6]">
            Tam Quốc Sát LKDF
          </h1>
          {activeRoom && screen === 'WAITING_ROOM' ? (
            <span className="hidden rounded border border-[#30363D] bg-[#14171A] px-2 py-0.5 font-mono-num text-xs text-[#D99B26] sm:inline-block">
              Phòng #{activeRoom.roomState.roomCode}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {profile ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-[#30363D] bg-[#14171A] px-2.5 py-1 text-xs text-[#E5E7EB] md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
              {profile.displayName}
            </span>
          ) : null}

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              health
                ? 'border-[#16A34A]/40 bg-[#16A34A]/15 text-[#86EFAC]'
                : 'border-[#D97706]/40 bg-[#D97706]/15 text-[#FDE68A]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                health ? 'bg-[#16A34A]' : 'bg-[#D97706]'
              }`}
            />
            {health ? 'Máy chủ sẵn sàng' : 'Đang kết nối'}
          </span>

          {updateState.phase === 'AVAILABLE' && updateState.latestVersion ? (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D99B26] bg-[#C83E37] px-3 py-1 font-mono-num text-[11px] font-semibold tabular-nums text-[#F4EFE6] shadow transition-colors hover:bg-[#D94A42]"
            >
              ⬇️ Có bản v{updateState.latestVersion}
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
              className="inline-flex items-center gap-1 rounded-full border border-[#30363D] bg-[#14171A] px-2.5 py-0.5 font-mono-num text-xs tabular-nums text-[#D1D5DB] transition-colors hover:border-[#D99B26] disabled:cursor-not-allowed disabled:opacity-60"
            >
              🔄 v{appVersion}
            </button>
          )}
        </div>
      </header>
      ) : null}

      {screen === 'BOOT' || isRestoringSession ? (
        <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
          <div className="rounded-xl border border-[#2D343C] bg-[#1E2328] px-6 py-4 text-sm text-[#D1D5DB]">
            ⏳ {isRestoringSession
              ? 'Đang khôi phục phiên đăng nhập Google...'
              : 'Đang khởi động ứng dụng LKDF...'}
          </div>
        </section>
      ) : null}

      {screen === 'WAKE' && !isRestoringSession ? (
        <ServerWakeScreen
          serverUrl={serverUrl}
          onServerUrlChange={handleServerUrlChange}
          onServerReady={handleServerReady}
        />
      ) : null}

      {screen === 'LOGIN' && health ? (
        <LoginScreen
          api={api}
          health={health}
          initialNotice={loginNotice}
          onLoggedIn={handleLoggedIn}
          onOpenStats={() => handleOpenStatsFrom('LOGIN')}
          onRecheckServer={handleRecheckServer}
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

      {screen === 'HOME' && sessionToken && profile ? (
        <HomeLobbyHub
          api={api}
          sessionToken={sessionToken}
          profile={profile}
          justLoggedIn={justLoggedIn}
          onDismissWelcomeToast={() => setJustLoggedIn(false)}
          onProfileUpdated={setProfile}
          onEnterRoom={handleEnterRoom}
          onOpenStats={() => handleOpenStatsFrom('HOME')}
          onLoggedOut={handleLoggedOut}
          onSessionInvalid={handleSessionInvalid}
        />
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

      {import.meta.env.DEV && screen === 'DEV_PREVIEW' ? (
        <Suspense
          fallback={
            <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
              <div className="rounded-xl border border-[#2D343C] bg-[#1E2328] px-6 py-4 text-sm text-[#D1D5DB]">
                ⏳ Đang mở bản xem thử Bàn đấu...
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
          onBack={() => setScreen(statsReturnScreen)}
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
    </main>
  );
}
