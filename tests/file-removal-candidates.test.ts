// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { chooseCanonicalDuplicate, gradeFileRemoval } from '../lib/harness/file-removal-grade.ts';
import { buildFileRemovalOwnershipIndex } from '../lib/harness/file-removal-ownership.ts';
import { buildDuplicateGroups } from '../lib/harness/file-removal-report.ts';
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
import { asProjectId } from '../lib/types/branded.ts';
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
    ownership: {
      projectId: asProjectId('project-r-score'),
      path: '.',
      repositoryRelation: 'root',
      repositoryRemote: 'origin',
      feedStatus: 'registered',
      channelIds: [],
      packageRoot: '.',
      boundary: 'project-r-score:.',
    },
    inboundReferences: [],
    importedBy: [],
    contentMatchPaths: ['docs/current-guide.md'],
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

  test('retired project backups and content mirrors do not return', async () => {
    const retired = [
      'projects/experimental/tan-bun/TAKE-3/custom-server-app/public/tanstack-word-logo-white.svg',
      'projects/active/development/kal-poly-bot/surgical-precision-mcp/bun.lock.bak',
      'projects/active/enterprise/full-stack-bun.io/bunfig.toml.bak',
      'projects/active/utilities/bun-toml-secrets-editor/package.json.backup',
      'projects/active/development/geelark/.github/workflows/backup/deploy.yml',
      'projects/active/development/geelark/.github/workflows/backup/feature-flag-test.yml',
      'projects/active/development/geelark/.github/workflows/backup/security-scan.yml',
      'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/web-servers/https:/bun.com/reference',
      'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/web-servers/https:/dashboard-worker.brendawill2233.workers.dev/dashboard',
      'projects/active/analysis/matrix-analysis/my-wager-v3/omega-dashboard-report.csv',
      'projects/active/analysis/matrix-analysis/my-wager-v3/omega-dashboard-report.json',
      'projects/active/analysis/matrix-analysis/.factory-wager/registry-cookies.jar',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/dependency-report-20250828-091719.json.formatted',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/dependency-report-20250828-092509.json.formatted',
      'projects/active/analysis/matrix-analysis/scripts/monitoring/dashboard/index.html',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs-archive/data-schemas.md',
      'projects/active/development/kal-poly-bot/docs/packages/BUN_UTILITIES_MEMORANDUM.md',
      'projects/active/development/kal-poly-bot/docs/packages/IMPLEMENTATION_MEMORANDUM.md',
      'projects/active/development/kal-poly-bot/docs/packages/CODING_STANDARDS.md',
      'projects/active/development/kal-poly-bot/docs/packages/platform-architecture.mermaid.md',
      'projects/active/development/kal-poly-bot/docs/packages/PLUGIN_SYSTEM.md',
      'projects/active/development/kal-poly-bot/docs/packages/Bun_Configuration_Hardening_Guide.md',
      'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/web-servers/dashboard-integration.html',
      'projects/active/enterprise/fantasy42-fire22-registry/enterprise/packages/scripts/scripts/bunx-registry-demo.bun.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/monitoring/security-monitor.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/monitoring/health-check.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/monitoring/performance-monitor.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/utils/monitoring-utils.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/utils/edge-case-helpers.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/integration/system-integration/e2e-integration.test.ts',
    ] as const;
    const canonical = [
      'projects/active/analysis/matrix-analysis/monitoring/dashboard/index.html',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs/data-schemas.md',
      'projects/active/development/kal-poly-bot/operation_surgical_precision/BUN_UTILITIES_MEMORANDUM.md',
      'projects/active/development/kal-poly-bot/operation_surgical_precision/IMPLEMENTATION_MEMORANDUM.md',
      'projects/active/development/kal-poly-bot/surgical-precision-mcp/CODING_STANDARDS.md',
      'projects/active/development/kal-poly-bot/operation_surgical_precision/platform-architecture.mermaid.md',
      'projects/active/development/kal-poly-bot/operation_surgical_precision/PLUGIN_SYSTEM.md',
      'projects/active/development/kal-poly-bot/operation_surgical_precision/Bun_Configuration_Hardening_Guide.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs/business/SPORTS-BETTING-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs/business/LIVE-CASINO-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs/development/BUN-FEATURES-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/docs/development/TYPE-SAFETY-PROGRESS.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-integration.html',
      'projects/active/enterprise/fantasy42-fire22-registry/bunx-registry-demo.bun.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/test/monitoring/security-monitor.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/test/monitoring/health-check.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/test/monitoring/performance-monitor.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/test/utils/monitoring-utils.test.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/test/utils/edge-case-helpers.ts',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/tests/e2e-integration.test.ts',
    ] as const;
    const pointers = [
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/SPORTS-BETTING-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/LIVE-CASINO-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/BUN-FEATURES-ENHANCEMENT.md',
      'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/TYPE-SAFETY-PROGRESS.md',
    ] as const;

    for (const retiredPath of retired) {
      expect(await Bun.file(joinPath(REPO_ROOT, retiredPath)).exists(), retiredPath).toBe(false);
    }
    for (const canonicalPath of canonical) {
      expect(await Bun.file(joinPath(REPO_ROOT, canonicalPath)).exists(), canonicalPath).toBe(true);
    }
    for (const pointerPath of pointers) {
      const pointer = Bun.file(joinPath(REPO_ROOT, pointerPath));
      expect(await pointer.exists(), pointerPath).toBe(true);
      expect(pointer.size, pointerPath).toBeLessThan(256);
      expect(await pointer.text(), pointerPath).toContain('./docs/');
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

  test('cross-owner content matches are evidence, not deletion authority', () => {
    const left = row({
      path: 'projects/active/app-a/copied-guide.md',
      ownership: {
        projectId: asProjectId('app-a'),
        path: 'projects/active/app-a',
        repositoryRelation: 'contained',
        repositoryRemote: 'origin',
        feedStatus: 'unregistered',
        channelIds: [],
        packageRoot: 'projects/active/app-a',
        boundary: 'app-a:projects/active/app-a',
      },
      contentMatchPaths: ['projects/active/app-b/copied-guide.md'],
      duplicatePaths: [],
      canonicalDuplicate: null,
    });
    const right = row({
      path: 'projects/active/app-b/copied-guide.md',
      ownership: {
        projectId: asProjectId('app-b'),
        path: 'projects/active/app-b',
        repositoryRelation: 'contained',
        repositoryRemote: 'origin',
        feedStatus: 'unregistered',
        channelIds: [],
        packageRoot: 'projects/active/app-b',
        boundary: 'app-b:projects/active/app-b',
      },
      contentMatchPaths: [left.path],
      duplicatePaths: [],
      canonicalDuplicate: null,
    });
    const group = buildDuplicateGroups(
      [left, right],
      new Map([
        [
          left.sha256,
          [left, right].map(item => ({
            path: item.path,
            tracked: item.tracked,
            gitMode: item.gitMode,
            bytes: item.bytes,
            lines: item.lines,
            textHead: null,
          })),
        ],
      ])
    );
    expect(group[0]?.canonicalPaths).toEqual([]);
    expect(group[0]?.reclaimableBytes).toBe(0);
    expect(group[0]?.theoreticalReclaimableBytes).toBe(left.bytes);
    expect(left.duplicatePaths).toEqual([]);

    const result = gradeFileRemoval(left, options);
    expect(result.verdict).toBe('retain');
    expect(result.action).toBe('retain');
    expect(result.reclaimableBytes).toBe(0);
    expect(result.blockers).toContain(
      'content match crosses project or package ownership boundary'
    );
  });

  test('ownership joins project RSS registration and nearest package root', async () => {
    const project = 'projects/active/enterprise/fantasy42-fire22-registry';
    const nested = `${project}/dashboard-worker`;
    const index = await buildFileRemovalOwnershipIndex(REPO_ROOT, [
      'package.json',
      `${project}/package.json`,
      `${nested}/package.json`,
    ]);

    const rootOwner = index.forPath('lib/harness/file-removal-grade.ts');
    expect(rootOwner.projectId).toBe(asProjectId('project-r-score'));
    expect(rootOwner.feedStatus).toBe('registered');
    expect(rootOwner.channelIds).toHaveLength(4);

    const nestedOwner = index.forPath(`${nested}/tests/example.test.ts`);
    expect(nestedOwner.projectId).toBe(asProjectId('fantasy42-fire22-registry'));
    expect(nestedOwner.feedStatus).toBe('unregistered');
    expect(nestedOwner.channelIds).toEqual([]);
    expect(nestedOwner.packageRoot).toBe(nested);
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
        contentMatchPaths: [],
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
        contentMatchPaths: [],
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
