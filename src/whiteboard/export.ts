import { FONT_FAMILY, LINE_HEIGHT, THEME_COLORS } from './constants';
import { arrowHead, pathToSvgD, shapesBounds, smoothPath, trianglePoints } from './geometry';
import { dashArray, drawShape, HIGHLIGHTER_ALPHA, resolveColor, SEMI_FILL_ALPHA } from './render';
import { compactShape } from './shapes';
import { outlineToSvgPath, strokeOutline } from './stroke';
import type { Shape, Theme, WhiteboardData } from './types';

export type ExportOptions = {
    theme?: Theme;
    /** Draw the theme background. Defaults to true. */
    background?: boolean;
    padding?: number;
};

const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n = (v: number) => +v.toFixed(2);

function shapeToSvg(shape: Shape, theme: Theme): string {
    const color = escapeXml(resolveColor(shape.color, theme));
    const dash = dashArray(shape.strokeStyle, shape.strokeWidth);
    const strokeAttrs =
        `stroke="${color}" stroke-width="${n(shape.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"` +
        (dash.length ? ` stroke-dasharray="${dash.map(n).join(' ')}"` : '');

    switch (shape.type) {
        case 'pen':
        case 'highlighter': {
            if (shape.type === 'pen' && shape.pressure) {
                return `<path d="${outlineToSvgPath(strokeOutline(shape.points, shape.strokeWidth))}" fill="${color}"/>`;
            }
            const opacity = shape.type === 'highlighter' ? ` stroke-opacity="${HIGHLIGHTER_ALPHA}"` : '';
            return `<path d="${pathToSvgD(smoothPath(shape.points))}" fill="none" ${strokeAttrs}${opacity}/>`;
        }
        case 'line':
            return `<line x1="${n(shape.x1)}" y1="${n(shape.y1)}" x2="${n(shape.x2)}" y2="${n(shape.y2)}" ${strokeAttrs}/>`;
        case 'arrow': {
            const [a, b] = arrowHead(shape.x1, shape.y1, shape.x2, shape.y2, shape.strokeWidth);
            const solid = strokeAttrs.replace(/ stroke-dasharray="[^"]*"/, '');
            return (
                `<g><line x1="${n(shape.x1)}" y1="${n(shape.y1)}" x2="${n(shape.x2)}" y2="${n(shape.y2)}" ${strokeAttrs}/>` +
                `<polyline points="${n(a.x)},${n(a.y)} ${n(shape.x2)},${n(shape.y2)} ${n(b.x)},${n(b.y)}" fill="none" ${solid}/></g>`
            );
        }
        case 'rect':
        case 'ellipse':
        case 'triangle': {
            const fill =
                shape.fill === 'none'
                    ? 'fill="none"'
                    : `fill="${color}"${shape.fill === 'semi' ? ` fill-opacity="${SEMI_FILL_ALPHA}"` : ''}`;
            if (shape.type === 'rect') {
                return `<rect x="${n(shape.x)}" y="${n(shape.y)}" width="${n(shape.w)}" height="${n(shape.h)}" ${fill} ${strokeAttrs}/>`;
            }
            if (shape.type === 'ellipse') {
                return `<ellipse cx="${n(shape.x + shape.w / 2)}" cy="${n(shape.y + shape.h / 2)}" rx="${n(shape.w / 2)}" ry="${n(shape.h / 2)}" ${fill} ${strokeAttrs}/>`;
            }
            const pts = trianglePoints(shape).map((p) => `${n(p.x)},${n(p.y)}`).join(' ');
            return `<polygon points="${pts}" ${fill} ${strokeAttrs}/>`;
        }
        case 'text': {
            const lh = shape.fontSize * LINE_HEIGHT;
            const offset = (lh - shape.fontSize) / 2;
            const lines = shape.text
                .split('\n')
                .map((line, i) => `<tspan x="${n(shape.x)}" y="${n(shape.y + offset + i * lh)}">${escapeXml(line) || ' '}</tspan>`)
                .join('');
            return `<text fill="${color}" font-size="${shape.fontSize}" dominant-baseline="text-before-edge" xml:space="preserve">${lines}</text>`;
        }
    }
}

