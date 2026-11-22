import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Square, X, Sliders } from 'lucide-react';
import {
  DEMO_CUE_CATALOG,
  MUSIC_LABELS,
  V2_COVERAGE_COUNT,
  demoAudioEngine,
  type DemoCueId,
  type DemoMusicMode,
  type MixerState,
} from './demoAudioEngine.js';
import './demo-audio-studio.css';

type CueGroupFilter = 'all' | 'ui_room' | 'scroll_climax' | 'combat_core';

const GROUP_TABS: readonly { readonly id: CueGroupFilter; readonly label: string }[] = [
  { id: 'all', label: 'Tất cả (38 âm)' },
  { id: 'ui_room', label: 'Giao diện & Phòng chờ (10)' },
  { id: 'scroll_climax', label: 'Cẩm nang & Cao trào mới (9)' },
  { id: 'combat_core', label: 'Bàn đấu & Trang bị (19)' },
];

const MUSIC_MODES: readonly DemoMusicMode[] = ['lobby', 'waiting', 'battle', 'climax', 'off'];

interface RehearsalStep {
  readonly atMs: number;
  readonly caption: string;
  readonly cue?: DemoCueId;
  readonly music?: DemoMusicMode;
  readonly bypassCooldown?: boolean;
}

const REHEARSALS: readonly {
  readonly id: 'opening' | 'climax' | 'spam';
  readonly title: string;
  readonly subtitle: string;
  readonly steps: readonly RehearsalStep[];
}[] = [
  {
    id: 'opening',
    title: 'Diễn tập 1: Mở trận trọn luồng',
    subtitle: 'Vào phòng → Sẵn sàng → Trống đếm ngược → Khóa tướng → Chia bài mở màn',
    steps: [
      { atMs: 0, caption: 'Chuyển nhạc Phòng chờ (ấm, dịu hơn Sảnh)', music: 'waiting', cue: 'ROOM_JOIN' },
      { atMs: 750, caption: 'Khách bấm Sẵn sàng (Khánh đồng)', cue: 'READY_ON' },
      { atMs: 1450, caption: 'Chủ phòng bắt đầu — Đếm ngược 3 nhịp trống + chiêng', cue: 'COUNTDOWN_START' },
      { atMs: 3450, caption: 'Khóa chọn tướng (Đóng triện đá)', cue: 'HERO_LOCK' },
      { atMs: 4250, caption: 'Vào bàn đấu — Chuyển nhạc trận 108 BPM + Chia bài', music: 'battle', cue: 'DEAL_OPENING' },
    ],
  },
  {
    id: 'climax',
    title: 'Diễn tập 2: Cao trào sinh tử + Tự hạ nhạc',
    subtitle: 'Nhạc Cao trào → Sát → Trúng đòn → Hấp Hối → Vô Giải → Kết liễu → Thất bại',
    steps: [
      { atMs: 0, caption: 'Bật nhạc Cao trào tàn cuộc (thêm lớp trống chiến)', music: 'climax', cue: 'SAT' },
      { atMs: 700, caption: 'Trúng đòn mất máu', cue: 'DAMAGE' },
      { atMs: 1350, caption: 'Hấp Hối 0 máu — Tự hạ nhạc nền & cảnh báo nhịp tim', cue: 'DYING' },
      { atMs: 2550, caption: 'Đối thủ tung Vô Giải Khả Kích phản chế!', cue: 'NULLIFICATION' },
      { atMs: 3400, caption: 'Kết liễu tướng — Tự hạ nhạc sâu để trống tử trận nổi bật', cue: 'ELIMINATION' },
      { atMs: 4750, caption: 'Kết ván — Thất bại (Sáo trầm thu quân)', music: 'off', cue: 'DEFEAT' },
    ],
  },
  {
    id: 'spam',
    title: 'Diễn tập 3: Spam 8 người (Test Chống Rè)',
    subtitle: 'Xả 11 âm liên hoàn trong 2.2s — Hãy thử tắt/bật Chống rè (Limiter) để so sánh!',
    steps: [
      { atMs: 0, caption: 'Vạn Tiễn Tề Phát toàn bàn!', cue: 'TABLE_SKILL' },
      { atMs: 260, caption: 'Ghế 2 đánh Thiểm', cue: 'THIEM', bypassCooldown: true },
      { atMs: 420, caption: 'Ghế 3 trúng đòn', cue: 'DAMAGE', bypassCooldown: true },
      { atMs: 560, caption: 'Ghế 4 trúng đòn', cue: 'DAMAGE', bypassCooldown: true },
      { atMs: 700, caption: 'Ghế 5 kích hoạt kỹ năng phản đòn', cue: 'HERO_SKILL', bypassCooldown: true },
      { atMs: 900, caption: 'Ghế 6 đánh Thiểm', cue: 'THIEM', bypassCooldown: true },
      { atMs: 1080, caption: 'Ghế 7 trúng đòn & Hấp Hối', cue: 'DYING' },
      { atMs: 1550, caption: 'Kết liễu ghế 7!', cue: 'ELIMINATION' },
      { atMs: 1950, caption: 'Rút thưởng 3 lá liên tiếp (biến thiên cao độ)', cue: 'DEAL', bypassCooldown: true },
      { atMs: 2110, caption: 'Rút lá thưởng 2/3', cue: 'DEAL', bypassCooldown: true },
      { atMs: 2270, caption: 'Rút lá thưởng 3/3', cue: 'DEAL', bypassCooldown: true },
    ],
  },
];

