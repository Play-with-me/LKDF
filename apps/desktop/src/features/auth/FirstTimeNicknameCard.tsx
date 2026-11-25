import { useEffect, useState } from 'react';
import { GameIcon } from '../../components/icons/index.js';
import type { LkdfApiClient } from '../../lib/api.js';
import type { DesktopUpdateState, UserProfile } from '../../lib/types.js';
import { GuofengPortalStage } from './GuofengPortalStage.js';

export interface FirstTimeNicknameCardProps {
  readonly api: LkdfApiClient;
  readonly sessionToken: string | null;
  readonly profile: UserProfile;
  readonly serverConnected: boolean;
  readonly appVersion: string;
  readonly updateState: DesktopUpdateState;
  readonly onOpenUpdateModal: () => void;
  readonly onCheckUpdate: () => void;
  readonly onPlayOffline?: () => void;
  readonly isPreviewMode?: boolean;
  readonly onComplete: (updatedProfile: UserProfile) => void;
}

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

export function FirstTimeNicknameCard({
  api,
  sessionToken,
  profile,
  serverConnected,
  appVersion,
  updateState,
  onOpenUpdateModal,
  onCheckUpdate,
  onPlayOffline,
  isPreviewMode = false,
  onComplete,
}: FirstTimeNicknameCardProps) {
  const initialDraft = profile.displayName.trim().slice(0, 20);
  const [nickname, setNickname] = useState<string>(initialDraft);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatarUrl]);

  const trimmed = nickname.trim();
  const isLengthValid = trimmed.length >= 2 && trimmed.length <= 20;

  async function handleSaveNickname(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!isLengthValid) {
      setErrorMsg('Biệt danh cần từ 2 đến 20 ký tự để hiển thị rõ trên bàn tròn.');
      return;
    }

    if (isPreviewMode || !sessionToken) {
      onComplete({ ...profile, displayName: trimmed });
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);
    try {
      const updated = await api.updateDisplayName(sessionToken, trimmed);
      onComplete(updated);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể lưu biệt danh lúc này. Vui lòng thử lại.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GuofengPortalStage
      serverConnected={serverConnected}
      appVersion={appVersion}
      updateState={updateState}
      onOpenUpdateModal={onOpenUpdateModal}
      onCheckUpdate={onCheckUpdate}
      onPlayOffline={onPlayOffline}
    >
      <div className="mx-auto max-w-[360px]">
        <div className="mb-2.5 text-center">
          <div className="text-[11px] font-bold tracking-[0.14em] text-[#D4A451] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {isPreviewMode
              ? 'Hồ sơ mới · Chế độ xem thử'
              : 'Hồ sơ mới · Lần đầu vào sảnh'}
          </div>
          <h2 className="mt-1 font-serif-title text-[19px] font-bold text-[#F5ECDC] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Đặt Biệt Danh Tướng Quân
          </h2>
        </div>

        {/* Thẻ tài khoản Google vừa xác thực gọn trên 1 dòng */}
        <div className="mb-3 flex items-center justify-center gap-2.5 text-xs text-[#CBD5E1]">
          {profile.avatarUrl && !avatarFailed ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              onError={() => setAvatarFailed(true)}
              className="h-7 w-7 shrink-0 rounded-full border border-[#D4A451]/65 object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D4A451]/65 bg-gradient-to-b from-[#B8332C] to-[#7D1A16] font-serif-title text-[11px] font-bold text-[#F8EFDF]">
              {getInitials(profile.displayName)}
            </span>
          )}
          <span className="truncate font-medium text-[#F5ECDC]">{profile.email}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#86EFAC]">
            <GameIcon name="ui:check-circle" size={11} />
            Đã liên kết
          </span>
        </div>

        <form
          onSubmit={(e) => {
            void handleSaveNickname(e);
          }}
          className="space-y-3"
        >
          <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
              <label
                htmlFor="lkdf-first-nickname-input"
                className="font-medium text-[#CBD5E1]"
              >
                Biệt danh bàn đấu (2–20 ký tự)
              </label>
              <span
                className={`font-mono-num tabular-nums ${
                  isLengthValid ? 'text-[#D4A451]' : 'text-[#FCA5A5]'
                }`}
              >
                {trimmed.length}/20
              </span>
            </div>

            <input
              id="lkdf-first-nickname-input"
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="VD: Mạnh Đức, Khổng Minh..."
              className="w-full rounded-[4px] border border-[#C89B4B]/55 bg-[#140F0C]/92 px-3 py-2.5 text-center text-sm font-semibold text-[#F5EBD6] placeholder-[#A8947A] transition-colors focus:border-[#F2CF84] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            />
          </div>

          {errorMsg ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[4px] border border-[#DC2626]/55 bg-[#190B0C]/88 px-3 py-2 text-xs text-[#FCA5A5]"
            >
              <GameIcon name="ui:alert" size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_1.35fr] items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onComplete(profile)}
              className="lkdf-bronze-pill cursor-pointer rounded-[4px] px-3 py-2.5 text-xs font-semibold text-[#EFE6D5] focus-visible:outline-2 focus-visible:outline-[#E6BE6C] disabled:opacity-50"
            >
              Giữ tên Google
            </button>

            <button
              type="submit"
              disabled={isSaving || !isLengthValid}
              className="tqs-talisman-btn inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-[#F2CF84]/78 px-4 py-2.5 text-[13px] font-bold text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2CF84] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GameIcon
                name={isSaving ? 'ui:loader' : 'ui:check'}
                size={13}
                className={isSaving ? 'animate-spin' : ''}
              />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu & Vào Sảnh'}</span>
            </button>
          </div>
        </form>
      </div>
    </GuofengPortalStage>
  );
}
