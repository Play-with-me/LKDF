import { getSfxUrl } from './assetCatalog.js';

export type MatchSoundEvent =
  | 'TURN_START'
  | 'ACTION_PROMPT'
  | 'VICTORY'
  | 'DEFEAT'
  | 'CARD_PLAY'
  | 'DAMAGE'
  | 'ELIMINATION'
  | 'HEAL'
  | 'WEAPON'
  | 'ARMOR'
  | 'MOUNT_PLUS'
  | 'MOUNT_MINUS'
  | 'SAT'
  | 'DAO'
  | 'THIEM'
  | 'HERO_SKILL'
  | 'TABLE_SKILL'
  | 'SHUFFLE'
  | 'DEAL'
  | 'DEAL_OPENING'
  | 'JUDGE'
  | 'PANEL_OPEN'
  | 'PANEL_CLOSE'
  | 'UI_ERROR'
  | 'ROOM_JOIN'
  | 'ROOM_LEAVE'
  | 'READY_ON'
  | 'HERO_LOCK'
  | 'COUNTDOWN_START'
  | 'NULLIFICATION'
  | 'DUEL'
  | 'STEAL_DISMANTLE'
  | 'LIGHTNING'
  | 'CONTROL_SCROLL'
  | 'DYING'
  | 'TIMER_TICK';

export type AudioBusName = 'sfx' | 'ui' | 'alert';
export type AmbientTrack = 'lobby' | 'waiting' | 'battle' | 'climax';

interface CueConfig {
  readonly stem: string;
  readonly bus: AudioBusName;
  readonly defaultGain: number;
  readonly cooldownMs: number;
  readonly pitchJitter?: number;
  readonly duckMusicMs?: number;
}

