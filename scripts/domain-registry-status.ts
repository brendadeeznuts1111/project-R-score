#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadDomainRegistry, resolveDomainRegistry } from './lib/domain-registry';

type Options = {
  registryPath?: string;
  latestPath: string;
  healthReportPath: string;
  envFile: string;
  json: boolean;
  doctor: boolean;
  fix: boolean;
  emitSecretsCommands: boolean;
};

type HealthRow = {
  domain: string;
  status: string;
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    registryPath: Bun.env.DOMAIN_REGISTRY_PATH,
    latestPath: 'reports/search-benchmark/latest.json',
    healthReportPath: 'reports/health-report.json',
    envFile: '.env.factory-wager',
    json: false,
    doctor: false,
    fix: false,
    emitSecretsCommands: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--registry') {
      out.registryPath = argv[i + 1] || out.registryPath;
      i += 1;
      continue;
    }
    if (arg === '--latest') {
      out.latestPath = argv[i + 1] || out.latestPath;
      i += 1;
      continue;
    }
    if (arg === '--health-report') {
      out.healthReportPath = argv[i + 1] || out.healthReportPath;
      i += 1;
      continue;
    }
    if (arg === '--env-file') {
      out.envFile = argv[i + 1] || out.envFile;
      i += 1;
      continue;
    }
    if (arg === '--json') {
      out.json = true;
      continue;
    }
    if (arg === '--doctor') {
      out.doctor = true;
      continue;
    }
    if (arg === '--fix') {
      out.fix = true;
      out.doctor = true;
      continue;
    }
    if (arg === '--emit-secrets-commands') {
      out.emitSecretsCommands = true;
      out.doctor = true;
      continue;
    }
  }
  return out;
}

async function readJsonIfExists(path: string): Promise<any | null> {
  const resolvedPath = resolve(path);
  if (!existsSync(resolvedPath)) return null;
  try {
    return JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch {
    return null;
  }
}

function parseHealthRows(payload: any): HealthRow[] {
  const details = Array.isArray(payload?.details) ? payload.details : [];
  return details
    .map((row: any) => {
      const domain = String(row?.domain || row?.url || '').trim().toLowerCase();
      const status = String(row?.status || '').trim().toLowerCase();
      return { domain, status };
    })
    .filter((row) => Boolean(row.domain));
}

export async function buildDomainRegistryStatus(options: Options) {
  const registry = await loadDomainRegistry(options.registryPath);
  const latest = await readJsonIfExists(options.latestPath);
  const healthReport = await readJsonIfExists(options.healthReportPath);
  const healthRows = parseHealthRows(healthReport);

  const resolvedDomains = await Promise.all(
    registry.entries.map((entry) => resolveDomainRegistry(entry.domain, { path: options.registryPath }))
  );

  const tokenConfigured = resolvedDomains.filter((row) => row.tokenPresent === true).length;
  const tokenMissing = resolvedDomains.filter((row) => row.tokenPresent === false).length;
  const headerConfigured = resolvedDomains.filter((row) => Boolean(row.requiredHeader)).length;
  const bucketMapped = resolvedDomains.filter((row) => Boolean(row.bucket)).length;

  const onlineRows = healthRows.filter((row) => row.status === 'healthy');
  const degradedRows = healthRows.filter((row) => row.status !== 'healthy');
  const projects = String(latest?.path || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    registry: {
      path: registry.path,
      version: registry.version,
      totalDomains: resolvedDomains.length,
      bucketMapped,
      bucketMissing: Math.max(0, resolvedDomains.length - bucketMapped),
      headerConfigured,
      headerMissing: Math.max(0, resolvedDomains.length - headerConfigured),
      tokenConfigured,
      tokenMissing,
      domains: resolvedDomains.map((row) => ({
        domain: row.domain,
        mappingSource: row.mappingSource,
        bucket: row.bucket,
        prefix: row.prefix,
        requiredHeader: row.requiredHeader,
        tokenEnvVar: row.tokenEnvVar,
        tokenPresent: row.tokenPresent,
      })),
      error: registry.error || null,
    },
    search: {
      latestSnapshotId: latest?.id || null,
      queryPack: latest?.queryPack || null,
      warnings: Array.isArray(latest?.warnings) ? latest.warnings : [],
      projects,
      projectCount: projects.length,
    },
    domainHealth: {
      checkedRows: healthRows.length,
      onlineRows: onlineRows.length,
      offlineOrDegradedRows: degradedRows.length,
      onlineRatio: healthRows.length > 0 ? Number((onlineRows.length / healthRows.length).toFixed(4)) : null,
    },
  };
}

type DoctorCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

type DoctorResult = {
  ok: boolean;
  fixApplied: boolean;
  envFile: string;
  checks: DoctorCheck[];
  blockedBySecrets: string[];
  secretCommands?: {
    bunSecretsSet: string[];
    wranglerSecretPut: string[];
  };
};

async function ensureRegistryFile(registryPath: string, fix: boolean): Promise<DoctorCheck> {
  const path = resolve(registryPath);
  if (existsSync(path)) {
    return { id: 'registry_file_exists', ok: true, detail: path };
  }
  if (!fix) {
    return { id: 'registry_file_exists', ok: false, detail: `missing ${path}` };
  }
  const templatePath = resolve('.search/domain-registry.json');
  if (existsSync(templatePath)) {
    return { id: 'registry_file_exists', ok: true, detail: `already available at ${templatePath}` };
  }
  await mkdir(resolve('.search'), { recursive: true });
  await writeFile(
    path,
    JSON.stringify({ version: '2026.02.08.1', domains: [] }, null, 2) + '\n',
    'utf8'
  );
  return { id: 'registry_file_exists', ok: true, detail: `created ${path}` };
}

function parseEnvKeys(raw: string): Set<string> {
  const keys = new Set<string>();
  for (const line of raw.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key) keys.add(key);
  }
  return keys;
}

