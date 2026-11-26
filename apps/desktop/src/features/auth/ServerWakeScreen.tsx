import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_BRAND } from '@lkdf/shared';
import { GameIcon } from '../../components/icons/index.js';
import { getUiAssetUrl } from '../../lib/assetCatalog.js';
import { ApiError, createApiClient, normalizeServerUrl } from '../../lib/api.js';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import type { HealthCheckResponse } from '../../lib/types.js';

export interface ServerWakeScreenProps {
  readonly serverUrl: string;
  readonly onServerUrlChange: (nextUrl: string) => Promise<void>;
  readonly onServerReady: (health: HealthCheckResponse) => void;
  readonly onPlayOffline?: () => void;
}

const RETRY_INTERVAL_MS = 2000;
const TIP_ROTATION_MS = 6000;

const TACTICAL_TIPS: readonly {
  readonly title: string;
  readonly body: string;
  readonly titleEn: string;
  readonly bodyEn: string;
}[] = [
  {
    title: 'Vòng 1 Hòa Bình',
    body: 'Trong vòng đầu tiên toàn bàn, không thể đánh Sát hay Quyết Đấu — hãy ưu tiên rút bài, lắp Vũ khí và Giáp.',
    titleEn: 'Round 1 Peace Pact',
    bodyEn: 'During Round 1 across the table, Strikes and Duels are sealed — focus on drawing cards, equipping weapons, and armor.',
  },
  {
    title: 'Khoảng cách & Chiến mã',
    body: 'Ngựa -1 giúp bạn áp sát mục tiêu thuận lợi hơn; Ngựa +1 giữ khoảng cách khiến đối thủ khó với tới.',
    titleEn: 'Distance & Steeds',
    bodyEn: 'Steeds -1 shorten your attack reach to targets; Steeds +1 push enemies farther away from reaching you.',
  },
  {
    title: 'Đào cứu nguy toàn bàn',
    body: 'Khi một tướng tụt về 0 máu (hấp hối), bất kỳ ai còn Đào trên tay đều có thể dùng để cứu +1 máu.',
    titleEn: 'Global Spirit Peach Rescue',
    bodyEn: 'Whenever any general drops to 0 HP (brink of death), anyone holding a Spirit Peach may play it to restore +1 HP.',
  },
  {
    title: 'Hóa Giải Chân Khí',
    body: 'Có thể chặn Bí kíp thường lẫn Bí kíp chậm (Phong Mạch Tán, Thiên Lôi Chú) ngay trước lúc phát huy hiệu lực.',
    titleEn: 'True Qi Negation',
    bodyEn: 'Negates both instant Scrolls and delayed Scrolls (Qi Lock Seal, Celestial Thunder) right before resolution.',
  },
  {
    title: 'Liên Châu Nỏ & Thanh Cang Kiếm',
    body: 'Liên Châu Nỏ cho phép đánh không giới hạn lá Kiếm Trảm trong lượt; Thanh Cang Kiếm chém xuyên hiệu ứng Hộ giáp đối thủ.',
    titleEn: 'Repeating Crossbow & Blue Steel Blade',
    bodyEn: 'Repeating Crossbow removes the Strike limit per turn; Blue Steel Blade pierces straight through defender Armor.',
  },
  {
    title: 'Mục tiêu chiến thắng theo Phe',
    body: 'Nghĩa Quân thắng ngay khi hạ được Minh Chủ; Ám Ảnh chỉ thắng khi trở thành người sống sót cuối cùng.',
    titleEn: 'Allegiance Victory Conditions',
    bodyEn: 'Rebels win immediately upon slaying the Sovereign; Traitors win only as the sole survivor at the end.',
  },
];

