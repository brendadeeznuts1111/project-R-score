/**
 * Human-readable rendering for channel proof deltas.
 *
 * CLI layout uses Bun.stringWidth padding (ANSI-safe) through fitVisible.
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
import { fitVisible } from '../console-depth.ts';
import type { ChannelProofDiff, ResultDelta } from './proof-diff.ts';

export type FormatProofDiffOptions = {
  /** Include actual-value drifts (default true) */
  showDrifts?: boolean;
  /** Max chars for actual/expected cells (default 48) */
  cellWidth?: number;
  /** Max probe name width (default 42) */
  nameWidth?: number;
};

/** Collapse whitespace, then fit to visible columns (sliceAnsi + pad). */
function clip(s: string, n: number): string {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return fitVisible(t, n, { align: 'left', ellipsis: '…' });
}

function passLabel(ok: boolean): string {
  return ok ? 'pass' : 'FAIL';
}

function channelLabel(side: ChannelProofDiff['before']): string {
  return `${side.channel ?? '?'}/${side.targetVersion ?? '?'}`;
}

function basename(path?: string): string {
  if (!path) return '';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

/** Human-readable CLI report — flips first, then adds/dels, then value drifts. */
export function formatProofDiffSummary(
  diff: ChannelProofDiff,
  opts: FormatProofDiffOptions = {}
): string[] {
  const showDrifts = opts.showDrifts !== false;
  const cellW = opts.cellWidth ?? 48;
  const nameW = opts.nameWidth ?? 42;
  const s = diff.summary;
  const lines: string[] = [];

  const flips = diff.deltas.filter(
    (d): d is Extract<ResultDelta, { kind: 'changed' }> => d.kind === 'changed' && d.passChanged
  );
  const adds = diff.deltas.filter(
    (d): d is Extract<ResultDelta, { kind: 'added' }> => d.kind === 'added'
  );
  const dels = diff.deltas.filter(
    (d): d is Extract<ResultDelta, { kind: 'removed' }> => d.kind === 'removed'
  );
  const drifts = diff.deltas.filter(
    (d): d is Extract<ResultDelta, { kind: 'changed' }> =>
      d.kind === 'changed' && !d.passChanged && d.actualChanged
  );

  lines.push('┌─ Proof diff ─────────────────────────────────────────────');
  lines.push(`│  ${channelLabel(diff.before)}  →  ${channelLabel(diff.after)}`);
  if (diff.before.path || diff.after.path) {
    lines.push(`│  ${basename(diff.before.path) || '—'}  →  ${basename(diff.after.path) || '—'}`);
  }
  lines.push(
    `│  runtime ${diff.before.runtimeVersion ?? '?'} → ${diff.after.runtimeVersion ?? '?'}`
  );
  lines.push(`│  pass ${s.beforePassed}/${s.beforeTotal} → ${s.afterPassed}/${s.afterTotal}`);
  lines.push(
    `│  flips ${s.passFlipped} · drifts ${drifts.length} · +${s.added} · −${s.removed} · same ${s.unchanged}`
  );
  lines.push(
    s.proofHashChanged
      ? `│  hash ${(diff.before.proofHash ?? '').slice(0, 12)}… → ${(diff.after.proofHash ?? '').slice(0, 12)}…`
      : '│  hash unchanged'
  );
  lines.push('└──────────────────────────────────────────────────────────');

  if (flips.length === 0 && adds.length === 0 && dels.length === 0 && drifts.length === 0) {
    lines.push('', 'No probe differences.');
    return lines;
  }

  if (flips.length > 0) {
    lines.push('', `PASS FLIPS (${flips.length})`);
    lines.push(`  ${clip('probe', nameW)}  ${clip('before', 6)}  after`);
    lines.push(`  ${'─'.repeat(nameW)}  ${'─'.repeat(6)}  ${'─'.repeat(6)}`);
    for (const d of flips) {
      lines.push(
        `  ${clip(d.name, nameW)}  ${clip(passLabel(d.before.passed), 6)}  ${passLabel(d.after.passed)}`
      );
      if (d.before.actual !== d.after.actual) {
        lines.push(`    actual: ${clip(d.before.actual, cellW)} → ${clip(d.after.actual, cellW)}`);
      }
    }
  }

  if (adds.length > 0) {
    lines.push('', `ADDED (${adds.length})`);
    for (const d of adds)
      lines.push(`  + ${clip(d.name, nameW + 8)}  [${passLabel(d.after.passed)}]`);
  }

  if (dels.length > 0) {
    lines.push('', `REMOVED (${dels.length})`);
    for (const d of dels) {
      lines.push(`  − ${clip(d.name, nameW + 8)}  [was ${passLabel(d.before.passed)}]`);
    }
  }

  if (showDrifts && drifts.length > 0) {
    lines.push('', `VALUE DRIFTS (${drifts.length}) — same pass/fail, different actual/expected`);
    lines.push(`  ${clip('probe', nameW)}  ${clip('before', cellW)}  after`);
    lines.push(`  ${'─'.repeat(nameW)}  ${'─'.repeat(cellW)}  ${'─'.repeat(Math.min(cellW, 24))}`);
    for (const d of drifts) {
      const beforeVal =
        d.before.expected !== d.after.expected
          ? `exp ${d.before.expected} | ${d.before.actual}`
          : d.before.actual;
      const afterVal =
        d.before.expected !== d.after.expected
          ? `exp ${d.after.expected} | ${d.after.actual}`
          : d.after.actual;
      lines.push(`  ${clip(d.name, nameW)}  ${clip(beforeVal, cellW)}  ${clip(afterVal, cellW)}`);
    }
  }

  if (
    flips.length === 0 &&
    adds.length === 0 &&
    dels.length === 0 &&
    drifts.length > 0 &&
    !showDrifts
  ) {
    lines.push('', `(${drifts.length} value drifts hidden — pass --drifts or omit --no-drifts)`);
  }

  return lines;
}
