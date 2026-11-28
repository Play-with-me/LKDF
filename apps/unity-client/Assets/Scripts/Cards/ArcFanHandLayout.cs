using System;
using System.Collections.Generic;
using CuuChau.Data;
using CuuChau.Net;
using TMPro;
using UnityEngine;

namespace CuuChau.Cards
{
    /// <summary>
    /// Bố trí 1–12 lá bài trên tay thành cung quạt vật lý mềm mại ở đáy bàn,
    /// tự co cung góc theo số lá để không tràn ngang ở 1920x1080 lẫn 1280x720,
    /// kèm cơ chế Rẽ Quạt Né Lá (Neighbor Parting) khi soi lá 1.7x.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class ArcFanHandLayout : MonoBehaviour
    {
        [Header("Thông Số Cung Quạt Bàn Đấu")]
        [SerializeField] private float fanRadius = 1150f;
        [SerializeField] private float baseCardY = -14f;
        [SerializeField] private float baseCardScale = 0.88f;
        [SerializeField] private float minCardScaleAtMaxHand = 0.74f;
        [SerializeField] private float maxSingleStepDeg = 5.4f;
        [SerializeField] private float maxTotalArcDeg = 42f;
        [SerializeField] private float maxHorizontalSpan = 1040f;

        [Header("Rẽ Quạt Né Lá (Neighbor Parting)")]
        [SerializeField] private float hoverScale = 1.42f;
        [SerializeField] private float hoverLiftY = 54f;
        [SerializeField] private float neighborMinPartPx = 34f;
        [SerializeField] private float neighborMaxPartPx = 56f;

        private readonly List<CardView25D> _activeCards = new();
        private readonly List<CardView25D> _cardPool = new();

        private RectTransform _rectTransform;
        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private Material _sharedBurnMaterial;
        private int _hoveredIndex = -1;

        public int CardCount => _activeCards.Count;
        public int HoveredIndex => _hoveredIndex;

        public RectTransform RectTransform
        {
            get
            {
                if (_rectTransform == null)
                {
                    _rectTransform = GetComponent<RectTransform>();
                }
                return _rectTransform;
            }
        }

        public event Action<CardView25D> OnCardHovered;
        public event Action<CardView25D> OnCardClicked;
        public event Action<CardView25D, Vector2> OnCardDragMoved;
        public event Action<CardView25D, Vector2, bool> OnCardReleased;

        private void Awake()
        {
            _rectTransform = GetComponent<RectTransform>();
        }

        public void InitializeFan(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            _catalog = catalog;
            _serifFont = serifFont;
            _sansFont = sansFont;
            _monoFont = monoFont;
        }

        public void SetSharedBurnMaterial(Material burnMaterial)
        {
            _sharedBurnMaterial = burnMaterial;
            for (int i = 0; i < _activeCards.Count; i++)
            {
                _activeCards[i].SetBurnMaterial(_sharedBurnMaterial);
            }
        }

        public void SetCards(List<CardInstanceDto> cards, Func<CardInstanceDto, bool> playablePredicate)
        {
            int prevCount = _activeCards.Count;
            int targetCount = cards != null ? cards.Count : 0;
            EnsureActiveCardCount(targetCount);
            _hoveredIndex = -1;

            for (int i = 0; i < targetCount; i++)
            {
                CardInstanceDto dto = cards[i];
                if (dto == null) continue;

                bool playable = playablePredicate != null && playablePredicate(dto);
                Sprite art = _catalog != null ? _catalog.FindCardArt(dto.CardKey) : null;
                Sprite suit = _catalog != null ? _catalog.GetSuitSprite(dto.Suit) : null;

                CardView25D view = _activeCards[i];
                view.BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);
                if (_sharedBurnMaterial != null)
                {
                    view.SetBurnMaterial(_sharedBurnMaterial);
                }

                view.BindCard(
                    dto.Id,
                    dto.CardKey,
                    dto.NameVi,
                    dto.Rank,
                    dto.Suit,
                    art,
                    suit,
                    playable,
                    faceUp: true);
                view.SetSelected(false);
            }

            if (Application.isPlaying && prevCount > 0)
            {
                ApplyRestPosesToActiveCards(_hoveredIndex);
            }
            else
            {
                ForceLayoutImmediate(_hoveredIndex);
            }
        }

