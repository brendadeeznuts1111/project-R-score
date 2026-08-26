import type { PackageDependencyKind, PackageDependencyRecord } from '../content-store/index.ts';

const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;
const KIND_ORDER: Readonly<Record<PackageDependencyKind, number>> = {
  runtime: 0,
  development: 1,
  optional: 2,
  peer: 3,
};

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseDependencyMap(value: unknown, field: string): Readonly<Record<string, string>> {
  if (value === undefined) return {};
  const source = parseRecord(value, field);
  const parsed: Record<string, string> = {};
  for (const [packageName, range] of Object.entries(source)) {
    if (!PACKAGE_NAME_RE.test(packageName))
      throw new TypeError(`${field} has invalid package name`);
    if (typeof range !== 'string' || range.length === 0 || range.length > 512) {
      throw new TypeError(`${field}.${packageName} must be a nonempty dependency range`);
    }
    parsed[packageName] = range;
  }
  return parsed;
}

/** Parse npm package dependency planes without collapsing peer/optional semantics. */
export function parsePackageDependencyRecords(value: unknown): readonly PackageDependencyRecord[] {
  const manifest = parseRecord(value, 'package manifest');
  const planes = [
    ['dependencies', 'runtime'],
    ['devDependencies', 'development'],
    ['optionalDependencies', 'optional'],
    ['peerDependencies', 'peer'],
  ] as const satisfies readonly (readonly [string, PackageDependencyKind])[];
  const peerDependencies = parseDependencyMap(manifest.peerDependencies, 'peerDependencies');
  const peerMetadataSource =
    manifest.peerDependenciesMeta === undefined
      ? {}
      : parseRecord(manifest.peerDependenciesMeta, 'peerDependenciesMeta');
  const peerOptional = new Map<string, boolean>();
  for (const [packageName, metadataValue] of Object.entries(peerMetadataSource)) {
    if (!(packageName in peerDependencies)) {
      throw new TypeError(`peerDependenciesMeta.${packageName} has no matching peer dependency`);
    }
    const metadata = parseRecord(metadataValue, `peerDependenciesMeta.${packageName}`);
    const unexpected = Object.keys(metadata).filter(key => key !== 'optional');
    if (unexpected.length > 0 || typeof metadata.optional !== 'boolean') {
      throw new TypeError(`peerDependenciesMeta.${packageName} must contain only optional:boolean`);
    }
    peerOptional.set(packageName, metadata.optional);
  }

  const result: PackageDependencyRecord[] = [];
  for (const [field, kind] of planes) {
    const dependencies =
      field === 'peerDependencies' ? peerDependencies : parseDependencyMap(manifest[field], field);
    for (const [packageName, range] of Object.entries(dependencies)) {
      result.push(
        kind === 'peer'
          ? { packageName, range, kind, peer: { optional: peerOptional.get(packageName) ?? false } }
          : { packageName, range, kind }
      );
    }
  }
  return result.sort(
    (left, right) =>
      KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
      left.packageName.localeCompare(right.packageName) ||
      left.range.localeCompare(right.range)
  );
}
