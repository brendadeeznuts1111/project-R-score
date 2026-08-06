/**
 * partner-surface-registry-check.ts — Layer B: inventory registry bag vs baked JSON.
 *
 * Validates omissions, schema identity, required top keys, and moneyPolicy by
 * walking **object key names** (never substring-searching JSON text — omit lists
 * in this inventory bake would false-positive).
 *
 * `conceptIds` on the bag are glossary / relatedConcept refs, not JSON paths.
 */

import type {
  PartnerSurfaceMoneyPolicy,
  PartnerSurfaceRegistryBag,
} from './partner-surface-inventory.ts';

export type RegistryCheckIssue = {
  readonly level: 'error' | 'warn';
  readonly message: string;
};

const FORBIDDEN_MONEY_KEYS = new Set(['softBalance', 'balance', 'amount', 'money']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Depth-first collect every object key path (dot + [i] for arrays). */
export function collectObjectKeyPaths(
  value: unknown,
  prefix = ''
): readonly { path: string; key: string; value: unknown }[] {
  const out: { path: string; key: string; value: unknown }[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      out.push(...collectObjectKeyPaths(item, prefix ? `${prefix}[${i}]` : `[${i}]`));
    });
    return out;
  }
  if (!isRecord(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push({ path, key, value: child });
    out.push(...collectObjectKeyPaths(child, path));
  }
  return out;
}

export function artifactSchemaIdentity(artifact: unknown): {
  field: 'schema' | 'kind' | 'schemaVersion' | null;
  value: string | null;
} {
  if (!isRecord(artifact)) return { field: null, value: null };
  if (typeof artifact.schema === 'string') {
    return { field: 'schema', value: artifact.schema };
  }
  if (typeof artifact.kind === 'string') {
    return { field: 'kind', value: artifact.kind };
  }
  if (typeof artifact.schemaVersion === 'number' || typeof artifact.schemaVersion === 'string') {
    return { field: 'schemaVersion', value: String(artifact.schemaVersion) };
  }
  return { field: null, value: null };
}

function isMoneyBearingKey(key: string): boolean {
  return FORBIDDEN_MONEY_KEYS.has(key) || /Cents$/.test(key);
}

function checkMoneyPolicy(
  policy: PartnerSurfaceMoneyPolicy,
  keys: readonly { path: string; key: string; value: unknown }[],
  rowId: string
): RegistryCheckIssue[] {
  const issues: RegistryCheckIssue[] = [];
  if (policy === 'unset') return issues;

  if (policy === 'forbidden') {
    const found = keys.filter(k => FORBIDDEN_MONEY_KEYS.has(k.key));
    if (found.length > 0) {
      issues.push({
        level: 'error',
        message: `${rowId}: moneyPolicy=forbidden but found ${found
          .map(f => f.path)
          .slice(0, 8)
          .join(', ')}${found.length > 8 ? '…' : ''}`,
      });
    }
    return issues;
  }

  // integerMinorUnits — every money-bearing field must be an integer number
  for (const { path, key, value } of keys) {
    if (!isMoneyBearingKey(key)) continue;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      issues.push({
        level: 'error',
        message: `${rowId}: moneyPolicy=integerMinorUnits but ${path} is ${typeof value === 'number' ? value : typeof value} (want integer)`,
      });
    }
  }
  return issues;
}

/**
 * Check a parsed registry artifact against the inventory registry bag.
 */
export function checkRegistryArtifact(
  rowId: string,
  bag: PartnerSurfaceRegistryBag,
  artifact: unknown
): readonly RegistryCheckIssue[] {
  const issues: RegistryCheckIssue[] = [];
  if (!isRecord(artifact)) {
    return [
      {
        level: 'error',
        message: `${rowId}: registry artifact is not a JSON object`,
      },
    ];
  }

  const identity = artifactSchemaIdentity(artifact);
  if (bag.schemaIdField === 'none') {
    // documentation-only schemaId
  } else if (identity.field === null) {
    issues.push({
      level: 'warn',
      message: `${rowId}: artifact has no schema/kind/schemaVersion; cannot prove schemaId=${bag.schemaId}`,
    });
  } else if (bag.schemaIdField && identity.field !== bag.schemaIdField) {
    issues.push({
      level: 'error',
      message: `${rowId}: expected identity field ${bag.schemaIdField}, found ${identity.field}=${identity.value}`,
    });
  } else if (identity.value !== bag.schemaId) {
    issues.push({
      level: 'error',
      message: `${rowId}: schemaId mismatch: inventory=${bag.schemaId} artifact.${identity.field}=${identity.value}`,
    });
  }

  for (const top of bag.requiredTopKeys ?? []) {
    if (!(top in artifact)) {
      issues.push({
        level: 'error',
        message: `${rowId}: missing required top-level key "${top}"`,
      });
    }
  }

  const keyPaths = collectObjectKeyPaths(artifact);
  const omitSet = new Set(bag.omits);
  const omitHits = keyPaths.filter(k => omitSet.has(k.key));
  if (omitHits.length > 0) {
    issues.push({
      level: 'error',
      message: `${rowId}: omitted keys present in artifact: ${[
        ...new Set(omitHits.map(h => h.path)),
      ]
        .slice(0, 12)
        .join(', ')}${omitHits.length > 12 ? '…' : ''}`,
    });
  }

  issues.push(...checkMoneyPolicy(bag.moneyPolicy, keyPaths, rowId));

  // conceptIds are glossary / relatedConcept refs — never traverse as JSON paths
  if (bag.conceptIds?.some(id => id.includes('*'))) {
    // wildcards are documentation only; fine
  }

  return issues;
}
