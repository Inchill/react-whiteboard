import { FONT_FAMILY, LINE_HEIGHT } from './constants';
import { maxPressureRadius } from './stroke';
import type { Bounds, BoxShape, Camera, Point, Shape, StrokePoint } from './types';

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Shortest distance from point p to segment ab. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return distance(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function screenToWorld(p: Point, camera: Camera): Point {
    return { x: (p.x - camera.x) / camera.zoom, y: (p.y - camera.y) / camera.zoom };
}

export function worldToScreen(p: Point, camera: Camera): Point {
    return { x: p.x * camera.zoom + camera.x, y: p.y * camera.zoom + camera.y };
}

/** Zoom the camera to `zoom`, keeping the screen point `anchor` fixed. */
export function zoomAt(camera: Camera, zoom: number, anchor: Point): Camera {
    const k = zoom / camera.zoom;
    return {
        zoom,
        x: anchor.x - (anchor.x - camera.x) * k,
        y: anchor.y - (anchor.y - camera.y) * k,
    };
}

export function normalizeBox<T extends { x: number; y: number; w: number; h: number }>(box: T): T {
    return {
        ...box,
        x: box.w < 0 ? box.x + box.w : box.x,
        y: box.h < 0 ? box.y + box.h : box.y,
        w: Math.abs(box.w),
        h: Math.abs(box.h),
    };
}

export function trianglePoints(s: Pick<BoxShape, 'x' | 'y' | 'w' | 'h'>): Point[] {
    return [
        { x: s.x + s.w / 2, y: s.y },
        { x: s.x + s.w, y: s.y + s.h },
        { x: s.x, y: s.y + s.h },
    ];
}

/** Two points forming the arrow head wings for a segment ending at (x2, y2). */
export function arrowHead(x1: number, y1: number, x2: number, y2: number, strokeWidth: number): [Point, Point] {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.min(Math.max(12, strokeWidth * 3.5), Math.hypot(x2 - x1, y2 - y1) * 0.6 || 12);
    const spread = Math.PI / 7;
    return [
        { x: x2 - len * Math.cos(angle - spread), y: y2 - len * Math.sin(angle - spread) },
        { x: x2 - len * Math.cos(angle + spread), y: y2 - len * Math.sin(angle + spread) },
    ];
}

/** Snap the vector start→end to 15° increments (used with Shift). */
export function snapAngle(start: Point, end: Point): Point {
    const step = Math.PI / 12;
    const angle = Math.round(Math.atan2(end.y - start.y, end.x - start.x) / step) * step;
    const len = distance(start, end);
    return { x: start.x + Math.cos(angle) * len, y: start.y + Math.sin(angle) * len };
}

export type PathCommand =
    | { type: 'M'; x: number; y: number }
    | { type: 'L'; x: number; y: number }
    | { type: 'Q'; cx: number; cy: number; x: number; y: number };

/** Smooth a polyline with quadratic curves through segment midpoints. */
export function smoothPath(points: StrokePoint[]): PathCommand[] {
    if (points.length === 0) return [];
    const [first] = points;
    const cmds: PathCommand[] = [{ type: 'M', x: first[0], y: first[1] }];
    if (points.length === 1) {
        // A dot: tiny segment so round caps render a circle.
        cmds.push({ type: 'L', x: first[0] + 0.01, y: first[1] });
        return cmds;
    }
    if (points.length === 2) {
        cmds.push({ type: 'L', x: points[1][0], y: points[1][1] });
        return cmds;
    }
    for (let i = 1; i < points.length - 1; i++) {
        const [cx, cy] = points[i];
        const [nx, ny] = points[i + 1];
        cmds.push({ type: 'Q', cx, cy, x: (cx + nx) / 2, y: (cy + ny) / 2 });
    }
    const last = points[points.length - 1];
    cmds.push({ type: 'L', x: last[0], y: last[1] });
    return cmds;
}

export function pathToSvgD(cmds: PathCommand[], precision = 2): string {
    const r = (n: number) => +n.toFixed(precision);
    return cmds
        .map((c) => (c.type === 'Q' ? `Q${r(c.cx)} ${r(c.cy)} ${r(c.x)} ${r(c.y)}` : `${c.type}${r(c.x)} ${r(c.y)}`))
        .join('');
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Measure multi-line text in world units. Falls back to an estimate when canvas is unavailable. */
export function measureText(text: string, fontSize: number): { w: number; h: number } {
    const lines = text.split('\n');
    if (measureCtx === undefined) {
        try {
            measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
        } catch {
            measureCtx = null;
        }
    }
    let w = 0;
    if (measureCtx) {
        measureCtx.font = `${fontSize}px ${FONT_FAMILY}`;
        for (const line of lines) w = Math.max(w, measureCtx.measureText(line).width);
    } else {
        for (const line of lines) w = Math.max(w, line.length * fontSize * 0.6);
    }
    return { w: Math.max(w, fontSize * 0.5), h: lines.length * fontSize * LINE_HEIGHT };
}

export function getBounds(shape: Shape): Bounds {
    const pad = shape.type === 'text' ? 0 : shape.type === 'pen' && shape.pressure ? maxPressureRadius(shape.strokeWidth) : shape.strokeWidth / 2;
    switch (shape.type) {
        case 'pen':
        case 'highlighter': {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const [x, y] of shape.points) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
            return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
        }
        case 'line':
        case 'arrow':
            return {
                minX: Math.min(shape.x1, shape.x2) - pad,
                minY: Math.min(shape.y1, shape.y2) - pad,
                maxX: Math.max(shape.x1, shape.x2) + pad,
                maxY: Math.max(shape.y1, shape.y2) + pad,
            };
        default:
            return {
                minX: Math.min(shape.x, shape.x + shape.w) - pad,
                minY: Math.min(shape.y, shape.y + shape.h) - pad,
                maxX: Math.max(shape.x, shape.x + shape.w) + pad,
                maxY: Math.max(shape.y, shape.y + shape.h) + pad,
            };
    }
}

export function unionBounds(list: Bounds[]): Bounds | null {
    if (list.length === 0) return null;
    return list.reduce((a, b) => ({
        minX: Math.min(a.minX, b.minX),
        minY: Math.min(a.minY, b.minY),
        maxX: Math.max(a.maxX, b.maxX),
        maxY: Math.max(a.maxY, b.maxY),
    }));
}

export function shapesBounds(shapes: Shape[]): Bounds | null {
    return unionBounds(shapes.map(getBounds));
}

export const boundsIntersect = (a: Bounds, b: Bounds) =>
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;

export const boundsContain = (outer: Bounds, inner: Bounds) =>
    inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;

export const boundsFromPoints = (a: Point, b: Point): Bounds => ({
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
});

function pointInTriangle(p: Point, [a, b, c]: Point[]): boolean {
    const sign = (p1: Point, p2: Point, p3: Point) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

function nearPolygon(p: Point, pts: Point[], tol: number): boolean {
    for (let i = 0; i < pts.length; i++) {
        if (distanceToSegment(p, pts[i], pts[(i + 1) % pts.length]) <= tol) return true;
    }
    return false;
}

/** Whether world point `p` touches `shape`, with `tolerance` in world units. */
export function hitTest(shape: Shape, p: Point, tolerance: number): boolean {
    const tol = tolerance + (shape.type === 'text' ? 0 : shape.strokeWidth / 2);
    const b = getBounds(shape);
    if (p.x < b.minX - tol || p.x > b.maxX + tol || p.y < b.minY - tol || p.y > b.maxY + tol) return false;

    switch (shape.type) {
        case 'pen':
        case 'highlighter': {
            const pts = shape.points;
            if (pts.length === 1) return distance(p, { x: pts[0][0], y: pts[0][1] }) <= tol;
            for (let i = 0; i < pts.length - 1; i++) {
                const a = { x: pts[i][0], y: pts[i][1] };
                const c = { x: pts[i + 1][0], y: pts[i + 1][1] };
                if (distanceToSegment(p, a, c) <= tol) return true;
            }
            return false;
        }
        case 'line':
        case 'arrow':
            return distanceToSegment(p, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) <= tol;
        case 'rect': {
            const inside = p.x >= shape.x && p.x <= shape.x + shape.w && p.y >= shape.y && p.y <= shape.y + shape.h;
            if (shape.fill !== 'none' && inside) return true;
            const corners = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.w, y: shape.y },
                { x: shape.x + shape.w, y: shape.y + shape.h },
                { x: shape.x, y: shape.y + shape.h },
            ];
            return nearPolygon(p, corners, tol);
        }
        case 'ellipse': {
            const rx = shape.w / 2;
            const ry = shape.h / 2;
            const cx = shape.x + rx;
            const cy = shape.y + ry;
            if (rx < 1 || ry < 1) return distance(p, { x: cx, y: cy }) <= tol + Math.max(rx, ry);
            const d = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
            if (shape.fill !== 'none' && d <= 1) return true;
            return Math.abs(d - 1) * Math.min(rx, ry) <= tol;
        }
        case 'triangle': {
            const pts = trianglePoints(shape);
            if (shape.fill !== 'none' && pointInTriangle(p, pts)) return true;
            return nearPolygon(p, pts, tol);
        }
        case 'text':
            return p.x >= shape.x - tol && p.x <= shape.x + shape.w + tol && p.y >= shape.y - tol && p.y <= shape.y + shape.h + tol;
    }
}

