using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Modals
{
    /// <summary>
    /// Màn Kết Ván (`MATCH_ENDED`):
    /// - Vinh danh Phe Thắng (`LORD_LOYALIST`, `REBEL`, `SPY`) và điều kiện chiến thắng.
    /// - Liệt kê đủ 4–8 người chơi kèm Thân Phận thật, Hiệp Khách, Sinh Lực cuối trận và kết quả Thắng/Thua.
    /// - 2 nút rõ hành động ở đáy: `Về Phòng Chờ` (`OnReturnLobbyRequested`) và `Về Sảnh Chính` (`OnBackToHallRequested`).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class MatchSummaryModalView : MonoBehaviour
    {
        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _initialized;

        private RectTransform _rootRect;
        private TextMeshProUGUI _winnerTitleText;
        private TextMeshProUGUI _winnerDetailText;
        private RectTransform _rosterContentRect;
        private ScrollRect _rosterScrollRect;
        private readonly List<GameObject> _rowObjects = new();

        public event Action OnReturnLobbyRequested;
        public event Action OnBackToHallRequested;

        public void InitializeView(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_initialized) return;

            BuildHierarchy();
            _initialized = true;
            SetVisible(false);
        }

        public void SetVisible(bool visible)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);
            gameObject.SetActive(visible);
            if (visible)
            {
                transform.SetAsLastSibling();
            }
        }

        public void BindSummary(PlayerViewStateDto state)
        {
            if (!_initialized) InitializeView(_catalog, _serifFont, _sansFont, _monoFont);

            ClearRows();

            if (state == null)
            {
                _winnerTitleText.text = "VÁN ĐẤU ĐÃ KẾT THÚC";
                _winnerDetailText.text = "Không có dữ liệu tổng kết ván đấu.";
                return;
            }

            string winningFaction = state.WinningFaction;
            _winnerTitleText.text = CuuChauLoreLookup.GetWinningFactionNameVi(winningFaction);
            _winnerDetailText.text = CuuChauLoreLookup.GetWinningFactionDetailVi(winningFaction);

            var winnerSet = state.WinnerUserIds != null
                ? new HashSet<string>(state.WinnerUserIds, StringComparer.Ordinal)
                : new HashSet<string>(StringComparer.Ordinal);

            List<PublicPlayerViewDto> players = state.Players ?? new List<PublicPlayerViewDto>();
            for (int i = 0; i < players.Count; i++)
            {
                PublicPlayerViewDto p = players[i];
                bool isMe = p.SeatIndex == state.ViewerSeatIndex;
                bool isWinner = winnerSet.Count > 0
                    ? (!string.IsNullOrEmpty(p.UserId) && winnerSet.Contains(p.UserId))
                    : (IsIdentityInWinningFaction(p.Identity, winningFaction) && (!string.Equals(winningFaction, "SPY", StringComparison.OrdinalIgnoreCase) || p.Alive));
                CreatePlayerSummaryRow(p, isWinner, isMe);
            }

            if (_rosterContentRect != null)
            {
                Canvas.ForceUpdateCanvases();
                LayoutRebuilder.ForceRebuildLayoutImmediate(_rosterContentRect);
            }
            if (_rosterScrollRect != null)
            {
                _rosterScrollRect.verticalNormalizedPosition = 1f;
            }
        }

        private void BuildHierarchy()
        {
            _rootRect = ModalUiKit.EnsureRootStretch(gameObject);
            ModalUiKit.CreateModalShell(
                _rootRect,
                "MatchSummaryPanel",
                new Vector2(980f, 670f),
                _catalog,
                out RectTransform inner);

            // Victory Banner
            var bannerGo = new GameObject("VictoryBanner", typeof(RectTransform), typeof(Image));
            bannerGo.transform.SetParent(inner, false);
            var bannerRt = bannerGo.GetComponent<RectTransform>();
            bannerRt.anchorMin = new Vector2(0f, 1f);
            bannerRt.anchorMax = new Vector2(1f, 1f);
            bannerRt.pivot = new Vector2(0.5f, 1f);
            bannerRt.anchoredPosition = new Vector2(0f, -16f);
            bannerRt.sizeDelta = new Vector2(-36f, 96f);
            bannerGo.GetComponent<Image>().color = ModalUiKit.ObsidianInsetColor;

            _winnerTitleText = ModalUiKit.CreateTmp(
                "WinnerTitle",
                bannerRt,
                _serifFont != null ? _serifFont : _sansFont,
                26f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            _winnerTitleText.rectTransform.anchorMin = new Vector2(0f, 0.44f);
            _winnerTitleText.rectTransform.anchorMax = new Vector2(1f, 0.96f);
            _winnerTitleText.rectTransform.offsetMin = new Vector2(16f, 0f);
            _winnerTitleText.rectTransform.offsetMax = new Vector2(-16f, 0f);
            _winnerTitleText.text = "TỔNG KẾT VÁN ĐẤU";

            _winnerDetailText = ModalUiKit.CreateTmp(
                "WinnerDetail",
                bannerRt,
                _sansFont != null ? _sansFont : _serifFont,
                16f,
                ModalUiKit.AmberAccentColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center,
                wrap: true);
            _winnerDetailText.rectTransform.anchorMin = new Vector2(0f, 0.04f);
            _winnerDetailText.rectTransform.anchorMax = new Vector2(1f, 0.46f);
            _winnerDetailText.rectTransform.offsetMin = new Vector2(16f, 4f);
            _winnerDetailText.rectTransform.offsetMax = new Vector2(-16f, 0f);

            // Players List (4-8 seats)
            _rosterScrollRect = ModalUiKit.CreateVerticalScrollArea(
                "SummaryRosterScroll",
                inner,
                spacing: 8f,
                padding: new RectOffset(12, 12, 10, 10),
                out _rosterContentRect);
            var scrollRt = _rosterScrollRect.GetComponent<RectTransform>();
            scrollRt.anchorMin = Vector2.zero;
            scrollRt.anchorMax = Vector2.one;
            scrollRt.offsetMin = new Vector2(20f, 104f);
            scrollRt.offsetMax = new Vector2(-20f, -124f);

            // Bottom Action Bar: 2 Explicit Buttons
            var footerGo = new GameObject("SummaryFooter", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            footerGo.transform.SetParent(inner, false);
            var footerRt = footerGo.GetComponent<RectTransform>();
            footerRt.anchorMin = new Vector2(0f, 0f);
            footerRt.anchorMax = new Vector2(1f, 0f);
            footerRt.pivot = new Vector2(0.5f, 0f);
            footerRt.anchoredPosition = new Vector2(0f, 18f);
            footerRt.sizeDelta = new Vector2(-48f, 68f);

            var hlg = footerGo.GetComponent<HorizontalLayoutGroup>();
            hlg.spacing = 18f;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;

            ModalUiKit.CreateSecondaryButton(
                "Btn_BackToHall",
                footerRt,
                _serifFont != null ? _serifFont : _sansFont,
                "Về Sảnh Chính",
                18f,
                ModalUiKit.SecondaryBtnColor,
                () => OnBackToHallRequested?.Invoke(),
                out _,
                out _);

            ModalUiKit.CreatePrimaryButton(
                "Btn_ReturnLobby",
                footerRt,
                _catalog,
                _serifFont != null ? _serifFont : _sansFont,
                "Về Phòng Chờ",
                19f,
                () => OnReturnLobbyRequested?.Invoke(),
                out _);
        }

        private void CreatePlayerSummaryRow(PublicPlayerViewDto player, bool isWinner, bool isMe)
        {
            HeroLoreInfo hero = CuuChauLoreLookup.GetHeroInfo(player.HeroId);
            string roleVi = CuuChauLoreLookup.GetIdentityNameVi(player.Identity);
            string seatTag = isMe ? " (Bạn)" : string.Empty;
            string playerName = string.IsNullOrEmpty(player.DisplayName)
                ? $"Ghế {player.SeatIndex + 1}"
                : player.DisplayName;

            var rowGo = new GameObject(
                $"SummaryRow_{player.SeatIndex}",
                typeof(RectTransform),
                typeof(Image),
                typeof(HorizontalLayoutGroup),
                typeof(LayoutElement));
            rowGo.transform.SetParent(_rosterContentRect, false);
            _rowObjects.Add(rowGo);

            var le = rowGo.GetComponent<LayoutElement>();
            le.preferredHeight = 62f;
            le.minHeight = 62f;

            var rowBg = rowGo.GetComponent<Image>();
            rowBg.color = isMe
                ? new Color(0.14f, 0.11f, 0.08f, 0.98f)
                : ModalUiKit.ObsidianSubCardColor;

            var hlg = rowGo.GetComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(14, 14, 8, 8);
            hlg.spacing = 12f;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            // Portrait Thumbnail
            var portraitGo = new GameObject("Portrait", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
            portraitGo.transform.SetParent(rowGo.transform, false);
            var pLe = portraitGo.GetComponent<LayoutElement>();
            pLe.preferredWidth = 46f;
            pLe.preferredHeight = 46f;
            var pImg = portraitGo.GetComponent<Image>();
            Sprite heroSprite = ModalUiKit.ResolveHeroSprite(_catalog, hero);
            pImg.sprite = heroSprite;
            pImg.preserveAspect = true;
            pImg.color = heroSprite != null ? Color.white : ModalUiKit.ObsidianInsetColor;

            // Player & Hero Name
            var nameTmp = ModalUiKit.CreateTmp(
                "PlayerHeroName",
                rowGo.transform,
                _serifFont != null ? _serifFont : _sansFont,
                17f,
                ModalUiKit.GoldIvoryColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineLeft);
            var nameLe = nameTmp.gameObject.AddComponent<LayoutElement>();
            nameLe.flexibleWidth = 1f;
            nameTmp.text = $"{playerName}{seatTag} · {hero.NameVi} ({hero.FactionVi})";

            // True Revealed Identity
            var roleTmp = ModalUiKit.CreateTmp(
                "TrueIdentity",
                rowGo.transform,
                _sansFont != null ? _sansFont : _serifFont,
                16f,
                GetIdentityColor(player.Identity),
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            var roleLe = roleTmp.gameObject.AddComponent<LayoutElement>();
            roleLe.preferredWidth = 140f;
            roleTmp.text = roleVi;

            // Final HP
            int clampedHp = Mathf.Max(0, player.Hp);
            int maxHp = Mathf.Max(clampedHp, player.MaxHp > 0 ? player.MaxHp : hero.MaxHp);
            string hpState = player.Alive ? $"Máu: {clampedHp}/{maxHp}" : $"Trọng thương (0/{maxHp})";
            var hpTmp = ModalUiKit.CreateTmp(
                "FinalHp",
                rowGo.transform,
                _monoFont != null ? _monoFont : _sansFont,
                15f,
                player.Alive ? ModalUiKit.BodyIvoryColor : ModalUiKit.MutedSandColor,
                FontStyles.Bold,
                TextAlignmentOptions.Center);
            var hpLe = hpTmp.gameObject.AddComponent<LayoutElement>();
            hpLe.preferredWidth = 170f;
            hpTmp.text = hpState;

            // Win/Loss Badge
            var resultTmp = ModalUiKit.CreateTmp(
                "ResultBadge",
                rowGo.transform,
                _sansFont != null ? _sansFont : _serifFont,
                16f,
                isWinner ? ModalUiKit.EmeraldAccentColor : ModalUiKit.CrimsonAccentColor,
                FontStyles.Bold,
                TextAlignmentOptions.MidlineRight);
            var resLe = resultTmp.gameObject.AddComponent<LayoutElement>();
            resLe.preferredWidth = 110f;
            resultTmp.text = isWinner ? "THẮNG" : "THUA";
        }

        private void ClearRows()
        {
            for (int i = 0; i < _rowObjects.Count; i++)
            {
                if (_rowObjects[i] != null)
                {
                    Destroy(_rowObjects[i]);
                }
            }
            _rowObjects.Clear();
        }

        private static bool IsIdentityInWinningFaction(string identity, string winningFaction)
        {
            if (string.IsNullOrEmpty(identity) || string.IsNullOrEmpty(winningFaction)) return false;
            string id = identity.Trim().ToUpperInvariant();
            string wf = winningFaction.Trim().ToUpperInvariant();
            return wf switch
            {
                "LORD_LOYALIST" => id == "LORD" || id == "LOYALIST",
                "REBEL" => id == "REBEL",
                "SPY" => id == "SPY",
                _ => false,
            };
        }

        private static Color GetIdentityColor(string identity)
        {
            if (string.IsNullOrEmpty(identity)) return ModalUiKit.MutedSandColor;
            return identity.Trim().ToUpperInvariant() switch
            {
                "LORD" => ModalUiKit.AmberAccentColor,
                "LOYALIST" => new Color(0.40f, 0.76f, 0.96f, 1f),
                "REBEL" => ModalUiKit.CrimsonAccentColor,
                "SPY" => new Color(0.76f, 0.56f, 0.96f, 1f),
                _ => ModalUiKit.MutedSandColor,
            };
        }
    }
}
