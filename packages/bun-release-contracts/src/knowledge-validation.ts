import { releaseKnowledgeExampleId } from './knowledge-normalize.ts';
import { parseReleaseKnowledge } from './knowledge-schema.ts';
import { parseReleaseKnowledgeShapeIssues } from './knowledge-shape.ts';
import type { ReleaseKnowledge, ReleaseKnowledgeExample } from './knowledge-types.ts';
import type {
  KnowledgeValidationFinding,
  KnowledgeValidationResult,
} from './knowledge-validation-types.ts';

const VALID_LANGUAGES = new Set([
  'bash',
  'c',
  'cpp',
  'css',
  'html',
  'js',
  'jsx',
  'json',
  'jsonc',
  'md',
  'python',
  'rust',
  'sh',
  'sql',
  'text',
  'toml',
  'ts',
  'tsx',
  'txt',
  'yaml',
  'zig',
]);

function finding(
  rule: KnowledgeValidationFinding['rule'],
  severity: KnowledgeValidationFinding['severity'],
  path: string,
  message: string
): KnowledgeValidationFinding {
  return { rule, severity, path, message };
}

function inspectSortedUnique(
  values: readonly string[],
  path: string,
  findings: KnowledgeValidationFinding[],
  compare?: (left: string, right: string) => number
): void {
  if (new Set(values).size !== values.length) {
    findings.push(finding('ordering', 'error', path, 'Values must be unique'));
  }
  const sorted = compare ? [...values].sort(compare) : [...values].sort();
  if (JSON.stringify(values) !== JSON.stringify(sorted)) {
    findings.push(finding('ordering', 'error', path, 'Values must be sorted'));
  }
}

function inspectExampleSemantics(
  knowledge: ReleaseKnowledge,
  example: ReleaseKnowledgeExample,
  index: number,
  findings: KnowledgeValidationFinding[]
): void {
  const path = `$.examples[${index}]`;
  for (const key of ['feature', 'section', 'purpose', 'language', 'code'] as const) {
    if (!example[key].trim())
      findings.push(finding('content', 'error', `${path}.${key}`, 'Value must not be blank'));
  }
  if (!VALID_LANGUAGES.has(example.language.toLowerCase())) {
    findings.push(
      finding('language', 'warning', `${path}.language`, `Unknown language ${example.language}`)
    );
  }
  const expectedId = releaseKnowledgeExampleId(
    knowledge.releaseVersion,
    example.feature,
    example.section,
    example.code
  );
  if (example.id !== expectedId) {
    findings.push(
      finding('schema', 'error', `${path}.id`, `Expected deterministic ID ${expectedId}`)
    );
  }
  for (const key of ['api', 'dependencies', 'requiresSetup', 'docsLinks'] as const) {
    inspectSortedUnique(
      example[key],
      `${path}.${key}`,
      findings,
      key === 'api' ? (left, right) => left.localeCompare(right) : undefined
    );
  }
  if (example.runnable !== (example.requiresSetup.length === 0)) {
    findings.push(
      finding(
        'execution-metadata',
        'error',
        `${path}.runnable`,
        'runnable must be true exactly when requiresSetup is empty'
      )
    );
  }
  example.docsLinks.forEach((link, linkIndex) => {
    if (
      !URL.canParse(link) ||
      new URL(link).protocol !== 'https:' ||
      new URL(link).hostname !== 'bun.com'
    ) {
      findings.push(
        finding(
          'documentation',
          'error',
          `${path}.docsLinks[${linkIndex}]`,
          'Expected an official HTTPS bun.com URL'
        )
      );
    }
  });
  if (example.stability === 'stable' && example.docsLinks.length === 0) {
    findings.push(
      finding(
        'documentation',
        'warning',
        `${path}.docsLinks`,
        'Stable example has no catalog documentation link'
      )
    );
  }
  if (example.stability === 'unknown') {
    findings.push(
      finding('stability', 'warning', `${path}.stability`, 'Stability could not be classified')
    );
  }
  if (example.stability === 'deprecated' && example.runnable) {
    findings.push(
      finding('stability', 'warning', `${path}.runnable`, 'Deprecated example is marked runnable')
    );
  }
}

/** Validates a parsed JSON value at the wire boundary and returns every shape defect. */
export function parseReleaseKnowledgeValidation(input: unknown): KnowledgeValidationResult {
  const findings = parseReleaseKnowledgeShapeIssues(input).map(issue =>
    finding('shape', 'error', issue.path, issue.message)
  );
  if (findings.length > 0) return { knowledge: null, findings };
  let knowledge: ReleaseKnowledge;
  try {
    knowledge = parseReleaseKnowledge(input);
  } catch (error) {
    return {
      knowledge: null,
      findings: [
        finding('schema', 'error', '$', error instanceof Error ? error.message : String(error)),
      ],
    };
  }
  knowledge.examples.forEach((example, index) =>
    inspectExampleSemantics(knowledge, example, index, findings)
  );
  knowledge.examples.forEach((example, index) => {
    if (example.sourceLine <= 0) {
      findings.push(
        finding(
          'ordering',
          'error',
          `$.examples[${index}].sourceLine`,
          'Source line must be positive'
        )
      );
    }
    if (index > 0 && example.sourceLine <= knowledge.examples[index - 1]!.sourceLine) {
      findings.push(
        finding(
          'ordering',
          'error',
          `$.examples[${index}].sourceLine`,
          'Source lines must increase in document order'
        )
      );
    }
  });
  return { knowledge, findings };
}
