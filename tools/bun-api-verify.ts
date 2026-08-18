#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @updated Bun.revision · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.revision · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-revision
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/toml — Bun.TOML.stringify
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/llms.txt
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Official-source-backed verification for the curated runnable demo surface.
 *
 * The oneliner registries define the executable sample population. They do not
 * define Bun's complete API. Each symbol named by those samples is checked
 * against the installed official bun-types package, Bun's docs/reference
 * indexes, and the running Bun binary.
 *
 * Usage:
 *   bun tools/bun-api-verify.ts              # dry-run (exit 1 on demo failure)
 *   bun tools/bun-api-verify.ts --write      # write manifest
 *   bun run docs:api-verify                  # alias with --write
 */
import {
  declarationBundleHash,
  proofHash,
  proofPreview,
  probeRuntimeApi,
  readBunTypesText,
  readBunTypesPackageMetadata,
  typesContains,
} from '../lib/bun-api-proof.ts';
import {
  officialDocumentationEvidence,
  type OfficialDocumentationEvidence,
} from '../lib/docs/bun-official-sources.ts';
import { BUN_API_COVERAGE_PROOF_ABS } from '../lib/docs/docs-artifact-paths.ts';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
  bunRuntimeRevisionSourceUrl,
  bunTypesVersionSourceUrl,
} from '../lib/docs/bun-source-links.ts';
import { loadOfficialBunDocumentationIndexes } from '../lib/docs/bun-source-snapshots.ts';
import { BUN_API_ONELINERS, runOneliner } from './bun-api-oneliners.ts';
import { OPS_ONELINERS, runOpsOneliner } from './bun-ops-oneliners.ts';
import { CANONICAL_REFS } from './bun-doc-refs.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('docs:api-verify', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export const PROOF_MANIFEST_PATH = BUN_API_COVERAGE_PROOF_ABS;

export type ApiSymbolProof = {
  scope: 'curated-runnable-demo';
  demoIds: string[];
  declaration: {
    matched: boolean;
    knownGap: boolean;
  };
  documentation: OfficialDocumentationEvidence & {
    canonicalUrl: string | null;
  };
  runtime: {
    type: string;
    matched: boolean;
    knownGap: boolean;
  };
  ok: boolean;
  sha256: string;
};

export type VerifySummary = {
  demos: number;
  demosPassed: number;
  opsDemos: number;
  apiDemos: number;
  apiMentions: number;
  uniqueDemoApis: number;
  demoApisVerified: number;
  declarationMatches: number;
  officialDocumentationMatches: number;
  docsPageMatches: number;
  referencePageMatches: number;
  referenceModulePrefixMatches: number;
  verifiedAnchors: number;
  unavailableAnchors: number;
  knownTypeGaps: number;
  knownRuntimeGaps: number;
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
  schemaVersion: 2;
  generated: string;
  scope: {
    population: 'curated-runnable-demos';
    claim: string;
  };
  runtime: {
    bunVersion: string;
    bunRevision: string;
    source: string;
  };
  sources: {
    sourceCode: {
      repository: string;
      runtimeRevision: string;
    };
    declarations: {
      package: string;
      version: string;
      repository: string;
      repositoryDirectory: string;
      source: string;
      main: string;
      sha256: string;
    };
    documentation: {
      docsIndex: {
        source: string;
        sha256: string;
        generated: string | null;
        ingestBunVersion: string | null;
      };
      referenceIndex: {
        source: string;
        sha256: string;
        generated: string | null;
      };
      apiReference: string;
    };
    releases: {
      source: string;
      sha256: string;
      generated: string | null;
      count: number;
      role: 'release-history-provenance';
    };
  };
  summary: VerifySummary;
  demos: DemoProof[];
  demoApis: Record<string, ApiSymbolProof>;
};

function withoutGenerated(manifest: VerifyManifest): Omit<VerifyManifest, 'generated'> {
  const { generated: _generated, ...stable } = manifest;
  return stable;
}

/** Preserve the evidence timestamp when a write would be byte-for-byte semantic no-op. */
export function preserveProofGeneratedAt(
  next: VerifyManifest,
  existing: VerifyManifest | null
): VerifyManifest {
  if (
    existing?.schemaVersion === next.schemaVersion &&
    JSON.stringify(withoutGenerated(existing)) === JSON.stringify(withoutGenerated(next))
  ) {
    return { ...next, generated: existing.generated };
  }
  return next;
}

function findDocUrl(api: string): string | null {
  return CANONICAL_REFS[api] ?? null;
}

