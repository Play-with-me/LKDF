using System;
using System.Collections.Generic;

namespace CuuChau.Modals
{
    /// <summary>
    /// Hồ sơ tĩnh một Hiệp Khách trong bộ Cửu Châu Ẩn Kiếm (25 tướng chuẩn).
    /// </summary>
    public readonly struct HeroLoreInfo
    {
        public readonly string HeroId;
        public readonly string LegacyId;
        public readonly string NameVi;
        public readonly string TitleVi;
        public readonly string FactionVi;
        public readonly string FactionCode;
        public readonly string SkillNameVi;
        public readonly string SkillDescVi;
        public readonly int MaxHp;
        public readonly bool IsLordCandidate;
        public readonly bool IsFemale;

        public HeroLoreInfo(
            string heroId,
            string legacyId,
            string nameVi,
            string titleVi,
            string factionVi,
            string factionCode,
            string skillNameVi,
            string skillDescVi,
            int maxHp,
            bool isLordCandidate = false,
            bool isFemale = false)
        {
            HeroId = heroId;
            LegacyId = legacyId;
            NameVi = nameVi;
            TitleVi = titleVi;
            FactionVi = factionVi;
            FactionCode = factionCode;
            SkillNameVi = skillNameVi;
            SkillDescVi = skillDescVi;
            MaxHp = maxHp;
            IsLordCandidate = isLordCandidate;
            IsFemale = isFemale;
        }
    }

    /// <summary>
    /// Hồ sơ tĩnh một mặt bài trong bộ bài 112 lá Cửu Châu Ẩn Kiếm (36 mặt bài).
    /// </summary>
    public readonly struct CardLoreInfo
    {
        public readonly string CardKey;
        public readonly string NameVi;
        public readonly string CategoryVi;
        public readonly string EffectVi;
        public readonly int DeckCount;

        public CardLoreInfo(
            string cardKey,
            string nameVi,
            string categoryVi,
            string effectVi,
            int deckCount = 1)
        {
            CardKey = cardKey;
            NameVi = nameVi;
            CategoryVi = categoryVi;
            EffectVi = effectVi;
            DeckCount = deckCount;
        }
    }

