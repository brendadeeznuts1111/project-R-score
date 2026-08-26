// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
import { asReleaseKnowledgeExampleId } from '../../../lib/types/branded.ts';
import type { ReleaseKnowledgeExampleId } from '../../../lib/types/branded.ts';
import { blogUrlForVersion, normalizeVersion } from './generator.ts';
import { enrichKnowledgeExample } from './knowledge-enrichment.ts';
import { extractMarkdownCodeExamples, knowledgeSlug } from './knowledge-markdown.ts';
import { extractReleaseKnowledgeAst } from './knowledge-ast.ts';
import { validateReleaseTimestamp } from './knowledge-schema.ts';
import type {
  KnowledgeCatalogEntry,
  ReleaseKnowledge,
  ReleaseKnowledgeExample,
} from './knowledge-types.ts';

export function releaseKnowledgeExampleId(
  releaseVersion: string,
  feature: string,
  section: string,
  code: string
): ReleaseKnowledgeExampleId {
  const hash = Bun.hash.crc32(`${section}\u0000${code}`).toString(16).padStart(8, '0');
  return asReleaseKnowledgeExampleId(
    `bun-${normalizeVersion(releaseVersion)}-${knowledgeSlug(feature)}-${hash}`
  );
}

export function normalizeReleaseKnowledge(options: {
  version: string;
  sourceUrl: string;
  sourceMarkdownUrl: string;
  publishedAt: string;
  markdown: string;
  catalog: readonly KnowledgeCatalogEntry[];
}): ReleaseKnowledge {
  const releaseVersion = normalizeVersion(options.version);
  const sourceUrl = blogUrlForVersion(releaseVersion);
  if (options.sourceUrl !== sourceUrl) throw new Error(`Release source URL must be ${sourceUrl}`);
  const expectedMarkdownUrl = `${sourceUrl}.md`;
  if (options.sourceMarkdownUrl !== expectedMarkdownUrl) {
    throw new Error(`Release Markdown URL must be ${expectedMarkdownUrl}`);
  }
  const publishedAt = validateReleaseTimestamp(options.publishedAt);
  const examples = extractMarkdownCodeExamples(options.markdown).map(
    (example): ReleaseKnowledgeExample => {
      const enriched = enrichKnowledgeExample(example, options.catalog);
      const slot = `${knowledgeSlug(`${example.featureSection}-${example.section}`)}-${example.sectionOrdinal}`;
      return {
        id: releaseKnowledgeExampleId(
          releaseVersion,
          enriched.feature,
          example.section,
          example.code
        ),
        slot,
        feature: enriched.feature,
        section: example.section,
        purpose: enriched.purpose,
        language: example.language || 'text',
        code: example.code,
        stability: enriched.stability,
        api: enriched.api,
        dependencies: enriched.dependencies,
        runnable: enriched.runnable,
        requiresSetup: enriched.requiresSetup,
        docsLinks: enriched.docsLinks,
        sourceLine: example.sourceLine,
      };
    }
  );
  if (new Set(examples.map(example => example.id)).size !== examples.length) {
    throw new Error('Normalized release examples contain duplicate IDs');
  }
  const ast = extractReleaseKnowledgeAst(
    options.markdown,
    releaseVersion,
    new Map(examples.map(example => [example.sourceLine, example.id]))
  );
  return {
    schemaVersion: 2,
    runtime: 'bun',
    releaseVersion,
    sourceUrl,
    sourceMarkdownUrl: expectedMarkdownUrl,
    publishedAt,
    counts: {
      examples: examples.length,
      runnable: examples.filter(example => example.runnable).length,
      documented: examples.filter(example => example.docsLinks.length > 0).length,
      astNodes: ast.nodes.length,
    },
    examples,
    ast,
  };
}
