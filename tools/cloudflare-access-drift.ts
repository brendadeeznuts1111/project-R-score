#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Read-only drift between `.cloudflare-access.yml` and the live Access app list. */
import { jsonOut } from '../lib/console-depth.ts';
import { diffScopedAccessApps } from '../lib/verification/cloudflare-access-drift.ts';
import {
  readScopedAccessApps,
  verifyCloudflareAccessPolicyText,
} from '../lib/verification/cloudflare-access-policy.ts';
import { runCloudflareAccessTokenProbe } from '../lib/verification/cloudflare-access-token.ts';

const POLICY_PATH = '.cloudflare-access.yml';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('cloudflare:access:drift', Bun.argv.slice(2))
  : Bun.argv.slice(2);

if (import.meta.main) {
  const file = Bun.file(POLICY_PATH);
  if (!(await file.exists())) {
    console.error(`Missing ${POLICY_PATH}`);
    process.exit(1);
  }

  const text = await file.text();
  const policy = verifyCloudflareAccessPolicyText(text);
  if (!policy.ok) {
    console.error(`Cloudflare Access policy file is not safe to compare (${policy.issues.length})`);
    for (const problem of policy.issues) {
      console.error(`  ${problem.code} · ${problem.path} · ${problem.message}`);
    }
    process.exit(1);
  }

  try {
    const live = await runCloudflareAccessTokenProbe();
    const report = {
      ...diffScopedAccessApps(readScopedAccessApps(text), live.apps),
      liveAppCount: live.apps.length,
    };
    if (argv.includes('--json')) {
      jsonOut(report);
    } else if (report.ok) {
      console.log(
        `Cloudflare Access drift: ${report.scopedCount} scoped apps match live name, domain, and session (${report.liveAppCount} live, unlisted ignored)`
      );
    } else {
      console.error(
        `Cloudflare Access drift: ${report.drifts.length} mismatch(es) across ${report.scopedCount} scoped apps (${report.liveAppCount} live, unlisted ignored)`
      );
      for (const drift of report.drifts) {
        console.error(
          `  ${drift.field} · ${drift.domain} · policy=${drift.policy} · live=${drift.live}`
        );
      }
    }
    if (!report.ok) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
