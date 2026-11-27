using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CuuChau.Arena;
using CuuChau.Lobby;
using CuuChau.Match;
using CuuChau.Net;
using CuuChau.Sidecar;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace CuuChau.Tests.PlayMode
{
    /// <summary>
    /// Kiểm thử End-to-End Chặng U6 trong Unity 6.3 PlayMode thật:
    /// Nạp U4_FullGame_App -> Khởi chạy Sidecar -> Host mở bàn LAN -> Chặn Start khi &lt; 4 người ->
    /// Kiểm chứng parse link mời LAN -> 3 khách kết nối độc lập (Guest Auth + WS + Join + Ready) ->
    /// Đủ 4 người thật (0 Bot) vào Chọn Tướng 3-chọn-1 -> Vào Combat thật (4-way giấu bài + không "Máy Đánh Hộ" + chụp 1080p) ->
    /// Ngắt &amp; nối lại WS Client 3 (Takeover bảo toàn ghế/tướng/bài) -> Trọng Tài PAUSE/RESUME đồng bộ 4 màn hình ->
    /// ABORT_MATCH, rời phòng sạch &amp; tắt Sidecar.
    /// </summary>
    public sealed class CuuChauU6MultiClientLanPlayModeTests
    {
        private sealed class RemoteLanClient
        {
            public string DisplayName;
            public string DeviceId;
            public string UserId;
            public LkdfApiClient Api;
            public RoomWsClient Ws;
            public GameObject HostObject;
            public bool AuthOk;
            public RoomViewerPayload LatestPayload;
            public int RoomStateUpdates;
            public string LastWsError;
        }

        private CuuChauMatchDirector _director;
        private readonly List<RemoteLanClient> _spawnedClients = new();

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            for (int i = 0; i < _spawnedClients.Count; i++)
            {
                RemoteLanClient client = _spawnedClients[i];
                if (client == null) continue;
                if (client.Ws != null)
                {
                    client.Ws.Disconnect();
                }
                if (client.HostObject != null)
                {
                    Object.Destroy(client.HostObject);
                }
            }
            _spawnedClients.Clear();

            if (_director != null)
            {
                _director.ShutdownSidecar();
                _director = null;
            }

            CleanupStaleSidecarDatabase();
            yield return null;
        }

        [UnityTest]
        public IEnumerator MultiClient_4Humans_LAN_Invite_Draft_Combat_Reconnect_Referee()
        {
            // Bảo đảm không còn Sidecar hay lkdf-sidecar.json cũ trước khi vào scene
            CuuChauMatchDirector[] staleDirectors = Object.FindObjectsByType<CuuChauMatchDirector>(FindObjectsSortMode.None);
            for (int i = 0; i < staleDirectors.Length; i++)
            {
                staleDirectors[i].ShutdownSidecar();
            }
            CleanupStaleSidecarDatabase();

            // 1. Nạp U4_FullGame_App & đợi Sidecar sẵn sàng (AutoStartOnStart = true)
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("U4_FullGame_App", LoadSceneMode.Single);
            Assert.IsNotNull(loadOp, "Không thể tải scene U4_FullGame_App.");
            while (!loadOp.isDone) yield return null;

            _director = Object.FindAnyObjectByType<CuuChauMatchDirector>();
            Assert.IsNotNull(_director, "Thiếu CuuChauMatchDirector trong U4_FullGame_App.");

            Task<bool> startSidecarTask = WrapAwaitable(() => _director.EnsureSidecarStartedAsync());
            yield return WaitTaskWithTimeout(startSidecarTask, 20f, "EnsureSidecarStartedAsync");
            Assert.IsTrue(startSidecarTask.Result, $"Sidecar khởi động thất bại: {_director.LastError}");
            Assert.IsTrue(_director.SidecarReady, "SidecarReady phải bằng true.");

            LkdfSidecarProcess sidecar = Object.FindAnyObjectByType<LkdfSidecarProcess>();
            Assert.IsNotNull(sidecar, "Thiếu LkdfSidecarProcess trong scene.");
            Assert.IsTrue(sidecar.IsReady && sidecar.ActivePort > 0, "Sidecar phải sẵn sàng với ActivePort > 0.");

            // 2. Host mở bàn LAN -> kiểm tra LOBBY & mã phòng 6 ký tự
            Task<bool> hostTask = WrapAwaitable(() => _director.HostLanRoomAsync("MinhChuHost"));
            yield return WaitTaskWithTimeout(hostTask, 12f, "HostLanRoomAsync");
            Assert.IsTrue(hostTask.Result, $"HostLanRoomAsync thất bại: {_director.LastError}");
            Assert.IsNotNull(_director.LatestPayload?.RoomState, "Thiếu RoomState sau HostLanRoomAsync.");
            Assert.AreEqual("LOBBY", _director.LatestPayload.RoomState.Status, "Phòng LAN mới mở phải ở trạng thái LOBBY.");

            string roomCode = _director.CurrentRoomCode;
            Assert.IsFalse(string.IsNullOrEmpty(roomCode), "CurrentRoomCode không được rỗng.");
            Assert.AreEqual(6, roomCode.Length, "Mã phòng LAN phải gồm đúng 6 ký tự.");

            // 3. Kiểm chứng chặn StartMatch khi chưa đủ 4 người thật
            Task<RoomViewerPayload> prematureStartTask = WrapAwaitable(() => _director.ApiClient.StartMatchAsync(roomCode));
            float prematureDeadline = Time.realtimeSinceStartup + 8f;
            while (!prematureStartTask.IsCompleted && Time.realtimeSinceStartup < prematureDeadline)
            {
                yield return null;
            }
            Assert.IsTrue(prematureStartTask.IsCompleted, "StartMatchAsync (<4 người) quá thời gian.");
            Assert.IsTrue(prematureStartTask.IsFaulted, "StartMatchAsync khi < 4 người chơi thật phải ném ApiErrorException.");
            Exception prematureEx = prematureStartTask.Exception?.GetBaseException();
            Assert.IsInstanceOf<ApiErrorException>(prematureEx, $"Ngoại lệ phải là ApiErrorException, thực tế: {prematureEx?.GetType().Name}");
            Assert.AreEqual("INSUFFICIENT_REAL_PLAYERS", ((ApiErrorException)prematureEx).ErrorCode, "Mã lỗi chặn <4 người phải là INSUFFICIENT_REAL_PLAYERS.");

            // 4. Kiểm chứng phân tích Link mời LAN
            string invite = $"127.0.0.1:{sidecar.ActivePort}#{roomCode}";
            bool inviteParsed = LobbyHallView.ParseInviteInput(invite, "http://127.0.0.1:3001", out string parsedUrl, out string parsedCode);
            Assert.IsTrue(inviteParsed, $"LobbyHallView.ParseInviteInput thất bại với '{invite}'.");
            Assert.AreEqual(roomCode, parsedCode, "Mã phòng parse từ link mời LAN không khớp.");
            Assert.AreEqual($"http://127.0.0.1:{sidecar.ActivePort}", parsedUrl, "Base URL parse từ link mời LAN không khớp.");

            // 5. Tạo 3 client Unity độc lập (Client 2, Client 3, Client 4) -> Login -> WS -> Join -> Subscribe -> Ready
            string[] guestNames = { "Khách Ngụy 2", "Khách Ngô 3", "Khách Quần 4" };
            for (int i = 0; i < guestNames.Length; i++)
            {
                int clientIdx = i + 2;
                var go = new GameObject($"U6_LanClient_{clientIdx}");
                var ws = go.AddComponent<RoomWsClient>();
                var api = new LkdfApiClient(parsedUrl);
                var client = new RemoteLanClient
                {
                    DisplayName = guestNames[i],
                    DeviceId = $"u6_lan_dev_{clientIdx}_{Guid.NewGuid():N}",
                    Api = api,
                    Ws = ws,
                    HostObject = go,
                };

                ws.OnAuthOk += (uid, _) =>
                {
                    client.UserId = uid;
                    client.AuthOk = true;
                };
                ws.OnRoomState += (payload, _) =>
                {
                    client.LatestPayload = payload;
                    client.RoomStateUpdates++;
                };
                ws.OnActionError += (code, msg) =>
                {
                    client.LastWsError = $"[{code}] {msg}";
                };

                _spawnedClients.Add(client);

                Task<GuestAuthResponse> loginTask = WrapAwaitable(() => client.Api.LoginGuestAsync(client.DeviceId, client.DisplayName));
                yield return WaitTaskWithTimeout(loginTask, 8f, $"LoginGuestAsync Client {clientIdx}");
                Assert.IsTrue(loginTask.Result != null && loginTask.Result.Ok && !string.IsNullOrEmpty(client.Api.SessionToken),
                    $"Đăng nhập Client {clientIdx} thất bại.");

                client.AuthOk = false;
                Task wsConnectTask = WrapAwaitable(() => client.Ws.ConnectAndAuthenticateAsync(sidecar.BaseWsUrl, client.Api.SessionToken, takeover: true));
                yield return WaitTaskWithTimeout(wsConnectTask, 8f, $"WS Connect Client {clientIdx}");

                float authDeadline = Time.realtimeSinceStartup + 8f;
                while (!client.AuthOk && Time.realtimeSinceStartup < authDeadline)
                {
                    yield return null;
                }
                Assert.IsTrue(client.AuthOk, $"Client {clientIdx} không nhận được AUTH_OK từ WebSocket.");

                Task<RoomViewerPayload> joinTask = WrapAwaitable(() => client.Api.JoinRoomAsync(roomCode));
                yield return WaitTaskWithTimeout(joinTask, 8f, $"JoinRoomAsync Client {clientIdx}");
                Assert.AreEqual(roomCode, joinTask.Result?.RoomState?.RoomCode, $"Client {clientIdx} vào nhầm phòng.");
                client.LatestPayload = joinTask.Result;

                Task subTask = WrapAwaitable(() => client.Ws.SendSubscribeRoomAsync(roomCode));
                yield return WaitTaskWithTimeout(subTask, 8f, $"SendSubscribeRoomAsync Client {clientIdx}");

                Task<RoomViewerPayload> readyTask = WrapAwaitable(() => client.Api.SetReadyAsync(roomCode, true));
                yield return WaitTaskWithTimeout(readyTask, 8f, $"SetReadyAsync Client {clientIdx}");
                client.LatestPayload = readyTask.Result;
            }

            // Đợi Host đồng bộ đủ 4 ghế ONLINE & 3 khách Ready
            float lobbySyncDeadline = Time.realtimeSinceStartup + 8f;
            while (Time.realtimeSinceStartup < lobbySyncDeadline)
            {
                RoomStateDto hostRoom = _director.LatestPayload?.RoomState;
                if (hostRoom?.Seats != null && hostRoom.Seats.Count == 4)
                {
                    bool allGuestsReady = true;
                    for (int s = 0; s < hostRoom.Seats.Count; s++)
                    {
                        RoomSeatDto seat = hostRoom.Seats[s];
                        if (seat.UserId != _director.MyUserId && (!seat.IsReady || seat.ConnectionStatus != "ONLINE"))
                        {
                            allGuestsReady = false;
                            break;
                        }
                    }
                    if (allGuestsReady) break;
                }
                yield return null;
            }

            // 6. Host bắt đầu ván đấu với 4 người thật (0 Bot!)
            Task<RoomViewerPayload> startMatchTask = WrapAwaitable(() => _director.ApiClient.StartMatchAsync(roomCode));
            yield return WaitTaskWithTimeout(startMatchTask, 12f, "StartMatchAsync (4 Humans)");
            RoomViewerPayload startedPayload = startMatchTask.Result;
            Assert.IsNotNull(startedPayload?.RoomState, "Thiếu RoomState sau StartMatchAsync.");
            Assert.AreEqual("IN_GAME", startedPayload.RoomState.Status, "Trạng thái phòng phải chuyển sang IN_GAME.");
            Assert.AreEqual(4, startedPayload.RoomState.Seats.Count, "Phải có đúng 4 ghế người thật.");
            for (int i = 0; i < startedPayload.RoomState.Seats.Count; i++)
            {
                Assert.IsFalse(startedPayload.RoomState.Seats[i].IsBotTakeover,
                    $"Ghế {i} ({startedPayload.RoomState.Seats[i].DisplayName}) không được phép là Bot Takeover.");
            }
            Assert.IsNotNull(startedPayload.PlayerView, "Thiếu PlayerView sau StartMatchAsync.");
            for (int i = 0; i < startedPayload.PlayerView.Players.Count; i++)
            {
                Assert.IsFalse(startedPayload.PlayerView.Players[i].IsBotTakeover,
                    $"PlayerView ghế {i} không được phép là Bot Takeover.");
            }

            // 7. Hoàn tất Hero Draft 4 người thật sạch sẽ (Chủ Công chọn trước -> 3 khách chọn)
            float waitDraftInitDeadline = Time.realtimeSinceStartup + 10f;
            while (Time.realtimeSinceStartup < waitDraftInitDeadline)
            {
                bool allHaveDraft = true;
                for (int c = 0; c < 4; c++)
                {
                    PlayerViewStateDto pv = GetClientPayload(c)?.PlayerView;
                    if (pv?.HeroDraft == null || pv.HeroDraft.LordSeatIndex < 0)
                    {
                        allHaveDraft = false;
                        break;
                    }
                }
                if (allHaveDraft) break;
                yield return null;
            }

            int lordClientIdx = -1;
            for (int c = 0; c < 4; c++)
            {
                PlayerViewStateDto pv = GetClientPayload(c)?.PlayerView;
                Assert.IsNotNull(pv?.HeroDraft, $"Client {c + 1} chưa nhận được HeroDraft.");
                if (pv.ViewerSeatIndex == pv.HeroDraft.LordSeatIndex)
                {
                    lordClientIdx = c;
                }
            }
            Assert.GreaterOrEqual(lordClientIdx, 0, "Không xác định được client nào đang giữ ghế Chủ Công.");

            float waitLordCandidatesDeadline = Time.realtimeSinceStartup + 8f;
            while (Time.realtimeSinceStartup < waitLordCandidatesDeadline)
            {
                List<string> cands = GetClientPayload(lordClientIdx)?.PlayerView?.HeroDraft?.MyCandidates;
                if (cands != null && cands.Count >= 3) break;
                yield return null;
            }

            List<string> lordCandidates = GetClientPayload(lordClientIdx)?.PlayerView?.HeroDraft?.MyCandidates;
            Assert.IsNotNull(lordCandidates, "Chủ Công không nhận được danh sách tướng ứng viên.");
            Assert.GreaterOrEqual(lordCandidates.Count, 3, "Chủ Công phải có ít nhất 3 ứng viên tướng.");

            string lordChosenHero = lordCandidates[0];
            Task<bool> lordPickTask = SelectHeroForClientAsync(lordClientIdx, roomCode, lordChosenHero);
            yield return WaitTaskWithTimeout(lordPickTask, 10f, $"Lord SelectHeroAsync (Client {lordClientIdx + 1})");
            Assert.IsTrue(lordPickTask.Result, $"Chủ Công chọn tướng thất bại: {_director.LastError}");

            float waitOthersCandidatesDeadline = Time.realtimeSinceStartup + 10f;
            while (Time.realtimeSinceStartup < waitOthersCandidatesDeadline)
            {
                bool allOthersReady = true;
                for (int c = 0; c < 4; c++)
                {
                    if (c == lordClientIdx) continue;
                    HeroDraftViewDto draft = GetClientPayload(c)?.PlayerView?.HeroDraft;
                    if (draft == null || draft.MyCandidates == null || draft.MyCandidates.Count < 3)
                    {
                        allOthersReady = false;
                        break;
                    }
                }
                if (allOthersReady) break;
                yield return null;
            }

            var otherPickTasks = new List<Task<bool>>(3);
            for (int c = 0; c < 4; c++)
            {
                if (c == lordClientIdx) continue;
                HeroDraftViewDto draft = GetClientPayload(c)?.PlayerView?.HeroDraft;
                Assert.IsNotNull(draft?.MyCandidates, $"Client {c + 1} thiếu MyCandidates sau khi Chủ Công chọn.");
                Assert.GreaterOrEqual(draft.MyCandidates.Count, 3, $"Client {c + 1} phải có tối thiểu 3 ứng viên tướng.");
                otherPickTasks.Add(SelectHeroForClientAsync(c, roomCode, draft.MyCandidates[0]));
            }
            for (int t = 0; t < otherPickTasks.Count; t++)
            {
                yield return WaitTaskWithTimeout(otherPickTasks[t], 10f, $"Non-Lord SelectHeroAsync #{t + 1}");
                Assert.IsTrue(otherPickTasks[t].Result, "Khách chọn tướng thất bại.");
            }

            // Đợi cả 4 client bước vào Combat thật (15s)
            float waitCombatDeadline = Time.realtimeSinceStartup + 15f;
            bool allEnteredCombat = false;
            while (Time.realtimeSinceStartup < waitCombatDeadline)
            {
                bool readyNow = true;
                for (int c = 0; c < 4; c++)
                {
                    PlayerViewStateDto pv = GetClientPayload(c)?.PlayerView;
                    bool inCombat = pv != null &&
                        !string.Equals(pv.TurnPhase, "HERO_SELECT", StringComparison.Ordinal) &&
                        pv.HeroDraft != null &&
                        string.Equals(pv.HeroDraft.Stage, "COMPLETED", StringComparison.Ordinal) &&
                        pv.Players != null && pv.Players.Count == 4 &&
                        pv.EnabledPacks != null && pv.EnabledPacks.Contains("cuu_chau_core") &&
                        pv.MyHand != null && pv.MyHand.Count >= 4;
                    if (!inCombat)
                    {
                        readyNow = false;
                        break;
                    }
                }
                if (readyNow)
                {
                    allEnteredCombat = true;
                    break;
                }
                yield return null;
            }
            Assert.IsTrue(allEnteredCombat, "Không phải cả 4 client đều đã vào pha combat với bộ bài cuu_chau_core và >= 4 lá khởi đầu.");

            // 8. Kiểm chứng bảo mật 4 chiều & không hiện "Máy Đánh Hộ" + chụp ảnh 1080p
            for (int c = 0; c < 4; c++)
            {
                RoomViewerPayload payload = GetClientPayload(c);
                PlayerViewStateDto pv = payload?.PlayerView;
                Assert.IsNotNull(pv, $"Client {c + 1} thiếu PlayerView ở combat.");
                Assert.GreaterOrEqual(pv.ViewerSeatIndex, 0);
                Assert.Less(pv.ViewerSeatIndex, 4);

                for (int s = 0; s < pv.Players.Count; s++)
                {
                    PublicPlayerViewDto seat = pv.Players[s];
                    Assert.IsFalse(seat.IsBotTakeover, $"Client {c + 1} thấy ghế {seat.SeatIndex} có IsBotTakeover == true!");
                    if (seat.SeatIndex == pv.ViewerSeatIndex)
                    {
                        Assert.IsNotNull(seat.HandCards, $"Client {c + 1} phải thấy HandCards của chính mình (ghế {seat.SeatIndex}).");
                        Assert.GreaterOrEqual(seat.HandCards.Count, 4, $"Client {c + 1} phải có >= 4 lá trước khi đánh.");
                    }
                    else
                    {
                        Assert.IsNull(seat.HandCards, $"BẢO MẬT LỘ BÀI: Client {c + 1} bị rò rỉ HandCards của ghế {seat.SeatIndex}!");
                        Assert.GreaterOrEqual(seat.HandCount, 4, $"Client {c + 1} phải thấy HandCount >= 4 của ghế đối thủ {seat.SeatIndex}.");
                    }
                }
            }

            // Đợi UI ổn định 3 frames, kiểm tra không có biển "Máy Đánh Hộ" hiển thị trên ghế nào, rồi chụp 1080p
            for (int f = 0; f < 3; f++) yield return null;
            SeatPlaqueView[] plaques = Object.FindObjectsByType<SeatPlaqueView>(FindObjectsSortMode.None);
            for (int i = 0; i < plaques.Length; i++)
            {
                if (!plaques[i].gameObject.activeInHierarchy) continue;
                Transform statusRibbon = plaques[i].transform.Find("StatusRibbon");
                if (statusRibbon != null && statusRibbon.gameObject.activeInHierarchy)
                {
                    TMP_Text statusText = statusRibbon.GetComponentInChildren<TMP_Text>();
                    Assert.AreNotEqual("Máy Đánh Hộ", statusText != null ? statusText.text : string.Empty,
                        $"Ghế {plaques[i].SeatIndex} trong trận 4 người thật không được hiện nhãn 'Máy Đánh Hộ'.");
                }
            }

            yield return CaptureCamera1080pCoroutine("Screenshots/u6_lan_4p_match_1080p.png");

            // 9. Ngắt kết nối & Reconnect Takeover Client 3 (_spawnedClients[1])
            RemoteLanClient client3 = _spawnedClients[1];
            Assert.IsNotNull(client3.LatestPayload?.PlayerView, "Client 3 thiếu PlayerView trước khi ngắt kết nối.");

            // Nếu Client 3 vô tình trúng ghế Chủ Công (đang ở lượt đầu tiên), kết thúc lượt của Client 3 trước
            // để tránh bot timer (450ms) tự đánh làm đổi bài trên tay trong lúc đợi 0.5s ngắt mạng.
            if (client3.LatestPayload.PlayerView.CurrentTurnSeat == client3.LatestPayload.PlayerView.ViewerSeatIndex)
            {
                int seat3 = client3.LatestPayload.PlayerView.ViewerSeatIndex;
                Task endPlayTask = WrapAwaitable(() => client3.Ws.SendGameActionAsync(roomCode, new
                {
                    type = "END_PLAY_PHASE",
                    seatIndex = seat3,
                }));
                yield return WaitTaskWithTimeout(endPlayTask, 8f, "Client 3 END_PLAY_PHASE before disconnect");

                float discardCheckDeadline = Time.realtimeSinceStartup + 5f;
                while (Time.realtimeSinceStartup < discardCheckDeadline)
                {
                    PlayerViewStateDto cur3 = client3.LatestPayload?.PlayerView;
                    if (cur3 != null && (cur3.CurrentTurnSeat != seat3 || cur3.TurnPhase == "DISCARD")) break;
                    yield return null;
                }

                PlayerViewStateDto afterEndPlay = client3.LatestPayload?.PlayerView;
                if (afterEndPlay != null && afterEndPlay.CurrentTurnSeat == seat3 && afterEndPlay.TurnPhase == "DISCARD")
                {
                    int hp = Math.Max(0, afterEndPlay.MySeat?.Hp ?? 0);
                    int excess = Math.Max(0, (afterEndPlay.MyHand?.Count ?? 0) - hp);
                    if (excess > 0)
                    {
                        var discardIds = new List<string>(excess);
                        for (int k = 0; k < excess; k++) discardIds.Add(afterEndPlay.MyHand[k].Id);
                        Task discardTask = WrapAwaitable(() => client3.Ws.SendGameActionAsync(roomCode, new
                        {
                            type = "DISCARD_CARDS",
                            seatIndex = seat3,
                            cardIds = discardIds,
                        }));
                        yield return WaitTaskWithTimeout(discardTask, 8f, "Client 3 DISCARD_CARDS before disconnect");
                    }
                }

                float turnMovedDeadline = Time.realtimeSinceStartup + 6f;
                while (Time.realtimeSinceStartup < turnMovedDeadline)
                {
                    PlayerViewStateDto cur3 = client3.LatestPayload?.PlayerView;
                    if (cur3 != null && cur3.CurrentTurnSeat != seat3) break;
                    yield return null;
                }
                Assert.AreNotEqual(seat3, client3.LatestPayload?.PlayerView?.CurrentTurnSeat,
                    "Lượt chưa chuyển khỏi Client 3 trước khi thử ngắt kết nối.");
            }

            PlayerViewStateDto beforeReconnectPv = client3.LatestPayload.PlayerView;
            int expectedSeatIndex = beforeReconnectPv.ViewerSeatIndex;
            string expectedHeroId = beforeReconnectPv.MySeat.HeroId;
            var expectedHandIds = new List<string>(beforeReconnectPv.MyHand.Count);
            for (int k = 0; k < beforeReconnectPv.MyHand.Count; k++)
            {
                expectedHandIds.Add(beforeReconnectPv.MyHand[k].Id);
            }
            int updatesBeforeDisconnect = client3.RoomStateUpdates;

            client3.Ws.Disconnect();
            yield return new WaitForSecondsRealtime(0.5f);

            client3.AuthOk = false;
            Task reconnectTask = WrapAwaitable(() => client3.Ws.ConnectAndAuthenticateAsync(sidecar.BaseWsUrl, client3.Api.SessionToken, takeover: true));
            yield return WaitTaskWithTimeout(reconnectTask, 8f, "Client 3 Reconnect ConnectAndAuthenticateAsync");

            float reconnectAuthDeadline = Time.realtimeSinceStartup + 8f;
            while (!client3.AuthOk && Time.realtimeSinceStartup < reconnectAuthDeadline)
            {
                yield return null;
            }
            Assert.IsTrue(client3.AuthOk, "Client 3 không nhận được AUTH_OK sau khi reconnect.");

            Task resubTask = WrapAwaitable(() => client3.Ws.SendSubscribeRoomAsync(roomCode));
            yield return WaitTaskWithTimeout(resubTask, 8f, "Client 3 Reconnect SendSubscribeRoomAsync");

            float reconnectStateDeadline = Time.realtimeSinceStartup + 8f;
            while (Time.realtimeSinceStartup < reconnectStateDeadline)
            {
                RoomViewerPayload rp = client3.LatestPayload;
                bool gotFreshState = client3.RoomStateUpdates > updatesBeforeDisconnect &&
                    rp?.PlayerView != null &&
                    rp.RoomState?.Seats != null &&
                    expectedSeatIndex < rp.RoomState.Seats.Count &&
                    rp.RoomState.Seats[expectedSeatIndex].ConnectionStatus == "ONLINE" &&
                    !rp.RoomState.Seats[expectedSeatIndex].IsBotTakeover;
                if (gotFreshState) break;
                yield return null;
            }

            Assert.Greater(client3.RoomStateUpdates, updatesBeforeDisconnect, "Client 3 không nhận được OnRoomState mới sau khi reconnect.");
            PlayerViewStateDto afterReconnectPv = client3.LatestPayload?.PlayerView;
            Assert.IsNotNull(afterReconnectPv, "Client 3 thiếu PlayerView sau khi reconnect.");
            Assert.AreEqual(expectedSeatIndex, afterReconnectPv.ViewerSeatIndex, "Reconnect phải bảo toàn ViewerSeatIndex của Client 3.");
            Assert.AreEqual(expectedHeroId, afterReconnectPv.MySeat?.HeroId, "Reconnect phải bảo toàn HeroId của Client 3.");
            Assert.IsFalse(afterReconnectPv.MySeat?.IsBotTakeover ?? true, "Client 3 sau reconnect phải tắt IsBotTakeover.");
            Assert.IsNotNull(afterReconnectPv.MyHand, "Reconnect phải khôi phục HandCards của Client 3.");
            Assert.AreEqual(expectedHandIds.Count, afterReconnectPv.MyHand.Count, "Reconnect phải giữ nguyên số lá bài trên tay Client 3.");
            for (int k = 0; k < expectedHandIds.Count; k++)
            {
                Assert.AreEqual(expectedHandIds[k], afterReconnectPv.MyHand[k].Id, $"Lá bài #{k} của Client 3 bị sai lệch sau reconnect.");
            }

            // 10. Trọng Tài PAUSE / RESUME đồng bộ cả 4 client -> ABORT_MATCH -> LeaveRoom -> ShutdownSidecar
            Task<bool> pauseTask = WrapAwaitable(() => _director.SendRefereeActionAsync("PAUSE"));
            yield return WaitTaskWithTimeout(pauseTask, 8f, "SendRefereeActionAsync PAUSE");
            Assert.IsTrue(pauseTask.Result, "Trọng Tài PAUSE thất bại.");

            float pauseSyncDeadline = Time.realtimeSinceStartup + 6f;
            bool allPaused = false;
            while (Time.realtimeSinceStartup < pauseSyncDeadline)
            {
                allPaused = true;
                for (int c = 0; c < 4; c++)
                {
                    if (!(GetClientPayload(c)?.RoomState?.IsTimerPaused ?? false))
                    {
                        allPaused = false;
                        break;
                    }
                }
                if (allPaused) break;
                yield return null;
            }
            Assert.IsTrue(allPaused, "Không phải cả 4 client đều nhận trạng thái IsTimerPaused == true sau PAUSE.");

            Task<bool> resumeTask = WrapAwaitable(() => _director.SendRefereeActionAsync("RESUME"));
            yield return WaitTaskWithTimeout(resumeTask, 8f, "SendRefereeActionAsync RESUME");
            Assert.IsTrue(resumeTask.Result, "Trọng Tài RESUME thất bại.");

            float resumeSyncDeadline = Time.realtimeSinceStartup + 6f;
            bool allResumed = false;
            while (Time.realtimeSinceStartup < resumeSyncDeadline)
            {
                allResumed = true;
                for (int c = 0; c < 4; c++)
                {
                    if (GetClientPayload(c)?.RoomState?.IsTimerPaused ?? true)
                    {
                        allResumed = false;
                        break;
                    }
                }
                if (allResumed) break;
                yield return null;
            }
            Assert.IsTrue(allResumed, "Không phải cả 4 client đều nhận trạng thái IsTimerPaused == false sau RESUME.");

            Task<bool> abortTask = WrapAwaitable(() => _director.SendRefereeActionAsync("ABORT_MATCH"));
            yield return WaitTaskWithTimeout(abortTask, 8f, "SendRefereeActionAsync ABORT_MATCH");
            Assert.IsTrue(abortTask.Result, "Trọng Tài ABORT_MATCH thất bại.");

            float lobbyReturnDeadline = Time.realtimeSinceStartup + 5f;
            while (Time.realtimeSinceStartup < lobbyReturnDeadline &&
                   !string.Equals(_director.LatestPayload?.RoomState?.Status, "LOBBY", StringComparison.Ordinal))
            {
                yield return null;
            }
            Assert.AreEqual("LOBBY", _director.LatestPayload?.RoomState?.Status, "Phòng phải về trạng thái LOBBY sau ABORT_MATCH.");

            // Tất cả 4 client rời phòng sạch sẽ
            Task<RoomViewerPayload> hostLeaveTask = WrapAwaitable(() => _director.ApiClient.LeaveRoomAsync(roomCode));
            yield return WaitTaskWithTimeout(hostLeaveTask, 8f, "Host LeaveRoomAsync");

            for (int i = 0; i < _spawnedClients.Count; i++)
            {
                RemoteLanClient client = _spawnedClients[i];
                Task<RoomViewerPayload> guestLeaveTask = WrapAwaitable(() => client.Api.LeaveRoomAsync(roomCode));
                yield return WaitTaskWithTimeout(guestLeaveTask, 8f, $"Client {i + 2} LeaveRoomAsync");
                client.Ws.Disconnect();
            }

            _director.ShutdownSidecar();
            yield return null;
            Assert.IsFalse(sidecar != null && sidecar.IsReady, "Sidecar phải ngắt sạch sau ShutdownSidecar.");
        }

        private RoomViewerPayload GetClientPayload(int clientZeroToThree)
        {
            if (clientZeroToThree == 0) return _director != null ? _director.LatestPayload : null;
            int idx = clientZeroToThree - 1;
            return idx >= 0 && idx < _spawnedClients.Count ? _spawnedClients[idx].LatestPayload : null;
        }

        private Task<bool> SelectHeroForClientAsync(int clientZeroToThree, string roomCode, string heroId)
        {
            if (clientZeroToThree == 0)
            {
                return WrapAwaitable(() => _director.SelectHeroAsync(heroId));
            }
            RemoteLanClient client = _spawnedClients[clientZeroToThree - 1];
            return SelectGuestHeroAsync(client, roomCode, heroId);
        }

        private static async Task<bool> SelectGuestHeroAsync(RemoteLanClient client, string roomCode, string heroId)
        {
            RoomViewerPayload res = await client.Api.SelectHeroAsync(roomCode, heroId);
            if (res != null) client.LatestPayload = res;
            return res != null;
        }

        private static void CleanupStaleSidecarDatabase()
        {
            try
            {
                string dbPath = Path.Combine(Application.persistentDataPath, "lkdf-sidecar.json");
                if (File.Exists(dbPath)) File.Delete(dbPath);
                string tmpPath = dbPath + ".tmp";
                if (File.Exists(tmpPath)) File.Delete(tmpPath);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[CuuChauU6LanTest] Không thể dọn lkdf-sidecar.json cũ: {ex.Message}");
            }
        }

        private static async Task WrapAwaitable(Func<Awaitable> factory) => await factory();
        private static async Task<T> WrapAwaitable<T>(Func<Awaitable<T>> factory) => await factory();

        private static IEnumerator WaitTaskWithTimeout(Task task, float timeoutSeconds, string label)
        {
            float deadline = Time.realtimeSinceStartup + timeoutSeconds;
            while (!task.IsCompleted)
            {
                if (Time.realtimeSinceStartup > deadline)
                {
                    Assert.Fail($"{label} quá thời gian ({timeoutSeconds}s).");
                }
                yield return null;
            }

            if (task.IsFaulted && task.Exception != null)
            {
                Assert.Fail($"{label} phát sinh ngoại lệ: {task.Exception.GetBaseException().Message}");
            }
        }

        private static IEnumerator CaptureCamera1080pCoroutine(string relativePath)
        {
            yield return null;
            Camera cam = Camera.main;
            Assert.IsNotNull(cam, "Không có Camera.main để chụp PlayMode 1080p.");

            const int width = 1920;
            const int height = 1080;
            string fullPath = Path.GetFullPath(relativePath);
            string dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);

            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var tex = new Texture2D(width, height, TextureFormat.RGBA32, false);
            RenderTexture prevActive = RenderTexture.active;
            RenderTexture prevCam = cam.targetTexture;
            try
            {
                Canvas.ForceUpdateCanvases();
                cam.targetTexture = rt;
                cam.Render();
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                tex.Apply();
                File.WriteAllBytes(fullPath, tex.EncodeToPNG());
            }
            finally
            {
                cam.targetTexture = prevCam;
                RenderTexture.active = prevActive;
                Object.Destroy(rt);
                Object.Destroy(tex);
            }
        }
    }
}
