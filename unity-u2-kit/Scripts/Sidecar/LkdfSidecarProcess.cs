using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading;
using UnityEngine;
using UnityEngine.Networking;
using Debug = UnityEngine.Debug;

namespace CuuChau.Sidecar
{
    /// <summary>
    /// Khởi chạy và quản lý vòng đời máy chủ Node @lkdf/server ngầm gắn Windows Job Object,
    /// sinh khóa JWT ngẫu nhiên theo từng phiên thực thi và bảo đảm tắt hoặc crash cửa sổ Unity luôn giải phóng cổng tức thì.
    /// </summary>
    public class LkdfSidecarProcess : MonoBehaviour
    {
        [Header("Cấu hình Sidecar")]
        [SerializeField] private int preferredPort = 3001;
        [SerializeField] private int portScanCount = 10;
        [SerializeField] private bool allowLanConnections = true;
        [SerializeField] private float healthTimeoutSeconds = 15f;

        private Process _serverProcess;
        private IntPtr _jobHandle = IntPtr.Zero;
        private string _runtimeJwtSecret = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

        public int ActivePort { get; private set; }
        public string BaseHttpUrl { get; private set; } = string.Empty;
        public string BaseWsUrl { get; private set; } = string.Empty;
        public bool IsReady { get; private set; }
        public string LastError { get; private set; } = string.Empty;

