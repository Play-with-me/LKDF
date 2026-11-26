import {
  CUU_CHAU_HEROES,
  HERO_CATALOG,
  STANDARD_DECK_TEMPLATES,
  calculateDistance,
  canReachForSnatch,
  canUseCollateralMurder,
  formatRankLabel,
  formatSuitSymbol,
  getCuuChauCardDisplay,
  getCuuChauFactionDisplay,
  getCuuChauHeroDisplay,
  getCuuChauRoleDisplay,
  getHeroDefinition,
  isInAttackRange,
  isRedSuit,
} from '@lkdf/shared';
import i18n from '../../i18n/index.js';
import type {
  CardCategory,
  CardInstance,
  GameAction,
  HeroFaction,
  IdentityRole,
  PlayerViewState,
  PublicPlayerView,
  TurnFlags,
} from '@lkdf/shared';

export type PlaySkillMode =
  | 'ren_de'
  | 'ji_jiang'
  | 'zhi_heng'
  | 'ku_rou'
  | 'fan_jian'
  | 'jie_yin'
  | 'qing_nang'
  | 'li_jian';

export type ConvertCardMode =
  | 'wu_sheng'
  | 'long_dan_sat'
  | 'long_dan_thiem'
  | 'truong_bat'
  | 'ky_tap'
  | 'quoc_sac'
  | 'thanh_quoc'
  | 'cuu_vien';

export interface MatchSelectionState {
  readonly selectedCardIds: readonly string[];
  readonly selectedTargets: readonly number[];
  readonly activeSkillMode: PlaySkillMode | null;
  readonly activeConvertMode: ConvertCardMode | null;
}

export const EMPTY_MATCH_SELECTION: MatchSelectionState = {
  selectedCardIds: [],
  selectedTargets: [],
  activeSkillMode: null,
  activeConvertMode: null,
};

export interface PlaySkillOption {
  readonly id: PlaySkillMode;
  readonly nameVi: string;
  readonly descriptionVi: string;
}

export interface ConvertCardOption {
  readonly mode: ConvertCardMode;
  readonly labelVi: string;
  readonly descriptionVi: string;
  readonly requiredCards: number;
  readonly targetCardKey: 'sat' | 'thiem' | 'dao' | 'qua_ha_sai_cau' | 'lac_bat_tu_thuc';
}

export interface TurnActorPrompt {
  readonly headlineVi: string;
  readonly detailVi: string;
  readonly actorSeat: number | null;
  readonly actorNameVi: string | null;
  readonly isMyTurn: boolean;
  readonly isAllTableWait: boolean;
}

export interface TargetSelectionSpec {
  readonly minTargets: number;
  readonly maxTargets: number;
  readonly eligibleSeats: readonly number[];
  readonly promptVi: string;
}

export interface FactionVisualStyle {
  readonly hex: string;
  readonly labelVi: string;
  readonly badgeClass: string;
  readonly borderClass: string;
  readonly nameTextClass: string;
}

const FACTION_STYLES: Readonly<Record<HeroFaction, FactionVisualStyle>> = {
  SHU: {
    hex: '#C83E37',
    labelVi: 'Thục',
    badgeClass: 'bg-[#C83E37]/20 text-[#F87171] border-[#C83E37]/50',
    borderClass: 'border-[#C83E37]/75',
    nameTextClass: 'text-[#FCA5A5]',
  },
  WEI: {
    hex: '#3B82F6',
    labelVi: 'Ngụy',
    badgeClass: 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/50',
    borderClass: 'border-[#3B82F6]/75',
    nameTextClass: 'text-[#93C5FD]',
  },
  WU: {
    hex: '#10B981',
    labelVi: 'Ngô',
    badgeClass: 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/50',
    borderClass: 'border-[#10B981]/75',
    nameTextClass: 'text-[#86EFAC]',
  },
  QUN: {
    hex: '#9CA3AF',
    labelVi: 'Quần',
    badgeClass: 'bg-[#9CA3AF]/20 text-[#D1D5DB] border-[#9CA3AF]/50',
    borderClass: 'border-[#9CA3AF]/70',
    nameTextClass: 'text-[#E5E7EB]',
  },
};

export function getFactionStyle(faction: HeroFaction): FactionVisualStyle {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const def = getCuuChauFactionDisplay(faction, locale);
  return {
    hex: def.palette.border,
    labelVi: def.shortName,
    badgeClass: def.palette.badgeClass,
    borderClass: def.palette.borderClass,
    nameTextClass: def.palette.nameTextClass,
  };
}

export function getIdentityLabelVi(identity: IdentityRole | 'UNKNOWN'): string {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  return getCuuChauRoleDisplay(identity, locale).name;
}

export function getIdentityBadgeClass(identity: IdentityRole | 'UNKNOWN'): string {
  switch (identity) {
    case 'LORD':
      return 'bg-[#D99B26]/20 text-[#FBBF24] border-[#D99B26]/50';
    case 'LOYALIST':
      return 'bg-[#3B82F6]/20 text-[#93C5FD] border-[#3B82F6]/50';
    case 'REBEL':
      return 'bg-[#C83E37]/20 text-[#FCA5A5] border-[#C83E37]/50';
    case 'SPY':
      return 'bg-[#A855F7]/20 text-[#D8B4FE] border-[#A855F7]/50';
    case 'UNKNOWN':
      return 'bg-[#272D35] text-[#9CA3AF] border-[#3A424C]';
  }
}

export function getCardCategoryLabelVi(
  category: CardCategory,
  attackRange?: number,
): string {
  const en = i18n.language === 'en';
  switch (category) {
    case 'BASIC':
      return en ? 'Basic' : 'Cơ bản';
    case 'NORMAL_SCROLL':
      return en ? 'Scroll' : 'Bí kíp';
    case 'DELAYED_SCROLL':
      return en ? 'Seal' : 'Ấn chú';
    case 'WEAPON':
      return attackRange !== undefined
        ? (en ? `Weapon · R${attackRange}` : `Binh khí · Tầm ${attackRange}`)
        : (en ? 'Weapon' : 'Binh khí');
    case 'ARMOR':
      return en ? 'Armor' : 'Hộ giáp';
    case 'PLUS_ONE_HORSE':
      return en ? 'Footwork +1' : 'Khinh công +1';
    case 'MINUS_ONE_HORSE':
      return en ? 'Steed -1' : 'Thân pháp -1';
  }
}

export function formatCardShort(card: Pick<CardInstance, 'cardKey' | 'suit' | 'rank' | 'nameVi'>): string {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const name = getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name;
  return `${formatSuitSymbol(card.suit)}${formatRankLabel(card.rank)} ${name}`;
}

export function getPlayerSeatLabel(
  players: readonly PublicPlayerView[],
  seatIndex: number | null | undefined,
): string {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  if (seatIndex === null || seatIndex === undefined) {
    return locale === 'en' ? 'Fighter' : 'Hiệp khách';
  }
  const found = players.find((p) => p.seatIndex === seatIndex);
  if (!found) {
    return locale === 'en' ? `Seat ${seatIndex + 1}` : `Ghế ${seatIndex + 1}`;
  }
  const hero = found.heroId ? getCuuChauHeroDisplay(found.heroId, locale)?.name ?? null : null;
  return hero ? `${found.displayName} (${hero})` : found.displayName;
}

export function getOrderedSeatsClockwiseFromSelf(
  players: readonly PublicPlayerView[],
  selfSeat: number,
): PublicPlayerView[] {
  const sorted = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const idx = sorted.findIndex((p) => p.seatIndex === selfSeat);
  if (idx === -1) {
    return sorted;
  }
  return [...sorted.slice(idx), ...sorted.slice(0, idx)];
}

export function getPlayerOwnedCards(
  player: PublicPlayerView | undefined,
): CardInstance[] {
  if (!player) return [];
  const cards: CardInstance[] = [...(player.handCards ?? [])];
  if (player.equipments.weapon) cards.push(player.equipments.weapon);
  if (player.equipments.armor) cards.push(player.equipments.armor);
  if (player.equipments.plusOneHorse) cards.push(player.equipments.plusOneHorse);
  if (player.equipments.minusOneHorse) cards.push(player.equipments.minusOneHorse);
  return cards;
}

