using System;
using System.Collections.Generic;
using CuuChau.Audio;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Arena
{
    /// <summary>
    /// Điều phối HUD bàn đấu:
    /// - TopHeader góc trên-trái cách mép an toàn (>= 44px trái, >= 26px trên), cỡ chữ >= 19f.
    /// - Đúng 2 Ấn Đồng Đúc ở góc trên-phải (sealBattleLog & sealSettingsGear).
    /// - Khối Trung Tâm: Chồng Bài Rút (cardBackCuuChau + bộ đếm) & Lá Vừa Đánh (DiscardCardSlot).
    /// - Thanh Hành Động Ghim Góc Dưới-Phải (Nút chính 9-slice Chu Sa + nút phụ Bỏ qua + FuseTimerBar).
    /// - Ngăn kéo Nhật Ký Trận Đấu trượt từ phải & Cửa sổ Cài Đặt (Mute + ReducedMotion).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ArenaHudController : MonoBehaviour
    {
        private static readonly Color ObsidianPanelColor = new(0.055f, 0.045f, 0.038f, 0.92f);
        private static readonly Color HeaderBackdropColor = new(0.05f, 0.04f, 0.035f, 0.84f);
        private static readonly Color BronzeBorderColor = new(0.72f, 0.56f, 0.28f, 0.82f);
        private static readonly Color GoldIvoryColor = new(0.96f, 0.89f, 0.67f, 1f);
        private static readonly Color InkDarkColor = new(0.11f, 0.08f, 0.06f, 1f);

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private RectTransform _rootRect;
        private bool _initialized;

        // Top Header + 2 Cast-Bronze Seals
        private TextMeshProUGUI _topHeaderText;
        private Button _battleLogSealBtn;
        private Button _settingsSealBtn;

        // Center Draw & Discard Piles
        private RectTransform _drawPileRect;
        private Image _drawPileBackImage;
        private TextMeshProUGUI _drawPileCountText;
        private RectTransform _discardCardRect;
        private Image _discardFrameImage;
        private Image _discardArtImage;
        private Image _discardSuitImage;
        private TextMeshProUGUI _discardRankText;
        private TextMeshProUGUI _discardTitleText;
        private TextMeshProUGUI _discardEmptyText;
        private TextMeshProUGUI _discardCountText;

        // Bottom-Right Pinned Action Plaque + Secondary Skip + Fuse Timer
        private FuseTimerBar _fuseTimerBar;
        private Button _primaryActionBtn;
        private Image _primaryActionImage;
        private CanvasGroup _primaryActionGroup;
        private TextMeshProUGUI _primaryActionLabel;
        private Action _primaryActionCallback;

        private Button _secondarySkipBtn;
        private TextMeshProUGUI _secondarySkipLabel;
        private Action _secondarySkipCallback;

        // Right-Sliding Battle Log Drawer
        private RectTransform _logDrawerRect;
        private CanvasGroup _logDrawerGroup;
        private ScrollRect _logScrollRect;
        private RectTransform _logContentRect;
        private readonly List<TextMeshProUGUI> _logLineViews = new();
        private readonly List<string> _logEntries = new();
        private bool _logDrawerOpen;
        private float _logDrawerSlide01;

        // Settings Modal
        private GameObject _settingsModalObj;
        private Toggle _muteToggle;
        private Toggle _reducedMotionToggle;
        private bool _isMuted;
        private bool _isReducedMotion;

        public FuseTimerBar FuseTimer => _fuseTimerBar;
        public RectTransform DrawPileAnchor => _drawPileRect;
        public RectTransform DiscardPileAnchor => _discardCardRect;
        public bool IsMuted => _isMuted;
        public bool IsReducedMotion => _isReducedMotion;

        public event Action<bool> OnMuteChanged;
        public event Action<bool> OnReducedMotionChanged;
        public event Action OnOpenRefereeRequested;
        public event Action OnOpenHandbookRequested;

        public void InitializeHud(
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

            _rootRect = transform as RectTransform;
            if (_rootRect == null) _rootRect = gameObject.AddComponent<RectTransform>();
            _rootRect.anchorMin = Vector2.zero;
            _rootRect.anchorMax = Vector2.one;
            _rootRect.offsetMin = Vector2.zero;
            _rootRect.offsetMax = Vector2.zero;

            BuildTopHeaderAndSeals();
            BuildCenterDrawAndDiscard();
            BuildBottomRightActionBar();
            BuildBattleLogDrawer();
            BuildSettingsModal();

            _initialized = true;
        }

        public void UpdateFromState(PlayerViewStateDto state)
        {
            if (!_initialized) InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);
            if (state == null) return;

            int roundNum = Mathf.Max(1, state.RoundNumber);
            int drawCount = Mathf.Max(0, state.DrawPileCount);
            if (_topHeaderText != null)
            {
                _topHeaderText.text = $"CỬU CHÂU ẨN KIẾM · Vòng {roundNum} · Rút: {drawCount}";
            }

            if (_drawPileCountText != null)
            {
                _drawPileCountText.text = $"Rút: {drawCount}";
            }

            if (_discardCountText != null)
            {
                _discardCountText.text = $"Bỏ: {Mathf.Max(0, state.DiscardPileCount)}";
            }

            BindDiscardTop(state.DiscardPileTop);

            if (state.ActionLog != null && state.ActionLog.Count > _logEntries.Count)
            {
                for (int i = _logEntries.Count; i < state.ActionLog.Count; i++)
                {
                    AppendLogLine(state.ActionLog[i]);
                }
            }
        }

        public void SetPrimaryAction(string label, bool interactable, Action onClick)
        {
            if (!_initialized) InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);

            _primaryActionCallback = onClick;
            if (_primaryActionLabel != null)
            {
                _primaryActionLabel.text = string.IsNullOrEmpty(label) ? "Kết Thúc Lượt" : label;
            }
            if (_primaryActionBtn != null)
            {
                _primaryActionBtn.interactable = interactable;
            }
            if (_primaryActionGroup != null)
            {
                _primaryActionGroup.alpha = interactable ? 1f : 0.54f;
            }
        }

        public void ShowSecondarySkip(bool visible, string label = "Bỏ qua", Action onClick = null)
        {
            if (!_initialized) InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);
            _secondarySkipCallback = onClick;

            if (_secondarySkipBtn != null)
            {
                _secondarySkipBtn.gameObject.SetActive(visible);
            }
            if (_secondarySkipLabel != null && !string.IsNullOrEmpty(label))
            {
                _secondarySkipLabel.text = label;
            }
        }

        public void AppendLogLine(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return;
            if (!_initialized) InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);

            _logEntries.Add(text);
            CreateLogLineEntry(text);

            if (_logScrollRect != null)
            {
                Canvas.ForceUpdateCanvases();
                _logScrollRect.verticalNormalizedPosition = 0f;
            }
        }

        public void PopulateDemoPreview()
        {
            if (!_initialized) InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);

            if (_topHeaderText != null)
            {
                _topHeaderText.text = "CỬU CHÂU ẨN KIẾM · Vòng 3 · Rút: 54";
            }
            if (_drawPileCountText != null)
            {
                _drawPileCountText.text = "Rút: 54";
            }
            if (_discardCountText != null)
            {
                _discardCountText.text = "Bỏ: 14";
            }

            BindDiscardTop(new CardInstanceDto
            {
                Id = "demo_discard_sat",
                CardKey = "sat",
                NameVi = "KIẾM TRẢM",
                Suit = "SPADE",
                Rank = "7",
            });

            if (_fuseTimerBar != null)
            {
                _fuseTimerBar.SetProgress(0.72f, "Pha Xuất Chiêu · 18s");
            }

            SetPrimaryAction("Xuất Trảm · Triệu Thiên Hành", true, null);
            ShowSecondarySkip(false);

            if (_logEntries.Count == 0)
            {
                AppendLogLine("[Vòng 3] Lâm Thanh Vũ rút 2 lá từ chồng bài.");
                AppendLogLine("[Vòng 3] Lâm Thanh Vũ trang bị Huyền Long Đao (Tầm 3).");
                AppendLogLine("[Vòng 3] Tô Mộng Dao chịu ấn chú Điểm Huyệt Phong Mạch (6 Cơ).");
                AppendLogLine("[Vòng 3] Triệu Thiên Hành trang bị Thanh Phong Kiếm (Tầm 2).");
                AppendLogLine("[Vòng 3] Lượt hiện tại: Lâm Thanh Vũ đang nhắm Triệu Thiên Hành.");
            }
        }

        public void SetMuted(bool muted)
        {
            _isMuted = muted;
            if (_muteToggle != null && _muteToggle.isOn != muted)
            {
                _muteToggle.SetIsOnWithoutNotify(muted);
            }
            var audioCtrl = FindAnyObjectByType<CuuChauAudioController>();
            if (audioCtrl != null)
            {
                audioCtrl.SetMuted(muted);
            }
            OnMuteChanged?.Invoke(muted);
        }

        public void SetReducedMotion(bool reducedMotion)
        {
            _isReducedMotion = reducedMotion;
            if (_reducedMotionToggle != null && _reducedMotionToggle.isOn != reducedMotion)
            {
                _reducedMotionToggle.SetIsOnWithoutNotify(reducedMotion);
            }
            if (_fuseTimerBar != null)
            {
                _fuseTimerBar.SetReducedMotion(reducedMotion);
            }
            OnReducedMotionChanged?.Invoke(reducedMotion);
        }

        private void Update()
        {
            if (!_initialized) return;
            float dt = Time.unscaledDeltaTime;

            if (_fuseTimerBar != null)
            {
                _fuseTimerBar.TickTimer(dt);
            }

            UpdateDrawerSlide(dt);
        }

        private void UpdateDrawerSlide(float dt)
        {
            if (_logDrawerRect == null) return;
            float target = _logDrawerOpen ? 1f : 0f;
            if (_isReducedMotion)
            {
                _logDrawerSlide01 = target;
            }
            else
            {
                _logDrawerSlide01 = Mathf.MoveTowards(_logDrawerSlide01, target, dt * 6.5f);
            }

            float width = _logDrawerRect.rect.width > 1f ? _logDrawerRect.rect.width : 420f;
            float posX = Mathf.Lerp(width + 24f, -24f, Mathf.SmoothStep(0f, 1f, _logDrawerSlide01));
            _logDrawerRect.anchoredPosition = new Vector2(posX, -102f);

            if (_logDrawerGroup != null)
            {
                _logDrawerGroup.alpha = _logDrawerSlide01;
                _logDrawerGroup.blocksRaycasts = _logDrawerSlide01 > 0.05f;
                _logDrawerGroup.interactable = _logDrawerSlide01 > 0.5f;
            }
        }

        private void BuildTopHeaderAndSeals()
        {
            // Safe inset from top-left bronze frame: >= 44px left, >= 26px top
            var headerGo = new GameObject("TopHeaderPlaque", typeof(RectTransform), typeof(Image));
            headerGo.transform.SetParent(_rootRect, false);
            var headerRt = headerGo.GetComponent<RectTransform>();
            headerRt.anchorMin = new Vector2(0f, 1f);
            headerRt.anchorMax = new Vector2(0f, 1f);
            headerRt.pivot = new Vector2(0f, 1f);
            headerRt.anchoredPosition = new Vector2(48f, -28f);
            headerRt.sizeDelta = new Vector2(540f, 44f);
            var headerBg = headerGo.GetComponent<Image>();
            headerBg.color = HeaderBackdropColor;
            headerBg.raycastTarget = false;

            var headerTextGo = new GameObject("TopHeader", typeof(RectTransform), typeof(TextMeshProUGUI));
            headerTextGo.transform.SetParent(headerRt, false);
            StretchFull(headerTextGo.GetComponent<RectTransform>(), 12f, 4f);
            _topHeaderText = headerTextGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) _topHeaderText.font = _serifFont;
            _topHeaderText.fontSize = 20f;
            _topHeaderText.fontStyle = FontStyles.Bold;
            _topHeaderText.color = GoldIvoryColor;
            _topHeaderText.alignment = TextAlignmentOptions.MidlineLeft;
            _topHeaderText.textWrappingMode = TextWrappingModes.NoWrap;
            _topHeaderText.overflowMode = TextOverflowModes.Truncate;
            _topHeaderText.text = "CỬU CHÂU ẨN KIẾM · Vòng 1 · Rút: 0";
            _topHeaderText.raycastTarget = false;

            // Strictly 2 Cast-Bronze Seals Top-Right (sealBattleLog, sealSettingsGear)
            _battleLogSealBtn = CreateSealButton(
                "HUD_Seal_BattleLog",
                _catalog != null ? _catalog.sealBattleLog : null,
                new Vector2(-118f, -28f),
                ToggleBattleLogDrawer);

            _settingsSealBtn = CreateSealButton(
                "HUD_Seal_Settings",
                _catalog != null ? _catalog.sealSettingsGear : null,
                new Vector2(-48f, -28f),
                ToggleSettingsModal);
        }

        private Button CreateSealButton(string name, Sprite sprite, Vector2 anchoredPos, Action onClick)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(_rootRect, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(1f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(1f, 1f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = new Vector2(56f, 56f);

            var img = go.GetComponent<Image>();
            img.sprite = sprite;
            img.preserveAspect = true;
            img.color = sprite != null ? Color.white : new Color(0.72f, 0.56f, 0.28f, 0.92f);

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(() => onClick?.Invoke());
            return btn;
        }

        private void BuildCenterDrawAndDiscard()
        {
            var centerRoot = new GameObject("CenterPilesRoot", typeof(RectTransform));
            centerRoot.transform.SetParent(_rootRect, false);
            var centerRt = centerRoot.GetComponent<RectTransform>();
            centerRt.anchorMin = new Vector2(0.5f, 0.52f);
            centerRt.anchorMax = new Vector2(0.5f, 0.52f);
            centerRt.pivot = new Vector2(0.5f, 0.5f);
            centerRt.anchoredPosition = Vector2.zero;
            centerRt.sizeDelta = new Vector2(360f, 230f);

            // Draw Pile (Left)
            var drawGo = new GameObject("Center_DrawPile", typeof(RectTransform), typeof(Image));
            drawGo.transform.SetParent(centerRt, false);
            _drawPileRect = drawGo.GetComponent<RectTransform>();
            _drawPileRect.anchorMin = new Vector2(0.5f, 0.5f);
            _drawPileRect.anchorMax = new Vector2(0.5f, 0.5f);
            _drawPileRect.anchoredPosition = new Vector2(-86f, 14f);
            _drawPileRect.sizeDelta = new Vector2(126f, 174f);
            _drawPileBackImage = drawGo.GetComponent<Image>();
            _drawPileBackImage.sprite = _catalog != null ? _catalog.cardBackCuuChau : null;
            _drawPileBackImage.preserveAspect = true;
            _drawPileBackImage.color = _drawPileBackImage.sprite != null ? Color.white : new Color(0.14f, 0.16f, 0.24f, 0.95f);
            _drawPileBackImage.raycastTarget = false;

            var drawBadgeGo = new GameObject("DrawPileCountBadge", typeof(RectTransform), typeof(Image));
            drawBadgeGo.transform.SetParent(centerRt, false);
            var drawBadgeRt = drawBadgeGo.GetComponent<RectTransform>();
            drawBadgeRt.anchorMin = new Vector2(0.5f, 0.5f);
            drawBadgeRt.anchorMax = new Vector2(0.5f, 0.5f);
            drawBadgeRt.anchoredPosition = new Vector2(-86f, -92f);
            drawBadgeRt.sizeDelta = new Vector2(120f, 28f);
            drawBadgeGo.GetComponent<Image>().color = ObsidianPanelColor;

            var drawCountGo = new GameObject("DrawPileCount", typeof(RectTransform), typeof(TextMeshProUGUI));
            drawCountGo.transform.SetParent(drawBadgeRt, false);
            StretchFull(drawCountGo.GetComponent<RectTransform>(), 4f, 0f);
            _drawPileCountText = drawCountGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _drawPileCountText.font = _monoFont;
            else if (_sansFont != null) _drawPileCountText.font = _sansFont;
            _drawPileCountText.fontSize = 16f;
            _drawPileCountText.fontStyle = FontStyles.Bold;
            _drawPileCountText.color = GoldIvoryColor;
            _drawPileCountText.alignment = TextAlignmentOptions.Center;
            _drawPileCountText.text = "Rút: 0";
            _drawPileCountText.raycastTarget = false;

            // Discard Card Slot (Right)
            var discardGo = new GameObject("DiscardCardSlot", typeof(RectTransform), typeof(Image));
            discardGo.transform.SetParent(centerRt, false);
            _discardCardRect = discardGo.GetComponent<RectTransform>();
            _discardCardRect.anchorMin = new Vector2(0.5f, 0.5f);
            _discardCardRect.anchorMax = new Vector2(0.5f, 0.5f);
            _discardCardRect.anchoredPosition = new Vector2(86f, 14f);
            _discardCardRect.sizeDelta = new Vector2(126f, 174f);
            _discardFrameImage = discardGo.GetComponent<Image>();
            _discardFrameImage.sprite = _catalog != null ? _catalog.cardFrame9Slice : null;
            _discardFrameImage.type = _discardFrameImage.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            _discardFrameImage.color = _discardFrameImage.sprite != null ? Color.white : new Color(0.12f, 0.10f, 0.08f, 0.94f);
            _discardFrameImage.raycastTarget = false;

            var artGo = new GameObject("DiscardCardArt", typeof(RectTransform), typeof(Image));
            artGo.transform.SetParent(_discardCardRect, false);
            var artRt = artGo.GetComponent<RectTransform>();
            artRt.anchorMin = new Vector2(0.11f, 0.25f);
            artRt.anchorMax = new Vector2(0.89f, 0.85f);
            artRt.offsetMin = Vector2.zero;
            artRt.offsetMax = Vector2.zero;
            _discardArtImage = artGo.GetComponent<Image>();
            _discardArtImage.preserveAspect = true;
            _discardArtImage.raycastTarget = false;

            // Top-left dark rank+suit badge inside DiscardCardSlot
            var pipBgGo = new GameObject("DiscardPipBg", typeof(RectTransform), typeof(Image));
            pipBgGo.transform.SetParent(_discardCardRect, false);
            var pipBgRt = pipBgGo.GetComponent<RectTransform>();
            pipBgRt.anchorMin = new Vector2(0.08f, 0.61f);
            pipBgRt.anchorMax = new Vector2(0.32f, 0.90f);
            pipBgRt.offsetMin = Vector2.zero;
            pipBgRt.offsetMax = Vector2.zero;
            pipBgGo.GetComponent<Image>().color = new Color(0.06f, 0.05f, 0.045f, 0.88f);

            var rankGo = new GameObject("DiscardRank", typeof(RectTransform), typeof(TextMeshProUGUI));
            rankGo.transform.SetParent(pipBgRt, false);
            var rankRt = rankGo.GetComponent<RectTransform>();
            rankRt.anchorMin = new Vector2(0f, 0.45f);
            rankRt.anchorMax = new Vector2(1f, 1f);
            rankRt.offsetMin = Vector2.zero;
            rankRt.offsetMax = Vector2.zero;
            _discardRankText = rankGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _discardRankText.font = _monoFont;
            _discardRankText.fontSize = 18f;
            _discardRankText.fontStyle = FontStyles.Bold;
            _discardRankText.color = GoldIvoryColor;
            _discardRankText.alignment = TextAlignmentOptions.Center;
            _discardRankText.raycastTarget = false;

            var suitGo = new GameObject("DiscardSuit", typeof(RectTransform), typeof(Image));
            suitGo.transform.SetParent(pipBgRt, false);
            var suitRt = suitGo.GetComponent<RectTransform>();
            suitRt.anchorMin = new Vector2(0.2f, 0.05f);
            suitRt.anchorMax = new Vector2(0.8f, 0.48f);
            suitRt.offsetMin = Vector2.zero;
            suitRt.offsetMax = Vector2.zero;
            _discardSuitImage = suitGo.GetComponent<Image>();
            _discardSuitImage.preserveAspect = true;
            _discardSuitImage.raycastTarget = false;

            // Card title over parchment strip (dark obsidian ink for contrast!)
            var titleGo = new GameObject("DiscardTitle", typeof(RectTransform), typeof(TextMeshProUGUI));
            titleGo.transform.SetParent(_discardCardRect, false);
            var titleRt = titleGo.GetComponent<RectTransform>();
            titleRt.anchorMin = new Vector2(0.08f, 0.07f);
            titleRt.anchorMax = new Vector2(0.92f, 0.24f);
            titleRt.offsetMin = Vector2.zero;
            titleRt.offsetMax = Vector2.zero;
            _discardTitleText = titleGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) _discardTitleText.font = _serifFont;
            _discardTitleText.fontSize = 15f;
            _discardTitleText.fontStyle = FontStyles.Bold;
            _discardTitleText.color = InkDarkColor;
            _discardTitleText.alignment = TextAlignmentOptions.Center;
            _discardTitleText.textWrappingMode = TextWrappingModes.NoWrap;
            _discardTitleText.overflowMode = TextOverflowModes.Truncate;
            _discardTitleText.raycastTarget = false;

            var emptyGo = new GameObject("DiscardEmptyLabel", typeof(RectTransform), typeof(TextMeshProUGUI));
            emptyGo.transform.SetParent(_discardCardRect, false);
            StretchFull(emptyGo.GetComponent<RectTransform>(), 8f, 8f);
            _discardEmptyText = emptyGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) _discardEmptyText.font = _sansFont;
            _discardEmptyText.fontSize = 15f;
            _discardEmptyText.fontStyle = FontStyles.Bold;
            _discardEmptyText.color = new Color(0.75f, 0.70f, 0.60f, 0.85f);
            _discardEmptyText.alignment = TextAlignmentOptions.Center;
            _discardEmptyText.text = "Chồng Bỏ\nTrống";
            _discardEmptyText.raycastTarget = false;

            var discardBadgeGo = new GameObject("DiscardCountBadge", typeof(RectTransform), typeof(Image));
            discardBadgeGo.transform.SetParent(centerRt, false);
            var discardBadgeRt = discardBadgeGo.GetComponent<RectTransform>();
            discardBadgeRt.anchorMin = new Vector2(0.5f, 0.5f);
            discardBadgeRt.anchorMax = new Vector2(0.5f, 0.5f);
            discardBadgeRt.anchoredPosition = new Vector2(86f, -92f);
            discardBadgeRt.sizeDelta = new Vector2(120f, 28f);
            discardBadgeGo.GetComponent<Image>().color = ObsidianPanelColor;

            var discardCountGo = new GameObject("DiscardPileCount", typeof(RectTransform), typeof(TextMeshProUGUI));
            discardCountGo.transform.SetParent(discardBadgeRt, false);
            StretchFull(discardCountGo.GetComponent<RectTransform>(), 4f, 0f);
            _discardCountText = discardCountGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _discardCountText.font = _monoFont;
            else if (_sansFont != null) _discardCountText.font = _sansFont;
            _discardCountText.fontSize = 16f;
            _discardCountText.fontStyle = FontStyles.Bold;
            _discardCountText.color = GoldIvoryColor;
            _discardCountText.alignment = TextAlignmentOptions.Center;
            _discardCountText.text = "Bỏ: 0";
            _discardCountText.raycastTarget = false;
        }

        private void BindDiscardTop(CardInstanceDto top)
        {
            bool hasTop = top != null && !string.IsNullOrEmpty(top.CardKey);
            if (_discardEmptyText != null) _discardEmptyText.enabled = !hasTop;
            if (_discardArtImage != null) _discardArtImage.enabled = hasTop;
            if (_discardSuitImage != null) _discardSuitImage.enabled = hasTop;
            if (_discardRankText != null) _discardRankText.enabled = hasTop;
            if (_discardTitleText != null) _discardTitleText.enabled = hasTop;

            if (!hasTop)
            {
                if (_discardFrameImage != null)
                {
                    _discardFrameImage.color = new Color(0.25f, 0.22f, 0.18f, 0.55f);
                }
                return;
            }

            if (_discardFrameImage != null) _discardFrameImage.color = Color.white;

            if (_discardArtImage != null && _catalog != null)
            {
                Sprite art = _catalog.FindCardArt(top.CardKey);
                _discardArtImage.sprite = art;
                _discardArtImage.enabled = art != null;
            }

            if (_discardSuitImage != null && _catalog != null)
            {
                Sprite suit = _catalog.GetSuitSprite(top.Suit);
                _discardSuitImage.sprite = suit;
                _discardSuitImage.color = (top.Suit == "HEART" || top.Suit == "DIAMOND")
                    ? new Color(0.95f, 0.36f, 0.30f, 1f)
                    : GoldIvoryColor;
                _discardSuitImage.enabled = suit != null;
            }

            if (_discardRankText != null) _discardRankText.text = string.IsNullOrEmpty(top.Rank) ? string.Empty : top.Rank;
            if (_discardTitleText != null)
            {
                string title = !string.IsNullOrEmpty(top.NameVi)
                    ? top.NameVi
                    : EquipmentSlotGrid.ResolveDisplayName(top.CardKey, top.CardKey);
                _discardTitleText.text = title;
            }
        }

        private void BuildBottomRightActionBar()
        {
            var dockGo = new GameObject("BottomRightActionDock", typeof(RectTransform));
            dockGo.transform.SetParent(_rootRect, false);
            var dockRt = dockGo.GetComponent<RectTransform>();
            dockRt.anchorMin = new Vector2(1f, 0f);
            dockRt.anchorMax = new Vector2(1f, 0f);
            dockRt.pivot = new Vector2(1f, 0f);
            dockRt.anchoredPosition = new Vector2(-34f, 28f);
            dockRt.sizeDelta = new Vector2(360f, 194f);

            // Secondary Skip Button (above fuse timer, visible only when reacting/discarding)
            var skipGo = new GameObject("SecondarySkipButton", typeof(RectTransform), typeof(Image), typeof(Button));
            skipGo.transform.SetParent(dockRt, false);
            var skipRt = skipGo.GetComponent<RectTransform>();
            skipRt.anchorMin = new Vector2(1f, 1f);
            skipRt.anchorMax = new Vector2(1f, 1f);
            skipRt.pivot = new Vector2(1f, 1f);
            skipRt.anchoredPosition = Vector2.zero;
            skipRt.sizeDelta = new Vector2(196f, 44f);
            var skipBg = skipGo.GetComponent<Image>();
            skipBg.color = ObsidianPanelColor;
            _secondarySkipBtn = skipGo.GetComponent<Button>();
            _secondarySkipBtn.targetGraphic = skipBg;
            _secondarySkipBtn.onClick.AddListener(() => _secondarySkipCallback?.Invoke());

            var skipTextGo = new GameObject("SkipLabel", typeof(RectTransform), typeof(TextMeshProUGUI));
            skipTextGo.transform.SetParent(skipRt, false);
            StretchFull(skipTextGo.GetComponent<RectTransform>(), 8f, 2f);
            _secondarySkipLabel = skipTextGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) _secondarySkipLabel.font = _sansFont;
            _secondarySkipLabel.fontSize = 16f;
            _secondarySkipLabel.fontStyle = FontStyles.Bold;
            _secondarySkipLabel.color = GoldIvoryColor;
            _secondarySkipLabel.alignment = TextAlignmentOptions.Center;
            _secondarySkipLabel.text = "Bỏ qua";
            _secondarySkipLabel.raycastTarget = false;
            skipGo.SetActive(false);

            // Fuse Timer Bar
            var fuseGo = new GameObject("FuseTimerBar", typeof(RectTransform), typeof(FuseTimerBar));
            fuseGo.transform.SetParent(dockRt, false);
            var fuseRt = fuseGo.GetComponent<RectTransform>();
            fuseRt.anchorMin = new Vector2(0f, 0f);
            fuseRt.anchorMax = new Vector2(1f, 0f);
            fuseRt.pivot = new Vector2(0.5f, 0f);
            fuseRt.anchoredPosition = new Vector2(0f, 94f);
            fuseRt.sizeDelta = new Vector2(0f, 40f);
            _fuseTimerBar = fuseGo.GetComponent<FuseTimerBar>();
            _fuseTimerBar.BuildHierarchyIfNeeded(_sansFont, _monoFont);

            // Primary Cinnabar 9-slice Action Plaque
            var primaryGo = new GameObject("Primary_Action_Plaque", typeof(RectTransform), typeof(Image), typeof(Button), typeof(CanvasGroup));
            primaryGo.transform.SetParent(dockRt, false);
            var primaryRt = primaryGo.GetComponent<RectTransform>();
            primaryRt.anchorMin = new Vector2(0f, 0f);
            primaryRt.anchorMax = new Vector2(1f, 0f);
            primaryRt.pivot = new Vector2(0.5f, 0f);
            primaryRt.anchoredPosition = Vector2.zero;
            primaryRt.sizeDelta = new Vector2(0f, 84f);

            _primaryActionImage = primaryGo.GetComponent<Image>();
            _primaryActionImage.sprite = _catalog != null ? _catalog.actionButtonPrimary9Slice : null;
            _primaryActionImage.type = _primaryActionImage.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            _primaryActionImage.color = _primaryActionImage.sprite != null ? Color.white : new Color(0.62f, 0.17f, 0.14f, 0.96f);

            _primaryActionGroup = primaryGo.GetComponent<CanvasGroup>();
            _primaryActionBtn = primaryGo.GetComponent<Button>();
            _primaryActionBtn.targetGraphic = _primaryActionImage;
            _primaryActionBtn.onClick.AddListener(() => _primaryActionCallback?.Invoke());

            var ctaTextGo = new GameObject("CTA_Label", typeof(RectTransform), typeof(TextMeshProUGUI));
            ctaTextGo.transform.SetParent(primaryRt, false);
            StretchFull(ctaTextGo.GetComponent<RectTransform>(), 18f, 6f);
            _primaryActionLabel = ctaTextGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) _primaryActionLabel.font = _serifFont;
            _primaryActionLabel.fontSize = 19f;
            _primaryActionLabel.fontStyle = FontStyles.Bold;
            _primaryActionLabel.color = new Color(1f, 0.96f, 0.87f, 1f);
            _primaryActionLabel.alignment = TextAlignmentOptions.Center;
            _primaryActionLabel.textWrappingMode = TextWrappingModes.NoWrap;
            _primaryActionLabel.overflowMode = TextOverflowModes.Truncate;
            _primaryActionLabel.text = "Kết Thúc Lượt";
            _primaryActionLabel.raycastTarget = false;
        }

        private void BuildBattleLogDrawer()
        {
            var drawerGo = new GameObject("BattleLogDrawer", typeof(RectTransform), typeof(Image), typeof(CanvasGroup));
            drawerGo.transform.SetParent(_rootRect, false);
            _logDrawerRect = drawerGo.GetComponent<RectTransform>();
            _logDrawerRect.anchorMin = new Vector2(1f, 1f);
            _logDrawerRect.anchorMax = new Vector2(1f, 1f);
            _logDrawerRect.pivot = new Vector2(1f, 1f);
            _logDrawerRect.anchoredPosition = new Vector2(450f, -102f);
            _logDrawerRect.sizeDelta = new Vector2(420f, 520f);

            var borderImg = drawerGo.GetComponent<Image>();
            borderImg.color = BronzeBorderColor;
            _logDrawerGroup = drawerGo.GetComponent<CanvasGroup>();
            _logDrawerGroup.alpha = 0f;
            _logDrawerGroup.blocksRaycasts = false;
            _logDrawerGroup.interactable = false;

            var innerGo = new GameObject("DrawerInner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(_logDrawerRect, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            StretchFull(innerRt, 2f, 2f);
            innerGo.GetComponent<Image>().color = ObsidianPanelColor;

            // Header
            var titleGo = new GameObject("DrawerTitle", typeof(RectTransform), typeof(TextMeshProUGUI));
            titleGo.transform.SetParent(innerRt, false);
            var titleRt = titleGo.GetComponent<RectTransform>();
            titleRt.anchorMin = new Vector2(0f, 1f);
            titleRt.anchorMax = new Vector2(0.70f, 1f);
            titleRt.pivot = new Vector2(0f, 1f);
            titleRt.anchoredPosition = new Vector2(16f, -14f);
            titleRt.sizeDelta = new Vector2(0f, 34f);
            var titleTmp = titleGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) titleTmp.font = _serifFont;
            titleTmp.fontSize = 19f;
            titleTmp.fontStyle = FontStyles.Bold;
            titleTmp.color = GoldIvoryColor;
            titleTmp.alignment = TextAlignmentOptions.MidlineLeft;
            titleTmp.text = "Nhật Ký Trận Đấu";

            var closeBtn = CreateTextButton("CloseDrawerBtn", innerRt, "Đóng Nhật Ký", 15f, () =>
            {
                _logDrawerOpen = false;
            });
            var closeRt = closeBtn.GetComponent<RectTransform>();
            closeRt.anchorMin = new Vector2(1f, 1f);
            closeRt.anchorMax = new Vector2(1f, 1f);
            closeRt.pivot = new Vector2(1f, 1f);
            closeRt.anchoredPosition = new Vector2(-12f, -12f);
            closeRt.sizeDelta = new Vector2(138f, 34f);

            // ScrollRect
            var scrollGo = new GameObject("LogScrollView", typeof(RectTransform), typeof(Image), typeof(RectMask2D), typeof(ScrollRect));
            scrollGo.transform.SetParent(innerRt, false);
            var scrollRt = scrollGo.GetComponent<RectTransform>();
            scrollRt.anchorMin = Vector2.zero;
            scrollRt.anchorMax = Vector2.one;
            scrollRt.offsetMin = new Vector2(12f, 14f);
            scrollRt.offsetMax = new Vector2(-12f, -56f);
            scrollGo.GetComponent<Image>().color = new Color(0.03f, 0.025f, 0.02f, 0.72f);

            var contentGo = new GameObject("LogContent", typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
            contentGo.transform.SetParent(scrollRt, false);
            _logContentRect = contentGo.GetComponent<RectTransform>();
            _logContentRect.anchorMin = new Vector2(0f, 1f);
            _logContentRect.anchorMax = new Vector2(1f, 1f);
            _logContentRect.pivot = new Vector2(0.5f, 1f);
            _logContentRect.anchoredPosition = Vector2.zero;
            _logContentRect.sizeDelta = new Vector2(0f, 0f);

            var layout = contentGo.GetComponent<VerticalLayoutGroup>();
            layout.padding = new RectOffset(10, 10, 8, 8);
            layout.spacing = 6f;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;

            var fitter = contentGo.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            _logScrollRect = scrollGo.GetComponent<ScrollRect>();
            _logScrollRect.viewport = scrollRt;
            _logScrollRect.content = _logContentRect;
            _logScrollRect.horizontal = false;
            _logScrollRect.vertical = true;
            _logScrollRect.scrollSensitivity = 28f;
        }

        private void CreateLogLineEntry(string text)
        {
            if (_logContentRect == null) return;
            var lineGo = new GameObject($"LogLine_{_logLineViews.Count}", typeof(RectTransform), typeof(TextMeshProUGUI));
            lineGo.transform.SetParent(_logContentRect, false);

            var tmp = lineGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) tmp.font = _sansFont;
            tmp.fontSize = 15f;
            tmp.color = new Color(0.92f, 0.88f, 0.78f, 1f);
            tmp.alignment = TextAlignmentOptions.TopLeft;
            tmp.textWrappingMode = TextWrappingModes.Normal;
            tmp.text = text;
            tmp.raycastTarget = false;

            _logLineViews.Add(tmp);
        }

        private void BuildSettingsModal()
        {
            _settingsModalObj = new GameObject("SettingsModal", typeof(RectTransform), typeof(Image));
            _settingsModalObj.transform.SetParent(_rootRect, false);
            var backdropRt = _settingsModalObj.GetComponent<RectTransform>();
            StretchFull(backdropRt, 0f, 0f);
            var backdropImg = _settingsModalObj.GetComponent<Image>();
            backdropImg.color = new Color(0.02f, 0.015f, 0.015f, 0.68f);

            var panelGo = new GameObject("SettingsPanel", typeof(RectTransform), typeof(Image));
            panelGo.transform.SetParent(backdropRt, false);
            var panelRt = panelGo.GetComponent<RectTransform>();
            panelRt.anchorMin = new Vector2(0.5f, 0.5f);
            panelRt.anchorMax = new Vector2(0.5f, 0.5f);
            panelRt.sizeDelta = new Vector2(460f, 354f);
            panelGo.GetComponent<Image>().color = BronzeBorderColor;

            var innerGo = new GameObject("SettingsInner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(panelRt, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            StretchFull(innerRt, 2f, 2f);
            innerGo.GetComponent<Image>().color = ObsidianPanelColor;

            var titleGo = new GameObject("SettingsTitle", typeof(RectTransform), typeof(TextMeshProUGUI));
            titleGo.transform.SetParent(innerRt, false);
            var titleRt = titleGo.GetComponent<RectTransform>();
            titleRt.anchorMin = new Vector2(0f, 1f);
            titleRt.anchorMax = new Vector2(1f, 1f);
            titleRt.pivot = new Vector2(0.5f, 1f);
            titleRt.anchoredPosition = new Vector2(0f, -18f);
            titleRt.sizeDelta = new Vector2(-36f, 36f);
            var titleTmp = titleGo.GetComponent<TextMeshProUGUI>();
            if (_serifFont != null) titleTmp.font = _serifFont;
            titleTmp.fontSize = 21f;
            titleTmp.fontStyle = FontStyles.Bold;
            titleTmp.color = GoldIvoryColor;
            titleTmp.alignment = TextAlignmentOptions.MidlineLeft;
            titleTmp.text = "Cài Đặt Âm Thanh & Tiện Ích";

            _muteToggle = CreateOptionToggle(
                "MuteToggle",
                innerRt,
                "Tắt toàn bộ âm thanh (Nhạc nền & Hiệu ứng)",
                new Vector2(0f, 70f),
                SetMuted);

            _reducedMotionToggle = CreateOptionToggle(
                "ReducedMotionToggle",
                innerRt,
                "Giảm chuyển động (Tắt rung bàn & xoay vòng ngắm)",
                new Vector2(0f, 14f),
                SetReducedMotion);

            var refBtn = CreateTextButton("OpenRefereeBtn", innerRt, "Bảng Trọng Tài (F2)", 15f, () =>
            {
                _settingsModalObj.SetActive(false);
                OnOpenRefereeRequested?.Invoke();
            });
            var refRt = refBtn.GetComponent<RectTransform>();
            refRt.anchorMin = new Vector2(0.5f, 0.5f);
            refRt.anchorMax = new Vector2(0.5f, 0.5f);
            refRt.anchoredPosition = new Vector2(-104f, -48f);
            refRt.sizeDelta = new Vector2(196f, 42f);

            var bookBtn = CreateTextButton("OpenHandbookBtn", innerRt, "Sổ Tay Cửu Châu (Tab)", 15f, () =>
            {
                _settingsModalObj.SetActive(false);
                OnOpenHandbookRequested?.Invoke();
            });
            var bookRt = bookBtn.GetComponent<RectTransform>();
            bookRt.anchorMin = new Vector2(0.5f, 0.5f);
            bookRt.anchorMax = new Vector2(0.5f, 0.5f);
            bookRt.anchoredPosition = new Vector2(104f, -48f);
            bookRt.sizeDelta = new Vector2(196f, 42f);

            var closeBtn = CreateTextButton("CloseSettingsBtn", innerRt, "Đóng Cài Đặt", 16f, () =>
            {
                _settingsModalObj.SetActive(false);
            });
            var closeRt = closeBtn.GetComponent<RectTransform>();
            closeRt.anchorMin = new Vector2(0.5f, 0f);
            closeRt.anchorMax = new Vector2(0.5f, 0f);
            closeRt.pivot = new Vector2(0.5f, 0f);
            closeRt.anchoredPosition = new Vector2(0f, 18f);
            closeRt.sizeDelta = new Vector2(190f, 44f);

            _settingsModalObj.SetActive(false);
        }

        private Toggle CreateOptionToggle(string name, Transform parent, string labelText, Vector2 pos, Action<bool> onChanged)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Toggle));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = new Vector2(400f, 44f);

            var boxGo = new GameObject("CheckBoxBg", typeof(RectTransform), typeof(Image));
            boxGo.transform.SetParent(rt, false);
            var boxRt = boxGo.GetComponent<RectTransform>();
            boxRt.anchorMin = new Vector2(0f, 0.5f);
            boxRt.anchorMax = new Vector2(0f, 0.5f);
            boxRt.pivot = new Vector2(0f, 0.5f);
            boxRt.anchoredPosition = Vector2.zero;
            boxRt.sizeDelta = new Vector2(28f, 28f);
            var boxImg = boxGo.GetComponent<Image>();
            boxImg.color = new Color(0.16f, 0.14f, 0.11f, 1f);

            var checkGo = new GameObject("Checkmark", typeof(RectTransform), typeof(Image));
            checkGo.transform.SetParent(boxRt, false);
            StretchFull(checkGo.GetComponent<RectTransform>(), 5f, 5f);
            var checkImg = checkGo.GetComponent<Image>();
            checkImg.color = new Color(0.86f, 0.68f, 0.30f, 1f);

            var labelGo = new GameObject("Label", typeof(RectTransform), typeof(TextMeshProUGUI));
            labelGo.transform.SetParent(rt, false);
            var labelRt = labelGo.GetComponent<RectTransform>();
            labelRt.anchorMin = Vector2.zero;
            labelRt.anchorMax = Vector2.one;
            labelRt.offsetMin = new Vector2(40f, 0f);
            labelRt.offsetMax = Vector2.zero;
            var tmp = labelGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) tmp.font = _sansFont;
            tmp.fontSize = 15f;
            tmp.color = new Color(0.94f, 0.90f, 0.82f, 1f);
            tmp.alignment = TextAlignmentOptions.MidlineLeft;
            tmp.text = labelText;

            var toggle = go.GetComponent<Toggle>();
            toggle.targetGraphic = boxImg;
            toggle.graphic = checkImg;
            toggle.isOn = false;
            toggle.onValueChanged.AddListener(val => onChanged?.Invoke(val));
            return toggle;
        }

        private Button CreateTextButton(string name, Transform parent, string label, float fontSize, Action onClick)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var bg = go.GetComponent<Image>();
            bg.color = new Color(0.24f, 0.16f, 0.11f, 0.96f);

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = bg;
            btn.onClick.AddListener(() => onClick?.Invoke());

            var textGo = new GameObject("Label", typeof(RectTransform), typeof(TextMeshProUGUI));
            textGo.transform.SetParent(go.transform, false);
            StretchFull(textGo.GetComponent<RectTransform>(), 6f, 2f);
            var tmp = textGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) tmp.font = _sansFont;
            tmp.fontSize = Mathf.Max(15f, fontSize);
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = GoldIvoryColor;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.text = label;
            tmp.raycastTarget = false;

            return btn;
        }

        private void ToggleBattleLogDrawer()
        {
            _logDrawerOpen = !_logDrawerOpen;
        }

        private void ToggleSettingsModal()
        {
            if (_settingsModalObj != null)
            {
                _settingsModalObj.SetActive(!_settingsModalObj.activeSelf);
            }
        }

        private static void StretchFull(RectTransform rt, float insetX, float insetY)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(insetX, insetY);
            rt.offsetMax = new Vector2(-insetX, -insetY);
        }
    }
}
