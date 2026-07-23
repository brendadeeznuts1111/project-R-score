#!/usr/bin/env bun
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
  resolveBunTypesDir,
  typesContains,
} from '../lib/bun-api-proof.ts';
import { BUN_API_ONELINERS, runOneliner } from './bun-api-oneliners.ts';
import { OPS_ONELINERS, runOpsOneliner } from './bun-ops-oneliners.ts';
import { CANONICAL_REFS } from './bun-doc-refs.ts';

export const PROOF_MANIFEST_PATH = 'tools/bun-api-coverage-proof.json';

type DocsEntry = { title: string; url: string; desc?: string; domain?: string; anchors?: string[] };

export type ApiSymbolProof = {
  inTypes: boolean;
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
  docsIndexVersion: string | null;
  summary: {
    demos: number;
    demosPassed: number;
    apis: number;
    apisVerified: number;
    opsDemos: number;
    apiDemos: number;
  };
  demos: DemoProof[];
  apis: Record<string, ApiSymbolProof>;
};

function findDocUrl(api: string, entries: DocsEntry[]): string | null {
  const canonical = CANONICAL_REFS[api];
  if (canonical) return canonical;
  const token = api.split(/[.:]/).pop()!.toLowerCase();
  for (const e of entries) {
    const hay = [e.title, e.url, e.desc ?? '', e.domain ?? '', ...(e.anchors ?? [])]
      .join('\n')
      .toLowerCase();
    if (hay.includes(token)) return e.url;
  }
  return null;
}

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
  const docs = (await Bun.file('tools/bun-docs-index.json').json()) as {
    entries: DocsEntry[];
    bunVersion?: string;
  };

  const demos = collectDemos(live);
  const allApis = [...new Set(demos.flatMap(d => d.apis))].sort();

  const apis: Record<string, ApiSymbolProof> = {};
  let apisVerified = 0;
  for (const api of allApis) {
    const inTypes = typesContains(dts, api);
    const docUrl = findDocUrl(api, docs.entries);
    const runtime = await probeRuntimeApi(api);
    const runtimeOk = runtime !== 'undefined';
    const ok = inTypes && runtimeOk;
    const sha256 = proofHash({
      signature: `${api}|types:${inTypes}|doc:${docUrl}|runtime:${runtime}`,
    });
    apis[api] = {
      inTypes,
      inDocs: docUrl != null,
      docUrl,
      runtime,
      ok,
      sha256,
    };
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
    const docUrl = d.apis.map(a => findDocUrl(a, docs.entries)).find(Boolean) ?? null;
    const hash = proofHash({
      signature: `${d.kind}:${d.id}:${d.apis.join(',')}`,
      docsUrl: docUrl,
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
    docsIndexVersion: docs.bunVersion ?? null,
    summary: {
      demos: demos.length,
      demosPassed,
      apis: allApis.length,
      apisVerified,
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
  console.log(
    `Bun ${manifest.bunVersion} · bun-types: ${manifest.bunTypesDir.split('/').slice(-1)[0]}`
  );
  console.log(
    `Demos: ${summary.demosPassed}/${summary.demos} passed (${summary.apiDemos} api + ${summary.opsDemos} ops)`
  );
  console.log(
    `APIs: ${summary.apisVerified}/${summary.apis} verified (types+runtime) · doc hits: ${
      Object.values(manifest.apis).filter(a => a.inDocs).length
    }/${summary.apis}`
  );

  const failedDemos = manifest.demos.filter(d => !d.runtimeOk);
  if (failedDemos.length) {
    console.log('\nDEMO FAILURES:');
    for (const d of failedDemos) console.log(`  ✗ ${d.kind}:${d.id} — ${d.runtimeOutput}`);
  }

  const apiMismatches = Object.entries(manifest.apis).filter(([, p]) => !p.ok);
  if (apiMismatches.length) {
    console.log('\nAPI MISMATCHES (types/runtime):');
    for (const [api, p] of apiMismatches) {
      console.log(`  ✗ ${api} types:${p.inTypes} runtime:${p.runtime}`);
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
  if (failed) process.exit(1);
}
