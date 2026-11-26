import { cardHover } from './MatchHoverTooltip.js';
import { useEffect, useState } from 'react';
import {
  calculateDistance,
  formatRankLabel,
  formatSuitSymbol,
  getCuuChauCardDisplay,
  getCuuChauHeroDisplay,
  getHeroDefinition,
} from '@lkdf/shared';
import type { CardInstance, PlayerViewState, PublicPlayerView } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { getCardArtUrl, getHeroPortraitUrl } from '../../lib/assetCatalog.js';
import {
  CardBack,
  FactionSeal,
  GameIcon,
  HpJadeMeter,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { HeroCardWatermark } from './HeroCardWatermark.js';
import type { SeatHpImpact, SeatRecoilVector, SeatSkillStamp } from './useMatchMotion.js';
import {
  getIdentityBadgeClass,
  getIdentityLabelVi,
  isCardRed,
} from './matchTypes.js';

export interface SeatCardProps {
  readonly player: PublicPlayerView;
  readonly playerView: PlayerViewState;
  readonly isDisconnected?: boolean;
  readonly isActiveActor: boolean;
  readonly isCurrentTurnOwner?: boolean;
  readonly isTargetEligible: boolean;
  readonly isSelectedTarget: boolean;
  readonly isInspectedHero?: boolean;
  readonly inspectedCardSourceId?: string | null;
  readonly isDragTargetEligible?: boolean;
  readonly isDragHovered?: boolean;
  readonly dragHoverLabelVi?: string;
  readonly compact?: boolean;
  readonly hpImpact?: SeatHpImpact | null;
  readonly recoilVector?: SeatRecoilVector | null;
  readonly skillStamp?: SeatSkillStamp | null;
  readonly onSelectTarget?: (seatIndex: number) => void;
  readonly onInspectHero?: (seatIndex: number) => void;
  readonly onInspectCard?: (
    card: CardInstance,
    sourceId: string,
    sourceLabel: string,
  ) => void;
}

const PASSIVE_SKILL_ID_PATTERN =
  /^(pao_xiao|kong_cheng|ma_shu|ji_zhi|qi_cai|jiu_yuan|ying_zi|qian_xun|lian_ying|xiao_ji|wu_shuang|bi_yue|tian_du|ke_ji)$/;

export function isPassiveSkillId(skillId: string): boolean {
  return PASSIVE_SKILL_ID_PATTERN.test(skillId);
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

const EQUIPMENT_SLOTS = [
  { slot: 'weapon', label: 'Vũ khí', prefix: '' },
  { slot: 'armor', label: 'Giáp', prefix: '' },
  { slot: 'plusOne', label: 'Ngựa +1', prefix: '+1' },
  { slot: 'minusOne', label: 'Ngựa -1', prefix: '-1' },
] as const;

export function SeatCard({
  player,
  playerView,
  isDisconnected = false,
  isActiveActor,
  isCurrentTurnOwner = false,
  isTargetEligible,
  isSelectedTarget,
  isInspectedHero = false,
  inspectedCardSourceId = null,
  isDragTargetEligible = false,
  isDragHovered = false,
  dragHoverLabelVi,
  compact = false,
  hpImpact = null,
  recoilVector = null,
  skillStamp = null,
  onSelectTarget,
  onInspectHero,
  onInspectCard,
}: SeatCardProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const hero = player.heroId ? getHeroDefinition(player.heroId) : null;
  const heroDisplay = getCuuChauHeroDisplay(player.heroId, locale);
  const heroPortraitUrl = getHeroPortraitUrl(player.heroId);

  const [photoFailed, setPhotoFailed] = useState<boolean>(false);
  useEffect(() => {
    setPhotoFailed(false);
  }, [heroPortraitUrl, player.avatarUrl]);

  const distance =
    playerView.turnPhase !== 'HERO_SELECT' && player.alive
      ? calculateDistance(playerView, playerView.viewerSeatIndex, player.seatIndex)
      : Number.POSITIVE_INFINITY;
  const identityLabel = player.isIdentityRevealed
    ? getIdentityLabelVi(player.identity)
    : (locale === 'en' ? 'Hidden' : 'Ẩn');
  const identityClass = player.isIdentityRevealed
    ? getIdentityBadgeClass(player.identity)
    : getIdentityBadgeClass('UNKNOWN');

  const canClick = isTargetEligible && player.alive && Boolean(onSelectTarget);
  const canInspectSeatHero = Boolean(player.heroId && onInspectHero);

  const openCards: Array<{
    readonly sourceId: string;
    readonly sourceLabel: string;
    readonly card: CardInstance;
    readonly shortLabel: string;
  }> = [];
  const cardTitle = (card: CardInstance) =>
    getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name;
  if (player.equipments.weapon) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:weapon`,
      sourceLabel: `${locale === 'en' ? 'Weapon' : 'Binh khí'} · ${player.displayName}`,
      card: player.equipments.weapon,
      shortLabel: cardTitle(player.equipments.weapon),
    });
  }
  if (player.equipments.armor) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:armor`,
      sourceLabel: `${locale === 'en' ? 'Armor' : 'Hộ giáp'} · ${player.displayName}`,
      card: player.equipments.armor,
      shortLabel: cardTitle(player.equipments.armor),
    });
  }
  if (player.equipments.plusOneHorse) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:plusOne`,
      sourceLabel: `${locale === 'en' ? 'Footwork +1' : 'Khinh công +1'} · ${player.displayName}`,
      card: player.equipments.plusOneHorse,
      shortLabel: `+1 ${cardTitle(player.equipments.plusOneHorse)}`,
    });
  }
  if (player.equipments.minusOneHorse) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:minusOne`,
      sourceLabel: `${locale === 'en' ? 'Steed -1' : 'Thân pháp -1'} · ${player.displayName}`,
      card: player.equipments.minusOneHorse,
      shortLabel: `-1 ${cardTitle(player.equipments.minusOneHorse)}`,
    });
  }
  for (const scroll of player.delayedScrolls) {
    openCards.push({
      sourceId: `seat:${player.seatIndex}:delayed:${scroll.id}`,
      sourceLabel: `${locale === 'en' ? 'Seal' : 'Phán xét'} · ${player.displayName}`,
      card: scroll,
      shortLabel: cardTitle(scroll),
    });
  }

  const equippedItems = EQUIPMENT_SLOTS.flatMap(({ slot, label, prefix }) => {
    const item = openCards.find(card => card.sourceId === `seat:${player.seatIndex}:${slot}`);
    return item ? [{ slot, label, prefix, item }] : [];
  });
  const delayedItems = openCards.filter(item => item.sourceId.includes(':delayed:'));

  const isHeroSelectPhase = playerView.turnPhase === 'HERO_SELECT';
  const isSeatReady = Boolean(playerView.heroDraft?.readySeats.includes(player.seatIndex));
  const isDying = !isHeroSelectPhase && player.alive && player.hp <= 0;
  const isLuoYiActive =
    !isHeroSelectPhase &&
    playerView.turnPhase !== 'GAME_OVER' &&
    isCurrentTurnOwner &&
    Boolean(playerView.turnFlags?.luoYiActive);
  const isKongChengActive =
    !isHeroSelectPhase &&
    player.alive &&
    player.heroId === 'zhuge_liang' &&
    player.handCount === 0;
  const isQianXunActive =
    !isHeroSelectPhase &&
    player.alive &&
    player.heroId === 'lu_xun';
  const isReactingSeat =
    !isHeroSelectPhase &&
    playerView.turnPhase !== 'GAME_OVER' &&
    isActiveActor &&
    !isCurrentTurnOwner;

  return (
    <div
      data-drop-seat={player.seatIndex}
      data-seat-name={player.displayName}
      data-faction={hero?.faction}
      data-turn-owner={isCurrentTurnOwner ? 'true' : undefined}
      data-reacting-seat={isReactingSeat ? 'true' : undefined}
      data-active-turn={isCurrentTurnOwner && isActiveActor ? 'true' : undefined}
      data-luoyi-active={isLuoYiActive ? 'true' : undefined}
      data-dying={isDying ? 'true' : undefined}
      data-hp-impact={hpImpact ? (hpImpact.delta < 0 ? 'damage' : 'heal') : undefined}
      data-recoil={recoilVector ? recoilVector.id : undefined}
      style={
        recoilVector
          ? ({
              '--recoil-x': `${recoilVector.x}px`,
              '--recoil-y': `${recoilVector.y}px`,
            } as React.CSSProperties)
          : undefined
      }
      data-lkdf-battle-rest={!isDragHovered && !isDragTargetEligible && !isSelectedTarget && !isTargetEligible && !isActiveActor && !isCurrentTurnOwner && !isInspectedHero}
      role={canClick ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
      onClick={canClick ? () => onSelectTarget?.(player.seatIndex) : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelectTarget?.(player.seatIndex);
              }
            }
          : undefined
      }
      className={[
        'lkdf-battle-seat relative flex w-[var(--seat-w,210px)] min-h-[var(--seat-h,72px)] shrink-0 flex-col justify-between gap-0.5 rounded-[6px] border bg-[#12161E]/96 text-[#F3F4F6] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.68)] transition-[transform,border-color,box-shadow,background-color] duration-150',
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
        !player.alive ? 'opacity-50 grayscale' : '',
        isDragHovered
          ? 'border-[#FBBF24] bg-[#3B1812]/95 shadow-[0_0_24px_rgba(251,191,36,0.55)]'
          : isDragTargetEligible
            ? 'lkdf-drop-pulse border-[#E6BE6C] bg-[#1A212E]'
            : isSelectedTarget
              ? 'border-[#E6BE6C] bg-[#1A212E] ring-2 ring-[#E6BE6C]/65 shadow-[0_0_18px_rgba(230,190,108,0.35)]'
              : isTargetEligible
                ? 'cursor-pointer border-[#E6BE6C] hover:bg-[#1A212E] shadow-[0_0_14px_rgba(230,190,108,0.28)]'
                : isCurrentTurnOwner
                  ? 'border-[#FBBF24] ring-2 ring-[#E6BE6C]/85 shadow-[0_0_18px_rgba(230,190,108,0.38)]'
                  : isReactingSeat
                    ? 'border-[#38BDF8] ring-1 ring-[#38BDF8]/80 shadow-[0_0_14px_rgba(56,189,248,0.34)]'
                    : isInspectedHero
                      ? 'border-[#E6BE6C] ring-1 ring-[#E6BE6C]/55'
                      : 'border-[#94A3B8]/38',
        canClick
          ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BE6C]'
          : '',
      ].join(' ')}
    >
      {/* Nền chân dung Tướng tràn viền kiểu Gwent (Mẫu B) */}
      <HeroCardWatermark
        portraitUrl={!photoFailed ? heroPortraitUrl : null}
        widthClass="w-[78%]"
        opacityClass="opacity-85"
      />

      {/* Ấn ký kỹ năng gọn nhẹ (<= 450ms) */}
      {skillStamp ? (
        <span
          key={`stamp-${skillStamp.id}`}
          aria-hidden="true"
          className="lkdf-skill-stamp pointer-events-none absolute bottom-1 right-1.5 z-35 rounded border border-[#E6BE6C]/80 bg-[#14171A]/95 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#FDE68A] shadow-md"
        >
          {skillStamp.label}
        </span>
      ) : null}

      {/* Hiệu ứng phản hồi sinh lực (hit-stop / hồi máu) */}
      {hpImpact ? (
        <span key={`impact-${hpImpact.id}`} aria-hidden="true" className="pointer-events-none contents">
          <span
            className={
              hpImpact.delta < 0
                ? 'lkdf-hp-flash-damage pointer-events-none absolute inset-0 z-30 rounded-[inherit]'
                : 'lkdf-hp-flash-heal pointer-events-none absolute inset-0 z-30 rounded-[inherit]'
            }
          />
          <span
            data-kind={hpImpact.delta < 0 ? 'damage' : 'heal'}
            className="lkdf-hp-pop pointer-events-none absolute top-2 left-1/2 z-40"
          >
            {hpImpact.delta > 0 ? `+${hpImpact.delta}` : `−${Math.abs(hpImpact.delta)}`}
          </span>
        </span>
      ) : null}

      {/* Nhãn chọn mục tiêu hoặc vùng thả khi kéo bài */}
      {isDragHovered ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-25 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#FDE68A] bg-[#9E2B25] px-2.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[#FFF8EB] shadow-lg">
          <GameIcon name="saber-slash" size={11} />
          {dragHoverLabelVi || (locale === 'en' ? 'Drop to target here' : 'Thả để đánh vào đây')}
        </span>
      ) : isDragTargetEligible ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#FBBF24] bg-[#D99B26] px-2 py-0.5 text-[9.5px] font-extrabold whitespace-nowrap text-[#14171A] shadow">
          <GameIcon name="archery-target" size={11} />
          {locale === 'en' ? 'Drop on target' : 'Thả vào mục tiêu'}
        </span>
      ) : canClick ? (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#D99B26] bg-[#14171A] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#FBBF24] shadow">
          <GameIcon
            name={isSelectedTarget ? 'ui:check' : 'archery-target'}
            size={11}
          />
          {isSelectedTarget ? (locale === 'en' ? 'Selected' : 'Đã chọn') : (locale === 'en' ? 'Select target' : 'Chọn mục tiêu')}
        </span>
      ) : null}

      {/* Hàng 1: Tên người chơi + #Ghế + Nhãn lượt/phản ứng gọn inline + Cách */}
      <div className="relative z-10 min-w-0">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div
            onClick={
              !canClick && canInspectSeatHero
                ? (e) => {
                    e.stopPropagation();
                    onInspectHero?.(player.seatIndex);
                  }
                : undefined
            }
            className={[
              'flex min-w-0 flex-1 items-center gap-1',
              !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
            ].join(' ')}
          >
            {!heroPortraitUrl && player.avatarUrl && !photoFailed ? (
              <img
                src={player.avatarUrl}
                alt={player.displayName}
                draggable={false}
                onError={() => setPhotoFailed(true)}
                className="h-5 w-5 shrink-0 rounded border border-[#94A3B8]/40 object-cover"
              />
            ) : !heroPortraitUrl && !hero ? (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#94A3B8]/35 bg-[#0D1016] text-[9px] font-bold text-[#D1D5DB]">
                {getInitials(player.displayName)}
              </span>
            ) : null}
            <span className="truncate text-[clamp(10px,0.86cqw,11.5px)] font-semibold text-[#D8DEE9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {player.displayName}
            </span>
            <span
              title={locale === 'en' ? `Clockwise turn order: Seat #${player.seatIndex + 1}` : `Thứ tự lượt theo chiều kim đồng hồ: Ghế #${player.seatIndex + 1}`}
              className="font-mono-num shrink-0 rounded border border-[#475569]/60 bg-[#0B0E14]/85 px-1 text-[8.5px] font-bold text-[#E2E8F0]"
            >
              #{player.seatIndex + 1}
            </span>
            {(isCurrentTurnOwner || isActiveActor) && playerView.turnPhase !== 'HERO_SELECT' && playerView.turnPhase !== 'GAME_OVER' ? (
              <span
                data-turn-badge={isCurrentTurnOwner ? (isActiveActor ? 'turn-active' : 'turn-waiting') : 'reacting'}
                title={
                  isCurrentTurnOwner && isActiveActor
                    ? (locale === 'en' ? 'Active Turn' : 'Đang trong lượt chính')
                    : isCurrentTurnOwner
                      ? (locale === 'en' ? 'Turn Owner (Waiting Response)' : 'Lượt chính (Đang chờ phản ứng)')
                      : (locale === 'en' ? 'Responding' : 'Đang phản ứng')
                }
                className={[
                  'inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0 text-[8px] leading-[13px] font-extrabold uppercase shadow-sm',
                  isCurrentTurnOwner && isActiveActor
                    ? 'border border-[#FBBF24]/90 bg-[#D99B26]/32 text-[#FEF08A]'
                    : isCurrentTurnOwner
                      ? 'border border-[#E6BE6C]/60 bg-[#D99B26]/16 text-[#F6DFA8]'
                      : 'border border-[#38BDF8]/85 bg-[#0C4A6E]/85 text-[#E0F2FE]',
                ].join(' ')}
              >
                {isCurrentTurnOwner && isActiveActor ? (
                  <>
                    <GameIcon name="ui:flag" size={9} />
                    <span>{locale === 'en' ? 'Turn' : 'Lượt'}</span>
                  </>
                ) : isCurrentTurnOwner ? (
                  <>
                    <GameIcon name="ui:flag" size={9} />
                    <span>{locale === 'en' ? 'Wait' : 'Chờ'}</span>
                  </>
                ) : (
                  <>
                    <GameIcon name="ui:zap" size={9} />
                    <span>{locale === 'en' ? 'React' : 'Phản ứng'}</span>
                  </>
                )}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isDying ? (
              <span
                role="status"
                title={locale === 'en' ? 'Near Death — Needs Elixir Pill rescue' : 'Đang hấp hối — cần Hồi Xuân Đan cứu'}
                className="lkdf-dying-badge inline-flex shrink-0 items-center gap-0.5 rounded border border-[#F87171]/75 bg-[#7F1D1D]/92 px-1.5 py-0 text-[9px] font-extrabold text-[#FEE2E2] shadow-sm"
              >
                <GameIcon name="death-skull" size={9.5} />
                {locale === 'en' ? 'Dying' : 'Hấp hối'}
              </span>
            ) : null}
            {player.alive && Number.isFinite(distance) ? (
              <span
                className="font-mono-num shrink-0 rounded bg-[#0B0E14]/85 px-1.5 py-0 text-[9px] font-bold text-[#E6BE6C] tabular-nums drop-shadow-sm"
                title={locale === 'en' ? `Distance to this seat is ${distance}` : `Khoảng cách tới ghế này là ${distance}`}
              >
                {locale === 'en' ? `Dist ${distance}` : `Cách ${distance}`}
              </span>
            ) : !player.alive ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#DC2626]/25 px-1.5 py-0 text-[9px] font-bold text-[#FCA5A5]">
                <GameIcon name="death-skull" size={10} />
                {locale === 'en' ? 'Fallen' : 'Tử trận'}
              </span>
            ) : null}

            {canInspectSeatHero ? (
              <button
                type="button"
                data-seat-inspect={player.seatIndex}
                data-inspected-trigger={isInspectedHero ? 'true' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                title={locale === 'en' ? `Inspect skills of ${heroDisplay?.name ?? ''}` : `Xem kỹ năng ${heroDisplay?.name ?? ''}`}
                aria-label={locale === 'en' ? `Inspect skills of ${heroDisplay?.name ?? ''}` : `Xem kỹ năng ${heroDisplay?.name ?? ''}`}
                className={[
                  'inline-flex h-6 w-6 min-h-[24px] min-w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                  isInspectedHero
                    ? 'border-[#FDE68A] bg-gradient-to-b from-[#E6BE6C] to-[#B88B3A] text-[#140F0C] shadow-[0_0_10px_rgba(230,190,108,0.45)]'
                    : 'border-[#806345]/75 bg-[#1B1410]/92 text-[#E6BE6C] hover:border-[#E6BE6C] hover:bg-[#2A1F17] hover:text-[#FDE68A]',
                ].join(' ')}
              >
                <GameIcon name="ui:info" size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Hàng 2: Huy hiệu thế lực + Tên Tướng + Thân Phận */}
        <div
          onClick={
            !canClick && canInspectSeatHero
              ? (e) => {
                  e.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }
              : undefined
          }
          className={[
            'mt-0.5 flex items-center gap-1 min-w-0',
            !canClick && canInspectSeatHero ? 'cursor-pointer' : '',
          ].join(' ')}
        >
          {hero ? (
            <>
              <FactionSeal faction={hero.faction} size="xs" />
              <span className="font-serif-title min-w-0 flex-1 [overflow-wrap:anywhere] text-[clamp(11px,0.96cqw,13.5px)] font-bold leading-tight text-[#F5EBD6] drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]">
                {heroDisplay?.name ?? hero.nameVi}
              </span>
            </>
          ) : (
            <span
              className={[
                'truncate text-[10.5px] font-medium',
                isSeatReady ? 'text-[#86EFAC]' : 'text-[#9CA3AF]',
              ].join(' ')}
            >
              {isSeatReady ? (locale === 'en' ? 'Locked' : 'Đã chốt') : (locale === 'en' ? 'Selecting…' : 'Đang chọn…')}
            </span>
          )}
          <span
            data-match-identity={player.isIdentityRevealed ? player.identity : 'UNKNOWN'}
            className={`lkdf-match-identity lkdf-match-identity-seat ${identityClass}`}
          >
            {identityLabel}
          </span>
        </div>
      </div>

      {/* Hàng 3: Kỹ năng gọn + Trạng thái sống */}
      {hero && (
        <div className="relative z-10 flex flex-wrap gap-0.5">
          {hero.skills.map((skill, sIdx) => {
            const skillDisplay = heroDisplay?.skills[sIdx];
            const skillName = skillDisplay?.name ?? skill.nameVi;
            const skillDesc = skillDisplay?.description ?? skill.descriptionVi;
            const isPassive = isPassiveSkillId(skill.id) || undefined;
            const isLuoYiChip = skill.id === 'luo_yi' && isLuoYiActive;
            const isKongChengChip = skill.id === 'kong_cheng' && isKongChengActive;
            const isQianXunChip = skill.id === 'qian_xun' && isQianXunActive;
            const statusClass = isLuoYiChip
              ? 'inline-flex items-center gap-0.5 border-[#FB923C]! bg-[#7C2D12]! text-[#FFEDD5]! shadow-[0_0_8px_rgba(249,115,22,0.55)]'
              : isKongChengChip
                ? 'inline-flex items-center gap-0.5 border-[#34D399]! bg-[#065F46]! text-[#D1FAE5]! shadow-[0_0_8px_rgba(16,185,129,0.45)]'
                : isQianXunChip
                  ? 'inline-flex items-center gap-0.5 border-[#6EE7B7]! bg-[#064E3B]! text-[#A7F3D0]!'
                  : '';
            const labelContent = (
              <>
                {isLuoYiChip ? <GameIcon name="broadsword" size={9} /> : null}
                {isKongChengChip ? <GameIcon name="shield" size={9} /> : null}
                {isQianXunChip ? <GameIcon name="bordered-shield" size={9} /> : null}
                <span>{isLuoYiChip ? '+1 DMG' : skillName}</span>
              </>
            );
            const hoverTitle = isLuoYiChip
              ? skillDesc
              : isKongChengChip
                ? skillDesc
                : isQianXunChip
                  ? skillDesc
                  : undefined;
            if (canClick || !canInspectSeatHero) {
              return (
                <span
                  key={skill.id}
                  className={`lkdf-hero-skill-label ${statusClass} ${canClick ? 'pointer-events-none' : ''}`}
                  data-passive-skill={isPassive}
                  data-kong-cheng={isKongChengChip ? 'true' : undefined}
                  data-qian-xun={isQianXunChip ? 'true' : undefined}
                  data-hover-name={skillName}
                  data-hover-description={hoverTitle ?? skillDesc}
                >
                  {labelContent}
                </span>
              );
            }
            return (
              <button
                key={skill.id}
                type="button"
                className={`lkdf-hero-skill-label cursor-pointer hover:border-[#E6BE6C] ${statusClass}`}
                data-passive-skill={isPassive}
                data-kong-cheng={isKongChengChip ? 'true' : undefined}
                data-qian-xun={isQianXunChip ? 'true' : undefined}
                data-inspected-trigger={isInspectedHero ? 'true' : undefined}
                data-hover-name={skillName}
                data-hover-description={hoverTitle ?? skillDesc}
                onClick={(event) => {
                  event.stopPropagation();
                  onInspectHero?.(player.seatIndex);
                }}
              >
                {labelContent}
              </button>
            );
          })}
        </div>
      )}

      {/* Hàng 4: Ngọc sinh lực + Bot/Mất mạng + Số bài úp */}
      <div className="lkdf-battle-seat-summary relative z-10 mt-0.5 flex items-center justify-between gap-1.5">
        {isHeroSelectPhase && player.maxHp <= 0 ? (
          <span className="truncate text-[10px] font-medium text-[#94A3B8]">
            {isSeatReady ? (locale === 'en' ? 'Waiting…' : 'Chờ người khác…') : (locale === 'en' ? 'Picking' : 'Chưa chốt tướng')}
          </span>
        ) : (
          <HpJadeMeter hp={player.hp} maxHp={player.maxHp} size="sm" />
        )}

        <div className="flex items-center gap-1 shrink-0">
          {player.isBotTakeover ? (
            <span
              title={locale === 'en' ? 'Temporary Bot Takeover' : 'Máy đánh hộ tạm thời'}
              className="lkdf-match-bot"
            >
              <GameIcon name="ui:bot" size={10} />
              {locale === 'en' ? 'Bot' : 'Máy'}
            </span>
          ) : null}
          {isDisconnected ? (
            <span
              title={locale === 'en' ? 'Disconnected' : 'Mất kết nối mạng'}
              className="inline-flex items-center rounded bg-[#DC2626]/25 p-0.5 text-[#FCA5A5]"
            >
              <GameIcon name="ui:wifi-off" size={10} />
            </span>
          ) : null}
          {isHeroSelectPhase ? (
            <span className="inline-flex items-center rounded border border-[#94A3B8]/25 bg-[#0B0E14]/80 px-1.5 py-0.5 text-[9.5px] font-medium text-[#9CA3AF]">
              {locale === 'en' ? 'Wait deal…' : 'Chờ chia bài…'}
            </span>
          ) : (
            <div
              className="inline-flex items-center gap-1 rounded border border-[#94A3B8]/35 bg-[#0B0E14]/90 px-1.5 py-0.5"
              data-motion-hand-count
              title={locale === 'en' ? `Holding ${player.handCount} card(s)` : `Đang cầm ${player.handCount} lá bài trên tay`}
            >
              <CardBack size="xs" />
              <span className="font-mono-num text-[clamp(10px,0.9cqw,11.5px)] font-extrabold text-[#F4EFE6] tabular-nums">
                {player.handCount}
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Hàng 5: Trang bị đang mặc — chỉ hiện khi có đồ; xếp 2 cột gọn khi nhiều đồ để không đội chiều cao */}
      {equippedItems.length > 0 ? (() => {
        const compactEquipGrid = compact ? equippedItems.length >= 2 : equippedItems.length >= 3;
        return (
          <div
            className={
              compactEquipGrid
                ? 'lkdf-battle-seat-equipment relative z-10 grid grid-cols-2 gap-0.5 border-t border-[#94A3B8]/25 pt-0.5'
                : 'lkdf-battle-seat-equipment relative z-10 flex flex-col gap-0.5 border-t border-[#94A3B8]/25 pt-0.5'
            }
          >
            {equippedItems.map(({ slot, label, prefix, item }) => {
              const artUrl = getCardArtUrl(item.card.cardKey);
              const active = inspectedCardSourceId === item.sourceId;
              const red = isCardRed(item.card);
              const chipClass = [
                compactEquipGrid ? 'h-[18px] text-[9.5px]' : 'h-[20px] text-[10px]',
                'lkdf-seat-equip-chip flex w-full min-w-0 items-center gap-1 overflow-hidden rounded border px-1 text-left leading-none transition-colors',
                canClick ? 'pointer-events-none' : 'cursor-pointer',
                active
                  ? 'border-[#FDE68A] bg-[#E6BE6C]/22 ring-1 ring-[#FDE68A]/55'
                  : 'border-[#B89352]/40 bg-[#0B0E14]/92 hover:border-[#E6BE6C]',
              ].join(' ');
              const content = (
                <>
                  {artUrl ? (
                    <img
                      src={artUrl}
                      alt=""
                      draggable={false}
                      className="h-[15px] w-[12px] shrink-0 rounded-[2px] object-cover"
                    />
                  ) : (
                    <GameIcon name={getCardGameIcon(item.card.cardKey)} size={11} className="shrink-0 text-[#E6BE6C]" />
                  )}
                  <span
                    className={`font-mono-num inline-flex shrink-0 items-center gap-0.5 text-[9.5px] font-extrabold leading-none ${
                      red ? 'text-[#FCA5A5]' : 'text-[#F1F5F9]'
                    }`}
                  >
                    <span className="shrink-0">{formatRankLabel(item.card.rank)}</span>
                    <SuitGlyph suit={item.card.suit} size={9} tone="darkSurface" className="shrink-0" />
                    <span className="sr-only">{formatSuitSymbol(item.card.suit)}</span>
                  </span>
                  {prefix ? (
                    <span className="shrink-0 rounded bg-[#B89352]/25 px-1 py-px text-[8.5px] font-extrabold text-[#FDE68A]">
                      {prefix}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#F5EBD6]">
                    {getCuuChauCardDisplay(item.card.cardKey, locale, item.card.nameVi).name}
                  </span>
                </>
              );
              if (canClick) {
                return (
                  <div
                    key={slot}
                    data-equipment-slot={slot}
                    aria-label={`${label} · ${getCuuChauCardDisplay(item.card.cardKey, locale, item.card.nameVi).name}`}
                    className={chipClass}
                  >
                    {content}
                  </div>
                );
              }
              return (
                <button
                  key={slot}
                  type="button"
                  data-equipment-slot={slot}
                  data-inspected-trigger={active ? 'true' : undefined}
                  {...cardHover(item.card)}
                  aria-label={`${label} · ${getCuuChauCardDisplay(item.card.cardKey, locale, item.card.nameVi).name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onInspectCard?.(item.card, item.sourceId, item.sourceLabel);
                  }}
                  className={chipClass}
                >
                  {content}
                </button>
              );
            })}
          </div>
        );
      })() : null}

      {/* Hàng 6: Phán xét (chỉ hiện khi có bài phán xét) */}
      {delayedItems.length > 0 ? (
        <div className="relative z-10 grid grid-cols-2 gap-1">
          {delayedItems.map((item) => {
            const artUrl = getCardArtUrl(item.card.cardKey);
            const active = inspectedCardSourceId === item.sourceId;
            const red = isCardRed(item.card);
            const scrollClass = [
              'lkdf-seat-equip-chip inline-flex h-[20px] w-full min-w-0 items-center gap-1 rounded border px-1.5 text-left transition-colors',
              canClick ? 'pointer-events-none' : 'cursor-pointer',
              active
                ? 'border-[#FDE68A] bg-[#E6BE6C]/25 ring-1 ring-[#FDE68A]/55'
                : 'border-[#D99B26]/55 bg-[#2A1B0C]/90 hover:border-[#FBBF24]',
            ].join(' ');
            const content = (
              <>
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt=""
                    draggable={false}
                    className="h-[15px] w-[12px] shrink-0 rounded-[2px] border border-[#94A3B8]/40 object-cover"
                  />
                ) : (
                  <GameIcon name={getCardGameIcon(item.card.cardKey)} size={11} className="shrink-0 text-[#FBBF24]" />
                )}
                <span
                  className={`font-mono-num inline-flex shrink-0 items-center gap-0.5 text-[9.5px] font-extrabold leading-none ${
                    red ? 'text-[#FCA5A5]' : 'text-[#F1F5F9]'
                  }`}
                >
                  <span className="shrink-0">{formatRankLabel(item.card.rank)}</span>
                  <SuitGlyph suit={item.card.suit} size={9} tone="darkSurface" />
                  <span className="sr-only">{formatSuitSymbol(item.card.suit)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-bold leading-tight text-[#FDE68A]">
                  {item.shortLabel}
                </span>
              </>
            );
            if (canClick) {
              return (
                <div key={item.sourceId} className={scrollClass}>
                  {content}
                </div>
              );
            }
            return (
              <button
                key={item.sourceId}
                data-inspected-trigger={active ? 'true' : undefined}
                {...cardHover(item.card)}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectCard?.(item.card, item.sourceId, item.sourceLabel);
                }}
                className={scrollClass}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
