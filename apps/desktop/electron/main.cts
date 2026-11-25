import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { initSteamBridge, type SteamRuntimeStatus } from './steamBridge.cjs';
import { createDesktopUpdaterController } from './updater.cjs';

interface DesktopBrandConfig {
  readonly steamAppId: number;
  readonly artifactPrefix: string;
  readonly emblem: string;
  readonly title: {
    readonly vi: string;
    readonly en: string;
  };
}

const DEFAULT_BRAND_CONFIG: DesktopBrandConfig = {
  steamAppId: 480,
  artifactPrefix: 'BladesOfTheNineRealms',
  emblem: '劍',
  title: {
    vi: 'Cửu Châu Ẩn Kiếm',
    en: 'Blades of the Nine Realms',
  },
};

function loadBrandConfig(): DesktopBrandConfig {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'game.brand.json'),
    path.join(__dirname, '..', '..', '..', 'config', 'game.brand.json'),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as Partial<DesktopBrandConfig>;
      if (parsed?.title?.vi && parsed?.title?.en) {
        return {
          steamAppId: typeof parsed.steamAppId === 'number' ? parsed.steamAppId : 480,
          artifactPrefix: parsed.artifactPrefix || DEFAULT_BRAND_CONFIG.artifactPrefix,
          emblem: parsed.emblem || DEFAULT_BRAND_CONFIG.emblem,
          title: parsed.title,
        };
      }
    } catch {
      // Thử đường dẫn kế tiếp
    }
  }
  return DEFAULT_BRAND_CONFIG;
}

const BRAND_CONFIG = loadBrandConfig();
const BUILD_TARGET: 'steam' | 'standalone' =
  process.env['BUILD_TARGET'] === 'standalone' ? 'standalone' : 'steam';
const STEAM_STATUS: SteamRuntimeStatus = initSteamBridge(
  BRAND_CONFIG.steamAppId,
  BUILD_TARGET === 'steam',
);

interface PersistedClientState {
  readonly serverUrl: string;
  readonly sessionToken: string | null;
}

function readBakedDefaultServerUrl(): string {
  const fromEnv = process.env['LKDF_SERVER_URL']?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const configPath = path.join(
      __dirname,
      '..',
      'assets',
      'default-server.json',
    );
    const raw = JSON.parse(readFileSync(configPath, 'utf8')) as {
      defaultServerUrl?: unknown;
    };
    if (
      typeof raw.defaultServerUrl === 'string' &&
      raw.defaultServerUrl.trim().length > 0
    ) {
      return raw.defaultServerUrl.trim();
    }
  } catch {
    // Mặc định localhost nếu chưa cấu hình máy chủ Cloud
  }
  return 'http://127.0.0.1:3001';
}

const DEFAULT_SERVER_URL = readBakedDefaultServerUrl();
const CLIENT_STATE_FILENAME = 'lkdf-client-state.json';

let mainWindow: BrowserWindow | null = null;
let authCallbackServer: http.Server | null = null;
let matchCloseGuardActive = false;
let offlineMatchCloseGuard = false;
let allowForceClose = false;

function getClientStatePath(): string {
  return path.join(app.getPath('userData'), CLIENT_STATE_FILENAME);
}

