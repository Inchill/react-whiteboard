import { describe, expect, it } from 'vitest';
import { deserialize, exportToSvg, serialize } from '../src/whiteboard/export';
import { createShape, finalizeShape, updateDraft, applyStyle } from '../src/whiteboard/shapes';
import { DEFAULT_STYLE } from '../src/whiteboard/constants';
import type { Shape } from '../src/whiteboard/types';

const shapes: Shape[] = [
    { id: 'a', type: 'pen', points: [[0.123456, 1], [2, 3]], color: 'ink', strokeWidth: 3, strokeStyle: 'solid' },
    { id: 'b', type: 'rect', x: 0, y: 0, w: 10, h: 10, fill: 'semi', color: '#e03131', strokeWidth: 2, strokeStyle: 'dashed' },
    { id: 'c', type: 'arrow', x1: 0, y1: 0, x2: 50, y2: 50, color: 'ink', strokeWidth: 2, strokeStyle: 'solid' },
    { id: 'd', type: 'text', x: 0, y: 0, w: 40, h: 30, text: '<b> & "q"\nline 2', fontSize: 24, color: 'ink', strokeWidth: 1, strokeStyle: 'solid' },
];

describe('serialize / deserialize', () => {
    it('round-trips shapes and rounds coordinates', () => {
        const back = deserialize(serialize(shapes));
        expect(back).toHaveLength(4);
        expect(back[0]).toMatchObject({ type: 'pen', points: [[0.12, 1], [2, 3]] });
        expect(back[3]).toMatchObject({ text: '<b> & "q"\nline 2' });
    });

    it('drops invalid and duplicate shapes', () => {
        const json = JSON.stringify({
            type: 'react-whiteboard',
            version: 1,
            shapes: [shapes[1], { ...shapes[1] }, { id: 'x', type: 'rect', x: 'oops' }, { id: 'y', type: 'blob' }, null],
        });
        expect(deserialize(json).map((s) => s.id)).toEqual(['b']);
    });

    it('keeps pressure strokes and rejects malformed points', () => {
        const pen = { id: 'p', type: 'pen', pressure: true, points: [[0, 0, 0.3], [5, 5, 0.9]], color: 'ink', strokeWidth: 4, strokeStyle: 'solid' };
        const bad = { ...pen, id: 'q', points: [[0, 0, 0.3, 9]] };
        const json = JSON.stringify({ type: 'react-whiteboard', version: 1, shapes: [pen, bad] });
        const back = deserialize(json);
        expect(back.map((s) => s.id)).toEqual(['p']);
        expect(back[0]).toMatchObject({ pressure: true, points: [[0, 0, 0.3], [5, 5, 0.9]] });
        expect(exportToSvg(back)).toMatch(/<path d="M[^"]+Z" fill="#1e1e1e"\/>/);
    });

    it('rejects files that are not whiteboard data', () => {
        expect(() => deserialize('{"hello":1}')).toThrow();
        expect(() => deserialize('not json')).toThrow();
    });
});

describe('exportToSvg', () => {
    it('produces a standalone SVG with every shape and escaped text', () => {
        const svg = exportToSvg(shapes, { theme: 'light' });
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
        expect(svg).toContain('<path');
        expect(svg).toContain('<rect x="0" y="0" width="10" height="10" fill="#e03131" fill-opacity="0.25"');
        expect(svg).toContain('stroke-dasharray');
        expect(svg).toContain('<polyline');
        expect(svg).toContain('&lt;b&gt; &amp; &quot;q&quot;');
        expect(svg).not.toContain('"ink"');
    });

    it('resolves ink to the theme foreground', () => {
        expect(exportToSvg([shapes[0]], { theme: 'dark' })).toContain('stroke="#e8e8ed"');
        expect(exportToSvg([shapes[0]], { theme: 'light' })).toContain('stroke="#1e1e1e"');
    });
});

describe('shape creation', () => {
    it('constrains rectangles to squares with shift', () => {
        const s = createShape('rect', { x: 0, y: 0 }, DEFAULT_STYLE);
        const d = updateDraft(s, { x: 0, y: 0 }, { x: 30, y: -10 }, true);
        expect(d).toMatchObject({ w: 30, h: -30 });
        expect(finalizeShape(d)).toMatchObject({ x: 0, y: -30, w: 30, h: 30 });
    });

    it('discards accidental clicks', () => {
        const s = createShape('line', { x: 0, y: 0 }, DEFAULT_STYLE);
        expect(finalizeShape(updateDraft(s, { x: 0, y: 0 }, { x: 1, y: 0 }, false))).toBeNull();
    });

    it('applies style patches only where they make sense', () => {
        const styled = applyStyle(shapes[3], { fill: 'solid', fontSize: 48, color: '#2f9e44' });
        expect(styled).toMatchObject({ fontSize: 48, w: 80, h: 60, color: '#2f9e44' });
        expect('fill' in styled).toBe(false);
    });
});
