// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
import { resolve } from 'node:path';
import { blogUrlForVersion } from './generator.ts';
import { parseKnowledgeCatalog } from './knowledge-enrichment.ts';
import { normalizeReleaseKnowledge } from './knowledge-normalize.ts';
import {
  buildKnowledgeValidationReport,
  knowledgeValidationConfig,
} from './knowledge-validation-config.ts';
import {
  validateKnowledgeProvenance,
  validateKnowledgeSourceConsistency,
} from './knowledge-validation-consistency.ts';
import { parseReleaseKnowledgeValidation } from './knowledge-validation.ts';
import type {
  KnowledgeValidationConfig,
  KnowledgeValidationFileState,
  KnowledgeValidationFinding,
  KnowledgeValidationReport,
} from './knowledge-validation-types.ts';

type ReleaseFeedArtifact = {
  rss?: { entries?: Array<{ version?: unknown; url?: unknown; pubDate?: unknown }> };
};

export type KnowledgeValidationFileOptions = {
  sourcePath?: string;
  catalogPath: string;
  feedsPath: string;
  config?: Partial<KnowledgeValidationConfig>;
};

export async function releaseKnowledgeProvenance(
  version: string,
  feedsPath: string
): Promise<{ sourceUrl: string; publishedAt: string }> {
  const feeds = (await Bun.file(feedsPath).json()) as ReleaseFeedArtifact;
  const entry = feeds.rss?.entries?.find(candidate => candidate.version === version);
  if (!entry || typeof entry.url !== 'string' || typeof entry.pubDate !== 'string') {
    throw new Error(`No RSS provenance for Bun v${version} in ${feedsPath}`);
  }
  return { sourceUrl: entry.url, publishedAt: entry.pubDate };
}

function initialFileState(path: string): KnowledgeValidationFileState {
  return { path, exists: false, parseable: false, schemaValid: false };
}

function parseIoFinding(
  rule: 'file' | 'json' | 'provenance' | 'source-drift',
  path: string,
  error: unknown
): KnowledgeValidationFinding {
  return {
    rule,
    severity: 'error',
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function validateReleaseKnowledgeFile(
  inputPath: string,
  options: KnowledgeValidationFileOptions
): Promise<KnowledgeValidationReport> {
  const normalizedPath = resolve(inputPath);
  const normalized = initialFileState(normalizedPath);
  const source = options.sourcePath ? initialFileState(resolve(options.sourcePath)) : null;
  const findings: KnowledgeValidationFinding[] = [];
  const file = Bun.file(normalizedPath);
  normalized.exists = await file.exists();
  if (!normalized.exists) {
    findings.push(parseIoFinding('file', normalizedPath, 'Normalized artifact does not exist'));
    return buildKnowledgeValidationReport({
      target: normalizedPath,
      knowledge: null,
      config: knowledgeValidationConfig(Bun.env, options.config),
      files: { normalized, source },
      findings,
    });
  }

  let input: unknown;
  try {
    input = JSON.parse(await file.text());
    normalized.parseable = true;
  } catch (error) {
    findings.push(parseIoFinding('json', normalizedPath, error));
  }
  const result = normalized.parseable
    ? parseReleaseKnowledgeValidation(input)
    : { knowledge: null, findings: [] };
  normalized.schemaValid = result.knowledge !== null;
  findings.push(...result.findings);

  if (result.knowledge) {
    let provenance: { sourceUrl: string; publishedAt: string } | null = null;
    try {
      provenance = await releaseKnowledgeProvenance(
        result.knowledge.releaseVersion,
        resolve(options.feedsPath)
      );
      findings.push(...validateKnowledgeProvenance(result.knowledge, provenance));
    } catch (error) {
      findings.push(parseIoFinding('provenance', '$.publishedAt', error));
    }
    if (source) {
      source.exists = await Bun.file(source.path).exists();
      if (!source.exists) {
        findings.push(parseIoFinding('file', source.path, 'Markdown source does not exist'));
      } else if (provenance) {
        try {
          const [markdown, catalogInput] = await Promise.all([
            Bun.file(source.path).text(),
            Bun.file(resolve(options.catalogPath)).json(),
          ]);
          source.parseable = true;
          const expected = normalizeReleaseKnowledge({
            version: result.knowledge.releaseVersion,
            sourceUrl: provenance.sourceUrl,
            sourceMarkdownUrl: `${blogUrlForVersion(result.knowledge.releaseVersion)}.md`,
            publishedAt: provenance.publishedAt,
            markdown,
            catalog: parseKnowledgeCatalog(catalogInput),
          });
          source.schemaValid = true;
          findings.push(...validateKnowledgeSourceConsistency(result.knowledge, expected));
        } catch (error) {
          findings.push(parseIoFinding('source-drift', source.path, error));
        }
      }
    }
  }

  return buildKnowledgeValidationReport({
    target: normalizedPath,
    knowledge: result.knowledge,
    config: knowledgeValidationConfig(Bun.env, options.config),
    files: { normalized, source },
    findings,
  });
}

export async function validateReleaseKnowledgeDirectory(
  directory: string,
  options: Omit<KnowledgeValidationFileOptions, 'sourcePath'>
): Promise<KnowledgeValidationReport[]> {
  const root = resolve(directory);
  const paths: string[] = [];
  for await (const relativePath of new Bun.Glob('bun-v*.json').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    paths.push(resolve(root, relativePath));
  }
  paths.sort((left, right) => left.localeCompare(right));
  if (paths.length === 0) throw new Error(`No bun-v*.json knowledge artifacts found in ${root}`);
  return Promise.all(paths.map(path => validateReleaseKnowledgeFile(path, options)));
}
