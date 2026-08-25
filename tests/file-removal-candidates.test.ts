import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { chooseCanonicalDuplicate, gradeFileRemoval } from '../lib/harness/file-removal-grade.ts';
import {
  isMonorepoHealthSourcePath,
  publicUrlFor,
} from '../lib/harness/file-removal-policy.ts';
import {
  collectReferenceEvidence,
  extractReferenceTokens,
  resolveReferenceTargets,
} from '../lib/harness/file-removal-references.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  FILE_REMOVAL_VERIFICATION_COMMANDS,
  type FileInventoryRow,
} from '../lib/harness/file-removal-types.ts';

const options = {
  largeLineThreshold: 200,
  largeByteThreshold: 256 * 1024,
  duplicateByteThreshold: 4 * 1024,
};

const REPO_ROOT = joinPath(import.meta.dir, '..');

function row(overrides: Partial<FileInventoryRow> = {}): FileInventoryRow {
  return {
    path: 'docs/archives/old-guide.md',
    bytes: 8192,
    lines: 50,
    sha256: 'a'.repeat(64),
    tracked: true,
    dirty: false,
    gitMode: '100644',
    source: false,
    text: true,
    generated: false,
    publicUrl: null,
    inboundReferences: [],
    importedBy: [],
    duplicatePaths: ['docs/current-guide.md'],
    canonicalDuplicate: 'docs/current-guide.md',
    ...overrides,
  };
}

