import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'assets', 'vfx');
const MAX_TOTAL_BYTES = 250 * 1024;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
}

function seeded(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function fmt(n) {
  return Number(n).toFixed(2);
}

/**
 * 1. vfx-ink-slash.webp: 10 frames x 192x192 horizontal strip
 * Crimson-gold ink blade slash & ink droplets (SAT, DUEL, DISMANTLE)
 */
function buildInkSlashFrame(frameIdx, totalFrames) {
  const w = 192;
  const h = 192;
  const t = frameIdx / (totalFrames - 1);
  const slashProgress = easeOutCubic(clamp(t / 0.58, 0, 1));
  const fade = t < 0.45 ? 1 : clamp(1 - (t - 0.45) / 0.55, 0, 1);
  const entryAlpha = clamp(t / 0.14, 0.25, 1);
  const masterAlpha = fade * entryAlpha;

  const angleSpan = slashProgress * 1.15;
  const startAngle = 2.35 - angleSpan * 0.2;
  const endAngle = 2.35 - angleSpan * 1.55;
  const cx = 92;
  const cy = 98;
  const rx = 74;
  const ry = 54;

  const p0x = cx + Math.cos(startAngle) * rx;
  const p0y = cy + Math.sin(startAngle) * ry;
  const p1x = cx + Math.cos(endAngle) * rx;
  const p1y = cy + Math.sin(endAngle) * ry;
  const midAngle = (startAngle + endAngle) / 2;
  const ctrlR = 1.18;
  const mx = cx + Math.cos(midAngle) * rx * ctrlR;
  const my = cy + Math.sin(midAngle) * ry * ctrlR;

  const strokeWidthInk = (18 + Math.sin(t * Math.PI) * 14) * fade;
  const strokeWidthCrimson = Math.max(1.5, strokeWidthInk * 0.58);
  const strokeWidthGold = Math.max(0.8, strokeWidthInk * 0.24);

  const droplets = Array.from({ length: 14 }, (_, k) => {
    const s1 = seeded(k * 7 + 1);
    const s2 = seeded(k * 13 + 3);
    const baseAng = -0.8 + (s1 - 0.5) * 2.2;
    const dist = (14 + s2 * 56) * easeOutCubic(clamp((t - 0.12) / 0.78, 0, 1));
    const dx = cx + 18 + Math.cos(baseAng) * dist;
    const dy = cy - 12 + Math.sin(baseAng) * dist;
    const r = Math.max(0.8, (1.8 + s1 * 3.4) * (1 - t * 0.65));
    const isGold = k % 3 === 0;
    const color = isGold ? '#FDE68A' : k % 2 === 0 ? '#DC2626' : '#2D0E0D';
    const op = clamp(fade * (0.95 - s2 * 0.25), 0, 1);
    return `<circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="${fmt(r)}" fill="${color}" fill-opacity="${fmt(op)}" />`;
  }).join('');

  const flashR = t >= 0.15 && t <= 0.5 ? (1 - Math.abs(t - 0.3) / 0.2) * 24 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="slashGold${frameIdx}" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#C83E37" stop-opacity="0.1" />
      <stop offset="48%" stop-color="#F59E0B" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#FFFBEB" stop-opacity="1" />
    </linearGradient>
    <linearGradient id="slashInk${frameIdx}" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#140908" stop-opacity="0.2" />
      <stop offset="55%" stop-color="#7F1D1D" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#DC2626" stop-opacity="0.96" />
    </linearGradient>
    <radialGradient id="hitFlash${frameIdx}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#DC2626" stop-opacity="0" />
    </radialGradient>
  </defs>
  <g opacity="${fmt(masterAlpha)}">
    ${flashR > 0 ? `<circle cx="${fmt(p1x)}" cy="${fmt(p1y)}" r="${fmt(flashR)}" fill="url(#hitFlash${frameIdx})" />` : ''}
    <path d="M ${fmt(p0x)} ${fmt(p0y)} Q ${fmt(mx)} ${fmt(my)} ${fmt(p1x)} ${fmt(p1y)}"
      fill="none" stroke="url(#slashInk${frameIdx})" stroke-width="${fmt(strokeWidthInk)}" stroke-linecap="round" />
    <path d="M ${fmt(p0x)} ${fmt(p0y)} Q ${fmt(mx + 2)} ${fmt(my - 2)} ${fmt(p1x)} ${fmt(p1y)}"
      fill="none" stroke="#DC2626" stroke-opacity="0.88" stroke-width="${fmt(strokeWidthCrimson)}" stroke-linecap="round" />
    <path d="M ${fmt(p0x + 3)} ${fmt(p0y - 3)} Q ${fmt(mx + 5)} ${fmt(my - 5)} ${fmt(p1x)} ${fmt(p1y)}"
      fill="none" stroke="url(#slashGold${frameIdx})" stroke-width="${fmt(strokeWidthGold)}" stroke-linecap="round" />
    ${droplets}
  </g>
</svg>`;
}

/**
 * 2. vfx-peach-bloom.webp: 12 frames x 180x180 horizontal strip
 * Watercolor peach blossom bloom & floating petals (HEAL)
 */
function buildPeachBloomFrame(frameIdx, totalFrames) {
  const size = 180;
  const cx = 90;
  const cy = 94;
  const t = frameIdx / (totalFrames - 1);
  const bloom = easeOutCubic(clamp(t / 0.45, 0, 1));
  const fade = t < 0.58 ? 1 : clamp(1 - (t - 0.58) / 0.42, 0, 1);

  const jadeR = Math.max(2, 16 + bloom * 56);
  const jadeAlpha = clamp((1 - t) * 0.72, 0, 0.72);

  const petalScale = 0.25 + bloom * 0.85;
  const petals = Array.from({ length: 5 }, (_, k) => {
    const ang = (k * 72 - 90 + t * 28) * (Math.PI / 180);
    const dist = (14 + t * 18) * petalScale;
    const px = cx + Math.cos(ang) * dist;
    const py = cy + Math.sin(ang) * dist;
    const rotDeg = (k * 72 + t * 35);
    return `<g transform="translate(${fmt(px)}, ${fmt(py)}) rotate(${fmt(rotDeg)}) scale(${fmt(petalScale)})">
      <path d="M 0 -22 C 13 -14 14 8 0 18 C -14 8 -13 -14 0 -22 Z" fill="url(#petalGrad${frameIdx})" fill-opacity="${fmt(fade * 0.9)}" stroke="#F472B6" stroke-opacity="0.45" stroke-width="1" />
    </g>`;
  }).join('');

  const floatingPetals = Array.from({ length: 10 }, (_, k) => {
    const s1 = seeded(k * 11 + 5);
    const s2 = seeded(k * 19 + 9);
    const driftT = clamp((t - s1 * 0.15) / 0.85, 0, 1);
    const x = cx + (s1 - 0.5) * 96 + Math.sin(driftT * 5 + k) * 10;
    const y = cy + 20 - driftT * (55 + s2 * 45);
    const rDeg = s1 * 360 + driftT * 180;
    const pAlpha = fade * Math.sin(driftT * Math.PI) * 0.92;
    const color = k % 3 === 0 ? '#FDE68A' : k % 2 === 0 ? '#FBCFE8' : '#F9A8D4';
    return `<g transform="translate(${fmt(x)}, ${fmt(y)}) rotate(${fmt(rDeg)})" opacity="${fmt(clamp(pAlpha, 0, 1))}">
      <ellipse cx="0" cy="0" rx="5.5" ry="3.1" fill="${color}" />
    </g>`;
  }).join('');

  const coreR = Math.max(1, 10 * bloom * fade);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="petalGrad${frameIdx}" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFF1F2" />
      <stop offset="55%" stop-color="#F9A8D4" />
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0.72" />
    </radialGradient>
    <radialGradient id="healGlow${frameIdx}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.75" />
      <stop offset="45%" stop-color="#55D6A0" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#55D6A0" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${fmt(jadeR)}" fill="url(#healGlow${frameIdx})" opacity="${fmt(jadeAlpha)}" />
  <circle cx="${cx}" cy="${cy}" r="${fmt(jadeR)}" fill="none" stroke="#55D6A0" stroke-width="2.2" stroke-opacity="${fmt(jadeAlpha * 0.85)}" />
  ${petals}
  <circle cx="${cx}" cy="${cy}" r="${fmt(coreR)}" fill="#FDE68A" fill-opacity="${fmt(fade * 0.95)}" />
  ${floatingPetals}
</svg>`;
}

/**
 * 3. vfx-bagua-seal.webp: 12 frames x 180x180 horizontal strip
 * Bronze-gold Bagua array rotating & glowing / shattering (THIEM, NULLIFICATION)
 */
function buildBaguaSealFrame(frameIdx, totalFrames) {
  const size = 180;
  const cx = 90;
  const cy = 90;
  const t = frameIdx / (totalFrames - 1);
  const appear = easeOutCubic(clamp(t / 0.28, 0, 1));
  const shatter = t > 0.62 ? easeOutCubic((t - 0.62) / 0.38) : 0;
  const fade = t < 0.68 ? clamp(t / 0.12, 0.35, 1) : clamp(1 - (t - 0.68) / 0.32, 0, 1);

  const outerRot = t * 52;
  const innerRot = -t * 85;
  const baseScale = 0.65 + appear * 0.38;

  const trigrams = [
    [1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1],
    [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0],
  ];

  const trigramEls = trigrams.map((bars, idx) => {
    const angDeg = idx * 45 + outerRot;
    const angRad = (angDeg * Math.PI) / 180;
    const radialOffset = shatter * 26;
    const ox = Math.cos(angRad) * radialOffset;
    const oy = Math.sin(angRad) * radialOffset;
    const lines = bars.map((solid, bIdx) => {
      const y = -58 - bIdx * 5;
      if (solid) {
        return `<line x1="-10" y1="${y}" x2="10" y2="${y}" stroke="#FDE68A" stroke-width="2.4" stroke-linecap="round" />`;
      }
      return `<line x1="-10" y1="${y}" x2="-2.5" y2="${y}" stroke="#FDE68A" stroke-width="2.4" stroke-linecap="round" />
              <line x1="2.5" y1="${y}" x2="10" y2="${y}" stroke="#FDE68A" stroke-width="2.4" stroke-linecap="round" />`;
    }).join('');
    return `<g transform="translate(${fmt(cx + ox)}, ${fmt(cy + oy)}) rotate(${fmt(angDeg)})">${lines}</g>`;
  }).join('');

  const octagonPts = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 + 22.5 + outerRot) * Math.PI) / 180;
    const r = (76 + shatter * 18) * baseScale;
    return `${fmt(cx + Math.cos(a) * r)},${fmt(cy + Math.sin(a) * r)}`;
  }).join(' ');

  const shards = shatter > 0 ? Array.from({ length: 12 }, (_, k) => {
    const a = ((k * 30 + outerRot) * Math.PI) / 180;
    const r = 46 + shatter * 44;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    return `<polygon points="0,-5 4,0 0,5 -4,0" transform="translate(${fmt(sx)}, ${fmt(sy)}) rotate(${fmt(k * 30 + shatter * 90)})" fill="${k % 2 === 0 ? '#FDE68A' : '#E6BE6C'}" opacity="${fmt(fade)}" />`;
  }).join('') : '';

  const ringR = Math.max(2, 44 * baseScale);
  const pulseR = Math.max(2, 26 + easeOutCubic(t) * 58);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g opacity="${fmt(fade)}">
    <circle cx="${cx}" cy="${cy}" r="${fmt(pulseR)}" fill="none" stroke="#E6BE6C" stroke-width="5" stroke-opacity="${fmt(0.32 * (1 - t * 0.5))}" />
    <circle cx="${cx}" cy="${cy}" r="${fmt(Math.max(2, ringR * 1.15))}" fill="#C89B4B" fill-opacity="0.12" />
    <polygon points="${octagonPts}" fill="none" stroke="#E6BE6C" stroke-width="2.6" stroke-opacity="0.92" />
    <circle cx="${cx}" cy="${cy}" r="${fmt(ringR)}" fill="none" stroke="#C89B4B" stroke-width="2.2" stroke-dasharray="10 6" transform="rotate(${fmt(innerRot)}, ${cx}, ${cy})" />
    <circle cx="${cx}" cy="${cy}" r="${fmt(Math.max(2, ringR * 0.56))}" fill="none" stroke="#FDE68A" stroke-width="2" />
    ${trigramEls}
    ${shards}
  </g>