interface ToneStep {
  readonly freq: number;
  readonly delaySec: number;
  readonly durationSec: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

const CUE_CONFIG_BY_EVENT: Readonly<Record<MatchSoundEvent, CueConfig>> = {
  // Nhóm 1: Giao diện & Phòng chờ
  PANEL_OPEN: { stem: 'tqs-panel_open', bus: 'ui', defaultGain: 0.68, cooldownMs: 90 },
  PANEL_CLOSE: { stem: 'tqs-panel_close', bus: 'ui', defaultGain: 0.64, cooldownMs: 90 },
  UI_ERROR: { stem: 'tqs-ui_error', bus: 'alert', defaultGain: 0.78, cooldownMs: 110 },
  ROOM_JOIN: { stem: 'tqs-room_join', bus: 'ui', defaultGain: 0.76, cooldownMs: 110 },
  ROOM_LEAVE: { stem: 'tqs-room_leave', bus: 'ui', defaultGain: 0.70, cooldownMs: 110 },
  READY_ON: { stem: 'tqs-ready_on', bus: 'ui', defaultGain: 0.80, cooldownMs: 100 },
  HERO_LOCK: { stem: 'tqs-hero_lock', bus: 'sfx', defaultGain: 0.88, cooldownMs: 110, duckMusicMs: 550 },
  COUNTDOWN_START: { stem: 'tqs-countdown_start', bus: 'alert', defaultGain: 0.88, cooldownMs: 250, duckMusicMs: 1200 },

  // Nhóm 2: Cẩm nang đặc trưng & Cao trào
  NULLIFICATION: { stem: 'tqs-nullification', bus: 'sfx', defaultGain: 0.90, cooldownMs: 110, duckMusicMs: 700 },
  DUEL: { stem: 'tqs-duel', bus: 'sfx', defaultGain: 0.92, cooldownMs: 110, duckMusicMs: 850 },
  TABLE_SKILL: { stem: 'tqs-table_skill', bus: 'sfx', defaultGain: 0.80, cooldownMs: 110, duckMusicMs: 750 },
  STEAL_DISMANTLE: { stem: 'tqs-steal_dismantle', bus: 'sfx', defaultGain: 0.78, cooldownMs: 100, pitchJitter: 0.035 },
  LIGHTNING: { stem: 'tqs-lightning', bus: 'sfx', defaultGain: 0.96, cooldownMs: 150, duckMusicMs: 1100 },
  CONTROL_SCROLL: { stem: 'tqs-control_scroll', bus: 'sfx', defaultGain: 0.82, cooldownMs: 110 },
  DYING: { stem: 'tqs-dying', bus: 'alert', defaultGain: 0.92, cooldownMs: 200, duckMusicMs: 1050 },
  TIMER_TICK: { stem: 'tqs-timer_tick', bus: 'alert', defaultGain: 0.72, cooldownMs: 110, pitchJitter: 0.035 },
  DEFEAT: { stem: 'tqs-defeat', bus: 'alert', defaultGain: 0.90, cooldownMs: 300, duckMusicMs: 1400 },

  // Nhóm 3: Bàn đấu & Trang bị
  DEAL_OPENING: { stem: 'tqs-deal_opening', bus: 'sfx', defaultGain: 0.70, cooldownMs: 150 },
  DEAL: { stem: 'tqs-deal', bus: 'sfx', defaultGain: 0.56, cooldownMs: 65, pitchJitter: 0.035 },
  SHUFFLE: { stem: 'tqs-shuffle', bus: 'sfx', defaultGain: 0.68, cooldownMs: 150 },
  CARD_PLAY: { stem: 'tqs-card_play', bus: 'sfx', defaultGain: 0.60, cooldownMs: 65, pitchJitter: 0.035 },
  SAT: { stem: 'tqs-sat', bus: 'sfx', defaultGain: 0.78, cooldownMs: 85, pitchJitter: 0.035 },
  THIEM: { stem: 'tqs-thiem', bus: 'sfx', defaultGain: 0.70, cooldownMs: 85, pitchJitter: 0.035 },
  DAO: { stem: 'tqs-dao', bus: 'sfx', defaultGain: 0.72, cooldownMs: 110 },
  HEAL: { stem: 'tqs-heal', bus: 'sfx', defaultGain: 0.66, cooldownMs: 110 },
  WEAPON: { stem: 'tqs-weapon', bus: 'sfx', defaultGain: 0.74, cooldownMs: 110 },
  ARMOR: { stem: 'tqs-armor', bus: 'sfx', defaultGain: 0.72, cooldownMs: 110 },
  MOUNT_PLUS: { stem: 'tqs-mount_plus', bus: 'sfx', defaultGain: 0.70, cooldownMs: 110 },
  MOUNT_MINUS: { stem: 'tqs-mount_minus', bus: 'sfx', defaultGain: 0.70, cooldownMs: 110 },
  JUDGE: { stem: 'tqs-judge', bus: 'sfx', defaultGain: 0.76, cooldownMs: 110 },
  HERO_SKILL: { stem: 'tqs-hero_skill', bus: 'sfx', defaultGain: 0.66, cooldownMs: 110, pitchJitter: 0.025 },
  TURN_START: { stem: 'tqs-turn_start', bus: 'alert', defaultGain: 0.76, cooldownMs: 110 },
  ACTION_PROMPT: { stem: 'tqs-action_prompt', bus: 'alert', defaultGain: 0.76, cooldownMs: 110 },
  DAMAGE: { stem: 'tqs-damage', bus: 'sfx', defaultGain: 0.84, cooldownMs: 80, pitchJitter: 0.035 },
  ELIMINATION: { stem: 'tqs-elimination', bus: 'sfx', defaultGain: 0.94, cooldownMs: 180, duckMusicMs: 1150 },
  VICTORY: { stem: 'tqs-victory', bus: 'alert', defaultGain: 0.92, cooldownMs: 300, duckMusicMs: 1400 },
};

const INTERFACE_CONFIG = {
  hover: { stem: 'tqs-hover', cooldownMs: 55, pitchJitter: 0.035, gain: 0.72 },
  click: { stem: 'tqs-click', cooldownMs: 50, pitchJitter: 0.035, gain: 0.82 },
} as const;

interface MixerNodes {
  readonly ctx: AudioContext;
  readonly masterGain: GainNode;
  readonly limiterNode: DynamicsCompressorNode;
  readonly musicBus: GainNode;
  readonly musicDuckGain: GainNode;
  readonly musicFilter: BiquadFilterNode;
  readonly sfxBus: GainNode;
  readonly uiBus: GainNode;
  readonly alertBus: GainNode;
}

let sharedMixer: MixerNodes | null = null;
const decodedSounds = new Map<string, AudioBuffer>();
const pendingSounds = new Set<string>();
const lastPlayedAt = new Map<string, number>();
let duckReleaseTimer: number | null = null;
let matchSoundEnabled = true;

export function setMatchSoundEnabled(enabled: boolean): void {
  matchSoundEnabled = enabled;
}

export function isMatchSoundEnabled(): boolean {
  return matchSoundEnabled;
}

function getMixer(): MixerNodes | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!sharedMixer || sharedMixer.ctx.state === 'closed') {
    const ctx = new AudioCtx({ latencyHint: 'interactive' });

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;

    const limiterNode = ctx.createDynamicsCompressor();
    limiterNode.threshold.value = -10;
    limiterNode.knee.value = 10;
    limiterNode.ratio.value = 8;
    limiterNode.attack.value = 0.004;
    limiterNode.release.value = 0.14;

    const musicBus = ctx.createGain();
    musicBus.gain.value = 1;

    const musicDuckGain = ctx.createGain();
    musicDuckGain.gain.value = 1;

    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 20000;
    musicFilter.Q.value = 0.7;

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;

    const uiBus = ctx.createGain();
    uiBus.gain.value = 1;

    const alertBus = ctx.createGain();
    alertBus.gain.value = 1;

    musicBus.connect(musicDuckGain);
    musicDuckGain.connect(musicFilter);
    musicFilter.connect(masterGain);

    sfxBus.connect(masterGain);
    uiBus.connect(masterGain);
    alertBus.connect(masterGain);

    masterGain.connect(limiterNode);
    limiterNode.connect(ctx.destination);

    sharedMixer = {
      ctx,
      masterGain,
      limiterNode,
      musicBus,
      musicDuckGain,
      musicFilter,
      sfxBus,
      uiBus,
      alertBus,
    };
    decodedSounds.clear();
    pendingSounds.clear();
  }
  return sharedMixer;
}

