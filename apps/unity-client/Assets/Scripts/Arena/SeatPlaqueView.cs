using System;
using System.Collections.Generic;
using CuuChau.Cards;
using CuuChau.Data;
using CuuChau.Modals;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CuuChau.Arena
{
    /// <summary>
    /// Thẻ chỗ ngồi 2.5D cho mỗi hiệp khách trên bàn đấu Cửu Châu Ẩn Kiếm.
    /// Gồm: Khung 9-slice, vùng cắt chân dung 2 lớp parallax (BG + FG), bảng tên obsidian mờ
    /// đảm bảo tương phản chữ, huy hiệu Thế lực & Thân phận, số lá, thanh Ngọc Sinh Lực + số HP,
    /// huy hiệu Khoảng cách, ghi chú nghi vấn chuột phải, lưới 4 ô trang bị ngửa, khay ấn chú trì hoãn và vòng ngắm mục tiêu.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class SeatPlaqueView : MonoBehaviour,
        IPointerClickHandler,
        IPointerEnterHandler,
        IPointerExitHandler
    {
        private static readonly Color ObsidianNameplateColor = new(0.05f, 0.04f, 0.035f, 0.86f);
        private static readonly Color ObsidianSubBadgeColor = new(0.07f, 0.06f, 0.05f, 0.88f);
        private static readonly Color PortraitBackdropColor = new(0.11f, 0.085f, 0.065f, 0.94f);
        private static readonly Color IvoryTextColor = new(0.96f, 0.92f, 0.84f, 1f);
        private static readonly Color MutedGoldColor = new(0.86f, 0.77f, 0.56f, 1f);
        private static readonly Color DistanceGoldColor = new(0.96f, 0.89f, 0.67f, 1f);
        private static readonly Color SuspectTagTextColor = new(0.96f, 0.82f, 0.46f, 1f);
        private static readonly Color SuspectTagBgColor = new(0.16f, 0.11f, 0.06f, 0.92f);
        private static readonly Color TurnActiveBorderColor = new(0.95f, 0.78f, 0.34f, 0.92f);
        private static readonly Color ValidTargetBorderColor = new(0.88f, 0.34f, 0.24f, 0.92f);

        private static readonly string[] SuspectCycleLabels =
        {
            "Ẩn",
            "? Hộ Pháp",
            "? Nghĩa Quân",
            "? Ám Ảnh",
        };

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _built;

        private RectTransform _rootRect;
        private CanvasGroup _rootCanvasGroup;
        private Image _frameImage;
        private Image _turnActiveBorder;
        private Image _validTargetBorder;

        private RectTransform _portraitWindowRect;
        private Image _portraitBackdrop;
        private RectTransform _heroBgRect;
        private Image _heroBgImage;
        private RectTransform _heroFgRect;
        private Image _heroFgImage;
        private TextMeshProUGUI _portraitMonogram;

        private Image _factionSealImage;
        private TextMeshProUGUI _heroNameText;
        private TextMeshProUGUI _identityBadgeText;
        private Image _identityBadgeBg;
        private TextMeshProUGUI _handCountText;
        private GameObject _distanceBadgeObj;
        private TextMeshProUGUI _distanceBadgeText;
        private TextMeshProUGUI _statusOverlayText;
        private GameObject _statusOverlayObj;

        private RectTransform _hpRowRect;
        private readonly List<Image> _hpBeads = new();
        private RectTransform _hpNumericBadgeRect;
        private TextMeshProUGUI _hpNumericText;

        private EquipmentSlotGrid _equipmentGrid;
        private SpecialCardTrayView _specialTray;
        private RectTransform _reticleRect;
        private Image _reticleImage;

        private Vector2 _heroBgBasePos;
        private Vector2 _heroFgBasePos;
        private Vector2 _targetParallax;
        private Vector2 _currentParallax;

        private bool _isViewerSeat;
        private bool _isTargeted;
        private bool _isTurnActive;
        private bool _isValidTarget;
        private bool _isAlive = true;
        private bool _reducedMotion;
        private float _animClock;

        private string _boundUserId = string.Empty;
        private string _boundHeroId = string.Empty;
        private int _boundSeatTrack = -1;
        private string _rawIdentityLabel = "Ẩn";
        private int _suspectNoteIndex;

        private SilkScrollTooltipView _cachedTooltip;
        private bool _showingFallbackTooltip;
        private bool _isEquipmentSlotHovered;

        public int SeatIndex { get; private set; }
        public EquipmentSlotGrid EquipmentGrid => _equipmentGrid;
        public SpecialCardTrayView SpecialTray => _specialTray;
        public string CurrentSuspectNote => SuspectCycleLabels[Mathf.Clamp(_suspectNoteIndex, 0, SuspectCycleLabels.Length - 1)];

        public event Action<int> OnSeatClicked;
        public event Action<string, string> OnHeroInspectHovered;
        public event Action OnHeroInspectHoverExited;

        public void BuildHierarchyIfNeeded(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_built) return;

            _rootRect = transform as RectTransform;
            if (_rootRect == null) _rootRect = gameObject.AddComponent<RectTransform>();
            if (_rootRect.sizeDelta == Vector2.zero)
            {
                _rootRect.sizeDelta = new Vector2(356f, 194f);
            }

            _rootCanvasGroup = GetComponent<CanvasGroup>();
            if (_rootCanvasGroup == null) _rootCanvasGroup = gameObject.AddComponent<CanvasGroup>();

            // 1. Portrait Viewport (right side, masked for 2.5D parallax)
            var portraitGo = new GameObject("PortraitViewport", typeof(RectTransform), typeof(Image), typeof(RectMask2D));
            portraitGo.transform.SetParent(_rootRect, false);
            _portraitWindowRect = portraitGo.GetComponent<RectTransform>();
            _portraitWindowRect.anchorMin = new Vector2(0.62f, 0.305f);
            _portraitWindowRect.anchorMax = new Vector2(0.97f, 0.94f);
            _portraitWindowRect.offsetMin = Vector2.zero;
            _portraitWindowRect.offsetMax = Vector2.zero;
            _portraitBackdrop = portraitGo.GetComponent<Image>();
            _portraitBackdrop.color = PortraitBackdropColor;
            _portraitBackdrop.raycastTarget = false;

            var monogramGo = new GameObject("PortraitMonogram", typeof(RectTransform), typeof(TextMeshProUGUI));
            monogramGo.transform.SetParent(_portraitWindowRect, false);
            var monogramRt = monogramGo.GetComponent<RectTransform>();
            StretchFull(monogramRt, 0f);
            _portraitMonogram = monogramGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) _portraitMonogram.font = _serifFont;
            _portraitMonogram.fontSize = 36f;
            _portraitMonogram.fontStyle = FontStyles.Bold;
            _portraitMonogram.color = new Color(0.76f, 0.64f, 0.40f, 0.30f);
            _portraitMonogram.alignment = TextAlignmentOptions.Center;
            _portraitMonogram.raycastTarget = false;

            var bgLayerGo = new GameObject("Hero_BG_Layer", typeof(RectTransform), typeof(Image));
            bgLayerGo.transform.SetParent(_portraitWindowRect, false);
            _heroBgRect = bgLayerGo.GetComponent<RectTransform>();
            _heroBgRect.anchorMin = new Vector2(0.5f, 0.5f);
            _heroBgRect.anchorMax = new Vector2(0.5f, 0.5f);
            _heroBgRect.sizeDelta = new Vector2(210f, 150f);
            _heroBgBasePos = Vector2.zero;
            _heroBgImage = bgLayerGo.GetComponent<Image>();
            _heroBgImage.preserveAspect = true;
            _heroBgImage.raycastTarget = false;
            _heroBgImage.enabled = false;

            var fgLayerGo = new GameObject("Hero_FG_Layer", typeof(RectTransform), typeof(Image));
            fgLayerGo.transform.SetParent(_portraitWindowRect, false);
            _heroFgRect = fgLayerGo.GetComponent<RectTransform>();
            _heroFgRect.anchorMin = new Vector2(0.5f, 0.5f);
            _heroFgRect.anchorMax = new Vector2(0.5f, 0.5f);
            _heroFgRect.anchoredPosition = new Vector2(4f, -4f);
            _heroFgRect.sizeDelta = new Vector2(180f, 146f);
            _heroFgBasePos = _heroFgRect.anchoredPosition;
            _heroFgImage = fgLayerGo.GetComponent<Image>();
            _heroFgImage.preserveAspect = true;
            _heroFgImage.raycastTarget = false;
            _heroFgImage.enabled = false;

            // 2. 9-Slice Plaque Frame (drawn around/over base)
            _frameImage = GetComponent<Image>();
            if (_frameImage == null) _frameImage = gameObject.AddComponent<Image>();
            _frameImage.sprite = _catalog != null ? _catalog.seatFrame9Slice : null;
            _frameImage.type = _frameImage.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            _frameImage.color = _frameImage.sprite != null ? Color.white : new Color(0.11f, 0.10f, 0.09f, 0.94f);
            _frameImage.raycastTarget = true;

            // 3. Turn Active & Valid Target Highlight Borders
            _turnActiveBorder = CreateBorderOverlay("TurnActiveBorder", TurnActiveBorderColor, -3f);
            _turnActiveBorder.enabled = false;

            _validTargetBorder = CreateBorderOverlay("ValidTargetBorder", ValidTargetBorderColor, -2f);
            _validTargetBorder.enabled = false;

            // 4. Obsidian Nameplate (Left/Top so text never bleeds into portrait hair/shoulders)
            var nameplateGo = new GameObject("ObsidianNameplate", typeof(RectTransform), typeof(Image));
            nameplateGo.transform.SetParent(_rootRect, false);
            var nameplateRt = nameplateGo.GetComponent<RectTransform>();
            nameplateRt.anchorMin = new Vector2(0.025f, 0.62f);
            nameplateRt.anchorMax = new Vector2(0.67f, 0.94f);
            nameplateRt.offsetMin = Vector2.zero;
            nameplateRt.offsetMax = Vector2.zero;
            var nameplateImg = nameplateGo.GetComponent<Image>();
            nameplateImg.color = ObsidianNameplateColor;
            nameplateImg.raycastTarget = false;

            // Faction Seal
            var sealGo = new GameObject("FactionSeal", typeof(RectTransform), typeof(Image));
            sealGo.transform.SetParent(nameplateRt, false);
            var sealRt = sealGo.GetComponent<RectTransform>();
            sealRt.anchorMin = new Vector2(0f, 0.5f);
            sealRt.anchorMax = new Vector2(0f, 0.5f);
            sealRt.pivot = new Vector2(0f, 0.5f);
            sealRt.anchoredPosition = new Vector2(6f, 0f);
            sealRt.sizeDelta = new Vector2(34f, 34f);
            _factionSealImage = sealGo.GetComponent<Image>();
            _factionSealImage.preserveAspect = true;
            _factionSealImage.raycastTarget = false;

            // Hero Name (>= 15f..17f)
            var heroNameGo = new GameObject("HeroName", typeof(RectTransform), typeof(TextMeshProUGUI));
            heroNameGo.transform.SetParent(nameplateRt, false);
            var heroNameRt = heroNameGo.GetComponent<RectTransform>();
            heroNameRt.anchorMin = new Vector2(0f, 0.44f);
            heroNameRt.anchorMax = new Vector2(1f, 0.98f);
            heroNameRt.offsetMin = new Vector2(44f, 0f);
            heroNameRt.offsetMax = new Vector2(-4f, -2f);
            _heroNameText = heroNameGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) _heroNameText.font = _serifFont;
            _heroNameText.fontSize = 17f;
            _heroNameText.enableAutoSizing = true;
            _heroNameText.fontSizeMin = 15f;
            _heroNameText.fontSizeMax = 17f;
            _heroNameText.fontStyle = FontStyles.Bold;
            _heroNameText.color = IvoryTextColor;
            _heroNameText.alignment = TextAlignmentOptions.MidlineLeft;
            _heroNameText.textWrappingMode = TextWrappingModes.NoWrap;
            _heroNameText.overflowMode = TextOverflowModes.Truncate;
            _heroNameText.raycastTarget = false;

            // Identity Badge ("Chủ Công" / "Minh Chủ" / "Ẩn")
            var idBgGo = new GameObject("IdentityBadge", typeof(RectTransform), typeof(Image));
            idBgGo.transform.SetParent(nameplateRt, false);
            var idBgRt = idBgGo.GetComponent<RectTransform>();
            idBgRt.anchorMin = new Vector2(0f, 0.04f);
            idBgRt.anchorMax = new Vector2(0.61f, 0.44f);
            idBgRt.offsetMin = new Vector2(42f, 2f);
            idBgRt.offsetMax = new Vector2(-2f, -1f);
            _identityBadgeBg = idBgGo.GetComponent<Image>();
            _identityBadgeBg.color = ObsidianSubBadgeColor;
            _identityBadgeBg.raycastTarget = false;

            var idTextGo = new GameObject("IdentityText", typeof(RectTransform), typeof(TextMeshProUGUI));
            idTextGo.transform.SetParent(idBgRt, false);
            StretchFull(idTextGo.GetComponent<RectTransform>(), 2f);
            _identityBadgeText = idTextGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) _identityBadgeText.font = _sansFont;
            _identityBadgeText.fontSize = 15f;
            _identityBadgeText.enableAutoSizing = true;
            _identityBadgeText.fontSizeMin = 12f;
            _identityBadgeText.fontSizeMax = 15f;
            _identityBadgeText.fontStyle = FontStyles.Bold;
            _identityBadgeText.color = MutedGoldColor;
            _identityBadgeText.alignment = TextAlignmentOptions.Center;
            _identityBadgeText.textWrappingMode = TextWrappingModes.NoWrap;
            _identityBadgeText.overflowMode = TextOverflowModes.Truncate;
            _identityBadgeText.raycastTarget = false;

            // Hand Count Badge ("Bài: X")
            var handBgGo = new GameObject("HandCountBadge", typeof(RectTransform), typeof(Image));
            handBgGo.transform.SetParent(nameplateRt, false);
            var handBgRt = handBgGo.GetComponent<RectTransform>();
            handBgRt.anchorMin = new Vector2(0.615f, 0.04f);
            handBgRt.anchorMax = new Vector2(0.99f, 0.44f);
            handBgRt.offsetMin = new Vector2(2f, 2f);
            handBgRt.offsetMax = new Vector2(-4f, -1f);
            var handBgImg = handBgGo.GetComponent<Image>();
            handBgImg.color = ObsidianSubBadgeColor;
            handBgImg.raycastTarget = false;

            var handTextGo = new GameObject("HandCountText", typeof(RectTransform), typeof(TextMeshProUGUI));
            handTextGo.transform.SetParent(handBgRt, false);
            StretchFull(handTextGo.GetComponent<RectTransform>(), 2f);
            _handCountText = handTextGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _handCountText.font = _monoFont;
            else if (_sansFont != null) _handCountText.font = _sansFont;
            _handCountText.fontSize = 15f;
            _handCountText.fontStyle = FontStyles.Bold;
            _handCountText.color = IvoryTextColor;
            _handCountText.alignment = TextAlignmentOptions.Center;
            _handCountText.textWrappingMode = TextWrappingModes.NoWrap;
            _handCountText.raycastTarget = false;

            // 5. HP Jade Beads Row + Numeric HP Pill (WCAG 1.4.1 colorblind-safe)
            var hpRowGo = new GameObject("HpJadeBar", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            hpRowGo.transform.SetParent(_rootRect, false);
            _hpRowRect = hpRowGo.GetComponent<RectTransform>();
            _hpRowRect.anchorMin = new Vector2(0.035f, 0.44f);
            _hpRowRect.anchorMax = new Vector2(0.605f, 0.60f);
            _hpRowRect.offsetMin = Vector2.zero;
            _hpRowRect.offsetMax = Vector2.zero;
            var hpLayout = hpRowGo.GetComponent<HorizontalLayoutGroup>();
            hpLayout.spacing = 3.5f;
            hpLayout.childAlignment = TextAnchor.MiddleLeft;
            hpLayout.childControlWidth = false;
            hpLayout.childControlHeight = false;
            hpLayout.childForceExpandWidth = false;
            hpLayout.childForceExpandHeight = false;

            var hpNumBadgeGo = new GameObject("HpNumericBadge", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            hpNumBadgeGo.transform.SetParent(_hpRowRect, false);
            _hpNumericBadgeRect = hpNumBadgeGo.GetComponent<RectTransform>();
            _hpNumericBadgeRect.sizeDelta = new Vector2(48f, 22f);
            var hpNumLe = hpNumBadgeGo.GetComponent<LayoutElement>();
            hpNumLe.preferredWidth = 48f;
            hpNumLe.preferredHeight = 22f;
            var hpNumBg = hpNumBadgeGo.GetComponent<Image>();
            hpNumBg.color = ObsidianSubBadgeColor;
            hpNumBg.raycastTarget = false;

            var hpNumTextGo = new GameObject("HpNumericText", typeof(RectTransform), typeof(TextMeshProUGUI));
            hpNumTextGo.transform.SetParent(_hpNumericBadgeRect, false);
            StretchFull(hpNumTextGo.GetComponent<RectTransform>(), 2f);
            _hpNumericText = hpNumTextGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _hpNumericText.font = _monoFont;
            else if (_sansFont != null) _hpNumericText.font = _sansFont;
            _hpNumericText.fontSize = 15f;
            _hpNumericText.enableAutoSizing = true;
            _hpNumericText.fontSizeMin = 12f;
            _hpNumericText.fontSizeMax = 15f;
            _hpNumericText.fontStyle = FontStyles.Bold;
            _hpNumericText.color = IvoryTextColor;
            _hpNumericText.alignment = TextAlignmentOptions.Center;
            _hpNumericText.textWrappingMode = TextWrappingModes.NoWrap;
            _hpNumericText.raycastTarget = false;

            // 6. Special Card Tray (Delayed Judgment Scrolls)
            var trayGo = new GameObject("SpecialCardTray", typeof(RectTransform), typeof(SpecialCardTrayView));
            trayGo.transform.SetParent(_rootRect, false);
            var trayRt = trayGo.GetComponent<RectTransform>();
            trayRt.anchorMin = new Vector2(0.035f, 0.30f);
            trayRt.anchorMax = new Vector2(0.605f, 0.43f);
            trayRt.offsetMin = Vector2.zero;
            trayRt.offsetMax = Vector2.zero;
            _specialTray = trayGo.GetComponent<SpecialCardTrayView>();
            _specialTray.BuildHierarchyIfNeeded(_catalog, _sansFont, _monoFont);

            // 7. Equipment Slot Grid (4 face-up slots docked cleanly at bottom of plaque)
            var equipGo = new GameObject("EquipmentSlotGrid", typeof(RectTransform), typeof(EquipmentSlotGrid));
            equipGo.transform.SetParent(_rootRect, false);
            var equipRt = equipGo.GetComponent<RectTransform>();
            equipRt.anchorMin = new Vector2(0.025f, 0.03f);
            equipRt.anchorMax = new Vector2(0.975f, 0.295f);
            equipRt.offsetMin = Vector2.zero;
            equipRt.offsetMax = Vector2.zero;
            _equipmentGrid = equipGo.GetComponent<EquipmentSlotGrid>();
            _equipmentGrid.BuildHierarchyIfNeeded(_catalog, _sansFont, _monoFont);
            _equipmentGrid.OnSlotHovered += (_, _, _) =>
            {
                _isEquipmentSlotHovered = true;
                HideFallbackTooltipIfShown();
            };
            _equipmentGrid.OnSlotHoverExited += () =>
            {
                _isEquipmentSlotHovered = false;
            };

            // 7b. Distance Badge ("Kc: X" in top-right corner)
            _distanceBadgeObj = new GameObject("DistanceBadge", typeof(RectTransform), typeof(Image));
            _distanceBadgeObj.transform.SetParent(_rootRect, false);
            var distRt = _distanceBadgeObj.GetComponent<RectTransform>();
            distRt.anchorMin = new Vector2(1f, 1f);
            distRt.anchorMax = new Vector2(1f, 1f);
            distRt.pivot = new Vector2(1f, 1f);
            distRt.anchoredPosition = new Vector2(-12f, -12f);
            distRt.sizeDelta = new Vector2(68f, 25f);
            var distBorder = _distanceBadgeObj.GetComponent<Image>();
            distBorder.color = new Color(0.76f, 0.60f, 0.30f, 0.85f);
            distBorder.raycastTarget = false;

            var distInnerGo = new GameObject("DistanceInner", typeof(RectTransform), typeof(Image));
            distInnerGo.transform.SetParent(distRt, false);
            var distInnerRt = distInnerGo.GetComponent<RectTransform>();
            StretchFull(distInnerRt, 1f);
            var distInnerImg = distInnerGo.GetComponent<Image>();
            distInnerImg.color = new Color(0.05f, 0.04f, 0.035f, 0.92f);
            distInnerImg.raycastTarget = false;

            var distTextGo = new GameObject("DistanceText", typeof(RectTransform), typeof(TextMeshProUGUI));
            distTextGo.transform.SetParent(distInnerRt, false);
            StretchFull(distTextGo.GetComponent<RectTransform>(), 3f);
            _distanceBadgeText = distTextGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _distanceBadgeText.font = _monoFont;
            else if (_sansFont != null) _distanceBadgeText.font = _sansFont;
            _distanceBadgeText.fontSize = 15f;
            _distanceBadgeText.enableAutoSizing = true;
            _distanceBadgeText.fontSizeMin = 12f;
            _distanceBadgeText.fontSizeMax = 15f;
            _distanceBadgeText.fontStyle = FontStyles.Bold;
            _distanceBadgeText.color = DistanceGoldColor;
            _distanceBadgeText.alignment = TextAlignmentOptions.Center;
            _distanceBadgeText.textWrappingMode = TextWrappingModes.NoWrap;
            _distanceBadgeText.raycastTarget = false;
            _distanceBadgeObj.SetActive(false);

            // 8. Target Reticle Ring (over portrait center)
            var reticleGo = new GameObject("TargetReticleRing", typeof(RectTransform), typeof(Image));
            reticleGo.transform.SetParent(_rootRect, false);
            _reticleRect = reticleGo.GetComponent<RectTransform>();
            _reticleRect.anchorMin = new Vector2(0.795f, 0.62f);
            _reticleRect.anchorMax = new Vector2(0.795f, 0.62f);
            _reticleRect.pivot = new Vector2(0.5f, 0.5f);
            _reticleRect.anchoredPosition = Vector2.zero;
            _reticleRect.sizeDelta = new Vector2(114f, 114f);
            _reticleImage = reticleGo.GetComponent<Image>();
            _reticleImage.sprite = _catalog != null ? _catalog.targetReticleRing : null;
            _reticleImage.preserveAspect = true;
            _reticleImage.raycastTarget = false;
            _reticleImage.enabled = false;

            // 9. Eliminated / Bot status ribbon
            _statusOverlayObj = new GameObject("StatusRibbon", typeof(RectTransform), typeof(Image));
            _statusOverlayObj.transform.SetParent(_rootRect, false);
            var statusRt = _statusOverlayObj.GetComponent<RectTransform>();
            statusRt.anchorMin = new Vector2(0.50f, 0.42f);
            statusRt.anchorMax = new Vector2(0.96f, 0.60f);
            statusRt.offsetMin = Vector2.zero;
            statusRt.offsetMax = Vector2.zero;
            var statusBg = _statusOverlayObj.GetComponent<Image>();
            statusBg.color = new Color(0.08f, 0.03f, 0.03f, 0.90f);
            statusBg.raycastTarget = false;

            var statusTextGo = new GameObject("StatusText", typeof(RectTransform), typeof(TextMeshProUGUI));
            statusTextGo.transform.SetParent(statusRt, false);
            StretchFull(statusTextGo.GetComponent<RectTransform>(), 4f);
            _statusOverlayText = statusTextGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) _statusOverlayText.font = _sansFont;
            _statusOverlayText.fontSize = 15f;
            _statusOverlayText.fontStyle = FontStyles.Bold;
            _statusOverlayText.color = new Color(0.98f, 0.72f, 0.58f, 1f);
            _statusOverlayText.alignment = TextAlignmentOptions.Center;
            _statusOverlayText.raycastTarget = false;
            _statusOverlayObj.SetActive(false);

            _built = true;
        }

        public void SetViewerLayoutScale(bool isViewerSeat)
        {
            _isViewerSeat = isViewerSeat;
            if (!_built) return;
            if (_equipmentGrid != null)
            {
                _equipmentGrid.SetCellSize(isViewerSeat ? new Vector2(182f, 25f) : new Vector2(166f, 23f));
            }
        }

        public void ClearSuspectNote()
        {
            _suspectNoteIndex = 0;
            RefreshIdentityBadgeVisual();
        }

        public void BindPlayer(PublicPlayerViewDto player, VisualCatalogSO catalog, bool isCurrentTurn, bool isTargeted)
        {
            if (catalog != null) _catalog = catalog;
            if (!_built) BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);
            if (player == null) return;

            string heroId = string.IsNullOrEmpty(player.HeroId) ? "unknown" : player.HeroId;
            string incomingUserId = player.UserId ?? string.Empty;
            bool seatOrOwnerChanged = _boundSeatTrack != player.SeatIndex ||
                (!string.IsNullOrEmpty(incomingUserId) && !string.Equals(_boundUserId, incomingUserId, StringComparison.Ordinal)) ||
                (!string.IsNullOrEmpty(_boundHeroId) && _boundHeroId != "unknown" && heroId != "unknown" &&
                 !string.Equals(_boundHeroId, heroId, StringComparison.OrdinalIgnoreCase));

            if (seatOrOwnerChanged)
            {
                _suspectNoteIndex = 0;
            }

            SeatIndex = player.SeatIndex;
            _boundSeatTrack = player.SeatIndex;
            _boundUserId = incomingUserId;
            _boundHeroId = heroId;
            _isAlive = player.Alive;

            bool isSelf = player.HandCards != null ||
                          _isViewerSeat ||
                          (player.DistanceFromViewer.HasValue && player.DistanceFromViewer.Value == 0);

            string heroNameVi = ResolveHeroDisplayName(heroId, player.DisplayName);
            if (isSelf && !string.IsNullOrEmpty(heroNameVi) && !heroNameVi.EndsWith(" (Bạn)", StringComparison.Ordinal))
            {
                heroNameVi = $"{heroNameVi} (Bạn)";
            }

            string faction = ResolveHeroFaction(heroId);
            string identityLabel = ResolveIdentityLabel(player.Identity, player.IsIdentityRevealed);
            if (identityLabel != "Ẩn")
            {
                _suspectNoteIndex = 0;
            }

            bool showDistance = player.Alive && player.DistanceFromViewer.HasValue && player.DistanceFromViewer.Value > 0;
            if (_distanceBadgeObj != null)
            {
                _distanceBadgeObj.SetActive(showDistance);
                if (showDistance && _distanceBadgeText != null)
                {
                    _distanceBadgeText.text = $"Kc: {player.DistanceFromViewer.Value}";
                }
            }

            ApplyCommonData(
                heroId,
                heroNameVi,
                faction,
                identityLabel,
                player.Hp,
                player.MaxHp,
                player.HandCount,
                player.Equipments,
                player.DelayedScrolls,
                isCurrentTurn,
                isTargeted,
                player.Alive,
                player.IsBotTakeover);
        }

        public void PopulateSample(
            int seatIndex,
            string heroId,
            string heroNameVi,
            string faction,
            string identityLabel,
            int hp,
            int maxHp,
            int handCount,
            VisualCatalogSO catalog,
            bool isCurrentTurn,
            bool isTargeted,
            PlayerEquipmentsDto equipments = null,
            List<CardInstanceDto> delayedScrolls = null)
        {
            if (catalog != null) _catalog = catalog;
            if (!_built) BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);

            SeatIndex = seatIndex;
            _boundSeatTrack = seatIndex;
            _boundUserId = string.Empty;
            _boundHeroId = string.IsNullOrEmpty(heroId) ? "unknown" : heroId;
            _suspectNoteIndex = 0;
            _isAlive = hp > 0;

            if (_distanceBadgeObj != null)
            {
                if ( _isAlive && !_isViewerSeat && seatIndex > 0)
                {
                    _distanceBadgeObj.SetActive(true);
                    if (_distanceBadgeText != null) _distanceBadgeText.text = $"Kc: {Mathf.Max(1, Mathf.Min(seatIndex, 4))}";
                }
                else
                {
                    _distanceBadgeObj.SetActive(false);
                }
            }

            string displayHeader = (_isViewerSeat && !string.IsNullOrEmpty(heroNameVi) && !heroNameVi.EndsWith(" (Bạn)", StringComparison.Ordinal))
                ? $"{heroNameVi} (Bạn)"
                : heroNameVi;

            ApplyCommonData(
                heroId,
                displayHeader,
                faction,
                identityLabel,
                hp,
                maxHp,
                handCount,
                equipments,
                delayedScrolls,
                isCurrentTurn,
                isTargeted,
                _isAlive,
                isBotTakeover: false);
        }

        public void SetTargeted(bool targeted)
        {
            _isTargeted = targeted;
            if (_reticleImage != null)
            {
                _reticleImage.enabled = targeted && _reticleImage.sprite != null;
            }
            if (!targeted && _reticleRect != null)
            {
                _reticleRect.localRotation = Quaternion.identity;
            }
        }

        public void SetTurnActive(bool active)
        {
            _isTurnActive = active;
            if (_turnActiveBorder != null)
            {
                _turnActiveBorder.enabled = active;
            }
        }

        public void SetValidTargetHighlight(bool highlighted)
        {
            _isValidTarget = highlighted;
            if (_validTargetBorder != null)
            {
                _validTargetBorder.enabled = highlighted;
            }
        }

        public void SetReducedMotion(bool reducedMotion)
        {
            _reducedMotion = reducedMotion;
            if (_reducedMotion)
            {
                _targetParallax = Vector2.zero;
                _currentParallax = Vector2.zero;
                ApplyParallaxPositions(Vector2.zero);
                if (_reticleRect != null) _reticleRect.localRotation = Quaternion.identity;
            }
        }

        public void UpdateParallax(Vector2 pointerOffset)
        {
            if (_reducedMotion)
            {
                _targetParallax = Vector2.zero;
                return;
            }
            _targetParallax = Vector2.ClampMagnitude(pointerOffset, 1f);
        }

        public Vector3 GetTargetAnchorWorldPos()
        {
            if (_reticleRect != null) return _reticleRect.position;
            if (_portraitWindowRect != null) return _portraitWindowRect.position;
            return transform.position;
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (eventData != null && eventData.button == PointerEventData.InputButton.Right)
            {
                if (_rawIdentityLabel == "Ẩn")
                {
                    _suspectNoteIndex = (_suspectNoteIndex + 1) % SuspectCycleLabels.Length;
                    RefreshIdentityBadgeVisual();
                }
                return;
            }

            if (eventData == null || eventData.button == PointerEventData.InputButton.Left)
            {
                OnSeatClicked?.Invoke(SeatIndex);
            }
        }

        public void OnPointerEnter(PointerEventData eventData)
        {
            if (string.IsNullOrEmpty(_boundHeroId) || _boundHeroId == "unknown") return;

            HeroLoreInfo lore = CuuChauLoreLookup.GetHeroInfo(_boundHeroId);
            if (lore.SkillNameVi == "Chưa rõ") return;

            string summary = $"{lore.NameVi} · {lore.SkillNameVi}\n{lore.SkillDescVi}";
            if (OnHeroInspectHovered != null)
            {
                OnHeroInspectHovered.Invoke(_boundHeroId, summary);
                return;
            }

            if (_isEquipmentSlotHovered) return;
            ShowFallbackHeroTooltip(lore);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            OnHeroInspectHoverExited?.Invoke();
            HideFallbackTooltipIfShown();
        }

        private void OnDisable()
        {
            _isEquipmentSlotHovered = false;
            HideFallbackTooltipIfShown();
        }

        private void ShowFallbackHeroTooltip(HeroLoreInfo lore)
        {
            if (_cachedTooltip == null)
            {
                _cachedTooltip = FindAnyObjectByType<SilkScrollTooltipView>(FindObjectsInactive.Include);
            }
            if (_cachedTooltip == null) return;

            RectTransform clampContainer = _cachedTooltip.transform.parent as RectTransform;
            if (clampContainer == null) return;

            string title = $"{lore.NameVi} · {lore.TitleVi}";
            string subtitle = $"{lore.FactionVi} · {lore.SkillNameVi} · {lore.MaxHp} Máu";
            string body = _rawIdentityLabel == "Ẩn"
                ? $"{lore.SkillDescVi}\n• Ghi chú: Bấm chuột phải vào ghế để đánh dấu nghi vấn thân phận."
                : lore.SkillDescVi;

            Vector3 worldAnchor = _rootRect != null ? _rootRect.position : transform.position;
            Vector3 local3 = clampContainer.InverseTransformPoint(worldAnchor);
            float offsetX = local3.x >= 0f ? -360f : 360f;
            float offsetY = local3.y > 180f ? -110f : 110f;

            _cachedTooltip.ShowTooltip(title, subtitle, body, new Vector2(local3.x + offsetX, local3.y + offsetY), clampContainer);
            _showingFallbackTooltip = true;
        }

        private void HideFallbackTooltipIfShown()
        {
            if (!_showingFallbackTooltip) return;
            _showingFallbackTooltip = false;
            if (_cachedTooltip != null)
            {
                _cachedTooltip.Hide();
            }
        }

        private void Update()
        {
            if (!_built) return;
            float dt = Time.unscaledDeltaTime;
            _animClock += dt;

            if (!_reducedMotion)
            {
                _currentParallax = Vector2.Lerp(_currentParallax, _targetParallax, 1f - Mathf.Exp(-10f * dt));
                ApplyParallaxPositions(_currentParallax);

                if (_isTargeted && _reticleRect != null && _reticleImage != null && _reticleImage.enabled)
                {
                    _reticleRect.Rotate(0f, 0f, -22f * dt);
                }

                if (_isTurnActive && _turnActiveBorder != null && _turnActiveBorder.enabled)
                {
                    Color c = TurnActiveBorderColor;
                    c.a = Mathf.Lerp(0.62f, 0.96f, 0.5f + 0.5f * Mathf.Sin(_animClock * 3.2f));
                    _turnActiveBorder.color = c;
                }
            }
        }

        private void ApplyParallaxPositions(Vector2 offset)
        {
            if (_heroBgRect != null)
            {
                _heroBgRect.anchoredPosition = _heroBgBasePos + offset * new Vector2(4f, 3f);
            }
            if (_heroFgRect != null)
            {
                _heroFgRect.anchoredPosition = _heroFgBasePos + offset * new Vector2(10f, 6f);
            }
        }

        private void ApplyCommonData(
            string heroId,
            string heroNameVi,
            string faction,
            string identityLabel,
            int hp,
            int maxHp,
            int handCount,
            PlayerEquipmentsDto equipments,
            List<CardInstanceDto> delayedScrolls,
            bool isCurrentTurn,
            bool isTargeted,
            bool alive,
            bool isBotTakeover)
        {
            _rawIdentityLabel = string.IsNullOrEmpty(identityLabel) ? "Ẩn" : identityLabel;
            if (_heroNameText != null) _heroNameText.text = string.IsNullOrEmpty(heroNameVi) ? "Hiệp Khách" : heroNameVi;
            if (_handCountText != null) _handCountText.text = $"Bài: {Mathf.Max(0, handCount)}";
            RefreshIdentityBadgeVisual();

            if (_factionSealImage != null && _catalog != null)
            {
                Sprite seal = _catalog.GetFactionSprite(faction);
                _factionSealImage.sprite = seal;
                _factionSealImage.enabled = seal != null;
            }

            BindHeroPortrait(heroId, heroNameVi, faction);
            BindHpBeads(hp, maxHp);

            if (_equipmentGrid != null) _equipmentGrid.BindEquipments(equipments, _catalog);
            if (_specialTray != null) _specialTray.BindDelayedScrolls(delayedScrolls, _catalog);

            SetTurnActive(isCurrentTurn);
            SetTargeted(isTargeted);

            if (_rootCanvasGroup != null)
            {
                _rootCanvasGroup.alpha = alive ? 1f : 0.56f;
            }

            if (_statusOverlayObj != null && _statusOverlayText != null)
            {
                if (!alive)
                {
                    _statusOverlayObj.SetActive(true);
                    _statusOverlayText.text = "Đã Trọng Thương";
                }
                else if (isBotTakeover)
                {
                    _statusOverlayObj.SetActive(true);
                    _statusOverlayText.text = "Máy Đánh Hộ";
                }
                else
                {
                    _statusOverlayObj.SetActive(false);
                }
            }
        }

        private void BindHeroPortrait(string heroId, string heroNameVi, string faction)
        {
            HeroPortraitEntry? entry = _catalog != null ? _catalog.FindHero(heroId) : null;

            if (_portraitBackdrop != null)
            {
                _portraitBackdrop.color = GetFactionBackdropTint(faction);
            }

            if (entry.HasValue)
            {
                Sprite bg = entry.Value.backgroundLayer != null ? entry.Value.backgroundLayer : entry.Value.fullComposite;
                Sprite fg = entry.Value.foregroundLayer;

                _heroBgImage.sprite = bg;
                _heroBgImage.enabled = bg != null;
                _heroFgImage.sprite = fg;
                _heroFgImage.enabled = fg != null;
                _portraitMonogram.enabled = (bg == null && fg == null);
            }
            else
            {
                _heroBgImage.sprite = null;
                _heroBgImage.enabled = false;
                _heroFgImage.sprite = null;
                _heroFgImage.enabled = false;
                _portraitMonogram.enabled = true;
                _portraitMonogram.text = BuildMonogram(heroNameVi);
            }
        }

        private void RefreshIdentityBadgeVisual()
        {
            bool isHiddenWithSuspect = _rawIdentityLabel == "Ẩn" && _suspectNoteIndex > 0 && _suspectNoteIndex < SuspectCycleLabels.Length;
            string effectiveText = isHiddenWithSuspect
                ? SuspectCycleLabels[_suspectNoteIndex]
                : _rawIdentityLabel;

            if (_identityBadgeText != null)
            {
                _identityBadgeText.text = effectiveText;
            }

            bool isLord = _rawIdentityLabel == "Minh Chủ" || _rawIdentityLabel == "Chủ Công";
            if (_identityBadgeBg != null)
            {
                _identityBadgeBg.color = isLord
                    ? new Color(0.45f, 0.14f, 0.12f, 0.92f)
                    : (isHiddenWithSuspect ? SuspectTagBgColor : ObsidianSubBadgeColor);
            }
            if (_identityBadgeText != null)
            {
                _identityBadgeText.color = isLord
                    ? IvoryTextColor
                    : (isHiddenWithSuspect ? SuspectTagTextColor : MutedGoldColor);
            }
        }

        private void BindHpBeads(int hp, int maxHp)
        {
            int safeMax = Mathf.Max(1, maxHp);
            int safeHp = Mathf.Max(0, hp);
            int clampedMax = Mathf.Clamp(safeMax, 1, 8);
            int clampedHp = Mathf.Clamp(safeHp, 0, clampedMax);
            float beadDim = clampedMax >= 5 ? 19f : 21f;

            while (_hpBeads.Count < clampedMax)
            {
                var beadGo = new GameObject($"HpBead_{_hpBeads.Count}", typeof(RectTransform), typeof(Image));
                beadGo.transform.SetParent(_hpRowRect, false);
                var rt = beadGo.GetComponent<RectTransform>();
                rt.sizeDelta = new Vector2(beadDim, beadDim);
                var img = beadGo.GetComponent<Image>();
                img.preserveAspect = true;
                img.raycastTarget = false;
                _hpBeads.Add(img);
            }

            float ratio = clampedMax > 0 ? (float)clampedHp / clampedMax : 0f;
            Sprite filledSprite = null;
            if (_catalog != null)
            {
                if (clampedHp <= 1 || ratio <= 0.28f) filledSprite = _catalog.hpCrimsonLow;
                else if (ratio <= 0.60f) filledSprite = _catalog.hpAmberMid;
                else filledSprite = _catalog.hpJadeFull;
            }

            for (int i = 0; i < _hpBeads.Count; i++)
            {
                Image bead = _hpBeads[i];
                if (i >= clampedMax)
                {
                    bead.gameObject.SetActive(false);
                    continue;
                }

                bead.rectTransform.sizeDelta = new Vector2(beadDim, beadDim);
                bead.gameObject.SetActive(true);
                bool isFull = i < clampedHp;
                Sprite targetSprite = isFull ? filledSprite : (_catalog != null ? _catalog.hpSocketEmpty : null);
                bead.sprite = targetSprite;
                if (targetSprite != null)
                {
                    bead.color = Color.white;
                }
                else
                {
                    bead.color = isFull
                        ? (clampedHp <= 1 ? new Color(0.84f, 0.22f, 0.20f, 1f) : new Color(0.24f, 0.78f, 0.54f, 1f))
                        : new Color(0.20f, 0.18f, 0.16f, 0.85f);
                }
            }

            if (_hpNumericBadgeRect != null)
            {
                _hpNumericBadgeRect.SetAsLastSibling();
            }
            if (_hpNumericText != null)
            {
                _hpNumericText.text = $"{safeHp}/{safeMax}";
                _hpNumericText.color = safeHp <= 1
                    ? new Color(1.00f, 0.64f, 0.58f, 1f)
                    : IvoryTextColor;
            }
        }

        private Image CreateBorderOverlay(string name, Color color, float outset)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(_rootRect, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(outset, outset);
            rt.offsetMax = new Vector2(-outset, -outset);

            var img = go.GetComponent<Image>();
            img.sprite = _catalog != null ? _catalog.seatFrame9Slice : null;
            img.type = img.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            img.color = color;
            img.raycastTarget = false;
            return img;
        }

        private static string ResolveIdentityLabel(string identity, bool isRevealed)
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

        private static string ResolveHeroDisplayName(string heroId, string fallbackDisplayName)
        {
            CuuChau.Modals.HeroLoreInfo lore = CuuChau.Modals.CuuChauLoreLookup.GetHeroInfo(heroId);
            if (!string.IsNullOrEmpty(lore.NameVi) && lore.SkillNameVi != "Chưa rõ")
            {
                return lore.NameVi;
            }
            return string.IsNullOrEmpty(fallbackDisplayName) ? heroId : fallbackDisplayName;
        }

        private static string ResolveHeroFaction(string heroId)
        {
            CuuChau.Modals.HeroLoreInfo lore = CuuChau.Modals.CuuChauLoreLookup.GetHeroInfo(heroId);
            return string.IsNullOrEmpty(lore.FactionCode) ? "QUN" : lore.FactionCode;
        }

        private static Color GetFactionBackdropTint(string faction)
        {
            return faction switch
            {
                "WEI" or "THIEN_KIEM" => new Color(0.08f, 0.13f, 0.16f, 0.94f),
                "SHU" or "HUYEN_THIET" => new Color(0.10f, 0.12f, 0.18f, 0.94f),
                "WU" or "GIANG_NAM" => new Color(0.16f, 0.08f, 0.08f, 0.94f),
                _ => PortraitBackdropColor,
            };
        }

        private static string BuildMonogram(string heroNameVi)
        {
            if (string.IsNullOrWhiteSpace(heroNameVi)) return "CC";
            string[] parts = heroNameVi.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[parts.Length - 1][0])}";
            }
            return heroNameVi.Substring(0, Mathf.Min(2, heroNameVi.Length)).ToUpperInvariant();
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
