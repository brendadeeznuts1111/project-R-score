import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof.ts';
import { loadBunBrandMapSummarySliceSync } from '../lib/monitoring/bun-brand-map-slice.ts';
import { addedBunBrandBaselineKeys } from '../scripts/check-bun-brand-baseline.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});

async function writeArtifact(value: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bun-brand-governance-'));
  temporaryDirectories.push(dir);
  const path = join(dir, 'bun-brand-map.json');
  await Bun.write(path, `${JSON.stringify(value)}\n`);
  return path;
}

describe('Bun brand governance wiring', () => {
  test('staged brand gate is wired in pre-commit harness parallel jobs', async () => {
    const source = await Bun.file('scripts/pre-commit-harness.ts').text();
    expect(source).toContain("spawnGate('brands-staged'");
    expect(source).toContain("r.name === 'brands-staged'");
    expect(source).toContain('const brandStaged =');
  });

  test('warning baseline ratchet permits removal but rejects additions', () => {
    expect(addedBunBrandBaselineKeys(['a', 'b'], ['b'])).toEqual([]);
    expect(addedBunBrandBaselineKeys(['a'], ['a', 'c', 'c', 'b'])).toEqual(['b', 'c']);
  });

  test('root install and Bun cache gates are fail-closed when npm-install surface is staged', async () => {
    const source = await Bun.file('scripts/pre-commit-harness.ts').text();
    expect(source).toContain("spawnGate('npm-install'");
    expect(source).toContain("spawnGate('bun-pm-cache'");
    expect(source).toContain('if (npmInstall !== 0)');
  });

  test('cross-map bake follows capability and brand bakes and precedes ops', async () => {
    const source = await Bun.file('tools/bake-all.ts').text();
    const capabilities = source.indexOf("id: 'capabilities'");
    const bunfig = source.indexOf("id: 'bunfig'");
    const brands = source.indexOf("id: 'brands'");
    const crossMap = source.indexOf("id: 'bun-brand-map'");
    const ops = source.indexOf("id: 'ops'");
    expect(capabilities).toBeLessThan(bunfig);
    expect(bunfig).toBeLessThan(brands);
    expect(capabilities).toBeLessThan(brands);
    expect(brands).toBeLessThan(crossMap);
    expect(crossMap).toBeLessThan(ops);
  });

  test('cross-map has a continuous harness proof path without taxonomy registration', () => {
    expect(CRITICAL_PROOF_PATHS.find(path => path.id === 'bun-brand-cross-map')).toMatchObject({
      gateClass: 'continuous',
      gateRef: 'ci:harness',
      freshRerun: 'bun run bun:brand-map:check',
      owner: 'runtime-tooling',
    });
  });

  test('package scripts expose bun:brand-map operate loop', async () => {
    const pkg = await Bun.file('package.json').json();
    expect(pkg.scripts['bun:brand-map']).toBe('bun tools/bun-brand-map.ts');
    expect(pkg.scripts['bun:brand-map:check']).toBe('bun tools/bun-brand-map.ts --check');
    expect(pkg.scripts['bun:brand-map:baseline:ratchet']).toBe(
      'bun scripts/check-bun-brand-baseline.ts'
    );
    expect(typeof pkg.catalog['@types/bun']).toBe('string');
    expect(typeof pkg.catalog['bun-types']).toBe('string');
  });
});

describe('Bun brand ops slice', () => {
  test('legacy undeclared findings remain warnings and preserve project attribution', async () => {
    const path = await writeArtifact({
      schemaVersion: 1,
      kind: 'bun-brand-map',
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: {
        declared: 9,
        observed: 15,
        matched: 8,
        undeclared: 7,
        baselineUndeclared: 7,
        newUndeclared: 0,
        projects: 2,
      },
      findings: [
        {
          kind: 'observed-undeclared',
          severity: 'warning',
          baseline: true,
        },
      ],
      projects: [
        {
          path: 'projects/active/sports-terminal-os',
          observed: 4,
          undeclared: 2,
          legacyUndeclared: 2,
          attention: 2,
        },
      ],
    });

    expect(loadBunBrandMapSummarySliceSync(path)).toMatchObject({
      available: true,
      ok: true,
      warnings: 7,
      errors: 0,
      stale: false,
      legacyUndeclared: 7,
      newUndeclared: 0,
      projectAttribution: [
        {
          path: 'projects/active/sports-terminal-os',
          observed: 4,
          undeclared: 2,
          legacyUndeclared: 2,
          attention: 2,
        },
      ],
    });
  });

  test('new undeclared and stale evidence degrade the slice', async () => {
    const path = await writeArtifact({
      schemaVersion: 1,
      kind: 'bun-brand-map',
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: { baselineUndeclared: 3, newUndeclared: 1, stale: 1 },
      findings: [
        {
          kind: 'observed-undeclared',
          severity: 'error',
          baseline: false,
        },
      ],
    });

    expect(loadBunBrandMapSummarySliceSync(path)).toMatchObject({
      available: true,
      ok: false,
      warnings: 3,
      errors: 1,
      stale: true,
    });
  });

  test('missing or invalid artifacts are unavailable, not silently healthy', async () => {
    expect(loadBunBrandMapSummarySliceSync('/definitely/missing/bun-brand-map.json')).toEqual({
      available: false,
      ok: false,
      warnings: 0,
      errors: 0,
      stale: false,
      path: '/registry/bun-brand-map.json',
    });
    const emptyObject = await writeArtifact({});
    expect(loadBunBrandMapSummarySliceSync(emptyObject).available).toBe(false);

    const malformedSummary = await writeArtifact({
      schemaVersion: 1,
      kind: 'bun-brand-map',
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: { newUndeclared: '0' },
      findings: [],
    });
    expect(loadBunBrandMapSummarySliceSync(malformedSummary).available).toBe(false);

    const malformedFinding = await writeArtifact({
      schemaVersion: 1,
      kind: 'bun-brand-map',
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: { newUndeclared: 0 },
      findings: [{ severity: 'critical', baseline: false }],
    });
    expect(loadBunBrandMapSummarySliceSync(malformedFinding).available).toBe(false);
  });
});
