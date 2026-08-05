// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';

const BOARD = 'public/portal/dod/index.html';
const SCRIPT = 'public/portal/dod/dod-dashboard.js';

describe('dod portal · partner Accounting confirm', () => {
  test('board wires handshake strip and confirm helpers', async () => {
    const [html, script] = await Promise.all([
      Bun.file(BOARD).text(),
      Bun.file(SCRIPT).text(),
    ]);

    expect(html).toContain('id="dod-embed"');
    expect(html).toContain('id="dod-confirm-host"');
    expect(html).toContain('dod-dashboard.js');
    expect(html).toContain('.dod-confirm-strip');
    expect(html).toContain('.dod-partner-chip');
    expect(html).toContain('/registry/telegram-handshake.json');
    expect(html).toContain('Confirm amounts in partner Telegram Accounting');
    expect(html).toContain('/portal/telegram.md');
    expect(html).toContain('/portal/dod.md');

    expect(script).toContain("const HANDSHAKE_URL = '/registry/telegram-handshake.json'");
    expect(script).toContain('partnerTelegramHash');
    expect(script).toContain('resolvePartnerCode');
    expect(script).toContain('confirmLinksHtml');
    expect(script).toContain('partnerConfirmStripHtml');
    expect(script).toContain('loadHandshakePartners');
    expect(script).toContain('Confirm bet amounts in partner chats');
    expect(script).toContain("partnerTelegramHash(code, 'accounting')");
    expect(script).toContain('confirmHost.innerHTML');
    expect(script).toContain('R2/local');
    expect(script).toContain('/portal/dod.md');
  });

  test('demo OCR embeds partner CODEs for Accounting deep-links', async () => {
    const [queue, html, seed] = await Promise.all([
      Bun.file('public/registry/dod-queue.json').json(),
      Bun.file(BOARD).text(),
      Bun.file('lib/operations/dod-seed.ts').text(),
    ]);

    expect(seed).toContain('ASH · Balance');
    expect(seed).toContain('BIL-001');
    expect(seed).toContain('NOV · Deposit');
    expect(seed).toContain('SPEN · Balance');

    const texts = (queue.entries as Array<{ extracted_text?: string | null }>)
      .map(e => e.extracted_text)
      .filter(Boolean)
      .join('\n');
    expect(texts).toContain('ASH ·');
    expect(texts).toContain('BIL-001');
    expect(texts).toContain('NOV ·');
    expect(texts).toContain('SPEN ·');

    expect(html).toContain('ASH · Balance');
    expect(html).toContain('BIL-001');
  });

  test('resolvePartnerCode reads OCR call-signs', async () => {
    const { resolvePartnerCode } = await import('../public/portal/dod/dod-dashboard.js');
    expect(resolvePartnerCode({ type: 'slip', extracted_text: 'BIL-001 · NBA $250' })).toBe(
      'BIL'
    );
    expect(resolvePartnerCode({ type: 'balance', extracted_text: 'ASH · Balance $100' })).toBe(
      'ASH'
    );
    expect(resolvePartnerCode({ partner_code: 'nov' })).toBe('NOV');
    expect(resolvePartnerCode({ type: 'id', extracted_text: 'ID document' })).toBeNull();
  });
});
