import type { RefereeActionType, RefereeAuditEntry, RoomState } from '@lkdf/shared';
import { useEffect, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';

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
  const [confirmingAbort, setConfirmingAbort] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isActingHost = roomState.actingHostUserId === currentUserId;
  const hostSeat = roomState.seats.find((seat) => seat.userId === roomState.ownerUserId);
  const actingHostSeat = roomState.seats.find(
    (seat) => seat.userId === roomState.actingHostUserId,
  );

  useEffect(() => {
    if (open) {
      setConfirmingAbort(false);
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

  const subtitle = (
    <span>
      Trọng tài hiện tại:{' '}
      <strong className="text-[#E6BE6C]">{actingHostSeat?.displayName ?? 'Đang cập nhật'}</strong>
      {roomState.actingHostUserId !== roomState.ownerUserId ? ' (Chủ phòng tạm thời)' : ' (Chủ phòng)'}
    </span>
  );

  return (
    <GuofengModalShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="referee-panel-title"
      icon="scales"
      title={`Bảng Trọng Tài Phòng #${roomState.roomCode}`}
      subtitle={subtitle}
      maxWidthClass="max-w-xl"
      footer={
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          Đóng bảng (Esc)
        </button>
      }
    >
      <div className="space-y-4 text-sm text-[#EFE6D5]">
        {roomState.hostDisconnectedAt ? (
          <div className="flex items-start gap-2 rounded-lg border border-[#D97706]/55 bg-[#2E1B0E] px-3.5 py-2.5 text-xs text-[#FDE68A]">
            <GameIcon name="ui:alert" size={15} className="mt-0.5 shrink-0 text-[#FBBF24]" />
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
          <div className="rounded-lg border border-[#DC2626]/45 bg-[#3B1312]/70 px-3.5 py-2.5 text-xs text-[#FCA5A5]">
            Chỉ Chủ phòng (hoặc Chủ phòng tạm thời khi Chủ phòng mất mạng &gt;30s) mới được bấm các
            nút này
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => {
              onSendRefereeAction(roomState.isTimerPaused ? 'RESUME' : 'PAUSE');
            }}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <GameIcon
              name={roomState.isTimerPaused ? 'ui:play' : 'ui:pause'}
              size={14}
              className="text-[#E6BE6C]"
            />
            {roomState.isTimerPaused ? 'Tiếp tục đồng hồ' : 'Tạm dừng đồng hồ'}
          </button>

          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => {
              onSendRefereeAction('UNDO_ONE_STEP');
            }}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <GameIcon name="ui:undo" size={14} className="text-[#E6BE6C]" />
            Hoàn tác 1 bước vừa đánh
          </button>

          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => {
              onSendRefereeAction('SKIP_PHASE');
            }}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <GameIcon name="ui:skip" size={14} className="text-[#E6BE6C]" />
            Bỏ qua pha đang chờ
          </button>

          {!confirmingAbort ? (
            <button
              type="button"
              disabled={!isActingHost}
              onClick={() => setConfirmingAbort(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#C83E37]/65 bg-[#3B1312]/80 px-3.5 py-2.5 text-left text-xs font-semibold text-[#FCA5A5] transition-colors hover:border-[#EF4444] hover:bg-[#4F1918] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GameIcon name="ui:flag" size={14} />
              Kết thúc ván &amp; Về phòng chờ
            </button>
          ) : (
            <div className="col-span-full rounded-lg border border-[#DC2626] bg-[#3B1312]/85 p-3">
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#9E2B25] px-3 py-1.5 text-xs font-bold text-[#FFF5EC] hover:bg-[#B8322B]"
                >
                  <GameIcon name="ui:flag" size={13} />
                  Kết thúc ván &amp; Về phòng chờ ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingAbort(false)}
                  className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  <GameIcon name="ui:undo" size={13} />
                  Giữ nguyên ván đấu
                </button>
              </div>
            </div>
          )}
        </div>

        <section>
          <h3 className="text-xs font-bold tracking-wider text-[#D5C3A5] uppercase">
            Nhật ký thao tác Trọng Tài (Công khai toàn bàn)
          </h3>
          {refereeAuditLog.length === 0 ? (
            <div className="mt-2 rounded-lg border border-[#806345]/45 bg-[#1B1410] px-3.5 py-3 text-xs text-[#B5A792]">
              Chưa có thao tác Trọng Tài nào trong ván đấu này.
            </div>
          ) : (
            <ul className="lkdf-scroll mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-[#806345]/45 bg-[#1B1410] p-3 text-xs">
              {refereeAuditLog.map((entry, idx) => (
                <li
                  key={`${entry.timestamp}-${entry.actorUserId}-${idx}`}
                  className="flex items-center justify-between gap-2 border-b border-[#806345]/25 pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="text-[#E8DCC8]">
                    <strong className="text-[#E6BE6C]">{entry.actorName}</strong>:{' '}
                    {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                  </span>
                  <span className="shrink-0 font-mono-num text-[11px] tabular-nums text-[#B5A792]">
                    {formatAuditTime(entry.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </GuofengModalShell>
  );
}
