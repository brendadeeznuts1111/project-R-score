#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/toml — Bun.TOML.stringify
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/llms.txt
/**
 * Three-source Bun API verification harness — types · docs · runtime.
 *
 * Exercises tools/bun-api-oneliners.ts + tools/bun-ops-oneliners.ts offline demos,
 * cross-references bun-types + CANONICAL_REFS + bun-docs-index.json, and emits
 * tools/bun-api-coverage-proof.json for CI diffing.
 *
 * Usage:
 *   bun tools/bun-api-verify.ts              # dry-run (exit 1 on demo failure)
 *   bun tools/bun-api-verify.ts --write      # write manifest
 *   bun run docs:api-verify                  # alias with --write
 */
import {
  proofHash,
  proofPreview,
  probeRuntimeApi,
  readBunTypesText,
  readBunTypesPackageMetadata,
  resolveBunTypesDir,
  typesContains,
} from '../lib/bun-api-proof.ts';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
  bunTypesVersionSourceUrl,
} from '../lib/docs/bun-source-links.ts';
import { BUN_API_ONELINERS, runOneliner } from './bun-api-oneliners.ts';
import { OPS_ONELINERS, runOpsOneliner } from './bun-ops-oneliners.ts';
import { CANONICAL_REFS } from './bun-doc-refs.ts';

export const PROOF_MANIFEST_PATH = 'tools/bun-api-coverage-proof.json';

export type ApiSymbolProof = {
  inTypes: boolean;
  knownTypeGap: boolean;
  knownRuntimeGap: boolean;
  inDocs: boolean;
  docUrl: string | null;
  runtime: string;
  ok: boolean;
  sha256: string;
};

export type DemoProof = {
  id: string; // brand-ok — demo oneliner id
  kind: 'api' | 'ops';
  summary: string;
  apis: string[];
  runtimeOutput: string | null;
  runtimeOk: boolean;
  proofHash: string;
  proofPreview: string;
};

export type VerifyManifest = {
  generated: string;
  bunVersion: string;
  bunTypesDir: string;
  bunTypesVersion: string;
  docsIndexVersion: string | null;
  sources: {
    apiReference: string;
    bunTypes: string;
    bunTypesPinned: string;
    repository: string;
  };
  summary: {
    demos: number;
    demosPassed: number;
    apis: number;
    apisVerified: number;
    typesVerified: number;
    knownTypeGaps: number;
    knownRuntimeGaps: number;
    opsDemos: number;
    apiDemos: number;
  };
  demos: DemoProof[];
  apis: Record<string, ApiSymbolProof>;
};

function findDocUrl(api: string): string | null {
  return CANONICAL_REFS[api] ?? null;
}

const KNOWN_BUN_TYPES_GAPS: Readonly<Record<string, { version: string; reason: string }>> = {
  'Bun.TOML.stringify': {
    version: '1.4.0-canary.20260519T150915',
    reason: 'runtime 1.4 API is not declared by the pinned bun-types canary package',
  },
};

const KNOWN_RUNTIME_GAPS: Readonly<Record<string, { minimum: string; reason: string }>> = {
  'Bun.TOML.stringify': {
    minimum: '1.4.0',
    reason: 'Pages-safe Bun 1.3.14 uses the governed lib/toml-stringify fallback',
  },
};

type RunnableDemo = {
  id: string; // brand-ok — demo oneliner id
  kind: 'api' | 'ops';
  summary: string;
  apis: readonly string[];
  live?: boolean;
  run: (opts: { live: boolean }) => Promise<string>;
};

function collectDemos(includeLive: boolean): RunnableDemo[] {
  const api: RunnableDemo[] = BUN_API_ONELINERS.filter(d => d.run && (includeLive || !d.live)).map(
    d => ({
      id: d.id,
      kind: 'api' as const,
      summary: d.summary,
      apis: d.apis,
      live: d.live,
      run: async ({ live }) => (await runOneliner(d.id, { live })).result,
    })
  );
  const ops: RunnableDemo[] = OPS_ONELINERS.filter(d => d.run && (includeLive || !d.live)).map(
    d => ({
      id: d.id,
      kind: 'ops' as const,
      summary: d.summary,
      apis: d.apis,
      live: d.live,
      run: async ({ live }) => (await runOpsOneliner(d.id, { live })).result,
    })
  );
  return [...api, ...ops];
}

