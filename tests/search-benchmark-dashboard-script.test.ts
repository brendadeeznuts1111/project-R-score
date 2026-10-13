import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { htmlShell } from '../scripts/search-benchmark-dashboard.ts';

for (const hotReload of [false, true]) {
  for (const prefSource of ['local', 'r2'] as const) {
    test(`complete generated dashboard script parses (${prefSource}, hot reload ${hotReload})`, () => {
      const html = htmlShell(
        {
          port: 0,
          dir: '.',
          r2Prefix: 'test',
          cacheTtlMs: 0,
          domain: 'example.invalid',
          hotReload,
          cookies: false,
        },
        {
          repoUrl: 'https://example.invalid/repo',
          repoBranchUrl: 'https://example.invalid/repo/tree/test',
          branchName: 'test',
          commitShort: 'unknown',
          commitFull: 'unknown',
        },
        {
          domain: 'example.invalid',
          accountId: '',
          lastSnapshot: '',
          prefMetric: 'latency',
          prefSource,
        }
      );
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        match => match[1] ?? ''
      );
      expect(scripts).toHaveLength(1);
      for (const script of scripts) {
        // @see https://bun.com/docs/runtime/transpiler#transformsync
        expect(() => new Bun.Transpiler({ loader: 'js' }).transformSync(script)).not.toThrow();
        // Execute the generated non-browser guard without starting network/timers.
        expect(() => runInNewContext(script, {})).not.toThrow();
        expect(script).toContain("exportData(\\'json\\')");
        expect(script).toContain("this.closest(\\'.modal-overlay\\')");
        expect(script).toContain("let csv = 'Metric,Value,Unit\\n'");
        expect(script).toContain('let checkForNewReports =');
      }
    });
  }
}
