import { getCuuChauFactionDisplay, type HeroFaction } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';

export interface FactionSealProps {
  readonly faction: HeroFaction;
  readonly size?: 'xs' | 'sm' | 'md';
  readonly className?: string;
}

const SIZE_CLASSES: Readonly<Record<'xs' | 'sm' | 'md', string>> = {
  xs: 'h-4 w-4 text-[10px]',
  sm: 'h-5 w-5 text-[11px]',
  md: 'h-6 w-6 text-[13px]',
};

export function FactionSeal({
  faction,
  size = 'sm',
  className = '',
}: FactionSealProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const def = getCuuChauFactionDisplay(faction, locale);

  return (
    <span
      title={def.name}
      aria-label={def.name}
      style={{
        backgroundColor: def.palette.bg,
        borderColor: def.palette.border,
        color: def.palette.text,
      }}
      className={[
        'font-serif-title inline-flex shrink-0 items-center justify-center rounded border font-bold leading-none select-none shadow-inner',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {def.emblem}
    </span>
  );
}
