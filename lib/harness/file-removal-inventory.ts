// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/utils#bun-version
import {
  collectFileFacts,
  indexFileContent,
  isInventoryCandidate,
} from './file-removal-content.ts';
import { dirtyGitPaths, listGitFiles } from './file-removal-git.ts';
import { gradeFileRemoval } from './file-removal-grade.ts';
import { buildFileRemovalOwnershipIndex } from './file-removal-ownership.ts';
import { isSourcePath, isTextPath, looksGenerated, publicUrlFor } from './file-removal-policy.ts';
import { collectReferenceEvidence } from './file-removal-references.ts';
import { buildDuplicateGroups, buildFileRemovalSummary } from './file-removal-report.ts';
import {
  FILE_REMOVAL_SCHEMA_VERSION,
  fileRemovalPolicy,
  type FileInventoryRow,
  type FileRemovalOptions,
  type FileRemovalReport,
} from './file-removal-types.ts';

export async function buildFileRemovalReport(
  root: string,
  options: FileRemovalOptions
): Promise<FileRemovalReport> {
  const [gitFiles, dirty] = await Promise.all([listGitFiles(root), dirtyGitPaths(root)]);
  const facts = await collectFileFacts(root, gitFiles);
  const content = await indexFileContent(root, facts, options);
  const candidateFacts = facts.filter(
    row => isInventoryCandidate(row, options) || content.duplicateRows.has(row.path)
  );
  const candidatePaths = new Set(candidateFacts.map(row => row.path));
  const allPaths = gitFiles.map(row => row.path);
  const [references, ownership] = await Promise.all([
    collectReferenceEvidence(root, allPaths, candidatePaths),
    buildFileRemovalOwnershipIndex(root, allPaths),
  ]);
  const rows: FileInventoryRow[] = candidateFacts.map(row => ({
    path: row.path,
    bytes: row.bytes,
    lines: row.lines,
    sha256: content.hashes.get(row.path)!,
    tracked: row.tracked,
    dirty: dirty.has(row.path),
    gitMode: row.gitMode,
    source: isSourcePath(row.path),
    text: isTextPath(row.path),
    generated: looksGenerated(row.path, row.textHead),
    publicUrl: publicUrlFor(row.path),
    ownership: ownership.forPath(row.path),
    inboundReferences: [...(references.inboundReferences.get(row.path) ?? [])].sort(),
    importedBy: [...(references.importedBy.get(row.path) ?? [])].sort(),
    contentMatchPaths: (content.duplicateRows.get(row.path) ?? [])
      .filter(path => path !== row.path)
      .sort(),
    duplicatePaths: [],
    canonicalDuplicate: null,
  }));

  const duplicateGroups = buildDuplicateGroups(rows, content.byHash);
  const candidates = rows
    .map(row => gradeFileRemoval(row, options))
    .sort(
      (a, b) =>
        b.removalConfidence - a.removalConfidence ||
        b.bytes - a.bytes ||
        a.path.localeCompare(b.path)
    );
  return {
    schemaVersion: FILE_REMOVAL_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    root,
    policy: fileRemovalPolicy(options),
    summary: buildFileRemovalSummary(facts.length, candidates, duplicateGroups),
    duplicateGroups,
    candidates,
  };
}
