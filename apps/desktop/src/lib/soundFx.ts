import { getSfxUrl } from './assetCatalog.js';

export type MatchSoundEvent =
  | 'TURN_START'
  | 'ACTION_PROMPT'
  | 'VICTORY'
  | 'CARD_PLAY'
  | 'DAMAGE'
  | 'HEAL'
  | 'EQUIP';

interface ToneStep {
  readonly freq: number;
  readonly delaySec: number;
  readonly durationSec: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

const SFX_STEM_BY_EVENT: Readonly<Record<MatchSoundEvent, string>> = {
  TURN_START: 'turn-start',
  ACTION_PROMPT: 'action-prompt',
  VICTORY: 'victory',
  CARD_PLAY: 'card-play',
  DAMAGE: 'damage',
  HEAL: 'heal',
  EQUIP: 'equip',
};

let sharedAudioCtx: AudioContext | null = null;
const cachedAudioByUrl = new Map<string, HTMLAudioElement>();

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
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

function tryPlayCustomSfxFile(event: MatchSoundEvent): boolean {
  const url = getSfxUrl(SFX_STEM_BY_EVENT[event]);
  if (!url || typeof Audio === 'undefined') {
    return false;
  }
  try {
    let audio = cachedAudioByUrl.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.volume = 0.55;
      cachedAudioByUrl.set(url, audio);
    }
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

const CUE_PATTERNS: Record<MatchSoundEvent, readonly ToneStep[]> = {
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
    { freq: 130.81, delaySec: 0, durationSec: 0.14, gain: 0.13, type: 'sawtooth' },
    { freq: 98.0, delaySec: 0.05, durationSec: 0.16, gain: 0.1, type: 'triangle' },
  ],
  HEAL: [
    { freq: 523.25, delaySec: 0, durationSec: 0.12, gain: 0.08, type: 'sine' },
    { freq: 659.25, delaySec: 0.08, durationSec: 0.18, gain: 0.08, type: 'sine' },
  ],
  EQUIP: [
    { freq: 440.0, delaySec: 0, durationSec: 0.09, gain: 0.08, type: 'triangle' },
    { freq: 659.25, delaySec: 0.05, durationSec: 0.12, gain: 0.07, type: 'sine' },
  ],
};

export function playMatchCue(event: MatchSoundEvent, enabled: boolean): void {
  if (!enabled) {
    return;
  }
  if (tryPlayCustomSfxFile(event)) {
    return;
  }
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime;
    const steps = CUE_PATTERNS[event];
    for (const step of steps) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, now + step.delaySec);

      gainNode.gain.setValueAtTime(0.0001, now + step.delaySec);
      gainNode.gain.linearRampToValueAtTime(
        step.gain,
        now + step.delaySec + 0.015,
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
