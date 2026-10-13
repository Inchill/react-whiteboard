export type Point = { x: number; y: number };

export type StrokePoint = [number, number] | [number, number, number];

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type Tool =
    | 'select'
    | 'hand'
    | 'pen'
    | 'highlighter'
    | 'eraser'
    | 'line'
    | 'arrow'
    | 'rect'
    | 'ellipse'
    | 'triangle'
    | 'text';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
/** How a line or arrow gets from start to end: one straight segment, right-angled turns, or a smooth curve. */
export type LineRoute = 'straight' | 'elbow' | 'curve';
export type FillStyle = 'none' | 'semi' | 'solid';
export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'zh';

/** Special color token that renders as the theme's foreground (dark on light, light on dark). */
export const INK = 'ink';

type BaseShape = {
    id: string;
    color: string;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
};

export type FreehandShape = BaseShape & {
    type: 'pen' | 'highlighter';
    /** [x, y] or [x, y, pressure 0–1]. */
    points: StrokePoint[];
    /** Variable-width stroke that follows pressure / speed (pen only). */
    pressure?: boolean;
};

export type LinearShape = BaseShape & {
    type: 'line' | 'arrow';
    /** Start point. */
    x1: number;
    y1: number;
    /** End point (the arrow head). */
    x2: number;
    y2: number;
    /** Points the line passes through between start and end. Absent for a straight line. */
    via?: [number, number][];
    /** Draw a smooth curve through the points instead of straight segments. */
    curved?: boolean;
};

export type BoxShape = BaseShape & {
    type: 'rect' | 'ellipse' | 'triangle';
    x: number;
    y: number;
    w: number;
    h: number;
    fill: FillStyle;
};

export type TextShape = BaseShape & {
    type: 'text';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    /** Cached layout size in world units. */
    w: number;
    h: number;
};

export type Shape = FreehandShape | LinearShape | BoxShape | TextShape;
export type ShapeType = Shape['type'];

export type Camera = { x: number; y: number; zoom: number };

export type StyleState = {
    color: string;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
    fill: FillStyle;
    fontSize: number;
    /** Pen strokes follow stylus pressure / drawing speed. */
    pressure: boolean;
    /** `partial` cuts freehand strokes where the eraser passes; `stroke` removes whole shapes. */
    eraserMode: EraserMode;
    /** Eraser radius in screen pixels. */
    eraserSize: number;
};

export type EraserMode = 'partial' | 'stroke';

export type WhiteboardData = {
    type: 'react-whiteboard';
    version: 1;
    shapes: Shape[];
};
