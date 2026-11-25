export interface SteamRuntimeStatus {
  readonly enabled: boolean;
  readonly available: boolean;
  readonly appId: number;
  readonly overlayEnabled: boolean;
  readonly steamId: string | null;
  readonly personaName: string | null;
  readonly error: string | null;
}

interface SteamworksModuleLike {
  init: (appId?: number) => {
    localplayer?: {
      getSteamId?: () => { steamId64?: bigint | string };
      getName?: () => string;
    };
  };
  electronEnableSteamOverlay?: (disableEachFrameInvalidation?: boolean) => void;
}

export function initSteamBridge(
  appId: number,
  enabled: boolean,
): SteamRuntimeStatus {
  if (!enabled) {
    return {
      enabled: false,
      available: false,
      appId,
      overlayEnabled: false,
      steamId: null,
      personaName: null,
      error: 'BUILD_TARGET is not steam',
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const steamworks = require('steamworks.js') as SteamworksModuleLike;
    const client = steamworks.init(appId);
    let overlayEnabled = false;
    if (typeof steamworks.electronEnableSteamOverlay === 'function') {
      steamworks.electronEnableSteamOverlay(false);
      overlayEnabled = true;
    }
    const rawId = client.localplayer?.getSteamId?.()?.steamId64;
    const steamId = rawId !== undefined ? String(rawId) : null;
    const personaName = client.localplayer?.getName?.() ?? null;
    return {
      enabled: true,
      available: true,
      appId,
      overlayEnabled,
      steamId,
      personaName,
      error: null,
    };
  } catch (err: unknown) {
    return {
      enabled: true,
      available: false,
      appId,
      overlayEnabled: false,
      steamId: null,
      personaName: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
