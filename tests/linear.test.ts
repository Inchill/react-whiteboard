import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../src/whiteboard/constants';
import { deserialize, exportToSvg, serialize } from '../src/whiteboard/export';
import { getBounds, hitTest, translateShape } from '../src/whiteboard/geometry';
import { arrivalFrom, elbowVia, linePolyline, routeOf, simplify, withRoute } from '../src/whiteboard/linear';
import { applyStyle, compactShape, createShape, finalizeShape, updateDraft } from '../src/whiteboard/shapes';
import type { LinearShape, Point } from '../src/whiteboard/types';

const base = { id: 'l', color: 'ink', strokeWidth: 2, strokeStyle: 'solid' as const };
const straight: LinearShape = { ...base, type: 'arrow', x1: 0, y1: 0, x2: 100, y2: 60 };
const elbow: LinearShape = {
  ...straight,
  via: [
    [50, 0],
    [50, 60],
  ],
};
const curve: LinearShape = { ...straight, x2: 100, y2: 0, via: [[50, 40]], curved: true };

const near = (pts: Point[], x: number, y: number) => pts.some((p) => Math.hypot(p.x - x, p.y - y) < 0.01);

/** Drag a line tool from `points[0]` through the rest, as the pointer handlers do. */
function drag(route: (typeof DEFAULT_STYLE)['lineRoute'], points: Point[], zoom = 1) {
  let shape = createShape('arrow', points[0], { ...DEFAULT_STYLE, lineRoute: route });
  for (const p of points.slice(1)) shape = updateDraft(shape, points[0], p, false, zoom);
  return finalizeShape(shape, zoom) as LinearShape | null;
}

describe('line routes', () => {
  it('tells the route from the shape', () => {
    expect(routeOf(straight)).toBe('straight');
    expect(routeOf(elbow)).toBe('elbow');
    expect(routeOf(curve)).toBe('curve');
  });

  it('turns at right angles halfway along the main direction', () => {
    expect(elbowVia({ x: 0, y: 0 }, { x: 100, y: 60 })).toEqual([
      [50, 0],
      [50, 60],
    ]);
    expect(elbowVia({ x: 0, y: 0 }, { x: 40, y: 100 })).toEqual([
      [0, 50],
      [40, 50],
    ]);
    expect(elbowVia({ x: 0, y: 0 }, { x: 100, y: 0.5 })).toEqual([]);
  });

  it('draws a curve through every point', () => {
    const pts = linePolyline(curve);
    expect(pts.length).toBeGreaterThan(10);
    for (const [x, y] of [
      [0, 0],
      [50, 40],
      [100, 0],
    ])
      expect(near(pts, x, y)).toBe(true);
  });

  it("aims the arrow head along the last segment, or the curve's end", () => {
    expect(arrivalFrom(straight)).toEqual({ x: 0, y: 0 });
    expect(arrivalFrom(elbow)).toEqual({ x: 50, y: 60 });
    const from = arrivalFrom(curve);
    // Coming down from the right of the bulge toward (100, 0).
    expect(from.x).toBeLessThan(100);
    expect(from.y).toBeGreaterThan(0);
  });

  it('measures and hits the drawn path, not the chord', () => {
    expect(getBounds(elbow)).toEqual({ minX: -1, minY: -1, maxX: 101, maxY: 61 });
    // The curve bulges down to y = 40 at its middle.
    expect(getBounds(curve).maxY).toBeCloseTo(41, 0);
    expect(hitTest(elbow, { x: 50, y: 30 }, 2)).toBe(true);
    expect(hitTest(elbow, { x: 50, y: 30 * 0.6 + 12 }, 2)).toBe(true);
    expect(hitTest(elbow, { x: 30, y: 18 }, 2)).toBe(false);
    expect(hitTest(curve, { x: 50, y: 40 }, 2)).toBe(true);
    expect(hitTest(curve, { x: 50, y: 0 }, 2)).toBe(false);
  });

  it('moves and rounds via points with the line', () => {
    expect(translateShape(elbow, 10, 5)).toMatchObject({
      x1: 10,
      y1: 5,
      via: [
        [60, 5],
        [60, 65],
      ],
      x2: 110,
      y2: 65,
    });
    expect(compactShape({ ...elbow, via: [[1.23456, 2.34567]] })).toMatchObject({ via: [[1.23, 2.35]] });
  });

  it('keeps only the points a gesture needs', () => {
    const wobbly = Array.from({ length: 21 }, (_, i) => ({ x: i * 5, y: i % 2 ? 1 : -1 }));
    expect(simplify(wobbly, 3)).toEqual([wobbly[0], wobbly[20]]);
    const corner = [
      { x: 0, y: 0 },
      { x: 50, y: 1 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 101, y: 100 },
    ];
    expect(simplify(corner, 3)).toEqual([corner[0], corner[2], corner[4]]);
  });
});

