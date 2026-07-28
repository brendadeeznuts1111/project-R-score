import { describe, expect, test } from 'bun:test';
import { LINK_GROUPS } from '../public/portal/command-centre-core.js';

const LANDER = 'public/index.html';

const REQUIRED_HREFS = [
  '/portal/tools/',
  '/portal/',
  '/registry/prediction/report/',
  '/portal/ops/',
  '/monitoring/',
];

describe('public lander (index.html)', () => {
  test('command centre includes core portal nav targets', async () => {
    const html = await Bun.file(LANDER).text();
    expect(html).toContain('FactoryWager');
    expect(html).toContain('viewport');
    expect(html).toContain('cc-grid');
    expect(html).toContain('command-centre.js');
    for (const href of REQUIRED_HREFS) {
      expect(html, `missing ${href}`).toContain(`href="${href}"`);
    }
  });

  test('welcome section points to CLI tools hub', async () => {
    const html = await Bun.file(LANDER).text();
    expect(html).toContain('Get started in the CLI tools hub');
    expect(html).toContain('href="/portal/tools/"');
  });

  test('link groups include ops summary JSON', () => {
    const flat = LINK_GROUPS.flatMap(g => g.links.map(l => l.href));
    expect(flat).toContain('/registry/ops-summary.json');
  });
});
