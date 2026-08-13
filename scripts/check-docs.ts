#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — structural callbacks
// @see https://bun.com/reference/bun/markdown — callback and metadata types
/**
 * Repository Markdown contract.
 *
 * Bun.markdown is deliberately the parser authority. This file adds repository
 * policy that a permissive renderer cannot provide: empty-link, table-shape,
 * duplicate-anchor, local-target, and fragment checks.
 */

import {
  dirnamePath,
  extnamePath,
  joinPath,
  normalizePath,
  relativePath,
  resolvePath,
} from '../lib/path-bun.ts';

export type MarkdownIssueKind =
  'duplicate-anchor' | 'empty-link' | 'malformed-table' | 'missing-anchor' | 'missing-file';

export type MarkdownIssue = {
  file: string;
  line: number;
  kind: MarkdownIssueKind;
  detail: string;
};

type ParsedDocument = {
  anchors: Set<string>;
  duplicateAnchors: Array<{ anchor: string; line: number }>;
  links: Array<{ href: string; line: number }>;
};

const REPO_ROOT = resolvePath(import.meta.dir, '..');
const BASELINE_PATH = joinPath(import.meta.dir, 'markdown-contract-baseline.json');
const DEFAULT_EXCLUDED_PREFIXES = ['docs/archives/', 'public/'] as const;

const DEFAULT_INCLUDED_PREFIXES = ['.github/', 'docs/', 'lib/'] as const;

function lineAt(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split('\n').length;
}

function firstLineContaining(text: string, needle: string): number {
  const offset = text.indexOf(needle);
  return offset < 0 ? 1 : lineAt(text, offset);
}

function normalizeFragment(value: string): string {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function explicitAnchors(text: string): Array<{ anchor: string; line: number }> {
  const anchors: Array<{ anchor: string; line: number }> = [];
  const pattern = /<(?:a\s+[^>]*?name|[a-z][\w:-]*\s+[^>]*?id)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(pattern)) {
    anchors.push({ anchor: normalizeFragment(match[1]!), line: lineAt(text, match.index ?? 0) });
  }
  return anchors;
}

