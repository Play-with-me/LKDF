using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CuuChau.Net
{
    [Serializable]
    public sealed class HealthResponse
    {
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("service")] public string Service { get; set; }
        [JsonProperty("version")] public string Version { get; set; }
        [JsonProperty("heroCount")] public int HeroCount { get; set; }
        [JsonProperty("deckTotal")] public int DeckTotal { get; set; }
        [JsonProperty("timestamp")] public string Timestamp { get; set; }
    }

    [Serializable]
    public sealed class UserProfileDto
    {
        [JsonProperty("userId")] public string UserId { get; set; }
        [JsonProperty("displayName")] public string DisplayName { get; set; }
        [JsonProperty("hasCustomName")] public bool HasCustomName { get; set; }
        [JsonProperty("activeRoomCode")] public string ActiveRoomCode { get; set; }
        [JsonProperty("avatarUrl")] public string AvatarUrl { get; set; }
    }

    [Serializable]
    public sealed class GuestAuthResponse
    {
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("sessionToken")] public string SessionToken { get; set; }
        [JsonProperty("profile")] public UserProfileDto Profile { get; set; }
    }

    [Serializable]
    public sealed class RoomSeatDto
    {
        [JsonProperty("seatIndex")] public int SeatIndex { get; set; }
        [JsonProperty("userId")] public string UserId { get; set; }
        [JsonProperty("displayName")] public string DisplayName { get; set; }
        [JsonProperty("avatarUrl")] public string AvatarUrl { get; set; }
        [JsonProperty("isReady")] public bool IsReady { get; set; }
        [JsonProperty("connectionStatus")] public string ConnectionStatus { get; set; }
        [JsonProperty("isBotTakeover")] public bool IsBotTakeover { get; set; }
    }

    [Serializable]
    public sealed class RoomStateDto
    {
        [JsonProperty("roomCode")] public string RoomCode { get; set; }
        [JsonProperty("status")] public string Status { get; set; }
        [JsonProperty("ownerUserId")] public string OwnerUserId { get; set; }
        [JsonProperty("actingHostUserId")] public string ActingHostUserId { get; set; }
        [JsonProperty("hostDisconnectedAt")] public string HostDisconnectedAt { get; set; }
        [JsonProperty("timerPreset")] public string TimerPreset { get; set; }
        [JsonProperty("isTimerPaused")] public bool IsTimerPaused { get; set; }
        [JsonProperty("seats")] public List<RoomSeatDto> Seats { get; set; } = new();
    }

    [Serializable]
    public sealed class TimerConfigDto
    {
        [JsonProperty("preset")] public string Preset { get; set; }
        [JsonProperty("playSeconds")] public int PlaySeconds { get; set; }
        [JsonProperty("reactSeconds")] public int ReactSeconds { get; set; }
        [JsonProperty("heroSelectSeconds")] public int HeroSelectSeconds { get; set; }
    }

    [Serializable]
    public sealed class CardInstanceDto
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("cardKey")] public string CardKey { get; set; }
        [JsonProperty("nameVi")] public string NameVi { get; set; }
        [JsonProperty("suit")] public string Suit { get; set; }
        [JsonProperty("rank")] public string Rank { get; set; }
        [JsonProperty("category")] public string Category { get; set; }
    }

    [Serializable]
    public sealed class PlayerEquipmentsDto
    {
        [JsonProperty("weapon")] public CardInstanceDto Weapon { get; set; }
        [JsonProperty("armor")] public CardInstanceDto Armor { get; set; }
        [JsonProperty("plusOneHorse")] public CardInstanceDto PlusOneHorse { get; set; }
        [JsonProperty("minusOneHorse")] public CardInstanceDto MinusOneHorse { get; set; }
    }

    [Serializable]
    public sealed class PublicPlayerViewDto
    {
        [JsonProperty("seatIndex")] public int SeatIndex { get; set; }
        [JsonProperty("userId")] public string UserId { get; set; }
        [JsonProperty("displayName")] public string DisplayName { get; set; }
        [JsonProperty("avatarUrl")] public string AvatarUrl { get; set; }
        [JsonProperty("identity")] public string Identity { get; set; }
        [JsonProperty("isIdentityRevealed")] public bool IsIdentityRevealed { get; set; }
        [JsonProperty("heroId")] public string HeroId { get; set; }
        [JsonProperty("hp")] public int Hp { get; set; }
        [JsonProperty("maxHp")] public int MaxHp { get; set; }
        [JsonProperty("alive")] public bool Alive { get; set; }
        [JsonProperty("handCount")] public int HandCount { get; set; }
        [JsonProperty("handCards")] public List<CardInstanceDto> HandCards { get; set; }
        [JsonProperty("equipments")] public PlayerEquipmentsDto Equipments { get; set; }
        [JsonProperty("delayedScrolls")] public List<CardInstanceDto> DelayedScrolls { get; set; } = new();
        [JsonProperty("isBotTakeover")] public bool IsBotTakeover { get; set; }
    }

    [Serializable]
    public sealed class HeroDraftViewDto
    {
        [JsonProperty("stage")] public string Stage { get; set; }
        [JsonProperty("lordSeatIndex")] public int LordSeatIndex { get; set; }
        [JsonProperty("myCandidates")] public List<string> MyCandidates { get; set; } = new();
        [JsonProperty("mySelectedHero")] public string MySelectedHero { get; set; }
        [JsonProperty("readySeats")] public List<int> ReadySeats { get; set; } = new();
    }

    [Serializable]
    public sealed class PublicInterruptViewDto
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("kind")] public string Kind { get; set; }
        [JsonProperty("targetSeat")] public int TargetSeat { get; set; }
        [JsonProperty("sourceSeat")] public int SourceSeat { get; set; }
        [JsonProperty("scrollNameVi")] public string ScrollNameVi { get; set; }
        [JsonProperty("canRespondNullification")] public bool? CanRespondNullification { get; set; }
        [JsonExtensionData] public IDictionary<string, JToken> ExtraFields { get; set; }
    }

    [Serializable]
    public sealed class PlayerViewStateDto
    {
        [JsonProperty("matchId")] public string MatchId { get; set; }
        [JsonProperty("viewerSeatIndex")] public int ViewerSeatIndex { get; set; }
        [JsonProperty("roundNumber")] public int RoundNumber { get; set; }
        [JsonProperty("currentTurnSeat")] public int CurrentTurnSeat { get; set; }
        [JsonProperty("turnPhase")] public string TurnPhase { get; set; }
        [JsonProperty("drawPileCount")] public int DrawPileCount { get; set; }
        [JsonProperty("discardPileCount")] public int DiscardPileCount { get; set; }
        [JsonProperty("discardPileTop")] public CardInstanceDto DiscardPileTop { get; set; }
        [JsonProperty("enabledPacks")] public List<string> EnabledPacks { get; set; } = new();
        [JsonProperty("players")] public List<PublicPlayerViewDto> Players { get; set; } = new();
        [JsonProperty("harvestPool")] public List<CardInstanceDto> HarvestPool { get; set; } = new();
        [JsonProperty("heroDraft")] public HeroDraftViewDto HeroDraft { get; set; }
        [JsonProperty("activeInterrupt")] public PublicInterruptViewDto ActiveInterrupt { get; set; }
        [JsonProperty("actionLog")] public List<string> ActionLog { get; set; } = new();
        [JsonProperty("winningFaction")] public string WinningFaction { get; set; }
        [JsonProperty("winnerUserIds")] public List<string> WinnerUserIds { get; set; } = new();

        public PublicPlayerViewDto MySeat =>
            Players != null && ViewerSeatIndex >= 0 && ViewerSeatIndex < Players.Count
                ? Players[ViewerSeatIndex]
                : null;

        public List<CardInstanceDto> MyHand => MySeat?.HandCards;
    }

    [Serializable]
    public sealed class RoomViewerPayload
    {
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("roomState")] public RoomStateDto RoomState { get; set; }
        [JsonProperty("timerConfig")] public TimerConfigDto TimerConfig { get; set; }
        [JsonProperty("phaseDeadlineAt")] public string PhaseDeadlineAt { get; set; }
        [JsonProperty("pausedRemainingMs")] public long? PausedRemainingMs { get; set; }
        [JsonProperty("playerView")] public PlayerViewStateDto PlayerView { get; set; }
        [JsonProperty("actionLogOffset")] public int? ActionLogOffset { get; set; }
    }

    [Serializable]
    public sealed class WsIncomingEnvelope
    {
        [JsonProperty("type")] public string Type { get; set; }
        [JsonProperty("event")] public string EventName { get; set; }
        [JsonProperty("code")] public string Code { get; set; }
        [JsonProperty("messageVi")] public string MessageVi { get; set; }
        [JsonProperty("userId")] public string UserId { get; set; }
        [JsonProperty("displayName")] public string DisplayName { get; set; }
        [JsonProperty("roomCode")] public string RoomCode { get; set; }
        [JsonProperty("roomState")] public RoomStateDto RoomState { get; set; }
        [JsonProperty("timerConfig")] public TimerConfigDto TimerConfig { get; set; }
        [JsonProperty("phaseDeadlineAt")] public string PhaseDeadlineAt { get; set; }
        [JsonProperty("pausedRemainingMs")] public long? PausedRemainingMs { get; set; }
        [JsonProperty("playerView")] public PlayerViewStateDto PlayerView { get; set; }
        [JsonProperty("actionLogOffset")] public int? ActionLogOffset { get; set; }
        [JsonProperty("winningFaction")] public string WinningFaction { get; set; }
        [JsonProperty("winnerUserIds")] public List<string> WinnerUserIds { get; set; }
    }

    [Serializable]
    public sealed class ApiErrorException : Exception
    {
        public long StatusCode { get; }
        public string ErrorCode { get; }

        public ApiErrorException(long statusCode, string errorCode, string messageVi)
            : base(messageVi)
        {
            StatusCode = statusCode;
            ErrorCode = errorCode;
        }
    }
}
