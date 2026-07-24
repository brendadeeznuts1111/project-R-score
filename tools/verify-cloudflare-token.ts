#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Cloudflare token scope + MCP catalog parity proof.
 *
 *   bun tools/verify-cloudflare-token.ts
 *   bun tools/verify-cloudflare-token.ts --save
 *   bun tools/verify-cloudflare-token.ts --no-live --save   # static catalog parity only
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { logTable } from '../lib/console-depth.ts';
import {
  CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH,
  buildCloudflareTokenScopeProof,
} from '../lib/verification/cloudflare-token-scope.ts';

export const SAVE_PATH = 'public/registry/cloudflare-token-scope-proof.json';

const asJson = Bun.argv.includes('--json');
const shouldSave = Bun.argv.includes('--save');
const noLive = Bun.argv.includes('--no-live');
const strict = Bun.argv.includes('--strict');

const proof = await buildCloudflareTokenScopeProof({
  strict,
  live: !noLive,
});

if (asJson) {
  console.log(JSON.stringify(proof, null, 2));
} else {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ☁️  Cloudflare token scope + MCP catalog parity                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(
    `  static catalog   ${proof.mcpCatalog.ok ? '✅' : '❌'} (${proof.mcpCatalog.serverCount} servers)`
  );
  console.log(
    `  live probe       ${proof.liveProbe.available ? (proof.liveProbe.ok ? '✅' : '❌') : '— skipped'} tier=${proof.summary.tier}`
  );
  if (proof.liveProbe.warnings?.length) {
    console.log(`  warnings         ${proof.liveProbe.warnings.join('; ')}`);
  }
  if (proof.liveProbe.skippedReason && !proof.liveProbe.available) {
    console.log(`  live skip        ${proof.liveProbe.skippedReason}`);
  }
  logTable(
    proof.mcpCatalog.rows.map(r => ({
      server: r.name,
      repo: r.repoUrl?.replace('https://', '') ?? '—',
      wellKnown: r.wellKnownUrl?.replace('https://', '') ?? '—',
      status: r.ok ? '✅' : '❌',
    })),
    ['server', 'repo', 'wellKnown', 'status']
  );
  console.log(
    `  summary          ${proof.summary.status} · proofHash ${proof.proofHash.slice(0, 12)}…`
  );
}

if (shouldSave) {
  await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2) + '\n');
  console.log(`\n💾 Saved → ${SAVE_PATH} (${CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH})`);
}

if (!proof.summary.ok && proof.summary.status === 'fail') {
  process.exit(1);
}
