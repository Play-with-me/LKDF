import { readAppLocale } from './devicePreferences.js';
import type {
  ExchangeManualCodeResponse,
  FilteredStatsResponse,
  GuestLoginResponse,
  HealthCheckResponse,
  HeroId,
  IdentityRole,
  LatestUpdateInfoResponse,
  LocalOfflineMatchEntry,
  LocalOfflineStats,
  PersistedClientState,
  PollAuthStatusResponse,
  RoomViewerPayload,
  StartGoogleLoginResponse,
  StatsFilterInput,
  StatsMetaResponse,
  TimerPreset,
  TimerPresetOption,
  UserPreferences,
  UserProfile,
  UserStatsDetailResponse,
} from './types.js';

export function createEmptyLocalOfflineStats(): LocalOfflineStats {
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

function generateFallbackDeviceId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function sanitizeBrowserOfflineStats(raw: unknown): LocalOfflineStats {
  const base = createEmptyLocalOfflineStats();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const obj = raw as Record<string, unknown>;
  const played =
    typeof obj['played'] === 'number' && obj['played'] >= 0
      ? Math.floor(obj['played'])
      : 0;
  const wins =
    typeof obj['wins'] === 'number' && obj['wins'] >= 0
      ? Math.min(played, Math.floor(obj['wins']))
      : 0;
  const byRole: Record<IdentityRole, { played: number; wins: number }> = {
    LORD: { ...base.byRole.LORD },
    LOYALIST: { ...base.byRole.LOYALIST },
    REBEL: { ...base.byRole.REBEL },
    SPY: { ...base.byRole.SPY },
  };
  if (obj['byRole'] && typeof obj['byRole'] === 'object') {
    const rr = obj['byRole'] as Record<string, unknown>;
    for (const role of ['LORD', 'LOYALIST', 'REBEL', 'SPY'] as const) {
      const item = rr[role];
      if (item && typeof item === 'object') {
        const entry = item as Record<string, unknown>;
        const p =
          typeof entry['played'] === 'number' && entry['played'] >= 0
            ? Math.floor(entry['played'])
            : 0;
        const w =
          typeof entry['wins'] === 'number' && entry['wins'] >= 0
            ? Math.min(p, Math.floor(entry['wins']))
            : 0;
        byRole[role] = { played: p, wins: w };
      }
    }
  }
  const byHero: Record<string, { played: number; wins: number }> = {};
  if (obj['byHero'] && typeof obj['byHero'] === 'object') {
    for (const [heroId, val] of Object.entries(
      obj['byHero'] as Record<string, unknown>,
    )) {
      if (val && typeof val === 'object') {
        const entry = val as Record<string, unknown>;
        const p =
          typeof entry['played'] === 'number' && entry['played'] >= 0
            ? Math.floor(entry['played'])
            : 0;
        const w =
          typeof entry['wins'] === 'number' && entry['wins'] >= 0
            ? Math.min(p, Math.floor(entry['wins']))
            : 0;
        byHero[heroId] = { played: p, wins: w };
      }
    }
  }
  const recentMatches: LocalOfflineMatchEntry[] = [];
  if (Array.isArray(obj['recentMatches'])) {
    for (const item of obj['recentMatches'].slice(0, 60)) {
      if (!item || typeof item !== 'object') continue;
      const e = item as Record<string, unknown>;
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
          heroId: e['heroId'] as HeroId,
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

export const DEFAULT_SERVER_URL =
  (import.meta.env.VITE_LKDF_SERVER_URL as string | undefined)?.trim() ||
  'http://127.0.0.1:3001';
const LOCAL_STORAGE_KEY = 'lkdf_client_state_v1';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_SERVER_URL;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    const isEn = readAppLocale() === 'en';
    throw new ApiError(
      400,
      'INVALID_SERVER_URL',
      isEn
        ? 'Invalid server URL (e.g., http://127.0.0.1:3001).'
        : 'Địa chỉ máy chủ không hợp lệ (ví dụ: http://127.0.0.1:3001).',
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const isEn = readAppLocale() === 'en';
    throw new ApiError(
      400,
      'INVALID_SERVER_URL',
      isEn
        ? 'Only http:// and https:// server protocols are supported.'
        : 'Chỉ hỗ trợ máy chủ giao thức http:// hoặc https://.',
    );
  }

  const cleanPath =
    parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${cleanPath}`;
}

function normalizeHostEndpoint(rawHost: string): string {
  const trimmed = rawHost.trim();
  if (!trimmed) {
    return DEFAULT_SERVER_URL;
  }
  const hasHttps = /^https:\/\//i.test(trimmed);
  const withoutProto = trimmed.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const hasPort = /:\d+$/.test(withoutProto);
  if (!hasHttps && !hasPort && /^(?:\d{1,3}(?:\.\d{1,3}){3}|localhost)$/i.test(withoutProto)) {
    return normalizeServerUrl(`http://${withoutProto}:3001`);
  }
  return normalizeServerUrl(hasHttps ? `https://${withoutProto}` : `http://${withoutProto}`);
}

export function parseSmartRoomInvite(
  rawInviteOrCode: string,
  rawHostAddress = '',
  fallbackServerUrl = DEFAULT_SERVER_URL,
): { readonly serverUrl: string; readonly roomCode: string } | null {
  const cleaned = rawInviteOrCode.trim();
  const hostField = rawHostAddress.trim();

  if (cleaned.includes('#')) {
    const hashIdx = cleaned.lastIndexOf('#');
    const hostPart = cleaned.slice(0, hashIdx).trim();
    const codePart = cleaned.slice(hashIdx + 1).trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codePart)) {
      return null;
    }
    const serverUrl = hostPart
      ? normalizeHostEndpoint(hostPart)
      : hostField
        ? normalizeHostEndpoint(hostField)
        : normalizeServerUrl(fallbackServerUrl);
    return { serverUrl, roomCode: codePart };
  }

  const slashOrSpaceMatch = /^(https?:\/\/[^\s/]+|[^\s/#:]+\.[^\s/#]+(?::\d+)?|localhost(?::\d+)?)[/\s]+([A-Za-z0-9]{6})$/.exec(
    cleaned,
  );
  if (slashOrSpaceMatch && slashOrSpaceMatch[1] && slashOrSpaceMatch[2]) {
    return {
      serverUrl: normalizeHostEndpoint(slashOrSpaceMatch[1]),
      roomCode: slashOrSpaceMatch[2].toUpperCase(),
    };
  }

  const codeOnly = cleaned.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(codeOnly)) {
    return null;
  }

  const serverUrl = hostField
    ? normalizeHostEndpoint(hostField)
    : normalizeServerUrl(fallbackServerUrl);
  return { serverUrl, roomCode: codeOnly };
}

