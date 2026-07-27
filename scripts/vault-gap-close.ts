#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/secrets — Bun.secrets
/**
 * vault-gap-close.ts — close env vault gaps (Proton Pass + machine-local mint).
 *
 *   bun run vault:gap:status          # open / mintable / human (offline-capable)
 *   bun run vault:gap:mint-local      # mint DOD+provision into ~/.factorywager/minted-secrets
 *   bun run vault:gap:export-minted   # print pass-cli create commands (values redacted unless --show)
 *   bun run vault:gap:mint            # Pass CLI create (needs create-capable PAT)
 *   bun run vault:gap:wire            # env.template pass:// when Pass items exist
 *   bun run vault:gap:close           # mint-local + optional wire + rebaseline
 *
 * Human-only: OPENAI_API_KEY, SLACK_WEBHOOK_URL
 * LLM key alias → OPENAI (env-secret-policy)
 *
 * Note: pass-cli may be Killed:9 in restricted agent hosts — use mint-local path.
 */
import { resolve } from 'node:path';
import {
  listMintedSecretKeys,
  mintLocalAll,
  mintedSecretPath,
  readMintedSecret,
  MINTABLE_SECRET_KEYS,
} from '../lib/security/mintable-secret.ts';
import { parseEnvTemplate } from './lib/env-defaults-scan.ts';
import { RUNTIME_MINTABLE_SECRETS, VAULT_REQUIRED_SECRETS } from './lib/env-secret-policy.ts';

const ROOT = resolve(import.meta.dir, '..');
const TEMPLATE = resolve(ROOT, 'env.template');
const VAULT = 'factorywager';

export const GAP_ITEMS: Array<{
  envKey: string;
  title: string;
  mintable: boolean;
  note: string;
}> = [
  {
    envKey: 'DOD_PROOF_SECRET',
    title: 'DOD Proof Secret',
    mintable: true,
    note: 'HMAC material — local mint or Pass',
  },
  {
    envKey: 'DOD_ID_ENCRYPTION_KEY',
    title: 'DOD ID Encryption Key',
    mintable: true,
    note: 'DoD id encryption — local mint or Pass',
  },
  {
    envKey: 'PROVISION_ENCRYPTION_KEY',
    title: 'Provision Encryption Key',
    mintable: true,
    note: 'Provision AES material — local mint or Pass',
  },
  {
    envKey: 'OPENAI_API_KEY',
    title: 'OpenAI API Key',
    mintable: false,
    note: 'Paste from OpenAI dashboard',
  },
  {
    envKey: 'SLACK_WEBHOOK_URL',
    title: 'Slack Webhook URL',
    mintable: false,
    note: 'Incoming webhook URL',
  },
];

