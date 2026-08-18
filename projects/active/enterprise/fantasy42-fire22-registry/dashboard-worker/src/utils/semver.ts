export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: (string | number)[];
  build: string[];
}

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parseSemver(version: string): ParsedSemver | null {
  const match = SEMVER_REGEX.exec(version);
  if (!match) return null;

  const [, major, minor, patch, prereleaseText, buildText] = match;
  const prerelease = prereleaseText?.split('.') ?? [];
  const build = buildText?.split('.') ?? [];

  if (prerelease.some(identifier => identifier === '')) return null;
  if (build.some(identifier => identifier === '')) return null;

  const parsedPrerelease: (string | number)[] = [];
  for (const identifier of prerelease) {
    if (!/^\d+$/.test(identifier)) {
      parsedPrerelease.push(identifier);
      continue;
    }
    if (identifier.length > 1 && identifier.startsWith('0')) return null;
    parsedPrerelease.push(Number.parseInt(identifier, 10));
  }

  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
    prerelease: parsedPrerelease,
    build,
  };
}

export function formatSemver(version: ParsedSemver): string {
  const prerelease = version.prerelease.length > 0 ? `-${version.prerelease.join('.')}` : '';
  const build = version.build.length > 0 ? `+${version.build.join('.')}` : '';
  return `${version.major}.${version.minor}.${version.patch}${prerelease}${build}`;
}

export function makeSemver(fields: {
  major: number;
  minor: number;
  patch: number;
  prerelease?: (string | number)[];
  build?: string[];
}): ParsedSemver {
  return {
    major: fields.major,
    minor: fields.minor,
    patch: fields.patch,
    prerelease: fields.prerelease ?? [],
    build: fields.build ?? [],
  };
}

export function isValidSemver(version: string): boolean {
  return parseSemver(version) !== null;
}
