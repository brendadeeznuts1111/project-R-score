import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { bakeMonitoringPage } from '../lib/monitoring/bake-page.ts';

const ROOT = joinPath(import.meta.dir, '..');
const SCRATCH = joinPath(import.meta.dir, '../.tmp/monitoring-bake-test');

describe('bakeMonitoringPage', () => {
  test('injects monitoring embed into html', async () => {
    await Bun.write(`${SCRATCH}/mon.json`, JSON.stringify({ packageCount: 3, timestamp: '2026-07-24T00:00:00.000Z' }));
    await Bun.write(`${SCRATCH}/ops.json`, JSON.stringify({ routing: { passed: 2, total: 2 } }));
    await Bun.write(
      `${SCRATCH}/index.html`,
      '<!DOCTYPE html><html><head><script type="application/json" id="monitoring-embed"></script></head><body></body></html>'
    );

    await bakeMonitoringPage({
      snapshotPath: `${SCRATCH}/mon.json`,
      htmlPath: `${SCRATCH}/index.html`,
      opsPath: `${SCRATCH}/ops.json`,
    });

    const html = await Bun.file(`${SCRATCH}/index.html`).text();
    expect(html).toContain('id="monitoring-embed"');
    expect(html).toContain('"packageCount":3');
    expect(html).toContain('"passed":2');
  });
});
