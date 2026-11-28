using System;
using System.Collections.Generic;
using CuuChau.Arena;
using CuuChau.Modals;
using CuuChau.Net;
using Newtonsoft.Json.Linq;

namespace CuuChau.Match
{
    /// <summary>
    /// Luật tính khoảng cách, tầm đánh, điều kiện ra bài, chuyển đổi bài ảo, mục tiêu hợp lệ
    /// và phân tích Interrupt đồng bộ 100% với lõi @lkdf/shared cho máy khách Unity.
    /// </summary>
    public static class CuuChauCombatRules
    {
        public static string NormalizeLegacyHeroId(string heroId)
        {
            if (string.IsNullOrWhiteSpace(heroId)) return string.Empty;
            HeroLoreInfo info = CuuChauLoreLookup.GetHeroInfo(heroId);
            return !string.IsNullOrEmpty(info.LegacyId) ? info.LegacyId : heroId.Trim();
        }

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

        public static bool IsBlackSuit(string suit)
        {
            return string.Equals(suit, "SPADE", StringComparison.OrdinalIgnoreCase)
                || string.Equals(suit, "CLUB", StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsDiamondSuit(string suit)
        {
            return string.Equals(suit, "DIAMOND", StringComparison.OrdinalIgnoreCase);
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

        public static int GetMaxSatPerTurn(PlayerViewStateDto view, PublicPlayerViewDto player)
        {
            if (player == null) return 0;
            string legacyHero = NormalizeLegacyHeroId(player.HeroId);
            if (legacyHero == "zhang_fei" || player.Equipments?.Weapon?.CardKey == "gia_cat_lien_no")
            {
                return int.MaxValue;
            }
            int bonus = view?.TurnFlags?.BonusSatLimitThisTurn ?? 0;
            return Math.Max(1, 1 + bonus);
        }

        public static bool CanUseStrikeInPlayPhase(PlayerViewStateDto view, PublicPlayerViewDto player)
        {
            if (view == null || player == null || !player.Alive) return false;
            if (view.PeacefulFirstRound && view.RoundNumber == 1) return false;
            int satUsed = view.TurnFlags?.SatUsedThisTurn ?? 0;
            int maxSat = GetMaxSatPerTurn(view, player);
            return satUsed < maxSat;
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
            if (view?.Players == null) return int.MaxValue;
            if (fromSeat == toSeat) return 0;

            var fromPlayer = FindPlayerBySeat(view, fromSeat);
            var toPlayer = FindPlayerBySeat(view, toSeat);
            if (fromPlayer == null || toPlayer == null || !fromPlayer.Alive || !toPlayer.Alive)
            {
                return int.MaxValue;
            }

            if (fromSeat == view.ViewerSeatIndex &&
                toPlayer.DistanceFromViewer.HasValue &&
                toPlayer.DistanceFromViewer.Value > 0)
            {
                return toPlayer.DistanceFromViewer.Value;
            }

            int baseDist = CalculateSeatDistance(view, fromSeat, toSeat);
            if (baseDist == int.MaxValue) return int.MaxValue;

            int modifier = 0;
            if (toPlayer.Equipments?.PlusOneHorse != null) modifier += 1;
            if (fromPlayer.Equipments?.MinusOneHorse != null) modifier -= 1;

            string fromLegacy = NormalizeLegacyHeroId(fromPlayer.HeroId);
            string toLegacy = NormalizeLegacyHeroId(toPlayer.HeroId);
            bool isCuuChau = view.EnabledPacks == null
                || view.EnabledPacks.Count == 0
                || view.EnabledPacks.Contains("cuu_chau_core");

            if (fromLegacy == "ma_chao")
            {
                modifier -= 1;
            }
            else if (isCuuChau && (fromLegacy is "zhang_fei" or "zhang_liao" or "lu_bu"))
            {
                modifier -= 1;
            }
            else if (isCuuChau && fromLegacy == "xu_chu" &&
                     view.CurrentTurnSeat == fromSeat &&
                     GetTurnFlagBool(view.TurnFlags, "luoYiActive"))
            {
                modifier -= 1;
            }

            if (isCuuChau && toLegacy == "zhen_ji" && toPlayer.Equipments?.Armor == null)
            {
                modifier += 1;
            }

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

        public static bool IsTargetImmuneToCard(PublicPlayerViewDto target, string cardKey)
        {
            if (target == null) return true;
            string legacyHero = NormalizeLegacyHeroId(target.HeroId);
            if (legacyHero == "zhuge_liang" && target.HandCount == 0 &&
                cardKey is "sat" or "pha_giap_tram" or "quyet_dau" or "kinh_loi_chan")
            {
                return true;
            }
            if (legacyHero == "lu_xun" &&
                cardKey is "thuan_thu_khien_duong" or "lac_bat_tu_thuc")
            {
                return true;
            }
            return false;
        }

        public static List<int> GetValidCollateralVictimSeats(PlayerViewStateDto view, int attackerSeat)
        {
            var victims = new List<int>();
            if (view?.Players == null) return victims;

            int selfAsFallback = -1;
            for (int i = 0; i < view.Players.Count; i++)
            {
                var p = view.Players[i];
                if (!p.Alive || p.SeatIndex == attackerSeat) continue;
                if (IsTargetImmuneToCard(p, "sat")) continue;
                if (!IsInAttackRange(view, attackerSeat, p.SeatIndex)) continue;

                if (p.SeatIndex == view.ViewerSeatIndex)
                {
                    selfAsFallback = p.SeatIndex;
                }
                else
                {
                    victims.Add(p.SeatIndex);
                }
            }

            if (selfAsFallback >= 0)
            {
                victims.Add(selfAsFallback);
            }
            return victims;
        }

        public static int FindFirstCollateralVictim(PlayerViewStateDto view, int attackerSeat)
        {
            List<int> victims = GetValidCollateralVictimSeats(view, attackerSeat);
            return victims.Count > 0 ? victims[0] : -1;
        }

        public static List<int> GetValidTargetSeatsForCardKey(PlayerViewStateDto view, string effectiveCardKey)
        {
            var targets = new List<int>();
            if (view?.Players == null || string.IsNullOrEmpty(effectiveCardKey)) return targets;

            int mySeat = view.ViewerSeatIndex;
            var me = view.MySeat;
            if (me == null || !me.Alive) return targets;

            string myLegacyHero = NormalizeLegacyHeroId(me.HeroId);
            bool unlimitedScrollRange = myLegacyHero is "huang_yue_ying" or "lu_xun";

            for (int i = 0; i < view.Players.Count; i++)
            {
                var other = view.Players[i];
                if (!other.Alive || other.SeatIndex == mySeat) continue;

                switch (effectiveCardKey)
                {
                    case "sat":
                    case "pha_giap_tram":
                        if (!IsTargetImmuneToCard(other, effectiveCardKey) &&
                            IsInAttackRange(view, mySeat, other.SeatIndex))
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "thuan_thu_khien_duong":
                        if (!IsTargetImmuneToCard(other, effectiveCardKey) &&
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
                        if (!IsTargetImmuneToCard(other, effectiveCardKey))
                        {
                            targets.Add(other.SeatIndex);
                        }
                        break;

                    case "quyet_dau":
                    case "kinh_loi_chan":
                        if (!IsTargetImmuneToCard(other, effectiveCardKey))
                        {
                            targets.Add(other.SeatIndex);
                        }
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

        public static List<int> GetValidTargetSeats(PlayerViewStateDto view, CardInstanceDto card)
        {
            if (view == null || card == null) return new List<int>();
            string effectiveKey = ResolveEffectivePlayCardKey(view, card, null);
            return GetValidTargetSeatsForCardKey(view, effectiveKey);
        }

        public static bool TryGetPlayPhaseConversionKey(
            PlayerViewStateDto view,
            CardInstanceDto card,
            out string convertedCardKey)
        {
            convertedCardKey = null;
            if (view == null || card == null) return false;
            var me = view.MySeat;
            if (me == null || !me.Alive) return false;

            string myLegacyHero = NormalizeLegacyHeroId(me.HeroId);
            switch (myLegacyHero)
            {
                case "guan_yu":
                    if (IsRedSuit(card.Suit) &&
                        CanUseStrikeInPlayPhase(view, me) &&
                        GetValidTargetSeatsForCardKey(view, "sat").Count > 0)
                    {
                        convertedCardKey = "sat";
                        return true;
                    }
                    break;

                case "zhao_yun":
                    if (card.CardKey == "thiem" &&
                        CanUseStrikeInPlayPhase(view, me) &&
                        GetValidTargetSeatsForCardKey(view, "sat").Count > 0)
                    {
                        convertedCardKey = "sat";
                        return true;
                    }
                    break;

                case "gan_ning":
                    if (IsBlackSuit(card.Suit) &&
                        GetValidTargetSeatsForCardKey(view, "qua_ha_sai_cau").Count > 0)
                    {
                        convertedCardKey = "qua_ha_sai_cau";
                        return true;
                    }
                    break;

                case "da_qiao":
                    if (IsDiamondSuit(card.Suit) &&
                        GetValidTargetSeatsForCardKey(view, "lac_bat_tu_thuc").Count > 0)
                    {
                        convertedCardKey = "lac_bat_tu_thuc";
                        return true;
                    }
                    break;
            }

            return false;
        }

        public static bool IsCardNativelyLegalInPlayPhase(PlayerViewStateDto view, CardInstanceDto card)
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
                "sat" or "pha_giap_tram" =>
                    CanUseStrikeInPlayPhase(view, me) &&
                    GetValidTargetSeatsForCardKey(view, card.CardKey).Count > 0,
                "quyet_dau" or
                "qua_ha_sai_cau" or
                "thuan_thu_khien_duong" or
                "kinh_loi_chan" or
                "lac_bat_tu_thuc" or
                "ta_dao_sat_nhan" =>
                    GetValidTargetSeatsForCardKey(view, card.CardKey).Count > 0,
                _ => false,
            };
        }

        public static string ResolveEffectivePlayCardKey(
            PlayerViewStateDto view,
            CardInstanceDto card,
            string forcedConversionCardKey)
        {
            if (card == null) return string.Empty;
            if (!string.IsNullOrEmpty(forcedConversionCardKey))
            {
                return forcedConversionCardKey;
            }
            if (IsCardNativelyLegalInPlayPhase(view, card))
            {
                return card.CardKey;
            }
            if (TryGetPlayPhaseConversionKey(view, card, out string converted))
            {
                return converted;
            }
            return card.CardKey;
        }

        public static bool IsCardPlayableInPlayPhase(PlayerViewStateDto view, CardInstanceDto card)
        {
            if (view == null || card == null) return false;
            var me = view.MySeat;
            if (me == null || !me.Alive) return false;

            if (view.AvailableActions?.PlayableCardIds != null &&
                view.AvailableActions.PlayableCardIds.Contains(card.Id))
            {
                return true;
            }

            if (TryGetPlayPhaseConversionKey(view, card, out _))
            {
                return true;
            }

            if (view.AvailableActions?.PlayableCardIds != null)
            {
                return false;
            }

            return IsCardNativelyLegalInPlayPhase(view, card);
        }

        public static bool CanPlayCardInInterrupt(PlayerViewStateDto view, PublicInterruptViewDto intr, CardInstanceDto card)
        {
            return IsCardPlayableForInterrupt(view, intr, card);
        }

        public static bool IsCardPlayableForInterrupt(PlayerViewStateDto view, PublicInterruptViewDto intr, CardInstanceDto card)
        {
            if (view == null || intr == null || card == null) return false;
            var me = view.MySeat;
            string myHero = NormalizeLegacyHeroId(me?.HeroId);

            return intr.Kind switch
            {
                "WAIT_DODGE" or "WAIT_AOE_DODGE" or "WAIT_HU_JIA" =>
                    card.CardKey == "thiem"
                    || (myHero == "zhen_ji" && IsBlackSuit(card.Suit))
                    || (myHero == "zhao_yun" && card.CardKey == "sat"),

                "WAIT_AOE_SAT" or "WAIT_DUEL_SAT" or "WAIT_COLLATERAL_SAT" or "ASK_THANH_LONG" or "WAIT_JI_JIANG" =>
                    card.CardKey == "sat"
                    || card.CardKey == "pha_giap_tram"
                    || (myHero == "guan_yu" && IsRedSuit(card.Suit))
                    || (myHero == "zhao_yun" && card.CardKey == "thiem"),

                "WAIT_NULLIFICATION" =>
                    card.CardKey == "vo_giai_kha_kich",

                "WAIT_PEACH_RESCUE" =>
                    card.CardKey == "dao"
                    || (myHero == "hua_tuo" && view.CurrentTurnSeat != view.ViewerSeatIndex && IsRedSuit(card.Suit)),

                "WAIT_GUI_CAI" or "ASK_LIU_LI" or "ASK_QUAN_THACH_PHU" or "WAIT_GANG_LIE_CHOICE" or "ASK_TU_HUNG" =>
                    true,

                "WAIT_HARVEST_PICK" or "WAIT_GUAN_XING" or "WAIT_YI_JI" =>
                    true,

                _ => false,
            };
        }

        public static int GetInterruptActorSeat(PublicInterruptViewDto intr, int viewerSeatIndex)
        {
            if (intr == null) return -1;

            return intr.Kind switch
            {
                "WAIT_NULLIFICATION" =>
                    intr.CanRespondNullification == true ? viewerSeatIndex : -1,

                "WAIT_PEACH_RESCUE" or "WAIT_JI_JIANG" or "WAIT_HU_JIA" =>
                    intr.ResponderSeat ?? GetExtraInt(intr, "responderSeat") ?? intr.TargetSeat,

                "WAIT_COLLATERAL_SAT" =>
                    intr.AttackerSeat ?? GetExtraInt(intr, "attackerSeat") ?? intr.TargetSeat,

                "ASK_QUAN_THACH_PHU" or "ASK_THANH_LONG" or "ASK_HAN_BANG_KIEM" or "ASK_KY_LAN_CUNG" or "ASK_TIE_QI" =>
                    intr.SourceSeat ?? GetExtraInt(intr, "sourceSeat") ?? intr.TargetSeat,

                "PICK_TARGET_CARD" =>
                    (intr.HandPick ?? GetExtraString(intr, "handPick")) == "PREPARE"
                        ? intr.TargetSeat
                        : (intr.SourceSeat ?? GetExtraInt(intr, "sourceSeat") ?? intr.TargetSeat),

                _ => intr.TargetSeat,
            };
        }

        public static string ExplainWhyCardUnplayableVi(PlayerViewStateDto pv, CardInstanceDto card)
        {
            if (pv == null || card == null) return "Chưa thể sử dụng lá bài này.";

            if (pv.ActiveInterrupt != null)
            {
                int actorSeat = GetInterruptActorSeat(pv.ActiveInterrupt, pv.ViewerSeatIndex);
                if (actorSeat != pv.ViewerSeatIndex)
                {
                    return $"Đang chờ {ResolveSeatHeroName(pv, actorSeat)} phản ứng.";
                }

                return pv.ActiveInterrupt.Kind switch
                {
                    "WAIT_DODGE" or "WAIT_AOE_DODGE" or "WAIT_HU_JIA" =>
                        "Chỉ có thể xuất lá Thân Pháp (hoặc kỹ năng tương đương) để né đòn.",
                    "WAIT_AOE_SAT" or "WAIT_DUEL_SAT" or "WAIT_COLLATERAL_SAT" or "ASK_THANH_LONG" or "WAIT_JI_JIANG" =>
                        "Chỉ có thể xuất lá Kiếm Trảm để đáp trả lúc này.",
                    "WAIT_NULLIFICATION" =>
                        "Chỉ có thể xuất lá Hóa Giải Chân Khí lúc này.",
                    "WAIT_PEACH_RESCUE" =>
                        "Chỉ có thể dùng Hồi Xuân Đan để cứu người đang hấp hối.",
                    _ => "Lá bài này không dùng được cho phản ứng hiện tại.",
                };
            }

            if (pv.CurrentTurnSeat != pv.ViewerSeatIndex)
            {
                return $"Chưa tới lượt bạn (đang là lượt của {ResolveSeatHeroName(pv, pv.CurrentTurnSeat)}).";
            }

            if (pv.TurnPhase != "PLAY")
            {
                return $"Chỉ được đánh bài trong Pha Xuất Chiêu (hiện tại: {BuildPhaseBannerVi(pv)}).";
            }

            var me = pv.MySeat;
            if (me == null || !me.Alive) return "Hiệp khách của bạn đã ngã xuống.";

            if (card.CardKey == "thiem")
            {
                return "Thân Pháp chỉ dùng để phản ứng né đòn khi bị tấn công.";
            }
            if (card.CardKey == "vo_giai_kha_kich")
            {
                return "Hóa Giải Chân Khí chỉ dùng khi có bí kíp đang chờ hóa giải.";
            }
            if (card.CardKey == "dao" && me.Hp >= me.MaxHp)
            {
                return "Sinh Lực đang đầy, chưa cần dùng Hồi Xuân Đan.";
            }
            if (card.CardKey is "sat" or "pha_giap_tram")
            {
                if (pv.PeacefulFirstRound && pv.RoundNumber == 1)
                {
                    return "Vòng 1 Hòa Bình: Không được xuất Kiếm Trảm ở vòng đầu tiên.";
                }
                int satUsed = pv.TurnFlags?.SatUsedThisTurn ?? 0;
                int maxSat = GetMaxSatPerTurn(pv, me);
                if (satUsed >= maxSat)
                {
                    return $"Đã hết lượt xuất Kiếm Trảm ({satUsed}/{maxSat}) — cần Liên Hoàn Nỏ.";
                }
                return "Không có mục tiêu hợp lệ nào trong tầm đánh hiện tại.";
            }
            if (card.CardKey == "thuan_thu_khien_duong")
            {
                return "Không có đối thủ hợp lệ có bài ở khoảng cách 1 cho Thám Nang Thủ.";
            }
            if (card.CardKey == "qua_ha_sai_cau")
            {
                return "Không có đối thủ nào còn bài hoặc trang bị để dùng Phá Trận Chưởng.";
            }
            if (card.CardKey == "ta_dao_sat_nhan")
            {
                return "Không có đối thủ nào đang trang bị Vũ Khí có mục tiêu trong tầm đánh.";
            }
            if (card.CardKey == "lac_bat_tu_thuc")
            {
                return "Không có mục tiêu hợp lệ để đặt Điểm Huyệt Phong Mạch.";
            }
            if (card.CardKey is "quyet_dau" or "kinh_loi_chan")
            {
                return "Mục tiêu đang miễn nhiễm (Vô Ngã Cảnh) hoặc không hợp lệ.";
            }

            return "Lá bài này chưa đủ điều kiện xuất chiêu lúc này.";
        }

        public static bool GetTurnFlagBool(TurnFlagsDto flags, string fieldName, bool defaultValue = false)
        {
            if (flags?.ExtraFields == null) return defaultValue;
            if (!flags.ExtraFields.TryGetValue(fieldName, out JToken token) || token == null || token.Type == JTokenType.Null)
            {
                return defaultValue;
            }
            return token.Type == JTokenType.Boolean ? token.Value<bool>() : defaultValue;
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
                    "WAIT_DODGE" or "WAIT_AOE_DODGE" => $"Chờ Xuất Thân Pháp · {actorName}",
                    "WAIT_NULLIFICATION" => $"Chờ Hóa Giải Chân Khí · {pv.ActiveInterrupt.ScrollNameVi}",
                    "WAIT_PEACH_RESCUE" => $"Hấp Hối Cầu Hồi Xuân · {actorName}",
                    "WAIT_AOE_SAT" or "WAIT_DUEL_SAT" or "WAIT_COLLATERAL_SAT" => $"Chờ Xuất Kiếm Trảm · {actorName}",
                    "WAIT_HARVEST_PICK" => $"Thiên Bảo Xuất Thế · {actorName}",
                    "PICK_TARGET_CARD" => $"Đoạt / Phá Bài · {actorName}",
                    "WAIT_GUAN_XING" => $"Xếp Tinh Bàn · {actorName}",
                    "WAIT_YI_JI" => $"Di Sách Quyết · {actorName}",
                    "WAIT_FAN_JIAN_GUESS" => $"Ly Tâm Ấn · {actorName}",
                    "ASK_LIU_LI" => $"Chuyển Hoa Ảnh · {actorName}",
                    "WAIT_TU_XI" => $"Kỳ Tập Đạo · {actorName}",
                    "WAIT_GUI_CAI" => $"Nghịch Mệnh Phù · {actorName}",
                    "WAIT_JI_JIANG" => $"Hiệu Lệnh Kiếm Trảm · {actorName}",
                    "WAIT_HU_JIA" => $"Huyền Giáp Vệ · {actorName}",
                    _ => $"Phản Ứng Tuyệt Kỹ · {actorName}",
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