</svg>`;
}

/**
 * 4. vfx-thunder-strike.webp: 10 frames x 192x256 horizontal strip
 * Violet-white ink lightning column & scorch cloud (LIGHTNING)
 */
function buildThunderStrikeFrame(frameIdx, totalFrames) {
  const w = 192;
  const h = 256;
  const cx = 96;
  const t = frameIdx / (totalFrames - 1);
  const strikeActive = t >= 0.14 && t <= 0.78;
  const fade = t < 0.4 ? 1 : clamp(1 - (t - 0.4) / 0.6, 0, 1);

  const cloudAlpha = clamp(t < 0.2 ? t / 0.2 : fade * 0.9, 0, 0.9);
  const boltProgress = easeOutCubic(clamp(t / 0.28, 0, 1));
  const impactY = 212;
  const startY = 28;
  const currentEndY = startY + (impactY - startY) * boltProgress;

  const segments = 9;
  const mainPts = [];
  for (let i = 0; i <= segments; i++) {
    const segT = i / segments;
    const py = startY + (currentEndY - startY) * segT;
    const jitter = (i === 0 || i === segments)
      ? 0
      : (seeded(i * 17 + frameIdx * 3) - 0.5) * 34;
    mainPts.push(`${fmt(cx + jitter)},${fmt(py)}`);
  }

  const branchPts = [1, 2].map((b) => {
    const startIdx = 2 + b * 2;
    const [bx0, by0] = mainPts[startIdx].split(',').map(Number);
    const dir = b % 2 === 0 ? -1 : 1;
    const bx1 = bx0 + dir * (18 + seeded(frameIdx + b * 5) * 18);
    const by1 = by0 + 22;
    const bx2 = bx1 + dir * 16;
    const by2 = by1 + 26;
    return `<polyline points="${fmt(bx0)},${fmt(by0)} ${fmt(bx1)},${fmt(by1)} ${fmt(bx2)},${fmt(by2)}" fill="none" stroke="#C084FC" stroke-width="2.2" stroke-opacity="${fmt(fade * 0.85)}" stroke-linecap="round" />`;
  }).join('');

  const scorchP = clamp((t - 0.18) / 0.75, 0, 1);
  const scorchRx = Math.max(2, 16 + easeOutCubic(scorchP) * 58);
  const scorchRy = Math.max(1, scorchRx * 0.34);

  const sparks = Array.from({ length: 12 }, (_, k) => {
    const s1 = seeded(k * 23 + 7);
    const ang = -Math.PI + s1 * Math.PI * 2;
    const dist = (10 + s1 * 54) * easeOutCubic(scorchP);
    const sx = cx + Math.cos(ang) * dist;
    const sy = impactY + Math.sin(ang) * dist * 0.42;
    return `<circle cx="${fmt(sx)}" cy="${fmt(sy)}" r="${fmt(Math.max(0.8, 2.5 * fade))}" fill="${k % 2 === 0 ? '#FDE68A' : '#E9D5FF'}" opacity="${fmt(fade)}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="stormCloud${frameIdx}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3B0764" stop-opacity="0.92" />
      <stop offset="55%" stop-color="#1E1B4B" stop-opacity="0.58" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="scorchGlow${frameIdx}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#A855F7" stop-opacity="0.58" />
      <stop offset="100%" stop-color="#3B0764" stop-opacity="0" />
    </radialGradient>
  </defs>
  <ellipse cx="${cx}" cy="34" rx="68" ry="24" fill="url(#stormCloud${frameIdx})" opacity="${fmt(cloudAlpha)}" />
  ${scorchP > 0 ? `<ellipse cx="${cx}" cy="${impactY}" rx="${fmt(scorchRx)}" ry="${fmt(scorchRy)}" fill="url(#scorchGlow${frameIdx})" opacity="${fmt(fade)}" />
  <ellipse cx="${cx}" cy="${impactY}" rx="${fmt(scorchRx * 0.86)}" ry="${fmt(scorchRy * 0.86)}" fill="none" stroke="#C084FC" stroke-width="2" stroke-opacity="${fmt(fade * 0.8)}" />` : ''}
  ${strikeActive || t < 0.25 ? `
  <polyline points="${mainPts.join(' ')}" fill="none" stroke="#9333EA" stroke-opacity="${fmt(fade * 0.65)}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="${mainPts.join(' ')}" fill="none" stroke="#E9D5FF" stroke-opacity="${fmt(fade * 0.95)}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="${mainPts.join(' ')}" fill="none" stroke="#FFFFFF" stroke-opacity="${fmt(fade)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  ${branchPts}` : ''}
  ${sparks}
