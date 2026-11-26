import { describe, expect, it } from 'vitest';
import {
  CUU_CHAU_CARD_DISPLAY_BY_KEY,
  CUU_CHAU_DECK_TEMPLATES,
  CUU_CHAU_HEROES,
  applyGameAction,
  calculateDistance,
  canReachForSnatch,
  createCuuChau112Deck,
  createInitialMatchSetup,
  decideBotAction,
  describeAvailableActions,
  getPlayerMaxHandLimit,
  getPlayerMaxSatPerTurn,
  isCuuChauRuleset,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  startMatchCombat,
  stepEngine,
  type CardInstance,
  type HeroId,
  type MasterGameState,
  type SetupSeatInput,
} from '../../src/index.js';

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeSeats(count = 4): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `u-${idx}`,
    displayName: `P${idx + 1}`,
    avatarUrl: '',
  }));
}

function card(
  id: string,
  cardKey: string,
  nameVi: string,
  category: CardInstance['category'],
  suit: CardInstance['suit'] = 'SPADE',
  rank = 7,
  attackRange?: number,
): CardInstance {
  return {
    id,
    cardKey,
    nameVi,
    category,
    suit,
    rank,
    ...(attackRange !== undefined ? { attackRange } : {}),
  };
}

function setupCuuChauMatch(
  heroes: readonly [HeroId, HeroId, HeroId, HeroId],
  seed = 101,
): MasterGameState {
  const rng = createSeededRng(seed);
  const seats = makeSeats(4);
  let state = createInitialMatchSetup({
    matchId: 'cc-mech-test',
    seats,
    rng,
    enabledPacks: ['cuu_chau_core'],
  });
  const lordSeat = state.heroDraft!.lordSeatIndex;
  // Inject deterministic candidate pools for test repeatability
  const otherSeats = [0, 1, 2, 3].filter((s) => s !== lordSeat);
  state = {
    ...state,
    heroDraft: {
      ...state.heroDraft!,
      candidatesBySeat: {
        ...state.heroDraft!.candidatesBySeat,
        [lordSeat]: [heroes[0], ...state.heroDraft!.candidatesBySeat[lordSeat]!.filter((h) => h !== heroes[0])].slice(0, 5),
      },
    },
  };
  state = selectLordHero(state, lordSeat, heroes[0], rng);
  otherSeats.forEach((seat, idx) => {
    const heroId = heroes[idx + 1]!;
    state = {
      ...state,
      heroDraft: {
        ...state.heroDraft!,
        candidatesBySeat: {
          ...state.heroDraft!.candidatesBySeat,
          [seat]: [heroId, ...state.heroDraft!.candidatesBySeat[seat]!.filter((h) => h !== heroId)].slice(0, 3),
        },
      },
    };
    state = selectPlayerHero(state, seat, heroId);
  });

  state = startMatchCombat(state, rng, { deckFactory: createCuuChau112Deck });
  return {
    ...state,
    roundNumber: 2,
    peacefulFirstRound: false,
    turnPhase: 'PLAY',
    currentTurnSeat: 0,
    interruptStack: [],
    pendingEffects: [],
    turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false },
  };
}

