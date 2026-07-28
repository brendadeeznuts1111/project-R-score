// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Compact operations slice for the derived Bun capability × brand cross-map.
 *
 * This is monitoring metadata, not a proof-taxonomy contract. Legacy
 * observed-but-undeclared usage stays visible as warnings; only new/hard
 * findings and stale evidence degrade `ok`.
 */

export const BUN_BRAND_MAP_PATH = 'public/registry/bun-brand-map.json';

export type BunBrandProjectAttribution = {
  path: string;
  observed: number;
  undeclared: number;
  legacyUndeclared: number;
  attention: number;
};

export type BunBrandMapSummarySlice = {
  available: boolean;
  ok: boolean;
  warnings: number;
  errors: number;
  stale: boolean;
  declared?: number;
  observed?: number;
  matched?: number;
  undeclared?: number;
  legacyUndeclared?: number;
  newUndeclared?: number;
  catalogConflicts?: number;
  experimentalApprovals?: number;
  projects?: number;
  projectAttribution?: BunBrandProjectAttribution[];
  generatedAt?: string;
  path: '/registry/bun-brand-map.json';
};

type WireFinding = {
  kind?: string;
  severity?: string;
  baseline?: boolean;
};

type WireProject = {
  path?: string;
  observed?: number;
  undeclared?: number;
  legacyUndeclared?: number;
  attention?: number;
};

type WireArtifact = {
  schemaVersion?: number;
  kind?: string;
  generatedAt?: string;
  summary?: {
    declared?: number;
    observed?: number;
    matched?: number;
    undeclared?: number;
    baselineUndeclared?: number;
    newUndeclared?: number;
    catalogConflicts?: number;
    experimentalApprovals?: number;
    projects?: number;
    stale?: number;
  };
  capabilities?: Array<{
    policy?: string;
    evidenceState?: string;
  }>;
  findings?: WireFinding[];
  projects?: WireProject[];
};

const SUMMARY_COUNT_FIELDS = [
  'declared',
  'observed',
  'matched',
  'undeclared',
  'baselineUndeclared',
  'newUndeclared',
  'catalogConflicts',
  'experimentalApprovals',
  'projects',
  'stale',
] as const;

const PROJECT_COUNT_FIELDS = ['observed', 'undeclared', 'legacyUndeclared', 'attention'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function optionalField(
  record: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => boolean
): boolean {
  return record[key] === undefined || guard(record[key]);
}

function parseWireArtifact(value: unknown): WireArtifact | null {
  if (!isRecord(value)) return null;
  if (!optionalField(value, 'schemaVersion', candidate => candidate === 1)) return null;
  if (!optionalField(value, 'kind', candidate => candidate === 'bun-brand-map')) return null;
  if (!optionalField(value, 'generatedAt', candidate => typeof candidate === 'string')) return null;

  if (value.summary !== undefined) {
    if (!isRecord(value.summary)) return null;
    const summary = value.summary;
    if (!SUMMARY_COUNT_FIELDS.every(field => optionalField(summary, field, isCount))) {
      return null;
    }
  }

  if (value.findings !== undefined) {
    if (
      !Array.isArray(value.findings) ||
      !value.findings.every(
        row =>
          isRecord(row) &&
          optionalField(row, 'kind', candidate => typeof candidate === 'string') &&
          optionalField(
            row,
            'severity',
            candidate => candidate === 'warning' || candidate === 'error'
          ) &&
          optionalField(row, 'baseline', candidate => typeof candidate === 'boolean')
      )
    ) {
      return null;
    }
  }

  if (value.capabilities !== undefined) {
    if (
      !Array.isArray(value.capabilities) ||
      !value.capabilities.every(
        row =>
          isRecord(row) &&
          optionalField(
            row,
            'policy',
            candidate =>
              candidate === 'production-approved' ||
              candidate === 'optional' ||
              candidate === 'lab-only' ||
              candidate === 'blocked'
          ) &&
          optionalField(
            row,
            'evidenceState',
            candidate =>
              candidate === 'verified' ||
              candidate === 'declared-unproven' ||
              candidate === 'observed-undeclared' ||
              candidate === 'failed' ||
              candidate === 'stale'
          )
      )
    ) {
      return null;
    }
  }

  if (value.projects !== undefined) {
    if (
      !Array.isArray(value.projects) ||
      !value.projects.every(
        row =>
          isRecord(row) &&
          optionalField(row, 'path', candidate => typeof candidate === 'string') &&
          PROJECT_COUNT_FIELDS.every(field => optionalField(row, field, isCount))
      )
    ) {
      return null;
    }
  }

  return value as WireArtifact;
}

export function loadBunBrandMapSummarySliceSync(
  artifactPath: string = BUN_BRAND_MAP_PATH
): BunBrandMapSummarySlice {
  const unavailable: BunBrandMapSummarySlice = {
    available: false,
    ok: false,
    warnings: 0,
    errors: 0,
    stale: false,
    path: '/registry/bun-brand-map.json',
  };

  try {
    const mapped = Bun.mmap(artifactPath);
    const artifact = parseWireArtifact(JSON.parse(new TextDecoder().decode(mapped)));
    if (!artifact) return unavailable;
    const summary = artifact.summary ?? {};
    const findings = artifact.findings ?? [];
    const legacyUndeclared =
      summary.baselineUndeclared ?? findings.filter(row => row.baseline === true).length;
    const newUndeclared =
      summary.newUndeclared ??
      findings.filter(row => row.kind === 'observed-undeclared' && row.baseline !== true).length;
    const hardFindings = findings.filter(
      row => row.severity === 'error' && row.baseline !== true
    ).length;
    const warningFindings = findings.filter(
      row => row.severity === 'warning' || row.baseline === true
    ).length;
    const capabilities = artifact.capabilities ?? [];
    const productionProofErrors = capabilities.filter(
      row =>
        row.policy === 'production-approved' &&
        ['failed', 'declared-unproven', 'stale'].includes(row.evidenceState ?? '')
    ).length;
    const nonProductionProofWarnings = capabilities.filter(
      row =>
        row.policy !== 'production-approved' &&
        ['failed', 'declared-unproven', 'stale'].includes(row.evidenceState ?? '')
    ).length;
    const errors = Math.max(newUndeclared, hardFindings, productionProofErrors);
    const warnings = Math.max(legacyUndeclared, warningFindings, nonProductionProofWarnings);
    const stale =
      (summary.stale ?? 0) > 0 ||
      findings.some(row => row.kind === 'stale' && row.baseline !== true) ||
      capabilities.some(
        row => row.policy === 'production-approved' && row.evidenceState === 'stale'
      );

    return {
      available: true,
      ok: errors === 0 && !stale,
      warnings,
      errors,
      stale,
      declared: summary.declared,
      observed: summary.observed,
      matched: summary.matched,
      undeclared: summary.undeclared,
      legacyUndeclared,
      newUndeclared,
      catalogConflicts: summary.catalogConflicts,
      experimentalApprovals: summary.experimentalApprovals,
      projects: summary.projects,
      projectAttribution: (artifact.projects ?? [])
        .filter(row => typeof row.path === 'string')
        .map(row => ({
          path: row.path!,
          observed: row.observed ?? 0,
          undeclared: row.undeclared ?? 0,
          legacyUndeclared: row.legacyUndeclared ?? 0,
          attention: row.attention ?? 0,
        })),
      generatedAt: artifact.generatedAt,
      path: '/registry/bun-brand-map.json',
    };
  } catch {
    return unavailable;
  }
}
