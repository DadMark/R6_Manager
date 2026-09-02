import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultContent } from '../../content';

/**
 * The engine's guarantees, enforced rather than trusted.
 *
 * ESLint is the primary gate (see `eslint.config.js`); this test is the
 * backstop that also catches dynamic access, and — critically — the IP
 * boundary, which lint cannot express.
 */

const ENGINE_DIR = join(process.cwd(), 'src/engine');

function engineFiles(dir = ENGINE_DIR): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : engineFiles(full);
    }
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('engine purity', () => {
  const files = engineFiles();

  it('finds engine sources to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)('%s stays framework-free, time-free and randomness-free', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/from ['"]react/);
    expect(source).not.toMatch(/\bMath\.random\b/);
    expect(source).not.toMatch(/\bDate\.now\b/);
    expect(source).not.toMatch(/\bnew Date\b/);
    expect(source).not.toMatch(/\bwindow\./);
    expect(source).not.toMatch(/\bdocument\./);
    expect(source).not.toMatch(/\blocalStorage\b/);
  });

  it('never imports the content layer (content is injected as a parameter)', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from ['"](@content|\.\.\/content|\.\/content)/);
    }
  });

  /**
   * The IP boundary. Operator names are Ubisoft trademarks; keeping every
   * literal out of the engine is what lets `operators.generic.ts` reskin the
   * whole game via one env var.
   */
  it('never references a concrete operator id', () => {
    const ids = defaultContent.operators.map((o) => o.id);
    expect(ids.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const id of ids) {
        expect(source, `${file} hardcodes operator id "${id}"`).not.toContain(id);
      }
    }
  });
});
