import type {
  CardInstance,
  InterruptFrame,
  PlayerViewState,
  PublicInterruptView,
} from '../types/game.js';

export type GenericPrimitiveKind =
  | 'PROMPT_CONFIRM'
  | 'PROMPT_SELECT_CARDS'
  | 'PROMPT_SELECT_TARGETS'
  | 'PROMPT_REORDER_CARDS'
  | 'PROMPT_CHOOSE_OPTION'
  | 'PROMPT_PICK_FROM_POOL'
  | 'PROMPT_DISTRIBUTE_CARDS'
  | 'PROMPT_RESPOND_CARD';

export interface GenericInteractionPrimitive {
  readonly kind: GenericPrimitiveKind;
  readonly sourceInterruptKind: InterruptFrame['kind'];
  readonly actorSeats: readonly number[];
  readonly allowSkip: boolean;
  readonly minCards?: number;
  readonly maxCards?: number;
  readonly minTargets?: number;
  readonly maxTargets?: number;
  readonly options?: readonly string[];
  readonly poolCards?: readonly CardInstance[];
  readonly damageCards?: readonly CardInstance[];
}

function resolveActorSeats(interrupt: PublicInterruptView): number[] {
  if (interrupt.kind === 'WAIT_NULLIFICATION') {
    return interrupt.canRespondNullification ? [] : [];
  }
  if (
    interrupt.responderSeat !== undefined &&
    (interrupt.kind === 'WAIT_PEACH_RESCUE' ||
      interrupt.kind === 'WAIT_JI_JIANG' ||
      interrupt.kind === 'WAIT_HU_JIA')
  ) {
    return [interrupt.responderSeat];
  }
  if (interrupt.kind === 'ASK_TU_HUNG' || interrupt.kind === 'ASK_LIU_LI') {
    return [interrupt.targetSeat];
  }
  return [interrupt.targetSeat];
}

/**
 * Quy chuẩn 31 loại InterruptFrame về 8 Generic Interaction Primitives thống nhất
 * để UI & DLC mới không phải viết thêm component phản ứng riêng cho từng lá/tướng.
 */
export function classifyInterruptPrimitive(
  view: PlayerViewState,
): GenericInteractionPrimitive | null {
  const interrupt = view.activeInterrupt;
  if (!interrupt) {
    return null;
  }

  const actorSeats =
    interrupt.kind === 'WAIT_NULLIFICATION'
      ? interrupt.canRespondNullification
        ? [view.viewerSeatIndex]
        : []
      : resolveActorSeats(interrupt);

  switch (interrupt.kind) {
    case 'ASK_QUAN_THACH_PHU':
      return {
        kind: 'PROMPT_SELECT_CARDS',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        minCards: 2,
        maxCards: 2,
        options: ['ACTIVATE_DISCARD_TWO', 'SKIP'],
      };

    case 'ASK_LUO_SHEN':
    case 'ASK_LUO_YI':
    case 'ASK_KE_JI':
    case 'ASK_TIE_QI':
    case 'ASK_TIAN_DO':
    case 'ASK_FAN_KUI':
    case 'ASK_GANG_LIE':
      return {
        kind: 'PROMPT_CONFIRM',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        options: ['CONFIRM', 'SKIP'],
      };

    case 'ASK_JIAN_XIONG':
      return {
        kind: 'PROMPT_CONFIRM',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        options: ['CONFIRM', 'SKIP'],
        ...(interrupt.damageCards ? { damageCards: interrupt.damageCards } : {}),
      };

    case 'WAIT_TU_XI':
      return {
        kind: 'PROMPT_SELECT_TARGETS',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        minTargets: 0,
        maxTargets: 2,
      };

    case 'ASK_LIU_LI':
      return {
        kind: 'PROMPT_SELECT_TARGETS',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        minCards: 1,
        maxCards: 1,
        minTargets: 1,
        maxTargets: 1,
      };

    case 'WAIT_GUAN_XING':
      return {
        kind: 'PROMPT_REORDER_CARDS',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        ...(interrupt.guanXingCards ? { poolCards: interrupt.guanXingCards } : {}),
      };

    case 'ASK_TU_HUNG':
      return {
        kind: 'PROMPT_CHOOSE_OPTION',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        minCards: 0,
        maxCards: 1,
        options: ['DISCARD_HAND', 'ALLOW_DRAW'],
      };

    case 'ASK_KY_LAN_CUNG':
      return {
        kind: 'PROMPT_CHOOSE_OPTION',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        options: ['PLUS_ONE_HORSE', 'MINUS_ONE_HORSE', 'SKIP'],
      };

    case 'WAIT_GANG_LIE_CHOICE':
      return {
        kind: 'PROMPT_CHOOSE_OPTION',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        minCards: 2,
        maxCards: 2,
        options: ['DISCARD_TWO', 'TAKE_DAMAGE'],
      };

    case 'WAIT_FAN_JIAN_GUESS':
      return {
        kind: 'PROMPT_CHOOSE_OPTION',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        options: ['SPADE', 'HEART', 'CLUB', 'DIAMOND'],
      };

    case 'WAIT_HARVEST_PICK':
      return {
        kind: 'PROMPT_PICK_FROM_POOL',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        minCards: 1,
        maxCards: 1,
        poolCards: view.harvestPool,
      };

    case 'ASK_HAN_BANG_KIEM':
      return {
        kind: 'PROMPT_PICK_FROM_POOL',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        minCards: 0,
        maxCards: interrupt.remainingDiscards ?? 2,
      };

    case 'PICK_TARGET_CARD':
      return {
        kind:
          interrupt.handPick === 'PREPARE'
            ? 'PROMPT_CONFIRM'
            : 'PROMPT_PICK_FROM_POOL',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        minCards: 1,
        maxCards: 1,
      };

    case 'WAIT_YI_JI':
      return {
        kind: 'PROMPT_DISTRIBUTE_CARDS',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: false,
        ...(interrupt.yiJiCards ? { poolCards: interrupt.yiJiCards } : {}),
      };

    case 'WAIT_NULLIFICATION':
    case 'WAIT_DODGE':
    case 'ASK_THANH_LONG':
    case 'WAIT_DUEL_SAT':
    case 'WAIT_COLLATERAL_SAT':
    case 'WAIT_AOE_SAT':
    case 'WAIT_AOE_DODGE':
    case 'WAIT_PEACH_RESCUE':
    case 'WAIT_GUI_CAI':
    case 'WAIT_JI_JIANG':
    case 'WAIT_HU_JIA':
      return {
        kind: 'PROMPT_RESPOND_CARD',
        sourceInterruptKind: interrupt.kind,
        actorSeats,
        allowSkip: true,
        minCards: 0,
        maxCards: interrupt.requiredCount ?? 1,
      };
  }
}
