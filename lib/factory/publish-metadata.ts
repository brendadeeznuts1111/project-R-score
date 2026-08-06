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
