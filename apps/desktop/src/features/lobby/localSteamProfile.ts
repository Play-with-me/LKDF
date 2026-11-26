import { readAppLocale } from '../../lib/devicePreferences.js';
import type { UserProfile } from '../../lib/types.js';

export function createLocalSteamProfile(personaName?: string | null): UserProfile {
  const cleanName = personaName?.trim() || (readAppLocale() === 'en' ? 'Wanderer' : 'Hiệp Khách');
  const now = new Date().toISOString();
  return {
    userId: 'steam_local_player',
    googleSub: 'steam_local',
    email: 'steam-offline@local',
    displayName: cleanName,
    avatarUrl: '',
    preferences: { soundEnabled: true, musicEnabled: true, volume: 0.8 },
    activeRoomCode: null,
    createdAt: now,
    lastLoginAt: now,
  };
}
