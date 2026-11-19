import { useCallback, useEffect, useRef, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { ApiError, saveClientStatePatch } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type {
  DesktopUpdateState,
  HealthCheckResponse,
  UserProfile,
} from '../../lib/types.js';
import { GuofengPortalStage } from './GuofengPortalStage.js';

export interface LoginScreenProps {
  readonly api: LkdfApiClient;
  readonly health: HealthCheckResponse;
  readonly appVersion: string;
  readonly updateState: DesktopUpdateState;
  readonly initialNotice?: string | null;
  readonly onLoggedIn: (
    sessionToken: string,
    profile: UserProfile,
    isNewUser?: boolean,
  ) => void;
  readonly onOpenStats: () => void;
  readonly onRecheckServer: () => void;
  readonly onOpenUpdateModal: () => void;
  readonly onCheckUpdate: () => void;
  readonly onOpenDevPreview?: () => void;
}

type AuthTabMode = 'LOGIN' | 'REGISTER';

const POLL_INTERVAL_MS = 1200;

export function LoginScreen({
  api,
  health,
  appVersion,
  updateState,
  initialNotice,
  onLoggedIn,
  onOpenStats,
  onRecheckServer,
  onOpenUpdateModal,
  onCheckUpdate,
  onOpenDevPreview,
}: LoginScreenProps) {
  const [authTab, setAuthTab] = useState<AuthTabMode>('LOGIN');
  const [isPendingGoogle, setIsPendingGoogle] = useState<boolean>(false);
  const [pendingStatusText, setPendingStatusText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(initialNotice ?? null);

  const [showManualBox, setShowManualBox] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [isExchangingCode, setIsExchangingCode] = useState<boolean>(false);

  const pollTimerRef = useRef<number | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const pollInFlightRef = useRef<boolean>(false);
  const unsubscribeCallbackRef = useRef<(() => void) | null>(null);
  const activeSessionRef = useRef<{
    readonly authSessionId: string;
    readonly pollSecret: string;
  } | null>(null);

  useEffect(() => {
    if (initialNotice) {
      setErrorMsg(initialNotice);
    }
  }, [initialNotice]);

  const cleanupAuthListeners = useCallback(async () => {
    activeSessionRef.current = null;
    pollInFlightRef.current = false;
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
    if (unsubscribeCallbackRef.current) {
      unsubscribeCallbackRef.current();
      unsubscribeCallbackRef.current = null;
    }
    if (window.lkdfDesktop) {
      try {
        await window.lkdfDesktop.stopLocalAuthCallback();
      } catch {
        // Bỏ qua lỗi dọn listener cục bộ
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      void cleanupAuthListeners();
    };
  }, [cleanupAuthListeners]);

  const completeLoginWithToken = useCallback(
    async (
      sessionToken: string,
      profile: UserProfile,
      isNewUser?: boolean,
    ) => {
      await cleanupAuthListeners();
      await saveClientStatePatch({ sessionToken });
      setIsPendingGoogle(false);
      setErrorMsg(null);
      onLoggedIn(sessionToken, profile, isNewUser);
    },
    [cleanupAuthListeners, onLoggedIn],
  );

  const pollOnce = useCallback(
    async (authSessionId: string, pollSecret: string): Promise<boolean> => {
      if (
        !activeSessionRef.current ||
        activeSessionRef.current.authSessionId !== authSessionId
      ) {
        return true;
      }

      if (pollInFlightRef.current) {
        return false;
      }

      pollInFlightRef.current = true;
      const controller = new AbortController();
      pollAbortRef.current = controller;

      try {
        const res = await api.pollGoogleStatus(
          authSessionId,
          pollSecret,
          controller.signal,
        );
        if (
          !activeSessionRef.current ||
          activeSessionRef.current.authSessionId !== authSessionId
        ) {
          return true;
        }

        if (res.status === 'COMPLETED') {
          await completeLoginWithToken(
            res.sessionToken,
            res.profile,
            res.isNewUser,
          );
          return true;
        }

        if (res.status === 'CANCELLED') {
          await cleanupAuthListeners();
          setIsPendingGoogle(false);
          setErrorMsg(res.messageVi);
          return true;
        }

        return false;
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'REQUEST_ABORTED') {
          return true;
        }
        if (
          !activeSessionRef.current ||
          activeSessionRef.current.authSessionId !== authSessionId
        ) {
          return true;
        }
        if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) {
          await cleanupAuthListeners();
          setIsPendingGoogle(false);
          setErrorMsg(err.message);
          return true;
        }
        return false;
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [api, cleanupAuthListeners, completeLoginWithToken],
  );

  async function handleStartGoogleLogin(): Promise<void> {
    if (!health.googleConfigured) {
      return;
    }

    await cleanupAuthListeners();
    setErrorMsg(null);
    setIsPendingGoogle(true);
    setPendingStatusText(
      authTab === 'REGISTER'
        ? 'Đang mở Google để tạo hồ sơ mới...'
        : 'Đang chờ bạn xác nhận đăng nhập trên trình duyệt...',
    );

    try {
      let callbackPort: number | undefined;
      if (window.lkdfDesktop) {
        const listener = await window.lkdfDesktop.startLocalAuthCallback();
        callbackPort = listener.port;
      }

      const started = await api.startGoogleLogin(callbackPort);
      activeSessionRef.current = {
        authSessionId: started.authSessionId,
        pollSecret: started.pollSecret,
      };
      setPendingStatusText(
        'Đang chờ bạn xác nhận tài khoản Google trên trình duyệt...',
      );

      if (window.lkdfDesktop) {
        unsubscribeCallbackRef.current = window.lkdfDesktop.onLocalAuthCallback(
          (payload) => {
            if (payload.authSessionId === started.authSessionId) {
              void pollOnce(started.authSessionId, started.pollSecret);
            }
          },
        );
        await window.lkdfDesktop.openExternalUrl(started.authUrl);
      } else {
        window.open(started.authUrl, '_blank', 'noopener,noreferrer');
      }

      const scheduleNextPoll = () => {
        pollTimerRef.current = window.setTimeout(() => {
          void (async () => {
            const done = await pollOnce(started.authSessionId, started.pollSecret);
            if (!done && activeSessionRef.current?.authSessionId === started.authSessionId) {
              scheduleNextPoll();
            }
          })();
        }, POLL_INTERVAL_MS);
      };

      scheduleNextPoll();
    } catch (err: unknown) {
      await cleanupAuthListeners();
      setIsPendingGoogle(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể mở cửa sổ đăng nhập Google.',
      );
    }
  }

  async function handleCancelGoogleLogin(): Promise<void> {
    await cleanupAuthListeners();
    setIsPendingGoogle(false);
    setPendingStatusText('');
  }

  async function handleManualExchange(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed.length < 4) {
      setErrorMsg('Vui lòng nhập mã đăng nhập dự phòng từ trình duyệt.');
      return;
    }

    setErrorMsg(null);
    setIsExchangingCode(true);
    try {
      const exchanged = await api.exchangeManualCode(trimmed);
      await completeLoginWithToken(
        exchanged.sessionToken,
        exchanged.profile,
        exchanged.isNewUser,
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Mã đăng nhập dự phòng không hợp lệ hoặc đã hết hạn.',
      );
    } finally {
      setIsExchangingCode(false);
    }
  }

  const isManualSectionVisible = showManualBox || isPendingGoogle;

  return (
    <GuofengPortalStage
      deckTotal={health.deckTotal}
      heroCount={health.heroCount}
      serverConnected
      appVersion={appVersion}
      updateState={updateState}
      onOpenUpdateModal={onOpenUpdateModal}
      onCheckUpdate={onCheckUpdate}
      onOpenStats={onOpenStats}
      onRecheckServer={onRecheckServer}
      onOpenDevPreview={onOpenDevPreview}
    >
      {/* Chế độ Đăng nhập / Đăng ký tối giản (chuẩn Naraka / Hắc Thần Thoại) */}
      <div
        role="tablist"
        aria-label="Chọn đăng nhập hoặc đăng ký mới"
        className="mb-3 flex items-center justify-center gap-7"
      >
        <button
          type="button"
          role="tab"
          aria-selected={authTab === 'LOGIN'}
          onClick={() => {
            setAuthTab('LOGIN');
            setErrorMsg(null);
          }}
          className={`relative cursor-pointer px-2 pt-1 pb-1.5 text-[13.5px] font-semibold tracking-[0.04em] transition-colors focus:outline-none ${
            authTab === 'LOGIN'
              ? 'text-[#FFF6E6] drop-shadow-[0_0_12px_rgba(242,207,132,0.45)]'
              : 'text-[#B7C1D0]/68 hover:text-[#F5ECDC]'
          }`}
        >
          Đăng nhập
          {authTab === 'LOGIN' ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#F2CF84] to-transparent"
            />
          ) : null}
        </button>

        <span
          aria-hidden="true"
          className="h-1 w-1 rotate-45 bg-[#D4A451]/45"
        />

        <button
          type="button"
          role="tab"
          aria-selected={authTab === 'REGISTER'}
          onClick={() => {
            setAuthTab('REGISTER');
            setErrorMsg(null);
          }}
          className={`relative cursor-pointer px-2 pt-1 pb-1.5 text-[13.5px] font-semibold tracking-[0.04em] transition-colors focus:outline-none ${
            authTab === 'REGISTER'
              ? 'text-[#FFF6E6] drop-shadow-[0_0_12px_rgba(242,207,132,0.45)]'
              : 'text-[#B7C1D0]/68 hover:text-[#F5ECDC]'
          }`}
        >
          Đăng ký mới
          {authTab === 'REGISTER' ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#F2CF84] to-transparent"
            />
          ) : null}
        </button>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="mx-auto mb-3 flex max-w-[360px] items-start gap-2 rounded-[4px] border border-[#DC2626]/55 bg-[#190B0C]/88 px-3 py-2 text-xs text-[#FCA5A5] shadow-lg backdrop-blur-sm"
        >
          <GameIcon name="ui:alert" size={14} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {isPendingGoogle ? (
        <div className="mx-auto max-w-[360px] rounded-[4px] border border-[#E6BE6C]/50 bg-[#0A0D13]/88 px-4 py-3 text-center shadow-xl backdrop-blur-sm animate-lkdf-slide">
          <p className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-[#F5ECDC]">
            <GameIcon
              name="ui:loader"
              size={14}
              className="animate-spin text-[#E6BE6C]"
            />
            <span>{pendingStatusText}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-[#94A3B8]">
            Xác nhận xong trên trình duyệt, app sẽ tự vào sảnh (hoặc dán mã bên dưới).
          </p>
          <div className="mt-2.5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                void handleCancelGoogleLogin();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-[#94A3B8]/35 bg-[#12161F] px-3 py-1 text-xs font-medium text-[#E2E8F0] transition-colors hover:border-[#DC2626] hover:text-[#FCA5A5]"
            >
              <GameIcon name="ui:x" size={12} />
              Hủy đăng nhập
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <span
            aria-hidden="true"
            className="h-px flex-1 max-w-[44px] bg-gradient-to-r from-transparent to-[#D4A451]/60"
          />
          <button
            type="button"
            disabled={!health.googleConfigured}
            title={
              !health.googleConfigured
                ? 'Máy chủ thử cục bộ chưa cấu hình khóa Google OAuth'
                : undefined
            }
            onClick={() => {
              void handleStartGoogleLogin();
            }}
            className="tqs-talisman-btn inline-flex flex-1 max-w-[320px] cursor-pointer items-center justify-center gap-2.5 rounded-[3px] border border-[#F2CF84]/78 px-5 py-3 text-[14px] font-bold tracking-[0.03em] text-[#FFF8ED] focus:outline-none focus:ring-2 focus:ring-[#F2CF84]/70 disabled:cursor-not-allowed disabled:opacity-45 sm:py-[13px] sm:text-[14.5px]"
          >
            <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[3px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </span>
            <span>
              {authTab === 'REGISTER'
                ? 'Đăng ký tài khoản bằng Google'
                : 'Tiếp tục với Google'}
            </span>
          </button>
          <span
            aria-hidden="true"
            className="h-px flex-1 max-w-[44px] bg-gradient-to-l from-transparent to-[#D4A451]/60"
          />
        </div>
      )}

      {/* Gợi ý ngắn khi Đăng ký + ô mã dự phòng gập gọn */}
      <div className="mt-2.5 text-center">
        {authTab === 'REGISTER' && !isPendingGoogle ? (
          <p className="mb-1 text-[11.5px] text-[#F2CF84]/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            Tự lập hồ sơ và chọn Biệt danh Tướng quân ngay sau khi liên kết Gmail
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <button
            type="button"
            aria-expanded={isManualSectionVisible}
            onClick={() => setShowManualBox((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#D4A451]/90 transition-colors hover:text-[#F2CF84] focus:outline-none"
          >
            <span>Có mã dự phòng từ trình duyệt?</span>
            <span aria-hidden="true">{isManualSectionVisible ? '▴' : '▾'}</span>
          </button>

          {!health.googleConfigured ? (
            <span className="text-[11px] text-[#94A3B8]">
              (Cục bộ chưa gắn khóa Google OAuth)
            </span>
          ) : null}
        </div>

        {isManualSectionVisible ? (
          <form
            onSubmit={(e) => {
              void handleManualExchange(e);
            }}
            className="mx-auto mt-2.5 flex max-w-[320px] gap-2 animate-lkdf-slide"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="VD: TQS-AB12-CD34"
              aria-label="Mã đăng nhập dự phòng từ trình duyệt"
              className="min-w-0 flex-1 rounded-[3px] border border-[#D4A451]/42 bg-[#07090E]/88 px-3 py-2 font-mono-num text-xs uppercase text-[#F5ECDC] placeholder-[#64748B] focus:border-[#F2CF84] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isExchangingCode}
              className="shrink-0 cursor-pointer rounded-[3px] border border-[#F2CF84]/65 bg-gradient-to-b from-[#B8332C] to-[#7D1B17] px-3.5 py-2 text-xs font-bold text-[#FFF6E5] transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {isExchangingCode ? 'Đang gửi...' : 'Vào'}
            </button>
          </form>
        ) : null}
      </div>
    </GuofengPortalStage>
  );
}
