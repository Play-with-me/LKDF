using System;
using System.Collections.Generic;
using CuuChau.Arena;
using CuuChau.Modals;
using CuuChau.Net;
using Newtonsoft.Json.Linq;

namespace CuuChau.Match
{
    /// <summary>
    /// Luật tính khoảng cách, tầm đánh, điều kiện ra bài, mục tiêu hợp lệ và phân tích Interrupt
    /// đồng bộ 100% với lõi @lkdf/shared cho máy khách Unity.
    /// </summary>
    public static class CuuChauCombatRules
    {
        public static bool RequiresTargetSelection(string cardKey)
        {
            return cardKey switch
            {
                "sat" or
                "pha_giap_tram" or
                "quyet_dau" or
                "qua_ha_sai_cau" or
                "thuan_thu_khien_duong" or
                "kinh_loi_chan" or
                "lac_bat_tu_thuc" or
                "ta_dao_sat_nhan" => true,
                _ => false,
            };
        }

        public static bool IsEquipmentCategory(string category)
        {
            return category is "WEAPON" or "ARMOR" or "PLUS_ONE_HORSE" or "MINUS_ONE_HORSE";
        }

        public static bool IsRedSuit(string suit)
        {
            return string.Equals(suit, "HEART", StringComparison.OrdinalIgnoreCase)
                || string.Equals(suit, "DIAMOND", StringComparison.OrdinalIgnoreCase);
        }

        public static PublicPlayerViewDto FindPlayerBySeat(PlayerViewStateDto view, int seatIndex)
        {
            if (view?.Players == null) return null;
            for (int i = 0; i < view.Players.Count; i++)
            {
                if (view.Players[i].SeatIndex == seatIndex) return view.Players[i];
            }
            return null;
        }

        public static int GetAttackRange(PublicPlayerViewDto player)
        {
            if (player?.Equipments?.Weapon == null || string.IsNullOrEmpty(player.Equipments.Weapon.CardKey))
            {
                return 1;
            }
            return EquipmentSlotGrid.GetWeaponRange(player.Equipments.Weapon.CardKey);
        }

        public static int CalculateSeatDistance(PlayerViewStateDto view, int fromSeat, int toSeat)
        {
            if (view?.Players == null) return int.MaxValue;
            if (fromSeat == toSeat) return 0;

            var aliveSeats = new List<int>(view.Players.Count);
            for (int i = 0; i < view.Players.Count; i++)
            {
                if (view.Players[i].Alive) aliveSeats.Add(view.Players[i].SeatIndex);
            }
            aliveSeats.Sort();

            int fromIdx = aliveSeats.IndexOf(fromSeat);
            int toIdx = aliveSeats.IndexOf(toSeat);
            if (fromIdx < 0 || toIdx < 0 || aliveSeats.Count == 0) return int.MaxValue;

            int total = aliveSeats.Count;
            int cw = (toIdx - fromIdx + total) % total;
            int ccw = (fromIdx - toIdx + total) % total;
            return Math.Min(cw, ccw);
        }

        public static int CalculateDistance(PlayerViewStateDto view, int fromSeat, int toSeat)
        {
            int baseDist = CalculateSeatDistance(view, fromSeat, toSeat);
            if (baseDist == int.MaxValue) return int.MaxValue;
            if (fromSeat == toSeat) return 0;

            var fromPlayer = FindPlayerBySeat(view, fromSeat);
            var toPlayer = FindPlayerBySeat(view, toSeat);
            if (fromPlayer == null || toPlayer == null || !fromPlayer.Alive || !toPlayer.Alive)
            {
                return int.MaxValue;
            }

            int modifier = 0;
            if (toPlayer.Equipments?.PlusOneHorse != null) modifier += 1;
            if (fromPlayer.Equipments?.MinusOneHorse != null) modifier -= 1;
            if (fromPlayer.HeroId == "ma_chao") modifier -= 1;
            if (toPlayer.HeroId == "ma_chao") { /* Ma Chao only reduces offensive distance */ }

            return Math.Max(1, baseDist + modifier);
        }

        public static bool IsInAttackRange(PlayerViewStateDto view, int fromSeat, int toSeat)
        {
            if (fromSeat == toSeat) return false;
            var fromPlayer = FindPlayerBySeat(view, fromSeat);
            var toPlayer = FindPlayerBySeat(view, toSeat);
            if (fromPlayer == null || toPlayer == null || !fromPlayer.Alive || !toPlayer.Alive) return false;
            return CalculateDistance(view, fromSeat, toSeat) <= GetAttackRange(fromPlayer);
        }

        public static bool HasAnyCardOrEquip(PublicPlayerViewDto p)
        {
            if (p == null) return false;
            if (p.HandCount > 0) return true;
            if (p.Equipments == null) return false;
            return p.Equipments.Weapon != null
                || p.Equipments.Armor != null
                || p.Equipments.PlusOneHorse != null
                || p.Equipments.MinusOneHorse != null;
        }

