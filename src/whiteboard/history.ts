import { HISTORY_LIMIT } from './constants';
import type { Shape } from './types';

export type HistoryState = {
    past: Shape[][];
    present: Shape[];
    future: Shape[][];
};

export type HistoryAction =
    /** Record a new state. Pass an updater to build on the latest state (safe for rapid successive commits). */
    | { type: 'commit'; shapes: Shape[] | ((prev: Shape[]) => Shape[]) }
    | { type: 'undo' }
    | { type: 'redo' }
    /** Replace the document without recording an undo step (e.g. initial load). */
    | { type: 'reset'; shapes: Shape[] };

export const initHistory = (shapes: Shape[] = []): HistoryState => ({ past: [], present: shapes, future: [] });

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case 'commit': {
            const next = typeof action.shapes === 'function' ? action.shapes(state.present) : action.shapes;
            if (next === state.present) return state;
            return {
                past: [...state.past, state.present].slice(-HISTORY_LIMIT),
                present: next,
                future: [],
            };
        }
        case 'undo': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
        }
        case 'redo': {
            if (state.future.length === 0) return state;
            const [next, ...rest] = state.future;
            return { past: [...state.past, state.present], present: next, future: rest };
        }
        case 'reset':
            return initHistory(action.shapes);
    }
}
