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
  | 'TIMER_TICK'
  | 'CARD_LIFT'
  | 'TARGET_LOCK';

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
  PANEL_OPEN: { stem: 'sfx-panel_open', bus: 'ui', defaultGain: 0.68, cooldownMs: 90 },
  PANEL_CLOSE: { stem: 'sfx-panel_close', bus: 'ui', defaultGain: 0.64, cooldownMs: 90 },
  UI_ERROR: { stem: 'sfx-ui_error', bus: 'alert', defaultGain: 0.78, cooldownMs: 110 },
  ROOM_JOIN: { stem: 'sfx-room_join', bus: 'ui', defaultGain: 0.76, cooldownMs: 110 },
  ROOM_LEAVE: { stem: 'sfx-room_leave', bus: 'ui', defaultGain: 0.70, cooldownMs: 110 },
  READY_ON: { stem: 'sfx-ready_on', bus: 'ui', defaultGain: 0.80, cooldownMs: 100 },
  HERO_LOCK: { stem: 'sfx-hero_lock', bus: 'sfx', defaultGain: 0.88, cooldownMs: 110, duckMusicMs: 550 },
  COUNTDOWN_START: { stem: 'sfx-countdown_start', bus: 'alert', defaultGain: 0.88, cooldownMs: 250, duckMusicMs: 1200 },
  CARD_LIFT: { stem: 'sfx-card_lift', bus: 'ui', defaultGain: 0.44, cooldownMs: 65, pitchJitter: 0.035 },
  TARGET_LOCK: { stem: 'sfx-target_lock', bus: 'ui', defaultGain: 0.48, cooldownMs: 75, pitchJitter: 0.025 },

  // Nhóm 2: Cẩm nang đặc trưng & Cao trào
  NULLIFICATION: { stem: 'sfx-nullification', bus: 'sfx', defaultGain: 0.90, cooldownMs: 110, duckMusicMs: 700 },
  DUEL: { stem: 'sfx-duel', bus: 'sfx', defaultGain: 0.92, cooldownMs: 110, duckMusicMs: 850 },
  TABLE_SKILL: { stem: 'sfx-table_skill', bus: 'sfx', defaultGain: 0.80, cooldownMs: 110, duckMusicMs: 750 },
  STEAL_DISMANTLE: { stem: 'sfx-steal_dismantle', bus: 'sfx', defaultGain: 0.78, cooldownMs: 100, pitchJitter: 0.035 },
  LIGHTNING: { stem: 'sfx-lightning', bus: 'sfx', defaultGain: 0.96, cooldownMs: 150, duckMusicMs: 1100 },
  CONTROL_SCROLL: { stem: 'sfx-control_scroll', bus: 'sfx', defaultGain: 0.82, cooldownMs: 110 },
  DYING: { stem: 'sfx-dying', bus: 'alert', defaultGain: 0.92, cooldownMs: 200, duckMusicMs: 1050 },
  TIMER_TICK: { stem: 'sfx-timer_tick', bus: 'alert', defaultGain: 0.72, cooldownMs: 110, pitchJitter: 0.035 },
  DEFEAT: { stem: 'sfx-defeat', bus: 'alert', defaultGain: 0.90, cooldownMs: 300, duckMusicMs: 1400 },

  // Nhóm 3: Bàn đấu & Trang bị
  DEAL_OPENING: { stem: 'sfx-deal_opening', bus: 'sfx', defaultGain: 0.70, cooldownMs: 150 },
  DEAL: { stem: 'sfx-deal', bus: 'sfx', defaultGain: 0.56, cooldownMs: 65, pitchJitter: 0.035 },
  SHUFFLE: { stem: 'sfx-shuffle', bus: 'sfx', defaultGain: 0.68, cooldownMs: 150 },
  CARD_PLAY: { stem: 'sfx-card_play', bus: 'sfx', defaultGain: 0.60, cooldownMs: 65, pitchJitter: 0.035 },
  SAT: { stem: 'sfx-sat', bus: 'sfx', defaultGain: 0.78, cooldownMs: 85, pitchJitter: 0.035 },
  THIEM: { stem: 'sfx-thiem', bus: 'sfx', defaultGain: 0.70, cooldownMs: 85, pitchJitter: 0.035 },
  DAO: { stem: 'sfx-dao', bus: 'sfx', defaultGain: 0.72, cooldownMs: 110 },
  HEAL: { stem: 'sfx-heal', bus: 'sfx', defaultGain: 0.66, cooldownMs: 110 },
  WEAPON: { stem: 'sfx-weapon', bus: 'sfx', defaultGain: 0.74, cooldownMs: 110 },
  ARMOR: { stem: 'sfx-armor', bus: 'sfx', defaultGain: 0.72, cooldownMs: 110 },
  MOUNT_PLUS: { stem: 'sfx-mount_plus', bus: 'sfx', defaultGain: 0.70, cooldownMs: 110 },
  MOUNT_MINUS: { stem: 'sfx-mount_minus', bus: 'sfx', defaultGain: 0.70, cooldownMs: 110 },
  JUDGE: { stem: 'sfx-judge', bus: 'sfx', defaultGain: 0.76, cooldownMs: 110 },
  HERO_SKILL: { stem: 'sfx-hero_skill', bus: 'sfx', defaultGain: 0.66, cooldownMs: 110, pitchJitter: 0.025 },
  TURN_START: { stem: 'sfx-turn_start', bus: 'alert', defaultGain: 0.76, cooldownMs: 110 },
  ACTION_PROMPT: { stem: 'sfx-action_prompt', bus: 'alert', defaultGain: 0.76, cooldownMs: 110 },
  DAMAGE: { stem: 'sfx-damage', bus: 'sfx', defaultGain: 0.84, cooldownMs: 80, pitchJitter: 0.035 },
  ELIMINATION: { stem: 'sfx-elimination', bus: 'sfx', defaultGain: 0.94, cooldownMs: 180, duckMusicMs: 1150 },
  VICTORY: { stem: 'sfx-victory', bus: 'alert', defaultGain: 0.92, cooldownMs: 300, duckMusicMs: 1400 },
};