export function DemoAudioStudio() {
  const [open, setOpen] = useState(false);
  const [mixer, setMixer] = useState<MixerState>(() => demoAudioEngine.getState());
  const [group, setGroup] = useState<CueGroupFilter>('all');
  const [flashingCue, setFlashingCue] = useState<DemoCueId | null>(null);
  const [activeRehearsal, setActiveRehearsal] = useState<string | null>(null);
  const [rehearsalCaption, setRehearsalCaption] = useState<string>('');

  const fabRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const rehearsalTimers = useRef<number[]>([]);

  useEffect(() => demoAudioEngine.subscribe(setMixer), []);

  function stopRehearsal() {
    for (const id of rehearsalTimers.current) window.clearTimeout(id);
    rehearsalTimers.current = [];
    setActiveRehearsal(null);
    setRehearsalCaption('');
  }

  useEffect(() => () => stopRehearsal(), []);

  useEffect(() => {
    if (!open) return;
    demoAudioEngine.unlock();
    demoAudioEngine.preloadAll();
    closeBtnRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        demoAudioEngine.playCue('PANEL_CLOSE');
        setOpen(false);
        requestAnimationFrame(() => fabRef.current?.focus({ preventScroll: true }));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  function triggerCue(id: DemoCueId, bypassCooldown = false) {
    demoAudioEngine.unlock();
    const played = demoAudioEngine.playCue(id, { bypassCooldown });
    if (played) {
      setFlashingCue(id);
      window.setTimeout(() => setFlashingCue(current => (current === id ? null : current)), 220);
    }
  }

  function runRehearsal(rehearsal: (typeof REHEARSALS)[number]) {
    stopRehearsal();
    demoAudioEngine.unlock();
    demoAudioEngine.preloadAll();
    setActiveRehearsal(rehearsal.id);

    const lastAt = rehearsal.steps[rehearsal.steps.length - 1]?.atMs ?? 0;
    for (const step of rehearsal.steps) {
      const timer = window.setTimeout(() => {
        setRehearsalCaption(step.caption);
        if (step.music) void demoAudioEngine.setMusicMode(step.music);
        if (step.cue) triggerCue(step.cue, step.bypassCooldown);
      }, step.atMs);
      rehearsalTimers.current.push(timer);
    }

    const doneTimer = window.setTimeout(() => {
      setActiveRehearsal(null);
      setRehearsalCaption(`Hoàn tất: ${rehearsal.title}`);
    }, lastAt + 1200);
    rehearsalTimers.current.push(doneTimer);
  }

  const visibleCues = group === 'all'
    ? DEMO_CUE_CATALOG
    : DEMO_CUE_CATALOG.filter(item => item.group === group);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        data-no-ui-click="true"
        className="demo-audio-fab"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          demoAudioEngine.unlock();
          demoAudioEngine.preloadAll();
          demoAudioEngine.playCue('PANEL_OPEN');
          setOpen(true);
        }}
      >
        <span className="demo-audio-fab-dot" data-off={mixer.mutedAll || mixer.musicMode === 'off'} aria-hidden="true" />
        <Sliders size={16} aria-hidden="true" />
        <span>
          Phòng thử âm thanh
          <span className="demo-audio-fab-sub"> · {MUSIC_LABELS[mixer.musicMode]}</span>
        </span>
      </button>

      {open ? (
        <div
          className="demo-audio-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              demoAudioEngine.playCue('PANEL_CLOSE');
              setOpen(false);
              requestAnimationFrame(() => fabRef.current?.focus({ preventScroll: true }));
            }
          }}
        >
          <div
            className="demo-audio-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-audio-title"
          >
            <header className="demo-audio-header">
              <div className="demo-audio-header-title">
                <h2 id="demo-audio-title">Phòng Nghe Thử Âm Thanh Toàn Game (Demo)</h2>
                <p>
                  Bàn trộn 4 kênh · Chống rè (Limiter) · Tự hạ nhạc (Ducking) · {V2_COVERAGE_COUNT}/{DEMO_CUE_CATALOG.length} âm Foley thật (v2) &amp; so sánh A/B với v1
                </p>
              </div>
              <div className="demo-audio-header-actions">
                <div className="demo-audio-ab-switch" role="group" aria-label="Chuyển đổi bộ âm thanh A/B">
                  <button
                    type="button"
                    data-no-ui-click="true"
                    className="demo-audio-ab-btn"
                    data-active={mixer.soundPack === 'v2' || undefined}
                    aria-pressed={mixer.soundPack === 'v2'}
                    onClick={() => {
                      demoAudioEngine.unlock();
                      demoAudioEngine.setSoundPack('v2');
                    }}
                  >
                    Bộ Mới: Foley Thật (v2)
                  </button>
                  <button
                    type="button"
                    data-no-ui-click="true"
                    className="demo-audio-ab-btn"
                    data-active={mixer.soundPack === 'v1' || undefined}
                    aria-pressed={mixer.soundPack === 'v1'}
                    onClick={() => {
                      demoAudioEngine.unlock();
                      demoAudioEngine.setSoundPack('v1');
                    }}
                  >
                    Bộ Cũ (v1)
                  </button>
                </div>
                <button
                  type="button"
                  data-no-ui-click="true"
                  className="demo-audio-btn"
                  data-danger={mixer.mutedAll || undefined}
                  onClick={() => demoAudioEngine.setMutedAll(!mixer.mutedAll)}
                >
                  {mixer.mutedAll ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {mixer.mutedAll ? 'Đang tắt toàn bộ' : 'Tắt tiếng nhanh'}
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  data-no-ui-click="true"
                  className="demo-audio-btn"
                  onClick={() => {
                    demoAudioEngine.playCue('PANEL_CLOSE');
                    setOpen(false);
                    requestAnimationFrame(() => fabRef.current?.focus({ preventScroll: true }));
                  }}
                >
                  <X size={15} /> Đóng <kbd>Esc</kbd>
                </button>
              </div>
            </header>

            <div className="demo-audio-body">
              <div className="demo-audio-top-grid">
                <section className="demo-audio-card" aria-label="Nhạc nền chuyển cảnh mượt">
                  <h3 className="demo-audio-card-title">1. Nhạc Nền Động (Crossfade 0.6s)</h3>
                  <div className="demo-audio-music-row" role="group" aria-label="Chọn trạng thái nhạc nền">
                    {MUSIC_MODES.map(mode => (
                      <button
                        key={mode}
                        type="button"
                        data-no-ui-click="true"
                        className="demo-audio-btn"
                        data-active={mixer.musicMode === mode || undefined}
                        aria-pressed={mixer.musicMode === mode}
                        onClick={() => {
                          demoAudioEngine.unlock();
                          void demoAudioEngine.setMusicMode(mode);
                        }}
                      >
                        {MUSIC_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                  <div className="demo-audio-toggles">
                    <label className="demo-audio-toggle">
                      <input
                        type="checkbox"
                        checked={mixer.limiterEnabled}
                        onChange={event => demoAudioEngine.setFeatureToggle('limiterEnabled', event.target.checked)}
                      />
                      Chống rè (Limiter)
                    </label>
                    <label className="demo-audio-toggle">
                      <input
                        type="checkbox"
                        checked={mixer.duckingEnabled}
                        onChange={event => demoAudioEngine.setFeatureToggle('duckingEnabled', event.target.checked)}
                      />
                      Tự hạ nhạc khi cao trào
                    </label>
                    <label className="demo-audio-toggle">
                      <input
                        type="checkbox"
                        checked={mixer.pitchJitterEnabled}
                        onChange={event => demoAudioEngine.setFeatureToggle('pitchJitterEnabled', event.target.checked)}
                      />
                      Biến thiên cao độ (±3.5%)
                    </label>
                  </div>
                </section>

                <section className="demo-audio-card" aria-label="Bàn trộn 4 kênh">
                  <h3 className="demo-audio-card-title">2. Bàn Trộn 4 Kênh (Chỉnh trực tiếp)</h3>
                  <div className="demo-audio-sliders">
                    <label className="demo-audio-slider-row">
                      <span>Nhạc nền</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(mixer.musicVolume * 100)}
                        onChange={event => demoAudioEngine.setBusVolume('music', Number(event.target.value) / 100)}
                      />
                      <span className="demo-audio-slider-val">{Math.round(mixer.musicVolume * 100)}%</span>
                    </label>
                    <label className="demo-audio-slider-row">
                      <span>Chiến đấu &amp; Báo</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(mixer.sfxVolume * 100)}
                        onChange={event => demoAudioEngine.setBusVolume('sfx', Number(event.target.value) / 100)}
                      />
                      <span className="demo-audio-slider-val">{Math.round(mixer.sfxVolume * 100)}%</span>
                    </label>
                    <label className="demo-audio-slider-row">
                      <span>Giao diện &amp; Phòng</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(mixer.uiVolume * 100)}
                        onChange={event => demoAudioEngine.setBusVolume('ui', Number(event.target.value) / 100)}
                      />
                      <span className="demo-audio-slider-val">{Math.round(mixer.uiVolume * 100)}%</span>
                    </label>
                  </div>
                </section>
              </div>

              <section className="demo-audio-card" aria-label="Kịch bản diễn tập liên hoàn">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h3 className="demo-audio-card-title" style={{ margin: 0 }}>
                    3. Nghe Thử Kịch Bản Liên Hoàn (1 bấm nghe cả chuỗi)
                  </h3>
                  {activeRehearsal ? (
                    <button
                      type="button"
                      data-no-ui-click="true"
                      className="demo-audio-btn"
                      data-danger="true"
                      onClick={stopRehearsal}
                    >
                      <Square size={12} /> Dừng diễn tập
                    </button>
                  ) : null}
                </div>
                <div className="demo-audio-scenarios">
                  {REHEARSALS.map(item => {
                    const running = activeRehearsal === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-no-ui-click="true"
                        className="demo-audio-scenario-btn"
                        data-running={running || undefined}
                        onClick={() => (running ? stopRehearsal() : runRehearsal(item))}
                      >
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {running ? <Square size={12} /> : <Play size={12} />} {item.title}
                        </strong>
                        <small>{item.subtitle}</small>
                      </button>
                    );
                  })}
                </div>
                {rehearsalCaption ? (
                  <p role="status" style={{ margin: '8px 0 0', fontSize: 12, color: '#f0cf88' }}>
                    ▶ {rehearsalCaption}
                  </p>
                ) : null}
              </section>

              <section className="demo-audio-card" aria-label="Bảng nghe thử từng âm thanh">
                <h3 className="demo-audio-card-title">4. Bảng Nghe Thử Từng Âm Thanh (Bấm để nghe thuần âm đó)</h3>
                <div className="demo-audio-tabs" role="tablist" aria-label="Lọc nhóm âm thanh">
                  {GROUP_TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      data-no-ui-click="true"
                      aria-selected={group === tab.id}
                      className="demo-audio-btn"
                      data-active={group === tab.id || undefined}
                      onClick={() => setGroup(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="demo-audio-cue-grid">
                  {visibleCues.map(cue => (
                    <button
                      key={cue.id}
                      type="button"
                      data-no-ui-click="true"
                      className="demo-audio-cue-btn"
                      data-flash={flashingCue === cue.id || undefined}
                      onClick={() => triggerCue(cue.id, true)}
                    >
                      <span className="demo-audio-cue-top">
                        <strong>{cue.label}</strong>
                        <span
                          className="demo-audio-badge"
                          data-kind={mixer.soundPack === 'v2' ? (cue.isNew ? 'v2-new' : 'v2') : (cue.isNew ? 'new' : 'existing')}
                        >
                          {mixer.soundPack === 'v2'
                            ? (cue.isNew ? 'FOLEY MỚI' : 'FOLEY v2')
                            : (cue.isNew ? 'MỚI v1' : 'GỐC v1')}
                        </span>
                      </span>
                      <small>
                        {cue.detail}
                        {cue.duckMusicMs ? ' · Hạ nhạc' : ''}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <footer className="demo-audio-footer" role="status" aria-live="polite">
              <span className="demo-audio-footer-event">{mixer.lastEventText}</span>
              <div className="demo-audio-meter-pills">
                <span className="demo-audio-pill" data-pack={mixer.soundPack}>
                  {mixer.soundPack === 'v2' ? `Bộ Mới · Foley Thật v2 (${V2_COVERAGE_COUNT})` : 'Bộ Cũ · v1'}
                </span>
                <span className="demo-audio-pill" data-hot={mixer.isDucking || undefined}>
                  {mixer.isDucking ? 'Đang hạ nhạc (-9 dB)' : 'Nhạc bình thường'}
                </span>
                <span className="demo-audio-pill" data-hot={mixer.limiterReductionDb > 0.5 || undefined}>
                  Chống rè: {mixer.limiterEnabled ? `-${mixer.limiterReductionDb.toFixed(1)} dB` : 'Đang tắt'}
                </span>
                <span className="demo-audio-pill">
                  Luồng phát: {mixer.activeVoices}
                </span>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
