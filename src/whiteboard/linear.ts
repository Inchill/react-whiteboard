/**
 * Lines and arrows that bend.
 *
 * A linear shape runs from (x1, y1) to (x2, y2), optionally through `via` points. Without `curved`
 * it is drawn as straight segments (an elbow connector when the points turn at right angles);
 * with `curved` a smooth curve passes through every point. Everything that needs the line's
 * geometry (bounds, hit testing, rendering, export) goes through this module, so a plain
 * two-point line behaves exactly as before.
 */
import type { LinearShape, LineRoute, Point } from './types';

/** Shortest distance from p to segment ab. (geometry.ts has the same; kept here to avoid an import cycle.) */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export type CubicSegment = { c1: Point; c2: Point; to: Point };

/** The points the line passes through: start, via points, end. */
export function linePoints(shape: LinearShape): Point[] {
  const via = (shape.via ?? []).map(([x, y]) => ({ x, y }));
  return [{ x: shape.x1, y: shape.y1 }, ...via, { x: shape.x2, y: shape.y2 }];
}

export const routeOf = (shape: LinearShape): LineRoute =>
  shape.curved && shape.via?.length ? 'curve' : shape.via?.length ? 'elbow' : 'straight';

/**
 * Cubic Bézier segments for a smooth curve through `pts`. Centripetal Catmull-Rom: it passes
 * through every point and, unlike the uniform kind, never loops or overshoots between points
 * that are unevenly spaced.
 */
export function curveSegments(pts: Point[]): CubicSegment[] {
  const n = pts.length;
  if (n < 2) return [];
  // Open ends: mirror the neighbour, so the curve leaves the first point heading for the second.
  const at = (i: number): Point =>
    i < 0
      ? { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }
      : i >= n
        ? { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y }
        : pts[i];
  const out: CubicSegment[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = at(i + 2);
    const t1 = Math.sqrt(Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const t2 = Math.sqrt(Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const t3 = Math.sqrt(Math.hypot(p3.x - p2.x, p3.y - p2.y));
    if (t2 < 1e-9) {
      out.push({ c1: p1, c2: p2, to: p2 });
      continue;
    }
    const c = (a: number, b: number, prev: number, ta: number) =>
      (ta * ta * b - t2 * t2 * prev + (2 * ta * ta + 3 * ta * t2 + t2 * t2) * a) / (3 * ta * (ta + t2));
    const c1 = t1 < 1e-9 ? p1 : { x: c(p1.x, p2.x, p0.x, t1), y: c(p1.y, p2.y, p0.y, t1) };
    const c2 = t3 < 1e-9 ? p2 : { x: c(p2.x, p1.x, p3.x, t3), y: c(p2.y, p1.y, p3.y, t3) };
    out.push({ c1, c2, to: p2 });
  }
  return out;
}

const SAMPLES_PER_SEGMENT = 16;

/** The line as a polyline: its points, or a fine sampling of the curve. Used for bounds and hit testing. */
export function linePolyline(shape: LinearShape): Point[] {
  const pts = linePoints(shape);
  if (!shape.curved || pts.length < 3) return pts;
  const out: Point[] = [pts[0]];
  let from = pts[0];
  for (const s of curveSegments(pts)) {
    for (let k = 1; k <= SAMPLES_PER_SEGMENT; k++) {
      const t = k / SAMPLES_PER_SEGMENT;
      const u = 1 - t;
      out.push({
        x: u * u * u * from.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.to.x,
        y: u * u * u * from.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.to.y,
      });
    }
    from = s.to;
  }
  return out;
}

export function distanceToLine(p: Point, shape: LinearShape): number {
  const pts = linePolyline(shape);
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distanceToSegment(p, pts[i], pts[i + 1]));
  return best;
}

/** The direction the line arrives at its end, as a point behind the end; used to aim the arrow head. */
export function arrivalFrom(shape: LinearShape): Point {
  const end = { x: shape.x2, y: shape.y2 };
  const pts = linePoints(shape);
  if (shape.curved && pts.length > 2) {
    const last = curveSegments(pts).at(-1)!;
    if (Math.hypot(last.c2.x - end.x, last.c2.y - end.y) > 1e-6) return last.c2;
  }
  // The last point that is not on top of the end.
  for (let i = pts.length - 2; i >= 0; i--) {
    if (Math.hypot(pts[i].x - end.x, pts[i].y - end.y) > 1e-6) return pts[i];
  }
  return pts[0];
}

/**
 * Via points for a right-angled connector from `a` to `b`: across, then along, then across,
 * turning halfway along whichever direction the line mostly travels. None when already straight.
 */
export function elbowVia(a: Point, b: Point): [number, number][] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) return [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = a.x + dx / 2;
    return [
      [mx, a.y],
      [mx, b.y],
    ];
  }
  const my = a.y + dy / 2;
  return [
    [a.x, my],
    [b.x, my],
  ];
}

/** Ramer–Douglas–Peucker: the fewest points that keep the polyline within `tolerance`. */
export function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let worst = -1;
    let worstD = tolerance;
    for (let i = from + 1; i < to; i++) {
      const d = distanceToSegment(points[i], points[from], points[to]);
      if (d > worstD) {
        worst = i;
        worstD = d;
      }
    }
    if (worst > 0) {
      keep[worst] = true;
      stack.push([from, worst], [worst, to]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Change how an existing line is routed, keeping its end points. */
export function withRoute(shape: LinearShape, route: LineRoute): LinearShape {
  const plain: LinearShape = { ...shape };
  delete plain.via;
  delete plain.curved;
  const a = { x: shape.x1, y: shape.y1 };
  const b = { x: shape.x2, y: shape.y2 };
  switch (route) {
    case 'straight':
      return plain;
    case 'elbow': {
      const via = elbowVia(a, b);
      return via.length ? { ...plain, via } : plain;
    }
    case 'curve': {
      if (shape.via?.length) return { ...plain, via: shape.via, curved: true };
      // A straight line becomes a gentle arc through a point beside its middle.
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) return plain;
      const bulge = len * 0.2;
      const mid: [number, number] = [(a.x + b.x) / 2 - ((b.y - a.y) / len) * bulge, (a.y + b.y) / 2 + ((b.x - a.x) / len) * bulge];
      return { ...plain, via: [mid], curved: true };
    }
  }
}
