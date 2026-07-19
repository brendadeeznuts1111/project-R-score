#!/usr/bin/env bun
/**
 * console-depth-guide.ts — runnable guided tour of lib/console-depth.ts.
 *
 * Run: bun examples/console-depth-guide.ts
 *
 * Thesis: Bun ships native, SIMD-accelerated replacements for the terminal
 * npm stack (string-width, wrap-ansi, strip-ansi, slice-ansi, ansi-styles,
 * cli-table). lib/console-depth.ts is the thin project layer over them —
 * each section below names the API, shows it working, and links the
 * canonical doc. Reference map: tools/bun-doc-refs.ts (`bun tools/bun-doc-refs.ts list`).
 */

import {
  colorize,
  getConsoleDepth,
  inspect,
  logCompact,
  logDepth,
  logSorted,
  logTable,
  padEndWidth,
  shouldColor,
  termWidth,
  truncateWidth,
  widthOf,
} from '../lib/console-depth.ts';

function section(title: string, ref: string): void {
  console.info(`\n━━━ ${title}`);
  console.info(`    ${ref}`);
}

// ── 1. Depth control ─────────────────────────────────────────────────────
section('1. Depth control — --console-depth flag > BUN_CONSOLE_DEPTH env > default 4', 'https://bun.com/docs/runtime/console');
console.info(`    effective depth this process: ${getConsoleDepth()}`);
logDepth({ level1: { level2: { level3: { level4: { level5: 'deep' } } } } });

// ── 2. Compact + sorted inspection ───────────────────────────────────────
section('2. Compact + sorted — BunInspectOptions', 'https://bun.com/reference/bun/BunInspectOptions');
logCompact({ note: 'compact: single line for hot paths', nested: { a: 1 } });
logSorted({ zebra: 1, alpha: 2, mango: 3 });

// ── 3. Tables ────────────────────────────────────────────────────────────
section('3. Tables — Bun.inspect.table replaces cli-table', 'https://bun.com/docs/runtime/utils#bun-inspect');
logTable([
  { feature: 'stringWidth', replaces: 'string-width', speedup: '2–9x' },
  { feature: 'sliceAnsi', replaces: 'slice-ansi', speedup: 'correct-only' },
  { feature: 'inspect.table', replaces: 'cli-table', speedup: 'native' },
]);

// ── 4. Width measurement ─────────────────────────────────────────────────
section('4. Width — Bun.stringWidth replaces string-width (SIMD)', 'https://bun.com/docs/runtime/utils#bun-stringwidth');
for (const s of ['ascii', 'wide世界', 'emoji😀🔥', 'combining é']) {
  console.info(`    widthOf(${JSON.stringify(s)}) = ${widthOf(s)}`);
}

// ── 5. Pad + truncate ────────────────────────────────────────────────────
section('5. Pad + truncate — grapheme/ANSI safe', 'https://bun.com/reference/bun/sliceAnsi');
console.info(`    [${padEndWidth('ok🔥', 10)}]  [${padEndWidth('degraded', 10)}]`);
console.info(`    truncate: "${truncateWidth('some very long status line', 12)}"`);

// ── 6. Color + TTY ───────────────────────────────────────────────────────
section('6. Color + TTY — Bun.color, NO_COLOR/FORCE_COLOR conventions', 'https://bun.com/docs/runtime/color');
console.info(`    shouldColor (this run): ${shouldColor()}  termWidth: ${termWidth()}`);
console.info(`    ${colorize('success', '#22c55e')} / ${colorize('warning', '#f59e0b')} / ${colorize('error', '#ef4444')}  (plain when piped)`);

// ── 7. inspect.custom ────────────────────────────────────────────────────
section('7. inspect.custom — classes control their printed form', 'https://bun.com/docs/runtime/utils#bun-inspect');
class Token {
  constructor(public id: string, public secret: string) {}
  [Bun.inspect.custom]() {
    return `Token(${this.id}, secret=***)`;
  }
}
console.info(`    ${inspect(new Token('cli:user', 'supersecret'), { colors: false })}`);

console.info('\n✅ guide complete — full reference map: bun tools/bun-doc-refs.ts list');
