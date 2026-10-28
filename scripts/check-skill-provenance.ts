#!/usr/bin/env bun
/** Verify external skill revisions and declared source paths against GitHub. */

import { resolvePath } from '../lib/path-bun.ts';

type ExternalSkill = {
  provenance: 'vendored' | 'forked';
  source: string;
  sourceRevision: string;
  sourcePaths: string[];
  verifiedAt: string;
  upstreamState: 'exact' | 'adapted';
};

type CheckResult = {
  name: string;
  source: string;
  pinnedRevision: string;
  headRevision: string | null;
  revisionCurrent: boolean;
  paths: Array<{ path: string; exists: boolean }>;
  ok: boolean;
  error?: string;
};

const repoRoot = resolvePath(import.meta.dir, '..');
const manifestPath = resolvePath(
  repoRoot,
  '.agents/skills/references/skill-governance.json'
);
const json = Bun.argv.includes('--json');
const unknown = Bun.argv.slice(2).filter(argument => argument !== '--json');
if (unknown.length > 0) throw new TypeError(`unknown option: ${unknown[0]}`);

function githubRepo(source: string): { owner: string; repo: string } {
  const url = new URL(source);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new TypeError(`unsupported source URL: ${source}`);
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length !== 2 || parts.some(part => part === '')) {
    throw new TypeError(`source must identify a GitHub repository: ${source}`);
  }
  return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, '') };
}

async function remoteHead(source: string): Promise<string> {
  const child = Bun.spawn(['git', 'ls-remote', '--exit-code', source, 'HEAD'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr.trim() || `git ls-remote exited ${exitCode}`);
  const revision = stdout.trim().split(/\s+/, 1)[0] ?? '';
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('remote HEAD is not a full commit');
  return revision;
}

async function sourcePathExists(
  source: string,
  revision: string,
  sourcePath: string
): Promise<boolean> {
  const { owner, repo } = githubRepo(source);
  const encodedPath = sourcePath.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${revision}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'project-r-skill-provenance-check',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`GitHub contents request returned ${response.status}`);
  return true;
}

async function checkSkill(name: string, entry: ExternalSkill): Promise<CheckResult> {
  try {
    const headRevision = await remoteHead(entry.source);
    const paths = await Promise.all(
      entry.sourcePaths.map(async sourcePath => ({
        path: sourcePath,
        exists: await sourcePathExists(entry.source, entry.sourceRevision, sourcePath),
      }))
    );
    const revisionCurrent = headRevision === entry.sourceRevision;
    return {
      name,
      source: entry.source,
      pinnedRevision: entry.sourceRevision,
      headRevision,
      revisionCurrent,
      paths,
      ok: revisionCurrent && paths.every(result => result.exists),
    };
  } catch (error) {
    return {
      name,
      source: entry.source,
      pinnedRevision: entry.sourceRevision,
      headRevision: null,
      revisionCurrent: false,
      paths: entry.sourcePaths.map(sourcePath => ({ path: sourcePath, exists: false })),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const manifest = await Bun.file(manifestPath).json();
const externalEntries = Object.entries(manifest.packages as Record<string, unknown>).filter(
  ([, value]) => {
    const provenance = (value as { provenance?: string }).provenance;
    return provenance === 'vendored' || provenance === 'forked';
  }
) as Array<[string, ExternalSkill]>;
const results = await Promise.all(externalEntries.map(([name, entry]) => checkSkill(name, entry)));
results.sort((left, right) => left.name.localeCompare(right.name));
const output = { ok: results.every(result => result.ok), checked: results.length, results };

if (json) console.log(JSON.stringify(output, null, 2));
else {
  console.log(`external skill provenance: ${results.length} packages`);
  for (const result of results) {
    const paths = result.paths.filter(path => !path.exists).map(path => path.path);
    console.log(
      `  ${result.ok ? 'OK' : 'FAIL'} ${result.name}: ${result.revisionCurrent ? 'HEAD pinned' : 'HEAD drift'}${paths.length > 0 ? ` · missing ${paths.join(', ')}` : ''}${result.error ? ` · ${result.error}` : ''}`
    );
  }
}
process.exitCode = output.ok ? 0 : 1;
