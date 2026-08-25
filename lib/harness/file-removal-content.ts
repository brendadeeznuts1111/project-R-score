// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
import { joinPath } from '../path-bun.ts';
import type { GitFile } from './file-removal-git.ts';
import { isMonorepoHealthSourcePath, isTextPath } from './file-removal-policy.ts';
import type { FileRemovalOptions } from './file-removal-types.ts';

export type FileFacts = GitFile & {
  bytes: number;
  lines: number | null;
  textHead: string | null;
};

export type FileContentIndex = {
  hashes: Map<string, string>;
  byHash: Map<string, FileFacts[]>;
  duplicateRows: Map<string, string[]>;
};

async function factsFor(root: string, file: GitFile): Promise<FileFacts | null> {
  try {
    const bunFile = Bun.file(joinPath(root, file.path));
    const bytes = bunFile.size;
    if (!isTextPath(file.path)) return { ...file, bytes, lines: null, textHead: null };
    const text = await bunFile.text();
    return {
      ...file,
      bytes,
      lines: text.length === 0 ? 0 : (text.match(/\n/g)?.length ?? 0) + 1,
      textHead: text.slice(0, 4096),
    };
  } catch {
    return null;
  }
}

export async function collectFileFacts(
  root: string,
  files: readonly GitFile[]
): Promise<FileFacts[]> {
  const facts: FileFacts[] = [];
  for (let index = 0; index < files.length; index += 64) {
    const batch = await Promise.all(
      files.slice(index, index + 64).map(file => factsFor(root, file))
    );
    facts.push(...batch.filter((row): row is FileFacts => row !== null));
  }
  return facts;
}

export function isInventoryCandidate(row: FileFacts, options: FileRemovalOptions): boolean {
  return (
    (isMonorepoHealthSourcePath(row.path) &&
      row.lines !== null &&
      row.lines > options.largeLineThreshold) ||
    row.bytes > options.largeByteThreshold
  );
}

async function sha256(root: string, path: string): Promise<string> {
  const bytes = await Bun.file(joinPath(root, path)).arrayBuffer();
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

export async function indexFileContent(
  root: string,
  facts: readonly FileFacts[],
  options: FileRemovalOptions
): Promise<FileContentIndex> {
  const sameSize = new Map<number, FileFacts[]>();
  for (const row of facts) {
    if (row.bytes < options.duplicateByteThreshold) continue;
    sameSize.set(row.bytes, [...(sameSize.get(row.bytes) ?? []), row]);
  }

  const hashTargets = facts.filter(
    row => isInventoryCandidate(row, options) || (sameSize.get(row.bytes)?.length ?? 0) > 1
  );
  const hashes = new Map<string, string>();
  for (const row of hashTargets) hashes.set(row.path, await sha256(root, row.path));

  const byHash = new Map<string, FileFacts[]>();
  for (const row of facts) {
    const hash = hashes.get(row.path);
    if (hash) byHash.set(hash, [...(byHash.get(hash) ?? []), row]);
  }

  const duplicateRows = new Map<string, string[]>();
  for (const rows of byHash.values()) {
    if (rows.length < 2) continue;
    const paths = rows.map(row => row.path);
    for (const row of rows) duplicateRows.set(row.path, paths);
  }
  return { hashes, byHash, duplicateRows };
}