function sanitizeServerUrl(raw: unknown): string {
  if (typeof raw !== 'string') {
    return DEFAULT_SERVER_URL;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_SERVER_URL;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

function sanitizePersistedState(raw: unknown): PersistedClientState {
  if (!raw || typeof raw !== 'object') {
    return { serverUrl: DEFAULT_SERVER_URL, sessionToken: null };
  }
  const obj = raw as Record<string, unknown>;
  const serverUrl = sanitizeServerUrl(obj['serverUrl']);
  const sessionToken =
    typeof obj['sessionToken'] === 'string' && obj['sessionToken'].trim().length > 0
      ? obj['sessionToken']
      : null;
  return { serverUrl, sessionToken };
}

async function loadClientStateFromDisk(): Promise<PersistedClientState> {
  try {
    const rawText = await fs.readFile(getClientStatePath(), 'utf8');
    return sanitizePersistedState(JSON.parse(rawText));
  } catch {
    return { serverUrl: DEFAULT_SERVER_URL, sessionToken: null };
  }
}

async function saveClientStateToDisk(
  patch: Partial<PersistedClientState>,
): Promise<PersistedClientState> {
  const current = await loadClientStateFromDisk();
  const next = sanitizePersistedState({
    serverUrl: patch.serverUrl !== undefined ? patch.serverUrl : current.serverUrl,
    sessionToken:
      patch.sessionToken !== undefined ? patch.sessionToken : current.sessionToken,
  });
  const filePath = getClientStatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') {
      return true;
    }
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSafeCallbackHtml(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#14171A; color:#F3F4F6; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { max-width:440px; background:#1E2328; border:1px solid #30363D; border-radius:12px; padding:24px; text-align:center; }
    h1 { margin:0 0 10px; font-size:18px; color:#F3F4F6; }
    p { margin:0; color:#D1D5DB; font-size:14px; line-height:1.5; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
  </main>
</body>
</html>`;
}

async function stopLocalAuthCallbackServer(): Promise<void> {
  const server = authCallbackServer;
  authCallbackServer = null;
  if (!server) {
    return;
  }
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function startLocalAuthCallbackServer(): Promise<{ readonly port: number }> {
  await stopLocalAuthCallbackServer();

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method !== 'GET' || reqUrl.pathname !== '/auth/callback') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const code = reqUrl.searchParams.get('code')?.trim() ?? '';
    const authSessionId = reqUrl.searchParams.get('authSessionId')?.trim() ?? '';

    if (!code || !authSessionId) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        renderSafeCallbackHtml(
          'Thiếu thông tin đăng nhập',
          `Yêu cầu không hợp lệ. Vui lòng thử đăng nhập lại từ ứng dụng ${BRAND_CONFIG.title.vi}.`,
        ),
      );
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth:callback-received', {
        code,
        authSessionId,
      });
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      renderSafeCallbackHtml(
        `Đăng nhập ${BRAND_CONFIG.title.vi} thành công`,
        `Đã đồng bộ đăng nhập về ứng dụng ${BRAND_CONFIG.title.vi}. Bạn có thể đóng tab này.`,
      ),
    );

    void stopLocalAuthCallbackServer();
  });

  authCallbackServer = server;

  const port = await new Promise<number>((resolve, reject) => {
    server.once('error', (err) => {
      authCallbackServer = null;
      reject(err);
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Không thể lấy cổng lắng nghe nội bộ cho Google OAuth.'));
        return;
      }
      resolve(address.port);
    });
  });

  return { port };
}

function getTargetDisplay(): Electron.Display {
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  } catch {
    return screen.getPrimaryDisplay();
  }
}

function createMainWindow(): BrowserWindow {
  allowForceClose = false;

  const steamWindowMode = process.env['STEAM_WINDOW_MODE']?.trim().toLowerCase();
  const isWindowedOverlayTest = steamWindowMode === 'windowed';
  const initialDisplay = getTargetDisplay();
  const { x, y, width, height } = initialDisplay.bounds;

  const win = new BrowserWindow({
    x: isWindowedOverlayTest ? undefined : x,
    y: isWindowedOverlayTest ? undefined : y,
    width: isWindowedOverlayTest ? 1280 : width,
    height: isWindowedOverlayTest ? 720 : height,
    minWidth: 960,
    minHeight: 600,
    fullscreenable: true,
    show: false,
    frame: isWindowedOverlayTest,
    backgroundColor: '#090807',
    title: `${BRAND_CONFIG.title.vi} — ${BRAND_CONFIG.title.en}`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const handleDisplayMetricsChanged = (
    _event: Electron.Event,
    changedDisplay: Electron.Display,
  ): void => {
    if (win.isDestroyed() || !win.isFullScreen()) {
      return;
    }
    const currentDisplay = screen.getDisplayMatching(win.getBounds());
    if (currentDisplay.id !== changedDisplay.id) {
      return;
    }
    win.setBounds(changedDisplay.bounds);
  };

  screen.on('display-metrics-changed', handleDisplayMetricsChanged);

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) {
      return;
    }
    if (!isWindowedOverlayTest) {
      const activeDisplay =
        screen.getAllDisplays().find((d) => d.id === initialDisplay.id) ??
        getTargetDisplay();
      win.setBounds(activeDisplay.bounds);
      win.setFullScreen(true);
    }
    win.show();
  });

  win.on('app-command', (_event, command) => {
    if (command === 'browser-back') win.webContents.send('window:navigate-back');
  });

  win.on('focus', () => {
    win.flashFrame(false);
  });

  win.on('close', (event) => {
    if (!matchCloseGuardActive || allowForceClose) {
      return;
    }
    event.preventDefault();
    void dialog
      .showMessageBox(win, {
        type: 'warning',
        title: `Xác nhận thoát ván đấu ${BRAND_CONFIG.title.vi}`,
        message: offlineMatchCloseGuard
          ? 'Ván tập sẽ kết thúc nếu bạn đóng ứng dụng. Bạn muốn thoát ván?'
          : 'Bạn đang trong ván đấu. Nếu thoát bây giờ, Máy sẽ đánh hộ tạm thời cho đến khi bạn mở lại ứng dụng. Bạn có chắc muốn đóng cửa sổ?',
        buttons: ['Ở lại ván đấu', 'Đóng ứng dụng'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      })
      .then(({ response }) => {
        if (response === 1 && !win.isDestroyed()) {
          allowForceClose = true;
          win.close();
        }
      })
      .catch(() => undefined);
  });

  win.on('closed', () => {
    screen.removeListener('display-metrics-changed', handleDisplayMetricsChanged);
    matchCloseGuardActive = false;
    allowForceClose = false;
    if (mainWindow === win) {
      mainWindow = null;
    }
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

ipcMain.handle('app:getBuildTarget', () => {
  return BUILD_TARGET;
});

ipcMain.handle('steam:getStatus', () => {
  return STEAM_STATUS;
});

ipcMain.handle('window:flashTaskbarFrame', (_event, flash: boolean) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (flash) {
    if (!mainWindow.isFocused() || mainWindow.isMinimized()) {
      mainWindow.flashFrame(true);
    }
    return;
  }
  mainWindow.flashFrame(false);
});

ipcMain.handle('window:setMatchCloseGuard', (_event, active: boolean, offline = false) => {
  matchCloseGuardActive = Boolean(active);
  offlineMatchCloseGuard = matchCloseGuardActive && Boolean(offline);
  if (!matchCloseGuardActive) {
    allowForceClose = false;
  }
});

ipcMain.handle('shell:openExternalUrl', async (_event, url: string) => {
  if (typeof url !== 'string' || !isAllowedExternalUrl(url)) {
    throw new Error('Chỉ cho phép mở liên kết HTTPS hoặc localhost an toàn.');
  }
  await shell.openExternal(url);
});

ipcMain.handle('auth:startLocalCallbackListener', async () => {
  return startLocalAuthCallbackServer();
});

ipcMain.handle('auth:stopLocalCallbackListener', async () => {
  await stopLocalAuthCallbackServer();
});

ipcMain.handle('storage:loadClientState', async () => {
  return loadClientStateFromDisk();
});

ipcMain.handle(
  'storage:saveClientState',
  async (_event, patch: Partial<PersistedClientState>) => {
    const safePatch: Partial<PersistedClientState> =
      patch && typeof patch === 'object' ? patch : {};
    return saveClientStateToDisk(safePatch);
  },
);

const updaterController = createDesktopUpdaterController({
  getMainWindow: () => mainWindow,
  sanitizeServerUrl,
  enabled: BUILD_TARGET === 'standalone',
  defaultSetupName: `${BRAND_CONFIG.artifactPrefix}-Setup`,
  prepareForAutoRestart: () => {
    matchCloseGuardActive = false;
    allowForceClose = true;
  },
});

ipcMain.handle(
  'update:check',
  async (_event, serverUrl: string, forceRefresh?: boolean) => {
    return updaterController.checkForUpdates(serverUrl, Boolean(forceRefresh));
  },
);

ipcMain.handle('update:startOneClick', async (_event, serverUrl: string) => {
  return updaterController.startOneClickUpdate(serverUrl);
});

ipcMain.handle('update:quitAndInstall', () => {
  updaterController.quitAndInstallNow();
});

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  void stopLocalAuthCallbackServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
