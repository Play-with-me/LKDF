using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CuuChau.Arena
{
    /// <summary>
    /// Lưới 4 ô trang bị ngửa (Vũ Khí, Phòng Cụ, Ngựa +1, Ngựa -1) trên mỗi ghế đấu.
    /// Tuân thủ cỡ chữ >= 15f, hiển thị rõ tầm vũ khí ("Tầm: X") hoặc nhãn mờ "Trống",
    /// và hỗ trợ tooltip hook + callback hover.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class EquipmentSlotGrid : MonoBehaviour
    {
        public enum SlotKind
        {
            Weapon = 0,
            Armor = 1,
            PlusOneHorse = 2,
            MinusOneHorse = 3,
        }

        private sealed class SlotView
        {
            public SlotKind Kind;
            public RectTransform Root;
            public Image Background;
            public Image InnerFill;
            public Image Border;
            public Image SuitIcon;
            public TextMeshProUGUI Label;
            public CardInstanceDto BoundCard;
            public string TooltipSummary;
        }

        private static readonly Color EmptyBgColor = new(0.045f, 0.040f, 0.035f, 0.26f);
        private static readonly Color EmptyInnerColor = new(0.045f, 0.040f, 0.035f, 0.32f);
        private static readonly Color EmptyBorderColor = new(0.36f, 0.30f, 0.22f, 0.20f);
        private static readonly Color EmptyTextColor = new(0.68f, 0.63f, 0.54f, 0.42f);

        private static readonly Color EquippedBgColor = new(0.085f, 0.075f, 0.062f, 0.90f);
        private static readonly Color EquippedInnerColor = new(0.050f, 0.045f, 0.040f, 0.92f);
        private static readonly Color WeaponBorderColor = new(0.84f, 0.66f, 0.30f, 0.85f);
        private static readonly Color ArmorBorderColor = new(0.42f, 0.72f, 0.84f, 0.85f);
        private static readonly Color PlusHorseBorderColor = new(0.36f, 0.78f, 0.56f, 0.85f);
        private static readonly Color MinusHorseBorderColor = new(0.86f, 0.42f, 0.32f, 0.85f);

        private static readonly Color WeaponTextColor = new(0.97f, 0.90f, 0.72f, 1f);
        private static readonly Color ArmorTextColor = new(0.82f, 0.93f, 0.98f, 1f);
        private static readonly Color PlusHorseTextColor = new(0.76f, 0.95f, 0.83f, 1f);
        private static readonly Color MinusHorseTextColor = new(0.98f, 0.81f, 0.72f, 1f);

        private readonly SlotView[] _slots = new SlotView[4];
        private GridLayoutGroup _grid;
        private VisualCatalogSO _catalog;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _built;

        public Func<string, string> TooltipFormatter { get; set; }

        public event Action<CardInstanceDto, string, RectTransform> OnSlotHovered;
        public event Action OnSlotHoverExited;

        public void BuildHierarchyIfNeeded(VisualCatalogSO catalog, TMP_FontAsset sansFont, TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_built) return;

            var rect = transform as RectTransform;
            if (rect == null) rect = gameObject.AddComponent<RectTransform>();

            _grid = GetComponent<GridLayoutGroup>();
            if (_grid == null) _grid = gameObject.AddComponent<GridLayoutGroup>();
            _grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            _grid.constraintCount = 2;
            _grid.spacing = new Vector2(4f, 4f);
            _grid.childAlignment = TextAnchor.MiddleCenter;
            _grid.cellSize = new Vector2(180f, 24f);

            for (int i = 0; i < 4; i++)
            {
                SlotKind kind = (SlotKind)i;
                _slots[i] = CreateSlotCell(kind);
            }

            _built = true;
            BindEquipments(null, _catalog);
        }

        public void SetCellSize(Vector2 cellSize)
        {
            if (_grid != null)
            {
                _grid.cellSize = cellSize;
            }
        }

        public void BindEquipments(PlayerEquipmentsDto equipments, VisualCatalogSO catalog)
        {
            if (catalog != null) _catalog = catalog;
            if (!_built) BuildHierarchyIfNeeded(_catalog, _sansFont, _monoFont);

            BindSingleSlot(_slots[0], equipments != null ? equipments.Weapon : null);
            BindSingleSlot(_slots[1], equipments != null ? equipments.Armor : null);
            BindSingleSlot(_slots[2], equipments != null ? equipments.PlusOneHorse : null);
            BindSingleSlot(_slots[3], equipments != null ? equipments.MinusOneHorse : null);
        }

        private void BindSingleSlot(SlotView slot, CardInstanceDto card)
        {
            if (slot == null) return;
            slot.BoundCard = card;

            if (card == null || string.IsNullOrEmpty(card.CardKey))
            {
                slot.Background.color = EmptyBgColor;
                if (slot.InnerFill != null) slot.InnerFill.color = EmptyInnerColor;
                slot.Border.color = EmptyBorderColor;
                slot.SuitIcon.enabled = false;
                slot.Label.color = EmptyTextColor;
                slot.Label.rectTransform.offsetMin = new Vector2(8f, 0f);
                slot.Label.text = GetEmptyLabel(slot.Kind);
                slot.TooltipSummary = string.Empty;
                return;
            }

            string fullDisplayName = ResolveDisplayName(card.CardKey, card.NameVi);
            string compactName = ResolveCompactName(card.CardKey, card.NameVi);
            string formattedRank = FormatCardRank(card.Rank);
            string rankPrefix = string.IsNullOrEmpty(formattedRank) ? string.Empty : $"{formattedRank} ";

            slot.Background.color = EquippedBgColor;
            if (slot.InnerFill != null) slot.InnerFill.color = EquippedInnerColor;
            slot.Border.color = GetActiveBorderColor(slot.Kind);
            slot.Label.color = GetActiveTextColor(slot.Kind);

            Sprite suitSprite = _catalog != null ? _catalog.GetSuitSprite(card.Suit) : null;
            if (suitSprite != null)
            {
                slot.SuitIcon.sprite = suitSprite;
                slot.SuitIcon.color = GetSuitTint(card.Suit);
                slot.SuitIcon.enabled = true;
                slot.Label.rectTransform.offsetMin = new Vector2(21f, 0f);
            }
            else
            {
                slot.SuitIcon.enabled = false;
                slot.Label.rectTransform.offsetMin = new Vector2(8f, 0f);
            }

            if (slot.Kind == SlotKind.Weapon)
            {
                int range = GetWeaponRange(card.CardKey);
                slot.Label.text = $"{rankPrefix}T{range} · {compactName}";
                slot.TooltipSummary = BuildTooltipText(card, $"Vũ khí · Tầm đánh {range} · {rankPrefix}{fullDisplayName}");
            }
            else if (slot.Kind == SlotKind.Armor)
            {
                slot.Label.text = $"{rankPrefix}Giáp · {compactName}";
                slot.TooltipSummary = BuildTooltipText(card, $"Phòng cụ · {rankPrefix}{fullDisplayName}");
            }
            else if (slot.Kind == SlotKind.PlusOneHorse)
            {
                slot.Label.text = $"{rankPrefix}+1 · {compactName}";
                slot.TooltipSummary = BuildTooltipText(card, $"Khinh công +1 · {rankPrefix}{fullDisplayName}");
            }
            else
            {
                slot.Label.text = $"{rankPrefix}-1 · {compactName}";
                slot.TooltipSummary = BuildTooltipText(card, $"Thân pháp -1 · {rankPrefix}{fullDisplayName}");
            }
        }

        private string BuildTooltipText(CardInstanceDto card, string defaultSummary)
        {
            if (TooltipFormatter != null && card != null)
            {
                string custom = TooltipFormatter(card.CardKey);
                if (!string.IsNullOrEmpty(custom)) return custom;
            }
            return defaultSummary;
        }

        private SlotView CreateSlotCell(SlotKind kind)
        {
            var cellGo = new GameObject($"EquipSlot_{kind}", typeof(RectTransform), typeof(Image));
            cellGo.transform.SetParent(transform, false);
            var cellRt = cellGo.GetComponent<RectTransform>();
            var bg = cellGo.GetComponent<Image>();
            bg.color = EmptyBgColor;
            bg.raycastTarget = true;

            var borderGo = new GameObject("Border", typeof(RectTransform), typeof(Image));
            borderGo.transform.SetParent(cellRt, false);
            var borderRt = borderGo.GetComponent<RectTransform>();
            StretchFull(borderRt, 0f);
            var borderImg = borderGo.GetComponent<Image>();
            borderImg.color = EmptyBorderColor;
            borderImg.raycastTarget = false;

            var innerGo = new GameObject("InnerFill", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(cellRt, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            StretchFull(innerRt, 1f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = EmptyInnerColor;
            innerImg.raycastTarget = false;

            var suitGo = new GameObject("SuitIcon", typeof(RectTransform), typeof(Image));
            suitGo.transform.SetParent(cellRt, false);
            var suitRt = suitGo.GetComponent<RectTransform>();
            suitRt.anchorMin = new Vector2(0f, 0.5f);
            suitRt.anchorMax = new Vector2(0f, 0.5f);
            suitRt.pivot = new Vector2(0f, 0.5f);
            suitRt.anchoredPosition = new Vector2(5f, 0f);
            suitRt.sizeDelta = new Vector2(14f, 14f);
            var suitImg = suitGo.GetComponent<Image>();
            suitImg.preserveAspect = true;
            suitImg.raycastTarget = false;
            suitImg.enabled = false;

            var labelGo = new GameObject("SlotLabel", typeof(RectTransform), typeof(TextMeshProUGUI));
            labelGo.transform.SetParent(cellRt, false);
            var labelRt = labelGo.GetComponent<RectTransform>();
            labelRt.anchorMin = Vector2.zero;
            labelRt.anchorMax = Vector2.one;
            labelRt.offsetMin = new Vector2(8f, 0f);
            labelRt.offsetMax = new Vector2(-4f, 0f);

            var labelTmp = labelGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) labelTmp.font = _sansFont;
            labelTmp.fontSize = 15f;
            labelTmp.enableAutoSizing = true;
            labelTmp.fontSizeMin = 12.5f;
            labelTmp.fontSizeMax = 15f;
            labelTmp.fontStyle = FontStyles.Bold;
            labelTmp.color = EmptyTextColor;
            labelTmp.alignment = TextAlignmentOptions.MidlineLeft;
            labelTmp.textWrappingMode = TextWrappingModes.NoWrap;
            labelTmp.overflowMode = TextOverflowModes.Truncate;
            labelTmp.raycastTarget = false;

            var slotView = new SlotView
            {
                Kind = kind,
                Root = cellRt,
                Background = bg,
                InnerFill = innerImg,
                Border = borderImg,
                SuitIcon = suitImg,
                Label = labelTmp,
            };

            AttachHoverTrigger(cellGo, slotView);
            return slotView;
        }

        private void AttachHoverTrigger(GameObject target, SlotView slot)
        {
            var trigger = target.AddComponent<EventTrigger>();
            var enterEntry = new EventTrigger.Entry { eventID = EventTriggerType.PointerEnter };
            enterEntry.callback.AddListener(_ =>
            {
                if (slot.BoundCard == null || string.IsNullOrEmpty(slot.BoundCard.CardKey)) return;
                OnSlotHovered?.Invoke(slot.BoundCard, slot.TooltipSummary, slot.Root);
            });
            trigger.triggers.Add(enterEntry);

            var exitEntry = new EventTrigger.Entry { eventID = EventTriggerType.PointerExit };
            exitEntry.callback.AddListener(_ => OnSlotHoverExited?.Invoke());
            trigger.triggers.Add(exitEntry);
        }

        private static string GetEmptyLabel(SlotKind kind)
        {
            return kind switch
            {
                SlotKind.Weapon => "VK",
                SlotKind.Armor => "Giáp",
                SlotKind.PlusOneHorse => "+1",
                SlotKind.MinusOneHorse => "-1",
                _ => "—",
            };
        }

        public static string FormatCardRank(string rank)
        {
            if (string.IsNullOrWhiteSpace(rank)) return string.Empty;
            return rank.Trim().ToUpperInvariant() switch
            {
                "1" => "A",
                "11" => "J",
                "12" => "Q",
                "13" => "K",
                var r => r,
            };
        }

        public static string ResolveCompactName(string cardKey, string fallbackNameVi)
        {
            return cardKey switch
            {
                "gia_cat_lien_no" => "Liên Nỏ",
                "tu_hung_song_co_kiem" => "Song Kiếm",
                "thanh_cong_kiem" => "Thanh Phong",
                "han_bang_kiem" => "Băng Phách",
                "tu_khi_hoan" => "Tụ Khí",
                "thanh_long_yen_nguyet_dao" => "Huyền Long",
                "truong_bat_xa_mau" => "Xà Mâu",
                "quan_thach_phu" => "Phá Sơn",
                "phuong_thien_hoa_kich" => "Họa Kích",
                "ky_lan_cung" => "Linh Cung",
                "bat_quai_tran" => "Bát Quái",
                "nhan_vuong_thuan" => "Thiết Thuẫn",
                "hoan_anh_giap" => "Huyễn Ảnh",
                "tuyet_anh" => "Đạp Tuyết",
                "dich_lo" => "Lăng Ba",
                "trao_hoang_phi_dien" => "Ngự Phong",
                "xich_tho" => "Truy Ảnh",
                "dai_uyen" => "Xích Diễm",
                "tu_tinh" => "Huyền Lôi",
                _ => !string.IsNullOrWhiteSpace(fallbackNameVi) ? fallbackNameVi : (cardKey ?? "Trang bị"),
            };
        }

        private static Color GetActiveBorderColor(SlotKind kind)
        {
            return kind switch
            {
                SlotKind.Weapon => WeaponBorderColor,
                SlotKind.Armor => ArmorBorderColor,
                SlotKind.PlusOneHorse => PlusHorseBorderColor,
                SlotKind.MinusOneHorse => MinusHorseBorderColor,
                _ => EmptyBorderColor,
            };
        }

        private static Color GetActiveTextColor(SlotKind kind)
        {
            return kind switch
            {
                SlotKind.Weapon => WeaponTextColor,
                SlotKind.Armor => ArmorTextColor,
                SlotKind.PlusOneHorse => PlusHorseTextColor,
                SlotKind.MinusOneHorse => MinusHorseTextColor,
                _ => EmptyTextColor,
            };
        }

        private static Color GetSuitTint(string suit)
        {
            return suit == "HEART" || suit == "DIAMOND"
                ? new Color(0.92f, 0.34f, 0.28f, 1f)
                : new Color(0.92f, 0.88f, 0.78f, 1f);
        }

        public static int GetWeaponRange(string cardKey)
        {
            return cardKey switch
            {
                "gia_cat_lien_no" => 1,
                "tu_hung_song_co_kiem" => 2,
                "thanh_cong_kiem" => 2,
                "han_bang_kiem" => 2,
                "tu_khi_hoan" => 2,
                "thanh_long_yen_nguyet_dao" => 3,
                "truong_bat_xa_mau" => 3,
                "quan_thach_phu" => 3,
                "phuong_thien_hoa_kich" => 4,
                "ky_lan_cung" => 5,
                _ => 1,
            };
        }

        public static string ResolveDisplayName(string cardKey, string fallbackNameVi)
        {
            if (!string.IsNullOrWhiteSpace(fallbackNameVi)) return fallbackNameVi;
            return cardKey switch
            {
                "gia_cat_lien_no" => "Liên Hoàn Nỏ",
                "tu_hung_song_co_kiem" => "Hàn Tâm Song Kiếm",
                "thanh_cong_kiem" => "Thanh Phong Kiếm",
                "han_bang_kiem" => "Băng Phách Kiếm",
                "tu_khi_hoan" => "Tụ Khí Hoàn",
                "thanh_long_yen_nguyet_dao" => "Huyền Long Đao",
                "truong_bat_xa_mau" => "Xà Ảnh Mâu",
                "quan_thach_phu" => "Phá Sơn Phủ",
                "phuong_thien_hoa_kich" => "Cửu Thiên Họa Kích",
                "ky_lan_cung" => "Linh Điểu Cung",
                "bat_quai_tran" => "Bát Quái Y",
                "nhan_vuong_thuan" => "Huyền Thiết Thuẫn",
                "hoan_anh_giap" => "Huyễn Ảnh Giáp",
                "tuyet_anh" => "Đạp Tuyết Vô Ngân",
                "dich_lo" => "Lăng Ba Vi Bộ",
                "trao_hoang_phi_dien" => "Ngự Phong Hài",
                "xich_tho" => "Truy Ảnh Hài",
                "dai_uyen" => "Xích Diễm Câu",
                "tu_tinh" => "Huyền Lôi Tuấn",
                _ => cardKey ?? "Trang bị",
            };
        }

        private static void StretchFull(RectTransform rt, float inset)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
        }
    }
}
