using CuuChau.Data;
using UnityEngine;

namespace CuuChau.Audio
{
    /// <summary>
    /// Điều phối 3 bản nhạc nền -20.0 LUFS (khóa pha sample từng nhịp trống Cao Trào 108 BPM,
    /// crossfade ~0.35s mượt mà) và phát 53 SFX theo hướng ghế bàn tròn.
    /// </summary>
    public sealed class CuuChauAudioController : MonoBehaviour
    {
        private const float ClimaxLayerVolume = 0.52f;
        private const float ClimaxCrossfadeDurationSec = 0.35f;

        [SerializeField] private VisualCatalogSO catalog;
        [SerializeField, Range(0f, 1f)] private float bgmVolume = 0.72f;
        [SerializeField, Range(0f, 1f)] private float sfxVolume = 0.85f;
        [SerializeField] private int sfxVoiceCount = 8;

        private AudioSource _lobbySource;
        private AudioSource _battleSource;
        private AudioSource _climaxSource;
        private AudioSource[] _sfxPool;
        private int _nextVoiceIndex;

        private bool _bgmMuted;
        private bool _sfxMuted;
        private bool _isClimaxActive;

        public bool IsMuted => _bgmMuted && _sfxMuted;
        public bool IsBgmMuted => _bgmMuted;
        public bool IsSfxMuted => _sfxMuted;

        private void Awake()
        {
            _lobbySource = CreateMusicSource("BGM_Lobby", loop: true);
            _battleSource = CreateMusicSource("BGM_Battle", loop: true);
            _climaxSource = CreateMusicSource("BGM_ClimaxDrums", loop: true);

            _sfxPool = new AudioSource[sfxVoiceCount];
            for (int i = 0; i < sfxVoiceCount; i++)
            {
                var go = new GameObject($"SFX_Voice_{i}");
                go.transform.SetParent(transform, false);
                var src = go.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.loop = false;
                src.spatialBlend = 0f;
                _sfxPool[i] = src;
            }
        }

        private void Update()
        {
            if (_climaxSource == null) return;

            float dt = Time.unscaledDeltaTime;
            if (dt <= 0f) return;

            float targetClimaxVol = (!_bgmMuted && _isClimaxActive) ? ClimaxLayerVolume : 0f;

            if (_battleSource != null && _battleSource.isPlaying && _climaxSource.isPlaying)
            {
                SyncClimaxPhaseIfDrifted();
            }

            if (!Mathf.Approximately(_climaxSource.volume, targetClimaxVol))
            {
                float step = (ClimaxLayerVolume / ClimaxCrossfadeDurationSec) * dt;
                _climaxSource.volume = Mathf.MoveTowards(_climaxSource.volume, targetClimaxVol, step);
            }
        }

        public void SetCatalog(VisualCatalogSO asset) => catalog = asset;

        public void SetMuted(bool muted)
        {
            _bgmMuted = muted;
            _sfxMuted = muted;

            ApplyBgmMuteVolumesImmediate();
            if (_sfxMuted)
            {
                StopActiveSfxVoices();
            }
        }

        public void SetBgmMuted(bool muted)
        {
            _bgmMuted = muted;
            ApplyBgmMuteVolumesImmediate();
        }

        public void SetSfxMuted(bool muted)
        {
            _sfxMuted = muted;
            if (_sfxMuted)
            {
                StopActiveSfxVoices();
            }
        }

        public void PlayLobbyMusic()
        {
            if (!Application.isPlaying || _lobbySource == null || catalog == null || catalog.bgmLobby == null) return;
            StopBattleMusic();

            _lobbySource.volume = _bgmMuted ? 0f : bgmVolume;
            if (!_lobbySource.isPlaying)
            {
                _lobbySource.clip = catalog.bgmLobby;
                _lobbySource.Play();
            }
        }

