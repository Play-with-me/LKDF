import { useEffect, useRef, type RefObject } from 'react';
import type { HeroFaction } from '@lkdf/shared';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import {
  VFX_ASSET_SPECS,
  getCachedVfxImage,
  preloadVfxAssets,
  syncVfxCssCustomProperties,
  type VfxAssetKey,
} from '../../lib/vfxAssetCatalog.js';

export type VfxKind =
  | 'SAT'
  | 'THIEM'
  | 'HEAL'
  | 'NULLIFICATION'
  | 'NAM_MAN'
  | 'VAN_TIEN'
  | 'LIGHTNING'
  | 'DYING'
  | 'ELIMINATION'
  | 'DISMANTLE'
  | 'STEAL'
  | 'SKILL_BURST'
  | 'SCROLL_SEAL'
  | 'EQUIP_FORGE';

export interface VfxEvent {
  readonly id: number;
  readonly kind: VfxKind;
  readonly fromSeat?: number;
  readonly toSeats?: readonly number[];
  readonly nullifyDepth?: number;
  readonly faction?: HeroFaction;
}

export interface MatchVfxCanvasProps {
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly events: readonly VfxEvent[];
  readonly duelSeats: readonly number[];
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface SeatRect {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  rot: number;
  vRot: number;
  life: number;
  maxLife: number;
  shape: 'spark' | 'petal' | 'shard' | 'ink';
}

interface ActiveEffect {
  readonly id: number;
  readonly kind: VfxKind;
  readonly startTime: number;
  readonly duration: number;
  readonly from?: SeatRect;
  readonly targets: readonly SeatRect[];
  readonly center: Point;
  readonly nullifyDepth: number;
  readonly faction?: HeroFaction;
  readonly particles: Particle[];
  readonly lightningPoints?: readonly Point[];
}

const FACTION_PALETTE: Readonly<Record<HeroFaction, { readonly primary: string; readonly glow: string }>> = {
  SHU: { primary: '#EF4444', glow: '#FDE68A' },
  WEI: { primary: '#38BDF8', glow: '#BAE6FD' },
  WU: { primary: '#34D399', glow: '#A7F3D0' },
  QUN: { primary: '#FBBF24', glow: '#FEF08A' },
};

function measureSeat(stage: HTMLElement, stageRect: DOMRect, seatIndex: number): SeatRect | null {
  const el =
    stage.querySelector<HTMLElement>(`[data-drop-seat="${seatIndex}"]`) ??
    stage.querySelector<HTMLElement>(`[data-motion-self="${seatIndex}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    cx: r.left - stageRect.left + r.width / 2,
    cy: r.top - stageRect.top + r.height / 2,
    w: r.width,
    h: r.height,
  };
}

function measureCenter(stage: HTMLElement, stageRect: DOMRect): Point {
  const centerEl = stage.querySelector<HTMLElement>('.lkdf-battle-center-stack');
  if (centerEl) {
    const r = centerEl.getBoundingClientRect();
    return {
      x: r.left - stageRect.left + r.width / 2,
      y: r.top - stageRect.top + r.height / 2,
    };
  }
  return { x: stageRect.width / 2, y: stageRect.height / 2 };
}

function buildLightningBolt(target: SeatRect): Point[] {
  const pts: Point[] = [];
  const startX = target.cx + (Math.random() - 0.5) * 60;
  const startY = Math.max(0, target.cy - 260);
  const segments = 7;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 34;
    pts.push({
      x: startX + (target.cx - startX) * t + jitter,
      y: startY + (target.cy - startY) * t,
    });
  }
  return pts;
}

function drawFlipbookFrame(
  ctx: CanvasRenderingContext2D,
  assetKey: VfxAssetKey,
  cx: number,
  cy: number,
  drawW: number,
  drawH: number,
  progress: number,
  opts?: { alpha?: number; rotation?: number },
): boolean {
  const img = getCachedVfxImage(assetKey);
  if (!img) return false;
  const spec = VFX_ASSET_SPECS[assetKey];
  const isHorizontalStrip = img.naturalWidth >= spec.frameWidth * 2;
  const totalFrames = isHorizontalStrip
    ? Math.max(1, Math.round(img.naturalWidth / spec.frameWidth))
    : 1;
  const clampedP = Math.max(0, Math.min(0.9999, progress));
  const frameIdx = Math.min(totalFrames - 1, Math.floor(clampedP * totalFrames));
  const sw = img.naturalWidth / totalFrames;
  const sh = img.naturalHeight;
  const sx = frameIdx * sw;

  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;
  ctx.translate(cx, cy);
  if (opts?.rotation) ctx.rotate(opts.rotation);
  ctx.drawImage(img, sx, 0, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
  return true;
}

function quadBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function spawnParticles(
  kind: VfxKind,
  from: SeatRect | undefined,
  targets: readonly SeatRect[],
  center: Point,
  nullifyDepth: number,
  faction?: HeroFaction,
): Particle[] {
  const particles: Particle[] = [];
  const push = (p: Particle) => {
    if (particles.length < 24) particles.push(p);
  };

  if (kind === 'SAT' || kind === 'DISMANTLE') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    for (let i = 0; i < 16; i++) {
      const ang = -Math.PI * 0.75 + Math.random() * Math.PI * 1.5;
      const spd = 90 + Math.random() * 190;
      push({
        x: t.cx + (Math.random() - 0.5) * 18,
        y: t.cy + (Math.random() - 0.5) * 18,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2 + Math.random() * 2.5,
        alpha: 1,
        color: kind === 'DISMANTLE'
          ? (i % 2 === 0 ? '#FBBF24' : '#B91C1C')
          : (i % 3 === 0 ? '#FDE68A' : '#E85D4A'),
        rot: ang,
        vRot: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.14,
        shape: kind === 'DISMANTLE' && i % 2 === 0 ? 'shard' : 'spark',
      });
    }
  } else if (kind === 'THIEM') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI * 0.8 + (i / 12) * Math.PI * 1.2;
      const spd = 65 + Math.random() * 110;
      push({
        x: t.cx - 12,
        y: t.cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2 + Math.random() * 2,
        alpha: 0.95,
        color: i % 2 === 0 ? '#55D6A0' : '#D1FAE5',
        rot: ang,
        vRot: 0,
        life: 0,
        maxLife: 0.26 + Math.random() * 0.12,
        shape: 'spark',
      });
    }
  } else if (kind === 'HEAL') {
    const list = targets.length > 0 ? targets : [{ cx: center.x, cy: center.y, w: 120, h: 80 }];
    const perSeat = Math.max(2, Math.min(8, Math.floor(20 / list.length)));
    for (const t of list) {
      for (let i = 0; i < perSeat; i++) {
        push({
          x: t.cx + (Math.random() - 0.5) * t.w * 0.65,
          y: t.cy + t.h * 0.25 + Math.random() * 12,
          vx: (Math.random() - 0.5) * 26,
          vy: -(38 + Math.random() * 44),
          size: 4.5 + Math.random() * 3,
          alpha: 0.95,
          color: i % 2 === 0 ? '#F9A8D4' : '#FDE68A',
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 4,
          life: 0,
          maxLife: 0.42 + Math.random() * 0.1,
          shape: 'petal',
        });
      }
    }
  } else if (kind === 'NULLIFICATION') {
    const count = nullifyDepth >= 1 ? 20 : 10;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const spd = (nullifyDepth >= 1 ? 120 : 75) + Math.random() * 80;
      push({
        x: center.x,
        y: center.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.random() * 3,
        alpha: 1,
        color: i % 2 === 0 ? '#FDE68A' : '#E85D4A',
        rot: ang,
        vRot: (Math.random() - 0.5) * 8,
        life: 0,
        maxLife: 0.34 + Math.random() * 0.12,
        shape: nullifyDepth >= 1 ? 'shard' : 'spark',
      });
    }
  } else if (kind === 'LIGHTNING') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 180;
      push({
        x: t.cx,
        y: t.cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.2 + Math.random() * 2.5,
        alpha: 1,
        color: i % 2 === 0 ? '#FDE68A' : '#C084FC',
        rot: ang,
        vRot: 0,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.14,
        shape: 'spark',
      });
    }
  } else if (kind === 'STEAL') {
    const origin = from ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    const dest = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    const mid = { x: (origin.cx + dest.cx) / 2, y: Math.min(origin.cy, dest.cy) - 54 };
    for (let i = 0; i < 14; i++) {
      const pt = quadBezierPoint({ x: origin.cx, y: origin.cy }, mid, { x: dest.cx, y: dest.cy }, i / 13);
      push({
        x: pt.x + (Math.random() - 0.5) * 10,
        y: pt.y + (Math.random() - 0.5) * 10,
        vx: (dest.cx - origin.cx) * 0.18 + (Math.random() - 0.5) * 28,
        vy: (dest.cy - origin.cy) * 0.18 - 18,
        size: 2.4 + Math.random() * 2,
        alpha: 0.95,
        color: i % 2 === 0 ? '#FDE68A' : '#D99B26',
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 5,
        life: 0,
        maxLife: 0.36 + (i / 13) * 0.12,
        shape: i % 3 === 0 ? 'shard' : 'spark',
      });
    }
  } else if (kind === 'SKILL_BURST') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    const pal = (faction ? FACTION_PALETTE[faction] : undefined) ?? { primary: '#E6BE6C', glow: '#FDE68A' };
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const spd = 55 + Math.random() * 95;
      push({
        x: t.cx,
        y: t.cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.2 + Math.random() * 2.2,
        alpha: 0.95,
        color: i % 2 === 0 ? pal.glow : pal.primary,
        rot: ang,
        vRot: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 0.34 + Math.random() * 0.1,
        shape: i % 3 === 0 ? 'shard' : 'spark',
      });
    }
  } else if (kind === 'SCROLL_SEAL' || kind === 'EQUIP_FORGE') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const spd = 48 + Math.random() * 88;
      push({
        x: t.cx + (Math.random() - 0.5) * 20,
        y: t.cy + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (kind === 'EQUIP_FORGE' ? 24 : 0),
        size: 2.2 + Math.random() * 2,
        alpha: 0.95,
        color: kind === 'SCROLL_SEAL'
          ? (i % 2 === 0 ? '#C084FC' : '#FBBF24')
          : (i % 2 === 0 ? '#FDE68A' : '#E6BE6C'),
        rot: ang,
        vRot: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 0.36 + Math.random() * 0.1,
        shape: i % 2 === 0 ? 'shard' : 'spark',
      });
    }
  } else if (kind === 'DYING' || kind === 'ELIMINATION') {
    const t = targets[0] ?? { cx: center.x, cy: center.y, w: 120, h: 80 };
    const count = kind === 'ELIMINATION' ? 22 : 14;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 60 + Math.random() * 150;
      push({
        x: t.cx,
        y: t.cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.random() * 3.5,
        alpha: 0.95,
        color: i % 3 === 0 ? '#1F2937' : '#DC2626',
        rot: ang,
        vRot: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 0.38 + Math.random() * 0.14,
        shape: kind === 'ELIMINATION' ? 'ink' : 'spark',
      });
    }
  }

  return particles;
}

export function MatchVfxCanvas({ stageRef, events, duelSeats }: MatchVfxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectsRef = useRef<ActiveEffect[]>([]);
  const duelRectsRef = useRef<SeatRect[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const stageSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  useEffect(() => {
    syncVfxCssCustomProperties();
    if (!prefersReducedMotion()) {
      preloadVfxAssets();
    }
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const syncCanvasSize = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      stageSizeRef.current = { width: rect.width, height: rect.height, dpr };
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    syncCanvasSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncCanvasSize) : null;
    ro?.observe(stage);
    window.addEventListener('resize', syncCanvasSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [stageRef]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    if (prefersReducedMotion()) {
      effectsRef.current = [];
      duelRectsRef.current = [];
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    preloadVfxAssets();
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    duelRectsRef.current = duelSeats
      .map((s) => measureSeat(stage, stageRect, s))
      .filter((r): r is SeatRect => r !== null);

    const now = performance.now();
    const center = measureCenter(stage, stageRect);
    for (const ev of events) {
      if (seenIdsRef.current.has(ev.id)) continue;
      seenIdsRef.current.add(ev.id);

      const from = ev.fromSeat != null ? measureSeat(stage, stageRect, ev.fromSeat) ?? undefined : undefined;
      const targets = (ev.toSeats ?? [])
        .map((s) => measureSeat(stage, stageRect, s))
        .filter((r): r is SeatRect => r !== null);

      const duration =
        ev.kind === 'HEAL' || ev.kind === 'ELIMINATION' || ev.kind === 'STEAL'
          ? 480
          : ev.kind === 'NAM_MAN' || ev.kind === 'VAN_TIEN' || ev.kind === 'LIGHTNING'
            ? 440
            : ev.kind === 'NULLIFICATION' || ev.kind === 'SKILL_BURST' || ev.kind === 'SCROLL_SEAL' || ev.kind === 'EQUIP_FORGE'
              ? 420
              : 380;

      effectsRef.current.push({
        id: ev.id,
        kind: ev.kind,
        startTime: now,
        duration,
        from,
        targets,
        center,
        nullifyDepth: ev.nullifyDepth ?? 0,
        faction: ev.faction,
        particles: spawnParticles(ev.kind, from, targets, center, ev.nullifyDepth ?? 0, ev.faction),
        lightningPoints:
          ev.kind === 'LIGHTNING' && targets[0] ? buildLightningBolt(targets[0]) : undefined,
      });
    }

    if (seenIdsRef.current.size > 120) {
      const activeIds = new Set(events.map((e) => e.id));
      for (const id of seenIdsRef.current) {
        if (!activeIds.has(id)) seenIdsRef.current.delete(id);
      }
    }

    if (effectsRef.current.length === 0 && duelRectsRef.current.length === 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stageSizeRef.current = { width: stageRect.width, height: stageRect.height, dpr };
    const targetW = Math.round(stageRect.width * dpr);
    const targetH = Math.round(stageRect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    if (rafRef.current !== null) return;
    lastFrameRef.current = performance.now();

    const tick = (ts: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx || prefersReducedMotion()) {
        effectsRef.current = [];
        duelRectsRef.current = [];
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = null;
        return;
      }

      const dt = Math.min(0.05, Math.max(0.001, (ts - lastFrameRef.current) / 1000));
      lastFrameRef.current = ts;

      const { width: stageW, height: stageH, dpr: frameDpr } = stageSizeRef.current;
      ctx.setTransform(frameDpr, 0, 0, frameDpr, 0, 0);
      ctx.clearRect(0, 0, stageW, stageH);

      // 1. Render active Duel ember/spark aura
      for (const seat of duelRectsRef.current) {
        const pulse = 0.55 + 0.45 * Math.sin(ts * 0.008);
        const pad = 4;
        const x = seat.cx - seat.w / 2 - pad;
        const y = seat.cy - seat.h / 2 - pad;
        const w = seat.w + pad * 2;
        const h = seat.h + pad * 2;

        ctx.save();
        ctx.strokeStyle = `rgba(232, 93, 74, ${0.45 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.55)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();

        for (let k = 0; k < 4; k++) {
          const phase = ts * 0.003 + (k * Math.PI) / 2;
          const sx = seat.cx + Math.cos(phase) * (w * 0.48);
          const sy = seat.cy + Math.sin(phase) * (h * 0.48);
          ctx.fillStyle = k % 2 === 0 ? '#FDE68A' : '#E85D4A';
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.5, 2.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Render & advance discrete hybrid flipbook + procedural VFX effects
      const remaining: ActiveEffect[] = [];
      for (const eff of effectsRef.current) {
        const elapsed = Math.max(0, ts - eff.startTime);
        const p = Math.max(0, Math.min(1, elapsed / eff.duration));
        if (p >= 1) continue;
        remaining.push(eff);

        const easeOut = 1 - Math.pow(1 - p, 3);
        const fadeOut = 1 - p;

        if ((eff.kind === 'SAT' || eff.kind === 'DISMANTLE') && eff.targets[0]) {
          const t = eff.targets[0];
          const size = eff.kind === 'DISMANTLE' ? 136 : 156;
          drawFlipbookFrame(ctx, 'vfx-ink-slash', t.cx, t.cy, size, size, p, {
            alpha: 0.96,
            rotation: eff.kind === 'DISMANTLE' ? 0.35 : 0,
          });
          ctx.save();
          ctx.translate(t.cx, t.cy);
          ctx.rotate(eff.kind === 'DISMANTLE' ? 0.35 : -0.45);
          ctx.strokeStyle = `rgba(253, 230, 138, ${fadeOut * 0.9})`;
          ctx.lineWidth = 3 * (1 - p * 0.5);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.5, 36 + easeOut * 16), -Math.PI * 0.42, Math.PI * 0.42);
          ctx.stroke();
          ctx.restore();
        } else if (eff.kind === 'THIEM' && eff.targets[0]) {
          const t = eff.targets[0];
          drawFlipbookFrame(ctx, 'vfx-bagua-seal', t.cx, t.cy, 136, 136, p, { alpha: 0.88 });
          ctx.save();
          ctx.translate(t.cx, t.cy);
          ctx.strokeStyle = `rgba(85, 214, 160, ${fadeOut * 0.92})`;
          ctx.lineWidth = 3.5 * (1 - p * 0.4);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.5, 32 + easeOut * 12), -Math.PI * 0.65, Math.PI * 0.65);
          ctx.stroke();
          ctx.restore();
        } else if (eff.kind === 'HEAL') {
          const targets = eff.targets.length > 0 ? eff.targets : [{ cx: eff.center.x, cy: eff.center.y, w: 120, h: 80 }];
          for (const t of targets) {
            drawFlipbookFrame(ctx, 'vfx-peach-bloom', t.cx, t.cy, 146, 146, p, { alpha: 0.94 });
          }
        } else if (eff.kind === 'NULLIFICATION') {
          const sealSize = eff.nullifyDepth >= 1 ? 196 : 164;
          drawFlipbookFrame(ctx, 'vfx-bagua-seal', eff.center.x, eff.center.y, sealSize, sealSize, p, { alpha: 0.95 });
          const maxR = eff.nullifyDepth >= 1 ? 115 : 82;
          const r = Math.max(0.5, 18 + easeOut * maxR);
          ctx.save();
          ctx.strokeStyle =
            eff.nullifyDepth >= 1
              ? `rgba(232, 93, 74, ${fadeOut * 0.95})`
              : `rgba(230, 190, 108, ${fadeOut * 0.9})`;
          ctx.lineWidth = eff.nullifyDepth >= 1 ? 4 : 2.5;
          ctx.beginPath();
          ctx.arc(eff.center.x, eff.center.y, r, 0, Math.PI * 2);
          ctx.stroke();
          if (eff.nullifyDepth >= 1) {
            ctx.strokeStyle = `rgba(253, 230, 138, ${fadeOut * 0.85})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(eff.center.x, eff.center.y, Math.max(0.5, r * 0.72), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (eff.kind === 'NAM_MAN') {
          ctx.save();
          const r = Math.max(0.5, 40 + easeOut * 220);
          ctx.strokeStyle = `rgba(217, 155, 38, ${fadeOut * 0.75})`;
          ctx.lineWidth = 5 * (1 - p * 0.5);
          ctx.setLineDash([18, 12]);
          ctx.beginPath();
          ctx.arc(eff.center.x, eff.center.y, r, p * 2.2, p * 2.2 + Math.PI * 1.65);
          ctx.stroke();
          ctx.restore();
        } else if (eff.kind === 'VAN_TIEN') {
          ctx.save();
          for (const t of eff.targets) {
            const x = eff.center.x + (t.cx - eff.center.x) * easeOut;
            const y = eff.center.y + (t.cy - eff.center.y) * easeOut;
            const tx = eff.center.x + (t.cx - eff.center.x) * Math.max(0, easeOut - 0.24);
            const ty = eff.center.y + (t.cy - eff.center.y) * Math.max(0, easeOut - 0.24);
            ctx.strokeStyle = `rgba(230, 190, 108, ${fadeOut * 0.95})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          ctx.restore();
        } else if (eff.kind === 'LIGHTNING' && eff.targets[0]) {
          const target = eff.targets[0];
          drawFlipbookFrame(ctx, 'vfx-thunder-strike', target.cx, target.cy - 68, 148, 196, p, { alpha: 0.98 });
          if (eff.lightningPoints) {
            ctx.save();
            if (elapsed < 100) {
              ctx.fillStyle = `rgba(253, 230, 138, ${(1 - elapsed / 100) * 0.14})`;
              ctx.fillRect(0, 0, stageW, stageH);
            }
            ctx.strokeStyle = `rgba(192, 132, 252, ${fadeOut * 0.95})`;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#FDE68A';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            eff.lightningPoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.strokeStyle = `rgba(253, 230, 138, ${fadeOut})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.restore();
          }
        } else if (eff.kind === 'STEAL' && eff.targets[0]) {
          const origin = eff.from ? { x: eff.from.cx, y: eff.from.cy } : eff.center;
          const dest = { x: eff.targets[0].cx, y: eff.targets[0].cy };
          const mid = { x: (origin.x + dest.x) / 2, y: Math.min(origin.y, dest.y) - 54 };
          const headT = easeOut;
          const tailT = Math.max(0, headT - 0.32);

          ctx.save();
          ctx.strokeStyle = `rgba(253, 230, 138, ${fadeOut * 0.92})`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.shadowColor = 'rgba(217, 155, 38, 0.7)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          const steps = 10;
          for (let i = 0; i <= steps; i++) {
            const st = tailT + ((headT - tailT) * i) / steps;
            const pt = quadBezierPoint(origin, mid, dest, st);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          const headPt = quadBezierPoint(origin, mid, dest, headT);
          ctx.fillStyle = `rgba(255, 251, 235, ${fadeOut})`;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, Math.max(0.5, 4.5 * (1 - p * 0.4)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (eff.kind === 'SKILL_BURST' && eff.targets[0]) {
          const t = eff.targets[0];
          const pal = (eff.faction ? FACTION_PALETTE[eff.faction] : undefined) ?? { primary: '#E6BE6C', glow: '#FDE68A' };
          const r1 = Math.max(0.5, 22 + easeOut * 48);
          const r2 = Math.max(0.5, 14 + easeOut * 34);
          ctx.save();
          ctx.globalAlpha = fadeOut * 0.9;
          ctx.strokeStyle = pal.primary;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(t.cx, t.cy, r1, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = pal.glow;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(t.cx, t.cy, r2, p * 2.5, p * 2.5 + Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (eff.kind === 'SCROLL_SEAL' && eff.targets[0]) {
          const t = eff.targets[0];
          drawFlipbookFrame(ctx, 'vfx-bagua-seal', t.cx, t.cy, 118, 118, p, { alpha: 0.85 });
          ctx.save();
          ctx.strokeStyle = `rgba(192, 132, 252, ${fadeOut * 0.88})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(t.cx, t.cy, Math.max(0.5, 20 + easeOut * 36), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (eff.kind === 'EQUIP_FORGE' && eff.targets[0]) {
          const t = eff.targets[0];
          const r = Math.max(0.5, 18 + easeOut * 42);
          ctx.save();
          ctx.strokeStyle = `rgba(253, 230, 138, ${fadeOut * 0.9})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(t.cx, t.cy, r, 0, Math.PI * 2);
          ctx.stroke();

          // Horizontal anvil gleam sweep
          const gx = t.cx - t.w * 0.4 + easeOut * t.w * 0.8;
          ctx.strokeStyle = `rgba(255, 251, 235, ${fadeOut * 0.75})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx - 14, t.cy - 10);
          ctx.lineTo(gx + 14, t.cy + 10);
          ctx.stroke();
          ctx.restore();
        } else if ((eff.kind === 'DYING' || eff.kind === 'ELIMINATION') && eff.targets[0]) {
          const t = eff.targets[0];
          ctx.save();
          ctx.strokeStyle = `rgba(220, 38, 38, ${fadeOut * 0.9})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(t.cx, t.cy, Math.max(0.5, 24 + easeOut * 44), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Update & draw particles
        for (const pt of eff.particles) {
          pt.life += dt;
          if (pt.life >= pt.maxLife) continue;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.rot += pt.vRot * dt;
          const ptAlpha = pt.alpha * (1 - pt.life / pt.maxLife);

          ctx.save();
          ctx.globalAlpha = Math.max(0, ptAlpha);
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rot);
          ctx.fillStyle = pt.color;
          if (pt.shape === 'petal') {
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(0.5, pt.size), Math.max(0.5, pt.size * 0.55), 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (pt.shape === 'shard') {
            ctx.beginPath();
            ctx.moveTo(-pt.size, 0);
            ctx.lineTo(0, -pt.size * 0.7);
            ctx.lineTo(pt.size, 0);
            ctx.lineTo(0, pt.size * 0.7);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, pt.size), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      effectsRef.current = remaining;

      if (effectsRef.current.length > 0 || duelRectsRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, stageW, stageH);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stageRef, events, duelSeats]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-25 h-full w-full"
    />
  );
}
