import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import type { ActionArcKind, CombatActionArc } from './useMatchMotion.js';

export interface MatchActionArcProps {
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly activeArcs: readonly CombatActionArc[];
  readonly selfSeatIndex: number;
  readonly aimingTargetSeats: readonly number[];
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface MeasuredArc {
  readonly id: string;
  readonly pathD: string;
  readonly end: Point;
  readonly kind: ActionArcKind | 'aim';
}

const ARC_COLORS: Readonly<Record<ActionArcKind | 'aim', { stroke: string; glow: string; markerId: string }>> = {
  aim: { stroke: '#E6BE6C', glow: 'rgba(230, 190, 108, 0.34)', markerId: 'lkdf-arc-arrow-aim' },
  attack: { stroke: '#E85D4A', glow: 'rgba(232, 93, 74, 0.38)', markerId: 'lkdf-arc-arrow-attack' },
  scroll: { stroke: '#E6BE6C', glow: 'rgba(230, 190, 108, 0.36)', markerId: 'lkdf-arc-arrow-scroll' },
  heal: { stroke: '#55D6A0', glow: 'rgba(85, 214, 160, 0.36)', markerId: 'lkdf-arc-arrow-heal' },
};

function findSeatCenter(stage: HTMLElement, stageRect: DOMRect, seatIndex: number, isAimSource = false): Point | null {
  if (isAimSource) {
    const selectedCard = stage.querySelector<HTMLElement>('[data-selected-card="true"]');
    if (selectedCard) {
      const rect = selectedCard.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left - stageRect.left + rect.width / 2,
          y: rect.top - stageRect.top + 4,
        };
      }
    }
  }
  const el =
    stage.querySelector<HTMLElement>(`[data-drop-seat="${seatIndex}"]`) ??
    stage.querySelector<HTMLElement>(`[data-motion-self="${seatIndex}"]`);
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: isAimSource && el.hasAttribute('data-motion-self')
        ? rect.top - stageRect.top + 6
        : rect.top - stageRect.top + rect.height / 2,
    };
  }
  if (isAimSource) {
    const dock = stage.querySelector<HTMLElement>('.lkdf-battle-dock');
    if (dock) {
      const rect = dock.getBoundingClientRect();
      return {
        x: rect.left - stageRect.left + rect.width / 2,
        y: rect.top - stageRect.top + 6,
      };
    }
  }
  return null;
}

function buildQuadraticArc(from: Point, to: Point): { pathD: string; end: Point } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 16) return null;

  // Shorten endpoint slightly so the arrowhead lands cleanly on the seat edge/badge rather than burying its tip
  const trimEnd = Math.min(18, dist * 0.14);
  const ux = dx / dist;
  const uy = dy / dist;
  const x2 = to.x - ux * trimEnd;
  const y2 = to.y - uy * trimEnd;

  // Perpendicular normal biased upward so tactical arcs arch gracefully above the center board
  let nx = -uy;
  let ny = ux;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const arch = Math.min(82, Math.max(26, dist * 0.2));
  const cx = (from.x + x2) / 2 + nx * arch;
  const cy = (from.y + y2) / 2 + ny * arch;

  return {
    pathD: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    end: { x: x2, y: y2 },
  };
}

