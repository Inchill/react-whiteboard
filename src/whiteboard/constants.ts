import { INK, type StyleState, type Tool } from './types';

export const PALETTE = [INK, '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#7048e8', '#e64980'];

export const FONT_SIZES = [16, 24, 36, 56];

export const FONT_FAMILY =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export const LINE_HEIGHT = 1.25;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export const HISTORY_LIMIT = 200;

export const DEFAULT_STYLE: StyleState = {
    color: INK,
    strokeWidth: 4,
    strokeStyle: 'solid',
    fill: 'none',
    fontSize: 24,
    pressure: true,
    eraserMode: 'partial',
    eraserSize: 12,
};

export const THEME_COLORS = {
    light: { background: '#ffffff', ink: '#1e1e1e', grid: '#dfe3e8', selection: '#4a7cf7' },
    dark: { background: '#16171d', ink: '#e8e8ed', grid: '#2c2e38', selection: '#7c9cff' },
} as const;

export type ToolDef = {
    id: Tool;
    key: string;
    num?: string;
    /** Toolbar group; a divider is drawn between groups. */
    group: 'navigate' | 'draw' | 'shape' | 'text';
};

export const TOOLS: ToolDef[] = [
    { id: 'select', key: 'v', num: '1', group: 'navigate' },
    { id: 'hand', key: 'h', num: '2', group: 'navigate' },
    { id: 'pen', key: 'p', num: '3', group: 'draw' },
    { id: 'highlighter', key: 'm', num: '4', group: 'draw' },
    { id: 'eraser', key: 'e', num: '5', group: 'draw' },
    { id: 'line', key: 'l', num: '6', group: 'shape' },
    { id: 'arrow', key: 'a', num: '7', group: 'shape' },
    { id: 'rect', key: 'r', num: '8', group: 'shape' },
    { id: 'ellipse', key: 'o', num: '9', group: 'shape' },
    { id: 'triangle', key: 'g', group: 'shape' },
    { id: 'text', key: 't', num: '0', group: 'text' },
];

/** Tools that create shapes and therefore use the style panel. */
export const DRAWING_TOOLS: Tool[] = ['pen', 'highlighter', 'line', 'arrow', 'rect', 'ellipse', 'triangle', 'text'];

export const STORAGE_VERSION = 1;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
/** Label for the platform modifier key in tooltips. */
export const MOD = isMac ? '⌘' : 'Ctrl';
