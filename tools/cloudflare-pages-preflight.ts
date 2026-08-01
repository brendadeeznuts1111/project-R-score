#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Pre-deploy gate — static checks before Cloudflare Pages push (no live token required).
 *
 *   bun tools/cloudflare-pages-preflight.ts
 *   bun tools/cloudflare-pages-preflight.ts --save
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 * @see lib/verification/cloudflare-pages-preflight.ts
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  runCloudflarePagesPreflight,
  saveCloudflarePagesPreflight,
} from '../lib/verification/cloudflare-pages-preflight.ts';

const shouldSave = Bun.argv.includes('--save');
const skipTaxonomy = Bun.argv.includes('--no-taxonomy');

async function main() {
  console.log('Cloudflare Pages preflight');
  const report = await runCloudflarePagesPreflight({
    taxonomy: !skipTaxonomy,
  });

  for (const step of report.steps) {
    console.log(`  ${step.ok ? '✅' : '❌'} ${step.id}${step.detail ? ` — ${step.detail}` : ''}`);
  }

  if (shouldSave) {
    const path = await saveCloudflarePagesPreflight(report);
    console.log(`\n💾 ${path}`);
  }

  if (!report.ok) {
    console.error('\n❌ Preflight failed');
    process.exit(1);
  }
  console.log('\n✅ Preflight passed — commit refreshed public/registry/* then deploy');
  console.log(`   ${report.commands.deployVerify}`);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
