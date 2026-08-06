#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @see https://bun.com/docs/runtime/utils#bun-markdown — Bun.markdown.ansi
/**
 * validate-wire-traps.ts — Layer C inventory-aware naked partnerId lint + glob proof.
 *
 *   bun run partner-surface-inventory:lint-wires
 *   bun run partner-surface-inventory:lint-wires -- --help
 *   bun run partner-surface-inventory:lint-wires -- --why
 *   bun run partner-surface-inventory:lint-wires -- --document
 *   bun run partner-surface-inventory:lint-wires -- --strict-globs
 *
 * Does **not** replace partner-surface-inventory:validate (Layers A/B).
 * Allowlist SSOT = wire-field rows in partner-surface-inventory.
 */
import { stringWidth } from 'bun';
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { colorize, padEndWidth, shouldColor, termWidth } from '../lib/console-depth.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import { scanWireTraps, type WireTrapIssue } from '../lib/docs/partner-surface-wire-lint.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const DOCUMENT_REL = 'docs/design/partner-surface-inventory.md';

const HELP_TEXT = `partner-surface-inventory lint-wires — Layer C naked partnerId traps

Usage:
  bun run partner-surface-inventory:lint-wires [-- flags]
  bun scripts/validate-wire-traps.ts [flags]

Flags:
  -h, --help, --hlp   Show this help (no scan)
  --why               Why this gate exists (claim + allowlist model)
  --document          Print design-doc path + wire-bag excerpt
  --strict-globs      Fail when an allowlist glob matches 0 files (also
                      WIRE_TRAP_STRICT_GLOBS=1); default warns on empty
                      nested checkouts (e.g. empty Kalshi-bot/)

Layers (do not conflate):
  A/B  bun run partner-surface-inventory:validate
  C    bun run partner-surface-inventory:lint-wires   ← this script

Fix a hit:
  1. Brand as PartnerCode / ExternalPartnerRef after the boundary, or
  2. Add // wire-ok: <reason> (or // brand-ok) on same/prev/next line, or
  3. Register the adapter: wire-field row with boundaryPathGlobs in
     lib/docs/partner-surface-inventory.ts then bake.
`;

const WHY_MARKDOWN = `# Why lint-wires (Layer C)

**Claim** \`partner-surface-inventory\` — map partner surfaces before rename;
Layer C stops bare \`partnerId: string\` / \`partner_id: string\` from leaking
into interior code.

## The bug pattern

Boards and adapters join many sources. An unqualified \`partnerId\` may mean
Sports snake_case wire, Kalshi registry id, Pandora remote id, or a tree node.
Promoting it to \`PartnerCode\` without a parse edge is a Layer-2/3 bug.

## Inventory-aware allowlist (not blanket ast-grep)

\`wire-field\` rows with \`resolvesTo: ExternalPartnerRef\` and non-empty
\`boundaryPathGlobs\` are the **only** places naked wire annotations are
expected. Trap rows (empty globs, e.g. unqualified \`partnerId\`) document
unregistered adapters and shape the error fix text.

New external client → add a wire-field row + globs → bake. No separate
ast-grep allowlist to maintain.

## Suppressions

\`// wire-ok: <reason>\` or \`// brand-ok\` on the same, previous, or next line
(Prettier wrap). Optional \`requireReason\` on the bag forces a reason for
\`wire-ok\` inside that allowlist.

## Related

- Design: \`${DOCUMENT_REL}\`
- SSOT: \`lib/docs/partner-surface-inventory.ts\`
- Engine: \`lib/docs/partner-surface-wire-lint.ts\`
- Layers A/B: \`bun run partner-surface-inventory:validate\`
`;

function argsOf(argv: readonly string[]): readonly string[] {
  // `bun run … -- --help` → Bun drops the bare `--`; leftover flags start at [2].
  return argv.slice(2).filter(a => a !== '--');
}

function hasFlag(args: readonly string[], ...names: string[]): boolean {
  return names.some(n => args.includes(n));
}

function wantsStrictGlobs(args: readonly string[]): boolean {
  return hasFlag(args, '--strict-globs') || Bun.env.WIRE_TRAP_STRICT_GLOBS === '1';
}

function printAnsiMarkdown(md: string): void {
  if (typeof Bun.markdown?.ansi === 'function') {
    console.log(Bun.markdown.ansi(md, { columns: termWidth(), hyperlinks: true }));
  } else {
    console.log(md);
  }
}

export function printHelp(): void {
  console.info(HELP_TEXT.trimEnd());
}

export function printWhy(): void {
  printAnsiMarkdown(WHY_MARKDOWN);
}

export async function printDocument(): Promise<void> {
  const abs = resolvePath(ROOT, DOCUMENT_REL);
  const file = Bun.file(abs);
  if (!(await file.exists())) {
    console.error(`❌ document missing: ${DOCUMENT_REL}`);
    return;
  }
  const text = await file.text();
  const wireStart = text.indexOf('Wire bag notes:');
  const nextHeading = text.indexOf('\n## ', wireStart === -1 ? 0 : wireStart);
  const excerpt =
    wireStart === -1
      ? text.slice(0, 800)
      : text.slice(wireStart, nextHeading === -1 ? wireStart + 1200 : nextHeading).trim();

  const href = Bun.pathToFileURL(abs).href;
  const linked =
    shouldColor() && process.stdout.isTTY
      ? `\u001b]8;;${href}\u001b\\${DOCUMENT_REL}\u001b]8;;\u001b\\`
      : DOCUMENT_REL;

  console.info(`Document: ${linked}`);
  console.info(`Absolute: ${abs}`);
  console.info('');
  printAnsiMarkdown(`## Wire bag notes (from design doc)\n\n${excerpt}\n`);
  console.info(`Full doc: bun run partner-surface-inventory:lint-wires -- --document`);
  console.info(`Open:     bun -e 'Bun.openInEditor(${JSON.stringify(abs)})'`);
}

