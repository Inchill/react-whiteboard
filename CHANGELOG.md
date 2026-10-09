# Changelog

## 1.0.0 — 2026-10-08

A rewrite of the original canvas drawing prototype.

### Added
- Vector scene model: every stroke is a selectable, movable, restylable shape.
- Tools: select, hand, pen, highlighter, eraser (removes whole strokes), line, arrow, rectangle, ellipse, triangle, text.
- Infinite canvas with pan, zoom, pinch-zoom and zoom-to-fit.
- Selection: click, Shift-click, marquee, move, duplicate, copy/paste, reorder, delete, nudge.
- Style panel: palette + custom color, stroke width, solid/dashed/dotted, fill (none/translucent/solid), font size.
- Export to PNG, SVG and JSON; open JSON via menu or drag-and-drop; copy PNG to clipboard.
- Pressure-sensitive pen strokes: width follows stylus pressure, or drawing speed with a mouse or finger, with tapered ends (toggle in the style panel).
- Rub-out eraser that cuts freehand strokes where you swipe, with adjustable size; the whole-stroke eraser is still available.
- `tools` prop to choose which tools the toolbar shows, e.g. a pen / highlighter / eraser doodle pad.
- Hover tooltips with names and shortcuts.
- Keyboard shortcuts and a shortcuts dialog (`?`).
- Dark mode, English / Chinese UI, autosave to localStorage.
- Imperative ref API (`getShapes`, `setShapes`, `exportPng`, …) and standalone export helpers.
- Library build (`@inchill/react-whiteboard`, ESM + CJS + types).
- Project website with a live demo, deployed to GitHub Pages.
- Unit and component tests (Vitest), ESLint, CI workflows.

### Changed
- Migrated from Create React App to Vite, React 19 and TypeScript 5.9.
- Switched from npm to pnpm; Node.js 24+ is now required.

### Fixed
- Undo/redo history corruption, canvas being wiped on window resize, event listeners never being removed, eraser painting white instead of erasing, triangle tool id typo, PNG saved with a `.jpg` name.
