import { getCardColor, isBlackSuit, isRedSuit } from '../cards/catalog.js';
import {
  canReachForSnatch,
  canUseCollateralMurder,
  isInAttackRange,
} from '../distance/index.js';
import { getHeroDefinition } from '../heroes/catalog.js';
import type { GameAction } from '../engine/combatTypes.js';
import type {
  CardInstance,
  HeroId,
  PlayerViewState,
  PublicPlayerView,
  TargetCardZone,
} from '../types/game.js';

export const BOT_MODULE_READY = true;

const CARD_KEEP_PRIORITY: Readonly<Record<string, number>> = {
  dao: 100,
  vo_giai_kha_kich: 90,
  vo_trung_sinh_huu: 85,
  sat: 75,
  thiem: 70,
  thuan_thu_khien_duong: 65,
  qua_ha_sai_cau: 62,
  quyet_dau: 60,
  nam_man_nhap_xam: 58,
  van_tien_te_phat: 58,
  lac_bat_tu_thuc: 55,
  ngu_coc_phong_dang: 52,
  ta_dao_sat_nhan: 45,
  dao_vien_ket_nghia: 40,
  thiem_dien: 25,
};

function cardScore(card: CardInstance): number {
  return CARD_KEEP_PRIORITY[card.cardKey] ?? 35;
}

function sortCardsLowestFirst(cards: readonly CardInstance[]): CardInstance[] {
  return [...cards].sort((a, b) => cardScore(a) - cardScore(b));
}

function getViewerPlayer(view: PlayerViewState): PublicPlayerView {
  const player = view.players.find((p) => p.seatIndex === view.viewerSeatIndex);
  if (!player) {
    throw new Error(`BOT_VIEWER_SEAT_MISSING:${view.viewerSeatIndex}`);
  }
  return player;
}

function getPlayer(view: PlayerViewState, seatIndex: number): PublicPlayerView | undefined {
  return view.players.find((p) => p.seatIndex === seatIndex);
}

function getLordSeat(view: PlayerViewState): number | null {
  return view.players.find((p) => p.identity === 'LORD')?.seatIndex ?? null;
}

function getAliveOpponents(view: PlayerViewState): PublicPlayerView[] {
  return view.players.filter(
    (p) => p.alive && p.seatIndex !== view.viewerSeatIndex,
  );
}

/** Sắp xếp danh sách mục tiêu hợp lý dựa trên Thân Phận công khai & bản thân. */
function rankEnemyTargets(
  view: PlayerViewState,
  candidates: readonly PublicPlayerView[],
): PublicPlayerView[] {
  const self = getViewerPlayer(view);
  const lordSeat = getLordSeat(view);
  const aliveCount = view.players.filter((p) => p.alive).length;

  const scoreTarget = (target: PublicPlayerView): number => {
    let score = (5 - target.hp) * 10 - target.handCount;
    if (self.identity === 'REBEL') {
      if (target.seatIndex === lordSeat) score += 200;
    } else if (self.identity === 'LOYALIST') {
      if (target.seatIndex === lordSeat) score -= 10000;
    } else if (self.identity === 'SPY') {
      if (aliveCount > 2 && target.seatIndex === lordSeat) {
        score -= 500;
      } else if (aliveCount <= 2 && target.seatIndex === lordSeat) {
        score += 200;
      }
    }
    return score;
  };

  return [...candidates].sort((a, b) => scoreTarget(b) - scoreTarget(a));
}

function isPreferredEnemy(
  view: PlayerViewState,
  targetSeat: number,
): boolean {
  const self = getViewerPlayer(view);
  const lordSeat = getLordSeat(view);
  const aliveCount = view.players.filter((p) => p.alive).length;

  if (self.identity === 'LOYALIST') {
    return targetSeat !== lordSeat;
  }
  if (self.identity === 'SPY' && aliveCount > 2) {
    return targetSeat !== lordSeat;
  }
  return targetSeat !== self.seatIndex;
}

function isAllySeat(
  view: PlayerViewState,
  seatIndex: number,
): boolean {
  const self = getViewerPlayer(view);
  const lordSeat = getLordSeat(view);
  if (seatIndex === self.seatIndex) return true;
  if (self.identity === 'LOYALIST' && seatIndex === lordSeat) return true;
  if (self.identity === 'SPY' && view.players.filter((p) => p.alive).length > 2 && seatIndex === lordSeat) {
    return true;
  }
  const target = getPlayer(view, seatIndex);
  if (self.identity === 'LORD' && target?.identity === 'LOYALIST') {
    return true;
  }
  return false;
}

function canTargetWithBasicCard(
  target: PublicPlayerView,
  cardKey: 'sat' | 'quyet_dau' | 'thuan_thu_khien_duong' | 'lac_bat_tu_thuc',
): boolean {
  if (!target.alive) return false;
  if (
    target.heroId === 'zhuge_liang' &&
    target.handCount === 0 &&
    (cardKey === 'sat' || cardKey === 'quyet_dau')
  ) {
    return false;
  }
  if (
    target.heroId === 'lu_xun' &&
    (cardKey === 'thuan_thu_khien_duong' || cardKey === 'lac_bat_tu_thuc')
  ) {
    return false;
  }
  return true;
}

