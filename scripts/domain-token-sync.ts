#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Options = {
  registryPath: string;
  token?: string;
  applyBunSecrets: boolean;
  emitWrangler: boolean;
  json: boolean;
};

type DomainRegistry = {
  domains?: Array<{
    domain?: string;
    tokenEnvVar?: string;
  }>;
};

type SyncResult = {
  registryPath: string;
  domainTokenVarCount: number;
  domainTokenVars: number;
  tokenPreview: string;
  applyBunSecrets: boolean;
  applyBunSecretsEnabled: boolean;
  appliedSuccess: number;
  appliedFailed: number;
  failures: Array<{ key: string; ok: boolean; detail: string }>;
  commands: {
    bunSecretsSet: string[];
    wranglerSecretPut: string[];
  };
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    registryPath: '.search/domain-registry.json',
    token: undefined,
    applyBunSecrets: false,
    emitWrangler: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--registry') {
      out.registryPath = argv[i + 1] || out.registryPath;
      i += 1;
      continue;
    }
    if (arg === '--token') {
      out.token = argv[i + 1] || out.token;
      i += 1;
      continue;
    }
    if (arg === '--apply-bun-secrets') {
      out.applyBunSecrets = true;
      continue;
    }
    if (arg === '--emit-wrangler') {
      out.emitWrangler = true;
      continue;
    }
    if (arg === '--json') {
      out.json = true;
      continue;
    }
  }
  return out;
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function isPlaceholderToken(value: string): boolean {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return true;
  return (
    normalized === 'replace_me' ||
    normalized === 'changeme' ||
    normalized === 'your_token_here' ||
    normalized === 'your-token-here'
  );
}

function readTokenEnvVars(payload: DomainRegistry): string[] {
  const vars = new Set<string>();
  for (const row of payload.domains || []) {
    const key = normalizeText(row?.tokenEnvVar);
    if (key) vars.add(key);
  }
  return [...vars];
}

function maskToken(token: string): string {
  if (token.length < 8) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function printStructuredError(
  code: string,
  message: string,
  options: Options,
  extra: Record<string, unknown> = {}
): never {
  const payload = {
    ok: false,
    code,
    message,
    ...extra,
  };
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.error(`[domain-token-sync] ${code}: ${message}`);
    if (extra.hint) {
      console.error(`Hint: ${String(extra.hint)}`);
    }
  }
  switch (code) {
    case 'missing_token':
      process.exit(2);
    case 'placeholder_token':
      process.exit(3);
    case 'missing_token_env_vars':
      process.exit(4);
    case 'bun_secrets_unavailable':
      process.exit(5);
    default:
      process.exit(1);
  }
}

function runBunSecretsSet(key: string, token: string): { ok: boolean; detail: string } {
  const proc = Bun.spawnSync(['bun', 'secrets', 'set', key, token], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (proc.exitCode === 0) {
    return { ok: true, detail: `set ${key}` };
  }
  const err = new TextDecoder().decode(proc.stderr || new Uint8Array()).trim();
  const out = new TextDecoder().decode(proc.stdout || new Uint8Array()).trim();
  return { ok: false, detail: err || out || `failed set ${key}` };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const registryPath = resolve(options.registryPath);
  const payload = JSON.parse(await readFile(registryPath, 'utf8')) as DomainRegistry;
  const tokenEnvVars = readTokenEnvVars(payload);
  const token = normalizeText(options.token || Bun.env.FACTORY_WAGER_TOKEN);

  if (!token) {
    printStructuredError(
      'missing_token',
      'No token provided.',
      options,
      { hint: 'Pass --token <value> or set FACTORY_WAGER_TOKEN.' }
    );
  }
  if (isPlaceholderToken(token)) {
    printStructuredError(
      'placeholder_token',
      'Token is placeholder and cannot be applied.',
      options,
      { hint: 'Set FACTORY_WAGER_TOKEN to a real secret before applying.' }
    );
  }
  if (tokenEnvVars.length === 0) {
    printStructuredError(
      'missing_token_env_vars',
      'No token environment variables found in registry.',
      options,
      {
        registryPath,
        hint: 'Ensure .search/domain-registry.json has tokenEnvVar for each domain entry.',
      }
    );
  }
  if (options.applyBunSecrets && !Bun.which('bun')) {
    printStructuredError(
      'bun_secrets_unavailable',
      'Bun executable is unavailable in PATH.',
      options,
      { hint: 'Install Bun or run from an environment where `bun` is available.' }
    );
  }

  const bunCommands = tokenEnvVars.map((key) => `bun secrets set ${key} <token>`);
  const wranglerCommands = tokenEnvVars.map((key) => `wrangler secret put ${key}`);

  const applied = options.applyBunSecrets
    ? tokenEnvVars.map((key) => ({ key, ...runBunSecretsSet(key, token) }))
    : [];
  const appliedFailures = applied.filter((row) => !row.ok);

  const result: SyncResult = {
    registryPath,
    domainTokenVarCount: tokenEnvVars.length,
    domainTokenVars: tokenEnvVars.length,
    tokenPreview: maskToken(token),
    applyBunSecrets: options.applyBunSecrets,
    applyBunSecretsEnabled: options.applyBunSecrets,
    appliedSuccess: applied.filter((row) => row.ok).length,
    appliedFailed: appliedFailures.length,
    failures: appliedFailures,
    commands: {
      bunSecretsSet: bunCommands,
      wranglerSecretPut: options.emitWrangler ? wranglerCommands : [],
    },
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Domain token vars: ${tokenEnvVars.length}`);
    console.log(`Token: ${result.tokenPreview}`);
    if (options.applyBunSecrets) {
      console.log(`Applied to Bun secrets: ${result.appliedSuccess}/${tokenEnvVars.length}`);
      if (result.appliedFailed > 0) {
        console.log('Failures:');
        for (const fail of appliedFailures) console.log(`- ${fail.key}: ${fail.detail}`);
      }
    } else {
      console.log('Dry run (no writes). Use --apply-bun-secrets to apply.');
    }
    if (options.emitWrangler) {
      console.log('Wrangler commands:');
      for (const cmd of wranglerCommands) console.log(`- ${cmd}`);
    }
  }

  process.exit(appliedFailures.length > 0 ? 1 : 0);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[domain-token-sync] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
