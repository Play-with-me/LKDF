import type {
  CardInstance,
  MasterGameState,
  PlayerCombatState,
  TargetCardZone,
} from '../types/game.js';
import { shuffleArray } from './setup.js';

export function getPlayerBySeat(
  state: MasterGameState,
  seatIndex: number,
): PlayerCombatState {
  const found = state.players.find((p) => p.seatIndex === seatIndex);
  if (!found) {
    throw new Error(`SEAT_NOT_FOUND:${seatIndex}`);
  }
  return found;
}

export function updatePlayer(
  state: MasterGameState,
  seatIndex: number,
  updater: (player: PlayerCombatState) => PlayerCombatState,
): MasterGameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.seatIndex === seatIndex ? updater(p) : p,
    ),
  };
}

/** Danh sách ghế còn sống theo chiều kim đồng hồ bắt đầu từ `startSeat`. */
export function getClockwiseAliveSeats(
  state: MasterGameState,
  startSeat: number,
  includeStart: boolean,
): number[] {
  const ordered = [...state.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const total = ordered.length;
  const startPos = ordered.findIndex((p) => p.seatIndex === startSeat);
  if (startPos === -1) {
    return [];
  }

  const result: number[] = [];
  for (let offset = 0; offset < total; offset += 1) {
    if (offset === 0 && !includeStart) {
      continue;
    }
    const candidate = ordered[(startPos + offset) % total];
    if (candidate && candidate.alive) {
      result.push(candidate.seatIndex);
    }
  }
  return result;
}

/** Rút `count` lá từ đỉnh chồng bài rút; tự động xáo trộn chồng bài bỏ khi hết bài rút. */
export function drawFromPile(
  state: MasterGameState,
  count: number,
  rng: () => number = Math.random,
): { readonly state: MasterGameState; readonly drawn: CardInstance[] } {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const drawn: CardInstance[] = [];
  let logMessages = state.actionLog;

  for (let i = 0; i < count; i += 1) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        break;
      }
      drawPile = shuffleArray(discardPile, rng);
      discardPile = [];
      logMessages = [
        ...logMessages,
        'Chồng bài rút đã hết, hệ thống tự động trộn chồng bài bỏ thành chồng bài rút mới.',
      ];
    }
    const topCard = drawPile.shift();
    if (topCard) {
      drawn.push(topCard);
    }
  }

  return {
    state: {
      ...state,
      drawPile,
      discardPile,
      actionLog: logMessages,
    },
    drawn,
  };
}

export function dealCardsToSeat(
  state: MasterGameState,
  seatIndex: number,
  count: number,
  rng: () => number = Math.random,
): { readonly state: MasterGameState; readonly dealt: CardInstance[] } {
  const { state: afterDraw, drawn } = drawFromPile(state, count, rng);
  if (drawn.length === 0) {
    return { state: afterDraw, dealt: [] };
  }
  const nextState = updatePlayer(afterDraw, seatIndex, (player) => ({
    ...player,
    handCards: [...player.handCards, ...drawn],
  }));
  return { state: nextState, dealt: drawn };
}

export function appendToDiscardPile(
  state: MasterGameState,
  cards: readonly CardInstance[],
): MasterGameState {
  if (cards.length === 0) {
    return state;
  }
  return {
    ...state,
    discardPile: [...state.discardPile, ...cards],
  };
}

export function removeCardsFromHand(
  player: PlayerCombatState,
  cardIds: readonly string[],
): { readonly nextPlayer: PlayerCombatState; readonly removed: CardInstance[] } {
  const remaining = [...player.handCards];
  const removed: CardInstance[] = [];

  for (const id of cardIds) {
    const idx = remaining.findIndex((card) => card.id === id);
    if (idx === -1) {
      throw new Error(`CARD_NOT_IN_HAND:${id}`);
    }
    const [taken] = remaining.splice(idx, 1);
    if (taken) {
      removed.push(taken);
    }
  }

  return {
    nextPlayer: {
      ...player,
      handCards: remaining,
    },
    removed,
  };
}

export function hasAnyCardInHandOrEquip(player: PlayerCombatState): boolean {
  return (
    player.handCards.length > 0 ||
    player.equipments.weapon !== null ||
    player.equipments.armor !== null ||
    player.equipments.plusOneHorse !== null ||
    player.equipments.minusOneHorse !== null
  );
}

export function hasAnyCardAnywhere(player: PlayerCombatState): boolean {
  return hasAnyCardInHandOrEquip(player) || player.delayedScrolls.length > 0;
}

