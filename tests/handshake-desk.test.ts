import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import {
  upsertPackageGroupRegistry,
  type PackageGroupCreateArtifact,
} from '../lib/telegram/package-group-registry.ts';
import { upsertKnownChat, updateKnownChatMemberCount } from '../lib/telegram/known-chats.ts';
import {
  buildHandshakeDesk,
  formatHandshakeDeskTable,
} from '../lib/telegram/handshake-desk.ts';
import { formatMembershipDeskCell } from '../lib/telegram/package-group-membership.ts';


function pkgSurfaceEnv(
  partnerCode: string,
  chatId: string, // brand-ok — Telegram chat_id wire
): Record<string, string> {
  return {
    TELEGRAM_SURFACES: JSON.stringify({ [`pkg-${partnerCode.toLowerCase()}`]: chatId }),
  };
}

const createArtifact: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'ASH',
  display_name: 'Ash Ops',
  suggested_title: 'TOC Ops · ASH · Ash Ops',
  requested_by: 'ASH-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000001',
  timestamp: '2026-07-26T20:00:00.000Z',
};

describe('handshake-desk', () => {
  test('joins registry, known chat, and verify status', async () => {
    const dir = join(tmpdir(), `handshake-desk-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    const lines = [
      createArtifact,
      {
        action: 'ack_package_group_wired',
        partner_code: 'ASH',
        chat_id: '-1003937534779',
        telegram_ref: 'tg:chat:-1003937534779',
        wired_by: 'ct',
        timestamp: '2026-07-26T21:00:00.000Z',
      },
      {
        action: 'ack_package_group_linked',
        partner_code: 'ASH',
        chat_id: '-1003937534779',
        linked_by: 'factory',
        registry_title: 'TOC Ops · ASH · Ash Ops',
        timestamp: '2026-07-26T22:00:00.000Z',
      },
    ];
    await writeFile(path, lines.map(l => JSON.stringify(l)).join('\n') + '\n');

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
      requestedBy: 'ASH-001',
    });
    upsertKnownChat(db, {
      chat: {
        id: -1003937534779,
        type: 'supergroup',
        title: 'TOC Ops · ASH · Ash Ops',
        is_forum: true,
      },
      source: 'manual',
    });
    updateKnownChatMemberCount(db, '-1003937534779', 2);

    const { rows } = await buildHandshakeDesk({
      db,
      jsonlPath: path,
      verify: true,
      env: pkgSurfaceEnv('ASH', '-1003937534779'),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.partnerCode).toBe('ASH');
    expect(rows[0]!.handshakeOk).toBe(true);
    expect(rows[0]!.chatType).toBe('supergroup');
    expect(rows[0]!.isForum).toBe(true);
    expect(rows[0]!.memberCount).toBe(2);
    expect(rows[0]!.hasInvite).toBe(false);

    const table = formatHandshakeDeskTable(rows);
    expect(table.some(l => l.includes('ASH'))).toBe(true);
    expect(rows[0]!.handshakeOk).toBe(true);
    expect(rows[0]!.checksPassed).toBe(rows[0]!.checksTotal);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('filters by partner code', async () => {
    const dir = join(tmpdir(), `handshake-desk-filter-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    await writeFile(path, '');

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1001',
      displayName: 'Ash',
    });
    upsertPackageGroupRegistry(db, {
      partnerCode: 'PAT',
      chatId: '-1002',
      displayName: 'Pat',
    });

    const { rows } = await buildHandshakeDesk({
      db,
      partnerCodes: ['PAT'],
      jsonlPath: path,
      verify: false,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.partnerCode).toBe('PAT');

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('linked seat at house-only count flags forum invite gap', async () => {
    const dir = join(tmpdir(), `handshake-desk-invite-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    await writeFile(path, '');

    const db = new Database(':memory:');
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
      ['n-ash', 'ASH-001', 'Ash Operator', '8013171035']
    );
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
      requestedBy: 'ASH-001',
    });
    upsertKnownChat(db, {
      chat: {
        id: -1003937534779,
        type: 'supergroup',
        title: 'TOC Ops · ASH · Ash Ops',
        is_forum: true,
      },
      source: 'manual',
    });
    updateKnownChatMemberCount(db, '-1003937534779', 2);

    const { rows } = await buildHandshakeDesk({
      db,
      jsonlPath: path,
      verify: false,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.dmSeatStatus).toBe('linked');
    expect(rows[0]!.memberCount).toBe(2);
    expect(rows[0]!.membershipTell.needsPartnerInForum).toBe(true);
    expect(formatMembershipDeskCell(rows[0]!.membershipTell, rows[0]!.dmSeatStatus)).toBe(
      '2·house!'
    );

    const table = formatHandshakeDeskTable(rows);
    expect(table.some(l => l.includes('2·house!'))).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
