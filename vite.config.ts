import { fileURLToPath, URL } from 'node:url';
// From vitest/config rather than vite so the `test` block typechecks.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// `VITE_CONTENT_PACK=generic` redirects the licensed operator module to the
// IP-free one at BUILD time, so the unselected pack's names never reach the
// bundle. Doing this with a runtime branch would ship both.
const useGenericPack = process.env.VITE_CONTENT_PACK === 'generic';

export default defineConfig({
  // Relative base so `dist/` deploys to any static host (GitHub Pages included).
  base: './',
  plugins: [react()],
  resolve: {
    // Array form: `find` is matched against the IMPORT SPECIFIER, so the
    // operator-pack redirect has to target the relative path as written in
    // src/content/index.ts, not the resolved file. It must also come first,
    // since aliases are applied in order.
    alias: [
      ...(useGenericPack
        ? [
            {
              find: /^\.\/operators\.licensed$/,
              replacement: r('./src/content/operators.generic.ts'),
            },
          ]
        : []),
      { find: '@engine', replacement: r('./src/engine') },
      { find: '@content', replacement: r('./src/content') },
      { find: '@state', replacement: r('./src/state') },
      { find: '@ui', replacement: r('./src/ui') },
    ],
  },
  test: {
    // Engine tests must run in Node with no DOM.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
