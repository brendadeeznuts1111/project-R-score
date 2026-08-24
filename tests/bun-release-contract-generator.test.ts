import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  blogUrlForVersion,
  categoryForHeading,
  extractReleaseItems,
  normalizeVersion,
  parseReleaseInventory,
  releaseInventoryItemKey,
  renderReleaseInventory,
  validateReleaseInventoryCoverage,
} from '../packages/bun-release-contracts/src/generator';
import {
  parseReleaseFeed,
  selectReleaseFeedEntries,
} from '../packages/bun-release-contracts/src/feed';
import {
  readReleaseInventories,
  renderReleaseInventoryIndex,
  validateReleaseInventoryDirectory,
} from '../packages/bun-release-contracts/src/catalog';
import {
  generateReleaseInventoryBatch,
  runCli,
} from '../packages/bun-release-contracts/src/cli';

const FIXTURE = `<!doctype html>
<html><body>
  <nav><ul><li>Navigation item must be ignored</li></ul></nav>
  <article>
    <h2>Bun.Image — Built-in <code>Image</code> Processing<a class="anchor">#</a></h2>
    <p>Processes images without a native package dependency.</p>
    <ul><li>Accepts <code>Blob</code> and typed array inputs.</li></ul>
    <h2>Bugfixes</h2>
    <ul><li>FormData boundary format <strong>matches WebKit</strong>.</li></ul>
    <h3>Node.js compatibility fixes</h3>
    <ol><li>Fixed quoted &amp; normalized text.</li></ol>
  </article>
</body></html>`;

function releaseFetch(
  responses: Record<string, { body?: string; status?: number }>,
  onRequest?: () => Promise<void> | void
): typeof fetch {
  return (async input => {
    await onRequest?.();
    const version = /bun-v(\d+\.\d+\.\d+)/.exec(String(input))?.[1] ?? '';
    const response = responses[version];
    return new Response(response?.body ?? '', { status: response?.status ?? 404 });
  }) as typeof fetch;
}

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Bun 1.4</title>
    <link>https://bun.com/blog/bun-v1.4</link>
    <pubDate>Thu, 20 Aug 2026 00:53:44 GMT</pubDate>
  </item>
  <item>
    <title>Rewriting Bun in Rust</title>
    <link>https://bun.com/blog/bun-in-rust</link>
    <pubDate>Wed, 08 Jul 2026 16:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Bun v1.3.14</title>
    <link>https://bun.com/blog/bun-v1.3.14</link>
    <pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate>
  </item>
  <item>
    <title>Bun v1.3.13</title>
    <link>https://bun.com/blog/bun-v1.3.13</link>
    <pubDate>Mon, 20 Apr 2026 07:33:26 GMT</pubDate>
  </item>
