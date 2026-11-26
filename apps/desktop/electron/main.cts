import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

interface EmbeddedLanServerInstance {
  readonly app: {
    listen(opts: { port: number; host: string }): Promise<string>;
    close(): Promise<void>;
  };
}

type CreateEmbeddedServerFn = (options?: {
  readonly config?: {
    readonly port?: number;
    readonly host?: string;
    readonly databaseUrl?: string;
    readonly jwtSessionSecret?: string;
  };
}) => Promise<EmbeddedLanServerInstance>;

function createEmptyLocalOfflineStats(): LocalOfflineStats {
  return {
    played: 0,
    wins: 0,
    byRole: {
      LORD: { played: 0, wins: 0 },
      LOYALIST: { played: 0, wins: 0 },
      REBEL: { played: 0, wins: 0 },
      SPY: { played: 0, wins: 0 },
    },
    byHero: {},
    recentMatches: [],
  };
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
const LAN_HOST_SECRET_FILENAME = 'lan-host-jwt.secret';

let mainWindow: BrowserWindow | null = null;
let authCallbackServer: http.Server | null = null;
let lanServerInstance: EmbeddedLanServerInstance | null = null;
let lanServerPort: number | null = null;
let lanServerStartingPromise: Promise<LanHostStatus> | null = null;
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
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.length > 0
    ) {
      const cleanPath =
        parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
      return `${parsed.origin}${cleanPath}`;
    }
    return DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

function sanitizeLocalOfflineStats(raw: unknown): LocalOfflineStats {
  const base = createEmptyLocalOfflineStats();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const obj = raw as Record<string, unknown>;
  const played =
    typeof obj['played'] === 'number' && Number.isFinite(obj['played']) && obj['played'] >= 0
      ? Math.floor(obj['played'])
      : 0;
  const wins =
    typeof obj['wins'] === 'number' && Number.isFinite(obj['wins']) && obj['wins'] >= 0
      ? Math.min(played, Math.floor(obj['wins']))
      : 0;

  const byRole: Record<IdentityRoleKey, { played: number; wins: number }> = {
    LORD: { ...base.byRole.LORD },
    LOYALIST: { ...base.byRole.LOYALIST },
    REBEL: { ...base.byRole.REBEL },
    SPY: { ...base.byRole.SPY },
  };
  if (obj['byRole'] && typeof obj['byRole'] === 'object') {
    const rawRole = obj['byRole'] as Record<string, unknown>;
    for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const) {
      const item = rawRole[role];
      if (item && typeof item === 'object') {
        const r = item as Record<string, unknown>;
        const rPlayed =
          typeof r['played'] === 'number' && r['played'] >= 0
            ? Math.floor(r['played'])
            : 0;
        const rWins =
          typeof r['wins'] === 'number' && r['wins'] >= 0
            ? Math.min(rPlayed, Math.floor(r['wins']))
            : 0;
        byRole[role] = { played: rPlayed, wins: rWins };
      }
    }
  }

  const byHero: Record<string, { played: number; wins: number }> = {};
  if (obj['byHero'] && typeof obj['byHero'] === 'object') {
    for (const [heroId, val] of Object.entries(
      obj['byHero'] as Record<string, unknown>,
    )) {
      if (val && typeof val === 'object') {
        const h = val as Record<string, unknown>;
        const hPlayed =
          typeof h['played'] === 'number' && h['played'] >= 0
            ? Math.floor(h['played'])
            : 0;
        const hWins =
          typeof h['wins'] === 'number' && h['wins'] >= 0
            ? Math.min(hPlayed, Math.floor(h['wins']))
            : 0;
        byHero[heroId] = { played: hPlayed, wins: hWins };
      }
    }
  }

  const recentMatches: LocalOfflineMatchEntry[] = [];
  if (Array.isArray(obj['recentMatches'])) {
    for (const entry of obj['recentMatches'].slice(0, 60)) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      const role = e['role'];
      if (
        typeof e['id'] === 'string' &&
        typeof e['heroId'] === 'string' &&
        (role === 'LORD' || role === 'LOYALIST' || role === 'REBEL' || role === 'SPY') &&
        typeof e['won'] === 'boolean' &&
        typeof e['finishedAt'] === 'string'
      ) {
        recentMatches.push({
          id: e['id'],
          heroId: e['heroId'],
          role,
          won: e['won'],
          finishedAt: e['finishedAt'],
          durationSeconds:
            typeof e['durationSeconds'] === 'number' && e['durationSeconds'] >= 0
              ? Math.floor(e['durationSeconds'])
              : 0,
          playerCount:
            typeof e['playerCount'] === 'number' && e['playerCount'] >= 4
              ? Math.floor(e['playerCount'])
              : 4,
        });
      }
    }
  }

  return { played, wins, byRole, byHero, recentMatches };
}

