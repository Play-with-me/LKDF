import { contextBridge, ipcRenderer } from 'electron';

interface LocalAuthCallbackPayload {
  readonly code: string;
  readonly authSessionId: string;
}

type IdentityRoleKey = 'LORD' | 'LOYALIST' | 'REBEL' | 'SPY';

interface LocalOfflineMatchEntry {
  readonly id: string;
  readonly heroId: string;
  readonly role: IdentityRoleKey;
  readonly won: boolean;
  readonly finishedAt: string;
  readonly durationSeconds: number;
  readonly playerCount: number;
}

interface LocalOfflineStats {
  readonly played: number;
  readonly wins: number;
  readonly byRole: Readonly<
    Record<IdentityRoleKey, { readonly played: number; readonly wins: number }>
  >;
  readonly byHero: Readonly<
    Record<string, { readonly played: number; readonly wins: number }>
  >;
  readonly recentMatches: readonly LocalOfflineMatchEntry[];
}

interface PersistedClientState {
  readonly serverUrl: string;
  readonly sessionToken: string | null;
  readonly clientDeviceId: string;
  readonly localDisplayName: string | null;
  readonly localOfflineStats: LocalOfflineStats;
}

interface LanHostAddressInfo {
  readonly label: string;
  readonly ip: string;
  readonly url: string;
}

interface LanHostStatus {
  readonly running: boolean;
  readonly port: number | null;
  readonly localUrl: string | null;
  readonly addresses: readonly LanHostAddressInfo[];
}

interface DesktopUpdateStatePayload {
  readonly phase: string;
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly releaseName: string | null;
  readonly releaseNotes: string;
  readonly publishedAt: string | null;
  readonly installerName: string | null;
  readonly installerSizeBytes: number | null;
  readonly downloadPath: string | null;
  readonly percent: number | null;
  readonly transferredBytes: number | null;
  readonly totalBytes: number | null;
  readonly bytesPerSecond: number | null;
  readonly canAutoInstall: boolean;
  readonly manualDownloadSavedPath: string | null;
  readonly messageVi: string | null;
}

const desktopBridge = {
  onNavigateBack: (listener: () => void): (() => void) => {
    ipcRenderer.on('window:navigate-back', listener);
    return () => {
      ipcRenderer.removeListener('window:navigate-back', listener);
    };
  },
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getBuildTarget: (): Promise<'steam' | 'standalone'> =>
    ipcRenderer.invoke('app:getBuildTarget'),
  getSteamStatus: (): Promise<unknown> => ipcRenderer.invoke('steam:getStatus'),
  startLanHost: (): Promise<LanHostStatus> => ipcRenderer.invoke('lanHost:start'),
  stopLanHost: (): Promise<LanHostStatus> => ipcRenderer.invoke('lanHost:stop'),
  getLanHostStatus: (fallbackPort?: number): Promise<LanHostStatus> =>
    ipcRenderer.invoke('lanHost:getStatus', fallbackPort),
  flashTaskbarFrame: (flash: boolean): Promise<void> =>
    ipcRenderer.invoke('window:flashTaskbarFrame', flash),
  setMatchCloseGuard: (active: boolean, offline?: boolean): Promise<void> =>
    ipcRenderer.invoke('window:setMatchCloseGuard', active, offline),
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:openExternalUrl', url),
  startLocalAuthCallback: (): Promise<{ readonly port: number }> =>
    ipcRenderer.invoke('auth:startLocalCallbackListener'),
  stopLocalAuthCallback: (): Promise<void> =>
    ipcRenderer.invoke('auth:stopLocalCallbackListener'),
  onLocalAuthCallback: (
    listener: (payload: LocalAuthCallbackPayload) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: LocalAuthCallbackPayload,
    ): void => {
      listener(payload);
    };
    ipcRenderer.on('auth:callback-received', handler);
    return () => {
      ipcRenderer.removeListener('auth:callback-received', handler);
    };
  },
  loadClientState: (): Promise<PersistedClientState> =>
    ipcRenderer.invoke('storage:loadClientState'),
  saveClientState: (
    patch: Partial<PersistedClientState>,
  ): Promise<PersistedClientState> =>
    ipcRenderer.invoke('storage:saveClientState', patch),
  checkForUpdates: (
    serverUrl: string,
    forceRefresh?: boolean,
  ): Promise<DesktopUpdateStatePayload> =>
    ipcRenderer.invoke('update:check', serverUrl, Boolean(forceRefresh)),
  startOneClickUpdate: (
    serverUrl: string,
  ): Promise<DesktopUpdateStatePayload> =>
    ipcRenderer.invoke('update:startOneClick', serverUrl),
  quitAndInstallUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:quitAndInstall'),
  onUpdateStatus: (
    listener: (payload: DesktopUpdateStatePayload) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: DesktopUpdateStatePayload,
    ): void => {
      listener(payload);
    };
    ipcRenderer.on('update:status', handler);
    return () => {
      ipcRenderer.removeListener('update:status', handler);
    };
  },
};

contextBridge.exposeInMainWorld('lkdfDesktop', desktopBridge);
