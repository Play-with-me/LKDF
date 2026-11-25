import { getHeroDefinition, type CardInstance, type HeroFaction, type PlayerViewState } from '@lkdf/shared';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { getCardArtUrl, getUiAssetUrl } from '../../lib/assetCatalog.js';
import type { VfxEvent, VfxKind } from './MatchVfxCanvas.js';
import { getLoggedHeroSkill } from './matchSounds.js';

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

export interface SeatRecoilVector {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface SeatSkillStamp {
  readonly id: number;
  readonly label: string;
}

type BoardMotion = {
  readonly board: HTMLElement;
  readonly layer: HTMLElement;
  readonly reduced: boolean;
};

type EmitVfxFn = (
  kind: VfxKind,
  opts?: {
    fromSeat?: number;
    toSeats?: readonly number[];
    nullifyDepth?: number;
    faction?: HeroFaction;
  },
) => void;

const EQUIP_SLOTS = ['weapon', 'armor', 'plusOneHorse', 'minusOneHorse'] as const;

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

function handAt(motion: BoardMotion, state: PlayerViewState, seatIndex: number) {
  return (seatIndex === state.viewerSeatIndex ? motion.board.querySelector('.lkdf-hand-row') : null)
    ?? seatAt(motion, seatIndex);
}

function animateElement(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
  const animation = el.animate(frames, options);
  void animation.finished.then(() => el.remove(), () => el.remove());
}

function buildSwordsIconSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of [
    'M14.5 17.5L3 6V3h3l11.5 11.5',
    'M13 19l6-6',
    'M16 16l4 4',
    'M19 21l2-2',
    'M14.5 6.5L18 3h3v3l-3.5 3.5',
    'M5 14l4 4',
    'M7 17l-3 3',
    'M3 19l2 2',
  ]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
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

