#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/** Read-health validation for the dedicated Cloudflare Access token. */
import { jsonOut } from '../lib/console-depth.ts';
import { runCloudflareAccessTokenProbe } from '../lib/verification/cloudflare-access-token.ts';

if (import.meta.main) {
  try {
    const report = await runCloudflareAccessTokenProbe();
    if (Bun.argv.includes('--json')) {
      jsonOut(report);
    } else {
      console.log('Cloudflare Access token read health OK');
      console.log(`  tokenKind     ${report.tokenKind}`);
      console.log(
        `  probes        apps=${report.probes.apps.count} (${report.probes.apps.status}) serviceTokens=${report.probes.serviceTokens.count} (${report.probes.serviceTokens.status})`
      );
      console.log(`  expiry        ${report.warnings.join('; ') || 'all service tokens healthy'}`);
      console.log(
        `  writeScope    unverified (${report.verification.requiredWritePermission}; prove with plan)`
      );
    }
    if (!report.ok) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
