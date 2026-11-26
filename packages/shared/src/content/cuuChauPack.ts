import { STANDARD_DECK_TEMPLATES, type CardTemplate } from '../cards/catalog.js';
import type { HeroSkillHandler } from '../heroes/skillContracts.js';
import type { CardInstance, HeroDefinition, HeroFaction } from '../types/game.js';
import type { IdentityRole } from '../types/identity.js';
import { shuffleArray } from '../utils/shuffle.js';
import type {
  ContentPack,
  FactionDefinition,
  LocalizedText,
  PackManifest,
  RoleDefinition,
} from './types.js';

export type CuuChauLocale = 'vi' | 'en';

export interface CuuChauFactionDisplay extends FactionDefinition {
  readonly shortName: LocalizedText;
}

export const CUU_CHAU_FACTIONS: readonly CuuChauFactionDisplay[] = [
  {
    id: 'THANH_VAN',
    emblem: '雲',
    name: { vi: 'Thanh Vân Các', en: 'Azure Cloud Pavilion' },
    shortName: { vi: 'Thanh Vân', en: 'Azure Cloud' },
    palette: {
      primary: '#34D399',
      glow: '#A7F3D0',
      bg: '#0E3427',
      border: '#10B981',
      text: '#6EE7B7',
      badgeClass: 'border-[#10B981]/60 bg-[#10B981]/15 text-[#6EE7B7]',
      borderClass: 'border-[#10B981]/75',
      nameTextClass: 'text-[#86EFAC]',
      dotClass: 'bg-[#10B981]',
    },
  },
  {
    id: 'HUYEN_THIET',
    emblem: '鐵',
    name: { vi: 'Huyền Thiết Môn', en: 'Obsidian Iron Order' },
    shortName: { vi: 'Huyền Thiết', en: 'Obsidian Iron' },
    palette: {
      primary: '#38BDF8',
      glow: '#BAE6FD',
      bg: '#132746',
      border: '#3B82F6',
      text: '#93C5FD',
      badgeClass: 'border-[#3B82F6]/60 bg-[#3B82F6]/15 text-[#93C5FD]',
      borderClass: 'border-[#3B82F6]/75',
      nameTextClass: 'text-[#93C5FD]',
      dotClass: 'bg-[#3B82F6]',
    },
  },
  {
    id: 'XICH_DIEM',
    emblem: '炎',
    name: { vi: 'Xích Diễm Đường', en: 'Crimson Flame Hall' },
    shortName: { vi: 'Xích Diễm', en: 'Crimson Flame' },
    palette: {
      primary: '#EF4444',
      glow: '#FDE68A',
      bg: '#4E1816',
      border: '#C83E37',
      text: '#FCA5A5',
      badgeClass: 'border-[#C83E37]/60 bg-[#C83E37]/15 text-[#FCA5A5]',
      borderClass: 'border-[#C83E37]/75',
      nameTextClass: 'text-[#FCA5A5]',
      dotClass: 'bg-[#C83E37]',
    },
  },
  {
    id: 'U_MINH',
    emblem: '影',
    name: { vi: 'U Minh Đạo', en: 'Shadow Veil Sect' },
    shortName: { vi: 'U Minh', en: 'Shadow Veil' },
    palette: {
      primary: '#A855F7',
      glow: '#E9D5FF',
      bg: '#2A1842',
      border: '#A855F7',
      text: '#E9D5FF',
      badgeClass: 'border-[#A855F7]/60 bg-[#A855F7]/15 text-[#E9D5FF]',
      borderClass: 'border-[#A855F7]/75',
      nameTextClass: 'text-[#E9D5FF]',
      dotClass: 'bg-[#A855F7]',
    },
  },
];

const LEGACY_TO_CUU_CHAU_FACTION: Readonly<Record<string, string>> = {
  SHU: 'THANH_VAN',
  WEI: 'HUYEN_THIET',
  WU: 'XICH_DIEM',
  QUN: 'U_MINH',
};

const CUU_CHAU_FACTION_BY_ID: Readonly<Record<string, CuuChauFactionDisplay>> =
  Object.fromEntries(CUU_CHAU_FACTIONS.map((f) => [f.id, f]));

export function mapLegacyFactionToCuuChau(faction: HeroFaction): string {
  return LEGACY_TO_CUU_CHAU_FACTION[faction] ?? faction;
}

export function getCuuChauFactionDisplay(
  factionId: HeroFaction,
  locale: CuuChauLocale = 'vi',
): {
  readonly id: string;
  readonly emblem: string;
  readonly name: string;
  readonly shortName: string;
  readonly palette: CuuChauFactionDisplay['palette'];
} {
  const mappedId = mapLegacyFactionToCuuChau(factionId);
  const found =
    CUU_CHAU_FACTION_BY_ID[mappedId] ?? CUU_CHAU_FACTIONS[3]!;
  return {
    id: found.id,
    emblem: found.emblem,
    name: found.name[locale],
    shortName: found.shortName[locale],
    palette: found.palette,
  };
}

export const CUU_CHAU_ROLES: readonly RoleDefinition[] = [
  {
    id: 'LORD',
    name: { vi: 'Minh Chủ', en: 'Grand Sovereign' },
    description: {
      vi: 'Sống sót và cùng Hộ Pháp loại hết Nghĩa Quân và Ám Ảnh.',
      en: 'Survive and eliminate all Crimson Insurgents and Lone Phantoms alongside Oathbound Guardians.',
    },
  },
  {
    id: 'LOYALIST',
    name: { vi: 'Hộ Pháp', en: 'Oathbound Guardian' },
    description: {
      vi: 'Bảo vệ Minh Chủ sống sót và tiêu diệt toàn bộ Nghĩa Quân cùng Ám Ảnh.',
      en: 'Protect the Grand Sovereign and eliminate every Insurgent and Phantom.',
    },
  },
  {
    id: 'REBEL',
    name: { vi: 'Nghĩa Quân', en: 'Crimson Insurgent' },
    description: {
      vi: 'Hạ gục Minh Chủ (thắng ngay khi Minh Chủ ngã xuống và Ám Ảnh chưa đạt điều kiện thắng).',
      en: 'Defeat the Grand Sovereign to claim victory unless the Lone Phantom is the sole survivor.',
    },
  },
  {
    id: 'SPY',
    name: { vi: 'Ám Ảnh', en: 'Lone Phantom' },
    description: {
      vi: 'Trở thành người duy nhất còn sống cuối cùng trên bàn đấu.',
      en: 'Become the sole surviving martial artist at the table.',
    },
  },
];

