import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_BRAND } from '@lkdf/shared';
import { GameIcon } from '../../components/icons/index.js';
import { getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import type { DesktopUpdateState } from '../../lib/types.js';

export interface GuofengPortalStageProps {
  readonly deckTotal?: number;
  readonly heroCount?: number;
  readonly serverConnected: boolean;
  readonly appVersion: string;
  readonly updateState: DesktopUpdateState;
  readonly onOpenUpdateModal: () => void;
  readonly onCheckUpdate: () => void;
  readonly onOpenStats?: () => void;
  readonly onRecheckServer?: () => void;
  readonly onPlayOffline?: () => void;
  readonly onOpenDevPreview?: () => void;
  readonly children: ReactNode;
}

interface EmberParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  amp: number;
  warm: boolean;
}

const EMBER_COUNT = 26;

function createEmbers(): EmberParticle[] {
  return Array.from({ length: EMBER_COUNT }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 1.1 + Math.random() * 1.9,
    vy: 0.00038 + Math.random() * 0.00055,
    phase: (i / EMBER_COUNT) * Math.PI * 2,
    amp: 0.0004 + Math.random() * 0.0006,
    warm: i % 3 === 0,
  }));
}

/**
 * Sân khấu Cổng Vào Tam Quốc Sát toàn màn hình (phong cách Quốc Phong vô khung):
 * giữ thoáng vùng núi non giữa màn hình, bổ sung Parallax 3 lớp nhẹ, tàn lửa
 * Xích Bích và thanh trạng thái đáy 44px.
 */
