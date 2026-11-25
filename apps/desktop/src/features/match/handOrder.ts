import type { CardInstance } from '@lkdf/shared';

const orderByMatch = new Map<string, readonly string[]>();

/** Deduplicate card IDs while preserving first-seen order. */
export function normalizeHandOrderIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/** Move a card from `fromIndex` to `toIndex` without dropping or duplicating IDs. */
export function moveHandCardByIndex(
  ids: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  const normalized = normalizeHandOrderIds(ids);
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    fromIndex >= normalized.length
  ) {
    return normalized;
  }
  const clampedTarget = Math.max(0, Math.min(normalized.length - 1, toIndex));
  if (fromIndex === clampedTarget) return normalized;
  const next = [...normalized];
  const [moved] = next.splice(fromIndex, 1);
  if (moved !== undefined) {
    next.splice(clampedTarget, 0, moved);
  }
  return next;
}

/** Move `fromId` to the position of `toId`, ignoring missing or identical IDs. */
export function moveHandCardById(
  ids: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  const normalized = normalizeHandOrderIds(ids);
  if (fromId === toId) return normalized;
  const fromIndex = normalized.indexOf(fromId);
  const toIndex = normalized.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return normalized;
  return moveHandCardByIndex(normalized, fromIndex, toIndex);
}

/** Move `cardId` one slot left (-1) or right (+1), clamped to bounds. */
export function moveHandCardByStep(
  ids: readonly string[],
  cardId: string,
  delta: -1 | 1,
): string[] {
  const normalized = normalizeHandOrderIds(ids);
  const index = normalized.indexOf(cardId);
  if (index < 0) return normalized;
  return moveHandCardByIndex(normalized, index, index + delta);
}

export function orderHand(matchId: string, cards: readonly CardInstance[]): readonly CardInstance[] {
  if (cards.length <= 1) return cards;
  const order = orderByMatch.get(matchId);
  if (!order || order.length === 0) return cards;
  const positions = new Map<string, number>();
  for (const id of order) {
    if (!positions.has(id)) {
      positions.set(id, positions.size);
    }
  }
  return [...cards].sort((a, b) => {
    const posA = positions.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const posB = positions.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });
}

export function rememberHandOrder(matchId: string, ids: readonly string[]) {
  const normalized = normalizeHandOrderIds(ids);
  if (normalized.length === 0) {
    orderByMatch.delete(matchId);
    return;
  }
  orderByMatch.set(matchId, normalized);
}

export function clearHandOrder(matchId: string) {
  orderByMatch.delete(matchId);
}
