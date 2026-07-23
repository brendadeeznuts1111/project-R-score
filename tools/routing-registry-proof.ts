#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Registry routing proof + optional local artifact publish.
 *
 *   bun tools/routing-registry-proof.ts
 *   REGISTRY_URL=https://score.factory-wager.com bun tools/routing-registry-proof.ts --write
 *   bun tools/routing-registry-proof.ts --write --json
 *   API_KEY=… bun tools/routing-registry-proof.ts --publish
 *
 * Artifact: public/registry/@factorywager/routing-test/latest.json
 * (allowlisted under /api/registry/@factorywager/* when mirrored to R2)
 *
 * @see lib/routing-proof.ts
 */
import { runRoutingProof, routingTableRows } from '../lib/routing-proof.ts';

const argv = Bun.argv.slice(2);
const writeLocal = argv.includes('--write');
const publishRemote = argv.includes('--publish');
const jsonOnly = argv.includes('--json');
const strictExit = !argv.includes('--no-fail');

const baseIdx = argv.indexOf('--base');
const baseUrl =
  (baseIdx >= 0 ? argv[baseIdx + 1] : undefined) ||
  Bun.env.REGISTRY_URL ||
  Bun.env.FACTORY_REGISTRY_URL ||
  'https://score.factory-wager.com';

const PACKAGE_NAME = Bun.env.PACKAGE_NAME || '@factorywager/routing-test';
const VERSION =
  Bun.env.VERSION ||
  `v${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)}`;
const ARTIFACT_DIR = `public/registry/${PACKAGE_NAME}`;
const API_KEY = Bun.env.API_KEY || Bun.env.REGISTRY_API_KEY || Bun.env.CLOUDFLARE_API_TOKEN;

const result = await runRoutingProof({ baseUrl });

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('Registry routing proof');
  console.log(`Base: ${result.baseUrl}`);
  console.log(`Bun v${result.bunVersion} (${result.bunRevision})`);
  console.log(
    Bun.inspect.table(
      routingTableRows(result),
      ['Endpoint', 'Status', 'OK', 'Pass', 'Time', 'Type', 'Note'],
      { colors: true }
    )
  );
  console.log(
    `${result.summary.passed}/${result.summary.total} expectations met · httpOk ${result.summary.httpOk}`
  );
  console.log(`Proof hash: ${result.proofHash}`);
}

if (writeLocal) {
  await Bun.$`mkdir -p ${ARTIFACT_DIR}`.quiet();
  const body = `${JSON.stringify(result, null, 2)}\n`;
  const versionPath = `${ARTIFACT_DIR}/${VERSION}.json`;
  const latestPath = `${ARTIFACT_DIR}/latest.json`;
  await Bun.write(versionPath, body);
  await Bun.write(latestPath, body);
  if (!jsonOnly) {
    console.log(`\nWrote ${versionPath}`);
    console.log(`Wrote ${latestPath}`);
    console.log(`Static URL (after deploy): ${baseUrl}/registry/${PACKAGE_NAME}/latest.json`);
    console.log(`API URL (R2 bind): ${baseUrl}/api/registry/${PACKAGE_NAME}/latest.json`);
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
      description: 'Registry routing proof',
      proofHash: result.proofHash,
      bunVersion: result.bunVersion,
      baseUrl: result.baseUrl,
      passed: result.summary.passed,
      total: result.summary.total,
      httpOk: result.summary.httpOk,
    })
  );

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/registry/${PACKAGE_NAME}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });

  if (res.ok) {
    if (!jsonOnly) {
      console.log(`Published ${PACKAGE_NAME}@${VERSION}`);
      console.log(`  ${baseUrl}/api/registry/${PACKAGE_NAME}/versions/${VERSION}`);
    }
  } else {
    console.error(`Publish failed: ${res.status} ${await res.text()}`);
    console.error(
      'Note: Pages /api/registry is GET-only today. Prefer --write + deploy, or R2 put of the same key.'
    );
    process.exit(1);
  }
} else if (!writeLocal && !jsonOnly) {
  console.log('\nTip: --write → public/registry/@factorywager/routing-test/');
  console.log('     --publish needs a POST registry endpoint + API_KEY (optional).');
}

if (strictExit && result.summary.failed > 0) {
  process.exit(1);
}