        public static List<int> GetValidTargetSeats(PlayerViewStateDto view, CardInstanceDto card)
        {
            var targets = new List<int>();
            if (view?.Players == null || card == null) return targets;

            int mySeat = view.ViewerSeatIndex;
            var me = view.MySeat;
            if (me == null || !me.Alive) return targets;

            bool unlimitedScrollRange = me.HeroId == "huang_yue_ying";

            for (int i = 0; i < view.Players.Count; i++)
            {
                var other = view.Players[i];
                if (!other.Alive || other.SeatIndex == mySeat) continue;

                switch (card.CardKey)
                {
                    case "sat":
                    case "pha_giap_tram":
                        if (IsInAttackRange(view, mySeat, other.SeatIndex))
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "thuan_thu_khien_duong":
                        if (other.HeroId != "lu_xun" &&
                            HasAnyCardOrEquip(other) &&
                            (unlimitedScrollRange || CalculateDistance(view, mySeat, other.SeatIndex) <= 1))
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "qua_ha_sai_cau":
                        if (HasAnyCardOrEquip(other))
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "lac_bat_tu_thuc":
                        if (other.HeroId != "lu_xun")
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "quyet_dau":
                    case "kinh_loi_chan":
                        targets.Add(other.SeatIndex);
                        break;

                    case "ta_dao_sat_nhan":
                        if (other.Equipments?.Weapon != null && FindFirstCollateralVictim(view, other.SeatIndex) >= 0)
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;
                }
            }

            return targets;
        }

        public static int FindFirstCollateralVictim(PlayerViewStateDto view, int attackerSeat)
        {
            if (view?.Players == null) return -1;
            for (int i = 0; i < view.Players.Count; i++)
            {
                var p = view.Players[i];
                if (p.Alive && p.SeatIndex != attackerSeat && IsInAttackRange(view, attackerSeat, p.SeatIndex))
                {
                    return p.SeatIndex;
                }
            }
            return -1;
        }

        public static bool IsCardPlayableInPlayPhase(PlayerViewStateDto view, CardInstanceDto card)
        {
            if (view == null || card == null) return false;
            var me = view.MySeat;
            if (me == null || !me.Alive) return false;

            if (IsEquipmentCategory(card.Category)) return true;

            return card.CardKey switch
            {
                "dao" => me.Hp < me.MaxHp,
                "vo_trung_sinh_huu" or
                "chan_khi_ho_the" or
                "nam_man_nhap_xam" or
                "van_tien_te_phat" or
                "dao_vien_ket_nghia" or
                "ngu_coc_phong_dang" or
                "thiem_dien" => true,
                "sat" or
                "pha_giap_tram" or
                "quyet_dau" or
                "qua_ha_sai_cau" or
                "thuan_thu_khien_duong" or
                "kinh_loi_chan" or
                "lac_bat_tu_thuc" or
                "ta_dao_sat_nhan" => GetValidTargetSeats(view, card).Count > 0,
                _ => false,
            };
        }

        public static bool IsCardPlayableForInterrupt(PlayerViewStateDto view, PublicInterruptViewDto intr, CardInstanceDto card)
        {
            if (view == null || intr == null || card == null) return false;
            var me = view.MySeat;
            string myHero = me?.HeroId ?? string.Empty;

            return intr.Kind switch
            {
                "WAIT_DODGE" or "WAIT_AOE_DODGE" or "WAIT_HU_JIA" =>
                    card.CardKey == "thiem" || (myHero == "zhen_ji" && !IsRedSuit(card.Suit)),

                "WAIT_AOE_SAT" or "WAIT_DUEL_SAT" or "WAIT_COLLATERAL_SAT" or "ASK_THANH_LONG" or "WAIT_JI_JIANG" =>
                    card.CardKey == "sat" || card.CardKey == "pha_giap_tram" || (myHero == "guan_yu" && IsRedSuit(card.Suit)),

                "WAIT_NULLIFICATION" =>
                    card.CardKey == "vo_giai_kha_kich",

                "WAIT_PEACH_RESCUE" =>
                    card.CardKey == "dao" || (myHero == "hua_tuo" && IsRedSuit(card.Suit)),

                "WAIT_GUI_CAI" or "ASK_LIU_LI" or "ASK_QUAN_THACH_PHU" or "WAIT_GANG_LIE_CHOICE" or "ASK_TU_HUNG" =>
                    true,

                "WAIT_HARVEST_PICK" =>
                    true,

                _ => false,
            };
        }

