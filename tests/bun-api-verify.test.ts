/**
 * Three-source Bun API verification harness tests.
 * @see ../tools/bun-api-verify.ts
 * @see ../lib/bun-api-proof.ts
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
 */
import { describe, expect, test } from 'bun:test';
import {
  proofHash,
  proofPreview,
  readBunTypesPackageMetadata,
  typesContains,
} from '../lib/bun-api-proof.ts';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
  bunTypesVersionSourceUrl,
} from '../lib/docs/bun-source-links.ts';
import { BUN_API_ONELINERS } from '../tools/bun-api-oneliners.ts';
import { OPS_ONELINERS, runOpsOneliner } from '../tools/bun-ops-oneliners.ts';
import { verifyBunApis } from '../tools/bun-api-verify.ts';
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
  test('passes offline api + ops demos', async () => {
    const manifest = await verifyBunApis({ live: false, write: false });
    expect(manifest.summary.demos).toBeGreaterThan(0);
    expect(manifest.summary.demosPassed).toBe(manifest.summary.demos);
    expect(manifest.summary.opsDemos).toBe(9);
    expect(manifest.summary.apiDemos).toBeGreaterThan(0);
    expect(manifest.summary.apisVerified).toBe(manifest.summary.apis);
    expect(manifest.summary.typesVerified).toBe(manifest.summary.apis - 1);
    expect(manifest.summary.knownTypeGaps).toBe(1);
    expect(manifest.apis['Bun.TOML.stringify']).toMatchObject({
      inTypes: false,
      knownTypeGap: true,
      knownRuntimeGap: !Bun.semver.satisfies(Bun.version, '>=1.4.0'),
      ok: true,
    });
    expect(Object.values(manifest.apis).every(proof => proof.inDocs)).toBe(true);
    expect(manifest.sources).toEqual({
      apiReference: BUN_API_REFERENCE_URL,
      bunTypes: BUN_TYPES_SOURCE_URL,
      bunTypesPinned: bunTypesVersionSourceUrl(manifest.bunTypesVersion),
      repository: BUN_REPOSITORY_URL,
    });
  }, 120_000);

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
