#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
/**
 * validate-wire-traps.ts — Layer C inventory-aware naked partnerId lint + glob proof.
 *
 *   bun run partner-surface-inventory:lint-wires
 *   bun run partner-surface-inventory:lint-wires -- --strict-globs
 *
 * Does **not** replace partner-surface-inventory:validate (Layers A/B).
 * Allowlist SSOT = wire-field rows in partner-surface-inventory.
 */
import { stringWidth } from 'bun';
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { colorize, padEndWidth, shouldColor } from '../lib/console-depth.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import { scanWireTraps, type WireTrapIssue } from '../lib/docs/partner-surface-wire-lint.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');

function wantsStrictGlobs(argv: readonly string[]): boolean {
  return argv.includes('--strict-globs') || Bun.env.WIRE_TRAP_STRICT_GLOBS === '1';
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
  const inv = buildPartnerSurfaceInventory();
  const result = await scanWireTraps({
    root: ROOT,
    rows: inv.rows,
    strictGlobs: wantsStrictGlobs(argv),
  });

  const errors = result.issues.filter(i => i.level === 'error');
  const warns = result.issues.filter(i => i.level === 'warn');

  // Glob / bag warnings first (no file:line)
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
      }`
  );
  return 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { main };