/** Parse headings and links through Bun's runtime, then add explicit HTML anchors. */
export function parseMarkdownDocument(text: string): ParsedDocument {
  const anchors = new Set<string>();
  const duplicateAnchors: ParsedDocument['duplicateAnchors'] = [];
  const links: ParsedDocument['links'] = [];
  const headingOccurrences = new Map<string, number>();

  Bun.markdown.render(
    text,
    {
      heading(children, meta) {
        if (meta.id) {
          const base = normalizeFragment(meta.id);
          const occurrence = headingOccurrences.get(base) ?? 0;
          headingOccurrences.set(base, occurrence + 1);
          // GitHub suffixes repeated generated heading anchors. Preserve that
          // behavior while still treating repeated explicit IDs as errors.
          anchors.add(occurrence === 0 ? base : `${base}-${occurrence}`);
        }
        return children;
      },
      link(children, meta) {
        const link = { href: meta.href, line: firstLineContaining(text, meta.href) };
        if (!links.some(item => item.href === link.href && item.line === link.line))
          links.push(link);
        return children;
      },
    },
    { headings: { ids: true }, tables: true }
  );

  for (const { anchor, line } of explicitAnchors(text)) {
    if (anchors.has(anchor)) duplicateAnchors.push({ anchor, line });
    anchors.add(anchor);
  }

  return { anchors, duplicateAnchors, links };
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  let codeFence = false;
  for (const char of trimmed) {
    if (escaped) {
      cell += char;
      escaped = false;
    } else if (char === '\\') {
      cell += char;
      escaped = true;
    } else if (char === '`') {
      codeFence = !codeFence;
      cell += char;
    } else if (char === '|' && !codeFence) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isTableDelimiter(line: string): boolean {
  if (!line.includes('|')) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function tableIssues(file: string, text: string): MarkdownIssue[] {
  const issues: MarkdownIssue[] = [];
  const lines = text.split('\n');
  let inFence = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !isTableDelimiter(line)) continue;
    const header = lines[index - 1] ?? '';
    const delimiterColumns = splitTableRow(line).length;
    if (!header.includes('|') || splitTableRow(header).length !== delimiterColumns) {
      issues.push({
        file,
        line: index + 1,
        kind: 'malformed-table',
        detail: 'delimiter row does not match the header column count',
      });
      continue;
    }
    const indent = header.match(/^\s*/)?.[0].length ?? 0;
    const probe = [header, line, lines[index + 1] ?? '']
      .map(value => value.slice(Math.min(indent, value.match(/^\s*/)?.[0].length ?? 0)))
      .join('\n');
    if (!Bun.markdown.html(probe, { tables: true }).includes('<table')) {
      issues.push({
        file,
        line: index + 1,
        kind: 'malformed-table',
        detail: 'Bun.markdown did not recognize this delimiter as a table',
      });
    }
  }
  return issues;
}

function emptyLinkIssues(file: string, text: string): MarkdownIssue[] {
  const issues: MarkdownIssue[] = [];
  const searchable = text
    .replace(/^(\s*)(```|~~~)[\s\S]*?^\s*\2\s*$/gm, match => match.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, match => ' '.repeat(match.length));
  // Covers inline links/images. Reference definitions are checked separately.
  const inline = /!?\[[^\]]*\]\(\s*(?:["'][^"']*["'])?\s*\)/g;
  for (const match of searchable.matchAll(inline)) {
    issues.push({
      file,
      line: lineAt(text, match.index ?? 0),
      kind: 'empty-link',
      detail: `empty destination in ${match[0]}`,
    });
  }
  const reference = /^\s*\[[^\]]+\]:\s*(?:["'][^"']*["'])?\s*$/gm;
  for (const match of searchable.matchAll(reference)) {
    issues.push({
      file,
      line: lineAt(text, match.index ?? 0),
      kind: 'empty-link',
      detail: 'reference link has an empty destination',
    });
  }
  return issues;
}

function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
}

function repoRelative(absolutePath: string): string {
  return relativePath(REPO_ROOT, absolutePath).replaceAll('\\', '/');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).stat();
    return true;
  } catch {
    return false;
  }
}

async function resolveMarkdownTarget(
  sourceFile: string,
  href: string
): Promise<{ file?: string; fragment?: string }> {
  const [rawPath = '', rawFragment] = href.split('#', 2);
  if (!rawPath) return { file: sourceFile, fragment: rawFragment };
  if (/[<>{}]/.test(rawPath)) return {};
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath.split('?')[0]!);
  } catch {
    decoded = rawPath.split('?')[0]!;
  }
  const absolute = decoded.startsWith('/')
    ? resolvePath(REPO_ROOT, decoded.replace(/^\/+/, ''))
    : resolvePath(REPO_ROOT, dirnamePath(sourceFile), decoded);
  const target = repoRelative(normalizePath(absolute));
  if (target.startsWith('../')) return {};
  if (extnamePath(target).toLowerCase() !== '.md') return { file: target };
  return { file: target, fragment: rawFragment };
}

const documentCache = new Map<string, ParsedDocument>();

async function loadDocument(file: string): Promise<ParsedDocument | undefined> {
  const cached = documentCache.get(file);
  if (cached) return cached;
  const source = Bun.file(joinPath(REPO_ROOT, file));
  if (!(await pathExists(joinPath(REPO_ROOT, file)))) return undefined;
  const parsed = parseMarkdownDocument(await source.text());
  documentCache.set(file, parsed);
  return parsed;
}

export async function validateMarkdownFile(file: string): Promise<MarkdownIssue[]> {
  const normalizedFile = file.replace(/^\.\//, '').replaceAll('\\', '/');
  const source = Bun.file(joinPath(REPO_ROOT, normalizedFile));
  if (!(await pathExists(joinPath(REPO_ROOT, normalizedFile)))) {
    return [{ file: normalizedFile, line: 1, kind: 'missing-file', detail: 'file not found' }];
  }
  const text = await source.text();
  const parsed = parseMarkdownDocument(text);
  documentCache.set(normalizedFile, parsed);
  const issues: MarkdownIssue[] = [
    ...emptyLinkIssues(normalizedFile, text),
    ...tableIssues(normalizedFile, text),
    ...parsed.links
      .filter(({ href }) => href.trim() === '')
      .map(({ line }) => ({
        file: normalizedFile,
        line,
        kind: 'empty-link' as const,
        detail: 'Bun.markdown parsed an empty link destination',
      })),
    ...parsed.duplicateAnchors.map(({ anchor, line }) => ({
      file: normalizedFile,
      line,
      kind: 'duplicate-anchor' as const,
      detail: `duplicate explicit anchor #${anchor}`,
    })),
  ];

  for (const { href, line } of parsed.links) {
    const trimmed = href.trim();
    if (!trimmed || isExternal(trimmed)) continue;
    const target = await resolveMarkdownTarget(normalizedFile, trimmed);
    if (!target.file) continue;
    // Reports are ephemeral proof outputs, not source-controlled documentation
    // targets. Their lifecycle is owned by the command that emits them.
    if (target.file.startsWith('reports/')) continue;
    if (!(await pathExists(joinPath(REPO_ROOT, target.file)))) {
      issues.push({
        file: normalizedFile,
        line,
        kind: 'missing-file',
        detail: `${trimmed} resolves to missing ${target.file}`,
      });
      continue;
    }
    if (!target.fragment || extnamePath(target.file).toLowerCase() !== '.md') continue;
    const targetDocument = await loadDocument(target.file);
    const fragment = normalizeFragment(target.fragment);
    if (targetDocument && !targetDocument.anchors.has(fragment)) {
      issues.push({
        file: normalizedFile,
        line,
        kind: 'missing-anchor',
        detail: `${trimmed} targets absent #${fragment} in ${target.file}`,
      });
    }
  }
  return issues;
}

