using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace CuuChau.Net
{
    /// <summary>
    /// Khách HTTP bất đồng bộ dùng UnityWebRequest + Awaitable + Newtonsoft.Json
    /// giao tiếp chuẩn xác với @lkdf/server.
    /// </summary>
    public sealed class LkdfApiClient
    {
        private string _baseUrl;
        private string _sessionToken;

        public LkdfApiClient(string baseHttpUrl)
        {
            _baseUrl = baseHttpUrl.TrimEnd('/');
        }

        public void SetBaseUrl(string baseHttpUrl) => _baseUrl = baseHttpUrl.TrimEnd('/');
        public void SetSessionToken(string sessionToken) => _sessionToken = sessionToken;
        public string SessionToken => _sessionToken;

        public Awaitable<HealthResponse> GetHealthAsync() =>
            SendJsonAsync<HealthResponse>("GET", "/api/health", null, includeAuth: false);

        public async Awaitable<GuestAuthResponse> LoginGuestAsync(string clientDeviceId, string displayName)
        {
            var payload = new { clientDeviceId, displayName };
            var res = await SendJsonAsync<GuestAuthResponse>("POST", "/api/auth/guest", payload, includeAuth: false);
            _sessionToken = res.SessionToken;
            return res;
        }

        public Awaitable<RoomViewerPayload> CreateRoomAsync(string timerPreset = "STANDARD") =>
            SendJsonAsync<RoomViewerPayload>("POST", "/api/rooms", new { timerPreset }, includeAuth: true);

        public Awaitable<RoomViewerPayload> JoinRoomAsync(string roomCode) =>
            SendJsonAsync<RoomViewerPayload>("POST", "/api/rooms/join", new { roomCode }, includeAuth: true);

        public Awaitable<RoomViewerPayload> FillBotsAsync(string roomCode, int targetPlayerCount = 4) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/fill-bots", new { targetPlayerCount }, includeAuth: true);

        public Awaitable<RoomViewerPayload> SetReadyAsync(string roomCode, bool isReady) =>
            SendJsonAsync<RoomViewerPayload>("PATCH", $"/api/rooms/{roomCode}/ready", new { isReady }, includeAuth: true);

        public Awaitable<RoomViewerPayload> StartMatchAsync(string roomCode) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/start", new { }, includeAuth: true);

        public Awaitable<RoomViewerPayload> SelectHeroAsync(string roomCode, string heroId) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/select-hero", new { heroId }, includeAuth: true);

        public Awaitable<RoomViewerPayload> ReturnLobbyAsync(string roomCode) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/return-lobby", new { }, includeAuth: true);

        public Awaitable<RoomViewerPayload> LeaveRoomAsync(string roomCode) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/leave", new { }, includeAuth: true);

        public Awaitable<RoomViewerPayload> ApplyRefereeActionAsync(string roomCode, string actionType) =>
            SendJsonAsync<RoomViewerPayload>("POST", $"/api/rooms/{roomCode}/referee", new { actionType }, includeAuth: true);

        private async Awaitable<T> SendJsonAsync<T>(string method, string path, object body, bool includeAuth)
        {
            string url = _baseUrl + path;
            using var req = new UnityWebRequest(url, method);
            req.downloadHandler = new DownloadHandlerBuffer();

            if (body != null)
            {
                string json = JsonConvert.SerializeObject(body);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.SetRequestHeader("Content-Type", "application/json");
            }

            if (includeAuth && !string.IsNullOrEmpty(_sessionToken))
            {
                req.SetRequestHeader("Authorization", $"Bearer {_sessionToken}");
            }

            req.timeout = 10;
            await req.SendWebRequest();

            string rawText = req.downloadHandler?.text ?? string.Empty;
            if (req.result != UnityWebRequest.Result.Success || req.responseCode >= 400)
            {
                string errCode = "HTTP_ERROR";
                string errMsg = req.error ?? $"HTTP {req.responseCode}";
                try
                {
                    if (!string.IsNullOrWhiteSpace(rawText))
                    {
                        var j = JObject.Parse(rawText);
                        errCode = j["code"]?.Value<string>() ?? errCode;
                        errMsg = j["messageVi"]?.Value<string>() ?? errMsg;
                    }
                }
                catch
                {
                    // Fallback to UnityWebRequest error string when body is not JSON
                }

                throw new ApiErrorException(req.responseCode, errCode, errMsg);
            }

            return JsonConvert.DeserializeObject<T>(rawText);
        }
    }
}
