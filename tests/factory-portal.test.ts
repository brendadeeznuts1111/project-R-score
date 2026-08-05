// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';

import { PORTAL_HTML_ROUTES, PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_OVERFLOW_NAV } from '../lib/portal/chrome-catalog.ts';

const BOARD = 'public/portal/factory/index.html';
const SCRIPT = 'public/portal/factory/factory-board.js';

describe('factory portal board', () => {
  test('is registered in chrome, routes, and markdown slugs', () => {
    expect(PORTAL_HTML_ROUTES).toContain('/portal/factory/');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('factory');
    const nav = PORTAL_OVERFLOW_NAV.find(n => n.id === 'factory');
    expect(nav?.href).toBe('/portal/factory/');
    expect(nav?.cli).toContain('telegram:verify');
    expect(nav?.registryArtifact).toBe('/registry/telegram-handshake.json');
  });

  test('shell and board load handshake through shared portal chrome', async () => {
    const [html, script] = await Promise.all([
      Bun.file(BOARD).text(),
      Bun.file(SCRIPT).text(),
    ]);

    expect(html).toContain('Handshake readiness');
    expect(html).toContain('data-glossary-concept="telegram.handshake"');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/factory/factory-board.js');
    expect(html).toContain('/registry/telegram-handshake.json');
    expect(html).toContain('/registry/telegram-handshake-catalog.json');
    expect(html).toContain('/registry/factory/registry.json');
    expect(html).toContain('id="fx-stats"');
    expect(html).toContain('id="fx-body"');
    expect(html).toContain('id="fx-commands"');
    expect(html).toContain('bun run telegram:verify');
    expect(html).toContain('bun run telegram:handshake:catalog');

    expect(script).toContain("const HANDSHAKE_URL = '/registry/telegram-handshake.json'");
    expect(script).toContain("const CATALOG_URL = '/registry/telegram-handshake-catalog.json'");
    expect(script).toContain("const TENANT_REG_URL = '/registry/factory/registry.json'");
    expect(script).toContain('factorywager.telegram-handshake.v1');
    expect(script).toContain('fetchJsonResult');
    expect(script).toContain('bindCopyButtons');
    expect(script).not.toContain("fetch('/api/health");
  });

  test('baked handshake artifact exists for the board consumer', async () => {
    expect(await Bun.file('public/registry/telegram-handshake.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/telegram-handshake-catalog.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/factory/registry.json').exists()).toBe(true);

    const handshake = await Bun.file('public/registry/telegram-handshake.json').json();
    expect(handshake.schema).toBe('factorywager.telegram-handshake.v1');
    expect(Array.isArray(handshake.rows)).toBe(true);
    expect(handshake.rows.length).toBeGreaterThan(0);
    expect(typeof handshake.operatorReady).toBe('number');
    expect(handshake.commands?.readiness).toContain('telegram:handshake:readiness');
  });
});
