import { useEffect, useRef } from 'react';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';

export interface ActionLogDialogProps {
  readonly open: boolean;
  readonly actionLog: readonly string[];
  readonly onClose: () => void;
}

/**
 * Hộp thoại Nhật Ký Bàn Đấu chi tiết — chỉ mở ra khi người chơi bấm nút "Nhật ký" trên thanh đầu.
 */
export function ActionLogDialog({
  open,
  actionLog,
  onClose,
}: ActionLogDialogProps) {
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Tự động cuộn xuống diễn biến mới nhất mỗi lần mở hộp thoại hoặc có nước đi mới
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      const container = logContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, actionLog.length]);

  const entries = actionLog.slice(-60);
  const startOrdinal = Math.max(1, actionLog.length - entries.length + 1);

  return (
    <GuofengModalShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="action-log-dialog-title"
      icon="scroll-unfurled"
      title={`Nhật Ký Diễn Biến Bàn Đấu (${actionLog.length})`}
      subtitle="Hiển thị tối đa 60 diễn biến gần nhất của ván đấu hiện tại"
      maxWidthClass="max-w-xl"
      footer={
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          Quay lại bàn đấu
        </button>
      }
    >
      <div
        ref={logContainerRef}
        className="lkdf-scroll max-h-[52vh] min-h-[180px] space-y-1.5 overflow-y-auto pr-1 text-[13px] leading-relaxed text-[#EFE6D5]"
      >
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#806345]/50 bg-[#1B1410]/70 p-6 text-center text-sm text-[#B5A792]">
            Chưa có diễn biến nào trong ván đấu.
          </div>
        ) : (
          entries.map((entry, idx) => {
            const isLatest = idx === entries.length - 1;
            return (
              <div
                key={`${startOrdinal + idx}-${entry.slice(0, 18)}`}
                className={[
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2',
                  isLatest
                    ? 'border-[#C89B4B]/70 border-l-[3px] border-l-[#E6BE6C] bg-[#281D13]/95 text-[#FDE68A] shadow-sm'
                    : 'border-[#806345]/35 bg-[#1B1410]/85 text-[#E8DCC8]',
                ].join(' ')}
              >
                <span className="font-mono-num shrink-0 rounded border border-[#806345]/45 bg-[#140F0C] px-1.5 py-0.5 text-[11px] font-bold text-[#D5C3A5] tabular-nums">
                  #{startOrdinal + idx}
                </span>
                <span className="min-w-0 flex-1 break-words">{entry}</span>
              </div>
            );
          })
        )}
      </div>
    </GuofengModalShell>
  );
}
