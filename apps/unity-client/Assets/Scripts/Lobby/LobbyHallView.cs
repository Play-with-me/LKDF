using System;
using CuuChau.Data;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Lobby
{
    /// <summary>
    /// Sảnh Đại Điện 100% uGUI + TMPro cho Cửu Châu Ẩn Kiếm (Cổ Thư & Gỗ Mun Cách 2).
    /// Gồm: Tiêu đề, ô Biệt danh (2–20 ký tự, PlayerPrefs), thanh trạng thái máy chủ ngầm + Thử lại,
    /// nút mở Sổ Tay Cửu Châu và 3 Lệnh Bài Chính (Đấu Với Máy, Mở Bàn LAN/VPN, Vào Phòng Bạn Bè).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class LobbyHallView : MonoBehaviour
    {
        private const string DisplayNamePrefsKey = "CuuChau.Lobby.DisplayName";
        private const string DefaultDisplayName = "Hiệp Khách";
        private const string DefaultLocalBaseUrl = "http://127.0.0.1:3001";

        private static readonly Color BackdropObsidian = new(0.035f, 0.030f, 0.026f, 0.96f);
        private static readonly Color PanelObsidian = new(0.055f, 0.045f, 0.038f, 0.94f);
        private static readonly Color SubSurfaceObsidian = new(0.085f, 0.070f, 0.058f, 0.96f);
        private static readonly Color BronzeBorderColor = new(0.722f, 0.561f, 0.278f, 1f); // #B88F47
        private static readonly Color GoldIvoryColor = new(0.961f, 0.890f, 0.671f, 1f);    // #F5E3AB
        private static readonly Color MutedGoldColor = new(0.820f, 0.725f, 0.506f, 1f);
        private static readonly Color WarmWhiteColor = new(1.000f, 0.961f, 0.878f, 1f);
        private static readonly Color CinnabarFallback = new(0.620f, 0.169f, 0.145f, 0.98f);
        private static readonly Color ReadyGreenColor = new(0.18f, 0.72f, 0.36f, 1f);
        private static readonly Color WaitingAmberColor = new(0.88f, 0.56f, 0.16f, 1f);
        private static readonly Color ErrorCrimsonColor = new(0.88f, 0.27f, 0.24f, 1f);

        private static readonly int[] SoloSeatOptions = { 4, 5, 6, 8 };

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private RectTransform _rootRect;
        private Image _backdropArtImage;
        private bool _initialized;

        // Header & Profile & Server Status
        private TMP_InputField _displayNameInput;
        private TextMeshProUGUI _displayNameHintText;
        private Image _serverStatusDot;
        private TextMeshProUGUI _serverStatusText;
        private Button _retrySidecarBtn;
        private Button _handbookBtn;

        // Card 1: Solo vs Bots
        private readonly Button[] _soloSeatButtons = new Button[SoloSeatOptions.Length];
        private readonly Image[] _soloSeatButtonBgs = new Image[SoloSeatOptions.Length];
        private readonly Image[] _soloSeatButtonBorders = new Image[SoloSeatOptions.Length];
        private readonly TextMeshProUGUI[] _soloSeatButtonLabels = new TextMeshProUGUI[SoloSeatOptions.Length];
        private TextMeshProUGUI _soloSummaryText;
        private Button _playSoloBtn;
        private TextMeshProUGUI _playSoloLabel;
        private int _selectedSoloSeats = 4;

        // Card 2: Host LAN
        private Button _hostLanBtn;
        private TextMeshProUGUI _hostLanLabel;

        // Card 3: Join Room
        private TMP_InputField _inviteInput;
        private TextMeshProUGUI _joinErrorText;
        private Button _joinRoomBtn;
        private TextMeshProUGUI _joinRoomLabel;

        // Busy Overlay
        private GameObject _busyOverlayObj;
        private TextMeshProUGUI _busyLabelText;
        private bool _isBusy;

        public event Action<int, string> OnPlaySoloRequested;
        public event Action<string> OnHostLanRequested;
        public event Action<string, string, string> OnJoinRoomRequested;
        public event Action OnOpenHandbookRequested;
        public event Action OnRetrySidecarRequested;

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

            if (_initialized)
            {
                RefreshCatalogSprites();
                return;
            }

            _rootRect = transform as RectTransform;
            if (_rootRect == null) _rootRect = gameObject.AddComponent<RectTransform>();
            StretchFull(_rootRect, 0f, 0f);

            BuildBackdrop();
            RectTransform safeFrame = BuildSafeFrame();
            BuildTopSection(safeFrame);
            BuildCommandPlaquesRow(safeFrame);
            BuildBusyOverlay(safeFrame);
            _initialized = true;

            LoadDisplayNameFromPrefs();
            SelectSoloSeats(4);
            SetServerStatus(false, "Đang khởi động máy chủ ngầm...", canRetry: false);
            SetBusy(false);
        }

        public void SetVisible(bool visible)
        {
            if (visible && !_initialized)
            {
                InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            }
            gameObject.SetActive(visible);
        }

        public void SetServerStatus(bool ready, string statusText, bool canRetry = false)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            if (_serverStatusDot != null)
            {
                _serverStatusDot.color = ready
                    ? ReadyGreenColor
                    : (canRetry ? ErrorCrimsonColor : WaitingAmberColor);
            }

            if (_serverStatusText != null)
            {
                _serverStatusText.text = string.IsNullOrWhiteSpace(statusText)
                    ? (ready ? "Máy chủ 112 lá sẵn sàng" : "Đang khởi động máy chủ ngầm...")
                    : statusText;
                _serverStatusText.color = canRetry ? ErrorCrimsonColor : (ready ? GoldIvoryColor : MutedGoldColor);
            }

            if (_retrySidecarBtn != null)
            {
                _retrySidecarBtn.gameObject.SetActive(canRetry);
            }
        }

        public void SetBusy(bool busy, string busyLabel = null)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            _isBusy = busy;
            if (_busyOverlayObj != null)
            {
                _busyOverlayObj.SetActive(busy);
            }
            if (_busyLabelText != null)
            {
                _busyLabelText.text = string.IsNullOrWhiteSpace(busyLabel)
                    ? "Đang kết nối chiến trường..."
                    : busyLabel;
            }

            bool controlsEnabled = !busy;
            if (_displayNameInput != null) _displayNameInput.interactable = controlsEnabled;
            if (_inviteInput != null) _inviteInput.interactable = controlsEnabled;
            if (_playSoloBtn != null) _playSoloBtn.interactable = controlsEnabled;
            if (_hostLanBtn != null) _hostLanBtn.interactable = controlsEnabled;
            if (_joinRoomBtn != null) _joinRoomBtn.interactable = controlsEnabled;
            if (_handbookBtn != null) _handbookBtn.interactable = controlsEnabled;
            if (_retrySidecarBtn != null) _retrySidecarBtn.interactable = controlsEnabled;
            for (int i = 0; i < _soloSeatButtons.Length; i++)
            {
                if (_soloSeatButtons[i] != null) _soloSeatButtons[i].interactable = controlsEnabled;
            }
        }

        public void PopulateDemoPreview()
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            if (_displayNameInput != null)
            {
                _displayNameInput.SetTextWithoutNotify("Lâm Thanh Vũ");
            }
            ClearDisplayNameError();

            if (_inviteInput != null)
            {
                _inviteInput.SetTextWithoutNotify("192.168.1.5:3001#K9M2P4");
            }
            ClearJoinError();

            SelectSoloSeats(4);
            SetServerStatus(true, "Máy chủ 112 lá sẵn sàng · Cổng 3001", canRetry: false);
            SetBusy(false);
        }

        public static bool ParseInviteInput(
            string raw,
            string defaultBaseUrl,
            out string resolvedBaseUrl,
            out string roomCode)
        {
            resolvedBaseUrl = string.Empty;
            roomCode = string.Empty;

            if (string.IsNullOrWhiteSpace(raw)) return false;

            string trimmed = raw.Trim();
            string fallbackBase = NormalizeBaseUrl(string.IsNullOrWhiteSpace(defaultBaseUrl) ? DefaultLocalBaseUrl : defaultBaseUrl);
            if (string.IsNullOrEmpty(fallbackBase)) fallbackBase = DefaultLocalBaseUrl;

            int hashIdx = trimmed.IndexOf('#');
            if (hashIdx >= 0)
            {
                string rawHostPart = trimmed.Substring(0, hashIdx).Trim();
                string rawCodePart = trimmed.Substring(hashIdx + 1).Trim();
                if (!TryNormalizeRoomCode(rawCodePart, out roomCode)) return false;

                if (string.IsNullOrEmpty(rawHostPart))
                {
                    resolvedBaseUrl = fallbackBase;
                    return true;
                }

                string normalizedUrl = NormalizeBaseUrl(rawHostPart);
                if (string.IsNullOrEmpty(normalizedUrl)) return false;

                resolvedBaseUrl = normalizedUrl;
                return true;
            }

            if (TryNormalizeRoomCode(trimmed, out roomCode))
            {
                resolvedBaseUrl = fallbackBase;
                return true;
            }

            return false;
        }

        private static bool TryNormalizeRoomCode(string rawCode, out string normalizedCode)
        {
            normalizedCode = string.Empty;
            if (string.IsNullOrWhiteSpace(rawCode)) return false;

            string candidate = rawCode.Trim().ToUpperInvariant();
            if (candidate.Length < 4 || candidate.Length > 12) return false;

            for (int i = 0; i < candidate.Length; i++)
            {
                char c = candidate[i];
                bool isAlphaNum = (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
                if (!isAlphaNum) return false;
            }

            normalizedCode = candidate;
            return true;
        }

        private static string NormalizeBaseUrl(string rawUrl)
        {
            if (string.IsNullOrWhiteSpace(rawUrl)) return string.Empty;
            string cleaned = rawUrl.Trim().TrimEnd('/');
            if (!cleaned.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !cleaned.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                cleaned = "http://" + cleaned;
            }

            if (!Uri.TryCreate(cleaned, UriKind.Absolute, out Uri uri)) return string.Empty;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return string.Empty;
            if (string.IsNullOrWhiteSpace(uri.Host)) return string.Empty;

            return uri.IsDefaultPort
                ? $"{uri.Scheme}://{uri.Host}"
                : $"{uri.Scheme}://{uri.Authority}";
        }

        private void BuildBackdrop()
        {
            var bgGo = new GameObject("LobbyBackdrop", typeof(RectTransform), typeof(Image));
            bgGo.transform.SetParent(_rootRect, false);
            StretchFull(bgGo.GetComponent<RectTransform>(), 0f, 0f);
            var bgImg = bgGo.GetComponent<Image>();
            bgImg.color = BackdropObsidian;
            bgImg.raycastTarget = true;

            var texGo = new GameObject("LobbyBackdropArt", typeof(RectTransform), typeof(Image));
            texGo.transform.SetParent(_rootRect, false);
            StretchFull(texGo.GetComponent<RectTransform>(), 0f, 0f);
            _backdropArtImage = texGo.GetComponent<Image>();
            _backdropArtImage.preserveAspect = false;
            _backdropArtImage.color = new Color(0.62f, 0.56f, 0.48f, 0.52f);
            _backdropArtImage.raycastTarget = false;
            ApplyBackdropSprite();
        }

        private void ApplyBackdropSprite()
        {
            if (_backdropArtImage == null) return;
            Sprite sprite = _catalog != null
                ? (_catalog.lobbyHallBackdrop != null ? _catalog.lobbyHallBackdrop : _catalog.tableBoard25D)
                : null;
            _backdropArtImage.sprite = sprite;
            _backdropArtImage.color = new Color(0.62f, 0.56f, 0.48f, 0.52f);
            _backdropArtImage.enabled = sprite != null;
        }

        private RectTransform BuildSafeFrame()
        {
            var frameGo = new GameObject("LobbySafeFrame", typeof(RectTransform));
            frameGo.transform.SetParent(_rootRect, false);
            var rt = frameGo.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.04f, 0.05f);
            rt.anchorMax = new Vector2(0.96f, 0.95f);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            return rt;
        }

        private void BuildTopSection(RectTransform safeFrame)
        {
            var topBar = CreateBorderedPanel("TopHeaderPlaque", safeFrame, PanelObsidian, BronzeBorderColor, 2f);
            var topRt = topBar.GetComponent<RectTransform>();
            topRt.anchorMin = new Vector2(0f, 0.66f);
            topRt.anchorMax = new Vector2(1f, 1f);
            topRt.offsetMin = Vector2.zero;
            topRt.offsetMax = Vector2.zero;

            Transform inner = topBar.transform.GetChild(0);

            // Left Column: Brand Title + Server Status Bar + Handbook button
            var leftColGo = new GameObject("LeftTitleAndStatus", typeof(RectTransform));
            leftColGo.transform.SetParent(inner, false);
            var leftColRt = leftColGo.GetComponent<RectTransform>();
            leftColRt.anchorMin = new Vector2(0f, 0f);
            leftColRt.anchorMax = new Vector2(0.58f, 1f);
            leftColRt.offsetMin = new Vector2(28f, 20f);
            leftColRt.offsetMax = new Vector2(-16f, -20f);

            var titleTmp = CreateLabel(
                "MainTitle",
                leftColRt,
                "CỬU CHÂU ẨN KIẾM",
                44f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _serifFont);
            var titleRt = titleTmp.rectTransform;
            titleRt.anchorMin = new Vector2(0f, 0.60f);
            titleRt.anchorMax = new Vector2(1f, 1f);
            titleRt.offsetMin = Vector2.zero;
            titleRt.offsetMax = Vector2.zero;

            var subTmp = CreateLabel(
                "MainSubtitle",
                leftColRt,
                "Sảnh Đại Điện · Đấu Trường Thẻ Bài Chiến Thuật 4–8 Người",
                16f,
                FontStyles.Normal,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var subRt = subTmp.rectTransform;
            subRt.anchorMin = new Vector2(0f, 0.42f);
            subRt.anchorMax = new Vector2(1f, 0.60f);
            subRt.offsetMin = Vector2.zero;
            subRt.offsetMax = Vector2.zero;

            // Server Status Bar
            var statusRowGo = new GameObject("ServerStatusRow", typeof(RectTransform), typeof(Image));
            statusRowGo.transform.SetParent(leftColRt, false);
            var statusRowRt = statusRowGo.GetComponent<RectTransform>();
            statusRowRt.anchorMin = new Vector2(0f, 0.04f);
            statusRowRt.anchorMax = new Vector2(0.72f, 0.34f);
            statusRowRt.offsetMin = Vector2.zero;
            statusRowRt.offsetMax = Vector2.zero;
            statusRowGo.GetComponent<Image>().color = SubSurfaceObsidian;

            var dotGo = new GameObject("StatusDot", typeof(RectTransform), typeof(Image));
            dotGo.transform.SetParent(statusRowRt, false);
            var dotRt = dotGo.GetComponent<RectTransform>();
            dotRt.anchorMin = new Vector2(0f, 0.5f);
            dotRt.anchorMax = new Vector2(0f, 0.5f);
            dotRt.pivot = new Vector2(0f, 0.5f);
            dotRt.anchoredPosition = new Vector2(16f, 0f);
            dotRt.sizeDelta = new Vector2(14f, 14f);
            _serverStatusDot = dotGo.GetComponent<Image>();
            _serverStatusDot.color = WaitingAmberColor;
            _serverStatusDot.raycastTarget = false;

            _serverStatusText = CreateLabel(
                "ServerStatusText",
                statusRowRt,
                "Đang khởi động máy chủ ngầm...",
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var statusTextRt = _serverStatusText.rectTransform;
            statusTextRt.anchorMin = new Vector2(0f, 0f);
            statusTextRt.anchorMax = new Vector2(1f, 1f);
            statusTextRt.offsetMin = new Vector2(40f, 4f);
            statusTextRt.offsetMax = new Vector2(-128f, -4f);

            _retrySidecarBtn = CreateSecondaryButton(
                "RetrySidecarButton",
                statusRowRt,
                "Thử lại",
                15f,
                () =>
                {
                    if (!_isBusy) OnRetrySidecarRequested?.Invoke();
                });
            var retryRt = _retrySidecarBtn.GetComponent<RectTransform>();
            retryRt.anchorMin = new Vector2(1f, 0.12f);
            retryRt.anchorMax = new Vector2(1f, 0.88f);
            retryRt.pivot = new Vector2(1f, 0.5f);
            retryRt.anchoredPosition = new Vector2(-10f, 0f);
            retryRt.sizeDelta = new Vector2(110f, 0f);
            _retrySidecarBtn.gameObject.SetActive(false);

            // Compact Secondary Button: Sổ Tay Cửu Châu
            _handbookBtn = CreateSecondaryButton(
                "HandbookButton",
                leftColRt,
                "Sổ Tay Cửu Châu",
                15f,
                () =>
                {
                    if (!_isBusy) OnOpenHandbookRequested?.Invoke();
                });
            var handbookRt = _handbookBtn.GetComponent<RectTransform>();
            handbookRt.anchorMin = new Vector2(0.74f, 0.04f);
            handbookRt.anchorMax = new Vector2(1f, 0.34f);
            handbookRt.offsetMin = Vector2.zero;
            handbookRt.offsetMax = Vector2.zero;

            // Right Column: Display Name Card
            var rightColGo = new GameObject("RightDisplayNameBox", typeof(RectTransform), typeof(Image));
            rightColGo.transform.SetParent(inner, false);
            var rightColRt = rightColGo.GetComponent<RectTransform>();
            rightColRt.anchorMin = new Vector2(0.60f, 0.08f);
            rightColRt.anchorMax = new Vector2(1f, 0.92f);
            rightColRt.offsetMin = new Vector2(12f, 12f);
            rightColRt.offsetMax = new Vector2(-28f, -12f);
            rightColGo.GetComponent<Image>().color = SubSurfaceObsidian;

            var nameHeader = CreateLabel(
                "DisplayNameHeader",
                rightColRt,
                "BIỆT DANH HIỆP KHÁCH (2–20 KÝ TỰ)",
                15f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var nameHeaderRt = nameHeader.rectTransform;
            nameHeaderRt.anchorMin = new Vector2(0f, 0.68f);
            nameHeaderRt.anchorMax = new Vector2(1f, 0.96f);
            nameHeaderRt.offsetMin = new Vector2(20f, 0f);
            nameHeaderRt.offsetMax = new Vector2(-20f, 0f);

            _displayNameInput = CreateInputField(
                "DisplayNameInput",
                rightColRt,
                "Nhập biệt danh của bạn (2–20 ký tự)...",
                _sansFont,
                18f,
                20);
            var nameInputRt = _displayNameInput.GetComponent<RectTransform>();
            nameInputRt.anchorMin = new Vector2(0f, 0.28f);
            nameInputRt.anchorMax = new Vector2(1f, 0.66f);
            nameInputRt.offsetMin = new Vector2(20f, 0f);
            nameInputRt.offsetMax = new Vector2(-20f, 0f);
            _displayNameInput.onEndEdit.AddListener(HandleDisplayNameEndEdit);
            _displayNameInput.onValueChanged.AddListener(_ => ClearDisplayNameError());

            _displayNameHintText = CreateLabel(
                "DisplayNameHint",
                rightColRt,
                "Tên hiển thị trên bàn đấu và lưu tự động trên máy.",
                15f,
                FontStyles.Normal,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var hintRt = _displayNameHintText.rectTransform;
            hintRt.anchorMin = new Vector2(0f, 0.04f);
            hintRt.anchorMax = new Vector2(1f, 0.26f);
            hintRt.offsetMin = new Vector2(20f, 0f);
            hintRt.offsetMax = new Vector2(-20f, 0f);
        }

        private void BuildCommandPlaquesRow(RectTransform safeFrame)
        {
            var rowGo = new GameObject("CommandPlaquesRow", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            rowGo.transform.SetParent(safeFrame, false);
            var rowRt = rowGo.GetComponent<RectTransform>();
            rowRt.anchorMin = new Vector2(0f, 0f);
            rowRt.anchorMax = new Vector2(1f, 0.63f);
            rowRt.offsetMin = Vector2.zero;
            rowRt.offsetMax = Vector2.zero;

            var hlg = rowGo.GetComponent<HorizontalLayoutGroup>();
            hlg.spacing = 24f;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;

            BuildSoloPlaque(rowRt);
            BuildHostLanPlaque(rowRt);
            BuildJoinFriendPlaque(rowRt);
        }

        private void BuildSoloPlaque(RectTransform parent)
        {
            RectTransform inner = CreateCommandPlaqueShell("Plaque_SoloOffline", parent, "CHẾ ĐỘ ĐƠN · OFFLINE 112 LÁ", "ĐẤU VỚI MÁY (OFFLINE 112 LÁ)",
                "Vào trận luyện tập tức thì cùng các tướng AI chuẩn bộ bài 112 lá. Lưu tiến trình tại máy.");

            // Seat Count Row (4, 5, 6, 8)
            var seatLabel = CreateLabel(
                "SoloSeatLabel",
                inner,
                "Chọn số ghế bàn đấu:",
                15f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var seatLabelRt = seatLabel.rectTransform;
            seatLabelRt.anchorMin = new Vector2(0f, 0.44f);
            seatLabelRt.anchorMax = new Vector2(1f, 0.54f);
            seatLabelRt.offsetMin = new Vector2(28f, 0f);
            seatLabelRt.offsetMax = new Vector2(-28f, 0f);

            var seatRowGo = new GameObject("SoloSeatSelectorRow", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            seatRowGo.transform.SetParent(inner, false);
            var seatRowRt = seatRowGo.GetComponent<RectTransform>();
            seatRowRt.anchorMin = new Vector2(0f, 0.30f);
            seatRowRt.anchorMax = new Vector2(1f, 0.43f);
            seatRowRt.offsetMin = new Vector2(28f, 0f);
            seatRowRt.offsetMax = new Vector2(-28f, 0f);

            var seatHlg = seatRowGo.GetComponent<HorizontalLayoutGroup>();
            seatHlg.spacing = 10f;
            seatHlg.childControlWidth = true;
            seatHlg.childControlHeight = true;
            seatHlg.childForceExpandWidth = true;
            seatHlg.childForceExpandHeight = true;

            for (int i = 0; i < SoloSeatOptions.Length; i++)
            {
                int seats = SoloSeatOptions[i];
                var btnShell = CreateSelectableChipButton(
                    $"SeatOption_{seats}",
                    seatRowRt,
                    $"{seats} Ghế",
                    16f,
                    out Image bgImg,
                    out Image borderImg,
                    out TextMeshProUGUI labelTmp,
                    () => SelectSoloSeats(seats));

                _soloSeatButtons[i] = btnShell;
                _soloSeatButtonBgs[i] = bgImg;
                _soloSeatButtonBorders[i] = borderImg;
                _soloSeatButtonLabels[i] = labelTmp;
            }

            _soloSummaryText = CreateLabel(
                "SoloSummaryText",
                inner,
                "Bàn 4 ghế · 1 Hiệp khách và 3 Máy AI",
                15f,
                FontStyles.Normal,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var summaryRt = _soloSummaryText.rectTransform;
            summaryRt.anchorMin = new Vector2(0f, 0.20f);
            summaryRt.anchorMax = new Vector2(1f, 0.29f);
            summaryRt.offsetMin = new Vector2(28f, 0f);
            summaryRt.offsetMax = new Vector2(-28f, 0f);

            _playSoloBtn = CreatePrimaryCinnabarButton(
                "PlaySoloButton",
                inner,
                "Vào Trận Với Máy · XP",
                out _playSoloLabel,
                HandlePlaySoloClicked);
            var btnRt = _playSoloBtn.GetComponent<RectTransform>();
            btnRt.anchorMin = new Vector2(0f, 0.04f);
            btnRt.anchorMax = new Vector2(1f, 0.18f);
            btnRt.offsetMin = new Vector2(24f, 0f);
            btnRt.offsetMax = new Vector2(-24f, 0f);
        }

        private void BuildHostLanPlaque(RectTransform parent)
        {
            RectTransform inner = CreateCommandPlaqueShell("Plaque_HostLan", parent, "CHỦ PHÒNG · LAN / VPN", "MỞ BÀN LAN / VPN (CHỦ PHÒNG)",
                "Tạo phòng đa người qua mạng nội bộ LAN, Radmin VPN hoặc Tailscale để bạn bè cùng kết nối.");

            var infoBox = new GameObject("LanFeatureBox", typeof(RectTransform), typeof(Image));
            infoBox.transform.SetParent(inner, false);
            var infoRt = infoBox.GetComponent<RectTransform>();
            infoRt.anchorMin = new Vector2(0f, 0.22f);
            infoRt.anchorMax = new Vector2(1f, 0.52f);
            infoRt.offsetMin = new Vector2(28f, 0f);
            infoRt.offsetMax = new Vector2(-28f, 0f);
            infoBox.GetComponent<Image>().color = SubSurfaceObsidian;

            var infoTmp = CreateLabel(
                "LanFeatureText",
                infoRt,
                "· Tự động cấp Mã phòng và Địa chỉ mời LAN (IP:Port#Mã).\n· Chủ phòng có quyền Thêm Máy Đủ Bàn 4, 5, 6 hoặc 8 ghế.\n· Toàn quyền Trọng Tài: Tạm dừng, Hoàn tác và Bỏ qua pha.",
                15f,
                FontStyles.Normal,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            infoTmp.textWrappingMode = TextWrappingModes.Normal;
            StretchFull(infoTmp.rectTransform, 16f, 10f);

            _hostLanBtn = CreatePrimaryCinnabarButton(
                "HostLanButton",
                inner,
                "Tạo Bàn LAN Ngay",
                out _hostLanLabel,
                HandleHostLanClicked);
            var btnRt = _hostLanBtn.GetComponent<RectTransform>();
            btnRt.anchorMin = new Vector2(0f, 0.04f);
            btnRt.anchorMax = new Vector2(1f, 0.18f);
            btnRt.offsetMin = new Vector2(24f, 0f);
            btnRt.offsetMax = new Vector2(-24f, 0f);
        }

        private void BuildJoinFriendPlaque(RectTransform parent)
        {
            RectTransform inner = CreateCommandPlaqueShell("Plaque_JoinRoom", parent, "THAM GIA · MÃ MỜI THÔNG MINH", "VÀO PHÒNG BẠN BÈ",
                "Dán chuỗi mời của Chủ phòng (IP:Port#MÃPHÒNG) hoặc nhập trực tiếp 6 ký tự Mã phòng.");

            var inputLabel = CreateLabel(
                "InviteInputLabel",
                inner,
                "Địa chỉ mời hoặc Mã phòng:",
                15f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var inputLabelRt = inputLabel.rectTransform;
            inputLabelRt.anchorMin = new Vector2(0f, 0.44f);
            inputLabelRt.anchorMax = new Vector2(1f, 0.54f);
            inputLabelRt.offsetMin = new Vector2(28f, 0f);
            inputLabelRt.offsetMax = new Vector2(-28f, 0f);

            _inviteInput = CreateInputField(
                "SmartInviteInput",
                inner,
                "192.168.1.5:3001#AB12CD hoặc AB12CD",
                _monoFont ?? _sansFont,
                17f,
                96);
            var inviteRt = _inviteInput.GetComponent<RectTransform>();
            inviteRt.anchorMin = new Vector2(0f, 0.30f);
            inviteRt.anchorMax = new Vector2(1f, 0.43f);
            inviteRt.offsetMin = new Vector2(28f, 0f);
            inviteRt.offsetMax = new Vector2(-28f, 0f);
            _inviteInput.onValueChanged.AddListener(_ => ClearJoinError());

            _joinErrorText = CreateLabel(
                "JoinErrorText",
                inner,
                "Hỗ trợ IP:Port#Mã, http://...#Mã hoặc 6 ký tự Mã phòng.",
                15f,
                FontStyles.Normal,
                MutedGoldColor,
                TextAlignmentOptions.TopLeft,
                _sansFont);
            _joinErrorText.textWrappingMode = TextWrappingModes.Normal;
            var errRt = _joinErrorText.rectTransform;
            errRt.anchorMin = new Vector2(0f, 0.19f);
            errRt.anchorMax = new Vector2(1f, 0.29f);
            errRt.offsetMin = new Vector2(28f, 0f);
            errRt.offsetMax = new Vector2(-28f, 0f);

            _joinRoomBtn = CreatePrimaryCinnabarButton(
                "JoinRoomButton",
                inner,
                "Vào Phòng Bạn Bè",
                out _joinRoomLabel,
                HandleJoinRoomClicked);
            var btnRt = _joinRoomBtn.GetComponent<RectTransform>();
            btnRt.anchorMin = new Vector2(0f, 0.04f);
            btnRt.anchorMax = new Vector2(1f, 0.18f);
            btnRt.offsetMin = new Vector2(24f, 0f);
            btnRt.offsetMax = new Vector2(-24f, 0f);
        }

        private RectTransform CreateCommandPlaqueShell(
            string name,
            RectTransform parent,
            string badgeText,
            string titleText,
            string descText)
        {
            var outerGo = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            outerGo.transform.SetParent(parent, false);

            var le = outerGo.GetComponent<LayoutElement>();
            le.flexibleWidth = 1f;
            le.flexibleHeight = 1f;
            le.minWidth = 360f;

            var outerImg = outerGo.GetComponent<Image>();
            outerImg.color = BronzeBorderColor;
            outerImg.raycastTarget = true;

            var innerGo = new GameObject("ObsidianBody", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(outerGo.transform, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            StretchFull(innerRt, 2f, 2f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = PanelObsidian;
            innerImg.raycastTarget = false;

            if (_catalog != null && _catalog.seatFrame9Slice != null)
            {
                var frameGo = new GameObject("Seat9SliceOverlay", typeof(RectTransform), typeof(Image));
                frameGo.transform.SetParent(innerRt, false);
                StretchFull(frameGo.GetComponent<RectTransform>(), 0f, 0f);
                var frameImg = frameGo.GetComponent<Image>();
                frameImg.sprite = _catalog.seatFrame9Slice;
                frameImg.type = Image.Type.Sliced;
                frameImg.color = new Color(1f, 1f, 1f, 0.55f);
                frameImg.raycastTarget = false;
            }

            var badgeGo = new GameObject("BadgeBg", typeof(RectTransform), typeof(Image));
            badgeGo.transform.SetParent(innerRt, false);
            var badgeRt = badgeGo.GetComponent<RectTransform>();
            badgeRt.anchorMin = new Vector2(0f, 0.87f);
            badgeRt.anchorMax = new Vector2(1f, 0.95f);
            badgeRt.offsetMin = new Vector2(28f, 0f);
            badgeRt.offsetMax = new Vector2(-28f, 0f);
            badgeGo.GetComponent<Image>().color = SubSurfaceObsidian;

            var badgeTmp = CreateLabel(
                "BadgeText",
                badgeRt,
                badgeText,
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            StretchFull(badgeTmp.rectTransform, 14f, 2f);

            var titleTmp = CreateLabel(
                "PlaqueTitle",
                innerRt,
                titleText,
                22f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _serifFont);
            titleTmp.enableAutoSizing = true;
            titleTmp.fontSizeMin = 17f;
            titleTmp.fontSizeMax = 22f;
            var titleRt = titleTmp.rectTransform;
            titleRt.anchorMin = new Vector2(0f, 0.72f);
            titleRt.anchorMax = new Vector2(1f, 0.85f);
            titleRt.offsetMin = new Vector2(28f, 0f);
            titleRt.offsetMax = new Vector2(-28f, 0f);

            var descTmp = CreateLabel(
                "PlaqueDesc",
                innerRt,
                descText,
                15f,
                FontStyles.Normal,
                new Color(0.91f, 0.86f, 0.76f, 1f),
                TextAlignmentOptions.TopLeft,
                _sansFont);
            descTmp.textWrappingMode = TextWrappingModes.Normal;
            var descRt = descTmp.rectTransform;
            descRt.anchorMin = new Vector2(0f, 0.55f);
            descRt.anchorMax = new Vector2(1f, 0.71f);
            descRt.offsetMin = new Vector2(28f, 0f);
            descRt.offsetMax = new Vector2(-28f, 0f);

            return innerRt;
        }

        private void BuildBusyOverlay(RectTransform safeFrame)
        {
            _busyOverlayObj = new GameObject("BusyOverlay", typeof(RectTransform), typeof(Image));
            _busyOverlayObj.transform.SetParent(safeFrame, false);
            StretchFull(_busyOverlayObj.GetComponent<RectTransform>(), 0f, 0f);
            var overlayImg = _busyOverlayObj.GetComponent<Image>();
            overlayImg.color = new Color(0.025f, 0.020f, 0.018f, 0.78f);
            overlayImg.raycastTarget = true;

            var cardGo = CreateBorderedPanel("BusyCard", _busyOverlayObj.GetComponent<RectTransform>(), PanelObsidian, BronzeBorderColor, 2f);
            var cardRt = cardGo.GetComponent<RectTransform>();
            cardRt.anchorMin = new Vector2(0.5f, 0.5f);
            cardRt.anchorMax = new Vector2(0.5f, 0.5f);
            cardRt.sizeDelta = new Vector2(540f, 128f);

            _busyLabelText = CreateLabel(
                "BusyLabel",
                cardGo.transform.GetChild(0),
                "Đang kết nối chiến trường...",
                19f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.Center,
                _serifFont);
            StretchFull(_busyLabelText.rectTransform, 24f, 16f);

            _busyOverlayObj.SetActive(false);
        }

        private void SelectSoloSeats(int seats)
        {
            _selectedSoloSeats = seats;
            for (int i = 0; i < SoloSeatOptions.Length; i++)
            {
                bool active = SoloSeatOptions[i] == seats;
                if (_soloSeatButtonBgs[i] != null)
                {
                    _soloSeatButtonBgs[i].color = active ? CinnabarFallback : SubSurfaceObsidian;
                }
                if (_soloSeatButtonBorders[i] != null)
                {
                    _soloSeatButtonBorders[i].color = active ? GoldIvoryColor : BronzeBorderColor;
                }
                if (_soloSeatButtonLabels[i] != null)
                {
                    _soloSeatButtonLabels[i].color = active ? WarmWhiteColor : MutedGoldColor;
                }
            }

            if (_soloSummaryText != null)
            {
                int botCount = Mathf.Max(1, seats - 1);
                _soloSummaryText.text = $"Bàn {seats} ghế · 1 Hiệp khách và {botCount} Máy AI";
            }

            if (_playSoloLabel != null)
            {
                _playSoloLabel.text = $"Vào Trận Với Máy · {seats}P";
            }
        }

        private void HandlePlaySoloClicked()
        {
            if (_isBusy) return;
            if (!TryGetValidatedDisplayName(out string displayName)) return;
            OnPlaySoloRequested?.Invoke(_selectedSoloSeats, displayName);
        }

        private void HandleHostLanClicked()
        {
            if (_isBusy) return;
            if (!TryGetValidatedDisplayName(out string displayName)) return;
            OnHostLanRequested?.Invoke(displayName);
        }

        private void HandleJoinRoomClicked()
        {
            if (_isBusy) return;
            if (!TryGetValidatedDisplayName(out string displayName)) return;

            string rawInvite = _inviteInput != null ? _inviteInput.text : string.Empty;
            if (!ParseInviteInput(rawInvite, DefaultLocalBaseUrl, out string resolvedUrl, out string roomCode))
            {
                if (_joinErrorText != null)
                {
                    _joinErrorText.text = "Chuỗi mời không hợp lệ. Nhập IP:Port#Mã (VD: 192.168.1.5:3001#AB12CD) hoặc Mã 6 ký tự.";
                    _joinErrorText.color = ErrorCrimsonColor;
                }
                return;
            }

            ClearJoinError();
            OnJoinRoomRequested?.Invoke(resolvedUrl, roomCode, displayName);
        }

        private bool TryGetValidatedDisplayName(out string validName)
        {
            string raw = _displayNameInput != null ? _displayNameInput.text : DefaultDisplayName;
            string trimmed = string.IsNullOrWhiteSpace(raw) ? string.Empty : raw.Trim();

            if (trimmed.Length < 2 || trimmed.Length > 20)
            {
                validName = string.Empty;
                if (_displayNameHintText != null)
                {
                    _displayNameHintText.text = "Biệt danh cần từ 2 đến 20 ký tự trước khi vào trận.";
                    _displayNameHintText.color = ErrorCrimsonColor;
                }
                return false;
            }

            SaveDisplayNameToPrefs(trimmed);
            ClearDisplayNameError();
            validName = trimmed;
            return true;
        }

        private void HandleDisplayNameEndEdit(string raw)
        {
            string trimmed = string.IsNullOrWhiteSpace(raw) ? string.Empty : raw.Trim();
            if (trimmed.Length >= 2 && trimmed.Length <= 20)
            {
                if (_displayNameInput != null && _displayNameInput.text != trimmed)
                {
                    _displayNameInput.SetTextWithoutNotify(trimmed);
                }
                SaveDisplayNameToPrefs(trimmed);
                ClearDisplayNameError();
            }
            else if (trimmed.Length == 0)
            {
                if (_displayNameInput != null)
                {
                    _displayNameInput.SetTextWithoutNotify(DefaultDisplayName);
                }
                SaveDisplayNameToPrefs(DefaultDisplayName);
                ClearDisplayNameError();
            }
            else
            {
                if (_displayNameHintText != null)
                {
                    _displayNameHintText.text = "Biệt danh phải có ít nhất 2 ký tự (tối đa 20 ký tự).";
                    _displayNameHintText.color = ErrorCrimsonColor;
                }
            }
        }

        private void LoadDisplayNameFromPrefs()
        {
            string saved = PlayerPrefs.GetString(DisplayNamePrefsKey, DefaultDisplayName);
            string trimmed = string.IsNullOrWhiteSpace(saved) ? DefaultDisplayName : saved.Trim();
            if (trimmed.Length < 2 || trimmed.Length > 20) trimmed = DefaultDisplayName;

            if (_displayNameInput != null)
            {
                _displayNameInput.SetTextWithoutNotify(trimmed);
            }
        }

        private static void SaveDisplayNameToPrefs(string validName)
        {
            PlayerPrefs.SetString(DisplayNamePrefsKey, validName);
            PlayerPrefs.Save();
        }

        private void ClearDisplayNameError()
        {
            if (_displayNameHintText != null)
            {
                _displayNameHintText.text = "Tên hiển thị trên bàn đấu và lưu tự động trên máy.";
                _displayNameHintText.color = MutedGoldColor;
            }
        }

        private void ClearJoinError()
        {
            if (_joinErrorText != null)
            {
                _joinErrorText.text = "Hỗ trợ IP:Port#Mã, http://...#Mã hoặc 6 ký tự Mã phòng.";
                _joinErrorText.color = MutedGoldColor;
            }
        }

        private void RefreshCatalogSprites()
        {
            if (_catalog == null) return;
            ApplyBackdropSprite();
            ApplyPrimaryButtonSprite(_playSoloBtn);
            ApplyPrimaryButtonSprite(_hostLanBtn);
            ApplyPrimaryButtonSprite(_joinRoomBtn);
        }

        private void ApplyPrimaryButtonSprite(Button btn)
        {
            if (btn == null || _catalog == null) return;
            var img = btn.GetComponent<Image>();
            if (img == null) return;
            img.sprite = _catalog.actionButtonPrimary9Slice;
            img.type = img.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            img.color = img.sprite != null ? Color.white : CinnabarFallback;
        }

        private Button CreatePrimaryCinnabarButton(
            string name,
            Transform parent,
            string label,
            out TextMeshProUGUI labelOut,
            Action onClick)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);

            var img = go.GetComponent<Image>();
            img.sprite = _catalog != null ? _catalog.actionButtonPrimary9Slice : null;
            img.type = img.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            img.color = img.sprite != null ? Color.white : CinnabarFallback;

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(() => onClick?.Invoke());

            labelOut = CreateLabel(
                "Label",
                go.transform,
                label,
                19f,
                FontStyles.Bold,
                WarmWhiteColor,
                TextAlignmentOptions.Center,
                _serifFont);
            StretchFull(labelOut.rectTransform, 14f, 4f);
            return btn;
        }

        private Button CreateSecondaryButton(
            string name,
            Transform parent,
            string label,
            float fontSize,
            Action onClick)
        {
            var borderGo = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            borderGo.transform.SetParent(parent, false);

            var borderImg = borderGo.GetComponent<Image>();
            borderImg.color = BronzeBorderColor;

            var innerGo = new GameObject("Inner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(borderGo.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), 1.5f, 1.5f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = new Color(0.14f, 0.11f, 0.085f, 0.98f);
            innerImg.raycastTarget = false;

            var btn = borderGo.GetComponent<Button>();
            btn.targetGraphic = innerImg;
            btn.onClick.AddListener(() => onClick?.Invoke());

            var tmp = CreateLabel(
                "Label",
                innerGo.transform,
                label,
                Mathf.Max(15f, fontSize),
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.Center,
                _sansFont);
            StretchFull(tmp.rectTransform, 8f, 2f);
            return btn;
        }

        private Button CreateSelectableChipButton(
            string name,
            Transform parent,
            string label,
            float fontSize,
            out Image innerBg,
            out Image borderImg,
            out TextMeshProUGUI labelTmp,
            Action onClick)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            borderImg = go.GetComponent<Image>();
            borderImg.color = BronzeBorderColor;

            var innerGo = new GameObject("Inner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(go.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), 1.5f, 1.5f);
            innerBg = innerGo.GetComponent<Image>();
            innerBg.color = SubSurfaceObsidian;
            innerBg.raycastTarget = false;

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = innerBg;
            btn.onClick.AddListener(() => onClick?.Invoke());

            labelTmp = CreateLabel(
                "Label",
                innerGo.transform,
                label,
                Mathf.Max(15f, fontSize),
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.Center,
                _sansFont);
            StretchFull(labelTmp.rectTransform, 6f, 2f);
            return btn;
        }

        private TMP_InputField CreateInputField(
            string name,
            Transform parent,
            string placeholderText,
            TMP_FontAsset font,
            float fontSize,
            int characterLimit)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(TMP_InputField));
            go.transform.SetParent(parent, false);
            var borderImg = go.GetComponent<Image>();
            borderImg.color = BronzeBorderColor;

            var innerGo = new GameObject("InputBg", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(go.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), 1.5f, 1.5f);
            var bgImg = innerGo.GetComponent<Image>();
            bgImg.color = new Color(0.035f, 0.030f, 0.025f, 0.98f);
            bgImg.raycastTarget = false;

            var textAreaGo = new GameObject("Text Area", typeof(RectTransform), typeof(RectMask2D));
            textAreaGo.transform.SetParent(innerGo.transform, false);
            var textAreaRt = textAreaGo.GetComponent<RectTransform>();
            StretchFull(textAreaRt, 14f, 6f);

            var placeholderTmp = CreateLabel(
                "Placeholder",
                textAreaRt,
                placeholderText,
                Mathf.Max(15f, fontSize),
                FontStyles.Italic,
                new Color(0.65f, 0.58f, 0.44f, 0.68f),
                TextAlignmentOptions.MidlineLeft,
                font);
            StretchFull(placeholderTmp.rectTransform, 0f, 0f);

            var textTmp = CreateLabel(
                "Text",
                textAreaRt,
                string.Empty,
                Mathf.Max(15f, fontSize),
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                font);
            StretchFull(textTmp.rectTransform, 0f, 0f);

            var input = go.GetComponent<TMP_InputField>();
            input.targetGraphic = borderImg;
            input.textViewport = textAreaRt;
            input.textComponent = textTmp;
            input.placeholder = placeholderTmp;
            if (font != null) input.fontAsset = font;
            input.pointSize = Mathf.Max(15f, fontSize);
            input.characterLimit = characterLimit;
            input.caretColor = GoldIvoryColor;
            input.customCaretColor = true;
            input.caretWidth = 2;
            input.selectionColor = new Color(0.722f, 0.561f, 0.278f, 0.35f);
            input.lineType = TMP_InputField.LineType.SingleLine;
            return input;
        }

        private static GameObject CreateBorderedPanel(
            string name,
            Transform parent,
            Color innerColor,
            Color borderColor,
            float borderThickness)
        {
            var outerGo = new GameObject(name, typeof(RectTransform), typeof(Image));
            outerGo.transform.SetParent(parent, false);
            outerGo.GetComponent<Image>().color = borderColor;

            var innerGo = new GameObject("InnerPanel", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(outerGo.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), borderThickness, borderThickness);
            innerGo.GetComponent<Image>().color = innerColor;
            return outerGo;
        }

        private static TextMeshProUGUI CreateLabel(
            string name,
            Transform parent,
            string text,
            float fontSize,
            FontStyles style,
            Color color,
            TextAlignmentOptions alignment,
            TMP_FontAsset font)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            var tmp = go.GetComponent<TextMeshProUGUI>();
            if (font != null) tmp.font = font;
            tmp.fontSize = Mathf.Max(15f, fontSize);
            tmp.fontStyle = style;
            tmp.color = color;
            tmp.alignment = alignment;
            tmp.textWrappingMode = TextWrappingModes.NoWrap;
            tmp.overflowMode = TextOverflowModes.Truncate;
            tmp.text = text ?? string.Empty;
            tmp.raycastTarget = false;
            return tmp;
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