    /// <summary>
    /// Kho tra cứu tĩnh 100% đồng bộ ID với @lkdf/server (`cuuChauPack.ts`):
    /// 25 Hiệp Khách (kèm đầy đủ alias ID gốc và biến thể pinyin), 36 Mặt Bài (112 lá)
    /// và 4 Thân Phận chuẩn.
    /// </summary>
    public static class CuuChauLoreLookup
    {
        private static readonly HeroLoreInfo[] Heroes =
        {
            // --- THANH VÂN CÁC (7 hiệp khách · SHU) ---
            new(
                "lam_thanh_vu",
                "liu_bei",
                "Lâm Thanh Vũ",
                "Thanh Vân Minh Chủ",
                "Thanh Vân",
                "SHU",
                "Thanh Vân Độ · Vân Lệnh (Minh Chủ)",
                "• Thanh Vân Độ: Trong pha hành động, giao bài trên tay cho đồng đội; giao từ 2 lá hồi 1 Sinh Lực.\n• Vân Lệnh (Minh Chủ): Khi cần xuất Kiếm Trảm, đồng môn Thanh Vân có thể xuất thay; nhận thêm +1 rút khi Sinh Lực từ 2 trở xuống.",
                4,
                isLordCandidate: true),
            new(
                "trieu_thien_hanh",
                "guan_yu",
                "Triệu Thiên Hành",
                "Xích Khí Kiếm Thánh",
                "Thanh Vân",
                "SHU",
                "Xích Khí Trảm",
                "• Xích Khí Trảm: Dùng mọi lá Đỏ làm Kiếm Trảm; 1 lần/lượt khi Kiếm Trảm chất Đỏ đánh trúng, rút 1 lá.",
                4),
            new(
                "loi_chan_son",
                "zhang_fei",
                "Lôi Chấn Sơn",
                "Cuồng Lôi Hộ Pháp",
                "Thanh Vân",
                "SHU",
                "Cuồng Lôi Bộ",
                "• Cuồng Lôi Bộ: Trong lượt đánh, xuất Kiếm Trảm không giới hạn và luôn giảm 1 khoảng cách tới mục tiêu (3 Sinh Lực).",
                3),
            new(
                "tham_tinh_ha",
                "zhuge_liang",
                "Thẩm Tinh Hà",
                "Tinh Bàn Quân Sư",
                "Thanh Vân",
                "SHU",
                "Tinh Bàn Đạo · Vô Ngã Cảnh",
                "• Tinh Bàn Đạo: Đầu lượt xem tối đa 5 lá đỉnh bài rút để xếp lại; giới hạn giữ bài tăng +1.\n• Vô Ngã Cảnh: Khi tay trống, miễn nhiễm Kiếm Trảm, Phá Giáp Trảm, Sinh Tử Lôi Đài và Kinh Lôi Chấn.",
                3),
            new(
                "bach_ngoc_thanh",
                "zhao_yun",
                "Bạch Ngọc Thành",
                "Du Long Bạch Bào",
                "Thanh Vân",
                "SHU",
                "Du Long Thế",
                "• Du Long Thế: Dùng Kiếm Trảm như Thân Pháp và ngược lại; khi né ngoài lượt nếu tay còn tối đa 2 lá, rút 1 lá.",
                4),
            new(
                "khuong_vo_ta",
                "ma_chao",
                "Khương Vô Tà",
                "Truy Phong Kiếm Khách",
                "Thanh Vân",
                "SHU",
                "Truy Phong Ảnh · Phá Phong Quyết",
                "• Truy Phong Ảnh: Khoảng cách từ bạn tới mọi đối thủ giảm 1.\n• Phá Phong Quyết: Khi xuất Kiếm Trảm, có thể phán xét: ra Đỏ khiến mục tiêu không thể né; ra Đen rút bù 1 lá.",
                4),
            new(
                "to_mong_dao",
                "huang_yue_ying",
                "Tô Mộng Dao",
                "Thiên Cơ Tài Nữ",
                "Thanh Vân",
                "SHU",
                "Linh Tê Quyết · Thiên Cơ Thuật",
                "• Linh Tê Quyết: Mỗi khi thi triển bí kíp, rút ngay 1 lá; có trang bị thì pha Rút bài rút thêm +1.\n• Thiên Cơ Thuật: Dùng bí kíp không bị giới hạn khoảng cách.",
                3,
                isFemale: true),

            // --- HUYỀN THIẾT MÔN (7 hiệp khách · WEI) ---
            new(
                "han_thiet_phong",
                "cao_cao",
                "Hàn Thiết Phong",
                "Huyền Thiết Bá Chủ",
                "Huyền Thiết",
                "WEI",
                "Thiết Huyết Phản · Huyền Giáp Vệ (Minh Chủ)",
                "• Thiết Huyết Phản: Sau khi chịu sát thương từ một lá bài, thu lấy lá gây sát thương và rút thêm 1 lá.\n• Huyền Giáp Vệ (Minh Chủ): Khi cần Thân Pháp, đồng môn Huyền Thiết có thể xuất thay.",
                4,
                isLordCandidate: true),
            new(
                "co_huyen_co",
                "si_ma_yi",
                "Cố Huyền Cơ",
                "Nghịch Mệnh Quỷ Sư",
                "Huyền Thiết",
                "WEI",
                "Ám Đoạt Ấn · Nghịch Mệnh Phù",
                "• Ám Đoạt Ấn: Khi chịu sát thương, có thể rút 1 lá của kẻ gây thương.\n• Nghịch Mệnh Phù: Trước khi lá phán xét có hiệu lực, đánh 1 lá trên tay thay thế rồi rút 1 lá.",
                3),
            new(
                "nghiem_cuong",
                "xia_hou_dun",
                "Nghiêm Cương",
                "Bất Khuất Chiến Tướng",
                "Huyền Thiết",
                "WEI",
                "Bất Khuất Hồn",
                "• Bất Khuất Hồn: Khi chịu thương, phán xét: khác Cơ buộc đối thủ bỏ 2 lá hoặc mất 1 máu; ra Cơ rút 1 lá. Khi bị thương, +1 giữ bài.",
                4),
            new(
                "truong_huy_dieu",
                "zhang_liao",
                "Trương Huy Diệu",
                "Kỳ Tập Đô Thống",
                "Huyền Thiết",
                "WEI",
                "Kỳ Tập Đạo",
                "• Kỳ Tập Đạo: Ở pha Rút bài, có thể bỏ rút để đoạt 1 lá trên tay tối đa 2 đối thủ; giảm 1 tầm công và cuối lượt nếu tay còn tối đa 1 lá thì rút 1 lá.",
                4),
            new(
                "thach_pha_thien",
                "xu_chu",
                "Thạch Phá Thiên",
                "Bá Thể Cuồng Đồ",
                "Huyền Thiết",
                "WEI",
                "Bá Thể Phá",
                "• Bá Thể Phá: Rút ít đi 1 lá để Kiếm Trảm, Phá Giáp Trảm và Lôi Đài tăng +1 sát thương, đồng thời giảm 1 khoảng cách trong lượt.",
                4),
            new(
                "ly_tri_vi",
                "guo_jia",
                "Lý Tri Vi",
                "Thiên Mệnh Mưu Sĩ",
                "Huyền Thiết",
                "WEI",
                "Thiên Mệnh Thu · Di Sách Quyết",
                "• Thiên Mệnh Thu: Thu lá phán xét khi có hiệu lực; giới hạn giữ bài +1; cuối lượt nếu bị thương và tay còn tối đa 1 lá, rút 1 lá.\n• Di Sách Quyết: Mỗi khi mất 1 máu, rút 2 lá để tự giữ hoặc chia đồng đội.",
                3),
            new(
                "thuy_u_linh",
                "zhen_ji",
                "Thủy U Linh",
                "Hàn Giang Tiên Tử",
                "Huyền Thiết",
                "WEI",
                "Hàn Giang Ảnh · Thủy Bộ Pháp",
                "• Hàn Giang Ảnh: Đầu lượt phán xét liên tục: thu mọi lá Đen đến khi gặp chất Đỏ.\n• Thủy Bộ Pháp: Dùng mọi lá Đen trên tay làm Thân Pháp; khi chưa mặc Giáp, khoảng cách phòng thủ tăng +1.",
                3,
                isFemale: true),

            // --- XÍCH DIỄM ĐƯỜNG (8 hiệp khách · WU) ---
            new(
                "viem_liet_vuong",
                "sun_quan",
                "Viêm Liệt Vương",
                "Xích Diễm Tông Chủ",
                "Xích Diễm",
                "WU",
                "Dung Luyện Quyết · Xích Đan Cứu (Minh Chủ)",
                "• Dung Luyện Quyết: 1 lần/lượt bỏ bất kỳ số lá nào và rút lại đúng bấy nhiêu lá; tay còn tối đa 1 lá rút thêm +1.\n• Xích Đan Cứu (Minh Chủ): Khi đồng môn Xích Diễm dùng Hồi Xuân Đan cứu lúc hấp hối, hồi thêm +1 máu.",
                4,
                isLordCandidate: true),
            new(
                "cam_da_sat",
                "gan_ning",
                "Cam Dạ Sát",
                "Hắc Ảnh Du Hiệp",
                "Xích Diễm",
                "WU",
                "Hắc Ảnh Phá",
                "• Hắc Ảnh Phá: Dùng mọi lá Đen làm Phá Trận Chưởng; 1 lần/lượt khi dùng bí kíp còn tối đa 2 lá trên tay, rút 1 lá.",
                4),
            new(
                "luc_tram_an",
                "lu_meng",
                "Lục Trầm Ẩn",
                "Tĩnh Tâm Kiếm Tôn",
                "Xích Diễm",
                "WU",
                "Tĩnh Tâm Thủ",
                "• Tĩnh Tâm Thủ: Nếu không xuất Kiếm Trảm trong lượt, được bỏ qua pha Bỏ bài và rút 1 lá cuối lượt.",
                4),
            new(
                "hoang_bat_dich",
                "huang_gai",
                "Hoàng Bất Dịch",
                "Phần Tâm Lão Tướng",
                "Xích Diễm",
                "WU",
                "Phần Tâm Quyết",
                "• Phần Tâm Quyết: Trong pha hành động, tự mất 1 Sinh Lực để rút 2 lá; lần đầu/lượt tăng +1 lượt Kiếm Trảm; khi Sinh Lực từ 2 trở xuống, +1 giữ bài.",
                4),
            new(
                "tieu_viem_lang",
                "zhou_yu",
                "Tiêu Viêm Lãng",
                "Liệt Diễm Đô Đốc",
                "Xích Diễm",
                "WU",
                "Liệt Diễm Huy · Ly Tâm Ấn",
                "• Liệt Diễm Huy: Ở pha Rút bài rút thêm +1 lá; giới hạn giữ bài tăng +1.\n• Ly Tâm Ấn: 1 lần/lượt, để 1 đối thủ đoán chất rồi rút 1 lá của bạn: đoán sai chịu 1 sát thương và bạn rút 1 lá.",
                3),
            new(
                "ha_tuyet_nghi",
                "da_qiao",
                "Hạ Tuyết Nghi",
                "Chuyển Hoa Giai Nhân",
                "Xích Diễm",
                "WU",
                "Chỉ Huyệt Pháp · Chuyển Hoa Ảnh",
                "• Chỉ Huyệt Pháp: Dùng mọi lá chất Rô làm Điểm Huyệt Phong Mạch.\n• Chuyển Hoa Ảnh: Khi làm mục tiêu Kiếm Trảm, bỏ 1 lá chuyển đòn sang người khác; nếu tay còn tối đa 1 lá, rút 1 lá.",
                3,
                isFemale: true),
            new(
                "mo_dung_tuyet",
                "lu_xun",
                "Mộ Dung Tuyết",
                "Băng Tâm Thư Sinh",
                "Xích Diễm",
                "WU",
                "Băng Tâm Cảnh · Bạch Hạc Quy",
                "• Băng Tâm Cảnh: Miễn nhiễm Thám Nang Thủ & Điểm Huyệt Phong Mạch; bí kíp bỏ qua khoảng cách và giới hạn giữ bài tăng +1.\n• Bạch Hạc Quy: Mỗi khi mất lá cuối cùng trên tay, rút ngay 1 lá.",
                3),
            new(
                "bach_cam_y",
                "sun_shang_xiang",
                "Bạch Cẩm Y",
                "Xảo Trang Kiếm Cơ",
                "Xích Diễm",
                "WU",
                "Hợp Hoan Khí · Xảo Trang Vũ",
                "• Hợp Hoan Khí: 1 lần/lượt, bỏ 2 lá để cùng 1 hiệp khách nam bị thương hồi 1 Sinh Lực.\n• Xảo Trang Vũ: Mất trang bị rút 2 lá; mỗi khi thi triển bí kíp cũng rút thêm 1 lá.",
                3,
                isFemale: true),

            // --- U MINH ĐẠO (3 hiệp khách · QUN) ---
            new(
                "duoc_vo_uu",
                "hua_tuo",
                "Dược Vô Ưu",
                "Thanh Tâm Thần Y",
                "U Minh",
                "QUN",
                "Thanh Tâm Đan · Hồi Sinh Thủ",
                "• Thanh Tâm Đan: 1 lần/lượt bỏ 1 lá trên tay giúp 1 người hồi 1 Sinh Lực; nếu chữa cho đồng đội khác bản thân, rút 1 lá.\n• Hồi Sinh Thủ: Ngoài lượt mình, dùng mọi lá Đỏ làm Hồi Xuân Đan.",
                3),
            new(
                "tham_mac_ngon",
                "lu_bu",
                "Thẩm Mặc Ngôn",
                "Tuyệt Thế Ma Đao",
                "U Minh",
                "QUN",
                "Tuyệt Thế Ma Đao",
                "• Tuyệt Thế Ma Đao: Kiếm Trảm buộc 2 Thân Pháp để né, Lôi Đài buộc 2 Kiếm Trảm; khoảng cách giảm 1.",
                4),
            new(
                "da_vo_ngan",
                "diao_chan",
                "Dạ Vô Ngân",
                "Nguyệt Ẩn Tuyệt Sắc",
                "U Minh",
                "QUN",
                "Mê Hồn Ấn · Nguyệt Ẩn Ảnh",
                "• Mê Hồn Ấn: 1 lần/lượt bỏ 1 lá buộc 2 hiệp khách nam vào Sinh Tử Lôi Đài.\n• Nguyệt Ẩn Ảnh: Cuối lượt rút 1 lá; nếu bài trên tay còn tối đa 1 lá thì rút 2 lá.",
                3,
                isFemale: true),
        };