function getBusNode(mixer: MixerNodes, bus: AudioBusName): GainNode {
  if (bus === 'ui') return mixer.uiBus;
  if (bus === 'alert') return mixer.alertBus;
  return mixer.sfxBus;
}

function triggerMusicDucking(durationMs: number): void {
  const mixer = getMixer();
  if (!mixer || mixer.ctx.state === 'closed') return;
  const now = mixer.ctx.currentTime;
  mixer.musicDuckGain.gain.cancelScheduledValues(now);
  // -9 dB ≈ 0.355 gain
  mixer.musicDuckGain.gain.setTargetAtTime(0.35, now, 0.035);

  if (duckReleaseTimer !== null) {
    window.clearTimeout(duckReleaseTimer);
  }
  duckReleaseTimer = window.setTimeout(() => {
    duckReleaseTimer = null;
    if (sharedMixer && sharedMixer.ctx.state !== 'closed') {
      sharedMixer.musicDuckGain.gain.setTargetAtTime(1.0, sharedMixer.ctx.currentTime, 0.18);
    }
  }, durationMs);
}

function preloadStem(mixer: MixerNodes, stem: string): void {
  const url = getSfxUrl(stem);
  if (!url || decodedSounds.has(stem) || pendingSounds.has(stem)) return;
  pendingSounds.add(stem);
  void fetch(url)
    .then(response => {
      if (!response.ok) throw new Error();
      return response.arrayBuffer();
    })
    .then(bytes => mixer.ctx.decodeAudioData(bytes))
    .then(buffer => {
      if (sharedMixer?.ctx === mixer.ctx) {
        decodedSounds.set(stem, buffer);
      }
    })
    .catch(() => undefined)
    .finally(() => {
      if (sharedMixer?.ctx === mixer.ctx) {
        pendingSounds.delete(stem);
      }
    });
}

