/**
 * Three-source Bun API verification harness tests.
 * @see ../tools/bun-api-verify.ts
 * @see ../lib/bun-api-proof.ts
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
 * @see https://bun.com/docs/test/index#run-tests — bun:test
 * @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
 * @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
 * @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
 */
import { describe, expect, test } from 'bun:test';
import {
  declarationBundleHash,
  proofHash,
  proofPreview,
  readBunTypesText,
  readBunTypesPackageMetadata,
  typesContains,
} from '../lib/bun-api-proof.ts';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
  bunTypesVersionSourceUrl,
} from '../lib/docs/bun-source-links.ts';
import {
  BUN_REFERENCE_INDEX_URL,
  officialDocumentationEvidence,
  parseOfficialBunDocumentationIndexes,
} from '../lib/docs/bun-official-sources.ts';
import { loadOfficialBunDocumentationIndexes } from '../lib/docs/bun-source-snapshots.ts';
import { BUN_RSS_URL, LLMS_URL } from '../lib/shared/tools/bun-urls.ts';
import { BUN_API_ONELINERS } from '../tools/bun-api-oneliners.ts';
import { OPS_ONELINERS, runOpsOneliner } from '../tools/bun-ops-oneliners.ts';
import {
  preserveProofGeneratedAt,
  verifyBunApis,
  type VerifyManifest,
} from '../tools/bun-api-verify.ts';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';

describe('proofHash', () => {
  test('stable for same input', () => {
    const a = proofHash({ signature: 'demo:file-meta', runtimeOutput: 'ok', bunVersion: '1.4.0' });
    const b = proofHash({ signature: 'demo:file-meta', runtimeOutput: 'ok', bunVersion: '1.4.0' });
    expect(a).toBe(b);
    expect(proofPreview(a)).toHaveLength(8);
  });

  test('changes when runtime output changes', () => {
    const a = proofHash({ signature: 'x', runtimeOutput: 'a', bunVersion: '1.4.0' });
    const b = proofHash({ signature: 'x', runtimeOutput: 'b', bunVersion: '1.4.0' });
    expect(a).not.toBe(b);
  });

  test('binds the pinned type source and every canonical documentation URL', () => {
    const base = {
      signature: 'x',
      docsUrls: ['https://bun.com/reference/bun/file', 'https://bun.com/reference/bun/write'],
      bunTypesSource: 'https://github.com/oven-sh/bun/tree/bun-v1.3.14/packages/bun-types',
      bunVersion: '1.4.0',
    };
    expect(proofHash(base)).not.toBe(
      proofHash({ ...base, bunTypesSource: base.bunTypesSource.replace('1.3.14', '1.3.15') })
    );
    expect(proofHash(base)).not.toBe(proofHash({ ...base, docsUrls: base.docsUrls.slice(0, 1) }));
  });
});

describe('ops oneliners', () => {
  test('inventory has 10 demos', () => {
    expect(OPS_ONELINERS.length).toBe(10);
  });

  test('run generate-play + fund-agent-rail offline', async () => {
    const play = await runOpsOneliner('generate-play');
    expect(play.result).toMatch(/play=/);
    const fund = await runOpsOneliner('fund-agent-rail');
    expect(fund.result).toMatch(/funded=\$/);
  });

  test('webview demo requires --live', async () => {
    await expect(runOpsOneliner('place-bet-webview')).rejects.toThrow(/live/);
  });
});

