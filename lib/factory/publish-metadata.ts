// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawnSync
// @see https://bun.com/blog/bun-v1.3.14#bun-publish-now-sends-readme-metadata-to-the-registry
/**
 * Publish-path metadata helpers for factory CLI / RegistryClient.
 *
 * Prefer README + package.json from the artifact being published (directory or
 * npm-style `.tgz`) over CWD auto-detect — CWD often is the monorepo root and
 * attaches the wrong file (BM-5).
 */

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readJsonRecord(path: string): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    const value: unknown = JSON.parse(await file.text());
    return isJsonRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** Case-insensitive README / README.md / README.markdown / README.txt. */
export function isReadmeBasename(name: string): boolean {
  return /^readme(\.(md|markdown|txt))?$/i.test(name);
}

/** Read package metadata from a package directory or npm-style tarball. */
export async function readPublishPackageJson(
  filePath: string
): Promise<Record<string, unknown> | null> {
  if (!filePath.endsWith('.tgz')) {
    return readJsonRecord(`${filePath}/package.json`);
  }

  const proc = Bun.spawnSync(['tar', '-xOf', filePath, 'package/package.json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (!proc.success) return null;

  try {
    const value: unknown = JSON.parse(proc.stdout.toString());
    return isJsonRecord(value) ? value : null;
  } catch {
    return null;
  }
}

async function readReadmeFromDirectory(dir: string): Promise<string | undefined> {
  try {
    for await (const f of new Bun.Glob('[Rr][Ee][Aa][Dd][Mm][Ee]*').scan({
      cwd: dir,
      onlyFiles: true,
    })) {
      const base = f.split('/').pop() ?? f;
      if (!isReadmeBasename(base)) continue;
      const text = await Bun.file(`${dir}/${f}`).text();
      if (text.trim()) return text;
    }
  } catch {
    // Binary, permission error, etc.
  }
  return undefined;
}

/**
 * Extract the first README* from an npm-style tarball byte stream.
 * Prefers `package/README*` paths (npm pack layout) over nested copies.
 */
export async function readPublishReadmeFromTarballBytes(
  tarball: Uint8Array
): Promise<string | undefined> {
  const list = Bun.spawn(['tar', '-tzf', '-'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  list.stdin.write(tarball);
  list.stdin.end();
  const [listCode, listing] = await Promise.all([list.exited, list.stdout.text()]);
  if (listCode !== 0) return undefined;

  const paths = listing
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const readmePaths = paths.filter(p => {
    const base = p.split('/').pop() ?? p;
    return isReadmeBasename(base);
  });
  if (readmePaths.length === 0) return undefined;

  const preferred =
    readmePaths.find(p => p === 'package/README.md' || p === 'package/README') ??
    readmePaths.find(p => p.startsWith('package/')) ??
    readmePaths[0]!;

  const extract = Bun.spawn(['tar', '-xOzf', '-', preferred], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  extract.stdin.write(tarball);
  extract.stdin.end();
  const [xCode, text] = await Promise.all([extract.exited, extract.stdout.text()]);
  if (xCode !== 0 || !text.trim()) return undefined;
  return text;
}

/** Read README text from a package directory or npm-style `.tgz` path. */
export async function readPublishReadme(filePath: string): Promise<string | undefined> {
  if (!filePath.endsWith('.tgz')) {
    return readReadmeFromDirectory(filePath);
  }

  try {
    const bytes = new Uint8Array(await Bun.file(filePath).arrayBuffer());
    return readPublishReadmeFromTarballBytes(bytes);
  } catch {
    return undefined;
  }
}
