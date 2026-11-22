import { prefersReducedMotion } from '../lib/devicePreferences.js';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { HERO_CATALOG, TIMER_PRESETS, type TimerPreset } from '@lkdf/shared';
import { GameIcon } from '../components/icons/index.js';
import { RedCliffsScene } from '../features/lobby/red-cliffs/RedCliffsScene.js';
import { getHeroPortraitUrl } from '../lib/assetCatalog.js';
import { demoAudioEngine } from './demoAudioEngine.js';
import '../features/lobby/lobby-online.css';

const hostName = 'Trần Quốc Hưng';
const demoRoomCode = 'K9M2P4';
const guestKey = (code: string) => `lkdf:demo-online:guest:${code}`;

const practiceKey = 'lkdf:demo-online:practice';
const startedKey = 'lkdf:demo-online:started';
const roomActionLock = 'lkdf:demo-online:room-action';
const readyKey = (code: string, member: 'guest' | 'practice') =>
  `lkdf:demo-online:ready:${code}:${member}`;
const offlineKey = 'lkdf:demo-online:offline';
const sampleHeroes = HERO_CATALOG.filter(hero => ['liu_bei', 'cao_cao', 'sun_quan'].includes(hero.id));
const practicePlayers = [
  'Lê Minh Anh', 'Phạm Đức Thịnh', 'Đặng Hoàng Ngọc',
  'Vũ Gia Bảo', 'Bùi Ngọc Linh', 'Trần Nguyễn Hoàng Minh Khôi',
];

function readPractice() {
  const value = localStorage.getItem(practiceKey);
  return value === '2' ? 2 : value === '6' ? 6 : 0;
}

function readReadiness(code: string) {
  return {
    guest: localStorage.getItem(readyKey(code, 'guest')) === 'true',
    practice: localStorage.getItem(readyKey(code, 'practice')) === 'true',
  };
}

