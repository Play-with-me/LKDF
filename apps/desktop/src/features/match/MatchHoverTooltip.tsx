import { useEffect, useRef } from 'react';
import { formatRankLabel, formatSuitSymbol, getCuuChauCardDisplay } from '@lkdf/shared';
import type { CardInstance } from '@lkdf/shared';
import i18n from '../../i18n/index.js';
import { getCardDescriptionVi } from './matchTypes.js';

export function cardHover(card: CardInstance) {
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const display = getCuuChauCardDisplay(card.cardKey, locale, card.nameVi);
  return {
    'data-hover-name': formatRankLabel(card.rank) + formatSuitSymbol(card.suit) + ' · ' + display.name,
    'data-hover-description': getCardDescriptionVi(card.cardKey, display.name),
  };
}

interface BoxRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

function intersectArea(x: number, y: number, w: number, h: number, ob: BoxRect): number {
  const ox = Math.max(0, Math.min(x + w, ob.right) - Math.max(x, ob.left));
  const oy = Math.max(0, Math.min(y + h, ob.bottom) - Math.max(y, ob.top));
  return ox * oy;
}

function collectRects(selectors: readonly string[]): BoxRect[] {
  const seen = new Set<Element>();
  const rects: BoxRect[] = [];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (seen.has(el)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        rects.push(r);
      }
    }
  }
  return rects;
}

