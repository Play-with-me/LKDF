import type { GameAction, VirtualCardKey } from '../engine/combatTypes.js';
import type {
  CardInstance,
  HeroFaction,
  HeroGender,
  HeroId,
  InterruptFrame,
  MasterGameState,
  PendingEffect,
  PlayerCombatState,
} from '../types/game.js';

/**
 * Bộ công cụ thuần bất biến do Lõi Trận Đánh cung cấp cho các hàm kỹ năng tướng,
 * giúp tránh phụ thuộc vòng (circular import) giữa `heroes/skills/*` và `engine/*`.
 */
export interface SkillRuntime {
  getPlayerBySeat(state: MasterGameState, seatIndex: number): PlayerCombatState;
  updatePlayer(
    state: MasterGameState,
    seatIndex: number,
    updater: (player: PlayerCombatState) => PlayerCombatState,
  ): MasterGameState;
  getClockwiseAliveSeats(
    state: MasterGameState,
    startSeat: number,
    includeStart: boolean,
  ): number[];
  dealCardsToSeat(
    state: MasterGameState,
    seatIndex: number,
    count: number,
    rng: () => number,
  ): { readonly state: MasterGameState; readonly dealt: CardInstance[] };
  drawFromPile(
    state: MasterGameState,
    count: number,
    rng: () => number,
  ): { readonly state: MasterGameState; readonly drawn: CardInstance[] };
  appendToDiscardPile(
    state: MasterGameState,
    cards: readonly CardInstance[],
  ): MasterGameState;
  removeCardsFromHand(
    player: PlayerCombatState,
    cardIds: readonly string[],
  ): { readonly nextPlayer: PlayerCombatState; readonly removed: CardInstance[] };
  removeAnyCardFromPlayer(
    player: PlayerCombatState,
    cardId: string,
  ): { readonly nextPlayer: PlayerCombatState; readonly removed: CardInstance };
  hasAnyCardInHandOrEquip(player: PlayerCombatState): boolean;
  nextFrameId(
    state: MasterGameState,
    prefix: string,
  ): { readonly state: MasterGameState; readonly id: string };
  pushInterrupt(state: MasterGameState, frame: InterruptFrame): MasterGameState;
  pushPendingEffect(state: MasterGameState, effect: PendingEffect): MasterGameState;
  applyDamage(
    state: MasterGameState,
    sourceSeat: number | null,
    targetSeat: number,
    amount: number,
    reasonVi: string,
    damageCards?: readonly CardInstance[],
  ): MasterGameState;
  isInAttackRange(state: MasterGameState, fromSeat: number, toSeat: number): boolean;
  getHeroGender(heroId: HeroId | null): HeroGender | null;
  getHeroFaction(heroId: HeroId | null): HeroFaction | null;
  /** Bỏ bài trên tay vào chồng bỏ và tự động kích hoạt Liên Doanh (nếu là Lục Tốn). */
  discardHandCards(
    state: MasterGameState,
    seatIndex: number,
    cardIds: readonly string[],
    rng: () => number,
  ): { readonly state: MasterGameState; readonly removed: CardInstance[] };
  /** Bỏ 1 lá bất kỳ (tay hoặc trang bị) vào chồng bỏ và tự động kích hoạt Liên Doanh / Kiêu Cơ. */
  discardAnyCard(
    state: MasterGameState,
    seatIndex: number,
    cardId: string,
    rng: () => number,
  ): { readonly state: MasterGameState; readonly removed: CardInstance };
}

/**
 * Hợp đồng chuẩn cho từng tướng trong bộ 25 tướng Tiêu Chuẩn.
 * Mỗi file trong `heroes/skills/{shu,wei,wuQun}.ts` export một `Record` ánh xạ `HeroId -> HeroSkillHandler`.
 */
export interface HeroSkillHandler {
  readonly heroId: HeroId;

