import { useEffect, useRef, type ReactNode } from 'react';
import { DRAWING_TOOLS, FONT_SIZES, MOD, PALETTE, THEME_COLORS, TOOLS, type ToolDef } from './constants';
import { Icons } from './icons';
import type { Messages } from './i18n';
import { INK, type FillStyle, type Shape, type StrokeStyle, type StyleState, type Theme, type Tool } from './types';


type IconButtonProps = {
    label: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    children: ReactNode;
    shortcut?: string;
    /** Small key label in the button's corner. */
    hint?: string;
    className?: string;
    /** Where the hover tooltip appears relative to the button. */
    tooltip?: 'top' | 'bottom';
    /** Align the tooltip's left edge with the button (for buttons near the board's left edge). */
    tooltipAlign?: 'center' | 'start';
};

export function Tooltip({ label, shortcut, placement = 'top', align = 'center' }: { label: string; shortcut?: string; placement?: 'top' | 'bottom'; align?: 'center' | 'start' }) {
    return (
        <span className={`rwb-tip rwb-tip-${placement}${align === 'start' ? ' rwb-tip-start' : ''}`} aria-hidden="true">
            {label}
            {shortcut ? <kbd>{shortcut}</kbd> : null}
        </span>
    );
}

export function IconButton({ label, onClick, active, disabled, children, shortcut, hint, className, tooltip = 'top', tooltipAlign = 'center' }: IconButtonProps) {
    return (
        <button
            type="button"
            className={`rwb-icon-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
            aria-label={label}
            aria-pressed={active === undefined ? undefined : active}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
            {hint ? <span className="rwb-key-hint">{hint}</span> : null}
            <Tooltip label={label} shortcut={shortcut} placement={tooltip} align={tooltipAlign} />
        </button>
    );
}

export function Toolbar({ tools, tool, onSelect, t }: { tools: ToolDef[]; tool: Tool; onSelect: (tool: Tool) => void; t: Messages }) {
    return (
        <div className="rwb-island rwb-toolbar" role="toolbar" aria-label="Tools">
            {tools.map((def, i) => {
                const Icon = Icons[def.id];
                return (
                    <span key={def.id} className="rwb-toolbar-item">
                        {i > 0 && tools[i - 1].group !== def.group && <span className="rwb-divider" aria-hidden="true" />}
                        <IconButton
                            label={t.tools[def.id]}
                            active={tool === def.id}
                            onClick={() => onSelect(def.id)}
                            shortcut={def.num ? `${def.key.toUpperCase()} / ${def.num}` : def.key.toUpperCase()}
                            hint={def.num ?? def.key.toUpperCase()}
                            tooltip="bottom"
                        >
                            <Icon />
                        </IconButton>
                    </span>
                );
            })}
        </div>
    );
}

type StylePanelProps = {
    t: Messages;
    theme: Theme;
    tool: Tool;
    style: StyleState;
    selected: Shape[];
    onChange: (patch: Partial<StyleState>) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onFront: () => void;
    onBack: () => void;
};

export function StylePanel({ t, theme, tool, style, selected, onChange, onDuplicate, onDelete, onFront, onBack }: StylePanelProps) {
    if (tool === 'eraser' && selected.length === 0) {
        return (
            <div className="rwb-island rwb-style-panel" aria-label={t.style}>
                <fieldset>
                    <legend>{t.eraserMode}</legend>
                    <div className="rwb-segmented rwb-segmented-text">
                        {(
                            [
                                ['partial', t.eraserPartial, t.eraserPartialHint],
                                ['stroke', t.eraserStroke, t.eraserStrokeHint],
                            ] as const
                        ).map(([mode, label, hint]) => (
                            <button
                                key={mode}
                                type="button"
                                title={hint}
                                aria-pressed={style.eraserMode === mode}
                                className={style.eraserMode === mode ? 'is-active' : ''}
                                onClick={() => onChange({ eraserMode: mode })}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend>
                        {t.eraserSize} <output>{style.eraserSize}</output>
                    </legend>
                    <input
                        className="rwb-range"
                        type="range"
                        min={4}
                        max={60}
                        value={style.eraserSize}
                        aria-label={t.eraserSize}
                        onChange={(e) => onChange({ eraserSize: +e.target.value })}
                    />
                </fieldset>
            </div>
        );
    }

    const items: (Shape['type'] | 'pressurePen')[] = selected.length
        ? selected.map((s) => (s.type === 'pen' && s.pressure ? 'pressurePen' : s.type))
        : DRAWING_TOOLS.includes(tool)
            ? [tool === 'pen' && style.pressure ? 'pressurePen' : (tool as Shape['type'])]
            : [];
    const types = new Set(items);
    const onlyText = types.size > 0 && [...types].every((x) => x === 'text');
    const showStroke = !onlyText;
    const showStrokeStyle = [...types].some((x) => x !== 'text' && x !== 'highlighter' && x !== 'pressurePen');
    const showFill = [...types].some((x) => x === 'rect' || x === 'ellipse' || x === 'triangle');
    const showFont = types.has('text');
    const showPressure = tool === 'pen' && selected.length === 0;
    const customActive = !PALETTE.includes(style.color);

    return (
        <div className="rwb-island rwb-style-panel" aria-label={t.style}>
            <fieldset>
                <legend>{t.color}</legend>
                <div className="rwb-swatches">
                    {PALETTE.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`rwb-swatch${style.color === c ? ' is-active' : ''}`}
                            style={{ background: c === INK ? THEME_COLORS[theme].ink : c }}
                            aria-label={c === INK ? 'ink' : c}
                            aria-pressed={style.color === c}
                            onClick={() => onChange({ color: c })}
                        />
                    ))}
                    <label
                        className={`rwb-swatch rwb-swatch-custom${customActive ? ' is-active' : ''}`}
                        title={t.customColor}
                        style={customActive ? { background: style.color } : undefined}
                    >
                        <input
                            type="color"
                            aria-label={t.customColor}
                            value={customActive ? style.color : '#000000'}
                            onChange={(e) => onChange({ color: e.target.value })}
                        />
                    </label>
                </div>
            </fieldset>

            {showStroke && (
                <fieldset>
                    <legend>
                        {t.strokeWidth} <output>{style.strokeWidth}</output>
                    </legend>
                    <input
                        className="rwb-range"
                        type="range"
                        min={1}
                        max={32}
                        value={style.strokeWidth}
                        aria-label={t.strokeWidth}
                        onChange={(e) => onChange({ strokeWidth: +e.target.value })}
                    />
                </fieldset>
            )}

            {showPressure && (
                <label className="rwb-toggle" title={t.pressureHint}>
                    <span>{t.pressure}</span>
                    <input type="checkbox" checked={style.pressure} onChange={(e) => onChange({ pressure: e.target.checked })} />
                    <span className={`rwb-switch${style.pressure ? ' is-on' : ''}`} aria-hidden="true" />
                </label>
            )}

            {showStrokeStyle && (
                <fieldset>
                    <legend>{t.strokeStyle}</legend>
                    <Segmented<StrokeStyle>
                        value={style.strokeStyle}
                        onChange={(v) => onChange({ strokeStyle: v })}
                        options={[
                            { value: 'solid', label: t.solid, icon: <path d="M4 12h16" /> },
                            { value: 'dashed', label: t.dashed, icon: <path d="M4 12h4M10 12h4M16 12h4" /> },
                            { value: 'dotted', label: t.dotted, icon: <path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01" strokeWidth={2.6} /> },
                        ]}
                    />
                </fieldset>
            )}

            {showFill && (
                <fieldset>
                    <legend>{t.fill}</legend>
                    <Segmented<FillStyle>
                        value={style.fill}
                        onChange={(v) => onChange({ fill: v })}
                        options={[
                            { value: 'none', label: t.fillNone, icon: <rect x="5" y="5" width="14" height="14" rx="2" /> },
                            {
                                value: 'semi',
                                label: t.fillSemi,
                                icon: <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fillOpacity=".3" />,
                            },
                            {
                                value: 'solid',
                                label: t.fillSolid,
                                icon: <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />,
                            },
                        ]}
                    />
                </fieldset>
            )}

            {showFont && (
                <fieldset>
                    <legend>{t.fontSize}</legend>
                    <div className="rwb-segmented">
                        {FONT_SIZES.map((size, i) => (
                            <button
                                key={size}
                                type="button"
                                className={style.fontSize === size ? 'is-active' : ''}
                                aria-pressed={style.fontSize === size}
                                onClick={() => onChange({ fontSize: size })}
                            >
                                {['S', 'M', 'L', 'XL'][i]}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {selected.length > 0 && (
                <fieldset>
                    <legend>{t.actions}</legend>
                    <div className="rwb-row">
                        <IconButton label={t.duplicate} shortcut={`${MOD}+D`} onClick={onDuplicate} tooltipAlign="start">
                            <Icons.duplicate />
                        </IconButton>
                        <IconButton label={t.sendToBack} shortcut="[" onClick={onBack}>
                            <Icons.back />
                        </IconButton>
                        <IconButton label={t.bringToFront} shortcut="]" onClick={onFront}>
                            <Icons.front />
                        </IconButton>
                        <IconButton label={t.delete} shortcut="Delete" onClick={onDelete} className="rwb-danger">
                            <Icons.trash />
                        </IconButton>
                    </div>
                </fieldset>
            )}
        </div>
    );
}

function Segmented<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; icon: ReactNode }[];
}) {
    return (
        <div className="rwb-segmented">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    title={o.label}
                    aria-label={o.label}
                    aria-pressed={value === o.value}
                    className={value === o.value ? 'is-active' : ''}
                    onClick={() => onChange(o.value)}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                        {o.icon}
                    </svg>
                </button>
            ))}
        </div>
    );
}

export type MenuItem =
    | { kind: 'action'; label: string; icon: ReactNode; onClick: () => void; shortcut?: string; danger?: boolean }
    | { kind: 'toggle'; label: string; icon: ReactNode; checked: boolean; onClick: () => void }
    | { kind: 'link'; label: string; icon: ReactNode; href: string }
    | { kind: 'separator' };

export function Menu({ open, onClose, items, label }: { open: boolean; onClose: () => void; items: MenuItem[]; label: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} className="rwb-island rwb-menu" role="menu" aria-label={label}>
            {items.map((item, i) => {
                if (item.kind === 'separator') return <div key={i} className="rwb-menu-sep" role="separator" />;
                if (item.kind === 'link') {
                    return (
                        <a key={i} className="rwb-menu-item" role="menuitem" href={item.href} target="_blank" rel="noreferrer" onClick={onClose}>
                            {item.icon}
                            <span>{item.label}</span>
                        </a>
                    );
                }
                return (
                    <button
                        key={i}
                        type="button"
                        role={item.kind === 'toggle' ? 'menuitemcheckbox' : 'menuitem'}
                        aria-checked={item.kind === 'toggle' ? item.checked : undefined}
                        className={`rwb-menu-item${item.kind === 'action' && item.danger ? ' rwb-danger' : ''}`}
                        onClick={() => {
                            item.onClick();
                            if (item.kind === 'action') onClose();
                        }}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.kind === 'toggle' ? (
                            <span className={`rwb-switch${item.checked ? ' is-on' : ''}`} aria-hidden="true" />
                        ) : item.shortcut ? (
                            <kbd>{item.shortcut}</kbd>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

export function HelpDialog({ t, onClose }: { t: Messages; onClose: () => void }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onClose]);
    const s = t.shortcutItems;
    const groups: { title: string; rows: [string, string[]][] }[] = [
        {
            title: t.shortcutGroups.tools,
            rows: TOOLS.map((d) => [t.tools[d.id], d.num ? [d.key.toUpperCase(), d.num] : [d.key.toUpperCase()]]),
        },
        {
            title: t.shortcutGroups.editor,
            rows: [
                [s.undo, [`${MOD}+Z`]],
                [s.redo, [`${MOD}+Shift+Z`, `${MOD}+Y`]],
                [s.selectAll, [`${MOD}+A`]],
                [s.duplicate, [`${MOD}+D`]],
                [s.copyPaste, [`${MOD}+C`, `${MOD}+V`]],
                [s.delete, ['Delete', 'Backspace']],
                [s.nudge, ['↑ ↓ ← →']],
                [s.order, ['[', ']']],
                [s.deselect, ['Esc']],
                [s.constrain, ['Shift']],
            ],
        },
        {
            title: t.shortcutGroups.view,
            rows: [
                [s.pan, ['Space', 'H']],
                [s.wheel, ['Wheel']],
                [s.zoom, [`${MOD}+Wheel`, `${MOD}+ +/-`]],
                [s.zoomReset, [`${MOD}+0`]],
                [s.fit, ['Shift+1']],
                [s.help, ['?']],
            ],
        },
    ];
    return (
        <div className="rwb-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rwb-island rwb-dialog" role="dialog" aria-modal="true" aria-label={t.shortcuts}>
                <header>
                    <h2>{t.shortcuts}</h2>
                    <button ref={closeRef} type="button" className="rwb-icon-btn" aria-label={t.close} onClick={onClose}>
                        <Icons.close />
                    </button>
                </header>
                <div className="rwb-help-grid">
                    {groups.map((g) => (
                        <section key={g.title}>
                            <h3>{g.title}</h3>
                            <dl>
                                {g.rows.map(([label, keys]) => (
                                    <div key={label}>
                                        <dt>{label}</dt>
                                        <dd>
                                            {keys.map((k) => (
                                                <kbd key={k}>{k}</kbd>
                                            ))}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
