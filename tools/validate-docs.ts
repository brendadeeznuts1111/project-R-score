#!/usr/bin/env bun

// tools/validate-docs.ts — Validation CLI for documentation health
//
// Usage:
//   bun tools/validate-docs.ts [command] [options]
//
// Commands:
//   urls      Check URL patterns for known-broken patterns (feed.xml, dead domains)
//   enums     Scan for duplicate enum definitions outside canonical source
//   imports   Find broken import paths (../documentation/ → ../docs/)
//   all       Run all checks (default)
//
// Options:
//   --json              JSON output
//   --fix               Show suggested fix for each issue
//   --source <sources>  Filter by error source (comma-separated, e.g. --source dns,cdn)
//   --verbose           Show passing checks
//   --no-color          Disable colors
//   -h, --help          Show help
//
// Exit codes: 0 = pass, 1 = errors found, 2 = usage error

import { Glob } from 'bun';

// ─── Types ───────────────────────────────────────────────────────────

/** Root cause of the issue */
export type ErrorSource =
  | 'dns'              // Domain does not resolve (e.g. docs.bun.sh, cdn.bun.sh)
  | 'provider_change'  // Provider restructured URLs (e.g. feed.xml → rss.xml)
  | 'cdn'              // CDN / static-asset domain issue
  | 'redirect'         // URL redirects to a different location
  | 'deleted_module'   // Source file was removed from the codebase
  | 'path_rename'      // Directory/file was renamed during reorg
  | 'duplicate_def'    // Same symbol defined in multiple places
  | 'planned'          // URL is intentionally fictional / not yet live
  | 'unknown';

export interface Issue {
  type: 'url' | 'enum' | 'import';
  severity: 'error' | 'warning';
  source: ErrorSource;
  file: string;
  line: number;
  message: string;
  fix?: string;
}

export interface CheckResult {
  name: string;
  issues: Issue[];
  passed: number;
  failed: number;
}

export interface ValidationReport {
  results: CheckResult[];
  totalIssues: number;
  /** Issue count grouped by error source */
  bySource: Record<ErrorSource, number>;
}

// ─── CLI argument parsing ────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--') || a === '-h'));
// Filter out flag values (e.g. the value after --source)
const flagsWithValues = new Set(['--source']);
const commands = args.filter((a, i) => !a.startsWith('-') && (i === 0 || !flagsWithValues.has(args[i - 1])));

const showHelp = flags.has('--help') || flags.has('-h');
const jsonOutput = flags.has('--json');
const showFix = flags.has('--fix');
const verbose = flags.has('--verbose');
const noColor = flags.has('--no-color');

// --source <value> filter (supports comma-separated: --source dns,cdn)
const VALID_SOURCES = ['dns', 'provider_change', 'cdn', 'redirect', 'deleted_module', 'path_rename', 'duplicate_def', 'planned', 'unknown'] as const;
const sourceIdx = args.indexOf('--source');
const sourceFilter: Set<ErrorSource> | null = (() => {
  if (sourceIdx === -1 || sourceIdx + 1 >= args.length) return null;
  const values = args[sourceIdx + 1].split(',').map(s => s.trim());
  const invalid = values.filter(v => !VALID_SOURCES.includes(v as any));
  if (invalid.length > 0) {
    console.error(`Unknown source(s): ${invalid.join(', ')}\nValid sources: ${VALID_SOURCES.join(', ')}`);
    process.exit(2);
  }
  return new Set(values as ErrorSource[]);
})();

const command = commands[0] || 'all';
const validCommands = ['urls', 'enums', 'imports', 'all'];

if (showHelp) {
  console.log(`Usage: bun tools/validate-docs.ts [command] [options]

Commands:
  urls      Check URL patterns for known-broken patterns (feed.xml, dead domains)
  enums     Scan for duplicate enum definitions outside canonical source
  imports   Find broken import paths (../documentation/ → ../docs/)
  all       Run all checks (default)

Options:
  --json              JSON output
  --fix               Show suggested fix for each issue
  --source <sources>  Filter by error source (comma-separated, e.g. --source dns,cdn)
  --verbose           Show passing checks
  --no-color          Disable colors
  -h, --help          Show help

Error sources tracked:
  dns              Domain does not resolve (NXDOMAIN)
  provider_change  Provider restructured their URL scheme
  cdn              CDN or static-asset domain issue
  redirect         URL redirects elsewhere
  deleted_module   Source file was removed from the codebase
  path_rename      Directory or file was renamed during reorg
  duplicate_def    Same symbol defined in multiple places
  planned          URL is intentionally fictional / not yet live

Exit codes: 0 = pass, 1 = errors found, 2 = usage error`);
  process.exit(0);
}

