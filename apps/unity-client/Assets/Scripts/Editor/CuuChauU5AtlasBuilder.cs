#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using CuuChau.Arena;
using CuuChau.Cards;
using CuuChau.Data;
using CuuChau.Lobby;
using CuuChau.Match;
using CuuChau.Modals;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.U2D;
using UnityEditor.U2D.Sprites;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Editor
{
    /// <summary>
    /// Chặng U5: Nhập đủ 64 tác phẩm nghệ thuật (25 tướng x 3 lớp, 36 lá bài, 3 phông nền),
    /// kiểm tra không có sprite null, đóng gói 3 SpriteAtlasV2 (Heroes, Cards, UI),
    /// lưu U4_FullGame_App.unity sạch và kết xuất 3 ảnh chụp kiểm chứng 1080p (bao gồm bàn 8 ghế).
    /// </summary>
    public static class CuuChauU5AtlasBuilder
    {
        private const string CatalogAssetPath = "Assets/Data/VisualCatalog.asset";
        private const string AppScenePath = "Assets/Scenes/U4_FullGame_App.unity";
        private const string AtlasesDir = "Assets/Art/Atlases";

        private static readonly string[] NineSlice64Targets =
        {
            "Assets/Art/UI/card_frame_9slice.png",
            "Assets/Art/UI/seat_frame_9slice.png",
            "Assets/Art/UI/silk_scroll_tooltip_9slice.png",
        };

        private static readonly string[] NineSlice32Targets =
        {
            "Assets/Art/UI/action_button_primary_9slice.png",
        };

        [MenuItem("CuuChau/Build U5 64-Art & SpriteAtlas Pack")]
        public static void ImportPackAndVerify()
        {
            EnsureDirectories();
            CopyU5ProductionArt();
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            ConfigureAllSpritesAndNineSlice();

            // Dựng sạch Scene khởi động U4_FullGame_App.unity trước (vì Assembler này gọi BuildOrUpdateVisualCatalog cơ bản)
            CuuChauU4AppAssembler.BuildAndCapture();

            // Sau đó ghi đè VisualCatalog.asset với đầy đủ 25 tướng + 36 lá bài + 3 phông nền và khóa AssetDatabase
            VisualCatalogSO catalog = PopulateAndValidateFullCatalog();
            AssetDatabase.SaveAssets();

            // Bật SpriteAtlasV2, tạo 3 atlas và đóng gói cho Windows x64
            BuildAndPackSpriteAtlases();
            AssetDatabase.SaveAssets();

            // Kết xuất 3 ảnh kiểm chứng 1080p với đầy đủ 64 art + sửa huy hiệu Minh Chủ
            CaptureU5Showcases(catalog);

            // Mở lại Scene khởi động sạch trên đĩa
            EditorSceneManager.OpenScene(AppScenePath, OpenSceneMode.Single);
            Debug.Log("[CuuChauU5AtlasBuilder] Hoàn tất nhập 64 art, kiểm tra 0 sprite null, đóng gói 3 SpriteAtlasV2 và chụp 3 ảnh U5 1080p!");
        }

        private static void EnsureDirectories()
        {
            string[] dirs =
            {
                "Assets/Art/UI",
                "Assets/Art/Heroes",
                "Assets/Art/Cards",
                AtlasesDir,
                "Assets/Data",
                "Assets/Scenes",
                "Screenshots",
            };

            foreach (string dir in dirs)
            {
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            }
        }

        private static void CopyU5ProductionArt()
        {
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            string u5Root = Path.Combine(repoRoot, "art-studio", "u5-production");
            if (!Directory.Exists(u5Root))
            {
                Debug.LogWarning($"[CuuChauU5AtlasBuilder] Không thấy thư mục {u5Root}; dùng tài nguyên hiện có trong Assets/Art.");
                return;
            }

            CopyAllPngs(Path.Combine(u5Root, "heroes"), "Assets/Art/Heroes");
            CopyAllPngs(Path.Combine(u5Root, "cards"), "Assets/Art/Cards");

            string backdropsDir = Path.Combine(u5Root, "backdrops");
            CopyFileIfExists(Path.Combine(backdropsDir, "lobby_hall_backdrop.png"), "Assets/Art/UI/lobby_hall_backdrop.png");
            CopyFileIfExists(Path.Combine(backdropsDir, "table_board_25d.png"), "Assets/Art/UI/table_board_25d.png");
            CopyFileIfExists(Path.Combine(backdropsDir, "card_back_cuu_chau.png"), "Assets/Art/Cards/card_back_cuu_chau.png");
        }

        private static void CopyAllPngs(string srcDir, string destDir)
        {
            if (!Directory.Exists(srcDir)) return;
            foreach (string src in Directory.GetFiles(srcDir, "*.png"))
            {
                string fileName = Path.GetFileName(src);
                File.Copy(src, Path.Combine(destDir, fileName), overwrite: true);
            }
        }

        private static void CopyFileIfExists(string srcPath, string destPath)
        {
            if (File.Exists(srcPath))
            {
                File.Copy(srcPath, destPath, overwrite: true);
            }
        }

        private static void ConfigureAllSpritesAndNineSlice()
        {
            ConfigureFolderSprites("Assets/Art/UI", 2048);
            ConfigureFolderSprites("Assets/Art/Heroes", 1024);
            ConfigureFolderSprites("Assets/Art/Cards", 1024);

            foreach (string path in NineSlice64Targets) ApplyNineSliceBorder(path, 64f);
            foreach (string path in NineSlice32Targets) ApplyNineSliceBorder(path, 32f);
        }

        private static void ConfigureFolderSprites(string folder, int maxTextureSize)
        {
            if (!Directory.Exists(folder)) return;
            foreach (string file in Directory.GetFiles(folder, "*.png"))
            {
                string assetPath = file.Replace('\\', '/');
                var importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
                if (importer == null) continue;

                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.mipmapEnabled = false;
                importer.filterMode = FilterMode.Bilinear;
                importer.alphaIsTransparency = true;
                importer.npotScale = TextureImporterNPOTScale.None;
                importer.maxTextureSize = maxTextureSize;
                importer.SaveAndReimport();
            }
        }

        private static void ApplyNineSliceBorder(string assetPath, float borderPx)
        {
            var importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
            if (importer == null) return;

            var border = new Vector4(borderPx, borderPx, borderPx, borderPx);
            importer.spriteBorder = border;

            var factory = new SpriteDataProviderFactories();
            factory.Init();
            ISpriteEditorDataProvider dataProvider = factory.GetSpriteEditorDataProviderFromObject(importer);
            if (dataProvider != null)
            {
                dataProvider.InitSpriteEditorDataProvider();
                SpriteRect[] rects = dataProvider.GetSpriteRects();
                if (rects != null && rects.Length > 0)
                {
                    rects[0].alignment = SpriteAlignment.Center;
                    rects[0].pivot = new Vector2(0.5f, 0.5f);
                    rects[0].border = border;
                    dataProvider.SetSpriteRects(rects);
                    dataProvider.Apply();
                }
            }

            importer.SaveAndReimport();
        }

        private static VisualCatalogSO PopulateAndValidateFullCatalog()
        {
            VisualCatalogSO catalog = CuuChauU1SliceBuilder.BuildOrUpdateVisualCatalog();
            if (catalog == null)
            {
                throw new InvalidOperationException($"Không nạp được {CatalogAssetPath}.");
            }

            var missingAssets = new List<string>();

            catalog.lobbyHallBackdrop = LoadRequiredSprite("Assets/Art/UI/lobby_hall_backdrop.png", missingAssets);
            catalog.tableBoard25D = LoadRequiredSprite("Assets/Art/UI/table_board_25d.png", missingAssets);
            catalog.cardBackCuuChau = LoadRequiredSprite("Assets/Art/Cards/card_back_cuu_chau.png", missingAssets);

            IReadOnlyList<HeroLoreInfo> heroes = CuuChauLoreLookup.GetAllHeroes();
            catalog.heroPortraits = new List<HeroPortraitEntry>(heroes.Count);
            for (int i = 0; i < heroes.Count; i++)
            {
                HeroLoreInfo hero = heroes[i];
                Sprite bg = LoadRequiredSprite($"Assets/Art/Heroes/hero_{hero.HeroId}_bg.png", missingAssets);
                Sprite fg = LoadRequiredSprite($"Assets/Art/Heroes/hero_{hero.HeroId}_fg.png", missingAssets);
                Sprite full = LoadRequiredSprite($"Assets/Art/Heroes/hero_{hero.HeroId}_full.png", missingAssets);

                catalog.heroPortraits.Add(new HeroPortraitEntry
                {
                    heroId = hero.HeroId,
                    legacyId = hero.LegacyId,
                    displayNameVi = hero.NameVi,
                    backgroundLayer = bg,
                    foregroundLayer = fg,
                    fullComposite = full,
                });
            }

            IReadOnlyList<CardLoreInfo> cards = CuuChauLoreLookup.GetAllCards();
            catalog.cardArts = new List<CardArtEntry>(cards.Count);
            for (int i = 0; i < cards.Count; i++)
            {
                CardLoreInfo card = cards[i];
                Sprite art = LoadRequiredSprite($"Assets/Art/Cards/card_{card.CardKey}.png", missingAssets);
                catalog.cardArts.Add(new CardArtEntry
                {
                    cardKey = card.CardKey,
                    displayNameVi = card.NameVi,
                    artSprite = art,
                });
            }

            if (catalog.heroPortraits.Count != 25 || catalog.cardArts.Count != 36 || missingAssets.Count > 0)
            {
                string summary = string.Join("\n - ", missingAssets);
                throw new InvalidOperationException(
                    $"VisualCatalog U5 chưa đủ tài nguyên (heroes={catalog.heroPortraits.Count}/25, cards={catalog.cardArts.Count}/36, missing={missingAssets.Count}):\n - {summary}");
            }

            EditorUtility.SetDirty(catalog);
            return catalog;
        }

        private static Sprite LoadRequiredSprite(string assetPath, List<string> missingAssets)
        {
            Sprite sprite = AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
            if (sprite == null)
            {
                missingAssets.Add(assetPath);
            }
            return sprite;
        }

        private static void BuildAndPackSpriteAtlases()
        {
            EditorSettings.spritePackerMode = SpritePackerMode.SpriteAtlasV2;

            CreateOrUpdateAtlas($"{AtlasesDir}/CuuChau_Heroes_Atlas.spriteatlasv2", "Assets/Art/Heroes");
            CreateOrUpdateAtlas($"{AtlasesDir}/CuuChau_Cards_Atlas.spriteatlasv2", "Assets/Art/Cards");
            CreateOrUpdateAtlas($"{AtlasesDir}/CuuChau_UI_Atlas.spriteatlasv2", "Assets/Art/UI");

            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            try
            {
                SpriteAtlasUtility.PackAllAtlases(BuildTarget.StandaloneWindows64, false);
            }
            finally
            {
                SpriteAtlasUtility.CleanupAtlasPacking();
            }
        }

        private static void CreateOrUpdateAtlas(string atlasAssetPath, string folderAssetPath)
        {
            UnityEngine.Object folderAsset = AssetDatabase.LoadAssetAtPath<DefaultAsset>(folderAssetPath);
            if (folderAsset == null)
            {
                throw new InvalidOperationException($"Không tìm thấy thư mục SpriteAtlas packable: {folderAssetPath}");
            }

            var atlas = new SpriteAtlasAsset();
            atlas.SetIsVariant(false);
            atlas.Add(new[] { folderAsset });

            SpriteAtlasAsset.Save(atlas, atlasAssetPath);
            AssetDatabase.ImportAsset(atlasAssetPath, ImportAssetOptions.ForceSynchronousImport);

            var importer = AssetImporter.GetAtPath(atlasAssetPath) as SpriteAtlasImporter;
            if (importer == null)
            {
                throw new InvalidOperationException($"Không tìm thấy SpriteAtlasImporter cho {atlasAssetPath}");
            }

            importer.includeInBuild = true;

            SpriteAtlasPackingSettings packing = importer.packingSettings;
            packing.padding = 4;
            packing.enableRotation = false;
            packing.enableTightPacking = false;
            importer.packingSettings = packing;

            SpriteAtlasTextureSettings texSettings = importer.textureSettings;
            texSettings.generateMipMaps = false;
            texSettings.filterMode = FilterMode.Bilinear;
            texSettings.sRGB = true;
            importer.textureSettings = texSettings;

            TextureImporterPlatformSettings platformSettings = importer.GetPlatformSettings("DefaultTexturePlatform");
            platformSettings.maxTextureSize = 4096;
            importer.SetPlatformSettings(platformSettings);

            importer.SaveAndReimport();
        }

        private static void CaptureU5Showcases(VisualCatalogSO catalog)
        {
            EditorSceneManager.OpenScene(AppScenePath, OpenSceneMode.Single);

            var director = UnityEngine.Object.FindAnyObjectByType<CuuChauMatchDirector>();
            var table = UnityEngine.Object.FindAnyObjectByType<ArenaTableController>();
            var hud = UnityEngine.Object.FindAnyObjectByType<ArenaHudController>();
            var fan = UnityEngine.Object.FindAnyObjectByType<ArcFanHandLayout>();
            var lobby = UnityEngine.Object.FindAnyObjectByType<LobbyHallView>();
            var waiting = UnityEngine.Object.FindAnyObjectByType<WaitingRoomView>();
            var draft = UnityEngine.Object.FindAnyObjectByType<HeroDraftModalView>();
            var referee = UnityEngine.Object.FindAnyObjectByType<RefereeModalView>();
            var handbook = UnityEngine.Object.FindAnyObjectByType<HandbookModalView>();
            var summary = UnityEngine.Object.FindAnyObjectByType<MatchSummaryModalView>();
            var canvas = UnityEngine.Object.FindAnyObjectByType<Canvas>();

            if (director == null || table == null || hud == null || fan == null || lobby == null || draft == null)
            {
                throw new InvalidOperationException("Thiếu thành phần UI cốt lõi trong U4_FullGame_App.unity để chụp ảnh U5.");
            }

            director.BuildViewsFromSerializedAssets();

            if (waiting != null) waiting.SetVisible(false);
            if (referee != null) referee.SetVisible(false);
            if (handbook != null) handbook.SetVisible(false);
            if (summary != null) summary.SetVisible(false);

            // 1. Sảnh Đại Điện U5 với lobby_hall_backdrop.png (ẩn hẳn HUD/bàn nền để không rò chữ mờ qua nền 0.96 alpha)
            SetShowcaseCanvasGroup(table.gameObject, 0f, false);
            SetShowcaseCanvasGroup(hud.gameObject, 0f, false);
            SetShowcaseCanvasGroup(fan.gameObject, 0f, false);
            lobby.SetVisible(true);
            lobby.SetServerStatus(true, "Máy chủ 112 lá sẵn sàng · 25 Hiệp khách · 3 SpriteAtlasV2", canRetry: false);
            lobby.PopulateDemoPreview();
            draft.SetVisible(false);
            RebuildCanvas(canvas);
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u5_lobby_1080p.png", 1920, 1080);

            // 2. Chọn Tướng 3-chọn-1 trên nền bàn đấu làm mờ đúng chuẩn SetArenaDimmedForOverlay(true)
            lobby.SetVisible(false);
            SetShowcaseCanvasGroup(table.gameObject, 0.20f, false);
            SetShowcaseCanvasGroup(hud.gameObject, 0.20f, false);
            SetShowcaseCanvasGroup(fan.gameObject, 0f, false);
            table.PopulateDemoPreview(totalSeats: 6, targetedSeatIndex: 3);
            hud.PopulateDemoPreview();
            draft.SetVisible(true);
            draft.SetReducedMotion(true);
            draft.PopulateDemoPreview();
            RebuildCanvas(canvas);
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u5_hero_draft_1080p.png", 1920, 1080);

            // 3. Bàn đấu 8 người hình móng ngựa sáng rõ khớp trận thật (khôi phục CanvasGroup alpha=1 cho bàn, HUD & quạt bài)
            draft.SetVisible(false);
            SetShowcaseCanvasGroup(table.gameObject, 1f, true);
            SetShowcaseCanvasGroup(hud.gameObject, 1f, true);
            SetShowcaseCanvasGroup(fan.gameObject, 1f, true);
            table.PopulateDemoPreview(totalSeats: 8, targetedSeatIndex: 3);
            hud.PopulateDemoPreview();
            fan.PopulateDemoHand(hoveredIndex: -1);
            RebuildCanvas(canvas);
            CuuChauU1SliceBuilder.CaptureCameraToPng("Screenshots/u5_arena_8p_showcase_1080p.png", 1920, 1080);

            Debug.Log($"[CuuChauU5AtlasBuilder] Đã chụp đủ 3 ảnh U5 1080p (catalog heroes={catalog.heroPortraits.Count}, cards={catalog.cardArts.Count}).");
        }

        private static void SetShowcaseCanvasGroup(GameObject target, float alpha, bool interactable)
        {
            if (target == null) return;
            var cg = target.GetComponent<CanvasGroup>();
            if (cg == null) cg = target.AddComponent<CanvasGroup>();
            cg.alpha = alpha;
            cg.interactable = interactable;
            cg.blocksRaycasts = interactable;
        }

        private static void RebuildCanvas(Canvas canvas)
        {
            Canvas.ForceUpdateCanvases();
            if (canvas != null)
            {
                var rt = canvas.GetComponent<RectTransform>();
                if (rt != null) LayoutRebuilder.ForceRebuildLayoutImmediate(rt);
            }
        }
    }
}
#endif
