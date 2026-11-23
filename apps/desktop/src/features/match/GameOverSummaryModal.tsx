import { HERO_CATALOG } from '@lkdf/shared';
import type { IdentityRole, PlayerViewState, RoomState, WinningFaction } from '@lkdf/shared';
import { useEffect, useRef } from 'react';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import { FactionSeal, GameIcon, type GameIconName } from '../../components/icons/index.js';

export interface GameOverSummaryModalProps {
  readonly open: boolean;
  readonly roomState: RoomState;
  readonly playerView: PlayerViewState;
  readonly onReturnToLobby: () => void;
  readonly onLeaveRoom: () => void;
  readonly offline?: boolean;
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
  offline = false,
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
  const viewerSeat = playerView.players.find(
    (p) => p.seatIndex === playerView.viewerSeatIndex,
  );
  const isViewerWinner = viewerSeat ? winnerSet.has(viewerSeat.userId) : false;

  const winningPlayers = playerView.players.filter((p) => winnerSet.has(p.userId));
  const mvpSeat =
    [...winningPlayers]
      .filter((p) => p.alive)
      .sort((a, b) => b.hp - a.hp)[0] ??
    winningPlayers[0] ??
    null;
  const mvpHero = mvpSeat?.heroId
    ? HERO_CATALOG.find((item) => item.id === mvpSeat.heroId) ?? null
    : null;
  const mvpPortraitUrl = mvpSeat?.heroId ? getHeroPortraitUrl(mvpSeat.heroId) : null;

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
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="gameover-summary-title"
              className="flex items-center gap-2 font-serif-title text-2xl font-bold text-[#F3F4F6]"
            >
              {winnerMeta ? (
                <GameIcon name={winnerMeta.icon} size={22} className="text-[#D99B26]" />
              ) : null}
              <span>{winnerMeta ? winnerMeta.label : 'Ván đấu đã kết thúc'}</span>
            </h2>
            {isViewerWinner ? (
              <span className="inline-flex items-center rounded border-2 border-[#E6BE6C] bg-gradient-to-br from-[#78350F] via-[#B45309] to-[#D97706] px-3 py-1 font-serif-title text-sm font-extrabold tracking-widest text-[#FEF3C7] shadow-[0_0_14px_rgba(230,190,108,0.45)]">
                ĐẠI THẮNG
              </span>
            ) : (
              <span className="tqs-stone-chop inline-flex items-center rounded px-3 py-1 font-serif-title text-sm font-extrabold tracking-widest">
                CHIẾN BẠI
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {mvpSeat ? (
            <div className="flex items-center gap-3 rounded-lg border border-[#D99B26]/55 bg-gradient-to-r from-[#2A2016] via-[#1E2328] to-[#191E23] p-3 shadow-md">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E6BE6C]/70 bg-[#14171A]">
                {mvpPortraitUrl ? (
                  <img
                    src={mvpPortraitUrl}
                    alt={mvpHero?.nameVi ?? mvpSeat.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#D99B26]">
                    <GameIcon name="crown" size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FDE68A]">
                    <GameIcon name="crown" size={11} />
                    Danh Tướng Xuất Sắc (MVP)
                  </span>
                  {mvpHero ? <FactionSeal faction={mvpHero.faction} size="sm" /> : null}
                </div>
                <div className="mt-1 truncate font-serif-title text-base font-bold text-[#F3F4F6]">
                  {mvpSeat.displayName}
                  {mvpHero ? ` · ${mvpHero.nameVi}` : ''}
                </div>
                <div className="text-xs text-[#D1D5DB]">
                  {IDENTITY_META[mvpSeat.identity].label} ·{' '}
                  {mvpSeat.alive
                    ? `Sống sót (${mvpSeat.hp}/${mvpSeat.maxHp} máu)`
                    : 'Đã tử trận'}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {playerView.players.map((seat) => {
              const hero = seat.heroId
                ? HERO_CATALOG.find((item) => item.id === seat.heroId)
                : null;
              const portraitUrl = seat.heroId ? getHeroPortraitUrl(seat.heroId) : null;
              const isWinner = winnerSet.has(seat.userId);
              const isViewer = seat.seatIndex === playerView.viewerSeatIndex;
              return (
                <div
                  key={seat.userId}
                  className={[
                    'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs',
                    isWinner
                      ? 'border-[#16A34A]/50 bg-[#16A34A]/10'
                      : 'border-[#2D343C] bg-[#191E23]',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="font-mono-num w-6 shrink-0 text-center text-[#9CA3AF]">
                      #{seat.seatIndex + 1}
                    </span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-[#3A424C] bg-[#14171A]">
                      {portraitUrl ? (
                        <img
                          src={portraitUrl}
                          alt={hero?.nameVi ?? seat.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#6B7280]">
                          <GameIcon name={IDENTITY_META[seat.identity].icon} size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#F3F4F6]">
                        <span className="truncate">{seat.displayName}</span>
                        {isViewer ? (
                          <span className="rounded bg-[#D99B26]/20 px-1.5 py-0.5 text-[10px] text-[#FDE68A]">
                            Bạn
                          </span>
                        ) : null}
                        {hero ? <FactionSeal faction={hero.faction} size="xs" /> : null}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        {hero ? hero.nameVi : 'Chưa chọn'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded border border-[#D99B26]/35 bg-[#14171A] px-2 py-0.5 font-semibold text-[#FDE68A]">
                      <GameIcon name={IDENTITY_META[seat.identity].icon} size={12} />
                      {IDENTITY_META[seat.identity].label}
                    </span>
                    <span className="min-w-[110px] text-[#D1D5DB]">
                      {seat.alive ? (
                        `Còn sống (${seat.hp}/${seat.maxHp})`
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
                          <GameIcon name="death-skull" size={12} />
                          Đã tử trận
                        </span>
                      )}
                    </span>
                    <span className="min-w-[54px] text-right font-semibold">
                      {isWinner ? (
                        <span className="inline-flex items-center gap-1 text-[#86EFAC]">
                          <GameIcon name="crown" size={12} />
                          Thắng
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">Thua</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#2D343C] bg-[#14171A] px-6 py-4">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3A424C] bg-[#1E2328] px-4 py-2 text-xs font-semibold text-[#D1D5DB] hover:border-[#D99B26]"
          >
            <GameIcon name="ui:door-open" size={13} />
            {offline ? 'Về menu' : 'Rời phòng về Sảnh chính'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onReturnToLobby}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C83E37] px-4 py-2 text-xs font-bold text-[#F3F4F6] hover:bg-[#D84B43] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
          >
            <GameIcon name="ui:refresh" size={13} />
            {offline ? 'Chơi lại' : 'Quay về phòng chờ chơi ván mới'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