if (!validCommands.includes(command)) {
  console.error(`Unknown command: ${command}\nValid commands: ${validCommands.join(', ')}`);
  process.exit(2);
}

// ─── Color helpers ───────────────────────────────────────────────────

function color(text: string, c: string): string {
  if (noColor || jsonOutput) return text;
  const codes: Record<string, string> = {
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
    dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
  };
  return `${codes[c] || ''}${text}${codes.reset}`;
}

const SOURCE_LABELS: Record<ErrorSource, string> = {
  dns: 'DNS failure',
  provider_change: 'Provider URL change',
  cdn: 'CDN issue',
  redirect: 'Redirect',
  deleted_module: 'Deleted module',
  path_rename: 'Path rename',
  duplicate_def: 'Duplicate definition',
  planned: 'Planned / not live',
  unknown: 'Unknown',
};

// ─── File scanning helpers ───────────────────────────────────────────

const SCAN_DIRS = ['lib', 'server', 'cli', 'tests', 'scripts', 'examples', 'tools', 'src'];
const SCAN_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];

async function scanFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const ext of SCAN_EXTENSIONS) {
      const glob = new Glob(`${dir}/**/*.${ext}`);
      for await (const path of glob.scan('.')) {
        files.push(path);
      }
    }
  }
  return files;
}

async function readLines(filePath: string): Promise<string[]> {
  try {
    const content = await Bun.file(filePath).text();
    return content.split('\n');
  } catch {
    return [];
  }
}

// ─── URL pattern checker ─────────────────────────────────────────────

const BROKEN_URL_PATTERNS: { pattern: RegExp; source: ErrorSource; message: string; fix: string }[] = [
  {
    pattern: /bun\.sh\/feed\.xml/,
    source: 'provider_change',
    message: 'bun.sh/feed.xml is a 404 — correct path is bun.sh/rss.xml',
    fix: 'Replace feed.xml with rss.xml',
  },
  {
    pattern: /https?:\/\/docs\.bun\.sh/,
    source: 'dns',
    message: 'docs.bun.sh does not resolve (DNS NXDOMAIN)',
    fix: 'Use bun.sh/docs instead, or annotate with @planned',
  },
  {
    pattern: /https?:\/\/cdn\.bun\.sh/,
    source: 'cdn',
    message: 'cdn.bun.sh does not resolve (DNS NXDOMAIN)',
    fix: 'Use bun.sh instead, or annotate with @planned',
  },
];

export async function checkUrls(): Promise<CheckResult> {
  const result: CheckResult = { name: 'URL patterns', issues: [], passed: 0, failed: 0 };
  const files = await scanFiles();

  for (const filePath of files) {
    const lines = await readLines(filePath);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are already annotated with @planned
      if (line.includes('@planned')) continue;
      // Skip comments that document the issue itself (like in this tool)
      if (filePath === 'tools/validate-docs.ts') continue;

      for (const { pattern, source, message, fix } of BROKEN_URL_PATTERNS) {
        if (pattern.test(line)) {
          result.issues.push({
            type: 'url',
            severity: 'error',
            source,
            file: filePath,
            line: i + 1,
            message,
            fix,
          });
          result.failed++;
        }
      }
    }
  }

  result.passed = files.length - result.failed;
  return result;
}

// ─── Enum duplicate scanner ──────────────────────────────────────────

const CANONICAL_ENUM_PATH = 'lib/docs/constants/enums.ts';

export async function checkEnums(): Promise<CheckResult> {
  const result: CheckResult = { name: 'Enum definitions', issues: [], passed: 0, failed: 0 };
  const enumPattern = /^\s*export\s+enum\s+(DocumentationProvider|DocumentationCategory|UrlType)\b/;
  const files = await scanFiles();

  for (const filePath of files) {
    if (filePath === CANONICAL_ENUM_PATH) continue;

    const lines = await readLines(filePath);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(enumPattern);
      if (match) {
        result.issues.push({
          type: 'enum',
          severity: 'error',
          source: 'duplicate_def',
          file: filePath,
          line: i + 1,
          message: `Duplicate enum definition: ${match[1]} (canonical source is ${CANONICAL_ENUM_PATH})`,
          fix: `Replace with: import { ${match[1]} } from '${CANONICAL_ENUM_PATH}'`,
        });
        result.failed++;
      }
    }
  }

  result.passed = files.length - result.failed;
  return result;
}

// ─── Import path checker ─────────────────────────────────────────────

