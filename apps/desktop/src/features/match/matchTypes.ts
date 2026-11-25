import {
  STANDARD_DECK_TEMPLATES,
  calculateDistance,
  canReachForSnatch,
  canUseCollateralMurder,
  formatRankLabel,
  formatSuitSymbol,
  getHeroDefinition,
  isInAttackRange,
  isRedSuit,
} from '@lkdf/shared';
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
  return FACTION_STYLES[faction];
}

export function getIdentityLabelVi(identity: IdentityRole | 'UNKNOWN'): string {
  switch (identity) {
    case 'LORD':
      return 'Chủ Công';
    case 'LOYALIST':
      return 'Trung Thần';
    case 'REBEL':
      return 'Phản Tặc';
    case 'SPY':
      return 'Nội Gián';
    case 'UNKNOWN':
      return 'Ẩn';
  }
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
  switch (category) {
    case 'BASIC':
      return 'Cơ bản';
    case 'NORMAL_SCROLL':
      return 'Cẩm nang';
    case 'DELAYED_SCROLL':
      return 'Thời gian';
    case 'WEAPON':
      return attackRange !== undefined ? `Vũ khí · Tầm ${attackRange}` : 'Vũ khí';
    case 'ARMOR':
      return 'Giáp';
    case 'PLUS_ONE_HORSE':
      return 'Ngựa +1';
    case 'MINUS_ONE_HORSE':
      return 'Ngựa -1';
  }
}

export function formatCardShort(card: Pick<CardInstance, 'suit' | 'rank' | 'nameVi'>): string {
  return `${formatSuitSymbol(card.suit)}${formatRankLabel(card.rank)} ${card.nameVi}`;
}