  // --- Quy tắc bị động / Sửa đổi luật ---
  /** Trương Phi (Phao Hống): đánh Sát không giới hạn trong pha PLAY. */
  readonly unlimitedSat?: boolean;
  /** Mã Siêu (Mã Thuật): điều chỉnh khoảng cách từ `from` tới `to`. */
  readonly distanceModifier?: (
    from: PlayerCombatState,
    to: PlayerCombatState,
  ) => number;
  /** Hoàng Nguyệt Anh (Kỳ Tài): bỏ qua giới hạn khoảng cách khi dùng Cẩm nang. */
  readonly ignoreScrollDistance?: boolean;
  /** Kiểm tra mục tiêu có bị miễn nhiễm với lá `cardKey` hay không (Không Thành / Khiêm Tốn). */
  readonly canBeTargetedBy?: (
    state: MasterGameState,
    target: PlayerCombatState,
    cardKey: string,
  ) => boolean;
  /** Chu Du (Anh Tư): số lá rút thêm ở pha Rút bài. */
  readonly extraDrawCount?: (
    state: MasterGameState,
    player: PlayerCombatState,
  ) => number;
  /** Lữ Bố (Vô Song): số Sát đối phương cần đánh mỗi lần trong Quyết Đấu. */
  readonly duelSatRequiredCount?: (
    state: MasterGameState,
    self: PlayerCombatState,
  ) => number;
  /** Lữ Bố (Vô Song): số Thiểm mục tiêu cần để né Sát của mình. */
  readonly strikeDodgeRequiredCount?: (
    state: MasterGameState,
    attacker: PlayerCombatState,
  ) => number;
  /** Tôn Quyền (Cứu Viện - Chủ Công): lượng máu hồi thêm khi đồng minh Ngô dùng Đào cứu. */
  readonly onPeachRescueBonus?: (
    state: MasterGameState,
    dyingPlayer: PlayerCombatState,
    rescuer: PlayerCombatState,
    rt: SkillRuntime,
  ) => number;

  // --- Chuyển đổi bài ảo (Võ Thánh, Long Đảm, Khuynh Quốc, Kỳ Tập, Quốc Sắc, Cấp Cứu) ---
  readonly canConvertCardAs?: (
    state: MasterGameState,
    player: PlayerCombatState,
    card: CardInstance,
    asCardKey: VirtualCardKey,
    inTurn: boolean,
  ) => boolean;

  // --- Các điểm móc theo pha lượt ---
  /** Đầu lượt (trước pha Phán xét): Quan Tinh, Lạc Thần. */
  readonly onTurnStart?: (
    state: MasterGameState,
    seatIndex: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Pha Rút bài: Đột Tập, Lỏa Y. */
  readonly onDrawPhase?: (
    state: MasterGameState,
    seatIndex: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Khi dùng Cẩm nang thường: Tập Trí. */
  readonly onNormalScrollPlayed?: (
    state: MasterGameState,
    seatIndex: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Trước pha Bỏ bài: Khắc Kỷ. */
  readonly onBeforeDiscardPhase?: (
    state: MasterGameState,
    seatIndex: number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Pha Kết lượt: Bế Nguyệt. */
  readonly onTurnEnd?: (
    state: MasterGameState,
    seatIndex: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;

  // --- Điểm móc mất bài ---
  /** Sau khi mất bài trên tay (kiểm tra Liên Doanh nếu handCards về 0). */
  readonly onHandCardsLost?: (
    state: MasterGameState,
    seatIndex: number,
    prevHandCount: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Sau khi mất trang bị (Kiêu Cơ). */
  readonly onEquipLost?: (
    state: MasterGameState,
    seatIndex: number,
    lostCount: number,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;

  // --- Điểm móc giao tranh, sát thương & phán xét ---
  /** Khi bị chọn làm mục tiêu Sát: Lưu Ly (Đại Kiều). */
  readonly onStrikeTargeted?: (
    state: MasterGameState,
    sourceSeat: number,
    targetSeat: number,
    strikeCards: readonly CardInstance[],
    isCollateral: boolean,
    isFangTian: boolean,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Khi chọn mục tiêu Sát (sau Lưu Ly / Từ Hùng): Thiết Kỵ (Mã Siêu). */
  readonly onStrikeTargeting?: (
    state: MasterGameState,
    sourceSeat: number,
    targetSeat: number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Sau khi chịu sát thương (và còn sống): Gian Hùng, Phản Quỷ, Cương Liệt, Di Kế. */
  readonly onAfterDamageTaken?: (
    state: MasterGameState,
    targetSeat: number,
    sourceSeat: number | null,
    amount: number,
    damageCards: readonly CardInstance[],
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
  /** Sau khi lá phán xét của bản thân có hiệu lực: Thiên Đố (Quách Gia). */
  readonly onAfterJudgmentEffective?: (
    state: MasterGameState,
    judgeOwnerSeat: number,
    judgeCard: CardInstance,
    rt: SkillRuntime,
  ) => MasterGameState;

  // --- Kỹ năng chủ động trong pha PLAY (ACTIVATE_HERO_SKILL) ---
  readonly executePlaySkill?: (
    state: MasterGameState,
    action: Extract<GameAction, { type: 'ACTIVATE_HERO_SKILL' }>,
    rng: () => number,
    rt: SkillRuntime,
  ) => MasterGameState;
}