function readBrowserStorageState(): PersistedClientState {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const serverUrl =
      typeof parsed['serverUrl'] === 'string' && parsed['serverUrl'].trim()
        ? parsed['serverUrl'].trim()
        : DEFAULT_SERVER_URL;
    const sessionToken =
      typeof parsed['sessionToken'] === 'string' && parsed['sessionToken'].trim()
        ? parsed['sessionToken']
        : null;
    const existingDeviceId =
      typeof parsed['clientDeviceId'] === 'string' &&
      parsed['clientDeviceId'].trim().length >= 8 &&
      parsed['clientDeviceId'].trim().length <= 80
        ? parsed['clientDeviceId'].trim()
        : null;
    const clientDeviceId = existingDeviceId ?? generateFallbackDeviceId();
    const rawName =
      typeof parsed['localDisplayName'] === 'string'
        ? parsed['localDisplayName'].trim().normalize('NFC')
        : '';
    const localDisplayName =
      rawName.length >= 2 && rawName.length <= 20 ? rawName : null;
    const localOfflineStats = sanitizeBrowserOfflineStats(parsed['localOfflineStats']);
    const state: PersistedClientState = {
      serverUrl,
      sessionToken,
      clientDeviceId,
      localDisplayName,
      localOfflineStats,
    };
    if (!existingDeviceId) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Bỏ qua nếu localStorage bị khóa
      }
    }
    return state;
  } catch {
    return {
      serverUrl: DEFAULT_SERVER_URL,
      sessionToken: null,
      clientDeviceId: generateFallbackDeviceId(),
      localDisplayName: null,
      localOfflineStats: createEmptyLocalOfflineStats(),
    };
  }
}