const ROLE_BY_ID: Readonly<Record<string, RoleDefinition>> = Object.fromEntries(
  CUU_CHAU_ROLES.map((r) => [r.id, r]),
);

export function getCuuChauRoleDisplay(
  role: IdentityRole | 'UNKNOWN',
  locale: CuuChauLocale = 'vi',
): { readonly name: string; readonly description: string } {
  if (role === 'UNKNOWN') {
    return {
      name: locale === 'en' ? 'Hidden' : 'Ẩn',
      description: '',
    };
  }
  const found = ROLE_BY_ID[role];
  if (!found) {
    return { name: role, description: '' };
  }
  return {
    name: found.name[locale],
    description: found.description[locale],
  };
}

export interface CuuChauCardDisplay {
  readonly cardKey: string;
  readonly nameVi: string;
  readonly nameEn: string;
  readonly descriptionVi: string;
  readonly descriptionEn: string;
}

export const CUU_CHAU_CARD_DISPLAY_BY_KEY: Readonly<
  Record<string, CuuChauCardDisplay>
> = {
  sat: {
    cardKey: 'sat',
    nameVi: 'Kiếm Trảm',
    nameEn: 'Blade Strike',
    descriptionVi:
      'Gây 1 sát thương cho 1 mục tiêu trong tầm đánh (mặc định 1 lần mỗi lượt hành động).',
    descriptionEn:
      'Deal 1 damage to a target within attack range (once per action phase by default).',
  },
  thiem: {
    cardKey: 'thiem',
    nameVi: 'Thân Pháp',
    nameEn: 'Shadow Step',
    descriptionVi:
      'Phản ứng né tránh đòn Kiếm Trảm hoặc Loạn Tiễn Xuyên Vân.',
    descriptionEn:
      'Negate an incoming Blade Strike or Skyfall Volley.',
  },
  dao: {
    cardKey: 'dao',
    nameVi: 'Hồi Xuân Đan',
    nameEn: 'Elixir Pill',
    descriptionVi:
      'Hồi 1 Sinh Lực cho bản thân trong lượt hoặc cứu 1 Sinh Lực cho người đang hấp hối.',
    descriptionEn:
      'Restore 1 HP on your turn or rescue a dying fighter with +1 HP.',
  },
  vo_trung_sinh_huu: {
    cardKey: 'vo_trung_sinh_huu',
    nameVi: 'Tụ Khí Quyết',
    nameEn: 'Qi Surge',
    descriptionVi: 'Vận khí rút ngay 2 lá bài từ chồng bài rút.',
    descriptionEn: 'Channel inner Qi to immediately draw 2 cards.',
  },
  thuan_thu_khien_duong: {
    cardKey: 'thuan_thu_khien_duong',
    nameVi: 'Thám Nang Thủ',
    nameEn: 'Sleight of Hand',
    descriptionVi:
      'Chiếm lấy 1 lá trên tay hoặc trang bị của mục tiêu ở khoảng cách 1.',
    descriptionEn:
      'Take 1 card from the hand, gear, or judgment zone of a target at distance 1.',
  },
  qua_ha_sai_cau: {
    cardKey: 'qua_ha_sai_cau',
    nameVi: 'Phá Trận Chưởng',
    nameEn: 'Break Formation',
    descriptionVi:
      'Hủy 1 lá trên tay, trang bị hoặc ấn chú của bất kỳ đối thủ nào.',
    descriptionEn:
      'Discard 1 card from any opponent’s hand, gear, or judgment zone.',
  },
  quyet_dau: {
    cardKey: 'quyet_dau',
    nameVi: 'Sinh Tử Lôi Đài',
    nameEn: 'Trial by Combat',
    descriptionVi:
      'Cùng mục tiêu lần lượt xuất Kiếm Trảm (mục tiêu ra trước); ai hụt chiêu chịu 1 sát thương.',
    descriptionEn:
      'Both fighters alternate playing Blade Strikes (target starts); the first to stop takes 1 damage.',
  },
  ta_dao_sat_nhan: {
    cardKey: 'ta_dao_sat_nhan',
    nameVi: 'Tá Kiếm Trảm Phong',
    nameEn: 'Borrowed Edge',
    descriptionVi:
      'Ép người có binh khí xuất Kiếm Trảm vào mục tiêu trong tầm của họ, hoặc giao nộp binh khí.',
    descriptionEn:
      'Force an armed fighter to strike a target in their range, or surrender their weapon to you.',
  },
  nam_man_nhap_xam: {
    cardKey: 'nam_man_nhap_xam',
    nameVi: 'Vạn Kiếm Quy Tông',
    nameEn: 'Thousand Blades',
    descriptionVi:
      'Tất cả đối thủ lần lượt xuất 1 Kiếm Trảm hoặc chịu 1 sát thương.',
    descriptionEn:
      'Every other fighter must play 1 Blade Strike or suffer 1 damage.',
  },
  van_tien_te_phat: {
    cardKey: 'van_tien_te_phat',
    nameVi: 'Loạn Tiễn Xuyên Vân',
    nameEn: 'Skyfall Volley',
    descriptionVi:
      'Tất cả đối thủ lần lượt xuất 1 Thân Pháp hoặc chịu 1 sát thương.',
    descriptionEn:
      'Every other fighter must play 1 Shadow Step or suffer 1 damage.',
  },
  dao_vien_ket_nghia: {
    cardKey: 'dao_vien_ket_nghia',
    nameVi: 'Hội Minh Tụ Nghĩa',
    nameEn: 'Sect Banquet',
    descriptionVi:
      'Toàn bộ cao thủ còn sống trên bàn đều hồi 1 Sinh Lực (nếu chưa đầy).',
    descriptionEn: 'All living fighters restore 1 HP (if wounded).',
  },
  ngu_coc_phong_dang: {
    cardKey: 'ngu_coc_phong_dang',
    nameVi: 'Thiên Bảo Xuất Thế',
    nameEn: 'Vault of Relics',
    descriptionVi:
      'Lật mở số lá bằng sĩ số còn sống; từng người theo vòng chọn lấy 1 lá.',
    descriptionEn:
      'Reveal cards equal to living fighters; each takes 1 card in turn order.',
  },
  vo_giai_kha_kich: {
    cardKey: 'vo_giai_kha_kich',
    nameVi: 'Hóa Giải Chân Khí',
    nameEn: 'Qi Negation',
    descriptionVi:
      'Triệt tiêu hiệu lực của một bí kíp sắp phát động (hoặc một lá Hóa Giải khác).',
    descriptionEn:
      'Cancel the effect of an active technique scroll before it resolves.',
  },
  lac_bat_tu_thuc: {
    cardKey: 'lac_bat_tu_thuc',
    nameVi: 'Điểm Huyệt Phong Mạch',
    nameEn: 'Acupoint Seal',
    descriptionVi:
      'Đặt lên vùng phán xét đối thủ: đầu lượt phán xét không ra chất Cơ sẽ bị mất pha hành động.',
    descriptionEn:
      'Delayed seal: on the target’s judgment check, unless Heart is revealed, they skip their action phase.',
  },
  thiem_dien: {
    cardKey: 'thiem_dien',
    nameVi: 'Thiên Lôi Kiếp',
    nameEn: 'Sky Tribulation',
    descriptionVi:
      'Đầu lượt phán xét ra Bích 2–9 chịu 3 lôi sát thương; trượt thì chuyển sang người kế tiếp.',
    descriptionEn:
      'Delayed seal: Spade 2–9 deals 3 lightning damage; otherwise passes clockwise.',
  },
  gia_cat_lien_no: {
    cardKey: 'gia_cat_lien_no',
    nameVi: 'Liên Hoàn Nỏ',
    nameEn: 'Repeating Crossbow',
    descriptionVi:
      'Tầm đánh 1: Trong pha hành động, xuất Kiếm Trảm không giới hạn số lần.',
    descriptionEn:
      'Range 1: You may play unlimited Blade Strikes during your action phase.',
  },
  tu_hung_song_co_kiem: {
    cardKey: 'tu_hung_song_co_kiem',
    nameVi: 'Hàn Tâm Song Kiếm',
    nameEn: 'Frostheart Twinblades',
    descriptionVi:
      'Tầm đánh 2: Khi Kiếm Trảm mục tiêu khác giới, họ chọn bỏ 1 lá trên tay hoặc cho bạn rút 1 lá.',
    descriptionEn:
      'Range 2: When striking an opposite-gender target, they discard 1 hand card or let you draw 1.',
  },
  thanh_cong_kiem: {
    cardKey: 'thanh_cong_kiem',
    nameVi: 'Thanh Phong Kiếm',
    nameEn: 'Azure Wind Blade',
    descriptionVi:
      'Tầm đánh 2: Khi xuất Kiếm Trảm, xuyên phá toàn bộ hiệu ứng hộ giáp của mục tiêu.',
    descriptionEn:
      'Range 2: Your Blade Strikes ignore the target’s equipped armor.',
  },
  han_bang_kiem: {
    cardKey: 'han_bang_kiem',
    nameVi: 'Băng Phách Kiếm',
    nameEn: 'Glacial Fang',
    descriptionVi:
      'Tầm đánh 2: Khi Kiếm Trảm gây sát thương trúng mục tiêu có bài, có thể hủy tối đa 2 lá của họ thay cho sát thương.',
    descriptionEn:
      'Range 2: Prevent strike damage to discard up to 2 cards from the target instead.',
  },
  thanh_long_yen_nguyet_dao: {
    cardKey: 'thanh_long_yen_nguyet_dao',
    nameVi: 'Huyền Long Đao',
    nameEn: 'Obsidian Dragon Sabre',
    descriptionVi:
      'Tầm đánh 3: Khi Kiếm Trảm bị Thân Pháp né được, được đánh tiếp 1 Kiếm Trảm khác vào mục tiêu đó.',
    descriptionEn:
      'Range 3: When your Blade Strike is evaded, you may immediately follow up with another Blade Strike.',
  },
  truong_bat_xa_mau: {
    cardKey: 'truong_bat_xa_mau',
    nameVi: 'Xà Ảnh Mâu',
    nameEn: 'Serpent Pike',
    descriptionVi:
      'Tầm đánh 3: Hợp 2 lá bất kỳ trên tay thành 1 Kiếm Trảm.',
    descriptionEn:
      'Range 3: Discard any 2 hand cards as a virtual Blade Strike.',
  },
  quan_thach_phu: {
    cardKey: 'quan_thach_phu',
    nameVi: 'Phá Sơn Phủ',
    nameEn: 'Mountain Cleaver',
    descriptionVi:
      'Tầm đánh 3: Khi Kiếm Trảm bị né, bỏ thêm 2 lá khác để ép đòn đánh trúng mục tiêu.',
    descriptionEn:
      'Range 3: Discard 2 other cards when evaded to force the Blade Strike to hit.',
  },
  phuong_thien_hoa_kich: {
    cardKey: 'phuong_thien_hoa_kich',
    nameVi: 'Cửu Thiên Họa Kích',
    nameEn: 'Nine-Heavens Halberd',
    descriptionVi:
      'Tầm đánh 4: Khi lá Kiếm Trảm là lá cuối cùng trên tay, chọn tối đa 3 mục tiêu.',
    descriptionEn:
      'Range 4: When your last hand card is a Blade Strike, target up to 3 fighters.',
  },
  ky_lan_cung: {
    cardKey: 'ky_lan_cung',
    nameVi: 'Linh Điểu Cung',
    nameEn: 'Spiritwing Bow',
    descriptionVi:
      'Tầm đánh 5: Khi Kiếm Trảm gây sát thương, có thể hủy 1 khinh công (+1 hoặc -1) của mục tiêu.',
    descriptionEn:
      'Range 5: On Blade Strike damage, discard 1 distance mount/footwork gear from the target.',
  },
  bat_quai_tran: {
    cardKey: 'bat_quai_tran',
    nameVi: 'Bát Quái Y',
    nameEn: 'Bagua Vestment',
    descriptionVi:
      'Khi cần dùng Thân Pháp, có thể phán xét: ra chất Đỏ coi như đã xuất Thân Pháp.',
    descriptionEn:
      'When asked for Shadow Step, reveal top deck card: Red counts as a valid Shadow Step.',
  },
  nhan_vuong_thuan: {
    cardKey: 'nhan_vuong_thuan',
    nameVi: 'Huyền Thiết Thuẫn',
    nameEn: 'Obsidian Aegis',
    descriptionVi:
      'Hóa giải hoàn toàn mọi lá Kiếm Trảm màu Đen (Bích/Chuồn) nhắm vào bạn.',
    descriptionEn: 'Black Blade Strikes (Spade/Club) have no effect on you.',
  },
  tuyet_anh: {
    cardKey: 'tuyet_anh',
    nameVi: 'Đạp Tuyết Vô Ngân',
    nameEn: 'Snowstep Boots',
    descriptionVi: 'Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.',
    descriptionEn: 'Defensive Footwork (+1): Others calculate +1 distance to you.',
  },
  dich_lo: {
    cardKey: 'dich_lo',
    nameVi: 'Lăng Ba Vi Bộ',
    nameEn: 'Mistwalk Scroll',
    descriptionVi: 'Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.',
    descriptionEn: 'Defensive Footwork (+1): Others calculate +1 distance to you.',
  },
  trao_hoang_phi_dien: {
    cardKey: 'trao_hoang_phi_dien',
    nameVi: 'Ngự Phong Hài',
    nameEn: 'Windrider Boots',
    descriptionVi: 'Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.',
    descriptionEn: 'Defensive Footwork (+1): Others calculate +1 distance to you.',
  },
  xich_tho: {
    cardKey: 'xich_tho',
    nameVi: 'Truy Ảnh Hài',
    nameEn: 'Shadowchase Boots',
    descriptionVi: 'Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.',
    descriptionEn: 'Offensive Footwork (-1): Distance from you to others decreases by 1.',
  },
  dai_uyen: {
    cardKey: 'dai_uyen',
    nameVi: 'Xích Diễm Câu',
    nameEn: 'Flamewind Steed',
    descriptionVi: 'Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.',
    descriptionEn: 'Offensive Footwork (-1): Distance from you to others decreases by 1.',
  },
  tu_tinh: {
    cardKey: 'tu_tinh',
    nameVi: 'Huyền Lôi Tuấn',
    nameEn: 'Thunderstride Steed',
    descriptionVi: 'Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.',
    descriptionEn: 'Offensive Footwork (-1): Distance from you to others decreases by 1.',
  },
};

