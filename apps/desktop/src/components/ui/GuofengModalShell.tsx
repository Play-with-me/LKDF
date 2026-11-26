import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getUiAssetUrl } from '../../lib/assetCatalog.js';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { GameIcon, type GameIconName } from '../icons/index.js';

export interface GuofengModalShellProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly disableClose?: boolean;
  readonly ariaLabelledBy?: string;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly icon?: GameIconName | Exclude<ReactNode, string>;
  readonly headerBadge?: ReactNode;
  readonly maxWidthClass?: string;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

export function GuofengModalShell({
  open,
  onClose,
  disableClose = false,
  ariaLabelledBy,
  title,
  subtitle,
  icon,
  headerBadge,
  maxWidthClass = 'max-w-lg',
  footer,
  children,
}: GuofengModalShellProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const generatedTitleId = useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const reducedMotion = prefersReducedMotion();

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
    event.preventDefault();
    if (!disableClose) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      onCancel={handleDialogCancel}
      onClick={(event) => {
        if (!disableClose && event.target === dialogRef.current) {
          onClose();
        }
      }}
      className={`lkdf-dialog lkdf-modal-dialog m-auto w-[calc(100vw-24px)] ${maxWidthClass} max-h-[min(88vh,calc(100vh-24px))] overflow-hidden p-0`}
    >
      <div
        className="relative flex max-h-[min(88vh,calc(100vh-24px))] min-h-0 flex-col overflow-hidden rounded-[inherit]"
        style={
          inkBaseUrl
            ? {
                backgroundImage: `linear-gradient(168deg, rgba(22, 17, 14, 0.94) 0%, rgba(14, 11, 9, 0.97) 100%), url(${inkBaseUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* 4 góc chạm đồng cổ */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1.5 left-1.5 z-20 h-2.5 w-2.5 border-t border-l border-[#E6BE6C]/70"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1.5 right-1.5 z-20 h-2.5 w-2.5 border-t border-r border-[#E6BE6C]/70"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 h-2.5 w-2.5 border-b border-l border-[#E6BE6C]/70"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-1.5 bottom-1.5 z-20 h-2.5 w-2.5 border-r border-b border-[#E6BE6C]/70"
        />

        {/* Đầu hộp thoại cố định */}
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[#806345]/50 bg-[#1B1410]/95 px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {icon !== undefined && icon !== null ? (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-[#D4A451]/75 bg-gradient-to-b from-[#9E2B25] to-[#6E1A16] text-[#F9EED9] shadow-inner"
              >
                {typeof icon === 'string' ? (
                  <GameIcon name={icon as GameIconName} size={16} />
                ) : (
                  icon
                )}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-serif-title truncate text-base font-bold text-[#F5EBD6] sm:text-lg"
              >
                {title}
              </h2>
              {subtitle ? (
                <div className="mt-0.5 text-xs text-[#D5C3A5]">{subtitle}</div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerBadge ?? null}
            {!disableClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={isEn ? 'Close dialog' : 'Đóng hộp thoại'}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#806345]/80 bg-[#231A14] px-2.5 py-1 text-xs font-medium text-[#EFE6D5] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
              >
                <GameIcon name="ui:x" size={12} />
                <span>{isEn ? 'Close' : 'Đóng'}</span>
              </button>
            ) : null}
          </div>
        </header>

        {/* Thân cuộn nội bộ */}
        <div className="lkdf-scroll relative z-10 flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
          {children}
        </div>

        {/* Chân hộp thoại cố định */}
        {footer ? (
          <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-[#806345]/50 bg-[#120E0B]/96 px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
