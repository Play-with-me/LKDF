import { getSfxUrl } from '../lib/assetCatalog.js';

export type DemoMusicMode = 'off' | 'lobby' | 'waiting' | 'battle' | 'climax';
export type AudioBusName = 'music' | 'sfx' | 'ui' | 'alert';
export type DemoSoundPack = 'v2' | 'v1';

const v2WavGlob = import.meta.glob<string>('./audio-v2/**/*.wav', {
  eager: true,
  import: 'default',
});

const V2_CUE_URLS: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const [rawPath, resolvedUrl] of Object.entries(v2WavGlob)) {
    const fileName = rawPath.split('/').pop() ?? rawPath;
    const stem = fileName.replace(/\.[^.]+$/, '').toUpperCase();
    if (stem && typeof resolvedUrl === 'string' && resolvedUrl.length > 0) {
      out[stem] = resolvedUrl;
    }
  }
  return out;
})();

export function getV2CueUrl(id: DemoCueId): string | null {
  return V2_CUE_URLS[id] ?? null;
}

export type DemoCueId =
  // Nhóm 1: Giao diện & Phòng chờ
  | 'HOVER'
  | 'CLICK'
  | 'PANEL_OPEN'
  | 'PANEL_CLOSE'
  | 'UI_ERROR'
  | 'ROOM_JOIN'
  | 'ROOM_LEAVE'
  | 'READY_ON'
  | 'HERO_LOCK'
  | 'COUNTDOWN_START'
  // Nhóm 2: Cẩm nang đặc trưng & Cao trào mới
  | 'NULLIFICATION'
  | 'DUEL'
  | 'TABLE_SKILL'
  | 'STEAL_DISMANTLE'
  | 'LIGHTNING'
  | 'CONTROL_SCROLL'
  | 'DYING'
  | 'TIMER_TICK'
  | 'DEFEAT'
  // Nhóm 3: Bàn đấu cơ bản & Trang bị (tài nguyên sẵn có đi qua bàn trộn mới)
  | 'DEAL_OPENING'
  | 'DEAL'
  | 'SHUFFLE'
  | 'CARD_PLAY'
  | 'SAT'
  | 'THIEM'
  | 'DAO'
  | 'HEAL'
  | 'WEAPON'
  | 'ARMOR'
  | 'MOUNT_PLUS'
  | 'MOUNT_MINUS'
  | 'JUDGE'
  | 'HERO_SKILL'
  | 'TURN_START'
  | 'ACTION_PROMPT'
  | 'DAMAGE'
  | 'ELIMINATION'
  | 'VICTORY';

export interface DemoCueMeta {
  readonly id: DemoCueId;
  readonly label: string;
  readonly detail: string;
  readonly group: 'ui_room' | 'scroll_climax' | 'combat_core';
  readonly bus: Exclude<AudioBusName, 'music'>;
  readonly isNew: boolean;
  readonly duckMusicMs?: number;
  readonly cooldownMs?: number;
  readonly pitchJitter?: number;
  readonly assetStem?: string;
  readonly gain: number;
}