        public static int GetInterruptActorSeat(PublicInterruptViewDto intr, int viewerSeatIndex)
        {
            if (intr == null) return -1;

            if (intr.Kind == "WAIT_NULLIFICATION")
            {
                return intr.CanRespondNullification == true ? viewerSeatIndex : -1;
            }

            if (intr.Kind is "WAIT_PEACH_RESCUE" or "WAIT_JI_JIANG" or "WAIT_HU_JIA")
            {
                int? responder = GetExtraInt(intr, "responderSeat");
                if (responder.HasValue) return responder.Value;
            }

            return intr.TargetSeat;
        }

        public static int? GetExtraInt(PublicInterruptViewDto intr, string fieldName)
        {
            if (intr?.ExtraFields == null) return null;
            if (!intr.ExtraFields.TryGetValue(fieldName, out JToken token) || token == null || token.Type == JTokenType.Null)
            {
                return null;
            }
            return token.Type == JTokenType.Integer ? token.Value<int>() : null;
        }

        public static bool GetExtraBool(PublicInterruptViewDto intr, string fieldName, bool defaultValue = false)
        {
            if (intr?.ExtraFields == null) return defaultValue;
            if (!intr.ExtraFields.TryGetValue(fieldName, out JToken token) || token == null || token.Type == JTokenType.Null)
            {
                return defaultValue;
            }
            return token.Type == JTokenType.Boolean ? token.Value<bool>() : defaultValue;
        }

        public static string GetExtraString(PublicInterruptViewDto intr, string fieldName)
        {
            if (intr?.ExtraFields == null) return null;
            if (!intr.ExtraFields.TryGetValue(fieldName, out JToken token) || token == null || token.Type == JTokenType.Null)
            {
                return null;
            }
            return token.Value<string>();
        }

        public static List<CardInstanceDto> GetExtraCardList(PublicInterruptViewDto intr, string fieldName)
        {
            var result = new List<CardInstanceDto>();
            if (intr?.ExtraFields == null) return result;
            if (!intr.ExtraFields.TryGetValue(fieldName, out JToken token) || token is not JArray arr)
            {
                return result;
            }
            foreach (JToken item in arr)
            {
                var dto = item.ToObject<CardInstanceDto>();
                if (dto != null) result.Add(dto);
            }
            return result;
        }

        public static string BuildPhaseBannerVi(PlayerViewStateDto pv)
        {
            if (pv == null) return "Đang đồng bộ bàn đấu";

            if (pv.ActiveInterrupt != null)
            {
                int actorSeat = GetInterruptActorSeat(pv.ActiveInterrupt, pv.ViewerSeatIndex);
                string actorName = ResolveSeatHeroName(pv, actorSeat);
                return pv.ActiveInterrupt.Kind switch
                {
                    "WAIT_DODGE" or "WAIT_AOE_DODGE" => $"Chờ Né Thiểm · {actorName}",
                    "WAIT_NULLIFICATION" => $"Chờ Vô Giải Khả Kích · {pv.ActiveInterrupt.ScrollNameVi}",
                    "WAIT_PEACH_RESCUE" => $"Hấp Hối Cầu Đào · {actorName}",
                    "WAIT_AOE_SAT" or "WAIT_DUEL_SAT" or "WAIT_COLLATERAL_SAT" => $"Chờ Xuất Trảm · {actorName}",
                    "WAIT_HARVEST_PICK" => $"Ngũ Cốc Phong Đăng · {actorName}",
                    "PICK_TARGET_CARD" => $"Chọn Bài Mục Tiêu · {actorName}",
                    _ => $"Phản Ứng Kỹ Năng · {actorName}",
                };
            }

            string turnHeroName = ResolveSeatHeroName(pv, pv.CurrentTurnSeat);
            return pv.TurnPhase switch
            {
                "HERO_SELECT" => "Pha Chọn Hiệp Khách",
                "JUDGE" => $"Pha Phán Xét · {turnHeroName}",
                "DRAW" => $"Pha Rút Bài · {turnHeroName}",
                "PLAY" => $"Pha Xuất Chiêu · {turnHeroName}",
                "DISCARD" => $"Pha Bỏ Bài · {turnHeroName}",
                "END" => $"Kết Thúc Lượt · {turnHeroName}",
                "GAME_OVER" => "Ván Đấu Kết Thúc",
                _ => $"Lượt {turnHeroName}",
            };
        }

        public static string ResolveSeatHeroName(PlayerViewStateDto pv, int seatIndex)
        {
            var p = FindPlayerBySeat(pv, seatIndex);
            if (p == null) return $"Ghế {seatIndex + 1}";
            if (!string.IsNullOrEmpty(p.HeroId))
            {
                var info = CuuChauLoreLookup.GetHeroInfo(p.HeroId);
                if (!string.IsNullOrEmpty(info.NameVi)) return info.NameVi;
            }
            return !string.IsNullOrEmpty(p.DisplayName) ? p.DisplayName : $"Ghế {seatIndex + 1}";
        }
    }
}
