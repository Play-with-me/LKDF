import { cardHover } from './MatchHoverTooltip.js';
import { useEffect, useState } from 'react';
import {
  formatRankLabel,
} from '@lkdf/shared';
import type { CardCategory, CardInstance } from '@lkdf/shared';
import { getCardArtUrl } from '../../lib/assetCatalog.js';
import {
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { getCardCategoryLabelVi } from './matchTypes.js';

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
      tintBg: 'bg-[#12161E]',
      emblemColor: 'text-[#86EFAC]',
      badgeBg: 'text-[#86EFAC]',
    };
  }
  if (category === 'BASIC') {
    return {
      tintBg: 'bg-[#12161E]',
      emblemColor: cardKey === 'thiem' ? 'text-[#93C5FD]' : 'text-[#FCA5A5]',
      badgeBg: 'text-[#CFA661]',
    };
  }
  if (category === 'NORMAL_SCROLL' || category === 'DELAYED_SCROLL') {
    return {
      tintBg: 'bg-[#12161E]',
      emblemColor: 'text-[#FDE68A]',
      badgeBg: 'text-[#CFA661]',
    };
  }
  return {
    tintBg: 'bg-[#12161E]',
    emblemColor: 'text-[#E6BE6C]',
    badgeBg: 'text-[#CFA661]',
  };
}

export interface PlayingCardFaceProps {
  readonly card: CardInstance;
  readonly hotkeyNumber?: number;
  readonly compact?: boolean;
  readonly showCategoryTag?: boolean;
}

/**
 * Mặt lá bài Mẫu B (Chiến Tranh Hiện Đại — kiểu Gwent):
 * Cột Số + Chất dọc góc trên-trái, tranh tràn nửa trên chuyển mờ mượt xuống bảng tên đá tối.
 */
