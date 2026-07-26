import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendAckPackageGroupLinked,
  appendAckPackageGroupWired,
  appendPackageGroupEventLog,
  parsePackageGroupEventLog,
  readOpenPendingPackageGroups,
  resolveOpenPendingCreates,
  type PackageGroupCreateArtifact,
} from '../lib/telegram/package-group-registry.ts';

const createArtifact: PackageGroupCreateArtifact = {
  action: 'create_package_group',
  partner_code: 'ASH',
  display_name: 'Ash Ops',
  suggested_title: 'TOC Ops · ASH · Ash Ops',
  requested_by: 'ASH-001',
  tree_node_id: '019f0000-0000-7000-8000-000000000001',
  timestamp: '2026-07-26T20:00:00.000Z',
};

describe('package group event log', () => {
  test('resolveOpenPendingCreates hides wired acks', () => {
    const log = parsePackageGroupEventLog(
      [
        JSON.stringify(createArtifact),
        JSON.stringify({
          action: 'ack_package_group_wired',
          partner_code: 'ASH',
          chat_id: '-1001',
          telegram_ref: 'tg:chat:-1001',
          wired_by: 'ct',
          timestamp: '2026-07-26T21:00:00.000Z',
        }),
      ].join('\n')
    );
    expect(resolveOpenPendingCreates(log)).toEqual([]);
  });

  test('readOpenPendingPackageGroups and ack append idempotent', async () => {
    const dir = join(tmpdir(), `pkg-log-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    await writeFile(path, `${JSON.stringify(createArtifact)}\n`);

    const openBefore = await readOpenPendingPackageGroups(path);
    expect(openBefore.length).toBe(1);

    const wired = await appendAckPackageGroupWired({
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      telegramRef: 'tg:chat:-1003937534779',
      path,
    });
    expect(wired.appended).toBe(true);

    const openAfter = await readOpenPendingPackageGroups(path);
    expect(openAfter.length).toBe(0);

    const again = await appendAckPackageGroupWired({
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      telegramRef: 'tg:chat:-1003937534779',
      path,
    });
    expect(again.appended).toBe(false);

    const linked = await appendAckPackageGroupLinked({
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      registryTitle: 'TOC Ops · ASH · Ash Ops',
      path,
    });
    expect(linked.appended).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  test('appendPackageGroupEventLog appends create line', async () => {
    const dir = join(tmpdir(), `pkg-create-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'pending.jsonl');
    await appendPackageGroupEventLog(path, createArtifact);
    const open = await readOpenPendingPackageGroups(path);
    expect(open.length).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });
});
