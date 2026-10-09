import { describe, expect, it } from 'vitest';
import { cutStroke, eraseAt } from '../src/whiteboard/erase';
import type { FreehandShape, Shape } from '../src/whiteboard/types';

const line = (id: string, y = 0): FreehandShape => ({
    id,
    type: 'pen',
    color: 'ink',
    strokeWidth: 2,
    strokeStyle: 'solid',
    points: Array.from({ length: 21 }, (_, i) => [i * 10, y] as [number, number]),
});

describe('cutStroke', () => {
    it('returns null when the eraser misses', () => {
        expect(cutStroke(line('a'), { x: 100, y: 50 }, 10)).toBeNull();
    });

    it('splits a stroke into two pieces with clean edges', () => {
        const pieces = cutStroke(line('a'), { x: 100, y: 0 }, 10)!;
        expect(pieces).toHaveLength(2);
        expect(pieces[0].id).toBe('a');
        expect(pieces[1].id).not.toBe('a');
        // Edges sit on the eraser boundary (radius + half the stroke width).
        expect(pieces[0].points.at(-1)![0]).toBeCloseTo(89, 5);
        expect(pieces[1].points[0][0]).toBeCloseTo(111, 5);
    });

    it('cuts a segment that passes through the eraser between two points', () => {
        const sparse: FreehandShape = { ...line('s'), points: [[0, 0], [200, 0]] };
        const pieces = cutStroke(sparse, { x: 100, y: 0 }, 10)!;
        expect(pieces).toHaveLength(2);
    });

    it('keeps pressure values on the cut points', () => {
        const pressured: FreehandShape = { ...line('p'), pressure: true, points: [[0, 0, 0.2], [100, 0, 0.8], [200, 0, 0.2]] };
        const pieces = cutStroke(pressured, { x: 100, y: 0 }, 10)!;
        expect(pieces[0].points.at(-1)).toHaveLength(3);
    });

    it('removes the stroke when the eraser covers all of it', () => {
        const short: FreehandShape = { ...line('t'), points: [[0, 0], [4, 0]] };
        expect(cutStroke(short, { x: 2, y: 0 }, 10)).toEqual([]);
    });
});

describe('eraseAt', () => {
    const rect: Shape = { id: 'r', type: 'rect', x: 300, y: 0, w: 50, h: 50, fill: 'none', color: 'ink', strokeWidth: 2, strokeStyle: 'solid' };

    it('returns the same array when nothing is touched', () => {
        const shapes = [line('a'), rect];
        expect(eraseAt(shapes, { x: 1000, y: 1000 }, 10, 0)).toBe(shapes);
    });

    it('cuts strokes and removes other shapes whole', () => {
        const result = eraseAt([line('a'), rect], { x: 100, y: 0 }, 10, 0);
        expect(result.map((s) => s.type)).toEqual(['pen', 'pen', 'rect']);
        const result2 = eraseAt(result, { x: 300, y: 25 }, 6, 0);
        expect(result2.some((s) => s.id === 'r')).toBe(false);
    });
});
