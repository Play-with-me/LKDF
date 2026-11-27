using CuuChau.Data;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Cards
{
    /// <summary>
    /// Khung cuộn lụa 9-slice hiện chi tiết lá bài/trang bị khi soi bài,
    /// luôn chừa lề trái/phải >= 48px (56px) tránh hai thanh trục gỗ,
    /// chữ body >= 16f và tự kẹp tọa độ nằm gọn trong clampContainer.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class SilkScrollTooltipView : MonoBehaviour
    {
        private static readonly Color TitleGoldColor = new Color(0.96f, 0.87f, 0.64f, 1f);
        private static readonly Color SubtitleAmberColor = new Color(0.84f, 0.69f, 0.44f, 1f);
        private static readonly Color BodyIvoryColor = new Color(0.94f, 0.90f, 0.84f, 1f);

        [Header("Kích Thước & Đệm An Toàn Cuộn Lụa")]
        [SerializeField] private float scrollWidth = 460f;
        [SerializeField] private float minScrollHeight = 168f;
        [SerializeField] private float maxScrollHeight = 420f;
        [SerializeField] private float horizontalPadding = 56f;
        [SerializeField] private float verticalPadding = 32f;
        [SerializeField] private float clampMargin = 16f;

        private RectTransform _rectTransform;
        private Image _backgroundImage;
        private TextMeshProUGUI _titleText;
        private TextMeshProUGUI _subtitleText;
        private TextMeshProUGUI _bodyText;

        private VisualCatalogSO _catalog;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _sansFont;
        private bool _initialized;

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

        private void Awake()
        {
            _rectTransform = GetComponent<RectTransform>();
        }

        public void InitializeTooltip(VisualCatalogSO catalog, TMP_FontAsset serifFont, TMP_FontAsset sansFont)
        {
            if (catalog != null) _catalog = catalog;
            if (serifFont != null) _serifFont = serifFont;
            if (sansFont != null) _sansFont = sansFont;

            EnsureHierarchy();
            ApplyAssets();
            _initialized = true;
        }

        public void ShowTooltip(
            string titleVi,
            string subtitleVi,
            string bodyVi,
            Vector2 preferredLocalPos,
            RectTransform clampContainer)
        {
            if (!_initialized)
            {
                InitializeTooltip(_catalog, _serifFont, _sansFont);
            }
            else
            {
                EnsureHierarchy();
                ApplyAssets();
            }

            float safeHorizontalPad = Mathf.Max(48f, horizontalPadding);
            float innerWidth = Mathf.Max(180f, scrollWidth - safeHorizontalPad * 2f);

            string safeTitle = string.IsNullOrEmpty(titleVi) ? string.Empty : titleVi;
            string safeSubtitle = string.IsNullOrEmpty(subtitleVi) ? string.Empty : subtitleVi;
            string safeBody = string.IsNullOrEmpty(bodyVi) ? string.Empty : bodyVi;

            _titleText.text = safeTitle;
            _subtitleText.text = safeSubtitle;
            _bodyText.text = safeBody;

            bool hasSubtitle = !string.IsNullOrEmpty(safeSubtitle);
            _subtitleText.gameObject.SetActive(hasSubtitle);

            Vector2 titleSize = _titleText.GetPreferredValues(safeTitle, innerWidth, 0f);
            float titleH = Mathf.Max(26f, Mathf.Ceil(titleSize.y));

            float subtitleH = 0f;
            if (hasSubtitle)
            {
                Vector2 subSize = _subtitleText.GetPreferredValues(safeSubtitle, innerWidth, 0f);
                subtitleH = Mathf.Max(22f, Mathf.Ceil(subSize.y));
            }

            Vector2 bodySize = _bodyText.GetPreferredValues(safeBody, innerWidth, 0f);
            float bodyH = Mathf.Max(36f, Mathf.Ceil(bodySize.y));

            float gapAfterTitle = hasSubtitle ? 4f : 8f;
            float gapAfterSubtitle = hasSubtitle ? 10f : 0f;
            float totalContentH = titleH + gapAfterTitle + subtitleH + gapAfterSubtitle + bodyH;
            float totalHeight = Mathf.Clamp(totalContentH + verticalPadding * 2f, minScrollHeight, maxScrollHeight);

            RectTransform rt = RectTransform;
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(scrollWidth, totalHeight);

            float cursorTopY = totalHeight * 0.5f - verticalPadding;

            PositionTopAligned(_titleText.rectTransform, innerWidth, cursorTopY, titleH);
            cursorTopY -= titleH + gapAfterTitle;

            if (hasSubtitle)
            {
                PositionTopAligned(_subtitleText.rectTransform, innerWidth, cursorTopY, subtitleH);
                cursorTopY -= subtitleH + gapAfterSubtitle;
            }

            float remainingBodyH = Mathf.Max(bodyH, cursorTopY - (-totalHeight * 0.5f + verticalPadding));
            PositionTopAligned(_bodyText.rectTransform, innerWidth, cursorTopY, remainingBodyH);

            Vector2 clampedPos = ClampPositionToContainer(preferredLocalPos, rt.sizeDelta, clampContainer);
            rt.anchoredPosition = clampedPos;

            if (!gameObject.activeSelf)
            {
                gameObject.SetActive(true);
            }
            transform.SetAsLastSibling();
        }

        public void Hide()
        {
            if (gameObject.activeSelf)
            {
                gameObject.SetActive(false);
            }
        }

        private void EnsureHierarchy()
        {
            RectTransform rt = RectTransform;
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);

            _backgroundImage = GetComponent<Image>();
            if (_backgroundImage == null)
            {
                _backgroundImage = gameObject.AddComponent<Image>();
            }
            _backgroundImage.type = Image.Type.Sliced;
            _backgroundImage.raycastTarget = false;

            _titleText = GetOrCreateTmp("TooltipTitle", rt, 20f, TitleGoldColor, FontStyles.Bold);
            _subtitleText = GetOrCreateTmp("TooltipSubtitle", rt, 15f, SubtitleAmberColor, FontStyles.Bold);
            _bodyText = GetOrCreateTmp("TooltipBody", rt, 16f, BodyIvoryColor, FontStyles.Normal);
            _bodyText.lineSpacing = 6f;
        }

        private void ApplyAssets()
        {
            if (_backgroundImage != null && _catalog != null && _catalog.silkScrollTooltip9Slice != null)
            {
                _backgroundImage.sprite = _catalog.silkScrollTooltip9Slice;
                _backgroundImage.type = Image.Type.Sliced;
            }

            if (_titleText != null)
            {
                TMP_FontAsset resolvedSerif = _serifFont != null ? _serifFont : _sansFont;
                if (resolvedSerif != null) _titleText.font = resolvedSerif;
                _titleText.fontSize = Mathf.Max(20f, _titleText.fontSize);
            }

            if (_subtitleText != null)
            {
                TMP_FontAsset resolvedSans = _sansFont != null ? _sansFont : _serifFont;
                if (resolvedSans != null) _subtitleText.font = resolvedSans;
                _subtitleText.fontSize = Mathf.Max(15f, _subtitleText.fontSize);
            }

            if (_bodyText != null)
            {
                TMP_FontAsset resolvedSans = _sansFont != null ? _sansFont : _serifFont;
                if (resolvedSans != null) _bodyText.font = resolvedSans;
                _bodyText.fontSize = Mathf.Max(16f, _bodyText.fontSize);
            }
        }

        private Vector2 ClampPositionToContainer(Vector2 preferredLocalPos, Vector2 tooltipSize, RectTransform clampContainer)
        {
            if (clampContainer == null)
            {
                return preferredLocalPos;
            }

            Rect containerRect = clampContainer.rect;
            if (containerRect.width <= 1f || containerRect.height <= 1f)
            {
                return preferredLocalPos;
            }

            float halfW = tooltipSize.x * 0.5f;
            float halfH = tooltipSize.y * 0.5f;

            float minX = containerRect.xMin + halfW + clampMargin;
            float maxX = containerRect.xMax - halfW - clampMargin;
            float minY = containerRect.yMin + halfH + clampMargin;
            float maxY = containerRect.yMax - halfH - clampMargin;

            // Chuyển tọa độ từ hệ cục bộ clampContainer sang parent của tooltip nếu hai Rect khác nhau
            Vector2 localInContainer = preferredLocalPos;
            if (transform.parent != null && transform.parent != clampContainer)
            {
                Vector3 worldPos = transform.parent.TransformPoint(preferredLocalPos);
                localInContainer = clampContainer.InverseTransformPoint(worldPos);
            }

            float clampedX = minX <= maxX ? Mathf.Clamp(localInContainer.x, minX, maxX) : containerRect.center.x;
            float clampedY = minY <= maxY ? Mathf.Clamp(localInContainer.y, minY, maxY) : containerRect.center.y;
            Vector2 clampedInContainer = new Vector2(clampedX, clampedY);

            if (transform.parent != null && transform.parent != clampContainer)
            {
                Vector3 worldClamped = clampContainer.TransformPoint(clampedInContainer);
                return transform.parent.InverseTransformPoint(worldClamped);
            }

            return clampedInContainer;
        }

        private static void PositionTopAligned(RectTransform textRt, float innerWidth, float topY, float height)
        {
            textRt.anchorMin = new Vector2(0.5f, 0.5f);
            textRt.anchorMax = new Vector2(0.5f, 0.5f);
            textRt.pivot = new Vector2(0.5f, 1f);
            textRt.anchoredPosition = new Vector2(0f, topY);
            textRt.sizeDelta = new Vector2(innerWidth, height);
        }

        private static TextMeshProUGUI GetOrCreateTmp(
            string childName,
            Transform parent,
            float fontSize,
            Color color,
            FontStyles style)
        {
            Transform existing = parent.Find(childName);
            GameObject go = existing != null
                ? existing.gameObject
                : new GameObject(childName, typeof(RectTransform), typeof(TextMeshProUGUI));
            if (existing == null)
            {
                go.transform.SetParent(parent, false);
            }

            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();

            var tmp = go.GetComponent<TextMeshProUGUI>();
            if (tmp == null) tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.fontSize = Mathf.Max(15f, fontSize);
            tmp.color = color;
            tmp.fontStyle = style;
            tmp.alignment = TextAlignmentOptions.TopLeft;
            tmp.textWrappingMode = TextWrappingModes.Normal;
            tmp.raycastTarget = false;
            return tmp;
        }
    }
}
