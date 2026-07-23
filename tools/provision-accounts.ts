#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Automated account provisioning CLI.
 *
 *   bun tools/provision-accounts.ts <platform-id> <partner-ids...> --creds=user:pass:email
 *
 * Examples:
 *   # Single partner
 *   bun tools/provision-accounts.ts draftkings partner-abc --creds=jdoe:Pass123!:j@ex.com
 *
 *   # Multiple partners (--creds repeats map 1:1 to partner ids)
 *   bun tools/provision-accounts.ts fanduel p1 p2 p3 \
 *     --creds=a:pa:a@x.com \
 *     --creds=b:pb:b@x.com \
 *     --creds=c:pc:c@x.com
 *
 *   # Dry run (validate inputs, skip WebView)
 *   bun tools/provision-accounts.ts draftkings partner-abc --creds=jdoe:Pass123!:j@ex.com --dry-run
 *
 * @see ../lib/automation/provision-accounts.ts
 */
import { provisionAccounts, type CredentialBundle } from '../lib/automation/provision-accounts.ts';

function parseCreds(raw: string): CredentialBundle {
  const parts = raw.split(':');
  if (parts.length < 3) {
    console.error('--creds must be username:password:email');
    process.exit(1);
  }
  return { username: parts[0]!, password: parts[1]!, email: parts.slice(2).join(':') };
}

async function main() {
  const args = Bun.argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    console.log(`Usage: bun tools/provision-accounts.ts <platform-id> <partner-ids...> --creds=user:pass:email

Options:
  --creds=<user>:<pass>:<email>  (repeat for each partner, order = 1:1 with partner ids)
  --dry-run                       Validate inputs without launching WebView
  --show                          Show WebView window (default: headless)
  --db=<path>                     Override DB path (default: data/operations.db)
  --key=<material>                Encryption key override (default: PROVISION_ENCRYPTION_KEY)
  --timeout=<ms>                  Per-account timeout (default: 30000)

Examples:
  bun tools/provision-accounts.ts draftkings partner-abc --creds=jdoe:Pass123!:j@ex.com
  bun tools/provision-accounts.ts fanduel p1 p2 --creds=a:x:a@x.com --creds=b:y:b@x.com`);
    process.exit(0);
  }

  const platformId = args[0]!;
  const nonFlagArgs = args.filter(a => !a.startsWith('--'));
  const partnerIds = nonFlagArgs.slice(1);

  const credsFlags = args.filter(a => a.startsWith('--creds=')).map(a => a.slice(8));
  const dryRun = args.includes('--dry-run');
  const headless = !args.includes('--show');
  const dbPath = args.find(a => a.startsWith('--db='))?.slice(5) ?? 'data/operations.db';
  const encryptionKey = args.find(a => a.startsWith('--key='))?.slice(6);
  const timeout = Number(args.find(a => a.startsWith('--timeout='))?.slice(10) ?? '30000');

  if (!partnerIds.length) {
    console.error('❌ Provide at least one partner-id');
    process.exit(1);
  }

  if (credsFlags.length !== partnerIds.length) {
    console.error(`❌ Need ${partnerIds.length} --creds flag(s) (got ${credsFlags.length})`);
    process.exit(1);
  }

  const credentials = credsFlags.map(parseCreds);

  if (dryRun) {
    console.log('🔍 Dry run — validating inputs:');
    console.log(`  Platform: ${platformId}`);
    console.log(`  Partners: ${partnerIds.join(', ')}`);
    console.log(`  Credentials: ${credentials.map(c => `${c.username} <${c.email}>`).join(', ')}`);
    console.log(`  DB: ${dbPath}`);
    console.log('✅ Dry run passed — would provision', partnerIds.length, 'accounts');
    process.exit(0);
  }

  console.log(`🚀 Provisioning ${partnerIds.length} account(s) on "${platformId}"...`);

  const results = await provisionAccounts({
    platformId,
    partnerIds,
    credentials,
    dbPath,
    encryptionKey,
    headless,
    timeout,
  });

  const ok = results.filter(r => r.success);
  const fail = results.filter(r => !r.success);

  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(
      `  ${icon} ${r.partnerId} (${r.username}) — ${r.durationMs}ms${r.error ? ` — ${r.error}` : ''}`
    );
  }

  console.log(`\n${ok.length}/${results.length} accounts created`);

  if (fail.length > 0) process.exit(1);
}

if (import.meta.main) {
  await main();
}
