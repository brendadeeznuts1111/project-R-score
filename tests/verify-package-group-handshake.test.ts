import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import {
  upsertPackageGroupRegistry,
  type PackageGroupCreateArtifact,
} from '../lib/telegram/package-group-registry.ts';
import { verifyPackageGroupHandshake } from '../lib/telegram/verify-package-group-handshake.ts';

const createArtifact: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'ASH',
  display_name: 'Ash Ops',
  suggested_title: 'TOC Ops · ASH · Ash Ops',
  requested_by: 'ASH-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000001',
  timestamp: '2026-07-26T20:00:00.000Z',
};

describe('verify-package-group-handshake', () => {
  test('passes when create, wired, registry, and linked ack align', async () => {
    const dir = join(tmpdir(), `verify-pkg-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'forums-empty'), { recursive: true });
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

    const result = await verifyPackageGroupHandshake({
      db,
      partnerCode: 'ASH',
      jsonlPath: path,
      forumsMetaDir: join(dir, 'forums-empty'),
    });
    expect(result.ok).toBe(true);
    expect(result.checks.every(c => c.ok)).toBe(true);
    const metaCheck = result.checks.find(c => c.id === 'forum_metadata');
    expect(metaCheck?.ok).toBe(true);
    expect(metaCheck?.detail).toContain('no forums metadata');

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('fails with nextAction when pending create not wired', async () => {
    const dir = join(tmpdir(), `verify-pkg-fail-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    await writeFile(path, `${JSON.stringify(createArtifact)}\n`);

    const db = new Database(':memory:');
    const result = await verifyPackageGroupHandshake({
      db,
      partnerCode: 'ASH',
      jsonlPath: path,
    });
    expect(result.ok).toBe(false);
    expect(result.nextAction).toContain('package-group-wire');

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('live_forum_title check uses getChat when --live', async () => {
    const dir = join(tmpdir(), `verify-live-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    const lines = [
      createArtifact,
      {
        action: 'ack_package_group_wired',
        partner_code: 'ASH',
        chat_id: '-1001',
        telegram_ref: 'tg:chat:-1001',
        wired_by: 'ct',
        timestamp: '2026-07-26T21:00:00.000Z',
      },
      {
        action: 'ack_package_group_linked',
        partner_code: 'ASH',
        chat_id: '-1001',
        linked_by: 'factory',
        timestamp: '2026-07-26T22:00:00.000Z',
      },
    ];
    await writeFile(path, lines.map(l => JSON.stringify(l)).join('\n') + '\n');

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ok: true,
          result: { id: -1001, type: 'supergroup', title: 'TOC Ops · ASH · Ash Ops' },
        }),
        { status: 200 }
      )) as typeof fetch;

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1001',
      displayName: 'Ash Ops',
      requestedBy: 'ASH-001',
    });

    try {
      const result = await verifyPackageGroupHandshake({
        db,
        partnerCode: 'ASH',
        jsonlPath: path,
        forumsMetaDir: forumsDir,
        live: true,
        telegramToken: 'test-token',
      });
      const liveCheck = result.checks.find(c => c.id === 'live_forum_title');
      expect(liveCheck?.ok).toBe(true);
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
      db.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('forum_metadata check validates metadata file when present', async () => {
    const dir = join(tmpdir(), `verify-meta-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });
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
        timestamp: '2026-07-26T22:00:00.000Z',
      },
    ];
    await writeFile(path, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    await writeFile(
      join(forumsDir, 'ASH.json'),
      `${JSON.stringify({
        partnerCode: 'ASH',
        title: 'TOC Ops · ASH · Ash Ops',
        displayName: 'Ash Ops',
        chatId: '-1003937534779',
        chatRef: 'tg:chat:-1003937534779',
        inviteLink: 'https://t.me/+x',
        topics: [
          { title: 'General', messageThreadId: 1 },
          { title: 'Ops', messageThreadId: 2 },
          { title: 'Alerts', messageThreadId: 3 },
        ],
        iconUploaded: false,
        backfilled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      })}\n`
    );

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
      requestedBy: 'ASH-001',
    });

    const result = await verifyPackageGroupHandshake({
      db,
      partnerCode: 'ASH',
      jsonlPath: path,
      forumsMetaDir: forumsDir,
    });
    const metaCheck = result.checks.find(c => c.id === 'forum_metadata');
    expect(metaCheck?.ok).toBe(true);
    expect(result.ok).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('passes dm_seat when designated without telegram id', async () => {
    const dir = join(tmpdir(), `verify-dm-designated-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'forums-empty'), { recursive: true });
    const path = join(dir, 'pending.jsonl');
    const novCreate: PackageGroupCreateArtifact = {
      ...createArtifact,
      partner_code: 'NOV',
      display_name: 'Nov Ops',
      suggested_title: 'TOC Ops · NOV · Nov Ops',
      requested_by: 'NOV-001',
    };
    const lines = [
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
        registry_title: 'TOC Ops · NOV · Nov Ops',
        timestamp: '2026-07-26T22:00:00.000Z',
      },
    ];
    await writeFile(path, lines.map(l => JSON.stringify(l)).join('\n') + '\n');

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
      ['n-nov-001', 'NOV-001', 'Nov Operator', null]
    );
    upsertPackageGroupRegistry(db, {
      partnerCode: 'NOV',
      chatId: '-1004464761699',
      displayName: 'Nov Ops',
      requestedBy: 'NOV-001',
    });

    const result = await verifyPackageGroupHandshake({
      db,
      partnerCode: 'NOV',
      jsonlPath: path,
      forumsMetaDir: join(dir, 'forums-empty'),
    });
    const dm = result.checks.find(c => c.id === 'dm_seat');
    expect(dm?.ok).toBe(true);
    expect(dm?.detail).toContain('awaiting telegram');
    expect(result.ok).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
