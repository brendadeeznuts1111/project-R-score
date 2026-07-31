#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/** Read-only validation for the dedicated Cloudflare Access token. */
import { jsonOut } from '../lib/console-depth.ts';
import { runCloudflareAccessTokenProbe } from '../lib/verification/cloudflare-access-token.ts';

try {
  const report = await runCloudflareAccessTokenProbe();
  if (Bun.argv.includes('--json')) {
    jsonOut(report);
  } else {
    console.log('Cloudflare Access token scope OK');
    console.log(`  tokenKind     ${report.tokenKind}`);
    console.log(
      `  probes        apps=${report.probes.apps.count} (${report.probes.apps.status}) serviceTokens=${report.probes.serviceTokens.count} (${report.probes.serviceTokens.status})`
    );
    console.log(`  expiry        ${report.warnings.join('; ') || 'all service tokens healthy'}`);
  }
  if (!report.ok) process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
