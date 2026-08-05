// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { PORTAL_FOOTER_LINKS, PORTAL_OVERFLOW_NAV } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('portal surfaces board', () => {
  test('chrome and weave expose /portal/surfaces/', () => {
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({ id: 'surfaces', href: '/portal/surfaces/' })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual(
      expect.objectContaining({ label: 'Surfaces', href: '/portal/surfaces/' })
    );
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({ id: 'surfaces', href: '/portal/surfaces/' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/surfaces-state.json' })
    );
  });

  test('board shell loads surfaces-state through shared chrome', async () => {
    const [html, script] = await Promise.all([
      Bun.file(resolvePath(ROOT, 'public/portal/surfaces/index.html')).text(),
      Bun.file(resolvePath(ROOT, 'public/portal/surfaces/surfaces-board.js')).text(),
    ]);
    expect(html).toContain('Hosts, Access domains, and backend shortcodes');
    expect(html).toContain('Public edge surface inventory');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/surfaces/surfaces-board.js');
    expect(script).toContain("const STATE_URL = '/registry/surfaces-state.json'");
    expect(script).toContain('schemaVersion');
    expect(script).toContain('backendCode');
  });
});
