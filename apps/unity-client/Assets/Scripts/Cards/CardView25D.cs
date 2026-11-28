using System;
using CuuChau.Data;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CuuChau.Cards
{
    /// <summary>
    /// Thẻ bài 2.5D tương tác cho uGUI + TMP:
    /// khung 9-slice, cửa sổ tranh lọt lòng, huy hiệu Số+Chất nền tối góc trên-trái,
    /// tiêu đề mực obsidian trên dải giấy dó, vật lý lò xo 60fps và ngưỡng kéo quăng bài.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class CardView25D : MonoBehaviour,
        IPointerEnterHandler,
        IPointerExitHandler,
        IPointerDownHandler,
        IBeginDragHandler,
        IDragHandler,
        IEndDragHandler,
        IPointerClickHandler
    {
        public static readonly Vector2 DefaultCardSize = new Vector2(210f, 296f);

        private static readonly Color InkObsidianColor = new Color(0.11f, 0.08f, 0.06f, 1f);
        private static readonly Color BadgeBackdropColor = new Color(0.06f, 0.05f, 0.045f, 0.88f);
        private static readonly Color ArtBackdropColor = new Color(0.06f, 0.05f, 0.045f, 1f);
        private static readonly Color RankLightColor = new Color(0.96f, 0.92f, 0.84f, 1f);
        private static readonly Color RankCrimsonColor = new Color(0.94f, 0.42f, 0.36f, 1f);
        private static readonly Color GlowIdlePlayableColor = new Color(0.90f, 0.72f, 0.28f, 0.32f);
        private static readonly Color GlowActiveColor = new Color(0.95f, 0.78f, 0.32f, 0.38f);
        private static readonly Color GlowCommitColor = new Color(0.92f, 0.30f, 0.18f, 0.55f);
        private static readonly Color UnplayableTint = new Color(0.60f, 0.57f, 0.54f, 1f);

        private const float UnplayableDragMaxResistancePx = 14f;
        private const float RejectShakeDurationSec = 0.13f;
        private const float RejectShakeAmplitudePx = 9f;

        private static readonly int DissolveAmountId = Shader.PropertyToID("_DissolveAmount");

        [Header("Vật Lý Thẻ Bài")]
        [SerializeField] private float hoverScale = 1.42f;
        [SerializeField] private float hoverLiftY = 54f;
        [SerializeField] private float dragScale = 1.18f;
        [SerializeField] private float playThresholdY = 150f;
        [SerializeField] private float positionSmoothTime = 0.048f;
        [SerializeField] private float rotationSmoothTime = 0.050f;
        [SerializeField] private float scaleSmoothTime = 0.045f;
        [SerializeField] private float maxDragTiltDeg = 10f;

        private RectTransform _rectTransform;
        private Image _selectionGlowImage;
        private Image _frameImage;
        private Image _artBackdropImage;
        private Image _artImage;
        private Image _badgeImage;
        private TextMeshProUGUI _rankText;
        private Image _suitImage;
        private TextMeshProUGUI _titleText;
        private Image _cardBackImage;

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _hierarchyBuilt;

        private Material _burnMaterialTemplate;
        private Material _burnMaterialInstance;
        private bool _burnMaterialApplied;
        private float _dissolveAmount;

        private bool _rejectShakeActive;
        private float _rejectShakeElapsed;
        private float _lastShakeOffsetX;

        private Vector2 _restAnchoredPos;
        private float _restRotationZ;
        private float _restScale = 1f;
        private int _baseSiblingIndex = -1;

        private Vector2 _targetAnchoredPos;
        private float _targetRotationZ;
        private float _targetScale = 1f;

        private Vector2 _posVelocity;
        private float _rotVelocity;
        private float _scaleVelocity;

        private Vector2 _dragOffsetLocal;
        private bool _draggedThisPress;
        private bool _abovePlayThreshold;

        public string InstanceId { get; private set; }
        public string CardKey { get; private set; }
        public string TitleVi { get; private set; }
        public string Rank { get; private set; }
        public string Suit { get; private set; }
        public bool IsPlayable { get; private set; }
        public bool IsFaceUp { get; private set; } = true;
        public bool IsHovered { get; private set; }
        public bool IsDragging { get; private set; }
        public bool IsSelected { get; private set; }
        public float PlayThresholdY => playThresholdY;
        public float HoverScale => hoverScale;

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

        public event Action<CardView25D, bool> OnHoverChanged;
        public event Action<CardView25D> OnClicked;
        public event Action<CardView25D, Vector2> OnDragMoved;
        public event Action<CardView25D, Vector2, bool> OnReleased;

        private void Awake()
        {
            _rectTransform = GetComponent<RectTransform>();
        }

        private void OnDestroy()
        {
            ReleaseBurnMaterialInstance();
        }

        private void Update()
        {
            if (!Application.isPlaying || !_hierarchyBuilt)
            {
                return;
            }

            float dt = Mathf.Clamp(Time.unscaledDeltaTime, 0.0001f, 0.05f);
            RectTransform rt = RectTransform;

            Vector2 unshakenPos = rt.anchoredPosition - new Vector2(_lastShakeOffsetX, 0f);
            Vector2 nextPos = Vector2.SmoothDamp(unshakenPos, _targetAnchoredPos, ref _posVelocity, positionSmoothTime, Mathf.Infinity, dt);

            float shakeOffsetX = 0f;
            if (_rejectShakeActive)
            {
                _rejectShakeElapsed += Time.unscaledDeltaTime;
                if (_rejectShakeElapsed >= RejectShakeDurationSec)
                {
                    _rejectShakeActive = false;
                    _rejectShakeElapsed = 0f;
                    if (!IsHovered && !IsDragging && (nextPos - _targetAnchoredPos).sqrMagnitude < 0.25f)
                    {
                        nextPos = _targetAnchoredPos;
                        _posVelocity = Vector2.zero;
                    }
                }
                else
                {
                    float progress = _rejectShakeElapsed / RejectShakeDurationSec;
                    float damper = 1f - progress;
                    shakeOffsetX = Mathf.Sin(progress * Mathf.PI * 5f) * RejectShakeAmplitudePx * damper;
                }
            }

            _lastShakeOffsetX = shakeOffsetX;
            rt.anchoredPosition = nextPos + new Vector2(shakeOffsetX, 0f);

            float desiredRot = _targetRotationZ;
            if (IsDragging && IsPlayable)
            {
                desiredRot = Mathf.Clamp(-_posVelocity.x * 0.015f, -maxDragTiltDeg, maxDragTiltDeg);
            }

            float currentRot = NormalizeSignedAngle(rt.localEulerAngles.z);
            float nextRot = Mathf.SmoothDampAngle(currentRot, desiredRot, ref _rotVelocity, rotationSmoothTime, Mathf.Infinity, dt);
            rt.localRotation = Quaternion.Euler(0f, 0f, nextRot);

            float currentScale = rt.localScale.x;
            float nextScale = Mathf.SmoothDamp(currentScale, _targetScale, ref _scaleVelocity, scaleSmoothTime, Mathf.Infinity, dt);
            rt.localScale = new Vector3(nextScale, nextScale, 1f);
        }

        public void BuildHierarchyIfNeeded(
            VisualCatalogSO catalog,
            TMP_FontAsset serifFont,
            TMP_FontAsset sansFont,
            TMP_FontAsset monoFont)
        {
            if (catalog != null) _catalog = catalog;
            if (serifFont != null) _serifFont = serifFont;
            if (sansFont != null) _sansFont = sansFont;
            if (monoFont != null) _monoFont = monoFont;

            if (_hierarchyBuilt && _frameImage != null && _artImage != null && _rankText != null && _titleText != null)
            {
                ApplyFontAndCatalogRefs();
                return;
            }

            RectTransform rt = RectTransform;
            rt.pivot = new Vector2(0.5f, 0.5f);
            if (rt.sizeDelta.sqrMagnitude < 1f)
            {
                rt.sizeDelta = DefaultCardSize;
            }

            // 1. Viền sáng 9-slice ôm sát khung lá bài (không bao giờ hiện hộp chữ nhật phẳng)
            _selectionGlowImage = GetOrCreateImage("SelectionGlow", rt, Vector2.zero, new Vector2(216f, 302f), raycastTarget: false);
            _selectionGlowImage.type = Image.Type.Sliced;
            _selectionGlowImage.preserveAspect = false;
            _selectionGlowImage.color = Color.clear;

            // 2. Khung 9-slice gỗ mun & đồng cổ (nền giấy dó ở nửa dưới)
            _frameImage = GetOrCreateImage("CardFrame", rt, Vector2.zero, DefaultCardSize, raycastTarget: true);
            _frameImage.type = Image.Type.Sliced;
            _frameImage.preserveAspect = false;

            // 3. Lòng tối cửa sổ tranh lọt lòng bên trong viền đồng (không đè khung)
            _artBackdropImage = GetOrCreateImage("CardArtBackdrop", rt, new Vector2(0f, 40f), new Vector2(158f, 152f), raycastTarget: false);
            _artBackdropImage.color = ArtBackdropColor;

            // 4. Cửa sổ tranh minh họa thu gọn lọt lòng (156x150 trên lá 210x296), không đè góc hoa văn đồng
            _artImage = GetOrCreateImage("CardArt", rt, new Vector2(0f, 40f), new Vector2(156f, 150f), raycastTarget: false);
            _artImage.preserveAspect = true;

            // 5. Huy hiệu nền tối bán trong suốt góc trên-trái cho Số Điểm + Chất bài
            _badgeImage = GetOrCreateImage("RankSuitBadge", rt, new Vector2(-53f, 84f), new Vector2(40f, 68f), raycastTarget: false);
            _badgeImage.color = BadgeBackdropColor;

            _rankText = GetOrCreateTmp("RankText", _badgeImage.rectTransform, new Vector2(0f, 15f), new Vector2(42f, 34f), 26f, TextAlignmentOptions.Center);
            _rankText.fontStyle = FontStyles.Bold;
            _rankText.textWrappingMode = TextWrappingModes.NoWrap;

            _suitImage = GetOrCreateImage("SuitIcon", _badgeImage.rectTransform, new Vector2(0f, -17f), new Vector2(26f, 26f), raycastTarget: false);
            _suitImage.preserveAspect = true;

            // 6. Dải giấy dó đáy lá bài: chữ mực obsidian đậm #1C140F (lọt gọn 146px trong cửa sổ giấy dó, không chạm viền đồng)
            _titleText = GetOrCreateTmp("CardTitle", rt, new Vector2(0f, -86f), new Vector2(146f, 62f), 17f, TextAlignmentOptions.Center);
            _titleText.fontStyle = FontStyles.Bold;
            _titleText.color = InkObsidianColor;
            _titleText.richText = true;
            _titleText.textWrappingMode = TextWrappingModes.Normal;
            _titleText.overflowMode = TextOverflowModes.Truncate;
            _titleText.enableAutoSizing = true;
            _titleText.fontSizeMin = 12f;
            _titleText.fontSizeMax = 17.5f;
            _titleText.lineSpacing = -4f;

            // 7. Mặt lưng bài úp
            _cardBackImage = GetOrCreateImage("CardBackOverlay", rt, Vector2.zero, DefaultCardSize, raycastTarget: false);
            _cardBackImage.preserveAspect = false;
            _cardBackImage.gameObject.SetActive(false);

            ApplyFontAndCatalogRefs();
            _hierarchyBuilt = true;
        }

        public void BindCard(
            string instanceId,
            string cardKey,
            string titleVi,
            string rank,
            string suit,
            Sprite artSprite,
            Sprite suitSprite,
            bool isPlayable,
            bool faceUp = true)
        {
            BuildHierarchyIfNeeded(_catalog, _serifFont, _sansFont, _monoFont);

            InstanceId = instanceId;
            CardKey = cardKey;
            TitleVi = titleVi;
            Rank = rank;
            Suit = suit;
            IsPlayable = isPlayable;
            IsFaceUp = faceUp;

            if (_artImage != null)
            {
                Sprite resolvedArt = artSprite != null ? artSprite : (_catalog != null ? _catalog.FindCardArt(cardKey) : null);
                _artImage.sprite = resolvedArt;
                _artImage.enabled = faceUp && resolvedArt != null;
            }

            if (_suitImage != null)
            {
                Sprite resolvedSuit = suitSprite != null ? suitSprite : (_catalog != null ? _catalog.GetSuitSprite(suit) : null);
                _suitImage.sprite = resolvedSuit;
                _suitImage.enabled = faceUp && resolvedSuit != null;
            }

            if (_rankText != null)
            {
                _rankText.text = FormatCardRank(rank);
                _rankText.color = IsRedSuit(suit) ? RankCrimsonColor : RankLightColor;
            }

            if (_titleText != null)
            {
                _titleText.text = FormatCardTitleDisplay(titleVi, cardKey);
                _titleText.color = InkObsidianColor;
            }

            ApplyFaceUpState(faceUp);
            ApplyPlayabilityTint();
            RefreshGlowVisual();
        }

        public static string FormatCardRank(string rank)
        {
            if (string.IsNullOrWhiteSpace(rank))
            {
                return "?";
            }

            return rank.Trim() switch
            {
                "1" => "A",
                "11" => "J",
                "12" => "Q",
                "13" => "K",
                var r => r,
            };
        }

        public void SetBurnMaterial(Material mat)
        {
            if (_burnMaterialTemplate != mat)
            {
                ReleaseBurnMaterialInstance();
                _burnMaterialTemplate = mat;
            }

            if (_dissolveAmount > 0.001f)
            {
                SetDissolveAmount(_dissolveAmount);
            }
            else if (_burnMaterialApplied)
            {
                ApplyMaterialToImages(null);
            }
        }

        public void SetDissolveAmount(float t01)
        {
            _dissolveAmount = Mathf.Clamp01(t01);
            if (_dissolveAmount <= 0.001f || _burnMaterialTemplate == null)
            {
                if (_burnMaterialApplied)
                {
                    ApplyMaterialToImages(null);
                }
                return;
            }

            if (_burnMaterialInstance == null)
            {
                _burnMaterialInstance = new Material(_burnMaterialTemplate)
                {
                    hideFlags = HideFlags.DontSaveInEditor | HideFlags.DontSaveInBuild
                };
            }

            if (_burnMaterialInstance.HasProperty(DissolveAmountId))
            {
                _burnMaterialInstance.SetFloat(DissolveAmountId, _dissolveAmount);
            }

            if (!_burnMaterialApplied)
            {
                ApplyMaterialToImages(_burnMaterialInstance);
            }
        }

        public void PlayRejectShake()
        {
            _rejectShakeActive = true;
            _rejectShakeElapsed = 0f;
        }

        public void SetSelected(bool selected)
        {
            IsSelected = selected;
            RefreshGlowVisual();
        }

        public void SetRestPose(Vector2 anchoredPos, float zAngleDeg, float baseScale, int baseSiblingIndex)
        {
            _restAnchoredPos = anchoredPos;
            _restRotationZ = zAngleDeg;
            _restScale = baseScale;
            _baseSiblingIndex = baseSiblingIndex;

            if (!IsDragging)
            {
                ApplyTargetPoseFromState();
            }
        }

        public void SetHoverStateImmediate(bool hovered)
        {
            IsHovered = hovered;
            ApplyTargetPoseFromState();
            RefreshGlowVisual();
        }

        public void ForceTransformImmediate(Vector2 anchoredPos, float zAngleDeg, float scale, int siblingIndex = -1)
        {
            _restAnchoredPos = anchoredPos;
            _restRotationZ = zAngleDeg;
            _restScale = scale;
            if (siblingIndex >= 0)
            {
                _baseSiblingIndex = siblingIndex;
            }

            _targetAnchoredPos = anchoredPos;
            _targetRotationZ = zAngleDeg;
            _targetScale = scale;
            _posVelocity = Vector2.zero;
            _rotVelocity = 0f;
            _scaleVelocity = 0f;
            _rejectShakeActive = false;
            _rejectShakeElapsed = 0f;
            _lastShakeOffsetX = 0f;

            RectTransform rt = RectTransform;
            rt.anchoredPosition = anchoredPos;
            rt.localRotation = Quaternion.Euler(0f, 0f, zAngleDeg);
            rt.localScale = new Vector3(scale, scale, 1f);

            if (siblingIndex >= 0 && transform.parent != null)
            {
                int maxIdx = transform.parent.childCount - 1;
                transform.SetSiblingIndex(Mathf.Clamp(siblingIndex, 0, Mathf.Max(0, maxIdx)));
            }
        }

        public void OnPointerEnter(PointerEventData eventData)
        {
            if (IsDragging || IsHovered)
            {
                return;
            }

            IsHovered = true;
            ApplyTargetPoseFromState();
            RefreshGlowVisual();
            transform.SetAsLastSibling();
            OnHoverChanged?.Invoke(this, true);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            if (IsDragging || !IsHovered)
            {
                return;
            }

            IsHovered = false;
            ApplyTargetPoseFromState();
            RefreshGlowVisual();
            RestoreBaseSiblingIndex();
            OnHoverChanged?.Invoke(this, false);
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            _draggedThisPress = false;
        }

        public void OnBeginDrag(PointerEventData eventData)
        {
            if (!IsFaceUp)
            {
                return;
            }

            IsDragging = true;
            _draggedThisPress = true;
            _abovePlayThreshold = false;

            if (TryGetLocalPointInParent(eventData, out Vector2 localPoint))
            {
                _dragOffsetLocal = (RectTransform.anchoredPosition - new Vector2(_lastShakeOffsetX, 0f)) - localPoint;
            }
            else
            {
                _dragOffsetLocal = Vector2.zero;
            }

            if (!IsPlayable)
            {
                PlayRejectShake();
                ApplyTargetPoseFromState();
                RefreshGlowVisual();
                return;
            }

            transform.SetAsLastSibling();
            _targetScale = dragScale;
            RefreshGlowVisual();
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (!IsDragging)
            {
                return;
            }

            if (!IsPlayable)
            {
                Vector2 basePos = IsHovered
                    ? _restAnchoredPos + new Vector2(0f, hoverLiftY)
                    : _restAnchoredPos;
                if (TryGetLocalPointInParent(eventData, out Vector2 unplayableLocalPoint))
                {
                    Vector2 rawDelta = (unplayableLocalPoint + _dragOffsetLocal) - basePos;
                    _targetAnchoredPos = basePos + Vector2.ClampMagnitude(rawDelta, UnplayableDragMaxResistancePx);
                }
                else
                {
                    _targetAnchoredPos = basePos;
                }

                _abovePlayThreshold = false;
                RefreshGlowVisual();
                return;
            }

            if (TryGetLocalPointInParent(eventData, out Vector2 localPoint))
            {
                _targetAnchoredPos = localPoint + _dragOffsetLocal;
            }

            float liftDelta = _targetAnchoredPos.y - _restAnchoredPos.y;
            _abovePlayThreshold = liftDelta >= playThresholdY;
            _targetScale = _abovePlayThreshold ? 1.08f : dragScale;
            RefreshGlowVisual();

            OnDragMoved?.Invoke(this, eventData.position);
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            if (!IsDragging)
            {
                return;
            }

            bool releasedAboveThreshold = IsPlayable
                && (_abovePlayThreshold || (_targetAnchoredPos.y - _restAnchoredPos.y) >= playThresholdY);
            IsDragging = false;
            _abovePlayThreshold = false;

            ApplyTargetPoseFromState();
            if (!IsHovered)
            {
                RestoreBaseSiblingIndex();
            }
            RefreshGlowVisual();

            OnReleased?.Invoke(this, eventData.position, releasedAboveThreshold);
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (_draggedThisPress || eventData.dragging)
            {
                _draggedThisPress = false;
                return;
            }

            if (!IsPlayable)
            {
                PlayRejectShake();
            }

            OnClicked?.Invoke(this);
        }

        private void ApplyTargetPoseFromState()
        {
            if (IsHovered)
            {
                _targetAnchoredPos = _restAnchoredPos + new Vector2(0f, hoverLiftY);
                _targetRotationZ = 0f;
                _targetScale = hoverScale;
            }
            else
            {
                _targetAnchoredPos = _restAnchoredPos;
                _targetRotationZ = _restRotationZ;
                _targetScale = _restScale;
            }
        }

        private void RestoreBaseSiblingIndex()
        {
            if (_baseSiblingIndex >= 0 && transform.parent != null)
            {
                int maxIdx = transform.parent.childCount - 1;
                transform.SetSiblingIndex(Mathf.Clamp(_baseSiblingIndex, 0, Mathf.Max(0, maxIdx)));
            }
        }

        private void ApplyFontAndCatalogRefs()
        {
            if (_selectionGlowImage != null && _catalog != null && _catalog.cardFrame9Slice != null)
            {
                _selectionGlowImage.sprite = _catalog.cardFrame9Slice;
                _selectionGlowImage.type = Image.Type.Sliced;
            }
            if (_frameImage != null && _catalog != null && _catalog.cardFrame9Slice != null)
            {
                _frameImage.sprite = _catalog.cardFrame9Slice;
            }
            if (_cardBackImage != null && _catalog != null && _catalog.cardBackCuuChau != null)
            {
                _cardBackImage.sprite = _catalog.cardBackCuuChau;
            }
            if (_rankText != null)
            {
                TMP_FontAsset resolvedMono = _monoFont != null ? _monoFont : (_sansFont != null ? _sansFont : _serifFont);
                if (resolvedMono != null) _rankText.font = resolvedMono;
                _rankText.fontSize = Mathf.Max(26f, _rankText.fontSize);
            }
            if (_titleText != null)
            {
                TMP_FontAsset resolvedSerif = _serifFont != null ? _serifFont : _sansFont;
                if (resolvedSerif != null) _titleText.font = resolvedSerif;
                _titleText.rectTransform.anchoredPosition = new Vector2(0f, -86f);
                _titleText.rectTransform.sizeDelta = new Vector2(146f, 62f);
                _titleText.fontSizeMax = 17.5f;
                _titleText.fontSizeMin = 12f;
            }
        }

        private void ApplyFaceUpState(bool faceUp)
        {
            if (_artBackdropImage != null) _artBackdropImage.gameObject.SetActive(faceUp);
            if (_artImage != null) _artImage.gameObject.SetActive(faceUp);
            if (_badgeImage != null) _badgeImage.gameObject.SetActive(faceUp);
            if (_titleText != null) _titleText.gameObject.SetActive(faceUp);
            if (_cardBackImage != null) _cardBackImage.gameObject.SetActive(!faceUp);
        }

        private void ApplyPlayabilityTint()
        {
            Color tint = IsPlayable ? Color.white : UnplayableTint;
            if (_frameImage != null) _frameImage.color = tint;
            if (_artImage != null) _artImage.color = tint;
        }

        private void RefreshGlowVisual()
        {
            if (_selectionGlowImage == null)
            {
                return;
            }

            if (IsDragging && IsPlayable && _abovePlayThreshold)
            {
                _selectionGlowImage.color = GlowCommitColor;
            }
            else if (IsSelected || (IsHovered && IsPlayable))
            {
                _selectionGlowImage.color = GlowActiveColor;
            }
            else if (IsPlayable && IsFaceUp)
            {
                _selectionGlowImage.color = GlowIdlePlayableColor;
            }
            else
            {
                _selectionGlowImage.color = Color.clear;
            }
        }

        private void ApplyMaterialToImages(Material mat)
        {
            _burnMaterialApplied = mat != null;
            if (_frameImage != null) _frameImage.material = mat;
            if (_artBackdropImage != null) _artBackdropImage.material = mat;
            if (_artImage != null) _artImage.material = mat;
            if (_badgeImage != null) _badgeImage.material = mat;
            if (_suitImage != null) _suitImage.material = mat;
            if (_cardBackImage != null) _cardBackImage.material = mat;
        }

        private void ReleaseBurnMaterialInstance()
        {
            if (_burnMaterialInstance == null)
            {
                return;
            }

            ApplyMaterialToImages(null);
            if (Application.isPlaying)
            {
                Destroy(_burnMaterialInstance);
            }
            else
            {
                DestroyImmediate(_burnMaterialInstance);
            }
            _burnMaterialInstance = null;
        }

        private bool TryGetLocalPointInParent(PointerEventData eventData, out Vector2 localPoint)
        {
            RectTransform parentRect = transform.parent as RectTransform;
            if (parentRect == null)
            {
                localPoint = Vector2.zero;
                return false;
            }

            Canvas rootCanvas = GetComponentInParent<Canvas>();
            Camera eventCam = null;
            if (rootCanvas != null && rootCanvas.renderMode != RenderMode.ScreenSpaceOverlay)
            {
                eventCam = eventData.pressEventCamera != null
                    ? eventData.pressEventCamera
                    : (rootCanvas.worldCamera != null ? rootCanvas.worldCamera : Camera.main);
            }

            return RectTransformUtility.ScreenPointToLocalPointInRectangle(parentRect, eventData.position, eventCam, out localPoint);
        }

        private static bool IsRedSuit(string suit)
        {
            return string.Equals(suit, "HEART", StringComparison.OrdinalIgnoreCase)
                || string.Equals(suit, "DIAMOND", StringComparison.OrdinalIgnoreCase);
        }

        private static string FormatCardTitleDisplay(string titleVi, string cardKey)
        {
            if (string.IsNullOrWhiteSpace(titleVi))
            {
                return string.Empty;
            }

            string cleanTitle = titleVi.Trim();
            if (cleanTitle.Length <= 10)
            {
                string subTag = ResolveMechanicTagVi(cardKey);
                if (!string.IsNullOrEmpty(subTag))
                {
                    return $"{cleanTitle}\n<size=72%><color=#4A3525>{subTag}</color></size>";
                }
            }

            return cleanTitle;
        }

        private static string ResolveMechanicTagVi(string cardKey)
        {
            if (string.IsNullOrWhiteSpace(cardKey))
            {
                return null;
            }

            return cardKey.Trim().ToLowerInvariant() switch
            {
                "sat" => "Công kích",
                "pha_giap_tram" => "Xuyên giáp",
                "thiem" => "Né đòn",
                "dao" => "Hồi máu",
                "vo_trung_sinh_huu" => "Rút 2 lá",
                "thuan_thu_khien_duong" => "Đoạt 1 lá",
                "qua_ha_sai_cau" => "Hủy 1 lá",
                "kinh_loi_chan" => "Chấn thương",
                "quyet_dau" => "Đấu kiếm",
                "ta_dao_sat_nhan" => "Mượn đao",
                "nam_man_nhap_xam" => "Toàn bàn",
                "van_tien_te_phat" => "Mưa tên",
                "dao_vien_ket_nghia" => "Hồi chung",
                "ngu_coc_phong_dang" => "Chia bài",
                "vo_giai_kha_kich" or "vo_ta" => "Khắc cẩm",
                "chan_khi_ho_the" => "Dưỡng khí",
                "lac_bat_tu_thuc" => "Phong mạch",
                "thiem_dien" => "Lôi sát",
                "gia_cat_lien_no" => "Đánh liên",
                "tu_hung_song_co_kiem" or "thanh_cong_kiem" or "han_bang_kiem" or "tu_khi_hoan" => "Tầm đánh 2",
                "thanh_long_yen_nguyet_dao" or "truong_bat_xa_mau" or "quan_thach_phu" => "Tầm đánh 3",
                "phuong_thien_hoa_kich" => "Tầm đánh 4",
                "ky_lan_cung" => "Tầm đánh 5",
                "bat_quai_tran" or "hoan_anh_giap" or "nhan_vuong_thuan" => "Hộ giáp",
                "tuyet_anh" or "dich_lo" or "trao_hoang_phi_dien" => "Phòng +1",
                "xich_tho" or "dai_uyen" or "tu_tinh" => "Công -1",
                _ => null,
            };
        }

        private static float NormalizeSignedAngle(float deg)
        {
            float angle = Mathf.Repeat(deg + 180f, 360f) - 180f;
            return angle;
        }

        private static Image GetOrCreateImage(string childName, Transform parent, Vector2 anchoredPos, Vector2 size, bool raycastTarget)
        {
            Transform existing = parent.Find(childName);
            GameObject go = existing != null ? existing.gameObject : new GameObject(childName, typeof(RectTransform), typeof(Image));
            if (existing == null)
            {
                go.transform.SetParent(parent, false);
            }

            RectTransform rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = size;

            Image img = go.GetComponent<Image>();
            if (img == null) img = go.AddComponent<Image>();
            img.raycastTarget = raycastTarget;
            return img;
        }

        private static TextMeshProUGUI GetOrCreateTmp(
            string childName,
            Transform parent,
            Vector2 anchoredPos,
            Vector2 size,
            float fontSize,
            TextAlignmentOptions alignment)
        {
            Transform existing = parent.Find(childName);
            GameObject go = existing != null ? existing.gameObject : new GameObject(childName, typeof(RectTransform), typeof(TextMeshProUGUI));
            if (existing == null)
            {
                go.transform.SetParent(parent, false);
            }

            RectTransform rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = anchoredPos;
            rt.sizeDelta = size;

            TextMeshProUGUI tmp = go.GetComponent<TextMeshProUGUI>();
            if (tmp == null) tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.fontSize = Mathf.Max(15f, fontSize);
            tmp.alignment = alignment;
            tmp.raycastTarget = false;
            return tmp;
        }
    }
}
