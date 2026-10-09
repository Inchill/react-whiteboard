/**
 * Variable-width freehand strokes ("pressure" strokes).
 *
 * Each point may carry a third value `p` in [0, 1]: real stylus pressure, or a value
 * simulated from drawing speed for mouse and touch. The stroke is rendered as a filled
 * outline whose radius follows `p`, with tapered start and end.
 */
import type { Point, StrokePoint } from './types';

/** Default pressure for points recorded without one. */
export const DEFAULT_PRESSURE = 0.5;

/** Diameter at pressure `p` for a stroke whose nominal width is `size` (p = 0.5 → size). */
export const pressureDiameter = (size: number, p: number) => size * (0.45 + 1.1 * p);

/** Largest radius a stroke of nominal width `size` can reach (used for bounds). */
export const maxPressureRadius = (size: number) => pressureDiameter(size, 1) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Pressure to record for a new sample.
 * - Stylus: the reported pressure, eased toward the previous value to remove jitter.
 * - Mouse / touch: faster movement draws thinner, like a real brush.
 */
export function samplePressure(opts: {
    pointerType: string;
    pressure: number;
    prev: number | undefined;
    /** Screen-space distance from the previous sample, in CSS px. */
    distance: number;
    /** Time since the previous sample, in ms. */
    dt: number;
}): number {
    const { pointerType, pressure, prev, distance, dt } = opts;
    let target: number;
    if (pointerType === 'pen' && pressure > 0) {
        target = pressure;
    } else {
        const speed = distance / Math.max(dt, 1); // px per ms
        target = 1 - Math.min(1, speed / 2.2) * 0.75;
    }
    const value = prev === undefined ? target : lerp(prev, target, pointerType === 'pen' ? 0.6 : 0.25);
    return Math.round(Math.min(1, Math.max(0.05, value)) * 100) / 100;
}

/**
 * Outline polygon of a variable-width stroke.
 * @param size nominal stroke width
 * @param closedEnd taper the last point (false while the stroke is still being drawn)
 */
export function strokeOutline(points: StrokePoint[], size: number, closedEnd = true): Point[] {
    if (points.length === 0) return [];
    const pressure = (pt: StrokePoint) => (pt.length === 3 ? pt[2] : DEFAULT_PRESSURE);

    // Light positional smoothing ("streamline") so the outline doesn't wobble.
    const pts: { x: number; y: number; p: number }[] = [];
    for (const pt of points) {
        const last = pts[pts.length - 1];
        const x = last ? lerp(last.x, pt[0], 0.6) : pt[0];
        const y = last ? lerp(last.y, pt[1], 0.6) : pt[1];
        if (last && Math.hypot(x - last.x, y - last.y) < 0.4) {
            last.p = Math.max(last.p, pressure(pt));
            continue;
        }
        pts.push({ x, y, p: pressure(pt) });
    }
    // Make sure the stroke still reaches the last raw point.
    const rawLast = points[points.length - 1];
    if (pts.length > 1) {
        pts[pts.length - 1].x = rawLast[0];
        pts[pts.length - 1].y = rawLast[1];
    }

    if (pts.length === 1) {
        const r = pressureDiameter(size, pts[0].p) / 2;
        return circle(pts[0], r, 16);
    }

    // Cumulative length for tapering.
    const dist: number[] = [0];
    for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = dist[dist.length - 1];
    const taperLen = Math.min(size * 2.5 + 8, total / 2);
    const ease = (t: number) => Math.sin((Math.min(1, Math.max(0, t)) * Math.PI) / 2);

    const radii = pts.map((pt, i) => {
        let r = pressureDiameter(size, pt.p) / 2;
        if (taperLen > 0) {
            r *= 0.25 + 0.75 * ease(dist[i] / taperLen);
            if (closedEnd) r *= 0.25 + 0.75 * ease((total - dist[i]) / taperLen);
        }
        return Math.max(r, 0.35);
    });

    const left: Point[] = [];
    const right: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const r = radii[i];
        left.push({ x: pts[i].x - dy * r, y: pts[i].y + dx * r });
        right.push({ x: pts[i].x + dy * r, y: pts[i].y - dx * r });
    }

    // Round caps: half circles around the first and last points.
    const first = pts[0];
    const last = pts[pts.length - 1];
    const startAngle = Math.atan2(left[0].y - first.y, left[0].x - first.x);
    const endAngle = Math.atan2(right[right.length - 1].y - last.y, right[right.length - 1].x - last.x);
    const endCap = arc(last, radii[radii.length - 1], Math.atan2(left[left.length - 1].y - last.y, left[left.length - 1].x - last.x), endAngle, -1);
    const startCap = arc(first, radii[0], Math.atan2(right[0].y - first.y, right[0].x - first.x), startAngle, -1);

    return [...left, ...endCap, ...right.reverse(), ...startCap];
}

function circle(c: { x: number; y: number }, r: number, n: number): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
    return out;
}

/** Points on a half circle from angle a0 to a1 going in direction `dir`. */
function arc(c: { x: number; y: number }, r: number, a0: number, a1: number, dir: 1 | -1): Point[] {
    let sweep = a1 - a0;
    if (dir < 0) {
        while (sweep > 0) sweep -= Math.PI * 2;
    } else {
        while (sweep < 0) sweep += Math.PI * 2;
    }
    const steps = 6;
    const out: Point[] = [];
    for (let i = 1; i < steps; i++) {
        const a = a0 + (sweep * i) / steps;
        out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
    return out;
}

/** Closed, smoothed path through outline points (quadratic curves via midpoints). */
export function outlineToSvgPath(outline: Point[], precision = 2): string {
    if (outline.length < 3) return '';
    const r = (n: number) => +n.toFixed(precision);
    const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const start = mid(outline[outline.length - 1], outline[0]);
    let d = `M${r(start.x)} ${r(start.y)}`;
    for (let i = 0; i < outline.length; i++) {
        const p = outline[i];
        const m = mid(p, outline[(i + 1) % outline.length]);
        d += `Q${r(p.x)} ${r(p.y)} ${r(m.x)} ${r(m.y)}`;
    }
    return `${d}Z`;
}

export function traceOutline(ctx: CanvasRenderingContext2D, outline: Point[]): void {
    if (outline.length < 3) return;
    const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const start = mid(outline[outline.length - 1], outline[0]);
    ctx.moveTo(start.x, start.y);
    for (let i = 0; i < outline.length; i++) {
        const p = outline[i];
        const m = mid(p, outline[(i + 1) % outline.length]);
        ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
    }
    ctx.closePath();
}
