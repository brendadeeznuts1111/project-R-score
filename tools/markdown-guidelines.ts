#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { MARKDOWN_PRESET_README, markdownHtml } from '../lib/markdown/options.ts';
import { relativePath, resolvePath } from '../lib/path-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const DEFAULT_GUIDELINES = [
  'AGENTS.md',
  'docs/AGENTS.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
] as const;

export type GuidelineCheck = {
  path: string;
  headings: number;
  duplicateHeadingIds: string[];
};

export function inspectGuidelineMarkdown(markdown: string): {
  html: string;
  headingIds: string[];
  duplicateHeadingIds: string[];
} {
  const html = markdownHtml(markdown, MARKDOWN_PRESET_README);
  const headingIds = Array.from(html.matchAll(/<h[1-6] id="([^"]+)"/g), match => match[1]!);
  const seen = new Set<string>();
  const duplicateHeadingIds = Array.from(
    new Set(headingIds.filter(headingId => (seen.has(headingId) ? true : !seen.add(headingId))))
  );
  return { html, headingIds, duplicateHeadingIds };
}

export async function checkGuidelineMarkdown(paths: readonly string[]): Promise<GuidelineCheck[]> {
  const checks: GuidelineCheck[] = [];
  for (const requestedPath of paths) {
    const absolutePath = resolvePath(ROOT, requestedPath);
    const repoRelative = relativePath(ROOT, absolutePath);
    if (repoRelative.startsWith('..'))
      throw new Error(`guideline path leaves repository: ${requestedPath}`);
    if (!(await Bun.file(absolutePath).exists()))
      throw new Error(`guideline does not exist: ${requestedPath}`);
    const markdown = await Bun.file(absolutePath).text();
    const inspection = inspectGuidelineMarkdown(markdown);
    if (!inspection.html.trim()) throw new Error(`guideline rendered empty: ${requestedPath}`);
    checks.push({
      path: repoRelative,
      headings: inspection.headingIds.length,
      duplicateHeadingIds: inspection.duplicateHeadingIds,
    });
  }
  return checks;
}

if (import.meta.main) {
  const requestedPaths = Bun.argv.slice(2);
  const checks = await checkGuidelineMarkdown(
    requestedPaths.length > 0 ? requestedPaths : DEFAULT_GUIDELINES
  );
  const failures = checks.filter(check => check.duplicateHeadingIds.length > 0);
  for (const check of checks) {
    const suffix =
      check.duplicateHeadingIds.length === 0
        ? ''
        : ` duplicate_heading_ids=${check.duplicateHeadingIds.join(',')}`;
    console.info(`markdown-guideline: ${check.path} headings=${check.headings}${suffix}`);
  }
  if (failures.length > 0) process.exitCode = 1;
}
