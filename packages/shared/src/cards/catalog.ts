import type { CardCategory, CardInstance, Suit } from '../types/game.js';
import { shuffleArray } from '../utils/shuffle.js';

export type CardColor = 'RED' | 'BLACK' | 'NONE';

export interface CardTemplate {
  readonly cardKey: string;
  readonly nameVi: string;
  readonly category: CardCategory;
  readonly suit: Suit;
  readonly rank: number;
  readonly attackRange?: number;
  readonly isEx?: boolean;
  readonly descriptionVi: string;
}

function makeTemplates(
  cardKey: string,
  nameVi: string,
  category: CardCategory,
  descriptionVi: string,
  entries: readonly {
    readonly suit: Suit;
    readonly rank: number;
    readonly isEx?: boolean;
  }[],
  attackRange?: number,
): CardTemplate[] {
  return entries.map((entry) => ({
    cardKey,
    nameVi,
    category,
    suit: entry.suit,
    rank: entry.rank,
    ...(attackRange !== undefined ? { attackRange } : {}),
    ...(entry.isEx ? { isEx: true } : {}),
    descriptionVi,
  }));
}

/**
 * Danh sách đầy đủ 108 lá Bộ Tiêu chuẩn gốc (104 lá gốc + 4 lá EX):
 * - 53 lá Cơ bản (30 Sát, 15 Thiểm, 8 Đào)
 * - 36 lá Cẩm nang (31 thường + 5 thời gian, gồm 1 Vô Giải EX + 1 Thiểm Điện EX)
 * - 19 lá Trang bị (10 vũ khí gồm Hàn Băng Kiếm EX, 3 giáp gồm Nhân Vương Thuẫn EX, 3 ngựa +1, 3 ngựa -1)
 * Tổng: 27♠ + 27♥ + 27♣ + 27♦ = 108 lá.
 */
