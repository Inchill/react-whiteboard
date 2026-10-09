# Contributing

Thanks for helping improve react-whiteboard! 欢迎贡献，中文 / English 均可。

## Setup

```bash
git clone https://github.com/Inchill/react-whiteboard.git
cd react-whiteboard
corepack enable   # uses the pnpm version pinned in package.json
pnpm install
pnpm dev
```

Node.js 24+ and pnpm 10+ are required (`.nvmrc` pins 24; installs fail on older Node because of `engine-strict`). Please don't commit a `package-lock.json` or `yarn.lock`.

## Before opening a pull request

```bash
pnpm lint
pnpm typecheck
pnpm test
```

- Keep the library (`src/whiteboard`) free of runtime dependencies other than React.
- Add or update tests in `tests/` for behaviour changes (`tests/<module>.test.ts`). Pure logic lives in `geometry.ts`, `shapes.ts`, `history.ts` and `export.ts`, which are easy to unit test.
- New UI strings go into **both** locales in `src/whiteboard/i18n.ts`.
- For UI changes, include a screenshot or GIF in the PR.

## Project layout

| Path | What it is |
| --- | --- |
| `src/whiteboard/types.ts` | Shape and state types |
| `src/whiteboard/geometry.ts` | Bounds, hit-testing, camera math, path smoothing |
| `src/whiteboard/shapes.ts` | Creating / updating / styling shapes |
| `src/whiteboard/render.ts` | Canvas renderer |
| `src/whiteboard/export.ts` | SVG / PNG / JSON import & export |
| `src/whiteboard/history.ts` | Undo/redo reducer |
| `src/whiteboard/Whiteboard.tsx` | The component: pointer, keyboard and UI wiring |
| `src/site`, `src/app` | Website and the full-screen board |
| `tests/` | Vitest tests; `tests/setup.ts` stubs canvas and ResizeObserver for jsdom |

## Adding a shape type

1. Add the type to `Shape` in `types.ts`.
2. Handle it in `getBounds`, `hitTest`, `translateShape` (`geometry.ts`), `createShape` / `updateDraft` / `finalizeShape` (`shapes.ts`), `drawShape` (`render.ts`), `shapeToSvg` and `isValidShape` (`export.ts`).
3. Add a tool entry in `constants.ts`, an icon in `icons.tsx` and labels in `i18n.ts`.

## Commit messages

Conventional Commits are preferred: `feat: …`, `fix: …`, `docs: …`, `chore: …`.
