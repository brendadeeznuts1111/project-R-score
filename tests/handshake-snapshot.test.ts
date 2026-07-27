import { describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { upsertPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';
import { upsertKnownChat, updateKnownChatMemberCount } from '../lib/telegram/known-chats.ts';
import {
  buildTelegramHandshakeSnapshot,
  exportTelegramHandshakeSnapshot,
  loadTelegramHandshakeSummarySlice,
  snapshotToSummarySlice,
} from '../lib/telegram/handshake-snapshot.ts';

function seedGapPartner(db: Database) {
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
    ['n-nov', 'NOV-001', 'Nov Operator', '777888999']
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

describe('handshake-snapshot', () => {
  test('buildTelegramHandshakeSnapshot counts invite gaps', async () => {
    const db = new Database(':memory:');
    seedGapPartner(db);
    const snap = await buildTelegramHandshakeSnapshot(db);
    expect(snap).not.toBeNull();
    expect(snap!.partners).toBe(1);
    expect(snap!.inviteGaps).toBe(1);
    expect(snap!.rows[0]!.membershipCell).toBe('2·house!');
    expect(snap!.rows[0]!.needsPartnerInForum).toBe(true);
    expect(snap!.rows[0]!.verifyTotal).toBeGreaterThan(0);
    expect(snap!.rows[0]!.lanesTotal).toBeGreaterThan(0);
    expect(snap!.forumReady).toBeGreaterThanOrEqual(0);
    expect(snap!.catalogPath).toBe('/registry/telegram-handshake-catalog.json');
    db.close();
  });

  test('export and load round-trip', async () => {
    const dir = join(tmpdir(), `tg-hs-snap-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const db = new Database(':memory:');
    seedGapPartner(db);
    const slice = await exportTelegramHandshakeSnapshot(db, dir);
    expect(slice.available).toBe(true);
    expect(slice.inviteGaps).toBe(1);

    const loaded = loadTelegramHandshakeSummarySlice(
      join(dir, 'public/registry/telegram-handshake.json')
    );
    expect(loaded.partners).toBe(1);
    expect(loaded.rows[0]!.partnerCode).toBe('NOV');
    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('snapshotToSummarySlice handles null', () => {
    const slice = snapshotToSummarySlice(null);
    expect(slice.available).toBe(false);
    expect(slice.rows).toEqual([]);
  });
});