  // Layer 4: Non-blocking Imperial Gold turn banner when turn changes to viewer
  if (state.currentTurnSeat === state.viewerSeatIndex) {
    const banner = document.createElement('div');
    banner.className = 'lkdf-turn-banner';
    banner.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = 'ĐẾN LƯỢT BẠN';
    banner.append(buildSwordsIconSvg(), text);
    motion.layer.append(banner);
    animateElement(banner, [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(0.84)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.04)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.78 },
      { opacity: 0, transform: 'translate(-50%, -56%) scale(0.96)' },
    ], { duration: 760, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
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

/**
 * Face-down transfer token strictly reserved for Nhân Đức & Di Kế (and existing private/public
 * non-draw hand transfers) to honor exact `.lkdf-motion-transfer` counts in skill-qa.
 */
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

/**
 * Layer 1: Staggered curved-arc + 3D flip card-back draw flight (.lkdf-draw-flight, 90ms stagger, <240ms/hop).
 * Never uses `.lkdf-motion-transfer` so Nhân Đức / Di Kế QA counts stay isolated.
 */
function launchDrawFlight(motion: BoardMotion, from: Element, to: Element, delay = 0) {
  if (motion.reduced) return;
  const start = relativeBounds(motion, from);
  const end = relativeBounds(motion, to);
  const token = document.createElement('span');
  token.className = 'lkdf-draw-flight';
  const art = getUiAssetUrl('card-back');
  if (art) {
    const image = document.createElement('img');
    image.src = art;
    image.alt = '';
    token.append(image);
  }
  position(token, start.x + start.width / 2 - 22, start.y + start.height / 2 - 31);
  const dx = end.x + end.width / 2 - start.x - start.width / 2;
  const dy = end.y + end.height / 2 - start.y - start.height / 2;
  const arcDx = dx * 0.52;
  const arcDy = dy * 0.45 - 26;
  motion.layer.append(token);
  animateElement(token, [
    { opacity: 0, transform: 'perspective(520px) translate3d(0, 0, 0) rotateY(0deg) scale(0.86)' },
    { opacity: 1, transform: 'perspective(520px) translate3d(0, -6px, 0) rotateY(15deg) scale(0.98)', offset: 0.14 },
    { opacity: 0.96, transform: `perspective(520px) translate3d(${arcDx}px, ${arcDy}px, 0) rotateY(-88deg) rotate(-5deg) scale(1.06)`, offset: 0.5 },
    { opacity: 0.92, transform: `perspective(520px) translate3d(${dx}px, ${dy}px, 0) rotateY(0deg) scale(0.76)`, offset: 0.88 },
    { opacity: 0, transform: `perspective(520px) translate3d(${dx}px, ${dy}px, 0) rotateY(0deg) scale(0.6)` },
  ], { duration: 230, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
}

/**
 * Layer 2: Equipment steal/dismantle & delayed scroll flight (.lkdf-equip-flight).
 */
function launchEquipFlight(
  motion: BoardMotion,
  from: Element,
  to: Element,
  card: CardInstance | undefined,
  variant: 'steal' | 'dismantle' | 'scroll' | 'equip',
  delay = 0,
) {
  if (motion.reduced) return;
  const start = relativeBounds(motion, from);
  const end = relativeBounds(motion, to);
  const token = document.createElement('span');
  token.className = 'lkdf-equip-flight';
  token.dataset.flightKind = variant;
  const art = (card ? getCardArtUrl(card.cardKey) : null) ?? getUiAssetUrl('card-back');
  if (art) {
    const image = document.createElement('img');
    image.src = art;
    image.alt = '';
    token.append(image);
  }
  position(token, start.x + start.width / 2 - 23, start.y + start.height / 2 - 32);
  const dx = end.x + end.width / 2 - start.x - start.width / 2;
  const dy = end.y + end.height / 2 - start.y - start.height / 2;
  const arcX = dx * 0.5;
  const arcY = dy * 0.5 - 32;
  motion.layer.append(token);
  animateElement(token, [
    { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.9)' },
    { opacity: 1, transform: `translate3d(${arcX}px, ${arcY}px, 0) rotate(${variant === 'dismantle' ? '14deg' : '-8deg'}) scale(1.06)`, offset: 0.48 },
    { opacity: 0.92, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.74)`, offset: 0.88 },
    { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.55)` },
  ], { duration: 240, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
}

// Only explicit public draw results can identify the recipient and quantity.
const DRAW_RESULT = /^(?:rút|bỏ qua Đột Tập, rút|kích hoạt Lỏa Y, rút|phát động Anh Tư, rút|dùng Vô Trung Sinh Hữu rút|kích hoạt (?:Tập Trí|Khổ Nhục|Liên Doanh|Kiêu Cơ|Bế Nguyệt), rút|kích hoạt Chế Hành, bỏ \d+ lá và rút lại|tiêu diệt Phản Tặc, được rút thưởng) (\d+) lá(?: bài| ở pha Rút bài| nhờ Từ Hùng Song Cổ Kiếm| \(\+1 sát thương Sát\/Quyết Đấu\))?\.$/u;

function showDraws(motion: BoardMotion, previous: PlayerViewState, state: PlayerViewState) {
  const pile = motion.board.querySelector('[data-motion-draw-pile]');
  if (!pile || motion.reduced) return;

  const previousRevealId = previous.publicReveals?.at(-1)?.id ?? 0;
  const newReveals = state.publicReveals?.filter(item => item.id > previousRevealId).length ?? 0;
  let offset = Math.min(newReveals, 2) * 320;
  for (const entry of state.actionLog.slice(previous.actionLog.length)) {
    const recipients = state.players.flatMap((player) => {
      const prefix = player.displayName + ' ';
      const result = entry.startsWith(prefix) && DRAW_RESULT.exec(entry.slice(prefix.length));
      return result ? [{ player, count: Number(result[1]) }] : [];
    });
    if (recipients.length !== 1) continue;

    const { player, count } = recipients[0]!;
    if (previous.availableDrawCount && player.seatIndex === state.viewerSeatIndex) continue;
    const seat = seatAt(motion, player.seatIndex);
    const destination = player.seatIndex === state.viewerSeatIndex
      ? motion.board.querySelector('.lkdf-hand-row') ?? seat
      : seat;
    if (!destination) continue;
    for (let index = 0; index < Math.min(count, 8); index += 1) {
      launchDrawFlight(motion, pile, destination, Math.min(offset, 1440));
      offset += 90;
    }
  }
}

function showTransfers(
  motion: BoardMotion,
  previous: PlayerViewState,
  state: PlayerViewState,
  emitVfx: EmitVfxFn,
) {
  showDraws(motion, previous, state);
  const newLogs = state.actionLog.slice(previous.actionLog.length);
  const latestReveal = state.publicReveals?.at(-1);
  if (latestReveal?.label.startsWith('Phản Gián')) {
    const receiver = state.players.find(player => player.seatIndex === latestReveal.seat);
    const source = motion.board.querySelector('[data-public-card-reveal]') ??
      motion.board.querySelector('.lkdf-battle-center-stack');
    if (receiver && source && newLogs
      .includes(`${receiver.displayName} nhận lá ${latestReveal.card.nameVi} từ Phản Gián.`)) {
      const destination = seatAt(motion, receiver.seatIndex);
      if (destination) transferCard(motion, source, destination, latestReveal.card, 550);
    }
  }
  if (latestReveal?.label.endsWith('Lạc Thần') &&
    latestReveal.id !== previous.publicReveals?.at(-1)?.id &&
    (latestReveal.card.suit === 'SPADE' || latestReveal.card.suit === 'CLUB')) {
    const old = previous.players.find(player => player.seatIndex === latestReveal.seat);
    const current = state.players.find(player => player.seatIndex === latestReveal.seat);
    const source = motion.board.querySelector('[data-public-card-reveal]') ??
      motion.board.querySelector('[data-motion-draw-pile]');
    const destination = seatAt(motion, latestReveal.seat);
    if (source && destination && old && current && current.handCount > old.handCount) {
      transferCard(motion, source, destination, latestReveal.card, 500);
    }
  }
  for (const line of newLogs) {
    const gift = /^(.+) dùng (Nhân Đức|Di Kế) giao (\d+) lá bài cho (.+?)(?: và hồi 1 máu)?\.$/u.exec(line);
    if (!gift) continue;
    const senders = state.players.filter(player => player.displayName === gift[1]);
    const recipients = state.players.filter(player => player.displayName === gift[4]);
    const sender = senders.length === 1 ? senders[0] : undefined;
    const receiver = recipients.length === 1 ? recipients[0] : undefined;
    if (!sender || !receiver || sender.seatIndex === receiver.seatIndex) continue;
    const from = gift[2] === 'Di Kế'
      ? seatAt(motion, sender.seatIndex)
      : handAt(motion, state, sender.seatIndex);
    const to = handAt(motion, state, receiver.seatIndex);
    if (!from || !to) continue;
    for (let index = 0; index < Math.min(Number(gift[3]), 8); index++) {
      transferCard(motion, from, to, undefined, index * 70);
    }
  }
  const center = motion.board.querySelector('.lkdf-battle-center-stack');
  if (!center) return;
  const take = previous.activeInterrupt;
  if (take?.handPick === 'SELECT' && take.sourceSeat != null && take.id !== state.activeInterrupt?.id) {
    const taker = state.players.find(player => player.seatIndex === take.sourceSeat);
    const owner = state.players.find(player => player.seatIndex === take.targetSeat);
    if (taker && owner && newLogs
      .includes(`${taker.displayName} nhận 1 lá úp từ ${owner.displayName}.`)) {
      const hand = taker.seatIndex === state.viewerSeatIndex
        ? motion.board.querySelector('.lkdf-hand-row') ?? seatAt(motion, taker.seatIndex)
        : seatAt(motion, taker.seatIndex);
      if (hand) transferCard(motion, center, hand);
      const ownerSeat = seatAt(motion, owner.seatIndex);
      if (ownerSeat && owner.handCount > 0) transferCard(motion, center, ownerSeat, undefined, 85);
      emitVfx('STEAL', { fromSeat: owner.seatIndex, toSeats: [taker.seatIndex] });
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

  // Layer 2A: Delayed Scrolls placed or passed clockwise (Lạc Bất Tư Thục / Thiểm Điện)
  for (const player of state.players) {
    const oldPlayer = previous.players.find((old) => old.seatIndex === player.seatIndex);
    const destination = seatAt(motion, player.seatIndex);
    if (!destination || !oldPlayer) continue;
    for (const card of player.delayedScrolls) {
      const alreadyOnSelf = oldPlayer.delayedScrolls.some((entry) => entry.id === card.id);
      if (alreadyOnSelf) continue;

      const oldHost = previous.players.find((old) => old.seatIndex !== player.seatIndex &&
        old.delayedScrolls.some((entry) => entry.id === card.id));
      const fromSeat = oldHost ? oldHost.seatIndex : state.currentTurnSeat;
      const fromEl = seatAt(motion, fromSeat) ?? center;
      launchEquipFlight(motion, fromEl, destination, card, 'scroll');
      emitVfx('SCROLL_SEAL', { fromSeat, toSeats: [player.seatIndex] });
    }
  }

  // Layer 2B: Equipment Steal / Dismantle & Hand Dismantle detection
  const prevInterrupt = previous.activeInterrupt;
  const interruptChanged = prevInterrupt !== null && prevInterrupt.id !== state.activeInterrupt?.id;
  const wasStealInterrupt = interruptChanged && prevInterrupt?.kind === 'PICK_TARGET_CARD' && Boolean(prevInterrupt.stealing);
  const wasDismantleInterrupt = interruptChanged && (
    (prevInterrupt?.kind === 'PICK_TARGET_CARD' && !prevInterrupt.stealing) ||
    prevInterrupt?.kind === 'ASK_HAN_BANG_KIEM' ||
    prevInterrupt?.kind === 'ASK_KY_LAN_CUNG'
  );
  const wasCollateralInterrupt = interruptChanged && prevInterrupt?.kind === 'WAIT_COLLATERAL_SAT';

  for (const player of state.players) {
    const old = previous.players.find((entry) => entry.seatIndex === player.seatIndex);
    const victimSeatEl = seatAt(motion, player.seatIndex);
    if (!old || !victimSeatEl || !player.alive) continue;

    let handledEquipLoss = false;
    for (const slot of EQUIP_SLOTS) {
      const oldEq = old.equipments[slot];
      const nowEq = player.equipments[slot];
      if (!oldEq || nowEq) continue;

      if (wasStealInterrupt && prevInterrupt?.targetSeat === player.seatIndex && prevInterrupt.sourceSeat != null) {
        const takerSeat = prevInterrupt.sourceSeat;
        const toEl = handAt(motion, state, takerSeat);
        if (toEl) launchEquipFlight(motion, victimSeatEl, toEl, oldEq, 'steal');
        emitVfx('STEAL', { fromSeat: player.seatIndex, toSeats: [takerSeat] });
        handledEquipLoss = true;
      } else if (
        wasCollateralInterrupt &&
        slot === 'weapon' &&
        prevInterrupt?.attackerSeat === player.seatIndex &&
        prevInterrupt.sourceSeat != null &&
        state.discardPileTop?.id !== oldEq.id
      ) {
        const casterSeat = prevInterrupt.sourceSeat;
        const toEl = handAt(motion, state, casterSeat);
        if (toEl) launchEquipFlight(motion, victimSeatEl, toEl, oldEq, 'steal');
        emitVfx('STEAL', { fromSeat: player.seatIndex, toSeats: [casterSeat] });
        handledEquipLoss = true;
      } else if (wasDismantleInterrupt && prevInterrupt?.targetSeat === player.seatIndex) {
        launchEquipFlight(motion, victimSeatEl, center, oldEq, 'dismantle');
        emitVfx('DISMANTLE', { fromSeat: prevInterrupt.sourceSeat ?? undefined, toSeats: [player.seatIndex] });
        handledEquipLoss = true;
      } else {
        // Check explicit steal/dismantle actionLogs for this equipment
        const stealLog = newLogs.find((line) =>
          line.includes(`lấy trang bị ${oldEq.nameVi} từ ${player.displayName}`),
        );
        if (stealLog) {
          const taker = state.players.find((p) => stealLog.startsWith(p.displayName + ' '));
          const toEl = taker ? handAt(motion, state, taker.seatIndex) : null;
          if (taker && toEl) {
            launchEquipFlight(motion, victimSeatEl, toEl, oldEq, 'steal');
            emitVfx('STEAL', { fromSeat: player.seatIndex, toSeats: [taker.seatIndex] });
            handledEquipLoss = true;
          }
        } else if (
          newLogs.some((line) =>
            line.includes(`hủy trang bị ${oldEq.nameVi} của ${player.displayName}`),
          )
        ) {
          launchEquipFlight(motion, victimSeatEl, center, oldEq, 'dismantle');
          emitVfx('DISMANTLE', { toSeats: [player.seatIndex] });
          handledEquipLoss = true;
        }
      }
    }

    if (!handledEquipLoss && player.handCount < old.handCount) {
      if (wasDismantleInterrupt && prevInterrupt?.targetSeat === player.seatIndex) {
        emitVfx('DISMANTLE', { fromSeat: prevInterrupt.sourceSeat ?? undefined, toSeats: [player.seatIndex] });
      } else if (
        wasStealInterrupt &&
        prevInterrupt?.targetSeat === player.seatIndex &&
        prevInterrupt.handPick !== 'SELECT' &&
        prevInterrupt.sourceSeat != null
      ) {
        emitVfx('STEAL', { fromSeat: player.seatIndex, toSeats: [prevInterrupt.sourceSeat] });
      } else if (
        newLogs.some((line) =>
          line.includes(`hủy 1 lá bài trên tay của ${player.displayName}`),
        )
      ) {
        emitVfx('DISMANTLE', { toSeats: [player.seatIndex] });
      }
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
  const duration = dodged ? 650 : 460;
  const impact = dodged ? 1.16 : 0.94;
  // Anticipation pullback (-8% of vector) before commitment strike, then weighted follow-through
  const antiX = -dx * 0.08;
  const antiY = -dy * 0.08;
  animateElement(face, [
    { transform: 'translate(0px, 0px) scale(1)' },
    { transform: `translate(${antiX}px, ${antiY}px) rotate(-6deg) scale(0.94)`, offset: 0.14 },
    { transform: `translate(${dx * impact}px, ${dy * impact}px) rotate(12deg) scale(1.06)`, offset: 0.54 },
    { transform: `translate(${dx * impact}px, ${dy * impact}px) scale(0.92)`, opacity: 0 },
  ], { duration, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  const reaction = seat.animate(dodged ? [
    { opacity: 1 }, { opacity: .33, translate: '-10px -4px', offset: .42 },
    { opacity: .47, translate: '-10px -4px', offset: .68 }, { opacity: 1, translate: 'none' },
  ] : [
    { translate: 'none' }, { translate: '7px 0', offset: .22 }, { translate: 'none' },
  ], { duration: dodged ? duration : 165, delay: dodged ? 0 : 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  return reaction;
}

function getDuelSeats(state: PlayerViewState): number[] {
  const prompt = state.activeInterrupt;
  if (prompt?.kind !== 'WAIT_DUEL_SAT') return [];
  const seats: number[] = [];
  if (prompt.targetSeat != null) seats.push(prompt.targetSeat);
  if (prompt.sourceSeat != null && prompt.sourceSeat !== prompt.targetSeat) {
    seats.push(prompt.sourceSeat);
  }
  return seats.sort((a, b) => a - b);
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
      } else if (
        action.startsWith('dùng Võ Thánh đánh Sát vào ') ||
        action.startsWith('dùng Long Đảm đánh Sát vào ')
      ) {
        const marker = action.startsWith('dùng Võ Thánh đánh Sát vào ')
          ? 'dùng Võ Thánh đánh Sát vào '
          : 'dùng Long Đảm đánh Sát vào ';
        const rawTargets = action.slice(marker.length).replace(/\.$/, '');
        for (const name of rawTargets.split(', ')) {
          pushArc(actor.seatIndex, findSeatByName(name), 'attack');
        }
      } else if (action.startsWith('dùng Đào cứu ') || action.startsWith('dùng Cấp Cứu hóa Đào cứu ')) {
        const marker = action.startsWith('dùng Đào cứu ') ? 'dùng Đào cứu ' : 'dùng Cấp Cứu hóa Đào cứu ';
        const rest = action.slice(marker.length);
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
  readonly vfxEvents: readonly VfxEvent[];
  readonly duelSeats: readonly number[];
  readonly recoilVectorBySeat: Readonly<Record<number, SeatRecoilVector>>;
  readonly skillStampBySeat: Readonly<Record<number, SeatSkillStamp>>;
} {
  const baseline = useRef<PlayerViewState | null>(null);
  const pending = useRef(new Set<number>());
  const reactions = useRef(new Set<Animation>());
  const arcSeqRef = useRef(0);
  const impactSeqRef = useRef(0);
  const vfxSeqRef = useRef(0);
  const recoilSeqRef = useRef(0);
  const stampSeqRef = useRef(0);

  const traumaRef = useRef(0);
  const shakeRafRef = useRef<number | null>(null);
  const shakeLastTsRef = useRef(0);
  const shakePhaseRef = useRef(0);

  const [activeArcs, setActiveArcs] = useState<readonly CombatActionArc[]>([]);
  const [hpImpacts, setHpImpacts] = useState<Readonly<Record<number, SeatHpImpact>>>({});
  const [vfxEvents, setVfxEvents] = useState<readonly VfxEvent[]>([]);
  const [duelSeats, setDuelSeats] = useState<readonly number[]>([]);
  const [recoilVectorBySeat, setRecoilVectorBySeat] = useState<Readonly<Record<number, SeatRecoilVector>>>({});
  const [skillStampBySeat, setSkillStampBySeat] = useState<Readonly<Record<number, SeatSkillStamp>>>({});

  useEffect(() => {
    const motionLayer = layer.current;
    const timeouts = pending.current;
    const running = reactions.current;
    const boardEl = board.current;
    return () => {
      timeouts.forEach(window.clearTimeout);
      timeouts.clear();
      running.forEach((animation) => animation.cancel());
      running.clear();
      if (shakeRafRef.current !== null) {
        cancelAnimationFrame(shakeRafRef.current);
        shakeRafRef.current = null;
      }
      traumaRef.current = 0;
      if (boardEl) boardEl.style.transform = '';
      motionLayer?.replaceChildren();
      if (motionLayer) delete motionLayer.dataset.duel;
      baseline.current = null;
      setActiveArcs([]);
      setHpImpacts({});
      setVfxEvents([]);
      setDuelSeats([]);
      setRecoilVectorBySeat({});
      setSkillStampBySeat({});
    };
  }, [board, layer, state.matchId, suspended]);

  useEffect(() => {
    const previous = baseline.current;
    baseline.current = suspended ? null : state;
    if (suspended || !board.current || !layer.current) return;
    const motion = {
      board: board.current,
      layer: layer.current,
      reduced: prefersReducedMotion(),
    };

    const addTrauma = (amount: number) => {
      if (motion.reduced) return;
      traumaRef.current = Math.min(1, traumaRef.current + amount);
      if (shakeRafRef.current !== null) return;
      shakeLastTsRef.current = performance.now();
      const stepShake = (ts: number) => {
        const dt = Math.min(0.05, Math.max(0.001, (ts - shakeLastTsRef.current) / 1000));
        shakeLastTsRef.current = ts;
        traumaRef.current = Math.max(0, traumaRef.current - 2.4 * dt);
        const shake = traumaRef.current * traumaRef.current;
        shakePhaseRef.current += dt * 42;
        if (board.current) {
          if (traumaRef.current <= 0) {
            board.current.style.transform = '';
          } else {
            const ox = Math.sin(shakePhaseRef.current * 1.7) * 5 * shake;
            const oy = Math.sin(shakePhaseRef.current * 2.3) * 4 * shake;
            board.current.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
          }
        }
        if (traumaRef.current > 0) {
          shakeRafRef.current = requestAnimationFrame(stepShake);
        } else {
          shakeRafRef.current = null;
        }
      };
      shakeRafRef.current = requestAnimationFrame(stepShake);
    };

    const emitVfx: EmitVfxFn = (kind, opts) => {
      if (motion.reduced) return;
      vfxSeqRef.current += 1;
      const ev: VfxEvent = { id: vfxSeqRef.current, kind, ...opts };
      setVfxEvents((prev) => [...prev, ev]);
      const t = window.setTimeout(() => {
        pending.current.delete(t);
        setVfxEvents((prev) => prev.filter((item) => item.id !== ev.id));
      }, 650);
      pending.current.add(t);
    };

    const triggerRecoil = (toSeat: number, fromSeat?: number) => {
      if (motion.reduced) return;
      const toEl = seatAt(motion, toSeat);
      if (!toEl) return;
      const toRect = relativeBounds(motion, toEl);
      const fromEl = fromSeat != null ? seatAt(motion, fromSeat) : motion.board.querySelector('.lkdf-battle-center-stack');
      let dx = 0;
      let dy = 8;
      if (fromEl) {
        const fromRect = relativeBounds(motion, fromEl);
        const vx = (toRect.x + toRect.width / 2) - (fromRect.x + fromRect.width / 2);
        const vy = (toRect.y + toRect.height / 2) - (fromRect.y + fromRect.height / 2);
        const dist = Math.hypot(vx, vy) || 1;
        dx = Math.round((vx / dist) * 10);
        dy = Math.round((vy / dist) * 10);
      }
      recoilSeqRef.current += 1;
      const rid = recoilSeqRef.current;
      setRecoilVectorBySeat((prev) => ({ ...prev, [toSeat]: { id: rid, x: dx, y: dy } }));
      const t = window.setTimeout(() => {
        pending.current.delete(t);
        setRecoilVectorBySeat((prev) => {
          if (prev[toSeat]?.id !== rid) return prev;
          const next = { ...prev };
          delete next[toSeat];
          return next;
        });
      }, 240);
      pending.current.add(t);
    };

    const triggerSkillStamp = (seatIndex: number, label: string) => {
      stampSeqRef.current += 1;
      const sid = stampSeqRef.current;
      setSkillStampBySeat((prev) => ({ ...prev, [seatIndex]: { id: sid, label } }));
      const actorPlayer = state.players.find((p) => p.seatIndex === seatIndex);
      const faction = actorPlayer?.heroId ? getHeroDefinition(actorPlayer.heroId).faction : undefined;
      emitVfx('SKILL_BURST', { toSeats: [seatIndex], faction });
      const t = window.setTimeout(() => {
        pending.current.delete(t);
        setSkillStampBySeat((prev) => {
          if (prev[seatIndex]?.id !== sid) return prev;
          const next = { ...prev };
          delete next[seatIndex];
          return next;
        });
      }, 1360);
      pending.current.add(t);
    };

    if (!previous) {
      setDuelSeats(getDuelSeats(state));
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
      setActiveArcs([]);
      setHpImpacts({});
      setVfxEvents([]);
      setRecoilVectorBySeat({});
      setSkillStampBySeat({});
      setDuelSeats(getDuelSeats(state));
      return;
    }
    setDuelSeats(getDuelSeats(state));
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

    // Detect Guofeng VFX & Hero Skill Stamps from new actionLog lines
    const stampedSkillsThisTurn = new Set<string>();
    const newLogs = state.actionLog.slice(previous.actionLog.length);
    for (const line of newLogs) {
      if (line.includes('Nam Man Nhập Xâm')) {
        emitVfx('NAM_MAN', { toSeats: state.players.filter((p) => p.alive).map((p) => p.seatIndex) });
        addTrauma(0.32);
      } else if (line.includes('Vạn Tiễn Tề Phát')) {
        emitVfx('VAN_TIEN', { toSeats: state.players.filter((p) => p.alive).map((p) => p.seatIndex) });
        addTrauma(0.32);
      } else if (line.includes('Vô Giải Khả Kích')) {
        const depth =
          previous.activeInterrupt?.kind === 'WAIT_NULLIFICATION'
            ? (previous.activeInterrupt.nullifyDepth ?? 0)
            : state.activeInterrupt?.kind === 'WAIT_NULLIFICATION'
              ? (state.activeInterrupt.nullifyDepth ?? 0)
              : 0;
        emitVfx('NULLIFICATION', { nullifyDepth: depth });
        addTrauma(depth >= 1 ? 0.48 : 0.3);
      } else if (line.includes('Thiểm Điện') && line.includes('sát thương')) {
        const victim = state.players.find((p) => line.startsWith(`${p.displayName} `));
        if (victim) {
          emitVfx('LIGHTNING', { toSeats: [victim.seatIndex] });
          addTrauma(0.78);
        }
      }
      const actors = state.players
        .filter(player => line.startsWith(player.displayName + ' '))
        .sort((first, second) => second.displayName.length - first.displayName.length);
      const actor = actors[0];
      if (actor && actor.displayName !== actors[1]?.displayName) {
        const skillName = getLoggedHeroSkill(line.slice(actor.displayName.length + 1), actor.heroId);
        if (skillName === 'Cứu Viện') {
          const sunQuan =
            state.players.find((p) => p.heroId === 'sun_quan' && line.includes(`cứu ${p.displayName}`)) ??
            state.players.find((p) => p.heroId === 'sun_quan');
          if (sunQuan) {
            stampedSkillsThisTurn.add(`${sunQuan.seatIndex}:Cứu Viện`);
            triggerSkillStamp(sunQuan.seatIndex, 'Cứu Viện');
          }
        } else if (skillName) {
          stampedSkillsThisTurn.add(`${actor.seatIndex}:${skillName}`);
          triggerSkillStamp(actor.seatIndex, skillName);
        }
      }
    }

    // Safe fallback skill stamps from interrupt/flag transitions if not explicitly logged
    if (
      previous.activeInterrupt?.kind === 'ASK_FAN_KUI' &&
      state.activeInterrupt?.kind === 'PICK_TARGET_CARD' &&
      state.activeInterrupt.id.startsWith('fankui_pick_')
    ) {
      const seatIdx = state.activeInterrupt.sourceSeat ?? previous.activeInterrupt.targetSeat;
      if (!stampedSkillsThisTurn.has(`${seatIdx}:Phản Quỷ`)) {
        triggerSkillStamp(seatIdx, 'Phản Quỷ');
      }
    }
    if (
      previous.activeInterrupt?.kind === 'WAIT_TU_XI' &&
      state.activeInterrupt?.kind === 'PICK_TARGET_CARD' &&
      state.activeInterrupt.id.startsWith('tu_xi_take')
    ) {
      const seatIdx = state.activeInterrupt.sourceSeat ?? previous.activeInterrupt.targetSeat;
      if (!stampedSkillsThisTurn.has(`${seatIdx}:Đột Tập`)) {
        triggerSkillStamp(seatIdx, 'Đột Tập');
      }
    }
    if (
      state.activeInterrupt &&
      state.activeInterrupt.id !== previous.activeInterrupt?.id &&
      (state.activeInterrupt.kind === 'WAIT_DODGE' || state.activeInterrupt.kind === 'WAIT_DUEL_SAT') &&
      (state.activeInterrupt.requiredCount ?? 1) >= 2
    ) {
      const luBu = state.players.find((p) => p.heroId === 'lu_bu' && p.alive);
      if (luBu && !stampedSkillsThisTurn.has(`${luBu.seatIndex}:Vô Song`)) {
        triggerSkillStamp(luBu.seatIndex, 'Vô Song');
      }
    }
    const turnActor = state.players.find((p) => p.seatIndex === state.currentTurnSeat);
    if (
      turnActor?.heroId === 'zhang_fei' &&
      (state.turnFlags?.satUsedThisTurn ?? 0) >= 2 &&
      (state.turnFlags?.satUsedThisTurn ?? 0) > (previous.turnFlags?.satUsedThisTurn ?? 0) &&
      !stampedSkillsThisTurn.has(`${turnActor.seatIndex}:Phao Hống`)
    ) {
      triggerSkillStamp(turnActor.seatIndex, 'Phao Hống');
    }

    const incomingDodge = previous.activeInterrupt;
    const strike = previous.discardPileTop;
    const freshDiscard = state.discardPileCount > previous.discardPileCount &&
      state.discardPileTop?.id !== strike?.id;
    showTransfers(motion, previous, state, emitVfx);
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
      if (dodged) {
        track(animateStrike(motion, seat, strike, true));
        emitVfx('THIEM', { toSeats: [player.seatIndex] });
      }
      if (delta < 0 && respondingToStrike && !motion.reduced) {
        track(animateStrike(motion, seat, strike, false));
        const timeout = window.setTimeout(() => {
          pending.current.delete(timeout);
          if (seat.isConnected) {
            triggerHpImpact(player.seatIndex, delta);
            emitVfx('SAT', { fromSeat: incomingDodge?.sourceSeat ?? undefined, toSeats: [player.seatIndex] });
            triggerRecoil(player.seatIndex, incomingDodge?.sourceSeat ?? undefined);
            addTrauma(0.42);
          }
        }, 225);
        pending.current.add(timeout);
      } else if (delta < 0) {
        triggerHpImpact(player.seatIndex, delta);
        triggerRecoil(player.seatIndex, state.currentTurnSeat);
        addTrauma(0.32);
      } else if (delta > 0) {
        triggerHpImpact(player.seatIndex, delta);
        emitVfx('HEAL', { toSeats: [player.seatIndex] });
      }
      if (old.alive && !player.alive) {
        emitVfx('ELIMINATION', { toSeats: [player.seatIndex] });
        addTrauma(0.85);
      } else if (old.hp > 0 && player.hp <= 0 && player.alive) {
        emitVfx('DYING', { toSeats: [player.seatIndex] });
        addTrauma(0.6);
      }
      for (const slot of EQUIP_SLOTS) {
        const equipment = player.equipments[slot];
        if (equipment && equipment.id !== old.equipments[slot]?.id) {
          showEquipmentReveal(motion, seat, equipment);
          emitVfx('EQUIP_FORGE', { toSeats: [player.seatIndex] });
        }
      }
    }
  }, [board, layer, state, suspended]);

  return { activeArcs, hpImpacts, vfxEvents, duelSeats, recoilVectorBySeat, skillStampBySeat };
}