function osc8FileLink(relPath: string, root: string): string {
  if (!shouldColor() || !process.stdout.isTTY) return relPath;
  const abs = `${root.replace(/\/$/, '')}/${relPath}`;
  const href = Bun.pathToFileURL(abs).href;
  return `\u001b]8;;${href}\u001b\\${relPath}\u001b]8;;\u001b\\`;
}

function statusCell(level: 'error' | 'warn'): string {
  if (level === 'error') {
    return shouldColor() ? colorize('❌', '#E11D48') : '❌';
  }
  return shouldColor() ? colorize('⚠️', '#CA8A04') : '⚠️';
}

function printIssueTable(issues: readonly WireTrapIssue[], root: string): void {
  const rows = issues
    .filter(i => i.file && i.line != null)
    .map(i => ({
      file: osc8FileLink(i.file!, root),
      line: String(i.line),
      match: i.match ?? '',
      status: statusCell(i.level),
      fix: i.fix ?? i.message,
    }));

  if (rows.length === 0) return;

  const headers = ['File', 'Line', 'Match', 'Status', 'Fix'] as const;
  const widths = [
    Math.min(
      48,
      Math.max(
        stringWidth(headers[0]),
        ...rows.map(r =>
          stringWidth(
            r.file.replace(/\u001b\]8;;[^\u001b]*\u001b\\/g, '').replace(/\u001b\[[0-9;]*m/g, '')
          )
        )
      )
    ),
    Math.max(stringWidth(headers[1]), ...rows.map(r => stringWidth(r.line))),
    Math.min(28, Math.max(stringWidth(headers[2]), ...rows.map(r => stringWidth(r.match)))),
    Math.max(stringWidth(headers[3]), 2),
    Math.min(56, Math.max(stringWidth(headers[4]), ...rows.map(r => stringWidth(r.fix)))),
  ];

  const rule = (l: string, m: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(m) + r;

  const cell = (text: string, w: number) => ` ${padEndWidth(text, w)} `;

  console.log(rule('┌', '┬', '┐'));
  console.log(
    '│' +
      [
        cell(headers[0], widths[0]!),
        cell(headers[1], widths[1]!),
        cell(headers[2], widths[2]!),
        cell(headers[3], widths[3]!),
        cell(headers[4], widths[4]!),
      ].join('│') +
      '│'
  );
  console.log(rule('├', '┼', '┤'));
  for (const row of rows) {
    console.log(
      '│' +
        [
          cell(row.file, widths[0]!),
          cell(row.line, widths[1]!),
          cell(row.match, widths[2]!),
          cell(row.status, widths[3]!),
          cell(row.fix, widths[4]!),
        ].join('│') +
        '│'
    );
  }
  console.log(rule('└', '┴', '┘'));
}

async function main(argv: readonly string[] = Bun.argv): Promise<number> {
  const args = argsOf(argv);

  if (hasFlag(args, '-h', '--help', '--hlp')) {
    printHelp();
    return 0;
  }
  if (hasFlag(args, '--why')) {
    printWhy();
    return 0;
  }
  if (hasFlag(args, '--document')) {
    await printDocument();
    return 0;
  }

  const known = new Set(['--strict-globs']);
  const unknown = args.filter(a => a.startsWith('-') && !known.has(a));
  if (unknown.length > 0) {
    console.error(`Unknown option(s): ${unknown.join(', ')}\n`);
    printHelp();
    return 2;
  }

  const inv = buildPartnerSurfaceInventory();
  const result = await scanWireTraps({
    root: ROOT,
    rows: inv.rows,
    strictGlobs: wantsStrictGlobs(args),
  });

  const errors = result.issues.filter(i => i.level === 'error');
  const warns = result.issues.filter(i => i.level === 'warn');

  for (const i of warns.filter(w => !w.file)) {
    console.warn(`⚠️  ${i.message}`);
  }
  for (const i of errors.filter(e => !e.file)) {
    console.error(`❌ ${i.message}`);
  }

  const located = result.issues.filter(i => i.file && i.line != null);
  if (located.length > 0) {
    printIssueTable(located, ROOT);
  }

  if (errors.length === 0) {
    console.info(
      `✅ partner-surface-inventory lint-wires: scanned ${result.scannedFiles} files · ` +
        `${result.allowGlobs.length} allow globs · ${warns.length} warn · ` +
        `allow=[${result.allowGlobs.join(', ') || '∅'}]`
    );
    return 0;
  }

  console.error(
    `\n❌ ${errors.length} error(s), ${warns.length} warning(s)\n` +
      `Allowed boundaryPathGlobs:\n  ${
        result.allowGlobs.join('\n  ') || '(none — add wire-field boundaryPathGlobs)'
      }\n` +
      `Why:  bun run partner-surface-inventory:lint-wires -- --why\n` +
      `Help: bun run partner-surface-inventory:lint-wires -- --hlp`
  );
  return 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { main, HELP_TEXT, WHY_MARKDOWN, DOCUMENT_REL };