/** Topmost shape under the point, if any. */
export function shapeAt(shapes: Shape[], p: Point, tolerance: number): Shape | undefined {
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], p, tolerance)) return shapes[i];
    }
    return undefined;
}

export function translateShape<T extends Shape>(shape: T, dx: number, dy: number): T {
    switch (shape.type) {
        case 'pen':
        case 'highlighter':
            return { ...shape, points: shape.points.map((pt) => (pt.length === 3 ? [pt[0] + dx, pt[1] + dy, pt[2]] : [pt[0] + dx, pt[1] + dy])) };
        case 'line':
        case 'arrow':
            return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
        default:
            return { ...shape, x: shape.x + dx, y: shape.y + dy };
    }
}

export type Insets = { top: number; right: number; bottom: number; left: number };

/** Camera that fits `bounds` into a viewport of `width`×`height`, leaving `padding` (number or per-side insets). */
export function fitCamera(bounds: Bounds, width: number, height: number, padding: number | Insets = 64, maxZoom = 1): Camera {
    const p = typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding;
    const availW = Math.max(width - p.left - p.right, 40);
    const availH = Math.max(height - p.top - p.bottom, 40);
    const bw = Math.max(bounds.maxX - bounds.minX, 1);
    const bh = Math.max(bounds.maxY - bounds.minY, 1);
    const zoom = Math.max(0.1, Math.min(maxZoom, availW / bw, availH / bh));
    return {
        zoom,
        x: p.left + availW / 2 - (bounds.minX + bw / 2) * zoom,
        y: p.top + availH / 2 - (bounds.minY + bh / 2) * zoom,
    };
}
