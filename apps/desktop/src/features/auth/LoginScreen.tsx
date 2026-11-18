import { useCallback, useEffect, useRef, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { ApiError, saveClientStatePatch } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type { HealthCheckResponse, UserProfile } from '../../lib/types.js';

export interface LoginScreenProps {
  readonly api: LkdfApiClient;
  readonly health: HealthCheckResponse;
  readonly initialNotice?: string | null;
  readonly onLoggedIn: (sessionToken: string, profile: UserProfile) => void;
  readonly onOpenStats: () => void;
  readonly onRecheckServer: () => void;
  readonly onOpenDevPreview?: () => void;
}

const POLL_INTERVAL_MS = 1200;

export function LoginScreen({
  api,
  health,
  initialNotice,
  onLoggedIn,
  onOpenStats,
  onRecheckServer,
  onOpenDevPreview,
}: LoginScreenProps) {
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
    async (sessionToken: string, profile: UserProfile) => {
      await cleanupAuthListeners();
      await saveClientStatePatch({ sessionToken });
      setIsPendingGoogle(false);
      setErrorMsg(null);
      onLoggedIn(sessionToken, profile);
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
          await completeLoginWithToken(res.sessionToken, res.profile);
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
    setPendingStatusText('Đang khởi tạo phiên đăng nhập Google...');

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
      setPendingStatusText('Đang chờ bạn xác nhận đăng nhập trên trình duyệt...');

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
      await completeLoginWithToken(exchanged.sessionToken, exchanged.profile);
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

  return (
    <section className="lkdf-scroll flex flex-1 min-h-0 min-w-0 justify-center overflow-y-auto p-6 animate-lkdf-fade">
      <div className="my-auto w-full max-w-lg rounded-xl border border-[#2D343C] bg-[#1E2328] p-7 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#D99B26]/65 bg-[#C83E37] font-serif-title text-xl font-bold text-[#F4EFE6] shadow-inner">
              殺
            </span>
            <div>
              <h2 className="font-serif-title text-xl font-bold text-[#F3F4F6]">
                Tam Quốc Sát LKDF
              </h2>
              <p className="mt-0.5 text-xs text-[#D1D5DB]">
                {health.deckTotal} lá chuẩn · {health.heroCount} Tướng · 4–8 người chơi thật
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRecheckServer}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:border-[#D99B26] hover:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
          >
            <GameIcon name="ui:refresh" size={12} />
            Kiểm tra máy chủ
          </button>
        </div>

        {!health.googleConfigured ? (
          <div className="mb-4 rounded-lg border border-[#D97706]/50 bg-[#D97706]/10 p-3.5 text-xs leading-relaxed text-[#FDE68A]">
            <p className="flex items-center gap-1.5 font-semibold">
              <GameIcon name="ui:alert" size={14} />
              Máy chủ cục bộ chưa gắn khóa Google OAuth 2.0
            </p>
            <p className="mt-1 text-[#E5E7EB]">
              Cấu hình Google OAuth sẽ được hoàn tất khi triển khai. Bạn vẫn có thể dán mã dự phòng (nếu có) hoặc xem ngay bảng thống kê thật của máy chủ.
            </p>
          </div>
        ) : null}

        {errorMsg ? (
          <div className="mb-4 rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]">
            {errorMsg}
          </div>
        ) : null}

        {isPendingGoogle ? (
          <div className="mb-4 rounded-lg border border-[#D99B26]/50 bg-[#14171A] p-4 animate-lkdf-slide">
            <p className="flex items-center gap-2 text-sm font-medium text-[#F3F4F6]">
              <GameIcon name="ui:loader" size={15} className="animate-spin text-[#D99B26]" />
              {pendingStatusText}
            </p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Sau khi cấp quyền Google trên trình duyệt, ứng dụng sẽ tự động đăng nhập. Nếu bị tường lửa chặn chuyển hướng, hãy dùng ô nhập mã dự phòng bên dưới.
            </p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleCancelGoogleLogin();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#1E2328] px-3.5 py-1.5 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#DC2626] hover:text-[#FCA5A5]"
              >
                <GameIcon name="ui:x" size={13} />
                Hủy đăng nhập
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!health.googleConfigured}
            onClick={() => {
              void handleStartGoogleLogin();
            }}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C83E37] px-5 py-3 text-sm font-semibold text-[#F4EFE6] shadow transition-colors hover:bg-[#D94A42] focus:outline-none focus:ring-2 focus:ring-[#D99B26] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GameIcon name="ui:key" size={15} />
            Đăng nhập bằng Google
          </button>
        )}

        <div className="mt-4 border-t border-[#2D343C] pt-4">
          <button
            type="button"
            onClick={() => setShowManualBox((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#D99B26] hover:underline focus:outline-none"
          >
            <GameIcon name="ui:copy" size={12} />
            <span>Dán mã đăng nhập từ trình duyệt</span>
            <GameIcon name={showManualBox ? 'ui:chevron-down' : 'ui:chevron-right'} size={13} />
          </button>

          {showManualBox || isPendingGoogle || !health.googleConfigured ? (
            <form
              onSubmit={(e) => {
                void handleManualExchange(e);
              }}
              className="mt-2.5 flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="VD: LKDF-AB12-CD34"
                className="min-w-0 flex-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-2 font-mono-num text-sm uppercase text-[#F3F4F6] placeholder-[#6B7280] focus:border-[#D99B26] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isExchangingCode}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#D99B26]/60 bg-[#14171A] px-4 py-2 text-xs font-semibold text-[#F3F4F6] transition-colors hover:bg-[#272D35] disabled:opacity-50"
              >
                <GameIcon name="ui:check" size={13} />
                {isExchangingCode ? 'Đang xác thực...' : 'Xác thực mã'}
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#2D343C] pt-4">
          <span className="text-xs text-[#9CA3AF]">
            Dữ liệu máy chủ trực tuyến thật 100%
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {import.meta.env.DEV && onOpenDevPreview ? (
              <button
                type="button"
                onClick={onOpenDevPreview}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D99B26]/60 bg-[#D99B26]/10 px-3 py-2 text-xs font-semibold text-[#FDE68A] transition-colors hover:bg-[#D99B26]/20 focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
              >
                <GameIcon name="card-play" size={13} />
                Xem thử Bàn tròn 4–8 ghế (Dev)
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenStats}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#D99B26] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
            >
              <GameIcon name="ui:chart" size={13} />
              Bảng Thống Kê
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
