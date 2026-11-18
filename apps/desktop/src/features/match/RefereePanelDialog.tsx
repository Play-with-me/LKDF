import type { RefereeActionType, RefereeAuditEntry, RoomState } from '@lkdf/shared';
import { useEffect, useRef, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';

export interface RefereePanelDialogProps {
  readonly open: boolean;
  readonly roomState: RoomState;
  readonly currentUserId: string;
  readonly refereeAuditLog: readonly RefereeAuditEntry[];
  readonly onSendRefereeAction: (actionType: RefereeActionType) => void;
  readonly onClose: () => void;
}

const ACTION_LABELS: Record<RefereeActionType, string> = {
  PAUSE: 'Tạm dừng đồng hồ',
  RESUME: 'Tiếp tục đồng hồ',
  UNDO_ONE_STEP: 'Hoàn tác 1 bước vừa đánh',
  SKIP_PHASE: 'Bỏ qua pha đang chờ',
  ABORT_MATCH: 'Kết thúc ván & Về phòng chờ',
};

function formatAuditTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RefereePanelDialog({
  open,
  roomState,
  currentUserId,
  refereeAuditLog,
  onSendRefereeAction,
  onClose,
}: RefereePanelDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [confirmingAbort, setConfirmingAbort] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isActingHost = roomState.actingHostUserId === currentUserId;
  const hostSeat = roomState.seats.find((seat) => seat.userId === roomState.ownerUserId);
  const actingHostSeat = roomState.seats.find(
    (seat) => seat.userId === roomState.actingHostUserId,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      setConfirmingAbort(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !roomState.hostDisconnectedAt) {
      return undefined;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [open, roomState.hostDisconnectedAt]);

  let takeoverRemainingSeconds: number | null = null;
  if (roomState.hostDisconnectedAt) {
    const disconnectedAtMs = Date.parse(roomState.hostDisconnectedAt);
    if (!Number.isNaN(disconnectedAtMs)) {
      const elapsedSec = Math.floor((nowMs - disconnectedAtMs) / 1000);
      takeoverRemainingSeconds = Math.max(0, 30 - elapsedSec);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="referee-panel-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-xl rounded-xl border border-[#30363D] bg-[#1E2328] p-0 text-[#F3F4F6] shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between border-b border-[#2D343C] px-5 py-3.5">
          <div>
            <h2 id="referee-panel-title" className="font-serif-title flex items-center gap-2 text-lg font-bold text-[#F3F4F6]">
              <GameIcon name="scales" size={18} className="text-[#D99B26]" />
              Bảng Trọng Tài Phòng #{roomState.roomCode}
            </h2>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              Trọng tài hiện tại: <strong className="text-[#D99B26]">{actingHostSeat?.displayName ?? 'Đang cập nhật'}</strong>
              {roomState.actingHostUserId !== roomState.ownerUserId ? ' (Chủ phòng tạm thời)' : ' (Chủ phòng)'}
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
          >
            <GameIcon name="ui:x" size={13} />
            Đóng bảng (Esc)
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {roomState.hostDisconnectedAt ? (
            <div className="flex items-start gap-2 rounded-lg border border-[#D97706]/50 bg-[#D97706]/15 px-3.5 py-2.5 text-xs text-[#FDE68A]">
              <GameIcon name="ui:alert" size={15} className="mt-0.5 shrink-0" />
              <div>
                Chủ phòng gốc ({hostSeat?.displayName ?? 'Chủ phòng'}) đang mất kết nối.{' '}
                {takeoverRemainingSeconds !== null && takeoverRemainingSeconds > 0 ? (
                  <span className="font-mono-num font-bold tabular-nums">
                    Chuyển quyền Trọng Tài tạm thời sau {takeoverRemainingSeconds}s.
                  </span>
                ) : (
                  <span>Quyền Trọng Tài tạm thời đã được kích hoạt cho người kế tiếp.</span>
                )}
              </div>
            </div>
          ) : null}

          {!isActingHost ? (
            <div className="rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]">
              Chỉ Chủ phòng (hoặc Chủ phòng tạm thời khi Chủ phòng mất mạng &gt;30s) mới được bấm các nút này
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              disabled={!isActingHost}
              onClick={() => {
                onSendRefereeAction(roomState.isTimerPaused ? 'RESUME' : 'PAUSE');
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2.5 text-left text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GameIcon name={roomState.isTimerPaused ? 'ui:play' : 'ui:pause'} size={14} className="text-[#D99B26]" />
              {roomState.isTimerPaused ? 'Tiếp tục đồng hồ' : 'Tạm dừng đồng hồ'}
            </button>

            <button
              type="button"
              disabled={!isActingHost}
              onClick={() => {
                onSendRefereeAction('UNDO_ONE_STEP');
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2.5 text-left text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GameIcon name="ui:undo" size={14} className="text-[#D99B26]" />
              Hoàn tác 1 bước vừa đánh
            </button>

            <button
              type="button"
              disabled={!isActingHost}
              onClick={() => {
                onSendRefereeAction('SKIP_PHASE');
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2.5 text-left text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GameIcon name="ui:skip" size={14} className="text-[#D99B26]" />
              Bỏ qua pha đang chờ
            </button>

            {!confirmingAbort ? (
              <button
                type="button"
                disabled={!isActingHost}
                onClick={() => setConfirmingAbort(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#C83E37]/60 bg-[#C83E37]/15 px-3.5 py-2.5 text-left text-xs font-semibold text-[#FCA5A5] hover:bg-[#C83E37]/25 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <GameIcon name="ui:flag" size={14} />
                Kết thúc ván &amp; Về phòng chờ
              </button>
            ) : (
              <div className="col-span-full rounded-lg border border-[#DC2626] bg-[#DC2626]/15 p-3">
                <p className="text-xs font-semibold text-[#FCA5A5]">
                  Xác nhận hủy ván đấu hiện tại và đưa toàn bộ người chơi về phòng chờ?
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingAbort(false);
                      onSendRefereeAction('ABORT_MATCH');
                      onClose();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#DC2626]"
                  >
                    <GameIcon name="ui:flag" size={13} />
                    Kết thúc ván &amp; Về phòng chờ ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingAbort(false)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-semibold text-[#D1D5DB] hover:border-[#D99B26]"
                  >
                    <GameIcon name="ui:undo" size={13} />
                    Giữ nguyên ván đấu
                  </button>
                </div>
              </div>
            )}
          </div>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Nhật ký thao tác Trọng Tài (Công khai toàn bàn)
            </h3>
            {refereeAuditLog.length === 0 ? (
              <div className="mt-2 rounded-lg border border-[#2D343C] bg-[#14171A] px-3.5 py-3 text-xs text-[#9CA3AF]">
                Chưa có thao tác Trọng Tài nào trong ván đấu này.
              </div>
            ) : (
              <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-[#2D343C] bg-[#14171A] p-3 text-xs">
                {refereeAuditLog.map((entry, idx) => (
                  <li
                    key={`${entry.timestamp}-${entry.actorUserId}-${idx}`}
                    className="flex items-center justify-between gap-2 border-b border-[#2D343C]/60 pb-1.5 last:border-b-0 last:pb-0"
                  >
                    <span className="text-[#E5E7EB]">
                      <strong className="text-[#D99B26]">{entry.actorName}</strong>:{' '}
                      {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                    </span>
                    <span className="shrink-0 font-mono-num text-[11px] tabular-nums text-[#9CA3AF]">
                      {formatAuditTime(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
}
