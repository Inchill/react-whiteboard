import { describe, expect, it } from 'vitest';
import { maxPressureRadius, outlineToSvgPath, pressureDiameter, samplePressure, strokeOutline } from '../src/whiteboard/stroke';
import type { StrokePoint } from '../src/whiteboard/types';

/** Outline half-width around the point closest to x on a horizontal stroke. */
function widthAt(points: StrokePoint[], size: number, x: number) {
    const outline = strokeOutline(points, size);
    const near = outline.filter((p) => Math.abs(p.x - x) < 4);
    return Math.max(...near.map((p) => p.y)) - Math.min(...near.map((p) => p.y));
}

describe('strokeOutline', () => {
    it('draws a dot for a single point', () => {
        const outline = strokeOutline([[10, 10, 0.5]], 8);
        expect(outline.length).toBeGreaterThan(8);
        for (const p of outline) expect(Math.hypot(p.x - 10, p.y - 10)).toBeCloseTo(4, 5);
    });

    it('gets wider where pressure is higher', () => {
        const light: StrokePoint[] = Array.from({ length: 41 }, (_, i) => [i * 5, 0, 0.1]);
        const heavy: StrokePoint[] = Array.from({ length: 41 }, (_, i) => [i * 5, 0, 1]);
        expect(widthAt(heavy, 8, 100)).toBeGreaterThan(widthAt(light, 8, 100) * 2);
        expect(widthAt(heavy, 8, 100)).toBeLessThanOrEqual(maxPressureRadius(8) * 2 + 0.01);
    });

    it('tapers both ends, but not the end of a stroke still being drawn', () => {
        const pts: StrokePoint[] = Array.from({ length: 41 }, (_, i) => [i * 5, 0, 0.5]);
        const middle = widthAt(pts, 8, 100);
        expect(widthAt(pts, 8, 0)).toBeLessThan(middle / 2);
        const open = strokeOutline(pts, 8, false);
        const tip = open.filter((p) => p.x > 198);
        expect(Math.max(...tip.map((p) => Math.abs(p.y)))).toBeCloseTo(pressureDiameter(8, 0.5) / 2, 0);
    });

    it('serialises to a closed SVG path', () => {
        const d = outlineToSvgPath(strokeOutline([[0, 0, 0.5], [50, 0, 0.5], [100, 20, 0.5]], 6));
        expect(d.startsWith('M')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
    });
});

describe('samplePressure', () => {
    it('uses stylus pressure, smoothed', () => {
        expect(samplePressure({ pointerType: 'pen', pressure: 0.8, prev: undefined, distance: 0, dt: 16 })).toBe(0.8);
        const next = samplePressure({ pointerType: 'pen', pressure: 0.2, prev: 0.8, distance: 5, dt: 16 });
        expect(next).toBeGreaterThan(0.2);
        expect(next).toBeLessThan(0.8);
    });

    it('makes fast mouse strokes thinner than slow ones', () => {
        const slow = samplePressure({ pointerType: 'mouse', pressure: 0.5, prev: undefined, distance: 2, dt: 16 });
        const fast = samplePressure({ pointerType: 'mouse', pressure: 0.5, prev: undefined, distance: 80, dt: 16 });
        expect(fast).toBeLessThan(slow);
        expect(fast).toBeGreaterThanOrEqual(0.05);
    });
});
