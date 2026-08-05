// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  escHtml,
  renderPortalChip,
  renderPortalPanel,
  renderPortalStatGrid,
  renderPortalTable,
  renderToneChip,
} from '../lib/portal/ui-html.ts';

describe('lib/portal/ui-html', () => {
  test('escHtml escapes markup', () => {
    expect(escHtml('<script>"x"&')).toBe('&lt;script&gt;&quot;x&quot;&amp;');
  });

  test('renderPortalTable builds portal-table with density and empty state', () => {
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ];
    const empty = renderPortalTable(cols, [], { emptyMessage: 'None' });
    expect(empty).toContain('class="portal-table"');
    expect(empty).toContain('table-wrap');
    expect(empty).toContain('None');

    const html = renderPortalTable(
      cols,
      [
        { id: 'a', name: 'Alpha' },
        ['b', { html: '<b>Beta</b>', className: 'mono' }],
      ],
      { density: 'compact', zebra: true, tone: 'accent' }
    );
    expect(html).toContain('data-density="compact"');
    expect(html).toContain('data-zebra');
    expect(html).toContain('data-tone="accent"');
    expect(html).toContain('Alpha');
    expect(html).toContain('<b>Beta</b>');
    expect(html).toContain('class="mono"');
  });

  test('renderPortalStatGrid supports buttons and tones', () => {
    const html = renderPortalStatGrid([
      { label: 'Books', value: 10, tone: 'ok', hint: 'total' },
      {
        label: 'Flagged',
        value: 2,
        tone: 'bad',
        button: true,
        active: true,
        attrs: { 'data-filter': 'flagged' },
      },
    ]);
    expect(html).toContain('portal-stat ok');
    expect(html).toContain('portal-stat bad active');
    expect(html).toContain('class="kicker"');
    expect(html).toContain('data-filter="flagged"');
    expect(html).toContain('<button type="button"');
  });

  test('chips and panel', () => {
    expect(renderToneChip('ready', 'ok')).toContain('tone-chip tone-ok');
    expect(renderPortalChip('ASH', { href: '/portal/partners/' })).toContain('portal-chip');
    expect(renderPortalChip('dim', { muted: true })).toContain('portal-chip--muted');
    const panel = renderPortalPanel('Aliases', '<p>body</p>', { desc: 'export-safe' });
    expect(panel).toContain('portal-panel');
    expect(panel).toContain('export-safe');
  });
});

describe('browser portal-ui twin', () => {
  test('public component exports the same builder names', async () => {
    const src = await Bun.file('public/portal/components/portal-ui.js').text();
    for (const name of [
      'escHtml',
      'renderToneChip',
      'renderPortalChip',
      'renderPortalStatGrid',
      'renderPortalTable',
      'renderPortalPanel',
    ]) {
      expect(src).toContain(`export function ${name}`);
    }
  });

  test('bookmakers board uses portal-table and shared chips', async () => {
    const html = await Bun.file('public/portal/bookmakers/index.html').text();
    const js = await Bun.file('public/portal/bookmakers/bookmakers-board.js').text();
    expect(html).toContain('portal-table');
    expect(html).toContain('portal-panel');
    expect(js).toContain('portal-chip');
    expect(js).toContain('portal-pill');
    expect(js).not.toContain('fetcher-pill');
  });

  test('migrated boards prefer portal-table over data-table/ops-table', async () => {
    const paths = [
      'public/portal/doctor/index.html',
      'public/portal/skills/index.html',
      'public/portal/factory/index.html',
      'public/portal/surfaces/index.html',
      'public/portal/bunfig/index.html',
      'public/portal/console-format/index.html',
      'public/portal/tennis/index.html',
      'public/portal/env/index.html',
      'public/portal/operations-dashboard.js',
      'public/portal/dashboard-app.js',
      'public/portal/surfaces/surfaces-board.js',
    ];
    for (const p of paths) {
      const src = await Bun.file(p).text();
      expect(src, p).not.toMatch(/class="data-table"/);
      expect(src, p).not.toMatch(/class="ops-table"/);
      expect(src, p).toContain('portal-table');
    }
  });

  test('identity bake imports shared ui-html builders', async () => {
    const bake = await Bun.file('tools/identity-board-bake.ts').text();
    expect(bake).toContain("from '../lib/portal/ui-html.ts'");
    expect(bake).toContain('renderPortalTable');
    expect(bake).toContain('renderPortalStatGrid');
  });

  test('vault and failures bakes import shared ui-html builders', async () => {
    for (const p of ['tools/vault-health-bake.ts', 'tools/failures-bake.ts']) {
      const bake = await Bun.file(p).text();
      expect(bake, p).toContain("from '../lib/portal/ui-html.ts'");
      expect(bake, p).toContain('renderPortalTable');
      expect(bake, p).toContain('renderPortalStatGrid');
    }
  });

  test('second-wave boards dual-class portal-table with board aliases', async () => {
    const paths = [
      'public/portal/partners/index.html',
      'public/portal/tools/index.html',
      'public/portal/account/index.html',
      'public/portal/packages/index.html',
      'public/portal/compliance/index.html',
      'public/portal/concepts/index.html',
      'public/portal/brands/index.html',
      'public/portal/limits-lab/index.html',
      'public/portal/components/limit-changes-card.js',
    ];
    for (const p of paths) {
      const src = await Bun.file(p).text();
      expect(src, p).toContain('portal-table');
    }
  });
});