function defaultMarkdownFiles(): string[] {
  const result = Bun.spawnSync(['git', 'ls-files', '-z', '--', '*.md'], {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim());
  return result.stdout
    .toString()
    .split('\0')
    .filter(Boolean)
    .filter(
      file =>
        !file.includes('/') || DEFAULT_INCLUDED_PREFIXES.some(prefix => file.startsWith(prefix))
    )
    .filter(file => !DEFAULT_EXCLUDED_PREFIXES.some(prefix => file.startsWith(prefix)));
}

export async function runMarkdownCheck(files: string[]): Promise<MarkdownIssue[]> {
  const uniqueFiles = [...new Set(files)].filter(file => file.toLowerCase().endsWith('.md'));
  const issueSets = await Promise.all(uniqueFiles.map(validateMarkdownFile));
  return issueSets
    .flat()
    .sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
}

function issueFingerprint(issue: MarkdownIssue): string {
  // Line numbers are diagnostic only: formatting a document must not turn an
  // unchanged legacy finding into one new and one stale ratchet row.
  return `${issue.file}:${issue.kind}:${issue.detail}`;
}

async function readBaseline(): Promise<Set<string>> {
  const file = Bun.file(BASELINE_PATH);
  if (!(await file.exists())) return new Set();
  const payload = (await file.json()) as { issues?: string[] };
  return new Set(payload.issues ?? []);
}

if (import.meta.main) {
  const requested = Bun.argv.slice(2).filter(arg => arg !== '--');
  const files = requested.length > 0 ? requested : defaultMarkdownFiles();
  const issues = await runMarkdownCheck(files);
  const baseline = await readBaseline();
  const current = new Set(issues.map(issueFingerprint));
  const newIssues = issues.filter(issue => !baseline.has(issueFingerprint(issue)));
  const staleBaseline =
    requested.length === 0 ? [...baseline].filter(row => !current.has(row)) : [];
  for (const issue of newIssues) {
    console.error(`${issue.file}:${issue.line} [${issue.kind}] ${issue.detail}`);
  }
  for (const stale of staleBaseline) console.error(`[stale-baseline] ${stale}`);
  if (newIssues.length > 0 || staleBaseline.length > 0) {
    console.error(
      `Markdown contract failed: ${newIssues.length} new issue(s), ${staleBaseline.length} stale baseline row(s).`
    );
    process.exit(1);
  }
  console.info(
    `Markdown contract passed: ${files.length} file(s), ${issues.length} ratcheted legacy issue(s).`
  );
}
