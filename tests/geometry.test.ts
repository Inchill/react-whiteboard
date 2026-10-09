import { describe, expect, it } from 'vitest';
import {
    distanceToSegment,
    fitCamera,
    getBounds,
    hitTest,
    screenToWorld,
    shapeAt,
    smoothPath,
    snapAngle,
    translateShape,
    worldToScreen,
    zoomAt,
} from '../src/whiteboard/geometry';
import type { BoxShape, FreehandShape, LinearShape, Shape, TextShape } from '../src/whiteboard/types';

const base = { color: 'ink', strokeWidth: 2, strokeStyle: 'solid' as const };
const rect = (fill: BoxShape['fill'] = 'none'): BoxShape => ({ ...base, id: 'r', type: 'rect', x: 0, y: 0, w: 100, h: 50, fill });
const line: LinearShape = { ...base, id: 'l', type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 };
const pen: FreehandShape = { ...base, id: 'p', type: 'pen', points: [[0, 0], [10, 10], [20, 0]] };

describe('distanceToSegment', () => {
    it('measures to the nearest point on the segment', () => {
        expect(distanceToSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(10);
        expect(distanceToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(5);
    });
    it('handles zero-length segments', () => {
        expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
    });
});

describe('camera transforms', () => {
    it('round-trips between screen and world', () => {
        const cam = { x: 40, y: -20, zoom: 2 };
        const p = { x: 13, y: 7 };
        expect(screenToWorld(worldToScreen(p, cam), cam)).toEqual(p);
    });
    it('keeps the anchor fixed when zooming', () => {
        const cam = { x: 10, y: 10, zoom: 1 };
        const anchor = { x: 200, y: 150 };
        const before = screenToWorld(anchor, cam);
        const after = screenToWorld(anchor, zoomAt(cam, 3, anchor));
        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });
    it('fits bounds inside the viewport with insets', () => {
        const cam = fitCamera({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 400, 300, { top: 50, right: 50, bottom: 50, left: 150 }, 10);
        expect(cam.zoom).toBe(2);
        expect(worldToScreen({ x: 0, y: 0 }, cam)).toEqual({ x: 150, y: 50 });
    });
});

describe('hitTest', () => {
    it('hits the outline of an unfilled rectangle but not its middle', () => {
        expect(hitTest(rect(), { x: 50, y: 1 }, 3)).toBe(true);
        expect(hitTest(rect(), { x: 50, y: 25 }, 3)).toBe(false);
    });
    it('hits anywhere inside a filled rectangle', () => {
        expect(hitTest(rect('solid'), { x: 50, y: 25 }, 3)).toBe(true);
    });
    it('hits lines within tolerance plus half stroke width', () => {
        expect(hitTest(line, { x: 50, y: 3.9 }, 3)).toBe(true);
        expect(hitTest(line, { x: 50, y: 6 }, 3)).toBe(false);
    });
    it('hits freehand strokes along their segments', () => {
        expect(hitTest(pen, { x: 5, y: 5 }, 2)).toBe(true);
        expect(hitTest(pen, { x: 10, y: 0 }, 2)).toBe(false);
    });
    it('hits ellipses on the outline', () => {
        const e: Shape = { ...rect(), id: 'e', type: 'ellipse' };
        expect(hitTest(e, { x: 50, y: 0 }, 3)).toBe(true);
        expect(hitTest(e, { x: 50, y: 25 }, 3)).toBe(false);
    });
    it('hits the inside of a text box', () => {
        const t: TextShape = { ...base, id: 't', type: 'text', x: 0, y: 0, w: 80, h: 30, text: 'hi', fontSize: 24 };
        expect(hitTest(t, { x: 40, y: 15 }, 0)).toBe(true);
    });
    it('shapeAt returns the topmost shape', () => {
        const a = rect('solid');
        const b = { ...rect('solid'), id: 'top' };
        expect(shapeAt([a, b], { x: 10, y: 10 }, 2)?.id).toBe('top');
    });
});

describe('shape helpers', () => {
    it('computes bounds including stroke width', () => {
        expect(getBounds(rect())).toEqual({ minX: -1, minY: -1, maxX: 101, maxY: 51 });
        expect(getBounds({ ...rect(), w: -100 })).toEqual({ minX: -101, minY: -1, maxX: 1, maxY: 51 });
    });
    it('translates every shape type', () => {
        expect(translateShape(line, 5, 5)).toMatchObject({ x1: 5, y1: 5, x2: 105, y2: 5 });
        expect(translateShape(pen, 1, 2).points[0]).toEqual([1, 2]);
        expect(translateShape(rect(), -10, 0)).toMatchObject({ x: -10, y: 0 });
    });
    it('snaps angles to 15° steps', () => {
        const end = snapAngle({ x: 0, y: 0 }, { x: 100, y: 3 });
        expect(end.y).toBeCloseTo(0);
        expect(end.x).toBeCloseTo(100.04, 1);
    });
    it('smooths a polyline into quadratic curves', () => {
        const cmds = smoothPath([[0, 0], [10, 10], [20, 0], [30, 10]]);
        expect(cmds.map((c) => c.type)).toEqual(['M', 'Q', 'Q', 'L']);
        expect(smoothPath([[5, 5]])).toHaveLength(2);
    });
});
