import { describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { enhancePackageGroupForum } from '../lib/telegram/enhance-package-group-forum.ts';
import { upsertPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';

describe('enhance-package-group-forum', () => {
  test('fails without registry row', async () => {
    const db = new Database(':memory:');
    const result = await enhancePackageGroupForum({
      db,
      token: 'test-token',
      partnerCode: 'ZZZ',
      ensureTopics: true,
      dryRun: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('registry');
    db.close();
  });

  test('dry-run loads registry and preserves topic plan', async () => {
    const dir = join(tmpdir(), `enhance-forum-${Date.now()}`);
    const forumsDir = join(dir, 'forums');
    await mkdir(forumsDir, { recursive: true });

    const db = new Database(':memory:');
    upsertPackageGroupRegistry(db, {
      partnerCode: 'TST',
      chatId: '-10099',
      displayName: 'Test Ops',
    });

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/getChat')) {
        return new Response(
          JSON.stringify({
            ok: true,
            result: { id: -10099, type: 'supergroup', is_forum: true, title: 'TOC Ops · TST · Test Ops' },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/getMe')) {
        return new Response(JSON.stringify({ ok: true, result: { id: 1 } }), { status: 200 });
      }
      if (url.includes('/getChatMember')) {
        return new Response(
          JSON.stringify({
            ok: true,
            result: { status: 'administrator', can_manage_topics: true },
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await enhancePackageGroupForum({
        db,
        token: 'test-token',
        partnerCode: 'TST',
        ensureTopics: true,
        dryRun: true,
        forumsMetaDir: forumsDir,
      });
      expect(result.ok).toBe(true);
      expect(result.topics.map(t => t.title)).toEqual(['General', 'Ops', 'Alerts']);
      expect(result.topics[0]?.messageThreadId).toBe(1);
      expect(result.metadataPath).toBeNull();
    } finally {
      globalThis.fetch = origFetch;
      db.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
