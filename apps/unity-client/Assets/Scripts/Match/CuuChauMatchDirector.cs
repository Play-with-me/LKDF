using System;
using System.Collections.Generic;
using System.Net;
using System.Net.NetworkInformation;
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
using UnityEngine.EventSystems;
using UnityEngine.Networking;
using UnityEngine.UI;
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
        private readonly List<int> _orderedSkillTargetSeats = new();
        private readonly Dictionary<int, int> _lastHpBySeat = new();
        private readonly Dictionary<int, bool> _lastAliveBySeat = new();
        private int _lastProcessedActionLogCount;
        private string _lastInterruptId = string.Empty;
        private string _lastDiscardTopCardId = string.Empty;
        private string _lastLocalFlightCardId = string.Empty;

        private string _activePlaySkillId;
        private int _playSkillCycleIndex;
        private int _collateralVictimCycleIndex;
        private int _pickZoneIndex;
        private int _pickHandSlotIndex;
        private int _kyLanChoiceIndex;
        private int _hanBangChoiceIndex;
        private int _fanJianSuitIndex;

        private bool _currentPrimaryInteractable;
        private Action _currentPrimaryCallback;
        private int _lastPrimaryInvokeFrame = -1;
        private bool _dragToastShownThisGesture;

        private CanvasGroup _toastGroup;
        private RectTransform _toastRect;
        private TextMeshProUGUI _toastText;
        private float _toastHoldTimer;
        private float _toastCurrentAlpha;

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
            if (_feelController != null) _feelController.SetShakeTarget(ResolveFeelShakeTarget());

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
            if (_feelController != null)
            {
                _feelController.SetShakeTarget(ResolveFeelShakeTarget());
            }
            EnsureToastBannerBuilt();

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
            TickToastBanner(Time.unscaledDeltaTime);
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
                _hudController.OnMuteChanged += HandleMuteChanged;
                _hudController.OnBgmMuteToggled += HandleBgmMuteToggled;
                _hudController.OnSfxMuteToggled += HandleSfxMuteToggled;
                _hudController.OnAutoSkipNullificationToggled += HandleAutoSkipNullificationToggled;
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
                _hudController.OnMuteChanged -= HandleMuteChanged;
                _hudController.OnBgmMuteToggled -= HandleBgmMuteToggled;
                _hudController.OnSfxMuteToggled -= HandleSfxMuteToggled;
                _hudController.OnAutoSkipNullificationToggled -= HandleAutoSkipNullificationToggled;
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
            string toastMsg = !string.IsNullOrEmpty(messageVi) ? messageVi : $"Thao tác không hợp lệ ({code})";
            ShowToast(toastMsg);
            _hudController?.AppendLogLine($"[Thông báo] {toastMsg}");
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
            if (!_shuttingDown)
            {
                const string disconnectBanner = "[Mất kết nối mạng — Đang tự động nối lại...]";
                ShowToast(disconnectBanner);
                _hudController?.AppendLogLine(string.IsNullOrEmpty(reason) ? disconnectBanner : $"{disconnectBanner} ({reason})");
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
                _audioController?.StopBattleMusic();
                _battleMusicStarted = false;
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
                _lastAliveBySeat.Clear();
                if (pv.Players != null)
                {
                    for (int i = 0; i < pv.Players.Count; i++)
                    {
                        PublicPlayerViewDto initP = pv.Players[i];
                        _lastHpBySeat[initP.SeatIndex] = initP.Hp;
                        _lastAliveBySeat[initP.SeatIndex] = initP.Alive;
                    }
                }
                _lastProcessedActionLogCount = pv.ActionLog != null ? pv.ActionLog.Count : 0;
                _lastTurnSeat = -1;
                _lastHandSignature = string.Empty;
                _lastInterruptId = string.Empty;
                _lastDiscardTopCardId = pv.DiscardPileTop?.Id ?? string.Empty;
                _lastLocalFlightCardId = string.Empty;
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
            bool hasLightningLog = false;
            bool hasNullifyLog = false;
            bool hasEquipLog = false;
            bool hasDodgeLog = false;

            if (pv.ActionLog != null)
            {
                if (pv.ActionLog.Count < _lastProcessedActionLogCount)
                {
                    _lastProcessedActionLogCount = pv.ActionLog.Count;
                }
                for (int i = _lastProcessedActionLogCount; i < pv.ActionLog.Count; i++)
                {
                    string line = pv.ActionLog[i] ?? string.Empty;
                    if (line.IndexOf("Hóa Giải", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        line.IndexOf("Vô Giải", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        hasNullifyLog = true;
                    }
                    if (line.IndexOf("Thiểm Điện", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        line.IndexOf("Thiên Lôi Kiếp", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        line.IndexOf("Kinh Lôi Chấn", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        hasLightningLog = true;
                    }
                    if (line.IndexOf("trang bị", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        hasEquipLog = true;
                    }
                    if (line.IndexOf("đánh Thiểm", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        line.IndexOf("Thân Pháp", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        hasDodgeLog = true;
                    }
                }
                _lastProcessedActionLogCount = pv.ActionLog.Count;
            }

            if (hasNullifyLog)
            {
                _feelController?.TriggerActionFeel(ActionFeelKind.NullifySeal);
                PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
            }
            else if (hasEquipLog)
            {
                PlaySfxWithFallback("sfx-equip", "sfx-click", 0f);
            }
            else if (hasDodgeLog)
            {
                PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
            }

            string topDiscardId = pv.DiscardPileTop?.Id ?? string.Empty;
            if (!string.IsNullOrEmpty(topDiscardId) && topDiscardId != _lastDiscardTopCardId)
            {
                _lastDiscardTopCardId = topDiscardId;
                if (topDiscardId != _lastLocalFlightCardId)
                {
                    int originSeat = pv.ActiveInterrupt?.SourceSeat ?? pv.CurrentTurnSeat;
                    SpawnBoardCardFlightFromSeat(pv.DiscardPileTop.CardKey, originSeat, -1, dissolveOnArrive: hasNullifyLog);
                }
            }

            if (pv.Players != null)
            {
                int totalSeats = pv.Players.Count;
                for (int i = 0; i < totalSeats; i++)
                {
                    PublicPlayerViewDto p = pv.Players[i];
                    float pan = ComputeSeatPanStereo(p.SeatIndex, pv.ViewerSeatIndex, totalSeats);

                    if (_lastHpBySeat.TryGetValue(p.SeatIndex, out int prevHp))
                    {
                        int delta = p.Hp - prevHp;
                        if (delta < 0)
                        {
                            _feelController?.TriggerActionFeel(ActionFeelKind.HitSlash);
                            SpawnSeatVfx(p.SeatIndex, delta.ToString(), DamageNumberColor, DamageRingColor);
                            PlaySfxWithFallback(hasLightningLog ? "sfx-lightning" : "sfx-damage", "sfx-damage", pan);
                        }
                        else if (delta > 0)
                        {
                            _feelController?.TriggerActionFeel(ActionFeelKind.HealJade);
                            SpawnSeatVfx(p.SeatIndex, $"+{delta}", HealNumberColor, HealRingColor);
                            PlaySfxWithFallback("sfx-dao", "sfx-click", pan);
                        }
                    }
                    _lastHpBySeat[p.SeatIndex] = p.Hp;

                    if (_lastAliveBySeat.TryGetValue(p.SeatIndex, out bool wasAlive) && wasAlive && !p.Alive)
                    {
                        PlaySfxWithFallback("sfx-death", "sfx-damage", pan);
                    }
                    _lastAliveBySeat[p.SeatIndex] = p.Alive;
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
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    }
                }
            }
        }

        private void SyncHandAndActionButtons(PlayerViewStateDto pv)
        {
            PublicInterruptViewDto intr = pv.ActiveInterrupt;
            int mySeat = pv.ViewerSeatIndex;
            bool isMyTurn = pv.CurrentTurnSeat == mySeat;

            string curIntrId = intr != null ? (intr.Id ?? intr.Kind ?? string.Empty) : string.Empty;
            if (_lastInterruptId != curIntrId)
            {
                _lastInterruptId = curIntrId;
                _pickZoneIndex = 0;
                _pickHandSlotIndex = 0;
                _kyLanChoiceIndex = 0;
                _hanBangChoiceIndex = 0;
                _fanJianSuitIndex = 0;
                _multiSelectedCardIds.Clear();
                _multiSelectedSeats.Clear();
                _orderedSkillTargetSeats.Clear();
                if (intr != null)
                {
                    _activePlaySkillId = null;
                    _selectedCardId = null;
                    _selectedTargetSeat = -1;
                }
            }

            if (_selectedTargetSeat >= 0)
            {
                PublicPlayerViewDto targetSeatPlayer = CuuChauCombatRules.FindPlayerBySeat(pv, _selectedTargetSeat);
                if (targetSeatPlayer == null || !targetSeatPlayer.Alive)
                {
                    _selectedTargetSeat = -1;
                }
            }

            if (intr == null && (!isMyTurn || pv.TurnPhase != "PLAY"))
            {
                _activePlaySkillId = null;
                if (!isMyTurn)
                {
                    _selectedTargetSeat = -1;
                }
            }

            if (!string.IsNullOrEmpty(_activePlaySkillId))
            {
                List<string> stillAvailable = BuildAvailablePlaySkillOptions(pv);
                if (!stillAvailable.Contains(_activePlaySkillId))
                {
                    _activePlaySkillId = null;
                    _multiSelectedCardIds.Clear();
                    _orderedSkillTargetSeats.Clear();
                }
            }

            List<CardInstanceDto> displayCards = pv.MyHand ?? new List<CardInstanceDto>();
            if (intr != null && CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat) == mySeat)
            {
                if (intr.Kind == "WAIT_HARVEST_PICK" && pv.HarvestPool != null && pv.HarvestPool.Count > 0)
                {
                    displayCards = pv.HarvestPool;
                }
                else if (intr.Kind == "WAIT_GUAN_XING")
                {
                    List<CardInstanceDto> gx = GetGuanXingCards(intr);
                    if (gx.Count > 0) displayCards = gx;
                }
                else if (intr.Kind == "WAIT_YI_JI")
                {
                    List<CardInstanceDto> yj = GetYiJiCards(intr);
                    if (yj.Count > 0) displayCards = yj;
                }
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
                    if (!string.IsNullOrEmpty(_activePlaySkillId))
                    {
                        return IsCardEligibleForPlaySkill(pv, _activePlaySkillId, card);
                    }
                    return CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, card);
                }
                if (isMyTurn && pv.TurnPhase == "DISCARD")
                {
                    return true;
                }
                return false;
            };

            string sig = BuildHandSignature(displayCards, pv, intr, _activePlaySkillId);
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
            if (_hudController == null || pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            if (intr != null)
            {
                int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat);
                if (actorSeat != mySeat)
                {
                    string actorName = intr.Kind == "WAIT_NULLIFICATION"
                        ? "bàn đấu"
                        : CuuChauCombatRules.ResolveSeatHeroName(pv, actorSeat);
                    SetHudPrimaryAction($"Chờ {actorName} phản ứng", false, null);
                    _hudController.ShowSecondarySkip(false);
                    _tableController?.SetValidTargetSeats(null);
                    _tableController?.SetTargetedSeat(-1);
                    return;
                }

                ConfigureInterruptActionBar(pv, intr);
                return;
            }

            if (pv.CurrentTurnSeat != mySeat)
            {
                string turnName = CuuChauCombatRules.ResolveSeatHeroName(pv, pv.CurrentTurnSeat);
                SetHudPrimaryAction($"Đang chờ · {turnName}", false, null);
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                _tableController?.SetTargetedSeat(-1);
                return;
            }

            if (pv.TurnPhase == "DRAW")
            {
                SetHudPrimaryAction("Rút Bài Khởi Đầu", true, () => _ = SendSimpleActionAsync(new { type = "DRAW_CARDS", seatIndex = mySeat }));
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                _tableController?.SetTargetedSeat(-1);
                return;
            }

            if (pv.TurnPhase == "DISCARD")
            {
                int excess = GetRequiredDiscardCount(pv);
                bool ready = _multiSelectedCardIds.Count == excess;
                string label = excess == 0 ? "Hoàn Tất Pha Bỏ" : $"Bỏ {_multiSelectedCardIds.Count}/{excess} Lá";
                SetHudPrimaryAction(label, ready, () =>
                {
                    var ids = new List<string>(_multiSelectedCardIds);
                    _multiSelectedCardIds.Clear();
                    _ = SendSimpleActionAsync(new { type = "DISCARD_CARDS", seatIndex = mySeat, cardIds = ids });
                });
                _hudController.ShowSecondarySkip(false);
                _tableController?.SetValidTargetSeats(null);
                _tableController?.SetTargetedSeat(-1);
                return;
            }

            if (pv.TurnPhase == "PLAY")
            {
                if (!string.IsNullOrEmpty(_activePlaySkillId))
                {
                    ConfigurePlaySkillActionBar(pv, _activePlaySkillId);
                    return;
                }

                CardInstanceDto selectedCard = FindCardInMyHand(pv, _selectedCardId);
                if (selectedCard != null && CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, selectedCard))
                {
                    string effectiveKey = CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, selectedCard, null);
                    string asCardKey = !string.Equals(effectiveKey, selectedCard.CardKey, StringComparison.Ordinal)
                        ? effectiveKey
                        : null;
                    string cardName = ResolveCardKeyNameVi(effectiveKey, selectedCard.NameVi);

                    if (CuuChauCombatRules.RequiresTargetSelection(effectiveKey))
                    {
                        List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, effectiveKey);
                        _tableController?.SetValidTargetSeats(validTargets);
                        bool hasValidTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                        _tableController?.SetTargetedSeat(hasValidTarget ? _selectedTargetSeat : -1);

                        if (effectiveKey == "ta_dao_sat_nhan" && hasValidTarget)
                        {
                            List<int> victims = CuuChauCombatRules.GetValidCollateralVictimSeats(pv, _selectedTargetSeat);
                            int victimSeat = victims.Count > 0
                                ? victims[_collateralVictimCycleIndex % victims.Count]
                                : -1;
                            string attackerName = CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat);
                            string victimName = victimSeat >= 0
                                ? CuuChauCombatRules.ResolveSeatHeroName(pv, victimSeat)
                                : string.Empty;

                            SetHudPrimaryAction(
                                victimSeat >= 0 ? $"Tá Kiếm · {attackerName} Trảm {victimName}" : $"Chọn Mục Tiêu · {cardName}",
                                victimSeat >= 0,
                                () => _ = PlaySelectedCardAsync(selectedCard, _selectedTargetSeat, asCardKey, victimSeat));

                            if (victims.Count > 1)
                            {
                                int nextVictim = victims[(_collateralVictimCycleIndex + 1) % victims.Count];
                                string nextVictimName = CuuChauCombatRules.ResolveSeatHeroName(pv, nextVictim);
                                _hudController.ShowSecondarySkip(true, $"Đổi Nạn Nhân · {nextVictimName}", () =>
                                {
                                    _collateralVictimCycleIndex = (_collateralVictimCycleIndex + 1) % victims.Count;
                                    UpdateActionBarForState(pv, null);
                                });
                            }
                            else
                            {
                                _hudController.ShowSecondarySkip(true, "Hủy Chọn Lá", () => ClearSelectionAndArrow());
                            }
                            return;
                        }

                        if (hasValidTarget)
                        {
                            string targetName = CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat);
                            SetHudPrimaryAction($"Xuất {cardName} · {targetName}", true, () =>
                                _ = PlaySelectedCardAsync(selectedCard, _selectedTargetSeat, asCardKey));
                        }
                        else if (validTargets.Count == 0)
                        {
                            SetHudPrimaryAction($"Không Có Mục Tiêu · {cardName}", false, null);
                        }
                        else
                        {
                            SetHudPrimaryAction($"Chọn Mục Tiêu · {cardName}", false, null);
                        }
                        _hudController.ShowSecondarySkip(true, "Hủy Chọn Lá", () => ClearSelectionAndArrow());
                        return;
                    }

                    _tableController?.SetValidTargetSeats(null);
                    _tableController?.SetTargetedSeat(-1);
                    string actionVerb = asCardKey == null && CuuChauCombatRules.IsEquipmentCategory(selectedCard.Category)
                        ? "Trang Bị"
                        : "Xuất Chiêu";
                    SetHudPrimaryAction($"{actionVerb} · {cardName}", true, () =>
                        _ = PlaySelectedCardAsync(selectedCard, -1, asCardKey));
                    _hudController.ShowSecondarySkip(true, "Hủy Chọn Lá", () => ClearSelectionAndArrow());
                    return;
                }

                _tableController?.SetValidTargetSeats(null);
                _tableController?.SetTargetedSeat(-1);
                bool canEndPlay = pv.AvailableActions == null || pv.AvailableActions.CanEndPlayPhase;
                SetHudPrimaryAction("Kết Thúc Lượt", canEndPlay, () => _ = SendEndPlayPhaseAsync());

                List<string> skillOptions = BuildAvailablePlaySkillOptions(pv);
                if (skillOptions.Count > 0)
                {
                    _playSkillCycleIndex %= skillOptions.Count;
                    string skillOption = skillOptions[_playSkillCycleIndex];
                    string skillLabel = GetPlaySkillDisplayNameVi(skillOption);
                    _hudController.ShowSecondarySkip(true, $"Tuyệt Kỹ · {skillLabel}", () => EnterPlaySkillMode(pv, skillOption));
                }
                else
                {
                    _hudController.ShowSecondarySkip(false);
                }
                return;
            }

            SetHudPrimaryAction($"Đang Chờ · {pv.TurnPhase}", false, null);
            _hudController.ShowSecondarySkip(false);
        }

        private void ConfigurePlaySkillActionBar(PlayerViewStateDto pv, string skillOptionId)
        {
            int mySeat = pv.ViewerSeatIndex;
            List<string> allOptions = BuildAvailablePlaySkillOptions(pv);

            void BindSkillSecondaryButton()
            {
                if (allOptions.Count > 1)
                {
                    int curIdx = allOptions.IndexOf(skillOptionId);
                    if (curIdx >= 0 && curIdx + 1 < allOptions.Count)
                    {
                        string nextOpt = allOptions[curIdx + 1];
                        _hudController.ShowSecondarySkip(true, $"Đổi · {GetPlaySkillDisplayNameVi(nextOpt)}", () =>
                        {
                            _playSkillCycleIndex = curIdx + 1;
                            EnterPlaySkillMode(pv, nextOpt);
                        });
                        return;
                    }
                }
                _hudController.ShowSecondarySkip(true, "Hủy Tuyệt Kỹ", () =>
                {
                    _playSkillCycleIndex = 0;
                    ExitPlaySkillMode(pv);
                });
            }

            switch (skillOptionId)
            {
                case "ku_rou":
                {
                    _tableController?.SetValidTargetSeats(null);
                    _tableController?.SetTargetedSeat(-1);
                    SetHudPrimaryAction("Phần Tâm Quyết · Mất 1 Máu, Rút 2", true, () =>
                    {
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new { type = "ACTIVATE_HERO_SKILL", seatIndex = mySeat, skillId = "ku_rou" });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "zhi_heng":
                {
                    _tableController?.SetValidTargetSeats(null);
                    _tableController?.SetTargetedSeat(-1);
                    int count = _multiSelectedCardIds.Count;
                    SetHudPrimaryAction(
                        count > 0 ? $"Dung Luyện Quyết · Đổi {count} Lá" : "Chọn Bài Để Dung Luyện",
                        count > 0,
                        () =>
                        {
                            var ids = new List<string>(_multiSelectedCardIds);
                            ExitPlaySkillMode(pv);
                            PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                            _ = SendSimpleActionAsync(new { type = "ACTIVATE_HERO_SKILL", seatIndex = mySeat, skillId = "zhi_heng", cardIds = ids });
                        });
                    BindSkillSecondaryButton();
                    break;
                }

                case "ren_de":
                {
                    List<int> validTargets = GetAliveOtherSeats(pv);
                    _tableController?.SetValidTargetSeats(validTargets);
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);
                    int count = _multiSelectedCardIds.Count;
                    bool ready = count > 0 && hasTarget;

                    string label = ready
                        ? $"Thanh Vân Độ · Giao {count} Lá ({CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)})"
                        : count == 0
                            ? "Chọn Bài Cần Giao · Thanh Vân Độ"
                            : $"Chọn Đồng Đội Nhận {count} Lá";

                    SetHudPrimaryAction(label, ready, () =>
                    {
                        var ids = new List<string>(_multiSelectedCardIds);
                        int target = _selectedTargetSeat;
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "ren_de",
                            cardIds = ids,
                            targetSeats = new[] { target },
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "qing_nang":
                {
                    List<int> validTargets = GetWoundedAliveSeats(pv, includeSelf: true);
                    _tableController?.SetValidTargetSeats(validTargets);
                    if (_selectedTargetSeat < 0 && validTargets.Count == 1)
                    {
                        _selectedTargetSeat = validTargets[0];
                    }
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);
                    CardInstanceDto card = GetSingleSelectedSkillCard(pv);
                    bool ready = card != null && hasTarget;

                    string label = validTargets.Count == 0
                        ? "Chưa Có Ai Mất Máu · Thanh Tâm Đan"
                        : ready
                            ? $"Thanh Tâm Đan · Trị {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                            : card == null
                                ? "Chọn 1 Lá Bỏ · Thanh Tâm Đan"
                                : "Chọn Người Cần Hồi Máu";

                    SetHudPrimaryAction(label, ready, () =>
                    {
                        string cardId = card.Id;
                        int target = _selectedTargetSeat;
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-dao", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "qing_nang",
                            cardIds = new[] { cardId },
                            targetSeats = new[] { target },
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "jie_yin":
                {
                    List<int> validTargets = GetWoundedMaleOtherSeats(pv);
                    _tableController?.SetValidTargetSeats(validTargets);
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);
                    bool hasTwo = _multiSelectedCardIds.Count == 2;
                    bool ready = hasTwo && hasTarget;

                    string label = validTargets.Count == 0
                        ? "Chưa Có Nam Hiệp Khách Bị Thương"
                        : ready
                            ? $"Hợp Hoan Khí · Cùng {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                            : !hasTwo
                                ? $"Chọn Bài Bỏ ({_multiSelectedCardIds.Count}/2) · Hợp Hoan Khí"
                                : "Chọn Nam Hiệp Khách Bị Thương";

                    SetHudPrimaryAction(label, ready, () =>
                    {
                        var pair = new[] { _multiSelectedCardIds[0], _multiSelectedCardIds[1] };
                        int target = _selectedTargetSeat;
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-dao", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "jie_yin",
                            cardIds = pair,
                            targetSeats = new[] { target },
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "fan_jian":
                {
                    List<int> validTargets = GetAliveOtherSeats(pv);
                    _tableController?.SetValidTargetSeats(validTargets);
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);

                    string label = hasTarget
                        ? $"Ly Tâm Ấn · {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                        : "Chọn Đối Thủ · Ly Tâm Ấn";

                    SetHudPrimaryAction(label, hasTarget, () =>
                    {
                        int target = _selectedTargetSeat;
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "fan_jian",
                            targetSeats = new[] { target },
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "li_jian":
                {
                    List<int> validTargets = GetAliveMaleOtherSeats(pv);
                    _tableController?.SetValidTargetSeats(validTargets);
                    for (int i = _orderedSkillTargetSeats.Count - 1; i >= 0; i--)
                    {
                        if (!validTargets.Contains(_orderedSkillTargetSeats[i]))
                        {
                            _orderedSkillTargetSeats.RemoveAt(i);
                        }
                    }

                    int[] orderedPair = BuildValidLiJianPair(pv, _orderedSkillTargetSeats);
                    _tableController?.SetTargetedSeat(_orderedSkillTargetSeats.Count > 0 ? _orderedSkillTargetSeats[_orderedSkillTargetSeats.Count - 1] : -1);
                    CardInstanceDto discardCard = GetSingleSelectedSkillCard(pv)
                        ?? ((pv.MyHand == null || pv.MyHand.Count == 0) ? FindFirstEquippedCard(pv.MySeat) : null);
                    bool ready = discardCard != null && orderedPair != null;

                    string label = validTargets.Count < 2
                        ? "Cần Tối Thiểu 2 Nam Hiệp Khách"
                        : ready
                            ? $"Mê Hồn Ấn · {CuuChauCombatRules.ResolveSeatHeroName(pv, orderedPair[0])} Đấu {CuuChauCombatRules.ResolveSeatHeroName(pv, orderedPair[1])}"
                            : discardCard == null
                                ? "Chọn 1 Lá Bỏ · Mê Hồn Ấn"
                                : $"Chọn 2 Nam Hiệp Khách ({_orderedSkillTargetSeats.Count}/2)";

                    SetHudPrimaryAction(label, ready, () =>
                    {
                        string cardId = discardCard.Id;
                        int[] pairSeats = orderedPair;
                        ExitPlaySkillMode(pv);
                        PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "li_jian",
                            cardIds = new[] { cardId },
                            targetSeats = pairSeats,
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "ji_jiang":
                {
                    bool canStrike = CuuChauCombatRules.CanUseStrikeInPlayPhase(pv, pv.MySeat);
                    bool hasAlly = HasAliveThanhVanAlly(pv);
                    List<int> validTargets = canStrike && hasAlly
                        ? CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat")
                        : new List<int>();
                    _tableController?.SetValidTargetSeats(validTargets);
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);

                    string label = !canStrike
                        ? "Đã Hết Lượt Kiếm Trảm"
                        : !hasAlly
                            ? "Chưa Có Đồng Môn Thanh Vân"
                            : hasTarget
                                ? $"Hiệu Lệnh · Trảm {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                                : "Chọn Mục Tiêu · Hiệu Lệnh";

                    SetHudPrimaryAction(label, canStrike && hasAlly && hasTarget, () =>
                    {
                        int target = _selectedTargetSeat;
                        _activePlaySkillId = null;
                        PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "ACTIVATE_HERO_SKILL",
                            seatIndex = mySeat,
                            skillId = "ji_jiang",
                            targetSeats = new[] { target },
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                case "truong_bat_xa_mau":
                {
                    List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat");
                    _tableController?.SetValidTargetSeats(validTargets);
                    bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);
                    bool hasTwo = _multiSelectedCardIds.Count == 2;
                    bool ready = hasTwo && hasTarget;

                    string label = ready
                        ? $"Xà Ảnh Mâu · Trảm {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                        : !hasTwo
                            ? $"Hợp 2 Lá Thành Trảm ({_multiSelectedCardIds.Count}/2)"
                            : "Chọn Mục Tiêu · Xà Ảnh Mâu";

                    SetHudPrimaryAction(label, ready, () =>
                    {
                        var pair = new[] { _multiSelectedCardIds[0], _multiSelectedCardIds[1] };
                        int stickyTarget = _selectedTargetSeat;
                        _activePlaySkillId = null;
                        _multiSelectedCardIds.Clear();
                        RefreshHandSelectionVisuals();
                        float pan = ComputeSeatPanStereo(stickyTarget, mySeat, pv.Players != null ? pv.Players.Count : 4);
                        PlaySfxWithFallback("sfx-sat", "sfx-click", pan);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "PLAY_CARD",
                            seatIndex = mySeat,
                            cardIds = pair,
                            targetSeats = new[] { stickyTarget },
                            asCardKey = "sat",
                        });
                    });
                    BindSkillSecondaryButton();
                    break;
                }

                default:
                {
                    string targetCardKey = GetConversionTargetCardKey(skillOptionId);
                    if (!string.IsNullOrEmpty(targetCardKey))
                    {
                        string targetCardName = ResolveCardKeyNameVi(targetCardKey, targetCardKey);
                        List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, targetCardKey);
                        _tableController?.SetValidTargetSeats(validTargets);
                        CardInstanceDto card = GetSingleSelectedSkillCard(pv);
                        if (card != null && !IsCardEligibleForPlaySkill(pv, skillOptionId, card))
                        {
                            card = null;
                        }
                        bool hasTarget = _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat);
                        _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);
                        bool ready = card != null && hasTarget;

                        string label = ready
                            ? $"Xuất {targetCardName} · {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                            : card == null
                                ? $"Chọn 1 Lá Hóa {targetCardName}"
                                : $"Chọn Mục Tiêu · {targetCardName}";

                        SetHudPrimaryAction(label, ready, () =>
                        {
                            _activePlaySkillId = null;
                            _ = PlaySelectedCardAsync(card, _selectedTargetSeat, targetCardKey);
                        });
                        BindSkillSecondaryButton();
                    }
                    else
                    {
                        ExitPlaySkillMode(pv);
                    }
                    break;
                }
            }
        }

        private void ConfigureInterruptActionBar(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            int mySeat = pv.ViewerSeatIndex;
            _tableController?.SetValidTargetSeats(null);
            _tableController?.SetTargetedSeat(-1);

            switch (intr.Kind)
            {
                case "WAIT_DODGE":
                case "WAIT_AOE_DODGE":
                {
                    string wsType = intr.Kind == "WAIT_DODGE" ? "RESPOND_DODGE" : "RESPOND_AOE_DODGE";
                    bool allowBagua = intr.AllowBagua ?? CuuChauCombatRules.GetExtraBool(intr, "allowBagua");
                    bool baguaTried = intr.BaguaTried ?? CuuChauCombatRules.GetExtraBool(intr, "baguaTried");
                    bool canBagua = allowBagua && !baguaTried;

                    CardInstanceDto explicitDodge = FindSelectedPlayableInterruptCard(pv, intr);
                    CardInstanceDto anyDodge = explicitDodge ?? FindFirstPlayableCardInHand(pv, intr);

                    if (explicitDodge != null)
                    {
                        SetHudPrimaryAction($"Xuất Thân Pháp · {ResolveCardNameVi(explicitDodge)}", true, () =>
                        {
                            PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = explicitDodge.Id });
                        });
                        if (canBagua)
                        {
                            _hudController.ShowSecondarySkip(true, "Phán Xét Bát Quái Y", () =>
                                _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = (string)null, useBagua = true }));
                        }
                        else
                        {
                            _hudController.ShowSecondarySkip(true, "Không Né (Nhận Đòn)", () =>
                                _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = (string)null }));
                        }
                    }
                    else if (canBagua)
                    {
                        SetHudPrimaryAction("Phán Xét Bát Quái Y", true, () =>
                            _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = (string)null, useBagua = true }));
                        _hudController.ShowSecondarySkip(true, "Không Né (Nhận Đòn)", () =>
                            _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = (string)null }));
                    }
                    else
                    {
                        SetHudPrimaryAction(
                            anyDodge != null ? "Xuất Thân Pháp" : "Chưa Có Thân Pháp",
                            anyDodge != null,
                            () =>
                            {
                                PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                                ClearSelectionAndArrow();
                                _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = anyDodge?.Id });
                            });
                        _hudController.ShowSecondarySkip(true, "Không Né (Nhận Đòn)", () =>
                            _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardId = (string)null }));
                    }
                    break;
                }

                case "WAIT_AOE_SAT":
                case "WAIT_DUEL_SAT":
                case "WAIT_COLLATERAL_SAT":
                case "WAIT_JI_JIANG":
                case "ASK_THANH_LONG":
                {
                    CardInstanceDto satCard = FindSelectedPlayableInterruptCard(pv, intr) ?? FindFirstPlayableCardInHand(pv, intr);
                    string wsType = intr.Kind switch
                    {
                        "WAIT_AOE_SAT" => "RESPOND_AOE_SAT",
                        "WAIT_DUEL_SAT" => "RESPOND_DUEL_SAT",
                        "WAIT_COLLATERAL_SAT" => "RESPOND_COLLATERAL_SAT",
                        "WAIT_JI_JIANG" => "RESPOND_JI_JIANG",
                        _ => "RESPOND_THANH_LONG",
                    };
                    SetHudPrimaryAction(
                        satCard != null ? $"Xuất Kiếm Trảm · {ResolveCardNameVi(satCard)}" : "Chưa Có Kiếm Trảm",
                        satCard != null,
                        () =>
                        {
                            PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardIds = satCard != null ? new[] { satCard.Id } : null });
                        });
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, cardIds = (string[])null }));
                    break;
                }

                case "WAIT_NULLIFICATION":
                {
                    CardInstanceDto nullCard = FindSelectedPlayableInterruptCard(pv, intr) ?? FindFirstPlayableCardInHand(pv, intr);
                    string scrollLabel = !string.IsNullOrEmpty(intr.ScrollNameVi) ? intr.ScrollNameVi : "Bí Kíp";
                    SetHudPrimaryAction(
                        nullCard != null ? $"Hóa Giải · {scrollLabel}" : "Chưa Có Hóa Giải",
                        nullCard != null,
                        () =>
                        {
                            PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId = nullCard?.Id });
                        });
                    _hudController.ShowSecondarySkip(true, "Cho Qua Bí Kíp", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_PEACH_RESCUE":
                {
                    CardInstanceDto peach = FindSelectedPlayableInterruptCard(pv, intr) ?? FindFirstPlayableCardInHand(pv, intr);
                    string dyingName = CuuChauCombatRules.ResolveSeatHeroName(pv, intr.TargetSeat);
                    SetHudPrimaryAction(
                        peach != null ? $"Hồi Xuân Cứu · {dyingName}" : $"Chưa Có Hồi Xuân ({dyingName})",
                        peach != null,
                        () =>
                        {
                            PlaySfxWithFallback("sfx-dao", "sfx-click", 0f);
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId = peach?.Id });
                        });
                    _hudController.ShowSecondarySkip(true, "Không Cứu", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_HARVEST_PICK":
                {
                    CardInstanceDto pick = FindCardInHarvestPool(pv, _selectedCardId)
                        ?? (pv.HarvestPool != null && pv.HarvestPool.Count > 0 ? pv.HarvestPool[0] : null);
                    string pickName = pick != null ? ResolveCardNameVi(pick) : string.Empty;
                    SetHudPrimaryAction(
                        pick != null ? $"Thiên Bảo · Lấy {pickName}" : "Thiên Bảo Xuất Thế",
                        pick != null,
                        () =>
                        {
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId = pick?.Id });
                        });
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
                    string skillLabel = intr.Kind switch
                    {
                        "ASK_LUO_SHEN" => "Hàn Giang Ảnh",
                        "ASK_LUO_YI" => "Bá Thể Phá",
                        "ASK_KE_JI" => "Tĩnh Tâm Thủ",
                        "ASK_TIE_QI" => "Phá Phong Quyết",
                        "ASK_TIAN_DO" => "Thiên Mệnh Thu",
                        "ASK_JIAN_XIONG" => "Thiết Huyết Phản",
                        "ASK_FAN_KUI" => "Ám Đoạt Ấn",
                        _ => "Bất Khuất Hồn",
                    };
                    SetHudPrimaryAction($"Phát Động · {skillLabel}", true, () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, activate = true }));
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = wsType, seatIndex = mySeat, activate = false }));
                    break;
                }

                case "ASK_TU_HUNG":
                {
                    CardInstanceDto discardCard = FindCardInMyHand(pv, _selectedCardId)
                        ?? (pv.MyHand != null && pv.MyHand.Count > 0 ? pv.MyHand[0] : null);
                    SetHudPrimaryAction(
                        discardCard != null ? $"Bỏ Lá · {ResolveCardNameVi(discardCard)}" : "Không Có Bài Trên Tay",
                        discardCard != null,
                        () =>
                        {
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = "RESPOND_TU_HUNG", seatIndex = mySeat, choice = "DISCARD_HAND", discardCardId = discardCard?.Id });
                        });
                    _hudController.ShowSecondarySkip(true, "Để Đối Thủ Rút 1 Lá", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_TU_HUNG", seatIndex = mySeat, choice = "ALLOW_DRAW" }));
                    break;
                }

                case "WAIT_GANG_LIE_CHOICE":
                {
                    bool canDiscardTwo = _multiSelectedCardIds.Count == 2;
                    SetHudPrimaryAction($"Bỏ 2 Lá ({_multiSelectedCardIds.Count}/2)", canDiscardTwo, () =>
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
                    string handPick = intr.HandPick ?? CuuChauCombatRules.GetExtraString(intr, "handPick");
                    if (handPick == "PREPARE")
                    {
                        SetHudPrimaryAction("Xáo & Mở Chọn Bài Úp", true, () =>
                            _ = SendSimpleActionAsync(new { type = "CONFIRM_STEAL_HAND", seatIndex = mySeat }));
                        _hudController.ShowSecondarySkip(false);
                    }
                    else if (handPick == "SELECT")
                    {
                        PublicPlayerViewDto targetPlayer = CuuChauCombatRules.FindPlayerBySeat(pv, intr.TargetSeat);
                        int count = Mathf.Max(1, targetPlayer?.HandCount ?? 1);
                        _pickHandSlotIndex %= count;
                        int slotIdx = _pickHandSlotIndex;

                        SetHudPrimaryAction($"Đoạt Lá Úp #{slotIdx + 1}/{count}", true, () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "HAND", handIndex = slotIdx }));

                        if (count > 1)
                        {
                            int nextSlot = (slotIdx + 1) % count;
                            _hudController.ShowSecondarySkip(true, $"Đổi Vị Trí (#{nextSlot + 1}/{count})", () =>
                            {
                                _pickHandSlotIndex = nextSlot;
                                UpdateActionBarForState(pv, intr);
                            });
                        }
                        else
                        {
                            _hudController.ShowSecondarySkip(false);
                        }
                    }
                    else
                    {
                        PublicPlayerViewDto targetSeatPlayer = CuuChauCombatRules.FindPlayerBySeat(pv, intr.TargetSeat);
                        bool allowDelayed = (intr.AllowDelayed ?? CuuChauCombatRules.GetExtraBool(intr, "allowDelayed")) == true;
                        bool isStealing = intr.Stealing ?? CuuChauCombatRules.GetExtraBool(intr, "stealing");
                        List<TargetZoneChoice> zones = BuildPickableTargetZones(targetSeatPlayer, allowDelayed);
                        string verb = isStealing ? "Đoạt" : "Phá";

                        if (zones.Count == 0)
                        {
                            SetHudPrimaryAction($"{verb} Bài Mục Tiêu", true, () =>
                                _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "HAND", handIndex = 0 }));
                            _hudController.ShowSecondarySkip(false);
                        }
                        else
                        {
                            _pickZoneIndex %= zones.Count;
                            TargetZoneChoice chosen = zones[_pickZoneIndex];
                            SetHudPrimaryAction($"{verb} · {chosen.Label}", true, () =>
                            {
                                if (chosen.Zone == "DELAYED")
                                {
                                    _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "DELAYED", delayedCardId = chosen.DelayedCardId });
                                }
                                else if (chosen.Zone == "HAND")
                                {
                                    _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = "HAND", handIndex = 0 });
                                }
                                else
                                {
                                    _ = SendSimpleActionAsync(new { type = "RESPOND_PICK_TARGET_CARD", seatIndex = mySeat, zone = chosen.Zone });
                                }
                            });

                            if (zones.Count > 1)
                            {
                                TargetZoneChoice nextZone = zones[(_pickZoneIndex + 1) % zones.Count];
                                _hudController.ShowSecondarySkip(true, $"Đổi Mục Tiêu: {nextZone.Label}", () =>
                                {
                                    _pickZoneIndex = (_pickZoneIndex + 1) % zones.Count;
                                    UpdateActionBarForState(pv, intr);
                                });
                            }
                            else
                            {
                                _hudController.ShowSecondarySkip(false);
                            }
                        }
                    }
                    break;
                }

                case "ASK_KY_LAN_CUNG":
                {
                    PublicPlayerViewDto victim = CuuChauCombatRules.FindPlayerBySeat(pv, intr.TargetSeat);
                    var horses = new List<TargetZoneChoice>(3);
                    if (victim?.Equipments?.PlusOneHorse != null)
                    {
                        horses.Add(new TargetZoneChoice("PLUS_ONE_HORSE", $"Khinh Công +1 · {ResolveCardNameVi(victim.Equipments.PlusOneHorse)}", null));
                    }
                    if (victim?.Equipments?.MinusOneHorse != null)
                    {
                        horses.Add(new TargetZoneChoice("MINUS_ONE_HORSE", $"Thân Pháp -1 · {ResolveCardNameVi(victim.Equipments.MinusOneHorse)}", null));
                    }

                    if (horses.Count <= 1)
                    {
                        string zone = horses.Count == 1 ? horses[0].Zone : null;
                        string label = horses.Count == 1 ? $"Phá · {horses[0].Label}" : "Phá Khinh Công Đối Thủ";
                        SetHudPrimaryAction(label, zone != null, () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_KY_LAN_CUNG", seatIndex = mySeat, horseZone = zone }));
                        _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_KY_LAN_CUNG", seatIndex = mySeat, horseZone = (string)null }));
                    }
                    else
                    {
                        horses.Add(new TargetZoneChoice(null, "Bỏ Qua (Không Phá)", null));
                        _kyLanChoiceIndex %= horses.Count;
                        TargetZoneChoice chosen = horses[_kyLanChoiceIndex];
                        TargetZoneChoice next = horses[(_kyLanChoiceIndex + 1) % horses.Count];

                        string primaryLabel = chosen.Zone != null ? $"Phá · {chosen.Label}" : chosen.Label;
                        SetHudPrimaryAction(primaryLabel, true, () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_KY_LAN_CUNG", seatIndex = mySeat, horseZone = chosen.Zone }));
                        _hudController.ShowSecondarySkip(true, $"Đổi: {next.Label}", () =>
                        {
                            _kyLanChoiceIndex = (_kyLanChoiceIndex + 1) % horses.Count;
                            UpdateActionBarForState(pv, intr);
                        });
                    }
                    break;
                }

                case "WAIT_FAN_JIAN_GUESS":
                {
                    _fanJianSuitIndex %= FanJianSuitChoices.Length;
                    (string suitCode, string suitLabel) cur = FanJianSuitChoices[_fanJianSuitIndex];
                    (string suitCode, string suitLabel) next = FanJianSuitChoices[(_fanJianSuitIndex + 1) % FanJianSuitChoices.Length];

                    SetHudPrimaryAction($"Đoán Chất: {cur.suitLabel}", true, () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_FAN_JIAN_GUESS", seatIndex = mySeat, suit = cur.suitCode }));
                    _hudController.ShowSecondarySkip(true, $"Đổi Chất: {next.suitLabel}", () =>
                    {
                        _fanJianSuitIndex = (_fanJianSuitIndex + 1) % FanJianSuitChoices.Length;
                        UpdateActionBarForState(pv, intr);
                    });
                    break;
                }

                case "WAIT_GUAN_XING":
                {
                    List<CardInstanceDto> cards = GetGuanXingCards(intr);
                    var bottomSet = new HashSet<string>(_multiSelectedCardIds);
                    var topIds = new List<string>(cards.Count);
                    var bottomIds = new List<string>(_multiSelectedCardIds.Count);

                    for (int i = 0; i < cards.Count; i++)
                    {
                        if (!bottomSet.Contains(cards[i].Id))
                        {
                            topIds.Add(cards[i].Id);
                        }
                    }
                    for (int i = 0; i < _multiSelectedCardIds.Count; i++)
                    {
                        string id = _multiSelectedCardIds[i];
                        for (int j = 0; j < cards.Count; j++)
                        {
                            if (cards[j].Id == id)
                            {
                                bottomIds.Add(id);
                                break;
                            }
                        }
                    }

                    SetHudPrimaryAction($"Xếp Tinh Bàn ({topIds.Count}/{bottomIds.Count})", true, () =>
                    {
                        _multiSelectedCardIds.Clear();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GUAN_XING", seatIndex = mySeat, topCardIds = topIds, bottomCardIds = bottomIds });
                    });

                    if (bottomIds.Count > 0)
                    {
                        _hudController.ShowSecondarySkip(true, "Đặt Tất Cả Lên Đỉnh", () =>
                        {
                            _multiSelectedCardIds.Clear();
                            RefreshHandSelectionVisuals();
                            UpdateActionBarForState(pv, intr);
                        });
                    }
                    else
                    {
                        _hudController.ShowSecondarySkip(false);
                    }
                    break;
                }

                case "WAIT_YI_JI":
                {
                    List<CardInstanceDto> cards = GetYiJiCards(intr);
                    List<int> aliveSeats = GetAliveSeats(pv);
                    _tableController?.SetValidTargetSeats(aliveSeats);

                    int chosenSeat = (_selectedTargetSeat >= 0 && aliveSeats.Contains(_selectedTargetSeat))
                        ? _selectedTargetSeat
                        : mySeat;
                    _tableController?.SetTargetedSeat(chosenSeat != mySeat ? chosenSeat : -1);

                    var selectedSet = new HashSet<string>(_multiSelectedCardIds);
                    var selectedIds = new List<string>();
                    var unselectedIds = new List<string>();
                    for (int i = 0; i < cards.Count; i++)
                    {
                        if (selectedSet.Contains(cards[i].Id)) selectedIds.Add(cards[i].Id);
                        else unselectedIds.Add(cards[i].Id);
                    }

                    string receiverName = CuuChauCombatRules.ResolveSeatHeroName(pv, chosenSeat);
                    string primaryLabel;
                    if (chosenSeat == mySeat)
                    {
                        primaryLabel = $"Di Sách · Giữ {cards.Count} Lá";
                    }
                    else if (selectedIds.Count > 0 && unselectedIds.Count > 0)
                    {
                        primaryLabel = $"Giao {selectedIds.Count} Lá ({receiverName}) · Giữ {unselectedIds.Count}";
                    }
                    else
                    {
                        primaryLabel = $"Di Sách · Giao {cards.Count} Lá Cho {receiverName}";
                    }

                    SetHudPrimaryAction(primaryLabel, cards.Count > 0, () =>
                    {
                        object distributionsPayload;
                        if (chosenSeat == mySeat || selectedIds.Count == 0 || unselectedIds.Count == 0)
                        {
                            var allIds = new List<string>(cards.Count);
                            for (int i = 0; i < cards.Count; i++) allIds.Add(cards[i].Id);
                            distributionsPayload = new[] { new { targetSeat = chosenSeat, cardIds = allIds } };
                        }
                        else
                        {
                            distributionsPayload = new[]
                            {
                                new { targetSeat = chosenSeat, cardIds = selectedIds },
                                new { targetSeat = mySeat, cardIds = unselectedIds },
                            };
                        }
                        ClearSelectionAndArrow();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_YI_JI", seatIndex = mySeat, distributions = distributionsPayload });
                    });

                    if (chosenSeat != mySeat)
                    {
                        _hudController.ShowSecondarySkip(true, "Giữ Cho Bản Thân", () =>
                        {
                            _selectedTargetSeat = -1;
                            _multiSelectedCardIds.Clear();
                            RefreshHandSelectionVisuals();
                            UpdateActionBarForState(pv, intr);
                        });
                    }
                    else
                    {
                        _hudController.ShowSecondarySkip(false);
                    }
                    break;
                }

                case "ASK_QUAN_THACH_PHU":
                {
                    bool ready = _multiSelectedCardIds.Count == 2;
                    SetHudPrimaryAction($"Phá Sơn Phủ · Ép Trúng ({_multiSelectedCardIds.Count}/2 Lá)", ready, () =>
                    {
                        var pair = new[] { _multiSelectedCardIds[0], _multiSelectedCardIds[1] };
                        _multiSelectedCardIds.Clear();
                        PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new { type = "RESPOND_QUAN_THACH_PHU", seatIndex = mySeat, activate = true, discardCardIds = pair });
                    });
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_QUAN_THACH_PHU", seatIndex = mySeat, activate = false }));
                    break;
                }

                case "ASK_HAN_BANG_KIEM":
                {
                    PublicPlayerViewDto victim = CuuChauCombatRules.FindPlayerBySeat(pv, intr.TargetSeat);
                    int remaining = intr.RemainingDiscards ?? CuuChauCombatRules.GetExtraInt(intr, "remainingDiscards") ?? 2;
                    string skipLabel = remaining < 2 ? "Dừng Hủy Thêm" : "Gây Sát Thương Thường";
                    List<TargetZoneChoice> zones = BuildPickableTargetZones(victim, allowDelayed: false);

                    if (zones.Count <= 1)
                    {
                        TargetZoneChoice only = zones.Count == 1 ? zones[0] : new TargetZoneChoice("HAND", "Bài Đối Thủ", null);
                        SetHudPrimaryAction($"Băng Phách · Hủy {only.Label}", zones.Count > 0, () =>
                        {
                            object pickObj = only.Zone == "HAND"
                                ? (object)new { zone = "HAND", handIndex = 0 }
                                : new { zone = only.Zone };
                            _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = true, picks = new[] { pickObj } });
                        });
                        _hudController.ShowSecondarySkip(true, skipLabel, () =>
                            _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = false }));
                    }
                    else
                    {
                        zones.Add(new TargetZoneChoice(null, skipLabel, null));
                        _hanBangChoiceIndex %= zones.Count;
                        TargetZoneChoice chosen = zones[_hanBangChoiceIndex];
                        TargetZoneChoice next = zones[(_hanBangChoiceIndex + 1) % zones.Count];

                        string primaryLabel = chosen.Zone != null ? $"Băng Phách · Hủy {chosen.Label}" : chosen.Label;
                        SetHudPrimaryAction(primaryLabel, true, () =>
                        {
                            if (chosen.Zone == null)
                            {
                                _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = false });
                            }
                            else
                            {
                                object pickObj = chosen.Zone == "HAND"
                                    ? (object)new { zone = "HAND", handIndex = 0 }
                                    : new { zone = chosen.Zone };
                                _ = SendSimpleActionAsync(new { type = "RESPOND_HAN_BANG_KIEM", seatIndex = mySeat, activate = true, picks = new[] { pickObj } });
                            }
                        });
                        _hudController.ShowSecondarySkip(true, $"Đổi: {next.Label}", () =>
                        {
                            _hanBangChoiceIndex = (_hanBangChoiceIndex + 1) % zones.Count;
                            UpdateActionBarForState(pv, intr);
                        });
                    }
                    break;
                }

                case "ASK_LIU_LI":
                {
                    List<int> validRedirectSeats = GetValidLiuLiRedirectSeats(pv, intr);
                    _tableController?.SetValidTargetSeats(validRedirectSeats);

                    bool hasTarget = _selectedTargetSeat >= 0 && validRedirectSeats.Contains(_selectedTargetSeat);
                    _tableController?.SetTargetedSeat(hasTarget ? _selectedTargetSeat : -1);

                    CardInstanceDto discardCard = FindCardInMyHand(pv, _selectedCardId)
                        ?? ((pv.MyHand == null || pv.MyHand.Count == 0) ? FindFirstEquippedCard(pv.MySeat) : null);
                    bool ready = discardCard != null && hasTarget;

                    string primaryLabel = ready
                        ? $"Chuyển Đòn · {CuuChauCombatRules.ResolveSeatHeroName(pv, _selectedTargetSeat)}"
                        : discardCard == null
                            ? "Chọn 1 Lá Để Chuyển Đòn"
                            : "Chọn Ghế Nhận Đòn Thay";

                    SetHudPrimaryAction(primaryLabel, ready, () =>
                    {
                        string cardId = discardCard.Id;
                        int redirectSeat = _selectedTargetSeat;
                        ClearSelectionAndArrow();
                        PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                        _ = SendSimpleActionAsync(new
                        {
                            type = "RESPOND_LIU_LI",
                            seatIndex = mySeat,
                            activate = true,
                            discardCardId = cardId,
                            newTargetSeat = redirectSeat,
                        });
                    });
                    _hudController.ShowSecondarySkip(true, "Không Chuyển Đòn", () =>
                    {
                        ClearSelectionAndArrow();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_LIU_LI", seatIndex = mySeat, activate = false });
                    });
                    break;
                }

                case "WAIT_TU_XI":
                {
                    List<int> validSeats = GetTuXiTargetSeats(pv);
                    _tableController?.SetValidTargetSeats(validSeats);
                    bool hasTargets = _multiSelectedSeats.Count > 0;
                    SetHudPrimaryAction($"Kỳ Tập Đạo ({_multiSelectedSeats.Count}/2 Ghế)", hasTargets, () =>
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
                    SetHudPrimaryAction(
                        card != null ? $"Nghịch Mệnh · {ResolveCardNameVi(card)}" : "Chọn 1 Lá Đổi Phán Xét",
                        card != null,
                        () =>
                        {
                            ClearSelectionAndArrow();
                            PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                            _ = SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId = card?.Id });
                        });
                    _hudController.ShowSecondarySkip(true, "Bỏ Qua", () =>
                        _ = SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId = (string)null }));
                    break;
                }

                case "WAIT_HU_JIA":
                {
                    CardInstanceDto dodge = FindSelectedPlayableInterruptCard(pv, intr) ?? FindFirstPlayableCardInHand(pv, intr);
                    SetHudPrimaryAction(
                        dodge != null ? "Huyền Giáp Vệ · Xuất Thân Pháp" : "Chưa Có Thân Pháp",
                        dodge != null,
                        () =>
                        {
                            PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                            ClearSelectionAndArrow();
                            _ = SendSimpleActionAsync(new { type = "RESPOND_HU_JIA", seatIndex = mySeat, cardId = dodge?.Id });
                        });
                    _hudController.ShowSecondarySkip(true, "Không Hộ Vệ", () =>
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
                if (actorSeat != mySeat)
                {
                    ShowToast($"Đang chờ {CuuChauCombatRules.ResolveSeatHeroName(pv, actorSeat)} phản ứng.");
                    return;
                }

                if (intr.Kind == "WAIT_HARVEST_PICK")
                {
                    if (_selectedCardId == card.InstanceId)
                    {
                        ClearSelectionAndArrow();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId = card.InstanceId });
                    }
                    else
                    {
                        SelectSingleCard(card.InstanceId, keepTargetSeat: false);
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                        UpdateActionBarForState(pv, intr);
                    }
                    return;
                }

                if (intr.Kind == "WAIT_GUAN_XING")
                {
                    List<CardInstanceDto> gx = GetGuanXingCards(intr);
                    ToggleMultiCardSelection(card, gx.Count);
                    PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    UpdateActionBarForState(pv, intr);
                    return;
                }

                if (intr.Kind == "WAIT_YI_JI")
                {
                    List<CardInstanceDto> yj = GetYiJiCards(intr);
                    ToggleMultiCardSelection(card, yj.Count);
                    PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    UpdateActionBarForState(pv, intr);
                    return;
                }

                if (intr.Kind is "WAIT_GANG_LIE_CHOICE" or "ASK_QUAN_THACH_PHU")
                {
                    ToggleMultiCardSelection(card, 2);
                    PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    UpdateActionBarForState(pv, intr);
                    return;
                }

                CardInstanceDto intrCardDto = FindCardInMyHand(pv, card.InstanceId);
                if (!CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, intrCardDto))
                {
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, intrCardDto));
                    return;
                }

                if (intr.Kind == "ASK_LIU_LI")
                {
                    if (_selectedCardId == card.InstanceId && _selectedTargetSeat >= 0)
                    {
                        _ = DispatchInterruptCardPlayAsync(pv, intr, card.InstanceId);
                    }
                    else
                    {
                        SelectSingleCard(card.InstanceId, keepTargetSeat: true);
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                        UpdateActionBarForState(pv, intr);
                    }
                    return;
                }

                if (_selectedCardId == card.InstanceId)
                {
                    _ = DispatchInterruptCardPlayAsync(pv, intr, card.InstanceId);
                }
                else
                {
                    SelectSingleCard(card.InstanceId, keepTargetSeat: false);
                    PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    UpdateActionBarForState(pv, intr);
                }
                return;
            }

            if (pv.CurrentTurnSeat != mySeat)
            {
                CardInstanceDto offTurnDto = FindCardInMyHand(pv, card.InstanceId);
                ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, offTurnDto));
                return;
            }

            if (pv.TurnPhase == "DISCARD")
            {
                int excess = GetRequiredDiscardCount(pv);
                ToggleMultiCardSelection(card, excess);
                PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                UpdateActionBarForState(pv, null);
                return;
            }

            if (pv.TurnPhase != "PLAY")
            {
                CardInstanceDto nonPlayDto = FindCardInMyHand(pv, card.InstanceId);
                ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, nonPlayDto));
                return;
            }

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null) return;

            if (!string.IsNullOrEmpty(_activePlaySkillId))
            {
                HandleSkillModeCardClicked(pv, dto, card);
                return;
            }

            if (!CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto))
            {
                ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                return;
            }

            string effectiveKey = CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, dto, null);
            string asCardKey = !string.Equals(effectiveKey, dto.CardKey, StringComparison.Ordinal) ? effectiveKey : null;

            if (CuuChauCombatRules.RequiresTargetSelection(effectiveKey) &&
                CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, effectiveKey).Count == 0)
            {
                ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                return;
            }

            if (_selectedCardId == card.InstanceId && !CuuChauCombatRules.RequiresTargetSelection(effectiveKey))
            {
                _ = PlaySelectedCardAsync(dto, -1, asCardKey);
                return;
            }

            SelectSingleCard(card.InstanceId, keepTargetSeat: true);
            _collateralVictimCycleIndex = 0;
            PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
            UpdateActionBarForState(pv, null);
        }

        private void HandleSkillModeCardClicked(PlayerViewStateDto pv, CardInstanceDto dto, CardView25D card)
        {
            if (!IsCardEligibleForPlaySkill(pv, _activePlaySkillId, dto))
            {
                ShowToast("Lá bài này không phù hợp với tuyệt kỹ đang chọn.");
                return;
            }

            PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
            switch (_activePlaySkillId)
            {
                case "zhi_heng":
                case "ren_de":
                    ToggleMultiCardSelection(card, pv.MyHand != null ? pv.MyHand.Count : 12);
                    break;

                case "jie_yin":
                case "truong_bat_xa_mau":
                    ToggleMultiCardSelection(card, 2);
                    break;

                case "qing_nang":
                case "li_jian":
                default:
                    if (_selectedCardId == card.InstanceId)
                    {
                        _selectedCardId = null;
                        RefreshHandSelectionVisuals();
                    }
                    else
                    {
                        SelectSingleCard(card.InstanceId, keepTargetSeat: true);
                    }
                    break;
            }
            UpdateActionBarForState(pv, null);
        }

        private void HandleHandCardDragMoved(CardView25D card, Vector2 screenPos)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (card == null || pv == null || _silkArrow == null || _stageRect == null) return;
            if (pv.CurrentTurnSeat != pv.ViewerSeatIndex || pv.TurnPhase != "PLAY" || pv.ActiveInterrupt != null)
            {
                _silkArrow.Hide();
                return;
            }

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null)
            {
                _silkArrow.Hide();
                return;
            }

            string forcedConversion = GetConversionTargetCardKey(_activePlaySkillId);
            bool playableInContext = !string.IsNullOrEmpty(forcedConversion)
                ? IsCardEligibleForPlaySkill(pv, _activePlaySkillId, dto)
                : (string.IsNullOrEmpty(_activePlaySkillId) && CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto));

            if (!playableInContext)
            {
                _silkArrow.Hide();
                if (!_dragToastShownThisGesture && string.IsNullOrEmpty(_activePlaySkillId))
                {
                    _dragToastShownThisGesture = true;
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                }
                return;
            }

            string effectiveKey = CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, dto, forcedConversion);
            if (!CuuChauCombatRules.RequiresTargetSelection(effectiveKey))
            {
                _silkArrow.Hide();
                return;
            }

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, effectiveKey);
            if (validTargets.Count == 0)
            {
                _silkArrow.Hide();
                if (!_dragToastShownThisGesture)
                {
                    _dragToastShownThisGesture = true;
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                }
                return;
            }

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
            _dragToastShownThisGesture = false;

            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (card == null || pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            if (pv.ActiveInterrupt != null)
            {
                int actorSeat = CuuChauCombatRules.GetInterruptActorSeat(pv.ActiveInterrupt, mySeat);
                if (actorSeat == mySeat && abovePlayThreshold)
                {
                    if (pv.ActiveInterrupt.Kind == "WAIT_HARVEST_PICK")
                    {
                        ClearSelectionAndArrow();
                        _ = SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId = card.InstanceId });
                    }
                    else
                    {
                        CardInstanceDto intrCard = FindCardInMyHand(pv, card.InstanceId);
                        if (CuuChauCombatRules.IsCardPlayableForInterrupt(pv, pv.ActiveInterrupt, intrCard))
                        {
                            _ = DispatchInterruptCardPlayAsync(pv, pv.ActiveInterrupt, card.InstanceId);
                        }
                        else
                        {
                            ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, intrCard));
                        }
                    }
                }
                return;
            }

            if (pv.CurrentTurnSeat != mySeat || pv.TurnPhase != "PLAY")
            {
                if (abovePlayThreshold)
                {
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, FindCardInMyHand(pv, card.InstanceId)));
                }
                return;
            }

            CardInstanceDto dto = FindCardInMyHand(pv, card.InstanceId);
            if (dto == null) return;

            string forcedConversion = GetConversionTargetCardKey(_activePlaySkillId);
            if (!string.IsNullOrEmpty(_activePlaySkillId) && string.IsNullOrEmpty(forcedConversion))
            {
                return;
            }

            bool playable = !string.IsNullOrEmpty(forcedConversion)
                ? IsCardEligibleForPlaySkill(pv, _activePlaySkillId, dto)
                : CuuChauCombatRules.IsCardPlayableInPlayPhase(pv, dto);

            if (!playable)
            {
                if (abovePlayThreshold)
                {
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                }
                return;
            }

            string effectiveKey = CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, dto, forcedConversion);
            string asCardKey = !string.Equals(effectiveKey, dto.CardKey, StringComparison.Ordinal) ? effectiveKey : null;

            if (!CuuChauCombatRules.RequiresTargetSelection(effectiveKey))
            {
                if (abovePlayThreshold)
                {
                    _activePlaySkillId = null;
                    _ = PlaySelectedCardAsync(dto, -1, asCardKey);
                }
                return;
            }

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, effectiveKey);
            if (validTargets.Count == 0)
            {
                if (abovePlayThreshold)
                {
                    ShowToast(CuuChauCombatRules.ExplainWhyCardUnplayableVi(pv, dto));
                }
                return;
            }

            int dropSeat = FindSeatUnderScreenPoint(screenPos, pv);
            if (dropSeat >= 0 && validTargets.Contains(dropSeat))
            {
                _activePlaySkillId = null;
                _ = PlaySelectedCardAsync(dto, dropSeat, asCardKey);
            }
            else if (abovePlayThreshold && _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat))
            {
                _activePlaySkillId = null;
                _ = PlaySelectedCardAsync(dto, _selectedTargetSeat, asCardKey);
            }
            else
            {
                SelectSingleCard(card.InstanceId, keepTargetSeat: true);
                UpdateActionBarForState(pv, null);
            }
        }

        private void HandleSeatClicked(int seatIndex)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (pv == null) return;

            int mySeat = pv.ViewerSeatIndex;
            PublicInterruptViewDto intr = pv.ActiveInterrupt;
            if (intr != null)
            {
                if (CuuChauCombatRules.GetInterruptActorSeat(intr, mySeat) != mySeat) return;

                if (intr.Kind == "WAIT_TU_XI")
                {
                    List<int> validTuXi = GetTuXiTargetSeats(pv);
                    if (validTuXi.Contains(seatIndex))
                    {
                        if (_multiSelectedSeats.Contains(seatIndex)) _multiSelectedSeats.Remove(seatIndex);
                        else if (_multiSelectedSeats.Count < 2) _multiSelectedSeats.Add(seatIndex);
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                        UpdateActionBarForState(pv, intr);
                    }
                    return;
                }

                if (intr.Kind == "WAIT_YI_JI")
                {
                    List<int> aliveSeats = GetAliveSeats(pv);
                    if (aliveSeats.Contains(seatIndex))
                    {
                        _selectedTargetSeat = seatIndex;
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                        UpdateActionBarForState(pv, intr);
                    }
                    return;
                }

                if (intr.Kind == "ASK_LIU_LI")
                {
                    List<int> validRedirect = GetValidLiuLiRedirectSeats(pv, intr);
                    if (validRedirect.Contains(seatIndex))
                    {
                        _selectedTargetSeat = seatIndex;
                        PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                        UpdateActionBarForState(pv, intr);
                    }
                    return;
                }

                return;
            }

            if (pv.CurrentTurnSeat != mySeat || pv.TurnPhase != "PLAY") return;

            if (!string.IsNullOrEmpty(_activePlaySkillId))
            {
                HandleSkillModeSeatClicked(pv, seatIndex);
                return;
            }

            if (string.IsNullOrEmpty(_selectedCardId)) return;

            CardInstanceDto selectedCard = FindCardInMyHand(pv, _selectedCardId);
            if (selectedCard == null) return;

            string effectiveKey = CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, selectedCard, null);
            string asCardKey = !string.Equals(effectiveKey, selectedCard.CardKey, StringComparison.Ordinal) ? effectiveKey : null;
            if (!CuuChauCombatRules.RequiresTargetSelection(effectiveKey)) return;

            List<int> validTargets = CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, effectiveKey);

            if (effectiveKey == "ta_dao_sat_nhan" && _selectedTargetSeat >= 0 && validTargets.Contains(_selectedTargetSeat) && seatIndex != _selectedTargetSeat)
            {
                List<int> victims = CuuChauCombatRules.GetValidCollateralVictimSeats(pv, _selectedTargetSeat);
                int victimIdx = victims.IndexOf(seatIndex);
                if (victimIdx >= 0 && !validTargets.Contains(seatIndex))
                {
                    _collateralVictimCycleIndex = victimIdx;
                    PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                    UpdateActionBarForState(pv, null);
                    return;
                }
            }

            if (!validTargets.Contains(seatIndex)) return;

            if (_selectedTargetSeat == seatIndex)
            {
                int secondary = effectiveKey == "ta_dao_sat_nhan"
                    ? ResolveChosenCollateralVictim(pv, seatIndex)
                    : -1;
                _ = PlaySelectedCardAsync(selectedCard, seatIndex, asCardKey, secondary);
            }
            else
            {
                _selectedTargetSeat = seatIndex;
                _collateralVictimCycleIndex = 0;
                _tableController?.SetTargetedSeat(seatIndex);
                PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                UpdateActionBarForState(pv, null);
            }
        }

        private void HandleSkillModeSeatClicked(PlayerViewStateDto pv, int seatIndex)
        {
            if (_activePlaySkillId == "li_jian")
            {
                List<int> validMales = GetAliveMaleOtherSeats(pv);
                if (!validMales.Contains(seatIndex)) return;

                if (_orderedSkillTargetSeats.Contains(seatIndex))
                {
                    _orderedSkillTargetSeats.Remove(seatIndex);
                }
                else
                {
                    if (_orderedSkillTargetSeats.Count >= 2)
                    {
                        _orderedSkillTargetSeats.RemoveAt(0);
                    }
                    _orderedSkillTargetSeats.Add(seatIndex);
                }
                PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
                UpdateActionBarForState(pv, null);
                return;
            }

            List<int> validTargets = _activePlaySkillId switch
            {
                "ren_de" or "fan_jian" => GetAliveOtherSeats(pv),
                "qing_nang" => GetWoundedAliveSeats(pv, includeSelf: true),
                "jie_yin" => GetWoundedMaleOtherSeats(pv),
                "ji_jiang" or "truong_bat_xa_mau" => CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat"),
                _ => !string.IsNullOrEmpty(GetConversionTargetCardKey(_activePlaySkillId))
                    ? CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, GetConversionTargetCardKey(_activePlaySkillId))
                    : new List<int>(),
            };

            if (!validTargets.Contains(seatIndex)) return;
            _selectedTargetSeat = seatIndex;
            _tableController?.SetTargetedSeat(seatIndex);
            PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
            UpdateActionBarForState(pv, null);
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

        private void HandleMuteChanged(bool muted)
        {
            _audioController?.SetMuted(muted);
        }

        private void HandleBgmMuteToggled(bool muted)
        {
            _audioController?.SetBgmMuted(muted);
        }

        private void HandleSfxMuteToggled(bool muted)
        {
            _audioController?.SetSfxMuted(muted);
        }

        private void HandleAutoSkipNullificationToggled(bool enabled)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (pv == null || string.IsNullOrEmpty(CurrentRoomCode)) return;
            _ = SendSimpleActionAsync(new
            {
                type = "SET_AUTO_SKIP_NULLIFICATION",
                seatIndex = pv.ViewerSeatIndex,
                enabled,
            });
        }

        private async Awaitable PlaySelectedCardAsync(
            CardInstanceDto card,
            int targetSeat,
            string asCardKey = null,
            int explicitSecondarySeat = -1)
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (_wsClient == null || pv == null || card == null || string.IsNullOrEmpty(CurrentRoomCode)) return;

            int mySeat = pv.ViewerSeatIndex;
            string effectiveKey = !string.IsNullOrEmpty(asCardKey)
                ? asCardKey
                : CuuChauCombatRules.ResolveEffectivePlayCardKey(pv, card, null);
            string resolvedAsKey = !string.Equals(effectiveKey, card.CardKey, StringComparison.Ordinal)
                ? effectiveKey
                : null;

            bool keepStickyTarget = effectiveKey is "sat" or "pha_giap_tram" && targetSeat >= 0 &&
                                    (CuuChauCombatRules.FindPlayerBySeat(pv, targetSeat)?.Alive == true);

            SpawnLocalCardPlayFlight(card, targetSeat, dissolveOnArrive: false);
            ClearSelectionAndArrow(keepStickyTarget ? targetSeat : -1);

            float pan = targetSeat >= 0
                ? ComputeSeatPanStereo(targetSeat, mySeat, pv.Players != null ? pv.Players.Count : 4)
                : 0f;
            TriggerPlayedCardSfx(card, effectiveKey, resolvedAsKey != null, pan);

            if (targetSeat < 0)
            {
                if (resolvedAsKey != null)
                {
                    await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                    {
                        type = "PLAY_CARD",
                        seatIndex = mySeat,
                        cardIds = new[] { card.Id },
                        asCardKey = resolvedAsKey,
                    });
                }
                else
                {
                    await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                    {
                        type = "PLAY_CARD",
                        seatIndex = mySeat,
                        cardIds = new[] { card.Id },
                    });
                }
                return;
            }

            if (effectiveKey == "ta_dao_sat_nhan")
            {
                int victimSeat = explicitSecondarySeat >= 0
                    ? explicitSecondarySeat
                    : ResolveChosenCollateralVictim(pv, targetSeat);
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

            if (resolvedAsKey != null)
            {
                await _wsClient.SendGameActionAsync(CurrentRoomCode, new
                {
                    type = "PLAY_CARD",
                    seatIndex = mySeat,
                    cardIds = new[] { card.Id },
                    targetSeats = new[] { targetSeat },
                    asCardKey = resolvedAsKey,
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
            if (intr.Kind == "WAIT_HARVEST_PICK")
            {
                ClearSelectionAndArrow();
                await SendSimpleActionAsync(new { type = "RESPOND_HARVEST_PICK", seatIndex = mySeat, cardId });
                return;
            }

            CardInstanceDto card = FindCardInMyHand(pv, cardId);
            if (card == null || !CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, card)) return;

            int savedTargetSeat = _selectedTargetSeat;
            SpawnLocalCardPlayFlight(
                card,
                intr.Kind == "ASK_LIU_LI" ? savedTargetSeat : -1,
                dissolveOnArrive: intr.Kind == "WAIT_NULLIFICATION");
            ClearSelectionAndArrow();
            switch (intr.Kind)
            {
                case "WAIT_DODGE":
                    PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_DODGE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_AOE_DODGE":
                    PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_AOE_DODGE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_HU_JIA":
                    PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_HU_JIA", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_NULLIFICATION":
                    PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_NULLIFICATION", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_PEACH_RESCUE":
                    PlaySfxWithFallback("sfx-dao", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_PEACH_RESCUE", seatIndex = mySeat, cardId });
                    break;
                case "WAIT_GUI_CAI":
                    PlaySfxWithFallback("sfx-scroll", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_GUI_CAI", seatIndex = mySeat, cardId });
                    break;
                case "ASK_TU_HUNG":
                    await SendSimpleActionAsync(new { type = "RESPOND_TU_HUNG", seatIndex = mySeat, choice = "DISCARD_HAND", discardCardId = cardId });
                    break;
                case "ASK_LIU_LI":
                {
                    List<int> validRedirect = GetValidLiuLiRedirectSeats(pv, intr);
                    if (savedTargetSeat >= 0 && validRedirect.Contains(savedTargetSeat))
                    {
                        PlaySfxWithFallback("sfx-thiem", "sfx-click", 0f);
                        await SendSimpleActionAsync(new
                        {
                            type = "RESPOND_LIU_LI",
                            seatIndex = mySeat,
                            activate = true,
                            discardCardId = cardId,
                            newTargetSeat = savedTargetSeat,
                        });
                    }
                    break;
                }
                case "WAIT_AOE_SAT":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_AOE_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_DUEL_SAT":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_DUEL_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_COLLATERAL_SAT":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_COLLATERAL_SAT", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "WAIT_JI_JIANG":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
                    await SendSimpleActionAsync(new { type = "RESPOND_JI_JIANG", seatIndex = mySeat, cardIds = new[] { cardId } });
                    break;
                case "ASK_THANH_LONG":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", 0f);
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
            bool inputFocused = IsInputFieldFocused();
            bool inActiveCombat = LatestPayload?.RoomState?.Status == "IN_GAME"
                && LatestPayload.PlayerView != null
                && LatestPayload.PlayerView.TurnPhase != "HERO_SELECT"
                && LatestPayload.PlayerView.TurnPhase != "GAME_OVER"
                && !_refereeOpen
                && !_handbookOpen;

#if ENABLE_INPUT_SYSTEM
            if (inActiveCombat && !inputFocused && Mouse.current != null && Mouse.current.rightButton.wasPressedThisFrame)
            {
                _tooltipView?.Hide();
                if (!string.IsNullOrEmpty(_selectedCardId) ||
                    _selectedTargetSeat >= 0 ||
                    !string.IsNullOrEmpty(_activePlaySkillId) ||
                    _multiSelectedCardIds.Count > 0 ||
                    _multiSelectedSeats.Count > 0)
                {
                    ClearSelectionAndArrow();
                    RefreshHandAndActionBarLocal();
                }
                return;
            }

            Keyboard kb = Keyboard.current;
            if (kb == null) return;

            if (!inputFocused && kb.f2Key.wasPressedThisFrame)
            {
                if (_refereeOpen) CloseRefereeModal();
                else OpenRefereeModal();
                return;
            }

            if (!inputFocused && kb.tabKey.wasPressedThisFrame)
            {
                if (_handbookOpen) CloseHandbookModal();
                else OpenHandbookModal();
                return;
            }

            if (kb.escapeKey.wasPressedThisFrame)
            {
                if (_refereeOpen) CloseRefereeModal();
                if (_handbookOpen) CloseHandbookModal();
                _tooltipView?.Hide();
                ClearSelectionAndArrow();
                if (inActiveCombat) RefreshHandAndActionBarLocal();
                return;
            }

            if (!inActiveCombat || inputFocused) return;

            int pressedSlot = -1;
            if (kb.digit1Key.wasPressedThisFrame) pressedSlot = 0;
            else if (kb.digit2Key.wasPressedThisFrame) pressedSlot = 1;
            else if (kb.digit3Key.wasPressedThisFrame) pressedSlot = 2;
            else if (kb.digit4Key.wasPressedThisFrame) pressedSlot = 3;
            else if (kb.digit5Key.wasPressedThisFrame) pressedSlot = 4;
            else if (kb.digit6Key.wasPressedThisFrame) pressedSlot = 5;
            else if (kb.digit7Key.wasPressedThisFrame) pressedSlot = 6;
            else if (kb.digit8Key.wasPressedThisFrame) pressedSlot = 7;
            else if (kb.digit9Key.wasPressedThisFrame) pressedSlot = 8;

            if (pressedSlot >= 0 && _handLayout != null && pressedSlot < _handLayout.CardCount)
            {
                CardView25D slotCard = _handLayout.GetCardView(pressedSlot);
                if (slotCard != null)
                {
                    HandleHandCardClicked(slotCard);
                }
                return;
            }

            if (kb.eKey.wasPressedThisFrame)
            {
                PlayerViewStateDto pv = LatestPayload?.PlayerView;
                if (pv != null && pv.ActiveInterrupt == null && pv.CurrentTurnSeat == pv.ViewerSeatIndex && pv.TurnPhase == "PLAY")
                {
                    _ = SendEndPlayPhaseAsync();
                }
                return;
            }

            if (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame || kb.numpadEnterKey.wasPressedThisFrame)
            {
                if (_currentPrimaryInteractable && _currentPrimaryCallback != null)
                {
                    _currentPrimaryCallback.Invoke();
                }
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
            _lastInterruptId = string.Empty;
            _battleMusicStarted = false;
            _lastHpBySeat.Clear();
            _lastAliveBySeat.Clear();
            _lastProcessedActionLogCount = 0;
            _playSkillCycleIndex = 0;
            ClearSelectionAndArrow();
        }

        private void ClearSelectionAndArrow() => ClearSelectionAndArrow(-1);

        private void ClearSelectionAndArrow(int stickyTargetSeat)
        {
            _selectedCardId = null;
            _selectedTargetSeat = stickyTargetSeat;
            _activePlaySkillId = null;
            _collateralVictimCycleIndex = 0;
            _multiSelectedCardIds.Clear();
            _multiSelectedSeats.Clear();
            _orderedSkillTargetSeats.Clear();
            _tableController?.SetTargetedSeat(-1);
            _tableController?.SetValidTargetSeats(null);
            _silkArrow?.Hide();
            RefreshHandSelectionVisuals();
        }

        private void SelectSingleCard(string cardId, bool keepTargetSeat = true)
        {
            _selectedCardId = cardId;
            if (!keepTargetSeat)
            {
                _selectedTargetSeat = -1;
            }
            _multiSelectedCardIds.Clear();
            if (!keepTargetSeat)
            {
                _tableController?.SetTargetedSeat(-1);
            }
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

        private void SpawnLocalCardPlayFlight(CardInstanceDto card, int targetSeat, bool dissolveOnArrive)
        {
            if (_vfxOverlay == null || card == null) return;
            _lastLocalFlightCardId = card.Id ?? string.Empty;

            Vector2 startLocal = Vector2.zero;
            bool foundStart = false;
            if (_handLayout != null)
            {
                for (int i = 0; i < _handLayout.CardCount; i++)
                {
                    CardView25D cv = _handLayout.GetCardView(i);
                    if (cv != null && cv.InstanceId == card.Id && cv.RectTransform != null)
                    {
                        startLocal = WorldToOverlayLocal(cv.RectTransform.position);
                        foundStart = true;
                        break;
                    }
                }
            }

            if (!foundStart && _tableController != null && LatestPayload?.PlayerView != null)
            {
                SeatPlaqueView myPlaque = _tableController.GetSeatView(LatestPayload.PlayerView.ViewerSeatIndex);
                if (myPlaque != null)
                {
                    startLocal = WorldToOverlayLocal(myPlaque.GetTargetAnchorWorldPos());
                    foundStart = true;
                }
            }
            if (!foundStart) return;

            Vector2 endLocal = ResolveCardFlightEndLocal(targetSeat);
            Sprite art = _catalog != null ? _catalog.FindCardArt(card.CardKey) : null;
            _vfxOverlay.SpawnCardFlight(art, startLocal, endLocal, _burnMaterial, dissolveOnArrive, 0.22f);
        }

        private void SpawnBoardCardFlightFromSeat(string cardKey, int fromSeat, int toSeat, bool dissolveOnArrive)
        {
            if (_vfxOverlay == null || _tableController == null || fromSeat < 0) return;
            SeatPlaqueView fromPlaque = _tableController.GetSeatView(fromSeat);
            if (fromPlaque == null) return;

            Vector2 startLocal = WorldToOverlayLocal(fromPlaque.GetTargetAnchorWorldPos());
            Vector2 endLocal = ResolveCardFlightEndLocal(toSeat);
            Sprite art = _catalog != null ? _catalog.FindCardArt(cardKey) : null;
            _vfxOverlay.SpawnCardFlight(art, startLocal, endLocal, _burnMaterial, dissolveOnArrive, 0.22f);
        }

        private Vector2 ResolveCardFlightEndLocal(int targetSeat)
        {
            if (targetSeat >= 0 && _tableController != null)
            {
                SeatPlaqueView targetPlaque = _tableController.GetSeatView(targetSeat);
                if (targetPlaque != null)
                {
                    return WorldToOverlayLocal(targetPlaque.GetTargetAnchorWorldPos());
                }
            }
            if (_hudController != null && _hudController.DiscardPileAnchor != null)
            {
                return WorldToOverlayLocal(_hudController.DiscardPileAnchor.position);
            }
            return Vector2.zero;
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

        private static readonly (string Code, string Label)[] FanJianSuitChoices =
        {
            ("HEART", "♥ Cơ"),
            ("DIAMOND", "♦ Rô"),
            ("SPADE", "♠ Bích"),
            ("CLUB", "♣ Chuồn"),
        };

        private readonly struct TargetZoneChoice
        {
            public readonly string Zone;
            public readonly string Label;
            public readonly string DelayedCardId;

            public TargetZoneChoice(string zone, string label, string delayedCardId)
            {
                Zone = zone;
                Label = label;
                DelayedCardId = delayedCardId;
            }
        }

        private void SetHudPrimaryAction(string label, bool interactable, Action onClick)
        {
            _currentPrimaryInteractable = interactable && onClick != null;
            Action wrapped = onClick == null
                ? null
                : () =>
                {
                    if (_lastPrimaryInvokeFrame == Time.frameCount) return;
                    _lastPrimaryInvokeFrame = Time.frameCount;
                    onClick.Invoke();
                };
            _currentPrimaryCallback = wrapped;
            _hudController?.SetPrimaryAction(label, interactable, wrapped);
        }

        private void RefreshHandAndActionBarLocal()
        {
            PlayerViewStateDto pv = LatestPayload?.PlayerView;
            if (pv == null) return;
            _lastHandSignature = string.Empty;
            SyncHandAndActionButtons(pv);
        }

        private void EnterPlaySkillMode(PlayerViewStateDto pv, string skillOptionId)
        {
            _activePlaySkillId = skillOptionId;
            _selectedCardId = null;
            _multiSelectedCardIds.Clear();
            _orderedSkillTargetSeats.Clear();
            PlaySfxWithFallback("sfx-click", "sfx-click", 0f);
            RefreshHandAndActionBarLocal();
        }

        private void ExitPlaySkillMode(PlayerViewStateDto pv)
        {
            _activePlaySkillId = null;
            _selectedCardId = null;
            _multiSelectedCardIds.Clear();
            _orderedSkillTargetSeats.Clear();
            _tableController?.SetValidTargetSeats(null);
            _tableController?.SetTargetedSeat(-1);
            RefreshHandAndActionBarLocal();
        }

        private RectTransform ResolveFeelShakeTarget()
        {
            if (_stageRect != null && _stageRect.parent != null)
            {
                Transform canvasBoard = _stageRect.parent.Find("TableBoard_25D")
                    ?? _stageRect.parent.Find("TableBoard");
                if (canvasBoard is RectTransform canvasBoardRt) return canvasBoardRt;
            }
            if (_tableController != null)
            {
                Transform tableBoard = _tableController.transform.Find("TableBoard");
                if (tableBoard is RectTransform tableBoardRt) return tableBoardRt;
            }
            if (_stageRect != null)
            {
                Transform stageBoard = _stageRect.Find("TableBoard")
                    ?? _stageRect.Find("TableBackdrop")
                    ?? _stageRect.Find("ArenaBackdrop");
                if (stageBoard is RectTransform stageBoardRt) return stageBoardRt;
            }
            return null;
        }

        private void EnsureToastBannerBuilt()
        {
            if (_toastGroup != null && _toastText != null) return;
            Transform parent = _stageRect != null
                ? _stageRect
                : (_hudController != null ? _hudController.transform : transform);
            if (parent == null) return;

            Transform existing = parent.Find("TacticalToastBanner");
            GameObject go = existing != null
                ? existing.gameObject
                : new GameObject("TacticalToastBanner", typeof(RectTransform), typeof(Image), typeof(CanvasGroup));
            if (existing == null)
            {
                go.transform.SetParent(parent, false);
            }

            _toastRect = go.GetComponent<RectTransform>();
            _toastRect.anchorMin = new Vector2(0.5f, 1f);
            _toastRect.anchorMax = new Vector2(0.5f, 1f);
            _toastRect.pivot = new Vector2(0.5f, 1f);
            _toastRect.anchoredPosition = new Vector2(0f, -30f);
            _toastRect.sizeDelta = new Vector2(680f, 44f);

            var bg = go.GetComponent<Image>();
            bg.color = new Color(0.08f, 0.045f, 0.04f, 0.94f);
            bg.raycastTarget = false;

            _toastGroup = go.GetComponent<CanvasGroup>();
            _toastGroup.alpha = 0f;
            _toastGroup.interactable = false;
            _toastGroup.blocksRaycasts = false;

            Transform textExisting = _toastRect.Find("ToastText");
            GameObject textGo = textExisting != null
                ? textExisting.gameObject
                : new GameObject("ToastText", typeof(RectTransform), typeof(TextMeshProUGUI));
            if (textExisting == null)
            {
                textGo.transform.SetParent(_toastRect, false);
            }

            var textRt = textGo.GetComponent<RectTransform>();
            textRt.anchorMin = Vector2.zero;
            textRt.anchorMax = Vector2.one;
            textRt.offsetMin = new Vector2(18f, 4f);
            textRt.offsetMax = new Vector2(-18f, -4f);

            _toastText = textGo.GetComponent<TextMeshProUGUI>();
            TMP_FontAsset font = _sansFont != null ? _sansFont : _serifFont;
            if (font != null) _toastText.font = font;
            _toastText.fontSize = 16.5f;
            _toastText.fontStyle = FontStyles.Bold;
            _toastText.color = new Color(0.98f, 0.89f, 0.68f, 1f);
            _toastText.alignment = TextAlignmentOptions.Center;
            _toastText.textWrappingMode = TextWrappingModes.NoWrap;
            _toastText.overflowMode = TextOverflowModes.Truncate;
            _toastText.raycastTarget = false;

            go.SetActive(false);
        }

        private void ShowToast(string messageVi)
        {
            if (string.IsNullOrWhiteSpace(messageVi)) return;
            EnsureToastBannerBuilt();
            if (_toastGroup == null || _toastText == null) return;

            _toastText.text = messageVi.Trim();
            _toastHoldTimer = 2.6f;
            _toastCurrentAlpha = 1f;
            _toastGroup.alpha = 1f;
            if (!_toastGroup.gameObject.activeSelf)
            {
                _toastGroup.gameObject.SetActive(true);
            }
            _toastRect.SetAsLastSibling();
        }

        private void TickToastBanner(float dt)
        {
            if (_toastGroup == null || !_toastGroup.gameObject.activeSelf) return;

            if (_toastHoldTimer > 0f)
            {
                _toastHoldTimer -= dt;
                return;
            }

            _toastCurrentAlpha = Mathf.MoveTowards(_toastCurrentAlpha, 0f, dt * 3.8f);
            _toastGroup.alpha = _toastCurrentAlpha;
            if (_toastCurrentAlpha <= 0.01f)
            {
                _toastGroup.alpha = 0f;
                _toastGroup.gameObject.SetActive(false);
            }
        }

        private void PlaySfxWithFallback(string primaryKey, string fallbackKey, float panStereo)
        {
            if (_audioController == null) return;
            string keyToPlay = primaryKey;
            if (_catalog != null && !string.IsNullOrEmpty(primaryKey) && _catalog.FindSfx(primaryKey) == null)
            {
                keyToPlay = fallbackKey;
            }
            if (!string.IsNullOrEmpty(keyToPlay))
            {
                _audioController.PlaySpatialSfx(keyToPlay, panStereo);
            }
        }

        private void TriggerPlayedCardSfx(CardInstanceDto physicalCard, string effectiveCardKey, bool isConverted, float pan)
        {
            if (!isConverted && physicalCard != null && CuuChauCombatRules.IsEquipmentCategory(physicalCard.Category))
            {
                PlaySfxWithFallback("sfx-equip", "sfx-click", 0f);
                return;
            }

            switch (effectiveCardKey)
            {
                case "sat":
                case "pha_giap_tram":
                    PlaySfxWithFallback("sfx-sat", "sfx-click", pan);
                    break;
                case "thiem":
                    PlaySfxWithFallback("sfx-thiem", "sfx-click", pan);
                    break;
                case "dao":
                    PlaySfxWithFallback("sfx-dao", "sfx-click", pan);
                    break;
                case "thiem_dien":
                case "kinh_loi_chan":
                    PlaySfxWithFallback("sfx-lightning", "sfx-scroll", pan);
                    break;
                default:
                    PlaySfxWithFallback("sfx-scroll", "sfx-click", pan);
                    break;
            }
        }

        private static bool IsInputFieldFocused()
        {
            if (EventSystem.current == null) return false;
            GameObject selected = EventSystem.current.currentSelectedGameObject;
            return selected != null && selected.GetComponent<TMP_InputField>() != null;
        }

        private static int GetRequiredDiscardCount(PlayerViewStateDto pv)
        {
            if (pv == null) return 0;
            int handCount = pv.MyHand != null ? pv.MyHand.Count : 0;
            return pv.AvailableActions != null
                ? pv.AvailableActions.DiscardRequiredCount
                : Math.Max(0, handCount - (pv.MySeat?.MaxHandLimit ?? Math.Max(0, pv.MySeat?.Hp ?? 0)));
        }

        private static string ResolveCardKeyNameVi(string cardKey, string fallbackNameVi)
        {
            CardLoreInfo lore = CuuChauLoreLookup.GetCardInfo(cardKey);
            if (!string.IsNullOrEmpty(lore.NameVi) && !string.Equals(lore.NameVi, cardKey, StringComparison.OrdinalIgnoreCase))
            {
                return lore.NameVi;
            }
            return !string.IsNullOrEmpty(fallbackNameVi) ? fallbackNameVi : cardKey;
        }

        private static string ResolveCardNameVi(CardInstanceDto card)
        {
            if (card == null) return string.Empty;
            return ResolveCardKeyNameVi(card.CardKey, card.NameVi);
        }

        private static List<string> BuildAvailablePlaySkillOptions(PlayerViewStateDto pv)
        {
            var options = new List<string>();
            if (pv?.MySeat == null || !pv.MySeat.Alive) return options;

            PublicPlayerViewDto me = pv.MySeat;
            int handCount = pv.MyHand != null ? pv.MyHand.Count : me.HandCount;

            if (pv.AvailableActions?.ActivatableSkillIds != null && pv.AvailableActions.ActivatableSkillIds.Count > 0)
            {
                for (int i = 0; i < pv.AvailableActions.ActivatableSkillIds.Count; i++)
                {
                    string skillId = pv.AvailableActions.ActivatableSkillIds[i];
                    if (!string.IsNullOrEmpty(skillId) && !options.Contains(skillId))
                    {
                        options.Add(skillId);
                    }
                }
            }
            else if (pv.AvailableActions == null)
            {
                string legacyHero = CuuChauCombatRules.NormalizeLegacyHeroId(me.HeroId);
                TurnFlagsDto flags = pv.TurnFlags;
                switch (legacyHero)
                {
                    case "huang_gai":
                        options.Add("ku_rou");
                        break;
                    case "sun_quan":
                        if (flags?.ZhiHengUsedThisTurn != true && handCount > 0) options.Add("zhi_heng");
                        break;
                    case "liu_bei":
                        if (handCount > 0) options.Add("ren_de");
                        if (string.Equals(me.Identity, "LORD", StringComparison.OrdinalIgnoreCase) &&
                            !(pv.PeacefulFirstRound && pv.RoundNumber == 1) &&
                            flags?.JiJiangDeclinedThisTurn != true)
                        {
                            options.Add("ji_jiang");
                        }
                        break;
                    case "hua_tuo":
                        if (flags?.QingNangUsedThisTurn != true && handCount >= 1) options.Add("qing_nang");
                        break;
                    case "sun_shang_xiang":
                        if (flags?.JieYinUsedThisTurn != true && handCount >= 2) options.Add("jie_yin");
                        break;
                    case "zhou_yu":
                        if (flags?.FanJianUsedThisTurn != true && handCount > 0) options.Add("fan_jian");
                        break;
                    case "diao_chan":
                        if (flags?.LiJianUsedThisTurn != true && CuuChauCombatRules.HasAnyCardOrEquip(me)) options.Add("li_jian");
                        break;
                }
            }

            if (me.Equipments?.Weapon?.CardKey == "truong_bat_xa_mau" &&
                handCount >= 2 &&
                CuuChauCombatRules.CanUseStrikeInPlayPhase(pv, me) &&
                CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat").Count > 0)
            {
                options.Add("truong_bat_xa_mau");
            }

            string heroLegacy = CuuChauCombatRules.NormalizeLegacyHeroId(me.HeroId);
            if (pv.MyHand != null && pv.MyHand.Count > 0)
            {
                switch (heroLegacy)
                {
                    case "guan_yu":
                        if (CuuChauCombatRules.CanUseStrikeInPlayPhase(pv, me) &&
                            CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat").Count > 0 &&
                            HasHandCardMatching(pv.MyHand, c => CuuChauCombatRules.IsRedSuit(c.Suit)))
                        {
                            options.Add("conv_wu_sheng");
                        }
                        break;

                    case "zhao_yun":
                        if (CuuChauCombatRules.CanUseStrikeInPlayPhase(pv, me) &&
                            CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "sat").Count > 0 &&
                            HasHandCardMatching(pv.MyHand, c => c.CardKey == "thiem"))
                        {
                            options.Add("conv_long_dan");
                        }
                        break;

                    case "gan_ning":
                        if (CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "qua_ha_sai_cau").Count > 0 &&
                            HasHandCardMatching(pv.MyHand, c => CuuChauCombatRules.IsBlackSuit(c.Suit)))
                        {
                            options.Add("conv_qi_xi");
                        }
                        break;

                    case "da_qiao":
                        if (CuuChauCombatRules.GetValidTargetSeatsForCardKey(pv, "lac_bat_tu_thuc").Count > 0 &&
                            HasHandCardMatching(pv.MyHand, c => CuuChauCombatRules.IsDiamondSuit(c.Suit)))
                        {
                            options.Add("conv_guo_se");
                        }
                        break;
                }
            }

            return options;
        }

        private static bool HasHandCardMatching(List<CardInstanceDto> hand, Predicate<CardInstanceDto> pred)
        {
            if (hand == null) return false;
            for (int i = 0; i < hand.Count; i++)
            {
                if (hand[i] != null && pred(hand[i])) return true;
            }
            return false;
        }

        private static string GetPlaySkillDisplayNameVi(string skillOptionId)
        {
            return skillOptionId switch
            {
                "ku_rou" => "Phần Tâm Quyết",
                "zhi_heng" => "Dung Luyện Quyết",
                "ren_de" => "Thanh Vân Độ",
                "qing_nang" => "Thanh Tâm Đan",
                "jie_yin" => "Hợp Hoan Khí",
                "fan_jian" => "Ly Tâm Ấn",
                "li_jian" => "Mê Hồn Ấn",
                "ji_jiang" => "Hiệu Lệnh",
                "truong_bat_xa_mau" => "Xà Ảnh Mâu",
                "conv_wu_sheng" => "Xích Khí Trảm",
                "conv_long_dan" => "Du Long Thế",
                "conv_qi_xi" => "Hắc Ảnh Phá",
                "conv_guo_se" => "Chỉ Huyệt Pháp",
                _ => skillOptionId,
            };
        }

        private static string GetConversionTargetCardKey(string skillOptionId)
        {
            return skillOptionId switch
            {
                "conv_wu_sheng" or "conv_long_dan" => "sat",
                "conv_qi_xi" => "qua_ha_sai_cau",
                "conv_guo_se" => "lac_bat_tu_thuc",
                _ => null,
            };
        }

        private static bool IsCardEligibleForPlaySkill(PlayerViewStateDto pv, string skillOptionId, CardInstanceDto card)
        {
            if (pv == null || card == null || string.IsNullOrEmpty(skillOptionId)) return false;
            return skillOptionId switch
            {
                "ku_rou" or "fan_jian" or "ji_jiang" => false,
                "zhi_heng" or "ren_de" or "qing_nang" or "jie_yin" or "li_jian" or "truong_bat_xa_mau" => true,
                "conv_wu_sheng" => CuuChauCombatRules.IsRedSuit(card.Suit),
                "conv_long_dan" => card.CardKey == "thiem",
                "conv_qi_xi" => CuuChauCombatRules.IsBlackSuit(card.Suit),
                "conv_guo_se" => CuuChauCombatRules.IsDiamondSuit(card.Suit),
                _ => false,
            };
        }

        private CardInstanceDto GetSingleSelectedSkillCard(PlayerViewStateDto pv)
        {
            if (!string.IsNullOrEmpty(_selectedCardId))
            {
                CardInstanceDto direct = FindCardInMyHand(pv, _selectedCardId);
                if (direct != null) return direct;
            }
            if (_multiSelectedCardIds.Count > 0)
            {
                return FindCardInMyHand(pv, _multiSelectedCardIds[0]);
            }
            return null;
        }

        private static CardInstanceDto FindFirstEquippedCard(PublicPlayerViewDto player)
        {
            if (player?.Equipments == null) return null;
            if (player.Equipments.Armor != null) return player.Equipments.Armor;
            if (player.Equipments.PlusOneHorse != null) return player.Equipments.PlusOneHorse;
            if (player.Equipments.MinusOneHorse != null) return player.Equipments.MinusOneHorse;
            return player.Equipments.Weapon;
        }

        private static List<int> GetAliveSeats(PlayerViewStateDto pv)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                if (pv.Players[i].Alive) res.Add(pv.Players[i].SeatIndex);
            }
            return res;
        }

        private static List<int> GetAliveOtherSeats(PlayerViewStateDto pv)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (p.Alive && p.SeatIndex != pv.ViewerSeatIndex) res.Add(p.SeatIndex);
            }
            return res;
        }

        private static List<int> GetWoundedAliveSeats(PlayerViewStateDto pv, bool includeSelf)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive || p.Hp >= p.MaxHp) continue;
                if (!includeSelf && p.SeatIndex == pv.ViewerSeatIndex) continue;
                res.Add(p.SeatIndex);
            }
            return res;
        }

        private static List<int> GetAliveMaleOtherSeats(PlayerViewStateDto pv)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive || p.SeatIndex == pv.ViewerSeatIndex) continue;
                if (!CuuChauLoreLookup.GetHeroInfo(p.HeroId).IsFemale)
                {
                    res.Add(p.SeatIndex);
                }
            }
            return res;
        }

        private static List<int> GetWoundedMaleOtherSeats(PlayerViewStateDto pv)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive || p.SeatIndex == pv.ViewerSeatIndex || p.Hp >= p.MaxHp) continue;
                if (!CuuChauLoreLookup.GetHeroInfo(p.HeroId).IsFemale)
                {
                    res.Add(p.SeatIndex);
                }
            }
            return res;
        }

        private static int[] BuildValidLiJianPair(PlayerViewStateDto pv, List<int> selectedSeats)
        {
            if (pv == null || selectedSeats == null || selectedSeats.Count != 2) return null;
            int s0 = selectedSeats[0];
            int s1 = selectedSeats[1];
            if (s0 == s1) return null;

            PublicPlayerViewDto p0 = CuuChauCombatRules.FindPlayerBySeat(pv, s0);
            PublicPlayerViewDto p1 = CuuChauCombatRules.FindPlayerBySeat(pv, s1);
            if (p0 == null || p1 == null || !p0.Alive || !p1.Alive) return null;

            if (!CuuChauCombatRules.IsTargetImmuneToCard(p1, "quyet_dau"))
            {
                return new[] { s0, s1 };
            }
            if (!CuuChauCombatRules.IsTargetImmuneToCard(p0, "quyet_dau"))
            {
                return new[] { s1, s0 };
            }
            return null;
        }

        private static bool HasAliveThanhVanAlly(PlayerViewStateDto pv)
        {
            if (pv?.Players == null) return false;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive || p.SeatIndex == pv.ViewerSeatIndex) continue;
                string factionCode = CuuChauLoreLookup.GetHeroInfo(p.HeroId).FactionCode;
                if (string.Equals(factionCode, "SHU", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(factionCode, "THANH_VAN", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private static List<int> GetTuXiTargetSeats(PlayerViewStateDto pv)
        {
            var res = new List<int>();
            if (pv?.Players == null) return res;
            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (p.Alive && p.SeatIndex != pv.ViewerSeatIndex && p.HandCount > 0)
                {
                    res.Add(p.SeatIndex);
                }
            }
            return res;
        }

        private static List<int> GetValidLiuLiRedirectSeats(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            var res = new List<int>();
            if (pv?.Players == null || intr == null) return res;

            int mySeat = pv.ViewerSeatIndex;
            int attackerSeat = intr.SourceSeat ?? CuuChauCombatRules.GetExtraInt(intr, "sourceSeat") ?? -1;
            HashSet<int> excluded = intr.ExcludedSeats != null ? new HashSet<int>(intr.ExcludedSeats) : null;

            for (int i = 0; i < pv.Players.Count; i++)
            {
                PublicPlayerViewDto p = pv.Players[i];
                if (!p.Alive || p.SeatIndex == mySeat || p.SeatIndex == attackerSeat) continue;
                if (excluded != null && excluded.Contains(p.SeatIndex)) continue;
                if (CuuChauCombatRules.IsTargetImmuneToCard(p, "sat")) continue;
                if (!CuuChauCombatRules.IsInAttackRange(pv, mySeat, p.SeatIndex)) continue;
                res.Add(p.SeatIndex);
            }
            return res;
        }

        private int ResolveChosenCollateralVictim(PlayerViewStateDto pv, int attackerSeat)
        {
            List<int> victims = CuuChauCombatRules.GetValidCollateralVictimSeats(pv, attackerSeat);
            if (victims.Count == 0) return -1;
            return victims[_collateralVictimCycleIndex % victims.Count];
        }

        private static List<CardInstanceDto> GetGuanXingCards(PublicInterruptViewDto intr)
        {
            if (intr == null) return new List<CardInstanceDto>();
            if (intr.GuanXingCards != null && intr.GuanXingCards.Count > 0) return intr.GuanXingCards;
            return CuuChauCombatRules.GetExtraCardList(intr, "guanXingCards");
        }

        private static List<CardInstanceDto> GetYiJiCards(PublicInterruptViewDto intr)
        {
            if (intr == null) return new List<CardInstanceDto>();
            if (intr.YiJiCards != null && intr.YiJiCards.Count > 0) return intr.YiJiCards;
            return CuuChauCombatRules.GetExtraCardList(intr, "yiJiCards");
        }

        private static CardInstanceDto FindCardInHarvestPool(PlayerViewStateDto pv, string cardId)
        {
            if (string.IsNullOrEmpty(cardId) || pv?.HarvestPool == null) return null;
            for (int i = 0; i < pv.HarvestPool.Count; i++)
            {
                if (pv.HarvestPool[i].Id == cardId) return pv.HarvestPool[i];
            }
            return null;
        }

        private CardInstanceDto FindSelectedPlayableInterruptCard(PlayerViewStateDto pv, PublicInterruptViewDto intr)
        {
            if (string.IsNullOrEmpty(_selectedCardId)) return null;
            CardInstanceDto card = FindCardInMyHand(pv, _selectedCardId);
            return card != null && CuuChauCombatRules.IsCardPlayableForInterrupt(pv, intr, card) ? card : null;
        }

        private static List<TargetZoneChoice> BuildPickableTargetZones(PublicPlayerViewDto target, bool allowDelayed)
        {
            var zones = new List<TargetZoneChoice>(6);
            if (target == null) return zones;

            if (target.HandCount > 0)
            {
                zones.Add(new TargetZoneChoice("HAND", $"Bài Trên Tay ({target.HandCount} lá)", null));
            }
            if (target.Equipments != null)
            {
                if (target.Equipments.Weapon != null)
                {
                    zones.Add(new TargetZoneChoice("WEAPON", $"Vũ Khí · {ResolveCardNameVi(target.Equipments.Weapon)}", null));
                }
                if (target.Equipments.Armor != null)
                {
                    zones.Add(new TargetZoneChoice("ARMOR", $"Giáp · {ResolveCardNameVi(target.Equipments.Armor)}", null));
                }
                if (target.Equipments.PlusOneHorse != null)
                {
                    zones.Add(new TargetZoneChoice("PLUS_ONE_HORSE", $"Khinh Công +1 · {ResolveCardNameVi(target.Equipments.PlusOneHorse)}", null));
                }
                if (target.Equipments.MinusOneHorse != null)
                {
                    zones.Add(new TargetZoneChoice("MINUS_ONE_HORSE", $"Thân Pháp -1 · {ResolveCardNameVi(target.Equipments.MinusOneHorse)}", null));
                }
            }
            if (allowDelayed && target.DelayedScrolls != null)
            {
                for (int i = 0; i < target.DelayedScrolls.Count; i++)
                {
                    CardInstanceDto scroll = target.DelayedScrolls[i];
                    if (scroll != null)
                    {
                        zones.Add(new TargetZoneChoice("DELAYED", $"Ấn Chú · {ResolveCardNameVi(scroll)}", scroll.Id));
                    }
                }
            }
            return zones;
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

        private static string BuildHandSignature(
            List<CardInstanceDto> cards,
            PlayerViewStateDto pv,
            PublicInterruptViewDto intr,
            string activeSkillId)
        {
            var sb = new StringBuilder(192);
            sb.Append(pv?.TurnPhase).Append('|')
              .Append(pv?.CurrentTurnSeat ?? -1).Append('|')
              .Append(pv?.MySeat?.Hp ?? 0).Append('|')
              .Append(pv?.TurnFlags?.SatUsedThisTurn ?? 0).Append('|')
              .Append(pv?.TurnFlags?.BonusSatLimitThisTurn ?? 0).Append('|')
              .Append(intr?.Id).Append('|')
              .Append(intr?.Kind).Append('|')
              .Append(activeSkillId).Append('|');

            if (cards != null)
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    sb.Append(cards[i].Id).Append(',');
                }
            }

            sb.Append('|');
            if (pv?.AvailableActions?.PlayableCardIds != null)
            {
                for (int i = 0; i < pv.AvailableActions.PlayableCardIds.Count; i++)
                {
                    sb.Append(pv.AvailableActions.PlayableCardIds[i]).Append(',');
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
                string tailscaleCandidate = null;
                NetworkInterface[] interfaces = NetworkInterface.GetAllNetworkInterfaces();
                for (int i = 0; i < interfaces.Length; i++)
                {
                    NetworkInterface ni = interfaces[i];
                    if (ni == null ||
                        ni.OperationalStatus != OperationalStatus.Up ||
                        ni.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                    {
                        continue;
                    }

                    UnicastIPAddressInformationCollection unicasts = ni.GetIPProperties()?.UnicastAddresses;
                    if (unicasts == null) continue;

                    foreach (UnicastIPAddressInformation uni in unicasts)
                    {
                        IPAddress addr = uni?.Address;
                        if (addr == null || addr.AddressFamily != AddressFamily.InterNetwork || IPAddress.IsLoopback(addr))
                        {
                            continue;
                        }

                        byte[] octets = addr.GetAddressBytes();
                        if (octets.Length != 4) continue;

                        // Ưu tiên 1: Radmin VPN (26.0.0.0/8)
                        if (octets[0] == 26)
                        {
                            return addr.ToString();
                        }

                        // Ưu tiên 2: Tailscale CGNAT (100.64.0.0/10 -> 100.64..127.*)
                        if (octets[0] == 100 && octets[1] >= 64 && octets[1] <= 127 && string.IsNullOrEmpty(tailscaleCandidate))
                        {
                            tailscaleCandidate = addr.ToString();
                        }
                    }
                }

                if (!string.IsNullOrEmpty(tailscaleCandidate))
                {
                    return tailscaleCandidate;
                }
            }
            catch
            {
                // Fallback to UDP routing check if network interface enumeration is unavailable
            }

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