describe('Phase 2A Slice 1 — Cửu Châu Core Ruleset & 10 Remixed Hero Kits', () => {
  it('activates cuu_chau_core pack metadata only when explicitly enabled', () => {
    const legacy = createInitialMatchSetup({ matchId: 'leg', seats: makeSeats(4) });
    expect(isCuuChauRuleset(legacy)).toBe(false);
    expect(legacy.rulesetVersion).toBe('1.0.0');

    const cuuChau = createInitialMatchSetup({
      matchId: 'cc',
      seats: makeSeats(4),
      enabledPacks: ['cuu_chau_core'],
    });
    expect(isCuuChauRuleset(cuuChau)).toBe(true);
    expect(cuuChau.rulesetVersion).toBe('2.0.0');
    expect(cuuChau.enabledPacks).toEqual(['cuu_chau_core']);
  });

  it('1. Lâm Thanh Vũ (liu_bei): draws +1 bonus card when HP <= 2 at Draw phase', () => {
    let state = setupCuuChauMatch(['liu_bei', 'cao_cao', 'sun_quan', 'lu_bu']);
    const lordSeat = state.players.find((p) => p.identity === 'LORD')!.seatIndex;
    state = {
      ...state,
      currentTurnSeat: lordSeat,
      turnPhase: 'DRAW',
      players: state.players.map((p) =>
        p.seatIndex === lordSeat ? { ...p, hp: 2, handCards: [] } : p,
      ),
    };
    const next = stepEngine(state, createSeededRng(1));
    const afterLord = next.players.find((p) => p.seatIndex === lordSeat)!;
    expect(afterLord.handCards).toHaveLength(3);
  });

  it('2. Lôi Chấn Sơn (zhang_fei): 3 baseMaxHp and permanent -1 offensive distance', () => {
    const state = setupCuuChauMatch(['liu_bei', 'zhang_fei', 'sun_quan', 'cao_cao']);
    const zf = state.players.find((p) => p.heroId === 'zhang_fei')!;
    expect(zf.maxHp).toBe(3);
    expect(zf.hp).toBe(3);
    const oppositeSeat = (zf.seatIndex + 2) % 4;
    expect(calculateDistance(state, zf.seatIndex, oppositeSeat)).toBe(1);
  });

  it('3. Tô Mộng Dao (huang_yue_ying): draws +1 card in Draw phase when geared', () => {
    let state = setupCuuChauMatch(['liu_bei', 'huang_yue_ying', 'sun_quan', 'cao_cao']);
    const seat = state.players.find((p) => p.heroId === 'huang_yue_ying')!.seatIndex;
    state = {
      ...state,
      currentTurnSeat: seat,
      turnPhase: 'DRAW',
      players: state.players.map((p) =>
        p.seatIndex === seat
          ? {
              ...p,
              handCards: [],
              equipments: {
                ...p.equipments,
                weapon: card('w1', 'thanh_cong_kiem', 'Thanh Phong Kiếm', 'WEAPON', 'SPADE', 6, 2),
              },
            }
          : p,
      ),
    };
    const next = stepEngine(state, createSeededRng(2));
    expect(next.players.find((p) => p.seatIndex === seat)!.handCards).toHaveLength(3);
  });

  it('4. Hàn Thiết Phong (cao_cao): claims damaging card AND draws +1 extra card on RESPOND_JIAN_XIONG', () => {
    let state = setupCuuChauMatch(['cao_cao', 'liu_bei', 'sun_quan', 'lu_bu']);
    const ccSeat = state.players.find((p) => p.heroId === 'cao_cao')!.seatIndex;
    const dmgCard = card('s1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    state = {
      ...state,
      discardPile: [dmgCard],
      players: state.players.map((p) =>
        p.seatIndex === ccSeat ? { ...p, handCards: [] } : p,
      ),
      interruptStack: [
        {
          id: 'jx_1',
          kind: 'ASK_JIAN_XIONG',
          targetSeat: ccSeat,
          damageCards: [dmgCard],
        },
      ],
    };
    const next = applyGameAction(
      state,
      { type: 'RESPOND_JIAN_XIONG', seatIndex: ccSeat, activate: true },
      createSeededRng(3),
    );
    const ccAfter = next.players.find((p) => p.seatIndex === ccSeat)!;
    expect(ccAfter.handCards).toHaveLength(2);
    expect(ccAfter.handCards.some((c) => c.id === 's1')).toBe(true);
  });

  it('5. Trương Huy Diệu (zhang_liao) & 10. Thẩm Mặc Ngôn (lu_bu): permanent -1 offensive distance', () => {
    const state = setupCuuChauMatch(['liu_bei', 'zhang_liao', 'lu_bu', 'sun_quan']);
    const zlSeat = state.players.find((p) => p.heroId === 'zhang_liao')!.seatIndex;
    const lbSeat = state.players.find((p) => p.heroId === 'lu_bu')!.seatIndex;
    expect(calculateDistance(state, zlSeat, (zlSeat + 2) % 4)).toBe(1);
    expect(calculateDistance(state, lbSeat, (lbSeat + 2) % 4)).toBe(1);
  });

  it('6. Viêm Liệt Vương (sun_quan): zhi_heng draws +1 extra when remaining hand <= 1', () => {
    let state = setupCuuChauMatch(['sun_quan', 'liu_bei', 'cao_cao', 'lu_bu']);
    const sqSeat = state.players.find((p) => p.heroId === 'sun_quan')!.seatIndex;
    const c1 = card('c1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const c2 = card('c2', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 2);
    state = {
      ...state,
      currentTurnSeat: sqSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === sqSeat ? { ...p, handCards: [c1, c2] } : p,
      ),
    };
    const next = applyGameAction(
      state,
      { type: 'ACTIVATE_HERO_SKILL', seatIndex: sqSeat, skillId: 'zhi_heng', cardIds: ['c1'] },
      createSeededRng(4),
    );
    // Remaining hand was 1 (<=1), discarded 1 -> drew 2 -> total 3 cards!
    expect(next.players.find((p) => p.seatIndex === sqSeat)!.handCards).toHaveLength(3);
  });

  it('7. Lục Trầm Ẩn (lu_meng): draws +1 card at turn END when no Strike used this turn', () => {
    let state = setupCuuChauMatch(['liu_bei', 'lu_meng', 'sun_quan', 'cao_cao']);
    const lmSeat = state.players.find((p) => p.heroId === 'lu_meng')!.seatIndex;
    state = {
      ...state,
      currentTurnSeat: lmSeat,
      turnPhase: 'END',
      turnFlags: { satUsedThisTurn: 0, satPlayedOrUsedThisTurn: false, skipPlayPhase: false },
      players: state.players.map((p) =>
        p.seatIndex === lmSeat ? { ...p, handCards: [] } : p,
      ),
    };
    const next = stepEngine(state, createSeededRng(5));
    expect(next.players.find((p) => p.seatIndex === lmSeat)!.handCards).toHaveLength(1);
  });

  it('8. Mộ Dung Tuyết (lu_xun): canReachForSnatch ignores distance limits in both Master and PlayerView', () => {
    const state = setupCuuChauMatch(['liu_bei', 'lu_xun', 'sun_quan', 'cao_cao']);
    const lx = state.players.find((p) => p.heroId === 'lu_xun')!;
    const farSeat = (lx.seatIndex + 2) % 4;
    expect(calculateDistance(state, lx.seatIndex, farSeat)).toBe(2);
    expect(canReachForSnatch(state, lx.seatIndex, farSeat)).toBe(true);
    const view = projectStateForPlayer(state, lx.userId);
    expect(canReachForSnatch(view, lx.seatIndex, farSeat)).toBe(true);
  });

  it('9. Bạch Cẩm Y (sun_shang_xiang): draws +1 bonus card whenever playing a normal scroll', () => {
    let state = setupCuuChauMatch(['liu_bei', 'sun_shang_xiang', 'sun_quan', 'cao_cao']);
    const ssxSeat = state.players.find((p) => p.heroId === 'sun_shang_xiang')!.seatIndex;
    const scroll = card('sc1', 'vo_trung_sinh_huu', 'Tụ Khí Quyết', 'NORMAL_SCROLL', 'HEART', 7);
    state = {
      ...state,
      currentTurnSeat: ssxSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === ssxSeat
          ? { ...p, handCards: [scroll] }
          : { ...p, handCards: [] },
      ),
    };
    let next = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: ssxSeat, cardIds: ['sc1'] },
      createSeededRng(6),
    );
    // Clear simulated nullification so the scroll resolves too
    while (next.interruptStack[0]?.kind === 'WAIT_NULLIFICATION') {
      const top = next.interruptStack[0];
      if (top.isSimulatedDelay) {
        next = applyGameAction(next, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }, createSeededRng(6));
      } else {
        const seat = top.eligibleSeats.find((s) => !top.passedSeats.includes(s))!;
        next = applyGameAction(next, { type: 'RESPOND_NULLIFICATION', seatIndex: seat, cardId: null }, createSeededRng(6));
      }
    }
    // 1 bonus draw from Blade Dancer + 2 draws from Qi Surge = 3 cards
    expect(next.players.find((p) => p.seatIndex === ssxSeat)!.handCards).toHaveLength(3);
  });
});