function ConfirmedArcPath({ arc, reduced }: { readonly arc: MeasuredArc; readonly reduced: boolean }) {
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const style = ARC_COLORS[arc.kind];

  useLayoutEffect(() => {
    const group = groupRef.current;
    const path = pathRef.current;
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!group || !path || !glow) return;

    const animations: Animation[] = [];
    if (reduced) {
      animations.push(
        group.animate(
          [{ opacity: 0.95 }, { opacity: 0.95, offset: 0.6 }, { opacity: 0 }],
          { duration: 550, easing: 'ease-out', fill: 'forwards' },
        ),
      );
    } else {
      const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 260;
      const dash = `${length} ${length}`;
      path.style.strokeDasharray = dash;
      glow.style.strokeDasharray = dash;

      animations.push(
        path.animate(
          [
            { strokeDashoffset: length, opacity: 0.35 },
            { strokeDashoffset: 0, opacity: 1, offset: 0.52 },
            { strokeDashoffset: 0, opacity: 1, offset: 0.72 },
            { strokeDashoffset: 0, opacity: 0 },
          ],
          { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
        ),
      );
      animations.push(
        glow.animate(
          [
            { strokeDashoffset: length, opacity: 0.2 },
            { strokeDashoffset: 0, opacity: 0.9, offset: 0.52 },
            { strokeDashoffset: 0, opacity: 0 },
          ],
          { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
        ),
      );
      if (ring) {
        animations.push(
          ring.animate(
            [
              { r: '5', opacity: 0, strokeWidth: '3' },
              { r: '10', opacity: 0.95, strokeWidth: '2.5', offset: 0.45 },
              { r: '24', opacity: 0, strokeWidth: '1', offset: 1 },
            ],
            { duration: 550, easing: 'ease-out', fill: 'forwards' },
          ),
        );
      }
    }

    return () => {
      for (const anim of animations) anim.cancel();
    };
  }, [arc.id, reduced]);

  return (
    <g ref={groupRef}>
      <path
        ref={glowRef}
        d={arc.pathD}
        fill="none"
        stroke={style.glow}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        ref={pathRef}
        d={arc.pathD}
        fill="none"
        stroke={style.stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        markerEnd={`url(#${style.markerId})`}
      />
      <circle
        ref={ringRef}
        cx={arc.end.x}
        cy={arc.end.y}
        r={12}
        fill="none"
        stroke={style.stroke}
        strokeWidth={2}
        opacity={reduced ? 0.75 : 0}
      />
    </g>
  );
}

/**
 * Lớp phủ SVG phi tương tác (pointer-events-none) hiển thị:
 * 1. Đường ngắm mục tiêu trực tiếp (vàng đồng) khi chọn/kéo bài có mục tiêu.
 * 2. Đường hành động công khai đã xác nhận (Sát, Cẩm nang, Cứu Đào) giữa 2 ghế.
 */
export function MatchActionArc({
  stageRef,
  activeArcs,
  selfSeatIndex,
  aimingTargetSeats,
}: MatchActionArcProps) {
  const [measuredAimArcs, setMeasuredAimArcs] = useState<readonly MeasuredArc[]>([]);
  const [measuredCombatArcs, setMeasuredCombatArcs] = useState<readonly MeasuredArc[]>([]);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || (activeArcs.length === 0 && aimingTargetSeats.length === 0)) {
      setMeasuredAimArcs([]);
      setMeasuredCombatArcs([]);
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) {
      setMeasuredAimArcs([]);
      setMeasuredCombatArcs([]);
      return;
    }

    const nextAim: MeasuredArc[] = [];
    if (aimingTargetSeats.length > 0) {
      const fromPt = findSeatCenter(stage, stageRect, selfSeatIndex, true);
      if (fromPt) {
        for (const targetSeat of aimingTargetSeats) {
          if (targetSeat === selfSeatIndex) continue;
          const toPt = findSeatCenter(stage, stageRect, targetSeat);
          if (!toPt) continue;
          const geo = buildQuadraticArc(fromPt, toPt);
          if (geo) {
            nextAim.push({
              id: `aim:${selfSeatIndex}:${targetSeat}`,
              pathD: geo.pathD,
              end: geo.end,
              kind: 'aim',
            });
          }
        }
      }
    }

    const nextCombat: MeasuredArc[] = [];
    for (const arc of activeArcs) {
      const fromPt = findSeatCenter(stage, stageRect, arc.fromSeat);
      const toPt = findSeatCenter(stage, stageRect, arc.toSeat);
      if (!fromPt || !toPt) continue;
      const geo = buildQuadraticArc(fromPt, toPt);
      if (geo) {
        nextCombat.push({
          id: arc.id,
          pathD: geo.pathD,
          end: geo.end,
          kind: arc.kind,
        });
      }
    }

    setMeasuredAimArcs(nextAim);
    setMeasuredCombatArcs(nextCombat);
  }, [stageRef, activeArcs, selfSeatIndex, aimingTargetSeats, resizeTick]);

  if (measuredAimArcs.length === 0 && measuredCombatArcs.length === 0) {
    return null;
  }

  const reduced = prefersReducedMotion();

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
    >
      <defs>
        {(['aim', 'attack', 'scroll', 'heal'] as const).map((kind) => {
          const { stroke, markerId } = ARC_COLORS[kind];
          return (
            <marker
              key={markerId}
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill={stroke} />
            </marker>
          );
        })}
      </defs>

      {measuredAimArcs.map((arc) => {
        const style = ARC_COLORS.aim;
        return (
          <g key={arc.id}>
            <path
              d={arc.pathD}
              fill="none"
              stroke={style.glow}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path
              d={arc.pathD}
              fill="none"
              stroke={style.stroke}
              strokeWidth={2}
              strokeDasharray="7 5"
              strokeLinecap="round"
              markerEnd={`url(#${style.markerId})`}
            />
            <circle
              cx={arc.end.x}
              cy={arc.end.y}
              r={reduced ? 9 : 11}
              fill="none"
              stroke={style.stroke}
              strokeWidth={1.75}
              strokeOpacity={0.85}
            />
          </g>
        );
      })}

      {measuredCombatArcs.map((arc) => (
        <ConfirmedArcPath key={arc.id} arc={arc} reduced={reduced} />
      ))}
    </svg>
  );
}
