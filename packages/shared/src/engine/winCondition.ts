import type { CardInstance, MasterGameState } from '../types/game.js';
import type { WinningFaction } from '../types/identity.js';
import {
  appendToDiscardPile,
  dealCardsToSeat,
  getPlayerBySeat,
  updatePlayer,
} from './deck.js';

export interface WinEvaluation {
  readonly winningFaction: WinningFaction;
  readonly winnerUserIds: readonly string[];
}

/**
 * Kiểm tra điều kiện thắng theo REQUIREMENTS.md mục 3.1:
 * - Chủ Công & Trung Thần thắng: toàn bộ Phản Tặc và Nội Gián đều chết (Chủ Công còn sống).
 * - Nội Gián thắng: Chủ Công chết và người sống sót duy nhất cuối cùng là đúng 1 Nội Gián.
 * - Phản Tặc thắng: Chủ Công chết trong mọi trường hợp còn lại (kể cả khi cả 2 Nội Gián ở bàn 8 người còn sống).
 */
export function evaluateWinCondition(state: MasterGameState): WinEvaluation | null {
  const lord = state.players.find((p) => p.identity === 'LORD');
  const alivePlayers = state.players.filter((p) => p.alive);

  if (!lord || !lord.alive) {
    const singleSurvivor = alivePlayers.length === 1 ? alivePlayers[0] : undefined;
    if (singleSurvivor && singleSurvivor.identity === 'SPY') {
      return {
        winningFaction: 'SPY',
        winnerUserIds: [singleSurvivor.userId],
      };
    }

    return {
      winningFaction: 'REBEL',
      winnerUserIds: state.players
        .filter((p) => p.identity === 'REBEL')
        .map((p) => p.userId),
    };
  }

  const enemyAlive = alivePlayers.some(
    (p) => p.identity === 'REBEL' || p.identity === 'SPY',
  );
  if (!enemyAlive) {
    return {
      winningFaction: 'LORD_LOYALIST',
      winnerUserIds: state.players
        .filter((p) => p.identity === 'LORD' || p.identity === 'LOYALIST')
        .map((p) => p.userId),
    };
  }

  return null;
}

/**
 * Xử lý khi 1 người chơi tử vong:
 * 1. Đánh dấu tử vong, lật Thân Phận, bỏ toàn bộ bài trên tay + trang bị + khu phán xét.
 * 2. Kiểm tra điều kiện thắng ngay lập tức (nếu hết ván thì lật toàn bộ Thân Phận và dừng).
 * 3. Nếu ván tiếp tục: thưởng 3 lá nếu diệt Phản Tặc; phạt Chủ Công mất hết bài nếu giết Trung Thần.
 */
export function handlePlayerDeath(
  state: MasterGameState,
  victimSeat: number,
  killerSeat: number | null,
  rng: () => number = Math.random,
): MasterGameState {
  const victim = getPlayerBySeat(state, victimSeat);
  const droppedCards: CardInstance[] = [
    ...victim.handCards,
    ...(victim.equipments.weapon ? [victim.equipments.weapon] : []),
    ...(victim.equipments.armor ? [victim.equipments.armor] : []),
    ...(victim.equipments.plusOneHorse ? [victim.equipments.plusOneHorse] : []),
    ...(victim.equipments.minusOneHorse ? [victim.equipments.minusOneHorse] : []),
    ...victim.delayedScrolls,
  ];

  let next = updatePlayer(state, victimSeat, (player) => ({
    ...player,
    alive: false,
    hp: Math.min(0, player.hp),
    isIdentityRevealed: true,
    handCards: [],
    equipments: {
      weapon: null,
      armor: null,
      plusOneHorse: null,
      minusOneHorse: null,
    },
    delayedScrolls: [],
  }));
  next = appendToDiscardPile(next, droppedCards);

  if (next.harvestPool && next.harvestPool.length > 0 && victim.seatIndex === next.currentTurnSeat) {
    // Giữ nguyên harvestPool nếu đang trong Ngũ Cốc Phong Đăng (dọn khi queue kết thúc)
  }

  const identityLabel =
    victim.identity === 'LORD'
      ? 'Chủ Công'
      : victim.identity === 'LOYALIST'
        ? 'Trung Thần'
        : victim.identity === 'REBEL'
          ? 'Phản Tặc'
          : 'Nội Gián';

  next = {
    ...next,
    actionLog: [
      ...next.actionLog,
      `${victim.displayName} đã tử trận! Thân phận được công khai: ${identityLabel}.`,
    ],
  };

  const winResult = evaluateWinCondition(next);
  if (winResult) {
    const winLabel =
      winResult.winningFaction === 'LORD_LOYALIST'
        ? 'Chủ Công & Trung Thần chiến thắng!'
        : winResult.winningFaction === 'SPY'
          ? 'Nội Gián chiến thắng!'
          : 'Phản Tặc chiến thắng!';

    next = {
      ...next,
      turnPhase: 'GAME_OVER',
      interruptStack: [],
      pendingEffects: [],
      harvestPool: [],
      winningFaction: winResult.winningFaction,
      winnerUserIds: winResult.winnerUserIds,
      players: next.players.map((p) => ({
        ...p,
        isIdentityRevealed: true,
      })),
      actionLog: [...next.actionLog, `Ván đấu kết thúc: ${winLabel}`],
    };
    return next;
  }

  // Thưởng/Phạt kết liễu khi ván vẫn tiếp tục
  if (killerSeat !== null) {
    const killer = getPlayerBySeat(next, killerSeat);
    if (killer.alive) {
      if (victim.identity === 'REBEL') {
        const dealt = dealCardsToSeat(next, killerSeat, 3, rng);
        next = {
          ...dealt.state,
          actionLog: [
            ...dealt.state.actionLog,
            `${killer.displayName} tiêu diệt Phản Tặc, được rút thưởng ${dealt.dealt.length} lá bài.`,
          ],
        };
      } else if (
        victim.identity === 'LOYALIST' &&
        killer.identity === 'LORD'
      ) {
        const penaltyCards: CardInstance[] = [
          ...killer.handCards,
          ...(killer.equipments.weapon ? [killer.equipments.weapon] : []),
          ...(killer.equipments.armor ? [killer.equipments.armor] : []),
          ...(killer.equipments.plusOneHorse ? [killer.equipments.plusOneHorse] : []),
          ...(killer.equipments.minusOneHorse ? [killer.equipments.minusOneHorse] : []),
        ];
        next = updatePlayer(next, killerSeat, (p) => ({
          ...p,
          handCards: [],
          equipments: {
            weapon: null,
            armor: null,
            plusOneHorse: null,
            minusOneHorse: null,
          },
        }));
        next = appendToDiscardPile(next, penaltyCards);
        next = {
          ...next,
          actionLog: [
            ...next.actionLog,
            `Chủ Công ${killer.displayName} kết liễu Trung Thần, bị phạt hủy toàn bộ bài trên tay và trang bị!`,
          ],
        };
      }
    }
  }

  return next;
}
