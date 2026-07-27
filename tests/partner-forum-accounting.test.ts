import { describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSeatIntakeForPartner } from '../lib/telegram/partner-forum-accounting.ts';
import type { SeatIntakeRecord } from '../lib/telegram/seat-capital-desk.ts';

describe('partner-forum-accounting', () => {
  test('loadSeatIntakeForPartner prefers call-sign when partner matches', async () => {
    const dir = join(tmpdir(), `acct-intake-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const record: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [{ book: 'a.com', outId: 'SPEN-1' }],
      desk: { messageId: 31, chatId: '-1', messageThreadId: 26 },
    };
    await writeFile(join(dir, 'SPEN-001.json'), `${JSON.stringify(record)}\n`);

    const loaded = await loadSeatIntakeForPartner('SPEN', {
      intakeDir: dir,
      callSign: 'SPEN-001',
    });
    expect(loaded?.callSign).toBe('SPEN-001');
    expect(loaded?.desk?.messageId).toBe(31);

    await rm(dir, { recursive: true, force: true });
  });

  test('loadSeatIntakeForPartner scans dir and prefers desk-pinned intake', async () => {
    const dir = join(tmpdir(), `acct-scan-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'SPEN-002.json'),
      `${JSON.stringify({
        partnerCode: 'SPEN',
        callSign: 'SPEN-002',
        outs: [{ book: 'b.com', outId: 'SPEN-1' }],
      } satisfies SeatIntakeRecord)}\n`
    );
    await writeFile(
      join(dir, 'SPEN-001.json'),
      `${JSON.stringify({
        partnerCode: 'SPEN',
        callSign: 'SPEN-001',
        outs: [{ book: 'a.com', outId: 'SPEN-1' }],
        desk: { messageId: 31, chatId: '-1', messageThreadId: 26 },
      } satisfies SeatIntakeRecord)}\n`
    );

    const loaded = await loadSeatIntakeForPartner('SPEN', { intakeDir: dir });
    expect(loaded?.callSign).toBe('SPEN-001');
    expect(loaded?.desk?.messageId).toBe(31);

    await rm(dir, { recursive: true, force: true });
  });

  test('loadSeatIntakeForPartner returns null for wrong partner', async () => {
    const dir = join(tmpdir(), `acct-miss-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'ASH-001.json'),
      `${JSON.stringify({
        partnerCode: 'ASH',
        callSign: 'ASH-001',
        outs: [],
      } satisfies SeatIntakeRecord)}\n`
    );

    const loaded = await loadSeatIntakeForPartner('SPEN', { intakeDir: dir });
    expect(loaded).toBeNull();

    await rm(dir, { recursive: true, force: true });
  });

  test('ensurePartnerForumAccounting dry-run loads without ReferenceError', async () => {
    const { Database } = await import('bun:sqlite');
    const { ensurePartnerForumAccounting } = await import('../lib/telegram/partner-forum-accounting.ts');
    const db = new Database(':memory:');
    const result = await ensurePartnerForumAccounting({
      db,
      token: 'test-token',
      partnerCode: 'ZZZ',
      ensureTopics: false,
      postPrompt: false,
      dryRun: true,
    });
    expect(result.partnerCode).toBe('ZZZ');
    expect(result.promptPosted).toBe(false);
    db.close();
  });
});
