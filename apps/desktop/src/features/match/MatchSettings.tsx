import { useId, type ReactNode } from 'react';

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
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5">
        {topRightExtra}
        <button
          type="button"
          popoverTarget={id}
          className="cursor-pointer rounded-lg border border-[#9A7B4F]/60 bg-[#14100D]/95 px-2.5 py-1 text-xs leading-tight font-semibold text-[#EFE6D5] hover:border-[#D99B26]"
        >
          Cài đặt
        </button>
      </div>
      <div
        id={id}
        popover="auto"
        aria-label="Cài đặt trận đấu"
        className="fixed inset-auto right-2 top-11 m-0 max-h-[calc(100dvh-3.5rem)] w-max max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border border-[#9A7B4F]/60 bg-[#14100D] p-3 text-[#EFE6D5] shadow-xl"
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
