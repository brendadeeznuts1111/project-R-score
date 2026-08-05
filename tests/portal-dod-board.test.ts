// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

describe('portal DOD board', () => {
  test('raises to shared operator bar — hero, stats, hash filters, poll meta', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/dod/index.html').text(),
      Bun.file('public/portal/dod/dod-dashboard.js').text(),
    ]);

    expect(html).toContain('portal-hero portal-hero--card');
    expect(html).toContain('id="dod-gate"');
    expect(html).toContain('id="dod-stats"');
    expect(html).toContain('class="portal-stat-grid"');
    expect(html).toContain('class="portal-actions"');
    expect(html).toContain('name="portal-poll-ms"');
    expect(html).toContain('id="dod-refresh"');
    expect(html).toContain('id="dod-clear"');
    expect(html).toContain('data-cli="bun run public:audit:verify"');
    expect(html).toContain('id="dod-embed"');

    expect(script).toContain("import { bindCopyButtons } from '../copy-cli.js'");
    expect(script).toContain('function parseHash');
    expect(script).toContain('function writeHash');
    expect(script).toContain('function renderStats');
    expect(script).toContain('function updateHero');
    expect(script).toContain('function pollMs()');
    expect(script).toContain("params.set('status', status)");
    expect(script).toContain('export function renderDodDashboard');
  });

  test('keeps review queue actions and snapshot-first fetch order', async () => {
    const script = await Bun.file('public/portal/dod/dod-dashboard.js').text();
    expect(script).toContain('/api/dod?status=');
    expect(script).toContain('/registry/dod-queue.json');
    expect(script).toContain('/api/dod/approve');
    expect(script).toContain('/api/dod/reject');
    expect(script).toContain('btn-approve');
    expect(script).toContain('btn-reject');
    expect(script).toContain('readEmbed()');
  });
});
