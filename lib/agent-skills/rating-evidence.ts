import { runManagedProcess } from '../harness/managed-process.ts';
import type {
  DynamicEvidenceCheck,
  DynamicEvidenceModel,
  DynamicSkillRating,
  SkillRating,
} from './rating-types.ts';

export function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function checkApplies(check: DynamicEvidenceCheck, skill: string): boolean {
  return (
    check.attribution.kind === 'active-skills' ||
    (check.attribution.kind === 'skills' && check.attribution.names.includes(skill))
  );
}

/** Combine compliance with finite evidence without treating a small sample as certainty. */
export function applyDynamicEvidence(
  ratings: SkillRating[],
  checks: DynamicEvidenceCheck[],
  model: DynamicEvidenceModel
): DynamicSkillRating[] {
  return ratings
    .map(rating => {
      const applicable = checks.filter(check => checkApplies(check, rating.name));
      const structure = applicable.filter(check => check.dimension === 'structure');
      const owned = applicable.filter(
        check =>
          check.attribution.kind === 'skills' &&
          (check.dimension === 'runtime' || check.dimension === 'contract')
      );
      const passed = owned.filter(check => check.ok).length;
      const structureScore =
        structure.length === 0
          ? 0
          : Math.round((structure.filter(check => check.ok).length / structure.length) * 100);
      const proven = owned.length > 0;
      const evidenceScore = proven
        ? Math.round(
            ((passed + model.prior.alpha) / (owned.length + model.prior.alpha + model.prior.beta)) *
              100
          )
        : null;
      const confidence = proven
        ? Math.round((1 - Math.exp(-owned.length / model.confidenceScale)) * 100)
        : 0;
      const overallScore =
        evidenceScore === null
          ? null
          : Math.round(
              rating.complianceScore * model.weights.compliance +
                structureScore * model.weights.structure +
                evidenceScore * model.weights.evidence
            );
      const dimensions = Object.fromEntries(
        (['structure', 'runtime', 'contract'] as const).map(dimension => {
          const ownedDimension = applicable.filter(check => check.dimension === dimension);
          return [
            dimension,
            {
              passed: ownedDimension.filter(check => check.ok).length,
              total: ownedDimension.length,
            },
          ];
        })
      ) as DynamicSkillRating['dimensions'];
      return {
        name: rating.name,
        status: proven ? 'proven' : 'unproven',
        complianceScore: rating.complianceScore,
        structureScore,
        evidenceScore,
        overallScore,
        confidence,
        checksPassed: passed,
        checksTotal: owned.length,
        dimensions,
      };
    })
    .sort(
      (left, right) =>
        Number(right.overallScore !== null) - Number(left.overallScore !== null) ||
        (right.overallScore ?? 0) - (left.overallScore ?? 0) ||
        left.name.localeCompare(right.name)
    );
}

export async function collectDynamicEvidence(
  model: DynamicEvidenceModel,
  repoRoot: string
): Promise<DynamicEvidenceCheck[]> {
  const checks: DynamicEvidenceCheck[] = [];
  for (const proof of model.proofs) {
    const result = await runManagedProcess({
      command: proof.command,
      cwd: repoRoot,
      env: { ...Bun.env, SKILL_RATING_EVIDENCE: proof.id },
      timeoutMs: proof.timeoutMs,
      terminateGraceMs: 2_000,
      retries: 0,
      retryOn: [],
      retryBackoffMs: 0,
      outputLimitBytes: 512 * 1024,
    });
    checks.push({
      id: proof.id,
      dimension: proof.dimension,
      attribution: proof.attribution,
      ok: result.ok,
      observedAt: result.endedAt,
      durationNs: result.durationNs,
      durationMs: result.durationMs,
      stdoutSha256: sha256(result.final.stdout),
      stderrSha256: sha256(result.final.stderr),
      commandSha256: sha256(JSON.stringify(proof.command)),
    });
  }
  return checks;
}
