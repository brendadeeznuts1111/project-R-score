#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * CLI entry for token scope validation — avoids r2-env import.meta.main circular load.
 *
 * @see config/r2-env.ts CLOUDFLARE_TOKEN_PERMISSIONS
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { runCloudflareTokenScopeProbe } from '../lib/verification/cloudflare-token-scope.ts';
import { jsonOut } from '../lib/console-depth.ts';

const asJson = Bun.argv.includes('--json');
const strict = Bun.argv.includes('--strict');

try {
  const report = await runCloudflareTokenScopeProbe({ strict });
  if (asJson) {
    jsonOut(report);
  } else {
    console.log('Cloudflare token scope OK');
    console.log(`  tier          ${report.tier}`);
    console.log(
      `  tokenKind     ${report.tokenKind} (${report.tokenKind === 'account' ? 'cfat_' : 'user'})`
    );
    console.log(`  verify        status=${report.verify.status} id=${report.verify.id ?? '—'}`);
    console.log(`  permissions   ${report.permissions.join(', ') || '—'}`);
    console.log(
      `  probes        pages=${report.probes.pages.project} (${report.probes.pages.status}) zone=${report.probes.zone.name} (${report.probes.zone.status})`
    );
    if (report.warnings.length) {
      console.log(`  warnings      ${report.warnings.join('; ')}`);
    }
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