describe('Phase 2A Slice 2 — 5 Original Cửu Châu Cards Breaking the 108-Card Matrix', () => {
  it('replaces 4 legacy slots + adds 4 slots = exact 112 cards (28/28/28/28) including 5 new cardKeys', () => {
    expect(CUU_CHAU_DECK_TEMPLATES).toHaveLength(112);
    const suitCounts = { SPADE: 0, HEART: 0, CLUB: 0, DIAMOND: 0 };
    const keyCounts = new Map<string, number>();
    for (const tpl of CUU_CHAU_DECK_TEMPLATES) {
      suitCounts[tpl.suit] += 1;
      keyCounts.set(tpl.cardKey, (keyCounts.get(tpl.cardKey) ?? 0) + 1);
    }
    expect(suitCounts).toEqual({ SPADE: 28, HEART: 28, CLUB: 28, DIAMOND: 28 });
    expect(keyCounts.get('pha_giap_tram')).toBe(2);
    expect(keyCounts.get('chan_khi_ho_the')).toBe(2);
    expect(keyCounts.get('kinh_loi_chan')).toBe(2);
    expect(keyCounts.get('hoan_anh_giap')).toBe(1);
    expect(keyCounts.get('tu_khi_hoan')).toBe(1);
    expect(keyCounts.get('nhan_vuong_thuan')).toBeUndefined();
    for (const k of ['pha_giap_tram', 'chan_khi_ho_the', 'kinh_loi_chan', 'hoan_anh_giap', 'tu_khi_hoan']) {
      expect(CUU_CHAU_CARD_DISPLAY_BY_KEY[k]?.nameVi.length).toBeGreaterThan(2);
      expect(CUU_CHAU_CARD_DISPLAY_BY_KEY[k]?.nameEn.length).toBeGreaterThan(2);
    }
  });

  it('pha_giap_tram ignores equipped armor, draws 1 card on hit, and shares 1/turn Strike limit', () => {
    let state = setupCuuChauMatch(['liu_bei', 'cao_cao', 'sun_quan', 'zhang_liao']);
    const pierce = card('pg1', 'pha_giap_tram', 'Phá Giáp Trảm', 'BASIC', 'SPADE', 4);
    const secondSat = card('s2', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 10);
    const bagua = card('bg1', 'bat_quai_tran', 'Bát Quái Y', 'ARMOR', 'SPADE', 2);
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === 0
          ? { ...p, handCards: [pierce, secondSat] }
          : p.seatIndex === 1
            ? { ...p, hp: 4, handCards: [], equipments: { ...p.equipments, armor: bagua } }
            : p,
      ),
    };
    let next = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['pg1'], targetSeats: [1] },
      createSeededRng(11),
    );
    const dodgeTop = next.interruptStack[0];
    expect(dodgeTop?.kind).toBe('WAIT_DODGE');
    if (dodgeTop?.kind === 'WAIT_DODGE') {
      expect(dodgeTop.allowBagua).toBe(false);
    }
    next = applyGameAction(next, { type: 'RESPOND_DODGE', seatIndex: 1, cardId: null }, createSeededRng(11));
    if (next.interruptStack[0]?.kind === 'ASK_JIAN_XIONG') {
      next = applyGameAction(next, { type: 'RESPOND_JIAN_XIONG', seatIndex: 1, activate: false }, createSeededRng(11));
    }
    expect(next.players[1]!.hp).toBe(3);
    // Attacker drew 1 card on hit (still holds secondSat + 1 drawn = 2)
    expect(next.players[0]!.handCards).toHaveLength(2);
    // Shares 1/turn Strike limit
    expect(() =>
      applyGameAction(next, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['s2'], targetSeats: [1] }, createSeededRng(11)),
    ).toThrow('SAT_LIMIT_REACHED');
  });

  it('chan_khi_ho_the heals 1 HP + draws 1 when wounded, or draws 2 at full HP', () => {
    let state = setupCuuChauMatch(['liu_bei', 'cao_cao', 'sun_quan', 'zhang_liao']);
    const ward1 = card('ck1', 'chan_khi_ho_the', 'Chân Khí Hộ Thể', 'NORMAL_SCROLL', 'HEART', 5);
    const ward2 = card('ck2', 'chan_khi_ho_the', 'Chân Khí Hộ Thể', 'NORMAL_SCROLL', 'DIAMOND', 6);
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === 0 ? { ...p, hp: p.maxHp - 1, handCards: [ward1, ward2] } : { ...p, handCards: [] },
      ),
    };
    const clearNullify = (s: MasterGameState) => {
      let cur = s;
      while (cur.interruptStack[0]?.kind === 'WAIT_NULLIFICATION') {
        const t = cur.interruptStack[0];
        cur = t.isSimulatedDelay
          ? applyGameAction(cur, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }, createSeededRng(12))
          : applyGameAction(
              cur,
              { type: 'RESPOND_NULLIFICATION', seatIndex: t.eligibleSeats.find((x) => !t.passedSeats.includes(x))!, cardId: null },
              createSeededRng(12),
            );
      }
      return cur;
    };

    let afterFirst = clearNullify(
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['ck1'] }, createSeededRng(12)),
    );
    expect(afterFirst.players[0]!.hp).toBe(afterFirst.players[0]!.maxHp);
    expect(afterFirst.players[0]!.handCards).toHaveLength(2); // ward2 + 1 drawn

    let afterSecond = clearNullify(
      applyGameAction(afterFirst, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['ck2'] }, createSeededRng(12)),
    );
    expect(afterSecond.players[0]!.handCards).toHaveLength(3); // remaining 1 + 2 drawn at full HP
  });

  it('kinh_loi_chan deals 1 damage if target has <= 1 hand card, else opens DISMANTLE pick', () => {
    let state = setupCuuChauMatch(['liu_bei', 'cao_cao', 'sun_quan', 'zhang_liao']);
    const pulse1 = card('kl1', 'kinh_loi_chan', 'Kinh Lôi Chấn', 'NORMAL_SCROLL', 'SPADE', 3);
    const pulse2 = card('kl2', 'kinh_loi_chan', 'Kinh Lôi Chấn', 'NORMAL_SCROLL', 'DIAMOND', 3);
    const oppA = card('oa1', 'sat', 'Kiếm Trảm', 'BASIC', 'CLUB', 7);
    const oppB = card('ob1', 'sat', 'Kiếm Trảm', 'BASIC', 'CLUB', 8);
    const oppB2 = card('ob2', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 9);
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) => {
        if (p.seatIndex === 0) return { ...p, handCards: [pulse1, pulse2] };
        if (p.seatIndex === 1) return { ...p, hp: 4, handCards: [oppA] };
        if (p.seatIndex === 2) return { ...p, hp: 4, handCards: [oppB, oppB2] };
        return { ...p, handCards: [] };
      }),
    };
    const clearNullify = (s: MasterGameState) => {
      let cur = s;
      while (cur.interruptStack[0]?.kind === 'WAIT_NULLIFICATION') {
        const t = cur.interruptStack[0];
        cur = t.isSimulatedDelay
          ? applyGameAction(cur, { type: 'RESOLVE_SIMULATED_NULLIFICATION' }, createSeededRng(13))
          : applyGameAction(
              cur,
              { type: 'RESPOND_NULLIFICATION', seatIndex: t.eligibleSeats.find((x) => !t.passedSeats.includes(x))!, cardId: null },
              createSeededRng(13),
            );
      }
      return cur;
    };

    let s1 = clearNullify(
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['kl1'], targetSeats: [1] }, createSeededRng(13)),
    );
    if (s1.interruptStack[0]?.kind === 'ASK_JIAN_XIONG') {
      s1 = applyGameAction(s1, { type: 'RESPOND_JIAN_XIONG', seatIndex: 1, activate: false }, createSeededRng(13));
    }
    expect(s1.players[1]!.hp).toBe(3);

    let s2 = clearNullify(
      applyGameAction(s1, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['kl2'], targetSeats: [2] }, createSeededRng(13)),
    );
    expect(s2.interruptStack[0]?.kind).toBe('PICK_TARGET_CARD');
    s2 = applyGameAction(
      s2,
      { type: 'RESPOND_PICK_TARGET_CARD', seatIndex: 0, zone: 'HAND', handIndex: 0 },
      createSeededRng(13),
    );
    expect(s2.players[2]!.handCards).toHaveLength(1);
    expect(s2.players[2]!.hp).toBe(4);
  });

  it('hoan_anh_giap clamps >=2 damage down to 1, and tu_khi_hoan draws 1 card when Strike is dodged', () => {
    let state = setupCuuChauMatch(['liu_bei', 'xu_chu', 'sun_quan', 'zhang_liao']);
    const ring = card('tk1', 'tu_khi_hoan', 'Tụ Khí Hoàn', 'WEAPON', 'HEART', 12, 2);
    const cloak = card('ha1', 'hoan_anh_giap', 'Huyễn Ảnh Giáp', 'ARMOR', 'CLUB', 2);
    const strike1 = card('s1', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 9);
    const dodge1 = card('t1', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 7);
    const strike2 = card('s2', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 8);

    // 1) Ring draws 1 when dodged
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === 0
          ? { ...p, handCards: [strike1], equipments: { ...p.equipments, weapon: ring } }
          : p.seatIndex === 2
            ? { ...p, handCards: [dodge1], equipments: { ...p.equipments, armor: cloak } }
            : p.seatIndex === 1
              ? { ...p, handCards: [strike2] }
              : p,
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['s1'], targetSeats: [2] },
      createSeededRng(14),
    );
    s1 = applyGameAction(s1, { type: 'RESPOND_DODGE', seatIndex: 2, cardId: 't1' }, createSeededRng(14));
    expect(s1.players[0]!.handCards).toHaveLength(1); // drew 1 from tu_khi_hoan!

    // 2) Cloak clamps Xu Chu Luo Yi 2-damage Strike to 1 damage
    let s2: MasterGameState = {
      ...s1,
      currentTurnSeat: 1,
      turnPhase: 'PLAY',
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false, luoYiActive: true },
    };
    const beforeHp = s2.players[2]!.hp;
    s2 = applyGameAction(
      s2,
      { type: 'PLAY_CARD', seatIndex: 1, cardIds: ['s2'], targetSeats: [2] },
      createSeededRng(14),
    );
    s2 = applyGameAction(s2, { type: 'RESPOND_DODGE', seatIndex: 2, cardId: null }, createSeededRng(14));
    expect(s2.players[2]!.hp).toBe(beforeHp - 1);
  });
});

