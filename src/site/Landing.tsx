import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Whiteboard, type WhiteboardHandle } from '../whiteboard';
import { detectLocale } from '../whiteboard/i18n';
import { Icons } from '../whiteboard/icons';
import type { Locale, Theme } from '../whiteboard/types';
import { SITE_COPY } from './copy';
import { demoShapes } from './demo';
import { PACKAGE_NAME, REPO_URL } from './links';

const PREF_KEY = 'react-whiteboard:site';

function readPrefs(): { theme?: Theme; locale?: Locale } {
    try {
        return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    } catch {
        return {};
    }
}

const SNIPPETS = [
    `pnpm add ${PACKAGE_NAME}`,
    `import '${PACKAGE_NAME}/style.css';`,
    `import { Whiteboard } from '${PACKAGE_NAME}';

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Whiteboard />
    </div>
  );
}`,
];

/** Icons for the feature notes, in the same order as SITE_COPY.features. */
const FEATURE_ICONS = [Icons.rect, Icons.select, Icons.fit, Icons.eraser, Icons.image, Icons.keyboard, Icons.pen, Icons.moon];
const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green'];

/** A tiny highlighter for the three snippets above — just enough to read like code. */
function highlight(code: string): ReactNode[] {
    const pattern = /('[^']*')|\b(import|from|export|default|function|return)\b|(<\/?[A-Za-z]+|\/?>)|(pnpm|add)\b/g;
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(code))) {
        if (m.index > last) out.push(code.slice(last, m.index));
        const cls = m[1] ? 'tok-str' : m[2] ? 'tok-kw' : m[3] ? 'tok-tag' : 'tok-cmd';
        out.push(
            <span key={m.index} className={cls}>
                {m[0]}
            </span>,
        );
        last = m.index + m[0].length;
    }
    out.push(code.slice(last));
    return out;
}

function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(id);
    }, [copied]);
    return (
        <div className="code">
            <pre>
                <code>{highlight(code)}</code>
            </pre>
            <button
                type="button"
                className="code-copy"
                onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true), () => undefined)}
            >
                {copied ? copiedLabel : copyLabel}
            </button>
        </div>
    );
}