const argv = Bun.argv.slice(2);
const SHOW = argv.includes('--show');
const cmd =
  argv.find(a => !a.startsWith('-')) ??
  (argv.includes('--status')
    ? 'status'
    : argv.includes('--mint-local')
      ? 'mint-local'
      : argv.includes('--export-minted')
        ? 'export-minted'
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

async function tryListVaultTitles(): Promise<Set<string> | null> {
  try {
    const { code, out } = await pass(['item', 'list', VAULT, '--output', 'json']);
    if (code !== 0) return null;
    const j = JSON.parse(out) as Array<{ title?: string }> | { items?: Array<{ title?: string }> };
    const arr = Array.isArray(j) ? j : (j.items ?? []);
    return new Set(arr.map(i => i.title).filter((t): t is string => !!t));
  } catch {
    return null;
  }
}

function templateHasKey(text: string, key: string): boolean {
  return parseEnvTemplate(text).vaultRefs.some(r => r.key === key);
}

function passRef(title: string): string {
  return `{{ pass://${VAULT}/${title}/password }}`;
}

async function status(): Promise<void> {
  const titles = await tryListVaultTitles();
  const tpl = await Bun.file(TEMPLATE).text();
  const minted = new Set(listMintedSecretKeys());

  console.log('== Vault gap close status ==');
  console.log(`Vault: ${VAULT}  template: env.template`);
  console.log(
    `pass-cli: ${titles ? `ok (${titles.size} items)` : 'UNAVAILABLE (offline / Killed:9)'}`
  );
  console.log(`local minted: ${[...minted].join(', ') || '(none)'}`);
  console.log('');

  for (const g of GAP_ITEMS) {
    const inVault = titles?.has(g.title) ?? false;
    const wired = templateHasKey(tpl, g.envKey);
    const local = minted.has(g.envKey);
    let flag = '✗ open';
    if (inVault && wired) flag = '✓ vault+template';
    else if (inVault) flag = '○ in vault, not wired';
    else if (local && g.mintable) flag = '◆ local mint (export to Pass when ready)';
    else if (g.mintable) flag = '· mintable (run vault:gap:mint-local)';
    console.log(`${flag}  ${g.envKey}`);
    console.log(`         title: "${g.title}"`);
    console.log(`         ${g.note}`);
  }

  console.log('');
  console.log('Human paste still required (ratchet):');
  for (const k of VAULT_REQUIRED_SECRETS) console.log(`  · ${k}`);
  console.log('Runtime-mintable (not ratchet-blocking):');
  for (const k of RUNTIME_MINTABLE_SECRETS) console.log(`  · ${k}`);
  console.log('');
  console.log('Next: bun run vault:gap:mint-local && bun run vault:gap:export-minted');
}

function mintLocal(): void {
  console.log('== Machine-local mint → ~/.factorywager/minted-secrets ==');
  const keys = MINTABLE_SECRET_KEYS.filter(k =>
    (RUNTIME_MINTABLE_SECRETS as readonly string[]).includes(k)
  );
  const results = mintLocalAll(keys);
  for (const r of results) {
    console.log(`  ${r.created ? '+' : '·'} ${r.key}  len=${r.len}  ${r.path}`);
  }
  console.log('');
  console.log('Runtime will pick these up via requireMintableSecret / requireSecret.');
  console.log('Export to Pass: bun run vault:gap:export-minted');
}

function exportMinted(): void {
  const keys = listMintedSecretKeys();
  if (keys.length === 0) {
    console.log('No minted secrets. Run: bun run vault:gap:mint-local');
    return;
  }
  console.log('== Export minted → Proton Pass (run in an unrestricted terminal) ==');
  console.log(`# vault: ${VAULT}`);
  console.log('# source scripts/agent-env.sh factorywager');
  console.log('');
  for (const key of keys) {
    const item = GAP_ITEMS.find(g => g.envKey === key);
    const title = item?.title ?? key.replace(/_/g, ' ');
    const value = readMintedSecret(key);
    if (!value) continue;
    if (SHOW) {
      console.log(
        `pass-cli item create login --vault-name ${VAULT} --title "${title}" --username ${key} --password '${value}'`
      );
    } else {
      console.log(
        `pass-cli item create login --vault-name ${VAULT} --title "${title}" --username ${key} --password "$(cat ${mintedSecretPath(key)})"`
      );
    }
  }
  if (!SHOW) {
    console.log('');
    console.log('# Values redacted. Re-run with --show to embed passwords (dangerous in logs).');
  }
  console.log('');
  console.log('Then: bun run vault:gap:wire && bun run env:inventory:baseline');
}

async function mintPass(): Promise<void> {
  const titles = await tryListVaultTitles();
  if (!titles) {
    console.error('pass-cli unavailable — use: bun run vault:gap:mint-local');
    process.exit(1);
  }
  let created = 0;
  for (const g of GAP_ITEMS.filter(x => x.mintable)) {
    if (titles.has(g.title)) {
      console.log(`· exists: ${g.title}`);
      continue;
    }
    const local = readMintedSecret(g.envKey);
    const args = [
      'item',
      'create',
      'login',
      '--vault-name',
      VAULT,
      '--title',
      g.title,
      '--username',
      g.envKey,
    ];
    if (local) {
      args.push('--password', local);
    } else {
      args.push('--generate-password=48,true,true');
    }
    console.log(`+ minting Pass: ${g.title}`);
    const { code, out } = await pass(args);
    if (code !== 0) {
      console.error(`❌ failed (exit ${code}): ${out || '(no output — often Killed:9)'}`);
      console.error('   Fallback: bun run vault:gap:mint-local');
      process.exit(1);
    }
    console.log('  ✅ created');
    created++;
  }
  console.log(created ? `Minted ${created} Pass item(s)` : 'Nothing to mint');
}

async function wire(): Promise<void> {
  const titles = await tryListVaultTitles();
  if (!titles) {
    console.error('pass-cli unavailable — cannot verify vault items for wire');
    console.error('Create logins in Pass UI, fix pass-cli, then re-run vault:gap:wire');
    process.exit(1);
  }
  let tpl = await Bun.file(TEMPLATE).text();
  const linesToAdd: string[] = [];
  const added: string[] = [];
  for (const g of GAP_ITEMS) {
    if (templateHasKey(tpl, g.envKey)) continue;
    if (!titles.has(g.title)) {
      console.log(`· skip ${g.envKey} (no vault item "${g.title}")`);
      continue;
    }
    linesToAdd.push(`${g.envKey}=${passRef(g.title)}`);
    added.push(g.envKey);
  }
  if (linesToAdd.length === 0) {
    console.log('Nothing to wire');
    return;
  }
  const section = [
    '',
    '# === Operator secrets (Proton Pass — vault-gap-close) ===',
    ...linesToAdd,
    '',
  ].join('\n');
  const backlogMarker = '# === Vault backlog';
  if (tpl.includes(backlogMarker)) {
    tpl = tpl.replace(backlogMarker, `${section.trimEnd()}\n\n${backlogMarker}`);
  } else {
    tpl = tpl.trimEnd() + '\n' + section;
  }
  await Bun.write(TEMPLATE, tpl.endsWith('\n') ? tpl : `${tpl}\n`);
  console.log(`✅ wired ${added.length} key(s): ${added.join(', ')}`);
}

async function closeAll(): Promise<void> {
  mintLocal();
  console.log('');
  const titles = await tryListVaultTitles();
  if (titles) {
    try {
      await mintPass();
      await wire();
    } catch (e) {
      console.warn('Pass path skipped:', e instanceof Error ? e.message : e);
    }
  } else {
    console.log('pass-cli offline — local mint only. Export when Pass works:');
    console.log('  bun run vault:gap:export-minted');
  }
  console.log('');
  console.log('Re-baselining inventory…');
  const re = Bun.spawn(['bun', 'scripts/env-inventory.ts', '--write-baseline'], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await re.exited;
  console.log('Done. Human still needed: OPENAI_API_KEY, SLACK_WEBHOOK_URL');
}

switch (cmd) {
  case 'status':
    await status();
    break;
  case 'mint-local':
    mintLocal();
    break;
  case 'export-minted':
    exportMinted();
    break;
  case 'mint':
    await mintPass();
    break;
  case 'wire':
    await wire();
    break;
  case 'close':
    await closeAll();
    break;
  default:
    console.error(`Unknown: ${cmd}`);
    process.exit(1);
}