export function getCuuChauCardDisplay(
  cardKey: string,
  locale: CuuChauLocale = 'vi',
  fallbackName?: string,
): { readonly name: string; readonly description: string } {
  const entry = CUU_CHAU_CARD_DISPLAY_BY_KEY[cardKey];
  if (!entry) {
    const label = fallbackName ?? cardKey;
    return { name: label, description: label };
  }
  return {
    name: locale === 'en' ? entry.nameEn : entry.nameVi,
    description: locale === 'en' ? entry.descriptionEn : entry.descriptionVi,
  };
}

export interface CuuChauHeroDefinition extends HeroDefinition {
  readonly legacySlotId: string;
}

export const CUU_CHAU_HEROES: readonly CuuChauHeroDefinition[] = [
  // --- THANH VÂN CÁC (7 hiệp khách) ---
  {
    id: 'lam_thanh_vu',
    legacySlotId: 'liu_bei',
    nameVi: 'Lâm Thanh Vũ',
    nameEn: 'Lin Qingyu',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'ren_de',
        nameVi: 'Thanh Vân Độ',
        nameEn: 'Cloud Favor',
        descriptionVi:
          'Trong pha hành động, giao bài trên tay cho đồng đội; giao từ 2 lá hồi 1 Sinh Lực.',
        descriptionEn:
          'Give hand cards to allies during your action phase; giving 2+ cards restores 1 HP.',
      },
      {
        id: 'ji_jiang',
        nameVi: 'Vân Lệnh',
        nameEn: 'Cloud Decree',
        descriptionVi:
          'Kỹ năng Minh Chủ: Khi cần xuất Kiếm Trảm, đồng môn Thanh Vân có thể xuất thay; nhận thêm +1 rút khi HP ≤ 2.',
        descriptionEn:
          'Sovereign Skill: Azure Cloud allies may answer Blade Strike calls; draw +1 card when HP ≤ 2.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'trieu_thien_hanh',
    legacySlotId: 'guan_yu',
    nameVi: 'Triệu Thiên Hành',
    nameEn: 'Zhao Tianxing',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'wu_sheng',
        nameVi: 'Xích Khí Trảm',
        nameEn: 'Crimson Edge',
        descriptionVi: 'Có thể dùng bất kỳ lá chất Đỏ nào làm Kiếm Trảm.',
        descriptionEn: 'Treat any Red card (hand or gear) as a Blade Strike.',
      },
    ],
  },
  {
    id: 'loi_chan_son',
    legacySlotId: 'zhang_fei',
    nameVi: 'Lôi Chấn Sơn',
    nameEn: 'Lei Zhenshan',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'pao_xiao',
        nameVi: 'Cuồng Lôi Bộ',
        nameEn: 'Thunder Rush',
        descriptionVi:
          'Trong lượt đánh, xuất Kiếm Trảm không giới hạn và luôn giảm 1 khoảng cách tới mục tiêu (3 HP).',
        descriptionEn:
          'Play unlimited Blade Strikes and gain -1 offensive distance permanently (3 HP).',
      },
    ],
  },
  {
    id: 'tham_tinh_ha',
    legacySlotId: 'zhuge_liang',
    nameVi: 'Thẩm Tinh Hà',
    nameEn: 'Shen Xinghe',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'guan_xing',
        nameVi: 'Tinh Bàn Đạo',
        nameEn: 'Astral Chart',
        descriptionVi:
          'Đầu lượt xem tối đa 5 lá trên đỉnh chồng bài rút và sắp xếp lại đỉnh/đáy.',
        descriptionEn:
          'At turn start, inspect up to 5 top cards and arrange them on top or bottom.',
      },
      {
        id: 'kong_cheng',
        nameVi: 'Vô Ngã Cảnh',
        nameEn: 'Empty Mind',
        descriptionVi:
          'Khi tay trống, miễn nhiễm mục tiêu Kiếm Trảm và Sinh Tử Lôi Đài.',
        descriptionEn:
          'While empty-handed, cannot be targeted by Blade Strike or Trial by Combat.',
      },
    ],
  },
  {
    id: 'bach_ngoc_thanh',
    legacySlotId: 'zhao_yun',
    nameVi: 'Bạch Ngọc Thành',
    nameEn: 'Bai Yucheng',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'long_dan',
        nameVi: 'Du Long Thế',
        nameEn: 'Dragon Stance',
        descriptionVi: 'Dùng Kiếm Trảm như Thân Pháp và ngược lại.',
        descriptionEn: 'Use Blade Strike as Shadow Step and vice versa.',
      },
    ],
  },
  {
    id: 'khuong_vo_ta',
    legacySlotId: 'ma_chao',
    nameVi: 'Khương Vô Tà',
    nameEn: 'Jiang Wuxie',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ma_shu',
        nameVi: 'Truy Phong Ảnh',
        nameEn: 'Gale Stride',
        descriptionVi: 'Khoảng cách từ bạn tới mọi đối thủ giảm 1.',
        descriptionEn: 'Distance from you to every other fighter is reduced by 1.',
      },
      {
        id: 'tie_qi',
        nameVi: 'Phá Phong Quyết',
        nameEn: 'Gale Breaker',
        descriptionVi:
          'Khi xuất Kiếm Trảm, có thể phán xét: ra chất Đỏ khiến mục tiêu không thể né.',
        descriptionEn:
          'When targeting with Blade Strike, judge top card: Red makes it undodgeable.',
      },
    ],
  },
  {
    id: 'to_mong_dao',
    legacySlotId: 'huang_yue_ying',
    nameVi: 'Tô Mộng Dao',
    nameEn: 'Su Mengyao',
    faction: 'THANH_VAN',
    factionLabelVi: 'Thanh Vân',
    factionLabelEn: 'Azure Cloud',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ji_zhi',
        nameVi: 'Linh Tê Quyết',
        nameEn: 'Arcane Insight',
        descriptionVi:
          'Mỗi khi thi triển bí kíp, rút ngay 1 lá; có trang bị thì pha Rút bài rút thêm +1.',
        descriptionEn:
          'Draw 1 card whenever playing a scroll; draw +1 extra card when geared.',
      },
      {
        id: 'qi_cai',
        nameVi: 'Thiên Cơ Thuật',
        nameEn: 'Unbound Craft',
        descriptionVi: 'Dùng bí kíp không bị giới hạn khoảng cách.',
        descriptionEn: 'Scrolls ignore distance limits.',
      },
    ],
  },

  // --- HUYỀN THIẾT MÔN (7 hiệp khách) ---
  {
    id: 'han_thiet_phong',
    legacySlotId: 'cao_cao',
    nameVi: 'Hàn Thiết Phong',
    nameEn: 'Han Tiefeng',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'jian_xiong',
        nameVi: 'Thiết Huyết Phản',
        nameEn: 'Iron Recoil',
        descriptionVi:
          'Sau khi chịu sát thương từ một lá bài, thu lấy lá gây sát thương và rút thêm 1 lá.',
        descriptionEn:
          'After taking card damage, claim the damaging card and draw 1 extra card.',
      },
      {
        id: 'hu_jia',
        nameVi: 'Huyền Giáp Vệ',
        nameEn: 'Iron Bastion',
        descriptionVi:
          'Kỹ năng Minh Chủ: Khi cần Thân Pháp, đồng môn Huyền Thiết có thể xuất thay.',
        descriptionEn:
          'Sovereign Skill: Obsidian Iron allies may answer Shadow Step calls for you.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'co_huyen_co',
    legacySlotId: 'si_ma_yi',
    nameVi: 'Cố Huyền Cơ',
    nameEn: 'Gu Xuanji',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'fan_kui',
        nameVi: 'Ám Đoạt Ấn',
        nameEn: 'Backlash Seal',
        descriptionVi: 'Khi chịu sát thương, có thể rút 1 lá của kẻ gây thương.',
        descriptionEn: 'After taking damage, claim 1 card from the damage source.',
      },
      {
        id: 'gui_cai',
        nameVi: 'Nghịch Mệnh Phù',
        nameEn: 'Fate Reversal',
        descriptionVi:
          'Trước khi lá phán xét có hiệu lực, đánh 1 lá trên tay thay thế.',
        descriptionEn:
          'Replace any pending judgment card with a card from your hand.',
      },
    ],
  },
  {
    id: 'nghiem_cuong',
    legacySlotId: 'xia_hou_dun',
    nameVi: 'Nghiêm Cương',
    nameEn: 'Yan Gang',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'gang_lie',
        nameVi: 'Bất Khuất Hồn',
        nameEn: 'Unyielding Will',
        descriptionVi:
          'Khi chịu sát thương, phán xét nếu không phải Cơ thì kẻ tấn công bỏ 2 lá hoặc mất 1 máu.',
        descriptionEn:
          'After taking damage, judge: non-Heart forces attacker to discard 2 cards or take 1 damage.',
      },
    ],
  },
  {
    id: 'truong_huy_dieu',
    legacySlotId: 'zhang_liao',
    nameVi: 'Trương Huy Diệu',
    nameEn: 'Zhang Huiyao',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'tu_xi',
        nameVi: 'Kỳ Tập Đạo',
        nameEn: 'Night Raid',
        descriptionVi:
          'Ở pha Rút bài, có thể bỏ rút để đoạt 1 lá trên tay tối đa 2 đối thủ; giảm 1 tầm công.',
        descriptionEn:
          'Replace your draw phase to snatch 1 card each from up to 2 fighters; -1 offensive distance.',
      },
    ],
  },
  {
    id: 'thach_pha_thien',
    legacySlotId: 'xu_chu',
    nameVi: 'Thạch Phá Thiên',
    nameEn: 'Shi Potian',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'luo_yi',
        nameVi: 'Bá Thể Phá',
        nameEn: 'Shattering Might',
        descriptionVi:
          'Ở pha Rút bài rút ít đi 1 lá để Kiếm Trảm và Sinh Tử Lôi Đài tăng +1 sát thương.',
        descriptionEn:
          'Draw 1 fewer card to gain +1 damage on Blade Strikes and Trials this turn.',
      },
    ],
  },
  {
    id: 'ly_tri_vi',
    legacySlotId: 'guo_jia',
    nameVi: 'Lý Tri Vi',
    nameEn: 'Li Zhiwei',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'tian_du',
        nameVi: 'Thiên Mệnh Thu',
        nameEn: 'Omen Harvest',
        descriptionVi: 'Thu lấy lá phán xét của bản thân sau khi có hiệu lực.',
        descriptionEn: 'Claim your own judgment card once it resolves.',
      },
      {
        id: 'yi_ji',
        nameVi: 'Di Sách Quyết',
        nameEn: 'Parting Scroll',
        descriptionVi: 'Mỗi khi mất 1 máu, rút 2 lá để tự giữ hoặc chia đồng đội.',
        descriptionEn: 'When losing 1 HP, draw 2 cards and distribute them freely.',
      },
    ],
  },
  {
    id: 'thuy_u_linh',
    legacySlotId: 'zhen_ji',
    nameVi: 'Thủy U Linh',
    nameEn: 'Shui Youling',
    faction: 'HUYEN_THIET',
    factionLabelVi: 'Huyền Thiết',
    factionLabelEn: 'Obsidian Iron',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'luo_shen',
        nameVi: 'Hàn Giang Ảnh',
        nameEn: 'Misty Reflection',
        descriptionVi:
          'Đầu lượt phán xét liên tục: thu mọi lá Đen đến khi gặp chất Đỏ.',
        descriptionEn:
          'At turn start, repeatedly judge and claim Black cards until a Red card appears.',
      },
      {
        id: 'qing_guo',
        nameVi: 'Thủy Bộ Pháp',
        nameEn: 'Waterglide Step',
        descriptionVi: 'Dùng mọi lá chất Đen trên tay làm Thân Pháp.',
        descriptionEn: 'Play any Black hand card as Shadow Step.',
      },
    ],
  },

  // --- XÍCH DIỄM ĐƯỜNG (8 hiệp khách) ---
  {
    id: 'viem_liet_vuong',
    legacySlotId: 'sun_quan',
    nameVi: 'Viêm Liệt Vương',
    nameEn: 'Yan Liewang',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'zhi_heng',
        nameVi: 'Dung Luyện Quyết',
        nameEn: 'Forge Balance',
        descriptionVi:
          '1 lần/lượt bỏ bất kỳ số lá nào và rút lại đúng bấy nhiêu lá; tay ≤ 1 rút thêm +1.',
        descriptionEn:
          'Once per turn, discard any number of cards and draw that many; draw +1 if hand ≤ 1.',
      },
      {
        id: 'jiu_yuan',
        nameVi: 'Xích Đan Cứu',
        nameEn: 'Crimson Succor',
        descriptionVi:
          'Kỹ năng Minh Chủ: Khi đồng môn Xích Diễm dùng Hồi Xuân Đan cứu lúc hấp hối, hồi thêm +1 máu.',
        descriptionEn:
          'Sovereign Skill: Gain +1 bonus HP when rescued by a Crimson Flame ally.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'cam_da_sat',
    legacySlotId: 'gan_ning',
    nameVi: 'Cam Dạ Sát',
    nameEn: 'Gan Yesha',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qi_xi',
        nameVi: 'Hắc Ảnh Phá',
        nameEn: 'Night Raid Break',
        descriptionVi: 'Dùng mọi lá chất Đen làm Phá Trận Chưởng.',
        descriptionEn: 'Play any Black card as Break Formation.',
      },
    ],
  },
  {
    id: 'luc_tram_an',
    legacySlotId: 'lu_meng',
    nameVi: 'Lục Trầm Ẩn',
    nameEn: 'Lu Chenyin',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ke_ji',
        nameVi: 'Tĩnh Tâm Thủ',
        nameEn: 'Stillness Guard',
        descriptionVi:
          'Nếu không xuất Kiếm Trảm trong lượt, được bỏ qua pha Bỏ bài và rút 1 lá cuối lượt.',
        descriptionEn:
          'If you played no Blade Strike this turn, skip discard phase and draw 1 card at turn end.',
      },
    ],
  },
  {
    id: 'hoang_bat_dich',
    legacySlotId: 'huang_gai',
    nameVi: 'Hoàng Bất Dịch',
    nameEn: 'Huang Buyi',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ku_rou',
        nameVi: 'Phần Tâm Quyết',
        nameEn: 'Scorched Oath',
        descriptionVi: 'Trong pha hành động, tự mất 1 Sinh Lực để rút 2 lá.',
        descriptionEn: 'Lose 1 HP during your action phase to draw 2 cards.',
      },
    ],
  },
  {
    id: 'tieu_viem_lang',
    legacySlotId: 'zhou_yu',
    nameVi: 'Tiêu Viêm Lãng',
    nameEn: 'Xiao Yanlang',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ying_zi',
        nameVi: 'Liệt Diễm Huy',
        nameEn: 'Blaze Genius',
        descriptionVi: 'Ở pha Rút bài được rút thêm +1 lá.',
        descriptionEn: 'Draw 1 extra card during your draw phase.',
      },
      {
        id: 'fan_jian',
        nameVi: 'Ly Tâm Ấn',
        nameEn: 'Discord Mark',
        descriptionVi:
          '1 lần/lượt, để 1 đối thủ đoán chất rồi rút 1 lá của bạn: sai chịu 1 sát thương.',
        descriptionEn:
          'Once per turn, let an opponent guess a suit and take 1 of your hand cards; wrong guess deals 1 damage.',
      },
    ],
  },
  {
    id: 'ha_tuyet_nghi',
    legacySlotId: 'da_qiao',
    nameVi: 'Hạ Tuyết Nghi',
    nameEn: 'Xia Xueyi',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'guo_se',
        nameVi: 'Chỉ Huyệt Pháp',
        nameEn: 'Acupoint Art',
        descriptionVi: 'Dùng mọi lá chất Rô làm Điểm Huyệt Phong Mạch.',
        descriptionEn: 'Play any Diamond card as Acupoint Seal.',
      },
      {
        id: 'liu_li',
        nameVi: 'Chuyển Hoa Ảnh',
        nameEn: 'Petal Shift',
        descriptionVi:
          'Khi làm mục tiêu Kiếm Trảm, bỏ 1 lá chuyển đòn sang người khác trong tầm.',
        descriptionEn:
          'Discard 1 card to redirect an incoming Blade Strike to another fighter in range.',
      },
    ],
  },
  {
    id: 'mo_dung_tuyet',
    legacySlotId: 'lu_xun',
    nameVi: 'Mộ Dung Tuyết',
    nameEn: 'Murong Xue',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qian_xun',
        nameVi: 'Băng Tâm Cảnh',
        nameEn: 'Serene Ward',
        descriptionVi:
          'Miễn nhiễm Thám Nang Thủ & Điểm Huyệt Phong Mạch; bí kíp bỏ qua khoảng cách.',
        descriptionEn:
          'Immune to Sleight of Hand & Acupoint Seal; your scrolls ignore distance.',
      },
      {
        id: 'lian_ying',
        nameVi: 'Bạch Hạc Quy',
        nameEn: 'Crane Return',
        descriptionVi: 'Mỗi khi mất lá cuối cùng trên tay, rút ngay 1 lá.',
        descriptionEn: 'Draw 1 card whenever you lose your last hand card.',
      },
    ],
  },
  {
    id: 'bach_cam_y',
    legacySlotId: 'sun_shang_xiang',
    nameVi: 'Bạch Cẩm Y',
    nameEn: 'Bai Jinyi',
    faction: 'XICH_DIEM',
    factionLabelVi: 'Xích Diễm',
    factionLabelEn: 'Crimson Flame',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'jie_yin',
        nameVi: 'Hợp Hoan Khí',
        nameEn: 'Vital Accord',
        descriptionVi:
          '1 lần/lượt, bỏ 2 lá để cùng 1 hiệp khách nam bị thương hồi 1 Sinh Lực.',
        descriptionEn:
          'Once per turn, discard 2 cards so you and a wounded male fighter each restore 1 HP.',
      },
      {
        id: 'xiao_ji',
        nameVi: 'Xảo Trang Vũ',
        nameEn: 'Blade Dancer',
        descriptionVi:
          'Mất trang bị rút 2 lá; mỗi khi thi triển bí kíp cũng rút thêm 1 lá.',
        descriptionEn:
          'Draw 2 cards when losing gear, and draw 1 card whenever playing a scroll.',
      },
    ],
  },

  // --- U MINH ĐẠO (3 hiệp khách) ---
  {
    id: 'duoc_vo_uu',
    legacySlotId: 'hua_tuo',
    nameVi: 'Dược Vô Ưu',
    nameEn: 'Yao Wuyou',
    faction: 'U_MINH',
    factionLabelVi: 'U Minh',
    factionLabelEn: 'Shadow Veil',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qing_nang',
        nameVi: 'Thanh Tâm Đan',
        nameEn: 'Pure Balm',
        descriptionVi: '1 lần/lượt bỏ 1 lá trên tay giúp 1 người hồi 1 Sinh Lực.',
        descriptionEn: 'Once per turn, discard 1 hand card to heal any fighter 1 HP.',
      },
      {
        id: 'ji_jiu',
        nameVi: 'Hồi Sinh Thủ',
        nameEn: 'Lifeline Touch',
        descriptionVi: 'Ngoài lượt mình, dùng mọi lá Đỏ làm Hồi Xuân Đan.',
        descriptionEn: 'Outside your turn, treat any Red card as an Elixir Pill.',
      },
    ],
  },
  {
    id: 'tham_mac_ngon',
    legacySlotId: 'lu_bu',
    nameVi: 'Thẩm Mặc Ngôn',
    nameEn: 'Shen Moyan',
    faction: 'U_MINH',
    factionLabelVi: 'U Minh',
    factionLabelEn: 'Shadow Veil',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'wu_shuang',
        nameVi: 'Tuyệt Thế Ma Đao',
        nameEn: 'Peerless Edge',
        descriptionVi:
          'Kiếm Trảm buộc 2 Thân Pháp để né, Lôi Đài buộc 2 Kiếm Trảm; khoảng cách giảm 1.',
        descriptionEn:
          'Your Blade Strikes require 2 Shadow Steps, Trials require 2 Strikes; -1 offensive distance.',
      },
    ],
  },
  {
    id: 'da_vo_ngan',
    legacySlotId: 'diao_chan',
    nameVi: 'Dạ Vô Ngân',
    nameEn: 'Ye Wuhen',
    faction: 'U_MINH',
    factionLabelVi: 'U Minh',
    factionLabelEn: 'Shadow Veil',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'li_jian',
        nameVi: 'Mê Hồn Ấn',
        nameEn: 'Discord Charm',
        descriptionVi:
          '1 lần/lượt bỏ 1 lá buộc 2 hiệp khách nam vào Sinh Tử Lôi Đài.',
        descriptionEn:
          'Once per turn, discard 1 card to force two male fighters into Trial by Combat.',
      },
      {
        id: 'bi_yue',
        nameVi: 'Nguyệt Ẩn Ảnh',
        nameEn: 'Moonlit Veil',
        descriptionVi: 'Cuối lượt rút thêm 1 lá bài.',
        descriptionEn: 'Draw 1 extra card at the end of your turn.',
      },
    ],
  },
];

