import { useEffect, useRef } from 'react';
import { formatRankLabel, formatSuitSymbol } from '@lkdf/shared';
import type { CardInstance } from '@lkdf/shared';
import { getCardDescriptionVi } from './matchTypes.js';

export function cardHover(card: CardInstance) {
  return {
    'data-hover-name': formatRankLabel(card.rank) + formatSuitSymbol(card.suit) + ' · ' + card.nameVi,
    'data-hover-description': getCardDescriptionVi(card.cardKey, card.nameVi),
  };
}

export function MatchHoverTooltip() {
  const tooltip = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = tooltip.current;
    const heading = panel?.querySelector('strong');
    const description = panel?.querySelector('p');
    if (!panel || !heading || !description) return;
    let anchor: HTMLElement | null = null;
    const hide = () => { anchor = null; panel.hidden = true; };
    const find = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const trigger = target.closest<HTMLElement>('button,.lkdf-card-gwent,[data-hover-name]');
      return trigger?.matches('[data-hover-name]') ? trigger : trigger?.querySelector<HTMLElement>(':scope > [data-hover-name]')?.parentElement ?? null;
    };
    const show = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.lkdf-dock-floating-stack')) {
        hide();
        return;
      }
      const next = find(event.target);
      if (!next || anchor === next) return;
      const info = next.matches('[data-hover-name]') ? next : next.querySelector<HTMLElement>(':scope > [data-hover-name]');
      if (!info) return;
      anchor = next;
      heading.textContent = info.dataset.hoverName ?? '';
      description.textContent = info.dataset.hoverDescription ?? '';
      panel.hidden = false;
      const rect = next.getBoundingClientRect();
      const dock = next.closest('.lkdf-battle-dock');
      if (dock) {
        const dockRect = dock.getBoundingClientRect();
        const stack = dock.querySelector<HTMLElement>('.lkdf-dock-floating-stack');
        const stackRect = stack ? stack.getBoundingClientRect() : null;
        const cardLine = document.querySelector<HTMLElement>('.lkdf-battle-card-line');
        const centerBox = document.querySelector<HTMLElement>('.lkdf-battle-choice') ?? cardLine;
        const centerRect = centerBox ? centerBox.getBoundingClientRect() : null;
        const anchorTop = stackRect && stackRect.height > 0 ? Math.min(dockRect.top, stackRect.top) : dockRect.top;
        const w = panel.offsetWidth;
        const h = panel.offsetHeight;

        const seats = Array.from(document.querySelectorAll<HTMLElement>('.lkdf-battle-seat')).map((s) =>
          s.getBoundingClientRect(),
        );
        const obstacles = [
          ...seats,
          ...(stackRect && stackRect.height > 0 ? [stackRect] : []),
          ...(centerRect && centerRect.height > 0 ? [centerRect] : []),
        ];

        const overlapsAny = (x: number, y: number): number => {
          let totalArea = 0;
          for (const ob of obstacles) {
            const ox = Math.max(0, Math.min(x + w, ob.right) - Math.max(x, ob.left));
            const oy = Math.max(0, Math.min(y + h, ob.bottom) - Math.max(y, ob.top));
            totalArea += ox * oy;
          }
          return totalArea;
        };

        const centeredX = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, innerWidth - w - 8));
        const defaultY = Math.max(8, anchorTop - h - 8);
        const candidates: Array<{ x: number; y: number }> = [{ x: centeredX, y: defaultY }];

        if (centerRect) {
          const belowCenterY = Math.max(8, centerRect.bottom + 4);
          if (belowCenterY + h <= anchorTop - 4) {
            candidates.push({ x: centeredX, y: belowCenterY });
          }
          const sideY = Math.max(8, dockRect.top - h - 8);
          candidates.push(
            { x: Math.max(8, centerRect.left - w - 8), y: sideY },
            { x: Math.min(innerWidth - w - 8, centerRect.right + 8), y: sideY },
            { x: Math.max(8, centerRect.left - w - 8), y: defaultY },
            { x: Math.min(innerWidth - w - 8, centerRect.right + 8), y: defaultY },
          );
        }
        if (stackRect && stackRect.height > 0) {
          const flushDockY = Math.max(8, dockRect.top - h - 8);
          candidates.push(
            { x: Math.max(8, stackRect.left - w - 8), y: flushDockY },
            { x: Math.min(innerWidth - w - 8, stackRect.right + 8), y: flushDockY },
          );
        }

        let best = candidates[0]!;
        let bestOverlap = overlapsAny(best.x, best.y);
        for (const cand of candidates.slice(1)) {
          if (cand.x < 4 || cand.x + w > innerWidth - 4 || cand.y < 4 || cand.y + h > dockRect.top - 4) {
            continue;
          }
          const area = overlapsAny(cand.x, cand.y);
          if (area < bestOverlap) {
            best = cand;
            bestOverlap = area;
            if (area === 0) break;
          }
        }

        panel.style.left = `${best.x}px`;
        panel.style.top = `${best.y}px`;
      } else {
        const preferredLeft =
          rect.right + 8 + panel.offsetWidth <= innerWidth
            ? rect.right + 8
            : rect.left - 8 - panel.offsetWidth;
        const clampedLeft = Math.max(8, Math.min(preferredLeft, innerWidth - panel.offsetWidth - 8));
        const clampedTop = Math.max(8, Math.min(rect.top, innerHeight - panel.offsetHeight - 8));
        panel.style.left = `${clampedLeft}px`;
        panel.style.top = `${clampedTop}px`;
      }
    };
    const leave = (event: MouseEvent | FocusEvent) => {
      if (anchor && find(event.target) === anchor && find(event.relatedTarget) !== anchor) hide();
    };
    document.addEventListener('pointerover', show);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusin', show);
    document.addEventListener('focusout', leave);
    document.addEventListener('pointerdown', hide);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('pointerover', show);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusin', show);
      document.removeEventListener('focusout', leave);
      document.removeEventListener('pointerdown', hide);
      window.removeEventListener('resize', hide);
    };
  }, []);
  return <aside ref={tooltip} role="tooltip" hidden className="lkdf-hover-description"><strong /><p /></aside>;
}
