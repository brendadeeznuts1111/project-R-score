#!/usr/bin/env bun
/**
 * bun-doc-refs.ts — canonical Bun documentation reference tool.
 *
 * Single source of truth for canonical Bun doc URLs used across the repo.
 * Use it to keep @see links accurate and to find files that use Bun APIs
 * without a doc reference.
 *
 * Usage:
 *   bun tools/bun-doc-refs.ts url <ApiName>      # print canonical URL for a Bun API
 *   bun tools/bun-doc-refs.ts list               # print the whole reference map
 *   bun tools/bun-doc-refs.ts check [paths...]   # find Bun API usages lacking a @see link
 *   bun tools/bun-doc-refs.ts validate [paths..] # HTTP-check all bun.com/github doc links
 *
 * Adding a new API reference? Add it to CANONICAL_REFS below — one place only.
 */

// Canonical doc map — the reference thesis for this repo's terminal layer:
//
//   Bun ships native, SIMD-accelerated replacements for the terminal npm
//   stack (string-width, wrap-ansi, strip-ansi, slice-ansi, ansi-styles,
//   cli-table). lib/console-depth.ts is the thin project layer over them.
//   Every reference below is (a) verified reachable, (b) as specific as the
//   official docs allow (anchor > topic page > generated reference), and
//   (c) checked by `bun tools/bun-doc-refs.ts validate`.
//
// Source tiers, in order of preference:
//   1. https://bun.com/docs/runtime/... — curated guides & CLI flags
//   2. https://bun.com/reference/bun/<name> — generated API reference
//   3. https://github.com/oven-sh/bun/tree/main/packages/bun-types — types
//   4. External conventions (no-color.org, nodejs.org) where Bun defers
export const BUN_TYPES_PINNED =
  'https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types';
export const BUN_TYPES_MAIN = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';

export const CANONICAL_REFS: Record<string, string> = {
  // ── Terminal width & ANSI (replaces string-width / strip-ansi / wrap-ansi /
  //    slice-ansi) ────────────────────────────────────────────────────────
  'Bun.stringWidth': 'https://bun.com/docs/runtime/utils#bun-stringwidth',
  'Bun.stripANSI': 'https://bun.com/docs/runtime/utils#bun-stripansi',
  'Bun.wrapAnsi': 'https://bun.com/docs/runtime/utils#bun-wrapansi',
  'Bun.sliceAnsi': 'https://bun.com/reference/bun/sliceAnsi',

  // ── Inspection & formatting (replaces util.inspect options, cli-table) ──
  'Bun.inspect': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.table': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.custom': 'https://bun.com/docs/runtime/utils#bun-inspect',
  BunInspectOptions: 'https://bun.com/reference/bun/BunInspectOptions',
  console: 'https://bun.com/docs/runtime/console',
  '--console-depth': 'https://bun.com/docs/runtime/console',

  // ── Color & TTY conventions (replaces chalk / ansi-styles) ─────────────
  'Bun.color': 'https://bun.com/docs/runtime/color',
  'process.stdout.isTTY': 'https://nodejs.org/api/tty.html',
  'process.stdout.columns': 'https://nodejs.org/api/tty.html',
  NO_COLOR: 'https://bun.com/docs/runtime/environment-variables',
  FORCE_COLOR: 'https://bun.com/docs/runtime/environment-variables',

  // ── Environment & configuration ────────────────────────────────────────
  'Bun.env': 'https://bun.com/docs/runtime/environment-variables',
  '.env files': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  BUN_RUNTIME_TRANSPILER_CACHE_PATH: 'https://bun.com/docs/runtime/environment-variables#what-does-it-cache',
  'bunfig.toml': 'https://bun.com/docs/runtime/bunfig',

  // ── Testing & snapshots ────────────────────────────────────────────────
  'bun:test': 'https://bun.com/docs/cli/test',
  'bun:test snapshots': 'https://bun.com/docs/test/snapshots',
  'snapshot guide': 'https://bun.com/guides/test/snapshot',

  // ── Bundler / executables ──────────────────────────────────────────────
  'bun build --compile': 'https://bun.com/docs/bundler/executables',
  'compile targets': 'https://bun.com/docs/bundler/executables#supported-targets',

  // ── General utilities ──────────────────────────────────────────────────
  'Bun.which': 'https://bun.com/docs/runtime/utils#bun-which',
  'Bun.nanoseconds': 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  'Bun.sleep': 'https://bun.com/docs/runtime/utils#bun-sleep',
  'Bun.deepEquals': 'https://bun.com/docs/runtime/utils#bun-deepequals',
  'Bun.escapeHTML': 'https://bun.com/docs/runtime/utils#bun-escapehtml',
  'Bun.peek': 'https://bun.com/docs/runtime/utils#bun-peek',
  'Bun.main': 'https://bun.com/docs/runtime/utils#bun-main',
  'Bun.resolveSync': 'https://bun.com/docs/runtime/utils#bun-resolvesync',

  // ── Meta ───────────────────────────────────────────────────────────────
  'bun-types': BUN_TYPES_PINNED,
};

