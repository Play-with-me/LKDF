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
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>(profile.displayName);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setAvatarFailed(false);
    setNameDraft(profile.displayName);
  }, [profile.avatarUrl, profile.displayName]);

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

  async function handleSaveDisplayName(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setNameError('Biệt danh cần từ 2 đến 20 ký tự.');
      return;
    }

    setNameError(null);
    setIsSavingName(true);
    try {
      const updated = await api.updateDisplayName(sessionToken, trimmed);
      onProfileUpdated(updated);
      setIsEditingName(false);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 401) {
        onSessionInvalid(err.message);
        return;
      }
      setNameError(
        err instanceof Error ? err.message : 'Không thể đổi biệt danh.',
      );
    } finally {
      setIsSavingName(false);
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-[#94A3B8]/32 bg-[#11151D]/95 px-5 py-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.avatarUrl && !avatarFailed ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                onError={() => setAvatarFailed(true)}
                className="h-11 w-11 shrink-0 rounded-full border border-[#CA9A48]/65 object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CA9A48]/65 bg-[#9E2B25] font-serif-title text-sm font-bold text-[#F4EFE6]">
                {getInitials(profile.displayName)}
              </div>
            )}

            <div className="min-w-0">
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    void handleSaveDisplayName(e);
                  }}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <input
                    type="text"
                    maxLength={20}
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      setNameError(null);
                    }}
                    aria-label="Biệt danh hiển thị mới"
                    className="w-40 rounded-lg border border-[#D99B26]/70 bg-[#101216] px-2.5 py-1 text-xs font-semibold text-[#EFE6D5] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="cursor-pointer rounded-lg bg-[#9E2B25] px-2.5 py-1 text-xs font-semibold text-[#F4EFE6] hover:bg-[#C83E37] disabled:opacity-50"
                  >
                    {isSavingName ? 'Đang lưu...' : 'Lưu tên'}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingName}
                    onClick={() => {
                      setIsEditingName(false);
                      setNameDraft(profile.displayName);
                      setNameError(null);
                    }}
                    className="cursor-pointer rounded-lg border border-[#3A424C] bg-[#121418] px-2 py-1 text-xs text-[#B5A792] hover:text-[#EFE6D5]"
                  >
                    Hủy
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <p className="truncate font-serif-title text-base font-bold text-[#EFE6D5]">
                    {profile.displayName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(profile.displayName);
                      setNameError(null);
                      setIsEditingName(true);
                    }}
                    className="shrink-0 cursor-pointer rounded border border-[#A68042]/35 bg-[#121418] px-2 py-0.5 text-[11px] font-medium text-[#D4A451] transition-colors hover:border-[#D99B26]"
                  >
                    Đổi biệt danh
                  </button>
                </div>
              )}
              {nameError ? (
                <p className="mt-1 text-xs text-[#FCA5A5]">{nameError}</p>
              ) : (
                <p className="truncate text-xs text-[#9CA3AF]">{profile.email}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isUpdatingSound}
              onClick={() => {
                void handleToggleSound();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#A68042]/35 bg-[#121418] px-3 py-2 text-xs font-medium text-[#EFE6D5] transition-colors hover:border-[#D99B26] disabled:opacity-50"
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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#A68042]/35 bg-[#121418] px-3.5 py-2 text-xs font-medium text-[#EFE6D5] transition-colors hover:border-[#D99B26]"
            >
              <GameIcon name="ui:chart" size={13} className="text-[#D4A451]" />
              Thống Kê &amp; Lịch Sử
            </button>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#A68042]/35 bg-[#121418] px-3.5 py-2 text-xs font-medium text-[#FCA5A5] transition-colors hover:border-[#DC2626] disabled:opacity-50"
            >
              <GameIcon name="ui:door-open" size={13} />
              {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
            </button>
          </div>
        </div>

        {isCheckingActiveRoom ? (
          <div className="flex items-center justify-center gap-2 rounded-[8px] border border-[#94A3B8]/32 bg-[#11151D]/95 p-6 text-sm text-[#EFE6D5]">
            <GameIcon name="ui:loader" size={15} className="animate-spin text-[#E6BE6C]" />
            Đang kiểm tra phòng chơi hiện tại của tài khoản...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Cột 1: Tạo phòng mới */}
            <div className="flex flex-col justify-between rounded-[8px] border border-[#94A3B8]/32 bg-[#11151D]/95 p-6 shadow-2xl backdrop-blur-md">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#D4A451] uppercase">
                  Lập bàn đấu mới
                </p>
                <h2 className="mt-1 font-serif-title text-lg font-bold text-[#F5EBD6]">
                  Tạo phòng cho hội bạn (4–8 người)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  Chọn tốc độ đồng hồ đếm ngược cho từng lượt:
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {PRESET_CARDS.map((preset) => {
                    const active = selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`rounded-[6px] border p-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#E6BE6C] ${
                          active
                            ? 'border-[#E6BE6C] bg-[#1B212C] text-[#F5EBD6]'
                            : 'border-[#94A3B8]/25 bg-[#0B0E14] text-[#CBD5E1] hover:border-[#B89352]/70'
                        }`}
                      >
                        <div className="text-xs font-semibold">{preset.label}</div>
                        <div className="mt-0.5 font-mono-num text-[11px] text-[#94A3B8]">
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
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#D4A451]/75 bg-gradient-to-b from-[#B8332C] to-[#831C18] px-4 py-3 text-sm font-bold text-[#FDF6E9] shadow-lg transition-transform duration-150 hover:from-[#C83E37] hover:to-[#95221D] focus:outline-none focus:ring-2 focus:ring-[#E6BE6C] disabled:opacity-50"
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
              className="flex flex-col justify-between rounded-[8px] border border-[#94A3B8]/32 bg-[#11151D]/95 p-6 shadow-2xl backdrop-blur-md"
            >
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#D4A451] uppercase">
                  Gia nhập bàn có sẵn
                </p>
                <h2 className="mt-1 font-serif-title text-lg font-bold text-[#F5EBD6]">
                  Nhập mã Hổ Phù (6 ký tự)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  Nhập mã phòng bạn bè vừa chia sẻ (hoặc quay lại đúng ghế nếu vừa rớt mạng giữa ván).
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="lkdf-join-room-code"
                    className="mb-1.5 block text-xs font-medium text-[#CBD5E1]"
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
                    placeholder="K9M2P4"
                    className="w-full rounded-[6px] border border-[#B89352]/45 bg-[#0B0E14] px-3.5 py-2.5 text-center font-mono-num text-xl font-bold uppercase tracking-[0.25em] text-[#F3CD7A] placeholder-[#475569] focus:border-[#E6BE6C] focus:outline-none"
                  />
                </div>

                {joinError ? (
                  <p className="mt-3 rounded-[6px] border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-xs text-[#FCA5A5]">
                    {joinError}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isJoiningRoom}
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#B89352]/70 bg-[#161B23] px-4 py-3 text-sm font-bold text-[#F3CD7A] transition-colors hover:border-[#E6BE6C] hover:bg-[#1E2532] focus:outline-none focus:ring-2 focus:ring-[#E6BE6C] disabled:opacity-50"
              >
                <GameIcon name="ui:door-open" size={15} className="text-[#E6BE6C]" />
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
