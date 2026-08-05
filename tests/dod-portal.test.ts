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

    expect(script).toContain("const HANDSHAKE_URL = '/registry/telegram-handshake.json'");
    expect(script).toContain('partnerTelegramHash');
    expect(script).toContain('resolvePartnerCode');
    expect(script).toContain('confirmLinksHtml');
    expect(script).toContain('partnerConfirmStripHtml');
    expect(script).toContain('loadHandshakePartners');
    expect(script).toContain('Confirm bet amounts in partner chats');
    expect(script).toContain("partnerTelegramHash(code, 'accounting')");
    expect(script).toContain('confirmHost.innerHTML');
    expect(script).toContain('resolveTelegramMessageLink');
    expect(script).toContain('imageMetaHtml');
    expect(script).toContain('dod-accounting-figure');
    expect(script).toContain('Open Telegram message');
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
    expect(seed).toContain('telegram_chat_id');
    expect(seed).toContain('image_meta_json');

    const flagged = (queue.entries as Array<Record<string, unknown>>).find(
      e => e.type === 'balance' && e.status === 'flagged'
    );
    expect(String(flagged?.extracted_text)).toContain('ASH ·');
    expect(flagged?.accounting_amount).toBe(12450);
    expect(String(flagged?.telegram_deep_link)).toContain('t.me/c/');
    expect(flagged?.image_meta).toBeTruthy();

    expect(html).toContain('ASH · Balance');
    expect(html).toContain('BIL-001');
    expect(html).toContain('telegram_deep_link');
    expect(html).toContain('accounting_amount');
  });

  test('resolvePartnerCode and telegram/amount helpers', async () => {
    const mod = await import('../public/portal/dod/dod-dashboard.js');
    expect(mod.resolvePartnerCode({ type: 'slip', extracted_text: 'BIL-001 · NBA $250' })).toBe(
      'BIL'
    );
    expect(mod.resolvePartnerCode({ type: 'balance', extracted_text: 'ASH · Balance $100' })).toBe(
      'ASH'
    );
    expect(mod.resolvePartnerCode({ partner_code: 'nov' })).toBe('NOV');
    expect(mod.resolvePartnerCode({ type: 'id', extracted_text: 'ID document' })).toBeNull();

    expect(
      mod.resolveTelegramMessageLink({
        telegram_chat_id: '-1002147483001',
        telegram_message_id: 1842,
        telegram_thread_id: 42,
      })
    ).toBe('https://t.me/c/2147483001/42/1842');
    expect(mod.resolveAccountingAmount({ extracted_text: 'ASH · Balance $12,450.00' })).toBe(
      12450
    );
    expect(mod.formatAccountingAmount(12450)).toBe('$12,450.00');
  });
});
