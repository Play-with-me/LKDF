export type DevicePreferenceKey = 'reduceMotion' | 'taskbarFlash' | 'onboardingHints';
export type AppLocale = 'vi' | 'en';

export function readAppLocale(): AppLocale {
  try {
    const value = localStorage.getItem('lkdf.settings.locale');
    if (value === 'vi' || value === 'en') return value;
  } catch {
    // Storage can be unavailable in headless previews.
  }
  return 'vi';
}

export function writeAppLocale(locale: AppLocale): boolean {
  try {
    localStorage.setItem('lkdf.settings.locale', locale);
  } catch {
    return false;
  }
  document.documentElement.lang = locale;
  return true;
}

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