function DemoWaitingTable({ control, code, guest, isHost, onLeave, headingRef }: {
  readonly control: string;
  readonly code: string;
  readonly guest: string | null;
  readonly isHost: boolean;
  readonly onLeave?: () => void;
  readonly headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const [practice, setPractice] = useState(() => code === demoRoomCode ? readPractice() : 0);
  const [copyStatus, setCopyStatus] = useState('');
  const [seatNotice, setSeatNotice] = useState('');
  useEffect(() => {
    if (!seatNotice) return;
    const timer = window.setTimeout(() => setSeatNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [seatNotice]);

  const [offline, setOffline] = useState(() => code === demoRoomCode && localStorage.getItem(offlineKey) === 'true');
  const [readiness, setReadiness] = useState(() => readReadiness(code));
  const previousReady = useRef<boolean[]>([]);
  const previousOffline = useRef(offline);
  const [heroId, setHeroId] = useState('');
  const selectionHeading = useRef<HTMLHeadingElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const seatList = useRef<HTMLOListElement>(null);
  const previousSeats = useRef<(string | null | undefined)[]>([]);
  const [started, setStarted] = useState(() => code === demoRoomCode && localStorage.getItem(startedKey) === 'true');
  useEffect(() => {
    const syncPractice = (event: StorageEvent) => {
      if (event.key?.startsWith(`lkdf:demo-online:ready:${code}:`)) setReadiness(readReadiness(code));
      if (code !== demoRoomCode) return;
      if (event.key === practiceKey) setPractice(readPractice());
      if (event.key === startedKey) {
        setHeroId('');
        setStarted(event.newValue === 'true');
      }
      if (event.key === offlineKey) setOffline(event.newValue === 'true');
    };
    window.addEventListener('storage', syncPractice);
    return () => window.removeEventListener('storage', syncPractice);
  }, [code]);

  const seats = [
    hostName, ...practicePlayers.slice(0, 3).map((name, index) => index < practice ? name : null),
    guest, ...practicePlayers.slice(3).map((name, index) => index + 3 < practice ? name : null),
  ];
  useEffect(() => {
    const previous = previousSeats.current;
    previousSeats.current = seats;
    if (!previous.length) return;
    if (guest !== previous[4]) {
      setSeatNotice(guest ? `${guest} đã vào ghế 05.` : `${previous[4]} đã rời ghế 05.`);
      demoAudioEngine.playCue(guest ? 'ROOM_JOIN' : 'ROOM_LEAVE');
    }
    if (prefersReducedMotion()) return;
    seats.forEach((name, index) => {
      if (name === previous[index]) return;
      seatList.current?.children[index]?.animate(
        name ? [
          { boxShadow: 'inset 0 0 0 1px #e6be6c, inset 0 0 20px #d99b2677' },
          { boxShadow: 'none' },
        ] : [
          { backgroundColor: '#594133', opacity: 0.55 },
          { opacity: 1 },
        ],
        { duration: 210, easing: 'ease-out' },
      );
    });
  });

  const readySeats = seats.map((name, index) => Boolean(name &&
    (index === 0 ? false : index === 4 ? readiness.guest && !offline : readiness.practice),
  ));
  useEffect(() => {
    const previous = previousReady.current;
    previousReady.current = readySeats;
    const wasOffline = previousOffline.current;
    previousOffline.current = offline;
    if (previous.length && guest) {
      if (offline !== wasOffline) {
        setSeatNotice(offline ? `${guest} mất kết nối.` : `${guest} vừa kết nối lại.`);
        demoAudioEngine.playCue(offline ? 'UI_ERROR' : 'ROOM_JOIN');
      } else if (!offline && previous[4] && !readySeats[4]) {
        setSeatNotice(`${guest} vừa hủy sẵn sàng.`);
        demoAudioEngine.playCue('PANEL_CLOSE');
      } else if (!offline && !previous[4] && readySeats[4]) {
        setSeatNotice(`${guest} vừa sẵn sàng.`);
        demoAudioEngine.playCue('READY_ON');
      }
    }
    if (!previous.length || prefersReducedMotion()) return;
    readySeats.forEach((ready, index) => {
      if (!ready || previous[index]) return;
      seatList.current?.children[index]?.animate([
        { boxShadow: 'inset 0 0 0 2px #82f0c4, inset 0 0 28px #42c79baa' },
        { boxShadow: '' },
      ], { duration: 220, easing: 'ease-out' });
    });
  });

  function setMemberReady(member: keyof typeof readiness, ready: boolean) {
    localStorage.setItem(readyKey(code, member), String(ready));
    setReadiness(readReadiness(code));
  }

  function toggleGuestReady() {
    void navigator.locks.request(roomActionLock, () => {
      if (code === demoRoomCode && (localStorage.getItem(startedKey) === 'true' ||
        localStorage.getItem(offlineKey) === 'true')) return;
      if (!localStorage.getItem(guestKey(code))) return;
      setMemberReady('guest', !readReadiness(code).guest);
    });
  }

  function startMatch() {
    void navigator.locks.request(roomActionLock, () => {
      if (localStorage.getItem(startedKey) === 'true') return;
      const current = readReadiness(code);
      const guestPresent = Boolean(localStorage.getItem(guestKey(code)));
      const practiceNow = readPractice();
      if (1 + Number(guestPresent) + practiceNow < 4 ||
        (guestPresent && (!current.guest || localStorage.getItem(offlineKey) === 'true')) ||
        (practiceNow > 0 && !current.practice)) return;

      // Both tabs treat this write as the commit point; animation only presents it.
      localStorage.setItem(startedKey, 'true');
      demoAudioEngine.playCue('COUNTDOWN_START');
      setHeroId('');
      setStarted(true);
    });
  }

  const count = 1 + Number(Boolean(guest)) + practice;
  const missing = Math.max(0, 4 - count);
  const readyCount = readySeats.filter(Boolean).length;
  const guestCount = count - 1;
  const waitingCount = guestCount - readyCount;
  const allReady = waitingCount === 0;
  const canStart = !missing && allReady;
  const selfReady = readySeats[4];
  const startRequirement = missing ? `Cần thêm ${missing} người để bắt đầu` :
    waitingCount ? `Chờ ${waitingCount} khách sẵn sàng` : '';
  const roomStatus = started ? 'Đang chuyển sang Chọn tướng…' :
    startRequirement || (isHost ? 'Có thể bắt đầu' : 'Chờ chủ phòng bắt đầu');
  const [showSelection, setShowSelection] = useState(started);
  useEffect(() => {
    if (!started) {
      setShowSelection(false);
      return;
    }
    if (prefersReducedMotion()) {
      setShowSelection(true);
      return;
    }
    const transition = window.setTimeout(() => setShowSelection(true), 110);
    return () => window.clearTimeout(transition);
  }, [started]);

  useEffect(() => {
    if (started && showSelection) selectionHeading.current?.focus({ preventScroll: true });
  }, [started, showSelection]);

  useEffect(() => {
    if (isHost && !guest && offline) {
      setOffline(false);
      localStorage.removeItem(offlineKey);
    }
  }, [isHost, guest, offline]);

  if (started && showSelection) {
    return (
      <section className="lkdf-waiting-table lkdf-online-room lkdf-online-panel lkdf-demo-pick" aria-label="Chọn tướng mẫu">
        <div className="lkdf-online-fog" aria-hidden="true" />
        <header className="lkdf-waiting-header">
          <div>
            <p className="lkdf-online-kicker">Diễn tập · {isHost ? 'Chủ phòng' : 'Khách'}</p>
            <h2 ref={selectionHeading} tabIndex={-1} className="font-serif-title">Chọn tướng</h2>
          </div>
          <div className="lkdf-waiting-invite">
          <strong className="font-mono-num">{code}</strong>
          {isHost ? <button type="button" className={control} onClick={() => {
            setHeroId('');
            setStarted(false);
            localStorage.removeItem(startedKey);
            for (const member of ['guest', 'practice'] as const) {
              localStorage.removeItem(readyKey(code, member));
            }
            setReadiness(readReadiness(code));
            requestAnimationFrame(() => startButton.current?.focus({ preventScroll: true }));
          }}>Về phòng chờ</button> : (
            <button type="button" className={control} onClick={onLeave}>Rời phòng</button>
          )}
          </div>
        </header>
        <div className="lkdf-demo-pick-options">
          {sampleHeroes.map(hero => {
            const portrait = getHeroPortraitUrl(hero.id);
            return (
              <button key={hero.id} type="button" data-no-ui-click="true" className={control} aria-pressed={heroId === hero.id}
                onClick={() => {
                  setHeroId(hero.id);
                  demoAudioEngine.playCue('HERO_LOCK', { bypassCooldown: true });
                }}>
                {portrait ? <img src={portrait} alt="" /> : null}
                <strong>{hero.nameVi}</strong>
              </button>
            );
          })}
        </div>
        <p className="lkdf-demo-pick-status" role="status">
          {heroId ? `Bạn đã chọn ${sampleHeroes.find(hero => hero.id === heroId)?.nameVi}.` : 'Chọn một tướng để thử giao diện.'}
        </p>
      </section>
    );
  }

  return (
    <section className="lkdf-waiting-table lkdf-online-room lkdf-online-panel" aria-label="Phòng chờ mẫu" data-starting={started}>
      {!isHost ? <div className="lkdf-online-fog" aria-hidden="true" /> : null}
      <header className="lkdf-waiting-header">
        <div>
          <p className="lkdf-online-kicker">Diễn tập · {isHost ? 'Chủ phòng' : 'Khách'}</p>
          <h2 ref={headingRef} tabIndex={-1} className="font-serif-title">Phòng chờ</h2>
        </div>
        <div className="lkdf-waiting-invite">
          <strong className="font-mono-num">{code}</strong>
          <button type="button" className={control} onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopyStatus('Đã sao chép mã phòng.');
            } catch {
              setCopyStatus(`Sao chép mã ${code} thủ công.`);
            }
          }}>Sao chép mã</button>
          {onLeave ? <button type="button" className={control} onClick={onLeave}>Rời phòng</button> : null}
        </div>
      </header>
      {copyStatus ? <p className="lkdf-online-hint" role="status">{copyStatus}</p> : null}
      <div className="lkdf-waiting-board">
        <div className="lkdf-waiting-surface">
          <div>
            <strong className="font-serif-title">Bàn Xích Bích</strong>
            <small>Nhịp Chuẩn · {TIMER_PRESETS.STANDARD.mainTurnSeconds} giây/lượt</small>
          </div>
        </div>
        <ol ref={seatList} className="lkdf-waiting-seats" aria-label="8 ghế phòng chờ">
          {seats.map((name, index) => {
            const self = isHost ? index === 0 : index === 4;
            return (
              <li key={index} className="lkdf-waiting-seat" data-ready={readySeats[index]} data-offline={Boolean(index === 4 && guest && offline)} data-occupied={Boolean(name)} data-self={self && Boolean(name)} data-host={index === 0}>
                <span className="lkdf-waiting-seat-number" aria-label={`Ghế ${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
                {name ? (
                  <div key={name} className="lkdf-waiting-player">
                    <span className="lkdf-waiting-avatar" aria-hidden="true">{name.split(/\s+/).slice(-2).map(part => part[0]).join('')}</span>
                    <div>
                      <div className="lkdf-waiting-player-name">
                        {self ? <span className="lkdf-waiting-self-label">Bạn</span> : null}
                        <strong title={name}>{name}</strong>
                      </div>
                      <small>{index === 0 ? 'Chủ phòng' : index === 4 ? 'Khách' : 'Người chơi mẫu'}</small>
                      {index !== 0 ? <span className="lkdf-seat-readiness">
                        {index === 4 && offline ? <><GameIcon name="ui:wifi-off" size={12} /> Mất kết nối</> : readySeats[index] ? <><GameIcon name="ui:check" size={12} /> Sẵn sàng</> : <><GameIcon name="ui:clock" size={12} /> Chưa sẵn sàng</>}
                      </span> : null}
                    </div>
                  </div>
                ) : (
                  <span className="lkdf-waiting-empty">
                    <span className="lkdf-waiting-empty-avatar" aria-hidden="true"><GameIcon name="ui:user" size={15} /></span>
                    Ghế trống
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <footer className="lkdf-waiting-footer">
        <p className="lkdf-waiting-count">
          <strong>{count}/8 người</strong>
          {guestCount > 0 ? <> · {readyCount}/{guestCount} khách đã sẵn sàng</> : null}
        </p>
        <div className="lkdf-waiting-actions">
          {!isHost ? <button type="button" className={`${control} lkdf-waiting-ready`} aria-pressed={selfReady}
            disabled={started || offline} onClick={toggleGuestReady}>
            {selfReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
          </button> : null}
        {isHost ? (<>
            <details className="lkdf-waiting-practice">
              <summary>Diễn tập</summary>
              <div className="lkdf-waiting-practice-options">
            {guest ? <button type="button" className={control} aria-pressed={offline} disabled={started} onClick={() => {
              if (localStorage.getItem(startedKey) === 'true') return;
              if (!offline) setMemberReady('guest', false);
              setOffline(!offline);
              localStorage.setItem(offlineKey, String(!offline));
            }}>{offline ? 'Kết nối lại khách mẫu' : 'Thử mất kết nối'}</button> : null}
            <label>Ghế giả lập <select className={control} value={practice} disabled={started} onChange={event => {
              if (localStorage.getItem(startedKey) === 'true') return;
              const next = Number(event.target.value);
              setPractice(next);
              setMemberReady('practice', false);
              localStorage.setItem(practiceKey, String(next));
            }}>
              <option value="0">0</option><option value="2">2</option><option value="6">6</option>
            </select></label>
            {practice ? <button type="button" className={control}
              disabled={started} onClick={() => {
                if (localStorage.getItem(startedKey) !== 'true') setMemberReady('practice', !readiness.practice);
              }}>
              {readiness.practice ? 'Hủy sẵn sàng ghế mẫu' : 'Cho ghế mẫu sẵn sàng'}
            </button> : null}
              </div>
            </details>
            <div className="lkdf-waiting-start">
              <button ref={startButton} type="button" className="lkdf-online-join" disabled={!canStart || started}
                aria-describedby="lkdf-waiting-start-requirement"
                onClick={startMatch}>Bắt đầu ván đấu</button>
              <small id="lkdf-waiting-start-requirement" role="status">{roomStatus}</small>
            </div>
        </>) : (
          <p className="lkdf-waiting-guest-status" role="status">
            {started ? 'Đang chuyển sang Chọn tướng…' : offline ? 'Đang mất kết nối' :
              selfReady ? roomStatus : 'Bấm Sẵn sàng khi bạn đã chuẩn bị xong'}
          </p>
        )}
        </div>
        <p className="lkdf-waiting-seat-notice" role="status">{seatNotice}</p>
      </footer>
    </section>
  );
}

function HostRoom({ control }: { readonly control: string }) {
  const [guest, setGuest] = useState(() => localStorage.getItem(guestKey(demoRoomCode)));
  useEffect(() => {
    const syncGuest = (event: StorageEvent) => {
      if (event.key === guestKey(demoRoomCode)) setGuest(event.newValue);
    };
    window.addEventListener('storage', syncGuest);
    return () => window.removeEventListener('storage', syncGuest);
  }, []);
  return <DemoWaitingTable control={control} code={demoRoomCode} guest={guest} isHost />;
}

export function DemoHostLobby() {
  return <div className="lkdf-lobby-camp relative isolate flex min-h-0 flex-1 overflow-y-auto">
    <div className="lkdf-lobby-camp-art"><RedCliffsScene /></div>
    <div className="lkdf-lobby-camp-content">
      <div className="lkdf-lobby-camp-panel">
        <HostRoom control="min-h-10 rounded border border-[#806345] bg-[#211913] px-3 text-sm text-[#F5EBD6] hover:border-[#C89B4B] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]" />
      </div>
    </div>
  </div>;
}

const scenarios = [
  { id: 'success', label: 'Vào thành công' },
  { id: 'network', label: 'Mất kết nối lần đầu' },
  { id: 'full', label: 'Phòng đầy' },
  { id: 'closed', label: 'Phòng đã đóng' },
] as const;
type Scenario = (typeof scenarios)[number]['id'];

const presets = [
  { id: 'FAST', label: 'Nhanh' },
  { id: 'STANDARD', label: 'Chuẩn' },
  { id: 'RELAXED', label: 'Thong thả' },
] as const;

export function DemoOnline({ control, playerName }: {
  readonly control: string;
  readonly playerName: string;
}) {
  const [code, setCode] = useState('');
  const [scenario, setScenario] = useState<Scenario>('success');
  const [retried, setRetried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [preset, setPreset] = useState<TimerPreset>('STANDARD');
  const input = useRef<HTMLInputElement>(null);
  const roomHeading = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (room) roomHeading.current?.focus({ preventScroll: true });
    else input.current?.focus({ preventScroll: true });
  }, [room]);

  useEffect(() => {
    if (!room) return;
    if (demoAudioEngine.getState().musicMode === 'lobby') {
      void demoAudioEngine.setMusicMode('waiting');
    }
    demoAudioEngine.playCue('ROOM_JOIN');
    const key = guestKey(room);
    localStorage.setItem(key, playerName);
    const leave = () => {
      if (localStorage.getItem(key) === playerName) {
        localStorage.removeItem(readyKey(room, 'guest'));
        localStorage.removeItem(key);
      }
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
      if (demoAudioEngine.getState().musicMode === 'waiting') {
        void demoAudioEngine.setMusicMode('lobby');
      }
    };
  }, [room, playerName]);

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timer.current !== undefined) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('Nhập đủ 6 chữ cái hoặc chữ số trong mã bạn nhận được.');
      demoAudioEngine.playCue('UI_ERROR');
      input.current?.focus();
      return;
    }

    setError('');
    setPending(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setPending(false);
      if (scenario === 'network' && !retried) {
        setRetried(true);
        setError('Mất kết nối. Hãy thử lại với mã hiện tại.');
        demoAudioEngine.playCue('UI_ERROR');
      } else if (scenario === 'full') {
        setError('Phòng đã đầy. Hãy nhờ bạn gửi mã phòng khác.');
        demoAudioEngine.playCue('UI_ERROR');
      } else if (scenario === 'closed') {
        setError('Phòng đã đóng. Hãy xin mã phòng mới.');
        demoAudioEngine.playCue('UI_ERROR');
      } else {
        setRoom(code);
      }
    }, 540);
  }

  if (room) {
    return (
      <DemoWaitingTable control={control} code={room} guest={playerName} isHost={false} headingRef={roomHeading}
        onLeave={() => { demoAudioEngine.playCue('ROOM_LEAVE'); setRoom(''); setRetried(false); }} />
    );
  }

  return (
    <div className="lkdf-online-entry">
      <h2 className="font-serif-title">Chơi online</h2>
      <form className="lkdf-online-panel" onSubmit={joinRoom} data-pending={pending}>
        <h3 className="font-serif-title">Vào phòng bằng mã</h3>
        <p id={`${id}-hint`} className="lkdf-online-hint">Dán mã 6 ký tự bạn nhận được.</p>
        <div className="lkdf-online-code-row">
          <input ref={input} className={`${control} lkdf-online-code font-mono-num`}
            aria-label="Mã phòng" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
            aria-invalid={Boolean(error && !/^[A-Z0-9]{6}$/.test(code))}
            autoComplete="off" spellCheck={false} placeholder="K9M2P4" value={code}
            readOnly={pending} onChange={event => {
              setCode(event.target.value.replace(/\s+/g, '').toUpperCase());
              setError('');
            }} />
          <button className="lkdf-online-join" type="submit" disabled={pending}>
            {pending ? 'Đang vào phòng…' : error && scenario === 'network' && retried ? 'Thử lại' : 'Vào phòng'}
          </button>
        </div>
        {pending ? <p className="sr-only" role="status">Đang vào phòng</p> : null}
        {error ? <p id={`${id}-error`} role="alert" className="lkdf-online-error">{error}</p> : null}
      </form>

      <details className="lkdf-online-create">
        <summary>Tạo phòng</summary>
        <p className="lkdf-online-hint">Chọn nhịp chơi cho bàn 4–8 người.</p>
        <div className="lkdf-online-presets" role="group" aria-label="Nhịp chơi">
          {presets.map(item => (
            <button key={item.id} type="button" className={control} aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}>
              {item.label}<small>{TIMER_PRESETS[item.id].mainTurnSeconds} giây/lượt</small>
            </button>
          ))}
        </div>
        <p className="lkdf-online-hint">Tạo phòng thật từ bản chính sau khi đăng nhập.</p>
      </details>

      <label className="lkdf-online-scenario">
        <span>Diễn tập vào phòng</span>
        <select className={control} value={scenario} disabled={pending} onChange={event => {
          const next = scenarios.find(item => item.id === event.target.value);
          if (!next) return;
          setScenario(next.id);
          setRetried(false);
          setError('');
        }}>
          {scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
    </div>
  );
}
