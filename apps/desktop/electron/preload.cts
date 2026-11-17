import { contextBridge, ipcRenderer } from 'electron';

interface LocalAuthCallbackPayload {
  readonly code: string;
  readonly authSessionId: string;
}

interface PersistedClientState {
  readonly serverUrl: string;
  readonly sessionToken: string | null;
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
};

contextBridge.exposeInMainWorld('lkdfDesktop', desktopBridge);