export function prepareGameSounds(): void {
  try {
    const mixer = getMixer();
    if (!mixer) return;
    preloadStem(mixer, INTERFACE_CONFIG.hover.stem);
    preloadStem(mixer, INTERFACE_CONFIG.click.stem);
    for (const cfg of Object.values(CUE_CONFIG_BY_EVENT)) {
      preloadStem(mixer, cfg.stem);
    }
  } catch {
    // Audio initialization may be unavailable.
  }
}

export function unlockGameSounds(): void {
  try {
    const mixer = getMixer();
    if (mixer?.ctx.state === 'suspended') {
      void mixer.ctx.resume().catch(() => undefined);
    }
  } catch {
    // The browser may require a trusted gesture.
  }
}

function canPlayWithCooldown(key: string, cooldownMs: number): boolean {
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const prev = lastPlayedAt.get(key) ?? -Infinity;
  if (nowMs - prev < cooldownMs) return false;
  lastPlayedAt.set(key, nowMs);
  return true;
}

function playDecodedSound(
  stem: string,
  bus: AudioBusName,
  volume: number,
  delaySec = 0,
  pitchJitter = 0,
): boolean {
  const mixer = sharedMixer;
  const buffer = decodedSounds.get(stem);
  if (!mixer || !buffer || mixer.ctx.state === 'closed') {
    if (mixer && !buffer && !pendingSounds.has(stem)) {
      preloadStem(mixer, stem);
    }
    return false;
  }

  const { ctx } = mixer;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  if (pitchJitter > 0) {
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchJitter;
  }
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(getBusNode(mixer, bus));
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start(ctx.currentTime + delaySec);
  return true;
}

const CUE_PATTERNS: Partial<Record<MatchSoundEvent, readonly ToneStep[]>> = {
  TURN_START: [
    { freq: 164.81, delaySec: 0, durationSec: 0.14, gain: 0.12, type: 'triangle' },
    { freq: 392.0, delaySec: 0.04, durationSec: 0.2, gain: 0.08, type: 'sine' },
  ],
  ACTION_PROMPT: [
    { freq: 587.33, delaySec: 0, durationSec: 0.1, gain: 0.09, type: 'triangle' },
    { freq: 783.99, delaySec: 0.08, durationSec: 0.16, gain: 0.08, type: 'sine' },
  ],
  VICTORY: [
    { freq: 392.0, delaySec: 0, durationSec: 0.16, gain: 0.1, type: 'triangle' },
    { freq: 493.88, delaySec: 0.1, durationSec: 0.16, gain: 0.1, type: 'triangle' },
    { freq: 587.33, delaySec: 0.2, durationSec: 0.18, gain: 0.11, type: 'triangle' },
    { freq: 783.99, delaySec: 0.32, durationSec: 0.38, gain: 0.12, type: 'sine' },
  ],
  DEFEAT: [
    { freq: 392.0, delaySec: 0, durationSec: 0.18, gain: 0.1, type: 'sine' },
    { freq: 329.63, delaySec: 0.14, durationSec: 0.20, gain: 0.09, type: 'sine' },
    { freq: 261.63, delaySec: 0.30, durationSec: 0.35, gain: 0.08, type: 'sine' },
  ],
  CARD_PLAY: [
    { freq: 293.66, delaySec: 0, durationSec: 0.07, gain: 0.08, type: 'triangle' },
  ],
  DAMAGE: [
    { freq: 171, delaySec: 0, durationSec: 0.11, gain: 0.18, type: 'sawtooth' },
    { freq: 89, delaySec: 0.028, durationSec: 0.15, gain: 0.24, type: 'triangle' },
  ],
  ELIMINATION: [
    { freq: 143, delaySec: 0, durationSec: 0.14, gain: 0.18, type: 'sawtooth' },
    { freq: 81, delaySec: 0.033, durationSec: 0.34, gain: 0.28, type: 'triangle' },
    { freq: 59, delaySec: 0.085, durationSec: 0.40, gain: 0.18, type: 'triangle' },
  ],
  HEAL: [
    { freq: 523.25, delaySec: 0, durationSec: 0.12, gain: 0.08, type: 'sine' },
    { freq: 659.25, delaySec: 0.08, durationSec: 0.18, gain: 0.08, type: 'sine' },
  ],
  WEAPON: [
    { freq: 440.0, delaySec: 0, durationSec: 0.09, gain: 0.08, type: 'triangle' },
    { freq: 659.25, delaySec: 0.05, durationSec: 0.12, gain: 0.07, type: 'sine' },
  ],
  TIMER_TICK: [
    { freq: 680, delaySec: 0, durationSec: 0.045, gain: 0.12, type: 'triangle' },
  ],
};

