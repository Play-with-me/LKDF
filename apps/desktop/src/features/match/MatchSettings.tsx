import { useId, type ReactNode } from 'react';
import { GameIcon } from '../../components/icons/index.js';

export function MatchQuickHudPills({
  autoSkipNullification,
  onToggleAutoSkip,
  actionLogCount,
  onOpenLog,
  onOpenRules,
  onOpenReferee,
}: {
  readonly autoSkipNullification: boolean;
  readonly onToggleAutoSkip: (next: boolean) => void;
  readonly actionLogCount: number;
  readonly onOpenLog: () => void;
  readonly onOpenRules: () => void;
  readonly onOpenReferee?: () => void;
}) {
  const pillClass =
    'inline-flex cursor-pointer items-center gap-0.5 min-[1080px]:gap-1 rounded-lg border border-[#9A7B4F]/65 bg-[#14100D]/95 px-1.5 py-0.5 text-[10px] min-[1080px]:px-2 min-[1080px]:py-1 min-[1080px]:text-[11px] leading-tight font-semibold whitespace-nowrap text-[#EFE6D5] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]';

  return (
    <>
      <button
        type="button"
        title="Tự động bỏ qua cơ hội Vô Giải Khả Kích toàn bàn"
        aria-pressed={autoSkipNullification}
        onClick={() => onToggleAutoSkip(!autoSkipNullification)}
        className={`inline-flex cursor-pointer items-center gap-0.5 min-[1080px]:gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] min-[1080px]:px-2 min-[1080px]:py-1 min-[1080px]:text-[11px] leading-tight font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
          autoSkipNullification
            ? 'border-[#D99B26] bg-[#D99B26]/20 text-[#FDE68A]'
            : 'border-[#9A7B4F]/65 bg-[#14100D]/95 text-[#D1D5DB] hover:border-[#D99B26]'
        }`}
      >
        {autoSkipNullification ? <GameIcon name="ui:check" size={10} /> : null}
        <span className="hidden min-[1160px]:inline">Tự bỏ qua Vô Giải</span>
        <span className="min-[1160px]:hidden">Bỏ Vô Giải</span>
      </button>

      <button
        type="button"
        title="Mở Nhật ký ván đấu"
        onClick={onOpenLog}
        className={pillClass}
      >
        <GameIcon name="scroll-unfurled" size={11} className="text-[#D99B26]" />
        <span>Nhật ký</span>
        <span className="font-mono-num rounded bg-[#272D35] px-1 py-0 text-[9.5px] min-[1080px]:text-[10px] font-bold text-[#FDE68A] tabular-nums">
          {actionLogCount}
        </span>
      </button>

      <button
        type="button"
        title="Xem Luật & Phím tắt"
        onClick={onOpenRules}
        className={pillClass}
      >
        <GameIcon name="ui:book-open" size={11} className="text-[#D99B26]" />
        <span>Luật</span>
      </button>

      {onOpenReferee ? (
        <button
          type="button"
          title="Mở Bảng Trọng Tài"
          onClick={onOpenReferee}
          className="inline-flex cursor-pointer items-center gap-0.5 min-[1080px]:gap-1 rounded-lg border border-[#CA9A48]/65 bg-[#1C140E]/95 px-1.5 py-0.5 text-[10px] min-[1080px]:px-2 min-[1080px]:py-1 min-[1080px]:text-[11px] leading-tight font-semibold whitespace-nowrap text-[#FDE68A] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[#FBBF24] hover:bg-[#2A1D12] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="scales" size={11} className="text-[#E6BE6C]" />
          <span>Trọng tài</span>
        </button>
      ) : null}
    </>
  );
}

export function MatchSettings({
  children,
  topRightExtra,
}: {
  readonly children: ReactNode;
  readonly error?: string | null;
  readonly topRightExtra?: ReactNode;
}) {
  const id = useId();
  return (
    <>
      <div className="absolute right-2 top-1 z-30 flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-end gap-0.5 min-[1080px]:top-1.5 min-[1080px]:gap-1">
        {topRightExtra}
        <button
          type="button"
          popoverTarget={id}
          title="Mở cài đặt bàn đấu"
          className="inline-flex cursor-pointer items-center gap-0.5 min-[1080px]:gap-1 rounded-lg border border-[#9A7B4F]/65 bg-[#14100D]/95 px-1.5 py-0.5 text-[10px] min-[1080px]:px-2 min-[1080px]:py-1 min-[1080px]:text-[11px] leading-tight font-semibold whitespace-nowrap text-[#EFE6D5] transition-colors hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:settings" size={13} className="text-[#D99B26]" />
          <span>Cài đặt</span>
        </button>
      </div>
      <div
        id={id}
        popover="auto"
        aria-label="Cài đặt trận đấu"
        className="lkdf-scroll fixed inset-auto right-2 top-10 m-0 max-h-[calc(100dvh-3.25rem)] w-max max-w-[min(460px,calc(100vw-1rem))] overflow-auto rounded-xl border border-[#C89B4B]/60 bg-[#14100D]/98 p-3 text-[#EFE6D5] shadow-[0_18px_48px_rgba(0,0,0,0.85)]"
        onClick={event => {
          if (event.target instanceof Element && event.target.closest('button')) {
            event.currentTarget.hidePopover();
          }
        }}
      >
        {children}
      </div>
    </>
  );
}