describe('drawing lines', () => {
  it('draws an elbow from the drag', () => {
    expect(
      drag('elbow', [
        { x: 0, y: 0 },
        { x: 50, y: 20 },
        { x: 100, y: 60 },
      ]),
    ).toMatchObject({
      x2: 100,
      y2: 60,
      via: [
        [50, 0],
        [50, 60],
      ],
    });
    // A level drag stays a plain straight line.
    const level = drag('elbow', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])!;
    expect(level.via).toBeUndefined();
  });

  it('turns a curved drag into a smooth curve through a few points', () => {
    const arc = Array.from({ length: 41 }, (_, i) => {
      const a = Math.PI * (i / 40);
      return { x: 100 - 100 * Math.cos(a), y: 60 * Math.sin(a) };
    });
    const shape = drag('curve', arc)!;
    expect(shape.curved).toBe(true);
    expect(shape.via!.length).toBeGreaterThan(1);
    expect(shape.via!.length).toBeLessThan(10);
    expect(shape).toMatchObject({ x1: 0, y1: 0 });
    expect(shape.x2).toBeCloseTo(200);
    // The smooth curve stays close to the drag.
    const pts = linePolyline(shape);
    for (const p of arc) expect(Math.min(...pts.map((q) => Math.hypot(q.x - p.x, q.y - p.y)))).toBeLessThan(8);
  });

  it('keeps a nearly straight curve drag straight, and drops a click', () => {
    const shape = drag('curve', [
      { x: 0, y: 0 },
      { x: 30, y: 1 },
      { x: 60, y: -1 },
      { x: 100, y: 0 },
    ])!;
    expect(shape.via).toBeUndefined();
    expect(shape.curved).toBeUndefined();
    expect(
      drag('curve', [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
      ]),
    ).toBeNull();
  });

  it('changes the route of an existing line', () => {
    expect(applyStyle(straight, { lineRoute: 'elbow' })).toMatchObject({
      via: [
        [50, 0],
        [50, 60],
      ],
    });
    expect(applyStyle(elbow, { lineRoute: 'curve' })).toMatchObject({ via: elbow.via, curved: true });
    const arc = withRoute({ ...straight, x2: 100, y2: 0 }, 'curve');
    expect(arc.via).toEqual([[50, 20]]);
    expect(withRoute(curve, 'straight')).not.toHaveProperty('via');
    expect(withRoute(curve, 'straight')).not.toHaveProperty('curved');
    expect(withRoute(curve, 'elbow')).toEqual({ ...straight, x2: 100, y2: 0 });
  });
});

describe('saving and exporting lines', () => {
  it('round-trips via points and rejects malformed ones', () => {
    expect(deserialize(serialize([elbow, { ...curve, id: 'c' }]))).toEqual([elbow, { ...curve, id: 'c' }]);
    const bad = [
      { ...elbow, id: 'a', via: [[1, 'x']] },
      { ...elbow, id: 'b', via: 'nope' },
      { ...curve, id: 'c', curved: 'yes' },
      { ...elbow, id: 'd', via: Array.from({ length: 501 }, () => [0, 0]) },
    ];
    expect(deserialize(JSON.stringify({ type: 'react-whiteboard', version: 1, shapes: bad }))).toEqual([]);
  });

  it('exports straight lines as before, elbows and curves as paths', () => {
    expect(exportToSvg([{ ...straight, type: 'line' }])).toContain('<line x1="0" y1="0" x2="100" y2="60"');
    expect(exportToSvg([elbow])).toContain('<path d="M0 0L50 0L50 60L100 60" fill="none"');
    expect(exportToSvg([curve])).toMatch(/<path d="M0 0C[^"]+C[^"]+ 100 0" fill="none"/);
    // The elbow's head points right along its last segment.
    expect(exportToSvg([elbow])).toContain('<polyline points="89.19,65.21 100,60 89.19,54.79"');
  });
});
