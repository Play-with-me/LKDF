import { getCuuChauCardDisplay, getCuuChauHeroDisplay, getCuuChauRoleDisplay, getHeroDefinition } from '@lkdf/shared';
import type { CardInstance, GameAction, PlayerViewState, PublicPlayerView, Suit } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import {
  CardBack,
  GameIcon,
  SuitGlyph,
  getCardGameIcon,
  type GameIconName,
} from '../../components/icons/index.js';
import type { MatchSelectionState } from './matchTypes.js';
import {
  describeJianXiongDamageCard,
  describePendingActorPrompt,
  formatCardShort,
  formatCuuChauDisplayText,
  getConvertAsCardKey,
  getEffectivePlayCardKey,
  getPlayerOwnedCards,
  getRequiredTargetSpec,
  isCardRed,
} from './matchTypes.js';

export interface BlindHandCardFanProps {
  readonly count: number;
  readonly ariaVerb?: 'Chọn' | 'Hủy';
  readonly tone?: 'bronze' | 'crimson';
  readonly onPickIndex: (handIndex: number) => void;
}

/** Tactile fanned mini card-back strip for blind opponent hand picks. */
export function BlindHandCardFan({
  count,
  ariaVerb = 'Chọn',
  tone = 'bronze',
  onPickIndex,
}: BlindHandCardFanProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  if (count <= 0) return null;
  const hoverRing =
    tone === 'crimson'
      ? 'hover:ring-1 hover:ring-[#F87171] focus-visible:ring-[#F87171]'
      : 'hover:ring-1 hover:ring-[#FBBF24] focus-visible:ring-[#FBBF24]';
  const badgeClass =
    tone === 'crimson'
      ? 'border-[#C83E37]/85 bg-[#241110]/96 text-[#FECACA]'
      : 'border-[#C89B4B]/80 bg-[#140F0C]/96 text-[#FDE68A]';
  const verbText = isEn ? (ariaVerb === 'Hủy' ? 'Discard' : 'Pick') : ariaVerb;

  return (
    <div className="lkdf-blind-pick-fan flex flex-wrap items-center justify-center py-0.5 pl-1.5">
      {Array.from({ length: count }, (_, idx) => (
        <button
          key={`blind-hand-${idx}`}
          type="button"
          aria-label={isEn ? `Hand card #${idx + 1}` : `Lá bài tay số #${idx + 1}`}
          title={isEn ? `${verbText} hand card #${idx + 1}` : `${verbText} lá bài tay số #${idx + 1}`}
          onClick={() => onPickIndex(idx)}
          className={`group relative -ml-1.5 first:ml-0 inline-flex shrink-0 cursor-pointer flex-col items-center rounded-[5px] p-0.5 transition-[transform,box-shadow] duration-150 hover:z-10 hover:-translate-y-1 focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${hoverRing}`}
        >
          <CardBack
            size="sm"
            className="lkdf-blind-pick-card h-9 w-7 shadow-md transition-shadow group-hover:shadow-[0_6px_14px_rgba(230,190,108,0.3)]"
          />
          <span
            className={`font-mono-num pointer-events-none rounded border px-1 py-0 text-[9px] leading-[13px] font-bold shadow-sm tabular-nums -mt-1.5 relative z-10 ${badgeClass}`}
          >
            #{idx + 1}
          </span>
        </button>
      ))}
    </div>
  );
}

const EBONY_ACTION_BTN =
  'border border-[#806345]/75 bg-[#231A14] text-[#EDE3D2] hover:border-[#C89B4B] hover:bg-[#2C2017]';
const EBONY_DANGER_GHOST_BTN =
  'border border-[#806345]/75 bg-[#231A14] text-[#FCA5A5] hover:border-[#DC2626] hover:bg-[#2B1715]';
const EBONY_IDLE_SHELL =
  'flex h-full min-h-0 w-full flex-col justify-center rounded-xl border border-[#806345]/50 bg-[#140F0C] p-3 text-xs text-[#C7B69B]';

export interface MatchActionSidebarProps {
  readonly view: PlayerViewState;
  readonly selection: MatchSelectionState;
  readonly layout?: 'sidebar' | 'bar';
  readonly onClearSelection: () => void;
  readonly onSendAction: (action: GameAction) => void;
  readonly onEndPlayPhase: () => void;
}

function getShortName(
  players: readonly PublicPlayerView[],
  seatIndex: number | null | undefined,
  isEn = false,
): string {
  if (seatIndex === null || seatIndex === undefined) {
    return isEn ? 'opponent' : 'đối thủ';
  }
  const player = players.find((p) => p.seatIndex === seatIndex);
  if (!player) {
    return isEn ? `Seat ${seatIndex + 1}` : `Ghế ${seatIndex + 1}`;
  }
  return player.displayName;
}

interface ReactionCardMatch {
  readonly cardId: string;
  readonly convertLabel: string | null;
}

interface ReactionSatMatch {
  readonly cardIds: readonly string[];
  readonly convertLabel: string | null;
}

function resolveReactionCardMatch(
  selfPlayer: PublicPlayerView,
  candidateCards: readonly CardInstance[],
  selection: MatchSelectionState,
  preferredKey: string,
  allowCuuVien = false,
  isEn = false,
): ReactionCardMatch | null {
  const isStrikePref = (k: string) => k === preferredKey || (preferredKey === 'sat' && k === 'pha_giap_tram');
  if (selection.selectedCardIds.length === 1) {
    const picked = candidateCards.find((c) => c.id === selection.selectedCardIds[0]);
    if (picked) {
      if (isStrikePref(picked.cardKey)) {
        return { cardId: picked.id, convertLabel: null };
      }
      if (
        preferredKey === 'thiem' &&
        (selfPlayer.heroId === 'zhao_yun' || selection.activeConvertMode === 'long_dan_thiem') &&
        picked.cardKey === 'sat'
      ) {
        return { cardId: picked.id, convertLabel: isEn ? 'Silver Spear' : 'Ngân Thương Thế' };
      }
      if (
        preferredKey === 'sat' &&
        (selfPlayer.heroId === 'zhao_yun' || selection.activeConvertMode === 'long_dan_sat') &&
        picked.cardKey === 'thiem'
      ) {
        return { cardId: picked.id, convertLabel: isEn ? 'Silver Spear' : 'Ngân Thương Thế' };
      }
      if (
        preferredKey === 'sat' &&
        (selfPlayer.heroId === 'guan_yu' || selection.activeConvertMode === 'wu_sheng') &&
        isCardRed(picked)
      ) {
        return { cardId: picked.id, convertLabel: isEn ? 'Azure Cleave' : 'Thanh Long Trảm' };
      }
      if (
        preferredKey === 'thiem' &&
        (selfPlayer.heroId === 'zhen_ji' || selection.activeConvertMode === 'thanh_quoc') &&
        !isCardRed(picked)
      ) {
        return { cardId: picked.id, convertLabel: isEn ? 'Ink Veil' : 'Huyền Bạch' };
      }
      if (
        preferredKey === 'dao' &&
        (allowCuuVien || selection.activeConvertMode === 'cuu_vien') &&
        isCardRed(picked)
      ) {
        return { cardId: picked.id, convertLabel: isEn ? 'Lifesaving Talisman' : 'Cứu Tử Phù' };
      }
    }
  }
  if (selection.activeConvertMode !== null) {
    return null;
  }
  const direct = candidateCards.find((c) => isStrikePref(c.cardKey));
  return direct ? { cardId: direct.id, convertLabel: null } : null;
}

function findMatchingCardId(
  handCards: readonly CardInstance[],
  selection: MatchSelectionState,
  preferredKey: string,
): string | null {
  if (selection.selectedCardIds.length === 1) {
    const picked = handCards.find((c) => c.id === selection.selectedCardIds[0]);
    if (picked && picked.cardKey === preferredKey) {
      return picked.id;
    }
  }
  const direct = handCards.find((c) => c.cardKey === preferredKey);
  return direct ? direct.id : null;
}

