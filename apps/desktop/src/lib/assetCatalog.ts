import { CUU_CHAU_HEROES, type HeroId } from '@lkdf/shared';

const heroGlob = import.meta.glob<string>('../assets/art/heroes/*.webp', {
  eager: true,
  import: 'default',
});

const cardGlob = import.meta.glob<string>('../assets/art/cards/*.webp', {
  eager: true,
  import: 'default',
});

const uiGlob = import.meta.glob<string>('../assets/art/ui/*.webp', {
  eager: true,
  import: 'default',
});

const sfxGlob = import.meta.glob<string>('../assets/sfx/*.{ogg,mp3,wav}', {
  eager: true,
  import: 'default',
});

function buildLookupByStem(
  globMap: Record<string, string>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [rawPath, resolvedUrl] of Object.entries(globMap)) {
    const fileName = rawPath.split('/').pop() ?? rawPath;
    const stem = fileName.replace(/\.[^.]+$/, '');
    if (stem && typeof resolvedUrl === 'string' && resolvedUrl.length > 0) {
      out[stem] = resolvedUrl;
    }
  }
  return out;
}

const HERO_PORTRAITS = buildLookupByStem(heroGlob);
const CARD_ILLUSTRATIONS = buildLookupByStem(cardGlob);
const UI_TEXTURES = buildLookupByStem(uiGlob);
const SFX_FILES = buildLookupByStem(sfxGlob);

const HERO_ID_ALIASES: Readonly<Record<string, string>> = (() => {
  const aliases: Record<string, string> = {};
  for (const hero of CUU_CHAU_HEROES) {
    aliases[hero.id] = hero.legacySlotId;
    aliases[hero.legacySlotId] = hero.id;
  }
  return aliases;
})();

export type UiArtAssetKey =
  | 'table-bg'
  | 'card-back'
  | 'lobby-banner'
  | 'camp-zhanhuo'
  | 'table-ol-dragon'
  | 'tex-header-black'
  | 'tex-dragon-hand'
  | 'tex-ink-base'
  | 'tex-cloud-border'
  | 'tex-wood-btn'
  | 'tex-mountain-deco';

export function getHeroPortraitUrl(heroId: HeroId | string | null | undefined): string | null {
  if (!heroId) {
    return null;
  }
  const direct = HERO_PORTRAITS[heroId];
  if (direct) {
    return direct;
  }
  const alias = HERO_ID_ALIASES[heroId];
  if (alias && HERO_PORTRAITS[alias]) {
    return HERO_PORTRAITS[alias]!;
  }
  return null;
}

export function getCardArtUrl(cardKey: string | null | undefined): string | null {
  if (!cardKey) {
    return null;
  }
  return CARD_ILLUSTRATIONS[cardKey] ?? null;
}

export function getUiAssetUrl(key: UiArtAssetKey): string | null {
  return UI_TEXTURES[key] ?? null;
}

export function getSfxUrl(stem: string): string | null {
  return SFX_FILES[stem] ?? null;
}
