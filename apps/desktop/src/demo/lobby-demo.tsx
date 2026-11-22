import { applyMotionPreference } from '../lib/devicePreferences.js';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HomeLobbyHub } from '../features/lobby/HomeLobbyHub.js';
import { LOBBY_PREVIEW_PROFILE } from '../features/lobby/lobbyPreviewProfile.js';
import { createApiClient } from '../lib/api.js';
import { DemoAudioStudio } from './DemoAudioStudio.js';
import { demoAudioEngine } from './demoAudioEngine.js';
import { DemoHostLobby, DemoOnline } from './DemoOnline.js';
import { DemoProfile } from './DemoProfile.js';
import './lobby-demo.css';

const api = createApiClient(window.location.origin);
const CONTROLS = 'button, a[href], select, summary, [role="button"], [role="tab"], [role="switch"]';

function controlFor(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(CONTROLS) : null;
}

function useDemoAudioLifecycle(sfxEnabled: boolean, musicEnabled: boolean) {
  useEffect(() => {
    demoAudioEngine.setBusVolume('sfx', sfxEnabled ? 0.85 : 0);
    demoAudioEngine.setBusVolume('ui', sfxEnabled ? 0.78 : 0);
    if (sfxEnabled) demoAudioEngine.preloadAll();
  }, [sfxEnabled]);

  useEffect(() => {
    const syncVisibility = () => {
      const hidden = document.hidden || !document.hasFocus();
      demoAudioEngine.setVisibilityPaused(hidden);
    };
    const pause = () => demoAudioEngine.setVisibilityPaused(true);

    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('focus', syncVisibility);
    window.addEventListener('blur', pause);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', syncVisibility);
    syncVisibility();

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', syncVisibility);
      window.removeEventListener('blur', pause);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', syncVisibility);
      pause();
    };
  }, []);

  useEffect(() => {
    if (!musicEnabled) {
      void demoAudioEngine.setMusicMode('off');
    } else if (demoAudioEngine.getState().musicMode === 'off') {
      void demoAudioEngine.setMusicMode('lobby');
    } else {
      void demoAudioEngine.setMusicMode(demoAudioEngine.getState().musicMode);
    }
  }, [musicEnabled]);

  useEffect(() => {
    if (!sfxEnabled && !musicEnabled) return;

    function onHover(event: PointerEvent) {
      if (!sfxEnabled || event.pointerType !== 'mouse' || event.buttons) return;
      const control = controlFor(event.target);
      if (!control || control === controlFor(event.relatedTarget) ||
        control.matches(':disabled, [aria-disabled="true"], [data-no-ui-click="true"]')) return;
      demoAudioEngine.playCue('HOVER');
    }

    function playClick(target: EventTarget | null) {
      if (!sfxEnabled) return;
      const control = controlFor(target);
      if (!control || control.matches(':disabled, [aria-disabled="true"], [data-no-ui-click="true"]')) return;
      demoAudioEngine.playCue('CLICK');
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || event.pointerType !== 'mouse') return;
      demoAudioEngine.unlock();
      if (musicEnabled && demoAudioEngine.getState().musicMode !== 'off') {
        void demoAudioEngine.setMusicMode(demoAudioEngine.getState().musicMode);
      }
      playClick(event.target);
    }

    function onClick(event: MouseEvent) {
      if (musicEnabled) demoAudioEngine.unlock();
      if (event.detail === 0 || (event instanceof PointerEvent && event.pointerType !== 'mouse')) {
        playClick(event.target);
      }
    }

    function onKeyDown() {
      demoAudioEngine.unlock();
    }

    document.addEventListener('pointerover', onHover);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onHover);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [sfxEnabled, musicEnabled]);
}

function LobbyDemo() {
  const [profile, setProfile] = useState(LOBBY_PREVIEW_PROFILE);

  const musicEnabled = profile.preferences.musicEnabled ?? profile.preferences.soundEnabled;
  useDemoAudioLifecycle(profile.preferences.soundEnabled, musicEnabled);
  return (
    <>
      <HomeLobbyHub
        OnlinePreview={DemoOnline}
        ProfilePreview={DemoProfile}
        api={api}
        sessionToken={null}
        profile={profile}
        justLoggedIn={false}
        onDismissWelcomeToast={() => {}}
        onProfileUpdated={setProfile}
        onEnterRoom={() => {}}
        onLoggedOut={() => {}}
        onSessionInvalid={() => {}}
      />
      <DemoAudioStudio />
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy vùng hiển thị sảnh demo.');
const hostView = new URLSearchParams(window.location.search).get('view') === 'host';
applyMotionPreference();
createRoot(root).render(hostView ? <DemoHostLobby /> : <LobbyDemo />);