</channel></rss>`;

describe('Bun release inventory generator', () => {
  test('normalizes versions and builds the official release URL', () => {
    expect(normalizeVersion('v1.3.14')).toBe('1.3.14');
    expect(blogUrlForVersion('1.3.14')).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(blogUrlForVersion('1.4.0')).toBe('https://bun.com/blog/bun-v1.4');
    expect(blogUrlForVersion('0.6.0')).toBe('https://bun.com/blog/bun-v0.6.0');
    expect(() => normalizeVersion('latest')).toThrow('expected vMAJOR.MINOR.PATCH');
    expect(() => normalizeVersion('01.3.14')).toThrow('must not be zero-padded');
  });

  test('uses stable category aliases and a generic fallback', () => {
    expect(categoryForHeading('Bun.Image — Built-in Image Processing')).toBe('image');
    expect(categoryForHeading('Brand New Runtime Feature')).toBe('brand-new-runtime-feature');
  });

  test('extracts only semantic article announcements in document order', async () => {
    expect(await extractReleaseItems(FIXTURE)).toEqual([
      {
        category: 'image',
        section: 'Bun.Image — Built-in Image Processing',
        announcement: 'Processes images without a native package dependency.',
      },
      {
        category: 'image',
        section: 'Bun.Image — Built-in Image Processing',
        announcement: 'Accepts Blob and typed array inputs.',
      },
      {
        category: 'bugfixes',
        section: 'Bugfixes',
        announcement: 'FormData boundary format matches WebKit.',
      },
      {
        category: 'node-js-compatibility-fixes',
        section: 'Node.js compatibility fixes',
        announcement: 'Fixed quoted & normalized text.',
      },
    ]);
  });

  test('extracts nested list items once without overlapping parent and child text', async () => {
    const nested = `<article>
      <h2>Bugfixes</h2>
      <ul>
        <li>Parent fix details
          <ul><li>Child fix details</li></ul>
        </li>
      </ul>
    </article>`;
    expect(await extractReleaseItems(nested)).toEqual([
      { category: 'bugfixes', section: 'Bugfixes', announcement: 'Parent fix details' },
      { category: 'bugfixes', section: 'Bugfixes', announcement: 'Child fix details' },
    ]);
  });

  test('renders deterministic planned inventory without executable test stubs', async () => {
    const items = await extractReleaseItems(FIXTURE);
    const first = renderReleaseInventory('1.3.14', items);
    expect(first).toBe(renderReleaseInventory('v1.3.14', items));
    const parsed = JSON.parse(first);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.counts).toEqual({ planned: 4, executable: 0 });
    expect(parsed.items.every((item: { status: string }) => item.status === 'planned')).toBe(true);
    expect(first).not.toContain('test.todo');
    expect(first).not.toContain('Navigation item');
  });

  test('preserves covered adoption metadata and stable keys across upstream insertions', async () => {
    const items = await extractReleaseItems(FIXTURE);
    const previous = parseReleaseInventory(renderReleaseInventory('1.3.14', items));
    const adopted = previous.items.find(item => item.announcement.includes('FormData'))!;
    const adoptedIndex = previous.items.indexOf(adopted);
    previous.items[adoptedIndex] = {
      ...adopted,
      status: 'covered',
      testPath: 'tests/bun-1.3.14-web-api-fixes.test.ts',
    };

    const next = parseReleaseInventory(renderReleaseInventory('1.3.14', items, previous));
    expect(next.counts).toEqual({ planned: 3, executable: 1 });
    const preserved = next.items.find(item => item.announcement === adopted.announcement)!;
    expect(preserved.status).toBe('covered');
    expect(preserved.testPath).toBe('tests/bun-1.3.14-web-api-fixes.test.ts');

    const withSectionRename = parseReleaseInventory(
      renderReleaseInventory(
        '1.3.14',
        items.map(item =>
          item.announcement === adopted.announcement
            ? { ...item, section: 'Renamed Web API fixes' }
            : item
        ),
        previous
      )
    );
    expect(
      withSectionRename.items.find(item => item.announcement === adopted.announcement)?.status
    ).toBe('covered');

    const withInsertion = parseReleaseInventory(
      renderReleaseInventory(
        '1.3.14',
        [{ category: 'intro', section: 'Intro', announcement: 'A newly inserted claim.' }, ...items],
        previous
      )
    );
    expect(withInsertion.items.find(item => item.announcement === adopted.announcement)?.key).toBe(
      adopted.key
    );

    expect(() =>
      renderReleaseInventory(
        '1.3.14',
        items.filter(item => item.announcement !== adopted.announcement),
        previous
      )
    ).toThrow('Covered release inventory items no longer match the release post');

    const mismatchedKey = {
      ...previous,
      items: [{ ...previous.items[0]!, key: 'not-a-canonical-key' }, ...previous.items.slice(1)],
    };
    expect(() => renderReleaseInventory('1.3.14', items, mismatchedKey)).toThrow(
      'item key mismatch'
    );
  });

  test('validates covered paths as repository-contained regular files', async () => {
    const items = await extractReleaseItems(FIXTURE);
    const inventory = parseReleaseInventory(renderReleaseInventory('1.3.14', items));
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-repo-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-outside-'));
    try {
      await mkdir(join(repoRoot, 'tests'));
      await mkdir(join(repoRoot, 'tests', 'directory.test.ts'));
      await writeFile(join(repoRoot, 'tests', 'contract.test.ts'), 'export {};\n');
      await writeFile(join(repoRoot, 'tests', 'helper.ts'), 'export {};\n');
      await writeFile(join(repoRoot, 'support.test.ts'), 'export {};\n');
      await writeFile(join(outsideRoot, 'outside.test.ts'), 'export {};\n');
      await symlink(
        join(outsideRoot, 'outside.test.ts'),
        join(repoRoot, 'tests', 'escape.test.ts')
      );
      await symlink(join(repoRoot, 'support.test.ts'), join(repoRoot, 'tests', 'alias.test.ts'));

      const cover = (testPath: string) => {
        inventory.items[0] = {
          ...inventory.items[0]!,
          status: 'covered',
          testPath,
        };
      };

      cover('tests/contract.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).resolves.toBeUndefined();

      cover('../outside.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'testPath escapes the repository'
      );

      cover('tests/missing.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'testPath does not exist'
      );

      cover('tests/helper.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'must point to a tests/**/*.test.ts file'
      );

      cover('tests/directory.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'testPath is not a regular file'
      );

      cover('tests/escape.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'testPath resolves outside the repository'
      );

      cover('tests/alias.test.ts');
      await expect(validateReleaseInventoryCoverage(inventory, repoRoot)).rejects.toThrow(
        'testPath resolves to a non-test file'
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  test('selects stable release posts from RSS and builds a deterministic catalog', () => {
    const feed = parseReleaseFeed(RSS_FIXTURE);
    expect(feed.map(entry => entry.version)).toEqual(['1.4.0', '1.3.14', '1.3.13']);
    expect(selectReleaseFeedEntries(feed, { since: '1.3.14' })).toHaveLength(2);
    expect(selectReleaseFeedEntries(feed, { limit: 1 })[0]?.version).toBe('1.4.0');

    const inventory = parseReleaseInventory(
      renderReleaseInventory('1.3.14', [
        { category: 'web-api', section: 'Web APIs', announcement: 'A release claim.' },
      ])
    );
    const index = JSON.parse(renderReleaseInventoryIndex([inventory]));
    expect(index.counts).toEqual({ releases: 1, planned: 1, executable: 0 });
    expect(index.releases[0].file).toBe('bun-v1.3.14.json');
  });

  test('sorts parsed and selected feed releases semantically before since and limit', () => {
    const unsorted = RSS_FIXTURE.replace(
      '<item>\n    <title>Bun v1.3.13</title>',
      `<item>
    <title>Bun v1.10.0</title>`
    ).replace('https://bun.com/blog/bun-v1.3.13', 'https://bun.com/blog/bun-v1.10.0');
    const feed = parseReleaseFeed(unsorted);
    expect(feed.map(entry => entry.version)).toEqual(['1.10.0', '1.4.0', '1.3.14']);
    expect(selectReleaseFeedEntries([...feed].reverse(), { limit: 1 })[0]?.version).toBe(
      '1.10.0'
    );
    expect(
      selectReleaseFeedEntries([...feed].reverse(), { since: '1.3.14', limit: 1 })[0]?.version
    ).toBe('1.10.0');
    expect(() => selectReleaseFeedEntries(feed, { since: '01.3.14' })).toThrow('zero-padded');
    expect(() => selectReleaseFeedEntries(feed, { limit: 0 })).toThrow('positive integer');
    expect(() => selectReleaseFeedEntries(feed, { limit: 1.5 })).toThrow('positive integer');
    expect(() =>
      selectReleaseFeedEntries([{ ...feed[0]!, version: 'v1.10.0' }])
    ).toThrow('must be canonical');
  });

  test('rejects invalid catalog identity, source URLs, duplicate keys, and releases', () => {
    const inventory = parseReleaseInventory(
      renderReleaseInventory('1.3.14', [
        { category: 'web-api', section: 'Web APIs', announcement: 'A release claim.' },
      ])
    );

    expect(() =>
      renderReleaseInventoryIndex([{ ...inventory, sourceUrl: 'https://example.com/release' }])
    ).toThrow('non-canonical sourceUrl');
    expect(() =>
      renderReleaseInventoryIndex([
        { ...inventory, items: [inventory.items[0]!, { ...inventory.items[0]! }] },
      ])
    ).toThrow('duplicate item key');
    expect(() => renderReleaseInventoryIndex([inventory, inventory])).toThrow(
      'Duplicate release inventory version'
    );
    expect(releaseInventoryItemKey(inventory.items[0]!)).toBe(inventory.items[0]!.key);
    expect(() =>
      renderReleaseInventoryIndex([
        { ...inventory, items: [{ ...inventory.items[0]!, key: 'web-api-deadbeef' }] },
      ])
    ).toThrow('item key mismatch');
  });

  test('validates committed inventories and index offline byte-for-byte', async () => {
    const repoRoot = join(import.meta.dir, '..');
    const outputDir = join(repoRoot, 'packages', 'bun-release-contracts', 'contracts');
    const result = await validateReleaseInventoryDirectory({ outputDir, repoRoot });

    expect(result.releases).toBeGreaterThan(0);
    expect(result.executable + result.planned).toBeGreaterThan(0);
  });

  test('rejects a scanned inventory whose filename does not match its internal version', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'bun-release-contract-catalog-'));
    try {
      await Bun.write(
        join(outputDir, 'bun-v1.3.15.json'),
        renderReleaseInventory('1.3.14', [
          { category: 'web-api', section: 'Web APIs', announcement: 'A release claim.' },
        ])
      );
      await expect(readReleaseInventories(outputDir)).rejects.toThrow(
        'does not match internal version 1.3.14'
      );
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  test('does not write a partial batch when a later release fetch fails', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-batch-fail-'));
    const outputDir = join(repoRoot, 'contracts');
    await mkdir(outputDir);
    try {
      const existingInventory = renderReleaseInventory('1.3.14', [
        { category: 'existing', section: 'Existing', announcement: 'Existing release claim.' },
      ]);
      const existingIndex = renderReleaseInventoryIndex([
        parseReleaseInventory(existingInventory),
      ]);
      await writeFile(join(outputDir, 'bun-v1.3.14.json'), existingInventory);
      await writeFile(join(outputDir, 'index.json'), existingIndex);

      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14', '1.3.13'],
          outputDir,
          repoRoot,
          concurrency: 1,
          fetchImpl: releaseFetch({
            '1.3.14': { body: FIXTURE, status: 200 },
            '1.3.13': { status: 503 },
          }),
        })
      ).rejects.toThrow('HTTP 503');

      expect(await Bun.file(join(outputDir, 'bun-v1.3.14.json')).text()).toBe(existingInventory);
      expect(await Bun.file(join(outputDir, 'index.json')).text()).toBe(existingIndex);
      expect(await Bun.file(join(outputDir, 'bun-v1.3.13.json')).exists()).toBe(false);
      expect((await readdir(repoRoot)).some(name => name.startsWith('.bun-release-contracts-stage-')))
        .toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('does not write a partial batch when a later release cannot be parsed', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-batch-parse-fail-'));
    const outputDir = join(repoRoot, 'contracts');
    try {
      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14', '1.3.13'],
          outputDir,
          repoRoot,
          concurrency: 1,
          fetchImpl: releaseFetch({
            '1.3.14': { body: FIXTURE, status: 200 },
            '1.3.13': { body: '<main><h2>Bugfixes</h2></main>', status: 200 },
          }),
        })
      ).rejects.toThrow('did not contain an <article>');

      expect(await Bun.file(outputDir).exists()).toBe(false);
      expect((await readdir(repoRoot)).some(name => name.startsWith('.bun-release-contracts-stage-')))
        .toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('validates the future catalog before writing selected inventories', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-catalog-fail-'));
    const outputDir = join(repoRoot, 'contracts');
    await mkdir(outputDir);
    try {
      await writeFile(join(outputDir, 'bun-v9.9.9.json'), '{ invalid json\n');

      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14'],
          outputDir,
          repoRoot,
          fetchImpl: releaseFetch({ '1.3.14': { body: FIXTURE, status: 200 } }),
        })
      ).rejects.toThrow();

      expect(await Bun.file(join(outputDir, 'bun-v1.3.14.json')).exists()).toBe(false);
      expect(await Bun.file(join(outputDir, 'index.json')).exists()).toBe(false);
      expect(await Bun.file(join(outputDir, 'bun-v9.9.9.json')).text()).toBe('{ invalid json\n');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('coverage validation failure leaves inventory and index unchanged', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-coverage-fail-'));
    const outputDir = join(repoRoot, 'contracts');
    await mkdir(outputDir);
    try {
      const previous = parseReleaseInventory(
        renderReleaseInventory('1.3.14', await extractReleaseItems(FIXTURE))
      );
      previous.items[0] = {
        ...previous.items[0]!,
        status: 'covered',
        testPath: 'tests/missing-contract.test.ts',
      };
      const existingInventory = `${JSON.stringify(previous, null, 2)}\n`;
      const existingIndex = renderReleaseInventoryIndex([previous]);
      await writeFile(join(outputDir, 'bun-v1.3.14.json'), existingInventory);
      await writeFile(join(outputDir, 'index.json'), existingIndex);

      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14'],
          outputDir,
          repoRoot,
          fetchImpl: releaseFetch({ '1.3.14': { body: FIXTURE, status: 200 } }),
        })
      ).rejects.toThrow('covered testPath does not exist');

      expect(await Bun.file(join(outputDir, 'bun-v1.3.14.json')).text()).toBe(existingInventory);
      expect(await Bun.file(join(outputDir, 'index.json')).text()).toBe(existingIndex);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('commits a successful batch and keeps check mode read-only', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-batch-success-'));
    const outputDir = join(repoRoot, 'contracts');
    const fetchImpl = releaseFetch({
      '1.3.14': { body: FIXTURE, status: 200 },
      '1.3.13': { body: FIXTURE, status: 200 },
    });
    try {
      const generated = await generateReleaseInventoryBatch({
        versions: ['1.3.14', '1.3.13'],
        outputDir,
        repoRoot,
        concurrency: 2,
        fetchImpl,
      });
      expect(generated.inventories.every(inventory => inventory.changed)).toBe(true);
      const index = await Bun.file(join(outputDir, 'index.json')).json();
      expect(index.counts).toEqual({ releases: 2, planned: 8, executable: 0 });
      expect(index.releases.map((release: { releaseVersion: string }) => release.releaseVersion))
        .toEqual(['1.3.14', '1.3.13']);

      const beforeCheck = await Promise.all([
        Bun.file(join(outputDir, 'bun-v1.3.14.json')).text(),
        Bun.file(join(outputDir, 'bun-v1.3.13.json')).text(),
        Bun.file(join(outputDir, 'index.json')).text(),
      ]);
      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14', '1.3.13'],
          outputDir,
          repoRoot,
          check: true,
          concurrency: 2,
          fetchImpl,
        })
      ).resolves.toBeDefined();

      const changedFixture = FIXTURE.replace(
        '</article>',
        '<p>A newly announced release detail.</p></article>'
      );
      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14'],
          outputDir,
          repoRoot,
          check: true,
          fetchImpl: releaseFetch({ '1.3.14': { body: changedFixture, status: 200 } }),
        })
      ).rejects.toThrow('missing or stale');
      expect(
        await Promise.all([
          Bun.file(join(outputDir, 'bun-v1.3.14.json')).text(),
          Bun.file(join(outputDir, 'bun-v1.3.13.json')).text(),
          Bun.file(join(outputDir, 'index.json')).text(),
        ])
      ).toEqual(beforeCheck);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('rolls back installed inventories when a later target move fails', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-rollback-'));
    const outputDir = join(repoRoot, 'contracts');
    await mkdir(outputDir);
    try {
      const firstInventory = renderReleaseInventory('1.3.14', [
        { category: 'existing', section: 'Existing', announcement: 'Existing first claim.' },
      ]);
      const secondInventory = renderReleaseInventory('1.3.13', [
        { category: 'existing', section: 'Existing', announcement: 'Existing second claim.' },
      ]);
      const existingIndex = renderReleaseInventoryIndex([
        parseReleaseInventory(firstInventory),
        parseReleaseInventory(secondInventory),
      ]);
      await Promise.all([
        writeFile(join(outputDir, 'bun-v1.3.14.json'), firstInventory),
        writeFile(join(outputDir, 'bun-v1.3.13.json'), secondInventory),
        writeFile(join(outputDir, 'index.json'), existingIndex),
      ]);

      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14', '1.3.13'],
          outputDir,
          repoRoot,
          concurrency: 1,
          fetchImpl: releaseFetch({
            '1.3.14': { body: FIXTURE, status: 200 },
            '1.3.13': { body: FIXTURE, status: 200 },
          }),
          commitHooks: {
            beforeMove(moveIndex) {
              if (moveIndex === 1) throw new Error('injected second-move failure');
            },
          },
        })
      ).rejects.toThrow('injected second-move failure');

      expect(
        await Promise.all([
          Bun.file(join(outputDir, 'bun-v1.3.14.json')).text(),
          Bun.file(join(outputDir, 'bun-v1.3.13.json')).text(),
          Bun.file(join(outputDir, 'index.json')).text(),
        ])
      ).toEqual([firstInventory, secondInventory, existingIndex]);
      expect(
        (await readdir(repoRoot)).filter(
          name =>
            name.startsWith('.bun-release-contracts-stage-') ||
            name.endsWith('.bun-release-contracts.lock')
        )
      ).toEqual([]);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('holds an output lock through compare and commit', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-lock-'));
    const outputDir = join(repoRoot, 'contracts');
    let signalLocked!: () => void;
    let releaseLock!: () => void;
    const locked = new Promise<void>(resolveLocked => {
      signalLocked = resolveLocked;
    });
    const holdLock = new Promise<void>(resolveHold => {
      releaseLock = resolveHold;
    });
    const fetchImpl = releaseFetch({ '1.3.14': { body: FIXTURE, status: 200 } });
    try {
      const first = generateReleaseInventoryBatch({
        versions: ['1.3.14'],
        outputDir,
        repoRoot,
        fetchImpl,
        commitHooks: {
          async afterLockAcquired() {
            signalLocked();
            await holdLock;
          },
        },
      });
      await locked;

      await expect(
        generateReleaseInventoryBatch({
          versions: ['1.3.14'],
          outputDir,
          repoRoot,
          fetchImpl,
        })
      ).rejects.toThrow('Release contract output is locked');
      releaseLock();
      await expect(first).resolves.toBeDefined();

      expect(await Bun.file(join(outputDir, 'bun-v1.3.14.json')).exists()).toBe(true);
      expect(await Bun.file(join(outputDir, 'index.json')).exists()).toBe(true);
      expect(
        (await readdir(repoRoot)).filter(
          name =>
            name.startsWith('.bun-release-contracts-stage-') ||
            name.endsWith('.bun-release-contracts.lock')
        )
      ).toEqual([]);
    } finally {
      releaseLock?.();
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('retains bounded fetch concurrency and rejects --limit with latest', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'bun-release-contract-concurrency-'));
    const outputDir = join(repoRoot, 'contracts');
    await mkdir(outputDir);
    let active = 0;
    let maximumActive = 0;
    const fetchImpl = releaseFetch(
      Object.fromEntries(
        ['1.3.14', '1.3.13', '1.3.12'].map(version => [version, { body: FIXTURE, status: 200 }])
      ),
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Bun.sleep(10);
        active -= 1;
      }
    );
    try {
      await generateReleaseInventoryBatch({
        versions: ['1.3.14', '1.3.13', '1.3.12'],
        outputDir,
        repoRoot,
        concurrency: 2,
        fetchImpl,
      });
      expect(maximumActive).toBe(2);
      await expect(runCli(['latest', '--limit', '2'])).rejects.toThrow(
        '--limit requires --all'
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('rejects pages without semantic article markup', async () => {
    await expect(extractReleaseItems('<main><h2>Bugfixes</h2></main>')).rejects.toThrow(
      'did not contain an <article>'
    );
  });
});