export async function loadInitialClientState(): Promise<PersistedClientState> {
  if (window.lkdfDesktop) {
    try {
      const state = await window.lkdfDesktop.loadClientState();
      return {
        serverUrl: normalizeServerUrl(state.serverUrl),
        sessionToken: state.sessionToken ?? null,
        clientDeviceId:
          state.clientDeviceId && state.clientDeviceId.trim().length >= 8
            ? state.clientDeviceId.trim()
            : generateFallbackDeviceId(),
        localDisplayName: state.localDisplayName ?? null,
        localOfflineStats: sanitizeBrowserOfflineStats(state.localOfflineStats),
      };
    } catch {
      return readBrowserStorageState();
    }
  }
  return readBrowserStorageState();
}

export async function saveClientStatePatch(
  patch: Partial<PersistedClientState>,
): Promise<PersistedClientState> {
  if (window.lkdfDesktop) {
    const updated = await window.lkdfDesktop.saveClientState(patch);
    return {
      serverUrl: normalizeServerUrl(updated.serverUrl),
      sessionToken: updated.sessionToken ?? null,
      clientDeviceId: updated.clientDeviceId,
      localDisplayName: updated.localDisplayName ?? null,
      localOfflineStats: sanitizeBrowserOfflineStats(updated.localOfflineStats),
    };
  }

  const current = readBrowserStorageState();
  const next: PersistedClientState = {
    serverUrl:
      patch.serverUrl !== undefined
        ? normalizeServerUrl(patch.serverUrl)
        : current.serverUrl,
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
        ? sanitizeBrowserOfflineStats(patch.localOfflineStats)
        : current.localOfflineStats,
  };
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
  return next;
}

