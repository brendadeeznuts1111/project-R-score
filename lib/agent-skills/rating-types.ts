export type SkillRatingFinding = { rule: string; delta: number; message: string };

export type SkillRating = {
  name: string;
  complianceScore: number;
  scoreKind: 'static-compliance';
  complianceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  findings: SkillRatingFinding[];
  filesScanned: number;
};

export type EvidenceDimension = 'model' | 'structure' | 'runtime' | 'contract';
export type EvidenceAttribution =
  { kind: 'portfolio' } | { kind: 'active-skills' } | { kind: 'skills'; names: string[] };

export type DynamicProof = {
  id: string;
  dimension: EvidenceDimension;
  attribution: EvidenceAttribution;
  command: string[];
  timeoutMs: number;
};

export type DynamicEvidenceCheck = {
  id: string;
  dimension: EvidenceDimension;
  attribution: EvidenceAttribution;
  ok: boolean;
  observedAt: string;
  durationNs: number;
  durationMs: number;
  stdoutSha256: string;
  stderrSha256: string;
  commandSha256: string;
};

export type DynamicSkillRating = {
  name: string;
  status: 'proven' | 'unproven';
  complianceScore: number;
  structureScore: number;
  evidenceScore: number | null;
  overallScore: number | null;
  confidence: number;
  checksPassed: number;
  checksTotal: number;
  dimensions: Record<'structure' | 'runtime' | 'contract', { passed: number; total: number }>;
};

export type DynamicEvidenceModel = {
  schemaVersion: 1;
  model: 'finite-evidence-v2';
  minimumOverallScore: number;
  weights: { compliance: number; structure: number; evidence: number };
  prior: { alpha: number; beta: number };
  confidenceScale: number;
  proofs: DynamicProof[];
};

export type SkillsRatingResult = {
  ok: boolean;
  runtime: { version: string; revision: string };
  ratings: SkillRating[];
  dynamic: null | {
    model: 'finite-evidence-v2';
    complete: boolean;
    generatedAt: string;
    configSha256: string;
    ratings: DynamicSkillRating[];
    checks: DynamicEvidenceCheck[];
  };
};