</svg>`;
}

/**
 * 5. vfx-dying-fire-loop.webp: 12-frame continuous animated WebP loop (192x112)
 * Subtle Red Cliffs ember fire loop around [data-dying="true"] and [data-luoyi-active="true"]
 */
function buildDyingFireLoopFrame(frameIdx, totalFrames) {
  const w = 192;
  const h = 112;
  const phase = (frameIdx / totalFrames) * Math.PI * 2;

  const flames = Array.from({ length: 18 }, (_, k) => {
    const frac = k / 18;
    let bx;
    let by;
    if (k < 7) {
      bx = 16 + (k / 6) * (w - 32);
      by = h - 7;
    } else if (k < 13) {
      bx = 16 + ((k - 7) / 5) * (w - 32);
      by = 8;
    } else if (k < 16) {
      bx = 8;
      by = 22 + ((k - 13) / 2) * (h - 44);
    } else {
      bx = w - 8;
      by = 22 + ((k - 16) / 1) * (h - 44);
    }
    const wave = Math.sin(phase + frac * Math.PI * 4);
    const lift = Math.cos(phase * 2 + k * 1.1) * 4;
    const rx = 12 + wave * 3;
    const ry = 8 + Math.sin(phase + k) * 2.5;
    const color = k % 3 === 0 ? '#FBBF24' : k % 2 === 0 ? '#EA580C' : '#DC2626';
    const op = 0.38 + (Math.sin(phase + k * 0.9) + 1) * 0.16;
    return `<ellipse cx="${fmt(bx + wave * 2.5)}" cy="${fmt(by - Math.abs(lift))}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="${color}" fill-opacity="${fmt(op)}" />`;
  }).join('');

  const embers = Array.from({ length: 12 }, (_, k) => {
    const tOffset = ((frameIdx / totalFrames) + k / 12) % 1;
    const side = k % 2 === 0 ? 1 : -1;
    const bx = 18 + seeded(k * 31) * (w - 36) + Math.sin(tOffset * Math.PI * 2 + k) * 5 * side;
    const by = (h - 6) - tOffset * 26;
    const alpha = Math.sin(tOffset * Math.PI) * 0.85;
    const r = 1.3 + seeded(k * 17) * 1.5;
    return `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(r)}" fill="#FDE68A" fill-opacity="${fmt(alpha)}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="10" fill="none" stroke="#EA580C" stroke-width="2.2" stroke-opacity="${fmt(0.45 + 0.25 * Math.sin(phase))}" />
  ${flames}
  ${embers}
</svg>`;
}

/**
 * 6. vfx-turn-seal-loop.webp: 12-frame continuous animated WebP loop (160x160)
 * Imperial gold dragon seal glow for [data-draw-ready="true"] and turn banner
 */
function buildTurnSealLoopFrame(frameIdx, totalFrames) {
  const size = 128;
  const cx = 64;
  const cy = 64;
  const phase = (frameIdx / totalFrames) * Math.PI * 2;
  const rotDeg = (frameIdx / totalFrames) * 30;
  const pulse = 0.55 + 0.35 * Math.sin(phase);

  const flares = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 + rotDeg) * Math.PI) / 180;
    const r = 52 + Math.sin(phase + k) * 2.5;
    const fx = cx + Math.cos(a) * r;
    const fy = cy + Math.sin(a) * r;
    const op = 0.55 + 0.35 * Math.sin(phase + k * 0.8);
    return `<polygon points="0,-4.5 3,0 0,4.5 -3,0" transform="translate(${fmt(fx)}, ${fmt(fy)}) rotate(${fmt(k * 45 + rotDeg)})" fill="#FDE68A" fill-opacity="${fmt(op)}" />`;
  }).join('');

  const motes = Array.from({ length: 8 }, (_, k) => {
    const a = ((k * 45 - rotDeg * 2) * Math.PI) / 180;
    const r = 42 + Math.cos(phase + k * 1.4) * 4;
    const mx = cx + Math.cos(a) * r;
    const my = cy + Math.sin(a) * r;
    return `<circle cx="${fmt(mx)}" cy="${fmt(my)}" r="1.6" fill="#FFFBEB" fill-opacity="${fmt(0.5 + 0.4 * Math.sin(phase + k))}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="#F59E0B" stroke-width="6" stroke-opacity="${fmt(0.24 * pulse)}" />
  <circle cx="${cx}" cy="${cy}" r="49" fill="none" stroke="#E6BE6C" stroke-width="2" stroke-dasharray="12 6" stroke-opacity="${fmt(0.75 * pulse)}" transform="rotate(${fmt(rotDeg)}, ${cx}, ${cy})" />
  <circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="#FDE68A" stroke-width="1.5" stroke-dasharray="5 8" stroke-opacity="${fmt(0.62 * pulse)}" transform="rotate(${fmt(-rotDeg * 2)}, ${cx}, ${cy})" />
  ${flares}
  ${motes}
</svg>`;
}

async function generateSpriteStrip({ fileName, frameCount, frameWidth, frameHeight, buildSvg, quality, alphaQuality, colours = 96 }) {
  const outPath = path.join(OUT_DIR, fileName);
  const frameBuffers = await Promise.all(
    Array.from({ length: frameCount }, (_, idx) =>
      sharp(Buffer.from(buildSvg(idx, frameCount), 'utf8'))
        .png({ palette: true, colours, dither: 0 })
        .toBuffer(),
    ),
  );

  const totalWidth = frameCount * frameWidth;
  await sharp({
    create: {
      width: totalWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      frameBuffers.map((input, idx) => ({
        input,
        left: idx * frameWidth,
        top: 0,
      })),
    )
    .webp({ quality, alphaQuality, smartSubsample: true, preset: 'drawing', effort: 4 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  assert.equal(meta.width, totalWidth, `${fileName} width`);
  assert.equal(meta.height, frameHeight, `${fileName} height`);
  assert.equal(meta.hasAlpha, true, `${fileName} alpha`);
  return { fileName, bytes: fs.statSync(outPath).size, meta };
}

async function generateAnimatedLoop({ fileName, frameCount, frameWidth, frameHeight, delayMs, buildSvg, quality, alphaQuality, colours = 64 }) {
  const outPath = path.join(OUT_DIR, fileName);
  const frameBuffers = await Promise.all(
    Array.from({ length: frameCount }, (_, idx) =>
      sharp(Buffer.from(buildSvg(idx, frameCount), 'utf8'))
        .png({ palette: true, colours, dither: 0 })
        .toBuffer(),
    ),
  );

  await sharp(frameBuffers, { join: { animated: true } })
    .webp({
      quality,
      alphaQuality,
      smartSubsample: true,
      preset: 'drawing',
      effort: 4,
      loop: 0,
      delay: Array(frameCount).fill(delayMs),
    })
    .toFile(outPath);

  const meta = await sharp(outPath, { animated: true }).metadata();
  assert.equal(meta.width, frameWidth, `${fileName} width`);
  assert.equal(meta.pageHeight ?? meta.height, frameHeight, `${fileName} frameHeight`);
  assert.equal(meta.pages, frameCount, `${fileName} pages`);
  assert.equal(meta.loop, 0, `${fileName} infinite loop`);
  assert.equal(meta.hasAlpha, true, `${fileName} alpha`);
  return { fileName, bytes: fs.statSync(outPath).size, meta };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = await Promise.all([
    generateSpriteStrip({
      fileName: 'vfx-ink-slash.webp',
      frameCount: 10,
      frameWidth: 192,
      frameHeight: 192,
      buildSvg: buildInkSlashFrame,
      quality: 72,
      alphaQuality: 65,
      colours: 128,
    }),
    generateSpriteStrip({
      fileName: 'vfx-peach-bloom.webp',
      frameCount: 12,
      frameWidth: 180,
      frameHeight: 180,
      buildSvg: buildPeachBloomFrame,
      quality: 50,
      alphaQuality: 42,
      colours: 72,
    }),
    generateSpriteStrip({
      fileName: 'vfx-bagua-seal.webp',
      frameCount: 12,
      frameWidth: 180,
      frameHeight: 180,
      buildSvg: buildBaguaSealFrame,
      quality: 48,
      alphaQuality: 40,
      colours: 72,
    }),
    generateSpriteStrip({
      fileName: 'vfx-thunder-strike.webp',
      frameCount: 10,
      frameWidth: 192,
      frameHeight: 256,
      buildSvg: buildThunderStrikeFrame,
      quality: 60,
      alphaQuality: 50,
      colours: 96,
    }),
    generateAnimatedLoop({
      fileName: 'vfx-dying-fire-loop.webp',
      frameCount: 12,
      frameWidth: 192,
      frameHeight: 112,
      delayMs: 75,
      buildSvg: buildDyingFireLoopFrame,
      quality: 54,
      alphaQuality: 44,
      colours: 64,
    }),
    generateAnimatedLoop({
      fileName: 'vfx-turn-seal-loop.webp',
      frameCount: 12,
      frameWidth: 128,
      frameHeight: 128,
      delayMs: 80,
      buildSvg: buildTurnSealLoopFrame,
      quality: 52,
      alphaQuality: 42,
      colours: 64,
    }),
  ]);

  let totalBytes = 0;
  for (const item of results) {
    totalBytes += item.bytes;
    const kb = (item.bytes / 1024).toFixed(2);
    const dims = item.meta.pages
      ? `${item.meta.width}x${item.meta.pageHeight} (${item.meta.pages} frames, loop=${item.meta.loop})`
      : `${item.meta.width}x${item.meta.height}`;
    console.log(`- ${item.fileName.padEnd(24)} ${kb.padStart(7)} KB | ${dims} | alpha=${item.meta.hasAlpha} depth=${item.meta.depth}`);
  }
  console.log(`Total VFX assets: ${(totalBytes / 1024).toFixed(2)} KB (${totalBytes} bytes)`);
  assert.ok(totalBytes < MAX_TOTAL_BYTES, `Total VFX size ${totalBytes} exceeds 250 KB limit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
