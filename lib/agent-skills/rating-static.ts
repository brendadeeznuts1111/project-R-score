import type { SkillRating, SkillRatingFinding } from './rating-types.ts';
import { checkPlatformRules } from './rating-static-platform.ts';
import { checkRuntimeRules } from './rating-static-runtime.ts';
import { addFinding, grade } from './rating-static-support.ts';

export function rateSkillContent(
  name: string,
  content: string,
  filesScanned = 1,
  options: { skillLines?: number; hasMetadata?: boolean; runtimeVersion?: string } = {}
): SkillRating {
  const findings: SkillRatingFinding[] = [];
  checkPlatformRules(content, findings);
  checkRuntimeRules(content, findings, options.runtimeVersion ?? Bun.version);
  if ((options.skillLines ?? 0) > 500) {
    addFinding(
      findings,
      'progressive-disclosure',
      -10,
      `SKILL.md has ${options.skillLines} lines; move detailed command catalogs into focused references`
    );
  }
  if (options.hasMetadata === false) {
    addFinding(
      findings,
      'metadata-missing',
      -3,
      'skill package has no agents/openai.yaml interface metadata'
    );
  }
  const complianceScore = Math.max(
    0,
    Math.min(100, 100 + findings.reduce((total, finding) => total + finding.delta, 0))
  );
  return {
    name,
    complianceScore,
    scoreKind: 'static-compliance',
    complianceGrade: grade(complianceScore),
    findings,
    filesScanned,
  };
}
