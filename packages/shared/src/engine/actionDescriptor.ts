import { DEFAULT_CONTENT_REGISTRY } from '../content/registry.js';
import { isInAttackRange } from '../distance/index.js';
import { getHeroSkillHandler } from '../heroes/registry.js';
import type { MasterGameState, PlayerViewState, PublicPlayerView } from '../types/game.js';
import {
  classifyInterruptPrimitive,
  type GenericInteractionPrimitive,
} from './primitives.js';

export interface ActionDescriptor {
  readonly phase: PlayerViewState['turnPhase'];
  readonly isViewerActor: boolean;
  readonly primitive: GenericInteractionPrimitive | null;
  readonly canDraw: boolean;
  readonly canEndPlayPhase: boolean;
  readonly discardRequiredCount: number;
  readonly playableCardIds: readonly string[];
  readonly activatableSkillIds: readonly string[];
  readonly promptKey: string;
  readonly promptParams: Readonly<Record<string, string | number | boolean | null>>;
}

function getPlayableCardIdsInPlayPhase(
  view: PlayerViewState,
  viewer: PublicPlayerView,
): string[] {
  const hand = viewer.handCards ?? [];
  if (hand.length === 0) return [];

  const handler = getHeroSkillHandler(viewer.heroId);
  const satUsed = view.turnFlags?.satUsedThisTurn ?? 0;
  const hasUnlimitedSat =
    Boolean(handler?.unlimitedSat) ||
    viewer.equipments.weapon?.cardKey === 'gia_cat_lien_no';
  const isFirstRoundPeaceful =
    Boolean(view.peacefulFirstRound) && view.roundNumber === 1;
  const aliveOthers = view.players.filter(
    (p) => p.alive && p.seatIndex !== viewer.seatIndex,
  );

  const masterLike = { players: view.players } as unknown as Parameters<
    typeof isInAttackRange
  >[0];

  const ids: string[] = [];
  for (const card of hand) {
    if (
      card.category === 'WEAPON' ||
      card.category === 'ARMOR' ||
      card.category === 'PLUS_ONE_HORSE' ||
      card.category === 'MINUS_ONE_HORSE'
    ) {
      ids.push(card.id);
      continue;
    }

    switch (card.cardKey) {
      case 'dao':
        if (viewer.hp < viewer.maxHp) ids.push(card.id);
        break;
      case 'sat': {
        if (isFirstRoundPeaceful) break;
        if (!hasUnlimitedSat && satUsed >= 1) break;
        const hasTarget = aliveOthers.some((other) => {
          const targetHandler = getHeroSkillHandler(other.heroId);
          const immune =
            targetHandler?.canBeTargetedBy?.(
              masterLike as unknown as MasterGameState,
              {
                ...other,
                handCards: Array.from({ length: other.handCount }),
                identity: other.identity === 'UNKNOWN' ? 'REBEL' : other.identity,
                autoSkipNullification: false,
              } as unknown as Parameters<
                NonNullable<typeof targetHandler.canBeTargetedBy>
              >[1],
              'sat',
            ) === false;
          if (immune) return false;
          return isInAttackRange(masterLike, viewer.seatIndex, other.seatIndex);
        });
        if (hasTarget) ids.push(card.id);
        break;
      }
      case 'vo_trung_sinh_huu':
      case 'nam_man_nhap_xam':
      case 'van_tien_te_phat':
      case 'dao_vien_ket_nghia':
      case 'ngu_coc_phong_dang':
      case 'thiem_dien':
        ids.push(card.id);
        break;
      case 'qua_ha_sai_cau':
        if (
          aliveOthers.some(
            (p) =>
              p.handCount > 0 ||
              p.equipments.weapon !== null ||
              p.equipments.armor !== null ||
              p.equipments.plusOneHorse !== null ||
              p.equipments.minusOneHorse !== null,
          )
        ) {
          ids.push(card.id);
        }
        break;
      case 'thuan_thu_khien_duong':
      case 'quyet_dau':
      case 'lac_bat_tu_thuc':
      case 'ta_dao_sat_nhan':
        if (aliveOthers.length > 0) ids.push(card.id);
        break;
      default:
        break;
    }
  }
  return ids;
}

function getActivatableSkillIds(
  view: PlayerViewState,
  viewer: PublicPlayerView,
): string[] {
  if (!viewer.alive || !viewer.heroId) return [];
  const skills: string[] = [];
  const flags = view.turnFlags;
  const hero = DEFAULT_CONTENT_REGISTRY.getHero(viewer.heroId);
  if (!hero) return skills;

  for (const s of hero.skills) {
    if (!DEFAULT_CONTENT_REGISTRY.isValidPlaySkillId(s.id)) continue;
    if (s.id === 'ren_de' && viewer.handCount > 0) skills.push(s.id);
    else if (
      s.id === 'ji_jiang' &&
      viewer.identity === 'LORD' &&
      !(view.peacefulFirstRound && view.roundNumber === 1) &&
      !flags?.jiJiangDeclinedThisTurn
    ) {
      skills.push(s.id);
    } else if (s.id === 'zhi_heng' && !flags?.zhiHengUsedThisTurn) {
      skills.push(s.id);
    } else if (s.id === 'ku_rou') {
      skills.push(s.id);
    } else if (
      s.id === 'fan_jian' &&
      !flags?.fanJianUsedThisTurn &&
      viewer.handCount > 0
    ) {
      skills.push(s.id);
    } else if (
      s.id === 'jie_yin' &&
      !flags?.jieYinUsedThisTurn &&
      viewer.handCount >= 2
    ) {
      skills.push(s.id);
    } else if (
      s.id === 'qing_nang' &&
      !flags?.qingNangUsedThisTurn &&
      viewer.handCount >= 1
    ) {
      skills.push(s.id);
    } else if (s.id === 'li_jian' && !flags?.liJianUsedThisTurn) {
      skills.push(s.id);
    }
  }
  return skills;
}

