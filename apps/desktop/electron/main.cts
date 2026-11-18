import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createDesktopUpdaterController } from './updater.cjs';

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
          'Yêu cầu không hợp lệ. Vui lòng thử đăng nhập lại từ ứng dụng LKDF.',
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
        'Đăng nhập LKDF thành công',
        'Đã đồng bộ đăng nhập về ứng dụng LKDF. Bạn có thể đóng tab này.',
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

function createMainWindow(): BrowserWindow {
  allowForceClose = false;

  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#090807',
    title: 'Tam Quốc Sát LKDF',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
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
        title: 'Xác nhận thoát ván đấu LKDF',
        message:
          'Bạn đang trong ván đấu. Nếu thoát bây giờ, Máy sẽ đánh hộ tạm thời cho đến khi bạn mở lại ứng dụng. Bạn có chắc muốn đóng cửa sổ?',
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

ipcMain.handle('window:setMatchCloseGuard', (_event, active: boolean) => {
  matchCloseGuardActive = Boolean(active);
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
