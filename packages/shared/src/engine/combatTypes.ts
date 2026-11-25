import type { CardInstance, Suit, TargetCardZone } from '../types/game.js';

export type PlayPhaseSkillId =
  | 'ren_de'
  | 'ji_jiang'
  | 'zhi_heng'
  | 'ku_rou'
  | 'fan_jian'
  | 'jie_yin'
  | 'qing_nang'
  | 'li_jian';

export type VirtualCardKey =
  | 'sat'
  | 'thiem'
  | 'dao'
  | 'qua_ha_sai_cau'
  | 'lac_bat_tu_thuc';

export type GameAction =
  | { readonly type: 'DRAW_CARDS'; readonly seatIndex: number; readonly extra?: boolean }
  | {
      readonly type: 'PLAY_CARD';
      readonly seatIndex: number;
      readonly cardIds: readonly string[];
      readonly targetSeats?: readonly number[];
      readonly secondarySeat?: number;
      readonly asCardKey?: 'sat' | 'qua_ha_sai_cau' | 'lac_bat_tu_thuc';
    }
  | {
      readonly type: 'ACTIVATE_HERO_SKILL';
      readonly seatIndex: number;
      readonly skillId: PlayPhaseSkillId;
      readonly cardIds?: readonly string[];
      readonly targetSeats?: readonly number[];
    }
  | {
      readonly type: 'END_PLAY_PHASE';
      readonly seatIndex: number;
    }
  | {
      readonly type: 'DISCARD_CARDS';
      readonly seatIndex: number;
      readonly cardIds: readonly string[];
    }
  | {
      readonly type: 'SET_AUTO_SKIP_NULLIFICATION';
      readonly seatIndex: number;
      readonly enabled: boolean;
    }
  | {
      readonly type: 'RESPOND_NULLIFICATION';
      readonly seatIndex: number;
      readonly cardId: string | null;
    }
  | {
      readonly type: 'RESOLVE_SIMULATED_NULLIFICATION';
    }
  | {
      readonly type: 'RESPOND_TU_HUNG';
      readonly seatIndex: number;
      readonly choice: 'DISCARD_HAND' | 'ALLOW_DRAW';
      readonly discardCardId?: string;
    }
  | {
      readonly type: 'RESPOND_DODGE';
      readonly seatIndex: number;
      readonly cardId: string | null;
      readonly useBagua?: boolean;
      readonly useHuJia?: boolean;
    }
  | {
      readonly type: 'RESPOND_QUAN_THACH_PHU';
      readonly seatIndex: number;
      readonly activate: boolean;
      readonly discardCardIds?: readonly [string, string];
    }
  | {
      readonly type: 'RESPOND_THANH_LONG';
      readonly seatIndex: number;
      readonly cardIds: readonly string[] | null;
    }
  | {
      readonly type: 'RESPOND_HAN_BANG_KIEM';
      readonly seatIndex: number;
      readonly activate: boolean;
      readonly picks?: readonly {
        readonly zone: Exclude<TargetCardZone, 'DELAYED'>;
        readonly handIndex?: number;
      }[];
    }
  | {
      readonly type: 'RESPOND_KY_LAN_CUNG';
      readonly seatIndex: number;
      readonly horseZone: 'PLUS_ONE_HORSE' | 'MINUS_ONE_HORSE' | null;
    }
  | {
      readonly type: 'RESPOND_DUEL_SAT';
      readonly seatIndex: number;
      readonly cardIds: readonly string[] | null;
      readonly useJiJiang?: boolean;
    }
  | {
      readonly type: 'RESPOND_COLLATERAL_SAT';
      readonly seatIndex: number;
      readonly cardIds: readonly string[] | null;
      readonly useJiJiang?: boolean;
    }
  | {
      readonly type: 'RESPOND_AOE_SAT';
      readonly seatIndex: number;
      readonly cardIds: readonly string[] | null;
      readonly useJiJiang?: boolean;
    }
  | {
      readonly type: 'RESPOND_AOE_DODGE';
      readonly seatIndex: number;
      readonly cardId: string | null;
      readonly useBagua?: boolean;
      readonly useHuJia?: boolean;
    }
  | {
      readonly type: 'RESPOND_HARVEST_PICK';
      readonly seatIndex: number;
      readonly cardId: string;
    }
  | {
      readonly type: 'CONFIRM_STEAL_HAND';
      readonly seatIndex: number;
      readonly orderedCardIds?: readonly string[];
    }
  | {
      readonly type: 'RESPOND_PICK_TARGET_CARD';
      readonly seatIndex: number;
      readonly zone: TargetCardZone;
      readonly handIndex?: number;
      readonly delayedCardId?: string;
    }
  | {
      readonly type: 'RESPOND_PEACH_RESCUE';
      readonly seatIndex: number;
      readonly cardId: string | null;
    }
  | {
      readonly type: 'RESPOND_GUAN_XING';
      readonly seatIndex: number;
      readonly topCardIds: readonly string[];
      readonly bottomCardIds: readonly string[];
    }
  | {
      readonly type: 'RESPOND_LUO_SHEN';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_TU_XI';
      readonly seatIndex: number;
      readonly targetSeats: readonly number[];
    }
  | {
      readonly type: 'RESPOND_LUO_YI';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_KE_JI';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_TIE_QI';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_LIU_LI';
      readonly seatIndex: number;
      readonly activate: boolean;
      readonly discardCardId?: string;
      readonly newTargetSeat?: number;
    }
  | {
      readonly type: 'RESPOND_GUI_CAI';
      readonly seatIndex: number;
      readonly cardId: string | null;
    }
  | {
      readonly type: 'RESPOND_TIAN_DO';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_JIAN_XIONG';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_FAN_KUI';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_GANG_LIE';
      readonly seatIndex: number;
      readonly activate: boolean;
    }
  | {
      readonly type: 'RESPOND_GANG_LIE_CHOICE';
      readonly seatIndex: number;
      readonly choice: 'DISCARD_TWO' | 'TAKE_DAMAGE';
      readonly discardCardIds?: readonly [string, string];
    }
  | {
      readonly type: 'RESPOND_YI_JI';
      readonly seatIndex: number;
      readonly distributions: readonly {
        readonly targetSeat: number;
        readonly cardIds: readonly string[];
      }[];
    }
  | {
      readonly type: 'RESPOND_FAN_JIAN_GUESS';
      readonly seatIndex: number;
      readonly suit: Suit;
    }
  | {
      readonly type: 'RESPOND_JI_JIANG';
      readonly seatIndex: number;
      readonly cardIds: readonly string[] | null;
    }
  | {
      readonly type: 'RESPOND_HU_JIA';
      readonly seatIndex: number;
      readonly cardId: string | null;
      readonly useBagua?: boolean;
    };

export interface PendingPrompt {
  readonly kind: string;
  readonly actorSeats: readonly number[];
  readonly isSimulatedDelay: boolean;
}

export interface StrikeValidationContext {
  readonly strikeCards: readonly CardInstance[];
  readonly isVirtualTruongBat: boolean;
}
