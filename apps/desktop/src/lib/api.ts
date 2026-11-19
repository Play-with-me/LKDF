import type {
  ExchangeManualCodeResponse,
  FilteredStatsResponse,
  HealthCheckResponse,
  LatestUpdateInfoResponse,
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
    throw new ApiError(
      400,
      'INVALID_SERVER_URL',
      'Địa chỉ máy chủ không hợp lệ (ví dụ: http://127.0.0.1:3001).',
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiError(
      400,
      'INVALID_SERVER_URL',
      'Chỉ hỗ trợ máy chủ giao thức http:// hoặc https://.',
    );
  }

  const cleanPath =
    parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${cleanPath}`;
}

function readBrowserStorageState(): PersistedClientState {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return { serverUrl: DEFAULT_SERVER_URL, sessionToken: null };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const serverUrl =
      typeof parsed['serverUrl'] === 'string' && parsed['serverUrl'].trim()
        ? parsed['serverUrl'].trim()
        : DEFAULT_SERVER_URL;
    const sessionToken =
      typeof parsed['sessionToken'] === 'string' && parsed['sessionToken'].trim()
        ? parsed['sessionToken']
        : null;
    return { serverUrl, sessionToken };
  } catch {
    return { serverUrl: DEFAULT_SERVER_URL, sessionToken: null };
  }
}

export async function loadInitialClientState(): Promise<PersistedClientState> {
  if (window.lkdfDesktop) {
    try {
      const state = await window.lkdfDesktop.loadClientState();
      return {
        serverUrl: normalizeServerUrl(state.serverUrl),
        sessionToken: state.sessionToken ?? null,
      };
    } catch {
      return { serverUrl: DEFAULT_SERVER_URL, sessionToken: null };
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
  startGoogleLogin(desktopCallbackPort?: number): Promise<StartGoogleLoginResponse>;
  pollGoogleStatus(
    authSessionId: string,
    pollSecret: string,
    signal?: AbortSignal,
  ): Promise<PollAuthStatusResponse>;
  exchangeManualCode(code: string): Promise<ExchangeManualCodeResponse>;
  getMe(token: string): Promise<UserProfile>;
  updatePreferences(
    token: string,
    prefs: Partial<UserPreferences>,
  ): Promise<UserProfile>;
  updateDisplayName(token: string, displayName: string): Promise<UserProfile>;
  logout(token: string): Promise<void>;
  getTimerPresets(): Promise<readonly TimerPresetOption[]>;
  getMyRoom(token: string): Promise<RoomViewerPayload | null>;
  createRoom(
    token: string,
    timerPreset?: TimerPreset,
  ): Promise<RoomViewerPayload>;
  joinRoom(token: string, roomCode: string): Promise<RoomViewerPayload>;
  getRoom(token: string, roomCode: string): Promise<RoomViewerPayload>;
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(0, 'REQUEST_ABORTED', 'Đã hủy kết nối tới máy chủ.');
      }
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Không thể kết nối tới máy chủ phòng chơi. Máy chủ có thể đang khởi động hoặc mất mạng.',
      );
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const code =
        payload && typeof payload['code'] === 'string'
          ? payload['code']
          : `HTTP_${response.status}`;
      const messageVi =
        payload && typeof payload['messageVi'] === 'string'
          ? payload['messageVi']
          : response.status >= 500
            ? 'Máy chủ đang bận hoặc gặp sự cố tạm thời. Vui lòng thử lại sau.'
            : `Yêu cầu không thành công (mã ${response.status}).`;
      throw new ApiError(response.status, code, messageVi);
    }

    if (!payload) {
      throw new ApiError(
        response.status,
        'INVALID_SERVER_RESPONSE',
        'Phản hồi từ máy chủ không đúng định dạng JSON.',
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

    async getMe(token) {
      const res = await requestJson<{ readonly ok: true; readonly profile: UserProfile }>(
        '/api/auth/me',
        { token },
      );
      return res.profile;
    },

    async updatePreferences(token, prefs) {
      const res = await requestJson<{ readonly ok: true; readonly profile: UserProfile }>(
        '/api/profile/preferences',
        {
          method: 'PATCH',
          token,
          body: prefs,
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

    async logout(token) {
      await requestJson<{ readonly ok: true }>('/api/auth/logout', {
        method: 'POST',
        token,
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
