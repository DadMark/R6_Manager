import { fileURLToPath, URL } from 'node:url';
// From vitest/config rather than vite so the `test` block typechecks.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Relative base so `dist/` deploys to any static host (GitHub Pages included).
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': r('./src/engine'),
      '@content': r('./src/content'),
      '@state': r('./src/state'),
      '@ui': r('./src/ui'),
    },
  },
  test: {
    // Engine tests must run in Node with no DOM.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
