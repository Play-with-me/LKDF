#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.U2D;
using UnityEngine;

namespace CuuChau.Editor
{
    /// <summary>
    /// Chặng U6: Cấu hình PlayerSettings Windows x64 (Mono2x, Minimal stripping, 1280x720 Windowed),
    /// đóng gói SpriteAtlasV2 cho Windows và xuất bản chạy độc lập Builds/Windows/CuuChauAnKiem.exe.
    /// </summary>
    public static class CuuChauU6WindowsBuild
    {
        private const string AppScenePath = "Assets/Scenes/U4_FullGame_App.unity";
        private const string OutputExePath = "Builds/Windows/CuuChauAnKiem.exe";

        [MenuItem("CuuChau/Build U6 Windows x64 Standalone")]
        public static void BuildWindows64()
        {
            if (!File.Exists(AppScenePath))
            {
                throw new FileNotFoundException(
                    $"[CuuChauU6WindowsBuild] Không tìm thấy scene khởi động bắt buộc: {AppScenePath}",
                    AppScenePath);
            }

            ConfigurePlayerSettings();

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(AppScenePath, true),
            };

            EditorSettings.spritePackerMode = SpritePackerMode.SpriteAtlasV2;
            try
            {
                SpriteAtlasUtility.PackAllAtlases(BuildTarget.StandaloneWindows64, false);
            }
            finally
            {
                SpriteAtlasUtility.CleanupAtlasPacking();
            }

            AssetDatabase.SaveAssets();

            string outputDir = Path.GetDirectoryName(OutputExePath);
            if (!string.IsNullOrEmpty(outputDir) && !Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }

            var buildOptions = new BuildPlayerOptions
            {
                scenes = new[] { AppScenePath },
                locationPathName = OutputExePath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            };

            BuildReport report = BuildPipeline.BuildPlayer(buildOptions);
            BuildSummary summary = report.summary;

            if (summary.result != BuildResult.Succeeded || summary.totalErrors > 0)
            {
                throw new InvalidOperationException(
                    $"[CuuChauU6WindowsBuild] Build Windows x64 thất bại: result={summary.result}, errors={summary.totalErrors}, warnings={summary.totalWarnings}");
            }

            double sizeMb = summary.totalSize / (1024d * 1024d);
            Debug.Log(
                $"[CuuChauU6WindowsBuild] Build thành công: {summary.outputPath} | {summary.totalSize} bytes ({sizeMb:F2} MB) | {summary.totalTime.TotalSeconds:F2}s");
        }

        private static void ConfigurePlayerSettings()
        {
            PlayerSettings.companyName = "CuuChauStudio";
            PlayerSettings.productName = "CuuChauAnKiem";
            PlayerSettings.bundleVersion = "0.6.0";
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 720;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.runInBackground = true;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Standalone, ManagedStrippingLevel.Minimal);
        }
    }
}
#endif