function sanitizePersistedState(
  raw: unknown,
  fallbackDeviceId?: string,
): { state: PersistedClientState; generatedDeviceId: boolean } {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const serverUrl = sanitizeServerUrl(obj['serverUrl']);
  const sessionToken =
    typeof obj['sessionToken'] === 'string' && obj['sessionToken'].trim().length > 0
      ? obj['sessionToken']
      : null;
  const existingDeviceId =
    typeof obj['clientDeviceId'] === 'string' &&
    obj['clientDeviceId'].trim().length >= 8 &&
    obj['clientDeviceId'].trim().length <= 80
      ? obj['clientDeviceId'].trim()
      : null;
  const clientDeviceId = existingDeviceId ?? fallbackDeviceId ?? randomUUID();
  const rawName =
    typeof obj['localDisplayName'] === 'string'
      ? obj['localDisplayName'].trim().normalize('NFC')
      : '';
  const localDisplayName =
    rawName.length >= 2 && rawName.length <= 20 ? rawName : null;
  const localOfflineStats = sanitizeLocalOfflineStats(obj['localOfflineStats']);

  return {
    state: {
      serverUrl,
      sessionToken,
      clientDeviceId,
      localDisplayName,
      localOfflineStats,
    },
    generatedDeviceId: existingDeviceId === null,
  };
}

let clientStateLock: Promise<unknown> = Promise.resolve();
function serializeClientStateIo<T>(fn: () => Promise<T>): Promise<T> {
  const next = clientStateLock.then(fn, fn);
  clientStateLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function writeClientStateRaw(state: PersistedClientState): Promise<void> {
  const filePath = getClientStatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
}

async function loadClientStateFromDisk(): Promise<PersistedClientState> {
  return serializeClientStateIo(async () => {
    try {
      const rawText = await fs.readFile(getClientStatePath(), 'utf8');
      const { state, generatedDeviceId } = sanitizePersistedState(JSON.parse(rawText));
      if (generatedDeviceId) {
        await writeClientStateRaw(state).catch(() => undefined);
      }
      return state;
    } catch {
      const { state } = sanitizePersistedState({});
      await writeClientStateRaw(state).catch(() => undefined);
      return state;
    }
  });
}

async function saveClientStateToDisk(
  patch: Partial<PersistedClientState>,
): Promise<PersistedClientState> {
  return serializeClientStateIo(async () => {
    let currentRaw: unknown = {};
    try {
      currentRaw = JSON.parse(await fs.readFile(getClientStatePath(), 'utf8'));
    } catch {
      currentRaw = {};
    }
    const { state: current } = sanitizePersistedState(currentRaw);
    const { state: next } = sanitizePersistedState(
      {
        serverUrl: patch.serverUrl !== undefined ? patch.serverUrl : current.serverUrl,
        sessionToken:
          patch.sessionToken !== undefined ? patch.sessionToken : current.sessionToken,
        clientDeviceId:
          patch.clientDeviceId !== undefined
            ? patch.clientDeviceId
            : current.clientDeviceId,
        localDisplayName:
          patch.localDisplayName !== undefined
            ? patch.localDisplayName
            : current.localDisplayName,
        localOfflineStats:
          patch.localOfflineStats !== undefined
            ? patch.localOfflineStats
            : current.localOfflineStats,
      },
      current.clientDeviceId,
    );
    await writeClientStateRaw(next);
    return next;
  });
}

function classifyNetworkAddress(
  interfaceName: string,
  ip: string,
): { readonly label: string; readonly priority: number } | null {
  const octets = ip.split('.').map((n) => Number(n));
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  const [a = 0, b = 0] = octets;
  if (a === 127 || (a === 169 && b === 254)) {
    return null;
  }
  const lowerIf = interfaceName.toLowerCase();
  if (
    lowerIf.includes('wsl') ||
    lowerIf.includes('hyper-v') ||
    lowerIf.includes('vethernet') ||
    lowerIf.includes('docker') ||
    lowerIf.includes('loopback')
  ) {
    return null;
  }
  if (a === 26 || lowerIf.includes('radmin')) {
    return { label: 'Radmin VPN', priority: 1 };
  }
  if (a === 100 || lowerIf.includes('tailscale')) {
    return { label: 'Tailscale', priority: 2 };
  }
  if (
    a === 192 && b === 168
  ) {
    return { label: 'LAN / Wi-Fi', priority: 3 };
  }
  if (a === 10 || (a === 172 && b >= 16 && b <= 31)) {
    return { label: 'LAN / Wi-Fi', priority: 4 };
  }
  return { label: 'VPN / LAN', priority: 5 };
}

function listLanAddresses(port: number): readonly LanHostAddressInfo[] {
  const nets = os.networkInterfaces();
  const found: Array<LanHostAddressInfo & { readonly priority: number }> = [];
  const seenIps = new Set<string>();

  for (const [ifName, entries] of Object.entries(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.internal || entry.family !== 'IPv4') {
        continue;
      }
      if (seenIps.has(entry.address)) {
        continue;
      }
      const classified = classifyNetworkAddress(ifName, entry.address);
      if (!classified) {
        continue;
      }
      seenIps.add(entry.address);
      found.push({
        label: classified.label,
        ip: entry.address,
        url: `http://${entry.address}:${port}`,
        priority: classified.priority,
      });
    }
  }

  found.sort((a, b) => a.priority - b.priority || a.ip.localeCompare(b.ip));
  return found.map(({ label, ip, url }) => ({ label, ip, url }));
}

