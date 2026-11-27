using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Arena
{
    /// <summary>
    /// Khay nhỏ hiển thị các lá phán xét trì hoãn trên ghế
    /// (Lạc Bất Tư Thục / Điểm Huyệt Phong Mạch, Sấm Sét / Thiên Lôi Kiếp, Thảo Phạt Hết Lương) kèm chất + điểm.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class SpecialCardTrayView : MonoBehaviour
    {
        private sealed class PillView
        {
            public GameObject Root;
            public Image Background;
            public Image SuitIcon;
            public TextMeshProUGUI Label;
        }

        private readonly List<PillView> _pills = new();
        private HorizontalLayoutGroup _layout;
        private VisualCatalogSO _catalog;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _built;

        public void BuildHierarchyIfNeeded(VisualCatalogSO catalog, TMP_FontAsset sansFont, TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_built) return;

            var rect = transform as RectTransform;
            if (rect == null) rect = gameObject.AddComponent<RectTransform>();

            _layout = GetComponent<HorizontalLayoutGroup>();
            if (_layout == null) _layout = gameObject.AddComponent<HorizontalLayoutGroup>();
            _layout.spacing = 6f;
            _layout.childAlignment = TextAnchor.MiddleLeft;
            _layout.childControlWidth = false;
            _layout.childControlHeight = false;
            _layout.childForceExpandWidth = false;
            _layout.childForceExpandHeight = false;

            _built = true;
            gameObject.SetActive(false);
        }

        public void BindDelayedScrolls(List<CardInstanceDto> scrolls, VisualCatalogSO catalog)
        {
            if (catalog != null) _catalog = catalog;
            if (!_built) BuildHierarchyIfNeeded(_catalog, _sansFont, _monoFont);

            if (scrolls == null || scrolls.Count == 0)
            {
                Clear();
                return;
            }

            gameObject.SetActive(true);
            EnsurePillPool(scrolls.Count);

            for (int i = 0; i < _pills.Count; i++)
            {
                PillView pill = _pills[i];
                if (i >= scrolls.Count)
                {
                    pill.Root.SetActive(false);
                    continue;
                }

                CardInstanceDto card = scrolls[i];
                pill.Root.SetActive(true);

                bool isLightning = card.CardKey == "thiem_dien";
                bool isStarve = card.CardKey == "binh_luong_thon_doan";
                pill.Background.color = isLightning
                    ? new Color(0.24f, 0.14f, 0.34f, 0.92f)
                    : isStarve
                        ? new Color(0.32f, 0.16f, 0.08f, 0.92f)
                        : new Color(0.36f, 0.10f, 0.10f, 0.92f);

                Sprite suitSprite = _catalog != null ? _catalog.GetSuitSprite(card.Suit) : null;
                if (suitSprite != null)
                {
                    pill.SuitIcon.sprite = suitSprite;
                    pill.SuitIcon.color = (card.Suit == "HEART" || card.Suit == "DIAMOND")
                        ? new Color(0.98f, 0.45f, 0.36f, 1f)
                        : new Color(0.94f, 0.90f, 0.80f, 1f);
                    pill.SuitIcon.enabled = true;
                }
                else
                {
                    pill.SuitIcon.enabled = false;
                }

                string shortTitle = ResolveShortScrollName(card.CardKey, card.NameVi);
                string rankText = string.IsNullOrEmpty(card.Rank) ? string.Empty : $"{card.Rank} ";
                pill.Label.text = $"{rankText}{shortTitle}";
            }
        }

        public void Clear()
        {
            for (int i = 0; i < _pills.Count; i++)
            {
                if (_pills[i].Root != null) _pills[i].Root.SetActive(false);
            }
            gameObject.SetActive(false);
        }

        private void EnsurePillPool(int count)
        {
            while (_pills.Count < count)
            {
                _pills.Add(CreatePill(_pills.Count));
            }
        }

        private PillView CreatePill(int index)
        {
            var go = new GameObject($"DelayedPill_{index}", typeof(RectTransform), typeof(Image));
            go.transform.SetParent(transform, false);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(118f, 24f);

            var bg = go.GetComponent<Image>();
            bg.color = new Color(0.32f, 0.11f, 0.11f, 0.92f);
            bg.raycastTarget = false;

            var suitGo = new GameObject("Suit", typeof(RectTransform), typeof(Image));
            suitGo.transform.SetParent(rt, false);
            var suitRt = suitGo.GetComponent<RectTransform>();
            suitRt.anchorMin = new Vector2(0f, 0.5f);
            suitRt.anchorMax = new Vector2(0f, 0.5f);
            suitRt.pivot = new Vector2(0f, 0.5f);
            suitRt.anchoredPosition = new Vector2(5f, 0f);
            suitRt.sizeDelta = new Vector2(14f, 14f);
            var suitImg = suitGo.GetComponent<Image>();
            suitImg.preserveAspect = true;
            suitImg.raycastTarget = false;

            var textGo = new GameObject("Text", typeof(RectTransform), typeof(TextMeshProUGUI));
            textGo.transform.SetParent(rt, false);
            var textRt = textGo.GetComponent<RectTransform>();
            textRt.anchorMin = Vector2.zero;
            textRt.anchorMax = Vector2.one;
            textRt.offsetMin = new Vector2(21f, 0f);
            textRt.offsetMax = new Vector2(-4f, 0f);

            var tmp = textGo.GetComponent<TextMeshProUGUI>();
            TMP_FontAsset font = _monoFont != null ? _monoFont : _sansFont;
            if (_sansFont != null) font = _sansFont;
            if (font != null) tmp.font = font;
            tmp.fontSize = 15f;
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = new Color(0.98f, 0.93f, 0.80f, 1f);
            tmp.alignment = TextAlignmentOptions.MidlineLeft;
            tmp.textWrappingMode = TextWrappingModes.NoWrap;
            tmp.overflowMode = TextOverflowModes.Truncate;
            tmp.raycastTarget = false;

            return new PillView
            {
                Root = go,
                Background = bg,
                SuitIcon = suitImg,
                Label = tmp,
            };
        }

        private static string ResolveShortScrollName(string cardKey, string fallbackNameVi)
        {
            return cardKey switch
            {
                "lac_bat_tu_thuc" => "Lạc",
                "thiem_dien" => "Sét",
                "binh_luong_thon_doan" => "Lương",
                _ => string.IsNullOrEmpty(fallbackNameVi) ? "Ấn" : fallbackNameVi,
            };
        }
    }
}