export function getAvailablePlaySkills(
  player: PublicPlayerView | undefined,
  turnFlags?: TurnFlags,
  players?: readonly PublicPlayerView[],
  isFirstRoundPeaceful = false,
): readonly PlaySkillOption[] {
  if (!player || !player.alive || !player.heroId) {
    return [];
  }
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const hero = getCuuChauHeroDisplay(player.heroId, locale);
  const firstSkill = hero?.skills[0];
  const secondSkill = hero?.skills[1];
  const skills: PlaySkillOption[] = [];
  switch (player.heroId) {
    case 'liu_bei': {
      if (player.handCount > 0) {
        skills.push({
          id: 'ren_de',
          nameVi: firstSkill?.name ?? (locale === 'en' ? 'Benevolent Gift' : 'Tặng Đan'),
          descriptionVi:
            firstSkill?.description ??
            (locale === 'en'
              ? 'Select hand cards and an ally to gift them (2+ heals 1 HP).'
              : 'Chọn bài trên tay rồi chọn 1 đồng đội để giao bài (giao từ 2 lá hồi 1 sinh lực).'),
        });
      }
      const hasShuAlly =
        !players ||
        players.some(
          (p) =>
            p.alive &&
            p.seatIndex !== player.seatIndex &&
            p.heroId !== null &&
            getHeroDefinition(p.heroId).faction === 'SHU',
        );
      const canUseSatThisTurn =
        player.equipments.weapon?.cardKey === 'gia_cat_lien_no' ||
        (turnFlags?.satUsedThisTurn ?? 0) < 1;
      if (
        !isFirstRoundPeaceful &&
        player.identity === 'LORD' &&
        canUseSatThisTurn &&
        !turnFlags?.jiJiangDeclinedThisTurn &&
        hasShuAlly
      ) {
        skills.push({
          id: 'ji_jiang',
          nameVi: secondSkill?.name ?? (locale === 'en' ? 'Cloud Command' : 'Vân Lệnh'),
          descriptionVi:
            secondSkill?.description ??
            (locale === 'en'
              ? 'Grand Warden calls a Blue Cloud ally to play a Blade Strike.'
              : 'Minh Chủ xin đồng môn Thanh Vân đánh 1 lá Kiếm Trảm vào mục tiêu trong tầm.'),
        });
      }
      break;
    }
    case 'sun_quan':
      if (!turnFlags?.zhiHengUsedThisTurn) {
        skills.push({
          id: 'zhi_heng',
          nameVi: firstSkill?.name ?? (locale === 'en' ? 'Balanced Forge' : 'Điều Tức'),
          descriptionVi:
            firstSkill?.description ??
            (locale === 'en'
              ? 'Discard any hand or equipped cards and draw that exact count (once/turn).'
              : 'Chọn bất kỳ lá bài trên tay hoặc trang bị để bỏ và rút lại đúng bấy nhiêu lá (1 lần/lượt).'),
        });
      }
      break;
    case 'huang_gai':
      skills.push({
        id: 'ku_rou',
        nameVi: firstSkill?.name ?? (locale === 'en' ? 'Scorched Flesh' : 'Đoạn Cốt'),
        descriptionVi:
          firstSkill?.description ??
          (locale === 'en'
            ? 'Lose 1 HP to draw 2 cards (unlimited uses per turn).'
            : 'Tự mất 1 sinh lực để rút 2 lá bài (không giới hạn số lần mỗi lượt).'),
      });
      break;
    case 'zhou_yu':
      if (!turnFlags?.fanJianUsedThisTurn && player.handCount > 0) {
        skills.push({
          id: 'fan_jian',
          nameVi: secondSkill?.name ?? (locale === 'en' ? 'Mind Gambit' : 'Đoán Tâm Mưu'),
          descriptionVi:
            secondSkill?.description ??
            (locale === 'en'
              ? 'Pick an opponent to guess a suit and take 1 hand card from you (once/turn).'
              : 'Chọn 1 đối thủ để họ đoán chất rồi rút 1 lá của bạn (1 lần/lượt).'),
        });
      }
      break;
    case 'sun_shang_xiang':
      if (!turnFlags?.jieYinUsedThisTurn && player.handCount >= 2) {
        skills.push({
          id: 'jie_yin',
          nameVi: firstSkill?.name ?? (locale === 'en' ? 'Shared Oath' : 'Hợp Đan'),
          descriptionVi:
            firstSkill?.description ??
            (locale === 'en'
              ? 'Discard 2 cards and choose a wounded male hero so both recover 1 HP.'
              : 'Bỏ 2 lá trên tay và chọn 1 nam hiệp khách bị thương để cả hai cùng hồi 1 sinh lực.'),
        });
      }
      break;
    case 'hua_tuo':
      if (!turnFlags?.qingNangUsedThisTurn && player.handCount >= 1) {
        skills.push({
          id: 'qing_nang',
          nameVi: secondSkill?.name ?? (locale === 'en' ? 'Herbal Satchel' : 'Dược Nang'),
          descriptionVi:
            secondSkill?.description ??
            (locale === 'en'
              ? 'Discard 1 hand card to heal a wounded hero by 1 HP (once/turn).'
              : 'Bỏ 1 lá trên tay và chọn 1 người bị thương để hồi 1 sinh lực (1 lần/lượt).'),
        });
      }
      break;
    case 'diao_chan': {
      const hasEquip =
        player.equipments.weapon !== null ||
        player.equipments.armor !== null ||
        player.equipments.plusOneHorse !== null ||
        player.equipments.minusOneHorse !== null;
      if (!turnFlags?.liJianUsedThisTurn && (player.handCount >= 1 || hasEquip)) {
        skills.push({
          id: 'li_jian',
          nameVi: firstSkill?.name ?? (locale === 'en' ? 'Shadow Discord' : 'Ly Tâm Kế'),
          descriptionVi:
            firstSkill?.description ??
            (locale === 'en'
              ? 'Discard 1 card and force two male heroes into a Mortal Arena duel.'
              : 'Bỏ 1 lá bài và chọn 2 nam hiệp khách khác nhau để buộc họ Sinh Tử Lôi Đài.'),
        });
      }
      break;
    }
    default:
      break;
  }
  return skills;
}

export function getAvailableConvertModes(
  player: PublicPlayerView | undefined,
  isPlayPhase: boolean,
  isFirstRoundPeaceful = false,
): readonly ConvertCardOption[] {
  if (!player || !player.alive) {
    return [];
  }
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const satName = getCuuChauCardDisplay('sat', locale).name;
  const dodgeName = getCuuChauCardDisplay('thiem', locale).name;
  const healName = getCuuChauCardDisplay('dao', locale).name;
  const dismantleName = getCuuChauCardDisplay('qua_ha_sai_cau', locale).name;
  const sealName = getCuuChauCardDisplay('lac_bat_tu_thuc', locale).name;
  const hero = getCuuChauHeroDisplay(player.heroId, locale);
  const s0 = hero?.skills[0]?.name;
  const s1 = hero?.skills[1]?.name;
  const canInitiateSat = !(isPlayPhase && isFirstRoundPeaceful);
  const options: ConvertCardOption[] = [];
  if (player.heroId === 'guan_yu' && canInitiateSat) {
    options.push({
      mode: 'wu_sheng',
      labelVi: `${s0 ?? 'Thanh Long Trảm'} (${locale === 'en' ? 'Red' : 'Đỏ'} → ${satName})`,
      descriptionVi: locale === 'en' ? `Use any Red card (♥/♦) as ${satName}.` : `Dùng 1 lá chất Đỏ (♥/♦) như lá ${satName}.`,
      requiredCards: 1,
      targetCardKey: 'sat',
    });
  }
  if (player.heroId === 'zhao_yun') {
    if (canInitiateSat) {
      options.push({
        mode: 'long_dan_sat',
        labelVi: `${s0 ?? 'Ngân Thương Thế'} (${dodgeName} → ${satName})`,
        descriptionVi: locale === 'en' ? `Use ${dodgeName} as ${satName}.` : `Dùng lá ${dodgeName} như lá ${satName}.`,
        requiredCards: 1,
        targetCardKey: 'sat',
      });
    }
    if (!isPlayPhase) {
      options.push({
        mode: 'long_dan_thiem',
        labelVi: `${s0 ?? 'Ngân Thương Thế'} (${satName} → ${dodgeName})`,
        descriptionVi: locale === 'en' ? `Use ${satName} as ${dodgeName}.` : `Dùng lá ${satName} như lá ${dodgeName}.`,
        requiredCards: 1,
        targetCardKey: 'thiem',
      });
    }
  }
  if (player.equipments.weapon?.cardKey === 'truong_bat_xa_mau' && canInitiateSat) {
    const spearName = getCuuChauCardDisplay('truong_bat_xa_mau', locale).name;
    options.push({
      mode: 'truong_bat',
      labelVi: `${spearName} (${locale === 'en' ? '2 cards' : '2 lá'} → ${satName})`,
      descriptionVi: locale === 'en' ? `Use 2 hand cards as 1 ${satName}.` : `Chọn 2 lá trên tay đánh ra như 1 lá ${satName}.`,
      requiredCards: 2,
      targetCardKey: 'sat',
    });
  }
  if (isPlayPhase && player.heroId === 'gan_ning') {
    options.push({
      mode: 'ky_tap',
      labelVi: `${s0 ?? 'Dạ Tập Doanh'} (${locale === 'en' ? 'Black' : 'Đen'} → ${dismantleName})`,
      descriptionVi: locale === 'en' ? `Use 1 Black card (♠/♣) as ${dismantleName}.` : `Dùng 1 lá chất Đen (♠/♣) như ${dismantleName}.`,
      requiredCards: 1,
      targetCardKey: 'qua_ha_sai_cau',
    });
  }
  if (isPlayPhase && player.heroId === 'da_qiao') {
    options.push({
      mode: 'quoc_sac',
      labelVi: `${s0 ?? 'Thiên Hương Phong'} (♦ → ${sealName})`,
      descriptionVi: locale === 'en' ? `Use 1 Diamond card (♦) as ${sealName}.` : `Dùng 1 lá chất Rô (♦) như ${sealName}.`,
      requiredCards: 1,
      targetCardKey: 'lac_bat_tu_thuc',
    });
  }
  if (!isPlayPhase && player.heroId === 'zhen_ji') {
    options.push({
      mode: 'thanh_quoc',
      labelVi: `${s0 ?? 'Huyền Bạch'} (${locale === 'en' ? 'Black' : 'Đen'} → ${dodgeName})`,
      descriptionVi: locale === 'en' ? `Use 1 Black hand card (♠/♣) as ${dodgeName}.` : `Dùng 1 lá chất Đen (♠/♣) trên tay như ${dodgeName}.`,
      requiredCards: 1,
      targetCardKey: 'thiem',
    });
  }
  if (!isPlayPhase && player.heroId === 'hua_tuo') {
    options.push({
      mode: 'cuu_vien',
      labelVi: `${s0 ?? 'Cứu Tử Phù'} (${locale === 'en' ? 'Red' : 'Đỏ'} → ${healName})`,
      descriptionVi: locale === 'en' ? `Out of turn, use 1 Red card (♥/♦) as ${healName}.` : `Ngoài lượt, dùng 1 lá chất Đỏ (♥/♦) như ${healName}.`,
      requiredCards: 1,
      targetCardKey: 'dao',
    });
  }
  void s1;
  return options;
}

