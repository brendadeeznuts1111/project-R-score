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