const HERO_BY_CUU_CHAU_OR_LEGACY_ID: Readonly<
  Record<string, CuuChauHeroDefinition>
> = (() => {
  const map: Record<string, CuuChauHeroDefinition> = {};
  for (const h of CUU_CHAU_HEROES) {
    map[h.id] = h;
    map[h.legacySlotId] = h;
  }
  return map;
})();

export function getCuuChauHeroDisplay(
  heroId: string | null | undefined,
  locale: CuuChauLocale = 'vi',
): {
  readonly id: string;
  readonly name: string;
  readonly factionId: string;
  readonly factionEmblem: string;
  readonly factionLabel: string;
  readonly skills: readonly {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isLordSkill?: boolean;
  }[];
} | null {
  if (!heroId) return null;
  const hero = HERO_BY_CUU_CHAU_OR_LEGACY_ID[heroId];
  if (!hero) return null;
  const faction = getCuuChauFactionDisplay(hero.faction, locale);
  return {
    id: hero.id,
    name: locale === 'en' ? hero.nameEn ?? hero.nameVi : hero.nameVi,
    factionId: faction.id,
    factionEmblem: faction.emblem,
    factionLabel: faction.shortName,
    skills: hero.skills.map((s) => ({
      id: s.id,
      name: locale === 'en' ? s.nameEn ?? s.nameVi : s.nameVi,
      description:
        locale === 'en' ? s.descriptionEn ?? s.descriptionVi : s.descriptionVi,
      ...(s.isLordSkill ? { isLordSkill: true } : {}),
    })),
  };
}