        private static readonly CardLoreInfo[] Cards =
        {
            // --- CƠ BẢN (4 mặt bài · 55 lá) ---
            new(
                "sat",
                "Kiếm Trảm",
                "Cơ Bản",
                "Gây 1 sát thương cho 1 mục tiêu trong tầm đánh (mặc định 1 lần mỗi lượt hành động).",
                30),
            new(
                "pha_giap_tram",
                "Phá Giáp Trảm",
                "Cơ Bản · Đặc Biệt",
                "Đòn Sát đặc biệt (dùng chung giới hạn 1 lần/lượt): Bỏ qua Giáp mục tiêu và rút 1 lá nếu trúng đòn.",
                2),
            new(
                "thiem",
                "Thân Pháp",
                "Cơ Bản",
                "Phản ứng né tránh đòn Kiếm Trảm hoặc Loạn Tiễn Xuyên Vân.",
                15),
            new(
                "dao",
                "Hồi Xuân Đan",
                "Cơ Bản",
                "Hồi 1 Sinh Lực cho bản thân trong lượt hoặc cứu 1 Sinh Lực cho người đang hấp hối.",
                8),

            // --- CẨM NANG THƯỜNG (12 mặt bài · 33 lá) ---
            new(
                "vo_trung_sinh_huu",
                "Tụ Khí Quyết",
                "Cẩm Nang Thường",
                "Vận khí rút ngay 2 lá bài từ chồng bài rút.",
                4),
            new(
                "thuan_thu_khien_duong",
                "Thám Nang Thủ",
                "Cẩm Nang Thường",
                "Chiếm lấy 1 lá trên tay hoặc trang bị của mục tiêu ở khoảng cách 1.",
                4),
            new(
                "qua_ha_sai_cau",
                "Phá Trận Chưởng",
                "Cẩm Nang Thường",
                "Hủy 1 lá trên tay, trang bị hoặc ấn chú của bất kỳ đối thủ nào.",
                5),
            new(
                "kinh_loi_chan",
                "Kinh Lôi Chấn",
                "Cẩm Nang Thường · Đặc Biệt",
                "Chọn 1 đối thủ: Nếu trên tay họ còn tối đa 1 lá thì gây 1 sát thương; ngược lại hủy 1 lá của họ.",
                2),
            new(
                "quyet_dau",
                "Sinh Tử Lôi Đài",
                "Cẩm Nang Thường",
                "Cùng mục tiêu lần lượt xuất Kiếm Trảm (mục tiêu ra trước); ai hụt chiêu chịu 1 sát thương.",
                3),
            new(
                "ta_dao_sat_nhan",
                "Tá Kiếm Trảm Phong",
                "Cẩm Nang Thường",
                "Ép người có binh khí xuất Kiếm Trảm vào mục tiêu trong tầm của họ, hoặc giao nộp binh khí.",
                2),
            new(
                "nam_man_nhap_xam",
                "Vạn Kiếm Quy Tông",
                "Cẩm Nang Thường",
                "Tất cả đối thủ lần lượt xuất 1 Kiếm Trảm hoặc chịu 1 sát thương.",
                3),
            new(
                "van_tien_te_phat",
                "Loạn Tiễn Xuyên Vân",
                "Cẩm Nang Thường",
                "Tất cả đối thủ lần lượt xuất 1 Thân Pháp hoặc chịu 1 sát thương.",
                1),
            new(
                "dao_vien_ket_nghia",
                "Hội Minh Tụ Nghĩa",
                "Cẩm Nang Thường",
                "Toàn bộ cao thủ còn sống trên bàn đều hồi 1 Sinh Lực (nếu chưa đầy).",
                1),
            new(
                "ngu_coc_phong_dang",
                "Thiên Bảo Xuất Thế",
                "Cẩm Nang Thường",
                "Lật mở số lá bằng sĩ số còn sống; từng người theo vòng chọn lấy 1 lá.",
                2),
            new(
                "vo_giai_kha_kich",
                "Hóa Giải Chân Khí",
                "Cẩm Nang Thường",
                "Triệt tiêu hiệu lực của một bí kíp sắp phát động (hoặc một lá Hóa Giải khác).",
                4),
            new(
                "chan_khi_ho_the",
                "Chân Khí Hộ Thể",
                "Cẩm Nang Thường · Đặc Biệt",
                "Nếu đang mất máu: Hồi 1 Sinh Lực và rút 1 lá. Nếu đầy máu: Rút 2 lá.",
                2),

            // --- CẨM NANG THỜI GIAN (2 mặt bài · 4 lá) ---
            new(
                "lac_bat_tu_thuc",
                "Điểm Huyệt Phong Mạch",
                "Cẩm Nang Thời Gian",
                "Đặt lên vùng phán xét đối thủ: đầu lượt phán xét không ra chất Cơ sẽ bị mất pha hành động.",
                3),
            new(
                "thiem_dien",
                "Thiên Lôi Kiếp",
                "Cẩm Nang Thời Gian",
                "Đầu lượt phán xét ra Bích 2–9 chịu 3 lôi sát thương; trượt thì chuyển sang người kế tiếp.",
                1),

            // --- VŨ KHÍ (10 mặt bài · 11 lá) ---
            new(
                "gia_cat_lien_no",
                "Liên Hoàn Nỏ",
                "Vũ Khí · Tầm 1",
                "Tầm đánh 1: Trong pha hành động, xuất Kiếm Trảm không giới hạn số lần.",
                2),
            new(
                "tu_hung_song_co_kiem",
                "Hàn Tâm Song Kiếm",
                "Vũ Khí · Tầm 2",
                "Tầm đánh 2: Khi Kiếm Trảm mục tiêu khác giới, họ chọn bỏ 1 lá trên tay hoặc cho bạn rút 1 lá.",
                1),
            new(
                "thanh_cong_kiem",
                "Thanh Phong Kiếm",
                "Vũ Khí · Tầm 2",
                "Tầm đánh 2: Khi xuất Kiếm Trảm, xuyên phá toàn bộ hiệu ứng hộ giáp của mục tiêu.",
                1),
            new(
                "han_bang_kiem",
                "Băng Phách Kiếm",
                "Vũ Khí · Tầm 2",
                "Tầm đánh 2: Khi Kiếm Trảm gây sát thương trúng mục tiêu có bài, có thể hủy tối đa 2 lá của họ thay cho sát thương.",
                1),
            new(
                "tu_khi_hoan",
                "Tụ Khí Hoàn",
                "Vũ Khí · Tầm 2",
                "Tầm đánh 2: Khi Kiếm Trảm hoặc Phá Giáp Trảm của bạn bị né tránh, rút ngay 1 lá bài.",
                1),
            new(
                "thanh_long_yen_nguyet_dao",
                "Huyền Long Đao",
                "Vũ Khí · Tầm 3",
                "Tầm đánh 3: Khi Kiếm Trảm bị Thân Pháp né được, được đánh tiếp 1 Kiếm Trảm khác vào mục tiêu đó.",
                1),
            new(
                "truong_bat_xa_mau",
                "Xà Ảnh Mâu",
                "Vũ Khí · Tầm 3",
                "Tầm đánh 3: Hợp 2 lá bất kỳ trên tay thành 1 Kiếm Trảm.",
                1),
            new(
                "quan_thach_phu",
                "Phá Sơn Phủ",
                "Vũ Khí · Tầm 3",
                "Tầm đánh 3: Khi Kiếm Trảm bị né, bỏ thêm 2 lá khác để ép đòn đánh trúng mục tiêu.",
                1),
            new(
                "phuong_thien_hoa_kich",
                "Cửu Thiên Họa Kích",
                "Vũ Khí · Tầm 4",
                "Tầm đánh 4: Khi lá Kiếm Trảm là lá cuối cùng trên tay, chọn tối đa 3 mục tiêu.",
                1),
            new(
                "ky_lan_cung",
                "Linh Điểu Cung",
                "Vũ Khí · Tầm 5",
                "Tầm đánh 5: Khi Kiếm Trảm gây sát thương, có thể hủy 1 khinh công (+1 hoặc -1) của mục tiêu.",
                1),

            // --- PHÒNG CỤ / GIÁP (2 mặt bài trong bộ 112 lá · 3 lá) ---
            new(
                "bat_quai_tran",
                "Bát Quái Y",
                "Phòng Cụ · Giáp",
                "Khi cần dùng hoặc đánh ra Thân Pháp, có thể phán xét: ra chất Đỏ coi như đã xuất Thân Pháp.",
                2),
            new(
                "hoan_anh_giap",
                "Huyễn Ảnh Giáp",
                "Phòng Cụ · Giáp",
                "Giáp: Mọi sát thương đơn lẻ lớn hơn 1 nhắm vào bạn đều giảm xuống còn 1.",
                1),

            // --- KHINH CÔNG +1 (3 mặt bài · 3 lá) ---
            new(
                "tuyet_anh",
                "Đạp Tuyết Vô Ngân",
                "Khinh Công +1",
                "Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.",
                1),
            new(
                "dich_lo",
                "Lăng Ba Vi Bộ",
                "Khinh Công +1",
                "Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.",
                1),
            new(
                "trao_hoang_phi_dien",
                "Ngự Phong Hài",
                "Khinh Công +1",
                "Khinh công +1: Khoảng cách từ kẻ địch tới bạn tăng thêm +1.",
                1),

            // --- THÂN PHÁP -1 (3 mặt bài · 3 lá) ---
            new(
                "xich_tho",
                "Truy Ảnh Hài",
                "Thân Pháp -1",
                "Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.",
                1),
            new(
                "dai_uyen",
                "Xích Diễm Câu",
                "Thân Pháp -1",
                "Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.",
                1),
            new(
                "tu_tinh",
                "Huyền Lôi Tuấn",
                "Thân Pháp -1",
                "Thân pháp -1: Khoảng cách từ bạn tới mọi đối thủ giảm đi 1.",
                1),
        };

