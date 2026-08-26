import { parseReleaseKnowledgeExampleId } from '../../../lib/types/branded.ts';
import { blogUrlForVersion, normalizeVersion } from './generator.ts';
import { parseReleaseKnowledgeAst } from './knowledge-ast-wire.ts';
import { parseReleaseKnowledgeShapeIssues } from './knowledge-shape.ts';
import type {
  ExampleStability,
  ReleaseKnowledge,
  ReleaseKnowledgeExample,
} from './knowledge-types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function validateReleaseTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error(`Release publication timestamp must be canonical ISO-8601: ${value}`);
  }
  return value;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return [...value] as string[];
}

function parseExample(value: unknown, index: number): ReleaseKnowledgeExample {
  if (!isRecord(value)) throw new Error(`Release knowledge example ${index} must be an object`);
  const scalarKeys = ['id', 'slot', 'feature', 'section', 'purpose', 'language', 'code'] as const;
  for (const key of scalarKeys) {
    if (typeof value[key] !== 'string' || !value[key]) {
      throw new Error(`Release knowledge example ${index}.${key} must be a non-empty string`);
    }
  }
  const stability = value.stability;
  if (
    !['stable', 'experimental', 'highly-experimental', 'deprecated', 'unknown'].includes(
      String(stability)
    )
  ) {
    throw new Error(`Release knowledge example ${index} has invalid stability`);
  }
  if (typeof value.runnable !== 'boolean' || !Number.isSafeInteger(value.sourceLine)) {
    throw new Error(`Release knowledge example ${index} has invalid execution metadata`);
  }
  return {
    id: parseReleaseKnowledgeExampleId(value.id),
    slot: value.slot as string,
    feature: value.feature as string,
    section: value.section as string,
    purpose: value.purpose as string,
    language: value.language as string,
    code: value.code as string,
    stability: stability as ExampleStability,
    api: parseStringArray(value.api, `example ${index}.api`),
    dependencies: parseStringArray(value.dependencies, `example ${index}.dependencies`),
    runnable: value.runnable,
    requiresSetup: parseStringArray(value.requiresSetup, `example ${index}.requiresSetup`),
    docsLinks: parseStringArray(value.docsLinks, `example ${index}.docsLinks`),
    sourceLine: value.sourceLine as number,
  };
}

export function parseReleaseKnowledge(input: unknown): ReleaseKnowledge {
  const shapeIssues = parseReleaseKnowledgeShapeIssues(input);
  if (shapeIssues.length > 0) {
    throw new Error(
      `Release knowledge shape is invalid:\n${shapeIssues
        .map(issue => `${issue.path}: ${issue.message}`)
        .join('\n')}`
    );
  }
  if (
    !isRecord(input) ||
    (input.schemaVersion !== 1 && input.schemaVersion !== 2) ||
    input.runtime !== 'bun'
  ) {
    throw new Error('Release knowledge must use schemaVersion 1 or 2 and runtime bun');
  }
  if (
    typeof input.releaseVersion !== 'string' ||
    typeof input.sourceUrl !== 'string' ||
    typeof input.sourceMarkdownUrl !== 'string' ||
    typeof input.publishedAt !== 'string' ||
    !Array.isArray(input.examples)
  ) {
    throw new Error('Release knowledge metadata is invalid');
  }
  const releaseVersion = normalizeVersion(input.releaseVersion);
  const canonicalUrl = blogUrlForVersion(releaseVersion);
  if (input.sourceUrl !== canonicalUrl || input.sourceMarkdownUrl !== `${canonicalUrl}.md`) {
    throw new Error('Release knowledge source URLs are not canonical');
  }
  validateReleaseTimestamp(input.publishedAt);
  const examples = input.examples.map(parseExample);
  if (new Set(examples.map(example => example.id)).size !== examples.length) {
    throw new Error('Release knowledge contains duplicate IDs');
  }
  if (new Set(examples.map(example => example.slot)).size !== examples.length) {
    throw new Error('Release knowledge contains duplicate slots');
  }
  const ast = input.schemaVersion === 2 ? parseReleaseKnowledgeAst(input.ast) : undefined;
  const counts: ReleaseKnowledge['counts'] = {
    examples: examples.length,
    runnable: examples.filter(example => example.runnable).length,
    documented: examples.filter(example => example.docsLinks.length > 0).length,
  };
  if (ast) counts.astNodes = ast.nodes.length;
  if (!isRecord(input.counts) || JSON.stringify(input.counts) !== JSON.stringify(counts)) {
    throw new Error('Release knowledge counts are stale');
  }
  return {
    schemaVersion: input.schemaVersion,
    runtime: 'bun',
    releaseVersion,
    sourceUrl: canonicalUrl,
    sourceMarkdownUrl: `${canonicalUrl}.md`,
    publishedAt: input.publishedAt,
    counts,
    examples,
    ...(ast ? { ast } : {}),
  };
}

export function renderReleaseKnowledge(knowledge: ReleaseKnowledge): string {
  return `${JSON.stringify(knowledge, null, 2)}\n`;
}
