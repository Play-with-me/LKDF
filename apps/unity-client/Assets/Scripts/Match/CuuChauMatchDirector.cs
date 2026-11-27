using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using CuuChau.Arena;
using CuuChau.Audio;
using CuuChau.Cards;
using CuuChau.Data;
using CuuChau.Lobby;
using CuuChau.Modals;
using CuuChau.Net;
using CuuChau.Sidecar;
using CuuChau.VFX;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace CuuChau.Match
{
    /// <summary>
    /// Nhạc trưởng điều phối trọn vẹn chu trình sống Cửu Châu Ẩn Kiếm:
    /// Sidecar -> Đăng nhập & WebSocket -> Sảnh Đại Điện -> Phòng Chờ LAN/Bot -> Chọn Tướng 3-chọn-1 ->
    /// Bàn Đấu 2.5D (quăng bài, dây lụa, cuộn lụa lore, Trọng Tài, Game Feel & Audio 48kHz) -> Tổng Kết Ván.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class CuuChauMatchDirector : MonoBehaviour
    {
        private const string DeviceIdPrefsKey = "cuuchau_client_device_id_v1";
        private const string DefaultDisplayName = "Hiệp Khách";

        private static readonly Color DamageNumberColor = new(0.95f, 0.28f, 0.22f, 1f);
        private static readonly Color HealNumberColor = new(0.28f, 0.88f, 0.56f, 1f);
        private static readonly Color DamageRingColor = new(0.90f, 0.26f, 0.18f, 0.92f);
        private static readonly Color HealRingColor = new(0.32f, 0.86f, 0.58f, 0.88f);

        [Header("Tài Nguyên & Liên Kết Sân Khấu (Tự Nạp Khi Mở Scene)")]
        [SerializeField] private VisualCatalogSO _catalog;
        [SerializeField] private TMP_FontAsset _serifFont;
        [SerializeField] private TMP_FontAsset _sansFont;
        [SerializeField] private TMP_FontAsset _monoFont;
        [SerializeField] private Material _burnMaterial;
        [SerializeField] private Material _silkMaterial;

        [SerializeField] private LkdfSidecarProcess _sidecar;
        [SerializeField] private RoomWsClient _wsClient;
        [SerializeField] private CuuChauAudioController _audioController;
        [SerializeField] private ArenaTableController _tableController;
        [SerializeField] private ArenaHudController _hudController;
        [SerializeField] private ArcFanHandLayout _handLayout;
        [SerializeField] private SilkTargetArrow _silkArrow;
        [SerializeField] private SilkScrollTooltipView _tooltipView;
        [SerializeField] private ArenaFeelController _feelController;
        [SerializeField] private VfxBurstOverlay _vfxOverlay;

        [SerializeField] private LobbyHallView _lobbyHall;
        [SerializeField] private WaitingRoomView _waitingRoom;
        [SerializeField] private HeroDraftModalView _heroDraftModal;
        [SerializeField] private RefereeModalView _refereeModal;
        [SerializeField] private HandbookModalView _handbookModal;
        [SerializeField] private MatchSummaryModalView _matchSummaryModal;
        [SerializeField] private RectTransform _stageRect;

        private LkdfApiClient _apiClient;
        private string _activeServerBaseUrl = string.Empty;
        private bool _wsAuthenticated;
        private bool _initialized;
        private bool _eventsWired;
        private bool _shuttingDown;

        private string _activeMatchId = string.Empty;
        private int _lastTurnSeat = -1;
        private string _lastHandSignature = string.Empty;
        private bool _battleMusicStarted;
        private bool _refereeOpen;
        private bool _handbookOpen;

        private string _selectedCardId;
        private int _selectedTargetSeat = -1;
        private readonly HashSet<int> _multiSelectedSeats = new();
        private readonly List<string> _multiSelectedCardIds = new();
        private readonly Dictionary<int, int> _lastHpBySeat = new();
        private TaskCompletionSource<bool> _sidecarStartInFlight;
        private string _activeProfileRoomCode = string.Empty;

        public bool AutoStartOnStart { get; set; } = true;
        public bool SidecarReady { get; private set; }
        public string CurrentRoomCode { get; private set; } = string.Empty;
        public string MyUserId { get; private set; } = string.Empty;
        public string MyDisplayName { get; private set; } = DefaultDisplayName;
        public string LastError { get; private set; } = string.Empty;
        public RoomViewerPayload LatestPayload { get; private set; }
        public LkdfApiClient ApiClient => _apiClient;

        public event Action<RoomViewerPayload> OnPayloadUpdated;

        public void ConfigureSerializedAssets(
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont,
            Material burnMaterial,
            Material silkMaterial)
        {
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;
            _burnMaterial = burnMaterial;
            _silkMaterial = silkMaterial;
        }

        public void AssignSceneReferences(
            VisualCatalogSO catalog,
            LkdfSidecarProcess sidecar,
            RoomWsClient wsClient,
            CuuChauAudioController audioController,
            ArenaTableController tableController,
            ArenaHudController hudController,
            ArcFanHandLayout handLayout,
            SilkTargetArrow silkArrow,
            SilkScrollTooltipView tooltipView,
            ArenaFeelController feelController,
            VfxBurstOverlay vfxOverlay,
            LobbyHallView lobbyHall,
            WaitingRoomView waitingRoom,
            HeroDraftModalView heroDraftModal,
            RefereeModalView refereeModal,
            HandbookModalView handbookModal,
            MatchSummaryModalView matchSummaryModal,
            RectTransform stageRect)
        {
            _catalog = catalog;
            _sidecar = sidecar;
            _wsClient = wsClient;
            _audioController = audioController;
            _tableController = tableController;
            _hudController = hudController;
            _handLayout = handLayout;
            _silkArrow = silkArrow;
            _tooltipView = tooltipView;
            _feelController = feelController;
            _vfxOverlay = vfxOverlay;
            _lobbyHall = lobbyHall;
            _waitingRoom = waitingRoom;
            _heroDraftModal = heroDraftModal;
            _refereeModal = refereeModal;
            _handbookModal = handbookModal;
            _matchSummaryModal = matchSummaryModal;
            _stageRect = stageRect;
        }

        private void Awake()
        {
            if (!_initialized && _catalog != null)
            {
                BuildViewsFromSerializedAssets();
            }
        }

        public void BuildViewsFromSerializedAssets()
        {
            if (_tableController != null) _tableController.InitializeArena(_catalog, _serifFont, _sansFont, _monoFont);
            if (_hudController != null) _hudController.InitializeHud(_catalog, _serifFont, _sansFont, _monoFont);
            if (_handLayout != null)
            {
                _handLayout.InitializeFan(_catalog, _serifFont, _sansFont, _monoFont);
                if (_burnMaterial != null) _handLayout.SetSharedBurnMaterial(_burnMaterial);
            }
            if (_silkArrow != null)
            {
                _silkArrow.InitializeArrow(_catalog, _silkMaterial);
                _silkArrow.Hide();
            }
            if (_tooltipView != null)
            {
                _tooltipView.InitializeTooltip(_catalog, _serifFont, _sansFont);
                _tooltipView.Hide();
            }
            if (_vfxOverlay != null) _vfxOverlay.InitializeOverlay(_serifFont, _monoFont);
            if (_feelController != null && _stageRect != null) _feelController.SetShakeTarget(_stageRect);

            if (_lobbyHall != null) _lobbyHall.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (_waitingRoom != null) _waitingRoom.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (_heroDraftModal != null) _heroDraftModal.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (_refereeModal != null) _refereeModal.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (_handbookModal != null) _handbookModal.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (_matchSummaryModal != null) _matchSummaryModal.InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            InitializeDirector(
                _catalog, _sidecar, _wsClient, _audioController,
                _tableController, _hudController, _handLayout, _silkArrow, _tooltipView, _feelController, _vfxOverlay,
                _lobbyHall, _waitingRoom, _heroDraftModal, _refereeModal, _handbookModal, _matchSummaryModal, _stageRect);
        }

        public void InitializeDirector(
            VisualCatalogSO catalog,
            LkdfSidecarProcess sidecar,
            RoomWsClient wsClient,
            CuuChauAudioController audioController,
            ArenaTableController tableController,
            ArenaHudController hudController,
            ArcFanHandLayout handLayout,
            SilkTargetArrow silkArrow,
            SilkScrollTooltipView tooltipView,
            ArenaFeelController feelController,
            VfxBurstOverlay vfxOverlay,
            LobbyHallView lobbyHall,
            WaitingRoomView waitingRoom,
            HeroDraftModalView heroDraftModal,
            RefereeModalView refereeModal,
            HandbookModalView handbookModal,
            MatchSummaryModalView matchSummaryModal,
            RectTransform stageRect)
        {
            _catalog = catalog;
            _sidecar = sidecar;
            _wsClient = wsClient;
            _audioController = audioController;
            _tableController = tableController;
            _hudController = hudController;
            _handLayout = handLayout;
            _silkArrow = silkArrow;
            _tooltipView = tooltipView;
            _feelController = feelController;
            _vfxOverlay = vfxOverlay;
            _lobbyHall = lobbyHall;
            _waitingRoom = waitingRoom;
            _heroDraftModal = heroDraftModal;
            _refereeModal = refereeModal;
            _handbookModal = handbookModal;
            _matchSummaryModal = matchSummaryModal;
            _stageRect = stageRect;

            if (_audioController != null && _catalog != null)
            {
                _audioController.SetCatalog(_catalog);
            }

            WireEvents();
            _initialized = true;

            ShowLobbyHallState();
            if (Application.isPlaying)
            {
                _audioController?.PlayLobbyMusic();
            }
        }

        private void Start()
        {
            if (!_initialized) return;
            if (AutoStartOnStart && !SidecarReady)
            {
                _ = EnsureSidecarStartedAsync();
            }
        }

        private void Update()
        {
            if (!_initialized) return;
            HandleHotkeys();
        }

        private void OnDestroy()
        {
            UnwireEvents();
            if (!_shuttingDown)
            {
                ShutdownSidecar();
            }
        }

        public async Awaitable<bool> EnsureSidecarStartedAsync()
        {
            _shuttingDown = false;
            if (_sidecar == null)
            {
                LastError = "Thiếu thành phần LkdfSidecarProcess trên sân khấu.";
                _lobbyHall?.SetServerStatus(false, LastError, canRetry: true);
                return false;
            }

            if (SidecarReady && _sidecar.IsReady && _apiClient != null)
            {
                _lobbyHall?.SetServerStatus(true, "Máy chủ 112 lá sẵn sàng", canRetry: false);
                return true;
            }

            if (_sidecarStartInFlight != null)
            {
                return await _sidecarStartInFlight.Task;
            }

            var tcs = new TaskCompletionSource<bool>();
            _sidecarStartInFlight = tcs;
            try
            {
                LastError = string.Empty;
                _lobbyHall?.SetServerStatus(false, "Đang khởi động máy chủ ngầm...", canRetry: false);

                bool started = await _sidecar.StartSidecarAsync(destroyCancellationToken);
                if (!started)
                {
                    SidecarReady = false;
                    LastError = string.IsNullOrEmpty(_sidecar.LastError)
                        ? "Không thể khởi động máy chủ ngầm Cửu Châu."
                        : _sidecar.LastError;
                    _lobbyHall?.SetServerStatus(false, LastError, canRetry: true);
                    tcs.TrySetResult(false);
                    return false;
                }

                SidecarReady = true;
                _activeServerBaseUrl = _sidecar.BaseHttpUrl;
                _apiClient = new LkdfApiClient(_activeServerBaseUrl);
                _lobbyHall?.SetServerStatus(true, "Máy chủ 112 lá sẵn sàng", canRetry: false);
                tcs.TrySetResult(true);
                return true;
            }
            catch (Exception ex)
            {
                SidecarReady = false;
                LastError = ex.Message;
                _lobbyHall?.SetServerStatus(false, LastError, canRetry: true);
                tcs.TrySetResult(false);
                return false;
            }
            finally
            {
                if (ReferenceEquals(_sidecarStartInFlight, tcs))
                {
                    _sidecarStartInFlight = null;
                }
            }
        }

        private async Awaitable ClearStaleRoomIfNeededAsync()
        {
            if (_apiClient == null || string.IsNullOrEmpty(_activeProfileRoomCode)) return;
            string staleRoom = _activeProfileRoomCode;
            _activeProfileRoomCode = string.Empty;
            try
            {
                await _apiClient.ApplyRefereeActionAsync(staleRoom, "ABORT_MATCH");
            }
            catch (Exception)
            {
                // Best effort if match already ended or lobby
            }
            try
            {
                await _apiClient.LeaveRoomAsync(staleRoom);
            }
            catch (Exception)
            {
                // Best effort if host left via abort
            }
        }

        public async Awaitable<bool> StartSoloVsBotsAsync(int targetSeats, string displayName)
        {
            _lobbyHall?.SetBusy(true, "Đang mở bàn đấu với máy...");
            try
            {
                LastError = string.Empty;
                if (!await EnsureSidecarStartedAsync()) return false;
                if (!await EnsureAuthenticatedAsync(_sidecar.BaseHttpUrl, displayName)) return false;

                await ClearStaleRoomIfNeededAsync();

                RoomViewerPayload created;
                try
                {
                    created = await _apiClient.CreateRoomAsync("STANDARD");
                }
                catch (ApiErrorException apiEx) when (apiEx.ErrorCode == "ACTIVE_ROOM_EXISTS")
                {
                    _apiClient.SetSessionToken(null);
                    if (!await EnsureAuthenticatedAsync(_sidecar.BaseHttpUrl, displayName)) return false;
                    await ClearStaleRoomIfNeededAsync();
                    created = await _apiClient.CreateRoomAsync("STANDARD");
                }

                if (created?.RoomState == null)
                {
                    SetError("Không thể tạo phòng đấu mới.");
                    return false;
                }

                CurrentRoomCode = created.RoomState.RoomCode;
                if (_wsClient != null)
                {
                    await _wsClient.SendSubscribeRoomAsync(CurrentRoomCode);
                }

                int clampedSeats = Mathf.Clamp(targetSeats, 4, 8);
                await _apiClient.FillBotsAsync(CurrentRoomCode, clampedSeats);

                RoomViewerPayload started = await _apiClient.StartMatchAsync(CurrentRoomCode);
                ApplyRoomPayload(started, "SOLO_MATCH_STARTED");
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
            finally
            {
                _lobbyHall?.SetBusy(false);
            }
        }

        public async Awaitable<bool> HostLanRoomAsync(string displayName)
        {
            _lobbyHall?.SetBusy(true, "Đang mở bàn LAN / VPN...");
            try
            {
                LastError = string.Empty;
                if (!await EnsureSidecarStartedAsync()) return false;
                if (!await EnsureAuthenticatedAsync(_sidecar.BaseHttpUrl, displayName)) return false;

                RoomViewerPayload created = await _apiClient.CreateRoomAsync("STANDARD");
                if (created?.RoomState == null)
                {
                    SetError("Không thể mở bàn LAN.");
                    return false;
                }

                CurrentRoomCode = created.RoomState.RoomCode;
                if (_wsClient != null)
                {
                    await _wsClient.SendSubscribeRoomAsync(CurrentRoomCode);
                }

                ApplyRoomPayload(created, "HOST_LAN_CREATED");
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
            finally
            {
                _lobbyHall?.SetBusy(false);
            }
        }

        public async Awaitable<bool> JoinRoomByInviteAsync(string serverBaseUrl, string roomCode, string displayName)
        {
            _lobbyHall?.SetBusy(true, "Đang vào phòng bạn bè...");
            try
            {
                LastError = string.Empty;
                string normalizedCode = (roomCode ?? string.Empty).Trim().ToUpperInvariant();
                if (normalizedCode.Length != 6)
                {
                    SetError("Mã phòng phải gồm đúng 6 ký tự chữ/số.");
                    return false;
                }

                string resolvedHttpUrl = NormalizeServerBaseUrl(serverBaseUrl);
                if (string.IsNullOrEmpty(resolvedHttpUrl))
                {
                    if (!await EnsureSidecarStartedAsync()) return false;
                    resolvedHttpUrl = _sidecar.BaseHttpUrl;
                }

                if (!await EnsureAuthenticatedAsync(resolvedHttpUrl, displayName)) return false;

                RoomViewerPayload joined = await _apiClient.JoinRoomAsync(normalizedCode);
                if (joined?.RoomState == null)
                {
                    SetError("Không thể tham gia phòng.");
                    return false;
                }

                CurrentRoomCode = joined.RoomState.RoomCode;
                if (_wsClient != null)
                {
                    await _wsClient.SendSubscribeRoomAsync(CurrentRoomCode);
                }

                ApplyRoomPayload(joined, "JOINED_ROOM");
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
            finally
            {
                _lobbyHall?.SetBusy(false);
            }
        }

        public async Awaitable<bool> SelectHeroAsync(string heroId)
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode) || string.IsNullOrEmpty(heroId))
            {
                SetError("Chưa sẵn sàng chọn hiệp khách.");
                return false;
            }

            try
            {
                RoomViewerPayload res = await _apiClient.SelectHeroAsync(CurrentRoomCode, heroId);
                ApplyRoomPayload(res, "HERO_SELECTED");
                _audioController?.PlaySpatialSfx("sfx-click", 0f);
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
        }

        public async Awaitable<bool> SendRefereeActionAsync(string actionType)
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode) || string.IsNullOrEmpty(actionType))
            {
                SetError("Chưa có phòng đấu hoạt động để điều hành Trọng Tài.");
                return false;
            }

            try
            {
                RoomViewerPayload res = await _apiClient.ApplyRefereeActionAsync(CurrentRoomCode, actionType);
                ApplyRoomPayload(res, $"REFEREE:{actionType}");
                _audioController?.PlaySpatialSfx("sfx-click", 0f);
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
        }

        public async Awaitable<bool> SendEndPlayPhaseAsync()
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (_wsClient == null || string.IsNullOrEmpty(CurrentRoomCode) || pv == null)
            {
                SetError("Không thể kết thúc pha xuất chiêu lúc này.");
                return false;
            }

            try
            {
                ClearSelectionAndArrow();
                await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                {
                    type = "END_PLAY_PHASE",
                    seatIndex = pv.ViewerSeatIndex,
                });
                _audioController?.PlaySpatialSfx("sfx-click", 0f);
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
        }

        public async Awaitable<bool> ReturnToLobbyAsync()
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode))
            {
                ShowLobbyHallState();
                return false;
            }

            try
            {
                RoomViewerPayload res = await _apiClient.ReturnLobbyAsync(CurrentRoomCode);
                ResetMatchTracking();
                ApplyRoomPayload(res, "RETURN_LOBBY");
                return true;
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
                return false;
            }
        }

        public void OpenRefereeModal()
        {
            if (_refereeModal == null) return;
            _refereeOpen = true;
            _refereeModal.SetVisible(true);
            if (LatestPayload?.RoomState != null)
            {
                _refereeModal.BindRoomState(LatestPayload.RoomState, MyUserId);
            }
        }

        public void OpenHandbookModal()
        {
            if (_handbookModal == null) return;
            _handbookOpen = true;
            _handbookModal.SetVisible(true);
            _handbookModal.SelectTab(0);
        }

        public void ShutdownSidecar()
        {
            _shuttingDown = true;
            _wsAuthenticated = false;
            if (_wsClient != null)
            {
                _wsClient.Disconnect();
            }
            if (_sidecar != null)
            {
                _sidecar.StopSidecar();
            }
            SidecarReady = false;
        }

        private async Awaitable<bool> EnsureAuthenticatedAsync(string serverBaseUrl, string displayName)
        {
            string trimmedBase = serverBaseUrl.TrimEnd('/');
            string normalizedName = NormalizeDisplayName(displayName);

            bool serverChanged = !string.Equals(_activeServerBaseUrl, trimmedBase, StringComparison.OrdinalIgnoreCase);
            bool nameChanged = !string.Equals(MyDisplayName, normalizedName, StringComparison.Ordinal);

            if (_apiClient == null)
            {
                _apiClient = new LkdfApiClient(trimmedBase);
            }
            else if (serverChanged)
            {
                _apiClient.SetBaseUrl(trimmedBase);
                _apiClient.SetSessionToken(null);
            }

            _activeServerBaseUrl = trimmedBase;

            if (string.IsNullOrEmpty(_apiClient.SessionToken) || serverChanged || nameChanged)
            {
                string deviceId = GetOrCreateDeviceId();
                GuestAuthResponse auth = await _apiClient.LoginGuestAsync(deviceId, normalizedName);
                if (auth == null || string.IsNullOrEmpty(auth.SessionToken) || auth.Profile == null)
                {
                    SetError("Đăng nhập phiên khách thất bại.");
                    return false;
                }
                MyUserId = auth.Profile.UserId;
                MyDisplayName = auth.Profile.DisplayName;
                _activeProfileRoomCode = auth.Profile.ActiveRoomCode ?? string.Empty;
            }

            if (_wsClient != null && (!_wsClient.IsConnected || serverChanged || !_wsAuthenticated))
            {
                _wsAuthenticated = false;
                string wsUrl = BuildWsUrl(trimmedBase);
                await _wsClient.ConnectAndAuthenticateAsync(wsUrl, _apiClient.SessionToken, takeover: true);

                float deadline = Time.realtimeSinceStartup + 2.5f;
                while (!_wsAuthenticated && Time.realtimeSinceStartup < deadline)
                {
                    if (destroyCancellationToken.IsCancellationRequested) return false;
                    await Awaitable.WaitForSecondsAsync(0.05f, destroyCancellationToken);
                }
            }

            return true;
        }

        private void WireEvents()
        {
            UnwireEvents();
            _eventsWired = true;

            if (_wsClient != null)
            {
                _wsClient.OnAuthOk += HandleWsAuthOk;
                _wsClient.OnRoomState += HandleWsRoomState;
                _wsClient.OnActionError += HandleWsActionError;
                _wsClient.OnMatchEnded += HandleWsMatchEnded;
                _wsClient.OnDisconnected += HandleWsDisconnected;
            }

            if (_lobbyHall != null)
            {
                _lobbyHall.OnPlaySoloRequested += HandlePlaySoloRequested;
                _lobbyHall.OnHostLanRequested += HandleHostLanRequested;
                _lobbyHall.OnJoinRoomRequested += HandleJoinRoomRequested;
                _lobbyHall.OnOpenHandbookRequested += OpenHandbookModal;
                _lobbyHall.OnRetrySidecarRequested += HandleRetrySidecarRequested;
            }

            if (_waitingRoom != null)
            {
                _waitingRoom.OnToggleReadyRequested += HandleToggleReadyRequested;
                _waitingRoom.OnFillBotsRequested += HandleFillBotsRequested;
                _waitingRoom.OnStartMatchRequested += HandleStartMatchRequested;
                _waitingRoom.OnLeaveRoomRequested += HandleLeaveRoomRequested;
            }

            if (_heroDraftModal != null)
            {
                _heroDraftModal.OnHeroSelected += HandleHeroSelected;
            }

            if (_refereeModal != null)
            {
                _refereeModal.OnRefereeActionRequested += HandleRefereeActionRequested;
                _refereeModal.OnCloseRequested += CloseRefereeModal;
            }

            if (_handbookModal != null)
            {
                _handbookModal.OnCloseRequested += CloseHandbookModal;
            }

            if (_matchSummaryModal != null)
            {
                _matchSummaryModal.OnReturnLobbyRequested += HandleReturnLobbyRequested;
                _matchSummaryModal.OnBackToHallRequested += HandleBackToHallRequested;
            }

            if (_tableController != null)
            {
                _tableController.OnSeatClicked += HandleSeatClicked;
                _tableController.OnEquipmentHovered += HandleEquipmentHovered;
                _tableController.OnEquipmentHoverExited += HandleEquipmentHoverExited;
            }

            if (_hudController != null)
            {
                _hudController.OnReducedMotionChanged += HandleReducedMotionChanged;
                _hudController.OnOpenRefereeRequested += OpenRefereeModal;
                _hudController.OnOpenHandbookRequested += OpenHandbookModal;
            }

            if (_handLayout != null)
            {
                _handLayout.OnCardHovered += HandleHandCardHovered;
                _handLayout.OnCardClicked += HandleHandCardClicked;
                _handLayout.OnCardDragMoved += HandleHandCardDragMoved;
                _handLayout.OnCardReleased += HandleHandCardReleased;
            }
        }

        private void UnwireEvents()
        {
            if (!_eventsWired) return;
            _eventsWired = false;

            if (_wsClient != null)
            {
                _wsClient.OnAuthOk -= HandleWsAuthOk;
                _wsClient.OnRoomState -= HandleWsRoomState;
                _wsClient.OnActionError -= HandleWsActionError;
                _wsClient.OnMatchEnded -= HandleWsMatchEnded;
                _wsClient.OnDisconnected -= HandleWsDisconnected;
            }

            if (_lobbyHall != null)
            {
                _lobbyHall.OnPlaySoloRequested -= HandlePlaySoloRequested;
                _lobbyHall.OnHostLanRequested -= HandleHostLanRequested;
                _lobbyHall.OnJoinRoomRequested -= HandleJoinRoomRequested;
                _lobbyHall.OnOpenHandbookRequested -= OpenHandbookModal;
                _lobbyHall.OnRetrySidecarRequested -= HandleRetrySidecarRequested;
            }

            if (_waitingRoom != null)
            {
                _waitingRoom.OnToggleReadyRequested -= HandleToggleReadyRequested;
                _waitingRoom.OnFillBotsRequested -= HandleFillBotsRequested;
                _waitingRoom.OnStartMatchRequested -= HandleStartMatchRequested;
                _waitingRoom.OnLeaveRoomRequested -= HandleLeaveRoomRequested;
            }

            if (_heroDraftModal != null)
            {
                _heroDraftModal.OnHeroSelected -= HandleHeroSelected;
            }

            if (_refereeModal != null)
            {
                _refereeModal.OnRefereeActionRequested -= HandleRefereeActionRequested;
                _refereeModal.OnCloseRequested -= CloseRefereeModal;
            }

            if (_handbookModal != null)
            {
                _handbookModal.OnCloseRequested -= CloseHandbookModal;
            }

            if (_matchSummaryModal != null)
            {
                _matchSummaryModal.OnReturnLobbyRequested -= HandleReturnLobbyRequested;
                _matchSummaryModal.OnBackToHallRequested -= HandleBackToHallRequested;
            }

            if (_tableController != null)
            {
                _tableController.OnSeatClicked -= HandleSeatClicked;
                _tableController.OnEquipmentHovered -= HandleEquipmentHovered;
                _tableController.OnEquipmentHoverExited -= HandleEquipmentHoverExited;
            }

            if (_hudController != null)
            {
                _hudController.OnReducedMotionChanged -= HandleReducedMotionChanged;
                _hudController.OnOpenRefereeRequested -= OpenRefereeModal;
                _hudController.OnOpenHandbookRequested -= OpenHandbookModal;
            }

            if (_handLayout != null)
            {
                _handLayout.OnCardHovered -= HandleHandCardHovered;
                _handLayout.OnCardClicked -= HandleHandCardClicked;
                _handLayout.OnCardDragMoved -= HandleHandCardDragMoved;
                _handLayout.OnCardReleased -= HandleHandCardReleased;
            }
        }

        private void HandleWsAuthOk(string userId, string displayName)
        {
            _wsAuthenticated = true;
            if (!string.IsNullOrEmpty(userId)) MyUserId = userId;
            if (!string.IsNullOrEmpty(displayName)) MyDisplayName = displayName;
        }

        private void HandleWsRoomState(RoomViewerPayload payload, string eventName)
        {
            ApplyRoomPayload(payload, eventName);
        }

        private void HandleWsActionError(string code, string messageVi)
        {
            SetError($"[{code}] {messageVi}");
            _hudController?.AppendLogLine($"[Thông báo] {messageVi}");
        }

        private void HandleWsMatchEnded(string winningFaction, List<string> winnerUserIds)
        {
            if (LatestPayload?.PlayerView != null)
            {
                LatestPayload.PlayerView.WinningFaction = winningFaction;
                LatestPayload.PlayerView.WinnerUserIds = winnerUserIds ?? new List<string>();
                if (LatestPayload.RoomState != null) LatestPayload.RoomState.Status = "FINISHED";
                ApplyRoomPayload(LatestPayload, "MATCH_ENDED");
            }
        }

        private void HandleWsDisconnected(string reason)
        {
            _wsAuthenticated = false;
            if (!_shuttingDown && !string.IsNullOrEmpty(reason))
            {
                _hudController?.AppendLogLine($"[Mạng] {reason}");
            }
        }

        private void HandlePlaySoloRequested(int targetSeats, string displayName) =>
            _ = StartSoloVsBotsAsync(targetSeats, displayName);

        private void HandleHostLanRequested(string displayName) =>
            _ = HostLanRoomAsync(displayName);

        private void HandleJoinRoomRequested(string serverUrl, string roomCode, string displayName) =>
            _ = JoinRoomByInviteAsync(serverUrl, roomCode, displayName);

        private void HandleRetrySidecarRequested() =>
            _ = EnsureSidecarStartedAsync();

        private void HandleToggleReadyRequested(bool ready) =>
            _ = ToggleReadyAsync(ready);

        private void HandleFillBotsRequested(int targetSeats) =>
            _ = FillBotsAsync(targetSeats);

        private void HandleStartMatchRequested() =>
            _ = StartMatchInRoomAsync();

        private void HandleLeaveRoomRequested() =>
            _ = LeaveRoomAsync();

        private void HandleHeroSelected(string heroId) =>
            _ = SelectHeroAsync(heroId);

        private void HandleRefereeActionRequested(string actionType) =>
            _ = SendRefereeActionAsync(actionType);

        private void HandleReturnLobbyRequested() =>
            _ = ReturnToLobbyAsync();

        private void HandleBackToHallRequested() =>
            _ = LeaveRoomAsync();

        private async Awaitable ToggleReadyAsync(bool isReady)
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode)) return;
            try
            {
                RoomViewerPayload res = await _apiClient.SetReadyAsync(CurrentRoomCode, isReady);
                ApplyRoomPayload(res, "READY_UPDATED");
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
            }
        }

        private async Awaitable FillBotsAsync(int targetSeats)
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode)) return;
            try
            {
                RoomViewerPayload res = await _apiClient.FillBotsAsync(CurrentRoomCode, Mathf.Clamp(targetSeats, 4, 8));
                ApplyRoomPayload(res, "BOTS_FILLED");
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
            }
        }

        private async Awaitable StartMatchInRoomAsync()
        {
            if (_apiClient == null || string.IsNullOrEmpty(CurrentRoomCode)) return;
            try
            {
                RoomViewerPayload res = await _apiClient.StartMatchAsync(CurrentRoomCode);
                ApplyRoomPayload(res, "MATCH_STARTED");
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
            }
        }

        private async Awaitable LeaveRoomAsync()
        {
            string roomCodeToLeave = CurrentRoomCode;
            if (!string.IsNullOrEmpty(roomCodeToLeave) && !string.IsNullOrEmpty(_activeServerBaseUrl) && _apiClient != null && !string.IsNullOrEmpty(_apiClient.SessionToken))
            {
                try
                {
                    await PostLeaveRoomDirectAsync(_activeServerBaseUrl, roomCodeToLeave, _apiClient.SessionToken);
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[CuuChauMatchDirector] Rời phòng cảnh báo: {ex.Message}");
                }
            }

            CurrentRoomCode = string.Empty;
            LatestPayload = null;
            ResetMatchTracking();
            ShowLobbyHallState();
            if (Application.isPlaying)
            {
                _audioController?.PlayLobbyMusic();
            }
        }

        private void ApplyRoomPayload(RoomViewerPayload payload, string eventName)
        {
            if (payload == null) return;
            LatestPayload = payload;
            if (payload.RoomState != null && !string.IsNullOrEmpty(payload.RoomState.RoomCode))
            {
                CurrentRoomCode = payload.RoomState.RoomCode;
            }

            RoomStateDto room = payload.RoomState;
            PlayerViewStateDto pv = payload.PlayerView;

            if (_refereeOpen && _refereeModal != null && room != null)
            {
                _refereeModal.BindRoomState(room, MyUserId);
            }

            if (room == null)
            {
                ShowLobbyHallState();
                OnPayloadUpdated?.Invoke(payload);
                return;
            }

            if (room.Status == "LOBBY")
            {
                ResetMatchTracking();
                _lobbyHall?.SetVisible(false);
                _waitingRoom?.SetVisible(true);
                _heroDraftModal?.SetVisible(false);
                _matchSummaryModal?.SetVisible(false);
                SetArenaDimmedForOverlay(true);
                SetHandVisible(false);
                _silkArrow?.Hide();
                _tooltipView?.Hide();
                _waitingRoom?.BindRoomState(room, MyUserId, BuildLanInviteUrl(room.RoomCode));
                _audioController?.PlayLobbyMusic();
            }
            else if (room.Status == "FINISHED" || pv?.TurnPhase == "GAME_OVER")
            {
                _lobbyHall?.SetVisible(false);
                _waitingRoom?.SetVisible(false);
                _heroDraftModal?.SetVisible(false);
                _matchSummaryModal?.SetVisible(true);
                SetArenaDimmedForOverlay(true);
                SetHandVisible(false);
                _silkArrow?.Hide();
                _tooltipView?.Hide();
                if (pv != null)
                {
                    _tableController?.UpdateFromState(pv);
                    _hudController?.UpdateFromState(pv);
                    _matchSummaryModal?.BindSummary(pv);
                }
            }
            else if (room.Status == "IN_GAME" && pv != null && pv.HeroDraft != null &&
                (string.Equals(pv.TurnPhase, "HERO_SELECT", StringComparison.Ordinal) ||
                 !string.Equals(pv.HeroDraft.Stage, "COMPLETED", StringComparison.Ordinal)))
            {
                _lobbyHall?.SetVisible(false);
                _waitingRoom?.SetVisible(false);
                _matchSummaryModal?.SetVisible(false);
                _heroDraftModal?.SetVisible(true);
                SetArenaDimmedForOverlay(true);
                SetHandVisible(false);
                _silkArrow?.Hide();
                _tooltipView?.Hide();
                _heroDraftModal?.BindDraft(pv.HeroDraft, pv.MySeat, ComputeRemainingSeconds(payload));
            }
            else if (room.Status == "IN_GAME" && pv != null)
            {
                _lobbyHall?.SetVisible(false);
                _waitingRoom?.SetVisible(false);
                _heroDraftModal?.SetVisible(false);
                _matchSummaryModal?.SetVisible(false);
                SetArenaDimmedForOverlay(false);
                SetHandVisible(true);

                SyncCombatMatchState(payload, pv);
            }

            OnPayloadUpdated?.Invoke(payload);
        }

        private void SyncCombatMatchState(RoomViewerPayload payload, PlayerViewStateDto pv)
        {
            if (_activeMatchId != pv.MatchId)
            {
                _activeMatchId = pv.MatchId ?? string.Empty;
                _lastHpBySeat.Clear();
                _lastTurnSeat = -1;
                _lastHandSignature = string.Empty;
                _battleMusicStarted = false;
                ClearSelectionAndArrow();
            }

            bool isClimax = IsMatchInClimax(pv);
            if (!_battleMusicStarted)
            {
                _battleMusicStarted = true;
                _audioController?.PlayBattleMusic(isClimax);
            }
            else
            {
                _audioController?.SetClimaxActive(isClimax);
            }

            _tableController?.UpdateFromState(pv);
            _hudController?.UpdateFromState(pv);

            if (_hudController?.FuseTimer != null)
            {
                float remaining = ComputeRemainingSeconds(payload);
                string phaseBanner = CuuChauCombatRules.BuildPhaseBannerVi(pv);
                if (remaining > 0.05f)
                {
                    _hudController.FuseTimer.StartCountdown(remaining, phaseBanner);
                }
                else
                {
                    _hudController.FuseTimer.SetProgress(0f, phaseBanner);
                }
                _hudController.FuseTimer.SetPaused(payload.RoomState?.IsTimerPaused == true);
            }

            EmitHpAndTurnFeedback(pv);
            SyncHandAndActionButtons(pv);
        }

        private void EmitHpAndTurnFeedback(PlayerViewStateDto pv)
        {
            if (pv.Players != null)
            {
                int totalSeats = pv.Players.Count;
                for (int i = 0; i < totalSeats; i++)
                {
                    PublicPlayerViewDto p = pv.Players[i];
                    if (_lastHpBySeat.TryGetValue(p.SeatIndex, out int prevHp))
                    {
                        int delta = p.Hp - prevHp;
                        if (delta < 0)
                        {
                            _feelController?.TriggerActionFeel(ActionFeelKind.HitSlash);
                            SpawnSeatVfx(p.SeatIndex, delta.ToString(), DamageNumberColor, DamageRingColor);
                            _audioController?.PlaySpatialSfx("sfx-damage", ComputeSeatPanStereo(p.SeatIndex, pv.ViewerSeatIndex, totalSeats));
                        }
                        else if (delta > 0)
                        {
                            _feelController?.TriggerActionFeel(ActionFeelKind.HealJade);
                            SpawnSeatVfx(p.SeatIndex, $"+{delta}", HealNumberColor, HealRingColor);
                            _audioController?.PlaySpatialSfx("sfx-dao", ComputeSeatPanStereo(p.SeatIndex, pv.ViewerSeatIndex, totalSeats));
                        }
                    }
                    _lastHpBySeat[p.SeatIndex] = p.Hp;
                }
            }

            if (_lastTurnSeat != pv.CurrentTurnSeat)
            {
                bool hadPreviousTurn = _lastTurnSeat >= 0;
                _lastTurnSeat = pv.CurrentTurnSeat;
                if (hadPreviousTurn && pv.ActiveInterrupt == null)
                {
                    _feelController?.TriggerActionFeel(ActionFeelKind.TurnChime);
                    if (pv.CurrentTurnSeat == pv.ViewerSeatIndex)
                    {
                        _audioController?.PlaySpatialSfx("sfx-click", 0f);
                    }
                }
            }
        }

        private void SyncHandAndActionButtons(PlayerViewStateDto pv)
        {
            PublicInterruptViewDto intr = pv.ActiveInterrupt;
            int mySeat = pv.ViewerSeatIndex;
            bool isMyTurn = pv.CurrentTurnSeat == mySeat;

            List<CardInstanceDto> displayCards = pv.MyHand ?? new List<CardInstanceDto>();
            bool isHarvestPick = intr != null && intr.Kind == "WAIT_HARVEST_PICK" &&
                                 CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat) == mySeat;
            if (isHarvestPick && pv.HarvestPool != null && pv.HarvestPool.Count > 0)
            {
                displayCards = pv.HarvestPool;
            }

            Func<CardInstanceDto, bool> playablePredicate = card =>
            {
                if (intr != null)
                {
                    int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat);
                    return actorSeat == mySeat && CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, card);
                }
                if (isMyTurn && pv.TurnPhase == "PLAY")
                {
                    return CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, card);
                }
                if (isMyTurn && pv.TurnPhase == "DISCARD")
                {
                    return true;
                }
                return false;
            };

            string sig = BuildHandSignature(displayCards, pv.TurnPhase, pv.CurrentTurnSeat, intr?.Id, intr?.Kind);
            if (_handLayout != null && _lastHandSignature != sig)
            {
                _lastHandSignature = sig;
                _handLayout.SetCards(displayCards, playablePredicate);
                PruneSelections(displayCards);
            }

            UpdateActionBarForState(pv, intr);
        }

        private void UpdateActionBarForState(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            if (_hudController == null) return;

            int mySeat = pv.ViewerSeatIndex;
            if (intr != null)
            {
                int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat);
                if (actorSeat != mySeat)
                {
                    string actorName = CuuChauCombatRules.ResolveSeatHeroName(pv, actorSeat);
                    _hudController.SetPrimaryAction($"Chờ {actorName} phản ứng", false, null);
                    _hudController.ShowSecondarySkip(false);
                    _tableController?.SetValidTargetSeats(null);
                    return;
                }

                ConfigureInterruptActionBar(pv, intr);
                return;
            }

            if (pv.CurrentTurnSeat != mySeat)
            {
                string turnName = CuuChauCombatRules.ResolveSeatHeroName(pv, pv.CurrentTurnSeat);
                _hudController.SetPrimaryAction($"Đang chờ · {turnName}", false, null);
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                return;
            }

            if (pv.TurnPhase == "DRAW")
            {
                _hudController.SetPrimaryAction("Rút Bài Khởi Đầu", true, () => _ = SendSimpleActionAsync(new { type = "DRAW_CARDS", seatIndex = mySeat }));
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                return;
            }

            if (pv.TurnPhase == "DISCARD")
            {
                int hpLimit = Math.Max(0, pv.MySeat != null ? pv.MySeat.Hp : 0);
                int handCount = pv.MyHand != null ? pv.MyHand.Count : 0;
                int excess = Math.Max(0, handCount - hpLimit);
                bool ready = _multiSelectedCardIds.Count == excess;
                string label = excess == 0 ? "Hoàn Tất Pha Bỏ" : $"Bỏ {_multiSelectedCardIds.Count}/{excess} Lá";
                _hudController.SetPrimaryAction(label, ready, () =>
                {
                    var ids = new List<string>(_multiSelectedCardIds);
                    _multiSelectedCardIds.Clear();
                    _ = SendSimpleActionAsync(new { type = "DISCARD_CARDS", seatIndex = mySeat, cardIds = ids });
                });
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                return;
            }

            if (pv.TurnPhase == "PLAY")
            {
                CardInstanceDto selectedCard = FindCardInMyHand(pv, _selectedCardId);
                if (selectedCard != null && CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, selectedCard))
                {
                    string cardName = CuuChauLoreLookup.GetCardInfo(selectedCard.CardKey).NameVi;
                    if (string.IsNullOrEmpty(cardName)) cardName = selectedCard.NameVi;

                    if (CuuChauCombatRules.RequiresTargetSelection(selectedCard.CardKey))
                    {
                        List<int> validTargets = CuuChauCombatRules.GetValidTargetSeats(pv, selectedCard);
                        _tableController?.SetValidTargetSeats(validTargets);
                        bool hasValidTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                        if (hasValidTarget)
                        {
                            string targetName = CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat);
                            _hudController.SetPrimaryAction($"Xuất {cardName} · {targetName}", true, () =>
                                _ = PlaySelectedCardAsync(selectedCard, _selectedTargetSeat));
                        }
                        else
                        {
                            _hudController.SetPrimaryAction($"Chọn Mục Tiêu · {cardName}", false, null);
                        }
                        _hudController.ShowSecondarySkip(true, "Hủy Chọn Lá", ClearSelectionAndArrow);
                        return;
                    }

                    _tableController?.SetValidTargetSeats(null);
                    _hudController.SetPrimaryAction($"Xuất Chiêu · {cardName}", true, () =>
                        _ = PlaySelectedCardAsync(selectedCard, -1));
                    _hudController.ShowSecondarySkip(true, "Hủy Chọn Lá", ClearSelectionAndArrow);
                    return;
                }

                _tableController?.SetValidTargetSeats(null);
                _hudController.SetPrimaryAction("Kết Thúc Lượt", true, () => _ = SendEndPlayPhaseAsync());
                _hudController.ShowSecondarySkip(false);
                return;
            }

            _hudController.SetPrimaryAction($"Đang Chờ · {pv.TurnPhase}", false, null);
            _hudController.ShowSecondarySkip(false);
        }

        private void ConfigureInterruptActionBar(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            int mySeat = pv.ViewerSeatIndex;
            _tableController?.SetValidTargetSeats(null);

            switch (intr.Kind)
            {
                case "WAIT_DODGE":
                {
                    bool canBagua = CuuChauCombatRules.GetExtraBool(intr, "allowBagua") && !CuuChauCombatRules.GetExtraBool(intr, "baguaTried");
                    if (canBagua)
                    {
                        _hudController.SetPrimaryAction("Phán Xét Bát Quái", true, () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_DODGE", seatIndex = mySeat, cardId = (string)null, useBagua = true }));
                    }
                    else
                    {
                        CardInstanceDto dodgeCard = FindFirstPlayableCardInHand(pv, intr);
                        _hudController.SetPrimaryAction(
                            dodgeCard != null ? "Đánh Thiểm Hóa Giải" : "Chưa Có Thiểm",
                            dodgeCard != null,
                            () => _ = SendSimpleActionAsync(new { type = "RESPOND_DODGE", seatIndex = mySeat, cardId = dodgeCard?.Id }));
                    }
                    _hudController.ShowSecondarySkip(true, "Không Né (Nhận Đòn)", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_DODGE", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_AOE_DODGE":
                {
                    CardInstanceDto dodgeCard = FindFirstPlayableCardInHand(pv, intr);
                    _hudController.SetPrimaryAction(
                        dodgeCard != null ? "Đánh Thiểm Né Tên" : "Chưa Có Thiểm",
                        dodgeCard != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_AOE_DODGE", seatIndex = mySeat, cardId = dodgeCard?.Id }));
                    _hudController.ShowSecondarySkip(true, "Không Né (Nhận Đòn)", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_AOE_DODGE", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_AOE_SAT":
                case "WAIT_DUEL_SAT":
                case "WAIT_COLLATERAL_SAT":
                case "WAIT_JI_JIANG":
                case "ASK_THANH_LONG":
                {
                    CardInstanceDto satCard = FindFirstPlayableCardInHand(pv, intr);
                    string wsType = intr.Kind switch
                    {
                        "WAIT_AOE_SAT" => "RESPOND_AOE_SAT",
                        "WAIT_DUEL_SAT" => "RESPOND_DUEL_SAT",
                        "WAIT_COLLATERAL_SAT" => "RESPOND_COLLATERAL_SAT",
                        "WAIT_JI_JIANG" => "RESPOND_JI_JIANG",
                        _ => "RESPOND_THANH_LONG",
                    };
                    _hudController.SetPrimaryAction(
                        satCard != null ? "Đánh Trảm (Sát)" : "Chưa Có Sát",
                        satCard != null,
                        () => _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardIds = satCard != null ? new[] { satCard.Id } : null }));
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardIds = (string[])null }));
                    break;
                }

                case "WAIT_NULLIFICATION":
                {
                    CardInstanceDto nullCard = FindFirstPlayableCardInHand(pv, intr);
                    _hudController.SetPrimaryAction(
                        nullCard != null ? $"Vô Giải · {intr.ScrollNameVi}" : "Không Có Vô Giải",
                        nullCard != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId = nullCard?.Id }));
                    _hudController.ShowSecondarySkip(true, "Cho Qua Cẩm Nang", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_PEACH_RESCUE":
                {
                    CardInstanceDto peach = FindFirstPlayableCardInHand(pv, intr);
                    string dyingName = CuuChauCombatRules.ResolveSeatHeroName(pv, intr.TargetSeat);
                    _hudController.SetPrimaryAction(
                        peach != null ? $"Cứu Đào · {dyingName}" : $"Không Có Đào ({dyingName})",
                        peach != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId = peach?.Id }));
                    _hudController.ShowSecondarySkip(true, "Không Cứu", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_HARVEST_PICK":
                {
                    CardInstanceDto firstPick = pv.HarvestPool != null && pv.HarvestPool.Count > 0 ? pv.HarvestPool[0] : null;
                    _hudController.SetPrimaryAction(
                        firstPick != null ? $"Lấy · {firstPick.NameVi}" : "Chọn Bài Phong Đăng",
                        firstPick != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId = firstPick?.Id }));
                    _hudController.ShowSecondarySkip(false);
                    break;
                }

                case "ASK_LUO_SHEN":
                case "ASK_LUO_YI":
                case "ASK_KE_JI":
                case "ASK_TIE_QI":
                case "ASK_TIAN_DO":
                case "ASK_JIAN_XIONG":
                case "ASK_FAN_KUI":
                case "ASK_GANG_LIE":
                {
                    string wsType = intr.Kind switch
                    {
                        "ASK_LUO_SHEN" => "RESPOND_LUO_SHEN",
                        "ASK_LUO_YI" => "RESPOND_LUO_YI",
                        "ASK_KE_JI" => "RESPOND_KE_JI",
                        "ASK_TIE_QI" => "RESPOND_TIE_QI",
                        "ASK_TIAN_DO" => "RESPOND_TIAN_DO",
                        "ASK_JIAN_XIONG" => "RESPOND_JIAN_XIONG",
                        "ASK_FAN_KUI" => "RESPOND_FAN_KUI",
                        _ => "RESPOND_GANG_LIE",
                    };
                    _hudController.SetPrimaryAction("Kích Hoạt Kỹ Năng", true, () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, activate = true }));
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, activate = false }));
                    break;
                }

                case "ASK_TU_HUNG":
                {
                    bool hasHand = pv.MyHand != null && pv.MyHand.Count > 0;
                    _hudController.SetPrimaryAction("Bỏ 1 Lá Trên Tay", hasHand, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_TU_HUNG", seatIndex = mySeat, choice = "DISCARD_HAND", discardCardId = hasHand ? pv.MyHand[0].Id : null }));
                    _hudController.ShowSecondarySkip(true, "Để Đối Thủ Rút 1 Lá", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_TU_HUNG", seatIndex = mySeat, choice = "ALLOW_DRAW" }));
                    break;
                }

                case "WAIT_GANG_LIE_CHOICE":
                {
                    bool canDiscardTwo = _multiSelectedCardIds.Count == 2;
                    _hudController.SetPrimaryAction($"Bỏ 2 Lá ({_multiSelectedCardIds.Count}/2)", canDiscardTwo, () =>
                    {
                        var pair = new[] { _multiSelectedCardIds[0], _multiSelectedCardIds[1] };
                        _multiSelectedCardIds.Clear();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GANG_LIE_CHOICE", seatIndex = mySeat, choice = "DISCARD_TWO", discardCardIds = pair });
                    });
                    _hudController.ShowSecondarySkip(true, "Chịu 1 Sát Thương", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GANG_LIE_CHOICE", seatIndex = mySeat, choice = "TAKE_DAMAGE" }));
                    break;
                }

                case "PICK_TARGET_CARD":
                {
                    string handPick = CuuChauCombatRules.GetExtraString(intr, "handPick");
                    if (handPick == "PREPARE")
                    {
                        _hudController.SetPrimaryAction("Mở Bài Mục Tiêu", true, () =>
                            _ = SendSimpleActionAsync(new { type = "CONFIRM_STEAL_HAND", seatIndex = mySeat }));
                        _hudController.ShowSecondarySkip(false);
                    }
                    else
                    {
                        var targetSeatPlayer = CuuChauCombatRules.FindPlayerBySeat(pv, intr.SourceSeat);
                        string zone = ResolveFirstPickableZone(targetSeatPlayer, CuuChauCombatRules.GetExtraBool(intr, "allowDelayed"));
                        _hudController.SetPrimaryAction("Rút / Phá 1 Lá", true, () =>
                        {
                            if (zone == "DELAYED" && targetSeatPlayer?.DelayedScrolls != null && targetSeatPlayer.DelayedScrolls.Count > 0)
                            {
                                _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "DELAYED", delayedCardId = targetSeatPlayer.DelayedScrolls[0].Id });
                            }
                            else if (zone == "HAND")
                            {
                                _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "HAND", handIndex = 0 });
                            }
                            else
                            {
                                _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone });
                            }
                        });
                        _hudController.ShowSecondarySkip(false);
                    }
                    break;
                }

                case "ASK_KY_LAN_CUNG":
                {
                    var victim = CuuChauCombatRules.FindPlayerBySeat(pv, intr.SourceSeat);
                    string horseZone = victim?.Equipments?.PlusOneHorse != null ? "PLUS_ONE_HORSE"
                        : victim?.Equipments?.MinusOneHorse != null ? "MINUS_ONE_HORSE" : null;
                    _hudController.SetPrimaryAction("Bỏ Ngựa Đối Thủ", horseZone != null, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_KY_LAN_CUNG", seatIndex = mySeat, horseZone }));
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_KY_LAN_CUNG", seatIndex = mySeat, horseZone = (string)null }));
                    break;
                }

                case "WAIT_FAN_JIAN_GUESS":
                {
                    _hudController.SetPrimaryAction("Đoán Chất Cơ (♥)", true, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_FAN_JIAN_GUESS", seatIndex = mySeat, suit = "HEART" }));
                    _hudController.ShowSecondarySkip(true, "Đoán Chất Bích (♠)", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_FAN_JIAN_GUESS", seatIndex = mySeat, suit = "SPADE" }));
                    break;
                }

                case "WAIT_GUAN_XING":
                {
                    var cards = CuuChauCombatRules.GetExtraCardList(intr, "guanXingCards");
                    var topIds = new List<string>(cards.Count);
                    for (int i = 0; i < cards.Count; i++) topIds.Add(cards[i].Id);
                    _hudController.SetPrimaryAction("Giữ Thứ Tự Quan Tinh", true, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GUAN_XING", seatIndex = mySeat, topCardIds = topIds, bottomCardIds = Array.Empty<string>() }));
                    _hudController.ShowSecondarySkip(false);
                    break;
                }

                case "WAIT_YI_JI":
                {
                    var cards = CuuChauCombatRules.GetExtraCardList(intr, "yiJiCards");
                    var cardIds = new List<string>(cards.Count);
                    for (int i = 0; i < cards.Count; i++) cardIds.Add(cards[i].Id);
                    _hudController.SetPrimaryAction("Nhận Bài Di Kế", true, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_YI_JI", seatIndex = mySeat, distributions = new[] { new { targetSeat = mySeat, cardIds } } }));
                    _hudController.ShowSecondarySkip(false);
                    break;
                }

                case "ASK_QUAN_THACH_PHU":
                {
                    bool ready = _multiSelectedCardIds.Count == 2;
                    _hudController.SetPrimaryAction($"Ép Sát ({_multiSelectedCardIds.Count}/2 Lá)", ready, () =>
                    {
                        var pair = new[] { _multiSelectedCardIds[0], _multiSelectedCardIds[1] };
                        _multiSelectedCardIds.Clear();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_QUAN_THACH_PHU", seatIndex = mySeat, activate = true, discardCardIds = pair });
                    });
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_QUAN_THACH_PHU", seatIndex = mySeat, activate = false }));
                    break;
                }

                case "ASK_HAN_BANG_KIEM":
                {
                    _hudController.SetPrimaryAction("Bỏ Bài Thay Sát Thương", true, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = true, picks = new[] { new { zone = "HAND", handIndex = 0 } } }));
                    _hudController.ShowSecondarySkip(true, "Gây Sát Thương Thường", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = false }));
                    break;
                }

                case "ASK_LIU_LI":
                {
                    _hudController.SetPrimaryAction("Chọn Lá + Ghế Đổi Mục Tiêu", false, null);
                    _hudController.ShowSecondarySkip(true, "Không Đổi Mục Tiêu", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_LIU_LI", seatIndex = mySeat, activate = false }));
                    break;
                }

                case "WAIT_TU_XI":
                {
                    bool hasTargets = _multiSelectedSeats.Count > 0;
                    _hudController.SetPrimaryAction($"Đột Tập ({_multiSelectedSeats.Count}/2 Ghế)", hasTargets, () =>
                    {
                        var seats = new List<int>(_multiSelectedSeats);
                        _multiSelectedSeats.Clear();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_TU_XI", seatIndex = mySeat, targetSeats = seats });
                    });
                    _hudController.ShowSecondarySkip(true, "Rút Bài Thường", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_TU_XI", seatIndex = mySeat, targetSeats = Array.Empty<int>() }));
                    break;
                }

                case "WAIT_GUI_CAI":
                {
                    CardInstanceDto card = FindCardInMyHand(pv, _selectedCardId);
                    _hudController.SetPrimaryAction(
                        card != null ? $"Quỷ Tài · {card.NameVi}" : "Chọn 1 Lá Đổi Phán Xét",
                        card != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId = card?.Id }));
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_HU_JIA":
                {
                    CardInstanceDto dodge = FindFirstPlayableCardInHand(pv, intr);
                    _hudController.SetPrimaryAction(
                        dodge != null ? "Hộ Giá · Đánh Thiểm" : "Không Có Thiểm",
                        dodge != null,
                        () => _ = SendSimpleActionAsync(new { type = "RESPOND_HU_JIA", seatIndex = mySeat, cardId = dodge?.Id }));
                    _hudController.ShowSecondarySkip(true, "Không Hộ Giá", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_HU_JIA", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }
            }
        }

        private void HandleHandCardHovered(CardView25D card)
        {
            if (card == null)
            {
                _tooltipView?.Hide();
                if (string.IsNullOrEmpty(_selectedCardId))
                {
                    _silkArrow?.Hide();
                }
                return;
            }

            if (_tooltipView != null && _stageRect != null)
            {
                CardLoreInfo info = CuuChauLoreLookup.GetCardInfo(card.CardKey);
                string title = !string.IsNullOrEmpty(info.NameVi) ? info.NameVi : card.TitleVi;
                string subtitle = !string.IsNullOrEmpty(info.CategoryVi)
                    ? $"{info.CategoryVi} · {card.Rank} {FormatSuitVi(card.Suit)}"
                    : $"{card.Rank} {FormatSuitVi(card.Suit)}";
                string body = !string.IsNullOrEmpty(info.EffectVi)
                    ? info.EffectVi
                    : "Kéo thả lá bài lên bàn đấu hoặc bấm chọn mục tiêu để xuất chiêu.";

                Vector2 localPos = WorldToStageLocal(card.RectTransform.TransformPoint(new Vector3(0f, 240f, 0f)))
                                 + new Vector2(260f, 40f);
                _tooltipView.ShowTooltip(title, subtitle, body, localPos, _stageRect);
            }
        }

        private void HandleHandCardClicked(CardView25D card)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (card == null || pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            PublicInterruptViewDto intr = pv.ActiveInterrupt;

            if (intr != null)
            {
                int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat);
                if (actorSeat != mySeat) return;

                if (intr.Kind == "WAIT_HARVEST_PICK")
                {
                    _ = SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId = card.InstanceId });
                    return;
                }

                if (intr.Kind is "WAIT_GANG_LIE_CHOICE" or "ASK_QUAN_THACH_PHU")
                {
                    ToggleMultiCardSelection(card, 2);
                    UpdateActionBarForState(pv, intr);
                    return;
                }

                if (!CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, FindCardInMyHand(pv, card.InstanceId))) return;
                if (_selectedCardId == card.InstanceId)
                {
                    _ = DispatchInterruptCardPlayAsync(pv, intr, card.InstanceId);
                }
                else
                {
                    SelectSingleCard(card.InstanceId);
                    UpdateActionBarForState(pv, intr);
                }
                return;
            }

            if (pv.CurrentTurnSeat != mySeat) return;

            if (pv.TurnPhase == "DISCARD")
            {
                int hpLimit = Math.Max(0, pv.MySeat != null ? pv.MySeat.Hp : 0);
                int handCount = pv.MyHand != null ? pv.MyHand.Count : 0;
                int excess = Math.Max(0, handCount - hpLimit);
                ToggleMultiCardSelection(card, excess);
                UpdateActionBarForState(pv, null);
                return;
            }

            if (pv.TurnPhase != "PLAY") return;

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null || !CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto)) return;

            if (_selectedCardId == card.InstanceId && !CuuChauCombatRules.RequiresTargetSelection(dto.CardKey))
            {
                _ = PlaySelectedCardAsync(dto, -1);
                return;
            }

            SelectSingleCard(card.InstanceId);
            _audioController?.PlaySpatialSfx("sfx-click", 0f);
            UpdateActionBarForState(pv, null);
        }

        private void HandleHandCardDragMoved(CardView25D card, Vector2 screenPos)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (card == null || pv == null || _silkArrow == null || _stageRect == null) return;
            if (pv.CurrentTurnSeat != pv.ViewerSeatIndex || pv.TurnPhase != "PLAY" || pv.ActiveInterrupt != null) return;

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null || !CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto))
            {
                _silkArrow.Hide();
                return;
            }

            if (!CuuChauCombatRules.RequiresTargetSelection(dto.CardKey))
            {
                _silkArrow.Hide();
                return;
            }

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeats(pv, dto);
            _tableController?.SetValidTargetSeats(validTargets);

            int hoveredSeat = FindSeatUnderScreenPoint(screenPos, pv);
            bool isValid = hoveredSeat >= 0 && validTargets.Contains(hoveredSeat);
            _tableController?.SetTargetedSeat(isValid ? hoveredSeat : -1);

            Vector2 startLocal = WorldToArrowLocal(card.RectTransform.TransformPoint(new Vector3(0f, 90f, 0f)));
            Vector2 endLocal = isValid && _tableController?.GetSeatView(hoveredSeat) != null
                ? WorldToArrowLocal(_tableController.GetSeatView(hoveredSeat).GetTargetAnchorWorldPos())
                : ScreenToArrowLocal(screenPos);
            _silkArrow.ShowBezier(startLocal, endLocal, isValid);
        }

        private void HandleHandCardReleased(CardView25D card, Vector2 screenPos, bool abovePlayThreshold)
        {
            _silkArrow?.Hide();

            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (card == null || pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            if (pv.ActiveInterrupt != null)
            {
                int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(pv.ActiveInterrupt, mySeat);
                if (actorSeat == mySeat && abovePlayThreshold)
                {
                    _ = DispatchInterruptCardPlayAsync(pv, pv.ActiveInterrupt, card.InstanceId);
                }
                return;
            }

            if (pv.CurrentTurnSeat != mySeat || pv.TurnPhase != "PLAY") return;

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null || !CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto)) return;

            if (!CuuChauCombatRules.RequiresTargetSelection(dto.CardKey))
            {
                if (abovePlayThreshold)
                {
                    _ = PlaySelectedCardAsync(dto, -1);
                }
                return;
            }

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeats(pv, dto);
            int dropSeat = FindSeatUnderScreenPoint(screenPos, pv);
            if (dropSeat >= 0 && validTargets.Contains(dropSeat))
            {
                _ = PlaySelectedCardAsync(dto, dropSeat);
            }
            else if (abovePlayThreshold && _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat))
            {
                _ = PlaySelectedCardAsync(dto, _selectedTargetSeat);
            }
            else
            {
                SelectSingleCard(card.InstanceId);
                UpdateActionBarForState(pv, null);
            }
        }

        private void HandleSeatClicked(int seatIndex)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            if (pv.ActiveInterrupt != null && pv.ActiveInterrupt.Kind == "WAIT_TU_XI" &&
                CuuChauCombatRules.GetInterruptActorSeat(pv.ActiveInterrupt, mySeat) == mySeat)
            {
                if (seatIndex != mySeat)
                {
                    if (_multiSelectedSeats.Contains(seatIndex)) _multiSelectedSeats.Remove(seatIndex);
                    else if (_multiSelectedSeats.Count < 2) _multiSelectedSeats.Add(seatIndex);
                    UpdateActionBarForState(pv, pv.ActiveInterrupt);
                }
                return;
            }

            if (pv.CurrentTurnSeat != mySeat || pv.TurnPhase != "PLAY" || string.IsNullOrEmpty(_selectedCardId)) return;

            CardInstanceDto selectedCard = FindCardInMyHand(pv, _selectedCardId);
            if (selectedCard == null || !CuuChauCombatRules.RequiresTargetSelection(selectedCard.CardKey)) return;

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeats(pv, selectedCard);
            if (!validTargets.Contains(seatIndex)) return;

            if (_selectedTargetSeat == seatIndex)
            {
                _ = PlaySelectedCardAsync(selectedCard, seatIndex);
            }
            else
            {
                _selectedTargetSeat = seatIndex;
                _tableController?.SetTargetedSeat(seatIndex);
                UpdateActionBarForState(pv, null);
            }
        }

        private void HandleEquipmentHovered(CardInstanceDto card, string summary, RectTransform slotRect)
        {
            if (_tooltipView == null || _stageRect == null || card == null) return;
            CardLoreInfo lore = CuuChauLoreLookup.GetCardInfo(card.CardKey);
            string title = !string.IsNullOrEmpty(lore.NameVi) ? lore.NameVi : EquipmentSlotGrid.ResolveDisplayName(card.CardKey, card.NameVi);
            string subtitle = !string.IsNullOrEmpty(lore.CategoryVi) ? lore.CategoryVi : "Trang Bị";
            string body = !string.IsNullOrEmpty(lore.EffectVi) ? lore.EffectVi : summary;

            Vector2 localPos = slotRect != null
                ? WorldToStageLocal(slotRect.TransformPoint(slotRect.rect.center)) + new Vector2(0f, 120f)
                : Vector2.zero;
            _tooltipView.ShowTooltip(title, subtitle, body, localPos, _stageRect);
        }

        private void HandleEquipmentHoverExited()
        {
            _tooltipView?.Hide();
        }

        private void HandleReducedMotionChanged(bool enabled)
        {
            _tableController?.SetReducedMotion(enabled);
            _heroDraftModal?.SetReducedMotion(enabled);
            _feelController?.SetReducedMotion(enabled);
            _vfxOverlay?.SetReducedMotion(enabled);
        }

        private async Awaitable PlaySelectedCardAsync(CardInstanceDto card, int targetSeat)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (_wsClient == null || pv == null || card == null || string.IsNullOrEmpty(CurrentRoomCode)) return;

            int mySeat = pv.ViewerSeatIndex;
            ClearSelectionAndArrow();
            _audioController?.PlaySpatialSfx("sfx-click", 0f);

            if (targetSeat < 0)
            {
                await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                {
                    type = "PLAY_CARD",
                    seatIndex = mySeat,
                    cardIds = new[] { card.Id },
                });
                return;
            }

            if (card.CardKey == "ta_dao_sat_nhan")
            {
                int victimSeat = CuuChauCombatRules.FindFirstCollateralVictim(pv, targetSeat);
                if (victimSeat < 0) return;
                await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                {
                    type = "PLAY_CARD",
                    seatIndex = mySeat,
                    cardIds = new[] { card.Id },
                    targetSeats = new[] { targetSeat },
                    secondarySeat = victimSeat,
                });
                return;
            }

            await _wsClient.SendGameActionAsync(CurrentRoomCode, new
            {
                type = "PLAY_CARD",
                seatIndex = mySeat,
                cardIds = new[] { card.Id },
                targetSeats = new[] { targetSeat },
            });
        }

        private async Awaitable DispatchInterruptCardPlayAsync(PlayerViewStateDto pv, PublicInterruptViewDto intr, string cardId)
        {
            int mySeat = pv.ViewerSeatIndex;
            CardInstanceDto card = FindCardInMyHand(pv, cardId);
            if (card == null || !CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, card)) return;

            ClearSelectionAndArrow();
            switch (intr.Kind)
            {
                case "WAIT_DODGE":
                    await SendSimpleActionAsync(new { type = "RESPOND_DODGE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_AOE_DODGE":
                    await SendSimpleActionAsync(new { type = "RESPOND_AOE_DODGE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_HU_JIA":
                    await SendSimpleActionAsync(new { type = "RESPOND_HU_JIA", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_NULLIFICATION":
                    await SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_PEACH_RESCUE":
                    await SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_GUI_CAI":
                    await SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_AOE_SAT":
                    await SendSimpleActionAsync(new { type = "RESPOND_AOE_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_DUEL_SAT":
                    await SendSimpleActionAsync(new { type = "RESPOND_DUEL_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_COLLATERAL_SAT":
                    await SendSimpleActionAsync(new { type = "RESPOND_COLLATERAL_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_JI_JIANG":
                    await SendSimpleActionAsync(new { type = "RESPOND_JI_JIANG", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "ASK_THANH_LONG":
                    await SendSimpleActionAsync(new { type = "RESPOND_THANH_LONG", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
            }
        }

        private async Awaitable SendSimpleActionAsync(object actionPayload)
        {
            if (_wsClient == null || string.IsNullOrEmpty(CurrentRoomCode) || actionPayload == null) return;
            try
            {
                await _wsClient.SendGameActionAsync(CurrentRoomCode, actionPayload);
            }
            catch (Exception ex)
            {
                SetError(ex.Message);
            }
        }

        private void HandleHotkeys()
        {
#if ENABLE_INPUT_SYSTEM
            Keyboard kb = Keyboard.current;
            if (kb == null) return;

            if (kb.f2Key.wasPressedThisFrame)
            {
                if (_refereeOpen) CloseRefereeModal();
                else OpenRefereeModal();
            }
            else if (kb.tabKey.wasPressedThisFrame)
            {
                if (_handbookOpen) CloseHandbookModal();
                else OpenHandbookModal();
            }
            else if (kb.escapeKey.wasPressedThisFrame)
            {
                if (_refereeOpen) CloseRefereeModal();
                if (_handbookOpen) CloseHandbookModal();
                _tooltipView?.Hide();
                ClearSelectionAndArrow();
            }
#endif
        }

        private void CloseRefereeModal()
        {
            _refereeOpen = false;
            _refereeModal?.SetVisible(false);
        }

        private void CloseHandbookModal()
        {
            _handbookOpen = false;
            _handbookModal?.SetVisible(false);
        }

        private void ShowLobbyHallState()
        {
            _lobbyHall?.SetVisible(true);
            _waitingRoom?.SetVisible(false);
            _heroDraftModal?.SetVisible(false);
            _refereeModal?.SetVisible(false);
            _handbookModal?.SetVisible(false);
            _matchSummaryModal?.SetVisible(false);
            _refereeOpen = false;
            _handbookOpen = false;
            SetArenaDimmedForOverlay(true);
            SetHandVisible(false);
            _silkArrow?.Hide();
            _tooltipView?.Hide();
        }

        private void SetArenaDimmedForOverlay(bool dimmed)
        {
            float alpha = dimmed ? 0.20f : 1f;
            ApplyCanvasGroupState(_tableController != null ? _tableController.gameObject : null, alpha, !dimmed);
            ApplyCanvasGroupState(_hudController != null ? _hudController.gameObject : null, alpha, !dimmed);
        }

        private void SetHandVisible(bool visible)
        {
            if (_handLayout == null) return;
            ApplyCanvasGroupState(_handLayout.gameObject, visible ? 1f : 0f, visible);
            if (!visible)
            {
                _handLayout.SetCards(null, null);
                _lastHandSignature = string.Empty;
            }
        }

        private static void ApplyCanvasGroupState(GameObject target, float alpha, bool interactable)
        {
            if (target == null) return;
            var cg = target.GetComponent<CanvasGroup>();
            if (cg == null) cg = target.AddComponent<CanvasGroup>();
            cg.alpha = alpha;
            cg.interactable = interactable;
            cg.blocksRaycasts = interactable;
        }

        private void ResetMatchTracking()
        {
            _activeMatchId = string.Empty;
            _lastTurnSeat = -1;
            _lastHandSignature = string.Empty;
            _battleMusicStarted = false;
            _lastHpBySeat.Clear();
            ClearSelectionAndArrow();
        }

        private void ClearSelectionAndArrow()
        {
            _selectedCardId = null;
            _selectedTargetSeat = -1;
            _multiSelectedCardIds.Clear();
            _multiSelectedSeats.Clear();
            _tableController?.SetTargetedSeat(-1);
            _tableController?.SetValidTargetSeats(null);
            _silkArrow?.Hide();
            RefreshHandSelectionVisuals();
        }

        private void SelectSingleCard(string cardId)
        {
            _selectedCardId = cardId;
            _selectedTargetSeat = -1;
            _multiSelectedCardIds.Clear();
            _tableController?.SetTargetedSeat(-1);
            RefreshHandSelectionVisuals();
        }

        private void ToggleMultiCardSelection(CardView25D card, int maxCount)
        {
            if (card == null) return;
            string id = card.InstanceId;
            if (_multiSelectedCardIds.Contains(id))
            {
                _multiSelectedCardIds.Remove(id);
            }
            else
            {
                if (maxCount > 0 && _multiSelectedCardIds.Count >= maxCount)
                {
                    _multiSelectedCardIds.RemoveAt(0);
                }
                _multiSelectedCardIds.Add(id);
            }
            RefreshHandSelectionVisuals();
        }

        private void RefreshHandSelectionVisuals()
        {
            if (_handLayout == null) return;
            for (int i = 0; i < _handLayout.CardCount; i++)
            {
                CardView25D view = _handLayout.GetCardView(i);
                if (view == null) continue;
                bool selected = view.InstanceId == _selectedCardId || _multiSelectedCardIds.Contains(view.InstanceId);
                view.SetSelected(selected);
            }
        }

        private void PruneSelections(List<CardInstanceDto> cards)
        {
            var validIds = new HashSet<string>();
            if (cards != null)
            {
                for (int i = 0; i < cards.Count; i++) validIds.Add(cards[i].Id);
            }

            if (!string.IsNullOrEmpty(_selectedCardId) && !validIds.Contains(_selectedCardId))
            {
                _selectedCardId = null;
                _selectedTargetSeat = -1;
            }

            for (int i = _multiSelectedCardIds.Count - 1; i >= 0; i--)
            {
                if (!validIds.Contains(_multiSelectedCardIds[i]))
                {
                    _multiSelectedCardIds.RemoveAt(i);
                }
            }
            RefreshHandSelectionVisuals();
        }

        private void SpawnSeatVfx(int seatIndex, string text, Color textColor, Color ringColor)
        {
            if (_vfxOverlay == null || _tableController == null) return;
            SeatPlaqueView plaque = _tableController.GetSeatView(seatIndex);
            if (plaque == null) return;

            Vector2 localPos = WorldToOverlayLocal(plaque.GetTargetAnchorWorldPos());
            _vfxOverlay.SpawnFloatingNumber(localPos, text, textColor);
            _vfxOverlay.SpawnImpactRing(localPos, ringColor);
        }

        private int FindSeatUnderScreenPoint(Vector2 screenPos, PlayerViewStateDto pv)
        {
            if (_tableController == null || pv?.Players == null) return -1;
            Camera uiCam = GetUiCamera();
            for (int i = 0; i < pv.Players.Count; i++)
            {
                int seatIdx = pv.Players[i].SeatIndex;
                SeatPlaqueView view = _tableController.GetSeatView(seatIdx);
                if (view == null || !view.gameObject.activeInHierarchy) continue;
                var rt = view.GetComponent<RectTransform>();
                if (rt != null && RectTransformUtility.RectangleContainsScreenPoint(rt, screenPos, uiCam))
                {
                    return seatIdx;
                }
            }
            return -1;
        }

        private Camera GetUiCamera()
        {
            if (_stageRect == null) return null;
            Canvas canvas = _stageRect.GetComponentInParent<Canvas>();
            if (canvas == null || canvas.renderMode == RenderMode.ScreenSpaceOverlay) return null;
            return canvas.worldCamera != null ? canvas.worldCamera : Camera.main;
        }

        private Vector2 WorldToStageLocal(Vector3 worldPos)
        {
            if (_stageRect == null) return Vector2.zero;
            Vector3 local = _stageRect.InverseTransformPoint(worldPos);
            return new Vector2(local.x, local.y);
        }

        private Vector2 WorldToOverlayLocal(Vector3 worldPos)
        {
            if (_vfxOverlay == null) return Vector2.zero;
            var rt = _vfxOverlay.GetComponent<RectTransform>();
            if (rt == null) return WorldToStageLocal(worldPos);
            Vector3 local = rt.InverseTransformPoint(worldPos);
            return new Vector2(local.x, local.y);
        }

        private Vector2 WorldToArrowLocal(Vector3 worldPos)
        {
            RectTransform arrowRect = _silkArrow != null ? _silkArrow.RectTransform : _stageRect;
            if (arrowRect == null) return Vector2.zero;
            Vector3 local = arrowRect.InverseTransformPoint(worldPos);
            return (Vector2)local - arrowRect.rect.center;
        }

        private Vector2 ScreenToArrowLocal(Vector2 screenPos)
        {
            RectTransform arrowRect = _silkArrow != null ? _silkArrow.RectTransform : _stageRect;
            if (arrowRect == null) return Vector2.zero;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(arrowRect, screenPos, GetUiCamera(), out Vector2 localPos);
            return localPos - arrowRect.rect.center;
        }

        private float ComputeSeatPanStereo(int seatIndex, int viewerSeat, int totalSeats)
        {
            if (_tableController == null || totalSeats <= 0) return 0f;
            int relIndex = (seatIndex - viewerSeat + totalSeats) % totalSeats;
            Vector2 anchor = _tableController.GetHorseshoeAnchor(relIndex, totalSeats);
            return Mathf.Clamp((anchor.x - 0.5f) * 1.4f, -0.7f, 0.7f);
        }

        private static bool IsMatchInClimax(PlayerViewStateDto pv)
        {
            if (pv?.Players == null) return false;
            int aliveCount = 0;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive) continue;
                aliveCount++;
                if (p.Hp <= 1) return true;
            }
            return aliveCount > 0 && aliveCount <= 2;
        }

        private static float ComputeRemainingSeconds(RoomViewerPayload payload)
        {
            if (payload == null) return 0f;
            if (payload.RoomState?.IsTimerPaused == true && payload.PausedRemainingMs.HasValue)
            {
                return Mathf.Max(0f, payload.PausedRemainingMs.Value / 1000f);
            }
            if (!string.IsNullOrEmpty(payload.PhaseDeadlineAt) &&
                DateTimeOffset.TryParse(payload.PhaseDeadlineAt, out DateTimeOffset deadline))
            {
                return Mathf.Max(0f, (float)(deadline - DateTimeOffset.UtcNow).TotalSeconds);
            }
            return payload.TimerConfig != null ? payload.TimerConfig.PlaySeconds : 20f;
        }

        private static CardInstanceDto FindCardInMyHand(PlayerViewStateDto pv, string cardId)
        {
            if (string.IsNullOrEmpty(cardId) || pv?.MyHand == null) return null;
            for (int i = 0; i < pv.MyHand.Count; i++)
            {
                if (pv.MyHand[i].Id == cardId) return pv.MyHand[i];
            }
            return null;
        }

        private static CardInstanceDto FindFirstPlayableCardInHand(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            if (pv?.MyHand == null) return null;
            for (int i = 0; i < pv.MyHand.Count; i++)
            {
                if (CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, pv.MyHand[i]))
                {
                    return pv.MyHand[i];
                }
            }
            return null;
        }

        private static string ResolveFirstPickableZone(PublicPlayerViewDto target, bool allowDelayed)
        {
            if (target == null) return "HAND";
            if (target.HandCount > 0) return "HAND";
            if (target.Equipments?.Weapon != null) return "WEAPON";
            if (target.Equipments?.Armor != null) return "ARMOR";
            if (target.Equipments?.PlusOneHorse != null) return "PLUS_ONE_HORSE";
            if (target.Equipments?.MinusOneHorse != null) return "MINUS_ONE_HORSE";
            if (allowDelayed && target.DelayedScrolls != null && target.DelayedScrolls.Count > 0) return "DELAYED";
            return "HAND";
        }

        private static string BuildHandSignature(
            List<CardInstanceDto> cards,
            string phase,
            int turnSeat,
            string interruptId,
            string interruptKind)
        {
            var sb = new StringBuilder(128);
            sb.Append(phase).Append('|').Append(turnSeat).Append('|').Append(interruptId).Append('|').Append(interruptKind).Append('|');
            if (cards != null)
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    sb.Append(cards[i].Id).Append(',');
                }
            }
            return sb.ToString();
        }

        private static string FormatSuitVi(string suit)
        {
            return suit switch
            {
                "HEART" => "Cơ",
                "DIAMOND" => "Rô",
                "CLUB" => "Chuồn",
                "SPADE" => "Bích",
                _ => string.Empty,
            };
        }

        private string BuildLanInviteUrl(string roomCode)
        {
            if (string.IsNullOrEmpty(roomCode)) return string.Empty;
            int port = _sidecar != null && _sidecar.ActivePort > 0 ? _sidecar.ActivePort : 3001;
            string ip = ResolveLocalLanIpAddress();
            return $"{ip}:{port}#{roomCode}";
        }

        private static string ResolveLocalLanIpAddress()
        {
            try
            {
                using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
                socket.Connect("8.8.8.8", 65530);
                if (socket.LocalEndPoint is IPEndPoint endPoint)
                {
                    return endPoint.Address.ToString();
                }
            }
            catch
            {
                // Fallback when offline with no default route
            }

            try
            {
                IPHostEntry host = Dns.GetHostEntry(Dns.GetHostName());
                for (int i = 0; i < host.AddressList.Length; i++)
                {
                    IPAddress addr = host.AddressList[i];
                    if (addr.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(addr))
                    {
                        return addr.ToString();
                    }
                }
            }
            catch
            {
                // Fallback to loopback
            }

            return "127.0.0.1";
        }

        private static string BuildWsUrl(string httpBaseUrl)
        {
            string trimmed = (httpBaseUrl ?? string.Empty).TrimEnd('/');
            if (trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return "wss://" + trimmed.Substring("https://".Length) + "/ws";
            }
            if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                return "ws://" + trimmed.Substring("http://".Length) + "/ws";
            }
            return $"ws://{trimmed}/ws";
        }

        private static string NormalizeServerBaseUrl(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string trimmed = raw.Trim().TrimEnd('/');
            if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = "http://" + trimmed;
            }
            return trimmed;
        }

        private static string NormalizeDisplayName(string raw)
        {
            string trimmed = string.IsNullOrWhiteSpace(raw) ? DefaultDisplayName : raw.Trim();
            if (trimmed.Length < 2) trimmed = DefaultDisplayName;
            if (trimmed.Length > 20) trimmed = trimmed.Substring(0, 20).Trim();
            return trimmed.Length < 2 ? DefaultDisplayName : trimmed;
        }

        private static string GetOrCreateDeviceId()
        {
            string existing = PlayerPrefs.GetString(DeviceIdPrefsKey, string.Empty);
            if (!string.IsNullOrWhiteSpace(existing) && existing.Length >= 8)
            {
                return existing;
            }

            string created = "unity_" + Guid.NewGuid().ToString("N");
            PlayerPrefs.SetString(DeviceIdPrefsKey, created);
            PlayerPrefs.Save();
            return created;
        }

        private static async Awaitable PostLeaveRoomDirectAsync(string baseUrl, string roomCode, string sessionToken)
        {
            string url = $"{baseUrl.TrimEnd('/')}/api/rooms/{roomCode}/leave";
            using var req = new UnityWebRequest(url, "POST");
            req.downloadHandler = new DownloadHandlerBuffer();
            req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}"));
            req.SetRequestHeader("Content-Type", "application/json");
            req.SetRequestHeader("Authorization", $"Bearer {sessionToken}");
            req.timeout = 5;
            await req.SendWebRequest();
        }

        private void SetError(string message)
        {
            LastError = message ?? string.Empty;
            if (!string.IsNullOrEmpty(LastError))
            {
                Debug.LogWarning($"[CuuChauMatchDirector] {LastError}");
                _lobbyHall?.SetServerStatus(SidecarReady, LastError, !SidecarReady);
            }
        }
    }
}
