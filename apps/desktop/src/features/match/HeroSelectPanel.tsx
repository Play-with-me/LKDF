import { useEffect, useState } from 'react';
import { getHeroDefinition } from '@lkdf/shared';
import type { HeroId, PlayerViewState } from '@lkdf/shared';
import { getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import { FactionSeal, GameIcon } from '../../components/icons/index.js';
import { HeroCardWatermark } from './HeroCardWatermark.js';
import { getFactionStyle, getPlayerSeatLabel } from './matchTypes.js';

export interface HeroSelectPanelProps {
  readonly playerView: PlayerViewState;
  readonly remainingSeconds: number | null;
  readonly isTimerPaused: boolean;
  readonly onSelectHero: (heroId: HeroId) => void;
}

function HeroCandidateAvatar({
  heroId,
  nameVi,
  faction,
  borderClass,
}: {
  readonly heroId: HeroId;
  readonly nameVi: string;
  readonly faction: 'SHU' | 'WEI' | 'WU' | 'QUN';
  readonly borderClass: string;
}) {
  const portraitUrl = getHeroPortraitUrl(heroId);
  const [failed, setFailed] = useState<boolean>(false);
  useEffect(() => {
    setFailed(false);
  }, [portraitUrl]);

  return (
    <div
      className={[
        'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border-[1.5px] bg-[#14171A]',
        borderClass,
      ].join(' ')}
    >
      {portraitUrl && !failed ? (
        <img
          src={portraitUrl}
          alt={nameVi}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-[50%_18%]"
        />
      ) : (
        <FactionSeal faction={faction} size="md" />
      )}
    </div>
  );
}

export function HeroSelectPanel({
  playerView,
  remainingSeconds,
  isTimerPaused,
  onSelectHero,
}: HeroSelectPanelProps) {
  const draft = playerView.heroDraft;
  if (!draft) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-[#303740] bg-[#1E2328]/95 p-6 text-center shadow-2xl">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#F3F4F6]">
          <GameIcon name="ui:loader" size={16} className="animate-spin text-[#D99B26]" />
          Đang khởi tạo danh sách chọn Tướng...
        </p>
      </div>
    );
  }

  const isLord = playerView.viewerSeatIndex === draft.lordSeatIndex;
  const lordName = getPlayerSeatLabel(playerView.players, draft.lordSeatIndex);
  const waitingForLord = draft.stage === 'LORD_SELECTING' && !isLord;
  const alreadyPicked = draft.mySelectedHero !== null;
  const pickedHeroDef = draft.mySelectedHero
    ? getHeroDefinition(draft.mySelectedHero)
    : null;
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const cloudBorderUrl = getUiAssetUrl('tex-cloud-border');
  const mountainDecoUrl = getUiAssetUrl('tex-mountain-deco');

  return (
    <div
      style={
        cloudBorderUrl
          ? {
              backgroundImage: `linear-gradient(rgba(19,15,12,0.88), rgba(14,11,9,0.94))${inkBaseUrl ? `, url(${inkBaseUrl})` : ''}`,
              backgroundSize: '340px auto',
              borderStyle: 'solid',
              borderWidth: '10px 16px',
              borderColor: 'transparent',
              borderImage: `url(${cloudBorderUrl}) 16 26 stretch`,
            }
          : undefined
      }
      className="relative flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#D99B26]/40 bg-[#14110E]/96 p-4 shadow-2xl"
    >
      {mountainDecoUrl ? (
        <img
          src={mountainDecoUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 z-0 w-48 opacity-20"
        />
      ) : null}
      {/* Đầu bảng chọn tướng */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#A68042]/35 pb-2.5">
        <div className="min-w-0">
          <h2 className="font-serif-title flex items-center gap-2 text-[16px] font-bold text-[#F3F4F6]">
            <GameIcon
              name={alreadyPicked ? 'ui:check-circle' : isLord ? 'crown' : 'drama-masks'}
              size={17}
              className={alreadyPicked ? 'text-[#86EFAC]' : 'text-[#D99B26]'}
            />
            <span>
              {waitingForLord
                ? `Đang chờ Chủ Công ${lordName} chọn Tướng (1/5)...`
                : alreadyPicked && pickedHeroDef
                  ? `Bạn đã chọn ${pickedHeroDef.nameVi} — Đang chờ người chơi khác`
                  : isLord
                    ? 'Bạn là Chủ Công — Chọn 1 trong 5 Tướng'
                    : 'Chọn 1 trong 3 Tướng của bạn'}
            </span>
          </h2>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
            Tiến độ sẵn sàng: {draft.readySeats.length}/{playerView.players.length} ghế
            {isLord ? ' · Chủ Công được cộng +1 máu tối đa' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {remainingSeconds !== null ? (
            <span
              className={[
                'font-mono-num inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-bold',
                isTimerPaused
                  ? 'border-[#D97706]/50 bg-[#D97706]/15 text-[#FBBF24]'
                  : remainingSeconds <= 5
                    ? 'border-[#DC2626]/60 bg-[#DC2626]/20 text-[#FCA5A5]'
                    : 'border-[#3A424C] bg-[#14171A] text-[#F3F4F6]',
              ].join(' ')}
            >
              <GameIcon name={isTimerPaused ? 'ui:pause' : 'ui:clock'} size={13} />
              {remainingSeconds}s
            </span>
          ) : null}
        </div>
      </div>

      {/* Thanh tiến độ ghế */}
      <div className="flex flex-wrap gap-1.5">
        {playerView.players.map((p) => {
          const isReady = draft.readySeats.includes(p.seatIndex);
          const isLordSeat = p.seatIndex === draft.lordSeatIndex;
          return (
            <span
              key={p.seatIndex}
              className={[
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold',
                isReady
                  ? 'border-[#16A34A]/50 bg-[#16A34A]/15 text-[#86EFAC]'
                  : 'border-[#3A424C] bg-[#14171A] text-[#9CA3AF]',
              ].join(' ')}
            >
              {isLordSeat ? <GameIcon name="crown" size={11} className="text-[#D99B26]" /> : null}
              <span>{p.displayName}</span>
              {isReady ? <GameIcon name="ui:check" size={11} /> : <span>…</span>}
            </span>
          );
        })}
      </div>

      {/* Danh sách tướng ứng viên */}
      <div className="lkdf-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {waitingForLord ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-[#3A424C] bg-[#14171A]/70 p-4 text-center">
            <p className="text-[14px] font-semibold text-[#F3F4F6]">
              Chủ Công {lordName} đang suy nghĩ chọn Tướng đầu tiên...
            </p>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">
              Sau khi Chủ Công chọn xong, bạn sẽ nhận được 3 Tướng để lựa chọn.
            </p>
          </div>
        ) : alreadyPicked && pickedHeroDef ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-[#16A34A]/40 bg-[#16A34A]/10 p-4 text-center">
            <p className="font-serif-title text-[18px] font-bold text-[#F3F4F6]">
              Đã khóa Tướng: {pickedHeroDef.nameVi} ({pickedHeroDef.factionLabelVi})
            </p>
            <p className="mt-1 text-[13px] text-[#D1D5DB]">
              Vui lòng chờ các ghế còn lại hoàn tất chọn Tướng để vào ván đấu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {draft.myCandidates.map((heroId) => {
              const hero = getHeroDefinition(heroId);
              const factionStyle = getFactionStyle(hero.faction);
              const maxHp = isLord ? hero.baseMaxHp + 1 : hero.baseMaxHp;
              const portraitUrl = getHeroPortraitUrl(hero.id);

              return (
                <div
                  key={hero.id}
                  className="relative flex flex-col justify-between gap-2.5 overflow-hidden rounded-lg border border-[#3A424C] bg-[#181B20] p-3 transition-colors hover:border-[#D99B26]/80"
                >
                  <HeroCardWatermark portraitUrl={portraitUrl} opacityClass="opacity-16" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <HeroCandidateAvatar
                          heroId={hero.id}
                          nameVi={hero.nameVi}
                          faction={hero.faction}
                          borderClass={factionStyle.borderClass}
                        />
                        <div className="min-w-0">
                          <h3
                            className={[
                              'font-serif-title truncate text-[15px] font-bold',
                              factionStyle.nameTextClass,
                            ].join(' ')}
                          >
                            {hero.nameVi}
                          </h3>
                          <span
                            className={[
                              'mt-0.5 inline-block rounded border px-1.5 py-0 text-[10px] font-bold',
                              factionStyle.badgeClass,
                            ].join(' ')}
                          >
                            Phe {factionStyle.labelVi}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono-num text-[13px] font-bold text-[#FCA5A5]">
                          {maxHp} máu
                        </span>
                        {isLord ? (
                          <div className="text-[10px] font-semibold text-[#D99B26]">
                            +1 Chủ Công
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {hero.skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="rounded border border-[#2D333B] bg-[#14171A]/85 p-2 text-[11px] leading-snug"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[#FDE68A]">
                            <span>{skill.nameVi}</span>
                            {skill.isLordSkill ? (
                              <span className="rounded bg-[#D99B26]/20 px-1 py-0 text-[10px] text-[#FBBF24]">
                                Chủ Công
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[#D1D5DB]">{skill.descriptionVi}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectHero(hero.id)}
                    className="relative z-10 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#C83E37] px-3 py-2 text-[12px] font-bold text-[#F4EFE6] transition-colors hover:bg-[#B2342E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B26]"
                  >
                    <GameIcon name="crown" size={13} />
                    Chọn tướng {hero.nameVi}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
