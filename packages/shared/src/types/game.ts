import { z } from 'zod';
import type { IdentityRole, PlayerCount, TimerPreset, WinningFaction } from './identity.js';

export const SuitSchema = z.enum(['SPADE', 'HEART', 'CLUB', 'DIAMOND']);
export type Suit = z.infer<typeof SuitSchema>;

export const CardCategorySchema = z.enum([
  'BASIC',
  'NORMAL_SCROLL',
  'DELAYED_SCROLL',
  'WEAPON',
  'ARMOR',
  'PLUS_ONE_HORSE',
  'MINUS_ONE_HORSE',
]);
export type CardCategory = z.infer<typeof CardCategorySchema>;

export const HeroFactionSchema = z.enum(['SHU', 'WEI', 'WU', 'QUN']);
export type HeroFaction = z.infer<typeof HeroFactionSchema>;

export const HeroGenderSchema = z.enum(['MALE', 'FEMALE']);
export type HeroGender = z.infer<typeof HeroGenderSchema>;

/** Toàn bộ 25 mã tướng Bản Tiêu Chuẩn gốc theo DATA_MODEL.md. */
export const STANDARD_HERO_IDS = [
  'liu_bei',
  'guan_yu',
  'zhang_fei',
  'zhuge_liang',
  'zhao_yun',
  'ma_chao',
  'huang_yue_ying',
  'cao_cao',
  'si_ma_yi',
  'xia_hou_dun',
  'zhang_liao',
  'xu_chu',
  'guo_jia',
  'zhen_ji',
  'sun_quan',
  'gan_ning',
  'lu_meng',
  'huang_gai',
  'zhou_yu',
  'da_qiao',
  'lu_xun',
  'sun_shang_xiang',
  'hua_tuo',
  'lu_bu',
  'diao_chan',
] as const;

export const HeroIdSchema = z.enum(STANDARD_HERO_IDS);
export type HeroId = z.infer<typeof HeroIdSchema>;

export interface HeroSkillInfo {
  readonly id: string;
  readonly nameVi: string;
  readonly descriptionVi: string;
  readonly isLordSkill?: boolean;
}

export interface HeroDefinition {
  readonly id: HeroId;
  readonly nameVi: string;
  readonly faction: HeroFaction;
  readonly factionLabelVi: string;
  readonly baseMaxHp: 3 | 4;
  readonly gender: HeroGender;
  readonly isLordCandidate: boolean;
  readonly skills: readonly HeroSkillInfo[];
}

export const TurnPhaseSchema = z.enum([
  'HERO_SELECT',
  'JUDGE',
  'DRAW',
  'PLAY',
  'DISCARD',
  'END',
  'GAME_OVER',
]);
export type TurnPhase = z.infer<typeof TurnPhaseSchema>;

export const HeroDraftStageSchema = z.enum([
  'LORD_SELECTING',
  'OTHERS_SELECTING',
  'COMPLETED',
]);
export type HeroDraftStage = z.infer<typeof HeroDraftStageSchema>;

export const RefereeActionTypeSchema = z.enum([
  'PAUSE',
  'RESUME',
  'UNDO_ONE_STEP',
  'SKIP_PHASE',
  'ABORT_MATCH',
]);
export type RefereeActionType = z.infer<typeof RefereeActionTypeSchema>;

