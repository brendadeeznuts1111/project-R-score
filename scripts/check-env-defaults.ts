#!/usr/bin/env bun
// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * check-env-defaults.ts — Bun.env.* hygiene gate.
 *
 * Goals (realistic):
 *  - Flag optional *config* reads that crash when unset (no fallback).
 *  - Do **not** flag process ambient vars (TZ, FORCE_COLOR, PWD, …).
 *  - Do **not** flag intentional required secrets (TOKEN/SECRET/…) — those
 *    should fail loud or go through requireXxx helpers / vault inject.
 *  - Do **not** flag JSDoc/comment mentions.
 *  - Default scope is harness surface; pre-commit uses --staged.
 *
 *   bun scripts/check-env-defaults.ts              # lib/config/scripts/tools
 *   bun scripts/check-env-defaults.ts --staged     # pre-commit
 *   bun scripts/check-env-defaults.ts --full       # whole tree (noisy)
 *   bun scripts/check-env-defaults.ts --summary
 *   bun scripts/check-env-defaults.ts --dry-run    # report, exit 0
 */
import { Glob } from 'bun';
import { relative, resolve } from 'node:path';

const ROOT = process.cwd();
const argv = Bun.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run') || argv.includes('--dry');
const STAGED = argv.includes('--staged');
const FULL = argv.includes('--full');
const SUMMARY = argv.includes('--summary');
const JSON_OUT = argv.includes('--json');

/** Default scan roots (harness plane). */
const DEFAULT_ROOTS = ['lib', 'config', 'scripts', 'tools'];

const IGNORE_DIR_PARTS = [
  '/node_modules/',
  '/.git/',
  '/.cache/',
  '/__snapshots__/',
  '/public/',
  '/dist/',
  '/.grok/',
  '/coverage/',
];

const IGNORE_FILE_RE = [
  /\.test\./,
  /\.spec\./,
  /\.bench\./,
  /\.d\.ts$/,
  /fixtures\//,
  /__tests__\//,
  /check-env-defaults\.ts$/,
];

/** Process / host ambient — presence is optional by design. */
const PROCESS_AMBIENT = new Set([
  'HOME',
  'PATH',
  'PWD',
  'USER',
  'SHELL',
  'TMPDIR',
  'TEMP',
  'TMP',
  'TERM',
  'TERM_PROGRAM',
  'COLORTERM',
  'LANG',
  'LC_ALL',
  'TZ',
  'CI',
  'GITHUB_ACTIONS',
  'GITHUB_WORKSPACE',
  'RUNNER_OS',
  'FORCE_COLOR',
  'NO_COLOR',
  'DEBUG',
  'NODE_ENV',
  'NODE_OPTIONS',
  'BUN_DEBUG',
  'BUN_CONFIG_VERBOSE_FETCH',
  'BUN_INSTALL',
  'BUN_INSTALL_CACHE_DIR',
  'EDITOR',
  'VISUAL',
  'SSH_AUTH_SOCK',
  'DISPLAY',
  'XPC_SERVICE_NAME',
  'LOGNAME',
  'HOSTNAME',
  'HOST',
  'PORT', // often framework-injected
  'GITHUB_STEP_SUMMARY',
  'GITHUB_OUTPUT',
  'GITHUB_ENV',
  'GITHUB_PATH',
  'GITHUB_STATE',
  'RUNNER_TEMP',
  'RUNNER_TOOL_CACHE',
]);

/** Name patterns that are secrets/credentials — missing should fail loud, not silent-default. */
const REQUIRED_SECRET_RE =
  /(TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|ACCESS_KEY|KEY_ID|CREDENTIAL|WEBHOOK|PAT\b|AUTH_KEY|SESSION_KEY|_KEY$|_KEYS$)/i;

const ENV_RE = /\bBun\.env\.([A-Z_][A-Z0-9_]*)\b/g;

