import { describe, expect, test } from 'bun:test';
import { chooseCanonicalDuplicate, gradeFileRemoval } from '../lib/harness/file-removal-grade.ts';
import { isMonorepoHealthSourcePath } from '../lib/harness/file-removal-policy.ts';
import {
  FILE_REMOVAL_VERIFICATION_COMMANDS,
  type FileInventoryRow,
} from '../lib/harness/file-removal-types.ts';
import { parseFileRemovalArgs } from '../tools/file-removal-candidates.ts';

const options = {
  largeLineThreshold: 200,
  largeByteThreshold: 256 * 1024,
  duplicateByteThreshold: 4 * 1024,
};

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

describe('file removal CLI', () => {
  test('defaults are conservative and reports stay ignored', () => {
    const parsed = parseFileRemovalArgs(['--write', '--limit', '12', '--action', 'split']);
    expect(parsed.writePath).toBe('reports/file-removal-candidates.json');
    expect(parsed.limit).toBe(12);
    expect(parsed.duplicateByteThreshold).toBe(4096);
    expect(parsed.action).toBe('split');
  });

  test('rejects output outside reports and unknown options', () => {
    expect(() => parseFileRemovalArgs(['--write=public/report.json'])).toThrow(/reports/);
    expect(() => parseFileRemovalArgs(['--delete'])).toThrow(/unknown option/);
  });
});
