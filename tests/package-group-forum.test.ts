import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { upsertPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';
import {
  assessForumMetadata,
  loadPackageGroupForumMetadata,
  packageGroupTopicMapKey,
  packageGroupTopicsThreadMap,
  parsePackageGroupForumMetadata,
  PARTNER_PACKAGE_FORUM_TOPIC_PLAN,
  resolvePackageGroupTopicsForChat,
  threadIdForPackageGroupOutboxTopic,
  validateForumMetadataAgainstRegistry,
  PACKAGE_GROUP_FORUM_TOPICS,
  PACKAGE_GROUP_FORUM_TOPICS_MTProto,
} from '../lib/telegram/package-group-forum.ts';

describe('package-group-forum', () => {
  test('topic SSOT lists General + MTProto topics', () => {
    expect(PACKAGE_GROUP_FORUM_TOPICS).toEqual([
      'General',
      'Ops',
      'Alerts',
      'Liquidity/Outs',
      'Accounting',
    ]);
    expect(PACKAGE_GROUP_FORUM_TOPICS_MTProto).toEqual([
      'Ops',
      'Alerts',
      'Liquidity/Outs',
      'Accounting',
    ]);
    expect(PARTNER_PACKAGE_FORUM_TOPIC_PLAN.map(r => r.title)).toEqual([
      ...PACKAGE_GROUP_FORUM_TOPICS,
    ]);
  });

  test('packageGroupTopicMapKey lowercases titles for thread map', () => {
    expect(packageGroupTopicMapKey('Liquidity/Outs')).toBe('liquidity/outs');
    expect(packageGroupTopicMapKey('Accounting')).toBe('accounting');
  });

  test('packageGroupTopicsThreadMap always includes general=1', () => {
    const map = packageGroupTopicsThreadMap([
      { title: 'General', messageThreadId: 1 },
      { title: 'Ops', messageThreadId: 42 },
      { title: 'Alerts', messageThreadId: 43 },
    ]);
    expect(map).toEqual({ general: 1, ops: 42, alerts: 43 });
  });

  test('loadPackageGroupForumMetadata reads JSON file', async () => {
    const dir = join(tmpdir(), `pkg-forum-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const meta = {
      partnerCode: 'TST',
      title: 'TOC Ops · TST · Test',
      displayName: 'Test',
      chatId: '-10099',
      chatRef: 'tg:chat:-10099',
      inviteLink: 'https://t.me/+x',
      topics: [
        { title: 'General', messageThreadId: 1 },
        { title: 'Ops', messageThreadId: 2 },
        { title: 'Alerts', messageThreadId: 3 },
        { title: 'Liquidity/Outs', messageThreadId: 4 },
        { title: 'Accounting', messageThreadId: 5 },
      ],
      iconUploaded: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await writeFile(join(dir, 'TST.json'), `${JSON.stringify(meta)}\n`);

    const loaded = await loadPackageGroupForumMetadata('TST', { rootDir: dir });
    expect(loaded?.chatId).toBe('-10099');
    expect(parsePackageGroupForumMetadata(meta)?.partnerCode).toBe('TST');

    const v = validateForumMetadataAgainstRegistry(loaded!, 'TST', '-10099');
    expect(v.ok).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  test('validateForumMetadataAgainstRegistry fails on chat_id mismatch', () => {
    const meta = {
      partnerCode: 'TST',
      title: 'x',
      displayName: 'x',
      chatId: '-1001',
      chatRef: 'tg:chat:-1001',
      inviteLink: '',
      topics: [
        { title: 'General', messageThreadId: 1 },
        { title: 'Ops', messageThreadId: null },
        { title: 'Alerts', messageThreadId: null },
      ],
      iconUploaded: false,
      backfilled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const v = validateForumMetadataAgainstRegistry(meta, 'TST', '-1002');
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('registry');
  });

  test('assessForumMetadata reports completeness and icon state', () => {
    expect(assessForumMetadata(null).present).toBe(false);
    const partial = assessForumMetadata({
      partnerCode: 'TST',
      title: 'x',
      displayName: 'x',
      chatId: '-1',
      chatRef: 'tg:chat:-1',
      inviteLink: '',
      topics: [
        { title: 'General', messageThreadId: 1 },
        { title: 'Ops', messageThreadId: null },
        { title: 'Alerts', messageThreadId: null },
      ],
      iconUploaded: false,
      backfilled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(partial.topicsComplete).toBe(false);
    expect(partial.iconState).toBe('backfilled');
  });

  test('threadIdForPackageGroupOutboxTopic maps ops channel topics to forum threads', () => {
    const topics = { general: 1, ops: 12, alerts: 11, 'liquidity/outs': 18 };
    expect(threadIdForPackageGroupOutboxTopic(topics, 'alerts')).toBe(11);
    expect(threadIdForPackageGroupOutboxTopic(topics, 'plays')).toBe(12);
    expect(threadIdForPackageGroupOutboxTopic(topics, 'dod')).toBe(11);
    expect(threadIdForPackageGroupOutboxTopic(topics, 'toc')).toBe(18);
    expect(threadIdForPackageGroupOutboxTopic(topics, 'identity', 'partner.welcome')).toBeUndefined();
  });

  test('resolvePackageGroupTopicsForChat joins registry + metadata file', async () => {
    const dir = join(tmpdir(), `pkg-forum-resolve-${Date.now()}`);
    const metaDir = join(dir, 'forums');
    await mkdir(metaDir, { recursive: true });
    await writeFile(
      join(metaDir, 'ASH.json'),
      `${JSON.stringify({
        partnerCode: 'ASH',
        title: 'TOC Ops · ASH · Ash Ops',
        displayName: 'Ash Ops',
        chatId: '-1003937534779',
        chatRef: 'tg:chat:-1003937534779',
        inviteLink: '',
        topics: [
          { title: 'General', messageThreadId: 1 },
          { title: 'Ops', messageThreadId: 12 },
          { title: 'Alerts', messageThreadId: 11 },
        ],
        iconUploaded: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      })}\n`
    );

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'ASH',
      chatId: '-1003937534779',
      displayName: 'Ash Ops',
    });

    const lookup = await resolvePackageGroupTopicsForChat(db, '-1003937534779', metaDir);
    expect(lookup?.partnerCode).toBe('ASH');
    expect(lookup?.topics).toEqual({ general: 1, ops: 12, alerts: 11 });

    db.close();
    await rm(dir, { recursive: true, force: true });
  });
});