export function getAvailableTargetZones(
  player: PlayerCombatState,
  includeDelayed: boolean,
): TargetCardZone[] {
  const zones: TargetCardZone[] = [];
  if (player.handCards.length > 0) zones.push('HAND');
  if (player.equipments.weapon !== null) zones.push('WEAPON');
  if (player.equipments.armor !== null) zones.push('ARMOR');
  if (player.equipments.plusOneHorse !== null) zones.push('PLUS_ONE_HORSE');
  if (player.equipments.minusOneHorse !== null) zones.push('MINUS_ONE_HORSE');
  if (includeDelayed && player.delayedScrolls.length > 0) zones.push('DELAYED');
  return zones;
}

export function removeCardFromTargetZone(
  player: PlayerCombatState,
  zone: TargetCardZone,
  rng: () => number = Math.random,
  handIndex?: number,
  delayedCardId?: string,
): { readonly nextPlayer: PlayerCombatState; readonly removed: CardInstance } {
  switch (zone) {
    case 'HAND': {
      if (player.handCards.length === 0) {
        throw new Error('TARGET_HAND_EMPTY');
      }
      const idx =
        handIndex !== undefined &&
        handIndex >= 0 &&
        handIndex < player.handCards.length
          ? handIndex
          : Math.floor(rng() * player.handCards.length);
      const nextHand = [...player.handCards];
      const [taken] = nextHand.splice(idx, 1);
      if (!taken) {
        throw new Error('TARGET_HAND_EMPTY');
      }
      return {
        nextPlayer: { ...player, handCards: nextHand },
        removed: taken,
      };
    }
    case 'WEAPON': {
      if (!player.equipments.weapon) throw new Error('NO_WEAPON_EQUIPPED');
      const taken = player.equipments.weapon;
      return {
        nextPlayer: {
          ...player,
          equipments: { ...player.equipments, weapon: null },
        },
        removed: taken,
      };
    }
    case 'ARMOR': {
      if (!player.equipments.armor) throw new Error('NO_ARMOR_EQUIPPED');
      const taken = player.equipments.armor;
      return {
        nextPlayer: {
          ...player,
          equipments: { ...player.equipments, armor: null },
        },
        removed: taken,
      };
    }
    case 'PLUS_ONE_HORSE': {
      if (!player.equipments.plusOneHorse) throw new Error('NO_PLUS_HORSE_EQUIPPED');
      const taken = player.equipments.plusOneHorse;
      return {
        nextPlayer: {
          ...player,
          equipments: { ...player.equipments, plusOneHorse: null },
        },
        removed: taken,
      };
    }
    case 'MINUS_ONE_HORSE': {
      if (!player.equipments.minusOneHorse) throw new Error('NO_MINUS_HORSE_EQUIPPED');
      const taken = player.equipments.minusOneHorse;
      return {
        nextPlayer: {
          ...player,
          equipments: { ...player.equipments, minusOneHorse: null },
        },
        removed: taken,
      };
    }
    case 'DELAYED': {
      if (player.delayedScrolls.length === 0) {
        throw new Error('NO_DELAYED_SCROLL');
      }
      const idx = delayedCardId
        ? player.delayedScrolls.findIndex((c) => c.id === delayedCardId)
        : player.delayedScrolls.length - 1;
      if (idx === -1) {
        throw new Error('DELAYED_SCROLL_NOT_FOUND');
      }
      const nextDelayed = [...player.delayedScrolls];
      const [taken] = nextDelayed.splice(idx, 1);
      if (!taken) {
        throw new Error('NO_DELAYED_SCROLL');
      }
      return {
        nextPlayer: { ...player, delayedScrolls: nextDelayed },
        removed: taken,
      };
    }
  }
}

export function removeAnyCardFromPlayer(
  player: PlayerCombatState,
  cardId: string,
): { readonly nextPlayer: PlayerCombatState; readonly removed: CardInstance } {
  if (player.handCards.some((c) => c.id === cardId)) {
    const { nextPlayer, removed } = removeCardsFromHand(player, [cardId]);
    return { nextPlayer, removed: removed[0]! };
  }
  if (player.equipments.weapon?.id === cardId) {
    return removeCardFromTargetZone(player, 'WEAPON');
  }
  if (player.equipments.armor?.id === cardId) {
    return removeCardFromTargetZone(player, 'ARMOR');
  }
  if (player.equipments.plusOneHorse?.id === cardId) {
    return removeCardFromTargetZone(player, 'PLUS_ONE_HORSE');
  }
  if (player.equipments.minusOneHorse?.id === cardId) {
    return removeCardFromTargetZone(player, 'MINUS_ONE_HORSE');
  }
  throw new Error(`CARD_NOT_OWNED:${cardId}`);
}
