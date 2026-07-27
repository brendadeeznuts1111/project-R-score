import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { assessHandshakeLanes } from '../lib/telegram/handshake-lanes.ts';
import {
  appendAckDmSeatDesignated,
  upsertPackageGroupRegistry,
  type PackageGroupCreateArtifact,
} from '../lib/telegram/package-group-registry.ts';
import { upsertKnownChat } from '../lib/telegram/known-chats.ts';

const createArtifact: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'NOV',
  display_name: 'Nov Ops',
  suggested_title: 'TOC Ops · NOV · Nov Ops',
  requested_by: 'NOV-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000099',
  timestamp: '2026-07-26T20:00:00.000Z',
};

describe('handshake-lanes', () => {
  test('marks operator lanes blocked until telegram for designated seat', async () => {
    const dir = join(tmpdir(), `lanes-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'forums'), { recursive: true });
    const jsonlPath = join(dir, 'pending.jsonl');
    await writeFile(
      jsonlPath,
      [
        createArtifact,
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
      ['n-nov', 'NOV-001', 'Nov Operator', null]
    );
    upsertPackageGroupRegistry(db, {
      partnerCode: 'NOV',
      chatId: '-1004464761699',
      displayName: 'Nov Ops',
      requestedBy: 'NOV-001',
      inviteLink: 'https://t.me/+test',
    });
    upsertKnownChat(db, {
      chat: {
        id: -1004464761699,
        type: 'supergroup',
        title: 'TOC Ops · NOV · Nov Ops',
        is_forum: true,
      },
      source: 'manual',
      surfaceSlug: 'nov-prod',
      botStatus: 'administrator',
    });

    await writeFile(
      join(dir, 'forums', 'NOV.json'),
      JSON.stringify({
        partnerCode: 'NOV',
        title: 'TOC Ops · NOV · Nov Ops',
        displayName: 'Nov Ops',
        chatId: '-1004464761699',
        chatRef: 'tg:chat:-1004464761699',
        inviteLink: 'https://t.me/+test',
        topics: [
          { title: 'General', messageThreadId: 1 },
          { title: 'Ops', messageThreadId: 5 },
          { title: 'Alerts', messageThreadId: 6 },
        ],
        topicsThreadMap: { general: 1, ops: 5, alerts: 6 },
        topicsComplete: true,
        iconUploaded: true,
        createdAt: '2026-07-26T20:00:00.000Z',
      })
    );

    const report = await assessHandshakeLanes({
      db,
      partnerCode: 'NOV',
      jsonlPath,
      forumsMetaDir: join(dir, 'forums'),
    });

    expect(report.allForumReady).toBe(true);
    expect(report.allOperatorReady).toBe(false);
    expect(report.blockedUntilLink).toContain('dm_telegram');
    expect(report.blockedUntilLink).toContain('welcome_dm');
    expect(report.readyNow).toContain('dm_designated');
    expect(report.lanes.find(l => l.id === 'route_alerts')?.ok).toBe(true);

    db.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('appendAckDmSeatDesignated is idempotent', async () => {
    const dir = join(tmpdir(), `dm-ack-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    const first = await appendAckDmSeatDesignated({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      path,
    });
    const second = await appendAckDmSeatDesignated({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      path,
    });
    expect(first.appended).toBe(true);
    expect(second.appended).toBe(false);
    await rm(dir, { recursive: true, force: true });
  });
});
