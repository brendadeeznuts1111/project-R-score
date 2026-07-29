#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/audit — bun audit
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Fail-closed dependency audit with explicit, expiring risk exceptions.
 *
 * Unknown advisories, expired exceptions, malformed wire data, and stale
 * exceptions all fail. This keeps upstream-only findings visible without
 * weakening the merge gate into an unreviewed blanket ignore list.
 */
import { resolvePath } from './lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const EXCEPTIONS_PATH = resolvePath(ROOT, 'scripts/security-audit-exceptions.json');

type Severity = 'low' | 'moderate' | 'high' | 'critical';

export type AuditAdvisory = {
  package: string;
  advisory: string;
  title: string;
  severity: Severity;
};

export type AuditException = {
  advisory: string;
  package: string;
  owner: string;
  expires: string;
  scope: string;
  rationale: string;
};

type ExceptionFile = {
  schemaVersion: 1;
  reviewedAt: string;
  exceptions: AuditException[];
};

export type AuditPolicyResult = {
  accepted: AuditAdvisory[];
  unknown: AuditAdvisory[];
  expired: AuditException[];
  stale: AuditException[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

export function parseAuditExceptions(value: unknown): ExceptionFile {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.exceptions)) {
    throw new Error('security audit exceptions must use schemaVersion 1 with an exceptions array');
  }
  const exceptions = value.exceptions.map((row, index) => {
    if (!isRecord(row)) throw new Error(`exceptions[${index}] must be an object`);
    return {
      advisory: requiredString(row, 'advisory', `exceptions[${index}]`),
      package: requiredString(row, 'package', `exceptions[${index}]`),
      owner: requiredString(row, 'owner', `exceptions[${index}]`),
      expires: requiredString(row, 'expires', `exceptions[${index}]`),
      scope: requiredString(row, 'scope', `exceptions[${index}]`),
      rationale: requiredString(row, 'rationale', `exceptions[${index}]`),
    };
  });
  const reviewedAt = requiredString(value, 'reviewedAt', 'security audit exceptions');
  for (const [index, row] of exceptions.entries()) {
    if (!/^GHSA-[\w-]+$/.test(row.advisory)) {
      throw new Error(`exceptions[${index}].advisory must be a GHSA identifier`);
    }
    if (!Number.isFinite(Date.parse(row.expires))) {
      throw new Error(`exceptions[${index}].expires must be an ISO date`);
    }
  }
  const keys = exceptions.map(row => `${row.package}\0${row.advisory}`);
  if (new Set(keys).size !== keys.length)
    throw new Error('security audit exceptions must be unique');
  return { schemaVersion: 1, reviewedAt, exceptions };
}

export function parseAuditReport(value: unknown): AuditAdvisory[] {
  if (!isRecord(value)) throw new Error('bun audit JSON must be an object');
  const advisories: AuditAdvisory[] = [];
  for (const [packageName, rows] of Object.entries(value)) {
    if (!Array.isArray(rows)) throw new Error(`bun audit entry ${packageName} must be an array`);
    for (const [index, row] of rows.entries()) {
      if (!isRecord(row))
        throw new Error(`bun audit entry ${packageName}[${index}] must be an object`);
      const url = requiredString(row, 'url', `bun audit ${packageName}[${index}]`);
      const advisory = new URL(url).pathname.split('/').filter(Boolean).at(-1);
      const severity = requiredString(row, 'severity', `bun audit ${packageName}[${index}]`);
      if (!advisory?.startsWith('GHSA-')) {
        throw new Error(`bun audit ${packageName}[${index}] has no GHSA URL`);
      }
      if (!['low', 'moderate', 'high', 'critical'].includes(severity)) {
        throw new Error(`bun audit ${packageName}[${index}] has unknown severity ${severity}`);
      }
      advisories.push({
        package: packageName,
        advisory,
        title: requiredString(row, 'title', `bun audit ${packageName}[${index}]`),
        severity: severity as Severity,
      });
    }
  }
  return advisories;
}

export function evaluateAuditPolicy(
  advisories: readonly AuditAdvisory[],
  exceptions: readonly AuditException[],
  now = new Date()
): AuditPolicyResult {
  const active = new Map(exceptions.map(row => [`${row.package}\0${row.advisory}`, row] as const));
  const observed = new Set(advisories.map(row => `${row.package}\0${row.advisory}`));
  const expired = exceptions.filter(row => Date.parse(`${row.expires}T23:59:59Z`) < now.getTime());
  const expiredKeys = new Set(expired.map(row => `${row.package}\0${row.advisory}`));
  const accepted = advisories.filter(row => {
    const key = `${row.package}\0${row.advisory}`;
    return active.has(key) && !expiredKeys.has(key);
  });
  const unknown = advisories.filter(row => !accepted.includes(row));
  const stale = exceptions.filter(row => !observed.has(`${row.package}\0${row.advisory}`));
  return { accepted, unknown, expired, stale };
}

async function main(): Promise<void> {
  const exceptions = parseAuditExceptions(await Bun.file(EXCEPTIONS_PATH).json());
  const proc = Bun.spawnSync(['bun', 'audit', '--json'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stderr = proc.stderr.toString().trim();
  if (stderr) console.error(stderr);
  const stdout = proc.stdout.toString();
  if (!stdout.trim()) {
    throw new Error(`bun audit produced no JSON (exit ${proc.exitCode})`);
  }
  const advisories = parseAuditReport(JSON.parse(stdout) as unknown);
  const result = evaluateAuditPolicy(advisories, exceptions.exceptions);

  for (const row of result.accepted) {
    const exception = exceptions.exceptions.find(
      candidate => candidate.package === row.package && candidate.advisory === row.advisory
    );
    console.warn(
      `⚠ accepted ${row.severity} ${row.advisory} ${row.package} (owner=${exception?.owner}; expires=${exception?.expires})`
    );
  }
  for (const row of result.unknown) {
    console.error(`✗ unreviewed ${row.severity} ${row.advisory} ${row.package}: ${row.title}`);
  }
  for (const row of result.expired) {
    console.error(`✗ expired exception ${row.advisory} ${row.package} (${row.expires})`);
  }
  for (const row of result.stale) {
    console.error(`✗ stale exception ${row.advisory} ${row.package}; remove or update it`);
  }

  if (result.unknown.length || result.expired.length || result.stale.length) process.exit(1);
  console.log(`✓ dependency audit: ${advisories.length} reviewed advisory exception(s), 0 unknown`);
}

if (import.meta.main) await main();