export function GuofengPortalStage({
  deckTotal = 112,
  heroCount = 25,
  serverConnected,
  appVersion,
  updateState,
  onOpenUpdateModal,
  onCheckUpdate,
  onOpenStats,
  onRecheckServer,
  onPlayOffline,
  onOpenDevPreview,
  children,
}: GuofengPortalStageProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const stageRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const lobbyBannerUrl = getUiAssetUrl('lobby-banner');
  const zhaoYunUrl = getHeroPortraitUrl('zhao_yun');
  const luBuUrl = getHeroPortraitUrl('lu_bu');

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) {
      return undefined;
    }

    const resetParallax = () => {
      stageEl.style.setProperty('--tqs-px-bg', '0px');
      stageEl.style.setProperty('--tqs-py-bg', '0px');
      stageEl.style.setProperty('--tqs-px-l', '0px');
      stageEl.style.setProperty('--tqs-py-l', '0px');
      stageEl.style.setProperty('--tqs-px-r', '0px');
      stageEl.style.setProperty('--tqs-py-r', '0px');
    };

    if (prefersReducedMotion()) {
      resetParallax();
      return undefined;
    }

    const handleMouseMove = (ev: MouseEvent) => {
      if (prefersReducedMotion()) {
        resetParallax();
        return;
      }
      const rect = stageEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const nx = ((ev.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((ev.clientY - rect.top) / rect.height - 0.5) * 2;
      stageEl.style.setProperty('--tqs-px-bg', `${(-nx * 6).toFixed(1)}px`);
      stageEl.style.setProperty('--tqs-py-bg', `${(-ny * 4).toFixed(1)}px`);
      stageEl.style.setProperty('--tqs-px-l', `${(nx * 10).toFixed(1)}px`);
      stageEl.style.setProperty('--tqs-py-l', `${(ny * 5).toFixed(1)}px`);
      stageEl.style.setProperty('--tqs-px-r', `${(nx * 13).toFixed(1)}px`);
      stageEl.style.setProperty('--tqs-py-r', `${(ny * 6).toFixed(1)}px`);
    };

    stageEl.addEventListener('mousemove', handleMouseMove);
    stageEl.addEventListener('mouseleave', resetParallax);
    return () => {
      stageEl.removeEventListener('mousemove', handleMouseMove);
      stageEl.removeEventListener('mouseleave', resetParallax);
    };
  }, []);

  useEffect(() => {
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    if (!stageEl || !canvas) {
      return undefined;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    const syncCanvasSize = () => {
      const w = stageEl.clientWidth || 1280;
      const h = stageEl.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    if (prefersReducedMotion()) {
      syncCanvasSize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return undefined;
    }

    const embers = createEmbers();
    let rafId = 0;

    const renderFrame = (now: number) => {
      syncCanvasSize();
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      if (!prefersReducedMotion()) {
        const t = now * 0.001;
        for (const e of embers) {
          e.y -= e.vy;
          e.x += Math.sin(t * 0.9 + e.phase) * e.amp;
          if (e.y < 0.05) {
            e.y = 0.96;
            e.x = Math.random();
          }
          const alpha = Math.min((e.y - 0.05) * 4, (0.96 - e.y) * 4, 1) * 0.62;
          const px = e.x * w;
          const py = e.y * h;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, e.r * 3.4);
          grad.addColorStop(
            0,
            e.warm
              ? `rgba(255, 198, 108, ${alpha})`
              : `rgba(235, 96, 56, ${alpha})`,
          );
          grad.addColorStop(1, 'rgba(235, 96, 56, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, e.r * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="relative flex flex-1 min-h-0 min-w-0 flex-col justify-between overflow-hidden bg-[#07090D] animate-lkdf-fade"
    >
      {/* Nền sơn thủy & 2 Danh tướng hai cánh với Parallax 3 lớp */}
      {lobbyBannerUrl ? (
        <div
          aria-hidden="true"
          className="tqs-parallax-layer pointer-events-none absolute -inset-4 bg-cover bg-center opacity-42"
          style={{
            backgroundImage: `url(${lobbyBannerUrl})`,
            transform:
              'translate3d(var(--tqs-px-bg, 0px), var(--tqs-py-bg, 0px), 0) scale(1.03)',
          }}
        />
      ) : null}

      {zhaoYunUrl ? (
        <div
          aria-hidden="true"
          className="tqs-parallax-layer pointer-events-none absolute -top-2 bottom-10 -left-2.5 w-[40%] overflow-hidden"
          style={{
            transform:
              'translate3d(var(--tqs-px-l, 0px), var(--tqs-py-l, 0px), 0)',
          }}
        >
          <img
            src={zhaoYunUrl}
            alt=""
            className="h-full w-full object-cover object-[50%_14%] opacity-94 brightness-110 contrast-106"
            style={{
              maskImage:
                'linear-gradient(to right, rgba(0, 0, 0, 0.96) 44%, transparent 98%)',
              WebkitMaskImage:
                'linear-gradient(to right, rgba(0, 0, 0, 0.96) 44%, transparent 98%)',
            }}
          />
        </div>
      ) : null}

      {luBuUrl ? (
        <div
          aria-hidden="true"
          className="tqs-parallax-layer pointer-events-none absolute -top-2 bottom-10 -right-2.5 w-[40%] overflow-hidden"
          style={{
            transform:
              'translate3d(var(--tqs-px-r, 0px), var(--tqs-py-r, 0px), 0)',
          }}
        >
          <img
            src={luBuUrl}
            alt=""
            className="h-full w-full object-cover object-[50%_14%] opacity-94 brightness-110 contrast-106"
            style={{
              maskImage:
                'linear-gradient(to left, rgba(0, 0, 0, 0.96) 44%, transparent 98%)',
              WebkitMaskImage:
                'linear-gradient(to left, rgba(0, 0, 0, 0.96) 44%, transparent 98%)',
            }}
          />
        </div>
      ) : null}

      {/* Vầng sương tạo chiều sâu: Mở thoáng vùng thác núi giữa, tối dịu đáy làm nổi nút */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 34%, rgba(7, 9, 13, 0.16) 0%, rgba(7, 9, 13, 0.45) 54%, rgba(7, 9, 13, 0.80) 100%), linear-gradient(180deg, rgba(7, 9, 13, 0.45) 0%, rgba(7, 9, 13, 0.08) 38%, rgba(7, 9, 13, 0.72) 82%, rgba(7, 9, 13, 0.92) 100%)',
        }}
      />

      {/* Tàn lửa chiến trường Xích Bích */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
      />

      {/* Lớp nội dung 2 cực: Tiêu đề & Triện ở trên · Cụm hành động hạ xuống 1/3 dưới */}
      <div className="relative z-[6] flex flex-1 min-h-0 flex-col items-center justify-between px-5 pt-7 pb-5 sm:px-6 sm:pt-11 sm:pb-8">
        <header className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 sm:gap-3.5">
            <span
              aria-hidden="true"
              className="tqs-stone-chop inline-flex h-9 w-7 items-center justify-center rounded-[2px] border border-[#F2CF84]/72 font-serif-title text-base font-bold text-[#F9EED9] sm:h-11 sm:w-[34px] sm:text-xl"
            >
              {GAME_BRAND.emblem}
            </span>
            <h1 className="font-serif-title text-[28px] font-bold tracking-[0.16em] text-[#FAF2E3] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] sm:text-[38px] sm:tracking-[0.18em]">
              {isEn ? GAME_BRAND.title.en : GAME_BRAND.title.vi}
            </h1>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-[#F2CF84]/92 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <span
              aria-hidden="true"
              className="h-px w-8 bg-gradient-to-r from-transparent to-[#D4A451]/75"
            />
            <span>
              {isEn
                ? `${GAME_BRAND.subtitle.en} · ${deckTotal} Cards · ${heroCount} Generals`
                : `${GAME_BRAND.title.en} · ${deckTotal} Lá · ${heroCount} Nhân vật`}
            </span>
            <span
              aria-hidden="true"
              className="h-px w-8 bg-gradient-to-l from-transparent to-[#D4A451]/75"
            />
          </div>
        </header>

        <div aria-hidden="true" className="min-h-3 flex-1" />

        {/* Cụm hành động vô khung nổi trên sương mực mềm */}
        <div
          className="w-full max-w-[470px] px-4 pt-3 pb-2 sm:px-6 sm:pt-4 sm:pb-3"
          style={{
            background:
              'radial-gradient(ellipse at 50% 55%, rgba(7, 9, 13, 0.72) 0%, rgba(7, 9, 13, 0.36) 55%, transparent 82%)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Thanh trạng thái đáy tinh gọn 44px */}
      <footer className="relative z-[6] flex h-11 shrink-0 items-center justify-between gap-3 border-t border-[#D4A451]/25 bg-[#110D0A]/90 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${
              serverConnected ? 'text-[#9DE8B8]' : 'text-[#FDE68A]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                serverConnected
                  ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                  : 'bg-[#D97706]'
              }`}
            />
            {serverConnected ? (isEn ? 'Server Ready' : 'Máy chủ sẵn sàng') : (isEn ? 'Connecting' : 'Đang kết nối')}
          </span>

          {updateState.phase === 'AVAILABLE' && updateState.latestVersion ? (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[#E6BE6C] bg-[#B8332C] px-2.5 py-0.5 font-mono-num text-[11px] font-semibold tabular-nums text-[#F4EFE6] shadow transition-colors hover:bg-[#C83E37] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:download" size={11} />
              {isEn ? `Update v${updateState.latestVersion}` : `Có bản v${updateState.latestVersion}`}
            </button>
          ) : (
            <button
              type="button"
              disabled={!serverConnected}
              title={
                serverConnected
                  ? isEn
                    ? 'Check for new updates'
                    : 'Kiểm tra phiên bản cập nhật mới'
                  : isEn
                    ? 'Wait for server connection to check updates'
                    : 'Chờ kết nối máy chủ để kiểm tra cập nhật'
              }
              onClick={onCheckUpdate}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-mono-num text-[11.5px] tabular-nums text-[#D5C3A5] transition-colors hover:text-[#FFF5DF] focus-visible:outline-2 focus-visible:outline-[#E6BE6C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GameIcon name="ui:refresh" size={10} />
              v{appVersion}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          {onPlayOffline ? (
            <button
              type="button"
              onClick={onPlayOffline}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[#C89B4B]/65 bg-[#241813]/92 px-2.5 py-1 text-xs font-semibold text-[#F5EBD6] transition-colors hover:border-[#F2CF84] hover:bg-[#6C2521] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:bot" size={12} />
              {isEn ? 'Play vs Bots' : 'Chơi với Máy'}
            </button>
          ) : null}

          {onOpenStats ? (
            <button
              type="button"
              onClick={onOpenStats}
              className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-[#E6D4B8] transition-colors hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              {isEn ? 'Match Stats' : 'Bảng Thống Kê'}
            </button>
          ) : null}

          {onRecheckServer ? (
            <button
              type="button"
              onClick={onRecheckServer}
              className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-[#E6D4B8] transition-colors hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              {isEn ? 'Check Server' : 'Kiểm tra máy chủ'}
            </button>
          ) : null}

          {import.meta.env.DEV && onOpenDevPreview ? (
            <button
              type="button"
              onClick={onOpenDevPreview}
              className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-semibold text-[#F2CF84] transition-colors hover:text-[#FFF5DF] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              {isEn ? 'Preview 8P Arena →' : 'Xem thử Bàn 8 người →'}
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
