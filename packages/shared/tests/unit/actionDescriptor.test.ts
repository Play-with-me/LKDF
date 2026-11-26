import { describe, expect, it } from 'vitest';
import {
  classifyInterruptPrimitive,
  describeAvailableActions,
  projectStateForPlayer,
  type CardInstance,
  type GenericPrimitiveKind,
  type InterruptFrame,
  type MasterGameState,
  type PlayerViewState,
} from '../../src/index.js';

const CANONICAL_PRIMITIVES = new Set<GenericPrimitiveKind>([
  'PROMPT_CONFIRM',
  'PROMPT_SELECT_CARDS',
  'PROMPT_SELECT_TARGETS',
  'PROMPT_REORDER_CARDS',
  'PROMPT_CHOOSE_OPTION',
  'PROMPT_PICK_FROM_POOL',
  'PROMPT_DISTRIBUTE_CARDS',
  'PROMPT_RESPOND_CARD',
]);

function makeCard(id: string, cardKey = 'sat'): CardInstance {
  return {
    id,
    cardKey,
    nameVi: cardKey === 'dao' ? 'Đào' : 'Sát',
    category: 'BASIC',
    suit: 'HEART',
    rank: 7,
  };
}

function makeSampleMasterState(): MasterGameState {
  return {
    matchId: 'test-action-descriptor',
    rulesetVersion: '1.0.0',
    enabledPacks: ['legacy_standard'],
    contentHash: 'abcd1234',
    roundNumber: 2,
    currentTurnSeat: 0,
    turnPhase: 'PLAY',
    peacefulFirstRound: true,
    heroDraft: null,
    drawPile: [],
    discardPile: [],
    players: [
      {
        seatIndex: 0,
        userId: 'u0',
        displayName: 'P0',
        avatarUrl: '',
        identity: 'LORD',
        isIdentityRevealed: true,
        heroId: 'cao_cao',
        hp: 3,
        maxHp: 5,
        alive: true,
        handCards: [makeCard('c1', 'sat'), makeCard('c2', 'dao')],
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
        delayedScrolls: [],
        autoSkipNullification: false,
        isBotTakeover: false,
      },
      {
        seatIndex: 1,
        userId: 'u1',
        displayName: 'P1',
        avatarUrl: '',
        identity: 'REBEL',
        isIdentityRevealed: false,
        heroId: 'zhao_yun',
        hp: 4,
        maxHp: 4,
        alive: true,
        handCards: [makeCard('c3', 'sat')],
        equipments: {
          weapon: null,
          armor: null,
          plusOneHorse: null,
          minusOneHorse: null,
        },
        delayedScrolls: [],
        autoSkipNullification: false,
        isBotTakeover: false,
      },
    ],
    interruptStack: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
    actionLog: [],
    refereeAuditLog: [],
    winningFaction: null,
    winnerUserIds: [],
  };
}

describe('Generic Primitives, GameEvent Projection & ActionDescriptor', () => {
  it('maps every InterruptFrame kind cleanly onto the 8 canonical primitives', () => {
    const allKinds: InterruptFrame['kind'][] = [
      'WAIT_NULLIFICATION',
      'ASK_TU_HUNG',
      'WAIT_DODGE',
      'ASK_QUAN_THACH_PHU',
      'ASK_THANH_LONG',
      'ASK_HAN_BANG_KIEM',
      'ASK_KY_LAN_CUNG',
      'WAIT_DUEL_SAT',
      'WAIT_COLLATERAL_SAT',
      'WAIT_AOE_SAT',
      'WAIT_AOE_DODGE',
      'WAIT_HARVEST_PICK',
      'PICK_TARGET_CARD',
      'WAIT_PEACH_RESCUE',
      'WAIT_GUAN_XING',
      'ASK_LUO_SHEN',
      'WAIT_TU_XI',
      'ASK_LUO_YI',
      'ASK_KE_JI',
      'ASK_TIE_QI',
      'ASK_LIU_LI',
      'WAIT_GUI_CAI',
      'ASK_TIAN_DO',
      'ASK_JIAN_XIONG',
      'ASK_FAN_KUI',
      'ASK_GANG_LIE',
      'WAIT_GANG_LIE_CHOICE',
      'WAIT_YI_JI',
      'WAIT_FAN_JIAN_GUESS',
      'WAIT_JI_JIANG',
      'WAIT_HU_JIA',
    ];

    expect(allKinds).toHaveLength(31);

    const baseView = projectStateForPlayer(makeSampleMasterState(), 'u0');
    for (const kind of allKinds) {
      const syntheticView: PlayerViewState = {
        ...baseView,
        activeInterrupt: {
          id: `frame_${kind}`,
          kind,
          targetSeat: 0,
          sourceSeat: 1,
          responderSeat: 0,
          canRespondNullification: true,
        },
      };
      const primitive = classifyInterruptPrimitive(syntheticView);
      expect(primitive).not.toBeNull();
      expect(CANONICAL_PRIMITIVES.has(primitive!.kind)).toBe(true);
      expect(primitive!.sourceInterruptKind).toBe(kind);
    }
  });

  it('projects ASK_JIAN_XIONG damageCards safely without leaking opponent hands', () => {
    const master = makeSampleMasterState();
    const withJianXiong: MasterGameState = {
      ...master,
      interruptStack: [
        {
          id: 'jx_1',
          kind: 'ASK_JIAN_XIONG',
          targetSeat: 0,
          damageCards: [makeCard('dmg_sat', 'sat')],
        },
      ],
    };

    const p0View = projectStateForPlayer(withJianXiong, 'u0');
    expect(p0View.activeInterrupt?.kind).toBe('ASK_JIAN_XIONG');
    expect(p0View.activeInterrupt?.damageCards?.map((c) => c.id)).toEqual(['dmg_sat']);
    expect(p0View.players[1]?.handCards).toBeNull();

    const descriptor = describeAvailableActions(p0View);
    expect(descriptor.isViewerActor).toBe(true);
    expect(descriptor.primitive?.kind).toBe('PROMPT_CONFIRM');
    expect(descriptor.primitive?.damageCards).toHaveLength(1);
  });

  it('computes PLAY playable cards and DISCARD counts cleanly', () => {
    const master = makeSampleMasterState();
    const playView = projectStateForPlayer(master, 'u0');
    const playDesc = describeAvailableActions(playView);
    expect(playDesc.isViewerActor).toBe(true);
    expect(playDesc.canEndPlayPhase).toBe(true);
    expect(playDesc.playableCardIds).toEqual(['c1', 'c2']);
    expect(playDesc.promptKey).toBe('match.prompt.playPhase');

    const discardState: MasterGameState = {
      ...master,
      turnPhase: 'DISCARD',
      players: [
        {
          ...master.players[0]!,
          hp: 1,
          handCards: [makeCard('c1'), makeCard('c2'), makeCard('c4')],
        },
        master.players[1]!,
      ],
    };
    const discardDesc = describeAvailableActions(
      projectStateForPlayer(discardState, 'u0'),
    );
    expect(discardDesc.discardRequiredCount).toBe(2);
    expect(discardDesc.promptKey).toBe('match.prompt.discardPhase');
  });
});
