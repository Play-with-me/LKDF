import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const RAW_CARDS_DIR = path.join(ROOT_DIR, 'raw-assets', 'cards');
const RAW_UI_DIR = path.join(ROOT_DIR, 'raw-assets', 'ui');
const OUT_CARDS_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'assets', 'art', 'cards');
const OUT_UI_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'assets', 'art', 'ui');

const SHARED_DIST_CUU_CHAU = path.join(ROOT_DIR, 'packages', 'shared', 'dist', 'content', 'cuuChauPack.js');
const GAME_ICONS_DATA_PATH = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'components', 'icons', 'gameIconsData.ts');
const GAME_ICON_TSX_PATH = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'components', 'icons', 'GameIcon.tsx');
const BRAND_CONFIG_PATH = path.join(ROOT_DIR, 'config', 'game.brand.json');

const CARD_MASTER_W = 640;
const CARD_MASTER_H = 520;
const CARD_OUT_W = 320;
const CARD_OUT_H = 260;

const MAX_TOTAL_WEBP_BYTES = Math.floor(3.5 * 1024 * 1024);

// ---------------------------------------------------------------------------
// Deterministic Seeded Math & 2D Organic Ink-Wash / Mineral Grain Synthesis
// ---------------------------------------------------------------------------

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fmt(n) {
  return Number(n).toFixed(2);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function hash2d(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2d(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2d(ix, iy, seed);
  const b = hash2d(ix + 1, iy, seed);
  const c = hash2d(ix, iy + 1, seed);
  const d = hash2d(ix + 1, iy + 1, seed);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm2d(x, y, seed, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2d(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function fbm1d(x, seed, octaves = 5) {
  return fbm2d(x, 0.37, seed, octaves);
}

/**
 * Synthesizes an organic mineral-pigment & Xuan-paper ink-wash canvas buffer.
 */
async function buildMineralInkCanvas({
  width,
  height,
  seed,
  bgDeep,
  bgMid,
  mistColor,
  primaryColor,
  focalX = 0.56,
  focalY = 0.45,
  focalRadius = 0.50,
  warpStrength = 1.45,
  grainAmount = 7,
  enforceCardSafeZones = false,
}) {
  const gridW = Math.max(160, Math.round(width / 2));
  const gridH = Math.max(130, Math.round(height / 2));
  const buf = Buffer.alloc(gridW * gridH * 4);

  const cDeep = hexToRgb(bgDeep);
  const cMid = hexToRgb(bgMid);
  const cMist = hexToRgb(mistColor);
  const cPri = hexToRgb(primaryColor);

  for (let y = 0; y < gridH; y++) {
    const ny = y / gridH;
    for (let x = 0; x < gridW; x++) {
      const nx = x / gridW;

      // Domain-warped FBM for swirling Guofeng sumi-e mist & mineral clouds
      const qx = fbm2d(nx * 3.5, ny * 3.5, seed + 11, 3);
      const qy = fbm2d(nx * 3.5 + 5.2, ny * 3.5 + 1.3, seed + 29, 3);
      const f = fbm2d(
        nx * 4.4 + warpStrength * (qx - 0.5),
        ny * 4.4 + warpStrength * (qy - 0.5),
        seed + 71,
        4,
      );
      const ridge = 1 - Math.abs(f * 2 - 1);

      const dx = (nx - focalX) * (width / height);
      const dy = ny - focalY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.pow(clamp(1 - dist / focalRadius, 0, 1), 1.85);

      const baseMix = clamp(f * 0.82 + (1 - ny) * 0.18, 0, 1);
      let r = lerp(cDeep[0], cMid[0], baseMix);
      let g = lerp(cDeep[1], cMid[1], baseMix);
      let b = lerp(cDeep[2], cMid[2], baseMix);

      const mistAmt = Math.pow(ridge, 2.1) * 0.36 * (0.35 + 0.65 * glow);
      r = lerp(r, cMist[0], mistAmt);
      g = lerp(g, cMist[1], mistAmt);
      b = lerp(b, cMist[2], mistAmt);

      const priAmt = glow * (0.26 + 0.24 * f);
      r = lerp(r, cPri[0], priAmt);
      g = lerp(g, cPri[1], priAmt);
      b = lerp(b, cPri[2], priAmt);

      if (enforceCardSafeZones) {
        // Darken top-left Rank + Suit strip (x: 0..24%, y: 0..46%) directly in base pigment
        const tlDist = Math.hypot(nx / 0.32, ny / 0.56);
        const tlDarken = 1 - smoothstep(0.45, 1.05, tlDist);
        r = lerp(r, 9, tlDarken * 0.82);
        g = lerp(g, 12, tlDarken * 0.82);
        b = lerp(b, 17, tlDarken * 0.82);
      }

      const grain = (hash2d(x, y, seed + 997) - 0.5) * grainAmount;
      const idx = (y * gridW + x) * 4;
      buf[idx] = clamp(Math.round(r + grain), 0, 255);
      buf[idx + 1] = clamp(Math.round(g + grain), 0, 255);
      buf[idx + 2] = clamp(Math.round(b + grain), 0, 255);
      buf[idx + 3] = 255;
    }
  }

  return sharp(buf, { raw: { width: gridW, height: gridH, channels: 4 } })
    .resize(width, height, { kernel: 'cubic' })
    .png()
    .toBuffer();
}

/**
 * Multi-layered procedural Shan-Shui (ink-wash mountain peaks & sea-of-clouds)
 * pixel canvas specifically crafted for lobby-banner (1280x720).
 */
async function buildShanShuiLobbyCanvas(width, height, seed) {
  const gridW = 640;
  const gridH = 360;
  const buf = Buffer.alloc(gridW * gridH * 4);

  const moonX = 0.73;
  const moonY = 0.24;

  // Precompute 5 fractal mountain ridgelines (far -> foreground)
  const layers = [
    { baseY: 0.43, amp: 0.16, freq: 3.6, seedOff: 10, col: [28, 39, 54], rim: [92, 112, 134], mistBase: 0.56 },
    { baseY: 0.51, amp: 0.18, freq: 4.5, seedOff: 30, col: [21, 29, 41], rim: [120, 110, 96], mistBase: 0.64 },
    { baseY: 0.59, amp: 0.16, freq: 5.2, seedOff: 55, col: [15, 21, 30], rim: [148, 120, 82], mistBase: 0.72 },
    { baseY: 0.69, amp: 0.14, freq: 4.1, seedOff: 80, col: [11, 14, 20], rim: [96, 76, 52], mistBase: 0.83 },
    { baseY: 0.81, amp: 0.12, freq: 3.2, seedOff: 110, col: [8, 8, 9], rim: [45, 36, 28], mistBase: 0.96 },
  ];

  const ridgeHeights = layers.map((L) => {
    const arr = new Float32Array(gridW);
    for (let x = 0; x < gridW; x++) {
      const nx = x / gridW;
      // Combine ridged FBM crags + steep Zhangjiajie sword-peak pinnacles
      const n1 = fbm1d(nx * L.freq, seed + L.seedOff, 5);
      const sharpPeak = Math.pow(1 - Math.abs(n1 * 2 - 1), 1.55);
      const detail = (fbm1d(nx * L.freq * 3.1, seed + L.seedOff + 7, 3) - 0.5) * 0.04;
      // Slightly higher dramatic peaks on the right half under the moon
      const CompositionLift = nx > 0.42 ? Math.sin((nx - 0.42) * 2.6) * 0.06 : 0;
      arr[x] = L.baseY - sharpPeak * L.amp - CompositionLift + detail;
    }
    return arr;
  });

  for (let y = 0; y < gridH; y++) {
    const ny = y / gridH;
    for (let x = 0; x < gridW; x++) {
      const nx = x / gridW;

      // Night sky gradient + moon halo
      const mdx = (nx - moonX) * (width / height);
      const mdy = ny - moonY;
      const mDist = Math.hypot(mdx, mdy);
      const moonGlow = Math.pow(clamp(1 - mDist / 0.62, 0, 1), 2.2);
      const skyCloud = fbm2d(nx * 4.5, ny * 6.5, seed + 201, 4);

      let r = lerp(7, 19, clamp(ny * 1.15, 0, 1)) + moonGlow * 68 + skyCloud * 8;
      let g = lerp(9, 24, clamp(ny * 1.15, 0, 1)) + moonGlow * 56 + skyCloud * 10;
      let b = lerp(14, 35, clamp(ny * 1.15, 0, 1)) + moonGlow * 38 + skyCloud * 14;

      // Moon disc itself
      if (mDist < 0.072) {
        const edge = smoothstep(0.072, 0.064, mDist);
        const crater = fbm2d(nx * 28, ny * 28, seed + 333, 3) * 14;
        r = lerp(r, 246 - crater, edge * 0.92);
        g = lerp(g, 228 - crater, edge * 0.92);
        b = lerp(b, 184 - crater, edge * 0.92);
      }

      // Composite 5 Shan-Shui mountain planes + drifting valley sea-of-clouds
      for (let li = 0; li < layers.length; li++) {
        const L = layers[li];
        const rh = ridgeHeights[li][x];
        if (ny >= rh) {
          const depthIntoRidge = ny - rh;
          const slopeRight = ridgeHeights[li][Math.min(gridW - 1, x + 2)] - rh;
          const facingMoon = nx < moonX ? clamp(-slopeRight * 42, 0, 1) : clamp(slopeRight * 42, 0, 1);
          const rimFactor = Math.exp(-depthIntoRidge * 28) * (0.25 + 0.75 * facingMoon) * (0.35 + 0.65 * moonGlow * 1.4);

          const rockTex = fbm2d(nx * 14, ny * 26, seed + L.seedOff + 400, 3);
          let mr = L.col[0] + (rockTex - 0.5) * 10;
          let mg = L.col[1] + (rockTex - 0.5) * 11;
          let mb = L.col[2] + (rockTex - 0.5) * 13;

          mr = lerp(mr, L.rim[0], clamp(rimFactor, 0, 0.75));
          mg = lerp(mg, L.rim[1], clamp(rimFactor, 0, 0.75));
          mb = lerp(mb, L.rim[2], clamp(rimFactor, 0, 0.75));

          // Valley mist pooling near the base of this mountain plane
          if (li < layers.length - 1) {
            const mistNoise = fbm2d(nx * 5.5 + li * 2.1, ny * 9.0, seed + 500 + li * 37, 4);
            const mistZone = smoothstep(rh + 0.02, L.mistBase, ny) * mistNoise;
            const mistCol = li >= 2 ? [52, 42, 34] : [38, 52, 68];
            mr = lerp(mr, mistCol[0], clamp(mistZone * 0.72, 0, 0.68));
            mg = lerp(mg, mistCol[1], clamp(mistZone * 0.72, 0, 0.68));
            mb = lerp(mb, mistCol[2], clamp(mistZone * 0.72, 0, 0.68));
          }

          const edgeSoft = smoothstep(rh, rh + 0.004, ny);
          r = lerp(r, mr, edgeSoft);
          g = lerp(g, mg, edgeSoft);
          b = lerp(b, mb, edgeSoft);
        }
      }

      // Left-side dark atmospheric balance for crisp menu legibility
      const leftVeil = 1 - smoothstep(0.12, 0.68, nx);
      r = lerp(r, 8, leftVeil * 0.58);
      g = lerp(g, 8, leftVeil * 0.58);
      b = lerp(b, 9, leftVeil * 0.58);

      const grain = (hash2d(x, y, seed + 888) - 0.5) * 5;
      const idx = (y * gridW + x) * 4;
      buf[idx] = clamp(Math.round(r + grain), 0, 255);
      buf[idx + 1] = clamp(Math.round(g + grain), 0, 255);
      buf[idx + 2] = clamp(Math.round(b + grain), 0, 255);
      buf[idx + 3] = 255;
    }
  }

  return sharp(buf, { raw: { width: gridW, height: gridH, channels: 4 } })
    .resize(width, height, { kernel: 'cubic' })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Load Authoritative Card Keys & Offline Vector Icon Paths
// ---------------------------------------------------------------------------

async function loadCardCatalogAndIcons() {
  assert.ok(
    fs.existsSync(SHARED_DIST_CUU_CHAU),
    `Missing built shared pack at ${SHARED_DIST_CUU_CHAU}.`,
  );
  const cuuChauMod = await import(
    new URL(`file:///${SHARED_DIST_CUU_CHAU.replaceAll('\\', '/')}`).href
  );

  const deckTemplates = cuuChauMod.CUU_CHAU_DECK_TEMPLATES ?? [];
  const activeCardKeys = [...new Set(deckTemplates.map((c) => c.cardKey))];
  assert.equal(activeCardKeys.length, 36, `Expected 36 active cardKeys, got ${activeCardKeys.length}`);
  assert.ok(!activeCardKeys.includes('nhan_vuong_thuan'), 'nhan_vuong_thuan must not be in active 36 keys');

  const displayByKey = cuuChauMod.CUU_CHAU_CARD_DISPLAY_BY_KEY ?? {};

  const iconsSrc = fs.readFileSync(GAME_ICONS_DATA_PATH, 'utf8');
  const jsonStart = iconsSrc.indexOf('export const OFFLINE_GAME_ICONS = ');
  const jsonEnd = iconsSrc.indexOf(' as const satisfies Record<');
  assert.ok(jsonStart >= 0 && jsonEnd > jsonStart, 'Could not parse OFFLINE_GAME_ICONS from gameIconsData.ts');
  const offlineIcons = JSON.parse(
    iconsSrc.slice(jsonStart + 'export const OFFLINE_GAME_ICONS = '.length, jsonEnd),
  );

  const gameIconTsx = fs.readFileSync(GAME_ICON_TSX_PATH, 'utf8');
  const mapBlockMatch = gameIconTsx.match(
    /export const CARD_KEY_TO_GAME_ICON[\s\S]*?=\s*\{([\s\S]*?)\};/,
  );
  assert.ok(mapBlockMatch, 'Could not parse CARD_KEY_TO_GAME_ICON from GameIcon.tsx');
  const cardKeyToIcon = {};
  for (const m of mapBlockMatch[1].matchAll(/^\s*([a-z0-9_]+):\s*'([a-z0-9-]+)',/gm)) {
    cardKeyToIcon[m[1]] = m[2];
  }

  for (const key of activeCardKeys) {
    const iconName = cardKeyToIcon[key];
    assert.ok(iconName, `Missing icon mapping for cardKey: ${key}`);
    assert.ok(offlineIcons[iconName]?.body, `Missing SVG body for icon "${iconName}" (cardKey: ${key})`);
  }

  const brand = fs.existsSync(BRAND_CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(BRAND_CONFIG_PATH, 'utf8'))
    : { emblem: '劍' };

  return {
    activeCardKeys,
    deckTemplates,
    displayByKey,
    offlineIcons,
    cardKeyToIcon,
    brand,
  };
}

// ---------------------------------------------------------------------------
// 36 Bespoke Card Art Specifications (Palette, Scene Archetype & Focal Pose)
// ---------------------------------------------------------------------------

const CARD_ART_SPECS = {
  // === BASIC (4 cards) ===
  sat: {
    scene: 'dojo_slash',
    variant: 'crimson_blade',
    palette: {
      bgDeep: '#09080B',
      bgMid: '#211013',
      mist: '#541719',
      primary: '#DC2626',
      secondary: '#F59E0B',
      highlight: '#FEF2F2',
      rim: '#FCA5A5',
      metalDark: '#381214',
    },
    iconScale: 0.47,
    iconRotate: -8,
    iconDx: 8,
    iconDy: -4,
  },
  pha_giap_tram: {
    scene: 'dojo_slash',
    variant: 'shatter_armor',
    palette: {
      bgDeep: '#0A0807',
      bgMid: '#28140A',
      mist: '#732910',
      primary: '#EA580C',
      secondary: '#FBBF24',
      highlight: '#FFFBEB',
      rim: '#FDBA74',
      metalDark: '#3B190B',
    },
    iconScale: 0.46,
    iconRotate: 5,
    iconDx: 6,
    iconDy: -2,
  },
  thiem: {
    scene: 'moon_bamboo',
    variant: 'shadow_step',
    palette: {
      bgDeep: '#070C15',
      bgMid: '#102238',
      mist: '#1B436B',
      primary: '#38BDF8',
      secondary: '#A5F3FC',
      highlight: '#F0F9FF',
      rim: '#93C5FD',
      metalDark: '#0F253D',
    },
    iconScale: 0.46,
    iconRotate: -4,
    iconDx: 8,
    iconDy: -2,
  },
  dao: {
    scene: 'elixir_cauldron',
    variant: 'jade_pill',
    palette: {
      bgDeep: '#07100D',
      bgMid: '#0F2920',
      mist: '#185441',
      primary: '#10B981',
      secondary: '#FDE68A',
      highlight: '#ECFDF5',
      rim: '#86EFAC',
      metalDark: '#0C291F',
    },
    iconScale: 0.43,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },

  // === NORMAL_SCROLL (12 cards) ===
  vo_trung_sinh_huu: {
    scene: 'talisman_altar',
    variant: 'qi_surge',
    palette: {
      bgDeep: '#090D15',
      bgMid: '#172233',
      mist: '#523F1E',
      primary: '#F59E0B',
      secondary: '#38BDF8',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#2D2110',
    },
    iconScale: 0.44,
    iconRotate: -3,
    iconDx: 8,
    iconDy: -4,
  },
  thuan_thu_khien_duong: {
    scene: 'shadow_alley',
    variant: 'silk_snatch',
    palette: {
      bgDeep: '#080C12',
      bgMid: '#152030',
      mist: '#253C50',
      primary: '#2DD4BF',
      secondary: '#E6BE6C',
      highlight: '#F0FDFA',
      rim: '#99F6E4',
      metalDark: '#12292E',
    },
    iconScale: 0.44,
    iconRotate: -10,
    iconDx: 8,
    iconDy: -2,
  },
  qua_ha_sai_cau: {
    scene: 'shadow_alley',
    variant: 'palm_shatter',
    palette: {
      bgDeep: '#0B0908',
      bgMid: '#241611',
      mist: '#542D1B',
      primary: '#D97706',
      secondary: '#EF4444',
      highlight: '#FEF3C7',
      rim: '#FCD34D',
      metalDark: '#2E1A10',
    },
    iconScale: 0.45,
    iconRotate: 0,
    iconDx: 6,
    iconDy: 0,
  },
  quyet_dau: {
    scene: 'duel_arena',
    variant: 'life_death_stage',
    palette: {
      bgDeep: '#0B0708',
      bgMid: '#261013',
      mist: '#611D20',
      primary: '#EF4444',
      secondary: '#F59E0B',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#361315',
    },
    iconScale: 0.45,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  ta_dao_sat_nhan: {
    scene: 'shadow_alley',
    variant: 'borrowed_edge',
    palette: {
      bgDeep: '#090810',
      bgMid: '#1B162E',
      mist: '#3B2657',
      primary: '#A855F7',
      secondary: '#94A3B8',
      highlight: '#F8FAFC',
      rim: '#E2E8F0',
      metalDark: '#1E1B2E',
    },
    iconScale: 0.45,
    iconRotate: 4,
    iconDx: 8,
    iconDy: -4,
  },
  nam_man_nhap_xam: {
    scene: 'thousand_swords',
    variant: 'blade_rain',
    palette: {
      bgDeep: '#0B0807',
      bgMid: '#26140E',
      mist: '#632617',
      primary: '#F59E0B',
      secondary: '#DC2626',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#381B10',
    },
    iconScale: 0.47,
    iconRotate: -5,
    iconDx: 6,
    iconDy: -4,
  },
  van_tien_te_phat: {
    scene: 'arrow_storm',
    variant: 'skyfall_volley',
    palette: {
      bgDeep: '#0B090B',
      bgMid: '#22151B',
      mist: '#522624',
      primary: '#F97316',
      secondary: '#FDE047',
      highlight: '#FFFBEB',
      rim: '#FDBA74',
      metalDark: '#331A14',
    },
    iconScale: 0.47,
    iconRotate: 6,
    iconDx: 6,
    iconDy: -4,
  },
  dao_vien_ket_nghia: {
    scene: 'banquet_pavilion',
    variant: 'sect_banquet',
    palette: {
      bgDeep: '#0E080B',
      bgMid: '#29131D',
      mist: '#5E273D',
      primary: '#F472B6',
      secondary: '#FBBF24',
      highlight: '#FFF1F2',
      rim: '#FBCFE8',
      metalDark: '#361524',
    },
    iconScale: 0.45,
    iconRotate: 8,
    iconDx: 6,
    iconDy: -4,
  },
  ngu_coc_phong_dang: {
    scene: 'relic_vault',
    variant: 'vault_of_relics',
    palette: {
      bgDeep: '#0B0906',
      bgMid: '#261C0E',
      mist: '#614518',
      primary: '#EAB308',
      secondary: '#34D399',
      highlight: '#FEFCE8',
      rim: '#FDE047',
      metalDark: '#33250E',
    },
    iconScale: 0.45,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  vo_giai_kha_kich: {
    scene: 'talisman_altar',
    variant: 'qi_negation',
    palette: {
      bgDeep: '#070E14',
      bgMid: '#102432',
      mist: '#1A4B5F',
      primary: '#22D3EE',
      secondary: '#FBBF24',
      highlight: '#ECFEFF',
      rim: '#A5F3FC',
      metalDark: '#0F2938',
    },
    iconScale: 0.45,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  chan_khi_ho_the: {
    scene: 'elixir_cauldron',
    variant: 'spirit_lotus',
    palette: {
      bgDeep: '#071010',
      bgMid: '#0F2A2A',
      mist: '#195752',
      primary: '#2DD4BF',
      secondary: '#FDE68A',
      highlight: '#F0FDFA',
      rim: '#99F6E4',
      metalDark: '#0D2B2B',
    },
    iconScale: 0.46,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -2,
  },
  kinh_loi_chan: {
    scene: 'thunder_seal',
    variant: 'thunderclap_pulse',
    palette: {
      bgDeep: '#080814',
      bgMid: '#171535',
      mist: '#3A30B5',
      primary: '#818CF8',
      secondary: '#38BDF8',
      highlight: '#EEF2FF',
      rim: '#C7D2FE',
      metalDark: '#1B193D',
    },
    iconScale: 0.46,
    iconRotate: -4,
    iconDx: 6,
    iconDy: -4,
  },

  // === DELAYED_SCROLL (2 cards) ===
  lac_bat_tu_thuc: {
    scene: 'meridian_seal',
    variant: 'acupoint_lantern',
    palette: {
      bgDeep: '#0B0711',
      bgMid: '#221030',
      mist: '#4E1978',
      primary: '#C084FC',
      secondary: '#F472B6',
      highlight: '#FAF5FF',
      rim: '#E9D5FF',
      metalDark: '#2A123B',
    },
    iconScale: 0.44,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  thiem_dien: {
    scene: 'thunder_seal',
    variant: 'sky_tribulation',
    palette: {
      bgDeep: '#070612',
      bgMid: '#191133',
      mist: '#431985',
      primary: '#A855F7',
      secondary: '#38BDF8',
      highlight: '#FFFFFF',
      rim: '#E9D5FF',
      metalDark: '#1E133D',
    },
    iconScale: 0.47,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },

  // === WEAPON (10 cards) ===
  gia_cat_lien_no: {
    scene: 'weapon_forge',
    variant: 'repeating_crossbow',
    palette: {
      bgDeep: '#0B0907',
      bgMid: '#221912',
      mist: '#4E3622',
      primary: '#D97706',
      secondary: '#FDE68A',
      highlight: '#FFFBEB',
      rim: '#FCD34D',
      metalDark: '#291D12',
    },
    iconScale: 0.46,
    iconRotate: -6,
    iconDx: 8,
    iconDy: -4,
  },
  tu_hung_song_co_kiem: {
    scene: 'weapon_forge',
    variant: 'frostheart_twin',
    palette: {
      bgDeep: '#080B14',
      bgMid: '#152034',
      mist: '#2C446E',
      primary: '#60A5FA',
      secondary: '#F472B6',
      highlight: '#F8FAFC',
      rim: '#BFDBFE',
      metalDark: '#17253E',
    },
    iconScale: 0.47,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  thanh_cong_kiem: {
    scene: 'weapon_forge',
    variant: 'azure_wind_blade',
    palette: {
      bgDeep: '#060F10',
      bgMid: '#0F282A',
      mist: '#195253',
      primary: '#34D399',
      secondary: '#38BDF8',
      highlight: '#ECFDF5',
      rim: '#A7F3D0',
      metalDark: '#0E2B2D',
    },
    iconScale: 0.47,
    iconRotate: -6,
    iconDx: 8,
    iconDy: -4,
  },
  han_bang_kiem: {
    scene: 'weapon_forge',
    variant: 'glacial_fang',
    palette: {
      bgDeep: '#060C15',
      bgMid: '#0D2339',
      mist: '#1A4B75',
      primary: '#38BDF8',
      secondary: '#E0F2FE',
      highlight: '#FFFFFF',
      rim: '#BAE6FD',
      metalDark: '#0D2640',
    },
    iconScale: 0.45,
    iconRotate: 12,
    iconDx: 6,
    iconDy: -4,
  },
  thanh_long_yen_nguyet_dao: {
    scene: 'weapon_forge',
    variant: 'dragon_sabre',
    palette: {
      bgDeep: '#060E0B',
      bgMid: '#10251E',
      mist: '#1A4F3B',
      primary: '#10B981',
      secondary: '#F59E0B',
      highlight: '#FEFCE8',
      rim: '#6EE7B7',
      metalDark: '#0E261E',
    },
    iconScale: 0.48,
    iconRotate: -8,
    iconDx: 8,
    iconDy: -4,
  },
  truong_bat_xa_mau: {
    scene: 'weapon_forge',
    variant: 'serpent_pike',
    palette: {
      bgDeep: '#080910',
      bgMid: '#19182B',
      mist: '#362B57',
      primary: '#A855F7',
      secondary: '#34D399',
      highlight: '#F3E8FF',
      rim: '#D8B4FE',
      metalDark: '#1E1A33',
    },
    iconScale: 0.47,
    iconRotate: -6,
    iconDx: 8,
    iconDy: -4,
  },
  quan_thach_phu: {
    scene: 'weapon_forge',
    variant: 'mountain_cleaver',
    palette: {
      bgDeep: '#0B0806',
      bgMid: '#26150E',
      mist: '#5E2E19',
      primary: '#EA580C',
      secondary: '#D97706',
      highlight: '#FFF7ED',
      rim: '#FDBA74',
      metalDark: '#301910',
    },
    iconScale: 0.47,
    iconRotate: -6,
    iconDx: 8,
    iconDy: -4,
  },
  phuong_thien_hoa_kich: {
    scene: 'weapon_forge',
    variant: 'nine_heavens_halberd',
    palette: {
      bgDeep: '#0C0708',
      bgMid: '#291114',
      mist: '#661E22',
      primary: '#EF4444',
      secondary: '#FBBF24',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#381417',
    },
    iconScale: 0.48,
    iconRotate: -5,
    iconDx: 8,
    iconDy: -4,
  },
  ky_lan_cung: {
    scene: 'weapon_forge',
    variant: 'spiritwing_bow',
    palette: {
      bgDeep: '#070E14',
      bgMid: '#132530',
      mist: '#244E61',
      primary: '#F59E0B',
      secondary: '#22D3EE',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#1B2A36',
    },
    iconScale: 0.47,
    iconRotate: -8,
    iconDx: 8,
    iconDy: -4,
  },
  tu_khi_hoan: {
    scene: 'weapon_forge',
    variant: 'spirit_ring',
    palette: {
      bgDeep: '#070F0E',
      bgMid: '#122825',
      mist: '#23544B',
      primary: '#FBBF24',
      secondary: '#2DD4BF',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#162E29',
    },
    iconScale: 0.45,
    iconRotate: 15,
    iconDx: 6,
    iconDy: -4,
  },

  // === ARMOR (2 cards) ===
  bat_quai_tran: {
    scene: 'sacred_armor',
    variant: 'bagua_vestment',
    palette: {
      bgDeep: '#080B0C',
      bgMid: '#152123',
      mist: '#314A45',
      primary: '#EAB308',
      secondary: '#34D399',
      highlight: '#FEFCE8',
      rim: '#FDE68A',
      metalDark: '#242214',
    },
    iconScale: 0.44,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -4,
  },
  hoan_anh_giap: {
    scene: 'sacred_armor',
    variant: 'mirage_cloak',
    palette: {
      bgDeep: '#080812',
      bgMid: '#181730',
      mist: '#363066',
      primary: '#A855F7',
      secondary: '#38BDF8',
      highlight: '#F5F3FF',
      rim: '#DDD6FE',
      metalDark: '#1E1B3B',
    },
    iconScale: 0.45,
    iconRotate: 0,
    iconDx: 6,
    iconDy: -2,
  },

  // === PLUS_ONE_HORSE (3 defensive footwork/mounts) ===
  tuyet_anh: {
    scene: 'qinggong_plus',
    variant: 'snowstep',
    palette: {
      bgDeep: '#060B14',
      bgMid: '#112136',
      mist: '#25466B',
      primary: '#7DD3FC',
      secondary: '#E2E8F0',
      highlight: '#FFFFFF',
      rim: '#BAE6FD',
      metalDark: '#13263E',
    },
    iconScale: 0.45,
    iconRotate: -5,
    iconDx: 8,
    iconDy: -2,
  },
  dich_lo: {
    scene: 'qinggong_plus',
    variant: 'mistwalk',
    palette: {
      bgDeep: '#060F11',
      bgMid: '#10272C',
      mist: '#1D5057',
      primary: '#2DD4BF',
      secondary: '#A5F3FC',
      highlight: '#ECFEFF',
      rim: '#99F6E4',
      metalDark: '#102B30',
    },
    iconScale: 0.45,
    iconRotate: 8,
    iconDx: 6,
    iconDy: -4,
  },
  trao_hoang_phi_dien: {
    scene: 'qinggong_plus',
    variant: 'windrider',
    palette: {
      bgDeep: '#080C12',
      bgMid: '#182230',
      mist: '#3F4959',
      primary: '#FBBF24',
      secondary: '#7DD3FC',
      highlight: '#FFFBEB',
      rim: '#FDE68A',
      metalDark: '#262318',
    },
    iconScale: 0.46,
    iconRotate: -4,
    iconDx: 8,
    iconDy: -4,
  },

  // === MINUS_ONE_HORSE (3 offensive footwork/steeds) ===
  xich_tho: {
    scene: 'steed_minus',
    variant: 'shadowchase',
    palette: {
      bgDeep: '#0B0707',
      bgMid: '#260F0F',
      mist: '#631B1B',
      primary: '#EF4444',
      secondary: '#F97316',
      highlight: '#FEF2F2',
      rim: '#FCA5A5',
      metalDark: '#361212',
    },
    iconScale: 0.46,
    iconRotate: -4,
    iconDx: 8,
    iconDy: -4,
  },
  dai_uyen: {
    scene: 'steed_minus',
    variant: 'flamewind',
    palette: {
      bgDeep: '#0B0806',
      bgMid: '#26140C',
      mist: '#692E13',
      primary: '#F97316',
      secondary: '#FACC15',
      highlight: '#FFFBEB',
      rim: '#FDBA74',
      metalDark: '#361A0D',
    },
    iconScale: 0.46,
    iconRotate: -4,
    iconDx: 8,
    iconDy: -2,
  },
  tu_tinh: {
    scene: 'steed_minus',
    variant: 'thunderstride',
    palette: {
      bgDeep: '#070814',
      bgMid: '#171636',
      mist: '#3A30B5',
      primary: '#818CF8',
      secondary: '#22D3EE',
      highlight: '#EEF2FF',
      rim: '#C7D2FE',
      metalDark: '#1C1B40',
    },
    iconScale: 0.46,
    iconRotate: -3,
    iconDx: 8,
    iconDy: -2,
  },
};

// ---------------------------------------------------------------------------
// Painterly Calligraphic Brushwork & Geometric Wuxia Primitives (Zero Text)
// ---------------------------------------------------------------------------

const BAGUA_TRIGRAMS = [
  [1, 1, 1],
  [0, 1, 1],
  [1, 0, 1],
  [0, 0, 1],
  [1, 1, 0],
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 0],
];

function buildBaguaRingSvg(cx, cy, radius, color, opacity = 0.35, rotOffset = 0) {
  const octPts = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 + 22.5 + rotOffset) * Math.PI) / 180;
    return `${fmt(cx + Math.cos(a) * radius)},${fmt(cy + Math.sin(a) * radius)}`;
  }).join(' ');

  const trigrams = BAGUA_TRIGRAMS.map((bars, idx) => {
    const angDeg = idx * 45 + rotOffset;
    const barW = radius * 0.14;
    const gap = radius * 0.032;
    const baseR = radius * 0.78;
    const lines = bars
      .map((solid, bIdx) => {
        const y = -baseR - bIdx * (radius * 0.055);
        const sw = fmt(Math.max(1.4, radius * 0.022));
        if (solid) {
          return `<line x1="${fmt(-barW)}" y1="${fmt(y)}" x2="${fmt(barW)}" y2="${fmt(y)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
        }
        return `<line x1="${fmt(-barW)}" y1="${fmt(y)}" x2="${fmt(-gap)}" y2="${fmt(y)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />
                <line x1="${fmt(gap)}" y1="${fmt(y)}" x2="${fmt(barW)}" y2="${fmt(y)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />`;
      })
      .join('');
    return `<g transform="translate(${fmt(cx)}, ${fmt(cy)}) rotate(${fmt(angDeg)})">${lines}</g>`;
  }).join('');

  return `<g opacity="${fmt(opacity)}">
    <polygon points="${octPts}" fill="none" stroke="${color}" stroke-width="${fmt(Math.max(1.5, radius * 0.018))}" />
    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(radius * 0.68)}" fill="none" stroke="${color}" stroke-width="${fmt(Math.max(1.2, radius * 0.013))}" stroke-dasharray="8 6" />
    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(radius * 1.06)}" fill="none" stroke="${color}" stroke-width="${fmt(Math.max(1, radius * 0.01))}" stroke-opacity="0.6" />
    ${trigrams}
  </g>`;
}

/**
 * Tapered calligraphic sumi-e crescent brush stroke (thin tail -> full belly -> razor tip).
 */
function buildTaperedSlashSvg(x0, y0, cx, cy, x1, y1, bellyOffset, fill, opacity = 0.65) {
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const len = Math.hypot(nx, ny) || 1;
  const ux = (nx / len) * bellyOffset;
  const uy = (ny / len) * bellyOffset;
  return `<path d="M ${fmt(x0)} ${fmt(y0)} Q ${fmt(cx + ux)} ${fmt(cy + uy)} ${fmt(x1)} ${fmt(y1)} Q ${fmt(cx - ux * 0.35)} ${fmt(cy - uy * 0.35)} ${fmt(x0)} ${fmt(y0)} Z" fill="${fill}" fill-opacity="${fmt(opacity)}" />`;
}

/**
 * Smooth ink-wash mountain silhouettes using soft cubic curves instead of sharp triangles.
 */
function buildSmoothInkRidgesSvg(w, h, colorFar, colorNear, seed) {
  const rng = mulberry32(seed);
  const buildWave = (baseY, amp) => {
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      const y = h * (baseY + amp * Math.sin(i * 1.45 + rng() * 1.6));
      pts.push([x, y]);
    }
    let d = `M 0 ${h} L ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q ${fmt(pts[i][0])} ${fmt(pts[i][1])} ${fmt(mx)} ${fmt(my)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${fmt(last[0])} ${fmt(last[1])} L ${w} ${h} Z`;
    return d;
  };

  return `
    <path d="${buildWave(0.50, 0.16)}" fill="${colorFar}" fill-opacity="0.52" />
    <path d="${buildWave(0.66, 0.13)}" fill="${colorNear}" fill-opacity="0.78" />
  `;
}

function buildEmberParticlesSvg(cx, cy, count, rng, colorA, colorB, spreadX = 240, spreadY = 190) {
  const els = [];
  for (let i = 0; i < count; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = Math.pow(rng(), 0.65);
    const x = cx + Math.cos(ang) * spreadX * rad;
    const y = cy + Math.sin(ang) * spreadY * rad;
    if (x < 185 && y < 260) continue;
    const r = 1.2 + rng() * 3.0;
    const op = 0.26 + rng() * 0.58;
    const col = i % 2 === 0 ? colorA : colorB;
    if (i % 3 === 0) {
      const rot = rng() * 180;
      els.push(
        `<polygon points="0,${fmt(-r * 1.9)} ${fmt(r)},0 0,${fmt(r * 1.9)} ${fmt(-r)},0" transform="translate(${fmt(x)},${fmt(y)}) rotate(${fmt(rot)})" fill="${col}" fill-opacity="${fmt(op)}" />`,
      );
    } else {
      els.push(
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${col}" fill-opacity="${fmt(op)}" />`,
      );
    }
  }
  return els.join('');
}

function buildLightningBoltsSvg(x0, y0, x1, y1, rng, glowColor, coreColor, thickness = 4.2) {
  const segs = 9;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jitter = i === 0 || i === segs ? 0 : (rng() - 0.5) * 44;
    const px = lerp(x0, x1, t) + jitter;
    const py = lerp(y0, y1, t) + jitter * 0.25;
    pts.push(`${fmt(px)},${fmt(py)}`);
  }
  return `
    <polyline points="${pts.join(' ')}" fill="none" stroke="${glowColor}" stroke-width="${fmt(thickness * 3)}" stroke-opacity="0.38" stroke-linecap="round" stroke-linejoin="round" filter="url(#rimBloom)" />
    <polyline points="${pts.join(' ')}" fill="none" stroke="${coreColor}" stroke-width="${fmt(thickness)}" stroke-opacity="0.92" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points="${pts.join(' ')}" fill="none" stroke="#FFFFFF" stroke-width="${fmt(thickness * 0.4)}" stroke-opacity="0.96" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

// ---------------------------------------------------------------------------
// 16 Bespoke Midground & Foreground Scenic Builders for the 36 Cards
// ---------------------------------------------------------------------------

function buildCardSceneLayers(cardKey, spec, rng) {
  const { scene, variant, palette } = spec;
  const cx = Math.round(CARD_MASTER_W * 0.55) + (spec.iconDx ?? 0);
  const cy = Math.round(CARD_MASTER_H * 0.45) + (spec.iconDy ?? 0);

  let midground = '';
  let foreground = '';

  switch (scene) {
    case 'dojo_slash': {
      const stalks = Array.from({ length: 5 }, (_, i) => {
        const bx = 225 + i * 92 + (rng() - 0.5) * 20;
        return `<path d="M ${fmt(bx)} 10 Q ${fmt(bx - 10)} 250 ${fmt(bx - 24)} 510" fill="none" stroke="#06070A" stroke-width="${fmt(9 + (i % 3) * 4)}" stroke-opacity="0.52" />`;
      }).join('');
      const shards =
        variant === 'shatter_armor'
          ? Array.from({ length: 12 }, (_, k) => {
              const a = (k / 12) * Math.PI * 2 + 0.3;
              const dist = 112 + rng() * 88;
              const sx = cx + Math.cos(a) * dist;
              const sy = cy + Math.sin(a) * dist * 0.8;
              if (sx < 180 && sy < 250) return '';
              const s = 9 + rng() * 15;
              return `<polygon points="0,${fmt(-s)} ${fmt(s * 0.85)},${fmt(s * 0.25)} ${fmt(-s * 0.55)},${fmt(s * 0.9)}" transform="translate(${fmt(sx)},${fmt(sy)}) rotate(${fmt(rng() * 360)})" fill="${palette.secondary}" fill-opacity="0.52" stroke="${palette.highlight}" stroke-width="1.2" stroke-opacity="0.65" />`;
            }).join('')
          : '';
      midground = `
        ${stalks}
        ${buildTaperedSlashSvg(160, 425, 345, 130, 620, 72, 34, palette.primary, 0.36)}
        ${buildTaperedSlashSvg(175, 415, 355, 145, 615, 80, 14, palette.secondary, 0.55)}
        ${shards}
      `;
      foreground = `
        ${buildTaperedSlashSvg(190, 392, 375, 205, 612, 108, 5, palette.highlight, 0.84)}
        ${buildTaperedSlashSvg(225, 435, 415, 285, 625, 188, 9, palette.primary, 0.45)}
      `;
      break;
    }

    case 'moon_bamboo': {
      const bamboo = Array.from({ length: 7 }, (_, i) => {
        const bx = 230 + i * 65;
        const bend = (i % 2 === 0 ? 1 : -1) * 18;
        return `<path d="M ${fmt(bx)} 520 Q ${fmt(bx + bend)} 260 ${fmt(bx + bend * 1.6)} -10" fill="none" stroke="#061220" stroke-width="${fmt(6 + (i % 3) * 3)}" stroke-opacity="0.68" />`;
      }).join('');
      const leaves = Array.from({ length: 16 }, (_, k) => {
        const lx = 210 + rng() * 410;
        const ly = 45 + rng() * 375;
        const rot = -35 + rng() * 45;
        return `<path d="M -18 0 Q 0 -5 18 0 Q 0 5 -18 0 Z" transform="translate(${fmt(lx)},${fmt(ly)}) rotate(${fmt(rot)})" fill="${k % 3 === 0 ? palette.secondary : '#0D243B'}" fill-opacity="${fmt(0.48 + rng() * 0.35)}" />`;
      }).join('');
      midground = `
        <circle cx="${fmt(cx + 54)}" cy="${fmt(cy - 44)}" r="124" fill="${palette.secondary}" fill-opacity="0.16" filter="url(#rimBloom)" />
        <circle cx="${fmt(cx + 54)}" cy="${fmt(cy - 44)}" r="90" fill="${palette.highlight}" fill-opacity="0.22" />
        ${bamboo}
      `;
      foreground = `
        ${buildTaperedSlashSvg(180, 368, 365, 295, 615, 148, 16, palette.primary, 0.36)}
        ${buildTaperedSlashSvg(195, 382, 385, 310, 622, 178, 4.5, palette.highlight, 0.78)}
        ${leaves}
      `;
      break;
    }

    case 'elixir_cauldron': {
      const petals = Array.from({ length: 15 }, (_, k) => {
        const px = 205 + rng() * 410;
        const py = 45 + rng() * 370;
        const rot = rng() * 360;
        const col = variant === 'jade_pill' ? (k % 2 === 0 ? '#FDE68A' : '#86EFAC') : k % 2 === 0 ? '#99F6E4' : '#FDE68A';
        return `<path d="M 0 -10 C 7 -6 7 4 0 9 C -7 4 -7 -6 0 -10 Z" transform="translate(${fmt(px)},${fmt(py)}) rotate(${fmt(rot)})" fill="${col}" fill-opacity="0.62" />`;
      }).join('');
      midground = `
        <ellipse cx="${cx}" cy="${fmt(cy + 116)}" rx="152" ry="34" fill="#061410" fill-opacity="0.78" stroke="${palette.secondary}" stroke-width="2" stroke-opacity="0.45" />
        <circle cx="${cx}" cy="${cy}" r="130" fill="none" stroke="${palette.primary}" stroke-width="2.8" stroke-opacity="0.4" stroke-dasharray="14 8" />
        <circle cx="${cx}" cy="${cy}" r="102" fill="none" stroke="${palette.secondary}" stroke-width="1.8" stroke-opacity="0.48" />
      `;
      foreground = `
        ${buildTaperedSlashSvg(cx - 96, cy + 98, cx - 135, cy - 18, cx, cy - 138, 10, palette.rim, 0.38)}
        ${buildTaperedSlashSvg(cx + 96, cy + 98, cx + 135, cy - 18, cx, cy - 138, -8, palette.secondary, 0.44)}
        ${petals}
      `;
      break;
    }

    case 'talisman_altar': {
      const strips = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + 25) * Math.PI) / 180;
        const rx = cx + Math.cos(a) * 146;
        const ry = cy + Math.sin(a) * 122;
        if (rx < 185 && ry < 250) return '';
        return `<g transform="translate(${fmt(rx)},${fmt(ry)}) rotate(${fmt(i * 60 + 115)})">
          <rect x="-9" y="-25" width="18" height="50" rx="3" fill="${palette.bgDeep}" fill-opacity="0.84" stroke="${palette.secondary}" stroke-width="1.8" stroke-opacity="0.72" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke="${palette.primary}" stroke-width="2.2" stroke-opacity="0.82" />
          <circle cx="0" cy="0" r="3.8" fill="${palette.highlight}" fill-opacity="0.88" />
        </g>`;
      }).join('');
      midground = `
        ${buildBaguaRingSvg(cx, cy, 136, palette.primary, 0.42, 15)}
        ${strips}
      `;
      foreground = `
        <ellipse cx="${cx}" cy="${cy}" rx="166" ry="62" transform="rotate(-18 ${cx} ${cy})" fill="none" stroke="${palette.rim}" stroke-width="2.8" stroke-opacity="0.46" />
      `;
      break;
    }

    case 'shadow_alley': {
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#0E1520', '#070A0F', hashString(cardKey))}
        <path d="M 260 105 Q 435 162 638 86" fill="none" stroke="#070B11" stroke-width="20" stroke-opacity="0.65" />
        <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="118" fill="none" stroke="${palette.primary}" stroke-width="2.2" stroke-opacity="0.34" stroke-dasharray="10 8" />
      `;
      foreground =
        variant === 'palm_shatter'
          ? `<circle cx="${cx}" cy="${cy}" r="140" fill="none" stroke="${palette.secondary}" stroke-width="5" stroke-opacity="0.3" />
             ${buildTaperedSlashSvg(195, 368, 355, 285, 575, 162, 11, palette.highlight, 0.65)}`
          : `${buildTaperedSlashSvg(185, 412, 340, 245, 608, 118, 12, palette.primary, 0.52)}
             ${buildTaperedSlashSvg(192, 418, 348, 252, 614, 124, 3.5, palette.highlight, 0.82)}`;
      break;
    }

    case 'duel_arena': {
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#1D0C0E', '#0B0607', 401)}
        <ellipse cx="${cx}" cy="${fmt(cy + 112)}" rx="182" ry="38" fill="#12090A" stroke="${palette.secondary}" stroke-width="2.4" stroke-opacity="0.55" />
        ${buildTaperedSlashSvg(cx - 135, 460, cx - 80, 235, cx - 14, 85, 22, palette.primary, 0.34)}
        ${buildTaperedSlashSvg(cx + 135, 460, cx + 80, 235, cx + 14, 85, -22, palette.secondary, 0.34)}
      `;
      foreground = `
        ${buildTaperedSlashSvg(cx - 125, cy - 92, cx, cy, cx + 125, cy + 92, 5, palette.highlight, 0.68)}
        ${buildTaperedSlashSvg(cx + 125, cy - 92, cx, cy, cx - 125, cy + 92, 5, palette.secondary, 0.68)}
      `;
      break;
    }

    case 'thousand_swords': {
      const ghostSwords = Array.from({ length: 18 }, (_, i) => {
        const sx = 195 + rng() * 425;
        const sy = 28 + rng() * 355;
        if (Math.hypot(sx - cx, sy - cy) < 92) return '';
        const len = 46 + rng() * 44;
        const col = i % 2 === 0 ? palette.primary : palette.highlight;
        return `<g transform="translate(${fmt(sx)},${fmt(sy)}) rotate(32)" opacity="${fmt(0.32 + rng() * 0.45)}">
          <polygon points="0,${fmt(-len)} 3.2,${fmt(len * 0.25)} 0,${fmt(len * 0.42)} -3.2,${fmt(len * 0.25)}" fill="${col}" />
          <rect x="-9" y="${fmt(-len * 0.56)}" width="18" height="3" rx="1" fill="${palette.secondary}" />
        </g>`;
      }).join('');
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#21110C', '#0E0806', 509)}
        ${ghostSwords}
      `;
      foreground = `
        ${buildTaperedSlashSvg(215, 65, 365, 245, 515, 425, 8, palette.highlight, 0.48)}
      `;
      break;
    }

    case 'arrow_storm': {
      const arrows = Array.from({ length: 20 }, (_, i) => {
        const ax = 195 + rng() * 425;
        const ay = 25 + rng() * 370;
        if (Math.hypot(ax - cx, ay - cy) < 88) return '';
        const len = 42 + rng() * 42;
        return `<g transform="translate(${fmt(ax)},${fmt(ay)}) rotate(-38)" opacity="${fmt(0.34 + rng() * 0.46)}">
          <line x1="0" y1="${fmt(-len)}" x2="0" y2="${fmt(len * 0.4)}" stroke="${i % 2 === 0 ? palette.secondary : palette.primary}" stroke-width="2.6" stroke-linecap="round" />
          <polygon points="0,${fmt(len * 0.54)} -4.8,${fmt(len * 0.32)} 4.8,${fmt(len * 0.32)}" fill="${palette.highlight}" />
        </g>`;
      }).join('');
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#211216', '#0D080A', 613)}
        ${arrows}
      `;
      foreground = `
        <circle cx="${cx}" cy="${cy}" r="144" fill="none" stroke="${palette.primary}" stroke-width="2.4" stroke-opacity="0.3" stroke-dasharray="16 12" />
      `;
      break;
    }

    case 'banquet_pavilion': {
      const blossoms = Array.from({ length: 18 }, (_, k) => {
        const bx = 200 + rng() * 420;
        const by = 35 + rng() * 380;
        const r = 4 + rng() * 6;
        return `<ellipse cx="${fmt(bx)}" cy="${fmt(by)}" rx="${fmt(r)}" ry="${fmt(r * 0.58)}" transform="rotate(${fmt(rng() * 180)} ${fmt(bx)} ${fmt(by)})" fill="${k % 3 === 0 ? '#FDE68A' : '#F9A8D4'}" fill-opacity="0.65" />`;
      }).join('');
      midground = `
        <path d="M 420 92 Q 530 132 640 80 L 640 118 Q 530 158 405 115 Z" fill="#1A0B12" fill-opacity="0.78" />
        <circle cx="${cx}" cy="${cy}" r="128" fill="${palette.secondary}" fill-opacity="0.12" stroke="${palette.secondary}" stroke-width="2.2" stroke-opacity="0.42" />
      `;
      foreground = blossoms;
      break;
    }

    case 'relic_vault': {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30 + 10) * Math.PI) / 180;
        const x2 = cx + Math.cos(a) * 235;
        const y2 = cy + Math.sin(a) * 195;
        if (x2 < 170 && y2 < 235) return '';
        return `<polygon points="${cx},${cy} ${fmt(x2 - 8)},${fmt(y2 - 6)} ${fmt(x2 + 8)},${fmt(y2 + 6)}" fill="${palette.primary}" fill-opacity="0.14" />`;
      }).join('');
      midground = `
        ${rays}
        ${buildBaguaRingSvg(cx, cy, 134, palette.primary, 0.38, 0)}
      `;
      foreground = `
        <circle cx="${cx}" cy="${cy}" r="154" fill="none" stroke="${palette.secondary}" stroke-width="2.2" stroke-opacity="0.4" stroke-dasharray="6 10" />
      `;
      break;
    }

    case 'meridian_seal': {
      const nodes = [
        [cx - 105, cy - 60],
        [cx - 65, cy + 88],
        [cx + 110, cy - 80],
        [cx + 135, cy + 55],
        [cx + 15, cy - 125],
      ];
      const links = nodes
        .map(
          ([nx, ny]) =>
            `<line x1="${cx}" y1="${cy}" x2="${fmt(nx)}" y2="${fmt(ny)}" stroke="${palette.primary}" stroke-width="2.2" stroke-opacity="0.5" stroke-dasharray="6 5" />
             <circle cx="${fmt(nx)}" cy="${fmt(ny)}" r="6.5" fill="${palette.secondary}" fill-opacity="0.82" stroke="${palette.highlight}" stroke-width="1.5" />`,
        )
        .join('');
      midground = `
        <circle cx="${cx}" cy="${cy}" r="126" fill="none" stroke="${palette.primary}" stroke-width="2.6" stroke-opacity="0.44" />
        ${links}
      `;
      foreground = `
        <ellipse cx="${cx}" cy="${cy}" rx="158" ry="52" transform="rotate(24 ${cx} ${cy})" fill="none" stroke="${palette.secondary}" stroke-width="2.4" stroke-opacity="0.46" />
      `;
      break;
    }

    case 'thunder_seal': {
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#161130', '#090717', 733)}
        ${buildLightningBoltsSvg(cx - 95, 22, cx - 20, cy + 20, rng, palette.primary, palette.rim, 3.8)}
        ${buildLightningBoltsSvg(cx + 145, 12, cx + 30, cy + 10, rng, palette.secondary, palette.highlight, 4.2)}
      `;
      foreground = `
        ${buildLightningBoltsSvg(cx + 10, cy + 45, cx + 95, 445, rng, palette.primary, palette.highlight, 3.2)}
        <circle cx="${cx}" cy="${cy}" r="132" fill="none" stroke="${palette.secondary}" stroke-width="2.5" stroke-opacity="0.38" stroke-dasharray="10 8" />
      `;
      break;
    }

    case 'weapon_forge': {
      let specialMid = '';
      let specialFore = '';
      if (variant === 'glacial_fang') {
        const shards = Array.from({ length: 8 }, (_, i) => {
          const a = ((i * 45 + 22) * Math.PI) / 180;
          const r1 = 90;
          const r2 = 156;
          const x1 = cx + Math.cos(a - 0.1) * r1;
          const y1 = cy + Math.sin(a - 0.1) * r1;
          const xm = cx + Math.cos(a) * r2;
          const ym = cy + Math.sin(a) * r2;
          const x2 = cx + Math.cos(a + 0.1) * r1;
          const y2 = cy + Math.sin(a + 0.1) * r1;
          return `<polygon points="${fmt(x1)},${fmt(y1)} ${fmt(xm)},${fmt(ym)} ${fmt(x2)},${fmt(y2)}" fill="${palette.primary}" fill-opacity="0.36" stroke="${palette.highlight}" stroke-width="1.4" stroke-opacity="0.72" />`;
        }).join('');
        specialMid = shards;
      } else if (variant === 'dragon_sabre') {
        specialMid = buildTaperedSlashSvg(195, 388, 330, 95, 588, 258, 26, palette.primary, 0.36);
        specialFore = `<path d="M 198 384 C 220 156, 468 104, 582 260" fill="none" stroke="${palette.secondary}" stroke-width="3.8" stroke-opacity="0.76" stroke-dasharray="10 6" />`;
      } else if (variant === 'serpent_pike') {
        specialMid = `<path d="M 210 418 C 265 280, 225 190, 358 150 C 488 112, 468 260, 592 135" fill="none" stroke="${palette.secondary}" stroke-width="18" stroke-opacity="0.34" stroke-linecap="round" />`;
      } else if (variant === 'mountain_cleaver') {
        specialMid = `<polygon points="165,470 260,312 342,395 478,265 625,470" fill="#170D09" fill-opacity="0.76" stroke="${palette.primary}" stroke-width="2" stroke-opacity="0.48" />`;
        specialFore = `<polyline points="235,435 318,335 358,355 438,245" fill="none" stroke="${palette.secondary}" stroke-width="3.5" stroke-opacity="0.78" />`;
      } else if (variant === 'nine_heavens_halberd') {
        specialMid = `
          <circle cx="${cx}" cy="${cy}" r="142" fill="none" stroke="${palette.secondary}" stroke-width="3.8" stroke-opacity="0.44" />
          <circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="${palette.primary}" stroke-width="7" stroke-opacity="0.3" stroke-dasharray="24 10" />
        `;
      } else if (variant === 'spiritwing_bow') {
        specialMid = `
          ${buildTaperedSlashSvg(cx, cy, cx - 155, cy - 115, cx - 110, cy + 95, 18, palette.secondary, 0.38)}
          ${buildTaperedSlashSvg(cx, cy, cx + 155, cy - 115, cx + 110, cy + 95, -18, palette.primary, 0.42)}
        `;
      } else if (variant === 'spirit_ring') {
        specialMid = `
          <circle cx="${cx}" cy="${cy}" r="118" fill="none" stroke="${palette.secondary}" stroke-width="3.5" stroke-opacity="0.52" />
          <circle cx="${cx}" cy="${cy}" r="148" fill="none" stroke="${palette.primary}" stroke-width="2.2" stroke-opacity="0.44" stroke-dasharray="14 8" />
        `;
      } else if (variant === 'frostheart_twin') {
        specialMid = `
          <path d="M 205 340 A 150 150 0 0 1 500 145" fill="none" stroke="${palette.primary}" stroke-width="11" stroke-opacity="0.44" stroke-linecap="round" />
          <path d="M 500 345 A 150 150 0 0 1 205 150" fill="none" stroke="${palette.secondary}" stroke-width="11" stroke-opacity="0.44" stroke-linecap="round" />
        `;
      } else {
        specialMid = `
          <circle cx="${cx}" cy="${cy}" r="124" fill="none" stroke="${palette.primary}" stroke-width="2.8" stroke-opacity="0.38" stroke-dasharray="18 8" />
          ${buildTaperedSlashSvg(190, 388, 360, 195, 598, 95, 16, palette.secondary, 0.36)}
        `;
      }
      midground = specialMid;
      foreground = specialFore;
      break;
    }

    case 'sacred_armor': {
      if (variant === 'bagua_vestment') {
        midground = buildBaguaRingSvg(cx, cy, 140, palette.primary, 0.58, 0);
        foreground = `<circle cx="${cx}" cy="${cy}" r="158" fill="none" stroke="${palette.secondary}" stroke-width="2.4" stroke-opacity="0.36" />`;
      } else {
        midground = `
          <polygon points="${cx},${cy - 152} ${cx + 148},${cy} ${cx},${cy + 152} ${cx - 148},${cy}" fill="none" stroke="${palette.primary}" stroke-width="3" stroke-opacity="0.46" />
          <polygon points="${cx},${cy - 128} ${cx + 124},${cy} ${cx},${cy + 128} ${cx - 124},${cy}" fill="none" stroke="${palette.secondary}" stroke-width="2" stroke-opacity="0.46" transform="rotate(14 ${cx} ${cy})" />
        `;
        foreground = buildTaperedSlashSvg(205, 368, 355, 280, 568, 338, 8, palette.rim, 0.38);
      }
      break;
    }

    case 'qinggong_plus': {
      const ripples = `
        <ellipse cx="${cx}" cy="${fmt(cy + 106)}" rx="142" ry="25" fill="none" stroke="${palette.primary}" stroke-width="2.6" stroke-opacity="0.54" />
        <ellipse cx="${cx}" cy="${fmt(cy + 106)}" rx="94" ry="15" fill="none" stroke="${palette.highlight}" stroke-width="1.8" stroke-opacity="0.68" />
      `;
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, '#122236', '#08111C', hashString(cardKey))}
        ${ripples}
      `;
      foreground = buildTaperedSlashSvg(185, 345, 355, 285, 615, 212, 8, palette.rim, 0.52);
      break;
    }

    case 'steed_minus':
    default: {
      const streaks = Array.from({ length: 7 }, (_, i) => {
        const y0 = 115 + i * 44;
        const x0 = 195 + (i % 3) * 32;
        return buildTaperedSlashSvg(
          x0,
          y0 + 34,
          x0 + 120,
          y0 + 4,
          x0 + 235,
          y0 - 22,
          4 + (i % 2) * 3,
          i % 2 === 0 ? palette.primary : palette.secondary,
          0.42,
        );
      }).join('');
      midground = `
        ${buildSmoothInkRidgesSvg(CARD_MASTER_W, CARD_MASTER_H, palette.bgMid, palette.bgDeep, hashString(cardKey))}
        ${streaks}
      `;
      foreground =
        variant === 'thunderstride'
          ? buildLightningBoltsSvg(210, 355, 588, 128, rng, palette.primary, palette.highlight, 3.4)
          : buildTaperedSlashSvg(185, 388, 385, 265, 615, 152, 6, palette.highlight, 0.62);
      break;
    }
  }

  return { midground, foreground, cx, cy };
}

/**
 * Builds the complete SVG overlay for a 640x520 master card painting.
 * Specular sheen is strictly clipped inside the focal icon geometry (0 box artifacts!),
 * and userSpaceOnUse gradients enforce razor-sharp Readability Safe Zones.
 */
function buildCardOverlaySvg(cardKey, iconBody, spec) {
  const seed = hashString(`card:${cardKey}`);
  const rng = mulberry32(seed);
  const { palette } = spec;
  const { midground, foreground, cx, cy } = buildCardSceneLayers(cardKey, spec, rng);

  const scale = spec.iconScale ?? 0.46;
  const rot = spec.iconRotate ?? 0;
  const halfIcon = 256 * scale;
  const tx = cx - halfIcon;
  const ty = cy - halfIcon;

  const cleanBody = iconBody.replaceAll('fill="currentColor"', '');
  const particles = buildEmberParticlesSvg(cx, cy, 28, rng, palette.highlight, palette.secondary);
  const iconTransform = `translate(${fmt(tx)}, ${fmt(ty)}) rotate(${fmt(rot)} 256 256) scale(${fmt(scale)})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_MASTER_W}" height="${CARD_MASTER_H}" viewBox="0 0 ${CARD_MASTER_W} ${CARD_MASTER_H}">
  <defs>
    <radialGradient id="focalHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.highlight}" stop-opacity="0.44" />
      <stop offset="38%" stop-color="${palette.primary}" stop-opacity="0.32" />
      <stop offset="72%" stop-color="${palette.secondary}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="${palette.bgDeep}" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="iconMetalFill" x1="0.85" y1="0.08" x2="0.15" y2="0.95">
      <stop offset="0%" stop-color="${palette.highlight}" />
      <stop offset="34%" stop-color="${palette.rim}" />
      <stop offset="72%" stop-color="${palette.primary}" />
      <stop offset="100%" stop-color="${palette.metalDark}" />
    </linearGradient>

    <linearGradient id="iconRimStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.highlight}" stop-opacity="0.96" />
      <stop offset="55%" stop-color="${palette.secondary}" stop-opacity="0.86" />
      <stop offset="100%" stop-color="${palette.bgDeep}" stop-opacity="0.96" />
    </linearGradient>

    <linearGradient id="sheenBand" gradientUnits="userSpaceOnUse" x1="${fmt(cx - 125)}" y1="${fmt(cy - 125)}" x2="${fmt(cx + 125)}" y2="${fmt(cy + 125)}">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0" />
      <stop offset="44%" stop-color="#FFFFFF" stop-opacity="0.34" />
      <stop offset="54%" stop-color="${palette.highlight}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <clipPath id="focalIconClip">
      <g transform="${iconTransform}">
        ${cleanBody}
      </g>
    </clipPath>

    <!-- CRITICAL READABILITY SAFE ZONE 1: userSpaceOnUse Top-Left Veil (x: 0..24%=154px, y: 0..46%=240px) -->
    <radialGradient id="topLeftSafeVeil" gradientUnits="userSpaceOnUse" cx="34" cy="58" r="268">
      <stop offset="0%" stop-color="#070A0F" stop-opacity="0.96" />
      <stop offset="58%" stop-color="#090D14" stop-opacity="0.86" />
      <stop offset="84%" stop-color="#0B0F17" stop-opacity="0.36" />
      <stop offset="100%" stop-color="#0B0F17" stop-opacity="0" />
    </radialGradient>

    <!-- CRITICAL READABILITY SAFE ZONE 2: Bottom Title Plate Seamless Fade into #161B23 (y: 78%..100%) -->
    <linearGradient id="bottomPlateFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#161B23" stop-opacity="0" />
      <stop offset="72%" stop-color="#161B23" stop-opacity="0" />
      <stop offset="84%" stop-color="#161B23" stop-opacity="0.66" />
      <stop offset="94%" stop-color="#161B23" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#161B23" stop-opacity="1" />
    </linearGradient>

    <radialGradient id="edgeVignette" cx="55%" cy="44%" r="68%">
      <stop offset="62%" stop-color="#090B10" stop-opacity="0" />
      <stop offset="100%" stop-color="#07090D" stop-opacity="0.68" />
    </radialGradient>

    <filter id="softShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="8" />
    </filter>
    <filter id="rimBloom" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="5.5" />
    </filter>
    <filter id="mistBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" />
    </filter>
  </defs>

  <!-- Midground bespoke environment -->
  ${midground}

  <!-- Focal atmospheric backlight -->
  <circle cx="${cx}" cy="${cy}" r="182" fill="url(#focalHalo)" />

  <!-- Layer 1: Deep cast shadow behind focal illustration -->
  <g transform="translate(${fmt(tx + 8)}, ${fmt(ty + 14)}) rotate(${fmt(rot)} 256 256) scale(${fmt(scale)})" fill="#040609" fill-opacity="0.88" filter="url(#softShadow)">
    ${cleanBody}
  </g>

  <!-- Layer 2: Outer elemental / metallic bloom -->
  <g transform="${iconTransform}" fill="none" stroke="${palette.primary}" stroke-width="24" stroke-linejoin="round" stroke-opacity="0.52" filter="url(#rimBloom)">
    ${cleanBody}
  </g>

  <!-- Layer 3: Crisp dark-bronze / obsidian bevel outline -->
  <g transform="${iconTransform}" fill="#0A0D12" stroke="url(#iconRimStroke)" stroke-width="14" stroke-linejoin="round">
    ${cleanBody}
  </g>

  <!-- Layer 4: Sculpted mineral-pigment & metallic main fill -->
  <g transform="${iconTransform}" fill="url(#iconMetalFill)">
    ${cleanBody}
  </g>

  <!-- Clipped metallic specular glint strictly inside the icon silhouette -->
  <rect x="0" y="0" width="${CARD_MASTER_W}" height="${CARD_MASTER_H}" fill="url(#sheenBand)" clip-path="url(#focalIconClip)" />

  <!-- Layer 5: Specular highlight bevel edge -->
  <g transform="translate(${fmt(tx - 2)}, ${fmt(ty - 2.5)}) rotate(${fmt(rot)} 256 256) scale(${fmt(scale)})" fill="none" stroke="${palette.highlight}" stroke-width="3" stroke-linejoin="round" stroke-opacity="0.72">
    ${cleanBody}
  </g>

  <!-- Foreground overlapping energy, drifting Jianghu mist & mineral particles -->
  <ellipse cx="${fmt(cx + 25)}" cy="398" rx="220" ry="38" fill="${palette.mist}" fill-opacity="0.22" filter="url(#mistBlur)" />
  ${foreground}
  ${particles}

  <!-- Subtle outer frame vignette -->
  <rect width="${CARD_MASTER_W}" height="${CARD_MASTER_H}" fill="url(#edgeVignette)" />

  <!-- Safe Zone 1: Top-left strip dark veil -->
  <rect x="0" y="0" width="320" height="360" fill="url(#topLeftSafeVeil)" />

  <!-- Safe Zone 2: Bottom edge smooth blend into #161B23 -->
  <rect width="${CARD_MASTER_W}" height="${CARD_MASTER_H}" fill="url(#bottomPlateFade)" />
</svg>`;
}

async function generateSingleCardArt(cardKey, iconBody, spec) {
  const seed = hashString(`canvas:${cardKey}`);
  const baseCanvas = await buildMineralInkCanvas({
    width: CARD_MASTER_W,
    height: CARD_MASTER_H,
    seed,
    bgDeep: spec.palette.bgDeep,
    bgMid: spec.palette.bgMid,
    mistColor: spec.palette.mist,
    primaryColor: spec.palette.primary,
    focalX: 0.56,
    focalY: 0.45,
    focalRadius: 0.50,
    enforceCardSafeZones: true,
  });

  const svgBuffer = Buffer.from(buildCardOverlaySvg(cardKey, iconBody, spec), 'utf8');

  const rawPngPath = path.join(RAW_CARDS_DIR, `${cardKey}.png`);
  const outWebpPath = path.join(OUT_CARDS_DIR, `${cardKey}.webp`);

  const masterPng = await sharp(baseCanvas)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(rawPngPath, masterPng);

  await sharp(masterPng)
    .resize(CARD_OUT_W, CARD_OUT_H, { kernel: 'lanczos3', fit: 'cover' })
    .webp({ quality: 85, effort: 6, smartSubsample: true })
    .toFile(outWebpPath);

  return {
    cardKey,
    rawBytes: masterPng.length,
    webpBytes: fs.statSync(outWebpPath).size,
    rawPngPath,
    outWebpPath,
  };
}

// ---------------------------------------------------------------------------
// 3 Core UI Scenes: table-bg (1920x1080), lobby-banner (1280x720), card-back (640x880 -> 320x440)
// ---------------------------------------------------------------------------

async function generateTableBg() {
  const w = 1920;
  const h = 1080;
  const baseCanvas = await buildMineralInkCanvas({
    width: w,
    height: h,
    seed: hashString('ui:table-bg'),
    bgDeep: '#080706',
    bgMid: '#10141B',
    mistColor: '#171D27',
    primaryColor: '#231B12',
    focalX: 0.5,
    focalY: 0.47,
    focalRadius: 0.62,
    warpStrength: 0.9,
    grainAmount: 5,
  });

  const cx = 960;
  const cy = 496;
  const rng = mulberry32(9001);

  const compassTicks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180;
    const major = i % 6 === 0;
    const rIn = major ? 316 : 326;
    const rOut = 336;
    return `<line x1="${fmt(cx + Math.cos(a) * rIn)}" y1="${fmt(cy + Math.sin(a) * rIn)}" x2="${fmt(cx + Math.cos(a) * rOut)}" y2="${fmt(cy + Math.sin(a) * rOut)}" stroke="#B89352" stroke-width="${major ? '2.2' : '1.1'}" stroke-opacity="${major ? '0.28' : '0.15'}" />`;
  }).join('');

  const dragonScrollArcs = Array.from({ length: 4 }, (_, q) => {
    const rot = q * 90 + 45;
    return `<g transform="translate(${cx}, ${cy}) rotate(${rot})" opacity="0.18" fill="none" stroke="#C89B4B">
      <path d="M -95 -195 C -35 -235, 55 -235, 105 -185 C 130 -160, 95 -130, 68 -148 C 45 -164, -25 -168, -68 -142" stroke-width="3.2" stroke-linecap="round" />
      <path d="M -70 -175 C -20 -205, 40 -205, 80 -170" stroke-width="1.5" stroke-dasharray="6 5" />
      <circle cx="0" cy="-212" r="5" fill="#C89B4B" />
    </g>`;
  }).join('');

  const cornerEmbers = [
    [130, 110],
    [1790, 110],
    [130, 970],
    [1790, 970],
  ]
    .map(([bx, by]) =>
      Array.from({ length: 10 }, () => {
        const ex = bx + (rng() - 0.5) * 220;
        const ey = by + (rng() - 0.5) * 165;
        const r = 1.2 + rng() * 2.2;
        return `<circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="${fmt(r)}" fill="#F59E0B" fill-opacity="${fmt(0.2 + rng() * 0.3)}" />`;
      }).join(''),
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="tableRecess" cx="50%" cy="46%" r="54%">
      <stop offset="0%" stop-color="#121721" stop-opacity="0.70" />
      <stop offset="68%" stop-color="#0D1118" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#080706" stop-opacity="0.96" />
    </radialGradient>
    <radialGradient id="brazierTL" cx="0%" cy="0%" r="42%">
      <stop offset="0%" stop-color="#C2410C" stop-opacity="0.26" />
      <stop offset="45%" stop-color="#7C2D12" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="brazierTR" cx="100%" cy="0%" r="42%">
      <stop offset="0%" stop-color="#C2410C" stop-opacity="0.26" />
      <stop offset="45%" stop-color="#7C2D12" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="brazierBL" cx="0%" cy="100%" r="42%">
      <stop offset="0%" stop-color="#B45309" stop-opacity="0.22" />
      <stop offset="45%" stop-color="#78350F" stop-opacity="0.09" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="brazierBR" cx="100%" cy="100%" r="42%">
      <stop offset="0%" stop-color="#B45309" stop-opacity="0.22" />
      <stop offset="45%" stop-color="#78350F" stop-opacity="0.09" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#tableRecess)" />

  <!-- Outer sunken ebony war-table bevel -->
  <ellipse cx="${cx}" cy="${cy}" rx="792" ry="416" fill="#0E1219" fill-opacity="0.56" stroke="#7A5F36" stroke-width="2.4" stroke-opacity="0.24" />
  <ellipse cx="${cx}" cy="${cy}" rx="776" ry="402" fill="none" stroke="#B89352" stroke-width="1" stroke-opacity="0.14" />

  <!-- Carved Bronze Dragon-Compass & Bagua Geometry -->
  <circle cx="${cx}" cy="${cy}" r="344" fill="none" stroke="#8C6B37" stroke-width="2.4" stroke-opacity="0.22" />
  <circle cx="${cx}" cy="${cy}" r="306" fill="none" stroke="#8C6B37" stroke-width="1.2" stroke-opacity="0.15" />
  ${compassTicks}
  ${buildBaguaRingSvg(cx, cy, 268, '#B89352', 0.19, 0)}
  ${dragonScrollArcs}

  <!-- Subtle Nine Realms sword-compass core seal -->
  <circle cx="${cx}" cy="${cy}" r="118" fill="#0B0F15" fill-opacity="0.56" stroke="#B89352" stroke-width="1.8" stroke-opacity="0.22" />
  <circle cx="${cx}" cy="${cy}" r="86" fill="none" stroke="#8C6B37" stroke-width="1.2" stroke-opacity="0.18" stroke-dasharray="5 5" />
  <polygon points="${cx},${cy - 76} ${cx + 16},${cy - 16} ${cx + 76},${cy} ${cx + 16},${cy + 16} ${cx},${cy + 76} ${cx - 16},${cy + 16} ${cx - 76},${cy} ${cx - 16},${cy - 16}" fill="none" stroke="#C89B4B" stroke-width="1.5" stroke-opacity="0.20" />

  <!-- Warm corner brazier candlelight -->
  <rect width="${w}" height="${h}" fill="url(#brazierTL)" />
  <rect width="${w}" height="${h}" fill="url(#brazierTR)" />
  <rect width="${w}" height="${h}" fill="url(#brazierBL)" />
  <rect width="${w}" height="${h}" fill="url(#brazierBR)" />
  ${cornerEmbers}

  <!-- Subtle corner bronze frame brackets -->
  <g stroke="#9E7B42" stroke-width="2" stroke-opacity="0.25" fill="none">
    <path d="M 28 74 V 28 H 74 M 38 56 V 38 H 56" />
    <path d="M 1892 74 V 28 H 1846 M 1882 56 V 38 H 1864" />
    <path d="M 28 1006 V 1052 H 74 M 38 1024 V 1042 H 56" />
    <path d="M 1892 1006 V 1052 H 1846 M 1882 1024 V 1042 H 1864" />
  </g>
</svg>`;

  const rawPngPath = path.join(RAW_UI_DIR, 'table-bg.png');
  const outWebpPath = path.join(OUT_UI_DIR, 'table-bg.webp');

  const masterPng = await sharp(baseCanvas)
    .composite([{ input: Buffer.from(svg, 'utf8'), top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(rawPngPath, masterPng);
  await sharp(masterPng)
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(outWebpPath);

  return {
    key: 'table-bg',
    rawBytes: masterPng.length,
    webpBytes: fs.statSync(outWebpPath).size,
    outWebpPath,
  };
}

async function generateLobbyBanner() {
  const w = 1280;
  const h = 720;
  const baseCanvas = await buildShanShuiLobbyCanvas(w, h, hashString('ui:lobby-shan-shui'));

  const rng = mulberry32(7717);
  const stars = Array.from({ length: 38 }, () => {
    const sx = rng() * w;
    const sy = rng() * 240;
    const r = 0.7 + rng() * 1.2;
    return `<circle cx="${fmt(sx)}" cy="${fmt(sy)}" r="${fmt(r)}" fill="#F8FAFC" fill-opacity="${fmt(0.16 + rng() * 0.42)}" />`;
  }).join('');

  const embers = Array.from({ length: 32 }, () => {
    const ex = 420 + rng() * 830;
    const ey = 280 + rng() * 410;
    const r = 1.1 + rng() * 2.4;
    return `<circle cx="${fmt(ex)}" cy="${fmt(ey)}" r="${fmt(r)}" fill="${rng() > 0.35 ? '#FBBF24' : '#FB923C'}" fill-opacity="${fmt(0.28 + rng() * 0.55)}" />`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18" />
    </filter>
    <filter id="cloudWisps" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" />
    </filter>
    <linearGradient id="pavilionGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#EA580C" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="cliffFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B0F16" stop-opacity="0.96" />
      <stop offset="55%" stop-color="#0B0F16" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#0B0F16" stop-opacity="0" />
    </linearGradient>
  </defs>

  ${stars}

  <!-- Wispy clouds drifting across the moon -->
  <g filter="url(#cloudWisps)" opacity="0.42">
    <ellipse cx="905" cy="195" rx="135" ry="18" fill="#1E293B" />
    <ellipse cx="980" cy="162" rx="110" ry="14" fill="#334155" />
    <ellipse cx="760" cy="435" rx="280" ry="34" fill="#1E293B" />
    <ellipse cx="1020" cy="485" rx="250" ry="32" fill="#292018" />
  </g>

  <!-- Ancient weathered colossal stone swords ("Ẩn Kiếm") silhouetted in far crags -->
  <g fill="#111924" opacity="0.68">
    <polygon points="790,145 799,118 808,145 805,320 793,320" transform="rotate(-4 799 220)" />
    <path d="M 778 164 Q 799 170 820 164 L 817 171 Q 799 176 781 171 Z" transform="rotate(-4 799 220)" />
    <polygon points="1088,182 1095,160 1102,182 1100,340 1090,340" transform="rotate(8 1095 250)" />
    <rect x="1079" y="198" width="32" height="5.5" rx="2" transform="rotate(8 1095 250)" />
  </g>

  <!-- Lantern-lit Cliffside Wuxia Pavilion perched on craggy ledge -->
  <g transform="translate(942, 318)">
    <!-- Warm ambient lantern bloom into the mountain mist -->
    <circle cx="56" cy="48" r="54" fill="#F59E0B" fill-opacity="0.24" filter="url(#softGlow)" />
    <!-- Rock cliff foundation & stone arch bridge -->
    <path d="M -32 70 Q 15 62 48 68 L 126 68 L 154 148 L -58 148 Z" fill="url(#cliffFade)" />
    <path d="M -52 84 Q -18 64 12 76" fill="none" stroke="#1E2633" stroke-width="5" stroke-opacity="0.7" />
    <!-- Pagoda upper roof -->
    <path d="M 16 22 Q 48 16 56 4 Q 64 16 96 22 L 86 27 H 26 Z" fill="#080B10" stroke="#B89352" stroke-width="1" stroke-opacity="0.45" />
    <rect x="34" y="27" width="44" height="15" fill="#10141D" />
    <rect x="41" y="30" width="11" height="9" fill="url(#pavilionGlow)" />
    <rect x="59" y="30" width="11" height="9" fill="url(#pavilionGlow)" />
    <!-- Pagoda main hall -->
    <path d="M 2 44 Q 50 37 56 26 Q 62 37 110 44 L 98 50 H 14 Z" fill="#080B10" stroke="#C89B4B" stroke-width="1.2" stroke-opacity="0.52" />
    <rect x="22" y="50" width="68" height="19" fill="#0C1017" />
    <rect x="31" y="53" width="13" height="12" fill="url(#pavilionGlow)" />
    <rect x="49" y="53" width="14" height="12" fill="#FEF08A" />
    <rect x="68" y="53" width="13" height="12" fill="url(#pavilionGlow)" />
    <!-- Glowing red eaves lanterns -->
    <circle cx="10" cy="52" r="3" fill="#EF4444" />
    <circle cx="102" cy="52" r="3" fill="#EF4444" />
  </g>

  <!-- Crooked cliffside Wuxia pine silhouette on foreground right crag -->
  <g fill="#070708" stroke="#070708">
    <path d="M 1280 515 Q 1195 505 1135 532 Q 1105 544 1082 538" fill="none" stroke-width="6" stroke-linecap="round" />
    <path d="M 1185 512 Q 1155 488 1118 492" fill="none" stroke-width="3.5" stroke-linecap="round" />
    <ellipse cx="1115" cy="490" rx="34" ry="9" />
    <ellipse cx="1080" cy="535" rx="38" ry="10" />
    <ellipse cx="1152" cy="512" rx="30" ry="8" />
  </g>

  ${embers}
</svg>`;

  const rawPngPath = path.join(RAW_UI_DIR, 'lobby-banner.png');
  const outWebpPath = path.join(OUT_UI_DIR, 'lobby-banner.webp');

  const masterPng = await sharp(baseCanvas)
    .composite([{ input: Buffer.from(svg, 'utf8'), top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(rawPngPath, masterPng);
  await sharp(masterPng)
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(outWebpPath);

  return {
    key: 'lobby-banner',
    rawBytes: masterPng.length,
    webpBytes: fs.statSync(outWebpPath).size,
    outWebpPath,
  };
}

async function generateCardBack(emblem = '劍') {
  const masterW = 640;
  const masterH = 880;
  const outW = 320;
  const outH = 440;

  const baseCanvas = await buildMineralInkCanvas({
    width: masterW,
    height: masterH,
    seed: hashString('ui:card-back'),
    bgDeep: '#070E1A',
    bgMid: '#12243E',
    mistColor: '#1E3A5F',
    primaryColor: '#294973',
    focalX: 0.5,
    focalY: 0.5,
    focalRadius: 0.62,
    warpStrength: 1.0,
    grainAmount: 5,
  });

  const cx = 320;
  const cy = 440;

  const latticeLines = [];
  for (let i = -masterH; i < masterW + masterH; i += 44) {
    latticeLines.push(
      `<line x1="${i}" y1="0" x2="${i + masterH}" y2="${masterH}" stroke="#60A5FA" stroke-width="1" stroke-opacity="0.065" />`,
      `<line x1="${i + masterH}" y1="0" x2="${i}" y2="${masterH}" stroke="#60A5FA" stroke-width="1" stroke-opacity="0.065" />`,
    );
  }

  // Ornate cloud-scroll & Ruyi corner brackets
  const cornerScroll = (tx, ty, sx, sy) => `<g transform="translate(${tx},${ty}) scale(${sx},${sy})" fill="none" stroke="url(#goldTrim)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 0 96 V 0 H 96" />
    <path d="M 16 74 V 16 H 74" stroke-width="3.2" />
    <path d="M 32 54 C 32 36, 46 32, 54 40 C 60 46, 50 56, 42 50" stroke-width="2.8" />
    <path d="M 74 16 C 88 16, 94 28, 84 36" stroke-width="2.4" />
    <path d="M 16 74 C 16 88, 28 94, 36 84" stroke-width="2.4" />
    <circle cx="24" cy="24" r="4.5" fill="#FDE68A" stroke="none" />
  </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${masterW}" height="${masterH}" viewBox="0 0 ${masterW} ${masterH}">
  <defs>
    <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="45%" stop-color="#D99B26" />
      <stop offset="100%" stop-color="#8C5E1A" />
    </linearGradient>
    <linearGradient id="emblemGold" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="45%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#D99B26" />
    </linearGradient>
    <radialGradient id="medallionBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1A355B" />
      <stop offset="70%" stop-color="#0E1E36" />
      <stop offset="100%" stop-color="#081120" />
    </radialGradient>
    <radialGradient id="goldCoreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.34" />
      <stop offset="65%" stop-color="#D99B26" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#081120" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Silk damask lattice -->
  <g clip-path="inset(26px 26px 26px 26px)">
    ${latticeLines.join('')}
  </g>

  <!-- Outer & inner aged bronze talisman borders -->
  <rect x="20" y="20" width="600" height="840" rx="28" fill="none" stroke="url(#goldTrim)" stroke-width="7" />
  <rect x="36" y="36" width="568" height="808" rx="20" fill="none" stroke="#E6BE6C" stroke-width="2.4" stroke-opacity="0.7" />
  <rect x="52" y="52" width="536" height="776" rx="14" fill="none" stroke="#9A6E2F" stroke-width="1.6" stroke-dasharray="10 6" stroke-opacity="0.65" />

  <!-- Four cloud-scroll / Ruyi corners -->
  ${cornerScroll(44, 44, 1, 1)}
  ${cornerScroll(596, 44, -1, 1)}
  ${cornerScroll(44, 836, 1, -1)}
  ${cornerScroll(596, 836, -1, -1)}

  <!-- Symmetrical top & bottom sword-talisman filigree -->
  <g fill="none" stroke="url(#goldTrim)" stroke-width="3">
    <path d="M 225 144 Q 272 114 320 144 Q 368 114 415 144" stroke-opacity="0.6" />
    <polygon points="320,74 356,144 320,206 284,144" fill="#0D1B30" />
    <line x1="320" y1="74" x2="320" y2="236" />
    <circle cx="320" cy="144" r="9" fill="#FDE68A" />

    <path d="M 225 736 Q 272 766 320 736 Q 368 766 415 736" stroke-opacity="0.6" />
    <polygon points="320,806 356,736 320,674 284,736" fill="#0D1B30" />
    <line x1="320" y1="806" x2="320" y2="644" />
    <circle cx="320" cy="736" r="9" fill="#FDE68A" />
  </g>

  <!-- Central Bagua Octagram & Nine Realms Medallion -->
  <circle cx="${cx}" cy="${cy}" r="230" fill="url(#goldCoreGlow)" />
  ${buildBaguaRingSvg(cx, cy, 198, '#E6BE6C', 0.9, 0)}

  <circle cx="${cx}" cy="${cy}" r="128" fill="url(#medallionBg)" stroke="url(#goldTrim)" stroke-width="6.5" />
  <circle cx="${cx}" cy="${cy}" r="112" fill="none" stroke="#FDE68A" stroke-width="1.8" stroke-opacity="0.58" />

  <!-- Crossed-blade geometry behind central emblem -->
  <g stroke="#D99B26" stroke-opacity="0.34" stroke-width="5" stroke-linecap="round">
    <line x1="${cx - 70}" y1="${cy - 70}" x2="${cx + 70}" y2="${cy + 70}" />
    <line x1="${cx + 70}" y1="${cy - 70}" x2="${cx - 70}" y2="${cy + 70}" />
  </g>

  <!-- Central 劍 Emblem -->
  <text
    x="${cx}"
    y="${cy + 49}"
    text-anchor="middle"
    font-family="'Noto Serif', 'PMingLiU', 'SimSun', 'Microsoft YaHei', Georgia, serif"
    font-size="132"
    font-weight="700"
    fill="url(#emblemGold)"
    stroke="#070E1B"
    stroke-width="8"
    paint-order="stroke"
  >${emblem}</text>
</svg>`;

  const rawPngPath = path.join(RAW_UI_DIR, 'card-back.png');
  const outWebpPath = path.join(OUT_UI_DIR, 'card-back.webp');

  const masterPng = await sharp(baseCanvas)
    .composite([{ input: Buffer.from(svg, 'utf8'), top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(rawPngPath, masterPng);
  await sharp(masterPng)
    .resize(outW, outH, { kernel: 'lanczos3', fit: 'cover' })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(outWebpPath);

  return {
    key: 'card-back',
    rawBytes: masterPng.length,
    webpBytes: fs.statSync(outWebpPath).size,
    outWebpPath,
  };
}

// ---------------------------------------------------------------------------
// Verification & Optional 1280x720 Contact Sheet (6x6 Cards + 3 UI Scenes)
// ---------------------------------------------------------------------------

async function verifyGeneratedAssets(cardResults, uiResults) {
  assert.equal(cardResults.length, 36, 'Must verify 36 card assets');
  assert.equal(uiResults.length, 3, 'Must verify 3 UI assets');

  let totalWebpBytes = 0;
  let maxSafeLum = 0;

  for (const item of cardResults) {
    const rawMeta = await sharp(item.rawPngPath).metadata();
    assert.equal(rawMeta.width, 640, `${item.cardKey}.png width`);
    assert.equal(rawMeta.height, 520, `${item.cardKey}.png height`);

    const meta = await sharp(item.outWebpPath).metadata();
    assert.equal(meta.width, 320, `${item.cardKey}.webp width`);
    assert.equal(meta.height, 260, `${item.cardKey}.webp height`);
    assert.equal(meta.format, 'webp', `${item.cardKey}.webp format`);

    // Verify top-left safe zone (0..24%=77px, 0..46%=120px) stays dark for Rank + Suit badge contrast
    const { data: tlBuf, info: tlInfo } = await sharp(item.outWebpPath)
      .extract({ left: 0, top: 0, width: 77, height: 120 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let lumSum = 0;
    const pxCount = tlInfo.width * tlInfo.height;
    for (let i = 0; i < tlBuf.length; i += tlInfo.channels) {
      lumSum += 0.2126 * tlBuf[i] + 0.7152 * tlBuf[i + 1] + 0.0722 * tlBuf[i + 2];
    }
    const safeLum = lumSum / pxCount;
    if (safeLum > maxSafeLum) maxSafeLum = safeLum;
    assert.ok(
      safeLum < 25,
      `${item.cardKey}.webp top-left safe zone luminance too bright (${safeLum.toFixed(1)})`,
    );

    // Verify bottom edge (y: 92%..100% -> top: 240, height: 20) blends cleanly into #161B23 (lum ~26.5)
    const { data: btmBuf, info: btmInfo } = await sharp(item.outWebpPath)
      .extract({ left: 0, top: 240, width: 320, height: 20 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let btmLumSum = 0;
    const btmCount = btmInfo.width * btmInfo.height;
    for (let i = 0; i < btmBuf.length; i += btmInfo.channels) {
      btmLumSum += 0.2126 * btmBuf[i] + 0.7152 * btmBuf[i + 1] + 0.0722 * btmBuf[i + 2];
    }
    const btmLum = btmLumSum / btmCount;
    assert.ok(
      btmLum >= 18 && btmLum <= 34,
      `${item.cardKey}.webp bottom plate blend out of #161B23 range (${btmLum.toFixed(1)})`,
    );

    totalWebpBytes += item.webpBytes;
  }

  const expectedUiDims = {
    'table-bg': [1920, 1080],
    'lobby-banner': [1280, 720],
    'card-back': [320, 440],
  };

  for (const ui of uiResults) {
    const meta = await sharp(ui.outWebpPath).metadata();
    const [ew, eh] = expectedUiDims[ui.key];
    assert.equal(meta.width, ew, `${ui.key}.webp width`);
    assert.equal(meta.height, eh, `${ui.key}.webp height`);
    assert.equal(meta.format, 'webp', `${ui.key}.webp format`);
    totalWebpBytes += ui.webpBytes;
  }

  assert.ok(
    totalWebpBytes < MAX_TOTAL_WEBP_BYTES,
    `Total WebP size ${totalWebpBytes} exceeds 3.5 MB budget`,
  );

  return { totalWebpBytes, maxSafeLum };
}

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function generateCompositeSheet(sheetPath, cardResults, uiResults, displayByKey) {
  const W = 1280;
  const H = 720;
  fs.mkdirSync(path.dirname(sheetPath), { recursive: true });

  const composites = [];
  const labels = [];

  const cols = 6;
  const cellW = 148;
  const cellH = 111;
  const thumbW = 138;
  const thumbH = 92;
  const startX = 18;
  const startY = 44;

  for (let idx = 0; idx < cardResults.length; idx++) {
    const item = cardResults[idx];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const left = startX + col * cellW;
    const top = startY + row * cellH;

    const thumbBuf = await sharp(item.outWebpPath)
      .resize(thumbW, thumbH, { fit: 'cover' })
      .png()
      .toBuffer();

    composites.push({ input: thumbBuf, left, top });

    const nameVi = displayByKey[item.cardKey]?.nameVi ?? item.cardKey;
    labels.push(
      `<rect x="${left - 1}" y="${top - 1}" width="${thumbW + 2}" height="${thumbH + 2}" rx="3" fill="none" stroke="#C89B4B" stroke-opacity="0.55" stroke-width="1" />`,
      `<text x="${left + thumbW / 2}" y="${top + thumbH + 12}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="9.5" font-weight="600" fill="#E5DCCB">${escapeXml(nameVi)}</text>`,
    );
  }

  const uiByKey = Object.fromEntries(uiResults.map((u) => [u.key, u]));
  const uiRightX = 926;
  const wideW = 336;
  const wideH = 189;

  const tableThumb = await sharp(uiByKey['table-bg'].outWebpPath)
    .resize(wideW, wideH, { fit: 'cover' })
    .png()
    .toBuffer();
  composites.push({ input: tableThumb, left: uiRightX, top: 44 });
  labels.push(
    `<rect x="${uiRightX - 1}" y="43" width="${wideW + 2}" height="${wideH + 2}" rx="4" fill="none" stroke="#C89B4B" stroke-opacity="0.72" stroke-width="1.2" />`,
    `<text x="${uiRightX + wideW / 2}" y="${44 + wideH + 14}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="10.5" font-weight="700" fill="#FDE68A">table-bg.webp (1920x1080)</text>`,
  );

  const lobbyThumb = await sharp(uiByKey['lobby-banner'].outWebpPath)
    .resize(wideW, wideH, { fit: 'cover' })
    .png()
    .toBuffer();
  composites.push({ input: lobbyThumb, left: uiRightX, top: 258 });
  labels.push(
    `<rect x="${uiRightX - 1}" y="257" width="${wideW + 2}" height="${wideH + 2}" rx="4" fill="none" stroke="#C89B4B" stroke-opacity="0.72" stroke-width="1.2" />`,
    `<text x="${uiRightX + wideW / 2}" y="${258 + wideH + 14}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="10.5" font-weight="700" fill="#FDE68A">lobby-banner.webp (1280x720)</text>`,
  );

  const backW = 148;
  const backH = 204;
  const backLeft = uiRightX + Math.round((wideW - backW) / 2);
  const backTop = 474;
  const backThumb = await sharp(uiByKey['card-back'].outWebpPath)
    .resize(backW, backH, { fit: 'cover' })
    .png()
    .toBuffer();
  composites.push({ input: backThumb, left: backLeft, top: backTop });
  labels.push(
    `<rect x="${backLeft - 1}" y="${backTop - 1}" width="${backW + 2}" height="${backH + 2}" rx="5" fill="none" stroke="#E6BE6C" stroke-opacity="0.82" stroke-width="1.4" />`,
    `<text x="${uiRightX + wideW / 2}" y="${backTop + backH + 15}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="10.5" font-weight="700" fill="#FDE68A">card-back.webp (320x440)</text>`,
  );

  const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <text x="18" y="26" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="700" fill="#F5EBD6">Cửu Châu Ẩn Kiếm — 36 Card Illustrations (320x260 WebP) &amp; 3 Core UI Scenes</text>
    <line x1="912" y1="36" x2="912" y2="704" stroke="#806345" stroke-opacity="0.45" stroke-width="1" />
    ${labels.join('')}
  </svg>`;

  composites.push({ input: Buffer.from(frameSvg, 'utf8'), left: 0, top: 0 });

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 11, g: 13, b: 18, alpha: 1 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 8 })
    .toFile(sheetPath);

  const sheetMeta = await sharp(sheetPath).metadata();
  assert.equal(sheetMeta.width, 1280, 'Sheet width');
  assert.equal(sheetMeta.height, 720, 'Sheet height');
}

async function main() {
  fs.mkdirSync(RAW_CARDS_DIR, { recursive: true });
  fs.mkdirSync(RAW_UI_DIR, { recursive: true });
  fs.mkdirSync(OUT_CARDS_DIR, { recursive: true });
  fs.mkdirSync(OUT_UI_DIR, { recursive: true });

  const { activeCardKeys, displayByKey, offlineIcons, cardKeyToIcon, brand } =
    await loadCardCatalogAndIcons();

  for (const key of activeCardKeys) {
    assert.ok(CARD_ART_SPECS[key], `Missing CARD_ART_SPECS entry for active cardKey: ${key}`);
  }

  console.log(`Generating 36 Cuu Chau card illustrations & 3 UI scenes...`);
  const cardResults = [];
  for (const key of activeCardKeys) {
    const iconName = cardKeyToIcon[key];
    const iconBody = offlineIcons[iconName].body;
    const res = await generateSingleCardArt(key, iconBody, CARD_ART_SPECS[key]);
    cardResults.push(res);
  }

  const uiResults = await Promise.all([
    generateTableBg(),
    generateLobbyBanner(),
    generateCardBack(brand.emblem || '劍'),
  ]);

  const { totalWebpBytes, maxSafeLum } = await verifyGeneratedAssets(cardResults, uiResults);

  const sheetFlagIdx = process.argv.indexOf('--sheet');
  if (sheetFlagIdx >= 0 && process.argv[sheetFlagIdx + 1]) {
    const sheetPath = path.resolve(process.argv[sheetFlagIdx + 1]);
    await generateCompositeSheet(sheetPath, cardResults, uiResults, displayByKey);
    console.log(`Preview contact sheet saved -> ${sheetPath}`);
  }

  const cardRawBytes = cardResults.reduce((s, r) => s + r.rawBytes, 0);
  const uiRawBytes = uiResults.reduce((s, r) => s + r.rawBytes, 0);
  const cardWebpBytes = cardResults.reduce((s, r) => s + r.webpBytes, 0);
  const uiWebpBytes = uiResults.reduce((s, r) => s + r.webpBytes, 0);
  console.log(
    `Master PNGs: 36 cards (${(cardRawBytes / (1024 * 1024)).toFixed(2)} MB) + 3 UI (${(uiRawBytes / (1024 * 1024)).toFixed(2)} MB)`,
  );
  console.log(
    `Optimized WebPs: 36/36 cards (${(cardWebpBytes / 1024).toFixed(1)} KB) + 3/3 UI scenes (${(uiWebpBytes / 1024).toFixed(1)} KB) = ${(totalWebpBytes / 1024).toFixed(1)} KB (${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB) total WebP.`,
  );
  console.log(`Max top-left safe-zone luminance across all 36 cards: ${maxSafeLum.toFixed(1)} / 255 (< 25 gate PASS).`);
  for (const u of uiResults) {
    console.log(`  - ${u.key}.webp: ${(u.webpBytes / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
