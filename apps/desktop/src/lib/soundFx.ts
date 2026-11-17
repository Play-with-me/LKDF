export type MatchSoundEvent = 'TURN_START' | 'ACTION_PROMPT' | 'VICTORY';

interface ToneStep {
  readonly freq: number;
  readonly delaySec: number;
  readonly durationSec: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

let sharedAudioCtx: AudioContext | null = null;

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

const CUE_PATTERNS: Record<MatchSoundEvent, readonly ToneStep[]> = {
  TURN_START: [
    { freq: 196, delaySec: 0, durationSec: 0.14, gain: 0.14, type: 'triangle' },
    { freq: 523.25, delaySec: 0.04, durationSec: 0.22, gain: 0.1, type: 'sine' },
  ],
  ACTION_PROMPT: [
    { freq: 783.99, delaySec: 0, durationSec: 0.12, gain: 0.11, type: 'sine' },
    { freq: 1046.5, delaySec: 0.09, durationSec: 0.18, gain: 0.1, type: 'sine' },
  ],
  VICTORY: [
    { freq: 523.25, delaySec: 0, durationSec: 0.16, gain: 0.11, type: 'triangle' },
    { freq: 659.25, delaySec: 0.1, durationSec: 0.16, gain: 0.11, type: 'triangle' },
    { freq: 783.99, delaySec: 0.2, durationSec: 0.18, gain: 0.12, type: 'triangle' },
    { freq: 1046.5, delaySec: 0.32, durationSec: 0.36, gain: 0.13, type: 'sine' },
  ],
};

export function playMatchCue(event: MatchSoundEvent, enabled: boolean): void {
  if (!enabled) {
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
    // Bỏ qua an toàn nếu trình duyệt/Electron chưa có user gesture hoặc không hỗ trợ Web Audio.
  }
}
