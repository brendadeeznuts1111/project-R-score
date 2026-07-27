import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assessForumMetadata,
  loadPackageGroupForumMetadata,
  packageGroupTopicsThreadMap,
  parsePackageGroupForumMetadata,
  validateForumMetadataAgainstRegistry,
  PACKAGE_GROUP_FORUM_TOPICS,
  PACKAGE_GROUP_FORUM_TOPICS_MTProto,
} from '../lib/telegram/package-group-forum.ts';

describe('package-group-forum', () => {
  test('topic SSOT lists General + MTProto topics', () => {
    expect(PACKAGE_GROUP_FORUM_TOPICS).toEqual(['General', 'Ops', 'Alerts']);
    expect(PACKAGE_GROUP_FORUM_TOPICS_MTProto).toEqual(['Ops', 'Alerts']);
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
});
