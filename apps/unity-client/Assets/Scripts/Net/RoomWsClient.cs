using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using Newtonsoft.Json;
using UnityEngine;

namespace CuuChau.Net
{
    /// <summary>
    /// Kết nối WebSocket thời gian thực với @lkdf/server trên luồng nền, đẩy gói tin về Unity Main Thread,
    /// tự giữ nhịp ping 25 giây và nối lại tự động 12 đợt (~55 giây, vượt cửa sổ failover 30s) khi rớt mạng LAN/VPN.
    /// </summary>
    public sealed class RoomWsClient : MonoBehaviour
    {
        private static readonly float[] ReconnectBackoffSeconds =
        {
            1.0f, 1.5f, 2.0f, 3.0f, 5.0f, 5.0f,
            5.5f, 6.0f, 6.0f, 6.5f, 6.5f, 7.0f
        };

        [SerializeField] private float keepAliveSeconds = 25f;

        public event Action<string, string> OnAuthOk;
        public event Action<RoomViewerPayload, string> OnRoomState;
        public event Action<string, string> OnActionError;
        public event Action<string, List<string>> OnMatchEnded;
        public event Action<string> OnDisconnected;

        private readonly ConcurrentQueue<string> _incomingQueue = new();
        private readonly List<WsIncomingEnvelope> _frameEnvelopeBatch = new(16);
        private readonly List<string> _accumulatedActionLog = new();
        private List<string> _cachedActionLogSnapshot = new(0);

        private ClientWebSocket _socket;
        private CancellationTokenSource _cts;
        private string _wsUrl;
        private string _sessionToken;
        private string _currentMatchId;
        private string _subscribedRoomCode;
        private float _nextPingAt;
        private bool _intentionalClose;
        private bool _isConnecting;
        private bool _isReconnecting;

        public bool IsConnected => _socket != null && _socket.State == WebSocketState.Open;
        public bool IsReconnecting => _isReconnecting;

        public async Awaitable ConnectAndAuthenticateAsync(string wsUrl, string sessionToken, bool takeover = true)
        {
            _wsUrl = wsUrl;
            _sessionToken = sessionToken;
            _intentionalClose = false;
            await ConnectInternalAsync(takeover);
        }

        public async Awaitable ForceReconnectAsync()
        {
            if (string.IsNullOrEmpty(_wsUrl) || string.IsNullOrEmpty(_sessionToken))
            {
                return;
            }

            _intentionalClose = false;
            if (_isConnecting)
            {
                CleanupSocket();
            }

            await ConnectInternalAsync(takeover: true);
            if (!IsConnected && !_intentionalClose && !_isReconnecting)
            {
                _ = ReconnectWithBackoffAsync();
            }
        }

        public Awaitable SendSubscribeRoomAsync(string roomCode)
        {
            _subscribedRoomCode = roomCode;
            return SendObjectAsync(new { type = "SUBSCRIBE_ROOM", roomCode });
        }

        public Awaitable SendSelectHeroAsync(string roomCode, string heroId) =>
            SendObjectAsync(new { type = "SELECT_HERO", roomCode, heroId });

        public Awaitable SendGameActionAsync(string roomCode, object actionPayload) =>
            SendObjectAsync(new { type = "GAME_ACTION", roomCode, action = actionPayload });

        public Awaitable SendRefereeActionAsync(string roomCode, string actionType) =>
            SendObjectAsync(new { type = "REFEREE_ACTION", roomCode, actionType });

        public void Disconnect()
        {
            _intentionalClose = true;
            CleanupSocket();
        }

        private void Update()
        {
            if (!_incomingQueue.IsEmpty)
            {
                DrainIncomingQueue();
            }

            if (IsConnected && Time.unscaledTime >= _nextPingAt)
            {
                _nextPingAt = Time.unscaledTime + keepAliveSeconds;
                _ = SendRawTextAsync("ping");
            }
        }

