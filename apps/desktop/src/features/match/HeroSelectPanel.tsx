import { useCallback, useEffect, useRef, useState } from 'react';
import { getCuuChauFactionDisplay, getCuuChauHeroDisplay, getHeroDefinition } from '@lkdf/shared';
import type { HeroFaction, HeroId, PlayerViewState } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import { isMatchSoundEnabled, playMatchCue } from '../../lib/soundFx.js';
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
  readonly faction: HeroFaction;
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
        'lkdf-hero-avatar relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border-[1.5px] bg-[#140F0C]',
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
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const draft = playerView.heroDraft;
  const panelRef = useRef<HTMLDivElement>(null);
  const cardButtonRefs = useRef<Partial<Record<HeroId, HTMLButtonElement | null>>>({});
  const candidates = draft?.myCandidates ?? [];
  const candidatesKey = candidates.join(',');
  const [selectedCandidateId, setSelectedCandidateId] = useState<HeroId | null>(
    () => candidates[0] ?? null,
  );

  useEffect(() => {
    setSelectedCandidateId(candidates[0] ?? null);
  }, [candidatesKey, playerView.matchId]);

  const isLord = draft ? playerView.viewerSeatIndex === draft.lordSeatIndex : false;
  const waitingForLord = Boolean(draft && draft.stage === 'LORD_SELECTING' && !isLord);
  const alreadyPicked = Boolean(draft && draft.mySelectedHero !== null);
  const isCandidatePickerActive = Boolean(
    draft && !waitingForLord && !alreadyPicked && candidates.length > 0,
  );
  const effectiveSelectedId: HeroId | null =
    selectedCandidateId && candidates.includes(selectedCandidateId)
      ? selectedCandidateId
      : (candidates[0] ?? null);
  const selectedHeroDef = effectiveSelectedId
    ? getHeroDefinition(effectiveSelectedId)
    : null;

  const handleConfirmHero = useCallback(() => {
    if (!isCandidatePickerActive || !effectiveSelectedId) {
      return;
    }
    playMatchCue('HERO_LOCK', isMatchSoundEnabled());
    onSelectHero(effectiveSelectedId);
  }, [effectiveSelectedId, isCandidatePickerActive, onSelectHero]);

  useEffect(() => {
    if (!isCandidatePickerActive) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('dialog'))
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const currentIndex = effectiveSelectedId
          ? candidates.indexOf(effectiveSelectedId)
          : 0;
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const delta = event.key === 'ArrowLeft' ? -1 : 1;
        const nextIndex = (safeIndex + delta + candidates.length) % candidates.length;
        const nextHeroId = candidates[nextIndex];
        if (nextHeroId) {
          setSelectedCandidateId(nextHeroId);
          if (panelRef.current?.contains(document.activeElement)) {
            cardButtonRefs.current[nextHeroId]?.focus();
          }
        }
        return;
      }

      if (event.key >= '1' && event.key <= '5') {
        const index = Number(event.key) - 1;
        const nextHeroId = candidates[index];
        if (nextHeroId) {
          event.preventDefault();
          setSelectedCandidateId(nextHeroId);
          if (panelRef.current?.contains(document.activeElement)) {
            cardButtonRefs.current[nextHeroId]?.focus();
          }
        }
        return;
      }

      if (event.key === 'Enter') {
        if (
          target instanceof HTMLButtonElement &&
          panelRef.current &&
          !panelRef.current.contains(target)
        ) {
          return;
        }
        event.preventDefault();
        handleConfirmHero();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [candidates, effectiveSelectedId, handleConfirmHero, isCandidatePickerActive]);

  if (!draft) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-[#806345]/55 bg-[#16110E]/95 p-6 text-center shadow-2xl">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#F5EBD6]">
          <GameIcon name="ui:loader" size={16} className="animate-spin text-[#D99B26]" />
          {locale === 'en' ? 'Preparing warrior draft...' : 'Đang khởi tạo danh sách chọn Hiệp Khách...'}
        </p>
      </div>
    );
  }

  const lordName = getPlayerSeatLabel(playerView.players, draft.lordSeatIndex);
  const pickedHeroDef = draft.mySelectedHero
    ? getHeroDefinition(draft.mySelectedHero)
    : null;
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const cloudBorderUrl = getUiAssetUrl('tex-cloud-border');
  const mountainDecoUrl = getUiAssetUrl('tex-mountain-deco');

  const pickedHeroDisplay = getCuuChauHeroDisplay(pickedHeroDef?.id, locale);
  const selectedHeroDisplay = getCuuChauHeroDisplay(selectedHeroDef?.id, locale);
  return (
    <div
      ref={panelRef}
      data-candidate-count={candidates.length}
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
      className="lkdf-hero-select-panel relative flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-[#C89B4B]/50 bg-[#140F0C]/96 p-3 shadow-2xl"
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
      <div className="lkdf-hero-select-header relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#A68042]/35 pb-2">
        <div className="min-w-0">
          <h2 className="font-serif-title flex items-center gap-2 text-[15px] font-bold text-[#F5EBD6] sm:text-[16px]">
            <GameIcon
              name={alreadyPicked ? 'ui:check-circle' : isLord ? 'crown' : 'drama-masks'}
              size={17}
              className={alreadyPicked ? 'text-[#86EFAC]' : 'text-[#D99B26]'}
            />
            <span>
              {waitingForLord
                ? t('heroSelect.waitingLord', { name: lordName })
                : alreadyPicked && pickedHeroDisplay
                  ? `${t('heroSelect.lockedHero', { name: pickedHeroDisplay.name, faction: pickedHeroDisplay.factionLabel })}`
                  : isLord
                    ? t('heroSelect.lordPickTitle')
                    : t('heroSelect.pickTitle')}
            </span>
          </h2>
          <p className="mt-0.5 text-[11.5px] text-[#C7B69B]">
            {locale === 'en' ? 'Ready' : 'Tiến độ sẵn sàng'}: {draft.readySeats.length}/{playerView.players.length}
            {isLord ? t('heroSelect.lordBonus') : ''}
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
                    : 'border-[#806345]/75 bg-[#1D1510] text-[#F5EBD6]',
              ].join(' ')}
            >
              <GameIcon name={isTimerPaused ? 'ui:pause' : 'ui:clock'} size={13} />
              {remainingSeconds}s
            </span>
          ) : null}
        </div>
      </div>

      {/* Thanh tiến độ ghế */}
      <div className="lkdf-hero-ready-strip relative z-10 flex shrink-0 flex-wrap gap-1.5">
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
                  : 'border-[#806345]/55 bg-[#1A130F] text-[#C7B69B]',
              ].join(' ')}
            >
              {isLordSeat ? <GameIcon name="crown" size={11} className="text-[#D99B26]" /> : null}
              <span>{p.displayName}</span>
              {isReady ? <GameIcon name="ui:check" size={11} /> : <span>…</span>}
            </span>
          );
        })}
      </div>

      {/* Danh sách Hiệp Khách ứng viên */}
      <div className="lkdf-hero-select-scroll lkdf-scroll relative z-10 min-h-0 flex-1 overflow-y-auto pr-1">
        {waitingForLord ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-[#806345]/60 bg-[#1B1410]/75 p-4 text-center">
            <p className="text-[14px] font-semibold text-[#F5EBD6]">
              {t('heroSelect.waitingLord', { name: lordName })}
            </p>
            <p className="mt-1 text-[13px] text-[#C7B69B]">
              {locale === 'en' ? 'Once the Sovereign picks, you will choose from 3 warriors.' : 'Sau khi Minh Chủ chọn xong, bạn sẽ nhận 3 Hiệp Khách để lựa chọn.'}
            </p>
          </div>
        ) : alreadyPicked && pickedHeroDisplay ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-[#16A34A]/40 bg-[#16A34A]/10 p-4 text-center">
            <p className="font-serif-title text-[18px] font-bold text-[#F5EBD6]">
              {t('heroSelect.lockedHero', { name: pickedHeroDisplay.name, faction: pickedHeroDisplay.factionLabel })}
            </p>
            <p className="mt-1 text-[13px] text-[#EDE3D2]">
              {locale === 'en' ? 'Waiting for the remaining seats to lock in.' : 'Vui lòng chờ các ghế còn lại hoàn tất chọn Hiệp Khách.'}
            </p>
          </div>
        ) : (
          <div
            className={[
              'lkdf-hero-select-grid grid gap-2',
              candidates.length > 3 ? 'grid-cols-5' : 'grid-cols-3',
            ].join(' ')}
          >
            {candidates.map((heroId, index) => {
              const hero = getHeroDefinition(heroId);
              const heroDisplay = getCuuChauHeroDisplay(hero.id, locale);
              const factionStyle = getFactionStyle(hero.faction);
              const maxHp = isLord ? hero.baseMaxHp + 1 : hero.baseMaxHp;
              const portraitUrl = getHeroPortraitUrl(hero.id);
              const isSelected = hero.id === effectiveSelectedId;

              return (
                <button
                  key={hero.id}
                  ref={(node) => {
                    cardButtonRefs.current[hero.id] = node;
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  data-hero-candidate={hero.id}
                  data-selected-candidate={isSelected ? 'true' : undefined}
                  onClick={() => setSelectedCandidateId(hero.id)}
                  className={[
                    'lkdf-hero-candidate-card relative flex min-w-0 cursor-pointer flex-col justify-between gap-2 overflow-hidden rounded-[6px] text-left shadow-lg transition-[border-color,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BE6C]',
                    candidates.length > 3 ? 'p-2' : 'p-2.5',
                    isSelected
                      ? 'border-2 border-[#E6BE6C] bg-[#241A13] ring-2 ring-[#E6BE6C]/70 shadow-[0_0_20px_rgba(230,190,108,0.34)]'
                      : 'border border-[#806345]/55 bg-[#18120E] hover:border-[#E6BE6C]/80',
                  ].join(' ')}
                >
                  <HeroCardWatermark portraitUrl={portraitUrl} widthClass="w-[62%]" opacityClass="opacity-60" />
                  <div className="relative z-10 w-full">
                    <div
                      className={
                        candidates.length > 3
                          ? 'flex items-center gap-2'
                          : 'flex items-start justify-between gap-2'
                      }
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <HeroCandidateAvatar
                          heroId={hero.id}
                          nameVi={heroDisplay?.name ?? hero.nameVi}
                          faction={hero.faction}
                          borderClass={factionStyle.borderClass}
                        />
                        <div className="min-w-0 flex-1">
                          <h3
                            className={[
                              'font-serif-title truncate font-bold',
                              candidates.length > 3
                                ? 'text-[13.5px] leading-tight sm:text-[14px]'
                                : 'text-[14.5px] sm:text-[15px]',
                              factionStyle.nameTextClass,
                            ].join(' ')}
                          >
                            {heroDisplay?.name ?? hero.nameVi}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span
                              className={[
                                'inline-block whitespace-nowrap rounded border px-1.5 py-0 text-[9.5px] font-bold',
                                factionStyle.badgeClass,
                              ].join(' ')}
                            >
                              {heroDisplay?.factionLabel ?? factionStyle.labelVi}
                            </span>
                            {candidates.length > 3 ? (
                              <span className="font-mono-num whitespace-nowrap text-[11px] font-bold text-[#FCA5A5]">
                                {maxHp} HP
                                {isLord ? <span className="ml-0.5 text-[9.5px] text-[#D99B26]">(+1)</span> : null}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {candidates.length <= 3 ? (
                        <div className="shrink-0 text-right">
                          <span className="font-mono-num text-[12.5px] font-bold text-[#FCA5A5] sm:text-[13px]">
                            {maxHp} HP
                          </span>
                          {isLord ? (
                            <div className="text-[10px] font-semibold text-[#D99B26]">
                              {t('heroSelect.lordHpBadge')}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="lkdf-hero-candidate-skills mt-2 space-y-1.5">
                      {(heroDisplay?.skills ?? hero.skills.map(s => ({ id: s.id, name: s.nameVi, description: s.descriptionVi, isLordSkill: s.isLordSkill }))).map((skill) => (
                        <div
                          key={skill.id}
                          className="lkdf-hero-candidate-skill rounded border border-[#806345]/35 bg-[#120D0A]/86 p-1.5 text-[11px] leading-snug sm:p-2"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[#FDE68A]">
                            <span>{skill.name}</span>
                            {skill.isLordSkill ? (
                              <span className="rounded bg-[#D99B26]/20 px-1 py-0 text-[10px] text-[#FBBF24]">
                                {t('heroSelect.lordBadge')}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[#E8DCC8]">{skill.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lkdf-hero-candidate-card-footer relative z-10 flex w-full items-center justify-between gap-1 border-t border-[#806345]/30 pt-1.5 text-[10.5px]">
                    <span className="font-mono-num rounded border border-[#806345]/65 bg-[#120D0A]/85 px-1.5 py-0.5 font-bold text-[#E8DCC8]">
                      #{index + 1}
                    </span>
                    <span
                      className={
                        isSelected
                          ? 'inline-flex items-center gap-1 font-bold text-[#FDE68A]'
                          : 'font-medium text-[#C7B69B]'
                      }
                    >
                      {isSelected ? (
                        <>
                          <GameIcon name="ui:check" size={11} />
                          {locale === 'en' ? 'Selected' : 'Đang chọn'}
                        </>
                      ) : (
                        locale === 'en' ? 'Inspect' : 'Bấm để xem'
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Thanh chốt Hiệp Khách cố định đáy để luôn nhìn thấy ở 960×600 */}
      {isCandidatePickerActive && selectedHeroDef ? (
        <div className="lkdf-hero-select-footer relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#A68042]/35 pt-2">
          <div className="min-w-0 text-[11.5px] text-[#EDE3D2]">
            <span className="font-semibold text-[#FDE68A]">{selectedHeroDisplay?.name ?? selectedHeroDef.nameVi}</span>
            <span className="mx-1.5 text-[#806345]">·</span>
            <span className="text-[#C7B69B]">
              ←/→ · 1–{candidates.length} · Enter
            </span>
          </div>
          <button
            type="button"
            data-primary-action="true"
            onClick={handleConfirmHero}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#FDE68A]/50 bg-[#C83E37] px-4 py-1.5 text-[13px] font-bold text-[#FFF8EB] shadow-lg transition-colors hover:bg-[#B2342E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BE6C]"
          >
            <GameIcon name="crown" size={14} />
            {locale === 'en' ? 'Confirm' : 'Chốt'} {selectedHeroDisplay?.name ?? selectedHeroDef.nameVi}
          </button>
        </div>
      ) : null}
    </div>
  );
}
