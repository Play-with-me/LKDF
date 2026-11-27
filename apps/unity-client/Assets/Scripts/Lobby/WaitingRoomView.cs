using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Lobby
{
    /// <summary>
    /// Màn hình Phòng Chờ 4–8 ghế (100% uGUI + TMPro, Cổ Thư & Gỗ Mun Cách 2).
    /// Hiển thị Mã phòng lớn (monoFont), thanh sao chép địa chỉ mời IP:Port#Mã,
    /// lưới 8 ô ghế (Tên, Sẵn sàng / Đang chờ / Máy AI, huy hiệu Chủ phòng),
    /// nút Sẵn sàng, Thêm Máy Đủ Bàn (4/5/6/8), nút Chu Sa Bắt Đầu Ván Đấu kèm lý do khóa rõ ràng, và Rời Phòng.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class WaitingRoomView : MonoBehaviour
    {
        private static readonly Color BackdropObsidian = new(0.035f, 0.030f, 0.026f, 0.96f);
        private static readonly Color PanelObsidian = new(0.055f, 0.045f, 0.038f, 0.94f);
        private static readonly Color SubSurfaceObsidian = new(0.085f, 0.070f, 0.058f, 0.96f);
        private static readonly Color EmptySeatObsidian = new(0.042f, 0.036f, 0.032f, 0.72f);
        private static readonly Color BronzeBorderColor = new(0.722f, 0.561f, 0.278f, 1f); // #B88F47
        private static readonly Color GoldIvoryColor = new(0.961f, 0.890f, 0.671f, 1f);    // #F5E3AB
        private static readonly Color MutedGoldColor = new(0.820f, 0.725f, 0.506f, 1f);
        private static readonly Color WarmWhiteColor = new(1.000f, 0.961f, 0.878f, 1f);
        private static readonly Color CinnabarFallback = new(0.620f, 0.169f, 0.145f, 0.98f);
        private static readonly Color ReadyGreenColor = new(0.18f, 0.74f, 0.38f, 1f);
        private static readonly Color WaitingAmberColor = new(0.90f, 0.58f, 0.18f, 1f);
        private static readonly Color BotCyanGoldColor = new(0.56f, 0.78f, 0.86f, 1f);
        private static readonly Color DisconnectedCrimsonColor = new(0.88f, 0.27f, 0.24f, 1f);

        private static readonly int[] FillBotOptions = { 4, 5, 6, 8 };

        private sealed class SeatCardWidgets
        {
            public Image BorderImage;
            public Image BodyImage;
            public Image Frame9SliceOverlay;
            public TextMeshProUGUI SeatIndexText;
            public GameObject HostBadgeObj;
            public TextMeshProUGUI HostBadgeText;
            public TextMeshProUGUI DisplayNameText;
            public Image StatusDot;
            public TextMeshProUGUI StatusLabel;
            public TextMeshProUGUI SubInfoText;
        }

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private RectTransform _rootRect;
        private bool _initialized;

        // Top Bar
        private TextMeshProUGUI _roomCodeText;
        private TextMeshProUGUI _seatCountBadgeText;
        private TextMeshProUGUI _inviteUrlText;
        private Button _copyInviteBtn;
        private TextMeshProUGUI _copyInviteLabel;
        private float _copyFeedbackTimer;

        // 8-Seat Grid
        private readonly List<SeatCardWidgets> _seatWidgets = new();

        // Bottom Controls
        private Button _leaveRoomBtn;
        private Button _toggleReadyBtn;
        private TextMeshProUGUI _toggleReadyLabel;

        private readonly Button[] _botTargetBtns = new Button[FillBotOptions.Length];
        private readonly Image[] _botTargetBgs = new Image[FillBotOptions.Length];
        private readonly Image[] _botTargetBorders = new Image[FillBotOptions.Length];
        private readonly TextMeshProUGUI[] _botTargetLabels = new TextMeshProUGUI[FillBotOptions.Length];
        private Button _fillBotsBtn;
        private TextMeshProUGUI _fillBotsLabel;

        private Button _startMatchBtn;
        private Image _startMatchBg;
        private CanvasGroup _startMatchGroup;
        private TextMeshProUGUI _startMatchLabel;
        private TextMeshProUGUI _roomHintText;

        private RoomStateDto _currentRoom;
        private string _myUserId = string.Empty;
        private string _lanInviteUrl = string.Empty;
        private bool _myIsReady;
        private int _selectedFillBotTarget = 4;

        public event Action<bool> OnToggleReadyRequested;
        public event Action<int> OnFillBotsRequested;
        public event Action OnStartMatchRequested;
        public event Action OnLeaveRoomRequested;

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
            BuildHeaderBar(safeFrame);
            BuildSeatGrid(safeFrame);
            BuildBottomActionBar(safeFrame);

            SelectBotTarget(4);
            _initialized = true;
        }

        public void SetVisible(bool visible)
        {
            if (visible && !_initialized)
            {
                InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            }
            gameObject.SetActive(visible);
        }

        public void BindRoomState(RoomStateDto room, string myUserId, string lanInviteUrl)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            _currentRoom = room;
            _myUserId = myUserId ?? string.Empty;
            _lanInviteUrl = lanInviteUrl ?? string.Empty;

            if (room == null)
            {
                BindEmptyRoomFallback();
                return;
            }

            string roomCode = string.IsNullOrWhiteSpace(room.RoomCode) ? "------" : room.RoomCode.Trim().ToUpperInvariant();
            if (_roomCodeText != null) _roomCodeText.text = roomCode;

            string effectiveInvite = !string.IsNullOrWhiteSpace(_lanInviteUrl) ? _lanInviteUrl : roomCode;
            if (_inviteUrlText != null) _inviteUrlText.text = effectiveInvite;

            List<RoomSeatDto> seats = room.Seats ?? new List<RoomSeatDto>();
            int seatCount = seats.Count;
            if (_seatCountBadgeText != null)
            {
                _seatCountBadgeText.text = $"{seatCount} / 8 Ghế";
            }

            string actingHostId = !string.IsNullOrWhiteSpace(room.ActingHostUserId)
                ? room.ActingHostUserId
                : room.OwnerUserId;
            bool isMeHost = !string.IsNullOrEmpty(_myUserId) && _myUserId == actingHostId;

            _myIsReady = false;
            int pendingGuests = 0;

            for (int i = 0; i < _seatWidgets.Count; i++)
            {
                SeatCardWidgets card = _seatWidgets[i];
                if (i < seatCount && seats[i] != null)
                {
                    RoomSeatDto seat = seats[i];
                    bool isMe = !string.IsNullOrEmpty(_myUserId) && seat.UserId == _myUserId;
                    bool isSeatHost = !string.IsNullOrEmpty(actingHostId) && seat.UserId == actingHostId;
                    bool isBot = IsBotSeat(seat);
                    bool isDisconnected = string.Equals(seat.ConnectionStatus, "DISCONNECTED", StringComparison.OrdinalIgnoreCase);

                    if (isMe) _myIsReady = seat.IsReady;
                    if (!isSeatHost && (!seat.IsReady || isDisconnected))
                    {
                        pendingGuests++;
                    }

                    BindOccupiedSeatCard(card, i, seat, isMe, isSeatHost, isBot, isDisconnected);
                }
                else
                {
                    BindEmptySeatCard(card, i);
                }
            }

            // Ensure target bot count is sensible relative to current seats
            if (_selectedFillBotTarget < seatCount && seatCount <= 8)
            {
                int nextOpt = ResolveMinValidBotTarget(seatCount);
                SelectBotTarget(nextOpt);
            }

            UpdateControlsState(seatCount, isMeHost, pendingGuests);
        }

        public void PopulateDemoPreview()
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            var demoRoom = new RoomStateDto
            {
                RoomCode = "K9M2P4",
                Status = "LOBBY",
                OwnerUserId = "u_host",
                ActingHostUserId = "u_host",
                TimerPreset = "STANDARD",
                Seats = new List<RoomSeatDto>
                {
                    new() { SeatIndex = 0, UserId = "u_host", DisplayName = "Lâm Thanh Vũ", IsReady = true, ConnectionStatus = "ONLINE", IsBotTakeover = false },
                    new() { SeatIndex = 1, UserId = "u_guest_1", DisplayName = "Triệu Thiên Hành", IsReady = true, ConnectionStatus = "ONLINE", IsBotTakeover = false },
                    new() { SeatIndex = 2, UserId = "u_guest_2", DisplayName = "Tô Mộng Dao", IsReady = false, ConnectionStatus = "ONLINE", IsBotTakeover = false },
                    new() { SeatIndex = 3, UserId = "bot_1", DisplayName = "Thái Văn Cơ · AI", IsReady = true, ConnectionStatus = "ONLINE", IsBotTakeover = true },
                }
            };

            BindRoomState(demoRoom, "u_host", "192.168.1.5:3001#K9M2P4");
        }

        private void Update()
        {
            if (_copyFeedbackTimer > 0f)
            {
                _copyFeedbackTimer -= Time.unscaledDeltaTime;
                if (_copyFeedbackTimer <= 0f && _copyInviteLabel != null)
                {
                    _copyInviteLabel.text = "Sao chép lời mời";
                }
            }
        }

        private void BindEmptyRoomFallback()
        {
            if (_roomCodeText != null) _roomCodeText.text = "------";
            if (_seatCountBadgeText != null) _seatCountBadgeText.text = "0 / 8 Ghế";
            if (_inviteUrlText != null) _inviteUrlText.text = "Đang chờ địa chỉ mời phòng...";

            for (int i = 0; i < _seatWidgets.Count; i++)
            {
                BindEmptySeatCard(_seatWidgets[i], i);
            }

            UpdateControlsState(0, isMeHost: false, pendingGuests: 0);
        }

        private void BindOccupiedSeatCard(
            SeatCardWidgets card,
            int visualIndex,
            RoomSeatDto seat,
            bool isMe,
            bool isSeatHost,
            bool isBot,
            bool isDisconnected)
        {
            card.BodyImage.color = PanelObsidian;
            if (card.Frame9SliceOverlay != null)
            {
                card.Frame9SliceOverlay.enabled = true;
                card.Frame9SliceOverlay.color = new Color(1f, 1f, 1f, 0.65f);
            }

            int displaySeatNo = seat.SeatIndex >= 0 ? seat.SeatIndex + 1 : visualIndex + 1;
            card.SeatIndexText.text = $"GHẾ {displaySeatNo}";
            card.SeatIndexText.color = MutedGoldColor;

            card.HostBadgeObj.SetActive(isSeatHost);
            if (isSeatHost && card.HostBadgeText != null)
            {
                card.HostBadgeText.text = "Chủ phòng";
            }

            string baseName = string.IsNullOrWhiteSpace(seat.DisplayName) ? $"Hiệp Khách {displaySeatNo}" : seat.DisplayName;
            card.DisplayNameText.text = isMe ? $"{baseName} (Bạn)" : baseName;
            card.DisplayNameText.color = GoldIvoryColor;

            if (isBot)
            {
                card.BorderImage.color = BronzeBorderColor;
                card.StatusDot.color = BotCyanGoldColor;
                card.StatusLabel.text = "Máy AI";
                card.StatusLabel.color = BotCyanGoldColor;
                card.SubInfoText.text = "Tự động đánh theo bộ 112 lá";
            }
            else if (isDisconnected)
            {
                card.BorderImage.color = DisconnectedCrimsonColor;
                card.StatusDot.color = DisconnectedCrimsonColor;
                card.StatusLabel.text = "Mất kết nối";
                card.StatusLabel.color = DisconnectedCrimsonColor;
                card.SubInfoText.text = "Đang chờ người chơi quay lại";
            }
            else if (seat.IsReady || isSeatHost)
            {
                card.BorderImage.color = isSeatHost ? GoldIvoryColor : ReadyGreenColor;
                card.StatusDot.color = ReadyGreenColor;
                card.StatusLabel.text = "Sẵn sàng";
                card.StatusLabel.color = ReadyGreenColor;
                card.SubInfoText.text = isSeatHost ? "Chủ bàn điều phối trận đấu" : "Đã sẵn sàng vào trận";
            }
            else
            {
                card.BorderImage.color = WaitingAmberColor;
                card.StatusDot.color = WaitingAmberColor;
                card.StatusLabel.text = "Đang chờ";
                card.StatusLabel.color = WaitingAmberColor;
                card.SubInfoText.text = "Chưa bấm nút Sẵn sàng";
            }
        }

        private void BindEmptySeatCard(SeatCardWidgets card, int index)
        {
            card.BodyImage.color = EmptySeatObsidian;
            card.BorderImage.color = new Color(BronzeBorderColor.r, BronzeBorderColor.g, BronzeBorderColor.b, 0.32f);
            if (card.Frame9SliceOverlay != null)
            {
                card.Frame9SliceOverlay.enabled = false;
            }

            card.SeatIndexText.text = $"GHẾ {index + 1}";
            card.SeatIndexText.color = new Color(0.60f, 0.54f, 0.42f, 0.72f);
            card.HostBadgeObj.SetActive(false);

            card.DisplayNameText.text = "Ghế trống";
            card.DisplayNameText.color = new Color(0.68f, 0.62f, 0.50f, 0.65f);

            card.StatusDot.color = new Color(0.45f, 0.40f, 0.34f, 0.55f);
            card.StatusLabel.text = "Chờ người chơi";
            card.StatusLabel.color = new Color(0.66f, 0.60f, 0.48f, 0.72f);
            card.SubInfoText.text = "Mời bạn bè hoặc thêm Máy AI";
        }

        private void UpdateControlsState(int seatCount, bool isMeHost, int pendingGuests)
        {
            // Ready button
            if (_toggleReadyLabel != null)
            {
                _toggleReadyLabel.text = _myIsReady ? "Hủy Sẵn Sàng" : "Sẵn Sàng";
            }
            if (_toggleReadyBtn != null)
            {
                _toggleReadyBtn.interactable = !isMeHost;
                if (isMeHost && _toggleReadyLabel != null)
                {
                    _toggleReadyLabel.text = "Chủ Phòng Sẵn Sàng";
                }
            }

            // Fill Bots controls (Host only)
            for (int i = 0; i < _botTargetBtns.Length; i++)
            {
                if (_botTargetBtns[i] != null)
                {
                    _botTargetBtns[i].interactable = isMeHost && FillBotOptions[i] >= seatCount;
                }
            }

            if (_fillBotsBtn != null && _fillBotsLabel != null)
            {
                if (!isMeHost)
                {
                    _fillBotsBtn.interactable = false;
                    _fillBotsLabel.text = "Thêm Máy (Chỉ Chủ Phòng)";
                }
                else if (seatCount >= 8)
                {
                    _fillBotsBtn.interactable = false;
                    _fillBotsLabel.text = "Bàn Đã Đủ 8/8 Ghế";
                }
                else if (_selectedFillBotTarget <= seatCount)
                {
                    _fillBotsBtn.interactable = false;
                    _fillBotsLabel.text = $"Đã Đủ {seatCount} Ghế (Chọn mốc lớn hơn)";
                }
                else
                {
                    _fillBotsBtn.interactable = true;
                    int addCount = _selectedFillBotTarget - seatCount;
                    _fillBotsLabel.text = $"Thêm {addCount} Máy Đủ {_selectedFillBotTarget} Ghế";
                }
            }

            // Start Match Cinnabar CTA (NEVER blind-disable: state exact lock reason directly on button label!)
            bool canStart = isMeHost && seatCount >= 4 && seatCount <= 8 && pendingGuests == 0;
            string startLabel;
            if (!isMeHost)
            {
                startLabel = "Chờ Chủ Phòng Bắt Đầu";
            }
            else if (seatCount < 4)
            {
                int need = 4 - seatCount;
                startLabel = $"Khóa · Cần thêm {need} người/Máy (Tối thiểu 4)";
            }
            else if (pendingGuests > 0)
            {
                startLabel = $"Khóa · Chờ {pendingGuests} người bấm Sẵn sàng";
            }
            else
            {
                startLabel = "Bắt Đầu Ván Đấu";
            }

            if (_startMatchLabel != null) _startMatchLabel.text = startLabel;
            if (_startMatchBtn != null) _startMatchBtn.interactable = canStart;
            if (_startMatchGroup != null) _startMatchGroup.alpha = canStart ? 1f : 0.62f;

            if (_roomHintText != null)
            {
                if (canStart)
                {
                    _roomHintText.text = $"Đã đủ {seatCount} ghế sẵn sàng · Chủ phòng có thể khởi tranh ngay.";
                    _roomHintText.color = ReadyGreenColor;
                }
                else if (isMeHost && seatCount < 4)
                {
                    _roomHintText.text = "Gửi mã mời cho bạn bè hoặc bấm Thêm Máy Đủ Bàn để đạt tối thiểu 4 ghế.";
                    _roomHintText.color = MutedGoldColor;
                }
                else if (isMeHost && pendingGuests > 0)
                {
                    _roomHintText.text = $"Còn {pendingGuests} ghế chưa Sẵn sàng hoặc đang mất kết nối.";
                    _roomHintText.color = WaitingAmberColor;
                }
                else
                {
                    _roomHintText.text = "Hãy bấm Sẵn sàng và chờ Chủ phòng phát lệnh Bắt Đầu Ván Đấu.";
                    _roomHintText.color = MutedGoldColor;
                }
            }
        }

        private void BuildBackdrop()
        {
            var bgGo = new GameObject("WaitingRoomBackdrop", typeof(RectTransform), typeof(Image));
            bgGo.transform.SetParent(_rootRect, false);
            StretchFull(bgGo.GetComponent<RectTransform>(), 0f, 0f);
            var bgImg = bgGo.GetComponent<Image>();
            bgImg.color = BackdropObsidian;
            bgImg.raycastTarget = true;

            if (_catalog != null && _catalog.tableBoard25D != null)
            {
                var texGo = new GameObject("BackdropArt", typeof(RectTransform), typeof(Image));
                texGo.transform.SetParent(_rootRect, false);
                StretchFull(texGo.GetComponent<RectTransform>(), 0f, 0f);
                var texImg = texGo.GetComponent<Image>();
                texImg.sprite = _catalog.tableBoard25D;
                texImg.preserveAspect = false;
                texImg.color = new Color(0.42f, 0.36f, 0.30f, 0.28f);
                texImg.raycastTarget = false;
            }
        }

        private RectTransform BuildSafeFrame()
        {
            var frameGo = new GameObject("WaitingSafeFrame", typeof(RectTransform));
            frameGo.transform.SetParent(_rootRect, false);
            var rt = frameGo.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.04f, 0.05f);
            rt.anchorMax = new Vector2(0.96f, 0.95f);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            return rt;
        }

        private void BuildHeaderBar(RectTransform safeFrame)
        {
            var headerPanel = CreateBorderedPanel("HeaderPlaque", safeFrame, PanelObsidian, BronzeBorderColor, 2f);
            var headerRt = headerPanel.GetComponent<RectTransform>();
            headerRt.anchorMin = new Vector2(0f, 0.78f);
            headerRt.anchorMax = new Vector2(1f, 1f);
            headerRt.offsetMin = Vector2.zero;
            headerRt.offsetMax = Vector2.zero;

            Transform inner = headerPanel.transform.GetChild(0);

            // Left: Room Code Big Display
            var codeCaption = CreateLabel(
                "RoomCodeCaption",
                inner,
                "PHÒNG CHỜ CỬU CHÂU · MÃ PHÒNG",
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var captionRt = codeCaption.rectTransform;
            captionRt.anchorMin = new Vector2(0.02f, 0.64f);
            captionRt.anchorMax = new Vector2(0.36f, 0.90f);
            captionRt.offsetMin = Vector2.zero;
            captionRt.offsetMax = Vector2.zero;

            _roomCodeText = CreateLabel(
                "RoomCodeValue",
                inner,
                "K9M2P4",
                42f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _monoFont ?? _serifFont);
            var codeValRt = _roomCodeText.rectTransform;
            codeValRt.anchorMin = new Vector2(0.02f, 0.12f);
            codeValRt.anchorMax = new Vector2(0.24f, 0.64f);
            codeValRt.offsetMin = Vector2.zero;
            codeValRt.offsetMax = Vector2.zero;

            var countBg = new GameObject("SeatCountPill", typeof(RectTransform), typeof(Image));
            countBg.transform.SetParent(inner, false);
            var countBgRt = countBg.GetComponent<RectTransform>();
            countBgRt.anchorMin = new Vector2(0.25f, 0.20f);
            countBgRt.anchorMax = new Vector2(0.37f, 0.56f);
            countBgRt.offsetMin = Vector2.zero;
            countBgRt.offsetMax = Vector2.zero;
            countBg.GetComponent<Image>().color = SubSurfaceObsidian;

            _seatCountBadgeText = CreateLabel(
                "SeatCountBadge",
                countBgRt,
                "1 / 8 Ghế",
                18f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.Center,
                _monoFont ?? _sansFont);
            StretchFull(_seatCountBadgeText.rectTransform, 8f, 2f);

            // Right: Quick Copy LAN Invite Bar
            var inviteCaption = CreateLabel(
                "InviteBarCaption",
                inner,
                "ĐỊA CHỈ MỜI BẠN BÈ (LAN / RADMIN / TAILSCALE)",
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var invCapRt = inviteCaption.rectTransform;
            invCapRt.anchorMin = new Vector2(0.41f, 0.64f);
            invCapRt.anchorMax = new Vector2(0.98f, 0.90f);
            invCapRt.offsetMin = Vector2.zero;
            invCapRt.offsetMax = Vector2.zero;

            var inviteBox = new GameObject("InviteCopyBar", typeof(RectTransform), typeof(Image));
            inviteBox.transform.SetParent(inner, false);
            var inviteBoxRt = inviteBox.GetComponent<RectTransform>();
            inviteBoxRt.anchorMin = new Vector2(0.41f, 0.14f);
            inviteBoxRt.anchorMax = new Vector2(0.98f, 0.62f);
            inviteBoxRt.offsetMin = Vector2.zero;
            inviteBoxRt.offsetMax = Vector2.zero;
            inviteBox.GetComponent<Image>().color = SubSurfaceObsidian;

            _inviteUrlText = CreateLabel(
                "InviteUrlText",
                inviteBoxRt,
                "192.168.1.5:3001#K9M2P4",
                18f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _monoFont ?? _sansFont);
            var urlRt = _inviteUrlText.rectTransform;
            urlRt.anchorMin = new Vector2(0f, 0f);
            urlRt.anchorMax = new Vector2(1f, 1f);
            urlRt.offsetMin = new Vector2(18f, 4f);
            urlRt.offsetMax = new Vector2(-220f, -4f);

            _copyInviteBtn = CreateSecondaryButton(
                "CopyInviteButton",
                inviteBoxRt,
                "Sao chép lời mời",
                15f,
                out _copyInviteLabel,
                HandleCopyInviteClicked);
            var copyRt = _copyInviteBtn.GetComponent<RectTransform>();
            copyRt.anchorMin = new Vector2(1f, 0.12f);
            copyRt.anchorMax = new Vector2(1f, 0.88f);
            copyRt.pivot = new Vector2(1f, 0.5f);
            copyRt.anchoredPosition = new Vector2(-10f, 0f);
            copyRt.sizeDelta = new Vector2(198f, 0f);
        }

        private void BuildSeatGrid(RectTransform safeFrame)
        {
            var gridGo = new GameObject("SeatGridPanel", typeof(RectTransform), typeof(GridLayoutGroup));
            gridGo.transform.SetParent(safeFrame, false);
            var gridRt = gridGo.GetComponent<RectTransform>();
            gridRt.anchorMin = new Vector2(0f, 0.24f);
            gridRt.anchorMax = new Vector2(1f, 0.75f);
            gridRt.offsetMin = Vector2.zero;
            gridRt.offsetMax = Vector2.zero;

            var grid = gridGo.GetComponent<GridLayoutGroup>();
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = 4;
            grid.spacing = new Vector2(18f, 18f);
            grid.cellSize = new Vector2(396f, 212f);
            grid.childAlignment = TextAnchor.MiddleCenter;

            _seatWidgets.Clear();
            for (int i = 0; i < 8; i++)
            {
                _seatWidgets.Add(CreateSeatCard(gridRt, i));
            }
        }

        private SeatCardWidgets CreateSeatCard(Transform parent, int index)
        {
            var outerGo = new GameObject($"SeatCard_{index + 1}", typeof(RectTransform), typeof(Image));
            outerGo.transform.SetParent(parent, false);
            var borderImg = outerGo.GetComponent<Image>();
            borderImg.color = BronzeBorderColor;
            borderImg.raycastTarget = false;

            var innerGo = new GameObject("Body", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(outerGo.transform, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            StretchFull(innerRt, 2f, 2f);
            var bodyImg = innerGo.GetComponent<Image>();
            bodyImg.color = PanelObsidian;
            bodyImg.raycastTarget = false;

            Image sliceOverlay = null;
            if (_catalog != null && _catalog.seatFrame9Slice != null)
            {
                var sliceGo = new GameObject("Seat9Slice", typeof(RectTransform), typeof(Image));
                sliceGo.transform.SetParent(innerRt, false);
                StretchFull(sliceGo.GetComponent<RectTransform>(), 0f, 0f);
                sliceOverlay = sliceGo.GetComponent<Image>();
                sliceOverlay.sprite = _catalog.seatFrame9Slice;
                sliceOverlay.type = Image.Type.Sliced;
                sliceOverlay.color = new Color(1f, 1f, 1f, 0.55f);
                sliceOverlay.raycastTarget = false;
            }

            var seatIdxTmp = CreateLabel(
                "SeatNumber",
                innerRt,
                $"GHẾ {index + 1}",
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _monoFont ?? _sansFont);
            var idxRt = seatIdxTmp.rectTransform;
            idxRt.anchorMin = new Vector2(0f, 0.74f);
            idxRt.anchorMax = new Vector2(0.45f, 0.92f);
            idxRt.offsetMin = new Vector2(18f, 0f);
            idxRt.offsetMax = Vector2.zero;

            var hostBadgeGo = new GameObject("HostBadge", typeof(RectTransform), typeof(Image));
            hostBadgeGo.transform.SetParent(innerRt, false);
            var hostRt = hostBadgeGo.GetComponent<RectTransform>();
            hostRt.anchorMin = new Vector2(0.50f, 0.74f);
            hostRt.anchorMax = new Vector2(1f, 0.92f);
            hostRt.offsetMin = Vector2.zero;
            hostRt.offsetMax = new Vector2(-16f, 0f);
            hostBadgeGo.GetComponent<Image>().color = new Color(0.62f, 0.17f, 0.14f, 0.92f);

            var hostBadgeTmp = CreateLabel(
                "HostBadgeText",
                hostRt,
                "Chủ phòng",
                15f,
                FontStyles.Bold,
                WarmWhiteColor,
                TextAlignmentOptions.Center,
                _sansFont);
            StretchFull(hostBadgeTmp.rectTransform, 6f, 2f);
            hostBadgeGo.SetActive(false);

            var nameTmp = CreateLabel(
                "DisplayName",
                innerRt,
                "Ghế trống",
                21f,
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.MidlineLeft,
                _serifFont ?? _sansFont);
            var nameRt = nameTmp.rectTransform;
            nameRt.anchorMin = new Vector2(0f, 0.44f);
            nameRt.anchorMax = new Vector2(1f, 0.70f);
            nameRt.offsetMin = new Vector2(18f, 0f);
            nameRt.offsetMax = new Vector2(-18f, 0f);

            var statusBarGo = new GameObject("StatusRow", typeof(RectTransform), typeof(Image));
            statusBarGo.transform.SetParent(innerRt, false);
            var statusBarRt = statusBarGo.GetComponent<RectTransform>();
            statusBarRt.anchorMin = new Vector2(0f, 0.22f);
            statusBarRt.anchorMax = new Vector2(1f, 0.41f);
            statusBarRt.offsetMin = new Vector2(18f, 0f);
            statusBarRt.offsetMax = new Vector2(-18f, 0f);
            statusBarGo.GetComponent<Image>().color = SubSurfaceObsidian;

            var dotGo = new GameObject("StatusDot", typeof(RectTransform), typeof(Image));
            dotGo.transform.SetParent(statusBarRt, false);
            var dotRt = dotGo.GetComponent<RectTransform>();
            dotRt.anchorMin = new Vector2(0f, 0.5f);
            dotRt.anchorMax = new Vector2(0f, 0.5f);
            dotRt.pivot = new Vector2(0f, 0.5f);
            dotRt.anchoredPosition = new Vector2(12f, 0f);
            dotRt.sizeDelta = new Vector2(12f, 12f);
            var dotImg = dotGo.GetComponent<Image>();
            dotImg.color = WaitingAmberColor;

            var statusTmp = CreateLabel(
                "StatusLabel",
                statusBarRt,
                "Đang chờ",
                16f,
                FontStyles.Bold,
                WaitingAmberColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var statusLabelRt = statusTmp.rectTransform;
            statusLabelRt.anchorMin = new Vector2(0f, 0f);
            statusLabelRt.anchorMax = new Vector2(1f, 1f);
            statusLabelRt.offsetMin = new Vector2(34f, 2f);
            statusLabelRt.offsetMax = new Vector2(-10f, -2f);

            var subInfoTmp = CreateLabel(
                "SubInfo",
                innerRt,
                "Mời bạn bè hoặc thêm Máy AI",
                15f,
                FontStyles.Normal,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var subRt = subInfoTmp.rectTransform;
            subRt.anchorMin = new Vector2(0f, 0.04f);
            subRt.anchorMax = new Vector2(1f, 0.20f);
            subRt.offsetMin = new Vector2(18f, 0f);
            subRt.offsetMax = new Vector2(-18f, 0f);

            return new SeatCardWidgets
            {
                BorderImage = borderImg,
                BodyImage = bodyImg,
                Frame9SliceOverlay = sliceOverlay,
                SeatIndexText = seatIdxTmp,
                HostBadgeObj = hostBadgeGo,
                HostBadgeText = hostBadgeTmp,
                DisplayNameText = nameTmp,
                StatusDot = dotImg,
                StatusLabel = statusTmp,
                SubInfoText = subInfoTmp,
            };
        }

        private void BuildBottomActionBar(RectTransform safeFrame)
        {
            var barPanel = CreateBorderedPanel("BottomActionBar", safeFrame, PanelObsidian, BronzeBorderColor, 2f);
            var barRt = barPanel.GetComponent<RectTransform>();
            barRt.anchorMin = new Vector2(0f, 0f);
            barRt.anchorMax = new Vector2(1f, 0.21f);
            barRt.offsetMin = Vector2.zero;
            barRt.offsetMax = Vector2.zero;

            Transform inner = barPanel.transform.GetChild(0);

            // Top Hint line inside Bottom Bar
            _roomHintText = CreateLabel(
                "RoomHintText",
                inner,
                "Đang chờ thông tin phòng...",
                15f,
                FontStyles.Bold,
                MutedGoldColor,
                TextAlignmentOptions.MidlineLeft,
                _sansFont);
            var hintRt = _roomHintText.rectTransform;
            hintRt.anchorMin = new Vector2(0.02f, 0.70f);
            hintRt.anchorMax = new Vector2(0.98f, 0.94f);
            hintRt.offsetMin = Vector2.zero;
            hintRt.offsetMax = Vector2.zero;

            // Leave Room Button (Left)
            _leaveRoomBtn = CreateSecondaryButton(
                "LeaveRoomButton",
                inner,
                "Rời Phòng",
                16f,
                out _,
                () => OnLeaveRoomRequested?.Invoke());
            var leaveRt = _leaveRoomBtn.GetComponent<RectTransform>();
            leaveRt.anchorMin = new Vector2(0.02f, 0.14f);
            leaveRt.anchorMax = new Vector2(0.14f, 0.64f);
            leaveRt.offsetMin = Vector2.zero;
            leaveRt.offsetMax = Vector2.zero;

            // Toggle Ready Button
            _toggleReadyBtn = CreateSecondaryButton(
                "ToggleReadyButton",
                inner,
                "Sẵn Sàng",
                16f,
                out _toggleReadyLabel,
                () => OnToggleReadyRequested?.Invoke(!_myIsReady));
            var readyRt = _toggleReadyBtn.GetComponent<RectTransform>();
            readyRt.anchorMin = new Vector2(0.155f, 0.14f);
            readyRt.anchorMax = new Vector2(0.31f, 0.64f);
            readyRt.offsetMin = Vector2.zero;
            readyRt.offsetMax = Vector2.zero;

            // Fill Bots Group (4/5/6/8 chips + Thêm Máy Đủ Bàn)
            var botGroupGo = new GameObject("FillBotsGroup", typeof(RectTransform));
            botGroupGo.transform.SetParent(inner, false);
            var botGroupRt = botGroupGo.GetComponent<RectTransform>();
            botGroupRt.anchorMin = new Vector2(0.33f, 0.14f);
            botGroupRt.anchorMax = new Vector2(0.67f, 0.64f);
            botGroupRt.offsetMin = Vector2.zero;
            botGroupRt.offsetMax = Vector2.zero;

            var chipsRowGo = new GameObject("TargetChipsRow", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            chipsRowGo.transform.SetParent(botGroupRt, false);
            var chipsRowRt = chipsRowGo.GetComponent<RectTransform>();
            chipsRowRt.anchorMin = new Vector2(0f, 0f);
            chipsRowRt.anchorMax = new Vector2(0.46f, 1f);
            chipsRowRt.offsetMin = Vector2.zero;
            chipsRowRt.offsetMax = Vector2.zero;

            var chipsHlg = chipsRowGo.GetComponent<HorizontalLayoutGroup>();
            chipsHlg.spacing = 6f;
            chipsHlg.childControlWidth = true;
            chipsHlg.childControlHeight = true;
            chipsHlg.childForceExpandWidth = true;
            chipsHlg.childForceExpandHeight = true;

            for (int i = 0; i < FillBotOptions.Length; i++)
            {
                int targetCount = FillBotOptions[i];
                _botTargetBtns[i] = CreateSelectableChipButton(
                    $"BotTarget_{targetCount}",
                    chipsRowRt,
                    $"{targetCount}",
                    16f,
                    out _botTargetBgs[i],
                    out _botTargetBorders[i],
                    out _botTargetLabels[i],
                    () => SelectBotTarget(targetCount));
            }

            _fillBotsBtn = CreateSecondaryButton(
                "FillBotsButton",
                botGroupRt,
                "Thêm Máy Đủ Bàn",
                16f,
                out _fillBotsLabel,
                () => OnFillBotsRequested?.Invoke(_selectedFillBotTarget));
            var fillBtnRt = _fillBotsBtn.GetComponent<RectTransform>();
            fillBtnRt.anchorMin = new Vector2(0.48f, 0f);
            fillBtnRt.anchorMax = new Vector2(1f, 1f);
            fillBtnRt.offsetMin = Vector2.zero;
            fillBtnRt.offsetMax = Vector2.zero;

            // Start Match Primary Cinnabar 9-slice Button (Right)
            var startGo = new GameObject("StartMatchButton", typeof(RectTransform), typeof(Image), typeof(Button), typeof(CanvasGroup));
            startGo.transform.SetParent(inner, false);
            var startRt = startGo.GetComponent<RectTransform>();
            startRt.anchorMin = new Vector2(0.69f, 0.12f);
            startRt.anchorMax = new Vector2(0.98f, 0.68f);
            startRt.offsetMin = Vector2.zero;
            startRt.offsetMax = Vector2.zero;

            _startMatchBg = startGo.GetComponent<Image>();
            _startMatchBg.sprite = _catalog != null ? _catalog.actionButtonPrimary9Slice : null;
            _startMatchBg.type = _startMatchBg.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            _startMatchBg.color = _startMatchBg.sprite != null ? Color.white : CinnabarFallback;

            _startMatchGroup = startGo.GetComponent<CanvasGroup>();
            _startMatchBtn = startGo.GetComponent<Button>();
            _startMatchBtn.targetGraphic = _startMatchBg;
            _startMatchBtn.onClick.AddListener(() => OnStartMatchRequested?.Invoke());

            _startMatchLabel = CreateLabel(
                "StartMatchLabel",
                startRt,
                "Khóa · Cần thêm 4 người/Máy (Tối thiểu 4)",
                17f,
                FontStyles.Bold,
                WarmWhiteColor,
                TextAlignmentOptions.Center,
                _serifFont);
            _startMatchLabel.enableAutoSizing = true;
            _startMatchLabel.fontSizeMin = 15f;
            _startMatchLabel.fontSizeMax = 18f;
            StretchFull(_startMatchLabel.rectTransform, 14f, 4f);
        }

        private void SelectBotTarget(int targetCount)
        {
            _selectedFillBotTarget = targetCount;
            for (int i = 0; i < FillBotOptions.Length; i++)
            {
                bool active = FillBotOptions[i] == targetCount;
                if (_botTargetBgs[i] != null)
                {
                    _botTargetBgs[i].color = active ? CinnabarFallback : SubSurfaceObsidian;
                }
                if (_botTargetBorders[i] != null)
                {
                    _botTargetBorders[i].color = active ? GoldIvoryColor : BronzeBorderColor;
                }
                if (_botTargetLabels[i] != null)
                {
                    _botTargetLabels[i].color = active ? WarmWhiteColor : MutedGoldColor;
                }
            }

            if (_currentRoom != null)
            {
                int seatCount = _currentRoom.Seats != null ? _currentRoom.Seats.Count : 0;
                string actingHostId = !string.IsNullOrWhiteSpace(_currentRoom.ActingHostUserId)
                    ? _currentRoom.ActingHostUserId
                    : _currentRoom.OwnerUserId;
                bool isMeHost = !string.IsNullOrEmpty(_myUserId) && _myUserId == actingHostId;
                int pending = CountPendingGuests(_currentRoom.Seats, actingHostId);
                UpdateControlsState(seatCount, isMeHost, pending);
            }
        }

        private void HandleCopyInviteClicked()
        {
            string toCopy = !string.IsNullOrWhiteSpace(_lanInviteUrl)
                ? _lanInviteUrl
                : (_currentRoom != null ? _currentRoom.RoomCode : string.Empty);

            if (string.IsNullOrWhiteSpace(toCopy)) return;

            GUIUtility.systemCopyBuffer = toCopy;
            if (_copyInviteLabel != null)
            {
                _copyInviteLabel.text = "Đã chép lời mời";
            }
            _copyFeedbackTimer = 2f;
        }

        private static bool IsBotSeat(RoomSeatDto seat)
        {
            if (seat == null) return false;
            if (seat.IsBotTakeover) return true;
            return !string.IsNullOrEmpty(seat.UserId) &&
                   seat.UserId.StartsWith("bot", StringComparison.OrdinalIgnoreCase);
        }

        private static int CountPendingGuests(List<RoomSeatDto> seats, string actingHostId)
        {
            if (seats == null) return 0;
            int pending = 0;
            for (int i = 0; i < seats.Count; i++)
            {
                RoomSeatDto seat = seats[i];
                if (seat == null) continue;
                bool isHost = !string.IsNullOrEmpty(actingHostId) && seat.UserId == actingHostId;
                bool isDisconnected = string.Equals(seat.ConnectionStatus, "DISCONNECTED", StringComparison.OrdinalIgnoreCase);
                if (!isHost && (!seat.IsReady || isDisconnected))
                {
                    pending++;
                }
            }
            return pending;
        }

        private static int ResolveMinValidBotTarget(int seatCount)
        {
            for (int i = 0; i < FillBotOptions.Length; i++)
            {
                if (FillBotOptions[i] >= seatCount) return FillBotOptions[i];
            }
            return 8;
        }

        private void RefreshCatalogSprites()
        {
            if (_catalog == null) return;
            if (_startMatchBg != null)
            {
                _startMatchBg.sprite = _catalog.actionButtonPrimary9Slice;
                _startMatchBg.type = _startMatchBg.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
                _startMatchBg.color = _startMatchBg.sprite != null ? Color.white : CinnabarFallback;
            }
            for (int i = 0; i < _seatWidgets.Count; i++)
            {
                if (_seatWidgets[i].Frame9SliceOverlay != null)
                {
                    _seatWidgets[i].Frame9SliceOverlay.sprite = _catalog.seatFrame9Slice;
                    _seatWidgets[i].Frame9SliceOverlay.type = _catalog.seatFrame9Slice != null ? Image.Type.Sliced : Image.Type.Simple;
                }
            }
        }

        private Button CreateSecondaryButton(
            string name,
            Transform parent,
            string label,
            float fontSize,
            out TextMeshProUGUI labelOut,
            Action onClick)
        {
            var borderGo = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            borderGo.transform.SetParent(parent, false);
            borderGo.GetComponent<Image>().color = BronzeBorderColor;

            var innerGo = new GameObject("Inner", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(borderGo.transform, false);
            StretchFull(innerGo.GetComponent<RectTransform>(), 1.5f, 1.5f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = new Color(0.14f, 0.11f, 0.085f, 0.98f);
            innerImg.raycastTarget = false;

            var btn = borderGo.GetComponent<Button>();
            btn.targetGraphic = innerImg;
            btn.onClick.AddListener(() => onClick?.Invoke());

            labelOut = CreateLabel(
                "Label",
                innerGo.transform,
                label,
                Mathf.Max(15f, fontSize),
                FontStyles.Bold,
                GoldIvoryColor,
                TextAlignmentOptions.Center,
                _sansFont);
            StretchFull(labelOut.rectTransform, 8f, 2f);
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
            StretchFull(labelTmp.rectTransform, 4f, 2f);
            return btn;
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
