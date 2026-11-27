using CuuChau.Data;
using UnityEngine;

namespace CuuChau.Audio
{
    /// <summary>
    /// Điều phối 3 bản nhạc nền -20.0 LUFS (khóa pha sample từng nhịp trống Cao Trào 108 BPM)
    /// và phát 53 SFX theo hướng ghế bàn tròn.
    /// </summary>
    public sealed class CuuChauAudioController : MonoBehaviour
    {
        [SerializeField] private VisualCatalogSO catalog;
        [SerializeField, Range(0f, 1f)] private float bgmVolume = 0.72f;
        [SerializeField, Range(0f, 1f)] private float sfxVolume = 0.85f;
        [SerializeField] private int sfxVoiceCount = 8;

        private AudioSource _lobbySource;
        private AudioSource _battleSource;
        private AudioSource _climaxSource;
        private AudioSource[] _sfxPool;
        private int _nextVoiceIndex;
        private bool _isMuted;

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

        public void SetCatalog(VisualCatalogSO asset) => catalog = asset;

        public void SetMuted(bool muted)
        {
            _isMuted = muted;
            float factor = muted ? 0f : 1f;
            if (_lobbySource) _lobbySource.volume = bgmVolume * factor;
            if (_battleSource) _battleSource.volume = bgmVolume * factor;
            if (_climaxSource) _climaxSource.volume = 0f;
        }

        public void PlayLobbyMusic()
        {
            if (!Application.isPlaying || _lobbySource == null || catalog == null || catalog.bgmLobby == null) return;
            StopBattleMusic();

            if (!_lobbySource.isPlaying)
            {
                _lobbySource.clip = catalog.bgmLobby;
                _lobbySource.volume = _isMuted ? 0f : bgmVolume;
                _lobbySource.Play();
            }
        }

        public void PlayBattleMusic(bool climaxActive = false)
        {
            if (!Application.isPlaying || _battleSource == null || catalog == null || catalog.bgmBattle == null) return;
            if (_lobbySource.isPlaying) _lobbySource.Stop();

            double dspStart = AudioSettings.dspTime + 0.05;
            if (!_battleSource.isPlaying)
            {
                _battleSource.clip = catalog.bgmBattle;
                _battleSource.volume = _isMuted ? 0f : bgmVolume;
                _battleSource.PlayScheduled(dspStart);
            }

            if (catalog.bgmClimaxDrums != null)
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
                _climaxSource.volume = (_isMuted || !climaxActive) ? 0f : bgmVolume * 0.52f;
            }
        }

        public void SetClimaxActive(bool active)
        {
            if (_climaxSource == null) return;
            if (_battleSource != null && _battleSource.isPlaying && _climaxSource.isPlaying)
            {
                _climaxSource.timeSamples = _battleSource.timeSamples;
            }
            _climaxSource.volume = (_isMuted || !active) ? 0f : bgmVolume * 0.52f;
        }

        public void PlaySpatialSfx(string key, float panStereo = 0f, float pitchJitter = 0.04f)
        {
            if (_isMuted || catalog == null) return;
            AudioClip clip = catalog.FindSfx(key);
            if (clip == null) return;

            AudioSource src = _sfxPool[_nextVoiceIndex];
            _nextVoiceIndex = (_nextVoiceIndex + 1) % _sfxPool.Length;

            src.clip = clip;
            src.volume = sfxVolume;
            src.panStereo = Mathf.Clamp(panStereo, -0.75f, 0.75f);
            src.pitch = 1f + Random.Range(-pitchJitter, pitchJitter);
            src.Play();
        }

        private void StopBattleMusic()
        {
            if (_battleSource != null && _battleSource.isPlaying) _battleSource.Stop();
            if (_climaxSource != null && _climaxSource.isPlaying) _climaxSource.Stop();
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