export function playMatchCue(
  event: MatchSoundEvent,
  enabled: boolean,
  volume?: number,
  delaySec = 0,
): void {
  const cfg = CUE_CONFIG_BY_EVENT[event];
  const effectiveVolume = volume ?? cfg.defaultGain;
  if (!enabled || effectiveVolume <= 0) {
    return;
  }
  if (!canPlayWithCooldown(event, cfg.cooldownMs)) {
    return;
  }
  if (cfg.duckMusicMs) {
    if (delaySec > 0) {
      window.setTimeout(() => triggerMusicDucking(cfg.duckMusicMs!), Math.round(delaySec * 1000));
    } else {
      triggerMusicDucking(cfg.duckMusicMs);
    }
  }
  if (playDecodedSound(cfg.stem, cfg.bus, effectiveVolume, delaySec, cfg.pitchJitter ?? 0)) {
    return;
  }
  const fallback = CUE_PATTERNS[event];
  if (fallback) {
    playTones(fallback, cfg.bus, effectiveVolume, delaySec);
  }
}

const INTERFACE_CUES: Record<'hover' | 'click', readonly ToneStep[]> = {
  hover: [{ freq: 480, delaySec: 0, durationSec: 0.042, gain: 0.13, type: 'sine' }],
  click: [
    { freq: 320, delaySec: 0, durationSec: 0.055, gain: 0.22, type: 'triangle' },
    { freq: 520, delaySec: 0.025, durationSec: 0.045, gain: 0.12, type: 'sine' },
  ],
};

export function playInterfaceCue(event: 'hover' | 'click'): void {
  const mixer = sharedMixer;
  if (event === 'hover' && mixer?.ctx.state !== 'running') return;
  if (event === 'click') unlockGameSounds();
  const cfg = INTERFACE_CONFIG[event];
  if (!canPlayWithCooldown(`ui:${event}`, cfg.cooldownMs)) return;
  if (!playDecodedSound(cfg.stem, 'ui', cfg.gain, 0, cfg.pitchJitter)) {
    playTones(INTERFACE_CUES[event], 'ui', cfg.gain);
  }
}

function playTones(
  steps: readonly ToneStep[],
  bus: AudioBusName,
  volume: number,
  delaySec = 0,
): void {
  try {
    const mixer = getMixer();
    if (!mixer) {
      return;
    }
    const { ctx } = mixer;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime + delaySec;
    const busNode = getBusNode(mixer, bus);
    for (const step of steps) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, now + step.delaySec);

      gainNode.gain.setValueAtTime(0.0001, now + step.delaySec);
      gainNode.gain.linearRampToValueAtTime(
        Math.max(0.0001, step.gain * volume),
        now + step.delaySec + 0.003,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + step.delaySec + step.durationSec,
      );

      osc.connect(gainNode);
      gainNode.connect(busNode);

      osc.start(now + step.delaySec);
      osc.stop(now + step.delaySec + step.durationSec + 0.02);
    }
  } catch {
    // Bỏ qua an toàn nếu chưa có user gesture hoặc không hỗ trợ Web Audio.
  }
}