        public void PopulateDemoHand(int hoveredIndex = 2)
        {
            var demoCards = new List<CardInstanceDto>
            {
                new() { Id = "demo_1", CardKey = "dao", NameVi = "Đào", Rank = "3", Suit = "HEART", Category = "BASIC" },
                new() { Id = "demo_2", CardKey = "vo_giai_kha_kich", NameVi = "Hóa Giải Chân Khí", Rank = "10", Suit = "SPADE", Category = "SCROLL" },
                new() { Id = "demo_3", CardKey = "sat", NameVi = "Trảm", Rank = "7", Suit = "SPADE", Category = "BASIC" },
                new() { Id = "demo_4", CardKey = "thiem", NameVi = "Thiểm", Rank = "2", Suit = "DIAMOND", Category = "BASIC" },
                new() { Id = "demo_5", CardKey = "bat_quai_tran", NameVi = "Bát Quái Trận", Rank = "2", Suit = "CLUB", Category = "EQUIP" },
            };

            SetCards(demoCards, dto => dto.CardKey == "dao" || dto.CardKey == "sat" || dto.CardKey == "bat_quai_tran");
            ForceLayoutImmediate(hoveredIndex);
        }

        public void ForceLayoutImmediate(int hoveredIndex = -1)
        {
            int count = _activeCards.Count;
            if (count == 0)
            {
                _hoveredIndex = -1;
                return;
            }

            _hoveredIndex = (hoveredIndex >= 0 && hoveredIndex < count) ? hoveredIndex : -1;
            ComputeFanMetrics(count, out float stepDeg, out float restScale);

            for (int i = 0; i < count; i++)
            {
                CardView25D card = _activeCards[i];
                ComputeCardPose(i, count, stepDeg, restScale, -1, out Vector2 restPos, out float restRot, out float baseScale);
                restPos.x += ComputeNeighborPartingOffset(i, _hoveredIndex);

                bool isHovered = i == _hoveredIndex;
                Vector2 visualPos = isHovered ? restPos + new Vector2(0f, hoverLiftY) : restPos;
                float visualRot = isHovered ? 0f : restRot;
                float visualScale = isHovered ? hoverScale : baseScale;

                card.SetHoverStateImmediate(isHovered);
                card.ForceTransformImmediate(visualPos, visualRot, visualScale, isHovered ? count - 1 : i);
                card.SetRestPose(restPos, restRot, baseScale, i);
            }

            if (_hoveredIndex >= 0 && _hoveredIndex < count)
            {
                _activeCards[_hoveredIndex].transform.SetAsLastSibling();
            }
        }

        public CardView25D GetCardView(int index)
        {
            if (index < 0 || index >= _activeCards.Count)
            {
                return null;
            }
            return _activeCards[index];
        }