/** 10 bộ kỹ năng được remix cơ chế thực chất để chống reskin 1:1. */
export const CUU_CHAU_REMIXED_HERO_IDS: readonly string[] = [
  'lam_thanh_vu',
  'loi_chan_son',
  'to_mong_dao',
  'han_thiet_phong',
  'truong_huy_dieu',
  'viem_liet_vuong',
  'luc_tram_an',
  'mo_dung_tuyet',
  'bach_cam_y',
  'tham_mac_ngon',
];

export const CUU_CHAU_HERO_SKILLS: Readonly<
  Record<string, HeroSkillHandler>
> = {
  lam_thanh_vu: {
    heroId: 'lam_thanh_vu',
    onPeachRescueBonus: (_state, _dying, rescuer, rt) =>
      rt.getHeroFaction(rescuer.heroId) === 'THANH_VAN' ? 1 : 0,
    extraDrawCount: (_state, player) => (player.hp <= 2 ? 1 : 0),
  },
  loi_chan_son: {
    heroId: 'loi_chan_son',
    unlimitedSat: true,
    distanceModifier: () => -1,
  },
  to_mong_dao: {
    heroId: 'to_mong_dao',
    ignoreScrollDistance: true,
    extraDrawCount: (_state, player) =>
      player.equipments.weapon ||
      player.equipments.armor ||
      player.equipments.plusOneHorse ||
      player.equipments.minusOneHorse
        ? 1
        : 0,
    onNormalScrollPlayed: (state, seatIndex, rng, rt) =>
      rt.dealCardsToSeat(state, seatIndex, 1, rng).state,
  },
  han_thiet_phong: {
    heroId: 'han_thiet_phong',
    onAfterDamageTaken: (state, targetSeat, _sourceSeat, _amount, _cards, rng, rt) =>
      rt.dealCardsToSeat(state, targetSeat, 1, rng).state,
  },
  truong_huy_dieu: {
    heroId: 'truong_huy_dieu',
    distanceModifier: () => -1,
    onTurnEnd: (state, seatIndex, rng, rt) => {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (player.handCards.length <= 2) {
        return rt.dealCardsToSeat(state, seatIndex, 1, rng).state;
      }
      return state;
    },
  },
  viem_liet_vuong: {
    heroId: 'viem_liet_vuong',
    extraDrawCount: (_state, player) => (player.handCards.length <= 1 ? 1 : 0),
    onPeachRescueBonus: (_state, _dying, rescuer, rt) =>
      rt.getHeroFaction(rescuer.heroId) === 'XICH_DIEM' ? 1 : 0,
  },
  luc_tram_an: {
    heroId: 'luc_tram_an',
    onTurnEnd: (state, seatIndex, rng, rt) => {
      if (!state.turnFlags?.satPlayedOrUsedThisTurn) {
        return rt.dealCardsToSeat(state, seatIndex, 1, rng).state;
      }
      return state;
    },
  },
  mo_dung_tuyet: {
    heroId: 'mo_dung_tuyet',
    ignoreScrollDistance: true,
    onHandCardsLost: (state, seatIndex, prevHandCount, rng, rt) => {
      const player = rt.getPlayerBySeat(state, seatIndex);
      if (prevHandCount > 0 && player.handCards.length === 0) {
        return rt.dealCardsToSeat(state, seatIndex, 1, rng).state;
      }
      return state;
    },
  },
  bach_cam_y: {
    heroId: 'bach_cam_y',
    onEquipLost: (state, seatIndex, _lostCount, rng, rt) =>
      rt.dealCardsToSeat(state, seatIndex, 2, rng).state,
    onNormalScrollPlayed: (state, seatIndex, rng, rt) =>
      rt.dealCardsToSeat(state, seatIndex, 1, rng).state,
  },
  tham_mac_ngon: {
    heroId: 'tham_mac_ngon',
    strikeDodgeRequiredCount: () => 2,
    duelSatRequiredCount: () => 2,
    distanceModifier: () => -1,
  },
};