type BaseMusicTrack = 'lobby' | 'battle';
const ambientBuffers = new Map<BaseMusicTrack, Promise<AudioBuffer>>();

function resolveBaseTrack(track: AmbientTrack): BaseMusicTrack {
  return track === 'lobby' || track === 'waiting' ? 'lobby' : 'battle';
}

function loadAmbientBuffer(ctx: AudioContext, baseTrack: BaseMusicTrack): Promise<AudioBuffer> {
  const existing = ambientBuffers.get(baseTrack);
  if (existing) return existing;
  const url = getSfxUrl(`xich-bich-${baseTrack}-music`);
  if (!url) return Promise.reject(new Error('Missing ambient URL'));
  const promise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error();
      return response.arrayBuffer();
    })
    .then(bytes => ctx.decodeAudioData(bytes))
    .catch(error => {
      ambientBuffers.delete(baseTrack);
      throw error;
    });
  ambientBuffers.set(baseTrack, promise);
  return promise;
}

function scheduleClimaxPulse(
  mixer: MixerNodes,
  buffer: AudioBuffer,
  playbackRate: number,
  filterType: BiquadFilterType,
  filterHz: number,
  durationSec: number,
  peakGain: number,
): void {
  const { ctx } = mixer;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();

  src.buffer = buffer;
  src.playbackRate.value = playbackRate;
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterHz, t);
  filter.Q.value = 0.7;

  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peakGain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);

  src.connect(filter);
  filter.connect(g);
  g.connect(mixer.musicBus);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
  src.start(t);
  src.stop(t + durationSec + 0.03);
}

export interface AmbientLoopHandle {
  setLevel: (level: number) => void;
  setTrack: (track: AmbientTrack) => void;
  stop: () => void;
}

