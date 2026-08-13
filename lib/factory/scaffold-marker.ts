export type ScaffoldMarkerIdentity = {
  name: string;
  version: string;
};

/**
 * `--publish` is an explicit request, so marker identity must be complete.
 * This deliberately has no name/version fallback: a marker for an ambiguous
 * scaffold would make the registry look healthier than it is.
 */
export function requireScaffoldMarkerIdentity(
  manifest: Record<string, unknown> | null,
  projectPath: string
): ScaffoldMarkerIdentity {
  if (!manifest) {
    throw new Error(
      `--publish could not read ${projectPath}/package.json after scaffolding; no registry marker was created.`
    );
  }

  const name = typeof manifest.name === 'string' ? manifest.name.trim() : '';
  const version = typeof manifest.version === 'string' ? manifest.version.trim() : '';
  if (!name || !version) {
    throw new Error(
      `--publish requires non-empty package.json name and version at ${projectPath}; no registry marker was created.`
    );
  }

  return { name, version };
}
