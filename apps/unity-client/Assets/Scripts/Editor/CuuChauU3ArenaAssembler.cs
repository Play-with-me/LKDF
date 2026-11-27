#if UNITY_EDITOR
using System;
using System.IO;
using CuuChau.Arena;
using CuuChau.Audio;
using CuuChau.Cards;
using CuuChau.Data;
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
    /// Lắp ráp hoàn chỉnh sân khấu Chặng U3 (Assets/Scenes/U3_LiveArena.unity) kết nối 3 phân hệ Swarm:
    /// - Bàn đấu 2.5D (ArenaTableController, SeatPlaqueView, EquipmentSlotGrid, FuseTimerBar, ArenaHudController)
    /// - Quạt bài vật lý 1.7x & dây lụa Bézier (ArcFanHandLayout, CardView25D, SilkTargetArrow, SilkScrollTooltipView)
    /// - Shader Cháy Mực / Dải Lụa URP & Game Feel 4 pha (ArenaFeelController, VfxBurstOverlay)
    /// Sau đó xuất đồng thời render GPU thật 1920x1080 và 1280x720 để kiểm chứng thị giác.
    /// </summary>
    public static class CuuChauU3ArenaAssembler
    {
        private const string SceneOutPath = "Assets/Scenes/U3_LiveArena.unity";
        private const string CatalogPath = "Assets/Data/VisualCatalog.asset";
        private const string MaterialsDir = "Assets/Materials";
        private const string BurnMaterialPath = "Assets/Materials/CardBurnInkDissolve.mat";
        private const string SilkMaterialPath = "Assets/Materials/SilkRibbonGlow.mat";

        [MenuItem("CuuChau/Build U3 Live Arena & Capture Renders")]
        public static void BuildAndCapture()
        {
            EnsureDirectory("Assets/Scenes");
            EnsureDirectory(MaterialsDir);

            // 1. Tạo Scene mới TRƯỚC để NewScene()->UnloadUnusedAssets() KHÔNG dỡ mất sprite vừa nạp
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
                throw new InvalidOperationException($"Không thể nạp hoặc cập nhật {CatalogPath}.");
            }

            SyncCatalogAliases(catalog);
            AssetDatabase.SaveAssets();
            catalog = AssetDatabase.LoadAssetAtPath<VisualCatalogSO>(CatalogPath);
            Debug.Log($"[CuuChauU3ArenaAssembler] Sprite check: frame={(catalog.cardFrame9Slice != null)}, seat={(catalog.seatFrame9Slice != null)}, seal={(catalog.sealBattleLog != null)}, spade={(catalog.suitSpade != null)}");

            TMP_FontAsset serifFont = LoadFontOrThrow("Assets/Fonts/NotoSerif-Bold_SDF.asset");
            TMP_FontAsset sansFont = LoadFontOrThrow("Assets/Fonts/BeVietnamPro-SemiBold_SDF.asset");
            TMP_FontAsset monoFont = LoadFontOrThrow("Assets/Fonts/JetBrainsMono-Bold_SDF.asset");

            Material burnMat = CreateOrUpdateMaterial(
                BurnMaterialPath,
                "CuuChau/CardBurnInkDissolve",
                mat =>
                {
                    mat.SetFloat("_DissolveAmount", 0f);
                    mat.SetFloat("_BurnEdgeWidth", 0.08f);
                    mat.SetFloat("_NoiseScale", 14f);
                    mat.SetFloat("_SheenStrength", 0.22f);
                });

            Material silkMat = CreateOrUpdateMaterial(
                SilkMaterialPath,
                "CuuChau/SilkRibbonGlow",
                mat =>
                {
                    mat.SetFloat("_FlowSpeed", 1.6f);
                    mat.SetFloat("_GlowIntensity", 1.45f);
                    mat.SetFloat("_PulseFreq", 3.0f);
                });

            EnsureEventSystem();

            // 1. Runtime Session Root (Sidecar + WebSocket + Studio Audio)
            var sessionRoot = new GameObject("CuuChauSessionRoot");
            sessionRoot.AddComponent<LkdfSidecarProcess>();
            sessionRoot.AddComponent<RoomWsClient>();
            var audioCtrl = sessionRoot.AddComponent<CuuChauAudioController>();
            audioCtrl.SetCatalog(catalog);

            // 2. ScreenSpace-Camera Canvas (1920x1080 Match=0.5f, 100% uGUI - Zero UITK)
            var canvasGo = new GameObject("U3_ArenaCanvas");
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

            var canvasRect = canvasGo.GetComponent<RectTransform>();

            // 3. Static 2.5D Brass Tabletop Backdrop
            var backdropGo = new GameObject("TableBoard_25D", typeof(RectTransform), typeof(Image));
            backdropGo.transform.SetParent(canvasGo.transform, false);
            StretchFull(backdropGo.GetComponent<RectTransform>());
            var backdropImg = backdropGo.GetComponent<Image>();
            backdropImg.sprite = catalog.tableBoard25D;
            backdropImg.preserveAspect = false;
            backdropImg.raycastTarget = false;

            // 4. Arena Shake Stage (parent of Table + HUD + Hand + Ribbon + VFX)
            var stageGo = new GameObject("ArenaShakeStage", typeof(RectTransform));
            stageGo.transform.SetParent(canvasGo.transform, false);
            var stageRect = stageGo.GetComponent<RectTransform>();
            StretchFull(stageRect);

            // 4a. 6-Seat Horseshoe Table (Seat 3 = Triệu Thiên Hành targeted)
            var tableGo = new GameObject("ArenaTableRoot", typeof(RectTransform), typeof(ArenaTableController));
            tableGo.transform.SetParent(stageGo.transform, false);
            StretchFull(tableGo.GetComponent<RectTransform>());
            var tableCtrl = tableGo.GetComponent<ArenaTableController>();
            tableCtrl.InitializeArena(catalog, serifFont, sansFont, monoFont);
            tableCtrl.PopulateDemoPreview(totalSeats: 6, targetedSeatIndex: 3);

            // 4b. Floating Header, 2 Cast-Bronze Seals, Center Draw/Discard, Pinned Primary CTA + Fuse Timer
            var hudGo = new GameObject("ArenaHudRoot", typeof(RectTransform), typeof(ArenaHudController));
            hudGo.transform.SetParent(stageGo.transform, false);
            StretchFull(hudGo.GetComponent<RectTransform>());
            var hudCtrl = hudGo.GetComponent<ArenaHudController>();
            hudCtrl.InitializeHud(catalog, serifFont, sansFont, monoFont);
            hudCtrl.PopulateDemoPreview();

            // 4c. Curved Arc-Fan Card Hand (Hovered index 2 = Trảm 7♠ at 1.7x + neighbor parting)
            var fanGo = new GameObject("ArcFanHandRoot", typeof(RectTransform), typeof(ArcFanHandLayout));
            fanGo.transform.SetParent(stageGo.transform, false);
            var fanRect = fanGo.GetComponent<RectTransform>();
            fanRect.anchorMin = new Vector2(0.5f, 0f);
            fanRect.anchorMax = new Vector2(0.5f, 0f);
            fanRect.pivot = new Vector2(0.5f, 0.5f);
            fanRect.anchoredPosition = new Vector2(-18f, 192f);
            fanRect.sizeDelta = new Vector2(1160f, 320f);
            var fanLayout = fanGo.GetComponent<ArcFanHandLayout>();
            fanLayout.InitializeFan(catalog, serifFont, sansFont, monoFont);
            fanLayout.SetSharedBurnMaterial(burnMat);
            fanLayout.PopulateDemoHand(hoveredIndex: 2);

            // 4d. Bézier Silk Targeting Ribbon from Hovered Card (Trảm 7♠) to Targeted Seat (Triệu Thiên Hành)
            var arrowGo = new GameObject("SilkTargetArrowRoot", typeof(RectTransform), typeof(SilkTargetArrow));
            arrowGo.transform.SetParent(stageGo.transform, false);
            StretchFull(arrowGo.GetComponent<RectTransform>());
            var silkArrow = arrowGo.GetComponent<SilkTargetArrow>();
            silkArrow.InitializeArrow(catalog, silkMat);

            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate(canvasRect);

            CardView25D hoveredCard = fanLayout.GetCardView(2);
            SeatPlaqueView targetedSeat = tableCtrl.GetSeatView(3);
            if (hoveredCard != null && targetedSeat != null)
            {
                var cardRt = hoveredCard.GetComponent<RectTransform>();
                Vector2 startLocal = WorldToLocalInContainer(cardRt.TransformPoint(new Vector3(0f, 114f, 0f)), stageRect);
                Vector2 endLocal = WorldToLocalInContainer(targetedSeat.GetTargetAnchorWorldPos(), stageRect) + new Vector2(0f, -24f);
                silkArrow.ShowBezier(startLocal, endLocal, isValidTarget: true);
            }

            // 4e. Silk Scroll Tooltip (Right side above CTA, safe padding from wooden rollers)
            var tooltipGo = new GameObject("SilkScrollTooltipRoot", typeof(RectTransform), typeof(SilkScrollTooltipView));
            tooltipGo.transform.SetParent(stageGo.transform, false);
            var tooltipView = tooltipGo.GetComponent<SilkScrollTooltipView>();
            tooltipView.InitializeTooltip(catalog, serifFont, sansFont);
            tooltipView.ShowTooltip(
                "TRẢM (SÁT) · CHIÊU CÔNG KÍCH",
                "Cơ bản · 7 Bích · Tầm vũ khí 3",
                "Trong pha Xuất Chiêu, phóng kiếm khí vào 1 hiệp khách trong tầm vũ khí. Mục tiêu cần xuất Thiểm hóa giải nếu không sẽ mất 1 Thể lực.",
                new Vector2(494f, -140f),
                stageRect);

            // 4f. Game Feel 4-Phase Controller + Screen Tint + Procedural VFX Burst Overlay
            var tintGo = new GameObject("FeelScreenTint", typeof(RectTransform), typeof(Image));
            tintGo.transform.SetParent(stageGo.transform, false);
            StretchFull(tintGo.GetComponent<RectTransform>());
            var tintImg = tintGo.GetComponent<Image>();
            tintImg.color = new Color(1f, 0.9f, 0.7f, 0f);
            tintImg.raycastTarget = false;

            var vfxGo = new GameObject("VfxBurstOverlayRoot", typeof(RectTransform), typeof(VfxBurstOverlay));
            vfxGo.transform.SetParent(stageGo.transform, false);
            StretchFull(vfxGo.GetComponent<RectTransform>());
            var vfxOverlay = vfxGo.GetComponent<VfxBurstOverlay>();
            vfxOverlay.InitializeOverlay(serifFont, monoFont);

            var feelCtrl = sessionRoot.AddComponent<ArenaFeelController>();
            feelCtrl.SetShakeTarget(stageRect);
            feelCtrl.SetScreenTintGraphic(tintImg);

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, SceneOutPath);
            AssetDatabase.SaveAssets();

            // 5. Capture LIVE GPU renders at both 1920x1080 and 1280x720
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u3_unity6_arena_1080p.png", 1920, 1080);
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u3_unity6_arena_720p.png", 1280, 720);

            Debug.Log("[CuuChauU3ArenaAssembler] Hoàn tất lắp ráp U3_LiveArena.unity, biên dịch 2 shader & chụp render 1080p + 720p!");
        }

        private static void SyncCatalogAliases(VisualCatalogSO catalog)
        {
            HeroPortraitEntry? zhao = catalog.FindHero("zhao_yun");
            if (zhao.HasValue && !catalog.FindHero("trieu_thien_hanh").HasValue)
            {
                catalog.heroPortraits.Add(new HeroPortraitEntry
                {
                    heroId = "trieu_thien_hanh",
                    displayNameVi = "Triệu Thiên Hành",
                    backgroundLayer = zhao.Value.backgroundLayer,
                    foregroundLayer = zhao.Value.foregroundLayer,
                    fullComposite = zhao.Value.fullComposite,
                });
                EditorUtility.SetDirty(catalog);
            }
        }

        private static Material CreateOrUpdateMaterial(string assetPath, string shaderName, Action<Material> configure)
        {
            Shader shader = Shader.Find(shaderName);
            if (shader == null)
            {
                throw new InvalidOperationException($"Shader '{shaderName}' không tìm thấy hoặc lỗi biên dịch trên Unity 6.3.");
            }

            Material mat = AssetDatabase.LoadAssetAtPath<Material>(assetPath);
            if (mat == null)
            {
                mat = new Material(shader);
                AssetDatabase.CreateAsset(mat, assetPath);
            }
            else if (mat.shader != shader)
            {
                mat.shader = shader;
            }

            configure?.Invoke(mat);
            EditorUtility.SetDirty(mat);
            return mat;
        }

        private static TMP_FontAsset LoadFontOrThrow(string assetPath)
        {
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);
            if (font == null)
            {
                throw new InvalidOperationException($"Không tìm thấy font TMP {assetPath}.");
            }
            font.TryAddCharacters("…·—+-", out _);
            EditorUtility.SetDirty(font);
            return font;
        }

        private static void EnsureEventSystem()
        {
            if (UnityEngine.Object.FindAnyObjectByType<EventSystem>() != null) return;
            var esGo = new GameObject("EventSystem", typeof(EventSystem), typeof(InputSystemUIInputModule));
            esGo.transform.position = Vector3.zero;
        }

        private static void StretchFull(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = Vector2.zero;
            rt.sizeDelta = Vector2.zero;
        }

        private static Vector2 WorldToLocalInContainer(Vector3 worldPos, RectTransform container)
        {
            Vector3 local = container.InverseTransformPoint(worldPos);
            return new Vector2(local.x, local.y);
        }

        private static void EnsureDirectory(string path)
        {
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);
        }
    }
}
#endif
