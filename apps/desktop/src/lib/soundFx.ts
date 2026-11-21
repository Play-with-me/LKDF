import { getSfxUrl } from './assetCatalog.js';

export type MatchSoundEvent =
  | 'TURN_START'
  | 'ACTION_PROMPT'
  | 'VICTORY'
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
  | 'JUDGE';

interface ToneStep {
  readonly freq: number;
  readonly delaySec: number;
  readonly durationSec: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

const SFX_STEM_BY_EVENT: Readonly<Record<MatchSoundEvent, string>> = {
  TURN_START: 'xich-bich-turn',
  ACTION_PROMPT: 'xich-bich-reaction',
  VICTORY: 'xich-bich-victory',
  CARD_PLAY: 'xich-bich-card-drop',
  DAMAGE: 'xich-bich-damage-slash',
  ELIMINATION: 'xich-bich-elimination',
  HEAL: 'xich-bich-heal',
  WEAPON: 'xich-bich-weapon',
  ARMOR: 'xich-bich-armor',
  MOUNT_PLUS: 'xich-bich-mount-plus',
  MOUNT_MINUS: 'xich-bich-mount-minus',
  SAT: 'xich-bich-sat',
  DAO: 'xich-bich-dao',
  THIEM: 'xich-bich-thiem',
  HERO_SKILL: 'xich-bich-hero-skill',
  TABLE_SKILL: 'xich-bich-table-skill',
  SHUFFLE: 'xich-bich-shuffle',
  DEAL: 'xich-bich-deal',
  DEAL_OPENING: 'xich-bich-deal-opening',
  JUDGE: 'xich-bich-judge',
};

let sharedAudioCtx: AudioContext | null = null;
const decodedSounds = new Map<string, AudioBuffer>();
const pendingSounds = new Set<string>();

function getAudioContext(): AudioContext | null {
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
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx({ latencyHint: 'interactive' });
    decodedSounds.clear();
    pendingSounds.clear();
  }
  return sharedAudioCtx;
}

const INTERFACE_STEMS = { hover: 'xich-bich-hover', click: 'xich-bich-click' } as const;

export function prepareGameSounds(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    for (const stem of [...Object.values(INTERFACE_STEMS), ...Object.values(SFX_STEM_BY_EVENT)]) {
      const url = getSfxUrl(stem);
      if (!url || decodedSounds.has(stem) || pendingSounds.has(stem)) continue;
      pendingSounds.add(stem);
      void fetch(url)
        .then(response => {
          if (!response.ok) throw new Error();
          return response.arrayBuffer();
        })
        .then(bytes => ctx.decodeAudioData(bytes))
        .then(buffer => { if (ctx === sharedAudioCtx) decodedSounds.set(stem, buffer); })
        .catch(() => undefined)
        .finally(() => { if (ctx === sharedAudioCtx) pendingSounds.delete(stem); });
    }
  } catch {
    // Audio initialization may be unavailable.
  }
}

export function unlockGameSounds(): void {
  try {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
  } catch {
    // The browser may require a trusted gesture.
  }
}

function playDecodedSound(stem: string, volume: number, delaySec = 0): boolean {
  const ctx = sharedAudioCtx;
  const buffer = decodedSounds.get(stem);
  if (!ctx || !buffer || ctx.state === 'closed') return false;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
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
};

export function playMatchCue(event: MatchSoundEvent, enabled: boolean, volume = 0.85, delaySec = 0): void {
  if (!enabled || volume <= 0) {
    return;
  }
  if (playDecodedSound(SFX_STEM_BY_EVENT[event], volume, delaySec)) {
    return;
  }
  const fallback = CUE_PATTERNS[event];
  if (fallback) playTones(fallback, volume, delaySec);
}

const INTERFACE_CUES: Record<'hover' | 'click', readonly ToneStep[]> = {
  hover: [{ freq: 480, delaySec: 0, durationSec: 0.042, gain: 0.13, type: 'sine' }],
  click: [
    { freq: 320, delaySec: 0, durationSec: 0.055, gain: 0.22, type: 'triangle' },
    { freq: 520, delaySec: 0.025, durationSec: 0.045, gain: 0.12, type: 'sine' },
  ],
};
export function playInterfaceCue(event: 'hover' | 'click'): void {
  if (event === 'hover' && sharedAudioCtx?.state !== 'running') return;
  if (event === 'click') unlockGameSounds();
  if (!playDecodedSound(INTERFACE_STEMS[event], 1)) playTones(INTERFACE_CUES[event], 1);
}

function playTones(steps: readonly ToneStep[], volume: number, delaySec = 0): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime + delaySec;
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
      gainNode.connect(ctx.destination);

      osc.start(now + step.delaySec);
      osc.stop(now + step.delaySec + step.durationSec + 0.02);
    }
  } catch {
    // Bỏ qua an toàn nếu chưa có user gesture hoặc không hỗ trợ Web Audio.
  }
}

export type AmbientTrack = 'lobby' | 'battle';
const ambientBuffers = new Map<AmbientTrack, Promise<AudioBuffer>>();

export async function createAmbientLoop(track: AmbientTrack, signal: AbortSignal): Promise<{
  setLevel: (level: number) => void;
  stop: () => void;
} | null> {
  try {
    const url = getSfxUrl(`xich-bich-${track}-music`);
    const ctx = getAudioContext();
    if (!url || !ctx) return null;
    let ambientBuffer = ambientBuffers.get(track);
    if (!ambientBuffer) {
      ambientBuffer = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error();
          return response.arrayBuffer();
        })
        .then(bytes => ctx.decodeAudioData(bytes))
        .catch(error => {
          ambientBuffers.delete(track);
          throw error;
        });
      ambientBuffers.set(track, ambientBuffer);
    }
    const buffer = await ambientBuffer;
    if (signal.aborted) return null;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(ctx.destination);
    // If autoplay is blocked, the existing gesture handler unlocks the shared context.
    source.start();

    return {
      setLevel(level) { gain.gain.setTargetAtTime(level, ctx.currentTime, 0.025); },
      stop() {
        source.stop();
        source.disconnect();
        gain.disconnect();
      },
    };
  } catch {
    return null;
  }
}
