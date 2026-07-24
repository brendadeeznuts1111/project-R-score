// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/blog/bun-v1.3.14#bun-publish-now-sends-readme-metadata-to-the-registry
// @see https://bun.com/docs/pm/cli/info — bun info readme
/**
 * Extract readme + version manifest fields from npm-compatible publish bodies
 * (Bun 1.3.14+ sends readme in version metadata, not only in the tarball).
 */

export type PublishVersionManifest = {
  readme?: string;
  readmeFilename?: string;
  description?: string;
  dependencies?: Record<string, string>;
};

export function extractPublishVersionManifest(
  body: Record<string, unknown>,
  version: string
): PublishVersionManifest {
  const versions = body.versions as Record<string, Record<string, unknown>> | undefined;
  const ver = versions?.[version];
  if (!ver) return {};

  const out: PublishVersionManifest = {};

  if (typeof ver.readme === 'string' && ver.readme.length > 0) {
    out.readme = ver.readme;
    out.readmeFilename =
      typeof ver.readmeFilename === 'string' && ver.readmeFilename.length > 0
        ? ver.readmeFilename
        : 'README.md';
  }

  if (typeof ver.description === 'string' && ver.description.length > 0) {
    out.description = ver.description;
  }

  if (ver.dependencies && typeof ver.dependencies === 'object') {
    out.dependencies = ver.dependencies as Record<string, string>;
  }

  return out;
}

/** Case-insensitive README* names (matches bun publish detection). */
const README_NAMES = /^readme(\.(md|markdown|txt))?$/i;

/**
 * Scan a `.tgz` for the first README* file when publish body omitted readme
 * (legacy clients or tarball-only PUT).
 */
export async function extractReadmeFromTarball(
  tarball: Uint8Array
): Promise<PublishVersionManifest> {
  const proc = Bun.spawn(['tar', '-tzf', '-'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  proc.stdin.write(tarball);
  proc.stdin.end();
  const [exitCode, listing, stderr] = await Promise.all([
    proc.exited,
    proc.stdout.text(),
    proc.stderr.text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `tar -tzf failed (${exitCode})`);
  }

  const paths = listing
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const readmePath = paths.find(p => {
    const base = p.split('/').pop() ?? p;
    return README_NAMES.test(base);
  });
  if (!readmePath) return {};

  const extract = Bun.spawn(['tar', '-xOzf', '-', readmePath], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  extract.stdin.write(tarball);
  extract.stdin.end();
  const [xCode, text, xErr] = await Promise.all([
    extract.exited,
    extract.stdout.text(),
    extract.stderr.text(),
  ]);
  if (xCode !== 0 || !text.trim()) {
    throw new Error(xErr.trim() || `tar extract ${readmePath} failed (${xCode})`);
  }

  return {
    readme: text,
    readmeFilename: readmePath.split('/').pop() ?? 'README.md',
  };
}

export async function resolvePublishReadme(
  body: Record<string, unknown> | null,
  version: string,
  tarball: Uint8Array
): Promise<PublishVersionManifest> {
  const fromBody = body ? extractPublishVersionManifest(body, version) : {};
  if (fromBody.readme) return fromBody;
  try {
    const fromTar = await extractReadmeFromTarball(tarball);
    return { ...fromBody, ...fromTar };
  } catch {
    return fromBody;
  }
}