export function getPlayerSeatLabel(
  players: readonly PublicPlayerView[],
  seatIndex: number | null | undefined,
): string {
  if (seatIndex === null || seatIndex === undefined) {
    return 'Người chơi';
  }
  const found = players.find((p) => p.seatIndex === seatIndex);
  if (!found) {
    return `Ghế ${seatIndex + 1}`;
  }
  const hero = found.heroId ? getHeroDefinition(found.heroId).nameVi : null;
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
  const skills: PlaySkillOption[] = [];
  switch (player.heroId) {
    case 'liu_bei': {
      if (player.handCount > 0) {
        skills.push({
          id: 'ren_de',
          nameVi: 'Nhân Đức',
          descriptionVi: 'Chọn bài trên tay rồi chọn 1 đồng đội để giao bài (giao từ 2 lá hồi 1 máu).',
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
          nameVi: 'Kích Tướng',
          descriptionVi: 'Chủ Công xin đồng minh Thục đánh 1 lá Sát vào mục tiêu trong tầm.',
        });
      }
      break;
    }
    case 'sun_quan':
      if (!turnFlags?.zhiHengUsedThisTurn) {
        skills.push({
          id: 'zhi_heng',
          nameVi: 'Chế Hành',
          descriptionVi: 'Chọn bất kỳ lá bài trên tay hoặc trang bị để bỏ và rút lại đúng bấy nhiêu lá (1 lần/lượt).',
        });
      }
      break;
    case 'huang_gai':
      skills.push({
        id: 'ku_rou',
        nameVi: 'Khổ Nhục',
        descriptionVi: 'Tự mất 1 máu để rút 2 lá bài (không giới hạn số lần mỗi lượt).',
      });
      break;
    case 'zhou_yu':
      if (!turnFlags?.fanJianUsedThisTurn && player.handCount > 0) {
        skills.push({
          id: 'fan_jian',
          nameVi: 'Phản Gián',
          descriptionVi: 'Chọn 1 đối thủ để họ đoán chất rồi rút 1 lá của bạn (1 lần/lượt).',
        });
      }
      break;
    case 'sun_shang_xiang':
      if (!turnFlags?.jieYinUsedThisTurn && player.handCount >= 2) {
        skills.push({
          id: 'jie_yin',
          nameVi: 'Kết Hôn',
          descriptionVi: 'Bỏ 2 lá trên tay và chọn 1 tướng nam bị thương để cả hai cùng hồi 1 máu.',
        });
      }
      break;
    case 'hua_tuo':
      if (!turnFlags?.qingNangUsedThisTurn && player.handCount >= 1) {
        skills.push({
          id: 'qing_nang',
          nameVi: 'Thanh Nang',
          descriptionVi: 'Bỏ 1 lá trên tay và chọn 1 người bị thương để hồi 1 máu (1 lần/lượt).',
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
          nameVi: 'Ly Gián',
          descriptionVi: 'Bỏ 1 lá bài và chọn 2 tướng nam khác nhau để buộc họ Quyết Đấu.',
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
  const canInitiateSat = !(isPlayPhase && isFirstRoundPeaceful);
  const options: ConvertCardOption[] = [];
  if (player.heroId === 'guan_yu' && canInitiateSat) {
    options.push({
      mode: 'wu_sheng',
      labelVi: 'Võ Thánh (Đỏ → Sát)',
      descriptionVi: 'Dùng 1 lá chất Đỏ (♥/♦) như lá Sát.',
      requiredCards: 1,
      targetCardKey: 'sat',
    });
  }
  if (player.heroId === 'zhao_yun') {
    if (canInitiateSat) {
      options.push({
        mode: 'long_dan_sat',
        labelVi: 'Long Đảm (Thiểm → Sát)',
        descriptionVi: 'Dùng lá Thiểm như lá Sát.',
        requiredCards: 1,
        targetCardKey: 'sat',
      });
    }
    if (!isPlayPhase) {
      options.push({
        mode: 'long_dan_thiem',
        labelVi: 'Long Đảm (Sát → Thiểm)',
        descriptionVi: 'Dùng lá Sát như lá Thiểm.',
        requiredCards: 1,
        targetCardKey: 'thiem',
      });
    }
  }
  if (player.equipments.weapon?.cardKey === 'truong_bat_xa_mau' && canInitiateSat) {
    options.push({
      mode: 'truong_bat',
      labelVi: 'Trượng Bát (2 lá → Sát)',
      descriptionVi: 'Chọn 2 lá trên tay đánh ra như 1 lá Sát.',
      requiredCards: 2,
      targetCardKey: 'sat',
    });
  }
  if (isPlayPhase && player.heroId === 'gan_ning') {
    options.push({
      mode: 'ky_tap',
      labelVi: 'Kỳ Tập (Đen → Quá Hà)',
      descriptionVi: 'Dùng 1 lá chất Đen (♠/♣) như Quá Hà Sái Cầu.',
      requiredCards: 1,
      targetCardKey: 'qua_ha_sai_cau',
    });
  }
  if (isPlayPhase && player.heroId === 'da_qiao') {
    options.push({
      mode: 'quoc_sac',
      labelVi: 'Quốc Sắc (Rô → Lạc Bất Tư Thục)',
      descriptionVi: 'Dùng 1 lá chất Rô (♦) như Lạc Bất Tư Thục.',
      requiredCards: 1,
      targetCardKey: 'lac_bat_tu_thuc',
    });
  }
  if (!isPlayPhase && player.heroId === 'zhen_ji') {
    options.push({
      mode: 'thanh_quoc',
      labelVi: 'Khuynh Quốc (Đen → Thiểm)',
      descriptionVi: 'Dùng 1 lá chất Đen (♠/♣) trên tay như Thiểm.',
      requiredCards: 1,
      targetCardKey: 'thiem',
    });
  }
  if (!isPlayPhase && player.heroId === 'hua_tuo') {
    options.push({
      mode: 'cuu_vien',
      labelVi: 'Cấp Cứu (Đỏ → Đào)',
      descriptionVi: 'Ngoài lượt, dùng 1 lá chất Đỏ (♥/♦) như Đào.',
      requiredCards: 1,
      targetCardKey: 'dao',
    });
  }
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
          promptVi: 'Hãy bấm chọn 1 người chơi để giao bài (Nhân Đức)',
        };
      case 'ji_jiang':
        if (view.turnPhase === 'PLAY' && view.peacefulFirstRound && view.roundNumber === 1) {
          return {
            minTargets: 1,
            maxTargets: 1,
            eligibleSeats: [],
            promptVi: 'Vòng 1 Hòa Bình: chưa được đánh Sát ở vòng đầu tiên.',
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
          promptVi: 'Hãy bấm chọn 1 mục tiêu trong tầm đánh để Kích Tướng',
        };
      case 'zhi_heng':
      case 'ku_rou':
        return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
      case 'fan_jian':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 đối thủ để phát động Phản Gián',
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
          promptVi: 'Hãy bấm chọn 1 tướng nam đang bị thương (Kết Hôn)',
        };
      case 'qing_nang':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: view.players
            .filter((p) => p.alive && p.hp < p.maxHp)
            .map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 người đang bị thương để hồi 1 máu (Thanh Nang)',
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
              ? 'Hãy bấm chọn 2 tướng nam khác nhau để Quyết Đấu (Ly Gián)'
              : 'Chọn thêm 1 tướng nam nữa để hoàn tất Ly Gián',
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
            ? 'Kỳ Tài: chọn bất kỳ mục tiêu có bài để Thuận Thủ (không giới hạn khoảng cách)'
            : 'Hãy bấm chọn 1 mục tiêu trong khoảng cách 1 để Thuận Thủ',
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
        promptVi: 'Hãy bấm chọn 1 mục tiêu có bài để Quá Hà Sái Cầu',
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
        promptVi: 'Hãy bấm chọn 1 mục tiêu để Quyết Đấu',
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
        promptVi: 'Hãy bấm chọn 1 mục tiêu để đặt Lạc Bất Tư Thục',
      };
    }
    default:
      return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
  }
}

