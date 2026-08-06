// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — inspect.table
/**
 * Shared terminal chrome for bun-types inventory / tip-diff / usage / report.
 * Goal: map-first, table-second — operator can read status without scrolling a wall of rows.
 */
import { colorize, logTable, shouldColor } from '../../lib/console-depth.ts';

export type TtyKv = { key: string; value: string; note?: string };

export function ttyOk(s: string): string {
  return shouldColor() ? colorize(s, '#3fb950') : s;
}
export function ttyWarn(s: string): string {
  return shouldColor() ? colorize(s, '#d29922') : s;
}
export function ttyErr(s: string): string {
  return shouldColor() ? colorize(s, '#f85149') : s;
}
export function ttyDim(s: string): string {
  return shouldColor() ? colorize(s, '#8b949e') : s;
}
export function ttyBold(s: string): string {
  return shouldColor() ? colorize(s, '#e6edf3') : s;
}

/** Verdict badge for tip-diff / report. */
export function verdictBadge(v: 'ok' | 'warn' | 'fail' | string): string {
  const u = String(v).toLowerCase();
  if (u === 'ok') return ttyOk('● ok');
  if (u === 'warn') return ttyWarn('● warn');
  if (u === 'fail') return ttyErr('● fail');
  return u;
}

/** Banner: tool name + one-line role. */
export function printBanner(tool: string, role: string): void {
  console.info('');
  console.info(`${ttyBold(tool)}  ${ttyDim(role)}`);
}

/** Section header with map-like left rail. */
export function printSection(title: string): void {
  console.info('');
  console.info(
    `${ttyDim('──')} ${ttyBold(title)} ${ttyDim('─'.repeat(Math.max(4, 40 - title.length)))}`
  );
}

/** Key/value map (aligned). */
export function printMap(rows: TtyKv[], opts: { indent?: string } = {}): void {
  const indent = opts.indent ?? '  ';
  const keyW = Math.min(22, Math.max(8, ...rows.map(r => r.key.length)));
  for (const r of rows) {
    const k = r.key.padEnd(keyW);
    const note = r.note ? `  ${ttyDim(r.note)}` : '';
    console.info(`${indent}${ttyDim(k)}  ${r.value}${note}`);
  }
}

/** Pipeline map: numbered steps with status. */
export function printPipeline(
  steps: Array<{
    id: string; // brand-ok — pipeline step label key, not a domain ID
    label: string;
    status: 'pending' | 'run' | 'ok' | 'warn' | 'fail' | 'skip';
  }>
): void {
  printSection('Pipeline');
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    const n = String(i + 1).padStart(2, ' ');
    let mark = '·';
    let style = (x: string) => x;
    if (s.status === 'ok') {
      mark = '✓';
      style = ttyOk;
    } else if (s.status === 'warn') {
      mark = '!';
      style = ttyWarn;
    } else if (s.status === 'fail') {
      mark = '✗';
      style = ttyErr;
    } else if (s.status === 'run') {
      mark = '›';
      style = ttyBold;
    } else if (s.status === 'skip') {
      mark = '–';
      style = ttyDim;
    }
    console.info(`  ${ttyDim(n)} ${style(mark)} ${s.label}  ${ttyDim(`[${s.id}]`)}`);
  }
}

/** Artifact path list under a section. */
export function printArtifacts(paths: string[]): void {
  printSection('Artifacts');
  for (const p of paths) {
    console.info(`  ${ttyDim('→')} ${p}`);
  }
}

/** Compact kind/module histogram as one map table. */
export function printHistogram(
  title: string,
  entries: Array<[string, number]>,
  opts: { limit?: number } = {}
): void {
  printSection(title);
  const limit = opts.limit ?? 12;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...sorted.map(([, n]) => n));
  const show = sorted.slice(0, limit);
  for (const [k, n] of show) {
    const barLen = Math.max(1, Math.round((n / max) * 16));
    const bar = '█'.repeat(barLen);
    console.info(`  ${k.padEnd(18).slice(0, 18)} ${String(n).padStart(5)}  ${ttyDim(bar)}`);
  }
  if (sorted.length > limit) {
    console.info(ttyDim(`  … +${sorted.length - limit} more`));
  }
}

/** Small preview table helper (delegates to logTable). */
export function printPreviewTable<T extends object>(
  rows: T[],
  columns: string[],
  more?: number
): void {
  if (!rows.length) {
    console.info(ttyDim('  (no rows)'));
    return;
  }
  logTable(rows, columns, { colors: true });
  if (more && more > 0) {
    console.info(ttyDim(`  … +${more} more (use --write / --json / --verbose for full)`));
  }
}

/** Final status line. */
export function printDone(ok: boolean, message: string): void {
  console.info('');
  console.info(ok ? ttyOk(`✓ ${message}`) : ttyErr(`✗ ${message}`));
  console.info('');
}
