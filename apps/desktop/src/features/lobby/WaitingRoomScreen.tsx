import { TIMER_PRESETS } from '@lkdf/shared';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
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
    return 'LK';
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

  const roomCode = roomPayload.roomState.roomCode;

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

  const { roomState, playerView } = roomPayload;
  const seatCount = roomState.seats.length;
  const isActingHost = roomState.actingHostUserId === currentUser.userId;
  const missingPlayers = Math.max(0, 4 - seatCount);
  const canStart = isActingHost && seatCount >= 4 && seatCount <= 8;
  const emptySlotCount = Math.max(0, 8 - seatCount);

  if (roomState.status === 'IN_GAME') {
    return (
      <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6 animate-lkdf-fade">
        <div className="w-full max-w-2xl rounded-xl border border-[#D99B26]/50 bg-[#1E2328] p-7 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full border border-[#16A34A]/40 bg-[#16A34A]/15 px-3 py-1 text-xs font-semibold text-[#86EFAC]">
                Ván đấu đang diễn ra · Phòng #{roomState.roomCode}
              </span>
              <h2 className="mt-2 font-serif-title text-xl font-bold text-[#F3F4F6]">
                Ván đấu đã bắt đầu
              </h2>
            </div>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                void handleManualSync();
              }}
              className="rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2 text-xs font-medium text-[#F3F4F6] hover:border-[#D99B26] disabled:opacity-50"
            >
              {isSyncing ? 'Đang đồng bộ...' : '🔄 Đồng bộ lại'}
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#D1D5DB]">
            Ván đấu đã bắt đầu — Giao diện Bàn đấu 4–8 ghế sẽ được lắp đặt hoàn chỉnh ở Bước 4.2.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[#2D343C] bg-[#14171A] p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="text-[#9CA3AF]">Vòng đấu</span>
              <p className="mt-1 font-mono-num text-sm font-semibold text-[#F3F4F6]">
                {playerView ? `Vòng ${playerView.roundNumber}` : 'Đang khởi tạo'}
              </p>
            </div>
            <div>
              <span className="text-[#9CA3AF]">Pha hiện tại</span>
              <p className="mt-1 font-mono-num text-sm font-semibold text-[#D99B26]">
                {playerView ? playerView.turnPhase : 'HERO_SELECT'}
              </p>
            </div>
            <div>
              <span className="text-[#9CA3AF]">Sĩ số bàn</span>
              <p className="mt-1 font-mono-num text-sm font-semibold text-[#F3F4F6]">
                {seatCount} người thật
              </p>
            </div>
            <div>
              <span className="text-[#9CA3AF]">Trọng Tài</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#F3F4F6]">
                {roomState.seats.find((s) => s.userId === roomState.actingHostUserId)
                  ?.displayName ?? 'Chủ phòng'}
              </p>
            </div>
          </div>

          {actionError ? (
            <p className="mt-3 text-xs text-[#FCA5A5]">{actionError}</p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={isLeavingRoom}
              onClick={() => {
                void handleLeaveRoom();
              }}
              className="rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2 text-xs font-medium text-[#FCA5A5] hover:border-[#DC2626] disabled:opacity-50"
            >
              {isLeavingRoom ? 'Đang rời...' : '🚪 Rời phòng chờ'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 min-h-0 min-w-0 flex-col gap-4 p-5 animate-lkdf-fade">
      {/* Đầu phòng chờ: Mã phòng + Trạng thái kết nối WS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2D343C] bg-[#1E2328] px-5 py-3.5 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-xs text-[#9CA3AF]">Mã phòng chơi (4–8 người thật)</span>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="font-mono-num text-2xl font-bold tracking-widest text-[#D99B26]">
                {roomCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleCopyRoomCode();
                }}
                className="rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#D99B26] focus:outline-none focus:ring-2 focus:ring-[#D99B26]"
              >
                {copiedCode ? '✅ Đã sao chép!' : '📋 Sao chép mã phòng'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              wsStatus === 'CONNECTED'
                ? 'border-[#16A34A]/40 bg-[#16A34A]/15 text-[#86EFAC]'
                : 'border-[#D97706]/40 bg-[#D97706]/15 text-[#FDE68A]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                wsStatus === 'CONNECTED' ? 'bg-[#16A34A]' : 'bg-[#D97706]'
              }`}
            />
            {wsStatus === 'CONNECTED'
              ? 'Đã kết nối trực tuyến'
              : 'Đang kết nối lại...'}
          </span>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              void handleManualSync();
            }}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] hover:border-[#D99B26] disabled:opacity-50"
          >
            {isSyncing ? 'Đang đồng bộ...' : '🔄 Đồng bộ'}
          </button>
        </div>
      </div>

      {/* Thân phòng chờ: Danh sách ghế 4–8 người + Tùy chọn đồng hồ */}
      <div className="grid flex-1 min-h-0 min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cột trái (2/3): Danh sách ghế thật */}
        <div className="flex flex-col min-h-0 min-w-0 rounded-xl border border-[#2D343C] bg-[#1E2328] p-5 shadow lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif-title text-base font-bold text-[#F3F4F6]">
              Người chơi trong phòng ({seatCount}/8)
            </h2>
            <span className="text-xs text-[#9CA3AF]">
              Tối thiểu 4 người thật để bắt đầu
            </span>
          </div>

          <div className="lkdf-scroll grid flex-1 min-h-0 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {roomState.seats.map((seat) => {
              const isOwner = seat.userId === roomState.ownerUserId;
              const isTempHost =
                seat.userId === roomState.actingHostUserId && !isOwner;
              const isSelf = seat.userId === currentUser.userId;

              return (
                <div
                  key={seat.userId}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${
                    isSelf
                      ? 'border-[#D99B26]/70 bg-[#14171A]'
                      : 'border-[#30363D] bg-[#14171A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {seat.avatarUrl ? (
                      <img
                        src={seat.avatarUrl}
                        alt={seat.displayName}
                        className="h-10 w-10 shrink-0 rounded-full border border-[#3A424C] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3A424C] bg-[#C83E37] text-xs font-bold text-[#F4EFE6]">
                        {getInitials(seat.displayName)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-[#F3F4F6]">
                          {seat.displayName}
                        </span>
                        {isSelf ? (
                          <span className="shrink-0 text-[11px] font-medium text-[#D99B26]">
                            (Bạn)
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-num text-[11px] text-[#9CA3AF]">
                          Ghế #{seat.seatIndex + 1}
                        </span>
                        {isOwner ? (
                          <span className="rounded bg-[#D99B26]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#FDE68A]">
                            👑 Chủ phòng
                          </span>
                        ) : null}
                        {isTempHost ? (
                          <span className="rounded bg-[#3B82F6]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#93C5FD]">
                            ⚖️ Trọng Tài tạm
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      seat.connectionStatus === 'ONLINE'
                        ? 'bg-[#16A34A]/15 text-[#86EFAC]'
                        : 'bg-[#DC2626]/15 text-[#FCA5A5]'
                    }`}
                  >
                    {seat.connectionStatus === 'ONLINE'
                      ? 'Trực tuyến'
                      : 'Mất kết nối'}
                  </span>
                </div>
              );
            })}

            {Array.from({ length: emptySlotCount }).map((_, idx) => (
              <div
                key={`empty-slot-${idx}`}
                className="flex items-center justify-center rounded-lg border border-dashed border-[#30363D] bg-[#14171A]/40 p-3.5 text-xs text-[#6B7280]"
              >
                Ghế trống chờ bạn bè nhập mã...
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải (1/3): Tốc độ đồng hồ & Nút Bắt đầu / Rời phòng */}
        <div className="flex flex-col justify-between rounded-xl border border-[#2D343C] bg-[#1E2328] p-5 shadow">
          <div>
            <h3 className="font-serif-title text-base font-bold text-[#F3F4F6]">
              Tốc độ đồng hồ đếm ngược
            </h3>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {isActingHost
                ? 'Bạn là Chủ phòng — có thể đổi tốc độ trước khi bắt đầu.'
                : 'Chỉ Chủ phòng được đổi tốc độ đồng hồ.'}
            </p>

            <div className="mt-3 space-y-2.5">
              {PRESET_OPTIONS.map((option) => {
                const isSelected = roomState.timerPreset === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!isActingHost || isUpdatingPreset}
                    onClick={() => {
                      void handleSelectTimerPreset(option.id);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#D99B26] ${
                      isSelected
                        ? 'border-[#D99B26] bg-[#D99B26]/15 text-[#F3F4F6]'
                        : 'border-[#30363D] bg-[#14171A] text-[#D1D5DB]'
                    } ${
                      isActingHost
                        ? 'hover:border-[#D99B26]/70 cursor-pointer'
                        : 'cursor-default opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{option.title}</span>
                      {isSelected ? (
                        <span className="text-xs font-semibold text-[#D99B26]">
                          Đang chọn
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono-num text-xs text-[#9CA3AF]">
                      {option.detail}
                    </p>
                  </button>
                );
              })}
            </div>

            {actionError ? (
              <p className="mt-3 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-xs text-[#FCA5A5]">
                {actionError}
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-3 border-t border-[#2D343C] pt-4">
            {seatCount < 4 ? (
              <div>
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-[#C83E37] px-4 py-3 text-sm font-semibold text-[#F4EFE6] opacity-50"
                >
                  ▶️ Bắt đầu ván đấu
                </button>
                <p className="mt-2 text-center text-xs font-medium text-[#FDE68A]">
                  Cần thêm {missingPlayers} người chơi thật nữa để bắt đầu (Tối thiểu 4 người)
                </p>
              </div>
            ) : isActingHost ? (
              <button
                type="button"
                disabled={!canStart || isStartingMatch}
                onClick={() => {
                  void handleStartMatch();
                }}
                className="w-full rounded-lg bg-[#C83E37] px-4 py-3 text-sm font-semibold text-[#F4EFE6] shadow transition-colors hover:bg-[#D94A42] focus:outline-none focus:ring-2 focus:ring-[#D99B26] disabled:opacity-50"
              >
                {isStartingMatch
                  ? 'Đang chia bài & khởi tạo ván...'
                  : `▶️ Bắt đầu ván đấu (${seatCount} người)`}
              </button>
            ) : (
              <div className="rounded-lg border border-[#30363D] bg-[#14171A] px-4 py-3 text-center text-xs text-[#D1D5DB]">
                ⏳ Đang chờ Chủ phòng bấm Bắt đầu ván đấu...
              </div>
            )}

            <button
              type="button"
              disabled={isLeavingRoom}
              onClick={() => {
                void handleLeaveRoom();
              }}
              className="w-full rounded-lg border border-[#3A424C] bg-[#14171A] px-4 py-2.5 text-xs font-medium text-[#FCA5A5] transition-colors hover:border-[#DC2626] disabled:opacity-50"
            >
              {isLeavingRoom ? 'Đang rời phòng...' : '🚪 Rời phòng chờ'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
