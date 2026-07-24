/**
 * Diff two channel-aware verification reports by probe name.
 *
 * CLI layout uses Bun.stringWidth padding (ANSI-safe) — never String#padEnd.
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
import { fitVisible } from '../console-depth.ts';
import type { ChannelAwareVerificationReport, VerificationResult } from './types.ts';

export type ResultDelta =
  | { name: string; kind: 'added'; after: VerificationResult }
  | { name: string; kind: 'removed'; before: VerificationResult }
  | {
      name: string;
      kind: 'changed';
      before: VerificationResult;
      after: VerificationResult;
      passChanged: boolean;
      actualChanged: boolean;
    }
  | { name: string; kind: 'unchanged'; passed: boolean };

export type ChannelProofDiff = {
  type: 'ChannelProofDiff';
  version: '1.0.0';
  before: {
    channel?: string;
    targetVersion?: string;
    runtimeVersion?: string;
    proofHash?: string;
    path?: string;
  };
  after: {
    channel?: string;
    targetVersion?: string;
    runtimeVersion?: string;
    proofHash?: string;
    path?: string;
  };
  summary: {
    beforePassed: number;
    beforeTotal: number;
    afterPassed: number;
    afterTotal: number;
    added: number;
    removed: number;
    changed: number;
    passFlipped: number;
    unchanged: number;
    proofHashChanged: boolean;
  };
  deltas: ResultDelta[];
};

export type FormatProofDiffOptions = {
  /** Include actual-value drifts (default true) */
  showDrifts?: boolean;
  /** Max chars for actual/expected cells (default 48) */
  cellWidth?: number;
  /** Max probe name width (default 42) */
  nameWidth?: number;
};

function tagsOf(report: ChannelAwareVerificationReport) {
  const t = report.semanticTags;
  return {
    channel: t?.channel,
    targetVersion: t?.targetVersion,
    runtimeVersion: t?.runtimeVersion ?? report.bunVersion,
    proofHash: report.proofHash,
  };
}

function byName(results: VerificationResult[]): Map<string, VerificationResult> {
  const m = new Map<string, VerificationResult>();
  for (const r of results) m.set(r.name, r);
  return m;
}

export function diffChannelProofs(
  before: ChannelAwareVerificationReport,
  after: ChannelAwareVerificationReport,
  paths?: { before?: string; after?: string }
): ChannelProofDiff {
  const aMap = byName(before.results ?? []);
  const bMap = byName(after.results ?? []);
  const names = new Set([...aMap.keys(), ...bMap.keys()]);
  const deltas: ResultDelta[] = [];

  let added = 0;
  let removed = 0;
  let changed = 0;
  let passFlipped = 0;
  let unchanged = 0;

  for (const name of [...names].sort()) {
    const prev = aMap.get(name);
    const next = bMap.get(name);
    if (!prev && next) {
      added++;
      deltas.push({ name, kind: 'added', after: next });
      continue;
    }
    if (prev && !next) {
      removed++;
      deltas.push({ name, kind: 'removed', before: prev });
      continue;
    }
    if (prev && next) {
      const passChanged = prev.passed !== next.passed;
      const actualChanged = prev.actual !== next.actual || prev.expected !== next.expected;
      if (passChanged || actualChanged) {
        changed++;
        if (passChanged) passFlipped++;
        deltas.push({
          name,
          kind: 'changed',
          before: prev,
          after: next,
          passChanged,
          actualChanged,
        });
      } else {
        unchanged++;
        deltas.push({ name, kind: 'unchanged', passed: next.passed });
      }
    }
  }

  const beforeMeta = tagsOf(before);
  const afterMeta = tagsOf(after);

  return {
    type: 'ChannelProofDiff',
    version: '1.0.0',
    before: { ...beforeMeta, path: paths?.before },
    after: { ...afterMeta, path: paths?.after },
    summary: {
      beforePassed: before.summary?.passed ?? 0,
      beforeTotal: before.summary?.total ?? 0,
      afterPassed: after.summary?.passed ?? 0,
      afterTotal: after.summary?.total ?? 0,
      added,
      removed,
      changed,
      passFlipped,
      unchanged,
      proofHashChanged: before.proofHash !== after.proofHash,
    },
    deltas,
  };
}

/** Collapse whitespace, then fit to visible columns (sliceAnsi + pad). */
function clip(s: string, n: number): string {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return fitVisible(t, n, { align: 'left', ellipsis: '…' });
}

/** Fit left-aligned column (ANSI-safe). */
function pad(s: string, n: number): string {
  return clip(s, n);
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
  if (s.proofHashChanged) {
    lines.push(
      `│  hash ${(diff.before.proofHash ?? '').slice(0, 12)}… → ${(diff.after.proofHash ?? '').slice(0, 12)}…`
    );
  } else {
    lines.push('│  hash unchanged');
  }
  lines.push('└──────────────────────────────────────────────────────────');

  if (flips.length === 0 && adds.length === 0 && dels.length === 0 && drifts.length === 0) {
    lines.push('');
    lines.push('No probe differences.');
    return lines;
  }

  if (flips.length > 0) {
    lines.push('');
    lines.push(`PASS FLIPS (${flips.length})`);
    lines.push(`  ${pad('probe', nameW)}  ${pad('before', 6)}  after`);
    lines.push(`  ${'─'.repeat(nameW)}  ${'─'.repeat(6)}  ${'─'.repeat(6)}`);
    for (const d of flips) {
      lines.push(
        `  ${pad(d.name, nameW)}  ${pad(passLabel(d.before.passed), 6)}  ${passLabel(d.after.passed)}`
      );
      if (d.before.actual !== d.after.actual) {
        lines.push(`    actual: ${clip(d.before.actual, cellW)} → ${clip(d.after.actual, cellW)}`);
      }
    }
  }

  if (adds.length > 0) {
    lines.push('');
    lines.push(`ADDED (${adds.length})`);
    for (const d of adds) {
      lines.push(`  + ${clip(d.name, nameW + 8)}  [${passLabel(d.after.passed)}]`);
    }
  }

  if (dels.length > 0) {
    lines.push('');
    lines.push(`REMOVED (${dels.length})`);
    for (const d of dels) {
      lines.push(`  − ${clip(d.name, nameW + 8)}  [was ${passLabel(d.before.passed)}]`);
    }
  }

  if (showDrifts && drifts.length > 0) {
    lines.push('');
    lines.push(`VALUE DRIFTS (${drifts.length}) — same pass/fail, different actual/expected`);
    lines.push(`  ${pad('probe', nameW)}  ${pad('before', cellW)}  after`);
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
      lines.push(`  ${pad(d.name, nameW)}  ${pad(beforeVal, cellW)}  ${clip(afterVal, cellW)}`);
    }
  }

  if (
    flips.length === 0 &&
    adds.length === 0 &&
    dels.length === 0 &&
    drifts.length > 0 &&
    !showDrifts
  ) {
    lines.push('');
    lines.push(`(${drifts.length} value drifts hidden — pass --drifts or omit --no-drifts)`);
  }

  return lines;
}