export async function createAmbientLoop(
  track: AmbientTrack,
  signal: AbortSignal,
): Promise<AmbientLoopHandle | null> {
  try {
    const mixer = getMixer();
    if (!mixer) return null;
    const { ctx } = mixer;

    let currentTrack: AmbientTrack = track;
    let currentBase: BaseMusicTrack = resolveBaseTrack(track);
    let currentLevel = 0;
    let stopped = false;
    let switchToken = 0;

    let activeSource: AudioBufferSourceNode | null = null;
    let activeGain: GainNode | null = null;
    let climaxTimer: number | null = null;
    let climaxBeat = 0;

    function stopClimaxLayer(): void {
      if (climaxTimer !== null) {
        window.clearInterval(climaxTimer);
        climaxTimer = null;
      }
      climaxBeat = 0;
    }

    function startClimaxLayer(): void {
      stopClimaxLayer();
      // 108 BPM eighth-note pulse = 277.7ms matching xich-bich-battle-music
      const stepMs = (60 / 108 / 2) * 1000;
      climaxTimer = window.setInterval(() => {
        if (stopped || currentTrack !== 'climax' || currentLevel <= 0 || ctx.state !== 'running') {
          return;
        }
        const step = climaxBeat % 8;
        climaxBeat += 1;

        if (step === 0 || step === 4) {
          const drumBuf = step === 0
            ? (decodedSounds.get('tqs-elimination') ?? decodedSounds.get('tqs-turn_start'))
            : decodedSounds.get('tqs-turn_start');
          if (drumBuf) {
            scheduleClimaxPulse(
              mixer!,
              drumBuf,
              step === 0 ? 0.86 : 0.96,
              'lowpass',
              step === 0 ? 155 : 190,
              step === 0 ? 0.26 : 0.21,
              (step === 0 ? 0.54 : 0.40) * currentLevel,
            );
          } else {
            preloadStem(mixer!, 'tqs-turn_start');
            preloadStem(mixer!, 'tqs-elimination');
          }
        } else if (step === 3 || step === 6) {
          const woodBuf = decodedSounds.get('tqs-timer_tick');
          if (woodBuf) {
            scheduleClimaxPulse(
              mixer!,
              woodBuf,
              step === 3 ? 0.90 : 1.0,
              'lowpass',
              1800,
              0.14,
              0.20 * currentLevel,
            );
          } else {
            preloadStem(mixer!, 'tqs-timer_tick');
          }
        } else if (step === 7) {
          const shimmerBuf = decodedSounds.get('tqs-thiem');
          if (shimmerBuf) {
            scheduleClimaxPulse(
              mixer!,
              shimmerBuf,
              1.05,
              'highpass',
              1800,
              0.12,
              0.10 * currentLevel,
            );
          } else {
            preloadStem(mixer!, 'tqs-thiem');
          }
        }
      }, stepMs);
    }

    function fadeOutAndDispose(src: AudioBufferSourceNode | null, g: GainNode | null, fadeSec: number): void {
      if (!src || !g) return;
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      window.setTimeout(() => {
        try { src.stop(); } catch { /* ignore */ }
        src.disconnect();
        g.disconnect();
      }, Math.ceil(fadeSec * 1000) + 40);
    }

    function applyFilterAndClimax(mode: AmbientTrack): void {
      const targetCutoff = mode === 'waiting' ? 1650 : 20000;
      mixer!.musicFilter.frequency.setTargetAtTime(targetCutoff, ctx.currentTime, 0.16);
      if (mode === 'climax') {
        startClimaxLayer();
      } else {
        stopClimaxLayer();
      }
    }

    function effectiveGainFor(mode: AmbientTrack, level: number): number {
      const modeScale = mode === 'waiting' ? 0.72 : mode === 'climax' ? 1.05 : 1.0;
      return level * modeScale;
    }

    async function mountTrack(mode: AmbientTrack, fadeInSec: number): Promise<boolean> {
      const token = ++switchToken;
      const base = resolveBaseTrack(mode);
      const buffer = await loadAmbientBuffer(ctx, base);
      if (stopped || signal.aborted || token !== switchToken) return false;

      if (activeSource && activeGain) {
        fadeOutAndDispose(activeSource, activeGain, 0.5);
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;

      const now = ctx.currentTime;
      const target = effectiveGainFor(mode, currentLevel);
      if (fadeInSec > 0 && target > 0) {
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(target, now + fadeInSec);
      } else {
        gain.gain.setValueAtTime(target, now);
      }

      source.connect(gain);
      gain.connect(mixer!.musicBus);
      // If autoplay is blocked, the existing gesture handler unlocks the shared context.
      source.start(now);

      activeSource = source;
      activeGain = gain;
      currentBase = base;
      applyFilterAndClimax(mode);
      return true;
    }

    const mounted = await mountTrack(track, 0.5);
    if (!mounted) return null;

    return {
      setLevel(level) {
        currentLevel = level;
        if (activeGain && !stopped) {
          activeGain.gain.setTargetAtTime(effectiveGainFor(currentTrack, level), ctx.currentTime, 0.025);
        }
      },
      setTrack(nextTrack) {
        if (stopped || nextTrack === currentTrack) return;
        currentTrack = nextTrack;
        const nextBase = resolveBaseTrack(nextTrack);
        if (nextBase === currentBase && activeSource && activeGain) {
          applyFilterAndClimax(nextTrack);
          activeGain.gain.setTargetAtTime(effectiveGainFor(nextTrack, currentLevel), ctx.currentTime, 0.15);
        } else {
          void mountTrack(nextTrack, 0.5).catch(() => undefined);
        }
      },
      stop() {
        if (stopped) return;
        stopped = true;
        stopClimaxLayer();
        if (activeSource && activeGain) {
          try { activeSource.stop(); } catch { /* ignore */ }
          activeSource.disconnect();
          activeGain.disconnect();
          activeSource = null;
          activeGain = null;
        }
      },
    };
  } catch {
    return null;
  }
}