async function ensureEnvScaffold(
  envFile: string,
  tokenVars: string[],
  fix: boolean
): Promise<DoctorCheck> {
  const envPath = resolve(envFile);
  const defaults: Array<[string, string]> = [
    ['DOMAIN_REGISTRY_PATH', '.search/domain-registry.json'],
    ['SEARCH_BENCH_DOMAIN', 'factory-wager.com'],
    ['FACTORY_WAGER_REQUIRED_HEADER', 'x-factory-domain-token'],
  ];
  for (const name of tokenVars) {
    defaults.push([name, 'replace_me']);
  }

  const exists = existsSync(envPath);
  const current = exists ? await readFile(envPath, 'utf8') : '';
  const keys = parseEnvKeys(current);
  const missing = defaults.filter(([key]) => !keys.has(key));
  if (missing.length === 0) {
    return { id: 'env_scaffold', ok: true, detail: `all defaults present in ${envPath}` };
  }
  if (!fix) {
    return {
      id: 'env_scaffold',
      ok: false,
      detail: `missing ${missing.length} keys in ${envPath}: ${missing.map(([k]) => k).join(', ')}`,
    };
  }

  const header = '\n# Search Domain Registry defaults (doctor --fix)\n';
  const lines = missing.map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  const next = `${current}${current.endsWith('\n') || current.length === 0 ? '' : '\n'}${header}${lines}`;
  await writeFile(envPath, next, 'utf8');
  return { id: 'env_scaffold', ok: true, detail: `added ${missing.length} keys to ${envPath}` };
}