describe('verifyBunApis (offline)', () => {
  test('preserves generated time only for a semantic no-op', () => {
    const base = {
      schemaVersion: 2,
      generated: '2026-01-01T00:00:00.000Z',
      scope: { population: 'curated-runnable-demos', claim: 'test' },
      runtime: { bunVersion: '1.3.14' },
      sources: {},
      summary: { demos: 1 },
      demos: [],
      demoApis: {},
    } as unknown as VerifyManifest;
    const rerun = { ...base, generated: '2026-01-02T00:00:00.000Z' };
    expect(preserveProofGeneratedAt(rerun, base).generated).toBe(base.generated);
    const changed = {
      ...rerun,
      runtime: { bunVersion: '1.3.15' },
    };
    expect(preserveProofGeneratedAt(changed, base).generated).toBe(rerun.generated);
  });

  test('passes offline api + ops demos', async () => {
    const manifest = await verifyBunApis({ live: false, write: false });
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.scope.population).toBe('curated-runnable-demos');
    expect(manifest.scope.claim).toContain('not complete Bun API coverage');
    expect(manifest.summary.demos).toBeGreaterThan(0);
    expect(manifest.summary.demosPassed).toBe(manifest.summary.demos);
    expect(manifest.summary.opsDemos).toBe(9);
    expect(manifest.summary.apiDemos).toBeGreaterThan(0);
    expect(manifest.summary.apiMentions).toBeGreaterThan(manifest.summary.uniqueDemoApis);
    expect(manifest.summary.demoApisVerified).toBe(manifest.summary.uniqueDemoApis);
    expect(manifest.summary.declarationMatches).toBe(manifest.summary.uniqueDemoApis);
    expect(manifest.summary.officialDocumentationMatches).toBe(
      manifest.summary.uniqueDemoApis
    );
    expect(
      manifest.summary.docsPageMatches +
        manifest.summary.referencePageMatches +
        manifest.summary.referenceModulePrefixMatches
    ).toBe(manifest.summary.uniqueDemoApis);
    expect(manifest.summary.referenceModulePrefixMatches).toBeGreaterThan(0);
    expect(manifest.summary.unavailableAnchors).toBeGreaterThanOrEqual(0);
    expect(manifest.summary.knownTypeGaps).toBe(0);
    expect(manifest.summary.knownRuntimeGaps).toBe(0);
    expect(manifest.demoApis['Bun.TOML.stringify']).toMatchObject({
      scope: 'curated-runnable-demo',
      declaration: { matched: true, knownGap: false },
      documentation: { official: true, plane: 'docs', match: 'page' },
      runtime: {
        knownGap: !Bun.semver.satisfies(Bun.version, '>=1.4.0'),
      },
      ok: true,
    });
    expect(Object.values(manifest.demoApis).every(proof => proof.documentation.official)).toBe(
      true
    );
    expect(manifest.sources.documentation).toMatchObject({
      docsIndex: { source: LLMS_URL, sha256: expect.stringMatching(/^[a-f\d]{64}$/) },
      referenceIndex: {
        source: BUN_REFERENCE_INDEX_URL,
        sha256: expect.stringMatching(/^[a-f\d]{64}$/),
      },
      apiReference: BUN_API_REFERENCE_URL,
    });
    expect(manifest.runtime).toMatchObject({
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
      source: `${BUN_REPOSITORY_URL}/commit/${Bun.revision}`,
    });
    expect(manifest.sources.sourceCode).toEqual({
      repository: BUN_REPOSITORY_URL,
      runtimeRevision: `${BUN_REPOSITORY_URL}/commit/${Bun.revision}`,
    });
    expect(manifest.sources.releases).toMatchObject({
      source: BUN_RSS_URL,
      sha256: expect.stringMatching(/^[a-f\d]{64}$/),
      role: 'release-history-provenance',
    });
    expect(manifest.sources.releases.count).toBeGreaterThan(0);
    expect(manifest.sources.declarations).toMatchObject({
      package: 'bun-types',
      repository: BUN_REPOSITORY_URL,
      repositoryDirectory: 'packages/bun-types',
      source: bunTypesVersionSourceUrl(manifest.sources.declarations.version),
      main: BUN_TYPES_SOURCE_URL,
    });
    expect(manifest.sources.declarations.sha256).toMatch(/^[a-f0-9]{64}$/);
  }, 120_000);

  test('proves canonical URLs against official indexes instead of trusting the routing map', async () => {
    const indexes = await loadOfficialBunDocumentationIndexes();
    expect(officialDocumentationEvidence(CANONICAL_REFS['Bun.file']!, indexes)).toMatchObject({
      official: true,
      plane: 'docs',
      match: 'page',
      indexSource: LLMS_URL,
    });
    expect(
      officialDocumentationEvidence(CANONICAL_REFS['Bun.allocUnsafe']!, indexes)
    ).toMatchObject({
      official: true,
      plane: 'reference',
      match: 'module-prefix',
      indexSource: BUN_REFERENCE_INDEX_URL,
    });
    expect(
      officialDocumentationEvidence('https://example.com/reference/bun/file', indexes)
    ).toMatchObject({ official: false, plane: 'unrecognized', match: 'none' });
    expect(
      officialDocumentationEvidence('https://bun.com/docs/not-a-real-bun-page', indexes)
    ).toMatchObject({ official: false, plane: 'docs', match: 'none' });
    expect(officialDocumentationEvidence('not a URL', indexes)).toMatchObject({
      official: false,
      plane: 'unrecognized',
      match: 'none',
    });
  });

  test('official-source parser rejects a local or unofficial source identity', () => {
    const snapshots = {
      docs: {
        source: 'tools/bun-docs-index.json',
        entries: [],
      },
      feeds: {
        rss: { source: BUN_RSS_URL, count: 0, entries: [] },
        reference: { source: BUN_REFERENCE_INDEX_URL, pages: [] },
      },
      docsSha256: '0'.repeat(64),
      feedsSha256: '1'.repeat(64),
    };
    expect(() => parseOfficialBunDocumentationIndexes(snapshots)).toThrow(
      `source must be ${LLMS_URL}`
    );
  });

  test('typesContains matches exact bun-types symbols and rejects misspellings', async () => {
    const dts = await Bun.file(
      Bun.resolveSync('bun-types/bun.d.ts', process.cwd())
    ).text();
    expect(typesContains(dts, 'Bun.CryptoHasher')).toBe(true);
    expect(typesContains(dts, 'Bun.file')).toBe(true);
    expect(typesContains(dts, 'Bun.CryptoHashe')).toBe(false);
    expect(typesContains(dts, 'Bun.filee')).toBe(false);
    expect(
      typesContains(
        `declare module "bun" {
          namespace Other { function parse(input: string): object; }
          namespace TOML {}
        }`,
        'Bun.TOML.parse'
      )
    ).toBe(false);
    expect(
      typesContains(
        `declare module "bun" {
          namespace TOML { function parse(input: string): object; }
        }`,
        'Bun.TOML.parse'
      )
    ).toBe(true);
  });

  test('every verified API has an exact canonical source key', () => {
    const apis = [
      ...new Set([...BUN_API_ONELINERS, ...OPS_ONELINERS].flatMap(demo => demo.apis)),
    ];
    expect(apis.filter(api => !CANONICAL_REFS[api])).toEqual([]);
  });

  test('installed bun-types metadata points to the canonical Bun repository', async () => {
    const root = (await Bun.file('package.json').json()) as {
      catalog: Record<string, string>;
    };
    const metadata = await readBunTypesPackageMetadata();
    const typesBunMetadata = (await Bun.file(
      Bun.resolveSync('@types/bun/package.json', process.cwd())
    ).json()) as { version: string };
    expect(root.catalog['bun-types']).toBe(
      `file:tools/vendor/bun-types/bun-types-${metadata.version}.tgz`
    );
    expect(typesBunMetadata.version).toBe(root.catalog['@types/bun']);
    expect(metadata.repositoryUrl).toBe(BUN_REPOSITORY_URL);
    expect(metadata.repositoryDirectory).toBe('packages/bun-types');
  });

  test('bun-types source links pin releases by tag and tip packages by revision', () => {
    expect(bunTypesVersionSourceUrl('1.3.14')).toBe(
      `${BUN_REPOSITORY_URL}/tree/bun-v1.3.14/packages/bun-types`
    );
    expect(bunTypesVersionSourceUrl('1.4.0-tip.23d233b2')).toBe(
      `${BUN_REPOSITORY_URL}/tree/23d233b2/packages/bun-types`
    );
    expect(() => bunTypesVersionSourceUrl('1.4.0-canary.1')).toThrow(/immutable official/);
  });

  test('declaration proof hashes the exact installed official bun-types bundle', async () => {
    const first = declarationBundleHash(await readBunTypesText());
    const second = declarationBundleHash(await readBunTypesText());
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test('bun-types lookup reports the current source without stale catalog prose', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-doc-refs.ts', 'suggest', 'bun-types'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(output).toContain(BUN_TYPES_SOURCE_URL);
    expect(output).toContain('canonical upstream source');
    expect(output).not.toContain('98f664962ffe');
  });
});