describe('file removal grading safety', () => {
  test('cleanup handoff carries Bun 1.4 channel correctness gates', () => {
    expect(FILE_REMOVAL_VERIFICATION_COMMANDS).toContain('bun run docs:blog-assets:check');
    expect(FILE_REMOVAL_VERIFICATION_COMMANDS).toContain('bun run channels:projects:check');
    expect(FILE_REMOVAL_VERIFICATION_COMMANDS).toContain('bun run test:rss:native');
    expect(FILE_REMOVAL_VERIFICATION_COMMANDS).toContain('bun run verify:portal:static');
    expect(FILE_REMOVAL_VERIFICATION_COMMANDS).toContain('bun run public:discover:check');
  });

  test('line pressure matches the monorepo-health source perimeter', () => {
    expect(isMonorepoHealthSourcePath('lib/large.ts')).toBe(true);
    expect(isMonorepoHealthSourcePath('packages/core/src/large.tsx')).toBe(true);
    expect(isMonorepoHealthSourcePath('docs/large.md')).toBe(false);
    expect(isMonorepoHealthSourcePath('tests/large.test.ts')).toBe(false);
  });

  test('root-relative static URLs retain the matching nested app asset', () => {
    const take1 = 'apps/take-one/public/brand.png';
    const take2 = 'apps/take-two/public/brand.png';
    const take3 = 'apps/take-three/public/brand.png';
    const candidates = new Set([take1, take2, take3]);

    expect(extractReferenceTokens('src="/brand.png" icon="./favicon.ico"')).toEqual([
      '/brand.png',
      './favicon.ico',
    ]);
    expect(
      resolveReferenceTargets(
        '/brand.png',
        'apps/take-two/src/routes/index.tsx',
        candidates,
        new Map()
      )
    ).toEqual([take2]);
    expect(
      resolveReferenceTargets(
        '/brand.png',
        'apps/take-three/src/routes/index.tsx',
        candidates,
        new Map()
      )
    ).toEqual([take3]);

    expect(
      resolveReferenceTargets('brand.png', 'apps/take-two/public/manifest.json', candidates, new Map())
    ).toEqual([take2]);
    expect(publicUrlFor(take2)).toBe('/brand.png');
  });

  test('reference evidence joins browser paths, sibling assets, and source imports', async () => {
    const root = await mkdtemp(joinPath(tmpdir(), 'file-removal-refs-'));
    const source = 'apps/take-two/src/routes/index.ts';
    const manifest = 'apps/take-two/public/manifest.json';
    const brand = 'apps/take-two/public/brand.png';
    const data = 'apps/take-two/src/data.json';
    const guide = 'public/guide/index.html';
    const unique = 'docs/unique.md';
    const missing = 'docs/missing.md';

    try {
      await Promise.all([
        mkdir(joinPath(root, 'apps/take-two/src/routes'), { recursive: true }),
        mkdir(joinPath(root, 'apps/take-two/public'), { recursive: true }),
        mkdir(joinPath(root, 'public/guide'), { recursive: true }),
        mkdir(joinPath(root, 'docs'), { recursive: true }),
      ]);
      await Promise.all([
        Bun.write(
          joinPath(root, source),
          `import data from '../data.json';\nimport 'package-name';\nexport const assets = ['/brand.png', '/guide/', 'unique.md', data];\n`
        ),
        Bun.write(joinPath(root, manifest), '{"src":"brand.png"}\n'),
        Bun.write(joinPath(root, brand), new Uint8Array([1, 2, 3])),
        Bun.write(joinPath(root, data), '{}\n'),
        Bun.write(joinPath(root, guide), '<h1>Guide</h1>\n'),
        Bun.write(joinPath(root, unique), '# Unique\n'),
      ]);

      const evidence = await collectReferenceEvidence(
        root,
        [source, manifest, brand, data, guide, unique, missing],
        new Set([brand, data, guide, unique])
      );

      expect([...evidence.inboundReferences.get(brand)!].sort()).toEqual([manifest, source]);
      expect(evidence.inboundReferences.get(guide)).toEqual(new Set([source]));
      expect(evidence.inboundReferences.get(unique)).toEqual(new Set([source]));
      expect(evidence.importedBy.get(data)).toEqual(new Set([source]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('consolidated project content roots stay pointers instead of mirrors', async () => {
    const consolidations = [
      {
        pointer:
          'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/communications',
        canonical:
          'projects/active/enterprise/fantasy42-fire22-registry/communications/CLOUDFLARE-DURABLE-OBJECTS-SECURITY-REQUEST.md',
      },
      {
        pointer:
          'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/analytics/expanded-analytics',
        canonical: 'projects/active/enterprise/fantasy42-fire22-registry/analytics/index.html',
      },
      {
        pointer: 'projects/active/development/kal-poly-bot/docs/utils',
        canonical: 'projects/active/development/kal-poly-bot/utils/TEST_RESULTS.md',
      },
    ] as const;

    for (const consolidation of consolidations) {
      const files = await Array.fromAsync(
        new Bun.Glob('**/*').scan({
          cwd: joinPath(REPO_ROOT, consolidation.pointer),
          onlyFiles: true,
        })
      );
      expect(files, consolidation.pointer).toEqual(['README.md']);
      expect(
        await Bun.file(joinPath(REPO_ROOT, consolidation.canonical)).exists(),
        consolidation.canonical
      ).toBe(true);
    }
  });

  test('only an unreferenced archived exact duplicate reaches very-safe-review', () => {
    const result = gradeFileRemoval(row(), options);
    expect(result.verdict).toBe('very-safe-review');
    expect(result.action).toBe('deduplicate');
    expect(result.reclaimableBytes).toBe(8192);
  });

  test('active exact duplicates remain safe-review, not very-safe-review', () => {
    const result = gradeFileRemoval(
      row({ path: 'projects/active/app/copied-guide.md' }),
      options
    );
    expect(result.verdict).toBe('safe-review');
    expect(result.action).toBe('deduplicate');
  });

  test('an unreferenced public URL never reaches a safe deletion grade', () => {
    const result = gradeFileRemoval(
      row({ path: 'public/archive/copied-guide.md', publicUrl: '/archive/copied-guide.md' }),
      options
    );
    expect(result.verdict).toBe('review');
    expect(result.action).toBe('wire-or-remove');
    expect(result.removalConfidence).toBeLessThanOrEqual(20);
    expect(result.reasons).toContain(
      'public route needs explicit owner and external-consumer review'
    );
  });

  test('dirty, imported, and Bun 1.4 channel files cannot be safe', () => {
    const dirty = gradeFileRemoval(row({ dirty: true }), options);
    expect(dirty.verdict).toBe('protected');
    expect(dirty.removalConfidence).toBe(0);

    const imported = gradeFileRemoval(row({ importedBy: ['lib/index.ts'] }), options);
    expect(imported.verdict).toBe('retain');

    const channel = gradeFileRemoval(
      row({ path: 'public/feeds/v1/bun-1.4-assets.xml', publicUrl: '/feeds/v1/bun-1.4-assets.xml' }),
      options
    );
    expect(channel.verdict).toBe('protected');
    expect(channel.blockers).toContain('Bun 1.4 channel integration contract');
  });

  test('large source recommends splitting, never deletion', () => {
    const result = gradeFileRemoval(
      row({
        path: 'lib/large-owner.ts',
        lines: 450,
        source: true,
        duplicatePaths: [],
        canonicalDuplicate: null,
      }),
      options
    );
    expect(result.action).toBe('split');
    expect(result.verdict).toBe('review');
    expect(result.removalConfidence).toBeLessThanOrEqual(20);
  });

  test('referenced large source remains retained but still recommends splitting', () => {
    const result = gradeFileRemoval(
      row({
        path: 'lib/large-owner.ts',
        lines: 450,
        source: true,
        duplicatePaths: [],
        canonicalDuplicate: null,
        importedBy: ['lib/index.ts'],
      }),
      options
    );
    expect(result.verdict).toBe('retain');
    expect(result.action).toBe('split');
    expect(result.removalConfidence).toBe(0);
  });

  test('generated duplicates require generator verification', () => {
    const result = gradeFileRemoval(row({ generated: true }), options);
    expect(result.action).toBe('verify-generator');
    expect(result.verdict).toBe('review');
    expect(result.removalConfidence).toBeLessThanOrEqual(40);
  });

  test('canonical duplicate is retained and selected by evidence', () => {
    const canonical = row({
      path: 'docs/current-guide.md',
      inboundReferences: ['docs/README.md'],
      duplicatePaths: ['docs/archives/old-guide.md'],
      canonicalDuplicate: 'docs/current-guide.md',
    });
    expect(chooseCanonicalDuplicate([row(), canonical])).toBe('docs/current-guide.md');
    expect(gradeFileRemoval(canonical, options).verdict).toBe('retain');
  });
});
