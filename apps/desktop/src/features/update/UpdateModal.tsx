import { useEffect, useRef } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import type { DesktopUpdateState } from '../../lib/types.js';

export interface UpdateModalProps {
  readonly open: boolean;
  readonly updateState: DesktopUpdateState;
  readonly onStartUpdate: () => void;
  readonly onRecheck: () => void;
  readonly onInstallNow: () => void;
  readonly onClose: () => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return '0 MB';
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPublishedDate(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString('vi-VN');
}

export function UpdateModal({
  open,
  updateState,
  onStartUpdate,
  onRecheck,
  onInstallNow,
  onClose,
}: UpdateModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const isBusy =
    updateState.phase === 'DOWNLOADING' || updateState.phase === 'INSTALLING';

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

  function handleDialogCancel(event: React.SyntheticEvent<HTMLDialogElement>): void {
    if (isBusy) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    onClose();
  }

  const publishedLabel = formatPublishedDate(updateState.publishedAt);
  const displayPercent = updateState.percent ?? 0;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleDialogCancel}
      onClick={(event) => {
        if (!isBusy && event.target === dialogRef.current) {
          onClose();
        }
      }}
      className="lkdf-dialog m-auto w-full max-w-lg max-h-[85vh] rounded-2xl border border-[#D99B26]/70 bg-[#1E2328] p-0 text-[#F3F4F6] shadow-2xl"
    >
      <div className="flex max-h-[85vh] flex-col">
        {/* Đầu hộp thoại */}
        <div className="flex items-center justify-between border-b border-[#2D343C] px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D99B26]/60 bg-[#C83E37] text-sm font-bold text-[#F4EFE6]">
              <GameIcon name="ui:download" size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-serif-title text-base font-bold text-[#F3F4F6]">
                {updateState.phase === 'AVAILABLE'
                  ? `Đã có phiên bản mới (v${updateState.latestVersion ?? ''})!`
                  : updateState.phase === 'DOWNLOADING'
                    ? `Đang tải bản cập nhật v${updateState.latestVersion ?? ''}`
                    : updateState.phase === 'INSTALLING'
                      ? 'Đang cài đặt bản cập nhật'
                      : updateState.phase === 'DOWNLOADED'
                        ? 'Đã tải xong bản cập nhật'
                        : 'Kiểm tra cập nhật ứng dụng'}
              </h2>
              <p className="font-mono-num text-xs tabular-nums text-[#9CA3AF]">
                Phiên bản đang cài: v{updateState.currentVersion}
                {updateState.latestVersion
                  ? ` → Mới nhất: v${updateState.latestVersion}`
                  : ''}
              </p>
            </div>
          </div>

          {!isBusy ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại cập nhật"
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-2.5 py-1 text-xs text-[#D1D5DB] hover:border-[#D99B26]"
            >
              <GameIcon name="ui:x" size={12} />
              Đóng
            </button>
          ) : null}
        </div>

        {/* Nội dung chính */}
        <div className="lkdf-scroll flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {updateState.phase === 'CHECKING' ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#30363D] bg-[#14171A] p-4 text-sm text-[#D1D5DB]">
              <GameIcon name="ui:loader" size={15} className="animate-spin text-[#D99B26]" />
              Đang kết nối tới cổng cập nhật của máy chủ để kiểm tra phiên bản mới từ kho phát hành...
            </div>
          ) : null}

          {updateState.phase === 'UP_TO_DATE' ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/50 bg-[#16A34A]/10 p-4 text-sm text-[#86EFAC]">
              <GameIcon name="ui:check-circle" size={16} className="shrink-0" />
              <span>{updateState.messageVi ?? `Bạn đang dùng phiên bản mới nhất (v${updateState.currentVersion}).`}</span>
            </div>
          ) : null}

          {updateState.phase === 'AVAILABLE' ? (
            <>
              <div className="rounded-xl border border-[#D99B26]/40 bg-[#14171A] p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CA3AF]">
                  <span>
                    {updateState.releaseName || `Phiên bản v${updateState.latestVersion ?? ''}`}
                  </span>
                  {publishedLabel ? <span>{publishedLabel}</span> : null}
                </div>

                {updateState.releaseNotes ? (
                  <pre className="lkdf-scroll max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[#2D343C] bg-[#1E2328] p-3 font-sans text-xs leading-relaxed text-[#E5E7EB]">
                    {updateState.releaseNotes}
                  </pre>
                ) : (
                  <p className="text-xs text-[#D1D5DB]">
                    Bản cập nhật mới đã sẵn sàng trên máy chủ. Bấm nút bên dưới để tải và nâng cấp tự động trong 1 cú nhấp chuột.
                  </p>
                )}

                {updateState.installerName ? (
                  <p className="font-mono-num text-[11px] tabular-nums text-[#9CA3AF]">
                    Tệp cài đặt: {updateState.installerName} (
                    {formatBytes(updateState.installerSizeBytes)})
                  </p>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-[#D1D5DB]">
                Bạn không cần mở trình duyệt hay vào GitHub. Ứng dụng sẽ tự tải về, kiểm tra tính toàn vẹn SHA-512, cài đặt đè và tự khởi động lại.
              </p>
            </>
          ) : null}

          {updateState.phase === 'DOWNLOADING' ? (
            <div className="rounded-xl border border-[#D99B26]/50 bg-[#14171A] p-4 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-[#FDE68A]">
                <span className="inline-flex items-center gap-2">
                  <GameIcon name="ui:download" size={15} />
                  Đang tải bản cập nhật v{updateState.latestVersion ?? ''}...{' '}
                  <span className="font-mono-num tabular-nums">{displayPercent}%</span>
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-[#2D343C]">
                <div
                  className="h-full rounded-full bg-[#D99B26] transition-[width] duration-150"
                  style={{ width: `${Math.max(4, displayPercent)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 font-mono-num text-xs tabular-nums text-[#9CA3AF]">
                <span>
                  {formatBytes(updateState.transferredBytes)} /{' '}
                  {formatBytes(updateState.totalBytes ?? updateState.installerSizeBytes)}
                </span>
                {updateState.bytesPerSecond ? (
                  <span>{formatBytes(updateState.bytesPerSecond)}/giây</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {updateState.phase === 'INSTALLING' ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/50 bg-[#16A34A]/15 p-4 text-sm text-[#86EFAC]">
              <GameIcon name="ui:loader" size={16} className="animate-spin shrink-0" />
              <span>{updateState.messageVi ?? 'Đã tải xong 100%! Đang cài đặt và mở lại ứng dụng Tam Quốc Sát LKDF...'}</span>
            </div>
          ) : null}

          {updateState.phase === 'DOWNLOADED' ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/50 bg-[#16A34A]/15 p-4 text-xs leading-relaxed text-[#BBF7D0]">
              <GameIcon name="ui:check-circle" size={16} className="shrink-0" />
              <span>{updateState.messageVi ?? 'Bản cập nhật đã tải xong 100% và sẵn sàng cài đặt.'}</span>
            </div>
          ) : null}

          {updateState.phase === 'ERROR' ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#DC2626]/60 bg-[#DC2626]/15 p-4 text-xs leading-relaxed text-[#FCA5A5]">
              <GameIcon name="ui:alert" size={16} className="shrink-0" />
              <span>{updateState.messageVi ?? 'Không thể kiểm tra hoặc tải bản cập nhật.'}</span>
            </div>
          ) : null}
        </div>

        {/* Thanh nút hành động cụ thể */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#2D343C] bg-[#181C20] px-6 py-4">
          {updateState.phase === 'AVAILABLE' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#D99B26]"
              >
                <GameIcon name="ui:skip" size={13} />
                Để sau
              </button>
              <button
                type="button"
                onClick={onStartUpdate}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-5 py-2 text-xs font-semibold text-[#F4EFE6] shadow transition-colors hover:bg-[#D94A42] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
              >
                <GameIcon name="ui:download" size={13} />
                Cập nhật ngay
              </button>
            </>
          ) : null}

          {updateState.phase === 'DOWNLOADED' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#D99B26]"
              >
                <GameIcon name="ui:x" size={12} />
                Đóng
              </button>
              <button
                type="button"
                onClick={onInstallNow}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#16A34A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15803D]"
              >
                <GameIcon
                  name={updateState.manualDownloadSavedPath ? 'ui:folder' : 'ui:refresh'}
                  size={13}
                />
                {updateState.manualDownloadSavedPath
                  ? 'Mở tệp cài đặt vừa tải'
                  : 'Cài đặt & Mở lại ứng dụng'}
              </button>
            </>
          ) : null}

          {updateState.phase === 'ERROR' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-xs font-medium text-[#D1D5DB]"
              >
                <GameIcon name="ui:x" size={12} />
                Đóng
              </button>
              <button
                type="button"
                onClick={updateState.latestVersion ? onStartUpdate : onRecheck}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-4 py-2 text-xs font-semibold text-[#F4EFE6] hover:bg-[#D94A42]"
              >
                <GameIcon name="ui:refresh" size={13} />
                {updateState.latestVersion ? 'Thử tải lại' : 'Kiểm tra lại'}
              </button>
            </>
          ) : null}

          {updateState.phase === 'UP_TO_DATE' ? (
            <>
              <button
                type="button"
                onClick={onRecheck}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#D99B26]"
              >
                <GameIcon name="ui:refresh" size={13} />
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-4 py-2 text-xs font-semibold text-[#F4EFE6] hover:bg-[#D94A42]"
              >
                <GameIcon name="ui:x" size={12} />
                Đóng hộp thoại
              </button>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
