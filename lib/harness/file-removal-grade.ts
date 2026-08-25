import {
  addressabilityFor,
  hardProtectionReasons,
  isMonorepoHealthSourcePath,
  isSafeReviewLocation,
  isSourceOrContractArea,
} from './file-removal-policy.ts';
import type {
  FileInventoryRow,
  FileRemovalCandidate,
  FileRemovalOptions,
  RemovalAction,
  RemovalVerdict,
} from './file-removal-types.ts';

export function chooseCanonicalDuplicate(rows: readonly FileInventoryRow[]): string {
  return [...rows].sort((a, b) => {
    const refsA = a.inboundReferences.length + a.importedBy.length;
    const refsB = b.inboundReferences.length + b.importedBy.length;
    if (refsA !== refsB) return refsB - refsA;
    if (a.publicUrl !== null && b.publicUrl === null) return -1;
    if (b.publicUrl !== null && a.publicUrl === null) return 1;
    if (a.tracked !== b.tracked) return a.tracked ? -1 : 1;
    return a.path.localeCompare(b.path);
  })[0]!.path;
}

type RemovalEvidence = {
  action: RemovalAction;
  addressability: ReturnType<typeof addressabilityFor>;
  blockers: string[];
  hardBlocked: boolean;
  largeByBytes: boolean;
  largeByLines: boolean;
  reasons: string[];
  removalConfidence: number;
  verdict: RemovalVerdict;
};

function collectRemovalEvidence(
  row: FileInventoryRow,
  options: FileRemovalOptions
): Omit<RemovalEvidence, 'action' | 'verdict'> {
  const largeByLines =
    isMonorepoHealthSourcePath(row.path) &&
    row.lines !== null &&
    row.lines > options.largeLineThreshold;
  const largeByBytes = row.bytes > options.largeByteThreshold;
  const duplicate = row.duplicatePaths.length > 0;
  const crossOwnershipMatches = row.contentMatchPaths.filter(
    path => !row.duplicatePaths.includes(path)
  );
  const hardBlockers = hardProtectionReasons(row);
  const blockers = [...hardBlockers];
  const addressability = addressabilityFor(row);
  const reasons: string[] = [];
  let removalConfidence = 0;

  if (duplicate) {
    removalConfidence += 60;
    reasons.push(
      `byte-identical to ${row.duplicatePaths.length} file(s) in ownership boundary ${row.ownership.boundary}`
    );
  }
  if (crossOwnershipMatches.length > 0) {
    reasons.push(
      `byte-identical to ${crossOwnershipMatches.length} file(s) across ownership boundaries`
    );
    if (!duplicate) blockers.push('content match crosses project or package ownership boundary');
  }
  if (addressability === 'unreferenced') {
    removalConfidence += 20;
    reasons.push('no import or path reference found');
  }
  if (!isSourceOrContractArea(row.path)) removalConfidence += 10;
  if (isSafeReviewLocation(row.path)) removalConfidence += 10;
  if (largeByLines) reasons.push(`${row.lines} lines exceeds ${options.largeLineThreshold}`);
  if (largeByBytes) reasons.push(`${row.bytes} bytes exceeds ${options.largeByteThreshold}`);
  if (row.generated) reasons.push('generated-artifact marker or path');
  if (row.publicUrl) reasons.push(`publicly addressable as ${row.publicUrl}`);
  if (row.importedBy.length) blockers.push(`imported by ${row.importedBy.length} file(s)`);
  if (row.inboundReferences.length) {
    blockers.push(`referenced by ${row.inboundReferences.length} file(s)`);
  }

  return {
    addressability,
    blockers: [...new Set(blockers)].sort(),
    hardBlocked: hardBlockers.length > 0,
    largeByBytes,
    largeByLines,
    reasons,
    removalConfidence: Math.min(100, removalConfidence),
  };
}

function decideRemoval(row: FileInventoryRow, evidence: RemovalEvidence): RemovalEvidence {
  const duplicate = row.duplicatePaths.length > 0;
  let { action, removalConfidence, verdict } = evidence;

  if (evidence.blockers.length > 0) {
    verdict = evidence.hardBlocked ? 'protected' : 'retain';
    action = row.source && (evidence.largeByLines || evidence.largeByBytes) ? 'split' : 'retain';
    removalConfidence = 0;
  } else if (evidence.addressability === 'public-unreferenced') {
    // Absence of an in-repository reference does not prove that an external
    // consumer, bookmark, feed reader, or stable route no longer uses a URL.
    verdict = 'review';
    action = 'wire-or-remove';
    removalConfidence = Math.min(removalConfidence, 20);
    evidence.reasons.push('public route needs explicit owner and external-consumer review');
  } else if (row.source && (evidence.largeByLines || evidence.largeByBytes)) {
    action = 'split';
    removalConfidence = Math.min(removalConfidence, 20);
  } else if (row.generated) {
    action = 'verify-generator';
    removalConfidence = Math.min(removalConfidence, 40);
  } else if (duplicate && row.path !== row.canonicalDuplicate) {
    action = 'deduplicate';
    if (removalConfidence >= 90 && isSafeReviewLocation(row.path)) {
      verdict = 'very-safe-review';
    } else if (removalConfidence >= 80) verdict = 'safe-review';
  } else if (duplicate && row.path === row.canonicalDuplicate) {
    verdict = 'retain';
    action = 'retain';
    removalConfidence = 0;
    evidence.reasons.push('canonical copy for exact-duplicate group');
  }

  return { ...evidence, action, removalConfidence, verdict };
}

export function gradeFileRemoval(
  row: FileInventoryRow,
  options: FileRemovalOptions
): FileRemovalCandidate {
  const evidence = collectRemovalEvidence(row, options);
  const decision = decideRemoval(row, {
    ...evidence,
    action: 'wire-or-remove',
    verdict: 'review',
  });

  return {
    ...row,
    largeByLines: decision.largeByLines,
    largeByBytes: decision.largeByBytes,
    addressability: decision.addressability,
    verdict: decision.verdict,
    action: decision.action,
    removalConfidence: decision.removalConfidence,
    reclaimableBytes: decision.action === 'deduplicate' ? row.bytes : 0,
    reasons: decision.reasons,
    blockers: decision.blockers,
  };
}