export function isCardValidForConvertMode(
  card: CardInstance,
  mode: ConvertCardMode | null,
): boolean {
  if (!mode) return true;
  switch (mode) {
    case 'wu_sheng':
    case 'cuu_vien':
      return isRedSuit(card.suit);
    case 'long_dan_sat':
      return card.cardKey === 'thiem';
    case 'long_dan_thiem':
      return card.cardKey === 'sat';
    case 'ky_tap':
    case 'thanh_quoc':
      return !isRedSuit(card.suit);
    case 'quoc_sac':
      return card.suit === 'DIAMOND';
    case 'truong_bat':
      return true;
  }
}

export function getEffectivePlayCardKey(
  selection: MatchSelectionState,
  ownedCards: readonly CardInstance[],
): string | null {
  if (selection.activeConvertMode) {
    if (selection.activeConvertMode === 'truong_bat') {
      const hasTwoValid =
        selection.selectedCardIds.length === 2 &&
        selection.selectedCardIds.every((id) => ownedCards.some((c) => c.id === id));
      return hasTwoValid ? 'sat' : null;
    }
    if (selection.selectedCardIds.length !== 1) {
      return null;
    }
    const card = ownedCards.find((c) => c.id === selection.selectedCardIds[0]);
    if (!card || !isCardValidForConvertMode(card, selection.activeConvertMode)) {
      return null;
    }
    switch (selection.activeConvertMode) {
      case 'wu_sheng':
      case 'long_dan_sat':
        return 'sat';
      case 'long_dan_thiem':
      case 'thanh_quoc':
        return 'thiem';
      case 'cuu_vien':
        return 'dao';
      case 'ky_tap':
        return 'qua_ha_sai_cau';
      case 'quoc_sac':
        return 'lac_bat_tu_thuc';
    }
  }
  if (selection.selectedCardIds.length === 1) {
    const card = ownedCards.find((c) => c.id === selection.selectedCardIds[0]);
    return card?.cardKey ?? null;
  }
  return null;
}

function hasAnyCardOnPlayer(player: PublicPlayerView): boolean {
  return (
    player.handCount > 0 ||
    player.equipments.weapon !== null ||
    player.equipments.armor !== null ||
    player.equipments.plusOneHorse !== null ||
    player.equipments.minusOneHorse !== null
  );
}

function isKongChengProtected(player: PublicPlayerView): boolean {
  return player.heroId === 'zhuge_liang' && player.handCount === 0;
}

export function getRequiredTargetSpec(
  view: PlayerViewState,
  selection: MatchSelectionState,
): TargetSelectionSpec {
  const viewer = view.players.find((p) => p.seatIndex === view.viewerSeatIndex);
  if (!viewer || !viewer.alive) {
    return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
  }
  const aliveOthers = view.players.filter(
    (p) => p.alive && p.seatIndex !== view.viewerSeatIndex,
  );

  if (
    view.activeInterrupt?.kind === 'WAIT_TU_XI' &&
    view.activeInterrupt.targetSeat === view.viewerSeatIndex
  ) {
    return {
      minTargets: 1,
      maxTargets: 2,
      eligibleSeats: aliveOthers.filter((p) => p.handCount > 0).map((p) => p.seatIndex),
      promptVi: 'Đột Tập: chọn 1 đến 2 đối thủ còn bài trên tay',
    };
  }

  if (
    view.activeInterrupt?.kind === 'ASK_LIU_LI' &&
    view.activeInterrupt.targetSeat === view.viewerSeatIndex
  ) {
    const sourceSeat = view.activeInterrupt.sourceSeat;
    return {
      minTargets: 1,
      maxTargets: 1,
      eligibleSeats: aliveOthers
        .filter(
          (p) =>
            p.seatIndex !== sourceSeat &&
            isInAttackRange(view, view.viewerSeatIndex, p.seatIndex) &&
            !isKongChengProtected(p),
        )
        .map((p) => p.seatIndex),
      promptVi: 'Lưu Ly: chọn 1 người khác trong tầm đánh để chuyển Sát',
    };
  }

  if (selection.activeSkillMode) {
    switch (selection.activeSkillMode) {
      case 'ren_de':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 người chơi để giao bài (Tặng Đan)',
        };
      case 'ji_jiang':
        if (view.turnPhase === 'PLAY' && view.peacefulFirstRound && view.roundNumber === 1) {
          return {
            minTargets: 1,
            maxTargets: 1,
            eligibleSeats: [],
            promptVi: 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
          };
        }
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers
            .filter(
              (p) =>
                isInAttackRange(view, view.viewerSeatIndex, p.seatIndex) &&
                !isKongChengProtected(p),
            )
            .map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 mục tiêu trong tầm đánh để Vân Lệnh',
        };
      case 'zhi_heng':
      case 'ku_rou':
        return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
      case 'fan_jian':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 đối thủ để phát động Đoán Tâm Mưu',
        };
      case 'jie_yin':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers
            .filter(
              (p) =>
                p.hp < p.maxHp &&
                p.heroId !== null &&
                getHeroDefinition(p.heroId).gender === 'MALE',
            )
            .map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 nam hiệp khách đang bị thương (Hợp Đan)',
        };
      case 'qing_nang':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: view.players
            .filter((p) => p.alive && p.hp < p.maxHp)
            .map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 người đang bị thương để hồi 1 sinh lực (Dược Nang)',
        };
      case 'li_jian':
        return {
          minTargets: 2,
          maxTargets: 2,
          eligibleSeats: aliveOthers
            .filter(
              (p) =>
                p.heroId !== null &&
                getHeroDefinition(p.heroId).gender === 'MALE' &&
                (selection.selectedTargets.length === 0 ||
                  (p.seatIndex !== selection.selectedTargets[0] &&
                    !isKongChengProtected(p))),
            )
            .map((p) => p.seatIndex),
          promptVi:
            selection.selectedTargets.length === 0
              ? 'Hãy bấm chọn 2 nam hiệp khách khác nhau để Sinh Tử Lôi Đài (Ly Tâm Kế)'
              : 'Chọn thêm 1 nam hiệp khách nữa để hoàn tất Ly Tâm Kế',
        };
    }
  }

  const handCards = viewer.handCards ?? [];
  const ownedCards = getPlayerOwnedCards(viewer);
  const effectiveKey = getEffectivePlayCardKey(selection, ownedCards);
  if (!effectiveKey) {
    return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
  }

  switch (effectiveKey) {
    case 'sat': {
      if (view.turnPhase === 'PLAY' && view.peacefulFirstRound && view.roundNumber === 1) {
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: [],
          promptVi: 'Vòng 1 Hòa Bình: chưa được đánh Sát ở vòng đầu tiên.',
        };
      }
      const isLastHandCard =
        handCards.length === 1 &&
        selection.selectedCardIds.length === 1 &&
        selection.activeConvertMode !== 'truong_bat';
      const hasFangTian =
        viewer.equipments.weapon?.cardKey === 'phuong_thien_hoa_kich' &&
        isLastHandCard;
      const eligible = aliveOthers
        .filter(
          (p) =>
            isInAttackRange(view, view.viewerSeatIndex, p.seatIndex) &&
            !isKongChengProtected(p),
        )
        .map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: hasFangTian ? 3 : 1,
        eligibleSeats: eligible,
        promptVi: hasFangTian
          ? 'Phương Thiên Họa Kích: chọn 1 đến 3 mục tiêu trong tầm đánh'
          : 'Hãy bấm chọn 1 mục tiêu sáng viền vàng trên bàn',
      };
    }
    case 'thuan_thu_khien_duong': {
      const eligible = aliveOthers
        .filter(
          (p) =>
            p.heroId !== 'lu_xun' &&
            hasAnyCardOnPlayer(p) &&
            canReachForSnatch(view, view.viewerSeatIndex, p.seatIndex),
        )
        .map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: 1,
        eligibleSeats: eligible,
        promptVi:
          viewer.heroId === 'huang_yue_ying'
            ? 'Cơ Xảo: chọn bất kỳ mục tiêu có bài để Thám Nang Thủ (không giới hạn khoảng cách)'
            : 'Hãy bấm chọn 1 mục tiêu trong khoảng cách 1 để Thám Nang Thủ',
      };
    }
    case 'qua_ha_sai_cau': {
      const eligible = aliveOthers
        .filter((p) => hasAnyCardOnPlayer(p))
        .map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: 1,
        eligibleSeats: eligible,
        promptVi: 'Hãy bấm chọn 1 mục tiêu có bài để Phá Trận Chưởng',
      };
    }
    case 'quyet_dau': {
      const eligible = aliveOthers
        .filter((p) => !isKongChengProtected(p))
        .map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: 1,
        eligibleSeats: eligible,
        promptVi: 'Hãy bấm chọn 1 mục tiêu để Sinh Tử Lôi Đài',
      };
    }
    case 'ta_dao_sat_nhan': {
      if (selection.selectedTargets.length === 0) {
        const eligibleAttackers = aliveOthers
          .filter((attacker) => {
            if (attacker.equipments.weapon === null) {
              return false;
            }
            return view.players.some(
              (victim) =>
                victim.alive &&
                !isKongChengProtected(victim) &&
                canUseCollateralMurder(
                  view,
                  view.viewerSeatIndex,
                  attacker.seatIndex,
                  victim.seatIndex,
                ),
            );
          })
          .map((p) => p.seatIndex);
        return {
          minTargets: 2,
          maxTargets: 2,
          eligibleSeats: eligibleAttackers,
          promptVi: 'Bước 1/2: Chọn 1 người chơi đang cầm Vũ khí',
        };
      }
      const attackerSeat = selection.selectedTargets[0]!;
      const eligibleVictims = view.players
        .filter(
          (victim) =>
            victim.alive &&
            !isKongChengProtected(victim) &&
            canUseCollateralMurder(
              view,
              view.viewerSeatIndex,
              attackerSeat,
              victim.seatIndex,
            ),
        )
        .map((p) => p.seatIndex);
      return {
        minTargets: 2,
        maxTargets: 2,
        eligibleSeats: eligibleVictims,
        promptVi: 'Bước 2/2: Chọn thêm 1 mục tiêu nằm trong tầm đánh của họ',
      };
    }
    case 'lac_bat_tu_thuc': {
      const eligible = aliveOthers
        .filter((p) => p.heroId !== 'lu_xun')
        .map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: 1,
        eligibleSeats: eligible,
        promptVi: 'Hãy bấm chọn 1 mục tiêu để đặt Điểm Huyệt Phong Mạch',
      };
    }
    default:
      return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
  }
}

