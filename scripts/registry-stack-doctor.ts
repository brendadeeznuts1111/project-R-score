#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Options = {
  fix: boolean;
  json: boolean;
  envFile: string;
  npmrcFile: string;
  registryConfigFile: string;
};

type Check = {
  id: string;
  ok: boolean;
  detail: string;
};

const CANONICAL_REGISTRY_URL = 'https://registry.factory-wager.com';
const CDN_REGISTRY_URL = 'https://registry.factory-wager.com';
const DEFAULT_R2_BUCKET = 'npm-registry';

function parseArgs(argv: string[]): Options {
  const out: Options = {
    fix: false,
    json: false,
    envFile: '.env.registry',
    npmrcFile: '.npmrc',
    registryConfigFile: 'registry.config.json5',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fix') {
      out.fix = true;
      continue;
    }
    if (arg === '--json') {
      out.json = true;
      continue;
    }
    if (arg === '--env-file') {
      out.envFile = argv[i + 1] || out.envFile;
      i += 1;
      continue;
    }
    if (arg === '--npmrc-file') {
      out.npmrcFile = argv[i + 1] || out.npmrcFile;
      i += 1;
      continue;
    }
    if (arg === '--registry-config') {
      out.registryConfigFile = argv[i + 1] || out.registryConfigFile;
      i += 1;
      continue;
    }
  }
  return out;
}

function canonicalRegistryConfigText(): string {
  return `// FactoryWager registry baseline (permanent repo config)
{
  name: "FactoryWager Private Registry",
  url: "${CANONICAL_REGISTRY_URL}",
  storage: {
    type: "r2",
    bucket: "${DEFAULT_R2_BUCKET}",
    prefix: "packages/",
  },
  cdn: {
    enabled: true,
    url: "${CDN_REGISTRY_URL}",
    signedUrls: false,
    expirySeconds: 3600,
  },
  auth: {
    type: "jwt",
    tokenExpiry: "7d",
  },
  packages: [
    {
      pattern: "@factory-wager/*",
      access: "authenticated",
      publish: ["admin", "developer"],
    },
    {
      pattern: "@factorywager/*",
      access: "authenticated",
      publish: ["admin", "developer"],
    },
    {
      pattern: "*",
      access: "all",
    },
  ],
}
`;
}

function canonicalNpmrcBlock(): string {
  return `@factory-wager:registry=${CANONICAL_REGISTRY_URL}/
@factorywager:registry=${CANONICAL_REGISTRY_URL}/
//registry.factory-wager.com/:_authToken=\${FACTORY_WAGER_TOKEN}
//registry.factory-wager.com/:always-auth=true
`;
}

async function ensureRegistryConfig(path: string, fix: boolean): Promise<Check> {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    if (!fix) return { id: 'registry_config_exists', ok: false, detail: `missing ${abs}` };
    await writeFile(abs, canonicalRegistryConfigText(), 'utf8');
    return { id: 'registry_config_exists', ok: true, detail: `created ${abs}` };
  }
  const text = await readFile(abs, 'utf8');
  const hasCanonicalUrl = text.includes(`url: "${CANONICAL_REGISTRY_URL}"`) || text.includes(`"url": "${CANONICAL_REGISTRY_URL}"`);
  const hasR2Bucket = text.includes(`bucket: "${DEFAULT_R2_BUCKET}"`) || text.includes(`"bucket": "${DEFAULT_R2_BUCKET}"`);
  if (hasCanonicalUrl && hasR2Bucket) {
    return { id: 'registry_config_canonical', ok: true, detail: abs };
  }
  if (!fix) {
    return { id: 'registry_config_canonical', ok: false, detail: `non-canonical values in ${abs}` };
  }
  await writeFile(abs, canonicalRegistryConfigText(), 'utf8');
  return { id: 'registry_config_canonical', ok: true, detail: `rewrote ${abs}` };
}

