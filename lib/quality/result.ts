/** Domain-neutral quality evidence. Formulas and thresholds stay with their owners. */

export type QualityLayer = 'technical' | 'domain' | 'policy';
export type QualitySeverity = 'error' | 'warning' | 'review';
export type SnapshotApproval = 'eligible' | 'manual-only' | 'forbidden';
export type QualityVerdict =
  'failed' | 'review-required' | 'update-candidate' | 'passed-with-warnings' | 'passed';

export type QualityCheck = {
  id: string;
  owner: string;
  layer: QualityLayer;
  severity: QualitySeverity;
  passed: boolean;
  /** Semantic change from the accepted baseline, independent of pass/fail. */
  changed: boolean;
  semanticDigest: string;
  snapshotApproval: SnapshotApproval;
  evidence?: unknown;
};

export type QualitySummary = {
  verdict: QualityVerdict;
  total: number;
  passed: number;
  failed: number;
  changed: number;
  byLayer: Record<QualityLayer, number>;
};

export function summarizeQualityChecks(checks: readonly QualityCheck[]): QualitySummary {
  const ids = new Set<string>();
  for (const check of checks) {
    if (!check.id.trim()) throw new TypeError('quality check id must be non-empty');
    if (!check.owner.trim())
      throw new TypeError(`quality check ${check.id} owner must be non-empty`);
    if (ids.has(check.id)) throw new TypeError(`duplicate quality check id: ${check.id}`);
    ids.add(check.id);
  }

  const hardFailure = checks.some(check => !check.passed && check.severity === 'error');
  const protectedChange = checks.some(
    check => check.changed && check.snapshotApproval !== 'eligible'
  );
  const explicitReview = checks.some(check => !check.passed && check.severity === 'review');
  const eligibleChange = checks.some(check => check.changed);
  const warning = checks.some(check => !check.passed && check.severity === 'warning');

  const verdict: QualityVerdict = hardFailure
    ? 'failed'
    : protectedChange || explicitReview
      ? 'review-required'
      : eligibleChange
        ? 'update-candidate'
        : warning
          ? 'passed-with-warnings'
          : 'passed';

  return {
    verdict,
    total: checks.length,
    passed: checks.filter(check => check.passed).length,
    failed: checks.filter(check => !check.passed).length,
    changed: checks.filter(check => check.changed).length,
    byLayer: {
      technical: checks.filter(check => check.layer === 'technical').length,
      domain: checks.filter(check => check.layer === 'domain').length,
      policy: checks.filter(check => check.layer === 'policy').length,
    },
  };
}
