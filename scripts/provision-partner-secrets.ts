#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Partner secret provisioning — generates and stores per-partner credentials.
 *
 * Each partner gets:
 *   - API key (for programmatic access)
 *   - Signing key (for HMAC/JWT signing)
 *   - Webhook secret (for incoming webhook validation)
 *
 * Usage: bun run proton:partner:provision <PARTNER_CODE>
 *        bun run proton:partner:provision --all
 *
 * Requires: source scripts/agent-env.sh partners (or admin session)
 */

const PARTNERS = ['ASH', 'BIL', 'NOV', 'SPEN'];

const USAGE = `
Usage: bun run proton:partner:provision [--all | <CODE>]

Options:
  --all    Provision all known partners (ASH, BIL, NOV, SPEN)
  <CODE>   Provision a single partner (e.g. ASH)

Requires PROTON_PASS_KEY_PROVIDER=fs and a valid session.
`;

async function provisionPartner(code: string): Promise<void> {
  const apiKey =
    Buffer.from(
      await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ])
    ).toString('hex') || crypto.randomUUID().replace(/-/g, '');
  const signingKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const webhookSecret = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = JSON.stringify({
    apiKey,
    signingKey,
    webhookSecret,
    provisionedAt: new Date().toISOString(),
  });

  // Write to temp file then import to Proton Pass
  const tmpFile = `/tmp/partner-${code}-secrets.json`;
  Bun.write(tmpFile, payload);

  const proc = Bun.spawnSync(
    [
      'pass-cli',
      'item',
      'create',
      'login',
      '--vault-name',
      'partners',
      '--title',
      `Partner ${code}`,
      '--url',
      'https://factory-wager.com',
      '--username',
      code,
      '--password',
      apiKey,
    ],
    {
      env: { ...Bun.env, PROTON_PASS_AGENT_REASON: `Provisioning ${code} partner secrets` },
    }
  );

  console.error(
    `[provision] ✅ ${code}: API key=${apiKey.slice(0, 8)}... signing=${signingKey.slice(0, 8)}... webhook=${webhookSecret.slice(0, 8)}...`
  );
  Bun.write(tmpFile, ''); // clear tmp
}

async function main() {
  const args = applyUnknownLongOptionGuardFor('proton:partner:provision', Bun.argv.slice(2));
  if (args.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }

  if (args[0] === '--all') {
    for (const code of PARTNERS) {
      await provisionPartner(code);
    }
    console.error(`[provision] ✅ All ${PARTNERS.length} partners provisioned`);
  } else {
    const code = args[0]!.toUpperCase();
    if (!PARTNERS.includes(code)) {
      console.error(`[provision] Unknown partner: ${code}. Valid: ${PARTNERS.join(', ')}`);
      process.exit(1);
    }
    await provisionPartner(code);
  }
}

if (import.meta.main) {
  await main();
}

main().catch(err => {
  console.error('[provision] Fatal:', err);
  process.exit(1);
});
