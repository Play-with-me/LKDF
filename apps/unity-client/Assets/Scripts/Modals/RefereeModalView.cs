using System;
using System.Collections.Generic;
using System.Globalization;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Modals
{
    /// <summary>
    /// Bảng Trọng Tài đúng 4 nút chuẩn `RefereeActionTypeSchema` của @lkdf/server:
    /// 1) Tạm Dừng / Tiếp Tục Đồng Hồ ("PAUSE" / "RESUME")
    /// 2) Lùi 1 Bước ("UNDO_ONE_STEP")
    /// 3) Bỏ Qua Pha Hiện Tại ("SKIP_PHASE")
    /// 4) Hủy Ván Đấu ("ABORT_MATCH") — bắt buộc bấm 2 nhịp để chống ấn nhầm.
    /// Hiển thị rõ quyền Chủ Phòng / chuyển quyền 30s (`ActingHostUserId`, `HostDisconnectedAt`),
    /// khóa nút khi không đủ quyền kèm lý do minh bạch.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RefereeModalView : MonoBehaviour
    {
        private const float HostFailoverSeconds = 30f;
        private const float AbortConfirmWindowSeconds = 6f;

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _initialized;

        private RectTransform _rootRect;
        private TextMeshProUGUI _authorityStatusText;
        private TextMeshProUGUI _failoverStatusText;
        private TextMeshProUGUI _lockReasonText;

        private Button _pauseResumeBtn;
        private CanvasGroup _pauseResumeGroup;
        private TextMeshProUGUI _pauseResumeLabel;

        private Button _undoBtn;
        private CanvasGroup _undoGroup;
        private TextMeshProUGUI _undoLabel;

        private Button _skipPhaseBtn;
        private CanvasGroup _skipPhaseGroup;
        private TextMeshProUGUI _skipPhaseLabel;

        private Button _abortMatchBtn;
        private Image _abortMatchBg;
        private CanvasGroup _abortMatchGroup;
        private TextMeshProUGUI _abortMatchLabel;

        private RoomStateDto _boundRoom;
        private string _myUserId;
        private bool _isTimerPaused;
        private bool _abortConfirmArmed;
        private float _abortConfirmTimer;

        public event Action<string> OnRefereeActionRequested;
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
            SetVisible(false);
        }

        public void SetVisible(bool visible)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            if (!visible)
            {
                DisarmAbortConfirm();
            }
            gameObject.SetActive(visible);
            if (visible)
            {
                transform.SetAsLastSibling();
            }
        }

        public void BindRoomState(RoomStateDto room, string myUserId)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            _boundRoom = room;
            _myUserId = myUserId;
            _isTimerPaused = room != null && room.IsTimerPaused;
            DisarmAbortConfirm();
            RefreshView();
        }

        public void PopulateDemoPreview()
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            var demoRoom = new RoomStateDto
            {
                RoomCode = "K9M2P4",
                Status = "IN_GAME",
                OwnerUserId = "u_host",
                ActingHostUserId = "u_host",
                HostDisconnectedAt = null,
                TimerPreset = "STANDARD",
                IsTimerPaused = false,
                Seats = new List<RoomSeatDto>
                {
                    new() { SeatIndex = 0, UserId = "u_host", DisplayName = "Lâm Thanh Vũ", ConnectionStatus = "ONLINE" },
                    new() { SeatIndex = 1, UserId = "u_guest1", DisplayName = "Triệu Thiên Hành", ConnectionStatus = "ONLINE" },
                },
            };

            BindRoomState(demoRoom, "u_host");
        }

        private void Update()
        {
            if (!_initialized || !gameObject.activeInHierarchy) return;

            if (_abortConfirmArmed)
            {
                _abortConfirmTimer -= Time.unscaledDeltaTime;
                if (_abortConfirmTimer <= 0f)
                {
                    DisarmAbortConfirm();
                    RefreshAbortButtonLabel();
                }
            }

            if (_boundRoom != null && !string.IsNullOrEmpty(_boundRoom.HostDisconnectedAt))
            {
                UpdateFailoverCountdownText();
            }
        }

        private void BuildHierarchy()
        {
            _rootRect = ModalUiKit.EnsureRootStretch(gameObject);
            ModalUiKit.CreateModalShell(
                _rootRect,
                "RefereePanel",
                new Vector2(660f, 590f),
                _catalog,
                out RectTransform inner);

            // Header
            var titleTmp = ModalUiKit.CreateTmp(
                "RefereeTitle",
                inner,
                _serifFont != null ? _serifFont : _sansFont,
                23f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineLeft);
            titleTmp.rectTransform.anchorMin = new Vector2(0f, 1f);
            titleTmp.rectTransform.anchorMax = new Vector2(0.75f, 1f);
            titleTmp.rectTransform.pivot = new Vector2(0f, 1f);
            titleTmp.rectTransform.anchoredPosition = new Vector2(22f, -16f);
            titleTmp.rectTransform.sizeDelta = new Vector2(0f, 40f);
            titleTmp.text = "BẢNG TRỌNG TÀI BÀN ĐẤU";

            Button closeBtn = ModalUiKit.CreateSecondaryButton(
                "CloseRefereeBtn",
                inner,
                _sansFont != null ? _sansFont : _serifFont,
                "Đóng Bảng",
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
            closeRt.sizeDelta = new Vector2(130f, 40f);

            // Authority & 30s Failover Status Card
            var statusCardGo = new GameObject("AuthorityCard", typeof(RectTransform), typeof(Image));
            statusCardGo.transform.SetParent(inner, false);
            var statusRt = statusCardGo.GetComponent<RectTransform>();
            statusRt.anchorMin = new Vector2(0f, 1f);
            statusRt.anchorMax = new Vector2(1f, 1f);
            statusRt.pivot = new Vector2(0.5f, 1f);
            statusRt.anchoredPosition = new Vector2(0f, -68f);
            statusRt.sizeDelta = new Vector2(-40f, 126f);
            statusCardGo.GetComponent<Image>().color = ModalUiKit.ObsidianInsetColor;

            _authorityStatusText = ModalUiKit.CreateTmp(
                "AuthorityStatus",
                statusRt,
                _sansFont != null ? _sansFont : _serifFont,
                16f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            _authorityStatusText.rectTransform.anchorMin = new Vector2(0f, 0.58f);
            _authorityStatusText.rectTransform.anchorMax = new Vector2(1f, 1f);
            _authorityStatusText.rectTransform.offsetMin = new Vector2(14f, 2f);
            _authorityStatusText.rectTransform.offsetMax = new Vector2(-14f, -8f);

            _failoverStatusText = ModalUiKit.CreateTmp(
                "FailoverStatus",
                statusRt,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.MutedSandColor,
                FontStyles.Normal,
                TextAlignmentOptions.TopLeft,
                wrap: true);
            _failoverStatusText.rectTransform.anchorMin = new Vector2(0f, 0.28f);
            _failoverStatusText.rectTransform.anchorMax = new Vector2(1f, 0.58f);
            _failoverStatusText.rectTransform.offsetMin = new Vector2(14f, 0f);
            _failoverStatusText.rectTransform.offsetMax = new Vector2(-14f, 0f);

            _lockReasonText = ModalUiKit.CreateTmp(
                "LockReason",
                statusRt,
                _sansFont != null ? _sansFont : _serifFont,
                15f,
                ModalUiKit.AmberAccentColor,
                FontStyles.Bold,
                TextAlignmentOptions.BottomLeft,
                wrap: true);
            _lockReasonText.rectTransform.anchorMin = new Vector2(0f, 0f);
            _lockReasonText.rectTransform.anchorMax = new Vector2(1f, 0.30f);
            _lockReasonText.rectTransform.offsetMin = new Vector2(14f, 6f);
            _lockReasonText.rectTransform.offsetMax = new Vector2(-14f, 0f);

            // Exactly 4 Referee Action Buttons stacked cleanly
            var listGo = new GameObject("RefereeActionStack", typeof(RectTransform), typeof(VerticalLayoutGroup));
            listGo.transform.SetParent(inner, false);
            var listRt = listGo.GetComponent<RectTransform>();
            listRt.anchorMin = new Vector2(0f, 0f);
            listRt.anchorMax = new Vector2(1f, 1f);
            listRt.offsetMin = new Vector2(24f, 22f);
            listRt.offsetMax = new Vector2(-24f, -210f);

            var stack = listGo.GetComponent<VerticalLayoutGroup>();
            stack.spacing = 14f;
            stack.childControlWidth = true;
            stack.childControlHeight = false;
            stack.childForceExpandWidth = true;
            stack.childForceExpandHeight = false;

            // 1. PAUSE / RESUME
            _pauseResumeBtn = ModalUiKit.CreatePrimaryButton(
                "Btn_PauseResume",
                listRt,
                _catalog,
                _serifFont != null ? _serifFont : _sansFont,
                "Tạm Dừng Đồng Hồ",
                18f,
                HandlePauseResumeClicked,
                out _pauseResumeLabel);
            _pauseResumeBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(0f, 68f);
            _pauseResumeGroup = _pauseResumeBtn.gameObject.AddComponent<CanvasGroup>();

            // 2. UNDO_ONE_STEP
            _undoBtn = ModalUiKit.CreateSecondaryButton(
                "Btn_UndoOneStep",
                listRt,
                _sansFont != null ? _sansFont : _serifFont,
                "Lùi 1 Bước (Hoàn Tác)",
                17f,
                ModalUiKit.SecondaryBtnColor,
                () => EmitRefereeAction("UNDO_ONE_STEP"),
                out _,
                out _undoLabel);
            _undoBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(0f, 64f);
            _undoGroup = _undoBtn.gameObject.AddComponent<CanvasGroup>();

            // 3. SKIP_PHASE
            _skipPhaseBtn = ModalUiKit.CreateSecondaryButton(
                "Btn_SkipPhase",
                listRt,
                _sansFont != null ? _sansFont : _serifFont,
                "Bỏ Qua Pha Hiện Tại",
                17f,
                ModalUiKit.SecondaryBtnColor,
                () => EmitRefereeAction("SKIP_PHASE"),
                out _,
                out _skipPhaseLabel);
            _skipPhaseBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(0f, 64f);
            _skipPhaseGroup = _skipPhaseBtn.gameObject.AddComponent<CanvasGroup>();

            // 4. ABORT_MATCH (2-step click confirmation)
            _abortMatchBtn = ModalUiKit.CreateSecondaryButton(
                "Btn_AbortMatch",
                listRt,
                _sansFont != null ? _sansFont : _serifFont,
                "Hủy Ván Đấu",
                17f,
                ModalUiKit.DangerBtnColor,
                HandleAbortMatchClicked,
                out _abortMatchBg,
                out _abortMatchLabel);
            _abortMatchBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(0f, 64f);
            _abortMatchGroup = _abortMatchBtn.gameObject.AddComponent<CanvasGroup>();
        }

        private void RefreshView()
        {
            if (_boundRoom == null)
            {
                _authorityStatusText.text = "Chưa kết nối thông tin phòng đấu.";
                _failoverStatusText.text = "Mọi lệnh Trọng Tài tạm khóa.";
                _lockReasonText.text = "Chỉ Chủ phòng hoặc Trọng Tài tạm thời mới được thao tác.";
                ApplyButtonInteractivity(false, false);
                return;
            }

            string ownerName = FindSeatName(_boundRoom.OwnerUserId, "Chủ Phòng");
            string actingName = FindSeatName(_boundRoom.ActingHostUserId, ownerName);
            bool isHostTransferred = !string.IsNullOrEmpty(_boundRoom.ActingHostUserId)
                && _boundRoom.ActingHostUserId != _boundRoom.OwnerUserId;

            _authorityStatusText.text = isHostTransferred
                ? $"Trọng Tài Tạm Thời: {actingName} · Chủ Phòng gốc: {ownerName}"
                : $"Chủ Phòng / Trọng Tài: {actingName} · Phòng #{_boundRoom.RoomCode}";

            UpdateFailoverCountdownText();

            bool isActingHost = !string.IsNullOrEmpty(_myUserId)
                && _boundRoom.ActingHostUserId == _myUserId;
            bool isInGame = _boundRoom.Status == "IN_GAME";
            bool canAbort = isActingHost && (_boundRoom.Status == "IN_GAME" || _boundRoom.Status == "FINISHED");
            bool canInGameActions = isActingHost && isInGame;

            if (!isActingHost)
            {
                _lockReasonText.color = ModalUiKit.CrimsonAccentColor;
                _lockReasonText.text = "Chế độ Chỉ Xem · Chỉ Chủ phòng (hoặc Trọng Tài tạm thời sau 30s mất mạng) mới được bấm.";
            }
            else if (!isInGame && _boundRoom.Status != "FINISHED")
            {
                _lockReasonText.color = ModalUiKit.AmberAccentColor;
                _lockReasonText.text = "Phòng đang ở Sảnh Chờ · Lệnh Trọng Tài mở khi ván đấu bắt đầu.";
            }
            else if (_isTimerPaused)
            {
                _lockReasonText.color = ModalUiKit.AmberAccentColor;
                _lockReasonText.text = "Đồng hồ đang TẠM DỪNG · Nhấn Tiếp Tục Đồng Hồ để mở lại đếm ngược.";
            }
            else
            {
                _lockReasonText.color = ModalUiKit.EmeraldAccentColor;
                _lockReasonText.text = "Bạn đang giữ quyền Trọng Tài · Mọi thao tác được ghi vào Nhật Ký.";
            }

            if (_pauseResumeLabel != null)
            {
                _pauseResumeLabel.text = _isTimerPaused
                    ? "Tiếp Tục Đồng Hồ"
                    : "Tạm Dừng Đồng Hồ";
            }

            ApplyButtonInteractivity(canInGameActions, canAbort);
            RefreshAbortButtonLabel();
        }

        private void UpdateFailoverCountdownText()
        {
            if (_boundRoom == null || _failoverStatusText == null) return;

            bool isHostTransferred = !string.IsNullOrEmpty(_boundRoom.ActingHostUserId)
                && _boundRoom.ActingHostUserId != _boundRoom.OwnerUserId;

            if (isHostTransferred)
            {
                _failoverStatusText.text = "Chủ phòng mất mạng quá 30s · Quyền Trọng Tài đã chuyển sang Trọng Tài Tạm Thời.";
                return;
            }

            if (!string.IsNullOrEmpty(_boundRoom.HostDisconnectedAt)
                && DateTimeOffset.TryParse(
                    _boundRoom.HostDisconnectedAt,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind,
                    out DateTimeOffset disconnectedAt))
            {
                double elapsed = (DateTimeOffset.UtcNow - disconnectedAt).TotalSeconds;
                int remain = Mathf.Max(0, Mathf.CeilToInt(HostFailoverSeconds - (float)elapsed));
                _failoverStatusText.text = $"Chủ phòng đang mất kết nối · Tự chuyển quyền Trọng Tài sau {remain}s.";
                return;
            }

            _failoverStatusText.text = "Chủ phòng trực tuyến · Tự chuyển quyền sau 30s nếu mất mạng.";
        }

        private void ApplyButtonInteractivity(bool canInGameActions, bool canAbort)
        {
            SetButtonState(_pauseResumeBtn, _pauseResumeGroup, canInGameActions);
            SetButtonState(_undoBtn, _undoGroup, canInGameActions);
            SetButtonState(_skipPhaseBtn, _skipPhaseGroup, canInGameActions);
            SetButtonState(_abortMatchBtn, _abortMatchGroup, canAbort);
        }

        private static void SetButtonState(Button btn, CanvasGroup cg, bool enabled)
        {
            if (btn != null) btn.interactable = enabled;
            if (cg != null) cg.alpha = enabled ? 1f : 0.45f;
        }

        private void HandlePauseResumeClicked()
        {
            DisarmAbortConfirm();
            RefreshAbortButtonLabel();
            EmitRefereeAction(_isTimerPaused ? "RESUME" : "PAUSE");
        }

        private void HandleAbortMatchClicked()
        {
            if (!_abortConfirmArmed)
            {
                _abortConfirmArmed = true;
                _abortConfirmTimer = AbortConfirmWindowSeconds;
                RefreshAbortButtonLabel();
                return;
            }

            DisarmAbortConfirm();
            RefreshAbortButtonLabel();
            EmitRefereeAction("ABORT_MATCH");
        }

        private void DisarmAbortConfirm()
        {
            _abortConfirmArmed = false;
            _abortConfirmTimer = 0f;
        }

        private void RefreshAbortButtonLabel()
        {
            if (_abortMatchLabel != null)
            {
                _abortMatchLabel.text = _abortConfirmArmed
                    ? "Xác nhận Hủy Ván (nhấn lần 2)"
                    : "Hủy Ván Đấu";
            }
            if (_abortMatchBg != null)
            {
                _abortMatchBg.color = _abortConfirmArmed
                    ? ModalUiKit.CinnabarFillColor
                    : ModalUiKit.DangerBtnColor;
            }
        }

        private void EmitRefereeAction(string actionType)
        {
            OnRefereeActionRequested?.Invoke(actionType);
        }

        private string FindSeatName(string userId, string fallback)
        {
            if (_boundRoom != null && _boundRoom.Seats != null && !string.IsNullOrEmpty(userId))
            {
                for (int i = 0; i < _boundRoom.Seats.Count; i++)
                {
                    if (_boundRoom.Seats[i].UserId == userId && !string.IsNullOrEmpty(_boundRoom.Seats[i].DisplayName))
                    {
                        return _boundRoom.Seats[i].DisplayName;
                    }
                }
            }
            return fallback;
        }
    }
}
