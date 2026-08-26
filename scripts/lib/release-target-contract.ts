import { relativePath, resolvePath } from '../../lib/path-bun.ts';

export interface ExpectedBinary {
  name: string;
  path: string;
}

export interface ReleaseTarget {
  target: string;
  packageName: string;
  packageDirectory: string;
  buildCommand: string[];
  testCommand: string[];
  junitPath: string;
  expectedJunitFiles: string[];
  sourceInputs: string[];
  archiveDirectory: string;
  allowedChannels: string[];
  expectedBinaries: ExpectedBinary[];
  requiredPackageFiles: string[];
  hashArtifacts: string[];
  allowedGeneratedFiles: string[];
  publicationRoutes: Record<string, { enabled: false; endpoint?: string }>;
}

export interface ReleaseTargetsManifest {
  schemaVersion: 1;
  readRegistryUrl: string;
  targets: ReleaseTarget[];
}

type JsonRecord = Record<string, unknown>;
export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function exact(record: JsonRecord, allowed: string[], context: string): void {
  const unknown = Object.keys(record).filter(key => !allowed.includes(key));
  if (unknown.length) throw new Error(`${context} has unknown keys: ${unknown.join(', ')}`);
}

function text(record: JsonRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

function parseList(value: unknown, context: string, allowEmpty = true): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item)) {
    throw new Error(`${context} must be an array of non-empty strings`);
  }
  if (!allowEmpty && !value.length) throw new Error(`${context} must not be empty`);
  if (new Set(value).size !== value.length)
    throw new Error(`${context} must not contain duplicates`);
  return value;
}

function safePath(value: string, context: string): void {
  const base = '/release-contract-root';
  const candidate = relativePath(base, resolvePath(base, value.replaceAll('\\', '/')));
  if (value.startsWith('/') || !value || candidate.startsWith('..')) {
    throw new Error(`${context} must stay inside the package directory: ${value}`);
  }
}

export function parseReleaseTargets(value: unknown): ReleaseTargetsManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.targets)) {
    throw new Error('release target manifest must have schemaVersion 1 and a targets array');
  }
  exact(value, ['schemaVersion', 'readRegistryUrl', 'targets'], 'release target manifest');
  const readRegistryUrl = text(value, 'readRegistryUrl', 'release target manifest');
  if (!['http:', 'https:'].includes(new URL(readRegistryUrl).protocol)) {
    throw new Error('release target manifest readRegistryUrl must be HTTP(S)');
  }
  const seenTargets = new Set<string>();
  const seenPackages = new Set<string>();
  const targets = value.targets.map((raw, index): ReleaseTarget => {
    const context = `targets[${index}]`;
    if (!isRecord(raw)) throw new Error(`${context} must be an object`);
    exact(
      raw,
      [
        'target',
        'packageName',
        'packageDirectory',
        'buildCommand',
        'testCommand',
        'junitPath',
        'expectedJunitFiles',
        'sourceInputs',
        'archiveDirectory',
        'allowedChannels',
        'expectedBinaries',
        'requiredPackageFiles',
        'hashArtifacts',
        'allowedGeneratedFiles',
        'publicationRoutes',
      ],
      context
    );
    const target = text(raw, 'target', context);
    const packageName = text(raw, 'packageName', context);
    if (seenTargets.has(target)) throw new Error(`duplicate release target: ${target}`);
    if (seenPackages.has(packageName)) throw new Error(`duplicate release package: ${packageName}`);
    seenTargets.add(target);
    seenPackages.add(packageName);
    const packageDirectory = text(raw, 'packageDirectory', context);
    const junitPath = text(raw, 'junitPath', context);
    const archiveDirectory = text(raw, 'archiveDirectory', context);
    [packageDirectory, junitPath, archiveDirectory].forEach(path => safePath(path, context));
    const expectedJunitFiles = parseList(
      raw.expectedJunitFiles,
      `${context}.expectedJunitFiles`,
      false
    );
    const sourceInputs = parseList(raw.sourceInputs, `${context}.sourceInputs`, false);
    [...expectedJunitFiles, ...sourceInputs].forEach(path => safePath(path, context));
    if (!Array.isArray(raw.expectedBinaries))
      throw new Error(`${context}.expectedBinaries must be an array`);
    const expectedBinaries = raw.expectedBinaries.map((binary, binaryIndex): ExpectedBinary => {
      if (!isRecord(binary))
        throw new Error(`${context}.expectedBinaries[${binaryIndex}] must be an object`);
      exact(binary, ['name', 'path'], `${context}.expectedBinaries[${binaryIndex}]`);
      const path = text(binary, 'path', context);
      safePath(path, context);
      return { name: text(binary, 'name', context), path };
    });
    if (!isRecord(raw.publicationRoutes) || !Object.keys(raw.publicationRoutes).length)
      throw new Error(`${context}.publicationRoutes must declare disabled routes`);
    const publicationRoutes = Object.fromEntries(
      Object.entries(raw.publicationRoutes).map(([route, config]) => {
        if (!isRecord(config) || config.enabled !== false)
          throw new Error(`${context}.publicationRoutes.${route}.enabled must be explicitly false`);
        exact(config, ['enabled', 'endpoint'], `${context}.publicationRoutes.${route}`);
        const endpoint = typeof config.endpoint === 'string' ? config.endpoint : undefined;
        if (config.endpoint !== undefined && !endpoint)
          throw new Error(`${context}.publicationRoutes.${route}.endpoint must be a URL`);
        if (endpoint === readRegistryUrl)
          throw new Error(
            `${context}.publicationRoutes.${route}.endpoint cannot use the read-only registry URL`
          );
        return [route, { enabled: false as const, ...(endpoint ? { endpoint } : {}) }];
      })
    );
    const requiredPackageFiles = parseList(
      raw.requiredPackageFiles,
      `${context}.requiredPackageFiles`,
      false
    );
    const hashArtifacts = parseList(raw.hashArtifacts, `${context}.hashArtifacts`);
    const allowedGeneratedFiles = parseList(
      raw.allowedGeneratedFiles,
      `${context}.allowedGeneratedFiles`
    );
    [...requiredPackageFiles, ...hashArtifacts, ...allowedGeneratedFiles].forEach(path =>
      safePath(path, context)
    );
    if (hashArtifacts.some(path => !requiredPackageFiles.includes(path)))
      throw new Error(`${context}.hashArtifacts must also be required package files`);
    return {
      target,
      packageName,
      packageDirectory,
      buildCommand: parseList(raw.buildCommand, `${context}.buildCommand`, false),
      testCommand: parseList(raw.testCommand, `${context}.testCommand`, false),
      junitPath,
      expectedJunitFiles,
      sourceInputs,
      archiveDirectory,
      allowedChannels: parseList(raw.allowedChannels, `${context}.allowedChannels`, false),
      expectedBinaries,
      requiredPackageFiles,
      hashArtifacts,
      allowedGeneratedFiles,
      publicationRoutes,
    };
  });
  if (!targets.length) throw new Error('release target manifest must not be empty');
  return { schemaVersion: 1, readRegistryUrl, targets };
}

export function validateChannel(target: ReleaseTarget, channel: string): void {
  if (!target.allowedChannels.includes(channel))
    throw new Error(`channel ${JSON.stringify(channel)} is not allowed for ${target.target}`);
}

export function assertPublicationRouteEnabled(target: ReleaseTarget, route: string): never {
  if (!target.publicationRoutes[route])
    throw new Error(`unknown publication route ${route} for ${target.target}`);
  throw new Error(`publication route ${route} is disabled for ${target.target}`);
}