export function PlayingCardFace({
  card,
  hotkeyNumber,
  compact = false,
  showCategoryTag = true,
}: PlayingCardFaceProps) {

  const rankLabel = formatRankLabel(card.rank);
  const categoryLabel = getCardCategoryLabelVi(card.category, card.attackRange);
  const artUrl = getCardArtUrl(card.cardKey);
  const frameStyle = getCardFrameStyle(card.cardKey, card.category);
  const [artFailed, setArtFailed] = useState<boolean>(false);

  useEffect(() => {
    setArtFailed(false);
  }, [artUrl]);

  const isRed = card.suit === 'HEART' || card.suit === 'DIAMOND';
  const isLongName = card.nameVi.length > 13;

  return (
    <>
      <span hidden {...cardHover(card)} />
      {/* Góc trên-trái: Cột Số + Chất bài dọc (đọc rõ ngay cả khi xòe nhiều lá) */}
      <div
        className={[
          'pointer-events-none absolute top-1 left-1 z-20 flex w-[18px] flex-col items-center rounded-[4px] border border-[#C8A864]/65 bg-[#0E1218]/92 px-[2px] py-[2px] leading-none shadow-md',
          isRed ? 'text-[#FCA5A5]' : 'text-[#F1F5F9]',
        ].join(' ')}
      >
        <span className="font-mono-num text-[clamp(9.5px,0.88cqw,11.5px)] font-extrabold tracking-tight">
          {rankLabel}
        </span>
        <SuitGlyph suit={card.suit} size={10} tone="darkSurface" className="mt-0.5" />
      </div>

      {/* Góc trên-phải: Phím tắt chọn nhanh 1..9 */}
      {hotkeyNumber !== undefined && hotkeyNumber >= 1 && hotkeyNumber <= 9 ? (
        <span className="font-mono-num pointer-events-none absolute top-1 right-1 z-20 rounded-[3px] border border-[#D4A451]/45 bg-[#10141B]/85 px-1 py-0 text-[8.5px] font-bold text-[#F5EAD6] shadow-sm">
          {hotkeyNumber}
        </span>
      ) : null}

      {/* Nửa trên: Tranh minh họa tràn rộng hòa mượt vào nền đá tối */}
      <div
        className={[
          'pointer-events-none relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden',
          frameStyle.tintBg,
        ].join(' ')}
      >
        {artUrl && !artFailed ? (
          <img
            src={artUrl}
            alt={card.nameVi}
            draggable={false}
            onError={() => setArtFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <GameIcon
            name={getCardGameIcon(card.cardKey)}
            size={compact ? 24 : 28}
            className={frameStyle.emblemColor}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#0F131A]/15 via-transparent to-[#161B23]"
        />
      </div>

      {/* Nửa dưới: Bảng tên Serif khắc nét — Hiện trọn tên bài không cắt "..." */}
      <div className="pointer-events-none relative z-10 flex shrink-0 flex-col items-center justify-center border-t border-[#B89352]/40 bg-gradient-to-b from-[#1B212C] to-[#11161D] px-1 py-1 text-center">
        <div
          className={[
            'font-serif-title w-full font-bold leading-[1.08] break-words text-[#F4EBD8]',
            isLongName
              ? 'text-[clamp(7.8px,0.72cqw,9.5px)] tracking-[-0.01em]'
              : 'text-[clamp(9px,0.82cqw,11px)]',
          ].join(' ')}
        >
          {card.nameVi}
        </div>
        {showCategoryTag ? (
          <div
            className={[
              'mt-0.5 w-full truncate text-[clamp(7px,0.62cqw,8.5px)] font-semibold leading-none tracking-wide',
              frameStyle.badgeBg,
            ].join(' ')}
          >
            {categoryLabel}
          </div>
        ) : null}
      </div>
    </>
  );
}

export interface HandCardItemProps {
  readonly card: CardInstance;
  readonly selected: boolean;
  readonly dragging?: boolean;
  readonly disabled?: boolean;
  readonly hotkeyNumber?: number;
  readonly compact?: boolean;
  readonly fanIndex?: number;
  readonly fanCount?: number;
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
  fanIndex,
  fanCount,
  onToggle,
  onPointerDownCard,
}: HandCardItemProps) {
  const isFanned =
    fanCount !== undefined &&
    fanCount >= 4 &&
    fanIndex !== undefined &&
    !selected &&
    !dragging;
  const fanMid = isFanned ? (fanCount - 1) / 2 : 0;
  const fanNorm = isFanned && fanMid > 0 ? (fanIndex - fanMid) / fanMid : 0;
  const fanStyle: React.CSSProperties & Record<'--fan-rot' | '--fan-y', string> = {
    touchAction: 'none',
    '--fan-rot': isFanned ? `${(fanNorm * 2.2).toFixed(2)}deg` : '0deg',
    '--fan-y': isFanned ? `${(fanNorm * fanNorm * 5).toFixed(2)}px` : '0px',
  };

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
      aria-pressed={selected}
      data-selected={selected ? 'true' : undefined}
      data-dragging={dragging ? 'true' : undefined}
      style={fanStyle}
      className={[
        'lkdf-card-gwent lkdf-hand-card group relative flex shrink-0 flex-col overflow-hidden rounded-[6px] text-left text-[#F4EBD8] select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BE6C]',
        compact
          ? 'h-[calc(var(--card-h,114px)*0.94)] w-[calc(var(--card-w,80px)*0.92)]'
          : 'h-[var(--card-h,114px)] w-[var(--card-w,80px)]',
        dragging
          ? 'opacity-25'
          : selected
            ? 'z-20 border-2 border-[#E6BE6C] shadow-[0_14px_28px_rgba(0,0,0,0.82)] ring-2 ring-[#E6BE6C]/55'
            : 'border-[1.5px] border-[#6E7889]/75 hover:border-[#E6BE6C]',
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
    >
      <PlayingCardFace
        card={card}
        hotkeyNumber={hotkeyNumber}
        compact={compact}
      />
    </button>
  );
}
