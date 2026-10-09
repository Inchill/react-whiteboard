import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { DEFAULT_STYLE, DRAWING_TOOLS, FONT_FAMILY, LINE_HEIGHT, MAX_ZOOM, MIN_ZOOM, MOD, TOOLS, type ToolDef } from './constants';
import { deserialize, downloadBlob, exportToPngBlob, exportToSvg, serialize, timestampName, type ExportOptions } from './export';
import {
    boundsFromPoints,
    boundsIntersect,
    distance,
    fitCamera,
    type Insets,
    getBounds,
    measureText,
    screenToWorld,
    shapeAt,
    shapesBounds,
    translateShape,
    worldToScreen,
    zoomAt,
} from './geometry';
import { historyReducer, initHistory } from './history';
import { detectLocale, MESSAGES } from './i18n';
import { Icons } from './icons';
import { drawScene, resolveColor } from './render';
import { eraseAt } from './erase';
import { samplePressure } from './stroke';
import { applyStyle, createId, createShape, finalizeShape, isDrawableTool, updateDraft } from './shapes';
import { loadState, saveState } from './storage';
import type { Camera, Locale, Point, Shape, StyleState, TextShape, Theme, Tool } from './types';
import { HelpDialog, IconButton, Menu, StylePanel, Toolbar, Tooltip, type MenuItem } from './ui';
import './whiteboard.css';

export type WhiteboardProps = {
    /** Shapes to start with when nothing is stored under `storageKey`. */
    initialShapes?: Shape[];
    /** localStorage key used for autosave. Pass `null` to disable persistence. */
    storageKey?: string | null;
    /** Controlled theme. When omitted the board manages its own theme (with a toggle in the menu). */
    theme?: Theme;
    /** Controlled locale. When omitted it is detected from the browser and switchable from the menu. */
    locale?: Locale;
    initialTool?: Tool;
    /**
     * Tools shown in the toolbar (and reachable by shortcut), in this order.
     * Defaults to every tool. Example: `['pen', 'highlighter', 'eraser']` for a simple doodle pad.
     */
    tools?: Tool[];
    /** Called after every committed change (not on every pointer move). */
    onChange?: (shapes: Shape[]) => void;
    onThemeChange?: (theme: Theme) => void;
    /** Listen for shortcuts on `window` (full-page apps). When false, only while the board has focus. */
    globalShortcuts?: boolean;
    /** Use plain wheel/trackpad scroll to pan. Set false when embedding inside a scrolling page. */
    captureWheel?: boolean;
    /** Show the main menu (file, export, settings). */
    showMenu?: boolean;
    githubUrl?: string;
    className?: string;
    style?: CSSProperties;
};

export type WhiteboardHandle = {
    getShapes: () => Shape[];
    /** Replace the document. Recorded in undo history unless `{ history: false }`. */
    setShapes: (shapes: Shape[], options?: { history?: boolean }) => void;
    clear: () => void;
    undo: () => void;
    redo: () => void;
    zoomToFit: () => void;
    exportPng: (options?: ExportOptions & { scale?: number }) => Promise<Blob | null>;
    exportSvg: (options?: ExportOptions) => string;
    exportJson: () => string;
};

type Interaction =
    | { kind: 'none' }
    | { kind: 'draw'; start: Point }
    | { kind: 'pan'; startScreen: Point; startCamera: Camera }
    | { kind: 'move'; start: Point; originals: Shape[]; moved: boolean; clickedId: string }
    | { kind: 'marquee'; start: Point; base: string[] }
    | { kind: 'erase'; last: Point; hits: Set<string> }
    | { kind: 'erasePartial'; last: Point; working: Shape[] }
    | { kind: 'pinch'; startDist: number; startMid: Point; startCamera: Camera };

type TextEditing = { id: string | null; x: number; y: number; text: string; fontSize: number; color: string };

const HIT_TOLERANCE = 6;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Leave room for the floating toolbar and style panel when fitting content. */
const fitInsets = (width: number): Insets =>
    width > 720 ? { top: 76, right: 32, bottom: 72, left: 248 } : { top: 72, right: 20, bottom: 76, left: 20 };

const systemTheme = (): Theme =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function styleFromShape(shape: Shape, fallback: StyleState): StyleState {
    return {
        ...fallback,
        color: shape.color,
        strokeWidth: shape.type === 'highlighter' ? Math.max(1, Math.round(shape.strokeWidth / 3)) : shape.type === 'text' ? fallback.strokeWidth : shape.strokeWidth,
        strokeStyle: shape.strokeStyle,
        fill: 'fill' in shape ? shape.fill : fallback.fill,
        fontSize: shape.type === 'text' ? shape.fontSize : fallback.fontSize,
    };
}

