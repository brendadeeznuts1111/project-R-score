// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/console — --console-depth
import { describe, expect, test } from 'bun:test';
import {
  buildEnhancementReport,
  buildEnhancementRows,
} from '../tools/show-enhancements.ts';

describe('show-enhancements', () => {
  test('buildEnhancementRows all match offline', async () => {
    const rows = await buildEnhancementRows();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.every(r => r.match)).toBe(true);
  });

  test('buildEnhancementReport is signed and complete', async () => {
    const report = await buildEnhancementReport();
    expect(report.passed).toBe(report.total);
    expect(report.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(report.consoleDepth).toBeGreaterThanOrEqual(0);
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
