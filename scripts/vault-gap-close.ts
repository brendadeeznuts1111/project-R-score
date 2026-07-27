#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/secrets — Bun.secrets
/**
 * vault-gap-close.ts — close env:inventory actionable vault gaps via Proton Pass.
 *
 *   bun run vault:gap:status          # what is open / auto-mintable / human
 *   bun run vault:gap:mint            # mint random material for DOD + provision keys
 *   bun run vault:gap:wire            # append pass:// lines to env.template when items exist
 *   bun run vault:gap:close           # mint (if needed) + wire + inject check + rebaseline
 *
 * Human-only (no auto mint): OPENAI_API_KEY, SLACK_WEBHOOK_URL, TELEGRAM_CATALOG_RESEARCH_LLM_KEY
 * (LLM key is an alias of OPENAI once that is vaulted — see env-secret-policy).
 *
 * Requires: source scripts/agent-env.sh factorywager  (or pass-cli already authed)
 */
import { resolve } from 'node:path';
import { parseEnvTemplate } from './lib/env-defaults-scan.ts';
import { VAULT_REQUIRED_SECRETS } from './lib/env-secret-policy.ts';

const ROOT = resolve(import.meta.dir, '..');
const TEMPLATE = resolve(ROOT, 'env.template');
const VAULT = 'factorywager';

/** Canonical Pass login title → env key. Titles must match pass:// factorywager/<title>/password */
export const GAP_ITEMS: Array<{
  envKey: string;
  title: string;
  /** Safe to mint with pass-cli --generate-password (not third-party credentials). */
  mintable: boolean;
  note: string;
}> = [
  {
    envKey: 'DOD_PROOF_SECRET',
    title: 'DOD Proof Secret',
    mintable: true,
    note: 'HMAC material for DoD evidence packages',
  },
  {
    envKey: 'DOD_ID_ENCRYPTION_KEY',
    title: 'DOD ID Encryption Key',
    mintable: true,
    note: 'Encrypts DoD evidence ids at rest',
  },
  {
    envKey: 'PROVISION_ENCRYPTION_KEY',
    title: 'Provision Encryption Key',
    mintable: true,
    note: 'AES key material for provision-accounts credential bundles',
  },
  {
    envKey: 'OPENAI_API_KEY',
    title: 'OpenAI API Key',
    mintable: false,
    note: 'Paste from OpenAI dashboard into vault login password field',
  },
  {
    envKey: 'SLACK_WEBHOOK_URL',
    title: 'Slack Webhook URL',
    mintable: false,
    note: 'Incoming webhook URL (password field)',
  },
  {
    envKey: 'TELEGRAM_CATALOG_RESEARCH_LLM_KEY',
    title: 'Telegram Catalog Research LLM Key',
    mintable: false,
    note: 'Optional override; alias of OPENAI_API_KEY when unset — prefer vaulting OPENAI only',
  },
];

const argv = Bun.argv.slice(2);
const cmd =
  argv.find(a => !a.startsWith('-')) ??
  (argv.includes('--status')
    ? 'status'
    : argv.includes('--mint')
      ? 'mint'
      : argv.includes('--wire')
        ? 'wire'
        : argv.includes('--close')
          ? 'close'
          : 'status');