export function describeJianXiongDamageCard(
  view: PlayerViewState,
  _targetSeat: number,
): string | null {
  const damageCards =
    view.activeInterrupt?.kind === 'ASK_JIAN_XIONG'
      ? view.activeInterrupt.damageCards
      : undefined;
  if (damageCards && damageCards.length > 0) {
    return damageCards.map((card) => formatCardShort(card)).join(', ');
  }
  const top = view.discardPileTop;
  return top ? formatCardShort(top) : null;
}

export function describePendingActorPrompt(view: PlayerViewState): TurnActorPrompt {
  const viewerSeat = view.viewerSeatIndex;
  const viewer = view.players.find((p) => p.seatIndex === viewerSeat);
  const interrupt = view.activeInterrupt;

  if (view.turnPhase === 'GAME_OVER') {
    return {
      headlineVi: 'Ván đấu đã kết thúc',
      detailVi: 'Đã lật toàn bộ Thân Phận và tổng kết phe chiến thắng.',
      actorSeat: null,
      actorNameVi: null,
      isMyTurn: false,
      isAllTableWait: false,
    };
  }

  if (view.turnPhase === 'HERO_SELECT') {
    const draft = view.heroDraft;
    if (!draft) {
      return {
        headlineVi: 'Đang chuẩn bị chọn Tướng...',
        detailVi: 'Hệ thống đang chia danh sách Tướng cho từng ghế.',
        actorSeat: null,
        actorNameVi: null,
        isMyTurn: false,
        isAllTableWait: false,
      };
    }
    if (draft.stage === 'LORD_SELECTING') {
      const lordName = getPlayerSeatLabel(view.players, draft.lordSeatIndex);
      const isLordSelf = draft.lordSeatIndex === viewerSeat;
      return {
        headlineVi: isLordSelf
          ? (i18n.language === 'en'
              ? 'You are Sovereign — Choose your Warrior (1/5)'
              : 'Bạn là Minh Chủ — Hãy chọn Hiệp Khách đầu tiên (1/5)')
          : (i18n.language === 'en'
              ? `Waiting for Sovereign ${lordName} to choose...`
              : `Đang chờ Minh Chủ ${lordName} chọn Hiệp Khách...`),
        detailVi:
          i18n.language === 'en'
            ? 'Sovereign receives +1 Max HP and picks first.'
            : 'Minh Chủ được cộng thêm +1 Sinh Lực tối đa và chọn trước.',
        actorSeat: draft.lordSeatIndex,
        actorNameVi: lordName,
        isMyTurn: isLordSelf,
        isAllTableWait: false,
      };
    }
    const alreadySelected = draft.mySelectedHero !== null;
    return {
      headlineVi: alreadySelected
        ? (i18n.language === 'en'
            ? `Warrior locked — Waiting for ${view.players.length - draft.readySeats.length} seat(s)...`
            : `Đã chọn Hiệp Khách — Đang chờ ${view.players.length - draft.readySeats.length} người khác...`)
        : (i18n.language === 'en' ? 'Choose your Warrior (1/3)' : 'Hãy chọn Hiệp Khách của bạn (1/3)'),
      detailVi:
        i18n.language === 'en'
          ? `Ready: ${draft.readySeats.length}/${view.players.length} seats.`
          : `Tiến độ sẵn sàng: ${draft.readySeats.length}/${view.players.length} ghế.`,
      actorSeat: alreadySelected ? null : viewerSeat,
      actorNameVi: alreadySelected ? null : getPlayerSeatLabel(view.players, viewerSeat),
      isMyTurn: !alreadySelected,
      isAllTableWait: !alreadySelected ? false : true,
    };
  }

  if (interrupt) {
    const targetName = getPlayerSeatLabel(view.players, interrupt.targetSeat);
    const sourceName = getPlayerSeatLabel(view.players, interrupt.sourceSeat);
    const responderName = getPlayerSeatLabel(view.players, interrupt.responderSeat);
    const attackerName = getPlayerSeatLabel(view.players, interrupt.attackerSeat);

    switch (interrupt.kind) {
      case 'WAIT_NULLIFICATION': {
        const nullifyInterrupt = interrupt as typeof interrupt & {
          readonly originalScrollNameVi?: string;
          readonly originalTargetSeat?: number;
          readonly nullifyDepth?: number;
        };
        const origName =
          nullifyInterrupt.originalScrollNameVi ?? interrupt.scrollNameVi ?? 'Cẩm nang';
        const origTargetSeat = nullifyInterrupt.originalTargetSeat ?? interrupt.targetSeat;
        const origTargetName = getPlayerSeatLabel(view.players, origTargetSeat);
        const depth = nullifyInterrupt.nullifyDepth ?? 0;
        const isCounter = depth % 2 === 1;
        const canRespond = interrupt.canRespondNullification === true;
        const targetsViewer = origTargetSeat === viewerSeat && !isCounter;
        return {
          headlineVi: canRespond
            ? isCounter
              ? `Phản Hóa Giải Chân Khí — Có chặn ${origName}?`
              : targetsViewer
                ? `⚠️ ${origName} nhắm vào BẠN — Đánh Hóa Giải Chân Khí?`
                : `Có đánh Hóa Giải chặn ${origName} (${origTargetName})?`
            : isCounter
              ? `Đang giải quyết phản Hóa Giải (${origName})...`
              : `Đang giải quyết ${origName} → ${origTargetName}...`,
          detailVi: canRespond
            ? isCounter
              ? `${origName} → ${origTargetName}. Phản Hóa Giải sẽ giữ bí kíp gốc tiếp tục hiệu lực.`
              : `Bí kíp sắp có hiệu lực lên ${origTargetName}. Chọn Đánh Hóa Giải hoặc Cho qua.`
            : `${origName} nhắm vào ${origTargetName}.`,
          actorSeat: null,
          actorNameVi: null,
          isMyTurn: canRespond,
          isAllTableWait: canRespond,
        };
      }
      case 'ASK_TU_HUNG':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Song Cổ Đoản Kiếm — Chọn bỏ 1 lá hoặc cho đối thủ rút 1 lá'
              : `Đang chờ ${targetName} chọn hiệu ứng Song Cổ Đoản Kiếm...`,
          detailVi: `${sourceName} đánh Kiếm Trảm khác giới vào ${targetName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DODGE': {
        const req = interrupt.requiredCount ?? 1;
        const dodged = interrupt.dodgedSoFar ?? 0;
        const voSongHint = req >= 2 ? ' (Bá Thể — Cửu Diện Vô Song)' : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Bạn bị đánh Kiếm Trảm${voSongHint} — Cần ${req} lá Thân Pháp (đã né ${dodged})`
              : `Đang chờ ${targetName} đánh ${req} lá Thân Pháp né đòn...`,
          detailVi:
            req >= 2
              ? `Nguồn sát thương: ${sourceName} (Bá Thể: phải đánh đủ ${req} lá Thân Pháp).`
              : `Nguồn sát thương: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      }
      case 'ASK_QUAN_THACH_PHU':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Phá Sơn Phủ — Bỏ 2 lá bài để ép Kiếm Trảm trúng?'
              : `Đang chờ ${sourceName} quyết định kích hoạt Phá Sơn Phủ...`,
          detailVi: `Kiếm Trảm vào ${targetName} vừa bị né bằng Thân Pháp.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_THANH_LONG':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Trấn Hải Đao — Đánh tiếp 1 lá Kiếm Trảm?'
              : `Đang chờ ${sourceName} quyết định truy kích Trấn Hải Đao...`,
          detailVi: `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_HAN_BANG_KIEM':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Băng Phách Kiếm — Hủy tối đa 2 lá thay cho sát thương?'
              : `Đang chờ ${sourceName} quyết định dùng Băng Phách Kiếm...`,
          detailVi: `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_KY_LAN_CUNG':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Truy Phong Cung — Chọn hủy 1 lá Thú cưỡi của mục tiêu?'
              : `Đang chờ ${sourceName} chọn Thú cưỡi để hủy (Truy Phong Cung)...`,
          detailVi: `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DUEL_SAT': {
        const req = interrupt.requiredCount ?? 1;
        const voSongHint = req >= 2 ? ' (Bá Thể — Cửu Diện Vô Song)' : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Sinh Tử Lôi Đài${voSongHint} — Cần đánh ${req} lá Kiếm Trảm`
              : `Đang chờ ${targetName} đánh ${req} lá Kiếm Trảm trong Sinh Tử Lôi Đài...`,
          detailVi:
            req >= 2
              ? `Bá Thể: cần đủ ${req} lá Kiếm Trảm, nếu thiếu sẽ chịu 1 sát thương.`
              : 'Ai không đánh đủ Kiếm Trảm sẽ chịu 1 sát thương.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      }
      case 'WAIT_COLLATERAL_SAT':
        return {
          headlineVi:
            interrupt.attackerSeat === viewerSeat
              ? `Tá Kiếm Trảm Phong — Đánh Kiếm Trảm vào ${targetName} hoặc giao Binh khí`
              : `Đang chờ ${attackerName} phản ứng Tá Kiếm Trảm Phong...`,
          detailVi: `Người dùng bí kíp: ${sourceName} · Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.attackerSeat ?? null,
          actorNameVi: attackerName,
          isMyTurn: interrupt.attackerSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_AOE_SAT':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Thú Triều Công Thành — Cần đánh 1 lá Kiếm Trảm hoặc chịu 1 sinh lực'
              : `Đang chờ ${targetName} phản ứng Thú Triều Công Thành...`,
          detailVi: `Nguồn: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_AOE_DODGE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Mưa Tên Bão Vũ — Cần đánh 1 lá Thân Pháp hoặc chịu 1 sinh lực'
              : `Đang chờ ${targetName} phản ứng Mưa Tên Bão Vũ...`,
          detailVi: `Nguồn: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_HARVEST_PICK':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Khai Kho Tàng Lương — Hãy chọn 1 lá bài ở giữa bàn'
              : `Đang chờ ${targetName} chọn bài Khai Kho Tàng Lương...`,
          detailVi: `Còn ${view.harvestPool.length} lá trên bàn.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'PICK_TARGET_CARD':
        if (interrupt.handPick) {
          const preparing = interrupt.handPick === 'PREPARE';
          const actorSeat = preparing ? interrupt.targetSeat : interrupt.sourceSeat ?? null;
          const actorNameVi = preparing ? targetName : sourceName;
          return {
            headlineVi: preparing ? 'Chuẩn bị bài úp' : 'Chọn bài úp',
            detailVi: actorSeat === viewerSeat ? 'Đến lượt bạn.' : `Đang chờ ${actorNameVi}.`,
            actorSeat, actorNameVi, isMyTurn: actorSeat === viewerSeat, isAllTableWait: false,
          };
        }
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? `Hãy chọn 1 khu bài của ${targetName} để ${interrupt.stealing ? 'lấy 1 lá về tay' : 'hủy bỏ 1 lá'}`
              : `Đang chờ ${sourceName} ${interrupt.stealing ? 'lấy' : 'hủy'} bài từ ${targetName}...`,
          detailVi: 'Chọn từ Tay bài hoặc khu Trang bị ở trung tâm bàn.',
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_PEACH_RESCUE':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? `${targetName} đang hấp hối (0 máu) — Dùng Đào cứu?`
              : `Đang chờ ${responderName} cứu ${targetName} đang hấp hối...`,
          detailVi: 'Mỗi lá Đào hồi 1 máu cho người đang hấp hối.',
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GUAN_XING':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Quan Tinh — Sắp xếp các lá bài lên đầu hoặc xuống đáy chồng bài'
              : `Đang chờ ${targetName} sắp xếp Quan Tinh...`,
          detailVi: 'Dùng các nút ở trung tâm bàn để xếp thứ tự rồi xác nhận.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LUO_SHEN':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Lạc Thần — Phán xét lấy bài chất Đen?'
              : `Đang chờ ${targetName} quyết định Lạc Thần...`,
          detailVi: 'Mỗi lá phán xét chất Đen thu về tay cho đến khi ra Đỏ.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_TU_XI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Đột Tập — Chọn tối đa 2 đối thủ để lấy mỗi người 1 lá (hoặc bỏ qua)'
              : `Đang chờ ${targetName} thực hiện Đột Tập...`,
          detailVi: 'Bỏ qua pha rút bài thông thường nếu chọn ít nhất 1 mục tiêu.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LUO_YI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Phá Giáp — Rút ít hơn 1 lá để tăng +1 sát thương lượt này?'
              : `Đang chờ ${targetName} quyết định Phá Giáp...`,
          detailVi: 'Tăng +1 sát thương cho Kiếm Trảm và Sinh Tử Lôi Đài trong lượt.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_KE_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Tĩnh Thủ — Bỏ qua pha Bỏ bài?'
              : `Đang chờ ${targetName} quyết định Tĩnh Thủ...`,
          detailVi: 'Bạn chưa dùng hay đánh Kiếm Trảm trong lượt đánh chính.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_TIE_QI':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Thiết Kỵ Trảm — Phán xét khóa Thân Pháp của mục tiêu?'
              : `Đang chờ ${sourceName} quyết định Thiết Kỵ Trảm...`,
          detailVi: `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LIU_LI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Chuyển Hoa Ảnh — Bỏ 1 lá để chuyển Kiếm Trảm sang người khác trong tầm?'
              : `Đang chờ ${targetName} quyết định Chuyển Hoa Ảnh...`,
          detailVi: `Người đánh Kiếm Trảm: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GUI_CAI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Đảo Mệnh — Đánh 1 lá trên tay thay thế lá phán xét?'
              : `Đang chờ ${targetName} phản ứng Đảo Mệnh...`,
          detailVi: interrupt.judgeCard
            ? `Lá phán xét: ${formatCardShort(interrupt.judgeCard)}${interrupt.judgePurpose ? ` (${interrupt.judgePurpose})` : ''}.`
            : 'Có thể giữ nguyên hoặc thay thế lá phán xét.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_TIAN_DO':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Thiên Mệnh Thu — Thu lấy lá bài vừa phán xét?'
              : `Đang chờ ${targetName} quyết định Thiên Mệnh Thu...`,
          detailVi: interrupt.judgeCard
            ? `Lá phán xét: ${formatCardShort(interrupt.judgeCard)}.`
            : 'Vũ Văn Mặc có thể thu lấy lá phán xét.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_JIAN_XIONG': {
        const dmgCardDesc = describeJianXiongDamageCard(view, interrupt.targetSeat);
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Hấp Tinh Chiêu — Thu lấy ${dmgCardDesc ?? 'lá bài vừa gây sát thương'}?`
              : `Đang chờ ${targetName} quyết định Hấp Tinh Chiêu...`,
          detailVi: dmgCardDesc
            ? `Bá Tông có thể thu về tay ${dmgCardDesc} vừa gây sát thương.`
            : 'Bá Tông có thể thu về tay lá bài gây sát thương.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      }
      case 'ASK_FAN_KUI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Hồi Hưởng — Lấy 1 lá bài từ ${sourceName}?`
              : `Đang chờ ${targetName} quyết định Hồi Hưởng...`,
          detailVi: `Nguồn sát thương: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_GANG_LIE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Hàn Khí Phản — Phán xét phản công ${sourceName}?`
              : `Đang chờ ${targetName} quyết định Hàn Khí Phản...`,
          detailVi: 'Nếu phán xét không ra Cơ, nguồn sát thương phải bỏ 2 lá hoặc mất 1 sinh lực.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GANG_LIE_CHOICE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Trúng Hàn Khí Phản — Bỏ 2 lá trên tay hoặc chịu 1 sát thương'
              : `Đang chờ ${targetName} chọn hình phạt Hàn Khí Phản...`,
          detailVi: `Từ Thiết Liệt (${sourceName}).`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_YI_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Tâm Kế — Chia 2 lá bài mới rút cho bản thân hoặc đồng đội'
              : `Đang chờ ${targetName} chia bài Tâm Kế...`,
          detailVi: 'Chọn người nhận cho từng lá ở khu trung tâm bàn.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_FAN_JIAN_GUESS':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Đoán Tâm Mưu — Đoán chất bài trước khi rút từ ${sourceName}`
              : `Đang chờ ${targetName} đoán chất Đoán Tâm Mưu...`,
          detailVi: 'Chọn một trong 4 chất ♠ ♥ ♣ ♦.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_JI_JIANG':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? `Vân Lệnh — Đánh Kiếm Trảm giúp Minh Chủ ${targetName}?`
              : `Đang chờ ${responderName} hưởng ứng Vân Lệnh...`,
          detailVi: `Minh Chủ Thanh Vân: ${targetName}.`,
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_HU_JIA':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? `Huyền Giáp Vệ — Đánh Thân Pháp giúp Minh Chủ ${targetName}?`
              : `Đang chờ ${responderName} hưởng ứng Huyền Giáp Vệ...`,
          detailVi: `Minh Chủ Huyền Thiết: ${targetName}.`,
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
    }
  }

  const currentActorName = getPlayerSeatLabel(view.players, view.currentTurnSeat);
  const isSelfTurn = view.currentTurnSeat === viewerSeat;

  switch (view.turnPhase) {
    case 'JUDGE':
      return {
        headlineVi: `Pha Phán Xét — ${currentActorName}`,
        detailVi: 'Đang kiểm tra các lá Bí kíp Thời gian.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    case 'DRAW': {
      const selfHeroId = viewer?.heroId;
      const drawCount =
        view.availableDrawCount ??
        (selfHeroId === 'zhou_yu' ? 3 : selfHeroId === 'xu_chu' ? 1 : 2);
      const skillTag =
        selfHeroId === 'zhou_yu'
          ? ' — Tâm Nhãn (+1 lá)'
          : selfHeroId === 'xu_chu'
            ? ' — Phá Giáp (rút 1 lá đầu)'
            : '';
      return {
        headlineVi: isSelfTurn
          ? `ĐẾN LƯỢT BẠN — PHA RÚT BÀI (Rút ${drawCount} lá${skillTag})`
          : `Pha Rút Bài — ${currentActorName}`,
        detailVi: isSelfTurn
          ? selfHeroId === 'xu_chu'
            ? 'Bấm nút Rút bài bên dưới hoặc chồng bài rút (Enter / Space) để rút 1 lá đầu lượt.'
            : 'Bấm nút Rút bài bên dưới hoặc chồng bài rút (Enter / Space) để bắt đầu lượt.'
          : 'Đang rút bài đầu lượt.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    }
    case 'PLAY': {
      const isSelfLuoYiDrawSecond = isSelfTurn && Boolean(view.turnFlags?.drawSecondAvailable);
      return {
        headlineVi: isSelfTurn
          ? 'Lượt của bạn — Pha Ra Chiêu'
          : `Đang chờ ${currentActorName} đánh bài...`,
        detailVi: isSelfTurn
          ? isSelfLuoYiDrawSecond
            ? 'Bạn có thể rút thêm lá thứ 2 (bỏ Phá Giáp) hoặc đánh Kiếm Trảm / Sinh Tử Lôi Đài ngay để +1 sát thương.'
            : 'Chọn lá bài hoặc chiêu thức bên dưới rồi chọn mục tiêu nếu cần.'
          : 'Bạn có thể bật "Tự bỏ qua Hóa Giải" nếu không muốn giữ nhịp chờ.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    }
    case 'DISCARD': {
      const needDrop = Math.max(0, (viewer?.handCount ?? 0) - Math.max(0, viewer?.hp ?? 0));
      return {
        headlineVi: isSelfTurn
          ? `Pha Bỏ Bài — Cần bỏ ${needDrop} lá bài`
          : `Đang chờ ${currentActorName} bỏ bài cuối lượt...`,
        detailVi: isSelfTurn
          ? `Giới hạn bài trên tay bằng máu hiện tại (${Math.max(0, viewer?.hp ?? 0)} lá).`
          : 'Kết thúc pha bỏ bài sẽ chuyển lượt sang ghế kế tiếp.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    }
    case 'END':
      return {
        headlineVi: `Pha Kết Lượt — ${currentActorName}`,
        detailVi: 'Đang hoàn tất kỹ năng cuối lượt.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
  }
}

export function isCardRed(card: Pick<CardInstance, 'suit'>): boolean {
  return isRedSuit(card.suit);
}

export function getDistanceToSeat(
  view: PlayerViewState,
  targetSeat: number,
): number {
  return calculateDistance(view, view.viewerSeatIndex, targetSeat);
}

const DESCRIPTION_BY_CARD_KEY: Readonly<Record<string, string>> =
  STANDARD_DECK_TEMPLATES.reduce<Record<string, string>>((acc, tpl) => {
    if (!acc[tpl.cardKey]) {
      acc[tpl.cardKey] = tpl.descriptionVi;
    }
    return acc;
  }, {});

export function getCardDescriptionVi(cardKey: string, fallbackName = ''): string {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  return getCuuChauCardDisplay(cardKey, locale, fallbackName).description;
}

export type EquipmentSlotKey = 'weapon' | 'armor' | 'plusOne' | 'minusOne';

export type MatchInspectorTarget =
  | {
      readonly kind: 'card';
      readonly sourceId: string;
      readonly sourceLabel: string;
      readonly card: CardInstance;
    }
  | {
      readonly kind: 'hero';
      readonly seatIndex: number;
    };

export function getConvertAsCardKey(
  mode: ConvertCardMode | null,
): 'sat' | 'qua_ha_sai_cau' | 'lac_bat_tu_thuc' | undefined {
  if (mode === 'wu_sheng' || mode === 'long_dan_sat' || mode === 'truong_bat') {
    return 'sat';
  }
  if (mode === 'ky_tap') {
    return 'qua_ha_sai_cau';
  }
  if (mode === 'quoc_sac') {
    return 'lac_bat_tu_thuc';
  }
  return undefined;
}

export type DragDropIntent =
  | {
      readonly kind: 'table';
      readonly actionLabelVi: string;
      readonly highlightSlot?: EquipmentSlotKey;
      readonly action: GameAction;
    }
  | {
      readonly kind: 'seat';
      readonly card: CardInstance;
      readonly actionVerbVi: string;
      readonly eligibleSeats: readonly number[];
      readonly asCardKey?: 'sat' | 'qua_ha_sai_cau' | 'lac_bat_tu_thuc';
    }
  | {
      readonly kind: 'seat_pair_step1';
      readonly card: CardInstance;
      readonly actionLabelVi: string;
      readonly eligibleSeats: readonly number[];
    }
  | {
      readonly kind: 'toggle_select';
      readonly promptVi: string;
    }
  | {
      readonly kind: 'blocked';
      readonly reasonVi: string;
    };

function isCardValidForPlayConvert(
  card: CardInstance,
  mode: ConvertCardMode | null,
): string | null {
  if (!mode || isCardValidForConvertMode(card, mode)) return null;
  switch (mode) {
    case 'wu_sheng':
      return 'Thanh Long Trảm cần chọn lá chất Đỏ (Cơ/Rô).';
    case 'long_dan_sat':
      return 'Ngân Thương Thế (chuyển Kiếm Trảm) cần lá Thân Pháp.';
    case 'ky_tap':
      return 'Dạ Tập Doanh cần chọn lá chất Đen (Bích/Chuồn).';
    case 'quoc_sac':
      return 'Thiên Hương Phong cần chọn lá chất Rô.';
    case 'cuu_vien':
      return 'Cứu Tử Phù cần chọn lá chất Đỏ.';
    default:
      return null;
  }
}

/** Suy luận hành động kéo-thả cho một lá bài từ trạng thái ván đấu hiện tại. */
export function buildCardDragDropIntent(
  view: PlayerViewState,
  card: CardInstance,
  selection: MatchSelectionState,
): DragDropIntent {
  const selfSeat = view.viewerSeatIndex;
  const selfPlayer = view.players.find((p) => p.seatIndex === selfSeat);
  if (!selfPlayer || !selfPlayer.alive) {
    return { kind: 'blocked', reasonVi: 'Ghế của bạn hiện không thể đánh bài.' };
  }

  const interrupt = view.activeInterrupt;
  if (interrupt) {
    if (interrupt.kind === 'WAIT_NULLIFICATION') {
      if (!interrupt.canRespondNullification) {
        return { kind: 'blocked', reasonVi: 'Đang chờ phản ứng Hóa Giải Chân Khí.' };
      }
      if (card.cardKey === 'vo_giai_kha_kich') {
        return {
          kind: 'table',
          actionLabelVi: 'Thả lên bàn để đánh Hóa Giải Chân Khí',
          action: { type: 'RESPOND_NULLIFICATION', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần dùng lá Hóa Giải Chân Khí để hưởng ứng.' };
    }
    if (
      (interrupt.kind === 'WAIT_DODGE' || interrupt.kind === 'WAIT_AOE_DODGE') &&
      interrupt.targetSeat === selfSeat
    ) {
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'sat';
      const canThanhQuoc =
        selfPlayer.heroId === 'zhen_ji' && (card.suit === 'SPADE' || card.suit === 'CLUB');
      if (card.cardKey === 'thiem' || canLongDan || canThanhQuoc) {
        return {
          kind: 'table',
          actionLabelVi: `Thả để đánh Thân Pháp (${card.nameVi}) né đòn`,
          action: {
            type: interrupt.kind === 'WAIT_AOE_DODGE' ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
            seatIndex: selfSeat,
            cardId: card.id,
          },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Thân Pháp để né đòn.' };
    }
    if (
      interrupt.kind === 'WAIT_COLLATERAL_SAT'
        ? interrupt.attackerSeat === selfSeat
        : (interrupt.kind === 'WAIT_AOE_SAT' || interrupt.kind === 'WAIT_DUEL_SAT') &&
          interrupt.targetSeat === selfSeat
    ) {
      const canWuSheng = selfPlayer.heroId === 'guan_yu' && isRedSuit(card.suit);
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'thiem';
      if (card.cardKey === 'sat' || canWuSheng || canLongDan) {
        const actionType =
          interrupt.kind === 'WAIT_AOE_SAT'
            ? 'RESPOND_AOE_SAT'
            : interrupt.kind === 'WAIT_DUEL_SAT'
              ? 'RESPOND_DUEL_SAT'
              : 'RESPOND_COLLATERAL_SAT';
        return {
          kind: 'table',
          actionLabelVi: `Thả để đánh Kiếm Trảm (${card.nameVi})`,
          action: { type: actionType, seatIndex: selfSeat, cardIds: [card.id] },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Kiếm Trảm để hưởng ứng.' };
    }
    if (interrupt.kind === 'WAIT_PEACH_RESCUE' && interrupt.responderSeat === selfSeat) {
      const canJiu =
        selfPlayer.heroId === 'hua_tuo' &&
        view.currentTurnSeat !== selfSeat &&
        isRedSuit(card.suit);
      if (card.cardKey === 'dao' || canJiu) {
        return {
          kind: 'table',
          actionLabelVi: `Thả để dùng ${card.nameVi} cứu nguy kịch`,
          action: { type: 'RESPOND_PEACH_RESCUE', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Hồi Xuân Đan để cứu người nguy kịch.' };
    }
    if (interrupt.kind === 'WAIT_GUI_CAI' && interrupt.targetSeat === selfSeat) {
      return {
        kind: 'table',
        actionLabelVi: `Thả ${card.nameVi} đổi lá phán xét (Đảo Mệnh)`,
        action: { type: 'RESPOND_GUI_CAI', seatIndex: selfSeat, cardId: card.id },
      };
    }
    if (interrupt.kind === 'WAIT_JI_JIANG' && interrupt.responderSeat === selfSeat) {
      const canWuSheng = selfPlayer.heroId === 'guan_yu' && isRedSuit(card.suit);
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'thiem';
      if (card.cardKey === 'sat' || canWuSheng || canLongDan) {
        return {
          kind: 'table',
          actionLabelVi: `Thả ${card.nameVi} đánh Kiếm Trảm hộ Minh Chủ`,
          action: { type: 'RESPOND_JI_JIANG', seatIndex: selfSeat, cardIds: [card.id] },
        };
      }
    }
    if (interrupt.kind === 'WAIT_HU_JIA' && interrupt.responderSeat === selfSeat) {
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'sat';
      const canThanhQuoc =
        selfPlayer.heroId === 'zhen_ji' && (card.suit === 'SPADE' || card.suit === 'CLUB');
      if (card.cardKey === 'thiem' || canLongDan || canThanhQuoc) {
        return {
          kind: 'table',
          actionLabelVi: `Thả ${card.nameVi} đánh Thân Pháp hộ Minh Chủ`,
          action: { type: 'RESPOND_HU_JIA', seatIndex: selfSeat, cardId: card.id },
        };
      }
    }
    return {
      kind: 'blocked',
      reasonVi: 'Hãy bấm nút phản ứng ở thanh lệnh phía trên dải bài.',
    };
  }

  if (view.turnPhase === 'DISCARD' && view.currentTurnSeat === selfSeat) {
    const handCount = selfPlayer.handCards?.length ?? 0;
    const discardNeeded = Math.max(0, handCount - Math.max(0, selfPlayer.hp));
    if (discardNeeded <= 1) {
      return {
        kind: 'table',
        actionLabelVi: `Thả lên bàn để bỏ ${card.nameVi}`,
        action: { type: 'DISCARD_CARDS', seatIndex: selfSeat, cardIds: [card.id] },
      };
    }
    return {
      kind: 'toggle_select',
      promptVi: `Pha bỏ ${discardNeeded} lá — thả để chọn/bỏ chọn lá này`,
    };
  }

  if (view.turnPhase === 'PLAY' && view.currentTurnSeat === selfSeat) {
    if (selection.activeConvertMode === 'truong_bat') {
      return {
        kind: 'toggle_select',
        promptVi: 'Xà Ảnh Mâu cần chọn đủ 2 lá trên tay rồi chọn mục tiêu.',
      };
    }
    const convertErr = isCardValidForPlayConvert(card, selection.activeConvertMode);
    if (convertErr) {
      return { kind: 'blocked', reasonVi: convertErr };
    }
    const hyp: MatchSelectionState = {
      selectedCardIds: [card.id],
      selectedTargets: [],
      activeSkillMode: null,
      activeConvertMode: selection.activeConvertMode,
    };
    const effectiveKey = getEffectivePlayCardKey(hyp, selfPlayer.handCards ?? [card]);
    if (!effectiveKey) {
      return { kind: 'blocked', reasonVi: 'Không thể dùng lá bài này lúc này.' };
    }
    if (effectiveKey === 'thiem') {
      return { kind: 'blocked', reasonVi: 'Lá Thân Pháp chỉ dùng khi né Kiếm Trảm hoặc Mưa Tên Bão Vũ.' };
    }
    if (effectiveKey === 'vo_giai_kha_kich') {
      return { kind: 'blocked', reasonVi: 'Hóa Giải Chân Khí chỉ dùng khi Bí kíp sắp hiệu lực.' };
    }
    if (effectiveKey === 'dao' && selfPlayer.hp >= selfPlayer.maxHp) {
      return { kind: 'blocked', reasonVi: 'Sinh lực đang đầy — chưa thể dùng Hồi Xuân Đan.' };
    }
    if (effectiveKey === 'sat') {
      if (view.peacefulFirstRound && view.roundNumber === 1) {
        return {
          kind: 'blocked',
          reasonVi: 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
        };
      }
      const unlimited =
        selfPlayer.heroId === 'zhang_fei' ||
        selfPlayer.equipments.weapon?.cardKey === 'gia_cat_lien_no';
      if (!unlimited && (view.turnFlags?.satUsedThisTurn ?? 0) >= 1) {
        return { kind: 'blocked', reasonVi: 'Bạn đã dùng Kiếm Trảm trong lượt đánh này.' };
      }
    }

    const spec = getRequiredTargetSpec(view, hyp);
    const asCardKey = getConvertAsCardKey(selection.activeConvertMode);
    if (spec.minTargets === 2) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: 'Không có người cầm Binh khí thích hợp.' };
      }
      return {
        kind: 'seat_pair_step1',
        card,
        actionLabelVi: 'Thả vào người cầm Binh khí trước (Bước 1/2)',
        eligibleSeats: spec.eligibleSeats,
      };
    }
    if (spec.minTargets >= 1 && spec.maxTargets === 1) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: 'Không có mục tiêu hợp lệ trong tầm đánh.' };
      }
      const actionVerbVi =
        effectiveKey === 'sat'
          ? 'đánh Kiếm Trảm'
          : effectiveKey === 'quyet_dau'
            ? 'Sinh Tử Lôi Đài'
            : effectiveKey === 'thuan_thu_khien_duong'
              ? 'Thám Nang Thủ'
              : effectiveKey === 'qua_ha_sai_cau'
                ? 'Phá Trận Chưởng'
                : effectiveKey === 'lac_bat_tu_thuc'
                  ? 'đặt Phong Mạch'
                  : 'dùng lên';
      return {
        kind: 'seat',
        card,
        actionVerbVi,
        eligibleSeats: spec.eligibleSeats,
        ...(asCardKey ? { asCardKey } : {}),
      };
    }

    const highlightSlot: EquipmentSlotKey | undefined =
      card.category === 'WEAPON'
        ? 'weapon'
        : card.category === 'ARMOR'
          ? 'armor'
          : card.category === 'PLUS_ONE_HORSE'
            ? 'plusOne'
            : card.category === 'MINUS_ONE_HORSE'
              ? 'minusOne'
              : undefined;

    return {
      kind: 'table',
      actionLabelVi: highlightSlot
        ? `Thả lên bàn để trang bị ${card.nameVi}`
        : `Thả lên bàn để dùng ${card.nameVi}`,
      ...(highlightSlot ? { highlightSlot } : {}),
      action: {
        type: 'PLAY_CARD',
        seatIndex: selfSeat,
        cardIds: [card.id],
        ...(asCardKey ? { asCardKey } : {}),
      },
    };
  }

  return {
    kind: 'blocked',
    reasonVi: '',
  };
}

const MATCH_ERROR_VI_MAP: Readonly<Record<string, string>> = {
  FIRST_ROUND_SAT_FORBIDDEN: 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
  SAT_LIMIT_REACHED: 'Bạn đã xuất Kiếm Trảm trong lượt này rồi.',
  HP_ALREADY_FULL: 'Sinh Lực đang đầy, chưa thể dùng Hồi Xuân Đan.',
  TARGET_OUT_OF_RANGE: 'Mục tiêu nằm ngoài tầm đánh.',
  SNATCH_TARGET_OUT_OF_RANGE: 'Mục tiêu nằm ngoài khoảng cách 1.',
  TARGET_IMMUNE_TO_CARD: 'Mục tiêu miễn nhiễm với lá bài này.',
  CANNOT_DISCARD_QUAN_THACH_PHU_SELF:
    'Không thể bỏ chính Phá Sơn Phủ để kích hoạt Phá Sơn Phủ.',
  DELAYED_ZONE_NOT_ALLOWED: 'Không thể chọn lá ở vùng Ấn chú.',
  SIMULATED_DELAY_CANNOT_BE_ANSWERED_BY_PLAYER:
    'Đang giữ nhịp chờ Hóa Giải ngắn để tránh lộ bài.',
  INVALID_LIU_LI_TARGET: 'Mục tiêu Chuyển Hoa Ảnh phải là người khác trong tầm đánh.',
  LIU_LI_REQUIRES_CARD_AND_TARGET: 'Chuyển Hoa Ảnh cần chọn 1 lá bài và 1 mục tiêu trong tầm.',
  JI_JIANG_NOT_AVAILABLE: 'Không thể kích hoạt Vân Lệnh lúc này.',
  NO_SHU_ALLIES_FOR_JI_JIANG: 'Không còn đồng môn Thanh Vân để hưởng ứng.',
  HU_JIA_NOT_AVAILABLE: 'Không thể kích hoạt Huyền Giáp Vệ lúc này.',
  NO_WEI_ALLIES_FOR_HU_JIA: 'Không còn đồng môn Huyền Thiết để hưởng ứng.',
  BAGUA_NOT_AVAILABLE: 'Không thể dùng Bát Quái Y lúc này.',
  QUAN_THACH_PHU_REQUIRES_2_CARDS: 'Phá Sơn Phủ cần chọn đúng 2 lá bài để bỏ.',
  HAN_BANG_KIEM_MUST_PICK_1_OR_2_CARDS: 'Băng Phách Kiếm chỉ hủy 1 hoặc 2 lá của mục tiêu.',
  INTERRUPT_PENDING: 'Đang có phản ứng khác cần xử lý trước.',
  NOT_IN_PLAY_PHASE: 'Hiện không phải pha Hành động.',
  NOT_IN_DISCARD_PHASE: 'Hiện không phải pha Bỏ bài.',
  DEAD_PLAYER_CANNOT_ACT: 'Hiệp khách đã ngã xuống, không thể thao tác.',
  INVALID_TWO_CARD_COMBO: 'Cần chọn đúng 2 lá bài trên tay cho Xà Ảnh Mâu.',
  INVALID_STRIKE_TARGET_COUNT: 'Số lượng mục tiêu cho Kiếm Trảm chưa hợp lệ.',
  MUST_SELECT_ONE_CARD: 'Vui lòng chọn 1 lá bài.',
  NOT_A_SAT_CARD: 'Lá bài đã chọn không phải Kiếm Trảm.',
  NOT_A_THIEM_CARD: 'Lá bài đã chọn không phải Thân Pháp.',
  NOT_A_DAO_CARD: 'Lá bài đã chọn không phải Hồi Xuân Đan.',
  NOT_A_NULLIFICATION_CARD: 'Lá bài đã chọn không phải Hóa Giải Chân Khí.',
  INVALID_DELAYED_TARGET: 'Mục tiêu đặt ấn chú không hợp lệ.',
  TARGET_ALREADY_HAS_LAC: 'Mục tiêu đã có Điểm Huyệt Phong Mạch trước mặt.',
  ALREADY_HAS_THIEM_DIEN: 'Bạn đã có Thiên Lôi Kiếp trước mặt rồi.',
  INVALID_DISMANTLE_TARGET: 'Không thể dùng Phá Trận Chưởng lên chính mình.',
  TARGET_HAS_NO_CARDS: 'Mục tiêu không có lá bài nào.',
  INVALID_DUEL_TARGET: 'Không thể Sinh Tử Lôi Đài với chính mình.',
  INVALID_COLLATERAL_TARGETS: 'Mục tiêu Tá Kiếm Trảm Phong không hợp lệ.',
  TARGET_NOT_ALIVE: 'Mục tiêu đã ngã xuống.',
  NULLIFICATION_ALREADY_PASSED: 'Bạn đã bỏ qua Hóa Giải Chân Khí cho lượt này.',
  NOT_ELIGIBLE_FOR_NULLIFICATION: 'Hiện không thể đánh Hóa Giải Chân Khí.',
  INVALID_TU_XI_TARGETS: 'Mục tiêu Đoạt Lương không hợp lệ.',
  MATCH_ALREADY_FINISHED: 'Ván đấu đã kết thúc.',
  INVALID_SAT_CARD_COUNT: 'Số lượng lá Kiếm Trảm không hợp lệ.',
  CARD_NOT_IN_HAND: 'Lá bài không còn trên tay.',
};

/** Chuyển mọi mã lỗi kỹ thuật từ engine/WS thành thông báo tiếng Việt dễ hiểu. */
export function formatMatchErrorVi(
  err: unknown,
  fallback = 'Thao tác chưa hợp lệ.',
): string {
  const raw =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const direct = MATCH_ERROR_VI_MAP[trimmed];
  if (direct) {
    return direct;
  }
  if (trimmed.startsWith('CARD_CANNOT_BE_PLAYED_DIRECTLY:')) {
    const cardKey = trimmed.slice('CARD_CANNOT_BE_PLAYED_DIRECTLY:'.length);
    if (cardKey === 'thiem') {
      return 'Lá Thân Pháp chỉ dùng khi né Kiếm Trảm hoặc Mưa Tên Bão Vũ.';
    }
    if (cardKey === 'vo_giai_kha_kich') {
      return 'Hóa Giải Chân Khí chỉ dùng khi Bí kíp sắp có hiệu lực.';
    }
    return 'Lá bài này không thể đánh trực tiếp lúc này.';
  }
  if (trimmed.startsWith('MUST_DISCARD_EXACTLY:')) {
    const count = trimmed.slice('MUST_DISCARD_EXACTLY:'.length);
    return `Cần chọn đúng ${count} lá bài để bỏ.`;
  }
  if (trimmed.startsWith('CANNOT_CONVERT_CARD_AS:')) {
    return 'Lá bài đã chọn không đủ điều kiện chuyển đổi.';
  }
  if (trimmed.startsWith('CARD_NOT_IN_HAND:')) {
    return 'Lá bài không còn trên tay.';
  }
  if (trimmed.startsWith('CARD_NOT_OWNED:')) {
    return 'Bạn không sở hữu lá bài này.';
  }
  if (trimmed.startsWith('EXPECTED_INTERRUPT:')) {
    return 'Trạng thái phản ứng đã thay đổi, vui lòng thử lại.';
  }
  return /^[A-Z0-9_:]+$/.test(trimmed) ? fallback : trimmed;
}

const LEGACY_REPLACEMENT_CACHE: Partial<
  Record<'vi' | 'en', { readonly regex: RegExp; readonly map: ReadonlyMap<string, string> }>
> = {};

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLegacyReplacementMatcher(locale: 'vi' | 'en') {
  const existing = LEGACY_REPLACEMENT_CACHE[locale];
  if (existing) {
    return existing;
  }
  const map = new Map<string, string>();
  const add = (legacy: string | undefined | null, replacement: string | undefined | null) => {
    if (!legacy || !replacement || legacy === replacement) return;
    if (!map.has(legacy)) {
      map.set(legacy, replacement);
    }
  };

  // Roles
  add('Chủ Công', getCuuChauRoleDisplay('LORD', locale).name);
  add('Trung Thần', getCuuChauRoleDisplay('LOYALIST', locale).name);
  add('Phản Tặc', getCuuChauRoleDisplay('REBEL', locale).name);
  add('Nội Gián', getCuuChauRoleDisplay('SPY', locale).name);

  // Factions
  add('Thục', getCuuChauFactionDisplay('SHU', locale).name);
  add('Ngụy', getCuuChauFactionDisplay('WEI', locale).name);
  add('Ngô', getCuuChauFactionDisplay('WU', locale).name);
  add('Quần', getCuuChauFactionDisplay('QUN', locale).name);

  // Heroes + Hero Skills from catalog
  for (const legacyHero of HERO_CATALOG) {
    const cuuHero = getCuuChauHeroDisplay(legacyHero.id, locale);
    if (!cuuHero) continue;
    add(legacyHero.nameVi, cuuHero.name);
    for (const legacySkill of legacyHero.skills) {
      const cuuSkill = cuuHero.skills.find((s) => s.id === legacySkill.id);
      if (cuuSkill) {
        add(legacySkill.nameVi, cuuSkill.name);
      }
    }
  }
  for (const h of CUU_CHAU_HEROES) {
    const cuuHero = getCuuChauHeroDisplay(h.id, locale);
    if (!cuuHero) continue;
    const leg = HERO_CATALOG.find((x) => x.id === h.legacySlotId);
    if (leg) {
      add(leg.nameVi, cuuHero.name);
    }
  }

  // Cards (32 templates + alternate spellings/short forms)
  for (const tpl of STANDARD_DECK_TEMPLATES) {
    add(tpl.nameVi, getCuuChauCardDisplay(tpl.cardKey, locale, tpl.nameVi).name);
  }
  add('Từ Hùng Song Cổ Kiếm', getCuuChauCardDisplay('thu_hung_song_co_kiem', locale).name);
  add('Vô Giải', getCuuChauCardDisplay('vo_giai_kha_kich', locale).name);
  add('Ngũ Cốc', getCuuChauCardDisplay('ngu_coc_phong_dang', locale).name);
  add('Quá Hà', getCuuChauCardDisplay('qua_ha_sai_cau', locale).name);
  add('Thuận Thủ', getCuuChauCardDisplay('thuan_thu_khien_duong', locale).name);
  add('Tá Đao', getCuuChauCardDisplay('ta_dao_sat_nhan', locale).name);
  add('Nam Man', getCuuChauCardDisplay('nam_man_nhap_xam', locale).name);
  add('Vạn Tiễn', getCuuChauCardDisplay('van_tien_te_phat', locale).name);
  add('Đào Viên', getCuuChauCardDisplay('dao_vien_ket_nghia', locale).name);
  add('Trượng Bát', getCuuChauCardDisplay('truong_bat_xa_mau', locale).name);
  add('Thanh Long Đao', getCuuChauCardDisplay('thanh_long_yen_nguyet_dao', locale).name);
  add('máu', locale === 'en' ? 'HP' : 'sinh lực');

  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(?<![\\p{L}\\d])(?:${keys.map(escapeRegExpLiteral).join('|')})(?![\\p{L}\\d])`, 'gu');
  const created = { regex, map };
  LEGACY_REPLACEMENT_CACHE[locale] = created;
  return created;
}

/** Chuyển mọi chuỗi nhật ký / thông báo từ engine legacy sang tên gọi Cửu Châu Ẩn Kiếm theo ngôn ngữ đang chọn. */
export function formatCuuChauDisplayText(
  text: string,
  locale: 'vi' | 'en' = i18n.language === 'en' ? 'en' : 'vi',
): string {
  if (!text) return text;
  const { regex, map } = getLegacyReplacementMatcher(locale);
  return text.replace(regex, (matched) => map.get(matched) ?? matched);
}
