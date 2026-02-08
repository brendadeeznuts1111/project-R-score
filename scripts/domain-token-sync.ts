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
    console.error('[domain-token-sync] missing token: pass --token or set FACTORY_WAGER_TOKEN');
    process.exit(2);
  }

  const bunCommands = tokenEnvVars.map((key) => `bun secrets set ${key} <token>`);
  const wranglerCommands = tokenEnvVars.map((key) => `wrangler secret put ${key}`);

  const applied = options.applyBunSecrets
    ? tokenEnvVars.map((key) => ({ key, ...runBunSecretsSet(key, token) }))
    : [];
  const appliedFailures = applied.filter((row) => !row.ok);

  const result = {
    registryPath,
    domainTokenVars: tokenEnvVars.length,
    tokenPreview: maskToken(token),
    applyBunSecrets: options.applyBunSecrets,
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