        private void EnsureActiveCardCount(int count)
        {
            // Thu hồi card dư về pool
            while (_activeCards.Count > count)
            {
                int lastIdx = _activeCards.Count - 1;
                CardView25D card = _activeCards[lastIdx];
                _activeCards.RemoveAt(lastIdx);
                UnsubscribeCardEvents(card);
                card.gameObject.SetActive(false);
                _cardPool.Add(card);
            }

            // Cấp phát thêm card từ pool hoặc tạo mới
            while (_activeCards.Count < count)
            {
                CardView25D card;
                if (_cardPool.Count > 0)
                {
                    int poolLast = _cardPool.Count - 1;
                    card = _cardPool[poolLast];
                    _cardPool.RemoveAt(poolLast);
                    card.gameObject.SetActive(true);
                }
                else
                {
                    var go = new GameObject($"HandCard_{_activeCards.Count}", typeof(RectTransform), typeof(CardView25D));
                    go.transform.SetParent(transform, false);
                    card = go.GetComponent<CardView25D>();
                }

                card.name = $"HandCard_{_activeCards.Count}";
                card.BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);
                SubscribeCardEvents(card);
                _activeCards.Add(card);
            }
        }

        private void SubscribeCardEvents(CardView25D card)
        {
            UnsubscribeCardEvents(card);
            card.OnHoverChanged += HandleCardHoverChanged;
            card.OnClicked += HandleCardClicked;
            card.OnDragMoved += HandleCardDragMoved;
            card.OnReleased += HandleCardReleased;
        }

        private void UnsubscribeCardEvents(CardView25D card)
        {
            if (card == null) return;
            card.OnHoverChanged -= HandleCardHoverChanged;
            card.OnClicked -= HandleCardClicked;
            card.OnDragMoved -= HandleCardDragMoved;
            card.OnReleased -= HandleCardReleased;
        }

        private void HandleCardHoverChanged(CardView25D card, bool hovered)
        {
            int idx = _activeCards.IndexOf(card);
            if (idx < 0) return;

            if (hovered)
            {
                _hoveredIndex = idx;
                ApplyRestPosesToActiveCards(_hoveredIndex);
                card.transform.SetAsLastSibling();
                OnCardHovered?.Invoke(card);
            }
            else if (_hoveredIndex == idx)
            {
                _hoveredIndex = -1;
                ApplyRestPosesToActiveCards(-1);
                OnCardHovered?.Invoke(null);
            }
        }

        private void HandleCardClicked(CardView25D card)
        {
            OnCardClicked?.Invoke(card);
        }

        private void HandleCardDragMoved(CardView25D card, Vector2 screenPos)
        {
            OnCardDragMoved?.Invoke(card, screenPos);
        }

        private void HandleCardReleased(CardView25D card, Vector2 screenPos, bool abovePlayThreshold)
        {
            OnCardReleased?.Invoke(card, screenPos, abovePlayThreshold);
        }

        private void ApplyRestPosesToActiveCards(int hoveredIdx)
        {
            int count = _activeCards.Count;
            if (count == 0) return;

            ComputeFanMetrics(count, out float stepDeg, out float restScale);

            for (int i = 0; i < count; i++)
            {
                CardView25D card = _activeCards[i];
                ComputeCardPose(i, count, stepDeg, restScale, -1, out Vector2 basePos, out float baseRot, out float baseScale);
                float partX = ComputeNeighborPartingOffset(i, hoveredIdx);
                card.SetRestPose(basePos + new Vector2(partX, 0f), baseRot, baseScale, i);

                if (i != hoveredIdx && !card.IsDragging)
                {
                    card.transform.SetSiblingIndex(i);
                }
            }

            if (hoveredIdx >= 0 && hoveredIdx < count)
            {
                _activeCards[hoveredIdx].transform.SetAsLastSibling();
            }
        }

        private void ComputeFanMetrics(int count, out float stepDeg, out float restScale)
        {
            if (count <= 1)
            {
                stepDeg = 0f;
                restScale = baseCardScale;
                return;
            }

            float containerWidth = RectTransform.rect.width;
            float safeSpan = containerWidth > 320f
                ? Mathf.Min(maxHorizontalSpan, containerWidth - 240f)
                : maxHorizontalSpan;

            if (count <= 12)
            {
                float tHand = Mathf.InverseLerp(5f, 12f, count);
                restScale = Mathf.Lerp(baseCardScale, minCardScaleAtMaxHand, tHand);
            }
            else
            {
                restScale = Mathf.Max(0.56f, minCardScaleAtMaxHand - (count - 12) * 0.022f);
                if (containerWidth > 320f)
                {
                    safeSpan = Mathf.Min(maxHorizontalSpan, Mathf.Max(safeSpan, containerWidth - 170f));
                }
            }

            float effectiveRadius = GetEffectiveFanRadius(count);
            float cardScaledWidth = CardView25D.DefaultCardSize.x * restScale;
            float centerToCenterSpan = Mathf.Max(220f, safeSpan - cardScaledWidth);
            float maxHalfRadFromSpan = Mathf.Asin(Mathf.Clamp((centerToCenterSpan * 0.5f) / Mathf.Max(200f, effectiveRadius), 0.05f, 0.92f));
            float maxTotalArcFromSpanDeg = maxHalfRadFromSpan * Mathf.Rad2Deg * 2f;

            float allowedTotalArc = Mathf.Min(maxTotalArcDeg, maxTotalArcFromSpanDeg);
            float effectiveSingleStep = count > 12
                ? Mathf.Max(1.05f, maxSingleStepDeg * (12f / count))
                : maxSingleStepDeg;
            float desiredTotalArc = (count - 1) * effectiveSingleStep;
            float actualTotalArc = Mathf.Min(desiredTotalArc, allowedTotalArc);

            stepDeg = actualTotalArc / (count - 1);
        }

        private float GetEffectiveFanRadius(int count)
        {
            if (count <= 12) return fanRadius;
            float extra = Mathf.Min(12, count - 12) * 0.035f;
            return fanRadius * (1f + extra);
        }

        private void ComputeCardPose(
            int index,
            int count,
            float stepDeg,
            float restScale,
            int hoveredIdx,
            out Vector2 anchoredPos,
            out float rotationZDeg,
            out float scale)
        {
            float effectiveRadius = GetEffectiveFanRadius(count);
            float centeredIndex = index - (count - 1) * 0.5f;
            float angleFromUpDeg = centeredIndex * stepDeg;
            float angleRad = angleFromUpDeg * Mathf.Deg2Rad;

            float x = effectiveRadius * Mathf.Sin(angleRad);
            float yDrop = effectiveRadius * (1f - Mathf.Cos(angleRad));
            float y = baseCardY - yDrop;

            x += ComputeNeighborPartingOffset(index, hoveredIdx);

            if (index == hoveredIdx)
            {
                anchoredPos = new Vector2(x, y + hoverLiftY);
                rotationZDeg = 0f;
                scale = hoverScale;
            }
            else
            {
                anchoredPos = new Vector2(x, y);
                rotationZDeg = -angleFromUpDeg;
                scale = restScale;
            }
        }

        private float ComputeNeighborPartingOffset(int index, int hoveredIdx)
        {
            if (hoveredIdx < 0 || index == hoveredIdx)
            {
                return 0f;
            }

            int distance = Mathf.Abs(index - hoveredIdx);
            float magnitude = Mathf.Max(neighborMinPartPx, neighborMaxPartPx - (distance - 1) * 9f);
            return index < hoveredIdx ? -magnitude : magnitude;
        }
    }
}
