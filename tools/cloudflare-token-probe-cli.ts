#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
/**
 * Probe Cloudflare tokens from env — never prints token values.
 *
 *   bun run proton:inject:factorywager
 *   set -a && source .env && set +a
 *   bun tools/cloudflare-token-probe-cli.ts
 *   bun tools/cloudflare-token-probe-cli.ts --json
 *
 * @see lib/security/cloudflare-token-probe.ts
 */
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { probeCloudflareTokensFromEnv } from '../lib/security/cloudflare-token-probe.ts';

const argv = applyUnknownLongOptionGuardFor('cloudflare-token-probe', Bun.argv.slice(2));
const asJson = argv.includes('--json');

const rows = await probeCloudflareTokensFromEnv(Bun.env);
if (rows.length === 0) {
  console.error(
    'No CLOUDFLARE_*_TOKEN env keys set. Inject first: bun run proton:inject:factorywager'
  );
  process.exit(2);
}

if (asJson) {
  console.log(
    JSON.stringify(
      {
        accountIdSet: Boolean(Bun.env.CLOUDFLARE_ACCOUNT_ID?.trim()),
        probes: rows.map(r => ({
          envKey: r.envKey,
          status: r.status,
          statusCode: r.statusCode,
          kindDetail: r.kindDetail,
          note: r.note ?? null,
        })),
      },
      null,
      2
    )
  );
} else {
  console.log(
    `Cloudflare token probes · accountId=${Bun.env.CLOUDFLARE_ACCOUNT_ID ? 'set' : 'unset'}`
  );
  for (const r of rows) {
    const mark = r.status === 'ok' ? '✅' : r.status === 'invalid' ? '❌' : '⚠️';
    console.log(
      `  ${mark} ${r.envKey.padEnd(28)} ${r.status.padEnd(12)} http=${r.statusCode ?? '—'} kind=${r.kindDetail}${r.note ? ` · ${r.note}` : ''}`
    );
  }
  if (rows.some(r => r.status === 'invalid' && r.kindDetail === 'account')) {
    console.log(
      'Hint: account tokens (cfat_) use /accounts/{id}/tokens/verify — ensure CLOUDFLARE_ACCOUNT_ID is set after inject.'
    );
  }
  if (rows.some(r => r.status === 'invalid')) {
    console.log(
      'Rotate: mint in Cloudflare dashboard → update pass://factorywager/Cloudflare API Token/password → bun run proton:inject:factorywager:reasonix'
    );
  }
}

const bad = rows.filter(r => r.status === 'invalid').length;
process.exit(bad > 0 ? 1 : 0);