describe('Phase 2B Slice 1 — Thanh Vân Môn Remaining 4 Hero Remixes', () => {
  it('11. Triệu Thiên Hành (guan_yu): Red Strike hit draws 1 card once per turn', () => {
    let state = setupCuuChauMatch(['liu_bei', 'guan_yu', 'sun_quan', 'zhang_liao']);
    const gySeat = state.players.find((p) => p.heroId === 'guan_yu')!.seatIndex;
    const victimSeat = (gySeat + 1) % 4;
    const lienNo = card('ln1', 'gia_cat_lien_no', 'Liên Hoàn Nỏ', 'WEAPON', 'CLUB', 1, 1);
    const redCard1 = card('r1', 'dao', 'Hồi Xuân Đan', 'BASIC', 'HEART', 3);
    const redCard2 = card('r2', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 4);
    state = {
      ...state,
      currentTurnSeat: gySeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === gySeat
          ? { ...p, handCards: [redCard1, redCard2], equipments: { ...p.equipments, weapon: lienNo } }
          : p.seatIndex === victimSeat
            ? { ...p, hp: 4, handCards: [] }
            : p,
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: gySeat, cardIds: ['r1'], targetSeats: [victimSeat], asCardKey: 'sat' },
      createSeededRng(21),
    );
    s1 = applyGameAction(s1, { type: 'RESPOND_DODGE', seatIndex: victimSeat, cardId: null }, createSeededRng(21));
    expect(s1.players[victimSeat]!.hp).toBe(3);
    expect(s1.turnFlags?.crimsonEdgeDrawnThisTurn).toBe(true);
    // Had [r1, r2], spent r1 -> 1 left + 1 drawn from Crimson Edge = 2 hand cards
    expect(s1.players[gySeat]!.handCards).toHaveLength(2);

    // 2nd Red Strike hit same turn does NOT trigger Crimson Edge again
    let s2 = applyGameAction(
      s1,
      { type: 'PLAY_CARD', seatIndex: gySeat, cardIds: ['r2'], targetSeats: [victimSeat], asCardKey: 'sat' },
      createSeededRng(21),
    );
    s2 = applyGameAction(s2, { type: 'RESPOND_DODGE', seatIndex: victimSeat, cardId: null }, createSeededRng(21));
    expect(s2.players[victimSeat]!.hp).toBe(2);
    expect(s2.players[gySeat]!.handCards).toHaveLength(1);
  });

  it('12. Thẩm Tinh Hà (zhuge_liang): +1 max hand limit and Empty Mind blocks kinh_loi_chan & pha_giap_tram', () => {
    let state = setupCuuChauMatch(['liu_bei', 'zhuge_liang', 'sun_quan', 'cao_cao']);
    const zlSeat = state.players.find((p) => p.heroId === 'zhuge_liang')!.seatIndex;
    const pulse = card('kl_z', 'kinh_loi_chan', 'Kinh Lôi Chấn', 'NORMAL_SCROLL', 'SPADE', 3);
    const pierce = card('pg_z', 'pha_giap_tram', 'Phá Giáp Trảm', 'BASIC', 'CLUB', 1);
    const extra1 = card('ex1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const extra2 = card('ex2', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 8);
    const extra3 = card('ex3', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 9);
    const extra4 = card('ex4', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 10);
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === 0
          ? { ...p, handCards: [pulse, pierce] }
          : p.seatIndex === zlSeat
            ? { ...p, hp: 3, handCards: [] }
            : p,
      ),
    };
    const zlEmpty = state.players[zlSeat]!;
    expect(getPlayerMaxHandLimit(state, zlEmpty)).toBe(4);
    expect(() =>
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['kl_z'], targetSeats: [zlSeat] }, createSeededRng(22)),
    ).toThrow('TARGET_IMMUNE_TO_CARD');
    expect(() =>
      applyGameAction(state, { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['pg_z'], targetSeats: [zlSeat] }, createSeededRng(22)),
    ).toThrow('TARGET_IMMUNE_TO_CARD');

    // Discard phase allows keeping 4 cards (3 HP + 1 Astral Chart)
    const discardState: MasterGameState = {
      ...state,
      currentTurnSeat: zlSeat,
      turnPhase: 'DISCARD',
      players: state.players.map((p) =>
        p.seatIndex === zlSeat ? { ...p, hp: 3, handCards: [extra1, extra2, extra3, extra4] } : p,
      ),
    };
    const afterDiscard = stepEngine(discardState, createSeededRng(22));
    expect(afterDiscard.players[zlSeat]!.handCards).toHaveLength(4);
    expect(afterDiscard.currentTurnSeat).not.toBe(zlSeat);
  });

  it('13. Bạch Ngọc Thành (zhao_yun): playing Shadow Step out-of-turn with <=2 hand remaining draws 1', () => {
    let state = setupCuuChauMatch(['liu_bei', 'zhao_yun', 'sun_quan', 'cao_cao']);
    const zySeat = state.players.find((p) => p.heroId === 'zhao_yun')!.seatIndex;
    const strike = card('st_zy', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const dodgeSat = card('ds_zy', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 8);
    const extra = card('e_zy', 'dao', 'Hồi Xuân Đan', 'BASIC', 'HEART', 9);
    state = {
      ...state,
      currentTurnSeat: 0,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === 0
          ? { ...p, handCards: [strike] }
          : p.seatIndex === zySeat
            ? { ...p, handCards: [dodgeSat, extra] }
            : p,
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: 0, cardIds: ['st_zy'], targetSeats: [zySeat] },
      createSeededRng(23),
    );
    s1 = applyGameAction(
      s1,
      { type: 'RESPOND_DODGE', seatIndex: zySeat, cardId: 'ds_zy' },
      createSeededRng(23),
    );
    // Left with [extra] (1 <= 2), drew 1 -> total 2 cards
    expect(s1.players[zySeat]!.handCards).toHaveLength(2);
  });

  it('14. Khương Vô Tà (ma_chao): Black Tie Qi flip draws 1 compensation card', () => {
    let state = setupCuuChauMatch(['liu_bei', 'ma_chao', 'sun_quan', 'cao_cao']);
    const mcSeat = state.players.find((p) => p.heroId === 'ma_chao')!.seatIndex;
    const victimSeat = (mcSeat + 1) % 4;
    const blackJudge = card('bj_mc', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 9);
    const strike = card('st_mc', 'sat', 'Kiếm Trảm', 'BASIC', 'CLUB', 6);
    state = {
      ...state,
      currentTurnSeat: mcSeat,
      turnPhase: 'PLAY',
      drawPile: [blackJudge, ...state.drawPile],
      players: state.players.map((p) =>
        p.seatIndex === mcSeat
          ? { ...p, handCards: [strike] }
          : p.seatIndex === victimSeat
            ? { ...p, handCards: [] }
            : p,
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: mcSeat, cardIds: ['st_mc'], targetSeats: [victimSeat] },
      createSeededRng(24),
    );
    expect(s1.interruptStack[0]?.kind).toBe('ASK_TIE_QI');
    s1 = applyGameAction(
      s1,
      { type: 'RESPOND_TIE_QI', seatIndex: mcSeat, activate: true },
      createSeededRng(24),
    );
    // Judge flipped blackJudge (SPADE), so Ma Chao missed lock and compensated by drawing 1 card!
    expect(s1.players[mcSeat]!.handCards).toHaveLength(1);
  });
});

