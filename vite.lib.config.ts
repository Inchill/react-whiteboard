import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build: `pnpm build:lib` → dist/lib (ESM + CJS + style.css + .d.ts)
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist/lib',
        emptyOutDir: true,
        copyPublicDir: false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/whiteboard/index.ts'),
            name: 'ReactWhiteboard',
            fileName: 'react-whiteboard',
            formats: ['es', 'cjs'],
            cssFileName: 'style',
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
        },
    },
});
