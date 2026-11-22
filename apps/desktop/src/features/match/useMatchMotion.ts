import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CardInstance, PlayerViewState } from '@lkdf/shared';
import { getCardArtUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import duelFireUrl from '../../../motion-duel-fire.mp4?url';

export type ActionArcKind = 'attack' | 'scroll' | 'heal';

export interface CombatActionArc {
  readonly id: string;
  readonly fromSeat: number;
  readonly toSeat: number;
  readonly kind: ActionArcKind;
}

export interface SeatHpImpact {
  readonly id: number;
  readonly delta: number;
}

type BoardMotion = {
  readonly board: HTMLElement;
  readonly layer: HTMLElement;
  readonly reduced: boolean;
};

function position(el: HTMLElement, x: number, y: number) {
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

function relativeBounds(motion: BoardMotion, anchor: Element) {
  const bounds = anchor.getBoundingClientRect();
  const layer = motion.layer.getBoundingClientRect();
  return { x: bounds.left - layer.left, y: bounds.top - layer.top, width: bounds.width, height: bounds.height };
}

function seatAt(motion: BoardMotion, seatIndex: number) {
  return motion.board.querySelector<HTMLElement>('[data-drop-seat="' + seatIndex + '"]')
    ?? motion.board.querySelector<HTMLElement>('[data-motion-self="' + seatIndex + '"]');
}

function animateElement(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
  const animation = el.animate(frames, options);
  void animation.finished.then(() => el.remove(), () => el.remove());
}

function showTurnHandoff(motion: BoardMotion, previous: PlayerViewState, state: PlayerViewState) {
  if (previous.turnPhase === 'HERO_SELECT' || previous.turnPhase === 'GAME_OVER' ||
      state.turnPhase === 'GAME_OVER' || state.roundNumber < previous.roundNumber ||
      (previous.currentTurnSeat === state.currentTurnSeat && previous.roundNumber === state.roundNumber)) return;

  const next = state.players.find(player => player.seatIndex === state.currentTurnSeat);
  if (!next) return;
  const seat = seatAt(motion, next.seatIndex);
  if (!seat || motion.reduced) return;
  const bounds = relativeBounds(motion, seat);
  const outline = document.createElement('span');
  outline.className = 'lkdf-turn-handoff-ring';
  position(outline, bounds.x, bounds.y);
  outline.style.width = bounds.width + 'px';
  outline.style.height = bounds.height + 'px';
  motion.layer.append(outline);
  animateElement(outline, [{ opacity: 0 }, { opacity: 1, offset: .22 }, { opacity: 0 }], {
    duration: 620,
    easing: 'ease-out',
  });
}

const tableEffects = {
  nam_man_nhap_xam: 'Nam Man Nhập Xâm',
  van_tien_te_phat: 'Vạn Tiễn Tề Phát',
  dao_vien_ket_nghia: 'Đào Viên Kết Nghĩa',
  ngu_coc_phong_dang: 'Ngũ Cốc Phong Đăng',
} as const;

function tableEffectName(state: PlayerViewState) {
  const prompt = state.activeInterrupt;
  const actor = state.players.find(player => player.seatIndex === prompt?.sourceSeat);
  if (!actor || actor.seatIndex === state.viewerSeatIndex) return undefined;
  let cardName: string | undefined;
  switch (prompt?.kind) {
    case 'WAIT_AOE_SAT': cardName = tableEffects.nam_man_nhap_xam; break;
    case 'WAIT_AOE_DODGE': cardName = tableEffects.van_tien_te_phat; break;
    case 'WAIT_HARVEST_PICK': cardName = tableEffects.ngu_coc_phong_dang; break;
    case 'WAIT_NULLIFICATION': cardName = prompt.scrollNameVi; break;
  }
  return cardName ? `${actor.displayName} dùng ${cardName}` : undefined;
}

function opponentCardNotice(previous: PlayerViewState, state: PlayerViewState, freshDiscard: boolean) {
  const logs = state.actionLog.slice(previous.actionLog.length);
  for (const player of state.players) {
    if (player.seatIndex === state.viewerSeatIndex) continue;
    const prefix = player.displayName + ' ';
    for (const line of logs) {
      if (!line.startsWith(prefix)) continue;
      const action = line.slice(prefix.length);
      if (action.startsWith('trang bị ')) return line.replace(/\.$/, '');
      if (action.startsWith('đánh Vô Giải Khả Kích')) return prefix + 'dùng Vô Giải Khả Kích';
      if (action.startsWith('dùng Đào ')) return prefix + 'dùng Đào';
      if (action.startsWith('đánh Sát vào ') || action.startsWith('dùng Trượng Bát Xà Mâu đánh Sát')) {
        return prefix + 'đánh Sát';
      }
    }
  }
  const card = freshDiscard ? state.discardPileTop : null;
  if (card?.cardKey === 'thiem' &&
      (previous.activeInterrupt?.kind === 'WAIT_DODGE' || previous.activeInterrupt?.kind === 'WAIT_AOE_DODGE')) {
    const actor = state.players.find(player => player.seatIndex === previous.activeInterrupt?.targetSeat);
    if (actor && actor.seatIndex !== state.viewerSeatIndex) return `${actor.displayName} dùng Thiểm`;
  }
  return undefined;
}

function showTableEffect(motion: BoardMotion, name: string) {
  const dock = motion.board.querySelector('.lkdf-battle-dock');
  const player = dock?.querySelector('.lkdf-battle-player');
  if (!dock || !player) return;
  motion.layer.querySelector('.lkdf-motion-table-notice')?.remove();
  const bounds = relativeBounds(motion, player);
  const notice = document.createElement('div');
  notice.className = 'lkdf-motion-table-notice';
  notice.textContent = name;
  motion.layer.append(notice);
  position(notice, bounds.x + bounds.width + 8, relativeBounds(motion, dock).y - 4);
  if (motion.reduced) return notice;

  const fire = document.createElement('video');
  fire.src = duelFireUrl;
  fire.muted = true;
  fire.autoplay = true;
  fire.playsInline = true;
  fire.loop = true;
  notice.prepend(fire);
  const anchor = relativeBounds(motion, notice);
  const dx = motion.layer.clientWidth / 2 - anchor.x - anchor.width / 2;
  const dy = motion.layer.clientHeight * .42 - anchor.y - anchor.height / 2;
  const center = `${dx}px ${dy}px`;
  notice.animate([
    { translate: center, scale: 1.9, opacity: 0 },
    { translate: center, scale: 2.1, opacity: 1, offset: .12 },
    { translate: center, scale: 2.1, opacity: 1, offset: .78 },
    { translate: '0 0', scale: 1, opacity: 1 },
  ], { duration: 1500, easing: 'ease-in-out' });
  return notice;
}

function showEquipmentReveal(motion: BoardMotion, seat: HTMLElement, card: CardInstance) {
  const url = getCardArtUrl(card.cardKey);
  if (!url) return;
  const bounds = relativeBounds(motion, seat);
  const image = document.createElement('img');
  image.className = 'lkdf-motion-horse';
  image.src = url;
  image.alt = '';
  position(image, bounds.x + (bounds.width - 142) / 2, Math.max(0, bounds.y - 8));
  motion.layer.append(image);
  animateElement(image, [
    { opacity: 0 }, { opacity: .92, offset: .32 }, { opacity: .8, offset: .64 },
    { opacity: 0, translate: motion.reduced ? 'none' : '12px 0' },
  ], { duration: 1000 });
}

function transferCard(motion: BoardMotion, from: Element, to: Element, card?: CardInstance, delay = 0) {
  if (motion.reduced) return;
  const start = relativeBounds(motion, from);
  const end = relativeBounds(motion, to);
  const token = document.createElement('span');
  token.className = 'lkdf-motion-transfer';
  const art = card ? getCardArtUrl(card.cardKey) : getUiAssetUrl('card-back');
  if (art) {
    const image = document.createElement('img');
    image.src = art;
    image.alt = '';
    token.append(image);
  }
  position(token, start.x + start.width / 2 - 22, start.y + start.height / 2 - 31);
  const dx = end.x + end.width / 2 - start.x - start.width / 2;
  const dy = end.y + end.height / 2 - start.y - start.height / 2;
  motion.layer.append(token);
  animateElement(token, [
    { opacity: 0 },
    { opacity: 1, offset: .12 },
    { opacity: .9, translate: dx + 'px ' + dy + 'px', scale: '.65', offset: .86 },
    { opacity: 0, translate: dx + 'px ' + dy + 'px', scale: '.5' },
  ], { duration: 420, delay, easing: 'ease-out', fill: 'backwards' });
}

// Only explicit public draw results can identify the recipient and quantity.
const DRAW_RESULT = /^(?:rút|bỏ qua Đột Tập, rút|kích hoạt Lỏa Y, rút|dùng Vô Trung Sinh Hữu rút|kích hoạt (?:Tập Trí|Khổ Nhục|Liên Doanh|Kiêu Cơ|Bế Nguyệt), rút|kích hoạt Chế Hành, bỏ \d+ lá và rút lại|tiêu diệt Phản Tặc, được rút thưởng) (\d+) lá(?: bài| ở pha Rút bài| nhờ Từ Hùng Song Cổ Kiếm| \(\+1 sát thương Sát\/Quyết Đấu\))?\.$/u;

function showDraws(motion: BoardMotion, previous: PlayerViewState, state: PlayerViewState) {
  const pile = motion.board.querySelector('[data-motion-draw-pile]');
  if (!pile || motion.reduced) return;

  let offset = 0;
  for (const entry of state.actionLog.slice(previous.actionLog.length)) {
    const recipients = state.players.flatMap((player) => {
      const prefix = player.displayName + ' ';
      const result = entry.startsWith(prefix) && DRAW_RESULT.exec(entry.slice(prefix.length));
      return result ? [{ player, count: Number(result[1]) }] : [];
    });
    if (recipients.length !== 1) continue;

    const { player, count } = recipients[0]!;
    const seat = seatAt(motion, player.seatIndex);
    const destination = player.seatIndex === state.viewerSeatIndex
      ? motion.board.querySelector('.lkdf-hand-row') ?? seat
      : seat;
    if (!destination) continue;
    for (let index = 0; index < Math.min(count, 8); index += 1) {
      transferCard(motion, pile, destination, undefined, Math.min(offset, 420));
      offset += 65;
    }
  }
}

function showTransfers(motion: BoardMotion, previous: PlayerViewState, state: PlayerViewState) {
  showDraws(motion, previous, state);
  const center = motion.board.querySelector('.lkdf-battle-center-stack');
  if (!center) return;
  const take = previous.activeInterrupt;
  if (take?.handPick === 'SELECT' && take.sourceSeat != null && take.id !== state.activeInterrupt?.id) {
    const taker = state.players.find(player => player.seatIndex === take.sourceSeat);
    const owner = state.players.find(player => player.seatIndex === take.targetSeat);
    if (taker && owner && state.actionLog.slice(previous.actionLog.length)
      .includes(`${taker.displayName} nhận 1 lá úp từ ${owner.displayName}.`)) {
      const hand = taker.seatIndex === state.viewerSeatIndex
        ? motion.board.querySelector('.lkdf-hand-row') ?? seatAt(motion, taker.seatIndex)
        : seatAt(motion, taker.seatIndex);
      if (hand) transferCard(motion, center, hand);
      const ownerSeat = seatAt(motion, owner.seatIndex);
      if (ownerSeat && owner.handCount > 0) transferCard(motion, center, ownerSeat, undefined, 85);
    }
  }
  const harvest = previous.activeInterrupt;
  if (harvest?.kind === 'WAIT_HARVEST_PICK') {
    const actor = state.players.find((player) => player.seatIndex === harvest.targetSeat);
    const oldActor = previous.players.find((player) => player.seatIndex === harvest.targetSeat);
    const removed = previous.harvestPool.filter((card) => !state.harvestPool.some((entry) => card.id === entry.id));
    const hand = seatAt(motion, harvest.targetSeat);
    if (actor && oldActor && hand && actor.handCount === oldActor.handCount + 1 && removed.length === 1) {
      transferCard(motion, center, hand, removed[0]);
    }
  }
  for (const player of state.players) {
    const destination = seatAt(motion, player.seatIndex);
    if (!destination) continue;
    for (const card of player.delayedScrolls) {
      if (card.cardKey !== 'thiem_dien') continue;
      const oldHost = previous.players.find((old) => old.seatIndex !== player.seatIndex &&
        old.delayedScrolls.some((entry) => entry.id === card.id));
      const host = oldHost && seatAt(motion, oldHost.seatIndex);
      if (host) transferCard(motion, host, destination, card);
    }
  }
}

function animateStrike(motion: BoardMotion, seat: HTMLElement, strike: CardInstance, dodged: boolean) {
  const center = motion.board.querySelector('.lkdf-battle-center-stack');
  const art = getCardArtUrl(strike.cardKey);
  if (motion.reduced || !center || !art) return null;
  const from = relativeBounds(motion, center);
  const target = relativeBounds(motion, seat);
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  const dx = target.x + target.width / 2 - x;
  const dy = target.y + target.height / 2 - y;
  const face = document.createElement('span');
  face.className = 'lkdf-motion-strike';
  const illustration = document.createElement('img');
  illustration.src = art;
  illustration.alt = '';
  const title = document.createElement('b');
  title.textContent = strike.nameVi;
  face.append(illustration, title);
  position(face, x - 30, y - 41);
  motion.layer.append(face);
  const duration = dodged ? 650 : 450;
  const impact = dodged ? 1.16 : .94;
  animateElement(face, [
    { transform: 'none' },
    { transform: 'translate(' + dx * impact + 'px,' + dy * impact + 'px) rotate(12deg)', offset: .51 },
    { transform: 'none', opacity: 0 },
  ], { duration, easing: 'ease-in-out' });
  const reaction = seat.animate(dodged ? [
    { opacity: 1 }, { opacity: .33, translate: '-10px -4px', offset: .42 },
    { opacity: .47, translate: '-10px -4px', offset: .68 }, { opacity: 1, translate: 'none' },
  ] : [
    { translate: 'none' }, { translate: '7px 0', offset: .22 }, { translate: 'none' },
  ], { duration: dodged ? duration : 165, delay: dodged ? 0 : 220, easing: 'ease-in-out' });
  return reaction;
}

function syncDuel(motion: BoardMotion, state: PlayerViewState) {
  const prompt = state.activeInterrupt;
  const seats = prompt?.kind === 'WAIT_DUEL_SAT' ? [prompt.targetSeat, prompt.sourceSeat].sort() : [];
  const key = seats.join(':');
  if (motion.layer.dataset.duel === key) return;
  motion.layer.dataset.duel = key;
  motion.layer.querySelectorAll('.lkdf-motion-duel').forEach((el) => el.remove());
  if (motion.reduced) return;
  for (const index of seats) {
    if (index == null) continue;
    const seat = seatAt(motion, index);
    if (!seat) continue;
    const bounds = relativeBounds(motion, seat);
    const video = document.createElement('video');
    video.className = 'lkdf-motion-duel';
    video.src = duelFireUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    position(video, bounds.x, bounds.y);
    video.style.width = bounds.width + 'px';
    video.style.height = bounds.height + 'px';
    motion.layer.append(video);
  }
}

function detectPublicActionArcs(
  previous: PlayerViewState,
  state: PlayerViewState,
): readonly Omit<CombatActionArc, 'id'>[] {
  const found: Array<Omit<CombatActionArc, 'id'>> = [];
  const seen = new Set<string>();
  const pushArc = (fromSeat: number | null | undefined, toSeat: number | null | undefined, kind: ActionArcKind) => {
    if (fromSeat == null || toSeat == null || fromSeat === toSeat) return;
    const key = `${fromSeat}:${toSeat}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ fromSeat, toSeat, kind });
  };

  const findSeatByName = (name: string) =>
    state.players.find((player) => player.displayName === name.trim())?.seatIndex;

  // 1. Public actionLog entries (strictly public)
  const newLogs = state.actionLog.slice(previous.actionLog.length);
  let hasPeachRescueLog = false;
  for (const line of newLogs) {
    for (const actor of state.players) {
      const prefix = `${actor.displayName} `;
      if (!line.startsWith(prefix)) continue;
      const action = line.slice(prefix.length);

      if (action.startsWith('đánh Sát vào ')) {
        const rawTargets = action.slice('đánh Sát vào '.length).replace(/\.$/, '');
        for (const name of rawTargets.split(', ')) {
          pushArc(actor.seatIndex, findSeatByName(name), 'attack');
        }
      } else if (action.startsWith('dùng Trượng Bát Xà Mâu đánh Sát vào ')) {
        const targetName = action.slice('dùng Trượng Bát Xà Mâu đánh Sát vào '.length).replace(/\.$/, '');
        pushArc(actor.seatIndex, findSeatByName(targetName), 'attack');
      } else if (action.startsWith('dùng Đào cứu ')) {
        const rest = action.slice('dùng Đào cứu '.length);
        const targetName = rest.split(' (')[0]?.replace(/\.$/, '') ?? '';
        const targetSeat = findSeatByName(targetName);
        if (targetSeat != null && targetSeat !== actor.seatIndex) {
          hasPeachRescueLog = true;
          pushArc(actor.seatIndex, targetSeat, 'heal');
        }
      }
    }
  }

  // 2. Public interrupt transitions (Quyết Đấu, Thuận Thủ, Quá Hà, Tá Đao, Phản Gián, Sát)
  const interrupt = state.activeInterrupt;
  if (interrupt && interrupt.id !== previous.activeInterrupt?.id) {
    if (interrupt.kind === 'WAIT_NULLIFICATION') {
      const kind: ActionArcKind = interrupt.scrollNameVi?.includes('Quyết Đấu') ? 'attack' : 'scroll';
      pushArc(interrupt.sourceSeat, interrupt.targetSeat, kind);
    } else if (
      interrupt.kind === 'WAIT_DUEL_SAT' ||
      interrupt.kind === 'WAIT_COLLATERAL_SAT' ||
      interrupt.kind === 'WAIT_DODGE'
    ) {
      pushArc(interrupt.sourceSeat, interrupt.targetSeat, 'attack');
    } else if (interrupt.kind === 'WAIT_FAN_JIAN_GUESS') {
      pushArc(interrupt.sourceSeat, interrupt.targetSeat, 'scroll');
    }
  }

  // 3. Lạc Bất Tư Thục placed onto another seat's delayedScrolls during PLAY phase
  if (state.turnPhase === 'PLAY') {
    for (const player of state.players) {
      if (player.seatIndex === state.currentTurnSeat) continue;
      const oldPlayer = previous.players.find((entry) => entry.seatIndex === player.seatIndex);
      if (!oldPlayer) continue;
      const gainedLbt = player.delayedScrolls.some(
        (card) =>
          card.cardKey === 'lac_bat_tu_thuc' &&
          !oldPlayer.delayedScrolls.some((prevCard) => prevCard.id === card.id),
      );
      if (gainedLbt) {
        pushArc(state.currentTurnSeat, player.seatIndex, 'scroll');
      }
    }
  }

  // 4. Single-target heal by current turn player (e.g., Thanh Nang) when not Đào rescue or Đào Viên Kết Nghĩa
  if (!hasPeachRescueLog && state.turnPhase === 'PLAY') {
    const healedOthers = state.players.filter((player) => {
      if (player.seatIndex === state.currentTurnSeat) return false;
      const oldPlayer = previous.players.find((entry) => entry.seatIndex === player.seatIndex);
      return Boolean(oldPlayer && player.hp > oldPlayer.hp);
    });
    if (healedOthers.length === 1) {
      pushArc(state.currentTurnSeat, healedOthers[0]!.seatIndex, 'heal');
    }
  }

  return found;
}

export function useMatchMotion(
  board: RefObject<HTMLDivElement | null>,
  layer: RefObject<HTMLDivElement | null>,
  state: PlayerViewState,
  suspended: boolean,
): {
  readonly activeArcs: readonly CombatActionArc[];
  readonly hpImpacts: Readonly<Record<number, SeatHpImpact>>;
} {
  const baseline = useRef<PlayerViewState | null>(null);
  const pending = useRef(new Set<number>());
  const reactions = useRef(new Set<Animation>());
  const tableNotice = useRef<{ name: string; element: HTMLElement; startedAt: number } | null>(null);
  const arcSeqRef = useRef(0);
  const impactSeqRef = useRef(0);
  const [activeArcs, setActiveArcs] = useState<readonly CombatActionArc[]>([]);
  const [hpImpacts, setHpImpacts] = useState<Readonly<Record<number, SeatHpImpact>>>({});

  useEffect(() => {
    const motionLayer = layer.current;
    const timeouts = pending.current;
    const running = reactions.current;
    return () => {
      timeouts.forEach(window.clearTimeout);
      timeouts.clear();
      running.forEach((animation) => animation.cancel());
      running.clear();
      motionLayer?.replaceChildren();
      if (motionLayer) delete motionLayer.dataset.duel;
      baseline.current = null;
      tableNotice.current = null;
      setActiveArcs([]);
      setHpImpacts({});
    };
  }, [layer, state.matchId, suspended]);

  useEffect(() => {
    const previous = baseline.current;
    baseline.current = suspended ? null : state;
    if (suspended || !board.current || !layer.current) return;
    const motion = {
      board: board.current,
      layer: layer.current,
      reduced: prefersReducedMotion(),
    };
    if (!previous) {
      syncDuel(motion, state);
      return;
    }
    const continued = previous.actionLog.length <= state.actionLog.length &&
      previous.actionLog.every((entry, index) => state.actionLog[index] === entry);
    const undone = state.refereeAuditLog.slice(previous.refereeAuditLog.length)
      .some((entry) => entry.actionType === 'UNDO_ONE_STEP');
    if (!continued || undone) {
      pending.current.forEach(window.clearTimeout);
      pending.current.clear();
      reactions.current.forEach((animation) => animation.cancel());
      reactions.current.clear();
      motion.layer.replaceChildren();
      tableNotice.current = null;
      delete motion.layer.dataset.duel;
      setActiveArcs([]);
      setHpImpacts({});
      syncDuel(motion, state);
      return;
    }
    syncDuel(motion, state);
    showTurnHandoff(motion, previous, state);

    const emittedArcs = detectPublicActionArcs(previous, state);
    if (emittedArcs.length > 0) {
      const created: CombatActionArc[] = emittedArcs.map((arc) => {
        arcSeqRef.current += 1;
        return { ...arc, id: `arc-${arcSeqRef.current}` };
      });
      const createdIds = new Set(created.map((arc) => arc.id));
      setActiveArcs((prev) => [...prev, ...created]);
      const expireTimeout = window.setTimeout(() => {
        pending.current.delete(expireTimeout);
        setActiveArcs((prev) => prev.filter((arc) => !createdIds.has(arc.id)));
      }, 650);
      pending.current.add(expireTimeout);
    }
    const incomingDodge = previous.activeInterrupt;
    const strike = previous.discardPileTop;
    const freshDiscard = state.discardPileCount > previous.discardPileCount &&
      state.discardPileTop?.id !== strike?.id;
    const currentEffect = tableEffectName(state);
    const previousEffect = tableEffectName(previous);
    const name = currentEffect ?? opponentCardNotice(previous, state, freshDiscard);
    if (name && tableNotice.current?.name !== name && name !== previousEffect) {
      tableNotice.current?.element.remove();
      const element = showTableEffect(motion, name);
      tableNotice.current = element ? { name, element, startedAt: performance.now() } : null;
    }
    if (!currentEffect && tableNotice.current) {
      const notice = tableNotice.current;
      tableNotice.current = null;
      const timeout = window.setTimeout(() => {
        pending.current.delete(timeout);
        notice.element.remove();
      }, Math.max(0, (motion.reduced ? 650 : 1650) - (performance.now() - notice.startedAt)));
      pending.current.add(timeout);
    }
    showTransfers(motion, previous, state);
    const track = (animation: Animation | null) => {
      if (!animation) return;
      reactions.current.add(animation);
      const finish = () => reactions.current.delete(animation);
      void animation.finished.then(finish, finish);
    };
    const triggerHpImpact = (seatIndex: number, delta: number) => {
      impactSeqRef.current += 1;
      const impactId = impactSeqRef.current;
      setHpImpacts((prev) => ({ ...prev, [seatIndex]: { id: impactId, delta } }));
      const clearTimeoutId = window.setTimeout(() => {
        pending.current.delete(clearTimeoutId);
        setHpImpacts((prev) => {
          if (prev[seatIndex]?.id !== impactId) return prev;
          const next = { ...prev };
          delete next[seatIndex];
          return next;
        });
      }, 760);
      pending.current.add(clearTimeoutId);
    };

    for (const player of state.players) {
      const old = previous.players.find((entry) => entry.seatIndex === player.seatIndex);
      const seat = seatAt(motion, player.seatIndex);
      if (!old || !seat) continue;
      const delta = player.hp - old.hp;
      const respondingToStrike = strike?.cardKey === 'sat' && incomingDodge?.kind === 'WAIT_DODGE' &&
        incomingDodge.targetSeat === player.seatIndex;
      const dodged = respondingToStrike && delta === 0 && freshDiscard &&
        state.discardPileTop?.cardKey === 'thiem' && state.activeInterrupt?.id !== incomingDodge.id;
      if (dodged) track(animateStrike(motion, seat, strike, true));
      if (delta < 0 && respondingToStrike && !motion.reduced) {
        track(animateStrike(motion, seat, strike, false));
        const timeout = window.setTimeout(() => {
          pending.current.delete(timeout);
          if (seat.isConnected) triggerHpImpact(player.seatIndex, delta);
        }, 225);
        pending.current.add(timeout);
      } else if (delta !== 0) {
        triggerHpImpact(player.seatIndex, delta);
      }
      for (const slot of ['weapon', 'armor', 'plusOneHorse', 'minusOneHorse'] as const) {
        const equipment = player.equipments[slot];
        if (equipment && equipment.id !== old.equipments[slot]?.id) showEquipmentReveal(motion, seat, equipment);
      }
    }
  }, [board, layer, state, suspended]);

  return { activeArcs, hpImpacts };
}
