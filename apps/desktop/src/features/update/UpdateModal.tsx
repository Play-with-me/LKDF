import { useTranslation } from 'react-i18next';
import { GAME_BRAND } from '@lkdf/shared';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';
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

function formatPublishedDate(raw: string | null, locale: 'vi' | 'en'): string | null {
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function UpdateModal({
  open,
  updateState,
  onStartUpdate,
  onRecheck,
  onInstallNow,
  onClose,
}: UpdateModalProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const isEn = locale === 'en';
  const isBusy =
    updateState.phase === 'DOWNLOADING' || updateState.phase === 'INSTALLING';
  const publishedLabel = formatPublishedDate(updateState.publishedAt, locale);
  const displayPercent = updateState.percent ?? 0;

  const title =
    updateState.phase === 'AVAILABLE'
      ? isEn
        ? `New Update Available (v${updateState.latestVersion ?? ''})!`
        : `Đã có phiên bản mới (v${updateState.latestVersion ?? ''})!`
      : updateState.phase === 'DOWNLOADING'
        ? isEn
          ? `Downloading update v${updateState.latestVersion ?? ''}`
          : `Đang tải bản cập nhật v${updateState.latestVersion ?? ''}`
        : updateState.phase === 'INSTALLING'
          ? isEn
            ? 'Installing update'
            : 'Đang cài đặt bản cập nhật'
          : updateState.phase === 'DOWNLOADED'
            ? isEn
              ? 'Update downloaded'
              : 'Đã tải xong bản cập nhật'
            : isEn
              ? 'Check for App Updates'
              : 'Kiểm tra cập nhật ứng dụng';

  const subtitle = (
    <span className="font-mono-num text-xs tabular-nums text-[#D5C3A5]">
      {isEn ? `Installed version: v${updateState.currentVersion}` : `Phiên bản đang cài: v${updateState.currentVersion}`}
      {updateState.latestVersion
        ? isEn
          ? ` → Latest: v${updateState.latestVersion}`
          : ` → Mới nhất: v${updateState.latestVersion}`
        : ''}
    </span>
  );

  const footer =
    updateState.phase === 'AVAILABLE' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:skip" size={13} />
          {isEn ? 'Later' : 'Để sau'}
        </button>
        <button
          type="button"
          onClick={onStartUpdate}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#F2CF84]/75 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] px-5 py-2 text-xs font-semibold text-[#FFF8ED] shadow transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:download" size={13} />
          {isEn ? 'Update Now' : 'Cập nhật ngay'}
        </button>
      </>
    ) : updateState.phase === 'DOWNLOADED' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:x" size={12} />
          {isEn ? 'Close' : 'Đóng'}
        </button>
        <button
          type="button"
          onClick={onInstallNow}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#86EFAC]/50 bg-[#166534] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon
            name={updateState.manualDownloadSavedPath ? 'ui:folder' : 'ui:refresh'}
            size={13}
          />
          {updateState.manualDownloadSavedPath
            ? isEn
              ? 'Open Downloaded Installer'
              : 'Mở tệp cài đặt vừa tải'
            : isEn
              ? 'Install & Restart App'
              : 'Cài đặt & Mở lại ứng dụng'}
        </button>
      </>
    ) : updateState.phase === 'ERROR' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:x" size={12} />
          {isEn ? 'Close' : 'Đóng'}
        </button>
        <button
          type="button"
          onClick={updateState.latestVersion ? onStartUpdate : onRecheck}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#F2CF84]/75 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] px-4 py-2 text-xs font-semibold text-[#FFF8ED] transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:refresh" size={13} />
          {updateState.latestVersion
            ? isEn
              ? 'Retry Download'
              : 'Thử tải lại'
            : isEn
              ? 'Check Again'
              : 'Kiểm tra lại'}
        </button>
      </>
    ) : updateState.phase === 'UP_TO_DATE' ? (
      <>
        <button
          type="button"
          onClick={onRecheck}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:refresh" size={13} />
          {isEn ? 'Check Again' : 'Kiểm tra lại'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#F2CF84]/75 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] px-4 py-2 text-xs font-semibold text-[#FFF8ED] transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          <GameIcon name="ui:x" size={12} />
          {isEn ? 'Close Dialog' : 'Đóng hộp thoại'}
        </button>
      </>
    ) : undefined;

  return (
    <GuofengModalShell
      open={open}
      onClose={onClose}
      disableClose={isBusy}
      title={title}
      subtitle={subtitle}
      icon="ui:download"
      maxWidthClass="max-w-lg"
      footer={footer}
    >
      <div className="space-y-4">
        {updateState.phase === 'CHECKING' ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#806345]/60 bg-[#1E1612] p-4 text-sm text-[#EFE6D5]">
            <GameIcon
              name="ui:loader"
              size={15}
              className="shrink-0 animate-spin text-[#E6BE6C]"
            />
            <span>
              {isEn
                ? 'Connecting to the update server to check for a new release...'
                : 'Đang kết nối tới cổng cập nhật của máy chủ để kiểm tra phiên bản mới từ kho phát hành...'}
            </span>
          </div>
        ) : null}

        {updateState.phase === 'UP_TO_DATE' ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#16A34A]/50 bg-[#12261A] p-4 text-sm text-[#A7F3D0]">
            <GameIcon name="ui:check-circle" size={16} className="shrink-0" />
            <span>
              {updateState.messageVi ??
                (isEn
                  ? `You are using the latest version (v${updateState.currentVersion}).`
                  : `Bạn đang dùng phiên bản mới nhất (v${updateState.currentVersion}).`)}
            </span>
          </div>
        ) : null}

        {updateState.phase === 'AVAILABLE' ? (
          <>
            <div className="space-y-2.5 rounded-xl border border-[#C89B4B]/55 bg-[#1D1511] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#D5C3A5]">
                <span className="font-semibold text-[#F5EBD6]">
                  {updateState.releaseName ||
                    (isEn
                      ? `Version v${updateState.latestVersion ?? ''}`
                      : `Phiên bản v${updateState.latestVersion ?? ''}`)}
                </span>
                {publishedLabel ? (
                  <span className="font-mono-num tabular-nums">{publishedLabel}</span>
                ) : null}
              </div>

              {updateState.releaseNotes ? (
                <pre className="lkdf-scroll max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[#806345]/45 bg-[#120D0A] p-3 font-sans text-xs leading-relaxed text-[#EFE6D5]">
                  {updateState.releaseNotes}
                </pre>
              ) : (
                <p className="text-xs text-[#E6D4B8]">
                  {isEn
                    ? 'A new update is ready on the server. Click below to download and upgrade automatically in one click.'
                    : 'Bản cập nhật mới đã sẵn sàng trên máy chủ. Bấm nút bên dưới để tải và nâng cấp tự động trong 1 cú nhấp chuột.'}
                </p>
              )}

              {updateState.installerName ? (
                <p className="font-mono-num text-[11px] tabular-nums text-[#D5C3A5]">
                  {isEn ? 'Installer:' : 'Tệp cài đặt:'} {updateState.installerName} (
                  {formatBytes(updateState.installerSizeBytes)})
                </p>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-[#D5C3A5]">
              {isEn
                ? 'No browser or GitHub visit needed. The app downloads, verifies SHA-512 integrity, installs, and restarts automatically.'
                : 'Bạn không cần mở trình duyệt hay vào GitHub. Ứng dụng sẽ tự tải về, kiểm tra tính toàn vẹn SHA-512, cài đặt đè và tự khởi động lại.'}
            </p>
          </>
        ) : null}

        {updateState.phase === 'DOWNLOADING' ? (
          <div className="space-y-3 rounded-xl border border-[#C89B4B]/60 bg-[#1D1511] p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-[#FDE68A]">
              <span className="inline-flex items-center gap-2">
                <GameIcon name="ui:download" size={15} />
                {isEn
                  ? `Downloading update v${updateState.latestVersion ?? ''}...`
                  : `Đang tải bản cập nhật v${updateState.latestVersion ?? ''}...`}{' '}
                <span className="font-mono-num tabular-nums">{displayPercent}%</span>
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full border border-[#806345]/45 bg-[#120D0A]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9E2B25] via-[#C89B4B] to-[#F2CF84] transition-[width] duration-150"
                style={{ width: `${Math.max(4, displayPercent)}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 font-mono-num text-xs tabular-nums text-[#D5C3A5]">
              <span>
                {formatBytes(updateState.transferredBytes)} /{' '}
                {formatBytes(updateState.totalBytes ?? updateState.installerSizeBytes)}
              </span>
              {updateState.bytesPerSecond ? (
                <span>
                  {formatBytes(updateState.bytesPerSecond)}/{isEn ? 's' : 'giây'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {updateState.phase === 'INSTALLING' ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#16A34A]/50 bg-[#12261A] p-4 text-sm text-[#A7F3D0]">
            <GameIcon
              name="ui:loader"
              size={16}
              className="shrink-0 animate-spin"
            />
            <span>
              {updateState.messageVi ??
                (isEn
                  ? `Download 100% complete! Installing and restarting ${GAME_BRAND.title.en}...`
                  : `Đã tải xong 100%! Đang cài đặt và mở lại ứng dụng ${GAME_BRAND.title.vi}...`)}
            </span>
          </div>
        ) : null}

        {updateState.phase === 'DOWNLOADED' ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#16A34A]/50 bg-[#12261A] p-4 text-xs leading-relaxed text-[#BBF7D0]">
            <GameIcon name="ui:check-circle" size={16} className="shrink-0" />
            <span>
              {updateState.messageVi ??
                (isEn
                  ? 'Update downloaded 100% and ready to install.'
                  : 'Bản cập nhật đã tải xong 100% và sẵn sàng cài đặt.')}
            </span>
          </div>
        ) : null}

        {updateState.phase === 'ERROR' ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#DC2626]/60 bg-[#2A1212] p-4 text-xs leading-relaxed text-[#FCA5A5]">
            <GameIcon name="ui:alert" size={16} className="shrink-0" />
            <span>
              {updateState.messageVi ??
                (isEn
                  ? 'Unable to check or download the update.'
                  : 'Không thể kiểm tra hoặc tải bản cập nhật.')}
            </span>
          </div>
        ) : null}
      </div>
    </GuofengModalShell>
  );
}