function findSingleCardForSat(
  player: PublicPlayerView,
  allowEquipSacrifice = false,
): CardInstance | null {
  const hand = player.handCards ?? [];
  const exact = hand.find((c) => c.cardKey === 'sat');
  if (exact) return exact;
  if (player.heroId === 'zhao_yun') {
    const thiem = hand.find((c) => c.cardKey === 'thiem');
    if (thiem) return thiem;
  }
  if (player.heroId === 'guan_yu') {
    const redHand = hand.find((c) => isRedSuit(c.suit));
    if (redHand) return redHand;
    if (allowEquipSacrifice) {
      const equips = [
        player.equipments.weapon,
        player.equipments.armor,
        player.equipments.plusOneHorse,
        player.equipments.minusOneHorse,
      ].filter((c): c is CardInstance => c !== null);
      const redEquip = equips.find((c) => isRedSuit(c.suit));
      if (redEquip) return redEquip;
    }
  }
  return null;
}

function findTwoCardsForTruongBat(player: PublicPlayerView): [CardInstance, CardInstance] | null {
  if (player.equipments.weapon?.cardKey !== 'truong_bat_xa_mau') {
    return null;
  }
  const hand = sortCardsLowestFirst(player.handCards ?? []);
  if (hand.length < 2) {
    return null;
  }
  return [hand[0]!, hand[1]!];
}

function findStrikeCardsForResponse(
  player: PublicPlayerView,
  allowTruongBat: boolean,
): readonly string[] | null {
  const single = findSingleCardForSat(player, true);
  if (single) {
    return [single.id];
  }
  if (allowTruongBat) {
    const pair = findTwoCardsForTruongBat(player);
    if (pair) {
      return [pair[0].id, pair[1].id];
    }
  }
  return null;
}

function findCardForDodge(player: PublicPlayerView): CardInstance | null {
  const hand = player.handCards ?? [];
  const exact = hand.find((c) => c.cardKey === 'thiem');
  if (exact) return exact;
  if (player.heroId === 'zhao_yun') {
    const sat = hand.find((c) => c.cardKey === 'sat');
    if (sat) return sat;
  }
  if (player.heroId === 'zhen_ji') {
    const black = hand.find((c) => isBlackSuit(c.suit));
    if (black) return black;
  }
  return null;
}

function findCardForPeach(
  view: PlayerViewState,
  player: PublicPlayerView,
): CardInstance | null {
  const hand = player.handCards ?? [];
  const exact = hand.find((c) => c.cardKey === 'dao');
  if (exact) return exact;
  const inTurn = player.seatIndex === view.currentTurnSeat;
  if (player.heroId === 'hua_tuo' && !inTurn) {
    const redHand = hand.find((c) => isRedSuit(c.suit));
    if (redHand) return redHand;
    const equips = [
      player.equipments.weapon,
      player.equipments.armor,
      player.equipments.plusOneHorse,
      player.equipments.minusOneHorse,
    ].filter((c): c is CardInstance => c !== null);
    const redEquip = equips.find((c) => isRedSuit(c.suit));
    if (redEquip) return redEquip;
  }
  return null;
}

function collectAnyOwnedCards(
  player: PublicPlayerView,
  excludeCardId?: string,
): CardInstance[] {
  const all: CardInstance[] = [
    ...sortCardsLowestFirst(player.handCards ?? []),
    ...(player.equipments.minusOneHorse ? [player.equipments.minusOneHorse] : []),
    ...(player.equipments.plusOneHorse ? [player.equipments.plusOneHorse] : []),
    ...(player.equipments.armor ? [player.equipments.armor] : []),
    ...(player.equipments.weapon ? [player.equipments.weapon] : []),
  ];
  return excludeCardId ? all.filter((c) => c.id !== excludeCardId) : all;
}

function pickBestTargetZone(target: PublicPlayerView): {
  readonly zone: TargetCardZone;
  readonly handIndex?: number;
  readonly delayedCardId?: string;
} {
  if (target.equipments.armor) return { zone: 'ARMOR' };
  if (target.equipments.plusOneHorse) return { zone: 'PLUS_ONE_HORSE' };
  if (target.equipments.weapon) return { zone: 'WEAPON' };
  if (target.equipments.minusOneHorse) return { zone: 'MINUS_ONE_HORSE' };
  if (target.handCount > 0) return { zone: 'HAND', handIndex: 0 };
  if (target.delayedScrolls.length > 0) {
    return { zone: 'DELAYED', delayedCardId: target.delayedScrolls[0]!.id };
  }
  return { zone: 'HAND', handIndex: 0 };
}