const isEditableTarget = (t: EventTarget | null) =>
    t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(function Whiteboard(props, ref) {
    const {
        initialShapes,
        storageKey = 'react-whiteboard',
        theme: themeProp,
        locale: localeProp,
        initialTool = 'pen',
        tools: toolsProp,
        onChange,
        onThemeChange,
        globalShortcuts = true,
        captureWheel = true,
        showMenu = true,
        githubUrl,
        className,
        style: styleProp,
    } = props;

    // ---- persisted & document state -------------------------------------------------
    const [saved] = useState(() => (storageKey ? loadState(storageKey) : null));
    const [history, dispatch] = useReducer(historyReducer, undefined, () => initHistory(saved?.shapes ?? initialShapes ?? []));
    const shapes = history.present;

    const toolDefs = useMemo(() => {
        if (!toolsProp) return TOOLS;
        // Custom subsets get sequential number keys (1–9, then 0) in the order given.
        const picked = toolsProp.map((id) => TOOLS.find((d) => d.id === id)).filter((d): d is ToolDef => !!d);
        return picked.map((d, i) => ({ ...d, num: i < 9 ? String(i + 1) : i === 9 ? '0' : undefined }));
    }, [toolsProp]);
    const hasTool = useCallback((id: Tool) => toolDefs.some((d) => d.id === id), [toolDefs]);
    const [tool, setToolState] = useState<Tool>(() =>
        !toolsProp || toolsProp.includes(initialTool) ? initialTool : (toolsProp[0] ?? 'pen'),
    );
    const [style, setStyle] = useState<StyleState>(() => ({ ...DEFAULT_STYLE, ...saved?.app.style }));
    const [camera, setCamera] = useState<Camera>(() => saved?.app.camera ?? { x: 0, y: 0, zoom: 1 });
    const [ownTheme, setOwnTheme] = useState<Theme>(() => saved?.app.theme ?? systemTheme());
    const [ownLocale, setOwnLocale] = useState<Locale>(() => saved?.app.locale ?? detectLocale());
    const [grid, setGrid] = useState<boolean>(() => saved?.app.grid ?? true);
    const [selection, setSelection] = useState<string[]>([]);
    const [editing, setEditing] = useState<TextEditing | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
    const [panning, setPanning] = useState(false);
    const [spaceDown, setSpaceDown] = useState(false);
    const [drawing, setDrawing] = useState(false);

    const theme = themeProp ?? ownTheme;
    const locale = localeProp ?? ownLocale;
    const t = MESSAGES[locale];

    // ---- refs used by the imperative render loop -------------------------------------
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
    const interactionRef = useRef<Interaction>({ kind: 'none' });
    const draftRef = useRef<Shape | null>(null);
    const transientRef = useRef<Map<string, Shape>>(new Map());
    /** Whole-document preview while the partial eraser is dragging. */
    const erasePreviewRef = useRef<Shape[] | null>(null);
    /** Last pen sample, for pressure / speed estimation. */
    const sampleRef = useRef<{ x: number; y: number; t: number; p: number } | null>(null);
    const fadedRef = useRef<Set<string>>(new Set());
    const marqueeRef = useRef<{ a: Point; b: Point } | null>(null);
    const cursorRef = useRef<Point | null>(null);
    const pointersRef = useRef<Map<number, Point>>(new Map());
    const clipboardRef = useRef<Shape[]>([]);
    const editingRef = useRef<TextEditing | null>(null);
    const needsFitRef = useRef(!saved?.app.camera && (initialShapes?.length ?? 0) > 0);
    const rafRef = useRef(0);

    const selectedSet = useMemo(() => new Set(selection), [selection]);
    const live = useRef({ shapes, camera, selectedSet, theme, grid, tool, editing, style });
    live.current = { shapes, camera, selectedSet, theme, grid, tool, editing, style };
    editingRef.current = editing;

    // ---- rendering --------------------------------------------------------------------
    const draw = useCallback(() => {
        rafRef.current = 0;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const { width, height, dpr } = sizeRef.current;
        if (!ctx || width === 0) return;
        const s = live.current;
        let list = erasePreviewRef.current ?? s.shapes;
        const transient = transientRef.current;
        if (transient.size) list = list.map((sh) => transient.get(sh.id) ?? sh);
        if (draftRef.current) list = [...list, draftRef.current];
        const marquee = marqueeRef.current;
        const cursor = cursorRef.current;
        drawScene(ctx, {
            shapes: list,
            camera: s.camera,
            width,
            height,
            dpr,
            theme: s.theme,
            grid: s.grid,
            selectedIds: s.selectedSet,
            fadedIds: fadedRef.current,
            hiddenIds: s.editing?.id ? new Set([s.editing.id]) : undefined,
            marquee: marquee ? boundsFromPoints(marquee.a, marquee.b) : null,
            draftId: draftRef.current?.id,
            eraserCursor: s.tool === 'eraser' && cursor ? { ...cursor, r: s.style.eraserSize } : null,
        });
    }, []);

    const scheduleRender = useCallback(() => {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
    }, [draw]);

    useEffect(() => scheduleRender(), [shapes, camera, selectedSet, theme, grid, tool, editing, style.eraserSize, scheduleRender]);
    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    // Keep the canvas backing store in sync with its CSS size and devicePixelRatio.
    useLayoutEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            sizeRef.current = { width: rect.width, height: rect.height, dpr };
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            if (needsFitRef.current && rect.width > 0) {
                needsFitRef.current = false;
                const b = shapesBounds(live.current.shapes);
                if (b) setCamera(fitCamera(b, rect.width, rect.height, fitInsets(rect.width)));
            }
            draw();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        return () => ro.disconnect();
    }, [draw]);

    // ---- persistence & change notification -------------------------------------------
    useEffect(() => {
        if (!storageKey) return;
        const id = window.setTimeout(() => {
            saveState(storageKey, shapes, {
                camera,
                style,
                grid,
                theme: themeProp ? undefined : ownTheme,
                locale: localeProp ? undefined : ownLocale,
            });
        }, 300);
        return () => window.clearTimeout(id);
    }, [storageKey, shapes, camera, style, grid, ownTheme, ownLocale, themeProp, localeProp]);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const firstShapes = useRef(shapes);
    useEffect(() => {
        if (shapes !== firstShapes.current) onChangeRef.current?.(shapes);
    }, [shapes]);

    // Drop selected ids that no longer exist (after undo, erase, etc.).
    useEffect(() => {
        setSelection((sel) => {
            if (sel.length === 0) return sel;
            const ids = new Set(shapes.map((s) => s.id));
            const next = sel.filter((id) => ids.has(id));
            return next.length === sel.length ? sel : next;
        });
    }, [shapes]);

    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(() => setToast(null), 2600);
        return () => window.clearTimeout(id);
    }, [toast]);

    const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

    // ---- document helpers -------------------------------------------------------------
    const commit = useCallback((next: Shape[] | ((prev: Shape[]) => Shape[])) => dispatch({ type: 'commit', shapes: next }), []);

    const zoomTo = useCallback((zoom: number, anchor?: Point) => {
        setCamera((c) => zoomAt(c, clampZoom(zoom), anchor ?? { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 }));
    }, []);

    const zoomToFit = useCallback(() => {
        const b = shapesBounds(live.current.shapes);
        const { width, height } = sizeRef.current;
        if (!b || !width) {
            setCamera({ x: 0, y: 0, zoom: 1 });
            return;
        }
        setCamera(fitCamera(b, width, height, fitInsets(width)));
    }, []);

    const setTool = useCallback((next: Tool) => {
        setToolState(next);
        if (next !== 'select') setSelection([]);
        cursorRef.current = null;
    }, []);

    const cancelInteraction = useCallback(() => {
        interactionRef.current = { kind: 'none' };
        draftRef.current = null;
        transientRef.current = new Map();
        fadedRef.current = new Set();
        erasePreviewRef.current = null;
        marqueeRef.current = null;
        setDrawing(false);
        setPanning(false);
        scheduleRender();
    }, [scheduleRender]);

    const selectedShapes = useMemo(() => shapes.filter((s) => selectedSet.has(s.id)), [shapes, selectedSet]);

    const deleteSelection = useCallback(() => {
        if (!selectedSet.size) return;
        commit((prev) => prev.filter((s) => !selectedSet.has(s.id)));
        setSelection([]);
    }, [commit, selectedSet]);

    const pasteShapes = useCallback(
        (source: Shape[], offset: number) => {
            if (!source.length) return;
            const copies = source.map((s) => ({ ...translateShape(s, offset, offset), id: createId() }));
            commit((prev) => [...prev, ...copies]);
            if (hasTool('select')) {
                setToolState('select');
                setSelection(copies.map((c) => c.id));
            }
            return copies;
        },
        [commit, hasTool],
    );

    const duplicateSelection = useCallback(() => pasteShapes(selectedShapes, 16), [pasteShapes, selectedShapes]);

    const reorderSelection = useCallback(
        (toFront: boolean) => {
            if (!selectedSet.size) return;
            const picked = shapes.filter((s) => selectedSet.has(s.id));
            const rest = shapes.filter((s) => !selectedSet.has(s.id));
            commit(toFront ? [...rest, ...picked] : [...picked, ...rest]);
        },
        [commit, shapes, selectedSet],
    );

    const clearCanvas = useCallback(() => {
        if (!live.current.shapes.length) return;
        commit([]);
        setSelection([]);
        notify(t.cleared.replace('Ctrl', MOD));
    }, [commit, notify, t]);

    const updateStyle = useCallback(
        (patch: Partial<StyleState>) => {
            setStyle((s) => ({ ...s, ...patch }));
            if (selectedSet.size) commit((prev) => prev.map((s) => (selectedSet.has(s.id) ? applyStyle(s, patch) : s)));
            if (editingRef.current) {
                setEditing((e) =>
                    e ? { ...e, color: patch.color ?? e.color, fontSize: patch.fontSize ?? e.fontSize } : e,
                );
            }
        },
        [commit, selectedSet],
    );

    // ---- text editing -------------------------------------------------------------------
    const startTextEdit = useCallback(
        (at: Point, existing?: TextShape) => {
            setSelection([]);
            setEditing(
                existing
                    ? { id: existing.id, x: existing.x, y: existing.y, text: existing.text, fontSize: existing.fontSize, color: existing.color }
                    : { id: null, x: at.x, y: at.y - (style.fontSize * LINE_HEIGHT) / 2, text: '', fontSize: style.fontSize, color: style.color },
            );
        },
        [style.color, style.fontSize],
    );

    const commitText = useCallback(() => {
        const e = editingRef.current;
        if (!e) return;
        editingRef.current = null;
        setEditing(null);
        const text = e.text.replace(/\s+$/, '');
        if (!text.trim()) {
            if (e.id) commit((prev) => prev.filter((s) => s.id !== e.id));
            return;
        }
        const size = measureText(text, e.fontSize);
        if (e.id) {
            commit((prev) => prev.map((s) => (s.id === e.id && s.type === 'text' ? { ...s, text, fontSize: e.fontSize, color: e.color, ...size } : s)));
        } else {
            const shape: TextShape = {
                id: createId(),
                type: 'text',
                x: e.x,
                y: e.y,
                text,
                fontSize: e.fontSize,
                color: e.color,
                strokeWidth: 1,
                strokeStyle: 'solid',
                ...size,
            };
            commit((prev) => [...prev, shape]);
        }
    }, [commit]);

    // ---- import / export ----------------------------------------------------------------
    const exportPng = useCallback(
        (opts?: ExportOptions & { scale?: number }) => exportToPngBlob(live.current.shapes, { theme: live.current.theme, ...opts }),
        [],
    );

    const handleExportPng = useCallback(async () => {
        if (!shapes.length) return notify(t.nothingToExport);
        const blob = await exportPng();
        if (blob) downloadBlob(blob, timestampName('png'));
    }, [exportPng, notify, shapes.length, t]);

    const handleExportSvg = useCallback(() => {
        if (!shapes.length) return notify(t.nothingToExport);
        downloadBlob(new Blob([exportToSvg(shapes, { theme })], { type: 'image/svg+xml' }), timestampName('svg'));
    }, [notify, shapes, t, theme]);

    const handleSaveFile = useCallback(() => {
        downloadBlob(new Blob([serialize(shapes)], { type: 'application/json' }), timestampName('json'));
    }, [shapes]);

    const handleCopyPng = useCallback(async () => {
        if (!shapes.length) return notify(t.nothingToExport);
        try {
            const blob = await exportPng();
            if (!blob) throw new Error('no blob');
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            notify(t.copied);
        } catch {
            notify(t.copyFailed);
        }
    }, [exportPng, notify, shapes.length, t]);

    const loadFile = useCallback(
        async (file: File) => {
            try {
                const next = deserialize(await file.text());
                commit(next);
                setSelection([]);
                needsFitRef.current = false;
                const b = shapesBounds(next);
                if (b && sizeRef.current.width) setCamera(fitCamera(b, sizeRef.current.width, sizeRef.current.height, fitInsets(sizeRef.current.width)));
                notify(t.loaded);
            } catch {
                notify(t.openFailed);
            }
        },
        [commit, notify, t],
    );

    useImperativeHandle(
        ref,
        () => ({
            getShapes: () => live.current.shapes,
            setShapes: (next, options) => dispatch(options?.history === false ? { type: 'reset', shapes: next } : { type: 'commit', shapes: next }),
            clear: () => dispatch({ type: 'commit', shapes: [] }),
            undo: () => dispatch({ type: 'undo' }),
            redo: () => dispatch({ type: 'redo' }),
            zoomToFit,
            exportPng,
            exportSvg: (opts) => exportToSvg(live.current.shapes, { theme: live.current.theme, ...opts }),
            exportJson: () => serialize(live.current.shapes),
        }),
        [exportPng, zoomToFit],
    );

    // ---- pointer interaction ------------------------------------------------------------
    const localPoint = (e: { clientX: number; clientY: number }): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    /** Sample points along a drag so fast eraser moves don't skip anything. */
    const eraserSteps = (from: Point, to: Point, r: number) => {
        const steps = Math.max(1, Math.ceil(distance(from, to) / (r / 2)));
        return Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }));
    };

    const erasePartialAlong = (from: Point, to: Point, working: Shape[]): Shape[] => {
        const { camera: cam, style: st } = live.current;
        const r = st.eraserSize / cam.zoom;
        let out = working;
        for (const p of eraserSteps(from, to, r)) out = eraseAt(out, p, r, 0);
        return out;
    };

    /** Pressure for a pen sample, from the stylus or simulated from speed. */
    const nextPressure = (ev: PointerEvent, screen: Point) => {
        const prev = sampleRef.current;
        const p = samplePressure({
            pointerType: ev.pointerType,
            pressure: ev.pressure,
            prev: prev?.p,
            distance: prev ? Math.hypot(screen.x - prev.x, screen.y - prev.y) : 0,
            dt: prev ? ev.timeStamp - prev.t : 16,
        });
        sampleRef.current = { x: screen.x, y: screen.y, t: ev.timeStamp, p };
        return p;
    };

    const eraseAlong = (from: Point, to: Point, hits: Set<string>) => {
        const { shapes: list, camera: cam, style: st } = live.current;
        const r = st.eraserSize / cam.zoom;
        const steps = Math.max(1, Math.ceil(distance(from, to) / (r / 2)));
        for (let i = 0; i <= steps; i++) {
            const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
            for (const s of list) {
                if (!hits.has(s.id) && shapeAt([s], p, r)) hits.add(s.id);
            }
        }
        fadedRef.current = new Set(hits);
    };

    const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        // Check before focusing: moving focus blurs the text editor, which commits it.
        const wasEditing = !!editingRef.current;
        if (wasEditing) commitText();
        containerRef.current?.focus({ preventScroll: true });
        setMenuOpen(false);
        if (wasEditing) return;
        const screen = localPoint(e);
        pointersRef.current.set(e.pointerId, screen);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const cam = live.current.camera;

        if (pointersRef.current.size === 2) {
            // Second finger: switch to pinch-zoom and discard whatever the first finger started.
            cancelInteraction();
            const [a, b] = [...pointersRef.current.values()];
            interactionRef.current = {
                kind: 'pinch',
                startDist: Math.max(distance(a, b), 1),
                startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                startCamera: cam,
            };
            return;
        }
        if (pointersRef.current.size > 2) return;

        if (e.button === 1 || tool === 'hand' || spaceDown) {
            interactionRef.current = { kind: 'pan', startScreen: screen, startCamera: cam };
            setPanning(true);
            return;
        }
        if (e.button !== 0) return;

        const world = screenToWorld(screen, cam);
        const tol = HIT_TOLERANCE / cam.zoom;

        if (tool === 'select') {
            const hit = shapeAt(shapes, world, tol);
            if (hit) {
                let nextSel = selection;
                if (e.shiftKey) {
                    nextSel = selectedSet.has(hit.id) ? selection.filter((id) => id !== hit.id) : [...selection, hit.id];
                    setSelection(nextSel);
                    if (!nextSel.includes(hit.id)) return;
                } else if (!selectedSet.has(hit.id)) {
                    nextSel = [hit.id];
                    setSelection(nextSel);
                    setStyle((s) => styleFromShape(hit, s));
                }
                const ids = new Set(nextSel);
                interactionRef.current = { kind: 'move', start: world, originals: shapes.filter((s) => ids.has(s.id)), moved: false, clickedId: hit.id };
            } else {
                const base = e.shiftKey ? selection : [];
                if (!e.shiftKey) setSelection([]);
                interactionRef.current = { kind: 'marquee', start: world, base };
                marqueeRef.current = { a: world, b: world };
            }
            return;
        }

        if (tool === 'eraser' && style.eraserMode === 'partial') {
            const working = erasePartialAlong(world, world, shapes);
            erasePreviewRef.current = working;
            interactionRef.current = { kind: 'erasePartial', last: world, working };
            cursorRef.current = screen;
            scheduleRender();
            return;
        }

        if (tool === 'eraser') {
            const hits = new Set<string>();
            eraseAlong(world, world, hits);
            interactionRef.current = { kind: 'erase', last: world, hits };
            cursorRef.current = screen;
            scheduleRender();
            return;
        }

        if (tool === 'text') {
            const hit = shapeAt(shapes, world, tol);
            startTextEdit(world, hit?.type === 'text' ? hit : undefined);
            return;
        }

        if (isDrawableTool(tool)) {
            sampleRef.current = null;
            draftRef.current = createShape(tool, world, style, nextPressure(e.nativeEvent, screen));
            interactionRef.current = { kind: 'draw', start: world };
            setDrawing(true);
            scheduleRender();
        }
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        const screen = localPoint(e);
        if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, screen);
        if (live.current.tool === 'eraser' && e.pointerType !== 'touch') {
            cursorRef.current = screen;
            scheduleRender();
        }
        const it = interactionRef.current;
        const cam = live.current.camera;

        switch (it.kind) {
            case 'pinch': {
                const pts = [...pointersRef.current.values()];
                if (pts.length < 2) return;
                const [a, b] = pts;
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const zoom = clampZoom(it.startCamera.zoom * (distance(a, b) / it.startDist));
                const k = zoom / it.startCamera.zoom;
                setCamera({ zoom, x: mid.x - (it.startMid.x - it.startCamera.x) * k, y: mid.y - (it.startMid.y - it.startCamera.y) * k });
                return;
            }
            case 'pan':
                setCamera({ ...it.startCamera, x: it.startCamera.x + screen.x - it.startScreen.x, y: it.startCamera.y + screen.y - it.startScreen.y });
                return;
            case 'draw': {
                let draft = draftRef.current;
                if (!draft) return;
                const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
                const samples = draft.type === 'pen' || draft.type === 'highlighter' ? (events.length ? events : [e.nativeEvent]) : [e.nativeEvent];
                for (const ev of samples) {
                    const pt = localPoint(ev);
                    const pressure = draft.type === 'pen' && draft.pressure ? nextPressure(ev, pt) : undefined;
                    draft = updateDraft(draft, it.start, screenToWorld(pt, cam), e.shiftKey, cam.zoom, pressure);
                }
                draftRef.current = draft;
                scheduleRender();
                return;
            }
            case 'move': {
                const world = screenToWorld(screen, cam);
                const dx = world.x - it.start.x;
                const dy = world.y - it.start.y;
                if (!it.moved && Math.hypot(dx, dy) * cam.zoom < 2) return;
                it.moved = true;
                transientRef.current = new Map(it.originals.map((s) => [s.id, translateShape(s, dx, dy)]));
                scheduleRender();
                return;
            }
            case 'marquee': {
                const world = screenToWorld(screen, cam);
                marqueeRef.current = { a: it.start, b: world };
                const box = boundsFromPoints(it.start, world);
                const inside = live.current.shapes.filter((s) => boundsIntersect(getBounds(s), box)).map((s) => s.id);
                setSelection([...new Set([...it.base, ...inside])]);
                scheduleRender();
                return;
            }
            case 'erasePartial': {
                const world = screenToWorld(screen, cam);
                it.working = erasePartialAlong(it.last, world, it.working);
                erasePreviewRef.current = it.working;
                it.last = world;
                cursorRef.current = screen;
                scheduleRender();
                return;
            }
            case 'erase': {
                const world = screenToWorld(screen, cam);
                eraseAlong(it.last, world, it.hits);
                it.last = world;
                cursorRef.current = screen;
                scheduleRender();
                return;
            }
        }
    };

    const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.delete(e.pointerId);
        if (e.pointerType === 'touch') cursorRef.current = null;
        const it = interactionRef.current;
        if (it.kind === 'pinch') {
            if (pointersRef.current.size === 0) interactionRef.current = { kind: 'none' };
            return;
        }
        interactionRef.current = { kind: 'none' };

        switch (it.kind) {
            case 'draw': {
                const final = draftRef.current && finalizeShape(draftRef.current);
                draftRef.current = null;
                setDrawing(false);
                if (final) commit((prev) => [...prev, final]);
                else scheduleRender();
                break;
            }
            case 'move': {
                const moved = transientRef.current;
                transientRef.current = new Map();
                if (it.moved && moved.size) commit((prev) => prev.map((s) => moved.get(s.id) ?? s));
                else if (!it.moved && !e.shiftKey && selection.length > 1) setSelection([it.clickedId]);
                scheduleRender();
                break;
            }
            case 'marquee':
                marqueeRef.current = null;
                scheduleRender();
                break;
            case 'erasePartial': {
                erasePreviewRef.current = null;
                const before = live.current.shapes;
                if (it.working !== before) {
                    const result = it.working;
                    commit(() => result);
                } else scheduleRender();
                break;
            }
            case 'erase':
                fadedRef.current = new Set();
                if (it.hits.size) commit((prev) => prev.filter((s) => !it.hits.has(s.id)));
                else scheduleRender();
                break;
            case 'pan':
                setPanning(false);
                break;
        }
    };

    const onPointerLeave = () => {
        if (cursorRef.current) {
            cursorRef.current = null;
            scheduleRender();
        }
    };

    const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
        if (tool !== 'select') return;
        const cam = live.current.camera;
        const world = screenToWorld(localPoint(e), cam);
        const hit = shapeAt(shapes, world, HIT_TOLERANCE / cam.zoom);
        if (!hit && hasTool('text')) startTextEdit(world);
        else if (hit?.type === 'text') startTextEdit(world, hit);
    };

    // Wheel needs a non-passive listener so we can preventDefault.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e: WheelEvent) => {
            const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
            const dx = e.deltaX * scale;
            const dy = e.deltaY * scale;
            const rect = canvas.getBoundingClientRect();
            const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const factor = Math.exp(-Math.max(-50, Math.min(50, dy)) * 0.01);
                setCamera((c) => zoomAt(c, clampZoom(c.zoom * factor), anchor));
            } else if (captureWheel) {
                e.preventDefault();
                const [px, py] = e.shiftKey && !dx ? [dy, 0] : [dx, dy];
                setCamera((c) => ({ ...c, x: c.x - px, y: c.y - py }));
            }
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, [captureWheel]);

    // ---- keyboard -----------------------------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent | ReactKeyboardEvent) => {
        if (isEditableTarget(e.target) || editingRef.current || helpOpen) return;
        // Let Space/Enter activate focused buttons and links (keyboard accessibility).
        if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLElement && e.target.closest('button, a')) return;
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        let handled = true;

        if (mod && key === 'z') dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        else if (mod && key === 'y') dispatch({ type: 'redo' });
        else if (mod && key === 'a' && hasTool('select')) {
            setToolState('select');
            setSelection(shapes.map((s) => s.id));
        } else if (mod && key === 'd') duplicateSelection();
        else if (mod && key === 'c') clipboardRef.current = selectedShapes;
        else if (mod && key === 'x') {
            clipboardRef.current = selectedShapes;
            deleteSelection();
        } else if (mod && key === 'v') pasteShapes(clipboardRef.current, 24);
        else if (mod && (key === '=' || key === '+')) zoomTo(camera.zoom * 1.2);
        else if (mod && key === '-') zoomTo(camera.zoom / 1.2);
        else if (mod && key === '0') zoomTo(1);
        else if (mod) handled = false;
        else if (e.shiftKey && e.code === 'Digit1') zoomToFit();
        else if (key === 'delete' || key === 'backspace') deleteSelection();
        else if (key === 'escape') {
            cancelInteraction();
            setSelection([]);
            setMenuOpen(false);
        } else if (key.startsWith('arrow') && selectedSet.size) {
            const step = (e.shiftKey ? 10 : 1) / camera.zoom;
            const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
            const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
            commit((prev) => prev.map((s) => (selectedSet.has(s.id) ? translateShape(s, dx, dy) : s)));
        } else if (key === '[' || key === ']') reorderSelection(key === ']');
        else if (e.key === '?') setHelpOpen(true);
        else if (key === ' ') {
            if (!e.repeat) setSpaceDown(true);
        } else {
            const def = toolDefs.find((d) => (d.key === key || d.num === key) && !e.altKey);
            if (def && !e.shiftKey) setTool(def.id);
            else handled = false;
        }
        if (handled) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent | ReactKeyboardEvent) => {
        if (e.key === ' ') setSpaceDown(false);
    };

    const keyHandlers = useRef({ down: handleKeyDown, up: handleKeyUp });
    keyHandlers.current = { down: handleKeyDown, up: handleKeyUp };

    useEffect(() => {
        if (!globalShortcuts) return;
        const down = (e: KeyboardEvent) => keyHandlers.current.down(e);
        const up = (e: KeyboardEvent) => keyHandlers.current.up(e);
        const blur = () => setSpaceDown(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
        };
    }, [globalShortcuts]);

    // ---- derived UI state ---------------------------------------------------------------
    const panelStyle = selectedShapes.length ? styleFromShape(selectedShapes[0], style) : style;
    const showPanel = selectedShapes.length > 0 || DRAWING_TOOLS.includes(tool) || tool === 'eraser' || !!editing;
    const cursor = panning
        ? 'grabbing'
        : spaceDown || tool === 'hand'
            ? 'grab'
            : tool === 'select'
                ? 'default'
                : tool === 'text'
                    ? 'text'
                    : tool === 'eraser'
                        ? 'none'
                        : 'crosshair';

    const menuItems: MenuItem[] = [
        { kind: 'action', label: t.open, icon: <Icons.folder />, onClick: () => fileInputRef.current?.click() },
        { kind: 'action', label: t.saveFile, icon: <Icons.download />, onClick: handleSaveFile },
        { kind: 'action', label: t.exportPng, icon: <Icons.image />, onClick: handleExportPng },
        { kind: 'action', label: t.exportSvg, icon: <Icons.image />, onClick: handleExportSvg },
        { kind: 'action', label: t.copyPng, icon: <Icons.copy />, onClick: handleCopyPng },
        { kind: 'separator' },
        { kind: 'toggle', label: t.grid, icon: <Icons.grid />, checked: grid, onClick: () => setGrid((g) => !g) },
        ...(themeProp
            ? []
            : [
                {
                    kind: 'toggle' as const,
                    label: t.darkMode,
                    icon: <Icons.moon />,
                    checked: theme === 'dark',
                    onClick: () => {
                        const next = theme === 'dark' ? 'light' : 'dark';
                        setOwnTheme(next);
                        onThemeChange?.(next);
                    },
                },
            ]),
        ...(localeProp
            ? []
            : [{ kind: 'action' as const, label: t.language, icon: <Icons.globe />, onClick: () => setOwnLocale(locale === 'en' ? 'zh' : 'en') }]),
        { kind: 'action', label: t.shortcuts, icon: <Icons.keyboard />, onClick: () => setHelpOpen(true), shortcut: '?' },
        ...(githubUrl ? [{ kind: 'link' as const, label: t.github, icon: <Icons.github />, href: githubUrl }] : []),
        { kind: 'separator' },
        { kind: 'action', label: t.clear, icon: <Icons.trash />, onClick: clearCanvas, danger: true },
    ];

    const editorScreen = editing ? worldToScreen({ x: editing.x, y: editing.y }, camera) : null;
    const editorSize = editing ? measureText(editing.text || t.textPlaceholder, editing.fontSize) : null;

    return (
        <div
            ref={containerRef}
            className={`rwb-root rwb-theme-${theme}${className ? ` ${className}` : ''}`}
            style={{ ...styleProp, cursor }}
            tabIndex={0}
            data-theme={theme}
            onKeyDown={globalShortcuts ? undefined : handleKeyDown}
            onKeyUp={globalShortcuts ? undefined : handleKeyUp}
            onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
                const file = e.dataTransfer.files[0];
                if (!file) return;
                e.preventDefault();
                loadFile(file);
            }}
        >
            <canvas
                ref={canvasRef}
                className="rwb-canvas"
                role="img"
                aria-label="Whiteboard canvas"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerLeave}
                onDoubleClick={onDoubleClick}
                onContextMenu={(e) => e.preventDefault()}
            />

            {shapes.length === 0 && !drawing && !editing && <div className="rwb-empty-hint">{t.emptyHint}</div>}

            {editing && editorScreen && editorSize && (
                <textarea
                    className="rwb-text-editor"
                    autoFocus
                    value={editing.text}
                    placeholder={t.textPlaceholder}
                    spellCheck={false}
                    style={{
                        left: editorScreen.x,
                        top: editorScreen.y,
                        width: editorSize.w * camera.zoom + editing.fontSize * camera.zoom,
                        height: editorSize.h * camera.zoom + 2,
                        fontSize: editing.fontSize * camera.zoom,
                        lineHeight: LINE_HEIGHT,
                        fontFamily: FONT_FAMILY,
                        color: resolveColor(editing.color, theme),
                    }}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, text: e.target.value } : cur))}
                    onBlur={commitText}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                            e.preventDefault();
                            commitText();
                        }
                    }}
                />
            )}

            <div className="rwb-top">
                <div className="rwb-top-left">
                    {showMenu && (
                        <div className="rwb-menu-anchor">
                            <IconButton label={t.menu} active={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="rwb-island-btn" tooltip="bottom" tooltipAlign="start">
                                <Icons.menu />
                            </IconButton>
                            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} label={t.menu} />
                        </div>
                    )}
                    {showPanel && (
                        <IconButton label={t.style} active={panelOpen} onClick={() => setPanelOpen((o) => !o)} className="rwb-island-btn rwb-panel-toggle" tooltip="bottom">
                            <Icons.palette />
                        </IconButton>
                    )}
                </div>
                <Toolbar tools={toolDefs} tool={tool} onSelect={setTool} t={t} />
            </div>

            {showPanel && (
                <div className={`rwb-panel-wrap${panelOpen ? ' is-open' : ''}`}>
                    <StylePanel
                        t={t}
                        theme={theme}
                        tool={editing ? 'text' : tool}
                        style={editing ? { ...panelStyle, color: editing.color, fontSize: editing.fontSize } : panelStyle}
                        selected={selectedShapes}
                        onChange={updateStyle}
                        onDuplicate={duplicateSelection}
                        onDelete={deleteSelection}
                        onFront={() => reorderSelection(true)}
                        onBack={() => reorderSelection(false)}
                    />
                </div>
            )}

            <div className="rwb-bottom">
                <div className="rwb-island rwb-row">
                    <IconButton label={t.zoomOut} shortcut={`${MOD}+-`} onClick={() => zoomTo(camera.zoom / 1.2)} tooltipAlign="start">
                        <Icons.minus />
                    </IconButton>
                    <button type="button" className="rwb-zoom-label" aria-label={t.resetZoom} onClick={() => zoomTo(1)}>
                        {Math.round(camera.zoom * 100)}%
                        <Tooltip label={t.resetZoom} shortcut={`${MOD}+0`} />
                    </button>
                    <IconButton label={t.zoomIn} shortcut={`${MOD}++`} onClick={() => zoomTo(camera.zoom * 1.2)}>
                        <Icons.plus />
                    </IconButton>
                    <IconButton label={t.fitContent} shortcut="Shift+1" onClick={zoomToFit}>
                        <Icons.fit />
                    </IconButton>
                </div>
                <div className="rwb-island rwb-row">
                    <IconButton label={t.undo} shortcut={`${MOD}+Z`} disabled={!history.past.length} onClick={() => dispatch({ type: 'undo' })}>
                        <Icons.undo />
                    </IconButton>
                    <IconButton label={t.redo} shortcut={`${MOD}+Shift+Z`} disabled={!history.future.length} onClick={() => dispatch({ type: 'redo' })}>
                        <Icons.redo />
                    </IconButton>
                </div>
            </div>

            {toast && (
                <div key={toast.id} className="rwb-toast" role="status">
                    {toast.message}
                </div>
            )}

            {helpOpen && <HelpDialog t={t} onClose={() => setHelpOpen(false)} />}

            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadFile(file);
                    e.target.value = '';
                }}
            />
        </div>
    );
});
