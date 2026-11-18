import { contextBridge, ipcRenderer } from 'electron';

interface LocalAuthCallbackPayload {
  readonly code: string;
  readonly authSessionId: string;
}

interface PersistedClientState {
  readonly serverUrl: string;
  readonly sessionToken: string | null;
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
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  flashTaskbarFrame: (flash: boolean): Promise<void> =>
    ipcRenderer.invoke('window:flashTaskbarFrame', flash),
  setMatchCloseGuard: (active: boolean): Promise<void> =>
    ipcRenderer.invoke('window:setMatchCloseGuard', active),
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