export function ServerWakeScreen({
  serverUrl,
  onServerUrlChange,
  onServerReady,
  onPlayOffline,
}: ServerWakeScreenProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [status, setStatus] = useState<'WAKING' | 'ERROR'>('WAKING');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const [tipIndex, setTipIndex] = useState<number>(0);

  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [urlDraft, setUrlDraft] = useState<string>(serverUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const api = useMemo(() => createApiClient(serverUrl), [serverUrl]);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    setUrlDraft(serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TACTICAL_TIPS.length);
    }, TIP_ROTATION_MS);
    return () => {
      window.clearInterval(tipTimer);
    };
  }, []);

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
      isEn
        ? 'You cancelled connecting to the server. Check the server address or try reconnecting.'
        : 'Bạn đã hủy kết nối tới máy chủ. Hãy kiểm tra lại địa chỉ máy chủ hoặc thử kết nối lại.',
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
        err instanceof Error
          ? err.message
          : isEn
            ? 'Invalid server address.'
            : 'Địa chỉ máy chủ không hợp lệ.',
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
      ? Math.min(95, Math.max(10, Math.round((elapsedSeconds / 45) * 100)))
      : 0;

  const lobbyBannerUrl = getUiAssetUrl('lobby-banner');
  const campBackdropUrl = getUiAssetUrl('camp-zhanhuo');
  const currentTip = TACTICAL_TIPS[tipIndex] ?? TACTICAL_TIPS[0]!;

  return (
    <section className="relative flex flex-1 min-h-0 min-w-0 flex-col justify-between overflow-hidden bg-[#090807] animate-lkdf-fade">
      {/* Sân khấu toàn màn hình Doanh Trại Xích Bích */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {lobbyBannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${lobbyBannerUrl})` }}
          />
        ) : null}
        {campBackdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-28 mix-blend-screen"
            style={{ backgroundImage: `url(${campBackdropUrl})` }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 72% 72% at 50% 44%, rgba(16, 11, 8, 0.38) 0%, rgba(9, 8, 7, 0.84) 72%, #070605 100%)',
          }}
        />
      </div>

      {/* Thanh công cụ góc trên-phải cho Đổi máy chủ */}
      <div className="relative z-20 flex items-start justify-end px-4 pt-3 sm:px-6">
        <div className="relative">
          <button
            type="button"
            aria-expanded={isEditingUrl}
            onClick={() => {
              setIsEditingUrl((prev) => !prev);
              setUrlError(null);
            }}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <GameIcon name="ui:convert" size={12} className="text-[#E6BE6C]" />
            <span>{isEditingUrl ? 'Đóng cấu hình' : 'Đổi máy chủ'}</span>
          </button>

          {isEditingUrl ? (
            <form
              onSubmit={(e) => {
                void handleSaveServerUrl(e);
              }}
              className="absolute top-full right-0 z-30 mt-2 w-[min(360px,calc(100vw-32px))] rounded-lg border border-[#C89B4B]/70 bg-[#16110E]/96 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.88)] backdrop-blur-md animate-lkdf-slide"
            >
              <label
                htmlFor="lkdf-server-url-input"
                className="mb-1.5 block text-xs font-semibold text-[#F5EBD6]"
              >
                {isEn ? 'Server URL (HTTP/HTTPS)' : 'Địa chỉ máy chủ (HTTP/HTTPS)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="lkdf-server-url-input"
                  type="text"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="http://127.0.0.1:3001"
                  className="min-w-0 flex-1 rounded-md border border-[#806345] bg-[#1F1712] px-3 py-1.5 font-mono-num text-xs text-[#F5EBD6] placeholder-[#A8947A] focus:border-[#E6BE6C] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                />
                <button
                  type="submit"
                  disabled={isSavingUrl}
                  className="shrink-0 cursor-pointer rounded-md border border-[#D4A451]/75 bg-[#9E2B25] px-3 py-1.5 text-xs font-semibold text-[#FFF8ED] transition-colors hover:bg-[#B7372E] disabled:opacity-50"
                >
                  {isSavingUrl ? (isEn ? 'Saving...' : 'Đang lưu...') : (isEn ? 'Apply' : 'Áp dụng')}
                </button>
              </div>
              {urlError ? (
                <p role="alert" className="mt-2 text-xs text-[#FCA5A5]">
                  {urlError}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      {/* Trung tâm Doanh Trại Xích Bích */}
      <div className="relative z-10 flex flex-1 min-h-0 items-center justify-center px-4 pb-4 sm:px-6">
        <div className="lkdf-bronze-bevel relative w-full max-w-xl rounded-xl border border-[#C89B4B]/65 p-5 sm:p-6 shadow-[0_28px_72px_rgba(0,0,0,0.88)]">
          {/* Tiêu đề & Ấn triện */}
          <div className="mb-4 flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="tqs-stone-chop inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-[3px] border border-[#F2CF84]/75 font-serif-title text-xl font-bold text-[#F9EED9]"
            >
              {GAME_BRAND.emblem}
            </span>
            <div className="min-w-0">
              <h2 className="font-serif-title text-xl font-bold tracking-wide text-[#F5EBD6] sm:text-2xl">
                {isEn ? GAME_BRAND.title.en : GAME_BRAND.title.vi}
              </h2>
              <p className="mt-0.5 text-xs text-[#D5C3A5]">
                {isEn
                  ? `${GAME_BRAND.subtitle.en} · 4–8 Players`
                  : `${GAME_BRAND.subtitle.vi} · Bàn 4–8 người`}
              </p>
            </div>
          </div>

          {status === 'WAKING' ? (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-[#C89B4B]/45 bg-[#1B130F]/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#FDE68A]">
                    <GameIcon
                      name="ui:loader"
                      size={15}
                      className={reducedMotion ? 'shrink-0 text-[#E6BE6C]' : 'shrink-0 animate-spin text-[#E6BE6C]'}
                    />
                    <span>{isEn ? 'Waking up the game server…' : 'Đang đánh thức máy chủ phòng chơi…'}</span>
                  </p>
                  <span className="font-mono-num shrink-0 rounded border border-[#806345]/70 bg-[#120D0A] px-2 py-0.5 text-[11px] font-semibold text-[#E6BE6C] tabular-nums">
                    {isEn ? `Attempt #${attemptCount}` : `Lần dò #${attemptCount}`}
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-[#806345]/45 bg-[#120D0A]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9E2B25] via-[#C89B4B] to-[#F2CF84] transition-[width] duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="font-mono-num mt-2.5 text-xs text-[#E6D4B8] tabular-nums">
                  {isEn
                    ? `(Waited ${elapsedSeconds}s · Cold server startup usually takes ~30–50s)`
                    : `(Đã chờ ${elapsedSeconds}s · Khởi động sảnh lần đầu khoảng 30–50s)`}
                </p>
              </div>

              {/* Cẩm Nang Chiến Thuật */}
              <div className="rounded-lg border border-[#806345]/55 bg-[#140F0C]/92 p-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#E6BE6C] uppercase">
                    <GameIcon name="scroll-unfurled" size={14} />
                    {isEn ? 'Tactical Field Guide' : 'Cẩm Nang Chiến Thuật'}
                  </span>
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={
                      isEn
                        ? `Tip ${tipIndex + 1} of ${TACTICAL_TIPS.length}`
                        : `Mẹo ${tipIndex + 1} trên ${TACTICAL_TIPS.length}`
                    }
                  >
                    {TACTICAL_TIPS.map((tip, idx) => (
                      <button
                        key={tip.title}
                        type="button"
                        onClick={() => setTipIndex(idx)}
                        aria-label={
                          isEn
                            ? `View tip ${idx + 1}: ${tip.titleEn}`
                            : `Xem mẹo ${idx + 1}: ${tip.title}`
                        }
                        aria-current={idx === tipIndex ? 'true' : undefined}
                        className="group inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 rounded-full transition-all ${
                            idx === tipIndex
                              ? 'w-4 bg-[#E6BE6C]'
                              : 'w-1.5 bg-[#806345]/65 group-hover:bg-[#C89B4B]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="font-serif-title text-sm font-bold text-[#F5EBD6]">
                  {isEn ? currentTip.titleEn : currentTip.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#D5C3A5]">
                  {isEn ? currentTip.bodyEn : currentTip.body}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {onPlayOffline ? (
                  <button
                    type="button"
                    onClick={onPlayOffline}
                    className="tqs-talisman-btn inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#F2CF84]/75 px-4 py-2 text-sm font-bold text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                  >
                    <GameIcon name="ui:bot" size={15} />
                    <span>{isEn ? 'Play vs Bots Now' : 'Chơi với Máy ngay'}</span>
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-[#EFE6D5] hover:border-[#DC2626] hover:text-[#FCA5A5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                >
                  <GameIcon name="ui:x" size={14} />
                  <span>{isEn ? 'Cancel Connection' : 'Hủy kết nối'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                role="alert"
                className="rounded-lg border border-[#DC2626]/60 bg-[#2A1212]/90 p-4"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-[#FCA5A5]">
                  <GameIcon name="ui:alert" size={15} />
                  <span>{isEn ? 'Unable to reach game server' : 'Không thể kết nối tới máy chủ phòng chơi'}</span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#EFE6D5]">
                  {lastError ??
                    (isEn
                      ? 'Connection was interrupted. Please retry or check the server address at top-right.'
                      : 'Kết nối đã bị gián đoạn. Vui lòng thử kết nối lại hoặc kiểm tra cấu hình máy chủ ở góc trên.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {onPlayOffline ? (
                  <button
                    type="button"
                    onClick={onPlayOffline}
                    className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-2 rounded-md border-[#C89B4B]/75 px-4 py-2.5 text-sm font-semibold text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                  >
                    <GameIcon name="ui:bot" size={15} />
                    <span>{isEn ? 'Play vs Bots Now' : 'Chơi với Máy ngay'}</span>
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#F2CF84]/70 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] px-5 py-2.5 text-sm font-bold text-[#FFF8ED] transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                >
                  <GameIcon name="ui:refresh" size={14} />
                  <span>{isEn ? 'Retry Connection' : 'Thử kết nối lại'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
