using System;
using System.Collections;
using System.IO;
using System.Threading.Tasks;
using CuuChau.Match;
using CuuChau.Net;
using CuuChau.Sidecar;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace CuuChau.Tests.PlayMode
{
    /// <summary>
    /// Kiểm thử End-to-End trong Unity 6.3 PlayMode thật:
    /// Nạp U4_FullGame_App -> Khởi chạy Sidecar @lkdf/server 112 lá -> Guest Auth + WebSocket ->
    /// Tạo phòng 4 ghế (/fill-bots) -> Chọn Hiệp Khách 3-chọn-1 -> Vào Combat thật (kiểm chứng giấu bài đối thủ) ->
    /// Chụp ảnh GPU thật -> Trọng Tài Tạm Dừng / Tiếp Tục -> Tắt Sidecar sạch.
    /// </summary>
    public sealed class CuuChauU4LiveSidecarPlayModeTests
    {
        private CuuChauMatchDirector _director;

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_director != null)
            {
                _director.ShutdownSidecar();
                _director = null;
            }
            yield return null;
        }

        [UnityTest]
        public IEnumerator FullMatchLifecycle_Sidecar_Draft_Combat_Referee_CleanShutdown()
        {
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("U4_FullGame_App", LoadSceneMode.Single);
            Assert.IsNotNull(loadOp, "Không thể tải scene U4_FullGame_App.");
            while (!loadOp.isDone) yield return null;

            _director = Object.FindAnyObjectByType<CuuChauMatchDirector>();
            Assert.IsNotNull(_director, "Thiếu CuuChauMatchDirector trong U4_FullGame_App.");
            _director.AutoStartOnStart = false;
            yield return null;

            // 1. Khởi chạy Sidecar & kiểm tra /api/health (25 hero / 112 deck)
            Task<bool> startSidecarTask = WrapAwaitable(() => _director.EnsureSidecarStartedAsync());
            yield return WaitTaskWithTimeout(startSidecarTask, 20f, "EnsureSidecarStartedAsync");
            Assert.IsTrue(startSidecarTask.Result, $"Sidecar khởi động thất bại: {_director.LastError}");
            Assert.IsTrue(_director.SidecarReady);

            Task<HealthResponse> healthTask = WrapAwaitable(() => _director.ApiClient.GetHealthAsync());
            yield return WaitTaskWithTimeout(healthTask, 8f, "GetHealthAsync");
            HealthResponse health = healthTask.Result;
            Assert.IsNotNull(health);
            Assert.IsTrue(health.Ok);
            Assert.AreEqual(25, health.HeroCount, "Sidecar phải có đúng 25 hiệp khách.");
            Assert.GreaterOrEqual(health.DeckTotal, 108, "Sidecar health phải sẵn sàng bộ bài chuẩn.");

            // 2. Tạo bàn 4 ghế đấu máy -> Vào pha Chọn Tướng 3-chọn-1
            Task<bool> soloTask = WrapAwaitable(() => _director.StartSoloVsBotsAsync(4, "KiemKhachTest"));
            yield return WaitTaskWithTimeout(soloTask, 15f, "StartSoloVsBotsAsync");
            Assert.IsTrue(soloTask.Result, $"StartSoloVsBotsAsync thất bại: {_director.LastError}");
            Assert.IsFalse(string.IsNullOrEmpty(_director.CurrentRoomCode));

            float waitDraftDeadline = Time.realtimeSinceStartup + 10f;
            while (Time.realtimeSinceStartup < waitDraftDeadline)
            {
                var pvDraft = _director.LatestPayload?.PlayerView;
                if (pvDraft?.HeroDraft != null && pvDraft.HeroDraft.MyCandidates != null && pvDraft.HeroDraft.MyCandidates.Count >= 3)
                {
                    break;
                }
                yield return null;
            }

            HeroDraftViewDto draft = _director.LatestPayload?.PlayerView?.HeroDraft;
            Assert.IsNotNull(draft, "Không nhận được HeroDraft từ server sau StartMatch.");
            Assert.GreaterOrEqual(draft.MyCandidates.Count, 3, "Phải có tối thiểu 3 ứng viên tướng.");

            // 3. Chọn ứng viên đầu tiên -> đợi Bot chốt xong & vào bàn Combat thật
            string chosenHero = draft.MyCandidates[0];
            Task<bool> pickTask = WrapAwaitable(() => _director.SelectHeroAsync(chosenHero));
            yield return WaitTaskWithTimeout(pickTask, 10f, "SelectHeroAsync");
            Assert.IsTrue(pickTask.Result, $"SelectHeroAsync thất bại: {_director.LastError}");

            float waitCombatDeadline = Time.realtimeSinceStartup + 15f;
            PlayerViewStateDto combatView = null;
            while (Time.realtimeSinceStartup < waitCombatDeadline)
            {
                PlayerViewStateDto pv = _director.LatestPayload?.PlayerView;
                bool draftDone = pv != null &&
                    !string.Equals(pv.TurnPhase, "HERO_SELECT", StringComparison.Ordinal) &&
                    (pv.HeroDraft == null || string.Equals(pv.HeroDraft.Stage, "COMPLETED", StringComparison.Ordinal));
                if (draftDone && pv.Players != null && pv.Players.Count == 4 && pv.MyHand != null && pv.MyHand.Count >= 4)
                {
                    combatView = pv;
                    break;
                }
                yield return null;
            }

            PlayerViewStateDto lastPv = _director.LatestPayload?.PlayerView;
            RoomWsClient wsCheck = Object.FindAnyObjectByType<RoomWsClient>();
            string diag = $"turnPhase={lastPv?.TurnPhase}, draftStage={lastPv?.HeroDraft?.Stage}, draw={lastPv?.DrawPileCount}, hand={lastPv?.MyHand?.Count}, wsConnected={wsCheck?.IsConnected}, err={_director.LastError}";
            Assert.IsNotNull(combatView, $"Ván đấu chưa chuyển sang combat hoặc chưa phát bài đầu ván ({diag}).");
            Assert.IsTrue(combatView.EnabledPacks != null && combatView.EnabledPacks.Contains("cuu_chau_core"), "Ván đấu phải bật gói cuu_chau_core 112 lá.");
            Assert.Greater(combatView.DrawPileCount, 0);

            int totalVisibleCards = combatView.DrawPileCount + combatView.DiscardPileCount + (combatView.HarvestPool?.Count ?? 0);
            for (int i = 0; i < combatView.Players.Count; i++)
            {
                PublicPlayerViewDto p = combatView.Players[i];
                totalVisibleCards += p.HandCount + (p.DelayedScrolls?.Count ?? 0);
                if (p.Equipments != null)
                {
                    if (p.Equipments.Weapon != null) totalVisibleCards++;
                    if (p.Equipments.Armor != null) totalVisibleCards++;
                    if (p.Equipments.PlusOneHorse != null) totalVisibleCards++;
                    if (p.Equipments.MinusOneHorse != null) totalVisibleCards++;
                }
            }
            Assert.GreaterOrEqual(totalVisibleCards, 112, "Tổng bài trên bàn thật phải dùng đúng bộ 112 lá Cửu Châu.");

            // 4. Bảo mật projection: đối thủ tuyệt đối không lộ handCards (chỉ có handCount)
            for (int i = 0; i < combatView.Players.Count; i++)
            {
                PublicPlayerViewDto seat = combatView.Players[i];
                if (seat.SeatIndex == combatView.ViewerSeatIndex)
                {
                    Assert.IsNotNull(seat.HandCards, "Bài trên tay người xem phải hiển thị.");
                    Assert.GreaterOrEqual(seat.HandCards.Count, 4);
                }
                else
                {
                    Assert.IsNull(seat.HandCards, $"Bảo mật lộ bài: Ghế đối thủ {seat.SeatIndex} bị rò rỉ HandCards!");
                    Assert.GreaterOrEqual(seat.HandCount, 1, $"Ghế đối thủ {seat.SeatIndex} phải hiển thị số lượng lá.");
                }
            }

            // 4b. Chặng U5: Xác thực đủ 64 tác phẩm (25 tướng + 36 lá + 3 đại cảnh) và từng ghế/lá sống
            CuuChau.Data.VisualCatalogSO[] catalogs = Resources.FindObjectsOfTypeAll<CuuChau.Data.VisualCatalogSO>();
            CuuChau.Data.VisualCatalogSO catalog = catalogs != null && catalogs.Length > 0 ? catalogs[0] : null;
            Assert.IsNotNull(catalog, "Không tìm thấy VisualCatalogSO trong bộ nhớ PlayMode.");
            Assert.AreEqual(25, catalog.heroPortraits.Count, "VisualCatalogSO phải có đủ 25 chân dung Hiệp Khách.");
            Assert.AreEqual(36, catalog.cardArts.Count, "VisualCatalogSO phải có đủ 36 tranh Lá Bài.");
            Assert.IsNotNull(catalog.lobbyHallBackdrop, "Thiếu phông nền Sảnh Đại Điện U5.");
            Assert.IsNotNull(catalog.tableBoard25D, "Thiếu phông nền Bàn Đấu 2.5D.");
            Assert.IsNotNull(catalog.cardBackCuuChau, "Thiếu phông Lưng Bài Cửu Châu.");
            for (int i = 0; i < combatView.Players.Count; i++)
            {
                string seatHeroId = combatView.Players[i].HeroId;
                Assert.IsTrue(catalog.FindHero(seatHeroId).HasValue, $"Không ánh xạ được chân dung cho tướng '{seatHeroId}'.");
            }
            for (int i = 0; i < combatView.MyHand.Count; i++)
            {
                string cardKey = combatView.MyHand[i].CardKey;
                Assert.IsNotNull(catalog.FindCardArt(cardKey), $"Không tìm thấy tranh lá bài '{cardKey}'.");
            }

            // Cho UI ổn định 3 frames rồi chụp ảnh PlayMode sống 1920x1080 thật
            for (int f = 0; f < 3; f++) yield return null;
            yield return CaptureCamera1080pCoroutine("Screenshots/u4_live_sidecar_match_1080p.png");
            yield return CaptureCamera1080pCoroutine("Screenshots/u5_live_sidecar_match_1080p.png");

            // 5. Trọng Tài PAUSE -> RESUME qua API thật + WebSocket đồng bộ
            Task<bool> pauseTask = WrapAwaitable(() => _director.SendRefereeActionAsync("PAUSE"));
            yield return WaitTaskWithTimeout(pauseTask, 8f, "SendRefereeActionAsync PAUSE");
            Assert.IsTrue(pauseTask.Result, "Trọng Tài PAUSE thất bại.");

            float waitPauseDeadline = Time.realtimeSinceStartup + 5f;
            while (Time.realtimeSinceStartup < waitPauseDeadline && !(_director.LatestPayload?.RoomState?.IsTimerPaused ?? false))
            {
                yield return null;
            }
            Assert.IsTrue(_director.LatestPayload?.RoomState?.IsTimerPaused ?? false, "Trạng thái IsTimerPaused chưa bật sau PAUSE.");

            Task<bool> resumeTask = WrapAwaitable(() => _director.SendRefereeActionAsync("RESUME"));
            yield return WaitTaskWithTimeout(resumeTask, 8f, "SendRefereeActionAsync RESUME");
            Assert.IsTrue(resumeTask.Result, "Trọng Tài RESUME thất bại.");

            float waitResumeDeadline = Time.realtimeSinceStartup + 5f;
            while (Time.realtimeSinceStartup < waitResumeDeadline && (_director.LatestPayload?.RoomState?.IsTimerPaused ?? true))
            {
                yield return null;
            }
            Assert.IsFalse(_director.LatestPayload?.RoomState?.IsTimerPaused ?? true, "Trạng thái IsTimerPaused chưa tắt sau RESUME.");

            // 6. Hủy trận & tắt Sidecar sạch để không kẹt phòng cũ cho lần chạy kế
            Task<bool> abortTask = WrapAwaitable(() => _director.SendRefereeActionAsync("ABORT_MATCH"));
            float abortDeadline = Time.realtimeSinceStartup + 3f;
            while (!abortTask.IsCompleted && Time.realtimeSinceStartup < abortDeadline) yield return null;

            _director.ShutdownSidecar();
            yield return null;
            var sidecar = Object.FindAnyObjectByType<LkdfSidecarProcess>();
            Assert.IsFalse(sidecar != null && sidecar.IsReady, "Sidecar phải ngắt sạch sau ShutdownSidecar.");
        }

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
