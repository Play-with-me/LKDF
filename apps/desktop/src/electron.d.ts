import type {
  DesktopUpdateState,
  PersistedClientState,
} from './lib/types.js';

export interface LocalAuthCallbackPayload {
  readonly code: string;
  readonly authSessionId: string;
}

export interface LkdfDesktopBridge {
  getAppVersion: () => Promise<string>;
  flashTaskbarFrame: (flash: boolean) => Promise<void>;
  setMatchCloseGuard: (active: boolean) => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
  startLocalAuthCallback: () => Promise<{ readonly port: number }>;
  stopLocalAuthCallback: () => Promise<void>;
  onLocalAuthCallback: (
    listener: (payload: LocalAuthCallbackPayload) => void,
  ) => () => void;
  loadClientState: () => Promise<PersistedClientState>;
  saveClientState: (
    patch: Partial<PersistedClientState>,
  ) => Promise<PersistedClientState>;
  checkForUpdates: (
    serverUrl: string,
    forceRefresh?: boolean,
  ) => Promise<DesktopUpdateState>;
  startOneClickUpdate: (serverUrl: string) => Promise<DesktopUpdateState>;
  quitAndInstallUpdate: () => Promise<void>;
  onUpdateStatus: (
    listener: (state: DesktopUpdateState) => void,
  ) => () => void;
}

declare global {
  interface Window {
    lkdfDesktop?: LkdfDesktopBridge;
  }
}
