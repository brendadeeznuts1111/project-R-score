// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Machine-local mintable secrets — bridge when Proton Pass create is unavailable.
 *
 * Resolution order:
 *   1. Bun.env[KEY] (from pass-cli inject / process env)
 *   2. ~/.factorywager/minted-secrets/<KEY> (chmod 600)
 *   3. Mint random material, persist, return
 *
 * Export to Proton Pass when ready:
 *   bun run vault:gap:export-minted
 *
 * Prefer vault inject for multi-host SSOT. Local mint is single-machine continuity.
 */
// Sync fs required: requireSecret / constructors are synchronous; Bun.file is async-only.
// eslint-disable-next-line no-restricted-imports -- machine-local mint needs sync read/write
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { joinPath } from '../path-bun.ts';

const MINT_DIR_ENV = 'FACTORYWAGER_MINTED_SECRETS_DIR';

/** Keys that may be machine-minted (not third-party credentials). */
export const MINTABLE_SECRET_KEYS = [
  'DOD_PROOF_SECRET',
  'DOD_ID_ENCRYPTION_KEY',
  'PROVISION_ENCRYPTION_KEY',
  'PLAY_SIGNING_SECRET',
  /** Report/board integrity HMAC (portal bake + deep-audit). */
  'REPORT_SIGNING_SECRET',
] as const;

export type MintableSecretKey = (typeof MINTABLE_SECRET_KEYS)[number];

export function isMintableSecretKey(key: string): key is MintableSecretKey {
  return (MINTABLE_SECRET_KEYS as readonly string[]).includes(key);
}

export function mintedSecretsDir(): string {
  const override = Bun.env[MINT_DIR_ENV]?.trim();
  if (override) return override;
  const home = Bun.env.HOME?.trim() || Bun.env.USERPROFILE?.trim() || '.';
  return joinPath(home, '.factorywager', 'minted-secrets');
}

export function mintedSecretPath(envKey: string): string {
  if (!/^[A-Z][A-Z0-9_]*$/.test(envKey)) {
    throw new Error(`mintable-secret: invalid key ${envKey}`);
  }
  return joinPath(mintedSecretsDir(), envKey);
}

function mintHex(byteLen: number): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

export type ResolveMintableOpts = {
  /** Random bytes (hex length = 2×). Default 32 → 64 hex chars. */
  bytes?: number;
  /** Dev-only known string when minting is disabled. */
  devFallback?: string;
  /** Allow mint when NODE_ENV=production (default true for machine-local keys). */
  allowMintInProduction?: boolean;
  /** If true, never mint — throw or devFallback only. */
  noMint?: boolean;
};

/**
 * Sync secret resolution for mintable material.
 * Does not replace Proton Pass — inject still wins when env is set.
 */
export function requireMintableSecret(envKey: string, opts: ResolveMintableOpts = {}): string {
  const fromEnv = Bun.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  const path = mintedSecretPath(envKey);
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8').trim();
    if (raw.length > 0) return raw;
  }

  const isProd = Bun.env.NODE_ENV === 'production';
  const allowMint = opts.noMint ? false : opts.allowMintInProduction !== false || !isProd;

  if (!allowMint) {
    if (opts.devFallback && !isProd) {
      console.warn(`⚠️  ${envKey} unset — using dev fallback (mint disabled).`);
      return opts.devFallback;
    }
    throw new Error(
      `${envKey} missing (no env, no ${path}). Set via proton inject or: bun run vault:gap:mint-local`
    );
  }

  const value = mintHex(opts.bytes ?? 32);
  const dir = mintedSecretsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dir, 0o700);
  } catch {
    // best-effort on platforms that ignore mode
  }
  writeFileSync(path, `${value}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // best-effort
  }
  console.warn(
    `🔐 Minted ${envKey} → ${path} (machine-local). Export to Proton Pass: bun run vault:gap:export-minted`
  );
  return value;
}

/** List minted keys present on disk (no values). */
export function listMintedSecretKeys(): string[] {
  const dir = mintedSecretsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(n => /^[A-Z][A-Z0-9_]*$/.test(n))
    .sort();
}

/** Read one minted value (for export tooling only — never log). */
export function readMintedSecret(envKey: string): string | undefined {
  const path = mintedSecretPath(envKey);
  if (!existsSync(path)) return undefined;
  const raw = readFileSync(path, 'utf8').trim();
  return raw.length > 0 ? raw : undefined;
}

/** Ensure all default mintable keys exist on disk (lengths only returned). */
export function mintLocalAll(keys: readonly string[] = MINTABLE_SECRET_KEYS): {
  key: string;
  path: string;
  created: boolean;
  len: number;
}[] {
  const out: { key: string; path: string; created: boolean; len: number }[] = [];
  for (const key of keys) {
    const path = mintedSecretPath(key);
    const existed = existsSync(path) && readFileSync(path, 'utf8').trim().length > 0;
    const value = requireMintableSecret(key, { bytes: 32 });
    out.push({ key, path, created: !existed, len: value.length });
  }
  return out;
}
