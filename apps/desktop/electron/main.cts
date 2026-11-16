import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#14171A',
    title: 'Tam Quốc Sát LKDF',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devServerUrl = process.env['VITE_DEV_SERVER_URL'];
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('window:flashTaskbarFrame', (_event, flash: boolean) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(flash);
  }
});

// Tham chiếu sẵn autoUpdater cho Giai đoạn 5 (1-Click Update qua Update Proxy)
void autoUpdater;

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
