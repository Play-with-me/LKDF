import { useEffect, useRef } from 'react';
import { GameIcon } from '../../components/icons/index.js';

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
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Tự động cuộn xuống diễn biến mới nhất mỗi lần mở hộp thoại hoặc có nước đi mới
  useEffect(() => {
    if (!open) {
      return;
    }
    const container = logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [open, actionLog.length]);

  const entries = actionLog.slice(-60);
  const startOrdinal = Math.max(1, actionLog.length - entries.length + 1);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="action-log-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-xl rounded-xl border border-[#30363D] bg-[#1E2328] p-0 text-[#F3F4F6] shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex max-h-[82vh] flex-col">
        <div className="flex items-center justify-between border-b border-[#2D343C] px-5 py-3.5">
          <h2
            id="action-log-dialog-title"
            className="font-serif-title flex items-center gap-2 text-lg font-bold text-[#F3F4F6]"
          >
            <GameIcon name="scroll-unfurled" size={18} className="text-[#D99B26]" />
            <span>Nhật Ký Diễn Biến Bàn Đấu ({actionLog.length})</span>
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
          >
            <GameIcon name="ui:x" size={13} />
            Đóng (Esc)
          </button>
        </div>

        <div
          ref={logContainerRef}
          className="lkdf-scroll min-h-[200px] flex-1 space-y-1.5 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-[#E5E7EB]"
        >
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#3A424C] bg-[#14171A]/70 p-6 text-center text-sm text-[#9CA3AF]">
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
                      ? 'border-[#D99B26]/55 bg-[#D99B26]/10 text-[#FDE68A]'
                      : 'border-[#2D343C] bg-[#14171A]/75 text-[#D1D5DB]',
                  ].join(' ')}
                >
                  <span className="font-mono-num shrink-0 rounded bg-[#1E2328] px-1.5 py-0.5 text-[11px] font-bold text-[#9CA3AF] tabular-nums">
                    #{startOrdinal + idx}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{entry}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#2D343C] bg-[#14171A]/70 px-5 py-2.5 text-[11.5px] text-[#9CA3AF]">
          <span>Hiển thị tối đa 60 diễn biến gần nhất của ván đấu hiện tại.</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-[#3A424C] bg-[#1E2328] px-3 py-1 text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26]"
          >
            Quay lại bàn đấu
          </button>
        </div>
      </div>
    </dialog>
  );
}