const INTERFACE_CONFIG = {
  hover: { stem: 'sfx-hover', cooldownMs: 55, pitchJitter: 0.035, gain: 0.72 },
  click: { stem: 'sfx-click', cooldownMs: 50, pitchJitter: 0.035, gain: 0.82 },
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

const MAX_CONCURRENT_SFX_VOICES = 8;
const ROUND_ROBIN_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  'sfx-sat': ['sfx-sat', 'sfx-sat-v2', 'sfx-sat-v3'],
  'sfx-thiem': ['sfx-thiem', 'sfx-thiem-v2', 'sfx-thiem-v3'],
  'sfx-card_play': ['sfx-card_play', 'sfx-card_play-v2', 'sfx-card_play-v3'],
  'sfx-deal': ['sfx-deal', 'sfx-deal-v2', 'sfx-deal-v3'],
  'sfx-damage': ['sfx-damage', 'sfx-damage-v2', 'sfx-damage-v3'],
};

let sharedMixer: MixerNodes | null = null;
const decodedSounds = new Map<string, AudioBuffer>();
const pendingSounds = new Set<string>();
const lastPlayedAt = new Map<string, number>();
const activeSfxVoices = new Set<AudioBufferSourceNode>();
const lastRoundRobinIndex = new Map<string, number>();
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
      const variants = ROUND_ROBIN_VARIANTS[cfg.stem];
      if (variants) {
        for (const variant of variants) {
          preloadStem(mixer, variant);
        }
      }
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

function resolveRoundRobinStem(baseStem: string): string {
  const variants = ROUND_ROBIN_VARIANTS[baseStem];
  if (!variants || variants.length === 0) return baseStem;
  const prevIdx = lastRoundRobinIndex.get(baseStem) ?? -1;
  const nextIdx = (prevIdx + 1) % variants.length;
  lastRoundRobinIndex.set(baseStem, nextIdx);
  const candidate = variants[nextIdx];
  if (candidate && decodedSounds.has(candidate)) {
    return candidate;
  }
  return baseStem;
}