/** Hand-drawn marker arrow used for the annotations around the demo board. */
function ScribbleArrow({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 120 90" fill="none" aria-hidden="true">
            <path d="M8 10c30-6 62 2 80 24 9 11 13 24 14 40" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M89 62l13 14 9-17" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function Landing() {
    const [prefs] = useState(readPrefs);
    const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    const [theme, setTheme] = useState<Theme>(prefs.theme ?? (systemDark ? 'dark' : 'light'));
    const [locale, setLocale] = useState<Locale>(prefs.locale ?? detectLocale());
    const boardRef = useRef<WhiteboardHandle>(null);
    const dirtyRef = useRef(false);
    // setShapes() from the page itself triggers onChange; don't count that as the visitor drawing.
    const programmaticRef = useRef(false);
    const c = SITE_COPY[locale];

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
        document.title = locale === 'zh' ? 'react-whiteboard —— 开源 React 白板组件' : 'react-whiteboard — an open-source whiteboard for React';
        try {
            localStorage.setItem(PREF_KEY, JSON.stringify({ theme, locale }));
        } catch {
            /* storage unavailable */
        }
    }, [theme, locale]);

    // Re-label the demo sketch when the language changes, unless the visitor has drawn on it.
    const firstLocale = useRef(locale);
    useEffect(() => {
        if (locale === firstLocale.current || dirtyRef.current) return;
        programmaticRef.current = true;
        boardRef.current?.setShapes(demoShapes(locale), { history: false });
    }, [locale]);

    const resetDemo = () => {
        programmaticRef.current = true;
        dirtyRef.current = false;
        boardRef.current?.setShapes(demoShapes(locale), { history: false });
        requestAnimationFrame(() => boardRef.current?.zoomToFit());
    };

    return (
        <div className="page">
            <a className="skip" href="#main">
                Skip to content
            </a>
            <header className="site-header">
                <div className="wrap header-inner">
                    <a className="brand" href="./">
                        <img src="./favicon.svg" alt="" width="30" height="30" />
                        <span>react-whiteboard</span>
                    </a>
                    <nav aria-label="Primary">
                        <a href="#start">{c.nav.use}</a>
                        <a href="#features">{c.nav.features}</a>
                        <a href="#api">{c.nav.api}</a>
                    </nav>
                    <div className="header-actions">
                        <button type="button" className="text-btn" onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}>
                            {c.langToggle}
                        </button>
                        <button
                            type="button"
                            className="icon-only"
                            aria-label={c.themeToggle}
                            title={c.themeToggle}
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? <Icons.sun /> : <Icons.moon />}
                        </button>
                        <a className="icon-only" href={REPO_URL} aria-label="GitHub" title="GitHub">
                            <Icons.github />
                        </a>
                    </div>
                </div>
            </header>

            <main id="main">
                <section className="hero wrap">
                    <div className="hero-text">
                        <h1>
                            {c.title.split('\n').map((line) => (
                                <span key={line}>{line}</span>
                            ))}
                        </h1>
                        <div className="hero-side">
                            <p className="lede">{c.lede}</p>
                            <div className="cta">
                                <a className="btn btn-primary" href="./board/">
                                    <Icons.pen size={18} />
                                    {c.openBoard}
                                </a>
                                <a className="btn btn-ghost" href={REPO_URL}>
                                    <Icons.github size={18} />
                                    {c.github}
                                </a>
                            </div>
                            <ul className="badges" aria-label="Facts">
                                {c.badges.map((b) => (
                                    <li key={b}>{b}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <figure className="board-frame">
                        <p className="note note-tools" aria-hidden="true">
                            {c.noteTools}
                            <ScribbleArrow className="note-arrow" />
                        </p>
                        <p className="note note-draw" aria-hidden="true">
                            {c.noteDraw}
                        </p>
                        <div className="board-surface">
                            <Whiteboard
                                ref={boardRef}
                                storageKey={null}
                                initialShapes={demoShapes(locale)}
                                theme={theme}
                                locale={locale}
                                initialTool="pen"
                                globalShortcuts={false}
                                captureWheel={false}
                                githubUrl={REPO_URL}
                                onChange={() => {
                                    if (programmaticRef.current) programmaticRef.current = false;
                                    else dirtyRef.current = true;
                                }}
                            />
                        </div>
                        <div className="board-tray" aria-hidden="true">
                            <span className="marker marker-blue" />
                            <span className="marker marker-red" />
                            <span className="marker marker-green" />
                            <span className="eraser-block" />
                        </div>
                        <figcaption>
                            <span>{c.caption}</span>
                            <button type="button" className="text-btn" onClick={resetDemo}>
                                {c.reset}
                            </button>
                        </figcaption>
                    </figure>
                </section>

                <section id="start" className="section wrap">
                    <h2>{c.useTitle}</h2>
                    <p className="section-lede">{c.useLede}</p>
                    <ol className="steps">
                        {c.steps.map((step, i) => (
                            <li key={step.title}>
                                <div className="step-text">
                                    <h3>{step.title}</h3>
                                    <p>{step.body}</p>
                                </div>
                                <CodeBlock code={SNIPPETS[i]} copyLabel={c.copy} copiedLabel={c.copied} />
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="features" className="section wrap">
                    <h2>{c.featuresTitle}</h2>
                    <ul className="notes">
                        {c.features.map((f, i) => {
                            const Icon = FEATURE_ICONS[i] ?? Icons.pen;
                            return (
                                <li key={f.title} className={`sticky sticky-${NOTE_COLORS[i % NOTE_COLORS.length]}`}>
                                    <Icon size={22} />
                                    <h3>{f.title}</h3>
                                    <p>{f.body}</p>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section id="api" className="section wrap">
                    <h2>{c.apiTitle}</h2>
                    <p className="section-lede">{c.apiLede}</p>
                    <h3 className="table-title">{c.propsHeading}</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>{c.col.name}</th>
                                    <th>{c.col.type}</th>
                                    <th>{c.col.desc}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {c.props.map(([name, type, desc]) => (
                                    <tr key={name}>
                                        <td>
                                            <code>{name}</code>
                                        </td>
                                        <td>
                                            <code className="type">{type}</code>
                                        </td>
                                        <td>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <h3 className="table-title">{c.handleHeading}</h3>
                    <div className="table-wrap">
                        <table>
                            <tbody>
                                {c.handle.map(([name, desc]) => (
                                    <tr key={name}>
                                        <td>
                                            <code>{name}</code>
                                        </td>
                                        <td>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="wrap">
                    <div className="closing">
                        <h2>{c.endTitle}</h2>
                        <p>{c.endBody}</p>
                        <a className="btn btn-light" href="./board/">
                            <Icons.pen size={18} />
                            {c.openBoard}
                        </a>
                        <svg className="closing-doodle" viewBox="0 0 260 120" fill="none" aria-hidden="true">
                            <path d="M10 90c22-40 40-60 58-40s18 46 42 30 24-70 52-60 18 50 44 50 30-30 44-46" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </section>
            </main>

            <footer className="site-footer wrap">
                <span>{c.footer}</span>
                <a href={REPO_URL}>GitHub</a>
            </footer>
        </div>
    );
}