export function describeJianXiongDamageCard(
  view: PlayerViewState,
  targetSeat: number,
): string | null {
  const target = view.players.find((p) => p.seatIndex === targetSeat);
  if (!target) return null;
  const prefix = `${target.displayName} chịu `;
  for (let i = view.actionLog.length - 1; i >= Math.max(0, view.actionLog.length - 10); i--) {
    const line = view.actionLog[i]!;
    if (!line.startsWith(prefix)) continue;
    const match = /chịu \d+ sát thương từ .+? \(([^)]+)\)/u.exec(line);
    if (!match) continue;
    const rawReason = match[1]!;
    const baseReason = rawReason.replace(/\s*\(Lỏa Y \+1\)$/u, '');
    const top = view.discardPileTop;
    if (
      top &&
      ((baseReason === 'Sát' && top.cardKey === 'sat') || top.nameVi === baseReason)
    ) {
      return formatCardShort(top);
    }
    return `lá ${baseReason}`;
  }
  return null;
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
          ? 'Bạn là Chủ Công — Hãy chọn Tướng đầu tiên (1/5)'
          : `Đang chờ Chủ Công ${lordName} chọn Tướng...`,
        detailVi: 'Chủ Công được cộng thêm +1 máu tối đa và chọn trước để các ghế khác phối hợp.',
        actorSeat: draft.lordSeatIndex,
        actorNameVi: lordName,
        isMyTurn: isLordSelf,
        isAllTableWait: false,
      };
    }
    const alreadySelected = draft.mySelectedHero !== null;
    return {
      headlineVi: alreadySelected
        ? `Đã chọn Tướng — Đang chờ ${view.players.length - draft.readySeats.length} người khác...`
        : 'Hãy chọn Tướng của bạn (1/3)',
      detailVi: `Tiến độ sẵn sàng: ${draft.readySeats.length}/${view.players.length} ghế.`,
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
              ? `Phản Vô Giải Khả Kích — Có chặn ${origName}?`
              : targetsViewer
                ? `⚠️ ${origName} nhắm vào BẠN — Đánh Vô Giải Khả Kích?`
                : `Có đánh Vô Giải chặn ${origName} (${origTargetName})?`
            : isCounter
              ? `Đang giải quyết phản Vô Giải (${origName})...`
              : `Đang giải quyết ${origName} → ${origTargetName}...`,
          detailVi: canRespond
            ? isCounter
              ? `${origName} → ${origTargetName}. Phản Vô Giải sẽ giữ cẩm nang gốc tiếp tục hiệu lực.`
              : `Cẩm nang sắp có hiệu lực lên ${origTargetName}. Chọn Đánh Vô Giải hoặc Cho qua.`
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
              ? 'Từ Hùng Song Cổ Kiếm — Chọn bỏ 1 lá hoặc cho đối thủ rút 1 lá'
              : `Đang chờ ${targetName} chọn hiệu ứng Từ Hùng Song Cổ Kiếm...`,
          detailVi: `${sourceName} đánh Sát khác giới vào ${targetName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DODGE': {
        const req = interrupt.requiredCount ?? 1;
        const dodged = interrupt.dodgedSoFar ?? 0;
        const voSongHint = req >= 2 ? ' (Vô Song — Lữ Bố)' : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Bạn bị đánh Sát${voSongHint} — Cần ${req} lá Thiểm (đã né ${dodged})`
              : `Đang chờ ${targetName} đánh ${req} lá Thiểm né Sát...`,
          detailVi:
            req >= 2
              ? `Nguồn sát thương: ${sourceName} (Vô Song: phải đánh đủ ${req} lá Thiểm).`
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
              ? 'Quán Thạch Phủ — Bỏ 2 lá bài để ép Sát trúng?'
              : `Đang chờ ${sourceName} quyết định kích hoạt Quán Thạch Phủ...`,
          detailVi: `Sát vào ${targetName} vừa bị né bằng Thiểm.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_THANH_LONG':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Thanh Long Yển Nguyệt Đao — Đánh tiếp 1 lá Sát?'
              : `Đang chờ ${sourceName} quyết định truy kích Thanh Long Đao...`,
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
              ? 'Hàn Băng Kiếm — Hủy tối đa 2 lá thay cho sát thương?'
              : `Đang chờ ${sourceName} quyết định dùng Hàn Băng Kiếm...`,
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
              ? 'Kỳ Lân Cung — Chọn hủy 1 lá Ngựa của mục tiêu?'
              : `Đang chờ ${sourceName} chọn Ngựa để hủy (Kỳ Lân Cung)...`,
          detailVi: `Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_DUEL_SAT': {
        const req = interrupt.requiredCount ?? 1;
        const voSongHint = req >= 2 ? ' (Vô Song — Lữ Bố)' : '';
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Quyết Đấu${voSongHint} — Cần đánh ${req} lá Sát`
              : `Đang chờ ${targetName} đánh ${req} lá Sát trong Quyết Đấu...`,
          detailVi:
            req >= 2
              ? `Vô Song: cần đủ ${req} lá Sát, nếu thiếu sẽ chịu 1 sát thương.`
              : 'Ai không đánh đủ Sát sẽ chịu 1 sát thương.',
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
              ? `Tá Đao Sát Nhân — Đánh Sát vào ${targetName} hoặc giao Vũ khí`
              : `Đang chờ ${attackerName} phản ứng Tá Đao Sát Nhân...`,
          detailVi: `Người dùng cẩm nang: ${sourceName} · Mục tiêu: ${targetName}.`,
          actorSeat: interrupt.attackerSeat ?? null,
          actorNameVi: attackerName,
          isMyTurn: interrupt.attackerSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_AOE_SAT':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Nam Man Nhập Xâm — Cần đánh 1 lá Sát hoặc chịu 1 máu'
              : `Đang chờ ${targetName} phản ứng Nam Man Nhập Xâm...`,
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
              ? 'Vạn Tiễn Tề Phát — Cần đánh 1 lá Thiểm hoặc chịu 1 máu'
              : `Đang chờ ${targetName} phản ứng Vạn Tiễn Tề Phát...`,
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
              ? 'Ngũ Cốc Phong Đăng — Hãy chọn 1 lá bài ở giữa bàn'
              : `Đang chờ ${targetName} chọn bài Ngũ Cốc Phong Đăng...`,
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
              ? 'Lỏa Y — Rút ít hơn 1 lá để tăng +1 sát thương lượt này?'
              : `Đang chờ ${targetName} quyết định Lỏa Y...`,
          detailVi: 'Tăng +1 sát thương cho Sát và Quyết Đấu trong lượt.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_KE_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Khắc Kỷ — Bỏ qua pha Bỏ bài?'
              : `Đang chờ ${targetName} quyết định Khắc Kỷ...`,
          detailVi: 'Bạn chưa dùng hay đánh Sát trong lượt đánh chính.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'ASK_TIE_QI':
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? 'Thiết Kỵ — Phán xét khóa Thiểm của mục tiêu?'
              : `Đang chờ ${sourceName} quyết định Thiết Kỵ...`,
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
              ? 'Lưu Ly — Bỏ 1 lá để chuyển Sát sang người khác trong tầm?'
              : `Đang chờ ${targetName} quyết định Lưu Ly...`,
          detailVi: `Người đánh Sát: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GUI_CAI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Quỷ Tài — Đánh 1 lá trên tay thay thế lá phán xét?'
              : `Đang chờ ${targetName} phản ứng Quỷ Tài...`,
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
              ? 'Thiên Đố — Thu lấy lá bài vừa phán xét?'
              : `Đang chờ ${targetName} quyết định Thiên Đố...`,
          detailVi: interrupt.judgeCard
            ? `Lá phán xét: ${formatCardShort(interrupt.judgeCard)}.`
            : 'Quách Gia có thể thu lấy lá phán xét.',
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
              ? `Gian Hùng — Thu lấy ${dmgCardDesc ?? 'lá bài vừa gây sát thương'}?`
              : `Đang chờ ${targetName} quyết định Gian Hùng...`,
          detailVi: dmgCardDesc
            ? `Tào Tháo có thể thu về tay ${dmgCardDesc} vừa gây sát thương.`
            : 'Tào Tháo có thể thu về tay lá bài gây sát thương.',
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
              ? `Phản Quỷ — Lấy 1 lá bài từ ${sourceName}?`
              : `Đang chờ ${targetName} quyết định Phản Quỷ...`,
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
              ? `Cương Liệt — Phán xét phản công ${sourceName}?`
              : `Đang chờ ${targetName} quyết định Cương Liệt...`,
          detailVi: 'Nếu phán xét không ra Cơ, nguồn sát thương phải bỏ 2 lá hoặc mất 1 máu.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_GANG_LIE_CHOICE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Trúng Cương Liệt — Bỏ 2 lá trên tay hoặc chịu 1 sát thương'
              : `Đang chờ ${targetName} chọn hình phạt Cương Liệt...`,
          detailVi: `Từ Hạ Hầu Đôn (${sourceName}).`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_YI_JI':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Di Kế — Chia 2 lá bài mới rút cho bản thân hoặc đồng đội'
              : `Đang chờ ${targetName} chia bài Di Kế...`,
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
              ? `Phản Gián — Đoán chất bài trước khi rút từ ${sourceName}`
              : `Đang chờ ${targetName} đoán chất Phản Gián...`,
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
              ? `Kích Tướng — Đánh Sát giúp Chủ Công ${targetName}?`
              : `Đang chờ ${responderName} hưởng ứng Kích Tướng...`,
          detailVi: `Chủ Công Thục: ${targetName}.`,
          actorSeat: interrupt.responderSeat ?? null,
          actorNameVi: responderName,
          isMyTurn: interrupt.responderSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_HU_JIA':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? `Hộ Giá — Đánh Thiểm giúp Chủ Công ${targetName}?`
              : `Đang chờ ${responderName} hưởng ứng Hộ Giá...`,
          detailVi: `Chủ Công Ngụy: ${targetName}.`,
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
        detailVi: 'Đang kiểm tra các lá Cẩm nang Thời gian.',
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
          ? ' — Anh Tư (+1 lá)'
          : selfHeroId === 'xu_chu'
            ? ' — Lỏa Y (rút 1 lá đầu)'
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
          ? 'Lượt của bạn — Pha Đánh Bài'
          : `Đang chờ ${currentActorName} đánh bài...`,
        detailVi: isSelfTurn
          ? isSelfLuoYiDrawSecond
            ? 'Bạn có thể rút thêm lá thứ 2 (bỏ Lỏa Y) hoặc đánh Sát / Quyết Đấu ngay để +1 sát thương.'
            : 'Chọn lá bài hoặc kỹ năng bên dưới rồi chọn mục tiêu nếu cần.'
          : 'Bạn có thể bật "Tự bỏ qua Vô Giải" nếu không muốn giữ nhịp chờ.',
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
  return DESCRIPTION_BY_CARD_KEY[cardKey] ?? fallbackName;
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
      return 'Võ Thánh cần chọn lá chất Đỏ (Cơ/Rô).';
    case 'long_dan_sat':
      return 'Long Đảm (chuyển Sát) cần lá Thiểm.';
    case 'ky_tap':
      return 'Kỳ Tập cần chọn lá chất Đen (Bích/Chuồn).';
    case 'quoc_sac':
      return 'Quốc Sắc cần chọn lá chất Rô.';
    case 'cuu_vien':
      return 'Cấp Cứu cần chọn lá chất Đỏ.';
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
        return { kind: 'blocked', reasonVi: 'Đang chờ phản ứng Vô Giải Khả Kích.' };
      }
      if (card.cardKey === 'vo_giai_kha_kich') {
        return {
          kind: 'table',
          actionLabelVi: 'Thả lên bàn để đánh Vô Giải Khả Kích',
          action: { type: 'RESPOND_NULLIFICATION', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần dùng lá Vô Giải Khả Kích để hưởng ứng.' };
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
          actionLabelVi: `Thả để đánh Thiểm (${card.nameVi}) né đòn`,
          action: {
            type: interrupt.kind === 'WAIT_AOE_DODGE' ? 'RESPOND_AOE_DODGE' : 'RESPOND_DODGE',
            seatIndex: selfSeat,
            cardId: card.id,
          },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Thiểm để né đòn.' };
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
          actionLabelVi: `Thả để đánh Sát (${card.nameVi})`,
          action: { type: actionType, seatIndex: selfSeat, cardIds: [card.id] },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Sát để hưởng ứng.' };
    }
    if (interrupt.kind === 'WAIT_PEACH_RESCUE' && interrupt.responderSeat === selfSeat) {
      const canJiu =
        selfPlayer.heroId === 'hua_tuo' &&
        view.currentTurnSeat !== selfSeat &&
        isRedSuit(card.suit);
      if (card.cardKey === 'dao' || canJiu) {
        return {
          kind: 'table',
          actionLabelVi: `Thả để dùng ${card.nameVi} cứu hấp hối`,
          action: { type: 'RESPOND_PEACH_RESCUE', seatIndex: selfSeat, cardId: card.id },
        };
      }
      return { kind: 'blocked', reasonVi: 'Cần lá Đào để cứu người hấp hối.' };
    }
    if (interrupt.kind === 'WAIT_GUI_CAI' && interrupt.targetSeat === selfSeat) {
      return {
        kind: 'table',
        actionLabelVi: `Thả ${card.nameVi} đổi lá phán xét (Quỷ Tài)`,
        action: { type: 'RESPOND_GUI_CAI', seatIndex: selfSeat, cardId: card.id },
      };
    }
    if (interrupt.kind === 'WAIT_JI_JIANG' && interrupt.responderSeat === selfSeat) {
      const canWuSheng = selfPlayer.heroId === 'guan_yu' && isRedSuit(card.suit);
      const canLongDan = selfPlayer.heroId === 'zhao_yun' && card.cardKey === 'thiem';
      if (card.cardKey === 'sat' || canWuSheng || canLongDan) {
        return {
          kind: 'table',
          actionLabelVi: `Thả ${card.nameVi} đánh Sát hộ Chủ Công`,
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
          actionLabelVi: `Thả ${card.nameVi} đánh Thiểm hộ Chủ Công`,
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
        promptVi: 'Trượng Bát Xà Mâu cần chọn đủ 2 lá trên tay rồi chọn mục tiêu.',
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
      return { kind: 'blocked', reasonVi: 'Lá Thiểm chỉ dùng khi né Sát hoặc Vạn Tiễn.' };
    }
    if (effectiveKey === 'vo_giai_kha_kich') {
      return { kind: 'blocked', reasonVi: 'Vô Giải Khả Kích chỉ dùng khi Cẩm nang sắp hiệu lực.' };
    }
    if (effectiveKey === 'dao' && selfPlayer.hp >= selfPlayer.maxHp) {
      return { kind: 'blocked', reasonVi: 'Máu đang đầy — chưa thể dùng Đào.' };
    }
    if (effectiveKey === 'sat') {
      if (view.peacefulFirstRound && view.roundNumber === 1) {
        return {
          kind: 'blocked',
          reasonVi: 'Vòng 1 Hòa Bình: chưa được đánh Sát ở vòng đầu tiên.',
        };
      }
      const unlimited =
        selfPlayer.heroId === 'zhang_fei' ||
        selfPlayer.equipments.weapon?.cardKey === 'gia_cat_lien_no';
      if (!unlimited && (view.turnFlags?.satUsedThisTurn ?? 0) >= 1) {
        return { kind: 'blocked', reasonVi: 'Bạn đã dùng Sát trong lượt đánh này.' };
      }
    }

    const spec = getRequiredTargetSpec(view, hyp);
    const asCardKey = getConvertAsCardKey(selection.activeConvertMode);
    if (spec.minTargets === 2) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: 'Không có người cầm Vũ khí thích hợp.' };
      }
      return {
        kind: 'seat_pair_step1',
        card,
        actionLabelVi: 'Thả vào người cầm Vũ khí trước (Bước 1/2)',
        eligibleSeats: spec.eligibleSeats,
      };
    }
    if (spec.minTargets >= 1 && spec.maxTargets === 1) {
      if (spec.eligibleSeats.length === 0) {
        return { kind: 'blocked', reasonVi: 'Không có mục tiêu hợp lệ trong tầm đánh.' };
      }
      const actionVerbVi =
        effectiveKey === 'sat'
          ? 'đánh Sát'
          : effectiveKey === 'quyet_dau'
            ? 'Quyết Đấu'
            : effectiveKey === 'thuan_thu_khien_duong'
              ? 'Thuận Thủ'
              : effectiveKey === 'qua_ha_sai_cau'
                ? 'Quá Hà'
                : effectiveKey === 'lac_bat_tu_thuc'
                  ? 'đặt Lạc'
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
  FIRST_ROUND_SAT_FORBIDDEN: 'Vòng 1 Hòa Bình: chưa được đánh Sát ở vòng đầu tiên.',
  SAT_LIMIT_REACHED: 'Bạn đã dùng Sát trong lượt này rồi.',
  HP_ALREADY_FULL: 'Máu đang đầy, chưa thể dùng Đào.',
  TARGET_OUT_OF_RANGE: 'Mục tiêu nằm ngoài tầm đánh.',
  SNATCH_TARGET_OUT_OF_RANGE: 'Mục tiêu nằm ngoài khoảng cách 1.',
  TARGET_IMMUNE_TO_CARD: 'Mục tiêu miễn nhiễm với lá bài này.',
  CANNOT_DISCARD_QUAN_THACH_PHU_SELF:
    'Không thể bỏ chính Quán Thạch Phủ để kích hoạt Quán Thạch Phủ.',
  DELAYED_ZONE_NOT_ALLOWED: 'Không thể chọn lá ở khu Thời gian.',
  SIMULATED_DELAY_CANNOT_BE_ANSWERED_BY_PLAYER:
    'Đang giữ nhịp chờ Vô Giải ngắn để tránh lộ bài.',
  INVALID_LIU_LI_TARGET: 'Mục tiêu Lưu Ly phải là người khác trong tầm đánh.',
  LIU_LI_REQUIRES_CARD_AND_TARGET: 'Lưu Ly cần chọn 1 lá bài và 1 mục tiêu trong tầm.',
  JI_JIANG_NOT_AVAILABLE: 'Không thể kích hoạt Kích Tướng lúc này.',
  NO_SHU_ALLIES_FOR_JI_JIANG: 'Không còn đồng minh Thục để hưởng ứng Kích Tướng.',
  HU_JIA_NOT_AVAILABLE: 'Không thể kích hoạt Hộ Giá lúc này.',
  NO_WEI_ALLIES_FOR_HU_JIA: 'Không còn đồng minh Ngụy để hưởng ứng Hộ Giá.',
  BAGUA_NOT_AVAILABLE: 'Không thể dùng Bát Quái Trận lúc này.',
  QUAN_THACH_PHU_REQUIRES_2_CARDS: 'Quán Thạch Phủ cần chọn đúng 2 lá bài để bỏ.',
  HAN_BANG_KIEM_MUST_PICK_1_OR_2_CARDS: 'Hàn Băng Kiếm chỉ hủy 1 hoặc 2 lá của mục tiêu.',
  INTERRUPT_PENDING: 'Đang có phản ứng khác cần xử lý trước.',
  NOT_IN_PLAY_PHASE: 'Hiện không phải pha Đánh bài.',
  NOT_IN_DISCARD_PHASE: 'Hiện không phải pha Bỏ bài.',
  DEAD_PLAYER_CANNOT_ACT: 'Tướng đã tử trận, không thể thao tác.',
  INVALID_TWO_CARD_COMBO: 'Cần chọn đúng 2 lá bài trên tay cho Trượng Bát Xà Mâu.',
  INVALID_STRIKE_TARGET_COUNT: 'Số lượng mục tiêu cho Sát chưa hợp lệ.',
  MUST_SELECT_ONE_CARD: 'Vui lòng chọn 1 lá bài.',
  NOT_A_SAT_CARD: 'Lá bài đã chọn không phải lá Sát.',
  NOT_A_THIEM_CARD: 'Lá bài đã chọn không phải lá Thiểm.',
  NOT_A_DAO_CARD: 'Lá bài đã chọn không phải lá Đào.',
  NOT_A_NULLIFICATION_CARD: 'Lá bài đã chọn không phải Vô Giải Khả Kích.',
  INVALID_DELAYED_TARGET: 'Mục tiêu đặt cẩm nang thời gian không hợp lệ.',
  TARGET_ALREADY_HAS_LAC: 'Mục tiêu đã có Lạc Bất Tư Thục trước mặt.',
  ALREADY_HAS_THIEM_DIEN: 'Bạn đã có Thiểm Điện trước mặt rồi.',
  INVALID_DISMANTLE_TARGET: 'Không thể dùng Quá Hà Sái Cầu lên chính mình.',
  TARGET_HAS_NO_CARDS: 'Mục tiêu không có lá bài nào.',
  INVALID_DUEL_TARGET: 'Không thể Quyết Đấu với chính mình.',
  INVALID_COLLATERAL_TARGETS: 'Mục tiêu Tá Đao Sát Nhân không hợp lệ.',
  TARGET_NOT_ALIVE: 'Mục tiêu đã tử trận.',
  NULLIFICATION_ALREADY_PASSED: 'Bạn đã bỏ qua Vô Giải Khả Kích cho lượt này.',
  NOT_ELIGIBLE_FOR_NULLIFICATION: 'Hiện không thể đánh Vô Giải Khả Kích.',
  INVALID_TU_XI_TARGETS: 'Mục tiêu Đột Tập không hợp lệ.',
  MATCH_ALREADY_FINISHED: 'Ván đấu đã kết thúc.',
  INVALID_SAT_CARD_COUNT: 'Số lượng lá Sát không hợp lệ.',
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
      return 'Lá Thiểm chỉ dùng khi né Sát hoặc Vạn Tiễn.';
    }
    if (cardKey === 'vo_giai_kha_kich') {
      return 'Vô Giải Khả Kích chỉ dùng khi Cẩm nang sắp có hiệu lực.';
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
