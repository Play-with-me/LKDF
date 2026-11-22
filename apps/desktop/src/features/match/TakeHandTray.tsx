import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { useLayoutEffect, useRef, useState } from 'react';
import type { GameAction, PublicInterruptView, PublicPlayerView } from '@lkdf/shared';
import { CardBack } from '../../components/icons/index.js';
import { PlayingCardFace } from './HandCardItem.js';

interface Props {
  readonly interrupt: PublicInterruptView;
  readonly owner: PublicPlayerView;
  readonly viewerSeat: number;
  readonly onSendAction: (action: GameAction) => void;
}

export function TakeHandTray({ interrupt, owner, viewerSeat, onSendAction }: Props) {
  const preparing = interrupt.handPick === 'PREPARE';
  const canPrepare = preparing && owner.seatIndex === viewerSeat && owner.handCards !== null;
  const canPick = !preparing && interrupt.sourceSeat === viewerSeat;
  const [order, setOrder] = useState(() => canPrepare ? [...owner.handCards!] : []);
  const [slot, setSlot] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);
  const submitting = useRef(false);
  const [sent, setSent] = useState(false);
  const cards = useRef<HTMLDivElement>(null);
  const moving = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    if (canPrepare || prefersReducedMotion()) return;
    const row = cards.current;
    if (!row) return;
    const tray = row.getBoundingClientRect();
    const arena = row.closest('.lkdf-arena-stage');
    const source = arena?.querySelector(owner.seatIndex === viewerSeat
      ? '.lkdf-battle-hand'
      : `[data-drop-seat="${owner.seatIndex}"] [data-motion-hand-count]`);
    const origin = source?.getBoundingClientRect();
    if (origin) row.style.overflow = 'visible';
    // All public motion is based on anonymous positions, never on the owner's final order.
    const animations = Array.from(row.children, (card, index) => {
      const rect = card.getBoundingClientRect();
      const dx = (tray.left + tray.width / 2 - rect.left - rect.width / 2) * .65;
      const lane = index % 2 ? 1 : -1;
      return card.animate([
        {
          translate: origin
            ? `${origin.left + (origin.width - rect.width) / 2 - rect.left}px ${origin.top + (origin.height - rect.height) / 2 - rect.top}px`
            : '0 0',
          opacity: origin ? 0 : 1,
        },
        { translate: '0 0', opacity: 1, offset: .4 },
        { translate: `${dx}px ${lane * 8}px`, rotate: `${lane * 6}deg`, offset: .55 },
        { translate: `${dx + lane * 8}px ${-lane * 6}px`, rotate: `${-lane * 5}deg`, offset: .65 },
        { translate: '0 0' },
      ], { duration: 620, delay: Math.min(index, 6) * 12, easing: 'ease-in-out', fill: 'backwards' });
    });
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (animations.every(animation => animation.playState === 'finished')) row.style.overflow = '';
    });
    return () => {
      animations.forEach(animation => animation.cancel());
      row.style.overflow = '';
    };
  }, [canPrepare, owner.seatIndex, viewerSeat]);
  useLayoutEffect(() => () => moving.current.forEach(animation => animation.cancel()), []);

  function swap(first: number, second: number) {
    setSlot(null);
    if (first === second) return;
    setOrder(current => {
      const next = [...current];
      [next[first], next[second]] = [next[second]!, next[first]!];
      return next;
    });
    const elements = cards.current?.children;
    if (!elements || prefersReducedMotion()) return;
    moving.current.forEach(animation => animation.cancel());
    const dx = elements[second]!.getBoundingClientRect().left - elements[first]!.getBoundingClientRect().left;
    moving.current = [[first, dx], [second, -dx]].map(([index, offset]) =>
      elements[index!]!.animate([
        { translate: `${offset}px 0` }, { translate: '0 0' },
      ], { duration: 210, easing: 'ease-out' }));
  }

  function confirm() {
    if (submitting.current) return;
    if (canPrepare) {
      submitting.current = true;
      setSent(true);
      onSendAction({ type: 'CONFIRM_STEAL_HAND', seatIndex: viewerSeat, orderedCardIds: order.map(card => card.id) });
    } else if (canPick && slot !== null) {
      submitting.current = true;
      setSent(true);
      onSendAction({ type: 'RESPOND_PICK_TARGET_CARD', seatIndex: viewerSeat, zone: 'HAND', handIndex: slot });
    }
  }

  return (
    <section aria-label="Khay lấy bài úp" className="pointer-events-auto flex w-[min(420px,48cqw)] min-w-0 flex-col gap-2 rounded-lg border border-[#9a774e] bg-[#261c17] p-2 text-[#f4e3bd] shadow-lg">
      <p className="text-center text-xs font-semibold">
        {sent ? 'Đang chờ xác nhận…' : canPrepare ? 'Kéo hoặc bấm hai lá để đổi chỗ'
          : canPick ? 'Chọn 1 lá úp để nhận' : preparing ? 'Đang chờ chủ bài xác nhận' : 'Đang chờ người rút chọn lá'}
      </p>
      <div ref={cards} className="flex min-w-0 gap-1 overflow-x-auto p-1">
        {Array.from({ length: owner.handCount }, (_, index) => {
          const face = canPrepare && !sent ? order[index] : undefined;
          return <button type="button" key={index} disabled={sent || (!canPrepare && !canPick)}
            draggable={canPrepare && !sent}
            aria-label={face?.nameVi ?? `Lá úp ${index + 1}`}
            aria-pressed={canPrepare || canPick ? slot === index : undefined}
            onDragStart={event => { if (!canPrepare) return; dragging.current = index; event.dataTransfer.setData('text/plain', String(index)); }}
            onDragEnd={() => { dragging.current = null; }}
            onDragOver={event => { if (canPrepare) event.preventDefault(); }}
            onDrop={event => {
              event.preventDefault();
              const from = dragging.current;
              dragging.current = null;
              if (canPrepare && !sent && from !== null) swap(from, index);
            }}
            onClick={() => {
              if (canPrepare && slot !== null) swap(slot, index);
              else setSlot(index);
            }}
            className="relative flex h-[clamp(48px,10cqh,84px)] w-[clamp(29px,5cqw,60px)] shrink-0 flex-col items-center justify-center overflow-hidden rounded border border-[#9a774e] bg-[#151a22] focus-visible:outline-2 focus-visible:outline-[#ffe1a3] aria-pressed:border-[#ffdf9b] aria-pressed:ring-1 aria-pressed:ring-[#ffdf9b]"
          >
            {face ? <PlayingCardFace card={face} /> : <CardBack size="md" className="h-full! w-full!" />}
          </button>;
        })}
      </div>
      {(canPrepare || canPick) && <button type="button" onClick={confirm}
        disabled={sent || (canPick && slot === null)}
        className="self-center rounded border border-[#ae8956] bg-[#463321] px-3 py-1 text-xs font-semibold disabled:opacity-50">
        {canPrepare ? 'Xác nhận úp bài' : 'Nhận lá đã chọn'}
      </button>}
    </section>
  );
}
