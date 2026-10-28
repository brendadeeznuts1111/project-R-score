import type { SkillRating, SkillRatingFinding } from './rating-types.ts';

export function grade(score: number): SkillRating['complianceGrade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function addFinding(
  findings: SkillRatingFinding[],
  rule: string,
  delta: number,
  message: string
): void {
  findings.push({ rule, delta, message });
}

export function hasExplicitPlatformBoundary(content: string): boolean {
  return /(?:POSIX[- ]only|Unix[- ]only|Linux(?:\/macOS| and macOS)? only|platform-specific)/i.test(
    content
  );
}

export function hasExplicitPackageManagerBoundary(content: string): boolean {
  return /(?:npm\/npx examples|npm and npx examples|upstream npm\/npx|package-manager examples)[\s\S]{0,320}(?:compatibility|translate|owning repository|repository-owned|Bun-owned)/i.test(
    content
  );
}
