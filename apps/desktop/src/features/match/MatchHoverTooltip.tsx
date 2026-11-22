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
        const centeredLeft = rect.left + rect.width / 2 - panel.offsetWidth / 2;
        const clampedLeft = Math.max(8, Math.min(centeredLeft, innerWidth - panel.offsetWidth - 8));
        const aboveDockTop = Math.max(8, dockRect.top - panel.offsetHeight - 10);
        panel.style.left = `${clampedLeft}px`;
        panel.style.top = `${aboveDockTop}px`;
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
