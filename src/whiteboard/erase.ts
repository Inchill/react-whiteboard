/**
 * Partial ("rub out") erasing.
 *
 * Freehand strokes are cut where the eraser circle passes, leaving the remaining pieces
 * as separate strokes. Other shapes cannot be cut meaningfully, so touching them removes
 * them whole, as the whole-stroke eraser does.
 */
import { boundsIntersect, getBounds, hitTest } from './geometry';
import { createId } from './shapes';
import type { FreehandShape, Point, Shape, StrokePoint } from './types';

const isFreehand = (s: Shape): s is FreehandShape => s.type === 'pen' || s.type === 'highlighter';

/** Where the segment a→b first crosses the circle (c, r), as t in [0, 1]; null if it doesn't. */
function crossing(a: StrokePoint, b: StrokePoint, c: Point, r: number): number | null {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const fx = a[0] - c.x;
    const fy = a[1] - c.y;
    const A = dx * dx + dy * dy;
    if (A === 0) return null;
    const B = 2 * (fx * dx + fy * dy);
    const C = fx * fx + fy * fy - r * r;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-B - sq) / (2 * A);
    const t2 = (-B + sq) / (2 * A);
    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return null;
}

function lerpPoint(a: StrokePoint, b: StrokePoint, t: number): StrokePoint {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    if (a.length === 3 && b.length === 3) return [x, y, a[2] + (b[2] - a[2]) * t];
    return [x, y];
}

/**
 * Cut a freehand stroke with an eraser circle.
 * Returns the original shape if untouched, otherwise the surviving pieces (possibly none).
 */
export function cutStroke(shape: FreehandShape, center: Point, radius: number): FreehandShape[] | null {
    // Erase where the eraser overlaps the painted stroke, not just its centre line.
    const r = radius + shape.strokeWidth / 2;
    const inside = (p: StrokePoint) => Math.hypot(p[0] - center.x, p[1] - center.y) < r;
    const pts = shape.points;

    if (!pts.some(inside)) {
        // Segments can still pass through the circle between two outside points.
        let crosses = false;
        for (let i = 0; i < pts.length - 1 && !crosses; i++) crosses = crossing(pts[i], pts[i + 1], center, r) !== null;
        if (!crosses) return null;
    }

    const pieces: StrokePoint[][] = [];
    let current: StrokePoint[] = [];
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const pIn = inside(p);
        if (!pIn) current.push(p);
        const next = pts[i + 1];
        if (!next) break;
        const nIn = inside(next);
        if (!pIn && nIn) {
            // Leaving the visible part: end the piece at the circle edge.
            const t = crossing(p, next, center, r);
            if (t !== null) current.push(lerpPoint(p, next, t));
            pieces.push(current);
            current = [];
        } else if (pIn && !nIn) {
            // Re-entering: start a new piece at the circle edge.
            const t = crossing(next, p, center, r);
            if (t !== null) current.push(lerpPoint(next, p, t));
        } else if (!pIn && !nIn) {
            // Both outside, but the segment may cut through the circle.
            const t1 = crossing(p, next, center, r);
            const t2 = crossing(next, p, center, r);
            if (t1 !== null && t2 !== null && t1 < 1 - t2) {
                current.push(lerpPoint(p, next, t1));
                pieces.push(current);
                current = [lerpPoint(next, p, t2)];
            }
        }
    }
    pieces.push(current);

    const kept = pieces.filter((piece) => piece.length >= 2);
    return kept.map((points, i) => ({ ...shape, id: i === 0 ? shape.id : createId(), points }));
}

/**
 * Apply one eraser dab at `center` (world units) to the document.
 * Returns the same array when nothing changed.
 */
export function eraseAt(shapes: Shape[], center: Point, radius: number, tolerance: number): Shape[] {
    const box = { minX: center.x - radius, minY: center.y - radius, maxX: center.x + radius, maxY: center.y + radius };
    let changed = false;
    const out: Shape[] = [];
    for (const s of shapes) {
        if (!boundsIntersect(getBounds(s), box)) {
            out.push(s);
            continue;
        }
        if (isFreehand(s)) {
            const pieces = cutStroke(s, center, radius);
            if (pieces === null) out.push(s);
            else {
                changed = true;
                out.push(...pieces);
            }
        } else if (hitTest(s, center, radius + tolerance)) {
            changed = true;
        } else {
            out.push(s);
        }
    }
    return changed ? out : shapes;
}
