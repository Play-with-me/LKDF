import { useTranslation } from 'react-i18next';
import {
  formatRankLabel,
  formatSuitSymbol,
  getCuuChauCardDisplay,
  getCuuChauHeroDisplay,
  getHeroDefinition,
} from '@lkdf/shared';
import type { CardInstance, PublicPlayerView } from '@lkdf/shared';
import { getCardArtUrl, getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import {
  FactionSeal,
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
import { isPassiveSkillId } from './SeatCard.js';
import {
  getCardCategoryLabelVi,
  getCardDescriptionVi,
  getFactionStyle,
  isCardRed,
} from './matchTypes.js';
import type { MatchInspectorTarget } from './matchTypes.js';

export interface MatchInspectorBoxProps {
  readonly inspector: MatchInspectorTarget | null;
  readonly selfPlayer: PublicPlayerView | undefined;
  readonly players: readonly PublicPlayerView[];
  readonly title?: string;
  readonly onClose: () => void;
  readonly onResetToSelf?: () => void;
}

function getCardRuleTip(card: CardInstance): string | null {
  switch (card.category) {
    case 'WEAPON':
      return 'Mẹo: Binh khí chỉ tăng tầm đánh Kiếm Trảm; Thám Nang Thủ vẫn đòi hỏi khoảng cách ≤ 1.';
    case 'ARMOR':
      return 'Mẹo: Hộ giáp tự động kích hoạt phòng thủ khi bạn bị nhắm, không tốn lượt.';
    case 'PLUS_ONE_HORSE':
      return 'Mẹo: Thú cưỡi +1 khiến mọi đối thủ tính khoảng cách tới bạn xa thêm 1.';
    case 'MINUS_ONE_HORSE':
      return 'Mẹo: Thú cưỡi −1 giúp bạn tính khoảng cách tới mọi đối thủ gần hơn 1.';
    case 'DELAYED_SCROLL':
      return 'Mẹo: Bí kíp thời gian chờ phán xét ở pha đầu lượt, có thể bị Hóa Giải Chân Khí chặn.';
    default:
      return null;
  }
}

export function MatchInspectorBox({
  inspector,
  selfPlayer,
  players,
  title,
  onClose,
  onResetToSelf,
}: MatchInspectorBoxProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  if (!inspector) {
    return null;
  }

  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const boxBgStyle = inkBaseUrl
    ? {
        backgroundColor: '#140F0C',
        backgroundImage: `linear-gradient(168deg, rgba(22,16,13,0.97), rgba(14,10,8,0.99)), url(${inkBaseUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor: '#140F0C' };

  const cornerBrackets = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 z-20 h-2 w-2 border-t border-l border-[#E6BE6C]/75"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 right-1 z-20 h-2 w-2 border-t border-r border-[#E6BE6C]/75"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 z-20 h-2 w-2 border-b border-l border-[#E6BE6C]/75"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1 bottom-1 z-20 h-2 w-2 border-r border-b border-[#E6BE6C]/75"
      />
    </>
  );

  if (inspector.kind === 'card') {
    const { card, sourceLabel } = inspector;
    const cardDisplay = getCuuChauCardDisplay(card.cardKey, locale, card.nameVi);
    const artUrl = getCardArtUrl(card.cardKey);
    const rankLabel = formatRankLabel(card.rank);
    const suitSym = formatSuitSymbol(card.suit);
    const red = isCardRed(card);
    const categoryLabel = getCardCategoryLabelVi(card.category, card.attackRange);
    const description = cardDisplay.description;
    const tip = getCardRuleTip(card);

    return (
      <aside
        data-match-inspector="true"
        role="region"
        aria-label={cardDisplay.name}
        style={boxBgStyle}
        className="animate-lkdf-slide relative flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-[#C89B4B]/70 bg-[#140F0C] text-[#EFE6D5] shadow-[0_20px_48px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(230,190,108,0.16)]"
      >
        {cornerBrackets}
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-1.5 border-b border-[#806345]/50 bg-[#1B1410]/95 px-2.5 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <GameIcon
              name={getCardGameIcon(card.cardKey)}
              size={12}
              className="shrink-0 text-[#E6BE6C]"
            />
            <span className="truncate text-[10px] font-bold tracking-wide text-[#F3D38C] uppercase">
              {title ?? sourceLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onResetToSelf ? (
              <button
                type="button"
                onClick={onResetToSelf}
                className="cursor-pointer rounded border border-[#806345]/75 bg-[#231A14] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#E6CFA3] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED]"
              >
                Soi mình
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng bảng xem chi tiết (Esc)"
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#806345]/80 bg-[#231A14] px-1.5 py-0.5 text-[10px] font-semibold text-[#F5EBD6] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="ui:x" size={10} />
              <span>Đóng</span>
            </button>
          </div>
        </header>

        <div className="lkdf-scroll relative z-10 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <div className="flex h-[62px] w-[45px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[#C89B4B]/70 bg-[#1D1510] shadow-md">
              {artUrl ? (
                <img
                  src={artUrl}
                  alt={cardDisplay.name}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GameIcon
                  name={getCardGameIcon(card.cardKey)}
                  size={20}
                  className="text-[#E6BE6C]"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-serif-title text-[14px] leading-snug font-bold text-[#F5EBD6]">
                {cardDisplay.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={[
                    'font-mono-num inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10.5px] leading-none font-bold',
                    red
                      ? 'border-[#F87171]/50 bg-[#7F1D1D]/45 text-[#FCA5A5]'
                      : 'border-[#806345]/60 bg-[#231A14] text-[#F5EBD6]',
                  ].join(' ')}
                >
                  <span>{rankLabel}</span>
                  <SuitGlyph suit={card.suit} size={11} tone="darkSurface" />
                  <span className="sr-only">{suitSym}</span>
                </span>
                <span className="rounded border border-[#C89B4B]/45 bg-[#231A14]/90 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-[#E6CFA3]">
                  {categoryLabel}
                </span>
                {card.category === 'WEAPON' && card.attackRange !== undefined ? (
                  <span className="font-mono-num inline-flex items-center gap-1 rounded border border-[#D99B26]/55 bg-[#D99B26]/16 px-1.5 py-0.5 text-[10px] leading-none font-bold text-[#FDE68A] tabular-nums">
                    <GameIcon name="archery-target" size={10} />
                    Tầm {card.attackRange}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <p className="text-[12px] leading-[1.48] text-[#EDE3D2]">{description}</p>

          {tip ? (
            <div className="flex items-start gap-1.5 rounded-md border border-[#806345]/45 bg-[#1B1410]/85 px-2.5 py-1.5 text-[11px] leading-snug text-[#D5C3A5]">
              <GameIcon name="ui:info" size={12} className="mt-0.5 shrink-0 text-[#E6BE6C]" />
              <span>{tip}</span>
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  const targetSeatPlayer = players.find((p) => p.seatIndex === inspector.seatIndex) ?? selfPlayer;
  const isSelf = Boolean(selfPlayer && targetSeatPlayer?.seatIndex === selfPlayer.seatIndex);
  const heroDef = targetSeatPlayer?.heroId ? getHeroDefinition(targetSeatPlayer.heroId) : null;
  const heroDisplay = getCuuChauHeroDisplay(heroDef?.id, locale);
  const factionStyle = heroDef ? getFactionStyle(heroDef.faction) : null;
  const portraitUrl = getHeroPortraitUrl(targetSeatPlayer?.heroId);

  return (
    <aside
      data-match-inspector="true"
      role="region"
      aria-label={heroDisplay?.name ?? heroDef?.nameVi ?? ''}
      style={boxBgStyle}
      className="animate-lkdf-slide relative flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-[#C89B4B]/70 bg-[#140F0C] text-[#EFE6D5] shadow-[0_20px_48px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(230,190,108,0.16)]"
    >
      {cornerBrackets}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-1.5 border-b border-[#806345]/50 bg-[#1B1410]/95 px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {heroDef ? <FactionSeal faction={heroDef.faction} size="xs" /> : null}
          <span className="truncate text-[10px] font-bold tracking-wide text-[#F3D38C] uppercase">
            {title ?? (isSelf ? (locale === 'en' ? 'Your Warrior' : 'Hiệp khách của bạn') : targetSeatPlayer?.displayName || (locale === 'en' ? 'Warrior Dossier' : 'Hồ sơ hiệp khách'))}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isSelf && onResetToSelf ? (
            <button
              type="button"
              onClick={onResetToSelf}
              className="cursor-pointer rounded border border-[#806345]/75 bg-[#231A14] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#E6CFA3] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED]"
            >
              {locale === 'en' ? 'Inspect Self' : 'Soi mình'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            title="Esc"
            aria-label="Close (Esc)"
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#806345]/80 bg-[#231A14] px-1.5 py-0.5 text-[10px] font-semibold text-[#F5EBD6] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
          >
            <GameIcon name="ui:x" size={10} />
            <span>{locale === 'en' ? 'Close' : 'Đóng'}</span>
          </button>
        </div>
      </header>

      <div className="lkdf-scroll relative z-10 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {heroDef && factionStyle && targetSeatPlayer ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-[#806345]/35 pb-2">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-[#1B1410] shadow-md ${factionStyle.borderClass}`}
              >
                {portraitUrl ? (
                  <img
                    src={portraitUrl}
                    alt={heroDisplay?.name ?? heroDef.nameVi}
                    draggable={false}
                    className="h-full w-full object-cover object-[50%_18%]"
                  />
                ) : (
                  <FactionSeal faction={heroDef.faction} size="sm" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`font-serif-title text-[14px] leading-snug font-bold ${factionStyle.nameTextClass}`}>
                    {heroDisplay?.name ?? heroDef.nameVi}
                  </span>
                  <span className={`rounded border px-1.5 py-0 text-[9.5px] font-bold ${factionStyle.badgeClass}`}>
                    {heroDisplay?.factionLabel ?? factionStyle.labelVi}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#D5C3A5]">
                  <span className="font-mono-num inline-flex items-center gap-1 font-bold text-[#FCA5A5] tabular-nums">
                    <GameIcon name="heart-plus" size={11} className="text-[#EF4444]" />
                    {targetSeatPlayer.hp}/{targetSeatPlayer.maxHp} HP
                  </span>
                  <span className="font-mono-num text-[#B5A792] tabular-nums">
                    · {targetSeatPlayer.handCount} {locale === 'en' ? 'cards' : 'lá tay'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(heroDisplay?.skills ?? heroDef.skills.map((s) => ({ id: s.id, name: s.nameVi, description: s.descriptionVi, isLordSkill: s.isLordSkill }))).map((sk) => {
                const isPassive = isPassiveSkillId(sk.id);
                return (
                  <div
                    key={sk.id}
                    className="rounded-md border border-[#806345]/35 bg-[#1B1410]/70 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-serif-title text-[12px] font-bold text-[#F3D38C]">
                        【{sk.name}】
                      </span>
                      {sk.isLordSkill ? (
                        <span className="inline-flex items-center gap-0.5 rounded border border-[#D99B26]/60 bg-[#D99B26]/18 px-1.5 py-0 text-[9px] font-bold text-[#FDE68A]">
                          <GameIcon name="crown" size={9} />
                          {locale === 'en' ? 'Sovereign Skill' : 'Kỹ năng Minh Chủ'}
                        </span>
                      ) : null}
                      {isPassive ? (
                        <span className="inline-flex items-center rounded border border-[#6EE7B7]/45 bg-[#064E3B]/65 px-1.5 py-0 text-[9px] font-bold text-[#A7F3D0]">
                          {locale === 'en' ? 'Passive' : 'Bị động'}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-[1.45] text-[#EDE3D2]">
                      {sk.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-1.5 rounded-md border border-[#806345]/35 bg-[#1B1410]/75 px-2.5 py-1.5 text-[10.5px] leading-snug text-[#B5A792]">
              <GameIcon name="ui:info" size={11} className="mt-0.5 shrink-0 text-[#E6BE6C]" />
              <span>{locale === 'en' ? 'Click any seat, gear, or table card to inspect.' : 'Bấm ghế khác hoặc lá trang bị/giữa bàn để đổi mục soi.'}</span>
            </div>
          </>
        ) : (
          <div className="flex h-24 items-center justify-center text-center text-[11.5px] text-[#B5A792]">
            {locale === 'en' ? 'Selecting warriors...' : 'Đang chọn Hiệp Khách đầu ván...'}
          </div>
        )}
      </div>
    </aside>
  );
}
