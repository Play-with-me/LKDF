using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.VFX
{
    /// <summary>
    /// Lớp phủ VFX nhẹ chạy trực tiếp trên uGUI Canvas dùng Object Pool (0 cấp phát mỗi khung hình):
    /// nổi chữ sát thương/hồi máu, vòng sóng xung kích đồng thau/tia mực và đường bay lá bài cháy mực.
    /// </summary>
    public sealed class VfxBurstOverlay : MonoBehaviour
    {
        private static readonly Vector2 MiniCardFlightSize = new Vector2(126f, 178f);
        private static readonly Vector2 MiniCardArtSize = new Vector2(118f, 170f);
        private static readonly Color MiniCardPlateColor = new Color(0.14f, 0.10f, 0.07f, 0.96f);
        private static readonly int DissolveAmountShaderId = Shader.PropertyToID("_DissolveAmount");

        private const float CardFlightApexLiftPx = 48f;
        private const float CardDissolveDurationSec = 0.28f;

        [Header("Cấu Hình Pool & Kiểu Chữ")]
        [SerializeField, Range(4, 32)] private int numberPoolSize = 12;
        [SerializeField, Range(4, 24)] private int ringPoolSize = 10;
        [SerializeField, Range(4, 16)] private int cardFlightPoolSize = 8;
        [SerializeField] private Sprite customRingSprite;
        [SerializeField] private bool reducedMotion;

        [Header("Thông Số Chuyển Động")]
        [SerializeField, Range(0.3f, 2f)] private float numberDuration = 0.85f;
        [SerializeField, Range(20f, 120f)] private float numberRiseDistance = 54f;
        [SerializeField, Range(0.2f, 1.2f)] private float ringDuration = 0.42f;
        [SerializeField, Range(48f, 260f)] private float ringMaxSize = 156f;

        private sealed class FloatingNumberSlot
        {
            public RectTransform Rect;
            public TextMeshProUGUI Label;
            public bool Active;
            public float Elapsed;
            public float Duration;
            public Vector2 StartPos;
            public Vector2 EndPos;
            public Color BaseColor;
        }

        private sealed class ImpactRingSlot
        {
            public RectTransform Rect;
            public Image RingImage;
            public bool Active;
            public float Elapsed;
            public float Duration;
            public Color BaseColor;
        }

        private sealed class CardFlightSlot
        {
            public RectTransform Rect;
            public Image PlateImage;
            public Image ArtImage;
            public Material BurnMaterialTemplate;
            public Material BurnMaterialInstance;
            public bool Active;
            public bool Dissolving;
            public bool DissolveOnArrive;
            public float Elapsed;
            public float FlightDuration;
            public float DissolveElapsed;
            public Vector2 StartPos;
            public Vector2 ControlPos;
            public Vector2 EndPos;
            public float StartTiltDeg;
        }

        private readonly List<FloatingNumberSlot> _numberPool = new();
        private readonly List<ImpactRingSlot> _ringPool = new();
        private readonly List<CardFlightSlot> _cardFlightPool = new();

        private RectTransform _overlayRoot;
        private TMP_FontAsset _serifFont;
        private TMP_FontAsset _monoFont;
        private Sprite _proceduralRingSprite;
        private Texture2D _proceduralRingTexture;
        private bool _initialized;

        public bool ReducedMotion => reducedMotion;

        public void SetReducedMotion(bool enabled)
        {
            reducedMotion = enabled;
        }

        public void InitializeOverlay(TMP_FontAsset serifFont, TMP_FontAsset monoFont)
        {
            _serifFont = serifFont != null ? serifFont : TMP_Settings.defaultFontAsset;
            _monoFont = monoFont != null ? monoFont : _serifFont;

            if (_overlayRoot == null)
            {
                _overlayRoot = GetComponent<RectTransform>();
                if (_overlayRoot == null)
                {
                    _overlayRoot = gameObject.AddComponent<RectTransform>();
                }
            }

            if (_initialized)
            {
                ApplyFontToPooledLabels();
                if (_cardFlightPool.Count == 0)
                {
                    BuildCardFlightPool();
                }
                return;
            }

            EnsureRingSprite();
            BuildPools();
            _initialized = true;
        }

        public void SpawnFloatingNumber(Vector2 localPos, string text, Color color)
        {
            if (string.IsNullOrEmpty(text)) return;
            if (!_initialized) InitializeOverlay(_serifFont, _monoFont);

            FloatingNumberSlot slot = AcquireNumberSlot();
            if (slot == null) return;

            slot.Active = true;
            slot.Elapsed = 0f;
            slot.Duration = reducedMotion ? Mathf.Min(0.65f, numberDuration) : numberDuration;
            slot.BaseColor = color;

            float horizontalDrift = reducedMotion ? 0f : Random.Range(-18f, 18f);
            float rise = reducedMotion ? 14f : numberRiseDistance;
            slot.StartPos = localPos;
            slot.EndPos = localPos + new Vector2(horizontalDrift, rise);

            slot.Label.font = ContainsOnlyAsciiSymbols(text) && _monoFont != null ? _monoFont : _serifFont;
            slot.Label.text = text;
            slot.Label.color = new Color(color.r, color.g, color.b, 0f);

            slot.Rect.anchoredPosition = localPos;
            slot.Rect.localScale = Vector3.one;
            slot.Rect.SetAsLastSibling();
            slot.Rect.gameObject.SetActive(true);
        }

        public void SpawnImpactRing(Vector2 localPos, Color color)
        {
            if (!_initialized) InitializeOverlay(_serifFont, _monoFont);

            ImpactRingSlot slot = AcquireRingSlot();
            if (slot == null) return;

            slot.Active = true;
            slot.Elapsed = 0f;
            slot.Duration = reducedMotion ? 0.28f : ringDuration;
            slot.BaseColor = color;

            slot.Rect.anchoredPosition = localPos;
            float startSize = reducedMotion ? ringMaxSize * 0.55f : 28f;
            slot.Rect.sizeDelta = new Vector2(startSize, startSize);
            slot.Rect.localScale = Vector3.one;
            slot.Rect.localRotation = Quaternion.identity;
            slot.RingImage.color = new Color(color.r, color.g, color.b, reducedMotion ? 0.35f : 0.9f);
            slot.Rect.gameObject.SetActive(true);
        }

        public void SpawnCardFlight(
            Sprite cardSprite,
            Vector2 startAnchoredPos,
            Vector2 endAnchoredPos,
            Material burnMaterialTemplate = null,
            bool dissolveOnArrive = false,
            float duration = 0.22f)
        {
            if (!_initialized) InitializeOverlay(_serifFont, _monoFont);
            if (_cardFlightPool.Count == 0) BuildCardFlightPool();

            CardFlightSlot slot = AcquireCardFlightSlot();
            if (slot == null) return;

            DetachFlightSlotMaterials(slot);

            slot.Active = true;
            slot.Dissolving = false;
            slot.DissolveOnArrive = dissolveOnArrive && burnMaterialTemplate != null;
            slot.Elapsed = 0f;
            slot.DissolveElapsed = 0f;
            slot.FlightDuration = Mathf.Max(0.05f, reducedMotion ? Mathf.Min(duration, 0.14f) : duration);

            if (slot.BurnMaterialTemplate != burnMaterialTemplate)
            {
                DestroySlotBurnInstance(slot);
                slot.BurnMaterialTemplate = burnMaterialTemplate;
            }

            float apexLift = reducedMotion ? 12f : CardFlightApexLiftPx;
            Vector2 mid = (startAnchoredPos + endAnchoredPos) * 0.5f;
            slot.StartPos = startAnchoredPos;
            slot.ControlPos = mid + new Vector2(0f, apexLift);
            slot.EndPos = endAnchoredPos;

            float dx = endAnchoredPos.x - startAnchoredPos.x;
            slot.StartTiltDeg = reducedMotion ? 0f : Mathf.Clamp(-dx * 0.018f, -9f, 9f);

            slot.PlateImage.color = MiniCardPlateColor;
            if (slot.ArtImage != null)
            {
                slot.ArtImage.sprite = cardSprite;
                slot.ArtImage.color = Color.white;
                slot.ArtImage.enabled = cardSprite != null;
            }

            slot.Rect.sizeDelta = MiniCardFlightSize;
            slot.Rect.anchoredPosition = startAnchoredPos;
            slot.Rect.localRotation = Quaternion.Euler(0f, 0f, slot.StartTiltDeg);
            slot.Rect.localScale = Vector3.one;
            slot.Rect.SetAsLastSibling();
            slot.Rect.gameObject.SetActive(true);
        }

        public void ClearActiveEffects()
        {
            for (int i = 0; i < _numberPool.Count; i++)
            {
                _numberPool[i].Active = false;
                if (_numberPool[i].Rect != null) _numberPool[i].Rect.gameObject.SetActive(false);
            }

            for (int i = 0; i < _ringPool.Count; i++)
            {
                _ringPool[i].Active = false;
                if (_ringPool[i].Rect != null) _ringPool[i].Rect.gameObject.SetActive(false);
            }

            for (int i = 0; i < _cardFlightPool.Count; i++)
            {
                CardFlightSlot slot = _cardFlightPool[i];
                slot.Active = false;
                slot.Dissolving = false;
                DetachFlightSlotMaterials(slot);
                if (slot.Rect != null) slot.Rect.gameObject.SetActive(false);
            }
        }

        private void Update()
        {
            if (!_initialized) return;

            float dt = Time.unscaledDeltaTime;
            if (dt <= 0f) return;

            UpdateFloatingNumbers(dt);
            UpdateImpactRings(dt);
            UpdateCardFlights(dt);
        }

        private void UpdateFloatingNumbers(float dt)
        {
            for (int i = 0; i < _numberPool.Count; i++)
            {
                FloatingNumberSlot slot = _numberPool[i];
                if (!slot.Active) continue;

                slot.Elapsed += dt;
                float u = Mathf.Clamp01(slot.Elapsed / Mathf.Max(0.01f, slot.Duration));

                float easeOut = 1f - (1f - u) * (1f - u) * (1f - u);
                slot.Rect.anchoredPosition = Vector2.LerpUnclamped(slot.StartPos, slot.EndPos, easeOut);

                if (reducedMotion)
                {
                    slot.Rect.localScale = Vector3.one;
                }
                else
                {
                    float pop = u < 0.2f
                        ? EaseOutBack(u / 0.2f)
                        : Mathf.Lerp(1.06f, 0.96f, (u - 0.2f) / 0.8f);
                    float clampedScale = Mathf.Clamp(pop, 0.82f, 1.24f);
                    slot.Rect.localScale = new Vector3(clampedScale, clampedScale, 1f);
                }

                float alpha;
                if (u < 0.14f)
                {
                    alpha = u / 0.14f;
                }
                else if (u > 0.65f)
                {
                    alpha = 1f - (u - 0.65f) / 0.35f;
                }
                else
                {
                    alpha = 1f;
                }

                Color c = slot.BaseColor;
                c.a = Mathf.Clamp01(alpha) * slot.BaseColor.a;
                slot.Label.color = c;

                if (u >= 1f)
                {
                    slot.Active = false;
                    slot.Rect.gameObject.SetActive(false);
                }
            }
        }

        private void UpdateImpactRings(float dt)
        {
            for (int i = 0; i < _ringPool.Count; i++)
            {
                ImpactRingSlot slot = _ringPool[i];
                if (!slot.Active) continue;

                slot.Elapsed += dt;
                float u = Mathf.Clamp01(slot.Elapsed / Mathf.Max(0.01f, slot.Duration));
                float easeOut = 1f - (1f - u) * (1f - u);

                if (reducedMotion)
                {
                    float size = ringMaxSize * 0.62f;
                    slot.Rect.sizeDelta = new Vector2(size, size);
                    Color c = slot.BaseColor;
                    c.a = (1f - u) * 0.32f * slot.BaseColor.a;
                    slot.RingImage.color = c;
                }
                else
                {
                    float size = Mathf.Lerp(28f, ringMaxSize, easeOut);
                    slot.Rect.sizeDelta = new Vector2(size, size);
                    slot.Rect.localRotation = Quaternion.Euler(0f, 0f, u * 26f);

                    Color c = slot.BaseColor;
                    c.a = (1f - easeOut) * 0.92f * slot.BaseColor.a;
                    slot.RingImage.color = c;
                }

                if (u >= 1f)
                {
                    slot.Active = false;
                    slot.Rect.gameObject.SetActive(false);
                }
            }
        }

        private void UpdateCardFlights(float dt)
        {
            for (int i = 0; i < _cardFlightPool.Count; i++)
            {
                CardFlightSlot slot = _cardFlightPool[i];
                if (!slot.Active) continue;

                if (!slot.Dissolving)
                {
                    slot.Elapsed += dt;
                    float u = Mathf.Clamp01(slot.Elapsed / Mathf.Max(0.01f, slot.FlightDuration));
                    float t = 1f - (1f - u) * (1f - u);

                    float inv = 1f - t;
                    Vector2 arcPos = (inv * inv) * slot.StartPos + (2f * inv * t) * slot.ControlPos + (t * t) * slot.EndPos;
                    slot.Rect.anchoredPosition = arcPos;

                    if (!reducedMotion)
                    {
                        float tilt = Mathf.Lerp(slot.StartTiltDeg, 0f, t);
                        float scale = Mathf.Lerp(1.04f, 0.96f, t);
                        slot.Rect.localRotation = Quaternion.Euler(0f, 0f, tilt);
                        slot.Rect.localScale = new Vector3(scale, scale, 1f);
                    }

                    if (u >= 1f)
                    {
                        slot.Rect.anchoredPosition = slot.EndPos;
                        slot.Rect.localRotation = Quaternion.identity;
                        slot.Rect.localScale = Vector3.one;

                        if (slot.DissolveOnArrive && slot.BurnMaterialTemplate != null)
                        {
                            BeginCardFlightDissolve(slot);
                        }
                        else
                        {
                            slot.Active = false;
                            slot.Rect.gameObject.SetActive(false);
                        }
                    }
                }
                else
                {
                    slot.DissolveElapsed += dt;
                    float d = Mathf.Clamp01(slot.DissolveElapsed / CardDissolveDurationSec);
                    if (slot.BurnMaterialInstance != null && slot.BurnMaterialInstance.HasProperty(DissolveAmountShaderId))
                    {
                        slot.BurnMaterialInstance.SetFloat(DissolveAmountShaderId, d);
                    }

                    if (d >= 1f)
                    {
                        DetachFlightSlotMaterials(slot);
                        slot.Dissolving = false;
                        slot.Active = false;
                        slot.Rect.gameObject.SetActive(false);
                    }
                }
            }
        }

        private static void BeginCardFlightDissolve(CardFlightSlot slot)
        {
            slot.Dissolving = true;
            slot.DissolveElapsed = 0f;

            if (slot.BurnMaterialInstance == null && slot.BurnMaterialTemplate != null)
            {
                slot.BurnMaterialInstance = new Material(slot.BurnMaterialTemplate)
                {
                    hideFlags = HideFlags.DontSaveInEditor | HideFlags.DontSaveInBuild
                };
            }

            if (slot.BurnMaterialInstance != null)
            {
                if (slot.BurnMaterialInstance.HasProperty(DissolveAmountShaderId))
                {
                    slot.BurnMaterialInstance.SetFloat(DissolveAmountShaderId, 0f);
                }
                if (slot.PlateImage != null) slot.PlateImage.material = slot.BurnMaterialInstance;
                if (slot.ArtImage != null) slot.ArtImage.material = slot.BurnMaterialInstance;
            }
        }

        private static void DetachFlightSlotMaterials(CardFlightSlot slot)
        {
            if (slot.PlateImage != null) slot.PlateImage.material = null;
            if (slot.ArtImage != null) slot.ArtImage.material = null;
        }

        private static void DestroySlotBurnInstance(CardFlightSlot slot)
        {
            if (slot.BurnMaterialInstance == null) return;
            DetachFlightSlotMaterials(slot);
            if (Application.isPlaying)
            {
                Destroy(slot.BurnMaterialInstance);
            }
            else
            {
                DestroyImmediate(slot.BurnMaterialInstance);
            }
            slot.BurnMaterialInstance = null;
        }

        private void BuildPools()
        {
            for (int i = 0; i < numberPoolSize; i++)
            {
                var go = new GameObject($"VfxFloatingText_{i}", typeof(RectTransform), typeof(TextMeshProUGUI), typeof(Shadow));
                var rect = go.GetComponent<RectTransform>();
                rect.SetParent(_overlayRoot, false);
                rect.sizeDelta = new Vector2(280f, 52f);

                var label = go.GetComponent<TextMeshProUGUI>();
                label.font = _serifFont;
                label.fontSize = 27f;
                label.fontStyle = FontStyles.Bold;
                label.alignment = TextAlignmentOptions.Center;
                label.textWrappingMode = TextWrappingModes.NoWrap;
                label.raycastTarget = false;

                var shadow = go.GetComponent<Shadow>();
                shadow.effectColor = new Color(0.03f, 0.025f, 0.02f, 0.92f);
                shadow.effectDistance = new Vector2(1.5f, -1.5f);

                go.SetActive(false);
                _numberPool.Add(new FloatingNumberSlot
                {
                    Rect = rect,
                    Label = label,
                    Active = false
                });
            }

            Sprite ringSprite = customRingSprite != null ? customRingSprite : _proceduralRingSprite;
            for (int i = 0; i < ringPoolSize; i++)
            {
                var go = new GameObject($"VfxImpactRing_{i}", typeof(RectTransform), typeof(Image));
                var rect = go.GetComponent<RectTransform>();
                rect.SetParent(_overlayRoot, false);
                rect.sizeDelta = new Vector2(64f, 64f);

                var img = go.GetComponent<Image>();
                img.sprite = ringSprite;
                img.preserveAspect = true;
                img.raycastTarget = false;

                go.SetActive(false);
                _ringPool.Add(new ImpactRingSlot
                {
                    Rect = rect,
                    RingImage = img,
                    Active = false
                });
            }

            BuildCardFlightPool();
        }

        private void BuildCardFlightPool()
        {
            for (int i = 0; i < cardFlightPoolSize; i++)
            {
                var go = new GameObject($"VfxCardFlight_{i}", typeof(RectTransform), typeof(Image));
                var rect = go.GetComponent<RectTransform>();
                rect.SetParent(_overlayRoot, false);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = MiniCardFlightSize;

                var plateImg = go.GetComponent<Image>();
                plateImg.color = MiniCardPlateColor;
                plateImg.raycastTarget = false;

                var artGo = new GameObject("FlightCardArt", typeof(RectTransform), typeof(Image));
                var artRect = artGo.GetComponent<RectTransform>();
                artRect.SetParent(rect, false);
                artRect.anchorMin = new Vector2(0.5f, 0.5f);
                artRect.anchorMax = new Vector2(0.5f, 0.5f);
                artRect.pivot = new Vector2(0.5f, 0.5f);
                artRect.sizeDelta = MiniCardArtSize;

                var artImg = artGo.GetComponent<Image>();
                artImg.preserveAspect = true;
                artImg.raycastTarget = false;

                go.SetActive(false);
                _cardFlightPool.Add(new CardFlightSlot
                {
                    Rect = rect,
                    PlateImage = plateImg,
                    ArtImage = artImg,
                    Active = false,
                    Dissolving = false
                });
            }
        }

        private void ApplyFontToPooledLabels()
        {
            for (int i = 0; i < _numberPool.Count; i++)
            {
                if (_numberPool[i].Label != null && _serifFont != null)
                {
                    _numberPool[i].Label.font = _serifFont;
                }
            }
        }

        private FloatingNumberSlot AcquireNumberSlot()
        {
            FloatingNumberSlot oldest = null;
            float maxElapsed = -1f;
            for (int i = 0; i < _numberPool.Count; i++)
            {
                if (!_numberPool[i].Active) return _numberPool[i];
                if (_numberPool[i].Elapsed > maxElapsed)
                {
                    maxElapsed = _numberPool[i].Elapsed;
                    oldest = _numberPool[i];
                }
            }
            return oldest;
        }

        private ImpactRingSlot AcquireRingSlot()
        {
            ImpactRingSlot oldest = null;
            float maxElapsed = -1f;
            for (int i = 0; i < _ringPool.Count; i++)
            {
                if (!_ringPool[i].Active) return _ringPool[i];
                if (_ringPool[i].Elapsed > maxElapsed)
                {
                    maxElapsed = _ringPool[i].Elapsed;
                    oldest = _ringPool[i];
                }
            }
            return oldest;
        }

        private CardFlightSlot AcquireCardFlightSlot()
        {
            CardFlightSlot oldest = null;
            float maxAge = -1f;
            for (int i = 0; i < _cardFlightPool.Count; i++)
            {
                CardFlightSlot slot = _cardFlightPool[i];
                if (!slot.Active) return slot;
                float age = slot.Elapsed + slot.DissolveElapsed;
                if (age > maxAge)
                {
                    maxAge = age;
                    oldest = slot;
                }
            }
            return oldest;
        }

        private void EnsureRingSprite()
        {
            if (customRingSprite != null || _proceduralRingSprite != null) return;

            const int size = 64;
            _proceduralRingTexture = new Texture2D(size, size, TextureFormat.RGBA32, mipChain: false)
            {
                name = "CuuChau_ProceduralImpactRing",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp
            };

            float half = (size - 1) * 0.5f;
            var pixels = new Color32[size * size];

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = (x - half) / half;
                    float dy = (y - half) / half;
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);

                    // Crisp brass shockwave rim around r = 0.72 plus faint inner ink ring at r = 0.48.
                    float outerRing = Mathf.Exp(-Mathf.Pow((dist - 0.74f) / 0.10f, 2f));
                    float innerEcho = 0.35f * Mathf.Exp(-Mathf.Pow((dist - 0.48f) / 0.06f, 2f));
                    float edgeClamp = 1f - Mathf.SmoothStep(0.88f, 0.98f, dist);
                    float alpha = Mathf.Clamp01((outerRing + innerEcho) * edgeClamp);

                    byte a = (byte)Mathf.RoundToInt(alpha * 255f);
                    pixels[y * size + x] = new Color32(255, 255, 255, a);
                }
            }

            _proceduralRingTexture.SetPixels32(pixels);
            _proceduralRingTexture.Apply(updateMipmaps: false, makeNoLongerReadable: true);

            _proceduralRingSprite = Sprite.Create(
                _proceduralRingTexture,
                new Rect(0f, 0f, size, size),
                new Vector2(0.5f, 0.5f),
                100f
            );
            _proceduralRingSprite.name = "CuuChau_ProceduralImpactRingSprite";
        }

        private static bool ContainsOnlyAsciiSymbols(string text)
        {
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] > 127) return false;
            }
            return true;
        }

        private static float EaseOutBack(float k)
        {
            const float c1 = 1.70158f;
            const float c3 = c1 + 1f;
            float m = k - 1f;
            return 1f + c3 * m * m * m + c1 * m * m;
        }

        private void OnDestroy()
        {
            for (int i = 0; i < _cardFlightPool.Count; i++)
            {
                DestroySlotBurnInstance(_cardFlightPool[i]);
            }

            if (_proceduralRingSprite != null)
            {
                Destroy(_proceduralRingSprite);
                _proceduralRingSprite = null;
            }

            if (_proceduralRingTexture != null)
            {
                Destroy(_proceduralRingTexture);
                _proceduralRingTexture = null;
            }
        }
    }
}
