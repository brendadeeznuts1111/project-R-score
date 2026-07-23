#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Registry routing proof + optional local artifact publish (v2).
 *
 *   bun tools/routing-registry-proof.ts
 *   REGISTRY_URL=https://score.factory-wager.com bun tools/routing-registry-proof.ts --write
 *   bun tools/routing-registry-proof.ts --write --json
 *   bun tools/routing-registry-proof.ts --concurrency 8 --base https://project-r-score.pages.dev
 *
 * @see lib/routing-proof.ts
 */
import {
  runRoutingProof,
  routingTableRows,
  writeRoutingArtifact,
  ROUTING_ARTIFACT_PACKAGE,
} from '../lib/routing-proof.ts';

const argv = Bun.argv.slice(2);
const writeLocal = argv.includes('--write');
const publishRemote = argv.includes('--publish');
const jsonOnly = argv.includes('--json');
const strictExit = !argv.includes('--no-fail');
const noPrevious = argv.includes('--no-previous');

const baseIdx = argv.indexOf('--base');
const baseUrl =
  (baseIdx >= 0 ? argv[baseIdx + 1] : undefined) ||
  Bun.env.REGISTRY_URL ||
  Bun.env.FACTORY_REGISTRY_URL ||
  'https://score.factory-wager.com';

const concIdx = argv.indexOf('--concurrency');
const concurrency = concIdx >= 0 ? Number(argv[concIdx + 1]) : undefined;

const API_KEY = Bun.env.API_KEY || Bun.env.REGISTRY_API_KEY || Bun.env.CLOUDFLARE_API_TOKEN;
const VERSION =
  Bun.env.VERSION ||
  `v${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)}`;

const result = await runRoutingProof({
  baseUrl,
  concurrency: Number.isFinite(concurrency) ? concurrency : undefined,
  noPrevious,
});

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('Registry routing proof v2');
  console.log(`Base: ${result.baseUrl} · concurrency ${result.concurrency}`);
  console.log(`Bun v${result.bunVersion} (${result.bunRevision})`);
  console.log(
    Bun.inspect.table(
      routingTableRows(result),
      ['Endpoint', 'Status', 'OK', 'Pass', 'Crit', 'Time', 'Type', 'Note'],
      { colors: true }
    )
  );
  const { latency, summary } = result;
  console.log(
    `${summary.passed}/${summary.total} pass · httpOk ${summary.httpOk}` +
      ` · criticalFail ${summary.criticalFailed}` +
      ` · latency p50=${latency.p50Ms}ms p95=${latency.p95Ms}ms max=${latency.maxMs}ms`
  );
  if (result.regression) {
    const n = result.regression.changes.length;
    console.log(
      n === 0
        ? `Regression: none vs ${result.regression.previousTimestamp ?? 'previous'}`
        : `Regression: ${n} change(s) vs ${result.regression.previousTimestamp ?? 'previous'}`
    );
    for (const c of result.regression.changes.slice(0, 12)) {
      console.log(`  [${c.kind}] ${c.path}: ${c.detail}`);
    }
  }
  console.log(`Proof hash: ${result.proofHash}`);
}

if (writeLocal) {
  const { latestPath, versionPath } = await writeRoutingArtifact(result, { version: VERSION });
  if (!jsonOnly) {
    console.log(`\nWrote ${versionPath}`);
    console.log(`Wrote ${latestPath}`);
    console.log(
      `Static URL (after deploy): ${baseUrl.replace(/\/$/, '')}/registry/${ROUTING_ARTIFACT_PACKAGE}/latest.json`
    );
  }
}

if (publishRemote) {
  if (!API_KEY) {
    console.error('Publish requires API_KEY / REGISTRY_API_KEY / CLOUDFLARE_API_TOKEN');
    process.exit(2);
  }
  if (!jsonOnly) console.log(`\nPublishing proof to ${baseUrl} …`);

  const form = new FormData();
  form.append(
    'file',
    new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
    'routing-results.json'
  );
  form.append('version', VERSION);
  form.append('tags', 'latest,routing,test');
  form.append(
    'metadata',
    JSON.stringify({
      description: 'Registry routing proof v2',
      proofHash: result.proofHash,
      bunVersion: result.bunVersion,
      baseUrl: result.baseUrl,
      passed: result.summary.passed,
      total: result.summary.total,
      httpOk: result.summary.httpOk,
      criticalFailed: result.summary.criticalFailed,
      p95Ms: result.latency.p95Ms,
      regressions: result.regression?.changes.length ?? 0,
    })
  );

  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/registry/${ROUTING_ARTIFACT_PACKAGE}/versions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    }
  );

  if (res.ok) {
    if (!jsonOnly) console.log(`Published ${ROUTING_ARTIFACT_PACKAGE}@${VERSION}`);
  } else {
    console.error(`Publish failed: ${res.status} ${await res.text()}`);
    console.error('Prefer --write + deploy (Pages /api/registry is GET-only).');
    process.exit(1);
  }
} else if (!writeLocal && !jsonOnly) {
  console.log('\nTip: --write → public/registry/@factorywager/routing-test/');
}

// Fail on expectation failures or critical path failures
if (strictExit && (result.summary.failed > 0 || result.summary.criticalFailed > 0)) {
  process.exit(1);
}
