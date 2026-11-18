import type { Suit } from '@lkdf/shared';

export interface SuitGlyphProps {
  readonly suit: Suit;
  readonly size?: number;
  readonly tone?: 'lightCard' | 'darkSurface';
  readonly className?: string;
}

export function SuitGlyph({
  suit,
  size = 14,
  tone = 'lightCard',
  className = '',
}: SuitGlyphProps) {
  const isRed = suit === 'HEART' || suit === 'DIAMOND';
  const colorClass =
    tone === 'darkSurface'
      ? isRed
        ? 'text-[#FCA5A5]'
        : 'text-[#EFE6D5]'
      : isRed
        ? 'text-[#C83E37]'
        : 'text-[#18181B]';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`inline-block shrink-0 ${colorClass} ${className}`}
    >
      {suit === 'SPADE' ? (
        <path d="M12 2C9 6.5 4 10 4 14.5C4 17.5 6.3 19.5 8.8 19.5C10.1 19.5 11.2 18.9 11.7 18.1L10.3 22H13.7L12.3 18.1C12.8 18.9 13.9 19.5 15.2 19.5C17.7 19.5 20 17.5 20 14.5C20 10 15 6.5 12 2Z" />
      ) : null}
      {suit === 'HEART' ? (
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
      ) : null}
      {suit === 'DIAMOND' ? (
        <path d="M12 2L20 12L12 22L4 12L12 2Z" />
      ) : null}
      {suit === 'CLUB' ? (
        <path d="M12 2.5C9.6 2.5 7.8 4.3 7.8 6.6C7.8 8.2 8.6 9.6 9.8 10.3C6.8 10.1 4.5 12.2 4.5 15C4.5 17.5 6.5 19.5 9 19.5C10.3 19.5 11.3 18.9 11.8 18.1L10.4 22H13.6L12.2 18.1C12.7 18.9 13.7 19.5 15 19.5C17.5 19.5 19.5 17.5 19.5 15C19.5 12.2 17.2 10.1 14.2 10.3C15.4 9.6 16.2 8.2 16.2 6.6C16.2 4.3 14.4 2.5 12 2.5Z" />
      ) : null}
    </svg>
  );
}