/** Same-line / nearby evidence that the read is optional or guarded. */
function hasFallbackOrGuard(line: string, prev: string, following: string[]): boolean {
  const next = following[0] ?? '';
  const window = `${prev}\n${line}\n${following.join('\n')}`;

  // Writes are not config reads
  if (/Bun\.env\.[A-Z0-9_]+\s*=/.test(line)) return true;
  // Snippet inside a template-string sample (ends with ` or `,)
  if (/`\s*,?\s*$/.test(line.trim()) || /`\s*;\s*$/.test(line.trim())) return true;

  // Non-null assertion → caller requires the var (showcase / require path)
  if (/Bun\.env\.[A-Z0-9_]+\s*!/.test(line)) return true;
  // Default parameter: (raw = Bun.env.FOO) — undefined is intentional
  if (/=\s*Bun\.env\.[A-Z0-9_]+/.test(line)) return true;
  // Object field pass-through: { registryPath: Bun.env.FOO } — undefined OK for optional opts
  if (/:\s*Bun\.env\.[A-Z0-9_]+/.test(line)) return true;
  // typeof / ternary guards spanning nearby lines
  if (/typeof\s+Bun\.env\./.test(window)) return true;
  if (/\?\s*Bun\.env\./.test(window) && /:/.test(window)) return true;

  // Classic defaults
  if (/\|\|/.test(line) || /\?\?/.test(line)) return true;
  // Number(Bun.env.X || n) / parseInt(..., 10) with || on same or next
  if (/Number\s*\(\s*Bun\.env\./.test(line) && /\|\|/.test(line)) return true;
  if (/parseInt\s*\(\s*Bun\.env\./.test(line)) return true;
  // Helpers that take (env, fallback)
  if (
    /\b(parseBooleanEnv|parseBoolEnv|coerceNum|coerceNumber|envOr|readEnv|getEnv|parseEnv|boolEnv|numEnv)\s*\(/.test(
      line
    ) &&
    /Bun\.env\./.test(line)
  ) {
    return true;
  }
  // Second-arg default: fn(Bun.env.X, 75) / fn(Bun.env.X, true)
  if (/Bun\.env\.[A-Z0-9_]+\s*,\s*(\d+|true|false|null|['"`])/.test(line)) return true;
  // Boolean / truthiness checks
  if (/if\s*\(.*Bun\.env\./.test(line)) return true;
  if (/Bun\.env\.[A-Z0-9_]+\s*(&&|\|\||\?)/.test(line)) return true;
  if (/Bun\.env\.[A-Z0-9_]+\s*(===|!==|==|!=)/.test(line)) return true;
  if (/!\s*Bun\.env\./.test(line)) return true;
  if (/\bBoolean\s*\(\s*Bun\.env\./.test(line)) return true;
  // Optional chain on related env access
  if (/Bun\.env\.[A-Z0-9_]+\?/.test(line)) return true;
  // Explicit undefined/null coalescing in window
  if (/\?\?/.test(window) && /Bun\.env\./.test(window)) return true;
  // require* / assert* / throw nearby (required by design)
  if (/\b(require|assert|must|ensure)[A-Z(]/.test(window)) return true;
  if (/\bthrow\b/.test(window) && /Bun\.env\./.test(window)) return true;
  // SSOT helpers
  if (/CLOUDFLARE_DEFAULTS|R2_CONFIG|DEFAULT_|envOr|readEnv|getEnv|parseEnv/.test(window))
    return true;

  // const x = Bun.env.FOO; … if (!x || !y) return null (look ahead ~8 lines)
  const constMatch = line.match(/\bconst\s+(\w+)\s*=\s*Bun\.env\.[A-Z0-9_]+/);
  if (constMatch) {
    const name = constMatch[1]!;
    const rest = following.slice(0, 8).join('\n');
    if (new RegExp(String.raw`if\s*\([^)]*!\s*${name}\b`).test(rest)) return true;
    if (
      new RegExp(String.raw`if\s*\([^)]*\b${name}\b`).test(rest) &&
      /\b(return null|return;|throw )\b/.test(rest)
    ) {
      return true;
    }
  }

  return false;
}

function isCommentOrDoc(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith('//') ||
    t.startsWith('*') ||
    t.startsWith('/*') ||
    t.startsWith('·') || // rare
    /^export\s+(type|interface)\b/.test(t)
  );
}

type Issue = {
  file: string;
  line: number;
  envVar: string;
  text: string;
};

async function stagedTsFiles(): Promise<string[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.endsWith('.ts') && !s.endsWith('.d.ts'))
    .map(s => resolve(ROOT, s));
}

async function collectFiles(): Promise<string[]> {
  if (STAGED) {
    const files = await stagedTsFiles();
    return files.filter(f => {
      if (IGNORE_FILE_RE.some(re => re.test(f))) return false;
      if (IGNORE_DIR_PARTS.some(p => f.includes(p))) return false;
      return true;
    });
  }

  const roots = FULL ? ['.'] : DEFAULT_ROOTS;
  const found: string[] = [];
  const glob = new Glob('**/*.ts');

  for (const root of roots) {
    const base = resolve(ROOT, root);
    try {
      for await (const file of glob.scan({ cwd: base, absolute: true })) {
        if (IGNORE_DIR_PARTS.some(p => file.includes(p))) continue;
        if (IGNORE_FILE_RE.some(re => re.test(file))) continue;
        found.push(file);
      }
    } catch {
      // root may not exist
    }
  }
  return found;
}

function scanText(file: string, text: string): Issue[] {
  const lines = text.split('\n');
  const out: Issue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (isCommentOrDoc(line)) continue;

    ENV_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seenOnLine = new Set<string>();
    while ((m = ENV_RE.exec(line)) !== null) {
      const envVar = m[1]!;
      if (seenOnLine.has(envVar)) continue;
      seenOnLine.add(envVar);

      if (envVar.startsWith('NODE_')) continue;
      if (PROCESS_AMBIENT.has(envVar)) continue;
      // Secrets without fallback are intentional (vault / require)
      if (REQUIRED_SECRET_RE.test(envVar)) continue;

      const prev = lines[i - 1] ?? '';
      const following = lines.slice(i + 1, i + 9);
      if (hasFallbackOrGuard(line, prev, following)) continue;
      // if (Bun.env.FOO) { … Bun.env.FOO … }
      if (new RegExp(String.raw`if\s*\(\s*Bun\.env\.${envVar}\b`).test(prev)) continue;
      if (new RegExp(String.raw`if\s*\(\s*Bun\.env\.${envVar}\b`).test(line)) continue;

      out.push({
        file,
        line: i + 1,
        envVar,
        text: line.trim().slice(0, 120),
      });
    }
  }
  return out;
}

const files = await collectFiles();
const issues: Issue[] = [];

for (const file of files) {
  let text: string;
  try {
    text = await Bun.file(file).text();
  } catch {
    continue;
  }
  issues.push(...scanText(file, text));
}

const rel = (f: string) => relative(ROOT, f);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        mode: STAGED ? 'staged' : FULL ? 'full' : 'harness',
        filesScanned: files.length,
        issueCount: issues.length,
        issues: issues.map(i => ({ ...i, file: rel(i.file) })),
      },
      null,
      2
    )
  );
} else if (SUMMARY || issues.length > 0) {
  const byVar = new Map<string, number>();
  const byDir = new Map<string, number>();
  for (const i of issues) {
    byVar.set(i.envVar, (byVar.get(i.envVar) ?? 0) + 1);
    const top = rel(i.file).split('/')[0] ?? '?';
    byDir.set(top, (byDir.get(top) ?? 0) + 1);
  }

  if (issues.length === 0) {
    console.log(
      `✅ env-defaults: clean (${files.length} file(s), mode=${STAGED ? 'staged' : FULL ? 'full' : 'harness'})`
    );
  } else {
    console.error(
      `❌ ${issues.length} optional Bun.env config read(s) without fallback (mode=${STAGED ? 'staged' : FULL ? 'full' : 'harness'}, files=${files.length})`
    );
    console.error('  Top vars:');
    for (const [k, n] of [...byVar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.error(`    ${k}: ${n}`);
    }
    console.error('  Top roots:');
    for (const [k, n] of [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.error(`    ${k}/: ${n}`);
    }
    console.error('  First 25:');
    for (const i of issues.slice(0, 25)) {
      console.error(`    ${rel(i.file)}:${i.line}: Bun.env.${i.envVar}`);
    }
    if (issues.length > 25) console.error(`    ... and ${issues.length - 25} more`);
    console.error(
      '  Tip: add || / ?? default, guard with if (Bun.env.X), or use require* for secrets.'
    );
    console.error(
      '       Secrets (TOKEN/SECRET/…) and process ambient (TZ/FORCE_COLOR/…) are skipped.'
    );
  }
} else {
  console.log(
    `✅ env-defaults: clean (${files.length} file(s), mode=${STAGED ? 'staged' : FULL ? 'full' : 'harness'})`
  );
}

if (issues.length > 0 && !DRY_RUN) process.exit(1);
