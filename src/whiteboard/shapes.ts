import { distance, normalizeBox, snapAngle } from './geometry';
import { DEFAULT_PRESSURE } from './stroke';
import type { Point, Shape, StrokePoint, StyleState, Tool } from './types';

let counter = 0;
export function createId(): string {
    counter = (counter + 1) % 1e6;
    return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export type DrawableTool = Extract<Tool, 'pen' | 'highlighter' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'triangle'>;

export const isDrawableTool = (tool: Tool): tool is DrawableTool =>
    ['pen', 'highlighter', 'line', 'arrow', 'rect', 'ellipse', 'triangle'].includes(tool);

/** Create the initial shape when a drag starts with a drawing tool. */
export function createShape(tool: DrawableTool, p: Point, style: StyleState, pressure?: number): Shape {
    const base = {
        id: createId(),
        color: style.color,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
    };
    switch (tool) {
        case 'pen':
            return style.pressure
                ? { ...base, type: 'pen', strokeStyle: 'solid', pressure: true, points: [[p.x, p.y, pressure ?? DEFAULT_PRESSURE]] }
                : { ...base, type: 'pen', points: [[p.x, p.y]] };
        case 'highlighter':
            // Highlighters are always solid and wider than the pen.
            return { ...base, type: 'highlighter', strokeStyle: 'solid', strokeWidth: Math.max(12, style.strokeWidth * 3), points: [[p.x, p.y]] };
        case 'line':
        case 'arrow':
            return { ...base, type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        default:
            return { ...base, type: tool, x: p.x, y: p.y, w: 0, h: 0, fill: style.fill };
    }
}

/**
 * Update an in-progress shape from the drag start/current point.
 * `constrain` (Shift) snaps lines to 15° and boxes to equal sides.
 */
export function updateDraft(shape: Shape, start: Point, current: Point, constrain: boolean, zoom = 1, pressure?: number): Shape {
    switch (shape.type) {
        case 'pen':
        case 'highlighter': {
            const last = shape.points[shape.points.length - 1];
            // Skip sub-pixel moves to keep point arrays small.
            if (distance({ x: last[0], y: last[1] }, current) < 1.5 / zoom) return shape;
            const next: StrokePoint = shape.type === 'pen' && shape.pressure ? [current.x, current.y, pressure ?? DEFAULT_PRESSURE] : [current.x, current.y];
            return { ...shape, points: [...shape.points, next] };
        }
        case 'line':
        case 'arrow': {
            const end = constrain ? snapAngle(start, current) : current;
            return { ...shape, x2: end.x, y2: end.y };
        }
        case 'text':
            return shape;
        default: {
            let w = current.x - start.x;
            let h = current.y - start.y;
            if (constrain) {
                const size = Math.max(Math.abs(w), Math.abs(h));
                w = Math.sign(w || 1) * size;
                h = Math.sign(h || 1) * size;
            }
            return { ...shape, x: start.x, y: start.y, w, h };
        }
    }
}

/** Normalize a finished shape; returns null if it is too small to keep. */
export function finalizeShape(shape: Shape): Shape | null {
    switch (shape.type) {
        case 'pen':
        case 'highlighter':
            return shape;
        case 'line':
        case 'arrow':
            return Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) < 2 ? null : shape;
        case 'text':
            return shape.text.trim() ? shape : null;
        default: {
            const n = normalizeBox(shape);
            return n.w < 2 && n.h < 2 ? null : n;
        }
    }
}

/** Apply a partial style to an existing shape (used when editing a selection). */
export function applyStyle(shape: Shape, patch: Partial<StyleState>): Shape {
    const next = { ...shape } as Shape;
    if (patch.color !== undefined) next.color = patch.color;
    if (patch.strokeStyle !== undefined && shape.type !== 'highlighter' && !(shape.type === 'pen' && shape.pressure)) next.strokeStyle = patch.strokeStyle;
    if (patch.strokeWidth !== undefined && shape.type !== 'text') {
        next.strokeWidth = shape.type === 'highlighter' ? Math.max(12, patch.strokeWidth * 3) : patch.strokeWidth;
    }
    if (patch.fill !== undefined && (next.type === 'rect' || next.type === 'ellipse' || next.type === 'triangle')) {
        next.fill = patch.fill;
    }
    if (patch.fontSize !== undefined && next.type === 'text') {
        const k = patch.fontSize / next.fontSize;
        next.fontSize = patch.fontSize;
        next.w *= k;
        next.h *= k;
    }
    return next;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Round coordinates to 2 decimals to keep saved JSON compact. */
export function compactShape(shape: Shape): Shape {
    switch (shape.type) {
        case 'pen':
        case 'highlighter':
            return { ...shape, points: shape.points.map((pt) => (pt.length === 3 ? [round(pt[0]), round(pt[1]), round(pt[2])] : [round(pt[0]), round(pt[1])])) };
        case 'line':
        case 'arrow':
            return { ...shape, x1: round(shape.x1), y1: round(shape.y1), x2: round(shape.x2), y2: round(shape.y2) };
        default:
            return { ...shape, x: round(shape.x), y: round(shape.y), w: round(shape.w), h: round(shape.h) };
    }
}
