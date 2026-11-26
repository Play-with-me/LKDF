import { useTranslation } from 'react-i18next';
import { getUiAssetUrl } from '../../lib/assetCatalog.js';

export interface CardBackProps {
  readonly count?: number;
  readonly size?: 'xs' | 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const SIZE_MAP: Readonly<Record<'xs' | 'sm' | 'md' | 'lg', string>> = {
  xs: 'h-5 w-4 rounded-[3px]',
  sm: 'h-8 w-6 rounded',
  md: 'h-12 w-9 rounded-md',
  lg: 'h-[100px] w-[72px] rounded-lg',
};

export function CardBack({ count, size = 'sm', className = '' }: CardBackProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const customBackUrl = getUiAssetUrl('card-back');
  const isCompact = size === 'xs' || size === 'sm';

  return (
    <div
      className={[
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[#D99B26]/80 bg-[radial-gradient(circle_at_50%_45%,#1E3756_0%,#0F1B2B_90%)] shadow-sm select-none',
        SIZE_MAP[size],
        className,
      ].join(' ')}
    >
      {customBackUrl ? (
        <img
          src={customBackUrl}
          alt={isEn ? 'Card back' : 'Mặt lưng lá bài'}
          className="h-full w-full object-cover"
        />
      ) : isCompact ? (
        <svg viewBox="0 0 64 88" className="h-full w-full" aria-hidden="true">
          <rect
            x="5"
            y="5"
            width="54"
            height="78"
            rx="4"
            fill="none"
            stroke="#F6D365"
            strokeOpacity="0.65"
            strokeWidth="2.5"
          />
          <circle
            cx="32"
            cy="44"
            r="15"
            fill="#13243A"
            stroke="#F6D365"
            strokeWidth="3"
          />
          <path
            d="M23 44 C23 35, 32 31, 36 37 C40 43, 30 47, 29 52 C28 56, 36 58, 41 50"
            fill="none"
            stroke="#F6D365"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 120 170" className="h-full w-full" aria-hidden="true">
          <rect
            x="6"
            y="6"
            width="108"
            height="158"
            rx="6"
            fill="none"
            stroke="#F6D365"
            strokeOpacity="0.72"
            strokeWidth="1.8"
          />
          <path
            d="M11 25 H25 V11 M95 11 V25 H109 M11 145 H25 V159 M95 159 V145 H109"
            fill="none"
            stroke="#D99B26"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="60"
            cy="85"
            r="37"
            fill="none"
            stroke="#D99B26"
            strokeOpacity="0.38"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
          <circle
            cx="60"
            cy="85"
            r="30"
            fill="#13243A"
            stroke="#F6D365"
            strokeWidth="2.2"
          />
          <path
            d="M40 85 C40 68, 58 60, 66 72 C73 83, 56 92, 54 102 C52 108, 66 112, 78 96"
            fill="none"
            stroke="#F6D365"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="48" cy="70" r="2.2" fill="#F6D365" />
          <circle cx="72" cy="100" r="2" fill="#D99B26" />
        </svg>
      )}
      {count !== undefined ? (
        <span className="font-mono-num absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-bold text-[#F4EFE6] tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}
