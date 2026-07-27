import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { assessHandshakeReadiness } from '../lib/telegram/handshake-readiness.ts';
import {
  upsertPackageGroupRegistry,
  type PackageGroupCreateArtifact,
} from '../lib/telegram/package-group-registry.ts';
import { upsertKnownChat, updateKnownChatMemberCount } from '../lib/telegram/known-chats.ts';

const novCreate: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'NOV',
  display_name: 'Nov Ops',
  suggested_title: 'TOC Ops · NOV · Nov Ops',
  requested_by: 'NOV-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000099',
  timestamp: '2026-07-26T20:00:00.000Z',
};

const ashCreate: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'ASH',
  display_name: 'Ash Ops',
  suggested_title: 'TOC Ops · ASH · Ash Ops',
  requested_by: 'ASH-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000001',
  timestamp: '2026-07-26T20:00:00.000Z',
};

function seedTreeNodes(db: Database): void {
  db.run(`
    CREATE TABLE tree_nodes (
      id TEXT PRIMARY KEY,
      call_sign TEXT,
      name TEXT,
      telegram_id TEXT,
      active INTEGER DEFAULT 1
    )
  `);
}

async function writeForumMeta(
  forumsDir: string,
  partnerCode: string,
  chatId: string, // brand-ok — Telegram chat_id wire
  displayName: string
): Promise<void> {
  await writeFile(
    join(forumsDir, `${partnerCode}.json`),
    JSON.stringify({
      partnerCode,
      title: `TOC Ops · ${partnerCode} · ${displayName}`,
      displayName,
      chatId,
      chatRef: `tg:chat:${chatId}`,
      inviteLink: 'https://t.me/+test',
      topics: [
        { title: 'General', messageThreadId: 1 },
        { title: 'Ops', messageThreadId: 5 },
        { title: 'Alerts', messageThreadId: 6 },
        { title: 'Liquidity/Outs', messageThreadId: 4 },
        { title: 'Accounting', messageThreadId: 7 },
      ],
      topicsThreadMap: { general: 1, ops: 5, alerts: 6, 'liquidity/outs': 4, accounting: 7 },
      topicsComplete: true,
      iconUploaded: true,
      createdAt: '2026-07-26T20:00:00.000Z',
    })
  );
}

describe('handshake-readiness', () => {
  test('forum_ready when registry+forum ok and dm seat none', async () => {
    const dir = join(tmpdir(), `readiness-forum-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(jsonlPath, `${JSON.stringify(novCreate)}\n`);

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'NOV',
      chatId: '-1004464761699',
      displayName: 'Nov Ops',
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
    await writeForumMeta(forumsDir, 'NOV', '-1004464761699', 'Nov Ops');

    const row = await assessHandshakeReadiness({
      db,
      partnerCode: 'NOV',
      jsonlPath,
      forumsMetaDir: forumsDir,
    });

    expect(row.phase).toBe('forum_ready');
    expect(row.registryOk).toBe(true);
    expect(row.forumOk).toBe(true);
    expect(row.dmSeat.status).toBe('none');

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('designated when NOV-style seat without telegram', async () => {
    const dir = join(tmpdir(), `readiness-designated-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(
      jsonlPath,
      [
        novCreate,
        {
          action: 'ack_package_group_wired',
          partner_code: 'NOV',
          chat_id: '-1004464761699',
          telegram_ref: 'tg:chat:-1004464761699',
          wired_by: 'ct',
          timestamp: '2026-07-26T21:00:00.000Z',
        },
        {
          action: 'ack_package_group_linked',
          partner_code: 'NOV',
          chat_id: '-1004464761699',
          linked_by: 'factory',
          timestamp: '2026-07-26T22:00:00.000Z',
        },
      ]
        .map(l => JSON.stringify(l))
        .join('\n') + '\n'
    );

    const db = new Database(':memory:');
    seedTreeNodes(db);
    db.run(
      `INSERT INTO tree_nodes (id, call_sign, name, telegram_id, active) VALUES (?, ?, ?, ?, 1)`,
      ['n-nov', 'NOV-001', 'Nov Operator', null]
    );
    upsertPackageGroupRegistry(db, {
      partnerCode: 'NOV',
      chatId: '-1004464761699',
      displayName: 'Nov Ops',
      requestedBy: 'NOV-001',
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
    await writeForumMeta(forumsDir, 'NOV', '-1004464761699', 'Nov Ops');

    const row = await assessHandshakeReadiness({
      db,
      partnerCode: 'NOV',
      jsonlPath,
      forumsMetaDir: forumsDir,
    });

    expect(row.phase).toBe('designated');
    expect(row.dmSeat.status).toBe('designated');
    expect(row.dmSeat.callSign).toBe('NOV-001');
    expect(row.forumOk).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('operator_ready when linked seat and verify passes', async () => {
    const dir = join(tmpdir(), `readiness-operator-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(
      jsonlPath,
      [
        ashCreate,
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
      ]
        .map(l => JSON.stringify(l))
        .join('\n') + '\n'
    );

    const db = new Database(':memory:');
    seedTreeNodes(db);
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
    updateKnownChatMemberCount(db, '-1003937534779', 3);
    await writeForumMeta(forumsDir, 'ASH', '-1003937534779', 'Ash Ops');

    const row = await assessHandshakeReadiness({
      db,
      partnerCode: 'ASH',
      jsonlPath,
      forumsMetaDir: forumsDir,
    });

    expect(row.phase).toBe('operator_ready');
    expect(row.dmSeat.status).toBe('linked');
    expect(row.handshakeOk).toBe(true);
    expect(row.nextSteps.some(s => s.includes('welcome DM'))).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('blocked when linked seat but verify fails on missing jsonl ack', async () => {
    const dir = join(tmpdir(), `readiness-blocked-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(jsonlPath, `${JSON.stringify(ashCreate)}\n`);

    const db = new Database(':memory:');
    seedTreeNodes(db);
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
    await writeForumMeta(forumsDir, 'ASH', '-1003937534779', 'Ash Ops');

    const row = await assessHandshakeReadiness({
      db,
      partnerCode: 'ASH',
      jsonlPath,
      forumsMetaDir: forumsDir,
    });

    expect(row.phase).toBe('blocked');
    expect(row.dmSeat.status).toBe('linked');
    expect(row.handshakeOk).toBe(false);
    expect(row.gaps.some(g => g.includes('jsonl') || g.includes('wired') || g.includes('linked'))).toBe(
      true
    );

    db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