        private void DrainIncomingQueue()
        {
            _frameEnvelopeBatch.Clear();
            while (_incomingQueue.TryDequeue(out string raw))
            {
                if (raw == "pong" || string.IsNullOrEmpty(raw)) continue;

                WsIncomingEnvelope msg;
                try
                {
                    msg = JsonConvert.DeserializeObject<WsIncomingEnvelope>(raw);
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[RoomWsClient] Lỗi giải mã WS JSON: {ex.Message}\nRaw: {raw}");
                    continue;
                }

                if (msg != null)
                {
                    _frameEnvelopeBatch.Add(msg);
                }
            }

            int batchCount = _frameEnvelopeBatch.Count;
            for (int i = 0; i < batchCount; i++)
            {
                WsIncomingEnvelope msg = _frameEnvelopeBatch[i];

                // Gộp mượt nhiều gói ROOM_STATE toàn phần (không dùng actionLogOffset) dồn trong cùng 1 frame
                if (msg.Type == "ROOM_STATE" &&
                    !msg.ActionLogOffset.HasValue &&
                    i + 1 < batchCount &&
                    _frameEnvelopeBatch[i + 1].Type == "ROOM_STATE" &&
                    !_frameEnvelopeBatch[i + 1].ActionLogOffset.HasValue)
                {
                    continue;
                }

                DispatchEnvelope(msg);
            }

            _frameEnvelopeBatch.Clear();
        }

        private void OnDestroy() => Disconnect();
        private void OnApplicationQuit() => Disconnect();

        private async Awaitable ConnectInternalAsync(bool takeover)
        {
            if (_isConnecting) return;
            _isConnecting = true;
            CleanupSocket();

            try
            {
                _cts = CancellationTokenSource.CreateLinkedTokenSource(destroyCancellationToken);
                _socket = new ClientWebSocket();
                await _socket.ConnectAsync(new Uri(_wsUrl), _cts.Token);

                _nextPingAt = Time.unscaledTime + keepAliveSeconds;
                _ = ReceiveLoopAsync(_socket, _cts.Token);

                await SendObjectAsync(new
                {
                    type = "AUTH",
                    sessionToken = _sessionToken,
                    seatMode = takeover ? "TAKEOVER" : "CLAIM_SEAT",
                    actionLogDeltas = true,
                });
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[RoomWsClient] Kết nối WS thất bại: {ex.Message}");
                OnDisconnected?.Invoke(ex.Message);
            }
            finally
            {
                _isConnecting = false;
            }
        }

        private async Awaitable ReceiveLoopAsync(ClientWebSocket socket, CancellationToken token)
        {
            var buffer = new byte[16 * 1024];
            using var ms = new MemoryStream();
            try
            {
                while (!token.IsCancellationRequested && socket.State == WebSocketState.Open)
                {
                    ms.SetLength(0);
                    WebSocketReceiveResult result;
                    do
                    {
                        result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            _incomingQueue.Enqueue("{\"type\":\"__INTERNAL_CLOSED__\"}");
                            return;
                        }
                        ms.Write(buffer, 0, result.Count);
                    } while (!result.EndOfMessage);

                    string text = Encoding.UTF8.GetString(ms.ToArray());
                    _incomingQueue.Enqueue(text);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected on shutdown or disconnect
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[RoomWsClient] Lỗi nhận WS: {ex.Message}");
                _incomingQueue.Enqueue("{\"type\":\"__INTERNAL_CLOSED__\"}");
            }
        }

        private async Awaitable SendObjectAsync(object payload)
        {
            string json = JsonConvert.SerializeObject(payload);
            await SendRawTextAsync(json);
        }

        private async Awaitable SendRawTextAsync(string text)
        {
            if (_socket == null || _socket.State != WebSocketState.Open || _cts == null) return;
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            await _socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cts.Token);
        }

        private void DispatchEnvelope(WsIncomingEnvelope msg)
        {
            if (msg == null) return;

            switch (msg.Type)
            {
                case "AUTH_OK":
                    OnAuthOk?.Invoke(msg.UserId, msg.DisplayName);
                    if (!string.IsNullOrEmpty(_subscribedRoomCode))
                    {
                        _ = SendSubscribeRoomAsync(_subscribedRoomCode);
                    }
                    break;

                case "ROOM_STATE":
                    var viewer = new RoomViewerPayload
                    {
                        Ok = true,
                        RoomState = msg.RoomState,
                        TimerConfig = msg.TimerConfig,
                        PhaseDeadlineAt = msg.PhaseDeadlineAt,
                        PausedRemainingMs = msg.PausedRemainingMs,
                        PlayerView = MergeActionLogDelta(msg.PlayerView, msg.ActionLogOffset),
                        ActionLogOffset = msg.ActionLogOffset,
                    };
                    OnRoomState?.Invoke(viewer, msg.EventName);
                    break;

                case "ACTION_ERROR":
                case "AUTH_ERROR":
                    OnActionError?.Invoke(msg.Code ?? "WS_ERROR", msg.MessageVi ?? "Lỗi thao tác WebSocket.");
                    break;

                case "MATCH_ENDED":
                    OnMatchEnded?.Invoke(msg.WinningFaction, msg.WinnerUserIds ?? new List<string>());
                    break;

                case "__INTERNAL_CLOSED__":
                    if (!_intentionalClose)
                    {
                        OnDisconnected?.Invoke("Kết nối phòng đấu tạm gián đoạn.");
                        _ = ReconnectWithBackoffAsync();
                    }
                    break;
            }
        }

