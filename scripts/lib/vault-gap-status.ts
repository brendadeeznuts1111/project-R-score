// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Shared vault-gap status — used by vault:gap:status, secret-ratchet tests, vault CLI.
 */
// Sync fs for baseline/template probes in test/CLI paths (Bun.file is async-only).
// eslint-disable-next-line no-restricted-imports -- sync gap list for bun:test + status
import { existsSync, readFileSync } from 'node:fs';

import { joinPath } from '../../lib/path-bun.ts';
import {
  isMintableSecretKey,
  listMintedSecretKeys,
  mintedSecretPath,
  MINTABLE_SECRET_KEYS,
} from '../../lib/security/mintable-secret.ts';
import { parseEnvTemplate } from './env-defaults-scan.ts';
import {
  RUNTIME_MINTABLE_SECRETS,
  SECRET_ALIASES,
  VAULT_REQUIRED_SECRETS,
} from './env-secret-policy.ts';

export interface VaultGapItem {
  envKey: string;
  title: string;
  mintable: boolean;
  note: string;
}

const vaultGapItemCatalog: VaultGapItem[] = [
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
    envKey: 'PLAY_SIGNING_SECRET',
    title: 'Play Signing Secret',
    mintable: true,
    note: 'Play HMAC (PlaySigner) — local mint or Pass',
  },
  {
    envKey: 'REPORT_SIGNING_SECRET',
    title: 'Report Signing Secret',
    mintable: true,
    note: 'Board/deep-audit HMAC — local mint or Pass',
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

export function listVaultGapItems(): VaultGapItem[] {
  return vaultGapItemCatalog;
}

const ROOT = joinPath(import.meta.dir, '..', '..');
const TEMPLATE = joinPath(ROOT, 'env.template');
const BASELINE = joinPath(ROOT, 'scripts', 'env-secret-gap-baseline.json');

export interface VaultGapReport {
  generatedAt: string;
  passCli: { available: boolean; itemCount: number | null };
  localMinted: string[];
  mintable: {
    keys: string[];
    resolved: string[];
    preResolved: string[];
    wouldMint: string[];
  };
  human: {
    required: string[];
    open: string[];
    baseline: string[];
    newGaps: string[];
    closed: string[];
  };
  items: {
    envKey: string;
    title: string;
    mintable: boolean;
    flag: 'vault+env' | 'env' | 'local-mint' | 'would-mint' | 'open' | 'template-only';
    note: string;
  }[];
}

function envSet(key: string): boolean {
  return !!Bun.env[key]?.trim();
}

function localMintExists(key: string): boolean {
  try {
    const p = mintedSecretPath(key);
    if (!existsSync(p)) return false;
    return readFileSync(p, 'utf8').trim().length > 0;
  } catch {
    return false;
  }
}

function templateVaultKeys(): Set<string> {
  try {
    if (!existsSync(TEMPLATE)) return new Set();
    const text = readFileSync(TEMPLATE, 'utf8');
    return new Set(parseEnvTemplate(text).vaultRefs.map(r => r.key));
  } catch {
    return new Set();
  }
}

function loadBaseline(): string[] {
  try {
    if (!existsSync(BASELINE)) return [...VAULT_REQUIRED_SECRETS];
    const j = JSON.parse(readFileSync(BASELINE, 'utf8')) as { actionableVaultGaps?: string[] };
    return Array.isArray(j.actionableVaultGaps)
      ? j.actionableVaultGaps
      : [...VAULT_REQUIRED_SECRETS];
  } catch {
    return [...VAULT_REQUIRED_SECRETS];
  }
}

/** Human secrets that still need vault/env (not machine-mintable). */
export function getHumanOpenGaps(): string[] {
  const vaulted = templateVaultKeys();
  const open: string[] = [];
  for (const key of VAULT_REQUIRED_SECRETS) {
    if (envSet(key) || vaulted.has(key)) continue;
    const aliasFills = Object.entries(SECRET_ALIASES).some(
      ([alias, target]) => target === key && envSet(alias)
    );
    if (aliasFills) continue;
    open.push(key);
  }
  return open.sort();
}

/** Mintable keys with neither env nor local file (first call would mint). */
export function getMintableWouldMint(): string[] {
  return MINTABLE_SECRET_KEYS.filter(
    k =>
      (RUNTIME_MINTABLE_SECRETS as readonly string[]).includes(k) &&
      !envSet(k) &&
      !localMintExists(k)
  );
}

/**
 * Blocking continuous-validation gaps.
 * Non-strict: only NEW human gaps beyond baseline.
 * Strict (SECRET_RATCHET_STRICT=1): all human open.
 */
export function getGapList(opts?: { strict?: boolean }): string[] {
  const strict =
    opts?.strict === true ||
    Bun.env.SECRET_RATCHET_STRICT === '1' ||
    Bun.env.SECRET_RATCHET_STRICT === 'true';
  const humanOpen = getHumanOpenGaps();
  if (strict) return humanOpen;
  const baseline = new Set(loadBaseline());
  return humanOpen.filter(g => !baseline.has(g));
}

export async function probePassCli(): Promise<{ available: boolean; itemCount: number | null }> {
  try {
    const proc = Bun.spawn(['pass-cli', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const code = (await proc.exited) ?? 1;
    if (code !== 0) return { available: false, itemCount: null };

    const list = Bun.spawn(['pass-cli', 'item', 'list', 'factorywager', '--output', 'json'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...Bun.env,
        PROTON_PASS_AGENT_REASON: Bun.env.PROTON_PASS_AGENT_REASON ?? 'vault-gap-status probe',
      },
    });
    const out = await new Response(list.stdout).text();
    const listCode = (await list.exited) ?? 1;
    if (listCode !== 0) return { available: true, itemCount: null };
    const j = JSON.parse(out) as unknown;
    const arr = Array.isArray(j) ? j : ((j as { items?: unknown[] }).items ?? []);
    return { available: true, itemCount: arr.length };
  } catch {
    return { available: false, itemCount: null };
  }
}

export async function getVaultGapReport(): Promise<VaultGapReport> {
  const passCli = await probePassCli();
  const localMinted = listMintedSecretKeys();
  const vaulted = templateVaultKeys();
  const baseline = loadBaseline();
  const humanOpen = getHumanOpenGaps();
  const baselineSet = new Set(baseline);
  const newGaps = humanOpen.filter(g => !baselineSet.has(g));
  const closed = baseline.filter(g => !humanOpen.includes(g));

  const mintKeys = MINTABLE_SECRET_KEYS.filter(k =>
    (RUNTIME_MINTABLE_SECRETS as readonly string[]).includes(k)
  );
  const preResolved = mintKeys.filter(k => envSet(k) || localMintExists(k));
  const wouldMint = mintKeys.filter(k => !envSet(k) && !localMintExists(k));

  const items = listVaultGapItems().map(g => {
    let flag: VaultGapReport['items'][0]['flag'] = 'open';
    if (envSet(g.envKey) && vaulted.has(g.envKey)) flag = 'vault+env';
    else if (envSet(g.envKey)) flag = 'env';
    else if (g.mintable && localMintExists(g.envKey)) flag = 'local-mint';
    else if (g.mintable) flag = 'would-mint';
    else if (vaulted.has(g.envKey)) flag = 'template-only';
    return { envKey: g.envKey, title: g.title, mintable: g.mintable, flag, note: g.note };
  });

  return {
    generatedAt: new Date().toISOString(),
    passCli,
    localMinted,
    mintable: {
      keys: [...mintKeys],
      resolved: preResolved,
      preResolved,
      wouldMint,
    },
    human: {
      required: [...VAULT_REQUIRED_SECRETS],
      open: humanOpen,
      baseline,
      newGaps,
      closed,
    },
    items,
  };
}

export function secretRatchetOk(report?: { human: { newGaps: string[] } }): boolean {
  return (report?.human.newGaps.length ?? getGapList().length) === 0;
}

export function isMintableKey(key: string): boolean {
  return isMintableSecretKey(key);
}