function unionRect(rects: readonly BoxRect[]): BoxRect | null {
  if (rects.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const r of rects) {
    if (r.left < left) left = r.left;
    if (r.top < top) top = r.top;
    if (r.right > right) right = r.right;
    if (r.bottom > bottom) bottom = r.bottom;
  }
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
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
      const targetEl = event.target instanceof Element ? event.target : null;
      const inspectorOpen = Boolean(document.querySelector('[data-match-inspector="true"]'));
      if (
        document.querySelector('[data-dragging="true"]') ||
        (targetEl &&
          (targetEl.closest('.lkdf-dock-floating-stack') ||
            targetEl.closest('[data-match-inspector="true"]') ||
            (inspectorOpen && targetEl.closest('[data-inspected-trigger="true"]'))))
      ) {
        hide();
        return;
      }
      const next = find(event.target);
      if (!next || (inspectorOpen && next.matches('[data-inspected-trigger="true"]'))) {
        hide();
        return;
      }
      if (anchor === next) return;
      const info = next.matches('[data-hover-name]') ? next : next.querySelector<HTMLElement>(':scope > [data-hover-name]');
      if (!info) return;
      anchor = next;
      heading.textContent = info.dataset.hoverName ?? '';
      description.textContent = info.dataset.hoverDescription ?? '';
      panel.style.left = '8px';
      panel.style.top = '8px';
      panel.hidden = false;

      const rect = next.getBoundingClientRect();
      const dockEl = document.querySelector<HTMLElement>('.lkdf-battle-dock');
      const isInDock = Boolean(next.closest('.lkdf-battle-dock'));
      const dockRect = dockEl ? dockEl.getBoundingClientRect() : null;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const vw = innerWidth;
      const vh = innerHeight;
      const margin = 8;

      const clampX = (x: number) => Math.max(margin, Math.min(x, vw - w - margin));
      const clampY = (y: number) => Math.max(margin, Math.min(y, vh - h - margin));

      // Protected prompt & action-bar obstacles (NEVER cover!)
      const centerPromptRects = collectRects([
        '.lkdf-battle-center-stack',
        '.lkdf-battle-choice',
        '.lkdf-battle-card-line',
        '.lkdf-private-draw',
        '.lkdf-hero-gacha-stage',
      ]);
      const floatingBarRects = collectRects([
        '.lkdf-dock-floating-stack',
        '.lkdf-dock-floating-bar',
        '[data-match-inspector="true"]',
      ]);
      const criticalObstacles = [...centerPromptRects, ...floatingBarRects];

      // Secondary obstacles: opponent seats & dock (avoid covering seats/hand/equip when possible)
      const seatRects = collectRects(['.lkdf-battle-seat']);
      const secondaryObstacles: BoxRect[] = [
        ...seatRects,
        ...(dockRect && dockRect.height > 0 ? [dockRect] : []),
      ];

      const centerBox = unionRect(centerPromptRects);
      const stackBox = unionRect(floatingBarRects);

      const candidates: Array<{ x: number; y: number }> = [];
      const addCandidate = (x: number, y: number) => {
        candidates.push({ x: clampX(x), y: clampY(y) });
      };

      const maxAboveDockY = dockRect ? dockRect.top - h - 6 : vh - h - margin;

      if (isInDock && dockRect) {
        const anchorTop = stackBox ? Math.min(dockRect.top, stackBox.top) : dockRect.top;
        const centeredX = rect.left + rect.width / 2 - w / 2;
        const midX = Math.round((vw - w) / 2);

        addCandidate(centeredX, anchorTop - h - 8);
        addCandidate(centeredX, dockRect.top - h - 8);
        addCandidate(midX, anchorTop - h - 8);

        if (stackBox) {
          addCandidate(stackBox.left - w - 8, dockRect.top - h - 8);
          addCandidate(stackBox.right + 8, dockRect.top - h - 8);
          addCandidate(margin, dockRect.top - h - 8);
          addCandidate(vw - w - margin, dockRect.top - h - 8);
        }
        if (centerBox) {
          addCandidate(centerBox.left - w - 10, dockRect.top - h - 8);
          addCandidate(centerBox.right + 10, dockRect.top - h - 8);
          addCandidate(centerBox.left - w - 10, centerBox.bottom - h);
          addCandidate(centerBox.right + 10, centerBox.bottom - h);
          addCandidate(centerBox.left - w - 10, centerBox.top);
          addCandidate(centerBox.right + 10, centerBox.top);
          if (centerBox.bottom + 6 + h <= anchorTop - 4) {
            addCandidate(centeredX, centerBox.bottom + 6);
          }
        }
      } else {
        const centeredX = rect.left + rect.width / 2 - w / 2;
        const centeredY = rect.top + rect.height / 2 - h / 2;

        // Primary positions around hovered seat / table card / skill
        addCandidate(rect.right + 8, rect.top);
        addCandidate(rect.left - w - 8, rect.top);
        addCandidate(rect.right + 8, rect.bottom - h);
        addCandidate(rect.left - w - 8, rect.bottom - h);
        addCandidate(rect.right + 8, centeredY);
        addCandidate(rect.left - w - 8, centeredY);
        addCandidate(centeredX, rect.bottom + 8);
        addCandidate(centeredX, rect.top - h - 8);
        addCandidate(rect.left, rect.bottom + 8);
        addCandidate(rect.right - w, rect.bottom + 8);
        addCandidate(rect.left, rect.top - h - 8);
        addCandidate(rect.right - w, rect.top - h - 8);

        // Safe side gutters around center prompt stack & floating action stack
        if (centerBox) {
          addCandidate(centerBox.left - w - 10, rect.top);
          addCandidate(centerBox.right + 10, rect.top);
          addCandidate(centerBox.left - w - 10, centerBox.top);
          addCandidate(centerBox.right + 10, centerBox.top);
          addCandidate(centerBox.left - w - 10, centerBox.bottom - h);
          addCandidate(centerBox.right + 10, centerBox.bottom - h);
          if (centerBox.top - h - 8 >= margin) {
            addCandidate(centeredX, centerBox.top - h - 8);
          }
          if (centerBox.bottom + 8 <= maxAboveDockY) {
            addCandidate(centeredX, centerBox.bottom + 8);
          }
        }
        if (stackBox && dockRect) {
          addCandidate(stackBox.left - w - 8, dockRect.top - h - 8);
          addCandidate(stackBox.right + 8, dockRect.top - h - 8);
        }
      }

      // Arena side gutters (left & right edges at top/mid/above-dock)
      const gutterYs = [
        48,
        Math.round(Math.max(48, (maxAboveDockY - 48) * 0.45)),
        Math.max(margin, maxAboveDockY),
      ];
      for (const gy of gutterYs) {
        addCandidate(margin, gy);
        addCandidate(vw - w - margin, gy);
      }

      const anchorCx = rect.left + rect.width / 2;
      const anchorCy = rect.top + rect.height / 2;

      const scoreCandidate = (x: number, y: number): number => {
        let critArea = 0;
        for (const ob of criticalObstacles) {
          critArea += intersectArea(x, y, w, h, ob);
        }
        const anchorOverlap = intersectArea(x, y, w, h, rect);
        let secArea = 0;
        for (const ob of secondaryObstacles) {
          secArea += intersectArea(x, y, w, h, ob);
        }
        const topSettingsPenalty = y < 44 && x + w > vw - 440 ? 5_000 : 0;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const dist = Math.hypot(cx - anchorCx, cy - anchorCy);

        return (
          (critArea > 0 ? 10_000_000 + critArea * 1000 : 0) +
          (anchorOverlap > 0 ? 1_000_000 + anchorOverlap * 200 : 0) +
          (secArea > 0 ? 10_000 + secArea * 10 : 0) +
          topSettingsPenalty +
          dist * 0.01
        );
      };

      let best = candidates[0]!;
      let bestScore = scoreCandidate(best.x, best.y);

      for (const cand of candidates.slice(1)) {
        const s = scoreCandidate(cand.x, cand.y);
        if (s < bestScore) {
          best = cand;
          bestScore = s;
        }
      }

      // If primary candidates still touch any obstacle, sample a compact safe-pocket grid
      if (bestScore >= 10_000) {
        const xs = [
          margin,
          Math.round(vw * 0.22),
          Math.round((vw - w) / 2),
          Math.round(vw * 0.78 - w),
          vw - w - margin,
        ];
        const minY = 48;
        const maxY = Math.max(minY, maxAboveDockY);
        for (let row = 0; row <= 4; row++) {
          const gy = clampY(Math.round(minY + ((maxY - minY) * row) / 4));
          for (const gx of xs) {
            const cx = clampX(gx);
            const s = scoreCandidate(cx, gy);
            if (s < bestScore) {
              best = { x: cx, y: gy };
              bestScore = s;
            }
          }
        }
      }

      panel.style.left = `${best.x}px`;
      panel.style.top = `${best.y}px`;
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
