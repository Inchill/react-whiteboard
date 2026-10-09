import { INK, type Shape } from '../whiteboard';
import { measureText } from '../whiteboard/geometry';
import type { Locale } from '../whiteboard/types';

const base = { strokeStyle: 'solid' as const };

function text(id: string, x: number, y: number, value: string, fontSize: number, color = INK): Shape {
    return { ...base, id, type: 'text', x, y, text: value, fontSize, color, strokeWidth: 1, ...measureText(value, fontSize) };
}

/** The sketch shown in the landing-page hero. Real shapes, fully editable. */
export function demoShapes(locale: Locale): Shape[] {
    const zh = locale === 'zh';
    const title = zh ? '在这里画画看' : 'Go on, draw here';
    const sub = zh ? '拖动、擦除、写字都行 —— 按 ? 查看快捷键' : 'Move things, erase them, add text. Press ? for shortcuts.';
    const titleSize = measureText(title, 56);
    const squiggle: [number, number, number][] = [];
    for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 4;
        // Pressure swells along the stroke, like a real pen.
        squiggle.push([760 + i * 4.2, 300 + Math.sin(a) * 14 + i * 0.4, 0.35 + 0.5 * Math.sin((i / 48) * Math.PI)]);
    }
    return [
        {
            ...base,
            id: 'demo-hl',
            type: 'highlighter',
            color: '#fab005',
            strokeWidth: 22,
            points: [
                [-6, 58],
                [titleSize.w * 0.5, 56],
                [titleSize.w + 8, 54],
            ],
        },
        text('demo-title', 0, 0, title, 56),
        text('demo-sub', 2, 92, sub, 22, '#5d6573'),
        { ...base, id: 'demo-box', type: 'rect', x: 0, y: 190, w: 220, h: 120, fill: 'semi', color: '#1971c2', strokeWidth: 3 },
        text('demo-box-label', 34, 232, zh ? '想法' : 'Idea', 32, '#1971c2'),
        { ...base, id: 'demo-arrow', type: 'arrow', x1: 240, y1: 250, x2: 410, y2: 250, color: INK, strokeWidth: 3 },
        { ...base, id: 'demo-oval', type: 'ellipse', x: 430, y: 190, w: 250, h: 120, fill: 'semi', color: '#2f9e44', strokeWidth: 3 },
        text('demo-oval-label', 480, 232, zh ? '上线！' : 'Ship it', 32, '#2f9e44'),
        { ...base, id: 'demo-squiggle', type: 'pen', pressure: true, color: '#e03131', strokeWidth: 5, points: squiggle },
        { ...base, id: 'demo-tri', type: 'triangle', x: 800, y: 170, w: 120, h: 100, fill: 'none', color: '#7048e8', strokeWidth: 3, strokeStyle: 'dashed' },
    ];
}
