export type EvidenceTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

export type DecisionStatus = 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED';

export type EvidenceSource = {
  tier: EvidenceTier;
  reference: string;
  verified: boolean;
  verification_method: string;
};

export type EvidenceBenchmark = {
  name: string;
  result: number;
  threshold: number;
  unit?: string;
};

export type EvidenceRisk = {
  id: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
};

export type EvidenceMitigation = {
  id: string;
  owner: string;
  action: string;
};

export type RollbackPlan = {
  summary: string;
  command?: string;
};

export type DecisionEvidence = {
  decision_id: string;
  title: string;
  timestamp: string;
  expiry: string;
  status: DecisionStatus;
  evidence_score: number;
  evidence_digest: string;
  sources: EvidenceSource[];
  benchmarks: EvidenceBenchmark[];
  risks: EvidenceRisk[];
  mitigations: EvidenceMitigation[];
  rollback_plan: RollbackPlan;
};

export type DecisionIndexEntry = {
  decision_id: string;
  evidence_path: string;
  status: DecisionStatus;
  evidence_digest: string;
};

export type DecisionIndex = {
  decisions: DecisionIndexEntry[];
};

export type DecisionVerificationResult = {
  decisionId: string;
  evidencePath: string;
  digestExpected: string;
  digestComputed: string;
  digestMatches: boolean;
  hasT1: boolean;
  hasT2: boolean;
  expired: boolean;
  statusDeclared: DecisionStatus;
  statusExpected: DecisionStatus;
  valid: boolean;
  errors: string[];
};

