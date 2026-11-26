import { IDENTITY_DISTRIBUTIONS, type PlayerCount } from '@lkdf/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameIcon, type GameIconName } from '../../components/icons/index.js';
import { LanguageToggle } from '../../components/ui/LanguageToggle.js';
import { useBackNavigation } from '../../lib/useBackNavigation.js';

const seatCounts = [4, 5, 6, 7, 8] as const;

const ROLE_PREVIEW_ITEMS: readonly {
  readonly key: 'lord' | 'loyalist' | 'rebel' | 'spy';
  readonly roleCode: 'LORD' | 'LOYALIST' | 'REBEL' | 'SPY';
  readonly icon: GameIconName;
  readonly badgeClass: string;
}[] = [
  {
    key: 'lord',
    roleCode: 'LORD',
    icon: 'crown',
    badgeClass: 'border-[#C89B4B]/70 bg-[#3A290F]/80 text-[#FCD34D]',
  },
  {
    key: 'loyalist',
    roleCode: 'LOYALIST',
    icon: 'bordered-shield',
    badgeClass: 'border-[#3B82F6]/60 bg-[#162C48]/80 text-[#93C5FD]',
  },
  {
    key: 'rebel',
    roleCode: 'REBEL',
    icon: 'saber-slash',
    badgeClass: 'border-[#C83E37]/70 bg-[#3D2022]/80 text-[#FCA5A5]',
  },
  {
    key: 'spy',
    roleCode: 'SPY',
    icon: 'cloak-dagger',
    badgeClass: 'border-[#A78BFA]/55 bg-[#30213E]/80 text-[#DDD6FE]',
  },
];

export function OfflineMatchSetup({
  onStart,
  onBack,
}: {
  readonly onStart: (seats: PlayerCount) => void;
  readonly onBack: () => void;
}) {
  const { t } = useTranslation();
  const [seats, setSeats] = useState<PlayerCount>(4);
  const firstRadioRef = useRef<HTMLInputElement>(null);
  useBackNavigation(true, onBack);

  useEffect(() => {
    firstRadioRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        target?.closest('button, a')
      ) {
        return;
      }
      event.preventDefault();
      onStart(seats);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onStart, seats]);

  const distribution = IDENTITY_DISTRIBUTIONS[seats];

  return (
    <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStart(seats);
        }}
        className="lkdf-bronze-bevel w-full max-w-xl rounded-xl border border-[#C89B4B]/70 p-6 text-[#EFE6D5] shadow-[0_28px_72px_rgba(0,0,0,0.88)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#D4A451]/75 bg-gradient-to-b from-[#9E2B25] to-[#6E1A16] text-[#F9EED9]"
            >
              <GameIcon name="ui:bot" size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="font-serif-title text-2xl font-bold text-[#F5EBD6] sm:text-3xl">
                {t('offlineSetup.title')}
              </h1>
              <p className="mt-0.5 text-xs text-[#D5C3A5] sm:text-sm">
                {t('offlineSetup.subtitle')}
              </p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-[#E6BE6C] uppercase">
            {t('offlineSetup.seatLegend')}
          </legend>
          <div className="grid grid-cols-5 gap-2">
            {seatCounts.map((count) => (
              <label key={count} className="cursor-pointer">
                <input
                  ref={count === 4 ? firstRadioRef : undefined}
                  type="radio"
                  name="offline-seats"
                  value={count}
                  checked={seats === count}
                  onChange={() => setSeats(count)}
                  className="peer sr-only"
                />
                <span className="font-mono-num flex min-h-11 items-center justify-center rounded-md border border-[#806345] bg-[#1D1511] px-2 py-2 text-sm font-bold text-[#EFE6D5] transition-colors peer-checked:border-[#E6BE6C] peer-checked:bg-[#6C2521] peer-checked:text-[#FFF8ED] peer-focus-visible:outline-2 peer-focus-visible:outline-[#E6BE6C] hover:border-[#C89B4B] tabular-nums">
                  {t('offlineSetup.seatOption', { count })}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2.5 text-sm font-medium text-[#EFE6D5]">
            {t('offlineSetup.lineupLabel')}{' '}
            <span className="font-semibold text-[#E6BE6C]">
              {t('offlineSetup.lineupValue', { bots: seats - 1 })}
            </span>
          </p>
        </fieldset>

        {/* Xem trước phân bổ Thân Phận theo sĩ số */}
        <div
          aria-label={t('offlineSetup.roleBalanceAria')}
          className="mt-4 rounded-lg border border-[#806345]/65 bg-[#140F0C]/90 p-3.5"
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#F5EBD6]">
              {t('offlineSetup.roleBalanceTitle', { count: seats })}
            </span>
            <span className="text-[#D5C3A5]">{t('offlineSetup.roleBalanceHint')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLE_PREVIEW_ITEMS.map((role) => {
              const count = distribution[role.key];
              return (
                <div
                  key={role.key}
                  className={`flex items-center justify-between gap-1 rounded-md border px-2 py-2 ${
                    count > 0
                      ? role.badgeClass
                      : 'border-[#806345]/35 bg-[#1A130F]/55 text-[#9B8A74] opacity-65'
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11.5px] font-semibold">
                    <GameIcon name={role.icon} size={13} />
                    <span className="truncate">{t(`roles.${role.roleCode}`)}</span>
                  </span>
                  <span className="font-mono-num shrink-0 text-sm font-bold tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <span>{t('common.backToMenu')}</span>
            <kbd className="font-mono-num rounded border border-[#806345] px-1.5 py-0.5 text-[11px] text-[#D5C3A5]">
              Esc
            </kbd>
          </button>
          <button
            type="submit"
            className="tqs-talisman-btn inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#F2CF84]/75 px-5 py-2 text-sm font-bold text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <span>{t('offlineSetup.startMatch')}</span>
            <kbd className="font-mono-num rounded border border-[#F2CF84]/45 px-1.5 py-0.5 text-[11px]">
              Enter
            </kbd>
          </button>
        </div>
      </form>
    </section>
  );
}
