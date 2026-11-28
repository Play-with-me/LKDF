using System;
using System.Collections.Generic;
using CuuChau.Data;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Modals
{
    /// <summary>
    /// Sổ Tay Cửu Châu 3 Tab dùng chung giữa Sảnh và Bàn Đấu:
    /// - Tab 0: Luật & Phím Tắt
    /// - Tab 1: 36 Mặt Bài (112 Lá)
    /// - Tab 2: 25 Hiệp Khách
    /// Cuộn `ScrollRect` + `RectMask2D`, cỡ chữ >= 15f, chỉ dùng Truncate, không ký tự mũi tên.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class HandbookModalView : MonoBehaviour
    {
        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _initialized;

        private RectTransform _rootRect;
        private readonly Button[] _tabButtons = new Button[3];
        private readonly Image[] _tabBgImages = new Image[3];
        private readonly TextMeshProUGUI[] _tabLabels = new TextMeshProUGUI[3];

        private ScrollRect _scrollRect;
        private RectTransform _contentRect;
        private readonly GameObject[] _tabContainers = new GameObject[3];
        private int _currentTab = -1;

        public event Action OnCloseRequested;

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
            SelectTab(0);
            SetVisible(false);
        }

        public void SetVisible(bool visible)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            gameObject.SetActive(visible);
            if (visible)
            {
                transform.SetAsLastSibling();
                if (_currentTab < 0) SelectTab(0);
            }
        }

        public void SelectTab(int tabIndex)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            int clamped = Mathf.Clamp(tabIndex, 0, 2);
            _currentTab = clamped;

            for (int i = 0; i < 3; i++)
            {
                bool active = i == clamped;
                if (_tabContainers[i] != null)
                {
                    _tabContainers[i].SetActive(active);
                }
                if (_tabBgImages[i] != null)
                {
                    _tabBgImages[i].color = active
                        ? ModalUiKit.CinnabarFillColor
                        : ModalUiKit.SecondaryBtnColor;
                }
                if (_tabLabels[i] != null)
                {
                    _tabLabels[i].color = active
                        ? ModalUiKit.CinnabarTextColor
                        : ModalUiKit.GoldIvoryColor;
                }
            }

            if (_contentRect != null)
            {
                Canvas.ForceUpdateCanvases();
                LayoutRebuilder.ForceRebuildLayoutImmediate(_contentRect);
            }
            if (_scrollRect != null)
            {
                _scrollRect.verticalNormalizedPosition = 1f;
            }
        }

        private void BuildHierarchy()
        {
            _rootRect = ModalUiKit.EnsureRootStretch(gameObject);
            ModalUiKit.CreateModalShell(
                _rootRect,
                "HandbookPanel",
                new Vector2(1140f, 680f),
                _catalog,
                out RectTransform inner);

            // Header
            var titleTmp = ModalUiKit.CreateTmp(
                "HandbookTitle",
                inner,
                _serifFont != null ? _serifFont : _sansFont,
                24f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineLeft);
            titleTmp.rectTransform.anchorMin = new Vector2(0f, 1f);
            titleTmp.rectTransform.anchorMax = new Vector2(0.75f, 1f);
            titleTmp.rectTransform.pivot = new Vector2(0f, 1f);
            titleTmp.rectTransform.anchoredPosition = new Vector2(22f, -16f);
            titleTmp.rectTransform.sizeDelta = new Vector2(0f, 40f);
            titleTmp.text = "SỔ TAY CỬU CHÂU ẨN KIẾM";

            Button closeBtn = ModalUiKit.CreateSecondaryButton(
                "CloseHandbookBtn",
                inner,
                _sansFont != null ? _sansFont : _serifFont,
                "Đóng Sổ Tay",
                15f,
                ModalUiKit.SecondaryBtnColor,
                () => OnCloseRequested?.Invoke(),
                out _,
                out _);
            var closeRt = closeBtn.GetComponent<RectTransform>();
            closeRt.anchorMin = new Vector2(1f, 1f);
            closeRt.anchorMax = new Vector2(1f, 1f);
            closeRt.pivot = new Vector2(1f, 1f);
            closeRt.anchoredPosition = new Vector2(-18f, -16f);
            closeRt.sizeDelta = new Vector2(146f, 40f);

            // 3 Tab Buttons
            var tabBarGo = new GameObject("TabBar", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            tabBarGo.transform.SetParent(inner, false);
            var tabBarRt = tabBarGo.GetComponent<RectTransform>();
            tabBarRt.anchorMin = new Vector2(0f, 1f);
            tabBarRt.anchorMax = new Vector2(1f, 1f);
            tabBarRt.pivot = new Vector2(0.5f, 1f);
            tabBarRt.anchoredPosition = new Vector2(0f, -68f);
            tabBarRt.sizeDelta = new Vector2(-40f, 46f);

            var tabLayout = tabBarGo.GetComponent<HorizontalLayoutGroup>();
            tabLayout.spacing = 12f;
            tabLayout.childControlWidth = true;
            tabLayout.childControlHeight = true;
            tabLayout.childForceExpandWidth = true;
            tabLayout.childForceExpandHeight = true;

            string[] tabTitles =
            {
                "Luật & Phím Tắt",
                "36 Mặt Bài (112 Lá)",
                "25 Hiệp Khách",
            };

            for (int i = 0; i < 3; i++)
            {
                int capturedIdx = i;
                _tabButtons[i] = ModalUiKit.CreateSecondaryButton(
                    $"TabBtn_{i}",
                    tabBarRt,
                    _serifFont != null ? _serifFont : _sansFont,
                    tabTitles[i],
                    17f,
                    ModalUiKit.SecondaryBtnColor,
                    () => SelectTab(capturedIdx),
                    out _tabBgImages[i],
                    out _tabLabels[i]);
            }

            // ScrollRect + RectMask2D Content Area
            _scrollRect = ModalUiKit.CreateVerticalScrollArea(
                "HandbookScrollView",
                inner,
                spacing: 12f,
                padding: new RectOffset(16, 16, 14, 18),
                out _contentRect);
            var scrollRt = _scrollRect.GetComponent<RectTransform>();
            scrollRt.anchorMin = Vector2.zero;
            scrollRt.anchorMax = Vector2.one;
            scrollRt.offsetMin = new Vector2(20f, 18f);
            scrollRt.offsetMax = new Vector2(-20f, -126f);

            _tabContainers[0] = CreateTabSection("Tab0_RulesAndShortcuts");
            _tabContainers[1] = CreateTabSection("Tab1_Cards112");
            _tabContainers[2] = CreateTabSection("Tab2_Heroes25");

            PopulateRulesTab(_tabContainers[0].transform);
            PopulateCardsTab(_tabContainers[1].transform);
            PopulateHeroesTab(_tabContainers[2].transform);
        }

        private GameObject CreateTabSection(string name)
        {
            var go = new GameObject(
                name,
                typeof(RectTransform),
                typeof(VerticalLayoutGroup),
                typeof(ContentSizeFitter));
            go.transform.SetParent(_contentRect, false);

            var vlg = go.GetComponent<VerticalLayoutGroup>();
            vlg.spacing = 10f;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            var fitter = go.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            return go;
        }

        private void PopulateRulesTab(Transform parent)
        {
            AddRuleCard(
                parent,
                "1. Điều Kiện Thắng & Thân Phận (4–8 Người)",
                "• Chủ Công (Lật công khai đầu ván, Chủ Công luôn được +1 máu tối đa ở mọi bàn 4–8 người): Hạ toàn bộ Nghĩa Quân & Ám Ảnh.\n" +
                "• Hộ Pháp (Ẩn): Bảo vệ Chủ Công sống sót và tiêu diệt hết Nghĩa Quân cùng Ám Ảnh.\n" +
                "• Nghĩa Quân (Ẩn): Hạ gục Chủ Công (thắng ngay trừ khi Ám Ảnh là người duy nhất còn sống).\n" +
                "• Ám Ảnh (Ẩn): Là cao thủ duy nhất sống sót cuối cùng trên bàn đấu.");

            AddRuleCard(
                parent,
                "2. Bảng Phân Bổ Thân Phận Chuẩn",
                "• 4 người: 1 Chủ Công · 0 Hộ Pháp · 2 Nghĩa Quân · 1 Ám Ảnh\n" +
                "• 5 người: 1 Chủ Công · 1 Hộ Pháp · 2 Nghĩa Quân · 1 Ám Ảnh\n" +
                "• 6 người: 1 Chủ Công · 1 Hộ Pháp · 3 Nghĩa Quân · 1 Ám Ảnh\n" +
                "• 7 người: 1 Chủ Công · 2 Hộ Pháp · 3 Nghĩa Quân · 1 Ám Ảnh\n" +
                "• 8 người: 1 Chủ Công · 2 Hộ Pháp · 3 Nghĩa Quân · 2 Ám Ảnh");

            AddRuleCard(
                parent,
                "3. Trình Tự Một Lượt Đấu (6 Pha)",
                "• Pha Chuẩn Bị · Pha Phán Xét (giải quyết ấn chú Thiên Lôi Kiếp, Điểm Huyệt Phong Mạch từ muộn tới sớm).\n" +
                "• Pha Rút Bài (mặc định rút 2 lá) · Pha Hành Động (đánh Kiếm Trảm 1 lần/lượt, dùng bí kíp, mặc trang bị).\n" +
                "• Pha Bỏ Bài (bỏ bớt bài thừa vượt quá số Sinh Lực hiện tại) · Pha Kết Lượt.");

            AddRuleCard(
                parent,
                "4. Khoảng Cách, Tầm Đánh & Thưởng Phạt Hạ Gục",
                "• Khoảng cách bàn tròn tính theo chiều ngắn nhất giữa các ghế còn sống.\n" +
                "• Khinh Công +1 cộng thêm +1 vào khoảng cách địch nhắm tới bạn; Thân Pháp -1 giảm 1 khoảng cách bạn nhắm tới địch.\n" +
                "• Kết liễu Nghĩa Quân: Người hạ gục rút thưởng ngay 3 lá bài (tính cả khi Chủ Công hạ gục).\n" +
                "• Chủ Công hạ nhầm Hộ Pháp: Chủ Công phải bỏ toàn bộ bài trên tay và khu trang bị.");

            AddRuleCard(
                parent,
                "5. Phím Tắt & Thao Tác Nhanh",
                "• Phím số 1 đến 9: Chọn nhanh lá bài trên tay từ trái sang phải.\n" +
                "• Kéo thả bài (hoặc bấm bài rồi bấm ghế): Xuất chiêu vào mục tiêu hợp lệ.\n" +
                "• Phím Enter hoặc Space: Xác nhận hành động chính đang sáng.\n" +
                "• Phím Esc: Hủy chọn bài/mục tiêu hoặc đóng hộp thoại đang mở.\n" +
                "• Phím E: Kết thúc Pha Hành Động khi đang giữ lượt.");
        }

        private void PopulateCardsTab(Transform parent)
        {
            IReadOnlyList<CardLoreInfo> cards = CuuChauLoreLookup.GetAllCards();
            for (int i = 0; i < cards.Count; i++)
            {
                CardLoreInfo c = cards[i];
                AddCardEntryRow(parent, c);
            }
        }

        private void PopulateHeroesTab(Transform parent)
        {
            IReadOnlyList<HeroLoreInfo> heroes = CuuChauLoreLookup.GetAllHeroes();
            for (int i = 0; i < heroes.Count; i++)
            {
                HeroLoreInfo h = heroes[i];
                AddHeroEntryRow(parent, h);
            }
        }

        private void AddRuleCard(Transform parent, string title, string body)
        {
            var cardGo = new GameObject(
                "RuleCard",
                typeof(RectTransform),
                typeof(Image),
                typeof(VerticalLayoutGroup),
                typeof(ContentSizeFitter));
            cardGo.transform.SetParent(parent, false);
            cardGo.GetComponent<Image>().color = ModalUiKit.ObsidianSubCardColor;

            var vlg = cardGo.GetComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(16, 16, 12, 12);
            vlg.spacing = 6f;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            var fitter = cardGo.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            var titleTmp = ModalUiKit.CreateTmp(
                "RuleTitle",
                cardGo.transform,
                _serifFont != null ? _serifFont : _sansFont,
                18f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            titleTmp.text = title;

            var bodyTmp = ModalUiKit.CreateTmp(
                "RuleBody",
                cardGo.transform,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.BodyIvoryColor,
                FontStyles.Normal,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            bodyTmp.lineSpacing = 4f;
            bodyTmp.text = body;
        }

        private void AddCardEntryRow(Transform parent, CardLoreInfo info)
        {
            var rowGo = new GameObject(
                $"CardRow_{info.CardKey}",
                typeof(RectTransform),
                typeof(Image),
                typeof(HorizontalLayoutGroup),
                typeof(ContentSizeFitter));
            rowGo.transform.SetParent(parent, false);
            rowGo.GetComponent<Image>().color = ModalUiKit.ObsidianSubCardColor;

            var hlg = rowGo.GetComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(12, 14, 10, 10);
            hlg.spacing = 12f;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            var fitter = rowGo.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            // Optional Card Thumbnail
            var thumbGo = new GameObject("Thumb", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            thumbGo.transform.SetParent(rowGo.transform, false);
            var thumbLe = thumbGo.GetComponent<LayoutElement>();
            thumbLe.preferredWidth = 54f;
            thumbLe.preferredHeight = 54f;
            thumbLe.minWidth = 54f;
            thumbLe.minHeight = 54f;
            var thumbImg = thumbGo.GetComponent<Image>();
            Sprite art = _catalog != null ? _catalog.FindCardArt(info.CardKey) : null;
            thumbImg.sprite = art;
            thumbImg.preserveAspect = true;
            thumbImg.color = art != null ? Color.white : ModalUiKit.ObsidianInsetColor;

            // Text Column
            var colGo = new GameObject(
                "TextCol",
                typeof(RectTransform),
                typeof(VerticalLayoutGroup),
                typeof(LayoutElement));
            colGo.transform.SetParent(rowGo.transform, false);
            var colLe = colGo.GetComponent<LayoutElement>();
            colLe.flexibleWidth = 1f;

            var colVlg = colGo.GetComponent<VerticalLayoutGroup>();
            colVlg.spacing = 4f;
            colVlg.childControlWidth = true;
            colVlg.childControlHeight = true;
            colVlg.childForceExpandWidth = true;
            colVlg.childForceExpandHeight = false;

            var titleTmp = ModalUiKit.CreateTmp(
                "CardTitle",
                colGo.transform,
                _serifFont != null ? _serifFont : _sansFont,
                17f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            titleTmp.text = $"{info.NameVi} · {info.CategoryVi} ({info.DeckCount} lá)";

            var descTmp = ModalUiKit.CreateTmp(
                "CardEffect",
                colGo.transform,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.BodyIvoryColor,
                FontStyles.Normal,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            descTmp.lineSpacing = 3f;
            descTmp.text = info.EffectVi;
        }

        private void AddHeroEntryRow(Transform parent, HeroLoreInfo info)
        {
            var rowGo = new GameObject(
                $"HeroRow_{info.HeroId}",
                typeof(RectTransform),
                typeof(Image),
                typeof(HorizontalLayoutGroup),
                typeof(ContentSizeFitter));
            rowGo.transform.SetParent(parent, false);
            rowGo.GetComponent<Image>().color = ModalUiKit.ObsidianSubCardColor;

            var hlg = rowGo.GetComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(12, 14, 10, 10);
            hlg.spacing = 12f;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            var fitter = rowGo.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            // Portrait Thumbnail or Monogram Badge
            var thumbGo = new GameObject("PortraitThumb", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            thumbGo.transform.SetParent(rowGo.transform, false);
            var thumbLe = thumbGo.GetComponent<LayoutElement>();
            thumbLe.preferredWidth = 64f;
            thumbLe.preferredHeight = 64f;
            thumbLe.minWidth = 64f;
            thumbLe.minHeight = 64f;
            var thumbImg = thumbGo.GetComponent<Image>();
            Sprite heroSprite = ModalUiKit.ResolveHeroSprite(_catalog, info);
            thumbImg.sprite = heroSprite;
            thumbImg.preserveAspect = true;
            thumbImg.color = heroSprite != null ? Color.white : ModalUiKit.ObsidianInsetColor;

            if (heroSprite == null)
            {
                var mono = ModalUiKit.CreateTmp(
                    "Monogram",
                    thumbGo.transform,
                    _serifFont != null ? _serifFont : _sansFont,
                    20f,
                    ModalUiKit.GetFactionAccentColor(info.FactionCode),
                    FontStyles.Bold,
                    TextAlignmentOptions.Center);
                ModalUiKit.StretchFull(mono.rectTransform, 2f, 2f);
                mono.text = ModalUiKit.BuildMonogram(info.NameVi);
            }

            // Text Column
            var colGo = new GameObject(
                "TextCol",
                typeof(RectTransform),
                typeof(VerticalLayoutGroup),
                typeof(LayoutElement));
            colGo.transform.SetParent(rowGo.transform, false);
            var colLe = colGo.GetComponent<LayoutElement>();
            colLe.flexibleWidth = 1f;

            var colVlg = colGo.GetComponent<VerticalLayoutGroup>();
            colVlg.spacing = 4f;
            colVlg.childControlWidth = true;
            colVlg.childControlHeight = true;
            colVlg.childForceExpandWidth = true;
            colVlg.childForceExpandHeight = false;

            string lordTag = info.IsLordCandidate ? " · Ứng viên Chủ Công" : string.Empty;
            var titleTmp = ModalUiKit.CreateTmp(
                "HeroTitle",
                colGo.transform,
                _serifFont != null ? _serifFont : _sansFont,
                17f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            titleTmp.text = $"{info.NameVi} · {info.TitleVi} ({info.FactionVi} · {info.MaxHp} Máu{lordTag})";

            var descTmp = ModalUiKit.CreateTmp(
                "HeroSkills",
                colGo.transform,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.BodyIvoryColor,
                FontStyles.Normal,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            descTmp.lineSpacing = 3f;
            descTmp.text = info.SkillDescVi;
        }
    }
}
