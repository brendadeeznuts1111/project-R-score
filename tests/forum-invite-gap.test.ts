import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import {
  appendAckForumInviteSent,
  upsertPackageGroupRegistry,
} from '../lib/telegram/package-group-registry.ts';
import { upsertKnownChat, updateKnownChatMemberCount } from '../lib/telegram/known-chats.ts';
import {
  buildForumInviteGapRow,
  formatForumInviteDmText,
  sendForumInviteDm,
} from '../lib/telegram/forum-invite-gap.ts';
import {
  filterForumInviteGapRows,
  formatForumInviteGapReport,
  assessHandshakeReadiness,
} from '../lib/telegram/handshake-readiness.ts';

function seedLinkedGapDb(db: Database, telegramId = '999888777') {
  db.run(`
    CREATE TABLE tree_nodes (
      id TEXT PRIMARY KEY,
      call_sign TEXT,
      name TEXT,
      telegram_id TEXT,
      active INTEGER DEFAULT 1
    )
  `);
  db.run(
    `INSERT INTO tree_nodes (id, call_sign, name, telegram_id, active) VALUES (?, ?, ?, ?, 1)`,
    ['n-nov', 'NOV-001', 'Nov Operator', telegramId]
  );
  upsertPackageGroupRegistry(db, {
    partnerCode: 'NOV',
    chatId: '-1004464761699',
    displayName: 'Nov Ops',
    requestedBy: 'NOV-001',
    inviteLink: 'https://t.me/+novtest',
  });
  upsertKnownChat(db, {
    chat: {
      id: -1004464761699,
      type: 'supergroup',
      title: 'TOC Ops · NOV · Nov Ops',
      is_forum: true,
    },
    source: 'manual',
    botStatus: 'administrator',
  });
  updateKnownChatMemberCount(db, '-1004464761699', 2);
}

describe('forum-invite-gap', () => {
  test('buildForumInviteGapRow at 2·house! when linked', async () => {
    const db = new Database(':memory:');
    seedLinkedGapDb(db);
    const gap = await buildForumInviteGapRow(db, 'NOV');
    expect(gap).not.toBeNull();
    expect(gap!.membershipCell).toBe('2·house!');
    expect(gap!.canSend).toBe(true);
    expect(gap!.inviteLink).toBe('https://t.me/+novtest');
    db.close();
  });

  test('formatForumInviteDmText includes invite link', () => {
    const text = formatForumInviteDmText({
      partnerCode: 'NOV',
      registryTitle: 'TOC Ops · NOV · Nov Ops',
      inviteLink: 'https://t.me/+novtest',
      callSign: 'NOV-001',
    });
    expect(text).toContain('Join your package forum');
    expect(text).toContain('https://t.me/+novtest');
    expect(text).toContain('NOV-001');
  });

  test('sendForumInviteDm dry-run skips Telegram', async () => {
    const dir = join(tmpdir(), `invite-gap-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(jsonlPath, '');

    const db = new Database(':memory:');
    seedLinkedGapDb(db);
    const result = await sendForumInviteDm({
      db,
      token: 'fake',
      partnerCode: 'NOV',
      jsonlPath,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok && !('skipped' in result && result.skipped)) {
      expect(result.telegramId).toBe('999888777');
    }
    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('appendAckForumInviteSent is idempotent', async () => {
    const dir = join(tmpdir(), `invite-ack-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    const first = await appendAckForumInviteSent({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      chatId: '999888777',
      inviteLink: 'https://t.me/+novtest',
      path,
    });
    const second = await appendAckForumInviteSent({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      chatId: '999888777',
      inviteLink: 'https://t.me/+novtest',
      path,
    });
    expect(first.appended).toBe(true);
    expect(second.appended).toBe(false);
    await rm(dir, { recursive: true, force: true });
  });

  test('formatForumInviteGapReport shows SENT column', async () => {
    const dir = join(tmpdir(), `invite-report-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await appendAckForumInviteSent({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      chatId: '999888777',
      inviteLink: 'https://t.me/+novtest',
      path: jsonlPath,
    });

    const db = new Database(':memory:');
    seedLinkedGapDb(db);
    const row = await assessHandshakeReadiness({ db, partnerCode: 'NOV', jsonlPath });
    const gaps = filterForumInviteGapRows([row]);
    expect(gaps.length).toBe(1);
    expect(row.inviteSentAt).toBeTruthy();
    const lines = formatForumInviteGapReport([row]);
    expect(lines.some(l => l.includes('SENT'))).toBe(true);
    expect(lines.some(l => l.includes('2026') || l.includes('T'))).toBe(true);
    db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