describe('Phase 2B Slice 2 — Huyền Thiết Phủ Remaining 5 Hero Remixes', () => {
  it('15. Cố Huyền Cơ (si_ma_yi): replacing a judgment card via Gui Cai draws 1 card', () => {
    let state = setupCuuChauMatch(['liu_bei', 'si_ma_yi', 'sun_quan', 'cao_cao']);
    const smSeat = state.players.find((p) => p.heroId === 'si_ma_yi')!.seatIndex;
    const oldJudge = card('jg0', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 5);
    const swapCard = card('sw1', 'thiem', 'Thân Pháp', 'BASIC', 'SPADE', 2);
    state = {
      ...state,
      players: state.players.map((p) =>
        p.seatIndex === smSeat ? { ...p, handCards: [swapCard] } : p,
      ),
      pendingEffects: [
        {
          kind: 'RESOLVE_JUDGMENT',
          purpose: 'LAC_BAT_TU_THUC',
          ownerSeat: 0,
          judgeCard: oldJudge,
        },
      ],
      interruptStack: [
        {
          id: 'gc_1',
          kind: 'WAIT_GUI_CAI',
          targetSeat: smSeat,
          judgeOwnerSeat: 0,
          judgePurpose: 'LAC_BAT_TU_THUC',
          judgeCard: oldJudge,
        },
      ],
    };
    const next = applyGameAction(
      state,
      { type: 'RESPOND_GUI_CAI', seatIndex: smSeat, cardId: 'sw1' },
      createSeededRng(25),
    );
    // Replaced with sw1 -> drew 1 card -> still has 1 card in hand!
    expect(next.players[smSeat]!.handCards).toHaveLength(1);
    expect(next.players[smSeat]!.handCards[0]!.id).not.toBe('sw1');
  });

  it('16. Nghiêm Cương (xia_hou_dun): Heart Gang Lie draws 1 card & +1 hand limit while wounded', () => {
    let state = setupCuuChauMatch(['liu_bei', 'xia_hou_dun', 'sun_quan', 'cao_cao']);
    const xhdSeat = state.players.find((p) => p.heroId === 'xia_hou_dun')!.seatIndex;
    const fullPlayer = state.players[xhdSeat]!;
    expect(getPlayerMaxHandLimit(state, fullPlayer)).toBe(fullPlayer.hp);

    const woundedHeart = card('jh1', 'dao', 'Hồi Xuân Đan', 'BASIC', 'HEART', 6);
    state = {
      ...state,
      drawPile: [woundedHeart, ...state.drawPile],
      players: state.players.map((p) =>
        p.seatIndex === xhdSeat ? { ...p, hp: p.maxHp - 1, handCards: [] } : p,
      ),
      interruptStack: [
        {
          id: 'gl_1',
          kind: 'ASK_GANG_LIE',
          targetSeat: xhdSeat,
          sourceSeat: 0,
        },
      ],
    };
    expect(getPlayerMaxHandLimit(state, state.players[xhdSeat]!)).toBe(state.players[xhdSeat]!.hp + 1);

    const next = applyGameAction(
      state,
      { type: 'RESPOND_GANG_LIE', seatIndex: xhdSeat, activate: true },
      createSeededRng(26),
    );
    // Flipped HEART -> Gang Lie missed, so Nghiêm Cương drew 1 card
    expect(next.players[xhdSeat]!.handCards).toHaveLength(1);
  });

  it('17. Thạch Phá Thiên (xu_chu): active Luo Yi gives -1 offensive distance during his turn', () => {
    let state = setupCuuChauMatch(['liu_bei', 'xu_chu', 'sun_quan', 'cao_cao']);
    const xcSeat = state.players.find((p) => p.heroId === 'xu_chu')!.seatIndex;
    const oppositeSeat = (xcSeat + 2) % 4;
    expect(calculateDistance(state, xcSeat, oppositeSeat)).toBe(2);

    const withLuoYi: MasterGameState = {
      ...state,
      currentTurnSeat: xcSeat,
      turnFlags: { satUsedThisTurn: 0, skipPlayPhase: false, luoYiActive: true },
    };
    expect(calculateDistance(withLuoYi, xcSeat, oppositeSeat)).toBe(1);
  });

  it('18. Lý Tri Vi (guo_jia): +1 max hand limit and draws 1 at END if wounded and hand <= 1', () => {
    let state = setupCuuChauMatch(['liu_bei', 'guo_jia', 'sun_quan', 'cao_cao']);
    const gjSeat = state.players.find((p) => p.heroId === 'guo_jia')!.seatIndex;
    state = {
      ...state,
      currentTurnSeat: gjSeat,
      turnPhase: 'END',
      players: state.players.map((p) =>
        p.seatIndex === gjSeat ? { ...p, hp: p.maxHp - 1, handCards: [] } : p,
      ),
    };
    expect(getPlayerMaxHandLimit(state, state.players[gjSeat]!)).toBe(state.players[gjSeat]!.hp + 1);
    const next = stepEngine(state, createSeededRng(28));
    expect(next.players[gjSeat]!.handCards).toHaveLength(1);
  });

  it('19. Thủy U Linh (zhen_ji): +1 defensive distance while wearing no Armor', () => {
    let state = setupCuuChauMatch(['liu_bei', 'zhen_ji', 'sun_quan', 'cao_cao']);
    const zjSeat = state.players.find((p) => p.heroId === 'zhen_ji')!.seatIndex;
    const attackerSeat = (zjSeat + 1) % 4;
    expect(calculateDistance(state, attackerSeat, zjSeat)).toBe(2);

    const withArmor: MasterGameState = {
      ...state,
      players: state.players.map((p) =>
        p.seatIndex === zjSeat
          ? {
              ...p,
              equipments: {
                ...p.equipments,
                armor: card('ar1', 'bat_quai_tran', 'Bát Quái Y', 'ARMOR', 'SPADE', 2),
              },
            }
          : p,
      ),
    };
    expect(calculateDistance(withArmor, attackerSeat, zjSeat)).toBe(1);
  });
});