async function ensureEnv(path: string, fix: boolean): Promise<Check> {
  const abs = resolve(path);
  const required: Array<[string, string]> = [
    ['REGISTRY_URL', CANONICAL_REGISTRY_URL],
    ['R2_REGISTRY_BUCKET', DEFAULT_R2_BUCKET],
    ['REGISTRY_CDN_URL', CDN_REGISTRY_URL],
  ];
  const raw = existsSync(abs) ? await readFile(abs, 'utf8') : '';
  const missing = required.filter(([k]) => !new RegExp(`^${k}=`, 'm').test(raw));
  if (missing.length === 0) return { id: 'registry_env', ok: true, detail: `${abs} has required keys` };
  if (!fix) {
    return { id: 'registry_env', ok: false, detail: `missing keys in ${abs}: ${missing.map(([k]) => k).join(', ')}` };
  }
  const dir = resolve(abs, '..');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const append = missing.map(([k, v]) => `${k}=${v}`).join('\n');
  const next = `${raw}${raw && !raw.endsWith('\n') ? '\n' : ''}\n# Registry stack defaults (doctor --fix)\n${append}\n`;
  await writeFile(abs, next, 'utf8');
  return { id: 'registry_env', ok: true, detail: `added ${missing.length} keys to ${abs}` };
}

async function ensureNpmrc(path: string, fix: boolean): Promise<Check> {
  const abs = resolve(path);
  const block = canonicalNpmrcBlock();
  const raw = existsSync(abs) ? await readFile(abs, 'utf8') : '';
  const hasScopeA = raw.includes(`@factory-wager:registry=${CANONICAL_REGISTRY_URL}/`);
  const hasScopeB = raw.includes(`@factorywager:registry=${CANONICAL_REGISTRY_URL}/`);
  const hasAuth = raw.includes(`//registry.factory-wager.com/:_authToken=\${FACTORY_WAGER_TOKEN}`);
  if (hasScopeA && hasScopeB && hasAuth) {
    return { id: 'npmrc_canonical', ok: true, detail: abs };
  }
  if (!fix) {
    return { id: 'npmrc_canonical', ok: false, detail: `missing canonical registry scope/auth lines in ${abs}` };
  }
  const next = `${raw}${raw && !raw.endsWith('\n') ? '\n' : ''}\n# Canonical FactoryWager registry\n${block}`;
  await writeFile(abs, next, 'utf8');
  return { id: 'npmrc_canonical', ok: true, detail: `updated ${abs}` };
}

async function checkPackagePublishConfig(): Promise<Check> {
  const pkgPath = resolve('package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as any;
  const registry = String(pkg?.publishConfig?.registry || '');
  const ok = registry === `${CANONICAL_REGISTRY_URL}/` || registry === CANONICAL_REGISTRY_URL;
  return {
    id: 'package_publish_registry',
    ok,
    detail: `publishConfig.registry=${registry || 'missing'}`,
  };
}

async function runDoctor(options: Options) {
  const checks: Check[] = [];
  checks.push(await ensureRegistryConfig(options.registryConfigFile, options.fix));
  checks.push(await ensureEnv(options.envFile, options.fix));
  checks.push(await ensureNpmrc(options.npmrcFile, options.fix));
  checks.push(await checkPackagePublishConfig());
  const ok = checks.every((c) => c.ok);
  return {
    ok,
    fixApplied: options.fix,
    canonical: {
      registryUrl: CANONICAL_REGISTRY_URL,
      cdnUrl: CDN_REGISTRY_URL,
      r2Bucket: DEFAULT_R2_BUCKET,
    },
    checks,
    nextSteps: [
      'Set FACTORY_WAGER_TOKEN in secrets manager for publish/install auth',
      'Set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY in runtime env',
      'Run: bun run registry:config && bun run registry:stats',
    ],
  };
}

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const result = await runDoctor(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Registry Stack Doctor (fix=${options.fix ? 'on' : 'off'})`);
    for (const check of result.checks) {
      console.log(`- [${check.ok ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
    }
    if (!result.ok) {
      console.log('- next:');
      for (const step of result.nextSteps) console.log(`  - ${step}`);
    }
  }
  process.exit(result.ok ? 0 : 2);
}
