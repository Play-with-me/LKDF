import { TIMER_PRESETS } from '@lkdf/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengPillSelect } from '../../components/ui/GuofengPillSelect.js';
import { ApiError, type LkdfApiClient } from '../../lib/api.js';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { playMatchCue } from '../../lib/soundFx.js';
import type {
  LanHostStatus,
  RoomViewerPayload,
  TimerPreset,
  UserProfile,
} from '../../lib/types.js';
import { createRoomWsClient, type WsConnectionStatus } from '../../lib/wsClient.js';
import { MartialBackdropScene } from './MartialBackdropScene.js';
import './lobby-camp.css';

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
  readonly titleEn: string;
  readonly detail: string;
  readonly detailEn: string;
}[] = [
  {
    id: 'FAST',
    title: 'Nhanh',
    titleEn: 'Fast',
    detail: `Chọn tướng ${TIMER_PRESETS.FAST.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.FAST.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.FAST.reactionSeconds}s`,
    detailEn: `Draft ${TIMER_PRESETS.FAST.heroSelectSeconds}s · Turn ${TIMER_PRESETS.FAST.mainTurnSeconds}s · React ${TIMER_PRESETS.FAST.reactionSeconds}s`,
  },
  {
    id: 'STANDARD',
    title: 'Chuẩn',
    titleEn: 'Standard',
    detail: `Chọn tướng ${TIMER_PRESETS.STANDARD.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.STANDARD.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.STANDARD.reactionSeconds}s`,
    detailEn: `Draft ${TIMER_PRESETS.STANDARD.heroSelectSeconds}s · Turn ${TIMER_PRESETS.STANDARD.mainTurnSeconds}s · React ${TIMER_PRESETS.STANDARD.reactionSeconds}s`,
  },
  {
    id: 'RELAXED',
    title: 'Thong thả',
    titleEn: 'Relaxed',
    detail: `Chọn tướng ${TIMER_PRESETS.RELAXED.heroSelectSeconds}s · Đánh ${TIMER_PRESETS.RELAXED.mainTurnSeconds}s · Phản ứng ${TIMER_PRESETS.RELAXED.reactionSeconds}s`,
    detailEn: `Draft ${TIMER_PRESETS.RELAXED.heroSelectSeconds}s · Turn ${TIMER_PRESETS.RELAXED.mainTurnSeconds}s · React ${TIMER_PRESETS.RELAXED.reactionSeconds}s`,
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return 'CC';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function parseServerEndpoint(rawUrl: string): {
  readonly hostname: string;
  readonly port: number;
  readonly hostPort: string;
  readonly isLoopback: boolean;
} {
  try {
    const parsed = new URL(rawUrl);
    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === 'https:'
        ? 443
        : 80;
    const hostPort = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.host;
    const isLoopback =
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '::1';
    return {
      hostname: parsed.hostname,
      port: Number.isInteger(port) && port > 0 ? port : 3001,
      hostPort,
      isLoopback,
    };
  } catch {
    return {
      hostname: '127.0.0.1',
      port: 3001,
      hostPort: '127.0.0.1:3001',
      isLoopback: true,
    };
  }
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
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [roomPayload, setRoomPayload] = useState<RoomViewerPayload>(initialRoom);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CONNECTING');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lanStatus, setLanStatus] = useState<LanHostStatus | null>(null);
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
  const copyTimerRef = useRef<number | null>(null);
  const roomCode = roomPayload.roomState.roomCode;
  const soundEnabled = currentUser.preferences.soundEnabled;

  const endpoint = useMemo(() => parseServerEndpoint(serverUrl), [serverUrl]);

  useEffect(() => {
    let active = true;
    const bridge = window.lkdfDesktop;
    if (!bridge?.getLanHostStatus) {
      return undefined;
    }
    void bridge
      .getLanHostStatus(endpoint.port)
      .then((status) => {
        if (active) {
          setLanStatus(status);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [endpoint.port]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const smartInvites = useMemo(() => {
    const items: Array<{
      readonly key: string;
      readonly label: string;
      readonly invite: string;
    }> = [];

    if (endpoint.isLoopback && lanStatus && lanStatus.addresses.length > 0) {
      for (const addr of lanStatus.addresses) {
        const addrHostPort = parseServerEndpoint(addr.url).hostPort;
        items.push({
          key: `lan-${addr.ip}`,
          label: addr.label,
          invite: `${addrHostPort}#${roomCode}`,
        });
      }
    } else if (!endpoint.isLoopback) {
      items.push({
        key: 'remote-host',
        label: isEn ? 'Host IP' : 'Địa chỉ Bàn',
        invite: `${endpoint.hostPort}#${roomCode}`,
      });
    }

    if (items.length === 0) {
      items.push({
        key: 'local-loopback',
        label: isEn ? 'Same PC' : 'Cùng máy',
        invite: `${endpoint.hostPort}#${roomCode}`,
      });
    }

    return items;
  }, [endpoint.hostPort, endpoint.isLoopback, isEn, lanStatus, roomCode]);

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
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to sync room state.'
            : 'Không thể đồng bộ trạng thái phòng.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [api, isEn, onMatchStarted, onSessionInvalid, roomCode, sessionToken]);

  async function copyTextWithFeedback(key: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null);
      }, 2200);
    } catch {
      setActionError(
        isEn
          ? `Could not copy automatically. Please copy manually: ${value}`
          : `Không thể sao chép tự động. Vui lòng chép thủ công: ${value}`,
      );
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
      setRoomPayload((current) =>
        current.roomState.status === 'IN_GAME' ? current : updated,
      );
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        onSessionInvalid(error.message);
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật trạng thái sẵn sàng.',
        );
      }
    } finally {
      setIsUpdatingReady(false);
    }
  }

  const { roomState } = roomPayload;
  const currentSeat = roomState.seats.find(
    (seat) => seat.userId === currentUser.userId,
  );
  const isHost = roomState.actingHostUserId === currentUser.userId;
  const guests = roomState.seats.filter(
    (seat) => seat.userId !== roomState.actingHostUserId,
  );
  const readyCount = guests.filter(
    (seat) => seat.isReady && seat.connectionStatus === 'ONLINE',
  ).length;
  const missing = Math.max(0, 4 - roomState.seats.length);
  const waiting = guests.length - readyCount;
  const requirement = missing
    ? isEn
      ? `Need ${missing} more player(s) to start`
      : `Cần thêm ${missing} người để bắt đầu`
    : waiting
      ? isEn
        ? `Waiting for ${waiting} guest(s) to ready up`
        : `Chờ ${waiting} khách sẵn sàng`
      : '';
  const status = isStartingMatch
    ? isEn
      ? 'Starting match…'
      : 'Đang bắt đầu…'
    : requirement ||
      (isHost
        ? isEn
          ? 'Ready to start'
          : 'Có thể bắt đầu'
        : isEn
          ? 'Waiting for host to start'
          : 'Chờ chủ phòng bắt đầu');
  const control =
    'min-h-10 rounded border border-[#806345] bg-[#211913] px-3 text-sm text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]';

  useEffect(() => {
    const previous = previousSeats.current;
    previousSeats.current = roomState.seats;
    function pulse(index: number, color: string) {
      if (prefersReducedMotion()) return;
      seatList.current?.children[index]?.animate(
        [
          { outline: `2px solid ${color}`, outlineOffset: '1px' },
          { outline: '2px solid transparent', outlineOffset: '4px' },
        ],
        { duration: 220, easing: 'ease-out' },
      );
    }
    let joined = false;
    let readiedOn = false;
    for (const seat of roomState.seats) {
      const old = previous.find((item) => item.userId === seat.userId);
      if (!old) {
        joined = true;
        setSeatNotice(
          isEn
            ? `${seat.displayName} joined seat ${seat.seatIndex + 1}.`
            : `${seat.displayName} đã vào ghế ${seat.seatIndex + 1}.`,
        );
      } else if (old.connectionStatus !== seat.connectionStatus) {
        setSeatNotice(
          isEn
            ? `${seat.displayName} ${seat.connectionStatus === 'ONLINE' ? 'reconnected' : 'disconnected'}.`
            : `${seat.displayName} ${seat.connectionStatus === 'ONLINE' ? 'vừa kết nối lại' : 'mất kết nối'}.`,
        );
      } else if (Boolean(old.isReady) !== Boolean(seat.isReady)) {
        if (seat.isReady) readiedOn = true;
        pulse(seat.seatIndex, seat.isReady ? '#8ac5ae' : '#e6be6c');
        setSeatNotice(
          isEn
            ? `${seat.displayName} ${seat.isReady ? 'is ready' : 'is no longer ready'}.`
            : `${seat.displayName} ${seat.isReady ? 'vừa sẵn sàng' : 'vừa hủy sẵn sàng'}.`,
        );
      }
    }
    const departed = previous.find(
      (old) => !roomState.seats.some((seat) => seat.userId === old.userId),
    );
    if (departed) pulse(previous.length - 1, '#d5a762');
    if (departed) {
      setSeatNotice(
        isEn
          ? `${departed.displayName} left the room.`
          : `${departed.displayName} vừa rời phòng.`,
      );
    }
    if (joined) playMatchCue('ROOM_JOIN', soundEnabled);
    else if (departed) playMatchCue('ROOM_LEAVE', soundEnabled);
    if (readiedOn) playMatchCue('READY_ON', soundEnabled);
  }, [isEn, roomState.seats, soundEnabled]);

  useEffect(() => {
    if (!seatNotice) return;
    const timeout = window.setTimeout(() => setSeatNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [seatNotice]);

  const activePreset = PRESET_OPTIONS.find(
    (option) => option.id === roomState.timerPreset,
  );

  return (
    <section className="lkdf-lobby-camp relative isolate flex min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="lkdf-lobby-camp-art">
        <MartialBackdropScene />
      </div>
      <div className="lkdf-lobby-camp-content">
        <div className="lkdf-lobby-camp-panel">
          <section
            className="lkdf-waiting-table lkdf-online-panel lkdf-online-room"
            aria-label={isEn ? 'Waiting Room' : 'Phòng chờ'}
          >
            <div className="lkdf-online-fog" aria-hidden="true" />
            <header className="lkdf-waiting-header">
              <div>
                <p className="lkdf-online-kicker">
                  {wsStatus === 'CONNECTED'
                    ? isEn
                      ? 'Connected'
                      : 'Đã kết nối'
                    : isEn
                      ? 'Syncing Room'
                      : 'Đang đồng bộ phòng'}
                </p>
                <h2 className="font-serif-title">
                  {isEn ? 'Waiting Room' : 'Phòng chờ'}
                </h2>
              </div>
              <div className="lkdf-waiting-invite">
                <strong className="font-mono-num">{roomCode}</strong>
                <button
                  type="button"
                  className={control}
                  onClick={() => void copyTextWithFeedback('code-only', roomCode)}
                >
                  {copiedKey === 'code-only'
                    ? isEn
                      ? 'Copied'
                      : 'Đã sao chép'
                    : isEn
                      ? 'Copy Code'
                      : 'Sao chép mã'}
                </button>
                <button
                  type="button"
                  className={control}
                  onClick={() => void handleLeaveRoom()}
                  disabled={isLeavingRoom || isStartingMatch}
                >
                  {isEn ? 'Leave Room' : 'Rời phòng'}
                </button>
              </div>
            </header>

            {/* Thanh Mã Mời Bạn Bè Đa Máy (1 chạm) */}
            <div
              role="region"
              aria-label={
                isEn ? 'Multi-PC Friend Invite' : 'Mã Mời Bạn Bè Đa Máy'
              }
              className="mx-[clamp(10px,2vw,20px)] mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[#C89B4B]/60 bg-[#1B1510]/95 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#E6BE6C]/60 bg-[#3B2616] text-[#F5D99C]">
                  <GameIcon name="ui:copy" size={13} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-[#F5EBD6]">
                    {isEn
                      ? 'Multi-PC Friend Invite (1-Click Copy for Zalo / Discord)'
                      : 'Mã Mời Bạn Bè Đa Máy (Chép 1 chạm gửi Zalo / Discord)'}
                  </strong>
                  <span className="text-[11px] text-[#D5C3A5]">
                    {isEn
                      ? 'Friends paste this string into "Join Friend\'s Table" to take a seat immediately.'
                      : 'Bạn bè chỉ cần dán thẳng chuỗi này vào ô "Vào Bàn Bạn Bè" là vào ghế ngay.'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {smartInvites.map((item) => {
                  const isCopied = copiedKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void copyTextWithFeedback(item.key, item.invite)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono-num text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                        isCopied
                          ? 'border-[#22C55E] bg-[#133221] text-[#BBF7D0]'
                          : 'border-[#C89B4B]/75 bg-[#2A1E15] text-[#FCE7B8] hover:border-[#E6BE6C] hover:bg-[#3A291C]'
                      }`}
                    >
                      <span className="rounded bg-[#14100D] px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-[#E6BE6C]">
                        {item.label}
                      </span>
                      <span>{item.invite}</span>
                      <GameIcon
                        name={isCopied ? 'ui:check' : 'ui:copy'}
                        size={12}
                        className={isCopied ? 'text-[#4ADE80]' : 'text-[#E6BE6C]'}
                      />
                      <span className="font-sans text-[11px]">
                        {isCopied
                          ? isEn
                            ? 'Copied!'
                            : 'Đã chép!'
                          : isEn
                            ? 'Copy'
                            : 'Chép'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lkdf-waiting-board">
              <div className="lkdf-waiting-surface">
                <div>
                  <strong className="font-serif-title">
                    {isEn ? 'Nine Realms Table' : 'Bàn Cửu Châu'}
                  </strong>
                  <small>
                    {isEn
                      ? `${activePreset?.titleEn ?? roomState.timerPreset} Pace · ${TIMER_PRESETS[roomState.timerPreset].mainTurnSeconds}s/turn`
                      : `Nhịp ${activePreset?.title} · ${TIMER_PRESETS[roomState.timerPreset].mainTurnSeconds} giây/lượt`}
                  </small>
                </div>
              </div>
              <ol
                ref={seatList}
                className="lkdf-waiting-seats"
                aria-label={isEn ? '8 waiting room seats' : '8 ghế phòng chờ'}
              >
                {Array.from({ length: 8 }, (_, index) => {
                  const seat = roomState.seats.find(
                    (member) => member.seatIndex === index,
                  );
                  const host = seat?.userId === roomState.actingHostUserId;
                  const self = seat?.userId === currentUser.userId;
                  const offline = seat?.connectionStatus === 'DISCONNECTED';
                  const ready = Boolean(seat?.isReady && !offline && !host);
                  return (
                    <li
                      key={index}
                      className="lkdf-waiting-seat"
                      data-occupied={Boolean(seat)}
                      data-self={self}
                      data-host={host}
                      data-ready={ready}
                      data-offline={offline}
                    >
                      <span
                        className="lkdf-waiting-seat-number"
                        aria-label={isEn ? `Seat ${index + 1}` : `Ghế ${index + 1}`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {!seat ? (
                        <span className="lkdf-waiting-empty">
                          <span className="lkdf-waiting-empty-avatar">
                            <GameIcon name="ui:user" size={15} />
                          </span>
                          {isEn ? 'Empty Seat' : 'Ghế trống'}
                        </span>
                      ) : (
                        <div className="lkdf-waiting-player" key={seat.userId}>
                          <span className="lkdf-waiting-avatar">
                            {seat.avatarUrl ? (
                              <img src={seat.avatarUrl} alt="" />
                            ) : (
                              getInitials(seat.displayName)
                            )}
                          </span>
                          <div>
                            <div className="lkdf-waiting-player-name">
                              {self ? (
                                <span className="lkdf-waiting-self-label">
                                  {isEn ? 'You' : 'Bạn'}
                                </span>
                              ) : null}
                              <strong title={seat.displayName}>
                                {seat.displayName}
                              </strong>
                            </div>
                            <small>
                              {host
                                ? seat.userId === roomState.ownerUserId
                                  ? isEn
                                    ? 'Host'
                                    : 'Chủ phòng'
                                  : isEn
                                    ? 'Acting Host'
                                    : 'Chủ phòng tạm thời'
                                : isEn
                                  ? 'Guest'
                                  : 'Khách'}
                            </small>
                            {!host || offline ? (
                              <span className="lkdf-seat-readiness">
                                <GameIcon
                                  name={
                                    offline
                                      ? 'ui:wifi-off'
                                      : ready
                                        ? 'ui:check'
                                        : 'ui:clock'
                                  }
                                  size={12}
                                />
                                {offline
                                  ? isEn
                                    ? 'Disconnected'
                                    : 'Mất kết nối'
                                  : ready
                                    ? isEn
                                      ? 'Ready'
                                      : 'Sẵn sàng'
                                    : isEn
                                      ? 'Not Ready'
                                      : 'Chưa sẵn sàng'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
            <footer className="lkdf-waiting-footer">
              <p>
                <strong>
                  {isEn
                    ? `${roomState.seats.length}/8 players`
                    : `${roomState.seats.length}/8 người`}
                </strong>{' '}
                ·{' '}
                {isEn
                  ? `${readyCount}/${guests.length} guests ready`
                  : `${readyCount}/${guests.length} khách đã sẵn sàng`}
              </p>
              <div className="lkdf-waiting-actions">
                {wsStatus !== 'CONNECTED' ? (
                  <button
                    className={control}
                    type="button"
                    onClick={() => void handleManualSync()}
                    disabled={isSyncing}
                  >
                    {isEn ? 'Re-sync' : 'Đồng bộ lại'}
                  </button>
                ) : null}
                {isHost ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#DFCAA9]">
                        {isEn ? 'Pace' : 'Nhịp chơi'}
                      </span>
                      <GuofengPillSelect
                        ariaLabel={isEn ? 'Turn Pace' : 'Nhịp chơi'}
                        value={roomState.timerPreset}
                        disabled={isUpdatingPreset || isStartingMatch}
                        className="min-w-[138px]"
                        options={PRESET_OPTIONS.map((option) => ({
                          value: option.id,
                          label: isEn ? option.titleEn : option.title,
                          detail: isEn ? option.detailEn : option.detail,
                        }))}
                        onChange={(nextValue) => {
                          const option = PRESET_OPTIONS.find(
                            (item) => item.id === nextValue,
                          );
                          if (option) void handleSelectTimerPreset(option.id);
                        }}
                      />
                    </div>
                    <div className="lkdf-waiting-start">
                      <button
                        className="lkdf-online-join"
                        type="button"
                        disabled={Boolean(requirement) || isStartingMatch}
                        aria-describedby="live-room-start-status"
                        onClick={() => void handleStartMatch()}
                      >
                        {isEn ? 'Start Match' : 'Bắt đầu ván đấu'}
                      </button>
                      <small id="live-room-start-status" role="status">
                        {status}
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      className={`${control} lkdf-waiting-ready`}
                      type="button"
                      aria-pressed={Boolean(currentSeat?.isReady)}
                      disabled={
                        isUpdatingReady ||
                        currentSeat?.connectionStatus !== 'ONLINE'
                      }
                      onClick={() => void handleReady(!currentSeat?.isReady)}
                    >
                      {currentSeat?.isReady
                        ? isEn
                          ? 'Cancel Ready'
                          : 'Hủy sẵn sàng'
                        : isEn
                          ? 'Ready'
                          : 'Sẵn sàng'}
                    </button>
                    <p className="lkdf-waiting-guest-status" role="status">
                      {currentSeat?.isReady
                        ? status
                        : isEn
                          ? 'Click Ready when you are prepared'
                          : 'Bấm Sẵn sàng khi bạn đã chuẩn bị xong'}
                    </p>
                  </>
                )}
              </div>
              <p className="lkdf-waiting-seat-notice" role="status">
                {seatNotice}
              </p>
              {actionError ? (
                <p className="lkdf-online-error basis-full" role="alert">
                  {actionError}
                </p>
              ) : null}
            </footer>
          </section>
        </div>
      </div>
    </section>
  );
}