describe('Phase 2B Slice 3 — Xích Diễm Bang Remaining 4 Hero Remixes', () => {
  it('20. Cam Dạ Sát (gan_ning): playing scroll (including Black Break Formation) with <=2 hand remaining draws 1 once/turn', () => {
    let state = setupCuuChauMatch(['liu_bei', 'gan_ning', 'sun_quan', 'cao_cao']);
    const gnSeat = state.players.find((p) => p.heroId === 'gan_ning')!.seatIndex;
    const victimSeat = (gnSeat + 1) % 4;
    const black1 = card('b1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 6);
    const black2 = card('b2', 'thiem', 'Thân Pháp', 'BASIC', 'CLUB', 5);
    const oppCard1 = card('oc1', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 7);
    const oppCard2 = card('oc2', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 8);
    state = {
      ...state,
      currentTurnSeat: gnSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === gnSeat
          ? { ...p, handCards: [black1, black2] }
          : p.seatIndex === victimSeat
            ? { ...p, handCards: [oppCard1, oppCard2] }
            : { ...p, handCards: [] },
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: gnSeat, cardIds: ['b1'], targetSeats: [victimSeat], asCardKey: 'qua_ha_sai_cau' },
      createSeededRng(29),
    );
    expect(s1.turnFlags?.qiXiDrawnThisTurn).toBe(true);
    // Spent b1 -> 1 left (<=2), Night Raid Break drew 1 -> 2 hand cards!
    expect(s1.players[gnSeat]!.handCards).toHaveLength(2);
  });

  it('21. Hoàng Bất Dịch (huang_gai): 1st ku_rou per turn grants +1 Strike limit AND +1 hand limit when HP <= 2', () => {
    let state = setupCuuChauMatch(['liu_bei', 'huang_gai', 'sun_quan', 'cao_cao']);
    const hgSeat = state.players.find((p) => p.heroId === 'huang_gai')!.seatIndex;
    const victimSeat = (hgSeat + 1) % 4;
    const s1Card = card('hs1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const s2Card = card('hs2', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 8);
    state = {
      ...state,
      currentTurnSeat: hgSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === hgSeat
          ? { ...p, hp: 3, handCards: [s1Card, s2Card] }
          : p.seatIndex === victimSeat
            ? { ...p, hp: 4, handCards: [] }
            : p,
      ),
    };
    expect(getPlayerMaxSatPerTurn(state, state.players[hgSeat]!)).toBe(1);

    let next = applyGameAction(
      state,
      { type: 'ACTIVATE_HERO_SKILL', seatIndex: hgSeat, skillId: 'ku_rou' },
      createSeededRng(30),
    );
    // HP dropped from 3 -> 2 (<= 2), so hand limit is 2 + 1 = 3 and max strikes/turn is 2!
    expect(next.players[hgSeat]!.hp).toBe(2);
    expect(getPlayerMaxHandLimit(next, next.players[hgSeat]!)).toBe(3);
    expect(getPlayerMaxSatPerTurn(next, next.players[hgSeat]!)).toBe(2);
    expect(next.turnFlags?.kuRouBonusGrantedThisTurn).toBe(true);

    next = applyGameAction(next, { type: 'PLAY_CARD', seatIndex: hgSeat, cardIds: ['hs1'], targetSeats: [victimSeat] }, createSeededRng(30));
    next = applyGameAction(next, { type: 'RESPOND_DODGE', seatIndex: victimSeat, cardId: null }, createSeededRng(30));
    next = applyGameAction(next, { type: 'PLAY_CARD', seatIndex: hgSeat, cardIds: ['hs2'], targetSeats: [victimSeat] }, createSeededRng(30));
    next = applyGameAction(next, { type: 'RESPOND_DODGE', seatIndex: victimSeat, cardId: null }, createSeededRng(30));
    expect(next.players[victimSeat]!.hp).toBe(2);
  });

  it('22. Tiêu Viêm Lãng (zhou_yu): +1 max hand limit and wrong Fan Jian guess draws 1 card', () => {
    let state = setupCuuChauMatch(['liu_bei', 'zhou_yu', 'sun_quan', 'cao_cao']);
    const zySeat = state.players.find((p) => p.heroId === 'zhou_yu')!.seatIndex;
    const targetSeat = (zySeat + 1) % 4;
    const spadeCard = card('sp_z', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 10);
    state = {
      ...state,
      currentTurnSeat: zySeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === zySeat
          ? { ...p, hp: 3, handCards: [spadeCard] }
          : p.seatIndex === targetSeat
            ? { ...p, hp: 4, handCards: [] }
            : p,
      ),
    };
    expect(getPlayerMaxHandLimit(state, state.players[zySeat]!)).toBe(4);

    let s1 = applyGameAction(
      state,
      { type: 'ACTIVATE_HERO_SKILL', seatIndex: zySeat, skillId: 'fan_jian', targetSeats: [targetSeat] },
      createSeededRng(31),
    );
    s1 = applyGameAction(
      s1,
      { type: 'RESPOND_FAN_JIAN_GUESS', seatIndex: targetSeat, suit: 'HEART' },
      createSeededRng(31),
    );
    expect(s1.players[targetSeat]!.hp).toBe(3);
    // Gave away spadeCard (0 left) -> wrong guess drew 1 card for Zhou Yu!
    expect(s1.players[zySeat]!.handCards).toHaveLength(1);
  });

  it('23. Hạ Tuyết Nghi (da_qiao): Liu Li redirect leaving <=1 hand card draws 1 card', () => {
    let state = setupCuuChauMatch(['liu_bei', 'da_qiao', 'sun_quan', 'cao_cao']);
    const dqSeat = state.players.find((p) => p.heroId === 'da_qiao')!.seatIndex;
    const attackerSeat = 0;
    const redirectSeat = (dqSeat + 1) % 4;
    const strike = card('st_dq', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const discard1 = card('d1_dq', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 2);
    const keep1 = card('k1_dq', 'dao', 'Hồi Xuân Đan', 'BASIC', 'HEART', 4);
    state = {
      ...state,
      currentTurnSeat: attackerSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === attackerSeat
          ? { ...p, handCards: [strike] }
          : p.seatIndex === dqSeat
            ? { ...p, handCards: [discard1, keep1] }
            : { ...p, handCards: [] },
      ),
    };
    let s1 = applyGameAction(
      state,
      { type: 'PLAY_CARD', seatIndex: attackerSeat, cardIds: ['st_dq'], targetSeats: [dqSeat] },
      createSeededRng(32),
    );
    expect(s1.interruptStack[0]?.kind).toBe('ASK_LIU_LI');
    s1 = applyGameAction(
      s1,
      { type: 'RESPOND_LIU_LI', seatIndex: dqSeat, activate: true, discardCardId: 'd1_dq', newTargetSeat: redirectSeat },
      createSeededRng(32),
    );
    // Discarded d1_dq -> left with keep1 (1 <= 1) -> drew 1 card -> total 2 cards in hand!
    expect(s1.players[dqSeat]!.handCards).toHaveLength(2);
  });
});

