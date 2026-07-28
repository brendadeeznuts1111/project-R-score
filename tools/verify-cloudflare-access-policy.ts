#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { verifyCloudflareAccessPolicyText } from '../lib/verification/cloudflare-access-policy.ts';

const path = '.cloudflare-access.yml';
const file = Bun.file(path);

if (!(await file.exists())) {
  console.error(`❌ ${path} is missing`);
  process.exit(1);
}

const report = verifyCloudflareAccessPolicyText(await file.text());

if (report.ok) {
  console.log(`✅ Cloudflare Access policy: ${report.appCount} scoped SSO apps`);
  process.exit(0);
}

console.error(`❌ Cloudflare Access policy: ${report.issues.length} issue(s)`);
for (const problem of report.issues) {
  console.error(`  ${problem.code} · ${problem.path} · ${problem.message}`);
}
process.exit(1);
