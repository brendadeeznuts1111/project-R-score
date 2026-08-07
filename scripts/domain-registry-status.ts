#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/update#latest — --latest
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { fileExistsSync, joinPath, readText, resolvePath, writeText } from './lib/fs-bun';
import { jsonOut } from '../lib/console-depth';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

// @see https://bun.com/docs/runtime/environment-variables — Bun.env

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
  statusCode: number | null;
  error: string | null;
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
  const resolvedPath = resolvePath(path);
  if (!fileExistsSync(resolvedPath)) return null;
  try {
    return JSON.parse(await readText(resolvedPath));
  } catch {
    return null;
  }
}

function parseHealthRows(payload: any): HealthRow[] {
  const details = Array.isArray(payload?.details) ? payload.details : [];
  return details
    .map((row: any) => {
      const domain = String(row?.domain || row?.url || '')
        .trim()
        .toLowerCase();
      const status = String(row?.status || '')
        .trim()
        .toLowerCase();
      const statusCodeValue = Number.parseInt(String(row?.statusCode ?? ''), 10);
      const statusCode = Number.isFinite(statusCodeValue) ? statusCodeValue : null;
      const error = row?.error == null ? null : String(row.error);
      return { domain, status, statusCode, error };
    })
    .filter(row => Boolean(row.domain));
}

