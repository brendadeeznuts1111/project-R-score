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
    });

    const result = await verifyPackageGroupHandshake({
      db,
      partnerCode: 'ASH',
      jsonlPath: path,
    });
    expect(result.ok).toBe(true);
    expect(result.checks.every(c => c.ok)).toBe(true);

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
    await mkdir(dir, { recursive: true });
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
    });

    try {
      const result = await verifyPackageGroupHandshake({
        db,
        partnerCode: 'ASH',
        jsonlPath: path,
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
});
