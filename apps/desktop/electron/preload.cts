import { contextBridge, ipcRenderer } from 'electron';

const desktopBridge = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  flashTaskbarFrame: (flash: boolean): Promise<void> =>
    ipcRenderer.invoke('window:flashTaskbarFrame', flash),
};

contextBridge.exposeInMainWorld('lkdfDesktop', desktopBridge);
