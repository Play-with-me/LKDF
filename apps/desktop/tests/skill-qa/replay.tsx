import { TIMER_PRESETS, type PlayerViewState, type RoomSeat } from '@lkdf/shared';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MatchArenaLayout } from '../../src/features/match/MatchArenaLayout.js';
import { MatchActionSidebar } from '../../src/features/match/MatchActionSidebar.js';
import { getMatchActionCues } from '../../src/features/match/matchSounds.js';
import { EMPTY_MATCH_SELECTION, formatMatchErrorVi } from '../../src/features/match/matchTypes.js';
import { writeDevicePreference } from '../../src/lib/devicePreferences.js';
import '../../src/index.css';
import cases from './cases.json';

interface Trace {
  test: string;
  before: PlayerViewState[];
  after: PlayerViewState[];
  input?: { seatIndex?: number };
  error?: string;
}

const root = createRoot(document.getElementById('root')!);
const noop = () => undefined;
const paint = () => new Promise<void>(resolve => window.setTimeout(resolve, 20));
let generation = 0;

function render(view: PlayerViewState, error: string | null = null) {
  const roomSeats: RoomSeat[] = view.players.map(player => ({
    seatIndex: player.seatIndex,
    userId: player.userId,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    connectionStatus: 'ONLINE',
    isBotTakeover: false,
  }));
  flushSync(() => root.render(
    <main className="flex h-dvh min-h-0 w-screen min-w-0 flex-col overflow-hidden bg-[#090807] text-[#EFE6D5]">
      <MatchArenaLayout
        key={generation}
        playerView={view}
        roomSeats={roomSeats}
        timerConfig={TIMER_PRESETS.STANDARD}
        phaseDeadlineAt={null}
        pausedRemainingMs={null}
        isTimerPaused={false}
        selection={EMPTY_MATCH_SELECTION}
        connectionLost={false}
        actionErrorVi={error}
        onReconnect={noop}
        onToggleCard={noop}
        onToggleTarget={noop}
        onToggleSkillMode={noop}
        onToggleConvertMode={noop}
        onSendAction={noop}
        onSelectHero={noop}
        renderActionSidebar={() => (
          <div data-qa-controls className="contents">
            <MatchActionSidebar view={view} selection={EMPTY_MATCH_SELECTION} layout="bar"
              onClearSelection={noop} onSendAction={noop} onEndPlayPhase={noop} />
          </div>
        )}
      />
    </main>,
  ));
}

const text = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector), item => item.innerText.trim())
    .filter(Boolean);

function read() {
  return {
    spotlight: text('[data-action-spotlight]')[0] ?? null,
    stamps: text('.lkdf-skill-stamp'),
    controls: text('[data-qa-controls] button'),
    transfers: document.querySelectorAll('.lkdf-motion-transfer').length,
    alerts: text('[data-targeted-alert], [role="alert"]'),
    pageOverflow: document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
  };
}

async function replay(trace: Trace, viewer: number, reduced: boolean, previewMs = 0) {
  const before = trace.before[viewer]!;
  const after = trace.after[viewer]!;
  generation++;
  writeDevicePreference('reduceMotion', reduced);
  render(before);
  await paint();
  const beforeUi = read();
  if (previewMs > 0) await new Promise(resolve => window.setTimeout(resolve, previewMs));

  let maxTransfers = 0;
  const observer = new MutationObserver(() => {
    maxTransfers = Math.max(maxTransfers, document.querySelectorAll('.lkdf-motion-transfer').length);
  });
  observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
  try {
    const error = trace.error && trace.input?.seatIndex === viewer
      ? formatMatchErrorVi(new Error(trace.error), trace.error)
      : null;
    render(after, error);
    await paint();
    const afterUi = read();
    return {
      beforeUi,
      afterUi: { ...afterUi, transfers: Math.max(afterUi.transfers, maxTransfers) },
      viewport: [innerWidth, innerHeight],
      cues: [...getMatchActionCues(before, after)],
      newLogs: after.actionLog.slice(before.actionLog.length),
      promptBefore: before.activeInterrupt?.kind ?? null,
      promptAfter: after.activeInterrupt?.kind ?? null,
      hiddenHandExposed: [before, after].some(view => view.players.some(player =>
        player.seatIndex !== viewer && player.handCards != null)),
      leakedPrivateCards: [before, after].some(view => {
        const active = view.activeInterrupt;
        return active && active.targetSeat !== viewer &&
          Boolean(active.guanXingCards?.length || active.yiJiCards?.length);
      }),
    };
  } finally {
    observer.disconnect();
  }
}

Object.assign(window, { skillQaReplay: replay });

if (new URLSearchParams(location.search).has('manual')) {
  const controls = document.createElement('form');
  controls.className = 'fixed left-2 top-2 z-50 flex max-w-[calc(100%-1rem)] flex-wrap gap-2 rounded border border-amber-600 bg-stone-900 p-2 text-sm text-stone-100';
  const select = document.createElement('select');
  select.ariaLabel = 'Kỹ năng';
  cases.forEach((entry, index) => select.add(new Option(entry.skill, String(index))));
  const perspective = document.createElement('select');
  perspective.ariaLabel = 'Góc nhìn';
  ['Người dùng', 'Người bị tác động', 'Người quan sát'].forEach((label, index) =>
    perspective.add(new Option(label, String(index))));
  const reduced = document.createElement('input');
  reduced.type = 'checkbox';
  const label = document.createElement('label');
  label.append(reduced, ' Giảm chuyển động');
  const button = document.createElement('button');
  button.textContent = 'Phát tình huống';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  controls.append(select, perspective, label, button, status);
  document.body.append(controls);
  controls.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    try {
      const response = await fetch('/release/skill-qa/traces.json');
      if (!response.ok) throw new Error('Hãy chạy lệnh trích xuất tình huống trước.');
      const traces = await response.json() as Trace[];
      const entry = cases[Number(select.value)]!;
      const trace = traces.filter(item => item.test.split(' > ').at(-1) === entry.test)[entry.step];
      if (!trace) throw new Error('Không tìm thấy tình huống.');
      const observer = entry.spectator ??
        trace.before.findIndex((_view, seat) => seat !== entry.actor && seat !== entry.affected);
      const viewer = [entry.actor, entry.affected, observer][Number(perspective.value)]!;
      await replay(trace, viewer, reduced.checked, 750);
      status.textContent = entry.expected;
    } catch (error) {
      status.textContent = String(error);
    } finally {
      button.disabled = false;
    }
  });
}