const BROKEN_IMPORT_PATTERNS: { pattern: RegExp; source: ErrorSource; message: string; fix: string }[] = [
  {
    pattern: /from\s+['"].*\/documentation\/constants\//,
    source: 'path_rename',
    message: 'Broken import: ../documentation/constants/ was renamed to ../docs/constants/',
    fix: 'Replace /documentation/constants/ with /docs/constants/',
  },
  {
    pattern: /from\s+['"].*\/documentation\/index/,
    source: 'path_rename',
    message: 'Broken import: documentation/index was renamed to docs/documentation-index',
    fix: 'Replace /documentation/index with /docs/documentation-index',
  },
  {
    pattern: /from\s+['"].*\/documentation\/apis\//,
    source: 'path_rename',
    message: 'Broken import: documentation/apis/ was renamed to docs/apis/',
    fix: 'Replace /documentation/apis/ with /docs/apis/',
  },
  {
    pattern: /from\s+['"].*\/documentation['";]/,
    source: 'path_rename',
    message: 'Broken import: documentation/ barrel was renamed to docs/',
    fix: 'Replace /documentation with /docs/documentation-index',
  },
  {
    pattern: /from\s+['"].*\/enums\/Provider\.enum/,
    source: 'deleted_module',
    message: 'Broken import: src/core/enums/Provider.enum.ts was deleted — enums consolidated into lib/docs/constants/enums.ts',
    fix: "Import from 'lib/docs/constants/enums' instead",
  },
  {
    pattern: /from\s+['"].*Provider\.enum/,
    source: 'deleted_module',
    message: 'Broken import: Provider.enum.ts was deleted — enums consolidated into lib/docs/constants/enums.ts',
    fix: "Import from 'lib/docs/constants/enums' instead",
  },
];

export async function checkImports(): Promise<CheckResult> {
  const result: CheckResult = { name: 'Import paths', issues: [], passed: 0, failed: 0 };
  const files = await scanFiles();

  for (const filePath of files) {
    // Skip this tool
    if (filePath === 'tools/validate-docs.ts') continue;

    const lines = await readLines(filePath);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, source, message, fix } of BROKEN_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          result.issues.push({
            type: 'import',
            severity: 'error',
            source,
            file: filePath,
            line: i + 1,
            message,
            fix,
          });
          result.failed++;
        }
      }
    }
  }

  result.passed = files.length - result.failed;
  return result;
}

// ─── Report builder ──────────────────────────────────────────────────

function buildReport(results: CheckResult[]): ValidationReport {
  // Apply --source filter if provided
  const filtered = sourceFilter
    ? results.map(r => ({
        ...r,
        issues: r.issues.filter(i => sourceFilter.has(i.source)),
        failed: r.issues.filter(i => sourceFilter.has(i.source)).length,
        passed: r.passed,
      }))
    : results;

  const allIssues = filtered.flatMap(r => r.issues);
  const bySource: Record<string, number> = {};

  for (const issue of allIssues) {
    bySource[issue.source] = (bySource[issue.source] || 0) + 1;
  }

  return {
    results: filtered,
    totalIssues: allIssues.length,
    bySource: bySource as Record<ErrorSource, number>,
  };
}

// ─── Runner ──────────────────────────────────────────────────────────

async function run() {
  const results: CheckResult[] = [];

  if (command === 'urls' || command === 'all') {
    results.push(await checkUrls());
  }
  if (command === 'enums' || command === 'all') {
    results.push(await checkEnums());
  }
  if (command === 'imports' || command === 'all') {
    results.push(await checkImports());
  }

  const report = buildReport(results);

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Per-check results (use filtered results from report)
    for (const r of report.results) {
      const icon = r.issues.length === 0 ? color('PASS', 'green') : color('FAIL', 'red');
      console.log(`\n${icon} ${r.name}: ${r.issues.length} issue(s)`);

      for (const issue of r.issues) {
        const loc = color(`${issue.file}:${issue.line}`, 'cyan');
        const sev = issue.severity === 'error' ? color('ERROR', 'red') : color('WARN', 'yellow');
        const src = color(`[${issue.source}]`, 'magenta');
        console.log(`  ${sev} ${src} ${loc} ${issue.message}`);
        if (showFix && issue.fix) {
          console.log(`    ${color('fix:', 'dim')} ${issue.fix}`);
        }
      }

      if (verbose && r.issues.length === 0) {
        console.log(`  ${color('All checks passed', 'green')}`);
      }
    }

    // Breakdown by error source
    const sourceCounts = Object.entries(report.bySource);
    if (sourceCounts.length > 0) {
      console.log(`\n${color('By error source:', 'bold')}`);
      for (const [src, count] of sourceCounts.sort((a, b) => b[1] - a[1])) {
        const label = SOURCE_LABELS[src as ErrorSource] || src;
        console.log(`  ${color(String(count), 'yellow')} ${label} ${color(`(${src})`, 'dim')}`);
      }
    }

    console.log(`\n${color('Total:', 'blue')} ${report.totalIssues} issue(s)`);
  }

  process.exit(report.totalIssues > 0 ? 1 : 0);
}

if (import.meta.main) run();
