import { HeroIdSchema, RefereeActionTypeSchema, SuitSchema } from '@lkdf/shared';
import { z } from 'zod';

const SeatIndexSchema = z.number().int().min(0).max(7);

const TargetCardZoneSchema = z.enum([
  'HAND',
  'WEAPON',
  'ARMOR',
  'PLUS_ONE_HORSE',
  'MINUS_ONE_HORSE',
  'DELAYED',
]);

const EquipOrHandZoneSchema = z.enum([
  'HAND',
  'WEAPON',
  'ARMOR',
  'PLUS_ONE_HORSE',
  'MINUS_ONE_HORSE',
]);

const PlayPhaseSkillIdSchema = z.enum([
  'ren_de',
  'ji_jiang',
  'zhi_heng',
  'ku_rou',
  'fan_jian',
  'jie_yin',
  'qing_nang',
  'li_jian',
]);

/** Mọi hành động hợp lệ do máy khách gửi qua WebSocket (cố tình loại RESOLVE_SIMULATED_NULLIFICATION). */
export const ClientGameActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PLAY_CARD'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).min(1),
    targetSeats: z.array(SeatIndexSchema).optional(),
    secondarySeat: SeatIndexSchema.optional(),
    asCardKey: z.enum(['sat', 'qua_ha_sai_cau', 'lac_bat_tu_thuc']).optional(),
  }),
  z.object({
    type: z.literal('ACTIVATE_HERO_SKILL'),
    seatIndex: SeatIndexSchema,
    skillId: PlayPhaseSkillIdSchema,
    cardIds: z.array(z.string().min(1)).optional(),
    targetSeats: z.array(SeatIndexSchema).optional(),
  }),
  z.object({
    type: z.literal('END_PLAY_PHASE'),
    seatIndex: SeatIndexSchema,
  }),
  z.object({
    type: z.literal('DISCARD_CARDS'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('SET_AUTO_SKIP_NULLIFICATION'),
    seatIndex: SeatIndexSchema,
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_NULLIFICATION'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_TU_HUNG'),
    seatIndex: SeatIndexSchema,
    choice: z.enum(['DISCARD_HAND', 'ALLOW_DRAW']),
    discardCardId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('RESPOND_DODGE'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
    useBagua: z.boolean().optional(),
    useHuJia: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('RESPOND_QUAN_THACH_PHU'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
    discardCardIds: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  }),
  z.object({
    type: z.literal('RESPOND_THANH_LONG'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_HAN_BANG_KIEM'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
    picks: z
      .array(
        z.object({
          zone: EquipOrHandZoneSchema,
          handIndex: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
  }),
  z.object({
    type: z.literal('RESPOND_KY_LAN_CUNG'),
    seatIndex: SeatIndexSchema,
    horseZone: z.enum(['PLUS_ONE_HORSE', 'MINUS_ONE_HORSE']).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_DUEL_SAT'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_COLLATERAL_SAT'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_AOE_SAT'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_AOE_DODGE'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
    useBagua: z.boolean().optional(),
    useHuJia: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('RESPOND_HARVEST_PICK'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1),
  }),
  z.object({
    type: z.literal('RESPOND_PICK_TARGET_CARD'),
    seatIndex: SeatIndexSchema,
    zone: TargetCardZoneSchema,
    handIndex: z.number().int().min(0).optional(),
    delayedCardId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('RESPOND_PEACH_RESCUE'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_GUAN_XING'),
    seatIndex: SeatIndexSchema,
    topCardIds: z.array(z.string().min(1)),
    bottomCardIds: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('RESPOND_LUO_SHEN'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_TU_XI'),
    seatIndex: SeatIndexSchema,
    targetSeats: z.array(SeatIndexSchema),
  }),
  z.object({
    type: z.literal('RESPOND_LUO_YI'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_KE_JI'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_TIE_QI'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_LIU_LI'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
    discardCardId: z.string().min(1).optional(),
    newTargetSeat: SeatIndexSchema.optional(),
  }),
  z.object({
    type: z.literal('RESPOND_GUI_CAI'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_TIAN_DO'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_JIAN_XIONG'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_FAN_KUI'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_GANG_LIE'),
    seatIndex: SeatIndexSchema,
    activate: z.boolean(),
  }),
  z.object({
    type: z.literal('RESPOND_GANG_LIE_CHOICE'),
    seatIndex: SeatIndexSchema,
    choice: z.enum(['DISCARD_TWO', 'TAKE_DAMAGE']),
    discardCardIds: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  }),
  z.object({
    type: z.literal('RESPOND_YI_JI'),
    seatIndex: SeatIndexSchema,
    distributions: z.array(
      z.object({
        targetSeat: SeatIndexSchema,
        cardIds: z.array(z.string().min(1)),
      }),
    ),
  }),
  z.object({
    type: z.literal('RESPOND_FAN_JIAN_GUESS'),
    seatIndex: SeatIndexSchema,
    suit: SuitSchema,
  }),
  z.object({
    type: z.literal('RESPOND_JI_JIANG'),
    seatIndex: SeatIndexSchema,
    cardIds: z.array(z.string().min(1)).nullable(),
  }),
  z.object({
    type: z.literal('RESPOND_HU_JIA'),
    seatIndex: SeatIndexSchema,
    cardId: z.string().min(1).nullable(),
  }),
]);

export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('AUTH'),
    sessionToken: z.string().min(1),
    seatMode: z.enum(['CLAIM_SEAT', 'TAKEOVER']).optional(),
  }),
  z.object({
    type: z.literal('SUBSCRIBE_ROOM'),
    roomCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/),
  }),
  z.object({
    type: z.literal('SELECT_HERO'),
    roomCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/),
    heroId: HeroIdSchema,
  }),
  z.object({
    type: z.literal('GAME_ACTION'),
    roomCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/),
    action: ClientGameActionSchema,
  }),
  z.object({
    type: z.literal('REFEREE_ACTION'),
    roomCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/),
    actionType: RefereeActionTypeSchema,
  }),
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;
