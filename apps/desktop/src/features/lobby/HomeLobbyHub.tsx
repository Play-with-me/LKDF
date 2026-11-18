import { TIMER_PRESETS } from '@lkdf/shared';
import { useEffect, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import { ApiError } from '../../lib/api.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type {
  RoomViewerPayload,
  TimerPreset,
  UserProfile,
} from '../../lib/types.js';

export interface HomeLobbyHubProps {
  readonly api: LkdfApiClient;
  readonly sessionToken: string;
  readonly profile: UserProfile;
  readonly justLoggedIn: boolean;
  readonly onDismissWelcomeToast: () => void;
  readonly onProfileUpdated: (profile: UserProfile) => void;
  readonly onEnterRoom: (roomPayload: RoomViewerPayload) => void;
  readonly onOpenStats: () => void;
  readonly onLoggedOut: () => void;
  readonly onSessionInvalid: (messageVi: string) => void;
}

const PRESET_CARDS: readonly {
  readonly id: TimerPreset;
  readonly label: string;
  readonly desc: string;
}[] = [
  {
    id: 'FAST',
    label: 'Nhanh',
    desc: `${TIMER_PRESETS.FAST.heroSelectSeconds}/${TIMER_PRESETS.FAST.mainTurnSeconds}/${TIMER_PRESETS.FAST.reactionSeconds}s`,
  },
  {
    id: 'STANDARD',
    label: 'Chuẩn',
    desc: `${TIMER_PRESETS.STANDARD.heroSelectSeconds}/${TIMER_PRESETS.STANDARD.mainTurnSeconds}/${TIMER_PRESETS.STANDARD.reactionSeconds}s`,
  },
  {
    id: 'RELAXED',
    label: 'Thong thả',
    desc: `${TIMER_PRESETS.RELAXED.heroSelectSeconds}/${TIMER_PRESETS.RELAXED.mainTurnSeconds}/${TIMER_PRESETS.RELAXED.reactionSeconds}s`,
  },
];

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return 'LK';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function HomeLobbyHub({
  api,
  sessionToken,
  profile,
  justLoggedIn,
  onDismissWelcomeToast,
  onProfileUpdated,
  onEnterRoom,
  onOpenStats,
  onLoggedOut,
  onSessionInvalid,
}: HomeLobbyHubProps) {
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>('STANDARD');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [isCheckingActiveRoom, setIsCheckingActiveRoom] = useState<boolean>(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);
  const [isUpdatingSound, setIsUpdatingSound] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatarUrl]);

  useEffect(() => {
    if (!justLoggedIn) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onDismissWelcomeToast();
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [justLoggedIn, onDismissWelcomeToast]);

  useEffect(() => {
    let active = true;
    setIsCheckingActiveRoom(true);

    void (async () => {
      try {
        const myRoom = await api.getMyRoom(sessionToken);
        if (!active) {
          return;
        }
        if (myRoom) {
          onEnterRoom(myRoom);
          return;
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError && err.statusCode === 401) {
          onSessionInvalid(err.message);
          return;
        }
      } finally {
        if (active) {
          setIsCheckingActiveRoom(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [api, onEnterRoom, onSessionInvalid, sessionToken]);

  async function handleToggleSound(): Promise<void> {
    setIsUpdatingSound(true);
    try {
      const updated = await api.updatePreferences(sessionToken, {
        soundEnabled: !profile.preferences.soundEnabled,
      });
      onProfileUpdated(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
      }
    } finally {
      setIsUpdatingSound(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await api.logout(sessionToken);
    } catch {
      // Kể cả khi phiên đã hết hạn trên server vẫn xóa phiên ở máy khách
    } finally {
      setIsLoggingOut(false);
      onLoggedOut();
    }
  }

  async function handleCreateRoom(): Promise<void> {
    setCreateError(null);
    setJoinError(null);
    setIsCreatingRoom(true);
    try {
      const payload = await api.createRoom(sessionToken, selectedPreset);
      onEnterRoom(payload);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setCreateError(
        err instanceof Error ? err.message : 'Không thể tạo phòng mới.',
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleJoinRoom(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setJoinError(null);
    setCreateError(null);

    const normalized = roomCodeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setJoinError('Mã phòng phải gồm đúng 6 ký tự chữ hoặc số (VD: K9M2P4).');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const payload = await api.joinRoom(sessionToken, normalized);
      onEnterRoom(payload);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setJoinError(
        err instanceof Error ? err.message : 'Không thể vào phòng chơi này.',
      );
    } finally {
      setIsJoiningRoom(false);
    }
  }

  const displayCodeTarget =
    roomCodeInput.trim().length > 0
      ? roomCodeInput.trim().toUpperCase()
      : 'K9M2P4';

  return (
    <section className="lkdf-scroll flex flex-1 min-h-0 min-w-0 flex-col items-center overflow-y-auto p-6 animate-lkdf-fade">
      <div className="my-auto w-full max-w-4xl space-y-5">
      {justLoggedIn ? (
        <div className="flex w-full items-center justify-between rounded-lg border border-[#16A34A]/50 bg-[#16A34A]/15 px-4 py-2.5 text-sm text-[#86EFAC] animate-lkdf-slide">
          <span className="inline-flex items-center gap-2">
            <GameIcon name="ui:check-circle" size={15} />
            Đã đăng nhập: {profile.displayName}
          </span>
          <button
            type="button"
            onClick={onDismissWelcomeToast}
            className="text-xs text-[#BBF7D0] hover:underline"
          >
            Ẩn thông báo
          </button>
        </div>
      ) : null}
        {/* Thanh hồ sơ người chơi */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2D343C] bg-[#1E2328] px-5 py-4 shadow-lg">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.avatarUrl && !avatarFailed ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                onError={() => setAvatarFailed(true)}
                className="h-11 w-11 shrink-0 rounded-full border border-[#D99B26]/60 object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D99B26]/60 bg-[#C83E37] text-sm font-bold text-[#F4EFE6]">
                {getInitials(profile.displayName)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#F3F4F6]">
                {profile.displayName}
              </p>
              <p className="truncate text-xs text-[#9CA3AF]">{profile.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isUpdatingSound}
              onClick={() => {
                void handleToggleSound();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#D99B26] disabled:opacity-50"
            >
              <GameIcon
                name={profile.preferences.soundEnabled ? 'ui:volume-on' : 'ui:volume-off'}
                size={13}
              />
              {profile.preferences.soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
            </button>

            <button
              type="button"
              onClick={onOpenStats}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#D99B26]"
            >
              <GameIcon name="ui:chart" size={13} />
              Thống Kê &amp; Lịch Sử
            </button>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2 text-xs font-medium text-[#FCA5A5] transition-colors hover:border-[#DC2626] disabled:opacity-50"
            >
              <GameIcon name="ui:door-open" size={13} />
              {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
            </button>
          </div>
        </div>

        {isCheckingActiveRoom ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#2D343C] bg-[#1E2328] p-6 text-sm text-[#D1D5DB]">
            <GameIcon name="ui:loader" size={15} className="animate-spin text-[#D99B26]" />
            Đang kiểm tra phòng chơi hiện tại của tài khoản...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Cột 1: Tạo phòng mới */}
            <div className="flex flex-col justify-between rounded-xl border border-[#2D343C] bg-[#1E2328] p-6 shadow-lg">
              <div>
                <h2 className="font-serif-title text-lg font-bold text-[#F3F4F6]">
                  Tạo phòng chơi mới
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">
                  Mở bàn 4–8 người chơi thật (không dùng Bot). Chọn tốc độ đồng hồ đếm ngược cho từng lượt:
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {PRESET_CARDS.map((preset) => {
                    const active = selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`rounded-lg border p-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#D99B26] ${
                          active
                            ? 'border-[#D99B26] bg-[#D99B26]/15 text-[#F3F4F6]'
                            : 'border-[#30363D] bg-[#14171A] text-[#D1D5DB] hover:border-[#4B5563]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{preset.label}</div>
                        <div className="mt-0.5 font-mono-num text-[11px] text-[#9CA3AF]">
                          {preset.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {createError ? (
                  <p className="mt-3 text-xs text-[#FCA5A5]">{createError}</p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={isCreatingRoom}
                onClick={() => {
                  void handleCreateRoom();
                }}
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C83E37] px-4 py-3 text-sm font-semibold text-[#F4EFE6] shadow transition-colors hover:bg-[#D94A42] focus:outline-none focus:ring-2 focus:ring-[#D99B26] disabled:opacity-50"
              >
                <GameIcon name="castle" size={15} />
                {isCreatingRoom
                  ? 'Đang mở phòng...'
                  : 'Tạo phòng mới (4–8 người)'}
              </button>
            </div>

            {/* Cột 2: Vào phòng bằng mã 6 ký tự */}
            <form
              onSubmit={(e) => {
                void handleJoinRoom(e);
              }}
              className="flex flex-col justify-between rounded-xl border border-[#2D343C] bg-[#1E2328] p-6 shadow-lg"
            >
              <div>
                <h2 className="font-serif-title text-lg font-bold text-[#F3F4F6]">
                  Vào phòng bằng mã 6 ký tự
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">
                  Nhập mã phòng do bạn bè chia sẻ để vào ghế trống. Mỗi tài khoản Google chỉ được ngồi 1 ghế tại một thời điểm.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="lkdf-join-room-code"
                    className="mb-1.5 block text-xs font-medium text-[#D1D5DB]"
                  >
                    Mã phòng
                  </label>
                  <input
                    id="lkdf-join-room-code"
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => {
                      setRoomCodeInput(
                        e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
                      );
                      setJoinError(null);
                    }}
                    placeholder="Nhập 6 ký tự (VD: K9M2P4)"
                    className="w-full rounded-lg border border-[#3A424C] bg-[#14171A] px-3.5 py-2.5 font-mono-num text-base font-semibold uppercase tracking-widest text-[#F3F4F6] placeholder-[#6B7280] focus:border-[#D99B26] focus:outline-none"
                  />
                </div>

                {joinError ? (
                  <p className="mt-3 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-xs text-[#FCA5A5]">
                    {joinError}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isJoiningRoom}
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D99B26]/70 bg-[#14171A] px-4 py-3 text-sm font-semibold text-[#F3F4F6] transition-colors hover:bg-[#262C34] focus:outline-none focus:ring-2 focus:ring-[#D99B26] disabled:opacity-50"
              >
                <GameIcon name="ui:door-open" size={15} className="text-[#D99B26]" />
                {isJoiningRoom
                  ? 'Đang vào phòng...'
                  : `Vào phòng ${displayCodeTarget}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