export const STANDARD_DECK_TEMPLATES: readonly CardTemplate[] = [
  // ======================== BÀI CƠ BẢN (53 lá) ========================
  ...makeTemplates(
    'sat',
    'Sát',
    'BASIC',
    'Gây 1 sát thương cho 1 mục tiêu trong tầm đánh (mặc định 1 lần mỗi lượt đánh).',
    [
      // 7 Bích: 7, 8, 8, 9, 9, 10, 10
      { suit: 'SPADE', rank: 7 },
      { suit: 'SPADE', rank: 8 },
      { suit: 'SPADE', rank: 8 },
      { suit: 'SPADE', rank: 9 },
      { suit: 'SPADE', rank: 9 },
      { suit: 'SPADE', rank: 10 },
      { suit: 'SPADE', rank: 10 },
      // 3 Cơ: 10, 10, J
      { suit: 'HEART', rank: 10 },
      { suit: 'HEART', rank: 10 },
      { suit: 'HEART', rank: 11 },
      // 14 Chuồn: 2..10, 8, 9, 10, J, J
      { suit: 'CLUB', rank: 2 },
      { suit: 'CLUB', rank: 3 },
      { suit: 'CLUB', rank: 4 },
      { suit: 'CLUB', rank: 5 },
      { suit: 'CLUB', rank: 6 },
      { suit: 'CLUB', rank: 7 },
      { suit: 'CLUB', rank: 8 },
      { suit: 'CLUB', rank: 8 },
      { suit: 'CLUB', rank: 9 },
      { suit: 'CLUB', rank: 9 },
      { suit: 'CLUB', rank: 10 },
      { suit: 'CLUB', rank: 10 },
      { suit: 'CLUB', rank: 11 },
      { suit: 'CLUB', rank: 11 },
      // 6 Rô: 6, 7, 8, 9, 10, K
      { suit: 'DIAMOND', rank: 6 },
      { suit: 'DIAMOND', rank: 7 },
      { suit: 'DIAMOND', rank: 8 },
      { suit: 'DIAMOND', rank: 9 },
      { suit: 'DIAMOND', rank: 10 },
      { suit: 'DIAMOND', rank: 13 },
    ],
  ),

  ...makeTemplates(
    'thiem',
    'Thiểm',
    'BASIC',
    'Phản ứng né tránh hiệu ứng của lá Sát hoặc Vạn Tiễn Tề Phát.',
    [
      // 3 Cơ: 2, 2, K
      { suit: 'HEART', rank: 2 },
      { suit: 'HEART', rank: 2 },
      { suit: 'HEART', rank: 13 },
      // 12 Rô: 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, J
      { suit: 'DIAMOND', rank: 2 },
      { suit: 'DIAMOND', rank: 2 },
      { suit: 'DIAMOND', rank: 3 },
      { suit: 'DIAMOND', rank: 4 },
      { suit: 'DIAMOND', rank: 5 },
      { suit: 'DIAMOND', rank: 6 },
      { suit: 'DIAMOND', rank: 7 },
      { suit: 'DIAMOND', rank: 8 },
      { suit: 'DIAMOND', rank: 9 },
      { suit: 'DIAMOND', rank: 10 },
      { suit: 'DIAMOND', rank: 11 },
      { suit: 'DIAMOND', rank: 11 },
    ],
  ),

  ...makeTemplates(
    'dao',
    'Đào',
    'BASIC',
    'Hồi 1 máu cho bản thân trong lượt đánh hoặc cứu 1 máu cho người đang hấp hối.',
    [
      // 7 Cơ: 3, 4, 6, 7, 8, 9, Q
      { suit: 'HEART', rank: 3 },
      { suit: 'HEART', rank: 4 },
      { suit: 'HEART', rank: 6 },
      { suit: 'HEART', rank: 7 },
      { suit: 'HEART', rank: 8 },
      { suit: 'HEART', rank: 9 },
      { suit: 'HEART', rank: 12 },
      // 1 Rô: Q
      { suit: 'DIAMOND', rank: 12 },
    ],
  ),

  // ======================== CẨM NANG THƯỜNG (31 lá) ========================
  ...makeTemplates(
    'vo_trung_sinh_huu',
    'Vô Trung Sinh Hữu',
    'NORMAL_SCROLL',
    'Rút ngay 2 lá bài từ chồng bài rút.',
    [
      { suit: 'HEART', rank: 7 },
      { suit: 'HEART', rank: 8 },
      { suit: 'HEART', rank: 9 },
      { suit: 'HEART', rank: 11 },
    ],
  ),

  ...makeTemplates(
    'thuan_thu_khien_duong',
    'Thuận Thủ Khiên Dương',
    'NORMAL_SCROLL',
    'Lấy 1 lá bài từ tay hoặc khu trang bị của mục tiêu ở khoảng cách 1.',
    [
      { suit: 'SPADE', rank: 3 },
      { suit: 'SPADE', rank: 4 },
      { suit: 'SPADE', rank: 11 },
      { suit: 'DIAMOND', rank: 3 },
      { suit: 'DIAMOND', rank: 4 },
    ],
  ),

  ...makeTemplates(
    'qua_ha_sai_cau',
    'Quá Hà Sái Cầu',
    'NORMAL_SCROLL',
    'Hủy 1 lá bài từ tay hoặc khu trang bị của bất kỳ người chơi khác.',
    [
      { suit: 'SPADE', rank: 3 },
      { suit: 'SPADE', rank: 4 },
      { suit: 'SPADE', rank: 12 },
      { suit: 'HEART', rank: 12 },
      { suit: 'CLUB', rank: 3 },
      { suit: 'CLUB', rank: 4 },
    ],
  ),

  ...makeTemplates(
    'quyet_dau',
    'Quyết Đấu',
    'NORMAL_SCROLL',
    'Mục tiêu và bạn lần lượt đánh Sát (mục tiêu đánh trước); ai không đánh Sát chịu 1 sát thương.',
    [
      { suit: 'SPADE', rank: 1 },
      { suit: 'CLUB', rank: 1 },
      { suit: 'DIAMOND', rank: 1 },
    ],
  ),

  ...makeTemplates(
    'ta_dao_sat_nhan',
    'Tá Đao Sát Nhân',
    'NORMAL_SCROLL',
    'Buộc 1 người có vũ khí đánh Sát vào mục tiêu trong tầm đánh của họ, hoặc phải giao vũ khí cho bạn.',
    [
      { suit: 'CLUB', rank: 12 },
      { suit: 'CLUB', rank: 13 },
    ],
  ),

  ...makeTemplates(
    'nam_man_nhap_xam',
    'Nam Man Nhập Xâm',
    'NORMAL_SCROLL',
    'Mỗi người chơi khác lần lượt đánh ra 1 lá Sát hoặc chịu 1 sát thương.',
    [
      { suit: 'SPADE', rank: 7 },
      { suit: 'SPADE', rank: 13 },
      { suit: 'CLUB', rank: 7 },
    ],
  ),

  ...makeTemplates(
    'van_tien_te_phat',
    'Vạn Tiễn Tề Phát',
    'NORMAL_SCROLL',
    'Mỗi người chơi khác lần lượt đánh ra 1 lá Thiểm hoặc chịu 1 sát thương.',
    [{ suit: 'HEART', rank: 1 }],
  ),

  ...makeTemplates(
    'dao_vien_ket_nghia',
    'Đào Viên Kết Nghĩa',
    'NORMAL_SCROLL',
    'Toàn bộ người chơi còn sống đều hồi 1 máu (nếu chưa đầy máu).',
    [{ suit: 'HEART', rank: 1 }],
  ),

  ...makeTemplates(
    'ngu_coc_phong_dang',
    'Ngũ Cốc Phong Đăng',
    'NORMAL_SCROLL',
    'Lật mở số lá bài bằng số người còn sống; mỗi người lần lượt chọn lấy 1 lá.',
    [
      { suit: 'HEART', rank: 3 },
      { suit: 'HEART', rank: 4 },
    ],
  ),

  ...makeTemplates(
    'vo_giai_kha_kich',
    'Vô Giải Khả Kích',
    'NORMAL_SCROLL',
    'Vô hiệu hóa hiệu ứng của một lá Cẩm nang (hoặc một lá Vô Giải Khả Kích khác) sắp có hiệu lực.',
    [
      { suit: 'SPADE', rank: 11 },
      { suit: 'CLUB', rank: 12 },
      { suit: 'CLUB', rank: 13 },
      { suit: 'DIAMOND', rank: 12, isEx: true },
    ],
  ),

  // ======================== CẨM NANG THỜI GIAN (5 lá) ========================
  ...makeTemplates(
    'lac_bat_tu_thuc',
    'Lạc Bất Tư Thục',
    'DELAYED_SCROLL',
    'Đặt vào khu phán xét của mục tiêu: nếu phán xét không phải chất Cơ, mất pha Đánh bài.',
    [
      { suit: 'SPADE', rank: 6 },
      { suit: 'HEART', rank: 6 },
      { suit: 'CLUB', rank: 6 },
    ],
  ),

  ...makeTemplates(
    'thiem_dien',
    'Thiểm Điện',
    'DELAYED_SCROLL',
    'Phán xét ra Bích từ 2 đến 9 chịu 3 sát thương Lôi; không trúng thì chuyển sang người kế tiếp.',
    [
      { suit: 'SPADE', rank: 1 },
      { suit: 'HEART', rank: 12, isEx: true },
    ],
  ),

  // ======================== VŨ KHÍ (10 lá) ========================
  ...makeTemplates(
    'gia_cat_lien_no',
    'Gia Cát Liên Nỗ',
    'WEAPON',
    'Tầm đánh 1: Trong pha Đánh bài, có thể đánh Sát không giới hạn số lần.',
    [
      { suit: 'CLUB', rank: 1 },
      { suit: 'DIAMOND', rank: 1 },
    ],
    1,
  ),
  ...makeTemplates(
    'tu_hung_song_co_kiem',
    'Từ Hùng Song Cổ Kiếm',
    'WEAPON',
    'Tầm đánh 2: Khi đánh Sát mục tiêu khác giới, mục tiêu chọn bỏ 1 lá trên tay hoặc cho bạn rút 1 lá.',
    [{ suit: 'SPADE', rank: 2 }],
    2,
  ),
  ...makeTemplates(
    'thanh_cong_kiem',
    'Thanh Công Kiếm',
    'WEAPON',
    'Tầm đánh 2: Khi đánh Sát, bỏ qua hiệu ứng Giáp của mục tiêu.',
    [{ suit: 'SPADE', rank: 6 }],
    2,
  ),
  ...makeTemplates(
    'han_bang_kiem',
    'Hàn Băng Kiếm',
    'WEAPON',
    'Tầm đánh 2 (EX): Khi Sát gây sát thương trúng mục tiêu có bài, có thể hủy tối đa 2 lá của mục tiêu thay cho sát thương.',
    [{ suit: 'SPADE', rank: 2, isEx: true }],
    2,
  ),
  ...makeTemplates(
    'thanh_long_yen_nguyet_dao',
    'Thanh Long Yển Nguyệt Đao',
    'WEAPON',
    'Tầm đánh 3: Khi lá Sát của bạn bị Thiểm vô hiệu hóa, có thể đánh tiếp 1 lá Sát vào chính mục tiêu đó.',
    [{ suit: 'SPADE', rank: 5 }],
    3,
  ),
  ...makeTemplates(
    'truong_bat_xa_mau',
    'Trượng Bát Xà Mâu',
    'WEAPON',
    'Tầm đánh 3: Có thể dùng 2 lá trên tay coi như 1 lá Sát.',
    [{ suit: 'SPADE', rank: 12 }],
    3,
  ),
  ...makeTemplates(
    'quan_thach_phu',
    'Quán Thạch Phủ',
    'WEAPON',
    'Tầm đánh 3: Khi lá Sát của bạn bị Thiểm, có thể bỏ 2 lá bài khác để ép lá Sát đó trúng mục tiêu.',
    [{ suit: 'DIAMOND', rank: 5 }],
    3,
  ),
  ...makeTemplates(
    'phuong_thien_hoa_kich',
    'Phương Thiên Họa Kích',
    'WEAPON',
    'Tầm đánh 4: Khi lá Sát bạn đánh ra là lá bài cuối cùng trên tay, có thể chọn tối đa 3 mục tiêu.',
    [{ suit: 'DIAMOND', rank: 12 }],
    4,
  ),
  ...makeTemplates(
    'ky_lan_cung',
    'Kỳ Lân Cung',
    'WEAPON',
    'Tầm đánh 5: Khi Sát gây sát thương lên mục tiêu, có thể hủy 1 lá ngựa (+1 hoặc -1) đang trang bị của mục tiêu.',
    [{ suit: 'HEART', rank: 5 }],
    5,
  ),

  // ======================== GIÁP (3 lá) ========================
  ...makeTemplates(
    'bat_quai_tran',
    'Bát Quái Trận',
    'ARMOR',
    'Khi cần dùng hoặc đánh ra Thiểm, có thể phán xét: nếu ra chất Đỏ thì coi như đã dùng Thiểm.',
    [
      { suit: 'SPADE', rank: 2 },
      { suit: 'CLUB', rank: 2 },
    ],
  ),
  ...makeTemplates(
    'nhan_vuong_thuan',
    'Nhân Vương Thuẫn',
    'ARMOR',
    'Lá EX: Mọi lá Sát màu Đen (Bích/Chuồn) nhắm vào bạn đều vô hiệu.',
    [{ suit: 'CLUB', rank: 2, isEx: true }],
  ),

  // ======================== NGỰA +1 PHÒNG THỦ (3 lá) ========================
  ...makeTemplates(
    'tuyet_anh',
    'Tuyệt Ảnh',
    'PLUS_ONE_HORSE',
    'Khoảng cách từ người chơi khác tới bạn tăng thêm +1.',
    [{ suit: 'SPADE', rank: 5 }],
  ),
  ...makeTemplates(
    'dich_lo',
    'Đích Lố',
    'PLUS_ONE_HORSE',
    'Khoảng cách từ người chơi khác tới bạn tăng thêm +1.',
    [{ suit: 'CLUB', rank: 5 }],
  ),
  ...makeTemplates(
    'trao_hoang_phi_dien',
    'Trảo Hoàng Phi Điện',
    'PLUS_ONE_HORSE',
    'Khoảng cách từ người chơi khác tới bạn tăng thêm +1.',
    [{ suit: 'HEART', rank: 13 }],
  ),

  // ======================== NGỰA -1 TẤN CÔNG (3 lá) ========================
  ...makeTemplates(
    'xich_tho',
    'Xích Thố',
    'MINUS_ONE_HORSE',
    'Khoảng cách từ bạn tới mọi người chơi khác giảm đi 1.',
    [{ suit: 'HEART', rank: 5 }],
  ),
  ...makeTemplates(
    'dai_uyen',
    'Đại Uyên',
    'MINUS_ONE_HORSE',
    'Khoảng cách từ bạn tới mọi người chơi khác giảm đi 1.',
    [{ suit: 'SPADE', rank: 13 }],
  ),
  ...makeTemplates(
    'tu_tinh',
    'Tử Tinh',
    'MINUS_ONE_HORSE',
    'Khoảng cách từ bạn tới mọi người chơi khác giảm đi 1.',
    [{ suit: 'DIAMOND', rank: 13 }],
  ),
];