function getLanHostStatus(fallbackPort?: number): LanHostStatus {
  const running = lanServerInstance !== null && lanServerPort !== null;
  const effectivePort = running
    ? lanServerPort
    : typeof fallbackPort === 'number' &&
        Number.isInteger(fallbackPort) &&
        fallbackPort >= 1 &&
        fallbackPort <= 65535
      ? fallbackPort
      : null;

  return {
    running,
    port: running ? lanServerPort : null,
    localUrl: running && lanServerPort ? `http://127.0.0.1:${lanServerPort}` : null,
    addresses: effectivePort !== null ? listLanAddresses(effectivePort) : [],
  };
}

async function getOrCreateLanJwtSecret(): Promise<string> {
  const secretPath = path.join(app.getPath('userData'), LAN_HOST_SECRET_FILENAME);
  try {
    const existing = (await fs.readFile(secretPath, 'utf8')).trim();
    if (existing.length >= 32) {
      return existing;
    }
  } catch {
    // Tạo khóa mới lần đầu
  }
  const generated = randomBytes(32).toString('hex');
  try {
    await fs.mkdir(path.dirname(secretPath), { recursive: true });
    await fs.writeFile(secretPath, generated, 'utf8');
  } catch {
    // Vẫn chạy bình thường trong RAM nếu không ghi được
  }
  return generated;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

async function loadEmbeddedCreateServer(): Promise<CreateEmbeddedServerFn> {
  const candidates = [
    '@lkdf/server/dist/server.js',
    pathToFileURL(path.join(__dirname, '..', '..', 'server', 'dist', 'server.js')).href,
    '@lkdf/server',
  ];
  let lastError: unknown = null;
  for (const specifier of candidates) {
    try {
      const mod = (await import(specifier)) as {
        createServer?: CreateEmbeddedServerFn;
      };
      if (typeof mod.createServer === 'function') {
        return mod.createServer;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể nạp mô-đun máy chủ nội bộ @lkdf/server.');
}

async function startEmbeddedLanServer(): Promise<LanHostStatus> {
  if (lanServerInstance && lanServerPort !== null) {
    return getLanHostStatus();
  }
  if (lanServerStartingPromise) {
    return lanServerStartingPromise;
  }

  lanServerStartingPromise = (async () => {
    const createServer = await loadEmbeddedCreateServer();
    const jwtSessionSecret = await getOrCreateLanJwtSecret();
    const dbPath = path.join(app.getPath('userData'), 'lan-host-state.json');
    const databaseUrl = `json:${dbPath}`;

    let lastListenError: unknown = null;
    for (let port = 3001; port <= 3010; port += 1) {
      const free = await isPortAvailable(port);
      if (!free) {
        continue;
      }
      const instance = await createServer({
        config: {
          port,
          host: '0.0.0.0',
          databaseUrl,
          jwtSessionSecret,
        },
      });
      try {
        await instance.app.listen({ port, host: '0.0.0.0' });
        lanServerInstance = instance;
        lanServerPort = port;
        return getLanHostStatus();
      } catch (err) {
        lastListenError = err;
        await instance.app.close().catch(() => undefined);
      }
    }

    throw lastListenError instanceof Error
      ? lastListenError
      : new Error('Các cổng LAN 3001–3010 đều đang bận trên máy này.');
  })();

  try {
    return await lanServerStartingPromise;
  } finally {
    lanServerStartingPromise = null;
  }
}

async function stopEmbeddedLanServer(): Promise<LanHostStatus> {
  const current = lanServerInstance;
  lanServerInstance = null;
  lanServerPort = null;
  if (current) {
    await current.app.close().catch(() => undefined);
  }
  return getLanHostStatus();
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

ipcMain.handle('lanHost:start', async () => {
  return startEmbeddedLanServer();
});

ipcMain.handle('lanHost:stop', async () => {
  return stopEmbeddedLanServer();
});

ipcMain.handle('lanHost:getStatus', (_event, fallbackPort?: number) => {
  return getLanHostStatus(fallbackPort);
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
  void stopEmbeddedLanServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
