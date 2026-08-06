// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  coversTopLevel,
  extractAreaMapSection,
  extractPathTokens,
  extractVerifiedDate,
  isExternalPath,
  isPathToken,
} from '../tools/lib-area-map-check.ts';

describe('lib-area-map-check helpers', () => {
  test('extractAreaMapSection stops before next H2/H3', () => {
    const md = `# X\n\n## Area map\n\n| A | B |\n| - | - |\n| x | [\`db.ts\`](db.ts) |\n\n### Notes\n\nignore\n\n## Other\n\nno\n`;
    const section = extractAreaMapSection(md);
    expect(section).toContain('db.ts');
    expect(section).not.toContain('## Other');
    expect(section).not.toContain('### Notes');
  });

  test('extractPathTokens prefers links and backticks', () => {
    const section = `| **Play** | [\`a.ts\`](a.ts) · [\`b.ts\`](b.ts) | seat-desk-*.ts · flows/cards/* · prose only |\n`;
    const paths = extractPathTokens(section);
    expect(paths).toContain('a.ts');
    expect(paths).toContain('b.ts');
    expect(paths).toContain('seat-desk-*.ts');
    expect(paths).toContain('flows/cards/*');
    expect(paths).not.toContain('prose');
  });

  test('isPathToken rejects prose and API names', () => {
    expect(isPathToken('db.ts')).toBe(true);
    expect(isPathToken('limits/')).toBe(true);
    expect(isPathToken('seat-desk-*.ts')).toBe(true);
    expect(isPathToken('Bun.serve')).toBe(false);
    expect(isPathToken('Request/response')).toBe(false);
    expect(isPathToken('oven-sh/bun')).toBe(false);
    expect(isPathToken('I/O')).toBe(false);
  });

  test('isExternalPath skips docs, registry names, other roots', () => {
    expect(isExternalPath('../toc-ops/')).toBe(true);
    expect(isExternalPath('../../docs/harness/x.md')).toBe(true);
    expect(isExternalPath('config/scrape-agents.toml')).toBe(true);
    expect(isExternalPath('catalog-enhancements.json')).toBe(true);
    expect(isExternalPath('scripts/serve-public.ts')).toBe(true);
    expect(isExternalPath('db.ts')).toBe(false);
    expect(isExternalPath('scrapers/books/')).toBe(false);
  });

  test('coversTopLevel matches explicit and simple globs', () => {
    expect(coversTopLevel('seat-intake.ts', ['seat-intake.ts'])).toBe(true);
    expect(coversTopLevel('seat-desk-callback.ts', ['seat-desk-*.ts'])).toBe(true);
    expect(coversTopLevel('mystery.ts', ['seat-desk-*.ts'])).toBe(false);
  });

  test('extractVerifiedDate', () => {
    expect(extractVerifiedDate('<!-- area-map-verified: 2026-08-06 -->\n')).toBe('2026-08-06');
    expect(extractVerifiedDate('# no stamp')).toBeUndefined();
  });
});

describe('lib-area-map-check CLI', () => {
  test('repo Area maps pass path validation', async () => {
    const proc = Bun.spawn(['bun', 'tools/lib-area-map-check.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: import.meta.dir + '/..',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('lib-area-map-check');
    expect(out).toContain('OK');
  });
});
