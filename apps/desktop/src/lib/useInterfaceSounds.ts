import { useEffect } from 'react';
import { playInterfaceCue, prepareGameSounds, unlockGameSounds } from './soundFx.js';

const CONTROLS = 'button, a[href], select, summary, [role="button"], [role="tab"], [role="switch"]';

function controlFor(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[data-no-ui-click="true"]')) return null;
  return target.closest(CONTROLS);
}

export function useInterfaceSounds(enabled: boolean, musicActive = false): void {
  useEffect(() => {
    if (!enabled && !musicActive) return;
    if (enabled) prepareGameSounds();

    function onHover(event: PointerEvent) {
      if (!enabled || event.pointerType !== 'mouse' || event.buttons) return;
      const control = controlFor(event.target);
      if (!control || control === controlFor(event.relatedTarget) ||
        control.matches(':disabled, [aria-disabled="true"]')) return;
      playInterfaceCue('hover');
    }

    function playClick(target: EventTarget | null) {
      if (!enabled) return;
      const control = controlFor(target);
      if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
      playInterfaceCue('click');
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || event.pointerType !== 'mouse') return;
      unlockGameSounds();
      playClick(event.target);
    }

    function onClick(event: MouseEvent) {
      if (musicActive) unlockGameSounds();
      // Mouse clicks already sound at pointerdown. Keep keyboard and touch activation.
      if (event.detail === 0 || (event instanceof PointerEvent && event.pointerType !== 'mouse')) {
        playClick(event.target);
      }
    }

    document.addEventListener('pointerover', onHover);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', unlockGameSounds, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onHover);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', unlockGameSounds, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled, musicActive]);
}
