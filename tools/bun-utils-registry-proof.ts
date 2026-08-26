#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils — Bun.inspect · .table · stringWidth · deepEquals
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Self-verifying Bun utility proof + optional local registry artifact.
 *
 *   bun tools/bun-utils-registry-proof.ts
 *   bun tools/bun-utils-registry-proof.ts --write
 *   bun tools/bun-utils-registry-proof.ts --write --json
 *   FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL=http://localhost:3000 \
 *     FACTORY_WAGER_LOCAL_REGISTRY_TOKEN=… bun tools/bun-utils-registry-proof.ts --publish
 *
 * Writes under public/registry/@factorywager/bun-utils-test/ (Pages static +
 * allowlisted for /api/registry/@factorywager/* when mirrored to R2).
 *
 * @see lib/bun-utils-proof.ts
 * @see docs/registry-client.md
 */
import {
  factoryWagerLocalRegistryWriteUrlFromEnv,
  factoryWagerPagesCustomUrl,
  factoryWagerRegistryUrlFromEnv,
} from '../config/r2-env.ts';
import { buildBunUtilsProof, tableRows, type BunUtilsProofResult } from '../lib/bun-utils-proof.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('bun:utils-proof', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const writeLocal = argv.includes('--write');
const publishRemote = argv.includes('--publish');
const jsonOnly = argv.includes('--json');
const strictExit = !argv.includes('--no-fail');

const registryUrl = factoryWagerRegistryUrlFromEnv().replace(/\/$/, '');
const localWriteUrl = factoryWagerLocalRegistryWriteUrlFromEnv();
const pagesUrl = factoryWagerPagesCustomUrl().replace(/\/$/, '');
const LOCAL_WRITE_TOKEN = Bun.env.FACTORY_WAGER_LOCAL_REGISTRY_TOKEN;
const PACKAGE_NAME = Bun.env.PACKAGE_NAME || '@factorywager/bun-utils-test';
const VERSION =
  Bun.env.VERSION || `v${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)}`;

// @factorywager/bun-utils-test → public/registry/@factorywager/bun-utils-test
const ARTIFACT_DIR = `public/registry/${PACKAGE_NAME}`;

const result = buildBunUtilsProof();

if (jsonOnly) {
  jsonOut(result);
} else {
  console.log('Bun utility defaults proof');
  console.log(`Bun v${result.bunVersion} (${result.bunRevision})`);
  logTable(tableRows(result), ['Utility', 'Input', 'Actual', 'Expected', 'Note', 'Match'], {
    colors: true,
  });
  console.log(`${result.summary.passed}/${result.summary.total} passed`);
  console.log(`Proof hash: ${result.proofHash}`);
}

if (writeLocal) {
  await Bun.$`mkdir -p ${ARTIFACT_DIR}`.quiet();
  const versionPath = `${ARTIFACT_DIR}/${VERSION}.json`;
  const latestPath = `${ARTIFACT_DIR}/latest.json`;
  const body = `${JSON.stringify(result, null, 2)}\n`;
  await Bun.write(versionPath, body);
  await Bun.write(latestPath, body);
  if (!jsonOnly) {
    console.log(`\nWrote ${versionPath}`);
    console.log(`Wrote ${latestPath}`);
    console.log(`Static URL (after deploy): ${pagesUrl}/registry/${PACKAGE_NAME}/latest.json`);
    console.log(`Registry index: ${registryUrl}/api/registry/registry.json`);
  }
}

if (publishRemote) {
  if (!Bun.env.FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL || !LOCAL_WRITE_TOKEN) {
    console.error(
      'Local publish requires FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL and FACTORY_WAGER_LOCAL_REGISTRY_TOKEN'
    );
    process.exit(2);
  }
  if (!jsonOnly) console.log(`\nPublishing proof to local gateway ${localWriteUrl} …`);

  const form = new FormData();
  form.append(
    'file',
    new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
    'test-results.json'
  );
  form.append('version', VERSION);
  form.append('tags', 'latest,test');
  form.append(
    'metadata',
    JSON.stringify({
      description: 'Bun utility defaults test',
      proofHash: result.proofHash,
      bunVersion: result.bunVersion,
      passed: result.summary.passed,
      total: result.summary.total,
    })
  );

  const res = await fetch(`${localWriteUrl}/api/registry/${PACKAGE_NAME}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOCAL_WRITE_TOKEN}` },
    body: form,
  });

  if (res.ok) {
    if (!jsonOnly) {
      console.log(`Published ${PACKAGE_NAME}@${VERSION}`);
      console.log(`  ${localWriteUrl}/api/registry/${PACKAGE_NAME}/versions/${VERSION}`);
    }
  } else {
    console.error(`Publish failed: ${res.status} ${await res.text()}`);
    console.error(
      'The local gateway is the only SDK write route. Production writes require separate direct-to-R2 authority.'
    );
    process.exit(1);
  }
} else if (!writeLocal && !jsonOnly) {
  console.log('\nTip: --write → public/registry/@factorywager/bun-utils-test/');
  console.log('     --publish needs explicit loopback URL + local token (optional).');
}

if (!jsonOnly) {
  console.log('\nVerify proof hash locally:');
  console.log(
    `  bun -e 'import { buildBunUtilsProof } from "./lib/bun-utils-proof.ts"; const r=buildBunUtilsProof(); console.log(r.proofHash === "${result.proofHash}" ? "same-run may differ (timestamp)" : r.proofHash);'`
  );
}

if (strictExit && result.summary.failed > 0) {
  process.exit(1);
}

export type { BunUtilsProofResult };
