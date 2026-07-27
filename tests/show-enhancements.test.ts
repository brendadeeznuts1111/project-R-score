// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/console — --console-depth
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
import { describe, expect, test } from 'bun:test';
import {
  buildEnhancementReport,
  buildEnhancementRows,
  reportToHtml,
} from '../tools/show-enhancements.ts';
import { deepEqualsModes, deepEqualsStrict } from '../lib/deep-equals.ts';
import { escapeHtml } from '../lib/escape-html.ts';

describe('show-enhancements', () => {
  test('buildEnhancementRows all match offline', async () => {
    const rows = await buildEnhancementRows();
    expect(rows.length).toBeGreaterThanOrEqual(7);
    expect(rows.every(r => r.match)).toBe(true);
    expect(rows.some(r => r.feature.startsWith('runtime.deepEquals'))).toBe(true);
    expect(rows.some(r => r.feature === 'runtime.escapeHTML')).toBe(true);
  });

  test('buildEnhancementReport is signed and complete', async () => {
    const report = await buildEnhancementReport();
    expect(report.passed).toBe(report.total);
    expect(report.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(report.consoleDepth).toBeGreaterThanOrEqual(0);
  });

  test('strict deepEquals matches docs (undefined key ≠ missing)', () => {
    const a = { entries: [1, 2] };
    const b = { entries: [1, 2], extra: undefined };
    expect(Bun.deepEquals(a, b)).toBe(true);
    expect(Bun.deepEquals(a, b, true)).toBe(false);
    expect(deepEqualsStrict(a, b)).toBe(false);
    const m = deepEqualsModes(a, b);
    expect(m.diverges).toBe(true);
  });

  test('escapeHtml / reportToHtml never embeds raw tags', async () => {
    expect(escapeHtml(`<div>&'"</div>`)).toBe(
      '&lt;div&gt;&amp;&#x27;&quot;&lt;/div&gt;'
    );
    const report = await buildEnhancementReport();
    // poison a notes field to prove escaping
    report.rows[0]!.notes = `<img src=x onerror=alert(1)> MA & "NJ"`;
    const html = reportToHtml(report);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;NJ&quot;');
  });

  test('getConsoleDepth sees --console-depth via execArgv (spawn)', async () => {
    const proc = Bun.spawn(
      [
        'bun',
        '--console-depth=7',
        '-e',
        `import { getConsoleDepth } from ${JSON.stringify(new URL('../lib/console-depth.ts', import.meta.url).pathname)};
         process.stdout.write(String(getConsoleDepth()));`,
      ],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(0);
    expect(out.trim()).toBe('7');
    if (code !== 0) console.error(err);
  });
});
