import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: ReactNode) {
    return function Icon({ size = 20, ...props }: IconProps) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
                {...props}
            >
                {paths}
            </svg>
        );
    };
}

export const Icons = {
    select: make(<path d="M5 3.5l13 6.2-5.6 1.7 3.6 6.4-2.4 1.3-3.6-6.4L5.6 17z" />),
    hand: make(
        <path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-6.5V4a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V12m0-4a1.5 1.5 0 013 0v6.5a6.5 6.5 0 01-6.5 6.5h-1.3a6 6 0 01-4.5-2l-3.3-3.7a1.6 1.6 0 012.3-2.2L8 15" />,
    ),
    pen: make(
        <>
            <path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4z" />
            <path d="M14.5 5.5l3 3" />
        </>,
    ),
    highlighter: make(
        <>
            <path d="M9 11l-5 5v3h6l2-2" />
            <path d="M20.3 7.7l-8.6 8.6-4-4 8.6-8.6a1.4 1.4 0 012 0l2 2a1.4 1.4 0 010 2z" />
        </>,
    ),
    eraser: make(
        <>
            <path d="M7 21h12" />
            <path d="M5.6 15.6l9-9a2 2 0 012.8 0l2 2a2 2 0 010 2.8L12 18.8l-2.2 2.2H7.5l-1.9-1.9a2.5 2.5 0 010-3.5z" />
            <path d="M9.5 11.5l5 5" />
        </>,
    ),
    line: make(<path d="M5 19L19 5" />),
    arrow: make(
        <>
            <path d="M5 19L19 5" />
            <path d="M10 5h9v9" />
        </>,
    ),
    rect: make(<rect x="4" y="5" width="16" height="14" rx="1.5" />),
    ellipse: make(<ellipse cx="12" cy="12" rx="8.5" ry="7" />),
    triangle: make(<path d="M12 4.5l8.5 15h-17z" />),
    text: make(
        <>
            <path d="M5 6V4.5h14V6" />
            <path d="M12 4.5v15" />
            <path d="M9 19.5h6" />
        </>,
    ),
    undo: make(
        <>
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
        </>,
    ),
    redo: make(
        <>
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 000 11H13" />
        </>,
    ),
    plus: make(<path d="M12 5v14M5 12h14" />),
    minus: make(<path d="M5 12h14" />),
    menu: make(<path d="M4 7h16M4 12h16M4 17h16" />),
    trash: make(
        <>
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="M5.5 7l1 12a2 2 0 002 2h7a2 2 0 002-2l1-12" />
            <path d="M9 7V4.5h6V7" />
        </>,
    ),
    download: make(
        <>
            <path d="M12 4v11" />
            <path d="M7 10.5l5 5 5-5" />
            <path d="M5 20h14" />
        </>,
    ),
    image: make(
        <>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M20.5 16l-5-5-9 8.5" />
        </>,
    ),
    folder: make(<path d="M3.5 7.5a2 2 0 012-2h4l2 2.5h7a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />),
    copy: make(
        <>
            <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
            <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2h3" />
        </>,
    ),
    grid: make(
        <>
            <circle cx="6" cy="6" r=".8" />
            <circle cx="12" cy="6" r=".8" />
            <circle cx="18" cy="6" r=".8" />
            <circle cx="6" cy="12" r=".8" />
            <circle cx="12" cy="12" r=".8" />
            <circle cx="18" cy="12" r=".8" />
            <circle cx="6" cy="18" r=".8" />
            <circle cx="12" cy="18" r=".8" />
            <circle cx="18" cy="18" r=".8" />
        </>,
    ),
    moon: make(<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />),
    sun: make(
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
        </>,
    ),
    globe: make(
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" />
        </>,
    ),
    keyboard: make(
        <>
            <rect x="2.5" y="6" width="19" height="12" rx="2" />
            <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
        </>,
    ),
    github: make(
        <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 00-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
    ),
    duplicate: make(
        <>
            <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
            <path d="M14.5 12v5M12 14.5h5" />
            <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2h3" />
        </>,
    ),
    front: make(
        <>
            <rect x="8" y="8" width="12" height="12" rx="1.5" fill="currentColor" fillOpacity=".25" />
            <path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" />
        </>,
    ),
    back: make(
        <>
            <rect x="4" y="4" width="12" height="12" rx="1.5" fill="currentColor" fillOpacity=".25" />
            <path d="M8 16v2.5A1.5 1.5 0 009.5 20h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0018.5 8H16" />
        </>,
    ),
    palette: make(
        <>
            <path d="M12 3.5a8.5 8.5 0 000 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.2-1.6-1.2-2.9 0-1 .8-1.6 1.8-1.6h2.1a4 4 0 004-4c0-3.9-3.8-6.8-8.5-6.8z" />
            <circle cx="7.5" cy="11" r="1" />
            <circle cx="10" cy="7.2" r="1" />
            <circle cx="14.5" cy="7.2" r="1" />
        </>,
    ),
    close: make(<path d="M6 6l12 12M18 6L6 18" />),
    // Zoom to fit: a viewfinder framing the content.
    fit: make(
        <>
            <path d="M3.5 8V5.5a2 2 0 012-2H8M16 3.5h2.5a2 2 0 012 2V8M20.5 16v2.5a2 2 0 01-2 2H16M8 20.5H5.5a2 2 0 01-2-2V16" />
            <rect x="8" y="8" width="8" height="8" rx="1.5" />
        </>,
    ),
};
