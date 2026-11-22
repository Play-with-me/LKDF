import { useEffect, useRef } from 'react';
import { createAmbientLoop, type AmbientLoopHandle, type AmbientTrack } from './soundFx.js';

export function useGameAmbience(level: number, track: AmbientTrack = 'lobby'): void {
  const enabled = level > 0;
  const loop = useRef<AmbientLoopHandle | null>(null);
  const levelRef = useRef(level);
  const trackRef = useRef(track);

  useEffect(() => {
    levelRef.current = level;
    loop.current?.setLevel(level);
  }, [level]);

  useEffect(() => {
    trackRef.current = track;
    loop.current?.setTrack(track);
  }, [track]);

  useEffect(() => {
    if (!enabled) return;
    const isDesktop = Boolean(window.lkdfDesktop);
    let pending: AbortController | null = null;

    function stop() {
      pending?.abort();
      pending = null;
      loop.current?.stop();
      loop.current = null;
    }

    function syncPlayback() {
      if (!isDesktop && (document.hidden || !document.hasFocus())) {
        stop();
        return;
      }
      if (pending || loop.current) return;

      const request = new AbortController();
      pending = request;
      void createAmbientLoop(trackRef.current, request.signal).then(ambient => {
        if (request.signal.aborted) {
          ambient?.stop();
          return;
        }
        pending = null;
        loop.current = ambient;
        ambient?.setLevel(levelRef.current);
        ambient?.setTrack(trackRef.current);
      });
    }

    if (!isDesktop) {
      document.addEventListener('visibilitychange', syncPlayback);
      window.addEventListener('focus', syncPlayback);
      window.addEventListener('blur', stop);
      window.addEventListener('pagehide', stop);
      window.addEventListener('pageshow', syncPlayback);
    }
    syncPlayback();

    return () => {
      if (!isDesktop) {
        document.removeEventListener('visibilitychange', syncPlayback);
        window.removeEventListener('focus', syncPlayback);
        window.removeEventListener('blur', stop);
        window.removeEventListener('pagehide', stop);
        window.removeEventListener('pageshow', syncPlayback);
      }
      stop();
    };
  }, [enabled]);
}