const EXTRA_FOUR_TEMPLATES: readonly CardTemplate[] = [
  {
    cardKey: 'thiem',
    nameVi: 'Thân Pháp',
    category: 'BASIC',
    suit: 'SPADE',
    rank: 4,
    descriptionVi: CUU_CHAU_CARD_DISPLAY_BY_KEY['thiem']!.descriptionVi,
  },
  {
    cardKey: 'dao',
    nameVi: 'Hồi Xuân Đan',
    category: 'BASIC',
    suit: 'HEART',
    rank: 5,
    descriptionVi: CUU_CHAU_CARD_DISPLAY_BY_KEY['dao']!.descriptionVi,
  },
  {
    cardKey: 'sat',
    nameVi: 'Kiếm Trảm',
    category: 'BASIC',
    suit: 'CLUB',
    rank: 1,
    descriptionVi: CUU_CHAU_CARD_DISPLAY_BY_KEY['sat']!.descriptionVi,
  },
  {
    cardKey: 'vo_trung_sinh_huu',
    nameVi: 'Tụ Khí Quyết',
    category: 'NORMAL_SCROLL',
    suit: 'DIAMOND',
    rank: 6,
    descriptionVi: CUU_CHAU_CARD_DISPLAY_BY_KEY['vo_trung_sinh_huu']!.descriptionVi,
  },
];

