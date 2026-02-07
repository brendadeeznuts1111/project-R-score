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
//   --json       JSON output
//   --fix        Show suggested fix for each issue
//   --verbose    Show passing checks
//   --no-color   Disable colors
//   -h, --help   Show help
//
// Exit codes: 0 = pass, 1 = errors found, 2 = usage error

import { Glob } from 'bun';

// ─── Types ───────────────────────────────────────────────────────────

interface Issue {
  type: 'url' | 'enum' | 'import';
  severity: 'error' | 'warning';
  file: string;
  line: number;
  message: string;
  fix?: string;
}

interface CheckResult {
  name: string;
  issues: Issue[];
  passed: number;
  failed: number;
}

// ─── CLI argument parsing ────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--') || a === '-h'));
const commands = args.filter(a => !a.startsWith('-'));

const showHelp = flags.has('--help') || flags.has('-h');
const jsonOutput = flags.has('--json');
const showFix = flags.has('--fix');
const verbose = flags.has('--verbose');
const noColor = flags.has('--no-color');

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
  --json       JSON output
  --fix        Show suggested fix for each issue
  --verbose    Show passing checks
  --no-color   Disable colors
  -h, --help   Show help

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
    blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m', reset: '\x1b[0m',
  };
  return `${codes[c] || ''}${text}${codes.reset}`;
}

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

const BROKEN_URL_PATTERNS: { pattern: RegExp; message: string; fix: string }[] = [
  {
    pattern: /bun\.sh\/feed\.xml/,
    message: 'bun.sh/feed.xml is a 404 — correct path is bun.sh/rss.xml',
    fix: 'Replace feed.xml with rss.xml',
  },
  {
    pattern: /https?:\/\/docs\.bun\.sh/,
    message: 'docs.bun.sh does not resolve (DNS NXDOMAIN)',
    fix: 'Use bun.sh/docs instead, or annotate with @planned',
  },
  {
    pattern: /https?:\/\/cdn\.bun\.sh/,
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

      for (const { pattern, message, fix } of BROKEN_URL_PATTERNS) {
        if (pattern.test(line)) {
          result.issues.push({
            type: 'url',
            severity: 'error',
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
  const reExportPattern = /export\s*\{.*(?:DocumentationProvider|DocumentationCategory|UrlType)/;
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

const BROKEN_IMPORT_PATTERNS: { pattern: RegExp; message: string; fix: string }[] = [
  {
    pattern: /from\s+['"].*\/documentation\/constants\//,
    message: 'Broken import: ../documentation/constants/ was renamed to ../docs/constants/',
    fix: 'Replace /documentation/constants/ with /docs/constants/',
  },
  {
    pattern: /from\s+['"].*\/documentation\/index/,
    message: 'Broken import: documentation/index was renamed to docs/documentation-index',
    fix: 'Replace /documentation/index with /docs/documentation-index',
  },
  {
    pattern: /from\s+['"].*\/documentation\/apis\//,
    message: 'Broken import: documentation/apis/ was renamed to docs/apis/',
    fix: 'Replace /documentation/apis/ with /docs/apis/',
  },
  {
    pattern: /from\s+['"].*\/documentation['";]/,
    message: 'Broken import: documentation/ barrel was renamed to docs/',
    fix: 'Replace /documentation with /docs/documentation-index',
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
      for (const { pattern, message, fix } of BROKEN_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          result.issues.push({
            type: 'import',
            severity: 'error',
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

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

  if (jsonOutput) {
    console.log(JSON.stringify({ results, totalIssues }, null, 2));
  } else {
    for (const r of results) {
      const icon = r.issues.length === 0 ? color('PASS', 'green') : color('FAIL', 'red');
      console.log(`\n${icon} ${r.name}: ${r.issues.length} issue(s)`);

      for (const issue of r.issues) {
        const loc = color(`${issue.file}:${issue.line}`, 'cyan');
        const sev = issue.severity === 'error' ? color('ERROR', 'red') : color('WARN', 'yellow');
        console.log(`  ${sev} ${loc} ${issue.message}`);
        if (showFix && issue.fix) {
          console.log(`    ${color('fix:', 'dim')} ${issue.fix}`);
        }
      }

      if (verbose && r.issues.length === 0) {
        console.log(`  ${color('All checks passed', 'green')}`);
      }
    }

    console.log(`\n${color('Total:', 'blue')} ${totalIssues} issue(s)`);
  }

  process.exit(totalIssues > 0 ? 1 : 0);
}

if (import.meta.main) run();