async function pass(args: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(['pass-cli', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...Bun.env,
      PROTON_PASS_AGENT_REASON:
        Bun.env.PROTON_PASS_AGENT_REASON ?? `vault-gap-close ${args.join(' ')}`,
    },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = (await proc.exited) ?? 1;
  return { code, out: `${stdout}${stderr}` };
}

async function listVaultTitles(): Promise<Set<string>> {
  const { code, out } = await pass(['item', 'list', VAULT, '--output', 'json']);
  if (code !== 0) {
    throw new Error(`pass-cli item list failed:\n${out}`);
  }
  const j = JSON.parse(out) as Array<{ title?: string }> | { items?: Array<{ title?: string }> };
  const arr = Array.isArray(j) ? j : (j.items ?? []);
  return new Set(arr.map(i => i.title).filter((t): t is string => !!t));
}

function templateHasKey(text: string, key: string): boolean {
  return parseEnvTemplate(text).vaultRefs.some(r => r.key === key);
}

function passRef(title: string): string {
  return `{{ pass://${VAULT}/${title}/password }}`;
}

async function status(): Promise<void> {
  let titles: Set<string>;
  try {
    titles = await listVaultTitles();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error('Hint: source scripts/agent-env.sh factorywager');
    process.exit(1);
  }
  const tpl = await Bun.file(TEMPLATE).text();
  console.log('== Vault gap close status ==');
  console.log(`Vault: ${VAULT}  template: env.template`);
  console.log('');
  for (const g of GAP_ITEMS) {
    const inVault = titles.has(g.title);
    const wired = templateHasKey(tpl, g.envKey);
    const flag = inVault && wired ? '✓ closed' : inVault ? '○ in vault, not wired' : '✗ missing';
    console.log(`${flag}  ${g.envKey}`);
    console.log(`         title: "${g.title}"  mintable=${g.mintable}`);
    console.log(`         ${g.note}`);
  }
  console.log('');
  console.log('Human paste (after creating login in Pass):');
  for (const g of GAP_ITEMS.filter(x => !x.mintable)) {
    console.log(
      `  pass-cli item create login --vault-name ${VAULT} --title "${g.title}" --password '…'`
    );
  }
}

async function mint(): Promise<void> {
  const titles = await listVaultTitles();
  let created = 0;
  for (const g of GAP_ITEMS.filter(x => x.mintable)) {
    if (titles.has(g.title)) {
      console.log(`· exists: ${g.title}`);
      continue;
    }
    console.log(`+ minting: ${g.title} → ${g.envKey}`);
    const { code, out } = await pass([
      'item',
      'create',
      'login',
      '--vault-name',
      VAULT,
      '--title',
      g.title,
      '--username',
      g.envKey,
      '--generate-password=48,true,true',
    ]);
    if (code !== 0) {
      console.error(
        `❌ failed to create ${g.title} (exit ${code}):\n${out || '(no output — often Killed:9 if PAT cannot create items)'}`
      );
      console.error('   Create in Proton Pass UI (factorywager vault) as login titled exactly:');
      console.error(`   "${g.title}"  then: bun run vault:gap:wire`);
      process.exit(1);
    }
    console.log(`  ✅ created`);
    created++;
  }
  console.log(created ? `Minted ${created} item(s)` : 'Nothing to mint (all mintable items exist)');
}

async function wire(): Promise<void> {
  const titles = await listVaultTitles();
  let tpl = await Bun.file(TEMPLATE).text();
  const added: string[] = [];

  // Remove old backlog comment block if present (replaced by live refs)
  const backlogMarker = '# === Vault backlog';
  if (tpl.includes(backlogMarker) && !tpl.includes('DOD_PROOF_SECRET={{')) {
    // keep backlog section until we have something to wire
  }

  const linesToAdd: string[] = [];
  for (const g of GAP_ITEMS) {
    if (templateHasKey(tpl, g.envKey)) continue;
    if (!titles.has(g.title)) {
      console.log(`· skip wire ${g.envKey} (vault item "${g.title}" missing)`);
      continue;
    }
    linesToAdd.push(`${g.envKey}=${passRef(g.title)}`);
    added.push(g.envKey);
  }

  if (linesToAdd.length === 0) {
    console.log('Nothing to wire (all existing vault items already in template, or none exist)');
    return;
  }

  const section = [
    '',
    '# === Operator secrets (Proton Pass — vault-gap-close) ===',
    ...linesToAdd,
    '',
  ].join('\n');

  // Insert before vault backlog comments or append
  if (tpl.includes(backlogMarker)) {
    tpl = tpl.replace(backlogMarker, `${section.trimEnd()}\n\n${backlogMarker}`);
  } else {
    tpl = tpl.trimEnd() + '\n' + section;
  }

  await Bun.write(TEMPLATE, tpl.endsWith('\n') ? tpl : tpl + '\n');
  console.log(`✅ wired ${added.length} key(s) into env.template:`);
  for (const k of added) console.log(`   ${k}`);
}

async function closeAll(): Promise<void> {
  await mint();
  await wire();
  // inject proof for newly wired keys only — full template may still fail on other issues
  console.log('');
  console.log('Verifying inject resolves new keys…');
  const titles = await listVaultTitles();
  const tpl = await Bun.file(TEMPLATE).text();
  const wired = GAP_ITEMS.filter(g => titles.has(g.title) && templateHasKey(tpl, g.envKey));
  if (wired.length === 0) {
    console.log('No wired keys to verify');
  } else {
    const mini = wired.map(g => `${g.envKey}=${passRef(g.title)}`).join('\n') + '\n';
    const tmpIn = `/tmp/vault-gap-${process.pid}.tpl`;
    const tmpOut = `/tmp/vault-gap-${process.pid}.env`;
    await Bun.write(tmpIn, mini);
    const { code, out } = await pass([
      'inject',
      '--in-file',
      tmpIn,
      '--out-file',
      tmpOut,
      '--force',
    ]);
    if (code !== 0) {
      console.error(`❌ inject verify failed:\n${out}`);
      process.exit(1);
    }
    // lengths only
    const body = await Bun.file(tmpOut).text();
    for (const line of body.split('\n')) {
      if (!line.includes('=')) continue;
      const [k, v] = line.split('=', 2);
      console.log(`  ✓ ${k} resolved (len=${(v ?? '').length})`);
    }
    await Bun.write(tmpOut, ''); // scrub
  }

  console.log('');
  console.log('Re-baselining inventory gaps…');
  const re = Bun.spawn(['bun', 'scripts/env-inventory.ts', '--write-baseline'], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await re.exited;
  console.log('');
  console.log('Done. Human still needed for: OPENAI_API_KEY, SLACK_WEBHOOK_URL');
  console.log('  (TELEGRAM_CATALOG_RESEARCH_LLM_KEY is optional alias of OPENAI)');
  console.log('Then: bun run proton:inject:factorywager:reasonix');
}

// Ensure VAULT_REQUIRED stays aligned (dev assert)
for (const req of VAULT_REQUIRED_SECRETS) {
  if (!GAP_ITEMS.some(g => g.envKey === req)) {
    console.warn(`policy VAULT_REQUIRED_SECRETS has ${req} not in GAP_ITEMS`);
  }
}

switch (cmd) {
  case 'status':
    await status();
    break;
  case 'mint':
    await mint();
    break;
  case 'wire':
    await wire();
    break;
  case 'close':
    await closeAll();
    break;
  default:
    console.error(`Unknown: ${cmd} (status|mint|wire|close)`);
    process.exit(1);
}