        public async Awaitable<bool> StartSidecarAsync(CancellationToken cancellationToken = default)
        {
            if (IsReady && _serverProcess != null && !_serverProcess.HasExited)
            {
                return true;
            }

            StopSidecar();
            LastError = string.Empty;

            if (!ResolvePaths(out string nodeExe, out string serverEntry, out string workingDir))
            {
                LastError = "Không tìm thấy tệp thực thi Node hoặc @lkdf/server/dist/index.js.";
                Debug.LogError($"[LkdfSidecar] {LastError}");
                return false;
            }

            int selectedPort = FindAvailablePort(preferredPort, portScanCount);
            if (selectedPort <= 0)
            {
                LastError = $"Không tìm thấy cổng trống trong dải {preferredPort}–{preferredPort + portScanCount - 1}.";
                Debug.LogError($"[LkdfSidecar] {LastError}");
                return false;
            }

            ActivePort = selectedPort;
            BaseHttpUrl = $"http://127.0.0.1:{ActivePort}";
            BaseWsUrl = $"ws://127.0.0.1:{ActivePort}/ws";

            if (string.IsNullOrEmpty(_runtimeJwtSecret))
            {
                _runtimeJwtSecret = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            }

            string dbPath = Path.Combine(Application.persistentDataPath, "lkdf-sidecar.json").Replace('\\', '/');
            var startInfo = new ProcessStartInfo
            {
                FileName = nodeExe,
                Arguments = $"\"{serverEntry}\"",
                WorkingDirectory = workingDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            startInfo.Environment["HOST"] = allowLanConnections ? "0.0.0.0" : "127.0.0.1";
            startInfo.Environment["PORT"] = ActivePort.ToString();
            startInfo.Environment["DATABASE_URL"] = $"json:{dbPath}";
            startInfo.Environment["JWT_SESSION_SECRET"] = _runtimeJwtSecret;
            startInfo.Environment["LKDF_ALLOW_LAN_FILL_BOTS"] = "1";
            startInfo.Environment["NODE_ENV"] = "production";

            try
            {
                _serverProcess = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
                _serverProcess.ErrorDataReceived += (_, args) =>
                {
                    if (!string.IsNullOrWhiteSpace(args.Data))
                    {
                        Debug.LogWarning($"[LkdfSidecar stderr] {args.Data}");
                    }
                };
                _serverProcess.Start();
                _serverProcess.BeginOutputReadLine();
                _serverProcess.BeginErrorReadLine();
                AttachKillOnCloseJobObject(_serverProcess);
            }
            catch (Exception ex)
            {
                LastError = $"Lỗi khởi chạy Sidecar: {ex.Message}";
                Debug.LogError($"[LkdfSidecar] {LastError}");
                StopSidecar();
                return false;
            }

            float deadline = Time.realtimeSinceStartup + healthTimeoutSeconds;
            while (Time.realtimeSinceStartup < deadline)
            {
                if (cancellationToken.IsCancellationRequested || destroyCancellationToken.IsCancellationRequested)
                {
                    StopSidecar();
                    return false;
                }
                if (_serverProcess == null || _serverProcess.HasExited)
                {
                    LastError = "Tiến trình máy chủ ngầm thoát sớm khi khởi động.";
                    Debug.LogError($"[LkdfSidecar] {LastError}");
                    StopSidecar();
                    return false;
                }

                if (await ProbeHealthAsync())
                {
                    IsReady = true;
                    Debug.Log($"[LkdfSidecar] Sẵn sàng tại {BaseHttpUrl} (DB: {dbPath})");
                    return true;
                }

                await Awaitable.WaitForSecondsAsync(0.25f, cancellationToken);
            }

            LastError = $"Quá thời gian chờ máy chủ ngầm tại {BaseHttpUrl}/api/health.";
            Debug.LogError($"[LkdfSidecar] {LastError}");
            StopSidecar();
            return false;
        }

        public void StopSidecar()
        {
            IsReady = false;
            if (_serverProcess != null)
            {
                try
                {
                    if (!_serverProcess.HasExited)
                    {
                        _serverProcess.Kill();
                        _serverProcess.WaitForExit(2000);
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[LkdfSidecar] Không thể dừng tiến trình con sạch: {ex.Message}");
                }
                finally
                {
                    _serverProcess.Dispose();
                    _serverProcess = null;
                }
            }

            if (_jobHandle != IntPtr.Zero)
            {
                CloseWin32Handle(_jobHandle);
                _jobHandle = IntPtr.Zero;
            }
        }

        private void OnDisable() => StopSidecar();
        private void OnDestroy() => StopSidecar();
        private void OnApplicationQuit() => StopSidecar();

        private async Awaitable<bool> ProbeHealthAsync()
        {
            using var req = UnityWebRequest.Get($"{BaseHttpUrl}/api/health");
            req.timeout = 2;
            await req.SendWebRequest();
            return req.result == UnityWebRequest.Result.Success && req.responseCode == 200;
        }

        private static bool ResolvePaths(out string nodeExe, out string serverEntry, out string workingDir)
        {
            string streamingRoot = Path.Combine(Application.streamingAssetsPath, "ServerSidecar");
            string bundledNode = Path.Combine(streamingRoot, "node.exe");
            string bundledEntry = Path.Combine(streamingRoot, "apps", "server", "dist", "index.js");
            string bundledNodeModules = Path.Combine(streamingRoot, "node_modules");

            if (File.Exists(bundledEntry) && Directory.Exists(bundledNodeModules))
            {
                nodeExe = File.Exists(bundledNode) ? bundledNode : "node";
                serverEntry = bundledEntry;
                workingDir = streamingRoot;
                return true;
            }

            // Dev fallback pointing directly to workspace repo
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            string devEntry = Path.Combine(repoRoot, "apps", "server", "dist", "index.js");
            if (File.Exists(devEntry))
            {
                nodeExe = "node";
                serverEntry = devEntry;
                workingDir = repoRoot;
                return true;
            }

            nodeExe = string.Empty;
            serverEntry = string.Empty;
            workingDir = string.Empty;
            return false;
        }

        private static int FindAvailablePort(int startPort, int count)
        {
            for (int i = 0; i < count; i++)
            {
                int candidate = startPort + i;
                try
                {
                    var listener = new TcpListener(System.Net.IPAddress.Loopback, candidate);
                    listener.Start();
                    listener.Stop();
                    return candidate;
                }
                catch (SocketException)
                {
                    // Port is in use, inspect next candidate
                }
            }
            return -1;
        }

        private void AttachKillOnCloseJobObject(Process process)
        {
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
            if (_jobHandle != IntPtr.Zero)
            {
                CloseWin32Handle(_jobHandle);
                _jobHandle = IntPtr.Zero;
            }

            _jobHandle = CreateJobObject(IntPtr.Zero, null);
            if (_jobHandle == IntPtr.Zero) return;

            var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

            int length = Marshal.SizeOf<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>();
            IntPtr infoPtr = Marshal.AllocHGlobal(length);
            try
            {
                Marshal.StructureToPtr(info, infoPtr, false);
                if (SetInformationJobObject(_jobHandle, JobObjectInfoType.ExtendedLimitInformation, infoPtr, (uint)length))
                {
                    AssignProcessToJobObject(_jobHandle, process.Handle);
                }
            }
            finally
            {
                Marshal.FreeHGlobal(infoPtr);
            }
#endif
        }

        private static void CloseWin32Handle(IntPtr handle)
        {
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
            CloseHandle(handle);
#endif
        }

#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
        private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

        private enum JobObjectInfoType
        {
            ExtendedLimitInformation = 9
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(
            IntPtr hJob,
            JobObjectInfoType infoType,
            IntPtr lpJobObjectInfo,
            uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);
#endif
    }
}
