// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  coversTopLevel,
  extractAreaMapSection,
  extractPathTokens,
  extractVerifiedDate,
  globToRegExp,
  isExternalPath,
  isPathToken,
  issueToOpenPath,
  issueToOpenTarget,
  issueToOpenTargetAsync,
  lineOfNeedle,
  MEGA_DOMAINS,
  verifiedAgeDays,
} from '../tools/lib-area-map-check.ts';

describe('lib-area-map-check helpers', () => {
  test('extractAreaMapSection accepts Area map and Ownership map', () => {
    const area = extractAreaMapSection(`# X\n\n## Area map\n\n| A |\n| [\`db.ts\`](db.ts) |\n\n## Other\n`);
    expect(area).toContain('db.ts');
    expect(area).not.toContain('## Other');

    const own = extractAreaMapSection(
      `# portal\n\n## Ownership map\n\n| C | [\`url-planes.ts\`](url-planes.ts) |\n\n## Hash\n`
    );
    expect(own).toContain('url-planes.ts');
    expect(own).not.toContain('## Hash');
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

  test('isPathToken accepts kebab stems and rejects prose', () => {
    expect(isPathToken('db.ts')).toBe(true);
    expect(isPathToken('limits/')).toBe(true);
    expect(isPathToken('seat-desk-*.ts')).toBe(true);
    expect(isPathToken('portal-cors')).toBe(true);
    expect(isPathToken('url-planes')).toBe(true);
    expect(isPathToken('Area')).toBe(false);
    expect(isPathToken('Bun.serve')).toBe(false);
    expect(isPathToken('Request/response')).toBe(false);
    expect(isPathToken('oven-sh/bun')).toBe(false);
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

  test('coversTopLevel: basename globs work; path globs do not match all', () => {
    expect(coversTopLevel('seat-intake.ts', ['seat-intake.ts'])).toBe(true);
    expect(coversTopLevel('seat-desk-callback.ts', ['seat-desk-*.ts'])).toBe(true);
    expect(coversTopLevel('portal-cors.ts', ['portal-cors'])).toBe(true);
    // P0 regression: flows/cards/* must NOT cover every top-level file
    expect(coversTopLevel('ops-bot.ts', ['flows/cards/*'])).toBe(false);
    expect(coversTopLevel('mystery.ts', ['seat-desk-*.ts'])).toBe(false);
  });

  test('globToRegExp matches relative paths', () => {
    expect(globToRegExp('flows/cards/*').test('flows/cards/menu.ts')).toBe(true);
    expect(globToRegExp('flows/cards/*').test('ops-bot.ts')).toBe(false);
    expect(globToRegExp('seat-desk-*.ts').test('seat-desk-callback.ts')).toBe(true);
  });

  test('extractVerifiedDate and age', () => {
    expect(extractVerifiedDate('<!-- area-map-verified: 2026-08-06 -->\n')).toBe('2026-08-06');
    expect(extractVerifiedDate('# no stamp')).toBeUndefined();
    expect(verifiedAgeDays('2026-08-06', new Date('2026-08-06T12:00:00Z'))).toBe(0);
    expect(verifiedAgeDays('2026-07-01', new Date('2026-08-06T12:00:00Z'))).toBe(36);
  });

  test('mega allowlist includes portal', () => {
    expect(MEGA_DOMAINS).toContain('portal');
    expect(MEGA_DOMAINS).toContain('operations');
  });

  test('issueToOpenPath / target resolve README and module paths', () => {
    const readme = issueToOpenPath({
      kind: 'missing-verified',
      domain: 'http',
      detail: 'missing stamp',
    });
    expect(readme?.endsWith('lib/http/README.md')).toBe(true);

    const t = issueToOpenTarget({
      kind: 'orphan-top-level',
      domain: 'http',
      path: 'sha256.ts',
    });
    expect(t?.path.endsWith('lib/http/sha256.ts')).toBe(true);
    expect(t?.line).toBe(1);
    expect(t?.column).toBe(1);
  });

  test('lineOfNeedle and async target find Area map line', async () => {
    expect(lineOfNeedle('a\n## Area map\nb\n', '## Area map')).toBe(2);
    const t = await issueToOpenTargetAsync({
      kind: 'missing-verified',
      domain: 'http',
      detail: 'missing stamp',
    });
    expect(t?.path.endsWith('lib/http/README.md')).toBe(true);
    expect(t!.line).toBeGreaterThanOrEqual(1);
    expect(t!.column).toBe(1);
  });
});

describe('lib-area-map-check CLI', () => {
  test('repo Area maps pass path validation (hard fails only)', async () => {
    const proc = Bun.spawn(['bun', 'tools/lib-area-map-check.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: import.meta.dir + '/..',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toMatch(/lib-area-map-check/);
  });
});