        public void PlayBattleMusic(bool climaxActive = false)
        {
            _isClimaxActive = climaxActive;
            if (!Application.isPlaying || _battleSource == null || catalog == null || catalog.bgmBattle == null) return;
            if (_lobbySource != null && _lobbySource.isPlaying) _lobbySource.Stop();

            double dspStart = AudioSettings.dspTime + 0.05;
            _battleSource.volume = _bgmMuted ? 0f : bgmVolume;
            if (!_battleSource.isPlaying)
            {
                _battleSource.clip = catalog.bgmBattle;
                _battleSource.PlayScheduled(dspStart);
            }

            if (catalog.bgmClimaxDrums != null && _climaxSource != null)
            {
                if (!_climaxSource.isPlaying)
                {
                    _climaxSource.clip = catalog.bgmClimaxDrums;
                    _climaxSource.PlayScheduled(dspStart);
                }
                else
                {
                    // Sample-locked layer sync (2,560,000 samples @ 48 kHz)
                    _climaxSource.timeSamples = _battleSource.timeSamples;
                }
                _climaxSource.volume = (!_bgmMuted && _isClimaxActive) ? ClimaxLayerVolume : 0f;
            }
        }

        public void SetClimaxActive(bool active)
        {
            bool wasAudible = _climaxSource != null && _climaxSource.volume > 0.001f;
            _isClimaxActive = active;
            if (_climaxSource == null) return;

            if (active && !wasAudible && _battleSource != null && _battleSource.isPlaying && _climaxSource.isPlaying)
            {
                _climaxSource.timeSamples = _battleSource.timeSamples;
            }
        }

        public void StopBattleMusic()
        {
            _isClimaxActive = false;
            if (_battleSource != null && _battleSource.isPlaying)
            {
                _battleSource.Stop();
            }

            if (_climaxSource != null)
            {
                _climaxSource.volume = 0f;
                if (_climaxSource.isPlaying)
                {
                    _climaxSource.Stop();
                }
            }
        }

        public void PlaySpatialSfx(string key, float panStereo = 0f, float pitchJitter = 0.04f)
        {
            if (_sfxMuted || catalog == null || _sfxPool == null || _sfxPool.Length == 0) return;
            AudioClip clip = catalog.FindSfx(key);
            if (clip == null) return;

            AudioSource src = _sfxPool[_nextVoiceIndex];
            _nextVoiceIndex = (_nextVoiceIndex + 1) % _sfxPool.Length;
            if (src == null) return;

            src.clip = clip;
            src.volume = sfxVolume;
            src.panStereo = Mathf.Clamp(panStereo, -0.75f, 0.75f);
            src.pitch = 1f + Random.Range(-pitchJitter, pitchJitter);
            src.Play();
        }

        private void ApplyBgmMuteVolumesImmediate()
        {
            if (_lobbySource != null)
            {
                _lobbySource.volume = _bgmMuted ? 0f : bgmVolume;
            }

            if (_battleSource != null)
            {
                _battleSource.volume = _bgmMuted ? 0f : bgmVolume;
            }

            if (_climaxSource != null)
            {
                if (!_bgmMuted && _isClimaxActive && _battleSource != null && _battleSource.isPlaying && _climaxSource.isPlaying)
                {
                    _climaxSource.timeSamples = _battleSource.timeSamples;
                }
                _climaxSource.volume = (!_bgmMuted && _isClimaxActive) ? ClimaxLayerVolume : 0f;
            }
        }

        private void SyncClimaxPhaseIfDrifted()
        {
            if (_battleSource.clip == null || _climaxSource.clip == null) return;

            int battleSample = _battleSource.timeSamples;
            int climaxSample = _climaxSource.timeSamples;
            int diff = Mathf.Abs(battleSample - climaxSample);
            int totalSamples = Mathf.Min(_battleSource.clip.samples, _climaxSource.clip.samples);
            if (totalSamples > 0)
            {
                diff = Mathf.Min(diff, totalSamples - diff);
            }

            if (diff > 512)
            {
                _climaxSource.timeSamples = battleSample;
            }
        }

        private void StopActiveSfxVoices()
        {
            if (_sfxPool == null) return;
            for (int i = 0; i < _sfxPool.Length; i++)
            {
                if (_sfxPool[i] != null && _sfxPool[i].isPlaying)
                {
                    _sfxPool[i].Stop();
                }
            }
        }

        private AudioSource CreateMusicSource(string objectName, bool loop)
        {
            var go = new GameObject(objectName);
            go.transform.SetParent(transform, false);
            var src = go.AddComponent<AudioSource>();
            src.playOnAwake = false;
            src.loop = loop;
            src.spatialBlend = 0f;
            return src;
        }
    }
}
