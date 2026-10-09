/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works on GitHub Pages (/react-whiteboard/),
// a custom domain, or any static host sub-path.
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'dist/site',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                board: resolve(import.meta.dirname, 'board/index.html'),
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        css: false,
        include: ['tests/**/*.test.{ts,tsx}'],
    },
});