export function isRedSuit(suit: Suit): boolean {
  return suit === 'HEART' || suit === 'DIAMOND';
}

export function isBlackSuit(suit: Suit): boolean {
  return suit === 'SPADE' || suit === 'CLUB';
}

export function getCardColor(
  cards: readonly Pick<CardInstance, 'suit'>[],
): CardColor {
  if (cards.length === 0) {
    return 'NONE';
  }
  const allRed = cards.every((c) => isRedSuit(c.suit));
  if (allRed) {
    return 'RED';
  }
  const allBlack = cards.every((c) => isBlackSuit(c.suit));
  if (allBlack) {
    return 'BLACK';
  }
  return 'NONE';
}

export function formatRankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

export function formatSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'SPADE':
      return '♠';
    case 'HEART':
      return '♥';
    case 'CLUB':
      return '♣';
    case 'DIAMOND':
      return '♦';
  }
}

/** Tạo bộ bài 108 lá đầy đủ và trộn ngẫu nhiên cho một ván đấu mới. */
export function createStandard108Deck(
  rng: () => number = Math.random,
): CardInstance[] {
  const instances: CardInstance[] = STANDARD_DECK_TEMPLATES.map((tpl, index) => ({
    id: `c_${String(index + 1).padStart(3, '0')}_${tpl.cardKey}`,
    cardKey: tpl.cardKey,
    nameVi: tpl.nameVi,
    category: tpl.category,
    suit: tpl.suit,
    rank: tpl.rank,
    ...(tpl.attackRange !== undefined ? { attackRange: tpl.attackRange } : {}),
  }));
  return shuffleArray(instances, rng);
}
