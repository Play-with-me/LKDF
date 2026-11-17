import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, createApiClient, normalizeServerUrl } from '../../lib/api.js';
import type { HealthCheckResponse } from '../../lib/types.js';

export interface ServerWakeScreenProps {
  readonly serverUrl: string;
  readonly onServerUrlChange: (nextUrl: string) => Promise<void>;
  readonly onServerReady: (health: HealthCheckResponse) => void;
}

const RETRY_INTERVAL_MS = 2000;

export function ServerWakeScreen({
  serverUrl,
  onServerUrlChange,
  onServerReady,
}: ServerWakeScreenProps) {
  const [status, setStatus] = useState<'WAKING' | 'ERROR'>('WAKING');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [urlDraft, setUrlDraft] = useState<string>(serverUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const api = useMemo(() => createApiClient(serverUrl), [serverUrl]);

  useEffect(() => {
    setUrlDraft(serverUrl);
  }, [serverUrl]);

  const clearTimersAndAbort = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status !== 'WAKING') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [status, retryTrigger]);

  useEffect(() => {
    let active = true;
    cancelledRef.current = false;
    setStatus('WAKING');
    setElapsedSeconds(0);
    setLastError(null);
    setAttemptCount(0);

    async function probeServer(): Promise<void> {
      if (!active || cancelledRef.current) {
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setAttemptCount((prev) => prev + 1);

      try {
        const health = await api.checkHealth(controller.signal);
        if (!active || cancelledRef.current) {
          return;
        }
        onServerReady(health);
      } catch (err: unknown) {
        if (!active || cancelledRef.current) {
          return;
        }
        if (err instanceof ApiError && err.code === 'REQUEST_ABORTED') {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Chưa nhận được phản hồi từ máy chủ phòng chơi.';
        setLastError(message);

        retryTimerRef.current = window.setTimeout(() => {
          void probeServer();
        }, RETRY_INTERVAL_MS);
      }
    }

    void probeServer();

    return () => {
      active = false;
      cancelledRef.current = true;
      clearTimersAndAbort();
    };
  }, [api, clearTimersAndAbort, onServerReady, retryTrigger]);

  function handleCancel(): void {
    cancelledRef.current = true;
    clearTimersAndAbort();
    setStatus('ERROR');
    setLastError(
      'Bạn đã hủy kết nối tới máy chủ. Hãy kiểm tra lại địa chỉ máy chủ hoặc thử kết nối lại.',
    );
  }

  function handleRetry(): void {
    clearTimersAndAbort();
    setRetryTrigger((prev) => prev + 1);
  }

  async function handleSaveServerUrl(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setUrlError(null);
    let normalized: string;
    try {
      normalized = normalizeServerUrl(urlDraft);
    } catch (err: unknown) {
      setUrlError(
        err instanceof Error ? err.message : 'Địa chỉ máy chủ không hợp lệ.',
      );
      return;
    }

    setIsSavingUrl(true);
    try {
      await onServerUrlChange(normalized);
      setIsEditingUrl(false);
      clearTimersAndAbort();
      setRetryTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      setUrlError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu địa chỉ máy chủ mới.',
      );
    } finally {
      setIsSavingUrl(false);
    }
  }

  const progressPercent =
    status === 'WAKING'
      ? Math.min(95, Math.max(8, Math.round((elapsedSeconds / 45) * 100)))
      : 0;

  return (
    <section className="lkdf-scroll flex flex-1 min-h-0 min-w-0 justify-center overflow-y-auto p-6 animate-lkdf-fade">
      <div className="my-auto w-full max-w-lg rounded-xl border border-[#2D343C] bg-[#1E2328] p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D99B26]/60 bg-[#C83E37] font-serif-title text-base font-bold text-[#F4EFE6]">
              Sát
            </span>
            <div className="min-w-0">
              <h2 className="font-serif-title text-lg font-bold text-[#F3F4F6] truncate">
                Kết nối Máy chủ Phòng chơi
              </h2>
              <p className="font-mono-num text-xs text-[#9CA3AF] truncate">
                {serverUrl}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditingUrl((prev) => !prev);
              setUrlError(null);
            }}
            className="shrink-0 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:border-[#D99B26] hover:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
          >
            {isEditingUrl ? 'Đóng' : 'Đổi địa chỉ máy chủ'}
          </button>
        </div>

        {isEditingUrl ? (
          <form
            onSubmit={(e) => {
              void handleSaveServerUrl(e);
            }}
            className="mb-5 rounded-lg border border-[#30363D] bg-[#14171A] p-4 animate-lkdf-slide"
          >
            <label
              htmlFor="lkdf-server-url-input"
              className="mb-1.5 block text-xs font-medium text-[#D1D5DB]"
            >
              Địa chỉ máy chủ (HTTP/HTTPS)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="lkdf-server-url-input"
                type="text"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="http://127.0.0.1:3001"
                className="min-w-0 flex-1 rounded-lg border border-[#3A424C] bg-[#1E2328] px-3 py-2 font-mono-num text-sm text-[#F3F4F6] placeholder-[#6B7280] focus:border-[#D99B26] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSavingUrl}
                className="shrink-0 rounded-lg bg-[#D99B26] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#E5AA3A] disabled:opacity-50"
              >
                {isSavingUrl ? 'Đang lưu...' : 'Áp dụng'}
              </button>
            </div>
            {urlError ? (
              <p className="mt-2 text-xs text-[#FCA5A5]">{urlError}</p>
            ) : null}
          </form>
        ) : null}

        {status === 'WAKING' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#D97706]/40 bg-[#D97706]/10 p-4">
              <p className="text-sm font-medium text-[#FDE68A] tabular-nums">
                ⏳ Đang đánh thức máy chủ phòng chơi... (Đã chờ {elapsedSeconds}s / Dự kiến 30–60s)
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#14171A]">
                <div
                  className="h-full rounded-full bg-[#D99B26] transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2.5 text-xs text-[#D1D5DB]">
                Máy chủ Cloud miễn phí tự ngủ khi không có người chơi. Ứng dụng đang kiểm tra lại mỗi 2 giây (lần thử{' '}
                <span className="font-mono-num font-semibold text-[#F3F4F6]">
                  #{attemptCount}
                </span>
                ).
              </p>
              {lastError && attemptCount > 1 ? (
                <p className="mt-1.5 text-xs text-[#9CA3AF]">
                  Trạng thái gần nhất: {lastError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-sm font-medium text-[#F3F4F6] transition-colors hover:border-[#DC2626] hover:text-[#FCA5A5] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
              >
                ⏹️ Hủy kết nối
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 p-4">
              <p className="text-sm font-semibold text-[#FCA5A5]">
                Không thể kết nối tới máy chủ phòng chơi
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#E5E7EB]">
                {lastError ??
                  'Kết nối đã bị gián đoạn. Vui lòng đảm bảo máy chủ đang chạy hoặc kiểm tra lại địa chỉ máy chủ.'}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-[#C83E37] px-5 py-2.5 text-sm font-semibold text-[#F4EFE6] transition-colors hover:bg-[#D94A42] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
              >
                🔄 Thử kết nối lại
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
