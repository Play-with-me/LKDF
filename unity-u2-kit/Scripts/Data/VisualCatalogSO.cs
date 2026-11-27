using System;
using System.Collections.Generic;
using UnityEngine;

namespace CuuChau.Data
{
    [Serializable]
    public struct HeroPortraitEntry
    {
        public string heroId;
        public string legacyId;
        public string displayNameVi;
        public Sprite backgroundLayer;
        public Sprite foregroundLayer;
        public Sprite fullComposite;
    }

    [Serializable]
    public struct CardArtEntry
    {
        public string cardKey;
        public string displayNameVi;
        public Sprite artSprite;
    }

    [Serializable]
    public struct NamedAudioEntry
    {
        public string key;
        public AudioClip clip;
    }

    /// <summary>
    /// Kho tài nguyên hình ảnh & âm thanh 100% tách biệt khỏi logic JSON mạng,
    /// ánh xạ từ 112 lá bài / 25 hiệp khách sang vật liệu 3D, tranh tách lớp 2.5D và 56 file .ogg.
    /// </summary>
    [CreateAssetMenu(fileName = "VisualCatalog", menuName = "CuuChau/Visual Catalog")]
    public sealed class VisualCatalogSO : ScriptableObject
    {
        [Header("Vật liệu Bàn & Khung 3D Blender")]
        public Sprite tableBoard25D;
        public Sprite lobbyHallBackdrop;
        public Sprite cardFrame9Slice;
        public Sprite seatFrame9Slice;
        public Sprite silkScrollTooltip9Slice;
        public Sprite cardBackCuuChau;

        [Header("Ngọc Sinh Lực 3D & Ấn Đồng HUD")]
        public Sprite hpJadeFull;
        public Sprite hpAmberMid;
        public Sprite hpCrimsonLow;
        public Sprite hpSocketEmpty;
        public Sprite sealBattleLog;
        public Sprite sealSettingsGear;

        [Header("Huy Hiệu Vector 9-Slice")]
        public Sprite suitSpade;
        public Sprite suitClub;
        public Sprite suitHeart;
        public Sprite suitDiamond;
        public Sprite factionThienKiem;
        public Sprite factionHuyenThiet;
        public Sprite factionGiangNam;
        public Sprite factionAnSat;
        public Sprite targetReticleRing;
        public Sprite arrowHeadSilk;
        public Sprite actionButtonPrimary9Slice;

        [Header("Tranh Hiệp Khách & Lá Bài 2.5D")]
        public List<HeroPortraitEntry> heroPortraits = new();
        public List<CardArtEntry> cardArts = new();

        [Header("Âm Nhạc Phòng Thu (-20 LUFS) & Foley")]
        public AudioClip bgmLobby;
        public AudioClip bgmBattle;
        public AudioClip bgmClimaxDrums;
        public List<NamedAudioEntry> sfxClips = new();

        public Sprite GetSuitSprite(string suit)
        {
            return suit switch
            {
                "SPADE" => suitSpade,
                "CLUB" => suitClub,
                "HEART" => suitHeart,
                "DIAMOND" => suitDiamond,
                _ => suitSpade,
            };
        }

        public Sprite GetFactionSprite(string faction)
        {
            return faction switch
            {
                "WEI" or "THIEN_KIEM" => factionThienKiem,
                "SHU" or "HUYEN_THIET" => factionHuyenThiet,
                "WU" or "GIANG_NAM" => factionGiangNam,
                _ => factionAnSat,
            };
        }

        public HeroPortraitEntry? FindHero(string heroId)
        {
            if (string.IsNullOrWhiteSpace(heroId)) return null;
            string key = heroId.Trim();

            HeroPortraitEntry? direct = FindHeroByKey(key);
            if (direct.HasValue) return direct;

            string alt = NormalizeHeroAlias(key);
            if (!string.IsNullOrEmpty(alt))
            {
                HeroPortraitEntry? byAlt = FindHeroByKey(alt);
                if (byAlt.HasValue) return byAlt;
            }

            string canonical = MapHeroAliasToCanonical(key);
            if (!string.IsNullOrEmpty(canonical))
            {
                HeroPortraitEntry? byCanonical = FindHeroByKey(canonical);
                if (byCanonical.HasValue) return byCanonical;
            }

            return null;
        }

        private HeroPortraitEntry? FindHeroByKey(string key)
        {
            for (int i = 0; i < heroPortraits.Count; i++)
            {
                HeroPortraitEntry entry = heroPortraits[i];
                if (string.Equals(entry.heroId, key, StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrEmpty(entry.legacyId) &&
                     string.Equals(entry.legacyId, key, StringComparison.OrdinalIgnoreCase)))
                {
                    return entry;
                }
            }
            return null;
        }

        private static string NormalizeHeroAlias(string key)
        {
            return key.ToLowerInvariant() switch
            {
                "sima_yi" => "si_ma_yi",
                "si_ma_yi" => "sima_yi",
                "xiahou_dun" => "xia_hou_dun",
                "xia_hou_dun" => "xiahou_dun",
                "huang_yueying" => "huang_yue_ying",
                "huang_yue_ying" => "huang_yueying",
                "lv_meng" => "lu_meng",
                "lu_meng" => "lv_meng",
                "sun_shangxiang" => "sun_shang_xiang",
                "sun_shang_xiang" => "sun_shangxiang",
                "lv_bu" => "lu_bu",
                "lu_bu" => "lv_bu",
                "diep_vu_ngung" => "da_vo_ngan",
                "da_vo_ngan" => "diep_vu_ngung",
                _ => null,
            };
        }

        private static string MapHeroAliasToCanonical(string key)
        {
            return key.ToLowerInvariant() switch
            {
                "sima_yi" or "si_ma_yi" => "co_huyen_co",
                "xiahou_dun" or "xia_hou_dun" => "nghiem_cuong",
                "huang_yueying" or "huang_yue_ying" => "to_mong_dao",
                "lv_meng" or "lu_meng" => "luc_tram_an",
                "sun_shangxiang" or "sun_shang_xiang" => "bach_cam_y",
                "lv_bu" or "lu_bu" => "tham_mac_ngon",
                "diep_vu_ngung" or "da_vo_ngan" or "diao_chan" => "da_vo_ngan",
                "trieu_thien_hanh" or "guan_yu" => "trieu_thien_hanh",
                _ => null,
            };
        }

        public Sprite FindCardArt(string cardKey)
        {
            if (!string.IsNullOrWhiteSpace(cardKey))
            {
                string key = cardKey.Trim();
                for (int i = 0; i < cardArts.Count; i++)
                {
                    if (string.Equals(cardArts[i].cardKey, key, StringComparison.OrdinalIgnoreCase))
                    {
                        return cardArts[i].artSprite;
                    }
                }

                if (string.Equals(key, "nhan_vuong_thuan", StringComparison.OrdinalIgnoreCase))
                {
                    for (int i = 0; i < cardArts.Count; i++)
                    {
                        if (string.Equals(cardArts[i].cardKey, "hoan_anh_giap", StringComparison.OrdinalIgnoreCase))
                        {
                            return cardArts[i].artSprite;
                        }
                    }
                }
            }
            return cardArts.Count > 0 ? cardArts[0].artSprite : null;
        }

        public AudioClip FindSfx(string key)
        {
            for (int i = 0; i < sfxClips.Count; i++)
            {
                if (sfxClips[i].key == key) return sfxClips[i].clip;
            }
            return null;
        }
    }
}
