#if UNITY_EDITOR
using System;
using System.IO;
using CuuChau.Arena;
using CuuChau.Audio;
using CuuChau.Cards;
using CuuChau.Data;
using CuuChau.Lobby;
using CuuChau.Match;
using CuuChau.Modals;
using CuuChau.Net;
using CuuChau.Sidecar;
using CuuChau.VFX;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace CuuChau.Editor
{
    /// <summary>
    /// Lắp ráp hoàn chỉnh ứng dụng Chặng U4 (Assets/Scenes/U4_FullGame_App.unity):
    /// 1) Kết xuất 3 ảnh GPU thật 1920x1080 cho Sảnh Đại Điện, Chọn Tướng 3-chọn-1 và Bảng Trọng Tài 4 Nút,
    /// 2) Lưu scene khởi động sạch với toàn bộ tham chiếu [SerializeField] để CuuChauMatchDirector tự dựng cây UI 1 lần khi PlayMode/Standalone,
    /// 3) Khóa U4_FullGame_App.unity làm Scene 0 trong EditorBuildSettings.
    /// </summary>
    public static class CuuChauU4AppAssembler
    {
        private const string AppScenePath = "Assets/Scenes/U4_FullGame_App.unity";
        private const string CatalogPath = "Assets/Data/VisualCatalog.asset";
        private const string BurnMaterialPath = "Assets/Materials/CardBurnInkDissolve.mat";
        private const string SilkMaterialPath = "Assets/Materials/SilkRibbonGlow.mat";

        private struct AppSceneRig
        {
            public Scene Scene;
            public CuuChauMatchDirector Director;
            public ArenaTableController Table;
            public ArenaHudController Hud;
            public ArcFanHandLayout Fan;
            public SilkTargetArrow Arrow;
            public SilkScrollTooltipView Tooltip;
            public LobbyHallView Lobby;
            public WaitingRoomView WaitingRoom;
            public HeroDraftModalView DraftModal;
            public RefereeModalView RefereeModal;
            public HandbookModalView HandbookModal;
            public MatchSummaryModalView SummaryModal;
            public RectTransform StageRect;
        }

        [MenuItem("CuuChau/Build U4 Full Game App & Capture Showcase")]
        public static void BuildAndCapture()
        {
            if (!Directory.Exists("Assets/Scenes")) Directory.CreateDirectory("Assets/Scenes");
            if (!Directory.Exists("Assets/Materials")) Directory.CreateDirectory("Assets/Materials");

            // Showcase 1..3: Build temporary showcase rigs after NewScene so sprites remain bound
            CaptureShowcaseStates();

            // Final Startup Scene: clean containers + serialized director wiring (zero duplicate objects in PlayMode)
            AppSceneRig runtimeRig = BuildRig(initializeHierarchyNow: false);
            EditorSceneManager.MarkSceneDirty(runtimeRig.Scene);
            EditorSceneManager.SaveScene(runtimeRig.Scene, AppScenePath);
            AssetDatabase.SaveAssets();

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(AppScenePath, true),
            };

            Debug.Log("[CuuChauU4AppAssembler] Hoàn tất lưu U4_FullGame_App.unity (Scene 0) & chụp đủ 3 ảnh Sảnh / Chọn Tướng / Trọng Tài 1080p!");
        }

        private static void CaptureShowcaseStates()
        {
            AppSceneRig rig = BuildRig(initializeHierarchyNow: true);
            rig.Table.PopulateDemoPreview(6, 3);
            rig.Hud.PopulateDemoPreview();
            rig.Fan.PopulateDemoHand(2);

            // 1. Lobby Hall (3 Lệnh Bài)
            rig.Lobby.SetVisible(true);
            rig.Lobby.SetServerStatus(true, "Máy chủ 112 lá sẵn sàng · 25 Hiệp khách Cửu Châu", canRetry: false);
            rig.Lobby.PopulateDemoPreview();
            rig.WaitingRoom.SetVisible(false);
            rig.DraftModal.SetVisible(false);
            rig.RefereeModal.SetVisible(false);
            rig.HandbookModal.SetVisible(false);
            rig.SummaryModal.SetVisible(false);
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u4_lobby_1080p.png", 1920, 1080);

            // 2. Hero Draft (3-chọn-1 trên nền bàn mờ)
            rig.Lobby.SetVisible(false);
            rig.DraftModal.SetVisible(true);
            rig.DraftModal.SetReducedMotion(true);
            rig.DraftModal.PopulateDemoPreview();
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u4_hero_draft_1080p.png", 1920, 1080);

            // 3. Referee Modal (4 nút Trọng Tài chuẩn)
            rig.DraftModal.SetVisible(false);
            rig.RefereeModal.SetVisible(true);
            rig.RefereeModal.PopulateDemoPreview();
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u4_referee_handbook_1080p.png", 1920, 1080);
        }

        private static AppSceneRig BuildRig(bool initializeHierarchyNow)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                mainCam.orthographic = true;
                mainCam.orthographicSize = 5f;
                mainCam.clearFlags = CameraClearFlags.SolidColor;
                mainCam.backgroundColor = new Color(0.035f, 0.031f, 0.027f, 1f);
            }

            VisualCatalogSO catalog = CuuChauU1SliceBuilder.BuildOrUpdateVisualCatalog();
            if (catalog == null)
            {
                throw new InvalidOperationException($"Không nạp được {CatalogPath}.");
            }
            AssetDatabase.SaveAssets();
            catalog = AssetDatabase.LoadAssetAtPath<VisualCatalogSO>(CatalogPath);

            TMP_FontAsset serifFont = LoadFontOrThrow("Assets/Fonts/NotoSerif-Bold_SDF.asset");
            TMP_FontAsset sansFont = LoadFontOrThrow("Assets/Fonts/BeVietnamPro-SemiBold_SDF.asset");
            TMP_FontAsset monoFont = LoadFontOrThrow("Assets/Fonts/JetBrainsMono-Bold_SDF.asset");
            Material burnMat = EnsureMaterial(BurnMaterialPath, "CuuChau/CardBurnInkDissolve");
            Material silkMat = EnsureMaterial(SilkMaterialPath, "CuuChau/SilkRibbonGlow");

            EnsureEventSystem();

            var sessionRoot = new GameObject("CuuChauSessionRoot");
            var sidecar = sessionRoot.AddComponent<LkdfSidecarProcess>();
            var wsClient = sessionRoot.AddComponent<RoomWsClient>();
            var audioCtrl = sessionRoot.AddComponent<CuuChauAudioController>();
            audioCtrl.SetCatalog(catalog);
            var director = sessionRoot.AddComponent<CuuChauMatchDirector>();
            var feelCtrl = sessionRoot.AddComponent<ArenaFeelController>();

            var canvasGo = new GameObject("U4_AppCanvas");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = mainCam;
            canvas.planeDistance = 10f;

            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var backdropGo = new GameObject("TableBoard_25D", typeof(RectTransform), typeof(Image));
            backdropGo.transform.SetParent(canvasGo.transform, false);
            StretchFull(backdropGo.GetComponent<RectTransform>());
            var backdropImg = backdropGo.GetComponent<Image>();
            backdropImg.sprite = catalog.tableBoard25D;
            backdropImg.preserveAspect = false;
            backdropImg.raycastTarget = false;

            var stageGo = new GameObject("ArenaShakeStage", typeof(RectTransform));
            stageGo.transform.SetParent(canvasGo.transform, false);
            var stageRect = stageGo.GetComponent<RectTransform>();
            StretchFull(stageRect);

            var tableCtrl = CreateStretchNode<ArenaTableController>("ArenaTableRoot", stageGo.transform);
            var hudCtrl = CreateStretchNode<ArenaHudController>("ArenaHudRoot", stageGo.transform);

            var fanGo = new GameObject("ArcFanHandRoot", typeof(RectTransform), typeof(ArcFanHandLayout));
            fanGo.transform.SetParent(stageGo.transform, false);
            var fanRect = fanGo.GetComponent<RectTransform>();
            fanRect.anchorMin = new Vector2(0.5f, 0f);
            fanRect.anchorMax = new Vector2(0.5f, 0f);
            fanRect.pivot = new Vector2(0.5f, 0.5f);
            fanRect.anchoredPosition = new Vector2(-18f, 192f);
            fanRect.sizeDelta = new Vector2(1160f, 320f);
            var fanLayout = fanGo.GetComponent<ArcFanHandLayout>();

            var silkArrow = CreateStretchNode<SilkTargetArrow>("SilkTargetArrowRoot", stageGo.transform);

            var tooltipGo = new GameObject("SilkScrollTooltipRoot", typeof(RectTransform), typeof(SilkScrollTooltipView));
            tooltipGo.transform.SetParent(stageGo.transform, false);
            var tooltipView = tooltipGo.GetComponent<SilkScrollTooltipView>();

            var tintGo = new GameObject("FeelScreenTint", typeof(RectTransform), typeof(Image));
            tintGo.transform.SetParent(stageGo.transform, false);
            StretchFull(tintGo.GetComponent<RectTransform>());
            var tintImg = tintGo.GetComponent<Image>();
            tintImg.color = new Color(1f, 0.9f, 0.7f, 0f);
            tintImg.raycastTarget = false;
            feelCtrl.SetShakeTarget(stageRect);
            feelCtrl.SetScreenTintGraphic(tintImg);

            var vfxOverlay = CreateStretchNode<VfxBurstOverlay>("VfxBurstOverlayRoot", stageGo.transform);

            // Overlay Views & Modals above Arena Stage
            var lobbyHall = CreateStretchNode<LobbyHallView>("LobbyHallRoot", canvasGo.transform);
            var waitingRoom = CreateStretchNode<WaitingRoomView>("WaitingRoomRoot", canvasGo.transform);
            var heroDraftModal = CreateStretchNode<HeroDraftModalView>("HeroDraftModalRoot", canvasGo.transform);
            var refereeModal = CreateStretchNode<RefereeModalView>("RefereeModalRoot", canvasGo.transform);
            var handbookModal = CreateStretchNode<HandbookModalView>("HandbookModalRoot", canvasGo.transform);
            var summaryModal = CreateStretchNode<MatchSummaryModalView>("MatchSummaryModalRoot", canvasGo.transform);

            director.ConfigureSerializedAssets(serifFont, sansFont, monoFont, burnMat, silkMat);
            director.AssignSceneReferences(
                catalog, sidecar, wsClient, audioCtrl,
                tableCtrl, hudCtrl, fanLayout, silkArrow, tooltipView, feelCtrl, vfxOverlay,
                lobbyHall, waitingRoom, heroDraftModal, refereeModal, handbookModal, summaryModal, stageRect);
            director.AutoStartOnStart = true;

            if (initializeHierarchyNow)
            {
                director.BuildViewsFromSerializedAssets();
            }

            return new AppSceneRig
            {
                Scene = scene,
                Director = director,
                Table = tableCtrl,
                Hud = hudCtrl,
                Fan = fanLayout,
                Arrow = silkArrow,
                Tooltip = tooltipView,
                Lobby = lobbyHall,
                WaitingRoom = waitingRoom,
                DraftModal = heroDraftModal,
                RefereeModal = refereeModal,
                HandbookModal = handbookModal,
                SummaryModal = summaryModal,
                StageRect = stageRect,
            };
        }

        private static T CreateStretchNode<T>(string name, Transform parent) where T : Component
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(T));
            go.transform.SetParent(parent, false);
            StretchFull(go.GetComponent<RectTransform>());
            return go.GetComponent<T>();
        }

        private static void StretchFull(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = Vector2.zero;
            rt.sizeDelta = Vector2.zero;
        }

        private static TMP_FontAsset LoadFontOrThrow(string assetPath)
        {
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);
            if (font == null) throw new InvalidOperationException($"Không tìm thấy font TMP {assetPath}.");
            return font;
        }

        private static Material EnsureMaterial(string assetPath, string shaderName)
        {
            Material mat = AssetDatabase.LoadAssetAtPath<Material>(assetPath);
            if (mat != null && mat.shader != null && mat.shader.name == shaderName) return mat;

            Shader shader = Shader.Find(shaderName);
            if (shader == null) throw new InvalidOperationException($"Không tìm thấy shader {shaderName}.");

            if (mat == null)
            {
                mat = new Material(shader);
                AssetDatabase.CreateAsset(mat, assetPath);
            }
            else
            {
                mat.shader = shader;
            }
            EditorUtility.SetDirty(mat);
            return mat;
        }

        private static void EnsureEventSystem()
        {
            if (UnityEngine.Object.FindAnyObjectByType<EventSystem>() != null) return;
            var esGo = new GameObject("EventSystem", typeof(EventSystem), typeof(InputSystemUIInputModule));
            esGo.transform.position = Vector3.zero;
        }
    }
}
#endif
