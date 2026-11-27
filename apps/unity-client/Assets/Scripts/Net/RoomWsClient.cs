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
    /// tự giữ nhịp ping 25 giây và nối lại tự động khi rớt mạng LAN/VPN.
    /// </summary>
    public sealed class RoomWsClient : MonoBehaviour
    {
        [SerializeField] private float keepAliveSeconds = 25f;

        public event Action<string, string> OnAuthOk;
        public event Action<RoomViewerPayload, string> OnRoomState;
        public event Action<string, string> OnActionError;
        public event Action<string, List<string>> OnMatchEnded;
        public event Action<string> OnDisconnected;

        private readonly ConcurrentQueue<string> _incomingQueue = new();
        private readonly List<string> _accumulatedActionLog = new();

        private ClientWebSocket _socket;
        private CancellationTokenSource _cts;
        private string _wsUrl;
        private string _sessionToken;
        private string _currentMatchId;
        private string _subscribedRoomCode;
        private float _nextPingAt;
        private bool _intentionalClose;
        private bool _isConnecting;

        public bool IsConnected => _socket != null && _socket.State == WebSocketState.Open;

        public async Awaitable ConnectAndAuthenticateAsync(string wsUrl, string sessionToken, bool takeover = true)
        {
            _wsUrl = wsUrl;
            _sessionToken = sessionToken;
            _intentionalClose = false;
            await ConnectInternalAsync(takeover);
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
            while (_incomingQueue.TryDequeue(out string raw))
            {
                if (raw == "pong") continue;
                HandleJsonMessage(raw);
            }

            if (IsConnected && Time.unscaledTime >= _nextPingAt)
            {
                _nextPingAt = Time.unscaledTime + keepAliveSeconds;
                _ = SendRawTextAsync("ping");
            }
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
            if (_socket == null || _socket.State != WebSocketState.Open) return;
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            await _socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cts.Token);
        }

        private void HandleJsonMessage(string raw)
        {
            WsIncomingEnvelope msg;
            try
            {
                msg = JsonConvert.DeserializeObject<WsIncomingEnvelope>(raw);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[RoomWsClient] Lỗi giải mã WS JSON: {ex.Message}\nRaw: {raw}");
                return;
            }
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
                _currentMatchId = null;
                _accumulatedActionLog.Clear();
                return null;
            }

            if (_currentMatchId != pv.MatchId || !offset.HasValue || offset.Value == 0)
            {
                _currentMatchId = pv.MatchId;
                _accumulatedActionLog.Clear();
                if (pv.ActionLog != null) _accumulatedActionLog.AddRange(pv.ActionLog);
            }
            else if (offset.Value <= _accumulatedActionLog.Count && pv.ActionLog != null)
            {
                _accumulatedActionLog.RemoveRange(offset.Value, _accumulatedActionLog.Count - offset.Value);
                _accumulatedActionLog.AddRange(pv.ActionLog);
            }

            pv.ActionLog = new List<string>(_accumulatedActionLog);
            return pv;
        }

        private async Awaitable ReconnectWithBackoffAsync()
        {
            int[] delaysMs = { 1000, 2000, 4000, 8000 };
            foreach (int delay in delaysMs)
            {
                if (_intentionalClose || destroyCancellationToken.IsCancellationRequested) return;
                await Awaitable.WaitForSecondsAsync(delay / 1000f, destroyCancellationToken);
                await ConnectInternalAsync(takeover: true);
                if (IsConnected) return;
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
