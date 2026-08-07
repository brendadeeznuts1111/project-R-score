#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Read-only Pages + Access + public-plane integration probe. */
import { jsonOut } from '../lib/console-depth.ts';
import { runCloudflareAccessEdgeProbe } from '../lib/verification/cloudflare-access-live.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('cloudflare:access:edge:validate', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const token = Bun.env.CLOUDFLARE_API_TOKEN?.trim();
if (!token) {
  console.error(
    'Missing CLOUDFLARE_API_TOKEN. Inject the Pages Read token; this command never uses the Access policy token.'
  );
  process.exit(1);
}

try {
  const report = await runCloudflareAccessEdgeProbe({ apiToken: token });
  if (argv.includes('--json')) {
    jsonOut(report);
  } else {
    console.log('Cloudflare Access edge integration');
    console.log(`  ledger       ${report.ledger.evidence}`);
    console.log(`  portal       ${report.portal.message}`);
    console.log(
      `  preview      ${report.preview.access.evidence} · ${report.preview.deployment.stage} · ${report.preview.deployment.url}`
    );
    console.log(`  public plane ${report.publicRegistry.evidence}`);
    if (!report.ok) {
      console.error('Cloudflare Access edge integration has drift');
    }
  }
  if (!report.ok) process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
