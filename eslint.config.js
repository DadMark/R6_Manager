import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Game code only. The AIOX framework directories are vendored tooling
    // (framework layers L1/L2) and are not ours to lint or modify.
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'reports',
      '.aiox-core',
      '.aiox',
      '.claude',
      '.codex',
      '.cursor',
      '.gemini',
      '.antigravity',
      '.kimi',
      '.github',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ENGINE PURITY BOUNDARY.
  // This is what makes the engine/UI separation real rather than aspirational.
  // The engine must stay framework-free, time-free and randomness-free so that
  // it can be unit-tested in Node, replayed deterministically from a seed, and
  // later run server-side for async PvP without modification.
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Tests are exempt: they legitimately import content as a fixture, and
    // `purity.test.ts` needs the real operator ids to assert the IP boundary.
    files: ['src/engine/**/*.ts'],
    ignores: ['src/engine/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'engine must stay framework-free.',
            },
            {
              group: ['@content/*', '**/content/*', '../content/*'],
              message: 'engine receives GameContent as a parameter, it never imports content.',
            },
            {
              group: ['@ui/*', '@state/*', '**/ui/*', '**/state/*'],
              message: 'engine cannot depend on app layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'engine must stay environment-free.' },
        { name: 'document', message: 'engine must stay environment-free.' },
        { name: 'localStorage', message: 'engine must stay environment-free.' },
        { name: 'fetch', message: 'engine must stay environment-free.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'use the injected Rng instead.' },
        { object: 'Date', property: 'now', message: 'engine must be time-free.' },
      ],
    },
  },
);
