import { useId, type ReactNode } from 'react';

export function MatchSettings({ children, error }: { children: ReactNode; error: string | null }) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        className="absolute right-2 top-2 z-30 rounded-lg border border-[#9A7B4F]/60 bg-[#14100D]/95 px-3 py-1.5 text-xs font-semibold text-[#EFE6D5] hover:border-[#D99B26]"
      >
        Cài đặt
      </button>
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
      {error ? (
        <p role="alert" className="absolute right-2 top-11 z-20 max-w-[min(320px,90vw)] rounded border border-[#DC2626]/50 bg-[#291615] px-2 py-1 text-xs text-[#FCA5A5]">
          {error}
        </p>
      ) : null}
    </>
  );
}
