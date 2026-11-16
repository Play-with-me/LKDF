export interface LkdfDesktopBridge {
  getAppVersion: () => Promise<string>;
  flashTaskbarFrame: (flash: boolean) => Promise<void>;
}

declare global {
  interface Window {
    lkdfDesktop?: LkdfDesktopBridge;
  }
}
