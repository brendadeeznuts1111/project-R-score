#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Ratchet: invisible / format Unicode code points must be written as \u
 * escapes in TypeScript source, never as literal bytes. Literal invisibles
 * are silently mutable by editors/formatters — cf. tests/console-depth.test.ts
 * where U+200D became U+201D and U+FE0F became U+FE1D in an editing
 * round-trip; every validator accepted the file and only the width
 * reference vectors caught it.
 *
 * Strict: zero-width chars, bidi controls, word joiner, BOM, soft hyphen,
 * interlinear annotation, tag chars (Trojan-Source class).
 * Warn-only: emoji variation selectors (legacy literals ratchet down).
 * Combining marks (visible) are out of scope.
 * Suppress a deliberate literal per line with: // invisible-ok
 *
 *   bun run check:invisible-chars
 */
export {};

const ROOT = process.cwd();
const DIRS = ['lib', 'scripts', 'tools', 'tests', 'config'] as const;

/** Code points that must appear as escapes, with readable names for reports. */
const NAMES: Record<number, string> = {
  0x00ad: 'SOFT HYPHEN',
  0x200b: 'ZERO WIDTH SPACE',
  0x200c: 'ZERO WIDTH NON-JOINER',
  0x200d: 'ZERO WIDTH JOINER',
  0x200e: 'LEFT-TO-RIGHT MARK',
  0x200f: 'RIGHT-TO-LEFT MARK',
  0x2028: 'LINE SEPARATOR',
  0x2029: 'PARAGRAPH SEPARATOR',
  0x2060: 'WORD JOINER',
  0xfeff: 'ZERO WIDTH NO-BREAK SPACE / BOM',
};

/** Strict: truly invisible / Trojan-Source class — must be escapes. */
const STRICT_RE =
  /[\u00AD\u200B-\u200F\u2028-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB\u{E0000}-\u{E007F}]/gu;
/** Warn-only: emoji variation selectors (legacy literals; ratchet down over time). */
const VS_RE = /[\uFE00-\uFE0F]/gu;

function nameOf(cp: number): string {
  if (NAMES[cp]) return NAMES[cp];
  if (cp >= 0x202a && cp <= 0x202e) return 'BIDI EMBEDDING/OVERRIDE';
  if (cp >= 0x2066 && cp <= 0x2069) return 'BIDI ISOLATE';
  if (cp >= 0xfe00 && cp <= 0xfe0f) return `VARIATION SELECTOR-${cp - 0xfe00 + 1}`;
  if (cp >= 0xe0000 && cp <= 0xe007f) return 'TAG CHAR';
  return 'FORMAT CHAR';
}

type Hit = { file: string; line: number; col: number; cp: number };
const strictHits: Hit[] = [];
const vsHits: Hit[] = [];

function collect(re: RegExp, line: string, rel: string, lineNo: number, out: Hit[]): void {
  re.lastIndex = 0;
  for (const m of line.matchAll(re)) {
    out.push({ file: rel, line: lineNo, col: (m.index ?? 0) + 1, cp: m[0].codePointAt(0)! });
  }
}

for (const dir of DIRS) {
  for (const rel of new Bun.Glob(`${dir}/**/*.ts`).scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules')) continue;
    const text = await Bun.file(`${ROOT}/${rel}`).text();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.includes('invisible-ok')) continue;
      collect(STRICT_RE, line, rel, i + 1, strictHits);
      collect(VS_RE, line, rel, i + 1, vsHits);
    }
  }
}

function report(title: string, hits: Hit[], out: (s: string) => void): void {
  out(title);
  for (const h of hits) {
    const hex = `U+${h.cp.toString(16).toUpperCase().padStart(4, '0')}`;
    out(`  ${h.file}:${h.line}:${h.col} ${hex} ${nameOf(h.cp)}`);
  }
}

if (vsHits.length) {
  if (Bun.argv.includes('--verbose')) {
    report(
      `WARN: ${vsHits.length} literal variation selectors (prefer \\uFE0F escapes; not failing):`,
      vsHits,
      s => console.warn(s)
    );
  } else {
    console.warn(
      `WARN: ${vsHits.length} literal variation selectors (not failing; --verbose to list)`
    );
  }
}
if (strictHits.length) {
  report(
    'Invisible/format chars as source literals (write \\u escapes or // invisible-ok):',
    strictHits,
    s => console.error(s)
  );
  process.exit(1);
}
console.info('lib|scripts|tools|tests|config have no literal invisible/format chars');
