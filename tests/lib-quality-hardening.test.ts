import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AdvancedLRUCache, aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { isValidRequest } from '../lib/core/validation.ts';
import { FRAGMENT_VALIDATION } from '../lib/docs/constants/fragments.ts';
import { PackageManager } from '../lib/package/package-manager.ts';
import { ObjectUtils } from '../lib/utils/index.ts';
import {
  asPortalTenantId,
  asTelegramUserId,
} from '../lib/types/branded.ts';

const temporaryDirectories: string[] = [];

function makeTemporaryProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'factorywager-lib-quality-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

afterAll(() => {
  aiOperations.stop();
});

describe('lib quality hardening', () => {
  test('LRU cache evicts the least-recently-used data node without sentinel values', () => {
    const cache = new AdvancedLRUCache<number>({
      maxSize: 2,
      cleanupInterval: 60_000,
      enableMemoryTracking: false,
    });

    try {
      cache.set('first', 1);
      cache.set('second', 2);
      expect(cache.get('first')).toBe(1);

      cache.set('third', 3);

      expect(cache.get('second')).toBeNull();
      expect(cache.getEntries()).toEqual([
        { key: 'first', value: 1, expires: expect.any(Number) },
        { key: 'third', value: 3, expires: expect.any(Number) },
      ]);
      expect(cache.getStats().evictions).toBe(1);
    } finally {
      cache.stop();
    }
  });

  test('request guard rejects malformed header shapes', () => {
    expect(isValidRequest({ method: 'GET', headers: { authorization: 'Bearer token' } })).toBeTrue();
    expect(isValidRequest({ headers: null })).toBeFalse();
    expect(isValidRequest({ headers: [] })).toBeFalse();
    expect(isValidRequest({ headers: { authorization: 42 } })).toBeFalse();
  });

  test('fragment validation narrows names before value lookup', () => {
    expect(FRAGMENT_VALIDATION.isValidParam('theme', 'dark')).toBeTrue();
    expect(FRAGMENT_VALIDATION.isValidParam('theme', 'neon')).toBeFalse();
    expect(FRAGMENT_VALIDATION.isValidParam('__proto__', 'dark')).toBeFalse();
  });

  test('deep merge preserves nested records and replaces non-record leaves', () => {
    const result = ObjectUtils.deepMerge(
      { feature: { enabled: false, retries: 1 }, labels: ['base'] },
      { feature: { enabled: true }, labels: ['override'] }
    );

    expect(result).toEqual({
      feature: { enabled: true, retries: 1 },
      labels: ['override'],
    });
  });

  test('package analysis parses the package.json boundary', async () => {
    const project = makeTemporaryProject();
    await Bun.write(
      join(project, 'package.json'),
      JSON.stringify({
        name: '@factorywager/example',
        version: '1.2.3',
        dependencies: { effect: '^3.0.0', invalid: 42 },
        devDependencies: { typescript: '^5.0.0' },
        rss: 'https://example.com/feed.xml',
      })
    );

    const info = await new PackageManager(project).analyzePackage();

    expect(info).toMatchObject({
      name: '@factorywager/example',
      version: '1.2.3',
      dependencies: { effect: '^3.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      rssFeed: 'https://example.com/feed.xml',
    });
  });

  test('package analysis rejects a non-object package manifest', async () => {
    const project = makeTemporaryProject();
    await Bun.write(join(project, 'package.json'), '[]');

    await expect(new PackageManager(project).analyzePackage()).rejects.toThrow(
      'package.json must contain an object'
    );
  });

  test('expert lookup deserializes SQLite rows into the TreeNode domain shape', async () => {
    const project = makeTemporaryProject();
    const accounts = new AccountSystem(
      asPortalTenantId('operations'),
      join(project, 'accounts.db')
    );

    try {
      const created = await accounts.create({
        type: 'agent',
        parentId: null,
        expertId: 'expert-1',
        name: 'Typed Agent',
        telegramId: asTelegramUserId('100001'),
        railPreference: 'paypal',
        cutPercentage: 10,
        phoneId: null,
        status: 'active',
      });

      expect(accounts.getNodesForExpert('expert-1')).toEqual([created]);

      for (let play = 0; play < 50; play++) {
        accounts.recordPlayPlaced(created.id, 200, 20);
      }
      await expect(accounts.canPromote(created.id)).resolves.toEqual({ eligible: true });
    } finally {
      accounts.close();
    }
  });
});
