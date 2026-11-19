import { STANDARD_DECK_TEMPLATES } from '../cards/catalog.js';
import type {
  HeroDraftState,
  InterruptFrame,
  MasterGameState,
  PlayerCombatState,
  PlayerViewState,
  PublicHeroDraftView,
  PublicInterruptView,
  PublicPlayerView,
} from '../types/game.js';

function projectHeroIdForViewer(
  player: PlayerCombatState,
  viewerSeatIndex: number,
  heroDraft: HeroDraftState | null,
): PlayerCombatState['heroId'] {
  if (!heroDraft || heroDraft.stage === 'COMPLETED') {
    return player.heroId;
  }
  if (player.seatIndex === viewerSeatIndex) {
    return player.heroId ?? heroDraft.selectedBySeat[viewerSeatIndex] ?? null;
  }
  if (player.seatIndex === heroDraft.lordSeatIndex) {
    return player.heroId;
  }
  return null;
}

function projectHeroDraftForViewer(
  heroDraft: HeroDraftState | null,
  viewerSeatIndex: number,
): PublicHeroDraftView | null {
  if (!heroDraft) {
    return null;
  }
  const myCandidates = heroDraft.candidatesBySeat[viewerSeatIndex] ?? [];
  const mySelectedHero = heroDraft.selectedBySeat[viewerSeatIndex] ?? null;
  const readySeats = Object.keys(heroDraft.selectedBySeat)
    .map((key) => Number(key))
    .sort((a, b) => a - b);

  return {
    stage: heroDraft.stage,
    lordSeatIndex: heroDraft.lordSeatIndex,
    myCandidates: [...myCandidates],
    mySelectedHero,
    readySeats,
  };
}

function projectTopInterrupt(
  stack: readonly InterruptFrame[],
  viewerSeatIndex: number,
): PublicInterruptView | null {
  const topFrame = stack[stack.length - 1];
  if (!topFrame) {
    return null;
  }

  // Tuyệt đối không đưa isSimulatedDelay hay eligibleSeats xuống máy khách
  // Tuyệt đối không lộ guanXingCards hay yiJiCards cho người chơi khác
  switch (topFrame.kind) {
    case 'WAIT_NULLIFICATION':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
        scrollNameVi: topFrame.scrollNameVi,
      };
    case 'WAIT_PEACH_RESCUE':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
        responderSeat: topFrame.responderSeat,
      };
    case 'WAIT_COLLATERAL_SAT':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.casterSeat,
        attackerSeat: topFrame.attackerSeat,
      };
    case 'WAIT_DUEL_SAT':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.otherSeat,
      };
    case 'PICK_TARGET_CARD':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
        ...(topFrame.handPick ? { handPick: topFrame.handPick } : {}),
        stealing: topFrame.mode === 'STEAL',
      };
    case 'WAIT_GUAN_XING':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        guanXingCards:
          viewerSeatIndex === topFrame.targetSeat
            ? topFrame.cards.map((c) => ({ ...c }))
            : undefined,
      };
    case 'WAIT_YI_JI':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        yiJiCards:
          viewerSeatIndex === topFrame.targetSeat
            ? topFrame.cards.map((c) => ({ ...c }))
            : undefined,
      };
    case 'WAIT_GUI_CAI':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.judgeOwnerSeat,
        judgeCard: { ...topFrame.judgeCard },
        judgePurpose: topFrame.judgePurpose,
      };
    case 'ASK_TIAN_DO':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        judgeCard: { ...topFrame.judgeCard },
      };
    case 'WAIT_JI_JIANG':
    case 'WAIT_HU_JIA':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.lordSeat,
        responderSeat: topFrame.responderSeat,
      };
    case 'ASK_LUO_SHEN':
    case 'WAIT_TU_XI':
    case 'ASK_LUO_YI':
    case 'ASK_KE_JI':
    case 'ASK_JIAN_XIONG':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
      };
    case 'WAIT_DODGE':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
        allowBagua: topFrame.allowBagua,
        baguaTried: topFrame.baguaTriedThisStrike,
        huJiaTried: Boolean(topFrame.huJiaTriedThisStrike),
        requiredCount: topFrame.requiredCount,
        dodgedSoFar: topFrame.dodgedSoFar,
      };
    case 'WAIT_AOE_DODGE':
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
        allowBagua: topFrame.allowBagua,
        baguaTried: topFrame.baguaTriedThisFrame,
        huJiaTried: Boolean(topFrame.huJiaTriedThisFrame),
      };
    default:
      return {
        id: topFrame.id,
        kind: topFrame.kind,
        targetSeat: topFrame.targetSeat,
        sourceSeat: topFrame.sourceSeat,
      };
  }
}