        private PlayerViewStateDto MergeActionLogDelta(PlayerViewStateDto pv, int? offset)
        {
            if (pv == null)
            {
                if (_currentMatchId != null || _accumulatedActionLog.Count > 0)
                {
                    _currentMatchId = null;
                    _accumulatedActionLog.Clear();
                    _cachedActionLogSnapshot = new List<string>(0);
                }
                return null;
            }

            if (_currentMatchId != pv.MatchId || !offset.HasValue || offset.Value == 0)
            {
                List<string> incoming = pv.ActionLog;
                bool matchChanged = _currentMatchId != pv.MatchId;
                _currentMatchId = pv.MatchId;

                if (matchChanged || !ActionLogListEquals(_accumulatedActionLog, incoming))
                {
                    _accumulatedActionLog.Clear();
                    if (incoming != null && incoming.Count > 0)
                    {
                        _accumulatedActionLog.AddRange(incoming);
                    }
                    _cachedActionLogSnapshot = incoming ?? new List<string>(0);
                }

                pv.ActionLog = _cachedActionLogSnapshot;
                return pv;
            }

            if (offset.Value <= _accumulatedActionLog.Count)
            {
                int removeCount = _accumulatedActionLog.Count - offset.Value;
                int addCount = pv.ActionLog != null ? pv.ActionLog.Count : 0;

                if (removeCount == 0 && addCount == 0 && _cachedActionLogSnapshot != null)
                {
                    pv.ActionLog = _cachedActionLogSnapshot;
                    return pv;
                }

                if (removeCount > 0)
                {
                    _accumulatedActionLog.RemoveRange(offset.Value, removeCount);
                }
                if (addCount > 0)
                {
                    _accumulatedActionLog.AddRange(pv.ActionLog);
                }

                _cachedActionLogSnapshot = new List<string>(_accumulatedActionLog);
                pv.ActionLog = _cachedActionLogSnapshot;
                return pv;
            }

            if (pv.ActionLog != null && pv.ActionLog.Count > 0)
            {
                _accumulatedActionLog.AddRange(pv.ActionLog);
                _cachedActionLogSnapshot = new List<string>(_accumulatedActionLog);
            }

            pv.ActionLog = _cachedActionLogSnapshot;
            return pv;
        }

        private static bool ActionLogListEquals(List<string> a, List<string> b)
        {
            int countA = a != null ? a.Count : 0;
            int countB = b != null ? b.Count : 0;
            if (countA != countB) return false;
            if (countA == 0) return true;

            for (int i = countA - 1; i >= 0; i--)
            {
                if (!string.Equals(a[i], b[i], StringComparison.Ordinal))
                {
                    return false;
                }
            }
            return true;
        }

        private async Awaitable ReconnectWithBackoffAsync()
        {
            if (_isReconnecting || _intentionalClose || string.IsNullOrEmpty(_wsUrl) || string.IsNullOrEmpty(_sessionToken))
            {
                return;
            }

            _isReconnecting = true;
            try
            {
                for (int i = 0; i < ReconnectBackoffSeconds.Length; i++)
                {
                    if (_intentionalClose || destroyCancellationToken.IsCancellationRequested) return;

                    try
                    {
                        await Awaitable.WaitForSecondsAsync(ReconnectBackoffSeconds[i], destroyCancellationToken);
                    }
                    catch (OperationCanceledException)
                    {
                        return;
                    }

                    if (_intentionalClose || destroyCancellationToken.IsCancellationRequested) return;
                    if (IsConnected) return;

                    await ConnectInternalAsync(takeover: true);
                    if (IsConnected) return;
                }
            }
            finally
            {
                _isReconnecting = false;
            }
        }

        private void CleanupSocket()
        {
            if (_cts != null)
            {
                _cts.Cancel();
                _cts.Dispose();
                _cts = null;
            }
            if (_socket != null)
            {
                _socket.Dispose();
                _socket = null;
            }
        }
    }
}
