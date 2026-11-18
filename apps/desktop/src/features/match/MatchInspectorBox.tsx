import {
  formatRankLabel,
  formatSuitSymbol,
  getHeroDefinition,
} from '@lkdf/shared';
import type { PublicPlayerView } from '@lkdf/shared';
import { getCardArtUrl, getHeroPortraitUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import {
  FactionSeal,
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
} from '../../components/icons/index.js';
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
  readonly onResetToSelf: () => void;
}

export function MatchInspectorBox({
  inspector,
  selfPlayer,
  players,
  onResetToSelf,
}: MatchInspectorBoxProps) {
  const inkBaseUrl = getUiAssetUrl('tex-ink-base');
  const boxBgStyle = inkBaseUrl
    ? {
        backgroundImage: `linear-gradient(rgba(14,11,9,0.72), rgba(10,8,7,0.86)), url(${inkBaseUrl})`,
        backgroundSize: '300px auto',
      }
    : undefined;

  if (inspector?.kind === 'card') {
    const { card, sourceLabel } = inspector;
    const artUrl = getCardArtUrl(card.cardKey);
    const rankLabel = formatRankLabel(card.rank);
    const suitSym = formatSuitSymbol(card.suit);
    const red = isCardRed(card);
    const categoryLabel = getCardCategoryLabelVi(card.category, card.attackRange);
    const description = getCardDescriptionVi(card.cardKey, card.nameVi);

    return (
      <aside
        style={boxBgStyle}
        className="flex h-full min-h-0 w-[var(--right-w,250px)] shrink-0 flex-col justify-between rounded-xl border border-[#D99B26]/60 bg-[#14171A] p-2 shadow-[inset_0_1px_0_rgba(255,232,185,0.06)]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-white/10 pb-1">
            <span className="truncate text-[10px] font-bold tracking-wide text-[#FDE68A] uppercase">
              🃏 {sourceLabel}
            </span>
            <button
              type="button"
              onClick={onResetToSelf}
              className="shrink-0 cursor-pointer rounded border border-[#D99B26]/55 bg-[#D99B26]/18 px-1.5 py-0.5 text-[9.5px] font-bold text-[#FFF3D1] hover:bg-[#D99B26]/30"
            >
              ✕ Về tướng bạn
            </button>
          </div>

          <div className="mt-1.5 flex shrink-0 items-center gap-2">
            <div className="lkdf-card-parchment flex h-[46px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded border border-[#C89B4B]/65">
              {artUrl ? (
                <img
                  src={artUrl}
                  alt={card.nameVi}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GameIcon name={getCardGameIcon(card.cardKey)} size={18} className="text-[#5C3E1A]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-serif-title truncate text-[13px] font-bold text-[#F3D38C]">
                {card.nameVi}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span
                  className={[
                    'font-mono-num inline-flex items-center gap-0.5 rounded border px-1.5 py-0 text-[10px] font-bold',
                    red
                      ? 'border-[#F87171]/45 bg-[#B91C1C]/25 text-[#FCA5A5]'
                      : 'border-[#9CA3AF]/40 bg-[#374151]/55 text-[#E5E7EB]',
                  ].join(' ')}
                >
                  <span>{rankLabel}</span>
                  <SuitGlyph suit={card.suit} size={11} tone="darkSurface" />
                  <span className="sr-only">{suitSym}</span>
                </span>
                <span className="rounded border border-[#A68042]/35 bg-[#14100C]/90 px-1.5 py-0 text-[9.5px] font-semibold text-[#E6CFA3]">
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="lkdf-scroll mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="text-[11.5px] leading-[1.45] text-[#E2D9C8]">{description}</p>
          </div>
        </div>
      </aside>
    );
  }

  const targetSeatPlayer =
    inspector?.kind === 'hero'
      ? players.find((p) => p.seatIndex === inspector.seatIndex)
      : selfPlayer;
  const isOpponent = inspector?.kind === 'hero';
  const heroDef = targetSeatPlayer?.heroId ? getHeroDefinition(targetSeatPlayer.heroId) : null;
  const factionStyle = heroDef ? getFactionStyle(heroDef.faction) : null;
  const portraitUrl = getHeroPortraitUrl(targetSeatPlayer?.heroId);

  return (
    <aside
      style={boxBgStyle}
      className={[
        'flex h-full min-h-0 w-[var(--right-w,250px)] shrink-0 flex-col justify-between rounded-xl border bg-[#14171A] p-2 shadow-[inset_0_1px_0_rgba(255,232,185,0.06)]',
        isOpponent ? 'border-[#D99B26]/60' : 'border-[#A68042]/35',
      ].join(' ')}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-white/10 pb-1">
          {isOpponent && targetSeatPlayer ? (
            <>
              <span className="truncate text-[10px] font-bold tracking-wide text-[#FDE68A] uppercase">
                🔍 Tướng: {targetSeatPlayer.displayName}
              </span>
              <button
                type="button"
                onClick={onResetToSelf}
                className="shrink-0 cursor-pointer rounded border border-[#D99B26]/55 bg-[#D99B26]/18 px-1.5 py-0.5 text-[9.5px] font-bold text-[#FFF3D1] hover:bg-[#D99B26]/30"
              >
                ✕ Về tướng bạn
              </button>
            </>
          ) : (
            <>
              <span className="truncate text-[10px] font-bold tracking-wide text-[#C89B4B] uppercase">
                Kỹ năng{' '}
                {heroDef && factionStyle ? (
                  <span className={`normal-case ${factionStyle.nameTextClass}`}>
                    · {heroDef.nameVi}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[9px] text-[#B5A792]">Bấm bài/ghế để soi</span>
            </>
          )}
        </div>

        {heroDef && factionStyle && targetSeatPlayer ? (
          <>
            {isOpponent ? (
              <div className="mt-1 flex shrink-0 items-center gap-1.5 border-b border-white/6 pb-1">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border bg-[#14171A] ${factionStyle.borderClass}`}
                >
                  {portraitUrl ? (
                    <img
                      src={portraitUrl}
                      alt={heroDef.nameVi}
                      draggable={false}
                      className="h-full w-full object-cover object-[50%_18%]"
                    />
                  ) : (
                    <FactionSeal faction={heroDef.faction} size="sm" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
                  <span className={`font-serif-title truncate text-[11.5px] font-bold ${factionStyle.nameTextClass}`}>
                    {heroDef.nameVi} · {factionStyle.labelVi}
                  </span>
                  <span className="font-mono-num shrink-0 text-[9.5px] text-[#B5A792]">
                    {targetSeatPlayer.hp}/{targetSeatPlayer.maxHp} máu
                  </span>
                </div>
              </div>
            ) : null}

            <div className="lkdf-scroll mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {heroDef.skills.map((sk) => (
                <div key={sk.id}>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-serif-title text-[10.5px] font-bold text-[#F3D38C]">
                      【{sk.nameVi}】
                    </span>
                    {sk.isLordSkill ? (
                      <span className="rounded border border-[#D99B26]/55 bg-[#D99B26]/16 px-1 py-0 text-[8px] font-bold text-[#FBBF24]">
                        Chủ Công
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] leading-[1.3] text-[#E2D9C8]">
                    {sk.descriptionVi}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-[11px] text-[#B5A792]">
            Đang chọn Tướng đầu ván...
          </div>
        )}
      </div>

      {!isOpponent ? (
        <div className="mt-1 shrink-0 truncate border-t border-white/8 pt-0.5 text-[9px] text-[#B5A792]">
          Bấm bài trên tay, ô trang bị ngửa hoặc ⓘ trên ghế để soi
        </div>
      ) : null}
    </aside>
  );
}
