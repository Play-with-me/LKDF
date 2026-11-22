import { describe, expect, it } from 'vitest';
import {
  createInitialMatchSetup,
  projectStateForPlayer,
  selectLordHero,
  selectPlayerHero,
  type CardInstance,
  type MasterGameState,
  type SetupSeatInput,
} from '../../src/index.js';

function makeSeats(count: number): SetupSeatInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    userId: `google-sub-${idx + 1}`,
    displayName: `Bạn ${idx + 1}`,
    avatarUrl: '',
  }));
}

function makeSecretCard(id: string, nameVi: string): CardInstance {
  return {
    id,
    cardKey: `secret_${id}`,
    nameVi,
    category: 'BASIC',
    suit: 'HEART',
    rank: 7,
  };
}

describe('Bước 1.1 — Bộ lọc bảo mật projectStateForPlayer (Chống lộ bài & thông tin ẩn)', () => {
  it('ẩn toàn bộ bài trên tay đối thủ, chồng bài rút, Thân Phận ẩn và cờ giả lập Vô Giải', () => {
    const seats = makeSeats(5);
    let master = createInitialMatchSetup({
      matchId: 'sec-1',
      seats,
      rng: () => 0.25,
    });
    const lordSeat = master.heroDraft!.lordSeatIndex;
    const lordHero = master.heroDraft!.candidatesBySeat[lordSeat]![0]!;
    master = selectLordHero(master, lordSeat, lordHero, () => 0.25);

    for (const p of master.players) {
      if (p.seatIndex === lordSeat) continue;
      const picked = master.heroDraft!.candidatesBySeat[p.seatIndex]![0]!;
      master = selectPlayerHero(master, p.seatIndex, picked);
    }

    const viewerSeat = (lordSeat + 1) % 5;
    const opponentSeat = (lordSeat + 2) % 5;
    const deadOpponentSeat = (lordSeat + 3) % 5;

    const secretOpponentCard = makeSecretCard('SECRET_OPP_999', 'Vô Giải Khả Kích Bí Mật');
    const secretDrawCard = makeSecretCard('SECRET_DRAW_888', 'Đào Bí Mật Trong Chồng Rút');
    const ownCard = makeSecretCard('OWN_CARD_111', 'Sát Của Bản Thân');

    const pollutedMaster: MasterGameState = {
      ...master,
      drawPile: [secretDrawCard, makeSecretCard('DRAW_2', 'Thiểm')],
      discardPile: [makeSecretCard('DISCARD_TOP', 'Nam Man Nhập Xâm')],
      interruptStack: [
        {
          id: 'int-1',
          kind: 'WAIT_NULLIFICATION',
          targetSeat: opponentSeat,
          sourceSeat: lordSeat,
          scrollNameVi: 'Nam Man Nhập Xâm',
          isSimulatedDelay: false,
          eligibleSeats: [viewerSeat, opponentSeat],
          passedSeats: [opponentSeat],
        },
      ],
      players: master.players.map((p) => {
        if (p.seatIndex === viewerSeat) {
          return { ...p, handCards: [ownCard] };
        }
        if (p.seatIndex === opponentSeat) {
          return { ...p, handCards: [secretOpponentCard, makeSecretCard('OPP_2', 'Đào')] };
        }
        if (p.seatIndex === deadOpponentSeat) {
          return { ...p, alive: false, hp: 0, isIdentityRevealed: true };
        }
        return p;
      }),
    };

    const view = projectStateForPlayer(pollutedMaster, seats[viewerSeat]!.userId);
    const serialized = JSON.stringify(view);

    // Tuyệt đối không rò rỉ ID/tên lá bài trên tay đối thủ hoặc trong chồng bài rút
    expect(serialized).not.toContain('SECRET_OPP_999');
    expect(serialized).not.toContain('Vô Giải Khả Kích Bí Mật');
    expect(serialized).not.toContain('SECRET_DRAW_888');
    expect(serialized).not.toContain('Đào Bí Mật Trong Chồng Rút');

    // Tuyệt đối không lộ cờ isSimulatedDelay trong dữ liệu gửi xuống máy khách
    expect(serialized).not.toContain('isSimulatedDelay');
    expect(serialized).not.toContain('eligibleSeats');
    expect(serialized).not.toContain('passedSeats');
    expect(view.activeInterrupt).toEqual({
      id: 'int-1',
      kind: 'WAIT_NULLIFICATION',
      targetSeat: opponentSeat,
      sourceSeat: lordSeat,
      scrollNameVi: 'Nam Man Nhập Xâm',
      canRespondNullification: true,
    });
    const opponentView = projectStateForPlayer(pollutedMaster, seats[opponentSeat]!.userId);
    expect(opponentView.activeInterrupt?.canRespondNullification).toBe(false);

    // Vẫn thấy chính xác số lượng bài rút & bài trên tay đối thủ
    expect(view.drawPileCount).toBe(2);
    expect(view.discardPileCount).toBe(1);
    expect(view.discardPileTop?.id).toBe('DISCARD_TOP');

    const viewerView = view.players.find((p) => p.seatIndex === viewerSeat)!;
    expect(viewerView.handCards).toHaveLength(1);
    expect(viewerView.handCards![0]!.id).toBe('OWN_CARD_111');
    expect(viewerView.identity).toBe(pollutedMaster.players[viewerSeat]!.identity);

    const oppView = view.players.find((p) => p.seatIndex === opponentSeat)!;
    expect(oppView.handCards).toBeNull();
    expect(oppView.handCount).toBe(2);
    expect(oppView.identity).toBe('UNKNOWN');

    // Chủ Công và người đã tử vong được công khai Thân Phận
    const lordView = view.players.find((p) => p.seatIndex === lordSeat)!;
    expect(lordView.identity).toBe('LORD');
    const deadView = view.players.find((p) => p.seatIndex === deadOpponentSeat)!;
    expect(deadView.identity).toBe(pollutedMaster.players[deadOpponentSeat]!.identity);
  });

  it('trong pha HERO_SELECT chỉ thấy tướng của mình và Chủ Công, không lộ 3 tướng dự bị hay lựa chọn sớm của người khác', () => {
    const seats = makeSeats(4);
    let state = createInitialMatchSetup({
      matchId: 'draft-privacy',
      seats,
      rng: () => 0.1,
    });
    const lordSeat = state.heroDraft!.lordSeatIndex;
    state = selectLordHero(
      state,
      lordSeat,
      state.heroDraft!.candidatesBySeat[lordSeat]![0]!,
      () => 0.1,
    );

    const seatA = (lordSeat + 1) % 4;
    const seatB = (lordSeat + 2) % 4;
    const seatBPicked = state.heroDraft!.candidatesBySeat[seatB]![1]!;
    state = selectPlayerHero(state, seatB, seatBPicked);

    const viewA = projectStateForPlayer(state, seats[seatA]!.userId);
    // Ghế A chỉ thấy danh sách 3 tướng của chính mình
    expect(viewA.heroDraft!.myCandidates).toEqual(
      state.heroDraft!.candidatesBySeat[seatA],
    );
    expect(viewA.heroDraft!.mySelectedHero).toBeNull();
    expect(viewA.heroDraft!.readySeats).toContain(seatB);

    // Ghế A thấy tướng Chủ Công nhưng KHÔNG thấy tướng Ghế B mới chọn sớm
    expect(viewA.players.find((p) => p.seatIndex === lordSeat)!.heroId).not.toBeNull();
    expect(viewA.players.find((p) => p.seatIndex === seatB)!.heroId).toBeNull();

    // Nhưng Ghế B tự thấy lựa chọn sớm của chính mình
    const viewB = projectStateForPlayer(state, seats[seatB]!.userId);
    expect(viewB.heroDraft!.mySelectedHero).toBe(seatBPicked);
    expect(viewB.players.find((p) => p.seatIndex === seatB)!.heroId).toBe(seatBPicked);
  });
});
