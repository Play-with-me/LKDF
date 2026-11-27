using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Modals
{
    /// <summary>
    /// Nguyên thủy uGUI + TMPro dùng chung nội bộ cho 4 hộp thoại Modal (phong cách Cổ Thư & Gỗ Mun).
    /// Bảo đảm: 100% uGUI, cỡ chữ >= 15f, chỉ dùng Truncate, 0 ký tự mũi tên.
    /// </summary>
    internal static class ModalUiKit
    {
        public static readonly Color BackdropDimColor = new(0.020f, 0.016f, 0.014f, 0.80f);
        public static readonly Color ObsidianPanelColor = new(0.055f, 0.045f, 0.038f, 0.96f);
        public static readonly Color ObsidianSubCardColor = new(0.088f, 0.072f, 0.058f, 0.96f);
        public static readonly Color ObsidianInsetColor = new(0.038f, 0.032f, 0.028f, 0.94f);
        public static readonly Color BronzeBorderColor = new(0.72f, 0.56f, 0.28f, 0.88f);
        public static readonly Color BronzeMutedColor = new(0.45f, 0.36f, 0.21f, 0.72f);
        public static readonly Color GoldIvoryColor = new(0.96f, 0.89f, 0.67f, 1f);
        public static readonly Color BodyIvoryColor = new(0.93f, 0.89f, 0.81f, 1f);
        public static readonly Color MutedSandColor = new(0.76f, 0.69f, 0.56f, 1f);
        public static readonly Color CinnabarFillColor = new(0.62f, 0.17f, 0.14f, 0.96f);
        public static readonly Color CinnabarTextColor = new(1.00f, 0.96f, 0.87f, 1f);
        public static readonly Color SecondaryBtnColor = new(0.18f, 0.14f, 0.10f, 0.96f);
        public static readonly Color DangerBtnColor = new(0.46f, 0.11f, 0.10f, 0.96f);
        public static readonly Color EmeraldAccentColor = new(0.24f, 0.78f, 0.54f, 1f);
        public static readonly Color AmberAccentColor = new(0.92f, 0.66f, 0.22f, 1f);
        public static readonly Color CrimsonAccentColor = new(0.90f, 0.32f, 0.26f, 1f);

        public static RectTransform EnsureRootStretch(GameObject go)
        {
            var rt = go.transform as RectTransform;
            if (rt == null) rt = go.AddComponent<RectTransform>();
            StretchFull(rt, 0f, 0f);
            return rt;
        }

        public static void StretchFull(RectTransform rt, float insetX, float insetY)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = new Vector2(insetX, insetY);
            rt.offsetMax = new Vector2(-insetX, -insetY);
        }

        public static RectTransform CreateModalShell(
            RectTransform root,
            string panelName,
            Vector2 panelSize,
            VisualCatalogSO catalog,
            out RectTransform innerBody)
        {
            var backdropImg = root.GetComponent<Image>();
            if (backdropImg == null) backdropImg = root.gameObject.AddComponent<Image>();
            backdropImg.color = BackdropDimColor;
            backdropImg.raycastTarget = true;

            var panelGo = new GameObject(panelName, typeof(RectTransform), typeof(Image));
            panelGo.transform.SetParent(root, false);
            var panelRt = panelGo.GetComponent<RectTransform>();
            panelRt.anchorMin = new Vector2(0.5f, 0.5f);
            panelRt.anchorMax = new Vector2(0.5f, 0.5f);
            panelRt.pivot = new Vector2(0.5f, 0.5f);
            panelRt.anchoredPosition = Vector2.zero;
            panelRt.sizeDelta = panelSize;

            var borderImg = panelGo.GetComponent<Image>();
            Sprite frameSprite = catalog != null ? catalog.seatFrame9Slice : null;
            if (frameSprite != null)
            {
                borderImg.sprite = frameSprite;
                borderImg.type = Image.Type.Sliced;
                borderImg.color = Color.white;
            }
            else
            {
                borderImg.color = BronzeBorderColor;
            }
            borderImg.raycastTarget = true;

            var innerGo = new GameObject("ObsidianInner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(panelRt, false);
            innerBody = innerGo.GetComponent<RectTransform>();
            StretchFull(innerBody, 6f, 6f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = ObsidianPanelColor;
            innerImg.raycastTarget = false;

            return panelRt;
        }

        public static TextMeshProUGUI CreateTmp(
            string name,
            Transform parent,
            TMP_FontAsset font,
            float fontSize,
            Color color,
            FontStyles style = FontStyles.Normal,
            TextAlignmentOptions alignment = TextAlignmentOptions.MidlineLeft,
            bool wrap = false)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            var tmp = go.GetComponent<TextMeshProUGUI>();
            if (font != null) tmp.font = font;
            tmp.fontSize = Mathf.Max(15f, fontSize);
            tmp.color = color;
            tmp.fontStyle = style;
            tmp.alignment = alignment;
            tmp.textWrappingMode = wrap ? TextWrappingModes.Normal : TextWrappingModes.NoWrap;
            tmp.overflowMode = TextOverflowModes.Truncate;
            tmp.raycastTarget = false;
            return tmp;
        }

        public static Button CreatePrimaryButton(
            string name,
            Transform parent,
            VisualCatalogSO catalog,
            TMP_FontAsset font,
            string label,
            float fontSize,
            Action onClick,
            out TextMeshProUGUI labelTmp)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);

            var img = go.GetComponent<Image>();
            Sprite btnSprite = catalog != null ? catalog.actionButtonPrimary9Slice : null;
            if (btnSprite != null)
            {
                img.sprite = btnSprite;
                img.type = Image.Type.Sliced;
                img.color = Color.white;
            }
            else
            {
                img.color = CinnabarFillColor;
            }

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(() => onClick?.Invoke());

            labelTmp = CreateTmp(
                "Label",
                go.transform,
                font,
                Mathf.Max(16f, fontSize),
                CinnabarTextColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center,
                wrap: false);
            StretchFull(labelTmp.rectTransform, 16f, 4f);
            labelTmp.text = label;
            return btn;
        }

        public static Button CreateSecondaryButton(
            string name,
            Transform parent,
            TMP_FontAsset font,
            string label,
            float fontSize,
            Color bgColor,
            Action onClick,
            out Image bgImg,
            out TextMeshProUGUI labelTmp)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);

            var borderImg = go.GetComponent<Image>();
            borderImg.color = BronzeMutedColor;

            var innerGo = new GameObject("Inner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(go.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), 2f, 2f);
            bgImg = innerGo.GetComponent<Image>();
            bgImg.color = bgColor;
            bgImg.raycastTarget = false;

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = borderImg;
            btn.onClick.AddListener(() => onClick?.Invoke());

            labelTmp = CreateTmp(
                "Label",
                go.transform,
                font,
                Mathf.Max(15f, fontSize),
                GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center,
                wrap: false);
            StretchFull(labelTmp.rectTransform, 12f, 4f);
            labelTmp.text = label;
            return btn;
        }

        public static ScrollRect CreateVerticalScrollArea(
            string name,
            Transform parent,
            float spacing,
            RectOffset padding,
            out RectTransform contentRect)
        {
            var scrollGo = new GameObject(
                name,
                typeof(RectTransform),
                typeof(Image),
                typeof(RectMask2D),
                typeof(ScrollRect));
            scrollGo.transform.SetParent(parent, false);

            var scrollRt = scrollGo.GetComponent<RectTransform>();
            scrollGo.GetComponent<Image>().color = ObsidianInsetColor;

            var contentGo = new GameObject(
                "Content",
                typeof(RectTransform),
                typeof(VerticalLayoutGroup),
                typeof(ContentSizeFitter));
            contentGo.transform.SetParent(scrollRt, false);

            contentRect = contentGo.GetComponent<RectTransform>();
            contentRect.anchorMin = new Vector2(0f, 1f);
            contentRect.anchorMax = new Vector2(1f, 1f);
            contentRect.pivot = new Vector2(0.5f, 1f);
            contentRect.anchoredPosition = Vector2.zero;
            contentRect.sizeDelta = Vector2.zero;

            var layout = contentGo.GetComponent<VerticalLayoutGroup>();
            layout.padding = padding;
            layout.spacing = spacing;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;

            var fitter = contentGo.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            var scroll = scrollGo.GetComponent<ScrollRect>();
            scroll.viewport = scrollRt;
            scroll.content = contentRect;
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.scrollSensitivity = 32f;
            scroll.movementType = ScrollRect.MovementType.Clamped;

            return scroll;
        }

        public static Sprite ResolveHeroSprite(VisualCatalogSO catalog, HeroLoreInfo info)
        {
            if (catalog == null) return null;

            HeroPortraitEntry? entry = catalog.FindHero(info.HeroId);
            if (!entry.HasValue && !string.IsNullOrEmpty(info.LegacyId))
            {
                entry = catalog.FindHero(info.LegacyId);
            }
            if (!entry.HasValue && info.HeroId == "trieu_thien_hanh")
            {
                entry = catalog.FindHero("zhao_yun");
            }
            if (!entry.HasValue) return null;

            return entry.Value.fullComposite != null
                ? entry.Value.fullComposite
                : (entry.Value.foregroundLayer != null ? entry.Value.foregroundLayer : entry.Value.backgroundLayer);
        }

        public static Color GetFactionAccentColor(string factionCode)
        {
            return factionCode switch
            {
                "SHU" => new Color(0.20f, 0.74f, 0.52f, 1f),
                "WEI" => new Color(0.26f, 0.62f, 0.94f, 1f),
                "WU" => new Color(0.86f, 0.28f, 0.24f, 1f),
                _ => new Color(0.66f, 0.44f, 0.88f, 1f),
            };
        }

        public static string BuildMonogram(string nameVi)
        {
            if (string.IsNullOrWhiteSpace(nameVi)) return "CC";
            string[] parts = nameVi.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[parts.Length - 1][0])}";
            }
            return nameVi.Substring(0, Mathf.Min(2, nameVi.Length)).ToUpperInvariant();
        }
    }

    /// <summary>
    /// Màn lật thẻ Chọn Hiệp Khách 2.5D (3 thẻ thường hoặc 5 thẻ cho Chủ Công):
    /// - Banner Thân Phận + mục tiêu chiến thắng rõ ràng.
    /// - Bộ đếm giây sống động + tiến độ Sẵn sàng: X/Y ghế.
    /// - Hiệu ứng lật Y 2.5D từ mặt lưng `cardBackCuuChau` sang mặt tướng (tôn trọng `SetReducedMotion`).
    /// - Khung soi chi tiết kỹ năng & nút Chu Sa xác nhận ghi rõ tên `Chọn Hiệp Khách · <Tên>`.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class HeroDraftModalView : MonoBehaviour
    {
        private const float FlipDurationSec = 0.42f;
        private const float FlipStaggerSec = 0.08f;

        private sealed class DraftCardSlot
        {
            public string HeroId;
            public HeroLoreInfo Lore;
            public RectTransform Root;
            public RectTransform FlipBody;
            public GameObject BackFace;
            public GameObject FrontFace;
            public Image FrameImage;
            public Image SelectionBorder;
            public Image PortraitImage;
            public TextMeshProUGUI MonogramText;
            public Image FactionSealImage;
            public TextMeshProUGUI NameText;
            public TextMeshProUGUI MetaText;
            public Button Button;
            public float FlipDelay;
            public float FlipElapsed;
            public bool FlipFinished;
        }

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _initialized;
        private bool _reducedMotion;

        private RectTransform _rootRect;
        private TextMeshProUGUI _identityBannerText;
        private TextMeshProUGUI _timerProgressText;
        private TextMeshProUGUI _waitingHintText;
        private RectTransform _cardsRowRect;
        private TextMeshProUGUI _detailTitleText;
        private TextMeshProUGUI _detailDescText;
        private Button _confirmButton;
        private CanvasGroup _confirmButtonGroup;
        private TextMeshProUGUI _confirmButtonLabel;

        private readonly List<DraftCardSlot> _slots = new();
        private string _focusedHeroId;
        private string _confirmedHeroId;
        private float _remainingSeconds;
        private int _readyCount;
        private int _totalSeatCount;
        private bool _countdownActive;

        public event Action<string> OnHeroSelected;

        public void InitializeView(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_initialized) return;

            BuildHierarchy();
            _initialized = true;
            SetVisible(false);
        }

        public void SetVisible(bool visible)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            gameObject.SetActive(visible);
            if (visible)
            {
                transform.SetAsLastSibling();
            }
        }

        public void SetReducedMotion(bool enabled)
        {
            _reducedMotion = enabled;
            if (_reducedMotion)
            {
                SnapAllCardsFaceUp();
            }
        }

        public void BindDraft(HeroDraftViewDto draft, PublicPlayerViewDto mySeat, float remainingSeconds)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            _remainingSeconds = Mathf.Max(0f, remainingSeconds);
            _countdownActive = draft != null && draft.Stage != "COMPLETED";

            string identity = mySeat != null ? mySeat.Identity : "UNKNOWN";
            string idName = CuuChauLoreLookup.GetIdentityNameVi(identity);
            string idGoal = CuuChauLoreLookup.GetIdentityGoalVi(identity);
            if (_identityBannerText != null)
            {
                _identityBannerText.text = string.IsNullOrEmpty(idGoal)
                    ? idName
                    : $"{idName} · {idGoal}";
            }

            _readyCount = draft != null && draft.ReadySeats != null ? draft.ReadySeats.Count : 0;
            // Tổng số ghế tối thiểu lấy từ LordSeatIndex / ReadySeats nếu caller chưa truyền đủ ngữ cảnh
            _totalSeatCount = Mathf.Max(_readyCount, 4);
            if (draft != null && draft.Stage == "LORD_SELECTING")
            {
                _totalSeatCount = Mathf.Max(_totalSeatCount, draft.LordSeatIndex + 1);
            }
            UpdateTimerAndProgressText();

            _confirmedHeroId = draft != null ? draft.MySelectedHero : null;
            List<string> candidates = draft != null && draft.MyCandidates != null
                ? draft.MyCandidates
                : new List<string>();

            RebuildCandidateCards(candidates, draft != null ? draft.Stage : string.Empty);
        }

        public void PopulateDemoPreview()
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            var demoDraft = new HeroDraftViewDto
            {
                Stage = "LORD_SELECTING",
                LordSeatIndex = 0,
                MyCandidates = new List<string>
                {
                    "lam_thanh_vu",
                    "han_thiet_phong",
                    "viem_liet_vuong",
                    "trieu_thien_hanh",
                    "tham_tinh_ha",
                },
                MySelectedHero = null,
                ReadySeats = new List<int> { 1, 2 },
            };

            var demoSeat = new PublicPlayerViewDto
            {
                SeatIndex = 0,
                DisplayName = "Minh Chủ",
                Identity = "LORD",
                IsIdentityRevealed = true,
            };

            BindDraft(demoDraft, demoSeat, 26f);
            _totalSeatCount = 6;
            UpdateTimerAndProgressText();
            FocusHero("trieu_thien_hanh");
        }

        private void Update()
        {
            if (!_initialized || !gameObject.activeInHierarchy) return;

            float dt = Time.unscaledDeltaTime;

            if (_countdownActive && _remainingSeconds > 0f)
            {
                int prevSec = Mathf.CeilToInt(_remainingSeconds);
                _remainingSeconds = Mathf.Max(0f, _remainingSeconds - dt);
                int nextSec = Mathf.CeilToInt(_remainingSeconds);
                if (nextSec != prevSec)
                {
                    UpdateTimerAndProgressText();
                }
            }

            if (!_reducedMotion)
            {
                for (int i = 0; i < _slots.Count; i++)
                {
                    TickCardFlip(_slots[i], dt);
                }
            }
        }

        private void BuildHierarchy()
        {
            _rootRect = ModalUiKit.EnsureRootStretch(gameObject);
            ModalUiKit.CreateModalShell(
                _rootRect,
                "HeroDraftPanel",
                new Vector2(1240f, 690f),
                _catalog,
                out RectTransform inner);

            // 1. Header Banner: Title + Identity Goal + Countdown
            var headerGo = new GameObject("DraftHeader", typeof(RectTransform), typeof(Image));
            headerGo.transform.SetParent(inner, false);
            var headerRt = headerGo.GetComponent<RectTransform>();
            headerRt.anchorMin = new Vector2(0f, 1f);
            headerRt.anchorMax = new Vector2(1f, 1f);
            headerRt.pivot = new Vector2(0.5f, 1f);
            headerRt.anchoredPosition = new Vector2(0f, -14f);
            headerRt.sizeDelta = new Vector2(-32f, 76f);
            headerGo.GetComponent<Image>().color = ModalUiKit.ObsidianInsetColor;

            var titleTmp = ModalUiKit.CreateTmp(
                "DraftTitle",
                headerRt,
                _serifFont != null ? _serifFont : _sansFont,
                24f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.TopLeft);
            titleTmp.rectTransform.anchorMin = new Vector2(0f, 0.50f);
            titleTmp.rectTransform.anchorMax = new Vector2(0.68f, 1f);
            titleTmp.rectTransform.offsetMin = new Vector2(16f, 2f);
            titleTmp.rectTransform.offsetMax = new Vector2(-8f, -6f);
            titleTmp.text = "CHỌN HIỆP KHÁCH XUẤT CHIẾN";

            _identityBannerText = ModalUiKit.CreateTmp(
                "IdentityBanner",
                headerRt,
                _sansFont != null ? _sansFont : _serifFont,
                17f,
                ModalUiKit.AmberAccentColor,
                FontStyles.Bold,
                TextAlignmentOptions.BottomLeft);
            _identityBannerText.rectTransform.anchorMin = new Vector2(0f, 0f);
            _identityBannerText.rectTransform.anchorMax = new Vector2(0.72f, 0.52f);
            _identityBannerText.rectTransform.offsetMin = new Vector2(16f, 6f);
            _identityBannerText.rectTransform.offsetMax = new Vector2(-8f, -2f);
            _identityBannerText.text = "Chủ Công · Hạ toàn bộ Nghĩa Quân & Ám Ảnh";

            _timerProgressText = ModalUiKit.CreateTmp(
                "TimerProgress",
                headerRt,
                _monoFont != null ? _monoFont : _sansFont,
                18f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineRight);
            _timerProgressText.rectTransform.anchorMin = new Vector2(0.68f, 0f);
            _timerProgressText.rectTransform.anchorMax = new Vector2(1f, 1f);
            _timerProgressText.rectTransform.offsetMin = new Vector2(8f, 6f);
            _timerProgressText.rectTransform.offsetMax = new Vector2(-16f, -6f);
            _timerProgressText.text = "Còn 30s · Sẵn sàng: 0/4 ghế";

            // 2. Cards Row (supports 3 or 5 cards cleanly)
            var rowGo = new GameObject("CardsRow", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            rowGo.transform.SetParent(inner, false);
            _cardsRowRect = rowGo.GetComponent<RectTransform>();
            _cardsRowRect.anchorMin = new Vector2(0f, 0.42f);
            _cardsRowRect.anchorMax = new Vector2(1f, 0.85f);
            _cardsRowRect.offsetMin = new Vector2(24f, 0f);
            _cardsRowRect.offsetMax = new Vector2(-24f, 0f);

            var rowLayout = rowGo.GetComponent<HorizontalLayoutGroup>();
            rowLayout.spacing = 18f;
            rowLayout.childAlignment = TextAnchor.MiddleCenter;
            rowLayout.childControlWidth = false;
            rowLayout.childControlHeight = false;
            rowLayout.childForceExpandWidth = false;
            rowLayout.childForceExpandHeight = false;

            // Waiting Hint (when non-lord waits during LORD_SELECTING)
            _waitingHintText = ModalUiKit.CreateTmp(
                "WaitingHint",
                inner,
                _sansFont != null ? _sansFont : _serifFont,
                20f,
                ModalUiKit.MutedSandColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center,
                wrap: true);
            _waitingHintText.rectTransform.anchorMin = new Vector2(0.10f, 0.46f);
            _waitingHintText.rectTransform.anchorMax = new Vector2(0.90f, 0.82f);
            _waitingHintText.rectTransform.offsetMin = Vector2.zero;
            _waitingHintText.rectTransform.offsetMax = Vector2.zero;
            _waitingHintText.gameObject.SetActive(false);

            // 3. Bottom Skill Inspector + Primary Cinnabar Confirm Button
            var detailBoxGo = new GameObject("SkillInspectorBox", typeof(RectTransform), typeof(Image));
            detailBoxGo.transform.SetParent(inner, false);
            var detailRt = detailBoxGo.GetComponent<RectTransform>();
            detailRt.anchorMin = new Vector2(0f, 0f);
            detailRt.anchorMax = new Vector2(0.665f, 0.39f);
            detailRt.offsetMin = new Vector2(20f, 18f);
            detailRt.offsetMax = new Vector2(-10f, -8f);
            detailBoxGo.GetComponent<Image>().color = ModalUiKit.ObsidianInsetColor;

            _detailTitleText = ModalUiKit.CreateTmp(
                "DetailTitle",
                detailRt,
                _serifFont != null ? _serifFont : _sansFont,
                20f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineLeft);
            _detailTitleText.rectTransform.anchorMin = new Vector2(0f, 0.74f);
            _detailTitleText.rectTransform.anchorMax = new Vector2(1f, 1f);
            _detailTitleText.rectTransform.offsetMin = new Vector2(16f, 2f);
            _detailTitleText.rectTransform.offsetMax = new Vector2(-16f, -6f);

            _detailDescText = ModalUiKit.CreateTmp(
                "DetailDesc",
                detailRt,
                _sansFont != null ? _sansFont : _serifFont,
                16f,
                ModalUiKit.BodyIvoryColor,
                FontStyles.Normal,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            _detailDescText.rectTransform.anchorMin = new Vector2(0f, 0f);
            _detailDescText.rectTransform.anchorMax = new Vector2(1f, 0.74f);
            _detailDescText.rectTransform.offsetMin = new Vector2(16f, 10f);
            _detailDescText.rectTransform.offsetMax = new Vector2(-16f, -2f);
            _detailDescText.lineSpacing = 4f;

            // Confirm CTA Bottom-Right
            _confirmButton = ModalUiKit.CreatePrimaryButton(
                "ConfirmHeroButton",
                inner,
                _catalog,
                _serifFont != null ? _serifFont : _sansFont,
                "Chọn Hiệp Khách",
                19f,
                HandleConfirmClicked,
                out _confirmButtonLabel);
            var confirmRt = _confirmButton.GetComponent<RectTransform>();
            confirmRt.anchorMin = new Vector2(0.675f, 0f);
            confirmRt.anchorMax = new Vector2(1f, 0f);
            confirmRt.pivot = new Vector2(0.5f, 0f);
            confirmRt.anchoredPosition = new Vector2(-8f, 22f);
            confirmRt.sizeDelta = new Vector2(-24f, 82f);
            _confirmButtonGroup = _confirmButton.gameObject.AddComponent<CanvasGroup>();
        }

        private void RebuildCandidateCards(List<string> candidates, string stage)
        {
            for (int i = 0; i < _slots.Count; i++)
            {
                if (_slots[i].Root != null)
                {
                    Destroy(_slots[i].Root.gameObject);
                }
            }
            _slots.Clear();

            bool hasCandidates = candidates != null && candidates.Count > 0;
            _cardsRowRect.gameObject.SetActive(hasCandidates);
            _waitingHintText.gameObject.SetActive(!hasCandidates);

            if (!hasCandidates)
            {
                _waitingHintText.text = stage == "LORD_SELECTING"
                    ? "Đang chờ Chủ Công chọn Hiệp Khách mở đầu ván đấu..."
                    : "Đang chuẩn bị danh sách Hiệp Khách...";
                _focusedHeroId = null;
                UpdateInspectorAndConfirm();
                return;
            }

            float cardWidth = candidates.Count >= 5 ? 212f : 244f;
            float cardHeight = 294f;

            for (int i = 0; i < candidates.Count; i++)
            {
                string heroId = candidates[i];
                DraftCardSlot slot = CreateCardSlot(heroId, i, cardWidth, cardHeight);
                _slots.Add(slot);
            }

            string initialFocus = !string.IsNullOrEmpty(_confirmedHeroId)
                ? _confirmedHeroId
                : candidates[0];
            FocusHero(initialFocus);
        }

        private DraftCardSlot CreateCardSlot(string heroId, int index, float width, float height)
        {
            HeroLoreInfo lore = CuuChauLoreLookup.GetHeroInfo(heroId);

            var rootGo = new GameObject($"DraftCard_{heroId}", typeof(RectTransform));
            rootGo.transform.SetParent(_cardsRowRect, false);
            var rootRt = rootGo.GetComponent<RectTransform>();
            rootRt.sizeDelta = new Vector2(width, height);

            var flipGo = new GameObject("FlipBody", typeof(RectTransform), typeof(Button));
            flipGo.transform.SetParent(rootRt, false);
            var flipRt = flipGo.GetComponent<RectTransform>();
            ModalUiKit.StretchFull(flipRt, 0f, 0f);

            // Selection Glow Border
            var glowGo = new GameObject("SelectionBorder", typeof(RectTransform), typeof(Image));
            glowGo.transform.SetParent(flipRt, false);
            var glowRt = glowGo.GetComponent<RectTransform>();
            ModalUiKit.StretchFull(glowRt, -4f, -4f);
            var glowImg = glowGo.GetComponent<Image>();
            glowImg.color = ModalUiKit.BronzeBorderColor;
            glowImg.raycastTarget = false;
            glowImg.enabled = false;

            // Back Face (shown while angleY > 90)
            var backGo = new GameObject("CardBackFace", typeof(RectTransform), typeof(Image));
            backGo.transform.SetParent(flipRt, false);
            var backRt = backGo.GetComponent<RectTransform>();
            ModalUiKit.StretchFull(backRt, 0f, 0f);
            backRt.localRotation = Quaternion.Euler(0f, 180f, 0f);
            var backImg = backGo.GetComponent<Image>();
            if (_catalog != null && _catalog.cardBackCuuChau != null)
            {
                backImg.sprite = _catalog.cardBackCuuChau;
                backImg.preserveAspect = false;
                backImg.color = Color.white;
            }
            else
            {
                backImg.color = new Color(0.11f, 0.14f, 0.22f, 1f);
            }

            // Front Face
            var frontGo = new GameObject("CardFrontFace", typeof(RectTransform), typeof(Image));
            frontGo.transform.SetParent(flipRt, false);
            var frontRt = frontGo.GetComponent<RectTransform>();
            ModalUiKit.StretchFull(frontRt, 0f, 0f);
            var frameImg = frontGo.GetComponent<Image>();
            if (_catalog != null && _catalog.cardFrame9Slice != null)
            {
                frameImg.sprite = _catalog.cardFrame9Slice;
                frameImg.type = Image.Type.Sliced;
                frameImg.color = Color.white;
            }
            else
            {
                frameImg.color = ModalUiKit.ObsidianSubCardColor;
            }

            // Inner Dark Portrait Window
            var artBgGo = new GameObject("PortraitWindow", typeof(RectTransform), typeof(Image), typeof(RectMask2D));
            artBgGo.transform.SetParent(frontRt, false);
            var artBgRt = artBgGo.GetComponent<RectTransform>();
            artBgRt.anchorMin = new Vector2(0.09f, 0.30f);
            artBgRt.anchorMax = new Vector2(0.91f, 0.90f);
            artBgRt.offsetMin = Vector2.zero;
            artBgRt.offsetMax = Vector2.zero;
            artBgGo.GetComponent<Image>().color = new Color(0.08f, 0.065f, 0.055f, 1f);

            var monogramTmp = ModalUiKit.CreateTmp(
                "Monogram",
                artBgRt,
                _serifFont != null ? _serifFont : _sansFont,
                34f,
                new Color(0.78f, 0.65f, 0.40f, 0.38f),
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            ModalUiKit.StretchFull(monogramTmp.rectTransform, 4f, 4f);
            monogramTmp.text = ModalUiKit.BuildMonogram(lore.NameVi);

            var portraitGo = new GameObject("PortraitSprite", typeof(RectTransform), typeof(Image));
            portraitGo.transform.SetParent(artBgRt, false);
            ModalUiKit.StretchFull(portraitGo.GetComponent<RectTransform>(), 0f, 0f);
            var portraitImg = portraitGo.GetComponent<Image>();
            Sprite heroSprite = ModalUiKit.ResolveHeroSprite(_catalog, lore);
            portraitImg.sprite = heroSprite;
            portraitImg.preserveAspect = true;
            portraitImg.enabled = heroSprite != null;
            portraitImg.raycastTarget = false;
            monogramTmp.enabled = heroSprite == null;

            // Faction Seal top-left
            var sealGo = new GameObject("FactionSeal", typeof(RectTransform), typeof(Image));
            sealGo.transform.SetParent(frontRt, false);
            var sealRt = sealGo.GetComponent<RectTransform>();
            sealRt.anchorMin = new Vector2(0.08f, 0.80f);
            sealRt.anchorMax = new Vector2(0.08f, 0.80f);
            sealRt.pivot = new Vector2(0f, 1f);
            sealRt.anchoredPosition = new Vector2(4f, 14f);
            sealRt.sizeDelta = new Vector2(34f, 34f);
            var sealImg = sealGo.GetComponent<Image>();
            Sprite factionSprite = _catalog != null ? _catalog.GetFactionSprite(lore.FactionCode) : null;
            sealImg.sprite = factionSprite;
            sealImg.preserveAspect = true;
            sealImg.enabled = factionSprite != null;
            sealImg.raycastTarget = false;

            // Dark Nameplate Strip at Bottom
            var plateGo = new GameObject("NamePlate", typeof(RectTransform), typeof(Image));
            plateGo.transform.SetParent(frontRt, false);
            var plateRt = plateGo.GetComponent<RectTransform>();
            plateRt.anchorMin = new Vector2(0.06f, 0.05f);
            plateRt.anchorMax = new Vector2(0.94f, 0.28f);
            plateRt.offsetMin = Vector2.zero;
            plateRt.offsetMax = Vector2.zero;
            plateGo.GetComponent<Image>().color = ModalUiKit.ObsidianPanelColor;

            var nameTmp = ModalUiKit.CreateTmp(
                "HeroName",
                plateRt,
                _serifFont != null ? _serifFont : _sansFont,
                17f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            nameTmp.rectTransform.anchorMin = new Vector2(0f, 0.44f);
            nameTmp.rectTransform.anchorMax = new Vector2(1f, 0.96f);
            nameTmp.rectTransform.offsetMin = new Vector2(6f, 0f);
            nameTmp.rectTransform.offsetMax = new Vector2(-6f, 0f);
            nameTmp.text = lore.NameVi;

            var metaTmp = ModalUiKit.CreateTmp(
                "HeroMeta",
                plateRt,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.GetFactionAccentColor(lore.FactionCode),
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            metaTmp.rectTransform.anchorMin = new Vector2(0f, 0.04f);
            metaTmp.rectTransform.anchorMax = new Vector2(1f, 0.44f);
            metaTmp.rectTransform.offsetMin = new Vector2(6f, 0f);
            metaTmp.rectTransform.offsetMax = new Vector2(-6f, 0f);
            metaTmp.text = $"{lore.FactionVi} · {lore.MaxHp} Máu";

            var btn = flipGo.GetComponent<Button>();
            btn.targetGraphic = frameImg;
            string capturedId = heroId;
            btn.onClick.AddListener(() => FocusHero(capturedId));

            var slot = new DraftCardSlot
            {
                HeroId = heroId,
                Lore = lore,
                Root = rootRt,
                FlipBody = flipRt,
                BackFace = backGo,
                FrontFace = frontGo,
                FrameImage = frameImg,
                SelectionBorder = glowImg,
                PortraitImage = portraitImg,
                MonogramText = monogramTmp,
                FactionSealImage = sealImg,
                NameText = nameTmp,
                MetaText = metaTmp,
                Button = btn,
                FlipDelay = index * FlipStaggerSec,
                FlipElapsed = 0f,
                FlipFinished = _reducedMotion,
            };

            if (_reducedMotion)
            {
                ApplyFlipAngle(slot, 0f);
            }
            else
            {
                ApplyFlipAngle(slot, 180f);
            }

            return slot;
        }

        private void TickCardFlip(DraftCardSlot slot, float dt)
        {
            if (slot == null || slot.FlipFinished) return;

            slot.FlipElapsed += dt;
            if (slot.FlipElapsed < slot.FlipDelay)
            {
                ApplyFlipAngle(slot, 180f);
                return;
            }

            float activeTime = slot.FlipElapsed - slot.FlipDelay;
            float t = Mathf.Clamp01(activeTime / FlipDurationSec);
            float eased = 1f - Mathf.Pow(1f - t, 3f);
            float angleY = Mathf.Lerp(180f, 0f, eased);
            ApplyFlipAngle(slot, angleY);

            if (t >= 1f)
            {
                slot.FlipFinished = true;
                ApplyFlipAngle(slot, 0f);
            }
        }

        private void SnapAllCardsFaceUp()
        {
            for (int i = 0; i < _slots.Count; i++)
            {
                _slots[i].FlipFinished = true;
                ApplyFlipAngle(_slots[i], 0f);
            }
        }

        private static void ApplyFlipAngle(DraftCardSlot slot, float angleY)
        {
            if (slot.FlipBody != null)
            {
                slot.FlipBody.localRotation = Quaternion.Euler(0f, angleY, 0f);
            }
            bool showBack = angleY > 90f;
            if (slot.BackFace != null) slot.BackFace.SetActive(showBack);
            if (slot.FrontFace != null) slot.FrontFace.SetActive(!showBack);
        }

        private void FocusHero(string heroId)
        {
            _focusedHeroId = heroId;

            for (int i = 0; i < _slots.Count; i++)
            {
                DraftCardSlot slot = _slots[i];
                bool isFocused = string.Equals(slot.HeroId, heroId, StringComparison.OrdinalIgnoreCase);
                if (slot.SelectionBorder != null)
                {
                    slot.SelectionBorder.enabled = isFocused;
                }
                if (slot.Root != null)
                {
                    float s = isFocused ? 1.06f : 1.0f;
                    slot.Root.localScale = new Vector3(s, s, 1f);
                }
            }

            UpdateInspectorAndConfirm();
        }

        private void UpdateInspectorAndConfirm()
        {
            bool hasConfirmed = !string.IsNullOrEmpty(_confirmedHeroId);
            bool hasFocus = !string.IsNullOrEmpty(_focusedHeroId);

            if (!hasFocus)
            {
                if (_detailTitleText != null) _detailTitleText.text = "Chưa có Hiệp Khách được chọn";
                if (_detailDescText != null) _detailDescText.text = "Đang chờ danh sách tướng từ máy chủ.";
                if (_confirmButton != null) _confirmButton.interactable = false;
                if (_confirmButtonGroup != null) _confirmButtonGroup.alpha = 0.45f;
                if (_confirmButtonLabel != null) _confirmButtonLabel.text = "Chờ mở thẻ Hiệp Khách";
                return;
            }

            HeroLoreInfo lore = CuuChauLoreLookup.GetHeroInfo(_focusedHeroId);
            if (_detailTitleText != null)
            {
                _detailTitleText.text = $"{lore.NameVi} · {lore.TitleVi} ({lore.FactionVi} · {lore.MaxHp} Máu)";
            }
            if (_detailDescText != null)
            {
                _detailDescText.text = lore.SkillDescVi;
            }

            if (hasConfirmed)
            {
                HeroLoreInfo confirmedLore = CuuChauLoreLookup.GetHeroInfo(_confirmedHeroId);
                if (_confirmButton != null) _confirmButton.interactable = false;
                if (_confirmButtonGroup != null) _confirmButtonGroup.alpha = 0.60f;
                if (_confirmButtonLabel != null) _confirmButtonLabel.text = $"Đã Chọn · {confirmedLore.NameVi}";
            }
            else
            {
                if (_confirmButton != null) _confirmButton.interactable = true;
                if (_confirmButtonGroup != null) _confirmButtonGroup.alpha = 1f;
                if (_confirmButtonLabel != null) _confirmButtonLabel.text = $"Chọn · {lore.NameVi}";
            }
        }

        private void UpdateTimerAndProgressText()
        {
            if (_timerProgressText == null) return;
            int sec = Mathf.Max(0, Mathf.CeilToInt(_remainingSeconds));
            _timerProgressText.text = $"Còn {sec}s · Sẵn sàng: {_readyCount}/{_totalSeatCount} ghế";
            _timerProgressText.color = sec <= 5
                ? ModalUiKit.CrimsonAccentColor
                : ModalUiKit.GoldIvoryColor;
        }

        private void HandleConfirmClicked()
        {
            if (string.IsNullOrEmpty(_focusedHeroId) || !string.IsNullOrEmpty(_confirmedHeroId))
            {
                return;
            }

            string chosen = _focusedHeroId;
            _confirmedHeroId = chosen;
            UpdateInspectorAndConfirm();
            OnHeroSelected?.Invoke(chosen);
        }
    }
}