export interface LkdfApiClient {
  readonly baseUrl: string;
  checkHealth(signal?: AbortSignal): Promise<HealthCheckResponse>;
  guestLogin(params: {
    readonly clientDeviceId: string;
    readonly displayName: string;
  }): Promise<GuestLoginResponse>;
  startGoogleLogin(desktopCallbackPort?: number): Promise<StartGoogleLoginResponse>;
  pollGoogleStatus(
    authSessionId: string,
    pollSecret: string,
    signal?: AbortSignal,
  ): Promise<PollAuthStatusResponse>;
  exchangeManualCode(code: string): Promise<ExchangeManualCodeResponse>;
  getMe(token: string, signal?: AbortSignal): Promise<UserProfile>;
  updatePreferences(
    token: string,
    prefs: Partial<UserPreferences>,
    signal?: AbortSignal,
  ): Promise<UserProfile>;
  updateDisplayName(token: string, displayName: string): Promise<UserProfile>;
  logout(token: string, signal?: AbortSignal): Promise<void>;
  getTimerPresets(): Promise<readonly TimerPresetOption[]>;
  getMyRoom(token: string): Promise<RoomViewerPayload | null>;
  createRoom(
    token: string,
    timerPreset?: TimerPreset,
  ): Promise<RoomViewerPayload>;
  joinRoom(token: string, roomCode: string): Promise<RoomViewerPayload>;
  getRoom(token: string, roomCode: string): Promise<RoomViewerPayload>;
  setRoomReady(token: string, roomCode: string, isReady: boolean): Promise<RoomViewerPayload>;
  updateTimerPreset(
    token: string,
    roomCode: string,
    timerPreset: TimerPreset,
  ): Promise<RoomViewerPayload>;
  leaveRoom(
    token: string,
    roomCode: string,
  ): Promise<{ readonly deleted: boolean; readonly room: RoomViewerPayload | null }>;
  startMatch(token: string, roomCode: string): Promise<RoomViewerPayload>;
  returnRoomToLobby(token: string, roomCode: string): Promise<RoomViewerPayload>;
  getStatsMeta(): Promise<StatsMetaResponse>;
  queryStats(
    filter: StatsFilterInput,
    signal?: AbortSignal,
  ): Promise<FilteredStatsResponse>;
  getUserStats(userId: string): Promise<UserStatsDetailResponse>;
  getLatestUpdate(
    currentVersion: string,
    forceRefresh?: boolean,
  ): Promise<LatestUpdateInfoResponse>;
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH';
  readonly token?: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

export function createApiClient(serverUrl: string): LkdfApiClient {
  const baseUrl = normalizeServerUrl(serverUrl);

  async function requestJson<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      const init: RequestInit = {
        method: options.method ?? 'GET',
        headers,
      };
      if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
      }
      if (options.signal) {
        init.signal = options.signal;
      }
      response = await fetch(`${baseUrl}${path}`, init);
    } catch (error) {
      const isEn = readAppLocale() === 'en';
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(
          0,
          'REQUEST_ABORTED',
          isEn ? 'Cancelled connection to the server.' : 'Đã hủy kết nối tới máy chủ.',
        );
      }
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        isEn
          ? 'Unable to connect to the game server. The server may be starting up or offline.'
          : 'Không thể kết nối tới máy chủ phòng chơi. Máy chủ có thể đang khởi động hoặc mất mạng.',
      );
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    const isEn = readAppLocale() === 'en';
    if (!response.ok) {
      const code =
        payload && typeof payload['code'] === 'string'
          ? payload['code']
          : `HTTP_${response.status}`;
      const messageVi =
        payload && typeof payload['messageVi'] === 'string'
          ? payload['messageVi']
          : response.status >= 500
            ? isEn
              ? 'Server is busy or encountered a temporary error. Please try again shortly.'
              : 'Máy chủ đang bận hoặc gặp sự cố tạm thời. Vui lòng thử lại sau.'
            : isEn
              ? `Request failed (HTTP ${response.status}).`
              : `Yêu cầu không thành công (mã ${response.status}).`;
      throw new ApiError(response.status, code, messageVi);
    }

    if (!payload) {
      throw new ApiError(
        response.status,
        'INVALID_SERVER_RESPONSE',
        isEn
          ? 'Invalid JSON response from server.'
          : 'Phản hồi từ máy chủ không đúng định dạng JSON.',
      );
    }

    return payload as unknown as T;
  }

  return {
    baseUrl,

    checkHealth(signal) {
      return requestJson<HealthCheckResponse>(
        '/api/health',
        signal ? { signal } : {},
      );
    },

    guestLogin(params) {
      return requestJson<GuestLoginResponse>('/api/auth/guest', {
        method: 'POST',
        body: {
          clientDeviceId: params.clientDeviceId.trim(),
          displayName: params.displayName.trim(),
        },
      });
    },

    startGoogleLogin(desktopCallbackPort) {
      return requestJson<StartGoogleLoginResponse>('/api/auth/google/start', {
        method: 'POST',
        body:
          desktopCallbackPort !== undefined
            ? { desktopCallbackPort }
            : {},
      });
    },

    pollGoogleStatus(authSessionId, pollSecret, signal) {
      return requestJson<PollAuthStatusResponse>(
        `/api/auth/google/status/${encodeURIComponent(authSessionId)}`,
        {
          headers: { 'x-auth-poll-secret': pollSecret },
          ...(signal ? { signal } : {}),
        },
      );
    },

    exchangeManualCode(code) {
      return requestJson<ExchangeManualCodeResponse>('/api/auth/exchange-code', {
        method: 'POST',
        body: { code: code.trim() },
      });
    },

    async getMe(token, signal) {
      const res = await requestJson<{ readonly ok: true; readonly profile: UserProfile }>(
        '/api/auth/me',
        { token, ...(signal ? { signal } : {}) },
      );
      return res.profile;
    },

    async updatePreferences(token, prefs, signal) {
      const res = await requestJson<{ readonly ok: true; readonly profile: UserProfile }>(
        '/api/profile/preferences',
        {
          method: 'PATCH',
          token,
          body: prefs,
          ...(signal ? { signal } : {}),
        },
      );
      return res.profile;
    },

    async updateDisplayName(token, displayName) {
      const res = await requestJson<{ readonly ok: true; readonly profile: UserProfile }>(
        '/api/profile/display-name',
        {
          method: 'PATCH',
          token,
          body: { displayName: displayName.trim() },
        },
      );
      return res.profile;
    },

    async logout(token, signal) {
      await requestJson<{ readonly ok: true }>('/api/auth/logout', {
        method: 'POST',
        token,
        ...(signal ? { signal } : {}),
      });
    },

    async getTimerPresets() {
      const res = await requestJson<{
        readonly ok: true;
        readonly presets: readonly TimerPresetOption[];
      }>('/api/rooms/presets');
      return res.presets;
    },

    async getMyRoom(token) {
      const res = await requestJson<{
        readonly ok: true;
        readonly room: RoomViewerPayload | null;
      }>('/api/rooms/mine', { token });
      return res.room;
    },

    createRoom(token, timerPreset) {
      return requestJson<RoomViewerPayload>('/api/rooms', {
        method: 'POST',
        token,
        body: timerPreset ? { timerPreset } : {},
      });
    },

    joinRoom(token, roomCode) {
      return requestJson<RoomViewerPayload>('/api/rooms/join', {
        method: 'POST',
        token,
        body: { roomCode: roomCode.trim().toUpperCase() },
      });
    },

    getRoom(token, roomCode) {
      return requestJson<RoomViewerPayload>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}`,
        { token },
      );
    },

    setRoomReady(token, roomCode, isReady) {
      return requestJson<RoomViewerPayload>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/ready`,
        { method: 'PATCH', token, body: { isReady } },
      );
    },

    updateTimerPreset(token, roomCode, timerPreset) {
      return requestJson<RoomViewerPayload>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/timer`,
        {
          method: 'PATCH',
          token,
          body: { timerPreset },
        },
      );
    },

    leaveRoom(token, roomCode) {
      return requestJson<{
        readonly deleted: boolean;
        readonly room: RoomViewerPayload | null;
      }>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/leave`,
        {
          method: 'POST',
          token,
        },
      );
    },

    startMatch(token, roomCode) {
      return requestJson<RoomViewerPayload>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/start`,
        {
          method: 'POST',
          token,
        },
      );
    },

    returnRoomToLobby(token, roomCode) {
      return requestJson<RoomViewerPayload>(
        `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}/return-lobby`,
        {
          method: 'POST',
          token,
        },
      );
    },

    getStatsMeta() {
      return requestJson<StatsMetaResponse>('/api/stats/meta');
    },

    queryStats(filter, signal) {
      const params = new URLSearchParams();
      if (filter.userId) {
        params.set('userId', filter.userId);
      }
      if (filter.identity) {
        params.set('identity', filter.identity);
      }
      if (filter.heroId) {
        params.set('heroId', filter.heroId);
      }
      if (filter.includeMatches !== undefined) {
        params.set('includeMatches', filter.includeMatches ? 'true' : 'false');
      }
      if (filter.includeMonthly) params.set('includeMonthly', 'true');
      if (filter.matchLimit !== undefined) {
        params.set('matchLimit', String(filter.matchLimit));
      }
      const query = params.toString();
      return requestJson<FilteredStatsResponse>(
        query ? `/api/stats?${query}` : '/api/stats',
        signal ? { signal } : {},
      );
    },

    getUserStats(userId) {
      return requestJson<UserStatsDetailResponse>(
        `/api/users/${encodeURIComponent(userId)}/stats`,
      );
    },

    getLatestUpdate(currentVersion, forceRefresh = false) {
      const params = new URLSearchParams();
      if (currentVersion.trim()) {
        params.set('currentVersion', currentVersion.trim());
      }
      if (forceRefresh) {
        params.set('refresh', '1');
      }
      const query = params.toString();
      return requestJson<LatestUpdateInfoResponse>(
        query ? `/api/update/latest?${query}` : '/api/update/latest',
      );
    },
  };
}
