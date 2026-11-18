import { HERO_CATALOG } from '@lkdf/shared';
import type { IdentityRole, PlayerViewState, RoomState, WinningFaction } from '@lkdf/shared';
import { useEffect, useRef } from 'react';
import { GameIcon, type GameIconName } from '../../components/icons/index.js';

export interface GameOverSummaryModalProps {
  readonly open: boolean;
  readonly roomState: RoomState;
  readonly playerView: PlayerViewState;
  readonly onReturnToLobby: () => void;
  readonly onLeaveRoom: () => void;
}

const IDENTITY_META: Record<
  IdentityRole | 'UNKNOWN',
  { readonly icon: GameIconName; readonly label: string }
> = {
  LORD: { icon: 'crown', label: 'Chủ Công' },
  LOYALIST: { icon: 'bordered-shield', label: 'Trung Thần' },
  REBEL: { icon: 'crossed-swords', label: 'Phản Tặc' },
  SPY: { icon: 'drama-masks', label: 'Nội Gián' },
  UNKNOWN: { icon: 'spy', label: 'Chưa lộ' },
};

const FACTION_WINNER_META: Record<
  WinningFaction,
  { readonly icon: GameIconName; readonly label: string }
> = {
  LORD_LOYALIST: {
    icon: 'crown',
    label: 'Phe Chủ Công & Trung Thần chiến thắng!',
  },
  REBEL: {
    icon: 'crossed-swords',
    label: 'Phe Phản Tặc chiến thắng!',
  },
  SPY: {
    icon: 'drama-masks',
    label: 'Nội Gián chiến thắng!',
  },
};

export function GameOverSummaryModal({
  open,
  roomState,
  playerView,
  onReturnToLobby,
  onLeaveRoom,
}: GameOverSummaryModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const winnerMeta = playerView.winningFaction
    ? FACTION_WINNER_META[playerView.winningFaction]
    : null;
  const winnerSet = new Set(playerView.winnerUserIds);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="gameover-summary-title"
      onCancel={(event) => {
        event.preventDefault();
      }}
      className="m-auto w-full max-w-3xl rounded-xl border border-[#D99B26]/60 bg-[#1E2328] p-0 text-[#F3F4F6] shadow-2xl backdrop:bg-black/80"
    >
      <div className="flex max-h-[88vh] flex-col">
        <div className="border-b border-[#2D343C] bg-[#14171A] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full border border-[#D99B26]/50 bg-[#D99B26]/15 px-3 py-1 text-xs font-semibold text-[#FDE68A]">
              Tổng kết ván đấu · Phòng #{roomState.roomCode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16A34A]/40 bg-[#16A34A]/15 px-3 py-1 text-xs font-medium text-[#86EFAC]">
              <GameIcon name="ui:check-circle" size={13} />
              Đã lưu kết quả vào Thống kê tài khoản
            </span>
          </div>
          <h2
            id="gameover-summary-title"
            className="mt-2.5 flex items-center gap-2 font-serif-title text-2xl font-bold text-[#F3F4F6]"
          >
            {winnerMeta ? (
              <GameIcon name={winnerMeta.icon} size={22} className="text-[#D99B26]" />
            ) : null}
            <span>{winnerMeta ? winnerMeta.label : 'Ván đấu đã kết thúc'}</span>
          </h2>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <div className="overflow-hidden rounded-lg border border-[#2D343C]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#14171A] text-[#9CA3AF]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Ghế</th>
                  <th className="px-3 py-2.5 font-semibold">Người chơi</th>
                  <th className="px-3 py-2.5 font-semibold">Tướng</th>
                  <th className="px-3 py-2.5 font-semibold">Thân phận</th>
                  <th className="px-3 py-2.5 font-semibold">Tình trạng</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D343C] bg-[#191E23]">
                {playerView.players.map((seat) => {
                  const hero = seat.heroId
                    ? HERO_CATALOG.find((item) => item.id === seat.heroId)
                    : null;
                  const isWinner = winnerSet.has(seat.userId);
                  return (
                    <tr
                      key={seat.userId}
                      className={isWinner ? 'bg-[#16A34A]/10' : undefined}
                    >
                      <td className="px-3 py-2.5 font-mono-num text-[#9CA3AF]">
                        #{seat.seatIndex + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#F3F4F6]">
                        {seat.displayName}
                        {seat.seatIndex === playerView.viewerSeatIndex ? (
                          <span className="ml-1.5 rounded bg-[#D99B26]/20 px-1.5 py-0.5 text-[10px] text-[#FDE68A]">
                            Bạn
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-[#D1D5DB]">
                        {hero ? hero.nameVi : 'Chưa chọn'}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#FDE68A]">
                        <span className="inline-flex items-center gap-1.5">
                          <GameIcon name={IDENTITY_META[seat.identity].icon} size={13} />
                          {IDENTITY_META[seat.identity].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#D1D5DB]">
                        {seat.alive ? (
                          `Còn sống (${seat.hp}/${seat.maxHp} máu)`
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
                            <GameIcon name="death-skull" size={12} />
                            Đã tử trận
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {isWinner ? (
                          <span className="inline-flex items-center gap-1 text-[#86EFAC]">
                            <GameIcon name="crown" size={12} />
                            Thắng
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">Thua</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#2D343C] bg-[#14171A] px-6 py-4">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#1E2328] px-4 py-2 text-xs font-semibold text-[#D1D5DB] hover:border-[#D99B26]"
          >
            <GameIcon name="ui:door-open" size={13} />
            Rời phòng về Sảnh chính
          </button>
          <button
            type="button"
            autoFocus
            onClick={onReturnToLobby}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-4 py-2 text-xs font-bold text-[#F3F4F6] hover:bg-[#D84B43] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
          >
            <GameIcon name="ui:refresh" size={13} />
            Quay về phòng chờ chơi ván mới
          </button>
        </div>
      </div>
    </dialog>
  );
}
