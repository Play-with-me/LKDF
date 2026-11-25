import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { TIMER_PRESETS } from '@lkdf/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MartialBackdropScene } from './MartialBackdropScene.js';
import './lobby-camp.css';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengPillSelect } from '../../components/ui/GuofengPillSelect.js';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import { playMatchCue } from '../../lib/soundFx.js';
import type {
  RoomViewerPayload,
  TimerPreset,
  UserProfile,
} from '../../lib/types.js';
import { createRoomWsClient } from '../../lib/wsClient.js';
import type { WsConnectionStatus } from '../../lib/wsClient.js';

export interface WaitingRoomScreenProps {
  readonly api: LkdfApiClient;
  readonly serverUrl: string;
  readonly sessionToken: string;
  readonly currentUser: UserProfile;
  readonly initialRoom: RoomViewerPayload;
  readonly onMatchStarted: (roomPayload: RoomViewerPayload) => void;
  readonly onLeftRoom: () => void;
  readonly onSessionInvalid: (messageVi: string) => void;
}

const PRESET_OPTIONS: readonly {
  readonly id: TimerPreset;
  readonly title: string;
  readonly detail: string;
}[] = [
  {
    id: 'FAST',
    title: 'Nhanh',
    detail: `Chọn tướng ${TIMER_PRESETS.FAST.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.FAST.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.FAST.reactionSeconds}s`,
  },
  {
    id: 'STANDARD',
    title: 'Chuẩn',
    detail: `Chọn tướng ${TIMER_PRESETS.STANDARD.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.STANDARD.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.STANDARD.reactionSeconds}s`,
  },
  {
    id: 'RELAXED',
    title: 'Thong thả',
    detail: `Chọn tướng ${TIMER_PRESETS.RELAXED.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.RELAXED.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.RELAXED.reactionSeconds}s`,
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return 'TQ';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function WaitingRoomScreen({
  api,
  serverUrl,
  sessionToken,
  currentUser,
  initialRoom,
  onMatchStarted,
  onLeftRoom,
  onSessionInvalid,
}: WaitingRoomScreenProps) {
  const [roomPayload, setRoomPayload] = useState<RoomViewerPayload>(initialRoom);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CONNECTING');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingPreset, setIsUpdatingPreset] = useState<boolean>(false);
  const [isStartingMatch, setIsStartingMatch] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [isUpdatingReady, setIsUpdatingReady] = useState(false);
  const [seatNotice, setSeatNotice] = useState('');
  const seatList = useRef<HTMLOListElement>(null);
  const previousSeats = useRef(initialRoom.roomState.seats);
  const startedCuePlayedRef = useRef(false);
  const roomCode = roomPayload.roomState.roomCode;
  const soundEnabled = currentUser.preferences.soundEnabled;

  function playMatchStartCue() {
    if (startedCuePlayedRef.current) return;
    startedCuePlayedRef.current = true;
    playMatchCue('COUNTDOWN_START', soundEnabled);
  }

  useEffect(() => {
    setRoomPayload(initialRoom);
  }, [initialRoom]);

  useEffect(() => {
    const client = createRoomWsClient({
      serverUrl,
      sessionToken,
      roomCode,
      onStatusChange: (nextStatus) => {
        setWsStatus(nextStatus);
      },
      onRoomState: (payload) => {
        setRoomPayload(payload);
        setActionError(null);
        if (payload.roomState.status === 'IN_GAME') {
          playMatchStartCue();
          onMatchStarted(payload);
        }
      },
      onAuthError: (err) => {
        onSessionInvalid(err.messageVi);
      },
      onSessionInvalidated: (info) => {
        onSessionInvalid(info.messageVi);
      },
      onActionError: (err) => {
        setActionError(err.messageVi);
      },
    });

    return () => {
      client.close();
    };
  }, [onMatchStarted, onSessionInvalid, roomCode, serverUrl, sessionToken]);

  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    setActionError(null);
    try {
      const latest = await api.getRoom(sessionToken, roomCode);
      setRoomPayload(latest);
      if (latest.roomState.status === 'IN_GAME') {
        onMatchStarted(latest);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể đồng bộ trạng thái phòng.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [api, onMatchStarted, onSessionInvalid, roomCode, sessionToken]);

  async function handleCopyRoomCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      window.setTimeout(() => {
        setCopiedCode(false);
      }, 2000);
    } catch {
      setActionError('Không thể sao chép tự động. Vui lòng bôi đen mã phòng để chép.');
    }
  }

  async function handleSelectTimerPreset(preset: TimerPreset): Promise<void> {
    if (roomPayload.roomState.actingHostUserId !== currentUser.userId) {
      return;
    }
    setActionError(null);
    setIsUpdatingPreset(true);
    try {
      const updated = await api.updateTimerPreset(sessionToken, roomCode, preset);
      setRoomPayload(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể đổi tốc độ đồng hồ.',
      );
    } finally {
      setIsUpdatingPreset(false);
    }
  }

  async function handleStartMatch(): Promise<void> {
    setActionError(null);
    setIsStartingMatch(true);
    try {
      const updated = await api.startMatch(sessionToken, roomCode);
      setRoomPayload(updated);
      if (updated.roomState.status === 'IN_GAME') {
        playMatchStartCue();
        onMatchStarted(updated);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể bắt đầu ván đấu.',
      );
    } finally {
      setIsStartingMatch(false);
    }
  }

  async function handleLeaveRoom(): Promise<void> {
    setActionError(null);
    setIsLeavingRoom(true);
    try {
      await api.leaveRoom(sessionToken, roomCode);
      onLeftRoom();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setActionError(
        err instanceof Error ? err.message : 'Không thể rời phòng chờ.',
      );
    } finally {
      setIsLeavingRoom(false);
    }
  }

  async function handleReady(isReady: boolean) {
    setIsUpdatingReady(true);
    setActionError(null);
    try {
      const updated = await api.setRoomReady(sessionToken, roomCode, isReady);
      setRoomPayload(current => current.roomState.status === 'IN_GAME' ? current : updated);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) onSessionInvalid(error.message);
      else setActionError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái sẵn sàng.');
    } finally {
      setIsUpdatingReady(false);
    }
  }

  const { roomState } = roomPayload;
  const currentSeat = roomState.seats.find(seat => seat.userId === currentUser.userId);
  const isHost = roomState.actingHostUserId === currentUser.userId;
  const guests = roomState.seats.filter(seat => seat.userId !== roomState.actingHostUserId);
  const readyCount = guests.filter(seat => seat.isReady && seat.connectionStatus === 'ONLINE').length;
  const missing = Math.max(0, 4 - roomState.seats.length);
  const waiting = guests.length - readyCount;
  const requirement = missing ? `Cần thêm ${missing} người để bắt đầu` :
    waiting ? `Chờ ${waiting} khách sẵn sàng` : '';
  const status = isStartingMatch ? 'Đang bắt đầu…' : requirement ||
    (isHost ? 'Có thể bắt đầu' : 'Chờ chủ phòng bắt đầu');
  const control = 'min-h-10 rounded border border-[#806345] bg-[#211913] px-3 text-sm text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]';

  useEffect(() => {
    const previous = previousSeats.current;
    previousSeats.current = roomState.seats;
    function pulse(index: number, color: string) {
      if (prefersReducedMotion()) return;
      seatList.current?.children[index]?.animate(
        [{ outline: `2px solid ${color}`, outlineOffset: '1px' }, { outline: '2px solid transparent', outlineOffset: '4px' }],
        { duration: 220, easing: 'ease-out' },
      );
    }
    let joined = false;
    let readiedOn = false;
    for (const seat of roomState.seats) {
      const old = previous.find(item => item.userId === seat.userId);
      if (!old) {
        joined = true;
        setSeatNotice(`${seat.displayName} đã vào ghế ${seat.seatIndex + 1}.`);
      } else if (old.connectionStatus !== seat.connectionStatus) {
        setSeatNotice(`${seat.displayName} ${seat.connectionStatus === 'ONLINE' ? 'vừa kết nối lại' : 'mất kết nối'}.`);
      } else if (Boolean(old.isReady) !== Boolean(seat.isReady)) {
        if (seat.isReady) readiedOn = true;
        pulse(seat.seatIndex, seat.isReady ? '#8ac5ae' : '#e6be6c');
        setSeatNotice(`${seat.displayName} ${seat.isReady ? 'vừa sẵn sàng' : 'vừa hủy sẵn sàng'}.`);
      }
    }
    const departed = previous.find(old => !roomState.seats.some(seat => seat.userId === old.userId));
    if (departed) pulse(previous.length - 1, '#d5a762');
    if (departed) setSeatNotice(`${departed.displayName} vừa rời phòng.`);
    if (joined) playMatchCue('ROOM_JOIN', soundEnabled);
    else if (departed) playMatchCue('ROOM_LEAVE', soundEnabled);
    if (readiedOn) playMatchCue('READY_ON', soundEnabled);
  }, [roomState.seats, soundEnabled]);

  useEffect(() => {
    if (!seatNotice) return;
    const timeout = window.setTimeout(() => setSeatNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [seatNotice]);

  return (
    <section className="lkdf-lobby-camp relative isolate flex min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="lkdf-lobby-camp-art"><MartialBackdropScene /></div>
      <div className="lkdf-lobby-camp-content">
        <div className="lkdf-lobby-camp-panel">
          <section className="lkdf-waiting-table lkdf-online-panel lkdf-online-room" aria-label="Phòng chờ">
            <div className="lkdf-online-fog" aria-hidden="true" />
            <header className="lkdf-waiting-header">
              <div>
                <p className="lkdf-online-kicker">{wsStatus === 'CONNECTED' ? 'Đã kết nối' : 'Đang đồng bộ phòng'}</p>
                <h2 className="font-serif-title">Phòng chờ</h2>
              </div>
              <div className="lkdf-waiting-invite">
                <strong className="font-mono-num">{roomCode}</strong>
                <button type="button" className={control} onClick={handleCopyRoomCode}>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</button>
                <button type="button" className={control} onClick={handleLeaveRoom} disabled={isLeavingRoom || isStartingMatch}>Rời phòng</button>
              </div>
            </header>
            <div className="lkdf-waiting-board">
              <div className="lkdf-waiting-surface">
                <div>
                  <strong className="font-serif-title">Bàn Xích Bích</strong>
                  <small>Nhịp {PRESET_OPTIONS.find(option => option.id === roomState.timerPreset)?.title} · {TIMER_PRESETS[roomState.timerPreset].mainTurnSeconds} giây/lượt</small>
                </div>
              </div>
              <ol ref={seatList} className="lkdf-waiting-seats" aria-label="8 ghế phòng chờ">
                {Array.from({ length: 8 }, (_, index) => {
                  const seat = roomState.seats.find(member => member.seatIndex === index);
                  const host = seat?.userId === roomState.actingHostUserId;
                  const self = seat?.userId === currentUser.userId;
                  const offline = seat?.connectionStatus === 'DISCONNECTED';
                  const ready = Boolean(seat?.isReady && !offline && !host);
                  return (
                    <li key={index} className="lkdf-waiting-seat" data-occupied={Boolean(seat)} data-self={self}
                      data-host={host} data-ready={ready} data-offline={offline}>
                      <span className="lkdf-waiting-seat-number" aria-label={`Ghế ${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
                      {!seat ? <span className="lkdf-waiting-empty"><span className="lkdf-waiting-empty-avatar"><GameIcon name="ui:user" size={15} /></span>Ghế trống</span> :
                        <div className="lkdf-waiting-player" key={seat.userId}>
                          <span className="lkdf-waiting-avatar">{seat.avatarUrl ? <img src={seat.avatarUrl} alt="" /> : getInitials(seat.displayName)}</span>
                          <div>
                            <div className="lkdf-waiting-player-name">
                              {self ? <span className="lkdf-waiting-self-label">Bạn</span> : null}
                              <strong title={seat.displayName}>{seat.displayName}</strong>
                            </div>
                            <small>{host ? seat.userId === roomState.ownerUserId ? 'Chủ phòng' : 'Chủ phòng tạm thời' : 'Khách'}</small>
                            {!host || offline ? <span className="lkdf-seat-readiness">
                              <GameIcon name={offline ? 'ui:wifi-off' : ready ? 'ui:check' : 'ui:clock'} size={12} />
                              {offline ? 'Mất kết nối' : ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                            </span> : null}
                          </div>
                        </div>}
                    </li>
                  );
                })}
              </ol>
            </div>
            <footer className="lkdf-waiting-footer">
              <p><strong>{roomState.seats.length}/8 người</strong> · {readyCount}/{guests.length} khách đã sẵn sàng</p>
              <div className="lkdf-waiting-actions">
                {wsStatus !== 'CONNECTED' ? <button className={control} type="button" onClick={handleManualSync} disabled={isSyncing}>Đồng bộ lại</button> : null}
                {isHost ? <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#DFCAA9]">Nhịp chơi</span>
                    <GuofengPillSelect
                      ariaLabel="Nhịp chơi"
                      value={roomState.timerPreset}
                      disabled={isUpdatingPreset || isStartingMatch}
                      className="min-w-[138px]"
                      options={PRESET_OPTIONS.map((option) => ({
                        value: option.id,
                        label: option.title,
                        detail: option.detail,
                      }))}
                      onChange={(nextValue) => {
                        const option = PRESET_OPTIONS.find((item) => item.id === nextValue);
                        if (option) void handleSelectTimerPreset(option.id);
                      }}
                    />
                  </div>
                  <div className="lkdf-waiting-start">
                    <button className="lkdf-online-join" type="button" disabled={Boolean(requirement) || isStartingMatch}
                      aria-describedby="live-room-start-status" onClick={handleStartMatch}>Bắt đầu ván đấu</button>
                    <small id="live-room-start-status" role="status">{status}</small>
                  </div>
                </> : <>
                  <button className={`${control} lkdf-waiting-ready`} type="button" aria-pressed={Boolean(currentSeat?.isReady)}
                    disabled={isUpdatingReady || currentSeat?.connectionStatus !== 'ONLINE'}
                    onClick={() => handleReady(!currentSeat?.isReady)}>{currentSeat?.isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}</button>
                  <p className="lkdf-waiting-guest-status" role="status">{currentSeat?.isReady ? status : 'Bấm Sẵn sàng khi bạn đã chuẩn bị xong'}</p>
                </>}
              </div>
              <p className="lkdf-waiting-seat-notice" role="status">{seatNotice}</p>
              {actionError ? <p className="lkdf-online-error basis-full" role="alert">{actionError}</p> : null}
            </footer>
          </section>
        </div>
      </div>
    </section>
  );
}
