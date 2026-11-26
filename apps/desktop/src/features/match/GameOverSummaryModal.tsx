import { HERO_CATALOG, getCuuChauHeroDisplay, getCuuChauRoleDisplay } from '@lkdf/shared';
import type { IdentityRole, PlayerViewState, RoomState, WinningFaction } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import { FactionSeal, GameIcon, type GameIconName } from '../../components/icons/index.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';

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
  { readonly icon: GameIconName }
> = {
  LORD: { icon: 'crown' },
  LOYALIST: { icon: 'bordered-shield' },
  REBEL: { icon: 'crossed-swords' },
  SPY: { icon: 'drama-masks' },
  UNKNOWN: { icon: 'spy' },
};

const FACTION_WINNER_META: Record<
  WinningFaction,
  { readonly icon: GameIconName; readonly key: string }
> = {
  LORD_LOYALIST: {
    icon: 'crown',
    key: 'gameOver.lordWin',
  },
  REBEL: {
    icon: 'crossed-swords',
    key: 'gameOver.rebelWin',
  },
  SPY: {
    icon: 'drama-masks',
    key: 'gameOver.spyWin',
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
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
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
  const mvpDisplay = getCuuChauHeroDisplay(mvpSeat?.heroId, locale);
  const mvpPortraitUrl = mvpSeat?.heroId ? getHeroPortraitUrl(mvpSeat.heroId) : null;

  const sealBadge = isViewerWinner ? (
    <span className="inline-flex items-center rounded border-2 border-[#E6BE6C] bg-gradient-to-br from-[#78350F] via-[#B45309] to-[#D97706] px-3 py-1 font-serif-title text-sm font-extrabold tracking-widest text-[#FEF3C7] shadow-[0_0_14px_rgba(230,190,108,0.45)]">
      {t('gameOver.victorySeal')}
    </span>
  ) : (
    <span className="tqs-stone-chop inline-flex items-center rounded border border-[#E6BE6C]/45 px-3 py-1 font-serif-title text-sm font-extrabold tracking-widest text-[#FFF1E6]">
      {t('gameOver.defeatSeal')}
    </span>
  );

  return (
    <GuofengModalShell
      open={open}
      onClose={onLeaveRoom}
      disableClose={true}
      ariaLabelledBy="gameover-summary-title"
      icon={winnerMeta?.icon ?? 'crown'}
      title={winnerMeta ? t(winnerMeta.key) : t('gameOver.finished')}
      subtitle={`#${roomState.roomCode}${offline ? ` · ${t('offlineSetup.title')}` : ''}`}
      headerBadge={sealBadge}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <GameIcon name="ui:door-open" size={13} />
            {offline ? t('gameOver.returnMenu') : t('common.backToMainMenu')}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onReturnToLobby}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E6BE6C]/50 bg-[#9E2B25] px-4 py-2 text-xs font-bold text-[#FFF5EC] shadow-md transition-colors hover:bg-[#B8322B] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <GameIcon name="ui:refresh" size={13} />
            {t('gameOver.playAgain')}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-[#EFE6D5]">
        {!offline ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#16A34A]/45 bg-[#0D2618] px-3 py-1 text-xs font-medium text-[#86EFAC]">
            <GameIcon name="ui:check-circle" size={13} />
            {locale === 'en' ? 'Result saved to Account Stats' : 'Đã lưu kết quả vào Thống kê tài khoản'}
          </div>
        ) : null}

        {mvpSeat ? (
          <div className="flex items-center gap-3 rounded-lg border border-[#C89B4B]/65 bg-gradient-to-r from-[#2D1F13] via-[#1B1410] to-[#140F0C] p-3 shadow-md">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E6BE6C]/70 bg-[#16110E]">
              {mvpPortraitUrl ? (
                <img
                  src={mvpPortraitUrl}
                  alt={mvpHero?.nameVi ?? mvpSeat.displayName}
                  className="h-full w-full object-cover object-[50%_18%]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#E6BE6C]">
                  <GameIcon name="crown" size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-[#C89B4B]/45 bg-[#2A1E12] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#FDE68A] uppercase">
                  <GameIcon name="crown" size={11} />
                  {locale === 'en' ? 'Match MVP' : 'Danh Tướng Xuất Sắc (MVP)'}
                </span>
                {mvpHero ? <FactionSeal faction={mvpHero.faction} size="sm" /> : null}
              </div>
              <div className="mt-1 truncate font-serif-title text-base font-bold text-[#F5EBD6]">
                {mvpSeat.displayName}
                {mvpDisplay ? ` · ${mvpDisplay.name}` : ''}
              </div>
              <div className="text-xs text-[#E8DCC8]">
                {getCuuChauRoleDisplay(mvpSeat.identity, locale).name} ·{' '}
                {mvpSeat.alive
                  ? `${mvpSeat.hp}/${mvpSeat.maxHp} HP`
                  : locale === 'en' ? 'Fallen' : 'Tử trận'}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {playerView.players.map((seat) => {
            const hero = seat.heroId
              ? HERO_CATALOG.find((item) => item.id === seat.heroId)
              : null;
            const heroDisplay = getCuuChauHeroDisplay(seat.heroId, locale);
            const portraitUrl = seat.heroId ? getHeroPortraitUrl(seat.heroId) : null;
            const isWinner = winnerSet.has(seat.userId);
            const isViewer = seat.seatIndex === playerView.viewerSeatIndex;
            return (
              <div
                key={seat.userId}
                className={[
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs',
                  isWinner
                    ? 'border-[#16A34A]/55 bg-[#122219]/85'
                    : 'border-[#806345]/45 bg-[#1B1410]/85',
                ].join(' ')}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="font-mono-num w-6 shrink-0 text-center text-[#B5A792] tabular-nums">
                    #{seat.seatIndex + 1}
                  </span>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-[#806345]/60 bg-[#140F0C]">
                    {portraitUrl ? (
                      <img
                        src={portraitUrl}
                        alt={heroDisplay?.name ?? seat.displayName}
                        className="h-full w-full object-cover object-[50%_18%]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#B5A792]">
                        <GameIcon name={IDENTITY_META[seat.identity].icon} size={14} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#F5EBD6]">
                      <span className="truncate">{seat.displayName}</span>
                      {isViewer ? (
                        <span className="rounded border border-[#C89B4B]/40 bg-[#2A1E12] px-1.5 py-0.5 text-[10px] text-[#FDE68A]">
                          {locale === 'en' ? 'You' : 'Bạn'}
                        </span>
                      ) : null}
                      {hero ? <FactionSeal faction={hero.faction} size="xs" /> : null}
                    </div>
                    <div className="text-[11px] text-[#D5C3A5]">
                      {heroDisplay ? heroDisplay.name : t('gameOver.unpicked')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded border border-[#C89B4B]/40 bg-[#140F0C] px-2 py-0.5 font-semibold text-[#FDE68A]">
                    <GameIcon name={IDENTITY_META[seat.identity].icon} size={12} />
                    {getCuuChauRoleDisplay(seat.identity, locale).name}
                  </span>
                  <span className="font-mono-num min-w-[110px] text-[#E8DCC8] tabular-nums">
                    {seat.alive ? (
                      `${seat.hp}/${seat.maxHp} HP`
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
                        <GameIcon name="death-skull" size={12} />
                        {locale === 'en' ? 'Fallen' : 'Tử trận'}
                      </span>
                    )}
                  </span>
                  <span className="min-w-[54px] text-right font-semibold">
                    {isWinner ? (
                      <span className="inline-flex items-center gap-1 text-[#86EFAC]">
                        <GameIcon name="crown" size={12} />
                        {locale === 'en' ? 'Won' : 'Thắng'}
                      </span>
                    ) : (
                      <span className="text-[#B5A792]">{locale === 'en' ? 'Lost' : 'Thua'}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GuofengModalShell>
  );
}
