import { STORAGE_VERSION } from './constants';
import { deserialize, serialize } from './export';
import type { Camera, Locale, Shape, StyleState, Theme } from './types';

export type PersistedAppState = {
    camera?: Camera;
    style?: StyleState;
    theme?: Theme;
    grid?: boolean;
    locale?: Locale;
};

export type PersistedState = { shapes: Shape[]; app: PersistedAppState };

/** localStorage can throw (private mode, quota, sandboxed iframes) — never let that break drawing. */
export function loadState(key: string): PersistedState | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { v?: number; doc?: string; app?: PersistedAppState };
        if (parsed.v !== STORAGE_VERSION || typeof parsed.doc !== 'string') return null;
        return { shapes: deserialize(parsed.doc), app: parsed.app ?? {} };
    } catch {
        return null;
    }
}

export function saveState(key: string, shapes: Shape[], app: PersistedAppState): boolean {
    try {
        localStorage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, doc: serialize(shapes), app }));
        return true;
    } catch {
        return false;
    }
}