function hasAliveAllyOfFaction(
  view: PlayerViewState,
  lordSeat: number,
  faction: 'SHU' | 'WEI',
): boolean {
  return view.players.some(
    (p) =>
      p.alive &&
      p.seatIndex !== lordSeat &&
      p.heroId !== null &&
      getHeroDefinition(p.heroId).faction === faction,
  );
}

/** Chọn tướng tự động cho Bot trong pha HERO_SELECT (mặc định lá đầu tiên bên trái). */
export function chooseBotHero(view: PlayerViewState): HeroId {
  const candidates = view.heroDraft?.myCandidates ?? [];
  const pick = candidates[0];
  if (!pick) {
    throw new Error('NO_HERO_CANDIDATES_FOR_BOT');
  }
  return pick;
}

function decidePlayPhaseAction(view: PlayerViewState): GameAction {
  const self = getViewerPlayer(view);
  const seatIndex = self.seatIndex;
  const hand = self.handCards ?? [];
  const flags = view.turnFlags;
  const aliveOpponents = getAliveOpponents(view);
  const rankedEnemies = rankEnemyTargets(view, aliveOpponents);

  // 1. Dùng Đào hồi máu nếu đang bị thương
  if (self.hp < self.maxHp) {
    const dao = hand.find((c) => c.cardKey === 'dao');
    if (dao) {
      return { type: 'PLAY_CARD', seatIndex, cardIds: [dao.id] };
    }
  }

  // 2. Mặc trang bị vào ô trống (hoặc nâng cấp vũ khí tầm xa hơn / kích hoạt Kiêu Cơ)
  for (const card of hand) {
    if (card.category === 'WEAPON') {
      const curWeapon = self.equipments.weapon;
      const newRange = card.attackRange ?? 1;
      const oldRange = curWeapon?.attackRange ?? 0;
      if (
        !curWeapon ||
        newRange > oldRange ||
        self.heroId === 'sun_shang_xiang'
      ) {
        return { type: 'PLAY_CARD', seatIndex, cardIds: [card.id] };
      }
    }
    if (card.category === 'ARMOR') {
      if (!self.equipments.armor || self.heroId === 'sun_shang_xiang') {
        return { type: 'PLAY_CARD', seatIndex, cardIds: [card.id] };
      }
    }
    if (card.category === 'PLUS_ONE_HORSE') {
      if (!self.equipments.plusOneHorse || self.heroId === 'sun_shang_xiang') {
        return { type: 'PLAY_CARD', seatIndex, cardIds: [card.id] };
      }
    }
    if (card.category === 'MINUS_ONE_HORSE') {
      if (!self.equipments.minusOneHorse || self.heroId === 'sun_shang_xiang') {
        return { type: 'PLAY_CARD', seatIndex, cardIds: [card.id] };
      }
    }
  }

  // 3. Kích hoạt kỹ năng pha PLAY hữu ích (tránh lặp vô hạn)
  if (
    self.heroId === 'sun_quan' &&
    !flags?.zhiHengUsedThisTurn &&
    hand.length >= 2
  ) {
    const toSwap = sortCardsLowestFirst(hand).slice(0, Math.min(2, hand.length));
    return {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex,
      skillId: 'zhi_heng',
      cardIds: toSwap.map((c) => c.id),
    };
  }

  if (
    self.heroId === 'hua_tuo' &&
    !flags?.qingNangUsedThisTurn &&
    hand.length >= 2
  ) {
    const injuredAlly = view.players.find(
      (p) => p.alive && p.hp < p.maxHp && isAllySeat(view, p.seatIndex),
    );
    if (injuredAlly) {
      const discard = sortCardsLowestFirst(hand)[0]!;
      return {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex,
        skillId: 'qing_nang',
        cardIds: [discard.id],
        targetSeats: [injuredAlly.seatIndex],
      };
    }
  }

  if (
    self.heroId === 'sun_shang_xiang' &&
    !flags?.jieYinUsedThisTurn &&
    hand.length >= 3
  ) {
    const injuredMale = aliveOpponents.find(
      (p) =>
        p.hp < p.maxHp &&
        p.heroId !== null &&
        getHeroDefinition(p.heroId).gender === 'MALE' &&
        isAllySeat(view, p.seatIndex),
    );
    if (injuredMale) {
      const lowest = sortCardsLowestFirst(hand);
      return {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex,
        skillId: 'jie_yin',
        cardIds: [lowest[0]!.id, lowest[1]!.id],
        targetSeats: [injuredMale.seatIndex],
      };
    }
  }

  if (
    self.heroId === 'zhou_yu' &&
    !flags?.fanJianUsedThisTurn &&
    hand.length >= 1 &&
    rankedEnemies.length > 0
  ) {
    return {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex,
      skillId: 'fan_jian',
      targetSeats: [rankedEnemies[0]!.seatIndex],
    };
  }

  if (
    self.heroId === 'diao_chan' &&
    !flags?.liJianUsedThisTurn &&
    hand.length >= 1
  ) {
    const maleTargets = rankedEnemies.filter(
      (p) => p.heroId !== null && getHeroDefinition(p.heroId).gender === 'MALE',
    );
    if (maleTargets.length >= 2) {
      const discard = sortCardsLowestFirst(hand)[0]!;
      return {
        type: 'ACTIVATE_HERO_SKILL',
        seatIndex,
        skillId: 'li_jian',
        cardIds: [discard.id],
        targetSeats: [maleTargets[0]!.seatIndex, maleTargets[1]!.seatIndex],
      };
    }
  }

  if (
    self.heroId === 'liu_bei' &&
    self.hp < self.maxHp &&
    !flags?.renDeHealedThisTurn &&
    hand.length >= 2 &&
    aliveOpponents.length > 0
  ) {
    const ally =
      aliveOpponents.find((p) => isAllySeat(view, p.seatIndex)) ??
      aliveOpponents[0]!;
    const giveCards = sortCardsLowestFirst(hand).slice(0, 2);
    return {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex,
      skillId: 'ren_de',
      cardIds: giveCards.map((c) => c.id),
      targetSeats: [ally.seatIndex],
    };
  }

  if (
    self.heroId === 'huang_gai' &&
    self.hp >= 3 &&
    hand.length <= 2
  ) {
    return {
      type: 'ACTIVATE_HERO_SKILL',
      seatIndex,
      skillId: 'ku_rou',
    };
  }

  // 4. Đánh Cẩm nang có lợi
  const voTrung = hand.find((c) => c.cardKey === 'vo_trung_sinh_huu');
  if (voTrung) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [voTrung.id] };
  }

  const nguCoc = hand.find((c) => c.cardKey === 'ngu_coc_phong_dang');
  if (nguCoc) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [nguCoc.id] };
  }

  const namMan = hand.find((c) => c.cardKey === 'nam_man_nhap_xam');
  if (namMan) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [namMan.id] };
  }

  const vanTien = hand.find((c) => c.cardKey === 'van_tien_te_phat');
  if (vanTien) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [vanTien.id] };
  }

  const daoVien = hand.find((c) => c.cardKey === 'dao_vien_ket_nghia');
  if (daoVien && self.hp < self.maxHp) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [daoVien.id] };
  }

  const thuanThu = hand.find((c) => c.cardKey === 'thuan_thu_khien_duong');
  if (thuanThu) {
    const target = rankedEnemies.find(
      (p) =>
        canReachForSnatch(view, seatIndex, p.seatIndex) &&
        canTargetWithBasicCard(p, 'thuan_thu_khien_duong') &&
        (p.handCount > 0 ||
          p.equipments.weapon !== null ||
          p.equipments.armor !== null ||
          p.equipments.plusOneHorse !== null ||
          p.equipments.minusOneHorse !== null ||
          p.delayedScrolls.length > 0),
    );
    if (target) {
      return {
        type: 'PLAY_CARD',
        seatIndex,
        cardIds: [thuanThu.id],
        targetSeats: [target.seatIndex],
      };
    }
  }

  const quaHa =
    hand.find((c) => c.cardKey === 'qua_ha_sai_cau') ??
    (self.heroId === 'gan_ning' ? hand.find((c) => isBlackSuit(c.suit) && c.cardKey !== 'vo_giai_kha_kich') : undefined);
  if (quaHa) {
    const target = rankedEnemies.find(
      (p) =>
        p.handCount > 0 ||
        p.equipments.weapon !== null ||
        p.equipments.armor !== null ||
        p.equipments.plusOneHorse !== null ||
        p.equipments.minusOneHorse !== null ||
        p.delayedScrolls.length > 0,
    );
    if (target) {
      return {
        type: 'PLAY_CARD',
        seatIndex,
        cardIds: [quaHa.id],
        targetSeats: [target.seatIndex],
        ...(quaHa.cardKey !== 'qua_ha_sai_cau' ? { asCardKey: 'qua_ha_sai_cau' as const } : {}),
      };
    }
  }

  const lac =
    hand.find((c) => c.cardKey === 'lac_bat_tu_thuc') ??
    (self.heroId === 'da_qiao' ? hand.find((c) => c.suit === 'DIAMOND' && c.cardKey !== 'dao') : undefined);
  if (lac) {
    const target = rankedEnemies.find(
      (p) =>
        canTargetWithBasicCard(p, 'lac_bat_tu_thuc') &&
        !p.delayedScrolls.some((d) => d.cardKey === 'lac_bat_tu_thuc'),
    );
    if (target) {
      return {
        type: 'PLAY_CARD',
        seatIndex,
        cardIds: [lac.id],
        targetSeats: [target.seatIndex],
        ...(lac.cardKey !== 'lac_bat_tu_thuc' ? { asCardKey: 'lac_bat_tu_thuc' as const } : {}),
      };
    }
  }

  const thiemDien = hand.find((c) => c.cardKey === 'thiem_dien');
  if (
    thiemDien &&
    !self.delayedScrolls.some((d) => d.cardKey === 'thiem_dien')
  ) {
    return { type: 'PLAY_CARD', seatIndex, cardIds: [thiemDien.id] };
  }

  const taDao = hand.find((c) => c.cardKey === 'ta_dao_sat_nhan');
  if (taDao) {
    for (const attacker of rankedEnemies) {
      if (!attacker.equipments.weapon) continue;
      const victim = rankedEnemies.find(
        (v) =>
          v.seatIndex !== attacker.seatIndex &&
          canUseCollateralMurder(view, seatIndex, attacker.seatIndex, v.seatIndex) &&
          canTargetWithBasicCard(v, 'sat'),
      );
      if (victim) {
        return {
          type: 'PLAY_CARD',
          seatIndex,
          cardIds: [taDao.id],
          targetSeats: [attacker.seatIndex],
          secondarySeat: victim.seatIndex,
        };
      }
    }
  }

  const quyetDau = hand.find((c) => c.cardKey === 'quyet_dau');
  if (quyetDau && findSingleCardForSat(self)) {
    const target = rankedEnemies.find(
      (p) => canTargetWithBasicCard(p, 'quyet_dau') && p.handCount <= 2,
    );
    if (target) {
      return {
        type: 'PLAY_CARD',
        seatIndex,
        cardIds: [quyetDau.id],
        targetSeats: [target.seatIndex],
      };
    }
  }

  // 5. Đánh Sát vào mục tiêu hợp lệ trong tầm đánh
  const unlimitedSat =
    self.heroId === 'zhang_fei' ||
    self.equipments.weapon?.cardKey === 'gia_cat_lien_no';
  const satUsed = flags?.satUsedThisTurn ?? 0;

  if (unlimitedSat || satUsed < 1) {
    const attackTargets = rankedEnemies.filter(
      (p) =>
        isInAttackRange(view, seatIndex, p.seatIndex) &&
        canTargetWithBasicCard(p, 'sat') &&
        isPreferredEnemy(view, p.seatIndex),
    );
    const fallbackTargets =
      attackTargets.length > 0
        ? attackTargets
        : rankedEnemies.filter(
            (p) =>
              isInAttackRange(view, seatIndex, p.seatIndex) &&
              canTargetWithBasicCard(p, 'sat'),
          );

    if (fallbackTargets.length > 0) {
      const singleSat = findSingleCardForSat(self);
      if (singleSat) {
        const isHandCard = hand.some((c) => c.id === singleSat.id);
        const isFangTianLast =
          self.equipments.weapon?.cardKey === 'phuong_thien_hoa_kich' &&
          isHandCard &&
          hand.length === 1;
        const chosenTargets = isFangTianLast
          ? fallbackTargets.slice(0, 3).map((t) => t.seatIndex)
          : [fallbackTargets[0]!.seatIndex];

        return {
          type: 'PLAY_CARD',
          seatIndex,
          cardIds: [singleSat.id],
          targetSeats: chosenTargets,
          ...(singleSat.cardKey !== 'sat' ? { asCardKey: 'sat' as const } : {}),
        };
      }

      const truongBatPair = findTwoCardsForTruongBat(self);
      if (truongBatPair) {
        return {
          type: 'PLAY_CARD',
          seatIndex,
          cardIds: [truongBatPair[0].id, truongBatPair[1].id],
          targetSeats: [fallbackTargets[0]!.seatIndex],
          asCardKey: 'sat',
        };
      }

      if (
        self.heroId === 'liu_bei' &&
        self.identity === 'LORD' &&
        satUsed === 0 &&
        !flags?.jiJiangDeclinedThisTurn &&
        hasAliveAllyOfFaction(view, seatIndex, 'SHU')
      ) {
        return {
          type: 'ACTIVATE_HERO_SKILL',
          seatIndex,
          skillId: 'ji_jiang',
          targetSeats: [fallbackTargets[0]!.seatIndex],
        };
      }
    }
  }

  // 6. Hết nước đi có lợi -> kết thúc pha Đánh bài
  return { type: 'END_PLAY_PHASE', seatIndex };
}

