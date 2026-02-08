import { test, expect, describe } from 'bun:test';
import { PackageManager } from './package-manager.ts';

describe('PackageManager', () => {
  test('constructor sets projectRoot', () => {
    const pm = new PackageManager('/tmp/test-project');
    // @ts-expect-error — accessing private for test
    expect(pm.projectRoot).toBe('/tmp/test-project');
  });

  test('constructor defaults projectRoot from Bun.env.PWD', () => {
    const pm = new PackageManager();
    // @ts-expect-error — accessing private for test
    expect(pm.projectRoot).toBeTruthy();
  });

  test('analyzePackage reads package.json from projectRoot', async () => {
    // Use a minimal fixture to avoid scanning the whole repo
    const fixtureDir = '/private/tmp/claude-501/-Users-nolarose-Projects/e56fa682-363f-4c3b-ac29-91890d7d1ad0/scratchpad/test-pkg';
    await Bun.write(`${fixtureDir}/package.json`, JSON.stringify({
      name: 'fixture-pkg', version: '2.0.0', description: 'fixture',
      dependencies: { zod: '^3.0.0' }, devDependencies: {},
    }));
    const pm = new PackageManager(fixtureDir);
    const info = await pm.analyzePackage();
    expect(info.name).toBe('fixture-pkg');
    expect(info.version).toBe('2.0.0');
  });

  test('analyzePackage returns PackageInfo shape', async () => {
    const fixtureDir = '/private/tmp/claude-501/-Users-nolarose-Projects/e56fa682-363f-4c3b-ac29-91890d7d1ad0/scratchpad/test-pkg';
    const pm = new PackageManager(fixtureDir);
    const info = await pm.analyzePackage();
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('description');
    expect(info).toHaveProperty('dependencies');
    expect(info).toHaveProperty('devDependencies');
  });

  test('generateR2Config produces sanitized bucket name', async () => {
    const pm = new PackageManager('/tmp/test');
    // @ts-expect-error — accessing private for test
    const config = await pm.generateR2Config('@scope/my-pkg');
    expect(config.bucket).toBe('bun-docs--scope-my-pkg');
    expect(config.prefix).toStartWith('v');
  });

  test('findRSSFeeds returns undefined when no RSS deps', async () => {
    const pm = new PackageManager('/tmp/test');
    // @ts-expect-error — accessing private for test
    const feed = await pm.findRSSFeeds({ dependencies: { lodash: '1.0.0' }, devDependencies: {} });
    expect(feed).toBeUndefined();
  });

  test('scanForBunAPIs returns empty array for directory with no .ts files', async () => {
    const emptyDir = '/private/tmp/claude-501/-Users-nolarose-Projects/17a20145-4907-44c4-95a6-91c58d543f30/scratchpad/empty-scan';
    await Bun.$`mkdir -p ${emptyDir}`.quiet();
    await Bun.write(`${emptyDir}/readme.md`, '# Hello');
    const pm = new PackageManager(emptyDir);
    // @ts-expect-error — accessing private for test
    const apis = await pm.scanForBunAPIs();
    expect(apis).toEqual([]);
  });

  test('findRSSFeeds returns feed URL when rss-parser is in deps', async () => {
    const pm = new PackageManager('/tmp/test');
    // @ts-expect-error — accessing private for test
    const feed = await pm.findRSSFeeds({
      dependencies: { 'rss-parser': '^3.0.0' },
      devDependencies: {},
    });
    expect(feed).toBe('https://www.npmjs.com/package/rss-parser/rss');
  });

  test('findRSSFeeds returns pkg.rss if set directly', async () => {
    const pm = new PackageManager('/tmp/test');
    // @ts-expect-error — accessing private for test
    const feed = await pm.findRSSFeeds({
      rss: 'https://custom.com/feed.xml',
      dependencies: {},
      devDependencies: {},
    });
    expect(feed).toBe('https://custom.com/feed.xml');
  });

  test('generateR2Config sanitizes @ and / chars', async () => {
    const pm = new PackageManager('/tmp/test');
    // @ts-expect-error — accessing private for test
    const config = await pm.generateR2Config('@my-org/cool-pkg');
    expect(config.bucket).not.toContain('@');
    expect(config.bucket).not.toContain('/');
    expect(config.bucket).toBe('bun-docs--my-org-cool-pkg');
  });
});
