import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ALLOWED_LONG_REGISTRY,
  BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';
import {
  buildKnowledgeValidationReport,
  parseReleaseKnowledgeShapeIssues,
  knowledgeValidationConfig,
  normalizeReleaseKnowledge,
  renderKnowledgeValidationJUnit,
  renderReleaseKnowledge,
  validateKnowledgeSourceConsistency,
  validateReleaseKnowledgeFile,
  parseReleaseKnowledgeValidation,
  type KnowledgeCatalogEntry,
  type KnowledgeValidationFileState,
  type ReleaseKnowledge,
} from '../packages/bun-release-contracts/src/knowledge.ts';

const MARKDOWN = `## \`Bun.file\`

Read a local file.

\`\`\`ts
await Bun.file("input.txt").text();
\`\`\`
`;
const CATALOG: KnowledgeCatalogEntry[] = [
  {
    name: 'Bun.file',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/file-io',
    description: 'Lazy file handle',
  },
];
const PUBLISHED_AT = '2026-05-13T03:19:35.000Z';
const SOURCE_URL = 'https://bun.com/blog/bun-v1.3.14';
const temporaryDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(temporaryDirectories.map(path => rm(path, { recursive: true, force: true })));
});

function knowledge(): ReleaseKnowledge {
  return normalizeReleaseKnowledge({
    version: '1.3.14',
    sourceUrl: SOURCE_URL,
    sourceMarkdownUrl: `${SOURCE_URL}.md`,
    publishedAt: PUBLISHED_AT,
    markdown: MARKDOWN,
    catalog: CATALOG,
  });
}

function fileState(path: string): KnowledgeValidationFileState {
  return { path, exists: true, parseable: true, schemaValid: true };
}

describe('Bun release knowledge enterprise validation', () => {
  test('registers every validation CLI option in the unknown-flag guard', () => {
    expect(ALLOWED_LONG_REGISTRY['bun:release-knowledge']).toBe(
      BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG
    );
    expect([...BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG]).toEqual(
      expect.arrayContaining(['version', 'source', 'strict', 'report', 'max-warnings'])
    );
    expect(
      knowledgeValidationConfig({
        BUN_RELEASE_KNOWLEDGE_STRICT: 'true',
        BUN_RELEASE_KNOWLEDGE_MAX_WARNINGS: '3',
      })
    ).toEqual({ strict: true, maxWarnings: 3 });
    expect(() =>
      knowledgeValidationConfig({ BUN_RELEASE_KNOWLEDGE_MAX_WARNINGS: '-1' })
    ).toThrow('must be a non-negative integer');
  });

  test('collects recursive shape defects instead of stopping at the first field', () => {
    const issues = parseReleaseKnowledgeShapeIssues({
      schemaVersion: 2,
      runtime: 'node',
      releaseVersion: 14,
      sourceUrl: SOURCE_URL,
      sourceMarkdownUrl: `${SOURCE_URL}.md`,
      publishedAt: PUBLISHED_AT,
      counts: { examples: -1, runnable: 0, documented: 'none', extra: true },
      examples: [{ id: '', language: 7 }],
      extra: true,
    });
    const paths = issues.map(issue => issue.path);
    expect(paths).toContain('$.schemaVersion');
    expect(paths).toContain('$.runtime');
    expect(paths).toContain('$.releaseVersion');
    expect(paths).toContain('$.counts.documented');
    expect(paths).toContain('$.examples[0].purpose');
    expect(paths).toContain('$.examples[0].language');
    expect(paths).toContain('$.extra');
  });

  test('separates semantic errors from warnings and enforces strict warning policy', () => {
    const base = knowledge();
    const input = {
      ...base,
      counts: { ...base.counts, runnable: base.examples.length },
      examples: base.examples.map(example => ({
        ...example,
        language: 'mystery-lang',
        stability: 'unknown',
        runnable: true,
      })),
    };
    const result = parseReleaseKnowledgeValidation(input);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'language', severity: 'warning' }),
        expect.objectContaining({ rule: 'stability', severity: 'warning' }),
        expect.objectContaining({ rule: 'execution-metadata', severity: 'error' }),
      ])
    );

    const warningOnly = parseReleaseKnowledgeValidation({
      ...base,
      examples: base.examples.map(example => ({
        ...example,
        language: 'mystery-lang',
        stability: 'unknown',
      })),
    });
    const files = { normalized: fileState('knowledge.json'), source: null };
    expect(
      buildKnowledgeValidationReport({
        target: 'knowledge.json',
        knowledge: warningOnly.knowledge,
        config: { strict: false, maxWarnings: 2 },
        files,
        findings: warningOnly.findings,
      }).valid
    ).toBe(true);
    expect(
      buildKnowledgeValidationReport({
        target: 'knowledge.json',
        knowledge: warningOnly.knowledge,
        config: { strict: true, maxWarnings: 2 },
        files,
        findings: warningOnly.findings,
      }).valid
    ).toBe(false);
  });

  test('reports normalized fields and counts that drift from extracted Markdown', () => {
    const expected = knowledge();
    const actual: ReleaseKnowledge = {
      ...expected,
      examples: expected.examples.map(example => ({ ...example, purpose: 'Changed' })),
    };
    const findings = validateKnowledgeSourceConsistency(actual, expected);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'source-drift', path: expect.stringContaining('.purpose') }),
      ])
    );
    expect(
      validateKnowledgeSourceConsistency(
        { ...expected, counts: { examples: 0, runnable: 0, documented: 0 }, examples: [] },
        expected
      )
    ).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'source-count' })]));
  });

  test('generates escaped JUnit failures for CI consumers', () => {
    const report = buildKnowledgeValidationReport({
      target: 'bun<1.3.14>.json',
      knowledge: knowledge(),
      config: { strict: false, maxWarnings: 10 },
      files: { normalized: fileState('knowledge.json'), source: null },
      findings: [
        { rule: 'content', severity: 'error', path: '$.code', message: 'bad <code> & "text"' },
      ],
    });
    const xml = renderKnowledgeValidationJUnit([report]);
    expect(xml).toContain('failures="1"');
    expect(xml).toContain('bun&lt;1.3.14&gt;.json');
    expect(xml).toContain('bad &lt;code&gt; &amp; &quot;text&quot;');
  });

  test('validates artifact, RSS provenance, and Markdown normalization together', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bun-release-knowledge-validation-'));
    temporaryDirectories.push(directory);
    const artifactPath = join(directory, 'bun-v1.3.14.json');
    const sourcePath = join(directory, 'bun-v1.3.14.md');
    const catalogPath = join(directory, 'catalog.json');
    const feedsPath = join(directory, 'feeds.json');
    await Promise.all([
      Bun.write(artifactPath, renderReleaseKnowledge(knowledge())),
      Bun.write(sourcePath, MARKDOWN),
      Bun.write(catalogPath, JSON.stringify({ entries: CATALOG })),
      Bun.write(
        feedsPath,
        JSON.stringify({
          rss: { entries: [{ version: '1.3.14', url: SOURCE_URL, pubDate: PUBLISHED_AT }] },
        })
      ),
    ]);
    const report = await validateReleaseKnowledgeFile(artifactPath, {
      sourcePath,
      catalogPath,
      feedsPath,
      config: knowledgeValidationConfig({}, { strict: true, maxWarnings: 0 }),
    });
    expect(report.valid).toBe(true);
    expect(report.files).toMatchObject({
      normalized: { exists: true, parseable: true, schemaValid: true },
      source: { exists: true, parseable: true, schemaValid: true },
    });
  });
});
