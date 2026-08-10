/**
 * Diff two channel-aware verification reports by probe name.
 *
 */
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