export async function runDomainRegistryDoctor(options: Options): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];
  const registryPath = options.registryPath || '.search/domain-registry.json';
  checks.push(await ensureRegistryFile(registryPath, options.fix));
  const registry = await loadDomainRegistry(registryPath);
  checks.push({
    id: 'registry_has_domains',
    ok: registry.entries.length > 0,
    detail: `domains=${registry.entries.length}`,
  });

  const tokenVars = Array.from(
    new Set(
      registry.entries
        .map((entry) => String(entry.tokenEnvVar || '').trim())
        .filter(Boolean)
    )
  );
  checks.push(await ensureEnvScaffold(options.envFile, tokenVars, options.fix));

  const status = await buildDomainRegistryStatus(options);
  checks.push({
    id: 'bucket_mapping_complete',
    ok: status.registry.totalDomains > 0 && status.registry.bucketMapped === status.registry.totalDomains,
    detail: `${status.registry.bucketMapped}/${status.registry.totalDomains}`,
  });
  checks.push({
    id: 'header_mapping_complete',
    ok: status.registry.totalDomains > 0 && status.registry.headerConfigured === status.registry.totalDomains,
    detail: `${status.registry.headerConfigured}/${status.registry.totalDomains}`,
  });
  checks.push({
    id: 'token_secrets_present',
    ok: status.registry.totalDomains > 0 && status.registry.tokenConfigured === status.registry.totalDomains,
    detail: `${status.registry.tokenConfigured}/${status.registry.totalDomains}`,
  });

  const blockedBySecrets: string[] = [];
  if (status.registry.tokenMissing > 0) {
    blockedBySecrets.push(
      `missing ${status.registry.tokenMissing} domain token secrets (set in bun secrets / wrangler secrets)`
    );
  }
  const missingTokenVars = Array.from(
    new Set(
      status.registry.domains
        .filter((domain) => domain.tokenPresent !== true)
        .map((domain) => String(domain.tokenEnvVar || '').trim())
        .filter(Boolean)
    )
  );
  const secretCommands = options.emitSecretsCommands
    ? {
        bunSecretsSet: missingTokenVars.map((name) => `bun secrets set ${name}`),
        wranglerSecretPut: missingTokenVars.map((name) => `wrangler secret put ${name}`),
      }
    : undefined;
  const ok = checks.every((check) => check.ok);
  return {
    ok,
    fixApplied: options.fix,
    envFile: resolve(options.envFile),
    checks,
    blockedBySecrets,
    secretCommands,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.doctor) {
    const doctor = await runDomainRegistryDoctor(options);
    if (options.json) {
      console.log(JSON.stringify(doctor, null, 2));
    } else {
      console.log(`Domain Registry Doctor (fix=${options.fix ? 'on' : 'off'})`);
      for (const check of doctor.checks) {
        console.log(`- [${check.ok ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
      }
      if (doctor.blockedBySecrets.length > 0) {
        console.log('- blocked:');
        for (const reason of doctor.blockedBySecrets) {
          console.log(`  - ${reason}`);
        }
      }
      if (doctor.secretCommands) {
        console.log('- secrets commands (templates):');
        for (const cmd of doctor.secretCommands.bunSecretsSet) {
          console.log(`  - ${cmd}`);
        }
        for (const cmd of doctor.secretCommands.wranglerSecretPut) {
          console.log(`  - ${cmd}`);
        }
      }
    }
    process.exit(doctor.ok ? 0 : 2);
  }

  const payload = await buildDomainRegistryStatus(options);

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Domain Registry Status (${payload.generatedAt})`);
  console.log(`- domains: ${payload.registry.totalDomains}`);
  console.log(`- bucket mapped: ${payload.registry.bucketMapped}/${payload.registry.totalDomains}`);
  console.log(`- required header configured: ${payload.registry.headerConfigured}/${payload.registry.totalDomains}`);
  console.log(`- token configured: ${payload.registry.tokenConfigured}/${payload.registry.totalDomains}`);
  console.log(`- search projects: ${payload.search.projectCount}`);
  console.log(`- health rows online: ${payload.domainHealth.onlineRows}/${payload.domainHealth.checkedRows}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[domain-registry-status] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