describe('Phase 2B Slice 4 — U Minh Cốc Remaining 2 Remixes & Legacy Non-Regression', () => {
  it('24. Dược Vô Ưu (hua_tuo): qing_nang healing another seat draws 1 card; healing self does not', () => {
    let state = setupCuuChauMatch(['liu_bei', 'hua_tuo', 'sun_quan', 'cao_cao']);
    const htSeat = state.players.find((p) => p.heroId === 'hua_tuo')!.seatIndex;
    const allySeat = (htSeat + 1) % 4;
    const balm1 = card('qn1', 'sat', 'Kiếm Trảm', 'BASIC', 'HEART', 5);
    state = {
      ...state,
      currentTurnSeat: htSeat,
      turnPhase: 'PLAY',
      players: state.players.map((p) =>
        p.seatIndex === htSeat
          ? { ...p, hp: p.maxHp - 1, handCards: [balm1] }
          : p.seatIndex === allySeat
            ? { ...p, hp: p.maxHp - 1 }
            : p,
      ),
    };
    const afterAllyHeal = applyGameAction(
      state,
      { type: 'ACTIVATE_HERO_SKILL', seatIndex: htSeat, skillId: 'qing_nang', cardIds: ['qn1'], targetSeats: [allySeat] },
      createSeededRng(33),
    );
    expect(afterAllyHeal.players[allySeat]!.hp).toBe(afterAllyHeal.players[allySeat]!.maxHp);
    expect(afterAllyHeal.players[htSeat]!.handCards).toHaveLength(1);

    // Self-heal does NOT draw a card
    const afterSelfHeal = applyGameAction(
      state,
      { type: 'ACTIVATE_HERO_SKILL', seatIndex: htSeat, skillId: 'qing_nang', cardIds: ['qn1'], targetSeats: [htSeat] },
      createSeededRng(33),
    );
    expect(afterSelfHeal.players[htSeat]!.hp).toBe(afterSelfHeal.players[htSeat]!.maxHp);
    expect(afterSelfHeal.players[htSeat]!.handCards).toHaveLength(0);
  });

  it('25. Dạ Vô Ngân (diao_chan): END phase draws 2 cards if hand <= 1 else draws 1 (no double-draw)', () => {
    let state = setupCuuChauMatch(['liu_bei', 'diao_chan', 'sun_quan', 'cao_cao']);
    const dcSeat = state.players.find((p) => p.heroId === 'diao_chan')!.seatIndex;
    const hold1 = card('dc1', 'thiem', 'Thân Pháp', 'BASIC', 'HEART', 2);
    const hold2 = card('dc2', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 3);

    const lowHandState: MasterGameState = {
      ...state,
      currentTurnSeat: dcSeat,
      turnPhase: 'END',
      players: state.players.map((p) =>
        p.seatIndex === dcSeat ? { ...p, handCards: [hold1] } : p,
      ),
    };
    const afterLow = stepEngine(lowHandState, createSeededRng(34));
    expect(afterLow.players[dcSeat]!.handCards).toHaveLength(3); // 1 + 2 = 3

    const twoHandState: MasterGameState = {
      ...state,
      currentTurnSeat: dcSeat,
      turnPhase: 'END',
      players: state.players.map((p) =>
        p.seatIndex === dcSeat ? { ...p, handCards: [hold1, hold2] } : p,
      ),
    };
    const afterTwo = stepEngine(twoHandState, createSeededRng(34));
    expect(afterTwo.players[dcSeat]!.handCards).toHaveLength(3); // 2 + 1 = 3
  });

  it('Legacy 108-card ruleset preserves classic behaviors untouched by Cửu Châu remixes', () => {
    const rng = createSeededRng(35);
    const seats = makeSeats(4);
    let legacy = createInitialMatchSetup({ matchId: 'leg-nonreg', seats, rng });
    const lordSeat = legacy.heroDraft!.lordSeatIndex;
    const others = [0, 1, 2, 3].filter((s) => s !== lordSeat);
    const heroPick: HeroId[] = ['liu_bei', 'zhuge_liang', 'zhen_ji', 'diao_chan'];
    legacy = {
      ...legacy,
      heroDraft: {
        ...legacy.heroDraft!,
        candidatesBySeat: {
          ...legacy.heroDraft!.candidatesBySeat,
          [lordSeat]: [heroPick[0]!, ...legacy.heroDraft!.candidatesBySeat[lordSeat]!.filter((h) => h !== heroPick[0])].slice(0, 5),
        },
      },
    };
    legacy = selectLordHero(legacy, lordSeat, heroPick[0]!, rng);
    others.forEach((seat, idx) => {
      const hid = heroPick[idx + 1]!;
      legacy = {
        ...legacy,
        heroDraft: {
          ...legacy.heroDraft!,
          candidatesBySeat: {
            ...legacy.heroDraft!.candidatesBySeat,
            [seat]: [hid, ...legacy.heroDraft!.candidatesBySeat[seat]!.filter((h) => h !== hid)].slice(0, 3),
          },
        },
      };
      legacy = selectPlayerHero(legacy, seat, hid);
    });
    legacy = startMatchCombat(legacy, rng);
    const zl = legacy.players.find((p) => p.heroId === 'zhuge_liang')!;
    const zj = legacy.players.find((p) => p.heroId === 'zhen_ji')!;
    const dc = legacy.players.find((p) => p.heroId === 'diao_chan')!;
    expect(isCuuChauRuleset(legacy)).toBe(false);
    // Standard Zhuge Liang keeps base handLimit = hp (no +1)
    expect(getPlayerMaxHandLimit(legacy, zl)).toBe(zl.hp);
    // Standard Zhen Ji without armor has normal adjacent distance 1
    expect(calculateDistance(legacy, (zj.seatIndex + 1) % 4, zj.seatIndex)).toBe(1);
    // Standard Diao Chan draws 1 card (not 2) at END when hand === 0
    const dcEnd: MasterGameState = {
      ...legacy,
      currentTurnSeat: dc.seatIndex,
      turnPhase: 'END',
      players: legacy.players.map((p) => (p.seatIndex === dc.seatIndex ? { ...p, handCards: [] } : p)),
    };
    expect(stepEngine(dcEnd, createSeededRng(36)).players[dc.seatIndex]!.handCards).toHaveLength(1);
  });

  it('Step 1 Balance & Engine Sync: auto 112-card deck, Trương Huy Diệu (<=1), Mộ Dung Tuyết (+1 hand limit), SSOT ActionDescriptor & Bot AI', () => {
    const rng = createSeededRng(108112);
    const seats = makeSeats(4);
    let autoDeckState = createInitialMatchSetup({
      matchId: 'cc-auto-112',
      seats,
      rng,
      enabledPacks: ['cuu_chau_core'],
    });
    const lordSeat = autoDeckState.heroDraft!.lordSeatIndex;
    const otherSeats = [0, 1, 2, 3].filter((s) => s !== lordSeat);
    const pickHeroes: readonly HeroId[] = ['liu_bei', 'zhang_liao', 'lu_xun', 'huang_gai'];
    autoDeckState = {
      ...autoDeckState,
      heroDraft: {
        ...autoDeckState.heroDraft!,
        candidatesBySeat: {
          ...autoDeckState.heroDraft!.candidatesBySeat,
          [lordSeat]: [pickHeroes[0]!, ...autoDeckState.heroDraft!.candidatesBySeat[lordSeat]!.filter((h) => h !== pickHeroes[0])].slice(0, 5),
        },
      },
    };
    autoDeckState = selectLordHero(autoDeckState, lordSeat, pickHeroes[0]!, rng);
    otherSeats.forEach((seat, idx) => {
      const hid = pickHeroes[idx + 1]!;
      autoDeckState = {
        ...autoDeckState,
        heroDraft: {
          ...autoDeckState.heroDraft!,
          candidatesBySeat: {
            ...autoDeckState.heroDraft!.candidatesBySeat,
            [seat]: [hid, ...autoDeckState.heroDraft!.candidatesBySeat[seat]!.filter((h) => h !== hid)].slice(0, 3),
          },
        },
      };
      autoDeckState = selectPlayerHero(autoDeckState, seat, hid);
    });

    // startMatchCombat WITHOUT options.deckFactory automatically uses createCuuChau112Deck!
    autoDeckState = startMatchCombat(autoDeckState, rng);
    const totalCards =
      autoDeckState.drawPile.length +
      autoDeckState.discardPile.length +
      autoDeckState.players.reduce((sum, p) => sum + p.handCards.length, 0);
    expect(totalCards).toBe(112);
    expect(autoDeckState.drawPile.every((c) => c.id.startsWith('cc_'))).toBe(true);

    // Trương Huy Diệu (zhang_liao): draws +1 at END only when handCards.length <= 1 (not 2)
    const zlSeat = autoDeckState.players.find((p) => p.heroId === 'zhang_liao')!.seatIndex;
    const cA = card('zla', 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', 2);
    const cB = card('zlb', 'thiem', 'Thân Pháp', 'BASIC', 'HEART', 3);
    const zlEndWith2: MasterGameState = {
      ...autoDeckState,
      currentTurnSeat: zlSeat,
      turnPhase: 'END',
      interruptStack: [],
      pendingEffects: [],
      players: autoDeckState.players.map((p) =>
        p.seatIndex === zlSeat ? { ...p, handCards: [cA, cB] } : p,
      ),
    };
    expect(stepEngine(zlEndWith2, createSeededRng(40)).players[zlSeat]!.handCards).toHaveLength(2);

    const zlEndWith1: MasterGameState = {
      ...zlEndWith2,
      players: autoDeckState.players.map((p) =>
        p.seatIndex === zlSeat ? { ...p, handCards: [cA] } : p,
      ),
    };
    expect(stepEngine(zlEndWith1, createSeededRng(41)).players[zlSeat]!.handCards).toHaveLength(2);

    // Mộ Dung Tuyết (lu_xun): +1 max hand limit in both MasterGameState and ActionDescriptor
    const lx = autoDeckState.players.find((p) => p.heroId === 'lu_xun')!;
    expect(getPlayerMaxHandLimit(autoDeckState, lx)).toBe(lx.hp + 1);
    const lxCards = Array.from({ length: lx.hp + 2 }, (_, idx) =>
      card(`lxc_${idx}`, 'thiem', 'Thân Pháp', 'BASIC', 'DIAMOND', idx + 2),
    );
    const lxDiscardState: MasterGameState = {
      ...autoDeckState,
      currentTurnSeat: lx.seatIndex,
      turnPhase: 'DISCARD',
      interruptStack: [],
      pendingEffects: [],
      players: autoDeckState.players.map((p) =>
        p.seatIndex === lx.seatIndex ? { ...p, handCards: lxCards } : p,
      ),
    };
    const lxDesc = describeAvailableActions(projectStateForPlayer(lxDiscardState, lx.userId));
    expect(lxDesc.discardRequiredCount).toBe(1);

    // English descriptions of tuned heroes have 0 Vietnamese diacritics
    const vietDiacriticRe = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    for (const hid of ['truong_huy_dieu', 'mo_dung_tuyet']) {
      const hDef = CUU_CHAU_HEROES.find((h) => h.id === hid)!;
      for (const s of hDef.skills) {
        expect(vietDiacriticRe.test(s.descriptionEn ?? '')).toBe(false);
      }
    }

    // ActionDescriptor uses getPlayerMaxSatPerTurn (bonusSatLimitThisTurn)
    const hg = autoDeckState.players.find((p) => p.heroId === 'huang_gai')!;
    const hgStrike = card('hgs_1', 'sat', 'Kiếm Trảm', 'BASIC', 'SPADE', 7);
    const hgPlayState: MasterGameState = {
      ...autoDeckState,
      roundNumber: 2,
      peacefulFirstRound: false,
      currentTurnSeat: hg.seatIndex,
      turnPhase: 'PLAY',
      interruptStack: [],
      pendingEffects: [],
      turnFlags: { satUsedThisTurn: 1, bonusSatLimitThisTurn: 1, skipPlayPhase: false },
      players: autoDeckState.players.map((p) =>
        p.seatIndex === hg.seatIndex ? { ...p, handCards: [hgStrike] } : p,
      ),
    };
    const hgDesc = describeAvailableActions(projectStateForPlayer(hgPlayState, hg.userId));
    expect(hgDesc.playableCardIds).toContain('hgs_1');

    // Bot AI: never nullifies friendly Cửu Châu beneficial scrolls & randomizes Fan Jian suit guess
    const vgCard = card('vg_b1', 'vo_giai_kha_kich', 'Hóa Giải Chân Khí', 'NORMAL_SCROLL', 'SPADE', 11);
    for (const scrollNameVi of [
      'Đào Viên Kết Nghĩa',
      'Hội Minh Tụ Nghĩa',
      'Ngũ Cốc Phong Đăng',
      'Thiên Bảo Xuất Thế',
      'Vô Trung Sinh Hữu',
      'Tụ Khí Quyết',
      'Chân Khí Hộ Thể',
    ]) {
      const nullifyState: MasterGameState = {
        ...autoDeckState,
        players: autoDeckState.players.map((p) =>
          p.seatIndex === lordSeat ? { ...p, handCards: [vgCard] } : p,
        ),
        interruptStack: [
          {
            id: 'wn_test',
            kind: 'WAIT_NULLIFICATION',
            targetSeat: lordSeat,
            sourceSeat: lordSeat,
            scrollNameVi,
            isSimulatedDelay: false,
            eligibleSeats: [lordSeat],
            passedSeats: [],
          },
        ],
      };
      const botDec = decideBotAction(
        projectStateForPlayer(nullifyState, autoDeckState.players[lordSeat]!.userId),
        createSeededRng(77),
      );
      expect(botDec).toEqual({
        type: 'RESPOND_NULLIFICATION',
        seatIndex: lordSeat,
        cardId: null,
      });
    }

    const fanJianState: MasterGameState = {
      ...autoDeckState,
      interruptStack: [
        {
          id: 'fj_test',
          kind: 'WAIT_FAN_JIAN_GUESS',
          targetSeat: lordSeat,
          sourceSeat: zlSeat,
        },
      ],
    };
    const fjView = projectStateForPlayer(fanJianState, autoDeckState.players[lordSeat]!.userId);
    const guessedSuits = new Set<string>();
    const rngFanJian = createSeededRng(999);
    for (let i = 0; i < 30; i += 1) {
      const act = decideBotAction(fjView, rngFanJian);
      if (act.type === 'RESPOND_FAN_JIAN_GUESS') {
        guessedSuits.add(act.suit);
      }
    }
    expect(guessedSuits.size).toBe(4);
  });
});