/**
 * Bộ lọc bảo mật trạng thái theo DATA_MODEL.md & ARCHITECTURE.md:
 * - Ẩn toàn bộ danh sách bài trên tay đối thủ (chỉ gửi handCount).
 * - Ẩn danh sách chồng bài rút (chỉ gửi drawPileCount).
 * - Ẩn Thân Phận người khác (chỉ lộ bản thân, Chủ Công, người đã tử vong hoặc khi hết ván).
 * - Ẩn các tướng dự bị của đối thủ và tướng người khác mới chọn trước khi đồng loạt lật.
 * - Loại bỏ cờ isSimulatedDelay và eligibleSeats khỏi phản ứng đang chờ.
 */
export function projectStateForPlayer(
  masterState: MasterGameState,
  viewerUserId: string,
): PlayerViewState {
  const viewerPlayer = masterState.players.find(
    (player) => player.userId === viewerUserId,
  );
  if (!viewerPlayer) {
    throw new Error('VIEWER_NOT_IN_MATCH');
  }

  const viewerSeatIndex = viewerPlayer.seatIndex;
  const activeInterrupt = projectTopInterrupt(masterState.interruptStack, viewerSeatIndex);
  const hiddenHandSeat = activeInterrupt?.handPick === 'SELECT' ? activeInterrupt.targetSeat : null;
  const isGameOver = masterState.turnPhase === 'GAME_OVER';

  const publicPlayers: PublicPlayerView[] = masterState.players.map((player) => {
    const isSelf = player.seatIndex === viewerSeatIndex;
    const canSeeIdentity =
      isSelf || player.isIdentityRevealed || !player.alive || isGameOver;

    return {
      seatIndex: player.seatIndex,
      userId: player.userId,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      identity: canSeeIdentity ? player.identity : 'UNKNOWN',
      isIdentityRevealed: player.isIdentityRevealed || !player.alive || isGameOver,
      heroId: projectHeroIdForViewer(player, viewerSeatIndex, masterState.heroDraft),
      hp: player.hp,
      maxHp: player.maxHp,
      alive: player.alive,
      handCount: player.handCards.length,
      handCards: isSelf && player.seatIndex !== hiddenHandSeat ? [...player.handCards] : null,
      equipments: {
        weapon: player.equipments.weapon ? { ...player.equipments.weapon } : null,
        armor: player.equipments.armor ? { ...player.equipments.armor } : null,
        plusOneHorse: player.equipments.plusOneHorse
          ? { ...player.equipments.plusOneHorse }
          : null,
        minusOneHorse: player.equipments.minusOneHorse
          ? { ...player.equipments.minusOneHorse }
          : null,
      },
      delayedScrolls: player.delayedScrolls.map((card) => ({ ...card })),
      isBotTakeover: player.isBotTakeover,
    };
  });

  const topDiscard =
    masterState.discardPile[masterState.discardPile.length - 1];

  const { discardDisplayAs, ...physicalFace } = topDiscard ?? {};
  const discardFace = discardDisplayAs
    ? STANDARD_DECK_TEMPLATES.find(card => card.cardKey === discardDisplayAs)
    : undefined;

  return {
    matchId: masterState.matchId,
    viewerSeatIndex,
    roundNumber: masterState.roundNumber,
    currentTurnSeat: masterState.currentTurnSeat,
    turnPhase: masterState.turnPhase,
    heroDraft: projectHeroDraftForViewer(masterState.heroDraft, viewerSeatIndex),
    drawPileCount: masterState.drawPile.length,
    discardPileCount: masterState.discardPile.length,
    discardPileTop: topDiscard && discardFace
      ? {
          id: topDiscard.id,
          suit: topDiscard.suit,
          rank: topDiscard.rank,
          cardKey: discardFace.cardKey,
          nameVi: discardFace.nameVi,
          category: discardFace.category,
        }
      : topDiscard ? (physicalFace as typeof topDiscard) : null,
    harvestPool: (masterState.harvestPool ?? []).map((card) => ({ ...card })),
    players: publicPlayers,
    activeInterrupt,
    ...(masterState.turnFlags ? { turnFlags: { ...masterState.turnFlags } } : {}),
    actionLog: [...masterState.actionLog],
    refereeAuditLog: [...masterState.refereeAuditLog],
    winningFaction: masterState.winningFaction,
    winnerUserIds: [...masterState.winnerUserIds],
  };
}