/** Serialize shapes to a standalone SVG document string. */
export function exportToSvg(shapes: Shape[], { theme = 'light', background = true, padding = 24 }: ExportOptions = {}): string {
    const b = shapesBounds(shapes) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const x = Math.floor(b.minX - padding);
    const y = Math.floor(b.minY - padding);
    const w = Math.ceil(b.maxX - b.minX + padding * 2);
    const h = Math.ceil(b.maxY - b.minY + padding * 2);
    const bg = background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${THEME_COLORS[theme].background}"/>` : '';
    const body = shapes.map((s) => shapeToSvg(s, theme)).join('\n  ');
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" font-family="${escapeXml(FONT_FAMILY)}">\n` +
        `  ${bg}\n  ${body}\n</svg>\n`
    );
}

/** Render shapes to an offscreen canvas and return a PNG blob. */
export function exportToPngBlob(
    shapes: Shape[],
    { theme = 'light', background = true, padding = 24, scale = 2 }: ExportOptions & { scale?: number } = {},
): Promise<Blob | null> {
    const b = shapesBounds(shapes);
    if (!b) return Promise.resolve(null);
    const w = b.maxX - b.minX + padding * 2;
    const h = b.maxY - b.minY + padding * 2;
    // Keep the canvas within common browser limits.
    const s = Math.min(scale, 8192 / w, 8192 / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * s);
    canvas.height = Math.ceil(h * s);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    if (background) {
        ctx.fillStyle = THEME_COLORS[theme].background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(s, 0, 0, s, (padding - b.minX) * s, (padding - b.minY) * s);
    for (const shape of shapes) drawShape(ctx, shape, theme);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function serialize(shapes: Shape[]): string {
    const data: WhiteboardData = { type: 'react-whiteboard', version: 1, shapes: shapes.map(compactShape) };
    return JSON.stringify(data);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function isValidShape(s: unknown): s is Shape {
    if (!s || typeof s !== 'object') return false;
    const o = s as Record<string, unknown>;
    if (!isStr(o.id) || !isStr(o.color) || !isNum(o.strokeWidth)) return false;
    if (!['solid', 'dashed', 'dotted'].includes(o.strokeStyle as string)) return false;
    switch (o.type) {
        case 'pen':
        case 'highlighter':
            return (
                Array.isArray(o.points) &&
                o.points.length > 0 &&
                o.points.every((p) => Array.isArray(p) && (p.length === 2 || p.length === 3) && p.every(isNum)) &&
                (o.pressure === undefined || typeof o.pressure === 'boolean')
            );
        case 'line':
        case 'arrow':
            return [o.x1, o.y1, o.x2, o.y2].every(isNum);
        case 'rect':
        case 'ellipse':
        case 'triangle':
            return [o.x, o.y, o.w, o.h].every(isNum) && ['none', 'semi', 'solid'].includes(o.fill as string);
        case 'text':
            return [o.x, o.y, o.w, o.h, o.fontSize].every(isNum) && isStr(o.text);
        default:
            return false;
    }
}

/** Parse a saved whiteboard JSON string. Invalid shapes are dropped; throws on malformed input. */
export function deserialize(json: string): Shape[] {
    const data = JSON.parse(json) as Partial<WhiteboardData>;
    if (!data || data.type !== 'react-whiteboard' || !Array.isArray(data.shapes)) {
        throw new Error('Not a react-whiteboard file');
    }
    const seen = new Set<string>();
    return data.shapes.filter((s): s is Shape => {
        if (!isValidShape(s) || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
    });
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampName(ext: string): string {
    const d = new Date();
    const p = (v: number) => String(v).padStart(2, '0');
    return `whiteboard-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
}
