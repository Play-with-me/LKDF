/** Tổng số lá bài Bộ Tiêu chuẩn gốc (104 lá gốc + 4 lá EX). */
export const STANDARD_DECK_TOTAL = 108;

/** Số lá EX trong bộ 108 lá: Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích. */
export const STANDARD_EX_CARD_COUNT = 4;

export {
  STANDARD_DECK_TEMPLATES,
  createStandard108Deck,
  formatRankLabel,
  formatSuitSymbol,
  getCardColor,
  isBlackSuit,
  isRedSuit,
  type CardColor,
  type CardTemplate,
} from './catalog.js';
