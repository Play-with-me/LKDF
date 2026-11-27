using System.Collections.Generic;
using CuuChau.Data;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Cards
{
    /// <summary>
    /// Dây lụa mục tiêu cong Bézier bậc 2 bằng chuỗi đoạn Image + đầu mũi tên arrowHeadSilk
    /// xoay đúng tiếp tuyến đường cong, hỗ trợ shader ánh kim CuuChau/SilkRibbonGlow
    /// và hoạt động đồng nhất ở cả EditMode lẫn PlayMode.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class SilkTargetArrow : MonoBehaviour
    {
        private static readonly Color ValidArrowHeadColor = new Color(1f, 0.96f, 0.86f, 1f);
        private static readonly Color InvalidArrowHeadColor = new Color(0.68f, 0.52f, 0.42f, 0.78f);
        private static readonly Color ValidRibbonColor = Color.white;
        private static readonly Color InvalidRibbonColor = new Color(0.70f, 0.55f, 0.46f, 0.65f);

        private static Sprite _cachedWhiteSprite;

        [Header("Thông Số Dây Lụa Bézier")]
        [SerializeField, Range(8, 36)] private int segmentCount = 22;
        [SerializeField] private float ribbonThickness = 22f;
        [SerializeField] private float segmentOverlapPx = 4f;
        [SerializeField] private float minCurveLift = 110f;
        [SerializeField] private float curveLiftFactor = 0.24f;
        [SerializeField] private float arrowHeadSize = 54f;
        [SerializeField] private float headSocketInsetPx = 16f;

        private readonly List<Image> _segments = new();
        private RectTransform _rectTransform;
        private Image _arrowHeadImage;
        private VisualCatalogSO _catalog;
        private Material _silkMaterial;
        private bool _isVisible;

        public bool IsVisible => _isVisible;

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

        public void InitializeArrow(VisualCatalogSO catalog, Material silkMaterial = null)
        {
            _catalog = catalog;
            if (silkMaterial != null)
            {
                _silkMaterial = silkMaterial;
            }

            EnsureSegmentsAndHead();
            ApplyAssets();
        }

        public void ShowBezier(Vector2 localStart, Vector2 localEnd, bool isValidTarget = true)
        {
            EnsureSegmentsAndHead();
            ApplyAssets();

            Vector2 delta = localEnd - localStart;
            float dist = delta.magnitude;
            if (dist < 12f)
            {
                Hide();
                return;
            }

            Vector2 midPoint = (localStart + localEnd) * 0.5f;
            float lift = Mathf.Max(minCurveLift, dist * curveLiftFactor);
            Vector2 controlPoint = midPoint + new Vector2(0f, lift);

            Vector2 endTangent = 2f * (localEnd - controlPoint);
            if (endTangent.sqrMagnitude < 0.001f)
            {
                endTangent = delta;
            }
            Vector2 endDir = endTangent.normalized;
            Vector2 ribbonEnd = localEnd - endDir * headSocketInsetPx;

            Color segColor = isValidTarget ? ValidRibbonColor : InvalidRibbonColor;
            int count = _segments.Count;

            for (int i = 0; i < count; i++)
            {
                float t0 = i / (float)count;
                float t1 = (i + 1) / (float)count;

                Vector2 p0 = EvaluateQuadraticBezier(localStart, controlPoint, ribbonEnd, t0);
                Vector2 p1 = EvaluateQuadraticBezier(localStart, controlPoint, ribbonEnd, t1);
                Vector2 segVec = p1 - p0;
                float segLen = segVec.magnitude;
                float angleDeg = Mathf.Atan2(segVec.y, segVec.x) * Mathf.Rad2Deg;

                // Thuôn nhẹ hai đầu dải lụa để đầu và đuôi hòa mượt vào lá bài & đầu mũi tên
                float taper = Mathf.Lerp(0.72f, 1.08f, Mathf.Sin(((i + 0.5f) / count) * Mathf.PI));

                Image seg = _segments[i];
                seg.gameObject.SetActive(true);
                seg.color = segColor;
                seg.material = _silkMaterial;

                RectTransform segRt = seg.rectTransform;
                segRt.anchoredPosition = (p0 + p1) * 0.5f;
                segRt.sizeDelta = new Vector2(segLen + segmentOverlapPx, ribbonThickness * taper);
                segRt.localRotation = Quaternion.Euler(0f, 0f, angleDeg);
            }

            if (_arrowHeadImage != null)
            {
                _arrowHeadImage.gameObject.SetActive(true);
                _arrowHeadImage.color = isValidTarget ? ValidArrowHeadColor : InvalidArrowHeadColor;

                // arrow_head_silk.png hướng mũi lên trên (+Y), nên trừ 90 độ từ vector tiếp tuyến
                float headAngleDeg = Mathf.Atan2(endDir.y, endDir.x) * Mathf.Rad2Deg - 90f;
                RectTransform headRt = _arrowHeadImage.rectTransform;
                headRt.anchoredPosition = localEnd;
                headRt.sizeDelta = new Vector2(arrowHeadSize, arrowHeadSize);
                headRt.localRotation = Quaternion.Euler(0f, 0f, headAngleDeg);
                _arrowHeadImage.transform.SetAsLastSibling();
            }

            _isVisible = true;
            if (!gameObject.activeSelf)
            {
                gameObject.SetActive(true);
            }
        }

        public void ShowBetweenRects(
            RectTransform from,
            RectTransform to,
            RectTransform containerCanvasRect,
            bool isValidTarget = true)
        {
            if (from == null || to == null)
            {
                Hide();
                return;
            }

            Vector3 worldFrom = from.TransformPoint(from.rect.center);
            Vector3 worldTo = to.TransformPoint(to.rect.center);

            RectTransform localSpace = RectTransform;
            if (localSpace == null)
            {
                localSpace = containerCanvasRect;
            }
            if (localSpace == null)
            {
                Hide();
                return;
            }

            Vector2 centerOffset = localSpace.rect.center;
            Vector2 localStart = (Vector2)localSpace.InverseTransformPoint(worldFrom) - centerOffset;
            Vector2 localEnd = (Vector2)localSpace.InverseTransformPoint(worldTo) - centerOffset;
            ShowBezier(localStart, localEnd, isValidTarget);
        }

        public void Hide()
        {
            _isVisible = false;

            for (int i = 0; i < _segments.Count; i++)
            {
                if (_segments[i] != null)
                {
                    _segments[i].gameObject.SetActive(false);
                }
            }

            if (_arrowHeadImage != null)
            {
                _arrowHeadImage.gameObject.SetActive(false);
            }
        }

        private void EnsureSegmentsAndHead()
        {
            if (_segments.Count != segmentCount)
            {
                for (int i = 0; i < _segments.Count; i++)
                {
                    if (_segments[i] == null) continue;
                    if (Application.isPlaying) Destroy(_segments[i].gameObject);
                    else DestroyImmediate(_segments[i].gameObject);
                }
                _segments.Clear();

                for (int i = 0; i < segmentCount; i++)
                {
                    var segGo = new GameObject($"SilkSegment_{i}", typeof(RectTransform), typeof(Image));
                    segGo.transform.SetParent(transform, false);

                    var rt = segGo.GetComponent<RectTransform>();
                    rt.anchorMin = new Vector2(0.5f, 0.5f);
                    rt.anchorMax = new Vector2(0.5f, 0.5f);
                    rt.pivot = new Vector2(0.5f, 0.5f);

                    var img = segGo.GetComponent<Image>();
                    img.raycastTarget = false;
                    img.sprite = GetOrCreateWhiteSprite();
                    segGo.SetActive(false);
                    _segments.Add(img);
                }
            }

            if (_arrowHeadImage == null)
            {
                Transform existingHead = transform.Find("SilkArrowHead");
                GameObject headGo = existingHead != null
                    ? existingHead.gameObject
                    : new GameObject("SilkArrowHead", typeof(RectTransform), typeof(Image));
                if (existingHead == null)
                {
                    headGo.transform.SetParent(transform, false);
                }

                var rt = headGo.GetComponent<RectTransform>();
                rt.anchorMin = new Vector2(0.5f, 0.5f);
                rt.anchorMax = new Vector2(0.5f, 0.5f);
                rt.pivot = new Vector2(0.5f, 0.5f);
                rt.sizeDelta = new Vector2(arrowHeadSize, arrowHeadSize);

                _arrowHeadImage = headGo.GetComponent<Image>();
                if (_arrowHeadImage == null) _arrowHeadImage = headGo.AddComponent<Image>();
                _arrowHeadImage.raycastTarget = false;
                _arrowHeadImage.preserveAspect = true;
                headGo.SetActive(false);
            }
        }

        private void ApplyAssets()
        {
            Sprite whiteSprite = GetOrCreateWhiteSprite();
            for (int i = 0; i < _segments.Count; i++)
            {
                if (_segments[i] != null)
                {
                    _segments[i].sprite = whiteSprite;
                    _segments[i].material = _silkMaterial;
                }
            }

            if (_arrowHeadImage != null && _catalog != null && _catalog.arrowHeadSilk != null)
            {
                _arrowHeadImage.sprite = _catalog.arrowHeadSilk;
            }
        }

        private static Vector2 EvaluateQuadraticBezier(Vector2 p0, Vector2 p1, Vector2 p2, float t)
        {
            float u = 1f - t;
            return (u * u) * p0 + (2f * u * t) * p1 + (t * t) * p2;
        }

        private static Sprite GetOrCreateWhiteSprite()
        {
            if (_cachedWhiteSprite != null)
            {
                return _cachedWhiteSprite;
            }

            var tex = new Texture2D(4, 4, TextureFormat.RGBA32, false)
            {
                name = "SilkRibbonWhiteTex",
                hideFlags = HideFlags.DontSaveInEditor | HideFlags.DontSaveInBuild
            };

            var pixels = new Color[16];
            for (int i = 0; i < pixels.Length; i++)
            {
                pixels[i] = Color.white;
            }
            tex.SetPixels(pixels);
            tex.Apply();

            _cachedWhiteSprite = Sprite.Create(tex, new Rect(0f, 0f, 4f, 4f), new Vector2(0.5f, 0.5f), 100f);
            _cachedWhiteSprite.hideFlags = HideFlags.DontSaveInEditor | HideFlags.DontSaveInBuild;
            return _cachedWhiteSprite;
        }
    }
}
