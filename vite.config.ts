import { fileURLToPath, URL } from 'node:url';
// From vitest/config rather than vite so the `test` block typechecks.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// `VITE_CONTENT_PACK=generic` redirects the licensed operator module to the
// IP-free one at BUILD time, so the unselected pack's names never reach the
// bundle. Doing this with a runtime branch would ship both.
const useGenericPack = process.env.VITE_CONTENT_PACK === 'generic';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // Relative base so `dist/` deploys to any static host (GitHub Pages included).
    base: './',
    plugins: [react()],

    // PIN THE PRODUCTION REACT BUILD.
    //
    // Vite honours NODE_ENV from `.env`, and the AIOX installer writes
    // `NODE_ENV=development` into both `.env` and the committed
    // `.env.example`. Without this, `npm run build` silently emits React's
    // DEVELOPMENT bundle — 486 kB instead of 288 kB, with dev warnings and a
    // slower runtime. Netlify never hit it (`.env` is gitignored, so its
    // build is the clean 265 kB); every local build did.
    //
    // `define` is the only reliable lever. Assigning process.env.NODE_ENV in
    // this function is too late (Vite loads `.env` afterwards), and a warning
    // here cannot detect the problem either: Vite sets NODE_ENV=production
    // before calling the config, so loadEnv reports "production" regardless.
    ...(isBuild
      ? { define: { 'process.env.NODE_ENV': JSON.stringify('production') } }
      : {}),

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
  };
});
