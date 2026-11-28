using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace CuuChau.VFX
{
    public enum ActionFeelKind
    {
        HitSlash,
        HealJade,
        NullifySeal,
        TurnChime
    }

    /// <summary>
    /// Bộ điều phối Game Feel 4 pha (Anticipation -> Hit-stop -> Trauma-squared Shake -> Follow-through)
    /// cho bàn đấu uGUI 2.5D. Hỗ trợ ReducedMotion và đảm bảo luôn khôi phục Time.timeScale = 1f.
    /// </summary>
    public sealed class ArenaFeelController : MonoBehaviour
    {
        [Header("Mục Tiêu Rung & Ánh Chớp Nhẹ")]
        [SerializeField] private RectTransform shakeTarget;
        [SerializeField] private Graphic screenTintGraphic;
        [SerializeField] private bool reducedMotion;

        [Header("Thông Số Trauma Shake (Unscaled Time)")]
        [SerializeField] private Vector2 maxShakeOffset = new Vector2(14f, 9f);
        [SerializeField, Range(0f, 3f)] private float maxRollDegrees = 0.85f;
        [SerializeField, Range(0.5f, 4f)] private float traumaDecayPerSec = 2.1f;

        [Header("Nhịp 4 Pha")]
        [SerializeField, Range(0.01f, 0.1f)] private float anticipationDuration = 0.04f;
        [SerializeField, Range(0.01f, 0.12f)] private float hitStopDuration = 0.045f;
        [SerializeField, Range(0.02f, 0.25f)] private float hitStopTimeScale = 0.05f;
        [SerializeField, Range(0.08f, 0.4f)] private float followThroughDuration = 0.18f;

        private static readonly int ReducedMotionShaderId = Shader.PropertyToID("_ReducedMotion");
        private static readonly int GlobalReducedMotionShaderId = Shader.PropertyToID("_GlobalReducedMotion");
        private const float MaxCumulativeTrauma = 0.78f;

        private Vector2 _restAnchoredPos = Vector2.zero;
        private Vector3 _restScale = Vector3.one;
        private Quaternion _restRotation = Quaternion.identity;
        private bool _hasTarget;

        private float _trauma;
        private float _noiseClock;
        private float _punchScaleOffset;
        private int _actionToken;
        private int _hitStopToken;
        private bool _ownsTimeScaleFreeze;
        private Coroutine _activeFeelRoutine;
        private Coroutine _activeTintRoutine;

        public bool ReducedMotion => reducedMotion;

        private void Awake()
        {
            ApplyGlobalReducedMotionShaderFlag(reducedMotion);
        }

        private void OnEnable()
        {
            ApplyGlobalReducedMotionShaderFlag(reducedMotion);
        }

        public void SetShakeTarget(RectTransform targetRoot)
        {
            if (_hasTarget && shakeTarget != null && shakeTarget != targetRoot)
            {
                ResetTargetTransform();
            }

            shakeTarget = targetRoot;
            _hasTarget = shakeTarget != null;
            if (_hasTarget)
            {
                _restAnchoredPos = shakeTarget.anchoredPosition;
                _restScale = shakeTarget.localScale;
                _restRotation = shakeTarget.localRotation;
            }
        }

        public void SetScreenTintGraphic(Graphic tintGraphic)
        {
            screenTintGraphic = tintGraphic;
            if (screenTintGraphic != null)
            {
                screenTintGraphic.raycastTarget = false;
                SetGraphicAlpha(screenTintGraphic, 0f);
            }
        }

        public void SetReducedMotion(bool enabled)
        {
            reducedMotion = enabled;
            ApplyGlobalReducedMotionShaderFlag(enabled);
            if (reducedMotion)
            {
                _trauma = 0f;
                _punchScaleOffset = 0f;
                RestoreTimeScaleIfOwned();
                ResetTargetTransform();
            }
        }

        private static void ApplyGlobalReducedMotionShaderFlag(bool enabled)
        {
            float val = enabled ? 1f : 0f;
            Shader.SetGlobalFloat(ReducedMotionShaderId, val);
            Shader.SetGlobalFloat(GlobalReducedMotionShaderId, val);
        }

        public void TriggerActionFeel(ActionFeelKind kind)
        {
            if (shakeTarget != null && !_hasTarget)
            {
                SetShakeTarget(shakeTarget);
            }

            if (_activeFeelRoutine != null)
            {
                StopCoroutine(_activeFeelRoutine);
                _activeFeelRoutine = null;
            }

            // Ensure Time.timeScale does not remain stuck if an earlier feel routine was interrupted.
            RestoreTimeScaleIfOwned();

            int token = ++_actionToken;
            _activeFeelRoutine = StartCoroutine(ExecuteFourPhaseRoutine(kind, token));
        }

        private void Update()
        {
            float dt = Time.unscaledDeltaTime;
            if (dt <= 0f) return;

            if (_trauma > 0f && !reducedMotion)
            {
                _trauma = Mathf.Max(0f, _trauma - traumaDecayPerSec * dt);
                _noiseClock += dt * 34f;

                if (_hasTarget && shakeTarget != null)
                {
                    float shake = _trauma * _trauma;
                    float sx = 0.62f * Mathf.Sin(_noiseClock * 1.7f) + 0.38f * Mathf.Sin(_noiseClock * 3.1f + 1.2f);
                    float sy = 0.62f * Mathf.Sin(_noiseClock * 2.3f + 0.7f) + 0.38f * Mathf.Sin(_noiseClock * 3.7f + 2.4f);
                    float sr = Mathf.Sin(_noiseClock * 1.3f + 0.4f);

                    shakeTarget.anchoredPosition = _restAnchoredPos + new Vector2(
                        maxShakeOffset.x * shake * sx,
                        maxShakeOffset.y * shake * sy
                    );
                    shakeTarget.localRotation = _restRotation * Quaternion.Euler(0f, 0f, maxRollDegrees * shake * sr);
                }

                if (_trauma <= 0f && _hasTarget && shakeTarget != null)
                {
                    shakeTarget.anchoredPosition = _restAnchoredPos;
                    shakeTarget.localRotation = _restRotation;
                }
            }
        }

        private IEnumerator ExecuteFourPhaseRoutine(ActionFeelKind kind, int token)
        {
            GetFeelProfile(
                kind,
                out float anticipationScaleDip,
                out bool useTimeScaleHitStop,
                out float traumaAmount,
                out float followThroughBoost,
                out Color tintColor,
                out float tintPeakAlpha
            );

            // Phase 1: Anticipation (40ms subtle inward tension)
            float antElapsed = 0f;
            while (antElapsed < anticipationDuration)
            {
                if (token != _actionToken) yield break;
                antElapsed += Time.unscaledDeltaTime;
                float t = Mathf.Clamp01(antElapsed / Mathf.Max(0.001f, anticipationDuration));
                float easeIn = t * t;
                _punchScaleOffset = reducedMotion ? 0f : -anticipationScaleDip * easeIn;
                ApplyTargetScale();
                yield return null;
            }

            if (token != _actionToken) yield break;

            // Phase 2: Hit-stop (45ms Time.timeScale = 0.05f or unscaled beat for UI safety)
            if (useTimeScaleHitStop && !reducedMotion)
            {
                int myStopId = ++_hitStopToken;
                _ownsTimeScaleFreeze = true;
                Time.timeScale = hitStopTimeScale;
                yield return new WaitForSecondsRealtime(hitStopDuration);

                if (myStopId == _hitStopToken)
                {
                    Time.timeScale = 1f;
                    _ownsTimeScaleFreeze = false;
                }
            }
            else
            {
                yield return new WaitForSecondsRealtime(hitStopDuration);
            }

            if (token != _actionToken) yield break;

            // Phase 3: Trauma-squared camera/tabletop shake + gentle color cue
            if (!reducedMotion)
            {
                _trauma = Mathf.Clamp(_trauma + traumaAmount, 0f, MaxCumulativeTrauma);
                TriggerTintPulse(tintColor, tintPeakAlpha, followThroughDuration);
            }
            else
            {
                // ReducedMotion: no screen shake or bright flash; keep a very soft static-feel tint fade.
                TriggerTintPulse(tintColor, Mathf.Min(tintPeakAlpha, 0.12f), followThroughDuration);
            }

            // Phase 4: Follow-through (smooth overshoot settle back to rest)
            float ftElapsed = 0f;
            float ftDur = Mathf.Max(0.04f, followThroughDuration);
            while (ftElapsed < ftDur)
            {
                if (token != _actionToken) yield break;
                ftElapsed += Time.unscaledDeltaTime;
                float u = Mathf.Clamp01(ftElapsed / ftDur);
                float settle = Mathf.Sin(u * Mathf.PI) * (1f - u);
                _punchScaleOffset = reducedMotion ? 0f : followThroughBoost * settle;
                ApplyTargetScale();
                yield return null;
            }

            if (token == _actionToken)
            {
                _punchScaleOffset = 0f;
                ApplyTargetScale();
                _activeFeelRoutine = null;
            }
        }

        private void TriggerTintPulse(Color tintColor, float peakAlpha, float duration)
        {
            if (screenTintGraphic == null || peakAlpha <= 0f) return;

            if (_activeTintRoutine != null)
            {
                StopCoroutine(_activeTintRoutine);
            }
            _activeTintRoutine = StartCoroutine(TintPulseRoutine(tintColor, peakAlpha, duration));
        }

        private IEnumerator TintPulseRoutine(Color tintColor, float peakAlpha, float duration)
        {
            float fadeIn = 0.035f;
            float fadeOut = Mathf.Max(0.08f, duration);

            Color c = tintColor;
            for (float e = 0f; e < fadeIn; e += Time.unscaledDeltaTime)
            {
                c.a = Mathf.Lerp(0f, peakAlpha, Mathf.Clamp01(e / fadeIn));
                screenTintGraphic.color = c;
                yield return null;
            }

            for (float e = 0f; e < fadeOut; e += Time.unscaledDeltaTime)
            {
                float t = Mathf.Clamp01(e / fadeOut);
                c.a = Mathf.Lerp(peakAlpha, 0f, 1f - (1f - t) * (1f - t));
                screenTintGraphic.color = c;
                yield return null;
            }

            SetGraphicAlpha(screenTintGraphic, 0f);
            _activeTintRoutine = null;
        }

        private static void GetFeelProfile(
            ActionFeelKind kind,
            out float anticipationScaleDip,
            out bool useTimeScaleHitStop,
            out float traumaAmount,
            out float followThroughBoost,
            out Color tintColor,
            out float tintPeakAlpha)
        {
            switch (kind)
            {
                case ActionFeelKind.HitSlash:
                    anticipationScaleDip = 0.012f;
                    useTimeScaleHitStop = true;
                    traumaAmount = 0.56f;
                    followThroughBoost = 0.018f;
                    tintColor = new Color(0.86f, 0.22f, 0.14f, 0f);
                    tintPeakAlpha = 0.22f;
                    break;

                case ActionFeelKind.HealJade:
                    anticipationScaleDip = 0.006f;
                    useTimeScaleHitStop = false;
                    traumaAmount = 0.16f;
                    followThroughBoost = 0.010f;
                    tintColor = new Color(0.24f, 0.72f, 0.52f, 0f);
                    tintPeakAlpha = 0.16f;
                    break;

                case ActionFeelKind.NullifySeal:
                    anticipationScaleDip = 0.010f;
                    useTimeScaleHitStop = true;
                    traumaAmount = 0.38f;
                    followThroughBoost = 0.014f;
                    tintColor = new Color(0.95f, 0.78f, 0.32f, 0f);
                    tintPeakAlpha = 0.20f;
                    break;

                case ActionFeelKind.TurnChime:
                default:
                    anticipationScaleDip = 0.004f;
                    useTimeScaleHitStop = false;
                    traumaAmount = 0.10f;
                    followThroughBoost = 0.008f;
                    tintColor = new Color(0.92f, 0.76f, 0.38f, 0f);
                    tintPeakAlpha = 0.10f;
                    break;
            }
        }

        private void ApplyTargetScale()
        {
            if (!_hasTarget || shakeTarget == null) return;
            float s = 1f + _punchScaleOffset;
            shakeTarget.localScale = new Vector3(_restScale.x * s, _restScale.y * s, _restScale.z);
        }

        private void ResetTargetTransform()
        {
            if (shakeTarget == null) return;
            shakeTarget.anchoredPosition = _restAnchoredPos;
            shakeTarget.localScale = _restScale;
            shakeTarget.localRotation = _restRotation;
        }

        private void RestoreTimeScaleIfOwned()
        {
            if (_ownsTimeScaleFreeze)
            {
                _hitStopToken++;
                Time.timeScale = 1f;
                _ownsTimeScaleFreeze = false;
            }
        }

        private static void SetGraphicAlpha(Graphic g, float alpha)
        {
            if (g == null) return;
            Color c = g.color;
            c.a = alpha;
            g.color = c;
        }

        private void OnDisable()
        {
            _actionToken++;
            _trauma = 0f;
            _punchScaleOffset = 0f;
            RestoreTimeScaleIfOwned();
            ResetTargetTransform();
            SetGraphicAlpha(screenTintGraphic, 0f);
        }

        private void OnDestroy()
        {
            _actionToken++;
            _trauma = 0f;
            _punchScaleOffset = 0f;
            Time.timeScale = 1f;
            _ownsTimeScaleFreeze = false;
            ApplyGlobalReducedMotionShaderFlag(false);

            if (shakeTarget != null)
            {
                shakeTarget.anchoredPosition = Vector2.zero;
                shakeTarget.localScale = _restScale;
                shakeTarget.localRotation = _restRotation;
            }
        }
    }
}
