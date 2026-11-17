import {
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
  HeroFaction,
  IdentityRole,
  PlayerViewState,
  PublicPlayerView,
  TurnFlags,
} from '@lkdf/shared';

export type PlaySkillMode =
  | 'ren_de'
  | 'zhi_heng'
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
}

const FACTION_STYLES: Readonly<Record<HeroFaction, FactionVisualStyle>> = {
  SHU: {
    hex: '#C83E37',
    labelVi: 'Thục',
    badgeClass: 'bg-[#C83E37]/20 text-[#F87171] border-[#C83E37]/50',
    borderClass: 'border-[#C83E37]/60',
  },
  WEI: {
    hex: '#3B82F6',
    labelVi: 'Ngụy',
    badgeClass: 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/50',
    borderClass: 'border-[#3B82F6]/60',
  },
  WU: {
    hex: '#10B981',
    labelVi: 'Ngô',
    badgeClass: 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/50',
    borderClass: 'border-[#10B981]/60',
  },
  QUN: {
    hex: '#9CA3AF',
    labelVi: 'Quần',
    badgeClass: 'bg-[#9CA3AF]/20 text-[#D1D5DB] border-[#9CA3AF]/50',
    borderClass: 'border-[#9CA3AF]/60',
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
      return attackRange !== undefined ? `Vũ khí (Tầm ${attackRange})` : 'Vũ khí';
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

export function getAvailablePlaySkills(
  player: PublicPlayerView | undefined,
  turnFlags?: TurnFlags,
): readonly PlaySkillOption[] {
  if (!player || !player.alive || !player.heroId) {
    return [];
  }
  const skills: PlaySkillOption[] = [];
  switch (player.heroId) {
    case 'liu_bei':
      if (player.handCount > 0) {
        skills.push({
          id: 'ren_de',
          nameVi: 'Nhân Đức',
          descriptionVi: 'Chọn bài trên tay rồi chọn 1 đồng đội để giao bài (giao từ 2 lá hồi 1 máu).',
        });
      }
      break;
    case 'sun_quan':
      if (!turnFlags?.zhiHengUsedThisTurn) {
        skills.push({
          id: 'zhi_heng',
          nameVi: 'Chế Hành',
          descriptionVi: 'Chọn bất kỳ lá bài trên tay để bỏ và rút lại đúng bấy nhiêu lá (1 lần/lượt).',
        });
      }
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
    case 'diao_chan':
      if (!turnFlags?.liJianUsedThisTurn && player.handCount >= 1) {
        skills.push({
          id: 'li_jian',
          nameVi: 'Ly Gián',
          descriptionVi: 'Bỏ 1 lá bài và chọn 2 tướng nam khác nhau để buộc họ Quyết Đấu.',
        });
      }
      break;
    default:
      break;
  }
  return skills;
}

export function getAvailableConvertModes(
  player: PublicPlayerView | undefined,
  isPlayPhase: boolean,
): readonly ConvertCardOption[] {
  if (!player || !player.alive) {
    return [];
  }
  const options: ConvertCardOption[] = [];
  if (player.heroId === 'guan_yu') {
    options.push({
      mode: 'wu_sheng',
      labelVi: 'Võ Thánh (Đỏ → Sát)',
      descriptionVi: 'Dùng 1 lá chất Đỏ (♥/♦) như lá Sát.',
      requiredCards: 1,
      targetCardKey: 'sat',
    });
  }
  if (player.heroId === 'zhao_yun') {
    options.push({
      mode: 'long_dan_sat',
      labelVi: 'Long Đảm (Thiểm → Sát)',
      descriptionVi: 'Dùng lá Thiểm như lá Sát.',
      requiredCards: 1,
      targetCardKey: 'sat',
    });
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
  if (player.equipments.weapon?.cardKey === 'truong_bat_xa_mau') {
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

export function getEffectivePlayCardKey(
  selection: MatchSelectionState,
  handCards: readonly CardInstance[],
): string | null {
  if (selection.activeConvertMode) {
    switch (selection.activeConvertMode) {
      case 'wu_sheng':
      case 'long_dan_sat':
      case 'truong_bat':
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
    const card = handCards.find((c) => c.id === selection.selectedCardIds[0]);
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
    player.equipments.minusOneHorse !== null ||
    player.delayedScrolls.length > 0
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

  if (selection.activeSkillMode) {
    switch (selection.activeSkillMode) {
      case 'ren_de':
        return {
          minTargets: 1,
          maxTargets: 1,
          eligibleSeats: aliveOthers.map((p) => p.seatIndex),
          promptVi: 'Hãy bấm chọn 1 người chơi để giao bài (Nhân Đức)',
        };
      case 'zhi_heng':
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
                getHeroDefinition(p.heroId).gender === 'MALE',
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
  const effectiveKey = getEffectivePlayCardKey(selection, handCards);
  if (!effectiveKey) {
    return { minTargets: 0, maxTargets: 0, eligibleSeats: [], promptVi: '' };
  }

  switch (effectiveKey) {
    case 'sat': {
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
        promptVi: 'Hãy bấm chọn 1 mục tiêu trong khoảng cách 1 để Thuận Thủ',
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
        .filter(
          (p) =>
            p.heroId !== 'lu_xun' &&
            !p.delayedScrolls.some((c) => c.cardKey === 'lac_bat_tu_thuc'),
        )
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
      case 'WAIT_NULLIFICATION':
        return {
          headlineVi: 'Đang chờ phản ứng Vô Giải Khả Kích toàn bàn...',
          detailVi: `Cẩm nang sắp có hiệu lực: ${interrupt.scrollNameVi ?? 'Cẩm nang'} (Mục tiêu: ${targetName}).`,
          actorSeat: null,
          actorNameVi: null,
          isMyTurn: Boolean(viewer && viewer.alive),
          isAllTableWait: true,
        };
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
      case 'WAIT_DODGE':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Bạn bị đánh Sát — Cần ${interrupt.requiredCount ?? 1} lá Thiểm (đã né ${interrupt.dodgedSoFar ?? 0})`
              : `Đang chờ ${targetName} đánh Thiểm né Sát...`,
          detailVi: `Nguồn sát thương: ${sourceName}.`,
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
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
      case 'WAIT_DUEL_SAT':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? `Quyết Đấu — Cần đánh ${interrupt.requiredCount ?? 1} lá Sát`
              : `Đang chờ ${targetName} đánh Sát trong Quyết Đấu...`,
          detailVi: 'Ai không đánh đủ Sát sẽ chịu 1 sát thương.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
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
        return {
          headlineVi:
            interrupt.sourceSeat === viewerSeat
              ? `Hãy chọn 1 khu bài của ${targetName} để lấy hoặc hủy`
              : `Đang chờ ${sourceName} chọn bài từ ${targetName}...`,
          detailVi: 'Chọn từ Tay bài, Trang bị hoặc khu Thời gian ở trung tâm bàn.',
          actorSeat: interrupt.sourceSeat ?? null,
          actorNameVi: sourceName,
          isMyTurn: interrupt.sourceSeat === viewerSeat,
          isAllTableWait: false,
        };
      case 'WAIT_PEACH_RESCUE':
        return {
          headlineVi:
            interrupt.responderSeat === viewerSeat
              ? `${targetName} đang hấp hối (0❤️) — Dùng Đào cứu?`
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
            ? `Lá phán xét hiện tại: ${formatCardShort(interrupt.judgeCard)}.`
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
      case 'ASK_JIAN_XIONG':
        return {
          headlineVi:
            interrupt.targetSeat === viewerSeat
              ? 'Gian Hùng — Thu lấy lá bài vừa gây sát thương?'
              : `Đang chờ ${targetName} quyết định Gian Hùng...`,
          detailVi: 'Tào Tháo có thể thu về tay lá bài gây sát thương.',
          actorSeat: interrupt.targetSeat,
          actorNameVi: targetName,
          isMyTurn: interrupt.targetSeat === viewerSeat,
          isAllTableWait: false,
        };
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
    case 'DRAW':
      return {
        headlineVi: `Pha Rút Bài — ${currentActorName}`,
        detailVi: 'Đang rút bài đầu lượt.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
    case 'PLAY':
      return {
        headlineVi: isSelfTurn
          ? 'Lượt của bạn — Pha Đánh Bài'
          : `Đang chờ ${currentActorName} đánh bài...`,
        detailVi: isSelfTurn
          ? 'Chọn lá bài hoặc kỹ năng bên dưới rồi chọn mục tiêu nếu cần.'
          : 'Bạn có thể bật "Tự bỏ qua Vô Giải" nếu không muốn giữ nhịp chờ.',
        actorSeat: view.currentTurnSeat,
        actorNameVi: currentActorName,
        isMyTurn: isSelfTurn,
        isAllTableWait: false,
      };
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
