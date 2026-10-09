import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT } from '../src/whiteboard/constants';
import { historyReducer, initHistory } from '../src/whiteboard/history';
import type { Shape } from '../src/whiteboard/types';

const shape = (id: string): Shape => ({ id, type: 'line', x1: 0, y1: 0, x2: 1, y2: 1, color: 'ink', strokeWidth: 1, strokeStyle: 'solid' });

describe('historyReducer', () => {
    it('undoes and redoes commits', () => {
        let s = initHistory();
        s = historyReducer(s, { type: 'commit', shapes: [shape('a')] });
        s = historyReducer(s, { type: 'commit', shapes: [shape('a'), shape('b')] });
        s = historyReducer(s, { type: 'undo' });
        expect(s.present.map((x) => x.id)).toEqual(['a']);
        s = historyReducer(s, { type: 'undo' });
        expect(s.present).toEqual([]);
        s = historyReducer(s, { type: 'redo' });
        s = historyReducer(s, { type: 'redo' });
        expect(s.present.map((x) => x.id)).toEqual(['a', 'b']);
    });

    it('drops the redo stack on a new commit', () => {
        let s = historyReducer(initHistory(), { type: 'commit', shapes: [shape('a')] });
        s = historyReducer(s, { type: 'undo' });
        s = historyReducer(s, { type: 'commit', shapes: [shape('c')] });
        expect(s.future).toEqual([]);
        expect(historyReducer(s, { type: 'redo' })).toBe(s);
    });

    it('is a no-op at the ends of history', () => {
        const s = initHistory([shape('a')]);
        expect(historyReducer(s, { type: 'undo' })).toBe(s);
        expect(historyReducer(s, { type: 'redo' })).toBe(s);
    });

    it('caps the number of undo steps', () => {
        let s = initHistory();
        for (let i = 0; i < HISTORY_LIMIT + 20; i++) s = historyReducer(s, { type: 'commit', shapes: [shape(String(i))] });
        expect(s.past).toHaveLength(HISTORY_LIMIT);
    });

    it('reset clears history', () => {
        let s = historyReducer(initHistory(), { type: 'commit', shapes: [shape('a')] });
        s = historyReducer(s, { type: 'reset', shapes: [shape('z')] });
        expect(s.past).toEqual([]);
        expect(s.present[0].id).toBe('z');
    });
});
