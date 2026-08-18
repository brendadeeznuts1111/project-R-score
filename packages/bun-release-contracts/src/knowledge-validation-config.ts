// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
import type { ReleaseKnowledge } from './knowledge-types.ts';
import type {
  KnowledgeValidationConfig,
  KnowledgeValidationFileState,
  KnowledgeValidationFinding,
  KnowledgeValidationReport,
} from './knowledge-validation-types.ts';

export const KNOWLEDGE_VALIDATION_ENV = {
  strict: 'BUN_RELEASE_KNOWLEDGE_STRICT',
  maxWarnings: 'BUN_RELEASE_KNOWLEDGE_MAX_WARNINGS',
} as const;

export function knowledgeValidationConfig(
  env: { [key: string]: string | undefined } = Bun.env,
  overrides: Partial<KnowledgeValidationConfig> = {}
): KnowledgeValidationConfig {
  const rawMax = env[KNOWLEDGE_VALIDATION_ENV.maxWarnings] ?? '10';
  const maxWarnings = overrides.maxWarnings ?? Number(rawMax);
  if (!Number.isSafeInteger(maxWarnings) || maxWarnings < 0) {
    throw new Error(`${KNOWLEDGE_VALIDATION_ENV.maxWarnings} must be a non-negative integer`);
  }
  return {
    strict: overrides.strict ?? env[KNOWLEDGE_VALIDATION_ENV.strict] === 'true',
    maxWarnings,
  };
}

export function knowledgeValidationPasses(
  findings: readonly KnowledgeValidationFinding[],
  config: KnowledgeValidationConfig
): boolean {
  const errors = findings.filter(item => item.severity === 'error').length;
  const warnings = findings.filter(item => item.severity === 'warning').length;
  return errors === 0 && warnings <= config.maxWarnings && (!config.strict || warnings === 0);
}

export function buildKnowledgeValidationReport(options: {
  target: string;
  knowledge: ReleaseKnowledge | null;
  config: KnowledgeValidationConfig;
  files: { normalized: KnowledgeValidationFileState; source: KnowledgeValidationFileState | null };
  findings: KnowledgeValidationFinding[];
}): KnowledgeValidationReport {
  const errors = options.findings.filter(item => item.severity === 'error').length;
  const warnings = options.findings.filter(item => item.severity === 'warning').length;
  return {
    schemaVersion: 1,
    kind: 'bun-release-knowledge-validation',
    target: options.target,
    releaseVersion: options.knowledge?.releaseVersion ?? null,
    valid: knowledgeValidationPasses(options.findings, options.config),
    strict: options.config.strict,
    maxWarnings: options.config.maxWarnings,
    counts: { errors, warnings },
    files: options.files,
    findings: options.findings,
  };
}
