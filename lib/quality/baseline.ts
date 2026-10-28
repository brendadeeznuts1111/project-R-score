// eslint-disable-next-line no-restricted-imports -- Bun 1.3 lacks atomic rename.
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirnamePath as dirname, resolvePath as resolve } from '../path-bun';
import {
  canonicalJsonDigests,
  canonicalJsonText,
  parseCanonicalJsonValue,
  type CanonicalJson,
} from './canonical-json.ts';

type RecordValue = { [key: string]: CanonicalJson };

export type AcceptQualityBaselineOptions = {
  report: unknown;
  candidate: unknown;
  scope: string;
  baselinePath: string;
  /** Null explicitly asserts that no accepted baseline exists. */
  expectedBaselineSha3: string | null;
};

export type AcceptedQualityBaseline = {
  scope: string;
  baselinePath: string;
  previousSha3: string | null;
  acceptedSha3: string;
};

function record(value: CanonicalJson, label: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function stringField(value: RecordValue, field: string, label: string): string {
  const result = value[field];
  if (typeof result !== 'string' || !result.trim()) {
    throw new TypeError(`${label}.${field} must be a non-empty string`);
  }
  return result;
}

function booleanField(value: RecordValue, field: string, label: string): boolean {
  const result = value[field];
  if (typeof result !== 'boolean') throw new TypeError(`${label}.${field} must be boolean`);
  return result;
}

function parseAcceptanceReport(reportValue: unknown): {
  scope: string;
  candidateSha3: string;
  baselineSha3: string | null;
} {
  const canonical = parseCanonicalJsonValue(reportValue);
  const report = record(canonical, 'report');
  if (report.schemaVersion !== 1) throw new TypeError('unsupported quality report schema');
  const integrity = record(report.integrity!, 'report.integrity');
  const declaredIntegrity = stringField(integrity, 'sha3_256', 'report.integrity');
  const { integrity: _integrity, ...core } = report;
  const actualIntegrity = canonicalJsonDigests(core).sha3_256;
  if (declaredIntegrity !== actualIntegrity) throw new Error('quality report integrity mismatch');

  const summary = record(report.summary!, 'report.summary');
  if (stringField(summary, 'verdict', 'report.summary') !== 'update-candidate') {
    throw new Error('baseline acceptance requires an update-candidate verdict');
  }
  if (!Array.isArray(report.checks) || report.checks.length === 0) {
    throw new Error('baseline acceptance requires quality checks');
  }
  let changed = 0;
  for (const [index, value] of report.checks.entries()) {
    const check = record(value, `report.checks[${index}]`);
    if (!booleanField(check, 'passed', `report.checks[${index}]`)) {
      throw new Error(
        `baseline acceptance rejects failed check ${stringField(check, 'id', `report.checks[${index}]`)}`
      );
    }
    if (booleanField(check, 'changed', `report.checks[${index}]`)) {
      changed++;
      if (stringField(check, 'snapshotApproval', `report.checks[${index}]`) !== 'eligible') {
        throw new Error(`baseline acceptance requires eligible changed checks`);
      }
    }
  }
  if (changed === 0) throw new Error('baseline acceptance requires semantic drift');

  const snapshot = record(report.snapshot!, 'report.snapshot');
  const candidate = record(snapshot.candidate!, 'report.snapshot.candidate');
  const baselineValue = snapshot.baseline;
  const baselineSha3 =
    baselineValue === null
      ? null
      : stringField(
          record(baselineValue!, 'report.snapshot.baseline'),
          'sha3_256',
          'report.snapshot.baseline'
        );
  return {
    scope: stringField(report, 'scope', 'report'),
    candidateSha3: stringField(candidate, 'sha3_256', 'report.snapshot.candidate'),
    baselineSha3,
  };
}

async function readCurrentBaseline(path: string): Promise<CanonicalJson | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return parseCanonicalJsonValue(await file.json());
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  try {
    await Bun.write(temporary, content);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function withBaselineLock<T>(baselinePath: string, operation: () => Promise<T>): Promise<T> {
  const lockPath = `${baselinePath}.lock`;
  await mkdir(dirname(baselinePath), { recursive: true });
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await mkdir(lockPath);
      try {
        return await operation();
      } finally {
        await rm(lockPath, { recursive: true, force: true });
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') throw error;
      await Bun.sleep(25);
    }
  }
  throw new Error(`timed out acquiring baseline lock: ${lockPath}`);
}

export async function acceptQualityBaseline(
  options: AcceptQualityBaselineOptions
): Promise<AcceptedQualityBaseline> {
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(options.scope)) {
    throw new TypeError('baseline scope is invalid');
  }
  if (!options.baselinePath.endsWith('.json')) {
    throw new TypeError('baseline path must end in .json');
  }
  const verified = parseAcceptanceReport(options.report);
  if (verified.scope !== options.scope) {
    throw new Error(`report scope ${verified.scope} does not match ${options.scope}`);
  }
  const candidate = parseCanonicalJsonValue(options.candidate);
  const candidateSha3 = canonicalJsonDigests(candidate).sha3_256;
  if (candidateSha3 !== verified.candidateSha3) {
    throw new Error('candidate content does not match report snapshot digest');
  }

  const baselinePath = resolve(options.baselinePath);
  return withBaselineLock(baselinePath, async () => {
    const current = await readCurrentBaseline(baselinePath);
    const currentSha3 = current === null ? null : canonicalJsonDigests(current).sha3_256;
    if (currentSha3 !== options.expectedBaselineSha3) {
      throw new Error('accepted baseline changed since review');
    }
    if (currentSha3 !== verified.baselineSha3) {
      throw new Error('accepted baseline does not match report comparison');
    }

    await atomicWrite(baselinePath, `${canonicalJsonText(candidate)}\n`);
    return {
      scope: options.scope,
      baselinePath,
      previousSha3: currentSha3,
      acceptedSha3: candidateSha3,
    };
  });
}
