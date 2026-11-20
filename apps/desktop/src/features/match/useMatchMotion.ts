import { useEffect, useRef, type RefObject } from 'react';
import type { CardInstance, PlayerViewState } from '@lkdf/shared';
import { getCardArtUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import duelFireUrl from '../../../motion-duel-fire.mp4?url';

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

function showHealth(motion: BoardMotion, seat: HTMLElement, change: number) {
  const bounds = relativeBounds(motion, seat);
  if (change < 0) {
    const number = document.createElement('span');
    number.className = 'lkdf-motion-damage';
    number.textContent = '−' + Math.abs(change);
    position(number, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    motion.layer.append(number);
    animateElement(number, [
      { opacity: 1, translate: '-50% -50%' },
      { opacity: 1, translate: motion.reduced ? '-50% -50%' : '-50% -26px', offset: .65 },
      { opacity: 0, translate: motion.reduced ? '-50% -50%' : '-50% -46px' },
    ], { duration: 690, easing: 'ease-out' });
    return;
  }
  const outline = document.createElement('span');
  outline.className = 'lkdf-motion-heal';
  position(outline, bounds.x, bounds.y);
  outline.style.width = bounds.width + 'px';
  outline.style.height = bounds.height + 'px';
  motion.layer.append(outline);
  animateElement(outline, [{ opacity: .35 }, { opacity: 1, offset: .26 }, { opacity: 0 }], { duration: 720 });
  for (const [x, y] of [[.15,.4],[.34,.2],[.52,.45],[.72,.2],[.87,.55],[.39,.71]] as const) {
    const plus = document.createElement('span');
    plus.className = 'lkdf-motion-plus';
    plus.textContent = '+';
    position(plus, bounds.x + x * bounds.width, bounds.y + y * bounds.height);
    motion.layer.append(plus);
    animateElement(plus, [
      { opacity: 0 }, { opacity: 1, offset: .28 },
      { opacity: 0, translate: motion.reduced ? 'none' : '0 -20px' },
    ], { duration: 560, delay: x * 150 });
  }
}

function showHorse(motion: BoardMotion, seat: HTMLElement, card: CardInstance) {
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

export function useMatchMotion(
  board: RefObject<HTMLDivElement | null>,
  layer: RefObject<HTMLDivElement | null>,
  state: PlayerViewState,
  suspended: boolean,
) {
  const baseline = useRef<PlayerViewState | null>(null);
  const pending = useRef(new Set<number>());
  const reactions = useRef(new Set<Animation>());

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
    };
  }, [layer, state.matchId, suspended]);

  useEffect(() => {
    const previous = baseline.current;
    baseline.current = suspended ? null : state;
    if (suspended || !board.current || !layer.current) return;
    const motion = {
      board: board.current,
      layer: layer.current,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
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
      delete motion.layer.dataset.duel;
      syncDuel(motion, state);
      return;
    }
    syncDuel(motion, state);
    const incomingDodge = previous.activeInterrupt;
    const strike = previous.discardPileTop;
    const freshDiscard = state.discardPileCount > previous.discardPileCount &&
      state.discardPileTop?.id !== strike?.id;
    showTransfers(motion, previous, state);
    const track = (animation: Animation | null) => {
      if (!animation) return;
      reactions.current.add(animation);
      const finish = () => reactions.current.delete(animation);
      void animation.finished.then(finish, finish);
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
          if (seat.isConnected) showHealth(motion, seat, delta);
        }, 225);
        pending.current.add(timeout);
      } else if (delta !== 0) {
        showHealth(motion, seat, delta);
      }
      for (const slot of ['plusOneHorse', 'minusOneHorse'] as const) {
        const equipment = player.equipments[slot];
        if (equipment && equipment.id !== old.equipments[slot]?.id) showHorse(motion, seat, equipment);
      }
    }
  }, [board, layer, state, suspended]);
}
