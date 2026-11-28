using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.Arena
{
    /// <summary>
    /// Thanh thời gian lượt phong cách dây cháy Chu Sa -> Vàng đồng mượt.
    /// Nhịp gấp hơn khi tiến độ &lt; 0.25f và tôn trọng chế độ Reduced Motion.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class FuseTimerBar : MonoBehaviour
    {
        private static readonly Color TrackColor = new(0.055f, 0.045f, 0.040f, 0.90f);
        private static readonly Color BorderColor = new(0.62f, 0.48f, 0.26f, 0.72f);
        private static readonly Color GoldFuseColor = new(0.86f, 0.68f, 0.30f, 1f);
        private static readonly Color CinnabarFuseColor = new(0.82f, 0.23f, 0.18f, 1f);
        private static readonly Color UrgentCinnabarColor = new(0.98f, 0.28f, 0.20f, 1f);

        private RectTransform _fillRect;
        private Image _fillImage;
        private RectTransform _sparkRect;
        private Image _sparkImage;
        private TextMeshProUGUI _phaseLabel;
        private TextMeshProUGUI _timeLabel;

        private TMP_FontAsset _sansFont;
        private TMP_FontAsset _monoFont;
        private bool _built;

        private float _progress = 1f;
        private string _phaseText = "Pha Xuất Chiêu";
        private string _lastAppliedPhaseText;
        private int _lastDisplayedSec = -1;
        private int _lastDisplayedPct = -1;
        private float _durationSeconds;
        private float _remainingSeconds;
        private bool _autoCountdown;
        private bool _isPaused;
        private bool _reducedMotion;
        private float _pulseClock;

        public float NormalizedProgress => _progress;

        public void BuildHierarchyIfNeeded(TMP_FontAsset sansFont, TMP_FontAsset monoFont)
        {
            _sansFont = sansFont;
            _monoFont = monoFont;
            if (_built) return;

            var rootRt = transform as RectTransform;
            if (rootRt == null) rootRt = gameObject.AddComponent<RectTransform>();
            if (rootRt.sizeDelta == Vector2.zero)
            {
                rootRt.sizeDelta = new Vector2(344f, 40f);
            }

            // Label row (top half)
            var phaseGo = new GameObject("PhaseLabel", typeof(RectTransform), typeof(TextMeshProUGUI));
            phaseGo.transform.SetParent(rootRt, false);
            var phaseRt = phaseGo.GetComponent<RectTransform>();
            phaseRt.anchorMin = new Vector2(0f, 0.45f);
            phaseRt.anchorMax = new Vector2(0.76f, 1f);
            phaseRt.offsetMin = new Vector2(2f, 0f);
            phaseRt.offsetMax = new Vector2(-4f, 0f);
            _phaseLabel = phaseGo.GetComponent<TextMeshProUGUI>();
            if (_sansFont != null) _phaseLabel.font = _sansFont;
            _phaseLabel.fontSize = 15f;
            _phaseLabel.fontStyle = FontStyles.Bold;
            _phaseLabel.color = new Color(0.94f, 0.88f, 0.72f, 1f);
            _phaseLabel.alignment = TextAlignmentOptions.MidlineLeft;
            _phaseLabel.textWrappingMode = TextWrappingModes.NoWrap;
            _phaseLabel.overflowMode = TextOverflowModes.Truncate;
            _phaseLabel.raycastTarget = false;

            var timeGo = new GameObject("TimeLabel", typeof(RectTransform), typeof(TextMeshProUGUI));
            timeGo.transform.SetParent(rootRt, false);
            var timeRt = timeGo.GetComponent<RectTransform>();
            timeRt.anchorMin = new Vector2(0.76f, 0.45f);
            timeRt.anchorMax = new Vector2(1f, 1f);
            timeRt.offsetMin = Vector2.zero;
            timeRt.offsetMax = new Vector2(-2f, 0f);
            _timeLabel = timeGo.GetComponent<TextMeshProUGUI>();
            if (_monoFont != null) _timeLabel.font = _monoFont;
            else if (_sansFont != null) _timeLabel.font = _sansFont;
            _timeLabel.fontSize = 15f;
            _timeLabel.fontStyle = FontStyles.Bold;
            _timeLabel.color = new Color(0.97f, 0.85f, 0.56f, 1f);
            _timeLabel.alignment = TextAlignmentOptions.MidlineRight;
            _timeLabel.raycastTarget = false;

            // Fuse track (bottom half)
            var trackGo = new GameObject("FuseTrack", typeof(RectTransform), typeof(Image));
            trackGo.transform.SetParent(rootRt, false);
            var trackRt = trackGo.GetComponent<RectTransform>();
            trackRt.anchorMin = new Vector2(0f, 0f);
            trackRt.anchorMax = new Vector2(1f, 0.38f);
            trackRt.offsetMin = Vector2.zero;
            trackRt.offsetMax = Vector2.zero;
            var trackBorder = trackGo.GetComponent<Image>();
            trackBorder.color = BorderColor;
            trackBorder.raycastTarget = false;

            var innerGo = new GameObject("FuseInnerTrack", typeof(RectTransform), typeof(Image));
            innerGo.transform.SetParent(trackRt, false);
            var innerRt = innerGo.GetComponent<RectTransform>();
            innerRt.anchorMin = Vector2.zero;
            innerRt.anchorMax = Vector2.one;
            innerRt.offsetMin = new Vector2(1.5f, 1.5f);
            innerRt.offsetMax = new Vector2(-1.5f, -1.5f);
            var innerImg = innerGo.GetComponent<Image>();
            innerImg.color = TrackColor;
            innerImg.raycastTarget = false;

            var fillGo = new GameObject("FuseFill", typeof(RectTransform), typeof(Image));
            fillGo.transform.SetParent(innerRt, false);
            _fillRect = fillGo.GetComponent<RectTransform>();
            _fillRect.anchorMin = Vector2.zero;
            _fillRect.anchorMax = Vector2.one;
            _fillRect.offsetMin = Vector2.zero;
            _fillRect.offsetMax = Vector2.zero;
            _fillImage = fillGo.GetComponent<Image>();
            _fillImage.color = GoldFuseColor;
            _fillImage.raycastTarget = false;

            var sparkGo = new GameObject("FuseSpark", typeof(RectTransform), typeof(Image));
            sparkGo.transform.SetParent(innerRt, false);
            _sparkRect = sparkGo.GetComponent<RectTransform>();
            _sparkRect.anchorMin = new Vector2(1f, 0.5f);
            _sparkRect.anchorMax = new Vector2(1f, 0.5f);
            _sparkRect.pivot = new Vector2(0.5f, 0.5f);
            _sparkRect.anchoredPosition = Vector2.zero;
            _sparkRect.sizeDelta = new Vector2(10f, 14f);
            _sparkImage = sparkGo.GetComponent<Image>();
            _sparkImage.color = new Color(1f, 0.90f, 0.58f, 1f);
            _sparkImage.raycastTarget = false;

            _built = true;
            SetProgress(1f, _phaseText);
        }

        public void StartCountdown(float durationSeconds, string phaseText)
        {
            _durationSeconds = Mathf.Max(0.1f, durationSeconds);
            _remainingSeconds = _durationSeconds;
            _autoCountdown = true;
            _lastDisplayedSec = -1;
            _lastDisplayedPct = -1;
            SetProgress(1f, phaseText);
        }

        public void SetPaused(bool paused)
        {
            _isPaused = paused;
        }

        public void SetReducedMotion(bool reducedMotion)
        {
            _reducedMotion = reducedMotion;
            if (_reducedMotion && _sparkRect != null)
            {
                _sparkRect.localScale = Vector3.one;
            }
        }

        public void SetProgress(float normalized01, string phaseText)
        {
            if (!_built) BuildHierarchyIfNeeded(_sansFont, _monoFont);

            _progress = Mathf.Clamp01(normalized01);
            if (!string.IsNullOrEmpty(phaseText))
            {
                _phaseText = phaseText;
            }

            if (_phaseLabel != null && !string.Equals(_lastAppliedPhaseText, _phaseText, System.StringComparison.Ordinal))
            {
                _lastAppliedPhaseText = _phaseText;
                _phaseLabel.text = _phaseText;
            }

            if (_fillRect != null)
            {
                _fillRect.anchorMax = new Vector2(_progress, 1f);
            }

            if (_sparkRect != null)
            {
                _sparkRect.anchorMin = new Vector2(_progress, 0.5f);
                _sparkRect.anchorMax = new Vector2(_progress, 0.5f);
                _sparkRect.anchoredPosition = Vector2.zero;
                _sparkImage.enabled = _progress > 0.005f;
            }

            if (_timeLabel != null)
            {
                if (_autoCountdown)
                {
                    int sec = Mathf.CeilToInt(Mathf.Max(0f, _remainingSeconds));
                    if (_lastDisplayedSec != sec || _lastDisplayedPct != -1)
                    {
                        _lastDisplayedSec = sec;
                        _lastDisplayedPct = -1;
                        _timeLabel.text = $"{sec}s";
                    }
                }
                else
                {
                    int pct = Mathf.RoundToInt(_progress * 100f);
                    if (_lastDisplayedPct != pct || _lastDisplayedSec != -1)
                    {
                        _lastDisplayedPct = pct;
                        _lastDisplayedSec = -1;
                        _timeLabel.text = $"{pct}%";
                    }
                }
            }

            ApplyVisualTone(0f);
        }

        public void TickTimer(float dt)
        {
            if (!_built) return;
            if (dt <= 0f) return;

            if (_autoCountdown && !_isPaused)
            {
                _remainingSeconds = Mathf.Max(0f, _remainingSeconds - dt);
                float norm = _durationSeconds > 0f ? _remainingSeconds / _durationSeconds : 0f;
                SetProgress(norm, _phaseText);
            }

            bool isUrgent = _progress < 0.25f && _progress > 0f;
            float speed = isUrgent ? 8.5f : 2.2f;
            _pulseClock += dt * speed;

            float pulse = _reducedMotion ? 0f : (0.5f + 0.5f * Mathf.Sin(_pulseClock));
            ApplyVisualTone(pulse);
        }

        private void ApplyVisualTone(float pulse01)
        {
            if (_fillImage == null) return;

            bool isUrgent = _progress < 0.25f;
            Color baseColor = Color.Lerp(CinnabarFuseColor, GoldFuseColor, Mathf.SmoothStep(0f, 1f, _progress));
            if (isUrgent)
            {
                baseColor = Color.Lerp(CinnabarFuseColor, UrgentCinnabarColor, pulse01 * 0.7f);
            }
            _fillImage.color = baseColor;

            if (_sparkImage != null && _sparkRect != null)
            {
                if (_reducedMotion)
                {
                    _sparkRect.localScale = Vector3.one;
                    _sparkImage.color = isUrgent ? new Color(1f, 0.45f, 0.30f, 1f) : new Color(1f, 0.90f, 0.58f, 1f);
                }
                else
                {
                    float scale = isUrgent ? Mathf.Lerp(1.0f, 1.38f, pulse01) : Mathf.Lerp(0.95f, 1.12f, pulse01);
                    _sparkRect.localScale = new Vector3(scale, scale, 1f);
                    _sparkImage.color = isUrgent
                        ? Color.Lerp(new Color(1f, 0.40f, 0.25f, 1f), new Color(1f, 0.88f, 0.62f, 1f), pulse01)
                        : new Color(1f, 0.90f, 0.58f, 0.92f);
                }
            }

            if (_timeLabel != null)
            {
                _timeLabel.color = isUrgent
                    ? new Color(1f, 0.54f, 0.44f, 1f)
                    : new Color(0.97f, 0.85f, 0.56f, 1f);
            }
        }
    }
}
