import {
  CUU_CHAU_DECK_TEMPLATES,
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

export function getIdentityLabelVi(
  identity: IdentityRole | 'UNKNOWN',
  localeOverride?: 'vi' | 'en',
): string {
  const locale = localeOverride ?? (i18n.language === 'en' ? 'en' : 'vi');
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
  const en = i18n.language === 'en';
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
      promptVi: en
        ? 'Ration Raid: choose 1–2 opponents who hold hand cards'
        : 'Đột Tập: chọn 1 đến 2 đối thủ còn bài trên tay',
    };
  }

  if (
    view.activeInterrupt?.kind === 'ASK_LIU_LI' &&
    view.activeInterrupt.targetSeat === view.viewerSeatIndex
  ) {
    const sourceSeat = view.activeInterrupt.sourceSeat;
    const excluded = new Set(view.activeInterrupt.excludedSeats ?? []);
    return {
      minTargets: 1,
      maxTargets: 1,
      eligibleSeats: aliveOthers
        .filter(
          (p) =>
            p.seatIndex !== sourceSeat &&
            !excluded.has(p.seatIndex) &&
            isInAttackRange(view, view.viewerSeatIndex, p.seatIndex) &&
            !isKongChengProtected(p),
        )
        .map((p) => p.seatIndex),
      promptVi: en
        ? 'Flowing Mirage: choose 1 other fighter in range to redirect the Strike'
        : 'Chuyển Hoa Ảnh: chọn 1 người khác trong tầm đánh để chuyển Kiếm Trảm',
    };
  }

  if (selection.activeSkillMode) {
    switch (selection.activeSkillMode) {
      case 'ren_de':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: en
            ? 'Select 1 ally to gift hand cards (Cloud Favor)'
            : 'Hãy bấm chọn 1 người chơi để giao bài (Thanh Vân Độ)',
        };
      case 'ji_jiang':
        if (view.turnPhase === 'PLAY' && view.peacefulFirstRound && view.roundNumber === 1) {
          return {
            minTargets: 1,
            maxTargets: 1,
            eligibleSeats: [],
            promptVi: en
              ? 'Peaceful Round 1: Strikes are disabled on the opening round.'
              : 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
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
          promptVi: en
            ? 'Select 1 target within attack range for Cloud Command'
            : 'Hãy bấm chọn 1 mục tiêu trong tầm đánh để Vân Lệnh',
        };
      case 'zhi_heng':
      case 'ku_rou':
        return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
      case 'fan_jian':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: en
            ? 'Select 1 opponent for Mind Gambit'
            : 'Hãy bấm chọn 1 đối thủ để phát động Đoán Tâm Mưu',
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
          promptVi: en
            ? 'Select 1 wounded male fighter (Shared Oath)'
            : 'Hãy bấm chọn 1 nam hiệp khách đang bị thương (Hợp Đan)',
        };
      case 'qing_nang':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: view.players
            .filter((p) => p.alive && p.hp < p.maxHp)
            .map((p) => p.seatIndex),
          promptVi: en
            ? 'Select 1 wounded fighter to heal 1 HP (Herbal Satchel)'
            : 'Hãy bấm chọn 1 người đang bị thương để hồi 1 sinh lực (Dược Nang)',
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
              ? (en
                  ? 'Select 2 different male fighters for Shadow Discord duel'
                  : 'Hãy bấm chọn 2 nam hiệp khách khác nhau để Sinh Tử Lôi Đài (Ly Tâm Kế)')
              : (en
                  ? 'Select 1 more male fighter to finish Shadow Discord'
                  : 'Chọn thêm 1 nam hiệp khách nữa để hoàn tất Ly Tâm Kế'),
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
    case 'sat':
    case 'pha_giap_tram': {
      if (view.turnPhase === 'PLAY' && view.peacefulFirstRound && view.roundNumber === 1) {
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: [],
          promptVi: en
            ? 'Peaceful Round 1: Strikes are disabled on the opening round.'
            : 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
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
          ? (en
              ? 'Sky-Piercer Halberd: choose 1–3 targets within attack range'
              : 'Phương Thiên Họa Kích: chọn 1 đến 3 mục tiêu trong tầm đánh')
          : (en
              ? 'Click a gold-highlighted target within attack range'
              : 'Hãy bấm chọn 1 mục tiêu sáng viền vàng trên bàn'),
      };
    }
    case 'kinh_loi_chan': {
      const eligible = aliveOthers.map((p) => p.seatIndex);
      return {
        minTargets: 1,
        maxTargets: 1,
        eligibleSeats: eligible,
        promptVi: en
          ? 'Choose 1 opponent for Thunderclap Pulse'
          : 'Hãy bấm chọn 1 đối thủ để dùng Kinh Lôi Chấn',
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
            ? (en
                ? 'Arcane Craft: pick any opponent with cards (no distance limit)'
                : 'Cơ Xảo: chọn bất kỳ mục tiêu có bài để Thám Nang Thủ (không giới hạn khoảng cách)')
            : (en
                ? 'Choose 1 target within distance 1 for Sleight of Hand'
                : 'Hãy bấm chọn 1 mục tiêu trong khoảng cách 1 để Thám Nang Thủ'),
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
        promptVi: en
          ? 'Choose 1 opponent with cards for Break Formation'
          : 'Hãy bấm chọn 1 mục tiêu có bài để Phá Trận Chưởng',
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
        promptVi: en
          ? 'Choose 1 opponent for Trial by Combat'
          : 'Hãy bấm chọn 1 mục tiêu để Sinh Tử Lôi Đài',
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
          promptVi: en
            ? 'Step 1/2: Select an opponent holding a Weapon'
            : 'Bước 1/2: Chọn 1 người chơi đang cầm Binh khí',
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
        promptVi: en
          ? 'Step 2/2: Select a victim inside their attack range'
          : 'Bước 2/2: Chọn thêm 1 mục tiêu nằm trong tầm đánh của họ',
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
        promptVi: en
          ? 'Choose 1 opponent to seal with Acupoint Seal'
          : 'Hãy bấm chọn 1 mục tiêu để đặt Điểm Huyệt Phong Mạch',
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

  const en = i18n.language === 'en';

  if (view.turnPhase === 'GAME_OVER') {
    return {
      headlineVi: en ? 'Match Ended' : 'Ván đấu đã kết thúc',
      detailVi: en ? 'All roles are revealed and the winning faction is decided.' : 'Đã lật toàn bộ Thân Phận và tổng kết phe chiến thắng.',
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
        headlineVi: en ? 'Preparing Warrior Draft...' : 'Đang chuẩn bị chọn Hiệp Khách...',
        detailVi: en ? 'Distributing candidate warriors to each seat.' : 'Hệ thống đang chia danh sách Hiệp Khách cho từng ghế.',
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
        const rawOrigName =
          nullifyInterrupt.originalScrollNameVi ?? interrupt.scrollNameVi ?? (en ? 'Scroll' : 'Bí kíp');
        const origName = formatCuuChauDisplayText(rawOrigName, en ? 'en' : 'vi');
        const origTargetSeat = nullifyInterrupt.originalTargetSeat ?? interrupt.targetSeat;
        const origTargetName = getPlayerSeatLabel(view.players, origTargetSeat);
        const depth = nullifyInterrupt.nullifyDepth ?? 0;
        const isCounter = depth % 2 === 1;
        const canRespond = interrupt.canRespondNullification === true;
        const targetsViewer = origTargetSeat === viewerSeat && !isCounter;
        return {
          headlineVi: canRespond
            ? isCounter
              ? (en ? `Counter Qi Negation — Block ${origName}?` : `Phản Hóa Giải Chân Khí — Có chặn ${origName}?`)
              : targetsViewer
                ? (en ? `⚠️ ${origName} targets YOU — Play Qi Negation?` : `⚠️ ${origName} nhắm vào BẠN — Đánh Hóa Giải Chân Khí?`)
                : (en ? `Play Qi Negation to block ${origName} (${origTargetName})?` : `Có đánh Hóa Giải chặn ${origName} (${origTargetName})?`)
            : isCounter
              ? (en ? `Resolving Counter Qi Negation (${origName})...` : `Đang giải quyết phản Hóa Giải (${origName})...`)
              : (en ? `Resolving ${origName} → ${origTargetName}...` : `Đang giải quyết ${origName} → ${origTargetName}...`),
          detailVi: canRespond
            ? isCounter
              ? (en ? `${origName} → ${origTargetName}. Countering keeps the original scroll active.` : `${origName} → ${origTargetName}. Phản Hóa Giải sẽ giữ bí kíp gốc tiếp tục hiệu lực.`)
              : (en ? `Scroll is about to resolve on ${origTargetName}. Play Qi Negation or Pass.` : `Bí kíp sắp có hiệu lực lên ${origTargetName}. Chọn Đánh Hóa Giải hoặc Cho qua.`)
            : (en ? `${origName} targeting ${origTargetName}.` : `${origName} nhắm vào ${origTargetName}.`),
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
              ? (en ? 'Frostheart Twinblades — Discard 1 card or let attacker draw 1' : 'Hàn Tâm Song Kiếm — Chọn bỏ 1 lá hoặc cho đối thủ rút 1 lá')
              : (en ? `Waiting for ${targetName} (Frostheart Twinblades)...` : `Đang chờ ${targetName} chọn hiệu ứng Hàn Tâm Song Kiếm...`),
          detailVi: en ? `${sourceName} struck ${targetName}.` : `${sourceName} đánh Kiếm Trảm khác giới vào ${targetName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DODGE': {
        const req = interrupt.requiredCount ?? 1;
        const dodged = interrupt.dodgedSoFar ?? 0;
        const voSongHint = req >= 2 ? (en ? ' (Ninefold Unrivaled)' : ' (Bá Thể — Cửu Diện Vô Song)') : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? `Incoming Strike${voSongHint} — Need ${req} Shadow Step (${dodged} played)` : `Bạn bị đánh Kiếm Trảm${voSongHint} — Cần ${req} lá Thân Pháp (đã né ${dodged})`)
              : (en ? `Waiting for ${targetName} to play ${req} Shadow Step...` : `Đang chờ ${targetName} đánh ${req} lá Thân Pháp né đòn...`),
          detailVi:
            req >= 2
              ? (en ? `Source: ${sourceName} (requires ${req} Shadow Steps).` : `Nguồn sát thương: ${sourceName} (Bá Thể: phải đánh đủ ${req} lá Thân Pháp).`)
              : (en ? `Source: ${sourceName}.` : `Nguồn sát thương: ${sourceName}.`),
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
              ? (en ? 'Shatterpeak Axe — Discard 2 cards to force Strike hit?' : 'Phá Sơn Phủ — Bỏ 2 lá bài để ép Kiếm Trảm trúng?')
              : (en ? `Waiting for ${sourceName} (Shatterpeak Axe)...` : `Đang chờ ${sourceName} quyết định kích hoạt Phá Sơn Phủ...`),
          detailVi: en ? `Strike on ${targetName} was dodged.` : `Kiếm Trảm vào ${targetName} vừa bị né bằng Thân Pháp.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_THANH_LONG':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? (en ? 'Sea-Calming Sabre — Follow up with another Strike?' : 'Trấn Hải Đao — Đánh tiếp 1 lá Kiếm Trảm?')
              : (en ? `Waiting for ${sourceName} (Sea-Calming Sabre)...` : `Đang chờ ${sourceName} quyết định truy kích Trấn Hải Đao...`),
          detailVi: en ? `Target: ${targetName}.` : `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_HAN_BANG_KIEM':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? (en ? 'Glacier Blade — Discard up to 2 opponent cards instead of damage?' : 'Băng Phách Kiếm — Hủy tối đa 2 lá thay cho sát thương?')
              : (en ? `Waiting for ${sourceName} (Glacier Blade)...` : `Đang chờ ${sourceName} quyết định dùng Băng Phách Kiếm...`),
          detailVi: en ? `Target: ${targetName}.` : `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_KY_LAN_CUNG':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? (en ? 'Gale Recurve — Discard 1 mount/footwork card of the target?' : 'Truy Phong Cung — Chọn hủy 1 lá Thú cưỡi của mục tiêu?')
              : (en ? `Waiting for ${sourceName} (Gale Recurve)...` : `Đang chờ ${sourceName} chọn Thú cưỡi để hủy (Truy Phong Cung)...`),
          detailVi: en ? `Target: ${targetName}.` : `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DUEL_SAT': {
        const req = interrupt.requiredCount ?? 1;
        const voSongHint = req >= 2 ? (en ? ' (Ninefold Unrivaled)' : ' (Bá Thể — Cửu Diện Vô Song)') : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? `Trial by Combat${voSongHint} — Play ${req} Strike(s)` : `Sinh Tử Lôi Đài${voSongHint} — Cần đánh ${req} lá Kiếm Trảm`)
              : (en ? `Waiting for ${targetName} to play ${req} Strike(s) in Trial by Combat...` : `Đang chờ ${targetName} đánh ${req} lá Kiếm Trảm trong Sinh Tử Lôi Đài...`),
          detailVi:
            req >= 2
              ? (en ? `Need ${req} Blade Strikes or suffer 1 damage.` : `Bá Thể: cần đủ ${req} lá Kiếm Trảm, nếu thiếu sẽ chịu 1 sát thương.`)
              : (en ? 'Failure to play a Strike inflicts 1 damage.' : 'Ai không đánh đủ Kiếm Trảm sẽ chịu 1 sát thương.'),
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
              ? (en ? `Borrowed Edge — Strike ${targetName} or surrender your Weapon` : `Tá Kiếm Trảm Phong — Đánh Kiếm Trảm vào ${targetName} hoặc giao Binh khí`)
              : (en ? `Waiting for ${attackerName} (Borrowed Edge)...` : `Đang chờ ${attackerName} phản ứng Tá Kiếm Trảm Phong...`),
          detailVi: en ? `Caster: ${sourceName} · Victim: ${targetName}.` : `Người dùng bí kíp: ${sourceName} · Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.attackerSeat ?? null,
          actorNameVi: attackerName,
          isMyTurn: interrupt.attackerSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_AOE_SAT':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Thousand Blades — Play 1 Blade Strike or take 1 damage' : 'Vạn Kiếm Quy Tông — Cần đánh 1 lá Kiếm Trảm hoặc chịu 1 sinh lực')
              : (en ? `Waiting for ${targetName} to answer Thousand Blades...` : `Đang chờ ${targetName} phản ứng Vạn Kiếm Quy Tông...`),
          detailVi: en ? `Source: ${sourceName}.` : `Nguồn: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_AOE_DODGE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Skyfall Volley — Play 1 Shadow Step or take 1 damage' : 'Loạn Tiễn Xuyên Vân — Cần đánh 1 lá Thân Pháp hoặc chịu 1 sinh lực')
              : (en ? `Waiting for ${targetName} to answer Skyfall Volley...` : `Đang chờ ${targetName} phản ứng Loạn Tiễn Xuyên Vân...`),
          detailVi: en ? `Source: ${sourceName}.` : `Nguồn: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_HARVEST_PICK':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Vault of Relics — Pick 1 revealed card from center' : 'Thiên Bảo Xuất Thế — Hãy chọn 1 lá bài ở giữa bàn')
              : (en ? `Waiting for ${targetName} to pick a relic...` : `Đang chờ ${targetName} chọn bài Thiên Bảo Xuất Thế...`),
          detailVi: en ? `${view.harvestPool.length} card(s) left.` : `Còn ${view.harvestPool.length} lá trên bàn.`,
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
            headlineVi: preparing ? (en ? 'Arrange Hand Cards' : 'Chuẩn bị bài úp') : (en ? 'Pick Face-Down Card' : 'Chọn bài úp'),
            detailVi: actorSeat === viewerSeat ? (en ? 'Your turn.' : 'Đến lượt bạn.') : (en ? `Waiting for ${actorNameVi}.` : `Đang chờ ${actorNameVi}.`),
            actorSeat, actorNameVi, isMyTurn: actorSeat === viewerSeat, isAllTableWait: false,
          };
        }
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? (en ? `Choose a zone on ${targetName} to ${interrupt.stealing ? 'take 1 card' : 'discard 1 card'}` : `Hãy chọn 1 khu bài của ${targetName} để ${interrupt.stealing ? 'lấy 1 lá về tay' : 'hủy bỏ 1 lá'}`)
              : (en ? `Waiting for ${sourceName} to ${interrupt.stealing ? 'take from' : 'discard from'} ${targetName}...` : `Đang chờ ${sourceName} ${interrupt.stealing ? 'lấy' : 'hủy'} bài từ ${targetName}...`),
          detailVi: en ? 'Pick Hand or Equipment zone at center.' : 'Chọn từ Tay bài hoặc khu Trang bị ở trung tâm bàn.',
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_PEACH_RESCUE':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? (en ? `${targetName} is Near Death (0 HP) — Use Elixir Pill to rescue?` : `${targetName} đang hấp hối (0 sinh lực) — Dùng Hồi Xuân Đan cứu?`)
              : (en ? `Waiting for ${responderName} to rescue ${targetName}...` : `Đang chờ ${responderName} cứu ${targetName} đang hấp hối...`),
          detailVi: en ? 'Each Elixir Pill restores 1 HP.' : 'Mỗi lá Hồi Xuân Đan hồi 1 sinh lực cho người đang hấp hối.',
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GUAN_XING':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Celestial Gaze — Arrange cards top/bottom of deck' : 'Quan Tinh — Sắp xếp các lá bài lên đầu hoặc xuống đáy chồng bài')
              : (en ? `Waiting for ${targetName} (Celestial Gaze)...` : `Đang chờ ${targetName} sắp xếp Quan Tinh...`),
          detailVi: en ? 'Use center deck controls then confirm.' : 'Dùng các nút ở trung tâm bàn để xếp thứ tự rồi xác nhận.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LUO_SHEN':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Ink Veil — Flip Judgment for Black cards?' : 'Lạc Thần — Phán xét lấy bài chất Đen?')
              : (en ? `Waiting for ${targetName} (Ink Veil)...` : `Đang chờ ${targetName} quyết định Lạc Thần...`),
          detailVi: en ? 'Keep claiming Black cards until Red appears.' : 'Mỗi lá phán xét chất Đen thu về tay cho đến khi ra Đỏ.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_TU_XI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Ration Raid — Choose up to 2 opponents to take 1 card each (or pass)' : 'Đột Tập — Chọn tối đa 2 đối thủ để lấy mỗi người 1 lá (hoặc bỏ qua)')
              : (en ? `Waiting for ${targetName} (Ration Raid)...` : `Đang chờ ${targetName} thực hiện Đột Tập...`),
          detailVi: en ? 'Replaces normal Draw phase if at least 1 target is picked.' : 'Bỏ qua pha rút bài thông thường nếu chọn ít nhất 1 mục tiêu.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LUO_YI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Armor Piercing — Draw 1 fewer card for +1 Strike/Duel damage?' : 'Phá Giáp — Rút ít hơn 1 lá để tăng +1 sát thương lượt này?')
              : (en ? `Waiting for ${targetName} (Armor Piercing)...` : `Đang chờ ${targetName} quyết định Phá Giáp...`),
          detailVi: en ? 'Grants +1 damage to Strikes and Trial by Combat this turn.' : 'Tăng +1 sát thương cho Kiếm Trảm và Sinh Tử Lôi Đài trong lượt.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_KE_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Still Guard — Skip Discard phase (and draw +1 under Nine Realms rules)?' : 'Tĩnh Thủ — Bỏ qua pha Bỏ bài?')
              : (en ? `Waiting for ${targetName} (Still Guard)...` : `Đang chờ ${targetName} quyết định Tĩnh Thủ...`),
          detailVi: en ? 'No Blade Strike was used during your action phase.' : 'Bạn chưa dùng hay đánh Kiếm Trảm trong lượt đánh chính.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_TIE_QI':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? (en ? 'Iron Cavalry — Flip Judgment to lock target dodge?' : 'Thiết Kỵ Trảm — Phán xét khóa Thân Pháp của mục tiêu?')
              : (en ? `Waiting for ${sourceName} (Iron Cavalry)...` : `Đang chờ ${sourceName} quyết định Thiết Kỵ Trảm...`),
          detailVi: en ? `Target: ${targetName}.` : `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_LIU_LI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Flowing Mirage — Discard 1 card to redirect Strike to another fighter in range?' : 'Chuyển Hoa Ảnh — Bỏ 1 lá để chuyển Kiếm Trảm sang người khác trong tầm?')
              : (en ? `Waiting for ${targetName} (Flowing Mirage)...` : `Đang chờ ${targetName} quyết định Chuyển Hoa Ảnh...`),
          detailVi: en ? `Strike attacker: ${sourceName}.` : `Người đánh Kiếm Trảm: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GUI_CAI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Fate Reversal — Play 1 hand card to replace Judgment?' : 'Đảo Mệnh — Đánh 1 lá trên tay thay thế lá phán xét?')
              : (en ? `Waiting for ${targetName} (Fate Reversal)...` : `Đang chờ ${targetName} phản ứng Đảo Mệnh...`),
          detailVi: interrupt.judgeCard
            ? (en
                ? `Judgment card: ${formatCardShort(interrupt.judgeCard)}${interrupt.judgePurpose ? ` (${interrupt.judgePurpose})` : ''}.`
                : `Lá phán xét: ${formatCardShort(interrupt.judgeCard)}${interrupt.judgePurpose ? ` (${interrupt.judgePurpose})` : ''}.`)
            : (en ? 'Keep or replace the Judgment card.' : 'Có thể giữ nguyên hoặc thay thế lá phán xét.'),
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_TIAN_DO':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Heavenly Claim — Claim the resolved Judgment card?' : 'Thiên Mệnh Thu — Thu lấy lá bài vừa phán xét?')
              : (en ? `Waiting for ${targetName} (Heavenly Claim)...` : `Đang chờ ${targetName} quyết định Thiên Mệnh Thu...`),
          detailVi: interrupt.judgeCard
            ? (en ? `Judgment card: ${formatCardShort(interrupt.judgeCard)}.` : `Lá phán xét: ${formatCardShort(interrupt.judgeCard)}.`)
            : (en ? 'Claim the resolved Judgment card.' : 'Có thể thu lấy lá phán xét.'),
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
              ? (en ? `Iron Hegemon — Claim ${dmgCardDesc ?? 'damaging card(s)'}?` : `Hấp Tinh Chiêu — Thu lấy ${dmgCardDesc ?? 'lá bài vừa gây sát thương'}?`)
              : (en ? `Waiting for ${targetName} (Iron Hegemon)...` : `Đang chờ ${targetName} quyết định Hấp Tinh Chiêu...`),
          detailVi: dmgCardDesc
            ? (en ? `Claim ${dmgCardDesc} and draw +1 bonus card.` : `Bá Tông có thể thu về tay ${dmgCardDesc} vừa gây sát thương.`)
            : (en ? 'Claim the damaging card(s) to hand.' : 'Bá Tông có thể thu về tay lá bài gây sát thương.'),
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
              ? (en ? `Retaliate — Take 1 card from ${sourceName}?` : `Hồi Hưởng — Lấy 1 lá bài từ ${sourceName}?`)
              : (en ? `Waiting for ${targetName} (Retaliate)...` : `Đang chờ ${targetName} quyết định Hồi Hưởng...`),
          detailVi: en ? `Damage source: ${sourceName}.` : `Nguồn sát thương: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_GANG_LIE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? `Fierce Counter — Judge to strike back at ${sourceName}?` : `Hàn Khí Phản — Phán xét phản công ${sourceName}?`)
              : (en ? `Waiting for ${targetName} (Fierce Counter)...` : `Đang chờ ${targetName} quyết định Hàn Khí Phản...`),
          detailVi: en ? 'Non-Heart forces attacker to discard 2 cards or take 1 damage.' : 'Nếu phán xét không ra Cơ, nguồn sát thương phải bỏ 2 lá hoặc mất 1 sinh lực.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GANG_LIE_CHOICE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Fierce Counter Triggered — Discard 2 hand cards or take 1 damage' : 'Trúng Hàn Khí Phản — Bỏ 2 lá trên tay hoặc chịu 1 sát thương')
              : (en ? `Waiting for ${targetName} to choose Fierce Counter penalty...` : `Đang chờ ${targetName} chọn hình phạt Hàn Khí Phản...`),
          detailVi: en ? `From ${sourceName}.` : `Từ Thiết Liệt (${sourceName}).`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_YI_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? 'Lasting Stratagem — Distribute 2 drawn cards to any fighters' : 'Tâm Kế — Chia 2 lá bài mới rút cho bản thân hoặc đồng đội')
              : (en ? `Waiting for ${targetName} to distribute Stratagem cards...` : `Đang chờ ${targetName} chia bài Tâm Kế...`),
          detailVi: en ? 'Pick a recipient for each card in the center.' : 'Chọn người nhận cho từng lá ở khu trung tâm bàn.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_FAN_JIAN_GUESS':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? (en ? `Mind Gambit — Guess a suit before drawing from ${sourceName}` : `Đoán Tâm Mưu — Đoán chất bài trước khi rút từ ${sourceName}`)
              : (en ? `Waiting for ${targetName} to guess suit...` : `Đang chờ ${targetName} đoán chất Đoán Tâm Mưu...`),
          detailVi: en ? 'Choose one of the 4 suits ♠ ♥ ♣ ♦.' : 'Chọn một trong 4 chất ♠ ♥ ♣ ♦.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_JI_JIANG':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? (en ? `Cloud Command — Play a Blade Strike for Sovereign ${targetName}?` : `Vân Lệnh — Đánh Kiếm Trảm giúp Minh Chủ ${targetName}?`)
              : (en ? `Waiting for ${responderName} (Cloud Command)...` : `Đang chờ ${responderName} hưởng ứng Vân Lệnh...`),
          detailVi: en ? `Azure Cloud Sovereign: ${targetName}.` : `Minh Chủ Thanh Vân: ${targetName}.`,
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_HU_JIA':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? (en ? `Iron Aegis — Play Shadow Step for Sovereign ${targetName}?` : `Huyền Giáp Vệ — Đánh Thân Pháp giúp Minh Chủ ${targetName}?`)
              : (en ? `Waiting for ${responderName} (Iron Aegis)...` : `Đang chờ ${responderName} hưởng ứng Huyền Giáp Vệ...`),
          detailVi: en ? `Iron Order Sovereign: ${targetName}.` : `Minh Chủ Huyền Thiết: ${targetName}.`,
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
        headlineVi: en ? `Judgment Phase — ${currentActorName}` : `Pha Phán Xét — ${currentActorName}`,
        detailVi: en ? 'Resolving delayed seals.' : 'Đang kiểm tra các lá Bí kíp Thời gian.',
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
          ? (en ? " — Mind's Eye (+1)" : ' — Tâm Nhãn (+1 lá)')
          : selfHeroId === 'xu_chu'
            ? (en ? ' — Armor Piercing (draw 1 first)' : ' — Phá Giáp (rút 1 lá đầu)')
            : '';
      return {
        headlineVi: isSelfTurn
          ? (en ? `YOUR TURN — DRAW PHASE (Draw ${drawCount}${skillTag})` : `ĐẾN LƯỢT BẠN — PHA RÚT BÀI (Rút ${drawCount} lá${skillTag})`)
          : (en ? `Draw Phase — ${currentActorName}` : `Pha Rút Bài — ${currentActorName}`),
        detailVi: isSelfTurn
          ? (en
              ? 'Click Draw Cards below or click the deck (Enter / Space) to draw.'
              : selfHeroId === 'xu_chu'
                ? 'Bấm nút Rút bài bên dưới hoặc chồng bài rút (Enter / Space) để rút 1 lá đầu lượt.'
                : 'Bấm nút Rút bài bên dưới hoặc chồng bài rút (Enter / Space) để bắt đầu lượt.')
          : (en ? 'Drawing cards at start of turn.' : 'Đang rút bài đầu lượt.'),
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
          ? (en ? 'Your Turn — Action Phase' : 'Lượt của bạn — Pha Ra Chiêu')
          : (en ? `Waiting for ${currentActorName} to act...` : `Đang chờ ${currentActorName} đánh bài...`),
        detailVi: isSelfTurn
          ? isSelfLuoYiDrawSecond
            ? (en
                ? 'Draw your 2nd card (skip Armor Piercing) or play Strike / Trial by Combat for +1 damage.'
                : 'Bạn có thể rút thêm lá thứ 2 (bỏ Phá Giáp) hoặc đánh Kiếm Trảm / Sinh Tử Lôi Đài ngay để +1 sát thương.')
            : (en
                ? 'Select a card or skill below, then choose a target if required.'
                : 'Chọn lá bài hoặc chiêu thức bên dưới rồi chọn mục tiêu nếu cần.')
          : (en
              ? 'Enable "Auto-Pass Counter" if you do not want to pause on scrolls.'
              : 'Bạn có thể bật "Tự bỏ qua Hóa Giải" nếu không muốn giữ nhịp chờ.'),
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
          ? (en ? `Discard Phase — Discard ${needDrop} card(s)` : `Pha Bỏ Bài — Cần bỏ ${needDrop} lá bài`)
          : (en ? `Waiting for ${currentActorName} to discard...` : `Đang chờ ${currentActorName} bỏ bài cuối lượt...`),
        detailVi: isSelfTurn
          ? (en
              ? `Hand limit equals your current HP (${Math.max(0, viewer?.hp ?? 0)} card(s)).`
              : `Giới hạn bài trên tay bằng sinh lực hiện tại (${Math.max(0, viewer?.hp ?? 0)} lá).`)
          : (en ? 'Turn advances after discarding excess cards.' : 'Kết thúc pha bỏ bài sẽ chuyển lượt sang ghế kế tiếp.'),
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    }
    case 'END':
      return {
        headlineVi: en ? `End Phase — ${currentActorName}` : `Pha Kết Lượt — ${currentActorName}`,
        detailVi: en ? 'Resolving end-of-turn effects.' : 'Đang hoàn tất kỹ năng cuối lượt.',
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
  const en = i18n.language === 'en';
  switch (mode) {
    case 'wu_sheng':
      return en ? 'Azure Cleave requires a Red card (♥/♦).' : 'Thanh Long Trảm cần chọn lá chất Đỏ (Cơ/Rô).';
    case 'long_dan_sat':
      return en ? 'Silver Spear (Strike conversion) requires a Shadow Step.' : 'Ngân Thương Thế (chuyển Kiếm Trảm) cần lá Thân Pháp.';
    case 'ky_tap':
      return en ? 'Night Raid requires a Black card (♠/♣).' : 'Dạ Tập Doanh cần chọn lá chất Đen (Bích/Chuồn).';
    case 'quoc_sac':
      return en ? 'Celestial Seal requires a Diamond (♦) card.' : 'Thiên Hương Phong cần chọn lá chất Rô.';
    case 'cuu_vien':
      return en ? 'Lifesaving Talisman requires a Red card (♥/♦).' : 'Cứu Tử Phù cần chọn lá chất Đỏ.';
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
  const en = i18n.language === 'en';
  const locale = en ? 'en' : 'vi';
  const cardName = getCuuChauCardDisplay(card.cardKey, locale, card.nameVi).name;
  const selfSeat = view.viewerSeatIndex;
  const selfPlayer = view.players.find((p) => p.seatIndex === selfSeat);
  if (!selfPlayer || !selfPlayer.alive) {
    return { kind: 'blocked', reasonVi: en ? 'Your seat cannot play cards right now.' : 'Ghế của bạn hiện không thể đánh bài.' };
  }

  const interrupt = view.activeInterrupt;
  if (interrupt) {
    if (interrupt.kind === 'WAIT_NULLIFICATION') {
      if (!interrupt.canRespondNullification) {
        return { kind: 'blocked', reasonVi: en ? 'Waiting for Qi Negation response.' : 'Đang chờ phản ứng Hóa Giải Chân Khí.' };
      }
      if (card.cardKey === 'vo_giai_kha_kich') {
        return {
          kind: 'table',
          actionLabelVi: en ? 'Drop onto table to play Qi Negation' : 'Thả lên bàn để đánh Hóa Giải Chân Khí',
          action: { type: 'RESPOND_NULLIFICATION', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: en ? 'Play Qi Negation to counter.' : 'Cần dùng lá Hóa Giải Chân Khí để hưởng ứng.' };
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
          actionLabelVi: en ? `Drop to dodge (${cardName})` : `Thả để đánh Thân Pháp (${cardName}) né đòn`,
          action: {
            type: interrupt.kind === 'WAIT_AOE_DODGE' ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
            seatIndex: selfSeat,
            cardId: card.id,
          },
        };
      }
      return { kind: 'blocked', reasonVi: en ? 'Shadow Step required to dodge.' : 'Cần lá Thân Pháp để né đòn.' };
    }
    if (
      interrupt.kind === 'WAIT_COLLATERAL_SAT'
        ? interrupt.attackerSeat === selfSeat
        : (interrupt.kind === 'WAIT_AOE_SAT' || interrupt.kind === 'WAIT_DUEL_SAT') &&
          interrupt.targetSeat === selfSeat
    ) {
      const canWuSheng = selfPlayer.heroId === 'guan_yu' && isRedSuit(card.suit);
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'thiem';
      if (card.cardKey === 'sat' || card.cardKey === 'pha_giap_tram' || canWuSheng || canLongDan) {
        const actionType =
          interrupt.kind === 'WAIT_AOE_SAT'
            ? 'RESPOND_AOE_SAT'
            : interrupt.kind === 'WAIT_DUEL_SAT'
              ? 'RESPOND_DUEL_SAT'
              : 'RESPOND_COLLATERAL_SAT';
        return {
          kind: 'table',
          actionLabelVi: en ? `Drop to Strike (${cardName})` : `Thả để đánh Kiếm Trảm (${cardName})`,
          action: { type: actionType, seatIndex: selfSeat, cardIds: [card.id] },
        };
      }
      return { kind: 'blocked', reasonVi: en ? 'Blade Strike required to answer.' : 'Cần lá Kiếm Trảm để hưởng ứng.' };
    }
    if (interrupt.kind === 'WAIT_PEACH_RESCUE' && interrupt.responderSeat === selfSeat) {
      const canJiu =
        selfPlayer.heroId === 'hua_tuo' &&
        view.currentTurnSeat !== selfSeat &&
        isRedSuit(card.suit);
      if (card.cardKey === 'dao' || canJiu) {
        return {
          kind: 'table',
          actionLabelVi: en ? `Drop to rescue (${cardName})` : `Thả để dùng ${cardName} cứu nguy kịch`,
          action: { type: 'RESPOND_PEACH_RESCUE', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: en ? 'Elixir Pill required to rescue.' : 'Cần lá Hồi Xuân Đan để cứu người nguy kịch.' };
    }
    if (interrupt.kind === 'WAIT_GUI_CAI' && interrupt.targetSeat === selfSeat) {
      return {
        kind: 'table',
        actionLabelVi: en ? `Drop ${cardName} to replace Judgment (Fate Reversal)` : `Thả ${cardName} đổi lá phán xét (Đảo Mệnh)`,
        action: { type: 'RESPOND_GUI_CAI', seatIndex: selfSeat, cardId: card.id },
      };
    }
    if (interrupt.kind === 'WAIT_JI_JIANG' && interrupt.responderSeat === selfSeat) {
      const canWuSheng = selfPlayer.heroId === 'guan_yu' && isRedSuit(card.suit);
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'thiem';
      if (card.cardKey === 'sat' || card.cardKey === 'pha_giap_tram' || canWuSheng || canLongDan) {
        return {
          kind: 'table',
          actionLabelVi: en ? `Drop ${cardName} to Strike for Sovereign` : `Thả ${cardName} đánh Kiếm Trảm hộ Minh Chủ`,
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
          actionLabelVi: en ? `Drop ${cardName} to Dodge for Sovereign` : `Thả ${cardName} đánh Thân Pháp hộ Minh Chủ`,
          action: { type: 'RESPOND_HU_JIA', seatIndex: selfSeat, cardId: card.id },
        };
      }
    }
    return {
      kind: 'blocked',
      reasonVi: en ? 'Use the response action bar above your hand.' : 'Hãy bấm nút phản ứng ở thanh lệnh phía trên dải bài.',
    };
  }

  if (view.turnPhase === 'DISCARD' && view.currentTurnSeat === selfSeat) {
    const handCount = selfPlayer.handCards?.length ?? 0;
    const discardNeeded = Math.max(0, handCount - Math.max(0, selfPlayer.hp));
    if (discardNeeded <= 1) {
      return {
        kind: 'table',
        actionLabelVi: en ? `Drop onto table to discard ${cardName}` : `Thả lên bàn để bỏ ${cardName}`,
        action: { type: 'DISCARD_CARDS', seatIndex: selfSeat, cardIds: [card.id] },
      };
    }
    return {
      kind: 'toggle_select',
      promptVi: en ? `Discard ${discardNeeded} cards — drop to toggle selection` : `Pha bỏ ${discardNeeded} lá — thả để chọn/bỏ chọn lá này`,
    };
  }

  if (view.turnPhase === 'PLAY' && view.currentTurnSeat === selfSeat) {
    if (selection.activeConvertMode === 'truong_bat') {
      return {
        kind: 'toggle_select',
        promptVi: en ? 'Shadow Serpent Spear: pick 2 hand cards then choose target.' : 'Xà Ảnh Mâu cần chọn đủ 2 lá trên tay rồi chọn mục tiêu.',
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
      return { kind: 'blocked', reasonVi: en ? 'Cannot play this card right now.' : 'Không thể dùng lá bài này lúc này.' };
    }
    if (effectiveKey === 'thiem') {
      return { kind: 'blocked', reasonVi: en ? 'Shadow Step can only be played to dodge Strikes or Skyfall Volley.' : 'Lá Thân Pháp chỉ dùng khi né Kiếm Trảm hoặc Mưa Tên Bão Vũ.' };
    }
    if (effectiveKey === 'vo_giai_kha_kich') {
      return { kind: 'blocked', reasonVi: en ? 'Qi Negation is only played when a scroll is about to resolve.' : 'Hóa Giải Chân Khí chỉ dùng khi Bí kíp sắp hiệu lực.' };
    }
    if (effectiveKey === 'dao' && selfPlayer.hp >= selfPlayer.maxHp) {
      return { kind: 'blocked', reasonVi: en ? 'HP is already full.' : 'Sinh lực đang đầy — chưa thể dùng Hồi Xuân Đan.' };
    }
    if (effectiveKey === 'sat' || effectiveKey === 'pha_giap_tram') {
      if (view.peacefulFirstRound && view.roundNumber === 1) {
        return {
          kind: 'blocked',
          reasonVi: en ? 'Peaceful Round 1: Strikes are disabled on the opening round.' : 'Vòng 1 Hòa Bình: chưa được đánh Kiếm Trảm ở vòng đầu tiên.',
        };
      }
      const unlimited =
        selfPlayer.heroId === 'zhang_fei' ||
        selfPlayer.equipments.weapon?.cardKey === 'gia_cat_lien_no';
      if (!unlimited && (view.turnFlags?.satUsedThisTurn ?? 0) >= 1) {
        return { kind: 'blocked', reasonVi: en ? 'Strike limit reached for this turn.' : 'Bạn đã dùng Kiếm Trảm trong lượt đánh này.' };
      }
    }

    const spec = getRequiredTargetSpec(view, hyp);
    const asCardKey = getConvertAsCardKey(selection.activeConvertMode);
    if (spec.minTargets === 2) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: en ? 'No opponent holds a Weapon.' : 'Không có người cầm Binh khí thích hợp.' };
      }
      return {
        kind: 'seat_pair_step1',
        card,
        actionLabelVi: en ? 'Drop onto Weapon holder first (Step 1/2)' : 'Thả vào người cầm Binh khí trước (Bước 1/2)',
        eligibleSeats: spec.eligibleSeats,
      };
    }
    if (spec.minTargets >= 1 && spec.maxTargets === 1) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: en ? 'No valid target in range.' : 'Không có mục tiêu hợp lệ trong tầm đánh.' };
      }
      const actionVerbVi =
        effectiveKey === 'sat'
          ? (en ? 'Blade Strike' : 'đánh Kiếm Trảm')
          : effectiveKey === 'pha_giap_tram'
            ? (en ? 'Armor-Piercing Strike' : 'Phá Giáp Trảm')
            : effectiveKey === 'kinh_loi_chan'
              ? (en ? 'Thunderclap Pulse' : 'Kinh Lôi Chấn')
              : effectiveKey === 'quyet_dau'
                ? (en ? 'Trial by Combat' : 'Sinh Tử Lôi Đài')
                : effectiveKey === 'thuan_thu_khien_duong'
                  ? (en ? 'Sleight of Hand' : 'Thám Nang Thủ')
                  : effectiveKey === 'qua_ha_sai_cau'
                    ? (en ? 'Break Formation' : 'Phá Trận Chưởng')
                    : effectiveKey === 'lac_bat_tu_thuc'
                      ? (en ? 'Acupoint Seal' : 'đặt Phong Mạch')
                      : (en ? 'use on' : 'dùng lên');
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
        ? (en ? `Drop onto table to equip ${cardName}` : `Thả lên bàn để trang bị ${cardName}`)
        : (en ? `Drop onto table to use ${cardName}` : `Thả lên bàn để dùng ${cardName}`),
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
  INVALID_KINH_LOI_CHAN_TARGET: 'Không thể dùng Kinh Lôi Chấn lên chính mình.',
  INVALID_COLLATERAL_TARGETS: 'Mục tiêu Tá Kiếm Trảm Phong không hợp lệ.',
  TARGET_NOT_ALIVE: 'Mục tiêu đã ngã xuống.',
  NULLIFICATION_ALREADY_PASSED: 'Bạn đã bỏ qua Hóa Giải Chân Khí cho lượt này.',
  NOT_ELIGIBLE_FOR_NULLIFICATION: 'Hiện không thể đánh Hóa Giải Chân Khí.',
  INVALID_TU_XI_TARGETS: 'Mục tiêu Đoạt Lương không hợp lệ.',
  MATCH_ALREADY_FINISHED: 'Ván đấu đã kết thúc.',
  INVALID_SAT_CARD_COUNT: 'Số lượng lá Kiếm Trảm không hợp lệ.',
  CARD_NOT_IN_HAND: 'Lá bài không còn trên tay.',
};

const MATCH_ERROR_EN_MAP: Readonly<Record<string, string>> = {
  FIRST_ROUND_SAT_FORBIDDEN: 'Peaceful Round 1: Strikes are disabled on the opening round.',
  SAT_LIMIT_REACHED: 'You have already used a Blade Strike this turn.',
  HP_ALREADY_FULL: 'HP is already full — cannot use Elixir Pill.',
  TARGET_OUT_OF_RANGE: 'Target is out of attack range.',
  SNATCH_TARGET_OUT_OF_RANGE: 'Target is beyond distance 1.',
  TARGET_IMMUNE_TO_CARD: 'Target is immune to this card.',
  CANNOT_DISCARD_QUAN_THACH_PHU_SELF: 'Cannot discard Shatterpeak Axe itself.',
  DELAYED_ZONE_NOT_ALLOWED: 'Cannot select cards in the Seal zone.',
  SIMULATED_DELAY_CANNOT_BE_ANSWERED_BY_PLAYER: 'Holding short counter check window.',
  INVALID_LIU_LI_TARGET: 'Flowing Mirage target must be another valid fighter in range.',
  LIU_LI_REQUIRES_CARD_AND_TARGET: 'Flowing Mirage requires 1 card and 1 valid target in range.',
  JI_JIANG_NOT_AVAILABLE: 'Cloud Command cannot be activated right now.',
  NO_SHU_ALLIES_FOR_JI_JIANG: 'No Azure Cloud allies remain.',
  HU_JIA_NOT_AVAILABLE: 'Iron Aegis cannot be activated right now.',
  NO_WEI_ALLIES_FOR_HU_JIA: 'No Iron Order allies remain.',
  BAGUA_NOT_AVAILABLE: 'Eight Trigrams Robe cannot be triggered right now.',
  QUAN_THACH_PHU_REQUIRES_2_CARDS: 'Shatterpeak Axe requires discarding 2 cards.',
  HAN_BANG_KIEM_MUST_PICK_1_OR_2_CARDS: 'Glacier Blade discards 1 or 2 target cards.',
  INTERRUPT_PENDING: 'Another response must resolve first.',
  NOT_IN_PLAY_PHASE: 'Not currently in Action phase.',
  NOT_IN_DISCARD_PHASE: 'Not currently in Discard phase.',
  DEAD_PLAYER_CANNOT_ACT: 'Fallen fighters cannot act.',
  INVALID_TWO_CARD_COMBO: 'Select exactly 2 hand cards for Shadow Serpent Spear.',
  INVALID_STRIKE_TARGET_COUNT: 'Invalid Strike target count.',
  MUST_SELECT_ONE_CARD: 'Please select 1 card.',
  NOT_A_SAT_CARD: 'Selected card cannot be used as Blade Strike.',
  NOT_A_THIEM_CARD: 'Selected card cannot be used as Shadow Step.',
  NOT_A_DAO_CARD: 'Selected card cannot be used as Elixir Pill.',
  NOT_A_NULLIFICATION_CARD: 'Selected card is not Qi Negation.',
  INVALID_DELAYED_TARGET: 'Invalid Seal target.',
  TARGET_ALREADY_HAS_LAC: 'Target already has an Acupoint Seal.',
  ALREADY_HAS_THIEM_DIEN: 'You already have a Sky Tribulation seal.',
  INVALID_DISMANTLE_TARGET: 'Cannot target yourself with Break Formation.',
  TARGET_HAS_NO_CARDS: 'Target has no cards.',
  INVALID_DUEL_TARGET: 'Cannot challenge yourself to Trial by Combat.',
  INVALID_KINH_LOI_CHAN_TARGET: 'Cannot target yourself with Thunderclap Pulse.',
  INVALID_COLLATERAL_TARGETS: 'Invalid targets for Borrowed Edge.',
  TARGET_NOT_ALIVE: 'Target has already fallen.',
  NULLIFICATION_ALREADY_PASSED: 'You already passed Qi Negation for this window.',
  NOT_ELIGIBLE_FOR_NULLIFICATION: 'Not eligible to play Qi Negation right now.',
  INVALID_TU_XI_TARGETS: 'Invalid Ration Raid target(s).',
  MATCH_ALREADY_FINISHED: 'Match has already ended.',
  INVALID_SAT_CARD_COUNT: 'Invalid Strike card count.',
  CARD_NOT_IN_HAND: 'Card is no longer in hand.',
};

/** Chuyển mọi mã lỗi kỹ thuật từ engine/WS thành thông báo dễ hiểu theo ngôn ngữ. */
export function formatMatchErrorVi(
  err: unknown,
  fallback?: string,
): string {
  const en = i18n.language === 'en';
  const defaultFallback = fallback ?? (en ? 'Invalid action.' : 'Thao tác chưa hợp lệ.');
  const raw =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return defaultFallback;
  }
  const direct = en ? MATCH_ERROR_EN_MAP[trimmed] : MATCH_ERROR_VI_MAP[trimmed];
  if (direct) {
    return direct;
  }
  if (trimmed.startsWith('CARD_CANNOT_BE_PLAYED_DIRECTLY:')) {
    const cardKey = trimmed.slice('CARD_CANNOT_BE_PLAYED_DIRECTLY:'.length);
    if (cardKey === 'thiem') {
      return en ? 'Shadow Step can only be played to dodge.' : 'Lá Thân Pháp chỉ dùng khi né Kiếm Trảm hoặc Mưa Tên Bão Vũ.';
    }
    if (cardKey === 'vo_giai_kha_kich') {
      return en ? 'Qi Negation is only played when a scroll is active.' : 'Hóa Giải Chân Khí chỉ dùng khi Bí kíp sắp có hiệu lực.';
    }
    return en ? 'This card cannot be played directly right now.' : 'Lá bài này không thể đánh trực tiếp lúc này.';
  }
  if (trimmed.startsWith('MUST_DISCARD_EXACTLY:')) {
    const count = trimmed.slice('MUST_DISCARD_EXACTLY:'.length);
    return en ? `Select exactly ${count} card(s) to discard.` : `Cần chọn đúng ${count} lá bài để bỏ.`;
  }
  if (trimmed.startsWith('CANNOT_CONVERT_CARD_AS:')) {
    return en ? 'Selected card cannot be converted that way.' : 'Lá bài đã chọn không đủ điều kiện chuyển đổi.';
  }
  if (trimmed.startsWith('CARD_NOT_IN_HAND:')) {
    return en ? 'Card is no longer in hand.' : 'Lá bài không còn trên tay.';
  }
  if (trimmed.startsWith('CARD_NOT_OWNED:')) {
    return en ? 'You do not own that card.' : 'Bạn không sở hữu lá bài này.';
  }
  if (trimmed.startsWith('EXPECTED_INTERRUPT:')) {
    return en ? 'Response state changed, please try again.' : 'Trạng thái phản ứng đã thay đổi, vui lòng thử lại.';
  }
  return /^[A-Z0-9_:]+$/.test(trimmed) ? defaultFallback : formatCuuChauDisplayText(trimmed, en ? 'en' : 'vi');
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

  // Cards (legacy 108 + Cửu Châu 112 templates + short forms)
  for (const tpl of [...STANDARD_DECK_TEMPLATES, ...CUU_CHAU_DECK_TEMPLATES]) {
    const disp = getCuuChauCardDisplay(tpl.cardKey, locale, tpl.nameVi).name;
    add(tpl.nameVi, disp);
    const viDisp = getCuuChauCardDisplay(tpl.cardKey, 'vi', tpl.nameVi).name;
    add(viDisp, disp);
  }
  add('Từ Hùng Song Cổ Kiếm', getCuuChauCardDisplay('tu_hung_song_co_kiem', locale).name);
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

const EN_LOG_PHRASE_REPLACEMENTS: readonly [RegExp, string][] = [
  [/Ván đấu chính thức bắt đầu — Vòng (\d+)\./gu, 'Match begins — Round $1.'],
  [/Tất cả người chơi đã chọn tướng xong và đồng loạt lật công khai\./gu, 'All players locked in their warriors and revealed them simultaneously.'],
  [/rơi vào trạng thái Hấp hối \((-?\d+) (?:máu|HP)\), bắt đầu vòng Cầu Đào!/gu, 'entered Near Death ($1 HP) — starting Rescue Call!'],
  [/bắt đầu pha Rút bài/gu, 'starts Draw phase'],
  [/bắt đầu pha Đánh bài/gu, 'starts Action phase'],
  [/kết thúc pha Đánh bài/gu, 'ended Action phase'],
  [/chuyển sang pha Bỏ bài \(cần bỏ (\d+) lá\)/gu, 'entered Discard phase (discard $1 card(s))'],
  [/rút (\d+) lá ở pha Rút bài/gu, 'drew $1 card(s) in Draw phase'],
  [/rút thêm (\d+) lá khi trúng đòn/gu, 'drew $1 extra card(s) on hit'],
  [/rút (\d+) lá khi đòn bị né/gu, 'drew $1 card(s) on dodged Strike'],
  [/rút thêm (\d+) lá/gu, 'drew $1 extra card(s)'],
  [/rút (\d+) lá/gu, 'drew $1 card(s)'],
  [/bỏ qua (.+?), rút (\d+) lá/gu, 'skipped $1, drew $2 card(s)'],
  [/hồi (\d+) Sinh Lực và rút (\d+) lá/gu, 'restored $1 HP and drew $2 card(s)'],
  [/hồi (\d+) Sinh Lực/gu, 'restored $1 HP'],
  [/hồi (\d+) HP/gu, 'restored $1 HP'],
  [/chịu (\d+) sát thương từ (.+?) \((.+?)\), còn (-?\d+)\/(\d+) (?:máu|HP)\./gu, 'took $1 damage from $2 ($3), $4/$5 HP left.'],
  [/chịu (\d+) sát thương/gu, 'took $1 damage'],
  [/giảm sát thương xuống 1!/gu, 'reduced incoming damage to 1!'],
  [/đánh (.+?) vào /gu, 'struck '],
  [/vô hiệu hóa hoàn toàn /gu, 'completely negated '],
  [/vô hiệu hóa lá (.+?)!/gu, 'negated $1!'],
  [/bị (.+?) vô hiệu hóa!/gu, 'was canceled by $1!'],
  [/trang bị /gu, 'equipped '],
  [/đã bỏ (\d+) lá cuối lượt\./gu, 'discarded $1 card(s) at end of turn.'],
  [/lấy trang bị (.+?) từ /gu, 'took $1 from '],
  [/hủy trang bị (.+?) của /gu, 'discarded $1 of '],
  [/hủy (\d+) lá bài trên tay của /gu, 'discarded $1 hand card(s) of '],
  [/nhận (\d+) lá úp từ /gu, 'took $1 face-down card(s) from '],
  [/giao (\d+) lá bài cho /gu, 'gave $1 card(s) to '],
  [/kích hoạt /gu, 'activated '],
  [/phát động /gu, 'triggered '],
  [/hưởng ứng /gu, 'answered '],
  [/dùng /gu, 'used '],
  [/cứu /gu, 'rescued '],
  [/lâm vào hấp hối \(0 (?:máu|HP)\)/gu, 'is on the brink of death (0 HP)'],
  [/đã tử trận/gu, 'has fallen'],
  [/tử trận/gu, 'fell in battle'],
  [/Lượt của /gu, 'Turn of '],
  [/đánh (.+?) né thành công/gu, 'dodged cleanly with $1'],
  [/tự mất (\d+) (?:máu|HP)/gu, 'sacrificed $1 HP'],
  [/\(bỏ qua giáp, rút 1 lá nếu trúng\)/gu, '(ignores armor, draw 1 on hit)'],
  [/\(Phản Đòn Lôi\)/gu, '(Thunder Riposte)'],
  [/\(\+1 khoảng cách, miễn (?:Sát|Kiếm Trảm) cơ bản màu Đen\)/gu, '(+1 distance, immune to Black Strikes)'],
  [/\(tầm 2, bỏ 2 lá để đánh như (?:Sát|Kiếm Trảm)\)/gu, '(Range 2, discard 2 to play as Strike)'],
  [/lật lá phán xét \((.+?)\):/gu, 'flipped Judgment ($1):'],
  [/phán xét ra /gu, 'judged '],
  [/lên bàn\./gu, 'onto the table.'],
  [/Bích/gu, 'Spade'],
  [/Cơ/gu, 'Heart'],
  [/Chuồn/gu, 'Club'],
  [/Rô/gu, 'Diamond'],
  [/Đỏ/gu, 'Red'],
  [/Đen/gu, 'Black'],
];

const VI_DIACRITIC_FALLBACK_CHAR_MAP: Readonly<Record<string, string>> = {
  à:'a',á:'a',ả:'a',ã:'a',ạ:'a',ă:'a',ằ:'a',ắ:'a',ẳ:'a',ẵ:'a',ặ:'a',â:'a',ầ:'a',ấ:'a',ẩ:'a',ẫ:'a',ậ:'a',
  è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',ê:'e',ề:'e',ế:'e',ể:'e',ễ:'e',ệ:'e',
  ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
  ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',ô:'o',ồ:'o',ố:'o',ổ:'o',ỗ:'o',ộ:'o',ơ:'o',ờ:'o',ớ:'o',ở:'o',ỡ:'o',ợ:'o',
  ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',ư:'u',ừ:'u',ứ:'u',ử:'u',ữ:'u',ự:'u',
  ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',đ:'d',
  À:'A',Á:'A',Ả:'A',Ã:'A',Ạ:'A',Ă:'A',Ằ:'A',Ắ:'A',Ẳ:'A',Ẵ:'A',Ặ:'A',Â:'A',Ầ:'A',Ấ:'A',Ẩ:'A',Ẫ:'A',Ậ:'A',
  È:'E',É:'E',Ẻ:'E',Ẽ:'E',Ẹ:'E',Ê:'E',Ề:'E',Ế:'E',Ể:'E',Ễ:'E',Ệ:'E',
  Ì:'I',Í:'I',Ỉ:'I',Ĩ:'I',Ị:'I',
  Ò:'O',Ó:'O',Ỏ:'O',Õ:'O',Ọ:'O',Ô:'O',Ồ:'O',Ố:'O',Ổ:'O',Ỗ:'O',Ộ:'O',Ơ:'O',Ờ:'O',Ớ:'O',Ở:'O',Ỡ:'O',Ợ:'O',
  Ù:'U',Ú:'U',Ủ:'U',Ũ:'U',Ụ:'U',Ư:'U',Ừ:'U',Ứ:'U',Ử:'U',Ữ:'U',Ự:'U',
  Ỳ:'Y',Ý:'Y',Ỷ:'Y',Ỹ:'Y',Ỵ:'Y',Đ:'D',
};

const VI_FALLBACK_DETECT_RE =
  /[\u0102\u0103\u00C2\u00E2\u0110\u0111\u00CA\u00EA\u00D4\u00F4\u01A0\u01A1\u01AF\u01B0\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u1EA0-\u1EF9]/;

function translateActionLogLineEn(text: string): string {
  let out = text;
  for (const [pattern, replacement] of EN_LOG_PHRASE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  out = out
    .replace(/\bMáy (\d+)\b/gu, 'Bot $1')
    .replace(/\bGhế (\d+)\b/gu, 'Seat $1')
    .replace(/\bVòng (\d+)\b/gu, 'Round $1')
    .replace(/\bBạn\b/gu, 'You');
  if (VI_FALLBACK_DETECT_RE.test(out)) {
    out = out
      .replace(/\blá\b/gu, 'card(s)')
      .replace(/\bngười\b/gu, 'fighter')
      .replace(/\bmục tiêu\b/gu, 'target')
      .replace(/\blượt\b/gu, 'turn')
      .replace(/\bpha\b/gu, 'phase');
    out = out.replace(/[^\u0000-\u007F]/g, (ch) => VI_DIACRITIC_FALLBACK_CHAR_MAP[ch] ?? ch);
  }
  return out;
}

/** Chuyển mọi chuỗi nhật ký / thông báo từ engine legacy sang tên gọi Cửu Châu Ẩn Kiếm theo ngôn ngữ đang chọn. */
export function formatCuuChauDisplayText(
  text: string,
  locale: 'vi' | 'en' = i18n.language === 'en' ? 'en' : 'vi',
): string {
  if (!text) return text;
  const { regex, map } = getLegacyReplacementMatcher(locale);
  const replaced = text.replace(regex, (matched) => map.get(matched) ?? matched);
  return locale === 'en' ? translateActionLogLineEn(replaced) : replaced;
}