export const CUU_CHAU_DECK_TEMPLATES: readonly CardTemplate[] = [
  ...STANDARD_DECK_TEMPLATES.map((tpl) => {
    const display = CUU_CHAU_CARD_DISPLAY_BY_KEY[tpl.cardKey];
    return {
      ...tpl,
      nameVi: display?.nameVi ?? tpl.nameVi,
      descriptionVi: display?.descriptionVi ?? tpl.descriptionVi,
    };
  }),
  ...EXTRA_FOUR_TEMPLATES,
];

export function createCuuChau112Deck(
  rng: () => number = Math.random,
): CardInstance[] {
  const instances: CardInstance[] = CUU_CHAU_DECK_TEMPLATES.map(
    (tpl, index) => {
      const display = CUU_CHAU_CARD_DISPLAY_BY_KEY[tpl.cardKey];
      return {
        id: `cc_${String(index + 1).padStart(3, '0')}_${tpl.cardKey}`,
        cardKey: tpl.cardKey,
        nameVi: display?.nameVi ?? tpl.nameVi,
        ...(display ? { nameEn: display.nameEn } : {}),
        category: tpl.category,
        suit: tpl.suit,
        rank: tpl.rank,
        ...(tpl.attackRange !== undefined
          ? { attackRange: tpl.attackRange }
          : {}),
      };
    },
  );
  return shuffleArray(instances, rng);
}