export async function buildDomainRegistryStatus(options: Options) {
  const registry = await loadDomainRegistry(options.registryPath);
  const latest = await readJsonIfExists(options.latestPath);
  const healthReport = await readJsonIfExists(options.healthReportPath);
  const healthRows = parseHealthRows(healthReport);

  const resolvedDomains = await Promise.all(
    registry.entries.map(entry =>
      resolveDomainRegistry(entry.domain, { path: options.registryPath })
    )
  );

  const tokenConfigured = resolvedDomains.filter(row => row.tokenPresent === true).length;
  const tokenMissing = resolvedDomains.filter(row => row.tokenPresent === false).length;
  const headerConfigured = resolvedDomains.filter(row => Boolean(row.requiredHeader)).length;
  const bucketMapped = resolvedDomains.filter(row => Boolean(row.bucket)).length;

  const healthyRows = healthRows.filter(row => row.status === 'healthy');
  const reachableRows = healthRows.filter(row => {
    if (row.status === 'healthy') return true;
    if (row.error) return false;
    return row.statusCode !== null && row.statusCode >= 100 && row.statusCode < 500;
  });
  const unreachableRows = Math.max(0, healthRows.length - reachableRows.length);
  const projects = String(latest?.path || '')
    .split(',')
    .map(part => part.trim())
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
      domains: resolvedDomains.map(row => ({
        domain: row.domain,
        mappingSource: row.mappingSource,
        bucket: row.bucket,
        prefix: row.prefix,
        requiredHeader: row.requiredHeader,
        tokenEnvVar: row.tokenEnvVar,
        tokenPresent: row.tokenPresent,
        tokenSource: row.tokenSource,
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
      onlineRows: healthyRows.length,
      reachableRows: reachableRows.length,
      offlineOrDegradedRows: Math.max(0, healthRows.length - healthyRows.length),
      unreachableRows,
      onlineRatio:
        healthRows.length > 0 ? Number((healthyRows.length / healthRows.length).toFixed(4)) : null,
      reachableRatio:
        healthRows.length > 0
          ? Number((reachableRows.length / healthRows.length).toFixed(4))
          : null,
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
  const path = resolvePath(registryPath);
  if (fileExistsSync(path)) {
    return { id: 'registry_file_exists', ok: true, detail: path };
  }
  if (!fix) {
    return { id: 'registry_file_exists', ok: false, detail: `missing ${path}` };
  }
  const templatePath = resolvePath('.search/domain-registry.json');
  if (fileExistsSync(templatePath)) {
    return { id: 'registry_file_exists', ok: true, detail: `already available at ${templatePath}` };
  }
  await Bun.write(path, JSON.stringify({ version: '2026.02.08.1', domains: [] }, null, 2) + '\n');
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
  const envPath = resolvePath(envFile);
  const defaults: Array<[string, string]> = [
    ['DOMAIN_REGISTRY_PATH', '.search/domain-registry.json'],
    ['SEARCH_BENCH_DOMAIN', 'factory-wager.com'],
    ['FACTORY_WAGER_REQUIRED_HEADER', 'x-factory-domain-token'],
  ];
  for (const name of tokenVars) {
    defaults.push([name, 'replace_me']);
  }

  const exists = fileExistsSync(envPath);
  const current = exists ? await readText(envPath) : '';
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
  await writeText(envPath, next);
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
    new Set(registry.entries.map(entry => String(entry.tokenEnvVar || '').trim()).filter(Boolean))
  );
  checks.push(await ensureEnvScaffold(options.envFile, tokenVars, options.fix));

  const status = await buildDomainRegistryStatus(options);
  checks.push({
    id: 'bucket_mapping_complete',
    ok:
      status.registry.totalDomains > 0 &&
      status.registry.bucketMapped === status.registry.totalDomains,
    detail: `${status.registry.bucketMapped}/${status.registry.totalDomains}`,
  });
  checks.push({
    id: 'header_mapping_complete',
    ok:
      status.registry.totalDomains > 0 &&
      status.registry.headerConfigured === status.registry.totalDomains,
    detail: `${status.registry.headerConfigured}/${status.registry.totalDomains}`,
  });
  checks.push({
    id: 'token_secrets_present',
    ok:
      status.registry.totalDomains > 0 &&
      status.registry.tokenConfigured === status.registry.totalDomains,
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
        .filter(domain => domain.tokenPresent !== true)
        .map(domain => String(domain.tokenEnvVar || '').trim())
        .filter(Boolean)
    )
  );
  const secretCommands = options.emitSecretsCommands
    ? {
        bunSecretsSet: missingTokenVars.map(name => `bun secrets set ${name}`),
        wranglerSecretPut: missingTokenVars.map(name => `wrangler secret put ${name}`),
      }
    : undefined;
  const ok = checks.every(check => check.ok);
  return {
    ok,
    fixApplied: options.fix,
    envFile: resolvePath(options.envFile),
    checks,
    blockedBySecrets,
    secretCommands,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(
    applyUnknownLongOptionGuardFor('search:domain:doctor', Bun.argv.slice(2))
  );
  if (options.doctor) {
    const doctor = await runDomainRegistryDoctor(options);
    if (options.json) {
      jsonOut(doctor);
    } else {
      console.info(`Domain Registry Doctor (fix=${options.fix ? 'on' : 'off'})`);
      for (const check of doctor.checks) {
        console.info(`- [${check.ok ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
      }
      if (doctor.blockedBySecrets.length > 0) {
        console.info('- blocked:');
        for (const reason of doctor.blockedBySecrets) {
          console.info(`  - ${reason}`);
        }
      }
      if (doctor.secretCommands) {
        console.info('- secrets commands (templates):');
        for (const cmd of doctor.secretCommands.bunSecretsSet) {
          console.info(`  - ${cmd}`);
        }
        for (const cmd of doctor.secretCommands.wranglerSecretPut) {
          console.info(`  - ${cmd}`);
        }
      }
    }
    process.exit(doctor.ok ? 0 : 2);
  }

  const payload = await buildDomainRegistryStatus(options);

  if (options.json) {
    jsonOut(payload);
    return;
  }

  console.info(`Domain Registry Status (${payload.generatedAt})`);
  console.info(`- domains: ${payload.registry.totalDomains}`);
  console.info(
    `- bucket mapped: ${payload.registry.bucketMapped}/${payload.registry.totalDomains}`
  );
  console.info(
    `- required header configured: ${payload.registry.headerConfigured}/${payload.registry.totalDomains}`
  );
  console.info(
    `- token configured: ${payload.registry.tokenConfigured}/${payload.registry.totalDomains}`
  );
  console.info(`- search projects: ${payload.search.projectCount}`);
  console.info(
    `- health rows online (healthy): ${payload.domainHealth.onlineRows}/${payload.domainHealth.checkedRows}`
  );
  console.info(
    `- health rows reachable: ${payload.domainHealth.reachableRows}/${payload.domainHealth.checkedRows}`
  );
}

if (import.meta.main) {
  main().catch(error => {
    console.error(
      `[domain-registry-status] ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  });
}
