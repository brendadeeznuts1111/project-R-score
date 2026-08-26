// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @updated Bun.deepEquals · changed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.deepEquals · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.deepEquals · fixed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.deepEquals · changed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · changed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @updated Bun.deepEquals · changed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.deepEquals · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-deepequals
import type { ReleaseKnowledge, ReleaseKnowledgeExample } from './knowledge-types.ts';
import type { KnowledgeValidationFinding } from './knowledge-validation-types.ts';

const EXAMPLE_COMPARE_KEYS = [
  'id',
  'feature',
  'section',
  'purpose',
  'language',
  'code',
  'stability',
  'api',
  'dependencies',
  'runnable',
  'requiresSetup',
  'docsLinks',
  'sourceLine',
] as const satisfies readonly (keyof ReleaseKnowledgeExample)[];

function errorFinding(
  rule: 'provenance' | 'source-count' | 'source-drift',
  path: string,
  message: string
): KnowledgeValidationFinding {
  return { rule, severity: 'error', path, message };
}

export function validateKnowledgeProvenance(
  knowledge: ReleaseKnowledge,
  expected: { sourceUrl: string; publishedAt: string }
): KnowledgeValidationFinding[] {
  const findings: KnowledgeValidationFinding[] = [];
  if (knowledge.sourceUrl !== expected.sourceUrl)
    findings.push(errorFinding('provenance', '$.sourceUrl', `Expected ${expected.sourceUrl}`));
  if (knowledge.publishedAt !== expected.publishedAt)
    findings.push(errorFinding('provenance', '$.publishedAt', `Expected ${expected.publishedAt}`));
  return findings;
}

export function validateKnowledgeSourceConsistency(
  actual: ReleaseKnowledge,
  expected: ReleaseKnowledge
): KnowledgeValidationFinding[] {
  const findings: KnowledgeValidationFinding[] = [];
  if (!Bun.deepEquals(actual.ast, expected.ast, true)) {
    findings.push(
      errorFinding(
        'source-drift',
        '$.ast',
        'Structural AST differs from normalized Markdown source'
      )
    );
  }
  if (actual.examples.length !== expected.examples.length) {
    findings.push(
      errorFinding(
        'source-count',
        '$.counts.examples',
        `Source contains ${expected.examples.length} examples; artifact contains ${actual.examples.length}`
      )
    );
  }
  const actualBySlot = new Map(actual.examples.map(example => [example.slot, example]));
  for (const expectedExample of expected.examples) {
    const path = `$.examples[slot=${expectedExample.slot}]`;
    const actualExample = actualBySlot.get(expectedExample.slot);
    if (!actualExample) {
      findings.push(errorFinding('source-drift', path, 'Normalized source example is missing'));
      continue;
    }
    for (const key of EXAMPLE_COMPARE_KEYS) {
      if (JSON.stringify(actualExample[key]) !== JSON.stringify(expectedExample[key])) {
        findings.push(
          errorFinding(
            'source-drift',
            `${path}.${key}`,
            'Value differs from normalized Markdown source'
          )
        );
      }
    }
    actualBySlot.delete(expectedExample.slot);
  }
  for (const slot of actualBySlot.keys()) {
    findings.push(
      errorFinding(
        'source-drift',
        `$.examples[slot=${slot}]`,
        'Artifact example is absent from Markdown source'
      )
    );
  }
  return findings;
}