        private static readonly CardLoreInfo LegacyShieldFallback = new(
            "nhan_vuong_thuan",
            "Huyền Thiết Thuẫn",
            "Phòng Cụ · Giáp",
            "Hóa giải hoàn toàn mọi lá Kiếm Trảm màu Đen (Bích/Chuồn) nhắm vào bạn.",
            1);

        private static readonly Dictionary<string, HeroLoreInfo> HeroByKey = BuildHeroLookup();
        private static readonly Dictionary<string, CardLoreInfo> CardByKey = BuildCardLookup();

        private static Dictionary<string, HeroLoreInfo> BuildHeroLookup()
        {
            var dict = new Dictionary<string, HeroLoreInfo>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < Heroes.Length; i++)
            {
                HeroLoreInfo h = Heroes[i];
                dict[h.HeroId] = h;
                if (!string.IsNullOrEmpty(h.LegacyId))
                {
                    dict[h.LegacyId] = h;
                }
            }

            // Alias pinyin rút gọn không dấu gạch dưới giữa họ-tên từ một số bản payload cũ
            RegisterHeroAlias(dict, "huang_yueying", "to_mong_dao");
            RegisterHeroAlias(dict, "sima_yi", "co_huyen_co");
            RegisterHeroAlias(dict, "xiahou_dun", "nghiem_cuong");
            RegisterHeroAlias(dict, "lv_meng", "luc_tram_an");
            RegisterHeroAlias(dict, "sun_shangxiang", "bach_cam_y");
            RegisterHeroAlias(dict, "lv_bu", "tham_mac_ngon");
            RegisterHeroAlias(dict, "diep_vu_ngung", "da_vo_ngan");

