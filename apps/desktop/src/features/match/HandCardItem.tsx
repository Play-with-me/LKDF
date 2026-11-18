import { useEffect, useState } from 'react';
import {
  formatRankLabel,
  formatSuitSymbol,
} from '@lkdf/shared';
import type { CardCategory, CardInstance } from '@lkdf/shared';
import { getCardArtUrl } from '../../lib/assetCatalog.js';
import {
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { getCardCategoryLabelVi, getCardDescriptionVi } from './matchTypes.js';

export function getCardFrameStyle(
  cardKey: string,
  category: CardCategory,
): {
  readonly tintBg: string;
  readonly emblemColor: string;
  readonly badgeBg: string;
} {
  if (cardKey === 'dao') {
    return {
      tintBg: 'bg-[#5C3E1A]/10 border-[#7C5828]/85',
      emblemColor: 'text-[#14532D]',
      badgeBg: 'text-[#14532D]',
    };
  }
  if (category === 'BASIC') {
    return {
      tintBg: 'bg-[#5C3E1A]/10 border-[#7C5828]/85',
      emblemColor: cardKey === 'thiem' ? 'text-[#1E3A8A]' : 'text-[#991B1B]',
      badgeBg: cardKey === 'thiem' ? 'text-[#1E3A8A]' : 'text-[#881313]',
    };
  }
  if (category === 'NORMAL_SCROLL' || category === 'DELAYED_SCROLL') {
    return {
      tintBg: 'bg-[#5C3E1A]/10 border-[#7C5828]/85',
      emblemColor: 'text-[#172554]',
      badgeBg: 'text-[#1E3A5F]',
    };
  }
  return {
    tintBg: 'bg-[#5C3E1A]/10 border-[#7C5828]/85',
    emblemColor: 'text-[#6B3410]',
    badgeBg: 'text-[#5C2D0C]',
  };
}

export interface HandCardItemProps {
  readonly card: CardInstance;
  readonly selected: boolean;
  readonly dragging?: boolean;
  readonly disabled?: boolean;
  readonly hotkeyNumber?: number;
  readonly compact?: boolean;
  readonly onToggle: (cardId: string) => void;
  readonly onPointerDownCard?: (
    card: CardInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
}

export function HandCardItem({
  card,
  selected,
  dragging = false,
  disabled = false,
  hotkeyNumber,
  compact = false,
  onToggle,
  onPointerDownCard,
}: HandCardItemProps) {
  const suitSymbol = formatSuitSymbol(card.suit);
  const rankLabel = formatRankLabel(card.rank);
  const categoryLabel = getCardCategoryLabelVi(card.category, card.attackRange);
  const description = getCardDescriptionVi(card.cardKey, card.nameVi);
  const artUrl = getCardArtUrl(card.cardKey);
  const frameStyle = getCardFrameStyle(card.cardKey, card.category);
  const [artFailed, setArtFailed] = useState<boolean>(false);

  useEffect(() => {
    setArtFailed(false);
  }, [artUrl]);

  const isRed = card.suit === 'HEART' || card.suit === 'DIAMOND';

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={
        !disabled && onPointerDownCard
          ? (event) => onPointerDownCard(card, event)
          : undefined
      }
      onClick={() => onToggle(card.id)}
      title={`${suitSymbol}${rankLabel} ${card.nameVi} — ${description} (Giữ kéo lên bàn/ghế để đánh, bấm nhẹ để chọn xem)`}
      aria-pressed={selected}
      style={{ touchAction: 'none' }}
      className={[
        'lkdf-card-parchment group relative flex shrink-0 flex-col justify-between rounded-lg text-left text-[#1D150D] shadow-[0_8px_18px_rgba(0,0,0,0.52)] transition-[transform,opacity,box-shadow,border-color] duration-150 ease-out select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B26]',
        compact
          ? 'h-[calc(var(--card-h,108px)*0.94)] w-[calc(var(--card-w,74px)*0.92)] p-1'
          : 'h-[var(--card-h,108px)] w-[var(--card-w,74px)] p-1.5',
        dragging
          ? 'scale-95 opacity-25'
          : selected
            ? 'z-20 -translate-y-2.5 border-2 border-[#D99B26] shadow-xl ring-2 ring-[#D99B26]/65'
            : 'border-[1.5px] border-[#7C5828] hover:z-15 hover:-translate-y-1.5 hover:border-[#D99B26]',
        disabled
          ? 'cursor-not-allowed opacity-55 hover:translate-y-0'
          : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
    >
      {/* Viền chỉ kép cổ thư bên trong thẻ */}
      <span className="pointer-events-none absolute inset-[3px] rounded-[5px] border border-[#5C3E1A]/25" />

      {/* Góc trên: Số + Chất SVG & Phím tắt 1..9 */}
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-1">
        <div
          className={[
            'flex items-center gap-0.5 leading-none font-bold',
            isRed ? 'text-[#A61B1B]' : 'text-[#1D150D]',
          ].join(' ')}
        >
          <span className="font-mono-num text-[clamp(10px,0.95cqw,12.5px)]">{rankLabel}</span>
          <SuitGlyph suit={card.suit} size={10} />
        </div>

        {hotkeyNumber !== undefined && hotkeyNumber >= 1 && hotkeyNumber <= 9 ? (
          <span className="font-mono-num rounded bg-[#5C3E1A]/15 px-1 py-0 text-[9px] font-bold text-[#1D150D]/80">
            {hotkeyNumber}
          </span>
        ) : null}
      </div>

      {/* Khung chính giữa: Tranh lá bài (.webp nếu có) hoặc Biểu tượng Game-icon sắc nét */}
      <div
        className={[
          'pointer-events-none relative z-10 my-1 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border-[1.5px]',
          frameStyle.tintBg,
        ].join(' ')}
      >
        {artUrl && !artFailed ? (
          <img
            src={artUrl}
            alt={card.nameVi}
            draggable={false}
            onError={() => setArtFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <GameIcon
            name={getCardGameIcon(card.cardKey)}
            size={compact ? 22 : 26}
            className={frameStyle.emblemColor}
          />
        )}
      </div>

      {/* Chân lá bài: Tên lá bài tiếng Việt & Nhãn loại */}
      <div className="pointer-events-none relative z-10 text-center">
        <div className="font-serif-title line-clamp-2 text-[clamp(8.5px,0.78cqw,10.5px)] leading-[1.12] font-bold text-[#1D150D]">
          {card.nameVi}
        </div>
        <div
          className={[
            'mt-0.5 truncate text-[clamp(7.5px,0.68cqw,9px)] font-semibold leading-tight opacity-90',
            frameStyle.badgeBg,
          ].join(' ')}
        >
          {categoryLabel}
        </div>
      </div>
    </button>
  );
}