export const RoomStatusSchema = z.enum(['LOBBY', 'IN_GAME', 'FINISHED']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const SeatConnectionStatusSchema = z.enum(['ONLINE', 'DISCONNECTED']);
export type SeatConnectionStatus = z.infer<typeof SeatConnectionStatusSchema>;

export type TargetCardZone =
  | 'HAND'
  | 'WEAPON'
  | 'ARMOR'
  | 'PLUS_ONE_HORSE'
  | 'MINUS_ONE_HORSE'
  | 'DELAYED';

export interface CardInstance {
  readonly id: string;
  readonly cardKey: string;
  readonly nameVi: string;
  readonly category: CardCategory;
  readonly suit: Suit;
  readonly rank: number;
  readonly attackRange?: number;
}

export interface PlayerEquipments {
  readonly weapon: CardInstance | null;
  readonly armor: CardInstance | null;
  readonly plusOneHorse: CardInstance | null;
  readonly minusOneHorse: CardInstance | null;
}

export interface PlayerCombatState {
  readonly seatIndex: number;
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly identity: IdentityRole;
  readonly isIdentityRevealed: boolean;
  readonly heroId: HeroId | null;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  readonly handCards: readonly CardInstance[];
  readonly equipments: PlayerEquipments;
  readonly delayedScrolls: readonly CardInstance[];
  readonly autoSkipNullification: boolean;
  readonly isBotTakeover: boolean;
}

export interface PublicPlayerView {
  readonly seatIndex: number;
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly identity: IdentityRole | 'UNKNOWN';
  readonly isIdentityRevealed: boolean;
  readonly heroId: HeroId | null;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  readonly handCount: number;
  readonly handCards: readonly CardInstance[] | null;
  readonly equipments: PlayerEquipments;
  readonly delayedScrolls: readonly CardInstance[];
  readonly isBotTakeover: boolean;
}

export interface HeroDraftState {
  readonly stage: HeroDraftStage;
  readonly lordSeatIndex: number;
  readonly remainingPool: readonly HeroId[];
  readonly candidatesBySeat: Readonly<Record<number, readonly HeroId[]>>;
  readonly selectedBySeat: Readonly<Record<number, HeroId>>;
}

export interface PublicHeroDraftView {
  readonly stage: HeroDraftStage;
  readonly lordSeatIndex: number;
  readonly myCandidates: readonly HeroId[];
  readonly mySelectedHero: HeroId | null;
  readonly readySeats: readonly number[];
}

export type InterruptFrame =
  | {
      readonly id: string;
      readonly kind: 'WAIT_NULLIFICATION';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly scrollNameVi: string;
      readonly isSimulatedDelay: boolean;
      readonly eligibleSeats: readonly number[];
      readonly passedSeats: readonly number[];
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_TU_HUNG';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_DODGE';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly requiredCount: number;
      readonly dodgedSoFar: number;
      readonly allowBagua: boolean;
      readonly baguaTriedThisStrike: boolean;
      readonly huJiaTriedThisStrike?: boolean;
      readonly canBeForcedByQuanThachPhu: boolean;
      readonly strikeColor: 'RED' | 'BLACK' | 'NONE';
      readonly isCollateralStrike: boolean;
      readonly isFangTianMultiTarget: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_QUAN_THACH_PHU';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly strikeCards: readonly CardInstance[];
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_THANH_LONG';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_HAN_BANG_KIEM';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly sourceCards: readonly CardInstance[];
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_KY_LAN_CUNG';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_DUEL_SAT';
      readonly targetSeat: number;
      readonly otherSeat: number;
      readonly casterSeat: number;
      readonly requiredCount: number;
      readonly playedSoFar: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_COLLATERAL_SAT';
      readonly targetSeat: number;
      readonly attackerSeat: number;
      readonly casterSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_AOE_SAT';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_AOE_DODGE';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly allowBagua: boolean;
      readonly baguaTriedThisFrame: boolean;
      readonly huJiaTriedThisFrame?: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_HARVEST_PICK';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'PICK_TARGET_CARD';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly mode: 'STEAL' | 'DISMANTLE';
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_PEACH_RESCUE';
      readonly targetSeat: number;
      readonly sourceSeat: number | null;
      readonly responderSeat: number;
      readonly askOrder: readonly number[];
      readonly askCursor: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_GUAN_XING';
      readonly targetSeat: number;
      readonly cards: readonly CardInstance[];
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_LUO_SHEN';
      readonly targetSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_TU_XI';
      readonly targetSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_LUO_YI';
      readonly targetSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_KE_JI';
      readonly targetSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_TIE_QI';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_LIU_LI';
      readonly targetSeat: number;
      readonly sourceSeat: number;
      readonly strikeCards: readonly CardInstance[];
      readonly isCollateralStrike: boolean;
      readonly isFangTianMultiTarget: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_GUI_CAI';
      readonly targetSeat: number;
      readonly judgeOwnerSeat: number;
      readonly judgeCard: CardInstance;
      readonly judgePurpose: string;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_TIAN_DO';
      readonly targetSeat: number;
      readonly judgeCard: CardInstance;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_JIAN_XIONG';
      readonly targetSeat: number;
      readonly damageCards: readonly CardInstance[];
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_FAN_KUI';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'ASK_GANG_LIE';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_GANG_LIE_CHOICE';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_YI_JI';
      readonly targetSeat: number;
      readonly cards: readonly CardInstance[];
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_FAN_JIAN_GUESS';
      readonly targetSeat: number;
      readonly sourceSeat: number;
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_JI_JIANG';
      readonly targetSeat: number;
      readonly lordSeat: number;
      readonly responderSeat: number;
      readonly askOrder: readonly number[];
      readonly askCursor: number;
      readonly strikeTargetSeat?: number;
      readonly contextKind: 'PLAY' | 'DUEL' | 'AOE_SAT' | 'COLLATERAL';
    }
  | {
      readonly id: string;
      readonly kind: 'WAIT_HU_JIA';
      readonly targetSeat: number;
      readonly lordSeat: number;
      readonly responderSeat: number;
      readonly askOrder: readonly number[];
      readonly askCursor: number;
      readonly contextKind: 'DODGE' | 'AOE_DODGE';
    };

/** Bản sao phản ứng gửi xuống máy khách: tuyệt đối không lộ cờ isSimulatedDelay hay eligibleSeats. */
export interface PublicInterruptView {
  readonly id: string;
  readonly kind: InterruptFrame['kind'];
  readonly targetSeat: number;
  readonly sourceSeat?: number | null;
  readonly responderSeat?: number;
  readonly attackerSeat?: number;
  readonly scrollNameVi?: string;
  readonly guanXingCards?: readonly CardInstance[];
  readonly yiJiCards?: readonly CardInstance[];
  readonly judgeCard?: CardInstance;
  readonly judgePurpose?: string;
  readonly allowBagua?: boolean;
  readonly baguaTried?: boolean;
  readonly huJiaTried?: boolean;
  readonly requiredCount?: number;
  readonly dodgedSoFar?: number;
}

export type JudgmentPurpose =
  | 'LAC_BAT_TU_THUC'
  | 'THIEM_DIEN'
  | 'BAT_QUAI_TRAN'
  | 'TIE_QI'
  | 'GANG_LIE'
  | 'LUO_SHEN';

export type PendingEffect =
  | {
      readonly kind: 'RESOLVE_NULLIFICATION_COUNTER';
      readonly cancelled: boolean;
      readonly casterSeat: number;
    }
  | {
      readonly kind: 'RESOLVE_SCROLL';
      readonly cancelled: boolean;
      readonly casterSeat: number;
      readonly targetSeat: number;
      readonly scrollKey: string;
      readonly scrollCard: CardInstance;
      readonly secondarySeat?: number;
    }
  | {
      readonly kind: 'RESOLVE_STRIKE_AFTER_LIU_LI';
      readonly sourceSeat: number;
      readonly targetSeat: number;
      readonly strikeCards: readonly CardInstance[];
      readonly isCollateralStrike: boolean;
      readonly isFangTianMultiTarget: boolean;
    }
  | {
      readonly kind: 'RESOLVE_STRIKE_AFTER_TU_HUNG';
      readonly sourceSeat: number;
      readonly targetSeat: number;
      readonly strikeCards: readonly CardInstance[];
      readonly isCollateralStrike: boolean;
      readonly isFangTianMultiTarget: boolean;
    }
  | {
      readonly kind: 'RESOLVE_STRIKE_AFTER_TIE_QI';
      readonly sourceSeat: number;
      readonly targetSeat: number;
      readonly strikeCards: readonly CardInstance[];
      readonly isCollateralStrike: boolean;
      readonly isFangTianMultiTarget: boolean;
      readonly cannotDodge: boolean;
    }
  | {
      readonly kind: 'RESOLVE_STRIKE_HIT';
      readonly sourceSeat: number;
      readonly targetSeat: number;
      readonly strikeCards: readonly CardInstance[];
    }
  | {
      readonly kind: 'QUEUE_STRIKE_TARGETS';
      readonly sourceSeat: number;
      readonly remainingTargets: readonly number[];
      readonly strikeCards: readonly CardInstance[];
      readonly isFangTianMultiTarget: boolean;
    }
  | {
      readonly kind: 'QUEUE_AOE_TARGETS';
      readonly casterSeat: number;
      readonly scrollKey:
        | 'nam_man_nhap_xam'
        | 'van_tien_te_phat'
        | 'dao_vien_ket_nghia'
        | 'ngu_coc_phong_dang';
      readonly scrollCard: CardInstance;
      readonly remainingTargets: readonly number[];
    }
  | {
      readonly kind: 'CONTINUE_DELAYED_JUDGES';
    }
  | {
      readonly kind: 'RESOLVE_JUDGMENT';
      readonly ownerSeat: number;
      readonly purpose: JudgmentPurpose;
      readonly judgeCard: CardInstance;
      readonly sourceSeat?: number;
      readonly targetSeat?: number;
      readonly delayedCard?: CardInstance;
      readonly savedDodgeFrame?: InterruptFrame;
    }
  | {
      readonly kind: 'CONTINUE_LUO_SHEN';
      readonly targetSeat: number;
    }
  | {
      readonly kind: 'CONTINUE_YI_JI';
      readonly targetSeat: number;
      readonly remainingTriggers: number;
    }
  | {
      readonly kind: 'FINISH_DAMAGE_REACTIONS';
      readonly sourceSeat: number | null;
      readonly targetSeat: number;
      readonly amount: number;
      readonly damageCards: readonly CardInstance[];
    };

export interface TurnFlags {
  readonly satUsedThisTurn: number;
  readonly satPlayedOrUsedThisTurn?: boolean;
  readonly skipPlayPhase: boolean;
  readonly startSkillsChecked?: boolean;
  readonly drawSkillChecked?: boolean;
  readonly endSkillChecked?: boolean;
  readonly renDeGivenThisTurn?: number;
  readonly renDeHealedThisTurn?: boolean;
  readonly zhiHengUsedThisTurn?: boolean;
  readonly fanJianUsedThisTurn?: boolean;
  readonly jieYinUsedThisTurn?: boolean;
  readonly qingNangUsedThisTurn?: boolean;
  readonly liJianUsedThisTurn?: boolean;
  readonly jiJiangDeclinedThisTurn?: boolean;
  readonly luoYiActive?: boolean;
}

export interface RefereeAuditEntry {
  readonly timestamp: string;
  readonly actorUserId: string;
  readonly actorName: string;
  readonly actionType: RefereeActionType;
}

export interface MasterGameState {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly currentTurnSeat: number;
  readonly turnPhase: TurnPhase;
  readonly heroDraft: HeroDraftState | null;
  readonly drawPile: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly players: readonly PlayerCombatState[];
  readonly interruptStack: readonly InterruptFrame[];
  readonly pendingEffects?: readonly PendingEffect[];
  readonly harvestPool?: readonly CardInstance[];
  readonly turnFlags?: TurnFlags;
  readonly nextFrameSeq?: number;
  readonly actionLog: readonly string[];
  readonly refereeAuditLog: readonly RefereeAuditEntry[];
  readonly winningFaction: WinningFaction | null;
  readonly winnerUserIds: readonly string[];
}

export interface PlayerViewState {
  readonly matchId: string;
  readonly viewerSeatIndex: number;
  readonly roundNumber: number;
  readonly currentTurnSeat: number;
  readonly turnPhase: TurnPhase;
  readonly heroDraft: PublicHeroDraftView | null;
  readonly drawPileCount: number;
  readonly discardPileCount: number;
  readonly discardPileTop: CardInstance | null;
  readonly harvestPool: readonly CardInstance[];
  readonly players: readonly PublicPlayerView[];
  readonly activeInterrupt: PublicInterruptView | null;
  readonly turnFlags?: TurnFlags;
  readonly actionLog: readonly string[];
  readonly refereeAuditLog: readonly RefereeAuditEntry[];
  readonly winningFaction: WinningFaction | null;
  readonly winnerUserIds: readonly string[];
}

export interface RoomSeat {
  readonly seatIndex: number;
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly connectionStatus: SeatConnectionStatus;
  readonly isBotTakeover: boolean;
}

export interface RoomState {
  readonly roomCode: string;
  readonly status: RoomStatus;
  readonly ownerUserId: string;
  readonly actingHostUserId: string;
  readonly hostDisconnectedAt: string | null;
  readonly timerPreset: TimerPreset;
  readonly isTimerPaused: boolean;
  readonly seats: readonly RoomSeat[];
}

export interface MatchParticipantSummary {
  readonly userId: string;
  readonly displayName: string;
  readonly seatIndex: number;
  readonly identity: IdentityRole;
  readonly heroId: HeroId;
  readonly isWinner: boolean;
  readonly survived: boolean;
}

export interface MatchHistoryRecord {
  readonly matchId: string;
  readonly roomCode: string;
  readonly playerCount: PlayerCount;
  readonly winningFaction: WinningFaction;
  readonly durationSeconds: number;
  readonly participants: readonly MatchParticipantSummary[];
  readonly finishedAt: string;
}
