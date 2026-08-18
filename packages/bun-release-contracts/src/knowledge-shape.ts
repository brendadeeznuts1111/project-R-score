export type ReleaseKnowledgeShapeIssue = {
  code: 'required' | 'type' | 'value' | 'unknown-key';
  path: string;
  message: string;
};

const ROOT_KEYS = [
  'schemaVersion',
  'runtime',
  'releaseVersion',
  'sourceUrl',
  'sourceMarkdownUrl',
  'publishedAt',
  'counts',
  'examples',
] as const;
const COUNT_KEYS = ['examples', 'runnable', 'documented'] as const;
const EXAMPLE_KEYS = [
  'id',
  'slot',
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
] as const;
const STABILITIES = new Set([
  'stable',
  'experimental',
  'highly-experimental',
  'deprecated',
  'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function add(
  issues: ReleaseKnowledgeShapeIssue[],
  code: ReleaseKnowledgeShapeIssue['code'],
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function inspectKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) add(issues, 'unknown-key', `${path}.${key}`, `Unknown property ${key}`);
  }
}

function inspectNonEmptyString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  const item = value[key];
  if (item === undefined) add(issues, 'required', `${path}.${key}`, 'Property is required');
  else if (typeof item !== 'string') add(issues, 'type', `${path}.${key}`, 'Expected a string');
  else if (!item.length) add(issues, 'value', `${path}.${key}`, 'String must not be empty');
}

function parseStringArrayIssues(
  value: unknown,
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  if (!Array.isArray(value)) {
    add(issues, 'type', path, 'Expected an array of strings');
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string') add(issues, 'type', `${path}[${index}]`, 'Expected a string');
    else if (!item.length) add(issues, 'value', `${path}[${index}]`, 'String must not be empty');
  });
}

function parseCountsIssues(value: unknown, issues: ReleaseKnowledgeShapeIssue[]): void {
  if (!isRecord(value)) {
    add(issues, 'type', '$.counts', 'Expected an object');
    return;
  }
  inspectKeys(value, COUNT_KEYS, '$.counts', issues);
  for (const key of COUNT_KEYS) {
    const count = value[key];
    if (!Number.isSafeInteger(count) || Number(count) < 0) {
      add(issues, 'type', `$.counts.${key}`, 'Expected a non-negative safe integer');
    }
  }
}

function parseExampleIssues(
  value: unknown,
  index: number,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  const path = `$.examples[${index}]`;
  if (!isRecord(value)) {
    add(issues, 'type', path, 'Expected an object');
    return;
  }
  inspectKeys(value, EXAMPLE_KEYS, path, issues);
  for (const key of ['id', 'slot', 'feature', 'section', 'purpose', 'language', 'code']) {
    inspectNonEmptyString(value, key, path, issues);
  }
  if (!STABILITIES.has(String(value.stability))) {
    add(issues, 'value', `${path}.stability`, 'Expected a supported stability value');
  }
  for (const key of ['api', 'dependencies', 'requiresSetup', 'docsLinks']) {
    parseStringArrayIssues(value[key], `${path}.${key}`, issues);
  }
  if (typeof value.runnable !== 'boolean') {
    add(issues, 'type', `${path}.runnable`, 'Expected a boolean');
  }
  if (!Number.isSafeInteger(value.sourceLine)) {
    add(issues, 'type', `${path}.sourceLine`, 'Expected a safe integer');
  }
}

/** Recursively inspects the complete wire shape without throwing at the first defect. */
export function parseReleaseKnowledgeShapeIssues(input: unknown): ReleaseKnowledgeShapeIssue[] {
  const issues: ReleaseKnowledgeShapeIssue[] = [];
  if (!isRecord(input)) {
    add(issues, 'type', '$', 'Expected a release knowledge object');
    return issues;
  }
  inspectKeys(input, ROOT_KEYS, '$', issues);
  if (input.schemaVersion !== 1)
    add(issues, 'value', '$.schemaVersion', 'Expected schemaVersion 1');
  if (input.runtime !== 'bun') add(issues, 'value', '$.runtime', 'Expected runtime bun');
  for (const key of ['releaseVersion', 'sourceUrl', 'sourceMarkdownUrl', 'publishedAt']) {
    inspectNonEmptyString(input, key, '$', issues);
  }
  parseCountsIssues(input.counts, issues);
  if (!Array.isArray(input.examples)) {
    add(issues, 'type', '$.examples', 'Expected an array');
  } else {
    input.examples.forEach((example, index) => parseExampleIssues(example, index, issues));
  }
  return issues;
}