export const DEMO_CUE_CATALOG: readonly DemoCueMeta[] = [
  // Nhóm 1: Giao diện & Phòng chờ
  { id: 'HOVER', label: 'Di chuột nút', detail: 'Chạm gỗ nhẹ', group: 'ui_room', bus: 'ui', isNew: false, assetStem: 'xich-bich-hover', gain: 0.72, cooldownMs: 55, pitchJitter: 0.025 },
  { id: 'CLICK', label: 'Bấm nút', detail: 'Xác nhận thao tác', group: 'ui_room', bus: 'ui', isNew: false, assetStem: 'xich-bich-click', gain: 0.82, cooldownMs: 45, pitchJitter: 0.02 },
  { id: 'PANEL_OPEN', label: 'Mở bảng / Hồ sơ', detail: 'Mở cuộn cổ thư', group: 'ui_room', bus: 'ui', isNew: true, gain: 0.68, cooldownMs: 90 },
  { id: 'PANEL_CLOSE', label: 'Đóng bảng / Esc', detail: 'Thu cuộn giấy gọn', group: 'ui_room', bus: 'ui', isNew: true, gain: 0.64, cooldownMs: 90 },
  { id: 'UI_ERROR', label: 'Báo lỗi / Nút khóa', detail: 'Gõ gỗ trầm cảnh báo', group: 'ui_room', bus: 'alert', isNew: true, gain: 0.78, cooldownMs: 140 },
  { id: 'ROOM_JOIN', label: 'Khách vào phòng', detail: 'Chuông ngọc 2 nốt sáng', group: 'ui_room', bus: 'ui', isNew: true, gain: 0.76, cooldownMs: 120 },
  { id: 'ROOM_LEAVE', label: 'Khách rời phòng', detail: 'Âm trầm lắng nhẹ', group: 'ui_room', bus: 'ui', isNew: true, gain: 0.70, cooldownMs: 120 },
  { id: 'READY_ON', label: 'Bấm Sẵn sàng', detail: 'Khánh đồng chắc tay', group: 'ui_room', bus: 'ui', isNew: true, gain: 0.80, cooldownMs: 100 },
  { id: 'HERO_LOCK', label: 'Khóa chọn tướng', detail: 'Đóng triện đá + vang đồng', group: 'ui_room', bus: 'sfx', isNew: true, gain: 0.88, duckMusicMs: 550, cooldownMs: 160 },
  { id: 'COUNTDOWN_START', label: 'Đếm ngược vào trận', detail: '3 nhịp trống chiến + chiêng', group: 'ui_room', bus: 'alert', isNew: true, gain: 0.88, duckMusicMs: 1200, cooldownMs: 500 },

  // Nhóm 2: Cẩm nang đặc trưng & Cao trào mới
  { id: 'NULLIFICATION', label: 'Vô Giải Khả Kích', detail: 'Ấn ngọc phản chế sắc lạnh', group: 'scroll_climax', bus: 'sfx', isNew: true, gain: 0.90, duckMusicMs: 700, cooldownMs: 140 },
  { id: 'DUEL', label: 'Quyết Đấu', detail: 'Trống đôi + chạm binh khí', group: 'scroll_climax', bus: 'sfx', isNew: true, gain: 0.92, duckMusicMs: 850, cooldownMs: 180 },
  { id: 'TABLE_SKILL', label: 'Cẩm nang Toàn bàn', detail: 'Nam Man / Vạn Tiễn / Đào Viên', group: 'scroll_climax', bus: 'sfx', isNew: false, assetStem: 'xich-bich-table-skill', gain: 0.80, duckMusicMs: 750, cooldownMs: 180 },
  { id: 'STEAL_DISMANTLE', label: 'Thuận Thủ / Quá Hà', detail: 'Rút giấy nhanh + vuốt gió', group: 'scroll_climax', bus: 'sfx', isNew: true, gain: 0.78, cooldownMs: 100, pitchJitter: 0.04 },
  { id: 'LIGHTNING', label: 'Thiểm Điện (Sét nổ)', detail: 'Tia sét xé trời + sấm rền', group: 'scroll_climax', bus: 'sfx', isNew: true, gain: 0.96, duckMusicMs: 1100, cooldownMs: 300 },
  { id: 'CONTROL_SCROLL', label: 'Lạc Bất Tư Thục', detail: 'Chuông trầm khóa pha đánh', group: 'scroll_climax', bus: 'sfx', isNew: true, gain: 0.82, duckMusicMs: 550, cooldownMs: 140 },
  { id: 'DYING', label: 'Hấp Hối (0 máu xin Đào)', detail: 'Nhịp tim gấp + hồi chuông khẩn', group: 'scroll_climax', bus: 'alert', isNew: true, gain: 0.92, duckMusicMs: 1050, cooldownMs: 300 },
  { id: 'TIMER_TICK', label: 'Đếm ngược 5 giây cuối', detail: 'Gõ mõ cảnh báo sắp hết giờ', group: 'scroll_climax', bus: 'alert', isNew: true, gain: 0.72, cooldownMs: 180, pitchJitter: 0.02 },
  { id: 'DEFEAT', label: 'Thất Bại (Thu quân)', detail: 'Sáo trầm ngũ cung lắng xuống', group: 'scroll_climax', bus: 'alert', isNew: true, gain: 0.90, duckMusicMs: 1400, cooldownMs: 500 },

  // Nhóm 3: Bàn đấu cơ bản & Trang bị
  { id: 'DEAL_OPENING', label: 'Chia bài mở màn', detail: 'Loạt phát bài đầu ván', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-deal-opening', gain: 0.70, cooldownMs: 220 },
  { id: 'DEAL', label: 'Rút bài', detail: 'Rút lá (biến thiên ±3.5%)', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-deal', gain: 0.56, cooldownMs: 65, pitchJitter: 0.035 },
  { id: 'SHUFFLE', label: 'Trộn chồng bài', detail: 'Xào lại chồng bài bỏ', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-shuffle', gain: 0.68, cooldownMs: 250 },
  { id: 'CARD_PLAY', label: 'Quăng lá bài', detail: 'Lá chạm mặt bàn gỗ', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-card-drop', gain: 0.60, cooldownMs: 65, pitchJitter: 0.035 },
  { id: 'SAT', label: 'Đánh Sát', detail: 'Vung đao tấn công', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-sat', gain: 0.78, cooldownMs: 85, pitchJitter: 0.035 },
  { id: 'THIEM', label: 'Đánh Thiểm', detail: 'Né đòn gió lướt', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-thiem', gain: 0.70, cooldownMs: 85, pitchJitter: 0.035 },
  { id: 'DAO', label: 'Dùng Đào', detail: 'Cứu sinh hồi phục', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-dao', gain: 0.72, cooldownMs: 110 },
  { id: 'HEAL', label: 'Hồi máu (Kỹ năng)', detail: 'Thanh Nang / Kết Nhân', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-heal', gain: 0.66, cooldownMs: 110 },
  { id: 'WEAPON', label: 'Trang bị Vũ khí', detail: 'Rút kiếm kim loại', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-weapon', gain: 0.74, cooldownMs: 110 },
  { id: 'ARMOR', label: 'Trang bị Phòng cụ', detail: 'Khoác giáp nặng', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-armor', gain: 0.72, cooldownMs: 110 },
  { id: 'MOUNT_PLUS', label: 'Ngựa phòng thủ (+1)', detail: 'Nhịp vó phòng thủ', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-mount-plus', gain: 0.70, cooldownMs: 120 },
  { id: 'MOUNT_MINUS', label: 'Ngựa tấn công (-1)', detail: 'Nhịp vó xung phong', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-mount-minus', gain: 0.70, cooldownMs: 120 },
  { id: 'JUDGE', label: 'Lật Phán xét', detail: 'Tiếng thẻ phán quyết', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-judge', gain: 0.76, duckMusicMs: 500, cooldownMs: 120 },
  { id: 'HERO_SKILL', label: 'Kích hoạt Kỹ năng', detail: 'Hào khí danh tướng', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-hero-skill', gain: 0.66, cooldownMs: 110, pitchJitter: 0.025 },
  { id: 'TURN_START', label: 'Đến lượt bạn', detail: 'Trống báo tới lượt', group: 'combat_core', bus: 'alert', isNew: false, assetStem: 'xich-bich-turn', gain: 0.76, cooldownMs: 180 },
  { id: 'ACTION_PROMPT', label: 'Cần phản ứng', detail: 'Chuông nhắc Thiểm / Vô Giải', group: 'combat_core', bus: 'alert', isNew: false, assetStem: 'xich-bich-reaction', gain: 0.76, cooldownMs: 140 },
  { id: 'DAMAGE', label: 'Trúng đòn mất máu', detail: 'Chém trúng + lực va', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-damage-slash', gain: 0.84, cooldownMs: 80, pitchJitter: 0.04 },
  { id: 'ELIMINATION', label: 'Kết liễu tướng', detail: 'Trống tử trận + tự hạ nhạc', group: 'combat_core', bus: 'sfx', isNew: false, assetStem: 'xich-bich-elimination', gain: 0.94, duckMusicMs: 1150, cooldownMs: 250 },
  { id: 'VICTORY', label: 'Chiến Thắng', detail: 'Khải hoàn đại thắng', group: 'combat_core', bus: 'alert', isNew: false, assetStem: 'xich-bich-victory', gain: 0.92, duckMusicMs: 1400, cooldownMs: 500 },
];

const CUE_MAP = new Map<DemoCueId, DemoCueMeta>(DEMO_CUE_CATALOG.map(item => [item.id, item]));

export interface MixerState {
  readonly soundPack: DemoSoundPack;
  readonly musicMode: DemoMusicMode;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly uiVolume: number;
  readonly limiterEnabled: boolean;
  readonly duckingEnabled: boolean;
  readonly pitchJitterEnabled: boolean;
  readonly isDucking: boolean;
  readonly limiterReductionDb: number;
  readonly lastEventText: string;
  readonly activeVoices: number;
  readonly mutedAll: boolean;
}

type Listener = (state: MixerState) => void;

class DemoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private musicBus: GainNode | null = null;
  private musicDuckGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private sfxBus: GainNode | null = null;
  private uiBus: GainNode | null = null;
  private alertBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private decodedAssets = new Map<string, AudioBuffer>();
  private loadingAssets = new Map<string, Promise<AudioBuffer | null>>();
  private lastPlayedAt = new Map<DemoCueId, number>();

  private activeMusicSource: AudioBufferSourceNode | null = null;
  private activeMusicGain: GainNode | null = null;
  private activeMusicTrack: 'lobby' | 'battle' | null = null;
  private climaxTimer: number | null = null;
  private climaxBeat = 0;
  private duckReleaseTimer: number | null = null;
  private musicLoadToken = 0;
  private pausedByVisibility = false;

  private listeners = new Set<Listener>();
  private state: MixerState = {
    soundPack: 'v2',
    musicMode: 'lobby',
    musicVolume: 0.28,
    sfxVolume: 0.85,
    uiVolume: 0.78,
    limiterEnabled: true,
    duckingEnabled: true,
    pitchJitterEnabled: true,
    isDucking: false,
    limiterReductionDb: 0,
    lastEventText: 'Sẵn sàng (Foley Thật v2) — Bấm bất kỳ nút nào để nghe thử bàn trộn 4 kênh.',
    activeVoices: 0,
    mutedAll: false,
  };

  private emit() {
    const snapshot = { ...this.state };
    for (const listener of this.listeners) listener(snapshot);
  }

  public getState(): MixerState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      const ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.ctx = ctx;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.state.mutedAll ? 0 : 1;

      this.limiterNode = ctx.createDynamicsCompressor();
      this.limiterNode.threshold.value = -10;
      this.limiterNode.knee.value = 10;
      this.limiterNode.ratio.value = 8;
      this.limiterNode.attack.value = 0.004;
      this.limiterNode.release.value = 0.14;

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.state.musicVolume;

      this.musicDuckGain = ctx.createGain();
      this.musicDuckGain.gain.value = 1;

      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 20000;
      this.musicFilter.Q.value = 0.7;

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.state.sfxVolume;

      this.uiBus = ctx.createGain();
      this.uiBus.gain.value = this.state.uiVolume;

      this.alertBus = ctx.createGain();
      this.alertBus.gain.value = this.state.sfxVolume;

      this.musicBus.connect(this.musicDuckGain);
      this.musicDuckGain.connect(this.musicFilter);
      this.musicFilter.connect(this.masterGain);

      this.sfxBus.connect(this.masterGain);
      this.uiBus.connect(this.masterGain);
      this.alertBus.connect(this.masterGain);

      this.rewireMasterOutput();
      this.noiseBuffer = this.createNoiseBuffer(ctx);
      this.decodedAssets.clear();
      this.loadingAssets.clear();
    }
    return this.ctx;
  }

  private rewireMasterOutput() {
    if (!this.ctx || !this.masterGain || !this.limiterNode) return;
    this.masterGain.disconnect();
    this.limiterNode.disconnect();
    if (this.state.limiterEnabled) {
      this.masterGain.connect(this.limiterNode);
      this.limiterNode.connect(this.ctx.destination);
    } else {
      this.masterGain.connect(this.ctx.destination);
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
  }

  public preloadAll(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    for (const cue of DEMO_CUE_CATALOG) {
      void this.loadBuffer(`v2:${cue.id}`, getV2CueUrl(cue.id));
      if (cue.assetStem) void this.loadBuffer(`v1:${cue.assetStem}`, getSfxUrl(cue.assetStem));
    }
    void this.loadBuffer('music:lobby', getSfxUrl('xich-bich-lobby-music'));
    void this.loadBuffer('music:battle', getSfxUrl('xich-bich-battle-music'));
  }

  private loadBuffer(cacheKey: string, url: string | null): Promise<AudioBuffer | null> {
    const existing = this.decodedAssets.get(cacheKey);
    if (existing) return Promise.resolve(existing);
    const inflight = this.loadingAssets.get(cacheKey);
    if (inflight) return inflight;

    const ctx = this.ensureContext();
    if (!ctx || !url) return Promise.resolve(null);

    const promise = fetch(url)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('HTTP'))))
      .then(bytes => ctx.decodeAudioData(bytes))
      .then(buffer => {
        if (ctx === this.ctx) this.decodedAssets.set(cacheKey, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => { this.loadingAssets.delete(cacheKey); });

    this.loadingAssets.set(cacheKey, promise);
    return promise;
  }

  public setSoundPack(pack: DemoSoundPack): void {
    if (this.state.soundPack === pack) return;
    this.state = {
      ...this.state,
      soundPack: pack,
      lastEventText: `Chuyển bộ âm → ${SOUND_PACK_LABELS[pack]}`,
    };
    this.emit();
    if (this.ctx) {
      this.preloadAll();
    }
  }

  public setBusVolume(bus: 'music' | 'sfx' | 'ui', value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    const ctx = this.ctx;
    if (bus === 'music') {
      this.state = { ...this.state, musicVolume: clamped };
      if (this.musicBus && ctx) this.musicBus.gain.setTargetAtTime(clamped, ctx.currentTime, 0.03);
    } else if (bus === 'sfx') {
      this.state = { ...this.state, sfxVolume: clamped };
      if (this.sfxBus && ctx) this.sfxBus.gain.setTargetAtTime(clamped, ctx.currentTime, 0.03);
      if (this.alertBus && ctx) this.alertBus.gain.setTargetAtTime(clamped, ctx.currentTime, 0.03);
    } else {
      this.state = { ...this.state, uiVolume: clamped };
      if (this.uiBus && ctx) this.uiBus.gain.setTargetAtTime(clamped, ctx.currentTime, 0.03);
    }
    this.emit();
  }

  public setMutedAll(muted: boolean): void {
    this.state = { ...this.state, mutedAll: muted };
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.025);
    }
    this.emit();
  }

  public setFeatureToggle(
    feature: 'limiterEnabled' | 'duckingEnabled' | 'pitchJitterEnabled',
    enabled: boolean,
  ): void {
    this.state = { ...this.state, [feature]: enabled };
    if (feature === 'limiterEnabled') {
      this.rewireMasterOutput();
    }
    if (feature === 'duckingEnabled' && !enabled && this.musicDuckGain && this.ctx) {
      this.musicDuckGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.08);
      this.state = { ...this.state, isDucking: false };
    }
    this.emit();
  }

  public setVisibilityPaused(paused: boolean): void {
    if (this.pausedByVisibility === paused) return;
    this.pausedByVisibility = paused;
    if (paused) {
      this.stopMusicNodes(0.15);
    } else if (this.state.musicMode !== 'off') {
      void this.applyMusicMode(this.state.musicMode);
    }
  }

  public async setMusicMode(mode: DemoMusicMode): Promise<void> {
    this.state = {
      ...this.state,
      musicMode: mode,
      lastEventText: `Chuyển nhạc nền → ${MUSIC_LABELS[mode]} (crossfade 0.6s)`,
    };
    this.emit();
    if (this.pausedByVisibility) return;
    await this.applyMusicMode(mode);
  }

  private stopClimaxLayer(): void {
    if (this.climaxTimer !== null) {
      window.clearInterval(this.climaxTimer);
      this.climaxTimer = null;
    }
    this.climaxBeat = 0;
  }

  private scheduleClimaxSample(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    buffer: AudioBuffer,
    opts: {
      readonly playbackRate: number;
      readonly filterType: BiquadFilterType;
      readonly filterHz: number;
      readonly durationSec: number;
      readonly peakGain: number;
    },
  ): void {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    src.buffer = buffer;
    src.playbackRate.value = opts.playbackRate;

    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.filterHz, t);
    filter.Q.value = 0.7;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(opts.peakGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.durationSec);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
    src.start(t);
    src.stop(t + opts.durationSec + 0.03);
  }

  private startClimaxLayer(): void {
    this.stopClimaxLayer();
    // 108 BPM eighth-note pulse = 277.7ms, matching xich-bich-battle-music.wav
    const stepMs = (60 / 108 / 2) * 1000;
    this.climaxTimer = window.setInterval(() => {
      if (this.pausedByVisibility || this.state.musicMode !== 'climax' || this.state.mutedAll) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running' || !this.musicBus) return;
      const step = this.climaxBeat % 8;
      this.climaxBeat += 1;
      const now = ctx.currentTime;

      if (this.state.soundPack === 'v2') {
        if (step === 0 || step === 4) {
          const drumBuf = step === 0
            ? (this.decodedAssets.get('v2:ELIMINATION') ?? this.decodedAssets.get('v2:TURN_START'))
            : this.decodedAssets.get('v2:TURN_START');
          if (drumBuf) {
            this.scheduleClimaxSample(ctx, this.musicBus, now, drumBuf, {
              playbackRate: step === 0 ? 0.86 : 0.96,
              filterType: 'lowpass',
              filterHz: step === 0 ? 155 : 190,
              durationSec: step === 0 ? 0.26 : 0.21,
              peakGain: step === 0 ? 0.54 : 0.40,
            });
            return;
          }
          void this.loadBuffer('v2:TURN_START', getV2CueUrl('TURN_START'));
          void this.loadBuffer('v2:ELIMINATION', getV2CueUrl('ELIMINATION'));
        } else if (step === 3 || step === 6) {
          const woodBuf = this.decodedAssets.get('v2:TIMER_TICK');
          if (woodBuf) {
            this.scheduleClimaxSample(ctx, this.musicBus, now, woodBuf, {
              playbackRate: step === 3 ? 0.90 : 1.0,
              filterType: 'lowpass',
              filterHz: 1800,
              durationSec: 0.14,
              peakGain: 0.20,
            });
            return;
          }
          void this.loadBuffer('v2:TIMER_TICK', getV2CueUrl('TIMER_TICK'));
        } else if (step === 7) {
          const shimmerBuf = this.decodedAssets.get('v2:THIEM');
          if (shimmerBuf) {
            this.scheduleClimaxSample(ctx, this.musicBus, now, shimmerBuf, {
              playbackRate: 1.05,
              filterType: 'highpass',
              filterHz: 1800,
              durationSec: 0.12,
              peakGain: 0.10,
            });
            return;
          }
          void this.loadBuffer('v2:THIEM', getV2CueUrl('THIEM'));
        }
      }

      if (step === 0 || step === 4) {
        // Deep Red Cliffs war-drum thump (v1 procedural fallback)
        this.scheduleDrumHit(ctx, this.musicBus, now, step === 0 ? 96 : 84, 38, 0.22, step === 0 ? 0.42 : 0.30);
      } else if (step === 3 || step === 6) {
        // Syncopated wooden war-clapper / heartbeat accent
        this.scheduleDrumHit(ctx, this.musicBus, now, 138, 62, 0.10, 0.16);
      } else if (step === 7) {
        // Subtle tension metallic shimmer before bar 1
        this.scheduleFilteredNoise(ctx, this.musicBus, now, 2800, 'bandpass', 2.4, 0.09, 0.06);
      }
    }, stepMs);
  }

  private stopMusicNodes(fadeSec: number): void {
    this.stopClimaxLayer();
    const ctx = this.ctx;
    const oldSource = this.activeMusicSource;
    const oldGain = this.activeMusicGain;
    this.activeMusicSource = null;
    this.activeMusicGain = null;
    this.activeMusicTrack = null;

    if (oldSource && oldGain && ctx) {
      const now = ctx.currentTime;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      window.setTimeout(() => {
        try { oldSource.stop(); } catch { /* ignore */ }
        oldSource.disconnect();
        oldGain.disconnect();
      }, Math.ceil(fadeSec * 1000) + 40);
    }
  }

  private async applyMusicMode(mode: DemoMusicMode): Promise<void> {
    const token = ++this.musicLoadToken;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus || !this.musicFilter) return;

    if (mode === 'off') {
      this.stopMusicNodes(0.45);
      return;
    }

    const wantedTrack: 'lobby' | 'battle' = mode === 'lobby' || mode === 'waiting' ? 'lobby' : 'battle';
    const targetCutoff = mode === 'waiting' ? 1650 : 20000;
    const targetTrackGain = mode === 'waiting' ? 0.72 : mode === 'climax' ? 1.05 : 1.0;

    this.musicFilter.frequency.setTargetAtTime(targetCutoff, ctx.currentTime, 0.16);

    if (this.activeMusicTrack === wantedTrack && this.activeMusicSource && this.activeMusicGain) {
      this.activeMusicGain.gain.setTargetAtTime(targetTrackGain, ctx.currentTime, 0.15);
      if (mode === 'climax') this.startClimaxLayer();
      else this.stopClimaxLayer();
      return;
    }

    const buffer = await this.loadBuffer(`music:${wantedTrack}`, getSfxUrl(`xich-bich-${wantedTrack}-music`));
    if (token !== this.musicLoadToken || !buffer || this.pausedByVisibility || this.state.musicMode !== mode) {
      return;
    }

    // Crossfade 0.6s out old track
    this.stopMusicNodes(0.6);

    const source = ctx.createBufferSource();
    const trackGain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;

    const now = ctx.currentTime;
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(targetTrackGain, now + 0.6);

    source.connect(trackGain);
    trackGain.connect(this.musicBus);
    source.start(now);

    this.activeMusicSource = source;
    this.activeMusicGain = trackGain;
    this.activeMusicTrack = wantedTrack;

    if (mode === 'climax') this.startClimaxLayer();
  }

  private triggerDucking(durationMs: number): void {
    if (!this.state.duckingEnabled || !this.musicDuckGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicDuckGain.gain.cancelScheduledValues(now);
    this.musicDuckGain.gain.setTargetAtTime(0.35, now, 0.035);
    this.state = { ...this.state, isDucking: true };
    this.emit();

    if (this.duckReleaseTimer !== null) window.clearTimeout(this.duckReleaseTimer);
    this.duckReleaseTimer = window.setTimeout(() => {
      this.duckReleaseTimer = null;
      if (this.musicDuckGain && this.ctx) {
        this.musicDuckGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.18);
      }
      this.state = { ...this.state, isDucking: false };
      this.emit();
    }, durationMs);
  }

  private getBusNode(bus: Exclude<AudioBusName, 'music'>): GainNode | null {
    if (bus === 'ui') return this.uiBus;
    if (bus === 'alert') return this.alertBus;
    return this.sfxBus;
  }

  private playDecodedBuffer(
    ctx: AudioContext,
    busNode: GainNode,
    buffer: AudioBuffer,
    startAt: number,
    gain: number,
    playbackRate: number,
  ): void {
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    let ended = false;
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;
    g.gain.value = gain;
    src.connect(g);
    g.connect(busNode);
    src.onended = () => {
      if (ended) return;
      ended = true;
      src.disconnect();
      g.disconnect();
      this.bumpVoiceCount(-1);
    };
    this.bumpVoiceCount(1);
    src.start(startAt);
  }

  public playCue(id: DemoCueId, options?: { readonly bypassCooldown?: boolean; readonly delaySec?: number }): boolean {
    const meta = CUE_MAP.get(id);
    if (!meta) return false;

    const nowMs = performance.now();
    const cooldown = meta.cooldownMs ?? 60;
    const last = this.lastPlayedAt.get(id) ?? 0;
    if (!options?.bypassCooldown && nowMs - last < cooldown) {
      return false;
    }
    this.lastPlayedAt.set(id, nowMs);

    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      if (id === 'HOVER') return false;
      void ctx.resume().catch(() => undefined);
    }

    const busNode = this.getBusNode(meta.bus);
    if (!busNode) return false;

    const delaySec = options?.delaySec ?? 0;
    const startAt = ctx.currentTime + delaySec;

    if (meta.duckMusicMs) {
      if (delaySec > 0) {
        window.setTimeout(() => this.triggerDucking(meta.duckMusicMs!), Math.round(delaySec * 1000));
      } else {
        this.triggerDucking(meta.duckMusicMs);
      }
    }

    const jitter = this.state.pitchJitterEnabled && meta.pitchJitter
      ? 1 + (Math.random() * 2 - 1) * meta.pitchJitter
      : 1;

    if (this.state.soundPack === 'v2') {
      const cacheKey = `v2:${id}`;
      const v2Url = getV2CueUrl(id);
      const buffer = this.decodedAssets.get(cacheKey);
      if (buffer) {
        this.playDecodedBuffer(ctx, busNode, buffer, startAt, meta.gain, jitter);
      } else if (v2Url) {
        void this.loadBuffer(cacheKey, v2Url).then(loaded => {
          if (!loaded || this.ctx !== ctx || ctx.state === 'closed') return;
          this.playDecodedBuffer(ctx, busNode, loaded, Math.max(ctx.currentTime, startAt), meta.gain, jitter);
        });
      } else {
        this.bumpVoiceCount(1);
        const durationEstimateMs = this.playProceduralCue(id, ctx, busNode, startAt, meta.gain, jitter);
        window.setTimeout(() => this.bumpVoiceCount(-1), Math.round(delaySec * 1000) + durationEstimateMs + 80);
      }
    } else if (meta.assetStem) {
      const cacheKey = `v1:${meta.assetStem}`;
      const buffer = this.decodedAssets.get(cacheKey);
      if (buffer) {
        this.playDecodedBuffer(ctx, busNode, buffer, startAt, meta.gain, jitter);
      } else {
        void this.loadBuffer(cacheKey, getSfxUrl(meta.assetStem));
        this.bumpVoiceCount(1);
        this.playProceduralCue(id, ctx, busNode, startAt, meta.gain, jitter);
        window.setTimeout(() => this.bumpVoiceCount(-1), 400);
      }
    } else {
      this.bumpVoiceCount(1);
      const durationEstimateMs = this.playProceduralCue(id, ctx, busNode, startAt, meta.gain, jitter);
      window.setTimeout(() => this.bumpVoiceCount(-1), Math.round(delaySec * 1000) + durationEstimateMs + 80);
    }

    const reduction = this.limiterNode && this.state.limiterEnabled
      ? Math.round(Math.abs(this.limiterNode.reduction) * 10) / 10
      : 0;

    const packTag = this.state.soundPack === 'v2' ? 'v2' : 'v1';
    this.state = {
      ...this.state,
      limiterReductionDb: reduction,
      lastEventText: `${meta.label} [${BUS_LABELS[meta.bus]} · ${packTag}]${meta.duckMusicMs && this.state.duckingEnabled ? ' · Tự hạ nhạc' : ''}${jitter !== 1 ? ` · Cao độ ${(jitter * 100).toFixed(1)}%` : ''}`,
    };
    this.emit();
    return true;
  }

  private bumpVoiceCount(delta: number): void {
    const next = Math.max(0, this.state.activeVoices + delta);
    const reduction = this.limiterNode && this.state.limiterEnabled
      ? Math.round(Math.abs(this.limiterNode.reduction) * 10) / 10
      : 0;
    this.state = { ...this.state, activeVoices: next, limiterReductionDb: reduction };
    this.emit();
  }

  // ---- Ancient Chinese (Cổ phong Xích Bích) Procedural Sound Synthesis ----
  private playProceduralCue(
    id: DemoCueId,
    ctx: AudioContext,
    bus: GainNode,
    t: number,
    gain: number,
    jitter: number,
  ): number {
    switch (id) {
      case 'PANEL_OPEN': {
        // Crisp parchment unfurl + light wood tap
        this.scheduleFilteredNoise(ctx, bus, t, 1400, 'bandpass', 1.6, 0.16, 0.24 * gain, 2800);
        this.scheduleWoodBlock(ctx, bus, t + 0.02, 460 * jitter, 0.09, 0.22 * gain);
        return 220;
      }
      case 'PANEL_CLOSE': {
        // Soft descending paper fold
        this.scheduleFilteredNoise(ctx, bus, t, 2200, 'bandpass', 1.8, 0.13, 0.20 * gain, 950);
        this.scheduleWoodBlock(ctx, bus, t + 0.015, 310 * jitter, 0.08, 0.18 * gain);
        return 180;
      }
      case 'UI_ERROR': {
        // Double hollow low wooden knock (clear, non-piercing warning)
        this.scheduleWoodBlock(ctx, bus, t, 195, 0.10, 0.34 * gain);
        this.scheduleWoodBlock(ctx, bus, t + 0.11, 152, 0.13, 0.38 * gain);
        return 280;
      }
      case 'ROOM_JOIN': {
        // Bright jade chime pentatonic rising (D5 -> A5)
        this.scheduleChime(ctx, bus, t, 587.33 * jitter, 0.38, 0.24 * gain);
        this.scheduleChime(ctx, bus, t + 0.085, 880.0 * jitter, 0.48, 0.26 * gain);
        return 560;
      }
      case 'ROOM_LEAVE': {
        // Soft descending wooden/bell sigh (A4 -> D4)
        this.scheduleChime(ctx, bus, t, 440.0, 0.26, 0.18 * gain);
        this.scheduleChime(ctx, bus, t + 0.09, 293.66, 0.36, 0.20 * gain);
        return 460;
      }
      case 'READY_ON': {
        // Resonant bronze khánh strike (G5 + fifth shimmer)
        this.scheduleBronzeBell(ctx, bus, t, 783.99 * jitter, 0.42, 0.26 * gain);
        this.scheduleWoodBlock(ctx, bus, t, 520, 0.05, 0.18 * gain);
        return 450;
      }
      case 'HERO_LOCK': {
        // Heavy carved stone seal stamp + deep bronze resonance
        this.scheduleDrumHit(ctx, bus, t, 128, 44, 0.26, 0.56 * gain);
        this.scheduleFilteredNoise(ctx, bus, t, 900, 'lowpass', 0.8, 0.08, 0.26 * gain);
        this.scheduleBronzeBell(ctx, bus, t + 0.03, 293.66, 0.72, 0.28 * gain);
        return 760;
      }
      case 'COUNTDOWN_START': {
        // 3 rapid war-drum hits -> ceremonial opening gong
        this.scheduleDrumHit(ctx, bus, t, 110, 48, 0.18, 0.42 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.32, 122, 52, 0.18, 0.46 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.64, 138, 58, 0.20, 0.52 * gain);
        this.scheduleBronzeBell(ctx, bus, t + 0.96, 220, 1.15, 0.40 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.96, 95, 36, 0.45, 0.56 * gain);
        return 2100;
      }
      case 'NULLIFICATION': {
        // Vô Giải Khả Kích: sharp air slice + crystalline jade counter-seal
        this.scheduleFilteredNoise(ctx, bus, t, 3600, 'highpass', 1.2, 0.14, 0.28 * gain, 1200);
        this.scheduleBronzeBell(ctx, bus, t + 0.02, 1174.66, 0.52, 0.28 * gain);
        this.scheduleChime(ctx, bus, t + 0.07, 880.0, 0.46, 0.26 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.01, 160, 68, 0.14, 0.26 * gain);
        return 620;
      }
      case 'DUEL': {
        // Quyết Đấu: twin war-drums + sharp steel sword clash
        this.scheduleDrumHit(ctx, bus, t, 118, 42, 0.28, 0.54 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.16, 132, 46, 0.30, 0.56 * gain);
        this.scheduleSwordClash(ctx, bus, t + 0.07, 0.46 * gain);
        this.scheduleSwordClash(ctx, bus, t + 0.24, 0.36 * gain);
        return 760;
      }
      case 'STEAL_DISMANTLE': {
        // Thuận Thủ / Quá Hà: crisp paper snatch + swift wind whoosh
        this.scheduleFilteredNoise(ctx, bus, t, 900, 'bandpass', 1.4, 0.18, 0.34 * gain, 3600);
        this.scheduleWoodBlock(ctx, bus, t + 0.05, 620 * jitter, 0.06, 0.22 * gain);
        this.scheduleChime(ctx, bus, t + 0.09, 659.25 * jitter, 0.20, 0.14 * gain);
        return 300;
      }
      case 'LIGHTNING': {
        // Thiểm Điện: jagged electric crack + rolling sub-bass thunder
        this.scheduleFilteredNoise(ctx, bus, t, 4800, 'highpass', 0.9, 0.16, 0.52 * gain, 900);
        this.scheduleFilteredNoise(ctx, bus, t + 0.04, 180, 'lowpass', 0.7, 1.05, 0.60 * gain, 65);
        this.scheduleDrumHit(ctx, bus, t + 0.02, 92, 28, 0.65, 0.65 * gain);
        this.scheduleFilteredNoise(ctx, bus, t + 0.15, 2200, 'bandpass', 2.0, 0.22, 0.28 * gain, 400);
        return 1200;
      }
      case 'CONTROL_SCROLL': {
        // Lạc Bất Tư Thục: bending descending bronze toll (sealing play phase)
        this.scheduleBendingBell(ctx, bus, t, 392.0, 293.66, 0.62, 0.30 * gain);
        this.scheduleWoodBlock(ctx, bus, t, 240, 0.09, 0.20 * gain);
        return 660;
      }
      case 'DYING': {
        // Hấp Hối: dramatic double heartbeat + urgent high alert chime
        this.scheduleDrumHit(ctx, bus, t, 76, 34, 0.20, 0.60 * gain);
        this.scheduleDrumHit(ctx, bus, t + 0.22, 68, 30, 0.24, 0.50 * gain);
        this.scheduleBronzeBell(ctx, bus, t + 0.04, 987.77, 0.36, 0.22 * gain);
        this.scheduleBronzeBell(ctx, bus, t + 0.42, 880.0, 0.48, 0.22 * gain);
        return 950;
      }
      case 'TIMER_TICK': {
        // Crisp wooden temple-block tick for last 5 seconds
        this.scheduleWoodBlock(ctx, bus, t, 880 * jitter, 0.055, 0.32 * gain);
        this.scheduleWoodBlock(ctx, bus, t + 0.008, 1320 * jitter, 0.035, 0.14 * gain);
        return 120;
      }
      case 'DEFEAT': {
        // Dignified melancholic Cổ phong pentatonic descent (A4 -> G4 -> F4 -> D4) + muffled drum
        this.scheduleDrumHit(ctx, bus, t, 82, 34, 0.55, 0.44 * gain);
        this.scheduleFluteNote(ctx, bus, t + 0.02, 440.0, 0.36, 0.22 * gain);
        this.scheduleFluteNote(ctx, bus, t + 0.30, 392.0, 0.34, 0.20 * gain);
        this.scheduleFluteNote(ctx, bus, t + 0.58, 349.23, 0.38, 0.20 * gain);
        this.scheduleFluteNote(ctx, bus, t + 0.88, 293.66, 0.85, 0.26 * gain);
        this.scheduleBronzeBell(ctx, bus, t + 0.88, 146.83, 0.95, 0.18 * gain);
        return 1800;
      }
      default: {
        // Fallback minimal tone if an existing asset is still decoding
        this.scheduleChime(ctx, bus, t, 440 * jitter, 0.22, 0.20 * gain);
        return 250;
      }
    }
  }

  private scheduleDrumHit(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    startHz: number,
    endHz: number,
    duration: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), t + duration);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private scheduleWoodBlock(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freq: number,
    duration: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.78, t + duration);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.015);
  }

  private scheduleChime(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freq: number,
    duration: number,
    peak: number,
  ): void {
    for (const [ratio, amp] of [[1, 1], [2.0, 0.35], [3.01, 0.14]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration / Math.sqrt(ratio));
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }
  }

  private scheduleBronzeBell(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freq: number,
    duration: number,
    peak: number,
  ): void {
    // Classic bronze bell inharmonic partials
    for (const [ratio, amp, decayScale] of [
      [1.0, 0.75, 1.0],
      [2.76, 0.32, 0.62],
      [5.4, 0.14, 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration * decayScale);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + duration * decayScale + 0.02);
    }
  }

  private scheduleBendingBell(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    fromHz: number,
    toHz: number,
    duration: number,
    peak: number,
  ): void {
    for (const [ratio, amp] of [[1, 0.8], [2.72, 0.28]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(fromHz * ratio, t);
      osc.frequency.exponentialRampToValueAtTime(toHz * ratio, t + duration * 0.75);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * amp, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }
  }

  private scheduleSwordClash(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    peak: number,
  ): void {
    this.scheduleFilteredNoise(ctx, dest, t, 4400, 'bandpass', 2.8, 0.12, peak * 0.55, 2100);
    for (const freq of [1680, 2490, 3810]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * 0.24, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.30);
    }
  }

  private scheduleFluteNote(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freq: number,
    duration: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.985, t);
    osc.frequency.linearRampToValueAtTime(freq, t + 0.06);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.03);

    // Soft bamboo breath layer
    this.scheduleFilteredNoise(ctx, dest, t, freq * 2.2, 'bandpass', 5.0, duration * 0.8, peak * 0.18);
  }

  private scheduleFilteredNoise(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freqStart: number,
    type: BiquadFilterType,
    q: number,
    duration: number,
    peak: number,
    freqEnd?: number,
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freqStart, t);
    if (freqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.015, duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + duration + 0.03);
  }
}

export const SOUND_PACK_LABELS: Readonly<Record<DemoSoundPack, string>> = {
  v2: 'Bộ Mới · Foley Thật v2',
  v1: 'Bộ Cũ · v1',
};

export const V2_COVERAGE_COUNT = DEMO_CUE_CATALOG.filter(cue => Boolean(getV2CueUrl(cue.id))).length;

export const MUSIC_LABELS: Readonly<Record<DemoMusicMode, string>> = {
  off: 'Tắt nhạc',
  lobby: 'Sảnh Xích Bích',
  waiting: 'Phòng chờ / Chọn tướng',
  battle: 'Trong trận (108 BPM)',
  climax: 'Cao trào tàn cuộc',
};

const BUS_LABELS: Readonly<Record<Exclude<AudioBusName, 'music'>, string>> = {
  sfx: 'Chiến đấu',
  ui: 'Giao diện',
  alert: 'Cảnh báo',
};

export const demoAudioEngine = new DemoAudioEngine();
