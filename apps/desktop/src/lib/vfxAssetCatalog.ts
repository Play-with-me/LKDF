const vfxGlob = import.meta.glob<string>('../assets/vfx/*.{gif,webp}', {
  eager: true,
  import: 'default',
});

export type VfxAssetKey =
  | 'vfx-ink-slash'
  | 'vfx-peach-bloom'
  | 'vfx-bagua-seal'
  | 'vfx-thunder-strike'
  | 'vfx-dying-fire-loop'
  | 'vfx-turn-seal-loop';

export interface VfxFlipbookSpec {
  readonly frames: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly isLoop?: boolean;
}

export const VFX_ASSET_SPECS: Readonly<Record<VfxAssetKey, VfxFlipbookSpec>> = {
  'vfx-ink-slash': { frames: 10, frameWidth: 192, frameHeight: 192 },
  'vfx-peach-bloom': { frames: 12, frameWidth: 180, frameHeight: 180 },
  'vfx-bagua-seal': { frames: 12, frameWidth: 180, frameHeight: 180 },
  'vfx-thunder-strike': { frames: 10, frameWidth: 192, frameHeight: 256 },
  'vfx-dying-fire-loop': { frames: 12, frameWidth: 192, frameHeight: 112, isLoop: true },
  'vfx-turn-seal-loop': { frames: 12, frameWidth: 128, frameHeight: 128, isLoop: true },
};

function buildVfxUrlLookup(
  globMap: Record<string, string>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  const extByStem: Record<string, string> = {};
  for (const [rawPath, resolvedUrl] of Object.entries(globMap)) {
    if (typeof resolvedUrl !== 'string' || resolvedUrl.length === 0) continue;
    const fileName = rawPath.split('/').pop() ?? rawPath;
    const match = /^(.+)\.(gif|webp)$/i.exec(fileName);
    if (!match) continue;
    const stem = match[1]!;
    const ext = match[2]!.toLowerCase();
    // Custom .gif files dropped into assets/vfx/ always take precedence over .webp defaults.
    if (ext === 'gif' || !extByStem[stem]) {
      out[stem] = resolvedUrl;
      extByStem[stem] = ext;
    }
  }
  return out;
}

const VFX_ASSET_URLS = buildVfxUrlLookup(vfxGlob);
const imageCache = new Map<VfxAssetKey, HTMLImageElement>();

export function getVfxAssetUrl(key: VfxAssetKey): string | null {
  return VFX_ASSET_URLS[key] ?? null;
}

export function isVfxImageReady(img: HTMLImageElement | null | undefined): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

export function preloadVfxAsset(key: VfxAssetKey): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const cached = imageCache.get(key);
  if (cached) return cached;
  const url = getVfxAssetUrl(key);
  if (!url) return null;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  imageCache.set(key, img);
  return img;
}

export function preloadVfxAssets(): void {
  for (const key of Object.keys(VFX_ASSET_SPECS) as VfxAssetKey[]) {
    preloadVfxAsset(key);
  }
}

export function getCachedVfxImage(key: VfxAssetKey): HTMLImageElement | null {
  const img = preloadVfxAsset(key);
  return isVfxImageReady(img) ? img : null;
}

export function syncVfxCssCustomProperties(root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  if (!root) return;
  const fireLoopUrl = getVfxAssetUrl('vfx-dying-fire-loop');
  const turnSealUrl = getVfxAssetUrl('vfx-turn-seal-loop');
  if (fireLoopUrl) {
    root.style.setProperty('--lkdf-vfx-fire-loop', `url("${fireLoopUrl}")`);
  }
  if (turnSealUrl) {
    root.style.setProperty('--lkdf-vfx-turn-seal-loop', `url("${turnSealUrl}")`);
  }
}