function playDecodedSound(
  stem: string,
  bus: AudioBusName,
  volume: number,
  delaySec = 0,
  pitchJitter = 0,
  pan = 0,
  playbackRateMultiplier = 1,
): boolean {
  const mixer = sharedMixer;
  const resolvedStem = resolveRoundRobinStem(stem);
  const buffer = decodedSounds.get(resolvedStem);
  if (!mixer || !buffer || mixer.ctx.state === 'closed') {
    if (mixer && !buffer && !pendingSounds.has(resolvedStem)) {
      preloadStem(mixer, resolvedStem);
    }
    return false;
  }

  if (bus === 'sfx' && activeSfxVoices.size >= MAX_CONCURRENT_SFX_VOICES) {
    return true;
  }

  const { ctx } = mixer;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const clampedPan = Math.max(-1, Math.min(1, pan));
  const panner =
    clampedPan !== 0 && typeof ctx.createStereoPanner === 'function'
      ? ctx.createStereoPanner()
      : null;

  source.buffer = buffer;
  const jitter = pitchJitter > 0 ? 1 + (Math.random() * 2 - 1) * pitchJitter : 1;
  source.playbackRate.value = jitter * playbackRateMultiplier;
  gain.gain.value = volume;

  if (panner) {
    panner.pan.value = clampedPan;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(getBusNode(mixer, bus));
  } else {
    source.connect(gain);
    gain.connect(getBusNode(mixer, bus));
  }

  if (bus === 'sfx') {
    activeSfxVoices.add(source);
  }
  source.onended = () => {
    activeSfxVoices.delete(source);
    source.disconnect();
    gain.disconnect();
    panner?.disconnect();
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

export interface MatchCueOptions {
  readonly pan?: number;
  readonly playbackRateMultiplier?: number;
}

export function playMatchCue(
  event: MatchSoundEvent,
  enabled: boolean,
  volume?: number,
  delaySec = 0,
  options?: MatchCueOptions,
): void {
  const cfg = CUE_CONFIG_BY_EVENT[event];
  const effectiveVolume = volume ?? cfg.defaultGain;
  if (!enabled || effectiveVolume <= 0) {
    return;
  }
  const cooldownKey = delaySec > 0 ? `${event}:${Math.round(delaySec * 1000)}` : event;
  if (!canPlayWithCooldown(cooldownKey, cfg.cooldownMs)) {
    return;
  }
  if (cfg.duckMusicMs) {
    if (delaySec > 0) {
      window.setTimeout(() => triggerMusicDucking(cfg.duckMusicMs!), Math.round(delaySec * 1000));
    } else {
      triggerMusicDucking(cfg.duckMusicMs);
    }
  }
  if (
    playDecodedSound(
      cfg.stem,
      cfg.bus,
      effectiveVolume,
      delaySec,
      cfg.pitchJitter ?? 0,
      options?.pan ?? 0,
      options?.playbackRateMultiplier ?? 1,
    )
  ) {
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
type AmbientStemKey = 'lobby' | 'battle' | 'climax-drums';
const ambientBuffers = new Map<AmbientStemKey, Promise<AudioBuffer>>();

function loadAmbientStem(ctx: AudioContext, stemKey: AmbientStemKey): Promise<AudioBuffer> {
  const existing = ambientBuffers.get(stemKey);
  if (existing) return existing;
  const stemName =
    stemKey === 'climax-drums'
      ? 'bgm-climax-drums'
      : `bgm-${stemKey}`;
  const url = getSfxUrl(stemName);
  if (!url) return Promise.reject(new Error(`Missing ambient URL: ${stemName}`));
  const promise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error();
      return response.arrayBuffer();
    })
    .then(bytes => ctx.decodeAudioData(bytes))
    .catch(error => {
      ambientBuffers.delete(stemKey);
      throw error;
    });
  ambientBuffers.set(stemKey, promise);
  return promise;
}

function resolveBaseTrack(track: AmbientTrack): BaseMusicTrack {
  return track === 'lobby' || track === 'waiting' ? 'lobby' : 'battle';
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
    let climaxSource: AudioBufferSourceNode | null = null;
    let climaxGain: GainNode | null = null;

    function climaxTargetGain(mode: AmbientTrack, level: number): number {
      return mode === 'climax' && level > 0 ? 0.52 * level : 0.0001;
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
      if (climaxGain && !stopped) {
        climaxGain.gain.setTargetAtTime(climaxTargetGain(mode, currentLevel), ctx.currentTime, 0.18);
      }
    }

    function effectiveGainFor(mode: AmbientTrack, level: number): number {
      const modeScale = mode === 'waiting' ? 0.72 : mode === 'climax' ? 1.05 : 1.0;
      return level * modeScale;
    }

    async function mountTrack(mode: AmbientTrack, fadeInSec: number): Promise<boolean> {
      const token = ++switchToken;
      const base = resolveBaseTrack(mode);
      const [buffer, drumsBuffer] = await Promise.all([
        loadAmbientStem(ctx, base),
        base === 'battle'
          ? loadAmbientStem(ctx, 'climax-drums').catch(() => null)
          : Promise.resolve(null),
      ]);
      if (stopped || signal.aborted || token !== switchToken) return false;

      if (activeSource && activeGain) {
        fadeOutAndDispose(activeSource, activeGain, 0.5);
      }
      if (climaxSource && climaxGain) {
        fadeOutAndDispose(climaxSource, climaxGain, 0.5);
        climaxSource = null;
        climaxGain = null;
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;

      const startTime = ctx.currentTime;
      const target = effectiveGainFor(mode, currentLevel);
      if (fadeInSec > 0 && target > 0) {
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(target, startTime + fadeInSec);
      } else {
        gain.gain.setValueAtTime(target, startTime);
      }

      source.connect(gain);
      gain.connect(mixer!.musicBus);

      if (base === 'battle' && drumsBuffer) {
        const cSource = ctx.createBufferSource();
        const cGain = ctx.createGain();
        cSource.buffer = drumsBuffer;
        cSource.loop = true;
        cGain.gain.setValueAtTime(climaxTargetGain(mode, currentLevel), startTime);
        cSource.connect(cGain);
        cGain.connect(mixer!.musicBus);
        // Sample-locked dual playback: start both at the exact same AudioContext timestamp.
        source.start(startTime);
        cSource.start(startTime);
        climaxSource = cSource;
        climaxGain = cGain;
      } else {
        // If autoplay is blocked, the existing gesture handler unlocks the shared context.
        source.start(startTime);
      }

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
        if (climaxGain && !stopped) {
          climaxGain.gain.setTargetAtTime(climaxTargetGain(currentTrack, level), ctx.currentTime, 0.025);
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
        if (activeSource && activeGain) {
          try { activeSource.stop(); } catch { /* ignore */ }
          activeSource.disconnect();
          activeGain.disconnect();
          activeSource = null;
          activeGain = null;
        }
        if (climaxSource && climaxGain) {
          try { climaxSource.stop(); } catch { /* ignore */ }
          climaxSource.disconnect();
          climaxGain.disconnect();
          climaxSource = null;
          climaxGain = null;
        }
      },
    };
  } catch {
    return null;
  }
}
