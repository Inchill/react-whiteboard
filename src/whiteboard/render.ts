import { FONT_FAMILY, LINE_HEIGHT, THEME_COLORS } from './constants';
import { arrowHead, boundsIntersect, getBounds, smoothPath, trianglePoints, unionBounds, worldToScreen } from './geometry';
import { strokeOutline, traceOutline } from './stroke';
import { INK, type Bounds, type Camera, type Shape, type StrokeStyle, type Theme } from './types';

export const resolveColor = (color: string, theme: Theme) => (color === INK ? THEME_COLORS[theme].ink : color);

export function dashArray(style: StrokeStyle, width: number): number[] {
    if (style === 'dashed') return [width * 3 + 4, width * 2 + 4];
    if (style === 'dotted') return [0.1, width * 2 + 3];
    return [];
}

export const HIGHLIGHTER_ALPHA = 0.35;
export const SEMI_FILL_ALPHA = 0.25;

/**
 * Draw one shape. The context must already be in world coordinates.
 * `open` marks a stroke that is still being drawn, so its end isn't tapered yet.
 */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, theme: Theme, open = false): void {
    const color = resolveColor(shape.color, theme);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dashArray(shape.strokeStyle, shape.strokeWidth));

    switch (shape.type) {
        case 'pen':
        case 'highlighter': {
            if (shape.type === 'pen' && shape.pressure) {
                ctx.beginPath();
                traceOutline(ctx, strokeOutline(shape.points, shape.strokeWidth, !open));
                ctx.fill();
                break;
            }
            if (shape.type === 'highlighter') ctx.globalAlpha = HIGHLIGHTER_ALPHA;
            ctx.beginPath();
            for (const c of smoothPath(shape.points)) {
                if (c.type === 'M') ctx.moveTo(c.x, c.y);
                else if (c.type === 'L') ctx.lineTo(c.x, c.y);
                else ctx.quadraticCurveTo(c.cx, c.cy, c.x, c.y);
            }
            ctx.stroke();
            break;
        }
        case 'line':
        case 'arrow': {
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            if (shape.type === 'arrow') {
                const [a, b] = arrowHead(shape.x1, shape.y1, shape.x2, shape.y2, shape.strokeWidth);
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
            break;
        }
        case 'rect':
        case 'ellipse':
        case 'triangle': {
            const x = Math.min(shape.x, shape.x + shape.w);
            const y = Math.min(shape.y, shape.y + shape.h);
            const w = Math.abs(shape.w);
            const h = Math.abs(shape.h);
            ctx.beginPath();
            if (shape.type === 'rect') {
                ctx.rect(x, y, w, h);
            } else if (shape.type === 'ellipse') {
                ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            } else {
                const pts = trianglePoints({ x, y, w, h });
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.lineTo(pts[2].x, pts[2].y);
                ctx.closePath();
            }
            if (shape.fill !== 'none') {
                ctx.globalAlpha = shape.fill === 'semi' ? SEMI_FILL_ALPHA : 1;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.stroke();
            break;
        }
        case 'text': {
            ctx.font = `${shape.fontSize}px ${FONT_FAMILY}`;
            ctx.textBaseline = 'top';
            const lineHeight = shape.fontSize * LINE_HEIGHT;
            const offset = (lineHeight - shape.fontSize) / 2;
            shape.text.split('\n').forEach((line, i) => ctx.fillText(line, shape.x, shape.y + offset + i * lineHeight));
            break;
        }
    }
    ctx.restore();
}

export function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, width: number, height: number, theme: Theme) {
    let gap = 24 * camera.zoom;
    while (gap < 12) gap *= 2;
    while (gap > 48) gap /= 2;
    const r = Math.max(0.8, Math.min(1.4, camera.zoom));
    ctx.fillStyle = THEME_COLORS[theme].grid;
    const startX = ((camera.x % gap) + gap) % gap;
    const startY = ((camera.y % gap) + gap) % gap;
    ctx.beginPath();
    for (let x = startX; x < width; x += gap) {
        for (let y = startY; y < height; y += gap) {
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
        }
    }
    ctx.fill();
}

export type SceneOptions = {
    shapes: Shape[];
    camera: Camera;
    width: number;
    height: number;
    dpr: number;
    theme: Theme;
    grid: boolean;
    selectedIds?: Set<string>;
    /** Shapes rendered faded (e.g. about to be erased). */
    fadedIds?: Set<string>;
    hiddenIds?: Set<string>;
    /** The shape currently being drawn. */
    draftId?: string;
    marquee?: Bounds | null;
    eraserCursor?: { x: number; y: number; r: number } | null;
};

/** Render the whole scene into a canvas sized width*dpr × height*dpr. */
export function drawScene(ctx: CanvasRenderingContext2D, o: SceneOptions): void {
    const colors = THEME_COLORS[o.theme];
    ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, o.width, o.height);
    if (o.grid) drawGrid(ctx, o.camera, o.width, o.height, o.theme);

    const z = o.camera.zoom;
    ctx.setTransform(o.dpr * z, 0, 0, o.dpr * z, o.dpr * o.camera.x, o.dpr * o.camera.y);
    const viewport: Bounds = {
        minX: -o.camera.x / z,
        minY: -o.camera.y / z,
        maxX: (o.width - o.camera.x) / z,
        maxY: (o.height - o.camera.y) / z,
    };
    for (const shape of o.shapes) {
        if (o.hiddenIds?.has(shape.id)) continue;
        if (!boundsIntersect(getBounds(shape), viewport)) continue;
        if (o.fadedIds?.has(shape.id)) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            drawShape(ctx, shape, o.theme);
            ctx.restore();
        } else {
            drawShape(ctx, shape, o.theme, shape.id === o.draftId);
        }
    }

    // Overlays are drawn in screen space so their line width is zoom-independent.
    ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
    ctx.strokeStyle = colors.selection;
    ctx.lineWidth = 1;

    if (o.selectedIds && o.selectedIds.size > 0) {
        const selected = o.shapes.filter((s) => o.selectedIds!.has(s.id) && !o.hiddenIds?.has(s.id));
        const boxes = selected.map(getBounds);
        ctx.setLineDash([4, 3]);
        for (const b of boxes) strokeScreenRect(ctx, b, o.camera, 4);
        ctx.setLineDash([]);
        const all = unionBounds(boxes);
        if (all && selected.length > 1) {
            ctx.lineWidth = 1.5;
            strokeScreenRect(ctx, all, o.camera, 8);
        }
    }

    if (o.marquee) {
        const a = worldToScreen({ x: o.marquee.minX, y: o.marquee.minY }, o.camera);
        const b = worldToScreen({ x: o.marquee.maxX, y: o.marquee.maxY }, o.camera);
        ctx.fillStyle = colors.selection;
        ctx.globalAlpha = 0.08;
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.globalAlpha = 1;
        ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    }

    if (o.eraserCursor) {
        ctx.beginPath();
        ctx.arc(o.eraserCursor.x, o.eraserCursor.y, o.eraserCursor.r, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ink;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function strokeScreenRect(ctx: CanvasRenderingContext2D, b: Bounds, camera: Camera, pad: number) {
    const a = worldToScreen({ x: b.minX, y: b.minY }, camera);
    const c = worldToScreen({ x: b.maxX, y: b.maxY }, camera);
    ctx.strokeRect(Math.round(a.x - pad) + 0.5, Math.round(a.y - pad) + 0.5, Math.round(c.x - a.x + pad * 2), Math.round(c.y - a.y + pad * 2));
}