function getPlayButtonSpec(
  cardKey: string,
  handCards: readonly CardInstance[],
  selection: MatchSelectionState,
  players: readonly PublicPlayerView[],
  isEn: boolean,
): { readonly icon: GameIconName; readonly label: string } {
  const locale = isEn ? 'en' : 'vi';
  const firstTargetName = getShortName(players, selection.selectedTargets[0], isEn);
  const secondTargetName = getShortName(players, selection.selectedTargets[1], isEn);
  const selectedCard =
    selection.selectedCardIds.length === 1
      ? handCards.find((c) => c.id === selection.selectedCardIds[0])
      : undefined;
  const selectedName = selectedCard
    ? getCuuChauCardDisplay(selectedCard.cardKey, locale, selectedCard.nameVi).name
    : '';

  if (
    selectedCard &&
    (selectedCard.category === 'WEAPON' ||
      selectedCard.category === 'ARMOR' ||
      selectedCard.category === 'PLUS_ONE_HORSE' ||
      selectedCard.category === 'MINUS_ONE_HORSE')
  ) {
    return {
      icon: getCardGameIcon(selectedCard.cardKey),
      label: isEn ? `Equip ${selectedName}` : `Trang bị ${selectedName}`,
    };
  }

  switch (cardKey) {
    case 'sat':
      if (selection.selectedTargets.length > 1) {
        return {
          icon: 'saber-slash',
          label: isEn
            ? `Blade Strike ${selection.selectedTargets.length} targets`
            : `Đánh Kiếm Trảm vào ${selection.selectedTargets.length} mục tiêu`,
        };
      }
      if (selection.selectedTargets.length === 1) {
        return {
          icon: 'saber-slash',
          label: isEn ? `Blade Strike ${firstTargetName}` : `Đánh Kiếm Trảm vào ${firstTargetName}`,
        };
      }
      return { icon: 'saber-slash', label: isEn ? 'Blade Strike' : 'Đánh Kiếm Trảm' };
    case 'pha_giap_tram':
      if (selection.selectedTargets.length === 1) {
        return {
          icon: 'broadsword',
          label: isEn ? `Armor-Piercing Strike ${firstTargetName}` : `Phá Giáp Trảm vào ${firstTargetName}`,
        };
      }
      return { icon: 'broadsword', label: isEn ? 'Armor-Piercing Strike' : 'Phá Giáp Trảm' };
    case 'dao':
      return { icon: 'heart-plus', label: isEn ? 'Use Elixir Pill (+1 HP)' : 'Dùng Hồi Xuân Đan (+1 sinh lực)' };
    case 'vo_trung_sinh_huu':
      return { icon: 'card-draw', label: isEn ? 'Use Qi Surge' : 'Dùng Tụ Khí Quyết' };
    case 'chan_khi_ho_the':
      return { icon: 'shield', label: isEn ? 'Use Qi Ward' : 'Dùng Chân Khí Hộ Thể' };
    case 'kinh_loi_chan':
      return {
        icon: 'lightning-storm',
        label:
          selection.selectedTargets.length === 1
            ? (isEn ? `Thunderclap Pulse ${firstTargetName}` : `Kinh Lôi Chấn lên ${firstTargetName}`)
            : (isEn ? 'Thunderclap Pulse' : 'Dùng Kinh Lôi Chấn'),
      };
    case 'nam_man_nhap_xam':
      return { icon: 'elephant', label: isEn ? 'Cast Thousand Blades' : 'Phát động Vạn Kiếm Quy Tông' };
    case 'van_tien_te_phat':
      return { icon: 'arrow-cluster', label: isEn ? 'Cast Skyfall Volley' : 'Phát động Loạn Tiễn Xuyên Vân' };
    case 'dao_vien_ket_nghia':
      return { icon: 'flower-twirl', label: isEn ? 'Cast Sect Banquet' : 'Dùng Hội Minh Tụ Nghĩa' };
    case 'ngu_coc_phong_dang':
      return { icon: 'wheat', label: isEn ? 'Cast Vault of Relics' : 'Dùng Thiên Bảo Xuất Thế' };
    case 'quyet_dau':
      return {
        icon: 'duel',
        label:
          selection.selectedTargets.length === 1
            ? (isEn ? `Duel ${firstTargetName}` : `Sinh Tử Lôi Đài với ${firstTargetName}`)
            : (isEn ? 'Challenge Trial by Combat' : 'Khiêu chiến Sinh Tử Lôi Đài'),
      };
    case 'qua_ha_sai_cau':
      return {
        icon: 'bridge',
        label:
          selection.selectedTargets.length === 1
            ? (isEn ? `Break Formation on ${firstTargetName}` : `Phá Trận Chưởng lên ${firstTargetName}`)
            : (isEn ? 'Cast Break Formation' : 'Dùng Phá Trận Chưởng'),
      };
    case 'thuan_thu_khien_duong':
      return {
        icon: 'grab',
        label:
          selection.selectedTargets.length === 1
            ? (isEn ? `Sleight of Hand on ${firstTargetName}` : `Thám Nang Thủ lên ${firstTargetName}`)
            : (isEn ? 'Cast Sleight of Hand' : 'Dùng Thám Nang Thủ'),
      };
    case 'ta_dao_sat_nhan':
      return {
        icon: 'cloak-dagger',
        label:
          selection.selectedTargets.length === 2
            ? (isEn ? `Borrowed Edge: ${firstTargetName} → ${secondTargetName}` : `Tá Kiếm: ${firstTargetName} đánh ${secondTargetName}`)
            : (isEn ? 'Cast Borrowed Edge' : 'Dùng Tá Kiếm Trảm Phong'),
      };
    case 'lac_bat_tu_thuc':
      return {
        icon: 'lantern',
        label:
          selection.selectedTargets.length === 1
            ? (isEn ? `Place Acupoint Seal on ${firstTargetName}` : `Đặt Phong Mạch lên ${firstTargetName}`)
            : (isEn ? 'Place Acupoint Seal' : 'Đặt Điểm Huyệt Phong Mạch'),
      };
    case 'thiem_dien':
      return { icon: 'lightning-storm', label: isEn ? 'Place Sky Tribulation Seal' : 'Đặt Thiên Lôi Kiếp lên bàn' };
    default:
      return {
        icon: getCardGameIcon(selectedCard?.cardKey),
        label: selectedCard ? `${isEn ? 'Use' : 'Dùng'} ${selectedName}` : (isEn ? 'Confirm Action' : 'Thực hiện hành động'),
      };
  }
}

function resolveReactionSatMatch(
  selfPlayer: PublicPlayerView,
  handCards: readonly CardInstance[],
  ownedCards: readonly CardInstance[],
  selection: MatchSelectionState,
  isEn = false,
): ReactionSatMatch | null {
  if (
    selfPlayer.equipments.weapon?.cardKey === 'truong_bat_xa_mau' &&
    selection.selectedCardIds.length === 2 &&
    selection.selectedCardIds.every((id) => handCards.some((c) => c.id === id))
  ) {
    return { cardIds: selection.selectedCardIds, convertLabel: isEn ? 'Shadow Serpent Spear' : 'Xà Ảnh Mâu' };
  }
  const candidates = selfPlayer.heroId === 'guan_yu' ? ownedCards : handCards;
  const single = resolveReactionCardMatch(selfPlayer, candidates, selection, 'sat', false, isEn);
  return single ? { cardIds: [single.cardId], convertLabel: single.convertLabel } : null;
}

