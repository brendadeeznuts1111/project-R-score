/**
 * R2Storage — Bun S3Client path with in-memory bucket (no network).
 */
import { describe, expect, test } from 'bun:test';
import {
  createMemoryR2Bucket,
  R2Storage,
} from '../lib/r2/r2-storage-enhanced.ts';
import { asAccessKeyId, asAccountId } from '../lib/types/branded.ts';

function makeStorage() {
  const mem = createMemoryR2Bucket();
  const storage = new R2Storage(
    {
      accountId: asAccountId('acct-test-r2'),
      accessKeyId: asAccessKeyId('AKIA_TEST'),
      secretAccessKey: 'secret-test-not-real',
      defaultBucket: 'docs-bucket',
    },
    { clientFactory: () => mem }
  );
  return { storage, mem };
}

describe('R2Storage S3Client ground', () => {
  test('putJson / getJson round-trip via Uint8Array UTF-8', async () => {
    const { storage, mem } = makeStorage();
    await storage.putJson('cfg/hello.json', { ok: true, n: 1 });
    expect(mem.objects.has('cfg/hello.json')).toBe(true);
    const got = await storage.getJson('cfg/hello.json');
    expect(got).toEqual({ ok: true, n: 1 });
  });

  test('getOrCreateBucket writes package config under default bucket', async () => {
    const { storage } = makeStorage();
    const bucket = await storage.getOrCreateBucket('My.Package');
    expect(bucket).toBe('docs-bucket');
    const cfg = (await storage.getJson('_config/My.Package/bucket.json')) as {
      bucket: string;
      package: string;
    };
    expect(cfg.bucket).toBe('docs-bucket');
    expect(cfg.package).toBe('My.Package');
    // second call reuses config
    expect(await storage.getOrCreateBucket('My.Package')).toBe('docs-bucket');
  });

  test('uploadPackageDocs gzip + getPackageDocs gunzip', async () => {
    const { storage, mem } = makeStorage();
    const url = await storage.uploadPackageDocs('demo-pkg', { hello: 'world' });
    expect(url).toContain('demo-pkg');
    const docKeys = [...mem.objects.keys()].filter(k => k.endsWith('/docs.json'));
    expect(docKeys.length).toBe(1);
    const version = docKeys[0]!.split('/')[2]!;
    const docs = await storage.getPackageDocs('demo-pkg', version);
    expect(docs).toEqual({ hello: 'world' });
  });

  test('listPackages discovers config markers', async () => {
    const { storage } = makeStorage();
    await storage.createBucketForPackage('alpha');
    await storage.createBucketForPackage('beta');
    const list = await storage.listPackages();
    const names = list.map(p => p.name).sort();
    expect(names).toEqual(['alpha', 'beta']);
  });

  test('missing key returns null (not throw)', async () => {
    const { storage } = makeStorage();
    expect(await storage.get('nope.txt')).toBeNull();
    expect(await storage.getJson('missing.json')).toBeNull();
  });

  test('rejects empty package name', async () => {
    const { storage } = makeStorage();
    await expect(storage.getOrCreateBucket('')).rejects.toThrow(/Invalid package name/);
  });
});
