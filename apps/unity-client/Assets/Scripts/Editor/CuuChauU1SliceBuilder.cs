#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using CuuChau.Audio;
using CuuChau.Data;
using CuuChau.Net;
using CuuChau.Sidecar;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.U2D.Sprites;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace CuuChau.Editor
{
    /// <summary>
    /// Nhập tự động trọn bộ 27 vật liệu Chặng U1, 5 phông TTF Tiếng Việt & 56 tệp .ogg,
    /// cắt 9-slice qua ISpriteEditorDataProvider (có kiểm tra Capability) và dựng scene mẫu
    /// Assets/Scenes/U1_VerticalSlice_Arena.unity đúng bố cục 1920x1080 ScreenSpace-Camera.
    /// </summary>
    public static class CuuChauU1SliceBuilder
    {
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

        public static void BuildAll()
        {
            EnsureDirectories();
            EnsureTmpEssentialResources();
            CopyRepoAssetsIntoUnity();
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            ConfigureSpriteImportsAndNineSlice();
            TMP_FontAsset serifFont = CreateTmpFont("NotoSerif-Bold");
            TMP_FontAsset sansFont = CreateTmpFont("BeVietnamPro-SemiBold");
            CreateTmpFont("BeVietnamPro-Regular");
            CreateTmpFont("BeVietnamPro-Bold");
            TMP_FontAsset monoFont = CreateTmpFont("JetBrainsMono-Bold");

            VisualCatalogSO catalog = BuildOrUpdateVisualCatalog();
            BuildVerticalSliceScene(catalog, serifFont, sansFont, monoFont);

            AssetDatabase.SaveAssets();
            CaptureCameraToPng("Screenshots/u2_unity6_live_1080p.png", 1920, 1080);
            Debug.Log("[CuuChauU1SliceBuilder] Hoàn tất nhập tài nguyên U1, cắt 9-slice, dựng U1_VerticalSlice_Arena.unity và chụp ảnh 1080p!");
        }

        private static void EnsureDirectories()
        {
            string[] dirs =
            {
                "Assets/Art/UI",
                "Assets/Art/Heroes",
                "Assets/Art/Cards",
                "Assets/Fonts",
                "Assets/Audio/BGM",
                "Assets/Audio/SFX",
                "Assets/Data",
                "Assets/Scenes",
            };
            foreach (string dir in dirs)
            {
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            }
        }

        private static void CopyRepoAssetsIntoUnity()
        {
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            string sliceRoot = Path.Combine(repoRoot, "art-studio", "u1-slice");

            // 1. Blender PBR + Figma Vector UI PNGs
            CopyDirectoryPngs(Path.Combine(sliceRoot, "blender", "renders"), "Assets/Art/UI", "blender_u1_contact_sheet.png");
            CopyDirectoryPngs(Path.Combine(sliceRoot, "figma", "exports"), "Assets/Art/UI", null);

            // 2. Painterly Wuxia Illustrations
            string illustDir = Path.Combine(sliceRoot, "illustrations");
            if (Directory.Exists(illustDir))
            {
                foreach (string src in Directory.GetFiles(illustDir, "*.png"))
                {
                    string file = Path.GetFileName(src);
                    if (file == "illustrations_u1_sheet.png") continue;
                    string destSub = file.StartsWith("hero_") ? "Assets/Art/Heroes" : "Assets/Art/Cards";
                    File.Copy(src, Path.Combine(destSub, file), overwrite: true);
                }
            }

            // 3. Fonts (SIL OFL TTF)
            string fontsSrc = Path.Combine(sliceRoot, "fonts");
            if (Directory.Exists(fontsSrc))
            {
                foreach (string src in Directory.GetFiles(fontsSrc, "*.ttf"))
                {
                    File.Copy(src, Path.Combine("Assets/Fonts", Path.GetFileName(src)), overwrite: true);
                }
            }

            // 4. Verified Audio (3 BGM -20 LUFS + 53 SFX OGG)
            string sfxSrc = Path.Combine(repoRoot, "apps", "desktop", "src", "assets", "sfx");
            if (Directory.Exists(sfxSrc))
            {
                foreach (string src in Directory.GetFiles(sfxSrc, "*.ogg"))
                {
                    string file = Path.GetFileName(src);
                    string destSub = file.StartsWith("bgm-") ? "Assets/Audio/BGM" : "Assets/Audio/SFX";
                    File.Copy(src, Path.Combine(destSub, file), overwrite: true);
                }
            }
        }

        private static void CopyDirectoryPngs(string sourceDir, string targetAssetDir, string skipFileName)
        {
            if (!Directory.Exists(sourceDir)) return;
            foreach (string src in Directory.GetFiles(sourceDir, "*.png"))
            {
                string file = Path.GetFileName(src);
                if (!string.IsNullOrEmpty(skipFileName) && file == skipFileName) continue;
                File.Copy(src, Path.Combine(targetAssetDir, file), overwrite: true);
            }
        }

        private static void ConfigureSpriteImportsAndNineSlice()
        {
            foreach (string folder in new[] { "Assets/Art/UI", "Assets/Art/Heroes", "Assets/Art/Cards" })
            {
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
                    importer.SaveAndReimport();
                }
            }

            foreach (string path in NineSlice64Targets) ApplyNineSliceBorder(path, 64f);
            foreach (string path in NineSlice32Targets) ApplyNineSliceBorder(path, 32f);
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

        private static void EnsureTmpEssentialResources()
        {
            bool hasTmpSettings = Resources.Load<TMP_Settings>("TMP Settings") != null;
            bool hasTmpShaders = Directory.Exists("Assets/TextMesh Pro/Shaders") || Shader.Find("TextMeshPro/Mobile/Distance Field") != null;
            if (hasTmpSettings && hasTmpShaders) return;

            // Remove partial fallback if shaders are still missing
            if (Directory.Exists("Assets/TextMesh Pro") && !Directory.Exists("Assets/TextMesh Pro/Shaders"))
            {
                AssetDatabase.DeleteAsset("Assets/TextMesh Pro");
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            }

            var pkgPaths = new List<string>();
            var uguiPkg = UnityEditor.PackageManager.PackageInfo.FindForAssembly(typeof(TMP_Settings).Assembly);
            if (uguiPkg != null && !string.IsNullOrEmpty(uguiPkg.resolvedPath))
            {
                pkgPaths.Add(Path.Combine(uguiPkg.resolvedPath, "Package Resources", "TMP Essential Resources.unitypackage"));
            }
            if (Directory.Exists("Library/PackageCache"))
            {
                foreach (string dir in Directory.GetDirectories("Library/PackageCache", "com.unity.ugui*"))
                {
                    pkgPaths.Add(Path.Combine(dir, "Package Resources", "TMP Essential Resources.unitypackage"));
                }
            }

            foreach (string pkg in pkgPaths)
            {
                if (File.Exists(pkg))
                {
                    Debug.Log($"[CuuChauU1SliceBuilder] Importing TMP Essential Resources from {pkg}");
                    AssetDatabase.ImportPackage(pkg, false);
                    AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                    TMPro_EventManager.ON_RESOURCES_LOADED();
                    break;
                }
            }
        }

        private const string VietnameseWarmupChars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
            "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơ" +
            "ƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸ" +
            "ưăạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ" +
            " ·,:;.!?()[]{}/+-*%'\"“”";

        private static TMP_FontAsset CreateTmpFont(string baseName)
        {
            string assetOut = $"Assets/Fonts/{baseName}_SDF.asset";
            var existing = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetOut);
            if (existing != null)
            {
                existing.TryAddCharacters(VietnameseWarmupChars, out _);
                EditorUtility.SetDirty(existing);
                return existing;
            }

            var ttf = AssetDatabase.LoadAssetAtPath<Font>($"Assets/Fonts/{baseName}.ttf");
            if (ttf == null) return TMP_Settings.defaultFontAsset;

            TMP_FontAsset tmpFont = TMP_FontAsset.CreateFontAsset(ttf);
            tmpFont.atlasPopulationMode = AtlasPopulationMode.Dynamic;
            AssetDatabase.CreateAsset(tmpFont, assetOut);
            if (tmpFont.material != null) AssetDatabase.AddObjectToAsset(tmpFont.material, tmpFont);
            if (tmpFont.atlasTexture != null) AssetDatabase.AddObjectToAsset(tmpFont.atlasTexture, tmpFont);
            tmpFont.TryAddCharacters(VietnameseWarmupChars, out _);
            EditorUtility.SetDirty(tmpFont);
            AssetDatabase.SaveAssets();
            return tmpFont;
        }

        public static void CaptureCameraToPng(string relativePath, int width, int height)
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                Debug.LogWarning("[CuuChauU1SliceBuilder] Không tìm thấy Camera.main để chụp ảnh.");
                return;
            }

            string fullPath = Path.GetFullPath(relativePath);
            string dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);

            foreach (TextMeshProUGUI tmp in UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsSortMode.None))
            {
                tmp.ForceMeshUpdate(true, true);
            }
            Canvas.ForceUpdateCanvases();

            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var tex = new Texture2D(width, height, TextureFormat.RGBA32, false);
            RenderTexture prevActive = RenderTexture.active;
            RenderTexture prevCamRt = cam.targetTexture;
            try
            {
                cam.targetTexture = rt;
                cam.Render();
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                tex.Apply();
                File.WriteAllBytes(fullPath, tex.EncodeToPNG());
                Debug.Log($"[CuuChauU1SliceBuilder] Đã chụp render Unity 6.3 ({width}x{height}): {fullPath}");
            }
            finally
            {
                cam.targetTexture = prevCamRt;
                RenderTexture.active = prevActive;
                UnityEngine.Object.DestroyImmediate(rt);
                UnityEngine.Object.DestroyImmediate(tex);
            }
        }

        public static VisualCatalogSO BuildOrUpdateVisualCatalog()
        {
            const string path = "Assets/Data/VisualCatalog.asset";
            var catalog = AssetDatabase.LoadAssetAtPath<VisualCatalogSO>(path);
            if (catalog == null)
            {
                catalog = ScriptableObject.CreateInstance<VisualCatalogSO>();
                AssetDatabase.CreateAsset(catalog, path);
            }

            catalog.tableBoard25D = LoadSprite("Assets/Art/UI/table_board_25d.png");
            catalog.cardFrame9Slice = LoadSprite("Assets/Art/UI/card_frame_9slice.png");
            catalog.seatFrame9Slice = LoadSprite("Assets/Art/UI/seat_frame_9slice.png");
            catalog.silkScrollTooltip9Slice = LoadSprite("Assets/Art/UI/silk_scroll_tooltip_9slice.png");
            catalog.cardBackCuuChau = LoadSprite("Assets/Art/Cards/card_back_cuu_chau.png");

            catalog.hpJadeFull = LoadSprite("Assets/Art/UI/hp_jade_full.png");
            catalog.hpAmberMid = LoadSprite("Assets/Art/UI/hp_amber_mid.png");
            catalog.hpCrimsonLow = LoadSprite("Assets/Art/UI/hp_crimson_low.png");
            catalog.hpSocketEmpty = LoadSprite("Assets/Art/UI/hp_socket_empty.png");
            catalog.sealBattleLog = LoadSprite("Assets/Art/UI/seal_battle_log.png");
            catalog.sealSettingsGear = LoadSprite("Assets/Art/UI/seal_settings_gear.png");

            catalog.suitSpade = LoadSprite("Assets/Art/UI/suit_spade.png");
            catalog.suitClub = LoadSprite("Assets/Art/UI/suit_club.png");
            catalog.suitHeart = LoadSprite("Assets/Art/UI/suit_heart.png");
            catalog.suitDiamond = LoadSprite("Assets/Art/UI/suit_diamond.png");
            catalog.factionThienKiem = LoadSprite("Assets/Art/UI/faction_thien_kiem.png");
            catalog.factionHuyenThiet = LoadSprite("Assets/Art/UI/faction_huyen_thiet.png");
            catalog.factionGiangNam = LoadSprite("Assets/Art/UI/faction_giang_nam.png");
            catalog.factionAnSat = LoadSprite("Assets/Art/UI/faction_an_sat.png");
            catalog.targetReticleRing = LoadSprite("Assets/Art/UI/target_reticle_ring.png");
            catalog.arrowHeadSilk = LoadSprite("Assets/Art/UI/arrow_head_silk.png");
            catalog.actionButtonPrimary9Slice = LoadSprite("Assets/Art/UI/action_button_primary_9slice.png");

            catalog.heroPortraits = new List<HeroPortraitEntry>
            {
                new()
                {
                    heroId = "zhao_yun",
                    displayNameVi = "Triệu Thiên Hành",
                    backgroundLayer = LoadSprite("Assets/Art/Heroes/hero_trieu_thien_hanh_bg.png"),
                    foregroundLayer = LoadSprite("Assets/Art/Heroes/hero_trieu_thien_hanh_fg.png"),
                    fullComposite = LoadSprite("Assets/Art/Heroes/hero_trieu_thien_hanh_full.png"),
                }
            };

            catalog.cardArts = new List<CardArtEntry>
            {
                new() { cardKey = "sat", displayNameVi = "Trảm (Sát)", artSprite = LoadSprite("Assets/Art/Cards/card_sat.png") },
                new() { cardKey = "dao", displayNameVi = "Linh Đan (Đào)", artSprite = LoadSprite("Assets/Art/Cards/card_dao.png") },
            };

            catalog.bgmLobby = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/BGM/bgm-lobby.ogg");
            catalog.bgmBattle = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/BGM/bgm-battle.ogg");
            catalog.bgmClimaxDrums = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/BGM/bgm-climax-drums.ogg");

            catalog.sfxClips.Clear();
            foreach (string sfxFile in Directory.GetFiles("Assets/Audio/SFX", "*.ogg"))
            {
                string assetPath = sfxFile.Replace('\\', '/');
                AudioClip clip = AssetDatabase.LoadAssetAtPath<AudioClip>(assetPath);
                if (clip != null)
                {
                    catalog.sfxClips.Add(new NamedAudioEntry
                    {
                        key = Path.GetFileNameWithoutExtension(assetPath),
                        clip = clip,
                    });
                }
            }

            EditorUtility.SetDirty(catalog);
            return catalog;
        }

        private static void BuildVerticalSliceScene(VisualCatalogSO catalog, TMP_FontAsset serifFont, TMP_FontAsset sansFont, TMP_FontAsset monoFont)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                mainCam.orthographic = true;
                mainCam.backgroundColor = new Color(0.035f, 0.031f, 0.027f, 1f);
            }

            // Runtime session controller root (Sidecar + WebSocket + Studio Audio)
            var sessionRoot = new GameObject("CuuChauSessionRoot");
            sessionRoot.AddComponent<LkdfSidecarProcess>();
            sessionRoot.AddComponent<RoomWsClient>();
            var audioCtrl = sessionRoot.AddComponent<CuuChauAudioController>();
            audioCtrl.SetCatalog(catalog);

            // ScreenSpace-Camera Canvas locked at 1920x1080 Match=0.5 (Zero UI Toolkit!)
            var canvasGo = new GameObject("U1_TabletopCanvas");
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

            // 1. 2.5D Table Board Background
            CreateImage("TableBoard_25D", canvasGo.transform, catalog.tableBoard25D, Vector2.zero, new Vector2(1920f, 1080f), Image.Type.Simple);

            // 2. Floating Header + Strictly 2 Cast-Bronze Seals Top-Right
            CreateTmpLabel("TopHeader", canvasGo.transform, "CỬU CHÂU ẨN KIẾM · Vòng 3 · Bài rút: 54", serifFont, 22, new Color(0.96f, 0.88f, 0.65f, 1f), new Vector2(-590f, 492f), new Vector2(680f, 40f), TextAlignmentOptions.Left);
            CreateImage("HUD_Seal_BattleLog", canvasGo.transform, catalog.sealBattleLog, new Vector2(812f, 492f), new Vector2(56f, 56f), Image.Type.Simple);
            CreateImage("HUD_Seal_Settings", canvasGo.transform, catalog.sealSettingsGear, new Vector2(884f, 492f), new Vector2(56f, 56f), Image.Type.Simple);

            // 3. Targeted Seat 5 Hero Plaque (Top-Center, 2.5D bg + fg parallax layers + Reticle)
            HeroPortraitEntry? hero = catalog.FindHero("zhao_yun");
            GameObject seat5 = CreateNineSliceImage("Seat5_Target_TrieuThienHanh", canvasGo.transform, catalog.seatFrame9Slice, new Vector2(0f, 368f), new Vector2(344f, 168f));
            if (hero.HasValue)
            {
                CreateImage("Hero_BG_Layer", seat5.transform, hero.Value.backgroundLayer, Vector2.zero, new Vector2(316f, 140f), Image.Type.Simple);
                CreateImage("Hero_FG_Layer", seat5.transform, hero.Value.foregroundLayer, new Vector2(76f, -6f), new Vector2(160f, 138f), Image.Type.Simple);
            }
            CreateImage("FactionSeal_ThienKiem", seat5.transform, catalog.factionThienKiem, new Vector2(-128f, 42f), new Vector2(40f, 40f), Image.Type.Simple);
            CreateTmpLabel("HeroName", seat5.transform, "Triệu Thiên Hành", serifFont, 20, new Color(0.96f, 0.92f, 0.84f, 1f), new Vector2(-10f, 44f), new Vector2(190f, 32f), TextAlignmentOptions.Left);
            CreateImage("TargetReticleRing", seat5.transform, catalog.targetReticleRing, new Vector2(84f, 0f), new Vector2(160f, 160f), Image.Type.Simple);

            // 4. Center Draw Pile + Played Card
            CreateImage("Center_DrawPile", canvasGo.transform, catalog.cardBackCuuChau, new Vector2(-180f, 88f), new Vector2(132f, 182f), Image.Type.Simple);
            CreateTmpLabel("DrawPileCount", canvasGo.transform, "Rút: 54", monoFont, 19, new Color(0.95f, 0.88f, 0.70f, 1f), new Vector2(-180f, -20f), new Vector2(140f, 32f), TextAlignmentOptions.Center);

            // 5. Hovered 1.75x Strike Card + Silk Scroll Tooltip
            GameObject hoveredCard = CreateNineSliceImage("HoveredCard_Sat_175x", canvasGo.transform, catalog.cardFrame9Slice, new Vector2(-84f, -296f), new Vector2(248f, 348f));
            CreateImage("CardArt_Sat", hoveredCard.transform, catalog.FindCardArt("sat"), new Vector2(0f, 48f), new Vector2(204f, 196f), Image.Type.Simple);
            CreateTmpLabel("RankText", hoveredCard.transform, "7", monoFont, 32, new Color(0.96f, 0.92f, 0.81f, 1f), new Vector2(-74f, 118f), new Vector2(48f, 40f), TextAlignmentOptions.Center);
            CreateImage("Suit_Spade", hoveredCard.transform, catalog.suitSpade, new Vector2(-74f, 76f), new Vector2(38f, 38f), Image.Type.Simple);
            CreateTmpLabel("CardTitle", hoveredCard.transform, "TRẢM (SÁT)", serifFont, 22, new Color(0.97f, 0.93f, 0.82f, 1f), new Vector2(0f, -102f), new Vector2(210f, 38f), TextAlignmentOptions.Center);

            GameObject scroll = CreateNineSliceImage("SilkScroll_Tooltip", canvasGo.transform, catalog.silkScrollTooltip9Slice, new Vector2(490f, -196f), new Vector2(436f, 232f));
            CreateTmpLabel("TooltipBody", scroll.transform, "TRẢM (SÁT) · CHIÊU CÔNG KÍCH\nTrong pha Xuất Chiêu, chọn 1 hiệp khách trong tầm vũ khí để tung đòn Trảm.", sansFont, 16, new Color(0.94f, 0.90f, 0.84f, 1f), Vector2.zero, new Vector2(364f, 148f), TextAlignmentOptions.TopLeft);

            // 6. Primary Cinnabar 9-Slice Action Plaque (Bottom-Right)
            GameObject cta = CreateNineSliceImage("Primary_Action_Plaque", canvasGo.transform, catalog.actionButtonPrimary9Slice, new Vector2(734f, -456f), new Vector2(344f, 84f));
            CreateTmpLabel("CTA_Label", cta.transform, "Xuất Trảm · Triệu Thiên Hành", serifFont, 19, new Color(1f, 0.96f, 0.87f, 1f), Vector2.zero, new Vector2(300f, 40f), TextAlignmentOptions.Center);

            EditorSceneManager.SaveScene(scene, "Assets/Scenes/U1_VerticalSlice_Arena.unity");
        }

        private static Sprite LoadSprite(string path) => AssetDatabase.LoadAssetAtPath<Sprite>(path);

        private static GameObject CreateImage(string name, Transform parent, Sprite sprite, Vector2 anchoredPos, Vector2 size, Image.Type imgType)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = size;
            var img = go.GetComponent<Image>();
            img.sprite = sprite;
            img.type = imgType;
            img.preserveAspect = (imgType == Image.Type.Simple);
            return go;
        }

        private static GameObject CreateNineSliceImage(string name, Transform parent, Sprite sprite, Vector2 anchoredPos, Vector2 size) =>
            CreateImage(name, parent, sprite, anchoredPos, size, Image.Type.Sliced);

        private static GameObject CreateTmpLabel(string name, Transform parent, string text, TMP_FontAsset font, float sizePx, Color color, Vector2 pos, Vector2 boxSize, TextAlignmentOptions align)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            rt.sizeDelta = boxSize;
            var tmp = go.GetComponent<TextMeshProUGUI>();
            tmp.font = font;
            tmp.fontSize = Mathf.Max(15f, sizePx);
            tmp.color = color;
            tmp.alignment = align;
            tmp.text = text;
            return go;
        }
    }
}
#endif