const KNOWN_BUN_TYPES_GAPS: Readonly<Record<string, { version: string; reason: string }>> = {};

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
  const bunTypesSource = bunTypesVersionSourceUrl(bunTypes.version);
  const declarationSha256 = declarationBundleHash(dts);
  const documentationIndexes = await loadOfficialBunDocumentationIndexes();

  const demos = collectDemos(live);
  const allApis = [...new Set(demos.flatMap(d => d.apis))].sort();

  const demoApis: Record<string, ApiSymbolProof> = {};
  let demoApisVerified = 0;
  let declarationMatches = 0;
  let officialDocumentationMatches = 0;
  let knownTypeGaps = 0;
  let knownRuntimeGaps = 0;
  for (const api of allApis) {
    const inTypes = typesContains(dts, api);
    const knownGap = KNOWN_BUN_TYPES_GAPS[api];
    const knownTypeGap = !inTypes && knownGap?.version === bunTypes.version;
    const docUrl = findDocUrl(api);
    const documentation = officialDocumentationEvidence(docUrl, documentationIndexes);
    const documentationSha256 =
      documentation.plane === 'docs'
        ? documentationIndexes.docs.sha256
        : documentationIndexes.reference.sha256;
    const runtimeType = await probeRuntimeApi(api);
    const runtimeOk = runtimeType !== 'undefined';
    const runtimeGap = KNOWN_RUNTIME_GAPS[api];
    const knownRuntimeGap =
      !runtimeOk &&
      runtimeGap !== undefined &&
      !Bun.semver.satisfies(Bun.version, `>=${runtimeGap.minimum}`);
    const ok =
      (inTypes || knownTypeGap) && documentation.official && (runtimeOk || knownRuntimeGap);
    const sha256 = proofHash({
      signature: `${api}|types:${inTypes}|doc:${docUrl}|doc-snapshot:${documentationSha256}|runtime:${runtimeType}|doc-match:${documentation.match}`,
      bunTypesSource,
      declarationSha256,
    });
    demoApis[api] = {
      scope: 'curated-runnable-demo',
      demoIds: demos.filter(demo => demo.apis.includes(api)).map(demo => demo.id),
      declaration: {
        matched: inTypes,
        knownGap: knownTypeGap,
      },
      documentation: {
        canonicalUrl: docUrl,
        ...documentation,
      },
      runtime: {
        type: runtimeType,
        matched: runtimeOk,
        knownGap: knownRuntimeGap,
      },
      ok,
      sha256,
    };
    if (inTypes) declarationMatches++;
    if (documentation.official) officialDocumentationMatches++;
    if (knownTypeGap) knownTypeGaps++;
    if (knownRuntimeGap) knownRuntimeGaps++;
    if (ok) demoApisVerified++;
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
      bunTypesSource,
      declarationSha256,
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

  let manifest: VerifyManifest = {
    schemaVersion: 2,
    generated: new Date().toISOString(),
    scope: {
      population: 'curated-runnable-demos',
      claim:
        'Verification applies only to Bun symbols named by runnable API and operations demos; it is not complete Bun API coverage.',
    },
    runtime: {
      bunVersion: Bun.version,
      bunRevision: Bun.revision,
      source: bunRuntimeRevisionSourceUrl(Bun.revision),
    },
    sources: {
      sourceCode: {
        repository: BUN_REPOSITORY_URL,
        runtimeRevision: bunRuntimeRevisionSourceUrl(Bun.revision),
      },
      declarations: {
        package: bunTypes.name,
        version: bunTypes.version,
        repository: bunTypes.repositoryUrl,
        repositoryDirectory: bunTypes.repositoryDirectory,
        source: bunTypesSource,
        main: BUN_TYPES_SOURCE_URL,
        sha256: declarationSha256,
      },
      documentation: {
        docsIndex: {
          source: documentationIndexes.docs.source,
          sha256: documentationIndexes.docs.sha256,
          generated: documentationIndexes.docs.generated,
          ingestBunVersion: documentationIndexes.docs.bunVersion,
        },
        referenceIndex: {
          source: documentationIndexes.reference.source,
          sha256: documentationIndexes.reference.sha256,
          generated: documentationIndexes.reference.generated,
        },
        apiReference: BUN_API_REFERENCE_URL,
      },
      releases: {
        source: documentationIndexes.releases.source,
        sha256: documentationIndexes.releases.sha256,
        generated: documentationIndexes.releases.generated,
        count: documentationIndexes.releases.count,
        role: 'release-history-provenance',
      },
    },
    summary: {
      demos: demos.length,
      demosPassed,
      apiMentions: demos.reduce((count, demo) => count + demo.apis.length, 0),
      uniqueDemoApis: allApis.length,
      demoApisVerified,
      declarationMatches,
      officialDocumentationMatches,
      docsPageMatches: Object.values(demoApis).filter(
        proof => proof.documentation.plane === 'docs' && proof.documentation.match === 'page'
      ).length,
      referencePageMatches: Object.values(demoApis).filter(
        proof => proof.documentation.plane === 'reference' && proof.documentation.match === 'page'
      ).length,
      referenceModulePrefixMatches: Object.values(demoApis).filter(
        proof =>
          proof.documentation.plane === 'reference' && proof.documentation.match === 'module-prefix'
      ).length,
      verifiedAnchors: Object.values(demoApis).filter(
        proof => proof.documentation.anchor === 'verified'
      ).length,
      unavailableAnchors: Object.values(demoApis).filter(
        proof => proof.documentation.anchor === 'unavailable'
      ).length,
      knownTypeGaps,
      knownRuntimeGaps,
      opsDemos: demoProofs.filter(d => d.kind === 'ops').length,
      apiDemos: demoProofs.filter(d => d.kind === 'api').length,
    },
    demos: demoProofs,
    demoApis,
  };

  if (opts?.write) {
    const proofFile = Bun.file(PROOF_MANIFEST_PATH);
    const existing = (await proofFile.exists())
      ? ((await proofFile.json().catch(() => null)) as VerifyManifest | null)
      : null;
    manifest = preserveProofGeneratedAt(manifest, existing);
    await Bun.write(PROOF_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return manifest;
}

function printReport(manifest: VerifyManifest, write: boolean): void {
  const { summary } = manifest;
  console.log(
    `Bun ${manifest.runtime.bunVersion} · bun-types ${manifest.sources.declarations.version}`
  );
  console.log(
    `Demos: ${summary.demosPassed}/${summary.demos} passed (${summary.apiDemos} api + ${summary.opsDemos} ops)`
  );
  console.log(
    `Curated demo APIs: ${summary.demoApisVerified}/${summary.uniqueDemoApis} validated (types+official docs+runtime/fallback) · declarations: ${
      summary.declarationMatches
    }/${summary.uniqueDemoApis} exact${
      summary.knownTypeGaps ? ` + ${summary.knownTypeGaps} pinned upstream gap` : ''
    } · official doc hits: ${summary.officialDocumentationMatches}/${summary.uniqueDemoApis} · ${summary.apiMentions} demo mentions`
  );
  console.log(
    `Documentation evidence: ${summary.docsPageMatches} docs pages · ${summary.referencePageMatches} exact reference pages · ${summary.referenceModulePrefixMatches} reference module-prefix matches · anchors ${summary.verifiedAnchors} verified + ${summary.unavailableAnchors} unavailable upstream`
  );

  const failedDemos = manifest.demos.filter(d => !d.runtimeOk);
  if (failedDemos.length) {
    console.log('\nDEMO FAILURES:');
    for (const d of failedDemos) console.log(`  ✗ ${d.kind}:${d.id} — ${d.runtimeOutput}`);
  }

  const apiMismatches = Object.entries(manifest.demoApis).filter(([, p]) => !p.ok);
  if (apiMismatches.length) {
    console.log('\nAPI MISMATCHES (types/docs/runtime):');
    for (const [api, p] of apiMismatches) {
      console.log(
        `  ✗ ${api} types:${p.declaration.matched} known-gap:${p.declaration.knownGap} docs:${p.documentation.official} runtime:${p.runtime.type}`
      );
    }
  }

  const knownGaps = Object.entries(manifest.demoApis).filter(
    ([, proof]) => proof.declaration.knownGap
  );
  if (knownGaps.length) {
    console.log('\nPINNED UPSTREAM TYPE GAPS:');
    for (const [api] of knownGaps) {
      console.log(`  △ ${api} — ${KNOWN_BUN_TYPES_GAPS[api]?.reason}`);
    }
  }

  const runtimeGaps = Object.entries(manifest.demoApis).filter(
    ([, proof]) => proof.runtime.knownGap
  );
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
  const live = argv.includes('--live');
  const write = argv.includes('--write');
  const manifest = await verifyBunApis({ live, write });
  printReport(manifest, write);
  const failed =
    manifest.summary.demosPassed < manifest.summary.demos ||
    manifest.summary.demoApisVerified < manifest.summary.uniqueDemoApis;
  // The CLI owns its lifecycle after every awaited proof has completed. Exit
  // explicitly so a runtime-level handle leak cannot make CI wait forever.
  process.exit(failed ? 1 : 0);
}