const CUU_CHAU_MANIFEST: PackManifest = {
  id: 'cuu_chau_core',
  version: '1.0.0',
  rulesetVersion: '2.0.0',
  title: {
    vi: 'Cửu Châu Ẩn Kiếm — Bản Cơ Bản',
    en: 'Blades of the Nine Realms — Core Set',
  },
  isDlc: false,
  contentHash: 'cuuchau112',
  heroIds: CUU_CHAU_HEROES.map((h) => h.id),
  cardKeys: [...new Set(CUU_CHAU_DECK_TEMPLATES.map((c) => c.cardKey))],
};

export const CUU_CHAU_CORE_PACK: ContentPack = {
  manifest: CUU_CHAU_MANIFEST,
  factions: CUU_CHAU_FACTIONS,
  roles: CUU_CHAU_ROLES,
  heroes: CUU_CHAU_HEROES,
  lordHeroIds: ['lam_thanh_vu', 'han_thiet_phong', 'viem_liet_vuong'],
  deckTemplates: CUU_CHAU_DECK_TEMPLATES,
  heroSkills: CUU_CHAU_HERO_SKILLS,
  playPhaseSkillIds: [
    'ren_de',
    'ji_jiang',
    'zhi_heng',
    'ku_rou',
    'fan_jian',
    'jie_yin',
    'qing_nang',
    'li_jian',
  ],
};
