import type { HeroId, PlayerEquipments } from '../types/game.js';
import { getHeroSkillHandler } from '../heroes/registry.js';

export interface DistancePlayerLike {
  readonly seatIndex: number;
  readonly alive: boolean;
  readonly heroId: HeroId | null;
  readonly equipments: PlayerEquipments;
}

export interface DistanceStateLike {
  readonly enabledPacks?: readonly string[];
  readonly players: readonly DistancePlayerLike[];
}

/** Trả về danh sách người chơi còn sống sắp xếp theo thứ tự ghế tăng dần. */
export function getAlivePlayers<T extends DistancePlayerLike>(
  state: { readonly players: readonly T[] },
): T[] {
  return [...state.players]
    .filter((player) => player.alive)
    .sort((a, b) => a.seatIndex - b.seatIndex);
}

function findPlayerBySeat<T extends DistancePlayerLike>(
  state: { readonly players: readonly T[] },
  seatIndex: number,
): T | undefined {
  return state.players.find((player) => player.seatIndex === seatIndex);
}

/** Tính khoảng cách ghế thuần túy (chỉ đếm người còn sống theo vòng tròn ngắn nhất). */
export function calculateSeatDistance(
  state: DistanceStateLike,
  fromSeat: number,
  toSeat: number,
): number {
  const alivePlayers = getAlivePlayers(state);
  const fromIdx = alivePlayers.findIndex((p) => p.seatIndex === fromSeat);
  const toIdx = alivePlayers.findIndex((p) => p.seatIndex === toSeat);
  if (fromIdx === -1 || toIdx === -1) {
    return Number.POSITIVE_INFINITY;
  }
  if (fromSeat === toSeat) {
    return 0;
  }

  const totalAlive = alivePlayers.length;
  const clockwise = (toIdx - fromIdx + totalAlive) % totalAlive;
  const counterClockwise = (fromIdx - toIdx + totalAlive) % totalAlive;
  return Math.min(clockwise, counterClockwise);
}

/**
 * Tính khoảng cách thực tế từ `fromSeat` tới `toSeat`:
 * - Khoảng cách ghế (bỏ qua người đã tử vong).
 * - Cộng 1 nếu mục tiêu có ngựa phòng thủ (+1).
 * - Trừ 1 nếu người đánh có ngựa tấn công (-1).
 * - Trừ 1 nếu người đánh là Mã Siêu (kỹ năng Mã Thuật).
 * - Khoảng cách giữa 2 người khác nhau tối thiểu luôn là 1.
 */
export function calculateDistance(
  state: DistanceStateLike,
  fromSeat: number,
  toSeat: number,
): number {
  const base = calculateSeatDistance(state, fromSeat, toSeat);
  if (!Number.isFinite(base)) {
    return Number.POSITIVE_INFINITY;
  }
  if (fromSeat === toSeat) {
    return 0;
  }

  const fromPlayer = findPlayerBySeat(state, fromSeat);
  const toPlayer = findPlayerBySeat(state, toSeat);
  if (!fromPlayer || !toPlayer || !fromPlayer.alive || !toPlayer.alive) {
    return Number.POSITIVE_INFINITY;
  }

  let modifier = 0;
  if (toPlayer.equipments.plusOneHorse !== null) {
    modifier += 1;
  }
  if (fromPlayer.equipments.minusOneHorse !== null) {
    modifier -= 1;
  }
  const skillModifier = getHeroSkillHandler(fromPlayer.heroId, state)?.distanceModifier?.(
    fromPlayer as never,
    toPlayer as never,
  );
  if (skillModifier !== undefined) {
    modifier += skillModifier;
  } else if (fromPlayer.heroId === 'ma_chao') {
    modifier -= 1;
  }

  return Math.max(1, base + modifier);
}

/** Tầm đánh vũ khí hiện tại của người chơi (mặc định 1 nếu không cầm vũ khí). */
export function getAttackRange(player: Pick<DistancePlayerLike, 'equipments'>): number {
  return player.equipments.weapon?.attackRange ?? 1;
}

