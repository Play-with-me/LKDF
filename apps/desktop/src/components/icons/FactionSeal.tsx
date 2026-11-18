import type { HeroFaction } from '@lkdf/shared';

export interface FactionSealProps {
  readonly faction: HeroFaction;
  readonly size?: 'xs' | 'sm' | 'md';
  readonly className?: string;
}

const FACTION_META: Readonly<
  Record<
    HeroFaction,
    {
      readonly hanzi: string;
      readonly labelVi: string;
      readonly bg: string;
      readonly border: string;
      readonly text: string;
    }
  >
> = {
  SHU: {
    hanzi: '蜀',
    labelVi: 'Thục',
    bg: '#4E1816',
    border: '#C83E37',
    text: '#FCA5A5',
  },
  WEI: {
    hanzi: '魏',
    labelVi: 'Ngụy',
    bg: '#132746',
    border: '#3B82F6',
    text: '#93C5FD',
  },
  WU: {
    hanzi: '吳',
    labelVi: 'Ngô',
    bg: '#0E3427',
    border: '#10B981',
    text: '#6EE7B7',
  },
  QUN: {
    hanzi: '群',
    labelVi: 'Quần',
    bg: '#262A30',
    border: '#9CA3AF',
    text: '#E5E7EB',
  },
};

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
  const meta = FACTION_META[faction];
  return (
    <span
      title={`Thế lực ${meta.labelVi}`}
      aria-label={`Thế lực ${meta.labelVi}`}
      style={{
        backgroundColor: meta.bg,
        borderColor: meta.border,
        color: meta.text,
      }}
      className={[
        'font-serif-title inline-flex shrink-0 items-center justify-center rounded border font-bold leading-none select-none shadow-inner',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {meta.hanzi}
    </span>
  );
}