export async function verifyBunApis(opts?: {
  live?: boolean;
  write?: boolean;
}): Promise<VerifyManifest> {
  const live = opts?.live ?? false;
  const dts = await readBunTypesText();
  const bunTypes = await readBunTypesPackageMetadata();
  const docs = (await Bun.file('tools/bun-docs-index.json').json()) as {
    bunVersion?: string;
  };

  const demos = collectDemos(live);
  const allApis = [...new Set(demos.flatMap(d => d.apis))].sort();

  const apis: Record<string, ApiSymbolProof> = {};
  let apisVerified = 0;
  let typesVerified = 0;
  let knownTypeGaps = 0;
  let knownRuntimeGaps = 0;
  const bunTypesPinned = bunTypesVersionSourceUrl(bunTypes.version);
  for (const api of allApis) {
    const inTypes = typesContains(dts, api);
    const knownGap = KNOWN_BUN_TYPES_GAPS[api];
    const knownTypeGap = !inTypes && knownGap?.version === bunTypes.version;
    const docUrl = findDocUrl(api);
    const runtime = await probeRuntimeApi(api);
    const runtimeOk = runtime !== 'undefined';
    const runtimeGap = KNOWN_RUNTIME_GAPS[api];
    const knownRuntimeGap =
      !runtimeOk &&
      runtimeGap !== undefined &&
      !Bun.semver.satisfies(Bun.version, `>=${runtimeGap.minimum}`);
    const ok = (inTypes || knownTypeGap) && docUrl != null && (runtimeOk || knownRuntimeGap);
    const sha256 = proofHash({
      signature: `${api}|types:${inTypes}|doc:${docUrl}|runtime:${runtime}`,
      bunTypesSource: bunTypesPinned,
    });
    apis[api] = {
      inTypes,
      knownTypeGap,
      knownRuntimeGap,
      inDocs: docUrl != null,
      docUrl,
      runtime,
      ok,
      sha256,
    };
    if (inTypes) typesVerified++;
    if (knownTypeGap) knownTypeGaps++;
    if (knownRuntimeGap) knownRuntimeGaps++;
    if (ok) apisVerified++;
  }

  const demoProofs: DemoProof[] = [];
  let demosPassed = 0;
  for (const d of demos) {
    let runtimeOutput: string | null = null;
    let runtimeOk = false;
    try {
      runtimeOutput = await d.run({ live });
      runtimeOk = true;
      demosPassed++;
    } catch (e) {
      runtimeOutput = e instanceof Error ? e.message : String(e);
    }
    const docsUrls = d.apis.map(findDocUrl).filter((url): url is string => url != null);
    const hash = proofHash({
      signature: `${d.kind}:${d.id}:${d.apis.join(',')}`,
      docsUrls,
      bunTypesSource: bunTypesPinned,
      runtimeOutput: runtimeOutput ?? undefined,
    });
    demoProofs.push({
      id: d.id,
      kind: d.kind,
      summary: d.summary,
      apis: [...d.apis],
      runtimeOutput,
      runtimeOk,
      proofHash: hash,
      proofPreview: proofPreview(hash),
    });
  }

  const manifest: VerifyManifest = {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    bunTypesDir: resolveBunTypesDir(),
    bunTypesVersion: bunTypes.version,
    docsIndexVersion: docs.bunVersion ?? null,
    sources: {
      apiReference: BUN_API_REFERENCE_URL,
      bunTypes: BUN_TYPES_SOURCE_URL,
      bunTypesPinned,
      repository: BUN_REPOSITORY_URL,
    },
    summary: {
      demos: demos.length,
      demosPassed,
      apis: allApis.length,
      apisVerified,
      typesVerified,
      knownTypeGaps,
      knownRuntimeGaps,
      opsDemos: demoProofs.filter(d => d.kind === 'ops').length,
      apiDemos: demoProofs.filter(d => d.kind === 'api').length,
    },
    demos: demoProofs,
    apis,
  };

  if (opts?.write) {
    await Bun.write(PROOF_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  }

  return manifest;
}

function printReport(manifest: VerifyManifest, write: boolean): void {
  const { summary } = manifest;
  console.log(`Bun ${manifest.bunVersion} · bun-types ${manifest.bunTypesVersion}`);
  console.log(
    `Demos: ${summary.demosPassed}/${summary.demos} passed (${summary.apiDemos} api + ${summary.opsDemos} ops)`
  );
  console.log(
    `APIs: ${summary.apisVerified}/${summary.apis} validated (types+docs+runtime/fallback) · declarations: ${
      summary.typesVerified
    }/${summary.apis} exact${
      summary.knownTypeGaps ? ` + ${summary.knownTypeGaps} pinned upstream gap` : ''
    } · doc hits: ${Object.values(manifest.apis).filter(a => a.inDocs).length}/${summary.apis}`
  );

  const failedDemos = manifest.demos.filter(d => !d.runtimeOk);
  if (failedDemos.length) {
    console.log('\nDEMO FAILURES:');
    for (const d of failedDemos) console.log(`  ✗ ${d.kind}:${d.id} — ${d.runtimeOutput}`);
  }

  const apiMismatches = Object.entries(manifest.apis).filter(([, p]) => !p.ok);
  if (apiMismatches.length) {
    console.log('\nAPI MISMATCHES (types/docs/runtime):');
    for (const [api, p] of apiMismatches) {
      console.log(
        `  ✗ ${api} types:${p.inTypes} known-gap:${p.knownTypeGap} docs:${p.inDocs} runtime:${p.runtime}`
      );
    }
  }

  const knownGaps = Object.entries(manifest.apis).filter(([, proof]) => proof.knownTypeGap);
  if (knownGaps.length) {
    console.log('\nPINNED UPSTREAM TYPE GAPS:');
    for (const [api] of knownGaps) {
      console.log(`  △ ${api} — ${KNOWN_BUN_TYPES_GAPS[api]?.reason}`);
    }
  }

  const runtimeGaps = Object.entries(manifest.apis).filter(([, proof]) => proof.knownRuntimeGap);
  if (runtimeGaps.length) {
    console.log('\nGOVERNED RUNTIME FALLBACKS:');
    for (const [api] of runtimeGaps) {
      console.log(`  △ ${api} — ${KNOWN_RUNTIME_GAPS[api]?.reason}`);
    }
  }

  if (write) {
    console.log(`\nWrote ${PROOF_MANIFEST_PATH}`);
  } else {
    console.log('\n(dry run — pass --write to emit manifest)');
  }
}

if (import.meta.main) {
  const live = Bun.argv.includes('--live');
  const write = Bun.argv.includes('--write');
  const manifest = await verifyBunApis({ live, write });
  printReport(manifest, write);
  const failed =
    manifest.summary.demosPassed < manifest.summary.demos ||
    manifest.summary.apisVerified < manifest.summary.apis;
  // The CLI owns its lifecycle after every awaited proof has completed. Exit
  // explicitly so a runtime-level handle leak cannot make CI wait forever.
  process.exit(failed ? 1 : 0);
}
