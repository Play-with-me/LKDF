export type DevicePreferenceKey = 'reduceMotion' | 'taskbarFlash' | 'onboardingHints';

export function readDevicePreference(key: DevicePreferenceKey): boolean {
  try {
    const value = localStorage.getItem('lkdf.settings.' + key);
    if (value !== null) return value === 'true';
  } catch {
    // Storage can be unavailable in the browser preview.
  }
  return key === 'taskbarFlash' || key === 'onboardingHints';
}

export function writeDevicePreference(key: DevicePreferenceKey, enabled: boolean): boolean {
  try {
    localStorage.setItem('lkdf.settings.' + key, String(enabled));
  } catch {
    return false;
  }
  if (key === 'reduceMotion') applyMotionPreference();
  return true;
}

export function applyMotionPreference(): void {
  document.documentElement.toggleAttribute('data-lkdf-reduce-motion', readDevicePreference('reduceMotion'));
}

export function prefersReducedMotion(): boolean {
  return readDevicePreference('reduceMotion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