/**
 * Quyết định nước đi hợp lệ tiếp theo của Bot hoàn toàn từ `PlayerViewState`
 * (bảo đảm không bao giờ đọc bài ẩn của đối thủ hay chồng bài rút).
 */
export function decideBotAction(
  view: PlayerViewState,
  _rng: () => number = Math.random,
): GameAction {
  const self = getViewerPlayer(view);
  const seatIndex = self.seatIndex;
  const hand = self.handCards ?? [];
  const active = view.activeInterrupt;

  if (active) {
    switch (active.kind) {
      case 'WAIT_NULLIFICATION': {
        const vg = hand.find((c) => c.cardKey === 'vo_giai_kha_kich');
        const hostileToAlly =
          isAllySeat(view, active.targetSeat) &&
          active.scrollNameVi !== 'Đào Viên Kết Nghĩa' &&
          active.scrollNameVi !== 'Ngũ Cốc Phong Đăng' &&
          active.scrollNameVi !== 'Vô Trung Sinh Hữu';
        if (vg && hostileToAlly) {
          return { type: 'RESPOND_NULLIFICATION', seatIndex, cardId: vg.id };
        }
        return { type: 'RESPOND_NULLIFICATION', seatIndex, cardId: null };
      }

      case 'ASK_TU_HUNG': {
        if (hand.length > 2) {
          const lowest = sortCardsLowestFirst(hand)[0]!;
          return {
            type: 'RESPOND_TU_HUNG',
            seatIndex,
            choice: 'DISCARD_HAND',
            discardCardId: lowest.id,
          };
        }
        return { type: 'RESPOND_TU_HUNG', seatIndex, choice: 'ALLOW_DRAW' };
      }

      case 'WAIT_DODGE': {
        if (active.allowBagua && !active.baguaTried) {
          return { type: 'RESPOND_DODGE', seatIndex, cardId: null, useBagua: true };
        }
        if (
          self.heroId === 'cao_cao' &&
          self.identity === 'LORD' &&
          !active.huJiaTried &&
          hasAliveAllyOfFaction(view, seatIndex, 'WEI')
        ) {
          return { type: 'RESPOND_DODGE', seatIndex, cardId: null, useHuJia: true };
        }
        const dodgeCard = findCardForDodge(self);
        return {
          type: 'RESPOND_DODGE',
          seatIndex,
          cardId: dodgeCard ? dodgeCard.id : null,
        };
      }

      case 'WAIT_AOE_DODGE': {
        if (active.allowBagua && !active.baguaTried) {
          return { type: 'RESPOND_AOE_DODGE', seatIndex, cardId: null, useBagua: true };
        }
        if (
          self.heroId === 'cao_cao' &&
          self.identity === 'LORD' &&
          !active.huJiaTried &&
          hasAliveAllyOfFaction(view, seatIndex, 'WEI')
        ) {
          return { type: 'RESPOND_AOE_DODGE', seatIndex, cardId: null, useHuJia: true };
        }
        const dodgeCard = findCardForDodge(self);
        return {
          type: 'RESPOND_AOE_DODGE',
          seatIndex,
          cardId: dodgeCard ? dodgeCard.id : null,
        };
      }

      case 'ASK_QUAN_THACH_PHU': {
        const target = getPlayer(view, active.targetSeat);
        const discardables = collectAnyOwnedCards(self, self.equipments.weapon?.id);
        if (
          discardables.length >= 2 &&
          target &&
          (target.hp <= 1 || hand.length >= 4) &&
          isPreferredEnemy(view, target.seatIndex)
        ) {
          return {
            type: 'RESPOND_QUAN_THACH_PHU',
            seatIndex,
            activate: true,
            discardCardIds: [discardables[0]!.id, discardables[1]!.id],
          };
        }
        return { type: 'RESPOND_QUAN_THACH_PHU', seatIndex, activate: false };
      }

      case 'ASK_THANH_LONG': {
        const followSat = findSingleCardForSat(self);
        if (followSat && isPreferredEnemy(view, active.targetSeat)) {
          return {
            type: 'RESPOND_THANH_LONG',
            seatIndex,
            cardIds: [followSat.id],
          };
        }
        return { type: 'RESPOND_THANH_LONG', seatIndex, cardIds: null };
      }

      case 'ASK_HAN_BANG_KIEM': {
        const target = getPlayer(view, active.targetSeat);
        if (!target || target.hp <= 1) {
          return { type: 'RESPOND_HAN_BANG_KIEM', seatIndex, activate: false };
        }
        const picks: {
          readonly zone: Exclude<TargetCardZone, 'DELAYED'>;
          readonly handIndex?: number;
        }[] = [];
        if (target.equipments.armor) picks.push({ zone: 'ARMOR' });
        if (target.equipments.plusOneHorse && picks.length < 2) {
          picks.push({ zone: 'PLUS_ONE_HORSE' });
        }
        if (target.equipments.weapon && picks.length < 2) {
          picks.push({ zone: 'WEAPON' });
        }
        if (target.equipments.minusOneHorse && picks.length < 2) {
          picks.push({ zone: 'MINUS_ONE_HORSE' });
        }
        let remHand = target.handCount;
        while (picks.length < 2 && remHand > 0) {
          picks.push({ zone: 'HAND', handIndex: 0 });
          remHand -= 1;
        }
        if (picks.length > 0) {
          return {
            type: 'RESPOND_HAN_BANG_KIEM',
            seatIndex,
            activate: true,
            picks,
          };
        }
        return { type: 'RESPOND_HAN_BANG_KIEM', seatIndex, activate: false };
      }

      case 'ASK_KY_LAN_CUNG': {
        const target = getPlayer(view, active.targetSeat);
        if (target?.equipments.plusOneHorse) {
          return {
            type: 'RESPOND_KY_LAN_CUNG',
            seatIndex,
            horseZone: 'PLUS_ONE_HORSE',
          };
        }
        if (target?.equipments.minusOneHorse) {
          return {
            type: 'RESPOND_KY_LAN_CUNG',
            seatIndex,
            horseZone: 'MINUS_ONE_HORSE',
          };
        }
        return { type: 'RESPOND_KY_LAN_CUNG', seatIndex, horseZone: null };
      }

      case 'WAIT_DUEL_SAT': {
        const satCards = findStrikeCardsForResponse(self, true);
        return {
          type: 'RESPOND_DUEL_SAT',
          seatIndex,
          cardIds: satCards,
        };
      }

      case 'WAIT_COLLATERAL_SAT': {
        if (isPreferredEnemy(view, active.targetSeat)) {
          const satCards = findStrikeCardsForResponse(self, true);
          if (satCards) {
            return { type: 'RESPOND_COLLATERAL_SAT', seatIndex, cardIds: satCards };
          }
        }
        return { type: 'RESPOND_COLLATERAL_SAT', seatIndex, cardIds: null };
      }

      case 'WAIT_AOE_SAT': {
        const satCards = findStrikeCardsForResponse(self, true);
        return { type: 'RESPOND_AOE_SAT', seatIndex, cardIds: satCards };
      }

      case 'WAIT_HARVEST_PICK': {
        const sorted = [...view.harvestPool].sort(
          (a, b) => cardScore(b) - cardScore(a),
        );
        const picked = sorted[0];
        if (!picked) {
          throw new Error('EMPTY_HARVEST_POOL_FOR_BOT');
        }
        return {
          type: 'RESPOND_HARVEST_PICK',
          seatIndex,
          cardId: picked.id,
        };
      }

      case 'PICK_TARGET_CARD': {
        const target = getPlayer(view, active.targetSeat);
        if (!target) {
          throw new Error(`MISSING_PICK_TARGET:${active.targetSeat}`);
        }
        const pick = pickBestTargetZone(target);
        return {
          type: 'RESPOND_PICK_TARGET_CARD',
          seatIndex,
          zone: pick.zone,
          ...(pick.handIndex !== undefined ? { handIndex: pick.handIndex } : {}),
          ...(pick.delayedCardId !== undefined
            ? { delayedCardId: pick.delayedCardId }
            : {}),
        };
      }

      case 'WAIT_PEACH_RESCUE': {
        const shouldRescue = isAllySeat(view, active.targetSeat);
        if (shouldRescue) {
          const peach = findCardForPeach(view, self);
          if (peach) {
            return { type: 'RESPOND_PEACH_RESCUE', seatIndex, cardId: peach.id };
          }
        }
        return { type: 'RESPOND_PEACH_RESCUE', seatIndex, cardId: null };
      }

      case 'WAIT_GUAN_XING': {
        const cards = active.guanXingCards ?? [];
        const sorted = [...cards].sort((a, b) => cardScore(b) - cardScore(a));
        const half = Math.ceil(sorted.length / 2);
        return {
          type: 'RESPOND_GUAN_XING',
          seatIndex,
          topCardIds: sorted.slice(0, half).map((c) => c.id),
          bottomCardIds: sorted.slice(half).map((c) => c.id),
        };
      }

      case 'ASK_LUO_SHEN':
        return { type: 'RESPOND_LUO_SHEN', seatIndex, activate: true };

      case 'WAIT_TU_XI': {
        const stealable = rankEnemyTargets(
          view,
          getAliveOpponents(view).filter((p) => p.handCount > 0),
        );
        return {
          type: 'RESPOND_TU_XI',
          seatIndex,
          targetSeats: stealable.slice(0, 2).map((p) => p.seatIndex),
        };
      }

      case 'ASK_LUO_YI': {
        const hasOffense =
          hand.some((c) => c.cardKey === 'sat' || c.cardKey === 'quyet_dau') &&
          getAliveOpponents(view).some((p) => isInAttackRange(view, seatIndex, p.seatIndex));
        return { type: 'RESPOND_LUO_YI', seatIndex, activate: hasOffense };
      }

      case 'ASK_KE_JI':
        return { type: 'RESPOND_KE_JI', seatIndex, activate: true };

      case 'ASK_TIE_QI':
        return { type: 'RESPOND_TIE_QI', seatIndex, activate: true };

      case 'ASK_LIU_LI': {
        const discardables = collectAnyOwnedCards(self);
        const candidates = rankEnemyTargets(
          view,
          view.players.filter(
            (p) =>
              p.alive &&
              p.seatIndex !== seatIndex &&
              p.seatIndex !== active.sourceSeat &&
              canTargetWithBasicCard(p, 'sat') &&
              isInAttackRange(view, seatIndex, p.seatIndex),
          ),
        );
        if (discardables.length > 0 && candidates.length > 0) {
          return {
            type: 'RESPOND_LIU_LI',
            seatIndex,
            activate: true,
            discardCardId: discardables[0]!.id,
            newTargetSeat: candidates[0]!.seatIndex,
          };
        }
        return { type: 'RESPOND_LIU_LI', seatIndex, activate: false };
      }

      case 'WAIT_GUI_CAI': {
        const jCard = active.judgeCard;
        if (hand.length > 0 && jCard) {
          if (
            active.judgePurpose === 'THIEM_DIEN' &&
            active.sourceSeat === seatIndex &&
            jCard.suit === 'SPADE' &&
            jCard.rank >= 2 &&
            jCard.rank <= 9
          ) {
            const safe = hand.find(
              (c) => !(c.suit === 'SPADE' && c.rank >= 2 && c.rank <= 9),
            );
            if (safe) {
              return { type: 'RESPOND_GUI_CAI', seatIndex, cardId: safe.id };
            }
          }
          if (
            active.judgePurpose === 'LAC_BAT_TU_THUC' &&
            active.sourceSeat === seatIndex &&
            jCard.suit !== 'HEART'
          ) {
            const heart = hand.find((c) => c.suit === 'HEART');
            if (heart) {
              return { type: 'RESPOND_GUI_CAI', seatIndex, cardId: heart.id };
            }
          }
        }
        return { type: 'RESPOND_GUI_CAI', seatIndex, cardId: null };
      }

      case 'ASK_TIAN_DO':
        return { type: 'RESPOND_TIAN_DO', seatIndex, activate: true };

      case 'ASK_JIAN_XIONG':
        return { type: 'RESPOND_JIAN_XIONG', seatIndex, activate: true };

      case 'ASK_FAN_KUI':
        return { type: 'RESPOND_FAN_KUI', seatIndex, activate: true };

      case 'ASK_GANG_LIE':
        return {
          type: 'RESPOND_GANG_LIE',
          seatIndex,
          activate: isPreferredEnemy(view, active.sourceSeat ?? seatIndex),
        };

      case 'WAIT_GANG_LIE_CHOICE': {
        if (hand.length >= 4 || (self.hp <= 1 && hand.length >= 2)) {
          const two = sortCardsLowestFirst(hand).slice(0, 2);
          return {
            type: 'RESPOND_GANG_LIE_CHOICE',
            seatIndex,
            choice: 'DISCARD_TWO',
            discardCardIds: [two[0]!.id, two[1]!.id],
          };
        }
        return {
          type: 'RESPOND_GANG_LIE_CHOICE',
          seatIndex,
          choice: 'TAKE_DAMAGE',
        };
      }

      case 'WAIT_YI_JI': {
        const cards = active.yiJiCards ?? [];
        return {
          type: 'RESPOND_YI_JI',
          seatIndex,
          distributions: [
            { targetSeat: seatIndex, cardIds: cards.map((c) => c.id) },
          ],
        };
      }

      case 'WAIT_FAN_JIAN_GUESS':
        return { type: 'RESPOND_FAN_JIAN_GUESS', seatIndex, suit: 'SPADE' };

      case 'WAIT_JI_JIANG': {
        if (isAllySeat(view, active.sourceSeat ?? seatIndex)) {
          const sat = findSingleCardForSat(self);
          if (sat) {
            return { type: 'RESPOND_JI_JIANG', seatIndex, cardIds: [sat.id] };
          }
        }
        return { type: 'RESPOND_JI_JIANG', seatIndex, cardIds: null };
      }

      case 'WAIT_HU_JIA': {
        if (isAllySeat(view, active.sourceSeat ?? seatIndex)) {
          const dodge = findCardForDodge(self);
          if (dodge) {
            return { type: 'RESPOND_HU_JIA', seatIndex, cardId: dodge.id };
          }
        }
        return { type: 'RESPOND_HU_JIA', seatIndex, cardId: null };
      }

      default:
        throw new Error(`UNHANDLED_INTERRUPT_FOR_BOT:${active.kind}`);
    }
  }

  if (view.turnPhase === 'DISCARD') {
    const limit = Math.max(0, self.hp);
    const excess = Math.max(0, hand.length - limit);
    const toDiscard = sortCardsLowestFirst(hand)
      .slice(0, excess)
      .map((c) => c.id);
    return {
      type: 'DISCARD_CARDS',
      seatIndex,
      cardIds: toDiscard,
    };
  }

  if (view.turnPhase === 'PLAY') {
    return decidePlayPhaseAction(view);
  }

  throw new Error(`BOT_CALLED_IN_NON_INTERACTIVE_PHASE:${view.turnPhase}`);
}

export function getBotKeepColorHint(card: CardInstance): string {
  return getCardColor([card]);
}