export function MatchActionSidebar({
  view,
  selection,
  layout = 'sidebar',
  onClearSelection,
  onSendAction,
  onEndPlayPhase,
}: MatchActionSidebarProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const isEn = locale === 'en';
  const isBar = layout === 'bar';
  const selfSeat = view.viewerSeatIndex;
  const selfPlayer = view.players.find((p) => p.seatIndex === selfSeat);
  const handCards = selfPlayer?.handCards ?? [];
  const ownedCards = getPlayerOwnedCards(selfPlayer);
  const interrupt = view.activeInterrupt;
  const actorPrompt = describePendingActorPrompt(view);

  if (isBar && (!selfPlayer || !selfPlayer.alive)) {
    return null;
  }

  const hasSelection =
    selection.selectedCardIds.length > 0 ||
    selection.selectedTargets.length > 0 ||
    selection.activeSkillMode !== null ||
    selection.activeConvertMode !== null;

  const sidebarShellClass = isBar
    ? 'lkdf-action-bar flex w-auto max-w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-lg border border-[#C89B4B]/45 bg-[#16110E]/96 px-3 py-1.5 shadow-xl'
    : 'flex h-full min-h-0 w-full flex-col justify-between gap-2 rounded-lg border border-[#806345]/45 bg-[#16110E] p-3';
  const btnGroupClass = isBar ? 'flex flex-wrap items-center justify-center gap-2' : 'flex flex-col gap-1.5';
  const reactBtnWidth = isBar ? 'w-auto min-h-[40px]' : 'w-full min-h-[40px]';
  const turnBtnWidth = isBar ? 'w-auto min-h-[38px]' : 'w-full min-h-[38px]';

  // 1. PHẢN ỨNG KHẨN CẤP (ACTIVE INTERRUPT)
  if (interrupt && selfPlayer) {
    if (interrupt.kind === 'WAIT_NULLIFICATION') {
      if (!interrupt.canRespondNullification) return null;
      const nullCardId = findMatchingCardId(handCards, selection, 'vo_giai_kha_kich');
      const canNullify = selfPlayer.alive && nullCardId !== null;
      const nullifyInterrupt = interrupt as typeof interrupt & {
        readonly originalScrollNameVi?: string;
        readonly originalTargetSeat?: number;
        readonly nullifyDepth?: number;
      };
      const origName =
        nullifyInterrupt.originalScrollNameVi ?? interrupt.scrollNameVi ?? (isEn ? 'Scroll' : 'Bí kíp');
      const displayOrigName = formatCuuChauDisplayText(origName, locale);
      const origTargetName = getShortName(
        view.players,
        nullifyInterrupt.originalTargetSeat ?? interrupt.targetSeat,
        isEn,
      );
      const isCounter = (nullifyInterrupt.nullifyDepth ?? 0) % 2 === 1;
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block shrink-0 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
                {isCounter
                  ? isEn
                    ? 'Counter Negate'
                    : 'Phản Hóa Giải'
                  : isEn
                    ? 'Negate Scroll'
                    : 'Chặn Bí kíp'}
              </span>
              <p className="text-xs leading-snug text-[#D1D5DB]">
                {isCounter
                  ? isEn
                    ? 'Counter Negate'
                    : 'Phản Hóa Giải'
                  : isEn
                    ? 'Negate'
                    : 'Chặn'}
                : <strong>{displayOrigName}</strong> →{' '}
                <strong>{origTargetName}</strong>
              </p>
            </div>
          ) : null}
          <div className={btnGroupClass}>
            {canNullify && (origName === 'Nam Man Nhập Xâm' || origName === 'Vạn Tiễn Tề Phát') ? (
              <span className="text-xs text-[#FDE68A]">
                {isEn
                  ? 'Click a True Qi Negation card in hand to negate'
                  : 'Bấm lá Hóa Giải Chân Khí trên tay để chặn'}
              </span>
            ) : canNullify ? (
              <button
                type="button"
                data-primary-action="true"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_NULLIFICATION',
                    seatIndex: selfSeat,
                    cardId: nullCardId,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#C83E37] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D84B43]`}
              >
                <GameIcon name="eye-shield" size={14} />
                <span>{isEn ? 'Play True Qi Negation' : 'Đánh Hóa Giải Chân Khí'}</span>
                {isBar ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
              </button>
            ) : null}
            {selfPlayer.alive ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_NULLIFICATION',
                    seatIndex: selfSeat,
                    cardId: null,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold ${EBONY_ACTION_BTN}`}
              >
                <GameIcon name="ui:skip" size={13} />
                <span>{isEn ? 'Pass Negation' : 'Không dùng Hóa Giải'}</span>
                {isBar ? <kbd className="font-mono-num text-[10px] opacity-75">[Esc]</kbd> : null}
              </button>
            ) : (
              <p className="text-xs text-[#9CA3AF]">
                {isEn ? 'Waiting for other players to respond...' : 'Đang chờ người chơi khác phản ứng...'}
              </p>
            )}
          </div>
        </aside>
      );
    }

    if (
      (interrupt.kind === 'WAIT_DODGE' || interrupt.kind === 'WAIT_AOE_DODGE') &&
      interrupt.targetSeat === selfSeat
    ) {
      const dodgeMatch = resolveReactionCardMatch(selfPlayer, handCards, selection, 'thiem', false, isEn);
      const dodgeCardId = dodgeMatch?.cardId ?? null;
      const isAoe = interrupt.kind === 'WAIT_AOE_DODGE';
      const reqCount = interrupt.requiredCount ?? 1;
      const dodgedCount = interrupt.dodgedSoFar ?? 0;
      const isVoSong = !isAoe && reqCount >= 2;
      const isCaoCaoLord = selfPlayer.heroId === 'cao_cao' && selfPlayer.identity === 'LORD';
      const canUseBagua = Boolean(interrupt.allowBagua && !interrupt.baguaTried);
      const canUseHuJia = Boolean(isCaoCaoLord && !interrupt.huJiaTried);

      return (
        <aside data-dodge-response className={`${sidebarShellClass} border-[#C83E37]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
                {isVoSong
                  ? isEn
                    ? `Unrivaled Strike: Requires ${reqCount} Agility Cards`
                    : `Bá Thể (Cửu Diện Vô Song): Cần ${reqCount} lá Thân Pháp`
                  : isEn
                    ? 'Evade Required'
                    : 'Cần bạn né đòn'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isAoe
                  ? isEn
                    ? 'Hail of Arrows requires playing 1 Agility card.'
                    : 'Mưa Tên Bão Vũ yêu cầu đánh 1 lá Thân Pháp.'
                  : isVoSong
                    ? isEn
                      ? `Unrivaled: need ${reqCount} Agility cards (${dodgedCount}/${reqCount}).`
                      : `Bá Thể: cần ${reqCount} lá Thân Pháp (${dodgedCount}/${reqCount}).`
                    : isEn
                      ? `Agility needed (${dodgedCount}/${reqCount}).`
                      : `Cần Thân Pháp (${dodgedCount}/${reqCount}).`}
              </p>
            </div>
          ) : isVoSong ? (
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn
                ? `Unrivaled: ${reqCount} Agility (${dodgedCount}/${reqCount})`
                : `Bá Thể: Cần ${reqCount} lá Thân Pháp (${dodgedCount}/${reqCount})`}
            </span>
          ) : null}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={dodgeCardId ? 'true' : undefined}
              disabled={!dodgeCardId}
              onClick={() => {
                if (!dodgeCardId) return;
                onSendAction({
                  type: isAoe ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
                  seatIndex: selfSeat,
                  cardId: dodgeCardId,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D84B43] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="sprint" size={14} />
              <span>
                {dodgeMatch?.convertLabel
                  ? isEn
                    ? `Play Agility (${dodgeMatch.convertLabel})`
                    : `Đánh Thân Pháp (${dodgeMatch.convertLabel})`
                  : isAoe
                    ? isEn
                      ? 'Play Agility vs Arrow Hail'
                      : 'Đánh Thân Pháp né Mưa Tên'
                    : isEn
                      ? 'Play Agility to Evade'
                      : 'Đánh Thân Pháp né đòn'}
              </span>
              {isBar && dodgeCardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            {canUseBagua ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: isAoe ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
                    seatIndex: selfSeat,
                    cardId: null,
                    useBagua: true,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#D99B26]/60 bg-[#D99B26]/15 px-3.5 py-2 text-xs font-semibold text-[#FDE68A] hover:bg-[#D99B26]/25`}
              >
                <GameIcon name="yin-yang" size={13} />
                {isEn ? 'Eight Trigrams Judgment' : 'Phán xét Bát Quái Trận'}
              </button>
            ) : null}
            {canUseHuJia ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: isAoe ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
                    seatIndex: selfSeat,
                    cardId: null,
                    useHuJia: true,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#3B82F6]/60 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-[#93C5FD] hover:bg-[#3B82F6]/25`}
              >
                <GameIcon name="bordered-shield" size={13} />
                {isEn ? 'Call Wei Escort' : 'Xin Ngụy Hộ Giá'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: isAoe ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
                  seatIndex: selfSeat,
                  cardId: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${EBONY_DANGER_GHOST_BTN}`}
            >
              <GameIcon name="death-skull" size={13} />
              {isEn ? 'Take 1 Damage' : 'Chịu mất 1 máu'}
            </button>
          </div>
        </aside>
      );
    }

    if (
      interrupt.kind === 'WAIT_COLLATERAL_SAT'
        ? interrupt.attackerSeat === selfSeat
        : (interrupt.kind === 'WAIT_AOE_SAT' || interrupt.kind === 'WAIT_DUEL_SAT') &&
          interrupt.targetSeat === selfSeat
    ) {
      const satMatch = resolveReactionSatMatch(selfPlayer, handCards, ownedCards, selection, isEn);
      const satCardIds = satMatch?.cardIds ?? null;
      const isCollateral = interrupt.kind === 'WAIT_COLLATERAL_SAT';
      const isDuelVoSong =
        interrupt.kind === 'WAIT_DUEL_SAT' && (interrupt.requiredCount ?? 1) >= 2;
      const actionType =
        interrupt.kind === 'WAIT_AOE_SAT'
          ? 'RESPOND_AOE_SAT'
          : interrupt.kind === 'WAIT_DUEL_SAT'
            ? 'RESPOND_DUEL_SAT'
            : 'RESPOND_COLLATERAL_SAT';
      const hasShuAlly = view.players.some(
        (p) =>
          p.alive &&
          p.seatIndex !== selfSeat &&
          p.heroId !== null &&
          getHeroDefinition(p.heroId).faction === 'SHU',
      );
      const canUseJiJiang = Boolean(
        selfPlayer.heroId === 'liu_bei' &&
          selfPlayer.identity === 'LORD' &&
          !interrupt.jiJiangTried &&
          hasShuAlly,
      );

      return (
        <aside className={`${sidebarShellClass} border-[#C83E37]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
                {isDuelVoSong
                  ? isEn
                    ? `Unrivaled Strike: Requires ${interrupt.requiredCount} Strikes`
                    : `Bá Thể (Cửu Diện Vô Song): Cần ${interrupt.requiredCount} lá Kiếm Trảm`
                  : isEn
                    ? 'Strike Required'
                    : 'Cần đánh Kiếm Trảm'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isCollateral
                  ? isEn
                    ? `Strike ${getShortName(view.players, interrupt.targetSeat, isEn)} or hand over your Weapon.`
                    : `Đánh Kiếm Trảm vào ${getShortName(view.players, interrupt.targetSeat, isEn)} hoặc giao Binh khí.`
                  : isDuelVoSong
                    ? isEn
                      ? `Unrivaled: ${interrupt.requiredCount} Strikes needed (${interrupt.dodgedSoFar ?? 0}/${interrupt.requiredCount}).`
                      : `Bá Thể: Cần ${interrupt.requiredCount} lá Kiếm Trảm (${interrupt.dodgedSoFar ?? 0}/${interrupt.requiredCount}).`
                    : isEn
                      ? 'Choose 1 Strike card to respond.'
                      : 'Chọn 1 lá Kiếm Trảm để hưởng ứng.'}
              </p>
            </div>
          ) : isCollateral ? (
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn ? 'Borrowed Blade' : 'Tá Kiếm'} → {getShortName(view.players, interrupt.targetSeat, isEn)}
            </span>
          ) : isDuelVoSong ? (
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn
                ? `Unrivaled: ${interrupt.requiredCount} Strikes (${interrupt.dodgedSoFar ?? 0}/${interrupt.requiredCount})`
                : `Bá Thể: Cần ${interrupt.requiredCount} lá Kiếm Trảm (${interrupt.dodgedSoFar ?? 0}/${interrupt.requiredCount})`}
            </span>
          ) : null}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={satCardIds ? 'true' : undefined}
              disabled={!satCardIds}
              onClick={() => {
                if (!satCardIds) return;
                onSendAction({
                  type: actionType,
                  seatIndex: selfSeat,
                  cardIds: satCardIds,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D84B43] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="saber-slash" size={14} />
              <span>
                {satMatch?.convertLabel
                  ? isEn
                    ? `Play Strike (${satMatch.convertLabel})`
                    : `Đánh Kiếm Trảm (${satMatch.convertLabel})`
                  : interrupt.kind === 'WAIT_AOE_SAT'
                    ? isEn
                      ? 'Play Strike vs Beast Tide'
                      : 'Đánh Kiếm Trảm đáp Thú Triều'
                    : isEn
                      ? 'Play Strike to Respond'
                      : 'Đánh Kiếm Trảm để hưởng ứng'}
              </span>
              {isBar && satCardIds ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            {canUseJiJiang ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: actionType,
                    seatIndex: selfSeat,
                    cardIds: null,
                    useJiJiang: true,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#C83E37]/60 bg-[#C83E37]/15 px-3.5 py-2 text-xs font-semibold text-[#FCA5A5] hover:bg-[#C83E37]/25`}
              >
                <GameIcon name="saber-slash" size={13} />
                {isEn ? 'Call Azure Cloud Edict' : 'Xin Thanh Vân Vân Lệnh'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: actionType,
                  seatIndex: selfSeat,
                  cardIds: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_DANGER_GHOST_BTN} px-3.5 py-2 text-xs font-semibold`}
            >
              <GameIcon name={isCollateral ? 'broadsword' : 'death-skull'} size={13} />
              {isCollateral
                ? isEn
                  ? 'Hand Over Weapon'
                  : 'Giao Vũ khí'
                : isEn
                  ? 'Take 1 Damage'
                  : 'Chịu mất 1 máu'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_PEACH_RESCUE' && interrupt.responderSeat === selfSeat) {
      const canHuaTuoEquipRescue =
        selfPlayer.heroId === 'hua_tuo' && view.currentTurnSeat !== selfSeat;
      const daoMatch = resolveReactionCardMatch(
        selfPlayer,
        canHuaTuoEquipRescue ? ownedCards : handCards,
        selection,
        'dao',
        canHuaTuoEquipRescue,
        isEn,
      );
      const daoCardId = daoMatch?.cardId ?? null;
      const dyingName = getShortName(view.players, interrupt.targetSeat, isEn);
      return (
        <aside className={`${sidebarShellClass} border-[#C83E37]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
                {isEn ? 'Brink of Death Rescue' : 'Cầu cứu hấp hối'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isEn ? (
                  <>
                    <strong>{dyingName}</strong> is on the brink (0 HP). Use Spirit Peach to rescue?
                  </>
                ) : (
                  <>
                    <strong>{dyingName}</strong> đang hấp hối (0 máu). Dùng Đào cứu?
                  </>
                )}
              </p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn ? `Save ${dyingName} (0 HP)` : `Cứu ${dyingName} (0 máu)`}
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={daoCardId ? 'true' : undefined}
              disabled={!daoCardId}
              onClick={() => {
                if (!daoCardId) return;
                onSendAction({
                  type: 'RESPOND_PEACH_RESCUE',
                  seatIndex: selfSeat,
                  cardId: daoCardId,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="heart-plus" size={14} />
              <span>
                {daoMatch?.convertLabel
                  ? isEn
                    ? `Rescue ${dyingName} (${daoMatch.convertLabel})`
                    : `Dùng Đào cứu ${dyingName} (${daoMatch.convertLabel})`
                  : isEn
                    ? `Use Peach to Save ${dyingName}`
                    : `Dùng Đào cứu ${dyingName}`}
              </span>
              {isBar && daoCardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_PEACH_RESCUE',
                  seatIndex: selfSeat,
                  cardId: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3.5 py-2 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Do Not Rescue' : 'Không cứu'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_TU_HUNG' && interrupt.targetSeat === selfSeat) {
      const pickedCardId = selection.selectedCardIds[0] ?? null;
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
                {isEn ? 'Twin Yin-Yang Blades' : 'Song Cổ Ngũ Hành Kiếm'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isEn
                  ? 'Choose 1 hand card to discard, or let the attacker draw 1 card.'
                  : 'Chọn 1 lá trên tay để bỏ, hoặc để đối thủ rút 1 lá.'}
              </p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              {isEn ? 'Twin Blades' : 'Song Cổ Kiếm'}
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={pickedCardId ? 'true' : undefined}
              disabled={!pickedCardId}
              onClick={() => {
                if (!pickedCardId) return;
                onSendAction({
                  type: 'RESPOND_TU_HUNG',
                  seatIndex: selfSeat,
                  choice: 'DISCARD_HAND',
                  discardCardId: pickedCardId,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="ui:trash" size={13} />
              <span>{isEn ? 'Discard Selected Card' : 'Bỏ 1 lá bài đã chọn'}</span>
              {isBar && pickedCardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_TU_HUNG',
                  seatIndex: selfSeat,
                  choice: 'ALLOW_DRAW',
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-2 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Let Opponent Draw 1' : 'Để đối thủ rút 1 lá'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_QUAN_THACH_PHU' && interrupt.sourceSeat === selfSeat) {
      const weaponId = selfPlayer.equipments.weapon?.id;
      const validDiscardIds = selection.selectedCardIds.filter((id) => id !== weaponId);
      const ready = validDiscardIds.length === 2;
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          <div className={isBar ? 'flex items-center gap-2' : 'space-y-1'}>
            <span className="inline-block shrink-0 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              {isEn ? 'Armor-Breaching Axe' : 'Phá Thạch Phủ'}
            </span>
            <p className="text-xs text-[#D1D5DB]">
              {isEn
                ? `Select 2 cards (${validDiscardIds.length}/2) to force the Strike through (Weapon excluded).`
                : `Chọn 2 lá (${validDiscardIds.length}/2) để ép Sát trúng (trừ Vũ khí).`}
            </p>
          </div>
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={ready ? 'true' : undefined}
              disabled={!ready}
              onClick={() => {
                if (!ready) return;
                onSendAction({
                  type: 'RESPOND_QUAN_THACH_PHU',
                  seatIndex: selfSeat,
                  activate: true,
                  discardCardIds: [validDiscardIds[0]!, validDiscardIds[1]!],
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="stone-axe" size={13} />
              <span>{isEn ? 'Discard 2 to Force Strike' : 'Bỏ 2 lá ép trúng Sát'}</span>
              {isBar && ready ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_QUAN_THACH_PHU',
                  seatIndex: selfSeat,
                  activate: false,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-2 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Do Not Activate' : 'Không kích hoạt'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_THANH_LONG' && interrupt.sourceSeat === selfSeat) {
      const satMatch = resolveReactionCardMatch(
        selfPlayer,
        selfPlayer.heroId === 'guan_yu' ? ownedCards : handCards,
        selection,
        'sat',
        false,
        isEn,
      );
      const satCardId = satMatch?.cardId ?? null;
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          <div className={isBar ? 'flex items-center gap-2' : 'space-y-1'}>
            <span className="inline-block shrink-0 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              {isEn ? 'Azure Halberd' : 'Thanh Long Kích'}
            </span>
            <p className="text-xs text-[#D1D5DB]">
              {isEn ? 'Follow up with 1 pursuit Strike?' : 'Đánh tiếp 1 lá Sát truy kích?'}
            </p>
          </div>
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={satCardId ? 'true' : undefined}
              disabled={!satCardId}
              onClick={() => {
                if (!satCardId) return;
                onSendAction({
                  type: 'RESPOND_THANH_LONG',
                  seatIndex: selfSeat,
                  cardIds: [satCardId],
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="glaive" size={14} />
              <span>
                {satMatch?.convertLabel
                  ? isEn
                    ? `Pursuit Strike (${satMatch.convertLabel})`
                    : `Đánh thêm Sát (${satMatch.convertLabel})`
                  : isEn
                    ? 'Play Pursuit Strike'
                    : 'Đánh thêm Sát truy kích'}
              </span>
              {isBar && satCardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_THANH_LONG',
                  seatIndex: selfSeat,
                  cardIds: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-2 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Stop Pursuit' : 'Không truy kích'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_HAN_BANG_KIEM' && interrupt.sourceSeat === selfSeat) {
      if (isBar) {
        return null;
      }
      const targetPlayer = view.players.find((p) => p.seatIndex === interrupt.targetSeat);
      const remaining = interrupt.remainingDiscards ?? 2;
      const isLuoYi =
        selfPlayer.heroId === 'xu_chu' &&
        view.turnFlags?.luoYiActive &&
        view.currentTurnSeat === selfSeat;
      const skipLabel =
        remaining === 1
          ? isEn
            ? 'Stop Discarding'
            : 'Dừng hủy bài'
          : isLuoYi
            ? isEn
              ? 'Deal 2 Damage Normally'
              : 'Gây 2 sát thương như thường'
            : isEn
              ? 'Deal 1 Damage Normally'
              : 'Gây 1 sát thương như thường';
      const targetName = getShortName(view.players, interrupt.targetSeat, isEn);
      const equipZones: readonly {
        readonly zone: 'WEAPON' | 'ARMOR' | 'PLUS_ONE_HORSE' | 'MINUS_ONE_HORSE';
        readonly label: string;
      }[] = [
        ...(targetPlayer?.equipments.weapon
          ? [
              {
                zone: 'WEAPON' as const,
                label: `${isEn ? 'Weapon' : 'Vũ khí'} (${getCuuChauCardDisplay(targetPlayer.equipments.weapon.cardKey, locale, targetPlayer.equipments.weapon.nameVi).name})`,
              },
            ]
          : []),
        ...(targetPlayer?.equipments.armor
          ? [
              {
                zone: 'ARMOR' as const,
                label: `${isEn ? 'Armor' : 'Giáp'} (${getCuuChauCardDisplay(targetPlayer.equipments.armor.cardKey, locale, targetPlayer.equipments.armor.nameVi).name})`,
              },
            ]
          : []),
        ...(targetPlayer?.equipments.plusOneHorse
          ? [
              {
                zone: 'PLUS_ONE_HORSE' as const,
                label: `${isEn ? 'Steed +1' : 'Ngựa +1'} (${getCuuChauCardDisplay(targetPlayer.equipments.plusOneHorse.cardKey, locale, targetPlayer.equipments.plusOneHorse.nameVi).name})`,
              },
            ]
          : []),
        ...(targetPlayer?.equipments.minusOneHorse
          ? [
              {
                zone: 'MINUS_ONE_HORSE' as const,
                label: `${isEn ? 'Steed -1' : 'Ngựa -1'} (${getCuuChauCardDisplay(targetPlayer.equipments.minusOneHorse.cardKey, locale, targetPlayer.equipments.minusOneHorse.nameVi).name})`,
              },
            ]
          : []),
      ];

      return (
        <aside className={`${sidebarShellClass} border-[#3B82F6]/60`}>
          <div className={isBar ? 'flex items-center gap-2' : 'space-y-1'}>
            <span className="inline-block shrink-0 rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
              {isEn ? `Frostbite Blade (${remaining}/2)` : `Hàn Băng Kiếm (${remaining}/2)`}
            </span>
            <p className="text-xs text-[#D1D5DB]">
              {isEn ? (
                <>
                  Pick a card of <strong>{targetName}</strong> to discard instead of damage:
                </>
              ) : (
                <>
                  Chọn lá của <strong>{targetName}</strong> để hủy thay sát thương:
                </>
              )}
            </p>
          </div>
          <div className={isBar ? 'flex flex-wrap items-center justify-center gap-1.5' : 'flex flex-col gap-1.5'}>
            <BlindHandCardFan
              count={targetPlayer?.handCount ?? 0}
              ariaVerb="Hủy"
              tone="crimson"
              onPickIndex={(idx) => {
                onSendAction({
                  type: 'RESPOND_HAN_BANG_KIEM',
                  seatIndex: selfSeat,
                  activate: true,
                  picks: [{ zone: 'HAND', handIndex: idx }],
                });
                onClearSelection();
              }}
            />
            {equipZones.map((item) => (
              <button
                key={item.zone}
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_HAN_BANG_KIEM',
                    seatIndex: selfSeat,
                    activate: true,
                    picks: [{ zone: item.zone }],
                  });
                  onClearSelection();
                }}
                className="inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#C83E37] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#D84B43]"
              >
                <GameIcon name="ui:trash" size={12} />
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_HAN_BANG_KIEM',
                  seatIndex: selfSeat,
                  activate: false,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {skipLabel}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_KY_LAN_CUNG' && interrupt.sourceSeat === selfSeat) {
      const targetPlayer = view.players.find((p) => p.seatIndex === interrupt.targetSeat);
      const hasPlusHorse = Boolean(targetPlayer?.equipments.plusOneHorse);
      const hasMinusHorse = Boolean(targetPlayer?.equipments.minusOneHorse);
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          <span className="inline-block shrink-0 rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
            {isEn ? 'Gale Recurve' : 'Truy Phong Cung'}
          </span>
          <div className={btnGroupClass}>
            {hasPlusHorse ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_KY_LAN_CUNG',
                    seatIndex: selfSeat,
                    horseZone: 'PLUS_ONE_HORSE',
                  });
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white`}
              >
                <GameIcon name="bow-arrow" size={13} />
                {isEn ? 'Discard +1 Footwork' : 'Hủy Khinh công +1 của mục tiêu'}
              </button>
            ) : null}
            {hasMinusHorse ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_KY_LAN_CUNG',
                    seatIndex: selfSeat,
                    horseZone: 'MINUS_ONE_HORSE',
                  });
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white`}
              >
                <GameIcon name="bow-arrow" size={13} />
                {isEn ? 'Discard -1 Steed' : 'Hủy Thân pháp -1 của mục tiêu'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_KY_LAN_CUNG',
                  seatIndex: selfSeat,
                  horseZone: null,
                });
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Keep Mounts' : 'Không hủy thú cưỡi'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_TU_XI' && interrupt.targetSeat === selfSeat) {
      const picked = selection.selectedTargets.slice(0, 2);
      const ready = picked.length > 0;
      return (
        <aside className={`${sidebarShellClass} border-[#3B82F6]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
                {isEn ? 'Ration Raid' : 'Đoạt Lương'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isEn ? `Pick 1–2 highlighted opponents to take 1 card each (${picked.length}/2).` : `Chọn 1–2 đối thủ sáng viền vàng để rút mỗi người 1 lá (${picked.length}/2).`}
              </p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
              {isEn ? 'Ration Raid' : 'Đoạt Lương'} ({picked.length}/2)
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={ready ? 'true' : undefined}
              disabled={!ready}
              onClick={() => {
                if (!ready) return;
                onSendAction({
                  type: 'RESPOND_TU_XI',
                  seatIndex: selfSeat,
                  targetSeats: picked,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="grab" size={13} />
              <span>{isEn ? `Raid ${picked.length} Target(s)` : `Rút bài từ ${picked.length} mục tiêu`}</span>
              {isBar && ready ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_TU_XI',
                  seatIndex: selfSeat,
                  targetSeats: [],
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Draw Normally' : 'Rút bài bình thường'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'ASK_LIU_LI' && interrupt.targetSeat === selfSeat) {
      const cardId = selection.selectedCardIds[0] ?? null;
      const newTargetSeat = selection.selectedTargets[0] ?? null;
      const ready = cardId !== null && newTargetSeat !== null;
      return (
        <aside className={`${sidebarShellClass} border-[#10B981]/60`}>
          <div className={isBar ? 'flex items-center gap-2' : 'space-y-1'}>
            <span className="inline-block shrink-0 rounded bg-[#10B981]/20 px-2 py-0.5 text-[11px] font-bold text-[#34D399]">
              {isEn ? 'Flowing Mirage' : 'Chuyển Hoa Ảnh'}
            </span>
            <p className="text-xs text-[#D1D5DB]">
              {isEn ? 'Pick 1 card and 1 valid fighter in range to redirect the Strike.' : 'Chọn 1 lá bài và 1 mục tiêu trong tầm đánh để chuyển Kiếm Trảm.'}
            </p>
          </div>
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={ready ? 'true' : undefined}
              disabled={!ready}
              onClick={() => {
                if (!ready) return;
                onSendAction({
                  type: 'RESPOND_LIU_LI',
                  seatIndex: selfSeat,
                  activate: true,
                  discardCardId: cardId,
                  newTargetSeat,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="ui:convert" size={13} />
              <span>{isEn ? `Redirect Strike → ${getShortName(view.players, newTargetSeat, true)}` : `Chuyển Kiếm Trảm sang ${getShortName(view.players, newTargetSeat)}`}</span>
              {isBar && ready ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_LIU_LI',
                  seatIndex: selfSeat,
                  activate: false,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Decline Redirect' : 'Không chuyển'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_GUI_CAI' && interrupt.targetSeat === selfSeat) {
      const cardId = selection.selectedCardIds[0] ?? null;
      const judgeText = interrupt.judgeCard
        ? formatCardShort(interrupt.judgeCard)
        : (isEn ? 'current card' : 'lá hiện tại');
      const judgeReason = interrupt.judgePurpose ? ` (${interrupt.judgePurpose})` : '';
      return (
        <aside className={`${sidebarShellClass} border-[#3B82F6]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
                {isEn ? 'Fate Reversal' : 'Đảo Mệnh'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isEn ? <>Judgment is <strong>{judgeText}</strong>{judgeReason}. Pick 1 hand card to replace.</> : <>Lá phán xét là <strong>{judgeText}</strong>{judgeReason}. Chọn 1 lá trên tay để thay thế.</>}
              </p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
              {isEn ? 'Fate Reversal' : 'Đảo Mệnh'} ({judgeText}{judgeReason})
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={cardId ? 'true' : undefined}
              disabled={!cardId}
              onClick={() => {
                if (!cardId) return;
                onSendAction({
                  type: 'RESPOND_GUI_CAI',
                  seatIndex: selfSeat,
                  cardId,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="lightning-storm" size={13} />
              <span>{isEn ? 'Swap Judgment Card' : 'Đổi lá phán xét'}</span>
              {isBar && cardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_GUI_CAI',
                  seatIndex: selfSeat,
                  cardId: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Keep Judgment' : 'Giữ nguyên lá phán xét'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_GANG_LIE_CHOICE' && interrupt.targetSeat === selfSeat) {
      const ready = selection.selectedCardIds.length === 2;
      return (
        <aside className={`${sidebarShellClass} border-[#C83E37]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
                {isEn ? 'Fierce Counter' : 'Hàn Khí Phản'}
              </span>
              <p className="text-xs text-[#D1D5DB]">
                {isEn
                  ? `Select 2 hand cards (${selection.selectedCardIds.length}/2) to discard or take 1 damage.`
                  : `Chọn 2 lá trên tay (${selection.selectedCardIds.length}/2) để bỏ hoặc chịu 1 sát thương.`}
              </p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn ? 'Fierce Counter' : 'Hàn Khí Phản'} ({selection.selectedCardIds.length}/2)
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={ready ? 'true' : undefined}
              disabled={!ready}
              onClick={() => {
                if (!ready) return;
                onSendAction({
                  type: 'RESPOND_GANG_LIE_CHOICE',
                  seatIndex: selfSeat,
                  choice: 'DISCARD_TWO',
                  discardCardIds: [
                    selection.selectedCardIds[0]!,
                    selection.selectedCardIds[1]!,
                  ],
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="ui:trash" size={13} />
              <span>{isEn ? 'Discard 2 Cards' : 'Bỏ 2 lá bài đã chọn'}</span>
              {isBar && ready ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_GANG_LIE_CHOICE',
                  seatIndex: selfSeat,
                  choice: 'TAKE_DAMAGE',
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_DANGER_GHOST_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="death-skull" size={13} />
              {isEn ? 'Take 1 Damage' : 'Chịu 1 sát thương'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_FAN_JIAN_GUESS' && interrupt.targetSeat === selfSeat) {
      const suits: readonly { readonly suit: Suit; readonly label: string }[] = [
        { suit: 'SPADE', label: isEn ? 'Guess Spade' : 'Đoán Bích' },
        { suit: 'HEART', label: isEn ? 'Guess Heart' : 'Đoán Cơ' },
        { suit: 'CLUB', label: isEn ? 'Guess Club' : 'Đoán Chuồn' },
        { suit: 'DIAMOND', label: isEn ? 'Guess Diamond' : 'Đoán Rô' },
      ];
      return (
        <aside className={`${sidebarShellClass} border-[#10B981]/60`}>
          <div className="space-y-1">
            <span className="inline-block rounded bg-[#10B981]/20 px-2 py-0.5 text-[11px] font-bold text-[#34D399]">
              {isEn ? 'Mind Gambit' : 'Đoán Tâm Mưu'}
            </span>
            <p className="text-xs text-[#D1D5DB]">
              {isEn ? 'Pick a suit before revealing a card. Wrong guess deals 1 damage.' : 'Chọn một chất trước khi bàn lật lá. Đoán sai mất 1 sinh lực.'}
            </p>
          </div>
          <div className={isBar ? 'flex flex-wrap items-center gap-1.5' : 'grid grid-cols-2 gap-1.5'}>
            {suits.map((item) => (
              <button
                key={item.suit}
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_FAN_JIAN_GUESS',
                    seatIndex: selfSeat,
                    suit: item.suit,
                  });
                }}
                className={`inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${EBONY_ACTION_BTN}`}
              >
                <SuitGlyph suit={item.suit} size={12} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_JI_JIANG' && interrupt.responderSeat === selfSeat) {
      const satMatch = resolveReactionSatMatch(selfPlayer, handCards, ownedCards, selection, isEn);
      const satCardIds = satMatch?.cardIds ?? null;
      return (
        <aside className={`${sidebarShellClass} border-[#C83E37]/60`}>
          <div className={isBar ? 'flex items-center gap-2' : 'space-y-1'}>
            <span className="inline-block shrink-0 rounded bg-[#C83E37]/25 px-2 py-0.5 text-[11px] font-bold text-[#FCA5A5]">
              {isEn ? 'Cloud Command' : 'Vân Lệnh'}
            </span>
            <p className="text-xs text-[#D1D5DB]">{isEn ? 'Sovereign calls for a Blade Strike.' : 'Minh Chủ xin đánh Kiếm Trảm hộ.'}</p>
          </div>
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={satCardIds ? 'true' : undefined}
              disabled={!satCardIds}
              onClick={() => {
                if (!satCardIds) return;
                onSendAction({
                  type: 'RESPOND_JI_JIANG',
                  seatIndex: selfSeat,
                  cardIds: satCardIds,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="saber-slash" size={14} />
              <span>
                {satMatch?.convertLabel
                  ? (isEn ? `Strike for Sovereign (${satMatch.convertLabel})` : `Đánh Kiếm Trảm giúp Minh Chủ (${satMatch.convertLabel})`)
                  : (isEn ? 'Strike for Sovereign' : 'Đánh Kiếm Trảm giúp Minh Chủ')}
              </span>
              {isBar && satCardIds ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_JI_JIANG',
                  seatIndex: selfSeat,
                  cardIds: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Pass' : 'Không có Kiếm Trảm giúp'}
            </button>
          </div>
        </aside>
      );
    }

    if (interrupt.kind === 'WAIT_HU_JIA' && interrupt.responderSeat === selfSeat) {
      const dodgeMatch = resolveReactionCardMatch(selfPlayer, handCards, selection, 'thiem', false, isEn);
      const dodgeCardId = dodgeMatch?.cardId ?? null;
      const canUseBagua = Boolean(
        selfPlayer.equipments.armor?.cardKey === 'bat_quai_tran' && !interrupt.baguaTried,
      );
      return (
        <aside className={`${sidebarShellClass} border-[#3B82F6]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
                {isEn ? 'Iron Aegis' : 'Huyền Giáp Vệ'}
              </span>
              <p className="text-xs text-[#D1D5DB]">{isEn ? 'Sovereign calls for a Shadow Step.' : 'Minh Chủ xin đánh Thân Pháp hộ.'}</p>
            </div>
          ) : (
            <span className="inline-block shrink-0 rounded bg-[#3B82F6]/20 px-2 py-0.5 text-[11px] font-bold text-[#93C5FD]">
              {isEn ? 'Iron Aegis' : 'Huyền Giáp Vệ'}
            </span>
          )}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={dodgeCardId ? 'true' : undefined}
              disabled={!dodgeCardId}
              onClick={() => {
                if (!dodgeCardId) return;
                onSendAction({
                  type: 'RESPOND_HU_JIA',
                  seatIndex: selfSeat,
                  cardId: dodgeCardId,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name="sprint" size={14} />
              <span>
                {dodgeMatch?.convertLabel
                  ? (isEn ? `Dodge for Sovereign (${dodgeMatch.convertLabel})` : `Đánh Thân Pháp hộ Minh Chủ (${dodgeMatch.convertLabel})`)
                  : (isEn ? 'Dodge for Sovereign' : 'Đánh Thân Pháp hộ Minh Chủ')}
              </span>
              {isBar && dodgeCardId ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            {canUseBagua ? (
              <button
                type="button"
                onClick={() => {
                  onSendAction({
                    type: 'RESPOND_HU_JIA',
                    seatIndex: selfSeat,
                    cardId: null,
                    useBagua: true,
                  });
                  onClearSelection();
                }}
                className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#D99B26]/60 bg-[#D99B26]/15 px-3 py-2 text-xs font-semibold text-[#FDE68A] hover:bg-[#D99B26]/25`}
              >
                <GameIcon name="yin-yang" size={13} />
                {isEn ? 'Judge Eight Trigrams Robe' : 'Phán xét Bát Quái Y hộ'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'RESPOND_HU_JIA',
                  seatIndex: selfSeat,
                  cardId: null,
                });
                onClearSelection();
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {isEn ? 'Pass' : 'Không có Thân Pháp hộ'}
            </button>
          </div>
        </aside>
      );
    }

    const tianDoCardText =
      interrupt.kind === 'ASK_TIAN_DO' && interrupt.judgeCard
        ? formatCardShort(interrupt.judgeCard)
        : null;
    const jianXiongCardText =
      interrupt.kind === 'ASK_JIAN_XIONG'
        ? describeJianXiongDamageCard(view, selfSeat)
        : null;
    const binarySkillMap: Partial<
      Record<
        typeof interrupt.kind,
        {
          readonly title: string;
          readonly desc: string;
          readonly yesIcon: GameIconName;
          readonly yesLabel: string;
          readonly noLabel: string;
          readonly actionType:
            | 'RESPOND_LUO_SHEN'
            | 'RESPOND_LUO_YI'
            | 'RESPOND_KE_JI'
            | 'RESPOND_TIE_QI'
            | 'RESPOND_TIAN_DO'
            | 'RESPOND_JIAN_XIONG'
            | 'RESPOND_FAN_KUI'
            | 'RESPOND_GANG_LIE';
        }
      >
    > = {
      ASK_LUO_SHEN: {
        title: isEn ? 'Ink Veil' : 'Thủy Nguyệt',
        desc: isEn ? 'Flip top deck card; keep Black cards and continue.' : 'Phán xét lá đầu chồng bài rút (nếu Đen được giữ và lật tiếp).',
        yesIcon: 'ui:sparkles',
        yesLabel: isEn ? 'Start Ink Veil' : 'Bắt đầu Thủy Nguyệt',
        noLabel: isEn ? 'Stop Ink Veil' : 'Dừng Thủy Nguyệt',
        actionType: 'RESPOND_LUO_SHEN',
      },
      ASK_LUO_YI: {
        title: isEn ? 'Armor Piercing' : 'Phá Giáp',
        desc: isEn ? 'Draw 1 fewer card for +1 Strike & Duel damage this turn.' : 'Rút ít hơn 1 lá nhưng Kiếm Trảm & Sinh Tử Lôi Đài gây +1 sát thương lượt này.',
        yesIcon: 'broadsword',
        yesLabel: isEn ? 'Activate Armor Piercing' : 'Kích hoạt Phá Giáp',
        noLabel: isEn ? 'Draw Normally' : 'Rút bài bình thường',
        actionType: 'RESPOND_LUO_YI',
      },
      ASK_KE_JI: {
        title: isEn ? 'Still Guard' : 'Tĩnh Thủ',
        desc: isEn ? 'Skip Discard phase (and draw +1 card under Nine Realms rules).' : 'Bạn chưa dùng Kiếm Trảm trong lượt — có thể bỏ qua pha bỏ bài và rút +1 lá.',
        yesIcon: 'bordered-shield',
        yesLabel: isEn ? 'Activate Still Guard' : 'Kích hoạt Tĩnh Thủ',
        noLabel: isEn ? 'Discard Normally' : 'Bỏ bài bình thường',
        actionType: 'RESPOND_KE_JI',
      },
      ASK_TIE_QI: {
        title: isEn ? 'Iron Cavalry' : 'Thiết Kỵ Trảm',
        desc: isEn ? 'Judge: if Red, target cannot play Shadow Step.' : 'Phán xét: nếu ra chất Đỏ, mục tiêu không thể dùng Thân Pháp.',
        yesIcon: 'cavalry',
        yesLabel: isEn ? 'Judge Iron Cavalry' : 'Phán xét Thiết Kỵ Trảm',
        noLabel: isEn ? 'Decline' : 'Không dùng Thiết Kỵ Trảm',
        actionType: 'RESPOND_TIE_QI',
      },
      ASK_TIAN_DO: {
        title: isEn ? 'Heavenly Claim' : 'Thiên Mệnh Thu',
        desc: tianDoCardText
          ? (isEn ? `Claim Judgment card ${tianDoCardText} to hand.` : `Thu lấy lá phán xét ${tianDoCardText} về tay.`)
          : (isEn ? 'Claim resolved Judgment card.' : 'Lấy lá bài phán xét vừa lật về tay.'),
        yesIcon: 'card-draw',
        yesLabel: tianDoCardText
          ? (isEn ? `Claim ${tianDoCardText}` : `Lấy ${tianDoCardText} (Thiên Mệnh Thu)`)
          : (isEn ? 'Claim Judgment Card' : 'Lấy lá phán xét (Thiên Mệnh Thu)'),
        noLabel: isEn ? 'Skip Claim' : 'Bỏ qua Thiên Mệnh Thu',
        actionType: 'RESPOND_TIAN_DO',
      },
      ASK_JIAN_XIONG: {
        title: isEn ? 'Iron Hegemon' : 'Hấp Tinh Chiêu',
        desc: jianXiongCardText
          ? (isEn ? `Claim ${jianXiongCardText} to hand and draw +1 card.` : `Thu lấy ${jianXiongCardText} về tay và rút thêm 1 lá.`)
          : (isEn ? 'Claim damaging card(s) to hand and draw +1.' : 'Lấy lá bài gây sát thương về tay và rút thêm 1 lá.'),
        yesIcon: 'card-pickup',
        yesLabel: jianXiongCardText
          ? (isEn ? `Claim ${jianXiongCardText} (+1 Draw)` : `Lấy ${jianXiongCardText} (+1 rút)`)
          : (isEn ? 'Claim Damaging Card' : 'Lấy bài gây sát thương'),
        noLabel: isEn ? 'Decline' : 'Không lấy bài',
        actionType: 'RESPOND_JIAN_XIONG',
      },
      ASK_FAN_KUI: {
        title: isEn ? 'Retaliate' : 'Hồi Hưởng',
        desc: isEn ? `Take 1 card from ${getShortName(view.players, interrupt.sourceSeat, true)}.` : `Lấy 1 lá bài từ ${getShortName(view.players, interrupt.sourceSeat)}.`,
        yesIcon: 'grab',
        yesLabel: isEn ? `Take 1 card from ${getShortName(view.players, interrupt.sourceSeat, true)}` : `Lấy 1 lá của ${getShortName(view.players, interrupt.sourceSeat)}`,
        noLabel: isEn ? 'Decline' : 'Không dùng Hồi Hưởng',
        actionType: 'RESPOND_FAN_KUI',
      },
      ASK_GANG_LIE: {
        title: isEn ? 'Fierce Counter' : 'Hàn Khí Phản',
        desc: isEn ? 'Flip Judgment to counter attacker.' : 'Phán xét phản đòn người vừa gây sát thương cho bạn.',
        yesIcon: 'duel',
        yesLabel: isEn ? 'Judge Fierce Counter' : 'Phán xét Hàn Khí Phản',
        noLabel: isEn ? 'Decline' : 'Không dùng Hàn Khí Phản',
        actionType: 'RESPOND_GANG_LIE',
      },
    };

    const binaryCfg = binarySkillMap[interrupt.kind];
    const binaryActorSeat =
      interrupt.kind === 'ASK_TIE_QI' ? interrupt.sourceSeat : interrupt.targetSeat;
    if (binaryCfg && binaryActorSeat === selfSeat) {
      const autoLuoShen = interrupt.kind === 'ASK_LUO_SHEN' &&
        view.publicReveals?.at(-1)?.label.endsWith('Lạc Thần') &&
        view.actionLog.at(-1)?.includes('thu về tay!');
      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
          <div className="space-y-1">
            <span className="inline-block rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              {binaryCfg.title}
            </span>
            <p className="text-xs leading-snug text-[#D1D5DB]">
              {autoLuoShen ? (isEn ? 'Black card kept · flipping next...' : 'Đã giữ lá đen · chuẩn bị lật lá tiếp theo.') : binaryCfg.desc}
            </p>
          </div>
          <div className={btnGroupClass}>
            {!autoLuoShen ? <button
              type="button"
              data-primary-action="true"
              onClick={() => {
                onSendAction({
                  type: binaryCfg.actionType,
                  seatIndex: selfSeat,
                  activate: true,
                });
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C83E37] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D84B43]`}
            >
              <GameIcon name={binaryCfg.yesIcon} size={13} />
              {binaryCfg.yesLabel}
            </button> : null}
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: binaryCfg.actionType,
                  seatIndex: selfSeat,
                  activate: false,
                });
              }}
              className={`inline-flex ${reactBtnWidth} cursor-pointer items-center justify-center gap-1.5 rounded-lg ${EBONY_ACTION_BTN} px-3.5 py-2 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              {binaryCfg.noLabel}
            </button>
          </div>
        </aside>
      );
    }

    if (isBar) {
      return null;
    }

    return (
      <aside className={`${EBONY_IDLE_SHELL} gap-2`}>
        <p className="font-semibold text-[#FDE68A]">{actorPrompt.headlineVi}</p>
        <p className="leading-relaxed">{actorPrompt.detailVi}</p>
      </aside>
    );
  }

  // 2. PHA BỎ BÀI (DISCARD)
  if (view.turnPhase === 'DISCARD' && view.currentTurnSeat === selfSeat && selfPlayer) {
    const discardNeeded = Math.max(0, handCards.length - Math.max(0, selfPlayer.hp));
    const selectedCount = selection.selectedCardIds.length;
    const readyToDiscard = selectedCount === discardNeeded;
    return (
      <aside className={`${sidebarShellClass} border-[#D99B26]/50`}>
        <div className="space-y-1">
          <span className="inline-block rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
            {isEn ? 'Discard Phase' : 'Pha bỏ bài'}
          </span>
          <p className="font-mono-num text-xs font-semibold text-[#F3F4F6]">
            {isEn ? `Discard ${discardNeeded} (${selectedCount}/${discardNeeded})` : `Cần bỏ ${discardNeeded} lá (đã chọn ${selectedCount}/${discardNeeded})`}
          </p>
        </div>
        <div className={btnGroupClass}>
          <button
            type="button"
            data-primary-action={readyToDiscard ? 'true' : undefined}
            disabled={!readyToDiscard}
            onClick={() => {
              if (!readyToDiscard) return;
              onSendAction({
                type: 'DISCARD_CARDS',
                seatIndex: selfSeat,
                cardIds: selection.selectedCardIds,
              });
              onClearSelection();
            }}
            className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#D84B43] disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <GameIcon name="card-discard" size={14} />
            <span>{isEn ? `Discard ${discardNeeded}` : `Bỏ ${discardNeeded} lá`}</span>
            {isBar ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
          </button>
          {hasSelection ? (
            <button
              type="button"
              onClick={onClearSelection}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:undo" size={13} />
              <span>{isEn ? 'Clear' : 'Hủy chọn'}</span>
              <kbd className="font-mono-num text-[10px] opacity-75">[Esc]</kbd>
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  // 3. PHA ĐÁNH BÀI CHÍNH (PLAY) CỦA BẠN
  if (view.turnPhase === 'PLAY' && view.currentTurnSeat === selfSeat) {
    const targetSpec = getRequiredTargetSpec(view, selection);
    const hasEnoughTargets = selection.selectedTargets.length >= targetSpec.minTargets;

    if (selection.activeSkillMode) {
      const skill = selection.activeSkillMode;
      const cardCount = selection.selectedCardIds.length;
      const firstTargetName = getShortName(view.players, selection.selectedTargets[0], isEn);
      const secondTargetName = getShortName(view.players, selection.selectedTargets[1], isEn);

      let requiredCards = 0;
      let skillIcon: GameIconName = 'ui:sparkles';
      let skillActionLabel = isEn ? 'Activate Skill' : 'Kích hoạt kỹ năng';
      let cardHint = '';
      if (skill === 'ren_de') {
        requiredCards = 1;
        skillActionLabel =
          selection.selectedTargets.length === 1
            ? (isEn ? `Give ${cardCount} card(s) to ${firstTargetName}` : `Giao ${cardCount} lá cho ${firstTargetName}`)
            : (isEn ? 'Activate Cloud Favor' : 'Kích hoạt Thanh Vân Độ');
        if (cardCount === 0) cardHint = isEn ? 'Select at least 1 hand card' : 'Chọn ít nhất 1 lá bài trên tay';
      } else if (skill === 'ji_jiang') {
        requiredCards = 0;
        skillIcon = 'saber-slash';
        skillActionLabel =
          selection.selectedTargets.length === 1
            ? (isEn ? `Cloud Command → ${firstTargetName}` : `Vân Lệnh đánh ${firstTargetName}`)
            : (isEn ? 'Activate Cloud Command' : 'Kích hoạt Vân Lệnh');
      } else if (skill === 'ku_rou') {
        requiredCards = 0;
        skillIcon = 'card-draw';
        skillActionLabel = isEn ? 'Scorched Flesh: -1 HP → Draw 2' : 'Đoạn Cốt: mất 1 sinh lực rút 2 lá';
      } else if (skill === 'zhi_heng') {
        requiredCards = 1;
        skillIcon = 'ui:convert';
        skillActionLabel = isEn ? `Discard ${cardCount} & Draw ${cardCount}` : `Bỏ ${cardCount} lá rút ${cardCount} lá`;
        if (cardCount === 0) cardHint = isEn ? 'Select at least 1 card to cycle' : 'Chọn ít nhất 1 lá bài muốn đổi';
      } else if (skill === 'fan_jian') {
        skillIcon = 'drama-masks';
        skillActionLabel =
          selection.selectedTargets.length === 1
            ? (isEn ? `Target ${firstTargetName} (Mind Gambit)` : `Chọn ${firstTargetName} (Đoán Tâm Mưu)`)
            : (isEn ? 'Activate Mind Gambit' : 'Kích hoạt Đoán Tâm Mưu');
      } else if (skill === 'jie_yin') {
        requiredCards = 2;
        skillIcon = 'heart-plus';
        skillActionLabel =
          selection.selectedTargets.length === 1
            ? (isEn ? `Shared Oath with ${firstTargetName}` : `Hợp Đan cùng ${firstTargetName}`)
            : (isEn ? 'Activate Shared Oath' : 'Kích hoạt Hợp Đan');
        if (cardCount !== 2) cardHint = isEn ? `Select exactly 2 hand cards (${cardCount}/2)` : `Cần chọn đúng 2 lá bài (${cardCount}/2)`;
      } else if (skill === 'qing_nang') {
        requiredCards = 1;
        skillIcon = 'heart-plus';
        skillActionLabel =
          selection.selectedTargets.length === 1
            ? (isEn ? `Heal ${firstTargetName} (+1 HP)` : `Hồi 1 sinh lực cho ${firstTargetName}`)
            : (isEn ? 'Activate Herbal Satchel' : 'Kích hoạt Dược Nang');
        if (cardCount !== 1) cardHint = isEn ? 'Select 1 hand card' : 'Cần chọn đúng 1 lá bài trên tay';
      } else if (skill === 'li_jian') {
        requiredCards = 1;
        skillIcon = 'duel';
        skillActionLabel =
          selection.selectedTargets.length === 2
            ? (isEn ? `Shadow Discord: ${firstTargetName} vs ${secondTargetName}` : `Ly Tâm Kế: ${firstTargetName} vs ${secondTargetName}`)
            : (isEn ? 'Activate Shadow Discord' : 'Kích hoạt Ly Tâm Kế');
        if (cardCount !== 1) cardHint = isEn ? 'Select 1 card to discard' : 'Cần chọn 1 lá bài để bỏ';
      }

      const cardOk =
        skill === 'ren_de' || skill === 'zhi_heng'
          ? cardCount >= requiredCards
          : skill === 'fan_jian' || skill === 'ku_rou' || skill === 'ji_jiang'
            ? true
            : cardCount === requiredCards;
      const canExecuteSkill = cardOk && hasEnoughTargets;

      return (
        <aside className={`${sidebarShellClass} border-[#D99B26]/60`}>
          {!isBar ? (
            <div className="space-y-1">
              <span className="inline-block rounded bg-[#D99B26]/20 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
                {isEn ? 'Active Skill' : 'Kỹ năng đang chọn'}
              </span>
              <p className="text-xs leading-snug text-[#FDE68A]">
                {cardHint
                  ? cardHint
                  : !hasEnoughTargets
                    ? targetSpec.promptVi || (isEn ? 'Select a gold-highlighted target' : 'Hãy bấm chọn 1 mục tiêu sáng viền vàng trên bàn')
                    : (isEn ? 'Ready to activate.' : 'Đã đủ điều kiện kích hoạt.')}
              </p>
            </div>
          ) : cardHint || !hasEnoughTargets ? (
            <span className="text-[11px] font-semibold text-[#FDE68A]">
              {cardHint || targetSpec.promptVi || (isEn ? 'Select highlighted target' : 'Chọn mục tiêu sáng viền vàng')}
            </span>
          ) : null}
          <div className={btnGroupClass}>
            <button
              type="button"
              data-primary-action={canExecuteSkill ? 'true' : undefined}
              disabled={!canExecuteSkill}
              onClick={() => {
                if (!canExecuteSkill) return;
                onSendAction({
                  type: 'ACTIVATE_HERO_SKILL',
                  seatIndex: selfSeat,
                  skillId: skill,
                  ...(selection.selectedCardIds.length > 0
                    ? { cardIds: selection.selectedCardIds }
                    : {}),
                  ...(selection.selectedTargets.length > 0
                    ? { targetSeats: selection.selectedTargets }
                    : {}),
                });
                onClearSelection();
              }}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#D84B43] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name={skillIcon} size={13} />
              <span>{skillActionLabel}</span>
              {isBar ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:undo" size={13} />
              <span>{isEn ? 'Clear' : 'Hủy chọn'}</span>
              <kbd className="font-mono-num text-[10px] opacity-75">[Esc]</kbd>
            </button>
            <button
              type="button"
              onClick={onEndPlayPhase}
              data-end-play-phase
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:skip" size={13} />
              <span>{isEn ? 'End Turn' : 'Kết thúc lượt'}</span>
              <kbd className="font-mono-num text-[10px] opacity-75">[E]</kbd>
            </button>
          </div>
        </aside>
      );
    }

    const effectiveKey = getEffectivePlayCardKey(selection, ownedCards);
    const drawSecondAvailable = Boolean(view.turnFlags?.drawSecondAvailable);
    const needTruongBatCards =
      selection.activeConvertMode === 'truong_bat' && selection.selectedCardIds.length !== 2;
    const isFirstRoundSatBlocked = Boolean(
      view.peacefulFirstRound && view.roundNumber === 1 && (effectiveKey === 'sat' || effectiveKey === 'pha_giap_tram'),
    );
    const convertModeHint =
      selection.activeConvertMode && effectiveKey === null
        ? selection.activeConvertMode === 'truong_bat'
          ? (isEn ? `Shadow Serpent Spear: pick 2 cards (${selection.selectedCardIds.length}/2)` : `Xà Ảnh Mâu: chọn đủ 2 lá (${selection.selectedCardIds.length}/2)`)
          : selection.activeConvertMode === 'wu_sheng'
            ? (isEn ? 'Azure Cleave: pick 1 Red card (♥/♦)' : 'Thanh Long Trảm: chọn 1 lá chất Đỏ (♥/♦)')
            : selection.activeConvertMode === 'long_dan_sat'
              ? (isEn ? 'Silver Spear: pick 1 Shadow Step to Strike' : 'Ngân Thương Thế: chọn 1 lá Thân Pháp để đánh Kiếm Trảm')
              : selection.activeConvertMode === 'ky_tap'
                ? (isEn ? 'Night Raid: pick 1 Black card (♠/♣)' : 'Dạ Tập Doanh: chọn 1 lá chất Đen (♠/♣)')
                : selection.activeConvertMode === 'quoc_sac'
                  ? (isEn ? 'Celestial Seal: pick 1 Diamond card (♦)' : 'Thiên Hương Phong: chọn 1 lá chất Rô (♦)')
                  : null
        : null;
    const canPlayCard =
      effectiveKey !== null &&
      !needTruongBatCards &&
      !isFirstRoundSatBlocked &&
      selection.selectedCardIds.length >= 1 &&
      hasEnoughTargets;

    const actionSpec = effectiveKey
      ? getPlayButtonSpec(effectiveKey, ownedCards, selection, view.players, isEn)
      : null;

    const hintText = isFirstRoundSatBlocked
      ? (isEn ? 'Round 1 Truce: Strikes are disabled on the first round.' : 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.')
      : convertModeHint
        ? convertModeHint
        : effectiveKey && !hasEnoughTargets
          ? targetSpec.promptVi || (isEn ? 'Click a highlighted target' : 'Hãy bấm chọn 1 mục tiêu sáng viền vàng trên bàn')
          : effectiveKey
            ? (isEn ? 'Ready to play.' : 'Sẵn sàng thực hiện hành động.')
            : drawSecondAvailable
              ? (isEn ? 'Play a card now for Armor Piercing (+1 damage).' : 'Hoặc đánh bài ngay để kích hoạt Phá Giáp (+1 sát thương).')
              : (isEn ? 'Pick a card below or activate a warrior skill.' : 'Chọn lá bài bên dưới hoặc chiêu thức ở thẻ hiệp khách.');

    const showBarHint = Boolean(
      isFirstRoundSatBlocked ||
        convertModeHint ||
        (effectiveKey && !hasEnoughTargets) ||
        (drawSecondAvailable && !hasSelection),
    );

    return (
      <aside className={`${sidebarShellClass} border-[#806345]/50`}>
        {!isBar ? (
          <div className="space-y-1">
            <span className="inline-block rounded bg-[#16A34A]/20 px-2 py-0.5 text-[11px] font-bold text-[#86EFAC]">
              {isEn ? 'Your Action Phase' : 'Lượt đánh của bạn'}
            </span>
            <p className="text-xs leading-snug text-[#D1D5DB]">{hintText}</p>
          </div>
        ) : showBarHint ? (
          <span className="text-[11px] font-semibold text-[#FDE68A]">{hintText}</span>
        ) : null}
        <div className={btnGroupClass}>
          {actionSpec ? (
            <button
              type="button"
              data-primary-action={canPlayCard ? 'true' : undefined}
              disabled={!canPlayCard}
              onClick={() => {
                if (!canPlayCard) return;
                const asCardKey = getConvertAsCardKey(selection.activeConvertMode);
                onSendAction({
                  type: 'PLAY_CARD',
                  seatIndex: selfSeat,
                  cardIds: selection.selectedCardIds,
                  ...(selection.selectedTargets.length > 0
                    ? { targetSeats: selection.selectedTargets }
                    : {}),
                  ...(effectiveKey === 'ta_dao_sat_nhan' &&
                  selection.selectedTargets.length === 2
                    ? {
                        targetSeats: [selection.selectedTargets[0]!],
                        secondarySeat: selection.selectedTargets[1],
                      }
                    : {}),
                  ...(asCardKey ? { asCardKey } : {}),
                });
                onClearSelection();
              }}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#C83E37] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#D84B43] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <GameIcon name={actionSpec.icon} size={14} />
              <span className="truncate">{actionSpec.label}</span>
              {isBar ? <kbd className="font-mono-num text-[10px] opacity-75">[Enter]</kbd> : null}
            </button>
          ) : null}

          {drawSecondAvailable ? (
            <button
              type="button"
              onClick={() => {
                onSendAction({
                  type: 'DRAW_CARDS',
                  seatIndex: selfSeat,
                  extra: true,
                });
                onClearSelection();
              }}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#FBBF24]/75 bg-[#3A250E] px-3 py-1.5 text-xs font-bold text-[#FDE68A] hover:border-[#FDE68A] hover:bg-[#4A3012]`}
            >
              <GameIcon name="card-draw" size={14} />
              <span>{isEn ? 'Draw 2nd Card (Skip Armor Piercing)' : 'Rút lá thứ 2 (Bỏ Phá Giáp)'}</span>
            </button>
          ) : null}

          {hasSelection ? (
            <button
              type="button"
              onClick={onClearSelection}
              className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
            >
              <GameIcon name="ui:undo" size={13} />
              <span>{isEn ? 'Clear' : 'Hủy chọn'}</span>
              <kbd className="font-mono-num text-[10px] opacity-75">[Esc]</kbd>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onEndPlayPhase}
            data-end-play-phase
            className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ${EBONY_ACTION_BTN} px-3 py-1.5 text-xs font-semibold`}
          >
            <GameIcon name="ui:skip" size={13} />
            <span>{isEn ? 'End Turn' : 'Kết thúc lượt'}</span>
            <kbd className="font-mono-num text-[10px] opacity-75">[E]</kbd>
          </button>
        </div>
      </aside>
    );
  }

  // 4. ĐẾN LƯỢT BẠN Ở PHA RÚT BÀI
  if (
    view.turnPhase === 'DRAW' &&
    view.currentTurnSeat === selfSeat &&
    selfPlayer?.alive &&
    !interrupt &&
    (view.availableDrawCount ?? 0) > 0
  ) {
    const drawCount = view.availableDrawCount!;
    const skillNote =
      selfPlayer.heroId === 'zhou_yu'
        ? (isEn ? "Mind's Eye (+1)" : 'Tâm Nhãn (+1 lá)')
        : selfPlayer.heroId === 'xu_chu'
          ? (isEn ? 'Armor Piercing (draw 1)' : 'Phá Giáp (rút 1 lá đầu)')
          : null;
    return (
      <aside className={`${sidebarShellClass} border-[#FBBF24]/70`}>
        {!isBar ? (
          <div className="space-y-1">
            <span className="inline-block rounded bg-[#D99B26]/25 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              {isEn ? 'Draw Phase' : 'Pha Rút Bài'}
            </span>
            <p className="text-xs text-[#E8DCC8]">
              {isEn ? `Start your turn: draw ${drawCount} card(s)` : `Bắt đầu lượt của bạn: rút ${drawCount} lá`}{skillNote ? ` (${skillNote})` : ''}.
            </p>
          </div>
        ) : skillNote ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#D99B26]/25 px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
            <GameIcon name="ui:zap" size={11} />
            <span>{skillNote}</span>
          </span>
        ) : null}
        <div className={btnGroupClass}>
          <button
            type="button"
            data-primary-action="true"
            onClick={() => {
              onSendAction({
                type: 'DRAW_CARDS',
                seatIndex: selfSeat,
              });
              onClearSelection();
            }}
            className={`inline-flex ${turnBtnWidth} max-h-[42px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#FBBF24]/85 bg-[#9E6212] px-3.5 py-1.5 text-xs font-extrabold text-[#FFF8E7] shadow-[0_0_16px_rgba(251,191,36,0.3)] hover:bg-[#B87416]`}
          >
            <GameIcon name="card-draw" size={14} />
            <span>{isEn ? `Draw ${drawCount} Cards` : `Rút ${drawCount} lá đầu lượt`}</span>
            <kbd className="font-mono-num text-[10px] opacity-85">[Enter / Space]</kbd>
          </button>
        </div>
      </aside>
    );
  }

  // 5. ĐANG CHỜ LƯỢT NGƯỜI KHÁC
  if (isBar) {
    return null;
  }

  const heroName = selfPlayer?.heroId ? (getCuuChauHeroDisplay(selfPlayer.heroId, locale)?.name ?? null) : null;
  return (
    <aside className={`${EBONY_IDLE_SHELL} gap-1.5`}>
      <p className="font-semibold text-[#E5E7EB]">{actorPrompt.headlineVi}</p>
      <p className="leading-relaxed">{actorPrompt.detailVi}</p>
      {heroName ? (
        <p className="pt-1 text-[11px] text-[#6B7280]">{isEn ? 'Your warrior:' : 'Hiệp khách của bạn:'} {heroName}</p>
      ) : null}
    </aside>
  );
}
