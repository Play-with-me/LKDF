import type { HeroDefinition, HeroId } from '../types/game.js';

/** Danh mục đầy đủ 25 Tướng Bản Tiêu Chuẩn gốc theo REQUIREMENTS.md mục 3.2. */
export const HERO_CATALOG: readonly HeroDefinition[] = [
  // --- THỤC (7 tướng) ---
  {
    id: 'liu_bei',
    nameVi: 'Lưu Bị',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'ren_de',
        nameVi: 'Nhân Đức',
        descriptionVi: 'Trong lượt đánh, có thể giao bài trên tay cho người khác; giao từ 2 lá trở lên hồi 1 máu (1 lần/lượt).',
      },
      {
        id: 'ji_jiang',
        nameVi: 'Kích Tướng',
        descriptionVi: 'Kỹ năng Chủ Công: Khi cần dùng hoặc đánh ra Sát, các tướng Thục khác có thể đánh ra Sát thay bạn.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'guan_yu',
    nameVi: 'Quan Vũ',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'wu_sheng',
        nameVi: 'Võ Thánh',
        descriptionVi: 'Có thể dùng bất kỳ lá bài chất Đỏ (Cơ/Rô) nào như lá Sát.',
      },
    ],
  },
  {
    id: 'zhang_fei',
    nameVi: 'Trương Phi',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'pao_xiao',
        nameVi: 'Phao Hống',
        descriptionVi: 'Trong lượt đánh chính, có thể đánh Sát không giới hạn số lần.',
      },
    ],
  },
  {
    id: 'zhuge_liang',
    nameVi: 'Gia Cát Lượng',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'guan_xing',
        nameVi: 'Quan Tinh',
        descriptionVi: 'Đầu lượt, xem tối đa 5 lá trên đầu chồng bài rút (bằng số người còn sống) và sắp xếp đặt lại lên đầu hoặc xuống đáy.',
      },
      {
        id: 'kong_cheng',
        nameVi: 'Không Thành',
        descriptionVi: 'Khi không còn bài trên tay, không thể trở thành mục tiêu của Sát hoặc Quyết Đấu.',
      },
    ],
  },
  {
    id: 'zhao_yun',
    nameVi: 'Triệu Vân',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'long_dan',
        nameVi: 'Long Đảm',
        descriptionVi: 'Có thể dùng lá Sát như Thiểm và dùng lá Thiểm như Sát.',
      },
    ],
  },
  {
    id: 'ma_chao',
    nameVi: 'Mã Siêu',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ma_shu',
        nameVi: 'Mã Thuật',
        descriptionVi: 'Khoảng cách từ bạn tới mọi người chơi khác luôn được giảm 1.',
      },
      {
        id: 'tie_qi',
        nameVi: 'Thiết Kỵ',
        descriptionVi: 'Khi chọn mục tiêu cho lá Sát, có thể phán xét: nếu ra chất Đỏ, mục tiêu không thể dùng Thiểm né lá Sát này.',
      },
    ],
  },
  {
    id: 'huang_yue_ying',
    nameVi: 'Hoàng Nguyệt Anh',
    faction: 'SHU',
    factionLabelVi: 'Thục',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ji_zhi',
        nameVi: 'Tập Trí',
        descriptionVi: 'Mỗi khi dùng một lá Cẩm nang thường, rút ngay 1 lá bài.',
      },
      {
        id: 'qi_cai',
        nameVi: 'Kỳ Tài',
        descriptionVi: 'Dùng bài Cẩm nang không bị giới hạn khoảng cách.',
      },
    ],
  },

  // --- NGỤY (7 tướng) ---
  {
    id: 'cao_cao',
    nameVi: 'Tào Tháo',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'jian_xiong',
        nameVi: 'Gian Hùng',
        descriptionVi: 'Sau khi chịu sát thương từ một lá bài, có thể thu lấy lá bài gây sát thương đó.',
      },
      {
        id: 'hu_jia',
        nameVi: 'Hộ Giá',
        descriptionVi: 'Kỹ năng Chủ Công: Khi cần dùng hoặc đánh ra Thiểm, các tướng Ngụy khác có thể đánh ra Thiểm thay bạn.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'si_ma_yi',
    nameVi: 'Tư Mã Ý',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'fan_kui',
        nameVi: 'Phản Quỷ',
        descriptionVi: 'Sau khi chịu sát thương từ một người, có thể lấy 1 lá bài của người gây sát thương.',
      },
      {
        id: 'gui_cai',
        nameVi: 'Quỷ Tài',
        descriptionVi: 'Trước khi lá phán xét có hiệu lực, có thể đánh 1 lá trên tay ra thay thế lá phán xét đó.',
      },
    ],
  },
  {
    id: 'xia_hou_dun',
    nameVi: 'Hạ Hầu Đôn',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'gang_lie',
        nameVi: 'Cương Liệt',
        descriptionVi: 'Sau khi chịu sát thương, có thể phán xét: nếu không phải chất Cơ, nguồn gây sát thương phải bỏ 2 lá trên tay hoặc chịu 1 sát thương.',
      },
    ],
  },
  {
    id: 'zhang_liao',
    nameVi: 'Trương Liêu',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'tu_xi',
        nameVi: 'Đột Tập',
        descriptionVi: 'Ở pha Rút bài, có thể bỏ qua rút bài từ chồng bài để lấy 1 lá trên tay của tối đa 2 người chơi khác.',
      },
    ],
  },
  {
    id: 'xu_chu',
    nameVi: 'Hứa Chử',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'luo_yi',
        nameVi: 'Lỏa Y',
        descriptionVi: 'Ở pha Rút bài, có thể rút ít hơn 1 lá để tăng +1 sát thương cho Sát và Quyết Đấu trong lượt này.',
      },
    ],
  },
  {
    id: 'guo_jia',
    nameVi: 'Quách Gia',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'tian_du',
        nameVi: 'Thiên Đố',
        descriptionVi: 'Sau khi lá phán xét của bạn có hiệu lực, có thể thu lấy lá phán xét đó.',
      },
      {
        id: 'yi_ji',
        nameVi: 'Di Kế',
        descriptionVi: 'Mỗi khi mất 1 máu, rút 2 lá bài rồi tự giữ hoặc chia cho đồng đội.',
      },
    ],
  },
  {
    id: 'zhen_ji',
    nameVi: 'Chân Cơ',
    faction: 'WEI',
    factionLabelVi: 'Ngụy',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'luo_shen',
        nameVi: 'Lạc Thần',
        descriptionVi: 'Đầu lượt, có thể phán xét liên tục: mỗi lá chất Đen thu về tay cho đến khi ra chất Đỏ thì dừng.',
      },
      {
        id: 'qing_guo',
        nameVi: 'Khuynh Quốc',
        descriptionVi: 'Có thể dùng bất kỳ lá bài chất Đen (Bích/Chuồn) trên tay như lá Thiểm.',
      },
    ],
  },

  // --- NGÔ (8 tướng) ---
  {
    id: 'sun_quan',
    nameVi: 'Tôn Quyền',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: true,
    skills: [
      {
        id: 'zhi_heng',
        nameVi: 'Chế Hành',
        descriptionVi: 'Một lần mỗi lượt đánh, bỏ đi bất kỳ số lượng bài nào (trên tay hoặc trang bị) và rút lại đúng bấy nhiêu lá.',
      },
      {
        id: 'jiu_yuan',
        nameVi: 'Cứu Viện',
        descriptionVi: 'Kỹ năng Chủ Công: Khi tướng Ngô khác dùng Đào cứu bạn lúc hấp hối, bạn hồi thêm 1 máu.',
        isLordSkill: true,
      },
    ],
  },
  {
    id: 'gan_ning',
    nameVi: 'Cam Ninh',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qi_xi',
        nameVi: 'Kỳ Tập',
        descriptionVi: 'Có thể dùng bất kỳ lá bài chất Đen nào (trên tay hoặc trang bị) như Quá Hà Sái Cầu.',
      },
    ],
  },
  {
    id: 'lu_meng',
    nameVi: 'Lữ Mông',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ke_ji',
        nameVi: 'Khắc Kỷ',
        descriptionVi: 'Nếu không dùng hoặc đánh ra Sát trong lượt đánh chính, được bỏ qua pha Bỏ bài.',
      },
    ],
  },
  {
    id: 'huang_gai',
    nameVi: 'Hoàng Cái',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ku_rou',
        nameVi: 'Khổ Nhục',
        descriptionVi: 'Trong lượt đánh, có thể tự mất 1 máu để rút ngay 2 lá bài.',
      },
    ],
  },
  {
    id: 'zhou_yu',
    nameVi: 'Chu Du',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'ying_zi',
        nameVi: 'Anh Tư',
        descriptionVi: 'Ở pha Rút bài, được rút thêm 1 lá (tổng 3 lá).',
      },
      {
        id: 'fan_jian',
        nameVi: 'Phản Gián',
        descriptionVi: 'Một lần mỗi lượt đánh, cho 1 người đoán chất rồi rút 1 lá trên tay bạn: đoán sai chịu 1 sát thương.',
      },
    ],
  },
  {
    id: 'da_qiao',
    nameVi: 'Đại Kiều',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'guo_se',
        nameVi: 'Quốc Sắc',
        descriptionVi: 'Có thể dùng bất kỳ lá bài chất Rô nào như Lạc Bất Tư Thục.',
      },
      {
        id: 'liu_li',
        nameVi: 'Lưu Ly',
        descriptionVi: 'Khi trở thành mục tiêu của Sát, có thể bỏ 1 lá để chuyển mục tiêu Sát sang người khác trong tầm đánh của bạn.',
      },
    ],
  },
  {
    id: 'lu_xun',
    nameVi: 'Lục Tốn',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qian_xun',
        nameVi: 'Khiêm Tốn',
        descriptionVi: 'Không thể trở thành mục tiêu của Thuận Thủ Khiên Dương và Lạc Bất Tư Thục.',
      },
      {
        id: 'lian_ying',
        nameVi: 'Liên Doanh',
        descriptionVi: 'Mỗi khi mất lá bài cuối cùng trên tay, rút ngay 1 lá bài.',
      },
    ],
  },
  {
    id: 'sun_shang_xiang',
    nameVi: 'Tôn Thượng Hương',
    faction: 'WU',
    factionLabelVi: 'Ngô',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'jie_yin',
        nameVi: 'Kết Hôn',
        descriptionVi: 'Một lần mỗi lượt đánh, bỏ 2 lá trên tay để cùng 1 tướng nam bị thương hồi 1 máu.',
      },
      {
        id: 'xiao_ji',
        nameVi: 'Kiêu Cơ',
        descriptionVi: 'Mỗi khi mất 1 lá trong khu Trang bị, rút ngay 2 lá bài.',
      },
    ],
  },

  // --- QUẦN (3 tướng) ---
  {
    id: 'hua_tuo',
    nameVi: 'Hoa Đà',
    faction: 'QUN',
    factionLabelVi: 'Quần',
    baseMaxHp: 3,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'qing_nang',
        nameVi: 'Thanh Nang',
        descriptionVi: 'Một lần mỗi lượt đánh, bỏ 1 lá trên tay để giúp 1 người hồi 1 máu.',
      },
      {
        id: 'ji_jiu',
        nameVi: 'Cấp Cứu',
        descriptionVi: 'Ngoài lượt của bạn, có thể dùng bất kỳ lá bài chất Đỏ nào như Đào.',
      },
    ],
  },
  {
    id: 'lu_bu',
    nameVi: 'Lữ Bố',
    faction: 'QUN',
    factionLabelVi: 'Quần',
    baseMaxHp: 4,
    gender: 'MALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'wu_shuang',
        nameVi: 'Vô Song',
        descriptionVi: 'Mục tiêu khi bị bạn đánh Sát cần dùng 2 lá Thiểm; khi Quyết Đấu cần đánh 2 lá Sát mỗi lần.',
      },
    ],
  },
  {
    id: 'diao_chan',
    nameVi: 'Điêu Thuyền',
    faction: 'QUN',
    factionLabelVi: 'Quần',
    baseMaxHp: 3,
    gender: 'FEMALE',
    isLordCandidate: false,
    skills: [
      {
        id: 'li_jian',
        nameVi: 'Ly Gián',
        descriptionVi: 'Một lần mỗi lượt đánh, bỏ 1 lá để buộc 2 tướng nam Quyết Đấu với nhau.',
      },
      {
        id: 'bi_yue',
        nameVi: 'Bế Nguyệt',
        descriptionVi: 'Ở pha Kết lượt, được rút thêm 1 lá bài.',
      },
    ],
  },
];

export const HERO_BY_ID: Readonly<Record<HeroId, HeroDefinition>> = HERO_CATALOG.reduce(
  (acc, hero) => {
    acc[hero.id] = hero;
    return acc;
  },
  {} as Record<HeroId, HeroDefinition>,
);

/** 3 tướng Chủ Công cố định luôn xuất hiện trong 5 lựa chọn đầu ván của Chủ Công. */
export const LORD_HERO_IDS: readonly HeroId[] = ['liu_bei', 'cao_cao', 'sun_quan'];

export function getHeroDefinition(heroId: HeroId): HeroDefinition {
  return HERO_BY_ID[heroId];
}