/**
 * Mô tả tập hành động hợp lệ hiện tại từ `PlayerViewState` (không đọc chuỗi tiếng Việt).
 */
export function describeAvailableActions(
  view: PlayerViewState,
): ActionDescriptor {
  const viewer = view.players.find((p) => p.seatIndex === view.viewerSeatIndex);
  const primitive = classifyInterruptPrimitive(view);

  if (view.turnPhase === 'GAME_OVER') {
    return {
      phase: view.turnPhase,
      isViewerActor: false,
      primitive: null,
      canDraw: false,
      canEndPlayPhase: false,
      discardRequiredCount: 0,
      playableCardIds: [],
      activatableSkillIds: [],
      promptKey: 'match.prompt.gameOver',
      promptParams: {},
    };
  }

  if (view.turnPhase === 'HERO_SELECT') {
    const draft = view.heroDraft;
    const isLordTurn =
      draft?.stage === 'LORD_SELECTING' &&
      draft.lordSeatIndex === view.viewerSeatIndex;
    const isOtherTurn =
      draft?.stage === 'OTHERS_SELECTING' &&
      view.viewerSeatIndex !== draft.lordSeatIndex &&
      !draft.mySelectedHero;
    return {
      phase: view.turnPhase,
      isViewerActor: Boolean(isLordTurn || isOtherTurn),
      primitive: null,
      canDraw: false,
      canEndPlayPhase: false,
      discardRequiredCount: 0,
      playableCardIds: [],
      activatableSkillIds: [],
      promptKey:
        isLordTurn || isOtherTurn
          ? 'match.prompt.selectHero'
          : 'match.prompt.waitHeroSelect',
      promptParams: {},
    };
  }

  if (primitive) {
    const isViewerActor = primitive.actorSeats.includes(view.viewerSeatIndex);
    return {
      phase: view.turnPhase,
      isViewerActor,
      primitive,
      canDraw: false,
      canEndPlayPhase: false,
      discardRequiredCount: 0,
      playableCardIds: [],
      activatableSkillIds: [],
      promptKey: `match.interrupt.${primitive.sourceInterruptKind}`,
      promptParams: {
        actorSeat: (primitive.actorSeats[0] ?? view.currentTurnSeat) + 1,
        targetSeat: (view.activeInterrupt?.targetSeat ?? view.currentTurnSeat) + 1,
      },
    };
  }

  const isMyTurn = Boolean(
    viewer && viewer.alive && view.currentTurnSeat === view.viewerSeatIndex,
  );

  if (view.turnPhase === 'DRAW' && isMyTurn) {
    return {
      phase: view.turnPhase,
      isViewerActor: true,
      primitive: null,
      canDraw: Boolean(view.availableDrawCount && view.availableDrawCount > 0),
      canEndPlayPhase: false,
      discardRequiredCount: 0,
      playableCardIds: [],
      activatableSkillIds: [],
      promptKey: 'match.prompt.drawPhase',
      promptParams: { count: view.availableDrawCount ?? 2 },
    };
  }

  if (view.turnPhase === 'PLAY' && isMyTurn && viewer) {
    return {
      phase: view.turnPhase,
      isViewerActor: true,
      primitive: null,
      canDraw: Boolean(view.turnFlags?.drawSecondAvailable),
      canEndPlayPhase: true,
      discardRequiredCount: 0,
      playableCardIds: getPlayableCardIdsInPlayPhase(view, viewer),
      activatableSkillIds: getActivatableSkillIds(view, viewer),
      promptKey: 'match.prompt.playPhase',
      promptParams: {},
    };
  }

  if (view.turnPhase === 'DISCARD' && isMyTurn && viewer) {
    const discardRequiredCount = Math.max(
      0,
      viewer.handCount - Math.max(0, viewer.hp),
    );
    return {
      phase: view.turnPhase,
      isViewerActor: true,
      primitive: null,
      canDraw: false,
      canEndPlayPhase: false,
      discardRequiredCount,
      playableCardIds: [],
      activatableSkillIds: [],
      promptKey: 'match.prompt.discardPhase',
      promptParams: { count: discardRequiredCount },
    };
  }

  return {
    phase: view.turnPhase,
    isViewerActor: false,
    primitive: null,
    canDraw: false,
    canEndPlayPhase: false,
    discardRequiredCount: 0,
    playableCardIds: [],
    activatableSkillIds: [],
    promptKey: 'match.prompt.waitTurn',
    promptParams: { seat: view.currentTurnSeat + 1 },
  };
}