const APIS = Object.keys(CANONICAL_REFS).filter(k => k.startsWith('Bun.'));

function printUrl(api: string): void {
  const url = CANONICAL_REFS[api];
  if (!url) {
    console.error(`❌ no canonical ref for "${api}". Known APIs:`);
    for (const k of Object.keys(CANONICAL_REFS)) console.error(`   ${k}`);
    process.exit(1);
  }
  console.info(`${api} → ${url}`);
}

function listRefs(): void {
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    console.info(`${api.padEnd(28)} ${url}`);
  }
}

async function tsFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const info = await Bun.file(p)
      .stat()
      .catch(() => null);
    if (info?.isDirectory()) {
      const glob = new Bun.Glob('**/*.ts');
      for await (const f of glob.scan({ cwd: p, absolute: true })) out.push(f);
    } else if (p.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

/** Find Bun.* usages whose file has no matching @see / doc link. */
async function check(paths: string[]): Promise<number> {
  let missing = 0;
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    // Only count usage in actual code lines (comments/doc headers are
    // reference material, not usage)
    const code = text
      .split('\n')
      .filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    for (const api of APIS) {
      if (!code.includes(api)) continue;
      const url = CANONICAL_REFS[api];
      const [base, anchor] = url.split('#');
      const referenced =
        text.includes(url) ||
        text.includes(base) ||
        (anchor !== undefined && text.includes('#' + anchor));
      if (!referenced) {
        console.info(`  ${file}: uses ${api} without a doc ref`);
        console.info(`    add: @see ${url}`);
        missing++;
      }
    }
  }
  if (missing === 0) console.info('✅ all Bun API usages have canonical doc refs');
  return missing;
}

/** HTTP-validate every bun.com/github/no-color doc link found in the files. */
async function validate(paths: string[]): Promise<number> {
  const urlRe = /https:\/\/(?:bun\.com|github\.com\/oven-sh|no-color\.org|nodejs\.org)\S*/g;
  const urls = new Set<string>();
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    for (const m of text.matchAll(urlRe)) urls.add(m[0].replace(/[).,;*]+$/, ''));
  }
  let bad = 0;
  for (const url of urls) {
    const ok = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      .then(r => r.status < 400)
      .catch(() => false);
    console.info(`${ok ? '✅' : '❌'} ${url}`);
    if (!ok) bad++;
  }
  console.info(bad === 0 ? `\n✅ ${urls.size} links valid` : `\n❌ ${bad} broken links`);
  return bad;
}

const [, , cmd = 'list', ...rest] = Bun.argv;
const defaultPaths = ['lib', 'tools', 'scripts', 'tests'];
switch (cmd) {
  case 'url':
    printUrl(rest[0] ?? '');
    break;
  case 'list':
    listRefs();
    break;
  case 'check':
    process.exit((await check(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
    break;
  case 'validate':
    process.exit((await validate(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
    break;
  default:
    console.error(`unknown command: ${cmd} (url|list|check|validate)`);
    process.exit(1);
}
