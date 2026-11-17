import {
  STANDARD_DECK_TEMPLATES,
  formatRankLabel,
  formatSuitSymbol,
  isRedSuit,
} from '@lkdf/shared';
import type { CardInstance } from '@lkdf/shared';
import { getCardCategoryLabelVi } from './matchTypes.js';

const DESCRIPTION_BY_CARD_KEY: Readonly<Record<string, string>> =
  STANDARD_DECK_TEMPLATES.reduce<Record<string, string>>((acc, tpl) => {
    if (!acc[tpl.cardKey]) {
      acc[tpl.cardKey] = tpl.descriptionVi;
    }
    return acc;
  }, {});

export interface HandCardItemProps {
  readonly card: CardInstance;
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly hotkeyNumber?: number;
  readonly compact?: boolean;
  readonly onToggle: (cardId: string) => void;
}

export function HandCardItem({
  card,
  selected,
  disabled = false,
  hotkeyNumber,
  compact = false,
  onToggle,
}: HandCardItemProps) {
  const red = isRedSuit(card.suit);
  const suitSymbol = formatSuitSymbol(card.suit);
  const rankLabel = formatRankLabel(card.rank);
  const categoryLabel = getCardCategoryLabelVi(card.category, card.attackRange);
  const description = DESCRIPTION_BY_CARD_KEY[card.cardKey] ?? card.nameVi;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(card.id)}
      title={`${suitSymbol}${rankLabel} ${card.nameVi} — ${description}`}
      aria-pressed={selected}
      className={[
        'group relative flex shrink-0 flex-col justify-between rounded-lg border text-left select-none',
        'bg-[#F4EFE6] text-[#18181B] shadow-md transition-transform duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B26]',
        compact ? 'h-[144px] w-[98px] p-2' : 'h-[152px] w-[108px] p-2.5',
        selected
          ? '-translate-y-4 border-2 border-[#D99B26] ring-2 ring-[#D99B26]/60 shadow-xl z-20'
          : 'border-[#D6CFC2] hover:-translate-y-1.5 hover:border-[#D99B26]/80',
        disabled ? 'cursor-not-allowed opacity-55 hover:translate-y-0' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Góc trên: Số + Chất & Phím tắt 1..9 */}
      <div className="flex items-start justify-between gap-1">
        <div
          className={[
            'flex flex-col items-center leading-none font-bold',
            red ? 'text-[#C83E37]' : 'text-[#18181B]',
          ].join(' ')}
        >
          <span className="font-mono-num text-[14px]">{rankLabel}</span>
          <span className="text-[15px]">{suitSymbol}</span>
        </div>

        {hotkeyNumber !== undefined && hotkeyNumber >= 1 && hotkeyNumber <= 9 ? (
          <span className="font-mono-num rounded bg-[#18181B]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#18181B]/75">
            {hotkeyNumber}
          </span>
        ) : null}
      </div>

      {/* Chính giữa: Tên lá bài tiếng Việt */}
      <div className="my-auto flex items-center justify-center px-0.5 text-center">
        <span className="font-serif-title text-[15px] leading-tight font-bold text-[#18181B]">
          {card.nameVi}
        </span>
      </div>

      {/* Góc dưới: Nhãn loại bài */}
      <div className="border-t border-[#18181B]/12 pt-1 text-center">
        <span className="block truncate text-[11px] font-semibold text-[#18181B]/75">
          {categoryLabel}
        </span>
      </div>

      {/* Khung xem nhanh mô tả khi hover */}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-52 -translate-x-1/2 rounded-md border border-[#3A424C] bg-[#1E2328] p-2 text-[12px] leading-snug text-[#F3F4F6] shadow-xl group-hover:block"
        role="tooltip"
      >
        <div className="font-bold text-[#D99B26]">
          {suitSymbol}
          {rankLabel} · {card.nameVi}
        </div>
        <p className="mt-1 text-[#D1D5DB]">{description}</p>
      </div>
    </button>
  );
}