            return dict;
        }

        private static void RegisterHeroAlias(
            Dictionary<string, HeroLoreInfo> dict,
            string alias,
            string canonicalId)
        {
            if (dict.TryGetValue(canonicalId, out HeroLoreInfo info))
            {
                dict[alias] = info;
            }
        }

        private static Dictionary<string, CardLoreInfo> BuildCardLookup()
        {
            var dict = new Dictionary<string, CardLoreInfo>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < Cards.Length; i++)
            {
                dict[Cards[i].CardKey] = Cards[i];
            }
            dict[LegacyShieldFallback.CardKey] = LegacyShieldFallback;
            return dict;
        }

        public static HeroLoreInfo GetHeroInfo(string heroId)
        {
            if (!string.IsNullOrWhiteSpace(heroId))
            {
                string trimmed = heroId.Trim();
                if (HeroByKey.TryGetValue(trimmed, out HeroLoreInfo info))
                {
                    return info;
                }
            }

            string fallbackId = string.IsNullOrWhiteSpace(heroId) ? "unknown" : heroId.Trim();
            return new HeroLoreInfo(
                fallbackId,
                fallbackId,
                fallbackId,
                "Hiệp Khách Cửu Châu",
                "Ẩn Thế",
                "QUN",
                "Chưa rõ",
                "Hiệp khách giang hồ chưa có ghi chép chi tiết.",
                4);
        }

        public static IReadOnlyList<HeroLoreInfo> GetAllHeroes() => Heroes;

        public static CardLoreInfo GetCardInfo(string cardKey)
        {
            if (!string.IsNullOrWhiteSpace(cardKey))
            {
                string trimmed = cardKey.Trim();
                if (CardByKey.TryGetValue(trimmed, out CardLoreInfo info))
                {
                    return info;
                }
            }

            string fallbackKey = string.IsNullOrWhiteSpace(cardKey) ? "unknown" : cardKey.Trim();
            return new CardLoreInfo(
                fallbackKey,
                fallbackKey,
                "Khác",
                "Chưa có mô tả chi tiết cho lá bài này.",
                1);
        }

        public static IReadOnlyList<CardLoreInfo> GetAllCards() => Cards;

        public static string GetIdentityNameVi(string identity)
        {
            if (string.IsNullOrWhiteSpace(identity)) return "Ẩn";
            return identity.Trim().ToUpperInvariant() switch
            {
                "LORD" => "Chủ Công",
                "LOYALIST" => "Hộ Pháp",
                "REBEL" => "Nghĩa Quân",
                "SPY" => "Ám Ảnh",
                "UNKNOWN" => "Ẩn",
                _ => identity,
            };
        }

        public static string GetIdentityGoalVi(string identity)
        {
            if (string.IsNullOrWhiteSpace(identity)) return "Thân phận đang ẩn.";
            return identity.Trim().ToUpperInvariant() switch
            {
                "LORD" => "Hạ toàn bộ Nghĩa Quân & Ám Ảnh",
                "LOYALIST" => "Bảo vệ Chủ Công · Hạ toàn bộ Nghĩa Quân & Ám Ảnh",
                "REBEL" => "Hạ gục Chủ Công trước khi Ám Ảnh độc chiếm bàn đấu",
                "SPY" => "Trở thành người duy nhất còn sống cuối cùng trên bàn",
                "UNKNOWN" => "Thân phận chưa được tiết lộ",
                _ => string.Empty,
            };
        }

        public static string GetWinningFactionNameVi(string winningFaction)
        {
            if (string.IsNullOrWhiteSpace(winningFaction)) return "Chưa phân thắng bại";
            return winningFaction.Trim().ToUpperInvariant() switch
            {
                "LORD_LOYALIST" => "Phe Chủ Công & Hộ Pháp Thắng Lợi",
                "REBEL" => "Phe Nghĩa Quân Thắng Lợi",
                "SPY" => "Ám Ảnh Độc Chiếm Thắng Lợi",
                _ => winningFaction,
            };
        }

        public static string GetWinningFactionDetailVi(string winningFaction)
        {
            if (string.IsNullOrWhiteSpace(winningFaction)) return string.Empty;
            return winningFaction.Trim().ToUpperInvariant() switch
            {
                "LORD_LOYALIST" => "Chủ Công bình yên vô sự · Toàn bộ Nghĩa Quân và Ám Ảnh đã bị hạ gục.",
                "REBEL" => "Chủ Công đã ngã xuống · Nghĩa Quân lật đổ thành công cục diện Cửu Châu.",
                "SPY" => "Chủ Công ngã xuống và Ám Ảnh là cao thủ duy nhất sống sót cuối cùng trên bàn.",
                _ => string.Empty,
            };
        }
    }
}
