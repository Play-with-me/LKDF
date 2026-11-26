import { useTranslation } from 'react-i18next';
import { setAppLocale } from '../../i18n/index.js';
import type { AppLocale } from '../../lib/devicePreferences.js';

export interface LanguageToggleProps {
  readonly className?: string;
}

export function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const current: AppLocale = i18n.language === 'en' ? 'en' : 'vi';

  const handleSelect = (next: AppLocale) => {
    if (next !== current) {
      setAppLocale(next);
    }
  };

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={`inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-[#9A7B4F]/65 bg-[#14100D]/95 p-0.5 text-[11px] font-bold ${className}`}
    >
      {(['vi', 'en'] as const).map((code) => {
        const active = current === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => handleSelect(code)}
            className={`cursor-pointer rounded-md px-2 py-0.5 uppercase transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
              active
                ? 'bg-[#8F2822] text-[#FFF8ED]'
                : 'text-[#CBB89D] hover:text-[#F5EBD6]'
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
