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
import { loaderForPath, resolveRelativeImport, scanSourceImports } from './monorepo-health.ts';
import { basenamePath, dirnamePath, joinPath, normalizePath } from '../path-bun.ts';
import { isSourcePath, isTextPath } from './file-removal-policy.ts';

export type ReferenceEvidence = {
  inboundReferences: Map<string, Set<string>>;
  importedBy: Map<string, Set<string>>;
};

const PATH_TOKEN =
  /(?:\.\.?\/|\/)?(?:[A-Za-z0-9_@.-]+\/)+[A-Za-z0-9_@.-]+\/?|[A-Za-z0-9_@.-]+\.[A-Za-z0-9]{1,12}/g;

function addReference(map: Map<string, Set<string>>, target: string, from: string): void {
  if (target === from) return;
  const refs = map.get(target) ?? new Set<string>();
  refs.add(from);
  map.set(target, refs);
}

function tokenTargets(
  token: string,
  from: string,
  candidates: ReadonlySet<string>,
  uniqueBasenames: ReadonlyMap<string, string>
): string[] {
  const clean = token.replaceAll(/[)'"`,;:#?]+$/g, '');
  const targets: string[] = [];
  const add = (path: string): void => {
    const normalized = normalizePath(path);
    if (candidates.has(normalized) && !targets.includes(normalized)) targets.push(normalized);
    const indexPath = joinPath(normalized, 'index.html');
    if (clean.endsWith('/') && candidates.has(indexPath) && !targets.includes(indexPath)) {
      targets.push(indexPath);
    }
  };

  if (clean.startsWith('/')) add(`public${clean}`);
  else if (clean.startsWith('./') || clean.startsWith('../'))
    add(joinPath(dirnamePath(from), clean));
  else add(clean);

  const byBase = uniqueBasenames.get(basenamePath(clean));
  if (byBase) add(byBase);
  return targets;
}

async function scanOneFile(
  root: string,
  path: string,
  candidates: ReadonlySet<string>,
  uniqueBasenames: ReadonlyMap<string, string>,
  evidence: ReferenceEvidence
): Promise<void> {
  if (!isTextPath(path)) return;
  let text: string;
  try {
    text = await Bun.file(joinPath(root, path)).text();
  } catch {
    return;
  }

  for (const token of text.match(PATH_TOKEN) ?? []) {
    for (const target of tokenTargets(token, path, candidates, uniqueBasenames)) {
      addReference(evidence.inboundReferences, target, path);
    }
  }

  if (!isSourcePath(path)) return;
  for (const item of scanSourceImports(text, loaderForPath(path))) {
    if (!item.path.startsWith('.')) continue;
    const resolved = await resolveRelativeImport(joinPath(root, path), item.path);
    if (!resolved) continue;
    const rel = normalizePath(resolved.slice(root.length + 1));
    if (candidates.has(rel)) addReference(evidence.importedBy, rel, path);
  }
}

export async function collectReferenceEvidence(
  root: string,
  allPaths: readonly string[],
  candidatePaths: ReadonlySet<string>
): Promise<ReferenceEvidence> {
  const basenameOwners = new Map<string, string[]>();
  for (const path of candidatePaths) {
    const base = basenamePath(path);
    basenameOwners.set(base, [...(basenameOwners.get(base) ?? []), path]);
  }
  const uniqueBasenames = new Map<string, string>();
  for (const [base, owners] of basenameOwners) {
    if (owners.length === 1) uniqueBasenames.set(base, owners[0]!);
  }

  const evidence: ReferenceEvidence = {
    inboundReferences: new Map(),
    importedBy: new Map(),
  };
  const textPaths = allPaths.filter(isTextPath);
  for (let index = 0; index < textPaths.length; index += 48) {
    await Promise.all(
      textPaths
        .slice(index, index + 48)
        .map(path => scanOneFile(root, path, candidatePaths, uniqueBasenames, evidence))
    );
  }
  return evidence;
}