/** Kiểm tra `toSeat` có nằm trong tầm đánh Sát của `fromSeat` hay không. */
export function isInAttackRange(
  state: DistanceStateLike,
  fromSeat: number,
  toSeat: number,
): boolean {
  if (fromSeat === toSeat) {
    return false;
  }
  const fromPlayer = findPlayerBySeat(state, fromSeat);
  const toPlayer = findPlayerBySeat(state, toSeat);
  if (!fromPlayer || !toPlayer || !fromPlayer.alive || !toPlayer.alive) {
    return false;
  }
  const distance = calculateDistance(state, fromSeat, toSeat);
  return distance <= getAttackRange(fromPlayer);
}

/** Trả về danh sách ghế mục tiêu hợp lệ nằm trong tầm đánh của `fromSeat`. */
export function getValidAttackTargets(
  state: DistanceStateLike,
  fromSeat: number,
): number[] {
  return getAlivePlayers(state)
    .map((player) => player.seatIndex)
    .filter((seat) => isInAttackRange(state, fromSeat, seat));
}

/**
 * Kiểm tra khoảng cách cho lá Thuận Thủ Khiên Dương (khoảng cách <= 1).
 * Hoàng Nguyệt Anh (Kỳ Tài) được bỏ qua giới hạn khoảng cách Cẩm nang.
 */
export function canReachForSnatch(
  state: DistanceStateLike,
  fromSeat: number,
  toSeat: number,
): boolean {
  if (fromSeat === toSeat) {
    return false;
  }
  const fromPlayer = findPlayerBySeat(state, fromSeat);
  const toPlayer = findPlayerBySeat(state, toSeat);
  if (!fromPlayer || !toPlayer || !fromPlayer.alive || !toPlayer.alive) {
    return false;
  }
  if (
    getHeroSkillHandler(fromPlayer.heroId, state)?.ignoreScrollDistance ||
    fromPlayer.heroId === 'huang_yue_ying'
  ) {
    return true;
  }
  return calculateDistance(state, fromSeat, toSeat) <= 1;
}

/** Trả về danh sách ghế nằm trong tầm sử dụng Thuận Thủ Khiên Dương. */
export function getValidSnatchTargets(
  state: DistanceStateLike,
  fromSeat: number,
): number[] {
  return getAlivePlayers(state)
    .map((player) => player.seatIndex)
    .filter((seat) => canReachForSnatch(state, fromSeat, seat));
}

/** Kiểm tra cặp (người cầm vũ khí, nạn nhân) có hợp lệ cho Tá Đao Sát Nhân hay không. */
export function canUseCollateralMurder(
  state: DistanceStateLike,
  casterSeat: number,
  attackerSeat: number,
  victimSeat: number,
): boolean {
  if (casterSeat === attackerSeat) {
    return false;
  }
  const attacker = findPlayerBySeat(state, attackerSeat);
  if (!attacker || !attacker.alive || attacker.equipments.weapon === null) {
    return false;
  }
  const victim = findPlayerBySeat(state, victimSeat);
  if (!victim || !victim.alive) {
    return false;
  }
  // Gia Cát Lượng Không Thành không thể làm mục tiêu Sát của Tá Đao Sát Nhân
  if (
    victim.heroId === 'zhuge_liang' &&
    'handCards' in victim &&
    Array.isArray((victim as { readonly handCards?: readonly unknown[] }).handCards) &&
    (victim as { readonly handCards: readonly unknown[] }).handCards.length === 0
  ) {
    return false;
  }
  if (
    victim.heroId === 'zhuge_liang' &&
    'handCount' in victim &&
    typeof (victim as { readonly handCount?: number }).handCount === 'number' &&
    (victim as { readonly handCount: number }).handCount === 0
  ) {
    return false;
  }
  return isInAttackRange(state, attackerSeat, victimSeat);
}
