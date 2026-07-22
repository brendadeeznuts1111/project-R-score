#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Print Cloudflare / Pages / R2 env inventory (no secret values).
 *
 * Usage: bun scripts/cloudflare-env-status.ts [--json]
 */
import {
  CLOUDFLARE_DEFAULTS,
  CLOUDFLARE_ENV_KEYS,
  describeCloudflareEnv,
} from '../config/r2-env.ts';

const json = Bun.argv.includes('--json');
const status = describeCloudflareEnv();

if (json) {
  console.log(
    JSON.stringify(
      {
        defaults: CLOUDFLARE_DEFAULTS,
        envKeys: CLOUDFLARE_ENV_KEYS,
        status,
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log('Cloudflare env status');
console.log(`  accountId     ${status.accountId}`);
console.log(`  zone          ${status.zone.name} (${status.zone.id})`);
console.log(`  pages         ${status.pages.project} → ${status.pages.url}`);
console.log(
  `  build_config  cmd=${status.pagesBuildConfig.build_command} out=${status.pagesBuildConfig.destination_dir} branch=${status.pages.productionBranch}`
);
console.log(
  `  pages_env     ${Object.entries(status.pagesBuildEnv)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')}`
);
console.log(`  apiTokenReady ${status.apiTokenReady}`);
console.log(`  r2Ready       ${status.r2Ready}`);
console.log('  secrets:');
for (const s of status.secrets) {
  const flag = !s.set ? 'missing' : s.placeholder ? 'placeholder' : 'set';
  console.log(`    ${s.key}: ${flag}`);
}
console.log(`  wiki          ${CLOUDFLARE_DEFAULTS.wikiHost}`);
console.log(`  r2 buckets    ${CLOUDFLARE_DEFAULTS.r2Buckets.join(', ')}`);
