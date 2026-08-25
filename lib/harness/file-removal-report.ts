import type { FileFacts } from './file-removal-content.ts';
import { chooseCanonicalDuplicate } from './file-removal-grade.ts';
import type {
  DuplicateGroup,
  FileInventoryRow,
  FileRemovalCandidate,
  FileRemovalReport,
  RemovalAction,
  RemovalVerdict,
} from './file-removal-types.ts';

export function buildDuplicateGroups(
  rows: FileInventoryRow[],
  byHash: ReadonlyMap<string, FileFacts[]>
): DuplicateGroup[] {
  const rowByPath = new Map(rows.map(row => [row.path, row]));
  const groups: DuplicateGroup[] = [];
  for (const [hash, members] of byHash) {
    if (members.length < 2) continue;
    const memberRows = members
      .map(member => rowByPath.get(member.path))
      .filter((row): row is FileInventoryRow => row !== undefined);
    const byOwnership = new Map<string, FileInventoryRow[]>();
    for (const row of memberRows) {
      const boundary = row.ownership.boundary;
      byOwnership.set(boundary, [...(byOwnership.get(boundary) ?? []), row]);
    }
    const canonicalPaths: string[] = [];
    let reclaimableBytes = 0;
    for (const boundaryRows of byOwnership.values()) {
      if (boundaryRows.length < 2) continue;
      const canonicalPath = chooseCanonicalDuplicate(boundaryRows);
      canonicalPaths.push(canonicalPath);
      reclaimableBytes += members[0]!.bytes * (boundaryRows.length - 1);
      for (const row of boundaryRows) {
        row.canonicalDuplicate = canonicalPath;
        row.duplicatePaths = boundaryRows
          .map(member => member.path)
          .filter(path => path !== row.path)
          .sort();
      }
    }
    groups.push({
      sha256: hash,
      bytesEach: members[0]!.bytes,
      canonicalPaths: canonicalPaths.sort(),
      ownershipBoundaries: [...byOwnership.keys()].sort(),
      paths: members.map(member => member.path).sort(),
      theoreticalReclaimableBytes: members[0]!.bytes * (members.length - 1),
      reclaimableBytes,
    });
  }
  return groups.sort(
    (a, b) =>
      b.theoreticalReclaimableBytes - a.theoreticalReclaimableBytes ||
      a.sha256.localeCompare(b.sha256)
  );
}

function emptyCounts<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map(value => [value, 0])) as Record<T, number>;
}

export function buildFileRemovalSummary(
  filesScanned: number,
  candidates: readonly FileRemovalCandidate[],
  duplicateGroups: readonly DuplicateGroup[]
): FileRemovalReport['summary'] {
  const verdicts: RemovalVerdict[] = [
    'protected',
    'retain',
    'review',
    'safe-review',
    'very-safe-review',
  ];
  const actions: RemovalAction[] = [
    'retain',
    'split',
    'deduplicate',
    'wire-or-remove',
    'verify-generator',
  ];
  const byVerdict = emptyCounts(verdicts);
  const byAction = emptyCounts(actions);
  for (const row of candidates) {
    byVerdict[row.verdict]++;
    byAction[row.action]++;
  }
  return {
    filesScanned,
    candidates: candidates.length,
    largeByLines: candidates.filter(row => row.largeByLines).length,
    largeByBytes: candidates.filter(row => row.largeByBytes).length,
    duplicateGroups: duplicateGroups.length,
    exactDuplicateBytes: duplicateGroups.reduce(
      (sum, group) => sum + group.theoreticalReclaimableBytes,
      0
    ),
    ownershipScopedDuplicateBytes: duplicateGroups.reduce(
      (sum, group) => sum + group.reclaimableBytes,
      0
    ),
    crossOwnershipDuplicateBytes: duplicateGroups.reduce(
      (sum, group) => sum + group.theoreticalReclaimableBytes - group.reclaimableBytes,
      0
    ),
    safeReviewDuplicateBytes: candidates
      .filter(row => row.verdict === 'safe-review' || row.verdict === 'very-safe-review')
      .reduce((sum, row) => sum + row.reclaimableBytes, 0),
    byVerdict,
    byAction,
  };
}
