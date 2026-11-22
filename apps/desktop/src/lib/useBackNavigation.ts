import { useEffect } from 'react';

let lastMouseBack: { source: 'dom' | 'native'; time: number } | undefined;

export function useBackNavigation(active: boolean, onBack: () => void): void {
  useEffect(() => {
    if (!active) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.repeat ||
        document.querySelector('dialog[open]')) return;
      event.preventDefault();
      onBack();
    }

    function dispatchMouseBack(source: 'dom' | 'native') {
      const time = performance.now();
      // Windows can report a single side click both in Chromium and as an app command.
      if (lastMouseBack && lastMouseBack.source !== source && time - lastMouseBack.time < 160) {
        lastMouseBack = undefined;
        return;
      }
      lastMouseBack = { source, time };
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
    }

    function handleMouse(event: MouseEvent) {
      if (event.button !== 3) return;
      event.preventDefault();
      if (event.type === 'mouseup') dispatchMouseBack('dom');
    }

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleMouse, true);
    window.addEventListener('mouseup', handleMouse, true);
    window.addEventListener('auxclick', handleMouse, true);
    const unsubscribe = window.lkdfDesktop?.onNavigateBack?.(() => dispatchMouseBack('native'));

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleMouse, true);
      window.removeEventListener('mouseup', handleMouse, true);
      window.removeEventListener('auxclick', handleMouse, true);
      unsubscribe?.();
    };
  }, [active, onBack]);
}
