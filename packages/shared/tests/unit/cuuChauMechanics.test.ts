import { describe, expect, it } from 'vitest';
import {
  CUU_CHAU_CARD_DISPLAY_BY_KEY,
  CUU_CHAU_DECK_TEMPLATES,
  applyGameAction,
  calculateDistance,
  canReachForSnatch,
  createCuuChau112Deck,
  createInitialMatchSetup,
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
